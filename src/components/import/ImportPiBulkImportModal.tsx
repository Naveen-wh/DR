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
  FileText,
  Layers,
  DollarSign,
  Package,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { ImportPiRecord, ImportPiProductItem, AolBranchName, SupplierName, Product } from "../../types";

interface ImportPiBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImportPi: (record: Omit<ImportPiRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportPi?: (record: ImportPiRecord) => void;
  existingPis: ImportPiRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  activeUserId: string;
  activeUserName?: string;
  appsScriptUrl?: string;
  sheetName?: string;
  onSyncToAppsScript?: (action: "ADD" | "EDIT" | "DELETE", record: ImportPiRecord) => void;
}

export interface ParsedPiRow {
  rowIndex: number;
  id?: string;
  aolBranchName: string;
  indentor: string;
  piNo: string;
  entryDate: string;
  piDate: string;
  piExRate: number;
  supplierName: string;
  productName: string;
  usdPmt: number;
  purchaseQty: number;
  totalUsd: number;
  mfg: string;
  port: string;
  paymentTerms: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
}

// Helper to parse numeric values safely
function parseNumericVal(val: any, fallback: number = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[$₹, ]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

// Robust CSV/TSV Parser
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

// Normalize key names for flexible column matching
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

export default function ImportPiBulkImportModal({
  isOpen,
  onClose,
  onAddImportPi,
  onUpdateImportPi,
  existingPis,
  aolBranches = [],
  suppliers = [],
  products = [],
  activeUserId,
  activeUserName = "Current User",
  appsScriptUrl = "",
  sheetName = "Import PIs",
  onSyncToAppsScript
}: ImportPiBulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "file" | "sheetUrl">("paste");
  const [pastedText, setPastedText] = useState<string>("");
  const [sheetFetchUrl, setSheetFetchUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedPiRow[]>([]);
  const [searchPreviewQuery, setSearchPreviewQuery] = useState<string>("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"update" | "skip" | "create_new">("update");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [successReport, setSuccessReport] = useState<{ count: number; updated: number; created: number } | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default option values
  const defaultBranches = ["Mumbai", "Delhi", "Chennai", "Gujarat"];
  const branchOptions = useMemo(() => {
    const fromDb = aolBranches.map((b) => b.name);
    return Array.from(new Set([...defaultBranches, ...fromDb]));
  }, [aolBranches]);

  const defaultSuppliers = ["Vardhman Trading", "FORMOSA PLASTICS CORPORATION", "SABIC", "LG CHEM", "LOTTE CHEMICAL"];
  const supplierOptions = useMemo(() => {
    const fromDb = suppliers.map((s) => s.name);
    return Array.from(new Set([...defaultSuppliers, ...fromDb]));
  }, [suppliers]);

  const defaultProducts = ["PVC RESIN B-57", "PVC RESIN S-70", "PVC RESIN S-75", "PVC RESIN S-80"];
  const productOptions = useMemo(() => {
    const fromDb = products.map((p) => p.name);
    return Array.from(new Set([...defaultProducts, ...fromDb]));
  }, [products]);

  // Existing PI products map for duplicate detection
  const existingMap = useMemo(() => {
    const map = new Map<string, ImportPiRecord>();
    existingPis.forEach((rec) => {
      const branch = String(rec.aolBranchName || "").trim().toUpperCase();
      const pi = String(rec.piNo || "").trim().toUpperCase();
      const prodName = String(rec.productName || (rec.products && rec.products[0]?.productName) || "").trim().toUpperCase();
      if (pi && prodName) {
        map.set(`${branch}|||${pi}|||${prodName}`, rec);
      }
      if (rec.id) {
        map.set(`ID:::${String(rec.id).trim().toUpperCase()}`, rec);
      }
    });
    return map;
  }, [existingPis]);

  // Sample CSV Template Generator (Demonstrates multiple products per PI)
  const sampleCsvContent = useMemo(() => {
    return `AOL Branch Name,PI NO,PI Date,Supplier Name,Indentor,PI Ex Rate,Product Name,USD PMT,Purchase QTY,Total USD,MFG,Port,Payment Terms,ID
Mumbai,PI-2026-001,${new Date().toISOString().split("T")[0]},FORMOSA PLASTICS CORPORATION,DNA,83.50,PVC RESIN S-70,850,250,212.50,Formosa,Nhava Sheva,90 Days LC,
Mumbai,PI-2026-001,${new Date().toISOString().split("T")[0]},FORMOSA PLASTICS CORPORATION,DNA,83.50,PVC RESIN B-57,820,150,123.00,Formosa,Nhava Sheva,90 Days LC,
Delhi,PI-2026-002,${new Date().toISOString().split("T")[0]},SABIC,Rahul Verma,83.50,PVC RESIN S-80,900,100,90.00,SABIC,Mundra,LC At Sight,
Chennai,PI-2026-003,${new Date().toISOString().split("T")[0]},LG CHEM,DNA,83.50,PVC RESIN S-75,875,180,157.50,LG Chem,Chennai Port,30 Days Open Credit,`;
  }, []);

  const sampleHeadersOnly = "AOL Branch Name\tPI NO\tPI Date\tSupplier Name\tIndentor\tPI Ex Rate\tProduct Name\tUSD PMT\tPurchase QTY\tTotal USD\tMFG\tPort\tPayment Terms\tID";

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "import_pi_google_sheet_template.csv");
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

  // Convert raw parsed key-value rows to validated ParsedPiRows
  const processRawData = (rawList: Record<string, string>[]) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const processed: ParsedPiRow[] = [];

    rawList.forEach((raw, idx) => {
      const idVal = findMatchingValue(raw, ["id", "piid", "recordid", "id#", "docid"]);
      const branchVal = findMatchingValue(raw, ["aolbranchname", "aolbranch", "branch", "branchname", "location"]) || branchOptions[0] || "Mumbai";
      const piNoVal = findMatchingValue(raw, ["pino", "pi_no", "pinumber", "pi#", "pi", "proformainvoiceno"]);
      const indentorVal = findMatchingValue(raw, ["indentor", "indentorname", "agent", "broker"]);
      const piDateVal = findMatchingValue(raw, ["pidate", "pi_date", "date", "invoicedate"]) || todayStr;
      const entryDateVal = findMatchingValue(raw, ["entrydate", "entry_date", "createddate"]) || todayStr;
      const piExRateVal = parseNumericVal(findMatchingValue(raw, ["piexrate", "exrate", "ex_rate", "exchangerate", "piexchangerate"]), 0);
      const supplierVal = findMatchingValue(raw, ["suppliername", "supplier", "vendor", "party", "supplier_name"]) || supplierOptions[0] || "Vardhman Trading";
      const productNameVal = findMatchingValue(raw, ["productname", "product", "item", "gradename", "material", "product_name"]) || productOptions[0] || "PVC RESIN B-57";
      const usdPmtVal = parseNumericVal(findMatchingValue(raw, ["usdpmt", "usd/pmt", "pmt", "rate", "usdrate", "pricepmt"]), 0);
      const purchaseQtyVal = parseNumericVal(findMatchingValue(raw, ["purchaseqty", "purchase_qty", "qty", "quantity", "purchseqty", "mt", "quantitymt"]), 0);
      
      let totalUsdVal = parseNumericVal(findMatchingValue(raw, ["totalusd", "total_usd", "totalamount", "grandtotalusd", "usdtotal"]), 0);
      if (totalUsdVal === 0 && usdPmtVal > 0 && purchaseQtyVal > 0) {
        totalUsdVal = (usdPmtVal * purchaseQtyVal) / 1000;
      }

      const mfgVal = findMatchingValue(raw, ["mfg", "manufacturer", "maker", "brand"]);
      const portVal = findMatchingValue(raw, ["port", "dischargeport", "portname", "destinationport"]);
      const paymentTermsVal = findMatchingValue(raw, ["paymentterms", "terms", "paymentterm", "creditterms", "payterms"]);

      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!piNoVal) errors.push("PI NO is missing");
      if (!productNameVal) errors.push("Product Name is missing");
      if (purchaseQtyVal <= 0) warnings.push("Purchase Qty is 0 or invalid");
      if (usdPmtVal <= 0) warnings.push("USD PMT is 0 or invalid");

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
        indentor: indentorVal,
        piNo: piNoVal,
        entryDate: entryDateVal,
        piDate: piDateVal,
        piExRate: piExRateVal,
        supplierName: supplierVal,
        productName: productNameVal,
        usdPmt: usdPmtVal,
        purchaseQty: purchaseQtyVal,
        totalUsd: totalUsdVal,
        mfg: mfgVal,
        port: portVal,
        paymentTerms: paymentTermsVal,
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
          alert("Could not parse rows from the uploaded file. Please check file format.");
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

  // Direct fetch from Google Sheet CSV or Apps Script URL
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

    // If it's a standard Google Docs spreadsheet URL, convert it to a CSV export URL
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
      alert(`Failed to fetch Google Sheet data directly: ${err?.message || String(err)}.\n\nTip: You can also copy all cells in your Google Sheet (Ctrl+A, Ctrl+C) and paste them directly in the 'Paste Data' tab.`);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Track and calculate next sequential PI ID
  const getNextPiId = (offset: number = 0, currentBaseMax?: number) => {
    let maxNum = currentBaseMax !== undefined ? currentBaseMax : 0;
    if (currentBaseMax === undefined) {
      existingPis.forEach((r) => {
        if (!r.id) return;
        const match = r.id.match(/^PI-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    const nextNum = (maxNum > 0 ? maxNum : existingPis.length) + 1 + offset;
    return `PI-${nextNum}`;
  };

  // Summary Metrics of Parsed Data
  const summaryMetrics = useMemo(() => {
    const validRows = parsedRows.filter((r) => r.isValid);
    const uniquePiSet = new Set(validRows.map((r) => `${r.aolBranchName}___${r.piNo}`));
    const totalPurchaseQty = validRows.reduce((acc, r) => acc + r.purchaseQty, 0);
    const grandTotalUsd = validRows.reduce((acc, r) => acc + r.totalUsd, 0);
    const duplicatesCount = validRows.filter((r) => r.isDuplicate).length;

    return {
      totalRows: parsedRows.length,
      validRowsCount: validRows.length,
      uniquePisCount: uniquePiSet.size,
      totalPurchaseQty,
      grandTotalUsd,
      duplicatesCount
    };
  }, [parsedRows]);

  // Filter preview rows by search query
  const filteredPreviewRows = useMemo(() => {
    if (!searchPreviewQuery.trim()) return parsedRows;
    const q = searchPreviewQuery.toLowerCase();
    return parsedRows.filter(
      (r) =>
        r.piNo.toLowerCase().includes(q) ||
        r.aolBranchName.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.indentor && r.indentor.toLowerCase().includes(q))
    );
  }, [parsedRows, searchPreviewQuery]);

  // Handle Execute Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to import. Please check for errors in the preview.");
      return;
    }

    setIsSubmitting(true);
    setImportProgress(0);

    let maxNum = 0;
    existingPis.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^PI-(\d+)$/i);
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
          // Skip this record
          continue;
        }

        const singleProdItem: ImportPiProductItem = {
          id: `pi-prod-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          productName: row.productName,
          usdPmt: row.usdPmt,
          purchaseQty: row.purchaseQty,
          totalUsd: row.totalUsd
        };

        if (existingRecord && duplicateStrategy === "update" && onUpdateImportPi) {
          // Update existing record
          const updated: ImportPiRecord = {
            ...existingRecord,
            aolBranchName: row.aolBranchName,
            indentor: row.indentor,
            piNo: row.piNo,
            entryDate: row.entryDate,
            piDate: row.piDate,
            piExRate: row.piExRate,
            supplierName: row.supplierName,
            products: [singleProdItem],
            totalPurchaseQty: row.purchaseQty,
            grandTotalUsd: row.totalUsd,
            productName: row.productName,
            usdPmt: row.usdPmt,
            purchaseQty: row.purchaseQty,
            totalUsd: row.totalUsd,
            mfg: row.mfg,
            port: row.port,
            paymentTerms: row.paymentTerms
          };
          await onUpdateImportPi(updated);
          if (onSyncToAppsScript) {
            onSyncToAppsScript("EDIT", updated);
          }
          updatedCount++;
        } else {
          // Create new record
          let assignedId = row.id;
          if (!assignedId || !assignedId.toUpperCase().startsWith("PI-")) {
            maxNum++;
            assignedId = `PI-${maxNum}`;
          }

          const newRecord: ImportPiRecord = {
            id: assignedId,
            createdAt: new Date().toISOString(),
            aolBranchName: row.aolBranchName,
            indentor: row.indentor,
            piNo: row.piNo,
            entryDate: row.entryDate,
            piDate: row.piDate,
            piExRate: row.piExRate,
            supplierName: row.supplierName,
            products: [singleProdItem],
            totalPurchaseQty: row.purchaseQty,
            grandTotalUsd: row.totalUsd,
            productName: row.productName,
            usdPmt: row.usdPmt,
            purchaseQty: row.purchaseQty,
            totalUsd: row.totalUsd,
            mfg: row.mfg,
            port: row.port,
            paymentTerms: row.paymentTerms,
            createdByUserId: activeUserId,
            createdByName: activeUserName
          };

          await onAddImportPi(newRecord);
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
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
                Import PI Records (Google Sheets & CSV)
              </h3>
              <p className="text-[11px] text-slate-400">
                Bulk import proforma invoices with one row for each product
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
                    Successfully Imported {successReport.count} PI Product Records!
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

          {/* Quick Action Buttons (Template Download & Header Copy) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold font-mono text-slate-600 uppercase">
                Template & Guidance:
              </span>
              <span className="text-[11px] text-slate-500">
                1 row = 1 product in a PI (Multiple rows can share the same PI NO)
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
                title="Copy sample CSV text with multiple products per PI"
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
                <span>Download Sample CSV Template</span>
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
                placeholder={`AOL Branch Name\tPI NO\tPI Date\tSupplier Name\tIndentor\tPI Ex Rate\tProduct Name\tUSD PMT\tPurchase QTY\tMFG\tPort\tPayment Terms\nMumbai\tPI-2026-001\t2026-09-01\tFORMOSA PLASTICS CORPORATION\tDNA\t83.50\tPVC RESIN S-70\t850\t250\tFormosa\tNhava Sheva\t90 Days LC\nMumbai\tPI-2026-001\t2026-09-01\tFORMOSA PLASTICS CORPORATION\tDNA\t83.50\tPVC RESIN B-57\t820\t150\tFormosa\tNhava Sheva\t90 Days LC`}
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
                  Enter a published Google Sheet CSV link (File &gt; Share &gt; Publish to web &gt; Select 'Comma-separated values (.csv)') or standard spreadsheet link.
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
                    placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv"
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

          {/* PREVIEW SECTION (WHEN ROWS ARE PARSED) */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col gap-0 mt-2 bg-white">
              {/* Preview Header Metrics & Controls */}
              <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Parsed Rows</span>
                    <span className="text-sm font-extrabold text-slate-100">{summaryMetrics.totalRows} Product Rows</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Unique PIs</span>
                    <span className="text-sm font-extrabold text-sky-400">{summaryMetrics.uniquePisCount} PIs</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Total QTY</span>
                    <span className="text-sm font-extrabold text-emerald-400">{summaryMetrics.totalPurchaseQty.toLocaleString()} MT</span>
                  </div>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Grand Total USD</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      ${summaryMetrics.grandTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
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

              {/* Duplicate or Warning Summary Banner */}
              {summaryMetrics.duplicatesCount > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>
                      <strong>{summaryMetrics.duplicatesCount} rows</strong> match existing records in the database. (Handling mode: <strong className="uppercase font-mono">{duplicateStrategy}</strong>)
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
                      <th className="p-2">PI Date</th>
                      <th className="p-2">Supplier</th>
                      <th className="p-2">Product Name</th>
                      <th className="p-2 text-right">USD PMT</th>
                      <th className="p-2 text-right">Purchase QTY</th>
                      <th className="p-2 text-right">Total USD</th>
                      <th className="p-2">MFG</th>
                      <th className="p-2">Port</th>
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
                        <td className="p-2 font-mono text-slate-600">{row.piDate}</td>
                        <td className="p-2 text-slate-700 truncate max-w-[120px]" title={row.supplierName}>
                          {row.supplierName}
                        </td>
                        <td className="p-2 font-semibold text-slate-900">{row.productName}</td>
                        <td className="p-2 text-right font-mono">${row.usdPmt.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold">{row.purchaseQty.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700">
                          ${row.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-slate-600">{row.mfg || "-"}</td>
                        <td className="p-2 text-slate-600">{row.port || "-"}</td>
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
