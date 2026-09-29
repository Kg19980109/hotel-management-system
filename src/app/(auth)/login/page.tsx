"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/lib/auth/actions";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Shield,
  KeyRound,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = React.useState("koushikghosh6099@gmail.com");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("redirectTo", redirectTo);

      const result = await signInAction(null, formData);
      if (result && !result.success) {
        setError(result.error || "Failed to sign in. Please verify your credentials.");
      }
    } catch (err: unknown) {
      // In Next.js, redirect() throws an error containing NEXT_REDIRECT in message or digest
      const errorObj = err as { message?: string; digest?: string };
      if (
        (errorObj?.message && errorObj.message.includes("NEXT_REDIRECT")) ||
        (errorObj?.digest && errorObj.digest.includes("NEXT_REDIRECT"))
      ) {
        throw err;
      }
      console.error("Login submission error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl bg-[#0D162B]/90 backdrop-blur-2xl border border-white/[0.12] p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Decorative ambient top sheen */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500" />
      
      {/* Header */}
      <div className="text-center mb-7 space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-400/30 text-cyan-300 shadow-inner mb-1">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Welcome back
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Sign in to your StayHub property management portal
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-200"
          >
            Email Address <span className="text-rose-400">*</span>
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
              placeholder="admin@stayhub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-xs font-medium rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-200"
            >
              Password <span className="text-rose-400">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[11.5px] font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-10 text-xs font-medium rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs shadow-[0_4px_20px_rgba(79,70,229,0.35)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Sign In to StayHub</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials Quick-Assist */}
      <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Demo Account:</span>
        </div>
        <span className="font-mono text-cyan-300 font-semibold truncate max-w-[170px]">
          koushikghosh6099@gmail.com
        </span>
      </div>

      {/* Footer Registration Link */}
      <div className="mt-6 pt-5 border-t border-white/[0.08] text-center text-xs text-slate-400">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/signup"
          className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1 transition-colors"
        >
          Register Hotel
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full h-96 rounded-3xl bg-[#0D162B]/80 border border-white/[0.1] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
