/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  Calendar,
  History,
  ArrowRight,
  Layers,
  HelpCircle
} from "lucide-react";
import { ImportEtaRecord, ImportPiRecord, EtaScheduleItem, User, AolBranchName, SupplierName, Product } from "../../types";

interface ImportEtaBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImportEta: (record: Omit<ImportEtaRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportEta?: (record: ImportEtaRecord) => void;
  existingEtas: ImportEtaRecord[];
  importPis?: ImportPiRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  activeUserId: string;
  activeUserName?: string;
  appsScriptUrl?: string;
  sheetName?: string;
  onSyncToAppsScript?: (action: "ADD" | "EDIT" | "DELETE", record: ImportEtaRecord) => void;
}

export interface ParsedEtaRow {
  rowIndex: number;
  id?: string;
  aolBranchName: string;
  piNo: string;
  productName: string;
  supplierName: string;
  mfg: string;
  port: string;
  entryDate: string;
  baseEtd: string;
  baseEta: string;
  etd: string;
  eta: string;
  etd1?: string;
  eta1?: string;
  etd2?: string;
  eta2?: string;
  etd3?: string;
  eta3?: string;
  etd4?: string;
  eta4?: string;
  etd5?: string;
  eta5?: string;
  schedules: EtaScheduleItem[];
  remark: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
}

// Robust CSV / TSV text parser
function parseCSVOrTSVText(text: string): Record<string, string>[] {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const isTab = firstLine.includes("\t");

  const parseLine = (line: string): string[] => {
    if (isTab) {
      return line.split("\t").map((cell) => cell.trim().replace(/^["']|["']$/g, ""));
    }
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ""));
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every((v) => v === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) {
        row[h] = values[idx] || "";
      }
    });
    rows.push(row);
  }

  return rows;
}

// Flexible header alias matcher
function findMatchingValue(raw: Record<string, string>, aliases: string[]): string {
  const normalizedRawKeys = Object.keys(raw).reduce((acc, key) => {
    const norm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    acc[norm] = raw[key];
    return acc;
  }, {} as Record<string, string>);

  for (const alias of aliases) {
    const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedRawKeys[normAlias] !== undefined) {
      return normalizedRawKeys[normAlias].trim();
    }
  }
  return "";
}

