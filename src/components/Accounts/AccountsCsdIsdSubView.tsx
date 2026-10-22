/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AccountsCsdIsdRecord, AolBranchName, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, FileText, Calendar, DollarSign, AlertCircle, Hash, Building2, TrendingUp, TrendingDown, FileSpreadsheet, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../Configuration/AppsScriptSyncBanner";

interface AccountsCsdIsdSubViewProps {
  activeUserId: string;
  users: User[];
  accountsCsdIsds?: AccountsCsdIsdRecord[];
  aolBranches?: AolBranchName[];
  onAddAccountsCsdIsd: (record: Omit<AccountsCsdIsdRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsCsdIsd: (record: AccountsCsdIsdRecord) => Promise<void> | void;
  onDeleteAccountsCsdIsd: (id: string) => Promise<void> | void;
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
  const absVal = Math.abs(val);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(absVal);
  return val < 0 ? `-${formatted}` : formatted;
}

export default function AccountsCsdIsdSubView({
  activeUserId,
  users,
  accountsCsdIsds = [],
  aolBranches = [],
  onAddAccountsCsdIsd,
  onUpdateAccountsCsdIsd,
  onDeleteAccountsCsdIsd,
  canAdd = true,
  canEdit = true,
}: AccountsCsdIsdSubViewProps) {
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
    "accounts_csd_isd_apps_script",
    "Accounts CSD ISD",
    "accounts_csd_isd"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "Sales" | "Purchase">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsCsdIsdRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsCsdIsdRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [aolBranchName, setAolBranchName] = useState("");
  const [type, setType] = useState<"Sales" | "Purchase">("Sales");
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [taxableValue, setTaxableValue] = useState("");
  const [narration, setNarration] = useState("");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto calculated effect amount: Sales is +ve, Purchase is -ve
  const parsedTaxable = parseFloat(taxableValue) || 0;
  const calculatedEffectAmount = type === "Sales" ? parsedTaxable : -parsedTaxable;

  const openCreateModal = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setAolBranchName("");
    setType("Sales");
    setTallyDate(new Date().toISOString().split("T")[0]);
    setInvoiceNo("");
    setTaxableValue("");
    setNarration("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AccountsCsdIsdRecord) => {
    setEditingRecord(rec);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setAolBranchName(rec.aolBranchName || "");
    setType(rec.type || "Sales");
    setTallyDate(rec.tallyDate || new Date().toISOString().split("T")[0]);
    setInvoiceNo(rec.invoiceNo || "");
    setTaxableValue(rec.taxableValue !== undefined ? String(rec.taxableValue) : "");
    setNarration(rec.narration || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aolBranchName.trim()) {
      setFormError("Please select AOL Branch Name.");
      return;
    }
    if (!invoiceNo.trim()) {
      setFormError("Please enter Invoice No.");
      return;
    }
    if (!taxableValue.trim() || isNaN(parseFloat(taxableValue))) {
      setFormError("Please enter a valid Taxable Value.");
      return;
    }

    const tValue = parseFloat(taxableValue) || 0;
    const effectAmt = type === "Sales" ? tValue : -tValue;

    setIsSaving(true);
    setFormError("");

    try {
      if (editingRecord) {
        const updated: AccountsCsdIsdRecord = {
          ...editingRecord,
          entryDate: entryDate || new Date().toISOString().split("T")[0],
          aolBranchName,
          type,
          tallyDate,
          invoiceNo,
          taxableValue: tValue,
          narration,
          effectAmount: effectAmt,
        };
        await onUpdateAccountsCsdIsd(updated);
      } else {
        await onAddAccountsCsdIsd({
          entryDate: entryDate || new Date().toISOString().split("T")[0],
          aolBranchName,
          type,
          tallyDate,
          invoiceNo,
          taxableValue: tValue,
          narration,
          effectAmount: effectAmt,
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
      await onDeleteAccountsCsdIsd(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  // Branch options
  const branchOptions = aolBranches.length > 0 ? aolBranches.map((b) => b.name) : ["Mumbai", "Chennai", "Silvassa", "Gujarat"];

  // Filtered list
  const filteredRecords = accountsCsdIsds.filter((rec) => {
    const matchesSearch =
      (rec.invoiceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.aolBranchName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.narration || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;
    const matchesType = filterType === "all" || rec.type === filterType;

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

    return matchesSearch && matchesBranch && matchesType && matchesDate;
  });

  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterBranch !== "all" || filterType !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setFilterType("all");
    setStartDate("");
    setEndDate("");
  };

  // KPI Calculations
  const overallEntries = accountsCsdIsds.length;
  const totalEntries = filteredRecords.length;
  const totalSalesVal = filteredRecords.filter((r) => r.type === "Sales").reduce((sum, r) => sum + (r.taxableValue || 0), 0);
  const totalPurchaseVal = filteredRecords.filter((r) => r.type === "Purchase").reduce((sum, r) => sum + (r.taxableValue || 0), 0);
  const totalTaxableVal = filteredRecords.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
  const netEffectAmount = filteredRecords.reduce((sum, r) => sum + (r.effectAmount || 0), 0);
  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueInvoices = Array.from(new Set(filteredRecords.map((r) => r.invoiceNo).filter(Boolean))).length;
  const salesCount = filteredRecords.filter((r) => r.type === "Sales").length;
  const purchaseCount = filteredRecords.filter((r) => r.type === "Purchase").length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_csd_isd_apps_script"
        defaultSheetName="Accounts CSD ISD"
        collectionKey="accounts_csd_isd"
        records={accountsCsdIsds}
        activeUser={activeUser}
        moduleTitle="Accounts CSD & ISD Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsCsdIsds.find((c) => c.id === rec.id);
            if (existing) {
              onUpdateAccountsCsdIsd({ ...existing, ...rec });
            } else {
              onAddAccountsCsdIsd(rec);
            }
          });
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CSD & ISD Records</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage CSD and ISD sales and purchase entries with auto effect amounts</p>
          </div>
        </div>

        {isAddable && (
          <button
            id="btn-add-csd-isd-record"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            New CSD & ISD Entry
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Entries</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalEntries}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Sales (+ve)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(totalSalesVal)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Purchase (-ve)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{formatCurrency(totalPurchaseVal)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Net Effect Amount</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <p className={`text-2xl font-black font-mono ${netEffectAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCurrency(netEffectAmount)}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice No, AOL Branch, Narration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
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

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
            </select>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
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
                Filtered Net Effect: <strong className="text-purple-700 font-bold">{formatCurrency(netEffectAmount)}</strong>
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
                <th className="px-3 py-3">Sales / Purchase</th>
                <th className="px-3 py-3">Tally Date</th>
                <th className="px-3 py-3">Invoice No.</th>
                <th className="px-3 py-3 text-right">Taxable Value</th>
                <th className="px-3 py-3 text-right">Effect Amount</th>
                <th className="px-3 py-3">Narration</th>
                <th className="px-3 py-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                      <p>No CSD & ISD records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isSales = rec.type === "Sales";
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                        {formatDateDdMmmYy(rec.entryDate)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-semibold">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          {rec.aolBranchName || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isSales
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {isSales ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {rec.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {formatDateDdMmmYy(rec.tallyDate)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-900 font-bold">
                        {rec.invoiceNo || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                        {formatCurrency(rec.taxableValue)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-bold ${
                        rec.effectAmount >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {formatCurrency(rec.effectAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={rec.narration}>
                        {rec.narration || "—"}
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
                              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded cursor-pointer"
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
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-purple-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-slate-300 block">{uniqueBranches} Branches</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-emerald-300 font-bold block">{salesCount} Sales</span>
                    <span className="text-[10px] text-rose-300 block">{purchaseCount} Purchase</span>
                  </td>
                  <td className="px-3 py-3.5">—</td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-slate-300 block">{uniqueInvoices} Invoices</span>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-extrabold text-emerald-400">
                    {formatCurrency(totalTaxableVal)}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-extrabold text-sky-300">
                    {formatCurrency(netEffectAmount)}
                  </td>
                  <td className="px-3 py-3.5">—</td>
                  <td className="px-3 py-3.5 text-center">—</td>
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
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {editingRecord ? "Edit CSD & ISD Record" : "New CSD & ISD Entry"}
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
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="">Select AOL Branch</option>
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sales / Purchase dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Sales / Purchase <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "Sales" | "Purchase")}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Sales">Sales (+ve)</option>
                    <option value="Purchase">Purchase (-ve)</option>
                  </select>
                </div>

                {/* Tally Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Tally Date
                  </label>
                  <input
                    type="date"
                    value={tallyDate}
                    onChange={(e) => setTallyDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                {/* Invoice No. */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Invoice No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-001"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                {/* Taxable Value */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Taxable Value (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={taxableValue}
                    onChange={(e) => setTaxableValue(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                {/* Effect Amount (Auto Calculated) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Effect Amount <span className="text-slate-400 font-normal">(Auto Calculated: Sales +ve, Purchase -ve)</span>
                  </label>
                  <div className={`p-2.5 rounded-lg border text-sm font-bold font-mono ${
                    type === "Sales"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                    {formatCurrency(calculatedEffectAmount)} ({type === "Sales" ? "+ Positive Effect" : "- Negative Effect"})
                  </div>
                </div>

                {/* Narration */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Narration
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter narration or details..."
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
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
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  CSD & ISD Record Details
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
                  <p className="text-[10px] text-slate-400 uppercase">Type</p>
                  <p className={`font-bold ${viewingRecord.type === "Sales" ? "text-emerald-600" : "text-rose-600"}`}>
                    {viewingRecord.type}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Invoice No.:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.invoiceNo || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Taxable Value:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(viewingRecord.taxableValue)}</span>
                </div>
                <div className={`flex justify-between py-1.5 px-2 rounded-lg border ${
                  viewingRecord.effectAmount >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                }`}>
                  <span className="font-bold text-slate-900">Effect Amount:</span>
                  <span className={`font-black ${viewingRecord.effectAmount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatCurrency(viewingRecord.effectAmount)}
                  </span>
                </div>
              </div>

              {viewingRecord.narration && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase mb-1">Narration</p>
                  <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 leading-relaxed border border-slate-100">
                    {viewingRecord.narration}
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
              Are you sure you want to delete this CSD & ISD record? This action cannot be undone.
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
