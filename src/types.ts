/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Role {
  Admin = "Admin",
  SeniorManager = "Senior Manager",
  Manager = "Manager",
  TeamLead = "Team Lead",
  User = "User",
}

export enum AccessLevel {
  Editor = "Editor", // Add, View, Edit (Only self created)
  Contributor = "Contributor", // Add, View, Edit (self and its team)
  Manager = "Manager", // View, Edit, Delete (for all)
}

export type UserStatus = "active" | "pending" | "disabled";

export interface User {
  id: string;
  name: string;
  role: Role;
  accessLevel: AccessLevel;
  reportsTo?: string; // ID of the user they report to
  teamName: string;
  email: string;
  avatarUrl?: string;
  targetQuota: number; // Monthly sales quota
  status?: UserStatus;
  requestedAt?: string;
}

export interface ClosedWonDetails {
  customerPoNumber: string;
  poDate: string;
  freightTerm: string;
  freightChargedInBill?: string;
  freightCostToAol?: string;
  cartageLabourCharges?: string;
  transporterName: string;
  deliveryTerm: string;
  destinationAddress: string;
  dispatchDate: string;
  dispatchLocation: string;
  warehouseManagedBy: string;
  poAttachmentUrl?: string;
}

export interface SalesLead {
  id: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  status: "New" | "Contacted" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  value: number; // Deal value
  quantity: number;
  rate: number;
  amount: number;
  assignedToUserId: string;
  createdByUserId: string;
  projectId: string; // Belongs to a workflow project
  notes: string;
  createdAt: string;
  closedWonDetails?: ClosedWonDetails;
  procurementType?: "import" | "domestic" | "sales_st";
  importSubTab?: "procurement" | "clearing" | "payments" | "tpti" | "reports";
  domesticSubTab?: "procurement" | "payments" | "tptd" | "reports";
  salesStSubTab?: "sales" | "st" | "reports";

  // New import-specific fields
  aolBranchName?: string;
  indentor?: string;
  piNo?: string;
  piDate?: string;
  piExRate?: number;
  supplierName?: string;
  productNameCustom?: string;
  usdPmt?: number;
  purchase?: string;
  qty?: number;
  totalUsd?: number;
  mfg?: string;
  port?: string;
  paymentTerms?: string;
  remarks?: string;

  // LC Details fields
  lcType?: "LC" | "NON LC";
  lcAppSentToBank?: string;
  lcBankName?: string;
  lcNoRefNo?: string;
  lcDate?: string;
  lcUsanceAtSight?: "Usance" | "At Sight";
  lcUsanceDays?: number;
  lcLatestShipmentDate?: string;
  lcExpiryDate?: string;
  lcOpenExRate?: number;

  // ETA & ETD tracking fields
  etd?: string;
  eta?: string;
  etaRemark?: string;
  etaHistory?: Array<{
    id: string;
    etd: string;
    eta: string;
    remark: string;
    updatedAt: string;
  }>;

  // BE Details tracking fields
  beFobCif?: "FOB" | "CIF";
  beFreightUsd?: number;
  beInsuranceUsd?: number;
  beNo?: string;
  beDate?: string;
  beBoeExRate?: number;
  beQuery?: string;
  beInvoiceNumber?: string;
  beInvoiceDate?: string;
  beLotBatchNumber?: string;
  beBillOfLadingNo?: string;
  beBillOfLadingDate?: string;

  // Container Details fields
  containerProductName?: string;
  containerNo?: string;
  containerSize?: string;
  containerQty?: number;
  containerRemark?: string;

  // IGM & Item fields
  igmContainerNo?: string;
  igmNoDt?: string;
  igmItemNo?: string;
  igmChaSelfJobNo?: string;
  igmFinalInwardDate?: string;
  igmContainerGatedIn?: string;
  igmCfsLastDate?: string;
  igmMaterialMovedOutOfCfs?: string;
  igmFreeEmptyCtnrDetentionLastDt?: string;
  igmStatusRemark?: string;
  igmDuty?: string;
  igmShpLine?: string;
  igmStampDuty?: string;
  igmDo?: string;
  igmCfs?: string;
  igmOocStatus?: string;

