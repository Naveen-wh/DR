/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { ImportLcRecord, ImportPiRecord, User, AolBranchName, SupplierName, Product, Role } from "../../../types";
import { Plus, Search, Trash2, Edit, FileText, Landmark, Calendar, ShieldAlert, Eye, EyeOff, Building2, Layers, Check, X, FileSpreadsheet } from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";
import ImportLcBulkImportModal from "../ImportLcBulkImportModal";

interface ImportLcSubViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importLcs: ImportLcRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  onAddImportLc: (record: Omit<ImportLcRecord, "id" | "createdAt">) => void;
  onUpdateImportLc: (record: ImportLcRecord) => void;
  onDeleteImportLc: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportLcSubView({
  activeUserId,
  users,
  importPis,
  importLcs,
  onAddImportLc,
  onUpdateImportLc,
  onDeleteImportLc,
  canAdd = true,
  canEdit = true
}: ImportLcSubViewProps) {
  // Check Admin / Edit / Add Permission
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.role === ("Admin" as Role);
  const isEditable = isAdmin || canEdit !== false;
  const isAddable = isAdmin || canAdd !== false;

  // Form State for Creating LC Entry
  const [aolBranchName, setAolBranchName] = useState<string>("");
  const [piNo, setPiNo] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [lcType, setLcType] = useState<"LC" | "NON LC">("LC");
  const [lcAppSentToBank, setLcAppSentToBank] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [lcNoRefNo, setLcNoRefNo] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [lcDate, setLcDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [lcUsanceAtSight, setLcUsanceAtSight] = useState<"Usance" | "At Sight">("Usance");
  const [usanceDays, setUsanceDays] = useState<string>("90");
  const [latestShipmentDate, setLatestShipmentDate] = useState<string>("");
  const [lcExpiryDate, setLcExpiryDate] = useState<string>("");
  const [lcOpenExRate, setLcOpenExRate] = useState<string>("");

  // UI Toggle States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [selectedLcTypeFilter, setSelectedLcTypeFilter] = useState<string>("ALL");
  const [hiddenLcRowIds, setHiddenLcRowIds] = useState<Record<string, boolean>>({});
  const [areAllLcHidden, setAreAllLcHidden] = useState<boolean>(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportLcRecord | null>(null);
  const [deletingLcId, setDeletingLcId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_lc_config",
    "Import LCs",
    "import_lcs"
  );

  // Calculate next sequential Record ID (LC-#) based on maximum existing ID number
  const getTrackedNextLcId = (offset: number = 0) => {
    let maxNum = 0;
    importLcs.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^LC-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const baseNum = maxNum > 0 ? maxNum : importLcs.length;
    const nextNum = baseNum + 1 + offset;
    return `LC-${nextNum}`;
  };

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

  // 2. PI No Dropdown Options (Filtered for selected AOL Branch; hides PIs if LC details are saved for ALL products)
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

        const savedLcs = importLcs.filter(
          (lc) => lc.aolBranchName === aolBranchName && lc.piNo === pi.piNo
        );
        const savedProductSet = new Set(savedLcs.map((lc) => lc.productName));

        // Hide PI if LC details are saved for ALL products in this PI
        const isAllSaved = piProducts.length > 0 && piProducts.every((p) => savedProductSet.has(p));

        if (!isAllSaved) {
          piSet.add(pi.piNo);
        }
      });
    return Array.from(piSet);
  }, [importPis, importLcs, aolBranchName]);

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

  // 3. Product Name Dropdown Options (Filtered for selected AOL Branch + PI No; excludes products with existing LC)
  const availableProducts = useMemo(() => {
    if (!aolBranchName || !piNo) return [];
    const prodSet = new Set<string>();

    const matchingPis = importPis.filter(
      (pi) => pi.aolBranchName === aolBranchName && pi.piNo === piNo
    );

    const savedLcs = importLcs.filter(
      (lc) => lc.aolBranchName === aolBranchName && lc.piNo === piNo
    );
    const savedProductSet = new Set(savedLcs.map((lc) => lc.productName));

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
  }, [importPis, importLcs, aolBranchName, piNo]);

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

  // Handle Create Form Submit
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

    const bName = bankName.trim() || "N/A";
    const uDays = parseFloat(usanceDays) || 0;
    const lShipDate = latestShipmentDate || "";
    const lExpDate = lcExpiryDate || "";
    const openEx = parseFloat(lcOpenExRate) || 0;

    const newRecord: Omit<ImportLcRecord, "id" | "createdAt"> = {
      aolBranchName,
      piNo,
      productName,
      supplierName: matchingPi?.supplierName || "N/A",
      mfg: matchingPi?.mfg || "N/A",
      port: matchingPi?.port || "N/A",
      entryDate: entryDate || new Date().toISOString().split("T")[0],
      lcType,
      lcAppSentToBank: lcAppSentToBank || "",
      lcAppSentToBankDate: lcAppSentToBank || "",
      bankName: bName,
      lcBankName: bName,
      lcNoRefNo: lcNoRefNo.trim() || "N/A",
      lcDate: lcDate || new Date().toISOString().split("T")[0],
      lcUsanceAtSight,
      usanceDays: uDays,
      lcUsanceDays: uDays,
      latestShipmentDate: lShipDate,
      lcLatestShipmentDate: lShipDate,
      lcExpiryDate: lExpDate,
      expiryDate: lExpDate,
      lcOpenExRate: openEx,
      openExRate: openEx,
      createdByUserId: activeUserId,
      createdByName: activeUser?.name || "Current User"
    };

    const generatedId = getTrackedNextLcId();
    const fullRecord: ImportLcRecord = {
      ...newRecord,
      id: generatedId,
      createdAt: new Date().toISOString()
    };

    onAddImportLc(fullRecord);
    triggerSync("ADD", fullRecord);

    // Reset optional form fields
    setBankName("");
    setLcNoRefNo("");
    setLcAppSentToBank("");
    setLatestShipmentDate("");
    setLcExpiryDate("");
    setLcOpenExRate("");
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: ImportLcRecord) => {
    if (!isEditable) {
      alert("You do not have permission to edit LC records.");
      return;
    }
    setEditingRecord({ ...rec });
  };

  // Handle Edit Form Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editingRecord.aolBranchName || !editingRecord.piNo || !editingRecord.productName) {
      alert("Please select AOL Branch, PI No, and Product Name.");
      return;
    }

    const bName = (editingRecord.bankName || editingRecord.lcBankName || "").trim() || "N/A";
    const uDays = typeof editingRecord.usanceDays === "number" ? editingRecord.usanceDays : (typeof editingRecord.lcUsanceDays === "number" ? editingRecord.lcUsanceDays : 0);
    const lShipDate = editingRecord.latestShipmentDate || editingRecord.lcLatestShipmentDate || "";
    const lExpDate = editingRecord.lcExpiryDate || editingRecord.expiryDate || "";
    const openEx = typeof editingRecord.lcOpenExRate === "number" ? editingRecord.lcOpenExRate : (typeof editingRecord.openExRate === "number" ? editingRecord.openExRate : 0);

    const updatedRecord: ImportLcRecord = {
      ...editingRecord,
      bankName: bName,
      lcBankName: bName,
      usanceDays: uDays,
      lcUsanceDays: uDays,
      latestShipmentDate: lShipDate,
      lcLatestShipmentDate: lShipDate,
      lcExpiryDate: lExpDate,
      expiryDate: lExpDate,
      lcOpenExRate: openEx,
      openExRate: openEx
    };

    onUpdateImportLc(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  // Filtered LC Records
  const filteredRecords = useMemo(() => {
    return importLcs.filter((rec) => {
      const matchesBranch = selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;
      const matchesLcType = selectedLcTypeFilter === "ALL" || rec.lcType === selectedLcTypeFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rec.piNo.toLowerCase().includes(q) ||
        rec.productName.toLowerCase().includes(q) ||
        rec.bankName.toLowerCase().includes(q) ||
        rec.lcNoRefNo.toLowerCase().includes(q) ||
        rec.aolBranchName.toLowerCase().includes(q);

      return matchesBranch && matchesLcType && matchesSearch;
    });
  }, [importLcs, searchQuery, selectedBranchFilter, selectedLcTypeFilter]);

  // Overall Statistics
  const lcCount = useMemo(() => filteredRecords.filter((r) => r.lcType === "LC").length, [filteredRecords]);
  const nonLcCount = useMemo(() => filteredRecords.filter((r) => r.lcType === "NON LC").length, [filteredRecords]);

  return (
    <div className="flex flex-col gap-5">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_lc_config"
        defaultSheetName="Import LCs"
        collectionKey="import_lcs"
        records={importLcs}
        activeUser={activeUser}
        moduleTitle="LC Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importLcs.find((l) => (l.piNo === rec.piNo && l.productName === rec.productName) || l.id === rec.id);
            if (existing) {
              onUpdateImportLc({ ...existing, ...rec });
            } else {
              onAddImportLc(rec);
            }
          });
        }}
      />

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total LC / Non-LC Records</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Landmark size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">LC Applications</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {lcCount} <span className="text-xs font-normal text-slate-500">LC</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Check size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">NON-LC Entries</p>
            <p className="text-xl font-extrabold text-amber-700 mt-0.5">
              {nonLcCount} <span className="text-xs font-normal text-slate-500">Non-LC</span>
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* LC Entry Form Section */}
      {isAddable && (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div
          className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
              Create New Letter of Credit (LC) / Non-LC Entry
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
                        ? "All PIs for this branch have LC details completed."
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
                        ? "All products for this PI have LC details completed."
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

            {/* SECTION 2: LC FORM DETAILS */}
            <div>
              <p className="text-[11px] font-bold font-mono uppercase text-slate-600 tracking-wider mb-2.5 flex items-center gap-1.5">
                <Landmark size={13} className="text-emerald-600" />
                2. LC Specification & Bank Parameters
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
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

                {/* LC / NON LC */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC / NON LC *
                  </label>
                  <select
                    value={lcType}
                    onChange={(e) => setLcType(e.target.value as "LC" | "NON LC")}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-bold"
                    required
                  >
                    <option value="LC">LC</option>
                    <option value="NON LC">NON LC</option>
                  </select>
                </div>

                {/* LC APP SENT TO BANK */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC App Sent To Bank
                  </label>
                  <input
                    type="date"
                    value={lcAppSentToBank}
                    onChange={(e) => setLcAppSentToBank(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* BANK Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India / HDFC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC NO / Reference No */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC NO / Reference No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LC-88992211"
                    value={lcNoRefNo}
                    onChange={(e) => setLcNoRefNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-semibold text-slate-900"
                  />
                </div>

                {/* LC DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Date
                  </label>
                  <input
                    type="date"
                    value={lcDate}
                    onChange={(e) => setLcDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC Usance / At Sight */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Usance / At Sight
                  </label>
                  <select
                    value={lcUsanceAtSight}
                    onChange={(e) => setLcUsanceAtSight(e.target.value as "Usance" | "At Sight")}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  >
                    <option value="Usance">Usance</option>
                    <option value="At Sight">At Sight</option>
                  </select>
                </div>

                {/* Usance Days */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Usance Days
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 90"
                    value={usanceDays}
                    onChange={(e) => setUsanceDays(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LATEST SHIPMENT DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Latest Shipment Date
                  </label>
                  <input
                    type="date"
                    value={latestShipmentDate}
                    onChange={(e) => setLatestShipmentDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC EXPIRY DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Expiry Date
                  </label>
                  <input
                    type="date"
                    value={lcExpiryDate}
                    onChange={(e) => setLcExpiryDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC OPEN EX RATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Open Ex Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 83.75"
                    value={lcOpenExRate}
                    onChange={(e) => setLcOpenExRate(e.target.value)}
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
                Save LC Entry to Database
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* LC Records Table View */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg">
              <Landmark size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
              Import LC Database Directory ({filteredRecords.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Import from Sheets / CSV */}
            {isAddable && (
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer shadow-2xs"
                title="Bulk Import LC and Non-LC records from Google Sheets or CSV"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Import from Sheet / CSV</span>
              </button>
            )}

            {/* Toggle All LC Details Visibility */}
            <button
              type="button"
              onClick={() => {
                const nextState = !areAllLcHidden;
                setAreAllLcHidden(nextState);
                setHiddenLcRowIds({});
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
            >
              {areAllLcHidden ? <Eye size={13} className="text-emerald-600" /> : <EyeOff size={13} className="text-slate-500" />}
              <span>{areAllLcHidden ? "Unhide All Details" : "Hide All Details"}</span>
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

            {/* Filter by LC Type */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Type:</span>
              <select
                value={selectedLcTypeFilter}
                onChange={(e) => setSelectedLcTypeFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="LC">LC Only</option>
                <option value="NON LC">NON-LC Only</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PI No, Bank, LC No, Product..."
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
                <th className="py-2.5 px-3 font-bold">LC Type & Bank</th>
                <th className="py-2.5 px-3 font-bold">LC No / Ref No</th>
                <th className="py-2.5 px-3 font-bold">LC Details (Dates & Terms)</th>
                <th className="py-2.5 px-3 font-bold text-right">LC Open Ex Rate</th>
                <th className="py-2.5 px-3 font-bold text-center w-20">
                  {isAdmin ? "Actions" : "Access"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Landmark size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500">No LC records found in database.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use the form above to add a new Letter of Credit entry.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  const isRowHidden = hiddenLcRowIds[rec.id] !== undefined
                    ? hiddenLcRowIds[rec.id]
                    : areAllLcHidden;

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

                      {/* LC Type & Bank */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full inline-block w-fit ${
                              rec.lcType === "LC"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {rec.lcType}
                          </span>
                          <span className="text-xs text-slate-700 font-medium">{rec.bankName || "N/A"}</span>
                        </div>
                      </td>

                      {/* LC No / Reference No */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 align-top whitespace-nowrap">
                        {rec.lcNoRefNo || "N/A"}
                      </td>

                      {/* LC Details (Dates & Terms) WITH HIDE / UNHIDE */}
                      <td className="py-3 px-3 align-top min-w-[220px]">
                        <div className="flex flex-col gap-1">
                          {/* Row Header with toggle */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                              {rec.lcUsanceAtSight} {rec.usanceDays ? `(${rec.usanceDays} Days)` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setHiddenLcRowIds((prev) => ({
                                  ...prev,
                                  [rec.id]: !isRowHidden
                                }))
                              }
                              className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border transition cursor-pointer text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200"
                              title={isRowHidden ? "Unhide details" : "Hide details"}
                            >
                              {isRowHidden ? <Eye size={10} className="text-emerald-600" /> : <EyeOff size={10} className="text-slate-500" />}
                              {isRowHidden ? "Unhide" : "Hide"}
                            </button>
                          </div>

                          {isRowHidden ? (
                            <div className="text-[10px] text-slate-400 font-mono italic bg-slate-50 p-1.5 rounded border border-dashed border-slate-200">
                              Details hidden
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 font-mono text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                              <div><strong className="text-slate-700">LC Date:</strong> {rec.lcDate || "N/A"}</div>
                              <div><strong className="text-slate-700">Sent To Bank:</strong> {rec.lcAppSentToBank || "N/A"}</div>
                              <div><strong className="text-slate-700">Latest Shipment:</strong> {rec.latestShipmentDate || "N/A"}</div>
                              <div><strong className="text-slate-700">LC Expiry:</strong> {rec.lcExpiryDate || "N/A"}</div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* LC Open Ex Rate */}
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap align-top">
                        {rec.lcOpenExRate ? rec.lcOpenExRate.toFixed(2) : "N/A"}
                      </td>

                      {/* ACTIONS: Edit & Delete */}
                      <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                        {isEditable || isAdmin ? (
                          deletingLcId === rec.id ? (
                            <div className="flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                              <span className="text-[10px] font-extrabold text-rose-800">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteImportLc(rec.id);
                                  triggerSync("DELETE", { id: rec.id });
                                  setDeletingLcId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer shadow-2xs"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingLcId(null)}
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
                                  title="Edit LC Entry"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => setDeletingLcId(rec.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete LC Entry (Admin Only)"
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

      {/* ADMIN EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider">
                  Admin Edit LC Entry #{editingRecord.piNo}
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
            <form onSubmit={handleSaveEdit} className="p-5 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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

                {/* LC / NON LC */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC / NON LC
                  </label>
                  <select
                    value={editingRecord.lcType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcType: e.target.value as "LC" | "NON LC" })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 font-bold"
                    required
                  >
                    <option value="LC">LC</option>
                    <option value="NON LC">NON LC</option>
                  </select>
                </div>

                {/* LC APP SENT TO BANK */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC App Sent To Bank
                  </label>
                  <input
                    type="date"
                    value={editingRecord.lcAppSentToBank || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcAppSentToBank: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* BANK Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={editingRecord.bankName || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, bankName: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC NO / Reference No */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC NO / Reference No
                  </label>
                  <input
                    type="text"
                    value={editingRecord.lcNoRefNo || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcNoRefNo: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                  />
                </div>

                {/* LC DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Date
                  </label>
                  <input
                    type="date"
                    value={editingRecord.lcDate || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcDate: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC Usance / At Sight */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Usance / At Sight
                  </label>
                  <select
                    value={editingRecord.lcUsanceAtSight}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcUsanceAtSight: e.target.value as "Usance" | "At Sight" })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  >
                    <option value="Usance">Usance</option>
                    <option value="At Sight">At Sight</option>
                  </select>
                </div>

                {/* Usance Days */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Usance Days
                  </label>
                  <input
                    type="number"
                    value={editingRecord.usanceDays || 0}
                    onChange={(e) => setEditingRecord({ ...editingRecord, usanceDays: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LATEST SHIPMENT DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Latest Shipment Date
                  </label>
                  <input
                    type="date"
                    value={editingRecord.latestShipmentDate || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, latestShipmentDate: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC EXPIRY DATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editingRecord.lcExpiryDate || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcExpiryDate: e.target.value })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC OPEN EX RATE */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    LC Open Ex Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.lcOpenExRate || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, lcOpenExRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                  />
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition cursor-pointer"
                >
                  Save LC Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <ImportLcBulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onAddImportLc={onAddImportLc}
          onUpdateImportLc={onUpdateImportLc}
          existingLcs={importLcs}
          importPis={importPis}
          activeUserId={activeUserId}
          activeUserName={activeUser?.name || "Current User"}
          appsScriptUrl={config.appsScriptUrl}
          sheetName={config.sheetName || "Import LCs"}
          onSyncToAppsScript={triggerSync}
        />
      )}
    </div>
  );
}
