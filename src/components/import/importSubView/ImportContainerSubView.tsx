/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { ImportContainerRecord, ImportBoeRecord, ImportPiRecord, User, Role } from "../../../types";
import { Plus, Search, Trash2, Edit, Building2, Eye, EyeOff, Check, X, ShieldAlert, Box, Layers, Receipt, Container, Scale, AlertCircle, FileSpreadsheet, Ship } from "lucide-react";
import AppsScriptSyncBanner, { useAppsScriptSync } from "../../Configuration/AppsScriptSyncBanner";
import ImportContainerBulkImportModal from "../ImportContainerBulkImportModal";

interface ImportContainerSubViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importBoes: ImportBoeRecord[];
  importContainers: ImportContainerRecord[];
  onAddImportContainer: (record: Omit<ImportContainerRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  onUpdateImportContainer: (record: ImportContainerRecord) => void;
  onDeleteImportContainer: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
}

export default function ImportContainerSubView({
  activeUserId,
  users,
  importPis,
  importBoes,
  importContainers,
  onAddImportContainer,
  onUpdateImportContainer,
  onDeleteImportContainer,
  canAdd = true,
  canEdit = true
}: ImportContainerSubViewProps) {
  // Admin / Edit / Add Permission Check
  const activeUser = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUser?.role === Role.Admin || activeUser?.role === ("Admin" as Role);
  const isEditable = isAdmin || canEdit !== false;
  const isAddable = isAdmin || canAdd !== false;

  // Form State for Creating Container Entry
  const [aolBranchName, setAolBranchName] = useState<string>("");
  const [beNo, setBeNo] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [containerNo, setContainerNo] = useState<string>("");
  const [sizeOfContainer, setSizeOfContainer] = useState<string>("20 FT");
  const [containerWiseQty, setContainerWiseQty] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  // UI Toggle States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [hiddenRowIds, setHiddenRowIds] = useState<Record<string, boolean>>({});
  const [areAllHidden, setAreAllHidden] = useState<boolean>(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ImportContainerRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ImportContainerRecord | null>(null);
  const [deletingContainerId, setDeletingContainerId] = useState<string | null>(null);

  // Background Google Sheets Sync Hook (Dedicated Sub-tab Config)
  const { config, syncStatus, setSyncStatus, triggerSync } = useAppsScriptSync(
    "import_container_config",
    "Import Containers",
    "import_containers",
    "import_container_igm_config"
  );

  // Calculate next sequential Record ID (CN-#) based on maximum existing ID number
  const getTrackedNextContainerId = (offset: number = 0) => {
    let maxNum = 0;
    importContainers.forEach((r) => {
      if (!r.id) return;
      const match = r.id.match(/^CN-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const baseNum = maxNum > 0 ? maxNum : importContainers.length;
    const nextNum = baseNum + 1 + offset;
    return `CN-${nextNum}`;
  };

  // ==========================================
  // HELPER FUNCTIONS FOR PI QUANTITY VALIDATION
  // ==========================================

  // Helper to robustly parse numeric values from numbers or strings
  const parseNumericVal = (val: unknown): number => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const str = String(val).replace(/,/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Get total PI purchase quantity for a given Branch, PI No, and Product without double-counting
  const getPiQuantityForProduct = (branch: string, piNo: string, product: string): number => {
    if (!branch || !piNo || !product) return 0;
    const cleanBranch = String(branch || "").trim().toLowerCase();
    const cleanPi = String(piNo || "").trim().toLowerCase();
    const cleanProd = String(product || "").trim().toLowerCase();
    const normProd = cleanProd.replace(/[^a-zA-Z0-9]/g, "");

    const isProdMatch = (candidateName: unknown): boolean => {
      if (!candidateName) return false;
      const c = String(candidateName).trim().toLowerCase();
      if (c === cleanProd) return true;
      if (normProd && c.replace(/[^a-zA-Z0-9]/g, "") === normProd) return true;
      return false;
    };

    let total = 0;
    const seenItemKeys = new Set<string>();

    // 1. Strict match on branch & PI No
    const matchingPis = importPis.filter(
      (p) =>
        String(p.aolBranchName || "").trim().toLowerCase() === cleanBranch &&
        String(p.piNo || "").trim().toLowerCase() === cleanPi
    );

    matchingPis.forEach((pi) => {
      let foundInProducts = false;
      if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
        pi.products.forEach((p, idx) => {
          if (isProdMatch(p.productName)) {
            const itemKey = p.id || `${pi.id || pi.piNo}__prod_${idx}_${p.productName}`;
            if (!seenItemKeys.has(itemKey)) {
              seenItemKeys.add(itemKey);
              total += parseNumericVal(p.purchaseQty ?? (p as any).qty ?? (p as any).quantity);
            }
            foundInProducts = true;
          }
        });
      }
      // Only check top-level if not already found in products array for this PI record
      if (!foundInProducts && isProdMatch(pi.productName)) {
        const itemKey = pi.id || `${pi.piNo}__top_${pi.productName}`;
        if (!seenItemKeys.has(itemKey)) {
          seenItemKeys.add(itemKey);
          total += parseNumericVal(pi.purchaseQty ?? pi.totalPurchaseQty ?? (pi as any).qty);
        }
      }
    });

    // 2. Loose fallback ONLY if total is still 0
    if (total === 0) {
      const looseMatchingPis = importPis.filter(
        (p) => String(p.piNo || "").trim().toLowerCase() === cleanPi
      );
      looseMatchingPis.forEach((pi) => {
        let foundInProducts = false;
        if (pi.products && Array.isArray(pi.products) && pi.products.length > 0) {
          pi.products.forEach((p, idx) => {
            if (isProdMatch(p.productName)) {
              const itemKey = p.id || `${pi.id || pi.piNo}__loose_${idx}_${p.productName}`;
              if (!seenItemKeys.has(itemKey)) {
                seenItemKeys.add(itemKey);
                total += parseNumericVal(p.purchaseQty ?? (p as any).qty ?? (p as any).quantity);
              }
              foundInProducts = true;
            }
          });
        }
        if (!foundInProducts && isProdMatch(pi.productName)) {
          const itemKey = pi.id || `${pi.piNo}__loose_top_${pi.productName}`;
          if (!seenItemKeys.has(itemKey)) {
            seenItemKeys.add(itemKey);
            total += parseNumericVal(pi.purchaseQty ?? pi.totalPurchaseQty ?? (pi as any).qty);
          }
        }
      });
    }

    return total;
  };

  // Get current logged total container quantity for a given Branch, PI No, and Product
  const getLoggedContainerQty = (
    branch: string,
    piNo: string,
    product: string,
    excludeId?: string
  ): number => {
    if (!branch || !piNo || !product) return 0;
    const cleanBranch = String(branch || "").trim().toLowerCase();
    const cleanPi = String(piNo || "").trim().toLowerCase();
    const cleanProd = String(product || "").trim().toLowerCase();
    const normProd = cleanProd.replace(/[^a-zA-Z0-9]/g, "");

    const isProdMatch = (candidateName: unknown): boolean => {
      if (!candidateName) return false;
      const c = String(candidateName).trim().toLowerCase();
      if (c === cleanProd) return true;
      if (normProd && c.replace(/[^a-zA-Z0-9]/g, "") === normProd) return true;
      return false;
    };

    return importContainers.reduce((sum, container) => {
      if (excludeId && container.id === excludeId) return sum;
      if (
        String(container.aolBranchName || "").trim().toLowerCase() !== cleanBranch ||
        !isProdMatch(container.productName)
      ) {
        return sum;
      }

      let cPiNo = container.piNo;
      if (!cPiNo) {
        const matchBoe = importBoes.find(
          (b) =>
            String(b.aolBranchName || "").trim().toLowerCase() === cleanBranch &&
            String(b.beNo || "").trim().toLowerCase() === String(container.beNo || "").trim().toLowerCase() &&
            String(b.invoiceNumber || "").trim().toLowerCase() === String(container.invoiceNumber || "").trim().toLowerCase() &&
            isProdMatch(b.productName)
        );
        cPiNo = matchBoe?.piNo;
      }

      if (String(cPiNo || "").trim().toLowerCase() === cleanPi) {
        return sum + parseNumericVal(container.containerWiseQty);
      }
      return sum;
    }, 0);
  };

  // Check if a specific BOE product entry is fully completed (loggedQty >= piQty)
  const isBoeProductCompleted = (
    branch: string,
    beNo: string,
    invoiceNumber: string,
    productName: string,
    excludeId?: string
  ): boolean => {
    const matchBoe = importBoes.find(
      (b) =>
        (b.aolBranchName || "").trim().toLowerCase() === (branch || "").trim().toLowerCase() &&
        (b.beNo || "").trim().toLowerCase() === (beNo || "").trim().toLowerCase() &&
        (b.invoiceNumber || "").trim().toLowerCase() === (invoiceNumber || "").trim().toLowerCase() &&
        (b.productName || "").trim().toLowerCase() === (productName || "").trim().toLowerCase()
    );
    const cPiNo = matchBoe?.piNo || "";
    let piQty = parseNumericVal(matchBoe?.purchaseQty);
    if (piQty <= 0) {
      piQty = getPiQuantityForProduct(branch, cPiNo, productName);
    }
    if (piQty <= 0) return true; // No PI quantity means target reached / unavailable

    const loggedQty = getLoggedContainerQty(branch, cPiNo, productName, excludeId);
    return loggedQty >= piQty;
  };

  // ==========================================
  // CASCADING DROPDOWNS FOR CREATE FORM (FROM BOE)
  // ==========================================

  // 1. Available Branches in BOE (Filtering out branches where all products are completed)
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    importBoes.forEach((b) => {
      if (b.aolBranchName) {
        if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName)) {
          branchSet.add(b.aolBranchName);
        }
      }
    });
    return Array.from(branchSet);
  }, [importBoes, importPis, importContainers]);

  useEffect(() => {
    if (availableBranches.length > 0) {
      if (!aolBranchName || !availableBranches.includes(aolBranchName)) {
        setAolBranchName(availableBranches[0]);
      }
    } else {
      setAolBranchName("");
    }
  }, [availableBranches]);

  // 2. Available BE Numbers for selected Branch (Filtering out completed BEs)
  const availableBeNumbers = useMemo(() => {
    if (!aolBranchName) return [];
    const beSet = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === aolBranchName)
      .forEach((b) => {
        if (b.beNo) {
          if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName)) {
            beSet.add(b.beNo);
          }
        }
      });
    return Array.from(beSet);
  }, [importBoes, importPis, importContainers, aolBranchName]);

  useEffect(() => {
    if (availableBeNumbers.length > 0) {
      if (!beNo || !availableBeNumbers.includes(beNo)) {
        setBeNo(availableBeNumbers[0]);
      }
    } else {
      setBeNo("");
    }
  }, [availableBeNumbers]);

  // 3. Available Invoice Numbers for selected Branch + BE NO (Filtering out completed Invoices)
  const availableInvoiceNumbers = useMemo(() => {
    if (!aolBranchName || !beNo) return [];
    const invSet = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === aolBranchName && b.beNo === beNo)
      .forEach((b) => {
        if (b.invoiceNumber) {
          if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName)) {
            invSet.add(b.invoiceNumber);
          }
        }
      });
    return Array.from(invSet);
  }, [importBoes, importPis, importContainers, aolBranchName, beNo]);

  useEffect(() => {
    if (availableInvoiceNumbers.length > 0) {
      if (!invoiceNumber || !availableInvoiceNumbers.includes(invoiceNumber)) {
        setInvoiceNumber(availableInvoiceNumbers[0]);
      }
    } else {
      setInvoiceNumber("");
    }
  }, [availableInvoiceNumbers]);

  // 4. Available Products for selected Branch + BE NO + Invoice Number (Filtering out completed Products)
  const availableProducts = useMemo(() => {
    if (!aolBranchName || !beNo || !invoiceNumber) return [];
    const prodSet = new Set<string>();
    importBoes
      .filter(
        (b) =>
          b.aolBranchName === aolBranchName &&
          b.beNo === beNo &&
          b.invoiceNumber === invoiceNumber
      )
      .forEach((b) => {
        if (b.productName) {
          if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName)) {
            prodSet.add(b.productName);
          }
        }
      });
    return Array.from(prodSet);
  }, [importBoes, importPis, importContainers, aolBranchName, beNo, invoiceNumber]);

  useEffect(() => {
    if (availableProducts.length > 0) {
      if (!productName || !availableProducts.includes(productName)) {
        setProductName(availableProducts[0]);
      }
    } else {
      setProductName("");
    }
  }, [availableProducts]);

  // Resolve current PI No for selected BOE cascading combination
  const selectedBoeRecord = useMemo(() => {
    if (!aolBranchName || !beNo || !invoiceNumber || !productName) return null;
    return importBoes.find(
      (b) =>
        b.aolBranchName === aolBranchName &&
        b.beNo === beNo &&
        b.invoiceNumber === invoiceNumber &&
        b.productName === productName
    );
  }, [importBoes, aolBranchName, beNo, invoiceNumber, productName]);

  const currentPiNo = selectedBoeRecord?.piNo || "";

  // PI Quantity validation metrics for Create Form
  const createFormPiQty = useMemo(() => {
    if (selectedBoeRecord?.purchaseQty && parseNumericVal(selectedBoeRecord.purchaseQty) > 0) {
      return parseNumericVal(selectedBoeRecord.purchaseQty);
    }
    return getPiQuantityForProduct(aolBranchName, currentPiNo, productName);
  }, [importPis, selectedBoeRecord, aolBranchName, currentPiNo, productName]);

  const createFormLoggedQty = useMemo(() => {
    return getLoggedContainerQty(aolBranchName, currentPiNo, productName);
  }, [importContainers, importBoes, aolBranchName, currentPiNo, productName]);

  const createFormRemainingQty = useMemo(() => {
    return Math.max(0, createFormPiQty - createFormLoggedQty);
  }, [createFormPiQty, createFormLoggedQty]);

  const enteredQtyNum = parseFloat(containerWiseQty) || 0;
  const isCreateExceeding =
    createFormPiQty > 0
      ? createFormLoggedQty + enteredQtyNum > createFormPiQty
      : enteredQtyNum > 0;

  // ==========================================
  // CASCADING DROPDOWNS FOR EDIT MODAL (FROM BOE)
  // ==========================================

  const editAvailableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    importBoes.forEach((b) => {
      if (b.aolBranchName) {
        if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName, editingRecord?.id)) {
          branchSet.add(b.aolBranchName);
        }
      }
    });
    if (editingRecord?.aolBranchName) {
      branchSet.add(editingRecord.aolBranchName);
    }
    return Array.from(branchSet);
  }, [importBoes, importPis, importContainers, editingRecord?.id, editingRecord?.aolBranchName]);

  const editAvailableBeNumbers = useMemo(() => {
    if (!editingRecord?.aolBranchName) return [];
    const beSet = new Set<string>();
    importBoes
      .filter((b) => b.aolBranchName === editingRecord.aolBranchName)
      .forEach((b) => {
        if (b.beNo) {
          if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName, editingRecord.id)) {
            beSet.add(b.beNo);
          }
        }
      });
    if (editingRecord.beNo) {
      beSet.add(editingRecord.beNo);
    }
    return Array.from(beSet);
  }, [importBoes, importPis, importContainers, editingRecord?.aolBranchName, editingRecord?.id, editingRecord?.beNo]);

  const editAvailableInvoiceNumbers = useMemo(() => {
    if (!editingRecord?.aolBranchName || !editingRecord?.beNo) return [];
    const invSet = new Set<string>();
    importBoes
      .filter(
        (b) =>
          b.aolBranchName === editingRecord.aolBranchName &&
          b.beNo === editingRecord.beNo
      )
      .forEach((b) => {
        if (b.invoiceNumber) {
          if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName, editingRecord.id)) {
            invSet.add(b.invoiceNumber);
          }
        }
      });
    if (editingRecord.invoiceNumber) {
      invSet.add(editingRecord.invoiceNumber);
    }
    return Array.from(invSet);
  }, [importBoes, importPis, importContainers, editingRecord?.aolBranchName, editingRecord?.beNo, editingRecord?.id, editingRecord?.invoiceNumber]);

  const editAvailableProducts = useMemo(() => {
    if (
      !editingRecord?.aolBranchName ||
      !editingRecord?.beNo ||
      !editingRecord?.invoiceNumber
    )
      return [];
    const prodSet = new Set<string>();
    importBoes
      .filter(
        (b) =>
          b.aolBranchName === editingRecord.aolBranchName &&
          b.beNo === editingRecord.beNo &&
          b.invoiceNumber === editingRecord.invoiceNumber
      )
      .forEach((b) => {
        if (b.productName) {
          if (!isBoeProductCompleted(b.aolBranchName, b.beNo, b.invoiceNumber, b.productName, editingRecord.id)) {
            prodSet.add(b.productName);
          }
        }
      });
    if (editingRecord.productName) {
      prodSet.add(editingRecord.productName);
    }
    return Array.from(prodSet);
  }, [
    importBoes,
    importPis,
    importContainers,
    editingRecord?.aolBranchName,
    editingRecord?.beNo,
    editingRecord?.invoiceNumber,
    editingRecord?.id,
    editingRecord?.productName
  ]);

  // Edit Modal PI metrics
  const editBoeRecord = useMemo(() => {
    if (
      !editingRecord?.aolBranchName ||
      !editingRecord?.beNo ||
      !editingRecord?.invoiceNumber ||
      !editingRecord?.productName
    )
      return null;
    return importBoes.find(
      (b) =>
        b.aolBranchName === editingRecord.aolBranchName &&
        b.beNo === editingRecord.beNo &&
        b.invoiceNumber === editingRecord.invoiceNumber &&
        b.productName === editingRecord.productName
    );
  }, [importBoes, editingRecord?.aolBranchName, editingRecord?.beNo, editingRecord?.invoiceNumber, editingRecord?.productName]);

  const editPiNo = editingRecord?.piNo || editBoeRecord?.piNo || "";

  const editPiQty = useMemo(() => {
    if (!editingRecord) return 0;
    if (editBoeRecord?.purchaseQty && parseNumericVal(editBoeRecord.purchaseQty) > 0) {
      return parseNumericVal(editBoeRecord.purchaseQty);
    }
    return getPiQuantityForProduct(
      editingRecord.aolBranchName,
      editPiNo,
      editingRecord.productName
    );
  }, [importPis, editBoeRecord, editingRecord?.aolBranchName, editPiNo, editingRecord?.productName]);

  const editLoggedQtyExcludingCurrent = useMemo(() => {
    if (!editingRecord) return 0;
    return getLoggedContainerQty(
      editingRecord.aolBranchName,
      editPiNo,
      editingRecord.productName,
      editingRecord.id
    );
  }, [importContainers, importBoes, editingRecord?.aolBranchName, editPiNo, editingRecord?.productName, editingRecord?.id]);

  const editRemainingQty = Math.max(0, editPiQty - editLoggedQtyExcludingCurrent);
  const isEditExceeding = editPiQty > 0
    ? editLoggedQtyExcludingCurrent + (editingRecord?.containerWiseQty || 0) > editPiQty
    : (editingRecord?.containerWiseQty || 0) > 0;

  // Submit Handler for Create Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!aolBranchName) {
      alert("Please select a Branch (Entries must first exist in BOE database).");
      return;
    }
    if (!beNo) {
      alert("Please select a BE NO.");
      return;
    }
    if (!invoiceNumber) {
      alert("Please select an Invoice Number.");
      return;
    }
    if (!productName) {
      alert("Please select a Product Name.");
      return;
    }
    if (!containerNo.trim()) {
      alert("Please enter a Container Number.");
      return;
    }

    const qtyVal = parseFloat(containerWiseQty) || 0;
    if (qtyVal <= 0) {
      alert("Please enter a valid positive Container Wise Quantity.");
      return;
    }

    // STRICT VALIDATION RULE:
    // Total container quantity for a product in the same Branch & PI cannot exceed PI sub-tab quantity
    const totalNewQty = createFormLoggedQty + qtyVal;
    if (createFormPiQty > 0 && totalNewQty > createFormPiQty) {
      alert(
        `⚠️ VALIDATION ERROR: Cannot add container!\n\n` +
          `Total container quantity (${totalNewQty.toLocaleString()} MT) for product '${productName}' would exceed the allowed PI quantity (${createFormPiQty.toLocaleString()} MT) for Branch '${aolBranchName}' and PI #${currentPiNo}.\n\n` +
          `• PI Allowed Qty: ${createFormPiQty.toLocaleString()} MT\n` +
          `• Already Logged Containers: ${createFormLoggedQty.toLocaleString()} MT\n` +
          `• Maximum Allowed Remaining: ${createFormRemainingQty.toLocaleString()} MT\n` +
          `• You Attempted to Add: ${qtyVal.toLocaleString()} MT`
      );
      return;
    } else if (createFormPiQty === 0) {
      alert(
        `⚠️ VALIDATION ERROR: No matching PI quantity found!\n\n` +
          `No PI purchase quantity found for product '${productName}' in Branch '${aolBranchName}' and PI #${currentPiNo || "N/A"}.\n` +
          `Please ensure the PI is created and product quantity is defined in the PI sub-tab first.`
      );
      return;
    }

    const newRecord: Omit<ImportContainerRecord, "id" | "createdAt"> = {
      aolBranchName,
      beNo,
      invoiceNumber,
      productName,
      piNo: currentPiNo,
      containerNo: containerNo.trim(),
      sizeOfContainer: sizeOfContainer.trim() || "20 FT",
      containerWiseQty: qtyVal,
      remark: remark.trim() || undefined,
      entryDate: entryDate || new Date().toISOString().split("T")[0],
      createdByUserId: activeUserId,
      createdByName: activeUser?.name || "Current User"
    };

    const generatedId = getTrackedNextContainerId();
    const fullRecord: ImportContainerRecord = {
      ...newRecord,
      id: generatedId,
      createdAt: new Date().toISOString()
    };

    onAddImportContainer(fullRecord);
    triggerSync("ADD", fullRecord);

    // Reset container specific fields
    setContainerNo("");
    setContainerWiseQty("");
    setRemark("");
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: ImportContainerRecord) => {
    if (!isEditable) {
      alert("You do not have permission to edit Container records.");
      return;
    }
    setEditingRecord({ ...rec });
  };

  // Save Edit Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (
      !editingRecord.aolBranchName ||
      !editingRecord.beNo ||
      !editingRecord.invoiceNumber ||
      !editingRecord.productName
    ) {
      alert("Please fill all required cascading fields.");
      return;
    }

    if (!editingRecord.containerNo.trim()) {
      alert("Please enter Container No.");
      return;
    }

    const newEditQty = Number(editingRecord.containerWiseQty) || 0;
    if (newEditQty <= 0) {
      alert("Please enter a valid positive Container Wise Quantity.");
      return;
    }

    // STRICT VALIDATION RULE FOR EDIT:
    const totalNewEditQty = editLoggedQtyExcludingCurrent + newEditQty;
    if (editPiQty > 0 && totalNewEditQty > editPiQty) {
      alert(
        `⚠️ VALIDATION ERROR: Cannot update container!\n\n` +
          `Total container quantity (${totalNewEditQty.toLocaleString()} MT) for product '${editingRecord.productName}' would exceed the allowed PI quantity (${editPiQty.toLocaleString()} MT) for Branch '${editingRecord.aolBranchName}' and PI #${editPiNo}.\n\n` +
          `• PI Allowed Qty: ${editPiQty.toLocaleString()} MT\n` +
          `• Other Logged Containers: ${editLoggedQtyExcludingCurrent.toLocaleString()} MT\n` +
          `• Maximum Allowed Remaining: ${editRemainingQty.toLocaleString()} MT\n` +
          `• You Attempted to Set: ${newEditQty.toLocaleString()} MT`
      );
      return;
    } else if (editPiQty === 0) {
      alert(
        `⚠️ VALIDATION ERROR: No matching PI quantity found!\n\n` +
          `No PI purchase quantity found for product '${editingRecord.productName}' in Branch '${editingRecord.aolBranchName}' and PI #${editPiNo || "N/A"}.`
      );
      return;
    }

    const updatedRecord = {
      ...editingRecord,
      piNo: editPiNo || editingRecord.piNo
    };
    onUpdateImportContainer(updatedRecord);
    triggerSync("EDIT", updatedRecord);
    setEditingRecord(null);
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return importContainers.filter((rec) => {
      const matchesBranch =
        selectedBranchFilter === "ALL" || rec.aolBranchName === selectedBranchFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rec.containerNo.toLowerCase().includes(q) ||
        rec.beNo.toLowerCase().includes(q) ||
        rec.invoiceNumber.toLowerCase().includes(q) ||
        rec.productName.toLowerCase().includes(q) ||
        rec.aolBranchName.toLowerCase().includes(q) ||
        (rec.piNo && rec.piNo.toLowerCase().includes(q)) ||
        (rec.remark && rec.remark.toLowerCase().includes(q));

      return matchesBranch && matchesSearch;
    });
  }, [importContainers, searchQuery, selectedBranchFilter]);

  // Overall Totals
  const totalQty = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (r.containerWiseQty || 0), 0);
  }, [filteredRecords]);

  const distinctBeCount = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach((r) => set.add(r.beNo));
    return set.size;
  }, [filteredRecords]);

  return (
    <div className="flex flex-col gap-5">
      {/* GOOGLE SHEETS BACKGROUND SYNC BANNER */}
      <AppsScriptSyncBanner
        configKey="import_container_config"
        defaultSheetName="Import Containers"
        collectionKey="import_containers"
        records={importContainers}
        activeUser={activeUser}
        moduleTitle="Containers"
        config={config}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        onDataFetched={(records) => {
          records.forEach((r) => {
            const existing = importContainers.find((c) => c.containerNo === r.containerNo || c.id === r.id);
            if (existing) {
              onUpdateImportContainer({ ...existing, ...r });
            } else {
              onAddImportContainer(r);
            }
          });
        }}
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Containers Logged</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{filteredRecords.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Container size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Container Qty</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {totalQty.toLocaleString("en-US", { maximumFractionDigits: 3 })}{" "}
              <span className="text-xs font-normal text-slate-500">MT/Units</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Active BE Numbers</p>
            <p className="text-xl font-extrabold text-purple-700 mt-0.5">{distinctBeCount}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Receipt size={20} />
          </div>
        </div>
      </div>

      {/* CREATE CONTAINER FORM */}
      {isAddable && (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div
          className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <div className="flex items-center gap-2">
            <Container size={16} className="text-emerald-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider font-mono">
              Add Container Entry (Cascaded from BOE)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {isFormOpen ? "Hide Form" : "Show Form"}
          </span>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
            {importBoes.length === 0 && (
              <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                <p>
                  No BOE entries found! Please create entries in the <strong>BOE</strong> sub-tab first to populate the cascading dropdowns.
                </p>
              </div>
            )}

            {/* SECTION 1: CASCADING DROPDOWNS FROM BOE */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <Building2 size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Step 1: Cascading BOE Selection (Branch &rarr; BE NO &rarr; Invoice No &rarr; Product Name)
                  </span>
                </div>
                {currentPiNo && (
                  <span className="text-[10px] font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                    PI #{currentPiNo}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Branch */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Branch *
                  </label>
                  <select
                    value={aolBranchName}
                    onChange={(e) => setAolBranchName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  >
                    {availableBranches.length === 0 ? (
                      <option value="">No BOE Branches</option>
                    ) : (
                      availableBranches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* BE NO */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE NO *
                  </label>
                  <select
                    value={beNo}
                    onChange={(e) => setBeNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                    disabled={availableBeNumbers.length === 0}
                  >
                    {availableBeNumbers.length === 0 ? (
                      <option value="">No Available BE NOs</option>
                    ) : (
                      availableBeNumbers.map((be) => (
                        <option key={be} value={be}>
                          {be}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Invoice Number *
                  </label>
                  <select
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                    disabled={availableInvoiceNumbers.length === 0}
                  >
                    {availableInvoiceNumbers.length === 0 ? (
                      <option value="">No Available Invoices</option>
                    ) : (
                      availableInvoiceNumbers.map((inv) => (
                        <option key={inv} value={inv}>
                          {inv}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Product Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name *
                  </label>
                  <select
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
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
              </div>
            </div>

            {/* LIVE PI QUANTITY ALLOCATION STATUS CARD */}
            {productName && (
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isCreateExceeding
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : createFormRemainingQty === 0
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      isCreateExceeding
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <Scale size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold uppercase tracking-wide">
                        PI Quantity Allocation Check
                      </p>
                      {currentPiNo && (
                        <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          PI #{currentPiNo}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Product: <strong className="text-slate-800">{productName}</strong> ({aolBranchName})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-400">PI Total Qty</p>
                    <p className="font-extrabold text-slate-800">{createFormPiQty.toLocaleString()} MT</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Logged Containers</p>
                    <p className="font-extrabold text-blue-700">{createFormLoggedQty.toLocaleString()} MT</p>
                  </div>
                  <div className="text-center bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Remaining Balance</p>
                    <p
                      className={`font-black ${
                        isCreateExceeding ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {createFormRemainingQty.toLocaleString()} MT
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: CONTAINER DETAILS */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Box size={15} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Step 2: Container Information & Quantity
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* Entry Date */}
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

                {/* Container No */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Container No *
                  </label>
                  <input
                    type="text"
                    value={containerNo}
                    onChange={(e) => setContainerNo(e.target.value)}
                    placeholder="e.g. MSKU 849201-9"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Size Of Container */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Size Of Container *
                  </label>
                  <input
                    type="text"
                    value={sizeOfContainer}
                    onChange={(e) => setSizeOfContainer(e.target.value)}
                    placeholder="e.g. 20 FT, 40 HQ"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Container Wise Qty */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Container Wise Qty *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={containerWiseQty}
                    onChange={(e) => setContainerWiseQty(e.target.value)}
                    placeholder="e.g. 25.50"
                    className={`w-full text-xs border px-2.5 py-1.5 rounded-lg outline-none font-semibold ${
                      isCreateExceeding
                        ? "border-rose-400 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                    required
                  />
                </div>

                {/* Remark */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Remark
                  </label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* EXCEED WARNING BANNER */}
            {isCreateExceeding && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-fade-in">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <p>
                  Entered quantity ({enteredQtyNum} MT) + existing containers ({createFormLoggedQty} MT) = {(createFormLoggedQty + enteredQtyNum)} MT, which exceeds the PI purchase limit of {createFormPiQty} MT!
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={availableProducts.length === 0 || isCreateExceeding}
                className={`flex items-center gap-1.5 font-bold text-xs px-6 py-2.5 rounded-lg shadow-xs transition cursor-pointer ${
                  availableProducts.length === 0 || isCreateExceeding
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Plus size={15} /> Save Container Entry to Database
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {/* SEARCH, FILTER & DATA TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Controls Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Container No, BE No, Invoice No, PI No, Product..."
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
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Import Button */}
            {isAddable && (
              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                title="Import multiple Container rows from Google Sheets or CSV"
              >
                <FileSpreadsheet size={14} className="text-emerald-700" />
                Import from Sheet / CSV
              </button>
            )}

            {/* Toggle All Hide/Unhide */}
            <button
              onClick={() => {
                const nextState = !areAllHidden;
                setAreAllHidden(nextState);
                const newHidden: Record<string, boolean> = {};
                filteredRecords.forEach((r) => {
                  newHidden[r.id] = nextState;
                });
                setHiddenRowIds(newHidden);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
            >
              {areAllHidden ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-slate-500" />}
              {areAllHidden ? "Unhide All Rows" : "Hide All Rows"}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Branch & BE / PI NO</th>
                <th className="py-2.5 px-3">Invoice Number</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Container No</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Wise Qty</th>
                <th className="py-2.5 px-3">Remark</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Container size={28} className="text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">No container records found</p>
                      <p className="text-[11px] text-slate-400">
                        Create entries above using existing BOE database entries.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isHidden = hiddenRowIds[rec.id];

                  // Resolve PI NO if not saved explicitly
                  let displayPiNo = rec.piNo;
                  if (!displayPiNo) {
                    const matchBoe = importBoes.find(
                      (b) =>
                        b.aolBranchName === rec.aolBranchName &&
                        b.beNo === rec.beNo &&
                        b.invoiceNumber === rec.invoiceNumber &&
                        b.productName === rec.productName
                    );
                    displayPiNo = matchBoe?.piNo || "—";
                  }

                  if (isHidden) {
                    return (
                      <tr key={rec.id} className="bg-slate-50/50">
                        <td colSpan={7} className="py-2 px-3 text-slate-400 italic text-[11px]">
                          [Row hidden: Container #{rec.containerNo} — BE #{rec.beNo} ({rec.productName})]
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() =>
                              setHiddenRowIds((prev) => ({ ...prev, [rec.id]: false }))
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

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Branch & BE / PI NO */}
                      <td className="py-3 px-3">
                        {rec.id && (
                          <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider mb-0.5 block font-mono">
                            ID: {rec.id}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 text-xs">{rec.beNo}</span>
                          {displayPiNo && displayPiNo !== "—" && (
                            <span className="text-[9px] font-mono font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                              PI #{displayPiNo}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold inline-block mt-0.5">
                          {rec.aolBranchName}
                        </span>
                      </td>

                      {/* Invoice Number */}
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {rec.invoiceNumber}
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {rec.productName}
                      </td>

                      {/* Container No & IGM Badges */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-extrabold text-slate-800 text-xs">
                          {rec.containerNo}
                        </div>
                        {rec.igmContainerGatedIn && (
                          <div className="mt-1">
                            <span className="text-[9px] font-mono font-extrabold text-purple-900 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shadow-2xs" title="Container Gated In Date">
                              Gate-In: {rec.igmContainerGatedIn}
                            </span>
                          </div>
                        )}
                        {rec.igmNoDt && (
                          <div className="mt-0.5">
                            <span className="text-[9px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded inline-block truncate max-w-[140px]" title={`IGM No & Date: ${rec.igmNoDt}`}>
                              IGM: {rec.igmNoDt}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                          {rec.sizeOfContainer}
                        </span>
                      </td>

                      {/* Wise Qty */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {rec.containerWiseQty}
                      </td>

                      {/* Remark */}
                      <td className="py-3 px-3 text-slate-600">
                        {rec.remark || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {deletingContainerId === rec.id ? (
                          <div className="flex items-center justify-end gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-fade-in">
                            <span className="text-[10px] font-extrabold text-rose-800">Delete?</span>
                            <button
                              onClick={() => {
                                onDeleteImportContainer(rec.id);
                                triggerSync("DELETE", { id: rec.id });
                                setDeletingContainerId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded transition cursor-pointer shadow-2xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingContainerId(null)}
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
                              title="View Container Details"
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
                              title={isEditable ? "Edit Container Record" : "No Edit Permission"}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (!isAdmin) {
                                  alert("Only Admins are permitted to delete Container records.");
                                  return;
                                }
                                setDeletingContainerId(rec.id);
                              }}
                              disabled={!isAdmin}
                              className={`p-1.5 rounded transition ${
                                isAdmin
                                  ? "text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  : "text-slate-300 cursor-not-allowed"
                              }`}
                              title={isAdmin ? "Delete Container Record" : "Admin Only"}
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
                <Container size={18} className="text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900 font-mono uppercase tracking-wider">
                  Edit Container Entry
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* Branch */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Branch
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

                {/* BE NO */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    BE NO
                  </label>
                  <select
                    value={editingRecord.beNo}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, beNo: e.target.value })
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

                {/* Invoice Number */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Invoice Number
                  </label>
                  <select
                    value={editingRecord.invoiceNumber}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, invoiceNumber: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  >
                    {editAvailableInvoiceNumbers.map((inv) => (
                      <option key={inv} value={inv}>
                        {inv}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Name */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Product Name
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

              {/* Edit Modal PI Metrics Status Box */}
              {editingRecord.productName && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                    isEditExceeding
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
                  }`}
                >
                  <div>
                    <p className="font-extrabold uppercase text-[10px] text-slate-500">PI Limit Check ({editPiNo ? `PI #${editPiNo}` : "No PI"})</p>
                    <p className="text-slate-800 font-bold mt-0.5">
                      Allowed PI Qty: {editPiQty.toLocaleString()} MT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold uppercase text-[9px] text-slate-400">Other Containers Logged</p>
                    <p className="font-bold text-blue-700">{editLoggedQtyExcludingCurrent.toLocaleString()} MT</p>
                  </div>
                </div>
              )}

              {/* Container Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Entry Date <span className="text-slate-400 font-normal">(Readonly)</span>
                  </label>
                  <input
                    type="date"
                    value={editingRecord.entryDate || new Date().toISOString().split("T")[0]}
                    readOnly
                    disabled
                    className="w-full text-xs border border-slate-200 bg-slate-100 px-2.5 py-1.5 rounded text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Container No *
                  </label>
                  <input
                    type="text"
                    value={editingRecord.containerNo}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, containerNo: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Size Of Container *
                  </label>
                  <input
                    type="text"
                    value={editingRecord.sizeOfContainer}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, sizeOfContainer: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Container Wise Qty *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingRecord.containerWiseQty}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        containerWiseQty: parseFloat(e.target.value) || 0
                      })
                    }
                    className={`w-full text-xs border px-2 py-1.5 rounded outline-none font-semibold ${
                      isEditExceeding
                        ? "border-rose-400 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                    Remark
                  </label>
                  <input
                    type="text"
                    value={editingRecord.remark || ""}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, remark: e.target.value })
                    }
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Extended IGM & Movement Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    <Ship size={14} className="text-purple-600" />
                    Extended IGM & Movement Details
                  </span>
                  <span className="text-[10px] text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full font-mono font-bold">
                    IGM & Gate-In
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold font-mono text-purple-900 uppercase block mb-1">
                      Container Gated In
                    </label>
                    <input
                      type="date"
                      value={editingRecord.igmContainerGatedIn || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmContainerGatedIn: e.target.value })
                      }
                      className="w-full text-xs border border-purple-200 bg-purple-50/50 px-2.5 py-1.5 rounded focus:ring-1 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Final Inward Date
                    </label>
                    <input
                      type="date"
                      value={editingRecord.igmFinalInwardDate || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmFinalInwardDate: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      IGM No & Date
                    </label>
                    <input
                      type="text"
                      value={editingRecord.igmNoDt || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmNoDt: e.target.value })
                      }
                      placeholder="e.g. 234120 / 2026-09-06"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      IGM Item No
                    </label>
                    <input
                      type="text"
                      value={editingRecord.igmItemNo || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmItemNo: e.target.value })
                      }
                      placeholder="e.g. 1"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      CHA / Self Job No
                    </label>
                    <input
                      type="text"
                      value={editingRecord.igmChaSelfJobNo || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmChaSelfJobNo: e.target.value })
                      }
                      placeholder="e.g. JOB-8831"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      CFS Last Date
                    </label>
                    <input
                      type="date"
                      value={editingRecord.igmCfsLastDate || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmCfsLastDate: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Material Moved Out Of CFS
                    </label>
                    <input
                      type="date"
                      value={editingRecord.igmMaterialMovedOutOfCfs || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmMaterialMovedOutOfCfs: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      Free Empty Detention Last Dt
                    </label>
                    <input
                      type="date"
                      value={editingRecord.igmFreeEmptyCtnrDetentionLastDt || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmFreeEmptyCtnrDetentionLastDt: e.target.value })
                      }
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1">
                      IGM Status Remark
                    </label>
                    <input
                      type="text"
                      value={editingRecord.igmStatusRemark || ""}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, igmStatusRemark: e.target.value })
                      }
                      placeholder="Status or clearance remark"
                      className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded focus:ring-1 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                    />
                  </div>
                </div>

                {/* Checkpoints */}
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase block mb-1.5">
                    Clearance Checkpoints
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {[
                      { key: "igmDuty", label: "Customs Duty" },
                      { key: "igmShpLine", label: "Shipping Line" },
                      { key: "igmStampDuty", label: "Stamp Duty" },
                      { key: "igmDo", label: "Delivery Order (DO)" },
                      { key: "igmCfs", label: "CFS Gate Pass" },
                      { key: "igmOocStatus", label: "Out of Charge (OOC)" }
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className={`flex items-center gap-1.5 p-2 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                          (editingRecord as any)[key]
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean((editingRecord as any)[key])}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              [key]: e.target.checked
                            })
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span className="truncate">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditExceeding}
                  className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                    isEditExceeding
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <Check size={15} /> Save Changes
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
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Container size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-base">
                      Container Record Details
                    </h3>
                    <span className="text-[10px] font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                      #{viewingRecord.containerNo}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                      {viewingRecord.sizeOfContainer}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Detailed container specifications, linked bill of entry, quantity and movement log
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
              {/* Linked BOE & Branch Info */}
              {(() => {
                const matchBoe = importBoes.find(
                  (b) =>
                    b.aolBranchName === viewingRecord.aolBranchName &&
                    b.beNo === viewingRecord.beNo &&
                    b.invoiceNumber === viewingRecord.invoiceNumber &&
                    b.productName === viewingRecord.productName
                );
                const displayPiNo = viewingRecord.piNo || matchBoe?.piNo;

                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-200 pb-2">
                      <Building2 size={15} className="text-emerald-600" />
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                        Bill of Entry & Order Linkage
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
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BE Number</span>
                        <span className="font-bold font-mono text-slate-900 text-sm block mt-0.5">
                          {viewingRecord.beNo}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">PI Number</span>
                        <span className="font-mono text-slate-800 block mt-0.5">
                          {displayPiNo ? `PI #${displayPiNo}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Product Name</span>
                        <span className="font-bold text-slate-900 text-sm block mt-0.5">
                          {viewingRecord.productName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Commercial Invoice</span>
                        <span className="font-mono text-slate-800 font-semibold block mt-0.5">
                          {viewingRecord.invoiceNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Bill of Lading (BL)</span>
                        <span className="font-mono text-slate-800 block mt-0.5">
                          {matchBoe?.billOfLadingNo || "—"}
                          {matchBoe?.billOfLadingDate && ` (${matchBoe.billOfLadingDate})`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Container Details */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-100 pb-2">
                  <Box size={15} className="text-blue-600" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    Container Specifications
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Container Number</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm block mt-0.5">
                      {viewingRecord.containerNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Container Size</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded inline-block mt-0.5 border border-slate-200">
                      {viewingRecord.sizeOfContainer}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Container-Wise Quantity</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-base block mt-0.5">
                      {Number(viewingRecord.containerWiseQty).toLocaleString()} Kg
                    </span>
                  </div>
                </div>

                {viewingRecord.remark && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Remark</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {viewingRecord.remark}
                    </p>
                  </div>
                )}
              </div>

              {/* IGM & CFS Movement Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-3 border-b border-slate-200 pb-2">
                  <Layers size={15} className="text-purple-600" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    IGM & CFS Movement Tracking
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">IGM No & Date</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmNoDt || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">IGM Item No</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmItemNo || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">CHA / Self Job No</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmChaSelfJobNo || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Final Inward Date</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmFinalInwardDate || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Container Gated In</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmContainerGatedIn || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">CFS Last Date</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmCfsLastDate || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Material Moved Out of CFS</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmMaterialMovedOutOfCfs || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Free Empty Ctnr Detention Last Dt</span>
                    <span className="font-mono text-slate-800 block mt-0.5">
                      {viewingRecord.igmFreeEmptyCtnrDetentionLastDt || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Status Checkpoints</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${viewingRecord.igmDuty ? "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        Duty: {viewingRecord.igmDuty ? "Yes" : "No"}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${viewingRecord.igmShpLine ? "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        Shp Line: {viewingRecord.igmShpLine ? "Yes" : "No"}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${viewingRecord.igmStampDuty ? "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        Stamp: {viewingRecord.igmStampDuty ? "Yes" : "No"}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${viewingRecord.igmDo ? "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        DO: {viewingRecord.igmDo ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {viewingRecord.igmStatusRemark && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">IGM Status Remark</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                      {viewingRecord.igmStatusRemark}
                    </p>
                  </div>
                )}
              </div>
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
      <ImportContainerBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onAddImportContainer={onAddImportContainer}
        onUpdateImportContainer={onUpdateImportContainer}
        existingContainers={importContainers}
        importPis={importPis}
        importBoes={importBoes}
        activeUserId={activeUserId}
        activeUserName={activeUser?.name}
        appsScriptUrl={config.url}
        sheetName={config.sheetName}
        onSyncToAppsScript={(action, record) => triggerSync(action, record)}
      />
    </div>
  );
}
