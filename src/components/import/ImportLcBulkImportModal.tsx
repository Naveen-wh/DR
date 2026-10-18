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
  Landmark
} from "lucide-react";
import { ImportLcRecord, ImportPiRecord, User, AolBranchName, SupplierName, Product } from "../../types";

interface ImportLcBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImportLc: (record: Omit<ImportLcRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportLc?: (record: ImportLcRecord) => void;
  existingLcs: ImportLcRecord[];
  importPis?: ImportPiRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  activeUserId: string;
  activeUserName?: string;
  appsScriptUrl?: string;
  sheetName?: string;
  onSyncToAppsScript?: (action: "ADD" | "EDIT" | "DELETE", record: ImportLcRecord) => void;
}

export interface ParsedLcRow {
  rowIndex: number;
  id?: string;
  aolBranchName: string;
  piNo: string;
  productName: string;
  lcType: "LC" | "NON LC";
  lcAppSentToBank: string;
  bankName: string;
  lcNoRefNo: string;
  entryDate: string;
  lcDate: string;
  lcUsanceAtSight: "Usance" | "At Sight";
  usanceDays: number;
  latestShipmentDate: string;
  lcExpiryDate: string;
  lcOpenExRate: number;
  supplierName: string;
  mfg: string;
  port: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
}

