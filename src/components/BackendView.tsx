/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { User, Role, ImportCiRecord, DomesticPdRecord, PidRecord, AccountsStRecord, OpeningStockRecord } from "../types";
import { 
  Search, Save, Check, Server, Download, ShieldCheck, HelpCircle, ArrowUpDown, 
  Layers, Plus, Upload, FileSpreadsheet, Trash2, Edit, X, Link, FileText, RefreshCw, AlertCircle, Database 
} from "lucide-react";

interface BackendViewProps {
  activeUserId: string;
  users: User[];
  importCis: ImportCiRecord[];
  domesticPds: DomesticPdRecord[];
  pids?: PidRecord[];
  accountsSts?: AccountsStRecord[];
  openingStocks?: OpeningStockRecord[];
  onUpdateImportCi: (record: ImportCiRecord) => void;
  onUpdateDomesticPd: (record: DomesticPdRecord) => void;
  onUpdatePid?: (record: PidRecord) => void;
  onAddOpeningStock?: (record: Omit<OpeningStockRecord, "id" | "createdAt">) => Promise<void>;
  onUpdateOpeningStock?: (record: OpeningStockRecord) => Promise<void>;
  onDeleteOpeningStock?: (id: string) => Promise<void>;
  onBulkAddOpeningStock?: (records: Omit<OpeningStockRecord, "id" | "createdAt">[]) => Promise<void>;
}

function formatDateDdMmmYy(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

type BackendSubTab = "pid" | "opening_stock";

interface PIDRecord {
  id: string; // matches document ID (CI/PD/ST/OS)
  date: string; // Tally date / entry date / BE date
  aolBranchName: string;
  aolGodown: string;
  supplierName: string;
  purchaseBeOrNo: string;
  beOrPurchaseDate: string;
  productName: string;
  containerNo: string;
  purchaseQty: number;
  purchaseRate: number;
  type: "Import" | "Domestic" | "Stock Transfer" | "Opening Stock" | "Import-ST" | "Domestic-ST";
  stockTransfer: number;
  salesQty: number;
  purchaseDebitCreditQty: number;
  salesDebitCreditQty: number;
  drumCost: number;
  purchaseRateAfterDruming: number;
  closingStock: number;
  originCode?: string;
  originalRecord: ImportCiRecord | DomesticPdRecord | AccountsStRecord | OpeningStockRecord;
}

// Parse CSV/TSV string into key-value records
function parseCSVOrTSV(text: string): Record<string, string>[] {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const isTab = firstLine.includes("\t");

  const parseLine = (line: string): string[] => {
    if (isTab) {
      return line.split("\t").map((cell) => cell.trim().replace(/^["']|["']$/g, ""));
    }
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ""));
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every((v) => v === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) {
        row[h] = values[idx] || "";
      }
    });
    rows.push(row);
  }

  return rows;
}

// Map parsed raw key-value record to OpeningStockRecord
function mapRawToOpeningStock(raw: Record<string, string>): Omit<OpeningStockRecord, "id" | "createdAt"> {
  const getKey = (possibleNames: string[]): string => {
    const keys = Object.keys(raw);
    for (const name of possibleNames) {
      const found = keys.find(
        (k) =>
          k.trim().toLowerCase() === name.trim().toLowerCase() ||
          k.trim().toLowerCase().includes(name.trim().toLowerCase())
      );
      if (found && raw[found]) return raw[found].trim();
    }
    return "";
  };

  const aolBranchName = getKey(["aol branch name", "aol branch", "branch name", "branch"]);
  const aolGodown = getKey(["aol godown", "godown name", "godown"]);
  const supplierName = getKey(["supplier name", "supplier", "vendor"]);
  const beNoOrPurchaseNo = getKey(["be no / purchase no", "be no", "purchase no", "bill no", "be/purchase no", "invoice no", "be no/purchase no"]);
  const beOrPurchaseDate = getKey(["be/purchase date", "be date", "purchase date", "date", "invoice date"]);
  const productName = getKey(["product name", "product", "item name", "item"]);
  const containerNo = getKey(["container no", "container", "tanker no", "vehicle no", "container/vehicle no"]);
  const openingQtyStr = getKey(["opening qty", "opening quantity", "qty", "quantity", "opening stock", "stock qty"]);
  const purchaseRateStr = getKey(["purchase rate", "rate", "price"]);
  const importOrDomestic = getKey(["import / domestic", "import or domestic", "type", "category", "import/domestic"]) || "Opening Stock";
  const originCode = getKey(["origin code", "origin", "code"]) || "";

  const openingQty = parseFloat(openingQtyStr.replace(/,/g, "")) || 0;
  const purchaseRate = parseFloat(purchaseRateStr.replace(/,/g, "")) || 0;

  return {
    aolBranchName,
    aolGodown,
    supplierName,
    beNoOrPurchaseNo,
    beOrPurchaseDate,
    productName,
    containerNo,
    openingQty,
    purchaseRate,
    importOrDomestic,
    originCode: originCode || beNoOrPurchaseNo || `OS-${Math.floor(1000 + Math.random() * 9000)}`,
  };
}

