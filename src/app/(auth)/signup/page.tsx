"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signUpAction } from "@/lib/auth/actions";
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("email", email);
      formData.set("password", password);
      formData.set("confirmPassword", confirmPassword);

      const result = await signUpAction(null, formData);
      if (result) {
        if (!result.success) {
          setError(result.error || "Failed to register account.");
        } else if (result.message) {
          setSuccessMessage(result.message);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        throw err;
      }
      setError("An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="stayhub-card p-6 sm:p-8 shadow-[var(--shadow-xl)] bg-white rounded-[var(--radius-xl)] border border-[var(--border)] text-center animate-in fade-in">
        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-[20px] font-bold text-[var(--foreground)]">Check your inbox</h2>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-2 leading-relaxed">
          {successMessage}
        </p>
        <div className="mt-6 pt-5 border-t border-[var(--border)]">
          <Link href="/login" className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stayhub-card p-6 sm:p-8 shadow-[var(--shadow-xl)] bg-white rounded-[var(--radius-xl)] border border-[var(--border)] animate-in fade-in duration-200">
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-[22px] font-bold text-[var(--foreground)] tracking-tight">
          Create your account
        </h1>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-1.5">
          Get started with StayHub to manage and grow your property
        </p>
      </div>

      {/* Error banner */}
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
          <Label htmlFor="fullName" required>
            Full Name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Koushik Dey"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftElement={<User className="h-4 w-4" />}
            className="h-10"
          />
        </div>

        <div>
          <Label htmlFor="email" required>
            Work Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="koushik@hotelroyal.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftElement={<Mail className="h-4 w-4" />}
            className="h-10"
          />
        </div>

        <div>
          <Label htmlFor="password" required>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
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
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword" required>
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftElement={<Lock className="h-4 w-4" />}
            className="h-10"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full h-10 mt-2 font-semibold shadow-md"
          loading={loading}
          disabled={loading}
        >
          Create Account & Continue
        </Button>
      </form>

      {/* Footer link to sign in */}
      <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-[13px] text-[var(--foreground-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
