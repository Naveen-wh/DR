/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AccountsCustomerCrDrRecord, LedgerCrDrCategory, AolGodown, AolBranchName, AccountsSalesRecord, User } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, Calendar, DollarSign, AlertCircle, Hash, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../Configuration/AppsScriptSyncBanner";

interface AccountsCustomerCrDrSubViewProps {
  activeUserId: string;
  users: User[];
  accountsCustomerCrDrs?: AccountsCustomerCrDrRecord[];
  sales?: AccountsSalesRecord[];
  ledgerCrDrs?: LedgerCrDrCategory[];
  aolGodowns?: AolGodown[];
  aolBranches?: AolBranchName[];
  onAddAccountsCustomerCrDr: (record: Omit<AccountsCustomerCrDrRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsCustomerCrDr: (record: AccountsCustomerCrDrRecord) => Promise<void> | void;
  onDeleteAccountsCustomerCrDr: (id: string) => Promise<void> | void;
  canAdd?: boolean;
  canEdit?: boolean;
}

const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

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

export default function AccountsCustomerCrDrSubView({
  activeUserId,
  users,
  accountsCustomerCrDrs = [],
  sales = [],
  ledgerCrDrs = [],
  aolGodowns = [],
  aolBranches = [],
  onAddAccountsCustomerCrDr,
  onUpdateAccountsCustomerCrDr,
  onDeleteAccountsCustomerCrDr,
  canAdd = true,
  canEdit = true,
}: AccountsCustomerCrDrSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || {
    id: activeUserId,
    name: "Unknown User",
  };

  // Google Sheets Apps Script Integration
  const { config, syncStatus, setSyncStatus } = useAppsScriptSync(
    "accounts_customer_cr_dr_apps_script",
    "Customer Cr Dr",
    "accounts_customer_cr_dr"
  );

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsCustomerCrDrRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsCustomerCrDrRecord | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterGodown, setFilterGodown] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Form states
  const [entryDate] = useState(new Date().toISOString().split("T")[0]); // read-only
  const [aolGodown, setAolGodown] = useState("");
  const [aolBranchName, setAolBranchName] = useState("");
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [drCrNoteOn, setDrCrNoteOn] = useState<"On Qty" | "On Rate" | "On Amount" | string>("On Qty");
  const [drCrNote, setDrCrNote] = useState<"Credit Note" | "Debit Note" | string>("Debit Note");
  const [partyName, setPartyName] = useState("");
  const [drCrNo, setDrCrNo] = useState("");
  
  // Cascaded fields
  const [saleInvoiceNo, setSaleInvoiceNo] = useState("");
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

  const [customInvoiceNo, setCustomInvoiceNo] = useState("");
  const [isCustomInvoice, setIsCustomInvoice] = useState(false);

  const [customProductName, setCustomProductName] = useState("");
  const [isCustomProduct, setIsCustomProduct] = useState(false);

  const [customBeNo, setCustomBeNo] = useState("");
  const [isCustomBeNo, setIsCustomBeNo] = useState(false);

  const [customVehicleNo, setCustomVehicleNo] = useState("");
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic dropdown list options based on sales list
  const uniqueInvoiceNos = Array.from(new Set(sales.map((s) => s.saleInvoiceNo).filter(Boolean)));
  const invoiceOptions = saleInvoiceNo && !uniqueInvoiceNos.includes(saleInvoiceNo)
    ? [saleInvoiceNo, ...uniqueInvoiceNos]
    : uniqueInvoiceNos;

  const filteredSalesForInvoice = saleInvoiceNo
    ? sales.filter((s) => s.saleInvoiceNo === saleInvoiceNo)
    : sales;

  const uniqueProductNames = Array.from(new Set(filteredSalesForInvoice.map((s) => s.productName).filter(Boolean)));
  const productOptions = productName && !uniqueProductNames.includes(productName)
    ? [productName, ...uniqueProductNames]
    : uniqueProductNames;

  const filteredSalesForBeNo = filteredSalesForInvoice.filter((s) => !productName || s.productName === productName);
  const uniqueBeNos = Array.from(new Set(filteredSalesForBeNo.map((s) => s.beNoOrPurchaseNo).filter(Boolean)));
  const beNoOptions = beNoOrPurchaseNo && !uniqueBeNos.includes(beNoOrPurchaseNo)
    ? [beNoOrPurchaseNo, ...uniqueBeNos]
    : uniqueBeNos;