export default function BackendView({
  activeUserId,
  users,
  importCis = [],
  domesticPds = [],
  pids = [],
  accountsSts = [],
  openingStocks = [],
  onUpdateImportCi,
  onUpdateDomesticPd,
  onUpdatePid,
  onAddOpeningStock,
  onUpdateOpeningStock,
  onDeleteOpeningStock,
  onBulkAddOpeningStock,
}: BackendViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<BackendSubTab>("pid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Import" | "Domestic" | "Stock Transfer" | "Import-ST" | "Domestic-ST" | "Opening Stock">("All");
  const [godownFilter, setGodownFilter] = useState("All");

  // Local state for tracking unsaved edited inputs per row ID in PID table
  const [editedFields, setEditedFields] = useState<Record<string, {
    stockTransfer?: string;
    salesQty?: string;
    purchaseDebitCreditQty?: string;
    salesDebitCreditQty?: string;
    drumCost?: string;
  }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Opening Stock Modals State
  const [isAddEditOsModalOpen, setIsAddEditOsModalOpen] = useState(false);
  const [editingOsRecord, setEditingOsRecord] = useState<OpeningStockRecord | null>(null);
  const [isImportOsModalOpen, setIsImportOsModalOpen] = useState(false);
  const [osSearchQuery, setOsSearchQuery] = useState("");
  const [osTypeFilter, setOsTypeFilter] = useState("All");

  // Form state for Add/Edit Opening Stock
  const [osForm, setOsForm] = useState<Omit<OpeningStockRecord, "id" | "createdAt">>({
    aolBranchName: "",
    aolGodown: "",
    supplierName: "",
    beNoOrPurchaseNo: "",
    beOrPurchaseDate: new Date().toISOString().split("T")[0],
    productName: "",
    containerNo: "",
    openingQty: 0,
    purchaseRate: 0,
    importOrDomestic: "Opening Stock",
    originCode: "",
  });
  const [isSubmittingOs, setIsSubmittingOs] = useState(false);

  // Import Modal State
  const [importMode, setImportMode] = useState<"file" | "url" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [parsedPreviewItems, setParsedPreviewItems] = useState<Omit<OpeningStockRecord, "id" | "createdAt">[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const activeUser = users.find((u) => u.id === activeUserId);
  const isManagerOrAdmin =
    activeUser?.role === Role.Admin ||
    activeUser?.role === Role.SeniorManager ||
    activeUser?.role === Role.Manager;

  // Sub tabs definition
  const subTabs = [
    { id: "pid" as const, label: "PID (Purchase Invoice Details)", icon: Server },
    { id: "opening_stock" as const, label: "Opening Stock", icon: Layers },
  ];

  // Helper to compute and retrieve consolidated values for a PID row
  const getRowValues = (rec: PIDRecord) => {
    const rowEdit = editedFields[rec.id] || {};
    
    const stockTransfer = rowEdit.stockTransfer !== undefined ? Number(rowEdit.stockTransfer) || 0 : rec.stockTransfer;
    const salesQty = rowEdit.salesQty !== undefined ? Number(rowEdit.salesQty) || 0 : rec.salesQty;
    const purchaseDebitCreditQty = rowEdit.purchaseDebitCreditQty !== undefined ? Number(rowEdit.purchaseDebitCreditQty) || 0 : rec.purchaseDebitCreditQty;
    const salesDebitCreditQty = rowEdit.salesDebitCreditQty !== undefined ? Number(rowEdit.salesDebitCreditQty) || 0 : rec.salesDebitCreditQty;
    const drumCost = rowEdit.drumCost !== undefined ? Number(rowEdit.drumCost) || 0 : rec.drumCost;

    const purchaseQty = rec.purchaseQty || 0;
    const purchaseRate = rec.purchaseRate || 0;

    // Real-time calculations
    const closingStock = Number((purchaseQty - (stockTransfer + salesQty + purchaseDebitCreditQty + salesDebitCreditQty)).toFixed(4));

    const purchaseRateAfterDruming = closingStock > 0
      ? Number((purchaseRate + (drumCost / closingStock)).toFixed(4))
      : (purchaseQty > 0 ? Number((purchaseRate + (drumCost / purchaseQty)).toFixed(4)) : Number(purchaseRate.toFixed(4)));

    const isChanged = 
      (rowEdit.stockTransfer !== undefined && Number(rowEdit.stockTransfer) !== rec.stockTransfer) ||
      (rowEdit.salesQty !== undefined && Number(rowEdit.salesQty) !== rec.salesQty) ||
      (rowEdit.purchaseDebitCreditQty !== undefined && Number(rowEdit.purchaseDebitCreditQty) !== rec.purchaseDebitCreditQty) ||
      (rowEdit.salesDebitCreditQty !== undefined && Number(rowEdit.salesDebitCreditQty) !== rec.salesDebitCreditQty) ||
      (rowEdit.drumCost !== undefined && Number(rowEdit.drumCost) !== rec.drumCost);

    return {
      stockTransfer,
      salesQty,
      purchaseDebitCreditQty,
      salesDebitCreditQty,
      drumCost,
      purchaseRateAfterDruming,
      closingStock,
      isChanged,
      rawStockTransfer: rowEdit.stockTransfer !== undefined ? rowEdit.stockTransfer : (rec.stockTransfer ? String(rec.stockTransfer) : ""),
      rawSalesQty: rowEdit.salesQty !== undefined ? rowEdit.salesQty : (rec.salesQty ? String(rec.salesQty) : ""),
      rawPurchaseDebitCreditQty: rowEdit.purchaseDebitCreditQty !== undefined ? rowEdit.purchaseDebitCreditQty : (rec.purchaseDebitCreditQty ? String(rec.purchaseDebitCreditQty) : ""),
      rawSalesDebitCreditQty: rowEdit.salesDebitCreditQty !== undefined ? rowEdit.salesDebitCreditQty : (rec.salesDebitCreditQty ? String(rec.salesDebitCreditQty) : ""),
      rawDrumCost: rowEdit.drumCost !== undefined ? rowEdit.drumCost : (rec.drumCost ? String(rec.drumCost) : ""),
    };
  };

  // Map "CI", "PD", "Accounts ST", "Opening Stock" and "pids" records to unified PIDRecord structure
  const unifiedRecords: PIDRecord[] = useMemo(() => {
    if (pids && pids.length > 0) {
      const mappedPids = pids.map((pid) => {
        // Find corresponding original record from local cache
        const originalRecord = pid.type === "Import"
          ? importCis.find((ci) => ci.id === pid.id)
          : pid.type === "Domestic"
          ? domesticPds.find((pd) => pd.id === pid.id)
          : (pid.type === "Stock Transfer" || pid.type === "Import-ST" || pid.type === "Domestic-ST")
          ? accountsSts.find((st) => st.id === pid.id)
          : openingStocks.find((os) => os.id === pid.id);

        const purchaseQty = pid.purchaseQty || 0;
        const purchaseRate = pid.purchaseRate || 0;
        const drumCost = pid.drumCost || 0;
        const stockTransfer = pid.stockTransfer || 0;
        const salesQty = pid.salesQty || 0;
        const purchaseDebitCreditQty = pid.purchaseDebitCreditQty || 0;
        const salesDebitCreditQty = pid.salesDebitCreditQty || 0;

        const defaultBeOrPurchase = pid.type === "Import"
          ? (originalRecord as ImportCiRecord)?.beNo || pid.purchaseBeOrNo || ""
          : pid.type === "Domestic"
          ? (originalRecord as DomesticPdRecord)?.purchaseBillNo || (originalRecord as DomesticPdRecord)?.originalPurchaseBillNo || pid.purchaseBeOrNo || ""
          : (pid.type === "Stock Transfer" || pid.type === "Import-ST" || pid.type === "Domestic-ST")
          ? (originalRecord as AccountsStRecord)?.stockJvOrNewInvoiceNo || pid.purchaseBeOrNo || ""
          : (originalRecord as OpeningStockRecord)?.beNoOrPurchaseNo || pid.purchaseBeOrNo || "";

        const defaultOriginCode = pid.type === "Import"
          ? pid.id
          : pid.type === "Domestic"
          ? pid.id
          : (pid.type === "Stock Transfer" || pid.type === "Import-ST" || pid.type === "Domestic-ST")
          ? pid.id
          : pid.id;

        // Auto-calculate stockTransfer from matching ST records in accountsSts
        let autoStockTransfer = pid.stockTransfer || 0;
        if (accountsSts && accountsSts.length > 0) {
          const matchingSts = accountsSts.filter((st) => {
            if (st.sourcePidId && st.sourcePidId === pid.id) return true;
            if (st.sourceOriginCode && (st.sourceOriginCode === pid.originCode || st.sourceOriginCode === pid.id || st.sourceOriginCode === defaultOriginCode)) return true;
            if (
              st.sourceBePurchaseBillNo && pid.purchaseBeOrNo &&
              st.sourceBePurchaseBillNo.trim().toLowerCase() === pid.purchaseBeOrNo.trim().toLowerCase() &&
              (st.sourceContainerNo || "").trim().toLowerCase() === (pid.containerNo || "").trim().toLowerCase()
            ) return true;
            return false;
          });
          if (matchingSts.length > 0) {
            autoStockTransfer = matchingSts.reduce((sum, st) => sum + (st.qty || 0), 0);
          }
        }

        const effectiveClosingStock = Number((purchaseQty - (autoStockTransfer + salesQty + purchaseDebitCreditQty + salesDebitCreditQty)).toFixed(4));

        let resolvedType: "Import" | "Domestic" | "Stock Transfer" | "Opening Stock" | "Import-ST" | "Domestic-ST" = pid.type;
        if (pid.type === "Stock Transfer") {
          const stRecord = (originalRecord as AccountsStRecord) || accountsSts.find((s) => s.id === pid.id);
          resolvedType = stRecord?.importOrDomestic === "Import" ? "Import-ST" : "Domestic-ST";
        }

        return {
          id: pid.id,
          date: pid.date || "",
          aolBranchName: pid.aolBranchName || "",
          aolGodown: pid.aolGodown || "",
          supplierName: pid.supplierName || "",
          purchaseBeOrNo: pid.purchaseBeOrNo || defaultBeOrPurchase,
          beOrPurchaseDate: pid.beOrPurchaseDate || "",
          productName: pid.productName || "",
          containerNo: pid.containerNo || "",
          purchaseQty: purchaseQty,
          purchaseRate: purchaseRate,
          type: resolvedType,
          stockTransfer: autoStockTransfer,
          salesQty: salesQty,
          purchaseDebitCreditQty: purchaseDebitCreditQty,
          salesDebitCreditQty: salesDebitCreditQty,
          drumCost: drumCost,
          purchaseRateAfterDruming: effectiveClosingStock > 0 
            ? Number((purchaseRate + (drumCost / effectiveClosingStock)).toFixed(4)) 
            : (purchaseQty > 0 ? Number((purchaseRate + (drumCost / purchaseQty)).toFixed(4)) : purchaseRate),
          closingStock: effectiveClosingStock,
          originCode: pid.originCode || defaultOriginCode,
          originalRecord: originalRecord || ({ id: pid.id } as any),
        };
      });

      const pidMapIds = new Set(pids.map((p) => p.id));
      const missingSts: PIDRecord[] = accountsSts
        .filter((st) => !pidMapIds.has(st.id))
        .map((st) => ({
          id: st.id,
          date: st.entryDate || st.invoiceOrTallyDate || "",
          aolBranchName: st.destAolBranchName || "",
          aolGodown: st.destAolGodown || "",
          supplierName: st.sourceSupplierName || "",
          purchaseBeOrNo: st.stockJvOrNewInvoiceNo || st.sourceBePurchaseBillNo || "",
          beOrPurchaseDate: st.invoiceOrTallyDate || st.entryDate || "",
          productName: st.newProductName || st.sourceProductName || "",
          containerNo: st.sourceContainerNo || "",
          purchaseQty: st.qty || 0,
          purchaseRate: st.rate || 0,
          type: st.importOrDomestic === "Import" ? ("Import-ST" as const) : ("Domestic-ST" as const),
          stockTransfer: 0,
          salesQty: 0,
          purchaseDebitCreditQty: 0,
          salesDebitCreditQty: 0,
          drumCost: 0,
          purchaseRateAfterDruming: st.rate || 0,
          closingStock: st.qty || 0,
          originCode: st.id,
          originalRecord: st as any,
        }));

      const missingOs: PIDRecord[] = openingStocks
        .filter((os) => !pidMapIds.has(os.id))
        .map((os) => ({
          id: os.id,
          date: os.beOrPurchaseDate || "",
          aolBranchName: os.aolBranchName || "",
          aolGodown: os.aolGodown || "",
          supplierName: os.supplierName || "",
          purchaseBeOrNo: os.beNoOrPurchaseNo || "",
          beOrPurchaseDate: os.beOrPurchaseDate || "",
          productName: os.productName || "",
          containerNo: os.containerNo || "",
          purchaseQty: os.openingQty || 0,
          purchaseRate: os.purchaseRate || 0,
          type: "Opening Stock" as const,
          stockTransfer: 0,
          salesQty: 0,
          purchaseDebitCreditQty: 0,
          salesDebitCreditQty: 0,
          drumCost: 0,
          purchaseRateAfterDruming: os.purchaseRate || 0,
          closingStock: os.openingQty || 0,
          originCode: os.originCode || os.id,
          originalRecord: os as any,
        }));

      return [...mappedPids, ...missingSts, ...missingOs].sort((a, b) => {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
    }

    // Fallback: consolidate dynamically on the fly
    const importList: PIDRecord[] = importCis.map((ci) => ({
      id: ci.id,
      date: ci.purchaseTallyDate || "",
      aolBranchName: ci.aolBranchName || "",
      aolGodown: ci.aolGodown || "",
      supplierName: ci.supplierName || "",
      purchaseBeOrNo: ci.beNo || "",
      beOrPurchaseDate: ci.beDate || "",
      productName: ci.productName || "",
      containerNo: ci.containerNo || "",
      purchaseQty: ci.containerWiseQty || 0,
      purchaseRate: ci.purchaseRate || 0,
      type: "Import" as const,
      stockTransfer: 0,
      salesQty: 0,
      purchaseDebitCreditQty: 0,
      salesDebitCreditQty: 0,
      drumCost: 0,
      purchaseRateAfterDruming: ci.purchaseRate || 0,
      closingStock: ci.containerWiseQty || 0,
      originCode: ci.id,
      originalRecord: ci,
    }));

    const domesticList: PIDRecord[] = domesticPds.map((pd) => ({
      id: pd.id,
      date: pd.originalInvoiceDate || "",
      aolBranchName: pd.aolBranchName || "",
      aolGodown: pd.aolGodown || "",
      supplierName: pd.supplierName || "",
      purchaseBeOrNo: pd.purchaseBillNo || pd.originalPurchaseBillNo || "",
      beOrPurchaseDate: pd.originalInvoiceDate || "",
      productName: pd.productName || "",
      containerNo: pd.tankerOrVehicleNo || "",
      purchaseQty: pd.purchaseQty || 0,
      purchaseRate: pd.purchaseRate || 0,
      type: "Domestic" as const,
      stockTransfer: 0,
      salesQty: 0,
      purchaseDebitCreditQty: 0,
      salesDebitCreditQty: 0,
      drumCost: 0,
      purchaseRateAfterDruming: pd.purchaseRate || 0,
      closingStock: pd.purchaseQty || 0,
      originCode: pd.id,
      originalRecord: pd,
    }));

    const stList: PIDRecord[] = accountsSts.map((st) => ({
      id: st.id,
      date: st.entryDate || st.invoiceOrTallyDate || "",
      aolBranchName: st.destAolBranchName || "",
      aolGodown: st.destAolGodown || "",
      supplierName: st.sourceSupplierName || "",
      purchaseBeOrNo: st.stockJvOrNewInvoiceNo || st.sourceBePurchaseBillNo || "",
      beOrPurchaseDate: st.invoiceOrTallyDate || st.entryDate || "",
      productName: st.newProductName || st.sourceProductName || "",
      containerNo: st.sourceContainerNo || "",
      purchaseQty: st.qty || 0,
      purchaseRate: st.rate || 0,
      type: st.importOrDomestic === "Import" ? ("Import-ST" as const) : ("Domestic-ST" as const),
      stockTransfer: 0,
      salesQty: 0,
      purchaseDebitCreditQty: 0,
      salesDebitCreditQty: 0,
      drumCost: 0,
      purchaseRateAfterDruming: st.rate || 0,
      closingStock: st.qty || 0,
      originCode: st.id,
      originalRecord: st as any,
    }));

    const osList: PIDRecord[] = openingStocks.map((os) => ({
      id: os.id,
      date: os.beOrPurchaseDate || "",
      aolBranchName: os.aolBranchName || "",
      aolGodown: os.aolGodown || "",
      supplierName: os.supplierName || "",
      purchaseBeOrNo: os.beNoOrPurchaseNo || "",
      beOrPurchaseDate: os.beOrPurchaseDate || "",
      productName: os.productName || "",
      containerNo: os.containerNo || "",
      purchaseQty: os.openingQty || 0,
      purchaseRate: os.purchaseRate || 0,
      type: "Opening Stock" as const,
      stockTransfer: 0,
      salesQty: 0,
      purchaseDebitCreditQty: 0,
      salesDebitCreditQty: 0,
      drumCost: 0,
      purchaseRateAfterDruming: os.purchaseRate || 0,
      closingStock: os.openingQty || 0,
      originCode: os.originCode || os.id,
      originalRecord: os as any,
    }));

    return [...importList, ...domesticList, ...stList, ...osList].sort((a, b) => {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
  }, [importCis, domesticPds, pids, accountsSts, openingStocks]);

  // Handle saving row changes in PID table
  const handleSaveRow = async (rec: PIDRecord) => {
    const rowValues = getRowValues(rec);
    if (!rowValues.isChanged) return;

    setSavingId(rec.id);
    try {
      const updatedPid: PidRecord = {
        id: rec.id,
        date: rec.date,
        aolBranchName: rec.aolBranchName,
        aolGodown: rec.aolGodown,
        supplierName: rec.supplierName,
        purchaseBeOrNo: rec.purchaseBeOrNo,
        beOrPurchaseDate: rec.beOrPurchaseDate,
        productName: rec.productName,
        containerNo: rec.containerNo,
        purchaseQty: rec.purchaseQty,
        purchaseRate: rec.purchaseRate,
        type: rec.type,
        stockTransfer: rowValues.stockTransfer,
        salesQty: rowValues.salesQty,
        purchaseDebitCreditQty: rowValues.purchaseDebitCreditQty,
        salesDebitCreditQty: rowValues.salesDebitCreditQty,
        drumCost: rowValues.drumCost,
        purchaseRateAfterDruming: rowValues.purchaseRateAfterDruming,
        closingStock: rowValues.closingStock,
        originCode: rec.originCode,
        createdAt: rec.originalRecord?.createdAt || new Date().toISOString(),
      };

      if (onUpdatePid) {
        await onUpdatePid(updatedPid);
      }

      const nextEdits = { ...editedFields };
      delete nextEdits[rec.id];
      setEditedFields(nextEdits);

      setSavedSuccessId(rec.id);
      setTimeout(() => setSavedSuccessId(null), 2000);
    } catch (error) {
      console.error("Error saving row changes", error);
    } finally {
      setSavingId(null);
    }
  };

  // Extract unique Godowns for PID filter
  const uniqueGodowns = useMemo(() => {
    const godowns = new Set<string>();
    unifiedRecords.forEach((r) => {
      if (r.aolGodown) godowns.add(r.aolGodown);
    });
    return Array.from(godowns);
  }, [unifiedRecords]);

  // Filter PID Records
  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((rec) => {
      const matchSearch =
        rec.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.purchaseBeOrNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.containerNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.aolBranchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.aolGodown.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType =
        typeFilter === "All" ||
        (typeFilter === "Stock Transfer" && (rec.type === "Stock Transfer" || rec.type === "Import-ST" || rec.type === "Domestic-ST")) ||
        rec.type === typeFilter;

      const matchGodown = godownFilter === "All" || rec.aolGodown === godownFilter;

      return matchSearch && matchType && matchGodown;
    });
  }, [unifiedRecords, searchQuery, typeFilter, godownFilter]);

  // Opening Stock filtered records
  const filteredOpeningStocks = useMemo(() => {
    return openingStocks.filter((os) => {
      const query = osSearchQuery.toLowerCase();
      const matchSearch =
        os.productName.toLowerCase().includes(query) ||
        os.supplierName.toLowerCase().includes(query) ||
        os.beNoOrPurchaseNo.toLowerCase().includes(query) ||
        os.containerNo.toLowerCase().includes(query) ||
        os.aolBranchName.toLowerCase().includes(query) ||
        os.aolGodown.toLowerCase().includes(query) ||
        os.originCode.toLowerCase().includes(query);

      const matchType = osTypeFilter === "All" || os.importOrDomestic === osTypeFilter;

      return matchSearch && matchType;
    });
  }, [openingStocks, osSearchQuery, osTypeFilter]);

  // Opening Stock Summary stats
  const osStats = useMemo(() => {
    const totalCount = openingStocks.length;
    const totalQty = openingStocks.reduce((sum, item) => sum + (item.openingQty || 0), 0);
    const totalValuation = openingStocks.reduce((sum, item) => sum + ((item.openingQty || 0) * (item.purchaseRate || 0)), 0);
    const godownSet = new Set(openingStocks.map((item) => item.aolGodown).filter(Boolean));
    return {
      totalCount,
      totalQty,
      totalValuation,
      godownCount: godownSet.size,
    };
  }, [openingStocks]);

  // Add / Edit Opening Stock Handlers
  const handleOpenAddOs = () => {
    setEditingOsRecord(null);
    setOsForm({
      aolBranchName: "",
      aolGodown: "",
      supplierName: "",
      beNoOrPurchaseNo: "",
      beOrPurchaseDate: new Date().toISOString().split("T")[0],
      productName: "",
      containerNo: "",
      openingQty: 0,
      purchaseRate: 0,
      importOrDomestic: "Opening Stock",
      originCode: "",
    });
    setIsAddEditOsModalOpen(true);
  };

  const handleOpenEditOs = (os: OpeningStockRecord) => {
    setEditingOsRecord(os);
    setOsForm({
      aolBranchName: os.aolBranchName || "",
      aolGodown: os.aolGodown || "",
      supplierName: os.supplierName || "",
      beNoOrPurchaseNo: os.beNoOrPurchaseNo || "",
      beOrPurchaseDate: os.beOrPurchaseDate || "",
      productName: os.productName || "",
      containerNo: os.containerNo || "",
      openingQty: os.openingQty || 0,
      purchaseRate: os.purchaseRate || 0,
      importOrDomestic: os.importOrDomestic || "Opening Stock",
      originCode: os.originCode || "",
    });
    setIsAddEditOsModalOpen(true);
  };

  const handleSubmitOsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOs(true);
    try {
      if (editingOsRecord && onUpdateOpeningStock) {
        await onUpdateOpeningStock({
          ...editingOsRecord,
          ...osForm,
        });
      } else if (onAddOpeningStock) {
        await onAddOpeningStock(osForm);
      }
      setIsAddEditOsModalOpen(false);
    } catch (err) {
      console.error("Failed to save Opening Stock record:", err);
    } finally {
      setIsSubmittingOs(false);
    }
  };

  const handleDeleteOsItem = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Opening Stock record? It will also be removed from the PID table.")) {
      if (onDeleteOpeningStock) {
        await onDeleteOpeningStock(id);
      }
    }
  };

  // Import CSV / File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const rawRows = parseCSVOrTSV(content);
        if (rawRows.length === 0) {
          setImportError("No valid rows found in the uploaded CSV file. Please check header column names.");
          return;
        }
        const mapped = rawRows.map(mapRawToOpeningStock);
        setParsedPreviewItems(mapped);
      }
    };
    reader.onerror = () => setImportError("Failed to read the uploaded file.");
    reader.readAsText(file);
  };

  // Handle Google Sheet URL Fetch
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;
    setImportError(null);
    setIsLoadingUrl(true);

    try {
      let exportUrl = googleSheetUrl.trim();
      // Auto-convert standard Google Sheets view/edit URL to CSV format URL
      if (exportUrl.includes("docs.google.com/spreadsheets")) {
        if (!exportUrl.includes("/export?format=csv") && !exportUrl.includes("output=csv")) {
          exportUrl = exportUrl.replace(/\/edit.*$/, "/export?format=csv");
          if (!exportUrl.includes("/export?format=csv")) {
            exportUrl += "/export?format=csv";
          }
        }
      }

      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: Failed to download sheet. Make sure the Google Sheet is published to web (File > Share > Publish to Web) or accessible.`);
      }

      const csvText = await response.text();
      const rawRows = parseCSVOrTSV(csvText);
      if (rawRows.length === 0) {
        setImportError("Downloaded content contained no valid data rows. Check header column names or public access settings.");
      } else {
        const mapped = rawRows.map(mapRawToOpeningStock);
        setParsedPreviewItems(mapped);
      }
    } catch (err: any) {
      console.error("Fetch Google Sheet error:", err);
      setImportError(err?.message || "Failed to fetch Google Sheet data. Please ensure the link is published to the web or paste tab-separated data directly below.");
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Handle Pasted Text Parsing
  const handleParsePastedText = () => {
    setImportError(null);
    if (!pastedText.trim()) return;

    const rawRows = parseCSVOrTSV(pastedText);
    if (rawRows.length === 0) {
      setImportError("Could not parse pasted data. Ensure headers and columns are aligned.");
      return;
    }
    const mapped = rawRows.map(mapRawToOpeningStock);
    setParsedPreviewItems(mapped);
  };

  // Confirm and Bulk Save Opening Stock Items
  const handleConfirmBulkImport = async () => {
    if (parsedPreviewItems.length === 0) return;
    setIsBulkImporting(true);
    try {
      if (onBulkAddOpeningStock) {
        await onBulkAddOpeningStock(parsedPreviewItems);
      }
      setImportSuccessMsg(`Successfully imported ${parsedPreviewItems.length} Opening Stock records!`);
      setTimeout(() => {
        setImportSuccessMsg(null);
        setIsImportOsModalOpen(false);
        setParsedPreviewItems([]);
        setPastedText("");
        setGoogleSheetUrl("");
      }, 1500);
    } catch (err) {
      console.error("Bulk import failed:", err);
      setImportError("Failed to save imported records. Please try again.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "AOL BRANCH NAME,AOL Godown,SUPPLIER NAME,BE No / Purchase no,BE/Purchase Date,PRODUCT NAME,Container No,Opening QTY,Purchase Rate,Import / Domestic,Origin Code\n" +
      "MUMBAI,BHIWANDI GODOWN,GLOBAL CHEMICALS LTD,BE-889912,2026-01-15,PHENOL,CONT-10023,18500,125.50,Import,IMP-9001\n" +
      "GUJARAT,KANDLA GODOWN,DESAI PETROCHEM,PD-44102,2026-02-01,ACETONE,TANK-5510,24000,98.00,Domestic,DOM-3004\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Opening_Stock_Sample_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Opening Stock list to CSV
  const handleExportOsCsv = () => {
    if (openingStocks.length === 0) {
      alert("No Opening Stock data to export.");
      return;
    }

    const headers = [
      "AOL BRANCH NAME",
      "AOL Godown",
      "SUPPLIER NAME",
      "BE No / Purchase no",
      "BE/Purchase Date",
      "PRODUCT NAME",
      "Container No",
      "Opening QTY",
      "Purchase Rate",
      "Import / Domestic",
      "Origin Code",
    ];

    const rows = openingStocks.map((os) => [
      `"${(os.aolBranchName || "").replace(/"/g, '""')}"`,
      `"${(os.aolGodown || "").replace(/"/g, '""')}"`,
      `"${(os.supplierName || "").replace(/"/g, '""')}"`,
      `"${(os.beNoOrPurchaseNo || "").replace(/"/g, '""')}"`,
      `"${(os.beOrPurchaseDate || "").replace(/"/g, '""')}"`,
      `"${(os.productName || "").replace(/"/g, '""')}"`,
      `"${(os.containerNo || "").replace(/"/g, '""')}"`,
      os.openingQty || 0,
      os.purchaseRate || 0,
      `"${(os.importOrDomestic || "").replace(/"/g, '""')}"`,
      `"${(os.originCode || "").replace(/"/g, '""')}"`,
    ]);

    const csvText = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Opening_Stock_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="backend-view-root" className="flex flex-col gap-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg shadow-xs">
            <Server size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Backend Control Panel</h2>
            <p className="text-xs text-slate-500">
              Centralized inventory management for Import & Domestic PID, Stock Transfers, and Opening Stock.
            </p>
          </div>
        </div>

        {/* Sub-Tab Selector Buttons */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  active
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
                {tab.label}
                {tab.id === "opening_stock" && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {openingStocks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: PID (Purchase Invoice Details) */}
      {activeSubTab === "pid" && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search PID by product, supplier, BE No, container, branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Type Filter Dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">All Types</option>
                <option value="Import">Import</option>
                <option value="Domestic">Domestic</option>
                <option value="Stock Transfer">Stock Transfer (All)</option>
                <option value="Import-ST">Import-ST</option>
                <option value="Domestic-ST">Domestic-ST</option>
                <option value="Opening Stock">Opening Stock</option>
              </select>

              {/* Godown Filter Dropdown */}
              <select
                value={godownFilter}
                onChange={(e) => setGodownFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">All Godowns ({uniqueGodowns.length})</option>
                {uniqueGodowns.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{filteredRecords.length}</span> PID records shown
            </div>
          </div>

          {/* Horizontal Scrolling PID Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[2400px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3.5 w-28">Date (Tally Date)</th>
                    <th className="px-4 py-3.5 w-[380px] bg-amber-50/80 text-amber-950 border-x border-amber-200">PID Key Combination (BE | Origin | Container | BE Date | Stock)</th>
                    <th className="px-4 py-3.5 w-36">AOL Branch Name</th>
                    <th className="px-4 py-3.5 w-36">AOL Godown</th>
                    <th className="px-4 py-3.5 w-48">Supplier Name</th>
                    <th className="px-4 py-3.5 w-44">Purchase BE No / Purchase no</th>
                    <th className="px-4 py-3.5 w-28">BE/Purchase Date</th>
                    <th className="px-4 py-3.5 w-48">Product Name</th>
                    <th className="px-4 py-3.5 w-32">Container No / Vehicle No</th>
                    <th className="px-4 py-3.5 w-28 text-right">Purchase Qty (Kg)</th>
                    <th className="px-4 py-3.5 w-28 text-right">Purchase Rate</th>
                    <th className="px-4 py-3.5 w-28">Import / Domestic</th>
                    <th className="px-4 py-3.5 w-32">Origin Code (Record ID)</th>
                    <th className="px-4 py-3.5 w-32 text-right">Stock Transfer</th>
                    <th className="px-4 py-3.5 w-32 text-right">Sales Qty</th>
                    <th className="px-4 py-3.5 w-40 text-right">Purchase Dr/Cr Qty</th>
                    <th className="px-4 py-3.5 w-40 text-right">Sales Dr/Cr Qty</th>
                    <th className="px-4 py-3.5 w-32 text-right">Drum Cost</th>
                    <th className="px-4 py-3.5 w-44 text-right">Purchase Rate after Druming</th>
                    <th className="px-4 py-3.5 w-32 text-right">Closing Stock</th>
                    <th className="px-4 py-3.5 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={21} className="px-4 py-16 text-center text-slate-400 font-medium">
                        No purchase invoice details found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => {
                      const vals = getRowValues(rec);
                      const isSaving = savingId === rec.id;
                      const isSaved = savedSuccessId === rec.id;

                      const closingStockClass = vals.closingStock > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : vals.closingStock === 0
                        ? "bg-slate-50 text-slate-500 border-slate-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          {/* 1. Date */}
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                            {rec.date || "—"}
                          </td>

                          {/* PID Key Combination */}
                          <td className="px-4 py-3 whitespace-nowrap bg-amber-50/30 border-x border-amber-100/80">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold bg-white text-slate-800 border border-amber-200 shadow-2xs">
                              <span className="text-indigo-700">{rec.purchaseBeOrNo || "No-BE"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-600">{rec.originCode || rec.id}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-600">{rec.containerNo || "No-Cont"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-600">{formatDateDdMmmYy(rec.beOrPurchaseDate || rec.date)}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-bold text-emerald-700">{vals.closingStock.toLocaleString()} Kg</span>
                            </div>
                          </td>

                          {/* 2. AOL Branch Name */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {rec.aolBranchName || "—"}
                          </td>

                          {/* 3. AOL Godown */}
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {rec.aolGodown || "—"}
                          </td>

                          {/* 4. Supplier Name */}
                          <td className="px-4 py-3 max-w-[180px] truncate" title={rec.supplierName}>
                            {rec.supplierName || "—"}
                          </td>

                          {/* 5. Purchase BE No / Purchase no */}
                          <td className="px-4 py-3 font-semibold text-slate-950 whitespace-nowrap">
                            {rec.purchaseBeOrNo || "—"}
                          </td>

                          {/* 6. BE/Purchase Date */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {rec.beOrPurchaseDate || "—"}
                          </td>

                          {/* 7. Product Name */}
                          <td className="px-4 py-3 font-semibold text-indigo-900 whitespace-nowrap">
                            {rec.productName || "—"}
                          </td>

                          {/* 8. Container No */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              {rec.containerNo || "—"}
                            </span>
                          </td>

                          {/* 9. Purchase Qty */}
                          <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                            {rec.purchaseQty ? rec.purchaseQty.toLocaleString() : "0"}
                          </td>

                          {/* 10. Purchase Rate */}
                          <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            ₹{rec.purchaseRate ? rec.purchaseRate.toFixed(4) : "0.0000"}
                          </td>

                          {/* 11. Import / Domestic / ST / OS Type Badge */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                                rec.type === "Import"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : rec.type === "Import-ST"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : rec.type === "Domestic-ST" || rec.type === "Stock Transfer"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : rec.type === "Opening Stock"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {rec.type}
                            </span>
                          </td>

                          {/* 12. Origin Code */}
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap" title={rec.originCode || rec.id}>
                            {rec.originCode || rec.id}
                          </td>

                          {/* 14. Stock Transfer (Editable Input) */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input
                              type="text"
                              placeholder="0"
                              value={vals.rawStockTransfer}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || !isNaN(Number(val))) {
                                  setEditedFields({
                                    ...editedFields,
                                    [rec.id]: {
                                      ...(editedFields[rec.id] || {}),
                                      stockTransfer: val,
                                    }
                                  });
                                }
                              }}
                              disabled={isSaving || !isManagerOrAdmin}
                              className={`px-2 py-1 text-xs rounded border w-24 text-right focus:outline-none transition ${
                                !isManagerOrAdmin
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : vals.rawStockTransfer !== (rec.stockTransfer ? String(rec.stockTransfer) : "")
                                  ? "border-amber-400 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                                  : "border-slate-200 focus:ring-1 focus:ring-slate-900"
                              }`}
                            />
                          </td>

                          {/* 15. Sales Qty (Editable Input) */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input
                              type="text"
                              placeholder="0"
                              value={vals.rawSalesQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || !isNaN(Number(val))) {
                                  setEditedFields({
                                    ...editedFields,
                                    [rec.id]: {
                                      ...(editedFields[rec.id] || {}),
                                      salesQty: val,
                                    }
                                  });
                                }
                              }}
                              disabled={isSaving || !isManagerOrAdmin}
                              className={`px-2 py-1 text-xs rounded border w-24 text-right focus:outline-none transition ${
                                !isManagerOrAdmin
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : vals.rawSalesQty !== (rec.salesQty ? String(rec.salesQty) : "")
                                  ? "border-amber-400 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                                  : "border-slate-200 focus:ring-1 focus:ring-slate-900"
                              }`}
                            />
                          </td>

                          {/* 16. Purchase Debit/Credit Qty (Editable Input) */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input
                              type="text"
                              placeholder="0"
                              value={vals.rawPurchaseDebitCreditQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || !isNaN(Number(val))) {
                                  setEditedFields({
                                    ...editedFields,
                                    [rec.id]: {
                                      ...(editedFields[rec.id] || {}),
                                      purchaseDebitCreditQty: val,
                                    }
                                  });
                                }
                              }}
                              disabled={isSaving || !isManagerOrAdmin}
                              className={`px-2 py-1 text-xs rounded border w-28 text-right focus:outline-none transition ${
                                !isManagerOrAdmin
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : vals.rawPurchaseDebitCreditQty !== (rec.purchaseDebitCreditQty ? String(rec.purchaseDebitCreditQty) : "")
                                  ? "border-amber-400 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                                  : "border-slate-200 focus:ring-1 focus:ring-slate-900"
                              }`}
                            />
                          </td>

                          {/* 17. Sales Debit/Credit Qty (Editable Input) */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input
                              type="text"
                              placeholder="0"
                              value={vals.rawSalesDebitCreditQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || !isNaN(Number(val))) {
                                  setEditedFields({
                                    ...editedFields,
                                    [rec.id]: {
                                      ...(editedFields[rec.id] || {}),
                                      salesDebitCreditQty: val,
                                    }
                                  });
                                }
                              }}
                              disabled={isSaving || !isManagerOrAdmin}
                              className={`px-2 py-1 text-xs rounded border w-28 text-right focus:outline-none transition ${
                                !isManagerOrAdmin
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : vals.rawSalesDebitCreditQty !== (rec.salesDebitCreditQty ? String(rec.salesDebitCreditQty) : "")
                                  ? "border-amber-400 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                                  : "border-slate-200 focus:ring-1 focus:ring-slate-900"
                              }`}
                            />
                          </td>

                          {/* 18. Drum Cost (Editable Input) */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input
                              type="text"
                              placeholder="0"
                              value={vals.rawDrumCost}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || !isNaN(Number(val))) {
                                  setEditedFields({
                                    ...editedFields,
                                    [rec.id]: {
                                      ...(editedFields[rec.id] || {}),
                                      drumCost: val,
                                    }
                                  });
                                }
                              }}
                              disabled={isSaving || !isManagerOrAdmin}
                              className={`px-2 py-1 text-xs rounded border w-24 text-right focus:outline-none transition ${
                                !isManagerOrAdmin
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : vals.rawDrumCost !== (rec.drumCost ? String(rec.drumCost) : "")
                                  ? "border-amber-400 bg-amber-50/20 focus:ring-1 focus:ring-amber-500"
                                  : "border-slate-200 focus:ring-1 focus:ring-slate-900"
                              }`}
                            />
                          </td>

                          {/* 19. Purchase Rate after Druming */}
                          <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                            ₹{vals.purchaseRateAfterDruming.toFixed(4)}
                          </td>

                          {/* 20. Closing Stock */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-bold ${closingStockClass}`}>
                              {vals.closingStock.toLocaleString()}
                            </span>
                          </td>

                          {/* 21. Action */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isManagerOrAdmin && vals.isChanged && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveRow(rec)}
                                  disabled={isSaving}
                                  className="flex items-center justify-center p-1.5 text-white bg-slate-900 hover:bg-slate-800 rounded-md transition cursor-pointer shadow-xs shrink-0"
                                  title="Save row changes"
                                >
                                  {isSaving ? (
                                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Save size={12} />
                                  )}
                                </button>
                              )}

                              {isSaved && (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 shrink-0 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded animate-fade-in">
                                  <Check size={10} /> Saved
                                </span>
                              )}

                              {!vals.isChanged && !isSaved && (
                                <span className="text-slate-350 italic">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Opening Stock Table & Import Tool */}
      {activeSubTab === "opening_stock" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Opening Stock Entries</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{osStats.totalCount}</p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1">Appended to PID table</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                <Database size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Opening Quantity</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {osStats.totalQty.toLocaleString()} <span className="text-xs font-medium text-slate-500">Kg</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Initial stock inventory</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <Layers size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Opening Valuation</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  ₹{osStats.totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Based on purchase rate</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                <FileSpreadsheet size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active Godowns</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{osStats.godownCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Unique storage locations</p>
              </div>
              <div className="p-3 bg-sky-50 text-sky-700 rounded-xl border border-sky-100">
                <Server size={22} />
              </div>
            </div>
          </div>

          {/* Controls & Import Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex flex-1 items-center gap-2.5">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Opening Stock by product, supplier, BE, godown, origin..."
                  value={osSearchQuery}
                  onChange={(e) => setOsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <select
                value={osTypeFilter}
                onChange={(e) => setOsTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="All">All Types</option>
                <option value="Import">Import</option>
                <option value="Domestic">Domestic</option>
                <option value="Opening Stock">Opening Stock</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Import CSV / Google Sheet Button */}
              <button
                onClick={() => {
                  setImportError(null);
                  setParsedPreviewItems([]);
                  setIsImportOsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                Import Google Sheet / CSV
              </button>

              {/* Add Single Opening Stock Record */}
              <button
                onClick={handleOpenAddOs}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <Plus size={15} />
                Add Opening Stock
              </button>

              {/* Export CSV Button */}
              <button
                onClick={handleExportOsCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                title="Export Opening Stock to CSV"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          {/* Opening Stock Main Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[1500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3.5 w-36">AOL Branch Name</th>
                    <th className="px-4 py-3.5 w-36">AOL Godown</th>
                    <th className="px-4 py-3.5 w-48">Supplier Name</th>
                    <th className="px-4 py-3.5 w-44">BE No / Purchase no</th>
                    <th className="px-4 py-3.5 w-32">BE/Purchase Date</th>
                    <th className="px-4 py-3.5 w-48">Product Name</th>
                    <th className="px-4 py-3.5 w-32">Container No</th>
                    <th className="px-4 py-3.5 w-32 text-right">Opening QTY</th>
                    <th className="px-4 py-3.5 w-32 text-right">Purchase Rate</th>
                    <th className="px-4 py-3.5 w-32">Import / Domestic</th>
                    <th className="px-4 py-3.5 w-36">Origin Code</th>
                    <th className="px-4 py-3.5 w-24 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                  {filteredOpeningStocks.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-16 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers size={32} className="text-slate-300" />
                          <p className="text-slate-600 font-semibold">No Opening Stock records found</p>
                          <p className="text-xs text-slate-400">
                            Click "Add Opening Stock" or "Import Google Sheet / CSV" to populate your initial inventory.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOpeningStocks.map((os) => (
                      <tr key={os.id} className="hover:bg-slate-50 transition-colors">
                        {/* 1. AOL Branch Name */}
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {os.aolBranchName || "—"}
                        </td>

                        {/* 2. AOL Godown */}
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {os.aolGodown || "—"}
                        </td>

                        {/* 3. Supplier Name */}
                        <td className="px-4 py-3 max-w-[200px] truncate" title={os.supplierName}>
                          {os.supplierName || "—"}
                        </td>

                        {/* 4. BE No / Purchase no */}
                        <td className="px-4 py-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                          {os.beNoOrPurchaseNo || "—"}
                        </td>

                        {/* 5. BE/Purchase Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {os.beOrPurchaseDate || "—"}
                        </td>

                        {/* 6. Product Name */}
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                          {os.productName || "—"}
                        </td>

                        {/* 7. Container No */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {os.containerNo || "—"}
                          </span>
                        </td>

                        {/* 8. Opening QTY */}
                        <td className="px-4 py-3 text-right font-extrabold text-amber-700 whitespace-nowrap">
                          {os.openingQty ? os.openingQty.toLocaleString() : "0"} Kg
                        </td>

                        {/* 9. Purchase Rate */}
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          ₹{os.purchaseRate ? os.purchaseRate.toFixed(4) : "0.0000"}
                        </td>

                        {/* 10. Import / Domestic */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border bg-amber-50 text-amber-800 border-amber-200">
                            {os.importOrDomestic || "Opening Stock"}
                          </span>
                        </td>

                        {/* 11. Origin Code */}
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {os.originCode || os.id}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditOs(os)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Edit Opening Stock record"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteOsItem(os.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Delete Opening Stock record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add / Edit Single Opening Stock Record */}
      {isAddEditOsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingOsRecord ? "Edit Opening Stock Record" : "Add Opening Stock Record"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter details to add/update stock. Automatically appends to PID table.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditOsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOsForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. AOL Branch Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    AOL BRANCH NAME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MUMBAI, GUJARAT"
                    value={osForm.aolBranchName}
                    onChange={(e) => setOsForm({ ...osForm, aolBranchName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 2. AOL Godown */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    AOL Godown <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BHIWANDI GODOWN"
                    value={osForm.aolGodown}
                    onChange={(e) => setOsForm({ ...osForm, aolGodown: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 3. SUPPLIER NAME */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SUPPLIER NAME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Supplier / Manufacturer"
                    value={osForm.supplierName}
                    onChange={(e) => setOsForm({ ...osForm, supplierName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 4. BE No / Purchase no */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    BE No / Purchase no <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BE-10023 or OS-2026-01"
                    value={osForm.beNoOrPurchaseNo}
                    onChange={(e) => setOsForm({ ...osForm, beNoOrPurchaseNo: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 5. BE/Purchase Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    BE/Purchase Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={osForm.beOrPurchaseDate}
                    onChange={(e) => setOsForm({ ...osForm, beOrPurchaseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 6. PRODUCT NAME */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    PRODUCT NAME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PHENOL, ACETONE"
                    value={osForm.productName}
                    onChange={(e) => setOsForm({ ...osForm, productName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 7. Container No */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Container No</label>
                  <input
                    type="text"
                    placeholder="e.g. CONT-8812 / Tanker No"
                    value={osForm.containerNo}
                    onChange={(e) => setOsForm({ ...osForm, containerNo: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* 8. Opening QTY */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opening QTY (Kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={osForm.openingQty || ""}
                    onChange={(e) => setOsForm({ ...osForm, openingQty: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-amber-900"
                  />
                </div>

                {/* 9. Purchase Rate */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Purchase Rate (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={osForm.purchaseRate || ""}
                    onChange={(e) => setOsForm({ ...osForm, purchaseRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-emerald-800"
                  />
                </div>

                {/* 10. Import / Domestic */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Import / Domestic</label>
                  <select
                    value={osForm.importOrDomestic}
                    onChange={(e) => setOsForm({ ...osForm, importOrDomestic: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    <option value="Opening Stock">Opening Stock</option>
                    <option value="Import">Import</option>
                    <option value="Domestic">Domestic</option>
                  </select>
                </div>

                {/* 11. Origin Code */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Origin Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ORIGIN-001 (Optional - auto generates if blank)"
                    value={osForm.originCode}
                    onChange={(e) => setOsForm({ ...osForm, originCode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditOsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOs}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs"
                >
                  {isSubmittingOs && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editingOsRecord ? "Update Opening Stock" : "Save Opening Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Import via Google Sheet & CSV Modal */}
      {isImportOsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Import Opening Stock Data</h3>
                  <p className="text-xs text-slate-500">
                    Import directly from Google Sheets link, uploaded CSV file, or copy-pasted data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportOsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Import Source Selector Tabs */}
              <div className="flex border-b border-slate-200 gap-6">
                <button
                  onClick={() => setImportMode("file")}
                  className={`pb-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    importMode === "file"
                      ? "text-emerald-700 border-b-2 border-emerald-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Upload size={14} /> Upload CSV File
                </button>
                <button
                  onClick={() => setImportMode("url")}
                  className={`pb-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    importMode === "url"
                      ? "text-emerald-700 border-b-2 border-emerald-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Link size={14} /> Google Sheet URL
                </button>
                <button
                  onClick={() => setImportMode("paste")}
                  className={`pb-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    importMode === "paste"
                      ? "text-emerald-700 border-b-2 border-emerald-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText size={14} /> Copy & Paste Data
                </button>
              </div>

              {/* Sample Template Download Bar */}
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-900 font-medium">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>
                    Columns expected: <strong className="font-mono text-[11px]">AOL BRANCH NAME, AOL Godown, SUPPLIER NAME, BE No / Purchase no, BE/Purchase Date, PRODUCT NAME, Container No, Opening QTY, Purchase Rate, Import / Domestic, Origin Code</strong>
                  </span>
                </div>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-md font-semibold transition shrink-0 cursor-pointer"
                >
                  <Download size={13} /> Sample CSV Template
                </button>
              </div>

              {/* Option 1: File Upload */}
              {importMode === "file" && (
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-8 text-center transition bg-slate-50/50">
                  <Upload size={32} className="mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold text-slate-800 text-sm">Upload your CSV or TSV File</p>
                  <p className="text-slate-500 text-xs mt-1 mb-4">Drag and drop or click below to select file</p>
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    onChange={handleFileUpload}
                    className="block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>
              )}

              {/* Option 2: Google Sheet URL */}
              {importMode === "url" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-800">
                    Google Sheets Published URL or Public Link
                  </label>
                  <p className="text-slate-500 text-[11px]">
                    Tip: Ensure your Google Sheet is shared as "Anyone with the link can view" or published via <strong>File &gt; Share &gt; Publish to web</strong> as CSV.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                    <button
                      onClick={handleFetchGoogleSheet}
                      disabled={isLoadingUrl || !googleSheetUrl.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {isLoadingUrl ? <RefreshCw size={14} className="animate-spin" /> : <Link size={14} />}
                      Fetch Data
                    </button>
                  </div>
                </div>
              )}

              {/* Option 3: Copy Paste Text */}
              {importMode === "paste" && (
                <div className="space-y-3">
                  <label className="block font-bold text-slate-800">
                    Paste Spreadsheet Cells directly (Tab/Comma separated)
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`AOL BRANCH NAME\tAOL Godown\tSUPPLIER NAME\tBE No / Purchase no\tBE/Purchase Date\tPRODUCT NAME\tContainer No\tOpening QTY\tPurchase Rate\tImport / Domestic\tOrigin Code\nMUMBAI\tBHIWANDI\tGLOBAL LTD\tBE-10023\t2026-01-15\tPHENOL\tCONT-12\t18500\t125.50\tImport\tIMP-901`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleParsePastedText}
                      disabled={!pastedText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Check size={14} /> Parse Copied Data
                    </button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Alert */}
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreviewItems.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs">
                      Parsed Preview ({parsedPreviewItems.length} records ready to import)
                    </h4>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      Columns mapped successfully
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-100 sticky top-0 font-bold uppercase text-slate-600">
                        <tr>
                          <th className="p-2">Branch</th>
                          <th className="p-2">Godown</th>
                          <th className="p-2">Supplier</th>
                          <th className="p-2">BE / Purchase No</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Product</th>
                          <th className="p-2 text-right">Opening Qty</th>
                          <th className="p-2 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {parsedPreviewItems.slice(0, 50).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2">{item.aolBranchName || "—"}</td>
                            <td className="p-2">{item.aolGodown || "—"}</td>
                            <td className="p-2">{item.supplierName || "—"}</td>
                            <td className="p-2 font-bold text-indigo-900">{item.beNoOrPurchaseNo || "—"}</td>
                            <td className="p-2">{item.beOrPurchaseDate || "—"}</td>
                            <td className="p-2 font-bold text-slate-800">{item.productName || "—"}</td>
                            <td className="p-2 text-right font-bold text-amber-700">{item.openingQty.toLocaleString()}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">₹{item.purchaseRate.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedPreviewItems.length > 50 && (
                    <p className="text-[10px] text-slate-500 italic text-right">
                      Showing first 50 rows of {parsedPreviewItems.length} records.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsImportOsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmBulkImport}
                disabled={parsedPreviewItems.length === 0 || isBulkImporting}
                className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isBulkImporting && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm & Import {parsedPreviewItems.length > 0 ? `${parsedPreviewItems.length} Records` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
