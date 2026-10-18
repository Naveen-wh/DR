/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, AolBranchName, SupplierName, Product, Client, AolGodown, DomesticSupplierName, ShipToParty, DomesticPdRecord } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Check, Building2, Truck, Receipt, Package, DollarSign, TrendingUp, Filter, RotateCcw, AlertTriangle, Layers, Calendar } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface DomesticPdSubViewProps {
  activeUserId: string;
  users: User[];
  domesticPds?: DomesticPdRecord[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  domesticSuppliers?: DomesticSupplierName[];
  shipToParties?: ShipToParty[];
  clients?: Client[];
  products?: Product[];
  onAddDomesticPd: (record: Omit<DomesticPdRecord, "id" | "createdAt">) => void;
  onUpdateDomesticPd: (record: DomesticPdRecord) => void;
  onDeleteDomesticPd: (id: string) => void;
  onAddAolGodown?: (data: Omit<AolGodown, "id" | "createdAt">) => void;
  onAddDomesticSupplier?: (data: Omit<DomesticSupplierName, "id" | "createdAt">) => void;
  onAddShipToParty?: (data: Omit<ShipToParty, "id" | "createdAt">) => void;
  onAddClient?: (data: Omit<Client, "id" | "createdAt">) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function DomesticPdSubView({
  activeUserId,
  users,
  domesticPds = [],
  aolBranches = [],
  aolGodowns = [],
  domesticSuppliers = [],
  shipToParties = [],
  clients = [],
  products = [],
  onAddDomesticPd,
  onUpdateDomesticPd,
  onDeleteDomesticPd,
  onAddAolGodown,
  onAddDomesticSupplier,
  onAddShipToParty,
  onAddClient,
  canAdd = true,
  canEdit = true,
}: DomesticPdSubViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "invoice">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DomesticPdRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DomesticPdRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DomesticPdRecord | null>(null);

  // Google Sheets Apps Script Integration
  const activeUser = users.find((u) => u.id === activeUserId);
  const { config, syncStatus, setSyncStatus } = useAppsScriptSync(
    "domestic_pds_apps_script",
    "Domestic PDs",
    "domestic_pds"
  );

  // Form states
  const [newBranch, setNewBranch] = useState(aolBranches[0]?.name || "");
  const [newGodown, setNewGodown] = useState(aolGodowns[0]?.name || "");
  const [newSupplier, setNewSupplier] = useState(domesticSuppliers[0]?.name || "");
  const [newBillToParty, setNewBillToParty] = useState(clients[0]?.companyName || clients[0]?.fullName || "");
  const [newShipToParty, setNewShipToParty] = useState(shipToParties[0]?.name || "");
  const [newOriginalBillNo, setNewOriginalBillNo] = useState("");
  const [newOriginalInvoiceDate, setNewOriginalInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [newProductName, setNewProductName] = useState(products[0]?.name || "");
  const [newTankerVehicleNo, setNewTankerVehicleNo] = useState("");
  const [newPurchaseQty, setNewPurchaseQty] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newFreightInBill, setNewFreightInBill] = useState("");
  const [newEntryDate] = useState(new Date().toISOString().split("T")[0]);

  // Quick add states for dropdown modals
  const [quickAddType, setQuickAddType] = useState<"godown" | "supplier" | "shipto" | "billto" | null>(null);
  const [quickAddValue, setQuickAddValue] = useState("");

  const handleOpenCreate = () => {
    setNewBranch(aolBranches[0]?.name || "");
    setNewGodown(aolGodowns[0]?.name || "");
    setNewSupplier(domesticSuppliers[0]?.name || "");
    setNewBillToParty(clients[0]?.companyName || clients[0]?.fullName || "");
    setNewShipToParty(shipToParties[0]?.name || "");
    setNewOriginalBillNo("");
    setNewOriginalInvoiceDate(new Date().toISOString().split("T")[0]);
    setNewProductName(products[0]?.name || "");
    setNewTankerVehicleNo("");
    setNewPurchaseQty("");
    setNewRate("");
    setNewFreightInBill("");
    setIsCreateModalOpen(true);
  };

  const calculateDerivedValues = (qty: number, rate: number, freight: number, origBill: string) => {
    const amount = qty * rate;
    const totalPurchaseCost = amount + freight;
    const purchaseRate = qty > 0 ? totalPurchaseCost / qty : 0;
    const purchaseBillNo = origBill;
    return {
      amount: Number(amount.toFixed(2)),
      totalPurchaseCost: Number(totalPurchaseCost.toFixed(2)),
      purchaseRate: Number(purchaseRate.toFixed(2)),
      purchaseBillNo,
    };
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch || !newProductName) {
      alert("Please fill in AOL Branch Name and Product Name.");
      return;
    }

    const qty = Number(newPurchaseQty) || 0;
    const rate = Number(newRate) || 0;
    const freight = Number(newFreightInBill) || 0;
    const derived = calculateDerivedValues(qty, rate, freight, newOriginalBillNo);

    onAddDomesticPd({
      aolBranchName: newBranch,
      aolGodown: newGodown,
      supplierName: newSupplier,
      billToPartyName: newBillToParty,
      shipToPartyName: newShipToParty,
      originalPurchaseBillNo: newOriginalBillNo,
      originalInvoiceDate: newOriginalInvoiceDate,
      productName: newProductName,
      tankerOrVehicleNo: newTankerVehicleNo,
      purchaseQty: qty,
      rate: rate,
      amount: derived.amount,
      freightInBill: freight,
      totalPurchaseCost: derived.totalPurchaseCost,
      purchaseRate: derived.purchaseRate,
      purchaseDomestic: "Domestic",
      purchaseBillNo: derived.purchaseBillNo,
      entryDate: newEntryDate,
    });
    setIsCreateModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const qty = editingRecord.purchaseQty || 0;
    const rate = editingRecord.rate || 0;
    const freight = editingRecord.freightInBill || 0;
    const derived = calculateDerivedValues(qty, rate, freight, editingRecord.originalPurchaseBillNo);

    const updated: DomesticPdRecord = {
      ...editingRecord,
      amount: derived.amount,
      totalPurchaseCost: derived.totalPurchaseCost,
      purchaseRate: derived.purchaseRate,
      purchaseDomestic: "Domestic",
      purchaseBillNo: derived.purchaseBillNo,
    };

    onUpdateDomesticPd(updated);
    setEditingRecord(null);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;

    const nameVal = quickAddValue.trim();

    if (quickAddType === "godown" && onAddAolGodown) {
      onAddAolGodown({ name: nameVal });
      if (editingRecord) {
        setEditingRecord({ ...editingRecord, aolGodown: nameVal });
      } else {
        setNewGodown(nameVal);
      }
    } else if (quickAddType === "supplier" && onAddDomesticSupplier) {
      onAddDomesticSupplier({ name: nameVal });
      if (editingRecord) {
        setEditingRecord({ ...editingRecord, supplierName: nameVal });
      } else {
        setNewSupplier(nameVal);
      }
    } else if (quickAddType === "shipto" && onAddShipToParty) {
      onAddShipToParty({ name: nameVal });
      if (editingRecord) {
        setEditingRecord({ ...editingRecord, shipToPartyName: nameVal });
      } else {
        setNewShipToParty(nameVal);
      }
    } else if (quickAddType === "billto" && onAddClient) {
      onAddClient({
        companyName: nameVal,
        fullName: nameVal,
        email: "",
        phone: "",
        gst: "",
        city: "",
        pincode: "",
        address: "",
      });
      if (editingRecord) {
        setEditingRecord({ ...editingRecord, billToPartyName: nameVal });
      } else {
        setNewBillToParty(nameVal);
      }
    }
    setQuickAddType(null);
    setQuickAddValue("");
  };

  const filteredRecords = domesticPds.filter((rec) => {
    const matchesSearch =
      rec.originalPurchaseBillNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.tankerOrVehicleNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.aolGodown?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.shipToPartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.purchaseBillNo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;
    const matchesProduct = filterProduct === "all" || rec.productName === filterProduct;

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? rec.entryDate : rec.originalInvoiceDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesBranch && matchesProduct && matchesDate;
  });

  // Calculate totals dynamically from filtered records
  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterBranch !== "all" || filterProduct !== "all" || startDate !== "" || endDate !== ""
  );
  const totalEntries = filteredRecords.length;
  const overallEntries = domesticPds.length;
  const totalPurchaseQty = filteredRecords.reduce((sum, rec) => sum + (Number(rec.purchaseQty) || 0), 0);
  const totalAmount = filteredRecords.reduce((sum, rec) => sum + (Number(rec.amount) || 0), 0);
  const totalFreight = filteredRecords.reduce((sum, rec) => sum + (Number(rec.freightInBill) || 0), 0);
  const totalPurchaseCost = filteredRecords.reduce((sum, rec) => sum + (Number(rec.totalPurchaseCost) || 0), 0);
  const avgRate = totalPurchaseQty > 0 ? totalAmount / totalPurchaseQty : 0;
  const avgPurchaseRate = totalPurchaseQty > 0 ? totalPurchaseCost / totalPurchaseQty : 0;

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setFilterProduct("all");
    setStartDate("");
    setEndDate("");
    setDateFilterType("entry");
    setIsDateRangeModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deletingRecord) {
      onDeleteDomesticPd(deletingRecord.id);
      setDeletingRecord(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="domestic_pds_apps_script"
        defaultSheetName="Domestic PDs"
        collectionKey="domestic_pds"
        records={domesticPds}
        activeUser={activeUser}
        moduleTitle="Domestic Purchase Details (PD) Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = domesticPds.find((p) => p.id === rec.id || (p.purchaseBillNo && p.purchaseBillNo === rec.purchaseBillNo));
            if (existing) {
              onUpdateDomesticPd({ ...existing, ...rec });
            } else {
              onAddDomesticPd(rec);
            }
          });
        }}
      />

      {/* Top Metrics & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Entries Count */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0">
            <Receipt size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered Entries" : "Total PD Entries"}
              </p>
              {isFiltered && (
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                  Filtered
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">
              {totalEntries.toLocaleString()}{" "}
              {isFiltered && (
                <span className="text-xs font-normal text-slate-400">/ {overallEntries}</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 2: Total Sum of Qty */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
            <Package size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered Sum of Qty" : "Total Purchase Qty"}
              </p>
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                Sum
              </span>
            </div>
            <p className="text-lg font-extrabold text-emerald-800 font-mono">
              {totalPurchaseQty.toLocaleString()}{" "}
              <span className="text-xs font-semibold text-emerald-600">Kg</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Basic Amount */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered Basic Amt" : "Total Basic Amount"}
              </p>
              <span className="text-[9px] font-bold font-mono text-amber-800">
                Avg: ₹{avgRate.toFixed(2)}
              </span>
            </div>
            <p className="text-lg font-bold text-amber-900 font-mono">
              ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Card 4: Total Landed Cost */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered Landed Cost" : "Total Landed Cost"}
              </p>
              <span className="text-[9px] font-bold font-mono text-purple-800">
                P.Rate: ₹{avgPurchaseRate.toFixed(2)}
              </span>
            </div>
            <p className="text-lg font-bold text-purple-900 font-mono">
              ₹{totalPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Top Toolbar & Filter Header */}
      <div className="flex flex-col gap-2.5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by Bill No, Product, Supplier, Godown, Vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Branches</option>
              {aolBranches.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>

            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            {/* Date Range Popup Trigger & Popover */}
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
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          {canAdd && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold tracking-wide shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus size={15} />
              Add PD Entry
            </button>
          )}
        </div>

        {/* Live Filter Indicator Bar */}
        {isFiltered && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <Filter size={13} className="text-emerald-700" />
              <span>
                Filtered results: <strong>{filteredRecords.length}</strong> of {overallEntries} records
              </span>
              <span className="text-emerald-400">•</span>
              <span className="font-mono">
                Filtered Sum of Qty: <strong className="text-emerald-800 font-bold">{totalPurchaseQty.toLocaleString()} Kg</strong>
              </span>
              <span className="text-emerald-400">•</span>
              <span className="font-mono">
                Filtered Total Cost: <strong className="text-emerald-800 font-bold">₹{totalPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 pl-4">Branch & Bill No</th>
                <th className="py-3 px-3">Product & Supplier</th>
                <th className="py-3 px-3">Godown & Ship To</th>
                <th className="py-3 px-3">Qty, Rate & Amount</th>
                <th className="py-3 px-3">Freight & Total Cost</th>
                <th className="py-3 px-3">Dates & Vehicle</th>
                <th className="py-3 px-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-mono">
                    {isFiltered
                      ? "No PD records match the selected filters or search query."
                      : 'No Purchase Domestic (PD) records found. Click "Add PD Entry" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 pl-4">
                      <span className="font-bold text-slate-900 block font-mono">{rec.purchaseBillNo || rec.originalPurchaseBillNo || "—"}</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">{rec.aolBranchName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{rec.productName}</span>
                      <span className="text-[11px] text-slate-500">{rec.supplierName || "—"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 block text-xs">{rec.aolGodown || "—"}</span>
                      <span className="text-[10px] text-slate-500 block">Ship To: {rec.shipToPartyName || "—"}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-slate-900 block">Qty: {rec.purchaseQty?.toLocaleString()} Kg</span>
                      <span className="text-[11px] text-slate-600">Rate: ₹{rec.rate?.toLocaleString()} | Amt: ₹{rec.amount?.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-slate-900 block">Total: ₹{rec.totalPurchaseCost?.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">Freight: ₹{rec.freightInBill?.toLocaleString()} | P.Rate: ₹{rec.purchaseRate}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs text-slate-800 block">Inv Dt: {rec.originalInvoiceDate || "—"}</span>
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">Veh: {rec.tankerOrVehicleNo || "—"}</span>
                    </td>
                    <td className="py-3 px-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setEditingRecord(rec)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setDeletingRecord(rec)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer with Dynamic Sum of Qty and Totals */}
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-3 pl-4">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">
                      {Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length} Products
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {Array.from(new Set(filteredRecords.map((r) => r.supplierName).filter(Boolean))).length} Suppliers
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-slate-300 block">
                      {Array.from(new Set(filteredRecords.map((r) => r.aolGodown).filter(Boolean))).length} Godowns
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      Total Qty: {totalPurchaseQty.toLocaleString()} Kg
                    </span>
                    <span className="text-[10px] text-slate-300 block mt-0.5">
                      Total Amt: ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="font-extrabold text-purple-300 block text-xs">
                      Total Cost: ₹{totalPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-300 block mt-0.5">
                      Freight: ₹{totalFreight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Avg Rate: ₹{avgRate.toFixed(2)}/Kg
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono block">
                      Avg P.Rate: ₹{avgPurchaseRate.toFixed(2)}/Kg
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right pr-4">
                    {/* Spacer */}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide">Add New Purchase Domestic (PD) Entry</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">AOL Branch Name *</label>
                  <select
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {aolBranches.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-600 uppercase">AOL Godown</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("godown")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline"
                    >
                      + Add New
                    </button>
                  </div>
                  <select
                    value={newGodown}
                    onChange={(e) => setNewGodown(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Godown</option>
                    {aolGodowns.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-600 uppercase">Supplier Name</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("supplier")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline"
                    >
                      + Add Supplier
                    </button>
                  </div>
                  <select
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Supplier</option>
                    {domesticSuppliers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-600 uppercase">Bill To Party Name</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("billto")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      + Add Bill To
                    </button>
                  </div>
                  <select
                    value={newBillToParty}
                    onChange={(e) => setNewBillToParty(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Bill To Party</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.companyName || c.fullName}>{c.companyName || c.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-600 uppercase">Ship To Party Name (GNFC Purchase)</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("shipto")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline"
                    >
                      + Add Ship To
                    </button>
                  </div>
                  <select
                    value={newShipToParty}
                    onChange={(e) => setNewShipToParty(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Ship To Party</option>
                    {shipToParties.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Original Purchase Bill No</label>
                  <input
                    type="text"
                    value={newOriginalBillNo}
                    onChange={(e) => setNewOriginalBillNo(e.target.value)}
                    placeholder="Original Bill No"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Original Invoice Date</label>
                  <input
                    type="date"
                    value={newOriginalInvoiceDate}
                    onChange={(e) => setNewOriginalInvoiceDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Product Name *</label>
                  <select
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Tanker or Vehicle No</label>
                  <input
                    type="text"
                    value={newTankerVehicleNo}
                    onChange={(e) => setNewTankerVehicleNo(e.target.value)}
                    placeholder="Vehicle No"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Purchase Qty (Kg)</label>
                  <input
                    type="number"
                    step="any"
                    value={newPurchaseQty}
                    onChange={(e) => setNewPurchaseQty(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Amount (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={`₹ ${((Number(newPurchaseQty) || 0) * (Number(newRate) || 0)).toLocaleString()}`}
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Freight In Bill (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={newFreightInBill}
                    onChange={(e) => setNewFreightInBill(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Entry Date (Auto)</label>
                  <input
                    type="date"
                    disabled
                    value={newEntryDate}
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-800 uppercase mb-1">Total Purchase Cost (Auto)</label>
                  <span className="text-sm font-extrabold text-emerald-900 font-mono block pt-1">
                    ₹ {(((Number(newPurchaseQty) || 0) * (Number(newRate) || 0)) + (Number(newFreightInBill) || 0)).toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-800 uppercase mb-1">Purchase Rate (Auto)</label>
                  <span className="text-sm font-extrabold text-emerald-900 font-mono block pt-1">
                    ₹ {Number(newPurchaseQty) > 0 ? ((((Number(newPurchaseQty) || 0) * (Number(newRate) || 0)) + (Number(newFreightInBill) || 0)) / Number(newPurchaseQty)).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-800 uppercase mb-1">Purchase Domestic / Bill No</label>
                  <span className="text-xs font-bold text-slate-800 font-mono block pt-1">
                    Domestic | Bill: {newOriginalBillNo || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Save PD Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL */}
      {quickAddType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <h4 className="font-bold text-xs tracking-wide uppercase">
                Add New {quickAddType === "godown" ? "AOL Godown" : quickAddType === "supplier" ? "Domestic Supplier" : quickAddType === "billto" ? "Bill To Party" : "Ship To Party"}
              </h4>
              <button onClick={() => setQuickAddType(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Name *</label>
                <input
                  type="text"
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  placeholder="Enter name..."
                  required
                  autoFocus
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAddType(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm tracking-wide">Purchase Domestic (PD) Record Details</h3>
              <button onClick={() => setViewingRecord(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">AOL Branch</span>
                  <span className="font-bold text-slate-900">{viewingRecord.aolBranchName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">AOL Godown</span>
                  <span className="font-bold text-slate-900">{viewingRecord.aolGodown || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Supplier Name</span>
                  <span className="font-bold text-slate-900">{viewingRecord.supplierName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Product Name</span>
                  <span className="font-bold text-slate-900">{viewingRecord.productName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Bill To Party Name</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.billToPartyName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Ship To Party Name</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.shipToPartyName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Tanker / Vehicle No</span>
                  <span className="font-mono font-semibold text-slate-800">{viewingRecord.tankerOrVehicleNo || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 font-mono">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Purchase Qty</span>
                  <span className="font-extrabold text-emerald-900 text-sm">{viewingRecord.purchaseQty?.toLocaleString()} Kg</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Rate</span>
                  <span className="font-extrabold text-emerald-900 text-sm">₹{viewingRecord.rate?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Amount</span>
                  <span className="font-extrabold text-emerald-900 text-sm">₹{viewingRecord.amount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Cost</span>
                  <span className="font-extrabold text-emerald-900 text-sm">₹{viewingRecord.totalPurchaseCost?.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Original Purchase Bill No</span>
                  <span className="font-mono font-bold text-slate-900">{viewingRecord.originalPurchaseBillNo || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Original Invoice Date</span>
                  <span className="font-mono text-slate-800">{viewingRecord.originalInvoiceDate || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Freight In Bill</span>
                  <span className="font-mono text-slate-800">₹{viewingRecord.freightInBill?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Purchase Bill No (Used)</span>
                  <span className="font-mono font-bold text-emerald-700">{viewingRecord.purchaseBillNo || "—"}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm tracking-wide">Edit Purchase Domestic (PD) Record</h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">AOL Branch Name</label>
                  <select
                    value={editingRecord.aolBranchName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aolBranchName: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {aolBranches.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">AOL Godown</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("godown")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      + Add Godown
                    </button>
                  </div>
                  <select
                    value={editingRecord.aolGodown}
                    onChange={(e) => setEditingRecord({ ...editingRecord, aolGodown: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Godown</option>
                    {aolGodowns.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Supplier Name</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("supplier")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      + Add Supplier
                    </button>
                  </div>
                  <select
                    value={editingRecord.supplierName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, supplierName: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Supplier</option>
                    {domesticSuppliers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-600 uppercase">Bill To Party Name</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("billto")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      + Add Bill To
                    </button>
                  </div>
                  <select
                    value={editingRecord.billToPartyName || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, billToPartyName: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Bill To Party</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.companyName || c.fullName}>{c.companyName || c.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold text-slate-600 uppercase">Ship To Party Name (GNFC Purchase)</label>
                    <button
                      type="button"
                      onClick={() => setQuickAddType("shipto")}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      + Add Ship To
                    </button>
                  </div>
                  <select
                    value={editingRecord.shipToPartyName || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, shipToPartyName: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Ship To Party</option>
                    {shipToParties.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Original Bill No</label>
                  <input
                    type="text"
                    value={editingRecord.originalPurchaseBillNo || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, originalPurchaseBillNo: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Original Invoice Date</label>
                  <input
                    type="date"
                    value={editingRecord.originalInvoiceDate || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, originalInvoiceDate: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Product Name</label>
                  <select
                    value={editingRecord.productName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, productName: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Tanker / Vehicle No</label>
                  <input
                    type="text"
                    value={editingRecord.tankerOrVehicleNo || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, tankerOrVehicleNo: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Purchase Qty (Kg)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingRecord.purchaseQty}
                    onChange={(e) => setEditingRecord({ ...editingRecord, purchaseQty: Number(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingRecord.rate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, rate: Number(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Amount (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={`₹ ${((editingRecord.purchaseQty || 0) * (editingRecord.rate || 0)).toLocaleString()}`}
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Freight In Bill (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingRecord.freightInBill}
                    onChange={(e) => setEditingRecord({ ...editingRecord, freightInBill: Number(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Entry Date (Auto)</label>
                  <input
                    type="date"
                    disabled
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-800 uppercase mb-1">Total Purchase Cost (Auto)</label>
                  <span className="text-sm font-extrabold text-emerald-900 font-mono block pt-1">
                    ₹ {(((editingRecord.purchaseQty || 0) * (editingRecord.rate || 0)) + (editingRecord.freightInBill || 0)).toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-800 uppercase mb-1">Purchase Rate (Auto)</label>
                  <span className="text-sm font-extrabold text-emerald-900 font-mono block pt-1">
                    ₹ {editingRecord.purchaseQty > 0 ? ((((editingRecord.purchaseQty || 0) * (editingRecord.rate || 0)) + (editingRecord.freightInBill || 0)) / editingRecord.purchaseQty).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-emerald-800 uppercase mb-1">Purchase Domestic / Bill No</label>
                  <span className="text-xs font-bold text-slate-800 font-mono block pt-1">
                    Domestic | Bill: {editingRecord.originalPurchaseBillNo || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Update PD Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Domestic PD Record?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to permanently delete this Purchase Domestic record? This action cannot be undone.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill No:</span>
                  <span className="font-bold text-slate-800">{deletingRecord.purchaseBillNo || deletingRecord.originalPurchaseBillNo || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <span className="font-bold text-slate-800">{deletingRecord.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchase Qty:</span>
                  <span className="font-bold text-emerald-700">{deletingRecord.purchaseQty?.toLocaleString()} Kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Cost:</span>
                  <span className="font-bold text-slate-800">₹{deletingRecord.totalPurchaseCost?.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingRecord(null)}
                  className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="w-full py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