export default function ImportEtaBulkImportModal({
  isOpen,
  onClose,
  onAddImportEta,
  onUpdateImportEta,
  existingEtas,
  importPis = [],
  aolBranches = [],
  suppliers = [],
  products = [],
  activeUserId,
  activeUserName = "Current User",
  appsScriptUrl = "",
  sheetName = "Import ETAs",
  onSyncToAppsScript
}: ImportEtaBulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "file" | "sheetUrl">("paste");
  const [pastedText, setPastedText] = useState<string>("");
  const [sheetFetchUrl, setSheetFetchUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedEtaRow[]>([]);
  const [searchPreviewQuery, setSearchPreviewQuery] = useState<string>("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip" | "create_new">("update");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [successReport, setSuccessReport] = useState<{ count: number; updated: number; created: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Existing ETA Map for duplicate detection
  const existingMap = useMemo(() => {
    const map = new Map<string, ImportEtaRecord>();
    existingEtas.forEach((rec) => {
      const branch = String(rec.aolBranchName || "").trim().toUpperCase();
      const pi = String(rec.piNo || "").trim().toUpperCase();
      const prod = String(rec.productName || "").trim().toUpperCase();
      if (branch && pi && prod) {
        map.set(`${branch}|||${pi}|||${prod}`, rec);
      }
      if (rec.id) {
        map.set(`ID:::${String(rec.id).trim().toUpperCase()}`, rec);
      }
    });
    return map;
  }, [existingEtas]);

  // PI lookup map to auto-fill PI details (supplier, mfg, port) if omitted
  const piLookupMap = useMemo(() => {
    const map = new Map<string, ImportPiRecord>();
    importPis.forEach((pi) => {
      const branch = String(pi.aolBranchName || "").trim().toUpperCase();
      const piNo = String(pi.piNo || "").trim().toUpperCase();
      if (branch && piNo) {
        map.set(`${branch}|||${piNo}`, pi);
      }
    });
    return map;
  }, [importPis]);

  // Sample CSV template content with exact user-requested structure:
  // (AOL Branch Name, PI NO, PRODUCT NAME, SUPPLIER NAME, ETD, ETA, ETA1, ETA2, ETA3, ETA4, ETA5, ETD1, ETD2, ETD3, ETD4, ETD5)
  const sampleCsvContent = useMemo(() => {
    return `AOL Branch Name,PI NO,PRODUCT NAME,SUPPLIER NAME,ETD,ETA,ETA1,ETA2,ETA3,ETA4,ETA5,ETD1,ETD2,ETD3,ETD4,ETD5,MFG,Port,Remark,ID
Mumbai,PI-2026-001,PVC RESIN S-70,FORMOSA PLASTICS CORPORATION,2026-03-01,2026-03-20,2026-03-20,2026-03-25,2026-03-28,,,2026-03-01,2026-03-05,2026-03-08,,,Formosa,Nhava Sheva,3 stage vessel schedule,
Mumbai,PI-2026-001,PVC RESIN B-57,FORMOSA PLASTICS CORPORATION,2026-03-01,2026-03-22,2026-03-22,2026-03-26,,,,,2026-03-01,2026-03-06,,,,,Formosa,Nhava Sheva,2 stage schedule on track,
Delhi,PI-2026-002,PVC RESIN S-80,SABIC,2026-03-10,2026-03-30,2026-03-30,2026-04-02,2026-04-05,2026-04-10,2026-04-15,2026-03-10,2026-03-12,2026-03-15,2026-03-20,2026-03-25,SABIC,Mundra,Full 5 stage schedule revision,
Kolkata,PI-2026-003,EVA RESIN 7350M,HANWHA TOTAL,2026-03-15,2026-04-05,2026-04-05,,,,2026-03-15,,,,Hanwha,Kolkata,Direct sailing on schedule,`;
  }, []);

  const sampleHeadersOnly =
    "AOL Branch Name\tPI NO\tPRODUCT NAME\tSUPPLIER NAME\tETD\tETA\tETA1\tETA2\tETA3\tETA4\tETA5\tETD1\tETD2\tETD3\tETD4\tETD5\tMFG\tPort\tRemark\tID";

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "import_eta_with_schedules_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyHeaders = () => {
    navigator.clipboard.writeText(sampleHeadersOnly);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2000);
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleCsvContent);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Convert raw rows to validated ParsedEtaRows with up to 5 schedule items
  const processRawData = (rawList: Record<string, string>[]) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const processed: ParsedEtaRow[] = [];

    rawList.forEach((raw, idx) => {
      const idVal = findMatchingValue(raw, ["id", "etaid", "recordid", "id#"]);
      const branchVal = findMatchingValue(raw, ["aolbranchname", "aolbranch", "branch", "branchname", "location"]);
      const piNoVal = findMatchingValue(raw, ["pino", "pi_no", "pinumber", "pi#", "pi", "proformainvoiceno"]);
      const productNameVal = findMatchingValue(raw, ["productname", "product", "item", "gradename", "material"]);
      const entryDateVal = findMatchingValue(raw, ["entrydate", "entry_date", "createddate"]) || todayStr;
      
      // Base ETD & ETA fields
      const baseEtdVal = findMatchingValue(raw, ["etd", "etddate", "etd_date", "departuredate", "baseetd", "initialetd"]);
      const baseEtaVal = findMatchingValue(raw, ["eta", "etadate", "eta_date", "arrivaldate", "baseeta", "initialeta"]);
      const remarkVal = findMatchingValue(raw, ["remark", "remarks", "note", "notes", "comment"]);

      // Lookup linked PI to auto-fill supplier, mfg, port if missing
      const piMatch = piLookupMap.get(`${branchVal.trim().toUpperCase()}|||${piNoVal.trim().toUpperCase()}`);
      const supplierVal = findMatchingValue(raw, ["suppliername", "supplier", "vendor", "party"]) || piMatch?.supplierName || "";
      const mfgVal = findMatchingValue(raw, ["mfg", "manufacturer", "maker", "brand"]) || piMatch?.mfg || "";
      const portVal = findMatchingValue(raw, ["port", "dischargeport", "portname"]) || piMatch?.port || "";

      // Extract up to 5 ETD / ETA schedule entries
      const etd1 = findMatchingValue(raw, ["etd1", "etd_1", "etd 1", "scheduleetd1", "schedule_etd_1", "etdrev1"]);
      const eta1 = findMatchingValue(raw, ["eta1", "eta_1", "eta 1", "scheduleeta1", "schedule_eta_1", "etarev1"]);
      const etd2 = findMatchingValue(raw, ["etd2", "etd_2", "etd 2", "scheduleetd2", "schedule_etd_2", "etdrev2"]);
      const eta2 = findMatchingValue(raw, ["eta2", "eta_2", "eta 2", "scheduleeta2", "schedule_eta_2", "etarev2"]);
      const etd3 = findMatchingValue(raw, ["etd3", "etd_3", "etd 3", "scheduleetd3", "schedule_etd_3", "etdrev3"]);
      const eta3 = findMatchingValue(raw, ["eta3", "eta_3", "eta 3", "scheduleeta3", "schedule_eta_3", "etarev3"]);
      const etd4 = findMatchingValue(raw, ["etd4", "etd_4", "etd 4", "scheduleetd4", "schedule_etd_4", "etdrev4"]);
      const eta4 = findMatchingValue(raw, ["eta4", "eta_4", "eta 4", "scheduleeta4", "schedule_eta_4", "etarev4"]);
      const etd5 = findMatchingValue(raw, ["etd5", "etd_5", "etd 5", "scheduleetd5", "schedule_etd_5", "etdrev5"]);
      const eta5 = findMatchingValue(raw, ["eta5", "eta_5", "eta 5", "scheduleeta5", "schedule_eta_5", "etarev5"]);

      // Build structured schedules array
      const rawSchedules: { k: number; etd: string; eta: string; remark?: string }[] = [
        { k: 1, etd: etd1, eta: eta1 },
        { k: 2, etd: etd2, eta: eta2 },
        { k: 3, etd: etd3, eta: eta3 },
        { k: 4, etd: etd4, eta: eta4 },
        { k: 5, etd: etd5, eta: eta5 },
      ];

      // If slot 1 is blank, but base ETD or base ETA is provided and there are revisions in slot 2..5,
      // populate slot 1 with base ETD / ETA as the initial entry
      const hasRevisions = rawSchedules.slice(1).some((s) => s.etd || s.eta);
      if (!rawSchedules[0].etd && !rawSchedules[0].eta && (baseEtdVal || baseEtaVal) && hasRevisions) {
        rawSchedules[0].etd = baseEtdVal || todayStr;
        rawSchedules[0].eta = baseEtaVal || "N/A";
      }

      const builtSchedules: EtaScheduleItem[] = [];

      rawSchedules.forEach(({ k, etd: kEtd, eta: kEta }) => {
        if (kEtd || kEta) {
          builtSchedules.push({
            id: `sched-${Date.now()}-${idx + 1}-${k}`,
            etd: kEtd || baseEtdVal || todayStr,
            eta: kEta || baseEtaVal || "N/A",
            remark: k === 1 ? (remarkVal || "Initial ETA Entry") : `Schedule Revision #${k}`,
            createdAt: new Date().toISOString()
          });
        }
      });

      // If no slot 1..5 provided, but base ETD/ETA exists, create Schedule 1
      if (builtSchedules.length === 0 && (baseEtdVal || baseEtaVal)) {
        builtSchedules.push({
          id: `sched-${Date.now()}-${idx + 1}-1`,
          etd: baseEtdVal || todayStr,
          eta: baseEtaVal || "N/A",
          remark: remarkVal || "Initial ETA Entry",
          createdAt: new Date().toISOString()
        });
      }

      // Determine active current ETD & ETA:
      // Uses the latest non-empty schedule entry, falling back to base
      const latestSchedule = builtSchedules.length > 0 ? builtSchedules[builtSchedules.length - 1] : undefined;
      const activeEtd = (latestSchedule && latestSchedule.etd && latestSchedule.etd !== "N/A") ? latestSchedule.etd : (baseEtdVal || todayStr);
      const activeEta = (latestSchedule && latestSchedule.eta && latestSchedule.eta !== "N/A") ? latestSchedule.eta : (baseEtaVal || "");

      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!branchVal) errors.push("AOL Branch Name is missing");
      if (!piNoVal) errors.push("PI NO is missing");
      if (!productNameVal) errors.push("Product Name is missing");
      if (!activeEta && builtSchedules.length === 0) warnings.push("No ETA Date provided in base or schedule columns");

      // Check duplicates in existing database
      const dupKey = `${branchVal.trim().toUpperCase()}|||${piNoVal.trim().toUpperCase()}|||${productNameVal.trim().toUpperCase()}`;
      const idKey = idVal ? `ID:::${idVal.trim().toUpperCase()}` : "";
      
      const existingMatch = existingMap.get(dupKey) || (idKey ? existingMap.get(idKey) : undefined);
      const isDuplicate = !!existingMatch;
      const duplicateReason = isDuplicate
        ? `Matches existing record ${existingMatch?.id || "in DB"} (Branch: ${branchVal}, PI: ${piNoVal}, Product: ${productNameVal})`
        : undefined;

      processed.push({
        rowIndex: idx + 1,
        id: idVal || undefined,
        aolBranchName: branchVal,
        piNo: piNoVal,
        productName: productNameVal,
        supplierName: supplierVal,
        mfg: mfgVal,
        port: portVal,
        entryDate: entryDateVal,
        baseEtd: baseEtdVal || todayStr,
        baseEta: baseEtaVal,
        etd: activeEtd,
        eta: activeEta,
        etd1,
        eta1,
        etd2,
        eta2,
        etd3,
        eta3,
        etd4,
        eta4,
        etd5,
        eta5,
        schedules: builtSchedules,
        remark: remarkVal,
        isValid: errors.length === 0,
        errors,
        warnings,
        isDuplicate,
        duplicateReason
      });
    });

    setParsedRows(processed);
    setSuccessReport(null);
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      alert("Please paste Google Sheet or CSV data first.");
      return;
    }
    const raw = parseCSVOrTSVText(pastedText);
    if (raw.length === 0) {
      alert("Could not detect any valid data rows. Ensure you have copied a header row and at least one data row.");
      return;
    }
    processRawData(raw);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPastedText(text);
        const raw = parseCSVOrTSVText(text);
        if (raw.length === 0) {
          alert("Could not parse rows from the uploaded file.");
        } else {
          processRawData(raw);
        }
      }
    };
    reader.onerror = () => {
      alert("Failed to read the file.");
    };
    reader.readAsText(file);
  };

  const handleFetchSheetUrl = async () => {
    let targetUrl = sheetFetchUrl.trim();
    if (!targetUrl) {
      if (appsScriptUrl) {
        targetUrl = appsScriptUrl;
      } else {
        alert("Please enter a Google Sheet published CSV URL or Apps Script URL.");
        return;
      }
    }

    const docMatch = targetUrl.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch && !targetUrl.includes("output=csv") && !targetUrl.includes("export?format=csv")) {
      const sheetId = docMatch[1];
      const gidMatch = targetUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    setIsFetchingSheet(true);
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      setPastedText(text);
      const raw = parseCSVOrTSVText(text);
      if (raw.length === 0) {
        alert("No valid data rows returned from the Google Sheet URL.");
      } else {
        processRawData(raw);
      }
    } catch (err: any) {
      alert(`Failed to fetch Google Sheet data directly: ${err?.message || String(err)}.\n\nTip: You can also copy all cells from Google Sheet (Ctrl+A, Ctrl+C) and paste them in the 'Paste Data' tab.`);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Filter preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!searchPreviewQuery.trim()) return parsedRows;
    const q = searchPreviewQuery.toLowerCase();
    return parsedRows.filter(
      (r) =>
        r.piNo.toLowerCase().includes(q) ||
        r.aolBranchName.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
        (r.port && r.port.toLowerCase().includes(q)) ||
        (r.remark && r.remark.toLowerCase().includes(q)) ||
        r.schedules.some((s) => s.eta.toLowerCase().includes(q) || s.etd.toLowerCase().includes(q))
    );
  }, [parsedRows, searchPreviewQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const validRows = parsedRows.filter((r) => r.isValid);
    const duplicatesCount = validRows.filter((r) => r.isDuplicate).length;
    const totalSchedulesCount = validRows.reduce((acc, curr) => acc + (curr.schedules.length || 1), 0);

    return {
      totalRows: parsedRows.length,
      validRowsCount: validRows.length,
      duplicatesCount,
      totalSchedulesCount
    };
  }, [parsedRows]);

  // Execute Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to import. Please check for errors in the preview.");
      return;
    }

    setIsSubmitting(true);
    setImportProgress(0);

    let maxNum = 0;
    existingEtas.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^ETA-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    let createdCount = 0;
    let updatedCount = 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const rowBranch = String(row.aolBranchName || "").trim().toUpperCase();
        const rowPi = String(row.piNo || "").trim().toUpperCase();
        const rowProd = String(row.productName || "").trim().toUpperCase();
        const dupKey = `${rowBranch}|||${rowPi}|||${rowProd}`;
        const idKey = row.id ? `ID:::${String(row.id).trim().toUpperCase()}` : "";
        const existingRecord = existingMap.get(dupKey) || (idKey ? existingMap.get(idKey) : undefined);

        if (existingRecord && duplicateStrategy === "skip") {
          continue;
        }

        if (existingRecord && duplicateStrategy === "update" && onUpdateImportEta) {
          const updated: ImportEtaRecord = {
            ...existingRecord,
            aolBranchName: row.aolBranchName,
            piNo: row.piNo,
            productName: row.productName,
            supplierName: row.supplierName || existingRecord.supplierName,
            mfg: row.mfg || existingRecord.mfg,
            port: row.port || existingRecord.port,
            entryDate: row.entryDate || existingRecord.entryDate,
            etd: row.etd,
            eta: row.eta,
            remark: row.remark || existingRecord.remark,
            schedules: row.schedules.length > 0 ? row.schedules : (existingRecord.schedules || [])
          };
          await onUpdateImportEta(updated);
          if (onSyncToAppsScript) {
            onSyncToAppsScript("EDIT", updated);
          }
          updatedCount++;
        } else {
          let assignedId = row.id;
          if (!assignedId || !assignedId.toUpperCase().startsWith("ETA-")) {
            maxNum++;
            assignedId = `ETA-${maxNum}`;
          }

          const newRecord: ImportEtaRecord = {
            id: assignedId,
            createdAt: new Date().toISOString(),
            aolBranchName: row.aolBranchName,
            piNo: row.piNo,
            productName: row.productName,
            supplierName: row.supplierName,
            mfg: row.mfg,
            port: row.port,
            entryDate: row.entryDate,
            etd: row.etd,
            eta: row.eta,
            remark: row.remark || "Bulk Imported Schedule Entry",
            schedules: row.schedules.length > 0 ? row.schedules : (row.eta ? [{
              id: `sched-${Date.now()}-${i}-1`,
              etd: row.etd,
              eta: row.eta,
              remark: row.remark || "Initial ETA Entry",
              createdAt: new Date().toISOString()
            }] : []),
            createdByUserId: activeUserId,
            createdByName: activeUserName
          };

          await onAddImportEta(newRecord);
          if (onSyncToAppsScript) {
            onSyncToAppsScript("ADD", newRecord);
          }
          createdCount++;
        }

        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      setSuccessReport({
        count: createdCount + updatedCount,
        created: createdCount,
        updated: updatedCount
      });
    } catch (err: any) {
      alert(`Import error: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setParsedRows([]);
    setPastedText("");
    setSuccessReport(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
                Import ETA & Multi-Stage Schedules (Up to 5 ETD/ETA Entries)
              </h3>
              <p className="text-[11px] text-slate-400">
                Bulk import shipping ETD, ETA, and sequential schedule revisions (ETA1..5, ETD1..5) per PI Product
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {/* SUCCESS BANNER */}
          {successReport && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-950 shadow-xs flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg mt-0.5">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-900">
                    Successfully Imported {successReport.count} ETA Records with Schedules!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    {successReport.created > 0 && `${successReport.created} new ETA records added to database. `}
                    {successReport.updated > 0 && `${successReport.updated} existing ETA records updated with new schedules. `}
                    All ETD/ETA timeline revisions (up to 5 entries) are active and logged.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs shrink-0"
              >
                Done & View Table
              </button>
            </div>
          )}

          {/* Quick Action Buttons & Format Specification */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold font-mono text-slate-700 uppercase bg-slate-200/80 px-2 py-0.5 rounded">
                  Supported Columns:
                </span>
                <span className="text-[11px] font-bold text-emerald-800 font-mono">
                  (AOL Branch Name, PI NO, PRODUCT NAME, SUPPLIER NAME, ETD, ETA, ETA1..5, ETD1..5)
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Supports up to 5 ETD/ETA schedule revisions per PI Product. Automatically creates timeline logs in database.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyHeaders}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Copy standard column headers to paste into Google Sheet Row 1"
              >
                {copiedHeaders ? <CheckCircle size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-500" />}
                <span>{copiedHeaders ? "Headers Copied!" : "Copy Headers (TSV)"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySample}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copiedTemplate ? <CheckCircle size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-500" />}
                <span>{copiedTemplate ? "Sample Copied!" : "Copy Sample Data"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download size={13} />
                <span>Download Sample CSV</span>
              </button>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`px-4 py-2.5 font-mono text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === "paste"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Copy size={14} />
              <span>Paste from Google Sheet / Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`px-4 py-2.5 font-mono text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === "file"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Upload size={14} />
              <span>Upload CSV / TSV File</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sheetUrl")}
              className={`px-4 py-2.5 font-mono text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === "sheetUrl"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ExternalLink size={14} />
              <span>Google Sheet URL / Web App</span>
            </button>
          </div>

          {/* TAB 1: PASTE */}
          {activeTab === "paste" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold font-mono text-slate-700 uppercase">
                  Paste rows directly from Google Sheet (Include Headers):
                </label>
                <span className="text-[10px] text-slate-400">
                  Tip: Copy columns from Google Sheet &gt; Ctrl+C &gt; Paste here
                </span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`AOL Branch Name\tPI NO\tPRODUCT NAME\tSUPPLIER NAME\tETD\tETA\tETA1\tETA2\tETA3\tETA4\tETA5\tETD1\tETD2\tETD3\tETD4\tETD5\nMumbai\tPI-2026-001\tPVC RESIN S-70\tFORMOSA PLASTICS CORPORATION\t2026-03-01\t2026-03-20\t2026-03-20\t2026-03-25\t2026-03-28\t\t\t2026-03-01\t2026-03-05\t2026-03-08\t\t\nDelhi\tPI-2026-002\tPVC RESIN S-80\tSABIC\t2026-03-10\t2026-03-30\t2026-03-30\t2026-04-02\t2026-04-05\t2026-04-10\t2026-04-15\t2026-03-10\t2026-03-12\t2026-03-15\t2026-03-20\t2026-03-25`}
                className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-800 leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                {pastedText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText("");
                      setParsedRows([]);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleParsePasted}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <RefreshCw size={13} />
                  <span>Parse & Preview Records</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === "file" && (
            <div className="flex flex-col gap-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition"
              >
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-3">
                  <Upload size={24} />
                </div>
                <p className="font-bold text-slate-800 text-xs sm:text-sm">
                  Click to Browse or Drag & Drop CSV / TSV File
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports .csv, .tsv, and exported .txt spreadsheet files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE SHEET URL */}
          {activeTab === "sheetUrl" && (
            <div className="flex flex-col gap-3">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-900">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <ExternalLink size={14} className="text-sky-600" />
                  Direct Google Sheet Connection
                </p>
                <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                  Enter a published Google Sheet CSV link or standard spreadsheet link.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold font-mono text-slate-700 uppercase block mb-1">
                  Google Sheet URL / CSV Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={sheetFetchUrl}
                    onChange={(e) => setSheetFetchUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleFetchSheetUrl}
                    disabled={isFetchingSheet || (!sheetFetchUrl.trim() && !appsScriptUrl)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw size={13} className={isFetchingSheet ? "animate-spin" : ""} />
                    <span>{isFetchingSheet ? "Fetching..." : "Fetch & Parse"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW SECTION */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col gap-0 mt-2 bg-white">
              {/* Preview Header Metrics & Controls */}
              <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Parsed PI Items</span>
                    <span className="text-sm font-extrabold text-slate-100">{summaryMetrics.totalRows} Records</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Valid Records</span>
                    <span className="text-sm font-extrabold text-emerald-400">{summaryMetrics.validRowsCount}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Total Schedule Entries</span>
                    <span className="text-sm font-extrabold text-indigo-400">{summaryMetrics.totalSchedulesCount} Logs</span>
                  </div>
                </div>

                {/* Duplicate Strategy & Search */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">If Duplicate:</span>
                    <select
                      value={duplicateStrategy}
                      onChange={(e: any) => setDuplicateStrategy(e.target.value)}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
                    >
                      <option value="update">Overwrite / Update Schedules</option>
                      <option value="create_new">Create As New Record</option>
                      <option value="skip">Skip Existing</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter preview..."
                      value={searchPreviewQuery}
                      onChange={(e) => setSearchPreviewQuery(e.target.value)}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs outline-none w-36 sm:w-44 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Duplicate summary */}
              {summaryMetrics.duplicatesCount > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>
                      <strong>{summaryMetrics.duplicatesCount} rows</strong> match existing PI products in the database. (Mode: <strong className="uppercase font-mono">{duplicateStrategy}</strong>)
                    </span>
                  </div>
                </div>
              )}

              {/* Table of Parsed Rows */}
              <div className="overflow-x-auto max-h-80 scrollbar-thin">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Branch</th>
                      <th className="p-2">PI NO</th>
                      <th className="p-2">Product Name</th>
                      <th className="p-2">Supplier</th>
                      <th className="p-2">Active ETD / ETA</th>
                      <th className="p-2">Schedule Breakdown (Up to 5 Entries)</th>
                      <th className="p-2">Port / Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredPreviewRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`hover:bg-slate-50 transition ${
                          !row.isValid
                            ? "bg-rose-50/50"
                            : row.isDuplicate
                            ? "bg-amber-50/40"
                            : ""
                        }`}
                      >
                        <td className="p-2 text-center font-mono text-slate-400">{row.rowIndex}</td>
                        <td className="p-2 whitespace-nowrap">
                          {!row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold" title={row.errors.join(", ")}>
                              <AlertCircle size={10} /> Error
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold" title={row.duplicateReason}>
                              <AlertTriangle size={10} /> {duplicateStrategy === "update" ? "Will Update" : duplicateStrategy === "skip" ? "Will Skip" : "Duplicate"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              <CheckCircle size={10} /> Valid
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-medium">{row.aolBranchName}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">{row.piNo}</td>
                        <td className="p-2 font-semibold text-slate-900">{row.productName}</td>
                        <td className="p-2 text-slate-700 truncate max-w-[120px]">{row.supplierName || "-"}</td>
                        
                        {/* Active ETD / ETA */}
                        <td className="p-2 whitespace-nowrap">
                          <div className="flex flex-col font-mono text-[10px]">
                            <span className="text-slate-500">ETD: <strong className="text-slate-800">{row.etd}</strong></span>
                            <span className="text-emerald-700">ETA: <strong className="bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">{row.eta || "-"}</strong></span>
                          </div>
                        </td>

                        {/* Multi-Stage Schedule Breakdown (1..5) */}
                        <td className="p-2 min-w-[240px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {row.schedules.length} {row.schedules.length === 1 ? "Schedule" : "Schedules"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {row.schedules.map((sch, schIdx) => (
                                <span
                                  key={schIdx}
                                  className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700"
                                  title={`Rev #${schIdx + 1}: ETD ${sch.etd} -> ETA ${sch.eta} (${sch.remark || ""})`}
                                >
                                  <strong className="text-indigo-600">#{schIdx + 1}:</strong>
                                  <span>{sch.etd}</span>
                                  <ArrowRight size={8} className="text-slate-400" />
                                  <span className="font-bold text-emerald-700">{sch.eta}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td className="p-2 text-slate-600">
                          <div className="flex flex-col text-[10px]">
                            {row.port && <span className="font-medium">{row.port}</span>}
                            {row.remark && <span className="italic text-slate-500 truncate max-w-[120px]">"{row.remark}"</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isSubmitting && (
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-emerald-600" />
                <span className="font-semibold text-slate-700">Importing records and schedule entries... {importProgress}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAndClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isSubmitting || parsedRows.filter((r) => r.isValid).length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload size={14} />
              <span>
                {isSubmitting
                  ? "Importing..."
                  : `Import ${parsedRows.filter((r) => r.isValid).length} Records (${summaryMetrics.totalSchedulesCount} Schedules)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
