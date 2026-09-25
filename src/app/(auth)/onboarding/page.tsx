"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  Hotel,
  Building2,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingFormData {
  fullName: string;
  phone: string;
  // Org
  orgName: string;
  orgEmail: string;
  orgPhone: string;
  // Hotel
  hotelName: string;
  hotelCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  hotelPhone: string;
  hotelEmail: string;
  timezone: string;
  currency: string;
  // Operations
  checkInTime: string;
  checkOutTime: string;
}

const initialFormData: OnboardingFormData = {
  fullName: "",
  phone: "",
  orgName: "",
  orgEmail: "",
  orgPhone: "",
  hotelName: "",
  hotelCode: "PROP-1",
  addressLine1: "",
  addressLine2: "",
  city: "Kolkata",
  state: "West Bengal",
  postalCode: "700016",
  country: "India",
  hotelPhone: "",
  hotelEmail: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  checkInTime: "14:00",
  checkOutTime: "11:00",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<number>(1);
  const [formData, setFormData] = React.useState<OnboardingFormData>(initialFormData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  // Pre-fill user details if logged in
  React.useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setFormData((prev) => ({
          ...prev,
          fullName: user.user_metadata?.full_name || "",
          orgEmail: user.email || "",
          hotelEmail: user.email || "",
        }));
      }
    }
    loadUser();
  }, [supabase]);

  const handleChange = (field: keyof OnboardingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setError(null);

    // Step validations
    if (step === 2) {
      if (!formData.orgName.trim()) {
        setError("Please enter your Organization / Company name.");
        return;
      }
    }

    if (step === 3) {
      if (!formData.hotelName.trim() || !formData.addressLine1.trim() || !formData.city.trim()) {
        setError("Please complete all required hotel location details.");
        return;
      }
    }

    setStep((s) => Math.min(6, s + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleComplete = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("create_hotel_onboarding", {
        p_full_name: formData.fullName,
        p_phone: formData.phone || null,
        p_org_name: formData.orgName,
        p_org_email: formData.orgEmail || null,
        p_org_phone: formData.orgPhone || null,
        p_hotel_name: formData.hotelName,
        p_hotel_code: formData.hotelCode || "PROP-1",
        p_address_line_1: formData.addressLine1,
        p_address_line_2: formData.addressLine2 || null,
        p_city: formData.city,
        p_state: formData.state,
        p_postal_code: formData.postalCode,
        p_country: formData.country,
        p_hotel_phone: formData.hotelPhone || null,
        p_hotel_email: formData.hotelEmail || null,
        p_timezone: formData.timezone,
        p_currency: formData.currency,
        p_check_in_time: formData.checkInTime,
        p_check_out_time: formData.checkOutTime,
      });

      if (rpcError) {
        setError(rpcError.message || "Failed to initialize organization and hotel.");
        setLoading(false);
        return;
      }

      if (data && data.success) {
        setStep(6);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during onboarding.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      {/* Step Progress Pills */}
      <div className="flex items-center justify-between mb-8 px-2">
        {[
          { num: 1, title: "Welcome" },
          { num: 2, title: "Organization" },
          { num: 3, title: "Property" },
          { num: 4, title: "Operations" },
          { num: 5, title: "Review" },
          { num: 6, title: "Complete" },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all",
                step === s.num
                  ? "bg-[var(--primary)] text-white shadow-md ring-4 ring-indigo-100"
                  : step > s.num
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
            </div>
            <span className="hidden sm:block text-[11px] font-medium text-[var(--foreground-muted)] mt-1.5">
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {/* Card Content */}
      <div className="stayhub-card p-6 sm:p-10 shadow-[var(--shadow-xl)] bg-white rounded-[var(--radius-xl)] border border-[var(--border)] animate-in fade-in duration-200">
        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-[var(--radius)] bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-start gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="text-center py-6">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-[var(--primary)] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-[24px] font-bold text-[var(--foreground)] tracking-tight">
              Welcome to StayHub Hospitality OS
            </h1>
            <p className="text-[14px] text-[var(--foreground-muted)] mt-2 max-w-md mx-auto leading-relaxed">
              Let&apos;s configure your organization and primary hotel property. This takes less than 2 minutes.
            </p>

            <div className="mt-8 max-w-sm mx-auto text-left space-y-4">
              <div>
                <Label htmlFor="fullName" required>
                  Your Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Koushik Dey"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  placeholder="+91 98300 12345"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="mt-8">
              <Button
                variant="primary"
                onClick={handleNext}
                className="w-full max-w-sm h-11 text-[14px] font-semibold shadow-md"
              >
                Begin Setup <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: ORGANIZATION INFORMATION */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
                <Building2 className="h-4 w-4" /> Step 2 of 5
              </div>
              <h2 className="text-[20px] font-bold text-[var(--foreground)]">
                Organization Information
              </h2>
              <p className="text-[13px] text-[var(--foreground-muted)] mt-1">
                The corporate holding group or hospitality company owning your hotels.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName" required>
                  Organization / Company Name
                </Label>
                <Input
                  id="orgName"
                  placeholder="e.g. Royal Heritage Hospitality Group"
                  value={formData.orgName}
                  onChange={(e) => handleChange("orgName", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgEmail">Contact Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    placeholder="contact@royalheritage.com"
                    value={formData.orgEmail}
                    onChange={(e) => handleChange("orgEmail", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="orgPhone">Corporate Phone</Label>
                  <Input
                    id="orgPhone"
                    placeholder="+91 33 2289 0000"
                    value={formData.orgPhone}
                    onChange={(e) => handleChange("orgPhone", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--border)]">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Continue <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: HOTEL INFORMATION */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
                <Hotel className="h-4 w-4" /> Step 3 of 5
              </div>
              <h2 className="text-[20px] font-bold text-[var(--foreground)]">
                Primary Hotel Details
              </h2>
              <p className="text-[13px] text-[var(--foreground-muted)] mt-1">
                Configure your first hotel property profile and location.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="hotelName" required>
                    Hotel / Resort Name
                  </Label>
                  <Input
                    id="hotelName"
                    placeholder="e.g. Hotel Royal Kolkata"
                    value={formData.hotelName}
                    onChange={(e) => handleChange("hotelName", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="hotelCode">Property Code</Label>
                  <Input
                    id="hotelCode"
                    placeholder="HRK-1"
                    value={formData.hotelCode}
                    onChange={(e) => handleChange("hotelCode", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="addressLine1" required>
                  Street Address
                </Label>
                <Input
                  id="addressLine1"
                  placeholder="12 Park Street"
                  value={formData.addressLine1}
                  onChange={(e) => handleChange("addressLine1", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="city" required>
                    City
                  </Label>
                  <Input
                    id="city"
                    placeholder="Kolkata"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="state" required>
                    State
                  </Label>
                  <Input
                    id="state"
                    placeholder="West Bengal"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" required>
                    Postal Code
                  </Label>
                  <Input
                    id="postalCode"
                    placeholder="700016"
                    value={formData.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="country" required>
                    Country
                  </Label>
                  <Input
                    id="country"
                    placeholder="India"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hotelPhone">Hotel Reception Phone</Label>
                  <Input
                    id="hotelPhone"
                    placeholder="+91 33 4000 8000"
                    value={formData.hotelPhone}
                    onChange={(e) => handleChange("hotelPhone", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="hotelEmail">Reservations Email</Label>
                  <Input
                    id="hotelEmail"
                    placeholder="reservations@hotelroyal.com"
                    value={formData.hotelEmail}
                    onChange={(e) => handleChange("hotelEmail", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--border)]">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Continue <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: OPERATING SETTINGS */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
                <Clock className="h-4 w-4" /> Step 4 of 5
              </div>
              <h2 className="text-[20px] font-bold text-[var(--foreground)]">
                Operating Settings
              </h2>
              <p className="text-[13px] text-[var(--foreground-muted)] mt-1">
                Standard check-in and check-out schedule for front desk operations.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkInTime" required>
                    Standard Check-in Time
                  </Label>
                  <Input
                    id="checkInTime"
                    placeholder="14:00"
                    value={formData.checkInTime}
                    onChange={(e) => handleChange("checkInTime", e.target.value)}
                    className="h-10"
                  />
                  <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">24-hour format (e.g. 14:00 for 2:00 PM)</p>
                </div>
                <div>
                  <Label htmlFor="checkOutTime" required>
                    Standard Check-out Time
                  </Label>
                  <Input
                    id="checkOutTime"
                    placeholder="11:00"
                    value={formData.checkOutTime}
                    onChange={(e) => handleChange("checkOutTime", e.target.value)}
                    className="h-10"
                  />
                  <p className="text-[11px] text-[var(--foreground-subtle)] mt-1">24-hour format (e.g. 11:00 for 11:00 AM)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency Code</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--border)]">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Review Details <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
                <CheckCircle2 className="h-4 w-4" /> Step 5 of 5
              </div>
              <h2 className="text-[20px] font-bold text-[var(--foreground)]">
                Review & Confirm Setup
              </h2>
              <p className="text-[13px] text-[var(--foreground-muted)] mt-1">
                Verify your organization and property configuration before activating your account.
              </p>
            </div>

            <div className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5 border border-[var(--border)]">
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Organization
                  </p>
                  <p className="text-[15px] font-bold text-[var(--foreground)] mt-0.5">
                    {formData.orgName}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  New Group
                </span>
              </div>

              <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Primary Property
                  </p>
                  <p className="text-[15px] font-bold text-[var(--foreground)] mt-0.5">
                    {formData.hotelName} ({formData.hotelCode})
                  </p>
                  <p className="text-[12px] text-[var(--foreground-muted)] flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {formData.addressLine1}, {formData.city}, {formData.state} - {formData.postalCode}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {formData.currency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Your Assigned Role
                  </p>
                  <p className="text-[14px] font-semibold text-[var(--primary)] mt-0.5">
                    Hotel Owner (Primary Administrator)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Operating Schedule
                  </p>
                  <p className="text-[12px] text-[var(--foreground)] mt-0.5">
                    In: {formData.checkInTime} · Out: {formData.checkOutTime}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--border)]">
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={loading}
                disabled={loading}
                className="font-semibold shadow-md px-6"
              >
                Activate Hotel & Launch Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: COMPLETE */}
        {step === 6 && (
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-[22px] font-bold text-[var(--foreground)]">
              Onboarding Complete!
            </h2>
            <p className="text-[14px] text-[var(--foreground-muted)] mt-2 max-w-sm mx-auto leading-relaxed">
              Your organization and hotel property have been established with full security and role assignments.
            </p>

            <div className="mt-8">
              <Button
                variant="primary"
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="h-11 px-8 font-semibold shadow-md text-[14px]"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
