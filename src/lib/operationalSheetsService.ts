/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchViaAppsScript, syncRecordToAppsScript, MODULE_CONFIGS, getBlueprintFieldsForCollection } from "./googleSheetsService";
import { getAppsScriptConfig, getGoogleSheetsSettings } from "./firebaseService";

export interface OperationalSheetConfig {
  collectionKey: string;
  configKey: string;
  defaultSheetName: string;
  label: string;
}

export const OPERATIONAL_COLLECTIONS: OperationalSheetConfig[] = [
  { collectionKey: "import_pis", configKey: "import_pi_config", defaultSheetName: "Import PIs", label: "Proforma Invoices (PI)" },
  { collectionKey: "import_lcs", configKey: "import_lcs_apps_script", defaultSheetName: "Import LCs", label: "Letters of Credit (LC)" },
  { collectionKey: "import_etas", configKey: "import_etas_apps_script", defaultSheetName: "Import ETAs", label: "Shipment ETAs" },
  { collectionKey: "import_boes", configKey: "import_boes_apps_script", defaultSheetName: "Import BOEs", label: "Bills of Entry (BOE)" },
  { collectionKey: "import_containers", configKey: "import_containers_apps_script", defaultSheetName: "Import Containers", label: "Containers" },
  { collectionKey: "import_clearings", configKey: "import_clearings_apps_script", defaultSheetName: "Import Clearings", label: "Clearing Records" },
  { collectionKey: "import_provisional_clearings", configKey: "import_clearings_apps_script", defaultSheetName: "Provisional Clearings", label: "Provisional Clearings" },
  { collectionKey: "import_drcs", configKey: "import_drcs_apps_script", defaultSheetName: "Import DRCs", label: "DRC Records" },
  { collectionKey: "import_tptis", configKey: "import_tptis_apps_script", defaultSheetName: "Import TPTIs", label: "Import Transport (TPTI)" },
  { collectionKey: "import_cis", configKey: "import_cis_apps_script", defaultSheetName: "Import CIs", label: "Commercial Invoices / Inward" },
  { collectionKey: "domestic_pds", configKey: "domestic_pds_apps_script", defaultSheetName: "Domestic PDs", label: "Domestic PDs" },
  { collectionKey: "domestic_tptds", configKey: "domestic_tptds_apps_script", defaultSheetName: "Domestic TPTDs", label: "Domestic Transport (TPTD)" },
  { collectionKey: "accounts_sts", configKey: "accounts_sts_apps_script", defaultSheetName: "Accounts ST", label: "Accounts ST" },
  { collectionKey: "accounts_sales", configKey: "accounts_sales_apps_script", defaultSheetName: "Accounts Sales", label: "Accounts Sales" },
  { collectionKey: "accounts_drumings", configKey: "accounts_drumings_apps_script", defaultSheetName: "Accounts Drumming", label: "Drumming" },
  { collectionKey: "accounts_office_exps", configKey: "accounts_office_exps_apps_script", defaultSheetName: "Office Expenses", label: "Office Expenses" },
  { collectionKey: "accounts_meis", configKey: "accounts_meis_apps_script", defaultSheetName: "Accounts MEIS", label: "Accounts MEIS" },
  { collectionKey: "accounts_other_incomes", configKey: "accounts_other_incomes_apps_script", defaultSheetName: "Other Income", label: "Other Income" },
  { collectionKey: "accounts_fdrs", configKey: "accounts_fdrs_apps_script", defaultSheetName: "Accounts FDR", label: "Accounts FDR" },
  { collectionKey: "accounts_csd_isd", configKey: "accounts_csd_isd_apps_script", defaultSheetName: "Accounts CSD ISD", label: "CSD / ISD" },
  { collectionKey: "accounts_tpt_s", configKey: "accounts_tpt_s_apps_script", defaultSheetName: "Accounts TPT S", label: "Transport S" },
  { collectionKey: "accounts_tpt_st", configKey: "accounts_tpt_st_apps_script", defaultSheetName: "Accounts TPT ST", label: "Transport ST" },
  { collectionKey: "accounts_supplier_cr_dr", configKey: "accounts_supplier_cr_dr_apps_script", defaultSheetName: "Supplier Cr Dr", label: "Supplier Cr/Dr" },
  { collectionKey: "accounts_customer_cr_dr", configKey: "accounts_customer_cr_dr_apps_script", defaultSheetName: "Customer Cr Dr", label: "Customer Cr/Dr" },
  { collectionKey: "opening_stocks", configKey: "opening_stocks_apps_script", defaultSheetName: "Opening Stocks", label: "Opening Stock" },
  { collectionKey: "pids", configKey: "pids_apps_script", defaultSheetName: "PIDs", label: "PID Records" },
  { collectionKey: "logs", configKey: "audit_logs_apps_script", defaultSheetName: "Audit Logs", label: "Audit Log Trail" }
];