  const filteredSalesForVehicle = filteredSalesForBeNo.filter((s) => !beNoOrPurchaseNo || s.beNoOrPurchaseNo === beNoOrPurchaseNo);
  const uniqueTankerVehicles = Array.from(new Set(filteredSalesForVehicle.map((s) => s.containerNo).filter(Boolean)));
  const vehicleOptions = tankerOrVehicleNo && !uniqueTankerVehicles.includes(tankerOrVehicleNo)
    ? [tankerOrVehicleNo, ...uniqueTankerVehicles]
    : uniqueTankerVehicles;

  const uniquePartyNames = Array.from(new Set(sales.map((s) => s.partyName).filter(Boolean)));
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

  // Handle cascaded prefill when Sale Invoice is selected
  useEffect(() => {
    if (saleInvoiceNo && !isCustomInvoice) {
      const match = sales.find((s) => s.saleInvoiceNo === saleInvoiceNo);
      if (match) {
        if (!isCustomParty && !partyName) {
          setPartyName(match.partyName || "");
        }
        if (!isCustomProduct && !productName) {
          setProductName(match.productName || "");
        }
        if (!isCustomBeNo && !beNoOrPurchaseNo) {
          setBeNoOrPurchaseNo(match.beNoOrPurchaseNo || "");
        }
        if (!isCustomVehicle && !tankerOrVehicleNo) {
          setTankerOrVehicleNo(match.containerNo || "");
        }
      }
    }
  }, [saleInvoiceNo, isCustomInvoice, sales]);

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
    setSaleInvoiceNo("");
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
    setIsCustomInvoice(false);
    setCustomInvoiceNo("");
    setIsCustomProduct(false);
    setCustomProductName("");
    setIsCustomBeNo(false);
    setCustomBeNo("");
    setIsCustomVehicle(false);
    setCustomVehicleNo("");

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: AccountsCustomerCrDrRecord) => {
    setEditingRecord(record);
    setViewingRecord(null);
    setAolGodown(record.aolGodown);
    setAolBranchName(record.aolBranchName);
    setTallyDate(record.tallyDate);
    setDrCrNoteOn(record.noteOn);
    setDrCrNote(record.noteType);
    setPartyName(record.partyName);
    setDrCrNo(record.noteNo);
    setSaleInvoiceNo(record.saleInvoiceNo);
    setProductName(record.productName);
    setBeNoOrPurchaseNo(record.bePurchaseBillNo);
    setTankerOrVehicleNo(record.tankerVehicleNo);
    setLedgerSelection(record.ledgerSelection);
    setQty(String(record.qty));
    setRate(String(record.rate));
    setAmount(record.amount !== undefined ? String(record.amount) : "");
    setDateFrom(record.dateFrom || "");
    setDateTo(record.dateTo || "");
    setDescription(record.description || "");
    setFormError("");

    const isCustomP = record.partyName ? !uniquePartyNames.includes(record.partyName) : false;
    setIsCustomParty(isCustomP);
    setCustomPartyName(isCustomP ? record.partyName : "");

    const isCustomInv = record.saleInvoiceNo ? !uniqueInvoiceNos.includes(record.saleInvoiceNo) : false;
    setIsCustomInvoice(isCustomInv);
    setCustomInvoiceNo(isCustomInv ? record.saleInvoiceNo : "");

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

  const handleOpenViewModal = (record: AccountsCustomerCrDrRecord) => {
    setViewingRecord(record);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aolGodown) return setFormError("AOL Godown is required.");
    if (!drCrNo) return setFormError("DR / CR Note No is required.");
    if (!partyName) return setFormError("Party Name is required.");

    if (drCrNoteOn === "On Qty") {
      if (!saleInvoiceNo) return setFormError("Sale Invoice No is required when Note On is 'On Qty'.");
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
        saleInvoiceNo,
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
        await onUpdateAccountsCustomerCrDr({
          ...editingRecord,
          ...recordPayload,
        });
      } else {
        await onAddAccountsCustomerCrDr(recordPayload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this Customer CR/DR note record?")) {
      try {
        await onDeleteAccountsCustomerCrDr(id);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  // Filter records
  const filteredRecords = accountsCustomerCrDrs.filter((record) => {
    const searchString = `${record.noteNo} ${record.partyName} ${record.productName} ${record.bePurchaseBillNo} ${record.saleInvoiceNo} ${record.tankerVehicleNo}`.toLowerCase();
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

  const overallEntries = accountsCustomerCrDrs.length;
  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterType !== "all" || filterGodown !== "all" || startDate !== "" || endDate !== ""
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterGodown("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
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

  // Pagination calculations
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="space-y-4">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_customer_cr_dr_apps_script"
        defaultSheetName="Customer Cr Dr"
        collectionKey="accounts_customer_cr_dr"
        records={accountsCustomerCrDrs}
        activeUser={activeUser as any}
        moduleTitle="Accounts Customer CR/DR Note Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsCustomerCrDrs.find((c) => c.id === rec.id);
            if (existing) {
              onUpdateAccountsCustomerCrDr({ ...existing, ...rec });
            } else {
              onAddAccountsCustomerCrDr(rec);
            }
          });
        }}
      />

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Note No, Party, Product, Invoice No, BE Bill, Tanker..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-md border border-slate-300 bg-slate-50 focus:outline-none focus:border-slate-800 focus:bg-white"
            >
              <option value="all">All Note Types</option>
              <option value="Debit Note">Debit Note</option>
              <option value="Credit Note">Credit Note</option>
            </select>

            {/* Godown Filter */}
            <select
              value={filterGodown}
              onChange={(e) => {
                setFilterGodown(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-md border border-slate-300 bg-slate-50 focus:outline-none focus:border-slate-800 focus:bg-white"
            >
              <option value="all">All Godowns</option>
              {Array.from(new Set(accountsCustomerCrDrs.map((r) => r.aolGodown).filter(Boolean))).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <DateRangeFilterPopup
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(val) => {
                setStartDate(val);
                setCurrentPage(1);
              }}
              onEndDateChange={(val) => {
                setEndDate(val);
                setCurrentPage(1);
              }}
              dateFilterType={dateFilterType}
              onDateFilterTypeChange={(val) => {
                setDateFilterType(val);
                setCurrentPage(1);
              }}
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
              New Customer CR/DR
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Customer Debit/Credit Notes</h3>
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
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-mono text-[11px]">
                    No Customer CR/DR Note records found matching the criteria.
                  </td>
                </tr>
              ) : (
                currentRecords.map((record) => {
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
                          <div>Invoice No: {record.saleInvoiceNo || "—"}</div>
                          <div>BE/Bill No: {record.bePurchaseBillNo || "—"}</div>
                          <div>Vehicle/Tanker: {record.tankerVehicleNo || "—"}</div>
                          <div className="text-indigo-600 font-bold">Ledger: {record.ledgerSelection}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] font-medium whitespace-nowrap">
                        {record.qty !== undefined ? record.qty.toLocaleString("en-IN") : "0"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                        ₹{(record.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        ₹{(record.amount || 0).toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-[11px] font-bold bg-emerald-50/10 whitespace-nowrap ${
                          (record.autoQty || 0) < 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {(record.autoQty || 0) > 0 ? "+" : ""}
                        {(record.autoQty || 0).toLocaleString("en-IN")}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-[11px] font-bold bg-emerald-50/10 whitespace-nowrap ${
                          (record.autoAmount || 0) < 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        ₹{(record.autoAmount || 0).toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-[11px] font-bold bg-blue-50/10 whitespace-nowrap ${
                          (record.purRateEffectedAmount || 0) < 0 ? "text-rose-600" : "text-blue-700"
                        }`}
                      >
                        ₹{(record.purRateEffectedAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenViewModal(record)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="View details"
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

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="text-[11px] text-slate-500 font-medium">
              Showing <span className="font-bold">{indexOfFirstItem + 1}</span> to{" "}
              <span className="font-bold">{Math.min(indexOfLastItem, totalItems)}</span> of{" "}
              <span className="font-bold">{totalItems}</span> records
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-[10px] font-bold rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                    currentPage === p
                      ? "bg-slate-900 text-white border border-slate-900"
                      : "border border-slate-200 bg-white hover:bg-slate-50"
                  } cursor-pointer`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-[10px] font-bold rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over or Modal drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  {viewingRecord
                    ? "View Customer CR/DR Note Details"
                    : editingRecord
                    ? "Edit Customer CR/DR Note"
                    : "Create Customer CR/DR Note"}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  {viewingRecord ? `ID: ${viewingRecord.id}` : "Please fill in note specifications"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {viewingRecord ? (
              /* VIEW MODE */
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Entry Date</div>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                      {formatDateDdMmmYy(viewingRecord.entryDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Tally Date</div>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                      {formatDateDdMmmYy(viewingRecord.tallyDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Note No / Type</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {viewingRecord.noteNo} ({viewingRecord.noteType})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider mb-3">
                      Branch & Party details
                    </h4>
                    <div className="space-y-4 border border-slate-100 rounded-lg p-4 bg-white shadow-3xs">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">AOL Godown</div>
                        <div className="text-xs font-semibold text-slate-800 mt-0.5">{viewingRecord.aolGodown}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">AOL Branch Name</div>
                        <div className="text-xs font-semibold text-slate-800 mt-0.5">{viewingRecord.aolBranchName}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Party Name</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">{viewingRecord.partyName}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider mb-3">
                      Invoice & Product details
                    </h4>
                    <div className="space-y-4 border border-slate-100 rounded-lg p-4 bg-white shadow-3xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Sale Invoice No</div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{viewingRecord.saleInvoiceNo || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">BE/Purchase Bill No</div>
                          <div className="text-xs font-semibold text-slate-800 mt-0.5">{viewingRecord.bePurchaseBillNo || "—"}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Product Name</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">{viewingRecord.productName}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Tanker or Vehicle No</div>
                        <div className="text-xs font-semibold text-slate-800 mt-0.5">{viewingRecord.tankerVehicleNo || "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider mb-3">
                    Financials & calculations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 rounded-lg p-4 bg-white shadow-3xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Quantity (Kg)</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                        {viewingRecord.qty?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Rate</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                        ₹{(viewingRecord.rate || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Entered Amount</div>
                      <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                        ₹{(viewingRecord.amount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 rounded-lg border border-emerald-100 bg-emerald-50/20">
                    <div>
                      <div className="text-[10px] text-emerald-800 uppercase font-extrabold">Auto calculated Qty</div>
                      <div className="text-sm font-mono font-black text-emerald-900 mt-0.5">
                        {viewingRecord.autoQty > 0 ? "+" : ""}
                        {viewingRecord.autoQty?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-800 uppercase font-extrabold">Auto calculated Amount</div>
                      <div className="text-sm font-mono font-black text-emerald-900 mt-0.5">
                        ₹{viewingRecord.autoAmount?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-indigo-800 uppercase font-extrabold">Pur Rate Effected Amount</div>
                      <div className="text-sm font-mono font-black text-indigo-950 mt-0.5">
                        ₹{viewingRecord.purRateEffectedAmount?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Ledger Selection</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">{viewingRecord.ledgerSelection}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Date From</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                        {viewingRecord.dateFrom ? formatDateDdMmmYy(viewingRecord.dateFrom) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Date To</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                        {viewingRecord.dateTo ? formatDateDdMmmYy(viewingRecord.dateTo) : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Description / Narration</div>
                  <div className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 mt-1 min-h-[60px] whitespace-pre-wrap">
                    {viewingRecord.description || "No description provided."}
                  </div>
                </div>

                {/* Footnote */}
                <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>Created By: {viewingRecord.createdByName || "System"}</div>
                  <div>Record ID: {viewingRecord.id}</div>
                </div>
              </div>
            ) : (
              /* ADD/EDIT FORM MODE */
              <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Entry Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Entry Date (Read-Only)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={entryDate}
                        readOnly
                        className="pl-9 pr-3 py-1.5 w-full text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* AOL Godown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      AOL Godown *
                    </label>
                    <select
                      value={aolGodown}
                      onChange={(e) => setAolGodown(e.target.value)}
                      required
                      className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800 font-bold"
                    >
                      <option value="">-- Choose Godown --</option>
                      {aolGodowns.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AOL Branch Name (Read Only Auto display) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      AOL Branch Name
                    </label>
                    <input
                      type="text"
                      value={aolBranchName}
                      readOnly
                      placeholder="Auto displayed..."
                      className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-600 font-bold focus:outline-none"
                    />
                  </div>

                  {/* Tally Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tally Date *
                    </label>
                    <input
                      type="date"
                      value={tallyDate}
                      onChange={(e) => setTallyDate(e.target.value)}
                      required
                      className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Note On */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
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

                  {/* Note Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      DR / CR Note Type *
                    </label>
                    <select
                      value={drCrNote}
                      onChange={(e) => setDrCrNote(e.target.value)}
                      required
                      className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800 font-bold"
                    >
                      <option value="Debit Note">Debit Note</option>
                      <option value="Credit Note">Credit Note</option>
                    </select>
                  </div>

                  {/* Party Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
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

                  {/* DR/CR Note No */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      DR / CR No *
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Enter Note No..."
                        value={drCrNo}
                        onChange={(e) => setDrCrNo(e.target.value)}
                        required
                        className="pl-9 pr-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Cascading Dropdowns section */}
                <div className="p-4 border border-slate-200 bg-slate-50/50 rounded-lg space-y-4">
                  <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                    Cascading Sales References (Optional / Prefillable)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Sale Invoice No */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Sale Invoice No {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                      </label>
                      <select
                        value={isCustomInvoice ? "__custom__" : saleInvoiceNo}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setIsCustomInvoice(true);
                            setSaleInvoiceNo("");
                          } else {
                            setIsCustomInvoice(false);
                            setSaleInvoiceNo(e.target.value);
                          }
                        }}
                        required={drCrNoteOn === "On Qty" && !isCustomInvoice}
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-800"
                      >
                        <option value="">-- Choose Sale Invoice --</option>
                        {invoiceOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        <option value="__custom__">+ Enter Custom Invoice...</option>
                      </select>
                      {isCustomInvoice && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Enter Custom Invoice No..."
                            value={customInvoiceNo}
                            onChange={(e) => {
                              setCustomInvoiceNo(e.target.value);
                              setSaleInvoiceNo(e.target.value);
                            }}
                            required={drCrNoteOn === "On Qty"}
                            className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomInvoice(false);
                              setSaleInvoiceNo("");
                            }}
                            className="text-[9px] text-indigo-600 hover:text-indigo-850 mt-1 block font-bold cursor-pointer"
                          >
                            &larr; Select from existing list
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Product Name {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
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

                    {/* BE/Purchase Bill No */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        BE/Purchase Bill No {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
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

                    {/* Tanker or Vehicle No */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Tanker or Vehicle No {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ledger selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Ledger Selection {drCrNoteOn === "On Amount" ? "*" : "(Optional)"}
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

                  {/* Dates From and To */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Date From
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
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
                        className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Qty, Rate, Amount inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Quantity (Kg) {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter Quantity (Kg)..."
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      required={drCrNoteOn === "On Qty"}
                      className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Rate {drCrNoteOn === "On Qty" ? "*" : "(Optional)"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="Enter Rate..."
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        required={drCrNoteOn === "On Qty"}
                        className="pl-7 pr-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Amount *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="Enter Amount..."
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        className="pl-7 pr-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto Calculated Preview Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50/30">
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-extrabold">Auto calculated Qty</div>
                    <div className="text-sm font-mono font-black text-emerald-900 mt-1">
                      {autoQty > 0 ? "+" : ""}
                      {autoQty.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-extrabold">Auto calculated Amount</div>
                    <div className="text-sm font-mono font-black text-emerald-900 mt-1">
                      ₹{autoAmount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-indigo-800 uppercase font-extrabold">Pur Rate Effected Amount</div>
                    <div className="text-sm font-mono font-black text-indigo-950 mt-1">
                      ₹{purRateEffectedAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Description / Narration
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter additional notes or descriptions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="px-3 py-1.5 w-full text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-md text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center min-w-[100px]"
                  >
                    {isSaving ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
