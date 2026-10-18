/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, AolBranchName, Product, DomesticPdRecord, DomesticTptdRecord, TptdCategory } from "../../types";
import { Plus, Search, Eye, Edit2, Trash2, X, ShieldAlert, Check, HelpCircle, RotateCcw, Filter } from "lucide-react";
import { DateRangeFilterPopup } from "../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../AppsScriptSyncBanner";

interface DomesticTptdSubViewProps {
  activeUserId: string;
  users: User[];
  domesticPds?: DomesticPdRecord[];
  domesticTptds?: DomesticTptdRecord[];
  aolBranches?: AolBranchName[];
  products?: Product[];
  tptdCategories?: TptdCategory[];
  onAddDomesticTptd: (record: Omit<DomesticTptdRecord, "id" | "createdAt">) => void;
  onUpdateDomesticTptd: (record: DomesticTptdRecord) => void;
  onDeleteDomesticTptd: (id: string) => void;
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function DomesticTptdSubView({
  activeUserId,
  users,
  domesticPds = [],
  domesticTptds = [],
  aolBranches = [],
  products = [],
  tptdCategories = [],
  onAddDomesticTptd,
  onUpdateDomesticTptd,
  onDeleteDomesticTptd,
  onAddTptdCategory,
}: DomesticTptdSubViewProps) {
  // Filtering & Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Records state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DomesticTptdRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DomesticTptdRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Google Sheets Apps Script Integration
  const activeUser = users.find((u) => u.id === activeUserId);
  const { config, syncStatus, setSyncStatus } = useAppsScriptSync(
    "domestic_tptds_apps_script",
    "Domestic TPTDs",
    "domestic_tptds"
  );

  // Form states
  const [branch, setBranch] = useState("");
  const [productName, setProductName] = useState("");
  const [purchaseBillNo, setPurchaseBillNo] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceRefNo, setInvoiceRefNo] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Quick category creation
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Get distinct values from Domestic PDs for the Cascading Dropdowns
  const pdBranches = Array.from(new Set(domesticPds.map((pd) => pd.aolBranchName).filter(Boolean))).sort();

  // Selected PD options cascade helpers
  const getPdProductsForBranch = (bName: string) => {
    if (!bName) return [];
    const filtered = domesticPds.filter((pd) => pd.aolBranchName === bName);
    return Array.from(new Set(filtered.map((pd) => pd.productName).filter(Boolean))).sort();
  };

  const getPdBillsForBranchAndProduct = (bName: string, pName: string) => {
    if (!bName || !pName) return [];
    const filtered = domesticPds.filter(
      (pd) => pd.aolBranchName === bName && pd.productName === pName
    );
    return Array.from(new Set(filtered.map((pd) => pd.purchaseBillNo).filter(Boolean))).sort();
  };

  const getPdVehiclesForBranchProductAndBill = (bName: string, pName: string, billNo: string) => {
    if (!bName || !pName || !billNo) return [];
    const filtered = domesticPds.filter(
      (pd) =>
        pd.aolBranchName === bName &&
        pd.productName === pName &&
        pd.purchaseBillNo === billNo
    );
    return Array.from(new Set(filtered.map((pd) => pd.tankerOrVehicleNo).filter(Boolean))).sort();
  };

  // Reset/sync cascading dropdown lists when selectors change
  useEffect(() => {
    if (!isCreateModalOpen && !editingRecord) return;

    // Handle creation modal cascading resets
    if (isCreateModalOpen && !editingRecord) {
      const prodList = getPdProductsForBranch(branch);
      if (branch && !prodList.includes(productName)) {
        setProductName(prodList[0] || "");
      }
    }
  }, [branch]);

  useEffect(() => {
    if (!isCreateModalOpen && !editingRecord) return;

    if (isCreateModalOpen && !editingRecord) {
      const billList = getPdBillsForBranchAndProduct(branch, productName);
      if (branch && productName && !billList.includes(purchaseBillNo)) {
        setPurchaseBillNo(billList[0] || "");
      }
    }
  }, [productName]);

  useEffect(() => {
    if (!isCreateModalOpen && !editingRecord) return;

    if (isCreateModalOpen && !editingRecord) {
      const vehicleList = getPdVehiclesForBranchProductAndBill(branch, productName, purchaseBillNo);
      if (branch && productName && purchaseBillNo && !vehicleList.includes(containerNo)) {
        setContainerNo(vehicleList[0] || "");
      }
    }
  }, [purchaseBillNo]);

