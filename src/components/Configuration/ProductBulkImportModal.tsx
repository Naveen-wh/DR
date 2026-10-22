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
  Package,
  Layers,
  Building2,
  Tag,
  Hash,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Plus
} from "lucide-react";
import { Product, ProductCategory, ProductGroup, Manufacturer, Team, User } from "../../types";

interface ProductBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "createdByUserId">) => Promise<void> | void;
  onEditProduct?: (productId: string, product: Partial<Omit<Product, "id" | "createdAt" | "createdByUserId">>) => Promise<void> | void;
  onBulkAddProducts?: (products: (Omit<Product, "id" | "createdAt" | "createdByUserId"> & { id?: string })[]) => Promise<void> | void;
  existingProducts: Product[];
  categories?: ProductCategory[];
  groups?: ProductGroup[];
  manufacturers?: Manufacturer[];
  teams?: Team[];
  activeUserId: string;
  activeUserName?: string;
  onAddCategory?: (data: Omit<ProductCategory, "id" | "createdAt">) => void;
  onAddGroup?: (data: Omit<ProductGroup, "id" | "createdAt">) => void;
  onAddManufacturer?: (data: Omit<Manufacturer, "id" | "createdAt">) => void;
}

export interface ParsedProductRow {
  rowIndex: number;
  id?: string;
  name: string;
  category: string;
  group: string;
  manufacturer: string;
  hsnCode: string;
  teamName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  existingProductId?: string;
  duplicateReason?: string;
}

// Clean string
function cleanStr(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
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

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((hdr, idx) => {
      obj[hdr] = values[idx] || "";
    });
    // Also keep raw original line indexed
    records.push(obj);
  }

  return records;
}

// Fuzzy header matcher
function findHeaderVal(row: Record<string, string>, possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (row[cleanKey] !== undefined && row[cleanKey] !== "") {
      return row[cleanKey].trim();
    }
  }
  // Try partial match
  const rowKeys = Object.keys(row);
  for (const key of possibleKeys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const found = rowKeys.find((k) => k.includes(cleanKey) || cleanKey.includes(k));
    if (found && row[found] !== undefined && row[found] !== "") {
      return row[found].trim();
    }
  }
  return "";
}

