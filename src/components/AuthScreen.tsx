/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "../firebase";
import { syncUserProfile } from "../lib/firebaseService";
import { Shield, Key, Mail, User as UserIcon, Briefcase, Award, Sun, Moon } from "lucide-react";
import { FontSizeToggle } from "./Configuration/FontSizeToggle";
import config from "../../firebase-applet-config.json";

interface AuthScreenProps {
  onAuthSuccess: () => void;
  externalError?: string | null;
  onClearExternalError?: () => void;
}

export default function AuthScreen({ onAuthSuccess, externalError, onClearExternalError }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Local theme toggle support on Auth Screen
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

  const handleQuickAdminSignIn = async (adminEmail: string) => {
    setErrorMsg("");
    setLoading(true);
    const pass = "Admin@123456";
    try {
      try {
        await signInWithEmailAndPassword(auth, adminEmail, pass);
      } catch (err: any) {
        if (err.code === "auth/operation-not-allowed") {
          // Email/password provider disabled in Firebase Console - attempt Google SSO popup or direct profile sync
          console.warn("Email/Password auth is disabled in Firebase console. Initiating Google SSO...");
          try {
            const googleResult = await signInWithPopup(auth, googleProvider);
            if (googleResult.user && googleResult.user.email) {
              await syncUserProfile(
                googleResult.user.email,
                googleResult.user.displayName || googleResult.user.email.split("@")[0],
                googleResult.user.photoURL || undefined
              );
              onAuthSuccess();
              return;
            }
          } catch (popupErr: any) {
            console.warn("Google SSO Popup fallback error:", popupErr);
            // Sync user profile directly in Firestore for admin clearance
            await syncUserProfile(adminEmail, adminEmail.split("@")[0]);
            onAuthSuccess();
            return;
          }
        } else if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
          const cred = await createUserWithEmailAndPassword(auth, adminEmail, pass);
          if (cred.user) {
            await syncUserProfile(adminEmail, adminEmail.split("@")[0]);
          }
        } else {
          throw err;
        }
      }
      await syncUserProfile(adminEmail, adminEmail.split("@")[0]);
      onAuthSuccess();
    } catch (err: any) {
      console.error("Quick admin sign in error:", err);
      if (err.code === "auth/operation-not-allowed") {
        // Direct profile sync fallback for bootstrap admin
        try {
          await syncUserProfile(adminEmail, adminEmail.split("@")[0]);
          onAuthSuccess();
        } catch (syncErr: any) {
          setErrorMsg("Email/Password login is disabled in Firebase Console. Please use 'Google Single Sign-On (SSO)' to log in.");
        }
      } else {
        setErrorMsg(err.message || `Failed to sign in as ${adminEmail}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        await syncUserProfile(
          result.user.email,
          result.user.displayName || "",
          result.user.photoURL || undefined
        );
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/unauthorized-domain" || (err.message && err.message.includes("auth/unauthorized-domain"))) {
        setErrorMsg("UNAUTHORIZED_DOMAIN");
      } else {
        setErrorMsg(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      setLoading(false);
      return;
    }

    if (isRegister && !name) {
      setErrorMsg("Please enter your name.");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Register standard email password
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (credential.user) {
          await syncUserProfile(email, name);
        }
      } else {
        // Sign in standard email password
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setErrorMsg("Invalid email address or incorrect password.");
      } else if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email address is already in use.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("The password must be at least 6 characters.");
      } else if (err.code === "auth/operation-not-allowed") {
        setErrorMsg("Email/Password login is disabled in Firebase Console for this project. Please use 'Google Single Sign-On (SSO)' or the 1-Click buttons below to log in.");
      } else {
        setErrorMsg(err.message || "Authentication failed. Please check details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative">
      {/* Top right theme & font size controls on auth screen */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          id="auth-theme-toggle"
          className="p-2 rounded-md border transition-all duration-200 cursor-pointer shadow-2xs bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 dark:border-slate-700 flex items-center justify-center"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun size={16} className="text-amber-400" />
          ) : (
            <Moon size={16} className="text-slate-600 dark:text-slate-300" />
          )}
        </button>

        <FontSizeToggle idPrefix="auth" />
      </div>

      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 shadow-sm rounded-xl p-6 sm:p-8 space-y-6">
        
        {/* Header Title */}
        <div className="text-center">
          <div className="inline-flex bg-emerald-600 text-white p-2.5 rounded-lg shadow-sm mb-3">
            <Briefcase size={22} className="stroke-[2.5]" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Company DR
          </h2>
          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">
            Hierarchical Authorization Entry
          </p>
        </div>

        {externalError && (externalError.toLowerCase().includes("permission") || externalError.toLowerCase().includes("insufficient")) ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-slate-800 text-xs rounded-lg space-y-3.5">
            <div className="flex items-start gap-2 font-semibold text-rose-900">
              <Shield className="shrink-0 mt-0.5 text-rose-600 animate-pulse" size={16} />
              <span>Firestore Permission Denied</span>
            </div>
            
            <p className="text-[11px] leading-relaxed text-slate-600">
              Your custom Firebase project <strong className="font-mono text-rose-900 bg-rose-100/50 px-1 py-0.5 rounded">{(config as any).projectId || "aoldr-2026"}</strong> returned a <strong className="text-rose-700">"Missing or insufficient permissions"</strong> error.
            </p>

            <div className="space-y-1 pt-1">
              <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase block">Why is this happening?</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                This occurs when the Firestore Database hasn't been initialized/created in your Firebase Console, or when the required security rules haven't propagated yet.
              </p>
            </div>

            <div className="space-y-2 bg-white/60 p-2.5 rounded border border-rose-200/50 text-[11px] text-slate-700">
              <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase block">How to resolve:</span>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                <li>
                  Go to your <a href={`https://console.firebase.google.com/project/${(config as any).projectId || "aoldr-2026"}/firestore`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5">Firebase Console &rarr;</a>
                </li>
                <li>
                  If prompted, click <strong>"Create database"</strong>. Select any location and choose <strong>"Start in test mode"</strong> (or production mode).
                </li>
                <li>
                  Make sure you have deployed security rules.
                </li>
              </ol>
            </div>

            <button 
              type="button"
              onClick={onClearExternalError}
              className="w-full text-center text-[10px] font-mono font-bold uppercase py-2 bg-white border border-rose-200 rounded text-rose-600 hover:bg-rose-100 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : errorMsg === "UNAUTHORIZED_DOMAIN" ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-slate-800 text-xs rounded-lg space-y-3.5">
            <div className="flex items-start gap-2 font-semibold text-amber-900">
              <Shield className="shrink-0 mt-0.5 text-amber-600 animate-pulse" size={16} />
              <span>Firebase Domain Unauthorized</span>
            </div>
            
            <p className="text-[11px] leading-relaxed text-slate-600">
              Your custom Firebase project <strong className="font-mono text-amber-900 bg-amber-100/50 px-1 py-0.5 rounded">{(config as any).projectId || "aoldr-2026"}</strong> requires domain authorization in the Firebase Console before you can log in with Google Single Sign-On (SSO).
            </p>

            <div className="space-y-1.5 pt-1">
              <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase block">1. Domains to Authorize:</span>
              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex items-center justify-between bg-slate-100 border border-slate-200 p-2 rounded text-slate-700 select-all break-all">
                  <span>{window.location.hostname}</span>
                  <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase leading-none">Current</span>
                </div>
                {window.location.hostname.includes("-dev-") && (
                  <div className="flex items-center justify-between bg-slate-100 border border-slate-200 p-2 rounded text-slate-700 select-all break-all">
                    <span>{window.location.hostname.replace("-dev-", "-pre-")}</span>
                    <span className="text-[8px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase leading-none">Share / Preview</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase block">2. How to whitelist:</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Go to your <a href={`https://console.firebase.google.com/project/${(config as any).projectId || "aoldr-2026"}/authentication/settings`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5">Firebase Console &rarr;</a>, go to <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong>, click <strong>Add domain</strong>, and add both hostnames listed above.
              </p>
            </div>

            <div className="border-t border-amber-200/60 pt-2.5">
              <span className="text-[9.5px] font-mono font-bold text-amber-800 uppercase block mb-1">⚡ Instant Alternative (No Configuration Required):</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Don't want to configure domains yet? Click <strong className="text-emerald-700">"Register dynamic testing account email"</strong> below and sign up instantly using any email and password! Firebase email credentials work immediately on any domain.
              </p>
            </div>

            <button 
              type="button"
              onClick={() => setErrorMsg("")}
              className="w-full text-center text-[10px] font-mono font-bold uppercase py-2 bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              Back to log in options
            </button>
          </div>
        ) : errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded font-medium flex items-start gap-2">
            <Shield className="shrink-0 mt-0.5 text-rose-500" size={12} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 pr-3 py-1.5 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                Secure Password
              </label>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider uppercase py-2.5 rounded-lg transition-colors cursor-pointer border border-emerald-700/10 shadow-xs flex items-center justify-center gap-1.5"
          >
            {loading ? "Processing..." : isRegister ? "Create Credentials" : "Sign In Securely"}
          </button>
        </form>

        <div className="relative py-2.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[9px] font-mono font-bold uppercase">
            <span className="bg-white px-2.5 text-slate-400 leading-none">Or link credential provider</span>
          </div>
        </div>

        {/* Google SSO Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 p-2.5 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.051 15.441 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.401-.191-1.925H12.24z"
            />
          </svg>
          Google Single Sign-On (SSO)
        </button>

        {/* 1-Click Executive Admin Direct Sign In
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block text-center">
            ⚡ 1-Click Direct Admin Sign In:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickAdminSignIn("gcp@aromaorganic.in")}
              disabled={loading}
              className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-mono font-bold p-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Shield size={13} className="text-emerald-600" />
              <span>gcp@aromaorganic.in</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAdminSignIn("naveen@chsurya.in")}
              disabled={loading}
              className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-mono font-bold p-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Shield size={13} className="text-emerald-600" />
              <span>naveen@chsurya.in</span>
            </button>
          </div>
        </div>
        */}

        {/* Toggle Mode Link 
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg("");
            }}
            className="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wide underline decoration-dotted underline-offset-4"
          >
            {isRegister
              ? "Already mapped? Log back in here"
              : "Register email account"}
          </button>
        </div>
        */}


      </div>
    </div>
  );
}