  // DEFERRED DUTY fields
  deferredBeNo?: string;
  deferredBeStatus?: string;
  deferredDuty?: string;
  deferredDutyAmt?: number;
  deferredPaymentDueDate?: string;
  deferredStampDutyAmount?: number;
  deferredStampDutyDate?: string;
  deferredStatusRemark?: string;

  // Multiple containers, IGM, LC, ETA, BE, Deferred Duty support
  containers?: ContainerDetail[];
  igmDetails?: IgmDetail[];
  lcDetail?: LcDetail;
  etaDetail?: EtaDetail;
  beDetail?: BeDetail;
  lcDetails?: LcDetail[];
  etaDetails?: EtaDetail[];
  beDetails?: BeDetail[];
  deferredDutyDetails?: DeferredDutyDetail[];
}

export interface DeferredDutyDetail {
  id: string;
  beNo: string;
  deferredBeStatus?: string;
  deferredDuty?: string;
  deferredDutyAmt?: number;
  deferredPaymentDueDate?: string;
  deferredStampDutyAmount?: number;
  deferredStampDutyDate?: string;
  deferredStatusRemark?: string;
}

export interface ContainerDetail {
  id: string;
  productName: string;
  containerNo: string;
  containerSize: string;
  containerQty: number;
  containerRemark: string;
}

export interface LcDetail {
  id: string;
  productName: string;
  lcType: "LC" | "NON LC";
  lcAppSentToBank: string;
  lcBankName: string;
  lcNoRefNo: string;
  lcDate: string;
  lcUsanceAtSight: "Usance" | "At Sight";
  lcUsanceDays: number;
  lcLatestShipmentDate: string;
  lcExpiryDate: string;
  lcOpenExRate: number;
}

export interface EtaDetail {
  id: string;
  productName: string;
  etd: string;
  eta: string;
  etaRemark: string;
  etaHistory?: Array<{ id: string; etd: string; eta: string; remark: string; updatedAt: string }>;
}

export interface BeDetail {
  id: string;
  productName: string;
  beFobCif: "FOB" | "CIF";
  beFreightUsd?: number;
  beInsuranceUsd?: number;
  beNo: string;
  beDate: string;
  beBoeExRate?: number;
  beQuery: string;
  beInvoiceNumber: string;
  beInvoiceDate: string;
  beLotBatchNumber: string;
  beBillOfLadingNo: string;
  beBillOfLadingDate: string;
}

export interface IgmDetail {
  id: string;
  containerNo: string;
  igmNoDt: string;
  igmItemNo: string;
  igmChaSelfJobNo: string;
  igmFinalInwardDate: string;
  igmContainerGatedIn: string;
  igmCfsLastDate: string;
  igmMaterialMovedOutOfCfs: string;
  igmFreeEmptyCtnrDetentionLastDt: string;
  igmDuty: string;
  igmShpLine: string;
  igmStampDuty: string;
  igmDo: string;
  igmCfs: string;
  igmOocStatus: string;
  igmStatusRemark: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PaymentBank {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  address: string;
  createdAt: string;
}

export interface BillingDetails {
  invoiceNumber: string;
  invoiceFileUrl?: string;
  invoiceFileName?: string;
  mappedAt?: string;
}

export interface OrderOffer {
  id: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  status: "New" | "Contacted" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  totalValue: number;
  items: OrderItem[];
  payment: string;
  paymentBankId?: string;
  delivery: string;
  otherTerms: string;
  assignedToUserId: string;
  createdByUserId: string;
  notes: string;
  createdAt: string;
  closedWonDetails?: ClosedWonDetails;
  billingDetails?: BillingDetails;
}

export interface ProjectWorkflow {
  id: string;
  name: string;
  description: string;
  status: "Planning" | "Active" | "Completed" | "On Hold";
  clientName: string;
  leadsCount: number;
}

export interface SalesTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Review" | "Completed";
  assignedToUserId: string;
  createdByUserId: string;
  projectId: string;
  leadId?: string; // Optional related lead
}

