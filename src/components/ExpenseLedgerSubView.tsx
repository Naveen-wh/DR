/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ExpenseLedgerItem, AolBranchName, User, Role, AccessLevel } from "../types";
import { Plus, Search, Edit2, Trash2, X, ShieldAlert, BookOpen, Layers, MapPin, Tag, CheckCircle2, AlertCircle } from "lucide-react";

interface ExpenseLedgerSubViewProps {
  activeUserId: string;
  users: User[];
  expenseLedgers?: ExpenseLedgerItem[];
  aolBranches?: AolBranchName[];
  onAddExpenseLedger: (record: Omit<ExpenseLedgerItem, "id" | "createdAt">) => Promise<void> | void;
  onUpdateExpenseLedger: (record: ExpenseLedgerItem) => Promise<void> | void;
  onDeleteExpenseLedger: (id: string) => Promise<void> | void;
}

export default function ExpenseLedgerSubView({
  activeUserId,
  users,
  expenseLedgers = [],
  aolBranches = [],
  onAddExpenseLedger,
  onUpdateExpenseLedger,
  onDeleteExpenseLedger,
}: ExpenseLedgerSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || {
    id: activeUserId,
    name: "User",
    accessLevel: AccessLevel.Editor,
    role: Role.User,
  };

  const isManagerOrAdmin =
    activeUser.role === Role.Admin ||
    activeUser.accessLevel === AccessLevel.Manager;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDirect, setFilterDirect] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseLedgerItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [expenseSubHead, setExpenseSubHead] = useState("");
  const [expenseHead, setExpenseHead] = useState("");
  const [directIndirect, setDirectIndirect] = useState<"Direct" | "Indirect" | "">("Direct");
  const [ledgerBranchLocation, setLedgerBranchLocation] = useState("");
  const [expenseIncomeType, setExpenseIncomeType] = useState<"Expense" | "Income" | "">("Expense");
  const [ecomExpense, setEcomExpense] = useState<"Yes" | "No" | "">("No");

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingRecord(null);
    setExpenseSubHead("");
    setExpenseHead("");
    setDirectIndirect("Direct");
    setLedgerBranchLocation("");
    setExpenseIncomeType("Expense");
    setEcomExpense("No");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: ExpenseLedgerItem) => {
    setEditingRecord(rec);
    setExpenseSubHead(rec.expenseSubHead || "");
    setExpenseHead(rec.expenseHead || "");
    setDirectIndirect((rec.directIndirect as any) || "Direct");
    setLedgerBranchLocation(rec.ledgerBranchLocation || "");
    setExpenseIncomeType((rec.expenseIncomeType as any) || "Expense");
    setEcomExpense((rec.ecomExpense as any) || "No");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!expenseSubHead.trim()) {
      setFormError("Expense Sub-head is mandatory.");
      return;
    }
    if (!expenseHead.trim()) {
      setFormError("Expense Head is mandatory.");
      return;
    }
    if (!directIndirect) {
      setFormError("Direct/Indirect selection is mandatory.");
      return;
    }
    if (!ledgerBranchLocation.trim()) {
      setFormError("Ledger Branch Location is mandatory.");
      return;
    }
    if (!expenseIncomeType) {
      setFormError("Expense/Income Type selection is mandatory.");
      return;
    }
    if (!ecomExpense) {
      setFormError("ECOM Expense selection is mandatory.");
      return;
    }

    try {
      setIsSaving(true);
      if (editingRecord) {
        await onUpdateExpenseLedger({
          ...editingRecord,
          expenseSubHead: expenseSubHead.trim(),
          expenseHead: expenseHead.trim(),
          directIndirect,
          ledgerBranchLocation: ledgerBranchLocation.trim(),
          expenseIncomeType,
          ecomExpense,
        });
      } else {
        await onAddExpenseLedger({
          expenseSubHead: expenseSubHead.trim(),
          expenseHead: expenseHead.trim(),
          directIndirect,
          ledgerBranchLocation: ledgerBranchLocation.trim(),
          expenseIncomeType,
          ecomExpense,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save Expense Ledger.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await onDeleteExpenseLedger(deletingId);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete Expense Ledger:", err);
    }
  };

  const filteredRecords = expenseLedgers.filter((rec) => {
    const matchesSearch =
      (rec.expenseSubHead || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.expenseHead || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.ledgerBranchLocation || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" || rec.expenseIncomeType === filterType;

    const matchesDirect =
      filterDirect === "all" || rec.directIndirect === filterDirect;

    return matchesSearch && matchesType && matchesDirect;
  });

  const totalLedgers = expenseLedgers.length;
  const expenseCount = expenseLedgers.filter((r) => r.expenseIncomeType === "Expense").length;
  const incomeCount = expenseLedgers.filter((r) => r.expenseIncomeType === "Income").length;
  const ecomCount = expenseLedgers.filter((r) => r.ecomExpense === "Yes").length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-mono">
                Expense Ledger Master
              </h2>
              <p className="text-xs text-slate-500">
                Manage expense sub-heads, heads, branch locations, and income/expense categorizations
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          New Ledger Item
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Total Ledgers</span>
            <BookOpen size={14} className="text-emerald-600" />
          </div>
          <p className="text-lg font-extrabold text-slate-900 font-mono">{totalLedgers}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Expense Types</span>
            <Tag size={14} className="text-rose-500" />
          </div>
          <p className="text-lg font-extrabold text-rose-600 font-mono">{expenseCount}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Income Types</span>
            <Tag size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-extrabold text-emerald-600 font-mono">{incomeCount}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">ECOM Expenses</span>
            <Layers size={14} className="text-sky-500" />
          </div>
          <p className="text-lg font-extrabold text-sky-600 font-mono">{ecomCount}</p>
        </div>
      </div>

      {/* Controls Bar: Search + Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Sub-head, Head, or Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
          >
            <option value="all">All Types (Expense/Income)</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>

          <select
            value={filterDirect}
            onChange={(e) => setFilterDirect(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
          >
            <option value="all">All Direct/Indirect</option>
            <option value="Direct">Direct</option>
            <option value="Indirect">Indirect</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Expense Sub-head</th>
                <th className="p-3">Expense Head</th>
                <th className="p-3">Direct / Indirect</th>
                <th className="p-3">Location</th>
                <th className="p-3">Type</th>
                <th className="p-3">ECOM Expense</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <BookOpen size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-semibold text-slate-600 text-xs">No Expense Ledgers found.</p>
                    <p className="text-[11px] text-slate-400">Click "New Ledger Item" to add one.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900 font-mono">{rec.expenseSubHead}</td>
                    <td className="p-3 text-slate-700 font-mono">{rec.expenseHead}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        rec.directIndirect === "Direct"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {rec.directIndirect}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {rec.ledgerBranchLocation}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        rec.expenseIncomeType === "Expense"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {rec.expenseIncomeType}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        rec.ecomExpense === "Yes"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {rec.ecomExpense}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        {isManagerOrAdmin && (
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
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Expense Ledger */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {editingRecord ? "Edit Expense Ledger" : "New Expense Ledger Item"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-mono">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Expense Sub-head */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Expense Sub-head <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Courier & Freight"
                    value={expenseSubHead}
                    onChange={(e) => setExpenseSubHead(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Expense Head */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Expense Head <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Administrative Expenses"
                    value={expenseHead}
                    onChange={(e) => setExpenseHead(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Direct / Indirect */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Direct / Indirect <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={directIndirect}
                    onChange={(e) => setDirectIndirect(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  >
                    <option value="Direct">Direct</option>
                    <option value="Indirect">Indirect</option>
                  </select>
                </div>

                {/* Ledger Branch Location */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Ledger Branch Location / AOL Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ledgerBranchLocation}
                    onChange={(e) => setLedgerBranchLocation(e.target.value)}
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

                {/* Expense / Income Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Expense / Income Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={expenseIncomeType}
                    onChange={(e) => setExpenseIncomeType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </div>

                {/* ECOM Expense */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    ECOM Expense <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ecomExpense}
                    onChange={(e) => setEcomExpense(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
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
                  {isSaving ? "Saving..." : editingRecord ? "Update Ledger Item" : "Save Ledger Item"}
                </button>
              </div>
            </form>
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
              <h3 className="text-sm font-bold text-slate-900 font-mono">Delete Expense Ledger</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Are you sure you want to delete this Expense Ledger item? Any linked Office Exp entries referencing this sub-head will retain their text.
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
