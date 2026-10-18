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
  Box,
  Scale,
  Database
} from "lucide-react";
import { ImportContainerRecord, ImportBoeRecord, ImportPiRecord, User } from "../../types";

interface ImportContainerBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImportContainer: (record: Omit<ImportContainerRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportContainer?: (record: ImportContainerRecord) => void;
  existingContainers: ImportContainerRecord[];
  importPis?: ImportPiRecord[];
  importBoes?: ImportBoeRecord[];
  activeUserId: string;
  activeUserName?: string;
  appsScriptUrl?: string;
  sheetName?: string;
  onSyncToAppsScript?: (action: "ADD" | "EDIT" | "DELETE", record: ImportContainerRecord) => void;
}

export interface ParsedContainerRow {
  rowIndex: number;
  id?: string;
  aolBranchName: string;
  beNo: string;
  invoiceNumber: string;
  productName: string;
  piNo: string;
  containerNo: string;
  sizeOfContainer: string;
  containerWiseQty: string;
  entryDate: string;
  remark: string;
  // IGM fields
  igmNoDt: string;
  igmItemNo: string;
  igmChaSelfJobNo: string;
  igmFinalInwardDate: string;
  igmContainerGatedIn: string;
  igmCfsLastDate: string;
  igmMaterialMovedOutOfCfs: string;
  igmFreeEmptyCtnrDetentionLastDt: string;
  igmStatusRemark: string;
  igmDuty: boolean;
  igmShpLine: boolean;
  igmStampDuty: boolean;
  igmDo: boolean;
  igmCfs: boolean;
  igmOocStatus: boolean;
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

// Boolean parser
function parseBoolVal(val: any): boolean {
  if (val === undefined || val === null || val === "") return false;
  if (typeof val === "boolean") return val;
  const str = String(val).trim().toLowerCase();
  return str === "true" || str === "yes" || str === "1" || str === "y" || str === "done" || str === "paid";
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

export default function ImportContainerBulkImportModal({
  isOpen,
  onClose,
  onAddImportContainer,
  onUpdateImportContainer,
  existingContainers,
  importPis = [],
  importBoes = [],
  activeUserId,
  activeUserName = "Current User",
  appsScriptUrl = "",
  sheetName = "Import Containers",
  onSyncToAppsScript
}: ImportContainerBulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "file" | "sheetUrl">("paste");
  const [pastedText, setPastedText] = useState<string>("");
  const [sheetFetchUrl, setSheetFetchUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedContainerRow[]>([]);
  const [searchPreviewQuery, setSearchPreviewQuery] = useState<string>("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip" | "create_new">("update");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [successReport, setSuccessReport] = useState<{ count: number; updated: number; created: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const [copiedContainerOnly, setCopiedContainerOnly] = useState<boolean>(false);
  const [copiedIgmOnly, setCopiedIgmOnly] = useState<boolean>(false);
  const [showFieldsGuide, setShowFieldsGuide] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Existing Container Map for duplicate detection
  const existingMap = useMemo(() => {
    const map = new Map<string, ImportContainerRecord>();
    existingContainers.forEach((rec) => {
      const branch = (rec.aolBranchName || "").trim().toUpperCase();
      const beNo = (rec.beNo || "").trim().toUpperCase();
      const ctnr = (rec.containerNo || "").trim().toUpperCase();
      const prod = (rec.productName || "").trim().toUpperCase();

      if (branch && beNo && ctnr && prod) {
        map.set(`FULL:::${branch}|||${beNo}|||${ctnr}|||${prod}`, rec);
      }
      if (beNo && ctnr) {
        map.set(`BECTNR:::${beNo}|||${ctnr}`, rec);
      }
      if (rec.id) {
        map.set(`ID:::${rec.id.trim().toUpperCase()}`, rec);
      }
    });
    return map;
  }, [existingContainers]);

  // BOE lookup map to auto-fill branch, PI, invoice, product if omitted
  const boeLookup = useMemo(() => {
    const map = new Map<string, ImportBoeRecord>();
    importBoes.forEach((b) => {
      const beNo = (b.beNo || "").trim().toUpperCase();
      if (beNo) {
        map.set(beNo, b);
      }
    });
    return map;
  }, [importBoes]);

  // Comprehensive CSV template content containing ALL container and extended IGM & Item fields
  const sampleCsvContent = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return `AOL Branch Name,BE NO,Invoice Number,Product Name,PI NO,Container No,Size of Container,Container Wise Qty,Entry Date,Remark,IGM No & Dt,IGM Item No,CHA / Self Job No,Final Inward Date,Container Gated In,CFS Last Date,Material Moved Out Of CFS,Free Empty Ctnr Detention Last Dt,IGM Status Remark,Duty,Shipping Line,Stamp Duty,DO,CFS,OOC Status,ID
Mumbai,BE-9948271,INV-2026-991,PVC RESIN S-70,PI-2026-001,MSCU-8839201,20 FT,25.00,${today},Clean container,IGM-99481 / ${today},12,JOB-4412,${today},${today},${today},${today},${today},In transit to CFS,Yes,Yes,Yes,Yes,Yes,Yes,
Mumbai,BE-9948271,INV-2026-991,PVC RESIN S-70,PI-2026-001,MSCU-8839202,20 FT,25.00,${today},Clean container,IGM-99481 / ${today},12,JOB-4412,${today},${today},${today},${today},${today},Gated in successfully,Yes,Yes,Yes,Yes,Yes,Yes,
Delhi,BE-4439182,INV-SAB-048,PVC RESIN S-80,PI-2026-002,MAEU-1192834,40 HQ,26.50,${today},Seal intact,IGM-33214 / ${today},04,JOB-9921,${today},${today},${today},${today},${today},Awaiting out of CFS,Yes,No,Yes,Yes,No,No,`;
  }, []);

  // Complete header row (TSV) with all 25 fields
  const sampleHeadersOnly =
    "AOL Branch Name\tBE NO\tInvoice Number\tProduct Name\tPI NO\tContainer No\tSize of Container\tContainer Wise Qty\tEntry Date\tRemark\tIGM No & Dt\tIGM Item No\tCHA / Self Job No\tFinal Inward Date\tContainer Gated In\tCFS Last Date\tMaterial Moved Out Of CFS\tFree Empty Ctnr Detention Last Dt\tIGM Status Remark\tDuty\tShipping Line\tStamp Duty\tDO\tCFS\tOOC Status\tID";

  const containerOnlyHeaders =
    "AOL Branch Name\tBE NO\tInvoice Number\tProduct Name\tPI NO\tContainer No\tSize of Container\tContainer Wise Qty\tEntry Date\tRemark\tID";

  const igmOnlyHeaders =
    "Container No\tBE NO\tIGM No & Dt\tIGM Item No\tCHA / Self Job No\tFinal Inward Date\tContainer Gated In\tCFS Last Date\tMaterial Moved Out Of CFS\tFree Empty Ctnr Detention Last Dt\tIGM Status Remark\tDuty\tShipping Line\tStamp Duty\tDO\tCFS\tOOC Status";

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "import_containers_and_igm_template.csv");
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

  const handleCopyContainerOnlyHeaders = () => {
    navigator.clipboard.writeText(containerOnlyHeaders);
    setCopiedContainerOnly(true);
    setTimeout(() => setCopiedContainerOnly(false), 2000);
  };

  const handleCopyIgmOnlyHeaders = () => {
    navigator.clipboard.writeText(igmOnlyHeaders);
    setCopiedIgmOnly(true);
    setTimeout(() => setCopiedIgmOnly(false), 2000);
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleCsvContent);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Convert raw rows to validated ParsedContainerRows with comprehensive aliases
  const processRawData = (rawList: Record<string, string>[]) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const processed: ParsedContainerRow[] = [];

    rawList.forEach((raw, idx) => {
      // 1. Container core fields
      const idVal = findMatchingValue(raw, ["id", "cnid", "containerid", "recordid", "id#", "container_id"]);
      let branchVal = findMatchingValue(raw, ["aolbranchname", "aolbranch", "branch", "branchname", "location", "aol_branch"]);
      const beNoVal = findMatchingValue(raw, ["beno", "be_no", "billofentryno", "benumber", "be#", "boe_no", "boeno"]);
      let invoiceNumberVal = findMatchingValue(raw, ["invoicenumber", "invoiceno", "invno", "inv_no", "commercialinvoiceno", "invoice_no"]);
      let productNameVal = findMatchingValue(raw, ["productname", "product", "item", "gradename", "material", "product_name"]);
      let piNoVal = findMatchingValue(raw, ["pino", "pi_no", "pinumber", "pi#", "pi", "proformainvoiceno", "proforma_invoice_no"]);

      // Lookup linked BOE info if branch, invoice, product, or PI was omitted
      if (beNoVal && boeLookup.has(beNoVal.trim().toUpperCase())) {
        const boeMatch = boeLookup.get(beNoVal.trim().toUpperCase())!;
        if (!branchVal && boeMatch.aolBranchName) branchVal = boeMatch.aolBranchName;
        if (!invoiceNumberVal && boeMatch.invoiceNumber) invoiceNumberVal = boeMatch.invoiceNumber;
        if (!productNameVal && boeMatch.productName) productNameVal = boeMatch.productName;
        if (!piNoVal && boeMatch.piNo) piNoVal = boeMatch.piNo;
      }

      const containerNoVal = findMatchingValue(raw, ["containerno", "container_no", "containernumber", "ctnrno", "container#", "container", "cntrno"]);
      const sizeVal = findMatchingValue(raw, ["sizeofcontainer", "containersize", "size", "c_size", "containersizeft", "ctnrsize"]) || "20 FT";
      const containerWiseQtyVal = findMatchingValue(raw, ["containerwiseqty", "qty", "quantity", "containerqty", "weight", "netweight", "containerweight", "ctnrqty"]);
      const entryDateVal = findMatchingValue(raw, ["entrydate", "entry_date", "createddate", "date", "entrydt"]) || todayStr;
      const remarkVal = findMatchingValue(raw, ["remark", "remarks", "note", "notes", "comment", "comments"]);

      // 2. Extended IGM & Item Movement details (Comprehensive alias mapping)
      const igmNoDtVal = findMatchingValue(raw, ["igmnodt", "igm_no_dt", "igmno", "igmnumber", "igmdt", "igmdate", "igmnodate", "igmnoanddt"]);
      const igmItemNoVal = findMatchingValue(raw, ["igmitemno", "itemno", "igm_item_no", "item#", "itemnumber", "igmitem"]);
      const igmChaSelfJobNoVal = findMatchingValue(raw, ["igmchaselfjobno", "chaselfjobno", "jobno", "jobnumber", "chajobno", "selfjobno", "chaselfjob"]);
      const igmFinalInwardDateVal = findMatchingValue(raw, ["igmfinalinwarddate", "finalinwarddate", "inwarddate", "finalinwarddt", "inwarddt", "finalinward", "inward_date"]);
      
      // Specifically requested: Container Gated In (igmContainerGatedIn)
      const igmContainerGatedInVal = findMatchingValue(raw, [
        "igmcontainergatedin",
        "containergatedin",
        "gatedin",
        "gatein",
        "gateindate",
        "containergatein",
        "containergatedindate",
        "ctnrgatedin",
        "ctnrgatein",
        "gatedindt",
        "gateindt",
        "containergateindt",
        "gated_in",
        "gate_in",
        "container_gated_in",
        "ctnr_gated_in"
      ]);

      const igmCfsLastDateVal = findMatchingValue(raw, ["igmcfslastdate", "cfslastdate", "cfslastdt", "cfslastdate10days", "cfsdate", "cfslast", "cfslastdate_10days", "cfs_last_date"]);
      const igmMaterialMovedOutOfCfsVal = findMatchingValue(raw, [
        "igmmaterialmovedoutofcfs",
        "materialmovedoutofcfs",
        "materialmovedoutfromcfs",
        "movedoutofcfs",
        "cfsoutdate",
        "outofcfsdate",
        "outofcfs",
        "cfsoutdt",
        "materialmovedout",
        "cfs_out_date"
      ]);
      const igmFreeEmptyVal = findMatchingValue(raw, [
        "igmfreeemptyctnrdetentionlastdt",
        "freeemptyctnrdetentionlastdt",
        "freeemptycontainerdetentionlastdate",
        "containerdetentionlastdate",
        "detentionlastdate",
        "freeemptydetentionlastdate",
        "detentionlastdt",
        "freedayslastdate",
        "freeemptylastdate",
        "detentiondate",
        "detention_last_date"
      ]);
      const igmStatusRemarkVal = findMatchingValue(raw, [
        "igmstatusremark",
        "igmstatus",
        "igmremark",
        "igmremarks",
        "statusremark",
        "igmstat",
        "igmnotes",
        "igm_status_remark",
        "status_remark"
      ]);

      // 3. IGM Checkpoints
      const igmDutyVal = parseBoolVal(findMatchingValue(raw, ["igmduty", "dutypaid", "duty", "dutystatus", "customduty", "duty_paid"]));
      const igmShpLineVal = parseBoolVal(findMatchingValue(raw, ["igmshpline", "shpline", "shippingline", "shplinepaid", "shippinglinestatus", "shp_line"]));
      const igmStampDutyVal = parseBoolVal(findMatchingValue(raw, ["igmstampduty", "stampduty", "stamp", "stampdutypaid", "stamp_duty"]));
      const igmDoVal = parseBoolVal(findMatchingValue(raw, ["igmdo", "do", "deliveryorder", "dostatus", "doreceived", "delivery_order"]));
      const igmCfsVal = parseBoolVal(findMatchingValue(raw, ["igmcfs", "cfs", "cfsstatus", "cfspaid", "cfs_status"]));
      const igmOocStatusVal = parseBoolVal(findMatchingValue(raw, ["igmoocstatus", "oocstatus", "ooc", "outofchargestatus", "outofcharge", "ooc_status"]));

      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!containerNoVal) errors.push("Container No is missing");
      if (!beNoVal) errors.push("BE NO is missing");
      if (!productNameVal) warnings.push("Product Name is missing");
      if (!branchVal) warnings.push("AOL Branch is missing");
      if (parseNumericVal(containerWiseQtyVal) <= 0) warnings.push("Container Wise Qty is 0");

      // Check duplicates in existing database
      const fullKey = `FULL:::${branchVal.trim().toUpperCase()}|||${beNoVal.trim().toUpperCase()}|||${containerNoVal.trim().toUpperCase()}|||${productNameVal.trim().toUpperCase()}`;
      const beCtnrKey = `BECTNR:::${beNoVal.trim().toUpperCase()}|||${containerNoVal.trim().toUpperCase()}`;
      const idKey = idVal ? `ID:::${idVal.trim().toUpperCase()}` : "";

      const existingMatch = existingMap.get(fullKey) || existingMap.get(beCtnrKey) || (idKey ? existingMap.get(idKey) : undefined);
      
      const isDuplicate = !!existingMatch;
      const duplicateReason = isDuplicate
        ? `Matches existing container ${existingMatch?.id || "in DB"} (BE No: ${beNoVal}, Container No: ${containerNoVal})`
        : undefined;

      processed.push({
        rowIndex: idx + 1,
        id: idVal || undefined,
        aolBranchName: branchVal,
        beNo: beNoVal,
        invoiceNumber: invoiceNumberVal,
        productName: productNameVal,
        piNo: piNoVal,
        containerNo: containerNoVal,
        sizeOfContainer: sizeVal,
        containerWiseQty: containerWiseQtyVal,
        entryDate: entryDateVal,
        remark: remarkVal,
        igmNoDt: igmNoDtVal,
        igmItemNo: igmItemNoVal,
        igmChaSelfJobNo: igmChaSelfJobNoVal,
        igmFinalInwardDate: igmFinalInwardDateVal,
        igmContainerGatedIn: igmContainerGatedInVal,
        igmCfsLastDate: igmCfsLastDateVal,
        igmMaterialMovedOutOfCfs: igmMaterialMovedOutOfCfsVal,
        igmFreeEmptyCtnrDetentionLastDt: igmFreeEmptyVal,
        igmStatusRemark: igmStatusRemarkVal,
        igmDuty: igmDutyVal,
        igmShpLine: igmShpLineVal,
        igmStampDuty: igmStampDutyVal,
        igmDo: igmDoVal,
        igmCfs: igmCfsVal,
        igmOocStatus: igmOocStatusVal,
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
        r.containerNo.toLowerCase().includes(q) ||
        r.beNo.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.aolBranchName.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.piNo.toLowerCase().includes(q)
    );
  }, [parsedRows, searchPreviewQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const validRows = parsedRows.filter((r) => r.isValid);
    const totalQty = validRows.reduce((sum, r) => sum + parseNumericVal(r.containerWiseQty), 0);
    const duplicatesCount = validRows.filter((r) => r.isDuplicate).length;

    return {
      totalRows: parsedRows.length,
      validRowsCount: validRows.length,
      totalQty,
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
    existingContainers.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^CN-(\d+)$/i);
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
        const fullKey = `FULL:::${row.aolBranchName.trim().toUpperCase()}|||${row.beNo.trim().toUpperCase()}|||${row.containerNo.trim().toUpperCase()}|||${row.productName.trim().toUpperCase()}`;
        const beCtnrKey = `BECTNR:::${row.beNo.trim().toUpperCase()}|||${row.containerNo.trim().toUpperCase()}`;
        const idKey = row.id ? `ID:::${row.id.trim().toUpperCase()}` : "";
        const existingRecord = existingMap.get(fullKey) || existingMap.get(beCtnrKey) || (idKey ? existingMap.get(idKey) : undefined);

        if (existingRecord && duplicateStrategy === "skip") {
          continue;
        }

        if (existingRecord && duplicateStrategy === "update" && onUpdateImportContainer) {
          const updated: ImportContainerRecord = {
            ...existingRecord,
            aolBranchName: row.aolBranchName,
            beNo: row.beNo,
            invoiceNumber: row.invoiceNumber,
            productName: row.productName,
            piNo: row.piNo,
            containerNo: row.containerNo,
            sizeOfContainer: row.sizeOfContainer,
            containerWiseQty: parseNumericVal(row.containerWiseQty),
            entryDate: row.entryDate,
            remark: row.remark,
            igmNoDt: row.igmNoDt || existingRecord.igmNoDt,
            igmItemNo: row.igmItemNo || existingRecord.igmItemNo,
            igmChaSelfJobNo: row.igmChaSelfJobNo || existingRecord.igmChaSelfJobNo,
            igmFinalInwardDate: row.igmFinalInwardDate || existingRecord.igmFinalInwardDate,
            igmContainerGatedIn: row.igmContainerGatedIn || existingRecord.igmContainerGatedIn,
            igmCfsLastDate: row.igmCfsLastDate || existingRecord.igmCfsLastDate,
            igmMaterialMovedOutOfCfs: row.igmMaterialMovedOutOfCfs || existingRecord.igmMaterialMovedOutOfCfs,
            igmFreeEmptyCtnrDetentionLastDt: row.igmFreeEmptyCtnrDetentionLastDt || existingRecord.igmFreeEmptyCtnrDetentionLastDt,
            igmStatusRemark: row.igmStatusRemark || existingRecord.igmStatusRemark,
            igmDuty: row.igmDuty ?? existingRecord.igmDuty,
            igmShpLine: row.igmShpLine ?? existingRecord.igmShpLine,
            igmStampDuty: row.igmStampDuty ?? existingRecord.igmStampDuty,
            igmDo: row.igmDo ?? existingRecord.igmDo,
            igmCfs: row.igmCfs ?? existingRecord.igmCfs,
            igmOocStatus: row.igmOocStatus ?? existingRecord.igmOocStatus
          };
          await onUpdateImportContainer(updated);
          if (onSyncToAppsScript) {
            onSyncToAppsScript("EDIT", updated);
          }
          updatedCount++;
        } else {
          let assignedId = row.id;
          if (!assignedId || !assignedId.toUpperCase().startsWith("CN-")) {
            maxNum++;
            assignedId = `CN-${maxNum}`;
          }

          const newRecord: ImportContainerRecord = {
            id: assignedId,
            createdAt: new Date().toISOString(),
            aolBranchName: row.aolBranchName,
            beNo: row.beNo,
            invoiceNumber: row.invoiceNumber,
            productName: row.productName,
            piNo: row.piNo,
            containerNo: row.containerNo,
            sizeOfContainer: row.sizeOfContainer,
            containerWiseQty: parseNumericVal(row.containerWiseQty),
            entryDate: row.entryDate,
            remark: row.remark,
            igmNoDt: row.igmNoDt,
            igmItemNo: row.igmItemNo,
            igmChaSelfJobNo: row.igmChaSelfJobNo,
            igmFinalInwardDate: row.igmFinalInwardDate,
            igmContainerGatedIn: row.igmContainerGatedIn,
            igmCfsLastDate: row.igmCfsLastDate,
            igmMaterialMovedOutOfCfs: row.igmMaterialMovedOutOfCfs,
            igmFreeEmptyCtnrDetentionLastDt: row.igmFreeEmptyCtnrDetentionLastDt,
            igmStatusRemark: row.igmStatusRemark,
            igmDuty: row.igmDuty,
            igmShpLine: row.igmShpLine,
            igmStampDuty: row.igmStampDuty,
            igmDo: row.igmDo,
            igmCfs: row.igmCfs,
            igmOocStatus: row.igmOocStatus,
            createdByUserId: activeUserId,
            createdByName: activeUserName
          };

          await onAddImportContainer(newRecord);
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
              <Box size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
                Import Container Records (Google Sheets & CSV)
              </h3>
              <p className="text-[11px] text-slate-400">
                Bulk import shipping containers, sizes, weights, and IGM details
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
                    Successfully Imported {successReport.count} Container Records!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    {successReport.created > 0 && `${successReport.created} new container units added to database. `}
                    {successReport.updated > 0 && `${successReport.updated} existing containers updated. `}
                    All container tracking and IGM info is now synchronized.
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold font-mono text-slate-700 uppercase flex items-center gap-1.5">
                  <Database size={13} className="text-emerald-600" />
                  All Available Fields (Container + Extended IGM & Item):
                </span>
                <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  25 Supported Columns
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowFieldsGuide(!showFieldsGuide)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Toggle field reference dictionary"
                >
                  <FileSpreadsheet size={13} className="text-indigo-600" />
                  <span>{showFieldsGuide ? "Hide Field Reference" : "View All 25 Fields"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyHeaders}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Copy complete list of 25 headers including Container Gated In & IGM"
                >
                  {copiedHeaders ? <CheckCircle size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-500" />}
                  <span>{copiedHeaders ? "All Headers Copied!" : "Copy All Headers (TSV)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyContainerOnlyHeaders}
                  className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Copy only container core headers (11 fields)"
                >
                  {copiedContainerOnly ? <CheckCircle size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
                  <span>{copiedContainerOnly ? "Copied!" : "Container-Only"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyIgmOnlyHeaders}
                  className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Copy extended IGM & Movement headers (16 fields)"
                >
                  {copiedIgmOnly ? <CheckCircle size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
                  <span>{copiedIgmOnly ? "Copied!" : "IGM-Only"}</span>
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
                  <span>Download Full CSV</span>
                </button>
              </div>
            </div>

            {/* Collapsible / Visible Field Guide */}
            {showFieldsGuide && (
              <div className="mt-1 pt-2.5 border-t border-slate-200 text-[11px] space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    <span className="uppercase text-[10px] font-mono tracking-wider text-slate-600">
                      Core Container Fields (10):
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Click any tag to copy</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "AOL Branch Name", desc: "e.g. Mumbai, Delhi" },
                      { name: "BE NO", desc: "e.g. BE-9948271 (Required)" },
                      { name: "Invoice Number", desc: "e.g. INV-2026-991" },
                      { name: "Product Name", desc: "e.g. PVC RESIN S-70" },
                      { name: "PI NO", desc: "e.g. PI-2026-001 (Optional)" },
                      { name: "Container No", desc: "e.g. MSCU-8839201 (Required)" },
                      { name: "Size of Container", desc: "e.g. 20 FT, 40 HQ" },
                      { name: "Container Wise Qty", desc: "e.g. 25.00 (MT/Qty)" },
                      { name: "Entry Date", desc: "YYYY-MM-DD" },
                      { name: "Remark", desc: "Container condition or notes" },
                      { name: "ID", desc: "Record ID e.g. CN-1 (Optional for update)" }
                    ].map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => navigator.clipboard.writeText(f.name)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 text-[10px] font-mono transition cursor-pointer"
                        title={`${f.name}: ${f.desc} (Click to copy)`}
                      >
                        <span className="font-semibold">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                    <span className="uppercase text-[10px] font-mono tracking-wider text-slate-600">
                      Extended IGM & Movement Fields (9):
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                      Includes Container Gated In
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Container Gated In", desc: "Date container gated into port/CFS (e.g. 2026-09-06)", highlight: true },
                      { name: "IGM No & Dt", desc: "IGM number and date (e.g. IGM-99481 / 2026-09-06)" },
                      { name: "IGM Item No", desc: "IGM item serial/line number (e.g. 12)" },
                      { name: "CHA / Self Job No", desc: "Customs broker or internal job reference (e.g. JOB-4412)" },
                      { name: "Final Inward Date", desc: "Final port inward date (YYYY-MM-DD)" },
                      { name: "CFS Last Date", desc: "10-day CFS free time deadline (YYYY-MM-DD)" },
                      { name: "Material Moved Out Of CFS", desc: "Date cargo moved out of CFS (YYYY-MM-DD)" },
                      { name: "Free Empty Ctnr Detention Last Dt", desc: "Shipping line detention free return date (YYYY-MM-DD)" },
                      { name: "IGM Status Remark", desc: "Customs / clearance status comment" }
                    ].map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => navigator.clipboard.writeText(f.name)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                          f.highlight
                            ? "bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300 font-extrabold shadow-2xs ring-1 ring-purple-400/40"
                            : "bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-800 border-slate-200 font-semibold"
                        }`}
                        title={`${f.name}: ${f.desc} (Click to copy)`}
                      >
                        {f.highlight && <span className="text-purple-600">★</span>}
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="uppercase text-[10px] font-mono tracking-wider text-slate-600">
                      Extended IGM Status Checkpoints (6):
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Accepts Yes/No, True/False, 1/0</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Duty", desc: "Customs Duty paid (Yes/No)" },
                      { name: "Shipping Line", desc: "Shipping line charges paid (Yes/No)" },
                      { name: "Stamp Duty", desc: "Stamp duty cleared (Yes/No)" },
                      { name: "DO", desc: "Delivery order obtained (Yes/No)" },
                      { name: "CFS", desc: "CFS clearance/gate pass (Yes/No)" },
                      { name: "OOC Status", desc: "Out of Charge granted by customs (Yes/No)" }
                    ].map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => navigator.clipboard.writeText(f.name)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[10px] font-mono font-semibold transition cursor-pointer"
                        title={`${f.name}: ${f.desc} (Click to copy)`}
                      >
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                placeholder={`AOL Branch Name\tBE NO\tInvoice Number\tProduct Name\tPI NO\tContainer No\tSize of Container\tContainer Wise Qty\tRemark\nMumbai\tBE-9948271\tINV-2026-991\tPVC RESIN S-70\tPI-2026-001\tMSCU-8839201\t20 FT\t25.00\tClean container\nMumbai\tBE-9948271\tINV-2026-991\tPVC RESIN S-70\tPI-2026-001\tMSCU-8839202\t20 FT\t25.00\tClean container`}
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
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Parsed Containers</span>
                    <span className="text-sm font-extrabold text-slate-100">{summaryMetrics.totalRows} Units</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Total Net Qty (MT)</span>
                    <span className="text-sm font-extrabold text-emerald-400">{summaryMetrics.totalQty.toLocaleString(undefined, { minimumFractionDigits: 2 })} MT</span>
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
                      <strong>{summaryMetrics.duplicatesCount} rows</strong> match existing containers in the database. (Mode: <strong className="uppercase font-mono">{duplicateStrategy}</strong>)
                    </span>
                  </div>
                </div>
              )}

              {/* Table of Parsed Rows */}
              <div className="overflow-x-auto max-h-72 scrollbar-thin">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Branch</th>
                      <th className="p-2">BE NO</th>
                      <th className="p-2">Container No</th>
                      <th className="p-2 bg-purple-50 text-purple-900 border-x border-purple-200">Container Gated In</th>
                      <th className="p-2">Size</th>
                      <th className="p-2 text-right">Qty (MT)</th>
                      <th className="p-2">Product Name</th>
                      <th className="p-2">Invoice No</th>
                      <th className="p-2">IGM No & Dt</th>
                      <th className="p-2">Job No</th>
                      <th className="p-2">Final Inward Dt</th>
                      <th className="p-2">CFS Last Dt</th>
                      <th className="p-2">Moved Out CFS</th>
                      <th className="p-2">Detention Last Dt</th>
                      <th className="p-2">IGM Remark</th>
                      <th className="p-2 text-center">Checkpoints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 whitespace-nowrap">
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
                        <td className="p-2 font-mono font-bold text-slate-900">{row.beNo}</td>
                        <td className="p-2 font-mono font-bold text-emerald-700">{row.containerNo}</td>
                        <td className="p-2 font-mono text-purple-900 bg-purple-50/70 border-x border-purple-100 font-bold">
                          {row.igmContainerGatedIn ? (
                            <span className="inline-flex items-center gap-1 bg-purple-100 border border-purple-300 text-purple-900 px-1.5 py-0.5 rounded font-mono text-[10px]">
                              {row.igmContainerGatedIn}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">—</span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[10px] font-bold">{row.sizeOfContainer}</td>
                        <td className="p-2 text-right font-mono font-bold">{row.containerWiseQty || "-"}</td>
                        <td className="p-2 font-semibold text-slate-900 truncate max-w-[150px]">{row.productName || "-"}</td>
                        <td className="p-2 font-mono text-slate-700">{row.invoiceNumber || "-"}</td>
                        <td className="p-2 font-mono text-slate-600 truncate max-w-[120px]">{row.igmNoDt || "-"}</td>
                        <td className="p-2 font-mono text-slate-600">{row.igmChaSelfJobNo || "-"}</td>
                        <td className="p-2 font-mono text-slate-600">{row.igmFinalInwardDate || "-"}</td>
                        <td className="p-2 font-mono text-slate-600">{row.igmCfsLastDate || "-"}</td>
                        <td className="p-2 font-mono text-slate-600">{row.igmMaterialMovedOutOfCfs || "-"}</td>
                        <td className="p-2 font-mono text-slate-600">{row.igmFreeEmptyCtnrDetentionLastDt || "-"}</td>
                        <td className="p-2 text-slate-600 truncate max-w-[140px]">{row.igmStatusRemark || "-"}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-[9px] font-mono">
                            <span className={`px-1 rounded ${row.igmDuty ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-400"}`} title="Customs Duty">
                              D
                            </span>
                            <span className={`px-1 rounded ${row.igmShpLine ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-400"}`} title="Shipping Line">
                              S
                            </span>
                            <span className={`px-1 rounded ${row.igmStampDuty ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-400"}`} title="Stamp Duty">
                              St
                            </span>
                            <span className={`px-1 rounded ${row.igmDo ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-400"}`} title="Delivery Order">
                              DO
                            </span>
                            <span className={`px-1 rounded ${row.igmCfs ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-400"}`} title="CFS Gate Pass">
                              CFS
                            </span>
                            <span className={`px-1 rounded ${row.igmOocStatus ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-100 text-slate-400"}`} title="Out of Charge">
                              OOC
                            </span>
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
                  : `Import ${parsedRows.filter((r) => r.isValid).length} Containers to Database`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
