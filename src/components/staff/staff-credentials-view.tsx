"use client";

// ============================================================
// STAYHUB STAFF CREDENTIALS & PORTAL ACCESS CONSOLE
// ============================================================

import * as React from "react";
import { StaffMember } from "@/lib/staff/types";
import { resetStaffPasswordAction } from "@/lib/staff/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffCredentialsViewProps {
  propertyId: string;
  staffList: StaffMember[];
  onRefresh: () => void;
}

export function StaffCredentialsView({
  propertyId,
  staffList,
}: StaffCredentialsViewProps) {
  const [showPassword, setShowPassword] = React.useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [resettingId, setResettingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const defaultPassword = "StayHub@2026";

  const toggleShowPassword = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCredentials = (staff: StaffMember) => {
    const text = `Staff Portal: ${window.location.origin}/login\nEmail: ${staff.email}\nPassword: ${defaultPassword}`;
    void navigator.clipboard.writeText(text);
    setCopiedId(staff.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResetPassword = async (staff: StaffMember) => {
    if (!staff.email) return;
    setResettingId(staff.id);
    setMessage(null);
    const res = await resetStaffPasswordAction(propertyId, staff.email, defaultPassword);
    setResettingId(null);
    if (res.success) {
      setMessage(`Successfully reset password for ${staff.first_name} (${staff.email}) to "${defaultPassword}"`);
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage(res.error || "Failed to reset password.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Notice Card */}
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-foreground text-sm flex items-center gap-2">
              <span>Hotel Staff Authentication & Passcodes Console</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Admin Console
              </span>
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Employees can sign in to the StayHub Staff Portal using their registered hotel email address and default temporary password. You can copy credentials with 1 tap to hand them over to on-duty staff.
            </p>
          </div>
        </div>
        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 shadow-xs transition"
        >
          <span>Open Login Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {message && (
        <div className="p-3.5 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-bold">{message}</span>
        </div>
      )}

      {/* Credentials Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department / Designation</th>
                <th className="py-3 px-4">Portal Login ID (Email)</th>
                <th className="py-3 px-4">Active Password</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffList.map((staff) => {
                const isVisible = !!showPassword[staff.id];
                const isCopied = copiedId === staff.id;
                const isResetting = resettingId === staff.id;

                return (
                  <tr key={staff.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">
                          {staff.first_name} {staff.last_name}
                        </span>
                        <code className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-500/20">
                          {staff.employee_code}
                        </code>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block">
                          {staff.department?.name || "Operations"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {staff.designation || "Staff"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {staff.email ? (
                        <code className="font-mono text-xs font-bold text-foreground select-all bg-muted/40 px-2 py-0.5 rounded">
                          {staff.email}
                        </code>
                      ) : (
                        <span className="text-muted-foreground italic">No email assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-muted/60 px-2.5 py-1 rounded-lg border border-border font-bold">
                          {isVisible ? defaultPassword : "••••••••••••"}
                        </code>
                        <button
                          onClick={() => toggleShowPassword(staff.id)}
                          className="text-muted-foreground hover:text-foreground transition p-1"
                          title={isVisible ? "Hide Password" : "Show Password"}
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border",
                          staff.is_active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {staff.is_active ? "Active Login" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-bold gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-slate-950"
                        onClick={() => handleCopyCredentials(staff)}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Login Info</span>
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isResetting || !staff.email}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleResetPassword(staff)}
                        title="Reset password to default (StayHub@2026)"
                      >
                        {isResetting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
