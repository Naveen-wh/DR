/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AccountsOtherIncomeRecord, OtherIncomeLedgerItem, AolBranchName, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, DollarSign, Building2, Calendar, FileText, AlertCircle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../Configuration/AppsScriptSyncBanner";

interface AccountsOtherIncomeSubViewProps {
  activeUserId: string;
  users: User[];
  accountsOtherIncomes?: AccountsOtherIncomeRecord[];
  otherIncomeLedgers?: OtherIncomeLedgerItem[];
  aolBranches?: AolBranchName[];
  onAddAccountsOtherIncome: (record: Omit<AccountsOtherIncomeRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsOtherIncome: (record: AccountsOtherIncomeRecord) => Promise<void> | void;
  onDeleteAccountsOtherIncome: (id: string) => Promise<void> | void;
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
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Math.abs(val));
  return val < 0 ? `- ${formatted}` : formatted;
}

export default function AccountsOtherIncomeSubView({
  activeUserId,
  users,
  accountsOtherIncomes = [],
  otherIncomeLedgers = [],
  aolBranches = [],
  onAddAccountsOtherIncome,
  onUpdateAccountsOtherIncome,
  onDeleteAccountsOtherIncome,
  canAdd = true,
  canEdit = true,
}: AccountsOtherIncomeSubViewProps) {
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
    "accounts_other_incomes_apps_script",
    "Other Income",
    "accounts_other_incomes"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterLedger, setFilterLedger] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsOtherIncomeRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsOtherIncomeRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  // entryDate - auto readonly
  const [entryDate] = useState(new Date().toISOString().split("T")[0]);
  const [aolBranchName, setAolBranchName] = useState("");
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [partyName, setPartyName] = useState("");
  const [ledger, setLedger] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto detect effect from selected ledger
  const selectedLedgerObj = otherIncomeLedgers.find((l) => l.ledger === ledger);
  const autoEffect: "Income" | "Expense" = selectedLedgerObj?.effect || "Income";

  // Calculate final amount (+ for Income, - for Expense)
  const rawAmount = parseFloat(amountInput) || 0;
  const autoFinalAmount = autoEffect === "Income" ? Math.abs(rawAmount) : -Math.abs(rawAmount);

  const openCreateModal = () => {
    setEditingRecord(null);
    setAolBranchName("");
    setTallyDate(new Date().toISOString().split("T")[0]);
    setPartyName("");
    setLedger(otherIncomeLedgers[0]?.ledger || "");
    setAmountInput("");
    setDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AccountsOtherIncomeRecord) => {
    setEditingRecord(rec);
    setAolBranchName(rec.aolBranchName || "");
    setTallyDate(rec.tallyDate || new Date().toISOString().split("T")[0]);
    setPartyName(rec.partyName || "");
    setLedger(rec.ledger || "");
    setAmountInput(rec.amount !== undefined ? String(rec.amount) : "");
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
    if (!ledger.trim()) {
      setFormError("Please select a Ledger.");
      return;
    }
    if (!partyName.trim()) {
      setFormError("Please enter Party Name.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingRecord) {
        const updated: AccountsOtherIncomeRecord = {
          ...editingRecord,
          entryDate: editingRecord.entryDate || entryDate,
          aolBranchName,
          tallyDate,
          partyName,
          ledger,
          amount: Math.abs(rawAmount),
          description,
          effect: autoEffect,
          finalAmount: autoFinalAmount,
        };
        await onUpdateAccountsOtherIncome(updated);
      } else {
        await onAddAccountsOtherIncome({
          entryDate,
          aolBranchName,
          tallyDate,
          partyName,
          ledger,
          amount: Math.abs(rawAmount),
          description,
          effect: autoEffect,
          finalAmount: autoFinalAmount,
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
      await onDeleteAccountsOtherIncome(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  // Branch list
  const branchOptions = aolBranches.length > 0 ? aolBranches.map((b) => b.name) : ["Mumbai", "Chennai", "Silvassa", "Gujarat"];

  // Filtered records
  const filteredRecords = accountsOtherIncomes.filter((rec) => {
    const matchesSearch =
      (rec.partyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.ledger || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.aolBranchName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;
    const matchesLedger = filterLedger === "all" || rec.ledger === filterLedger;

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

    return matchesSearch && matchesBranch && matchesLedger && matchesDate;
  });

  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterBranch !== "all" || filterLedger !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setFilterLedger("all");
    setStartDate("");
    setEndDate("");
  };

  // KPI Calculations
  const overallEntries = accountsOtherIncomes.length;
  const totalEntries = filteredRecords.length;
  const totalIncome = filteredRecords
    .filter((r) => r.effect === "Income" || (r.finalAmount || 0) > 0)
    .reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);

  const totalExpense = filteredRecords
    .filter((r) => r.effect === "Expense" || (r.finalAmount || 0) < 0)
    .reduce((sum, r) => sum + Math.abs(r.amount || 0), 0);

  const netBalance = filteredRecords.reduce((sum, r) => sum + (r.finalAmount !== undefined ? r.finalAmount : (r.effect === "Income" ? (r.amount || 0) : -(r.amount || 0))), 0);
  const totalRawAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueParties = Array.from(new Set(filteredRecords.map((r) => r.partyName).filter(Boolean))).length;
  const uniqueLedgers = Array.from(new Set(filteredRecords.map((r) => r.ledger).filter(Boolean))).length;
  const incomeCount = filteredRecords.filter((r) => r.effect === "Income" || (r.finalAmount !== undefined ? r.finalAmount >= 0 : true)).length;
  const expenseCount = filteredRecords.length - incomeCount;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_other_incomes_apps_script"
        defaultSheetName="Other Income"
        collectionKey="accounts_other_incomes"
        records={accountsOtherIncomes}
        activeUser={activeUser}
        moduleTitle="Accounts Other Income Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsOtherIncomes.find((o) => o.id === rec.id);
            if (existing) {
              onUpdateAccountsOtherIncome({ ...existing, ...rec });
            } else {
              onAddAccountsOtherIncome(rec);
            }
          });
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Other Income Records</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Track other income and expense ledgers with auto-calculated effects</p>
          </div>
        </div>

        {isAddable && (
          <button
            id="btn-add-other-income-entry"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Entries</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalEntries}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Income (+)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalIncome)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Expense (-)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-700 font-mono">{formatCurrency(totalExpense)}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Net Balance</span>
            <DollarSign className={`w-4 h-4 ${netBalance >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <p className={`text-xl font-black font-mono ${netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party name, ledger, branch, description..."
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

          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={filterLedger}
              onChange={(e) => setFilterLedger(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
            >
              <option value="all">All Ledgers</option>
              {otherIncomeLedgers.map((l) => (
                <option key={l.id} value={l.ledger}>{l.ledger} ({l.effect})</option>
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
                Filtered Net Balance: <strong className="text-emerald-700 font-bold">{formatCurrency(netBalance)}</strong>
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-bold tracking-wider">
                <th className="px-3 py-3">Entry Date</th>
                <th className="px-3 py-3">Tally Date</th>
                <th className="px-3 py-3">AOL Branch</th>
                <th className="px-3 py-3">Party Name</th>
                <th className="px-3 py-3">Ledger</th>
                <th className="px-3 py-3 text-center">Effect</th>
                <th className="px-3 py-3 text-right">Raw Amount</th>
                <th className="px-3 py-3 text-right">Net Amount</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-8 h-8 text-slate-300" />
                      <p>No Other Income entries found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isInc = rec.effect === "Income" || (rec.finalAmount !== undefined ? rec.finalAmount >= 0 : true);
                  return (
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
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {rec.partyName || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-semibold">
                        {rec.ledger || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isInc ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            Income (+)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            Expense (-)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                        {formatCurrency(rec.amount)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-bold ${
                        isInc ? "text-emerald-700" : "text-rose-700"
                      }`}>
                        {formatCurrency(rec.finalAmount !== undefined ? rec.finalAmount : (isInc ? rec.amount : -rec.amount))}
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
                  );
                })
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
                    <span className="text-[11px] text-slate-300 block">{uniqueParties} Parties</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-[11px] text-slate-300 block">{uniqueLedgers} Ledgers</span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="text-[11px] text-emerald-300 font-bold block">{incomeCount} Inc</span>
                    <span className="text-[10px] text-rose-300 block">{expenseCount} Exp</span>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-extrabold text-slate-200">
                    {formatCurrency(totalRawAmount)}
                  </td>
                  <td className={`px-3 py-3.5 text-right font-mono font-extrabold ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(netBalance)}
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
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {editingRecord ? "Edit Other Income Entry" : "New Other Income Entry"}
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
                {/* Entry Date - auto readonly */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formatDateDdMmmYy(editingRecord?.entryDate || entryDate)}
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

                {/* Party Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Party Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Party Name..."
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Ledger dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Ledger <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ledger}
                    onChange={(e) => setLedger(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select Ledger</option>
                    {otherIncomeLedgers.map((l) => (
                      <option key={l.id} value={l.ledger}>
                        {l.ledger} ({l.effect})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Effect (auto display as per ledger selection) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                    Effect <span className="text-slate-400 font-normal">(Auto as per Ledger)</span>
                  </label>
                  {autoEffect === "Income" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      Income (+)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                      Expense (-)
                    </span>
                  )}
                </div>

                {/* Amount (auto as per Effect selection + for income and - for expense) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1">
                    Calculated Net Amount <span className="text-slate-400 font-normal">(Auto)</span>
                  </label>
                  <p className={`text-base font-black font-mono ${autoFinalAmount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatCurrency(autoFinalAmount)}
                  </p>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional notes..."
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
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Other Income Record Details
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
                  <span className="text-slate-500">Party Name:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.partyName || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ledger:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.ledger || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Effect:</span>
                  <span className="font-bold">{viewingRecord.effect}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Raw Amount:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(viewingRecord.amount)}</span>
                </div>
                <div className="flex justify-between py-1.5 bg-slate-50 px-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900">Net Amount:</span>
                  <span className={`font-black ${
                    (viewingRecord.finalAmount !== undefined ? viewingRecord.finalAmount >= 0 : viewingRecord.effect === "Income")
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}>
                    {formatCurrency(viewingRecord.finalAmount !== undefined ? viewingRecord.finalAmount : (viewingRecord.effect === "Income" ? viewingRecord.amount : -viewingRecord.amount))}
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

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this Other Income record? This action cannot be undone.
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
