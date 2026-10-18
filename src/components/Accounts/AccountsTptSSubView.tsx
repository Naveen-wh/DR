/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AccountsTptSRecord, AccountsSalesRecord, TransporterName, TptdCategory, AolBranchName, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Truck, Calendar, DollarSign, AlertCircle, Hash, Building2, Tag, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface AccountsTptSSubViewProps {
  activeUserId: string;
  users: User[];
  accountsTpts?: AccountsTptSRecord[];
  accountsSales?: AccountsSalesRecord[];
  transporters?: TransporterName[];
  tptdCategories?: TptdCategory[];
  aolBranches?: AolBranchName[];
  onAddAccountsTptS: (record: Omit<AccountsTptSRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsTptS: (record: AccountsTptSRecord) => Promise<void> | void;
  onDeleteAccountsTptS: (id: string) => Promise<void> | void;
  canAdd?: boolean;
  canEdit?: boolean;
}

function formatDateDdMmmYy(dateStr?: string): string {
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
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

export default function AccountsTptSSubView({
  activeUserId,
  users,
  accountsTpts = [],
  accountsSales = [],
  transporters = [],
  tptdCategories = [],
  aolBranches = [],
  onAddAccountsTptS,
  onUpdateAccountsTptS,
  onDeleteAccountsTptS,
  canAdd = true,
  canEdit = true,
}: AccountsTptSSubViewProps) {
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
    "accounts_tpt_s_apps_script",
    "Accounts TPT S",
    "accounts_tpt_s"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsTptSRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsTptSRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [aolBranchName, setAolBranchName] = useState("");
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [transporterName, setTransporterName] = useState("");
  const [saleInvoiceNo, setSaleInvoiceNo] = useState("");
  const [category, setCategory] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [provisionAmount, setProvisionAmount] = useState("");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto provision amount logic
  useEffect(() => {
    if (!aolBranchName || !saleInvoiceNo || !category) {
      setProvisionAmount("");
      return;
    }
    const matched = accountsSales.find(
      (s) =>
        s.aolBranchName?.toLowerCase() === aolBranchName.toLowerCase() &&
        s.saleInvoiceNo?.trim().toLowerCase() === saleInvoiceNo.trim().toLowerCase()
    );
    if (matched) {
      const catLower = category.toLowerCase();
      if (catLower.includes("freight")) {
        setProvisionAmount(matched.freightProvision !== undefined ? String(matched.freightProvision) : "");
      } else if (catLower.includes("loading") || catLower.includes("unloading")) {
        setProvisionAmount(
          matched.provisionLoadingUnloading !== undefined ? String(matched.provisionLoadingUnloading) : ""
        );
      } else {
        setProvisionAmount("");
      }
    } else {
      setProvisionAmount("");
    }
  }, [aolBranchName, saleInvoiceNo, category, accountsSales]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setAolBranchName("");
    setTallyDate(new Date().toISOString().split("T")[0]);
    setTransporterName("");
    setSaleInvoiceNo("");
    setCategory("");
    setActualAmount("");
    setProvisionAmount("");
    setDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AccountsTptSRecord) => {
    setEditingRecord(rec);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setAolBranchName(rec.aolBranchName || "");
    setTallyDate(rec.tallyDate || new Date().toISOString().split("T")[0]);
    setTransporterName(rec.transporterName || "");
    setSaleInvoiceNo(rec.saleInvoiceNo || "");
    setCategory(rec.category || "");
    setActualAmount(rec.actualAmount !== undefined ? String(rec.actualAmount) : "");
    setProvisionAmount(rec.provisionAmount !== undefined ? String(rec.provisionAmount) : "");
    setDescription(rec.description || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aolBranchName.trim()) {
      setFormError("Please select AOL Branch Name.");
      return;
    }
    if (!transporterName.trim()) {
      setFormError("Please select Transporter Name.");
      return;
    }
    if (!saleInvoiceNo.trim()) {
      setFormError("Please select Sale Invoice No.");
      return;
    }
    if (!category.trim()) {
      setFormError("Please select Category.");
      return;
    }
    if (!actualAmount.trim()) {
      setFormError("Please enter Actual Amount.");
      return;
    }

    // Duplication check with key combination of Sale Invoice No and Category
    const isDuplicate = accountsTpts.some((rec) => {
      if (editingRecord && rec.id === editingRecord.id) {
        return false;
      }
      return (
        (rec.saleInvoiceNo || "").trim().toLowerCase() === saleInvoiceNo.trim().toLowerCase() &&
        (rec.category || "").trim().toLowerCase() === category.trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      setFormError(`A TPT-S record already exists for Sale Invoice No "${saleInvoiceNo}" with Category "${category}". Duplicate entries are not allowed.`);
      return;
    }

    const parsedActual = parseFloat(actualAmount) || 0;
    const parsedProvision = provisionAmount.trim() ? parseFloat(provisionAmount) : undefined;
    const effectiveFreight = -1 * parsedActual;

    setIsSaving(true);
    setFormError("");

    try {
      if (editingRecord) {
        const updated: AccountsTptSRecord = {
          ...editingRecord,
          entryDate: entryDate || new Date().toISOString().split("T")[0],
          aolBranchName,
          tallyDate,
          transporterName,
          saleInvoiceNo,
          category,
          actualAmount: parsedActual,
          provisionAmount: parsedProvision,
          description,
          effectiveFreight,
        };
        await onUpdateAccountsTptS(updated);
      } else {
        await onAddAccountsTptS({
          entryDate: entryDate || new Date().toISOString().split("T")[0],
          aolBranchName,
          tallyDate,
          transporterName,
          saleInvoiceNo,
          category,
          actualAmount: parsedActual,
          provisionAmount: parsedProvision,
          description,
          effectiveFreight,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await onDeleteAccountsTptS(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  // Lists from props or defaults
  const branchOptions = aolBranches.length > 0 ? aolBranches.map((b) => b.name) : ["Mumbai", "Chennai", "Silvassa", "Gujarat"];
  const transporterOptions = transporters.length > 0 ? transporters.map((t) => t.name) : ["Default Transporter"];
  const categoryOptions = tptdCategories.length > 0 ? tptdCategories.map((c) => c.name) : ["Freight", "Loading / Unloading", "Other"];

  // Unique Sale Invoice options from sales, optionally filtered by selected aolBranchName and category
  const rawInvoiceOptions = accountsSales
    .filter((s) => !aolBranchName || s.aolBranchName?.toLowerCase() === aolBranchName.toLowerCase())
    .map((s) => s.saleInvoiceNo)
    .filter((val): val is string => typeof val === "string" && val.trim() !== "");

  const uniqueSaleInvoiceOptions = Array.from(new Set(rawInvoiceOptions))
    .filter((inv) => {
      if (!category) return true;
      const alreadyExists = accountsTpts.some((rec) => {
        if (editingRecord && rec.id === editingRecord.id) return false;
        return (
          (rec.saleInvoiceNo || "").trim().toLowerCase() === inv.trim().toLowerCase() &&
          (rec.category || "").trim().toLowerCase() === category.trim().toLowerCase()
        );
      });
      return !alreadyExists;
    })
    .sort();

  // Ensure current saleInvoiceNo is in the options list to prevent blank selected value
  const finalInvoiceOptions = [...uniqueSaleInvoiceOptions];
  if (saleInvoiceNo && !finalInvoiceOptions.includes(saleInvoiceNo)) {
    finalInvoiceOptions.unshift(saleInvoiceNo);
  }

  const handleInvoiceChange = (selectedInvoice: string) => {
    setSaleInvoiceNo(selectedInvoice);
    if (selectedInvoice) {
      const matched = accountsSales.find(
        (s) => s.saleInvoiceNo?.trim().toLowerCase() === selectedInvoice.trim().toLowerCase()
      );
      if (matched && matched.aolBranchName) {
        setAolBranchName(matched.aolBranchName);
      }
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    if (saleInvoiceNo && newCategory) {
      const exists = accountsTpts.some((rec) => {
        if (editingRecord && rec.id === editingRecord.id) return false;
        return (
          (rec.saleInvoiceNo || "").trim().toLowerCase() === saleInvoiceNo.trim().toLowerCase() &&
          (rec.category || "").trim().toLowerCase() === newCategory.trim().toLowerCase()
        );
      });
      if (exists) {
        setSaleInvoiceNo("");
      }
    }
  };

  // Filtered list
  const filteredRecords = accountsTpts.filter((rec) => {
    const matchesSearch =
      (rec.saleInvoiceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.transporterName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.aolBranchName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? rec.entryDate : rec.tallyDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesBranch && matchesDate;
  });

  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterBranch !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setStartDate("");
    setEndDate("");
  };

  // KPI Calculations
  const totalEntries = filteredRecords.length;
  const overallEntries = accountsTpts.length;
  const totalActualAmount = filteredRecords.reduce((sum, r) => sum + (r.actualAmount || 0), 0);
  const totalEffectiveFreight = filteredRecords.reduce((sum, r) => sum + (r.effectiveFreight || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_tpt_s_apps_script"
        defaultSheetName="Accounts TPT S"
        collectionKey="accounts_tpt_s"
        records={accountsTpts}
        activeUser={activeUser}
        moduleTitle="Accounts Transport S (TPT-S) Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsTpts.find((t) => t.id === rec.id);
            if (existing) {
              onUpdateAccountsTptS({ ...existing, ...rec });
            } else {
              onAddAccountsTptS(rec);
            }
          });
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TPT-S Records</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage transporter provisions, sale invoice loading & freight tracking</p>
          </div>
        </div>

        {isAddable && (
          <button
            id="btn-add-tpt-s-record"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            New TPT-S Entry
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total TPT-S Entries</span>
            <Truck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalEntries}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Actual Amount</span>
            <DollarSign className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-700 font-mono">{formatCurrency(totalActualAmount)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Effective Freight</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-700 font-mono">{formatCurrency(totalEffectiveFreight)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice No, Transporter, Category, Branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
            >
              <option value="all">All AOL Branches</option>
              {branchOptions.map((bName) => (
                <option key={bName} value={bName}>{bName}</option>
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
                { label: "Tally Date", value: "tally" },
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
                Filtered Actual Amount: <strong className="text-emerald-700 font-bold">{formatCurrency(totalActualAmount)}</strong>
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

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-bold tracking-wider">
                <th className="px-3 py-3">Entry Date</th>
                <th className="px-3 py-3">AOL Branch</th>
                <th className="px-3 py-3">Transporter</th>
                <th className="px-3 py-3">Sale Invoice No</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Tally Date</th>
                <th className="px-3 py-3 text-right">Actual Amt</th>
                <th className="px-3 py-3 text-right">Provision Amt</th>
                <th className="px-3 py-3 text-right">Effective Freight</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="w-8 h-8 text-slate-300" />
                      <p>No TPT-S records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {formatDateDdMmmYy(rec.entryDate)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-semibold">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {rec.aolBranchName || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-900 font-bold whitespace-nowrap">
                      {rec.transporterName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-900 font-medium whitespace-nowrap">
                      {rec.saleInvoiceNo || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                      {rec.category || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {formatDateDdMmmYy(rec.tallyDate)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                      {formatCurrency(rec.actualAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-500">
                      {rec.provisionAmount !== undefined ? formatCurrency(rec.provisionAmount) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-rose-600">
                      {formatCurrency(rec.effectiveFreight)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={rec.description}>
                      {rec.description || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          title="View Details"
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isEditable && (
                          <button
                            onClick={() => openEditModal(rec)}
                            title="Edit Record"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isDeletable && (
                          <button
                            onClick={() => setDeletingId(rec.id)}
                            title="Delete Record"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">
                      {Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length} Branches
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">
                      {Array.from(new Set(filteredRecords.map((r) => r.transporterName).filter(Boolean))).length} Transporters
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">
                      {Array.from(new Set(filteredRecords.map((r) => r.saleInvoiceNo).filter(Boolean))).length} Invoices
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">
                      {Array.from(new Set(filteredRecords.map((r) => r.category).filter(Boolean))).length} Categories
                    </span>
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      {formatCurrency(totalActualAmount)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    <span className="font-extrabold text-slate-300 block text-xs">
                      {formatCurrency(filteredRecords.reduce((sum, r) => sum + (r.provisionAmount || 0), 0))}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    <span className="font-extrabold text-rose-400 block text-xs">
                      {formatCurrency(totalEffectiveFreight)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal - Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {editingRecord ? "Edit TPT-S Record" : "New TPT-S Entry"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entry Date (Auto Readonly) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="date"
                    readOnly
                    value={entryDate}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>

                {/* AOL Branch Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    AOL Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={aolBranchName}
                    onChange={(e) => setAolBranchName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select AOL Branch</option>
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TALLY DATE */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Tally Date
                  </label>
                  <input
                    type="date"
                    value={tallyDate}
                    onChange={(e) => setTallyDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transporter Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Transporter Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select Transporter</option>
                    {transporterOptions.map((tName) => (
                      <option key={tName} value={tName}>
                        {tName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SALE INVOICE NO */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Sale Invoice No <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={saleInvoiceNo}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Select Invoice No</option>
                    {finalInvoiceOptions.map((inv) => (
                      <option key={inv} value={inv}>
                        {inv}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actual Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Actual Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* PROVISION Amount (Auto Fetched) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Provision Amount (₹) <span className="text-slate-400 font-normal">(Auto Fetched)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-calculated from Sales entry"
                    value={provisionAmount ? formatCurrency(parseFloat(provisionAmount)) : "—"}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>

                {/* Effective Freight (Auto -ve of Actual Amount) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Effective Freight <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={actualAmount ? formatCurrency(-1 * (parseFloat(actualAmount) || 0)) : "—"}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-slate-100 text-rose-600 font-bold cursor-not-allowed focus:outline-none"
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional notes or remark..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingRecord ? "Update Entry" : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - View Record Details */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  TPT-S Record Details
                </h2>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Entry Date</p>
                  <p className="font-bold text-slate-800">{formatDateDdMmmYy(viewingRecord.entryDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Tally Date</p>
                  <p className="font-bold text-slate-800">{formatDateDdMmmYy(viewingRecord.tallyDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">AOL Branch Name</p>
                  <p className="font-bold text-slate-900">{viewingRecord.aolBranchName || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Category</p>
                  <p className="font-bold text-slate-900">{viewingRecord.category || "—"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Transporter Name:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.transporterName || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Sale Invoice No:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.saleInvoiceNo || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Actual Amount:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(viewingRecord.actualAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Provision Amount (Sales):</span>
                  <span className="font-bold text-slate-900">
                    {viewingRecord.provisionAmount !== undefined ? formatCurrency(viewingRecord.provisionAmount) : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 bg-rose-50 px-2 rounded-lg border border-rose-100">
                  <span className="font-bold text-rose-900">Effective Freight:</span>
                  <span className="font-black text-rose-700">{formatCurrency(viewingRecord.effectiveFreight)}</span>
                </div>
              </div>

              {viewingRecord.description && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase mb-1">Description</p>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 leading-relaxed border border-slate-100">
                    {viewingRecord.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this TPT-S record? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
