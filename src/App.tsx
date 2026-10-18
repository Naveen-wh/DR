/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { TABS_CONFIG } from "./constants/tabs";
import { User, ProjectWorkflow, SalesTask, ActionLog, Role, AccessLevel, TeamTabSettings, Client, Team, Product, OrderOffer, PaymentBank, ProductCategory, ProductGroup, Manufacturer, FreightTerm, TransporterName, WarehouseManagedBy, DispatchLocation, AolBranchName, SupplierName, ClearingCat, ImportPiRecord, ImportLcRecord, ImportEtaRecord, ImportBoeRecord, ImportContainerRecord, ImportClearingRecord, ImportDrcRecord, ImportTptiRecord, ImportCiRecord, DrcBankChargesType, DrcBankCharges1, AolGodown, DomesticSupplierName, ShipToParty, DomesticPdRecord, DomesticTptdRecord, TptdCategory, PidRecord, AccountsStRecord, OpeningStockRecord, AccountsSalesRecord, AccountsDrumingRecord, ExpenseLedgerItem, AccountsOfficeExpRecord, AccountsMeisRecord, OtherIncomeLedgerItem, AccountsOtherIncomeRecord, AccountsFdrRecord, AccountsCsdIsdRecord, AccountsTptSRecord, AccountsTptStRecord, LedgerCrDrCategory, AccountsSupplierCrDrRecord, AccountsCustomerCrDrRecord } from "./types";

// Firebase imports
import { auth, signOut, onAuthStateChanged } from "./firebase";
import { 
  seedDatabaseIfEmpty, 
  subscribeCollection, 
  saveTask, 
  deleteTaskDoc, 
  updateUserDetails,
  saveUserDoc,
  deleteUserDoc,
  syncUserProfile,
  saveTeamTabSettings,
  saveClient,
  deleteClientDoc,
  saveTeam,
  deleteTeamDoc,
  saveProduct,
  deleteProductDoc,
  saveOrder,
  deleteOrderDoc,
  savePaymentBank,
  deletePaymentBankDoc,
  saveProductCategory,
  deleteProductCategoryDoc,
  saveProductGroup,
  deleteProductGroupDoc,
  saveManufacturer,
  deleteManufacturerDoc,
  saveFreightTerm,
  deleteFreightTermDoc,
  saveTransporter,
  deleteTransporterDoc,
  saveWarehouse,
  deleteWarehouseDoc,
  saveDispatchLocation,
  deleteDispatchLocationDoc,
  isAuditLogEnabled,
  setAuditLogEnabled,
  saveAolBranch,
  deleteAolBranchDoc,
  saveSupplier,
  deleteSupplierDoc,
  saveClearingCat,
  deleteClearingCatDoc,
  saveDrcBankChargesType,
  deleteDrcBankChargesType,
  saveDrcBankCharges1,
  deleteDrcBankCharges1,
  saveAolGodown,
  deleteAolGodownDoc,
  saveDomesticSupplier,
  deleteDomesticSupplierDoc,
  saveShipToParty,
  deleteShipToPartyDoc,
  saveTptdCategory,
  deleteTptdCategoryDoc,
  mapAccountsStToPid,
  saveExpenseLedger,
  deleteExpenseLedgerDoc,
  saveOtherIncomeLedger,
  deleteOtherIncomeLedgerDoc,
  mapOpeningStockToPid,
  saveLedgerCrDr,
  deleteLedgerCrDrDoc,
  BOOTSTRAP_ADMIN_EMAILS
} from "./lib/firebaseService";

import {
  fetchOperationalSheetData,
  syncOperationalAction,
  clearOperationalSheetRecords,
  OPERATIONAL_COLLECTIONS
} from "./lib/operationalSheetsService";

// Sub-components
import ListManagementView from "./components/ListManagementView";
import ClientsView from "./components/ClientsView";
import AuthScreen from "./components/AuthScreen";
import PendingApprovalScreen from "./components/PendingApprovalScreen";
import DashboardView from "./components/DashboardView";
import ImportView from "./components/import/ImportView";
import DomesticView from "./components/Domestic/DomesticView";
import AccountsView from "./components/Accounts/AccountsView";
import ProductsView from "./components/ProductsView";
import TeamDirectoryView from "./components/TeamDirectoryView";
import AuditLogsView from "./components/AuditLogsView";
import BackendView from "./components/BackendView";
import AdminView from "./components/AdminView";
import { FontSizeToggle } from "./components/FontSizeToggle";

