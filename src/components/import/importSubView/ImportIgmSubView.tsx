/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { ImportContainerRecord, ImportBoeRecord, User, AolBranchName, Role } from "../../../types";
import { Search, FileCheck, Building2, Check, Edit, Save, Layers } from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../Configuration/AppsScriptSyncBanner";

interface ImportIgmSubViewProps {
  activeUserId: string;
  users: User[];
  importBoes?: ImportBoeRecord[];
  importContainers: ImportContainerRecord[];
  onUpdateImportContainer: (record: ImportContainerRecord) => void;
  aolBranches?: AolBranchName[];
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportIgmSubView({
  activeUserId,
  users,
  importBoes = [],
  importContainers = [],
  onUpdateImportContainer,
  aolBranches = [],
  canEdit = true
}: ImportIgmSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.teamName === "Executive";
  const isEditable = isAdmin || canEdit !== false;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook (Dedicated Sub-tab Config)
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_igm_config",
    "Import IGM",
    "import_containers",
    "import_container_igm_config"
  );

  // Local form state for the row being edited
  const [editForm, setEditForm] = useState<Partial<ImportContainerRecord>>({});

  const handleStartEdit = (rec: ImportContainerRecord) => {
    setEditingRowId(rec.id);
    setEditForm({
      igmNoDt: rec.igmNoDt || "",
      igmItemNo: rec.igmItemNo || "",
      igmChaSelfJobNo: rec.igmChaSelfJobNo || "",
      igmFinalInwardDate: rec.igmFinalInwardDate || "",
      igmContainerGatedIn: rec.igmContainerGatedIn || "",
      igmCfsLastDate: rec.igmCfsLastDate || "",
      igmMaterialMovedOutOfCfs: rec.igmMaterialMovedOutOfCfs || "",
      igmFreeEmptyCtnrDetentionLastDt: rec.igmFreeEmptyCtnrDetentionLastDt || "",
      igmStatusRemark: rec.igmStatusRemark || "",
      igmDuty: !!rec.igmDuty,
      igmShpLine: !!rec.igmShpLine,
      igmStampDuty: !!rec.igmStampDuty,
      igmDo: !!rec.igmDo,
      igmCfs: !!rec.igmCfs,
      igmOocStatus: !!rec.igmOocStatus,
    });
  };

  const handleSaveEdit = (rec: ImportContainerRecord) => {
    const updated: ImportContainerRecord = {
      ...rec,
      ...editForm,
    };
    onUpdateImportContainer(updated);
    triggerSync("EDIT", updated);
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
  };

  const filteredRecords = useMemo(() => {
    return importContainers.filter((rec) => {
      const matchesBranch = selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rec.containerNo.toLowerCase().includes(q) ||
        rec.beNo.toLowerCase().includes(q) ||
        rec.invoiceNumber.toLowerCase().includes(q) ||
        rec.productName.toLowerCase().includes(q) ||
        (rec.piNo && rec.piNo.toLowerCase().includes(q)) ||
        rec.aolBranchName.toLowerCase().includes(q) ||
        (rec.igmNoDt && rec.igmNoDt.toLowerCase().includes(q)) ||
        (rec.igmItemNo && rec.igmItemNo.toLowerCase().includes(q)) ||
        (rec.igmChaSelfJobNo && rec.igmChaSelfJobNo.toLowerCase().includes(q));

      return matchesBranch && matchesSearch;
    });
  }, [importContainers, searchQuery, selectedBranchFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_igm_config"
        defaultSheetName="Import IGM"
        collectionKey="import_containers"
        records={importContainers}
        activeUser={activeUser}
        moduleTitle="IGM & Item"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((r) => {
            const existing = importContainers.find((c) => c.containerNo === r.containerNo || c.id === r.id);
            if (existing) {
              onUpdateImportContainer({ ...existing, ...r });
            }
          });
        }}
      />

      {/* Top Header / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Containers</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{importContainers.length}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Filtered IGM Records</p>
            <p className="text-xl font-extrabold text-blue-700 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileCheck size={20} />
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
              placeholder="Search Container No, BE No, IGM No, Item No, Job No..."
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
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3">Container & Product Info</th>
                <th className="py-3 px-3">IGM NO & DT</th>
                <th className="py-3 px-3">ITEM NO</th>
                <th className="py-3 px-3">CHA / SELF JOB NO</th>
                <th className="py-3 px-3">Final Inward Date</th>
                <th className="py-3 px-3">Container Gated In</th>
                <th className="py-3 px-3">CFS Last Date (10D)</th>
                <th className="py-3 px-3">Material Moved Out CFS</th>
                <th className="py-3 px-3">Free Empty Detention Dt</th>
                <th className="py-3 px-3">Status / Remark</th>
                <th className="py-3 px-3 text-center">Checkboxes (Duty, Shp Line, Stamp, DO, CFS, OOC)</th>
                <th className="py-3 px-3 text-right">IGM Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileCheck size={28} className="text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">No container records found for IGM entry</p>
                      <p className="text-[11px] text-slate-400">Add containers in the Containers tab first.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isEditing = editingRowId === rec.id;

                  let displayPiNo = rec.piNo;
                  if (!displayPiNo) {
                    const matchBoe = importBoes.find(
                      (b) =>
                        b.aolBranchName === rec.aolBranchName &&
                        b.beNo === rec.beNo &&
                        b.invoiceNumber === rec.invoiceNumber &&
                        b.productName === rec.productName
                    );
                    displayPiNo = matchBoe?.piNo || "";
                  }

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Base Info (Read-Only) */}
                      <td className="py-3 px-3 align-top min-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-slate-900 font-mono text-xs">
                            {rec.containerNo} <span className="font-normal text-slate-500">({rec.sizeOfContainer})</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">{rec.productName}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-rose-50 text-rose-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Entry: {rec.entryDate || new Date().toISOString().split("T")[0]}
                            </span>
                            <span className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                              BE: {rec.beNo}
                            </span>
                            {displayPiNo && (
                              <span className="bg-sky-50 text-sky-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                                PI: {displayPiNo}
                              </span>
                            )}
                            <span className="bg-emerald-50 text-emerald-800 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {rec.containerWiseQty.toLocaleString()} Kg
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{rec.aolBranchName}</span>
                        </div>
                      </td>

