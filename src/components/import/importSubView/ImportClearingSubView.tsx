/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { User, Role, ImportClearingRecord, ImportBoeRecord, ImportContainerRecord, ClearingCat, AolBranchName } from "../../../types";
import { Plus, Search, Edit, Trash2, ShieldAlert, X, Check, Eye, Receipt, Calendar, Building2, RotateCcw } from "lucide-react";
import { DateRangeFilterPopup } from "../../DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";

interface ImportClearingSubViewProps {
  activeUserId: string;
  users: User[];
  importClearings: ImportClearingRecord[];
  importProvisionalClearings?: ImportClearingRecord[];
  importBoes: ImportBoeRecord[];
  importContainers?: ImportContainerRecord[];
  clearingCats?: ClearingCat[];
  aolBranches?: AolBranchName[];
  onAddImportClearing: (record: Omit<ImportClearingRecord, "id" | "createdAt">) => void;
  onUpdateImportClearing: (record: ImportClearingRecord) => void;
  onDeleteImportClearing: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export const calculateChargesEffect = (docType: string = "Invoice", charges: number = 0): number => {
  const numericCharge = Number(charges) || 0;
  if (numericCharge === 0) return 0;
  const absCharge = Math.abs(numericCharge);
  if (docType === "Debit Note") {
    return absCharge; // Debit is +ve of Charge
  }
  // Invoice is -ve of Charge, Credit Note is -ve of Charge
  return -absCharge;
};

export const getDocTypeLabel = (docType?: string): string => {
  if (docType === "Credit Note") return "Credit Note No";
  if (docType === "Debit Note") return "Debit Note No";
  return "Invoice No";
};

export default function ImportClearingSubView({
  activeUserId,
  users,
  importClearings,
  importProvisionalClearings = [],
  importBoes,
  importContainers = [],
  clearingCats = [],
  aolBranches = [],
  onAddImportClearing,
  onUpdateImportClearing,
  onDeleteImportClearing,
  canAdd = true,
  canEdit = true
}: ImportClearingSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || users[0];
  const isAdmin = activeUser.role === Role.Admin || activeUser.teamName === "Executive";
  const isEditable = isAdmin || canEdit !== false;
  const isAddable = isAdmin || canAdd !== false;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("All");
  const [selectedChaFilter, setSelectedChaFilter] = useState("All");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"All" | "Actual" | "Provisional">("All");

  // Date Range Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"invoice" | "tally" | "entry">("invoice");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Add form modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newIsProvisional, setNewIsProvisional] = useState(false);
  const [selectedProvisionalId, setSelectedProvisionalId] = useState("");
  const [newAolBranchName, setNewAolBranchName] = useState("");
  const [newBeNo, setNewBeNo] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newChaCfsShipping, setNewChaCfsShipping] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [newDocType, setNewDocType] = useState<string>("Invoice");
  const [newInvoiceNo, setNewInvoiceNo] = useState("");
  const [newInvoiceDate, setNewInvoiceDate] = useState("");
  const [newTallyDate, setNewTallyDate] = useState("");
  const [newEntryDate, setNewEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newCharges, setNewCharges] = useState(0);
  const [newRemark, setNewRemark] = useState("");

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<ImportClearingRecord | null>(null);

