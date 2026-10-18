/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AccountsSupplierCrDrRecord, LedgerCrDrCategory, AolGodown, AolBranchName, PidRecord, User, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, Calendar, DollarSign, AlertCircle, Hash, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface AccountsSupplierCrDrSubViewProps {
  activeUserId: string;
  users: User[];
  accountsSupplierCrDrs?: AccountsSupplierCrDrRecord[];
  ledgerCrDrs?: LedgerCrDrCategory[];
  aolGodowns?: AolGodown[];
  aolBranches?: AolBranchName[];
  pids?: PidRecord[];
  onAddAccountsSupplierCrDr: (record: Omit<AccountsSupplierCrDrRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsSupplierCrDr: (record: AccountsSupplierCrDrRecord) => Promise<void> | void;
  onDeleteAccountsSupplierCrDr: (id: string) => Promise<void> | void;
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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

export default function AccountsSupplierCrDrSubView({
  activeUserId,
  users,
  accountsSupplierCrDrs = [],
  ledgerCrDrs = [],
  aolGodowns = [],
  pids = [],
  onAddAccountsSupplierCrDr,
  onUpdateAccountsSupplierCrDr,
  onDeleteAccountsSupplierCrDr,
  canAdd = true,
  canEdit = true,
}: AccountsSupplierCrDrSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || {
    id: activeUserId,
    name: "User",
    accessLevel: AccessLevel.Editor,
    role: Role.User,
  };

  // Google Sheets Apps Script Integration
  const { config, syncStatus, setSyncStatus } = useAppsScriptSync(
    "accounts_supplier_cr_dr_apps_script",
    "Supplier Cr Dr",
    "accounts_supplier_cr_dr"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterGodown, setFilterGodown] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsSupplierCrDrRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsSupplierCrDrRecord | null>(null);

  // Form states
  const [entryDate] = useState(new Date().toISOString().split("T")[0]); // read-only
  const [aolGodown, setAolGodown] = useState("");
  const [aolBranchName, setAolBranchName] = useState("");
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [drCrNoteOn, setDrCrNoteOn] = useState<"On Qty" | "On Rate" | "On Amount" | string>("On Qty");
  const [drCrNote, setDrCrNote] = useState<"Credit Note" | "Debit Note" | string>("Debit Note");
  const [partyName, setPartyName] = useState("");
  const [drCrNo, setDrCrNo] = useState("");
  const [sourcePidId, setSourcePidId] = useState("");
  const [productName, setProductName] = useState("");
  const [beNoOrPurchaseNo, setBeNoOrPurchaseNo] = useState("");
  const [tankerOrVehicleNo, setTankerOrVehicleNo] = useState("");
  const [ledgerSelection, setLedgerSelection] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [description, setDescription] = useState("");

  // States for optional/custom text alternatives for cascaded dropdowns
  const [customPartyName, setCustomPartyName] = useState("");
  const [isCustomParty, setIsCustomParty] = useState(false);

  const [customProductName, setCustomProductName] = useState("");
  const [isCustomProduct, setIsCustomProduct] = useState(false);

  const [customBeNo, setCustomBeNo] = useState("");
  const [isCustomBeNo, setIsCustomBeNo] = useState(false);

  const [customVehicleNo, setCustomVehicleNo] = useState("");
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic dropdown list options based on pids
  const uniqueProductNames = Array.from(new Set(pids.map((p) => p.productName).filter(Boolean)));
  const productOptions = productName && !uniqueProductNames.includes(productName)
    ? [productName, ...uniqueProductNames]
    : uniqueProductNames;

  const uniqueBeNos = Array.from(new Set(pids.map((p) => p.purchaseBeOrNo).filter(Boolean)));
  const beNoOptions = beNoOrPurchaseNo && !uniqueBeNos.includes(beNoOrPurchaseNo)
    ? [beNoOrPurchaseNo, ...uniqueBeNos]
    : uniqueBeNos;

  const uniqueTankerVehicles = Array.from(new Set(pids.map((p) => p.containerNo).filter(Boolean)));
  const vehicleOptions = tankerOrVehicleNo && !uniqueTankerVehicles.includes(tankerOrVehicleNo)
    ? [tankerOrVehicleNo, ...uniqueTankerVehicles]
    : uniqueTankerVehicles;

  const uniquePartyNames = Array.from(new Set([
    ...pids.map((p) => p.supplierName),
    ...(accountsSupplierCrDrs || []).map((a) => a.partyName)
  ].filter(Boolean)));
  const partyOptions = partyName && !uniquePartyNames.includes(partyName)
    ? [partyName, ...uniquePartyNames]
    : uniquePartyNames;

  // Auto display AOL Branch Name as per AOL Godown selection
  useEffect(() => {
    if (!aolGodown) {
      setAolBranchName("");
      return;
    }
    const matched = aolGodowns.find((g) => g.name === aolGodown);
    if (matched) {
      setAolBranchName(matched.branchName || "");
    } else {
      setAolBranchName("");
    }
  }, [aolGodown, aolGodowns]);

  // Derived calculations based on Debit/Credit note logic:
  // Debit Note: Qty (Minus), Rate (Minus), Amount (Add)
  // Credit Note: Qty (Add), Rate (Add), Amount (Minus)
  const isDebit = drCrNote === "Debit Note";
  const numQty = parseFloat(qty) || 0;
  const numRate = parseFloat(rate) || 0;
  const numAmount = parseFloat(amount) || 0;

  const autoQty = isDebit ? -numQty : numQty;
  const autoAmount = isDebit ? numAmount : -numAmount;
  const purRateEffectedAmount = isDebit ? (numQty * numRate) : -(numQty * numRate);

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setViewingRecord(null);
    setAolGodown("");
    setAolBranchName("");
    setTallyDate(new Date().toISOString().split("T")[0]);
    setDrCrNoteOn("On Qty");
    setDrCrNote("Debit Note");
    setPartyName("");
    setDrCrNo("");
    setSourcePidId("");
    setProductName("");
    setBeNoOrPurchaseNo("");
    setTankerOrVehicleNo("");
    setLedgerSelection("");
    setQty("");
    setRate("");
    setAmount("");
    setDateFrom("");
    setDateTo("");
    setDescription("");
    setFormError("");
    
    setIsCustomParty(false);
    setCustomPartyName("");
    setIsCustomProduct(false);
    setCustomProductName("");
    setIsCustomBeNo(false);
    setCustomBeNo("");
    setIsCustomVehicle(false);
    setCustomVehicleNo("");

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: AccountsSupplierCrDrRecord) => {
    setEditingRecord(record);
    setViewingRecord(null);
    setAolGodown(record.aolGodown || "");
    setAolBranchName(record.aolBranchName || "");
    setTallyDate(record.tallyDate ? record.tallyDate.split("T")[0] : "");
    setDrCrNoteOn(record.noteOn || "On Qty");
    setDrCrNote(record.noteType || "Debit Note");
    setPartyName(record.partyName || "");
    setDrCrNo(record.noteNo || "");
    setSourcePidId(record.pidId || "");
    setProductName(record.productName || "");
    setBeNoOrPurchaseNo(record.bePurchaseBillNo || "");
    setTankerOrVehicleNo(record.tankerVehicleNo || "");
    setLedgerSelection(record.ledgerSelection || "");
    setQty(record.qty !== undefined ? String(record.qty) : "");
    setRate(record.rate !== undefined ? String(record.rate) : "");
    setAmount(record.amount !== undefined ? String(record.amount) : "");
    setDateFrom(record.dateFrom || "");
    setDateTo(record.dateTo || "");
    setDescription(record.description || "");
    setFormError("");

    const isCustomP = record.partyName ? !uniquePartyNames.includes(record.partyName) : false;
    setIsCustomParty(isCustomP);
    setCustomPartyName(isCustomP ? record.partyName : "");

    const isCustomProd = record.productName ? !uniqueProductNames.includes(record.productName) : false;
    setIsCustomProduct(isCustomProd);
    setCustomProductName(isCustomProd ? record.productName : "");

    const isCustomB = record.bePurchaseBillNo ? !uniqueBeNos.includes(record.bePurchaseBillNo) : false;
    setIsCustomBeNo(isCustomB);
    setCustomBeNo(isCustomB ? record.bePurchaseBillNo : "");

    const isCustomV = record.tankerVehicleNo ? !uniqueTankerVehicles.includes(record.tankerVehicleNo) : false;
    setIsCustomVehicle(isCustomV);
    setCustomVehicleNo(isCustomV ? record.tankerVehicleNo : "");

    setIsModalOpen(true);
  };

  const handleOpenViewModal = (record: AccountsSupplierCrDrRecord) => {
    setViewingRecord(record);
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aolGodown) return setFormError("AOL Godown is required.");
    if (!drCrNo) return setFormError("DR / CR Note No is required.");
    if (!partyName) return setFormError("Party Name is required.");

    if (drCrNoteOn === "On Qty") {
      if (!productName) return setFormError("Product Name is required when Note On is 'On Qty'.");
      if (!beNoOrPurchaseNo) return setFormError("BE/Purchase Bill No is required when Note On is 'On Qty'.");
      if (!tankerOrVehicleNo) return setFormError("Tanker or Vehicle No is required when Note On is 'On Qty'.");
      if (!qty) return setFormError("Quantity is required when Note On is 'On Qty'.");
      if (!rate) return setFormError("Rate is required when Note On is 'On Qty'.");
      if (!amount) return setFormError("Amount is required when Note On is 'On Qty'.");
    } else if (drCrNoteOn === "On Amount") {
      if (!ledgerSelection) return setFormError("Ledger Selection is required when Note On is 'On Amount'.");
      if (!amount) return setFormError("Amount is required when Note On is 'On Amount'.");
    }

    setFormError("");
    setIsSaving(true);

    try {
      const recordPayload = {
        entryDate,
        aolGodown,
        aolBranchName,
        tallyDate,
        noteOn: drCrNoteOn,
        noteType: drCrNote,
        partyName,
        noteNo: drCrNo,
        pidId: sourcePidId || undefined,
        productName,
        bePurchaseBillNo: beNoOrPurchaseNo,
        tankerVehicleNo: tankerOrVehicleNo,
        ledgerSelection,
        qty: parseFloat(qty) || 0,
        rate: parseFloat(rate) || 0,
        amount: parseFloat(amount) || 0,
        autoQty,
        autoAmount,
        purRateEffectedAmount,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        description: description || undefined,
      };

      if (editingRecord) {
        await onUpdateAccountsSupplierCrDr({
          ...editingRecord,
          ...recordPayload,
        });
      } else {
        await onAddAccountsSupplierCrDr(recordPayload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this Supplier CR/DR note record?")) {
      try {
        await onDeleteAccountsSupplierCrDr(id);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  // Filter records
  const filteredRecords = accountsSupplierCrDrs.filter((record) => {
    const searchString = `${record.noteNo} ${record.partyName} ${record.productName} ${record.bePurchaseBillNo} ${record.tankerVehicleNo}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || record.noteType === filterType;
    const matchesGodown = filterGodown === "all" || record.aolGodown === filterGodown;

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? record.entryDate : record.tallyDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesType && matchesGodown && matchesDate;
  });

  const overallEntries = accountsSupplierCrDrs.length;
  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterType !== "all" || filterGodown !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterGodown("all");
    setStartDate("");
    setEndDate("");
  };

  const totalFilteredAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalFilteredQty = filteredRecords.reduce((sum, r) => sum + (r.qty || 0), 0);
  const totalAutoQty = filteredRecords.reduce((sum, r) => sum + (r.autoQty || 0), 0);
  const totalAutoAmount = filteredRecords.reduce((sum, r) => sum + (r.autoAmount || 0), 0);
  const totalPurRateEffected = filteredRecords.reduce((sum, r) => sum + (r.purRateEffectedAmount || 0), 0);
  const avgRate = totalFilteredQty > 0 ? totalFilteredAmount / totalFilteredQty : 0;
  const debitCount = filteredRecords.filter((r) => r.noteType === "Debit Note").length;
  const creditCount = filteredRecords.filter((r) => r.noteType === "Credit Note").length;
  const uniqueGodowns = Array.from(new Set(filteredRecords.map((r) => r.aolGodown).filter(Boolean))).length;
  const uniqueParties = Array.from(new Set(filteredRecords.map((r) => r.partyName).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length;

  return (
    <div className="space-y-4">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_supplier_cr_dr_apps_script"
        defaultSheetName="Supplier Cr Dr"
        collectionKey="accounts_supplier_cr_dr"
        records={accountsSupplierCrDrs}
        activeUser={activeUser}
        moduleTitle="Accounts Supplier CR/DR Note Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsSupplierCrDrs.find((s) => s.id === rec.id);
            if (existing) {
              onUpdateAccountsSupplierCrDr({ ...existing, ...rec });
            } else {
              onAddAccountsSupplierCrDr(rec);
            }
          });
        }}
      />

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by note number, party, product, bill/BE no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs rounded-md border border-slate-300 bg-slate-50 hover:bg-white focus:bg-white focus:border-slate-800 transition-all focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-slate-300 bg-slate-50 focus:outline-none focus:border-slate-800 focus:bg-white"
            >
              <option value="all">All Note Types</option>
              <option value="Debit Note">Debit Note</option>
              <option value="Credit Note">Credit Note</option>
            </select>

            {/* Godown Filter */}
            <select
              value={filterGodown}
              onChange={(e) => setFilterGodown(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-slate-300 bg-slate-50 focus:outline-none focus:border-slate-800 focus:bg-white"
            >
              <option value="all">All Godowns</option>
              {Array.from(new Set(accountsSupplierCrDrs.map((r) => r.aolGodown).filter(Boolean))).map((g) => (
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
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          {/* Create Button */}
          {canAdd && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              New CR/DR Note
            </button>
          )}
        </div>

        {isFiltered && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-md text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-500" />
              <span>
                Filtered results: <strong>{filteredRecords.length}</strong> of {overallEntries} records
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono">
                Filtered Amount: <strong className="text-slate-900 font-bold">{formatCurrency(totalFilteredAmount)}</strong>
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

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-3xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supplier Debit/Credit Notes</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Showing {filteredRecords.length} records</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Entry / Tally Date</th>
                <th className="py-3 px-4">Note No / Type</th>
                <th className="py-3 px-4">AOL Godown / Branch</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4 text-right">Qty (Kg)</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right bg-emerald-50/30">Auto Qty</th>
                <th className="py-3 px-4 text-right bg-emerald-50/30">Auto Amount</th>
                <th className="py-3 px-4 text-right bg-blue-50/30">Pur Rate Effected</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-mono text-[11px]">
                    No Supplier CR/DR Note records found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isRecordDebit = record.noteType === "Debit Note";
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[10px] whitespace-nowrap">
                        <div>{formatDateDdMmmYy(record.entryDate)}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Tally: {formatDateDdMmmYy(record.tallyDate)}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{record.noteNo}</div>
                        <span
                          className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                            isRecordDebit ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {record.noteType} ({record.noteOn})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{record.aolGodown}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{record.aolBranchName}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 max-w-[150px] truncate">
                        {record.partyName}
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-bold text-slate-800 truncate">{record.productName}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-1 space-y-0.5">
                          <div>BE/Bill No: {record.bePurchaseBillNo || "—"}</div>
                          <div>Vehicle/Tanker: {record.tankerVehicleNo || "—"}</div>
                          <div className="text-indigo-600 font-bold">Ledger: {record.ledgerSelection}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {record.qty?.toLocaleString("en-IN") || "0"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(record.rate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold bg-emerald-50/10 ${record.autoQty !== undefined && record.autoQty < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {record.autoQty !== undefined ? (record.autoQty > 0 ? `+${record.autoQty}` : record.autoQty) : "—"}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold bg-emerald-50/10 ${record.autoAmount !== undefined && record.autoAmount < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {record.autoAmount !== undefined ? (record.autoAmount > 0 ? `+${record.autoAmount.toFixed(2)}` : record.autoAmount.toFixed(2)) : "—"}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold bg-blue-50/10 ${record.purRateEffectedAmount !== undefined && record.purRateEffectedAmount < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {record.purRateEffectedAmount !== undefined ? (record.purRateEffectedAmount > 0 ? `+${record.purRateEffectedAmount.toFixed(2)}` : record.purRateEffectedAmount.toFixed(2)) : "—"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenViewModal(record)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="View full note details"
                          >
                            <Eye size={14} />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(record)}
                                className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="Edit record"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Delete record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
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
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-amber-300 block font-bold">{debitCount} Debit</span>
                    <span className="text-[10px] text-emerald-300 block">{creditCount} Credit</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueGodowns} Godowns</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueParties} Parties</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      {totalFilteredQty.toLocaleString("en-IN")} Kg
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-[10px] text-slate-400 block">
                      Avg: ₹{avgRate.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      {formatCurrency(totalFilteredAmount)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-bold text-slate-300 block text-xs">
                      {totalAutoQty !== 0 ? (totalAutoQty > 0 ? `+${totalAutoQty}` : totalAutoQty) : "—"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-bold text-slate-300 block text-xs">
                      {totalAutoAmount !== 0 ? (totalAutoAmount > 0 ? `+${formatCurrency(totalAutoAmount)}` : formatCurrency(totalAutoAmount)) : "—"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-bold text-blue-300 block text-xs">
                      {totalPurRateEffected !== 0 ? (totalPurRateEffected > 0 ? `+${formatCurrency(totalPurRateEffected)}` : formatCurrency(totalPurRateEffected)) : "—"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {/* Spacer */}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Detail / Entry Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {viewingRecord
                    ? "Supplier CR/DR Note details"
                    : editingRecord
                    ? "Modify Supplier CR/DR Note"
                    : "Create Supplier CR/DR Note"}
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {viewingRecord
                    ? "Read-only ledger view"
                    : "Fill all the ledger details below for Indian Purchase returns/credits"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <span className="font-bold">Execution Error:</span> {formError}
                  </div>
                </div>
              )}

              {/* VIEW ONLY READ-ONLY CARD */}
              {viewingRecord && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Entry Date</div>
                      <div className="font-mono text-slate-900 mt-1">{formatDateDdMmmYy(viewingRecord.entryDate)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Tally Date</div>
                      <div className="font-mono text-slate-900 mt-1">{formatDateDdMmmYy(viewingRecord.tallyDate)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">DR / CR Note Type</div>
                      <div className="font-bold text-indigo-700 mt-1">{viewingRecord.noteType} ({viewingRecord.noteOn})</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Note Reference No</div>
                      <div className="font-bold text-slate-900 mt-1">{viewingRecord.noteNo}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">AOL Godown</div>
                      <div className="font-semibold text-slate-800 mt-1">{viewingRecord.aolGodown}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">AOL Branch Name</div>
                      <div className="font-semibold text-slate-800 mt-1">{viewingRecord.aolBranchName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Party Name</div>
                      <div className="font-bold text-slate-900 mt-1">{viewingRecord.partyName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Ledger Selection</div>
                      <div className="font-bold text-emerald-700 mt-1">{viewingRecord.ledgerSelection}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Product Name</div>
                      <div className="font-semibold text-slate-800 mt-1">{viewingRecord.productName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">BE/Purchase Bill No</div>
                      <div className="font-semibold text-slate-800 mt-1">{viewingRecord.bePurchaseBillNo || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Vehicle or Tanker No</div>
                      <div className="font-semibold text-slate-800 mt-1">{viewingRecord.tankerVehicleNo || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Date range</div>
                      <div className="text-slate-700 mt-1">
                        {viewingRecord.dateFrom ? formatDateDdMmmYy(viewingRecord.dateFrom) : "—"} to{" "}
                        {viewingRecord.dateTo ? formatDateDdMmmYy(viewingRecord.dateTo) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Adjusted Quantity</div>
                      <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                        {viewingRecord.qty} Kg
                      </div>
                      <div className="text-[9px] text-emerald-600 mt-0.5">Auto: {viewingRecord.autoQty} Kg</div>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Rate Applied</div>
                      <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                        {formatCurrency(viewingRecord.rate)}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Total Amount</div>
                      <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                        {formatCurrency(viewingRecord.amount)}
                      </div>
                      <div className="text-[9px] text-emerald-600 mt-0.5">Auto: {formatCurrency(viewingRecord.autoAmount)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg col-span-2 text-center">
                      <div className="text-[10px] text-blue-600 uppercase font-bold">Purchase Rate Effected Amount</div>
                      <div className="text-md font-mono font-bold text-blue-900 mt-1">
                        {formatCurrency(viewingRecord.purRateEffectedAmount)}
                      </div>
                    </div>
                  </div>

                  {viewingRecord.description && (
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Description / Remarks</div>
                      <p className="text-xs text-slate-600 mt-1 italic">"{viewingRecord.description}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* MUTABLE FORM */}
              {!viewingRecord && (
                <div className="space-y-6">
                  {/* General Stamping Details */}
                  <div className="bg-slate-50/70 p-4 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Entry Date (Read Only)
                      </label>
                      <input
                        type="date"
                        value={entryDate}
                        readOnly
                        className="px-3 py-1.5 w-full text-xs font-semibold rounded-md border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Stamped automatically at creation</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        AOL Godown *
                      </label>
                      <select
                        value={aolGodown}
                        onChange={(e) => setAolGodown(e.target.value)}
                        required
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                      >
                        <option value="">-- Choose Godown --</option>
                        {aolGodowns.map((godown) => (
                          <option key={godown.id} value={godown.name}>
                            {godown.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        AOL Branch Name (Auto)
                      </label>
                      <input
                        type="text"
                        value={aolBranchName}
                        readOnly
                        placeholder="Select godown to display..."
                        className="px-3 py-1.5 w-full text-xs font-semibold rounded-md border border-slate-300 bg-slate-100 text-slate-600 cursor-not-allowed focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Mapped based on AOL Godown</span>
                    </div>
                  </div>

                  {/* Operational Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Tally Date
                      </label>
                      <input
                        type="date"
                        value={tallyDate}
                        onChange={(e) => setTallyDate(e.target.value)}
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Note Type *
                      </label>
                      <select
                        value={drCrNote}
                        onChange={(e) => setDrCrNote(e.target.value)}
                        required
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="Debit Note">Debit Note (Return/Rejection)</option>
                        <option value="Credit Note">Credit Note (Rebate/Discount)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Dr/Cr Note ON *
                      </label>
                      <select
                        value={drCrNoteOn}
                        onChange={(e) => setDrCrNoteOn(e.target.value)}
                        required
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="On Qty">On Qty</option>
                        <option value="On Amount">On Amount</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Note Reference No (DR/CR No) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DN-2026-001"
                        value={drCrNo}
                        onChange={(e) => setDrCrNo(e.target.value)}
                        required
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  {/* Product & Purchase Details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Hash size={14} className="text-slate-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Product & Purchase Details</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Party Name *
                        </label>
                        <select
                          value={isCustomParty ? "__custom__" : partyName}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomParty(true);
                              setPartyName("");
                            } else {
                              setIsCustomParty(false);
                              setPartyName(e.target.value);
                            }
                          }}
                          required={!isCustomParty}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                        >
                          <option value="">-- Choose Party Name --</option>
                          {partyOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Party Name...</option>
                        </select>
                        {isCustomParty && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Enter Custom Party Name..."
                              value={customPartyName}
                              onChange={(e) => {
                                setCustomPartyName(e.target.value);
                                setPartyName(e.target.value);
                              }}
                              required
                              className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomParty(false);
                                setPartyName("");
                              }}
                              className="text-[9px] text-indigo-600 hover:text-indigo-850 mt-1 block font-bold cursor-pointer"
                            >
                              &larr; Select from existing list
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Editable Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-3 border border-slate-200 rounded-lg">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Product Name (Cascaded) {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                        </label>
                        <select
                          value={isCustomProduct ? "__custom__" : productName}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomProduct(true);
                              setProductName("");
                            } else {
                              setIsCustomProduct(false);
                              setProductName(e.target.value);
                            }
                          }}
                          required={drCrNoteOn === "On Qty" && !isCustomProduct}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                        >
                          <option value="">-- Select Product --</option>
                          {productOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Product...</option>
                        </select>
                        {isCustomProduct && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Enter Custom Product Name..."
                              value={customProductName}
                              onChange={(e) => {
                                setCustomProductName(e.target.value);
                                setProductName(e.target.value);
                              }}
                              required={drCrNoteOn === "On Qty"}
                              className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomProduct(false);
                                setProductName("");
                              }}
                              className="text-[9px] text-indigo-600 hover:text-indigo-850 mt-1 block font-bold cursor-pointer"
                            >
                              &larr; Select from existing list
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          BE/Purchase Bill No (Cascaded) {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                        </label>
                        <select
                          value={isCustomBeNo ? "__custom__" : beNoOrPurchaseNo}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomBeNo(true);
                              setBeNoOrPurchaseNo("");
                            } else {
                              setIsCustomBeNo(false);
                              setBeNoOrPurchaseNo(e.target.value);
                            }
                          }}
                          required={drCrNoteOn === "On Qty" && !isCustomBeNo}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                        >
                          <option value="">-- Select Bill No --</option>
                          {beNoOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Bill No...</option>
                        </select>
                        {isCustomBeNo && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Enter Custom Bill No..."
                              value={customBeNo}
                              onChange={(e) => {
                                setCustomBeNo(e.target.value);
                                setBeNoOrPurchaseNo(e.target.value);
                              }}
                              required={drCrNoteOn === "On Qty"}
                              className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomBeNo(false);
                                setBeNoOrPurchaseNo("");
                              }}
                              className="text-[9px] text-indigo-600 hover:text-indigo-850 mt-1 block font-bold cursor-pointer"
                            >
                              &larr; Select from existing list
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Tanker or Vehicle No (Cascaded) {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                        </label>
                        <select
                          value={isCustomVehicle ? "__custom__" : tankerOrVehicleNo}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomVehicle(true);
                              setTankerOrVehicleNo("");
                            } else {
                              setIsCustomVehicle(false);
                              setTankerOrVehicleNo(e.target.value);
                            }
                          }}
                          required={drCrNoteOn === "On Qty" && !isCustomVehicle}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                        >
                          <option value="">-- Select Tanker/Vehicle --</option>
                          {vehicleOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Vehicle...</option>
                        </select>
                        {isCustomVehicle && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Enter Custom Vehicle..."
                              value={customVehicleNo}
                              onChange={(e) => {
                                setCustomVehicleNo(e.target.value);
                                setTankerOrVehicleNo(e.target.value);
                              }}
                              required={drCrNoteOn === "On Qty"}
                              className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomVehicle(false);
                                setTankerOrVehicleNo("");
                              }}
                              className="text-[9px] text-indigo-600 hover:text-indigo-850 mt-1 block font-bold cursor-pointer"
                            >
                              &larr; Select from existing list
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Ledgers Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Ledger Selection (dropdown) {drCrNoteOn === "On Amount" ? "*" : "(Optional)"}
                      </label>
                      <select
                        value={ledgerSelection}
                        onChange={(e) => setLedgerSelection(e.target.value)}
                        required={drCrNoteOn === "On Amount"}
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="">-- Select Ledger (Cr/Dr List) --</option>
                        {ledgerCrDrs.map((ledger) => (
                          <option key={ledger.id} value={ledger.name}>
                            {ledger.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] text-indigo-600 font-medium mt-1 block">
                        Managed inside List Management &rarr; Ledger CR DR Tab
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Date From
                        </label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Date To
                        </label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Fields with LIVE Auto Calculation */}
                  <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/40">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                      <DollarSign size={14} className="text-slate-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Financial Values & Indian Purchase Rules</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Quantity (Kg) {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 5000"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          required={drCrNoteOn === "On Qty"}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Rate {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 68.50"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          required={drCrNoteOn === "On Qty"}
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Amount *
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 342500"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* LIVE CALCULATION PREVIEW BOX */}
                    <div className="bg-emerald-50 border border-emerald-200/60 rounded-lg p-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center md:border-r border-emerald-200/50 p-2">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Auto Qty Effect</span>
                        <span className={`text-sm font-mono font-extrabold block mt-1 ${autoQty < 0 ? "text-red-600" : "text-emerald-800"}`}>
                          {autoQty > 0 ? `+${autoQty}` : autoQty} Kg
                        </span>
                        <span className="text-[8px] text-emerald-500 mt-1 block italic">
                          {isDebit ? "Debit Note: Minus Qty" : "Credit Note: Add Qty"}
                        </span>
                      </div>

                      <div className="text-center md:border-r border-emerald-200/50 p-2">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Auto Amount Effect</span>
                        <span className={`text-sm font-mono font-extrabold block mt-1 ${autoAmount < 0 ? "text-red-600" : "text-emerald-800"}`}>
                          {autoAmount > 0 ? `+${autoAmount.toFixed(2)}` : autoAmount.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-emerald-500 mt-1 block italic">
                          {isDebit ? "Debit Note: Add Amount" : "Credit Note: Minus Amount"}
                        </span>
                      </div>

                      <div className="text-center p-2">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Pur Rate Effected Amount</span>
                        <span className={`text-sm font-mono font-extrabold block mt-1 ${purRateEffectedAmount < 0 ? "text-red-600" : "text-emerald-800"}`}>
                          {purRateEffectedAmount > 0 ? `+${purRateEffectedAmount.toFixed(2)}` : purRateEffectedAmount.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-emerald-500 mt-1 block italic">
                          Auto Qty * Auto Rate adjustment
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Description / Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Price difference adjustment note"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-150 rounded-md text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                Close
              </button>
              {!viewingRecord && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                >
                  {isSaving ? "Saving..." : "Save Note"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
