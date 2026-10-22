/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { User, Role, ImportDrcRecord, ImportPiRecord, ImportLcRecord, AolBranchName, SupplierName, PaymentBank, DrcBankChargesType, DrcBankCharges1 } from "../../../types";
import { Plus, Search, Edit, Trash2, ShieldAlert, X, Eye, Coins, RotateCcw, Calculator, KeyRound } from "lucide-react";
import { DateRangeFilterPopup } from "../../Configuration/DateRangeFilterPopup";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../Configuration/AppsScriptSyncBanner";

interface ImportDrcSubViewProps {
  activeUserId: string;
  users: User[];
  importDrcs: ImportDrcRecord[];
  importPis: ImportPiRecord[];
  importLcs: ImportLcRecord[];
  aolBranches: AolBranchName[];
  suppliers: SupplierName[];
  paymentBanks: PaymentBank[];
  drcBankChargesTypes: DrcBankChargesType[];
  drcBankCharges1List: DrcBankCharges1[];
  onAddImportDrc: (record: Omit<ImportDrcRecord, "id" | "createdAt">) => void;
  onUpdateImportDrc: (record: ImportDrcRecord) => void;
  onDeleteImportDrc: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export interface DrcKeyOption {
  key: string;
  branch: string;
  piNo: string;
  productName: string;
  label: string;
}

// Helper to check if bank charges type is DRC
export const isDrcChargesType = (type?: string): boolean => {
  if (!type) return false;
  const t = type.trim().toLowerCase();
  return (
    t === "drc" ||
    t === "drc charges" ||
    t === "drc charge" ||
    t.startsWith("drc")
  );
};
// Backward compatibility alias if imported elsewhere
export const isDrcOrLcChargesType = isDrcChargesType;

export default function ImportDrcSubView({
  activeUserId,
  users,
  importDrcs,
  importPis,
  importLcs,
  aolBranches,
  paymentBanks,
  drcBankChargesTypes,
  drcBankCharges1List,
  onAddImportDrc,
  onUpdateImportDrc,
  onDeleteImportDrc,
  canAdd = true,
  canEdit = true
}: ImportDrcSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.teamName === "Executive";
  const isManagerOrAdmin = isAdmin || activeUser?.role === Role.SeniorManager || activeUser?.role === Role.Manager;
  const isAddable = isAdmin || canAdd !== false;
  const isEditable = isAdmin || canEdit !== false;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("All");
  const [selectedBankChargesTypeFilter, setSelectedBankChargesTypeFilter] = useState("All");

  // Date Range Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"entry" | "tally">("entry");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Background Google Sheets Sync Hook
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_drc_config",
    "Import DRC",
    "import_drcs"
  );

  // Key combinations from importPis: (Branch, PI No, Product Name)
  const availableKeyOptions = useMemo(() => {
    const list: DrcKeyOption[] = [];
    const seenKeys = new Set<string>();

    importPis.forEach((pi) => {
      if (!pi.aolBranchName || !pi.piNo) return;

      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        pi.products.forEach((prod) => {
          if (!prod.productName) return;
          const key = `${pi.aolBranchName}___${pi.piNo}___${prod.productName}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({
              key,
              branch: pi.aolBranchName,
              piNo: pi.piNo,
              productName: prod.productName,
              label: `${pi.aolBranchName} | ${pi.piNo} | ${prod.productName}`,
            });
          }
        });
      } else if (pi.productName) {
        const key = `${pi.aolBranchName}___${pi.piNo}___${pi.productName}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          list.push({
            key,
            branch: pi.aolBranchName,
            piNo: pi.piNo,
            productName: pi.productName,
            label: `${pi.aolBranchName} | ${pi.piNo} | ${pi.productName}`,
          });
        }
      }
    });

    return list;
  }, [importPis]);

  // Bank Charges Types Options (ensuring DRC & LC Charges are available)
  const bankChargesTypeOptions = useMemo(() => {
    const set = new Set<string>(["DRC", "LC Charges"]);
    drcBankChargesTypes.forEach((t) => {
      if (t.name) set.add(t.name);
    });
    importDrcs.forEach((d) => {
      if (d.bankChargesType) set.add(d.bankChargesType);
    });
    return Array.from(set);
  }, [drcBankChargesTypes, importDrcs]);

