/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { OtherIncomeLedgerItem, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Edit2, Trash2, X, ShieldAlert, BookOpen, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface OtherIncomeLedgerSubViewProps {
  activeUserId: string;
  users: User[];
  otherIncomeLedgers?: OtherIncomeLedgerItem[];
  onAddOtherIncomeLedger?: (record: Omit<OtherIncomeLedgerItem, "id" | "createdAt">) => Promise<void> | void;
  onEditOtherIncomeLedger?: (record: OtherIncomeLedgerItem) => Promise<void> | void;
  onDeleteOtherIncomeLedger?: (id: string) => Promise<void> | void;
}

export default function OtherIncomeLedgerSubView({
  activeUserId,
  users,
  otherIncomeLedgers = [],
  onAddOtherIncomeLedger,
  onEditOtherIncomeLedger,
  onDeleteOtherIncomeLedger,
}: OtherIncomeLedgerSubViewProps) {
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
  const [filterEffect, setFilterEffect] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeLedgerItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [ledgerName, setLedgerName] = useState("");
  const [effect, setEffect] = useState<"Income" | "Expense">("Income");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingRecord(null);
    setLedgerName("");
    setEffect("Income");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec: OtherIncomeLedgerItem) => {
    setEditingRecord(rec);
    setLedgerName(rec.ledger || "");
    setEffect(rec.effect || "Income");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerName.trim()) {
      setFormError("Please enter a Ledger Name.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingRecord) {
        if (onEditOtherIncomeLedger) {
          await onEditOtherIncomeLedger({
            ...editingRecord,
            ledger: ledgerName.trim(),
            effect,
          });
        }
      } else {
        if (onAddOtherIncomeLedger) {
          await onAddOtherIncomeLedger({
            ledger: ledgerName.trim(),
            effect,
          });
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save ledger item.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId || !onDeleteOtherIncomeLedger) return;
    try {
      await onDeleteOtherIncomeLedger(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filteredRecords = otherIncomeLedgers.filter((rec) => {
    const matchesSearch = (rec.ledger || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEffect = filterEffect === "all" || rec.effect === filterEffect;
    return matchesSearch && matchesEffect;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ledger List</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage ledger items and their classification (Income / Expense) for Other Income</p>
          </div>
        </div>

        {isManagerOrAdmin && (
          <button
            id="btn-add-ledger-item"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            Add New Ledger
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Ledger Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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

        <div className="flex items-center gap-2">
          <select
            value={filterEffect}
            onChange={(e) => setFilterEffect(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none"
          >
            <option value="all">All Effects</option>
            <option value="Income">Income (+)</option>
            <option value="Expense">Expense (-)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-bold tracking-wider">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Ledger Name</th>
                <th className="px-4 py-3">Effect</th>
                <th className="px-4 py-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                      <p>No Ledger entries found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 font-medium">{index + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{rec.ledger}</td>
                    <td className="px-4 py-2.5">
                      {rec.effect === "Income" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          Income (+)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <ArrowDownRight className="w-3 h-3 text-rose-600" />
                          Expense (-)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isManagerOrAdmin && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(rec)}
                            title="Edit Ledger"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(rec.id)}
                            title="Delete Ledger"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {editingRecord ? "Edit Ledger" : "Add New Ledger"}
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

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                  Ledger Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Interest Received, Service Charges, Rent"
                  value={ledgerName}
                  onChange={(e) => setLedgerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                  Effect <span className="text-rose-500">*</span>
                </label>
                <select
                  value={effect}
                  onChange={(e) => setEffect(e.target.value as "Income" | "Expense")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Income">Income (+ for income)</option>
                  <option value="Expense">Expense (- for expense)</option>
                </select>
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
                  {isSaving ? "Saving..." : editingRecord ? "Update Ledger" : "Add Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this Ledger item? This action cannot be undone.
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
                Delete Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
