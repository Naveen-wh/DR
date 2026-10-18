/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { User, Role, ImportCiRecord, ImportPiRecord, ImportBoeRecord, ImportContainerRecord, AolGodown } from "../../../types";
import { Plus, Search, Edit, Trash2, X, Check, Eye, Calendar, Building2, Landmark, Coins, Scale, Info, AlertCircle, RotateCcw } from "lucide-react";
import { DateRangeFilterPopup } from "../../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";

interface ImportCiSubViewProps {
  activeUserId: string;
  users: User[];
  importCis: ImportCiRecord[];
  importPis: ImportPiRecord[];
  importBoes: ImportBoeRecord[];
  importContainers: ImportContainerRecord[];
  aolGodowns: AolGodown[];
  onAddImportCi: (record: Omit<ImportCiRecord, "id" | "createdAt">) => void;
  onUpdateImportCi: (record: ImportCiRecord) => void;
  onDeleteImportCi: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportCiSubView({
  activeUserId,
  users,
  importCis,
  importPis,
  importBoes,
  importContainers,
  aolGodowns,
  onAddImportCi,
  onUpdateImportCi,
  onDeleteImportCi,
  canAdd = true,
  canEdit = true
}: ImportCiSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.teamName === "Executive";
  const isManagerOrAdmin =
    isAdmin ||
    activeUser?.role === Role.SeniorManager ||
    activeUser?.role === Role.Manager;
  const isAddable = isAdmin || canAdd !== false;
  const isEditable = isAdmin || canEdit !== false;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGodownFilter, setSelectedGodownFilter] = useState("All");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("All");

