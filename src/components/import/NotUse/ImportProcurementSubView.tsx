/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, SalesLead, ProjectWorkflow, ActionLog, AccessLevel, Role, Client, Team, Product, AolBranchName, SupplierName } from "../../../types";
import { canEditLead, canDeleteLead, canViewLead, getReportingTreeUsers } from "../../../data";
import { Plus, Search, Edit2, Trash2, ShieldAlert, Lock, Unlock, Filter, DollarSign, Calendar, X, Check, HelpCircle, Building2, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import LeadLcDetailsRow from "../../LeadLcDetailsRow";
import { DateRangeFilterPopup } from "../../DateRangeFilterPopup";

interface NewProductItem {
  productNameCustom: string;
  usdPmt: number;
  qty: number;
}

interface ImportProcurementSubViewProps {
  activeUserId: string;
  users: User[];
  leads: SalesLead[];
  workflows: ProjectWorkflow[];
  products?: Product[];
  clients?: Client[]; // Keep it optional to avoid any breaking changes, but default to empty array
  teams?: Team[];
  onAddLead: (lead: Omit<SalesLead, "id" | "createdAt">) => void;
  onEditLead: (lead: SalesLead) => void;
  onDeleteLead: (leadId: string) => void;
  onAddClient?: (clientData: Omit<Client, "id" | "createdAt">) => void;
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
}

export default function ImportProcurementSubView({
  activeUserId,
  users,
  leads,
  workflows,
  products = [],
  clients = [],
  teams = [],
  onAddLead,
  onEditLead,
  onDeleteLead,
  onAddClient,
  aolBranches = [],
  suppliers = [],
}: ImportProcurementSubViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || users[0];
  const isExecutive = activeUser.teamName === "Executive" || activeUser.role === Role.Admin;
  const clientCompanies = Array.from(new Set(clients.map((c) => c.companyName).filter(Boolean)));

  const aolBranchOptions = aolBranches.length > 0 
    ? aolBranches.map(b => b.name) 
    : ["Mumbai", "Chennai", "Silvassa", "Gujarat"];

  const supplierOptions = suppliers.length > 0 
    ? suppliers.map(s => s.name) 
    : ["Apex Chemicals", "Global Traders", "Silvassa Polymers"];

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");

  // Date Range Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"pi" | "created">("pi");
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SalesLead | null>(null);

  // Form states - Add (New Import)
  const [newAolBranchName, setNewAolBranchName] = useState("");
  const [newIndentor, setNewIndentor] = useState("");
  const [newPiNo, setNewPiNo] = useState("");
  const [newPiDate, setNewPiDate] = useState("");
  const [newPiExRate, setNewPiExRate] = useState(1);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newProductNameCustom, setNewProductNameCustom] = useState("");
  const [newUsdPmt, setNewUsdPmt] = useState(0);
  const [newPurchase, setNewPurchase] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newTotalUsd, setNewTotalUsd] = useState(0);
  const [newMfg, setNewMfg] = useState("");
  const [newPort, setNewPort] = useState("");
  const [newPaymentTerms, setNewPaymentTerms] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [newStatus, setNewStatus] = useState<SalesLead["status"]>("New");
  const [newAssignedTo, setNewAssignedTo] = useState(activeUserId);
  const [newProducts, setNewProducts] = useState<NewProductItem[]>([
    { productNameCustom: "", usdPmt: 0, qty: 1 }
  ]);

  // ETA & ETD tracking states
  const [newEtd, setNewEtd] = useState("");
  const [newEta, setNewEta] = useState("");
  const [newEtaRemark, setNewEtaRemark] = useState("");

  // BE Details tracking states
  const [newBeFobCif, setNewBeFobCif] = useState<"FOB" | "CIF">("FOB");
  const [newBeFreightUsd, setNewBeFreightUsd] = useState<number | "">("");
  const [newBeInsuranceUsd, setNewBeInsuranceUsd] = useState<number | "">("");
  const [newBeNo, setNewBeNo] = useState("");
  const [newBeDate, setNewBeDate] = useState("");
  const [newBeBoeExRate, setNewBeBoeExRate] = useState<number | "">("");
  const [newBeQuery, setNewBeQuery] = useState("");
  const [newBeInvoiceNumber, setNewBeInvoiceNumber] = useState("");
  const [newBeInvoiceDate, setNewBeInvoiceDate] = useState("");
  const [newBeLotBatchNumber, setNewBeLotBatchNumber] = useState("");
  const [newBeBillOfLadingNo, setNewBeBillOfLadingNo] = useState("");
  const [newBeBillOfLadingDate, setNewBeBillOfLadingDate] = useState("");

  // Inner Add Client modal states
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [clientFullName, setClientFullName] = useState("");
  const [clientCompanyName, setClientCompanyName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientGst, setClientGst] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientPincode, setClientPincode] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientTeamName, setClientTeamName] = useState("");

  // Form states - Edit (New Import)
  const [editAolBranchName, setEditAolBranchName] = useState("");
  const [editIndentor, setEditIndentor] = useState("");
  const [editPiNo, setEditPiNo] = useState("");
  const [editPiDate, setEditPiDate] = useState("");
  const [editPiExRate, setEditPiExRate] = useState(1);
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editProductNameCustom, setEditProductNameCustom] = useState("");
  const [editUsdPmt, setEditUsdPmt] = useState(0);
  const [editPurchase, setEditPurchase] = useState("");
  const [editQty, setEditQty] = useState(1);
  const [editTotalUsd, setEditTotalUsd] = useState(0);
  const [editMfg, setEditMfg] = useState("");
  const [editPort, setEditPort] = useState("");
  const [editPaymentTerms, setEditPaymentTerms] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editStatus, setEditStatus] = useState<SalesLead["status"]>("New");
  const [editAssignedTo, setEditAssignedTo] = useState("");

  // Closed Won details - Add
  const [newPoNumber, setNewPoNumber] = useState("");
  const [newPoDate, setNewPoDate] = useState("");
  const [newFreightTerm, setNewFreightTerm] = useState("");
  const [newTransporterName, setNewTransporterName] = useState("");
  const [newDeliveryTerm, setNewDeliveryTerm] = useState("");
  const [newDestinationAddress, setNewDestinationAddress] = useState("");
  const [newDispatchDate, setNewDispatchDate] = useState("");
  const [newDispatchLocation, setNewDispatchLocation] = useState("");
  const [newWarehouseManagedBy, setNewWarehouseManagedBy] = useState("");
  const [newPoAttachmentUrl, setNewPoAttachmentUrl] = useState("");

  // Closed Won details - Edit
  const [editPoNumber, setEditPoNumber] = useState("");
  const [editPoDate, setEditPoDate] = useState("");
  const [editFreightTerm, setEditFreightTerm] = useState("");
  const [editTransporterName, setEditTransporterName] = useState("");
  const [editDeliveryTerm, setEditDeliveryTerm] = useState("");
  const [editDestinationAddress, setEditDestinationAddress] = useState("");
  const [editDispatchDate, setEditDispatchDate] = useState("");
  const [editDispatchLocation, setEditDispatchLocation] = useState("");
  const [editWarehouseManagedBy, setEditWarehouseManagedBy] = useState("");
  const [editPoAttachmentUrl, setEditPoAttachmentUrl] = useState("");

  // Collapsible Lead Row state
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  // LC Details states - Add
  const [newLcType, setNewLcType] = useState<"LC" | "NON LC">("LC");
  const [newLcAppSentToBank, setNewLcAppSentToBank] = useState("");
  const [newLcBankName, setNewLcBankName] = useState("");
  const [newLcNoRefNo, setNewLcNoRefNo] = useState("");
  const [newLcDate, setNewLcDate] = useState("");
  const [newLcUsanceAtSight, setNewLcUsanceAtSight] = useState<"Usance" | "At Sight">("Usance");
  const [newLcUsanceDays, setNewLcUsanceDays] = useState(0);
  const [newLcLatestShipmentDate, setNewLcLatestShipmentDate] = useState("");
  const [newLcExpiryDate, setNewLcExpiryDate] = useState("");
  const [newLcOpenExRate, setNewLcOpenExRate] = useState(1);

  // LC Details states - Edit
  const [editLcType, setEditLcType] = useState<"LC" | "NON LC">("LC");
  const [editLcAppSentToBank, setEditLcAppSentToBank] = useState("");
  const [editLcBankName, setEditLcBankName] = useState("");
  const [editLcNoRefNo, setEditLcNoRefNo] = useState("");
  const [editLcDate, setEditLcDate] = useState("");
  const [editLcUsanceAtSight, setEditLcUsanceAtSight] = useState<"Usance" | "At Sight">("Usance");
  const [editLcUsanceDays, setEditLcUsanceDays] = useState(0);
  const [editLcLatestShipmentDate, setEditLcLatestShipmentDate] = useState("");
  const [editLcExpiryDate, setEditLcExpiryDate] = useState("");
  const [editLcOpenExRate, setEditLcOpenExRate] = useState(1);

  // Helper to determine assignable team members
  // An active user can assign leads/tasks to themselves, or anyone in their hierarchical reporting tree
  const reportingIds = getReportingTreeUsers(activeUserId, users);
  const assignableUsers = [
    activeUser,
    ...users.filter((u) => reportingIds.includes(u.id)),
  ];

  // Filtering leads based on view permission + user filters
  const visibleLeads = leads.filter((lead) => {
    // 0. Procurement type check
    if (lead.procurementType === "domestic") return false;
    if (lead.importSubTab && lead.importSubTab !== "procurement") return false;

    // 1. Permission check
    if (!canViewLead(activeUserId, lead, users)) return false;

    // 2. Search query check (PI No, Supplier name, BE No, Client/Company name, Product name)
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (lead.clientName && lead.clientName.toLowerCase().includes(term)) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(term)) ||
      (lead.email && lead.email.toLowerCase().includes(term)) ||
      (lead.phone && lead.phone.includes(term)) ||
      (lead.piNo && lead.piNo.toLowerCase().includes(term)) ||
      (lead.supplierName && lead.supplierName.toLowerCase().includes(term)) ||
      (lead.beNo && lead.beNo.toLowerCase().includes(term)) ||
      (lead.deferredBeNo && lead.deferredBeNo.toLowerCase().includes(term)) ||
      (lead.beDetails && lead.beDetails.some((b) => b.beNo && b.beNo.toLowerCase().includes(term))) ||
      (lead.deferredDutyDetails && lead.deferredDutyDetails.some((d) => d.beNo && d.beNo.toLowerCase().includes(term))) ||
      (lead.productNameCustom && lead.productNameCustom.toLowerCase().includes(term));

    // 3. Status filter check
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;

    // 4. Product filter check
    const selectedProdObj = products.find((p) => p.id === projectFilter || p.name === projectFilter);
    const targetProdName = (selectedProdObj ? selectedProdObj.name : projectFilter).toLowerCase();

    const matchesProject =
      projectFilter === "All" ||
      lead.projectId === projectFilter ||
      (lead.productNameCustom && lead.productNameCustom.toLowerCase().includes(targetProdName)) ||
      (lead.beDetails && lead.beDetails.some((b) => b.productName && b.productName.toLowerCase().includes(targetProdName))) ||
      (lead.lcDetails && lead.lcDetails.some((l) => l.productName && l.productName.toLowerCase().includes(targetProdName)));

    // 5. Date filter check
    if (startDate || endDate) {
      let targetDate = "";
      if (dateFilterType === "pi") {
        targetDate = lead.piDate || "";
      } else {
        targetDate = lead.createdAt ? lead.createdAt.split("T")[0] : "";
      }
      if (!targetDate) return false;
      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;
    }

    return matchesSearch && matchesStatus && matchesProject;
  });

  const isFiltered = Boolean(
    searchTerm.trim() ||
      statusFilter !== "All" ||
      projectFilter !== "All" ||
      startDate ||
      endDate
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setProjectFilter("All");
    setStartDate("");
    setEndDate("");
  };

  // Metrics for summary footer
  const totalQty = visibleLeads.reduce((sum, l) => sum + (Number(l.qty || l.quantity) || 0), 0);
  const totalAmountUsd = visibleLeads.reduce((sum, l) => sum + (Number(l.totalUsd || l.amount || l.value) || 0), 0);
  const uniqueBranches = Array.from(new Set(visibleLeads.map((l) => l.aolBranchName).filter(Boolean))).length;
  const uniqueIndentors = Array.from(new Set(visibleLeads.map((l) => l.indentor || l.clientName).filter(Boolean))).length;
  const uniquePIs = Array.from(new Set(visibleLeads.map((l) => l.piNo).filter(Boolean))).length;
  const uniqueSuppliers = Array.from(new Set(visibleLeads.map((l) => l.supplierName || l.companyName).filter(Boolean))).length;
  const uniqueProducts = Array.from(new Set(visibleLeads.map((l) => l.productNameCustom).filter(Boolean))).length;

  const getCreatorName = (creatorId: string) => {
    return users.find((u) => u.id === creatorId)?.name || "Unknown User";
  };

  const getAssigneeName = (assigneeId: string) => {
    return users.find((u) => u.id === assigneeId)?.name || "Unassigned";
  };

  const currentProjectName = (projId: string) => {
    return products.find((p) => p.id === projId)?.name || "Independent Work";
  };

  const handleOpenAdd = () => {
    setNewAolBranchName("");
    setNewIndentor("");
    setNewPiNo("");
    setNewPiDate("");
    setNewPiExRate(1);
    setNewSupplierName("");
    setNewProductNameCustom("");
    setNewUsdPmt(0);
    setNewPurchase("");
    setNewQty(1);
    setNewTotalUsd(0);
    setNewMfg("");
    setNewPort("");
    setNewPaymentTerms("");
    setNewRemarks("");
    setNewStatus("New");
    setNewAssignedTo(activeUserId);

    // Reset Closed Won details
    setNewPoNumber("");
    setNewPoDate("");
    setNewFreightTerm("");
    setNewTransporterName("");
    setNewDeliveryTerm("");
    setNewDestinationAddress("");
    setNewDispatchDate("");
    setNewDispatchLocation("");
    setNewWarehouseManagedBy("");
    setNewPoAttachmentUrl("");

    // Reset LC details
    setNewLcType("LC");
    setNewLcAppSentToBank("");
    setNewLcBankName("");
    setNewLcNoRefNo("");
    setNewLcDate("");
    setNewLcUsanceAtSight("Usance");
    setNewLcUsanceDays(0);
    setNewLcLatestShipmentDate("");
    setNewLcExpiryDate("");
    setNewLcOpenExRate(1);

    // Reset ETA details
    setNewEtd("");
    setNewEta("");
    setNewEtaRemark("");

    // Reset BE details
    setNewBeFobCif("FOB");
    setNewBeFreightUsd("");
    setNewBeInsuranceUsd("");
    setNewBeNo("");
    setNewBeDate("");
    setNewBeBoeExRate("");
    setNewBeQuery("");
    setNewBeInvoiceNumber("");
    setNewBeInvoiceDate("");
    setNewBeLotBatchNumber("");
    setNewBeBillOfLadingNo("");
    setNewBeBillOfLadingDate("");

    setNewProducts([
      { productNameCustom: "", usdPmt: 0, qty: 1 }
    ]);

    setIsAddOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newProducts.length === 0) return;

    newProducts.forEach((prod) => {
      const amount = prod.qty * prod.usdPmt;
      
      onAddLead({
        clientName: newIndentor || "N/A",
        companyName: newSupplierName || "N/A",
        email: `${(newIndentor || "info").toLowerCase().replace(" ", ".")}@${(newSupplierName || "supplier").toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        phone: "+1 (555) 000-0000",
        status: newStatus,
        value: amount,
        quantity: prod.qty,
        rate: prod.usdPmt,
        amount: amount,
        projectId: "import-project",
        assignedToUserId: newAssignedTo,
        createdByUserId: activeUserId,
        notes: newRemarks,
        aolBranchName: newAolBranchName,
        indentor: newIndentor,
        piNo: newPiNo,
        piDate: newPiDate,
        piExRate: newPiExRate,
        supplierName: newSupplierName,
        productNameCustom: prod.productNameCustom || "N/A",
        usdPmt: prod.usdPmt,
        purchase: prod.qty.toString(),
        qty: prod.qty,
        totalUsd: amount,
        mfg: newMfg,
        port: newPort,
        paymentTerms: newPaymentTerms,
        remarks: newRemarks,
        closedWonDetails: newStatus === "Closed Won" ? {
          customerPoNumber: newPoNumber,
          poDate: newPoDate,
          freightTerm: newFreightTerm,
          transporterName: newTransporterName,
          deliveryTerm: newDeliveryTerm,
          destinationAddress: newDestinationAddress,
          dispatchDate: newDispatchDate,
          dispatchLocation: newDispatchLocation,
          warehouseManagedBy: newWarehouseManagedBy,
          poAttachmentUrl: newPoAttachmentUrl,
        } : undefined,
        procurementType: "import",
        importSubTab: "procurement",
        
        // LC Details fields
        lcType: newLcType,
        lcAppSentToBank: newLcAppSentToBank,
        lcBankName: newLcBankName,
        lcNoRefNo: newLcNoRefNo,
        lcDate: newLcDate,
        lcUsanceAtSight: newLcUsanceAtSight,
        lcUsanceDays: newLcUsanceDays,
        lcLatestShipmentDate: newLcLatestShipmentDate,
        lcExpiryDate: newLcExpiryDate,
        lcOpenExRate: newLcOpenExRate,

        // ETA Details fields
        etd: newEtd,
        eta: newEta,
        etaRemark: newEtaRemark,
        etaHistory: [],

        // BE Details fields
        beFobCif: newBeFobCif,
        beFreightUsd: newBeFreightUsd !== "" ? Number(newBeFreightUsd) : undefined,
        beInsuranceUsd: newBeInsuranceUsd !== "" ? Number(newBeInsuranceUsd) : undefined,
        beNo: newBeNo,
        beDate: newBeDate,
        beBoeExRate: newBeBoeExRate !== "" ? Number(newBeBoeExRate) : undefined,
        beQuery: newBeQuery,
        beInvoiceNumber: newBeInvoiceNumber,
        beInvoiceDate: newBeInvoiceDate,
        beLotBatchNumber: newBeLotBatchNumber,
        beBillOfLadingNo: newBeBillOfLadingNo,
        beBillOfLadingDate: newBeBillOfLadingDate,
      });
    });

    setIsAddOpen(false);
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFullName || !clientCompanyName || !onAddClient) return;

    onAddClient({
      fullName: clientFullName,
      companyName: clientCompanyName,
      email: clientEmail || `${clientFullName.toLowerCase().replace(" ", ".")}@${clientCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      phone: clientPhone || "+1 (555) 000-0000",
      gst: clientGst,
      city: clientCity,
      pincode: clientPincode,
      address: clientAddress,
      teamName: isExecutive ? (clientTeamName || undefined) : (activeUser.teamName || undefined),
    });

    // Automatically select the newly registered company & client name in the lead form!
    setNewSupplierName(clientCompanyName);
    setNewIndentor(clientFullName);

    // Reset states
    setClientFullName("");
    setClientCompanyName("");
    setClientEmail("");
    setClientPhone("");
    setClientGst("");
    setClientCity("");
    setClientPincode("");
    setClientAddress("");
    setClientTeamName("");
    setIsAddClientModalOpen(false);
  };

  const handleOpenEdit = (lead: SalesLead) => {
    if (!canEditLead(activeUserId, lead, users)) return;
    setEditingLead(lead);
    setEditAolBranchName(lead.aolBranchName || "");
    setEditIndentor(lead.indentor || lead.clientName || "");
    setEditPiNo(lead.piNo || "");
    setEditPiDate(lead.piDate || "");
    setEditPiExRate(lead.piExRate || 1);
    setEditSupplierName(lead.supplierName || lead.companyName || "");
    setEditProductNameCustom(lead.productNameCustom || "");
    setEditUsdPmt(lead.usdPmt || lead.rate || 0);
    setEditPurchase(lead.purchase || "");
    setEditQty(lead.qty || lead.quantity || 1);
    setEditTotalUsd(lead.totalUsd || (lead.qty || lead.quantity || 1) * (lead.usdPmt || lead.rate || 0));
    setEditMfg(lead.mfg || "");
    setEditPort(lead.port || "");
    setEditPaymentTerms(lead.paymentTerms || "");
    setEditRemarks(lead.remarks || lead.notes || "");
    setEditStatus(lead.status);
    setEditAssignedTo(lead.assignedToUserId);

    // Populate Closed Won details if they exist
    setEditPoNumber(lead.closedWonDetails?.customerPoNumber || "");
    setEditPoDate(lead.closedWonDetails?.poDate || "");
    setEditFreightTerm(lead.closedWonDetails?.freightTerm || "");
    setEditTransporterName(lead.closedWonDetails?.transporterName || "");
    setEditDeliveryTerm(lead.closedWonDetails?.deliveryTerm || "");
    setEditDestinationAddress(lead.closedWonDetails?.destinationAddress || "");
    setEditDispatchDate(lead.closedWonDetails?.dispatchDate || "");
    setEditDispatchLocation(lead.closedWonDetails?.dispatchLocation || "");
    setEditWarehouseManagedBy(lead.closedWonDetails?.warehouseManagedBy || "");
    setEditPoAttachmentUrl(lead.closedWonDetails?.poAttachmentUrl || "");

    // Populate LC details
    setEditLcType(lead.lcType || "LC");
    setEditLcAppSentToBank(lead.lcAppSentToBank || "");
    setEditLcBankName(lead.lcBankName || "");
    setEditLcNoRefNo(lead.lcNoRefNo || "");
    setEditLcDate(lead.lcDate || "");
    setEditLcUsanceAtSight(lead.lcUsanceAtSight || "Usance");
    setEditLcUsanceDays(lead.lcUsanceDays || 0);
    setEditLcLatestShipmentDate(lead.lcLatestShipmentDate || "");
    setEditLcExpiryDate(lead.lcExpiryDate || "");
    setEditLcOpenExRate(lead.lcOpenExRate || 1);

    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    const amount = editTotalUsd || (editQty * editUsdPmt);

    onEditLead({
      ...editingLead,
      clientName: editIndentor || "N/A",
      companyName: editSupplierName || "N/A",
      status: editStatus,
      value: amount,
      quantity: editQty,
      rate: editUsdPmt,
      amount: amount,
      assignedToUserId: editAssignedTo,
      notes: editRemarks,
      aolBranchName: editAolBranchName,
      indentor: editIndentor,
      piNo: editPiNo,
      piDate: editPiDate,
      piExRate: editPiExRate,
      supplierName: editSupplierName,
      productNameCustom: editProductNameCustom,
      usdPmt: editUsdPmt,
      purchase: editPurchase,
      qty: editQty,
      totalUsd: amount,
      mfg: editMfg,
      port: editPort,
      paymentTerms: editPaymentTerms,
      remarks: editRemarks,
      closedWonDetails: editStatus === "Closed Won" ? {
        customerPoNumber: editPoNumber,
        poDate: editPoDate,
        freightTerm: editFreightTerm,
        transporterName: editTransporterName,
        deliveryTerm: editDeliveryTerm,
        destinationAddress: editDestinationAddress,
        dispatchDate: editDispatchDate,
        dispatchLocation: editDispatchLocation,
        warehouseManagedBy: editWarehouseManagedBy,
        poAttachmentUrl: editPoAttachmentUrl,
      } : undefined,
      
      // LC Details fields
      lcType: editLcType,
      lcAppSentToBank: editLcAppSentToBank,
      lcBankName: editLcBankName,
      lcNoRefNo: editLcNoRefNo,
      lcDate: editLcDate,
      lcUsanceAtSight: editLcUsanceAtSight,
      lcUsanceDays: editLcUsanceDays,
      lcLatestShipmentDate: editLcLatestShipmentDate,
      lcExpiryDate: editLcExpiryDate,
      lcOpenExRate: editLcOpenExRate,
    });

    setIsEditOpen(false);
    setEditingLead(null);
  };

  return (
    <div className="space-y-2.5">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search by PI No, Supplier Name, BE No, Client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 py-1 w-full text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <Filter size={11} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Stages</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Won">Closed Won</option>
              <option value="Closed Lost">Closed Lost</option>
            </select>
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {Array.from(
                new Set([
                  ...leads.map((l) => l.productNameCustom).filter(Boolean) as string[],
                  ...leads.flatMap((l) => (l.beDetails || []).map((b) => b.productName)).filter(Boolean) as string[],
                  ...leads.flatMap((l) => (l.lcDetails || []).map((lc) => lc.productName)).filter(Boolean) as string[],
                ])
              )
                .filter((pName) => !products.some((prod) => prod.name === pName))
                .map((pName) => (
                  <option key={pName} value={pName}>
                    {pName}
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
              { label: "PI Date", value: "pi" },
              { label: "Created Date", value: "created" },
            ]}
            isOpen={isDateRangeModalOpen}
            onToggle={setIsDateRangeModalOpen}
            accentColor="emerald"
          />

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded font-semibold transition cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Add Lead button */}
        <button
          id="btn-add-lead"
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-all shadow-xs shrink-0"
        >
          <Plus size={13} />
          <span>New Import</span>
        </button>
      </div>

      {/* Leads Grid/Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        {visibleLeads.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-xs font-bold text-slate-700">No Permitted Leads Found</h4>
            <p className="text-[11px] max-w-sm mx-auto mt-0.5">
              Either matching parameters don't exist, or your hierarchical clearance limits viewing rights. Try switching user context.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-mono uppercase tracking-wider whitespace-nowrap">
                  <th className="py-2 px-3 pl-4 w-10 text-center font-bold"></th>
                  <th className="py-2 px-3 font-bold">AOL Branch Name</th>
                  <th className="py-2 px-2 font-bold">Indentor</th>
                  <th className="py-2 px-2 font-bold">PI Details</th>
                  <th className="py-2 px-2 font-bold">Supplier Name</th>
                  <th className="py-2 px-2 font-bold">Product Name</th>
                  <th className="py-2 px-2 font-bold">Pricing & Qty</th>
                  <th className="py-2 px-2 font-bold">Payment</th>
                  <th className="py-2 px-3 text-right font-bold pr-4">Auth Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleLeads.map((lead) => {
                  const editable = canEditLead(activeUserId, lead, users);
                  const deletable = canDeleteLead(activeUserId, lead, users);
                  const isExpanded = expandedLeadId === lead.id;
                  
                  // Ownership indicators
                  const isSelfCreated = lead.createdByUserId === activeUserId;
                  const isSelfAssigned = lead.assignedToUserId === activeUserId;
                  let ownershipLabel = "";
                  let ownershipStyle = "";
                  
                  if (isSelfCreated && isSelfAssigned) {
                    ownershipLabel = "Direct Owner";
                    ownershipStyle = "bg-teal-50 text-teal-700 border-teal-100";
                  } else if (isSelfCreated) {
                    ownershipLabel = "Created by Self";
                    ownershipStyle = "bg-blue-50 text-blue-700 border-blue-100";
                  } else if (isSelfAssigned) {
                    ownershipLabel = "Assigned to Self";
                    ownershipStyle = "bg-amber-50 text-amber-700 border-amber-100";
                  } else {
                    ownershipLabel = `Team: ${getCreatorName(lead.createdByUserId)}`;
                    ownershipStyle = "bg-purple-50 text-purple-700 border-purple-100";
                  }

                  return (
                    <React.Fragment key={lead.id}>
                      <tr className={`hover:bg-slate-50/50 transition-all font-medium text-slate-800 whitespace-nowrap ${isExpanded ? "bg-slate-100/40" : ""}`}>
                        {/* Toggle Collapse Column */}
                        <td className="py-2 px-3 pl-4 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                            className="text-slate-400 hover:text-slate-700 transition-all p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer flex items-center justify-center mx-auto"
                            title={isExpanded ? "Collapse Details" : "Expand Details (View/Edit LC Details)"}
                          >
                            {isExpanded ? <ChevronDown size={14} className="text-slate-600 font-bold" /> : <ChevronRight size={14} />}
                          </button>
                        </td>

                        {/* AOL Branch Name */}
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-700">{lead.aolBranchName || "Mumbai"}</span>
                        </td>

                        {/* INDENTOR */}
                        <td className="py-2 px-2">
                          <span className="text-slate-900 font-bold">{lead.indentor || lead.clientName || "N/A"}</span>
                        </td>

                        {/* PI Details (PI NO, PI DATE, PI Ex Rate) */}
                        <td className="py-2 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs font-mono">{lead.piNo || "N/A"}</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 leading-tight">
                              Date: {lead.piDate || "No Date"}<br />
                              Ex. Rate: {lead.piExRate !== undefined ? lead.piExRate : 1}
                            </span>
                          </div>
                        </td>

                        {/* SUPPLIER NAME */}
                        <td className="py-2 px-2">
                          <span className="text-slate-700">{lead.supplierName || lead.companyName || "N/A"}</span>
                        </td>

                        {/* PRODUCT NAME */}
                        <td className="py-2 px-2">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                            {lead.productNameCustom || currentProjectName(lead.projectId) || "N/A"}
                          </span>
                        </td>

                        {/* Pricing & Qty (Total USD, USD PMT, Qty) */}
                        <td className="py-2 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 font-mono text-xs">
                              ${(lead.totalUsd !== undefined ? lead.totalUsd : (lead.amount || 0)).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 leading-tight">
                              Qty: {lead.qty !== undefined ? lead.qty : (lead.quantity || 0)}<br />
                              Rate: ${(lead.usdPmt !== undefined ? lead.usdPmt : (lead.rate || 0)).toLocaleString()}
                            </span>
                          </div>
                        </td>

                        {/* Payment (Payment Terms bold & on top, Port & MFG smaller font below) */}
                        <td className="py-2 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs">{lead.paymentTerms || "N/A"}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              Port: {lead.port || "N/A"} | MFG: {lead.mfg || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Edit & Delete Action indicators and controls */}
                        <td className="py-2 px-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit logic */}
                            {editable ? (
                              <button
                                id={`edit-lead-${lead.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(lead);
                                }}
                                title="Edit Lead (Authorized)"
                                className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-1 rounded border border-amber-200 transition-all cursor-pointer"
                              >
                                <Edit2 size={12} />
                              </button>
                            ) : (
                              <button
                                disabled
                                title={`Unauthorized parameters! Creator (${getCreatorName(lead.createdByUserId)}) required.`}
                                className="text-slate-350 bg-slate-50 p-1 rounded border border-slate-100 cursor-not-allowed"
                              >
                                <Edit2 size={12} className="opacity-45" />
                              </button>
                            )}

                            {/* Delete logic */}
                            {deletable ? (
                              <button
                                id={`delete-lead-${lead.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLead(lead.id);
                                }}
                                title="Delete Lead (Authorized - Manager)"
                                className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1 rounded border border-rose-200 transition-all cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Delete forbidden. Requires Manager role."
                                className="text-slate-300 bg-slate-50 p-1 rounded border border-slate-100 cursor-not-allowed"
                              >
                                <Trash2 size={11} className="opacity-45" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="p-4 bg-slate-100/50">
                            <LeadLcDetailsRow
                              lead={lead}
                              users={users}
                              onEditLead={onEditLead}
                              onClose={() => setExpandedLeadId(null)}
                              leads={leads}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {visibleLeads.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                  <tr>
                    <td className="py-3.5 px-3 pl-4 text-center">—</td>
                    <td className="py-3.5 px-3 font-mono">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                        <span>{isFiltered ? "FILTERED TOTAL" : "TOTAL"}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                          {visibleLeads.length} {visibleLeads.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{uniqueBranches} Branches</span>
                    </td>
                    <td className="py-3.5 px-2 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueIndentors} Indentors</span>
                    </td>
                    <td className="py-3.5 px-2 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniquePIs} PIs</span>
                    </td>
                    <td className="py-3.5 px-2 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueSuppliers} Suppliers</span>
                    </td>
                    <td className="py-3.5 px-2 font-mono">
                      <span className="text-[11px] text-slate-300 block">{uniqueProducts} Products</span>
                    </td>
                    <td className="py-3.5 px-2 font-mono">
                      <div className="font-extrabold text-emerald-400 block text-xs">
                        Qty: {totalQty.toLocaleString("en-IN")}
                      </div>
                      <div className="font-extrabold text-emerald-300 block text-xs mt-0.5">
                        ${totalAmountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-center">—</td>
                    <td className="py-3.5 px-3 text-right pr-4">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Add Lead Modal Overlay */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2">
                  <Plus size={18} /> New Import
                </h3>
                <p className="text-xs text-emerald-200 mt-1">Creating import lead as {activeUser.name} ({activeUser.accessLevel} clearance)</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-emerald-100 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AOL Branch Name */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">AOL Branch Name *</label>
                  <select
                    required
                    value={newAolBranchName}
                    onChange={(e) => setNewAolBranchName(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  >
                    <option value="">-- Select Branch --</option>
                    {aolBranchOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* INDENTOR */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">INDENTOR *</label>
                  <input
                    type="text"
                    required
                    value={newIndentor}
                    onChange={(e) => setNewIndentor(e.target.value)}
                    placeholder="e.g. Indentor Name"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PI NO */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PI NO *</label>
                  <input
                    type="text"
                    required
                    value={newPiNo}
                    onChange={(e) => setNewPiNo(e.target.value)}
                    placeholder="e.g. PI-12345"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PI DATE */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PI DATE *</label>
                  <input
                    type="date"
                    required
                    value={newPiDate}
                    onChange={(e) => setNewPiDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PI Ex Rate */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PI Ex Rate *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newPiExRate}
                    onChange={(e) => setNewPiExRate(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>

                {/* SUPPLIER NAME */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">SUPPLIER NAME *</label>
                  <select
                    required
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  >
                    <option value="">-- Select Supplier --</option>
                    {supplierOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Multiple Products section */}
                <div className="col-span-1 sm:col-span-2 border-t border-b border-slate-100 py-4 my-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <span>Products Details *</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold font-mono">
                        {newProducts.length}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setNewProducts([...newProducts, { productNameCustom: "", usdPmt: 0, qty: 1 }])}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Product
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {newProducts.map((prod, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-3">
                        {newProducts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newProducts];
                              updated.splice(index, 1);
                              setNewProducts(updated);
                            }}
                            className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition-all cursor-pointer"
                            title="Remove Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                          {/* PRODUCT NAME */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono">PRODUCT NAME *</label>
                            <select
                              required
                              value={prod.productNameCustom}
                              onChange={(e) => {
                                const updated = [...newProducts];
                                updated[index].productNameCustom = e.target.value;
                                setNewProducts(updated);
                              }}
                              className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                            >
                              <option value="">-- Select Product --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                              {products.length === 0 && (
                                <>
                                  <option value="Chemical A">Chemical A</option>
                                  <option value="Polymer B">Polymer B</option>
                                  <option value="Raw Material C">Raw Material C</option>
                                </>
                              )}
                            </select>
                          </div>

                          {/* USD PMT */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono">USD PMT ($) *</label>
                            <input
                              type="number"
                              step="any"
                              required
                              value={prod.usdPmt || ""}
                              onChange={(e) => {
                                const updated = [...newProducts];
                                updated[index].usdPmt = Number(e.target.value);
                                setNewProducts(updated);
                              }}
                              className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono font-bold"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Purchase Qty */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono">Purchase Qty *</label>
                            <input
                              type="number"
                              required
                              value={prod.qty || ""}
                              onChange={(e) => {
                                const updated = [...newProducts];
                                updated[index].qty = Number(e.target.value);
                                setNewProducts(updated);
                              }}
                              className="w-full text-xs border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono font-bold"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Total USD */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-mono">Total USD ($)</label>
                            <div className="w-full text-xs border border-slate-200 bg-slate-100/50 px-2.5 py-1.5 rounded-lg text-slate-600 font-mono font-bold flex items-center h-[30px]">
                              ${((prod.qty || 0) * (prod.usdPmt || 0)).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MFG */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">MFG *</label>
                  <input
                    type="text"
                    required
                    value={newMfg}
                    onChange={(e) => setNewMfg(e.target.value)}
                    placeholder="e.g. Manufacturer Name"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PORT */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PORT *</label>
                  <input
                    type="text"
                    required
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    placeholder="e.g. Nhava Sheva"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Payment Terms *</label>
                  <input
                    type="text"
                    required
                    value={newPaymentTerms}
                    onChange={(e) => setNewPaymentTerms(e.target.value)}
                    placeholder="e.g. 90 Days LC"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Assignment */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Assign Lead To</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                >
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional ETA/ETD Setup */}
              <div className="border-t border-slate-100 pt-4 mt-3 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                  ETA (Estimated Time of Arrival) Initial Setup (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Initial ETD (Departure)</label>
                    <input
                      type="date"
                      value={newEtd}
                      onChange={(e) => setNewEtd(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Initial ETA (Arrival)</label>
                    <input
                      type="date"
                      value={newEta}
                      onChange={(e) => setNewEta(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">ETA Status Remark</label>
                    <input
                      type="text"
                      placeholder="e.g. Sailing on scheduled vessel, waiting transshipment"
                      value={newEtaRemark}
                      onChange={(e) => setNewEtaRemark(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Optional BE Setup */}
              <div className="border-t border-slate-100 pt-4 mt-3 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                  BE (Bill of Entry) Initial Setup (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* FOB / CIF */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">FOB / CIF</label>
                    <select
                      value={newBeFobCif}
                      onChange={(e) => {
                        const val = e.target.value as "FOB" | "CIF";
                        setNewBeFobCif(val);
                        if (val === "CIF") {
                          setNewBeFreightUsd("");
                          setNewBeInsuranceUsd("");
                        }
                      }}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    >
                      <option value="FOB">FOB</option>
                      <option value="CIF">CIF</option>
                    </select>
                  </div>

                  {/* Freight USD */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-500 block uppercase font-mono">Freight USD</label>
                      {newBeFobCif === "CIF" && <span className="text-[9px] text-amber-600 bg-amber-50 px-1 py-0.2 rounded font-mono">Read Only (CIF)</span>}
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder={newBeFobCif === "CIF" ? "N/A" : "Enter Freight amount"}
                      disabled={newBeFobCif === "CIF"}
                      value={newBeFreightUsd}
                      onChange={(e) => setNewBeFreightUsd(e.target.value !== "" ? Number(e.target.value) : "")}
                      className={`w-full text-sm border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 ${
                        newBeFobCif === "CIF" ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white"
                      }`}
                    />
                  </div>

                  {/* Insurence USD */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-500 block uppercase font-mono">Insurence USD</label>
                      {newBeFobCif === "CIF" && <span className="text-[9px] text-amber-600 bg-amber-50 px-1 py-0.2 rounded font-mono">Read Only (CIF)</span>}
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder={newBeFobCif === "CIF" ? "N/A" : "Enter Insurance amount"}
                      disabled={newBeFobCif === "CIF"}
                      value={newBeInsuranceUsd}
                      onChange={(e) => setNewBeInsuranceUsd(e.target.value !== "" ? Number(e.target.value) : "")}
                      className={`w-full text-sm border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 ${
                        newBeFobCif === "CIF" ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white"
                      }`}
                    />
                  </div>

                  {/* BE NO */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">BE NO</label>
                    <input
                      type="text"
                      placeholder="BE Number"
                      value={newBeNo}
                      onChange={(e) => setNewBeNo(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* BE DATE */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">BE DATE</label>
                    <input
                      type="date"
                      value={newBeDate}
                      onChange={(e) => setNewBeDate(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                    />
                  </div>

                  {/* BOE Ex Rate */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">BOE Ex Rate</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Exchange Rate"
                      value={newBeBoeExRate}
                      onChange={(e) => setNewBeBoeExRate(e.target.value !== "" ? Number(e.target.value) : "")}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Invoice Number</label>
                    <input
                      type="text"
                      placeholder="Invoice #"
                      value={newBeInvoiceNumber}
                      onChange={(e) => setNewBeInvoiceNumber(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* Invoice Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Invoice Date</label>
                    <input
                      type="date"
                      value={newBeInvoiceDate}
                      onChange={(e) => setNewBeInvoiceDate(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                    />
                  </div>

                  {/* Lot / Batch Number */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Lot / Batch Number</label>
                    <input
                      type="text"
                      placeholder="Lot/Batch #"
                      value={newBeLotBatchNumber}
                      onChange={(e) => setNewBeLotBatchNumber(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* BILL OF LADING NO */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">BILL OF LADING NO</label>
                    <input
                      type="text"
                      placeholder="B/L Number"
                      value={newBeBillOfLadingNo}
                      onChange={(e) => setNewBeBillOfLadingNo(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>

                  {/* BILL OF LADING Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">BILL OF LADING Date</label>
                    <input
                      type="date"
                      value={newBeBillOfLadingDate}
                      onChange={(e) => setNewBeBillOfLadingDate(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                    />
                  </div>

                  {/* BE Query */}
                  <div className="col-span-1 sm:col-span-2 md:col-span-3">
                    <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">BE Query</label>
                    <input
                      type="text"
                      placeholder="Insert BE queries or status notes..."
                      value={newBeQuery}
                      onChange={(e) => setNewBeQuery(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Remarks</label>
                <textarea
                  placeholder="Insert additional comments or remarks..."
                  rows={2}
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                ></textarea>
              </div>

              {/* Closed Won Details Section - Add */}
              {newStatus === "Closed Won" && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4 mt-2 animate-fade-in">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase font-mono border-b border-emerald-100 pb-2 flex items-center gap-2">
                    <Check size={14} /> Closed Won (Order Details)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Customer PO Number *</label>
                      <input
                        type="text"
                        required
                        value={newPoNumber}
                        onChange={(e) => setNewPoNumber(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">PO Date *</label>
                      <input
                        type="date"
                        required
                        value={newPoDate}
                        onChange={(e) => setNewPoDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Freight Term</label>
                      <input
                        type="text"
                        value={newFreightTerm}
                        onChange={(e) => setNewFreightTerm(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Transporter Name</label>
                      <input
                        type="text"
                        value={newTransporterName}
                        onChange={(e) => setNewTransporterName(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Delivery / Booking Term</label>
                      <input
                        type="text"
                        value={newDeliveryTerm}
                        onChange={(e) => setNewDeliveryTerm(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Warehouse Managed By</label>
                      <input
                        type="text"
                        value={newWarehouseManagedBy}
                        onChange={(e) => setNewWarehouseManagedBy(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Destination Delivery Address</label>
                    <textarea
                      rows={2}
                      value={newDestinationAddress}
                      onChange={(e) => setNewDestinationAddress(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Dispatch Date</label>
                      <input
                        type="date"
                        value={newDispatchDate}
                        onChange={(e) => setNewDispatchDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Dispatch Location</label>
                      <input
                        type="text"
                        value={newDispatchLocation}
                        onChange={(e) => setNewDispatchLocation(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Attach PO (URL)</label>
                    <input
                      type="text"
                      placeholder="Enter PO document link..."
                      value={newPoAttachmentUrl}
                      onChange={(e) => setNewPoAttachmentUrl(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow"
                >
                  Confirm & Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal Overlay */}
      {isEditOpen && editingLead && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-amber-950 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2">
                  <Edit2 size={18} /> Modify Import Details
                </h3>
                <p className="text-xs text-amber-200 mt-1">Editing as {activeUser.name} ({activeUser.accessLevel} scope)</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-amber-100 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AOL Branch Name */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">AOL Branch Name *</label>
                  <select
                    required
                    value={editAolBranchName}
                    onChange={(e) => setEditAolBranchName(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                  >
                    <option value="">-- Select Branch --</option>
                    {aolBranchOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* INDENTOR */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">INDENTOR *</label>
                  <input
                    type="text"
                    required
                    value={editIndentor}
                    onChange={(e) => setEditIndentor(e.target.value)}
                    placeholder="e.g. Indentor Name"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PI NO */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PI NO *</label>
                  <input
                    type="text"
                    required
                    value={editPiNo}
                    onChange={(e) => setEditPiNo(e.target.value)}
                    placeholder="e.g. PI-12345"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PI DATE */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PI DATE *</label>
                  <input
                    type="date"
                    required
                    value={editPiDate}
                    onChange={(e) => setEditPiDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PI Ex Rate */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PI Ex Rate *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editPiExRate}
                    onChange={(e) => setEditPiExRate(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>

                {/* SUPPLIER NAME */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">SUPPLIER NAME *</label>
                  <select
                    required
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                  >
                    <option value="">-- Select Supplier --</option>
                    {supplierOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* PRODUCT NAME */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PRODUCT NAME *</label>
                  <select
                    required
                    value={editProductNameCustom}
                    onChange={(e) => setEditProductNameCustom(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    {products.length === 0 && (
                      <>
                        <option value="Chemical A">Chemical A</option>
                        <option value="Polymer B">Polymer B</option>
                        <option value="Raw Material C">Raw Material C</option>
                      </>
                    )}
                  </select>
                </div>

                {/* USD PMT */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">USD PMT ($) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editUsdPmt}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditUsdPmt(val);
                      setEditTotalUsd(val * editQty);
                    }}
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>

                {/* Purchase Qty */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Purchase Qty *</label>
                  <input
                    type="number"
                    required
                    value={editQty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditQty(val);
                      setEditPurchase(val.toString());
                      setEditTotalUsd(val * editUsdPmt);
                    }}
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>

                {/* Total USD */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase font-mono">Total USD ($)</label>
                  <div className="w-full text-sm border border-slate-200 bg-slate-100 px-3 py-2 rounded-xl text-slate-700 font-mono font-bold flex items-center h-[38px]">
                    ${(editQty * editUsdPmt).toLocaleString()}
                  </div>
                </div>

                {/* MFG */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">MFG *</label>
                  <input
                    type="text"
                    required
                    value={editMfg}
                    onChange={(e) => setEditMfg(e.target.value)}
                    placeholder="e.g. Manufacturer Name"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* PORT */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">PORT *</label>
                  <input
                    type="text"
                    required
                    value={editPort}
                    onChange={(e) => setEditPort(e.target.value)}
                    placeholder="e.g. Nhava Sheva"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Payment Terms *</label>
                  <input
                    type="text"
                    required
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(e.target.value)}
                    placeholder="e.g. 90 Days LC"
                    className="w-full text-sm border border-slate-200 bg-white px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Status & Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Pipeline Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as SalesLead["status"])}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Reassigned Owner</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                  >
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Remarks</label>
                <textarea
                  placeholder="Insert additional comments or remarks..."
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                ></textarea>
              </div>

              {/* Closed Won Details Section - Edit */}
              {editStatus === "Closed Won" && (
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-4 mt-2 animate-fade-in">
                  <h4 className="text-xs font-bold text-amber-800 uppercase font-mono border-b border-amber-100 pb-2 flex items-center gap-2">
                    <Check size={14} /> Closed Won (Order Details)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Customer PO Number *</label>
                      <input
                        type="text"
                        required
                        value={editPoNumber}
                        onChange={(e) => setEditPoNumber(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">PO Date *</label>
                      <input
                        type="date"
                        required
                        value={editPoDate}
                        onChange={(e) => setEditPoDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Freight Term</label>
                      <input
                        type="text"
                        value={editFreightTerm}
                        onChange={(e) => setEditFreightTerm(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Transporter Name</label>
                      <input
                        type="text"
                        value={editTransporterName}
                        onChange={(e) => setEditTransporterName(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Delivery / Booking Term</label>
                      <input
                        type="text"
                        value={editDeliveryTerm}
                        onChange={(e) => setEditDeliveryTerm(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Warehouse Managed By</label>
                      <input
                        type="text"
                        value={editWarehouseManagedBy}
                        onChange={(e) => setEditWarehouseManagedBy(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Destination Delivery Address</label>
                    <textarea
                      rows={2}
                      value={editDestinationAddress}
                      onChange={(e) => setEditDestinationAddress(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Dispatch Date</label>
                      <input
                        type="date"
                        value={editDispatchDate}
                        onChange={(e) => setEditDispatchDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Dispatch Location</label>
                      <input
                        type="text"
                        value={editDispatchLocation}
                        onChange={(e) => setEditDispatchLocation(e.target.value)}
                        className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono tracking-tight">Attach PO (URL)</label>
                    <input
                      type="text"
                      placeholder="Enter PO document link..."
                      value={editPoAttachmentUrl}
                      onChange={(e) => setEditPoAttachmentUrl(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 text-sm font-semibold rounded-xl"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ADD CLIENT DIRECTORY MODAL
         ---------------------------------------------------- */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2">
                  <Building2 size={18} /> Register Client Directory Entry
                </h3>
                <p className="text-xs text-emerald-200 mt-1">Populate organizational client details for instant Lead generation</p>
              </div>
              <button onClick={() => setIsAddClientModalOpen(false)} className="text-emerald-100 hover:text-white transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Richard Hendricks"
                    value={clientFullName}
                    onChange={(e) => setClientFullName(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pied Piper"
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. richard@piedpiper.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">GST Identification (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={clientGst}
                    onChange={(e) => setClientGst(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">City (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Pincode (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 400001"
                    value={clientPincode}
                    onChange={(e) => setClientPincode(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Associated Team {isExecutive ? "(Optional)" : ""}</label>
                <select
                  value={isExecutive ? clientTeamName : (activeUser.teamName || "")}
                  onChange={(e) => isExecutive && setClientTeamName(e.target.value)}
                  disabled={!isExecutive}
                  className={`w-full text-sm border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 outline-none ${
                    isExecutive
                      ? "bg-slate-50 text-slate-800 cursor-pointer focus:ring-emerald-500"
                      : "bg-slate-100 text-slate-500 cursor-not-allowed select-none font-medium"
                  }`}
                >
                  {isExecutive ? (
                    <>
                      <option value="">Select Team (or leave Unassigned)</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={activeUser.teamName || ""}>
                      {activeUser.teamName || "Unassigned"} (Auto-assigned)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Full Billing Address</label>
                <textarea
                  placeholder="Insert client street, building and office numbers..."
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-150 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={16} /> Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
