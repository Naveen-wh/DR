/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User } from "../types";
import { 
  ShieldAlert, 
  Mail, 
  Copy, 
  Check, 
  LogOut, 
  RefreshCw, 
  Briefcase, 
  Clock, 
  UserCheck, 
  Lock, 
  ShieldCheck,
  Building,
  Info,
  Sun,
  Moon
} from "lucide-react";
import { FontSizeToggle } from "./FontSizeToggle";

interface PendingApprovalScreenProps {
  user: User;
  onSignOut: () => Promise<void> | void;
  onRefreshStatus?: () => Promise<void> | void;
}

export default function PendingApprovalScreen({
  user,
  onSignOut,
  onRefreshStatus
}: PendingApprovalScreenProps) {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Theme toggle state
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
      console.error(e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const adminEmail = "care@aromaorganic.in";
  const mailtoUrl = `mailto:${adminEmail}?subject=${encodeURIComponent(
    `Account Activation Request - ${user.name || user.email}`
  )}&body=${encodeURIComponent(
    `Hello Administrator,\n\nI have registered an account on Company DR Portal and would like to request account creation, role assignment, and department clearance.\n\nMy Details:\n• Name: ${user.name || 'N/A'}\n• Registered Email: ${user.email}\n• Requested Date: ${user.requestedAt || new Date().toLocaleString()}\n\nThank you,\n${user.name || user.email}`
  )}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(adminEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRefresh = async () => {
    if (onRefreshStatus) {
      setIsRefreshing(true);
      try {
        await onRefreshStatus();
      } finally {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between antialiased font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1.5 rounded-md shadow-xs">
              <Briefcase size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                Company DR Portal
              </h1>
              <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Hierarchical Access Clearance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              id="pending-theme-toggle"
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

            <FontSizeToggle idPrefix="pending" />

            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition cursor-pointer"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Notice Card */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          {/* Status Header Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 text-white text-center sm:text-left sm:flex sm:items-center sm:gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center mx-auto sm:mx-0 shrink-0 border border-white/20">
              <ShieldAlert size={26} className="text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/20 text-white mb-1">
                <Clock size={11} /> Registration Security Check
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Account Awaiting Administrator Activation
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Security Explanation Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-slate-800">
              <div className="flex items-start gap-2.5">
                <Lock className="text-amber-700 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    Security & Access Clearance Notice
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700">
                    This security hold applies to newly registered users whose details and role assignments are not yet pre-configured in the Firestore user directory. To prevent unauthorized misuse, full access requires administrator approval.
                  </p>
                  <p className="text-xs font-semibold text-slate-900 leading-relaxed pt-1">
                    Please reach out to the Administrator at{" "}
                    <a 
                      href={mailtoUrl}
                      className="text-emerald-700 hover:text-emerald-800 underline font-bold"
                    >
                      care@aromaorganic.in
                    </a>{" "}
                    to activate your account, assign your department team, and configure role clearance.
                  </p>
                </div>
              </div>
            </div>

            {/* Account Metadata Summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Submitted Registration Details</span>
                <span className="text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold">
                  Status: Pending Approval
                </span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase block font-mono">Full Name</span>
                  <span className="font-bold text-slate-900">{user.name || "Standard User"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase block font-mono">Registered Email</span>
                  <span className="font-mono font-bold text-slate-900 break-all">{user.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase block font-mono">Current Access State</span>
                  <span className="font-semibold text-amber-700 inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Awaiting Admin Clearance
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 uppercase block font-mono">Request Timestamp</span>
                  <span className="text-slate-600 font-mono">
                    {user.requestedAt ? new Date(user.requestedAt).toLocaleString() : "Just now"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Box */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Administrator Contact & Account Exit Options
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={mailtoUrl}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  <Mail size={14} />
                  Email care@aromaorganic.in
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? "Email Copied to Clipboard!" : "Copy Admin Email"}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold font-mono rounded-lg transition cursor-pointer"
                >
                  <LogOut size={14} className="text-rose-600" />
                  Logout & Return to Login Page
                </button>
              </div>
            </div>

            {/* Bottom Refresh Check & Help */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 text-center sm:text-left leading-tight">
                Once the administrator approves or registers your details in the user table, click below to verify and enter.
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRefreshing ? "animate-spin text-emerald-600" : ""} />
                {isRefreshing ? "Checking Status..." : "Check Status"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-400">
        Company Management Portal • Admin Helpdesk: care@aromaorganic.in
      </footer>
    </div>
  );
}