export default function ProductBulkImportModal({
  isOpen,
  onClose,
  onAddProduct,
  onEditProduct,
  onBulkAddProducts,
  existingProducts = [],
  categories = [],
  groups = [],
  manufacturers = [],
  teams = [],
  activeUserId,
  activeUserName = "Active User",
  onAddCategory,
  onAddGroup,
  onAddManufacturer,
}: ProductBulkImportModalProps) {
  const [importMode, setImportMode] = useState<"paste" | "file" | "sheet_url">("paste");
  const [pastedText, setPastedText] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [fileName, setFileName] = useState("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "overwrite" | "create_new">("overwrite");
  const [autoCreateDropdowns, setAutoCreateDropdowns] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "valid" | "errors" | "duplicates">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize helper for product name
  const normalizeProductName = (name: string) =>
    name ? name.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";

  // Map of existing products by normalized name
  const existingMap = useMemo(() => {
    const map = new Map<string, Product>();
    existingProducts.forEach((p) => {
      if (p.name) {
        map.set(normalizeProductName(p.name), p);
      }
    });
    return map;
  }, [existingProducts]);

  // Parse raw text into structured rows
  const parsedRows: ParsedProductRow[] = useMemo(() => {
    let rawRecords: Record<string, string>[] = [];

    if (importMode === "paste" && pastedText.trim()) {
      rawRecords = parseCSVOrTSVText(pastedText);
    } else if (importMode === "file" && pastedText.trim()) {
      rawRecords = parseCSVOrTSVText(pastedText);
    }

    if (!rawRecords || rawRecords.length === 0) return [];

    const categoryNames = new Set(categories.map((c) => c.name.toLowerCase().trim()));
    const groupNames = new Set(groups.map((g) => g.name.toLowerCase().trim()));
    const manufacturerNames = new Set(manufacturers.map((m) => m.name.toLowerCase().trim()));
    const teamNames = new Set(teams.map((t) => t.name.toLowerCase().trim()));

    return rawRecords.map((rec, idx) => {
      const rowIndex = idx + 1;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Extract values with flexible aliases
      const name = findHeaderVal(rec, [
        "productname", "product_name", "product", "itemname", "item_name", "item", "description", "title", "name"
      ]);

      const category = findHeaderVal(rec, [
        "category", "productcategory", "product_category", "cat", "itemcategory", "type"
      ]);

      const group = findHeaderVal(rec, [
        "group", "productgroup", "product_group", "grp", "subcategory", "sub_group", "family"
      ]);

      const manufacturer = findHeaderVal(rec, [
        "manufacturer", "mfg", "make", "brand", "vendor", "company", "oem"
      ]);

      const hsnCode = findHeaderVal(rec, [
        "hsncode", "hsn_code", "hsn", "tariffcode", "tariff_code", "sac", "saccode", "hsn_sac"
      ]);

      const teamName = findHeaderVal(rec, [
        "team", "teamname", "team_name", "authorizedteam", "authorized_team", "department", "division", "access"
      ]);

      // Validation
      if (!name) {
        errors.push("Product Name is required.");
      }

      if (!category) {
        errors.push("Category is required.");
      } else if (!categoryNames.has(category.toLowerCase().trim())) {
        warnings.push(`Category "${category}" is new (will be auto-created if enabled).`);
      }

      if (!group) {
        errors.push("Product Group is required.");
      } else if (!groupNames.has(group.toLowerCase().trim())) {
        warnings.push(`Product Group "${group}" is new (will be auto-created if enabled).`);
      }

      if (!manufacturer) {
        errors.push("Manufacturer is required.");
      } else if (!manufacturerNames.has(manufacturer.toLowerCase().trim())) {
        warnings.push(`Manufacturer "${manufacturer}" is new (will be auto-created if enabled).`);
      }

      if (teamName && !teamNames.has(teamName.toLowerCase().trim())) {
        warnings.push(`Team "${teamName}" is not registered in teams list.`);
      }

      // Check duplicate
      const norm = normalizeProductName(name);
      const existing = norm ? existingMap.get(norm) : undefined;
      const isDuplicate = !!existing;

      return {
        rowIndex,
        name,
        category,
        group,
        manufacturer,
        hsnCode,
        teamName,
        isValid: errors.length === 0,
        errors,
        warnings,
        isDuplicate,
        existingProductId: existing?.id,
        duplicateReason: isDuplicate ? `Matches existing product: "${existing?.name}" (ID: ${existing?.id})` : undefined,
      };
    });
  }, [pastedText, importMode, existingMap, categories, groups, manufacturers, teams]);

  // Statistics
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
    const duplicates = parsedRows.filter((r) => r.isValid && r.isDuplicate).length;
    const errors = parsedRows.filter((r) => !r.isValid).length;
    return { total, valid, duplicates, errors };
  }, [parsedRows]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      // Status filter
      if (statusFilter === "valid" && (!r.isValid || r.isDuplicate)) return false;
      if (statusFilter === "duplicates" && !r.isDuplicate) return false;
      if (statusFilter === "errors" && r.isValid) return false;

      // Search filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.group.toLowerCase().includes(q) ||
          r.manufacturer.toLowerCase().includes(q) ||
          r.hsnCode.toLowerCase().includes(q) ||
          r.teamName.toLowerCase().includes(q) ||
          r.errors.some((e) => e.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [parsedRows, statusFilter, searchFilter]);

  // Sample CSV template content
  const sampleCsvContent = useMemo(() => {
    return [
      `Product Name,Category,Product Group,Manufacturer,HSN Code,Authorized Team`,
      `Industrial Polyethylene Resin 5502,Polymers,High Density,Apex Petrochem,3901.20.00,Enterprise Sales`,
      `Linear Alkyl Benzene (LAB),Chemicals,Surfactants,Reliance Industries,3817.00.11,SME West Coast`,
      `Titanium Dioxide R-902,Pigments,Inorganic,Chemours,3206.11.10,Executive`,
      `Monoethylene Glycol (MEG),Chemicals,Glycols,SABIC,2905.31.00,Enterprise Sales`,
      `Cloud Infrastructure Suite,Cloud Services,Infrastructure,Apex Systems,8471.30.10,Executive`
    ].join("\n");
  }, []);

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product_catalog_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySampleData = () => {
    navigator.clipboard.writeText(sampleCsvContent).then(() => {
      setPastedText(sampleCsvContent);
      setImportMode("paste");
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setPastedText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleFetchSheetUrl = async () => {
    if (!sheetUrl.trim()) {
      setUrlError("Please enter a valid Google Sheets published CSV URL.");
      return;
    }
    setUrlError("");
    setIsFetchingUrl(true);

    try {
      let fetchUrl = sheetUrl.trim();
      // If full Google Sheets view URL, convert to CSV export if possible
      if (fetchUrl.includes("docs.google.com/spreadsheets/d/")) {
        const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const docId = match[1];
          // Check if gid is specified
          const gidMatch = fetchUrl.match(/gid=([0-9]+)/);
          const gid = gidMatch ? gidMatch[1] : "0";
          fetchUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
        }
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch spreadsheet (${res.status} ${res.statusText}). Make sure the sheet is published or shared as 'Anyone with the link can view'.`);
      }
      const text = await res.text();
      if (!text || text.trim().length < 5) {
        throw new Error("Received empty or invalid data from URL.");
      }
      setPastedText(text);
      setImportMode("file");
      setFileName("Google Sheets Data");
    } catch (err: any) {
      console.error(err);
      setUrlError(err?.message || "Failed to load CSV from Google Sheets URL. Try copying and pasting the data directly.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    const rowsToProcess = parsedRows.filter((r) => {
      if (!r.isValid) return false;
      if (r.isDuplicate && duplicateStrategy === "skip") return false;
      return true;
    });

    if (rowsToProcess.length === 0) {
      alert("No valid rows to import based on your current settings.");
      return;
    }

    setIsProcessing(true);
    setImportProgress({ current: 0, total: rowsToProcess.length });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = parsedRows.length - rowsToProcess.length;
    let errorCount = stats.errors;

    // Track newly added categories, groups, and manufacturers in this session to prevent duplicate creation
    const knownCategories = new Set(categories.map((c) => c.name.toLowerCase().trim()));
    const knownGroups = new Set(groups.map((g) => g.name.toLowerCase().trim()));
    const knownManufacturers = new Set(manufacturers.map((m) => m.name.toLowerCase().trim()));

    try {
      // 1. Auto-create missing dropdowns if enabled
      if (autoCreateDropdowns) {
        for (const row of rowsToProcess) {
          if (row.category && !knownCategories.has(row.category.toLowerCase().trim()) && onAddCategory) {
            onAddCategory({ name: row.category });
            knownCategories.add(row.category.toLowerCase().trim());
          }
          if (row.group && !knownGroups.has(row.group.toLowerCase().trim()) && onAddGroup) {
            onAddGroup({ name: row.group });
            knownGroups.add(row.group.toLowerCase().trim());
          }
          if (row.manufacturer && !knownManufacturers.has(row.manufacturer.toLowerCase().trim()) && onAddManufacturer) {
            onAddManufacturer({ name: row.manufacturer });
            knownManufacturers.add(row.manufacturer.toLowerCase().trim());
          }
        }
      }

      // 2. Process products
      if (onBulkAddProducts && duplicateStrategy !== "overwrite") {
        // High-speed batch insert
        const newProducts = rowsToProcess.map((r, i) => ({
          id: `prod-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          name: r.name,
          category: r.category,
          group: r.group,
          manufacturer: r.manufacturer,
          hsnCode: r.hsnCode || undefined,
          teamName: r.teamName || undefined,
        }));
        await onBulkAddProducts(newProducts);
        createdCount = newProducts.length;
      } else {
        // Individual sequential handling with duplicate strategy
        for (let i = 0; i < rowsToProcess.length; i++) {
          const r = rowsToProcess[i];
          setImportProgress({ current: i + 1, total: rowsToProcess.length });

          if (r.isDuplicate && duplicateStrategy === "overwrite" && r.existingProductId && onEditProduct) {
            await onEditProduct(r.existingProductId, {
              name: r.name,
              category: r.category,
              group: r.group,
              manufacturer: r.manufacturer,
              hsnCode: r.hsnCode || undefined,
              teamName: r.teamName || undefined,
            });
            updatedCount++;
          } else {
            await onAddProduct({
              name: r.name,
              category: r.category,
              group: r.group,
              manufacturer: r.manufacturer,
              hsnCode: r.hsnCode || undefined,
              teamName: r.teamName || undefined,
            });
            createdCount++;
          }
        }
      }

      setImportResult({
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
      });
    } catch (err) {
      console.error("Bulk product import error:", err);
      alert("An error occurred during import. Please check logs.");
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  const handleReset = () => {
    setPastedText("");
    setFileName("");
    setSheetUrl("");
    setImportResult(null);
    setSearchFilter("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/60 text-emerald-400 rounded-xl border border-emerald-700/50">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Bulk Import Product Catalog
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full">
                  HSN Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Import multiple products via CSV, TSV, Google Sheets, or Copy-Paste with automated field mapping & HSN support.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-emerald-900/50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Banner */}
        {importResult && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">Bulk Import Completed Successfully!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Created <strong>{importResult.created}</strong> new products, updated <strong>{importResult.updated}</strong> existing products
                  {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicate/invalid rows`}.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="text-xs font-bold px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg cursor-pointer transition-all"
              >
                Import More
              </button>
              <button
                onClick={onClose}
                className="text-xs font-bold px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer transition-all shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Top Actions: Template Download and Copy Sample */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800">CSV & Sheets Template Guide</span>
                <p className="text-[11px] text-slate-500">
                  Headers supported: <code className="text-emerald-700 font-mono font-semibold">Product Name</code>, <code className="text-emerald-700 font-mono font-semibold">Category</code>, <code className="text-emerald-700 font-mono font-semibold">Product Group</code>, <code className="text-emerald-700 font-mono font-semibold">Manufacturer</code>, <code className="text-emerald-700 font-mono font-semibold">HSN Code</code>, <code className="text-emerald-700 font-mono font-semibold">Authorized Team</code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={handleCopySampleData}
                className="flex-1 sm:flex-none text-xs font-bold font-mono px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition-all"
              >
                <Copy size={13} /> Load Sample
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="flex-1 sm:flex-none text-xs font-bold font-mono px-3 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition-all"
              >
                <Download size={13} /> Download Template
              </button>
            </div>
          </div>

          {/* Import Modes Tabs */}
          <div className="flex border-b border-slate-200 gap-2 pb-1 text-xs font-bold">
            <button
              onClick={() => setImportMode("paste")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                importMode === "paste"
                  ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Copy size={14} /> Paste from Google Sheets / Excel
            </button>
            <button
              onClick={() => setImportMode("file")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                importMode === "file"
                  ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Upload size={14} /> Upload CSV / TSV File
            </button>
            <button
              onClick={() => setImportMode("sheet_url")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                importMode === "sheet_url"
                  ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <ExternalLink size={14} /> Google Sheets URL
            </button>
          </div>

          {/* Mode 1: Paste Text */}
          {importMode === "paste" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Paste Table Data (with header row):</span>
                {pastedText && (
                  <button
                    onClick={() => setPastedText("")}
                    className="text-[11px] font-mono text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Text
                  </button>
                )}
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Product Name\tCategory\tProduct Group\tManufacturer\tHSN Code\tAuthorized Team\nIndustrial Polymer Resin\tPolymers\tHigh Density\tApex Petrochem\t3901.20.00\tEnterprise Sales`}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 placeholder-slate-400 resize-y"
              />
            </div>
          )}

          {/* Mode 2: File Upload */}
          {importMode === "file" && (
            <div className="flex flex-col gap-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-white rounded-full border border-slate-200 shadow-xs text-emerald-600">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {fileName ? `Selected: ${fileName}` : "Click to select or drag and drop CSV / TSV file"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports .csv, .tsv, and exported Excel text files</p>
                </div>
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

          {/* Mode 3: Google Sheets URL */}
          {importMode === "sheet_url" && (
            <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700">
                Google Sheets Public Link or CSV Export URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                  className="flex-1 text-xs border border-slate-300 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                />
                <button
                  onClick={handleFetchSheetUrl}
                  disabled={isFetchingUrl}
                  className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                >
                  {isFetchingUrl ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  Fetch Data
                </button>
              </div>
              {urlError && (
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle size={14} /> {urlError}
                </p>
              )}
            </div>
          )}

          {/* Import Settings & Strategy Bar */}
          {parsedRows.length > 0 && (
            <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Duplicate Strategy */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 font-mono uppercase text-[10px]">
                    If Product Exists:
                  </span>
                  <select
                    value={duplicateStrategy}
                    onChange={(e: any) => setDuplicateStrategy(e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="overwrite">Overwrite & Update Details</option>
                    <option value="skip">Skip Existing</option>
                    <option value="create_new">Create as New Variant</option>
                  </select>
                </div>

                {/* Auto Create Dropdowns Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={autoCreateDropdowns}
                    onChange={(e) => setAutoCreateDropdowns(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Auto-add new Categories, Groups & Manufacturers</span>
                </label>
              </div>

              {/* Stats overview tags */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700">
                  Total: <strong>{stats.total}</strong>
                </span>
                <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-emerald-700">
                  Valid: <strong>{stats.valid}</strong>
                </span>
                {stats.duplicates > 0 && (
                  <span className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-bold text-amber-700">
                    Duplicates: <strong>{stats.duplicates}</strong>
                  </span>
                )}
                {stats.errors > 0 && (
                  <span className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-bold text-rose-700">
                    Errors: <strong>{stats.errors}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Preview Table & Filtering */}
          {parsedRows.length > 0 && (
            <div className="flex flex-col gap-2.5 flex-1 min-h-[220px]">
              {/* Table search & filter pills */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                      statusFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    onClick={() => setStatusFilter("valid")}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                      statusFilter === "valid" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    Valid Only ({stats.valid})
                  </button>
                  {stats.duplicates > 0 && (
                    <button
                      onClick={() => setStatusFilter("duplicates")}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                        statusFilter === "duplicates" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      Duplicates ({stats.duplicates})
                    </button>
                  )}
                  {stats.errors > 0 && (
                    <button
                      onClick={() => setStatusFilter("errors")}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                        statusFilter === "errors" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      Errors ({stats.errors})
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter preview rows..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-[260px] scrollbar-thin bg-white shadow-3xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] uppercase font-bold font-mono text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">HSN Code</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Product Group</th>
                      <th className="py-2 px-3">Manufacturer</th>
                      <th className="py-2 px-3">Team Access</th>
                      <th className="py-2 px-3">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-mono text-xs">
                          No matching preview rows found.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !row.isValid
                              ? "bg-rose-50/40"
                              : row.isDuplicate
                              ? "bg-amber-50/30"
                              : ""
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{row.rowIndex}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {!row.isValid ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <AlertCircle size={10} /> Error
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <AlertTriangle size={10} /> Duplicate
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle size={10} /> Ready
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {row.name || <span className="text-rose-500 italic">Missing</span>}
                          </td>
                          <td className="py-2 px-3">
                            {row.hsnCode ? (
                              <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {row.hsnCode}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded">
                              {row.category || <span className="text-rose-500 italic">Missing</span>}
                            </span>
                          </td>
                          <td className="py-2 px-3">{row.group || <span className="text-rose-500 italic">Missing</span>}</td>
                          <td className="py-2 px-3">{row.manufacturer || <span className="text-rose-500 italic">Missing</span>}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                            {row.teamName || "Unassigned"}
                          </td>
                          <td className="py-2 px-3 text-[11px]">
                            {row.errors.length > 0 && (
                              <div className="text-rose-600 font-semibold">{row.errors.join(", ")}</div>
                            )}
                            {row.warnings.length > 0 && (
                              <div className="text-amber-600">{row.warnings.join(", ")}</div>
                            )}
                            {row.duplicateReason && (
                              <div className="text-amber-700 text-[10px] font-mono">{row.duplicateReason}</div>
                            )}
                            {row.isValid && row.errors.length === 0 && row.warnings.length === 0 && !row.isDuplicate && (
                              <span className="text-emerald-600 text-[10px] font-mono">All fields valid</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            {parsedRows.length > 0 ? (
              <span>
                Ready to process <strong>{parsedRows.filter((r) => r.isValid && (!r.isDuplicate || duplicateStrategy !== "skip")).length}</strong> records
              </span>
            ) : (
              <span>Paste or upload product data to preview</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing || parsedRows.length === 0 || stats.valid + stats.duplicates === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Importing {importProgress ? `(${importProgress.current}/${importProgress.total})` : "..."}
                </>
              ) : (
                <>
                  <Package size={15} />
                  Import {stats.valid + (duplicateStrategy !== "skip" ? stats.duplicates : 0)} Products
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
