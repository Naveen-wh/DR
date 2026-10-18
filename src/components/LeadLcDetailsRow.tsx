import React, { useState, useEffect } from "react";
import { SalesLead, User, ContainerDetail, IgmDetail, LcDetail, EtaDetail, BeDetail, DeferredDutyDetail } from "../types";
import { Calendar, HelpCircle, Save, Landmark, Layers, Percent, Clock, Ship, FileText, CheckCircle, Edit2, X, Plus, Trash2, History } from "lucide-react";

interface LeadLcDetailsRowProps {
  lead: SalesLead;
  users: User[];
  onEditLead: (lead: SalesLead) => void;
  onClose: () => void;
  leads?: SalesLead[];
}

export default function LeadLcDetailsRow({ lead, users, onEditLead, onClose, leads = [] }: LeadLcDetailsRowProps) {
  // Local state for LC Details form to support inline editing mapped to the key (PI No + Product Name)
  const [lcType, setLcType] = useState<"LC" | "NON LC">("LC");
  const [lcAppSentToBank, setLcAppSentToBank] = useState("");
  const [lcBankName, setLcBankName] = useState("");
  const [lcNoRefNo, setLcNoRefNo] = useState("");
  const [lcDate, setLcDate] = useState("");
  const [lcUsanceAtSight, setLcUsanceAtSight] = useState<"Usance" | "At Sight">("Usance");
  const [lcUsanceDays, setLcUsanceDays] = useState(0);
  const [lcLatestShipmentDate, setLcLatestShipmentDate] = useState("");
  const [lcExpiryDate, setLcExpiryDate] = useState("");
  const [lcOpenExRate, setLcOpenExRate] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Single LC Detail state
  const [lcDetail, setLcDetail] = useState<LcDetail | null>(null);
  const [lcProductName, setLcProductName] = useState("");

  // Local state for ETA (Estimated Time of Arrival) Details form
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");
  const [etaRemark, setEtaRemark] = useState("");
  const [etaHistory, setEtaHistory] = useState<Array<{ id: string; etd: string; eta: string; remark: string; updatedAt: string }>>([]);
  const [isEtaEditing, setIsEtaEditing] = useState(false);
  const [isEtaSaved, setIsEtaSaved] = useState(false);

  // Single ETA Detail state
  const [etaDetail, setEtaDetail] = useState<EtaDetail | null>(null);
  const [etaProductName, setEtaProductName] = useState("");

  // Local state for BE Details form
  const [beFobCif, setBeFobCif] = useState<"FOB" | "CIF">("FOB");
  const [beFreightUsd, setBeFreightUsd] = useState<number | "">("");
  const [beInsuranceUsd, setBeInsuranceUsd] = useState<number | "">("");
  const [beNo, setBeNo] = useState("");
  const [beDate, setBeDate] = useState("");
  const [beBoeExRate, setBeBoeExRate] = useState<number | "">("");
  const [beQuery, setBeQuery] = useState("");
  const [beInvoiceNumber, setBeInvoiceNumber] = useState("");
  const [beInvoiceDate, setBeInvoiceDate] = useState("");
  const [beLotBatchNumber, setBeLotBatchNumber] = useState("");
  const [beBillOfLadingNo, setBeBillOfLadingNo] = useState("");
  const [beBillOfLadingDate, setBeBillOfLadingDate] = useState("");
  const [isBeEditing, setIsBeEditing] = useState(false);
  const [isBeSaved, setIsBeSaved] = useState(false);

  // Single BE Detail state
  const [beDetail, setBeDetail] = useState<BeDetail | null>(null);
  const [beProductName, setBeProductName] = useState("");

  // Section 1: Container Details state
  const [containers, setContainers] = useState<ContainerDetail[]>([]);
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);

  // Form input states
  const [containerProductName, setContainerProductName] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [containerSize, setContainerSize] = useState("20ft");
  const [containerQty, setContainerQty] = useState<number | "">("");
  const [containerRemark, setContainerRemark] = useState("");
  const [isContainerEditing, setIsContainerEditing] = useState(false);
  const [isContainerSaved, setIsContainerSaved] = useState(false);

  // Section 2: IGM & Item state
  const [igmDetails, setIgmDetails] = useState<IgmDetail[]>([]);
  const [editingIgmId, setEditingIgmId] = useState<string | null>(null);

  const [igmContainerNo, setIgmContainerNo] = useState("");
  const [igmNoDt, setIgmNoDt] = useState("");
  const [igmItemNo, setIgmItemNo] = useState("");
  const [igmChaSelfJobNo, setIgmChaSelfJobNo] = useState("");
  const [igmFinalInwardDate, setIgmFinalInwardDate] = useState("");
  const [igmContainerGatedIn, setIgmContainerGatedIn] = useState("");
  const [igmCfsLastDate, setIgmCfsLastDate] = useState("");
  const [igmMaterialMovedOutOfCfs, setIgmMaterialMovedOutOfCfs] = useState("");
  const [igmFreeEmptyCtnrDetentionLastDt, setIgmFreeEmptyCtnrDetentionLastDt] = useState("");
  const [igmStatusRemark, setIgmStatusRemark] = useState("");
  const [igmDuty, setIgmDuty] = useState("");
  const [igmShpLine, setIgmShpLine] = useState("");
  const [igmStampDuty, setIgmStampDuty] = useState("");
  const [igmDo, setIgmDo] = useState("");
  const [igmCfs, setIgmCfs] = useState("");
  const [igmOocStatus, setIgmOocStatus] = useState("");
  const [isIgmEditing, setIsIgmEditing] = useState(false);
  const [isIgmSaved, setIsIgmSaved] = useState(false);

  // Section 3: DEFERRED DUTY state
  const [deferredDutyDetails, setDeferredDutyDetails] = useState<DeferredDutyDetail[]>([]);
  const [editingDeferredId, setEditingDeferredId] = useState<string | null>(null);

  const [deferredBeNo, setDeferredBeNo] = useState("");
  const [deferredBeStatus, setDeferredBeStatus] = useState("");
  const [deferredDuty, setDeferredDuty] = useState("");
  const [deferredDutyAmt, setDeferredDutyAmt] = useState<number | "">("");
  const [deferredPaymentDueDate, setDeferredPaymentDueDate] = useState("");
  const [deferredStampDutyAmount, setDeferredStampDutyAmount] = useState<number | "">("");
  const [deferredStampDutyDate, setDeferredStampDutyDate] = useState("");
  const [deferredStatusRemark, setDeferredStatusRemark] = useState("");
  const [isDeferredEditing, setIsDeferredEditing] = useState(false);
  const [isDeferredSaved, setIsDeferredSaved] = useState(false);

  // Sync state when lead changes
  useEffect(() => {
    // LC Detail sync
    const currentLc = lead.lcDetail || (lead.lcDetails && lead.lcDetails[0]) || (lead.lcBankName || lead.lcNoRefNo ? {
      id: "initial-lc",
      productName: lead.productNameCustom || "",
      lcType: lead.lcType || "LC",
      lcAppSentToBank: lead.lcAppSentToBank || "",
      lcBankName: lead.lcBankName || "",
      lcNoRefNo: lead.lcNoRefNo || "",
      lcDate: lead.lcDate || "",
      lcUsanceAtSight: lead.lcUsanceAtSight || "Usance",
      lcUsanceDays: lead.lcUsanceDays || 0,
      lcLatestShipmentDate: lead.lcLatestShipmentDate || "",
      lcExpiryDate: lead.lcExpiryDate || "",
      lcOpenExRate: lead.lcOpenExRate || 1,
    } : null);
    setLcDetail(currentLc);
    setLcProductName(currentLc?.productName || lead.productNameCustom || "");
    setLcType(currentLc?.lcType || lead.lcType || "LC");
    setLcAppSentToBank(currentLc?.lcAppSentToBank || lead.lcAppSentToBank || "");
    setLcBankName(currentLc?.lcBankName || lead.lcBankName || "");
    setLcNoRefNo(currentLc?.lcNoRefNo || lead.lcNoRefNo || "");
    setLcDate(currentLc?.lcDate || lead.lcDate || "");
    setLcUsanceAtSight(currentLc?.lcUsanceAtSight || lead.lcUsanceAtSight || "Usance");
    setLcUsanceDays(currentLc?.lcUsanceDays !== undefined ? currentLc.lcUsanceDays : (lead.lcUsanceDays || 0));
    setLcLatestShipmentDate(currentLc?.lcLatestShipmentDate || lead.lcLatestShipmentDate || "");
    setLcExpiryDate(currentLc?.lcExpiryDate || lead.lcExpiryDate || "");
    setLcOpenExRate(currentLc?.lcOpenExRate !== undefined ? currentLc.lcOpenExRate : (lead.lcOpenExRate || 1));
    setIsSaved(false);
    setIsEditing(false);

    // ETA Detail sync
    const currentEta = lead.etaDetail || (lead.etaDetails && lead.etaDetails[0]) || (lead.etd || lead.eta || lead.etaRemark ? {
      id: "initial-eta",
      productName: lead.productNameCustom || "",
      etd: lead.etd || "",
      eta: lead.eta || "",
      etaRemark: lead.etaRemark || "",
      etaHistory: lead.etaHistory || [],
    } : null);
    setEtaDetail(currentEta);
    setEtaProductName(currentEta?.productName || lead.productNameCustom || "");
    setEtd(currentEta?.etd || lead.etd || "");
    setEta(currentEta?.eta || lead.eta || "");
    setEtaRemark(currentEta?.etaRemark || lead.etaRemark || "");
    setEtaHistory(currentEta?.etaHistory || lead.etaHistory || []);
    setIsEtaSaved(false);
    setIsEtaEditing(false);

    // BE Detail sync
    const currentBe = lead.beDetail || (lead.beDetails && lead.beDetails[0]) || (lead.beNo || lead.beInvoiceNumber || lead.beBillOfLadingNo ? {
      id: "initial-be",
      productName: lead.productNameCustom || "",
      beFobCif: lead.beFobCif || "FOB",
      beFreightUsd: lead.beFreightUsd,
      beInsuranceUsd: lead.beInsuranceUsd,
      beNo: lead.beNo || "",
      beDate: lead.beDate || "",
      beBoeExRate: lead.beBoeExRate,
      beQuery: lead.beQuery || "",
      beInvoiceNumber: lead.beInvoiceNumber || "",
      beInvoiceDate: lead.beInvoiceDate || "",
      beLotBatchNumber: lead.beLotBatchNumber || "",
      beBillOfLadingNo: lead.beBillOfLadingNo || "",
      beBillOfLadingDate: lead.beBillOfLadingDate || "",
    } : null);
    setBeDetail(currentBe);
    setBeProductName(currentBe?.productName || lead.productNameCustom || "");
    setBeFobCif(currentBe?.beFobCif || lead.beFobCif || "FOB");
    setBeFreightUsd(currentBe?.beFreightUsd !== undefined ? currentBe.beFreightUsd : (lead.beFreightUsd !== undefined ? lead.beFreightUsd : ""));
    setBeInsuranceUsd(currentBe?.beInsuranceUsd !== undefined ? currentBe.beInsuranceUsd : (lead.beInsuranceUsd !== undefined ? lead.beInsuranceUsd : ""));
    setBeNo(currentBe?.beNo || lead.beNo || "");
    setBeDate(currentBe?.beDate || lead.beDate || "");
    setBeBoeExRate(currentBe?.beBoeExRate !== undefined ? currentBe.beBoeExRate : (lead.beBoeExRate !== undefined ? lead.beBoeExRate : ""));
    setBeQuery(currentBe?.beQuery || lead.beQuery || "");
    setBeInvoiceNumber(currentBe?.beInvoiceNumber || lead.beInvoiceNumber || "");
    setBeInvoiceDate(currentBe?.beInvoiceDate || lead.beInvoiceDate || "");
    setBeLotBatchNumber(currentBe?.beLotBatchNumber || lead.beLotBatchNumber || "");
    setBeBillOfLadingNo(currentBe?.beBillOfLadingNo || lead.beBillOfLadingNo || "");
    setBeBillOfLadingDate(currentBe?.beBillOfLadingDate || lead.beBillOfLadingDate || "");
    setIsBeSaved(false);
    setIsBeEditing(false);

    // Container Details sync
    const migratedContainers = lead.containers || (lead.containerNo || lead.containerProductName ? [{
      id: "initial-container",
      productName: lead.containerProductName || lead.productNameCustom || "",
      containerNo: lead.containerNo || "",
      containerSize: lead.containerSize || "20ft",
      containerQty: typeof lead.containerQty === 'number' ? lead.containerQty : 0,
      containerRemark: lead.containerRemark || ""
    }] : []);
    setContainers(migratedContainers);
    setEditingContainerId(null);
    setContainerProductName("");
    setContainerNo("");
    setContainerSize("20ft");
    setContainerQty("");
    setContainerRemark("");
    setIsContainerSaved(false);
    setIsContainerEditing(false);

    // IGM & Item sync
    const migratedIgmDetails = lead.igmDetails || (lead.igmContainerNo || lead.igmNoDt || lead.igmItemNo ? [{
      id: "initial-igm",
      containerNo: lead.igmContainerNo || lead.containerNo || "",
      igmNoDt: lead.igmNoDt || "",
      igmItemNo: lead.igmItemNo || "",
      igmChaSelfJobNo: lead.igmChaSelfJobNo || "",
      igmFinalInwardDate: lead.igmFinalInwardDate || "",
      igmContainerGatedIn: lead.igmContainerGatedIn || "",
      igmCfsLastDate: lead.igmCfsLastDate || "",
      igmMaterialMovedOutOfCfs: lead.igmMaterialMovedOutOfCfs || "",
      igmFreeEmptyCtnrDetentionLastDt: lead.igmFreeEmptyCtnrDetentionLastDt || "",
      igmDuty: lead.igmDuty || "",
      igmShpLine: lead.igmShpLine || "",
      igmStampDuty: lead.igmStampDuty || "",
      igmDo: lead.igmDo || "",
      igmCfs: lead.igmCfs || "",
      igmOocStatus: lead.igmOocStatus || "",
      igmStatusRemark: lead.igmStatusRemark || "",
    }] : []);
    setIgmDetails(migratedIgmDetails);
    setEditingIgmId(null);
    setIgmContainerNo("");
    setIgmNoDt("");
    setIgmItemNo("");
    setIgmChaSelfJobNo("");
    setIgmFinalInwardDate("");
    setIgmContainerGatedIn("");
    setIgmCfsLastDate("");
    setIgmMaterialMovedOutOfCfs("");
    setIgmFreeEmptyCtnrDetentionLastDt("");
    setIgmStatusRemark("");
    setIgmDuty("");
    setIgmShpLine("");
    setIgmStampDuty("");
    setIgmDo("");
    setIgmCfs("");
    setIgmOocStatus("");
    setIsIgmSaved(false);
    setIsIgmEditing(false);

    // DEFERRED DUTY sync
    const migratedDeferredDetails = lead.deferredDutyDetails || (lead.deferredBeNo || lead.deferredBeStatus || lead.deferredDutyAmt || lead.deferredDuty ? [{
      id: "initial-deferred",
      beNo: lead.deferredBeNo || lead.beNo || "",
      deferredBeStatus: lead.deferredBeStatus || "",
      deferredDuty: lead.deferredDuty || "Yes",
      deferredDutyAmt: lead.deferredDutyAmt,
      deferredPaymentDueDate: lead.deferredPaymentDueDate || "",
      deferredStampDutyAmount: lead.deferredStampDutyAmount,
      deferredStampDutyDate: lead.deferredStampDutyDate || "",
      deferredStatusRemark: lead.deferredStatusRemark || "",
    }] : []);
    setDeferredDutyDetails(migratedDeferredDetails);
    setEditingDeferredId(null);
    setDeferredBeNo("");
    setDeferredBeStatus("");
    setDeferredDuty("Yes");
    setDeferredDutyAmt("");
    setDeferredPaymentDueDate("");
    setDeferredStampDutyAmount("");
    setDeferredStampDutyDate("");
    setDeferredStatusRemark("");
    setIsDeferredSaved(false);
    setIsDeferredEditing(false);
  }, [lead]);

  // Auto-calculate ETD and ETA based on the maximum of 'Add Revised Log' dates entered
  useEffect(() => {
    const validEtds = etaHistory
      .map((item) => item.etd)
      .filter((d): d is string => !!d && d.trim() !== "");
    
    if (validEtds.length > 0) {
      const maxEtd = validEtds.reduce((max, current) => (current > max ? current : max), validEtds[0]);
      setEtd(maxEtd);
    } else {
      setEtd(lead.etd || "");
    }

    const validEtas = etaHistory
      .map((item) => item.eta)
      .filter((d): d is string => !!d && d.trim() !== "");
    
    if (validEtas.length > 0) {
      const maxEta = validEtas.reduce((max, current) => (current > max ? current : max), validEtas[0]);
      setEta(maxEta);
    } else {
      setEta(lead.eta || "");
    }
  }, [etaHistory, lead.etd, lead.eta]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDeleteLc = () => {
    onEditLead({
      ...lead,
      lcDetail: undefined,
      lcType: "LC",
      lcAppSentToBank: "",
      lcBankName: "",
      lcNoRefNo: "",
      lcDate: "",
      lcUsanceAtSight: "Usance",
      lcUsanceDays: 0,
      lcLatestShipmentDate: "",
      lcExpiryDate: "",
      lcOpenExRate: 1,
    });

    setLcDetail(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: LcDetail = {
      id: lcDetail?.id || `lc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productName: fixedProductName,
      lcType,
      lcAppSentToBank,
      lcBankName,
      lcNoRefNo,
      lcDate,
      lcUsanceAtSight,
      lcUsanceDays,
      lcLatestShipmentDate,
      lcExpiryDate,
      lcOpenExRate,
    };

    onEditLead({
      ...lead,
      lcDetail: newEntry,
      lcType: newEntry.lcType,
      lcAppSentToBank: newEntry.lcAppSentToBank,
      lcBankName: newEntry.lcBankName,
      lcNoRefNo: newEntry.lcNoRefNo,
      lcDate: newEntry.lcDate,
      lcUsanceAtSight: newEntry.lcUsanceAtSight,
      lcUsanceDays: newEntry.lcUsanceDays,
      lcLatestShipmentDate: newEntry.lcLatestShipmentDate,
      lcExpiryDate: newEntry.lcExpiryDate,
      lcOpenExRate: newEntry.lcOpenExRate,
    });

    setLcDetail(newEntry);
    setIsSaved(true);
    setIsEditing(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleEtaCancel = () => {
    setIsEtaEditing(false);
  };

  const handleDeleteEta = () => {
    onEditLead({
      ...lead,
      etaDetail: undefined,
      etd: "",
      eta: "",
      etaRemark: "",
      etaHistory: [],
    });

    setEtaDetail(null);
  };

  const handleEtaSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: EtaDetail = {
      id: etaDetail?.id || `eta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productName: fixedProductName,
      etd,
      eta,
      etaRemark,
      etaHistory,
    };

    onEditLead({
      ...lead,
      etaDetail: newEntry,
      etd: newEntry.etd,
      eta: newEntry.eta,
      etaRemark: newEntry.etaRemark,
      etaHistory: newEntry.etaHistory,
    });

    setEtaDetail(newEntry);
    setIsEtaSaved(true);
    setIsEtaEditing(false);
    setTimeout(() => setIsEtaSaved(false), 3000);
  };

  const handleBeCancel = () => {
    setIsBeEditing(false);
  };

  const handleDeleteBe = () => {
    onEditLead({
      ...lead,
      beDetail: undefined,
      beFobCif: "FOB",
      beFreightUsd: undefined,
      beInsuranceUsd: undefined,
      beNo: "",
      beDate: "",
      beBoeExRate: undefined,
      beQuery: "",
      beInvoiceNumber: "",
      beInvoiceDate: "",
      beLotBatchNumber: "",
      beBillOfLadingNo: "",
      beBillOfLadingDate: "",
    });

    setBeDetail(null);
  };

  const handleBeSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: BeDetail = {
      id: beDetail?.id || `be-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productName: fixedProductName,
      beFobCif,
      beFreightUsd: beFreightUsd !== "" ? Number(beFreightUsd) : undefined,
      beInsuranceUsd: beInsuranceUsd !== "" ? Number(beInsuranceUsd) : undefined,
      beNo,
      beDate,
      beBoeExRate: beBoeExRate !== "" ? Number(beBoeExRate) : undefined,
      beQuery,
      beInvoiceNumber,
      beInvoiceDate,
      beLotBatchNumber,
      beBillOfLadingNo,
      beBillOfLadingDate,
    };

    onEditLead({
      ...lead,
      beDetail: newEntry,
      beFobCif: newEntry.beFobCif,
      beFreightUsd: newEntry.beFreightUsd,
      beInsuranceUsd: newEntry.beInsuranceUsd,
      beNo: newEntry.beNo,
      beDate: newEntry.beDate,
      beBoeExRate: newEntry.beBoeExRate,
      beQuery: newEntry.beQuery,
      beInvoiceNumber: newEntry.beInvoiceNumber,
      beInvoiceDate: newEntry.beInvoiceDate,
      beLotBatchNumber: newEntry.beLotBatchNumber,
      beBillOfLadingNo: newEntry.beBillOfLadingNo,
      beBillOfLadingDate: newEntry.beBillOfLadingDate,
    });

    setBeDetail(newEntry);
    setIsBeSaved(true);
    setIsBeEditing(false);
    setTimeout(() => setIsBeSaved(false), 3000);
  };

  // Get only products added during the same "New Import" form
  const siblingLeads = (leads || []).filter((l) => l.piNo && l.piNo === lead.piNo);
  const importProducts = siblingLeads.length > 0
    ? Array.from(new Set(siblingLeads.map((l) => l.productNameCustom).filter(Boolean))) as string[]
    : (lead.productNameCustom ? [lead.productNameCustom] : []);

  const fixedProductName = lead.productNameCustom || importProducts[0] || "N/A";

  // Section 1: Container Details handlers
  const handleContainerCancel = () => {
    setEditingContainerId(null);
    setIsContainerEditing(false);
  };

  const handleDeleteContainer = (containerId: string) => {
    const updatedContainers = containers.filter((c) => c.id !== containerId);
    const firstContainer = updatedContainers[0];

    onEditLead({
      ...lead,
      containers: updatedContainers,
      containerProductName: firstContainer?.productName || "",
      containerNo: firstContainer?.containerNo || "",
      containerSize: firstContainer?.containerSize || "20ft",
      containerQty: firstContainer?.containerQty || undefined,
      containerRemark: firstContainer?.containerRemark || "",
    });

    setContainers(updatedContainers);
  };

  const handleContainerSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNo.trim()) return;

    let updatedContainers: ContainerDetail[] = [];

    if (editingContainerId === "new") {
      const newC: ContainerDetail = {
        id: "ctnr-" + Date.now().toString(),
        productName: fixedProductName,
        containerNo: containerNo.trim(),
        containerSize: containerSize || "20ft",
        containerQty: containerQty !== "" ? Number(containerQty) : 0,
        containerRemark: containerRemark,
      };
      updatedContainers = [...containers, newC];
    } else {
      updatedContainers = containers.map((c) =>
        c.id === editingContainerId
          ? {
              ...c,
              productName: fixedProductName,
              containerNo: containerNo.trim(),
              containerSize: containerSize || "20ft",
              containerQty: containerQty !== "" ? Number(containerQty) : 0,
              containerRemark: containerRemark,
            }
          : c
      );
    }

    const firstContainer = updatedContainers[0];

    onEditLead({
      ...lead,
      containers: updatedContainers,
      containerProductName: firstContainer?.productName || "",
      containerNo: firstContainer?.containerNo || "",
      containerSize: firstContainer?.containerSize || "20ft",
      containerQty: firstContainer?.containerQty || undefined,
      containerRemark: firstContainer?.containerRemark || "",
      // propagate containerNo to IGM containerNo if it's empty
      igmContainerNo: lead.igmContainerNo || firstContainer?.containerNo || "",
    });

    setContainers(updatedContainers);
    setIsContainerSaved(true);
    setIsContainerEditing(false);
    setEditingContainerId(null);
    setTimeout(() => setIsContainerSaved(false), 3000);
  };

  // Section 2: IGM & Item handlers
  const handleIgmCancel = () => {
    setEditingIgmId(null);
    setIsIgmEditing(false);
  };

  const handleDeleteIgm = (igmId: string) => {
    const updatedIgms = igmDetails.filter((i) => i.id !== igmId);
    const firstIgm = updatedIgms[0];

    onEditLead({
      ...lead,
      igmDetails: updatedIgms,
      igmContainerNo: firstIgm?.containerNo || "",
      igmNoDt: firstIgm?.igmNoDt || "",
      igmItemNo: firstIgm?.igmItemNo || "",
      igmChaSelfJobNo: firstIgm?.igmChaSelfJobNo || "",
      igmFinalInwardDate: firstIgm?.igmFinalInwardDate || "",
      igmContainerGatedIn: firstIgm?.igmContainerGatedIn || "",
      igmCfsLastDate: firstIgm?.igmCfsLastDate || "",
      igmMaterialMovedOutOfCfs: firstIgm?.igmMaterialMovedOutOfCfs || "",
      igmFreeEmptyCtnrDetentionLastDt: firstIgm?.igmFreeEmptyCtnrDetentionLastDt || "",
      igmDuty: firstIgm?.igmDuty || "",
      igmShpLine: firstIgm?.igmShpLine || "",
      igmStampDuty: firstIgm?.igmStampDuty || "",
      igmDo: firstIgm?.igmDo || "",
      igmCfs: firstIgm?.igmCfs || "",
      igmOocStatus: firstIgm?.igmOocStatus || "",
      igmStatusRemark: firstIgm?.igmStatusRemark || "",
    });

    setIgmDetails(updatedIgms);
  };

  const handleIgmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!igmContainerNo.trim()) return;

    let updatedIgms: IgmDetail[] = [];
    const newEntry: IgmDetail = {
      id: editingIgmId && editingIgmId !== "new" ? editingIgmId : "igm-" + Date.now().toString(),
      containerNo: igmContainerNo.trim(),
      igmNoDt,
      igmItemNo,
      igmChaSelfJobNo,
      igmFinalInwardDate,
      igmContainerGatedIn,
      igmCfsLastDate,
      igmMaterialMovedOutOfCfs,
      igmFreeEmptyCtnrDetentionLastDt,
      igmDuty,
      igmShpLine,
      igmStampDuty,
      igmDo,
      igmCfs,
      igmOocStatus,
      igmStatusRemark,
    };

    if (editingIgmId === "new") {
      updatedIgms = [...igmDetails, newEntry];
    } else {
      updatedIgms = igmDetails.map((i) => (i.id === editingIgmId ? newEntry : i));
    }

    const firstIgm = updatedIgms[0];

    onEditLead({
      ...lead,
      igmDetails: updatedIgms,
      igmContainerNo: firstIgm?.containerNo || "",
      igmNoDt: firstIgm?.igmNoDt || "",
      igmItemNo: firstIgm?.igmItemNo || "",
      igmChaSelfJobNo: firstIgm?.igmChaSelfJobNo || "",
      igmFinalInwardDate: firstIgm?.igmFinalInwardDate || "",
      igmContainerGatedIn: firstIgm?.igmContainerGatedIn || "",
      igmCfsLastDate: firstIgm?.igmCfsLastDate || "",
      igmMaterialMovedOutOfCfs: firstIgm?.igmMaterialMovedOutOfCfs || "",
      igmFreeEmptyCtnrDetentionLastDt: firstIgm?.igmFreeEmptyCtnrDetentionLastDt || "",
      igmDuty: firstIgm?.igmDuty || "",
      igmShpLine: firstIgm?.igmShpLine || "",
      igmStampDuty: firstIgm?.igmStampDuty || "",
      igmDo: firstIgm?.igmDo || "",
      igmCfs: firstIgm?.igmCfs || "",
      igmOocStatus: firstIgm?.igmOocStatus || "",
      igmStatusRemark: firstIgm?.igmStatusRemark || "",
    });

    setIgmDetails(updatedIgms);
    setIsIgmSaved(true);
    setIsIgmEditing(false);
    setEditingIgmId(null);
    setTimeout(() => setIsIgmSaved(false), 3000);
  };

  // Section 3: DEFERRED DUTY handlers
  const handleDeleteDeferred = (deferredId: string) => {
    const updatedDeferred = deferredDutyDetails.filter((d) => d.id !== deferredId);
    const firstDeferred = updatedDeferred[0];

    onEditLead({
      ...lead,
      deferredDutyDetails: updatedDeferred,
      deferredBeNo: firstDeferred?.beNo || "",
      deferredBeStatus: firstDeferred?.deferredBeStatus || "",
      deferredDuty: firstDeferred?.deferredDuty || "No",
      deferredDutyAmt: firstDeferred?.deferredDutyAmt,
      deferredPaymentDueDate: firstDeferred?.deferredPaymentDueDate || "",
      deferredStampDutyAmount: firstDeferred?.deferredStampDutyAmount,
      deferredStampDutyDate: firstDeferred?.deferredStampDutyDate || "",
      deferredStatusRemark: firstDeferred?.deferredStatusRemark || "",
    });

    setDeferredDutyDetails(updatedDeferred);
  };

  const handleDeferredCancel = () => {
    setEditingDeferredId(null);
    setIsDeferredEditing(false);
  };

  const handleDeferredSave = (e: React.FormEvent) => {
    e.preventDefault();

    let updatedDeferred: DeferredDutyDetail[] = [];
    const newEntry: DeferredDutyDetail = {
      id: editingDeferredId && editingDeferredId !== "new" ? editingDeferredId : "def-" + Date.now().toString(),
      beNo: deferredBeNo.trim(),
      deferredBeStatus,
      deferredDuty,
      deferredDutyAmt: deferredDutyAmt !== "" ? Number(deferredDutyAmt) : undefined,
      deferredPaymentDueDate,
      deferredStampDutyAmount: deferredStampDutyAmount !== "" ? Number(deferredStampDutyAmount) : undefined,
      deferredStampDutyDate,
      deferredStatusRemark,
    };

    if (editingDeferredId === "new") {
      updatedDeferred = [...deferredDutyDetails, newEntry];
    } else {
      updatedDeferred = deferredDutyDetails.map((d) => (d.id === editingDeferredId ? newEntry : d));
    }

    const firstDeferred = updatedDeferred[0];

    onEditLead({
      ...lead,
      deferredDutyDetails: updatedDeferred,
      deferredBeNo: firstDeferred?.beNo || "",
      deferredBeStatus: firstDeferred?.deferredBeStatus || "",
      deferredDuty: firstDeferred?.deferredDuty || "No",
      deferredDutyAmt: firstDeferred?.deferredDutyAmt,
      deferredPaymentDueDate: firstDeferred?.deferredPaymentDueDate || "",
      deferredStampDutyAmount: firstDeferred?.deferredStampDutyAmount,
      deferredStampDutyDate: firstDeferred?.deferredStampDutyDate || "",
      deferredStatusRemark: firstDeferred?.deferredStatusRemark || "",
    });

    setDeferredDutyDetails(updatedDeferred);
    setIsDeferredSaved(true);
    setIsDeferredEditing(false);
    setEditingDeferredId(null);
    setTimeout(() => setIsDeferredSaved(false), 3000);
  };

  // Auto-calculate CFS LAST DATE (10 Days) based on "CONTAINER GATED IN"
  useEffect(() => {
    if (igmContainerGatedIn && !lead.igmCfsLastDate) {
      try {
        const dateObj = new Date(igmContainerGatedIn);
        if (!isNaN(dateObj.getTime())) {
          dateObj.setDate(dateObj.getDate() + 10);
          const computedDate = dateObj.toISOString().split("T")[0];
          setIgmCfsLastDate(computedDate);
        }
      } catch (e) {
        // ignore invalid dates
      }
    }
  }, [igmContainerGatedIn, lead.igmCfsLastDate]);

  // Generate mapped identifier key
  const mappingKey = `${lead.piNo || "N/A"} @ ${lead.productNameCustom || "N/A"}`;

  return (
    <div className="bg-slate-50/90 rounded-2xl p-6 border border-slate-200 shadow-inner text-slate-800 font-sans">
      {/* Mapping Key Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 mb-5 gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-mono">
            Mapped Key: PI NO & Product Name
          </span>
          <h4 className="text-sm font-bold text-slate-900 mt-1.5 font-mono">
            {mappingKey}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-mono uppercase bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs"
        >
          Collapse Row
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Section 3: LC Details Section - Supports Multi-Entry CRUD */}
        {!isEditing ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Landmark size={13} className="text-indigo-600" /> LC Details Section
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setLcProductName(lcDetail?.productName || importProducts[0] || lead.productNameCustom || "");
                    setLcType(lcDetail?.lcType || lead.lcType || "LC");
                    setLcAppSentToBank(lcDetail?.lcAppSentToBank || lead.lcAppSentToBank || "");
                    setLcBankName(lcDetail?.lcBankName || lead.lcBankName || "");
                    setLcNoRefNo(lcDetail?.lcNoRefNo || lead.lcNoRefNo || "");
                    setLcDate(lcDetail?.lcDate || lead.lcDate || "");
                    setLcUsanceAtSight(lcDetail?.lcUsanceAtSight || lead.lcUsanceAtSight || "Usance");
                    setLcUsanceDays(lcDetail?.lcUsanceDays !== undefined ? lcDetail.lcUsanceDays : (lead.lcUsanceDays || 0));
                    setLcLatestShipmentDate(lcDetail?.lcLatestShipmentDate || lead.lcLatestShipmentDate || "");
                    setLcExpiryDate(lcDetail?.lcExpiryDate || lead.lcExpiryDate || "");
                    setLcOpenExRate(lcDetail?.lcOpenExRate !== undefined ? lcDetail.lcOpenExRate : (lead.lcOpenExRate || 1));
                    setIsEditing(true);
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  {lcDetail ? <Edit2 size={11} /> : <Plus size={11} />}
                  <span>{lcDetail ? "Edit LC Detail" : "Register LC Detail"}</span>
                </button>
              </div>

              {isSaved && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={13} />
                  <span>Saved successfully!</span>
                </div>
              )}

              <div className="max-h-[310px] overflow-y-auto pr-1">
                {!lcDetail ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200/60 my-2">
                    <Landmark size={22} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">No LC Details Registered</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click "Register LC Detail" to add LC information for this product.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200/80 transition-all relative">
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDeleteLc}
                        className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                        title="Delete LC Detail"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        lcDetail.lcType === "LC" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {lcDetail.lcType || "LC"}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-800">
                        {lcDetail.lcNoRefNo || "No Ref No"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] border-t border-slate-200/40 pt-1.5">
                      <div className="col-span-2 mb-0.5">
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Product Name</span>
                        <span className="font-semibold text-slate-800 block truncate" title={lcDetail.productName}>
                          {lcDetail.productName || lead.productNameCustom || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Bank Name</span>
                        <span className="font-medium text-slate-700 block truncate">
                          {lcDetail.lcBankName || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">App Sent To Bank</span>
                        <span className="font-medium text-slate-700 block truncate">
                          {lcDetail.lcAppSentToBank || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">LC Date</span>
                        <span className="font-mono font-medium text-slate-700 block">
                          {lcDetail.lcDate || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Usance / At Sight</span>
                        <span className="font-medium text-slate-700 block">
                          {lcDetail.lcUsanceAtSight} {lcDetail.lcUsanceAtSight === "Usance" && lcDetail.lcUsanceDays ? `(${lcDetail.lcUsanceDays}d)` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Open Ex Rate</span>
                        <span className="font-mono font-medium text-slate-700 block">
                          {lcDetail.lcOpenExRate}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Shipment Date</span>
                        <span className="font-mono font-medium text-slate-700 block">
                          {lcDetail.lcLatestShipmentDate || "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">LC Expiry Date</span>
                        <span className="font-mono font-medium text-slate-700 block">
                          {lcDetail.lcExpiryDate || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-mono shrink-0">
              <span>Status: {lcDetail ? "Registered" : "Pending"}</span>
              <span>Single Detail per Row</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between ring-1 ring-indigo-100 min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Landmark size={13} className="text-indigo-600" /> {lcDetail ? "Edit LC Detail" : "Register LC Detail"}
                </h5>
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase font-mono">
                  Editing Mode
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Product Name (Fixed) */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Product Name (Fixed for Row)</label>
                  <input
                    type="text"
                    disabled
                    value={fixedProductName}
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold cursor-not-allowed font-mono"
                  />
                </div>

                {/* LC / NON LC */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">LC / NON LC</label>
                  <select
                    value={lcType}
                    onChange={(e) => setLcType(e.target.value as "LC" | "NON LC")}
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
                  >
                    <option value="LC">LC</option>
                    <option value="NON LC">NON LC</option>
                  </select>
                </div>

                {/* App Sent To Bank */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">App Sent To Bank</label>
                  <input
                    type="text"
                    value={lcAppSentToBank}
                    onChange={(e) => setLcAppSentToBank(e.target.value)}
                    placeholder="e.g. Sent / Date"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={lcBankName}
                    onChange={(e) => setLcBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* LC NO / Ref No */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">LC NO / Ref No</label>
                  <input
                    type="text"
                    value={lcNoRefNo}
                    onChange={(e) => setLcNoRefNo(e.target.value)}
                    placeholder="e.g. LC-987654"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* LC Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">LC Date</label>
                  <input
                    type="date"
                    value={lcDate}
                    onChange={(e) => setLcDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* LC Usance / At Sight */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Usance / At Sight</label>
                  <select
                    value={lcUsanceAtSight}
                    onChange={(e) => setLcUsanceAtSight(e.target.value as "Usance" | "At Sight")}
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
                  >
                    <option value="Usance">Usance</option>
                    <option value="At Sight">At Sight</option>
                  </select>
                </div>

                {/* Usance Days */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Usance Days</label>
                  <input
                    type="number"
                    value={lcUsanceDays}
                    onChange={(e) => setLcUsanceDays(Number(e.target.value))}
                    placeholder="0"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* LC Open Ex Rate */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">LC Open Ex Rate</label>
                  <input
                    type="number"
                    step="any"
                    value={lcOpenExRate}
                    onChange={(e) => setLcOpenExRate(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Latest Shipment Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Shipment Date</label>
                  <input
                    type="date"
                    value={lcLatestShipmentDate}
                    onChange={(e) => setLcLatestShipmentDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* LC Expiry Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">LC Expiry Date</label>
                  <input
                    type="date"
                    value={lcExpiryDate}
                    onChange={(e) => setLcExpiryDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save LC Detail</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Section 4: ETA Details Section - Single Detail per Row */}
        {!isEtaEditing ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-600" /> ETA Details Section
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setEtaProductName(etaDetail?.productName || importProducts[0] || lead.productNameCustom || "");
                    setEtd(etaDetail?.etd || lead.etd || "");
                    setEta(etaDetail?.eta || lead.eta || "");
                    setEtaRemark(etaDetail?.etaRemark || lead.etaRemark || "");
                    setEtaHistory(etaDetail?.etaHistory || lead.etaHistory || []);
                    setIsEtaEditing(true);
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100/80 px-2.5 py-1 rounded-lg border border-sky-200 transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  {etaDetail ? <Edit2 size={11} /> : <Plus size={11} />}
                  <span>{etaDetail ? "Edit ETA Detail" : "Register ETA Detail"}</span>
                </button>
              </div>

              {isEtaSaved && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={13} />
                  <span>Saved successfully!</span>
                </div>
              )}

              <div className="max-h-[310px] overflow-y-auto pr-1">
                {!etaDetail ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200/60 my-2">
                    <Clock size={22} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">No ETA Details Registered</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click "Register ETA Detail" to add ETD and ETA dates for this product.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200/80 transition-all relative">
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDeleteEta}
                        className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                        title="Delete ETA Detail"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-100 font-mono">
                        ETD: {etaDetail.etd || "N/A"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                        ETA: {etaDetail.eta || "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-[10px] border-t border-slate-200/40 pt-1.5">
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Product Name</span>
                        <span className="font-semibold text-slate-800 block truncate" title={etaDetail.productName}>
                          {etaDetail.productName || lead.productNameCustom || "N/A"}
                        </span>
                      </div>
                      {etaDetail.etaRemark && (
                        <div className="mt-1">
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Remark</span>
                          <p className="text-[10px] text-slate-600 italic leading-snug whitespace-pre-wrap">
                            {etaDetail.etaRemark}
                          </p>
                        </div>
                      )}
                      {etaDetail.etaHistory && etaDetail.etaHistory.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-dashed border-slate-200">
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono flex items-center gap-1">
                            <History size={10} /> Revised Logs ({etaDetail.etaHistory.length})
                          </span>
                          <div className="mt-1 space-y-1">
                            {etaDetail.etaHistory.map((h, hIdx) => (
                              <div key={h.id || hIdx} className="bg-white p-1.5 rounded border border-slate-150 text-[9px] flex justify-between font-mono">
                                <span>ETD: {h.etd || "N/A"}</span>
                                <span>ETA: {h.eta || "N/A"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-mono shrink-0">
              <span>Status: {etaDetail ? "Registered" : "Pending"}</span>
              <span>Single Detail per Row</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEtaSave} className="bg-white p-4 rounded-xl border border-sky-200 shadow-xs flex flex-col justify-between ring-1 ring-sky-100 min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-600" /> {etaDetail ? "Edit ETA Detail" : "Register ETA Detail"}
                </h5>
                <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded uppercase font-mono">
                  Editing Mode
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Product Name (Fixed) */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Product Name (Fixed for Row)</label>
                  <input
                    type="text"
                    disabled
                    value={fixedProductName}
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold cursor-not-allowed font-mono"
                  />
                </div>

                {/* ETD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">ETD</label>
                    <span className="text-[8px] text-sky-600 bg-sky-50 px-1 py-0.2 rounded font-bold font-mono">Auto (Max)</span>
                  </div>
                  <input
                    type="date"
                    value={etd}
                    readOnly
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2 py-1.5 rounded-lg outline-none text-slate-500 font-mono cursor-not-allowed select-none focus:ring-0"
                    title="Automatically computed as the maximum ETD of all revised logs below"
                  />
                </div>

                {/* ETA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">ETA</label>
                    <span className="text-[8px] text-sky-600 bg-sky-50 px-1 py-0.2 rounded font-bold font-mono">Auto (Max)</span>
                  </div>
                  <input
                    type="date"
                    value={eta}
                    readOnly
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2 py-1.5 rounded-lg outline-none text-slate-500 font-mono cursor-not-allowed select-none focus:ring-0"
                    title="Automatically computed as the maximum ETA of all revised logs below"
                  />
                </div>

                {/* Remark */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Remark</label>
                  <textarea
                    value={etaRemark}
                    onChange={(e) => setEtaRemark(e.target.value)}
                    placeholder="Enter shipment status remarks..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-sans resize-none"
                  />
                </div>
              </div>

              {/* Dynamic Revised ETA history logs */}
              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase flex items-center gap-1">
                    <History size={11} /> Multi ETD/ETA Logs
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEtaHistory([
                        ...etaHistory,
                        {
                          id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                          etd: "",
                          eta: "",
                          remark: "",
                          updatedAt: new Date().toISOString(),
                        },
                      ]);
                    }}
                    className="text-[9px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded border border-sky-200 transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={10} /> Add Revised Log
                  </button>
                </div>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {etaHistory.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded border border-dashed border-slate-200 text-center">
                      Click "Add Revised Log" to track alternative or multiple ETDs and ETAs.
                    </div>
                  ) : (
                    etaHistory.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 relative space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...etaHistory];
                            updated.splice(index, 1);
                            setEtaHistory(updated);
                          }}
                          className="absolute top-1 right-1 text-rose-500 hover:text-rose-700 p-0.5 hover:bg-rose-50 rounded"
                          title="Remove Log"
                        >
                          <Trash2 size={11} />
                        </button>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-0.5">ETD</label>
                            <input
                              type="date"
                              value={item.etd}
                              onChange={(e) => {
                                const updated = [...etaHistory];
                                updated[index].etd = e.target.value;
                                setEtaHistory(updated);
                              }}
                              className="w-full text-[11px] border border-slate-200 bg-white px-1.5 py-1 rounded focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-0.5">ETA</label>
                            <input
                              type="date"
                              value={item.eta}
                              onChange={(e) => {
                                const updated = [...etaHistory];
                                updated[index].eta = e.target.value;
                                setEtaHistory(updated);
                              }}
                              className="w-full text-[11px] border border-slate-200 bg-white px-1.5 py-1 rounded focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-0.5">Remark</label>
                            <input
                              type="text"
                              value={item.remark}
                              onChange={(e) => {
                                const updated = [...etaHistory];
                                updated[index].remark = e.target.value;
                                setEtaHistory(updated);
                              }}
                              placeholder="Revised shipping remark..."
                              className="w-full text-[11px] border border-slate-200 bg-white px-1.5 py-1 rounded focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleEtaCancel}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save ETA Detail</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Section 5: BE Details Section - Single Detail per Row */}
        {!isBeEditing ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-500" /> BE Details Section
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setBeProductName(beDetail?.productName || importProducts[0] || lead.productNameCustom || "");
                    setBeFobCif(beDetail?.beFobCif || lead.beFobCif || "FOB");
                    setBeFreightUsd(beDetail?.beFreightUsd !== undefined ? beDetail.beFreightUsd : (lead.beFreightUsd || ""));
                    setBeInsuranceUsd(beDetail?.beInsuranceUsd !== undefined ? beDetail.beInsuranceUsd : (lead.beInsuranceUsd || ""));
                    setBeNo(beDetail?.beNo || lead.beNo || "");
                    setBeDate(beDetail?.beDate || lead.beDate || "");
                    setBeBoeExRate(beDetail?.beBoeExRate !== undefined ? beDetail.beBoeExRate : (lead.beBoeExRate || ""));
                    setBeQuery(beDetail?.beQuery || lead.beQuery || "");
                    setBeInvoiceNumber(beDetail?.beInvoiceNumber || lead.beInvoiceNumber || "");
                    setBeInvoiceDate(beDetail?.beInvoiceDate || lead.beInvoiceDate || "");
                    setBeLotBatchNumber(beDetail?.beLotBatchNumber || lead.beLotBatchNumber || "");
                    setBeBillOfLadingNo(beDetail?.beBillOfLadingNo || lead.beBillOfLadingNo || "");
                    setBeBillOfLadingDate(beDetail?.beBillOfLadingDate || lead.beBillOfLadingDate || "");
                    setIsBeEditing(true);
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100/80 px-2.5 py-1 rounded-lg border border-sky-200 transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  {beDetail ? <Edit2 size={11} /> : <Plus size={11} />}
                  <span>{beDetail ? "Edit BE Detail" : "Register BE Detail"}</span>
                </button>
              </div>

              {isBeSaved && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={13} />
                  <span>Saved successfully!</span>
                </div>
              )}

              <div className="max-h-[310px] overflow-y-auto pr-1">
                {!beDetail ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200/60 my-2">
                    <Layers size={22} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">No BE Details Registered</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click "Register BE Detail" to add Bill of Entry details for this product.</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200/80 transition-all relative">
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDeleteBe}
                        className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                        title="Delete BE Detail"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        beDetail.beFobCif === 'CIF' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {beDetail.beFobCif || "FOB"}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-800">
                        BE: {beDetail.beNo || "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] border-t border-slate-200/40 pt-1.5">
                      <div className="col-span-2 mb-0.5">
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Product Name</span>
                        <span className="font-semibold text-slate-800 block truncate" title={beDetail.productName}>
                          {beDetail.productName || lead.productNameCustom || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">BE Date</span>
                        <span className="font-mono font-medium text-slate-700 block">
                          {beDetail.beDate || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Invoice No</span>
                        <span className="font-mono font-medium text-slate-700 block truncate">
                          {beDetail.beInvoiceNumber || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-mono shrink-0">
              <span>Status: {beDetail ? "Registered" : "Pending"}</span>
              <span>Single Detail per Row</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBeSave} className="bg-white p-4 rounded-xl border border-sky-200 shadow-xs flex flex-col justify-between ring-1 ring-sky-100 min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-sky-600" /> {beDetail ? "Edit BE Detail" : "Register BE Detail"}
                </h5>
                <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded uppercase font-mono">
                  Editing Mode
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Product Name (Fixed) */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Product Name (Fixed for Row)</label>
                  <input
                    type="text"
                    disabled
                    value={fixedProductName}
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold cursor-not-allowed font-mono"
                  />
                </div>

                {/* FOB / CIF */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">FOB / CIF</label>
                  <select
                    value={beFobCif}
                    onChange={(e) => {
                      const val = e.target.value as "FOB" | "CIF";
                      setBeFobCif(val);
                      if (val === "CIF") {
                        setBeFreightUsd("");
                        setBeInsuranceUsd("");
                      }
                    }}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-sans cursor-pointer"
                  >
                    <option value="FOB">FOB</option>
                    <option value="CIF">CIF</option>
                  </select>
                </div>

                {/* BOE Ex Rate */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">BOE Ex Rate</label>
                  <input
                    type="number"
                    step="any"
                    value={beBoeExRate}
                    onChange={(e) => setBeBoeExRate(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder="BOE Ex Rate"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Freight USD */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Freight USD</label>
                    {beFobCif === "CIF" && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded font-mono">CIF (Locked)</span>}
                  </div>
                  <input
                    type="number"
                    step="any"
                    disabled={beFobCif === "CIF"}
                    value={beFreightUsd}
                    onChange={(e) => setBeFreightUsd(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder={beFobCif === "CIF" ? "N/A" : "Enter Freight"}
                    className={`w-full text-xs border border-slate-200 px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono ${
                      beFobCif === "CIF" ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white"
                    }`}
                  />
                </div>

                {/* Insurance USD */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Insurance USD</label>
                    {beFobCif === "CIF" && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded font-mono">CIF (Locked)</span>}
                  </div>
                  <input
                    type="number"
                    step="any"
                    disabled={beFobCif === "CIF"}
                    value={beInsuranceUsd}
                    onChange={(e) => setBeInsuranceUsd(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder={beFobCif === "CIF" ? "N/A" : "Enter Insurance"}
                    className={`w-full text-xs border border-slate-200 px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono ${
                      beFobCif === "CIF" ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white"
                    }`}
                  />
                </div>

                {/* BE NO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">BE NO</label>
                  <input
                    type="text"
                    value={beNo}
                    onChange={(e) => setBeNo(e.target.value)}
                    placeholder="BE Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                  />
                </div>

                {/* BE DATE */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">BE DATE</label>
                  <input
                    type="date"
                    value={beDate}
                    onChange={(e) => setBeDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={beInvoiceNumber}
                    onChange={(e) => setBeInvoiceNumber(e.target.value)}
                    placeholder="Invoice Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={beInvoiceDate}
                    onChange={(e) => setBeInvoiceDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* BILL OF LADING NO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">B/L NO</label>
                  <input
                    type="text"
                    value={beBillOfLadingNo}
                    onChange={(e) => setBeBillOfLadingNo(e.target.value)}
                    placeholder="B/L Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                  />
                </div>

                {/* BILL OF LADING Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">B/L Date</label>
                  <input
                    type="date"
                    value={beBillOfLadingDate}
                    onChange={(e) => setBeBillOfLadingDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Lot / Batch Number */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Lot / Batch Number</label>
                  <input
                    type="text"
                    value={beLotBatchNumber}
                    onChange={(e) => setBeLotBatchNumber(e.target.value)}
                    placeholder="Lot or Batch Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                  />
                </div>

                {/* BE Query */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">BE Query</label>
                  <textarea
                    value={beQuery}
                    onChange={(e) => setBeQuery(e.target.value)}
                    placeholder="Enter BE status queries or notes..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-sans resize-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleBeCancel}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save BE Detail</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Row 2: Container Details, IGM & Item, DEFERRED DUTY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Section 4: Container Details - Supports View & Edit Toggle */}
        {!isContainerEditing ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-500" /> Container Details
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setEditingContainerId("new");
                    setContainerProductName(importProducts[0] || lead.productNameCustom || "");
                    setContainerNo("");
                    setContainerSize("20ft");
                    setContainerQty("");
                    setContainerRemark("");
                    setIsContainerEditing(true);
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Plus size={11} />
                  <span>Add Container</span>
                </button>
              </div>

              {isContainerSaved && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={13} />
                  <span>Saved successfully!</span>
                </div>
              )}

              <div className="max-h-[310px] overflow-y-auto pr-1 space-y-2.5">
                {containers.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200/60 my-2">
                    <Layers size={22} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">No Containers Registered</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click "Add Container" to register a container for this product.</p>
                  </div>
                ) : (
                  containers.map((c, idx) => (
                    <div key={c.id || idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200/80 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                            {c.containerSize || "20ft"}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-800">
                            {c.containerNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContainerId(c.id);
                              setContainerProductName(c.productName);
                              setContainerNo(c.containerNo);
                              setContainerSize(c.containerSize);
                              setContainerQty(c.containerQty);
                              setContainerRemark(c.containerRemark);
                              setIsContainerEditing(true);
                            }}
                            className="p-1 hover:bg-emerald-100/60 rounded-md text-slate-500 hover:text-emerald-700 transition-all cursor-pointer"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContainer(c.id)}
                            className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] border-t border-slate-200/40 pt-1.5">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Product Name</span>
                          <span className="font-semibold text-slate-700 block truncate" title={c.productName}>
                            {c.productName}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Quantity</span>
                          <span className="font-semibold text-slate-700 font-mono block">
                            {c.containerQty || 0}
                          </span>
                        </div>
                      </div>

                      {c.containerRemark && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/30">
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono block">Remark</span>
                          <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal whitespace-pre-wrap">
                            {c.containerRemark}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-mono shrink-0">
              <span>Containers: {containers.length}</span>
              <span>Read-only mode</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleContainerSave} className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between ring-1 ring-emerald-100 min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-emerald-600" /> {editingContainerId === "new" ? "Add Container" : "Edit Container"}
                </h5>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase font-mono">
                  Editing Mode
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                {/* Product Name (Fixed) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Product Name (Fixed for Row)</label>
                  <input
                    type="text"
                    disabled
                    value={fixedProductName}
                    className="w-full text-xs border border-slate-200 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold cursor-not-allowed font-mono"
                  />
                </div>

                {/* Container No */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Container No</label>
                  <input
                    type="text"
                    required
                    value={containerNo}
                    onChange={(e) => setContainerNo(e.target.value)}
                    placeholder="Enter Container Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Size of Container */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Size of Container</label>
                  <select
                    value={containerSize}
                    onChange={(e) => setContainerSize(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 cursor-pointer"
                  >
                    <option value="20ft">20ft</option>
                    <option value="40ft">40ft</option>
                    <option value="45ft">45ft</option>
                  </select>
                </div>

                {/* Container Wise Qty */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Container Wise Qty</label>
                  <input
                    type="number"
                    step="any"
                    value={containerQty}
                    onChange={(e) => setContainerQty(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder="Enter Quantity"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Remark */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Remark</label>
                  <textarea
                    value={containerRemark}
                    onChange={(e) => setContainerRemark(e.target.value)}
                    placeholder="Enter Container Remark..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-sans resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleContainerCancel}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Save size={14} />
                <span>Save Container</span>
              </button>
            </div>
          </form>
        )}

        {/* Section 5: IGM & Item Section - Supports View & Edit Toggle */}
        {!isIgmEditing ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Ship size={13} className="text-slate-500" /> IGM & Item Section
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIgmId("new");
                    setIgmContainerNo(containers[0]?.containerNo || lead.containerNo || "");
                    setIgmNoDt("");
                    setIgmItemNo("");
                    setIgmChaSelfJobNo("");
                    setIgmFinalInwardDate("");
                    setIgmContainerGatedIn("");
                    setIgmCfsLastDate("");
                    setIgmMaterialMovedOutOfCfs("");
                    setIgmFreeEmptyCtnrDetentionLastDt("");
                    setIgmStatusRemark("");
                    setIgmDuty("");
                    setIgmShpLine("");
                    setIgmStampDuty("");
                    setIgmDo("");
                    setIgmCfs("");
                    setIgmOocStatus("");
                    setIsIgmEditing(true);
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Plus size={11} />
                  <span>Add IGM</span>
                </button>
              </div>

              {isIgmSaved && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={13} />
                  <span>Saved successfully!</span>
                </div>
              )}

              <div className="max-h-[310px] overflow-y-auto pr-1 space-y-2.5">
                {igmDetails.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200/60 my-2">
                    <Ship size={22} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">No IGM Details Registered</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click "Add IGM" to register IGM & item details for containers.</p>
                  </div>
                ) : (
                  igmDetails.map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200/85 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                            {item.containerNo || "No Container"}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-800">
                            IGM: {item.igmNoDt || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIgmId(item.id);
                              setIgmContainerNo(item.containerNo);
                              setIgmNoDt(item.igmNoDt);
                              setIgmItemNo(item.igmItemNo);
                              setIgmChaSelfJobNo(item.igmChaSelfJobNo);
                              setIgmFinalInwardDate(item.igmFinalInwardDate);
                              setIgmContainerGatedIn(item.igmContainerGatedIn);
                              setIgmCfsLastDate(item.igmCfsLastDate);
                              setIgmMaterialMovedOutOfCfs(item.igmMaterialMovedOutOfCfs);
                              setIgmFreeEmptyCtnrDetentionLastDt(item.igmFreeEmptyCtnrDetentionLastDt);
                              setIgmStatusRemark(item.igmStatusRemark);
                              setIgmDuty(item.igmDuty);
                              setIgmShpLine(item.igmShpLine);
                              setIgmStampDuty(item.igmStampDuty);
                              setIgmDo(item.igmDo);
                              setIgmCfs(item.igmCfs);
                              setIgmOocStatus(item.igmOocStatus);
                              setIsIgmEditing(true);
                            }}
                            className="p-1 hover:bg-indigo-100/60 rounded-md text-slate-500 hover:text-indigo-700 transition-all cursor-pointer"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIgm(item.id)}
                            className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] border-t border-slate-200/40 pt-1.5">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Item No</span>
                          <span className="font-semibold text-slate-700 block truncate font-mono">
                            {item.igmItemNo || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Job No</span>
                          <span className="font-semibold text-slate-700 font-mono block truncate">
                            {item.igmChaSelfJobNo || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">CFS Last Date</span>
                          <span className="font-semibold text-amber-700 font-mono block truncate">
                            {item.igmCfsLastDate || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] border-t border-slate-200/30 pt-1 mt-1">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Gated In</span>
                          <span className="font-semibold text-slate-700 font-mono block">
                            {item.igmContainerGatedIn || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">OOC Status</span>
                          <span className="font-semibold text-slate-700 block">
                            {item.igmOocStatus || "N/A"}
                          </span>
                        </div>
                      </div>

                      {item.igmStatusRemark && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/30">
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono block">Remark</span>
                          <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal whitespace-pre-wrap">
                            {item.igmStatusRemark}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-mono shrink-0">
              <span>IGM Entries: {igmDetails.length}</span>
              <span>Read-only mode</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleIgmSave} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between ring-1 ring-indigo-100 min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Ship size={13} className="text-indigo-600" /> {editingIgmId === "new" ? "Add IGM & Item Details" : "Edit IGM & Item Details"}
                </h5>
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase font-mono">
                  Editing Mode
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs max-h-[330px] overflow-y-auto pr-1">
                {/* CONTAINER NO Dropdown */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Container No</label>
                  <select
                    value={igmContainerNo}
                    onChange={(e) => setIgmContainerNo(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 cursor-pointer font-mono"
                  >
                    <option value="">-- Select Container --</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.containerNo}>
                        {c.containerNo} ({c.productName} - {c.containerSize})
                      </option>
                    ))}
                    {lead.containerNo && !containers.some(c => c.containerNo === lead.containerNo) && (
                      <option value={lead.containerNo}>{lead.containerNo} (Legacy Lead)</option>
                    )}
                  </select>
                </div>

                {/* IGM NO & DT */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">IGM NO & DT</label>
                  <input
                    type="text"
                    value={igmNoDt}
                    onChange={(e) => setIgmNoDt(e.target.value)}
                    placeholder="IGM # & Date"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* ITEM NO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Item No</label>
                  <input
                    type="text"
                    value={igmItemNo}
                    onChange={(e) => setIgmItemNo(e.target.value)}
                    placeholder="Item Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* CHA / SELF JOB NO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">CHA / Self Job No</label>
                  <input
                    type="text"
                    value={igmChaSelfJobNo}
                    onChange={(e) => setIgmChaSelfJobNo(e.target.value)}
                    placeholder="CHA Job Number"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* Final Inward Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Final Inward Date</label>
                  <input
                    type="date"
                    value={igmFinalInwardDate}
                    onChange={(e) => setIgmFinalInwardDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* CONTAINER GATED IN */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Container Gated In</label>
                  <input
                    type="date"
                    value={igmContainerGatedIn}
                    onChange={(e) => setIgmContainerGatedIn(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* CFS LAST DATE (10 Days) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">CFS Last Date (10D)</label>
                  <input
                    type="date"
                    value={igmCfsLastDate}
                    onChange={(e) => setIgmCfsLastDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* MATERIAL MOVED OUT OF CFS */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Material Out of CFS</label>
                  <input
                    type="date"
                    value={igmMaterialMovedOutOfCfs}
                    onChange={(e) => setIgmMaterialMovedOutOfCfs(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* FREE EMPTY CTNR DETENTION LAST DT */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Detention Last Date</label>
                  <input
                    type="date"
                    value={igmFreeEmptyCtnrDetentionLastDt}
                    onChange={(e) => setIgmFreeEmptyCtnrDetentionLastDt(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* DUTY */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">DUTY</label>
                  <input
                    type="text"
                    value={igmDuty}
                    onChange={(e) => setIgmDuty(e.target.value)}
                    placeholder="Duty Details"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* SHP LINE */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">SHP Line</label>
                  <input
                    type="text"
                    value={igmShpLine}
                    onChange={(e) => setIgmShpLine(e.target.value)}
                    placeholder="Shipping Line"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* STAMP DUTY */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Stamp Duty</label>
                  <input
                    type="text"
                    value={igmStampDuty}
                    onChange={(e) => setIgmStampDuty(e.target.value)}
                    placeholder="Stamp Duty Details"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* DO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">DO</label>
                  <input
                    type="text"
                    value={igmDo}
                    onChange={(e) => setIgmDo(e.target.value)}
                    placeholder="Delivery Order"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* CFS */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">CFS</label>
                  <input
                    type="text"
                    value={igmCfs}
                    onChange={(e) => setIgmCfs(e.target.value)}
                    placeholder="Container Freight Station"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* OOC Status */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">OOC Status</label>
                  <input
                    type="text"
                    value={igmOocStatus}
                    onChange={(e) => setIgmOocStatus(e.target.value)}
                    placeholder="OOC Status"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                  />
                </div>

                {/* Status/ Remark */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Status/ Remark</label>
                  <textarea
                    value={igmStatusRemark}
                    onChange={(e) => setIgmStatusRemark(e.target.value)}
                    placeholder="Enter status remark..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-sans resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleIgmCancel}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Save size={14} />
                <span>Save IGM Details</span>
              </button>
            </div>
          </form>
        )}

        {/* Section 6: DEFERRED DUTY - Supports View & Edit Toggle */}
        {!isDeferredEditing ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Percent size={13} className="text-slate-500" /> Deferred Duty
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDeferredId("new");
                    setDeferredBeNo(beDetail?.beNo || lead.beNo || "");
                    setDeferredBeStatus("");
                    setDeferredDuty("Yes");
                    setDeferredDutyAmt("");
                    setDeferredPaymentDueDate("");
                    setDeferredStampDutyAmount("");
                    setDeferredStampDutyDate("");
                    setDeferredStatusRemark("");
                    setIsDeferredEditing(true);
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 transition-all flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Plus size={11} />
                  <span>Add Duty Detail</span>
                </button>
              </div>

              {isDeferredSaved && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={13} />
                  <span>Saved successfully!</span>
                </div>
              )}

              <div className="max-h-[310px] overflow-y-auto pr-1 space-y-2.5">
                {deferredDutyDetails.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200/60 my-2">
                    <Percent size={22} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">No Deferred Duty Details</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click "Add Duty Detail" to register deferred duty for a BE.</p>
                  </div>
                ) : (
                  deferredDutyDetails.map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200/85 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                            BE: {item.beNo || "No BE linked"}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.deferredDuty === 'Yes' ? 'bg-amber-100/80 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                            Deferred: {item.deferredDuty || "No"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDeferredId(item.id);
                              setDeferredBeNo(item.beNo || "");
                              setDeferredBeStatus(item.deferredBeStatus || "");
                              setDeferredDuty(item.deferredDuty || "Yes");
                              setDeferredDutyAmt(item.deferredDutyAmt !== undefined ? item.deferredDutyAmt : "");
                              setDeferredPaymentDueDate(item.deferredPaymentDueDate || "");
                              setDeferredStampDutyAmount(item.deferredStampDutyAmount !== undefined ? item.deferredStampDutyAmount : "");
                              setDeferredStampDutyDate(item.deferredStampDutyDate || "");
                              setDeferredStatusRemark(item.deferredStatusRemark || "");
                              setIsDeferredEditing(true);
                            }}
                            className="p-1 hover:bg-amber-100/60 rounded-md text-slate-500 hover:text-amber-800 transition-all cursor-pointer"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeferred(item.id)}
                            className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] border-t border-slate-200/40 pt-1.5">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">BE Status</span>
                          <span className="font-semibold text-slate-700 block truncate">
                            {item.deferredBeStatus || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Duty Amt</span>
                          <span className="font-semibold text-slate-800 font-mono block truncate">
                            {item.deferredDutyAmt !== undefined && item.deferredDutyAmt !== null ? `$${item.deferredDutyAmt.toLocaleString()}` : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Due Date</span>
                          <span className="font-semibold text-rose-600 font-mono block truncate">
                            {item.deferredPaymentDueDate || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">Stamp Duty</span>
                          <span className="font-semibold text-slate-700 font-mono block truncate">
                            {item.deferredStampDutyAmount !== undefined && item.deferredStampDutyAmount !== null ? `$${item.deferredStampDutyAmount.toLocaleString()}` : "N/A"}
                            {item.deferredStampDutyDate ? ` (${item.deferredStampDutyDate})` : ""}
                          </span>
                        </div>
                      </div>

                      {item.deferredStatusRemark && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/30">
                          <span className="text-[8px] text-slate-400 font-bold uppercase font-mono block">Status / Remark</span>
                          <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal whitespace-pre-wrap">
                            {item.deferredStatusRemark}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-mono shrink-0">
              <span>Duty Entries: {deferredDutyDetails.length}</span>
              <span>Read-only mode</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeferredSave} className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between ring-1 ring-amber-100 min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Percent size={13} className="text-amber-600" /> {editingDeferredId === "new" ? "Add Deferred Duty Detail" : "Edit Deferred Duty Detail"}
                </h5>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase font-mono">
                  Editing Mode
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs max-h-[330px] overflow-y-auto pr-1">
                {/* BE NO Dropdown */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">BE No</label>
                  <select
                    value={deferredBeNo}
                    onChange={(e) => setDeferredBeNo(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 cursor-pointer font-mono"
                  >
                    <option value="">-- Select BE Number --</option>
                    {(beDetail ? [beDetail] : []).map((b) => (
                      <option key={b.id || 'be-single'} value={b.beNo}>
                        {b.beNo ? `BE: ${b.beNo} (${b.productName})` : `BE Entry (${b.productName})`}
                      </option>
                    ))}
                    {lead.beNo && (!beDetail || beDetail.beNo !== lead.beNo) && (
                      <option value={lead.beNo}>BE: {lead.beNo} (Legacy Lead)</option>
                    )}
                  </select>
                </div>

                {/* BE Status */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">BE Status</label>
                  <input
                    type="text"
                    value={deferredBeStatus}
                    onChange={(e) => setDeferredBeStatus(e.target.value)}
                    placeholder="e.g. Assessment Done"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                  />
                </div>

                {/* Deferred Duty (Yes/No) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Deferred Duty</label>
                  <select
                    value={deferredDuty}
                    onChange={(e) => setDeferredDuty(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 cursor-pointer"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Deferred Duty Amt */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Deferred Duty Amt</label>
                  <input
                    type="number"
                    step="any"
                    value={deferredDutyAmt}
                    onChange={(e) => setDeferredDutyAmt(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder="Enter amount"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Payment Due Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={deferredPaymentDueDate}
                    onChange={(e) => setDeferredPaymentDueDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Stamp Duty Amount */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Stamp Duty Amt</label>
                  <input
                    type="number"
                    step="any"
                    value={deferredStampDutyAmount}
                    onChange={(e) => setDeferredStampDutyAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                    placeholder="Enter Stamp Duty"
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Stamp Duty Date */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Stamp Duty Date</label>
                  <input
                    type="date"
                    value={deferredStampDutyDate}
                    onChange={(e) => setDeferredStampDutyDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                {/* Status/ Remark */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Status/ Remark</label>
                  <textarea
                    value={deferredStatusRemark}
                    onChange={(e) => setDeferredStatusRemark(e.target.value)}
                    placeholder="Enter status remark..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-sans resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleDeferredCancel}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Save size={14} />
                <span>Save Duty Detail</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
