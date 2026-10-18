/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import blueprintJson from "../../firebase-blueprint.json";

export interface SyncCollectionConfig {
  key: string;
  sheetName: string;
  label: string;
}

export interface SyncModuleConfig {
  id: "import" | "domestic" | "accounts" | "backend" | "audit_trail";
  title: string;
  collections: SyncCollectionConfig[];
}

export const MODULE_CONFIGS: SyncModuleConfig[] = [
  {
    id: "import",
    title: "Import Module",
    collections: [
      { key: "import_pis", sheetName: "Import PIs", label: "Proforma Invoices (PI)" },
      { key: "import_lcs", sheetName: "Import LCs", label: "Letters of Credit (LC)" },
      { key: "import_etas", sheetName: "Import ETAs", label: "Shipment ETAs" },
      { key: "import_boes", sheetName: "Import BOEs", label: "Bills of Entry (BOE)" },
      { key: "import_containers", sheetName: "Import Containers", label: "Containers" },
      { key: "import_clearings", sheetName: "Import Clearings", label: "Clearing Records" },
      { key: "import_cis", sheetName: "Import CIs", label: "Commercial Invoices / Custom Inward" },
      { key: "import_drcs", sheetName: "Import DRCs", label: "DRC Records" },
      { key: "import_tptis", sheetName: "Import TPTIs", label: "Import Transport (TPTI)" }
    ]
  },
  {
    id: "domestic",
    title: "Domestic Module",
    collections: [
      { key: "domestic_pds", sheetName: "Domestic PDs", label: "Purchase Details (PD)" },
      { key: "domestic_tptds", sheetName: "Domestic TPTDs", label: "Domestic Transport (TPTD)" }
    ]
  },
  {
    id: "accounts",
    title: "Accounts Module",
    collections: [
      { key: "accounts_sts", sheetName: "Accounts ST", label: "ST / Advance" },
      { key: "accounts_sales", sheetName: "Accounts Sales", label: "Sales" },
      { key: "accounts_drumings", sheetName: "Accounts Drumming", label: "Drumming" },
      { key: "accounts_office_exps", sheetName: "Office Expenses", label: "Office Expenses" },
      { key: "accounts_meis", sheetName: "Accounts MEIS", label: "MEIS" },
      { key: "accounts_other_incomes", sheetName: "Other Income", label: "Other Income" },
      { key: "accounts_fdrs", sheetName: "Accounts FDR", label: "FDR Records" },
      { key: "accounts_csd_isd", sheetName: "Accounts CSD ISD", label: "CSD / ISD" },
      { key: "accounts_tpt_s", sheetName: "Accounts TPT S", label: "Transport S" },
      { key: "accounts_tpt_st", sheetName: "Accounts TPT ST", label: "Transport ST" },
      { key: "accounts_supplier_cr_dr", sheetName: "Supplier Cr Dr", label: "Supplier Cr/Dr" },
      { key: "accounts_customer_cr_dr", sheetName: "Customer Cr Dr", label: "Customer Cr/Dr" }
    ]
  },
  {
    id: "backend",
    title: "Backend & Inventory Module",
    collections: [
      { key: "opening_stocks", sheetName: "Opening Stocks", label: "Opening Stock" },
      { key: "pids", sheetName: "PIDs", label: "PID Records" }
    ]
  },
  {
    id: "audit_trail",
    title: "Audit Log Trail Module",
    collections: [
      { key: "logs", sheetName: "Audit Logs", label: "Audit Log Trail" }
    ]
  }
];

// Helper to get schema fields from firebase-blueprint.json
export function getBlueprintFieldsForCollection(collectionKey: string): { name: string; type: string }[] {
  const collections = (blueprintJson as any).collections || {};
  const collectionDef = collections[collectionKey];
  if (!collectionDef || !collectionDef.fields) {
    return [{ name: "id", type: "string" }];
  }

  const fieldsObj = collectionDef.fields;
  return Object.keys(fieldsObj).map((fieldName) => {
    const rawType = fieldsObj[fieldName] as string;
    let baseType = "string";
    if (rawType.startsWith("number")) baseType = "number";
    else if (rawType.startsWith("boolean")) baseType = "boolean";
    else if (rawType.startsWith("array")) baseType = "array";
    else if (rawType.startsWith("object")) baseType = "object";
    return { name: fieldName, type: baseType };
  });
}

