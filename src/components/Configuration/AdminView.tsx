/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import blueprintJson from "../../../firebase-blueprint.json";
import {
  MODULE_CONFIGS,
  SyncModuleConfig,
  SyncCollectionConfig,
  createGoogleSpreadsheet,
  ensureWorksheetsExist,
  exportCollectionToSheet,
  fetchCollectionFromSheet,
  exportViaAppsScript,
  fetchViaAppsScript,
  fetchPublicGoogleSheetCsv,
  getBlueprintFieldsForCollection
} from "../../lib/googleSheetsService";
import {
  bulkSaveGenericCollectionRecords,
  getGoogleSheetsSettings,
  saveGoogleSheetsSettings
} from "../../lib/firebaseService";
import {
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  RefreshCw,
  Layers,
  Sparkles,
  Info,
  Save,
  Code2,
  Copy,
  Check,
  Link as LinkIcon,
  HelpCircle
} from "lucide-react";

interface AdminViewProps {
  activeUserId: string;
  // All Firestore collections state
  allCollectionsData: { [collectionKey: string]: any[] };
  // Function to save log
  saveLog?: (logData: any) => Promise<void>;
  // Callback when generic bulk updates are completed so UI re-syncs
  onSyncComplete?: () => void;
}

const APPS_SCRIPT_TEMPLATE_CODE = `/**
 * AOL Management Portal - Secure Google Apps Script Integration
 * 1. Open your Google Sheet -> Extensions -> Apps Script
 * 2. Paste this code and save (Ctrl+S)
 * 3. Click 'Deploy' -> 'New deployment' -> Select type 'Web app'
 * 4. Execute as: 'Me' | Who has access: 'Anyone'
 * 5. Copy the Web App URL and paste it into Admin Settings in your App.
 */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var spreadsheetId = contents.spreadsheetId;
    var sheetName = contents.sheetName;
    var records = contents.records || [];
    var fields = contents.fields || [];

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    if (action === 'export') {
      sheet.clearContents();
      if (fields.length > 0) {
        var header = fields.map(function(f){ return typeof f === 'object' ? f.name : f; });
        sheet.appendRow(header);
        
        if (records.length > 0) {
          var rows = records.map(function(r) {
            return fields.map(function(f) {
              var key = typeof f === 'object' ? f.name : f;
              var val = r[key];
              if (val === undefined || val === null) return "";
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            });
          });
          sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: records.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'fetch') {
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", records: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var headers = data[0];
      var rows = data.slice(1);
      var fetchedRecords = rows.map(function(row, idx) {
        var obj = {};
        headers.forEach(function(h, colIdx) {
          var val = row[colIdx];
          if (val !== "" && val !== undefined) {
            obj[String(h).trim()] = val;
          }
        });
        if (!obj.id) {
          obj.id = sheetName.replace(/\\s+/g, '').toLowerCase() + '-' + Date.now() + '-' + idx;
        }
        return obj;
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", records: fetchedRecords }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "Company Management Portal Apps Script Operational" }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export default function AdminView({
  activeUserId,
  allCollectionsData,
  saveLog,
  onSyncComplete
}: AdminViewProps) {
  const [activeModuleId, setActiveModuleId] = useState<string>("import");
  
  // Google Access Token (optional if using Apps Script)
  const [accessToken, setAccessToken] = useState<string>(() => {
    return localStorage.getItem("app_google_sheets_access_token") || "";
  });
  
  // Apps Script Web App URL stored in Firestore and localStorage
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>("");

  // Global Sheet ID fallback
  const [globalSheetId, setGlobalSheetId] = useState<string>("");

  // Spreadsheet IDs for each module stored in Firestore
  const [spreadsheetIds, setSpreadsheetIds] = useState<{ [moduleId: string]: string }>({});

  const [spreadsheetUrls, setSpreadsheetUrls] = useState<{ [moduleId: string]: string }>({});

  // Loading, UI & feedback states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState<boolean>(false);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Load Google Sheet IDs and Apps Script URL directly from Firestore database
  useEffect(() => {
    async function loadFirestoreSettings() {
      try {
        const docSettings = await getGoogleSheetsSettings();
        if (docSettings) {
          if (docSettings.spreadsheetIds) {
            setSpreadsheetIds(docSettings.spreadsheetIds);
            if (docSettings.spreadsheetIds["global"]) {
              setGlobalSheetId(docSettings.spreadsheetIds["global"]);
            }
          }
          if (docSettings.appsScriptUrl) {
            setAppsScriptUrl(docSettings.appsScriptUrl);
          }
        }
      } catch (err) {
        console.warn("Error loading Google Sheets config from Firestore:", err);
      }
    }
    loadFirestoreSettings();
  }, []);

  // Save credentials to localStorage as local backup
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem("app_google_sheets_access_token", accessToken);
    }
  }, [accessToken]);

  const currentModule = MODULE_CONFIGS.find((m) => m.id === activeModuleId) || MODULE_CONFIGS[0];
  const currentSpreadsheetId = spreadsheetIds[activeModuleId] || globalSheetId || "";
  const currentSpreadsheetUrl = spreadsheetUrls[activeModuleId] || (currentSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit` : "");

  const addSyncLog = (msg: string) => {
    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // Save Google Sheet IDs & Apps Script URL directly to Firestore database ('aoldr')
  const handleSaveSettingsToFirestore = async () => {
    setIsSavingToFirestore(true);
    try {
      const updatedIds = { ...spreadsheetIds };
      if (globalSheetId) {
        updatedIds["global"] = globalSheetId;
      }
      await saveGoogleSheetsSettings({
        spreadsheetIds: updatedIds,
        appsScriptUrl: appsScriptUrl.trim()
      });
      setStatusMessage({
        type: "success",
        text: "Google Sheet IDs & Apps Script URL saved to Firestore database successfully! All admins will share this configuration."
      });
      addSyncLog("Saved Google Sheet IDs & Apps Script URL to Firestore collection 'settings/google_sheets'.");
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Failed to save configuration: ${err.message || err}` });
      addSyncLog(`ERROR saving settings to Firestore: ${err.message || err}`);
    } finally {
      setIsSavingToFirestore(false);
    }
  };

  // Create a new Google Spreadsheet for the active module
  const handleCreateSpreadsheet = async () => {
    if (!accessToken) {
      setStatusMessage({
        type: "error",
        text: "Access Token is required to auto-create spreadsheets. You can also create a Google Sheet manually and paste its ID above!"
      });
      return;
    }

    setIsCreatingSheet(true);
    setStatusMessage({ type: "info", text: `Creating Google Spreadsheet for ${currentModule.title}...` });
    addSyncLog(`Initializing Google Spreadsheet creation for ${currentModule.title}...`);

    try {
      const sheetTitle = `AOL Management Portal - ${currentModule.title} (${new Date().toLocaleDateString()})`;
      const result = await createGoogleSpreadsheet(accessToken, sheetTitle, currentModule.collections);

      const newIds = { ...spreadsheetIds, [activeModuleId]: result.spreadsheetId };
      setSpreadsheetIds(newIds);
      setSpreadsheetUrls((prev) => ({ ...prev, [activeModuleId]: result.spreadsheetUrl }));

      // Auto-save to Firestore
      await saveGoogleSheetsSettings({
        spreadsheetIds: newIds,
        appsScriptUrl: appsScriptUrl.trim()
      });

      setStatusMessage({
        type: "success",
        text: `Created new spreadsheet: "${sheetTitle}" and saved ID to Firestore successfully!`
      });
      addSyncLog(`Spreadsheet created. ID: ${result.spreadsheetId}`);
    } catch (err: any) {
      console.error("Spreadsheet creation error:", err);
      setStatusMessage({ type: "error", text: `Failed to create spreadsheet: ${err.message || err}` });
      addSyncLog(`ERROR: ${err.message || err}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Save Firestore data to Google Sheets (Export)
  const handleExportModuleToSheets = async () => {
    if (!currentSpreadsheetId) {
      setStatusMessage({
        type: "error",
        text: "Please enter or select a Google Spreadsheet ID first."
      });
      return;
    }

    setIsExporting(true);
    setStatusMessage({ type: "info", text: `Saving Firestore records to Google Sheet for ${currentModule.title}...` });
    addSyncLog(`=== Starting Export: Firestore -> Google Sheets [${currentModule.title}] ===`);

    try {
      let totalRecordsExported = 0;

      // Method A: Use Apps Script Web App URL if available
      if (appsScriptUrl.trim()) {
        addSyncLog(`Using Google Apps Script Web App Endpoint for export...`);
        for (const col of currentModule.collections) {
          const records = allCollectionsData[col.key] || [];
          addSyncLog(`Exporting '${col.key}' (${records.length} records) to sheet '${col.sheetName}' via Apps Script...`);

          const result = await exportViaAppsScript(
            appsScriptUrl.trim(),
            currentSpreadsheetId,
            col.key,
            col.sheetName,
            records
          );

          totalRecordsExported += result.count;
          addSyncLog(`Saved ${result.count} records to sheet '${col.sheetName}'.`);
        }
      } 
      // Method B: Use Direct Google Sheets API if OAuth access token is provided
      else if (accessToken) {
        addSyncLog(`Using Direct Google Sheets API v4 with OAuth Access Token...`);
        await ensureWorksheetsExist(accessToken, currentSpreadsheetId, currentModule.collections);

        for (const col of currentModule.collections) {
          const records = allCollectionsData[col.key] || [];
          addSyncLog(`Exporting collection '${col.key}' (${records.length} records) to sheet '${col.sheetName}'...`);

          const result = await exportCollectionToSheet(
            accessToken,
            currentSpreadsheetId,
            col.key,
            col.sheetName,
            records
          );

          totalRecordsExported += result.count;
          addSyncLog(`Saved ${result.count} records to worksheet '${col.sheetName}'.`);
        }
      } 
      else {
        throw new Error(
          "Export requires an Apps Script Web App URL or Google OAuth Access Token. Deploy the Apps Script (code provided below) and paste its Web App URL above for secure, 100% reliable exports!"
        );
      }

      setStatusMessage({
        type: "success",
        text: `Successfully exported ${totalRecordsExported} records across ${currentModule.collections.length} sub-tabs to Google Sheets!`
      });
      addSyncLog(`=== Export Completed Successfully. Total Records: ${totalRecordsExported} ===`);

      if (saveLog) {
        await saveLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: activeUserId,
          userName: "Admin / Executive",
          actionType: "Update Lead",
          targetType: "System",
          targetId: currentSpreadsheetId,
          targetName: currentModule.title,
          details: `EXPORT TO GOOGLE SHEETS: ${totalRecordsExported} records exported across ${currentModule.collections.length} sheets in ${currentModule.title}`
        });
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setStatusMessage({ type: "error", text: `Export failed: ${err.message || err}` });
      addSyncLog(`EXPORT ERROR: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch Google Sheets data into Firestore (Import)
  const handleFetchSheetsToFirestore = async () => {
    if (!currentSpreadsheetId) {
      setStatusMessage({ type: "error", text: "Please enter or select a Google Spreadsheet ID first." });
      return;
    }

    setIsImporting(true);
    setStatusMessage({ type: "info", text: `Fetching records from Google Sheet into Firestore for ${currentModule.title}...` });
    addSyncLog(`=== Starting Import: Google Sheets -> Firestore [${currentModule.title}] ===`);

    try {
      let totalRecordsImported = 0;

      for (const col of currentModule.collections) {
        addSyncLog(`Fetching worksheet '${col.sheetName}' for collection '${col.key}'...`);
        let parsedRecords: any[] = [];

        // Method A: Use Apps Script Web App if URL is provided
        if (appsScriptUrl.trim()) {
          addSyncLog(`Fetching via Apps Script Web App Endpoint...`);
          parsedRecords = await fetchViaAppsScript(
            appsScriptUrl.trim(),
            currentSpreadsheetId,
            col.key,
            col.sheetName
          );
        }
        // Method B: Use Direct Google Sheets API if Access Token is provided
        else if (accessToken) {
          addSyncLog(`Fetching via Direct Google Sheets API...`);
          parsedRecords = await fetchCollectionFromSheet(
            accessToken,
            currentSpreadsheetId,
            col.key,
            col.sheetName
          );
        }
        // Method C: Fallback to Public Google Sheet CSV Export
        else {
          addSyncLog(`Fetching via Public Google Sheet CSV Endpoint...`);
          parsedRecords = await fetchPublicGoogleSheetCsv(
            currentSpreadsheetId,
            col.sheetName,
            col.key
          );
        }

        if (parsedRecords.length > 0) {
          const savedCount = await bulkSaveGenericCollectionRecords(col.key, parsedRecords);
          totalRecordsImported += savedCount;
          addSyncLog(`Updated/Saved ${savedCount} records in Firestore collection '${col.key}'.`);
        } else {
          addSyncLog(`Worksheet '${col.sheetName}' was empty or returned no data rows.`);
        }
      }

      setStatusMessage({
        type: "success",
        text: `Successfully imported & updated ${totalRecordsImported} records in Firestore database from Google Sheets!`
      });
      addSyncLog(`=== Import Completed Successfully. Total Records Updated: ${totalRecordsImported} ===`);

      if (onSyncComplete) {
        onSyncComplete();
      }

      if (saveLog) {
        await saveLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: activeUserId,
          userName: "Admin / Executive",
          actionType: "Update Lead",
          targetType: "System",
          targetId: currentSpreadsheetId,
          targetName: currentModule.title,
          details: `IMPORT FROM GOOGLE SHEETS: ${totalRecordsImported} records fetched & saved to Firestore across ${currentModule.collections.length} sub-tabs in ${currentModule.title}`
        });
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setStatusMessage({ type: "error", text: `Import failed: ${err.message || err}` });
      addSyncLog(`IMPORT ERROR: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Single collection export
  const handleExportSingleCollection = async (col: SyncCollectionConfig) => {
    if (!currentSpreadsheetId) {
      setStatusMessage({ type: "error", text: "Spreadsheet ID is required." });
      return;
    }

    setIsExporting(true);
    setStatusMessage({ type: "info", text: `Exporting '${col.label}' to sheet '${col.sheetName}'...` });
    try {
      const records = allCollectionsData[col.key] || [];
      let resCount = 0;

      if (appsScriptUrl.trim()) {
        const res = await exportViaAppsScript(appsScriptUrl.trim(), currentSpreadsheetId, col.key, col.sheetName, records);
        resCount = res.count;
      } else if (accessToken) {
        await ensureWorksheetsExist(accessToken, currentSpreadsheetId, [col]);
        const res = await exportCollectionToSheet(accessToken, currentSpreadsheetId, col.key, col.sheetName, records);
        resCount = res.count;
      } else {
        throw new Error("Export requires Apps Script URL or Access Token. See guide below!");
      }

      setStatusMessage({ type: "success", text: `Exported ${resCount} records of '${col.label}' to sheet '${col.sheetName}'.` });
      addSyncLog(`Single export complete: ${col.key} -> ${col.sheetName} (${resCount} records).`);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Export failed for '${col.label}': ${err.message || err}` });
    } finally {
      setIsExporting(false);
    }
  };

  // Single collection import
  const handleFetchSingleCollection = async (col: SyncCollectionConfig) => {
    if (!currentSpreadsheetId) {
      setStatusMessage({ type: "error", text: "Spreadsheet ID is required." });
      return;
    }

    setIsImporting(true);
    setStatusMessage({ type: "info", text: `Fetching '${col.label}' from sheet '${col.sheetName}'...` });
    try {
      let records: any[] = [];
      if (appsScriptUrl.trim()) {
        records = await fetchViaAppsScript(appsScriptUrl.trim(), currentSpreadsheetId, col.key, col.sheetName);
      } else if (accessToken) {
        records = await fetchCollectionFromSheet(accessToken, currentSpreadsheetId, col.key, col.sheetName);
      } else {
        records = await fetchPublicGoogleSheetCsv(currentSpreadsheetId, col.sheetName, col.key);
      }

      if (records.length > 0) {
        const saved = await bulkSaveGenericCollectionRecords(col.key, records);
        setStatusMessage({ type: "success", text: `Fetched & saved ${saved} records for '${col.label}' into Firestore.` });
        addSyncLog(`Single fetch complete: ${col.sheetName} -> ${col.key} (${saved} records).`);
        if (onSyncComplete) onSyncComplete();
      } else {
        setStatusMessage({ type: "info", text: `No records found in sheet '${col.sheetName}'.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Fetch failed for '${col.label}': ${err.message || err}` });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE_CODE);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2500);
  };

  const allBlueprintCollections = Object.keys((blueprintJson as any).collections || {});

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2.5 rounded-lg shadow-xs shrink-0">
              <ShieldCheck size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Executive Admin & Settings
                </h2>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Google Sheets Firestore Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage Google Sheet IDs stored directly in Firestore, export database collections to Google Sheets, and fetch updates securely back into Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto text-xs font-mono">
            <button
              onClick={handleSaveSettingsToFirestore}
              disabled={isSavingToFirestore}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSavingToFirestore ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Save Configuration to Firestore
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {statusMessage && (
          <div
            className={`mt-3 p-3 rounded-md text-xs flex items-start gap-2.5 border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
                : "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800"
            }`}
          >
            {statusMessage.type === "success" && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
            {statusMessage.type === "error" && <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />}
            {statusMessage.type === "info" && <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />}
            <span className="flex-1 font-medium">{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Settings Form: Sheet IDs & Apps Script Endpoint */}
        <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <Database size={14} className="text-emerald-600" />
              Firestore Shared Google Sheets Configuration
            </span>
            <button
              onClick={() => setShowScriptModal(!showScriptModal)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-mono flex items-center gap-1 cursor-pointer bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
            >
              <Code2 size={13} />
              {showScriptModal ? "Hide Apps Script Setup" : "⚡ Apps Script Code Setup (Recommended)"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Google Apps Script Web App URL:</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                  {appsScriptUrl ? "✓ Connected" : "Optional / High Security"}
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Provides secure, reliable export and fetch without Google consent screen errors.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300">
                Global Google Sheet ID (Fallback):
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={globalSheetId}
                  onChange={(e) => setGlobalSheetId(e.target.value.trim())}
                  placeholder="Paste main Google Sheet ID..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Stored centrally in Firestore collection <code className="font-mono">settings/google_sheets</code>.
              </p>
            </div>
          </div>

          {/* Expandable Apps Script Code & Guide */}
          {showScriptModal && (
            <div className="mt-3 bg-slate-900 text-slate-100 border border-slate-700 rounded-md p-3.5 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Google Apps Script Deployment Instructions
                </span>
                <button
                  onClick={handleCopyCode}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {scriptCopied ? <Check size={13} /> : <Copy size={13} />}
                  {scriptCopied ? "Copied!" : "Copy Code"}
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 opacity-90">
                <li>Open your Google Sheet &rarr; Click <b>Extensions</b> &rarr; Select <b>Apps Script</b>.</li>
                <li>Delete existing placeholder code and paste the code below into <code className="text-amber-300">Code.gs</code>.</li>
                <li>Click <b>Deploy</b> (top right) &rarr; <b>New deployment</b> &rarr; Select type: <b>Web app</b>.</li>
                <li>Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b> &rarr; Click <b>Deploy</b>.</li>
                <li>Copy the Web App URL and paste it into the <i>Apps Script Web App URL</i> input field above!</li>
              </ol>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 max-h-48 overflow-y-auto text-[10px] text-emerald-400 scrollbar-thin">
                <pre>{APPS_SCRIPT_TEMPLATE_CODE}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Module Selection Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        {MODULE_CONFIGS.map((mod) => {
          const active = activeModuleId === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModuleId(mod.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold font-mono tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-md"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet size={14} className={active ? "text-emerald-600" : "text-slate-400"} />
              {mod.title}
              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                {mod.collections.length} Sheets
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setActiveModuleId("blueprint")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold font-mono tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeModuleId === "blueprint"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-md"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Layers size={14} className={activeModuleId === "blueprint" ? "text-emerald-600" : "text-slate-400"} />
          Blueprint Schema Inspector
        </button>
      </div>

      {activeModuleId !== "blueprint" ? (
        <div className="space-y-4">
          {/* Active Module Spreadsheet Configuration Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Google Spreadsheet Configuration for {currentModule.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter an existing Google Sheet ID for this module or use the global sheet ID. IDs are saved in Firestore database <code className="font-mono text-emerald-600 font-bold">aoldr</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateSpreadsheet}
                  disabled={isCreatingSheet || !accessToken}
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                  title={!accessToken ? "Requires Google OAuth Access Token" : "Create new Google Sheet"}
                >
                  {isCreatingSheet ? (
                    <Loader2 size={13} className="animate-spin text-emerald-400" />
                  ) : (
                    <FileSpreadsheet size={13} className="text-emerald-400" />
                  )}
                  Create New Google Spreadsheet
                </button>

                {currentSpreadsheetUrl && (
                  <a
                    href={currentSpreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition"
                  >
                    <ExternalLink size={13} />
                    Open in Google Sheets
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <span className="text-xs font-mono font-bold text-slate-500 w-36 shrink-0">
                Module Sheet ID:
              </span>
              <input
                type="text"
                value={spreadsheetIds[activeModuleId] || ""}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setSpreadsheetIds((prev) => ({ ...prev, [activeModuleId]: val }));
                }}
                placeholder={globalSheetId ? `Using global ID: ${globalSheetId}` : "Paste module Google Sheet ID (e.g. 1BxiMVs0XRnt3...)"}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveSettingsToFirestore}
                disabled={isSavingToFirestore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Save this sheet ID to Firestore database"
              >
                <Save size={12} />
                Save ID
              </button>
            </div>

            {/* Sync Controls: Save (Export) and Fetch (Import) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                <span>Sub-Tabs Included: <b>{currentModule.collections.length}</b></span>
                <span>•</span>
                <span>
                  Total Firestore Records:{" "}
                  <b>
                    {currentModule.collections.reduce(
                      (sum, c) => sum + (allCollectionsData[c.key]?.length || 0),
                      0
                    )}
                  </b>
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleExportModuleToSheets}
                  disabled={isExporting || isImporting || !currentSpreadsheetId}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-md flex items-center justify-center gap-2 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isExporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Export Data to Google Sheets
                </button>

                <button
                  onClick={handleFetchSheetsToFirestore}
                  disabled={isExporting || isImporting || !currentSpreadsheetId}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-md flex items-center justify-center gap-2 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Fetch Data from Google Sheets
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Tab Collections Grid & Granular Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sub-Tab Collections in {currentModule.title} ({currentModule.collections.length} Tables)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentModule.collections.map((col) => {
                const count = allCollectionsData[col.key]?.length || 0;
                const fieldsDef = getBlueprintFieldsForCollection(col.key);

                return (
                  <div
                    key={col.key}
                    className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-md p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {col.label}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          {count} Records
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                        <p>Firestore Collection: <code className="text-slate-800 dark:text-slate-200">{col.key}</code></p>
                        <p>Worksheet Name: <code className="text-emerald-600 font-bold">{col.sheetName}</code></p>
                        <p>Blueprint Fields: <b>{fieldsDef.length} Columns</b></p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleExportSingleCollection(col)}
                        disabled={isExporting || !currentSpreadsheetId}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={11} />
                        Export Sheet
                      </button>

                      <button
                        onClick={() => handleFetchSingleCollection(col)}
                        disabled={isImporting || !currentSpreadsheetId}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={11} />
                        Fetch Sheet
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sync Operations Audit Console Log */}
          {syncLogs.length > 0 && (
            <div className="bg-slate-950 text-emerald-400 border border-slate-800 rounded-lg p-3 font-mono text-[11px] space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold flex items-center gap-1.5 text-slate-300">
                  <RefreshCw size={12} className="text-emerald-400" />
                  Real-time Google Sheets Operation Terminal
                </span>
                <button
                  onClick={() => setSyncLogs([])}
                  className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin pt-1">
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="leading-tight">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Blueprint Schema Inspector Tab */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers size={16} className="text-emerald-600" />
                Firebase Blueprint Schema Matrix (<code className="font-mono text-emerald-600">firebase-blueprint.json</code>)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All 20+ collections and their defined fields maintained strictly in sync between Firestore database and Google Sheets.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allBlueprintCollections.map((colKey) => {
              const colDef = (blueprintJson as any).collections[colKey];
              const fieldsObj = colDef?.fields || {};
              const fieldsCount = Object.keys(fieldsObj).length;
              const liveCount = allCollectionsData[colKey]?.length || 0;

              return (
                <div
                  key={colKey}
                  className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-md p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      {colKey}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded">
                        {fieldsCount} Fields
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                        {liveCount} Records
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {colDef?.description || "No description provided."}
                  </p>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-[10px] font-mono max-h-32 overflow-y-auto scrollbar-thin">
                    <span className="text-slate-400 block mb-1 font-bold">Field Schema:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-700 dark:text-slate-300">
                      {Object.keys(fieldsObj).map((fName) => (
                        <div key={fName} className="truncate">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{fName}</span>:{" "}
                          <span className="text-slate-500">{fieldsObj[fName]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