// Action log to show transparency of modifications
export interface ActionLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  actionType: "Create Lead" | "Edit Lead" | "Delete Lead" | "Update Lead" | "Create Task" | "Edit Task" | "Delete Task" | "Edit User" | "Delete User" | "Create Product" | "Edit Product" | "Delete Product" | "Bulk Import Products" | "Create Order" | "Edit Order" | "Delete Order" | "Create Category" | "Delete Category" | "Create Group" | "Delete Group" | "Create Manufacturer" | "Delete Manufacturer" | "Create Freight Term" | "Delete Freight Term" | "Create Transporter" | "Delete Transporter" | "Map Invoice" | "Update Invoice" | "Update Order Status" | "Map Customer PO" | "Update Google Drive Settings" | "Create Email Template" | "Update Email Template" | "Delete Email Template" | "Send Email" | "Create Domestic PD" | "Edit Domestic PD" | "Delete Domestic PD" | "Create Domestic TPT-D" | "Edit Domestic TPT-D" | "Delete Domestic TPT-D" | "Create Import TPT-I" | "Edit Import TPT-I" | "Delete Import TPT-I" | "Create Import CI" | "Edit Import CI" | "Delete Import CI" | "Edit PID Record" | "Create Accounts ST" | "Edit Accounts ST" | "Delete Accounts ST" | "Create Opening Stock" | "Edit Opening Stock" | "Delete Opening Stock" | "Bulk Import Opening Stock" | "Create Accounts Sales" | "Edit Accounts Sales" | "Delete Accounts Sales" | "Create Accounts Druming" | "Edit Accounts Druming" | "Delete Accounts Druming" | "Create Expense Ledger" | "Edit Expense Ledger" | "Delete Expense Ledger" | "Create Accounts Office Exp" | "Edit Accounts Office Exp" | "Delete Accounts Office Exp" | "Create Accounts MEIS" | "Edit Accounts MEIS" | "Delete Accounts MEIS" | "Create Other Income Ledger" | "Edit Other Income Ledger" | "Delete Other Income Ledger" | "Create Accounts Other Income" | "Edit Accounts Other Income" | "Delete Accounts Other Income" | "Create Accounts FDR" | "Edit Accounts FDR" | "Delete Accounts FDR" | "Create Accounts CSD & ISD" | "Edit Accounts CSD & ISD" | "Delete Accounts CSD & ISD" | "Create Accounts TPT-S" | "Edit Accounts TPT-S" | "Delete Accounts TPT-S" | "Create Ledger CR DR" | "Edit Ledger CR DR" | "Delete Ledger CR DR" | "Create Supplier CR/DR Note" | "Edit Supplier CR/DR Note" | "Delete Supplier CR/DR Note" | "Create Customer CR/DR Note" | "Edit Customer CR/DR Note" | "Delete Customer CR/DR Note";
  targetType: "Lead" | "Task" | "User" | "Product" | "Order" | "Category" | "Group" | "Manufacturer" | "Freight Term" | "Transporter" | "Settings" | "EmailTemplate" | "Domestic PD" | "Domestic TPT-D" | "Import TPT-I" | "Import CI" | "PID Record" | "Accounts ST" | "Opening Stock" | "Accounts Sales" | "Accounts Druming" | "Expense Ledger" | "Accounts Office Exp" | "Accounts MEIS" | "Other Income Ledger" | "Accounts Other Income" | "Accounts FDR" | "Accounts CSD & ISD" | "Accounts TPT-S" | "Ledger CR DR" | "Supplier CR/DR Note" | "Customer CR/DR Note";
  targetId: string;
  targetName: string;
  details: string;
}

