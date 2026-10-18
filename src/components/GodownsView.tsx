import React, { useState } from "react";
import { Warehouse, Plus, Edit2, Trash2, Search, X, AlertCircle } from "lucide-react";
import { User, AolGodown, AolBranchName } from "../types";

interface GodownsViewProps {
  activeUserId: string;
  users: User[];
  aolGodowns: AolGodown[];
  aolBranches: AolBranchName[];
  onAddAolGodown: (data: Omit<AolGodown, "id" | "createdAt">) => void;
  onEditAolGodown: (id: string, data: Omit<AolGodown, "id" | "createdAt">) => void;
  onDeleteAolGodown: (id: string) => void;
}

export default function GodownsView({
  activeUserId,
  users,
  aolGodowns,
  aolBranches,
  onAddAolGodown,
  onEditAolGodown,
  onDeleteAolGodown,
}: GodownsViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isManagerOrAdmin =
    activeUser?.accessLevel === "Manager" || activeUser?.role === "Admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [godownName, setGodownName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrAdmin) return;

    if (!godownName.trim()) {
      setError("Godown name is required.");
      return;
    }

    if (!selectedBranch) {
      setError("Please select an AOL Branch name.");
      return;
    }

    // Check for duplicate godown name (case-insensitive)
    const isDuplicate = aolGodowns.some(
      (g) =>
        g.name.trim().toLowerCase() === godownName.trim().toLowerCase() &&
        g.id !== editingId
    );

    if (isDuplicate) {
      setError(`A godown named "${godownName.trim()}" already exists.`);
      return;
    }

    setError(null);

    const payload = {
      name: godownName.trim(),
      branchName: selectedBranch,
      description: description.trim(),
    };

    if (editingId) {
      onEditAolGodown(editingId, payload);
      setEditingId(null);
    } else {
      onAddAolGodown(payload);
    }

    // Reset form
    setGodownName("");
    setSelectedBranch("");
    setDescription("");
  };

  const handleStartEdit = (godown: AolGodown) => {
    setEditingId(godown.id);
    setGodownName(godown.name);
    setSelectedBranch(godown.branchName || "");
    setDescription(godown.description || "");
    setConfirmDeleteId(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGodownName("");
    setSelectedBranch("");
    setDescription("");
    setError(null);
  };

  // Filter godowns based on search query
  const filteredGodowns = aolGodowns.filter((g) => {
    const term = searchQuery.toLowerCase();
    const nameMatch = g.name.toLowerCase().includes(term);
    const branchMatch = (g.branchName || "").toLowerCase().includes(term);
    const descMatch = (g.description || "").toLowerCase().includes(term);
    return nameMatch || branchMatch || descMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Information Header */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
        <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1">
          Godowns & Branches Mapping
        </h2>
        <p className="text-xs text-slate-500">
          Map specific Godowns (warehouses) directly to AOL branch locations to maintain strict supply chain and transfer logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Column */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Warehouse size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wide">
              {editingId ? "Edit Mapping" : "Create Mapping"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-lg text-[11px] font-medium font-mono">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide mb-1.5">
                Godown / Warehouse Name
              </label>
              <input
                type="text"
                disabled={!isManagerOrAdmin}
                value={godownName}
                onChange={(e) => setGodownName(e.target.value)}
                placeholder="e.g. Godown A, Sonipat-2..."
                className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide mb-1.5">
                Map to AOL Branch Name
              </label>
              <select
                disabled={!isManagerOrAdmin}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">-- Select AOL Branch Name --</option>
                {aolBranches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide mb-1.5">
                Description / Remarks
              </label>
              <textarea
                disabled={!isManagerOrAdmin}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Primary storage for raw materials..."
                rows={2}
                className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={!isManagerOrAdmin}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {editingId ? (
                  <>Update Mapping</>
                ) : (
                  <>
                    <Plus size={14} /> Add Godown
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List/Table Column */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs lg:col-span-2 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wide">
              Current Mappings ({filteredGodowns.length})
            </h3>

            {/* Search Input */}
            <div className="relative max-w-xs w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search godown or branch..."
                className="w-full text-xs border border-slate-200 bg-slate-50 pl-9 pr-8 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 space-y-2 font-mono">
            {filteredGodowns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                {searchQuery ? "No matching mapping found." : "No Godowns mapped yet."}
              </div>
            ) : (
              filteredGodowns.map((godown) => {
                const isConfirmingDelete = confirmDeleteId === godown.id;

                return (
                  <div
                    key={godown.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all font-medium text-slate-700"
                  >
                    {isConfirmingDelete ? (
                      <div className="flex items-center justify-between w-full bg-rose-50 p-2.5 rounded-lg border border-rose-200 animate-fade-in">
                        <span className="text-[11px] text-rose-800 font-bold">
                          Delete "{godown.name}" mapping?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onDeleteAolGodown(godown.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50/50 text-emerald-600 rounded-lg">
                            <Warehouse size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {godown.name}
                            </p>
                            {godown.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5 italic max-w-md break-words">
                                {godown.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-[10px] text-slate-400">
                                Mapped Branch:
                              </span>
                              {godown.branchName ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  {godown.branchName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                  Unmapped
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-center">
                          {isManagerOrAdmin ? (
                            <>
                              <button
                                onClick={() => handleStartEdit(godown)}
                                className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50/50 transition-all cursor-pointer"
                                title={`Edit ${godown.name}`}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(godown.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50/50 transition-all cursor-pointer"
                                title={`Delete ${godown.name}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                disabled
                                className="text-slate-300 p-1.5 cursor-not-allowed"
                                title="Requires Manager or Admin role"
                              >
                                <Edit2 size={13} className="opacity-45" />
                              </button>
                              <button
                                disabled
                                className="text-slate-300 p-1.5 cursor-not-allowed"
                                title="Requires Manager or Admin role"
                              >
                                <Trash2 size={13} className="opacity-45" />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
