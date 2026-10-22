/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  User, 
  Role, 
  AccessLevel,
  AccountsStRecord,
  AccountsSalesRecord,
  AccountsDrumingRecord,
  AccountsOfficeExpRecord,
  AccountsMeisRecord,
  AccountsOtherIncomeRecord,
  AccountsFdrRecord,
  AccountsCsdIsdRecord,
  AccountsTptSRecord,
  AccountsSupplierCrDrRecord,
  AccountsCustomerCrDrRecord,
  ImportPiRecord,
  ImportLcRecord,
  ImportEtaRecord,
  ImportBoeRecord,
  ImportContainerRecord,
  ImportClearingRecord,
  ImportDrcRecord,
  ImportTptiRecord,
  ImportCiRecord,
  DomesticPdRecord,
  DomesticTptdRecord
} from "../../types";
import { 
  Landmark, 
  ChevronDown, 
  ChevronUp, 
  Percent, 
  Coins, 
  Package, 
  CreditCard, 
  Award, 
  PlusCircle, 
  PiggyBank, 
  FileSpreadsheet, 
  Truck, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  Activity,
  User as UserIcon,
  Check,
  FileText,
  Clock,
  Receipt,
  Building2,
  Filter,
  RotateCcw,
  Grid,
  Database,
  Layers,
  MapPin
} from "lucide-react";
import AdminDriveSettings from "../Configuration/AdminDriveSettings";
import { DateRangeFilterPopup } from "../Configuration/DateRangeFilterPopup";

interface DashboardViewProps {
  activeUserId: string;
  users: User[];
  // Accounts sub-tabs data
  accountsSts?: AccountsStRecord[];
  accountsSales?: AccountsSalesRecord[];
  accountsDrumings?: AccountsDrumingRecord[];
  accountsOfficeExps?: AccountsOfficeExpRecord[];
  accountsMeis?: AccountsMeisRecord[];
  accountsOtherIncomes?: AccountsOtherIncomeRecord[];
  accountsFdrs?: AccountsFdrRecord[];
  accountsCsdIsds?: AccountsCsdIsdRecord[];
  accountsTpts?: AccountsTptSRecord[];
  accountsSupplierCrDrs?: AccountsSupplierCrDrRecord[];
  accountsCustomerCrDrs?: AccountsCustomerCrDrRecord[];
  // Import sub-tabs data
  importPis?: ImportPiRecord[];
  importLcs?: ImportLcRecord[];
  importEtas?: ImportEtaRecord[];
  importBoes?: ImportBoeRecord[];
  importContainers?: ImportContainerRecord[];
  importClearings?: ImportClearingRecord[];
  importDrcs?: ImportDrcRecord[];
  importTptis?: ImportTptiRecord[];
  importCis?: ImportCiRecord[];
  // Domestic sub-tabs data
  domesticPds?: DomesticPdRecord[];
  domesticTptds?: DomesticTptdRecord[];
}