export interface TeamTabSettings {
  id: string; // Document ID (usually the lowercase slugified teamName)
  teamName: string; // The team name like "SME West Coast"
  visibleTabs: string[]; // List of tab IDs like ["dashboard", "leads", "workflows", "products"]
  visibleSubTabs?: { [key: string]: string[] }; // Optional map of tab ID to visible sub-tab IDs
  visibleSubSubTabs?: { [key: string]: { [key: string]: string[] } }; // Optional map of tab ID to (subTab ID to visible subSubTab IDs)
  permissions?: { [key: string]: { view: boolean; add: boolean; edit: boolean } }; // Optional map of tab or tab/subTab to its View, Add, Edit permissions
}

export interface Client {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  gst: string;
  city: string;
  pincode: string;
  address: string;
  createdAt: string;
  createdByUserId?: string;
  assignedToUserId?: string;
  teamName?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProductGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  createdAt: string;
}

export interface FreightTerm {
  id: string;
  name: string;
  createdAt: string;
}

export interface TransporterName {
  id: string;
  name: string;
  createdAt: string;
}

export interface WarehouseManagedBy {
  id: string;
  name: string;
  createdAt: string;
}

export interface DispatchLocation {
  id: string;
  name: string;
  createdAt: string;
}

export interface AolBranchName {
  id: string;
  name: string;
  createdAt: string;
}

export interface SupplierName {
  id: string;
  name: string;
  createdAt: string;
}

export interface ClearingCat {
  id: string;
  name: string;
  createdAt: string;
}

export interface ImportPiProductItem {
  id: string;
  productName: string;
  usdPmt: number;
  purchaseQty: number;
  totalUsd: number; // Auto calculated = ("usdPmt" * "purchaseQty") / 1000
}

export interface ImportPiRecord {
  id: string;
  aolBranchName: string;
  indentor: string;
  piNo: string;
  piDate: string;
  piExRate: number;
  supplierName: string;
  products: ImportPiProductItem[];
  totalPurchaseQty: number;
  grandTotalUsd: number;
  // Legacy single product fields for backward compatibility
  productName?: string;
  usdPmt?: number;
  purchaseQty?: number;
  totalUsd?: number;
  mfg: string;
  port: string;
  paymentTerms: string;
  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  group: string;
  manufacturer: string;
  hsnCode?: string;
  teamName?: string; // For team segregation matching
  createdAt: string;
  createdByUserId?: string;
}

export interface EtaScheduleItem {
  id: string;
  etd: string;
  eta: string;
  remark: string;
  createdAt?: string;
}