  // Background Google Sheets Sync Hook
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_clearing_config",
    "Import Clearing",
    "import_clearings"
  );

  // Inline delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ImportClearingRecord | null>(null);

  // Available branches from BOE or aolBranches
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    importBoes.forEach((b) => {
      if (b.aolBranchName) set.add(b.aolBranchName);
    });
    aolBranches.forEach((ab) => {
      if (ab.name) set.add(ab.name);
    });
    return Array.from(set);
  }, [importBoes, aolBranches]);

  // Available CHA / CFS / Shipping categories
  const availableChaCategories = useMemo(() => {
    const set = new Set<string>();
    clearingCats.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    importClearings.forEach((c) => {
      if (c.chaCfsShipping) set.add(c.chaCfsShipping);
    });
    importProvisionalClearings.forEach((c) => {
      if (c.chaCfsShipping) set.add(c.chaCfsShipping);
    });
    return Array.from(set);
  }, [clearingCats, importClearings, importProvisionalClearings]);

  // Cascading dropdown options for Add form
  const addAvailableBeNumbers = useMemo(() => {
    if (!newAolBranchName) return [];
    const set = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === newAolBranchName)
      .forEach((b) => {
        if (b.beNo) set.add(b.beNo);
      });
    return Array.from(set);
  }, [importBoes, newAolBranchName]);

  const addAvailableProducts = useMemo(() => {
    if (!newAolBranchName || !newBeNo) return [];
    const set = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === newAolBranchName && b.beNo === newBeNo)
      .forEach((b) => {
        if (b.productName) set.add(b.productName);
      });
    return Array.from(set);
  }, [importBoes, newAolBranchName, newBeNo]);

  // Cascading dropdown options for Edit modal
  const editAvailableBeNumbers = useMemo(() => {
    if (!editingRecord?.aolBranchName) return [];
    const set = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === editingRecord.aolBranchName)
      .forEach((b) => {
        if (b.beNo) set.add(b.beNo);
      });
    return Array.from(set);
  }, [importBoes, editingRecord?.aolBranchName]);

  const editAvailableProducts = useMemo(() => {
    if (!editingRecord?.aolBranchName || !editingRecord?.beNo) return [];
    const set = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === editingRecord.aolBranchName && b.beNo === editingRecord.beNo)
      .forEach((b) => {
        if (b.productName) set.add(b.productName);
      });
    return Array.from(set);
  }, [importBoes, editingRecord?.aolBranchName, editingRecord?.beNo]);

  // Helper to fetch matching BOE record
  const getMatchingBoe = (branch: string, beNo: string, productName: string) => {
    return importBoes.find(
      (b) =>
        b.aolBranchName === branch &&
        b.beNo === beNo &&
        b.productName === productName
    );
  };

  // Helper to calculate Qty from containers matching branch, beNo, productName
  const getCalculatedQty = (branch: string, beNo: string, productName: string) => {
    let total = 0;
    importContainers.forEach((c) => {
      if (
        c.aolBranchName === branch &&
        c.beNo === beNo &&
        c.productName === productName
      ) {
        total += c.containerWiseQty || 0;
      }
    });
    return total;
  };

  // Find matching provisional entries for Add form
  const matchingProvisionalEntries = useMemo(() => {
    if (newIsProvisional) return [];
    if (!newAolBranchName || !newBeNo || !newProductName || !newChaCfsShipping) return [];
    return importProvisionalClearings.filter(
      (p) =>
        p.aolBranchName === newAolBranchName &&
        p.beNo === newBeNo &&
        p.productName === newProductName &&
        p.chaCfsShipping === newChaCfsShipping
    );
  }, [importProvisionalClearings, newIsProvisional, newAolBranchName, newBeNo, newProductName, newChaCfsShipping]);

  // Find matching provisional entries for Edit modal
  const editMatchingProvisionalEntries = useMemo(() => {
    if (!editingRecord) return [];
    const isProv = editingRecord.isProvisional || editingRecord.id.startsWith("prov-");
    if (isProv) return [];
    if (!editingRecord.aolBranchName || !editingRecord.beNo || !editingRecord.productName || !editingRecord.chaCfsShipping) return [];
    return importProvisionalClearings.filter(
      (p) =>
        p.aolBranchName === editingRecord.aolBranchName &&
        p.beNo === editingRecord.beNo &&
        p.productName === editingRecord.productName &&
        p.chaCfsShipping === editingRecord.chaCfsShipping
    );
  }, [importProvisionalClearings, editingRecord?.aolBranchName, editingRecord?.beNo, editingRecord?.productName, editingRecord?.chaCfsShipping, editingRecord?.isProvisional, editingRecord?.id]);

  // Auto-select single matching provisional entry
  React.useEffect(() => {
    if (matchingProvisionalEntries.length === 1) {
      setSelectedProvisionalId(matchingProvisionalEntries[0].id);
    } else {
      setSelectedProvisionalId("");
    }
  }, [matchingProvisionalEntries]);

  const isDuplicateCombination = (
    branch: string,
    beNo: string,
    productName: string,
    chaCfsShipping: string,
    invoiceNo: string,
    excludeId?: string,
    isProv: boolean = false
  ) => {
    if (!branch || !beNo || !productName || !chaCfsShipping || !invoiceNo) return false;
    const listToSearch = isProv ? importProvisionalClearings : importClearings;
    return listToSearch.some(
      (c) =>
        c.id !== excludeId &&
        c.aolBranchName.trim().toLowerCase() === branch.trim().toLowerCase() &&
        c.beNo.trim().toLowerCase() === beNo.trim().toLowerCase() &&
        c.productName.trim().toLowerCase() === productName.trim().toLowerCase() &&
        c.chaCfsShipping.trim().toLowerCase() === chaCfsShipping.trim().toLowerCase() &&
        c.invoiceNo.trim().toLowerCase() === invoiceNo.trim().toLowerCase()
    );
  };

  const handleOpenAdd = () => {
    setNewAolBranchName(availableBranches[0] || "");
    setNewBeNo("");
    setNewProductName("");
    setNewChaCfsShipping(clearingCats[0]?.name || "");
    setNewSetName("");
    setNewDocType("Invoice");
    setNewInvoiceNo("");
    setNewInvoiceDate("");
    setNewTallyDate("");
    setNewCharges(0);
    setNewRemark("");
    setNewIsProvisional(false);
    setSelectedProvisionalId("");
    setIsAddOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIsProvisional) {
      if (!newAolBranchName || !newBeNo || !newProductName || !newChaCfsShipping) {
        alert("Please fill in AOL Branch, BE No, Product Name, and CHA / CFS / Shipping.");
        return;
      }
    } else {
      if (!newAolBranchName || !newBeNo || !newProductName || !newChaCfsShipping || !newInvoiceNo || !newSetName || !newInvoiceDate) {
        alert("Please fill in AOL Branch, BE No, Product Name, CHA / CFS / Shipping, Name, Invoice / Note No, and Invoice Date.");
        return;
      }
    }

    if (
      isDuplicateCombination(
        newAolBranchName,
        newBeNo,
        newProductName,
        newChaCfsShipping,
        newInvoiceNo,
        undefined,
        newIsProvisional
      )
    ) {
      alert(`Duplicate Notice: An entry with this AOL Branch Name, BE No, Product Name, CHA / CFS / Shipping, and Invoice No already exists in ${newIsProvisional ? 'Provisional' : 'Actual'} Clearing. Cannot add duplicate record.`);
      return;
    }

    const mappingEntry = !newIsProvisional && selectedProvisionalId
      ? importProvisionalClearings.find((p) => p.id === selectedProvisionalId)
      : null;

    const chargesVal = Number(newCharges) || 0;
    const effectVal = calculateChargesEffect(newDocType, chargesVal);

    const recordToAdd = {
      aolBranchName: newAolBranchName,
      beNo: newBeNo,
      productName: newProductName,
      chaCfsShipping: newChaCfsShipping,
      name: newSetName,
      docType: newDocType || "Invoice",
      invoiceNo: newInvoiceNo,
      invoiceDate: newInvoiceDate,
      tallyDate: newTallyDate,
      charges: chargesVal,
      chargesEffect: effectVal,
      remark: newRemark,
      entryDate: newEntryDate || new Date().toISOString().split("T")[0],
      isProvisional: newIsProvisional,
      ...(mappingEntry ? {
        provisionalMappingId: mappingEntry.id,
        provisionAmount: mappingEntry.charges || 0
      } : {}),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };

    onAddImportClearing(recordToAdd);

    const generatedId = `clr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    triggerSync("ADD", { ...recordToAdd, id: generatedId, createdAt: new Date().toISOString() });

    setIsAddOpen(false);
  };

  const handleOpenEditModal = (rec: ImportClearingRecord) => {
    if (!isEditable) {
      alert("You do not have permission to edit Clearing records.");
      return;
    }
    setEditingRecord({ 
      ...rec,
      docType: rec.docType || "Invoice"
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const isProv = editingRecord.isProvisional || editingRecord.id.startsWith("prov-");
    
    if (isProv) {
      if (!editingRecord.aolBranchName || !editingRecord.beNo || !editingRecord.productName || !editingRecord.chaCfsShipping) {
        alert("Please fill in AOL Branch, BE No, Product Name, and CHA / CFS / Shipping.");
        return;
      }
    } else {
      if (!editingRecord.aolBranchName || !editingRecord.beNo || !editingRecord.productName || !editingRecord.chaCfsShipping || !editingRecord.invoiceNo || !editingRecord.name || !editingRecord.invoiceDate) {
        alert("Please fill in AOL Branch, BE No, Product Name, CHA / CFS / Shipping, Name, Invoice / Note No, and Invoice Date.");
        return;
      }
    }

    if (
      isDuplicateCombination(
        editingRecord.aolBranchName,
        editingRecord.beNo,
        editingRecord.productName,
        editingRecord.chaCfsShipping,
        editingRecord.invoiceNo,
        editingRecord.id,
        isProv
      )
    ) {
      alert(`Duplicate Notice: An entry with this AOL Branch Name, BE No, Product Name, CHA / CFS / Shipping, and Invoice No already exists in ${isProv ? 'Provisional' : 'Actual'} Clearing. Cannot update with duplicate values.`);
      return;
    }

    const editDocType = editingRecord.docType || "Invoice";
    const editCharges = Number(editingRecord.charges) || 0;
    const editEffect = calculateChargesEffect(editDocType, editCharges);

    const updatedRecord = {
      ...editingRecord,
      docType: editDocType,
      charges: editCharges,
      chargesEffect: editEffect,
    };

    onUpdateImportClearing(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  // Consolidate actual and provisional clearings
  const consolidatedRecords = useMemo(() => {
    const actuals = importClearings.map(r => ({ ...r, isProvisional: false }));
    const provisionals = importProvisionalClearings.map(r => ({ ...r, isProvisional: true }));
    return [...actuals, ...provisionals];
  }, [importClearings, importProvisionalClearings]);

  // Filtered records for table
  const filteredRecords = consolidatedRecords.filter((rec) => {
    const isProv = rec.isProvisional || rec.id.startsWith("prov-");
    if (selectedTypeFilter === "Actual" && isProv) {
      return false;
    }
    if (selectedTypeFilter === "Provisional" && !isProv) {
      return false;
    }
    if (selectedBranchFilter !== "All" && rec.aolBranchName !== selectedBranchFilter) {
      return false;
    }
    if (selectedChaFilter !== "All" && rec.chaCfsShipping !== selectedChaFilter) {
      return false;
    }

    if (startDate || endDate) {
      const targetDate =
        dateFilterType === "invoice"
          ? rec.invoiceDate
          : dateFilterType === "tally"
          ? rec.tallyDate
          : rec.entryDate;

      if (!targetDate) return false;
      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;
    }

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const boe = getMatchingBoe(rec.aolBranchName, rec.beNo, rec.productName);
    return (
      (rec.aolBranchName && rec.aolBranchName.toLowerCase().includes(term)) ||
      (rec.beNo && rec.beNo.toLowerCase().includes(term)) ||
      (rec.productName && rec.productName.toLowerCase().includes(term)) ||
      (rec.chaCfsShipping && rec.chaCfsShipping.toLowerCase().includes(term)) ||
      (rec.name && rec.name.toLowerCase().includes(term)) ||
      (rec.docType && rec.docType.toLowerCase().includes(term)) ||
      (rec.invoiceNo && rec.invoiceNo.toLowerCase().includes(term)) ||
      (rec.remark && rec.remark.toLowerCase().includes(term)) ||
      (boe && boe.billOfLadingNo && boe.billOfLadingNo.toLowerCase().includes(term)) ||
      (boe && boe.billOfLadingDate && boe.billOfLadingDate.toLowerCase().includes(term))
    );
  });

  const isFiltered = Boolean(
    searchTerm ||
      selectedBranchFilter !== "All" ||
      selectedChaFilter !== "All" ||
      selectedTypeFilter !== "All" ||
      startDate ||
      endDate
  );

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBranchFilter("All");
    setSelectedChaFilter("All");
    setSelectedTypeFilter("All");
    setStartDate("");
    setEndDate("");
  };

  // Metrics for summary footer
  const totalChargesSum = filteredRecords.reduce((sum, r) => sum + (r.charges || 0), 0);
  const totalNetEffectSum = filteredRecords.reduce((sum, r) => {
    const currentDocType = r.docType || "Invoice";
    const eff = r.chargesEffect !== undefined ? r.chargesEffect : calculateChargesEffect(currentDocType, r.charges || 0);
    return sum + eff;
  }, 0);
  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueBEs = Array.from(new Set(filteredRecords.map((r) => r.beNo).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length;
  const uniqueChaCats = Array.from(new Set(filteredRecords.map((r) => r.chaCfsShipping).filter(Boolean))).length;
  const uniqueNames = Array.from(new Set(filteredRecords.map((r) => r.name).filter(Boolean))).length;
  const uniqueInvoices = Array.from(new Set(filteredRecords.map((r) => r.invoiceNo).filter(Boolean))).length;
  const actualCount = filteredRecords.filter((r) => !r.isProvisional && !r.id.startsWith("prov-")).length;
  const provCount = filteredRecords.length - actualCount;

  return (
    <div className="space-y-3">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_clearing_config"
        defaultSheetName="Import Clearing"
        collectionKey="import_clearings"
        records={importClearings}
        activeUser={activeUser}
        moduleTitle="Clearing Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importClearings.find((c) => (c.beNo === rec.beNo && c.invoiceNo === rec.invoiceNo && c.chaCfsShipping === rec.chaCfsShipping) || c.id === rec.id);
            if (existing) {
              onUpdateImportClearing({ ...existing, ...rec });
            } else {
              onAddImportClearing(rec);
            }
          });
        }}
      />

      {/* Search & Filter & Add Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by Branch, BE No, Product, BL No, CHA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono font-bold text-[10px] uppercase whitespace-nowrap">Branch:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
            >
              <option value="All">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* CHA / CFS / Shipping Dropdown Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono font-bold text-[10px] uppercase whitespace-nowrap">
              CHA / CFS / Shipping:
            </span>
            <select
              value={selectedChaFilter}
              onChange={(e) => setSelectedChaFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold max-w-[200px] truncate"
            >
              <option value="All">All Categories</option>
              {availableChaCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type Toggle Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono font-bold text-[10px] uppercase whitespace-nowrap">Type:</span>
            <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("All")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectedTypeFilter === "All"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("Actual")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTypeFilter === "Actual"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-emerald-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selectedTypeFilter === "Actual" ? "bg-white" : "bg-emerald-500"}`} />
                Actual
              </button>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("Provisional")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTypeFilter === "Provisional"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-amber-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selectedTypeFilter === "Provisional" ? "bg-white" : "bg-amber-500"}`} />
                Provisional
              </button>
            </div>
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
              { label: "Invoice Date", value: "invoice" },
              { label: "Tally Date", value: "tally" },
              { label: "Entry Date", value: "entry" },
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

        {/* Add Clearing Record Button */}
        {isAddable && (
          <button
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Clearing Entry</span>
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt size={36} className="mx-auto text-slate-300 mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-slate-700 uppercase font-mono">No Clearing Records Found</h4>
            <p className="text-[11px] max-w-sm mx-auto mt-1 text-slate-500">
              Create a new clearing entry linked to BOE records or adjust your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-3 pl-4 font-extrabold">Branch & BE No</th>
                  <th className="py-2.5 px-3 font-extrabold">Product Name</th>
                  <th className="py-2.5 px-3 font-extrabold">BE Date & Qty</th>
                  <th className="py-2.5 px-3 font-extrabold">BL No & BL Date</th>
                  <th className="py-2.5 px-3 font-extrabold">CHA / CFS / Shipping</th>
                  <th className="py-2.5 px-3 font-extrabold">Name</th>
                  <th className="py-2.5 px-3 font-extrabold">Invoice / DR / CR Note</th>
                  <th className="py-2.5 px-3 font-extrabold">Invoice / Note No</th>
                  <th className="py-2.5 px-3 font-extrabold">Dates & Charges</th>
                  <th className="py-2.5 px-3 font-extrabold">Remark</th>
                  <th className="py-2.5 px-3 pr-4 text-right font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const boe = getMatchingBoe(rec.aolBranchName, rec.beNo, rec.productName);
                  const calcQty = getCalculatedQty(rec.aolBranchName, rec.beNo, rec.productName);
                  const isProv = rec.isProvisional || rec.id.startsWith("prov-");
                  const currentDocType = rec.docType || "Invoice";
                  const chargesEffect = rec.chargesEffect !== undefined 
                    ? rec.chargesEffect 
                    : calculateChargesEffect(currentDocType, rec.charges || 0);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Branch & BE No */}
                      <td className="py-3 px-3 pl-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 block">{rec.beNo}</span>
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs ${
                            isProv
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}>
                            {isProv ? "Provisional" : "Actual"}
                          </span>
                          {isDuplicateCombination(rec.aolBranchName, rec.beNo, rec.productName, rec.chaCfsShipping, rec.invoiceNo, rec.id, isProv) && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded shadow-2xs">
                              Duplicate
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold inline-block mt-0.5">
                          {rec.aolBranchName}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {rec.productName}
                      </td>

                      {/* BE Date & Qty (fetched from BOE) */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block font-mono text-[11px]">
                          {boe?.beDate || "N/A"}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                          Qty: {calcQty}
                        </span>
                      </td>

                      {/* BL No & BL Date (fetched from BOE) */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {boe?.billOfLadingNo || "N/A"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {boe?.billOfLadingDate || "N/A"}
                        </span>
                      </td>

                      {/* CHA / CFS / Shipping */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block">
                          {rec.chaCfsShipping || "N/A"}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{rec.name || "N/A"}</span>
                      </td>

                      {/* Invoice / DR / CR Note */}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded inline-flex items-center gap-1 font-mono uppercase tracking-wider border shadow-2xs ${
                          currentDocType === "Debit Note"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : currentDocType === "Credit Note"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }`}>
                          {currentDocType}
                        </span>
                      </td>

                      {/* Invoice / Note No */}
                      <td className="py-3 px-3 font-mono">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          {getDocTypeLabel(currentDocType)}
                        </span>
                        <span className="font-bold text-slate-900 text-xs block mt-0.5">
                          {rec.invoiceNo || "N/A"}
                        </span>
                      </td>

                      {/* Dates & Charges */}
                      <td className="py-3 px-3">
                        <div className="text-[10px] font-mono space-y-0.5">
                          <div>Inv Dt: <span className="font-semibold">{rec.invoiceDate || "N/A"}</span></div>
                          <div>Tally Dt: <span className="font-semibold">{rec.tallyDate || "N/A"}</span></div>
                          <div className="font-bold text-slate-800">
                            Charges: ₹{rec.charges?.toLocaleString() || 0}
                          </div>
                          <div className={`font-extrabold text-[11px] flex items-center gap-1 ${
                            chargesEffect > 0
                              ? "text-emerald-700"
                              : chargesEffect < 0
                              ? "text-rose-700"
                              : "text-slate-600"
                          }`}>
                            <span>NP:</span>
                            <span>
                              {chargesEffect > 0 ? "+" : chargesEffect < 0 ? "-" : ""}₹{Math.abs(chargesEffect).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-normal opacity-75">
                              ({currentDocType === "Debit Note" ? "+ve" : "-ve"})
                            </span>
                          </div>
                          {rec.provisionAmount !== undefined && rec.provisionAmount > 0 && (
                            <div className="font-bold text-amber-700">
                              Provision: ₹{rec.provisionAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Remark */}
                      <td className="py-3 px-3 max-w-[150px] truncate text-slate-600" title={rec.remark}>
                        {rec.remark || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 pr-4 text-right">
                        {deletingId === rec.id ? (
                          <div className="flex items-center justify-end gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                            <span className="text-[10px] font-extrabold text-rose-800">Delete?</span>
                            <button
                              onClick={() => {
                                onDeleteImportClearing(rec.id);
                                triggerSync("DELETE", { id: rec.id });
                                setDeletingId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer shadow-2xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingRecord(rec)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              disabled={!isEditable}
                              className={`p-1.5 rounded transition ${
                                isEditable
                                  ? "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  : "text-slate-300 cursor-not-allowed"
                              }`}
                              title={isEditable ? "Edit Clearing Record" : "No Edit Permission"}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (!isAdmin) {
                                  alert("Only Admins are permitted to delete Clearing records.");
                                  return;
                                }
                                setDeletingId(rec.id);
                              }}
                              disabled={!isAdmin}
                              className={`p-1.5 rounded transition ${
                                isAdmin
                                  ? "text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  : "text-slate-300 cursor-not-allowed"
                              }`}
                              title={isAdmin ? "Delete Clearing Record" : "Admin Only"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredRecords.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                  <tr>
                    <td className="py-3.5 px-3 pl-4 font-mono">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                        <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                          {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                        {uniqueBranches} Branches ({actualCount} Act / {provCount} Prov)
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueBEs} BEs</span>
                    </td>
                    <td className="py-3.5 px-3 text-center">—</td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueChaCats} CHA/Cats</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueNames} Names</span>
                    </td>
                    <td className="py-3.5 px-3 text-center">—</td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueInvoices} Invoices</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <div className="text-[11px] font-bold text-emerald-400 block">
                        Chg: ₹{totalChargesSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[10px] font-extrabold ${totalNetEffectSum >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        NP: {totalNetEffectSum >= 0 ? "+" : ""}₹{totalNetEffectSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">—</td>
                    <td className="py-3.5 px-3 pr-4 text-center">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 my-8 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900 font-mono uppercase tracking-wider">
                  Add Clearing Entry
                </h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
              {isDuplicateCombination(newAolBranchName, newBeNo, newProductName, newChaCfsShipping, newInvoiceNo, undefined, newIsProvisional) && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                  <span>Duplicate Notice: An entry with this AOL Branch Name, BE No, Product Name, CHA / CFS / Shipping, and Invoice No already exists in {newIsProvisional ? 'Provisional' : 'Actual'} Clearing.</span>
                </div>
              )}

              {/* Entry Type Toggle */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                  Entry Type *
                </label>
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setNewIsProvisional(true)}
                    className={`flex-1 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                      newIsProvisional
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Provisional
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIsProvisional(false)}
                    className={`flex-1 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                      !newIsProvisional
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Actual
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* AOL Branch Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch *
                  </label>
                  <select
                    value={newAolBranchName}
                    onChange={(e) => {
                      setNewAolBranchName(e.target.value);
                      setNewBeNo("");
                      setNewProductName("");
                    }}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  >
                    <option value="">-- Select Branch --</option>
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BE NO (Cascaded from BOE) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE NO *
                  </label>
                  <select
                    value={newBeNo}
                    onChange={(e) => {
                      setNewBeNo(e.target.value);
                      setNewProductName("");
                    }}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                    disabled={!newAolBranchName}
                  >
                    <option value="">-- Select BE NO --</option>
                    {addAvailableBeNumbers.map((be) => (
                      <option key={be} value={be}>
                        {be}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Name (Cascaded from BOE) */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name *
                  </label>
                  <select
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                    disabled={!newBeNo}
                  >
                    <option value="">-- Select Product --</option>
                    {addAvailableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CHA / CFS / Shipping (Dropdown from ClearingCat) */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                  CHA / CFS / Shipping *
                </label>
                <select
                  value={newChaCfsShipping}
                  onChange={(e) => setNewChaCfsShipping(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Select Clearing Category --</option>
                  {clearingCats.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provisional Entry Mapping Option */}
              {!newIsProvisional && matchingProvisionalEntries.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex flex-col gap-2 animate-fade-in">
                  <label className="text-[10px] font-bold font-mono text-amber-800 uppercase block tracking-wider">
                    Map with Provisional Clearing Entry
                  </label>
                  <select
                    value={selectedProvisionalId}
                    onChange={(e) => setSelectedProvisionalId(e.target.value)}
                    className="w-full text-xs border border-amber-300 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-amber-500 outline-none font-semibold text-slate-800"
                  >
                    <option value="">-- Select Mapping (Optional) --</option>
                    {matchingProvisionalEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} - Inv: {entry.invoiceNo} (Charges: ₹{entry.charges?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {selectedProvisionalId && (() => {
                    const selectedProv = matchingProvisionalEntries.find(p => p.id === selectedProvisionalId);
                    if (!selectedProv) return null;
                    return (
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white/80 px-3 py-1.5 rounded border border-amber-100 mt-1">
                        <span>Mapped Provision Amount:</span>
                        <span className="text-amber-700 font-mono">
                          ₹{selectedProv.charges?.toLocaleString() || 0}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Name & Invoice / DR / CR Note & Dynamic Invoice No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Name {newIsProvisional ? "" : "*"}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter clearing name..."
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!newIsProvisional}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Invoice / DR / CR Note *
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="Invoice">Invoice</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    {getDocTypeLabel(newDocType)} {newIsProvisional ? "" : "*"}
                  </label>
                  <input
                    type="text"
                    placeholder={`Enter ${newDocType === "Credit Note" ? "credit note" : newDocType === "Debit Note" ? "debit note" : "invoice"} no...`}
                    value={newInvoiceNo}
                    onChange={(e) => setNewInvoiceNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!newIsProvisional}
                  />
                </div>
              </div>

              {/* Invoice Date & Tally Date & Charges & Charges Effect */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto)</span>
                  </label>
                  <input
                    type="date"
                    value={newEntryDate}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-2.5 py-2 rounded-lg font-semibold text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Invoice Date {newIsProvisional ? "" : "*"}
                  </label>
                  <input
                    type="date"
                    value={newInvoiceDate}
                    onChange={(e) => setNewInvoiceDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!newIsProvisional}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Tally Date *
                  </label>
                  <input
                    type="date"
                    value={newTallyDate}
                    onChange={(e) => setNewTallyDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Charges (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newCharges}
                    onChange={(e) => setNewCharges(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Charges Effect (₹)
                  </label>
                  {(() => {
                    const effect = calculateChargesEffect(newDocType, newCharges);
                    return (
                      <div className={`text-xs px-2.5 py-1.5 rounded-lg font-mono font-bold border min-h-[38px] flex flex-col justify-center ${
                        effect > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : effect < 0
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        <div className="flex items-center gap-1 leading-tight">
                          <span>{effect > 0 ? "+" : effect < 0 ? "-" : ""}₹{Math.abs(effect).toLocaleString()}</span>
                        </div>
                        <span className="text-[9px] font-normal opacity-75 leading-tight block">
                          {newDocType === "Debit Note" ? "(Debit: +ve)" : newDocType === "Credit Note" ? "(Credit: -ve)" : "(Invoice: -ve)"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                  Remark
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter remarks..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Check size={15} /> {newIsProvisional ? "Save Clearing provisional Entry" : "Save Clearing Actual Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (() => {
        const isProv = editingRecord.isProvisional || editingRecord.id.startsWith("prov-");
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 my-8 flex flex-col gap-4 animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 font-mono uppercase tracking-wider">
                    Edit {isProv ? "Provisional" : "Actual"} Clearing Entry
                  </h3>
                </div>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
                {isDuplicateCombination(editingRecord.aolBranchName, editingRecord.beNo, editingRecord.productName, editingRecord.chaCfsShipping, editingRecord.invoiceNo, editingRecord.id, isProv) && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-semibold">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                    <span>Duplicate Notice: An entry with this AOL Branch Name, BE No, Product Name, CHA / CFS / Shipping, and Invoice No already exists in {isProv ? 'Provisional' : 'Actual'} Clearing.</span>
                  </div>
                )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* AOL Branch */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch *
                  </label>
                  <select
                    value={editingRecord.aolBranchName}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        aolBranchName: e.target.value,
                        beNo: "",
                        productName: "",
                      })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  >
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BE NO */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE NO *
                  </label>
                  <select
                    value={editingRecord.beNo}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        beNo: e.target.value,
                        productName: "",
                      })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  >
                    {editAvailableBeNumbers.map((be) => (
                      <option key={be} value={be}>
                        {be}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name *
                  </label>
                  <select
                    value={editingRecord.productName}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, productName: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
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

              {/* CHA / CFS / Shipping */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                  CHA / CFS / Shipping *
                </label>
                <select
                  value={editingRecord.chaCfsShipping}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, chaCfsShipping: e.target.value })
                  }
                  className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  {clearingCats.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Edit Provisional Entry Mapping Option */}
              {!isProv && editMatchingProvisionalEntries.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col gap-2 animate-fade-in">
                  <label className="text-[10px] font-bold font-mono text-amber-800 uppercase block tracking-wider">
                    Map with Provisional Clearing Entry
                  </label>
                  <select
                    value={editingRecord.provisionalMappingId || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedProv = editMatchingProvisionalEntries.find(p => p.id === selectedId);
                      setEditingRecord({
                        ...editingRecord,
                        provisionalMappingId: selectedId,
                        provisionAmount: selectedProv ? (selectedProv.charges || 0) : 0
                      });
                    }}
                    className="w-full text-xs border border-amber-300 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-amber-500 outline-none font-semibold text-slate-800"
                  >
                    <option value="">-- Select Mapping (Optional) --</option>
                    {editMatchingProvisionalEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} - Inv: {entry.invoiceNo} (Charges: ₹{entry.charges?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {editingRecord.provisionalMappingId && (() => {
                    const selectedProv = editMatchingProvisionalEntries.find(p => p.id === editingRecord.provisionalMappingId);
                    if (!selectedProv) return null;
                    return (
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white/80 px-3 py-1.5 rounded border border-amber-100 mt-1">
                        <span>Mapped Provision Amount:</span>
                        <span className="text-amber-700 font-mono">
                          ₹{selectedProv.charges?.toLocaleString() || 0}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Name & Invoice / DR / CR Note & Dynamic Invoice No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Name {isProv ? "" : "*"}
                  </label>
                  <input
                    type="text"
                    value={editingRecord.name}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, name: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!isProv}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Invoice / DR / CR Note *
                  </label>
                  <select
                    value={editingRecord.docType || "Invoice"}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, docType: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="Invoice">Invoice</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    {getDocTypeLabel(editingRecord.docType)} {isProv ? "" : "*"}
                  </label>
                  <input
                    type="text"
                    placeholder={`Enter ${editingRecord.docType === "Credit Note" ? "credit note" : editingRecord.docType === "Debit Note" ? "debit note" : "invoice"} no...`}
                    value={editingRecord.invoiceNo}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, invoiceNo: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!isProv}
                  />
                </div>
              </div>

              {/* Invoice Date & Tally Date & Charges & Charges Effect */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-2.5 py-2 rounded-lg font-semibold text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Invoice Date {isProv ? "" : "*"}
                  </label>
                  <input
                    type="date"
                    value={editingRecord.invoiceDate}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, invoiceDate: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!isProv}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Tally Date *
                  </label>
                  <input
                    type="date"
                    value={editingRecord.tallyDate}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, tallyDate: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Charges (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingRecord.charges}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        charges: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Charges Effect (₹)
                  </label>
                  {(() => {
                    const editEffect = calculateChargesEffect(editingRecord.docType || "Invoice", editingRecord.charges || 0);
                    return (
                      <div className={`text-xs px-2.5 py-1.5 rounded-lg font-mono font-bold border min-h-[38px] flex flex-col justify-center ${
                        editEffect > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : editEffect < 0
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        <div className="flex items-center gap-1 leading-tight">
                          <span>{editEffect > 0 ? "+" : editEffect < 0 ? "-" : ""}₹{Math.abs(editEffect).toLocaleString()}</span>
                        </div>
                        <span className="text-[9px] font-normal opacity-75 leading-tight block">
                          {(editingRecord.docType || "Invoice") === "Debit Note" ? "(Debit: +ve)" : (editingRecord.docType || "Invoice") === "Credit Note" ? "(Credit: -ve)" : "(Invoice: -ve)"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                  Remark
                </label>
                <textarea
                  rows={2}
                  value={editingRecord.remark || ""}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, remark: e.target.value })
                  }
                  className="w-full text-xs border border-slate-200 bg-white px-2.5 py-2 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Check size={15} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* View Details Modal */}
      {viewingRecord && (() => {
        const boe = getMatchingBoe(viewingRecord.aolBranchName, viewingRecord.beNo, viewingRecord.productName);
        const calcQty = getCalculatedQty(viewingRecord.aolBranchName, viewingRecord.beNo, viewingRecord.productName);
        const isDuplicate = isDuplicateCombination(viewingRecord.aolBranchName, viewingRecord.beNo, viewingRecord.productName, viewingRecord.chaCfsShipping, viewingRecord.invoiceNo, viewingRecord.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Clearing Record Details</h3>
                    <p className="text-[11px] text-slate-300 font-mono">BE No: {viewingRecord.beNo} ({viewingRecord.aolBranchName})</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
                {isDuplicate && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                    <span>Duplicate Notice: This entry shares the same AOL Branch Name, BE No, Product Name, CHA / CFS / Shipping, and Invoice No with another clearing record.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Branch Name</span>
                    <span className="font-bold text-slate-800">{viewingRecord.aolBranchName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE No</span>
                    <span className="font-extrabold text-slate-900 font-mono">{viewingRecord.beNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Product Name</span>
                    <span className="font-bold text-slate-900">{viewingRecord.productName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE Date</span>
                    <span className="font-semibold text-slate-800 font-mono">{boe?.beDate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Quantity</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono inline-block">{calcQty}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">CHA / CFS / Shipping</span>
                    <span className="font-bold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded inline-block">{viewingRecord.chaCfsShipping || "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Name / Agency</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">{viewingRecord.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Invoice / DR / CR Note</span>
                    <span className={`font-extrabold px-2 py-0.5 rounded text-xs inline-block mt-0.5 border ${
                      (viewingRecord.docType || "Invoice") === "Debit Note"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : (viewingRecord.docType || "Invoice") === "Credit Note"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}>
                      {viewingRecord.docType || "Invoice"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">{getDocTypeLabel(viewingRecord.docType)}</span>
                    <span className="font-mono font-bold text-slate-800 text-sm block mt-0.5">{viewingRecord.invoiceNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Invoice Date</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.invoiceDate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Tally Date</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.tallyDate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Bill of Lading No & Date</span>
                    <span className="font-semibold text-slate-800 block">{boe?.billOfLadingNo || "N/A"}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{boe?.billOfLadingDate || ""}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Entry Type</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] inline-block mt-1 ${
                      viewingRecord.isProvisional || viewingRecord.id.startsWith("prov-")
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}>
                      {viewingRecord.isProvisional || viewingRecord.id.startsWith("prov-") ? "Provisional" : "Actual"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Charges (₹)</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">₹{viewingRecord.charges?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Charges Effect (₹)</span>
                    {(() => {
                      const effect = viewingRecord.chargesEffect !== undefined
                        ? viewingRecord.chargesEffect
                        : calculateChargesEffect(viewingRecord.docType || "Invoice", viewingRecord.charges || 0);
                      return (
                        <div className="mt-0.5">
                          <span className={`font-mono font-bold text-sm block ${
                            effect > 0
                              ? "text-emerald-700"
                              : effect < 0
                              ? "text-rose-700"
                              : "text-slate-600"
                          }`}>
                            {effect > 0 ? "+" : effect < 0 ? "-" : ""}₹{Math.abs(effect).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {(viewingRecord.docType || "Invoice") === "Debit Note" ? "(Debit: +ve of charge)" : "(Invoice/Credit: -ve of charge)"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  {viewingRecord.provisionAmount !== undefined && viewingRecord.provisionAmount > 0 && (
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Mapped Provision (₹)</span>
                      <span className="font-bold text-amber-700 text-sm block mt-0.5">₹{viewingRecord.provisionAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {viewingRecord.remark && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Remark</span>
                    <p className="text-slate-700 whitespace-pre-wrap">{viewingRecord.remark}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
