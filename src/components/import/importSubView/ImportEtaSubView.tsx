/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { ImportEtaRecord, EtaScheduleItem, ImportPiRecord, User, AolBranchName, SupplierName, Product, Role } from "../../../types";
import { Plus, Search, Trash2, Edit, Calendar, Clock, Eye, EyeOff, Building2, Layers, Check, X, MessageSquare, History, ArrowRight, FileSpreadsheet } from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";
import ImportEtaBulkImportModal from "../ImportEtaBulkImportModal";

interface ImportEtaSubViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importEtas: ImportEtaRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  onAddImportEta: (record: Omit<ImportEtaRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportEta: (record: ImportEtaRecord) => void;
  onDeleteImportEta: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportEtaSubView({
  activeUserId,
  users,
  importPis,
  importEtas,
  onAddImportEta,
  onUpdateImportEta,
  onDeleteImportEta,
  canAdd = true,
  canEdit = true
}: ImportEtaSubViewProps) {
  // Check Admin / Edit / Add Permission
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.role === ("Admin" as Role);
  const isEditable = isAdmin || canEdit !== false;
  const isAddable = isAdmin || canAdd !== false;

  // Form State for Creating Single ETA Entry in Add Form
  const [aolBranchName, setAolBranchName] = useState<string>("");
  const [piNo, setPiNo] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [etd, setEtd] = useState<string>(new Date().toISOString().split("T")[0]);
  const [eta, setEta] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  // UI Toggle States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [hiddenEtaRowIds, setHiddenEtaRowIds] = useState<Record<string, boolean>>({});
  const [areAllEtaHidden, setAreAllEtaHidden] = useState<boolean>(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportEtaRecord | null>(null);
  const [deletingEtaId, setDeletingEtaId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_eta_config",
    "Import ETAs",
    "import_etas"
  );

  // Calculate next sequential Record ID (ETA-#) based on maximum existing ID number
  const getTrackedNextEtaId = (offset: number = 0) => {
    let maxNum = 0;
    importEtas.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^ETA-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const baseNum = maxNum > 0 ? maxNum : importEtas.length;
    const nextNum = baseNum + 1 + offset;
    return `ETA-${nextNum}`;
  };

  // New Schedule Item input fields inside Edit Modal
  const [newEtd, setNewEtd] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newEta, setNewEta] = useState<string>("");
  const [newRemark, setNewRemark] = useState<string>("");

  // ==========================================
  // DYNAMIC DROPDOWN LOGIC FOR CREATE FORM
  // ==========================================

  // 1. AOL Branch Dropdown Options (Derived strictly from created "PI" sub-tab entries)
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    importPis.forEach((pi) => {
      if (pi.aolBranchName) {
        branchSet.add(pi.aolBranchName);
      }
    });
    return Array.from(branchSet);
  }, [importPis]);

  // Set default AOL Branch when options update
  useEffect(() => {
    if (availableBranches.length > 0) {
      if (!aolBranchName || !availableBranches.includes(aolBranchName)) {
        setAolBranchName(availableBranches[0]);
      }
    } else {
      setAolBranchName("");
    }
  }, [availableBranches]);

  // 2. PI No Dropdown Options (Filtered for selected AOL Branch; hides PIs if ETA details are saved for ALL products)
  const availablePiNumbers = useMemo(() => {
    if (!aolBranchName) return [];
    const piSet = new Set<string>();

    importPis
      .filter((pi) => pi.aolBranchName === aolBranchName)
      .forEach((pi) => {
        if (!pi.piNo) return;

        const piProducts = (pi.products && pi.products.length > 0)
          ? pi.products.map((p) => p.productName)
          : (pi.productName ? [pi.productName] : []);

        const savedEtas = importEtas.filter(
          (eta) => eta.aolBranchName === aolBranchName && eta.piNo === pi.piNo
        );
        const savedProductSet = new Set(savedEtas.map((eta) => eta.productName));

        // Hide PI if ETA details are saved for ALL products in this PI
        const isAllSaved = piProducts.length > 0 && piProducts.every((p) => savedProductSet.has(p));

        if (!isAllSaved) {
          piSet.add(pi.piNo);
        }
      });
    return Array.from(piSet);
  }, [importPis, importEtas, aolBranchName]);

  // Set default PI No when selected branch changes or options update
  useEffect(() => {
    if (availablePiNumbers.length > 0) {
      if (!piNo || !availablePiNumbers.includes(piNo)) {
        setPiNo(availablePiNumbers[0]);
      }
    } else {
      setPiNo("");
    }
  }, [availablePiNumbers]);

  // 3. Product Name Dropdown Options (Filtered for selected AOL Branch + PI No; excludes products with existing ETA)
  const availableProducts = useMemo(() => {
    if (!aolBranchName || !piNo) return [];
    const prodSet = new Set<string>();

    const matchingPis = importPis.filter(
      (pi) => pi.aolBranchName === aolBranchName && pi.piNo === piNo
    );

    const savedEtas = importEtas.filter(
      (eta) => eta.aolBranchName === aolBranchName && eta.piNo === piNo
    );
    const savedProductSet = new Set(savedEtas.map((eta) => eta.productName));

    matchingPis.forEach((pi) => {
      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        pi.products.forEach((prod) => {
          if (prod.productName && !savedProductSet.has(prod.productName)) {
            prodSet.add(prod.productName);
          }
        });
      } else if (pi.productName && !savedProductSet.has(pi.productName)) {
        prodSet.add(pi.productName);
      }
    });

    return Array.from(prodSet);
  }, [importPis, importEtas, aolBranchName, piNo]);

  // Set default Product Name when selected PI No changes or options update
  useEffect(() => {
    if (availableProducts.length > 0) {
      if (!productName || !availableProducts.includes(productName)) {
        setProductName(availableProducts[0]);
      }
    } else {
      setProductName("");
    }
  }, [availableProducts]);

  // ==========================================
  // DYNAMIC DROPDOWN LOGIC FOR EDIT MODAL FORM
  // ==========================================

  const editAvailableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    importPis.forEach((pi) => {
      if (pi.aolBranchName) branchSet.add(pi.aolBranchName);
    });
    return Array.from(branchSet);
  }, [importPis]);

  const editAvailablePiNumbers = useMemo(() => {
    if (!editingRecord?.aolBranchName) return [];
    const piSet = new Set<string>();
    importPis
      .filter((pi) => pi.aolBranchName === editingRecord.aolBranchName)
      .forEach((pi) => {
        if (pi.piNo) piSet.add(pi.piNo);
      });
    return Array.from(piSet);
  }, [importPis, editingRecord?.aolBranchName]);

  const editAvailableProducts = useMemo(() => {
    if (!editingRecord?.aolBranchName || !editingRecord?.piNo) return [];
    const prodSet = new Set<string>();

    const matchingPis = importPis.filter(
      (pi) => pi.aolBranchName === editingRecord.aolBranchName && pi.piNo === editingRecord.piNo
    );

    matchingPis.forEach((pi) => {
      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        pi.products.forEach((prod) => {
          if (prod.productName) prodSet.add(prod.productName);
        });
      } else if (pi.productName) {
        prodSet.add(pi.productName);
      }
    });

    return Array.from(prodSet);
  }, [importPis, editingRecord?.aolBranchName, editingRecord?.piNo]);

  // Handle Create Form Submit (In Add Form: Single ETA/ETD)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!aolBranchName) {
      alert("Please select an AOL Branch (Entries must first be created in 'PI' tab).");
      return;
    }
    if (!piNo) {
      alert("Please select a PI Number.");
      return;
    }
    if (!productName) {
      alert("Please select a Product Name.");
      return;
    }

    const matchingPi = importPis.find(
      (pi) => pi.aolBranchName === aolBranchName && pi.piNo === piNo
    );

    const initialSchedule: EtaScheduleItem = {
      id: `sch-${Date.now()}`,
      etd: etd || new Date().toISOString().split("T")[0],
      eta: eta || "N/A",
      remark: remark.trim() || "Initial ETA Entry",
      createdAt: new Date().toISOString()
    };

    const newRecord: Omit<ImportEtaRecord, "id" | "createdAt"> = {
      aolBranchName,
      piNo,
      productName,
      supplierName: matchingPi?.supplierName || "N/A",
      mfg: matchingPi?.mfg || "N/A",
      port: matchingPi?.port || "N/A",
      etd: etd || new Date().toISOString().split("T")[0],
      eta: eta || "N/A",
      remark: remark.trim() || "N/A",
      schedules: [initialSchedule],
      entryDate: entryDate || new Date().toISOString().split("T")[0],
      createdByUserId: activeUserId,
      createdByName: activeUser?.name || "Current User"
    };

    const generatedId = getTrackedNextEtaId();
    const fullRecord: ImportEtaRecord = {
      ...newRecord,
      id: generatedId,
      createdAt: new Date().toISOString()
    };

    onAddImportEta(fullRecord);
    triggerSync("ADD", fullRecord);

    // Reset fields
    setEtd(new Date().toISOString().split("T")[0]);
    setEta("");
    setRemark("");
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: ImportEtaRecord) => {
    if (!isEditable) {
      alert("You do not have permission to edit ETA records.");
      return;
    }

    // Ensure schedules array exists
    const initialSchedules = rec.schedules && rec.schedules.length > 0
      ? rec.schedules
      : [{
          id: `sch-1`,
          etd: rec.etd || "",
          eta: rec.eta || "",
          remark: rec.remark || "Initial ETA Entry",
          createdAt: rec.createdAt
        }];

    setEditingRecord({
      ...rec,
      schedules: initialSchedules
    });
    setNewEtd(new Date().toISOString().split("T")[0]);
    setNewEta("");
    setNewRemark("");
  };

  // Add new schedule item in Edit Modal
  const handleAddScheduleInEdit = () => {
    if (!editingRecord) return;
    if (!newEtd && !newEta) {
      alert("Please fill in ETD or ETA date for the new schedule entry.");
      return;
    }

    const newScheduleItem: EtaScheduleItem = {
      id: `sch-${Date.now()}`,
      etd: newEtd || "N/A",
      eta: newEta || "N/A",
      remark: newRemark.trim() || "Updated ETA Schedule",
      createdAt: new Date().toISOString()
    };

    const updatedSchedules = [...(editingRecord.schedules || []), newScheduleItem];

    // Update primary fields to latest schedule
    setEditingRecord({
      ...editingRecord,
      etd: newEtd || editingRecord.etd,
      eta: newEta || editingRecord.eta,
      remark: newRemark.trim() || editingRecord.remark,
      schedules: updatedSchedules
    });

    setNewEtd(new Date().toISOString().split("T")[0]);
    setNewEta("");
    setNewRemark("");
  };

  // Remove schedule item in Edit Modal
  const handleRemoveScheduleInEdit = (scheduleId: string) => {
    if (!editingRecord || !editingRecord.schedules) return;
    if (editingRecord.schedules.length <= 1) {
      alert("At least one ETA/ETD schedule entry must remain.");
      return;
    }

    const updatedSchedules = editingRecord.schedules.filter((s) => s.id !== scheduleId);
    const lastItem = updatedSchedules[updatedSchedules.length - 1];

    setEditingRecord({
      ...editingRecord,
      etd: lastItem?.etd || editingRecord.etd,
      eta: lastItem?.eta || editingRecord.eta,
      remark: lastItem?.remark || editingRecord.remark,
      schedules: updatedSchedules
    });
  };

  // Save Edit Form
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editingRecord.aolBranchName || !editingRecord.piNo || !editingRecord.productName) {
      alert("Please select AOL Branch, PI No, and Product Name.");
      return;
    }

    const matchingPi = importPis.find(
      (pi) => pi.aolBranchName === editingRecord.aolBranchName && pi.piNo === editingRecord.piNo
    );

    const updatedRecord: ImportEtaRecord = {
      ...editingRecord,
      supplierName: editingRecord.supplierName || matchingPi?.supplierName || "N/A",
      mfg: editingRecord.mfg || matchingPi?.mfg || "N/A",
      port: editingRecord.port || matchingPi?.port || "N/A"
    };

    onUpdateImportEta(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  // Filtered ETA Records
  const filteredRecords = useMemo(() => {
    return importEtas.filter((rec) => {
      const matchesBranch = selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rec.piNo.toLowerCase().includes(q) ||
        rec.productName.toLowerCase().includes(q) ||
        rec.aolBranchName.toLowerCase().includes(q) ||
        rec.remark.toLowerCase().includes(q) ||
        (rec.schedules && rec.schedules.some((s) => s.remark.toLowerCase().includes(q) || s.etd.toLowerCase().includes(q) || s.eta.toLowerCase().includes(q)));

      return matchesBranch && matchesSearch;
    });
  }, [importEtas, searchQuery, selectedBranchFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_eta_config"
        defaultSheetName="Import ETAs"
        collectionKey="import_etas"
        records={importEtas}
        activeUser={activeUser}
        moduleTitle="ETA Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importEtas.find((e) => (e.piNo === rec.piNo && e.productName === rec.productName) || e.id === rec.id);
            if (existing) {
              onUpdateImportEta({ ...existing, ...rec });
            } else {
              onAddImportEta(rec);
            }
          });
        }}
      />

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total ETA Records</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Active PI Schedules</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {new Set(filteredRecords.map((r) => r.piNo)).size} <span className="text-xs font-normal text-slate-500">PIs</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calendar size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Schedule Logs</p>
            <p className="text-xl font-extrabold text-indigo-700 mt-0.5">
              {filteredRecords.reduce((acc, curr) => acc + (curr.schedules?.length || 1), 0)} <span className="text-xs font-normal text-slate-500">Entries</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <History size={20} />
          </div>
        </div>
      </div>

      {/* ETA Entry Form Section (Add Form: Single Entry) */}
      {isAddable && (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div
          className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
              Create New ETA / ETD Entry
            </h3>
          </div>
          <button
            type="button"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition"
          >
            {isFormOpen ? "Hide Form" : "Show Form"}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50/50 flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-bold font-mono uppercase text-slate-600 tracking-wider mb-2.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-600" />
                1. Linked PI Details (Cascading Selection)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                {/* AOL BRANCH (Dropdown populated strictly from created PI records) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch (From PI Records) *
                  </label>
                  {availableBranches.length === 0 ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      No PI records created yet. Please create entries in the 'PI' sub-tab first.
                    </div>
                  ) : (
                    <select
                      value={aolBranchName}
                      onChange={(e) => setAolBranchName(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                      required
                    >
                      {availableBranches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* PI NO (Dropdown populated for selected AOL Branch) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI No (Filtered for Branch) *
                  </label>
                  {availablePiNumbers.length === 0 ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200 font-medium">
                      {aolBranchName
                        ? "All PIs for this branch have ETA details completed."
                        : "Select an AOL Branch above to populate PI numbers"}
                    </div>
                  ) : (
                    <select
                      value={piNo}
                      onChange={(e) => setPiNo(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-900 font-mono font-bold"
                      required
                    >
                      {availablePiNumbers.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* PRODUCT NAME (Dropdown populated for selected AOL Branch + PI No) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name (Filtered for PI) *
                  </label>
                  {availableProducts.length === 0 ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200 font-medium">
                      {piNo
                        ? "All products for this PI have ETA details completed."
                        : "Select a PI No above to populate products"}
                    </div>
                  ) : (
                    <select
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                      required
                    >
                      {availableProducts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: SINGLE ETA & ETD SCHEDULE DETAILS FOR ADD FORM */}
            <div>
              <p className="text-[11px] font-bold font-mono uppercase text-slate-600 tracking-wider mb-2.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-600" />
                2. ETD, ETA & Shipment Remark (Add Form)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                {/* Entry Date */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-3 py-2 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                {/* ETD */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    ETD (Estimated Time of Departure) *
                  </label>
                  <input
                    type="date"
                    value={etd}
                    onChange={(e) => setEtd(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>

                {/* ETA */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    ETA (Estimated Time of Arrival) *
                  </label>
                  <input
                    type="date"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>

                {/* REMARK */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Remark
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vessel delay, Port congestion..."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus size={15} />
                Save ETA Record to Database
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* ETA Records Table View */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg">
              <Clock size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
              Import ETA Schedule Directory ({filteredRecords.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Import from Sheets / CSV */}
            {isAddable && (
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer shadow-2xs"
                title="Bulk Import ETA schedules from Google Sheets or CSV"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Import from Sheet / CSV</span>
              </button>
            )}

            {/* Toggle All Details Visibility */}
            <button
              type="button"
              onClick={() => {
                const nextState = !areAllEtaHidden;
                setAreAllEtaHidden(nextState);
                setHiddenEtaRowIds({});
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
            >
              {areAllEtaHidden ? <Eye size={13} className="text-emerald-600" /> : <EyeOff size={13} className="text-slate-500" />}
              <span>{areAllEtaHidden ? "Unhide All History" : "Hide All History"}</span>
            </button>

            {/* Filter by Branch */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Branch:</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {availableBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PI No, Product, Remark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs border border-slate-200 bg-white pl-8 pr-3 py-1.5 rounded-lg w-48 sm:w-64 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold w-10 text-center">#</th>
                <th className="py-2.5 px-3 font-bold">AOL Branch</th>
                <th className="py-2.5 px-3 font-bold">PI NO & Product</th>
                <th className="py-2.5 px-3 font-bold">Latest ETD / ETA</th>
                <th className="py-2.5 px-3 font-bold min-w-[260px]">Multiple ETA/ETD Schedules History</th>
                <th className="py-2.5 px-3 font-bold text-center w-20">
                  {isAdmin ? "Actions" : "Access"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Clock size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500">No ETA records found in database.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use the form above to add a new ETA / ETD schedule entry.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  const isRowHidden = hiddenEtaRowIds[rec.id] !== undefined
                    ? hiddenEtaRowIds[rec.id]
                    : areAllEtaHidden;

                  const scheduleList = rec.schedules && rec.schedules.length > 0
                    ? rec.schedules
                    : [{ id: "1", etd: rec.etd, eta: rec.eta, remark: rec.remark }];

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px] align-top">
                        {index + 1}
                      </td>

                      {/* AOL Branch */}
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap align-top">
                        {rec.aolBranchName}
                      </td>

                      {/* PI NO & Product */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 font-mono">
                          {rec.id && (
                            <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mb-0.5">
                              ID: {rec.id}
                            </span>
                          )}
                          <span className="font-extrabold text-slate-900 text-xs">{rec.piNo}</span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block w-fit">
                            {rec.productName}
                          </span>
                        </div>
                      </td>

                      {/* Latest ETD / ETA */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1 font-mono text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-[10px] font-bold text-slate-400">ETD:</span>
                            <span className="font-bold text-slate-900">{rec.etd || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <span className="text-[10px] font-bold text-emerald-600">ETA:</span>
                            <span className="font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {rec.eta || "N/A"}
                            </span>
                          </div>
                          {rec.remark && (
                            <div className="text-[10px] text-slate-500 font-sans italic truncate max-w-[180px]">
                              "{rec.remark}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* MULTIPLE ETA/ETD SCHEDULES HISTORY (WITH HIDE/UNHIDE) */}
                      <td className="py-3 px-3 align-top min-w-[260px]">
                        <div className="flex flex-col gap-1.5">
                          {/* Schedule Header & Toggle */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase flex items-center gap-1">
                              <History size={11} className="text-indigo-600" />
                              {scheduleList.length} {scheduleList.length === 1 ? "Schedule Log" : "Schedules Logged"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setHiddenEtaRowIds((prev) => ({
                                  ...prev,
                                  [rec.id]: !isRowHidden
                                }))
                              }
                              className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded border transition cursor-pointer text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200"
                              title={isRowHidden ? "Unhide full schedule log" : "Hide schedule log"}
                            >
                              {isRowHidden ? <Eye size={11} className="text-emerald-600" /> : <EyeOff size={11} className="text-slate-500" />}
                              {isRowHidden ? "Unhide History" : "Hide History"}
                            </button>
                          </div>

                          {isRowHidden ? (
                            <div className="text-[10px] font-mono text-slate-400 italic bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200">
                              Detailed schedule history hidden (Click 'Unhide History' to view)
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {scheduleList.map((sch, schIdx) => (
                                <div
                                  key={sch.id || schIdx}
                                  className="text-[11px] font-mono bg-slate-50 hover:bg-slate-100/80 p-2 rounded-lg border border-slate-200 flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold border-b border-slate-100 pb-1">
                                    <span className="text-indigo-700 font-mono">Rev #{schIdx + 1}</span>
                                    <div className="flex items-center gap-2">
                                      <span>ETD: <strong className="text-slate-900">{sch.etd}</strong></span>
                                      <ArrowRight size={10} className="text-slate-400" />
                                      <span>ETA: <strong className="text-emerald-700">{sch.eta}</strong></span>
                                    </div>
                                  </div>
                                  {sch.remark && (
                                    <div className="text-[10px] font-sans text-slate-600 flex items-start gap-1">
                                      <MessageSquare size={10} className="text-slate-400 shrink-0 mt-0.5" />
                                      <span>{sch.remark}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS: Edit & Delete */}
                      <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                        {isEditable || isAdmin ? (
                          deletingEtaId === rec.id ? (
                            <div className="flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                              <span className="text-[10px] font-extrabold text-rose-800">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteImportEta(rec.id);
                                  triggerSync("DELETE", { id: rec.id });
                                  setDeletingEtaId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer shadow-2xs"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingEtaId(null)}
                                className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {isEditable && (
                                <button
                                  onClick={() => handleOpenEditModal(rec)}
                                  className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                                  title="Edit ETA & Manage Multiple Schedules"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => setDeletingEtaId(rec.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete ETA Entry (Admin Only)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="inline-block text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Read Only
                          </span>
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

      {/* ADMIN EDIT MODAL WITH MULTIPLE ETA/ETD SCHEDULE MANAGEMENT */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider">
                  Admin Edit ETA Entry #{editingRecord.piNo}
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveEdit} className="p-5 flex flex-col gap-5 text-xs">
              {/* Linked PI Details */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {/* Entry Date */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-3 py-2 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                {/* AOL Branch Dropdown */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch
                  </label>
                  <select
                    value={editingRecord.aolBranchName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aolBranchName: e.target.value, piNo: "", productName: "" })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    required
                  >
                    {editAvailableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PI No Dropdown */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI No
                  </label>
                  <select
                    value={editingRecord.piNo}
                    onChange={(e) => setEditingRecord({ ...editingRecord, piNo: e.target.value, productName: "" })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                    required
                  >
                    {editAvailablePiNumbers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Name Dropdown */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name
                  </label>
                  <select
                    value={editingRecord.productName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, productName: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    required
                  >
                    {editAvailableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MULTIPLE ETA AND ETD SCHEDULE LOGS MANAGEMENT */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-slate-800 uppercase">
                    <History size={14} className="text-indigo-600" />
                    Multiple ETA & ETD Schedules Log for {editingRecord.productName || "Product"}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {editingRecord.schedules?.length || 0} Saved Schedule(s)
                  </span>
                </div>

                {/* List of existing schedules */}
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {editingRecord.schedules && editingRecord.schedules.length > 0 ? (
                    editingRecord.schedules.map((sch, index) => (
                      <div
                        key={sch.id || index}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex flex-col gap-1 font-mono">
                          <div className="flex items-center gap-3">
                            <span className="bg-indigo-100 text-indigo-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-indigo-200">
                              Rev #{index + 1}
                            </span>
                            <span className="text-slate-700">ETD: <strong>{sch.etd || "N/A"}</strong></span>
                            <span className="text-emerald-700 font-extrabold">ETA: <strong>{sch.eta || "N/A"}</strong></span>
                          </div>
                          {sch.remark && (
                            <p className="text-[11px] font-sans text-slate-600 italic">
                              "{sch.remark}"
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveScheduleInEdit(sch.id)}
                          className="self-end sm:self-center p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Delete this schedule revision"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400 font-mono text-[11px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No additional schedules logged yet. Add one below.
                    </div>
                  )}
                </div>

                {/* Add New Schedule Form inside Edit Modal */}
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 flex flex-col gap-2.5">
                  <p className="text-[10px] font-bold font-mono text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <Plus size={12} className="text-emerald-600" />
                    Add Another ETA / ETD Schedule Revision
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[9px] font-bold font-mono text-slate-500 uppercase block mb-1">
                        New ETD
                      </label>
                      <input
                        type="date"
                        value={newEtd}
                        onChange={(e) => setNewEtd(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold font-mono text-slate-500 uppercase block mb-1">
                        New ETA
                      </label>
                      <input
                        type="date"
                        value={newEta}
                        onChange={(e) => setNewEta(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold font-mono text-slate-500 uppercase block mb-1">
                        Revision Remark
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Revised ETD due to carrier delay"
                        value={newRemark}
                        onChange={(e) => setNewRemark(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddScheduleInEdit}
                      className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Plus size={13} />
                      Append Schedule Revision
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={15} />
                  Save Changes to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <ImportEtaBulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onAddImportEta={onAddImportEta}
          onUpdateImportEta={onUpdateImportEta}
          existingEtas={importEtas}
          importPis={importPis}
          activeUserId={activeUserId}
          activeUserName={activeUser?.name || "Current User"}
          appsScriptUrl={config.appsScriptUrl}
          sheetName={config.sheetName || "Import ETAs"}
          onSyncToAppsScript={triggerSync}
        />
      )}
    </div>
  );
}
