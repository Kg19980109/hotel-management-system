"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signInAction } from "@/lib/auth/actions";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = React.useState("");
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
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        throw err;
      }
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stayhub-card p-6 sm:p-8 shadow-[var(--shadow-xl)] bg-white rounded-[var(--radius-xl)] border border-[var(--border)] animate-in fade-in duration-200">
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-[22px] font-bold text-[var(--foreground)] tracking-tight">
          Welcome back
        </h1>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-1.5">
          Sign in to your StayHub property management portal
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-[var(--radius)] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" required>
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@hotel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftElement={<Mail className="h-4 w-4" />}
            className="h-10"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password" required className="mb-0">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[var(--primary)] hover:underline"
              tabIndex={0}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftElement={<Lock className="h-4 w-4" />}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full h-10 mt-2 font-semibold shadow-md"
          loading={loading}
          disabled={loading}
        >
          Sign In to StayHub
        </Button>
      </form>

      {/* Footer link to sign up */}
      <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-[13px] text-[var(--foreground-muted)]">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[var(--primary)] hover:underline"
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
        <div className="stayhub-card p-8 bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] text-center">
          <div className="h-8 w-32 bg-slate-200 animate-pulse rounded mx-auto mb-4" />
          <div className="h-4 w-48 bg-slate-100 animate-pulse rounded mx-auto" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
