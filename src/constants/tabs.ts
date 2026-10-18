export interface SubTabConfig {
  id: string;
  label: string;
}

export interface TabConfig {
  id: string;
  label: string;
  subTabs?: SubTabConfig[];
}

export const TABS_CONFIG: TabConfig[] = [
  { id: "dashboard", label: "Dashboard" },
  {
    id: "import_module",
    label: "Import",
    subTabs: [
      { id: "pi", label: "PI" },
      { id: "lc", label: "LC" },
      { id: "eta", label: "ETA" },
      { id: "boe", label: "BOE" },
      { id: "containers", label: "Containers" },
      { id: "boe_cn", label: "BOE_CN" },
      { id: "igm", label: "IGM & Item" },
      { id: "deferred_duty", label: "Deferred Duty" },
      { id: "tpti", label: "TPT-I" },
      { id: "clearing", label: "Clearing" },
      { id: "drc", label: "DRC" },
      { id: "ci", label: "IP" }
    ]
  },
  {
    id: "domestic_tab",
    label: "Domestic",
    subTabs: [
      { id: "pd", label: "PD" },
      { id: "tptd", label: "TPT-D" }
    ]
  },
  {
    id: "accounts_tab",
    label: "Accounts",
    subTabs: [
      { id: "st", label: "ST (Stock Transfer)" },
      { id: "sales", label: "Sales" },
      { id: "druming", label: "Druming" },
      { id: "office_exp", label: "Office Exp" },
      { id: "other_income", label: "Other Income" },
      { id: "meis", label: "MEIS" },
      { id: "fdr", label: "FDR" },
      { id: "csd_isd", label: "CSD & ISD" },
      { id: "tpt_s", label: "TPT-S" },
      { id: "supplier_cr_dr", label: "Supplier CR/DR Note" },
      { id: "customer_cr_dr", label: "Customer CR/DR Note" }
    ]
  },
  { id: "backend", label: "Backend" },
  {
    id: "list_management",
    label: "List Management",
    subTabs: [
      { id: "products", label: "Product Catalog" },
      { id: "users", label: "User Management" },
      { id: "clients", label: "Client Management" },
      { id: "banks", label: "Payment Bank" },
      { id: "godowns", label: "Godowns" },
      { id: "expense_ledger", label: "Expense Ledger" },
      { id: "other_income_ledger", label: "Ledger" },
      { id: "dropdowns", label: "Dropdowns" }
    ]
  },
  { id: "team", label: "Hierarchy & Team" },
  { id: "logs", label: "Audit Log Trial" },
];