  // Handle opening modal
  const handleOpenCreate = () => {
    setErrorMsg(null);
    const initialBranch = pdBranches[0] || "";
    setBranch(initialBranch);

    const initialProduct = getPdProductsForBranch(initialBranch)[0] || "";
    setProductName(initialProduct);

    const initialBill = getPdBillsForBranchAndProduct(initialBranch, initialProduct)[0] || "";
    setPurchaseBillNo(initialBill);

    const initialVehicle = getPdVehiclesForBranchProductAndBill(initialBranch, initialProduct, initialBill)[0] || "";
    setContainerNo(initialVehicle);

    setEntryDate(new Date().toISOString().split("T")[0]);
    setTallyDate(new Date().toISOString().split("T")[0]);
    setInvoiceRefNo("");
    setCategory(tptdCategories[0]?.name || "");
    setAmount("");
    setDescription("");
    setEditingRecord(null);
    setIsCreateModalOpen(true);
  };

  // Handle edit opening
  const handleOpenEdit = (rec: DomesticTptdRecord) => {
    setErrorMsg(null);
    setEditingRecord(rec);
    setBranch(rec.aolBranchName);
    setProductName(rec.productName);
    setPurchaseBillNo(rec.purchaseBillNo);
    setContainerNo(rec.containerOrVehicleNo);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setTallyDate(rec.tallyDate);
    setInvoiceRefNo(rec.invoiceOrReferenceNo);
    setCategory(rec.category);
    setAmount(rec.amount.toString());
    setDescription(rec.description || "");
    setIsCreateModalOpen(true);
  };

  // Check for duplicate combination
  const isDuplicateCombo = (
    bName: string,
    pName: string,
    billNo: string,
    vehNo: string,
    invRef: string,
    catName: string,
    excludeId?: string
  ) => {
    return domesticTptds.some(
      (rec) =>
        rec.id !== excludeId &&
        rec.aolBranchName?.toLowerCase() === bName.toLowerCase() &&
        rec.productName?.toLowerCase() === pName.toLowerCase() &&
        rec.purchaseBillNo?.toLowerCase() === billNo.toLowerCase() &&
        rec.containerOrVehicleNo?.toLowerCase() === vehNo.toLowerCase() &&
        rec.invoiceOrReferenceNo?.toLowerCase() === invRef.toLowerCase() &&
        rec.category?.toLowerCase() === catName.toLowerCase()
    );
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!branch) {
      setErrorMsg("AOL Branch Name is required.");
      return;
    }
    if (!productName) {
      setErrorMsg("Product Name is required.");
      return;
    }
    if (!purchaseBillNo) {
      setErrorMsg("Purchase Bill No is required.");
      return;
    }
    if (!containerNo) {
      setErrorMsg("Container No / Vehicle No is required.");
      return;
    }
    if (!invoiceRefNo) {
      setErrorMsg("Invoice / Reference No is required.");
      return;
    }
    if (!category) {
      setErrorMsg("Category is required.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("Please enter a valid positive number for Amount.");
      return;
    }

    // Duplication checking with combined keys
    const isDup = isDuplicateCombo(
      branch,
      productName,
      purchaseBillNo,
      containerNo,
      invoiceRefNo,
      category,
      editingRecord?.id
    );

    if (isDup) {
      setErrorMsg(
        "Duplicate entry detected! A record with this combination of AOL Branch, Product Name, Purchase Bill No, Container/Vehicle No, Invoice/Reference No, and Category already exists."
      );
      return;
    }

    const payload = {
      aolBranchName: branch,
      productName,
      purchaseBillNo,
      containerOrVehicleNo: containerNo,
      entryDate,
      tallyDate,
      invoiceOrReferenceNo: invoiceRefNo,
      category,
      amount: Number(amount),
      description,
    };

    if (editingRecord) {
      onUpdateDomesticTptd({
        ...editingRecord,
        ...payload,
      });
    } else {
      onAddDomesticTptd(payload);
    }

    setIsCreateModalOpen(false);
    setEditingRecord(null);
  };

