/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { ImportBoeRecord, ImportPiRecord, ImportContainerRecord, User, AolBranchName, SupplierName, Product, Role, FreightTerm } from "../../../types";
import { Plus, Search, Trash2, Edit, FileText, Calendar, ShieldAlert, Eye, EyeOff, Building2, Layers, Check, X, Receipt, Calculator, DollarSign, Tag, FileCheck, ArrowUpRight, Container, PackageCheck, Package, FileSpreadsheet } from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../AppsScriptSyncBanner";
import ImportBoeBulkImportModal from "../ImportBoeBulkImportModal";

interface ImportBoeSubViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importBoes: ImportBoeRecord[];
  importContainers?: ImportContainerRecord[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  products?: Product[];
  freightTerms?: FreightTerm[];
  onAddImportBoe: (record: Omit<ImportBoeRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportBoe: (record: ImportBoeRecord) => void;
  onDeleteImportBoe: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportBoeSubView({
  activeUserId,
  users,
  importPis,
  importBoes,
  importContainers = [],
  aolBranches = [],
  suppliers = [],
  products = [],
  freightTerms = [],
  onAddImportBoe,
  onUpdateImportBoe,
  onDeleteImportBoe,
  canAdd = true,
  canEdit = true
}: ImportBoeSubViewProps) {
  // Check Admin / Edit / Add Permission
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.role === ("Admin" as Role);
  const isEditable = isAdmin || canEdit !== false;
  const isAddable = isAdmin || canAdd !== false;

  // FOB / CIF Terms Options derived from List Management + defaults
  const termsOptions = useMemo(() => {
    const defaults = ["FOB", "CIF", "CFR"];
    const custom = (freightTerms || []).map((t) => t.name).filter(Boolean);
    return Array.from(new Set([...defaults, ...custom]));
  }, [freightTerms]);

  // Helper to determine read-only status for Freight INR & Insurance INR
  // CIF: Both Freight INR & Insurance INR read-only
  // CFR: Only Freight INR read-only; Insurance INR open
  // FOB (and others): Both Freight INR & Insurance INR open
  const getTermReadOnlyStatus = (term: string) => {
    const upper = (term || "").trim().toUpperCase();
    if (upper === "CIF" || upper.includes("CIF")) {
      return { isFreightReadOnly: true, isInsuranceReadOnly: true, reason: "CIF" };
    }
    if (upper === "CFR" || upper.includes("CFR")) {
      return { isFreightReadOnly: true, isInsuranceReadOnly: false, reason: "CFR" };
    }
    return { isFreightReadOnly: false, isInsuranceReadOnly: false, reason: "" };
  };

  // Form State for Creating BOE Entry
  const [aolBranchName, setAolBranchName] = useState<string>("");
  const [piNo, setPiNo] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [fobCif, setFobCif] = useState<string>("FOB");
  const [freightUsd, setFreightUsd] = useState<string>("");
  const [insuranceUsd, setInsuranceUsd] = useState<string>("");
  const [beNo, setBeNo] = useState<string>("");
  const [beDate, setBeDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [boeExRate, setBoeExRate] = useState<string>("");
  const [beQuery, setBeQuery] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [lotBatchNumber, setLotBatchNumber] = useState<string>("");
  const [billOfLadingNo, setBillOfLadingNo] = useState<string>("");
  const [billOfLadingDate, setBillOfLadingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [portOfLoading, setPortOfLoading] = useState<string>("");

  // UI Toggle States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [selectedFobCifFilter, setSelectedFobCifFilter] = useState<string>("ALL");
  const [selectedContainerStatusFilter, setSelectedContainerStatusFilter] = useState<string>("ALL");
  const [hiddenBoeRowIds, setHiddenBoeRowIds] = useState<Record<string, boolean>>({});
  const [areAllBoeHidden, setAreAllBoeHidden] = useState<boolean>(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportBoeRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ImportBoeRecord | null>(null);
  const [deletingBoeId, setDeletingBoeId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook (Dedicated Sub-tab Config)
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_boe_config",
    "Import BOE",
    "import_boes",
    "import_boe_duty_config"
  );

  // Calculate next sequential Record ID (BOE-#) based on maximum existing ID number
  const getTrackedNextBoeId = (offset: number = 0) => {
    let maxNum = 0;
    importBoes.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^BOE-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const baseNum = maxNum > 0 ? maxNum : importBoes.length;
    const nextNum = baseNum + 1 + offset;
    return `BOE-${nextNum}`;
  };

  // Helper to calculate container statistics & completion status for a BOE record
  const getBoeContainerStats = (boe: ImportBoeRecord) => {
    const matchingContainers = (importContainers || []).filter(
      (c) =>
        String(c.aolBranchName || "").trim().toLowerCase() === String(boe.aolBranchName || "").trim().toLowerCase() &&
        String(c.beNo || "").trim().toLowerCase() === String(boe.beNo || "").trim().toLowerCase() &&
        (!c.piNo || String(c.piNo || "").trim().toLowerCase() === String(boe.piNo || "").trim().toLowerCase()) &&
        String(c.invoiceNumber || "").trim().toLowerCase() === String(boe.invoiceNumber || "").trim().toLowerCase() &&
        String(c.productName || "").trim().toLowerCase() === String(boe.productName || "").trim().toLowerCase()
    );

    const containerCount = matchingContainers.length;
    const loggedQty = matchingContainers.reduce(
      (sum, c) => sum + parseNumericVal(c.containerWiseQty),
      0
    );

    // Get PI purchase quantity for target: prefer boe.purchaseQty if > 0
    let targetQty = parseNumericVal(boe.purchaseQty);
    if (targetQty <= 0) {
      const cleanBranch = String(boe.aolBranchName || "").trim().toLowerCase();
      const cleanPi = String(boe.piNo || "").trim().toLowerCase();
      const cleanProd = String(boe.productName || "").trim().toLowerCase();

      const matchingPis = importPis.filter(
        (p) =>
          String(p.aolBranchName || "").trim().toLowerCase() === cleanBranch &&
          String(p.piNo || "").trim().toLowerCase() === cleanPi
      );
      const seenProdItemIds = new Set<string>();
      matchingPis.forEach((pi) => {
        if (pi.products && Array.isArray(pi.products)) {
          pi.products.forEach((p, idx) => {
            const pKey = p.id || `${pi.id}_${idx}_${p.productName}`;
            if (
              !seenProdItemIds.has(pKey) &&
              (p.productName || "").trim().toLowerCase() === cleanProd
            ) {
              seenProdItemIds.add(pKey);
              targetQty += parseNumericVal(p.purchaseQty ?? (p as any).qty ?? (p as any).quantity);
            }
          });
        } else if ((pi.productName || "").trim().toLowerCase() === cleanProd) {
          const pKey = pi.id || `${pi.piNo}_${pi.productName}`;
          if (!seenProdItemIds.has(pKey)) {
            seenProdItemIds.add(pKey);
            targetQty += parseNumericVal(pi.purchaseQty ?? pi.totalPurchaseQty);
          }
        }
      });
    }

    const isCompleted = targetQty > 0 ? loggedQty >= targetQty : containerCount > 0;
    const isPending = containerCount === 0;
    const isInProgress = containerCount > 0 && !isCompleted;

    return {
      containerCount,
      loggedQty,
      targetQty,
      isCompleted,
      isPending,
      isInProgress,
      remainingQty: Math.max(0, targetQty - loggedQty)
    };
  };

  // Clear Freight & Insurance when switching terms in Create Form
  useEffect(() => {
    const status = getTermReadOnlyStatus(fobCif);
    if (status.isFreightReadOnly) {
      setFreightUsd("0");
    }
    if (status.isInsuranceReadOnly) {
      setInsuranceUsd("0");
    }
  }, [fobCif]);

  // Clear Freight & Insurance when switching terms in Edit Modal
  useEffect(() => {
    if (editingRecord) {
      const status = getTermReadOnlyStatus(editingRecord.fobCif);
      if (status.isFreightReadOnly || status.isInsuranceReadOnly) {
        setEditingRecord((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            freightUsd: status.isFreightReadOnly ? 0 : prev.freightUsd,
            insuranceUsd: status.isInsuranceReadOnly ? 0 : prev.insuranceUsd
          };
        });
      }
    }
  }, [editingRecord?.fobCif]);

  // ==========================================
  // DYNAMIC DROPDOWN LOGIC FOR CREATE FORM
  // ==========================================

  // 1. AOL Branch Dropdown Options (Derived strictly from created "PI" sub-tab entries)
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    importPis.forEach((pi) => {
      if (pi.aolBranchName) {
        branchSet.add(pi.aolBranchName);
      }
    });
    return Array.from(branchSet);
  }, [importPis]);

  // Set default AOL Branch when options update
  useEffect(() => {
    if (availableBranches.length > 0) {
      if (!aolBranchName || !availableBranches.includes(aolBranchName)) {
        setAolBranchName(availableBranches[0]);
      }
    } else {
      setAolBranchName("");
    }
  }, [availableBranches]);

  // 2. PI No Dropdown Options (Filtered for selected AOL Branch; hides PIs if BOE details are saved for ALL products)
  const availablePiNumbers = useMemo(() => {
    if (!aolBranchName) return [];
    const piSet = new Set<string>();

    importPis
      .filter((pi) => pi.aolBranchName === aolBranchName)
      .forEach((pi) => {
        if (!pi.piNo) return;

        const piProducts = (pi.products && pi.products.length > 0)
          ? pi.products.map((p) => p.productName)
          : (pi.productName ? [pi.productName] : []);

        const savedBoes = importBoes.filter(
          (boe) => boe.aolBranchName === aolBranchName && boe.piNo === pi.piNo
        );
        const savedProductSet = new Set(savedBoes.map((boe) => boe.productName));

        // Hide PI if BOE details are saved for ALL products in this PI
        const isAllSaved = piProducts.length > 0 && piProducts.every((p) => savedProductSet.has(p));

        if (!isAllSaved) {
          piSet.add(pi.piNo);
        }
      });
    return Array.from(piSet);
  }, [importPis, importBoes, aolBranchName]);

  // Set default PI No when selected branch changes or options update
  useEffect(() => {
    if (availablePiNumbers.length > 0) {
      if (!piNo || !availablePiNumbers.includes(piNo)) {
        setPiNo(availablePiNumbers[0]);
      }
    } else {
      setPiNo("");
    }
  }, [availablePiNumbers]);

  // 3. Product Name Dropdown Options (Filtered for selected AOL Branch + PI No; excludes products with existing BOE)
  const availableProducts = useMemo(() => {
    if (!aolBranchName || !piNo) return [];
    const prodSet = new Set<string>();

    const matchingPis = importPis.filter(
      (pi) => pi.aolBranchName === aolBranchName && pi.piNo === piNo
    );

    const savedBoes = importBoes.filter(
      (boe) => boe.aolBranchName === aolBranchName && boe.piNo === piNo
    );
    const savedProductSet = new Set(savedBoes.map((boe) => boe.productName));

    matchingPis.forEach((pi) => {
      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        pi.products.forEach((prod) => {
          if (prod.productName && !savedProductSet.has(prod.productName)) {
            prodSet.add(prod.productName);
          }
        });
      } else if (pi.productName && !savedProductSet.has(pi.productName)) {
        prodSet.add(pi.productName);
      }
    });

    return Array.from(prodSet);
  }, [importPis, importBoes, aolBranchName, piNo]);

  // Set default Product Name when selected PI No changes or options update
  useEffect(() => {
    if (availableProducts.length > 0) {
      if (!productName || !availableProducts.includes(productName)) {
        setProductName(availableProducts[0]);
      }
    } else {
      setProductName("");
    }
  }, [availableProducts]);

  // Helper to robustly parse numeric values from numbers or strings
  const parseNumericVal = (val: unknown): number => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const str = String(val).replace(/,/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Helper to find exact PI Product Details across all matching PI records
  const getPiProductDetails = (
    pis: ImportPiRecord[],
    branch: string,
    piNumber: string,
    product: string
  ) => {
    if (!branch || !piNumber || !product) {
      return { usdPmt: 0, purchaseQty: 0, totalUsd: 0, supplierName: "", mfg: "", port: "" };
    }

    const cleanBranch = (branch || "").trim().toLowerCase();
    const cleanPi = (piNumber || "").trim().toLowerCase();
    const cleanProd = (product || "").trim().toLowerCase();
    const normProd = cleanProd.replace(/[^a-zA-Z0-9]/g, "");

    const isProdMatch = (candidateName: unknown): boolean => {
      if (!candidateName) return false;
      const c = String(candidateName).trim().toLowerCase();
      if (c === cleanProd) return true;
      if (normProd && c.replace(/[^a-zA-Z0-9]/g, "") === normProd) return true;
      return false;
    };

    // Filter all PIs matching Branch and PI No (case-insensitive & trimmed)
    const matchingPis = pis.filter(
      (pi) =>
        String(pi.aolBranchName || "").trim().toLowerCase() === cleanBranch &&
        String(pi.piNo || "").trim().toLowerCase() === cleanPi
    );

    let fallbackSupplier = "";
    let fallbackMfg = "";
    let fallbackPort = "";

    // 1. Search across all matching PIs for the specific product
    for (const pi of matchingPis) {
      if (!fallbackSupplier && pi.supplierName) fallbackSupplier = pi.supplierName;
      if (!fallbackMfg && pi.mfg) fallbackMfg = pi.mfg;
      if (!fallbackPort && pi.port) fallbackPort = pi.port;

      // Check inside products array
      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        const matchedItem = pi.products.find((p) => isProdMatch(p.productName));
        if (matchedItem) {
          const usdPmt = parseNumericVal(
            matchedItem.usdPmt ??
              (matchedItem as any).usd_pmt ??
              (matchedItem as any).rate ??
              (matchedItem as any).price ??
              (matchedItem as any).usdPrice
          );
          const purchaseQty = parseNumericVal(
            matchedItem.purchaseQty ??
              (matchedItem as any).qty ??
              (matchedItem as any).quantity ??
              (matchedItem as any).purchase_qty ??
              (matchedItem as any).purchase ??
              (matchedItem as any).containerQty
          );
          let totalUsd = parseNumericVal(
            matchedItem.totalUsd ??
              (matchedItem as any).total_usd ??
              (matchedItem as any).grandTotalUsd ??
              (matchedItem as any).amount
          );
          if (totalUsd === 0 && usdPmt > 0 && purchaseQty > 0) {
            totalUsd = (usdPmt * purchaseQty) / 1000;
          }
          return {
            usdPmt,
            purchaseQty,
            totalUsd,
            supplierName: pi.supplierName || fallbackSupplier || "N/A",
            mfg: pi.mfg || fallbackMfg || "N/A",
            port: pi.port || fallbackPort || "N/A"
          };
        }
      }

      // Check top-level product name (legacy or single product per record)
      if (isProdMatch(pi.productName)) {
        const usdPmt = parseNumericVal(
          pi.usdPmt ??
            (pi as any).usd_pmt ??
            (pi as any).rate ??
            (pi as any).price
        );
        const purchaseQty = parseNumericVal(
          pi.purchaseQty ??
            pi.totalPurchaseQty ??
            (pi as any).qty ??
            (pi as any).quantity ??
            (pi as any).purchase_qty
        );
        let totalUsd = parseNumericVal(
          pi.totalUsd ??
            pi.grandTotalUsd ??
            (pi as any).total_usd ??
            (pi as any).amount
        );
        if (totalUsd === 0 && usdPmt > 0 && purchaseQty > 0) {
          totalUsd = (usdPmt * purchaseQty) / 1000;
        }
        return {
          usdPmt,
          purchaseQty,
          totalUsd,
          supplierName: pi.supplierName || fallbackSupplier || "N/A",
          mfg: pi.mfg || fallbackMfg || "N/A",
          port: pi.port || fallbackPort || "N/A"
        };
      }
    }

    // 2. Loose fallback: Search matching PI No if branch name formatting varies
    const looseMatchingPis = pis.filter(
      (pi) => String(pi.piNo || "").trim().toLowerCase() === cleanPi
    );
    for (const pi of looseMatchingPis) {
      if (!fallbackSupplier && pi.supplierName) fallbackSupplier = pi.supplierName;
      if (!fallbackMfg && pi.mfg) fallbackMfg = pi.mfg;
      if (!fallbackPort && pi.port) fallbackPort = pi.port;

      if (pi.products && Array.isArray(pi.products)) {
        const matchedItem = pi.products.find((p) => isProdMatch(p.productName));
        if (matchedItem) {
          const usdPmt = parseNumericVal(
            matchedItem.usdPmt ??
              (matchedItem as any).usd_pmt ??
              (matchedItem as any).rate ??
              (matchedItem as any).price
          );
          const purchaseQty = parseNumericVal(
            matchedItem.purchaseQty ??
              (matchedItem as any).qty ??
              (matchedItem as any).quantity ??
              (matchedItem as any).purchase_qty
          );
          let totalUsd = parseNumericVal(
            matchedItem.totalUsd ??
              (matchedItem as any).total_usd ??
              (matchedItem as any).grandTotalUsd
          );
          if (totalUsd === 0 && usdPmt > 0 && purchaseQty > 0) {
            totalUsd = (usdPmt * purchaseQty) / 1000;
          }
          return {
            usdPmt,
            purchaseQty,
            totalUsd,
            supplierName: pi.supplierName || fallbackSupplier || "N/A",
            mfg: pi.mfg || fallbackMfg || "N/A",
            port: pi.port || fallbackPort || "N/A"
          };
        }
      }
      if (isProdMatch(pi.productName)) {
        const usdPmt = parseNumericVal(pi.usdPmt ?? (pi as any).rate);
        const purchaseQty = parseNumericVal(
          pi.purchaseQty ?? pi.totalPurchaseQty ?? (pi as any).qty
        );
        let totalUsd = parseNumericVal(pi.totalUsd ?? pi.grandTotalUsd);
        if (totalUsd === 0 && usdPmt > 0 && purchaseQty > 0) {
          totalUsd = (usdPmt * purchaseQty) / 1000;
        }
        return {
          usdPmt,
          purchaseQty,
          totalUsd,
          supplierName: pi.supplierName || fallbackSupplier || "N/A",
          mfg: pi.mfg || fallbackMfg || "N/A",
          port: pi.port || fallbackPort || "N/A"
        };
      }
    }

    return {
      usdPmt: 0,
      purchaseQty: 0,
      totalUsd: 0,
      supplierName: fallbackSupplier || "N/A",
      mfg: fallbackMfg || "N/A",
      port: fallbackPort || "N/A"
    };
  };

  // 4. Auto-fetched PI Product Metrics (USD PMT, Purchase QTY, Total USD) for Create Form
  const selectedPiProductInfo = useMemo(() => {
    return getPiProductDetails(importPis, aolBranchName, piNo, productName);
  }, [importPis, aolBranchName, piNo, productName]);

  // ==========================================
  // DUPLICATE CHECKING FOR CREATE FORM
  // ==========================================

  const isCreateDuplicate = useMemo(() => {
    if (!aolBranchName || !piNo || !productName) return false;
    return importBoes.some(
      (b) =>
        b.aolBranchName === aolBranchName &&
        b.piNo === piNo &&
        b.productName === productName
    );
  }, [importBoes, aolBranchName, piNo, productName]);

  // ==========================================
  // DYNAMIC DROPDOWN LOGIC FOR EDIT MODAL FORM
  // ==========================================

  const editAvailableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    importPis.forEach((pi) => {
      if (pi.aolBranchName) branchSet.add(pi.aolBranchName);
    });
    return Array.from(branchSet);
  }, [importPis]);

  const editAvailablePiNumbers = useMemo(() => {
    if (!editingRecord?.aolBranchName) return [];
    const piSet = new Set<string>();
    importPis
      .filter((pi) => pi.aolBranchName === editingRecord.aolBranchName)
      .forEach((pi) => {
        if (pi.piNo) piSet.add(pi.piNo);
      });
    return Array.from(piSet);
  }, [importPis, editingRecord?.aolBranchName]);

  const editAvailableProducts = useMemo(() => {
    if (!editingRecord?.aolBranchName || !editingRecord?.piNo) return [];
    const prodSet = new Set<string>();

    const matchingPis = importPis.filter(
      (pi) => pi.aolBranchName === editingRecord.aolBranchName && pi.piNo === editingRecord.piNo
    );

    matchingPis.forEach((pi) => {
      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        pi.products.forEach((prod) => {
          if (prod.productName) prodSet.add(prod.productName);
        });
      } else if (pi.productName) {
        prodSet.add(pi.productName);
      }
    });

    return Array.from(prodSet);
  }, [importPis, editingRecord?.aolBranchName, editingRecord?.piNo]);

  // Auto-fetched PI Product Metrics for Edit Modal
  const editSelectedPiProductInfo = useMemo(() => {
    if (!editingRecord?.aolBranchName || !editingRecord?.piNo || !editingRecord?.productName) {
      return {
        usdPmt: parseNumericVal(editingRecord?.usdPmt),
        purchaseQty: parseNumericVal(editingRecord?.purchaseQty),
        totalUsd: parseNumericVal(editingRecord?.totalUsd)
      };
    }
    const fetched = getPiProductDetails(
      importPis,
      editingRecord.aolBranchName,
      editingRecord.piNo,
      editingRecord.productName
    );
    return {
      usdPmt: fetched.usdPmt > 0 ? fetched.usdPmt : parseNumericVal(editingRecord.usdPmt),
      purchaseQty: fetched.purchaseQty > 0 ? fetched.purchaseQty : parseNumericVal(editingRecord.purchaseQty),
      totalUsd: fetched.totalUsd > 0 ? fetched.totalUsd : parseNumericVal(editingRecord.totalUsd)
    };
  }, [
    importPis,
    editingRecord?.aolBranchName,
    editingRecord?.piNo,
    editingRecord?.productName,
    editingRecord?.usdPmt,
    editingRecord?.purchaseQty,
    editingRecord?.totalUsd
  ]);

  const isEditDuplicate = useMemo(() => {
    if (!editingRecord) return false;
    return importBoes.some(
      (b) =>
        b.id !== editingRecord.id &&
        b.aolBranchName === editingRecord.aolBranchName &&
        b.piNo === editingRecord.piNo &&
        b.productName === editingRecord.productName
    );
  }, [importBoes, editingRecord]);

  // Handle Create Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreateDuplicate) {
      alert("Duplicate entry detected! The combination of PI No and Product Name already exists.");
      return;
    }

    if (!aolBranchName) {
      alert("Please select an AOL Branch (Entries must first be created in 'PI' tab).");
      return;
    }
    if (!piNo) {
      alert("Please select a PI Number.");
      return;
    }
    if (!productName) {
      alert("Please select a Product Name.");
      return;
    }
    if (!invoiceNumber.trim()) {
      alert("Please enter an Invoice Number (Mandatory).");
      return;
    }
    if (!billOfLadingNo.trim()) {
      alert("Please enter a Bill of Lading (BL NO) (Mandatory).");
      return;
    }

    const piDetails = selectedPiProductInfo.purchaseQty > 0 || selectedPiProductInfo.usdPmt > 0
      ? selectedPiProductInfo
      : getPiProductDetails(importPis, aolBranchName, piNo, productName);

    const termStatus = getTermReadOnlyStatus(fobCif);
    const newRecord: Omit<ImportBoeRecord, "id" | "createdAt"> = {
      aolBranchName,
      piNo,
      productName,
      supplierName: piDetails.supplierName || "N/A",
      mfg: piDetails.mfg || "N/A",
      port: piDetails.port || "N/A",
      usdPmt: piDetails.usdPmt,
      purchaseQty: piDetails.purchaseQty,
      totalUsd: piDetails.totalUsd,
      fobCif,
      freightUsd: termStatus.isFreightReadOnly ? 0 : (parseFloat(freightUsd) || 0),
      insuranceUsd: termStatus.isInsuranceReadOnly ? 0 : (parseFloat(insuranceUsd) || 0),
      beNo: beNo.trim() || "",
      beDate: beDate || new Date().toISOString().split("T")[0],
      boeExRate: parseFloat(boeExRate) || 0,
      beQuery: beQuery.trim() || "",
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
      lotBatchNumber: lotBatchNumber.trim() || "N/A",
      billOfLadingNo: billOfLadingNo.trim(),
      billOfLadingDate: billOfLadingDate || new Date().toISOString().split("T")[0],
      portOfLoading: portOfLoading.trim() || "",
      beStatus: "",
      deferredDuty: "",
      deferredDutyAmt: "",
      paymentDueDate: "",
      stampDutyAmount: "",
      stampDutyDate: "",
      statusRemark: "",
      entryDate: entryDate || new Date().toISOString().split("T")[0],
      createdByUserId: activeUserId,
      createdByName: activeUser?.name || "Current User"
    };

    const generatedId = getTrackedNextBoeId();
    const fullRecord: ImportBoeRecord = {
      ...newRecord,
      id: generatedId,
      createdAt: new Date().toISOString()
    };

    onAddImportBoe(fullRecord);
    triggerSync("ADD", fullRecord);

    // Reset non-cascading fields
    setFreightUsd("");
    setInsuranceUsd("");
    setBeNo("");
    setBoeExRate("");
    setBeQuery("");
    setInvoiceNumber("");
    setLotBatchNumber("");
    setBillOfLadingNo("");
    setPortOfLoading("");
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: ImportBoeRecord) => {
    if (!isEditable) {
      alert("You do not have permission to edit BOE records.");
      return;
    }
    setEditingRecord({ ...rec });
  };

  // Handle Edit Form Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (isEditDuplicate) {
      alert("Duplicate entry detected! Combination of PI No and Product Name already exists.");
      return;
    }

    if (!editingRecord.aolBranchName || !editingRecord.piNo || !editingRecord.productName) {
      alert("Please select AOL Branch, PI No, and Product Name.");
      return;
    }

    if (!editingRecord.invoiceNumber?.trim()) {
      alert("Please enter an Invoice Number (Mandatory).");
      return;
    }

    if (!editingRecord.billOfLadingNo?.trim()) {
      alert("Please enter a Bill of Lading (BL NO) (Mandatory).");
      return;
    }

    const piDetails = editSelectedPiProductInfo.purchaseQty > 0 || editSelectedPiProductInfo.usdPmt > 0
      ? editSelectedPiProductInfo
      : getPiProductDetails(
          importPis,
          editingRecord.aolBranchName,
          editingRecord.piNo,
          editingRecord.productName
        );

    const updatedRecord: ImportBoeRecord = {
      ...editingRecord,
      supplierName: editingRecord.supplierName || piDetails.supplierName || "N/A",
      mfg: editingRecord.mfg || piDetails.mfg || "N/A",
      port: editingRecord.port || piDetails.port || "N/A",
      usdPmt: piDetails.usdPmt,
      purchaseQty: piDetails.purchaseQty,
      totalUsd: piDetails.totalUsd,
      beQuery: editingRecord.beQuery ? editingRecord.beQuery.trim() : "",
      portOfLoading: editingRecord.portOfLoading ? editingRecord.portOfLoading.trim() : "",
      beStatus: editingRecord.beStatus || "",
      deferredDuty: editingRecord.deferredDuty || "",
      deferredDutyAmt: editingRecord.deferredDutyAmt || "",
      paymentDueDate: editingRecord.paymentDueDate || "",
      stampDutyAmount: editingRecord.stampDutyAmount || "",
      stampDutyDate: editingRecord.stampDutyDate || "",
      statusRemark: editingRecord.statusRemark || "",
      invoiceNumber: editingRecord.invoiceNumber.trim(),
      billOfLadingNo: editingRecord.billOfLadingNo.trim(),
      beNo: editingRecord.beNo?.trim() || ""
    };
    onUpdateImportBoe(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  // Filtered BOE Records
  const filteredRecords = useMemo(() => {
    return importBoes.filter((rec) => {
      const matchesBranch = selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;
      const matchesFobCif = selectedFobCifFilter === "ALL" || rec.fobCif === selectedFobCifFilter;

      const stats = getBoeContainerStats(rec);
      let matchesStatus = true;
      if (selectedContainerStatusFilter === "COMPLETED") matchesStatus = stats.isCompleted;
      if (selectedContainerStatusFilter === "IN_PROGRESS") matchesStatus = stats.isInProgress;
      if (selectedContainerStatusFilter === "PENDING") matchesStatus = stats.isPending;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rec.piNo.toLowerCase().includes(q) ||
        rec.productName.toLowerCase().includes(q) ||
        rec.beNo.toLowerCase().includes(q) ||
        (rec.invoiceNumber && rec.invoiceNumber.toLowerCase().includes(q)) ||
        (rec.billOfLadingNo && rec.billOfLadingNo.toLowerCase().includes(q)) ||
        rec.aolBranchName.toLowerCase().includes(q);

      return matchesBranch && matchesFobCif && matchesStatus && matchesSearch;
    });
  }, [importBoes, searchQuery, selectedBranchFilter, selectedFobCifFilter, selectedContainerStatusFilter, importContainers, importPis]);

  // Overall Statistics
  const fobCount = useMemo(() => filteredRecords.filter((r) => r.fobCif === "FOB").length, [filteredRecords]);
  const cifCount = useMemo(() => filteredRecords.filter((r) => r.fobCif === "CIF").length, [filteredRecords]);
  const completedBoeCount = useMemo(() => {
    return filteredRecords.filter((rec) => getBoeContainerStats(rec).isCompleted).length;
  }, [filteredRecords, importContainers, importPis]);

  return (
    <div className="flex flex-col gap-5">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_boe_config"
        defaultSheetName="Import BOE"
        collectionKey="import_boes"
        records={importBoes}
        activeUser={activeUser}
        moduleTitle="Bill of Entry (BOE)"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((rec) => {
            const existing = importBoes.find((b) => (b.beNo === rec.beNo && b.productName === rec.productName) || b.id === rec.id);
            if (existing) {
              onUpdateImportBoe({ ...existing, ...rec });
            } else {
              onAddImportBoe(rec);
            }
          });
        }}
      />

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total BOE Records</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Receipt size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Container Status</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {completedBoeCount} <span className="text-xs font-normal text-slate-500">/ {filteredRecords.length} Completed</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Container size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">FOB Shipments</p>
            <p className="text-xl font-extrabold text-slate-700 mt-0.5">
              {fobCount} <span className="text-xs font-normal text-slate-500">FOB</span>
            </p>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <Check size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">CIF Shipments</p>
            <p className="text-xl font-extrabold text-purple-700 mt-0.5">
              {cifCount} <span className="text-xs font-normal text-slate-500">CIF</span>
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* BOE Entry Form Section */}
      {isAddable && (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div
          className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-emerald-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider font-mono">
              Add Bill of Entry (BOE) Details
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {isFormOpen ? "Hide Form" : "Show Form"}
          </span>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
            {/* Duplicate Alert Banner */}
            {isCreateDuplicate && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 shadow-xs">
                <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-rose-900 uppercase font-mono text-[11px] tracking-wider">
                    Duplicate Combination Detected!
                  </p>
                  <p className="text-rose-700 text-xs font-medium mt-0.5">
                    A BOE entry with PI No <span className="font-bold">{piNo}</span> and Product <span className="font-bold">{productName}</span> already exists in database.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 1: CASCADING SELECTION & FOB/CIF */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Building2 size={15} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Step 1: Cascading PI & Product Selection
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* AOL Branch Dropdown */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    AOL Branch *
                  </label>
                  <select
                    value={aolBranchName}
                    onChange={(e) => setAolBranchName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  >
                    {availableBranches.length === 0 ? (
                      <option value="">No Branches (Create PI first)</option>
                    ) : (
                      availableBranches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* PI No Dropdown */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    PI No *
                  </label>
                  <select
                    value={piNo}
                    onChange={(e) => setPiNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                    disabled={availablePiNumbers.length === 0}
                  >
                    {availablePiNumbers.length === 0 ? (
                      <option value="">No Available PIs</option>
                    ) : (
                      availablePiNumbers.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Product Name Dropdown */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name *
                  </label>
                  <select
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className={`w-full text-xs border bg-white px-2.5 py-1.5 rounded-lg outline-none font-semibold ${
                      isCreateDuplicate
                        ? "border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                    required
                    disabled={availableProducts.length === 0}
                  >
                    {availableProducts.length === 0 ? (
                      <option value="">No Available Products</option>
                    ) : (
                      availableProducts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* FOB / CIF Terms Selector */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    FOB / CIF Terms *
                  </label>
                  <select
                    value={fobCif}
                    onChange={(e) => setFobCif(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                  >
                    {termsOptions.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AUTO-POPULATED PI REFERENCE METRICS */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                    <PackageCheck size={15} className="text-emerald-600" />
                    <span>PI Linked Reference Details (Auto-Fetched from PI Database)</span>
                  </div>
                  <span className="text-[9px] font-mono font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded">
                    Auto Populated & Saved
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* USD PMT */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-emerald-950 uppercase block mb-1">
                      USD PMT ($ / MT)
                    </label>
                    <div className="w-full text-xs border border-emerald-200 bg-white px-2.5 py-1.5 rounded-lg font-mono font-bold text-slate-800 shadow-2xs flex items-center justify-between">
                      <span>{selectedPiProductInfo.usdPmt > 0 ? `$${selectedPiProductInfo.usdPmt.toLocaleString()}` : "$0.00"}</span>
                      <span className="text-[9px] font-sans font-medium text-slate-400">Rate/MT</span>
                    </div>
                  </div>

                  {/* Purchase QTY */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-emerald-950 uppercase block mb-1">
                      Purchase QTY (MT)
                    </label>
                    <div className="w-full text-xs border border-emerald-200 bg-white px-2.5 py-1.5 rounded-lg font-mono font-extrabold text-emerald-800 shadow-2xs flex items-center justify-between">
                      <span>{selectedPiProductInfo.purchaseQty > 0 ? `${selectedPiProductInfo.purchaseQty.toLocaleString()} MT` : "0 MT"}</span>
                      <span className="text-[9px] font-sans font-medium text-emerald-600">Metric Ton</span>
                    </div>
                  </div>

                  {/* Total USD */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-emerald-950 uppercase block mb-1">
                      Total USD ($)
                    </label>
                    <div className="w-full text-xs border border-emerald-200 bg-white px-2.5 py-1.5 rounded-lg font-mono font-extrabold text-slate-900 shadow-2xs flex items-center justify-between">
                      <span>{selectedPiProductInfo.totalUsd > 0 ? `$${selectedPiProductInfo.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}</span>
                      <span className="text-[9px] font-sans font-medium text-slate-400">Total Valuation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: INVOICE & BILL OF LADING DETAILS (MANDATORY FIRST) */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <FileText size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Step 2: Invoice & Bill of Lading Details
                  </span>
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Mandatory Details *
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Invoice Number - MANDATORY */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                    Invoice Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-001"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Invoice Date - MANDATORY */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* BILL OF LADING NO - MANDATORY */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                    Bill of Lading NO <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={billOfLadingNo}
                    onChange={(e) => setBillOfLadingNo(e.target.value)}
                    placeholder="e.g. BL-849204"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* BILL OF LADING Date - MANDATORY */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                    Bill of Lading Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={billOfLadingDate}
                    onChange={(e) => setBillOfLadingDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Lot / Batch Number - Optional */}
                <div className="sm:col-span-1 lg:col-span-3">
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Lot / Batch Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={lotBatchNumber}
                    onChange={(e) => setLotBatchNumber(e.target.value)}
                    placeholder="e.g. LOT-A9482"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* Port of Loading - Optional */}
                <div className="sm:col-span-1 lg:col-span-3">
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Port of Loading <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={portOfLoading}
                    onChange={(e) => setPortOfLoading(e.target.value)}
                    placeholder="e.g. Shanghai, Ningbo, Qingdao"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: FREIGHT, INSURANCE & EXCHANGE RATE */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Calculator size={15} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Step 3: Freight, Insurance & Exchange Rate Details
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Freight USD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                      Freight USD {!getTermReadOnlyStatus(fobCif).isFreightReadOnly && "*"}
                    </label>
                    {getTermReadOnlyStatus(fobCif).isFreightReadOnly && (
                      <span className="text-[9px] font-bold font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                        Readonly ({getTermReadOnlyStatus(fobCif).reason})
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={freightUsd}
                    onChange={(e) => setFreightUsd(e.target.value)}
                    placeholder={getTermReadOnlyStatus(fobCif).isFreightReadOnly ? `N/A for ${getTermReadOnlyStatus(fobCif).reason}` : "0.00"}
                    readOnly={getTermReadOnlyStatus(fobCif).isFreightReadOnly}
                    className={`w-full text-xs px-2.5 py-1.5 rounded-lg outline-none font-semibold ${
                      getTermReadOnlyStatus(fobCif).isFreightReadOnly
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                  />
                </div>

                {/* Insurance USD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                      Insurance USD {!getTermReadOnlyStatus(fobCif).isInsuranceReadOnly && "*"}
                    </label>
                    {getTermReadOnlyStatus(fobCif).isInsuranceReadOnly && (
                      <span className="text-[9px] font-bold font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                        Readonly ({getTermReadOnlyStatus(fobCif).reason})
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={insuranceUsd}
                    onChange={(e) => setInsuranceUsd(e.target.value)}
                    placeholder={getTermReadOnlyStatus(fobCif).isInsuranceReadOnly ? `N/A for ${getTermReadOnlyStatus(fobCif).reason}` : "0.00"}
                    readOnly={getTermReadOnlyStatus(fobCif).isInsuranceReadOnly}
                    className={`w-full text-xs px-2.5 py-1.5 rounded-lg outline-none font-semibold ${
                      getTermReadOnlyStatus(fobCif).isInsuranceReadOnly
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                  />
                </div>

                {/* BOE Ex Rate */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BOE Ex Rate <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={boeExRate}
                    onChange={(e) => setBoeExRate(e.target.value)}
                    placeholder="e.g. 83.50"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: BILL OF ENTRY (BE) & CUSTOMS DETAILS (OPTIONAL & LATER) */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <FileCheck size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Step 4: Bill of Entry (BE) & Customs Details
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Optional (Can be added upon customs clearance)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* BE NO - OPTIONAL */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE NO <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={beNo}
                    onChange={(e) => setBeNo(e.target.value)}
                    placeholder="Optional BE Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* BE DATE - OPTIONAL */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE DATE <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={beDate}
                    onChange={(e) => setBeDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* BE Query - OPTIONAL */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE Query / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={beQuery}
                    onChange={(e) => setBeQuery(e.target.value)}
                    placeholder="Remarks / BE Query"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* Entry Date - Readonly */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Auto Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isCreateDuplicate}
                className={`flex items-center gap-1.5 font-bold text-xs px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer ${
                  isCreateDuplicate
                    ? "bg-rose-600 hover:bg-rose-700 text-white cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isCreateDuplicate ? <ShieldAlert size={15} /> : <Plus size={15} />}
                {isCreateDuplicate ? "Duplicate Detected - Cannot Save" : "Save BOE Entry to Database"}
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* SEARCH, FILTER & TABLE SECTION */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Controls Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search input */}
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search BE No, Invoice No, BL No, PI No, Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* FOB/CIF Terms Filter */}
            <select
              value={selectedFobCifFilter}
              onChange={(e) => setSelectedFobCifFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Terms</option>
              {termsOptions.map((term) => (
                <option key={term} value={term}>
                  {term} Only
                </option>
              ))}
            </select>

            {/* Container Status Filter */}
            <select
              value={selectedContainerStatusFilter}
              onChange={(e) => setSelectedContainerStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Container Statuses</option>
              <option value="COMPLETED">Completed Containers</option>
              <option value="IN_PROGRESS">In Progress Containers</option>
              <option value="PENDING">Pending Containers</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Import Button */}
            {isAddable && (
              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                title="Import multiple BOE rows from Google Sheets or CSV"
              >
                <FileSpreadsheet size={14} className="text-emerald-700" />
                Import from Sheet / CSV
              </button>
            )}

            {/* Toggle All Hide/Unhide */}
            <button
              onClick={() => {
                const nextState = !areAllBoeHidden;
                setAreAllBoeHidden(nextState);
                const newHidden: Record<string, boolean> = {};
                filteredRecords.forEach((r) => {
                  newHidden[r.id] = nextState;
                });
                setHiddenBoeRowIds(newHidden);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
            >
              {areAllBoeHidden ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-slate-500" />}
              {areAllBoeHidden ? "Unhide All Rows" : "Hide All Rows"}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Branch & PI Details</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Invoice Info</th>
                <th className="py-2.5 px-3">Bill of Lading</th>
                <th className="py-2.5 px-3">BE NO & Customs</th>
                <th className="py-2.5 px-3">Containers Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt size={28} className="text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">No BOE records found</p>
                      <p className="text-[11px] text-slate-400">
                        Create entries above using existing PI & Product combinations.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isHidden = hiddenBoeRowIds[rec.id];

                  if (isHidden) {
                    return (
                      <tr key={rec.id} className="bg-slate-50/50">
                        <td colSpan={6} className="py-2 px-3 text-slate-400 italic text-[11px]">
                          [Row hidden: Inv #{rec.invoiceNumber} — BL #{rec.billOfLadingNo} — PI #{rec.piNo} ({rec.productName})]
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() =>
                              setHiddenBoeRowIds((prev) => ({ ...prev, [rec.id]: false }))
                            }
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition"
                            title="Unhide Row"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const containerStats = getBoeContainerStats(rec);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Branch & PI */}
                      <td className="py-3 px-3">
                        {rec.id && (
                          <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mb-0.5 block font-mono">
                            ID: {rec.id}
                          </span>
                        )}
                        <span className="font-extrabold text-slate-800 block text-xs">{rec.piNo}</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold inline-block mt-0.5">
                          {rec.aolBranchName}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3">
                        {(() => {
                          const hasSavedQty = rec.purchaseQty !== undefined && Number(rec.purchaseQty) > 0;
                          const piDetails = hasSavedQty
                            ? { usdPmt: Number(rec.usdPmt) || 0, purchaseQty: Number(rec.purchaseQty) || 0, totalUsd: Number(rec.totalUsd) || 0 }
                            : getPiProductDetails(importPis, rec.aolBranchName, rec.piNo, rec.productName);

                          return (
                            <>
                              <span className="font-bold text-slate-900 block text-xs">{rec.productName}</span>
                              {piDetails.purchaseQty > 0 ? (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                                    {piDetails.purchaseQty.toLocaleString()} MT
                                  </span>
                                  {piDetails.usdPmt > 0 && (
                                    <span className="text-[9px] font-mono text-slate-500">
                                      ${piDetails.usdPmt}/MT
                                    </span>
                                  )}
                                  {piDetails.totalUsd > 0 && (
                                    <span className="text-[9px] font-mono font-bold text-slate-700">
                                      (${piDetails.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </>
                          );
                        })()}
                      </td>

                      {/* Invoice Info */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{rec.invoiceNumber || "—"}</span>
                        <span className="text-[10px] font-mono text-slate-500">{rec.invoiceDate}</span>
                        {rec.lotBatchNumber && rec.lotBatchNumber !== "N/A" && (
                          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                            Batch: {rec.lotBatchNumber}
                          </span>
                        )}
                      </td>

                      {/* Bill of Lading */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{rec.billOfLadingNo || "—"}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">{rec.billOfLadingDate}</span>
                        {rec.portOfLoading && (
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            Port: {rec.portOfLoading}
                          </span>
                        )}
                      </td>

                      {/* BE NO & Customs Details */}
                      <td className="py-3 px-3">
                        <span className={`font-semibold block ${rec.beNo ? "text-slate-800" : "text-slate-400 italic text-[11px]"}`}>
                          {rec.beNo ? rec.beNo : "BE Pending"}
                        </span>
                        {rec.beNo && <span className="text-[10px] font-mono text-slate-500 block">{rec.beDate}</span>}
                        {rec.boeExRate && (
                          <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            Ex Rate: ₹{rec.boeExRate}
                          </span>
                        )}
                        {rec.beQuery && (
                          <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.2 rounded block mt-0.5 max-w-[140px] truncate" title={rec.beQuery}>
                            Q: {rec.beQuery}
                          </span>
                        )}
                      </td>

                      {/* Containers Status */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                                containerStats.isCompleted
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : containerStats.isInProgress
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <Container size={12} />
                              {containerStats.isCompleted
                                ? "Completed"
                                : containerStats.isInProgress
                                ? "In Progress"
                                : "Pending"}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700">
                            <span className="font-extrabold text-slate-900">{containerStats.containerCount}</span>{" "}
                            {containerStats.containerCount === 1 ? "container entry" : "container entries"}
                          </div>
                          {containerStats.targetQty > 0 ? (
                            <div className="text-[10px] font-mono text-slate-500">
                              Qty: <span className="font-bold text-slate-800">{containerStats.loggedQty.toLocaleString()}</span> / {containerStats.targetQty.toLocaleString()} Kg
                            </div>
                          ) : containerStats.loggedQty > 0 ? (
                            <div className="text-[10px] font-mono text-slate-500">
                              Qty: <span className="font-bold text-slate-800">{containerStats.loggedQty.toLocaleString()}</span> Kg
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {deletingBoeId === rec.id ? (
                          <div className="flex items-center justify-end gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                            <span className="text-[10px] font-extrabold text-rose-800">Delete?</span>
                            <button
                              onClick={() => {
                                onDeleteImportBoe(rec.id);
                                triggerSync("DELETE", { id: rec.id });
                                setDeletingBoeId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer shadow-2xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingBoeId(null)}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingRecord(rec)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50 transition cursor-pointer"
                              title="View BOE Details"
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
                              title={isEditable ? "Edit BOE Record" : "No Edit Permission"}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (!isAdmin) {
                                  alert("Only Admins are permitted to delete BOE records.");
                                  return;
                                }
                                setDeletingBoeId(rec.id);
                              }}
                              disabled={!isAdmin}
                              className={`p-1.5 rounded transition ${
                                isAdmin
                                  ? "text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  : "text-slate-300 cursor-not-allowed"
                              }`}
                              title={isAdmin ? "Delete BOE Record" : "Admin Only"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full p-5 my-8 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900 font-mono uppercase tracking-wider">
                  Edit Bill of Entry (BOE) Entry
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Duplicate Alert inside Edit Modal */}
            {isEditDuplicate && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 shadow-xs">
                <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-rose-900 uppercase font-mono text-[11px] tracking-wider">
                    Duplicate Combination Alert!
                  </p>
                  <p className="text-rose-700 text-xs font-medium mt-0.5">
                    Another BOE record with PI No <span className="font-bold">{editingRecord.piNo}</span> and Product <span className="font-bold">{editingRecord.productName}</span> already exists.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              {/* Step 1: Cascading Branch, PI & Product Selection */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <Building2 size={14} className="text-emerald-600" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    Step 1: Cascading PI & Product Selection
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Branch */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      AOL Branch *
                    </label>
                    <select
                      value={editingRecord.aolBranchName}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, aolBranchName: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                      required
                    >
                      {editAvailableBranches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PI No */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      PI No *
                    </label>
                    <select
                      value={editingRecord.piNo}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, piNo: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                      required
                    >
                      {editAvailablePiNumbers.map((p) => (
                        <option key={p} value={p}>
                          {p}
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
                      className={`w-full text-xs border bg-white px-2 py-1.5 rounded outline-none font-semibold ${
                        isEditDuplicate
                          ? "border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-200 text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      }`}
                      required
                    >
                      {editAvailableProducts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FOB / CIF Terms Selection */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      FOB / CIF Terms *
                    </label>
                    <select
                      value={editingRecord.fobCif}
                      onChange={(e) => {
                        const newTerm = e.target.value;
                        const status = getTermReadOnlyStatus(newTerm);
                        setEditingRecord({
                          ...editingRecord,
                          fobCif: newTerm,
                          freightUsd: status.isFreightReadOnly ? 0 : editingRecord.freightUsd,
                          insuranceUsd: status.isInsuranceReadOnly ? 0 : editingRecord.insuranceUsd
                        });
                      }}
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    >
                      {termsOptions.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-populated PI Reference Details in Edit Modal */}
                <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-2xs mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                      <PackageCheck size={14} className="text-emerald-600" />
                      <span>PI Linked Details (Auto-Fetched Reference)</span>
                    </div>
                    <span className="text-[9px] font-mono font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded">
                      PI Database
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-emerald-950 uppercase block">USD PMT ($ / MT)</span>
                      <div className="text-xs font-mono font-bold text-slate-800 bg-white border border-emerald-200 px-2 py-1 rounded mt-0.5">
                        {editSelectedPiProductInfo.usdPmt > 0 ? `$${editSelectedPiProductInfo.usdPmt.toLocaleString()}` : "$0.00"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold font-mono text-emerald-950 uppercase block">Purchase QTY (MT)</span>
                      <div className="text-xs font-mono font-extrabold text-emerald-800 bg-white border border-emerald-200 px-2 py-1 rounded mt-0.5">
                        {editSelectedPiProductInfo.purchaseQty > 0 ? `${editSelectedPiProductInfo.purchaseQty.toLocaleString()} MT` : "0 MT"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold font-mono text-emerald-950 uppercase block">Total USD ($)</span>
                      <div className="text-xs font-mono font-extrabold text-slate-900 bg-white border border-emerald-200 px-2 py-1 rounded mt-0.5">
                        {editSelectedPiProductInfo.totalUsd > 0 ? `$${editSelectedPiProductInfo.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Invoice & Bill of Lading Details (Mandatory) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-600" />
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Step 2: Invoice & Bill of Lading Details
                    </span>
                  </div>
                  <span className="text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Mandatory *
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Invoice Number - MANDATORY */}
                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                      Invoice Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRecord.invoiceNumber}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, invoiceNumber: e.target.value })
                      }
                      placeholder="e.g. INV-2026-001"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Invoice Date - MANDATORY */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                      Invoice Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingRecord.invoiceDate}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, invoiceDate: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* BILL OF LADING NO - MANDATORY */}
                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                      Bill of Lading NO <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRecord.billOfLadingNo}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, billOfLadingNo: e.target.value })
                      }
                      placeholder="e.g. BL-849204"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Bill of Lading Date - MANDATORY */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-700 uppercase block mb-1">
                      BL Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingRecord.billOfLadingDate}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, billOfLadingDate: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Lot / Batch Number - Optional */}
                  <div className="sm:col-span-1 lg:col-span-3">
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Lot / Batch Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editingRecord.lotBatchNumber}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, lotBatchNumber: e.target.value })
                      }
                      placeholder="e.g. LOT-A9482"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Port of Loading - Optional */}
                  <div className="sm:col-span-1 lg:col-span-3">
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Port of Loading <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editingRecord.portOfLoading || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, portOfLoading: e.target.value })
                      }
                      placeholder="e.g. Shanghai, Ningbo"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Freight, Insurance & Pricing Details */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Calculator size={14} className="text-emerald-600" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    Step 3: Freight, Insurance & Exchange Rate Details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Freight USD */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Freight USD {getTermReadOnlyStatus(editingRecord.fobCif).isFreightReadOnly && `(Readonly - ${getTermReadOnlyStatus(editingRecord.fobCif).reason})`}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.freightUsd}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          freightUsd: parseFloat(e.target.value) || 0
                        })
                      }
                      readOnly={getTermReadOnlyStatus(editingRecord.fobCif).isFreightReadOnly}
                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg outline-none font-semibold ${
                        getTermReadOnlyStatus(editingRecord.fobCif).isFreightReadOnly
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-800 border border-slate-200 focus:ring-1 focus:ring-emerald-500"
                      }`}
                    />
                  </div>

                  {/* Insurance USD */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Insurance USD {getTermReadOnlyStatus(editingRecord.fobCif).isInsuranceReadOnly && `(Readonly - ${getTermReadOnlyStatus(editingRecord.fobCif).reason})`}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.insuranceUsd}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          insuranceUsd: parseFloat(e.target.value) || 0
                        })
                      }
                      readOnly={getTermReadOnlyStatus(editingRecord.fobCif).isInsuranceReadOnly}
                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg outline-none font-semibold ${
                        getTermReadOnlyStatus(editingRecord.fobCif).isInsuranceReadOnly
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-800 border border-slate-200 focus:ring-1 focus:ring-emerald-500"
                      }`}
                    />
                  </div>

                  {/* BOE Ex Rate */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      BOE Ex Rate <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editingRecord.boeExRate}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          boeExRate: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Bill of Entry (BE) & Customs Details (Optional) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileCheck size={14} className="text-emerald-600" />
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Step 4: Bill of Entry (BE) & Customs Details
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    Optional
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* BE NO - OPTIONAL */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      BE NO <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editingRecord.beNo || ""}
                      onChange={(e) => setEditingRecord({ ...editingRecord, beNo: e.target.value })}
                      placeholder="Optional BE Number"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* BE DATE */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      BE DATE <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={editingRecord.beDate}
                      onChange={(e) => setEditingRecord({ ...editingRecord, beDate: e.target.value })}
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* BE Query */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      BE Query / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editingRecord.beQuery || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, beQuery: e.target.value })
                      }
                      placeholder="Remarks / BE Query"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Entry Date */}
                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                    </label>
                    <input
                      type="date"
                      value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                      readOnly
                      disabled
                      className="w-full text-xs border border-slate-200 bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-500 cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
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
                  disabled={isEditDuplicate}
                  className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                    isEditDuplicate
                      ? "bg-rose-600 hover:bg-rose-700 text-white cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isEditDuplicate ? <ShieldAlert size={15} /> : <Check size={15} />}
                  {isEditDuplicate ? "Duplicate Detected - Cannot Save" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* VIEW DETAILS MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8 flex flex-col gap-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-base">
                      Bill of Entry (BOE) Details
                    </h3>
                    <span className="text-[10px] font-mono font-extrabold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                      PI #{viewingRecord.piNo}
                    </span>
                    {viewingRecord.beNo && (
                      <span className="text-[10px] font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        BE #{viewingRecord.beNo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Commercial invoice, shipping, customs duty and container tracking details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              {/* Section 1: Branch & PI / Product Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-200 pb-2">
                  <Building2 size={15} className="text-blue-600" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    Branch & Purchase Order Linkage
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">AOL Branch</span>
                    <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-block mt-0.5">
                      {viewingRecord.aolBranchName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">PI Number</span>
                    <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.piNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Product Name</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.productName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Term (FOB / CIF)</span>
                    <span className="font-extrabold font-mono text-slate-800 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded inline-block mt-0.5">
                      {viewingRecord.fobCif || "FOB"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">USD PMT (PI Ref)</span>
                    <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                      {(() => {
                        const val = viewingRecord.usdPmt && Number(viewingRecord.usdPmt) > 0
                          ? Number(viewingRecord.usdPmt)
                          : getPiProductDetails(importPis, viewingRecord.aolBranchName, viewingRecord.piNo, viewingRecord.productName).usdPmt;
                        return val > 0 ? `$${val.toLocaleString()}` : "—";
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Purchase QTY (PI Ref)</span>
                    <span className="font-extrabold font-mono text-emerald-700 text-sm block mt-0.5">
                      {(() => {
                        const val = viewingRecord.purchaseQty && Number(viewingRecord.purchaseQty) > 0
                          ? Number(viewingRecord.purchaseQty)
                          : getPiProductDetails(importPis, viewingRecord.aolBranchName, viewingRecord.piNo, viewingRecord.productName).purchaseQty;
                        return val > 0 ? `${val.toLocaleString()} MT` : "—";
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Total USD (PI Ref)</span>
                    <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                      {(() => {
                        const val = viewingRecord.totalUsd && Number(viewingRecord.totalUsd) > 0
                          ? Number(viewingRecord.totalUsd)
                          : getPiProductDetails(importPis, viewingRecord.aolBranchName, viewingRecord.piNo, viewingRecord.productName).totalUsd;
                        return val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Entry Date</span>
                    <span className="font-semibold text-slate-800 font-mono block mt-0.5">
                      {viewingRecord.entryDate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Created By</span>
                    <span className="font-medium text-slate-700 block mt-0.5">
                      {viewingRecord.createdByName || "System"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Commercial Invoice & Shipping */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-100 pb-2">
                  <Receipt size={15} className="text-emerald-600" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    Commercial Invoice & Bill of Lading
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Invoice Number</span>
                    <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.invoiceNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Invoice Date</span>
                    <span className="font-semibold text-slate-800 font-mono block mt-0.5">
                      {viewingRecord.invoiceDate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Lot / Batch Number</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.lotBatchNumber || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Bill of Lading (BL) No</span>
                    <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.billOfLadingNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BL Date</span>
                    <span className="font-semibold text-slate-800 font-mono block mt-0.5">
                      {viewingRecord.billOfLadingDate || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Port of Loading</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {viewingRecord.portOfLoading || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Freight, Insurance & Exchange Rate */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-200 pb-2">
                  <DollarSign size={15} className="text-emerald-600" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    Valuation, Freight & Insurance
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Freight (USD)</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm block mt-0.5">
                      ${viewingRecord.freightUsd?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Insurance (USD)</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm block mt-0.5">
                      ${viewingRecord.insuranceUsd?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BOE Exchange Rate</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.boeExRate ? `₹${viewingRecord.boeExRate}` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Bill of Entry (BE) & Customs Details */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-100 pb-2">
                  <FileCheck size={15} className="text-blue-600" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    Bill of Entry (BE) & Duty Status
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE Number</span>
                    <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.beNo || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE Date</span>
                    <span className="font-semibold text-slate-800 font-mono block mt-0.5">
                      {viewingRecord.beDate || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE Status</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {viewingRecord.beStatus || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Deferred Duty</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {viewingRecord.deferredDuty || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Deferred Duty Amount</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.deferredDutyAmt || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Payment Due Date</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.paymentDueDate || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Stamp Duty Amount</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.stampDutyAmount || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Stamp Duty Date</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.stampDutyDate || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE Query / Remarks</span>
                    <span className="text-slate-700 block mt-0.5">
                      {viewingRecord.beQuery || viewingRecord.statusRemark || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Associated Containers */}
              {(() => {
                const stats = getBoeContainerStats(viewingRecord);
                const matchingContainers = (importContainers || []).filter(
                  (c) =>
                    c.aolBranchName === viewingRecord.aolBranchName &&
                    c.beNo === viewingRecord.beNo &&
                    (!c.piNo || c.piNo === viewingRecord.piNo) &&
                    c.invoiceNumber === viewingRecord.invoiceNumber &&
                    c.productName === viewingRecord.productName
                );

                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Container size={15} className="text-emerald-600" />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                          Associated Containers ({stats.containerCount})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold">
                        Logged Qty: <span className="text-emerald-700">{stats.loggedQty.toLocaleString()} Kg</span>
                        {stats.targetQty > 0 && <span> / {stats.targetQty.toLocaleString()} Kg</span>}
                      </div>
                    </div>

                    {matchingContainers.length === 0 ? (
                      <div className="text-center py-3 text-slate-400 text-xs italic">
                        No containers logged yet for this BOE.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-[10px] font-mono font-bold text-slate-400 uppercase">
                              <th className="py-1.5 px-2">Container No</th>
                              <th className="py-1.5 px-2">Size</th>
                              <th className="py-1.5 px-2">Quantity (Kg)</th>
                              <th className="py-1.5 px-2">IGM Status</th>
                              <th className="py-1.5 px-2">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {matchingContainers.map((c) => (
                              <tr key={c.id}>
                                <td className="py-2 px-2 font-mono font-bold text-slate-900">{c.containerNo}</td>
                                <td className="py-2 px-2 font-mono text-slate-700">{c.sizeOfContainer}</td>
                                <td className="py-2 px-2 font-mono font-bold text-emerald-700">{c.containerWiseQty}</td>
                                <td className="py-2 px-2 text-[10px] text-slate-600">
                                  {c.igmNoDt ? `IGM: ${c.igmNoDt}` : "—"}
                                </td>
                                <td className="py-2 px-2 text-slate-600">{c.remark || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal from Google Sheets / CSV */}
      <ImportBoeBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onAddImportBoe={onAddImportBoe}
        onUpdateImportBoe={onUpdateImportBoe}
        existingBoes={importBoes}
        importPis={importPis}
        importContainers={importContainers}
        aolBranches={aolBranches}
        suppliers={suppliers}
        products={products}
        freightTerms={freightTerms}
        activeUserId={activeUserId}
        activeUserName={activeUser?.name}
        appsScriptUrl={config.url}
        sheetName={config.sheetName}
        onSyncToAppsScript={(action, record) => triggerSync(action, record)}
      />
    </div>
  );
}