  // Date Range Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally" | "be" | "invoice">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Create Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedGodown, setSelectedGodown] = useState("");
  const [aolBranchName, setAolBranchName] = useState("");
  const [selectedBeNo, setSelectedBeNo] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedContainerNo, setSelectedContainerNo] = useState("");

  // Auto populated states
  const [supplierName, setSupplierName] = useState("");
  const [containerWiseQty, setContainerWiseQty] = useState(0);
  const [beDate, setBeDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [purchaseQty, setPurchaseQty] = useState(0);
  const [totalUsd, setTotalUsd] = useState(0);
  const [beExRate, setBeExRate] = useState(0);

  // Manual entry fields
  const [customDuty, setCustomDuty] = useState<string>("");
  const [meisLicenceAmt, setMeisLicenceAmt] = useState<string>("");
  const [penaltyAmount, setPenaltyAmount] = useState<string>("");
  const [purchaseTallyDate, setPurchaseTallyDate] = useState(new Date().toISOString().split("T")[0]);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportCiRecord | null>(null);

  // View Details Modal State
  const [viewingRecord, setViewingRecord] = useState<ImportCiRecord | null>(null);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_ci_config",
    "Import CI",
    "import_cis"
  );

  // Form Validation and Error Handling State
  const [formError, setFormError] = useState("");

  // ==========================================
  // AUTO POPULATE & SELECTION LOGIC FOR FORM
  // ==========================================

  // 1. Auto populate AOL Branch Name as per AOL Godown selection
  useEffect(() => {
    if (selectedGodown) {
      const match = aolGodowns.find((g) => g.name === selectedGodown);
      setAolBranchName(match?.branchName || "");
    } else {
      setAolBranchName("");
    }
  }, [selectedGodown, aolGodowns]);

  // CASCADING DROPDOWNS: BE No -> Product Name -> Container No (From Containers)
  // FILTER OUT items that are already entered in `importCis` for the selected godown
  // "once product from a BE finished it disappeare"
  // "if all container in a products entered here then is disappeare from dropdown"

  // Helper to determine if a container has been logged in CI for this godown
  const isContainerLogged = (be: string, prod: string, cont: string, godownName: string, excludeId?: string) => {
    return importCis.some(
      (ci) =>
        ci.id !== excludeId &&
        ci.aolGodown === godownName &&
        ci.beNo === be &&
        ci.productName === prod &&
        ci.containerNo === cont
    );
  };

  // Get available BE Numbers for the selected godown and branch
  const availableBeNos = useMemo(() => {
    if (!selectedGodown || !aolBranchName) return [];

    // Find all container records for this branch
    const branchContainers = importContainers.filter((c) => c.aolBranchName === aolBranchName);

    // Group containers by BE No to check if any container is still unlogged
    const beSet = new Set<string>();
    branchContainers.forEach((c) => {
      // Check if this specific container is already logged
      const logged = isContainerLogged(c.beNo, c.productName, c.containerNo, selectedGodown);
      if (!logged) {
        beSet.add(c.beNo);
      }
    });

    return Array.from(beSet);
  }, [importContainers, aolBranchName, selectedGodown, importCis]);

  // Reset dependent fields when Be No changes
  useEffect(() => {
    if (availableBeNos.length > 0 && !availableBeNos.includes(selectedBeNo)) {
      setSelectedBeNo("");
      setSelectedProductName("");
      setSelectedContainerNo("");
    }
  }, [availableBeNos, selectedBeNo]);

  // Get available Products for the selected Be No
  const availableProducts = useMemo(() => {
    if (!selectedGodown || !aolBranchName || !selectedBeNo) return [];

    const branchContainers = importContainers.filter(
      (c) => c.aolBranchName === aolBranchName && c.beNo === selectedBeNo
    );

    const productSet = new Set<string>();
    branchContainers.forEach((c) => {
      const logged = isContainerLogged(c.beNo, c.productName, c.containerNo, selectedGodown);
      if (!logged) {
        productSet.add(c.productName);
      }
    });

    return Array.from(productSet);
  }, [importContainers, aolBranchName, selectedBeNo, selectedGodown, importCis]);

  // Reset dependent fields when Product Name changes
  useEffect(() => {
    if (availableProducts.length > 0 && !availableProducts.includes(selectedProductName)) {
      setSelectedProductName("");
      setSelectedContainerNo("");
    }
  }, [availableProducts, selectedProductName]);

  // Get available Containers for the selected Be No and Product
  const availableContainers = useMemo(() => {
    if (!selectedGodown || !aolBranchName || !selectedBeNo || !selectedProductName) return [];

    return importContainers.filter(
      (c) =>
        c.aolBranchName === aolBranchName &&
        c.beNo === selectedBeNo &&
        c.productName === selectedProductName &&
        !isContainerLogged(c.beNo, c.productName, c.containerNo, selectedGodown)
    );
  }, [importContainers, aolBranchName, selectedBeNo, selectedProductName, selectedGodown, importCis]);

  // Reset Container Selection if not available
  useEffect(() => {
    if (availableContainers.length > 0 && !availableContainers.some((c) => c.containerNo === selectedContainerNo)) {
      setSelectedContainerNo("");
    }
  }, [availableContainers, selectedContainerNo]);

  // Auto-populate Supplier, Container Qty, BE Date, Invoice Number, Invoice Date, Purchase Qty, Total Usd, Be Ex Rate
  useEffect(() => {
    if (selectedBeNo && selectedProductName && selectedContainerNo && selectedGodown) {
      // Get selected container record
      const matchContainer = importContainers.find(
        (c) =>
          c.aolBranchName === aolBranchName &&
          c.beNo === selectedBeNo &&
          c.productName === selectedProductName &&
          c.containerNo === selectedContainerNo
      );

      // Get matching BOE record
      const matchBoe = importBoes.find(
        (b) => b.aolBranchName === aolBranchName && b.beNo === selectedBeNo && b.productName === selectedProductName
      );

      // Get matching PI record
      const matchPi = importPis.find((pi) => pi.piNo === matchBoe?.piNo);

      // Get PI product details
      const piProduct = matchPi?.products?.find((p) => p.productName === selectedProductName);

      if (matchContainer) {
        setContainerWiseQty(Number(matchContainer.containerWiseQty) || 0);
      } else {
        setContainerWiseQty(0);
      }

      if (matchBoe) {
        setBeDate(matchBoe.beDate || "");
        setInvoiceNumber(matchBoe.invoiceNumber || "");
        setInvoiceDate(matchBoe.invoiceDate || "");
        setBeExRate(Number(matchBoe.boeExRate) || 0);
      } else {
        setBeDate("");
        setInvoiceNumber("");
        setInvoiceDate("");
        setBeExRate(0);
      }

      if (matchPi) {
        setSupplierName(matchPi.supplierName || "");
      } else {
        setSupplierName("");
      }

      if (piProduct) {
        setPurchaseQty(Number(piProduct.purchaseQty) || 0);
        setTotalUsd(Number(piProduct.totalUsd) || 0);
      } else {
        // Fallback to top-level if PI products are not structured as array
        const matchPiFallback = importPis.find(
          (pi) => pi.aolBranchName === aolBranchName && pi.productName === selectedProductName
        );
        setPurchaseQty(Number(matchPiFallback?.purchaseQty) || 0);
        setTotalUsd(Number(matchPiFallback?.totalUsd) || 0);
      }
    } else {
      // Clear auto-populated fields if selections are incomplete
      setContainerWiseQty(0);
      setBeDate("");
      setInvoiceNumber("");
      setInvoiceDate("");
      setBeExRate(0);
      setSupplierName("");
      setPurchaseQty(0);
      setTotalUsd(0);
    }
  }, [selectedBeNo, selectedProductName, selectedContainerNo, selectedGodown, importContainers, importBoes, importPis, aolBranchName]);

  // ==========================================
  // MATHEMATICAL CALCULATIONS (REALTIME)
  // ==========================================

  // "Container Wise Usd" - calculate as qty in selected product for the BE divide by thats USD and multiply by container wise qty
  // Note: Mathematical definition represents (totalUsd / purchaseQty) * containerWiseQty
  const containerWiseUsd = useMemo(() => {
    if (purchaseQty > 0) {
      return (totalUsd / purchaseQty) * containerWiseQty;
    }
    return 0;
  }, [purchaseQty, totalUsd, containerWiseQty]);

  // "TOTAL CIF" = Container Wise Usd * Be Ex Rate
  const totalCif = useMemo(() => {
    return containerWiseUsd * beExRate;
  }, [containerWiseUsd, beExRate]);

  // "Total Duty paid Amt" = Custom Duty + Meis Licence Amt + Penalty Amount
  const totalDutyPaidAmt = useMemo(() => {
    return (Number(customDuty) || 0) + (Number(meisLicenceAmt) || 0) + (Number(penaltyAmount) || 0);
  }, [customDuty, meisLicenceAmt, penaltyAmount]);

  // "Total Product Cost" = TOTAL CIF + Total Duty paid Amt
  const totalProductCost = useMemo(() => {
    return totalCif + totalDutyPaidAmt;
  }, [totalCif, totalDutyPaidAmt]);

  // "Purchase Rate" = Total Product Cost / Container Wise Qty
  const purchaseRate = useMemo(() => {
    if (containerWiseQty > 0) {
      return totalProductCost / containerWiseQty;
    }
    return 0;
  }, [totalProductCost, containerWiseQty]);

  // ==========================================
  // EDIT ACTION LIVE MATHEMATICAL RECALCULATIONS
  // ==========================================

  const editContainerWiseUsd = useMemo(() => {
    if (editingRecord && editingRecord.purchaseQty > 0) {
      return (editingRecord.totalUsd / editingRecord.purchaseQty) * editingRecord.containerWiseQty;
    }
    return 0;
  }, [editingRecord]);

  const editTotalCif = useMemo(() => {
    if (editingRecord) {
      return editContainerWiseUsd * editingRecord.beExRate;
    }
    return 0;
  }, [editingRecord, editContainerWiseUsd]);

  const editTotalDutyPaidAmt = useMemo(() => {
    if (editingRecord) {
      return (
        (Number(editingRecord.customDuty) || 0) +
        (Number(editingRecord.meisLicenceAmt) || 0) +
        (Number(editingRecord.penaltyAmount) || 0)
      );
    }
    return 0;
  }, [editingRecord]);

  const editTotalProductCost = useMemo(() => {
    return editTotalCif + editTotalDutyPaidAmt;
  }, [editTotalCif, editTotalDutyPaidAmt]);

  const editPurchaseRate = useMemo(() => {
    if (editingRecord && editingRecord.containerWiseQty > 0) {
      return editTotalProductCost / editingRecord.containerWiseQty;
    }
    return 0;
  }, [editTotalProductCost, editingRecord]);

  // ==========================================
  // SUBMIT / SAVE ACTIONS & DUPLICATION CHECK
  // ==========================================

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedGodown) {
      setFormError("Please select an AOL Godown.");
      return;
    }
    if (!selectedBeNo || !selectedProductName || !selectedContainerNo) {
      setFormError("Please select BE No, Product, and Container from the dropdowns.");
      return;
    }

    // Apply duplication check with key combination of "AOL Godown", "Be No", "Product Name" and "Container No"
    const isDuplicate = importCis.some(
      (ci) =>
        ci.aolGodown === selectedGodown &&
        ci.beNo === selectedBeNo &&
        ci.productName === selectedProductName &&
        ci.containerNo === selectedContainerNo
    );

    if (isDuplicate) {
      setFormError("A record already exists for this exact Kombination of Godown, BE No, Product, and Container.");
      return;
    }

    // Prepare data
    const newRecord: Omit<ImportCiRecord, "id" | "createdAt"> = {
      aolBranchName,
      aolGodown: selectedGodown,
      beNo: selectedBeNo,
      productName: selectedProductName,
      containerNo: selectedContainerNo,
      supplierName,
      containerWiseQty,
      beDate,
      invoiceNumber,
      invoiceDate,
      purchaseQty,
      totalUsd,
      beExRate,
      containerWiseUsd,
      customDuty: Number(customDuty) || 0,
      meisLicenceAmt: Number(meisLicenceAmt) || 0,
      penaltyAmount: Number(penaltyAmount) || 0,
      purchaseTallyDate,
      entryDate: newEntryDate || new Date().toISOString().split("T")[0],
      totalCif,
      totalDutyPaidAmt,
      totalProductCost,
      purchaseRate,
      purchaseImport: "Import",
    };

    onAddImportCi(newRecord);

    const generatedId = `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    triggerSync("ADD", { ...newRecord, id: generatedId, createdAt: new Date().toISOString() });

    // Reset Form
    setSelectedBeNo("");
    setSelectedProductName("");
    setSelectedContainerNo("");
    setCustomDuty("");
    setMeisLicenceAmt("");
    setPenaltyAmount("");
    setFormError("");
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    // Duplication check (excluding current editing item)
    const isDuplicate = importCis.some(
      (ci) =>
        ci.id !== editingRecord.id &&
        ci.aolGodown === editingRecord.aolGodown &&
        ci.beNo === editingRecord.beNo &&
        ci.productName === editingRecord.productName &&
        ci.containerNo === editingRecord.containerNo
    );

    if (isDuplicate) {
      alert("Error: A duplicate CI record with the same Godown, BE No, Product, and Container No already exists.");
      return;
    }

    const updatedRecord: ImportCiRecord = {
      ...editingRecord,
      containerWiseUsd: editContainerWiseUsd,
      totalCif: editTotalCif,
      totalDutyPaidAmt: editTotalDutyPaidAmt,
      totalProductCost: editTotalProductCost,
      purchaseRate: editPurchaseRate,
    };

    onUpdateImportCi(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  const handleDelete = (id: string) => {
    onDeleteImportCi(id);
    triggerSync("DELETE", { id });
    setDeletingId(null);
  };

  // ==========================================
  // TABLE SEARCH & FILTERING
  // ==========================================

  const uniqueGodownsInFilter = useMemo(() => {
    const godownNames = new Set<string>();
    importCis.forEach((ci) => {
      if (ci.aolGodown) godownNames.add(ci.aolGodown);
    });
    return Array.from(godownNames);
  }, [importCis]);

  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    importCis.forEach((ci) => {
      if (ci.aolBranchName) branches.add(ci.aolBranchName);
    });
    return Array.from(branches);
  }, [importCis]);

  const filteredCis = useMemo(() => {
    return importCis.filter((ci) => {
      if (selectedGodownFilter !== "All" && ci.aolGodown !== selectedGodownFilter) {
        return false;
      }

      if (selectedBranchFilter !== "All" && ci.aolBranchName !== selectedBranchFilter) {
        return false;
      }

      if (startDate || endDate) {
        let targetDate = "";
        if (dateFilterType === "entry") {
          targetDate = ci.entryDate || (ci.createdAt ? ci.createdAt.split("T")[0] : "");
        } else if (dateFilterType === "tally") {
          targetDate = ci.purchaseTallyDate || "";
        } else if (dateFilterType === "be") {
          targetDate = ci.beDate || "";
        } else if (dateFilterType === "invoice") {
          targetDate = ci.invoiceDate || "";
        }

        if (!targetDate) return false;
        if (startDate && targetDate < startDate) return false;
        if (endDate && targetDate > endDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = `${ci.beNo} ${ci.productName} ${ci.containerNo} ${ci.supplierName || ""} ${ci.aolGodown || ""} ${ci.aolBranchName || ""} ${ci.invoiceNumber || ""}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    });
  }, [importCis, searchQuery, selectedGodownFilter, selectedBranchFilter, startDate, endDate, dateFilterType]);

  const isFiltered = Boolean(
    searchQuery.trim() ||
      selectedGodownFilter !== "All" ||
      selectedBranchFilter !== "All" ||
      startDate ||
      endDate
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedGodownFilter("All");
    setSelectedBranchFilter("All");
    setStartDate("");
    setEndDate("");
  };

  // Summary Metrics for table footer
  const totalContainerQty = filteredCis.reduce((sum, r) => sum + (Number(r.containerWiseQty) || 0), 0);
  const totalCifSum = filteredCis.reduce((sum, r) => sum + (Number(r.totalCif) || 0), 0);
  const totalUsdSum = filteredCis.reduce((sum, r) => sum + (Number(r.containerWiseUsd) || 0), 0);
  const totalDutyPaidSum = filteredCis.reduce((sum, r) => sum + (Number(r.totalDutyPaidAmt) || 0), 0);
  const totalProductCostSum = filteredCis.reduce((sum, r) => sum + (Number(r.totalProductCost) || 0), 0);
  const effectiveAvgPurchaseRate = totalContainerQty > 0 ? totalProductCostSum / totalContainerQty : 0;

  const uniqueGodowns = Array.from(new Set(filteredCis.map((r) => r.aolGodown).filter(Boolean))).length;
  const uniqueBranches = Array.from(new Set(filteredCis.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueBeNos = Array.from(new Set(filteredCis.map((r) => r.beNo).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredCis.map((r) => r.productName).filter(Boolean))).length;
  const uniqueSuppliers = Array.from(new Set(filteredCis.map((r) => r.supplierName).filter(Boolean))).length;
  const uniqueContainers = Array.from(new Set(filteredCis.map((r) => r.containerNo).filter(Boolean))).length;

  return (
    <div id="ci-subview-root" className="flex flex-col gap-4">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_ci_config"
        defaultSheetName="Import CI"
        collectionKey="import_cis"
        records={importCis}
        activeUser={activeUser}
        moduleTitle="CI Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importCis.find((c) => (c.beNo === rec.beNo && c.containerNo === rec.containerNo && c.productName === rec.productName) || c.id === rec.id);
            if (existing) {
              onUpdateImportCi({ ...existing, ...rec });
            } else {
              onAddImportCi(rec);
            }
          });
        }}
      />

      {/* Header and Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="ci-search-input"
              type="text"
              placeholder="Search BE No, Product, Container, Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Godown:</span>
            <select
              id="ci-godown-filter"
              value={selectedGodownFilter}
              onChange={(e) => setSelectedGodownFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Godowns</option>
              {uniqueGodownsInFilter.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Branch:</span>
            <select
              id="ci-branch-filter"
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
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
              { label: "Entry Date", value: "entry" },
              { label: "Tally Date", value: "tally" },
              { label: "BE Date", value: "be" },
              { label: "Invoice Date", value: "invoice" },
            ]}
            isOpen={isDateRangeModalOpen}
            onToggle={setIsDateRangeModalOpen}
            accentColor="emerald"
          />

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {isAddable && (
          <button
            id="ci-add-new-btn"
            onClick={() => {
              setIsAddModalOpen(true);
              // Initialize with first godown if available
              if (aolGodowns.length > 0) {
                setSelectedGodown(aolGodowns[0].name);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={14} />
            Create Import Purchase (IP)
          </button>
        )}
      </div>

      {/* Main Table View */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3">AOL Godown / Branch</th>
                <th className="px-4 py-3">BE No / Date</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Container No</th>
                <th className="px-4 py-3">Qty (Kg/MT)</th>
                <th className="px-4 py-3">CIF Amount</th>
                <th className="px-4 py-3">Duty Paid</th>
                <th className="px-4 py-3">Total Product Cost</th>
                <th className="px-4 py-3">Purchase Rate</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
              {filteredCis.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 font-medium">
                    No Import Purchase (IP) records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCis.map((ci) => (
                  <tr key={ci.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{ci.aolGodown}</div>
                      <div className="text-[10px] text-slate-400">{ci.aolBranchName}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-950">{ci.beNo}</div>
                      <div className="text-[10px] text-slate-400">{ci.beDate || "No date"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{ci.productName}</div>
                      <div className="text-[10px] text-slate-400">Supplier: {ci.supplierName}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {ci.containerNo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium">{ci.containerWiseQty.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        ₹{Math.round(ci.totalCif).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${Math.round(ci.containerWiseUsd).toLocaleString()} @ {ci.beExRate}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">
                        ₹{Math.round(ci.totalDutyPaidAmt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">
                        ₹{Math.round(ci.totalProductCost).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-emerald-700">
                        ₹{ci.purchaseRate.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingRecord(ci)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                          title="View details"
                        >
                          <Eye size={13} />
                        </button>
                        {isEditable && (
                          <button
                            onClick={() => setEditingRecord(ci)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                            title="Edit"
                          >
                            <Edit size={13} />
                          </button>
                        )}
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => setDeletingId(ci.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredCis.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredCis.length} {filteredCis.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                      {uniqueGodowns} Godowns • {uniqueBranches} Branches
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueBeNos} BEs</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                    <span className="text-[10px] text-slate-400 block">{uniqueSuppliers} Suppliers</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueContainers} Containers</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      {totalContainerQty.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Kg/MT</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      ₹{Math.round(totalCifSum).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ${Math.round(totalUsdSum).toLocaleString("en-US")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-bold text-slate-200 block text-xs">
                      ₹{Math.round(totalDutyPaidSum).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-extrabold text-amber-300 block text-xs">
                      ₹{Math.round(totalProductCostSum).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      ₹{effectiveAvgPurchaseRate.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Avg Rate</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-500">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ==========================================
          ADD IP RECORD MODAL
         ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-800">
                  <Landmark size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Import Purchase (IP)</h3>
                  <p className="text-[11px] text-slate-500">Add a new Import Purchase record for container cargo</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2 font-medium">
                  <AlertCircle size={14} className="shrink-0" />
                  {formError}
                </div>
              )}

              {/* Selection Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    AOL Godown *
                  </label>
                  <select
                    value={selectedGodown}
                    onChange={(e) => {
                      setSelectedGodown(e.target.value);
                      setSelectedBeNo("");
                      setSelectedProductName("");
                      setSelectedContainerNo("");
                    }}
                    required
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">-- Select Godown --</option>
                    {aolGodowns.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    AOL Branch Name
                  </label>
                  <input
                    type="text"
                    value={aolBranchName}
                    readOnly
                    placeholder="Auto-populated"
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Be No *
                  </label>
                  <select
                    value={selectedBeNo}
                    onChange={(e) => {
                      setSelectedBeNo(e.target.value);
                      setSelectedProductName("");
                      setSelectedContainerNo("");
                    }}
                    required
                    disabled={!selectedGodown}
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                  >
                    <option value="">-- Select BE No --</option>
                    {availableBeNos.map((be) => (
                      <option key={be} value={be}>
                        {be}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Product Name *
                  </label>
                  <select
                    value={selectedProductName}
                    onChange={(e) => {
                      setSelectedProductName(e.target.value);
                      setSelectedContainerNo("");
                    }}
                    required
                    disabled={!selectedBeNo}
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                  >
                    <option value="">-- Select Product --</option>
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Container No *
                  </label>
                  <select
                    value={selectedContainerNo}
                    onChange={(e) => setSelectedContainerNo(e.target.value)}
                    required
                    disabled={!selectedProductName}
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                  >
                    <option value="">-- Select Container --</option>
                    {availableContainers.map((c) => (
                      <option key={c.id} value={c.containerNo}>
                        {c.containerNo} (Qty: {c.containerWiseQty.toLocaleString()} kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Purchase Import Mode
                  </label>
                  <div className="p-2 w-full text-xs rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 font-bold text-center">
                    Import
                  </div>
                </div>
              </div>

              {/* Auto Populated Details Grid */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Auto-Populated Details (Containers, BOE & PI)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Supplier Name</span>
                    <span className="text-xs font-semibold text-slate-800">{supplierName || "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Container Wise Qty</span>
                    <span className="text-xs font-bold text-indigo-700">
                      {containerWiseQty ? `${containerWiseQty.toLocaleString()} kg` : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">BE Date</span>
                    <span className="text-xs font-semibold text-slate-800">{beDate || "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Invoice Number</span>
                    <span className="text-xs font-semibold text-slate-800">{invoiceNumber || "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Invoice Date</span>
                    <span className="text-xs font-semibold text-slate-800">{invoiceDate || "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">PI Purchase Qty</span>
                    <span className="text-xs font-semibold text-slate-800">{purchaseQty ? `${purchaseQty.toLocaleString()} kg` : "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">PI Total USD</span>
                    <span className="text-xs font-semibold text-slate-800">{totalUsd ? `$${totalUsd.toLocaleString()}` : "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">BE Ex Rate</span>
                    <span className="text-xs font-semibold text-slate-800">{beExRate ? `₹${beExRate}` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Manual Entry Fields & Calculations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entry Fields Card */}
                <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Coins size={14} className="text-slate-500" />
                    Duty and Clearing Entry (INR)
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                      </label>
                      <input
                        type="date"
                        value={newEntryDate}
                        readOnly
                        disabled
                        className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Custom Duty (₹) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={customDuty}
                        onChange={(e) => setCustomDuty(e.target.value)}
                        required
                        className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Meis Licence Amt (₹) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={meisLicenceAmt}
                        onChange={(e) => setMeisLicenceAmt(e.target.value)}
                        required
                        className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Penalty Amount (₹) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(e.target.value)}
                        required
                        className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Purchase Tally Date *
                      </label>
                      <input
                        type="date"
                        value={purchaseTallyDate}
                        onChange={(e) => setPurchaseTallyDate(e.target.value)}
                        required
                        className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Realtime Calculations */}
                <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Scale size={14} className="text-indigo-600" />
                    Automated Calculation Outputs
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        Container Wise USD
                        <span className="group relative cursor-help">
                          <Info size={11} className="text-slate-400 hover:text-slate-600" />
                          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] p-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 shadow-md">
                            Formula: (PI Total USD / PI Qty) * Container Qty
                          </span>
                        </span>
                      </span>
                      <span className="font-bold text-slate-800">
                        ${containerWiseUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        TOTAL CIF (INR)
                        <span className="group relative cursor-help">
                          <Info size={11} className="text-slate-400 hover:text-slate-600" />
                          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] p-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 shadow-md">
                            Formula: Container Wise USD * BE Ex Rate
                          </span>
                        </span>
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{Math.round(totalCif).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        Total Duty Paid Amt
                        <span className="group relative cursor-help">
                          <Info size={11} className="text-slate-400 hover:text-slate-600" />
                          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] p-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 shadow-md">
                            Formula: Custom Duty + Meis Licence + Penalty
                          </span>
                        </span>
                      </span>
                      <span className="font-bold text-slate-800">
                        ₹{totalDutyPaidAmt.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        Total Product Cost
                        <span className="group relative cursor-help">
                          <Info size={11} className="text-slate-400 hover:text-slate-600" />
                          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] p-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 shadow-md">
                            Formula: TOTAL CIF + Total Duty Paid Amt
                          </span>
                        </span>
                      </span>
                      <span className="font-extrabold text-slate-950 text-sm">
                        ₹{Math.round(totalProductCost).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-700 font-bold flex items-center gap-1">
                        Final Purchase Rate (₹/Kg)
                        <span className="group relative cursor-help">
                          <Info size={11} className="text-slate-400 hover:text-slate-600" />
                          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] p-2 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 shadow-md">
                            Formula: Total Product Cost / Container Wise Qty
                          </span>
                        </span>
                      </span>
                      <span className="font-black text-emerald-700 text-base">
                        ₹{purchaseRate.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
                >
                  Save Import Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          EDIT IP RECORD MODAL
         ========================================== */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Edit size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Import Purchase Details</h3>
                  <p className="text-[10px] text-slate-500">
                    Modifying BE #{editingRecord.beNo} (Product: {editingRecord.productName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Frozen dropdown combinations */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">AOL Godown</span>
                  <span className="text-xs font-semibold text-slate-800">{editingRecord.aolGodown}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">AOL Branch</span>
                  <span className="text-xs font-semibold text-slate-800">{editingRecord.aolBranchName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">BE No</span>
                  <span className="text-xs font-semibold text-slate-800">{editingRecord.beNo}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Product Name</span>
                  <span className="text-xs font-semibold text-slate-800">{editingRecord.productName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Container No</span>
                  <span className="text-xs font-bold text-slate-900 inline-block px-2 py-0.5 bg-slate-200 border border-slate-300 rounded">
                    {editingRecord.containerNo}
                  </span>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    readOnly
                    disabled
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Custom Duty (₹) *
                  </label>
                  <input
                    type="number"
                    value={editingRecord.customDuty}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        customDuty: Number(e.target.value) || 0,
                      })
                    }
                    required
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Meis Licence Amt (₹) *
                  </label>
                  <input
                    type="number"
                    value={editingRecord.meisLicenceAmt}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        meisLicenceAmt: Number(e.target.value) || 0,
                      })
                    }
                    required
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Penalty Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={editingRecord.penaltyAmount}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        penaltyAmount: Number(e.target.value) || 0,
                      })
                    }
                    required
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Purchase Tally Date *
                  </label>
                  <input
                    type="date"
                    value={editingRecord.purchaseTallyDate}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        purchaseTallyDate: e.target.value,
                      })
                    }
                    required
                    className="p-2 w-full text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Updated Calculated Output Previews */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Container Wise USD:</span>
                  <span className="font-bold">${editContainerWiseUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TOTAL CIF (INR):</span>
                  <span className="font-bold">₹{Math.round(editTotalCif).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Duty paid Amt:</span>
                  <span className="font-bold">₹{editTotalDutyPaidAmt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Product Cost:</span>
                  <span className="font-bold">₹{Math.round(editTotalProductCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-indigo-100 pt-2 text-slate-900">
                  <span className="font-bold text-indigo-900">New Purchase Rate:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">₹{editPurchaseRate.toFixed(2)} / Kg</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW RECORD DETAILS MODAL
         ========================================== */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                  <Eye size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Import Purchase Detailed Report</h3>
                  <p className="text-[10px] text-slate-400">ID: {viewingRecord.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">AOL Godown</span>
                  <span className="text-slate-900 font-bold">{viewingRecord.aolGodown}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">AOL Branch</span>
                  <span className="text-slate-900 font-semibold">{viewingRecord.aolBranchName}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">BE No</span>
                  <span className="text-slate-900 font-bold">{viewingRecord.beNo}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">BE Date</span>
                  <span className="text-slate-900 font-semibold">{viewingRecord.beDate || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">Product Name</span>
                  <span className="text-indigo-950 font-bold">{viewingRecord.productName}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">Supplier Name</span>
                  <span className="text-slate-900 font-semibold">{viewingRecord.supplierName || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">Container No</span>
                  <span className="text-slate-900 font-bold bg-slate-200 px-2 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                    {viewingRecord.containerNo}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">Container Qty</span>
                  <span className="text-slate-900 font-bold">
                    {viewingRecord.containerWiseQty.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">Invoice Number</span>
                  <span className="text-slate-900 font-semibold">{viewingRecord.invoiceNumber || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase text-[8px]">Invoice Date</span>
                  <span className="text-slate-900 font-semibold">{viewingRecord.invoiceDate || "—"}</span>
                </div>
              </div>

              {/* Calculation report */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 font-bold text-slate-800 border-b border-slate-150">
                  Value breakdown & Financial report
                </div>
                <div className="divide-y divide-slate-100 px-4">
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">PI Purchase Qty / PI USD:</span>
                    <span className="font-medium text-slate-800">
                      {viewingRecord.purchaseQty.toLocaleString()} kg / ${viewingRecord.totalUsd.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Container Wise USD:</span>
                    <span className="font-semibold text-slate-900">${viewingRecord.containerWiseUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">BE Ex Exchange Rate:</span>
                    <span className="font-medium text-slate-800">₹{viewingRecord.beExRate} / $1</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">TOTAL CIF (INR equivalent):</span>
                    <span className="font-bold text-slate-900">₹{Math.round(viewingRecord.totalCif).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Customs Duty paid:</span>
                    <span className="font-medium text-slate-800">₹{viewingRecord.customDuty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">MEIS Licence Amount:</span>
                    <span className="font-medium text-slate-800">₹{viewingRecord.meisLicenceAmt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500">Penalty / Miscellanous Amt:</span>
                    <span className="font-medium text-slate-800">₹{viewingRecord.penaltyAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2.5 bg-slate-50/50 px-2 -mx-2">
                    <span className="text-slate-700 font-bold">Total Duty Paid Amount:</span>
                    <span className="font-bold text-slate-900">₹{viewingRecord.totalDutyPaidAmt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2.5 bg-slate-50 px-2 -mx-2">
                    <span className="text-slate-900 font-extrabold">Total Product Cost:</span>
                    <span className="font-extrabold text-slate-950">₹{Math.round(viewingRecord.totalProductCost).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2.5 bg-emerald-50 px-2 -mx-2 text-emerald-950">
                    <span className="font-bold">Calculated Purchase Rate:</span>
                    <span className="font-extrabold text-emerald-800">₹{viewingRecord.purchaseRate.toFixed(2)} / Kg</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl text-[10px] text-slate-500 bg-slate-50">
                <div>
                  <strong>Purchase Import Mode:</strong> {viewingRecord.purchaseImport}
                </div>
                <div>
                  <strong>Purchase Tally Date:</strong> {viewingRecord.purchaseTallyDate}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DELETE CONFIRMATION DIALOG MODAL
         ========================================== */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                <AlertCircle size={16} />
              </span>
              Confirm Deletion
            </h3>
            <p className="text-xs text-slate-500">
              Are you absolutely sure you want to delete this Import Purchase (IP) record? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                No, Keep It
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
