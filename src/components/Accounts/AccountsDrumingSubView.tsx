/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, AolBranchName, Product, AolGodown, PidRecord, AccountsDrumingRecord, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Package, Layers, DollarSign, AlertCircle, CheckCircle2, Box, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../Configuration/AppsScriptSyncBanner";

interface AccountsDrumingSubViewProps {
  activeUserId: string;
  users: User[];
  accountsDrumings?: AccountsDrumingRecord[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  products?: Product[];
  pids?: PidRecord[];
  onAddAccountsDruming: (record: Omit<AccountsDrumingRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsDruming: (record: AccountsDrumingRecord) => Promise<void> | void;
  onDeleteAccountsDruming: (id: string) => Promise<void> | void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export function formatDateDdMmmYy(dateStr: string): string {
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
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default function AccountsDrumingSubView({
  activeUserId,
  users,
  accountsDrumings = [],
  aolBranches = [],
  aolGodowns = [],
  products = [],
  pids = [],
  onAddAccountsDruming,
  onUpdateAccountsDruming,
  onDeleteAccountsDruming,
  canAdd = true,
  canEdit = true,
}: AccountsDrumingSubViewProps) {
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
    "accounts_drumings_apps_script",
    "Accounts Drumming",
    "accounts_drumings"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGodown, setFilterGodown] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsDrumingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsDrumingRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGodown, setSelectedGodown] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedPidId, setSelectedPidId] = useState("");
  const [numberOfDrumsBags, setNumberOfDrumsBags] = useState("");
  const [totalDrumCost, setTotalDrumCost] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Derived lists for Cascading Dropdowns from PIDs
  // 1. Available Godowns from PIDs (fallback to aolGodowns)
  const availableGodownsFromPids = Array.from(
    new Set(pids.map((p) => p.aolGodown).filter((g): g is string => Boolean(g && g.trim())))
  ).sort();
  const godownOptions = availableGodownsFromPids.length > 0
    ? availableGodownsFromPids
    : aolGodowns.map((g) => g.name);

  // 2. Available Products filtered by selectedGodown
  const availableProductsFromPids = Array.from(
    new Set(
      pids
        .filter((p) => !selectedGodown || (p.aolGodown || "").toLowerCase() === selectedGodown.toLowerCase())
        .map((p) => p.productName)
        .filter((prod): prod is string => Boolean(prod && prod.trim()))
    )
  ).sort();
  const productOptions = availableProductsFromPids.length > 0
    ? availableProductsFromPids
    : products.map((p) => p.name);

  // 3. Available Container / PID records filtered by selectedGodown and selectedProductName
  const matchingPids = pids.filter((p) => {
    const matchGodown = !selectedGodown || (p.aolGodown || "").toLowerCase() === selectedGodown.toLowerCase();
    const matchProduct = !selectedProductName || (p.productName || "").toLowerCase() === selectedProductName.toLowerCase();
    return matchGodown && matchProduct;
  });

  const selectedPidObj = pids.find((p) => p.id === selectedPidId);

  // Handlers for resetting & opening form
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setTallyDate(new Date().toISOString().split("T")[0]);
    const initGodown = godownOptions[0] || "";
    setSelectedGodown(initGodown);
    setSelectedProductName("");
    setSelectedPidId("");
    setNumberOfDrumsBags("");
    setTotalDrumCost("");
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (rec: AccountsDrumingRecord) => {
    setEditingRecord(rec);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setTallyDate(rec.tallyDate || new Date().toISOString().split("T")[0]);
    setSelectedGodown(rec.aolGodown || "");
    setSelectedProductName(rec.productName || "");
    setSelectedPidId(rec.sourcePidId || "");
    setNumberOfDrumsBags(String(rec.numberOfDrumsBags || ""));
    setTotalDrumCost(String(rec.totalDrumCost || ""));
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // When Godown changes in Form
  const handleGodownChange = (godownName: string) => {
    setSelectedGodown(godownName);
    setSelectedProductName("");
    setSelectedPidId("");
  };

  // When Product Name changes in Form
  const handleProductChange = (prodName: string) => {
    setSelectedProductName(prodName);
    setSelectedPidId("");
  };

  // When PID Container selected in Form
  const handlePidSelect = (pidId: string) => {
    setSelectedPidId(pidId);
    const chosenPid = pids.find((p) => p.id === pidId);
    if (chosenPid) {
      if (!selectedGodown && chosenPid.aolGodown) setSelectedGodown(chosenPid.aolGodown);
      if (!selectedProductName && chosenPid.productName) setSelectedProductName(chosenPid.productName);
    }
  };

  // Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numDrums = parseFloat(numberOfDrumsBags);
    const costNum = parseFloat(totalDrumCost);

    if (!tallyDate) {
      setFormError("Tally Date is required.");
      return;
    }
    if (!selectedGodown) {
      setFormError("AOL Godown is required.");
      return;
    }
    if (!selectedProductName) {
      setFormError("Product Name is required.");
      return;
    }
    if (isNaN(numDrums) || numDrums <= 0) {
      setFormError("Number of Drums / Bags must be a positive number.");
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      setFormError("Total Drum Cost must be 0 or greater.");
      return;
    }

    const linkedPid = pids.find((p) => p.id === selectedPidId);
    const containerVal = linkedPid ? (linkedPid.containerNo || linkedPid.purchaseBeOrNo || "") : "";

    const payload = {
      entryDate,
      tallyDate,
      aolGodown: selectedGodown,
      productName: selectedProductName,
      containerNo: containerVal,
      numberOfDrumsBags: numDrums,
      totalDrumCost: costNum,
      sourcePidId: linkedPid?.id,
      beNoOrPurchaseNo: linkedPid?.purchaseBeOrNo,
      supplierName: linkedPid?.supplierName,
      aolBranchName: linkedPid?.aolBranchName,
      originCode: linkedPid?.originCode,
    };

    try {
      if (editingRecord) {
        await onUpdateAccountsDruming({
          ...editingRecord,
          ...payload,
        });
      } else {
        await onAddAccountsDruming(payload);
      }
      setIsCreateModalOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save Druming record.");
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await onDeleteAccountsDruming(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      console.error("Failed to delete Druming record:", err);
    }
  };

  // Filtered List for Table
  const filteredRecords = accountsDrumings.filter((rec) => {
    const matchesGodown =
      filterGodown === "all" ||
      rec.aolGodown.toLowerCase() === filterGodown.toLowerCase();

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      rec.productName.toLowerCase().includes(term) ||
      rec.aolGodown.toLowerCase().includes(term) ||
      (rec.containerNo || "").toLowerCase().includes(term) ||
      (rec.supplierName || "").toLowerCase().includes(term) ||
      (rec.tallyDate || "").toLowerCase().includes(term);

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

    return matchesGodown && matchesSearch && matchesDate;
  });

  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterGodown !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterGodown("all");
    setStartDate("");
    setEndDate("");
  };

  // Calculate Summary Totals
  const overallEntries = accountsDrumings.length;
  const totalEntries = filteredRecords.length;
  const totalDrumsCount = filteredRecords.reduce((sum, r) => sum + (r.numberOfDrumsBags || 0), 0);
  const totalDrumCostSum = filteredRecords.reduce((sum, r) => sum + (r.totalDrumCost || 0), 0);
  const avgCostPerDrum = totalDrumsCount > 0 ? totalDrumCostSum / totalDrumsCount : 0;
  const uniqueGodowns = Array.from(new Set(filteredRecords.map((r) => r.aolGodown).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length;
  const uniqueContainers = Array.from(new Set(filteredRecords.map((r) => r.containerNo).filter(Boolean))).length;

  return (
    <div className="space-y-4">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_drumings_apps_script"
        defaultSheetName="Accounts Drumming"
        collectionKey="accounts_drumings"
        records={accountsDrumings}
        activeUser={activeUser}
        moduleTitle="Accounts Drumming Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsDrumings.find((d) => d.id === rec.id);
            if (existing) {
              onUpdateAccountsDruming({ ...existing, ...rec });
            } else {
              onAddAccountsDruming(rec);
            }
          });
        }}
      />

      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Accounts — Druming
            </h1>
            <p className="text-xs text-slate-500">
              Manage Druming cost entries & automatically update PID Drum Cost
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAddable && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus size={15} />
              New Druming Entry
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Entries</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">{totalEntries}</div>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Drums / Bags</span>
            <div className="text-lg font-black text-indigo-700 mt-0.5">{totalDrumsCount.toLocaleString()}</div>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Box size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Drum Cost</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">₹{totalDrumCostSum.toLocaleString()}</div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Cost / Drum</span>
            <div className="text-lg font-black text-amber-700 mt-0.5">₹{avgCostPerDrum.toFixed(2)}</div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Package size={18} />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search product, godown, container, tally date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterGodown}
              onChange={(e) => setFilterGodown(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              <option value="all">All Godowns</option>
              {godownOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
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
                Filtered Total Cost: <strong className="text-emerald-700 font-bold">₹{totalDrumCostSum.toLocaleString()}</strong>
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

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Tally Date</th>
                <th className="py-3 px-3">AOL Godown</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Container No / Tanker No</th>
                <th className="py-3 px-3 text-right">Drums / Bags</th>
                <th className="py-3 px-3 text-right">Total Drum Cost (₹)</th>
                <th className="py-3 px-3 text-right">Cost / Drum</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package size={28} className="text-slate-300" />
                      <span className="font-semibold text-slate-500">No Druming records found.</span>
                      <p className="text-[11px]">Click "New Druming Entry" to log a drum cost record.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  const perDrumCost = rec.numberOfDrumsBags > 0 ? rec.totalDrumCost / rec.numberOfDrumsBags : 0;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {formatDateDdMmmYy(rec.tallyDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                          {rec.aolGodown}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{rec.productName}</td>
                      <td className="py-2.5 px-3">
                        {rec.containerNo ? (
                          <span className="font-mono text-[11px] text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            {rec.containerNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                        {rec.numberOfDrumsBags.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        ₹{rec.totalDrumCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-600">
                        ₹{perDrumCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingRecord(rec)}
                            title="View Details"
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          {isEditable && (
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              title="Edit Record"
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {isDeletable && (
                            <button
                              onClick={() => setDeletingId(rec.id)}
                              title="Delete Record"
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            >
                              <Trash2 size={15} />
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
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">—</td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueGodowns} Godowns</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">{uniqueContainers} Containers</span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-indigo-400">
                    {totalDrumsCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    ₹{totalDrumCostSum.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-300">
                    Avg: ₹{avgCostPerDrum.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal — Create / Edit Druming Record */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold">
                  {editingRecord ? "Edit Druming Entry" : "New Druming Entry"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Entry Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                </label>
                <input
                  type="date"
                  value={entryDate}
                  readOnly
                  disabled
                  className="w-full px-3 py-1.5 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-mono font-semibold cursor-not-allowed"
                />
              </div>

              {/* Tally Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tally Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tallyDate}
                  onChange={(e) => setTallyDate(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900"
                />
              </div>

              {/* Cascading PID Dropdowns */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    Cascading PID Linkage
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Selects PID record to update Drum Cost
                  </span>
                </div>

                {/* 1. AOL Godown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    AOL Godown <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedGodown}
                    onChange={(e) => handleGodownChange(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900"
                  >
                    <option value="">-- Select AOL Godown --</option>
                    {godownOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Product Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProductName}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900"
                  >
                    <option value="">-- Select Product Name --</option>
                    {productOptions.map((prod) => (
                      <option key={prod} value={prod}>
                        {prod}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Container No / Tanker No (PID Selection) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Container No / Tanker No (PID Key)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700">
                      Matching PIDs: {matchingPids.length}
                    </span>
                  </div>
                  <select
                    value={selectedPidId}
                    onChange={(e) => handlePidSelect(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900"
                  >
                    <option value="">-- Select Container / PID Record (Optional) --</option>
                    {matchingPids.map((pid) => {
                      const contDisp = pid.containerNo || pid.purchaseBeOrNo || "No Container";
                      const suppDisp = pid.supplierName ? ` | ${pid.supplierName}` : "";
                      const stockDisp = ` | Stock: ${pid.closingStock ?? 0} Kg`;
                      return (
                        <option key={pid.id} value={pid.id}>
                          {contDisp}{suppDisp}{stockDisp}
                        </option>
                      );
                    })}
                  </select>
                  {selectedPidObj && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-0.5">
                      <div className="font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        Linked PID: {selectedPidObj.containerNo || selectedPidObj.purchaseBeOrNo || selectedPidObj.id}
                      </div>
                      <div className="text-[10px] text-emerald-800">
                        Supplier: {selectedPidObj.supplierName || '—'} | Purchase Qty: {selectedPidObj.purchaseQty?.toLocaleString() || 0} Kg | Current Drum Cost: ₹{selectedPidObj.drumCost?.toLocaleString() || 0}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Number Of Drums / Bags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Number Of Drums / Bags <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 100"
                    value={numberOfDrumsBags}
                    onChange={(e) => setNumberOfDrumsBags(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-900"
                  />
                </div>

                {/* Total Drum Cost */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Total Drum Cost (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 25000"
                    value={totalDrumCost}
                    onChange={(e) => setTotalDrumCost(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Per Drum Cost Calculation Preview */}
              {parseFloat(numberOfDrumsBags) > 0 && parseFloat(totalDrumCost) >= 0 && (
                <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg flex items-center justify-between text-xs font-semibold text-indigo-900">
                  <span>Calculated Rate / Drum:</span>
                  <span className="font-bold text-indigo-700">
                    ₹{(parseFloat(totalDrumCost) / parseFloat(numberOfDrumsBags)).toFixed(2)} per Drum
                  </span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {editingRecord ? "Update Record" : "Save Druming Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — View Record Details */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold">Druming Entry Details</h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tally Date</span>
                  <div className="font-bold text-slate-900 mt-0.5">{formatDateDdMmmYy(viewingRecord.tallyDate)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">AOL Godown</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewingRecord.aolGodown}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Product Name</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewingRecord.productName}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Container / Tanker No</span>
                  <div className="font-mono text-slate-900 mt-0.5">{viewingRecord.containerNo || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Drums / Bags</span>
                  <div className="font-bold text-indigo-950 text-sm mt-0.5">
                    {viewingRecord.numberOfDrumsBags.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Total Drum Cost</span>
                  <div className="font-black text-emerald-700 text-sm mt-0.5">
                    ₹{viewingRecord.totalDrumCost.toLocaleString()}
                  </div>
                </div>
                {viewingRecord.numberOfDrumsBags > 0 && (
                  <div className="col-span-2 pt-2 border-t border-indigo-100 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-semibold">Cost per Drum / Bag:</span>
                    <span className="font-bold text-indigo-700">
                      ₹{(viewingRecord.totalDrumCost / viewingRecord.numberOfDrumsBags).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {viewingRecord.supplierName && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Supplier Name</span>
                  <div className="font-medium text-slate-800 mt-0.5">{viewingRecord.supplierName}</div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                <span>Created by: {viewingRecord.createdByName || "System"}</span>
                <span>ID: {viewingRecord.id}</span>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-lg">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Druming Record</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete this Druming entry? Deleting this record will automatically deduct its cost from the linked PID's Drum Cost column.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
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
