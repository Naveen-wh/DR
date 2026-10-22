/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

export type FontSizeOption = "small" | "medium" | "large" | "xlarge";

interface FontSizeToggleProps {
  idPrefix?: string;
}

export function FontSizeToggle({ idPrefix = "header" }: FontSizeToggleProps) {
  const [fontSize, setFontSize] = useState<FontSizeOption>(() => {
    try {
      const saved = localStorage.getItem("app_font_size");
      if (saved === "small" || saved === "medium" || saved === "large" || saved === "xlarge") {
        return saved;
      }
      return "medium";
    } catch {
      return "medium";
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-font-size", fontSize);
      localStorage.setItem("app_font_size", fontSize);
    } catch (e) {
      console.error("Font size sync error:", e);
    }
  }, [fontSize]);

  const sizes: { key: FontSizeOption; label: string; iconClass: string }[] = [
    { key: "small", label: "Font Size: Small", iconClass: "text-[10px]" },
    { key: "medium", label: "Font Size: Medium", iconClass: "text-[12px]" },
    { key: "large", label: "Font Size: Large", iconClass: "text-[14px]" },
    { key: "xlarge", label: "Font Size: Extra Large", iconClass: "text-[17px]" },
  ];

  return (
    <div
      id={`${idPrefix}-font-size-group`}
      className="flex items-center p-0.5 rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 shadow-2xs"
    >
      {sizes.map((s) => {
        const isActive = fontSize === s.key;
        return (
          <button
            key={s.key}
            id={`${idPrefix}-font-${s.key}`}
            onClick={() => setFontSize(s.key)}
            title={s.label}
            aria-label={s.label}
            className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-150 cursor-pointer font-serif font-black select-none ${s.iconClass} ${
              isActive
                ? "bg-white text-emerald-600 dark:bg-slate-900 dark:text-emerald-400 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            }`}
          >
            A
          </button>
        );
      })}
    </div>
  );
}