  // Quick category add submit
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (onAddTptdCategory) {
      onAddTptdCategory({ name: newCategoryName.trim() });
      setCategory(newCategoryName.trim());
      setNewCategoryName("");
      setShowQuickCategory(false);
    }
  };

  // Filtering Records
  const filteredRecords = domesticTptds.filter((rec) => {
    const matchesSearch =
      (rec.aolBranchName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.purchaseBillNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.containerOrVehicleNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.invoiceOrReferenceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;
    const matchesCategory = filterCategory === "all" || rec.category === filterCategory;

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

    return matchesSearch && matchesBranch && matchesCategory && matchesDate;
  });

  // Calculate totals dynamically from filtered records
  const isFiltered = Boolean(
    searchTerm.trim() !== "" || filterBranch !== "all" || filterCategory !== "all" || startDate !== "" || endDate !== ""
  );
  const totalEntries = filteredRecords.length;
  const overallEntries = domesticTptds.length;
  const totalAmount = filteredRecords.reduce((sum, rec) => sum + (Number(rec.amount) || 0), 0);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setFilterCategory("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Distinct values for filter selectors
  const filterBranches = Array.from(new Set(domesticTptds.map((r) => r.aolBranchName).filter(Boolean))).sort();
  const filterCategories = Array.from(new Set(domesticTptds.map((r) => r.category).filter(Boolean))).sort();

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col gap-6">
      {/* GOOGLE SHEETS APPS SCRIPT CONFIGURATION & SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="domestic_tptds_apps_script"
        defaultSheetName="Domestic TPTDs"
        collectionKey="domestic_tptds"
        records={domesticTptds}
        activeUser={activeUser}
        moduleTitle="Domestic Transport (TPTD) Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = domesticTptds.find((p) => p.id === rec.id);
            if (existing) {
              onUpdateDomesticTptd({ ...existing, ...rec });
            } else {
              onAddDomesticTptd(rec);
            }
          });
        }}
      />

      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Domestic TPT-D Logs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage transport details cascading from domestic purchase receipts with custom categories and duplicate safety limits.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold px-4 py-2.5 rounded-lg shadow-xs cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus size={15} /> Add TPT-D Record
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by branch, product, bill, vehicle, ref no, category..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-full md:w-44">
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">All AOL Branches</option>
              {filterBranches.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-44">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {filterCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Type & Range */}
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
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
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
                Filtered Amount: <strong className="text-emerald-700 font-bold">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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

      {/* Main Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-[11px] text-slate-600">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 text-[10px] uppercase tracking-wider">
              <th className="py-3.5 px-4">AOL Branch Name</th>
              <th className="py-3.5 px-4">Product Name</th>
              <th className="py-3.5 px-4">Purchase Bill No</th>
              <th className="py-3.5 px-4">Container / Vehicle No</th>
              <th className="py-3.5 px-4">Tally Date</th>
              <th className="py-3.5 px-4">Invoice / Ref No</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{rec.aolBranchName}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{rec.productName}</td>
                  <td className="py-3 px-4 text-slate-500">{rec.purchaseBillNo}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[10px]">{rec.containerOrVehicleNo}</td>
                  <td className="py-3 px-4 text-slate-500">{rec.tallyDate}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{rec.invoiceOrReferenceNo}</td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {rec.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                    ₹{rec.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewingRecord(rec)}
                        title="View Details"
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        title="Edit Record"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this TPT-D record?")) {
                            onDeleteDomesticTptd(rec.id);
                          }
                        }}
                        title="Delete Record"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                  No TPT-D records found.
                </td>
              </tr>
            )}
          </tbody>
          {filteredRecords.length > 0 && (
            <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
              <tr>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                    <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] text-slate-300 block">
                    {Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length} Products
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] text-slate-300 block">
                    {Array.from(new Set(filteredRecords.map((r) => r.purchaseBillNo).filter(Boolean))).length} Bills
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] text-slate-300 block">
                    {Array.from(new Set(filteredRecords.map((r) => r.containerOrVehicleNo).filter(Boolean))).length} Vehicles
                  </span>
                </td>
                <td className="py-3.5 px-4">—</td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] text-slate-300 block">
                    {Array.from(new Set(filteredRecords.map((r) => r.invoiceOrReferenceNo).filter(Boolean))).length} Invoices
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] text-slate-300 block">
                    {Array.from(new Set(filteredRecords.map((r) => r.category).filter(Boolean))).length} Categories
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono">
                  <span className="font-extrabold text-emerald-400 block text-xs">
                    ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="py-3.5 px-4">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  currentPage === pg
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRecord ? "Edit TPT-D Log Record" : "Add New TPT-D Log Record"}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="text-[11px] font-medium leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* AOL Branch - cascading dropdown source */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                  AOL Branch Name <span className="text-rose-500">*</span>
                </label>
                {pdBranches.length > 0 ? (
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  >
                    <option value="">-- Select AOL Branch Name --</option>
                    {pdBranches.map((bName) => (
                      <option key={bName} value={bName}>
                        {bName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 p-2.5 rounded-lg text-[10px]">
                    No AOL Branches found in domestic purchases (PD). Please make sure there is data in the PD sub-tab.
                  </div>
                )}
              </div>

              {/* Product Name - cascading dropdown level 2 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={!branch}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Product Name --</option>
                  {getPdProductsForBranch(branch).map((pName) => (
                    <option key={pName} value={pName}>
                      {pName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase Bill No - cascading dropdown level 3 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                  Purchase Bill No <span className="text-rose-500">*</span>
                </label>
                <select
                  value={purchaseBillNo}
                  onChange={(e) => setPurchaseBillNo(e.target.value)}
                  disabled={!branch || !productName}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Purchase Bill No --</option>
                  {getPdBillsForBranchAndProduct(branch, productName).map((billNo) => (
                    <option key={billNo} value={billNo}>
                      {billNo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Container / Vehicle No - cascading dropdown level 4 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                  Container No / Vehicle No <span className="text-rose-500">*</span>
                </label>
                <select
                  value={containerNo}
                  onChange={(e) => setContainerNo(e.target.value)}
                  disabled={!branch || !productName || !purchaseBillNo}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed font-mono text-[11px]"
                >
                  <option value="">-- Select Container/Vehicle No --</option>
                  {getPdVehiclesForBranchProductAndBill(branch, productName, purchaseBillNo).map((vNo) => (
                    <option key={vNo} value={vNo}>
                      {vNo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entry Date & Tally Date & Invoice / Ref No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                    Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-600 font-mono font-semibold cursor-not-allowed text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                    Tally Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tallyDate}
                    onChange={(e) => setTallyDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                    Invoice / Reference No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceRefNo}
                    onChange={(e) => setInvoiceRefNo(e.target.value)}
                    placeholder="e.g. INV-2024-001"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Category dropdown & Quick Create Category trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  {!showQuickCategory && (
                    <button
                      type="button"
                      onClick={() => setShowQuickCategory(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                      + Quick Add Category
                    </button>
                  )}
                </div>

                {showQuickCategory ? (
                  <div className="flex gap-2 bg-slate-50 p-2 border border-slate-200 rounded-lg mb-2">
                    <input
                      type="text"
                      placeholder="New category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategorySubmit}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 font-bold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategory(false)}
                      className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs hover:bg-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800"
                >
                  <option value="">-- Select Category --</option>
                  {tptdCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount field */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 font-semibold text-slate-900"
                />
              </div>

              {/* Description textarea */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wide text-[10px]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Remarks, toll tax slip reference, or loading charges memo notes..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg font-bold transition-colors cursor-pointer"
                >
                  {editingRecord ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            {/* View Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">TPT-D Log Detail View</h3>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* View Body */}
            <div className="p-5 flex flex-col gap-4 text-xs leading-relaxed">
              <div className="grid grid-cols-2 gap-y-3.5 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    AOL Branch Name
                  </span>
                  <span className="text-slate-900 font-bold">{viewingRecord.aolBranchName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Product Name
                  </span>
                  <span className="text-slate-900 font-bold">{viewingRecord.productName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Purchase Bill No
                  </span>
                  <span className="text-slate-800 font-medium">{viewingRecord.purchaseBillNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Container / Vehicle No
                  </span>
                  <span className="text-slate-800 font-mono font-bold">{viewingRecord.containerOrVehicleNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Tally Date
                  </span>
                  <span className="text-slate-800">{viewingRecord.tallyDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Invoice / Reference No
                  </span>
                  <span className="text-slate-800 font-mono font-medium">{viewingRecord.invoiceOrReferenceNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Category
                  </span>
                  <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px] inline-block">
                    {viewingRecord.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide">
                    Amount
                  </span>
                  <span className="text-emerald-700 font-bold text-sm">
                    ₹{viewingRecord.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wide mb-1">
                  Description
                </span>
                <p className="text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-[11px] whitespace-pre-wrap">
                  {viewingRecord.description || <span className="text-slate-400 italic">No description provided.</span>}
                </p>
              </div>

              {viewingRecord.createdByName && (
                <div className="text-[10px] text-slate-400 text-right mt-1">
                  Created by: {viewingRecord.createdByName}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg font-bold cursor-pointer"
                >
                  Dismiss View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