                      {/* IGM NO & DT */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.igmNoDt || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmNoDt: e.target.value })}
                            placeholder="IGM No & Dt"
                            className="w-36 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-800 font-medium">{rec.igmNoDt || "—"}</span>
                        )}
                      </td>

                      {/* ITEM NO */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.igmItemNo || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmItemNo: e.target.value })}
                            placeholder="Item No"
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-800 font-medium">{rec.igmItemNo || "—"}</span>
                        )}
                      </td>

                      {/* CHA / SELF JOB NO */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.igmChaSelfJobNo || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmChaSelfJobNo: e.target.value })}
                            placeholder="Job No"
                            className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-800 font-medium">{rec.igmChaSelfJobNo || "—"}</span>
                        )}
                      </td>

                      {/* Final Inward Date */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.igmFinalInwardDate || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmFinalInwardDate: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.igmFinalInwardDate || "—"}</span>
                        )}
                      </td>

                      {/* CONTAINER GATED IN */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.igmContainerGatedIn || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmContainerGatedIn: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.igmContainerGatedIn || "—"}</span>
                        )}
                      </td>

                      {/* CFS LAST DATE (10 Days) */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.igmCfsLastDate || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmCfsLastDate: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.igmCfsLastDate || "—"}</span>
                        )}
                      </td>

                      {/* MATERIAL MOVED OUT OF CFS */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.igmMaterialMovedOutOfCfs || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmMaterialMovedOutOfCfs: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.igmMaterialMovedOutOfCfs || "—"}</span>
                        )}
                      </td>

                      {/* FREE EMPTY CTNR DETENTION LAST DT */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.igmFreeEmptyCtnrDetentionLastDt || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmFreeEmptyCtnrDetentionLastDt: e.target.value })}
                            className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{rec.igmFreeEmptyCtnrDetentionLastDt || "—"}</span>
                        )}
                      </td>

                      {/* Status / Remark */}
                      <td className="py-3 px-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.igmStatusRemark || ""}
                            onChange={(e) => setEditForm({ ...editForm, igmStatusRemark: e.target.value })}
                            placeholder="Status/Remark"
                            className="w-36 px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        ) : (
                          <span className="text-slate-700 italic">{rec.igmStatusRemark || "—"}</span>
                        )}
                      </td>

                      {/* Six Checkboxes: DUTY, SHP LINE, STAMP DUTY, DO, CFS, OOC Status */}
                      <td className="py-3 px-3 align-top text-center">
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-700 min-w-[220px]">
                          <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isEditing ? !!editForm.igmDuty : !!rec.igmDuty}
                              onChange={(e) => setEditForm({ ...editForm, igmDuty: e.target.checked })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Duty</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isEditing ? !!editForm.igmShpLine : !!rec.igmShpLine}
                              onChange={(e) => setEditForm({ ...editForm, igmShpLine: e.target.checked })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Shp Line</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isEditing ? !!editForm.igmStampDuty : !!rec.igmStampDuty}
                              onChange={(e) => setEditForm({ ...editForm, igmStampDuty: e.target.checked })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Stamp</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isEditing ? !!editForm.igmDo : !!rec.igmDo}
                              onChange={(e) => setEditForm({ ...editForm, igmDo: e.target.checked })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>DO</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isEditing ? !!editForm.igmCfs : !!rec.igmCfs}
                              onChange={(e) => setEditForm({ ...editForm, igmCfs: e.target.checked })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>CFS</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={isEditing ? !!editForm.igmOocStatus : !!rec.igmOocStatus}
                              onChange={(e) => setEditForm({ ...editForm, igmOocStatus: e.target.checked })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>OOC</span>
                          </label>
                        </div>
                      </td>

                      {/* Actions: ONLY IGM EDIT (No row delete or row edit for container base info) */}
                      <td className="py-3 px-3 text-right align-top">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(rec)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs transition cursor-pointer"
                              title="Save IGM Details"
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
                              title="Edit IGM & Item Details"
                            >
                              <Edit size={13} />
                              Edit IGM
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
