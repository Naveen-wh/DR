/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  User,
  AolBranchName,
  SupplierName,
  Product,
  AolGodown,
  DomesticSupplierName,
  DispatchLocation,
  WarehouseManagedBy,
  FreightTerm,
  PoRecord,
} from "../../types";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  Building2,
  Package,
  DollarSign,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Receipt,
  MapPin,
  Calendar,
  Sparkles,
  FileText,
  UserCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../Configuration/AppsScriptSyncBanner";
import { numberToWordsIndian } from "../../lib/numberToWords";

interface PoViewProps {
  activeUserId: string;
  users: User[];
  poRecords?: PoRecord[];
  suppliers?: SupplierName[];
  domesticSuppliers?: DomesticSupplierName[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  dispatchLocations?: DispatchLocation[];
  warehouses?: WarehouseManagedBy[];
  products?: Product[];
  freightTerms?: FreightTerm[];
  onAddPo: (record: Omit<PoRecord, "id" | "createdAt">) => void;
  onUpdatePo: (record: PoRecord) => void;
  onDeletePo: (id: string) => void;
  onAddSupplier?: (data: Omit<SupplierName, "id" | "createdAt">) => void;
  onAddDomesticSupplier?: (data: Omit<DomesticSupplierName, "id" | "createdAt">) => void;
  onAddProduct?: (data: Omit<Product, "id" | "createdAt">) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function PoView({
  activeUserId,
  users = [],
  poRecords = [],
  suppliers = [],
  domesticSuppliers = [],
  aolBranches = [],
  aolGodowns = [],
  dispatchLocations = [],
  warehouses = [],
  products = [],
  freightTerms = [],
  onAddPo,
  onUpdatePo,
  onDeletePo,
  onAddSupplier,
  onAddDomesticSupplier,
  onAddProduct,
  canAdd = true,
  canEdit = true,
}: PoViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "invoice">("invoice"); // "invoice" = PO Date, "entry" = Create/Edit Date

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PoRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<PoRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<PoRecord | null>(null);

  // Quick Add Modal state
  const [quickAddType, setQuickAddType] = useState<"supplier" | "product" | null>(null);
  const [quickAddValue, setQuickAddValue] = useState("");

  // Google Sheets Apps Script Integration
  const { config, syncStatus, setSyncStatus } = useAppsScriptSync(
    "purchase_orders_apps_script",
    "PO",
    "purchase_orders",
    undefined,
    (fetchedRows) => {
      if (Array.isArray(fetchedRows) && fetchedRows.length > 0) {
        fetchedRows.forEach((row) => {
          const normalized = normalizePoRow(row, activeUser?.name || "System");
          const existing = poRecords.find((p) => p.id === normalized.id || p.poNumber === normalized.poNumber);
          if (existing) {
            onUpdatePo({ ...existing, ...normalized });
          } else {
            onAddPo(normalized);
          }
        });
      }
    }
  );

  // Combined dropdown options from Firestore
  const allSupplierNames = useMemo(() => {
    const set = new Set<string>();
    domesticSuppliers.forEach((s) => s?.name && set.add(s.name.trim()));
    suppliers.forEach((s) => s?.name && set.add(s.name.trim()));
    return Array.from(set).sort();
  }, [domesticSuppliers, suppliers]);

  const allDeliveryLocations = useMemo(() => {
    const set = new Set<string>();
    aolGodowns.forEach((g) => g?.name && set.add(g.name.trim()));
    dispatchLocations.forEach((d) => d?.name && set.add(d.name.trim()));
    warehouses.forEach((w) => w?.name && set.add(w.name.trim()));
    aolBranches.forEach((b) => b?.name && set.add(b.name.trim()));
    return Array.from(set).sort();
  }, [aolGodowns, dispatchLocations, warehouses, aolBranches]);

  const allBillingLocations = useMemo(() => {
    const set = new Set<string>();
    aolBranches.forEach((b) => b?.name && set.add(b.name.trim()));
    dispatchLocations.forEach((d) => d?.name && set.add(d.name.trim()));
    return Array.from(set).sort();
  }, [aolBranches, dispatchLocations]);

  const allProductNames = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p?.name && set.add(p.name.trim()));
    return Array.from(set).sort();
  }, [products]);

  const allDeliveryTerms = useMemo(() => {
    const set = new Set<string>(["FOR Destination", "Ex-Works", "CIF", "FOB", "Door Delivery", "To Pay"]);
    freightTerms.forEach((f) => f?.name && set.add(f.name.trim()));
    return Array.from(set).sort();
  }, [freightTerms]);

  // Form Fields State for Create Modal
  const [formPoDate, setFormPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [formPoNumber, setFormPoNumber] = useState("");
  const [formSupplierName, setFormSupplierName] = useState(allSupplierNames[0] || "");
  const [formSupplierGstin, setFormSupplierGstin] = useState("");
  const [formSupplierAddress, setFormSupplierAddress] = useState("");
  const [formCreateEditDate, setFormCreateEditDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCpName, setFormCpName] = useState("");
  const [formCpNumber, setFormCpNumber] = useState("");
  const [formCpEmailId, setFormCpEmailId] = useState("");
  const [formDeliveryLocation, setFormDeliveryLocation] = useState(allDeliveryLocations[0] || "");
  const [formBillingLocation, setFormBillingLocation] = useState(allBillingLocations[0] || "");
  const [formShipToAddress, setFormShipToAddress] = useState("");
  const [formBillToAddress, setFormBillToAddress] = useState("");
  const [formShipToGst, setFormShipToGst] = useState("");
  const [formBillToGst, setFormBillToGst] = useState("");
  const [formPreparedBy, setFormPreparedBy] = useState(activeUser?.name || users[0]?.name || "");
  const [formCheckedBy, setFormCheckedBy] = useState("");
  const [formSpName, setFormSpName] = useState("");
  const [formSpPhoneNumber, setFormSpPhoneNumber] = useState("");
  const [formSpEmailId, setFormSpEmailId] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("Immediate on delivery");
  const [formDeliveryTerms, setFormDeliveryTerms] = useState(allDeliveryTerms[0] || "FOR Destination");
  const [formOtherTerms, setFormOtherTerms] = useState("Standard Warranty & Commercial Terms Apply");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formProductDescription1, setFormProductDescription1] = useState(allProductNames[0] || "");
  const [formPackingKgs1, setFormPackingKgs1] = useState("50");
  const [formPacks1, setFormPacks1] = useState("");
  const [formTotalQty1, setFormTotalQty1] = useState("");
  const [formRate1, setFormRate1] = useState("");
  const [formAmount1, setFormAmount1] = useState(0);
  const [formSubTotal, setFormSubTotal] = useState(0);
  const [formGstPercent, setFormGstPercent] = useState<string>("18");
  const [formGst, setFormGst] = useState(0);
  const [formTotalInNum, setFormTotalInNum] = useState(0);
  const [formTotalInWord, setFormTotalInWord] = useState("");

  // Auto-generate PO Number Helper
  const generateNextPoNumber = () => {
    const year = new Date().getFullYear();
    const count = (poRecords.length + 1).toString().padStart(4, "0");
    return `PO-${year}-${count}`;
  };

  // Open Create Modal and Reset
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormPoDate(today);
    setFormPoNumber(generateNextPoNumber());
    setFormSupplierName(allSupplierNames[0] || "");
    setFormSupplierGstin("");
    setFormSupplierAddress("");
    setFormCreateEditDate(today);
    setFormCpName("");
    setFormCpNumber("");
    setFormCpEmailId("");
    setFormDeliveryLocation(allDeliveryLocations[0] || "");
    setFormBillingLocation(allBillingLocations[0] || "");
    setFormShipToAddress("");
    setFormBillToAddress("");
    setFormShipToGst("");
    setFormBillToGst("");
    setFormPreparedBy(activeUser?.name || users[0]?.name || "");
    setFormCheckedBy("");
    setFormSpName("");
    setFormSpPhoneNumber("");
    setFormSpEmailId("");
    setFormPaymentTerms("Immediate on delivery");
    setFormDeliveryTerms(allDeliveryTerms[0] || "FOR Destination");
    setFormOtherTerms("Standard Warranty & Commercial Terms Apply");
    setFormCurrency("INR");
    setFormProductDescription1(allProductNames[0] || "");
    setFormPackingKgs1("50");
    setFormPacks1("");
    setFormTotalQty1("");
    setFormRate1("");
    setFormAmount1(0);
    setFormSubTotal(0);
    setFormGstPercent("18");
    setFormGst(0);
    setFormTotalInNum(0);
    setFormTotalInWord("");
    setIsCreateModalOpen(true);
  };

  // Recalculate create form values
  const updateCreateCalculations = (
    packsStr: string,
    packKgsStr: string,
    totalQtyStr: string,
    rateStr: string,
    gstPercentStr: string,
    curr: string
  ) => {
    const packs = parseFloat(packsStr) || 0;
    const packKgs = parseFloat(packKgsStr) || 0;
    let totalQty = parseFloat(totalQtyStr) || 0;

    // If totalQty is 0 or user just changed packs/packKgs, auto-derive totalQty
    if (packs > 0 && packKgs > 0 && (!totalQtyStr || totalQty === 0)) {
      totalQty = packs * packKgs;
      setFormTotalQty1(totalQty.toString());
    }

    const rate = parseFloat(rateStr) || 0;
    const amount = Number((totalQty * rate).toFixed(2));
    const subTotal = amount;
    const gstPercent = parseFloat(gstPercentStr) || 0;
    const gst = Number(((subTotal * gstPercent) / 100).toFixed(2));
    const totalInNum = Number((subTotal + gst).toFixed(2));
    const totalInWord = numberToWordsIndian(totalInNum, curr);

    setFormAmount1(amount);
    setFormSubTotal(subTotal);
    setFormGst(gst);
    setFormTotalInNum(totalInNum);
    setFormTotalInWord(totalInWord);
  };

  // Recalculate edit form values
  const updateEditCalculations = (rec: PoRecord) => {
    const packs = parseFloat(String(rec.packs1 || 0)) || 0;
    const packKgs = parseFloat(String(rec.packingKgs1 || 0)) || 0;
    let totalQty = parseFloat(String(rec.totalQty1 || 0)) || 0;

    if (packs > 0 && packKgs > 0 && totalQty === 0) {
      totalQty = packs * packKgs;
    }

    const rate = parseFloat(String(rec.rate1 || 0)) || 0;
    const amount = Number((totalQty * rate).toFixed(2));
    const subTotal = amount;
    const gst = parseFloat(String(rec.gst || 0)) || 0;
    const totalInNum = Number((subTotal + gst).toFixed(2));
    const totalInWord = numberToWordsIndian(totalInNum, rec.currency || "INR");

    return {
      ...rec,
      totalQty1: totalQty,
      amount1: amount,
      subTotal: subTotal,
      totalInNum: totalInNum,
      totalInWord: totalInWord,
    };
  };

  // Submit Create PO
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPoNumber.trim()) {
      alert("Please enter a valid PO Number.");
      return;
    }
    if (!formSupplierName.trim()) {
      alert("Please select or enter a Supplier Name.");
      return;
    }
    if (!formProductDescription1.trim()) {
      alert("Please select or enter Product Description 1.");
      return;
    }

    const now = new Date();
    const createdAtFormatted = `${now.toISOString().split("T")[0]} ${now.toTimeString().split(" ")[0]}`;
    const today = now.toISOString().split("T")[0];

    const newRecord: Omit<PoRecord, "id" | "createdAt"> = {
      poDate: formPoDate || today,
      poNumber: formPoNumber.trim(),
      supplierName: formSupplierName.trim(),
      supplierGstin: formSupplierGstin.trim(),
      supplierAddress: formSupplierAddress.trim(),
      createEditDate: formCreateEditDate || today,
      cpName: formCpName.trim(),
      cpNumber: formCpNumber.trim(),
      cpEmailId: formCpEmailId.trim(),
      deliveryLocation: formDeliveryLocation.trim(),
      billingLocation: formBillingLocation.trim(),
      shipToAddress: formShipToAddress.trim(),
      billToAddress: formBillToAddress.trim(),
      shipToGst: formShipToGst.trim(),
      billToGst: formBillToGst.trim(),
      preparedBy: formPreparedBy.trim() || activeUser?.name || "System",
      checkedBy: formCheckedBy.trim(),
      spName: formSpName.trim(),
      spPhoneNumber: formSpPhoneNumber.trim(),
      spEmailId: formSpEmailId.trim(),
      paymentTerms: formPaymentTerms.trim(),
      deliveryTerms: formDeliveryTerms.trim(),
      otherTerms: formOtherTerms.trim(),
      currency: formCurrency || "INR",
      subTotal: formSubTotal,
      gst: formGst,
      totalInNum: formTotalInNum,
      totalInWord: formTotalInWord || numberToWordsIndian(formTotalInNum, formCurrency),
      productDescription1: formProductDescription1.trim(),
      packingKgs1: formPackingKgs1.trim(),
      packs1: parseFloat(formPacks1) || 0,
      totalQty1: parseFloat(formTotalQty1) || 0,
      rate1: parseFloat(formRate1) || 0,
      amount1: formAmount1,
      createdBy: activeUser?.name || "System",
      editBy: "",
      editTimestamp: "",
      createdByUserId: activeUserId,
    };

    onAddPo(newRecord);
    setIsCreateModalOpen(false);
  };

  // Submit Edit PO
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const now = new Date();
    const editTimestamp = `${now.toISOString().split("T")[0]} ${now.toTimeString().split(" ")[0]}`;
    const today = now.toISOString().split("T")[0];

    const recalculated = updateEditCalculations(editingRecord);

    const updated: PoRecord = {
      ...recalculated,
      createEditDate: today,
      editBy: activeUser?.name || "System",
      editTimestamp: editTimestamp,
    };

    onUpdatePo(updated);
    setEditingRecord(null);
  };

  // Quick Add Supplier / Product
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    const val = quickAddValue.trim();

    if (quickAddType === "supplier") {
      if (onAddDomesticSupplier) onAddDomesticSupplier({ name: val });
      if (editingRecord) {
        setEditingRecord({ ...editingRecord, supplierName: val });
      } else {
        setFormSupplierName(val);
      }
    } else if (quickAddType === "product") {
      if (onAddProduct) onAddProduct({ name: val, category: "General", group: "General", manufacturer: "General" });
      if (editingRecord) {
        setEditingRecord({ ...editingRecord, productDescription1: val });
      } else {
        setFormProductDescription1(val);
      }
    }

    setQuickAddType(null);
    setQuickAddValue("");
  };

  // Filter Logic
  const filteredRecords = poRecords.filter((rec) => {
    const matchesSearch =
      (rec.poNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.supplierName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.productDescription1 || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.deliveryLocation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.billingLocation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.preparedBy || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.createdBy || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSupplier = filterSupplier === "all" || rec.supplierName === filterSupplier;
    const matchesLocation =
      filterLocation === "all" ||
      rec.deliveryLocation === filterLocation ||
      rec.billingLocation === filterLocation;
    const matchesProduct = filterProduct === "all" || rec.productDescription1 === filterProduct;

    let matchesDate = true;
    if (startDate || endDate) {
      const recDate = dateFilterType === "entry" ? rec.createEditDate : rec.poDate;
      if (!recDate) {
        matchesDate = false;
      } else {
        if (startDate && recDate < startDate) matchesDate = false;
        if (endDate && recDate > endDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesSupplier && matchesLocation && matchesProduct && matchesDate;
  });

  // Totals calculations
  const isFiltered = Boolean(
    searchTerm.trim() !== "" ||
      filterSupplier !== "all" ||
      filterLocation !== "all" ||
      filterProduct !== "all" ||
      startDate !== "" ||
      endDate !== ""
  );
  const totalEntries = filteredRecords.length;
  const overallEntries = poRecords.length;
  const totalQty = filteredRecords.reduce((sum, rec) => sum + (Number(rec.totalQty1) || 0), 0);
  const totalSubTotal = filteredRecords.reduce((sum, rec) => sum + (Number(rec.subTotal) || 0), 0);
  const totalGst = filteredRecords.reduce((sum, rec) => sum + (Number(rec.gst) || 0), 0);
  const totalAmount = filteredRecords.reduce((sum, rec) => sum + (Number(rec.totalInNum) || 0), 0);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterSupplier("all");
    setFilterLocation("all");
    setFilterProduct("all");
    setStartDate("");
    setEndDate("");
    setDateFilterType("invoice");
  };

  return (
    <div className="space-y-4">
      {/* Real-time Google Sheets Apps Script Sync Banner */}
      <AppsScriptSyncBanner
        configKey="purchase_orders_apps_script"
        defaultSheetName="PO"
        collectionKey="purchase_orders"
        moduleTitle="Purchase Orders (PO)"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        records={poRecords}
        onDataFetched={(records) => {
          records.forEach((row) => {
            const normalized = normalizePoRow(row, activeUser?.name || "System");
            const existing = poRecords.find((p) => p.id === normalized.id || p.poNumber === normalized.poNumber);
            if (existing) {
              onUpdatePo({ ...existing, ...normalized });
            } else {
              onAddPo(normalized);
            }
          });
        }}
      />

      {/* Top Metrics Cards (Similar to PD Sub-view) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Entries Count */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0">
            <Receipt size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered POs" : "Total PO Records"}
              </p>
              {isFiltered && (
                <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                  Filtered
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">
              {totalEntries.toLocaleString()}{" "}
              {isFiltered && <span className="text-xs font-normal text-slate-400">/ {overallEntries}</span>}
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
                {isFiltered ? "Filtered Total Qty" : "Total Order Qty"}
              </p>
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                Sum
              </span>
            </div>
            <p className="text-lg font-extrabold text-emerald-800 font-mono">
              {totalQty.toLocaleString()}{" "}
              <span className="text-xs font-semibold text-emerald-600">Units/Kg</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Sub Total */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered Sub Total" : "Total Sub Total"}
              </p>
              <span className="text-[9px] font-bold font-mono text-amber-800">
                GST: ₹{totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-lg font-bold text-amber-900 font-mono">
              ₹{totalSubTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Card 4: Total Value in Num */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {isFiltered ? "Filtered Grand Total" : "Grand Total (In Num)"}
              </p>
              <span className="text-[9px] font-bold font-mono text-purple-800">Gross</span>
            </div>
            <p className="text-lg font-bold text-purple-900 font-mono">
              ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col gap-2.5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search PO #, Supplier, Product, Location, Prepared By..."
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
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Suppliers</option>
              {allSupplierNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Locations</option>
              {allDeliveryLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Products</option>
              {allProductNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Date Range Popup */}
            <DateRangeFilterPopup
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              dateFilterType={dateFilterType}
              onDateFilterTypeChange={setDateFilterType}
              label="PO Date Filter"
              entryDateLabel="Create/Edit Date"
              invoiceDateLabel="PO Date"
            />

            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            )}
          </div>

          {canAdd && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={16} />
              Create PO
            </button>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 font-mono text-[11px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-slate-500 w-10">#</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">PO Date</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">PO Number</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">Supplier Name</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">Delivery Location</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">Billing Location</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">Product Description</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Packs</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-center">Packing/Kgs</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Total Qty</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Rate</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Sub Total</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">GST</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Total (In Num)</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">Prepared By</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700">Create/Edit Date</th>
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400">
                    <Receipt className="mx-auto mb-2 opacity-30 text-slate-400" size={32} />
                    <p className="font-medium text-sm">No Purchase Orders found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isFiltered
                        ? "Try clearing filters to see existing records"
                        : "Click 'Create PO' or sync with Google Sheets to add records"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => {
                  return (
                    <tr
                      key={rec.id || `po-${index}`}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setViewingRecord(rec)}
                    >
                      <td className="py-2 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {rec.poDate || "-"}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {rec.poNumber || "-"}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {rec.supplierName || "-"}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {rec.deliveryLocation || "-"}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {rec.billingLocation || "-"}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap max-w-[200px] truncate" title={rec.productDescription1}>
                        {rec.productDescription1 || "-"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 text-right whitespace-nowrap">
                        {rec.packs1 ? Number(rec.packs1).toLocaleString() : "-"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 text-center whitespace-nowrap">
                        {rec.packingKgs1 || "-"}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800 text-right whitespace-nowrap">
                        {Number(rec.totalQty1 || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 text-right whitespace-nowrap">
                        {rec.currency || "₹"} {Number(rec.rate1 || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-900 text-right whitespace-nowrap">
                        {rec.currency || "₹"} {Number(rec.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 font-mono text-amber-700 text-right whitespace-nowrap">
                        {Number(rec.gst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 font-mono font-extrabold text-purple-900 text-right whitespace-nowrap">
                        {rec.currency || "₹"} {Number(rec.totalInNum || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {rec.preparedBy || rec.createdBy || "-"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {rec.createEditDate || rec.createdAt?.split(" ")[0] || "-"}
                      </td>
                      <td
                        className="py-2 px-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingRecord(rec)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                            title="View PO Details"
                          >
                            <Eye size={14} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setEditingRecord({ ...rec })}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50 transition"
                              title="Edit PO"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingRecord(rec)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Delete PO"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800 font-mono text-[11px]">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-500">
                    Totals:
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {filteredRecords.reduce((s, r) => s + (Number(r.packs1) || 0), 0).toLocaleString()}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right text-emerald-800">
                    {totalQty.toLocaleString()}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right">
                    ₹{totalSubTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-700">
                    ₹{totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-purple-900">
                    ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* CREATE PO MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Receipt size={18} className="text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Create New Purchase Order (PO)</h3>
                  <p className="text-[11px] text-emerald-100/80 font-mono">
                    All fields will sync to Google Sheet via Google Apps Script
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 max-h-[80vh] overflow-y-auto space-y-5 text-xs">
              {/* SECTION 1: HEADER & SUPPLIER */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <Building2 size={14} className="text-emerald-600" />
                  1. General & Supplier Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">PO Date *</label>
                    <input
                      type="date"
                      required
                      value={formPoDate}
                      onChange={(e) => setFormPoDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-medium">PO Number *</label>
                      <button
                        type="button"
                        onClick={() => setFormPoNumber(generateNextPoNumber())}
                        className="text-[10px] text-emerald-600 hover:underline font-mono"
                      >
                        Auto Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PO-2026-0001"
                      value={formPoNumber}
                      onChange={(e) => setFormPoNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-medium">Supplier Name *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddType("supplier");
                          setQuickAddValue("");
                        }}
                        className="text-[10px] text-emerald-600 hover:underline font-medium"
                      >
                        + Add Supplier
                      </button>
                    </div>
                    <select
                      value={formSupplierName}
                      onChange={(e) => setFormSupplierName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- Select Supplier --</option>
                      {allSupplierNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Supplier GSTIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={formSupplierGstin}
                      onChange={(e) => setFormSupplierGstin(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Create/Edit Date</label>
                    <input
                      type="date"
                      value={formCreateEditDate}
                      onChange={(e) => setFormCreateEditDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Supplier Address</label>
                    <input
                      type="text"
                      placeholder="Address, City, State"
                      value={formSupplierAddress}
                      onChange={(e) => setFormSupplierAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTACT & REPRESENTATIVES */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <UserCheck size={14} className="text-emerald-600" />
                  2. Contact & Representatives
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CP Name (Contact Person)</label>
                    <input
                      type="text"
                      placeholder="Contact Person Name"
                      value={formCpName}
                      onChange={(e) => setFormCpName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CP Number</label>
                    <input
                      type="text"
                      placeholder="Contact Phone #"
                      value={formCpNumber}
                      onChange={(e) => setFormCpNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CP Email ID</label>
                    <input
                      type="email"
                      placeholder="cp@supplier.com"
                      value={formCpEmailId}
                      onChange={(e) => setFormCpEmailId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Prepared By (from Firestore Users)</label>
                    <select
                      value={formPreparedBy}
                      onChange={(e) => setFormPreparedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Checked By</label>
                    <select
                      value={formCheckedBy}
                      onChange={(e) => setFormCheckedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- None / Select Checker --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">SP Name (Sales Person)</label>
                    <input
                      type="text"
                      placeholder="Sales Person Name"
                      value={formSpName}
                      onChange={(e) => setFormSpName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">SP Phone Number</label>
                    <input
                      type="text"
                      placeholder="Sales Person Phone"
                      value={formSpPhoneNumber}
                      onChange={(e) => setFormSpPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">SP Email Id</label>
                    <input
                      type="email"
                      placeholder="sp@supplier.com"
                      value={formSpEmailId}
                      onChange={(e) => setFormSpEmailId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: DELIVERY & BILLING LOCATIONS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <MapPin size={14} className="text-emerald-600" />
                  3. Delivery & Billing Logistics
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Delivery Location (from Firestore)</label>
                    <select
                      value={formDeliveryLocation}
                      onChange={(e) => setFormDeliveryLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- Select Delivery Location --</option>
                      {allDeliveryLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Billing Location (from Firestore)</label>
                    <select
                      value={formBillingLocation}
                      onChange={(e) => setFormBillingLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- Select Billing Location --</option>
                      {allBillingLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Ship To Address</label>
                    <input
                      type="text"
                      placeholder="Full Destination Address"
                      value={formShipToAddress}
                      onChange={(e) => setFormShipToAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Ship To GST</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={formShipToGst}
                      onChange={(e) => setFormShipToGst(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Bill To Address</label>
                    <input
                      type="text"
                      placeholder="Registered Billing Office Address"
                      value={formBillToAddress}
                      onChange={(e) => setFormBillToAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Bill To GST</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={formBillToGst}
                      onChange={(e) => setFormBillToGst(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: PRODUCT & PRICING */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <Package size={14} className="text-emerald-600" />
                  4. Product Description & Quantities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-medium">Product Description 1 *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddType("product");
                          setQuickAddValue("");
                        }}
                        className="text-[10px] text-emerald-600 hover:underline font-medium"
                      >
                        + Add Product
                      </button>
                    </div>
                    <select
                      required
                      value={formProductDescription1}
                      onChange={(e) => setFormProductDescription1(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- Select Product --</option>
                      {allProductNames.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Packing/Kgs 1</label>
                    <input
                      type="text"
                      placeholder="e.g. 50, 200, Bulk"
                      value={formPackingKgs1}
                      onChange={(e) => {
                        setFormPackingKgs1(e.target.value);
                        updateCreateCalculations(
                          formPacks1,
                          e.target.value,
                          formTotalQty1,
                          formRate1,
                          formGstPercent,
                          formCurrency
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Packs 1</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 100"
                      value={formPacks1}
                      onChange={(e) => {
                        setFormPacks1(e.target.value);
                        updateCreateCalculations(
                          e.target.value,
                          formPackingKgs1,
                          formTotalQty1,
                          formRate1,
                          formGstPercent,
                          formCurrency
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Total Qty 1 *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Total Units / Kgs"
                      value={formTotalQty1}
                      onChange={(e) => {
                        setFormTotalQty1(e.target.value);
                        updateCreateCalculations(
                          formPacks1,
                          formPackingKgs1,
                          e.target.value,
                          formRate1,
                          formGstPercent,
                          formCurrency
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold focus:ring-1 focus:ring-emerald-500 text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Rate 1 *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Rate per unit"
                      value={formRate1}
                      onChange={(e) => {
                        setFormRate1(e.target.value);
                        updateCreateCalculations(
                          formPacks1,
                          formPackingKgs1,
                          formTotalQty1,
                          e.target.value,
                          formGstPercent,
                          formCurrency
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-3 bg-white p-3 rounded-lg border border-emerald-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Calculated Amount 1:</span>
                    <span className="font-mono font-bold text-sm text-emerald-800">
                      {formCurrency} {formAmount1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: COMMERCIAL TERMS & TOTALS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <CreditCard size={14} className="text-emerald-600" />
                  5. Commercial Terms & Grand Totals
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Currency</label>
                    <select
                      value={formCurrency}
                      onChange={(e) => {
                        setFormCurrency(e.target.value);
                        updateCreateCalculations(
                          formPacks1,
                          formPackingKgs1,
                          formTotalQty1,
                          formRate1,
                          formGstPercent,
                          e.target.value
                        );
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono font-semibold"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED</option>
                      <option value="SGD">SGD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Payment Terms</label>
                    <input
                      type="text"
                      placeholder="e.g. 30 Days Credit, Advance"
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Delivery Terms</label>
                    <select
                      value={formDeliveryTerms}
                      onChange={(e) => setFormDeliveryTerms(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    >
                      {allDeliveryTerms.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-600 font-medium mb-1">Other Terms</label>
                    <input
                      type="text"
                      placeholder="Special instructions or warranty terms"
                      value={formOtherTerms}
                      onChange={(e) => setFormOtherTerms(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Calculations breakdown */}
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Sub Total</label>
                    <input
                      type="number"
                      step="any"
                      readOnly
                      value={formSubTotal}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">GST (%)</label>
                    <div className="flex gap-2">
                      <select
                        value={formGstPercent}
                        onChange={(e) => {
                          setFormGstPercent(e.target.value);
                          updateCreateCalculations(
                            formPacks1,
                            formPackingKgs1,
                            formTotalQty1,
                            formRate1,
                            e.target.value,
                            formCurrency
                          );
                        }}
                        className="w-24 px-2 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                      >
                        <option value="18">18%</option>
                        <option value="12">12%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                        <option value="28">28%</option>
                      </select>
                      <input
                        type="number"
                        step="any"
                        placeholder="GST Amount"
                        value={formGst}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormGst(val);
                          const total = Number((formSubTotal + val).toFixed(2));
                          setFormTotalInNum(total);
                          setFormTotalInWord(numberToWordsIndian(total, formCurrency));
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-medium focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Total (In Num) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formTotalInNum}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormTotalInNum(val);
                        setFormTotalInWord(numberToWordsIndian(val, formCurrency));
                      }}
                      className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg font-mono font-extrabold text-purple-900 focus:ring-1 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-600 font-medium mb-1">Total (In Word)</label>
                    <input
                      type="text"
                      placeholder="e.g. INR One Lakh Eighteen Thousand Only"
                      value={formTotalInWord}
                      onChange={(e) => setFormTotalInWord(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-serif italic text-slate-800 focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Save & Sync PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PO MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Edit2 size={18} className="text-amber-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Edit Purchase Order ({editingRecord.poNumber})</h3>
                  <p className="text-[11px] text-amber-100/80 font-mono">
                    Updated details will sync directly to Google Sheet row
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 max-h-[80vh] overflow-y-auto space-y-5 text-xs">
              {/* SECTION 1: HEADER & SUPPLIER */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <Building2 size={14} className="text-amber-600" />
                  1. General & Supplier Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">PO Date</label>
                    <input
                      type="date"
                      value={editingRecord.poDate || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, poDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">PO Number</label>
                    <input
                      type="text"
                      value={editingRecord.poNumber || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, poNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={editingRecord.supplierName || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, supplierName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Supplier GSTIN</label>
                    <input
                      type="text"
                      value={editingRecord.supplierGstin || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, supplierGstin: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Create/Edit Date</label>
                    <input
                      type="date"
                      value={editingRecord.createEditDate || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, createEditDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Supplier Address</label>
                    <input
                      type="text"
                      value={editingRecord.supplierAddress || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, supplierAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTACT & REPRESENTATIVES */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <UserCheck size={14} className="text-amber-600" />
                  2. Contact & Representatives
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CP Name</label>
                    <input
                      type="text"
                      value={editingRecord.cpName || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, cpName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CP Number</label>
                    <input
                      type="text"
                      value={editingRecord.cpNumber || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, cpNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CP Email ID</label>
                    <input
                      type="email"
                      value={editingRecord.cpEmailId || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, cpEmailId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Prepared By</label>
                    <select
                      value={editingRecord.preparedBy || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, preparedBy: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Checked By</label>
                    <select
                      value={editingRecord.checkedBy || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, checkedBy: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- None --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">SP Name</label>
                    <input
                      type="text"
                      value={editingRecord.spName || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, spName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">SP Phone Number</label>
                    <input
                      type="text"
                      value={editingRecord.spPhoneNumber || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, spPhoneNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">SP Email Id</label>
                    <input
                      type="email"
                      value={editingRecord.spEmailId || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, spEmailId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: DELIVERY & BILLING LOCATIONS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <MapPin size={14} className="text-amber-600" />
                  3. Delivery & Billing Logistics
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Delivery Location</label>
                    <select
                      value={editingRecord.deliveryLocation || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, deliveryLocation: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Select --</option>
                      {allDeliveryLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Billing Location</label>
                    <select
                      value={editingRecord.billingLocation || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, billingLocation: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Select --</option>
                      {allBillingLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Ship To Address</label>
                    <input
                      type="text"
                      value={editingRecord.shipToAddress || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, shipToAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Ship To GST</label>
                    <input
                      type="text"
                      value={editingRecord.shipToGst || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, shipToGst: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Bill To Address</label>
                    <input
                      type="text"
                      value={editingRecord.billToAddress || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, billToAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Bill To GST</label>
                    <input
                      type="text"
                      value={editingRecord.billToGst || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, billToGst: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: PRODUCT & QUANTITIES */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <Package size={14} className="text-amber-600" />
                  4. Product Description & Quantities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Product Description 1</label>
                    <select
                      value={editingRecord.productDescription1 || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, productDescription1: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="">-- Select --</option>
                      {allProductNames.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Packing/Kgs 1</label>
                    <input
                      type="text"
                      value={editingRecord.packingKgs1 || ""}
                      onChange={(e) => {
                        const rec = { ...editingRecord, packingKgs1: e.target.value };
                        setEditingRecord(updateEditCalculations(rec));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Packs 1</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.packs1 || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const packKgs = parseFloat(String(editingRecord.packingKgs1 || 0)) || 0;
                        const newQty = packKgs > 0 ? val * packKgs : editingRecord.totalQty1;
                        const rec = { ...editingRecord, packs1: val, totalQty1: newQty };
                        setEditingRecord(updateEditCalculations(rec));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Total Qty 1</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.totalQty1 || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const rec = { ...editingRecord, totalQty1: val };
                        setEditingRecord(updateEditCalculations(rec));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Rate 1</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.rate1 || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const rec = { ...editingRecord, rate1: val };
                        setEditingRecord(updateEditCalculations(rec));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                    />
                  </div>

                  <div className="md:col-span-3 bg-white p-3 rounded-lg border border-amber-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Calculated Amount 1:</span>
                    <span className="font-mono font-bold text-sm text-amber-900">
                      {editingRecord.currency || "₹"} {Number(editingRecord.amount1 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: COMMERCIAL TERMS & GRAND TOTALS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-mono text-[11px] uppercase tracking-wider">
                  <CreditCard size={14} className="text-amber-600" />
                  5. Commercial Terms & Grand Totals
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Currency</label>
                    <select
                      value={editingRecord.currency || "INR"}
                      onChange={(e) => {
                        const rec = { ...editingRecord, currency: e.target.value };
                        setEditingRecord(updateEditCalculations(rec));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED</option>
                      <option value="SGD">SGD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Payment Terms</label>
                    <input
                      type="text"
                      value={editingRecord.paymentTerms || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, paymentTerms: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Delivery Terms</label>
                    <select
                      value={editingRecord.deliveryTerms || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, deliveryTerms: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      {allDeliveryTerms.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-600 font-medium mb-1">Other Terms</label>
                    <input
                      type="text"
                      value={editingRecord.otherTerms || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, otherTerms: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Sub Total</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.subTotal || 0}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">GST Amount</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.gst || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const sub = editingRecord.subTotal || 0;
                        const total = Number((sub + val).toFixed(2));
                        setEditingRecord({
                          ...editingRecord,
                          gst: val,
                          totalInNum: total,
                          totalInWord: numberToWordsIndian(total, editingRecord.currency || "INR"),
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Total (In Num)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.totalInNum || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditingRecord({
                          ...editingRecord,
                          totalInNum: val,
                          totalInWord: numberToWordsIndian(val, editingRecord.currency || "INR"),
                        });
                      }}
                      className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg font-mono font-extrabold text-purple-900"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-600 font-medium mb-1">Total (In Word)</label>
                    <input
                      type="text"
                      value={editingRecord.totalInWord || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, totalInWord: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-serif italic text-slate-800 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Update & Sync PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PO VOUCHER MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Voucher Header Bar */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Purchase Order Voucher
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                      {viewingRecord.poNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    PO Date: {viewingRecord.poDate || "-"} | Created: {viewingRecord.createdAt || viewingRecord.createEditDate || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Print PO"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Voucher Content */}
            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Supplier & Billing Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                    Supplier Details
                  </p>
                  <p className="font-bold text-sm text-slate-900">{viewingRecord.supplierName || "-"}</p>
                  <p className="text-slate-600 mt-1">{viewingRecord.supplierAddress || "No address provided"}</p>
                  <p className="text-slate-700 font-mono mt-1">GSTIN: {viewingRecord.supplierGstin || "N/A"}</p>
                  {viewingRecord.cpName && (
                    <p className="text-slate-500 text-[11px] mt-2">
                      Contact: {viewingRecord.cpName} {viewingRecord.cpNumber && `(${viewingRecord.cpNumber})`} {viewingRecord.cpEmailId && `| ${viewingRecord.cpEmailId}`}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                    Billing & Shipping Logistics
                  </p>
                  <p className="font-semibold text-slate-800">
                    <span className="text-slate-500">Billing Branch:</span> {viewingRecord.billingLocation || "-"}
                  </p>
                  <p className="text-slate-600 text-[11px]">{viewingRecord.billToAddress || "Address as per branch registration"}</p>
                  <p className="text-slate-700 font-mono text-[11px]">Bill To GST: {viewingRecord.billToGst || "N/A"}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-200">
                    <p className="font-semibold text-slate-800">
                      <span className="text-slate-500">Delivery Location:</span> {viewingRecord.deliveryLocation || "-"}
                    </p>
                    <p className="text-slate-600 text-[11px]">{viewingRecord.shipToAddress || "Same as Delivery Location"}</p>
                    <p className="text-slate-700 font-mono text-[11px]">Ship To GST: {viewingRecord.shipToGst || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Product Details Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-mono text-[11px] text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3 text-center">Packing/Kgs</th>
                      <th className="py-2.5 px-3 text-right">Packs</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {viewingRecord.productDescription1 || "-"}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {viewingRecord.packingKgs1 || "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {viewingRecord.packs1 ? Number(viewingRecord.packs1).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        {Number(viewingRecord.totalQty1 || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {viewingRecord.currency || "₹"} {Number(viewingRecord.rate1 || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {viewingRecord.currency || "₹"} {Number(viewingRecord.amount1 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals & Commercials Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Terms & Conditions
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Payment Terms:</span> {viewingRecord.paymentTerms || "Standard"}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Delivery Terms:</span> {viewingRecord.deliveryTerms || "FOR Destination"}
                  </p>
                  {viewingRecord.otherTerms && (
                    <p className="text-slate-600 text-[11px] italic">
                      <span className="font-semibold not-italic">Other Terms:</span> {viewingRecord.otherTerms}
                    </p>
                  )}
                  {viewingRecord.spName && (
                    <p className="text-slate-500 text-[11px] pt-1">
                      Sales Rep: {viewingRecord.spName} {viewingRecord.spPhoneNumber && `(${viewingRecord.spPhoneNumber})`}
                    </p>
                  )}
                </div>

                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex justify-between text-slate-700 font-mono">
                    <span>Sub Total:</span>
                    <span>{viewingRecord.currency || "₹"} {Number(viewingRecord.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-800 font-mono">
                    <span>GST:</span>
                    <span>{viewingRecord.currency || "₹"} {Number(viewingRecord.gst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t border-purple-200 flex justify-between font-bold text-sm text-purple-900 font-mono">
                    <span>Total (In Num):</span>
                    <span>{viewingRecord.currency || "₹"} {Number(viewingRecord.totalInNum || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-1.5 text-[11px] font-serif italic text-purple-950">
                    <span className="font-sans font-bold not-italic text-[10px] uppercase tracking-wider text-purple-700 block">
                      Total In Words:
                    </span>
                    {viewingRecord.totalInWord || numberToWordsIndian(viewingRecord.totalInNum || 0, viewingRecord.currency || "INR")}
                  </div>
                </div>
              </div>

              {/* Signatures & Audit Trail */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Prepared By</p>
                  <p className="font-bold text-slate-800 mt-1">{viewingRecord.preparedBy || viewingRecord.createdBy || "-"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{viewingRecord.createdAt || viewingRecord.createEditDate || ""}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Checked & Authorized By</p>
                  <p className="font-bold text-slate-800 mt-1">{viewingRecord.checkedBy || "Authorized Signatory"}</p>
                  {viewingRecord.editBy && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Last edited by {viewingRecord.editBy} ({viewingRecord.editTimestamp || ""})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Record ID: {viewingRecord.id}</span>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      const rec = { ...viewingRecord };
                      setViewingRecord(null);
                      setEditingRecord(rec);
                    }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Edit Record
                  </button>
                )}
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Delete Purchase Order</h4>
                <p className="text-xs text-slate-500">This action will delete the row in Google Sheets via Apps Script.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 my-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Are you sure you want to permanently delete PO <span className="font-bold font-mono text-slate-900">{deletingRecord.poNumber}</span> for supplier <span className="font-bold text-slate-900">{deletingRecord.supplierName}</span>?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePo(deletingRecord.id);
                  setDeletingRecord(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Delete PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL FOR SUPPLIER / PRODUCT */}
      {quickAddType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 mb-1">
              Add New {quickAddType === "supplier" ? "Supplier" : "Product"}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Enter name to save into Firestore dropdown master list.
            </p>
            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                placeholder={quickAddType === "supplier" ? "Supplier Name" : "Product Name"}
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAddType(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Normalizes rows fetched from Google Sheets via Apps Script into standard PoRecord shape.
 * Accommodates exact user requested headers and camelCase properties.
 */
function normalizePoRow(row: any, defaultUserName: string): PoRecord {
  const idVal = row.id || row["PO Number"] || row.poNumber || `po-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const poDateVal = row["PO Date"] || row.poDate || row.date || "";
  const poNumberVal = row["PO Number"] || row.poNumber || "";
  const supplierNameVal = row["Supplier Name"] || row.supplierName || "";
  const supplierGstinVal = row["Supplier GSTIN"] || row.supplierGstin || "";
  const supplierAddressVal = row["Supplier Address"] || row.supplierAddress || "";
  const createEditDateVal = row["Create/Edit Date"] || row.createEditDate || "";
  const cpNameVal = row["CP Name"] || row.cpName || "";
  const cpNumberVal = row["CP Number"] || row.cpNumber || "";
  const cpEmailIdVal = row["CP Email ID"] || row.cpEmailId || "";
  const deliveryLocationVal = row["Delivery Location"] || row.deliveryLocation || "";
  const billingLocationVal = row["Billing Location"] || row.billingLocation || "";
  const shipToAddressVal = row["Ship To Address"] || row.shipToAddress || "";
  const billToAddressVal = row["Bill To Address"] || row.billToAddress || "";
  const shipToGstVal = row["Ship To GST"] || row.shipToGst || "";
  const billToGstVal = row["Bill To GST"] || row.billToGst || "";
  const preparedByVal = row["Prepared By"] || row.preparedBy || defaultUserName;
  const checkedByVal = row["Checked By"] || row.checkedBy || "";
  const spNameVal = row["SP Name"] || row.spName || "";
  const spPhoneNumberVal = row["SP Phone Number"] || row.spPhoneNumber || "";
  const spEmailIdVal = row["SP Email Id"] || row.spEmailId || "";
  const paymentTermsVal = row["Payment Terms"] || row.paymentTerms || "";
  const deliveryTermsVal = row["Delivery Terms"] || row.deliveryTerms || "";
  const otherTermsVal = row["Other Terms"] || row.otherTerms || "";
  const currencyVal = row["Currency"] || row.currency || "INR";
  const subTotalVal = parseFloat(row["Sub Total"] || row.subTotal) || 0;
  const gstVal = parseFloat(row["GST"] || row.gst) || 0;
  const totalInNumVal = parseFloat(row["Total (In Num)"] || row.totalInNum) || (subTotalVal + gstVal);
  const totalInWordVal = row["Total (In Word)"] || row.totalInWord || numberToWordsIndian(totalInNumVal, currencyVal);
  const productDescription1Val = row["Product Description 1"] || row.productDescription1 || "";
  const packingKgs1Val = row["Packing/Kgs 1"] || row.packingKgs1 || "";
  const packs1Val = parseFloat(row["Packs 1"] || row.packs1) || 0;
  const totalQty1Val = parseFloat(row["Total Qty 1"] || row.totalQty1) || 0;
  const rate1Val = parseFloat(row["Rate 1"] || row.rate1) || 0;
  const amount1Val = parseFloat(row["Amount 1"] || row.amount1) || (totalQty1Val * rate1Val);
  const createdByVal = row["Created By"] || row.createdBy || defaultUserName;
  const editByVal = row["Edit By"] || row.editBy || "";
  const editTimestampVal = row["Edit Timestamp"] || row.editTimestamp || "";
  const createdAtVal = row["Created_at"] || row.createdAt || new Date().toISOString();

  return {
    id: idVal,
    createdAt: createdAtVal,
    poDate: poDateVal,
    poNumber: poNumberVal,
    supplierName: supplierNameVal,
    supplierGstin: supplierGstinVal,
    supplierAddress: supplierAddressVal,
    createEditDate: createEditDateVal,
    cpName: cpNameVal,
    cpNumber: cpNumberVal,
    cpEmailId: cpEmailIdVal,
    deliveryLocation: deliveryLocationVal,
    billingLocation: billingLocationVal,
    shipToAddress: shipToAddressVal,
    billToAddress: billToAddressVal,
    shipToGst: shipToGstVal,
    billToGst: billToGstVal,
    preparedBy: preparedByVal,
    checkedBy: checkedByVal,
    spName: spNameVal,
    spPhoneNumber: spPhoneNumberVal,
    spEmailId: spEmailIdVal,
    paymentTerms: paymentTermsVal,
    deliveryTerms: deliveryTermsVal,
    otherTerms: otherTermsVal,
    currency: currencyVal,
    subTotal: subTotalVal,
    gst: gstVal,
    totalInNum: totalInNumVal,
    totalInWord: totalInWordVal,
    productDescription1: productDescription1Val,
    packingKgs1: packingKgs1Val,
    packs1: packs1Val,
    totalQty1: totalQty1Val,
    rate1: rate1Val,
    amount1: amount1Val,
    createdBy: createdByVal,
    editBy: editByVal,
    editTimestamp: editTimestampVal,
  };
}
