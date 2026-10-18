/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, AolBranchName, Product, AolGodown, PidRecord, AccountsStRecord, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, ArrowRight, Building2, Package, Layers, TrendingUp, DollarSign, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface AccountsStSubViewProps {
  activeUserId: string;
  users: User[];
  accountsSts?: AccountsStRecord[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  products?: Product[];
  pids?: PidRecord[];
  onAddAccountsSt: (record: Omit<AccountsStRecord, "id" | "createdAt">) => void;
  onUpdateAccountsSt: (record: AccountsStRecord) => void;
  onDeleteAccountsSt: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export function formatDateDdMmmYy(dateStr: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0].slice(-2);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${monthNames[monthIdx]}-${year}`;
    }
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default function AccountsStSubView({
  activeUserId,
  users,
  accountsSts = [],
  aolBranches = [],
  aolGodowns = [],
  products = [],
  pids = [],
  onAddAccountsSt,
  onUpdateAccountsSt,
  onDeleteAccountsSt,
  canAdd = true,
  canEdit = true,
}: AccountsStSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || {
    id: activeUserId,
    name: "User",
    accessLevel: AccessLevel.Editor,
    role: Role.User,
    teamName: "",
  };

  const isAccountsTeam =
    activeUser.teamName?.toLowerCase() === "accounts" ||
    activeUser.teamName?.toLowerCase().includes("account") ||
    activeUser.teamName === "Executive";
  const isAdminOrManager =
    activeUser.role === Role.Admin ||
    activeUser.role === Role.SeniorManager ||
    activeUser.role === Role.Manager ||
    activeUser.accessLevel === AccessLevel.Manager;

  const isAddable = canAdd !== false || isAccountsTeam || isAdminOrManager;
  const isEditable = canEdit !== false || isAccountsTeam || isAdminOrManager;
  const isDeletable = canEdit !== false || isAccountsTeam || isAdminOrManager;

  // Google Sheets Apps Script Integration
  const { config, syncStatus, setSyncStatus } = useAppsScriptSync(
    "accounts_sts_apps_script",
    "Accounts ST",
    "accounts_sts"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGodown, setFilterGodown] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "invoice">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsStRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsStRecord | null>(null);

  // Form states - Create
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Source states
  const [selectedSourceGodown, setSelectedSourceGodown] = useState(aolGodowns[0]?.name || "");
  const [selectedPidKey, setSelectedPidKey] = useState("");
  const [sourceAolBranch, setSourceAolBranch] = useState("");
  const [sourceSupplier, setSourceSupplier] = useState("");
  const [sourceProduct, setSourceProduct] = useState("");
  const [sourceBillNo, setSourceBillNo] = useState("");
  const [sourceContainerNo, setSourceContainerNo] = useState("");
  const [sourceOriginCode, setSourceOriginCode] = useState("");
  const [sourcePurchaseRate, setSourcePurchaseRate] = useState<number>(0);
  const [sourceClosingStock, setSourceClosingStock] = useState<number>(0);
  const [importOrDomestic, setImportOrDomestic] = useState<"Import" | "Domestic">("Domestic");
  
  // Transfer Specs
  const [newQty, setNewQty] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().split("T")[0]);

  // Destination states
  const [selectedDestGodown, setSelectedDestGodown] = useState(aolGodowns[0]?.name || "");
  const [destAolBranch, setDestAolBranch] = useState("");
  const [newStockJvNo, setNewStockJvNo] = useState("");
  const [newProductName, setNewProductName] = useState(products[0]?.name || "");
  const [newFreightProvision, setNewFreightProvision] = useState("");
  const [newLoadingUnloading, setNewLoadingUnloading] = useState("");

  // Available PIDs with closing stock > 0
  const availablePids = pids.filter((p) => (p.closingStock || 0) > 0);

  // Filter available PIDs if source godown is selected
  const godownFilteredPids = selectedSourceGodown
    ? availablePids.filter((p) => p.aolGodown?.toLowerCase() === selectedSourceGodown.toLowerCase() || !p.aolGodown)
    : availablePids;

  // Handle source PID key selection
  const handlePidSelect = (pidId: string) => {
    setSelectedPidKey(pidId);
    const pid = pids.find((p) => p.id === pidId);
    if (pid) {
      if (pid.aolGodown) setSelectedSourceGodown(pid.aolGodown);
      setSourceAolBranch(pid.aolBranchName || "");
      setSourceSupplier(pid.supplierName || "");
      setSourceProduct(pid.productName || "");
      setSourceBillNo(pid.purchaseBeOrNo || "");
      setSourceContainerNo(pid.containerNo || "");
      setSourceOriginCode(pid.originCode || pid.id);
      setSourcePurchaseRate(pid.purchaseRate || 0);
      setSourceClosingStock(pid.closingStock || 0);
      setImportOrDomestic(pid.type === "Import" || pid.type === "Import-ST" ? "Import" : "Domestic");
      // Default new product name to same as source product
      setNewProductName(pid.productName || products[0]?.name || "");
    }
  };

  // Handle destination godown change -> auto branch
  const handleDestGodownChange = (godownName: string) => {
    setSelectedDestGodown(godownName);
    const foundGodown = aolGodowns.find((g) => g.name === godownName);
    if (foundGodown) {
      setDestAolBranch(foundGodown.branchName || "");
    }
  };

  // Calculations for form
  const qtyNum = parseFloat(newQty) || 0;
  const rateNum = parseFloat(newRate) || 0;
  const taxableVal = qtyNum * rateNum;
  const gpVal = (rateNum - sourcePurchaseRate) * qtyNum;

  const handleOpenCreate = () => {
    setNewEntryDate(new Date().toISOString().split("T")[0]);
    const initGodown = aolGodowns[0]?.name || "";
    setSelectedSourceGodown(initGodown);
    setSelectedPidKey("");
    setSourceAolBranch("");
    setSourceSupplier("");
    setSourceProduct("");
    setSourceBillNo("");
    setSourceContainerNo("");
    setSourceOriginCode("");
    setSourcePurchaseRate(0);
    setSourceClosingStock(0);
    setImportOrDomestic("Domestic");
    
    setNewQty("");
    setNewRate("");
    setNewInvoiceDate(new Date().toISOString().split("T")[0]);

    const destInit = aolGodowns[1]?.name || aolGodowns[0]?.name || "";
    setSelectedDestGodown(destInit);
    const foundDest = aolGodowns.find((g) => g.name === destInit);
    setDestAolBranch(foundDest?.branchName || "");

    setNewStockJvNo("");
    setNewProductName("");
    setNewFreightProvision("");
    setNewLoadingUnloading("");

    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceGodown) {
      alert("Please select a Source AOL Godown.");
      return;
    }
    if (!selectedDestGodown) {
      alert("Please select a Destination AOL Godown.");
      return;
    }
    if (!newQty || qtyNum <= 0) {
      alert("Transfer Qty (Kg) is mandatory and must be a positive number greater than 0.");
      return;
    }
    if (!newRate || rateNum <= 0) {
      alert("Rate (₹) is mandatory and must be greater than 0.");
      return;
    }
    if (!newInvoiceDate) {
      alert("Invoice / Tally Date is mandatory.");
      return;
    }
    if (!newStockJvNo.trim()) {
      alert("Stock JV / New Invoice No is mandatory.");
      return;
    }
    if (!newProductName.trim()) {
      alert("New Product Name is mandatory.");
      return;
    }
    if (sourceClosingStock > 0 && qtyNum > sourceClosingStock) {
      alert(`Transfer Qty (${qtyNum.toLocaleString()} Kg) cannot exceed Current Closing Stock in Source (${sourceClosingStock.toLocaleString()} Kg).`);
      return;
    }

    const recordData: Omit<AccountsStRecord, "id" | "createdAt"> = {
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
      entryDate: newEntryDate,
      sourceAolGodown: selectedSourceGodown,
      sourceAolBranchName: sourceAolBranch,
      sourceSupplierName: sourceSupplier,
      sourceProductName: sourceProduct,
      sourceBePurchaseBillNo: sourceBillNo,
      sourceContainerNo: sourceContainerNo,
      sourceOriginCode: sourceOriginCode,
      sourcePidId: selectedPidKey,
      sourcePurchaseRate: sourcePurchaseRate,
      sourceClosingStock: sourceClosingStock,
      qty: qtyNum,
      rate: rateNum,
      invoiceOrTallyDate: newInvoiceDate,
      destAolGodown: selectedDestGodown,
      destAolBranchName: destAolBranch,
      stockJvOrNewInvoiceNo: newStockJvNo.trim(),
      newProductName: newProductName.trim(),
      importOrDomestic: importOrDomestic,
      freightProvision: parseFloat(newFreightProvision) || 0,
      provisionLoadingUnloading: parseFloat(newLoadingUnloading) || 0,
      taxableValue: taxableVal,
      gp: gpVal,
    };

    onAddAccountsSt(recordData);
    setIsCreateModalOpen(false);
  };

  // Helper when changing source PID in edit mode
  const handleEditPidSelect = (pidId: string) => {
    if (!editingRecord) return;
    const pid = pids.find((p) => p.id === pidId);
    if (pid) {
      setEditingRecord({
        ...editingRecord,
        sourcePidId: pidId,
        sourceAolGodown: pid.aolGodown || editingRecord.sourceAolGodown,
        sourceAolBranchName: pid.aolBranchName || "",
        sourceSupplierName: pid.supplierName || "",
        sourceProductName: pid.productName || "",
        sourceBePurchaseBillNo: pid.purchaseBeOrNo || "",
        sourceContainerNo: pid.containerNo || "",
        sourceOriginCode: pid.originCode || pid.id,
        sourcePurchaseRate: pid.purchaseRate || 0,
        sourceClosingStock: pid.closingStock || 0,
        importOrDomestic: pid.type === "Import" || pid.type === "Import-ST" ? "Import" : "Domestic",
        newProductName: editingRecord.newProductName || pid.productName || "",
      });
    }
  };

  // Helper when changing destination godown in edit mode
  const handleEditDestGodownChange = (godownName: string) => {
    if (!editingRecord) return;
    const foundGodown = aolGodowns.find((g) => g.name === godownName);
    setEditingRecord({
      ...editingRecord,
      destAolGodown: godownName,
      destAolBranchName: foundGodown?.branchName || "",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editingRecord.sourceAolGodown) {
      alert("Please select a Source AOL Godown.");
      return;
    }
    if (!editingRecord.destAolGodown) {
      alert("Please select a Destination AOL Godown.");
      return;
    }

    const editQty = editingRecord.qty || 0;
    if (editQty <= 0) {
      alert("Transfer Qty (Kg) is mandatory and must be a positive number greater than 0.");
      return;
    }

    const editRate = editingRecord.rate || 0;
    if (editRate <= 0) {
      alert("Rate (₹) is mandatory and must be greater than 0.");
      return;
    }

    if (!editingRecord.invoiceOrTallyDate) {
      alert("Invoice / Tally Date is mandatory.");
      return;
    }

    if (!editingRecord.stockJvOrNewInvoiceNo?.trim()) {
      alert("Stock JV / New Invoice No is mandatory.");
      return;
    }

    if (!editingRecord.newProductName?.trim()) {
      alert("New Product Name is mandatory.");
      return;
    }

    const maxStock = editingRecord.sourceClosingStock || 0;
    if (maxStock > 0 && editQty > maxStock) {
      alert(`Transfer Qty (${editQty.toLocaleString()} Kg) cannot exceed Current Closing Stock in Source (${maxStock.toLocaleString()} Kg).`);
      return;
    }

    const editPurchaseRate = editingRecord.sourcePurchaseRate || 0;
    const updatedTaxable = editQty * editRate;
    const updatedGp = (editRate - editPurchaseRate) * editQty;

    const updated: AccountsStRecord = {
      ...editingRecord,
      stockJvOrNewInvoiceNo: editingRecord.stockJvOrNewInvoiceNo.trim(),
      newProductName: editingRecord.newProductName.trim(),
      taxableValue: updatedTaxable,
      gp: updatedGp,
    };

    onUpdateAccountsSt(updated);
    setEditingRecord(null);
  };

  // Filtering records for table
  const filteredRecords = accountsSts.filter((rec) => {
    const matchesGodown =
      filterGodown === "all" ||
      rec.sourceAolGodown?.toLowerCase() === filterGodown.toLowerCase() ||
      rec.destAolGodown?.toLowerCase() === filterGodown.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      rec.sourceAolGodown?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.destAolGodown?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.sourceBePurchaseBillNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.sourceOriginCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.sourceProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.newProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.stockJvOrNewInvoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.sourceSupplierName?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? rec.entryDate : rec.invoiceOrTallyDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchesGodown && matchesSearch && matchesDate;
  });

  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterGodown !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterGodown("all");
    setStartDate("");
    setEndDate("");
  };

  // Calculate totals
  const totalQty = filteredRecords.reduce((sum, r) => sum + (r.qty || 0), 0);
  const totalTaxable = filteredRecords.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
  const totalGp = filteredRecords.reduce((sum, r) => sum + (r.gp || 0), 0);
  const overallEntries = accountsSts.length;
  const totalFreight = filteredRecords.reduce((sum, r) => sum + (r.freightProvision || 0), 0);
  const totalPurRateSum = filteredRecords.reduce((sum, r) => sum + (r.sourcePurchaseRate || 0), 0);
  const avgPurRate = filteredRecords.length > 0 ? totalPurRateSum / filteredRecords.length : 0;
  const avgRate = totalQty > 0 ? totalTaxable / totalQty : 0;
  const uniqueSrcGodowns = Array.from(new Set(filteredRecords.map((r) => r.sourceAolGodown).filter(Boolean))).length;
  const uniqueSrcBranches = Array.from(new Set(filteredRecords.map((r) => r.sourceAolBranchName).filter(Boolean))).length;
  const uniqueSrcSuppliers = Array.from(new Set(filteredRecords.map((r) => r.sourceSupplierName).filter(Boolean))).length;
  const uniqueSrcProducts = Array.from(new Set(filteredRecords.map((r) => r.sourceProductName).filter(Boolean))).length;
  const uniqueDestGodowns = Array.from(new Set(filteredRecords.map((r) => r.destAolGodown).filter(Boolean))).length;
  const uniqueDestBranches = Array.from(new Set(filteredRecords.map((r) => r.destAolBranchName).filter(Boolean))).length;
  const uniqueNewProducts = Array.from(new Set(filteredRecords.map((r) => r.newProductName).filter(Boolean))).length;

  return (
    <div className="space-y-6">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_sts_apps_script"
        defaultSheetName="Accounts ST"
        collectionKey="accounts_sts"
        records={accountsSts}
        activeUser={activeUser}
        moduleTitle="Accounts Stock Transfer (ST) Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsSts.find((s) => s.id === rec.id);
            if (existing) {
              onUpdateAccountsSt({ ...existing, ...rec });
            } else {
              onAddAccountsSt(rec);
            }
          });
        }}
      />

      {/* Top Header & Summary Cards */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp size={22} className="text-emerald-600" /> Accounts - Stock Transfer (ST)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage inventory transfers between Godowns with complete source and destination tracking.
          </p>
        </div>

        {isAddable && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <Plus size={16} /> New Stock Transfer (ST)
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total ST Transactions</span>
            <Layers size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{filteredRecords.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Transfer Qty (Kg)</span>
            <Package size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Taxable Value</span>
            <DollarSign size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{totalTaxable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total GP</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className={`text-2xl font-bold mt-2 ${totalGp >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            ₹{totalGp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
          <div className="relative flex-1 w-full sm:min-w-[260px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Bill No, Origin Code, Godown, Product, Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={filterGodown}
              onChange={(e) => setFilterGodown(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="all">All Godowns</option>
              {aolGodowns.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name} ({g.branchName})
                </option>
              ))}
            </select>

            <DateRangeFilterPopup
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              dateFilterType={dateFilterType}
              onDateFilterTypeChange={setDateFilterType}
              dateFilterOptions={[
                { label: "Entry Date", value: "entry" },
                { label: "Invoice / Tally Date", value: "invoice" },
              ]}
              isOpen={isDateRangeModalOpen}
              onToggle={setIsDateRangeModalOpen}
            />

            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>

        {isFiltered && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 rounded-lg text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-500" />
              <span>
                Filtered results: <strong>{filteredRecords.length}</strong> of {overallEntries} records
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono">
                Filtered Qty: <strong className="text-slate-900 font-bold">{totalQty.toLocaleString()} Kg</strong>
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table View with Source and To (Destination) Column Groupings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[650px]">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Grouped Section Headers */}
              <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider font-semibold">
                <th colSpan={2} className="px-3 py-2 border-r border-slate-800 text-center">General</th>
                <th colSpan={10} className="px-3 py-2 bg-slate-800 border-r border-slate-700 text-center text-amber-300">
                  Form (Source) Details
                </th>
                <th colSpan={5} className="px-3 py-2 bg-slate-900 border-r border-slate-800 text-center text-emerald-300">
                  Transfer & Value Specs
                </th>
                <th colSpan={5} className="px-3 py-2 bg-slate-800 text-center text-blue-300">
                  To (Destination) Details
                </th>
              </tr>

              {/* Column Headers */}
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                <th className="px-3 py-3 w-12 text-center">Action</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap">Entry Date</th>
                
                {/* Source Columns */}
                <th className="px-3 py-3 w-32 whitespace-nowrap bg-amber-50/50">Source Godown</th>
                <th className="px-3 py-3 w-32 whitespace-nowrap bg-amber-50/50">Source Branch</th>
                <th className="px-3 py-3 w-36 whitespace-nowrap bg-amber-50/50">Supplier Name</th>
                <th className="px-3 py-3 w-36 whitespace-nowrap bg-amber-50/50">Product Name</th>
                <th className="px-3 py-3 w-32 whitespace-nowrap bg-amber-50/50">BE / Purchase Bill No</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap bg-amber-50/50">Container No</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap bg-amber-50/50">Origin Code</th>
                <th className="px-3 py-3 w-24 whitespace-nowrap bg-amber-50/50">Type</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap text-right bg-amber-50/50">Purchase Rate</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap text-right bg-amber-50/50 border-r border-slate-200">Closing Stock</th>

                {/* Transfer Specs */}
                <th className="px-3 py-3 w-24 whitespace-nowrap text-right bg-emerald-50/40">Qty (Kg)</th>
                <th className="px-3 py-3 w-24 whitespace-nowrap text-right bg-emerald-50/40">Rate</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap bg-emerald-50/40">Inv / Tally Date</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap text-right bg-emerald-50/40">Taxable Value</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap text-right bg-emerald-50/40 border-r border-slate-200">GP</th>

                {/* Destination Columns */}
                <th className="px-3 py-3 w-32 whitespace-nowrap bg-blue-50/40">Dest Godown</th>
                <th className="px-3 py-3 w-32 whitespace-nowrap bg-blue-50/40">Dest Branch</th>
                <th className="px-3 py-3 w-32 whitespace-nowrap bg-blue-50/40">Stock JV / New Inv</th>
                <th className="px-3 py-3 w-36 whitespace-nowrap bg-blue-50/40">New Product Name</th>
                <th className="px-3 py-3 w-28 whitespace-nowrap text-right bg-blue-50/40">Freight Provision</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={22} className="px-4 py-12 text-center text-slate-400 font-medium">
                    No Stock Transfer (ST) records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Action */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {isEditable && (
                          <button
                            onClick={() => setEditingRecord(rec)}
                            className="p-1 text-slate-500 hover:text-amber-600 rounded hover:bg-amber-50 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isDeletable && (
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this Stock Transfer record?")) {
                                onDeleteAccountsSt(rec.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Entry Date */}
                    <td className="px-3 py-3 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                      {rec.entryDate || "—"}
                    </td>

                    {/* Source Details */}
                    <td className="px-3 py-3 font-medium text-slate-900 bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceAolGodown || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600 bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceAolBranchName || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-700 bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceSupplierName || "—"}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceProductName || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-800 bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceBePurchaseBillNo || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600 bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceContainerNo || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-500 text-[11px] bg-amber-50/20 whitespace-nowrap">
                      {rec.sourceOriginCode || "—"}
                    </td>
                    <td className="px-3 py-3 bg-amber-50/20 whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        rec.importOrDomestic === "Import" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {rec.importOrDomestic || "Domestic"}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-right bg-amber-50/20 whitespace-nowrap">
                      ₹{(rec.sourcePurchaseRate || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 font-mono text-right bg-amber-50/20 border-r border-slate-200 whitespace-nowrap">
                      {(rec.sourceClosingStock || 0).toLocaleString()}
                    </td>

                    {/* Transfer Specs */}
                    <td className="px-3 py-3 font-mono font-bold text-slate-900 text-right bg-emerald-50/20 whitespace-nowrap">
                      {(rec.qty || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-mono text-right bg-emerald-50/20 whitespace-nowrap">
                      ₹{(rec.rate || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-600 bg-emerald-50/20 whitespace-nowrap">
                      {rec.invoiceOrTallyDate || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-900 text-right bg-emerald-50/20 whitespace-nowrap">
                      ₹{(rec.taxableValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-3 py-3 font-mono font-semibold text-right bg-emerald-50/20 border-r border-slate-200 whitespace-nowrap ${
                      (rec.gp || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}>
                      ₹{(rec.gp || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Destination Details */}
                    <td className="px-3 py-3 font-semibold text-slate-900 bg-blue-50/20 whitespace-nowrap">
                      {rec.destAolGodown || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600 bg-blue-50/20 whitespace-nowrap">
                      {rec.destAolBranchName || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-800 bg-blue-50/20 whitespace-nowrap">
                      {rec.stockJvOrNewInvoiceNo || "—"}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 bg-blue-50/20 whitespace-nowrap">
                      {rec.newProductName || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-right bg-blue-50/20 whitespace-nowrap">
                      ₹{(rec.freightProvision || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueSrcGodowns} Godowns</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueSrcBranches} Branches</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueSrcSuppliers} Suppliers</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueSrcProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                    Avg: ₹{avgPurRate.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    {totalQty.toLocaleString("en-IN")} Kg
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                    Avg: ₹{avgRate.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    ₹{totalGp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueDestGodowns} Godowns</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueDestBranches} Branches</span>
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueNewProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-300">
                    ₹{totalFreight.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE STOCK TRANSFER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRight size={20} className="text-emerald-400" />
                <h3 className="text-base font-bold">New Stock Transfer (ST) Entry</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Entry Date */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-700">Creation / Entry Date (Auto)</div>
                <input
                  type="date"
                  value={newEntryDate}
                  readOnly
                  disabled
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-mono font-semibold text-slate-600 bg-slate-100 cursor-not-allowed"
                />
              </div>

              {/* SECTION 1: FORM (SOURCE) */}
              <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={16} className="text-amber-600" /> Form (Source) Details
                  </h4>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">Source Godown</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source AOL Godown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Source AOL Godown</label>
                    <select
                      value={selectedSourceGodown}
                      onChange={(e) => {
                        setSelectedSourceGodown(e.target.value);
                        setSelectedPidKey("");
                      }}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select Source Godown</option>
                      {aolGodowns.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name} ({g.branchName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Key Combination Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      PID Record Key Combination (Closing Stock &gt; 0)
                    </label>
                    <select
                      value={selectedPidKey}
                      onChange={(e) => handlePidSelect(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select PID Key...</option>
                      {godownFilteredPids.map((p) => {
                        const dateFormatted = formatDateDdMmmYy(p.date || p.beOrPurchaseDate || "");
                        return (
                          <option key={p.id} value={p.id}>
                            {p.purchaseBeOrNo || "No-BE"} | {p.originCode || p.id} | {p.containerNo || "No-Cont"} | {dateFormatted} | Stock: {p.closingStock}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Auto-displayed fields from PID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-amber-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">AOL Branch Name</span>
                    <span className="font-semibold text-slate-900">{sourceAolBranch || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Supplier Name</span>
                    <span className="font-semibold text-slate-900">{sourceSupplier || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Product Name</span>
                    <span className="font-semibold text-slate-900">{sourceProduct || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">BE / Purchase Bill No</span>
                    <span className="font-mono font-semibold text-slate-900">{sourceBillNo || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Container No</span>
                    <span className="font-mono text-slate-800">{sourceContainerNo || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Origin Code</span>
                    <span className="font-mono text-slate-800">{sourceOriginCode || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Purchase Rate</span>
                    <span className="font-mono font-semibold text-slate-900">₹{sourcePurchaseRate}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Import / Domestic</span>
                    <span className="font-semibold text-slate-900">{importOrDomestic}</span>
                  </div>

                  <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Current Closing Stock in Source</span>
                    <span className="font-mono font-bold text-emerald-700">{sourceClosingStock.toLocaleString()} Kg</span>
                  </div>
                </div>

                {/* Transfer Inputs: Qty, Rate, Invoice/Tally Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Transfer Qty (Kg)</label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      max={sourceClosingStock > 0 ? sourceClosingStock : undefined}
                      placeholder="Enter Qty"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      required
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:outline-none ${
                        qtyNum <= 0 && newQty !== ""
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : sourceClosingStock > 0 && qtyNum > sourceClosingStock
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 focus:ring-slate-900"
                      }`}
                    />
                    {qtyNum < 0 && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">
                        Transfer Qty cannot be negative.
                      </p>
                    )}
                    {qtyNum === 0 && newQty !== "" && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">
                        Transfer Qty must be greater than 0.
                      </p>
                    )}
                    {sourceClosingStock > 0 && qtyNum > sourceClosingStock && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">
                        Exceeds Source Stock ({sourceClosingStock.toLocaleString()} Kg).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter Rate"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Invoice / Tally Date</label>
                    <input
                      type="date"
                      value={newInvoiceDate}
                      onChange={(e) => setNewInvoiceDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: TO (DESTINATION) */}
              <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" /> To (Destination) Details
                  </h4>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">Destination Godown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination AOL Godown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Destination AOL Godown</label>
                    <select
                      value={selectedDestGodown}
                      onChange={(e) => handleDestGodownChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select Destination Godown</option>
                      {aolGodowns.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name} ({g.branchName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination Branch Name (Auto) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">AOL Branch Name (Auto)</label>
                    <input
                      type="text"
                      value={destAolBranch}
                      readOnly
                      placeholder="Auto displayed"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stock JV / New Invoice No */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Stock JV / New Invoice No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter JV / Invoice No"
                      value={newStockJvNo}
                      onChange={(e) => setNewStockJvNo(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* New Product Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      New Product Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Freight Provision */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Freight Provision (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={newFreightProvision}
                      onChange={(e) => setNewFreightProvision(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Provision Loading / Unloading */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Provision Loading / Unloading (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={newLoadingUnloading}
                      onChange={(e) => setNewLoadingUnloading(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* AUTO CALCULATED SUMMARY */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Auto Calculated Financial Summary</span>
                  <div className="flex items-center gap-4 text-xs">
                    <div>Taxable Value: <span className="font-mono font-bold text-emerald-400">₹{taxableVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div>GP: <span className={`font-mono font-bold ${gpVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>₹{gpVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition shadow-sm"
                  >
                    Save Stock Transfer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-amber-400" />
                <h3 className="text-base font-bold">Edit Stock Transfer (ST) Entry</h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Entry Date */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-700">Creation / Entry Date</div>
                <input
                  type="date"
                  value={editingRecord.entryDate || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, entryDate: e.target.value })}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-mono font-semibold text-slate-800 bg-white"
                />
              </div>

              {/* SECTION 1: FORM (SOURCE) */}
              <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={16} className="text-amber-600" /> Form (Source) Details
                  </h4>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">Source Godown</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source AOL Godown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Source AOL Godown <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editingRecord.sourceAolGodown || ""}
                      onChange={(e) => {
                        const newSourceG = e.target.value;
                        const foundGodown = aolGodowns.find((g) => g.name === newSourceG);
                        setEditingRecord({
                          ...editingRecord,
                          sourceAolGodown: newSourceG,
                          sourceAolBranchName: foundGodown?.branchName || editingRecord.sourceAolBranchName,
                        });
                      }}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select Source Godown</option>
                      {aolGodowns.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name} ({g.branchName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Key Combination Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      PID Record Key Combination
                    </label>
                    <select
                      value={editingRecord.sourcePidId || ""}
                      onChange={(e) => handleEditPidSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select PID Key...</option>
                      {pids
                        .filter((p) => !editingRecord.sourceAolGodown || p.aolGodown?.toLowerCase() === editingRecord.sourceAolGodown.toLowerCase() || !p.aolGodown)
                        .map((p) => {
                          const dateFormatted = formatDateDdMmmYy(p.date || p.beOrPurchaseDate || "");
                          return (
                            <option key={p.id} value={p.id}>
                              {p.purchaseBeOrNo || "No-BE"} | {p.originCode || p.id} | {p.containerNo || "No-Cont"} | {dateFormatted} | Stock: {p.closingStock}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                {/* Auto-displayed / editable fields from PID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-amber-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">AOL Branch Name</span>
                    <span className="font-semibold text-slate-900">{editingRecord.sourceAolBranchName || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Supplier Name</span>
                    <span className="font-semibold text-slate-900">{editingRecord.sourceSupplierName || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Product Name</span>
                    <span className="font-semibold text-slate-900">{editingRecord.sourceProductName || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">BE / Purchase Bill No</span>
                    <span className="font-mono font-semibold text-slate-900">{editingRecord.sourceBePurchaseBillNo || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Container No</span>
                    <span className="font-mono text-slate-800">{editingRecord.sourceContainerNo || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Origin Code</span>
                    <span className="font-mono text-slate-800">{editingRecord.sourceOriginCode || "—"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Purchase Rate</span>
                    <span className="font-mono font-semibold text-slate-900">₹{editingRecord.sourcePurchaseRate || 0}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Import / Domestic</span>
                    <span className="font-semibold text-slate-900">{editingRecord.importOrDomestic || "Domestic"}</span>
                  </div>

                  <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Current Closing Stock in Source</span>
                    <span className="font-mono font-bold text-emerald-700">{(editingRecord.sourceClosingStock || 0).toLocaleString()} Kg</span>
                  </div>
                </div>

                {/* Transfer Inputs: Qty, Rate, Invoice/Tally Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transfer Qty (Kg) <span className="text-rose-500">*</span>
                      {(editingRecord.sourceClosingStock || 0) > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal normal-case ml-1">
                          (Max: {(editingRecord.sourceClosingStock || 0).toLocaleString()} Kg)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      max={(editingRecord.sourceClosingStock || 0) > 0 ? editingRecord.sourceClosingStock : undefined}
                      placeholder="Enter Qty"
                      value={editingRecord.qty || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, qty: parseFloat(e.target.value) || 0 })}
                      required
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:outline-none ${
                        (editingRecord.qty || 0) <= 0 ||
                        ((editingRecord.sourceClosingStock || 0) > 0 && (editingRecord.qty || 0) > (editingRecord.sourceClosingStock || 0))
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20 text-rose-900"
                          : "border-slate-200 focus:ring-slate-900"
                      }`}
                    />
                    {(editingRecord.qty || 0) < 0 && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">
                        Transfer Qty cannot be negative.
                      </p>
                    )}
                    {(editingRecord.qty || 0) === 0 && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">
                        Transfer Qty must be greater than 0.
                      </p>
                    )}
                    {(editingRecord.sourceClosingStock || 0) > 0 && (editingRecord.qty || 0) > (editingRecord.sourceClosingStock || 0) && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">
                        Exceeds Source Stock ({(editingRecord.sourceClosingStock || 0).toLocaleString()} Kg).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Rate (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter Rate"
                      value={editingRecord.rate || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, rate: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Invoice / Tally Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingRecord.invoiceOrTallyDate || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, invoiceOrTallyDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: TO (DESTINATION) */}
              <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" /> To (Destination) Details
                  </h4>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">Destination Godown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination AOL Godown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Destination AOL Godown <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editingRecord.destAolGodown || ""}
                      onChange={(e) => handleEditDestGodownChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select Destination Godown</option>
                      {aolGodowns.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name} ({g.branchName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination Branch Name (Auto) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">AOL Branch Name (Auto)</label>
                    <input
                      type="text"
                      value={editingRecord.destAolBranchName || ""}
                      readOnly
                      placeholder="Auto displayed"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stock JV / New Invoice No */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Stock JV / New Invoice No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter JV / Invoice No"
                      value={editingRecord.stockJvOrNewInvoiceNo || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, stockJvOrNewInvoiceNo: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* New Product Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      New Product Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editingRecord.newProductName || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, newProductName: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Freight Provision */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Freight Provision (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={editingRecord.freightProvision || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, freightProvision: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Provision Loading / Unloading */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Provision Loading / Unloading (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={editingRecord.provisionLoadingUnloading || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, provisionLoadingUnloading: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* AUTO CALCULATED SUMMARY */}
              {(() => {
                const editQtyNum = editingRecord.qty || 0;
                const editRateNum = editingRecord.rate || 0;
                const editPurchaseRateNum = editingRecord.sourcePurchaseRate || 0;
                const editTaxableVal = editQtyNum * editRateNum;
                const editGpVal = (editRateNum - editPurchaseRateNum) * editQtyNum;

                return (
                  <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Auto Calculated Financial Summary</span>
                      <div className="flex items-center gap-4 text-xs">
                        <div>Taxable Value: <span className="font-mono font-bold text-emerald-400">₹{editTaxableVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        <div>GP: <span className={`font-mono font-bold ${editGpVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>₹{editGpVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setEditingRecord(null)}
                        className="flex-1 sm:flex-none px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 sm:flex-none px-6 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-500 transition shadow-sm"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Stock Transfer (ST) Details</h3>
              <button onClick={() => setViewingRecord(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Source Godown</span>
                  <span className="font-bold text-slate-900">{viewingRecord.sourceAolGodown || "—"} ({viewingRecord.sourceAolBranchName})</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Destination Godown</span>
                  <span className="font-bold text-slate-900">{viewingRecord.destAolGodown || "—"} ({viewingRecord.destAolBranchName})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">BE / Purchase Bill No</span>
                  <span className="font-mono font-semibold text-slate-900">{viewingRecord.sourceBePurchaseBillNo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Origin Code</span>
                  <span className="font-mono text-slate-800">{viewingRecord.sourceOriginCode || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Container No</span>
                  <span className="font-mono text-slate-800">{viewingRecord.sourceContainerNo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Supplier Name</span>
                  <span className="font-semibold text-slate-900">{viewingRecord.sourceSupplierName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Source Product</span>
                  <span className="font-semibold text-slate-900">{viewingRecord.sourceProductName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">New Product</span>
                  <span className="font-semibold text-slate-900">{viewingRecord.newProductName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Transfer Qty</span>
                  <span className="font-mono font-bold text-slate-900">{(viewingRecord.qty || 0).toLocaleString()} Kg</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Transfer Rate</span>
                  <span className="font-mono font-bold text-slate-900">₹{viewingRecord.rate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Purchase Rate</span>
                  <span className="font-mono font-semibold text-slate-700">₹{viewingRecord.sourcePurchaseRate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Taxable Value</span>
                  <span className="font-mono font-bold text-emerald-700">₹{(viewingRecord.taxableValue || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">GP</span>
                  <span className={`font-mono font-bold ${(viewingRecord.gp || 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    ₹{(viewingRecord.gp || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Stock JV / Invoice No</span>
                  <span className="font-mono font-semibold text-slate-900">{viewingRecord.stockJvOrNewInvoiceNo || "—"}</span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-5 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