// Robust number parser
function parseNumericVal(val: any, fallback: number = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[$₹, ]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

// CSV / TSV text parser
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

export default function ImportLcBulkImportModal({
  isOpen,
  onClose,
  onAddImportLc,
  onUpdateImportLc,
  existingLcs,
  importPis = [],
  aolBranches = [],
  suppliers = [],
  products = [],
  activeUserId,
  activeUserName = "Current User",
  appsScriptUrl = "",
  sheetName = "Import LCs",
  onSyncToAppsScript
}: ImportLcBulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "file" | "sheetUrl">("paste");
  const [pastedText, setPastedText] = useState<string>("");
  const [sheetFetchUrl, setSheetFetchUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedLcRow[]>([]);
  const [searchPreviewQuery, setSearchPreviewQuery] = useState<string>("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip" | "create_new">("update");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [successReport, setSuccessReport] = useState<{ count: number; updated: number; created: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Existing LC Map for duplicate detection
  const existingMap = useMemo(() => {
    const map = new Map<string, ImportLcRecord>();
    existingLcs.forEach((rec) => {
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
  }, [existingLcs]);

  // PI lookup map to auto-fill PI details (supplier, mfg, port) if omitted in sheet
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

  // Sample CSV template content
  const sampleCsvContent = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return `AOL Branch Name,PI NO,Product Name,LC / NON LC,LC App Sent To Bank,Bank Name,LC NO / Ref NO,LC Date,Usance / At Sight,Usance Days,Latest Shipment Date,LC Expiry Date,LC Open Ex Rate,Supplier Name,MFG,Port,ID
Mumbai,PI-2026-001,PVC RESIN S-70,LC,${today},State Bank of India,SBI-LC-88392,${today},Usance,90,${today},${today},83.50,FORMOSA PLASTICS CORPORATION,Formosa,Nhava Sheva,
Mumbai,PI-2026-001,PVC RESIN B-57,LC,${today},State Bank of India,SBI-LC-88392,${today},Usance,90,${today},${today},83.50,FORMOSA PLASTICS CORPORATION,Formosa,Nhava Sheva,
Delhi,PI-2026-002,PVC RESIN S-80,NON LC,,,,,,,,,83.50,SABIC,SABIC,Mundra,`;
  }, []);

  const sampleHeadersOnly =
    "AOL Branch Name\tPI NO\tProduct Name\tLC / NON LC\tLC App Sent To Bank\tBank Name\tLC NO / Ref NO\tLC Date\tUsance / At Sight\tUsance Days\tLatest Shipment Date\tLC Expiry Date\tLC Open Ex Rate\tSupplier Name\tMFG\tPort\tID";

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "import_lc_google_sheet_template.csv");
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

  // Convert raw rows to validated ParsedLcRows
  const processRawData = (rawList: Record<string, string>[]) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const processed: ParsedLcRow[] = [];

    rawList.forEach((raw, idx) => {
      const idVal = findMatchingValue(raw, ["id", "lcid", "recordid", "id#"]);
      const branchVal = findMatchingValue(raw, ["aolbranchname", "aolbranch", "branch", "branchname", "location"]);
      const piNoVal = findMatchingValue(raw, ["pino", "pi_no", "pinumber", "pi#", "pi", "proformainvoiceno"]);
      const productNameVal = findMatchingValue(raw, ["productname", "product", "item", "gradename", "material"]);
      
      const rawLcType = findMatchingValue(raw, ["lctype", "lc_type", "lc/nonlc", "type", "lcnonlc"]).toUpperCase();
      const lcTypeVal: "LC" | "NON LC" = rawLcType.includes("NON") ? "NON LC" : "LC";

      const lcAppSentVal = findMatchingValue(raw, ["lcappsenttobank", "lcappsent", "appsentdate", "bankappdate"]);
      const bankNameVal = findMatchingValue(raw, ["bankname", "lcbankname", "bank", "issuingbank"]);
      const lcNoRefNoVal = findMatchingValue(raw, ["lcnorefno", "lcno", "lc_no", "refno", "lcnumber", "lc#"]);
      const entryDateVal = findMatchingValue(raw, ["entrydate", "entry_date", "createddate"]) || todayStr;
      const lcDateVal = findMatchingValue(raw, ["lcdate", "lc_date", "date"]) || todayStr;
      
      const rawUsanceAtSight = findMatchingValue(raw, ["lcusanceatsight", "usanceatsight", "usance/atsight", "tenor", "terms"]).toLowerCase();
      const lcUsanceAtSightVal: "Usance" | "At Sight" = rawUsanceAtSight.includes("sight") ? "At Sight" : "Usance";
      
      const usanceDaysVal = parseNumericVal(findMatchingValue(raw, ["usancedays", "lcusancedays", "days", "tenordays"]), 90);
      const latestShipmentDateVal = findMatchingValue(raw, ["latestshipmentdate", "lclatestshipmentdate", "shipmentdate", "latestshipment"]);
      const lcExpiryDateVal = findMatchingValue(raw, ["lcexpirydate", "expirydate", "lc_expiry_date", "expdate"]);
      const lcOpenExRateVal = parseNumericVal(findMatchingValue(raw, ["lcopenexrate", "openexrate", "exrate", "exchangerate", "open_ex_rate"]), 0);

      // Lookup linked PI to auto-fill supplier, mfg, port if missing
      const piMatch = piLookupMap.get(`${branchVal.trim().toUpperCase()}|||${piNoVal.trim().toUpperCase()}`);
      const supplierVal = findMatchingValue(raw, ["suppliername", "supplier", "vendor", "party"]) || piMatch?.supplierName || "";
      const mfgVal = findMatchingValue(raw, ["mfg", "manufacturer", "maker", "brand"]) || piMatch?.mfg || "";
      const portVal = findMatchingValue(raw, ["port", "dischargeport", "portname"]) || piMatch?.port || "";

      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!branchVal) errors.push("AOL Branch Name is missing");
      if (!piNoVal) errors.push("PI NO is missing");
      if (!productNameVal) errors.push("Product Name is missing");

      if (lcTypeVal === "LC") {
        if (!bankNameVal) warnings.push("Bank Name is empty for LC entry");
        if (!lcNoRefNoVal) warnings.push("LC No / Ref No is empty for LC entry");
      }

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
        lcType: lcTypeVal,
        lcAppSentToBank: lcAppSentVal,
        bankName: bankNameVal,
        lcNoRefNo: lcNoRefNoVal,
        entryDate: entryDateVal,
        lcDate: lcDateVal,
        lcUsanceAtSight: lcUsanceAtSightVal,
        usanceDays: usanceDaysVal,
        latestShipmentDate: latestShipmentDateVal,
        lcExpiryDate: lcExpiryDateVal,
        lcOpenExRate: lcOpenExRateVal,
        supplierName: supplierVal,
        mfg: mfgVal,
        port: portVal,
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
        (r.bankName && r.bankName.toLowerCase().includes(q)) ||
        (r.lcNoRefNo && r.lcNoRefNo.toLowerCase().includes(q)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q))
    );
  }, [parsedRows, searchPreviewQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const validRows = parsedRows.filter((r) => r.isValid);
    const lcCount = validRows.filter((r) => r.lcType === "LC").length;
    const nonLcCount = validRows.filter((r) => r.lcType === "NON LC").length;
    const duplicatesCount = validRows.filter((r) => r.isDuplicate).length;

    return {
      totalRows: parsedRows.length,
      validRowsCount: validRows.length,
      lcCount,
      nonLcCount,
      duplicatesCount
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
    existingLcs.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^LC-(\d+)$/i);
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

        if (existingRecord && duplicateStrategy === "update" && onUpdateImportLc) {
          const updated: ImportLcRecord = {
            ...existingRecord,
            aolBranchName: row.aolBranchName,
            piNo: row.piNo,
            productName: row.productName,
            lcType: row.lcType,
            lcAppSentToBank: row.lcAppSentToBank,
            bankName: row.bankName,
            lcBankName: row.bankName,
            lcNoRefNo: row.lcNoRefNo,
            entryDate: row.entryDate,
            lcDate: row.lcDate,
            lcUsanceAtSight: row.lcUsanceAtSight,
            usanceDays: row.usanceDays,
            lcUsanceDays: row.usanceDays,
            latestShipmentDate: row.latestShipmentDate,
            lcLatestShipmentDate: row.latestShipmentDate,
            lcExpiryDate: row.lcExpiryDate,
            expiryDate: row.lcExpiryDate,
            lcOpenExRate: row.lcOpenExRate,
            openExRate: row.lcOpenExRate,
            supplierName: row.supplierName,
            mfg: row.mfg,
            port: row.port
          };
          await onUpdateImportLc(updated);
          if (onSyncToAppsScript) {
            onSyncToAppsScript("EDIT", updated);
          }
          updatedCount++;
        } else {
          let assignedId = row.id;
          if (!assignedId || !assignedId.toUpperCase().startsWith("LC-")) {
            maxNum++;
            assignedId = `LC-${maxNum}`;
          }

          const newRecord: ImportLcRecord = {
            id: assignedId,
            createdAt: new Date().toISOString(),
            aolBranchName: row.aolBranchName,
            piNo: row.piNo,
            productName: row.productName,
            lcType: row.lcType,
            lcAppSentToBank: row.lcAppSentToBank,
            bankName: row.bankName,
            lcBankName: row.bankName,
            lcNoRefNo: row.lcNoRefNo,
            entryDate: row.entryDate,
            lcDate: row.lcDate,
            lcUsanceAtSight: row.lcUsanceAtSight,
            usanceDays: row.usanceDays,
            lcUsanceDays: row.usanceDays,
            latestShipmentDate: row.latestShipmentDate,
            lcLatestShipmentDate: row.latestShipmentDate,
            lcExpiryDate: row.lcExpiryDate,
            expiryDate: row.lcExpiryDate,
            lcOpenExRate: row.lcOpenExRate,
            openExRate: row.lcOpenExRate,
            supplierName: row.supplierName,
            mfg: row.mfg,
            port: row.port,
            createdByUserId: activeUserId,
            createdByName: activeUserName
          };

          await onAddImportLc(newRecord);
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Landmark size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
                Import LC Records (Google Sheets & CSV)
              </h3>
              <p className="text-[11px] text-slate-400">
                Bulk import Letter of Credit and Non-LC records
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
                    Successfully Imported {successReport.count} LC Records!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    {successReport.created > 0 && `${successReport.created} new records added to database. `}
                    {successReport.updated > 0 && `${successReport.updated} existing records updated. `}
                    All records are now active and synchronized.
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

          {/* Quick Action Buttons */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold font-mono text-slate-600 uppercase">
                Template & Guidance:
              </span>
              <span className="text-[11px] text-slate-500">
                1 row = 1 LC/Non-LC entry per PI product
              </span>
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
                  Tip: Select rows in Google Sheet &gt; Ctrl+C &gt; Paste here
                </span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`AOL Branch Name\tPI NO\tProduct Name\tLC / NON LC\tLC App Sent To Bank\tBank Name\tLC NO / Ref NO\tLC Date\tUsance / At Sight\tUsance Days\tLatest Shipment Date\tLC Expiry Date\tLC Open Ex Rate\nMumbai\tPI-2026-001\tPVC RESIN S-70\tLC\t2026-09-01\tState Bank of India\tSBI-LC-88392\t2026-09-01\tUsance\t90\t2026-09-15\t2026-10-15\t83.50`}
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
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Parsed Rows</span>
                    <span className="text-sm font-extrabold text-slate-100">{summaryMetrics.totalRows} Records</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">LC Type</span>
                    <span className="text-sm font-extrabold text-emerald-400">{summaryMetrics.lcCount} LC / {summaryMetrics.nonLcCount} Non-LC</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Valid Records</span>
                    <span className="text-sm font-extrabold text-sky-400">{summaryMetrics.validRowsCount}</span>
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
                      <option value="update">Overwrite / Update Existing</option>
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
                      <strong>{summaryMetrics.duplicatesCount} rows</strong> match existing records in the database. (Mode: <strong className="uppercase font-mono">{duplicateStrategy}</strong>)
                    </span>
                  </div>
                </div>
              )}

              {/* Table of Parsed Rows */}
              <div className="overflow-x-auto max-h-72 scrollbar-thin">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Branch</th>
                      <th className="p-2">PI NO</th>
                      <th className="p-2">Product Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Bank Name</th>
                      <th className="p-2">LC NO / Ref NO</th>
                      <th className="p-2">LC Date</th>
                      <th className="p-2">Usance / Sight</th>
                      <th className="p-2 text-right">Days</th>
                      <th className="p-2 text-right">Ex Rate</th>
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
                        <td className="p-2 font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${row.lcType === "LC" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {row.lcType}
                          </span>
                        </td>
                        <td className="p-2 text-slate-700">{row.bankName || "-"}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">{row.lcNoRefNo || "-"}</td>
                        <td className="p-2 font-mono text-slate-600">{row.lcDate || "-"}</td>
                        <td className="p-2">{row.lcUsanceAtSight}</td>
                        <td className="p-2 text-right font-mono">{row.usanceDays}</td>
                        <td className="p-2 text-right font-mono">{row.lcOpenExRate > 0 ? row.lcOpenExRate.toFixed(2) : "-"}</td>
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
                <span className="font-semibold text-slate-700">Importing records... {importProgress}%</span>
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
                  : `Import ${parsedRows.filter((r) => r.isValid).length} Records to Database`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
