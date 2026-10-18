/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { ImportBoeRecord, ImportPiRecord, User, AolBranchName, Role } from "../../../types";
import { Search, Receipt, Building2, Edit, Save, ShieldAlert, FileSpreadsheet, Plus } from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";
import ImportBoeBulkImportModal from "../ImportBoeBulkImportModal";

interface ImportDeferredDutySubViewProps {
  activeUserId: string;
  users: User[];
  importBoes: ImportBoeRecord[];
  importPis?: ImportPiRecord[];
  onAddImportBoe?: (record: Omit<ImportBoeRecord, "id" | "createdAt">) => void;
  onUpdateImportBoe: (record: ImportBoeRecord) => void;
  aolBranches?: AolBranchName[];
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportDeferredDutySubView({
  activeUserId,
  users,
  importBoes = [],
  importPis = [],
  onAddImportBoe,
  onUpdateImportBoe,
  aolBranches = [],
  canAdd = true,
  canEdit = true
}: ImportDeferredDutySubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.teamName === "Executive";
  const isEditable = isAdmin || canEdit !== false;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

  // Background Google Sheets Sync Hook (Dedicated Sub-tab Config)
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_deferred_duty_config",
    "Deferred Duty",
    "import_boes",
    "import_boe_duty_config"
  );

  // Local form state for the row being edited
  const [editForm, setEditForm] = useState<Partial<ImportBoeRecord>>({});

  const handleStartEdit = (rec: ImportBoeRecord) => {
    setEditingRowId(rec.id);
    setEditForm({
      beStatus: rec.beStatus || "",
      deferredDuty: rec.deferredDuty || "No",
      deferredDutyAmt: rec.deferredDutyAmt || "",
      paymentDueDate: rec.paymentDueDate || "",
      stampDutyAmount: rec.stampDutyAmount || "",
      stampDutyDate: rec.stampDutyDate || "",
      statusRemark: rec.statusRemark || "",
    });
  };

  const handleSaveEdit = (rec: ImportBoeRecord) => {
    const updated: ImportBoeRecord = {
      ...rec,
      ...editForm,
    };
    onUpdateImportBoe(updated);
    triggerSync("EDIT", updated);
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
  };

