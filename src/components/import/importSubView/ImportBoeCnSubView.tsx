/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ImportContainerRecord,
  ImportBoeRecord,
  ImportPiRecord,
  User,
  AolBranchName,
  SupplierName,
  Product,
  Role
} from "../../../types";
import {
  Search,
  Filter,
  Download,
  Layers,
  Box,
  Ship,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Building2,
  Clock,
  ArrowUpDown,
  Edit,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../Configuration/AppsScriptSyncBanner";

export interface ImportBoeCnSubViewProps {
  activeUserId: string;
  users: User[];
  importContainers: ImportContainerRecord[];
  importBoes?: ImportBoeRecord[];
  importPis?: ImportPiRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  onUpdateImportContainer?: (record: ImportContainerRecord) => void;
  onUpdateImportBoe?: (record: ImportBoeRecord) => void;
  canEdit?: boolean;
}

type ColumnPreset = "all" | "overview" | "movement" | "boe";

export default function ImportBoeCnSubView({
  activeUserId,
  users,
  importContainers = [],
  importBoes = [],
  importPis = [],
  aolBranches = [],
  suppliers = [],
  products = [],
  onUpdateImportContainer,
  onUpdateImportBoe,
  canEdit = true
}: ImportBoeCnSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.role === ("Admin" as Role);
  const isEditable = isAdmin || canEdit !== false;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [columnPreset, setColumnPreset] = useState<ColumnPreset>("all");
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>("containerNo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Detailed Dossier Modal
  const [selectedRow, setSelectedRow] = useState<{
    container: ImportContainerRecord;
    boe?: ImportBoeRecord;
    supplierName: string;
  } | null>(null);

  // Quick Edit Modal
  const [editingContainer, setEditingContainer] = useState<ImportContainerRecord | null>(null);

  // Normalization helper
  const cleanStr = (val?: string) => (val || "").trim().toUpperCase();

  // Google Sheets Apps Script Integration
  const {
    config: appsScriptConfig,
    syncStatus,
    setSyncStatus,
    triggerSync
  } = useAppsScriptSync("import_boe_cn_config", "Import BOE_CN", "import_containers");

  // Fast lookup maps for BOE records
  const boeMaps = useMemo(() => {
    const byBeNo = new Map<string, ImportBoeRecord>();
    const byInvoice = new Map<string, ImportBoeRecord>();
    const byPiNo = new Map<string, ImportBoeRecord>();

    importBoes.forEach((b) => {
      if (b.beNo) byBeNo.set(cleanStr(b.beNo), b);
      if (b.invoiceNumber) byInvoice.set(cleanStr(b.invoiceNumber), b);
      if (b.piNo) byPiNo.set(cleanStr(b.piNo), b);
    });

    return { byBeNo, byInvoice, byPiNo };
  }, [importBoes]);

  // Fast lookup map for PI records (to resolve supplier name if not present on BOE)
  const piMap = useMemo(() => {
    const map = new Map<string, ImportPiRecord>();
    importPis.forEach((p) => {
      if (p.piNo) map.set(cleanStr(p.piNo), p);
    });
    return map;
  }, [importPis]);

  // Combined Rows: 1 row per Container with all Container + IGM + BOE fields
  const combinedRows = useMemo(() => {
    return importContainers.map((cn) => {
      // 1. Locate related BOE
      const cleanBeNo = cleanStr(cn.beNo);
      const cleanInv = cleanStr(cn.invoiceNumber);
      const cleanPi = cleanStr(cn.piNo);

      let matchedBoe: ImportBoeRecord | undefined = undefined;
      if (cleanBeNo && boeMaps.byBeNo.has(cleanBeNo)) {
        matchedBoe = boeMaps.byBeNo.get(cleanBeNo);
      } else if (cleanInv && boeMaps.byInvoice.has(cleanInv)) {
        matchedBoe = boeMaps.byInvoice.get(cleanInv);
      } else if (cleanPi && boeMaps.byPiNo.has(cleanPi)) {
        matchedBoe = boeMaps.byPiNo.get(cleanPi);
      }

      // 2. Resolve Supplier Name
      let supplierName = matchedBoe?.supplierName || "";
      if (!supplierName && cleanPi && piMap.has(cleanPi)) {
        supplierName = piMap.get(cleanPi)?.supplierName || "";
      }

      // 3. Fallback branch, product, invoice from BOE if container lacks them
      const aolBranchName = cn.aolBranchName || matchedBoe?.aolBranchName || "";
      const beNo = cn.beNo || matchedBoe?.beNo || "";
      const invoiceNumber = cn.invoiceNumber || matchedBoe?.invoiceNumber || "";
      const productName = cn.productName || matchedBoe?.productName || "";
      const piNo = cn.piNo || matchedBoe?.piNo || "";

      return {
        container: cn,
        boe: matchedBoe,
        // Computed/Unified keys for filtering & sorting
        id: cn.id,
        containerNo: cn.containerNo || "",
        aolBranchName,
        beNo,
        invoiceNumber,
        productName,
        piNo,
        supplierName,
        containerWiseQty: Number(cn.containerWiseQty) || 0,
        sizeOfContainer: cn.sizeOfContainer || "",
        entryDate: cn.entryDate || "",
        remark: cn.remark || "",
        // Extended IGM
        igmContainerGatedIn: cn.igmContainerGatedIn || "",
        igmFinalInwardDate: cn.igmFinalInwardDate || "",
        igmNoDt: cn.igmNoDt || "",
        igmItemNo: cn.igmItemNo || "",
        igmChaSelfJobNo: cn.igmChaSelfJobNo || "",
        igmCfsLastDate: cn.igmCfsLastDate || "",
        igmMaterialMovedOutOfCfs: cn.igmMaterialMovedOutOfCfs || "",
        igmFreeEmptyCtnrDetentionLastDt: cn.igmFreeEmptyCtnrDetentionLastDt || "",
        igmStatusRemark: cn.igmStatusRemark || "",
        igmDuty: Boolean(cn.igmDuty),
        igmShpLine: Boolean(cn.igmShpLine),
        igmStampDuty: Boolean(cn.igmStampDuty),
        igmDo: Boolean(cn.igmDo),
        igmCfs: Boolean(cn.igmCfs),
        igmOocStatus: Boolean(cn.igmOocStatus),
        // BOE specific
        beDate: matchedBoe?.beDate || "",
        invoiceDate: matchedBoe?.invoiceDate || "",
        mfg: matchedBoe?.mfg || "",
        port: matchedBoe?.port || "",
        portOfLoading: matchedBoe?.portOfLoading || "",
        billOfLadingNo: matchedBoe?.billOfLadingNo || "",
        billOfLadingDate: matchedBoe?.billOfLadingDate || "",
        fobCif: matchedBoe?.fobCif || "",
        usdPmt: matchedBoe?.usdPmt !== undefined ? Number(matchedBoe.usdPmt) : undefined,
        purchaseQty: matchedBoe?.purchaseQty !== undefined ? Number(matchedBoe.purchaseQty) : undefined,
        totalUsd: matchedBoe?.totalUsd !== undefined ? Number(matchedBoe.totalUsd) : undefined,
        boeExRate: matchedBoe?.boeExRate !== undefined ? Number(matchedBoe.boeExRate) : undefined,
        freightUsd: matchedBoe?.freightUsd !== undefined ? Number(matchedBoe.freightUsd) : undefined,
        insuranceUsd: matchedBoe?.insuranceUsd !== undefined ? Number(matchedBoe.insuranceUsd) : undefined,
        lotBatchNumber: matchedBoe?.lotBatchNumber || "",
        beQuery: matchedBoe?.beQuery || "",
        beStatus: matchedBoe?.beStatus || "",
        deferredDuty: matchedBoe?.deferredDuty || "",
        deferredDutyAmt: matchedBoe?.deferredDutyAmt || "",
        paymentDueDate: matchedBoe?.paymentDueDate || "",
        stampDutyAmount: matchedBoe?.stampDutyAmount || "",
        stampDutyDate: matchedBoe?.stampDutyDate || "",
        statusRemark: matchedBoe?.statusRemark || ""
      };
    });
  }, [importContainers, boeMaps, piMap]);

  // Filtered & Searched Rows
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return combinedRows.filter((row) => {
      // 1. Branch Filter
      if (selectedBranch !== "All Branches") {
        if ((row.aolBranchName || "").toLowerCase() !== selectedBranch.toLowerCase()) {
          return false;
        }
      }

      // 2. Search by: product name, container number, pi no, BE no, invoice no, supplier name
      if (q) {
        const matchProduct = row.productName.toLowerCase().includes(q);
        const matchContainer = row.containerNo.toLowerCase().includes(q);
        const matchPi = row.piNo.toLowerCase().includes(q);
        const matchBe = row.beNo.toLowerCase().includes(q);
        const matchInvoice = row.invoiceNumber.toLowerCase().includes(q);
        const matchSupplier = row.supplierName.toLowerCase().includes(q);

        if (!matchProduct && !matchContainer && !matchPi && !matchBe && !matchInvoice && !matchSupplier) {
          return false;
        }
      }

      return true;
    });
  }, [combinedRows, selectedBranch, searchTerm]);

  // Sorted Rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortDirection]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalContainers = filteredRows.length;
    const totalQty = filteredRows.reduce((acc, r) => acc + (r.containerWiseQty || 0), 0);
    const gatedInCount = filteredRows.filter((r) => Boolean(r.igmContainerGatedIn)).length;
    const oocCount = filteredRows.filter((r) => r.igmOocStatus).length;
    const uniqueBoes = new Set(filteredRows.map((r) => cleanStr(r.beNo)).filter(Boolean)).size;

    return { totalContainers, totalQty, gatedInCount, oocCount, uniqueBoes };
  }, [filteredRows]);

  // Branch Options
  const branchOptions = useMemo(() => {
    const fromList = (aolBranches || []).map((b) => b.name).filter(Boolean);
    const fromData = combinedRows.map((r) => r.aolBranchName).filter(Boolean);
    return ["All Branches", ...Array.from(new Set([...fromList, ...fromData]))];
  }, [aolBranches, combinedRows]);

  // Toggle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // CSV Export with ALL 40+ fields
  const handleExportCsv = () => {
    const headers = [
      "Container No",
      "AOL Branch Name",
      "BE NO",
      "BE Date",
      "Invoice Number",
      "Invoice Date",
      "Product Name",
      "PI NO",
      "Supplier Name",
      "Size of Container",
      "Container Wise Qty (MT)",
      "Container Entry Date",
      "Container Remark",
      // Extended IGM
      "Container Gated In",
      "Final Inward Date",
      "IGM No & Dt",
      "IGM Item No",
      "CHA / Self Job No",
      "CFS Last Date",
      "Material Moved Out Of CFS",
      "Free Empty Ctnr Detention Last Dt",
      "IGM Status Remark",
      "Duty Checkpoint",
      "Shipping Line Checkpoint",
      "Stamp Duty Checkpoint",
      "DO Checkpoint",
      "CFS Checkpoint",
      "OOC Status Checkpoint",
      // BOE Commercials
      "Manufacturer (MFG)",
      "Discharge Port",
      "Port of Loading",
      "Bill of Lading No",
      "Bill of Lading Date",
      "IncoTerm (FOB/CIF)",
      "USD PMT",
      "BOE Total Purchase Qty",
      "BOE Total USD",
      "BOE Ex Rate",
      "Freight USD",
      "Insurance USD",
      "Lot / Batch No",
      "BE Query",
      "BE Status",
      "Deferred Duty",
      "Deferred Duty Amt",
      "Payment Due Date",
      "Stamp Duty Amount",
      "Stamp Duty Date",
      "BOE Status Remark",
      "Container ID"
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedRows.map((r) => [
      escapeCsv(r.containerNo),
      escapeCsv(r.aolBranchName),
      escapeCsv(r.beNo),
      escapeCsv(r.beDate),
      escapeCsv(r.invoiceNumber),
      escapeCsv(r.invoiceDate),
      escapeCsv(r.productName),
      escapeCsv(r.piNo),
      escapeCsv(r.supplierName),
      escapeCsv(r.sizeOfContainer),
      escapeCsv(r.containerWiseQty || ""),
      escapeCsv(r.entryDate),
      escapeCsv(r.remark),
      // IGM
      escapeCsv(r.igmContainerGatedIn),
      escapeCsv(r.igmFinalInwardDate),
      escapeCsv(r.igmNoDt),
      escapeCsv(r.igmItemNo),
      escapeCsv(r.igmChaSelfJobNo),
      escapeCsv(r.igmCfsLastDate),
      escapeCsv(r.igmMaterialMovedOutOfCfs),
      escapeCsv(r.igmFreeEmptyCtnrDetentionLastDt),
      escapeCsv(r.igmStatusRemark),
      escapeCsv(r.igmDuty ? "Yes" : "No"),
      escapeCsv(r.igmShpLine ? "Yes" : "No"),
      escapeCsv(r.igmStampDuty ? "Yes" : "No"),
      escapeCsv(r.igmDo ? "Yes" : "No"),
      escapeCsv(r.igmCfs ? "Yes" : "No"),
      escapeCsv(r.igmOocStatus ? "Yes" : "No"),
      // BOE
      escapeCsv(r.mfg),
      escapeCsv(r.port),
      escapeCsv(r.portOfLoading),
      escapeCsv(r.billOfLadingNo),
      escapeCsv(r.billOfLadingDate),
      escapeCsv(r.fobCif),
      escapeCsv(r.usdPmt !== undefined ? r.usdPmt : ""),
      escapeCsv(r.purchaseQty !== undefined ? r.purchaseQty : ""),
      escapeCsv(r.totalUsd !== undefined ? r.totalUsd : ""),
      escapeCsv(r.boeExRate !== undefined ? r.boeExRate : ""),
      escapeCsv(r.freightUsd !== undefined ? r.freightUsd : ""),
      escapeCsv(r.insuranceUsd !== undefined ? r.insuranceUsd : ""),
      escapeCsv(r.lotBatchNumber),
      escapeCsv(r.beQuery),
      escapeCsv(r.beStatus),
      escapeCsv(r.deferredDuty),
      escapeCsv(r.deferredDutyAmt),
      escapeCsv(r.paymentDueDate),
      escapeCsv(r.stampDutyAmount),
      escapeCsv(r.stampDutyDate),
      escapeCsv(r.statusRemark),
      escapeCsv(r.id)
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `BOE_CN_Master_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick save for editing container
  const handleSaveContainerEdit = () => {
    if (!editingContainer || !onUpdateImportContainer) return;
    onUpdateImportContainer(editingContainer);
    setEditingContainer(null);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* GOOGLE SHEETS APPS SCRIPT SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_boe_cn_config"
        defaultSheetName="Import BOE_CN"
        collectionKey="import_containers"
        records={importContainers}
        activeUser={activeUser}
        moduleTitle="BOE_CN (Unified Container, IGM & BOE)"
        config={appsScriptConfig}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            if (onUpdateImportContainer) {
              const existing = importContainers.find((c) => c.containerNo === rec.containerNo || c.id === rec.id);
              if (existing) {
                onUpdateImportContainer({ ...existing, ...rec });
              }
            }
          });
        }}
      />

      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  BOE_CN
                </h1>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  1 Row / Container
                </span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Container + IGM + BOE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete unified table with all available fields in Container, IGM & Item, and Bill of Entry.
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Column Presets */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold border border-slate-200">
              <button
                type="button"
                onClick={() => setColumnPreset("all")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  columnPreset === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Fields
              </button>
              <button
                type="button"
                onClick={() => setColumnPreset("overview")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  columnPreset === "overview"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setColumnPreset("movement")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  columnPreset === "movement"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Movement & IGM
              </button>
              <button
                type="button"
                onClick={() => setColumnPreset("boe")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  columnPreset === "boe"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                BOE Commercials
              </button>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Download all combined container and BOE data as CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 pt-1">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">
              Total Containers
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                {metrics.totalContainers}
              </span>
              <span className="text-[10px] text-slate-400">
                of {combinedRows.length} total
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5">
            <span className="text-[10px] font-bold font-mono text-emerald-800 uppercase block">
              Container Qty (MT)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-900 font-mono">
                {metrics.totalQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 font-mono">MT</span>
            </div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200/80 rounded-lg p-2.5">
            <span className="text-[10px] font-bold font-mono text-purple-800 uppercase block">
              Gated In
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-purple-900 font-mono">
                {metrics.gatedInCount}
              </span>
              <span className="text-[10px] font-bold text-purple-700">
                ({metrics.totalContainers ? Math.round((metrics.gatedInCount / metrics.totalContainers) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5">
            <span className="text-[10px] font-bold font-mono text-blue-800 uppercase block">
              Customs OOC Cleared
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-blue-900 font-mono">
                {metrics.oocCount}
              </span>
              <span className="text-[10px] font-bold text-blue-700">
                ({metrics.totalContainers ? Math.round((metrics.oocCount / metrics.totalContainers) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5">
            <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block">
              Linked BOEs
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-amber-900 font-mono">
                {metrics.uniqueBoes}
              </span>
              <span className="text-[10px] text-amber-700">Unique Bills of Entry</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mt-3 pt-3 border-t border-slate-100">
          {/* Branch Filter */}
          <div className="flex items-center gap-2 sm:w-64 shrink-0">
            <div className="relative w-full">
              <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs font-semibold pl-8 pr-7 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer text-slate-800 transition"
              >
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b === "All Branches" ? "🏢 All Branches" : `Branch: ${b}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Search Bar matching Product, Container, PI, BE, Invoice, Supplier */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Product, Container No, PI No, BE No, Invoice No, Supplier Name..."
              className="w-full text-xs font-medium pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reset button if filter is applied */}
          {(selectedBranch !== "All Branches" || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBranch("All Branches");
                setSearchTerm("");
              }}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Master Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {sortedRows.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Box size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Containers Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm || selectedBranch !== "All Branches"
                ? "No container records match your current branch or search criteria. Try clearing the filter."
                : "No containers are currently registered in the system. Add containers via the Containers tab or Bulk Import."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] scrollbar-thin">
            <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
              {/* Categorized Super Headers */}
              <thead className="bg-slate-900 text-white font-mono uppercase text-[9px] tracking-wider sticky top-0 z-20">
                <tr>
                  <th colSpan={3} className="px-3 py-1.5 bg-slate-950 border-r border-slate-800 text-emerald-400 font-extrabold">
                    Container & Identification
                  </th>
                  <th colSpan={4} className="px-3 py-1.5 bg-emerald-950/80 border-r border-emerald-900 text-emerald-300 font-extrabold">
                    Container Core Specs
                  </th>
                  {(columnPreset === "all" || columnPreset === "movement") && (
                    <>
                      <th colSpan={9} className="px-3 py-1.5 bg-purple-950 border-r border-purple-900 text-purple-300 font-extrabold">
                        Extended IGM & Movement Tracking (Gate-In, CFS, Detention)
                      </th>
                      <th colSpan={6} className="px-3 py-1.5 bg-indigo-950 border-r border-indigo-900 text-indigo-300 font-extrabold text-center">
                        Clearance Checkpoints (Duty, DO, CFS, OOC)
                      </th>
                    </>
                  )}
                  {(columnPreset === "all" || columnPreset === "overview" || columnPreset === "boe") && (
                    <th colSpan={7} className="px-3 py-1.5 bg-blue-950 border-r border-blue-900 text-blue-300 font-extrabold">
                      Bill of Entry (BOE) Core & Commercials
                    </th>
                  )}
                  {(columnPreset === "all" || columnPreset === "boe") && (
                    <>
                      <th colSpan={9} className="px-3 py-1.5 bg-slate-950 border-r border-slate-800 text-amber-300 font-extrabold">
                        Shipment & Pricing Breakdown (Rates, Freight, Ex-Rate)
                      </th>
                      <th colSpan={7} className="px-3 py-1.5 bg-rose-950 border-r border-rose-900 text-rose-300 font-extrabold">
                        Duty, Stamp Duty & Deferred Status
                      </th>
                    </>
                  )}
                  <th className="px-3 py-1.5 bg-slate-900 text-center text-slate-400">
                    Actions
                  </th>
                </tr>

                {/* Specific Column Header Names */}
                <tr className="bg-slate-800 text-slate-300 font-mono text-[10px] border-b border-slate-700">
                  {/* Container & ID */}
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white"
                    onClick={() => handleSort("containerNo")}
                  >
                    <div className="flex items-center gap-1 font-bold text-white">
                      <span>Container No</span>
                      <ArrowUpDown size={11} className={sortField === "containerNo" ? "text-emerald-400" : "text-slate-500"} />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white border-r border-slate-700"
                    onClick={() => handleSort("aolBranchName")}
                  >
                    <div className="flex items-center gap-1">
                      <span>AOL Branch</span>
                      <ArrowUpDown size={11} className={sortField === "aolBranchName" ? "text-emerald-400" : "text-slate-500"} />
                    </div>
                  </th>

                  {/* Container Specs */}
                  <th className="py-2.5 px-3">Size</th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                    onClick={() => handleSort("containerWiseQty")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Qty (MT)</span>
                      <ArrowUpDown size={11} className={sortField === "containerWiseQty" ? "text-emerald-400" : "text-slate-500"} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Entry Date</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Container Remark</th>

                  {/* Extended IGM & Movement Tracking */}
                  {(columnPreset === "all" || columnPreset === "movement") && (
                    <>
                      <th
                        className="py-2.5 px-3 bg-purple-900/40 text-purple-200 cursor-pointer hover:text-white font-extrabold"
                        onClick={() => handleSort("igmContainerGatedIn")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Container Gated In</span>
                          <ArrowUpDown size={11} className={sortField === "igmContainerGatedIn" ? "text-purple-300" : "text-slate-500"} />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 bg-purple-900/40">Final Inward Dt</th>
                      <th className="py-2.5 px-3 bg-purple-900/40">IGM No & Dt</th>
                      <th className="py-2.5 px-3 bg-purple-900/40">IGM Item No</th>
                      <th className="py-2.5 px-3 bg-purple-900/40">CHA / Job No</th>
                      <th className="py-2.5 px-3 bg-purple-900/40">CFS Last Dt</th>
                      <th className="py-2.5 px-3 bg-purple-900/40">Moved Out CFS</th>
                      <th className="py-2.5 px-3 bg-purple-900/40">Detention Last Dt</th>
                      <th className="py-2.5 px-3 bg-purple-900/40 border-r border-purple-900">IGM Status Remark</th>

                      {/* Checkpoints */}
                      <th className="py-2.5 px-2 text-center bg-indigo-900/40" title="Customs Duty Paid">Duty</th>
                      <th className="py-2.5 px-2 text-center bg-indigo-900/40" title="Shipping Line Paid">Shp Line</th>
                      <th className="py-2.5 px-2 text-center bg-indigo-900/40" title="Stamp Duty Paid">Stamp Duty</th>
                      <th className="py-2.5 px-2 text-center bg-indigo-900/40" title="Delivery Order Received">DO</th>
                      <th className="py-2.5 px-2 text-center bg-indigo-900/40" title="CFS Gate Pass">CFS</th>
                      <th className="py-2.5 px-2 text-center bg-indigo-900/40 border-r border-indigo-900" title="Out of Charge Granted">OOC</th>
                    </>
                  )}

                  {/* Bill of Entry (BOE) Core */}
                  {(columnPreset === "all" || columnPreset === "overview" || columnPreset === "boe") && (
                    <>
                      <th
                        className="py-2.5 px-3 bg-blue-900/40 text-blue-200 cursor-pointer hover:text-white font-bold"
                        onClick={() => handleSort("beNo")}
                      >
                        <div className="flex items-center gap-1">
                          <span>BE NO</span>
                          <ArrowUpDown size={11} className={sortField === "beNo" ? "text-blue-300" : "text-slate-500"} />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 bg-blue-900/40">BE Date</th>
                      <th className="py-2.5 px-3 bg-blue-900/40">Invoice Number</th>
                      <th className="py-2.5 px-3 bg-blue-900/40">Invoice Date</th>
                      <th
                        className="py-2.5 px-3 bg-blue-900/40 cursor-pointer hover:text-white"
                        onClick={() => handleSort("productName")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Product Name</span>
                          <ArrowUpDown size={11} className={sortField === "productName" ? "text-blue-300" : "text-slate-500"} />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 bg-blue-900/40">PI NO</th>
                      <th
                        className="py-2.5 px-3 bg-blue-900/40 border-r border-blue-900 cursor-pointer hover:text-white"
                        onClick={() => handleSort("supplierName")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Supplier Name</span>
                          <ArrowUpDown size={11} className={sortField === "supplierName" ? "text-blue-300" : "text-slate-500"} />
                        </div>
                      </th>
                    </>
                  )}

                  {/* Shipment & Commercial Breakdown */}
                  {(columnPreset === "all" || columnPreset === "boe") && (
                    <>
                      <th className="py-2.5 px-3">Manufacturer</th>
                      <th className="py-2.5 px-3">Discharge Port</th>
                      <th className="py-2.5 px-3">Port of Loading</th>
                      <th className="py-2.5 px-3">BL No & Dt</th>
                      <th className="py-2.5 px-3">IncoTerm</th>
                      <th className="py-2.5 px-3 text-right">USD PMT</th>
                      <th className="py-2.5 px-3 text-right">BOE Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Total USD</th>
                      <th className="py-2.5 px-3 text-right border-r border-slate-700">BOE Ex Rate</th>

                      {/* Duty & Status */}
                      <th className="py-2.5 px-3 bg-rose-900/30">BE Status</th>
                      <th className="py-2.5 px-3 bg-rose-900/30">Deferred Duty</th>
                      <th className="py-2.5 px-3 bg-rose-900/30">Deferred Amt</th>
                      <th className="py-2.5 px-3 bg-rose-900/30">Payment Due Date</th>
                      <th className="py-2.5 px-3 bg-rose-900/30">Stamp Duty Amt</th>
                      <th className="py-2.5 px-3 bg-rose-900/30">Stamp Duty Date</th>
                      <th className="py-2.5 px-3 bg-rose-900/30 border-r border-rose-900">BOE Remark</th>
                    </>
                  )}

                  {/* Actions Column */}
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-800">
                {sortedRows.map((row, idx) => (
                  <tr
                    key={`${row.id}-${idx}`}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[10px]">
                      {idx + 1}
                    </td>

                    {/* Container Number */}
                    <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-mono">
                          {row.containerNo}
                        </span>
                        {row.igmContainerGatedIn && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"
                            title={`Gated In: ${row.igmContainerGatedIn}`}
                          />
                        )}
                        {row.igmOocStatus && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                            title="Out Of Charge Granted"
                          />
                        )}
                      </div>
                    </td>

                    {/* AOL Branch */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <span className="font-semibold text-slate-800">
                        {row.aolBranchName || "-"}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 text-[10px]">
                      {row.sizeOfContainer || "-"}
                    </td>

                    {/* Qty MT */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                      {row.containerWiseQty
                        ? row.containerWiseQty.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })
                        : "-"}
                    </td>

                    {/* Entry Date */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[10px]">
                      {row.entryDate || "-"}
                    </td>

                    {/* Remark */}
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px] border-r border-slate-200" title={row.remark}>
                      {row.remark || "-"}
                    </td>

                    {/* Extended IGM & Movement */}
                    {(columnPreset === "all" || columnPreset === "movement") && (
                      <>
                        {/* Container Gated In */}
                        <td className="py-2.5 px-3 font-mono bg-purple-50/40 font-bold">
                          {row.igmContainerGatedIn ? (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded text-[10px] font-mono">
                              <Ship size={10} className="text-purple-600" />
                              {row.igmContainerGatedIn}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal italic">—</span>
                          )}
                        </td>

                        {/* Final Inward Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20 text-[10px]">
                          {row.igmFinalInwardDate || "-"}
                        </td>

                        {/* IGM No & Dt */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20 truncate max-w-[140px]" title={row.igmNoDt}>
                          {row.igmNoDt || "-"}
                        </td>

                        {/* IGM Item No */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20">
                          {row.igmItemNo || "-"}
                        </td>

                        {/* CHA / Job No */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20">
                          {row.igmChaSelfJobNo || "-"}
                        </td>

                        {/* CFS Last Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20 text-[10px]">
                          {row.igmCfsLastDate || "-"}
                        </td>

                        {/* Moved Out CFS */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20 text-[10px]">
                          {row.igmMaterialMovedOutOfCfs || "-"}
                        </td>

                        {/* Free Detention Last Dt */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-purple-50/20 text-[10px]">
                          {row.igmFreeEmptyCtnrDetentionLastDt || "-"}
                        </td>

                        {/* IGM Status Remark */}
                        <td className="py-2.5 px-3 text-slate-600 bg-purple-50/20 truncate max-w-[140px] border-r border-purple-100" title={row.igmStatusRemark}>
                          {row.igmStatusRemark || "-"}
                        </td>

                        {/* Checkpoints */}
                        <td className="py-2.5 px-2 text-center bg-indigo-50/30">
                          {row.igmDuty ? (
                            <CheckCircle2 size={14} className="text-emerald-600 inline" />
                          ) : (
                            <XCircle size={14} className="text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center bg-indigo-50/30">
                          {row.igmShpLine ? (
                            <CheckCircle2 size={14} className="text-emerald-600 inline" />
                          ) : (
                            <XCircle size={14} className="text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center bg-indigo-50/30">
                          {row.igmStampDuty ? (
                            <CheckCircle2 size={14} className="text-emerald-600 inline" />
                          ) : (
                            <XCircle size={14} className="text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center bg-indigo-50/30">
                          {row.igmDo ? (
                            <CheckCircle2 size={14} className="text-emerald-600 inline" />
                          ) : (
                            <XCircle size={14} className="text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center bg-indigo-50/30">
                          {row.igmCfs ? (
                            <CheckCircle2 size={14} className="text-emerald-600 inline" />
                          ) : (
                            <XCircle size={14} className="text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center bg-indigo-50/30 border-r border-indigo-100">
                          {row.igmOocStatus ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[9px] border border-emerald-300">
                              OOC
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[9px]">No</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Bill of Entry (BOE) Core */}
                    {(columnPreset === "all" || columnPreset === "overview" || columnPreset === "boe") && (
                      <>
                        {/* BE NO */}
                        <td className="py-2.5 px-3 font-mono font-extrabold text-blue-900 bg-blue-50/30">
                          {row.beNo ? (
                            <span className="bg-blue-100/70 border border-blue-200 px-1.5 py-0.5 rounded">
                              {row.beNo}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic font-normal">Unlinked</span>
                          )}
                        </td>

                        {/* BE Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 bg-blue-50/20 text-[10px]">
                          {row.beDate || "-"}
                        </td>

                        {/* Invoice Number */}
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 bg-blue-50/20">
                          {row.invoiceNumber || "-"}
                        </td>

                        {/* Invoice Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 bg-blue-50/20 text-[10px]">
                          {row.invoiceDate || "-"}
                        </td>

                        {/* Product Name */}
                        <td className="py-2.5 px-3 font-bold text-slate-900 bg-blue-50/20 truncate max-w-[180px]" title={row.productName}>
                          {row.productName || "-"}
                        </td>

                        {/* PI NO */}
                        <td className="py-2.5 px-3 font-mono text-slate-700 bg-blue-50/20">
                          {row.piNo || "-"}
                        </td>

                        {/* Supplier Name */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 bg-blue-50/20 border-r border-blue-100 truncate max-w-[180px]" title={row.supplierName}>
                          {row.supplierName || "-"}
                        </td>
                      </>
                    )}

                    {/* Shipment & Commercial Breakdown */}
                    {(columnPreset === "all" || columnPreset === "boe") && (
                      <>
                        <td className="py-2.5 px-3 text-slate-700 truncate max-w-[120px]">{row.mfg || "-"}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.port || "-"}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.portOfLoading || "-"}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 text-[10px]">
                          {row.billOfLadingNo ? `${row.billOfLadingNo} ${row.billOfLadingDate ? `(${row.billOfLadingDate})` : ""}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{row.fobCif || "-"}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {row.usdPmt !== undefined ? `$${row.usdPmt.toFixed(2)}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {row.purchaseQty !== undefined ? row.purchaseQty.toLocaleString() : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {row.totalUsd !== undefined ? `$${row.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 border-r border-slate-200">
                          {row.boeExRate !== undefined ? `₹${row.boeExRate.toFixed(2)}` : "-"}
                        </td>

                        {/* Duty & Status */}
                        <td className="py-2.5 px-3 bg-rose-50/20">
                          {row.beStatus ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[10px]">
                              {row.beStatus}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="py-2.5 px-3 bg-rose-50/20 font-mono text-slate-700">{row.deferredDuty || "-"}</td>
                        <td className="py-2.5 px-3 bg-rose-50/20 font-mono text-slate-700">{row.deferredDutyAmt || "-"}</td>
                        <td className="py-2.5 px-3 bg-rose-50/20 font-mono text-slate-600 text-[10px]">{row.paymentDueDate || "-"}</td>
                        <td className="py-2.5 px-3 bg-rose-50/20 font-mono text-slate-700">{row.stampDutyAmount || "-"}</td>
                        <td className="py-2.5 px-3 bg-rose-50/20 font-mono text-slate-600 text-[10px]">{row.stampDutyDate || "-"}</td>
                        <td className="py-2.5 px-3 bg-rose-50/20 text-slate-600 truncate max-w-[140px] border-r border-rose-100" title={row.statusRemark}>
                          {row.statusRemark || "-"}
                        </td>
                      </>
                    )}

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRow({ container: row.container, boe: row.boe, supplierName: row.supplierName })}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="View Complete Container & BOE Dossier"
                        >
                          <Eye size={14} />
                        </button>
                        {isEditable && onUpdateImportContainer && (
                          <button
                            type="button"
                            onClick={() => setEditingContainer({ ...row.container })}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition cursor-pointer"
                            title="Edit Container & IGM Movement"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info banner */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Showing {sortedRows.length} of {combinedRows.length} Container Records
            </span>
            {selectedBranch !== "All Branches" && (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full text-[10px] font-bold">
                Branch: {selectedBranch}
              </span>
            )}
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.2 rounded-full text-[10px] font-bold">
                Query: "{searchTerm}"
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Table Mode: 1 Row per Container Number • Related BOE & IGM Linked Automatically
          </span>
        </div>
      </div>

      {/* Row Detailed Dossier Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-900 font-black">
                  <Box size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black font-mono tracking-tight text-white">
                      {selectedRow.container.containerNo}
                    </h2>
                    <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded font-mono font-bold">
                      {selectedRow.container.sizeOfContainer || "20 FT"}
                    </span>
                    <span className="text-[10px] bg-purple-400/20 text-purple-300 border border-purple-400/40 px-2 py-0.5 rounded font-mono font-bold">
                      {selectedRow.container.containerWiseQty || 0} MT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Branch: {selectedRow.container.aolBranchName || selectedRow.boe?.aolBranchName || "—"} • BE: {selectedRow.container.beNo || selectedRow.boe?.beNo || "—"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Container Core Specs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2 mb-3">
                  <Box size={14} className="text-emerald-600" />
                  Container Core Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Container No</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedRow.container.containerNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Size of Container</span>
                    <span className="font-bold text-slate-800">{selectedRow.container.sizeOfContainer || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Container Wise Qty</span>
                    <span className="font-bold text-emerald-800 font-mono">{selectedRow.container.containerWiseQty || 0} MT</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Entry Date</span>
                    <span className="font-medium text-slate-700">{selectedRow.container.entryDate || "-"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Container Remark</span>
                    <span className="text-slate-700">{selectedRow.container.remark || "No remarks provided"}</span>
                  </div>
                </div>
              </div>

              {/* Extended IGM & Movement Details */}
              <div className="bg-purple-50/40 border border-purple-200/80 rounded-xl p-4">
                <h3 className="text-xs font-bold text-purple-950 uppercase font-mono tracking-wider flex items-center gap-2 mb-3">
                  <Ship size={14} className="text-purple-600" />
                  Extended IGM & Movement Tracking
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                  <div className="bg-purple-100/60 p-2 rounded-lg border border-purple-200">
                    <span className="text-[10px] text-purple-900 font-bold uppercase font-mono block">Container Gated In</span>
                    <span className="font-black text-purple-950 font-mono text-sm">
                      {selectedRow.container.igmContainerGatedIn || "Not Gated In"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Final Inward Date</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmFinalInwardDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">IGM No & Date</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmNoDt || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">IGM Item No</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmItemNo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">CHA / Self Job No</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmChaSelfJobNo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">CFS Last Date (10 Days)</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmCfsLastDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Material Moved Out CFS</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmMaterialMovedOutOfCfs || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Free Detention Last Dt</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedRow.container.igmFreeEmptyCtnrDetentionLastDt || "-"}</span>
                  </div>
                </div>

                {/* Checkpoints */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1.5">Customs & Delivery Checkpoints</span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {[
                      { label: "Duty Paid", val: selectedRow.container.igmDuty },
                      { label: "Shipping Line", val: selectedRow.container.igmShpLine },
                      { label: "Stamp Duty", val: selectedRow.container.igmStampDuty },
                      { label: "Delivery Order (DO)", val: selectedRow.container.igmDo },
                      { label: "CFS Gate Pass", val: selectedRow.container.igmCfs },
                      { label: "Out of Charge (OOC)", val: selectedRow.container.igmOocStatus }
                    ].map((cp) => (
                      <div
                        key={cp.label}
                        className={`p-2 rounded-lg border text-center font-mono text-[11px] ${
                          cp.val
                            ? "bg-emerald-100/80 border-emerald-300 text-emerald-900 font-bold"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] truncate">{cp.label}</div>
                        <div className="mt-0.5 text-xs font-black">{cp.val ? "YES" : "NO"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Related Bill of Entry (BOE) Information */}
              <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-4">
                <h3 className="text-xs font-bold text-blue-950 uppercase font-mono tracking-wider flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-blue-600" />
                  Related Bill of Entry (BOE) & Commercials
                </h3>
                {selectedRow.boe ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">BE NO</span>
                        <span className="font-extrabold text-blue-950 font-mono">{selectedRow.boe.beNo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">BE Date</span>
                        <span className="font-medium text-slate-800 font-mono">{selectedRow.boe.beDate || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Invoice Number</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedRow.boe.invoiceNumber || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Invoice Date</span>
                        <span className="font-medium text-slate-800 font-mono">{selectedRow.boe.invoiceDate || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Product Name</span>
                        <span className="font-bold text-slate-900">{selectedRow.boe.productName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">PI NO</span>
                        <span className="font-medium text-slate-800 font-mono">{selectedRow.boe.piNo || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Supplier Name</span>
                        <span className="font-bold text-slate-900">{selectedRow.supplierName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">AOL Branch</span>
                        <span className="font-medium text-slate-800">{selectedRow.boe.aolBranchName || "-"}</span>
                      </div>
                    </div>

                    {/* Commercial Pricing & Rates */}
                    <div className="bg-white/80 border border-blue-200/60 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">IncoTerm (FOB/CIF)</span>
                        <span className="font-bold text-slate-800">{selectedRow.boe.fobCif || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">USD PMT Rate</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {selectedRow.boe.usdPmt !== undefined ? `$${selectedRow.boe.usdPmt.toFixed(2)}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">BOE Purchase Qty</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {selectedRow.boe.purchaseQty !== undefined ? `${selectedRow.boe.purchaseQty} MT` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Total USD</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {selectedRow.boe.totalUsd !== undefined ? `$${selectedRow.boe.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">BOE Ex Rate</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {selectedRow.boe.boeExRate !== undefined ? `₹${selectedRow.boe.boeExRate.toFixed(2)}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Freight USD</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {selectedRow.boe.freightUsd !== undefined ? `$${selectedRow.boe.freightUsd.toFixed(2)}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Insurance USD</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {selectedRow.boe.insuranceUsd !== undefined ? `$${selectedRow.boe.insuranceUsd.toFixed(2)}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Bill of Lading</span>
                        <span className="font-medium text-slate-800 font-mono">{selectedRow.boe.billOfLadingNo || "-"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">
                    No matching Bill of Entry record was found for BE NO "{selectedRow.container.beNo || "None"}". Container fields are maintained individually.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingContainer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Edit size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold font-mono">Edit Container: {editingContainer.containerNo}</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingContainer(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Container No
                  </label>
                  <input
                    type="text"
                    value={editingContainer.containerNo || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, containerNo: e.target.value })}
                    className="w-full text-xs font-mono font-bold border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-purple-900 uppercase block mb-1">
                    Container Gated In Date
                  </label>
                  <input
                    type="date"
                    value={editingContainer.igmContainerGatedIn || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, igmContainerGatedIn: e.target.value })}
                    className="w-full text-xs font-mono font-bold border border-purple-200 bg-purple-50/50 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Size of Container
                  </label>
                  <input
                    type="text"
                    value={editingContainer.sizeOfContainer || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, sizeOfContainer: e.target.value })}
                    className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Container Wise Qty (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingContainer.containerWiseQty || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, containerWiseQty: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono font-bold border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Final Inward Date
                  </label>
                  <input
                    type="date"
                    value={editingContainer.igmFinalInwardDate || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, igmFinalInwardDate: e.target.value })}
                    className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    IGM No & Date
                  </label>
                  <input
                    type="text"
                    value={editingContainer.igmNoDt || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, igmNoDt: e.target.value })}
                    className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    IGM Status Remark
                  </label>
                  <input
                    type="text"
                    value={editingContainer.igmStatusRemark || ""}
                    onChange={(e) => setEditingContainer({ ...editingContainer, igmStatusRemark: e.target.value })}
                    className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Checkpoints */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1.5">
                  Clearance Checkpoints
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "igmDuty", label: "Customs Duty" },
                    { key: "igmShpLine", label: "Shipping Line" },
                    { key: "igmStampDuty", label: "Stamp Duty" },
                    { key: "igmDo", label: "Delivery Order (DO)" },
                    { key: "igmCfs", label: "CFS Gate Pass" },
                    { key: "igmOocStatus", label: "Out of Charge (OOC)" }
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((editingContainer as any)[key])}
                        onChange={(e) =>
                          setEditingContainer({
                            ...editingContainer,
                            [key]: e.target.checked
                          })
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingContainer(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContainerEdit}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
