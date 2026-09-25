"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

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
      <div className="stayhub-card p-6 sm:p-8 shadow-[var(--shadow-xl)] bg-white rounded-[var(--radius-xl)] border border-[var(--border)] text-center animate-in fade-in">
        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-[20px] font-bold text-[var(--foreground)]">Reset link dispatched</h2>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-2 leading-relaxed">
          {successMessage}
        </p>
        <div className="mt-6 pt-5 border-t border-[var(--border)]">
          <Link href="/login" className="text-[13px] font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stayhub-card p-6 sm:p-8 shadow-[var(--shadow-xl)] bg-white rounded-[var(--radius-xl)] border border-[var(--border)] animate-in fade-in duration-200">
      <div className="text-center mb-6">
        <h1 className="text-[22px] font-bold text-[var(--foreground)] tracking-tight">
          Forgot password?
        </h1>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-1.5">
          Enter your registered email address to receive password reset instructions
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-[var(--radius)] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" required>
            Registered Email
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

        <Button
          type="submit"
          variant="primary"
          className="w-full h-10 mt-2 font-semibold shadow-md"
          loading={loading}
          disabled={loading}
        >
          Send Reset Instructions
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-[13px]">
        <Link href="/login" className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-medium inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