/**
 * Creates a new Google Spreadsheet with worksheets pre-created for the specified module collections.
 */
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string,
  collections: SyncCollectionConfig[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheets = collections.map((col) => ({
    properties: {
      title: col.sheetName
    }
  }));

  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: { title },
      sheets
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Spreadsheet (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
  };
}

/**
 * Ensures that all worksheets exist in the Google Spreadsheet.
 */
export async function ensureWorksheetsExist(
  accessToken: string,
  spreadsheetId: string,
  collections: SyncCollectionConfig[]
): Promise<string[]> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch spreadsheet details (${response.status}): ${errText}`);
  }

  const spreadsheet = await response.json();
  const existingTitles: string[] = (spreadsheet.sheets || []).map(
    (s: any) => s.properties?.title
  );

  const missingSheets = collections.filter(
    (col) => !existingTitles.includes(col.sheetName)
  );

  if (missingSheets.length > 0) {
    const requests = missingSheets.map((col) => ({
      addSheet: { properties: { title: col.sheetName } }
    }));

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requests })
      }
    );

    if (!updateRes.ok) {
      console.warn("Could not create missing worksheets:", await updateRes.text());
    }
  }

  return existingTitles.concat(missingSheets.map((s) => s.sheetName));
}

/**
 * Exports Firestore records of a single collection to a worksheet in Google Sheets.
 */
export async function exportCollectionToSheet(
  accessToken: string,
  spreadsheetId: string,
  collectionKey: string,
  sheetName: string,
  records: any[]
): Promise<{ count: number }> {
  const fieldsDef = getBlueprintFieldsForCollection(collectionKey);
  const headerRow = fieldsDef.map((f) => f.name);

  const dataRows = records.map((rec) => {
    return fieldsDef.map((f) => {
      const val = rec[f.name];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") {
        return JSON.stringify(val);
      }
      return String(val);
    });
  });

  const values = [headerRow, ...dataRows];

  // 1. Clear existing sheet values
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'!A1:ZZ100000:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!clearRes.ok) {
    console.warn("Sheet clear warning:", await clearRes.text());
  }

  // 2. Write new values
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        range: `'${sheetName}'!A1`,
        majorDimension: "ROWS",
        values
      })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Error updating sheet '${sheetName}': ${errText}`);
  }

  return { count: records.length };
}

/**
 * Exports collection records using Google Apps Script Web App URL.
 */
