"use client";

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
  ShieldAlert,
  ExternalLink,
  RotateCcw,
  Loader2,
} from "lucide-react";

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
      setMessage(`Successfully set default password for ${staff.first_name} (${staff.email}) to "${defaultPassword}"`);
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage(res.error || "Failed to reset password.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Notice Card */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Super Admin & Hotel Owner Access Credentials Console</p>
            <p className="text-muted-foreground">
              Employees can sign in to the StayHub Staff Portal using their registered hotel email and the initial temporary password below.
              You can copy these credentials to hand them over to on-duty staff.
            </p>
          </div>
        </div>
        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 shadow-sm transition"
        >
          <span>Staff Login Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {message && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}

      {/* Credentials Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department / Designation</th>
                <th className="py-3 px-4">Portal Login ID (Email)</th>
                <th className="py-3 px-4">Active Password</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staffList.map((staff) => {
                const isVisible = !!showPassword[staff.id];
                const isCopied = copiedId === staff.id;
                const isResetting = resettingId === staff.id;

                return (
                  <tr key={staff.id} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {staff.first_name} {staff.last_name}
                        </span>
                        <code className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                          {staff.employee_code}
                        </code>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block">
                          {staff.department?.name || "Operations"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {staff.designation || "Staff"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {staff.email ? (
                        <code className="font-mono text-xs font-bold text-foreground select-all">
                          {staff.email}
                        </code>
                      ) : (
                        <span className="text-muted-foreground italic">No email assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-muted/60 px-2 py-1 rounded border border-[var(--border)]">
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={staff.is_active ? "success" : "default"} className="text-[10px]">
                        {staff.is_active ? "Active Auth Account" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-semibold gap-1"
                        onClick={() => handleCopyCredentials(staff)}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600">Copied!</span>
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
                        title="Reset password to StayHub@2026"
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
