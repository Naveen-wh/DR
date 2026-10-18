/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { User, ImportBoeRecord, ImportPiRecord, ImportTptiRecord, TptdCategory, Role } from "../../../types";
import { Plus, Search, Edit2, Trash2, Eye, X, Check, Calendar, Coins, Filter, ShieldAlert, RotateCcw } from "lucide-react";
import { DateRangeFilterPopup } from "../../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";

interface ImportTptiSubViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importBoes: ImportBoeRecord[];
  importTptis: ImportTptiRecord[];
  tptdCategories: TptdCategory[];
  onAddImportTpti: (record: Omit<ImportTptiRecord, "id" | "createdAt">) => void;
  onUpdateImportTpti: (record: ImportTptiRecord) => void;
  onDeleteImportTpti: (id: string) => void;
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportTptiSubView({
  activeUserId,
  users,
  importPis,
  importBoes,
  importTptis,
  tptdCategories,
  onAddImportTpti,
  onUpdateImportTpti,
  onDeleteImportTpti,
  onAddTptdCategory,
  canAdd = true,
  canEdit = true
}: ImportTptiSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.teamName === "Executive";
  const isManagerOrAdmin =
    isAdmin ||
    activeUser?.role === Role.SeniorManager ||
    activeUser?.role === Role.Manager;
  const isAddable = isAdmin || canAdd !== false;
  const isEditable = isAdmin || canEdit !== false;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Date Range Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ImportTptiRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ImportTptiRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_tpti_config",
    "Import TPT-I",
    "import_tptis"
  );

  // Form states
  const [aolBranchName, setAolBranchName] = useState("");
  const [beNo, setBeNo] = useState("");
  const [productName, setProductName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [purchaseQty, setPurchaseQty] = useState<number>(0);
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceOrReferenceNo, setInvoiceOrReferenceNo] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  // Quick Category creation
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Extract distinct branch names from BOEs
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    importBoes.forEach((b) => {
      if (b.aolBranchName) set.add(b.aolBranchName);
    });
    return Array.from(set).sort();
  }, [importBoes]);

  // Extract distinct BE NOs for the selected branch
  const availableBeNos = useMemo(() => {
    if (!aolBranchName) return [];
    const set = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === aolBranchName && b.beNo)
      .forEach((b) => set.add(b.beNo));
    return Array.from(set).sort();
  }, [importBoes, aolBranchName]);

  // Extract distinct Product Names for the selected branch & BE No
  const availableProducts = useMemo(() => {
    if (!aolBranchName || !beNo) return [];
    const set = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === aolBranchName && b.beNo === beNo && b.productName)
      .forEach((b) => set.add(b.productName));
    return Array.from(set).sort();
  }, [importBoes, aolBranchName, beNo]);

  // Effect to handle Auto-population of Supplier and Purchase Qty from BOE / PI
  useEffect(() => {
    if (!aolBranchName || !beNo || !productName) {
      setSupplierName("");
      setPurchaseQty(0);
      return;
    }

    const foundBoe = importBoes.find(
      (b) => b.aolBranchName === aolBranchName && b.beNo === beNo && b.productName === productName
    );

    if (foundBoe) {
      const matchingPi = importPis.find(
        (pi) => pi.aolBranchName === foundBoe.aolBranchName && pi.piNo === foundBoe.piNo
      );

      if (matchingPi) {
        setSupplierName(matchingPi.supplierName || "");
        let qty = 0;
        if (matchingPi.products && Array.isArray(matchingPi.products)) {
          const matchedItem = matchingPi.products.find((p) => p.productName === foundBoe.productName);
          if (matchedItem) {
            qty = Number(matchedItem.purchaseQty) || 0;
          }
        } else if (matchingPi.productName === foundBoe.productName && matchingPi.purchaseQty) {
          qty = Number(matchingPi.purchaseQty) || 0;
        }
        setPurchaseQty(qty);
      } else {
        setSupplierName("");
        setPurchaseQty(0);
      }
    } else {
      setSupplierName("");
      setPurchaseQty(0);
    }
  }, [aolBranchName, beNo, productName, importBoes, importPis]);

  // Reset form
  const resetForm = () => {
    setAolBranchName("");
    setBeNo("");
    setProductName("");
    setSupplierName("");
    setPurchaseQty(0);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setTallyDate(new Date().toISOString().split("T")[0]);
    setInvoiceOrReferenceNo("");
    setCategory(tptdCategories[0]?.name || "");
    setAmount("");
    setDescription("");
    setErrorMsg("");
    setShowQuickCategory(false);
    setNewCategoryName("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rec: ImportTptiRecord) => {
    setErrorMsg("");
    setEditingRecord(rec);
    setAolBranchName(rec.aolBranchName);
    setBeNo(rec.beNo);
    setProductName(rec.productName);
    setSupplierName(rec.supplierName);
    setPurchaseQty(rec.purchaseQty);
    setEntryDate(rec.entryDate || new Date().toISOString().split("T")[0]);
    setTallyDate(rec.tallyDate);
    setInvoiceOrReferenceNo(rec.invoiceOrReferenceNo);
    setCategory(rec.category);
    setAmount(rec.amount.toString());
    setDescription(rec.description || "");
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!aolBranchName || !beNo || !productName) {
      setErrorMsg("AOL Branch, BE No, and Product Name are required from BOE.");
      return;
    }
    if (!invoiceOrReferenceNo) {
      setErrorMsg("Invoice / Reference No is required.");
      return;
    }
    if (!category) {
      setErrorMsg("Category is required.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a valid positive number for Amount.");
      return;
    }

    // Duplication check: combination of "AOL Branch Name", "BE NO", "PRODUCT NAME" and "Invoice / Reference No"
    const isDup = importTptis.some((t) => {
      if (editingRecord && t.id === editingRecord.id) return false;
      return (
        t.aolBranchName.toLowerCase().trim() === aolBranchName.toLowerCase().trim() &&
        t.beNo.toLowerCase().trim() === beNo.toLowerCase().trim() &&
        t.productName.toLowerCase().trim() === productName.toLowerCase().trim() &&
        t.invoiceOrReferenceNo.toLowerCase().trim() === invoiceOrReferenceNo.toLowerCase().trim()
      );
    });

    if (isDup) {
      setErrorMsg(
        "Duplicate entry detected! A record with this combination of AOL Branch, BE No, Product Name, and Invoice/Reference No already exists."
      );
      return;
    }

    const payload = {
      aolBranchName,
      beNo,
      productName,
      supplierName,
      purchaseQty,
      tallyDate,
      invoiceOrReferenceNo: invoiceOrReferenceNo.trim(),
      category,
      amount: parsedAmount,
      description: description.trim() || undefined,
      entryDate: entryDate || new Date().toISOString().split("T")[0],
    };

    if (editingRecord) {
      const updatedRecord = { ...editingRecord, ...payload };
      onUpdateImportTpti(updatedRecord);
      triggerSync("EDIT", updatedRecord);
    } else {
      onAddImportTpti(payload);
      const generatedId = `tpti-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      triggerSync("ADD", { ...payload, id: generatedId, createdAt: new Date().toISOString() });
    }

    setIsFormOpen(false);
    resetForm();
  };

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

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDeleteImportTpti(deletingId);
      triggerSync("DELETE", { id: deletingId });
      setDeletingId(null);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return importTptis.filter((rec) => {
      const matchSearch =
        !searchTerm ||
        (rec.aolBranchName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.beNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.supplierName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.invoiceOrReferenceNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchBranch = filterBranch === "all" || rec.aolBranchName === filterBranch;
      const matchCategory = filterCategory === "all" || rec.category === filterCategory;

      let matchDate = true;
      if (startDate || endDate) {
        const targetDate = dateFilterType === "entry" ? rec.entryDate : rec.tallyDate;
        if (!targetDate) {
          matchDate = false;
        } else {
          if (startDate && targetDate < startDate) matchDate = false;
          if (endDate && targetDate > endDate) matchDate = false;
        }
      }

      return matchSearch && matchBranch && matchCategory && matchDate;
    });
  }, [importTptis, searchTerm, filterBranch, filterCategory, startDate, endDate, dateFilterType]);

  const isFiltered = Boolean(searchTerm || filterBranch !== "all" || filterCategory !== "all" || startDate || endDate);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterBranch("all");
    setFilterCategory("all");
    setStartDate("");
    setEndDate("");
  };

  // Metrics for summary footer
  const totalPurchaseQty = filteredRecords.reduce((sum, r) => sum + (r.purchaseQty || 0), 0);
  const totalAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueBEs = Array.from(new Set(filteredRecords.map((r) => r.beNo).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length;
  const uniqueSuppliers = Array.from(new Set(filteredRecords.map((r) => r.supplierName).filter(Boolean))).length;
  const uniqueInvoices = Array.from(new Set(filteredRecords.map((r) => r.invoiceOrReferenceNo).filter(Boolean))).length;
  const uniqueCategories = Array.from(new Set(filteredRecords.map((r) => r.category).filter(Boolean))).length;

  // Pagination calculations
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBranch, filterCategory, startDate, endDate, dateFilterType]);

  return (
    <div className="space-y-4">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_tpti_config"
        defaultSheetName="Import TPT-I"
        collectionKey="import_tptis"
        records={importTptis}
        activeUser={activeUser}
        moduleTitle="TPT-I Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importTptis.find((t) => (t.beNo === rec.beNo && t.invoiceOrReferenceNo === rec.invoiceOrReferenceNo && t.category === rec.category) || t.id === rec.id);
            if (existing) {
              onUpdateImportTpti({ ...existing, ...rec });
            } else {
              onAddImportTpti(rec);
            }
          });
        }}
      />

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search TPT-I..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Filter size={12} className="text-slate-400" />
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
            >
              <option value="all">All Branches</option>
              {availableBranches.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
            >
              <option value="all">All Categories</option>
              {tptdCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter Popup */}
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
            accentColor="emerald"
          />

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Action Button */}
        {isAddable && (
          <button
            onClick={handleOpenAdd}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Add TPT-I Record</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">AOL Branch</th>
                <th className="py-3 px-4 font-bold">BE No</th>
                <th className="py-3 px-4 font-bold">Product Name</th>
                <th className="py-3 px-4 font-bold">Supplier</th>
                <th className="py-3 px-4 font-bold text-right">Purchase Qty</th>
                <th className="py-3 px-4 font-bold">Tally Date</th>
                <th className="py-3 px-4 font-bold">Invoice / Ref No</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                    <Coins size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">No TPT-I records found.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Create a record using the Add TPT-I button above.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 text-slate-900 font-bold">{rec.aolBranchName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{rec.beNo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{rec.productName}</td>
                    <td className="py-3 px-4 text-slate-600">{rec.supplierName || "-"}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {rec.purchaseQty?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{rec.tallyDate}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {rec.invoiceOrReferenceNo}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {rec.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{rec.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Button */}
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-1.5 rounded border border-slate-200 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>

                        {/* Edit Button */}
                        {isEditable && (
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-1.5 rounded border border-amber-200 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}

                        {/* Delete Button */}
                        {isManagerOrAdmin ? (
                          <button
                            onClick={() => handleDeleteClick(rec.id)}
                            className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded border border-rose-200 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="text-slate-350 bg-slate-50 p-1.5 rounded border border-slate-100 cursor-not-allowed"
                            title="Manager access required to delete"
                          >
                            <Trash2 size={12} className="opacity-45" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                <tr>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueBEs} BEs</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueSuppliers} Suppliers</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      {totalPurchaseQty.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">—</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueInvoices} Invoices</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueCategories} Cats</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-extrabold text-emerald-400 block text-xs">
                      ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-slate-50/50 border-t border-slate-200 py-3 px-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Showing <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{totalItems}</span> entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-xs px-2.5 py-1 rounded transition-colors font-semibold cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`text-xs px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
                    currentPage === p
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-xs px-2.5 py-1 rounded transition-colors font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Coins size={14} className="text-emerald-400" />
                  {editingRecord ? "Edit TPT-I Record" : "Add TPT-I Record"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-700 text-xs flex items-start gap-2 font-medium">
                  <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Cascading Dropdowns */}
              <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-lg space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  BOE Selection (Cascading Dropdowns)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* AOL Branch Select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      AOL Branch <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={aolBranchName}
                      onChange={(e) => {
                        setAolBranchName(e.target.value);
                        setBeNo("");
                        setProductName("");
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
                    >
                      <option value="">-- Select --</option>
                      {availableBranches.map((br) => (
                        <option key={br} value={br}>
                          {br}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* BE NO Select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      BE No <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!aolBranchName}
                      value={beNo}
                      onChange={(e) => {
                        setBeNo(e.target.value);
                        setProductName("");
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                    >
                      <option value="">-- Select --</option>
                      {availableBeNos.map((no) => (
                        <option key={no} value={no}>
                          {no}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PRODUCT NAME Select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!aolBranchName || !beNo}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                    >
                      <option value="">-- Select --</option>
                      {availableProducts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-populated details */}
                {(aolBranchName && beNo && productName) && (
                  <div className="bg-white border border-slate-200 p-2.5 rounded-md grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                        Supplier Name
                      </span>
                      <span className="text-slate-800 font-bold block mt-0.5">
                        {supplierName || "No Supplier found"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                        Purchase Qty (from PI)
                      </span>
                      <span className="text-slate-800 font-bold font-mono block mt-0.5">
                        {purchaseQty ? purchaseQty.toLocaleString() : "-"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Core Details Form Inputs */}
              <div className="grid grid-cols-3 gap-4">
                {/* Entry Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                    Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-500 font-mono cursor-not-allowed font-semibold"
                  />
                </div>

                {/* Tally Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                    Tally Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tallyDate}
                    onChange={(e) => setTallyDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono"
                  />
                </div>

                {/* Invoice / Reference No */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                    Invoice / Reference No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Invoice / Ref No..."
                    value={invoiceOrReferenceNo}
                    onChange={(e) => setInvoiceOrReferenceNo(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Category Dropdown & Quick Add Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide text-[10px] font-mono">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  {!showQuickCategory && onAddTptdCategory && (
                    <button
                      type="button"
                      onClick={() => setShowQuickCategory(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
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
                      className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategorySubmit}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 font-bold cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategory(false)}
                      className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs hover:bg-slate-300 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold"
                >
                  <option value="">-- Select Category --</option>
                  {tptdCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount (₹) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">
                  Description
                </label>
                <textarea
                  placeholder="Enter custom remarks / description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 h-16 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Save TPT-I
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal Overlay */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 font-mono">
                <Coins size={14} className="text-emerald-400" />
                TPT-I Record Details
              </h3>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    AOL Branch
                  </span>
                  <p className="text-slate-900 font-extrabold mt-0.5">{viewingRecord.aolBranchName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    BE No
                  </span>
                  <p className="text-slate-900 font-bold font-mono mt-0.5">{viewingRecord.beNo}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                  Product Name
                </span>
                <p className="text-slate-800 font-bold mt-0.5">{viewingRecord.productName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Supplier Name
                  </span>
                  <p className="text-slate-800 font-semibold mt-0.5">{viewingRecord.supplierName || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Purchase Qty
                  </span>
                  <p className="text-slate-800 font-semibold font-mono mt-0.5">
                    {viewingRecord.purchaseQty?.toLocaleString() || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Tally Date
                  </span>
                  <p className="text-slate-800 font-mono mt-0.5">{viewingRecord.tallyDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Invoice / Ref No
                  </span>
                  <p className="text-slate-800 font-mono font-bold mt-0.5">{viewingRecord.invoiceOrReferenceNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Category
                  </span>
                  <div className="mt-1">
                    <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block">
                      {viewingRecord.category}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Amount (₹)
                  </span>
                  <p className="text-emerald-700 font-extrabold font-mono text-sm mt-0.5">
                    ₹{viewingRecord.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {viewingRecord.description && (
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide font-mono">
                    Description
                  </span>
                  <p className="text-slate-600 text-xs mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {viewingRecord.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 border border-slate-200 shadow-xl">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 font-mono flex items-center gap-1.5">
              <ShieldAlert size={15} /> Danger: Confirm Delete
            </h3>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              Are you sure you want to delete this TPT-I record? This operation is irreversible.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDeletingId(null)}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-rose-600 text-white hover:bg-rose-700 px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