export async function exportViaAppsScript(
  appsScriptUrl: string,
  spreadsheetId: string,
  collectionKey: string,
  sheetName: string,
  records: any[]
): Promise<{ count: number }> {
  const fieldsDef = getBlueprintFieldsForCollection(collectionKey);
  const payload = {
    action: "export",
    spreadsheetId,
    collectionKey,
    sheetName,
    fields: fieldsDef,
    records
  };

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apps Script export failed (${response.status}): ${errText}`);
  }

  const resData = await response.json().catch(() => ({ status: "success" }));
  if (resData.status === "error") {
    throw new Error(resData.message || "Apps Script returned error during export");
  }

  return { count: records.length };
}

/**
 * Fetches collection records using Google Apps Script Web App URL.
 */
export interface ImportSubTabMeta {
  id: string;
  configKey: string;
  defaultSheetName: string;
  collectionKey: string;
  label: string;
}

export const IMPORT_SUB_TABS_CONFIG: ImportSubTabMeta[] = [
  { id: "pi", configKey: "import_pi_config", defaultSheetName: "Import PIs", collectionKey: "import_pis", label: "Proforma Invoices (PI)" },
  { id: "lc", configKey: "import_lcs_apps_script", defaultSheetName: "Import LCs", collectionKey: "import_lcs", label: "Letters of Credit (LC)" },
  { id: "eta", configKey: "import_etas_apps_script", defaultSheetName: "Import ETAs", collectionKey: "import_etas", label: "Shipment ETAs" },
  { id: "boe", configKey: "import_boes_apps_script", defaultSheetName: "Import BOEs", collectionKey: "import_boes", label: "Bills of Entry (BOE)" },
  { id: "containers", configKey: "import_containers_apps_script", defaultSheetName: "Import Containers", collectionKey: "import_containers", label: "Containers" },
  { id: "boe_cn", configKey: "import_boe_cn_apps_script", defaultSheetName: "BOE_CN", collectionKey: "import_containers", label: "BOE & Containers (BOE_CN)" },
  { id: "igm", configKey: "import_container_igm_config", defaultSheetName: "Import IGM", collectionKey: "import_containers", label: "IGM & Item" },
  { id: "deferred_duty", configKey: "import_boe_duty_config", defaultSheetName: "Deferred Duty", collectionKey: "import_boes", label: "Deferred Duty" },
  { id: "tpti", configKey: "import_tptis_apps_script", defaultSheetName: "Import TPTIs", collectionKey: "import_tptis", label: "Import Transport (TPTI)" },
  { id: "clearing", configKey: "import_clearings_apps_script", defaultSheetName: "Import Clearings", collectionKey: "import_clearings", label: "Clearing" },
  { id: "drc", configKey: "import_drcs_apps_script", defaultSheetName: "Import DRCs", collectionKey: "import_drcs", label: "DRC" },
  { id: "ci", configKey: "import_cis_apps_script", defaultSheetName: "Import CIs", collectionKey: "import_cis", label: "Commercial Invoices (IP)" }
];

/**
 * Normalizes raw records fetched from Google Sheets into valid collection documents.
 * Handles header variations, whitespace trimming, and type casting based on blueprint schema.
 */
export function normalizeSheetRecords(rawRecords: any[], collectionKey: string = ""): any[] {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) return [];
  
  const fieldsDef = collectionKey ? getBlueprintFieldsForCollection(collectionKey) : [];
  const fieldsMap: { [normalizedKey: string]: { name: string; type: string } } = {};
  fieldsDef.forEach((f) => {
    fieldsMap[f.name.toLowerCase().replace(/[^a-z0-9]/g, "")] = f;
  });

  return rawRecords.map((rawRow, idx) => {
    if (!rawRow || typeof rawRow !== "object") return null;
    const normalized: any = {};
    const rawKeys = Object.keys(rawRow);

    rawKeys.forEach((key) => {
      let val = rawRow[key];
      if (typeof val === "string") val = val.trim();
      if (val === "" || val === null || val === undefined) return;

      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedField = fieldsMap[cleanKey];

      const targetField = matchedField ? matchedField.name : key;
      const targetType = matchedField ? matchedField.type : "string";

      if (targetType === "number") {
        const numVal = typeof val === "number" ? val : Number(String(val).replace(/,/g, ""));
        if (!isNaN(numVal)) {
          normalized[targetField] = numVal;
        } else {
          normalized[targetField] = val;
        }
      } else if (targetType === "boolean") {
        normalized[targetField] = String(val).toLowerCase() === "true" || String(val) === "1" || String(val).toLowerCase() === "yes";
      } else if (targetType === "array" || targetType === "object") {
        if (typeof val === "object") {
          normalized[targetField] = val;
        } else {
          try {
            normalized[targetField] = JSON.parse(val);
          } catch {
            normalized[targetField] = val;
          }
        }
      } else {
        normalized[targetField] = val;
      }
    });

    if (!normalized.id) {
      normalized.id = `${(collectionKey || "rec").replace(/_/g, "")}-${Date.now()}-${idx + 1}`;
    }
    if (!normalized.createdAt) {
      normalized.createdAt = new Date().toISOString();
    }

    return normalized;
  }).filter(Boolean);
}

/**
 * Fetches collection records using Google Apps Script Web App URL.
 * Supports both signatures:
 *   fetchViaAppsScript(url, spreadsheetId, collectionKey, sheetName)
 *   fetchViaAppsScript(url, sheetName, collectionKey)
 */
export async function fetchViaAppsScript(
  appsScriptUrl: string,
  arg2: string,
  arg3?: string,
  arg4?: string
): Promise<any[]> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    throw new Error("Apps Script Web App URL is required.");
  }

  let spreadsheetId = "";
  let collectionKey = "";
  let sheetName = "";

  if (arg4 !== undefined) {
    spreadsheetId = arg2;
    collectionKey = arg3 || "";
    sheetName = arg4;
  } else {
    sheetName = arg2;
    collectionKey = arg3 || "";
  }

  const cleanUrl = appsScriptUrl.trim();
  const fieldsDef = collectionKey ? getBlueprintFieldsForCollection(collectionKey) : [];

  // Try POST action: "FETCH" first
  try {
    const payload = {
      action: "FETCH",
      spreadsheetId,
      collectionKey,
      sheetName,
      fields: fieldsDef
    };

    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData && resData.status === "error") {
        throw new Error(resData.message || "Apps Script returned error during fetch");
      }
      if (resData && Array.isArray(resData.records)) {
        return normalizeSheetRecords(resData.records, collectionKey);
      }
    }
  } catch (postErr: any) {
    console.warn("Apps Script POST fetch failed, falling back to GET:", postErr);
  }

  // Fallback to GET action=FETCH
  try {
    const getUrl = new URL(cleanUrl);
    getUrl.searchParams.set("action", "FETCH");
    getUrl.searchParams.set("sheetName", sheetName);
    if (spreadsheetId) getUrl.searchParams.set("spreadsheetId", spreadsheetId);

    const getRes = await fetch(getUrl.toString(), { redirect: "follow" });
    if (!getRes.ok) {
      const errText = await getRes.text().catch(() => "");
      throw new Error(`Apps Script fetch failed (${getRes.status}): ${errText}`);
    }

    const resData = await getRes.json();
    if (resData && resData.status === "error") {
      throw new Error(resData.message || "Apps Script returned error during fetch");
    }

    return normalizeSheetRecords(resData.records || [], collectionKey);
  } catch (getErr: any) {
    throw new Error(`Failed to fetch from Google Sheet tab '${sheetName}': ${getErr?.message || String(getErr)}`);
  }
}

/**
 * Fetches records from a public Google Sheet CSV endpoint without requiring OAuth.
 */
export async function fetchPublicGoogleSheetCsv(
  spreadsheetId: string,
  sheetName: string,
  collectionKey: string
): Promise<any[]> {
  const fieldsDef = getBlueprintFieldsForCollection(collectionKey);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(`Could not fetch public Google Sheet CSV (${res.status}). Ensure the sheet is shared as 'Anyone with link can view'.`);
  }

  const csvText = await res.text();
  const rows = parseCsvText(csvText);

  if (rows.length <= 1) {
    return [];
  }

  const headerRow = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
  const dataRows = rows.slice(1);

  const headerMap: { [fieldName: string]: number } = {};
  headerRow.forEach((colName, idx) => {
    headerMap[colName] = idx;
  });

  const parsedRecords: any[] = [];

  dataRows.forEach((row, rowIdx) => {
    let idVal = (headerMap["id"] !== undefined && row[headerMap["id"]]) ? row[headerMap["id"]].replace(/^"|"$/g, '').trim() : "";
    if (!idVal) {
      idVal = `${collectionKey.replace("_", "")}-${Date.now()}-${rowIdx}`;
    }

    const recordObj: any = { id: idVal };

    fieldsDef.forEach((fieldDef) => {
      const colIdx = headerMap[fieldDef.name];
      if (colIdx !== undefined && row[colIdx] !== undefined) {
        const rawVal = row[colIdx].replace(/^"|"$/g, '').trim();
        if (rawVal === "") return;

        if (fieldDef.type === "number") {
          const num = Number(rawVal);
          if (!isNaN(num)) recordObj[fieldDef.name] = num;
        } else if (fieldDef.type === "boolean") {
          recordObj[fieldDef.name] = rawVal.toLowerCase() === "true" || rawVal === "1";
        } else if (fieldDef.type === "array" || fieldDef.type === "object") {
          try {
            recordObj[fieldDef.name] = JSON.parse(rawVal);
          } catch {
            recordObj[fieldDef.name] = rawVal;
          }
        } else {
          recordObj[fieldDef.name] = rawVal;
        }
      }
    });

    if (!recordObj.createdAt) {
      recordObj.createdAt = new Date().toISOString();
    }

    parsedRecords.push(recordObj);
  });

  return parsedRecords;
}

/**
 * Simple robust CSV parser helper
 */
function parseCsvText(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let entry = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(entry);
        entry = "";
      } else {
        entry += char;
      }
    }
    row.push(entry);
    result.push(row);
  }

  return result;
}

/**
 * Fetches records from a worksheet in Google Sheets and converts them to Firestore documents based on blueprint schema.
 */
export async function fetchCollectionFromSheet(
  accessToken: string,
  spreadsheetId: string,
  collectionKey: string,
  sheetName: string
): Promise<any[]> {
  const fieldsDef = getBlueprintFieldsForCollection(collectionKey);
  
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'!A1:ZZ100000`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!getRes.ok) {
    const errText = await getRes.text();
    throw new Error(`Failed to read sheet '${sheetName}': ${errText}`);
  }

  const data = await getRes.json();
  const rows: string[][] = data.values || [];

  if (rows.length <= 1) {
    return []; // Empty or header-only sheet
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  // Map header indices
  const headerMap: { [fieldName: string]: number } = {};
  headerRow.forEach((colName, idx) => {
    headerMap[colName.trim()] = idx;
  });

  const parsedRecords: any[] = [];

  dataRows.forEach((row, rowIdx) => {
    // Generate id if not present
    let idVal = row[headerMap["id"]] ? row[headerMap["id"]].trim() : "";
    if (!idVal) {
      idVal = `${collectionKey.replace("_", "")}-${Date.now()}-${rowIdx}`;
    }

    const recordObj: any = { id: idVal };

    fieldsDef.forEach((fieldDef) => {
      const colIdx = headerMap[fieldDef.name];
      if (colIdx !== undefined && row[colIdx] !== undefined) {
        const rawVal = row[colIdx].trim();
        if (rawVal === "") return;

        if (fieldDef.type === "number") {
          const num = Number(rawVal);
          if (!isNaN(num)) recordObj[fieldDef.name] = num;
        } else if (fieldDef.type === "boolean") {
          recordObj[fieldDef.name] = rawVal.toLowerCase() === "true" || rawVal === "1";
        } else if (fieldDef.type === "array" || fieldDef.type === "object") {
          try {
            recordObj[fieldDef.name] = JSON.parse(rawVal);
          } catch {
            recordObj[fieldDef.name] = rawVal;
          }
        } else {
          recordObj[fieldDef.name] = rawVal;
        }
      }
    });

    if (!recordObj.createdAt) {
      recordObj.createdAt = new Date().toISOString();
    }

    parsedRecords.push(recordObj);
  });

  return parsedRecords;
}

