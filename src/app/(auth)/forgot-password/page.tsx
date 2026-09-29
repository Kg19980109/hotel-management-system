"use client";

import * as React from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);

      const result = await forgotPasswordAction(null, formData);
      if (result) {
        if (!result.success) {
          setError(result.error || "Failed to send reset link.");
        } else if (result.message) {
          setSuccessMessage(result.message);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="w-full rounded-3xl bg-[#0D162B]/90 backdrop-blur-2xl border border-white/[0.12] p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden animate-in fade-in">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
        
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        
        <h2 className="text-xl font-bold text-white tracking-tight">Reset Link Dispatched</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
          {successMessage}
        </p>

        <div className="mt-7 pt-5 border-t border-white/[0.08]">
          <Link
            href="/login"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl bg-[#0D162B]/90 backdrop-blur-2xl border border-white/[0.12] p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500" />

      <div className="text-center mb-7 space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-400/30 text-cyan-300 shadow-inner mb-1">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Forgot password?
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Enter your registered email address to receive secure reset instructions
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-slate-200">
            Registered Email <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@hotel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-xs font-medium rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs shadow-[0_4px_20px_rgba(79,70,229,0.35)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              <span>Sending Instructions...</span>
            </>
          ) : (
            <>
              <span>Send Reset Instructions</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-white/[0.08] text-center text-xs text-slate-400">
        <Link
          href="/login"
          className="text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
