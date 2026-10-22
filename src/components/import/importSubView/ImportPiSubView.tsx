/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { ImportPiRecord, ImportPiProductItem, User, AolBranchName, SupplierName, Product, Role, ImportLcRecord, ImportEtaRecord } from "../../../types";
import { Plus, Search, Trash2, Edit, FileText, DollarSign, Layers, Package, X, Check, ShieldAlert, Eye, EyeOff, CheckCircle2, Clock, AlertCircle, RotateCcw, Link2, Copy, ExternalLink, FileSpreadsheet, CheckCircle, RefreshCw, Sliders, Info, ShieldCheck, AlertTriangle, Upload } from "lucide-react";
import { DateRangeFilterPopup } from "../../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../Configuration/AppsScriptSyncBanner";
import ImportPiBulkImportModal from "../ImportPiBulkImportModal";

interface ImportPiSubViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importLcs?: ImportLcRecord[];
  importEtas?: ImportEtaRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  onAddImportPi: (record: Omit<ImportPiRecord, "id" | "createdAt">) => void;
  onUpdateImportPi: (record: ImportPiRecord) => void;
  onDeleteImportPi: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportPiSubView({
  activeUserId,
  users = [],
  importPis = [],
  importLcs = [],
  importEtas = [],
  aolBranches = [],
  suppliers = [],
  products = [],
  onAddImportPi,
  onUpdateImportPi,
  onDeleteImportPi,
  canAdd = true,
  canEdit = true
}: ImportPiSubViewProps) {
  // Check Admin / Edit / Add Permission
  const activeUser = Array.isArray(users) ? users.find((u) => u.id === activeUserId) : undefined;
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.role === ("Admin" as Role);
  const isEditable = isAdmin || canEdit !== false;
  const isAddable = isAdmin || canAdd !== false;

  // Derived options for dropdowns
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

  // PI Header Form State
  const [aolBranchName, setAolBranchName] = useState<string>("");
  const [indentor, setIndentor] = useState<string>("");
  const [piNo, setPiNo] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [piDate, setPiDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [piExRate, setPiExRate] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [mfg, setMfg] = useState<string>("");
  const [port, setPort] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");

  // Single Product Form State
  const [productName, setProductName] = useState<string>(productOptions[0] || "PVC RESIN B-57");
  const [usdPmt, setUsdPmt] = useState<string>("");
  const [purchaseQty, setPurchaseQty] = useState<string>("");

  // UI States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);

  // Date Range Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"pi" | "entry">("pi");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportPiRecord | null>(null);
  const [editProductName, setEditProductName] = useState<string>("");
  const [editUsdPmt, setEditUsdPmt] = useState<string>("");
  const [editPurchaseQty, setEditPurchaseQty] = useState<string>("");
  const [deletingPiId, setDeletingPiId] = useState<string | null>(null);

  // Google Sheets Apps Script Integration
  const {
    config: appsScriptConfig,
    syncStatus,
    setSyncStatus,
    triggerSync: triggerBackgroundSheetSync
  } = useAppsScriptSync("import_pi_config", "Import PIs", "import_pis");
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);

  // Background Google Sheet Sync Trigger (Non-blocking)
  const getTrackedNextPiId = (offset: number = 0) => {
    let maxNum = 0;
    const safePis = Array.isArray(importPis) ? importPis : [];
    safePis.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^PI-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const baseNum = maxNum > 0 ? maxNum : safePis.length;
    const nextNum = baseNum + 1 + offset;
    return `PI-${nextNum}`;
  };

  // Set initial default dropdown values
  React.useEffect(() => {
    if (!aolBranchName && branchOptions.length > 0) setAolBranchName(branchOptions[0]);
    if (!supplierName && supplierOptions.length > 0) setSupplierName(supplierOptions[0]);
  }, [branchOptions, supplierOptions]);


  // Helper to extract product items from a record
  const getRecordProducts = (rec: ImportPiRecord): ImportPiProductItem[] => {
    if (!rec) return [];
    if (Array.isArray(rec.products) && rec.products.length > 0) {
      return rec.products;
    }
    if (rec.productName) {
      return [
        {
          id: `legacy-${rec.id || "rec"}`,
          productName: rec.productName,
          usdPmt: rec.usdPmt || 0,
          purchaseQty: rec.purchaseQty || 0,
          totalUsd: rec.totalUsd || ((rec.usdPmt || 0) * (rec.purchaseQty || 0)) / 1000
        }
      ];
    }
    return [];
  };

  // Set of existing (Branch + PI No + Product Name) keys in database
  const existingPiProductSet = useMemo(() => {
    const set = new Set<string>();
    const safePis = Array.isArray(importPis) ? importPis : [];
    safePis.forEach((rec) => {
      if (!rec) return;
      const rawBranch = String(rec.aolBranchName || "").trim().toUpperCase();
      const rawPi = String(rec.piNo || "").trim().toUpperCase();
      if (!rawPi) return;
      const prods = getRecordProducts(rec);
      prods.forEach((p) => {
        const rawProd = String(p.productName || "").trim().toUpperCase();
        if (rawProd) {
          set.add(`${rawBranch}|||${rawPi}|||${rawProd}`);
        }
      });
    });
    return set;
  }, [importPis]);

  // Check duplicate in Create Form
  const formDuplicate = useMemo(() => {
    const currentBranch = aolBranchName || branchOptions[0] || "";
    const rawBranch = String(currentBranch || "").trim().toUpperCase();
    const rawPi = String(piNo || "").trim().toUpperCase();
    const rawProd = String(productName || "").trim().toUpperCase();
    if (!rawPi || !rawProd) return null;
    const key = `${rawBranch}|||${rawPi}|||${rawProd}`;

    if (existingPiProductSet.has(key)) {
      return `Duplicate! Combination of Branch "${currentBranch}", PI No "${rawPi}" and Product "${productName}" is already available in database.`;
    }
    return null;
  }, [aolBranchName, branchOptions, piNo, productName, existingPiProductSet]);

  // Set of existing (Branch + PI No + Product Name) keys excluding current editing record
  const editExistingPiProductSet = useMemo(() => {
    const set = new Set<string>();
    const safePis = Array.isArray(importPis) ? importPis : [];
    safePis.forEach((rec) => {
      if (!rec) return;
      if (editingRecord && rec.id === editingRecord.id) return;
      const rawBranch = String(rec.aolBranchName || "").trim().toUpperCase();
      const rawPi = String(rec.piNo || "").trim().toUpperCase();
      if (!rawPi) return;
      const prods = getRecordProducts(rec);
      prods.forEach((p) => {
        const rawProd = String(p.productName || "").trim().toUpperCase();
        if (rawProd) {
          set.add(`${rawBranch}|||${rawPi}|||${rawProd}`);
        }
      });
    });
    return set;
  }, [importPis, editingRecord]);

  // Check duplicate in Edit Modal
  const editFormDuplicate = useMemo(() => {
    if (!editingRecord) return null;
    const rawBranch = String(editingRecord.aolBranchName || "").trim().toUpperCase();
    const rawPi = String(editingRecord.piNo || "").trim().toUpperCase();
    const rawProd = String(editProductName || "").trim().toUpperCase();
    if (!rawPi || !rawProd) return null;
    const key = `${rawBranch}|||${rawPi}|||${rawProd}`;

    if (editExistingPiProductSet.has(key)) {
      return `Duplicate! Combination of Branch "${editingRecord.aolBranchName}", PI No "${rawPi}" and Product "${editProductName}" is already available in database.`;
    }
    return null;
  }, [editingRecord, editProductName, editExistingPiProductSet]);

  // Create Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!piNo.trim()) {
      alert("Please enter a PI Number.");
      return;
    }

    if (formDuplicate) {
      alert(`Duplicate Entry Blocked!\n\n${formDuplicate}\n\nThis combination already exists in the database and cannot be saved again.`);
      return;
    }

    const branch = aolBranchName || branchOptions[0] || "Mumbai";
    const pmt = parseFloat(usdPmt) || 0;
    const qty = parseFloat(purchaseQty) || 0;
    const totalUsd = (pmt * qty) / 1000;
    const prodName = productName || productOptions[0] || "N/A";
    const generatedId = getTrackedNextPiId(0);

    const singleProdItem: ImportPiProductItem = {
      id: `pi-prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productName: prodName,
      usdPmt: pmt,
      purchaseQty: qty,
      totalUsd
    };

    const newRecord: ImportPiRecord = {
      id: generatedId,
      createdAt: new Date().toISOString(),
      aolBranchName: branch,
      indentor: indentor.trim() || "N/A",
      piNo: piNo.trim(),
      entryDate: entryDate || new Date().toISOString().split("T")[0],
      piDate: piDate || new Date().toISOString().split("T")[0],
      piExRate: parseFloat(piExRate) || 0,
      supplierName: supplierName || supplierOptions[0] || "N/A",
      products: [singleProdItem],
      totalPurchaseQty: qty,
      grandTotalUsd: totalUsd,
      productName: prodName,
      usdPmt: pmt,
      purchaseQty: qty,
      totalUsd: totalUsd,
      mfg: mfg.trim() || "N/A",
      port: port.trim() || "N/A",
      paymentTerms: paymentTerms.trim() || "N/A",
      createdByUserId: activeUserId,
      createdByName: activeUser?.name || "Current User"
    };

    // Save record (App.tsx handles Firestore and Google Sheets sync)
    onAddImportPi(newRecord);

    // Reset Form Fields
    setPiNo("");
    setIndentor("");
    setMfg("");
    setPort("");
    setPaymentTerms("");
    setPiExRate("");
    setUsdPmt("");
    setPurchaseQty("");
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: ImportPiRecord) => {
    if (!isEditable) {
      alert("You do not have permission to edit PI records.");
      return;
    }
    setEditingRecord({ ...rec });

    const existingProds = getRecordProducts(rec);
    const p0 = existingProds[0];
    setEditProductName(p0 ? p0.productName : (rec.productName || productOptions[0] || ""));
    setEditUsdPmt(p0 ? p0.usdPmt.toString() : (rec.usdPmt?.toString() || ""));
    setEditPurchaseQty(p0 ? p0.purchaseQty.toString() : (rec.purchaseQty?.toString() || ""));
  };

  // Save Edit Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!String(editingRecord.piNo || "").trim()) {
      alert("Please enter a PI Number.");
      return;
    }

    if (editFormDuplicate) {
      alert(`Duplicate Entry Blocked!\n\n${editFormDuplicate}\n\nThis combination already exists in the database and cannot be saved again.`);
      return;
    }

    const pmt0 = parseFloat(editUsdPmt) || 0;
    const qty0 = parseFloat(editPurchaseQty) || 0;
    const totalUsd0 = (pmt0 * qty0) / 1000;
    const prodName0 = editProductName || productOptions[0] || "N/A";

    const updatedFirstProd: ImportPiProductItem = {
      id: `edit-prod-${Date.now()}`,
      productName: prodName0,
      usdPmt: pmt0,
      purchaseQty: qty0,
      totalUsd: totalUsd0
    };

    const updatedRecord: ImportPiRecord = {
      ...editingRecord,
      products: [updatedFirstProd],
      totalPurchaseQty: qty0,
      grandTotalUsd: totalUsd0,
      productName: prodName0,
      usdPmt: pmt0,
      purchaseQty: qty0,
      totalUsd: totalUsd0
    };

    // Save edit (App.tsx handles Firestore and Google Sheets sync)
    onUpdateImportPi(updatedRecord);

    setEditingRecord(null);
  };

  // Helper to calculate total Qty and Total USD for a record
  const getRecordTotals = (rec: ImportPiRecord) => {
    const prods = getRecordProducts(rec);
    const qty = rec.totalPurchaseQty ?? prods.reduce((acc, p) => acc + (p.purchaseQty || 0), 0);
    const usd = rec.grandTotalUsd ?? prods.reduce((acc, p) => acc + (p.totalUsd || 0), 0);
    return { qty, usd, prods };
  };

  // Helper to calculate LC status for a PI record
  const getLcStatus = (rec: ImportPiRecord) => {
    if (!rec) return { status: "pending", savedCount: 0, totalCount: 0, label: "Pending (0/0)" };
    const prods = getRecordProducts(rec);
    const piProducts = prods.map((p) => p && p.productName).filter(Boolean);

    const safeLcs = Array.isArray(importLcs) ? importLcs : [];
    const savedLcs = safeLcs.filter(
      (lc) => lc && lc.aolBranchName === rec.aolBranchName && lc.piNo === rec.piNo
    );
    const savedSet = new Set(savedLcs.map((lc) => lc.productName));
    const savedCount = piProducts.filter((p) => savedSet.has(p)).length;
    const totalCount = piProducts.length;

    if (totalCount > 0 && savedCount === totalCount) {
      return { status: "completed", savedCount, totalCount, label: `Completed (${savedCount}/${totalCount})` };
    } else if (savedCount > 0) {
      return { status: "partial", savedCount, totalCount, label: `Partial (${savedCount}/${totalCount})` };
    } else {
      return { status: "pending", savedCount: 0, totalCount, label: `Pending (0/${totalCount})` };
    }
  };

  // Helper to calculate ETA status for a PI record
  const getEtaStatus = (rec: ImportPiRecord) => {
    if (!rec) return { status: "pending", savedCount: 0, totalCount: 0, label: "Pending (0/0)" };
    const prods = getRecordProducts(rec);
    const piProducts = prods.map((p) => p && p.productName).filter(Boolean);

    const safeEtas = Array.isArray(importEtas) ? importEtas : [];
    const savedEtas = safeEtas.filter(
      (e) => e && e.aolBranchName === rec.aolBranchName && e.piNo === rec.piNo
    );
    const savedSet = new Set(savedEtas.map((e) => e.productName));
    const savedCount = piProducts.filter((p) => savedSet.has(p)).length;
    const totalCount = piProducts.length;

    if (totalCount > 0 && savedCount === totalCount) {
      return { status: "completed", savedCount, totalCount, label: `Completed (${savedCount}/${totalCount})` };
    } else if (savedCount > 0) {
      return { status: "partial", savedCount, totalCount, label: `Partial (${savedCount}/${totalCount})` };
    } else {
      return { status: "pending", savedCount: 0, totalCount, label: `Pending (0/${totalCount})` };
    }
  };

  // Filtered PI Records
  const filteredRecords = useMemo(() => {
    const safePis = Array.isArray(importPis) ? importPis : [];
    return safePis.filter((rec) => {
      if (!rec) return false;
      const matchesBranch = selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;
      const q = searchQuery.toLowerCase();
      const prods = getRecordProducts(rec);
      const matchesProduct = prods.some((p) => p && String(p.productName || "").toLowerCase().includes(q));

      const matchesSearch =
        !q ||
        String(rec.piNo || "").toLowerCase().includes(q) ||
        String(rec.indentor || "").toLowerCase().includes(q) ||
        String(rec.supplierName || "").toLowerCase().includes(q) ||
        matchesProduct ||
        String(rec.aolBranchName || "").toLowerCase().includes(q) ||
        String(rec.mfg || "").toLowerCase().includes(q) ||
        String(rec.port || "").toLowerCase().includes(q) ||
        String(rec.paymentTerms || "").toLowerCase().includes(q);

      if (!matchesBranch || !matchesSearch) return false;

      if (startDate || endDate) {
        const targetDate = dateFilterType === "pi" ? rec.piDate : rec.entryDate;
        if (!targetDate) return false;
        if (startDate && targetDate < startDate) return false;
        if (endDate && targetDate > endDate) return false;
      }

      return true;
    });
  }, [importPis, searchQuery, selectedBranchFilter, startDate, endDate, dateFilterType]);

  const isFiltered = Boolean(searchQuery.trim() || selectedBranchFilter !== "ALL" || startDate || endDate);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedBranchFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  }, [filteredRecords]);

  const uniqueIndentors = useMemo(() => {
    return Array.from(new Set(filteredRecords.map((r) => r.indentor).filter(Boolean))).length;
  }, [filteredRecords]);

  const uniquePIs = useMemo(() => {
    return Array.from(new Set(filteredRecords.map((r) => r.piNo).filter(Boolean))).length;
  }, [filteredRecords]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(filteredRecords.map((r) => r.supplierName).filter(Boolean))).length;
  }, [filteredRecords]);

  const uniqueProducts = useMemo(() => {
    const allProds = filteredRecords.flatMap((r) => getRecordProducts(r).map((p) => p.productName));
    return Array.from(new Set(allProds.filter(Boolean))).length;
  }, [filteredRecords]);

  // Overall statistics
  const grandTotalPurchaseQty = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => acc + getRecordTotals(curr).qty, 0);
  }, [filteredRecords]);

  const grandTotalUsdSum = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => acc + getRecordTotals(curr).usd, 0);
  }, [filteredRecords]);

  return (
    <div className="flex flex-col gap-5">
      {/* GOOGLE SHEETS APPS SCRIPT BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_pi_config"
        defaultSheetName="Import PIs"
        collectionKey="import_pis"
        records={importPis}
        activeUser={users.find((u) => u.id === activeUserId)}
        moduleTitle="Proforma Invoices (PI)"
        config={appsScriptConfig}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importPis.find((p) => p.piNo === rec.piNo || p.id === rec.id);
            if (existing) {
              onUpdateImportPi({ ...existing, ...rec });
            } else {
              onAddImportPi(rec);
            }
          });
        }}
      />
      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total PI Records</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Purchase QTY</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">
              {grandTotalPurchaseQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">MT/Units</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total USD Amount</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
              ${grandTotalUsdSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-100/60 text-emerald-700 rounded-lg">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* PI Entry Form Section */}
      {isAddable && (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div 
          className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider">Create New Proforma Invoice (PI) Entry</h3>
          </div>
          <button 
            type="button" 
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition"
          >
            {isFormOpen ? "Hide Form" : "Show Form"}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50/50 flex flex-col gap-4">
            {/* SECTION 1: PI Header Information */}
            <div>
              <p className="text-[11px] font-bold font-mono uppercase text-slate-600 tracking-wider mb-2.5 flex items-center gap-1.5">
                <FileText size={13} className="text-emerald-600" />
                1. General PI Details
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {/* Entry Date */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-3 py-2 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                {/* AOL Branch Name (Dropdown) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch Name *
                  </label>
                  <select
                    value={aolBranchName}
                    onChange={(e) => setAolBranchName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  >
                    {branchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* INDENTOR */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Indentor 
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DNA / Rahul Verma"
                    value={indentor}
                    onChange={(e) => setIndentor(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* PI NO */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI NO *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PI-15AK4480"
                    value={piNo}
                    onChange={(e) => setPiNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-mono font-semibold text-slate-900"
                    required
                  />
                </div>

                {/* PI DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI Date *
                  </label>
                  <input
                    type="date"
                    value={piDate}
                    onChange={(e) => setPiDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  />
                </div>

                {/* PI Ex Rate */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI Ex Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 83.50"
                    value={piExRate}
                    onChange={(e) => setPiExRate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* SUPPLIER NAME (Dropdown) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Supplier Name *
                  </label>
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  >
                    {supplierOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MFG */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    MFG
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Formosa / LG"
                    value={mfg}
                    onChange={(e) => setMfg(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* PORT */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nhava Sheva"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* Payment Terms */}
                <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 90 Days LC / LC SIGHT"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: SINGLE PRODUCT DETAILS SECTION */}
            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
              {formDuplicate && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 shadow-xs">
                  <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                  <span>{formDuplicate}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Package size={16} className="text-emerald-600" />
                  <h4 className="text-xs font-extrabold text-slate-800 font-mono uppercase tracking-wider">
                    2. Product Details
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                  <span>Total USD: <strong className="font-extrabold">${(((parseFloat(usdPmt) || 0) * (parseFloat(purchaseQty) || 0)) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Product Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name *
                  </label>
                  <select
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    required
                  >
                    {productOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* USD PMT */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    USD PMT *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 800"
                    value={usdPmt}
                    onChange={(e) => setUsdPmt(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  />
                </div>

                {/* Purchase QTY */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Purchase QTY *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 35000"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className={`flex items-center gap-1.5 font-bold text-xs px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer ${
                  formDuplicate
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {formDuplicate ? <ShieldAlert size={15} /> : <Plus size={15} />}
                {formDuplicate ? "Duplicate Detected - Cannot Save Entry" : "Save PI Entry to Database"}
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* PI Records Table View */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg">
              <FileText size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
              Import PI Database Directory ({filteredRecords.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Branch */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Branch:</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PI NO, Supplier, Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs border border-slate-200 bg-white pl-8 pr-3 py-1.5 rounded-lg w-48 sm:w-64 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
              />
            </div>

            {/* Date Range Filter Popup */}
            <DateRangeFilterPopup
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              dateFilterType={dateFilterType}
              onDateFilterTypeChange={setDateFilterType}
              dateFilterOptions={[
                { label: "PI Date", value: "pi" },
                { label: "Entry Date", value: "entry" },
              ]}
              isOpen={isDateRangeModalOpen}
              onToggle={setIsDateRangeModalOpen}
              accentColor="emerald"
            />

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {isAddable && (
              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
                title="Import data from Google Sheet or CSV file"
              >
                <Upload size={13} className="text-emerald-700" />
                <span>Import (Sheet / CSV)</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold w-10 text-center">#</th>
                <th className="py-2.5 px-3 font-bold">AOL Branch</th>
                <th className="py-2.5 px-3 font-bold">Indentor</th>
                {/* 1. PI DETAILS (PI NO, Date, Ex Rate in 3 rows) */}
                <th className="py-2.5 px-3 font-bold">PI Details</th>
                <th className="py-2.5 px-3 font-bold">Supplier Name</th>
                {/* 2. DIRECT SINGLE PRODUCT COLUMNS */}
                <th className="py-2.5 px-3 font-bold">Product Name</th>
                <th className="py-2.5 px-3 font-bold text-right">USD PMT</th>
                <th className="py-2.5 px-3 font-bold text-right">Purchase QTY</th>
                <th className="py-2.5 px-3 font-bold text-right">Total USD</th>
                {/* 3. COMBINED PAYMENT COLUMN (Payment Terms, MFG, Port) */}
                <th className="py-2.5 px-3 font-bold">Payment</th>
                {/* 4. LC STATUS & 5. ETA STATUS */}
                <th className="py-2.5 px-3 font-bold">LC Status</th>
                <th className="py-2.5 px-3 font-bold">ETA Status</th>
                {/* 6. ACTIONS (Admin Only) */}
                <th className="py-2.5 px-3 font-bold text-center w-20">
                  {isAdmin ? "Actions" : "Access"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500">No PI records found in database.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use the form above to add a new Proforma Invoice entry.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  const { qty, usd, prods } = getRecordTotals(rec);
                  const prodName = rec.productName || prods[0]?.productName || "N/A";
                  const pmtRate = rec.usdPmt ?? prods[0]?.usdPmt ?? 0;
                  const itemQty = rec.purchaseQty ?? qty;
                  const itemTotalUsd = rec.totalUsd ?? usd;

                  return (
                    <tr key={`${rec.id || "pi"}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px] align-top">
                        {index + 1}
                      </td>

                      {/* AOL Branch */}
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap align-top">
                        {rec.aolBranchName}
                      </td>

                      {/* Indentor */}
                      <td className="py-3 px-3 text-slate-700 font-semibold whitespace-nowrap align-top">
                        {rec.indentor}
                      </td>

                      {/* PI DETAILS: 3 STACKED ROWS (Record ID / PI NO / Date / Ex Rate) */}
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-0.5 font-mono">
                          {rec.id && (
                            <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mb-0.5">
                              ID: {rec.id}
                            </span>
                          )}
                          {/* Row 1: PI NO */}
                          <span className="font-extrabold text-slate-900 text-xs tracking-tight">{rec.piNo}</span>
                          {/* Row 2: Date */}
                          <span className="text-[10px] text-slate-500">Date: {rec.piDate || "N/A"}</span>
                          {/* Row 3: Ex Rate */}
                          <span className="text-[10px] text-slate-600 font-bold">
                            Ex Rate: {rec.piExRate ? rec.piExRate : "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Supplier Name */}
                      <td className="py-3 px-3 text-slate-800 font-medium whitespace-nowrap max-w-[180px] truncate align-top" title={rec.supplierName}>
                        {rec.supplierName}
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3 font-extrabold text-slate-900 align-top max-w-[220px] truncate font-mono text-xs" title={prodName}>
                        {prodName}
                      </td>

                      {/* USD PMT */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap align-top">
                        ${typeof pmtRate === "number" ? pmtRate.toLocaleString() : pmtRate}
                      </td>

                      {/* Purchase QTY */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap align-top">
                        {typeof itemQty === "number" ? itemQty.toLocaleString() : itemQty}
                      </td>

                      {/* Total USD */}
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/50 whitespace-nowrap align-top">
                        ${typeof itemTotalUsd === "number" ? itemTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : itemTotalUsd}
                      </td>

                      {/* COMBINED PAYMENT COLUMN (Payment Terms top row, MFG & Port below) */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {/* Row 1: Payment Terms */}
                          <div className="font-extrabold text-slate-800 text-xs font-mono">
                            {rec.paymentTerms || "N/A"}
                          </div>
                          {/* Row 2: MFG */}
                          <div className="text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-600">MFG:</span> {rec.mfg || "N/A"}
                          </div>
                          {/* Row 3: Port */}
                          <div className="text-[10px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-600">Port:</span> {rec.port || "N/A"}
                          </div>
                        </div>
                      </td>

                      {/* LC STATUS COLUMN */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        {(() => {
                          const lcStat = getLcStatus(rec);
                          if (lcStat.status === "completed") {
                            return (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                {lcStat.label}
                              </span>
                            );
                          } else if (lcStat.status === "partial") {
                            return (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 shadow-2xs">
                                <Clock size={12} className="text-amber-600" />
                                {lcStat.label}
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1 font-mono font-semibold text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                <AlertCircle size={12} className="text-slate-400" />
                                {lcStat.label}
                              </span>
                            );
                          }
                        })()}
                      </td>

                      {/* ETA STATUS COLUMN */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        {(() => {
                          const etaStat = getEtaStatus(rec);
                          if (etaStat.status === "completed") {
                            return (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                {etaStat.label}
                              </span>
                            );
                          } else if (etaStat.status === "partial") {
                            return (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 shadow-2xs">
                                <Clock size={12} className="text-amber-600" />
                                {etaStat.label}
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1 font-mono font-semibold text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                <AlertCircle size={12} className="text-slate-400" />
                                {etaStat.label}
                              </span>
                            );
                          }
                        })()}
                      </td>

                      {/* ACTIONS: Edit & Delete */}
                      <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                        {isEditable || isAdmin ? (
                          deletingPiId === rec.id ? (
                            <div className="flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                              <span className="text-[10px] font-extrabold text-rose-800">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteImportPi(rec.id);
                                  setDeletingPiId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer shadow-2xs"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingPiId(null)}
                                className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {isEditable && (
                                <button
                                  onClick={() => handleOpenEditModal(rec)}
                                  className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                                  title="Edit PI Entry"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => setDeletingPiId(rec.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete PI Entry (Admin Only)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="inline-block text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Read Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 font-mono">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{uniqueBranches} Branches</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueIndentors} Indentors</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniquePIs} PIs</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueSuppliers} Suppliers</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    {grandTotalPurchaseQty.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400 bg-slate-800/60">
                    ${grandTotalUsdSum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ADMIN EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider">
                  Admin Edit PI Entry #{editingRecord.piNo}
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveEdit} className="p-5 flex flex-col gap-5 text-xs">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-3 py-2 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch Name
                  </label>
                  <select
                    value={editingRecord.aolBranchName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aolBranchName: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  >
                    {branchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Indentor
                  </label>
                  <input
                    type="text"
                    value={editingRecord.indentor}
                    onChange={(e) => setEditingRecord({ ...editingRecord, indentor: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI NO
                  </label>
                  <input
                    type="text"
                    value={editingRecord.piNo}
                    onChange={(e) => setEditingRecord({ ...editingRecord, piNo: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI Date
                  </label>
                  <input
                    type="date"
                    value={editingRecord.piDate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, piDate: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI Ex Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.piExRate || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, piExRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Supplier Name
                  </label>
                  <select
                    value={editingRecord.supplierName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, supplierName: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                    required
                  >
                    {supplierOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    MFG
                  </label>
                  <input
                    type="text"
                    value={editingRecord.mfg || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, mfg: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={editingRecord.port || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, port: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={editingRecord.paymentTerms || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, paymentTerms: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Edit Product Details Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3">
                {editFormDuplicate && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 shadow-xs">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                    <span>{editFormDuplicate}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Package size={15} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 font-mono uppercase">Product Details</h4>
                  </div>
                  <div className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    Total USD: <strong className="font-extrabold">${(((parseFloat(editUsdPmt) || 0) * (parseFloat(editPurchaseQty) || 0)) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Product Name *
                    </label>
                    <select
                      value={editProductName}
                      onChange={(e) => setEditProductName(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      required
                    >
                      {productOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      USD PMT *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editUsdPmt}
                      onChange={(e) => setEditUsdPmt(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Purchase QTY *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPurchaseQty}
                      onChange={(e) => setEditPurchaseQty(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                    editFormDuplicate
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {editFormDuplicate ? <ShieldAlert size={15} /> : <Check size={15} />}
                  {editFormDuplicate ? "Duplicate Detected - Cannot Save" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Bulk Import Modal for Google Sheets and CSV */}
      <ImportPiBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onAddImportPi={onAddImportPi}
        onUpdateImportPi={onUpdateImportPi}
        existingPis={importPis}
        aolBranches={aolBranches}
        suppliers={suppliers}
        products={products}
        activeUserId={activeUserId}
        activeUserName={users.find((u) => u.id === activeUserId)?.name || "Current User"}
        appsScriptUrl={appsScriptConfig.appsScriptUrl}
        sheetName={appsScriptConfig.sheetName}
        onSyncToAppsScript={(action, rec) => {
          if (appsScriptConfig.appsScriptUrl && appsScriptConfig.autoSync) {
            triggerBackgroundSheetSync(action, rec);
          }
        }}
      />
    </div>
  );
}
