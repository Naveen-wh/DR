/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AccountsTptStRecord, AccountsStRecord, TransporterName, TptdCategory, AolBranchName, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Truck, Calendar, DollarSign, AlertCircle, Hash, Building2, Tag, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../Configuration/AppsScriptSyncBanner";

interface AccountsTptStSubViewProps {
  activeUserId: string;
  users: User[];
  accountsTptSts?: AccountsTptStRecord[];
  accountsSts?: AccountsStRecord[];
  transporters?: TransporterName[];
  tptdCategories?: TptdCategory[];
  aolBranches?: AolBranchName[];
  onAddAccountsTptSt: (record: Omit<AccountsTptStRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsTptSt: (record: AccountsTptStRecord) => Promise<void> | void;
  onDeleteAccountsTptSt: (id: string) => Promise<void> | void;
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

export default function AccountsTptStSubView({
  activeUserId,
  users,
  accountsTptSts = [],
  accountsSts = [],
  transporters = [],
  tptdCategories = [],
  aolBranches = [],
  onAddAccountsTptSt,
  onUpdateAccountsTptSt,
  onDeleteAccountsTptSt,
  canAdd = true,
  canEdit = true,
}: AccountsTptStSubViewProps) {
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
    "accounts_tpt_st_apps_script",
    "Accounts TPT ST",
    "accounts_tpt_st"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsTptStRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsTptStRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [aolBranchName, setAolBranchName] = useState("");
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [transporterName, setTransporterName] = useState("");
  const [stockJvOrNewInvoiceNo, setStockJvOrNewInvoiceNo] = useState("");
  const [category, setCategory] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [provisionAmount, setProvisionAmount] = useState("");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Cascading ST list for selected branch
  const availableStRecords = aolBranchName
    ? accountsSts.filter(
        (st) =>
          st.destAolBranchName?.toLowerCase() === aolBranchName.toLowerCase() ||
          st.sourceAolBranchName?.toLowerCase() === aolBranchName.toLowerCase()
      )
    : accountsSts;

  // Existing records in current table for this branch and category (excluding editing record if any)
  const existingRecordsForBranchAndCategory = accountsTptSts.filter((rec) => {
    if (editingRecord && rec.id === editingRecord.id) return false;
    if (!aolBranchName || !category) return false;
    return (
      rec.aolBranchName?.toLowerCase() === aolBranchName.toLowerCase() &&
      rec.category?.toLowerCase() === category.toLowerCase() &&
      rec.stockJvOrNewInvoiceNo
    );
  });

  const usedInvoiceNosForCategory = new Set(
    existingRecordsForBranchAndCategory.map((r) => r.stockJvOrNewInvoiceNo!.trim().toLowerCase())
  );

  const rawStInvoiceNos = Array.from(
    new Set(availableStRecords.map((st) => st.stockJvOrNewInvoiceNo).filter(Boolean))
  ) as string[];

  const uniqueStInvoiceNos = rawStInvoiceNos.filter(
    (inv) => !usedInvoiceNosForCategory.has(inv.trim().toLowerCase())
  );

  // Auto provision amount logic from ST
  useEffect(() => {
    if (!aolBranchName || !stockJvOrNewInvoiceNo || !category) {
      setProvisionAmount("");
      return;
    }
    const matched = accountsSts.find(
      (st) =>
        (st.destAolBranchName?.toLowerCase() === aolBranchName.toLowerCase() ||
          st.sourceAolBranchName?.toLowerCase() === aolBranchName.toLowerCase()) &&
        st.stockJvOrNewInvoiceNo?.trim().toLowerCase() === stockJvOrNewInvoiceNo.trim().toLowerCase()
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
  }, [aolBranchName, stockJvOrNewInvoiceNo, category, accountsSts]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setAolBranchName("");
    setTallyDate(new Date().toISOString().split("T")[0]);
    setTransporterName("");
    setStockJvOrNewInvoiceNo("");
    setCategory("");
    setActualAmount("");
    setProvisionAmount("");
    setDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AccountsTptStRecord) => {
    setEditingRecord(rec);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setAolBranchName(rec.aolBranchName || "");
    setTallyDate(rec.tallyDate || new Date().toISOString().split("T")[0]);
    setTransporterName(rec.transporterName || "");
    setStockJvOrNewInvoiceNo(rec.stockJvOrNewInvoiceNo || "");
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
      setFormError("AOL Branch Name is required.");
      return;
    }
    if (!tallyDate) {
      setFormError("Tally Date is required.");
      return;
    }
    if (!transporterName.trim()) {
      setFormError("Transporter Name is required.");
      return;
    }
    if (!stockJvOrNewInvoiceNo.trim()) {
      setFormError("Stock JV / New Invoice No is required.");
      return;
    }
    if (!category.trim()) {
      setFormError("Category is required.");
      return;
    }
    if (actualAmount === "" || isNaN(Number(actualAmount))) {
      setFormError("Valid Actual Amount is required.");
      return;
    }

    const actualNum = Number(actualAmount);
    const provNum = provisionAmount !== "" && !isNaN(Number(provisionAmount)) ? Number(provisionAmount) : undefined;
    const effectiveFreightNum = -1 * actualNum;

    setIsSaving(true);
    setFormError("");

    try {
      if (editingRecord) {
        await onUpdateAccountsTptSt({
          ...editingRecord,
          entryDate,
          aolBranchName,
          tallyDate,
          transporterName,
          stockJvOrNewInvoiceNo,
          category,
          actualAmount: actualNum,
          provisionAmount: provNum,
          description,
          effectiveFreight: effectiveFreightNum,
        });
      } else {
        await onAddAccountsTptSt({
          entryDate,
          aolBranchName,
          tallyDate,
          transporterName,
          stockJvOrNewInvoiceNo,
          category,
          actualAmount: actualNum,
          provisionAmount: provNum,
          description,
          effectiveFreight: effectiveFreightNum,
          createdByUserId: activeUser.id,
          createdByName: activeUser.name,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered records
  const filteredRecords = accountsTptSts.filter((rec) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (rec.transporterName && rec.transporterName.toLowerCase().includes(query)) ||
      (rec.stockJvOrNewInvoiceNo && rec.stockJvOrNewInvoiceNo.toLowerCase().includes(query)) ||
      (rec.category && rec.category.toLowerCase().includes(query)) ||
      (rec.description && rec.description.toLowerCase().includes(query)) ||
      (rec.aolBranchName && rec.aolBranchName.toLowerCase().includes(query));

    const matchesBranch = filterBranch === "all" || rec.aolBranchName?.toLowerCase() === filterBranch.toLowerCase();

    if (!matchesSearch || !matchesBranch) return false;

    if (startDate || endDate) {
      const targetDate = dateFilterType === "entry" ? rec.entryDate : rec.tallyDate;
      if (!targetDate) return false;
      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;
    }

    return true;
  });

  const isFiltered = Boolean(searchTerm.trim() || filterBranch !== "all" || startDate || endDate);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setStartDate("");
    setEndDate("");
  };

  // Metrics for footer
  const totalActualAmount = filteredRecords.reduce((sum, r) => sum + (Number(r.actualAmount) || 0), 0);
  const totalProvisionAmount = filteredRecords.reduce((sum, r) => sum + (Number(r.provisionAmount) || 0), 0);
  const totalEffectiveFreight = filteredRecords.reduce((sum, r) => sum + (Number(r.effectiveFreight) || 0), 0);

  const uniqueBranchesCount = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueTransportersCount = Array.from(new Set(filteredRecords.map((r) => r.transporterName).filter(Boolean))).length;
  const uniqueCategoriesCount = Array.from(new Set(filteredRecords.map((r) => r.category).filter(Boolean))).length;
  const uniqueInvoicesCount = Array.from(new Set(filteredRecords.map((r) => r.stockJvOrNewInvoiceNo).filter(Boolean))).length;

  return (
    <div className="space-y-4">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_tpt_st_apps_script"
        defaultSheetName="Accounts TPT ST"
        collectionKey="accounts_tpt_st"
        records={accountsTptSts}
        activeUser={activeUser}
        moduleTitle="Accounts Transport ST (TPT-ST) Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsTptSts.find((t) => t.id === rec.id);
            if (existing) {
              onUpdateAccountsTptSt({ ...existing, ...rec });
            } else {
              onAddAccountsTptSt(rec);
            }
          });
        }}
      />

      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transporter, invoice, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-200 bg-white pl-8 pr-3 py-1.5 rounded-lg w-52 sm:w-64 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 size={13} className="text-slate-400" />
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Branches</option>
              {aolBranches.map((b) => (
                <option key={b.id || b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Popup */}
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
        </div>

        {/* Add Record Button */}
        {isAddable && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Add TPT-ST Entry</span>
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Entry Date</th>
                <th className="py-3 px-3">Dest Branch</th>
                <th className="py-3 px-3">Tally Date</th>
                <th className="py-3 px-3">Transporter</th>
                <th className="py-3 px-3">Stock JV / New Inv No</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Actual Amount</th>
                <th className="py-3 px-3 text-right">Provision Amt</th>
                <th className="py-3 px-3 text-right">Effective Freight</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Truck size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-sm">No TPT-ST records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Add TPT-ST Entry" to create a new record.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateDdMmmYy(rec.entryDate)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{rec.aolBranchName || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateDdMmmYy(rec.tallyDate)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{rec.transporterName || "—"}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600">{rec.stockJvOrNewInvoiceNo || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {rec.category || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(rec.actualAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {rec.provisionAmount !== undefined ? formatCurrency(rec.provisionAmount) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(rec.effectiveFreight)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={rec.description}>
                      {rec.description || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {isEditable && (
                          <button
                            onClick={() => openEditModal(rec)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isDeletable && (
                          <button
                            onClick={() => setDeletingId(rec.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
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
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 font-mono">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{uniqueBranchesCount} Branches</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueTransportersCount} Transporters</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueInvoicesCount} Invoices</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueCategoriesCount} Categories</span>
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    {formatCurrency(totalActualAmount)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-300">
                    {formatCurrency(totalProvisionAmount)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-rose-400">
                    {formatCurrency(totalEffectiveFreight)}
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">{editingRecord ? "Edit TPT-ST Entry" : "Create TPT-ST Entry"}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entry Date (Auto Readonly) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Date (Auto)</label>
                  <input
                    type="date"
                    value={entryDate}
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Dest Branch */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dest Branch *</label>
                  <select
                    value={aolBranchName}
                    onChange={(e) => {
                      setAolBranchName(e.target.value);
                      setStockJvOrNewInvoiceNo("");
                    }}
                    required
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Branch...</option>
                    {aolBranches.map((b) => (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tally Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tally Date *</label>
                  <input
                    type="date"
                    value={tallyDate}
                    onChange={(e) => setTallyDate(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setStockJvOrNewInvoiceNo("");
                    }}
                    required
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Category...</option>
                    {tptdCategories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transporter Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transporter Name *</label>
                  <select
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Transporter...</option>
                    {transporters.map((tr) => (
                      <option key={tr.id || tr.name} value={tr.name}>
                        {tr.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock JV / New Invoice No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock JV / New Invoice No *</label>
                  <select
                    value={stockJvOrNewInvoiceNo}
                    onChange={(e) => setStockJvOrNewInvoiceNo(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Stock JV / Invoice No...</option>
                    {uniqueStInvoiceNos.map((inv) => (
                      <option key={inv} value={inv}>
                        {inv}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Cascaded from Stock Transfer records (excludes used invoice/category combos)</span>
                </div>

                {/* Actual Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Provision Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provision Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={provisionAmount}
                    onChange={(e) => setProvisionAmount(e.target.value)}
                    placeholder="Auto-fetched from ST"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-emerald-600 mt-1 block">Auto-fetched from Stock Transfer provisions</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Narration</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter any additional details..."
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingRecord ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
              <p className="text-xs text-slate-500 mt-1">Are you sure you want to delete this TPT-ST record? This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await onDeleteAccountsTptSt(deletingId);
                    setDeletingId(null);
                  } catch (err: any) {
                    alert(err?.message || "Failed to delete record.");
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">TPT-ST Entry Details</h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5">Entry Date</span>
                  <span className="font-mono font-medium text-slate-800">{formatDateDdMmmYy(viewingRecord.entryDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Tally Date</span>
                  <span className="font-mono font-medium text-slate-800">{formatDateDdMmmYy(viewingRecord.tallyDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">AOL Branch Name</span>
                  <span className="font-semibold text-slate-900">{viewingRecord.aolBranchName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Transporter Name</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.transporterName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Stock JV / New Invoice No</span>
                  <span className="font-mono font-bold text-indigo-600">{viewingRecord.stockJvOrNewInvoiceNo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-medium text-slate-800">{viewingRecord.category || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-slate-400 block mb-1">Actual Amount</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{formatCurrency(viewingRecord.actualAmount)}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-slate-400 block mb-1">Provision Amount</span>
                  <span className="font-mono font-bold text-sm text-slate-600">
                    {viewingRecord.provisionAmount !== undefined ? formatCurrency(viewingRecord.provisionAmount) : "—"}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-rose-600 block mb-1 font-medium">Effective Freight</span>
                  <span className="font-mono font-bold text-sm text-rose-600">{formatCurrency(viewingRecord.effectiveFreight)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1 font-medium">Description</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap">
                  {viewingRecord.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
