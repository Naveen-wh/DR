/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AccountsOfficeExpRecord, ExpenseLedgerItem, AolBranchName, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Receipt, Building2, Tag, Calendar, DollarSign, FileText, AlertCircle, CheckCircle2, MapPin, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface AccountsOfficeExpSubViewProps {
  activeUserId: string;
  users: User[];
  accountsOfficeExps?: AccountsOfficeExpRecord[];
  expenseLedgers?: ExpenseLedgerItem[];
  aolBranches?: AolBranchName[];
  onAddAccountsOfficeExp: (record: Omit<AccountsOfficeExpRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsOfficeExp: (record: AccountsOfficeExpRecord) => Promise<void> | void;
  onDeleteAccountsOfficeExp: (id: string) => Promise<void> | void;
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

export default function AccountsOfficeExpSubView({
  activeUserId,
  users,
  accountsOfficeExps = [],
  expenseLedgers = [],
  aolBranches = [],
  onAddAccountsOfficeExp,
  onUpdateAccountsOfficeExp,
  onDeleteAccountsOfficeExp,
  canAdd = true,
  canEdit = true,
}: AccountsOfficeExpSubViewProps) {
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
    "accounts_office_exps_apps_script",
    "Office Expenses",
    "accounts_office_exps"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterSubHead, setFilterSubHead] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsOfficeExpRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsOfficeExpRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [aolBranchName, setAolBranchName] = useState("");
  const [vendorPartyName, setVendorPartyName] = useState("");
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [tallyEntryDate, setTallyEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseSubHead, setExpenseSubHead] = useState("");
  const [expenseIncomeType, setExpenseIncomeType] = useState("");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto set expenseIncomeType when expenseSubHead changes
  useEffect(() => {
    if (expenseSubHead) {
      const match = expenseLedgers.find((l) => l.expenseSubHead === expenseSubHead);
      if (match) {
        setExpenseIncomeType(match.expenseIncomeType || "Expense");
      }
    }
  }, [expenseSubHead, expenseLedgers]);

  // Calculate totalAmount
  const parsedAmount = parseFloat(amount) || 0;
  const isExpenseType = expenseIncomeType.toLowerCase().includes("expense");
  const totalAmount = isExpenseType ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

  const openCreateModal = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setAolBranchName("");
    setVendorPartyName("");
    setPurchaseInvoiceNo("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setTallyEntryDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setDescription("");
    const defaultSub = expenseLedgers[0]?.expenseSubHead || "";
    setExpenseSubHead(defaultSub);
    const defaultType = expenseLedgers[0]?.expenseIncomeType || "Expense";
    setExpenseIncomeType(defaultType);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AccountsOfficeExpRecord) => {
    setEditingRecord(rec);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setAolBranchName(rec.aolBranchName || "");
    setVendorPartyName(rec.vendorPartyName || "");
    setPurchaseInvoiceNo(rec.purchaseInvoiceNo || "");
    setInvoiceDate(rec.invoiceDate || new Date().toISOString().split("T")[0]);
    setTallyEntryDate(rec.tallyEntryDate || new Date().toISOString().split("T")[0]);
    setAmount(rec.amount !== undefined ? String(rec.amount) : "");
    setDescription(rec.description || "");
    setExpenseSubHead(rec.expenseSubHead || "");
    setExpenseIncomeType(rec.expenseIncomeType || "Expense");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!entryDate) {
      setFormError("Entry Date is required.");
      return;
    }
    if (!aolBranchName.trim()) {
      setFormError("AOL Branch Name is required.");
      return;
    }
    if (!vendorPartyName.trim()) {
      setFormError("Vendor/Party Name is required.");
      return;
    }
    if (!purchaseInvoiceNo.trim()) {
      setFormError("Purchase Invoice No. is required.");
      return;
    }
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid positive Amount.");
      return;
    }
    if (!expenseSubHead.trim()) {
      setFormError("Expense Sub-head is required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        entryDate,
        aolBranchName: aolBranchName.trim(),
        vendorPartyName: vendorPartyName.trim(),
        purchaseInvoiceNo: purchaseInvoiceNo.trim(),
        invoiceDate,
        tallyEntryDate,
        amount: parsedAmount,
        description: description.trim(),
        expenseSubHead: expenseSubHead.trim(),
        expenseIncomeType: expenseIncomeType || "Expense",
        totalAmount,
      };

      if (editingRecord) {
        await onUpdateAccountsOfficeExp({
          ...editingRecord,
          ...payload,
        });
      } else {
        await onAddAccountsOfficeExp(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save Office Exp record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await onDeleteAccountsOfficeExp(deletingId);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete Office Exp record:", err);
    }
  };

  // Unique lists for filtering
  const subHeadList = Array.from(new Set(expenseLedgers.map((l) => l.expenseSubHead))).sort();

  const filteredRecords = accountsOfficeExps.filter((rec) => {
    const matchesSearch =
      (rec.vendorPartyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.purchaseInvoiceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.expenseSubHead || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.aolBranchName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;
    const matchesSubHead = filterSubHead === "all" || rec.expenseSubHead === filterSubHead;

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? rec.entryDate : rec.tallyEntryDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesBranch && matchesSubHead && matchesDate;
  });

  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterBranch !== "all" || filterSubHead !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setFilterSubHead("all");
    setStartDate("");
    setEndDate("");
  };

  // KPI Calculations
  const overallEntries = accountsOfficeExps.length;
  const totalEntries = filteredRecords.length;
  const netAmount = filteredRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalRawAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueVendors = Array.from(new Set(filteredRecords.map((r) => r.vendorPartyName).filter(Boolean))).length;
  const uniqueSubHeads = Array.from(new Set(filteredRecords.map((r) => r.expenseSubHead).filter(Boolean))).length;
  const totalExpense = filteredRecords
    .filter((r) => (r.expenseIncomeType || "").toLowerCase().includes("expense"))
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalIncome = filteredRecords
    .filter((r) => (r.expenseIncomeType || "").toLowerCase().includes("income"))
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_office_exps_apps_script"
        defaultSheetName="Office Expenses"
        collectionKey="accounts_office_exps"
        records={accountsOfficeExps}
        activeUser={activeUser}
        moduleTitle="Accounts Office Expenses Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsOfficeExps.find((e) => e.id === rec.id);
            if (existing) {
              onUpdateAccountsOfficeExp({ ...existing, ...rec });
            } else {
              onAddAccountsOfficeExp(rec);
            }
          });
        }}
      />

      {/* Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-mono">
                Accounts — Office Expenses
              </h2>
              <p className="text-xs text-slate-500">
                Log and track office expense entries, vendor invoices, and automatic ledger balances
              </p>
            </div>
          </div>
        </div>

        {isAddable && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            New Office Exp Entry
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Total Entries</span>
            <Receipt size={14} className="text-indigo-600" />
          </div>
          <p className="text-lg font-extrabold text-slate-900 font-mono">{totalEntries}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Total Expense</span>
            <DollarSign size={14} className="text-rose-500" />
          </div>
          <p className="text-lg font-extrabold text-rose-600 font-mono">₹{totalExpense.toLocaleString("en-IN")}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Total Income</span>
            <DollarSign size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold text-emerald-600 font-mono">₹{totalIncome.toLocaleString("en-IN")}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Net Flow</span>
            <Tag size={14} className="text-sky-500" />
          </div>
          <p className={`text-lg font-extrabold font-mono ${netAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
            ₹{netAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Vendor, Invoice No., Sub-head, or Description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
            >
              <option value="all">All AOL Branches</option>
              {(aolBranches.length > 0 ? aolBranches.map((b) => b.name) : ["Mumbai", "Chennai", "Silvassa", "Gujarat"]).map((bName) => (
                <option key={bName} value={bName}>{bName}</option>
              ))}
            </select>

            <select
              value={filterSubHead}
              onChange={(e) => setFilterSubHead(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
            >
              <option value="all">All Expense Sub-heads</option>
              {subHeadList.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
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
                Filtered Net Amount: <strong className="text-emerald-700 font-bold">₹{netAmount.toLocaleString("en-IN")}</strong>
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

      {/* Table Data */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Entry Date</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Vendor / Party Name</th>
                <th className="p-3">Purchase Invoice No.</th>
                <th className="p-3">Invoice Date</th>
                <th className="p-3">Tally Date</th>
                <th className="p-3">Expense Sub-head</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3 text-right">Total Amount (₹)</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    <Receipt size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-semibold text-slate-600 text-xs">No Office Exp records found.</p>
                    <p className="text-[11px] text-slate-400">Click "New Office Exp Entry" to log a record.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-slate-700 font-mono whitespace-nowrap">{formatDateDdMmmYy(rec.entryDate)}</td>
                    <td className="p-3 text-slate-800 font-mono font-medium">{rec.aolBranchName}</td>
                    <td className="p-3 font-bold text-slate-900 font-mono">{rec.vendorPartyName}</td>
                    <td className="p-3 text-slate-700 font-mono">{rec.purchaseInvoiceNo}</td>
                    <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{formatDateDdMmmYy(rec.invoiceDate)}</td>
                    <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{formatDateDdMmmYy(rec.tallyEntryDate)}</td>
                    <td className="p-3 text-slate-800 font-mono font-medium">{rec.expenseSubHead}</td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-900">₹{(rec.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        (rec.expenseIncomeType || "").toLowerCase().includes("expense")
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {rec.expenseIncomeType}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${
                      (rec.totalAmount || 0) < 0 ? "text-rose-600" : "text-emerald-600"
                    }`}>
                      ₹{(rec.totalAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {isEditable && (
                          <button
                            onClick={() => openEditModal(rec)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {isDeletable && (
                          <button
                            onClick={() => setDeletingId(rec.id)}
                            className="p-1.5 hover:bg-rose-100 text-rose-600 rounded transition-colors cursor-pointer"
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
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueBranches} Branches</span>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueVendors} Vendors</span>
                  </td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueSubHeads} Sub-heads</span>
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-400">
                    ₹{totalRawAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-center">—</td>
                  <td className={`p-3 text-right font-mono font-extrabold ${netAmount < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    ₹{netAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Office Exp Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {editingRecord ? "Edit Office Exp Entry" : "New Office Exp Entry"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-mono">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Entry Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Entry Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none cursor-not-allowed text-slate-500"
                    required
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
                    required
                  >
                    <option value="">Select AOL Branch</option>
                    {(aolBranches.length > 0 ? aolBranches.map((b) => b.name) : ["Mumbai", "Chennai", "Silvassa", "Gujarat"]).map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name of Vendor / Party Name */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Name of Vendor / Party Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Vendor or Party Name"
                    value={vendorPartyName}
                    onChange={(e) => setVendorPartyName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Purchase Invoice No. */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Purchase Invoice No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-88"
                    value={purchaseInvoiceNo}
                    onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Tally Entry Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Tally Entry Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tallyEntryDate}
                    onChange={(e) => setTallyEntryDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Expense Sub-head */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Expense Sub-head <span className="text-rose-500">*</span>
                  </label>
                  {expenseLedgers.length === 0 ? (
                    <input
                      type="text"
                      placeholder="Enter Expense Sub-head"
                      value={expenseSubHead}
                      onChange={(e) => setExpenseSubHead(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none"
                      required
                    />
                  ) : (
                    <select
                      value={expenseSubHead}
                      onChange={(e) => setExpenseSubHead(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    >
                      <option value="">-- Select Expense Sub-head --</option>
                      {expenseLedgers.map((l) => (
                        <option key={l.id} value={l.expenseSubHead}>
                          {l.expenseSubHead} ({l.expenseHead}) [{l.expenseIncomeType}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Expense/Income Type (Display from Expense Ledger) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Expense / Income Type
                  </label>
                  <input
                    type="text"
                    value={expenseIncomeType || "Expense"}
                    readOnly
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    required
                  />
                </div>

                {/* Total Amount (Auto calculated) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Total Amount (₹ Auto calculated)
                  </label>
                  <input
                    type="text"
                    value={`₹${totalAmount.toLocaleString("en-IN")}`}
                    readOnly
                    className={`w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold cursor-not-allowed ${
                      totalAmount < 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter details, reference notes, or description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingRecord ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">Office Exp Details</h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Entry Date:</span>
                <span className="font-bold">{formatDateDdMmmYy(viewingRecord.entryDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">AOL Branch Name:</span>
                <span className="font-bold">{viewingRecord.aolBranchName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Vendor / Party Name:</span>
                <span className="font-bold text-slate-900">{viewingRecord.vendorPartyName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Purchase Invoice No.:</span>
                <span className="font-bold">{viewingRecord.purchaseInvoiceNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Invoice Date:</span>
                <span className="font-bold">{formatDateDdMmmYy(viewingRecord.invoiceDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Tally Entry Date:</span>
                <span className="font-bold">{formatDateDdMmmYy(viewingRecord.tallyEntryDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Expense Sub-head:</span>
                <span className="font-bold">{viewingRecord.expenseSubHead}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Expense/Income Type:</span>
                <span className="font-bold text-indigo-600">{viewingRecord.expenseIncomeType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-slate-900">₹{(viewingRecord.amount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Total Amount:</span>
                <span className={`font-bold ${viewingRecord.totalAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ₹{(viewingRecord.totalAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>
              {viewingRecord.description && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Description:</span>
                  <p className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 leading-normal font-sans">
                    {viewingRecord.description}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-lg">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-mono">Delete Office Exp Entry</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Are you sure you want to delete this Office Exp entry? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