export default function DashboardView({
  activeUserId,
  users,
  accountsSts = [],
  accountsSales = [],
  accountsDrumings = [],
  accountsOfficeExps = [],
  accountsMeis = [],
  accountsOtherIncomes = [],
  accountsFdrs = [],
  accountsCsdIsds = [],
  accountsTpts = [],
  accountsSupplierCrDrs = [],
  accountsCustomerCrDrs = [],
  importPis = [],
  importLcs = [],
  importEtas = [],
  importBoes = [],
  importContainers = [],
  importClearings = [],
  importDrcs = [],
  importTptis = [],
  importCis = [],
  domesticPds = [],
  domesticTptds = [],
}: DashboardViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || {
    id: activeUserId || "unknown",
    name: "Standard Contributor",
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    email: activeUserId || "",
    teamName: "Sales Development",
    targetQuota: 30000,
    avatarUrl: ""
  };

  // Helper date calculations
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const defaultWeekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  }, []);
  const defaultMonthStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split("T")[0];
  }, []);

  // Top Filter States (Default: Recent Week)
  const [filterPeriod, setFilterPeriod] = useState<"week" | "month" | "today" | "all" | "custom">("week");
  const [startDate, setStartDate] = useState<string>(defaultWeekStart);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isDatePopupOpen, setIsDatePopupOpen] = useState<boolean>(false);

  // Extract all unique branch names from all records across all modules
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    const extract = (r: any) => {
      const b = (
        r.aolBranchName ||
        r.sourceAolBranchName ||
        r.destAolBranchName ||
        r.ledgerBranchLocation ||
        r.branchName ||
        r.branch ||
        ""
      ).trim();
      if (b) branchSet.add(b);
    };

    [
      ...accountsSts,
      ...accountsSales,
      ...accountsDrumings,
      ...accountsOfficeExps,
      ...accountsMeis,
      ...accountsOtherIncomes,
      ...accountsFdrs,
      ...accountsCsdIsds,
      ...accountsTpts,
      ...accountsSupplierCrDrs,
      ...accountsCustomerCrDrs,
      ...importPis,
      ...importLcs,
      ...importEtas,
      ...importBoes,
      ...importContainers,
      ...importClearings,
      ...importDrcs,
      ...importTptis,
      ...importCis,
      ...domesticPds,
      ...domesticTptds
    ].forEach(extract);

    return Array.from(branchSet).sort((a, b) => a.localeCompare(b));
  }, [
    accountsSts, accountsSales, accountsDrumings, accountsOfficeExps, accountsMeis,
    accountsOtherIncomes, accountsFdrs, accountsCsdIsds, accountsTpts, accountsSupplierCrDrs,
    accountsCustomerCrDrs, importPis, importLcs, importEtas, importBoes, importContainers,
    importClearings, importDrcs, importTptis, importCis, domesticPds, domesticTptds
  ]);

  // Handle Quick Filter Period changes
  const handlePeriodChange = (period: "week" | "month" | "today" | "all" | "custom") => {
    setFilterPeriod(period);
    if (period === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === "week") {
      setStartDate(defaultWeekStart);
      setEndDate(todayStr);
    } else if (period === "month") {
      setStartDate(defaultMonthStart);
      setEndDate(todayStr);
    } else if (period === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Reset all filters to default (Recent Week, All Branches)
  const handleResetFilters = () => {
    setFilterPeriod("week");
    setStartDate(defaultWeekStart);
    setEndDate(todayStr);
    setSelectedBranch("all");
  };

  // Extract record date string safely
  const getRecordDate = (r: any): string => {
    const dStr =
      r.entryDate ||
      r.tallyDate ||
      r.piDate ||
      r.beDate ||
      r.originalInvoiceDate ||
      r.provisionInvoiceDate ||
      r.invoiceDate ||
      r.tallyEntryDate ||
      r.createdAt ||
      "";
    return dStr ? dStr.split("T")[0] : "";
  };

  // Extract record branch safely
  const getRecordBranch = (r: any): string => {
    return (
      r.aolBranchName ||
      r.sourceAolBranchName ||
      r.destAolBranchName ||
      r.ledgerBranchLocation ||
      r.branchName ||
      r.branch ||
      ""
    ).trim();
  };

  // Safe effective amount calculation for any record
  const getRecordEffectiveAmount = (r: any, subId?: string): number => {
    if (subId === "office_exp" || r.expenseIncomeType !== undefined) {
      if (r.totalAmount !== undefined && r.totalAmount !== "") {
        return Number(r.totalAmount) || 0;
      }
      const isExp = (r.expenseIncomeType || "").toLowerCase().includes("expense");
      const raw = Math.abs(Number(r.amount) || 0);
      return isExp ? -raw : raw;
    }
    if (subId === "other_income" || r.ledger !== undefined) {
      if (r.finalAmount !== undefined && r.finalAmount !== "") {
        return Number(r.finalAmount) || 0;
      }
      const isInc = r.effect === "Income";
      const raw = Number(r.amount) || 0;
      return isInc ? raw : -raw;
    }
    if (subId === "csd_isd" || r.effectAmount !== undefined) {
      if (r.effectAmount !== undefined && r.effectAmount !== "") {
        return Number(r.effectAmount) || 0;
      }
      const isSales = r.type === "Sales";
      const total = Number(r.totalAmount) || 0;
      return isSales ? total : -total;
    }
    if (r.effectiveFreight !== undefined && r.effectiveFreight !== "") {
      return Number(r.effectiveFreight) || 0;
    }
    if (r.totalAmount !== undefined && r.totalAmount !== "") {
      return Number(r.totalAmount) || 0;
    }
    if (r.finalAmount !== undefined && r.finalAmount !== "") {
      return Number(r.finalAmount) || 0;
    }
    if (r.usdPayment !== undefined && r.usdPayment !== "") {
      return Number(r.usdPayment) || 0;
    }
    if (r.amount !== undefined && r.amount !== "") {
      return Number(r.amount) || 0;
    }
    return 0;
  };

  // Safe gross amount calculation for any record
  const getRecordGrossAmount = (r: any): number => {
    if (r.amount !== undefined && r.amount !== "") return Math.abs(Number(r.amount) || 0);
    if (r.usdPayment !== undefined && r.usdPayment !== "") return Number(r.usdPayment) || 0;
    if (r.meisLicenceAmount !== undefined && r.meisLicenceAmount !== "") return Number(r.meisLicenceAmount) || 0;
    if (r.totalAmount !== undefined && r.totalAmount !== "") return Math.abs(Number(r.totalAmount) || 0);
    if (r.finalAmount !== undefined && r.finalAmount !== "") return Math.abs(Number(r.finalAmount) || 0);
    return 0;
  };

  // Filter records by Branch ONLY (used as base dataset for dynamic date breakdowns)
  const filterByBranchOnly = (records: any[]) => {
    if (selectedBranch === "all") return records;
    const targetBranch = selectedBranch.trim().toLowerCase();
    return records.filter((r) => {
      const b = getRecordBranch(r).toLowerCase();
      return b === targetBranch;
    });
  };

  // Filter records by BOTH Branch and active Date Range (used for general views and global totals)
  const filterRecords = (records: any[]) => {
    return records.filter((r) => {
      if (selectedBranch !== "all") {
        const b = getRecordBranch(r).toLowerCase();
        if (b !== selectedBranch.trim().toLowerCase()) return false;
      }
      if (startDate || endDate) {
        const d = getRecordDate(r);
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      return true;
    });
  };

  // Define the main 3 categories of registers with their sub-tabs
  const categoriesConfig = [
    {
      id: "import",
      title: "Import Registers",
      description: "Shipment PI, LC, ETA, Custom duty, and TPT-I logistics records.",
      bgColor: "bg-blue-50/40 text-blue-800 border-blue-250",
      accentColor: "blue",
      subTabs: [
        {
          id: "pi",
          label: "PI (Proforma Invoice)",
          icon: FileText,
          bgColor: "bg-blue-50 text-blue-600 border-blue-200",
          records: importPis
        },
        {
          id: "lc",
          label: "LC (Letter of Credit)",
          icon: Landmark,
          bgColor: "bg-amber-50 text-amber-600 border-amber-200",
          records: importLcs
        },
        {
          id: "eta",
          label: "ETA Tracking",
          icon: Clock,
          bgColor: "bg-purple-50 text-purple-600 border-purple-200",
          records: importEtas
        },
        {
          id: "boe",
          label: "BOE (Bill of Entry)",
          icon: Receipt,
          bgColor: "bg-teal-50 text-teal-600 border-teal-200",
          records: importBoes
        },
        {
          id: "containers",
          label: "Containers & IGM",
          icon: Package,
          bgColor: "bg-rose-50 text-rose-600 border-rose-200",
          records: importContainers
        },
        {
          id: "clearing",
          label: "Clearing Details",
          icon: Building2,
          bgColor: "bg-cyan-50 text-cyan-600 border-cyan-200",
          records: importClearings
        },
        {
          id: "drc",
          label: "DRC (Doc Recd & Costing)",
          icon: Coins,
          bgColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
          records: importDrcs
        },
        {
          id: "tpti",
          label: "TPT-I Logistics",
          icon: Truck,
          bgColor: "bg-orange-50 text-orange-600 border-orange-200",
          records: importTptis
        },
        {
          id: "ci",
          label: "IP (Import Purchase)",
          icon: FileSpreadsheet,
          bgColor: "bg-indigo-50 text-indigo-600 border-indigo-200",
          records: importCis
        }
      ]
    },
    {
      id: "domestic",
      title: "Domestic Registers",
      description: "Local procurement details and domestic transport freight records.",
      bgColor: "bg-emerald-50/40 text-emerald-800 border-emerald-250",
      accentColor: "emerald",
      subTabs: [
        {
          id: "pd",
          label: "PD (Procurement Details)",
          icon: FileText,
          bgColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
          records: domesticPds
        },
        {
          id: "tptd",
          label: "TPT-D Logistics",
          icon: Truck,
          bgColor: "bg-indigo-50 text-indigo-600 border-indigo-200",
          records: domesticTptds
        }
      ]
    },
    {
      id: "accounts",
      title: "Accounts Registers",
      description: "Internal taxations, drumming, sales ledger transactions, and debit/credit notes.",
      bgColor: "bg-violet-50/40 text-violet-800 border-violet-250",
      accentColor: "violet",
      subTabs: [
        {
          id: "st",
          label: "Sales Tax (ST)",
          icon: Percent,
          bgColor: "bg-blue-50 text-blue-600 border-blue-200",
          records: accountsSts
        },
        {
          id: "sales",
          label: "Sales Module",
          icon: Coins,
          bgColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
          records: accountsSales
        },
        {
          id: "druming",
          label: "Druming Process",
          icon: Package,
          bgColor: "bg-indigo-50 text-indigo-600 border-indigo-200",
          records: accountsDrumings
        },
        {
          id: "office_exp",
          label: "Office Expenses",
          icon: CreditCard,
          bgColor: "bg-rose-50 text-rose-600 border-rose-200",
          records: accountsOfficeExps
        },
        {
          id: "meis",
          label: "MEIS License",
          icon: Award,
          bgColor: "bg-amber-50 text-amber-600 border-amber-200",
          records: accountsMeis
        },
        {
          id: "other_income",
          label: "Other Income",
          icon: PlusCircle,
          bgColor: "bg-violet-50 text-violet-600 border-violet-200",
          records: accountsOtherIncomes
        },
        {
          id: "fdr",
          label: "FDR Receipts",
          icon: PiggyBank,
          bgColor: "bg-cyan-50 text-cyan-600 border-cyan-200",
          records: accountsFdrs
        },
        {
          id: "csd_isd",
          label: "CSD & ISD",
          icon: FileSpreadsheet,
          bgColor: "bg-teal-50 text-teal-600 border-teal-200",
          records: accountsCsdIsds
        },
        {
          id: "tpt_s",
          label: "TPT-S Logistics",
          icon: Truck,
          bgColor: "bg-orange-50 text-orange-600 border-orange-200",
          records: accountsTpts
        },
        {
          id: "supplier_cr_dr",
          label: "Supplier CR/DR Notes",
          icon: ArrowUpRight,
          bgColor: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
          records: accountsSupplierCrDrs
        },
        {
          id: "customer_cr_dr",
          label: "Customer CR/DR Notes",
          icon: ArrowDownLeft,
          bgColor: "bg-sky-50 text-sky-600 border-sky-200",
          records: accountsCustomerCrDrs
        }
      ]
    }
  ];

  // Collapsible category state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    import: true,
    domestic: true,
    accounts: true
  });

  // Collapsible sub-tab state (expanded by default for primary ones)
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    st: true,
    sales: true,
    office_exp: true,
    pi: true,
    pd: true,
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleTab = (id: string) => {
    setExpandedTabs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const nextCategories: Record<string, boolean> = {};
    const nextTabs: Record<string, boolean> = {};
    
    categoriesConfig.forEach(cat => {
      nextCategories[cat.id] = true;
      cat.subTabs.forEach(sub => {
        nextTabs[sub.id] = true;
      });
    });

    setExpandedCategories(nextCategories);
    setExpandedTabs(nextTabs);
  };

  const collapseAll = () => {
    const nextCategories: Record<string, boolean> = {};
    const nextTabs: Record<string, boolean> = {};
    
    categoriesConfig.forEach(cat => {
      nextCategories[cat.id] = false;
      cat.subTabs.forEach(sub => {
        nextTabs[sub.id] = false;
      });
    });

    setExpandedCategories(nextCategories);
    setExpandedTabs(nextTabs);
  };

  // Comprehensive statistics helper: Computes Day, Weekly, and Monthly counts & amounts
  const getStats = (rawRecords: any[], subId?: string) => {
    // Apply branch filter first
    const branchRecords = filterByBranchOnly(rawRecords);

    // 1. TODAY STATS
    const todayRecords = branchRecords.filter((r) => {
      const d = getRecordDate(r);
      return d === todayStr;
    });
    const thisDay = todayRecords.length;
    const thisDayEffectiveAmount = todayRecords.reduce((sum, r) => sum + getRecordEffectiveAmount(r, subId), 0);
    const thisDayRawAmount = todayRecords.reduce((sum, r) => sum + getRecordGrossAmount(r), 0);

    // 2. WEEKLY STATS (Recent 7 days window: defaultWeekStart to today, or active custom filter range when in week mode)
    const effectiveWeekStart = (filterPeriod === "week" && startDate) ? startDate : defaultWeekStart;
    const effectiveWeekEnd = (filterPeriod === "week" && endDate) ? endDate : todayStr;
    const weeklyRecords = branchRecords.filter((r) => {
      const d = getRecordDate(r);
      if (!d) return false;
      return d >= effectiveWeekStart && d <= effectiveWeekEnd;
    });
    const weeklyCount = weeklyRecords.length;
    const weeklyEffectiveAmount = weeklyRecords.reduce((sum, r) => sum + getRecordEffectiveAmount(r, subId), 0);
    const weeklyRawAmount = weeklyRecords.reduce((sum, r) => sum + getRecordGrossAmount(r), 0);

    // 3. MONTHLY STATS (Recent 30 days window: defaultMonthStart to today, or active custom filter range when in month mode)
    const effectiveMonthStart = (filterPeriod === "month" && startDate) ? startDate : defaultMonthStart;
    const effectiveMonthEnd = (filterPeriod === "month" && endDate) ? endDate : todayStr;
    const monthlyRecords = branchRecords.filter((r) => {
      const d = getRecordDate(r);
      if (!d) return false;
      return d >= effectiveMonthStart && d <= effectiveMonthEnd;
    });
    const monthlyCount = monthlyRecords.length;
    const monthlyEffectiveAmount = monthlyRecords.reduce((sum, r) => sum + getRecordEffectiveAmount(r, subId), 0);
    const monthlyRawAmount = monthlyRecords.reduce((sum, r) => sum + getRecordGrossAmount(r), 0);

    // 4. TOTAL FILTERED DATASET STATS (Matching both branch & active date range)
    const fullyFilteredRecords = filterRecords(rawRecords);
    const totalFilteredCount = fullyFilteredRecords.length;
    const totalFilteredEffectiveAmount = fullyFilteredRecords.reduce((sum, r) => sum + getRecordEffectiveAmount(r, subId), 0);
    const totalFilteredRawAmount = fullyFilteredRecords.reduce((sum, r) => sum + getRecordGrossAmount(r), 0);

    // Averages calculation based on earliest record in branch subset
    const today = new Date(todayStr);
    let earliestDate = today;
    branchRecords.forEach(r => {
      const dStr = getRecordDate(r);
      if (!dStr) return;
      const d = new Date(dStr);
      if (!isNaN(d.getTime()) && d < earliestDate) {
        earliestDate = d;
      }
    });

    const totalInBranch = branchRecords.length;
    const msDiff = Math.abs(today.getTime() - earliestDate.getTime());
    const daysDiff = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    const weeksCount = Math.max(1, daysDiff / 7);
    const monthsCount = Math.max(1, daysDiff / 30);

    const avgWeekly = totalInBranch / weeksCount;
    const avgMonthly = totalInBranch / monthsCount;

    return {
      total: totalInBranch,
      totalFilteredCount,
      totalFilteredEffectiveAmount,
      totalFilteredRawAmount,
      thisDay,
      thisDayEffectiveAmount,
      thisDayRawAmount,
      todayRecords,
      weeklyCount,
      weeklyEffectiveAmount,
      weeklyRawAmount,
      avgWeekly,
      monthlyCount,
      monthlyEffectiveAmount,
      monthlyRawAmount,
      avgMonthly
    };
  };

  // Sort and select top 3 recent records helper (filtered by branch and active date range)
  const getRecentEntries = (records: any[]): any[] => {
    return [...filterRecords(records)]
      .sort((a, b) => {
        const dateA = new Date(getRecordDate(a) || 0);
        const dateB = new Date(getRecordDate(b) || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 4);
  };

  // Safe description resolver for recent records
  const getRecordSummary = (categoryId: string, tabId: string, item: any): string => {
    switch (categoryId) {
      case "import":
        switch (tabId) {
          case "pi":
            return `PI #${item.piNo || "N/A"} - Supplier: ${item.supplierName || "N/A"}`;
          case "lc":
            return `LC Ref: ${item.lcNoRefNo || "N/A"} - Bank: ${item.bankName || item.lcBankName || "N/A"}`;
          case "eta":
            return `ETA to ${item.aolBranchName || "Branch"} - PI: ${item.piNo || "N/A"}`;
          case "boe":
            return `BOE BE No: ${item.beNo || "N/A"} - Date: ${item.beDate || "N/A"}`;
          case "containers":
            return `Container: ${item.containerNo || "N/A"} - Qty: ${item.containerWiseQty || 0}`;
          case "clearing":
            return `Clearing: ${item.chaCfsShipping || "N/A"} - Invoice: ${item.invoiceNo || "N/A"}`;
          case "drc":
            return `DRC PI: ${item.piNo || "N/A"} - Payment: $${item.usdPayment || 0}`;
          case "tpti":
            return `TPT-I: ${item.supplierName || "N/A"} - Amount: $${item.amount || 0}`;
          case "ci":
            return `CI Inward: ${item.containerNo || item.invoiceNumber || "N/A"} - Product: ${item.productName || "N/A"}`;
          default:
            return "Import record";
        }
      case "domestic":
        switch (tabId) {
          case "pd":
            return `PD Purchase Bill: ${item.purchaseBillNo || item.originalPurchaseBillNo || "N/A"} - Supplier: ${item.supplierName || "N/A"}`;
          case "tptd":
            return `TPT-D Inv: ${item.invoiceOrReferenceNo || "N/A"} - Amount: ₹${(item.amount || 0).toLocaleString("en-IN")}`;
          default:
            return "Domestic record";
        }
      case "accounts":
        switch (tabId) {
          case "st":
            return `Transfer: ${item.sourceProductName || "Product"} (${item.sourceAolGodown || "Godown"})`;
          case "sales":
            return `Sale to ${item.partyName || "Party"} - Invoice #${item.saleInvoiceNo || "N/A"}`;
          case "druming":
            return `Druming: ${item.productName || "Product"} (${item.numberOfDrumsBags || 0} drums/bags)`;
          case "office_exp": {
            const isExp = (item.expenseIncomeType || "").toLowerCase().includes("expense");
            const effAmt = item.totalAmount !== undefined && item.totalAmount !== ""
              ? Number(item.totalAmount) 
              : (isExp ? -Math.abs(Number(item.amount) || 0) : Math.abs(Number(item.amount) || 0));
            const formatted = effAmt < 0 
              ? `-₹${Math.abs(effAmt).toLocaleString("en-IN")}` 
              : `+₹${Math.abs(effAmt).toLocaleString("en-IN")}`;
            return `Office Exp: ${item.vendorPartyName || "Vendor"} — ${item.expenseSubHead || "Expense"} (${formatted})`;
          }
          case "meis":
            return `MEIS Lic: #${item.licenceNumbers || ""} (₹${(item.meisLicenceAmount || 0).toLocaleString("en-IN")})`;
          case "other_income": {
            const amt = item.finalAmount !== undefined && item.finalAmount !== ""
              ? Number(item.finalAmount) 
              : (item.effect === "Income" ? (Number(item.amount) || 0) : -(Number(item.amount) || 0));
            const formatted = amt >= 0 ? `+₹${Math.abs(amt).toLocaleString("en-IN")}` : `-₹${Math.abs(amt).toLocaleString("en-IN")}`;
            return `Other Income: ${item.partyName || "Party"} — ${item.ledger || ""} (${formatted})`;
          }
          case "fdr":
            return `FDR Bank: ${item.bankName || "Bank"} — FDR #${item.fdrNo || ""} (Interest: ₹${(item.interestAmt || 0).toLocaleString("en-IN")})`;
          case "csd_isd": {
            const eff = item.effectAmount !== undefined && item.effectAmount !== ""
              ? Number(item.effectAmount) 
              : (item.type === "Sales" ? (Number(item.totalAmount) || 0) : -(Number(item.totalAmount) || 0));
            const formatted = eff >= 0 ? `+₹${Math.abs(eff).toLocaleString("en-IN")}` : `-₹${Math.abs(eff).toLocaleString("en-IN")}`;
            return `CSD/ISD ${item.type || ""}: Invoice #${item.invoiceNo || ""} (${formatted})`;
          }
          case "tpt_s":
            return `TPT-S: ${item.transporterName || ""} — Invoice #${item.saleInvoiceNo || ""} (₹${(item.actualAmount || 0).toLocaleString("en-IN")})`;
          case "supplier_cr_dr":
            return `Supplier ${item.noteType || "Note"}: ${item.partyName || ""} — Note #${item.noteNo || ""} (₹${(item.amount || 0).toLocaleString("en-IN")})`;
          case "customer_cr_dr":
            return `Customer ${item.noteType || "Note"}: ${item.partyName || ""} — Note #${item.noteNo || ""} (₹${(item.amount || 0).toLocaleString("en-IN")})`;
          default:
            return "Accounts record";
        }
      default:
        return "Record entry";
    }
  };

  // Global counts reflecting active branch & date filters
  const allSubTabs: Array<{ id: string; records: any[] }> = categoriesConfig.flatMap((c: any) => c.subTabs);
  const totalFilteredEntries = allSubTabs.reduce((acc: number, sub) => acc + filterRecords(sub.records).length, 0);
  const totalRawEntries = allSubTabs.reduce((acc: number, sub) => acc + sub.records.length, 0);
  const totalTodayEntries = allSubTabs.reduce((acc: number, sub) => acc + getStats(sub.records, sub.id).thisDay, 0);
  const totalWeeklyEntries = allSubTabs.reduce((acc: number, sub) => acc + getStats(sub.records, sub.id).weeklyCount, 0);
  const totalMonthlyEntries = allSubTabs.reduce((acc: number, sub) => acc + getStats(sub.records, sub.id).monthlyCount, 0);

  // Check if any non-default filter is applied
  const isFilterActive = selectedBranch !== "all" || filterPeriod !== "week" || startDate !== defaultWeekStart || endDate !== todayStr;

  return (
    <div className="space-y-4">
      {/* Live System Indicator Dashboard Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-3xs flex items-center justify-center">
              <Database size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                Executive System Dashboard
                {selectedBranch !== "all" && (
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    {selectedBranch}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-time tracking, metrics, and logs across Import, Domestic, and Accounts registers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Badge 1: Filtered / Total Entries */}
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-3xs">
            <div className="h-2 w-2 rounded-full bg-slate-400"></div>
            <div className="text-[11px] font-semibold text-slate-600 font-mono">
              In View: <strong className="text-slate-900 font-bold text-xs">{totalFilteredEntries}</strong>
              <span className="text-slate-400 ml-1 text-[10px]">/ {totalRawEntries}</span>
            </div>
          </div>

          {/* Badge 2: Week Entries */}
          <div className="bg-indigo-50 border border-indigo-150 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-3xs">
            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
            <div className="text-[11px] font-semibold text-indigo-800 font-mono">
              Week Entries: <strong className="text-indigo-950 font-bold text-xs">+{totalWeeklyEntries}</strong>
            </div>
          </div>

          {/* Badge 3: Today Added */}
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-3xs">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-[11px] font-semibold text-emerald-800 font-mono">
              Today Added: <strong className="text-emerald-950 font-bold text-xs">+{totalTodayEntries}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* TOP COMPREHENSIVE FILTER BAR (Branch Name & Date Range) */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left Column: Filter Title & Branch Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              <Filter size={15} />
              <span>Global Filters:</span>
            </div>

            {/* Branch Selector */}
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 shadow-inner">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <label htmlFor="dashboard-branch-filter" className="text-[10px] font-bold uppercase text-slate-400 font-mono">
                Branch:
              </label>
              <select
                id="dashboard-branch-filter"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">All Branches (Global)</option>
                {availableBranches.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Date Range Presets & Custom Pickers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Period Buttons */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handlePeriodChange("week")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterPeriod === "week"
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Recent Week (Default)
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("month")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterPeriod === "month"
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Recent Month
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("today")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterPeriod === "today"
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("all")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterPeriod === "all"
                    ? "bg-emerald-500 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                All Time
              </button>
            </div>

            {/* Custom Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-emerald-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterPeriod("custom");
                }}
                className="bg-transparent text-white font-mono text-[11px] focus:outline-none w-28 cursor-pointer"
                title="Start Date"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterPeriod("custom");
                }}
                className="bg-transparent text-white font-mono text-[11px] focus:outline-none w-28 cursor-pointer"
                title="End Date"
              />
            </div>

            {/* Reset Button */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                title="Reset filters to Recent Week & All Branches"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Description Sub-bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">Active Filter:</span>
            <span>
              Branch: <strong className="text-white">{selectedBranch === "all" ? "All Branches (Global)" : selectedBranch}</strong>
            </span>
            <span>•</span>
            <span>
              Date Scope:{" "}
              <strong className="text-white">
                {filterPeriod === "all" && !startDate && !endDate
                  ? "All Historical Records"
                  : filterPeriod === "today"
                  ? `Today (${todayStr})`
                  : filterPeriod === "week"
                  ? `Recent Week (${startDate || defaultWeekStart} to ${endDate || todayStr})`
                  : filterPeriod === "month"
                  ? `Recent Month (${startDate || defaultMonthStart} to ${endDate || todayStr})`
                  : `Custom (${startDate || "Beginning"} to ${endDate || "Present"})`}
              </strong>
            </span>
          </div>

          <span className="text-slate-400">
            Matching Entries: <strong className="text-emerald-400 font-bold">{totalFilteredEntries}</strong>
          </span>
        </div>
      </div>

      {/* Accordion Global Controls */}
      <div className="flex justify-between items-center bg-slate-100/70 p-2 border border-slate-200/80 rounded-xl">
        <span className="text-[10px] font-extrabold text-slate-600 font-mono uppercase tracking-wider pl-1.5 flex items-center gap-1.5">
          <Grid size={13} className="text-slate-400" />
          Registers Directory ({categoriesConfig.length} Categories • {allSubTabs.length} Sub-Registers)
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-250 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition shadow-3xs cursor-pointer"
          >
            Expand All Tabs
          </button>
          <button 
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-250 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition shadow-3xs cursor-pointer"
          >
            Collapse All Tabs
          </button>
        </div>
      </div>

      {/* Major Category Sections */}
      <div className="space-y-5">
        {categoriesConfig.map((category) => {
          const isCategoryExpanded = !!expandedCategories[category.id];
          const totalCategoryFilteredRecords = category.subTabs.reduce((sum, sub) => sum + filterRecords(sub.records).length, 0);
          const totalCategoryRawRecords = category.subTabs.reduce((sum, sub) => sum + sub.records.length, 0);
          const totalCategoryToday = category.subTabs.reduce((sum, sub) => sum + getStats(sub.records, sub.id).thisDay, 0);
          const totalCategoryWeek = category.subTabs.reduce((sum, sub) => sum + getStats(sub.records, sub.id).weeklyCount, 0);

          return (
            <div 
              key={category.id} 
              className="bg-slate-50/30 border border-slate-200/90 rounded-2xl overflow-hidden shadow-3xs transition-all duration-200"
            >
              {/* Category Header Panel */}
              <div 
                onClick={() => toggleCategory(category.id)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/80 border-b border-slate-200 hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs uppercase font-mono tracking-wider ${category.bgColor}`}>
                    {category.id}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                      {category.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-1.5 truncate">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono font-bold text-slate-600">
                    <span>
                      {totalCategoryFilteredRecords} in filter 
                      <span className="text-slate-400 font-normal"> ({totalCategoryRawRecords} total)</span>
                    </span>
                    {totalCategoryWeek > 0 && (
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-150">
                        +{totalCategoryWeek} this week
                      </span>
                    )}
                    {totalCategoryToday > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        +{totalCategoryToday} today
                      </span>
                    )}
                  </div>
                  <div className="p-1 rounded-md bg-white border border-slate-200/80 text-slate-500 shadow-3xs">
                    {isCategoryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Grid Inside Category */}
              {isCategoryExpanded ? (
                <div className="p-4 space-y-4">
                  {category.subTabs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center font-mono">No registers defined here.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {category.subTabs.map((sub) => {
                        const subStats = getStats(sub.records, sub.id);
                        const isTabExpanded = !!expandedTabs[sub.id];
                        const TabIcon = sub.icon;
                        const recentEntries = getRecentEntries(sub.records);
                        const isOfficeExp = sub.id === "office_exp";

                        return (
                          <div 
                            key={sub.id}
                            className={`bg-white border transition-all duration-200 rounded-xl overflow-hidden shadow-3xs ${
                              isTabExpanded ? "border-slate-350 ring-1 ring-slate-100" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {/* Sub-Tab Header Row */}
                            <div 
                              onClick={() => toggleTab(sub.id)}
                              className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/10 hover:bg-slate-50/50 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 rounded-lg border ${sub.bgColor} shrink-0`}>
                                  <TabIcon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-extrabold text-slate-900 tracking-tight leading-none">
                                    {sub.label}
                                  </h4>
                                  <span className="text-[9px] font-bold text-slate-500 font-mono mt-1 inline-block leading-none tracking-wider">
                                    {subStats.totalFilteredCount} ENTRIES MATCHING FILTER • {subStats.total} IN BRANCH
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {subStats.weeklyCount > 0 && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-indigo-150">
                                    +{subStats.weeklyCount} weekly
                                  </span>
                                )}
                                {subStats.thisDay > 0 && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-150">
                                    +{subStats.thisDay} today
                                  </span>
                                )}
                                <div className="p-0.5 rounded text-slate-400">
                                  {isTabExpanded ? (
                                    <ChevronUp size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Sub-Tab Collapsible Stats */}
                            {isTabExpanded && (
                              <div className="border-t border-slate-150 p-4 space-y-4 bg-slate-50/20">
                                {/* 3 Metrics Cards Grid: This Day, Weekly, Monthly */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                  
                                  {/* Card 1: THIS DAY */}
                                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col justify-between gap-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`p-2 rounded-lg shrink-0 ${
                                          subStats.thisDay > 0 
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" 
                                            : "bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                                        }`}>
                                          <Calendar size={15} />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 dark:text-slate-500 text-[8px] font-extrabold uppercase tracking-widest font-mono block leading-none">
                                            This Day (Today)
                                          </span>
                                          <span className={`text-base font-black font-mono block mt-1.5 leading-none ${
                                            subStats.thisDay > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
                                          }`}>
                                            {subStats.thisDay} {subStats.thisDay === 1 ? "entry" : "entries"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Total Amount for Today */}
                                      {subStats.thisDay > 0 ? (
                                        <div className="text-right shrink-0">
                                          <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block leading-none">
                                            Total Amount
                                          </span>
                                          <span className={`text-xs font-black font-mono inline-block mt-1 px-1.5 py-0.5 rounded border ${
                                            subStats.thisDayEffectiveAmount < 0 
                                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" 
                                              : subStats.thisDayEffectiveAmount > 0 
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" 
                                              : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                          }`}>
                                            {subStats.thisDayEffectiveAmount < 0 
                                              ? `-₹${Math.abs(subStats.thisDayEffectiveAmount).toLocaleString("en-IN")}` 
                                              : `₹${subStats.thisDayEffectiveAmount.toLocaleString("en-IN")}`}
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-0.5">
                                      <span>
                                        Gross Today: ₹{subStats.thisDayRawAmount.toLocaleString("en-IN")}
                                      </span>
                                      <span className="font-bold text-slate-600 dark:text-slate-300">
                                        Net: {subStats.thisDayEffectiveAmount < 0 ? `-₹${Math.abs(subStats.thisDayEffectiveAmount).toLocaleString("en-IN")}` : `₹${subStats.thisDayEffectiveAmount.toLocaleString("en-IN")}`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Card 2: WEEKLY (Recent Week / Filtered Week) */}
                                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col justify-between gap-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`p-2 rounded-lg shrink-0 ${
                                          subStats.weeklyCount > 0 
                                            ? "bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800" 
                                            : "bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                                        }`}>
                                          <Activity size={15} />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 dark:text-slate-500 text-[8px] font-extrabold uppercase tracking-widest font-mono block leading-none">
                                            Weekly (7 Days)
                                          </span>
                                          <span className={`text-base font-black font-mono block mt-1.5 leading-none ${
                                            subStats.weeklyCount > 0 ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"
                                          }`}>
                                            {subStats.weeklyCount} {subStats.weeklyCount === 1 ? "entry" : "entries"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Total Amount for Weekly */}
                                      {subStats.weeklyCount > 0 ? (
                                        <div className="text-right shrink-0">
                                          <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block leading-none">
                                            Weekly Total
                                          </span>
                                          <span className={`text-xs font-black font-mono inline-block mt-1 px-1.5 py-0.5 rounded border ${
                                            subStats.weeklyEffectiveAmount < 0 
                                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" 
                                              : subStats.weeklyEffectiveAmount > 0 
                                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800" 
                                              : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                          }`}>
                                            {subStats.weeklyEffectiveAmount < 0 
                                              ? `-₹${Math.abs(subStats.weeklyEffectiveAmount).toLocaleString("en-IN")}` 
                                              : `₹${subStats.weeklyEffectiveAmount.toLocaleString("en-IN")}`}
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-0.5">
                                      <span>
                                        Avg: {subStats.avgWeekly.toFixed(1)}/wk • Gross: ₹{subStats.weeklyRawAmount.toLocaleString("en-IN")}
                                      </span>
                                      <span className="font-bold text-slate-600 dark:text-slate-300">
                                        Net: {subStats.weeklyEffectiveAmount < 0 ? `-₹${Math.abs(subStats.weeklyEffectiveAmount).toLocaleString("en-IN")}` : `₹${subStats.weeklyEffectiveAmount.toLocaleString("en-IN")}`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Card 3: MONTHLY (Recent Month / Filtered Month) */}
                                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col justify-between gap-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`p-2 rounded-lg shrink-0 ${
                                          subStats.monthlyCount > 0 
                                            ? "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" 
                                            : "bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                                        }`}>
                                          <Landmark size={15} />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 dark:text-slate-500 text-[8px] font-extrabold uppercase tracking-widest font-mono block leading-none">
                                            Monthly (30 Days)
                                          </span>
                                          <span className={`text-base font-black font-mono block mt-1.5 leading-none ${
                                            subStats.monthlyCount > 0 ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"
                                          }`}>
                                            {subStats.monthlyCount} {subStats.monthlyCount === 1 ? "entry" : "entries"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Total Amount for Monthly */}
                                      {subStats.monthlyCount > 0 ? (
                                        <div className="text-right shrink-0">
                                          <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block leading-none">
                                            Monthly Total
                                          </span>
                                          <span className={`text-xs font-black font-mono inline-block mt-1 px-1.5 py-0.5 rounded border ${
                                            subStats.monthlyEffectiveAmount < 0 
                                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" 
                                              : subStats.monthlyEffectiveAmount > 0 
                                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" 
                                              : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                          }`}>
                                            {subStats.monthlyEffectiveAmount < 0 
                                              ? `-₹${Math.abs(subStats.monthlyEffectiveAmount).toLocaleString("en-IN")}` 
                                              : `₹${subStats.monthlyEffectiveAmount.toLocaleString("en-IN")}`}
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-0.5">
                                      <span>
                                        Avg: {subStats.avgMonthly.toFixed(1)}/mo • Gross: ₹{subStats.monthlyRawAmount.toLocaleString("en-IN")}
                                      </span>
                                      <span className="font-bold text-slate-600 dark:text-slate-300">
                                        Net: {subStats.monthlyEffectiveAmount < 0 ? `-₹${Math.abs(subStats.monthlyEffectiveAmount).toLocaleString("en-IN")}` : `₹${subStats.monthlyEffectiveAmount.toLocaleString("en-IN")}`}
                                      </span>
                                    </div>
                                  </div>

                                </div>

                                {/* Recent Register Activity Entries Matching Filters */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
                                  <h5 className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                      Recent Activity Logs (Filtered by Active Branch & Dates)
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-normal">
                                      Showing top {recentEntries.length} items
                                    </span>
                                  </h5>

                                  {recentEntries.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-4 font-mono">
                                      No entries recorded matching the selected branch and date filter.
                                    </p>
                                  ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {recentEntries.map((item) => {
                                        const cleanDate = getRecordDate(item);
                                        const recordBranch = getRecordBranch(item);
                                        const effAmt = getRecordEffectiveAmount(item, sub.id);

                                        return (
                                          <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-[11px]">
                                            <div className="min-w-0 flex items-center gap-2.5">
                                              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg text-slate-500 shrink-0">
                                                <Check size={11} />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                                                  {getRecordSummary(category.id, sub.id, item)}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                                  <span className="flex items-center gap-1">
                                                    <UserIcon size={9} className="shrink-0" />
                                                    <span>{item.createdByName || "System User"}</span>
                                                  </span>
                                                  {recordBranch && (
                                                    <>
                                                      <span>•</span>
                                                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                                        {recordBranch}
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                              {effAmt !== 0 && (
                                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                                  effAmt < 0
                                                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                                }`}>
                                                  {effAmt < 0 ? `-₹${Math.abs(effAmt).toLocaleString("en-IN")}` : `+₹${effAmt.toLocaleString("en-IN")}`}
                                                </span>
                                              )}
                                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                                                {cleanDate}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {activeUser.role === Role.Admin && <AdminDriveSettings activeUser={activeUser} />}
    </div>
  );
}
