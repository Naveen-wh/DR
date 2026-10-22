/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AppsScriptConfigDoc,
  saveAppsScriptConfig,
  subscribeAppsScriptConfig,
  bulkSaveGenericCollectionRecords
} from "../../lib/firebaseService";
import {
  syncRecordToAppsScript,
  batchSyncRecordsToAppsScript,
  getUniversalAppsScriptTemplateCode,
  fetchViaAppsScript
} from "../../lib/googleSheetsService";
import { clearSheetUrlCache } from "../../lib/operationalSheetsService";
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Sliders,
  Check,
  X,
  Code2,
  Download,
  Upload,
  Database,
  Eye,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { User } from "../../types";

export interface SyncStatus {
  state: "idle" | "syncing" | "success" | "error";
  message: string;
  timestamp?: string;
}

export function useAppsScriptSync(
  configKey: string,
  defaultSheetName: string,
  collectionKey: string,
  fallbackConfigKey?: string,
  onDataFetchedCallback?: (records: any[]) => void
) {
  const [config, setConfig] = useState<AppsScriptConfigDoc>({
    sheetName: defaultSheetName,
    autoSync: true,
    autoSaveFetchedToDb: false,
    autoReadFromSheet: true
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: "idle",
    message: ""
  });
  const [isReadingSheet, setIsReadingSheet] = useState(false);
  const hasAutoReadRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const unsub = subscribeAppsScriptConfig(configKey, defaultSheetName, async (newConfig) => {
      if (!isMounted) return;

      let effectiveUrl = (newConfig.appsScriptUrl || "").trim();

      // Check fallback doc or global settings if no URL specified for this sub-tab
      if (!effectiveUrl && fallbackConfigKey) {
        try {
          const fallbackConfig = await import("../../lib/firebaseService").then((m) =>
            m.getAppsScriptConfig(fallbackConfigKey, defaultSheetName)
          );
          if (fallbackConfig?.appsScriptUrl && isMounted) {
            effectiveUrl = fallbackConfig.appsScriptUrl.trim();
          }
        } catch {
          // ignore fallback error
        }
      }

      if (!effectiveUrl) {
        try {
          const globalConfig = await import("../../lib/firebaseService").then((m) =>
            m.getGoogleSheetsSettings()
          );
          if (globalConfig?.appsScriptUrl && isMounted) {
            effectiveUrl = globalConfig.appsScriptUrl.trim();
          }
        } catch {
          // ignore global config error
        }
      }

      setConfig({
        ...newConfig,
        appsScriptUrl: effectiveUrl,
        sheetName: newConfig.sheetName || defaultSheetName,
        autoReadFromSheet: newConfig.autoReadFromSheet ?? true,
        autoSaveFetchedToDb: newConfig.autoSaveFetchedToDb ?? false
      });
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [configKey, defaultSheetName, fallbackConfigKey]);

  // Read data from this sub-tab's Google Sheet
  const readDataFromSheet = useCallback(
    async (targetUrl?: string, targetSheet?: string) => {
      const url = (targetUrl || config.appsScriptUrl || "").trim();
      const sheet = (targetSheet || config.sheetName || defaultSheetName).trim();
      if (!url) {
        return { status: "error" as const, message: "No Apps Script URL configured for this sub-tab." };
      }

      setIsReadingSheet(true);
      setSyncStatus({ state: "syncing", message: `Reading data from Google Sheet "${sheet}"...` });

      try {
        const records = await fetchViaAppsScript(url, sheet, collectionKey);
        setIsReadingSheet(false);

        if (records.length === 0) {
          setSyncStatus({
            state: "idle",
            message: `Sheet "${sheet}" has no data rows.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
          return { status: "success" as const, count: 0, records: [] };
        }

        if (onDataFetchedCallback) {
          onDataFetchedCallback(records);
        }

        setSyncStatus({
          state: "success",
          message: `Read ${records.length} records from Google Sheet!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });

        return { status: "success" as const, count: records.length, records };
      } catch (err: any) {
        setIsReadingSheet(false);
        setSyncStatus({
          state: "error",
          message: `Read failed: ${err?.message || "Check Apps Script URL"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
        return { status: "error" as const, message: err?.message || String(err) };
      }
    },
    [config.appsScriptUrl, config.sheetName, collectionKey, defaultSheetName, onDataFetchedCallback]
  );

  // Auto-read on initial load when URL is available
  useEffect(() => {
    if (config.appsScriptUrl && !hasAutoReadRef.current) {
      hasAutoReadRef.current = true;
      readDataFromSheet();
    }
  }, [config.appsScriptUrl, readDataFromSheet]);

  // Write, Edit, Delete operations
  const triggerSync = useCallback(
    (action: "ADD" | "EDIT" | "DELETE", record: any) => {
      if (!config.appsScriptUrl || !config.appsScriptUrl.trim()) return;

      setSyncStatus({ state: "syncing", message: `Syncing ${action} to Google Sheet...` });

      syncRecordToAppsScript(
        config.appsScriptUrl,
        action,
        collectionKey,
        record,
        config.sheetName || defaultSheetName
      )
        .then((res) => {
          if (res.status === "success") {
            setSyncStatus({
              state: "success",
              message: `Google Sheet ${action} synced!`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            });
          } else if (res.status === "warning") {
            setSyncStatus({
              state: "error",
              message: `Sync note: ${res.message || "Check Apps Script endpoint"}`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            });
          }
        })
        .catch((err: any) => {
          setSyncStatus({
            state: "error",
            message: `Sync failed: ${err?.message || "Network error"}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          });
        });
    },
    [config.appsScriptUrl, config.sheetName, collectionKey, defaultSheetName]
  );

  return { config, setConfig, syncStatus, setSyncStatus, triggerSync, readDataFromSheet, isReadingSheet };
}

export interface AppsScriptSyncBannerProps {
  configKey: string;
  defaultSheetName: string;
  collectionKey: string;
  records: any[];
  activeUser?: User | { id: string; name?: string; email?: string; role?: any };
  moduleTitle?: string;
  config: AppsScriptConfigDoc;
  syncStatus: SyncStatus;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStatus>>;
  onDataFetched?: (records: any[]) => void;
  onRefreshTable?: () => void;
}

export default function AppsScriptSyncBanner({
  configKey,
  defaultSheetName,
  collectionKey,
  records,
  activeUser,
  moduleTitle,
  config,
  syncStatus,
  setSyncStatus,
  onDataFetched,
  onRefreshTable
}: AppsScriptSyncBannerProps) {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isFetchPreviewModalOpen, setIsFetchPreviewModalOpen] = useState(false);

  const [tempUrl, setTempUrl] = useState(config.appsScriptUrl || "");
  const [tempSheetName, setTempSheetName] = useState(config.sheetName || defaultSheetName);
  const [autoSaveDb, setAutoSaveDb] = useState(config.autoSaveFetchedToDb ?? true);
  const [autoReadOnOpen, setAutoReadOnOpen] = useState(config.autoReadFromSheet ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [isImportingFetched, setIsImportingFetched] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [fetchedRecords, setFetchedRecords] = useState<any[]>([]);

  useEffect(() => {
    setTempUrl(config.appsScriptUrl || "");
    setTempSheetName(config.sheetName || defaultSheetName);
    setAutoSaveDb(config.autoSaveFetchedToDb ?? true);
    setAutoReadOnOpen(config.autoReadFromSheet ?? false);
  }, [config, defaultSheetName]);

  const displayTitle = moduleTitle || `${defaultSheetName} Google Sheet Integration`;

  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error" | "info", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleSaveConfig = async () => {
    if (!tempUrl.trim()) {
      showFeedback("error", "Please enter a valid Google Apps Script Web App URL.");
      return;
    }
    setIsSaving(true);
    try {
      const newConfig: AppsScriptConfigDoc = {
        appsScriptUrl: tempUrl.trim(),
        sheetName: tempSheetName.trim() || defaultSheetName,
        autoSync: true,
        autoSaveFetchedToDb: autoSaveDb,
        autoReadFromSheet: autoReadOnOpen,
        updatedByName: activeUser?.name || "Admin"
      };

      await saveAppsScriptConfig(configKey, newConfig);
      clearSheetUrlCache();

      setIsConfigModalOpen(false);
      setSyncStatus({
        state: "success",
        message: "Google Apps Script configuration saved!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      });
      showFeedback("success", `Settings saved for "${displayTitle}". Connected to sheet "${tempSheetName.trim() || defaultSheetName}".`);
    } catch (err: any) {
      showFeedback("error", "Failed to save Apps Script settings: " + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!tempUrl.trim()) {
      showFeedback("error", "Please enter an Apps Script URL first.");
      return;
    }
    setIsTesting(true);
    try {
      // Test ping
      const testRecord = {
        id: "TEST-PING",
        testNote: "Connection Test Ping",
        createdAt: new Date().toISOString()
      };
      const res = await syncRecordToAppsScript(
        tempUrl.trim(),
        "ADD",
        collectionKey,
        testRecord,
        tempSheetName.trim() || defaultSheetName
      );

      // Fetch test
      let fetchResultMsg = "";
      try {
        const fetched = await fetchViaAppsScript(
          tempUrl.trim(),
          tempSheetName.trim() || defaultSheetName,
          collectionKey
        );
        fetchResultMsg = ` Read ${fetched.length} rows currently in sheet "${tempSheetName.trim() || defaultSheetName}".`;
      } catch (fetchErr: any) {
        fetchResultMsg = ` (Read note: ${fetchErr?.message || "Sheet is ready"})`;
      }

      setIsTesting(false);
      if (res.status === "success") {
        showFeedback("success", `Connection Test Successful! Apps Script Web App is connected and responding.${fetchResultMsg}`);
      } else {
        showFeedback("info", `Connection Test Notice: ${res.message || "Ensure you deployed as 'Web app' with Access set to 'Anyone'."}${fetchResultMsg}`);
      }
    } catch (err: any) {
      setIsTesting(false);
      showFeedback("error", `Connection Test Error: ${err?.message || String(err)}`);
    }
  };

  /**
   * Main Google Sheets Data Read Logic
   * Reads data rows from the Google Sheet where write, edit, and delete are done.
   */
  const handleReadFromSheet = async (showPreview = false) => {
    const url = config.appsScriptUrl || tempUrl;
    const targetSheet = config.sheetName || defaultSheetName;

    if (!url || !url.trim()) {
      setTempUrl("");
      setTempSheetName(targetSheet);
      setIsConfigModalOpen(true);
      return;
    }

    setIsFetching(true);
    setSyncStatus({ state: "syncing", message: `Reading data from Google Sheet "${targetSheet}"...` });

    try {
      const recordsFromSheet = await fetchViaAppsScript(url, targetSheet, collectionKey);
      setFetchedRecords(recordsFromSheet);
      setIsFetching(false);

      if (recordsFromSheet.length === 0) {
        setSyncStatus({
          state: "idle",
          message: `Sheet "${targetSheet}" has no data rows.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        });
        showFeedback("info", `Notice: No data rows found in Google Sheet "${targetSheet}". Ensure the sheet has headers and data rows.`);
        return;
      }

      if (showPreview) {
        setIsFetchPreviewModalOpen(true);
      } else {
        // Direct read and populate
        if (config.autoSaveFetchedToDb ?? true) {
          await bulkSaveGenericCollectionRecords(collectionKey, recordsFromSheet);
        }
        if (onDataFetched) {
          onDataFetched(recordsFromSheet);
        }
        if (onRefreshTable) {
          onRefreshTable();
        }

        setSyncStatus({
          state: "success",
          message: `Read ${recordsFromSheet.length} records from Google Sheet!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        });
        showFeedback("success", `Success! Loaded ${recordsFromSheet.length} records directly from Google Sheet "${targetSheet}".`);
      }
    } catch (err: any) {
      setIsFetching(false);
      setSyncStatus({
        state: "error",
        message: `Read failed: ${err?.message || "Check Apps Script URL"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      });
      showFeedback("error", `Google Sheet Read Error: ${err?.message || String(err)}. Ensure your Apps Script is deployed as Web App with Access: "Anyone".`);
    }
  };

  /**
   * Confirms import of fetched records from preview modal
   */
  const handleConfirmImport = async (saveToDatabase: boolean) => {
    if (fetchedRecords.length === 0) {
      setIsFetchPreviewModalOpen(false);
      return;
    }

    setIsImportingFetched(true);
    try {
      if (saveToDatabase) {
        const savedCount = await bulkSaveGenericCollectionRecords(collectionKey, fetchedRecords);
        setSyncStatus({
          state: "success",
          message: `Saved ${savedCount} records from Google Sheet to Database!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        });
      }

      if (onDataFetched) {
        onDataFetched(fetchedRecords);
      }
      if (onRefreshTable) {
        onRefreshTable();
      }

      setIsFetchPreviewModalOpen(false);
      showFeedback(
        "success",
        saveToDatabase
          ? `Success! ${fetchedRecords.length} records imported from Google Sheet "${config.sheetName || defaultSheetName}" and saved to database & table.`
          : `Success! ${fetchedRecords.length} records loaded into table view from Google Sheet "${config.sheetName || defaultSheetName}".`
      );
    } catch (err: any) {
      showFeedback("error", "Error importing records: " + (err?.message || String(err)));
    } finally {
      setIsImportingFetched(false);
    }
  };

  /**
   * Bulk Export Handler (Table to Google Sheet)
   */
  const handleBulkExport = async () => {
    const url = config.appsScriptUrl || tempUrl;
    if (!url || !url.trim()) {
      setIsConfigModalOpen(true);
      return;
    }
    if (records.length === 0) {
      showFeedback("info", "No records in table to export.");
      return;
    }
    setIsBatchSyncing(true);
    setSyncStatus({ state: "syncing", message: `Exporting ${records.length} records to Google Sheet...` });

    const res = await batchSyncRecordsToAppsScript(
      url,
      collectionKey,
      records,
      config.sheetName || defaultSheetName
    );
    setIsBatchSyncing(false);

    if (res.status === "success") {
      setSyncStatus({
        state: "success",
        message: `Export complete: ${records.length} records written`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      });
      showFeedback("success", `Export Successful! ${records.length} records written to Google Sheet "${config.sheetName || defaultSheetName}".`);
    } else {
      setSyncStatus({
        state: "error",
        message: `Export failed: ${res.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      });
      showFeedback("error", `Export Warning: ${res.message}`);
    }
  };

  const appsScriptCode = getUniversalAppsScriptTemplateCode(config.sheetName || defaultSheetName);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <>
      {/* INLINE FEEDBACK TOAST */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2.5 mb-3 border shadow-xs animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-700/60"
              : feedback.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-700/60"
              : "bg-sky-950/90 text-sky-200 border-sky-700/60"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" && <CheckCircle size={15} className="text-emerald-400 shrink-0" />}
            {feedback.type === "error" && <AlertTriangle size={15} className="text-rose-400 shrink-0" />}
            {feedback.type === "info" && <CheckCircle2 size={15} className="text-sky-400 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* BANNER BAR */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-100">
                {displayTitle}
              </h3>
              {config.appsScriptUrl ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                  <CheckCircle size={10} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold">
                  <AlertTriangle size={10} /> URL Not Configured
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Sheet: <strong className="text-emerald-400 font-bold">{config.sheetName || defaultSheetName}</strong>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {config.appsScriptUrl ? (
                <span>
                  Connected to this sub-tab's Google Sheet. Full Read, Add, Edit & Delete synchronization active.
                </span>
              ) : (
                <span>
                  Configure this sub-tab's Google Apps Script Web App URL to read and write data directly from your Google Sheet.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons & Status */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap shrink-0">
          {syncStatus.message && syncStatus.state !== "idle" && (
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                syncStatus.state === "syncing"
                  ? "bg-sky-950/80 border-sky-800 text-sky-300 animate-pulse"
                  : syncStatus.state === "success"
                  ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/80 border-rose-800 text-rose-300"
              }`}
            >
              {syncStatus.state === "syncing" && <RefreshCw size={11} className="animate-spin" />}
              {syncStatus.state === "success" && <CheckCircle size={11} />}
              {syncStatus.state === "error" && <AlertTriangle size={11} />}
              <span className="max-w-[180px] truncate">{syncStatus.message}</span>
            </span>
          )}

          {/* READ FROM GOOGLE SHEET BUTTON */}
          <button
            type="button"
            onClick={() => handleReadFromSheet(false)}
            disabled={isFetching}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title={`Read data from Google Sheet "${config.sheetName || defaultSheetName}"`}
          >
            <Download size={13} className={isFetching ? "animate-bounce" : ""} />
            <span>{isFetching ? "Reading..." : "Read from Sheet"}</span>
          </button>

          {/* PREVIEW BUTTON */}
          {config.appsScriptUrl && (
            <button
              type="button"
              onClick={() => handleReadFromSheet(true)}
              disabled={isFetching}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Preview sheet data before importing"
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>
          )}

          {/* BULK EXPORT TO SHEET BUTTON */}
          {config.appsScriptUrl && (
            <button
              type="button"
              onClick={handleBulkExport}
              disabled={isBatchSyncing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Write current records into Google Sheet"
            >
              <Upload size={13} className={isBatchSyncing ? "animate-spin" : ""} />
              <span>Export ({records.length})</span>
            </button>
          )}

          {/* CONFIGURE URL & SHEET NAME BUTTON */}
          <button
            type="button"
            onClick={() => {
              setTempUrl(config.appsScriptUrl || "");
              setTempSheetName(config.sheetName || defaultSheetName);
              setAutoSaveDb(config.autoSaveFetchedToDb ?? true);
              setAutoReadOnOpen(config.autoReadFromSheet ?? false);
              setIsConfigModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sliders size={13} />
            <span>{config.appsScriptUrl ? "Configure" : "Set URL"}</span>
          </button>

          {/* COPY APPS SCRIPT CODE BUTTON */}
          <button
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="View and copy Google Apps Script Code template"
          >
            <Code2 size={13} />
            <span>Script Code</span>
          </button>
        </div>
      </div>

      {/* CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm font-mono uppercase tracking-wider">
                  {displayTitle} - Google Sheet Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-3 flex flex-col gap-1">
                <p className="font-bold text-slate-800 text-xs">
                  Dedicated Google Spreadsheet Integration
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  This sub-tab connects to its own independent Google Spreadsheet. Reads and writes are executed on this specific sheet via your deployed Apps Script.
                </p>
              </div>

              {/* Sheet Name Input */}
              <div>
                <label className="text-[11px] font-bold font-mono text-slate-700 uppercase block mb-1">
                  Google Sheet Name *
                </label>
                <input
                  type="text"
                  value={tempSheetName}
                  onChange={(e) => setTempSheetName(e.target.value)}
                  placeholder={defaultSheetName}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tab name in your Google Sheet (e.g., "{defaultSheetName}").
                </p>
              </div>

              {/* Apps Script Deployed URL */}
              <div>
                <label className="text-[11px] font-bold font-mono text-slate-700 uppercase block mb-1">
                  Deployed Apps Script Web App URL *
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  From Google Apps Script: Deploy &gt; Manage Deployments &gt; Web App URL.
                </p>
              </div>

              {/* Options */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSaveDb}
                    onChange={(e) => setAutoSaveDb(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Auto-Save Fetched Sheet Data to Database
                    </span>
                    <span className="text-[11px] text-slate-600 leading-normal block mt-0.5">
                      When reading data from the sheet, automatically persist rows to the database so records remain available across sessions.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none pt-2 border-t border-slate-200/60">
                  <input
                    type="checkbox"
                    checked={autoReadOnOpen}
                    onChange={(e) => setAutoReadOnOpen(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Auto-Read from Google Sheet on Tab Open
                    </span>
                    <span className="text-[11px] text-slate-600 leading-normal block mt-0.5">
                      Automatically read the latest records from your Google Sheet whenever you switch to this sub-tab.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !tempUrl.trim()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
                  <span>{isTesting ? "Testing..." : "Test Connection"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSaving || !tempUrl.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>{isSaving ? "Saving..." : "Save Settings"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FETCH PREVIEW & IMPORT CONFIRMATION MODAL */}
      {isFetchPreviewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm font-mono uppercase tracking-wider">
                  Data Preview: "{config.sheetName || defaultSheetName}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFetchPreviewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-950 p-3 rounded-xl flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs">
                      Successfully read {fetchedRecords.length} rows from Google Sheet
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      Worksheet: <strong>"{config.sheetName || defaultSheetName}"</strong>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                  {fetchedRecords.length} Rows Ready
                </span>
              </div>

              {/* Table Data Preview */}
              <div>
                <h4 className="font-bold text-slate-700 text-xs mb-1.5 uppercase font-mono">
                  Sample Data (Showing up to 10 rows):
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64 shadow-inner">
                  <table className="w-full text-[11px] text-left border-collapse font-mono">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2 border-r border-slate-200">#</th>
                        {fetchedRecords.length > 0 &&
                          Object.keys(fetchedRecords[0])
                            .slice(0, 8)
                            .map((k) => (
                              <th key={k} className="p-2 border-r border-slate-200 whitespace-nowrap">
                                {k}
                              </th>
                            ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {fetchedRecords.slice(0, 10).map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-100 text-slate-400">{idx + 1}</td>
                          {Object.keys(fetchedRecords[0])
                            .slice(0, 8)
                            .map((k) => (
                              <td key={k} className="p-2 border-r border-slate-100 whitespace-nowrap max-w-[160px] truncate">
                                {typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "")}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFetchPreviewModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmImport(false)}
                  disabled={isImportingFetched}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Eye size={14} />
                  <span>Preview in Table Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmImport(true)}
                  disabled={isImportingFetched}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isImportingFetched ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                  <span>{isImportingFetched ? "Saving to Database..." : "Save to Database & Table"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPS SCRIPT CODE TEMPLATE MODAL */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-sky-400" />
                <h3 className="font-bold text-sm font-mono uppercase tracking-wider">
                  Google Apps Script Code - "{config.sheetName || defaultSheetName}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-xs">
              <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl p-3 flex flex-col gap-1">
                <p className="font-extrabold text-xs text-sky-950 font-mono uppercase">
                  Setup Instructions for this Spreadsheet:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-sky-800 flex flex-col gap-0.5 leading-relaxed">
                  <li>
                    Open this sub-tab's Google Spreadsheet &gt; Click <strong>Extensions &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Paste the code below into <strong>Code.gs</strong> (overwrite any default code) and save (Ctrl+S).
                  </li>
                  <li>
                    Click <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong> &gt; Execute as: <strong>Me</strong> &gt; Access: <strong>Anyone</strong>.
                  </li>
                  <li>
                    Deploy, grant permissions, copy the Web App URL, and paste it into this sub-tab's <strong>Set URL / Configure</strong> modal.
                  </li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-[340px] leading-relaxed border border-slate-800 select-all">
                  {appsScriptCode}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-md"
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
