"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { resetPasswordAction } from "@/lib/auth/actions";
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

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
      formData.set("password", password);
      formData.set("confirmPassword", confirmPassword);

      const result = await resetPasswordAction(null, formData);
      if (result && !result.success) {
        setError(result.error || "Failed to update password.");
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
      <div className="text-center mb-6">
        <h1 className="text-[22px] font-bold text-[var(--foreground)] tracking-tight">
          Set new password
        </h1>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-1.5">
          Enter your updated security password to restore account access
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
          <Label htmlFor="password" required>
            New Password
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
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Repeat new password"
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
          Update Password & Enter StayHub
        </Button>
      </form>
    </div>
  );
}