export interface ImportLcRecord {
  id: string;
  aolBranchName: string;
  piNo: string;
  productName: string;
  lcType: string;
  lcAppSentToBank?: string;
  lcAppSentToBankDate?: string;
  lcBankName?: string;
  bankName?: string;
  lcNoRefNo?: string;
  lcDate?: string;
  lcUsanceAtSight?: string;
  lcUsanceDays?: number;
  usanceDays?: number;
  lcLatestShipmentDate?: string;
  latestShipmentDate?: string;
  lcExpiryDate?: string;
  expiryDate?: string;
  lcOpenExRate?: number;
  openExRate?: number;
  mfg?: string;
  port?: string;
  supplierName?: string;
  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface ImportEtaRecord {
  id: string;
  aolBranchName: string;
  piNo: string;
  productName: string;
  supplierName?: string;
  mfg?: string;
  port?: string;
  etd: string;
  eta: string;
  remark: string;
  schedules?: EtaScheduleItem[];
  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface ImportBoeRecord {
  id: string;
  aolBranchName: string;
  piNo: string;
  productName: string;
  supplierName?: string;
  mfg?: string;
  port?: string;
  usdPmt?: number;
  purchaseQty?: number;
  totalUsd?: number;
  fobCif: string;
  freightUsd: number;
  insuranceUsd: number;
  beNo: string;
  beDate: string;
  boeExRate: number;
  beQuery?: string;
  invoiceNumber: string;
  invoiceDate: string;
  lotBatchNumber: string;
  billOfLadingNo: string;
  billOfLadingDate: string;
  portOfLoading?: string;

  // Deferred Duty & Stamp Duty inline fields
  beStatus?: string;
  deferredDuty?: string;
  deferredDutyAmt?: string;
  paymentDueDate?: string;
  stampDutyAmount?: string;
  stampDutyDate?: string;
  statusRemark?: string;

  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}


export interface PoRecord {
  id: string;
  createdAt: string; // "Created_at"
  poDate: string; // "PO Date"
  poNumber: string; // "PO Number"
  supplierName: string; // "Supplier Name"
  supplierGstin: string; // "Supplier GSTIN"
  supplierAddress: string; // "Supplier Address"
  createEditDate: string; // "Create/Edit Date"
  cpName: string; // "CP Name"
  cpNumber: string; // "CP Number"
  cpEmailId: string; // "CP Email ID"
  deliveryLocation: string; // "Delivery Location"
  billingLocation: string; // "Billing Location"
  shipToAddress: string; // "Ship To Address"
  billToAddress: string; // "Bill To Address"
  shipToGst: string; // "Ship To GST"
  billToGst: string; // "Bill To GST"
  preparedBy: string; // "Prepared By"
  checkedBy: string; // "Checked By"
  spName: string; // "SP Name"
  spPhoneNumber: string; // "SP Phone Number"
  spEmailId: string; // "SP Email Id"
  paymentTerms: string; // "Payment Terms"
  deliveryTerms: string; // "Delivery Terms"
  otherTerms: string; // "Other Terms"
  currency: string; // "Currency"
  subTotal: number; // "Sub Total"
  gst: number; // "GST"
  totalInNum: number; // "Total (In Num)"
  totalInWord: string; // "Total (In Word)"
  productDescription1: string; // "Product Description 1"
  packingKgs1: string; // "Packing/Kgs 1"
  packs1: number; // "Packs 1"
  totalQty1: number; // "Total Qty 1"
  rate1: number; // "Rate 1"
  amount1: number; // "Amount 1"
  createdBy: string; // "Created By"
  editBy?: string; // "Edit By"
  editTimestamp?: string; // "Edit Timestamp"
  createdByUserId?: string;
}


export interface ImportContainerRecord {
  id: string;
  aolBranchName: string;
  beNo: string;
  invoiceNumber: string;
  productName: string;
  piNo?: string;
  containerNo: string;
  sizeOfContainer: string;
  containerWiseQty: number;
  remark?: string;

  // IGM & Item inline fields
  igmNoDt?: string;
  igmItemNo?: string;
  igmChaSelfJobNo?: string;
  igmFinalInwardDate?: string;
  igmContainerGatedIn?: string;
  igmCfsLastDate?: string;
  igmMaterialMovedOutOfCfs?: string;
  igmFreeEmptyCtnrDetentionLastDt?: string;
  igmStatusRemark?: string;
  igmDuty?: boolean;
  igmShpLine?: boolean;
  igmStampDuty?: boolean;
  igmDo?: boolean;
  igmCfs?: boolean;
  igmOocStatus?: boolean;

  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface ImportClearingRecord {
  id: string;
  aolBranchName: string;
  beNo: string;
  productName: string;
  chaCfsShipping: string;
  name: string;
  docType?: "Invoice" | "Credit Note" | "Debit Note" | string;
  invoiceNo: string;
  invoiceDate: string;
  tallyDate: string;
  charges: number;
  chargesEffect?: number; // Auto calculated: Invoice (-ve), Debit (+ve), Credit (-ve)
  remark?: string;
  entryDate?: string;
  provisionAmount?: number;
  provisionalMappingId?: string;
  isProvisional?: boolean;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface DrcBankChargesType {
  id: string;
  name: string;
  createdAt: string;
}

export interface DrcBankCharges1 {
  id: string;
  name: string;
  createdAt: string;
}

export interface ImportDrcRecord {
  id: string;
  aolBranchName: string;
  piNo: string;
  productName: string;
  supplierName: string;
  purchaseQty: number;
  totalUsd: number;
  pendingUsd?: number;
  lcType: string;
  lcOpenBank?: string;
  lcNo?: string;
  adviceNoRefNo?: string;
  tallyDate: string;
  bankName: string;
  usdPayment: number;
  bankChargesType: string;
  banksCharges1: string;
  charges1: number;
  banksCharges2: string;
  charges2: number;
  description?: string;
  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface ImportTptiRecord {
  id: string;
  aolBranchName: string;
  beNo: string;
  productName: string;
  supplierName: string;
  purchaseQty: number;
  tallyDate: string;
  invoiceOrReferenceNo: string;
  category: string;
  amount: number;
  description?: string;
  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface ImportCiRecord {
  id: string;
  aolBranchName: string;
  aolGodown: string;
  beNo: string;
  productName: string;
  containerNo: string;
  supplierName: string;
  containerWiseQty: number;
  beDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseQty: number;
  totalUsd: number;
  beExRate: number;
  containerWiseUsd: number;
  customDuty: number;
  meisLicenceAmt: number;
  penaltyAmount: number;
  purchaseTallyDate: string;
  totalCif: number;
  totalDutyPaidAmt: number;
  totalProductCost: number;
  purchaseRate: number;
  purchaseImport: string;
  entryDate?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface AolGodown {
  id: string;
  name: string;
  createdAt: string;
  branchName?: string;
  description?: string;
}

export interface DomesticSupplierName {
  id: string;
  name: string;
  createdAt: string;
}

export interface ShipToParty {
  id: string;
  name: string;
  createdAt: string;
}

export interface DomesticPdRecord {
  id: string;
  aolBranchName: string;
  aolGodown: string;
  supplierName: string;
  billToPartyName: string;
  shipToPartyName: string;
  originalPurchaseBillNo: string;
  originalInvoiceDate: string;
  productName: string;
  tankerOrVehicleNo: string;
  purchaseQty: number;
  rate: number;
  amount: number;
  freightInBill: number;
  totalPurchaseCost: number;
  purchaseRate: number;
  purchaseDomestic: string; // "Domestic"
  purchaseBillNo: string;
  entryDate: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface TptdCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface DomesticTptdRecord {
  id: string;
  aolBranchName: string;
  productName: string;
  purchaseBillNo: string;
  containerOrVehicleNo: string; // Container No / Vehical No
  tallyDate: string;
  invoiceOrReferenceNo: string; // Invoice /reference No
  category: string;
  amount: number;
  description: string;
  entryDate: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface PidRecord {
  id: string; // Matches origin record ID (CI or PD)
  date: string; // Tally Date
  aolBranchName: string;
  aolGodown: string;
  supplierName: string;
  purchaseBeOrNo: string; // Purchase BE No / Purchase no
  beOrPurchaseDate: string;
  productName: string;
  containerNo: string; // Container No / Vehicle No
  purchaseQty: number; // Qty (Kg)
  purchaseRate: number;
  type: "Import" | "Domestic" | "Stock Transfer" | "Opening Stock" | "Import-ST" | "Domestic-ST";
  stockTransfer?: number;
  salesQty?: number;
  purchaseDebitCreditQty?: number;
  salesDebitCreditQty?: number;
  drumCost?: number;
  purchaseRateAfterDruming?: number;
  closingStock?: number;
  originCode?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface AccountsStRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;
  sourceAolGodown: string;
  sourceAolBranchName: string;
  sourceSupplierName: string;
  sourceProductName: string;
  sourceBePurchaseBillNo: string;
  sourceContainerNo: string;
  sourceOriginCode: string;
  sourcePidId?: string;
  sourcePurchaseRate: number;
  sourceClosingStock: number;
  qty: number;
  rate: number;
  invoiceOrTallyDate: string;
  destAolGodown: string;
  destAolBranchName: string;
  stockJvOrNewInvoiceNo: string;
  newProductName: string;
  importOrDomestic: "Import" | "Domestic";
  freightProvision: number;
  provisionLoadingUnloading: number;
  taxableValue: number;
  gp: number;
}

export interface OpeningStockRecord {
  id: string;
  aolBranchName: string;
  aolGodown: string;
  supplierName: string;
  beNoOrPurchaseNo: string;
  beOrPurchaseDate: string;
  productName: string;
  containerNo: string;
  openingQty: number;
  purchaseRate: number;
  importOrDomestic: string;
  originCode: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
}

export interface AccountsSalesRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;
  aolGodown: string;
  aolBranchName: string;
  sourcePidId: string;
  pidKeyDisplay: string;
  spName: string;
  spUserId?: string;
  partyName: string;
  saleInvoiceNo: string;
  invoiceDate: string;
  productName: string;
  salesQty: number;
  rate: number;
  taxableValue: number;
  gp?: number;
  beNoOrPurchaseNo: string;
  containerNo: string;
  purRate: number;
  originCode: string;
  freightProvision: number;
  provisionLoadingUnloading: number;
  freightInBill: number;
}

export interface AccountsDrumingRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date (auto readonly)
  tallyDate: string;
  aolGodown: string;
  productName: string;
  containerNo: string;
  numberOfDrumsBags: number;
  totalDrumCost: number;
  sourcePidId?: string;
  beNoOrPurchaseNo?: string;
  supplierName?: string;
  aolBranchName?: string;
  originCode?: string;
}

export interface ExpenseLedgerItem {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  expenseSubHead: string;        // Expense Sub-head (mandatory)
  expenseHead: string;           // Expense Head (mandatory)
  directIndirect: string;        // Direct / Indirect (mandatory)
  ledgerBranchLocation: string;  // Ledger Branch Location (mandatory)
  expenseIncomeType: string;     // Expense / Income Type (mandatory)
  ecomExpense: string;           // ECOM Expense (Yes / No, mandatory)
}

export interface AccountsOfficeExpRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // entry Date
  aolBranchName: string;         // AOL Branch Name
  vendorPartyName: string;       // Name of Vendor/Party Name
  purchaseInvoiceNo: string;     // Purchase Invoice No.
  invoiceDate: string;           // Invoice Date
  tallyEntryDate: string;        // Tally Entry Date
  amount: number;                // Amount
  description: string;           // Description
  expenseSubHead: string;        // Expense Sub-head (selected from Expense Ledger)
  expenseIncomeType: string;     // Expense/Income Type (displayed from Expense Ledger selection)
  totalAmount: number;           // Total Amount (auto-calculated)
}

export interface AccountsMeisRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date (auto)
  tallyDate: string;             // Tally Date
  aolBranchName: string;         // AOL Branch Name
  meisLicenceCost: number;       // MEIS Licence Cost
  licenceNumbers: string;        // Licence Numbers
  meisLicenceAmount: number;     // MEIS Licence Amount
  beNumber: string;              // BE Number
  profit: number;                // Profit (auto = MEIS Licence Amount - MEIS Licence Cost)
  description: string;           // Description
}

export interface OtherIncomeLedgerItem {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  ledger: string;                // Ledger Name
  effect: "Income" | "Expense";  // Effect
}

export interface AccountsOtherIncomeRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // entry Date (auto readonly)
  aolBranchName: string;         // AOL Branch Name
  tallyDate: string;             // Tally Date
  partyName: string;             // Party Name
  ledger: string;                // Ledger (selected from Ledger list)
  amount: number;                // Amount
  description: string;           // Description
  effect: "Income" | "Expense" | string; // Effect (auto display as per ledger selection)
  finalAmount: number;           // Amount (auto as per Effect: + for income, - for expense)
}

export interface AccountsFdrRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date (auto readonly)
  aolBranchName: string;         // AOL Branch Name
  bankName: string;              // BANK NAME
  tallyDate: string;             // TALLY DATE
  interestAmt: number;           // INTEREST AMT
  fdrNo: string;                 // FDR NO
  description?: string;          // DESCRIPTION
}

export interface AccountsCsdIsdRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date - Auto readonly
  aolBranchName: string;         // AOL Branch Name
  type: "Sales" | "Purchase";    // Sales / Purchase
  tallyDate: string;             // Tally Date
  invoiceNo: string;             // Invoice No.
  taxableValue: number;          // Taxable Value
  narration?: string;            // Narration
  effectAmount: number;          // Effect Amount (auto calculated: Sales +ve, Purchase -ve)
}

export interface AccountsTptSRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date - Auto Readonly
  aolBranchName: string;         // AOL Branch Name
  tallyDate: string;             // TALLY DATE
  transporterName: string;       // TRANSPORTER NAME (dropdown from List Management)
  saleInvoiceNo: string;         // SALE INVOICE NO
  category: string;              // Category (dropdown from TPT-D Category)
  actualAmount: number;          // Actual Amount
  provisionAmount?: number;      // PROVISION Amount (auto-fetched or blank)
  description?: string;          // DESCRIPTION
  effectiveFreight: number;      // Effective Freight - auto should be -ve of Actual Amount
}

export interface AccountsTptStRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date - Auto Readonly
  aolBranchName: string;         // AOL Branch Name
  tallyDate: string;             // TALLY DATE
  transporterName: string;       // TRANSPORTER NAME (dropdown from List Management)
  stockJvOrNewInvoiceNo: string; // Stock JV / New Invoice No
  category: string;              // Category (dropdown from TPT-D Category)
  actualAmount: number;          // Actual Amount
  provisionAmount?: number;      // PROVISION Amount (auto-fetched or blank)
  description?: string;          // DESCRIPTION
  effectiveFreight: number;      // Effective Freight - auto should be -ve of Actual Amount
}

