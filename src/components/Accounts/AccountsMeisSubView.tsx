/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AccountsMeisRecord, AolBranchName, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Award, Building2, Calendar, DollarSign, FileText, AlertCircle, TrendingUp, Hash, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface AccountsMeisSubViewProps {
  activeUserId: string;
  users: User[];
  accountsMeis?: AccountsMeisRecord[];
  aolBranches?: AolBranchName[];
  onAddAccountsMeis: (record: Omit<AccountsMeisRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsMeis: (record: AccountsMeisRecord) => Promise<void> | void;
  onDeleteAccountsMeis: (id: string) => Promise<void> | void;
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

export default function AccountsMeisSubView({
  activeUserId,
  users,
  accountsMeis = [],
  aolBranches = [],
  onAddAccountsMeis,
  onUpdateAccountsMeis,
  onDeleteAccountsMeis,
  canAdd = true,
  canEdit = true,
}: AccountsMeisSubViewProps) {
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
    "accounts_meis_apps_script",
    "Accounts MEIS",
    "accounts_meis"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsMeisRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsMeisRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [aolBranchName, setAolBranchName] = useState("");
  const [meisLicenceCost, setMeisLicenceCost] = useState("");
  const [licenceNumbers, setLicenceNumbers] = useState("");
  const [meisLicenceAmount, setMeisLicenceAmount] = useState("");
  const [beNumber, setBeNumber] = useState("");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto calculate profit
  const parsedCost = parseFloat(meisLicenceCost) || 0;
  const parsedAmount = parseFloat(meisLicenceAmount) || 0;
  const autoProfit = parsedAmount - parsedCost;

  const openCreateModal = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setTallyDate(new Date().toISOString().split("T")[0]);
    setAolBranchName("");
    setMeisLicenceCost("");
    setLicenceNumbers("");
    setMeisLicenceAmount("");
    setBeNumber("");
    setDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AccountsMeisRecord) => {
    setEditingRecord(rec);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setTallyDate(rec.tallyDate || new Date().toISOString().split("T")[0]);
    setAolBranchName(rec.aolBranchName || "");
    setMeisLicenceCost(rec.meisLicenceCost !== undefined ? String(rec.meisLicenceCost) : "");
    setLicenceNumbers(rec.licenceNumbers || "");
    setMeisLicenceAmount(rec.meisLicenceAmount !== undefined ? String(rec.meisLicenceAmount) : "");
    setBeNumber(rec.beNumber || "");
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
    if (!licenceNumbers.trim()) {
      setFormError("Please enter Licence Numbers.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingRecord) {
        const updated: AccountsMeisRecord = {
          ...editingRecord,
          entryDate: entryDate || new Date().toISOString().split("T")[0],
          tallyDate,
          aolBranchName,
          meisLicenceCost: parsedCost,
          licenceNumbers,
          meisLicenceAmount: parsedAmount,
          beNumber,
          profit: autoProfit,
          description,
        };
        await onUpdateAccountsMeis(updated);
      } else {
        await onAddAccountsMeis({
          entryDate: entryDate || new Date().toISOString().split("T")[0],
          tallyDate,
          aolBranchName,
          meisLicenceCost: parsedCost,
          licenceNumbers,
          meisLicenceAmount: parsedAmount,
          beNumber,
          profit: autoProfit,
          description,
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
      await onDeleteAccountsMeis(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  // Branch list
  const branchOptions = aolBranches.length > 0 ? aolBranches.map((b) => b.name) : ["Mumbai", "Chennai", "Silvassa", "Gujarat"];

  // Filtered list
  const filteredRecords = accountsMeis.filter((rec) => {
    const matchesSearch =
      (rec.licenceNumbers || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.beNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  const overallEntries = accountsMeis.length;
  const totalEntries = filteredRecords.length;
  const totalLicenceCost = filteredRecords.reduce((sum, r) => sum + (r.meisLicenceCost || 0), 0);
  const totalLicenceAmount = filteredRecords.reduce((sum, r) => sum + (r.meisLicenceAmount || 0), 0);
  const totalProfit = filteredRecords.reduce((sum, r) => sum + (r.profit || 0), 0);
  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueLicences = Array.from(new Set(filteredRecords.map((r) => r.licenceNumbers).filter(Boolean))).length;
  const uniqueBEs = Array.from(new Set(filteredRecords.map((r) => r.beNumber).filter(Boolean))).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_meis_apps_script"
        defaultSheetName="Accounts MEIS"
        collectionKey="accounts_meis"
        records={accountsMeis}
        activeUser={activeUser}
        moduleTitle="Accounts MEIS Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsMeis.find((m) => m.id === rec.id);
            if (existing) {
              onUpdateAccountsMeis({ ...existing, ...rec });
            } else {
              onAddAccountsMeis(rec);
            }
          });
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">MEIS Records</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage MEIS licences, costs, licence amounts & profit tracking</p>
          </div>
        </div>

        {isAddable && (
          <button
            id="btn-add-meis-record"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            New MEIS Entry
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Entries</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalEntries}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Licence Cost</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-700 font-mono">{formatCurrency(totalLicenceCost)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Licence Amount</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalLicenceAmount)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Profit</span>
            <TrendingUp className={`w-4 h-4 ${totalProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <p className={`text-xl font-black font-mono ${totalProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCurrency(totalProfit)}
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
              placeholder="Search by licence number, BE number, branch, description..."
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
                Filtered Profit: <strong className="text-emerald-700 font-bold">{formatCurrency(totalProfit)}</strong>
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
                <th className="px-3 py-3">Tally Date</th>
                <th className="px-3 py-3">AOL Branch</th>
                <th className="px-3 py-3">Licence Numbers</th>
                <th className="px-3 py-3">BE Number</th>
                <th className="px-3 py-3 text-right">Licence Cost</th>
                <th className="px-3 py-3 text-right">Licence Amount</th>
                <th className="px-3 py-3 text-right">Profit</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Award className="w-8 h-8 text-slate-300" />
                      <p>No MEIS records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {formatDateDdMmmYy(rec.entryDate)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {formatDateDdMmmYy(rec.tallyDate)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-semibold">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {rec.aolBranchName || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-900 font-bold">
                      {rec.licenceNumbers || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {rec.beNumber || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-rose-600">
                      {formatCurrency(rec.meisLicenceCost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-emerald-600">
                      {formatCurrency(rec.meisLicenceAmount)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold ${
                      (rec.profit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      {formatCurrency(rec.profit)}
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
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">—</td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-slate-300 block">{uniqueBranches} Branches</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-slate-300 block">{uniqueLicences} Licences</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-slate-300 block">{uniqueBEs} BEs</span>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-bold text-amber-300">
                    {formatCurrency(totalLicenceCost)}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-extrabold text-emerald-400">
                    {formatCurrency(totalLicenceAmount)}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-extrabold text-sky-300">
                    {formatCurrency(totalProfit)}
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
                <Award className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {editingRecord ? "Edit MEIS Record" : "New MEIS Entry"}
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
                {/* Entry Date (auto) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto)</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    disabled
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
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
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* AOL Branch Name */}
                <div className="sm:col-span-2">
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

                {/* Licence Numbers */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Licence Numbers <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MEIS-12345"
                    value={licenceNumbers}
                    onChange={(e) => setLicenceNumbers(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* BE Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    BE Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BE-987654"
                    value={beNumber}
                    onChange={(e) => setBeNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* MEIS Licence Cost */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    MEIS Licence Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={meisLicenceCost}
                    onChange={(e) => setMeisLicenceCost(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* MEIS Licence Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    MEIS Licence Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={meisLicenceAmount}
                    onChange={(e) => setMeisLicenceAmount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Profit (auto calculated) */}
                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase font-mono">Profit (Auto-Calculated)</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">MEIS Licence Amount − MEIS Licence Cost</p>
                    </div>
                    <p className={`text-base font-black font-mono ${autoProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrency(autoProfit)}
                    </p>
                  </div>
                </div>

                {/* Description */}
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
                <Award className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  MEIS Record Details
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
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 uppercase">AOL Branch Name</p>
                  <p className="font-bold text-slate-900">{viewingRecord.aolBranchName || "—"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Licence Numbers:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.licenceNumbers || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">BE Number:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.beNumber || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">MEIS Licence Cost:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(viewingRecord.meisLicenceCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">MEIS Licence Amount:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(viewingRecord.meisLicenceAmount)}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-emerald-50/50 px-2 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-900">Profit:</span>
                  <span className={`font-black ${
                    (viewingRecord.profit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}>
                    {formatCurrency(viewingRecord.profit)}
                  </span>
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
              Are you sure you want to delete this MEIS record? This action cannot be undone.
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