// Lucide Icons
import {
  LayoutDashboard,
  Coins,
  Folders,
  Users2,
  FileClock,
  Briefcase,
  LogOut,
  Shield,
  ShieldCheck,
  Mail,
  Loader2,
  Package,
  ShoppingBag,
  Receipt,
  TrendingUp,
  Download,
  Database,
  Landmark,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Theme state (dark / light mode) with localStorage persistence
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const savedTheme = localStorage.getItem("app_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("app_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("app_theme", "light");
      }
    } catch (e) {
      console.error("Theme sync error:", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Collection states
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [tabSettings, setTabSettings] = useState<TeamTabSettings[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [orders, setOrders] = useState<OrderOffer[]>([]);
  const [paymentBanks, setPaymentBanks] = useState<PaymentBank[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [freightTerms, setFreightTerms] = useState<FreightTerm[]>([]);
  const [transporters, setTransporters] = useState<TransporterName[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseManagedBy[]>([]);
  const [dispatchLocations, setDispatchLocations] = useState<DispatchLocation[]>([]);
  const [aolBranches, setAolBranches] = useState<AolBranchName[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierName[]>([]);
  const [clearingCats, setClearingCats] = useState<ClearingCat[]>([]);
  const [importPis, setImportPis] = useState<ImportPiRecord[]>([]);
  const [importLcs, setImportLcs] = useState<ImportLcRecord[]>([]);
  const [importEtas, setImportEtas] = useState<ImportEtaRecord[]>([]);
  const [importBoes, setImportBoes] = useState<ImportBoeRecord[]>([]);
  const [importContainers, setImportContainers] = useState<ImportContainerRecord[]>([]);
  const [importClearings, setImportClearings] = useState<ImportClearingRecord[]>([]);
  const [importProvisionalClearings, setImportProvisionalClearings] = useState<ImportClearingRecord[]>([]);
  const [importDrcs, setImportDrcs] = useState<ImportDrcRecord[]>([]);
  const [importTptis, setImportTptis] = useState<ImportTptiRecord[]>([]);
  const [importCis, setImportCis] = useState<ImportCiRecord[]>([]);
  const [drcBankChargesTypes, setDrcBankChargesTypes] = useState<DrcBankChargesType[]>([]);
  const [drcBankCharges1List, setDrcBankCharges1List] = useState<DrcBankCharges1[]>([]);
  const [aolGodowns, setAolGodowns] = useState<AolGodown[]>([]);
  const [domesticSuppliers, setDomesticSuppliers] = useState<DomesticSupplierName[]>([]);
  const [shipToParties, setShipToParties] = useState<ShipToParty[]>([]);
  const [domesticPds, setDomesticPds] = useState<DomesticPdRecord[]>([]);
  const [pids, setPids] = useState<PidRecord[]>([]);
  const [domesticTptds, setDomesticTptds] = useState<DomesticTptdRecord[]>([]);
  const [tptdCategories, setTptdCategories] = useState<TptdCategory[]>([]);
  const [ledgerCrDrs, setLedgerCrDrs] = useState<LedgerCrDrCategory[]>([]);
  const [accountsSupplierCrDrs, setAccountsSupplierCrDrs] = useState<AccountsSupplierCrDrRecord[]>([]);
  const [accountsCustomerCrDrs, setAccountsCustomerCrDrs] = useState<AccountsCustomerCrDrRecord[]>([]);
  const [accountsSts, setAccountsSts] = useState<AccountsStRecord[]>([]);
  const [accountsSales, setAccountsSales] = useState<AccountsSalesRecord[]>([]);
  const [accountsDrumings, setAccountsDrumings] = useState<AccountsDrumingRecord[]>([]);
  const [expenseLedgers, setExpenseLedgers] = useState<ExpenseLedgerItem[]>([]);
  const [accountsOfficeExps, setAccountsOfficeExps] = useState<AccountsOfficeExpRecord[]>([]);
  const [accountsMeis, setAccountsMeis] = useState<AccountsMeisRecord[]>([]);
  const [otherIncomeLedgers, setOtherIncomeLedgers] = useState<OtherIncomeLedgerItem[]>([]);
  const [accountsOtherIncomes, setAccountsOtherIncomes] = useState<AccountsOtherIncomeRecord[]>([]);
  const [accountsFdrs, setAccountsFdrs] = useState<AccountsFdrRecord[]>([]);
  const [accountsCsdIsds, setAccountsCsdIsds] = useState<AccountsCsdIsdRecord[]>([]);
  const [accountsTpts, setAccountsTpts] = useState<AccountsTptSRecord[]>([]);
  const [accountsTptSts, setAccountsTptSts] = useState<AccountsTptStRecord[]>([]);
  const [openingStocks, setOpeningStocks] = useState<OpeningStockRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isAuditLogEnabledState, setIsAuditLogEnabledState] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStatus() {
      const enabled = await isAuditLogEnabled();
      setIsAuditLogEnabledState(enabled);
    }
    fetchStatus();
  }, []);

  const handleToggleAuditLog = async (enabled: boolean) => {
    await setAuditLogEnabled(enabled);
    setIsAuditLogEnabledState(enabled);
  };

  // Action Audit Log - saved and synced to Google Sheets via Apps Script deployed URL
  const saveLog = async (logData: ActionLog) => {
    if (!isAuditLogEnabledState) return;
    setLogs((prev) => [logData, ...prev.filter((l) => l.id !== logData.id)]);
    syncOperationalAction("ADD", "logs", logData, "Audit Logs", "audit_logs_apps_script");
  };

  // Initial Seed & Auth Connection
  useEffect(() => {
    const handleAuthSetup = async () => {
      setAuthLoading(true);

      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser?.email) {
          try {
            // Seed firestore if empty (safely checks first, fully authenticated now)
            await seedDatabaseIfEmpty();

            const profile = await syncUserProfile(
              firebaseUser.email,
              firebaseUser.displayName || "",
              firebaseUser.photoURL || undefined
            );
            setActiveUserId(profile.id);
            setFirestoreError(null);
            setIsAuthenticated(true);
          } catch (err: any) {
            console.error("Error establishing authenticated profile user:", err);
            setFirestoreError(err?.message || String(err));
            setIsAuthenticated(false);
          } finally {
            setAuthLoading(false);
          }
        } else {
          setIsAuthenticated(false);
          setActiveUserId("");
          setAuthLoading(false);
        }
      });

      return unsubscribeAuth;
    };

    let unsubAuthPromise = handleAuthSetup();

    // Fallback safety timer to ensure auth loading never hangs indefinitely
    const fallbackTimer = setTimeout(() => {
      setAuthLoading((loading) => {
        if (loading) {
          console.warn("[Firebase] Auth state listener timeout fallback triggered.");
          return false;
        }
        return false;
      });
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
      unsubAuthPromise.then((unsub) => {
        if (unsub) unsub();
      });
    };
  }, []);

  // State to track Google Sheets initial load status
  const [isSheetsInitialLoading, setIsSheetsInitialLoading] = useState(false);
  const [sheetsLoadMessage, setSheetsLoadMessage] = useState<string>("");

  // Function to load all operational data from Google Sheets via Apps Script deployed URL
  const loadAllOperationalDataFromGoogleSheets = async () => {
    setIsSheetsInitialLoading(true);
    setSheetsLoadMessage("Connecting to Google Sheets via Apps Script...");

    try {
      // Parallel loading of all operational tables from Google Sheets
      const [
        loadedPis,
        loadedLcs,
        loadedEtas,
        loadedBoes,
        loadedContainers,
        loadedClearings,
        loadedProvisionalClearings,
        loadedDrcs,
        loadedTptis,
        loadedCis,
        loadedDomesticPds,
        loadedDomesticTptds,
        loadedAccountsSts,
        loadedAccountsSales,
        loadedAccountsDrumings,
        loadedAccountsOfficeExps,
        loadedAccountsMeis,
        loadedAccountsOtherIncomes,
        loadedAccountsFdrs,
        loadedAccountsCsdIsds,
        loadedAccountsTpts,
        loadedAccountsTptSts,
        loadedOpeningStocks,
        loadedSupplierCrDrs,
        loadedCustomerCrDrs,
        loadedPids,
        loadedLogs
      ] = await Promise.all([
        fetchOperationalSheetData("import_pis", "Import PIs", "import_pi_config"),
        fetchOperationalSheetData("import_lcs", "Import LCs", "import_lcs_apps_script"),
        fetchOperationalSheetData("import_etas", "Import ETAs", "import_etas_apps_script"),
        fetchOperationalSheetData("import_boes", "Import BOEs", "import_boes_apps_script"),
        fetchOperationalSheetData("import_containers", "Import Containers", "import_containers_apps_script"),
        fetchOperationalSheetData("import_clearings", "Import Clearings", "import_clearings_apps_script"),
        fetchOperationalSheetData("import_provisional_clearings", "Provisional Clearings", "import_clearings_apps_script"),
        fetchOperationalSheetData("import_drcs", "Import DRCs", "import_drcs_apps_script"),
        fetchOperationalSheetData("import_tptis", "Import TPTIs", "import_tptis_apps_script"),
        fetchOperationalSheetData("import_cis", "Import CIs", "import_cis_apps_script"),
        fetchOperationalSheetData("domestic_pds", "Domestic PDs", "domestic_pds_apps_script"),
        fetchOperationalSheetData("domestic_tptds", "Domestic TPTDs", "domestic_tptds_apps_script"),
        fetchOperationalSheetData("accounts_sts", "Accounts ST", "accounts_sts_apps_script"),
        fetchOperationalSheetData("accounts_sales", "Accounts Sales", "accounts_sales_apps_script"),
        fetchOperationalSheetData("accounts_drumings", "Accounts Drumming", "accounts_drumings_apps_script"),
        fetchOperationalSheetData("accounts_office_exps", "Office Expenses", "accounts_office_exps_apps_script"),
        fetchOperationalSheetData("accounts_meis", "Accounts MEIS", "accounts_meis_apps_script"),
        fetchOperationalSheetData("accounts_other_incomes", "Other Income", "accounts_other_incomes_apps_script"),
        fetchOperationalSheetData("accounts_fdrs", "Accounts FDR", "accounts_fdrs_apps_script"),
        fetchOperationalSheetData("accounts_csd_isd", "Accounts CSD ISD", "accounts_csd_isd_apps_script"),
        fetchOperationalSheetData("accounts_tpt_s", "Accounts TPT S", "accounts_tpt_s_apps_script"),
        fetchOperationalSheetData("accounts_tpt_st", "Accounts TPT ST", "accounts_tpt_st_apps_script"),
        fetchOperationalSheetData("opening_stocks", "Opening Stocks", "opening_stocks_apps_script"),
        fetchOperationalSheetData("accounts_supplier_cr_dr", "Supplier Cr Dr", "accounts_supplier_cr_dr_apps_script"),
        fetchOperationalSheetData("accounts_customer_cr_dr", "Customer Cr Dr", "accounts_customer_cr_dr_apps_script"),
        fetchOperationalSheetData("pids", "PIDs", "pids_apps_script"),
        fetchOperationalSheetData("logs", "Audit Logs", "audit_logs_apps_script")
      ]);

      if (loadedPis.length > 0) setImportPis(loadedPis);
      if (loadedLcs.length > 0) setImportLcs(loadedLcs);
      if (loadedEtas.length > 0) setImportEtas(loadedEtas);
      if (loadedBoes.length > 0) setImportBoes(loadedBoes);
      if (loadedContainers.length > 0) setImportContainers(loadedContainers);
      if (loadedClearings.length > 0) setImportClearings(loadedClearings);
      if (loadedProvisionalClearings.length > 0) setImportProvisionalClearings(loadedProvisionalClearings);
      if (loadedDrcs.length > 0) setImportDrcs(loadedDrcs);
      if (loadedTptis.length > 0) setImportTptis(loadedTptis);
      if (loadedCis.length > 0) setImportCis(loadedCis);
      if (loadedDomesticPds.length > 0) setDomesticPds(loadedDomesticPds);
      if (loadedDomesticTptds.length > 0) setDomesticTptds(loadedDomesticTptds);
      if (loadedAccountsSts.length > 0) setAccountsSts(loadedAccountsSts);
      if (loadedAccountsSales.length > 0) setAccountsSales(loadedAccountsSales);
      if (loadedAccountsDrumings.length > 0) setAccountsDrumings(loadedAccountsDrumings);
      if (loadedAccountsOfficeExps.length > 0) setAccountsOfficeExps(loadedAccountsOfficeExps);
      if (loadedAccountsMeis.length > 0) setAccountsMeis(loadedAccountsMeis);
      if (loadedAccountsOtherIncomes.length > 0) setAccountsOtherIncomes(loadedAccountsOtherIncomes);
      if (loadedAccountsFdrs.length > 0) setAccountsFdrs(loadedAccountsFdrs);
      if (loadedAccountsCsdIsds.length > 0) setAccountsCsdIsds(loadedAccountsCsdIsds);
      if (loadedAccountsTpts.length > 0) setAccountsTpts(loadedAccountsTpts);
      if (loadedAccountsTptSts.length > 0) setAccountsTptSts(loadedAccountsTptSts);
      if (loadedOpeningStocks.length > 0) setOpeningStocks(loadedOpeningStocks);
      if (loadedSupplierCrDrs.length > 0) setAccountsSupplierCrDrs(loadedSupplierCrDrs);
      if (loadedCustomerCrDrs.length > 0) setAccountsCustomerCrDrs(loadedCustomerCrDrs);
      if (loadedPids.length > 0) setPids(loadedPids);
      if (loadedLogs.length > 0) setLogs(loadedLogs);

      setSheetsLoadMessage("Operational and Audit Log data synchronized from Google Sheets");
    } catch (err: any) {
      console.error("Failed loading data from Google Sheets:", err);
      setSheetsLoadMessage(`Google Sheets load note: ${err?.message || "Using current data"}`);
    } finally {
      setIsSheetsInitialLoading(false);
    }
  };

  // Setup Firestore listener subscriptions for Settings, Users, Workflows, and List Management master tables
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log("[Firebase] Setting up Firestore subscriptions for Users, Settings & Master Lists...");
    const unsubUsers = subscribeCollection<User>("users", setUsers);
    const unsubWorkflows = subscribeCollection<ProjectWorkflow>("workflows", setWorkflows);
    const unsubProducts = subscribeCollection<Product>("products", setProducts, "createdAt");
    const unsubTasks = subscribeCollection<SalesTask>("tasks", setTasks);
    const unsubTabSettings = subscribeCollection<TeamTabSettings>("tabSettings", setTabSettings);
    const unsubClients = subscribeCollection<Client>("clients", setClients, "createdAt");
    const unsubTeams = subscribeCollection<Team>("teams", setTeams, "createdAt");
    const unsubPaymentBanks = subscribeCollection<PaymentBank>("payment_banks", setPaymentBanks, "createdAt");
    const unsubProductCategories = subscribeCollection<ProductCategory>("product_categories", setProductCategories, "createdAt");
    const unsubProductGroups = subscribeCollection<ProductGroup>("product_groups", setProductGroups, "createdAt");
    const unsubManufacturers = subscribeCollection<Manufacturer>("manufacturers", setManufacturers, "createdAt");
    const unsubFreightTerms = subscribeCollection<FreightTerm>("freight_terms", setFreightTerms, "createdAt");
    const unsubTransporters = subscribeCollection<TransporterName>("transporters", setTransporters, "createdAt");
    const unsubWarehouses = subscribeCollection<WarehouseManagedBy>("warehouses", setWarehouses, "createdAt");
    const unsubDispatchLocations = subscribeCollection<DispatchLocation>("dispatch_locations", setDispatchLocations, "createdAt");
    const unsubAolBranches = subscribeCollection<AolBranchName>("aol_branches", setAolBranches, "createdAt");
    const unsubSuppliers = subscribeCollection<SupplierName>("suppliers", setSuppliers, "createdAt");
    const unsubClearingCats = subscribeCollection<ClearingCat>("clearing_cats", setClearingCats, "createdAt");
    const unsubDrcBankChargesTypes = subscribeCollection<DrcBankChargesType>("drc_bank_charges_types", setDrcBankChargesTypes, "createdAt");
    const unsubDrcBankCharges1 = subscribeCollection<DrcBankCharges1>("drc_bank_charges_1", setDrcBankCharges1List, "createdAt");
    const unsubAolGodowns = subscribeCollection<AolGodown>("aol_godowns", setAolGodowns, "createdAt");
    const unsubDomesticSuppliers = subscribeCollection<DomesticSupplierName>("domestic_suppliers", setDomesticSuppliers, "createdAt");
    const unsubShipToParties = subscribeCollection<ShipToParty>("ship_to_parties", setShipToParties, "createdAt");
    const unsubTptdCategories = subscribeCollection<TptdCategory>("tptd_categories", setTptdCategories, "createdAt");
    const unsubExpenseLedgers = subscribeCollection<ExpenseLedgerItem>("expense_ledgers", setExpenseLedgers, "createdAt");
    const unsubOtherIncomeLedgers = subscribeCollection<OtherIncomeLedgerItem>("other_income_ledgers", setOtherIncomeLedgers, "createdAt");
    const unsubLedgerCrDrs = subscribeCollection<LedgerCrDrCategory>("ledger_cr_dr", setLedgerCrDrs, "createdAt");

    // Load operational data from Google Sheets right after Firestore users/settings
    loadAllOperationalDataFromGoogleSheets();

    return () => {
      unsubUsers();
      unsubWorkflows();
      unsubProducts();
      unsubTasks();
      unsubTabSettings();
      unsubClients();
      unsubTeams();
      unsubPaymentBanks();
      unsubProductCategories();
      unsubProductGroups();
      unsubManufacturers();
      unsubFreightTerms();
      unsubTransporters();
      unsubWarehouses();
      unsubDispatchLocations();
      unsubAolBranches();
      unsubSuppliers();
      unsubClearingCats();
      unsubDrcBankChargesTypes();
      unsubDrcBankCharges1();
      unsubAolGodowns();
      unsubDomesticSuppliers();
      unsubShipToParties();
      unsubTptdCategories();
      unsubExpenseLedgers();
      unsubOtherIncomeLedgers();
      unsubLedgerCrDrs();
    };
  }, [isAuthenticated]);

  // Derive current user reference object
  const activeUser = users.find((u) => 
    u.id.toLowerCase() === activeUserId.toLowerCase() ||
    (u.email && u.email.toLowerCase() === activeUserId.toLowerCase())
  ) || {
    id: activeUserId || "unknown",
    name: "Standard Contributor",
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    email: activeUserId || "",
    teamName: "Sales Development",
    targetQuota: 30000,
    avatarUrl: "",
    status: BOOTSTRAP_ADMIN_EMAILS.some(a => a.toLowerCase() === activeUserId.toLowerCase()) ? "active" : "pending"
  };

  // Tab permissions configuration matching
  const isUserAdmin = activeUser.role === Role.Admin;
  const userTeamSetting = tabSettings.find(
    (s) => s.teamName.toLowerCase() === activeUser.teamName.toLowerCase()
  );

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "import_module", label: "Import", icon: Download },
    { id: "domestic_tab", label: "Domestic", icon: Briefcase },
    { id: "accounts_tab", label: "Accounts", icon: Landmark },
    { id: "backend", label: "Backend", icon: Database },
    { id: "admin", label: "Admin", icon: ShieldCheck },
    { id: "list_management", label: "List Management", icon: Folders },
    { id: "team", label: "Hierarchy & Team", icon: Users2 },
    { id: "logs", label: "Audit Log Trial", icon: FileClock },
  ];

  const allCollectionsData = React.useMemo(() => ({
    import_pis: importPis,
    import_lcs: importLcs,
    import_etas: importEtas,
    import_boes: importBoes,
    import_containers: importContainers,
    import_clearings: importClearings,
    import_provisional_clearings: importProvisionalClearings,
    import_cis: importCis,
    import_drcs: importDrcs,
    import_tptis: importTptis,
    domestic_pds: domesticPds,
    domestic_tptds: domesticTptds,
    accounts_sts: accountsSts,
    accounts_sales: accountsSales,
    accounts_drumings: accountsDrumings,
    accounts_office_exps: accountsOfficeExps,
    accounts_meis: accountsMeis,
    accounts_other_incomes: accountsOtherIncomes,
    accounts_fdrs: accountsFdrs,
    accounts_csd_isd: accountsCsdIsds,
    accounts_tpt_s: accountsTpts,
    accounts_tpt_st: accountsTptSts,
    accounts_supplier_cr_dr: accountsSupplierCrDrs,
    accounts_customer_cr_dr: accountsCustomerCrDrs,
    opening_stocks: openingStocks,
    pids: pids,
    logs: logs,
    users,
    clients,
    products,
    teams
  }), [
    importPis, importLcs, importEtas, importBoes, importContainers, importClearings,
    importProvisionalClearings, importCis, importDrcs, importTptis, domesticPds,
    domesticTptds, accountsSts, accountsSales, accountsDrumings, accountsOfficeExps,
    accountsMeis, accountsOtherIncomes, accountsFdrs, accountsCsdIsds, accountsTpts,
    accountsTptSts, accountsSupplierCrDrs, accountsCustomerCrDrs, openingStocks,
    pids, logs, users, clients, products, teams
  ]);

  const getTabPermission = React.useCallback((tabId: string, permissionType: "view" | "add" | "edit"): boolean => {
    if (isUserAdmin) return true;
    if (!userTeamSetting) return true;

    if (tabId.includes("/")) {
      const [parent, child] = tabId.split("/");
      const isParentVisible = userTeamSetting.visibleTabs.includes(parent);
      const isParentPermitted = userTeamSetting.permissions?.[parent]?.view !== false;
      if (!isParentVisible || !isParentPermitted) return false;

      const isChildInSubTabs = userTeamSetting.visibleSubTabs?.[parent]
        ? userTeamSetting.visibleSubTabs[parent].includes(child)
        : true;
      const isChildPermitted = userTeamSetting.permissions?.[tabId]?.[permissionType] !== undefined
        ? userTeamSetting.permissions[tabId][permissionType]
        : true;

      return isChildInSubTabs && isChildPermitted;
    } else {
      const isParentVisible = userTeamSetting.visibleTabs.includes(tabId);
      const isParentPermitted = userTeamSetting.permissions?.[tabId]?.[permissionType] !== undefined
        ? userTeamSetting.permissions[tabId][permissionType]
        : true;

      if (permissionType === "view") {
        if (!isParentVisible || !isParentPermitted) return false;
        const tabConfig = TABS_CONFIG.find((t) => t.id === tabId);
        if (tabConfig?.subTabs && tabConfig.subTabs.length > 0) {
          const hasAnySubTabVisible = tabConfig.subTabs.some((st) => {
            const subId = `${tabId}/${st.id}`;
            const subInSubTabs = userTeamSetting.visibleSubTabs?.[tabId]
              ? userTeamSetting.visibleSubTabs[tabId].includes(st.id)
              : true;
            const subPermitted = userTeamSetting.permissions?.[subId]?.view !== false;
            return subInSubTabs && subPermitted;
          });
          if (!hasAnySubTabVisible) return false;
        }
      }

      return isParentVisible && isParentPermitted;
    }
  }, [isUserAdmin, userTeamSetting]);

  const visibleTabs = allTabs.filter((tab) => {
    if (isUserAdmin) return true;
    return getTabPermission(tab.id, "view");
  });

  const effectiveVisibleSubTabs = React.useMemo(() => {
    if (isUserAdmin || !userTeamSetting) return undefined;
    const result: { [key: string]: string[] } = {};
    TABS_CONFIG.forEach((tab) => {
      if (tab.subTabs) {
        result[tab.id] = tab.subTabs
          .filter((st) => getTabPermission(`${tab.id}/${st.id}`, "view"))
          .map((st) => st.id);
      }
    });
    return result;
  }, [isUserAdmin, userTeamSetting, getTabPermission]);

  // Safe redirect if on an unauthorized tab
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  // Sign out handle
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setActiveUserId("");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // State handlers for orders
  const handleAddOrder = async (newOrderData: Omit<OrderOffer, "id" | "createdAt" | "createdByUserId">) => {
    const orderId = `order-${Date.now()}`;
    const newOrder: OrderOffer = {
      ...newOrderData,
      id: orderId,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
    };
    
    await saveOrder(newOrder);
    
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Order",
      targetType: "Order",
      targetId: orderId,
      targetName: newOrder.companyName,
      details: `${activeUser.name} created sales order/offer for client "${newOrder.clientName}" at "${newOrder.companyName}" with total value of $${newOrder.totalValue.toLocaleString()}`
    });
  };

  const handleEditOrder = async (updatedOrder: OrderOffer) => {
    const oldOrder = orders.find((o) => o.id === updatedOrder.id);
    await saveOrder(updatedOrder);

    let details = `${activeUser.name} modified order for "${updatedOrder.companyName}"`;
    let actionType: ActionLog["actionType"] = "Edit Order";

    if (oldOrder) {
      const oldInvoice = oldOrder.billingDetails?.invoiceNumber;
      const newInvoice = updatedOrder.billingDetails?.invoiceNumber;
      const oldFile = oldOrder.billingDetails?.invoiceFileUrl;
      const newFile = updatedOrder.billingDetails?.invoiceFileUrl;

      if (!oldInvoice && newInvoice) {
        actionType = "Map Invoice";
        details = `${activeUser.name} mapped invoice #${newInvoice} and uploaded file "${updatedOrder.billingDetails?.invoiceFileName || 'invoice'}" for order of "${updatedOrder.companyName}"`;
      } else if (oldInvoice && newInvoice && (oldInvoice !== newInvoice || oldFile !== newFile)) {
        actionType = "Update Invoice";
        details = `${activeUser.name} updated mapped invoice for "${updatedOrder.companyName}" to #${newInvoice}`;
      } else if (oldOrder.status !== updatedOrder.status) {
        actionType = "Update Order Status";
        details = `${activeUser.name} modified order status to "${updatedOrder.status}" for "${updatedOrder.companyName}"`;
      } else if (JSON.stringify(oldOrder.closedWonDetails) !== JSON.stringify(updatedOrder.closedWonDetails)) {
        actionType = "Map Customer PO";
        details = `${activeUser.name} mapped customer PO details for "${updatedOrder.companyName}" (PO: ${updatedOrder.closedWonDetails?.customerPoNumber || 'N/A'})`;
      }
    }

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType,
      targetType: "Order",
      targetId: updatedOrder.id,
      targetName: updatedOrder.companyName,
      details
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    const orderToDelete = orders.find((o) => o.id === orderId);
    if (!orderToDelete) return;

    await deleteOrderDoc(orderId);

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Order",
      targetType: "Order",
      targetId: orderId,
      targetName: orderToDelete.companyName,
      details: `${activeUser.name} deleted sales order "${orderToDelete.companyName}"`
    });
  };

  const handleAddProductCategory = async (data: Omit<ProductCategory, "id" | "createdAt">) => {
    const categoryId = `cat-${Date.now()}`;
    await saveProductCategory({ ...data, id: categoryId, createdAt: new Date().toISOString() });
    
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Category",
      targetType: "Category",
      targetId: categoryId,
      targetName: data.name,
      details: `${activeUser.name} added new product category: "${data.name}"`
    });
  };
  const handleDeleteProductCategory = async (id: string) => {
    const category = productCategories.find(c => c.id === id);
    await deleteProductCategoryDoc(id);
    
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Category",
      targetType: "Category",
      targetId: id,
      targetName: category?.name || id,
      details: `${activeUser.name} deleted product category: "${category?.name || id}"`
    });
  };
  const handleAddProductGroup = async (data: Omit<ProductGroup, "id" | "createdAt">) => {
    const groupId = `grp-${Date.now()}`;
    await saveProductGroup({ ...data, id: groupId, createdAt: new Date().toISOString() });
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Group",
      targetType: "Group",
      targetId: groupId,
      targetName: data.name,
      details: `${activeUser.name} added new product group: "${data.name}"`
    });
  };
  const handleDeleteProductGroup = async (id: string) => {
    const group = productGroups.find(c => c.id === id);
    await deleteProductGroupDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Group",
      targetType: "Group",
      targetId: id,
      targetName: group?.name || id,
      details: `${activeUser.name} deleted product group: "${group?.name || id}"`
    });
  };
  const handleAddManufacturer = async (data: Omit<Manufacturer, "id" | "createdAt">) => {
    const manId = `man-${Date.now()}`;
    await saveManufacturer({ ...data, id: manId, createdAt: new Date().toISOString() });
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Manufacturer",
      targetType: "Manufacturer",
      targetId: manId,
      targetName: data.name,
      details: `${activeUser.name} added new manufacturer: "${data.name}"`
    });
  };
  const handleDeleteManufacturer = async (id: string) => {
    const man = manufacturers.find(c => c.id === id);
    await deleteManufacturerDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Manufacturer",
      targetType: "Manufacturer",
      targetId: id,
      targetName: man?.name || id,
      details: `${activeUser.name} deleted manufacturer: "${man?.name || id}"`
    });
  };
  const handleAddFreightTerm = async (data: Omit<FreightTerm, "id" | "createdAt">) => {
    const termId = `frt-${Date.now()}`;
    await saveFreightTerm({ ...data, id: termId, createdAt: new Date().toISOString() });
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Freight Term",
      targetType: "Freight Term",
      targetId: termId,
      targetName: data.name,
      details: `${activeUser.name} added new freight term: "${data.name}"`
    });
  };
  const handleDeleteFreightTerm = async (id: string) => {
    const term = freightTerms.find(c => c.id === id);
    await deleteFreightTermDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Freight Term",
      targetType: "Freight Term",
      targetId: id,
      targetName: term?.name || id,
      details: `${activeUser.name} deleted freight term: "${term?.name || id}"`
    });
  };
  const handleAddTransporter = async (data: Omit<TransporterName, "id" | "createdAt">) => {
    const transId = `trn-${Date.now()}`;
    await saveTransporter({ ...data, id: transId, createdAt: new Date().toISOString() });
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Transporter",
      targetType: "Transporter",
      targetId: transId,
      targetName: data.name,
      details: `${activeUser.name} added new transporter: "${data.name}"`
    });
  };
  const handleDeleteTransporter = async (id: string) => {
    const trans = transporters.find(c => c.id === id);
    await deleteTransporterDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Transporter",
      targetType: "Transporter",
      targetId: id,
      targetName: trans?.name || id,
      details: `${activeUser.name} deleted transporter: "${trans?.name || id}"`
    });
  };
  const handleAddWarehouse = async (data: Omit<WarehouseManagedBy, "id" | "createdAt">) => {
    await saveWarehouse({ ...data, id: `whs-${Date.now()}`, createdAt: new Date().toISOString() });
  };
  const handleDeleteWarehouse = async (id: string) => {
    await deleteWarehouseDoc(id);
  };
  const handleAddDispatchLocation = async (data: Omit<DispatchLocation, "id" | "createdAt">) => {
    await saveDispatchLocation({ ...data, id: `dsp-${Date.now()}`, createdAt: new Date().toISOString() });
  };
  const handleDeleteDispatchLocation = async (id: string) => {
    await deleteDispatchLocationDoc(id);
  };
  const handleAddAolBranch = async (data: Omit<AolBranchName, "id" | "createdAt">) => {
    await saveAolBranch({ ...data, id: `br-${Date.now()}`, createdAt: new Date().toISOString() });
  };
  const handleDeleteAolBranch = async (id: string) => {
    await deleteAolBranchDoc(id);
  };
  const handleAddSupplier = async (data: Omit<SupplierName, "id" | "createdAt">) => {
    await saveSupplier({ ...data, id: `sup-${Date.now()}`, createdAt: new Date().toISOString() });
  };
  const handleDeleteSupplier = async (id: string) => {
    await deleteSupplierDoc(id);
  };

  const handleEditProductCategory = async (id: string, data: Omit<ProductCategory, "id" | "createdAt">) => {
    const existing = productCategories.find(c => c.id === id);
    await saveProductCategory({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditProductGroup = async (id: string, data: Omit<ProductGroup, "id" | "createdAt">) => {
    const existing = productGroups.find(c => c.id === id);
    await saveProductGroup({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditManufacturer = async (id: string, data: Omit<Manufacturer, "id" | "createdAt">) => {
    const existing = manufacturers.find(c => c.id === id);
    await saveManufacturer({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditFreightTerm = async (id: string, data: Omit<FreightTerm, "id" | "createdAt">) => {
    const existing = freightTerms.find(c => c.id === id);
    await saveFreightTerm({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditTransporter = async (id: string, data: Omit<TransporterName, "id" | "createdAt">) => {
    const existing = transporters.find(c => c.id === id);
    await saveTransporter({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditWarehouse = async (id: string, data: Omit<WarehouseManagedBy, "id" | "createdAt">) => {
    const existing = warehouses.find(c => c.id === id);
    await saveWarehouse({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditDispatchLocation = async (id: string, data: Omit<DispatchLocation, "id" | "createdAt">) => {
    const existing = dispatchLocations.find(c => c.id === id);
    await saveDispatchLocation({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditAolBranch = async (id: string, data: Omit<AolBranchName, "id" | "createdAt">) => {
    const existing = aolBranches.find(c => c.id === id);
    await saveAolBranch({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleEditSupplier = async (id: string, data: Omit<SupplierName, "id" | "createdAt">) => {
    const existing = suppliers.find(c => c.id === id);
    await saveSupplier({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleAddClearingCat = async (data: Omit<ClearingCat, "id" | "createdAt">) => {
    await saveClearingCat({ ...data, id: `cc-${Date.now()}`, createdAt: new Date().toISOString() });
  };
  const handleEditClearingCat = async (id: string, data: Omit<ClearingCat, "id" | "createdAt">) => {
    const existing = clearingCats.find(c => c.id === id);
    await saveClearingCat({ id, name: data.name, createdAt: existing?.createdAt || new Date().toISOString() });
  };
  const handleDeleteClearingCat = async (id: string) => {
    await deleteClearingCatDoc(id);
  };
  const handleAddImportPi = async (data: Omit<ImportPiRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    let piId = data.id;
    if (!piId || !piId.toUpperCase().startsWith("PI-")) {
      let maxNum = 0;
      importPis.forEach((r) => {
        if (!r.id) return;
        const match = r.id.match(/^PI-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = (maxNum > 0 ? maxNum : importPis.length) + 1;
      piId = `PI-${nextNum}`;
    }
    const createdAt = data.createdAt || new Date().toISOString();
    const newRecord: ImportPiRecord = { ...data, id: piId, createdAt };

    // Update state optimistically
    setImportPis((prev) => [newRecord, ...prev.filter((p) => p.id !== piId)]);

    // Direct CRUD to Google Sheets via Apps Script deployed URL
    syncOperationalAction("ADD", "import_pis", newRecord, "Import PIs", "import_pi_config");

    await saveLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: piId,
      targetName: data.piNo,
      details: `${activeUser.name} created PI Record #${data.piNo} (Record ID: ${piId}) for Supplier "${data.supplierName}" (${data.productName || "Product"})`
    });
  };

  const handleUpdateImportPi = async (updatedRecord: ImportPiRecord) => {
    setImportPis((prev) => prev.map((p) => (p.id === updatedRecord.id ? updatedRecord : p)));
    syncOperationalAction("EDIT", "import_pis", updatedRecord, "Import PIs", "import_pi_config");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.piNo,
      details: `${activeUser.name} updated PI Record #${updatedRecord.piNo}`
    });
  };

  const handleDeleteImportPi = async (id: string) => {
    const piToDelete = importPis.find((p) => p.id === id);
    setImportPis((prev) => prev.filter((p) => p.id !== id));

    if (piToDelete) {
      syncOperationalAction("DELETE", "import_pis", piToDelete, "Import PIs", "import_pi_config");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: piToDelete.piNo,
        details: `${activeUser.name} deleted PI Record #${piToDelete.piNo}`
      });
    }
  };

  const handleAddImportLc = async (data: Omit<ImportLcRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    let lcId = data.id;
    if (!lcId || !lcId.toUpperCase().startsWith("LC-")) {
      let maxNum = 0;
      importLcs.forEach((r) => {
        if (!r.id) return;
        const match = r.id.match(/^LC-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = (maxNum > 0 ? maxNum : importLcs.length) + 1;
      lcId = `LC-${nextNum}`;
    }
    const createdAt = data.createdAt || new Date().toISOString();
    const newRecord: ImportLcRecord = { ...data, id: lcId, createdAt };

    setImportLcs((prev) => [newRecord, ...prev.filter((l) => l.id !== lcId)]);
    syncOperationalAction("ADD", "import_lcs", newRecord, "Import LCs", "import_lcs_apps_script");

    await saveLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: lcId,
      targetName: data.lcNoRefNo || data.piNo,
      details: `${activeUser.name} created LC Record #${data.lcNoRefNo || data.piNo} (Record ID: ${lcId})`
    });
  };

  const handleUpdateImportLc = async (updatedRecord: ImportLcRecord) => {
    setImportLcs((prev) => prev.map((l) => (l.id === updatedRecord.id ? updatedRecord : l)));
    syncOperationalAction("EDIT", "import_lcs", updatedRecord, "Import LCs", "import_lcs_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.lcNoRefNo || updatedRecord.piNo,
      details: `${activeUser.name} updated LC Record #${updatedRecord.lcNoRefNo || updatedRecord.piNo}`
    });
  };

  const handleDeleteImportLc = async (id: string) => {
    const lcToDelete = importLcs.find((l) => l.id === id);
    setImportLcs((prev) => prev.filter((l) => l.id !== id));

    if (lcToDelete) {
      syncOperationalAction("DELETE", "import_lcs", lcToDelete, "Import LCs", "import_lcs_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: lcToDelete.lcNoRefNo || lcToDelete.piNo,
        details: `${activeUser.name} deleted LC Record #${lcToDelete.lcNoRefNo || lcToDelete.piNo}`
      });
    }
  };

  const handleAddImportEta = async (data: Omit<ImportEtaRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    let etaId = data.id;
    if (!etaId || !etaId.toUpperCase().startsWith("ETA-")) {
      let maxNum = 0;
      importEtas.forEach((r) => {
        if (!r.id) return;
        const match = r.id.match(/^ETA-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = (maxNum > 0 ? maxNum : importEtas.length) + 1;
      etaId = `ETA-${nextNum}`;
    }
    const createdAt = data.createdAt || new Date().toISOString();
    const newRecord: ImportEtaRecord = { ...data, id: etaId, createdAt };

    setImportEtas((prev) => [newRecord, ...prev.filter((e) => e.id !== etaId)]);
    syncOperationalAction("ADD", "import_etas", newRecord, "Import ETAs", "import_etas_apps_script");

    await saveLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: etaId,
      targetName: data.piNo,
      details: `${activeUser.name} created ETA Record for PI #${data.piNo} (${data.productName}) (Record ID: ${etaId})`
    });
  };

  const handleUpdateImportEta = async (updatedRecord: ImportEtaRecord) => {
    setImportEtas((prev) => prev.map((e) => (e.id === updatedRecord.id ? updatedRecord : e)));
    syncOperationalAction("EDIT", "import_etas", updatedRecord, "Import ETAs", "import_etas_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.piNo,
      details: `${activeUser.name} updated ETA Record for PI #${updatedRecord.piNo} (${updatedRecord.productName})`
    });
  };

  const handleDeleteImportEta = async (id: string) => {
    const etaToDelete = importEtas.find((e) => e.id === id);
    setImportEtas((prev) => prev.filter((e) => e.id !== id));

    if (etaToDelete) {
      syncOperationalAction("DELETE", "import_etas", etaToDelete, "Import ETAs", "import_etas_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: etaToDelete.piNo,
        details: `${activeUser.name} deleted ETA Record for PI #${etaToDelete.piNo}`
      });
    }
  };

  const handleAddImportBoe = async (data: Omit<ImportBoeRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    let boeId = data.id;
    if (!boeId || !boeId.toUpperCase().startsWith("BOE-")) {
      let maxNum = 0;
      importBoes.forEach((r) => {
        if (!r.id) return;
        const match = r.id.match(/^BOE-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = (maxNum > 0 ? maxNum : importBoes.length) + 1;
      boeId = `BOE-${nextNum}`;
    }
    const createdAt = data.createdAt || new Date().toISOString();
    const newRecord: ImportBoeRecord = { ...data, id: boeId, createdAt };

    setImportBoes((prev) => [newRecord, ...prev.filter((b) => b.id !== boeId)]);
    syncOperationalAction("ADD", "import_boes", newRecord, "Import BOEs", "import_boes_apps_script");

    await saveLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: boeId,
      targetName: data.beNo || data.piNo,
      details: `${activeUser.name} created BOE Record for BE #${data.beNo} (PI #${data.piNo}, ${data.productName}) (Record ID: ${boeId})`
    });
  };

  const handleUpdateImportBoe = async (updatedRecord: ImportBoeRecord) => {
    setImportBoes((prev) => prev.map((b) => (b.id === updatedRecord.id ? updatedRecord : b)));
    syncOperationalAction("EDIT", "import_boes", updatedRecord, "Import BOEs", "import_boes_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.beNo || updatedRecord.piNo,
      details: `${activeUser.name} updated BOE Record for BE #${updatedRecord.beNo} (PI #${updatedRecord.piNo}, ${updatedRecord.productName})`
    });
  };

  const handleDeleteImportBoe = async (id: string) => {
    const boeToDelete = importBoes.find((b) => b.id === id);
    setImportBoes((prev) => prev.filter((b) => b.id !== id));

    if (boeToDelete) {
      syncOperationalAction("DELETE", "import_boes", boeToDelete, "Import BOEs", "import_boes_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: boeToDelete.beNo || boeToDelete.piNo,
        details: `${activeUser.name} deleted BOE Record for BE #${boeToDelete.beNo}`
      });
    }
  };

  const handleAddImportContainer = async (data: Omit<ImportContainerRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => {
    let containerId = data.id;
    if (!containerId || !containerId.toUpperCase().startsWith("CN-")) {
      let maxNum = 0;
      importContainers.forEach((r) => {
        if (!r.id) return;
        const match = r.id.match(/^CN-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = (maxNum > 0 ? maxNum : importContainers.length) + 1;
      containerId = `CN-${nextNum}`;
    }
    const createdAt = data.createdAt || new Date().toISOString();
    const newRecord: ImportContainerRecord = { ...data, id: containerId, createdAt };

    setImportContainers((prev) => [newRecord, ...prev.filter((c) => c.id !== containerId)]);
    syncOperationalAction("ADD", "import_containers", newRecord, "Import Containers", "import_containers_apps_script");

    await saveLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: containerId,
      targetName: data.containerNo,
      details: `${activeUser.name} created Container Record #${data.containerNo} for BE #${data.beNo} (${data.productName}) (Record ID: ${containerId})`
    });
  };

  const handleUpdateImportContainer = async (updatedRecord: ImportContainerRecord) => {
    setImportContainers((prev) => prev.map((c) => (c.id === updatedRecord.id ? updatedRecord : c)));
    syncOperationalAction("EDIT", "import_containers", updatedRecord, "Import Containers", "import_containers_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.containerNo,
      details: `${activeUser.name} updated Container Record #${updatedRecord.containerNo} for BE #${updatedRecord.beNo}`
    });
  };

  const handleDeleteImportContainer = async (id: string) => {
    const containerToDelete = importContainers.find((c) => c.id === id);
    setImportContainers((prev) => prev.filter((c) => c.id !== id));

    if (containerToDelete) {
      syncOperationalAction("DELETE", "import_containers", containerToDelete, "Import Containers", "import_containers_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: containerToDelete.containerNo,
        details: `${activeUser.name} deleted Container Record #${containerToDelete.containerNo}`
      });
    }
  };

  const handleAddImportClearing = async (data: Omit<ImportClearingRecord, "id" | "createdAt">) => {
    const isProv = !!data.isProvisional;
    const clearingId = isProv ? `prov-${Date.now()}` : `clearing-${Date.now()}`;
    const newRecord: ImportClearingRecord = { ...data, id: clearingId, createdAt: new Date().toISOString() };

    if (isProv) {
      setImportProvisionalClearings((prev) => [newRecord, ...prev.filter((c) => c.id !== clearingId)]);
      syncOperationalAction("ADD", "import_provisional_clearings", newRecord, "Provisional Clearings", "import_clearings_apps_script");
    } else {
      setImportClearings((prev) => [newRecord, ...prev.filter((c) => c.id !== clearingId)]);
      syncOperationalAction("ADD", "import_clearings", newRecord, "Import Clearings", "import_clearings_apps_script");
    }

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: clearingId,
      targetName: data.name || "Unnamed Provisional",
      details: `${activeUser.name} created ${isProv ? "Provisional" : "Actual"} Clearing Record #${data.name || "Unnamed"} for BE #${data.beNo}`
    });
  };

  const handleUpdateImportClearing = async (updatedRecord: ImportClearingRecord) => {
    const isProv = updatedRecord.isProvisional || updatedRecord.id.startsWith("prov-");
    if (isProv) {
      setImportProvisionalClearings((prev) => prev.map((c) => (c.id === updatedRecord.id ? updatedRecord : c)));
      syncOperationalAction("EDIT", "import_provisional_clearings", updatedRecord, "Provisional Clearings", "import_clearings_apps_script");
    } else {
      setImportClearings((prev) => prev.map((c) => (c.id === updatedRecord.id ? updatedRecord : c)));
      syncOperationalAction("EDIT", "import_clearings", updatedRecord, "Import Clearings", "import_clearings_apps_script");
    }

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.name || "Unnamed Provisional",
      details: `${activeUser.name} updated ${isProv ? "Provisional" : "Actual"} Clearing Record #${updatedRecord.name || "Unnamed"} for BE #${updatedRecord.beNo}`
    });
  };

  const handleDeleteImportClearing = async (id: string) => {
    const isProv = id.startsWith("prov-");
    const clearingToDelete = isProv 
      ? importProvisionalClearings.find((c) => c.id === id)
      : importClearings.find((c) => c.id === id);

    if (isProv) {
      setImportProvisionalClearings((prev) => prev.filter((c) => c.id !== id));
      if (clearingToDelete) {
        syncOperationalAction("DELETE", "import_provisional_clearings", clearingToDelete, "Provisional Clearings", "import_clearings_apps_script");
      }
    } else {
      setImportClearings((prev) => prev.filter((c) => c.id !== id));
      if (clearingToDelete) {
        syncOperationalAction("DELETE", "import_clearings", clearingToDelete, "Import Clearings", "import_clearings_apps_script");
      }
    }

    if (clearingToDelete) {
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: clearingToDelete.name || "Unnamed Provisional",
        details: `${activeUser.name} deleted ${isProv ? "Provisional" : "Actual"} Clearing Record #${clearingToDelete.name || "Unnamed"}`
      });
    }
  };

  const handleAddImportDrc = async (data: Omit<ImportDrcRecord, "id" | "createdAt">) => {
    const drcId = `drc-${Date.now()}`;
    const newRecord: ImportDrcRecord = { ...data, id: drcId, createdAt: new Date().toISOString() };

    setImportDrcs((prev) => [newRecord, ...prev.filter((d) => d.id !== drcId)]);
    syncOperationalAction("ADD", "import_drcs", newRecord, "Import DRCs", "import_drcs_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "Lead",
      targetId: drcId,
      targetName: data.piNo,
      details: `${activeUser.name} created DRC Record for PI #${data.piNo} (${data.productName})`
    });
  };

  const handleUpdateImportDrc = async (updatedRecord: ImportDrcRecord) => {
    setImportDrcs((prev) => prev.map((d) => (d.id === updatedRecord.id ? updatedRecord : d)));
    syncOperationalAction("EDIT", "import_drcs", updatedRecord, "Import DRCs", "import_drcs_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Update Lead",
      targetType: "Lead",
      targetId: updatedRecord.id,
      targetName: updatedRecord.piNo,
      details: `${activeUser.name} updated DRC Record for PI #${updatedRecord.piNo} (${updatedRecord.productName})`
    });
  };

  const handleDeleteImportDrc = async (id: string) => {
    const drcToDelete = importDrcs.find((d) => d.id === id);
    setImportDrcs((prev) => prev.filter((d) => d.id !== id));

    if (drcToDelete) {
      syncOperationalAction("DELETE", "import_drcs", drcToDelete, "Import DRCs", "import_drcs_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Lead",
        targetType: "Lead",
        targetId: id,
        targetName: drcToDelete.piNo,
        details: `${activeUser.name} deleted DRC Record for PI #${drcToDelete.piNo}`
      });
    }
  };

  const handleAddImportTpti = async (data: Omit<ImportTptiRecord, "id" | "createdAt">) => {
    const tptiId = `tpti-${Date.now()}`;
    const newRecord: ImportTptiRecord = { ...data, id: tptiId, createdAt: new Date().toISOString() };

    setImportTptis((prev) => [newRecord, ...prev.filter((t) => t.id !== tptiId)]);
    syncOperationalAction("ADD", "import_tptis", newRecord, "Import TPTIs", "import_tptis_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Import TPT-I",
      targetType: "Import TPT-I",
      targetId: tptiId,
      targetName: data.beNo,
      details: `${activeUser.name} created TPT-I Record for BE #${data.beNo} (${data.productName})`
    });
  };

  const handleUpdateImportTpti = async (updatedRecord: ImportTptiRecord) => {
    setImportTptis((prev) => prev.map((t) => (t.id === updatedRecord.id ? updatedRecord : t)));
    syncOperationalAction("EDIT", "import_tptis", updatedRecord, "Import TPTIs", "import_tptis_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Import TPT-I",
      targetType: "Import TPT-I",
      targetId: updatedRecord.id,
      targetName: updatedRecord.beNo,
      details: `${activeUser.name} updated TPT-I Record for BE #${updatedRecord.beNo} (${updatedRecord.productName})`
    });
  };

  const handleDeleteImportTpti = async (id: string) => {
    const tptiToDelete = importTptis.find((t) => t.id === id);
    setImportTptis((prev) => prev.filter((t) => t.id !== id));

    if (tptiToDelete) {
      syncOperationalAction("DELETE", "import_tptis", tptiToDelete, "Import TPTIs", "import_tptis_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Import TPT-I",
        targetType: "Import TPT-I",
        targetId: id,
        targetName: tptiToDelete.beNo,
        details: `${activeUser.name} deleted TPT-I Record for BE #${tptiToDelete.beNo}`
      });
    }
  };

  const handleAddImportCi = async (data: Omit<ImportCiRecord, "id" | "createdAt">) => {
    const ciId = `ci-${Date.now()}`;
    const newRecord: ImportCiRecord = { ...data, id: ciId, createdAt: new Date().toISOString() };

    setImportCis((prev) => [newRecord, ...prev.filter((c) => c.id !== ciId)]);
    syncOperationalAction("ADD", "import_cis", newRecord, "Import CIs", "import_cis_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Import CI",
      targetType: "Import CI",
      targetId: ciId,
      targetName: data.beNo,
      details: `${activeUser.name} created Import CI Record for BE #${data.beNo} (Container: ${data.containerNo}, Product: ${data.productName})`
    });
  };

  const handleUpdateImportCi = async (updatedRecord: ImportCiRecord) => {
    setImportCis((prev) => prev.map((c) => (c.id === updatedRecord.id ? updatedRecord : c)));
    syncOperationalAction("EDIT", "import_cis", updatedRecord, "Import CIs", "import_cis_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Import CI",
      targetType: "Import CI",
      targetId: updatedRecord.id,
      targetName: updatedRecord.beNo,
      details: `${activeUser.name} updated Import CI Record for BE #${updatedRecord.beNo} (Container: ${updatedRecord.containerNo}, Product: ${updatedRecord.productName})`
    });
  };

  const handleUpdatePid = async (updatedRecord: PidRecord) => {
    setPids((prev) => prev.map((p) => (p.id === updatedRecord.id ? updatedRecord : p)));
    syncOperationalAction("EDIT", "pids", updatedRecord, "PIDs", "pids_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit PID Record",
      targetType: "PID Record",
      targetId: updatedRecord.id,
      targetName: updatedRecord.productName,
      details: `${activeUser.name} updated Central Purchase Invoice Details (PID) for ${updatedRecord.productName} (Supplier: ${updatedRecord.supplierName})`
    });
  };

  const handleDeleteImportCi = async (id: string) => {
    const ciToDelete = importCis.find((c) => c.id === id);
    setImportCis((prev) => prev.filter((c) => c.id !== id));

    if (ciToDelete) {
      syncOperationalAction("DELETE", "import_cis", ciToDelete, "Import CIs", "import_cis_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Import CI",
        targetType: "Import CI",
        targetId: id,
        targetName: ciToDelete.beNo,
        details: `${activeUser.name} deleted Import CI Record for BE #${ciToDelete.beNo} (Container: ${ciToDelete.containerNo})`
      });
    }
  };

  const handleAddDrcBankChargesType = async (data: Omit<DrcBankChargesType, "id" | "createdAt">) => {
    const id = `drc-type-${Date.now()}`;
    await saveDrcBankChargesType({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleEditDrcBankChargesType = async (id: string, data: Omit<DrcBankChargesType, "id" | "createdAt">) => {
    await saveDrcBankChargesType({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleDeleteDrcBankChargesType = async (id: string) => {
    await deleteDrcBankChargesType(id);
  };

  const handleAddDrcBankCharges1 = async (data: Omit<DrcBankCharges1, "id" | "createdAt">) => {
    const id = `drc-c1-${Date.now()}`;
    await saveDrcBankCharges1({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleEditDrcBankCharges1 = async (id: string, data: Omit<DrcBankCharges1, "id" | "createdAt">) => {
    await saveDrcBankCharges1({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleDeleteDrcBankCharges1 = async (id: string) => {
    await deleteDrcBankCharges1(id);
  };

  const handleAddAolGodown = async (data: Omit<AolGodown, "id" | "createdAt">) => {
    const id = `godown-${Date.now()}`;
    await saveAolGodown({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleEditAolGodown = async (id: string, data: Omit<AolGodown, "id" | "createdAt">) => {
    await saveAolGodown({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleDeleteAolGodown = async (id: string) => {
    await deleteAolGodownDoc(id);
  };

  const handleAddDomesticSupplier = async (data: Omit<DomesticSupplierName, "id" | "createdAt">) => {
    const id = `domsupp-${Date.now()}`;
    await saveDomesticSupplier({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleEditDomesticSupplier = async (id: string, data: Omit<DomesticSupplierName, "id" | "createdAt">) => {
    await saveDomesticSupplier({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleDeleteDomesticSupplier = async (id: string) => {
    await deleteDomesticSupplierDoc(id);
  };

  const handleAddShipToParty = async (data: Omit<ShipToParty, "id" | "createdAt">) => {
    const id = `shipto-${Date.now()}`;
    await saveShipToParty({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleEditShipToParty = async (id: string, data: Omit<ShipToParty, "id" | "createdAt">) => {
    await saveShipToParty({ ...data, id, createdAt: new Date().toISOString() });
  };
  const handleDeleteShipToParty = async (id: string) => {
    await deleteShipToPartyDoc(id);
  };

  const handleAddDomesticPd = async (record: Omit<DomesticPdRecord, "id" | "createdAt">) => {
    const id = `dpd-${Date.now()}`;
    const newItem: DomesticPdRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setDomesticPds((prev) => [newItem, ...prev.filter((p) => p.id !== id)]);
    syncOperationalAction("ADD", "domestic_pds", newItem, "Domestic PDs", "domestic_pds_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Domestic PD",
      targetType: "Domestic PD",
      targetId: id,
      targetName: newItem.purchaseBillNo || newItem.productName,
      details: `${activeUser.name} created Domestic PD record for branch "${newItem.aolBranchName}" and product "${newItem.productName}"`
    });
  };

  const handleUpdateDomesticPd = async (record: DomesticPdRecord) => {
    setDomesticPds((prev) => prev.map((p) => (p.id === record.id ? record : p)));
    syncOperationalAction("EDIT", "domestic_pds", record, "Domestic PDs", "domestic_pds_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Domestic PD",
      targetType: "Domestic PD",
      targetId: record.id,
      targetName: record.purchaseBillNo || record.productName,
      details: `${activeUser.name} updated Domestic PD record for product "${record.productName}"`
    });
  };

  const handleDeleteDomesticPd = async (id: string) => {
    const pdToDelete = domesticPds.find((p) => p.id === id);
    setDomesticPds((prev) => prev.filter((p) => p.id !== id));

    if (pdToDelete) {
      syncOperationalAction("DELETE", "domestic_pds", pdToDelete, "Domestic PDs", "domestic_pds_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Domestic PD",
        targetType: "Domestic PD",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted Domestic PD record id ${id}`
      });
    }
  };

  const handleAddTptdCategory = async (data: Omit<TptdCategory, "id" | "createdAt">) => {
    const id = `tcat-${Date.now()}`;
    await saveTptdCategory({ ...data, id, createdAt: new Date().toISOString() });
  };

  const handleEditTptdCategory = async (id: string, data: Omit<TptdCategory, "id" | "createdAt">) => {
    await saveTptdCategory({ ...data, id, createdAt: new Date().toISOString() });
  };

  const handleDeleteTptdCategory = async (id: string) => {
    await deleteTptdCategoryDoc(id);
  };

  const handleAddDomesticTptd = async (record: Omit<DomesticTptdRecord, "id" | "createdAt">) => {
    const id = `dtptd-${Date.now()}`;
    const newItem: DomesticTptdRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setDomesticTptds((prev) => [newItem, ...prev.filter((t) => t.id !== id)]);
    syncOperationalAction("ADD", "domestic_tptds", newItem, "Domestic TPTDs", "domestic_tptds_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Domestic TPT-D",
      targetType: "Domestic TPT-D",
      targetId: id,
      targetName: newItem.purchaseBillNo || newItem.productName,
      details: `${activeUser.name} created Domestic TPT-D record for product "${newItem.productName}"`
    });
  };

  const handleUpdateDomesticTptd = async (record: DomesticTptdRecord) => {
    setDomesticTptds((prev) => prev.map((t) => (t.id === record.id ? record : t)));
    syncOperationalAction("EDIT", "domestic_tptds", record, "Domestic TPTDs", "domestic_tptds_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Domestic TPT-D",
      targetType: "Domestic TPT-D",
      targetId: record.id,
      targetName: record.purchaseBillNo || record.productName,
      details: `${activeUser.name} updated Domestic TPT-D record for product "${record.productName}"`
    });
  };

  const handleDeleteDomesticTptd = async (id: string) => {
    const tptdToDelete = domesticTptds.find((t) => t.id === id);
    setDomesticTptds((prev) => prev.filter((t) => t.id !== id));

    if (tptdToDelete) {
      syncOperationalAction("DELETE", "domestic_tptds", tptdToDelete, "Domestic TPTDs", "domestic_tptds_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Domestic TPT-D",
        targetType: "Domestic TPT-D",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted Domestic TPT-D record id ${id}`
      });
    }
  };

  const syncPidStockTransfers = async (updatedSts: AccountsStRecord[]) => {
    if (!pids || pids.length === 0) return;
    for (const pid of pids) {
      const matchingSts = updatedSts.filter((st) => {
        if (st.sourcePidId && st.sourcePidId === pid.id) return true;
        if (st.sourceOriginCode && (st.sourceOriginCode === pid.originCode || st.sourceOriginCode === pid.id)) return true;
        if (
          st.sourceBePurchaseBillNo && pid.purchaseBeOrNo &&
          st.sourceBePurchaseBillNo.trim().toLowerCase() === pid.purchaseBeOrNo.trim().toLowerCase() &&
          (st.sourceContainerNo || "").trim().toLowerCase() === (pid.containerNo || "").trim().toLowerCase()
        ) return true;
        return false;
      });

      const totalStQty = matchingSts.reduce((sum, st) => sum + (st.qty || 0), 0);
      if ((pid.stockTransfer || 0) !== totalStQty) {
        const updatedPid: PidRecord = {
          ...pid,
          stockTransfer: totalStQty,
          closingStock: Number(((pid.purchaseQty || 0) - (totalStQty + (pid.salesQty || 0) + (pid.purchaseDebitCreditQty || 0) + (pid.salesDebitCreditQty || 0))).toFixed(4)),
        };
        setPids((prev) => prev.map((p) => (p.id === updatedPid.id ? updatedPid : p)));
        syncOperationalAction("EDIT", "pids", updatedPid, "PIDs", "pids_apps_script");
      }
    }
  };

  const handleAddAccountsSt = async (record: Omit<AccountsStRecord, "id" | "createdAt">) => {
    const id = `st-${Date.now()}`;
    const newItem: AccountsStRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
    };
    setAccountsSts((prev) => [newItem, ...prev.filter((s) => s.id !== id)]);
    syncOperationalAction("ADD", "accounts_sts", newItem, "Accounts ST", "accounts_sts_apps_script");

    // Auto-populate / append to PID table
    const pidItem = mapAccountsStToPid(newItem);
    setPids((prev) => [pidItem, ...prev.filter((p) => p.id !== pidItem.id)]);
    syncOperationalAction("ADD", "pids", pidItem, "PIDs", "pids_apps_script");

    const nextSts = [...accountsSts, newItem];
    await syncPidStockTransfers(nextSts);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts ST",
      targetType: "Accounts ST",
      targetId: id,
      targetName: newItem.sourceBePurchaseBillNo || id,
      details: `${activeUser.name} created Stock Transfer (ST) record from godown "${newItem.sourceAolGodown}" to "${newItem.destAolGodown}"`
    });
  };

  const handleUpdateAccountsSt = async (record: AccountsStRecord) => {
    setAccountsSts((prev) => prev.map((s) => (s.id === record.id ? record : s)));
    syncOperationalAction("EDIT", "accounts_sts", record, "Accounts ST", "accounts_sts_apps_script");

    // Update corresponding PID entry
    const pidItem = mapAccountsStToPid(record);
    setPids((prev) => prev.map((p) => (p.id === pidItem.id ? pidItem : p)));
    syncOperationalAction("EDIT", "pids", pidItem, "PIDs", "pids_apps_script");

    const nextSts = accountsSts.map((s) => s.id === record.id ? record : s);
    await syncPidStockTransfers(nextSts);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts ST",
      targetType: "Accounts ST",
      targetId: record.id,
      targetName: record.sourceBePurchaseBillNo || record.id,
      details: `${activeUser.name} updated Stock Transfer (ST) record id ${record.id}`
    });
  };

  const handleDeleteAccountsSt = async (id: string) => {
    const stToDelete = accountsSts.find((s) => s.id === id);
    setAccountsSts((prev) => prev.filter((s) => s.id !== id));
    if (stToDelete) {
      syncOperationalAction("DELETE", "accounts_sts", stToDelete, "Accounts ST", "accounts_sts_apps_script");
    }

    // Delete corresponding PID entry
    const pidToDelete = pids.find((p) => p.id === id);
    setPids((prev) => prev.filter((p) => p.id !== id));
    if (pidToDelete) {
      syncOperationalAction("DELETE", "pids", pidToDelete, "PIDs", "pids_apps_script");
    }

    const nextSts = accountsSts.filter((s) => s.id !== id);
    await syncPidStockTransfers(nextSts);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Accounts ST",
      targetType: "Accounts ST",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Stock Transfer (ST) record id ${id}`
    });
  };

  const syncPidSalesQty = async (currentSalesRecords: AccountsSalesRecord[]) => {
    for (const pid of pids) {
      // Find all sales records matching this PID key
      const matchingSales = currentSalesRecords.filter((s) => {
        if (s.sourcePidId && s.sourcePidId === pid.id) return true;
        if (
          s.beNoOrPurchaseNo && pid.purchaseBeOrNo &&
          s.beNoOrPurchaseNo.trim().toLowerCase() === pid.purchaseBeOrNo.trim().toLowerCase() &&
          (s.containerNo || "").trim().toLowerCase() === (pid.containerNo || "").trim().toLowerCase()
        ) return true;
        return false;
      });

      const totalSalesQty = matchingSales.reduce((sum, s) => sum + (s.salesQty || 0), 0);
      if ((pid.salesQty || 0) !== totalSalesQty) {
        const updatedPid: PidRecord = {
          ...pid,
          salesQty: totalSalesQty,
          closingStock: Number(((pid.purchaseQty || 0) - ((pid.stockTransfer || 0) + totalSalesQty + (pid.purchaseDebitCreditQty || 0) + (pid.salesDebitCreditQty || 0))).toFixed(4)),
        };
        setPids((prev) => prev.map((p) => (p.id === updatedPid.id ? updatedPid : p)));
        syncOperationalAction("EDIT", "pids", updatedPid, "PIDs", "pids_apps_script");
      }
    }
  };

  const syncPidPurchaseDebitCreditQty = async (currentRecords: AccountsSupplierCrDrRecord[]) => {
    if (!pids || pids.length === 0) return;
    for (const pid of pids) {
      const matchingNotes = currentRecords.filter((note) => {
        if (note.pidId && note.pidId === pid.id) return true;
        return false;
      });

      const totalDebitCreditQty = matchingNotes.reduce((sum, note) => {
        const isDebit = note.noteType === "Debit Note";
        const noteQty = note.qty || 0;
        return sum + (isDebit ? noteQty : -noteQty);
      }, 0);

      if ((pid.purchaseDebitCreditQty || 0) !== totalDebitCreditQty) {
        const updatedPid: PidRecord = {
          ...pid,
          purchaseDebitCreditQty: totalDebitCreditQty,
          closingStock: Number(((pid.purchaseQty || 0) - ((pid.stockTransfer || 0) + (pid.salesQty || 0) + totalDebitCreditQty + (pid.salesDebitCreditQty || 0))).toFixed(4)),
        };
        setPids((prev) => prev.map((p) => (p.id === updatedPid.id ? updatedPid : p)));
        syncOperationalAction("EDIT", "pids", updatedPid, "PIDs", "pids_apps_script");
      }
    }
  };

  const handleAddAccountsSales = async (record: Omit<AccountsSalesRecord, "id" | "createdAt">) => {
    const id = `sal-${Date.now()}`;
    const newItem: AccountsSalesRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsSales((prev) => [newItem, ...prev.filter((s) => s.id !== id)]);
    syncOperationalAction("ADD", "accounts_sales", newItem, "Accounts Sales", "accounts_sales_apps_script");

    const nextSales = [...accountsSales, newItem];
    await syncPidSalesQty(nextSales);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts Sales",
      targetType: "Accounts Sales",
      targetId: id,
      targetName: newItem.saleInvoiceNo || id,
      details: `${activeUser.name} created Sales record invoice "${newItem.saleInvoiceNo}" for party "${newItem.partyName}" with qty ${newItem.salesQty} Kg`
    });
  };

  const handleUpdateAccountsSales = async (record: AccountsSalesRecord) => {
    setAccountsSales((prev) => prev.map((s) => (s.id === record.id ? record : s)));
    syncOperationalAction("EDIT", "accounts_sales", record, "Accounts Sales", "accounts_sales_apps_script");

    const nextSales = accountsSales.map((s) => s.id === record.id ? record : s);
    await syncPidSalesQty(nextSales);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts Sales",
      targetType: "Accounts Sales",
      targetId: record.id,
      targetName: record.saleInvoiceNo || record.id,
      details: `${activeUser.name} updated Sales record invoice "${record.saleInvoiceNo}"`
    });
  };

  const handleDeleteAccountsSales = async (id: string) => {
    const saleToDelete = accountsSales.find((s) => s.id === id);
    setAccountsSales((prev) => prev.filter((s) => s.id !== id));

    if (saleToDelete) {
      syncOperationalAction("DELETE", "accounts_sales", saleToDelete, "Accounts Sales", "accounts_sales_apps_script");
    }

    const nextSales = accountsSales.filter((s) => s.id !== id);
    await syncPidSalesQty(nextSales);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Accounts Sales",
      targetType: "Accounts Sales",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Sales record id ${id}`
    });
  };

  const syncPidDrumCost = async (currentDrumingRecords: AccountsDrumingRecord[]) => {
    for (const pid of pids) {
      const matchingDrumings = currentDrumingRecords.filter((d) => {
        if (d.sourcePidId && d.sourcePidId === pid.id) return true;
        if (
          d.aolGodown && pid.aolGodown &&
          d.aolGodown.trim().toLowerCase() === pid.aolGodown.trim().toLowerCase() &&
          d.productName && pid.productName &&
          d.productName.trim().toLowerCase() === pid.productName.trim().toLowerCase() &&
          (d.containerNo || "").trim().toLowerCase() === (pid.containerNo || pid.purchaseBeOrNo || "").trim().toLowerCase()
        ) return true;
        return false;
      });

      const totalDrumCost = matchingDrumings.reduce((sum, d) => sum + (d.totalDrumCost || 0), 0);
      const purchaseQty = pid.purchaseQty || 0;
      const purchaseRate = pid.purchaseRate || 0;
      const stockTransfer = pid.stockTransfer || 0;
      const salesQty = pid.salesQty || 0;
      const purchaseDebitCreditQty = pid.purchaseDebitCreditQty || 0;
      const salesDebitCreditQty = pid.salesDebitCreditQty || 0;
      const closingStock = pid.closingStock ?? Number((purchaseQty - (stockTransfer + salesQty + purchaseDebitCreditQty + salesDebitCreditQty)).toFixed(4));

      const rateAfterDruming = closingStock > 0
        ? Number((purchaseRate + (totalDrumCost / closingStock)).toFixed(4))
        : (purchaseQty > 0 ? Number((purchaseRate + (totalDrumCost / purchaseQty)).toFixed(4)) : Number(purchaseRate.toFixed(4)));

      if ((pid.drumCost || 0) !== totalDrumCost || (pid.purchaseRateAfterDruming || 0) !== rateAfterDruming) {
        const updatedPid: PidRecord = {
          ...pid,
          drumCost: totalDrumCost,
          purchaseRateAfterDruming: rateAfterDruming,
        };
        setPids((prev) => prev.map((p) => (p.id === updatedPid.id ? updatedPid : p)));
        syncOperationalAction("EDIT", "pids", updatedPid, "PIDs", "pids_apps_script");
      }
    }
  };

  const handleAddAccountsDruming = async (record: Omit<AccountsDrumingRecord, "id" | "createdAt">) => {
    const id = `drm-${Date.now()}`;
    const newItem: AccountsDrumingRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsDrumings((prev) => [newItem, ...prev.filter((d) => d.id !== id)]);
    syncOperationalAction("ADD", "accounts_drumings", newItem, "Accounts Drumming", "accounts_drumings_apps_script");

    const nextDrumings = [...accountsDrumings, newItem];
    await syncPidDrumCost(nextDrumings);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts Druming",
      targetType: "Accounts Druming",
      targetId: id,
      targetName: newItem.productName || id,
      details: `${activeUser.name} created Druming record for product "${newItem.productName}" at "${newItem.aolGodown}" with cost ₹${newItem.totalDrumCost}`
    });
  };

  const handleUpdateAccountsDruming = async (record: AccountsDrumingRecord) => {
    setAccountsDrumings((prev) => prev.map((d) => (d.id === record.id ? record : d)));
    syncOperationalAction("EDIT", "accounts_drumings", record, "Accounts Drumming", "accounts_drumings_apps_script");

    const nextDrumings = accountsDrumings.map((d) => d.id === record.id ? record : d);
    await syncPidDrumCost(nextDrumings);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts Druming",
      targetType: "Accounts Druming",
      targetId: record.id,
      targetName: record.productName || record.id,
      details: `${activeUser.name} updated Druming record for product "${record.productName}"`
    });
  };

  const handleDeleteAccountsDruming = async (id: string) => {
    const drumToDelete = accountsDrumings.find((d) => d.id === id);
    setAccountsDrumings((prev) => prev.filter((d) => d.id !== id));

    if (drumToDelete) {
      syncOperationalAction("DELETE", "accounts_drumings", drumToDelete, "Accounts Drumming", "accounts_drumings_apps_script");
    }

    const nextDrumings = accountsDrumings.filter((d) => d.id !== id);
    await syncPidDrumCost(nextDrumings);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Accounts Druming",
      targetType: "Accounts Druming",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Druming record id ${id}`
    });
  };

  const handleAddExpenseLedger = async (record: Omit<ExpenseLedgerItem, "id" | "createdAt">) => {
    const id = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ExpenseLedgerItem = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    await saveExpenseLedger(newItem);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Expense Ledger",
      targetType: "Expense Ledger",
      targetId: id,
      targetName: newItem.expenseSubHead,
      details: `${activeUser.name} created Expense Ledger sub-head "${newItem.expenseSubHead}" (${newItem.expenseHead})`
    });
  };

  const handleUpdateExpenseLedger = async (record: ExpenseLedgerItem) => {
    await saveExpenseLedger(record);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Expense Ledger",
      targetType: "Expense Ledger",
      targetId: record.id,
      targetName: record.expenseSubHead,
      details: `${activeUser.name} updated Expense Ledger sub-head "${record.expenseSubHead}"`
    });
  };

  const handleDeleteExpenseLedger = async (id: string) => {
    await deleteExpenseLedgerDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Expense Ledger",
      targetType: "Expense Ledger",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Expense Ledger id ${id}`
    });
  };

  const handleAddAccountsOfficeExp = async (record: Omit<AccountsOfficeExpRecord, "id" | "createdAt">) => {
    const id = `oe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: AccountsOfficeExpRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsOfficeExps((prev) => [newItem, ...prev.filter((o) => o.id !== id)]);
    syncOperationalAction("ADD", "accounts_office_exps", newItem, "Accounts Office Expenses", "accounts_office_exps_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts Office Exp",
      targetType: "Accounts Office Exp",
      targetId: id,
      targetName: newItem.vendorPartyName || id,
      details: `${activeUser.name} created Office Exp entry for vendor "${newItem.vendorPartyName}" with amount ₹${newItem.amount}`
    });
  };

  const handleUpdateAccountsOfficeExp = async (record: AccountsOfficeExpRecord) => {
    setAccountsOfficeExps((prev) => prev.map((o) => (o.id === record.id ? record : o)));
    syncOperationalAction("EDIT", "accounts_office_exps", record, "Accounts Office Expenses", "accounts_office_exps_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts Office Exp",
      targetType: "Accounts Office Exp",
      targetId: record.id,
      targetName: record.vendorPartyName || record.id,
      details: `${activeUser.name} updated Office Exp entry for vendor "${record.vendorPartyName}"`
    });
  };

  const handleDeleteAccountsOfficeExp = async (id: string) => {
    const expToDelete = accountsOfficeExps.find((o) => o.id === id);
    setAccountsOfficeExps((prev) => prev.filter((o) => o.id !== id));

    if (expToDelete) {
      syncOperationalAction("DELETE", "accounts_office_exps", expToDelete, "Accounts Office Expenses", "accounts_office_exps_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts Office Exp",
        targetType: "Accounts Office Exp",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted Office Exp record id ${id}`
      });
    }
  };

  const handleAddAccountsMeis = async (record: Omit<AccountsMeisRecord, "id" | "createdAt">) => {
    const id = `meis-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: AccountsMeisRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsMeis((prev) => [newItem, ...prev.filter((m) => m.id !== id)]);
    syncOperationalAction("ADD", "accounts_meis", newItem, "Accounts MEIS", "accounts_meis_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts MEIS",
      targetType: "Accounts MEIS",
      targetId: id,
      targetName: newItem.licenceNumbers || id,
      details: `${activeUser.name} created MEIS entry for Licence "${newItem.licenceNumbers}" with amount ₹${newItem.meisLicenceAmount}`
    });
  };

  const handleUpdateAccountsMeis = async (record: AccountsMeisRecord) => {
    setAccountsMeis((prev) => prev.map((m) => (m.id === record.id ? record : m)));
    syncOperationalAction("EDIT", "accounts_meis", record, "Accounts MEIS", "accounts_meis_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts MEIS",
      targetType: "Accounts MEIS",
      targetId: record.id,
      targetName: record.licenceNumbers || record.id,
      details: `${activeUser.name} updated MEIS entry for Licence "${record.licenceNumbers}"`
    });
  };

  const handleDeleteAccountsMeis = async (id: string) => {
    const meisToDelete = accountsMeis.find((m) => m.id === id);
    setAccountsMeis((prev) => prev.filter((m) => m.id !== id));

    if (meisToDelete) {
      syncOperationalAction("DELETE", "accounts_meis", meisToDelete, "Accounts MEIS", "accounts_meis_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts MEIS",
        targetType: "Accounts MEIS",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted MEIS record id ${id}`
      });
    }
  };

  const handleAddOtherIncomeLedger = async (record: Omit<OtherIncomeLedgerItem, "id" | "createdAt">) => {
    const id = `oil-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: OtherIncomeLedgerItem = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    await saveOtherIncomeLedger(newItem);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Other Income Ledger",
      targetType: "Other Income Ledger",
      targetId: id,
      targetName: newItem.ledger || id,
      details: `${activeUser.name} created Other Income Ledger item "${newItem.ledger}" (${newItem.effect})`
    });
  };

  const handleUpdateOtherIncomeLedger = async (record: OtherIncomeLedgerItem) => {
    await saveOtherIncomeLedger(record);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Other Income Ledger",
      targetType: "Other Income Ledger",
      targetId: record.id,
      targetName: record.ledger || record.id,
      details: `${activeUser.name} updated Other Income Ledger item "${record.ledger}"`
    });
  };

  const handleDeleteOtherIncomeLedger = async (id: string) => {
    await deleteOtherIncomeLedgerDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Other Income Ledger",
      targetType: "Other Income Ledger",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Other Income Ledger id ${id}`
    });
  };

  const handleAddAccountsOtherIncome = async (record: Omit<AccountsOtherIncomeRecord, "id" | "createdAt">) => {
    const id = `aoi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: AccountsOtherIncomeRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsOtherIncomes((prev) => [newItem, ...prev.filter((o) => o.id !== id)]);
    syncOperationalAction("ADD", "accounts_other_incomes", newItem, "Accounts Other Income", "accounts_other_incomes_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts Other Income",
      targetType: "Accounts Other Income",
      targetId: id,
      targetName: newItem.partyName || id,
      details: `${activeUser.name} created Other Income entry for party "${newItem.partyName}" with amount ₹${newItem.amount}`
    });
  };

  const handleUpdateAccountsOtherIncome = async (record: AccountsOtherIncomeRecord) => {
    setAccountsOtherIncomes((prev) => prev.map((o) => (o.id === record.id ? record : o)));
    syncOperationalAction("EDIT", "accounts_other_incomes", record, "Accounts Other Income", "accounts_other_incomes_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts Other Income",
      targetType: "Accounts Other Income",
      targetId: record.id,
      targetName: record.partyName || record.id,
      details: `${activeUser.name} updated Other Income entry for party "${record.partyName}"`
    });
  };

  const handleDeleteAccountsOtherIncome = async (id: string) => {
    const incToDelete = accountsOtherIncomes.find((o) => o.id === id);
    setAccountsOtherIncomes((prev) => prev.filter((o) => o.id !== id));

    if (incToDelete) {
      syncOperationalAction("DELETE", "accounts_other_incomes", incToDelete, "Accounts Other Income", "accounts_other_incomes_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts Other Income",
        targetType: "Accounts Other Income",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted Other Income record id ${id}`
      });
    }
  };

  const handleAddAccountsFdr = async (record: Omit<AccountsFdrRecord, "id" | "createdAt">) => {
    const id = `fdr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: AccountsFdrRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsFdrs((prev) => [newItem, ...prev.filter((f) => f.id !== id)]);
    syncOperationalAction("ADD", "accounts_fdrs", newItem, "Accounts FDR", "accounts_fdrs_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts FDR",
      targetType: "Accounts FDR",
      targetId: id,
      targetName: newItem.fdrNo || id,
      details: `${activeUser.name} created FDR record for FDR No "${newItem.fdrNo}" at Bank "${newItem.bankName}"`
    });
  };

  const handleUpdateAccountsFdr = async (record: AccountsFdrRecord) => {
    setAccountsFdrs((prev) => prev.map((f) => (f.id === record.id ? record : f)));
    syncOperationalAction("EDIT", "accounts_fdrs", record, "Accounts FDR", "accounts_fdrs_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts FDR",
      targetType: "Accounts FDR",
      targetId: record.id,
      targetName: record.fdrNo || record.id,
      details: `${activeUser.name} updated FDR record for FDR No "${record.fdrNo}"`
    });
  };

  const handleDeleteAccountsFdr = async (id: string) => {
    const fdrToDelete = accountsFdrs.find((f) => f.id === id);
    setAccountsFdrs((prev) => prev.filter((f) => f.id !== id));

    if (fdrToDelete) {
      syncOperationalAction("DELETE", "accounts_fdrs", fdrToDelete, "Accounts FDR", "accounts_fdrs_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts FDR",
        targetType: "Accounts FDR",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted FDR record id ${id}`
      });
    }
  };

  const handleAddAccountsCsdIsd = async (record: Omit<AccountsCsdIsdRecord, "id" | "createdAt">) => {
    const id = `csdisd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: AccountsCsdIsdRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsCsdIsds((prev) => [newItem, ...prev.filter((c) => c.id !== id)]);
    syncOperationalAction("ADD", "accounts_csd_isd", newItem, "Accounts CSD & ISD", "accounts_csd_isd_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts CSD & ISD",
      targetType: "Accounts CSD & ISD",
      targetId: id,
      targetName: newItem.invoiceNo || id,
      details: `${activeUser.name} created CSD & ISD record for Invoice No "${newItem.invoiceNo}" (${newItem.type})`
    });
  };

  const handleUpdateAccountsCsdIsd = async (record: AccountsCsdIsdRecord) => {
    setAccountsCsdIsds((prev) => prev.map((c) => (c.id === record.id ? record : c)));
    syncOperationalAction("EDIT", "accounts_csd_isd", record, "Accounts CSD & ISD", "accounts_csd_isd_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts CSD & ISD",
      targetType: "Accounts CSD & ISD",
      targetId: record.id,
      targetName: record.invoiceNo || record.id,
      details: `${activeUser.name} updated CSD & ISD record for Invoice No "${record.invoiceNo}"`
    });
  };

  const handleDeleteAccountsCsdIsd = async (id: string) => {
    const csdToDelete = accountsCsdIsds.find((c) => c.id === id);
    setAccountsCsdIsds((prev) => prev.filter((c) => c.id !== id));

    if (csdToDelete) {
      syncOperationalAction("DELETE", "accounts_csd_isd", csdToDelete, "Accounts CSD & ISD", "accounts_csd_isd_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts CSD & ISD",
        targetType: "Accounts CSD & ISD",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted CSD & ISD record id ${id}`
      });
    }
  };

  const handleAddAccountsTptS = async (record: Omit<AccountsTptSRecord, "id" | "createdAt">) => {
    const id = `tpt_s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: AccountsTptSRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsTpts((prev) => [newItem, ...prev.filter((t) => t.id !== id)]);
    syncOperationalAction("ADD", "accounts_tpt_s", newItem, "Accounts TPT-S", "accounts_tpt_s_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts TPT-S",
      targetType: "Accounts TPT-S",
      targetId: id,
      targetName: newItem.saleInvoiceNo || id,
      details: `${activeUser.name} created TPT-S record for Sale Invoice No "${newItem.saleInvoiceNo}"`
    });
  };

  const handleUpdateAccountsTptS = async (record: AccountsTptSRecord) => {
    setAccountsTpts((prev) => prev.map((t) => (t.id === record.id ? record : t)));
    syncOperationalAction("EDIT", "accounts_tpt_s", record, "Accounts TPT-S", "accounts_tpt_s_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts TPT-S",
      targetType: "Accounts TPT-S",
      targetId: record.id,
      targetName: record.saleInvoiceNo || record.id,
      details: `${activeUser.name} updated TPT-S record for Sale Invoice No "${record.saleInvoiceNo}"`
    });
  };

  const handleDeleteAccountsTptS = async (id: string) => {
    const tptSToDelete = accountsTpts.find((t) => t.id === id);
    setAccountsTpts((prev) => prev.filter((t) => t.id !== id));

    if (tptSToDelete) {
      syncOperationalAction("DELETE", "accounts_tpt_s", tptSToDelete, "Accounts TPT-S", "accounts_tpt_s_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts TPT-S",
        targetType: "Accounts TPT-S",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted TPT-S record id ${id}`
      });
    }
  };

  const handleAddAccountsTptSt = async (record: Omit<AccountsTptStRecord, "id" | "createdAt">) => {
    const id = `tptst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: AccountsTptStRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setAccountsTptSts((prev) => [newItem, ...prev.filter((t) => t.id !== id)]);
    syncOperationalAction("ADD", "accounts_tpt_st", newItem, "Accounts TPT-ST", "accounts_tpt_st_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Accounts TPT-ST" as any,
      targetType: "Accounts TPT-ST" as any,
      targetId: id,
      targetName: newItem.stockJvOrNewInvoiceNo || id,
      details: `${activeUser.name} created TPT-ST entry for Stock JV/Invoice No "${newItem.stockJvOrNewInvoiceNo}"`
    });
  };

  const handleUpdateAccountsTptSt = async (record: AccountsTptStRecord) => {
    setAccountsTptSts((prev) => prev.map((t) => (t.id === record.id ? record : t)));
    syncOperationalAction("EDIT", "accounts_tpt_st", record, "Accounts TPT-ST", "accounts_tpt_st_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Accounts TPT-ST" as any,
      targetType: "Accounts TPT-ST" as any,
      targetId: record.id,
      targetName: record.stockJvOrNewInvoiceNo || record.id,
      details: `${activeUser.name} updated TPT-ST entry for Stock JV/Invoice No "${record.stockJvOrNewInvoiceNo}"`
    });
  };

  const handleDeleteAccountsTptSt = async (id: string) => {
    const tptStToDelete = accountsTptSts.find((t) => t.id === id);
    setAccountsTptSts((prev) => prev.filter((t) => t.id !== id));

    if (tptStToDelete) {
      syncOperationalAction("DELETE", "accounts_tpt_st", tptStToDelete, "Accounts TPT-ST", "accounts_tpt_st_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Accounts TPT-ST" as any,
        targetType: "Accounts TPT-ST" as any,
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted TPT-ST record id ${id}`
      });
    }
  };

  const handleAddLedgerCrDr = async (data: Omit<LedgerCrDrCategory, "id" | "createdAt">) => {
    const id = `lcd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: LedgerCrDrCategory = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    await saveLedgerCrDr(newItem);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Ledger CR DR",
      targetType: "Ledger CR DR",
      targetId: id,
      targetName: newItem.name,
      details: `${activeUser.name} created Ledger CR DR dropdown item "${newItem.name}"`
    });
  };

  const handleEditLedgerCrDr = async (id: string, data: Omit<LedgerCrDrCategory, "id" | "createdAt">) => {
    const existing = ledgerCrDrs.find(item => item.id === id);
    if (!existing) return;
    const updated: LedgerCrDrCategory = {
      ...existing,
      ...data
    };
    await saveLedgerCrDr(updated);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Ledger CR DR",
      targetType: "Ledger CR DR",
      targetId: id,
      targetName: updated.name,
      details: `${activeUser.name} edited Ledger CR DR dropdown item to "${updated.name}"`
    });
  };

  const handleDeleteLedgerCrDr = async (id: string) => {
    await deleteLedgerCrDrDoc(id);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Ledger CR DR",
      targetType: "Ledger CR DR",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Ledger CR DR dropdown item id "${id}"`
    });
  };

  const handleAddAccountsSupplierCrDr = async (record: Omit<AccountsSupplierCrDrRecord, "id" | "createdAt">) => {
    const id = `scrdr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: AccountsSupplierCrDrRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name
    };
    setAccountsSupplierCrDrs((prev) => [newItem, ...prev.filter((n) => n.id !== id)]);
    syncOperationalAction("ADD", "accounts_supplier_cr_dr", newItem, "Supplier CR/DR Notes", "accounts_supplier_cr_dr_apps_script");

    const nextNotes = [...accountsSupplierCrDrs, newItem];
    await syncPidPurchaseDebitCreditQty(nextNotes);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Supplier CR/DR Note",
      targetType: "Supplier CR/DR Note",
      targetId: id,
      targetName: newItem.noteNo || id,
      details: `${activeUser.name} created Supplier CR/DR Note: No "${newItem.noteNo}" for Party "${newItem.partyName}"`
    });
  };

  const handleUpdateAccountsSupplierCrDr = async (record: AccountsSupplierCrDrRecord) => {
    setAccountsSupplierCrDrs((prev) => prev.map((n) => (n.id === record.id ? record : n)));
    syncOperationalAction("EDIT", "accounts_supplier_cr_dr", record, "Supplier CR/DR Notes", "accounts_supplier_cr_dr_apps_script");

    const nextNotes = accountsSupplierCrDrs.map((n) => n.id === record.id ? record : n);
    await syncPidPurchaseDebitCreditQty(nextNotes);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Supplier CR/DR Note",
      targetType: "Supplier CR/DR Note",
      targetId: record.id,
      targetName: record.noteNo || record.id,
      details: `${activeUser.name} updated Supplier CR/DR Note: No "${record.noteNo}"`
    });
  };

  const handleDeleteAccountsSupplierCrDr = async (id: string) => {
    const noteToDelete = accountsSupplierCrDrs.find((n) => n.id === id);
    setAccountsSupplierCrDrs((prev) => prev.filter((n) => n.id !== id));

    if (noteToDelete) {
      syncOperationalAction("DELETE", "accounts_supplier_cr_dr", noteToDelete, "Supplier CR/DR Notes", "accounts_supplier_cr_dr_apps_script");
    }

    const nextNotes = accountsSupplierCrDrs.filter((n) => n.id !== id);
    await syncPidPurchaseDebitCreditQty(nextNotes);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Supplier CR/DR Note",
      targetType: "Supplier CR/DR Note",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Supplier CR/DR Note record id ${id}`
    });
  };

  const handleAddAccountsCustomerCrDr = async (record: Omit<AccountsCustomerCrDrRecord, "id" | "createdAt">) => {
    const id = `ccrdr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: AccountsCustomerCrDrRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name
    };
    setAccountsCustomerCrDrs((prev) => [newItem, ...prev.filter((n) => n.id !== id)]);
    syncOperationalAction("ADD", "accounts_customer_cr_dr", newItem, "Customer CR/DR Notes", "accounts_customer_cr_dr_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Customer CR/DR Note",
      targetType: "Customer CR/DR Note",
      targetId: id,
      targetName: newItem.noteNo || id,
      details: `${activeUser.name} created Customer CR/DR Note: No "${newItem.noteNo}" for Party "${newItem.partyName}"`
    });
  };

  const handleUpdateAccountsCustomerCrDr = async (record: AccountsCustomerCrDrRecord) => {
    setAccountsCustomerCrDrs((prev) => prev.map((n) => (n.id === record.id ? record : n)));
    syncOperationalAction("EDIT", "accounts_customer_cr_dr", record, "Customer CR/DR Notes", "accounts_customer_cr_dr_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Customer CR/DR Note",
      targetType: "Customer CR/DR Note",
      targetId: record.id,
      targetName: record.noteNo || record.id,
      details: `${activeUser.name} updated Customer CR/DR Note: No "${record.noteNo}"`
    });
  };

  const handleDeleteAccountsCustomerCrDr = async (id: string) => {
    const noteToDelete = accountsCustomerCrDrs.find((n) => n.id === id);
    setAccountsCustomerCrDrs((prev) => prev.filter((n) => n.id !== id));

    if (noteToDelete) {
      syncOperationalAction("DELETE", "accounts_customer_cr_dr", noteToDelete, "Customer CR/DR Notes", "accounts_customer_cr_dr_apps_script");
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete Customer CR/DR Note",
        targetType: "Customer CR/DR Note",
        targetId: id,
        targetName: id,
        details: `${activeUser.name} deleted Customer CR/DR Note record id ${id}`
      });
    }
  };

  const handleAddOpeningStock = async (record: Omit<OpeningStockRecord, "id" | "createdAt">) => {
    const id = `os-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: OpeningStockRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    };
    setOpeningStocks((prev) => [newItem, ...prev.filter((o) => o.id !== id)]);
    syncOperationalAction("ADD", "opening_stocks", newItem, "Opening Stocks", "opening_stocks_apps_script");

    // Auto-populate / append to PID table
    const pidItem = mapOpeningStockToPid(newItem);
    setPids((prev) => [pidItem, ...prev.filter((p) => p.id !== pidItem.id)]);
    syncOperationalAction("ADD", "pids", pidItem, "PIDs", "pids_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Opening Stock",
      targetType: "Opening Stock",
      targetId: id,
      targetName: newItem.beNoOrPurchaseNo || id,
      details: `${activeUser.name} created Opening Stock record for product "${newItem.productName}"`
    });
  };

  const handleUpdateOpeningStock = async (record: OpeningStockRecord) => {
    setOpeningStocks((prev) => prev.map((o) => (o.id === record.id ? record : o)));
    syncOperationalAction("EDIT", "opening_stocks", record, "Opening Stocks", "opening_stocks_apps_script");

    // Update corresponding PID entry
    const pidItem = mapOpeningStockToPid(record);
    setPids((prev) => prev.map((p) => (p.id === pidItem.id ? pidItem : p)));
    syncOperationalAction("EDIT", "pids", pidItem, "PIDs", "pids_apps_script");

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Opening Stock",
      targetType: "Opening Stock",
      targetId: record.id,
      targetName: record.beNoOrPurchaseNo || record.id,
      details: `${activeUser.name} updated Opening Stock record id ${record.id}`
    });
  };

  const handleDeleteOpeningStock = async (id: string) => {
    const stockToDelete = openingStocks.find((o) => o.id === id);
    setOpeningStocks((prev) => prev.filter((o) => o.id !== id));

    if (stockToDelete) {
      syncOperationalAction("DELETE", "opening_stocks", stockToDelete, "Opening Stocks", "opening_stocks_apps_script");
    }

    // Delete corresponding PID entry
    const pidToDelete = pids.find((p) => p.id === id);
    setPids((prev) => prev.filter((p) => p.id !== id));
    if (pidToDelete) {
      syncOperationalAction("DELETE", "pids", pidToDelete, "PIDs", "pids_apps_script");
    }

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Opening Stock",
      targetType: "Opening Stock",
      targetId: id,
      targetName: id,
      details: `${activeUser.name} deleted Opening Stock record id ${id}`
    });
  };

  const handleBulkAddOpeningStock = async (records: Omit<OpeningStockRecord, "id" | "createdAt">[]) => {
    const now = Date.now();
    const createdItems: OpeningStockRecord[] = [];
    const createdPids: PidRecord[] = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const id = `os-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const newItem: OpeningStockRecord = {
        ...rec,
        id,
        createdAt: new Date(now + i).toISOString(),
        createdByUserId: activeUser.id,
        createdByName: activeUser.name,
      };
      createdItems.push(newItem);
      syncOperationalAction("ADD", "opening_stocks", newItem, "Opening Stocks", "opening_stocks_apps_script");

      const pidItem = mapOpeningStockToPid(newItem);
      createdPids.push(pidItem);
      syncOperationalAction("ADD", "pids", pidItem, "PIDs", "pids_apps_script");
    }

    setOpeningStocks((prev) => [...createdItems, ...prev]);
    setPids((prev) => [...createdPids, ...prev]);

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Bulk Import Opening Stock",
      targetType: "Opening Stock",
      targetId: `bulk-${records.length}`,
      targetName: `${records.length} items`,
      details: `${activeUser.name} imported ${records.length} Opening Stock records via CSV/Google Sheets`
    });
  };

  const handleAddPaymentBank = async (newBankData: Omit<PaymentBank, "id" | "createdAt">) => {
    const bankId = `bank-${Date.now()}`;
    const newBank: PaymentBank = {
      ...newBankData,
      id: bankId,
      createdAt: new Date().toISOString(),
    };
    
    await savePaymentBank(newBank);
    
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Order",
      targetType: "Order",
      targetId: bankId,
      targetName: newBank.bankName,
      details: `${activeUser.name} added new bank: "${newBank.bankName}"`
    });
  };
  const handleSaveTeam = async (team: Team) => {
    await saveTeam(team);
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteTeamDoc(teamId);
  };

  const handleDeletePaymentBank = async (id: string) => {
    await deletePaymentBankDoc(id);
  };
  const handleEditPaymentBank = async (id: string, updatedBankData: Omit<PaymentBank, "id" | "createdAt">) => {
    const updatedBank: PaymentBank = {
      ...updatedBankData,
      id,
      createdAt: paymentBanks.find(b => b.id === id)?.createdAt || new Date().toISOString()
    };
    await savePaymentBank(updatedBank);
  };

  // State handlers for clients
  const handleAddClient = async (newClientData: Omit<Client, "id" | "createdAt">) => {
    const clientId = `client-${Date.now()}`;
    const newClient: Client = {
      ...newClientData,
      id: clientId,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id
    };
    await saveClient(newClient);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Lead",
      targetType: "User",
      targetId: clientId,
      targetName: newClient.companyName,
      details: `${activeUser.name} registered new client profile for "${newClient.fullName}" at "${newClient.companyName}"`
    });
  };

  const handleDeleteClient = async (clientId: string) => {
    const clientToDelete = clients.find((c) => c.id === clientId);
    if (!clientToDelete) return;
    await deleteClientDoc(clientId);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Lead",
      targetType: "User",
      targetId: clientId,
      targetName: clientToDelete.companyName,
      details: `${activeUser.name} deleted client profile of "${clientToDelete.fullName}" at "${clientToDelete.companyName}"`
    });
  };

  const handleEditClient = async (clientId: string, updatedData: Partial<Omit<Client, "id" | "createdAt" | "createdByUserId">>) => {
    const targetClient = clients.find((c) => c.id === clientId);
    if (!targetClient) return;

    const updatedClient: Client = {
      ...targetClient,
      ...updatedData
    };

    await saveClient(updatedClient);

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Lead",
      targetType: "User",
      targetId: clientId,
      targetName: updatedClient.companyName,
      details: `${activeUser.name} edited client profile for "${updatedClient.fullName}" at "${updatedClient.companyName}"`
    });
  };

  // State handlers for products
  const handleAddProduct = async (newProductData: Omit<Product, "id" | "createdAt">) => {
    const productId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...newProductData,
      id: productId,
      createdAt: new Date().toISOString(),
      createdByUserId: activeUser.id
    };
    await saveProduct(newProduct);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Product",
      targetType: "Product",
      targetId: productId,
      targetName: newProduct.name,
      details: `${activeUser.name} registered new product entry "${newProduct.name}" in catalog`
    });
  };

  const handleBulkAddProducts = async (newProductsData: (Omit<Product, "id" | "createdAt"> & { id?: string })[]) => {
    const timestamp = new Date().toISOString();
    for (let i = 0; i < newProductsData.length; i++) {
      const item = newProductsData[i];
      const prodId = item.id || `prod-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const newProduct: Product = {
        ...item,
        id: prodId,
        createdAt: timestamp,
        createdByUserId: activeUser.id,
      };
      await saveProduct(newProduct);
    }
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Bulk Import Products",
      targetType: "Product",
      targetId: `bulk-products-${Date.now()}`,
      targetName: `${newProductsData.length} Products`,
      details: `${activeUser.name} bulk imported ${newProductsData.length} products into the catalog`
    });
  };

  const handleEditProduct = async (productId: string, updatedData: Partial<Omit<Product, "id" | "createdAt" | "createdByUserId">>) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;
    const updatedProduct: Product = {
      ...targetProduct,
      ...updatedData
    };
    await saveProduct(updatedProduct);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Product",
      targetType: "Product",
      targetId: productId,
      targetName: updatedProduct.name,
      details: `${activeUser.name} modified properties of product "${updatedProduct.name}"`
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    const productToDelete = products.find((p) => p.id === productId);
    if (!productToDelete) return;
    await deleteProductDoc(productId);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Product",
      targetType: "Product",
      targetId: productId,
      targetName: productToDelete.name,
      details: `${activeUser.name} deleted product entry of "${productToDelete.name}"`
    });
  };

  // State handlers for tasks
  const handleAddTask = async (newTaskData: Omit<SalesTask, "id">) => {
    const taskId = `task-${Date.now()}`;
    const newTask: SalesTask = {
      ...newTaskData,
      id: taskId,
    };
    
    await saveTask(newTask);

    const assigneeName = users.find((u) => u.id === newTask.assignedToUserId)?.name || "Unassigned";
    
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Create Task",
      targetType: "Task",
      targetId: taskId,
      targetName: newTask.title,
      details: `${activeUser.name} assigned task "${newTask.title}" to "${assigneeName}" (Priority: ${newTask.priority})`
    });
  };

  const handleToggleTaskComplete = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updatedStatus: SalesTask["status"] = targetTask.status === "Completed" ? "In Progress" : "Completed";
    const updatedTask = { ...targetTask, status: updatedStatus };

    await saveTask(updatedTask);

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit Task",
      targetType: "Task",
      targetId: taskId,
      targetName: targetTask.title,
      details: `${activeUser.name} toggled completion status of task "${targetTask.title}" to "${updatedStatus}"`
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    await deleteTaskDoc(taskId);

    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Delete Task",
      targetType: "Task",
      targetId: taskId,
      targetName: taskToDelete.title,
      details: `${activeUser.name} deleted task "${taskToDelete.title}"`
    });
  };

  // Clear log state via Google Sheets
  const handleClearLogs = async () => {
    setLogs([]);
    await clearOperationalSheetRecords("logs", "Audit Logs", "audit_logs_apps_script");
  };

  // Admin hierarchy editor
  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await updateUserDetails(userId, updates);
      
      const targetUser = users.find((u) => u.id === userId);
      const targetName = targetUser?.name || userId;

      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Edit User",
        targetType: "User",
        targetId: userId,
        targetName,
        details: `ADMIN ACTION: ${activeUser.name} updated structural properties of individual ${targetName} (${userId}). Updates: ${Object.keys(updates).map(k => `${k} to "${(updates as any)[k]}"`).join(", ")}`
      });
    } catch (err) {
      console.error("Hierarchy change failed:", err);
    }
  };

  const handleAddUser = async (user: User) => {
    await saveUserDoc(user);
    await saveLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: activeUser.id,
      userName: activeUser.name,
      actionType: "Edit User",
      targetType: "User",
      targetId: user.id,
      targetName: user.name,
      details: `ADMIN ACTION: ${activeUser.name} registered new user: "${user.name}" (${user.email})`
    });
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase()));
    const targetName = targetUser?.name || userId;
    const targetEmail = targetUser?.email || userId;
    
    // Optimistic UI state removal
    setUsers(prev => prev.filter(u => u.id !== userId && (!targetEmail || u.email?.toLowerCase() !== targetEmail.toLowerCase())));

    try {
      await deleteUserDoc(userId);
      if (targetEmail && targetEmail.toLowerCase() !== userId.toLowerCase()) {
        await deleteUserDoc(targetEmail);
      }
      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Delete User",
        targetType: "User",
        targetId: userId,
        targetName: targetName,
        details: `ADMIN ACTION: ${activeUser.name} deleted user: "${targetName}" (${targetEmail})`
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      throw err;
    }
  };

  // Admin tab visibility updater
  const handleUpdateTabSettings = async (
    teamName: string, 
    visibleTabs: string[], 
    visibleSubTabs: { [key: string]: string[] }, 
    visibleSubSubTabs: { [key: string]: { [key: string]: string[] } },
    permissions?: { [key: string]: { view: boolean; add: boolean; edit: boolean } }
  ) => {
    try {
      await saveTeamTabSettings(teamName, visibleTabs, visibleSubTabs, visibleSubSubTabs, permissions);

      await saveLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: activeUser.id,
        userName: activeUser.name,
        actionType: "Edit User",
        targetType: "User",
        targetId: teamName,
        targetName: teamName,
        details: `ADMIN ACTION: ${activeUser.name} updated Tab Visibilities & Permissions for Team "${teamName}".`
      });
    } catch (err) {
      console.error("Updating tab visibilities failed:", err);
    }
  };

  // Splendid full screen loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <div className="text-center space-y-1">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400 block">
            Loading Access clearance...
          </span>
          <p className="text-[11px] text-slate-400 font-mono">
            Verifying profile credentials and department clearance...
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-4 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-mono font-bold px-4 py-2 rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut size={13} />
          <span>Logout & Return to Login Page</span>
        </button>
      </div>
    );
  }

  // Intercept authentication flow
  if (!isAuthenticated || !activeUserId) {
    return (
      <AuthScreen 
        onAuthSuccess={() => setIsAuthenticated(true)} 
        externalError={firestoreError}
        onClearExternalError={() => setFirestoreError(null)}
      />
    );
  }

  // Intercept unapproved / pending registration accounts
  // This security screen is ONLY shown to newly registered users whose details are not yet present/configured in the Firestore user table (or whose status is explicitly set to 'pending' or 'disabled').
  const isBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.some(
    (adm) => adm.toLowerCase() === activeUserId.toLowerCase()
  );
  const foundUserInDirectory = users.find(
    (u) => u.id.toLowerCase() === activeUserId.toLowerCase() ||
           (u.email && u.email.toLowerCase() === activeUserId.toLowerCase())
  );
  
  const isAccountActive = isBootstrapAdmin || 
    activeUser.role === Role.Admin || 
    (foundUserInDirectory ? (foundUserInDirectory.status !== "pending" && foundUserInDirectory.status !== "disabled") : (activeUser.status === "active"));

  if (!isAccountActive) {
    return (
      <PendingApprovalScreen
        user={activeUser}
        onSignOut={handleSignOut}
        onRefreshStatus={async () => {
          if (auth.currentUser?.email) {
            await syncUserProfile(
              auth.currentUser.email,
              auth.currentUser.displayName || "",
              auth.currentUser.photoURL || undefined
            );
          }
        }}
      />
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-800 antialiased font-sans flex flex-col">
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[96%] mx-auto px-3 sm:px-4 lg:px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1.5 rounded-md shadow-xs">
              <Briefcase size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                Company Management Portal
              </h1>
              <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Hierarchical Role & Permission Matrix Console
              </p>
            </div>
          </div>

          {/* Header Controls: Theme Mode Toggle, Font Size Toggle, Authenticated Profile Pill & Signout */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Single Button for Toggle between Dark and Light Mode */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-button"
              className="p-1.5 rounded-md border transition-all duration-200 cursor-pointer shadow-2xs bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 dark:border-slate-700 flex items-center justify-center"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-slate-600 dark:text-slate-300" />
              )}
            </button>

            {/* Font Size Changer just right to mode icon */}
            <FontSizeToggle idPrefix="header" />

            {/* Connected Authenticated Profile Pill */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-250 p-1 pl-1.5 pr-2.5 rounded-md shadow-2xs">
              <img
                src={activeUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60"}
                alt={activeUser.name}
                className="w-6 h-6 rounded-md object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-900 leading-none block">
                  {activeUser.name}
                </span>
                <span className="text-[8px] font-mono text-emerald-600 font-bold block mt-0.5">
                  {activeUser.role} • {activeUser.accessLevel}
                </span>
              </div>
            </div>

            {/* Logout trigger */}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center text-slate-400 hover:text-rose-600 p-1.5 rounded border border-transparent hover:border-rose-100 hover:bg-rose-50 transition cursor-pointer"
              title="Sign Out of Portal"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[96%] w-full mx-auto px-3 sm:px-4 lg:px-5 py-3">
        
        {/* Tab Selection Row */}
        <div className="flex border-b border-slate-200/85 mb-3 overflow-x-auto gap-1 pb-0.5 scrollbar-thin">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap -mb-0.5 cursor-pointer ${
                  active
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon size={12} className={active ? "text-emerald-600" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Tab Screen Render */}
        <div className="animate-fade-in">
          {activeTab === "dashboard" && (
            <DashboardView
              activeUserId={activeUserId}
              users={users}
              accountsSts={accountsSts}
              accountsSales={accountsSales}
              accountsDrumings={accountsDrumings}
              accountsOfficeExps={accountsOfficeExps}
              accountsMeis={accountsMeis}
              accountsOtherIncomes={accountsOtherIncomes}
              accountsFdrs={accountsFdrs}
              accountsCsdIsds={accountsCsdIsds}
              accountsTpts={accountsTpts}
              accountsSupplierCrDrs={accountsSupplierCrDrs}
              accountsCustomerCrDrs={accountsCustomerCrDrs}
              importPis={importPis}
              importLcs={importLcs}
              importEtas={importEtas}
              importBoes={importBoes}
              importContainers={importContainers}
              importClearings={importClearings}
              importDrcs={importDrcs}
              importTptis={importTptis}
              importCis={importCis}
              domesticPds={domesticPds}
              domesticTptds={domesticTptds}
            />
          )}

          {activeTab === "import_module" && (
            <ImportView
              visibleSubTabs={effectiveVisibleSubTabs}
              getTabPermission={getTabPermission}
              activeUserId={activeUserId}
              users={users}
              importPis={importPis}
              importLcs={importLcs}
              importEtas={importEtas}
              importBoes={importBoes}
              importContainers={importContainers}
              importClearings={importClearings}
              importProvisionalClearings={importProvisionalClearings}
              importDrcs={importDrcs}
              importTptis={importTptis}
              importCis={importCis}
              tptdCategories={tptdCategories}
              clearingCats={clearingCats}
              aolBranches={aolBranches}
              aolGodowns={aolGodowns}
              suppliers={suppliers}
              paymentBanks={paymentBanks}
              freightTerms={freightTerms}
              drcBankChargesTypes={drcBankChargesTypes}
              drcBankCharges1List={drcBankCharges1List}
              products={products}
              onAddImportPi={handleAddImportPi}
              onUpdateImportPi={handleUpdateImportPi}
              onDeleteImportPi={handleDeleteImportPi}
              onAddImportLc={handleAddImportLc}
              onUpdateImportLc={handleUpdateImportLc}
              onDeleteImportLc={handleDeleteImportLc}
              onAddImportEta={handleAddImportEta}
              onUpdateImportEta={handleUpdateImportEta}
              onDeleteImportEta={handleDeleteImportEta}
              onAddImportBoe={handleAddImportBoe}
              onUpdateImportBoe={handleUpdateImportBoe}
              onDeleteImportBoe={handleDeleteImportBoe}
              onAddImportContainer={handleAddImportContainer}
              onUpdateImportContainer={handleUpdateImportContainer}
              onDeleteImportContainer={handleDeleteImportContainer}
              onAddImportClearing={handleAddImportClearing}
              onUpdateImportClearing={handleUpdateImportClearing}
              onDeleteImportClearing={handleDeleteImportClearing}
              onAddImportDrc={handleAddImportDrc}
              onUpdateImportDrc={handleUpdateImportDrc}
              onDeleteImportDrc={handleDeleteImportDrc}
              onAddImportTpti={handleAddImportTpti}
              onUpdateImportTpti={handleUpdateImportTpti}
              onDeleteImportTpti={handleDeleteImportTpti}
              onAddImportCi={handleAddImportCi}
              onUpdateImportCi={handleUpdateImportCi}
              onDeleteImportCi={handleDeleteImportCi}
              onAddTptdCategory={handleAddTptdCategory}
            />
          )}

          {activeTab === "domestic_tab" && (
            <DomesticView
              visibleSubTabs={effectiveVisibleSubTabs}
              getTabPermission={getTabPermission}
              activeUserId={activeUserId}
              users={users}
              domesticPds={domesticPds}
              domesticTptds={domesticTptds}
              tptdCategories={tptdCategories}
              aolBranches={aolBranches}
              aolGodowns={aolGodowns}
              domesticSuppliers={domesticSuppliers}
              shipToParties={shipToParties}
              clients={clients}
              products={products}
              onAddDomesticPd={handleAddDomesticPd}
              onUpdateDomesticPd={handleUpdateDomesticPd}
              onDeleteDomesticPd={handleDeleteDomesticPd}
              onAddDomesticTptd={handleAddDomesticTptd}
              onUpdateDomesticTptd={handleUpdateDomesticTptd}
              onDeleteDomesticTptd={handleDeleteDomesticTptd}
              onAddTptdCategory={handleAddTptdCategory}
              onAddAolGodown={handleAddAolGodown}
              onAddDomesticSupplier={handleAddDomesticSupplier}
              onAddShipToParty={handleAddShipToParty}
              onAddClient={handleAddClient}
            />
          )}

          {activeTab === "accounts_tab" && (
            <AccountsView
              visibleSubTabs={effectiveVisibleSubTabs}
              getTabPermission={getTabPermission}
              activeUserId={activeUserId}
              users={users}
              clients={clients}
              accountsSts={accountsSts}
              accountsSales={accountsSales}
              accountsDrumings={accountsDrumings}
              accountsOfficeExps={accountsOfficeExps}
              accountsMeis={accountsMeis}
              accountsOtherIncomes={accountsOtherIncomes}
              expenseLedgers={expenseLedgers}
              otherIncomeLedgers={otherIncomeLedgers}
              aolBranches={aolBranches}
              aolGodowns={aolGodowns}
              products={products}
              pids={pids}
              paymentBanks={paymentBanks}
              onAddAccountsSt={handleAddAccountsSt}
              onUpdateAccountsSt={handleUpdateAccountsSt}
              onDeleteAccountsSt={handleDeleteAccountsSt}
              onAddAccountsSales={handleAddAccountsSales}
              onUpdateAccountsSales={handleUpdateAccountsSales}
              onDeleteAccountsSales={handleDeleteAccountsSales}
              onAddAccountsDruming={handleAddAccountsDruming}
              onUpdateAccountsDruming={handleUpdateAccountsDruming}
              onDeleteAccountsDruming={handleDeleteAccountsDruming}
              onAddAccountsOfficeExp={handleAddAccountsOfficeExp}
              onUpdateAccountsOfficeExp={handleUpdateAccountsOfficeExp}
              onDeleteAccountsOfficeExp={handleDeleteAccountsOfficeExp}
              onAddAccountsMeis={handleAddAccountsMeis}
              onUpdateAccountsMeis={handleUpdateAccountsMeis}
              onDeleteAccountsMeis={handleDeleteAccountsMeis}
              onAddAccountsOtherIncome={handleAddAccountsOtherIncome}
              onUpdateAccountsOtherIncome={handleUpdateAccountsOtherIncome}
              onDeleteAccountsOtherIncome={handleDeleteAccountsOtherIncome}
              accountsFdrs={accountsFdrs}
              onAddAccountsFdr={handleAddAccountsFdr}
              onUpdateAccountsFdr={handleUpdateAccountsFdr}
              onDeleteAccountsFdr={handleDeleteAccountsFdr}
              accountsCsdIsds={accountsCsdIsds}
              onAddAccountsCsdIsd={handleAddAccountsCsdIsd}
              onUpdateAccountsCsdIsd={handleUpdateAccountsCsdIsd}
              onDeleteAccountsCsdIsd={handleDeleteAccountsCsdIsd}
              accountsTpts={accountsTpts}
              accountsTptSts={accountsTptSts}
              transporters={transporters}
              tptdCategories={tptdCategories}
              onAddAccountsTptS={handleAddAccountsTptS}
              onUpdateAccountsTptS={handleUpdateAccountsTptS}
              onDeleteAccountsTptS={handleDeleteAccountsTptS}
              onAddAccountsTptSt={handleAddAccountsTptSt}
              onUpdateAccountsTptSt={handleUpdateAccountsTptSt}
              onDeleteAccountsTptSt={handleDeleteAccountsTptSt}
              accountsSupplierCrDrs={accountsSupplierCrDrs}
              accountsCustomerCrDrs={accountsCustomerCrDrs}
              ledgerCrDrs={ledgerCrDrs}
              onAddAccountsSupplierCrDr={handleAddAccountsSupplierCrDr}
              onUpdateAccountsSupplierCrDr={handleUpdateAccountsSupplierCrDr}
              onDeleteAccountsSupplierCrDr={handleDeleteAccountsSupplierCrDr}
              onAddAccountsCustomerCrDr={handleAddAccountsCustomerCrDr}
              onUpdateAccountsCustomerCrDr={handleUpdateAccountsCustomerCrDr}
              onDeleteAccountsCustomerCrDr={handleDeleteAccountsCustomerCrDr}
              canAddSupplierCrDr={getTabPermission("accounts_tab/supplier_cr_dr", "add")}
              canEditSupplierCrDr={getTabPermission("accounts_tab/supplier_cr_dr", "edit")}
              canAddCustomerCrDr={getTabPermission("accounts_tab/customer_cr_dr", "add")}
              canEditCustomerCrDr={getTabPermission("accounts_tab/customer_cr_dr", "edit")}
            />
          )}

          {activeTab === "backend" && (
            <BackendView
              activeUserId={activeUserId}
              users={users}
              importCis={importCis}
              domesticPds={domesticPds}
              pids={pids}
              accountsSts={accountsSts}
              openingStocks={openingStocks}
              onUpdateImportCi={handleUpdateImportCi}
              onUpdateDomesticPd={handleUpdateDomesticPd}
              onUpdatePid={handleUpdatePid}
              onAddOpeningStock={handleAddOpeningStock}
              onUpdateOpeningStock={handleUpdateOpeningStock}
              onDeleteOpeningStock={handleDeleteOpeningStock}
              onBulkAddOpeningStock={handleBulkAddOpeningStock}
            />
          )}



          {activeTab === "list_management" && (
            <ListManagementView
              activeUserId={activeUserId}
              aolGodowns={aolGodowns}
              domesticSuppliers={domesticSuppliers}
              shipToParties={shipToParties}
              onAddAolGodown={handleAddAolGodown}
              onEditAolGodown={handleEditAolGodown}
              onDeleteAolGodown={handleDeleteAolGodown}
              onAddDomesticSupplier={handleAddDomesticSupplier}
              onEditDomesticSupplier={handleEditDomesticSupplier}
              onDeleteDomesticSupplier={handleDeleteDomesticSupplier}
              onAddShipToParty={handleAddShipToParty}
              onEditShipToParty={handleEditShipToParty}
              onDeleteShipToParty={handleDeleteShipToParty}
              users={users}
              products={products}
              clients={clients}
              teams={teams}
              paymentBanks={paymentBanks}
              categories={productCategories}
              groups={productGroups}
              manufacturers={manufacturers}
              freightTerms={freightTerms}
              transporters={transporters}
              warehouses={warehouses}
              dispatchLocations={dispatchLocations}
              aolBranches={aolBranches}
              suppliers={suppliers}
              clearingCats={clearingCats}
              workflows={workflows}
              tasks={tasks}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onBulkAddProducts={handleBulkAddProducts}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddProductCategory}
              onEditCategory={handleEditProductCategory}
              onDeleteCategory={handleDeleteProductCategory}
              onAddGroup={handleAddProductGroup}
              onEditGroup={handleEditProductGroup}
              onDeleteGroup={handleDeleteProductGroup}
              onAddManufacturer={handleAddManufacturer}
              onEditManufacturer={handleEditManufacturer}
              onDeleteManufacturer={handleDeleteManufacturer}
              onAddFreightTerm={handleAddFreightTerm}
              onEditFreightTerm={handleEditFreightTerm}
              onDeleteFreightTerm={handleDeleteFreightTerm}
              onAddTransporter={handleAddTransporter}
              onEditTransporter={handleEditTransporter}
              onDeleteTransporter={handleDeleteTransporter}
              onAddWarehouse={handleAddWarehouse}
              onEditWarehouse={handleEditWarehouse}
              onDeleteWarehouse={handleDeleteWarehouse}
              onAddDispatchLocation={handleAddDispatchLocation}
              onEditDispatchLocation={handleEditDispatchLocation}
              onDeleteDispatchLocation={handleDeleteDispatchLocation}
              onAddAolBranch={handleAddAolBranch}
              onEditAolBranch={handleEditAolBranch}
              onDeleteAolBranch={handleDeleteAolBranch}
              onAddSupplier={handleAddSupplier}
              onEditSupplier={handleEditSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onAddClearingCat={handleAddClearingCat}
              onEditClearingCat={handleEditClearingCat}
              onDeleteClearingCat={handleDeleteClearingCat}
              drcBankChargesTypes={drcBankChargesTypes}
              drcBankCharges1List={drcBankCharges1List}
              onAddDrcBankChargesType={handleAddDrcBankChargesType}
              onEditDrcBankChargesType={handleEditDrcBankChargesType}
              onDeleteDrcBankChargesType={handleDeleteDrcBankChargesType}
              onAddDrcBankCharges1={handleAddDrcBankCharges1}
              onEditDrcBankCharges1={handleEditDrcBankCharges1}
              onDeleteDrcBankCharges1={handleDeleteDrcBankCharges1}
               tptdCategories={tptdCategories}
              onAddTptdCategory={handleAddTptdCategory}
              onEditTptdCategory={handleEditTptdCategory}
              onDeleteTptdCategory={handleDeleteTptdCategory}
              ledgerCrDrs={ledgerCrDrs}
              onAddLedgerCrDr={handleAddLedgerCrDr}
              onEditLedgerCrDr={handleEditLedgerCrDr}
              onDeleteLedgerCrDr={handleDeleteLedgerCrDr}
              expenseLedgers={expenseLedgers}
              onAddExpenseLedger={handleAddExpenseLedger}
              onEditExpenseLedger={handleUpdateExpenseLedger}
              onDeleteExpenseLedger={handleDeleteExpenseLedger}
              otherIncomeLedgers={otherIncomeLedgers}
              onAddOtherIncomeLedger={handleAddOtherIncomeLedger}
              onEditOtherIncomeLedger={handleUpdateOtherIncomeLedger}
              onDeleteOtherIncomeLedger={handleDeleteOtherIncomeLedger}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              onAddTask={handleAddTask}
              onToggleTaskComplete={handleToggleTaskComplete}
              onDeleteTask={handleDeleteTask}
              onAddPaymentBank={handleAddPaymentBank}
              onDeletePaymentBank={handleDeletePaymentBank}
              onEditPaymentBank={handleEditPaymentBank}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              visibleSubTabs={effectiveVisibleSubTabs}
              visibleSubSubTabs={userTeamSetting?.visibleSubSubTabs}
            />
          )}


          {activeTab === "team" && (
            <TeamDirectoryView
              users={users}
              activeUserId={activeUserId}
              onUpdateUser={handleUpdateUser}
              onSaveUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              tabSettings={tabSettings}
              onUpdateTabSettings={handleUpdateTabSettings}
              teams={teams}
              onSaveTeam={handleSaveTeam}
              onDeleteTeam={handleDeleteTeam}
            />
          )}

          {activeTab === "logs" && (
            <AuditLogsView
              logs={logs}
              onClearLogs={handleClearLogs}
              isAdmin={activeUser.role === Role.Admin}
              isAuditLogEnabled={isAuditLogEnabledState}
              onToggleAuditLog={handleToggleAuditLog}
              activeUserId={activeUserId}
              users={users}
              onAddLog={saveLog}
              onUpdateLog={async (l) => {
                await saveLog(l);
              }}
            />
          )}

          {activeTab === "admin" && (
            <AdminView
              activeUserId={activeUserId}
              allCollectionsData={allCollectionsData}
              saveLog={saveLog}
            />
          )}
        </div>
      </main>

      {/* Footer credits bar */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-4 shrink-0">
        <div className="max-w-[96%] mx-auto px-3 sm:px-4 lg:px-5 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-400 gap-1.5">
          <span>
            Company Management Portal • Powered securely by Cloud Firebase Authentication & Firestore NoSQL Data Storage
          </span>
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <span className="h-1 w-1 bg-emerald-500 rounded-full"></span>
            <span>Real-time Permission Authorization Locked</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