  // Create Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSelectedKey, setNewSelectedKey] = useState("");
  const [newEntryDate, setNewEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newBranch, setNewBranch] = useState("");
  const [newPiNo, setNewPiNo] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newPurchaseQty, setNewPurchaseQty] = useState("");
  const [newTotalUsd, setNewTotalUsd] = useState("");
  const [newLcType, setNewLcType] = useState("LC");
  const [newLcOpenBank, setNewLcOpenBank] = useState("");
  const [newLcNo, setNewLcNo] = useState("");
  const [newTallyDate, setNewTallyDate] = useState(new Date().toISOString().split("T")[0]);
  const [newBankName, setNewBankName] = useState("");
  const [newUsdPayment, setNewUsdPayment] = useState("");
  const [newAdviceNoRefNo, setNewAdviceNoRefNo] = useState("");
  const [newBankChargesType, setNewBankChargesType] = useState("DRC");
  const [newBanksCharges1, setNewBanksCharges1] = useState("");
  const [newCharges1, setNewCharges1] = useState("");
  const [newBanksCharges2, setNewBanksCharges2] = useState("");
  const [newCharges2, setNewCharges2] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportDrcRecord | null>(null);
  const [editingSelectedKey, setEditingSelectedKey] = useState("");

  // View Details Modal State
  const [viewingRecord, setViewingRecord] = useState<ImportDrcRecord | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Available branches from PI & dropdowns
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    importPis.forEach((pi) => {
      if (pi.aolBranchName) set.add(pi.aolBranchName);
    });
    aolBranches.forEach((b) => {
      if (b.name) set.add(b.name);
    });
    return Array.from(set);
  }, [importPis, aolBranches]);

  // Available Bank Charges Types for filtering
  const availableBankChargesTypes = useMemo(() => {
    const set = new Set<string>(["DRC", "LC Charges"]);
    drcBankChargesTypes.forEach((t) => {
      if (t.name) set.add(t.name);
    });
    importDrcs.forEach((d) => {
      if (d.bankChargesType) set.add(d.bankChargesType);
    });
    return Array.from(set).sort();
  }, [drcBankChargesTypes, importDrcs]);

  // Helper to calculate Pending USD & Max Allowed Payment for given branch, piNo, productName, bankChargesType, payment amount, and optional excludeId
  const calculatePendingUsd = (
    branch: string,
    piNo: string,
    prodName: string,
    bankChargesType: string,
    currentPmt: number,
    excludeRecordId?: string,
    fallbackTotalUsd?: number
  ) => {
    // Only calculate for DRC (not LC Charges or other types)
    const isApplicable = isDrcChargesType(bankChargesType);

    // 1. Find Total USD from PI for this branch, piNo, prodName
    let totalPiUsd = 0;
    const matchingPi = importPis.find(
      (pi) => pi.aolBranchName === branch && pi.piNo === piNo
    );
    if (matchingPi) {
      if (matchingPi.products && Array.isArray(matchingPi.products)) {
        const found = matchingPi.products.find((p) => p.productName === prodName);
        if (found) totalPiUsd = Number(found.totalUsd) || 0;
      } else if (matchingPi.productName === prodName) {
        totalPiUsd = Number(matchingPi.totalUsd) || 0;
      }
    }

    const effectiveTotalUsd = totalPiUsd > 0 ? totalPiUsd : (Number(fallbackTotalUsd) || 0);

    // 2. Sum previously paid USD across other DRC entries with DRC type
    const previousPaidUsd = isApplicable
      ? importDrcs
          .filter(
            (d) =>
              d.id !== excludeRecordId &&
              d.aolBranchName === branch &&
              d.piNo === piNo &&
              d.productName === prodName &&
              isDrcChargesType(d.bankChargesType)
          )
          .reduce((sum, d) => sum + (Number(d.usdPayment) || 0), 0)
      : 0;

    const availablePending = Math.max(0, effectiveTotalUsd - previousPaidUsd);
    const currentPmtUsd = Number(currentPmt) || 0;
    const pendingUsd = isApplicable
      ? Math.max(0, availablePending - currentPmtUsd)
      : 0;

    // Max allowed payment logic:
    // - On DRC (where pending calculation applies): Payment amount must not be more than available pending amount
    // - In other cases: Payment amount must not be more than Total USD
    const maxAllowedPmt = isApplicable ? availablePending : effectiveTotalUsd;

    return {
      isApplicable,
      totalUsd: effectiveTotalUsd,
      previousPaidUsd,
      availablePending,
      currentPmtUsd,
      pendingUsd,
      maxAllowedPmt,
    };
  };

  // Auto-populate Supplier, QTY, Total USD, LC details when key is selected
  const handleKeySelect = (keyStr: string, isEdit = false) => {
    if (isEdit) {
      setEditingSelectedKey(keyStr);
    } else {
      setNewSelectedKey(keyStr);
    }

    const found = availableKeyOptions.find((opt) => opt.key === keyStr);
    if (!found) {
      if (!isEdit) {
        setNewBranch("");
        setNewPiNo("");
        setNewProductName("");
        setNewSupplierName("");
        setNewPurchaseQty("");
        setNewTotalUsd("");
        setNewLcType("LC");
        setNewLcOpenBank("");
        setNewLcNo("");
      }
      return;
    }

    const { branch, piNo, productName } = found;

    // Lookup matching PI
    const matchingPi = importPis.find(
      (pi) => pi.aolBranchName === branch && pi.piNo === piNo
    );

    let supplier = "";
    let qty = 0;
    let totUsd = 0;

    if (matchingPi) {
      supplier = matchingPi.supplierName || "";
      if (matchingPi.products && Array.isArray(matchingPi.products)) {
        const pFound = matchingPi.products.find((p) => p.productName === productName);
        if (pFound) {
          qty = Number(pFound.purchaseQty) || 0;
          totUsd = Number(pFound.totalUsd) || 0;
        }
      } else if (matchingPi.productName === productName) {
        qty = Number(matchingPi.purchaseQty) || 0;
        totUsd = Number(matchingPi.totalUsd) || 0;
      }
    }

    // Lookup matching LC
    const matchingLc = importLcs.find(
      (lc) => lc.aolBranchName === branch && lc.piNo === piNo && lc.productName === productName
    );
    const lcType = matchingLc ? (matchingLc.lcType || "LC") : "NON LC";
    const lcOpenBank = matchingLc ? (matchingLc.lcBankName || matchingLc.bankName || "") : "";
    const lcNo = matchingLc ? (matchingLc.lcNoRefNo || "") : "";

    if (isEdit && editingRecord) {
      setEditingRecord({
        ...editingRecord,
        aolBranchName: branch,
        piNo,
        productName,
        supplierName: supplier,
        purchaseQty: qty,
        totalUsd: totUsd,
        lcType,
        lcOpenBank,
        lcNo,
      });
    } else {
      setNewBranch(branch);
      setNewPiNo(piNo);
      setNewProductName(productName);
      setNewSupplierName(supplier);
      setNewPurchaseQty(qty ? qty.toString() : "");
      setNewTotalUsd(totUsd ? totUsd.toString() : "");
      setNewLcType(lcType);
      setNewLcOpenBank(lcOpenBank);
      setNewLcNo(lcNo);
    }
  };

  // Duplicate combination check: AOL Branch Name, PI No, Product Name, and Advice No / Reference No
  const isDuplicateCombination = (branch: string, piNo: string, productName: string, adviceNoRefNo: string, excludeId?: string) => {
    if (!branch || !piNo || !productName || !adviceNoRefNo) return false;
    return importDrcs.some(
      (d) =>
        d.id !== excludeId &&
        String(d.aolBranchName || "").trim().toLowerCase() === String(branch || "").trim().toLowerCase() &&
        String(d.piNo || "").trim().toLowerCase() === String(piNo || "").trim().toLowerCase() &&
        String(d.productName || "").trim().toLowerCase() === String(productName || "").trim().toLowerCase() &&
        String(d.adviceNoRefNo || "").trim().toLowerCase() === String(adviceNoRefNo || "").trim().toLowerCase()
    );
  };

  const handleOpenAdd = () => {
    const defaultKeyOption = availableKeyOptions[0];
    const defaultKey = defaultKeyOption ? defaultKeyOption.key : "";
    setNewSelectedKey(defaultKey);

    if (defaultKeyOption) {
      handleKeySelect(defaultKey, false);
    } else {
      setNewBranch("");
      setNewPiNo("");
      setNewProductName("");
      setNewSupplierName("");
      setNewPurchaseQty("");
      setNewTotalUsd("");
      setNewLcType("LC");
      setNewLcOpenBank("");
      setNewLcNo("");
    }

    setNewAdviceNoRefNo("");
    setNewEntryDate(new Date().toISOString().split("T")[0]);
    setNewTallyDate(new Date().toISOString().split("T")[0]);
    setNewBankName(paymentBanks[0]?.bankName || "");
    setNewUsdPayment("");
    setNewBankChargesType(bankChargesTypeOptions[0] || "DRC");
    setNewBanksCharges1(drcBankCharges1List[0]?.name || "");
    setNewCharges1("");
    setNewBanksCharges2(drcBankCharges1List[0]?.name || "");
    setNewCharges2("");
    setNewDescription("");
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch || !newPiNo || !newProductName || !newAdviceNoRefNo) {
      alert("Please select a Key (Branch, PI No, Product Name) and enter Advice No / Reference No.");
      return;
    }

    if (isDuplicateCombination(newBranch, newPiNo, newProductName, newAdviceNoRefNo)) {
      alert("Duplicate Notice: An entry with this AOL Branch Name, PI No, Product Name, and Advice No / Reference No already exists. Cannot add duplicate record.");
      return;
    }

    const paymentNum = Number(newUsdPayment) || 0;
    if (paymentNum < 0) {
      alert("Payment Amount cannot be negative.");
      return;
    }

    const pendingCalc = calculatePendingUsd(
      newBranch,
      newPiNo,
      newProductName,
      newBankChargesType,
      paymentNum,
      undefined,
      Number(newTotalUsd) || 0
    );

    if (pendingCalc.maxAllowedPmt > 0 && paymentNum > pendingCalc.maxAllowedPmt + 0.0001) {
      alert(
        `Payment Amount ($${paymentNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) cannot exceed ${
          pendingCalc.isApplicable ? "available pending amount" : "Total USD"
        } ($${pendingCalc.maxAllowedPmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
      );
      return;
    }

    const recordToAdd = {
      aolBranchName: newBranch,
      piNo: newPiNo,
      productName: newProductName,
      supplierName: newSupplierName,
      purchaseQty: Number(newPurchaseQty) || 0,
      totalUsd: Number(newTotalUsd) || 0,
      pendingUsd: pendingCalc.isApplicable ? pendingCalc.pendingUsd : undefined,
      lcType: newLcType,
      lcOpenBank: newLcOpenBank,
      lcNo: newLcNo,
      adviceNoRefNo: newAdviceNoRefNo,
      tallyDate: newTallyDate,
      bankName: newBankName,
      usdPayment: paymentNum,
      bankChargesType: newBankChargesType,
      banksCharges1: newBanksCharges1,
      charges1: Number(newCharges1) || 0,
      banksCharges2: newBanksCharges2,
      charges2: Number(newCharges2) || 0,
      description: newDescription,
      entryDate: newEntryDate || new Date().toISOString().split("T")[0],
      createdByUserId: activeUserId,
      createdByName: activeUser?.name || "User"
    };

    onAddImportDrc(recordToAdd);

    const generatedId = `drc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    triggerSync("ADD", { ...recordToAdd, id: generatedId, createdAt: new Date().toISOString() });

    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (rec: ImportDrcRecord) => {
    const key = `${rec.aolBranchName}___${rec.piNo}___${rec.productName}`;
    setEditingSelectedKey(key);
    setEditingRecord({ ...rec });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (isDuplicateCombination(editingRecord.aolBranchName, editingRecord.piNo, editingRecord.productName, editingRecord.adviceNoRefNo || "", editingRecord.id)) {
      alert("Duplicate Notice: An entry with this AOL Branch Name, PI No, Product Name, and Advice No / Reference No already exists. Cannot update with duplicate values.");
      return;
    }

    const paymentNum = Number(editingRecord.usdPayment) || 0;
    if (paymentNum < 0) {
      alert("Payment Amount cannot be negative.");
      return;
    }

    const pendingCalc = calculatePendingUsd(
      editingRecord.aolBranchName,
      editingRecord.piNo,
      editingRecord.productName,
      editingRecord.bankChargesType,
      paymentNum,
      editingRecord.id,
      Number(editingRecord.totalUsd) || 0
    );

    if (pendingCalc.maxAllowedPmt > 0 && paymentNum > pendingCalc.maxAllowedPmt + 0.0001) {
      alert(
        `Payment Amount ($${paymentNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) cannot exceed ${
          pendingCalc.isApplicable ? "available pending amount" : "Total USD"
        } ($${pendingCalc.maxAllowedPmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
      );
      return;
    }

    const updatedRecord = {
      ...editingRecord,
      usdPayment: paymentNum,
      pendingUsd: pendingCalc.isApplicable ? pendingCalc.pendingUsd : undefined,
    };

    onUpdateImportDrc(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  const filteredRecords = importDrcs.filter((rec) => {
    if (selectedBranchFilter !== "All" && rec.aolBranchName !== selectedBranchFilter) {
      return false;
    }
    if (selectedBankChargesTypeFilter !== "All" && rec.bankChargesType !== selectedBankChargesTypeFilter) {
      return false;
    }

    if (startDate || endDate) {
      const targetDate = dateFilterType === "entry" ? rec.entryDate : rec.tallyDate;
      if (!targetDate) return false;
      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${rec.aolBranchName} ${rec.piNo} ${rec.productName} ${rec.supplierName} ${rec.lcNo} ${rec.bankName} ${rec.bankChargesType || ""} ${rec.description || ""}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const isFiltered = Boolean(
    searchQuery.trim() ||
      selectedBranchFilter !== "All" ||
      selectedBankChargesTypeFilter !== "All" ||
      startDate ||
      endDate
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedBranchFilter("All");
    setSelectedBankChargesTypeFilter("All");
    setStartDate("");
    setEndDate("");
  };

  // Metrics for summary footer
  const totalPurchaseQty = filteredRecords.reduce((sum, r) => sum + (Number(r.purchaseQty) || 0), 0);
  const totalUsdPmt = filteredRecords.reduce((sum, r) => sum + (Number(r.usdPayment) || 0), 0);
  const totalCharges1Sum = filteredRecords.reduce((sum, r) => sum + (Number(r.charges1) || 0), 0);
  const totalCharges2Sum = filteredRecords.reduce((sum, r) => sum + (Number(r.charges2) || 0), 0);
  const totalAllCharges = totalCharges1Sum + totalCharges2Sum;
  const totalPendingUsd = filteredRecords.reduce((sum, r) => {
    if (r.pendingUsd !== undefined && isDrcChargesType(r.bankChargesType)) return sum + Number(r.pendingUsd);
    if (isDrcChargesType(r.bankChargesType)) {
      const calc = calculatePendingUsd(r.aolBranchName, r.piNo, r.productName, r.bankChargesType, r.usdPayment, r.id, r.totalUsd);
      return sum + calc.pendingUsd;
    }
    return sum;
  }, 0);

  const uniqueBranches = Array.from(new Set(filteredRecords.map((r) => r.aolBranchName).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(filteredRecords.map((r) => r.productName).filter(Boolean))).length;
  const uniqueAdvices = Array.from(new Set(filteredRecords.map((r) => r.adviceNoRefNo).filter(Boolean))).length;
  const uniqueSuppliers = Array.from(new Set(filteredRecords.map((r) => r.supplierName).filter(Boolean))).length;
  const uniqueLCs = Array.from(new Set(filteredRecords.map((r) => r.lcNo).filter(Boolean))).length;
  const uniqueBanks = Array.from(new Set(filteredRecords.map((r) => r.bankName).filter(Boolean))).length;

  // Active calculation for current create form
  const currentCreatePendingCalc = useMemo(() => {
    return calculatePendingUsd(
      newBranch,
      newPiNo,
      newProductName,
      newBankChargesType,
      Number(newUsdPayment) || 0,
      undefined,
      Number(newTotalUsd) || 0
    );
  }, [newBranch, newPiNo, newProductName, newBankChargesType, newUsdPayment, newTotalUsd, importPis, importDrcs]);

  // Active calculation for current edit form
  const currentEditPendingCalc = useMemo(() => {
    if (!editingRecord) return { isApplicable: false, totalUsd: 0, previousPaidUsd: 0, availablePending: 0, currentPmtUsd: 0, pendingUsd: 0, maxAllowedPmt: 0 };
    return calculatePendingUsd(
      editingRecord.aolBranchName,
      editingRecord.piNo,
      editingRecord.productName,
      editingRecord.bankChargesType,
      Number(editingRecord.usdPayment) || 0,
      editingRecord.id,
      Number(editingRecord.totalUsd) || 0
    );
  }, [editingRecord, importPis, importDrcs]);

  return (
    <div className="flex flex-col gap-4">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_drc_config"
        defaultSheetName="Import DRC"
        collectionKey="import_drcs"
        records={importDrcs}
        activeUser={activeUser}
        moduleTitle="DRC Google Sheet Sync"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importDrcs.find((d) => (d.piNo === rec.piNo && d.adviceNoRefNo === rec.adviceNoRefNo && d.bankChargesType === rec.bankChargesType) || d.id === rec.id);
            if (existing) {
              onUpdateImportDrc({ ...existing, ...rec });
            } else {
              onAddImportDrc(rec);
            }
          });
        }}
      />

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Branch, PI No, Product, Supplier, LC No..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Branch:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Bank Charges Type:</span>
            <select
              value={selectedBankChargesTypeFilter}
              onChange={(e) => setSelectedBankChargesTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Types</option>
              {availableBankChargesTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
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

        {isAddable && (
          <button
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus size={15} /> Add DRC Entry
          </button>
        )}
      </div>

      {/* Table view */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 pl-4">Branch & PI No</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Advice / Ref No</th>
                <th className="py-3 px-3">Supplier & Qty</th>
                <th className="py-3 px-3">LC Details</th>
                <th className="py-3 px-3">Payment & Bank</th>
                <th className="py-3 px-3">Pending USD</th>
                <th className="py-3 px-3">Charges</th>
                <th className="py-3 px-3">Remark</th>
                <th className="py-3 px-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 text-xs font-mono">
                    No DRC records found. Click "Add DRC Entry" to create one.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isDuplicate = isDuplicateCombination(rec.aolBranchName, rec.piNo, rec.productName, rec.adviceNoRefNo || "", rec.id);
                  const isDrcType = isDrcChargesType(rec.bankChargesType);
                  const displayPendingUsd = rec.pendingUsd !== undefined && isDrcType
                    ? rec.pendingUsd
                    : (isDrcType ? calculatePendingUsd(rec.aolBranchName, rec.piNo, rec.productName, rec.bankChargesType, rec.usdPayment, rec.id, rec.totalUsd).pendingUsd : null);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 pl-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 font-mono">{rec.piNo}</span>
                          {isDuplicate && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                              Duplicate
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold inline-block mt-0.5">
                          {rec.aolBranchName}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">{rec.productName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-800">{rec.adviceNoRefNo || "—"}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{rec.supplierName || "N/A"}</span>
                        <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">
                          Qty: {rec.purchaseQty?.toLocaleString()} | ${rec.totalUsd?.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{rec.lcType || "N/A"}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">Bank: {rec.lcOpenBank || "N/A"}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">No: {rec.lcNo || "N/A"}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-700 block">${rec.usdPayment?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</span>
                        <span className="text-[10px] font-mono text-slate-600 block">{rec.bankName}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">Tally: {rec.tallyDate}</span>
                      </td>
                      <td className="py-3 px-3">
                        {isDrcType ? (
                          <div>
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              (displayPendingUsd || 0) > 0
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}>
                              ${(displayPendingUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 uppercase tracking-wider font-mono">
                              {(displayPendingUsd || 0) > 0 ? "Pending" : "Fully Paid"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono italic">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div className="font-bold text-slate-800">{rec.bankChargesType}</div>
                          {rec.banksCharges1 && (
                            <div className="text-slate-600">{rec.banksCharges1}: ₹{rec.charges1?.toLocaleString()}</div>
                          )}
                          {rec.banksCharges2 && (
                            <div className="text-slate-600">{rec.banksCharges2}: ₹{rec.charges2?.toLocaleString()}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600 truncate max-w-[150px] block" title={rec.description}>
                          {rec.description || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingRecord(rec)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {isEditable && (
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50 transition cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {isManagerOrAdmin && (
                            <button
                              onClick={() => setDeletingId(rec.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
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
                  <td className="py-3.5 px-3 pl-4 font-mono">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                      <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                        {filteredRecords.length} {filteredRecords.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{uniqueBranches} Branches</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueAdvices} Advices</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueSuppliers} Suppliers</span>
                    <span className="font-extrabold text-emerald-400 block text-xs mt-0.5">
                      {totalPurchaseQty.toLocaleString("en-IN")} Kg
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueLCs} LCs</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[11px] text-slate-300 block">{uniqueBanks} Banks</span>
                    <span className="font-extrabold text-emerald-400 block text-xs mt-0.5">
                      ${totalUsdPmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-[10px] text-slate-400 block">Pending USD</span>
                    <span className="font-extrabold text-amber-300 block text-xs mt-0.5">
                      ${totalPendingUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    <span className="font-extrabold text-amber-300 block text-xs">
                      ₹{totalAllCharges.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">—</td>
                  <td className="py-3.5 px-3 pr-4 text-center">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Add New DRC Entry</h3>
                  <p className="text-[11px] text-slate-300 font-mono">Select Key (Branch, PI No, Product Name) to auto-fill details</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              {isDuplicateCombination(newBranch, newPiNo, newProductName, newAdviceNoRefNo) && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                  <span>Duplicate Notice: An entry with this Branch, PI No, Product Name, and Advice No / Reference No already exists in DRC.</span>
                </div>
              )}

              {/* Key Combination Selector */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950 uppercase">
                    <KeyRound size={14} className="text-emerald-600" />
                    <span>Select Key (Branch, PI No, Product Name) *</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">Auto-populates Branch, PI No & Product</span>
                </div>

                <select
                  value={newSelectedKey}
                  onChange={(e) => handleKeySelect(e.target.value, false)}
                  required
                  className="w-full text-xs bg-white border border-emerald-300 rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono shadow-2xs"
                >
                  <option value="">-- Choose Key (Branch | PI No | Product Name) --</option>
                  {availableKeyOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
                    AOL Branch Name <span className="text-emerald-600 font-normal">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={newBranch}
                    readOnly
                    disabled
                    placeholder="Auto from Key"
                    className="w-full text-xs bg-slate-100 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
                    PI No <span className="text-emerald-600 font-normal">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={newPiNo}
                    readOnly
                    disabled
                    placeholder="Auto from Key"
                    className="w-full text-xs bg-slate-100 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
                    Product Name <span className="text-emerald-600 font-normal">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={newProductName}
                    readOnly
                    disabled
                    placeholder="Auto from Key"
                    className="w-full text-xs bg-slate-100 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Advice No / Ref No *</label>
                  <input
                    type="text"
                    value={newAdviceNoRefNo}
                    onChange={(e) => setNewAdviceNoRefNo(e.target.value)}
                    placeholder="Advice / Ref No"
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Auto populated PI & LC details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Supplier Name</span>
                  <span className="font-bold text-slate-900">{newSupplierName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Purchase QTY</span>
                  <span className="font-bold text-blue-700">{newPurchaseQty ? Number(newPurchaseQty).toLocaleString() : "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Total USD</span>
                  <span className="font-bold text-blue-700">${newTotalUsd ? Number(newTotalUsd).toLocaleString() : "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">LC / NON LC</span>
                  <span className="font-bold text-slate-900">{newLcType || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">LC Open Bank</span>
                  <span className="font-bold text-slate-900">{newLcOpenBank || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">LC No</span>
                  <span className="font-bold text-slate-900 font-mono">{newLcNo || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Entry Date <span className="text-slate-400 font-normal">(Readonly)</span></label>
                  <input
                    type="date"
                    value={newEntryDate}
                    readOnly
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-300 rounded-lg p-2 font-medium outline-none text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Tally Date *</label>
                  <input
                    type="date"
                    value={newTallyDate}
                    onChange={(e) => setNewTallyDate(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Name *</label>
                  <select
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Bank</option>
                    {paymentBanks.map((b) => (
                      <option key={b.id} value={b.bankName}>{b.bankName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">
                    Payment Amount ($) *
                    {currentCreatePendingCalc.maxAllowedPmt > 0 && (
                      <span className="text-slate-400 font-normal ml-1">
                        (Max: ${currentCreatePendingCalc.maxAllowedPmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={currentCreatePendingCalc.maxAllowedPmt > 0 ? currentCreatePendingCalc.maxAllowedPmt : undefined}
                    value={newUsdPayment}
                    onChange={(e) => setNewUsdPayment(e.target.value)}
                    placeholder="0.00"
                    required
                    className={`w-full text-xs bg-white border rounded-lg p-2 font-medium outline-none font-mono ${
                      currentCreatePendingCalc.maxAllowedPmt > 0 && Number(newUsdPayment) > currentCreatePendingCalc.maxAllowedPmt + 0.0001
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/30 text-rose-900"
                        : "border-slate-300 focus:ring-1 focus:ring-emerald-500"
                    }`}
                  />
                  {currentCreatePendingCalc.maxAllowedPmt > 0 && Number(newUsdPayment) > currentCreatePendingCalc.maxAllowedPmt + 0.0001 && (
                    <span className="text-[10px] font-bold text-rose-600 block mt-1">
                      ⚠️ Cannot exceed {currentCreatePendingCalc.isApplicable ? "pending amount" : "Total USD"} (${currentCreatePendingCalc.maxAllowedPmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
              </div>

              {/* Bank Charges & Pending USD Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Charges Type *</label>
                  <select
                    value={newBankChargesType}
                    onChange={(e) => setNewBankChargesType(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {bankChargesTypeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Pending USD Field */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">
                    Pending USD ($) {currentCreatePendingCalc.isApplicable ? (
                      <span className="text-emerald-600 font-normal">(Calculated for DRC only)</span>
                    ) : (
                      <span className="text-slate-400 font-normal">(N/A for other types)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={
                        currentCreatePendingCalc.isApplicable
                          ? `$${currentCreatePendingCalc.pendingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "— (Only for DRC)"
                      }
                      className={`w-full text-xs border rounded-lg p-2 font-mono font-bold cursor-not-allowed ${
                        currentCreatePendingCalc.isApplicable
                          ? currentCreatePendingCalc.pendingUsd > 0
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-slate-100 border-slate-300 text-slate-400"
                      }`}
                    />
                  </div>
                </div>

                {/* Calculation Details Helper */}
                {currentCreatePendingCalc.isApplicable && (
                  <div className="sm:col-span-2 bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-lg text-[11px] font-mono text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calculator size={13} className="text-emerald-700 shrink-0" />
                      <span>
                        Total: <strong>${currentCreatePendingCalc.totalUsd.toLocaleString()}</strong> − Prev Paid: <strong>${currentCreatePendingCalc.previousPaidUsd.toLocaleString()}</strong> − This Pmt: <strong>${currentCreatePendingCalc.currentPmtUsd.toLocaleString()}</strong>
                      </span>
                    </div>
                    <div>
                      = Pending: <strong className="text-emerald-800 font-bold">${currentCreatePendingCalc.pendingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Charges 1</label>
                    <select
                      value={newBanksCharges1}
                      onChange={(e) => setNewBanksCharges1(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Charge 1</option>
                      {drcBankCharges1List.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Charges 1 (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={newCharges1}
                      onChange={(e) => setNewCharges1(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Charges 2</label>
                    <select
                      value={newBanksCharges2}
                      onChange={(e) => setNewBanksCharges2(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Charge 2</option>
                      {drcBankCharges1List.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Charges 2 (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={newCharges2}
                      onChange={(e) => setNewCharges2(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Description / Remark</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Enter any additional details..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Save DRC Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Edit DRC Entry</h3>
                  <p className="text-[11px] text-slate-300 font-mono">PI: {editingRecord.piNo} ({editingRecord.aolBranchName})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              {isDuplicateCombination(editingRecord.aolBranchName, editingRecord.piNo, editingRecord.productName, editingRecord.adviceNoRefNo || "", editingRecord.id) && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                  <span>Duplicate Notice: An entry with this Branch, PI No, Product Name, and Advice No / Reference No already exists in DRC.</span>
                </div>
              )}

              {/* Key Combination Selector in Edit */}
              <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-950 uppercase">
                    <KeyRound size={14} className="text-amber-600" />
                    <span>Change Key (Branch, PI No, Product Name)</span>
                  </label>
                  <span className="text-[11px] text-amber-700 font-medium">Auto-populates Branch, PI No & Product</span>
                </div>

                <select
                  value={editingSelectedKey}
                  onChange={(e) => handleKeySelect(e.target.value, true)}
                  className="w-full text-xs bg-white border border-amber-300 rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-mono shadow-2xs"
                >
                  <option value="">-- Select Key (Branch | PI No | Product Name) --</option>
                  {availableKeyOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Branch Name</span>
                  <span className="font-bold text-slate-900">{editingRecord.aolBranchName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">PI No</span>
                  <span className="font-extrabold text-slate-900 font-mono">{editingRecord.piNo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Product Name</span>
                  <span className="font-bold text-slate-900">{editingRecord.productName}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Advice No / Ref No *</label>
                  <input
                    type="text"
                    value={editingRecord.adviceNoRefNo || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, adviceNoRefNo: e.target.value })}
                    placeholder="Advice / Ref No"
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Entry Date <span className="text-slate-400 font-normal">(Readonly)</span></label>
                  <input
                    type="date"
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    readOnly
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-300 rounded-lg p-2 font-medium outline-none text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Tally Date *</label>
                  <input
                    type="date"
                    value={editingRecord.tallyDate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, tallyDate: e.target.value })}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Name *</label>
                  <select
                    value={editingRecord.bankName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, bankName: e.target.value })}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Bank</option>
                    {paymentBanks.map((b) => (
                      <option key={b.id} value={b.bankName}>{b.bankName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">
                    Payment Amount ($) *
                    {currentEditPendingCalc.maxAllowedPmt > 0 && (
                      <span className="text-slate-400 font-normal ml-1">
                        (Max: ${currentEditPendingCalc.maxAllowedPmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={currentEditPendingCalc.maxAllowedPmt > 0 ? currentEditPendingCalc.maxAllowedPmt : undefined}
                    value={editingRecord.usdPayment}
                    onChange={(e) => setEditingRecord({ ...editingRecord, usdPayment: Number(e.target.value) })}
                    required
                    className={`w-full text-xs bg-white border rounded-lg p-2 font-medium outline-none font-mono ${
                      currentEditPendingCalc.maxAllowedPmt > 0 && Number(editingRecord.usdPayment) > currentEditPendingCalc.maxAllowedPmt + 0.0001
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/30 text-rose-900"
                        : "border-slate-300 focus:ring-1 focus:ring-emerald-500"
                    }`}
                  />
                  {currentEditPendingCalc.maxAllowedPmt > 0 && Number(editingRecord.usdPayment) > currentEditPendingCalc.maxAllowedPmt + 0.0001 && (
                    <span className="text-[10px] font-bold text-rose-600 block mt-1">
                      ⚠️ Cannot exceed {currentEditPendingCalc.isApplicable ? "pending amount" : "Total USD"} (${currentEditPendingCalc.maxAllowedPmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Charges Type *</label>
                  <select
                    value={editingRecord.bankChargesType}
                    onChange={(e) => setEditingRecord({ ...editingRecord, bankChargesType: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {bankChargesTypeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Pending USD Field */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">
                    Pending USD ($) {currentEditPendingCalc.isApplicable ? (
                      <span className="text-emerald-600 font-normal">(Calculated for DRC only)</span>
                    ) : (
                      <span className="text-slate-400 font-normal">(N/A for other types)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={
                      currentEditPendingCalc.isApplicable
                        ? `$${currentEditPendingCalc.pendingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "— (Only for DRC)"
                    }
                    className={`w-full text-xs border rounded-lg p-2 font-mono font-bold cursor-not-allowed ${
                      currentEditPendingCalc.isApplicable
                        ? currentEditPendingCalc.pendingUsd > 0
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-slate-100 border-slate-300 text-slate-400"
                    }`}
                  />
                </div>

                {/* Calculation Details Helper */}
                {currentEditPendingCalc.isApplicable && (
                  <div className="sm:col-span-2 bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-lg text-[11px] font-mono text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calculator size={13} className="text-emerald-700 shrink-0" />
                      <span>
                        Total: <strong>${currentEditPendingCalc.totalUsd.toLocaleString()}</strong> − Prev Paid: <strong>${currentEditPendingCalc.previousPaidUsd.toLocaleString()}</strong> − This Pmt: <strong>${currentEditPendingCalc.currentPmtUsd.toLocaleString()}</strong>
                      </span>
                    </div>
                    <div>
                      = Pending: <strong className="text-emerald-800 font-bold">${currentEditPendingCalc.pendingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Charges 1</label>
                    <select
                      value={editingRecord.banksCharges1}
                      onChange={(e) => setEditingRecord({ ...editingRecord, banksCharges1: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Charge 1</option>
                      {drcBankCharges1List.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Charges 1 (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.charges1}
                      onChange={(e) => setEditingRecord({ ...editingRecord, charges1: Number(e.target.value) })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Bank Charges 2</label>
                    <select
                      value={editingRecord.banksCharges2}
                      onChange={(e) => setEditingRecord({ ...editingRecord, banksCharges2: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Charge 2</option>
                      {drcBankCharges1List.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Charges 2 (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.charges2}
                      onChange={(e) => setEditingRecord({ ...editingRecord, charges2: Number(e.target.value) })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase mb-1">Description / Remark</label>
                <textarea
                  value={editingRecord.description || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, description: e.target.value })}
                  rows={2}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Update DRC Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">DRC Entry Details</h3>
                  <p className="text-[11px] text-slate-300 font-mono">PI No: {viewingRecord.piNo} ({viewingRecord.aolBranchName})</p>
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
              {isDuplicateCombination(viewingRecord.aolBranchName, viewingRecord.piNo, viewingRecord.productName, viewingRecord.adviceNoRefNo || "", viewingRecord.id) && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                  <span>Duplicate Notice: This entry shares the same Branch, PI No, Product Name, and Advice No / Reference No with another DRC record.</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Branch Name</span>
                  <span className="font-bold text-slate-800">{viewingRecord.aolBranchName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">PI No</span>
                  <span className="font-extrabold text-slate-900 font-mono">{viewingRecord.piNo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Product Name</span>
                  <span className="font-bold text-slate-900">{viewingRecord.productName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Advice / Ref No</span>
                  <span className="font-mono font-bold text-slate-800">{viewingRecord.adviceNoRefNo || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Supplier Name</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.supplierName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Purchase Qty</span>
                  <span className="font-bold text-blue-700 font-mono">{viewingRecord.purchaseQty?.toLocaleString() || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Total USD</span>
                  <span className="font-bold text-blue-700 font-mono">${viewingRecord.totalUsd?.toLocaleString() || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Pending USD</span>
                  <span className="font-bold text-amber-700 font-mono">
                    {isDrcChargesType(viewingRecord.bankChargesType) ? (
                      `$${(viewingRecord.pendingUsd !== undefined ? viewingRecord.pendingUsd : calculatePendingUsd(viewingRecord.aolBranchName, viewingRecord.piNo, viewingRecord.productName, viewingRecord.bankChargesType, viewingRecord.usdPayment, viewingRecord.id, viewingRecord.totalUsd).pendingUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">LC / NON LC</span>
                  <span className="font-bold text-slate-900">{viewingRecord.lcType || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">LC Open Bank</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.lcOpenBank || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">LC No</span>
                  <span className="font-mono font-bold text-slate-800">{viewingRecord.lcNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Tally Date</span>
                  <span className="font-semibold text-slate-800 font-mono">{viewingRecord.tallyDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Bank Name</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Payment Amount</span>
                  <span className="font-bold text-emerald-700 font-mono">${viewingRecord.usdPayment?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Bank Charges Type</span>
                  <span className="font-bold text-slate-800">{viewingRecord.bankChargesType || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Charges 1</span>
                  <span className="font-bold text-slate-800 font-mono">{viewingRecord.banksCharges1 || "N/A"} (₹{viewingRecord.charges1?.toLocaleString() || 0})</span>
                </div>
                {viewingRecord.banksCharges2 && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Charges 2</span>
                    <span className="font-bold text-slate-800 font-mono">{viewingRecord.banksCharges2} (₹{viewingRecord.charges2?.toLocaleString() || 0})</span>
                  </div>
                )}
              </div>

              {viewingRecord.description && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Description</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{viewingRecord.description}</p>
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
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Delete DRC Entry</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete this record?</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteImportDrc(deletingId);
                  triggerSync("DELETE", { id: deletingId });
                  setDeletingId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
