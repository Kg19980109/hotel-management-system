"use client";

// ============================================================
// STAYHUB STAFF PROFILE & SELF-SERVICE PORTAL — PHASE 6
//
// Separates:
// 1. Personal / Self-Service Information (Editable: Name, Display Name, Phone, Avatar, Emergency Contacts)
// 2. Employment & Organization (Manager-Controlled / Strictly Read-Only)
// 3. Account & Security (Supabase Auth / Password Management)
// 4. Access & Role Capabilities (Read-Only Matrix)
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getMyProfileAction,
  updateMyProfileAction,
  updateMyPasswordAction,
} from "@/lib/staff/actions";
import { StaffProfileDetails, UpdateMyProfileInput } from "@/lib/staff/types";
import {
  User,
  Shield,
  Lock,
  Building,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Key,
  Calendar,
  Layers,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveTab = "profile" | "employment" | "security" | "permissions";

export function StaffProfileView() {
  const { currentProperty, refreshAuth } = useAuth();

  const [activeTab, setActiveTab] = React.useState<ActiveTab>("profile");
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<StaffProfileDetails | null>(null);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Form State for Personal Info
  const [formData, setFormData] = React.useState<UpdateMyProfileInput>({
    full_name: "",
    display_name: "",
    phone: "",
    avatar_url: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Password State
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [updatingPassword, setUpdatingPassword] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  // Load Data
  const propertyId = currentProperty?.property_id;
  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getMyProfileAction(propertyId);
      if (res.success && res.data) {
        setData(res.data);
        setFormData({
          full_name: res.data.profile.full_name || "",
          display_name:
            res.data.staff?.display_name ||
            res.data.profile.full_name ||
            "",
          phone: res.data.staff?.phone || res.data.profile.phone || "",
          avatar_url: res.data.profile.avatar_url || "",
          address: res.data.staff?.address || "",
          emergency_contact_name:
            res.data.staff?.emergency_contact_name || "",
          emergency_contact_phone:
            res.data.staff?.emergency_contact_phone || "",
        });
      } else {
        setFetchError(res.error || "Failed to load profile data");
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [loadProfile]);

  // Unsaved changes check
  const isDirty = React.useMemo(() => {
    if (!data) return false;
    const initialFullName = data.profile.full_name || "";
    const initialDisplayName =
      data.staff?.display_name || data.profile.full_name || "";
    const initialPhone = data.staff?.phone || data.profile.phone || "";
    const initialAvatar = data.profile.avatar_url || "";
    const initialAddress = data.staff?.address || "";
    const initialEmergName = data.staff?.emergency_contact_name || "";
    const initialEmergPhone = data.staff?.emergency_contact_phone || "";

    return (
      formData.full_name !== initialFullName ||
      formData.display_name !== initialDisplayName ||
      formData.phone !== initialPhone ||
      formData.avatar_url !== initialAvatar ||
      formData.address !== initialAddress ||
      formData.emergency_contact_name !== initialEmergName ||
      formData.emergency_contact_phone !== initialEmergPhone
    );
  }, [data, formData]);

  const handleReset = () => {
    if (!data) return;
    setFormData({
      full_name: data.profile.full_name || "",
      display_name:
        data.staff?.display_name || data.profile.full_name || "",
      phone: data.staff?.phone || data.profile.phone || "",
      avatar_url: data.profile.avatar_url || "",
      address: data.staff?.address || "",
      emergency_contact_name: data.staff?.emergency_contact_name || "",
      emergency_contact_phone: data.staff?.emergency_contact_phone || "",
    });
    setSaveError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty?.property_id) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await updateMyProfileAction(
        currentProperty.property_id,
        formData
      );
      if (res.success) {
        setSaveSuccess(true);
        await refreshAuth();
        await loadProfile();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Failed to update profile");
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      setUpdatingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      setUpdatingPassword(false);
      return;
    }

    try {
      const res = await updateMyPasswordAction(newPassword, confirmPassword);
      if (res.success) {
        setPasswordSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 4000);
      } else {
        setPasswordError(res.error || "Failed to update password");
      }
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Password update failed"
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-6 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400" />
        <p className="text-sm text-[var(--foreground-muted)] animate-pulse">
          Loading your personal profile & employment information...
        </p>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-semibold text-rose-500">
            Unable to Load Profile
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">
            {fetchError || "An error occurred while loading your profile."}
          </p>
          <Button onClick={loadProfile} variant="secondary" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { profile, staff, membership, allProperties, permissions } = data;
  const userFullName = profile.full_name || "Staff Member";
  const userRoleName = membership?.role_name || "Staff Member";
  const userDeptName = staff?.department?.name || "General Staff";
  const employeeCode = staff?.employee_code || "EMP-N/A";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* ─── Hero Header Banner ─── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-violet-500/0 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-4">
            <div className="relative group">
              <Avatar
                name={userFullName}
                src={formData.avatar_url || profile.avatar_url || undefined}
                size="xl"
                className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-[var(--surface)] shadow-md"
              />
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] tracking-tight">
                  {userFullName}
                </h1>
                <Badge variant="checked_in" showDot={false}>
                  {userRoleName}
                </Badge>
                <Badge variant="available" showDot={false}>
                  {staff?.employment_status || "ACTIVE"}
                </Badge>
              </div>

              <p className="text-xs text-[var(--foreground-muted)] flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <Briefcase className="h-3 w-3" />
                  {employeeCode}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {userDeptName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {profile.email}
                </span>
              </p>
            </div>
          </div>

          {/* Active Property Context Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-xs">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider">
                Active Property Context
              </p>
              <p className="font-semibold text-[var(--foreground)] truncate max-w-[180px]">
                {membership?.property_name || currentProperty?.property_name || "StayHub Hotel"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
          )}
        >
          <User className="h-4 w-4" />
          Personal Profile
          {isDirty && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("employment")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === "employment"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
          )}
        >
          <Briefcase className="h-4 w-4" />
          Employment & Organization
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === "security"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
          )}
        >
          <Lock className="h-4 w-4" />
          Security & Account
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap",
            activeTab === "permissions"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold"
              : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
          )}
        >
          <Shield className="h-4 w-4" />
          Access & Capabilities
        </button>
      </div>

      {/* ─── TAB 1: PERSONAL PROFILE (SELF-SERVICE) ─── */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Self-Service Personal Details
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                You can update your display name, personal phone, avatar image, and emergency contacts.
              </p>
            </div>

            {saveSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs text-emerald-500 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Your profile changes have been saved successfully!</span>
              </div>
            )}

            {saveError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-xs text-rose-500 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  Full Legal Name
                </label>
                <Input
                  value={formData.full_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="e.g. Johnathan Doe"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Display / Preferred Name
                </label>
                <Input
                  value={formData.display_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="e.g. John D."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-indigo-500" />
                  Contact Phone Number
                </label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="e.g. +1 555-0199"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  Primary Email (Account Identity)
                </label>
                <Input
                  value={profile.email}
                  disabled
                  className="bg-[var(--surface-elevated)] cursor-not-allowed text-[var(--foreground-muted)]"
                />
                <p className="text-[10.5px] text-[var(--foreground-muted)]">
                  Email changes require manager administrative approval.
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Profile Photo URL / Avatar
                </label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Input
                      value={formData.avatar_url || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, avatar_url: e.target.value })
                      }
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                  {formData.avatar_url && (
                    <Avatar
                      src={formData.avatar_url}
                      name={formData.full_name || userFullName}
                      size="sm"
                    />
                  )}
                </div>
                <p className="text-[10.5px] text-[var(--foreground-muted)]">
                  Provide a direct image URL (JPEG/PNG/WebP) for your staff avatar.
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  Residential / Mailing Address
                </label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="e.g. 123 Palm Grove Ave, Apt 4B"
                />
              </div>
            </div>

            {/* Emergency Contacts Section */}
            <div className="border-t border-[var(--border)] pt-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  Emergency Contact Details
                </h3>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                  In case of an operational or medical emergency on property.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Contact Name & Relation
                  </label>
                  <Input
                    value={formData.emergency_contact_name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_name: e.target.value,
                      })
                    }
                    placeholder="e.g. Jane Doe (Spouse)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Contact Emergency Phone
                  </label>
                  <Input
                    value={formData.emergency_contact_phone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_phone: e.target.value,
                      })
                    }
                    placeholder="e.g. +1 555-0188"
                  />
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="border-t border-[var(--border)] pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[var(--foreground-muted)]">
                {isDirty ? (
                  <span className="text-amber-500 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    You have unsaved personal changes.
                  </span>
                ) : (
                  <span>All personal information is up to date.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={!isDirty || saving}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Discard Changes
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isDirty || saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ─── TAB 2: EMPLOYMENT & ORGANIZATION (MANAGER CONTROLLED) ─── */}
      {activeTab === "employment" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-[var(--foreground-muted)]">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  Manager-Controlled Organizational Record
                </p>
                <p className="mt-0.5">
                  Employment designations, roles, employee IDs, departments, and active statuses are administered strictly by Hotel Management & HR. Contact your administrator if any data needs correction.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Employee Code
                </p>
                <p className="text-base font-bold text-[var(--foreground)] font-mono">
                  {employeeCode}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Assigned Department
                </p>
                <p className="text-base font-bold text-[var(--foreground)]">
                  {userDeptName}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Staff Designation
                </p>
                <p className="text-base font-bold text-[var(--foreground)]">
                  {staff?.designation || "Hospitality Associate"}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  System Role
                </p>
                <div className="pt-0.5">
                  <Badge variant="checked_in" showDot={false}>
                    {userRoleName}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Employment Type
                </p>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {staff?.employment_type ? staff.employment_type.replace("_", " ") : "FULL TIME"}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Employment Status
                </p>
                <div className="pt-0.5">
                  <Badge variant="available" showDot={false}>
                    {staff?.employment_status || "ACTIVE"}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Joining Date
                </p>
                <p className="text-base font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[var(--foreground-muted)]" />
                  {staff?.joining_date
                    ? new Date(staff.joining_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Not Recorded"}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Operational Workspace
                </p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Access your daily tasks, room assignments, and service requests.
                  </p>
                  <a
                    href="/staff/my-work"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Open My Work <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Multi-Property Memberships */}
            <div className="border-t border-[var(--border)] pt-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-indigo-500" />
                  Property Memberships ({allProperties.length})
                </h3>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                  Properties where your account holds an active employee membership.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allProperties.map((p) => {
                  const isActiveContext = p.property_id === (membership?.property_id || currentProperty?.property_id);
                  return (
                    <div
                      key={p.property_id}
                      className={cn(
                        "rounded-xl border p-4 flex items-center justify-between transition-all",
                        isActiveContext
                          ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                          : "border-[var(--border)] bg-[var(--surface-elevated)]"
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {p.property_name}
                          </p>
                          {isActiveContext && (
                            <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          Role: <span className="font-medium text-[var(--foreground)]">{p.role_name}</span>
                        </p>
                      </div>

                      <Badge variant="available" showDot={false}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SECURITY & ACCOUNT (SUPABASE AUTH) ─── */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Account & Authentication
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                Manage your credentials and view your authenticated account identity.
              </p>
            </div>

            {/* Identity Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Registered Email
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {profile.email}
                </p>
                <p className="text-[10.5px] text-[var(--foreground-muted)]">
                  Used for sign-in and system notifications.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--foreground-muted)]">
                  Account Status
                </p>
                <div className="pt-0.5 flex items-center gap-2">
                  <Badge variant="available" showDot={false}>
                    {profile.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-[var(--foreground-muted)]">
                    Protected by Supabase Auth
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword} className="border-t border-[var(--border)] pt-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-indigo-500" />
                  Change Password
                </h3>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                  Password must be at least 8 characters long.
                </p>
              </div>

              {passwordSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs text-emerald-500 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Your password has been changed successfully!</span>
                </div>
              )}

              {passwordError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-xs text-rose-500 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={updatingPassword || !newPassword}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {updatingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 4: PERMISSIONS & CAPABILITIES (READ-ONLY) ─── */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-[var(--foreground-muted)]">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  Effective Role Capabilities for {userRoleName}
                </p>
                <p className="mt-0.5">
                  This transparent overview summarizes what actions and operational modules your role is authorized to access at {membership?.property_name || "this property"}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissions.map((p) => (
                <div
                  key={p.key}
                  className={cn(
                    "rounded-xl border p-3.5 flex items-center justify-between gap-3 text-xs transition-colors",
                    p.granted
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-[var(--border)] bg-[var(--surface-elevated)] opacity-60"
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[var(--foreground)]">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      {p.description || `Module: ${p.module}`}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {p.granted ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-md">
                        <Check className="h-3 w-3" /> Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-1 rounded-md">
                        <X className="h-3 w-3" /> Restricted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
