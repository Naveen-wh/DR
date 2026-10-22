import React, { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Copy, Sheet } from "lucide-react";

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sampleTemplate: string; // CSV string format
  fields: FieldDef[];
  onImport: (parsedRows: any[]) => Promise<void> | void;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  title,
  sampleTemplate,
  fields,
  onImport
}: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "sheet" | "paste">("file");
  const [rawData, setRawData] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseCSV(text);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    try {
      setErrorMsg("");
      const lines = csvText.split(/\r\n|\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setErrorMsg("CSV file must contain a header row and at least one data row.");
        setParsedRows([]);
        return;
      }

      // Detect separator (comma or tab)
      const firstLine = lines[0];
      const separator = firstLine.includes("\t") ? "\t" : ",";

      const headers = firstLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ""));
      
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        // Handle basic CSV / TSV split
        const values = currentLine.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ""));
        
        const rowObj: any = {};
        headers.forEach((header, index) => {
          const val = values[index] || "";
          rowObj[header] = val;
        });
        rows.push(rowObj);
      }

      setParsedRows(rows);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error parsing CSV / Google Sheets data. Please check format.");
      setParsedRows([]);
    }
  };

  const handlePasteParse = () => {
    if (!rawData.trim()) {
      setErrorMsg("Please paste CSV or Google Sheets data.");
      return;
    }
    parseCSV(rawData);
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg("No valid rows to import.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onImport(parsedRows);
      setSuccessCount(parsedRows.length);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to import records into database.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-emerald-400" />
            <h3 className="text-xs font-bold uppercase font-mono tracking-wider">Bulk Import - {title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "file" ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload size={13} /> Upload CSV File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sheet")}
            className={`px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sheet" ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Sheet size={13} /> Google Sheets / Excel Paste
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {successCount !== null ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl text-center space-y-2">
              <CheckCircle size={32} className="mx-auto text-emerald-600 animate-bounce" />
              <h4 className="text-sm font-bold uppercase font-mono">Import Successful!</h4>
              <p className="text-xs font-medium">Successfully imported {successCount} records into {title}.</p>
            </div>
          ) : (
            <>
              {/* Instructions & Template */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">Need a sample format?</span>
                  <p className="text-xs text-slate-600">Download the CSV template or copy columns matching required fields.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Download size={13} /> Download Template
                </button>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === "file" && (
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center bg-slate-50/50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                      <FileText size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Click to browse or drag and drop your CSV file</span>
                    <span className="text-[10px] text-slate-400 font-mono">Supports .csv, .txt (Comma or Tab separated)</span>
                  </div>
                </div>
              )}

              {activeTab === "sheet" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">
                      Paste Copied Cells from Google Sheets or Excel
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Headers must be in the first row</span>
                  </div>
                  <textarea
                    rows={6}
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                    placeholder="Paste table cells here (Ctrl+V)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handlePasteParse}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    Parse Data Preview
                  </button>
                </div>
              )}

              {/* Preview parsed data */}
              {parsedRows.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" /> Preview ({parsedRows.length} records ready)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">First 5 rows displayed</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <tr>
                          {Object.keys(parsedRows[0] || {}).map((col, idx) => (
                            <th key={idx} className="px-3 py-2 font-bold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {Object.values(row).map((val: any, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 truncate max-w-[150px] text-slate-600">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-slate-500">
            {parsedRows.length > 0 ? `${parsedRows.length} rows parsed and validated` : "Awaiting data input"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase font-mono rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isSubmitting || successCount !== null}
              onClick={handleExecuteImport}
              className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs uppercase font-mono rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                parsedRows.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Upload size={13} />
              {isSubmitting ? "Importing..." : `Import ${parsedRows.length} Records`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