  const filteredRecords = useMemo(() => {
    return importBoes.filter((rec) => {
      const matchesBranch = selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rec.beNo.toLowerCase().includes(q) ||
        rec.piNo.toLowerCase().includes(q) ||
        rec.productName.toLowerCase().includes(q) ||
        rec.invoiceNumber.toLowerCase().includes(q) ||
        (rec.lotBatchNumber && rec.lotBatchNumber.toLowerCase().includes(q)) ||
        (rec.beQuery && rec.beQuery.toLowerCase().includes(q)) ||
        rec.aolBranchName.toLowerCase().includes(q) ||
        (rec.beStatus && rec.beStatus.toLowerCase().includes(q)) ||
        (rec.statusRemark && rec.statusRemark.toLowerCase().includes(q));

      return matchesBranch && matchesSearch;
    });
  }, [importBoes, searchQuery, selectedBranchFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <ImportBoeBulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          importPis={importPis}
          existingBoes={importBoes}
          onAddImportBoe={onAddImportBoe || (() => {})}
          onUpdateImportBoe={onUpdateImportBoe}
          activeUserId={activeUserId}
          activeUserName={activeUser?.name || "Current User"}
          onSyncToAppsScript={triggerSync}
        />
      )}

      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_deferred_duty_config"
        defaultSheetName="Deferred Duty"
        collectionKey="import_boes"
        records={importBoes}
        activeUser={activeUser}
        moduleTitle="Deferred Duty"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importBoes.find((b) => (b.beNo === rec.beNo && b.productName === rec.productName) || b.id === rec.id);
            if (existing) {
              onUpdateImportBoe({ ...existing, ...rec });
            } else if (onAddImportBoe) {
              onAddImportBoe(rec);
            }
          });
        }}
      />

      {/* Top Header / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total BOE Records</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{importBoes.length}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Receipt size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Filtered Records</p>
            <p className="text-xl font-extrabold text-blue-700 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Branches</p>
            <p className="text-xl font-extrabold text-slate-700 mt-0.5">{aolBranches.length || 1}</p>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BE No, PI No, Product, Status..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-700 outline-none"
          >
            <option value="ALL">All Branches</option>
            {aolBranches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {canAdd && (
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Import or update BOE and extended Deferred Duty records from Google Sheets or CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Import Data (BOE & Duty)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3">BOE & Product Info</th>
                <th className="py-3 px-3">BE STATUS</th>
                <th className="py-3 px-3">DEFERRED DUTY</th>
                <th className="py-3 px-3">DEFERRED DUTY Amt</th>
                <th className="py-3 px-3">PAYMENT DUE DATE</th>
                <th className="py-3 px-3">Stamp Duty Amount</th>
                <th className="py-3 px-3">Stamp Duty Date</th>
                <th className="py-3 px-3">Status / Remark</th>
                <th className="py-3 px-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt size={28} className="text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">No BOE records found for Deferred Duty</p>
                      <p className="text-[11px] text-slate-400">Add BOE entries in the BOE tab first or click 'Import Data (BOE & Duty)'.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isEditing = editingRowId === rec.id;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* BOE Info (Read-Only) */}
                      <td className="py-3 px-3 align-top min-w-[220px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-slate-900 font-mono text-xs">
                            BE: {rec.beNo} <span className="font-normal text-slate-500">({rec.beDate})</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">{rec.productName}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-rose-50 text-rose-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Entry: {rec.entryDate || new Date().toISOString().split("T")[0]}
                            </span>
                            <span className="bg-sky-50 text-sky-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                              PI: {rec.piNo}
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {rec.aolBranchName}
                            </span>
                            {rec.lotBatchNumber && rec.lotBatchNumber !== "N/A" && (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200/60 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold" title="Lot / Batch Number">
                                Lot: {rec.lotBatchNumber}
                              </span>
                            )}
                            {rec.boeExRate > 0 && (
                              <span className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded text-[10px]">
                                Ex: ₹{rec.boeExRate}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* BE STATUS */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.beStatus || ""}
                            onChange={(e) => setEditForm({ ...editForm, beStatus: e.target.value })}
                            placeholder="BE Status"
                            className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-800 font-semibold">{rec.beStatus || "—"}</span>
                        )}
                      </td>

                      {/* DEFERRED DUTY */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <select
                            value={editForm.deferredDuty || "No"}
                            onChange={(e) => setEditForm({ ...editForm, deferredDuty: e.target.value })}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs outline-none font-bold"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${rec.deferredDuty === "Yes" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                            {rec.deferredDuty || "No"}
                          </span>
                        )}
                      </td>

                      {/* DEFERRED DUTY Amt */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.deferredDutyAmt || ""}
                            onChange={(e) => setEditForm({ ...editForm, deferredDutyAmt: e.target.value })}
                            placeholder="Amount"
                            className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-800">{rec.deferredDutyAmt ? `₹${rec.deferredDutyAmt}` : "—"}</span>
                        )}
                      </td>

                      {/* PAYMENT DUE DATE */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.paymentDueDate || ""}
                            onChange={(e) => setEditForm({ ...editForm, paymentDueDate: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.paymentDueDate || "—"}</span>
                        )}
                      </td>

                      {/* Stamp Duty Amount */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.stampDutyAmount || ""}
                            onChange={(e) => setEditForm({ ...editForm, stampDutyAmount: e.target.value })}
                            placeholder="Stamp Amt"
                            className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-800">{rec.stampDutyAmount ? `₹${rec.stampDutyAmount}` : "—"}</span>
                        )}
                      </td>

                      {/* Stamp Duty Date */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.stampDutyDate || ""}
                            onChange={(e) => setEditForm({ ...editForm, stampDutyDate: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.stampDutyDate || "—"}</span>
                        )}
                      </td>

                      {/* Status / Remark */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.statusRemark || ""}
                            onChange={(e) => setEditForm({ ...editForm, statusRemark: e.target.value })}
                            placeholder="Status/Remark"
                            className="w-36 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="text-slate-700 italic">{rec.statusRemark || "—"}</span>
                        )}
                      </td>

                      {/* Actions: ONLY EDIT */}
                      <td className="py-3 px-3 text-right align-top">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(rec)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs transition cursor-pointer"
                              title="Save Details"
                            >
                              <Save size={13} />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[11px] transition cursor-pointer"
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          isEditable ? (
                            <button
                              onClick={() => handleStartEdit(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded border border-slate-200 font-bold text-[11px] transition cursor-pointer"
                              title="Edit Deferred Duty & Stamp Duty Details"
                            >
                              <Edit size={13} />
                              Edit
                            </button>
                          ) : null
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