export interface LedgerCrDrCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface AccountsSupplierCrDrRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date - Auto Readonly
  aolBranchName: string;         // AOL BRANCH NAME - auto display as per AOL godown selection
  aolGodown: string;             // AOL Godown - dropdown
  tallyDate: string;             // Tally Date
  noteOn: "On Qty" | "On Rate" | "On Amount" | string; // Dr/Cr Note ON (QTY/Rate)
  noteType: "Credit Note" | "Debit Note" | string;     // DR / CR Note
  partyName: string;             // Party Name
  noteNo: string;                // DR / CR No
  productName: string;           // Product Name (from PID)
  bePurchaseBillNo: string;      // BE/Purchase Bill No (from PID)
  tankerVehicleNo: string;       // Tanker or Vehical No (from PID)
  pidId?: string;                // Reference to selected PID record
  ledgerSelection: string;       // Ledger Selection (dropdown)
  qty: number;                   // Qty
  rate: number;                  // Rate
  amount: number;                // Amount
  dateFrom?: string;             // Date From
  dateTo?: string;               // Date To
  description?: string;          // Discription
  autoQty: number;               // Auto Qty
  autoAmount: number;            // Auto Amount
  purRateEffectedAmount: number; // Pur Rate Effected Amount
}

export interface AccountsCustomerCrDrRecord {
  id: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  entryDate: string;             // Entry Date - Auto Readonly
  aolBranchName: string;         // AOL BRANCH NAME - auto display as per AOL godown selection
  aolGodown: string;             // AOL Godown - dropdown
  tallyDate: string;             // Tally Date
  noteOn: "On Qty" | "On Rate" | "On Amount" | string; // Dr/Cr Note ON (QTY/Rate)
  noteType: "Credit Note" | "Debit Note" | string;     // DR / CR Note
  partyName: string;             // Party Name
  noteNo: string;                // DR / CR No
  saleInvoiceNo: string;         // Sale Invoice No (cascading from Sales)
  productName: string;           // Product Name (cascading from Sales)
  bePurchaseBillNo: string;      // BE/Purchase Bill No (cascading from Sales)
  tankerVehicleNo: string;       // Tanker or Vehical No (cascading from Sales)
  salesId?: string;              // Reference to selected Sales record
  ledgerSelection: string;       // Ledger Selection (dropdown)
  qty: number;                   // Qty
  rate: number;                  // Rate
  amount: number;                // Amount
  dateFrom?: string;             // Date From
  dateTo?: string;               // Date To
  description?: string;          // Discription
  autoQty: number;               // Auto Qty
  autoAmount: number;            // Auto Amount
  purRateEffectedAmount: number; // Pur Rate Effected Amount
}











