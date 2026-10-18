/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Client, AolBranchName, Product, AolGodown, PidRecord, AccountsSalesRecord, Role, AccessLevel } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, ShoppingBag, Receipt, Building2, Package, Layers, TrendingUp, DollarSign, AlertCircle, CheckCircle2, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface AccountsSalesSubViewProps {
  activeUserId: string;
  users: User[];
  clients?: Client[];
  accountsSales?: AccountsSalesRecord[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  products?: Product[];
  pids?: PidRecord[];
  onAddAccountsSales: (record: Omit<AccountsSalesRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsSales: (record: AccountsSalesRecord) => Promise<void> | void;
  onDeleteAccountsSales: (id: string) => Promise<void> | void;
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

export default function AccountsSalesSubView({
  activeUserId,
  users,
  clients = [],
  accountsSales = [],
  aolBranches = [],
  aolGodowns = [],
  products = [],
  pids = [],
  onAddAccountsSales,
  onUpdateAccountsSales,
  onDeleteAccountsSales,
  canAdd = true,
  canEdit = true,
}: AccountsSalesSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || {
    id: activeUserId,
    name: "User",
    accessLevel: AccessLevel.Editor,
    role: Role.User,
    teamName: "",
  };

  const clientCompanies = Array.from(
    new Set(
      clients
        .map((c) => c.companyName || c.fullName)
        .filter((name): name is string => Boolean(name && name.trim()))
    )
  ).sort();

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
    "accounts_sales_apps_script",
    "Accounts Sales",
    "accounts_sales"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGodown, setFilterGodown] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "invoice">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountsSalesRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AccountsSalesRecord | null>(null);

  // Form states
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGodown, setSelectedGodown] = useState(aolGodowns[0]?.name || "");
  const [aolBranchName, setAolBranchName] = useState("");
  const [selectedPidKey, setSelectedPidKey] = useState("");
  
  const [spName, setSpName] = useState("");
  const [partyName, setPartyName] = useState("");
  const [isCustomParty, setIsCustomParty] = useState(false);
  const [saleInvoiceNo, setSaleInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [productName, setProductName] = useState(products[0]?.name || "");
  const [salesQty, setSalesQty] = useState("");
  const [rate, setRate] = useState("");

  // Auto-populated fields from PID
  const [beNoOrPurchaseNo, setBeNoOrPurchaseNo] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [purRate, setPurRate] = useState<number>(0);
  const [originCode, setOriginCode] = useState("");
  const [pidClosingStock, setPidClosingStock] = useState<number>(0);

  // Provisions
  const [freightProvision, setFreightProvision] = useState("");
  const [provisionLoadingUnloading, setProvisionLoadingUnloading] = useState("");
  const [freightInBill, setFreightInBill] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter available PIDs (closing stock > 0 OR currently selected in edit)
  const godownFilteredPids = selectedGodown
    ? pids.filter(
        (p) =>
          (!p.aolGodown || p.aolGodown.toLowerCase() === selectedGodown.toLowerCase()) &&
          ((p.closingStock || 0) > 0 || (editingRecord && p.id === editingRecord.sourcePidId))
      )
    : pids.filter((p) => (p.closingStock || 0) > 0 || (editingRecord && p.id === editingRecord.sourcePidId));

  // Handle Godown Change -> Auto set Branch Name
  const handleGodownChange = (godownName: string) => {
    setSelectedGodown(godownName);
    const found = aolGodowns.find((g) => g.name === godownName);
    if (found) {
      setAolBranchName(found.branchName || "");
    } else {
      // search in pids
      const pidGodown = pids.find((p) => p.aolGodown === godownName);
      if (pidGodown) setAolBranchName(pidGodown.aolBranchName || "");
    }
    // reset selected PID if no longer matches
    setSelectedPidKey("");
    setBeNoOrPurchaseNo("");
    setContainerNo("");
    setPurRate(0);
    setOriginCode("");
    setPidClosingStock(0);
  };

  // Handle PID Selection
  const handlePidSelect = (pidId: string) => {
    setSelectedPidKey(pidId);
    setFormError(null);
    const pid = pids.find((p) => p.id === pidId);
    if (pid) {
      if (pid.aolGodown) {
        setSelectedGodown(pid.aolGodown);
        setAolBranchName(pid.aolBranchName || "");
      }
      setBeNoOrPurchaseNo(pid.purchaseBeOrNo || "");
      setContainerNo(pid.containerNo || "");
      setPurRate(pid.purchaseRate || 0);
      setOriginCode(pid.originCode || pid.id);
      setPidClosingStock(pid.closingStock || 0);

      // Auto set product name if available and not yet set
      if (pid.productName) {
        setProductName(pid.productName);
      }
    }
  };

  // Live calculations (Taxable Value, Gross Profit / GP, Margins)
  const qtyNum = parseFloat(salesQty) || 0;
  const rateNum = parseFloat(rate) || 0;
  const taxableValue = qtyNum * rateNum;
  const gpPerKg = purRate > 0 || rateNum > 0 ? rateNum - purRate : 0;
  const totalGp = (rateNum - purRate) * qtyNum;
  const gpMarginPercent = taxableValue > 0 ? (totalGp / taxableValue) * 100 : 0;

  const selectedPidObj = pids.find((p) => p.id === selectedPidKey);
  const currentAvailableStock = selectedPidObj ? (selectedPidObj.closingStock || 0) : 0;
  const maxAllowedStock =
    editingRecord && editingRecord.sourcePidId === selectedPidKey
      ? currentAvailableStock + (editingRecord.salesQty || 0)
      : currentAvailableStock;

  const isQtyExceeding = Boolean(selectedPidKey && qtyNum > maxAllowedStock);

  // Reset form
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormError(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    
    const initGodown = aolGodowns[0]?.name || "";
    setSelectedGodown(initGodown);
    const foundGodown = aolGodowns.find((g) => g.name === initGodown);
    setAolBranchName(foundGodown?.branchName || "");

    setSelectedPidKey("");
    setSpName(activeUser.name || "");
    setPartyName("");
    setIsCustomParty(false);
    setSaleInvoiceNo("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setProductName(products[0]?.name || "");
    setSalesQty("");
    setRate("");

    setBeNoOrPurchaseNo("");
    setContainerNo("");
    setPurRate(0);
    setOriginCode("");
    setPidClosingStock(0);

    setFreightProvision("");
    setProvisionLoadingUnloading("");
    setFreightInBill("");

    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (record: AccountsSalesRecord) => {
    setEditingRecord(record);
    setFormError(null);
    setEntryDate(record.entryDate || new Date().toISOString().split("T")[0]);
    setSelectedGodown(record.aolGodown || "");
    setAolBranchName(record.aolBranchName || "");
    setSelectedPidKey(record.sourcePidId || "");

    setSpName(record.spName || "");
    const recParty = record.partyName || "";
    setPartyName(recParty);
    const isInDb = clientCompanies.includes(recParty);
    setIsCustomParty(!isInDb && Boolean(recParty));

    setSaleInvoiceNo(record.saleInvoiceNo || "");
    setInvoiceDate(record.invoiceDate || new Date().toISOString().split("T")[0]);
    setProductName(record.productName || "");
    setSalesQty(record.salesQty ? String(record.salesQty) : "");
    setRate(record.rate ? String(record.rate) : "");

    setBeNoOrPurchaseNo(record.beNoOrPurchaseNo || "");
    setContainerNo(record.containerNo || "");
    setPurRate(record.purRate || 0);
    setOriginCode(record.originCode || "");

    const pidObj = pids.find((p) => p.id === record.sourcePidId);
    setPidClosingStock(pidObj ? pidObj.closingStock : 0);

    setFreightProvision(record.freightProvision ? String(record.freightProvision) : "");
    setProvisionLoadingUnloading(record.provisionLoadingUnloading ? String(record.provisionLoadingUnloading) : "");
    setFreightInBill(record.freightInBill ? String(record.freightInBill) : "");

    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedGodown) {
      setFormError("Please select an AOL Godown.");
      return;
    }
    if (!selectedPidKey) {
      setFormError("Please select a valid PID Key from the list.");
      return;
    }
    if (!saleInvoiceNo.trim()) {
      setFormError("Please enter Sale Invoice No.");
      return;
    }
    if (!productName.trim()) {
      setFormError("Please select or enter Product Name.");
      return;
    }
    if (qtyNum <= 0) {
      setFormError("Sales Qty (Kg) must be greater than 0.");
      return;
    }

    // 1. Duplication Check: Combination ("Sale Invoice No", "Product Name", and PID Key) should not be same
    const isDuplicate = accountsSales.some((rec) => {
      if (editingRecord && rec.id === editingRecord.id) return false;
      return (
        rec.saleInvoiceNo.trim().toLowerCase() === saleInvoiceNo.trim().toLowerCase() &&
        rec.productName.trim().toLowerCase() === productName.trim().toLowerCase() &&
        rec.sourcePidId === selectedPidKey
      );
    });

    if (isDuplicate) {
      setFormError(
        `Duplicate Entry! A sales record with Sale Invoice No "${saleInvoiceNo.trim()}", Product "${productName.trim()}", and the selected PID Key already exists.`
      );
      return;
    }

    // 2. Stock Limit Check: Sales Qty should not exceed available closing stock in PID
    const pidObj = pids.find((p) => p.id === selectedPidKey);
    const availableStock = pidObj ? (pidObj.closingStock || 0) : 0;
    const maxAllowedStock =
      editingRecord && editingRecord.sourcePidId === selectedPidKey
        ? availableStock + (editingRecord.salesQty || 0)
        : availableStock;

    if (qtyNum > maxAllowedStock) {
      setFormError(
        `Sales Qty (${qtyNum.toLocaleString()} Kg) exceeds available Closing Stock in PID (${maxAllowedStock.toLocaleString()} Kg).`
      );
      return;
    }

    // Prepare PID key display string
    const pidDisplayStr = pidObj
      ? `${pidObj.purchaseBeOrNo || "No-BE"} | ${pidObj.containerNo || "No-Cont"} | ${formatDateDdMmmYy(
          pidObj.beOrPurchaseDate || pidObj.date
        )} | Avail: ${maxAllowedStock.toLocaleString()} Kg`
      : selectedPidKey;

    const recordData: Omit<AccountsSalesRecord, "id" | "createdAt"> = {
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
      entryDate,
      aolGodown: selectedGodown,
      aolBranchName,
      sourcePidId: selectedPidKey,
      pidKeyDisplay: pidDisplayStr,
      spName: spName.trim() || activeUser.name,
      partyName: partyName.trim(),
      saleInvoiceNo: saleInvoiceNo.trim(),
      invoiceDate,
      productName: productName.trim(),
      salesQty: qtyNum,
      rate: rateNum,
      taxableValue,
      gp: totalGp,
      beNoOrPurchaseNo,
      containerNo,
      purRate,
      originCode,
      freightProvision: parseFloat(freightProvision) || 0,
      provisionLoadingUnloading: parseFloat(provisionLoadingUnloading) || 0,
      freightInBill: parseFloat(freightInBill) || 0,
    };

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await onUpdateAccountsSales({
          ...editingRecord,
          ...recordData,
        });
      } else {
        await onAddAccountsSales(recordData);
      }
      setIsCreateModalOpen(false);
      setEditingRecord(null);
    } catch (err) {
      console.error("Failed to save Sales record:", err);
      setFormError("An error occurred while saving the sales record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Sales record? This will release the Sales Qty back to the PID closing stock.")) {
      try {
        await onDeleteAccountsSales(id);
      } catch (err) {
        console.error("Failed to delete sales record:", err);
      }
    }
  };

  // Filtered sales records for table
  const filteredSales = accountsSales.filter((rec) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (rec.saleInvoiceNo || "").toLowerCase().includes(q) ||
      (rec.partyName || "").toLowerCase().includes(q) ||
      (rec.spName || "").toLowerCase().includes(q) ||
      (rec.productName || "").toLowerCase().includes(q) ||
      (rec.beNoOrPurchaseNo || "").toLowerCase().includes(q) ||
      (rec.containerNo || "").toLowerCase().includes(q) ||
      (rec.aolGodown || "").toLowerCase().includes(q);

    const matchGodown = filterGodown === "all" || rec.aolGodown === filterGodown;

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? rec.entryDate : rec.invoiceDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchSearch && matchGodown && matchesDate;
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

  // Calculate summary stats
  const totalInvoices = accountsSales.length;
  const totalSalesQty = filteredSales.reduce((sum, item) => sum + (item.salesQty || 0), 0);
  const totalTaxableValue = filteredSales.reduce((sum, item) => sum + (item.taxableValue || 0), 0);
  const totalFreightInBill = filteredSales.reduce((sum, item) => sum + (item.freightInBill || 0), 0);
  const avgSalesRate = totalSalesQty > 0 ? totalTaxableValue / totalSalesQty : 0;
  const totalFreightProv = filteredSales.reduce((s, r) => s + (r.freightProvision || 0), 0);
  const totalLoadingUnloading = filteredSales.reduce((s, r) => s + (r.provisionLoadingUnloading || 0), 0);
  const uniqueInvoices = Array.from(new Set(filteredSales.map((r) => r.saleInvoiceNo).filter(Boolean))).length;
  const uniqueGodowns = Array.from(new Set(filteredSales.map((r) => r.aolGodown).filter(Boolean))).length;
  const uniqueBranches = Array.from(new Set(filteredSales.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueParties = Array.from(new Set(filteredSales.map((r) => r.partyName).filter(Boolean))).length;
  const uniqueSPs = Array.from(new Set(filteredSales.map((r) => r.spName).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredSales.map((r) => r.productName).filter(Boolean))).length;
  const totalPurRateSum = filteredSales.reduce((s, r) => s + (r.purRate || 0), 0);
  const avgPurRate = filteredSales.length > 0 ? totalPurRateSum / filteredSales.length : 0;

  return (
    <div id="accounts-sales-subview-root" className="flex flex-col gap-5">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="accounts_sales_apps_script"
        defaultSheetName="Accounts Sales"
        collectionKey="accounts_sales"
        records={accountsSales}
        activeUser={activeUser}
        moduleTitle="Accounts Sales Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = accountsSales.find((s) => s.id === rec.id);
            if (existing) {
              onUpdateAccountsSales({ ...existing, ...rec });
            } else {
              onAddAccountsSales(rec);
            }
          });
        }}
      />

      {/* Top Banner & Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Entries</p>
            <p className="text-lg font-bold text-slate-900">{totalInvoices}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Qty</p>
            <p className="text-lg font-bold text-emerald-800">{totalSalesQty.toLocaleString()} <span className="text-xs font-semibold text-slate-500">Kg</span></p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Taxable Value</p>
            <p className="text-lg font-bold text-amber-900">₹{totalTaxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Freight in Bill</p>
            <p className="text-lg font-bold text-purple-900">₹{totalFreightInBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Control & Filter Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Invoice No, Party Name, SP Name, Product, BE No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={filterGodown}
              onChange={(e) => setFilterGodown(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Godowns</option>
              {aolGodowns.map((g) => (
                <option key={g.id || g.name} value={g.name}>{g.name}</option>
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
                { label: "Invoice Date", value: "invoice" },
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

          {isAddable && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition shadow-xs cursor-pointer shrink-0"
            >
              <Plus size={15} />
              Add Sales Entry
            </button>
          )}
        </div>

        {isFiltered && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 rounded-lg text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-500" />
              <span>
                Filtered results: <strong>{filteredSales.length}</strong> of {totalInvoices} records
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono">
                Filtered Qty: <strong className="text-slate-900 font-bold">{totalSalesQty.toLocaleString()} Kg</strong>
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

      {/* Sales Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3.5 w-24">Entry Date</th>
                <th className="px-4 py-3.5 w-32">Sale Invoice No</th>
                <th className="px-4 py-3.5 w-28">Invoice Date</th>
                <th className="px-4 py-3.5 w-36">AOL Godown</th>
                <th className="px-4 py-3.5 w-32">AOL Branch</th>
                <th className="px-4 py-3.5 w-44">Party Name</th>
                <th className="px-4 py-3.5 w-36">SP Name</th>
                <th className="px-4 py-3.5 w-44">Product Name</th>
                <th className="px-4 py-3.5 w-28 text-right">Sales Qty (Kg)</th>
                <th className="px-4 py-3.5 w-28 text-right">Rate (₹)</th>
                <th className="px-4 py-3.5 w-32 text-right">Taxable Value (₹)</th>
                <th className="px-4 py-3.5 w-40">BE No / Purchase No</th>
                <th className="px-4 py-3.5 w-32">Container No</th>
                <th className="px-4 py-3.5 w-28 text-right">Pur Rate (₹)</th>
                <th className="px-4 py-3.5 w-32">Origin Code</th>
                <th className="px-4 py-3.5 w-32 text-right">Freight Provision</th>
                <th className="px-4 py-3.5 w-36 text-right">Loading / Unloading</th>
                <th className="px-4 py-3.5 w-32 text-right">Freight in Bill</th>
                <th className="px-4 py-3.5 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={19} className="px-4 py-12 text-center text-slate-400 font-medium">
                    No sales entries found. Click <span className="font-bold text-slate-700">"Add Sales Entry"</span> to create one.
                  </td>
                </tr>
              ) : (
                filteredSales.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {formatDateDdMmmYy(rec.entryDate)}
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-950 whitespace-nowrap">
                      {rec.saleInvoiceNo || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateDdMmmYy(rec.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {rec.aolGodown || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {rec.aolBranchName || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate" title={rec.partyName}>
                      {rec.partyName || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                      {rec.spName || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-900 whitespace-nowrap">
                      {rec.productName || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {rec.salesQty ? rec.salesQty.toLocaleString() : "0"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      ₹{rec.rate ? rec.rate.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{rec.taxableValue ? rec.taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {rec.beNoOrPurchaseNo || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {rec.containerNo || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ₹{rec.purRate ? rec.purRate.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                      {rec.originCode || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ₹{rec.freightProvision ? rec.freightProvision.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ₹{rec.provisionLoadingUnloading ? rec.provisionLoadingUnloading.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-900 whitespace-nowrap">
                      ₹{rec.freightInBill ? rec.freightInBill.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          title="View Details"
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        {isEditable && (
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit"
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isDeletable && (
                          <button
                            onClick={() => handleDelete(rec.id)}
                            title="Delete"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredSales.length} {filteredSales.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-slate-300 block">{uniqueInvoices} Invoices</span>
                  </td>
                  <td className="py-3.5 px-4">—</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-slate-300 block">{uniqueGodowns} Godowns</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-slate-300 block">{uniqueBranches} Branches</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-slate-300 block">{uniqueParties} Parties</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-slate-300 block">{uniqueSPs} SPs</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400">
                    {totalSalesQty.toLocaleString("en-IN")} Kg
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    Avg: ₹{avgSalesRate.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400">
                    ₹{totalTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">—</td>
                  <td className="py-3.5 px-4">—</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    Avg: ₹{avgPurRate.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">—</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                    ₹{totalFreightProv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">
                    ₹{totalLoadingUnloading.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-300">
                    ₹{totalFreightInBill.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingRecord ? "Edit Sales Entry" : "Create New Sales Entry"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Record sale details linked to PID inventory stock.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="m-4 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* SECTION 1: Entry Date & Godown & PID Key Cascading Selection */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} className="text-indigo-600" />
                  1. Godown & PID Key Selection
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Entry Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Entry Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={entryDate}
                      readOnly
                      disabled
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-mono font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* AOL Godown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      AOL Godown <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedGodown}
                      onChange={(e) => handleGodownChange(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select AOL Godown...</option>
                      {aolGodowns.map((g) => (
                        <option key={g.id || g.name} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* AOL Branch Name (Auto-displayed) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      AOL Branch Name
                    </label>
                    <input
                      type="text"
                      value={aolBranchName}
                      readOnly
                      placeholder="Auto-filled..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* BE | CN | Date | Qty List Cascading Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      PID Key ("BE | CN | Date | Qty List") <span className="text-rose-500">*</span>
                    </label>
                    {pidClosingStock > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Available Stock: {pidClosingStock.toLocaleString()} Kg
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedPidKey}
                    onChange={(e) => handlePidSelect(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-slate-800"
                  >
                    <option value="">-- Select PID Key (BE | Container | Date | Available Stock) --</option>
                    {godownFilteredPids.map((pid) => (
                      <option key={pid.id} value={pid.id}>
                        {pid.purchaseBeOrNo || "No-BE"} | {pid.containerNo || "No-Cont"} | {formatDateDdMmmYy(pid.beOrPurchaseDate || pid.date)} | Avail: {(pid.closingStock || 0).toLocaleString()} Kg ({pid.productName || "Item"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-populated PID Read-only Summary */}
                {selectedPidKey && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600">
                    <div>
                      <span className="text-slate-400">BE/Pur Bill:</span>{" "}
                      <strong className="text-slate-800">{beNoOrPurchaseNo || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Container:</span>{" "}
                      <strong className="text-slate-800">{containerNo || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Pur Rate:</span>{" "}
                      <strong className="text-emerald-700">₹{purRate.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Origin Code:</span>{" "}
                      <strong className="text-slate-800">{originCode || "—"}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Sales & Invoice Details */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={13} className="text-indigo-600" />
                  2. Sales Invoice Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* SP Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SP Name (Sales Person) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={spName}
                      onChange={(e) => setSpName(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Sales Person...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* Party Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Party Name (Customer) <span className="text-rose-500">*</span>
                      </label>
                      {clientCompanies.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Client DB ({clientCompanies.length})
                        </span>
                      )}
                    </div>

                    {clientCompanies.length > 0 && !isCustomParty ? (
                      <div className="space-y-1">
                        <select
                          value={partyName}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__custom__") {
                              setPartyName("");
                              setIsCustomParty(true);
                            } else {
                              setPartyName(val);
                            }
                          }}
                          required
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900"
                        >
                          <option value="">-- Select Client from Database --</option>
                          {clientCompanies.map((comp) => (
                            <option key={comp} value={comp}>
                              {comp}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom Party Name...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="e.g. Acme Chemicals Pvt Ltd"
                          value={partyName}
                          onChange={(e) => setPartyName(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        />
                        {clientCompanies.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomParty(false);
                              setPartyName("");
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                          >
                            ← Back to Client Database Dropdown
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sale Invoice No */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sale Invoice No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SAL-2026-001"
                      value={saleInvoiceNo}
                      onChange={(e) => {
                        setSaleInvoiceNo(e.target.value);
                        setFormError(null);
                      }}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                    />
                  </div>

                  {/* Invoice Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Invoice Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={productName}
                      onChange={(e) => {
                        setProductName(e.target.value);
                        setFormError(null);
                      }}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sales Qty */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Sales Qty (Kg) <span className="text-rose-500">*</span>
                      </label>
                      {selectedPidKey && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isQtyExceeding
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          Max Avail: {maxAllowedStock.toLocaleString()} Kg
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={salesQty}
                        onChange={(e) => {
                          setSalesQty(e.target.value);
                          setFormError(null);
                        }}
                        required
                        className={`w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none transition-all font-bold ${
                          isQtyExceeding
                            ? "bg-rose-50 border-2 border-rose-500 text-rose-900 focus:ring-2 focus:ring-rose-500/20"
                            : "bg-white border border-slate-200 text-emerald-800 focus:ring-2 focus:ring-indigo-500/20"
                        }`}
                      />
                    </div>
                    {isQtyExceeding && (
                      <div className="mt-1 flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          Exceeds available stock ({maxAllowedStock.toLocaleString()} Kg)!
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSalesQty(String(maxAllowedStock));
                            setFormError(null);
                          }}
                          className="self-start text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 px-2 py-0.5 rounded border border-rose-300 transition cursor-pointer"
                        >
                          Set to Max ({maxAllowedStock.toLocaleString()} Kg)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sale Rate (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-900"
                    />
                  </div>

                  {/* Taxable Value (Auto Calculated) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Taxable Value (₹)
                    </label>
                    <input
                      type="text"
                      value={`₹${taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      readOnly
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-bold cursor-not-allowed"
                    />
                  </div>

                  {/* Gross Profit / GP (Auto Calculated) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Gross Profit / GP (₹)
                    </label>
                    <div
                      className={`w-full px-3 py-1.5 text-xs border rounded-lg font-bold flex items-center justify-between ${
                        totalGp > 0
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-800"
                          : totalGp < 0
                          ? "bg-rose-50/70 border-rose-300 text-rose-800"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>₹{totalGp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] font-semibold opacity-80">
                        {gpPerKg >= 0 ? `+₹${gpPerKg.toFixed(2)}/Kg` : `-₹${Math.abs(gpPerKg).toFixed(2)}/Kg`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Profitability & GP Highlight Card */}
                <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500/30 text-indigo-300 rounded-lg shrink-0">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Live Financial & Profitability Summary
                      </span>
                      <div className="text-[11px] text-slate-300 font-medium">
                        Sale Rate: <strong className="text-white">₹{rateNum.toFixed(2)}</strong> | Pur Rate: <strong className="text-amber-300">₹{purRate.toFixed(2)}</strong> | Qty: <strong className="text-white">{qtyNum.toLocaleString()} Kg</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Taxable Value</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-slate-700" />

                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Gross Profit (GP)</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          totalGp >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        ₹{totalGp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {taxableValue > 0 && (
                      <div className="hidden sm:block">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Margin</span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            gpMarginPercent >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {gpMarginPercent.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Freight & Provision Inputs */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={13} className="text-indigo-600" />
                  3. Freight & Expense Provisions
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Freight Provision */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Freight Provision (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={freightProvision}
                      onChange={(e) => setFreightProvision(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Provision Loading / Unloading */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Provision Loading / Unloading (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={provisionLoadingUnloading}
                      onChange={(e) => setProvisionLoadingUnloading(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Freight in Bill */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Freight in Bill (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={freightInBill}
                      onChange={(e) => setFreightInBill(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingRecord ? "Update Sales Entry" : "Save Sales Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Receipt size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sales Entry Details: {viewingRecord.saleInvoiceNo}
                </h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Entry Date:</span>
                  <strong className="text-slate-900">{formatDateDdMmmYy(viewingRecord.entryDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoice Date:</span>
                  <strong className="text-slate-900">{formatDateDdMmmYy(viewingRecord.invoiceDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AOL Godown:</span>
                  <strong className="text-slate-900">{viewingRecord.aolGodown}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AOL Branch:</span>
                  <strong className="text-slate-900">{viewingRecord.aolBranchName}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Party Name:</span>
                  <strong className="text-slate-900">{viewingRecord.partyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sales Person (SP):</span>
                  <strong className="text-slate-900">{viewingRecord.spName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Product Name:</span>
                  <strong className="text-indigo-900 font-bold">{viewingRecord.productName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sales Qty:</span>
                  <strong className="text-emerald-700 font-bold">{viewingRecord.salesQty.toLocaleString()} Kg</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Sale Rate:</span>
                  <strong className="text-slate-900">₹{viewingRecord.rate.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Taxable Value:</span>
                  <strong className="text-slate-900 font-bold">₹{viewingRecord.taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Profit (GP):</span>
                  {(() => {
                    const recGp = viewingRecord.gp !== undefined ? viewingRecord.gp : ((viewingRecord.rate || 0) - (viewingRecord.purRate || 0)) * (viewingRecord.salesQty || 0);
                    return (
                      <strong className={`font-bold ${recGp >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        ₹{recGp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <div>
                  <span className="text-slate-500 block text-[10px]">Source BE / Purchase No:</span>
                  <strong className="text-slate-900">{viewingRecord.beNoOrPurchaseNo || "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Container No:</span>
                  <strong className="text-slate-900">{viewingRecord.containerNo || "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Purchase Rate:</span>
                  <strong className="text-slate-900">₹{viewingRecord.purRate.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Origin Code:</span>
                  <strong className="text-slate-900">{viewingRecord.originCode || "—"}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Freight Provision:</span>
                  <strong>₹{viewingRecord.freightProvision.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Loading/Unloading:</span>
                  <strong>₹{viewingRecord.provisionLoadingUnloading.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Freight in Bill:</span>
                  <strong className="text-purple-900">₹{viewingRecord.freightInBill.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