// In-memory cache for resolved Apps Script URLs to avoid redundant Firestore reads
const urlCache: { [configKey: string]: { url: string; sheetName: string } } = {};
let globalAppsScriptUrlCache: string | null = null;

/**
 * Resolves the Google Apps Script Web App URL and Sheet Name for an operational table.
 * Priority: Specific Config Doc in Firestore settings -> Global Google Sheets config in Firestore -> Empty
 */
export async function getOperationalSheetEndpoint(configKey: string, defaultSheetName: string): Promise<{ url: string; sheetName: string }> {
  if (urlCache[configKey] && urlCache[configKey].url) {
    return urlCache[configKey];
  }

  let sheetName = defaultSheetName;
  let url = "";

  try {
    const config = await getAppsScriptConfig(configKey, defaultSheetName);
    if (config?.appsScriptUrl && config.appsScriptUrl.trim()) {
      url = config.appsScriptUrl.trim();
      if (config.sheetName) sheetName = config.sheetName;
    }
  } catch {
    // ignore
  }

  if (!url) {
    try {
      if (globalAppsScriptUrlCache === null) {
        const globalSettings = await getGoogleSheetsSettings();
        globalAppsScriptUrlCache = globalSettings?.appsScriptUrl?.trim() || "";
      }
      if (globalAppsScriptUrlCache) {
        url = globalAppsScriptUrlCache;
      }
    } catch {
      // ignore
    }
  }

  const result = { url, sheetName };
  if (url) {
    urlCache[configKey] = result;
  }
  return result;
}

/**
 * Clears URL cache so newly saved settings in Firestore are refreshed immediately
 */
export function clearSheetUrlCache(): void {
  for (const k in urlCache) delete urlCache[k];
  globalAppsScriptUrlCache = null;
}

/**
 * Loads operational records from Google Sheet via Apps Script deployed URL.
 */
export async function fetchOperationalSheetData(
  collectionKey: string,
  defaultSheetName: string,
  configKey: string
): Promise<any[]> {
  const { url, sheetName } = await getOperationalSheetEndpoint(configKey, defaultSheetName);
  if (!url) {
    return [];
  }

  try {
    const records = await fetchViaAppsScript(url, sheetName, collectionKey);
    return records || [];
  } catch (err) {
    console.warn(`[OperationalSheet] Could not load ${collectionKey} from Google Sheet (${sheetName}):`, err);
    return [];
  }
}

/**
 * Executes a CRUD operation (ADD, EDIT, DELETE) directly against Google Sheet via Apps Script deployed URL.
 */
export async function syncOperationalAction(
  action: "ADD" | "EDIT" | "DELETE",
  collectionKey: string,
  record: any,
  defaultSheetName: string,
  configKey: string
): Promise<{ status: "success" | "warning" | "skipped"; message?: string }> {
  const { url, sheetName } = await getOperationalSheetEndpoint(configKey, defaultSheetName);
  if (!url) {
    console.warn(`[OperationalSheet] No Apps Script URL configured for ${collectionKey} (${configKey})`);
    return { status: "skipped", message: "No Apps Script URL configured" };
  }

  return syncRecordToAppsScript(url, action, collectionKey, record, sheetName);
}

/**
 * Clears all records of an operational worksheet in Google Sheets via Apps Script.
 */
export async function clearOperationalSheetRecords(
  collectionKey: string,
  defaultSheetName: string,
  configKey: string
): Promise<{ status: "success" | "warning" | "skipped"; message?: string }> {
  const { url, sheetName } = await getOperationalSheetEndpoint(configKey, defaultSheetName);
  if (!url) {
    console.warn(`[OperationalSheet] No Apps Script URL configured for ${collectionKey} (${configKey})`);
    return { status: "skipped", message: "No Apps Script URL configured" };
  }

  return syncRecordToAppsScript(url, "CLEAR" as any, collectionKey, {}, sheetName);
}
