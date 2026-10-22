import React, { useState, useEffect, useRef, useCallback } from "react";
import { Calendar, X } from "lucide-react";

export interface DateFilterOption {
  label: string;
  value: string;
}

interface DateRangeFilterPopupProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  dateFilterType: string;
  onDateFilterTypeChange: (val: any) => void;
  dateFilterOptions?: DateFilterOption[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  accentColor?: "emerald" | "indigo" | "purple" | "slate" | "sky";
}

export const DateRangeFilterPopup: React.FC<DateRangeFilterPopupProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  dateFilterType,
  onDateFilterTypeChange,
  dateFilterOptions = [
    { label: "Entry Date", value: "entry" },
    { label: "Tally Date", value: "tally" },
  ],
  isOpen,
  onToggle,
  accentColor = "emerald",
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = Math.min(320, screenWidth - 24); // max 320px, 12px margins
    const popupEstimatedHeight = 380;

    // Default right-aligned to button
    let left = rect.right - popupWidth;

    // Ensure it doesn't overflow right edge
    if (left + popupWidth > screenWidth - 12) {
      left = screenWidth - 12 - popupWidth;
    }
    // Ensure it doesn't overflow left edge
    if (left < 12) {
      left = 12;
    }

    // Vertical positioning
    let top = rect.bottom + 6;
    if (top + popupEstimatedHeight > screenHeight - 12 && rect.top - popupEstimatedHeight - 6 > 12) {
      top = rect.top - popupEstimatedHeight - 6;
    }

    setCoords({ top, left, width: popupWidth });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggle(false);
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isOpen, onToggle, updatePosition]);

  const isRangeActive = Boolean(startDate || endDate);

  const activeOptionLabel =
    dateFilterOptions.find((opt) => opt.value === dateFilterType)?.label ||
    (dateFilterType === "entry" ? "Entry" : "Secondary");

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onToggle(!isOpen)}
        className={`inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 font-medium transition-all border cursor-pointer ${
          isRangeActive
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs"
            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <Calendar size={14} className={isRangeActive ? "text-emerald-600" : "text-slate-500"} />
        <span>Date Range</span>
        {isRangeActive && (
          <span className="ml-1 text-[10px] bg-emerald-600 text-white font-mono font-bold px-1.5 py-0.2 rounded-full">
            {activeOptionLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
          className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-slate-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Date Range Filter</h4>
            </div>
            <button
              type="button"
              onClick={() => onToggle(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Date Field Type Selector */}
            {dateFilterOptions.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Filter By Date Field
                </label>
                <div
                  className="grid gap-1.5 p-1 bg-slate-100 rounded-lg"
                  style={{ gridTemplateColumns: `repeat(${dateFilterOptions.length}, minmax(0, 1fr))` }}
                >
                  {dateFilterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onDateFilterTypeChange(opt.value)}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        dateFilterType === opt.value
                          ? "bg-white text-emerald-700 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Date & End Date Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    onStartDateChange(today);
                    onEndDateChange(today);
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                      .toISOString()
                      .split("T")[0];
                    const today = now.toISOString().split("T")[0];
                    onStartDateChange(firstDay);
                    onEndDateChange(today);
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const prior30 = new Date(now.setDate(now.getDate() - 30))
                      .toISOString()
                      .split("T")[0];
                    const today = new Date().toISOString().split("T")[0];
                    onStartDateChange(prior30);
                    onEndDateChange(today);
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors cursor-pointer"
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Active Selection Summary */}
            {isRangeActive && (
              <div className="p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 font-mono flex items-center justify-between">
                <span>
                  {activeOptionLabel}: {startDate || "Any"} → {endDate || "Any"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onStartDateChange("");
                    onEndDateChange("");
                  }}
                  className="text-xs font-bold text-emerald-900 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onStartDateChange("");
                  onEndDateChange("");
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Clear Dates
              </button>
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