/**
 * Sends a single real-time action (ADD, EDIT, DELETE) to the deployed Google Apps Script Web App URL for ANY record.
 * Runs in the background without blocking Firestore or user UI.
 */
export async function syncRecordToAppsScript(
  appsScriptUrl: string,
  action: "ADD" | "EDIT" | "DELETE",
  collectionKey: string,
  record: any,
  sheetName: string
): Promise<{ status: "success" | "warning" | "skipped"; message?: string }> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    return { status: "skipped", message: "No Apps Script URL configured" };
  }

  const cleanUrl = appsScriptUrl.trim();
  const payload = {
    action,
    collectionKey,
    sheetName: sheetName || "Sheet1",
    id: record.id || record.idVal || "",
    record: record
  };

  try {
    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Apps Script Sync] Server responded with status ${response.status}:`, errText);
      return { status: "warning", message: `HTTP ${response.status}` };
    }

    const resData = await response.json().catch(() => ({ status: "success" }));
    if (resData && resData.status === "error") {
      console.warn("[Apps Script Sync Error]", resData.message);
      return { status: "warning", message: resData.message };
    }

    return { status: "success", message: resData.message || "Synced successfully to Google Sheet" };
  } catch (err: any) {
    console.warn("[Background Apps Script Sync Warning]:", err);
    return { status: "warning", message: err?.message || String(err) };
  }
}

/**
 * Full export / bulk sync of all records of a collection to Google Apps Script.
 */
export async function batchSyncRecordsToAppsScript(
  appsScriptUrl: string,
  collectionKey: string,
  records: any[],
  sheetName: string
): Promise<{ status: "success" | "warning" | "skipped"; count: number; message?: string }> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    return { status: "skipped", count: 0, message: "No Apps Script URL configured" };
  }

  const fieldsDef = getBlueprintFieldsForCollection(collectionKey);
  const payload = {
    action: "export",
    collectionKey,
    sheetName: sheetName || "Sheet1",
    fields: fieldsDef,
    records
  };

  try {
    const response = await fetch(appsScriptUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return { status: "warning", count: 0, message: `HTTP ${response.status}: ${errText}` };
    }

    const resData = await response.json().catch(() => ({ status: "success" }));
    return { status: "success", count: records.length, message: resData.message || "All records exported to Google Sheet" };
  } catch (err: any) {
    return { status: "warning", count: 0, message: err?.message || String(err) };
  }
}

/**
 * Sends a single real-time action (ADD, EDIT, DELETE) to the deployed Google Apps Script Web App URL for PI records.
 */
export async function syncPiRecordToAppsScript(
  appsScriptUrl: string,
  action: "ADD" | "EDIT" | "DELETE",
  record: any,
  sheetName: string = "Import PIs"
): Promise<{ status: "success" | "warning" | "skipped"; message?: string }> {
  return syncRecordToAppsScript(appsScriptUrl, action, "import_pis", record, sheetName);
}

/**
 * Full export / bulk sync of all PI records to Google Apps Script.
 */
export async function batchSyncPiRecordsToAppsScript(
  appsScriptUrl: string,
  records: any[],
  sheetName: string = "Import PIs"
): Promise<{ status: "success" | "warning" | "skipped"; count: number; message?: string }> {
  return batchSyncRecordsToAppsScript(appsScriptUrl, "import_pis", records, sheetName);
}

/**
 * Google Apps Script template code for an individual sub-tab's dedicated spreadsheet.
 * Supports:
 *  - READ / FETCH: doGet and doPost return all sheet rows as JSON
 *  - ADD: appends a row
 *  - EDIT: updates row matching record id
 *  - DELETE: deletes row matching record id
 *  - EXPORT: bulk exports/overwrites all rows
 */
export function getUniversalAppsScriptTemplateCode(defaultSheetName: string = "Data"): string {
  return `/**
 * Google Apps Script for [${defaultSheetName}]
 * Dedicated Spreadsheet & Apps Script Deployment
 * 
 * Capabilities:
 *  - READ / FETCH: Returns all data rows from this Google Sheet as JSON
 *  - ADD: Appends a new record
 *  - EDIT: Updates the record matching the record ID
 *  - DELETE: Deletes the record matching the record ID
 *  - EXPORT: Bulk writes all records
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Spreadsheet for this sub-tab.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any existing code, paste this script into Code.gs, and click Save (Ctrl+S).
 * 4. Click Deploy > New deployment.
 * 5. Select type: "Web app".
 * 6. Description: "${defaultSheetName} Integration".
 * 7. Execute as: "Me" (your Google account).
 * 8. Who has access: "Anyone".
 * 9. Click Deploy, authorize access, and copy the Web App URL.
 * 10. Paste the URL into the "${defaultSheetName}" sub-tab configuration.
 */

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var sheetName = params.sheetName || params.sheet || "${defaultSheetName}";
    return fetchSheetRecords(sheetName);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No post data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || "").toUpperCase();
    var sheetName = data.sheetName || "${defaultSheetName}";

    // 1. READ / FETCH ALL ROWS
    if (action === "FETCH" || action === "GET" || action === "READ" || action === "LOAD" || action === "FETCH_ALL") {
      return fetchSheetRecords(sheetName);
    }

    var sheet = getTargetSheet(sheetName);

    // 2. BULK EXPORT
    if (action === "EXPORT") {
      var records = data.records || [];
      sheet.clearContents();
      
      if (records.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", count: 0, message: "Sheet cleared" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var headers = [];
      if (data.fields && data.fields.length > 0) {
        headers = data.fields.map(function(f) { return typeof f === 'object' ? f.name : String(f); });
      }
      var keyMap = {};
      records.forEach(function(r) {
        Object.keys(r).forEach(function(k) { keyMap[k] = true; });
      });
      Object.keys(keyMap).forEach(function(k) {
        if (headers.indexOf(k) === -1) {
          headers.push(k);
        }
      });

      if (headers.indexOf("id") === -1) headers.unshift("id");

      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");

      records.forEach(function(rec) {
        var row = headers.map(function(h) {
          var val = rec[h];
          if (val === undefined || val === null) return "";
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        });
        sheet.appendRow(row);
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: records.length,
        message: "Exported " + records.length + " rows"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var record = data.record || {};
    var id = String(data.id || record.id || "").trim();
    var headers = getOrSetHeaders(sheet, record);

    var rowValues = headers.map(function(h) {
      var val = record[h];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return val;
    });

    // 3. ADD / SAVE
    if (action === "ADD" || action === "SAVE" || action === "CREATE") {
      sheet.appendRow(rowValues);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "ADD", id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. EDIT / UPDATE
    if (action === "EDIT" || action === "UPDATE" || action === "MODIFY") {
      var dataRange = sheet.getDataRange().getValues();
      var idColIdx = headers.indexOf("id");
      if (idColIdx === -1) idColIdx = 0;

      var targetRow = -1;
      for (var i = 1; i < dataRange.length; i++) {
        if (String(dataRange[i][idColIdx]).trim() === id) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow > 0) {
        sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "EDIT", id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. DELETE / REMOVE
    if (action === "DELETE" || action === "REMOVE") {
      var dataRange = sheet.getDataRange().getValues();
      var idColIdx = headers.indexOf("id");
      if (idColIdx === -1) idColIdx = 0;

      var deleted = false;
      for (var i = 1; i < dataRange.length; i++) {
        if (String(dataRange[i][idColIdx]).trim() === id) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "DELETE", id: id, deleted: deleted }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action: " + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getTargetSheet(requestedName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = requestedName || "${defaultSheetName}";
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    // If exact name not found, use first or active sheet
    sheet = ss.getActiveSheet() || ss.getSheets()[0];
  }
  return sheet;
}

function getOrSetHeaders(sheet, record) {
  var headers = [];
  if (sheet.getLastRow() > 0) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] || [];
  }
  var recordKeys = Object.keys(record);

  if (headers.length === 0) {
    headers = recordKeys.slice();
    if (headers.indexOf("id") === -1) headers.unshift("id");
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  } else {
    var missingKeys = [];
    recordKeys.forEach(function(k) {
      if (headers.indexOf(k) === -1) {
        missingKeys.push(k);
      }
    });
    if (missingKeys.length > 0) {
      missingKeys.forEach(function(mk) {
        headers.push(mk);
        sheet.getRange(1, headers.length).setValue(mk).setFontWeight("bold").setBackground("#e2e8f0");
      });
    }
  }
  return headers;
}

function fetchSheetRecords(sheetName) {
  var sheet = getTargetSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: 0,
      records: [],
      sheetName: sheet.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var records = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var hasValue = false;
    for (var k = 0; k < row.length; k++) {
      if (row[k] !== "" && row[k] !== null && row[k] !== undefined) {
        hasValue = true;
        break;
      }
    }
    if (!hasValue) continue;

    var recordObj = {};
    for (var j = 0; j < headers.length; j++) {
      var colKey = String(headers[j] || "").trim();
      if (!colKey) continue;
      var cellVal = row[j];
      if (cellVal instanceof Date) {
        recordObj[colKey] = Utilities.formatDate(cellVal, Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
      } else {
        recordObj[colKey] = cellVal;
      }
    }
    records.push(recordObj);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    count: records.length,
    records: records,
    sheetName: sheet.getName()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}

export function getPiAppsScriptTemplateCode(): string {
  return getUniversalAppsScriptTemplateCode("Import PIs");
}
