"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CreateGuestInput,
  GuestCRM,
  GuestStatus,
  IDDocumentType,
  DuplicateGuestCandidate,
} from "@/lib/guests/types";
import { createGuestAction, updateGuestAction } from "@/lib/guests/actions";
import { checkDuplicateGuests } from "@/lib/guests/queries";
import { createClient } from "@/lib/supabase/client";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DuplicateWarningModal } from "./duplicate-warning-modal";
import {
  User,
  Phone,
  MapPin,
  FileCheck,
  Building,
  Save,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface GuestFormProps {
  propertyId: string;
  initialData?: GuestCRM | null;
  mode?: "create" | "edit";
  onSuccess?: (guestId: string) => void;
  onCancel?: () => void;
}

export function GuestForm({
  propertyId,
  initialData,
  mode = "create",
  onSuccess,
  onCancel,
}: GuestFormProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  // Form State
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [firstName, setFirstName] = React.useState(initialData?.first_name || "");
  const [middleName, setMiddleName] = React.useState(initialData?.middle_name || "");
  const [lastName, setLastName] = React.useState(initialData?.last_name || "");
  const [preferredName, setPreferredName] = React.useState(initialData?.preferred_name || "");
  const [gender, setGender] = React.useState(initialData?.gender || "");
  const [dateOfBirth, setDateOfBirth] = React.useState(initialData?.date_of_birth || "");
  const [nationality, setNationality] = React.useState(initialData?.nationality || "");
  const [preferredLanguage, setPreferredLanguage] = React.useState(initialData?.preferred_language || "en");

  // Contact
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [phone, setPhone] = React.useState(initialData?.phone || "");
  const [alternatePhone, setAlternatePhone] = React.useState(initialData?.alternate_phone || "");

  // Address
  const [addressLine1, setAddressLine1] = React.useState(initialData?.address_line_1 || "");
  const [addressLine2, setAddressLine2] = React.useState(initialData?.address_line_2 || "");
  const [city, setCity] = React.useState(initialData?.city || "");
  const [state, setState] = React.useState(initialData?.state || "");
  const [postalCode, setPostalCode] = React.useState(initialData?.postal_code || "");
  const [country, setCountry] = React.useState(initialData?.country || "India");

  // Identity Document
  const [idDocumentType, setIdDocumentType] = React.useState<IDDocumentType | "">(
    initialData?.id_document_type || ""
  );
  const [idDocumentNumber, setIdDocumentNumber] = React.useState(initialData?.id_document_number || "");
  const [idDocumentCountry, setIdDocumentCountry] = React.useState(initialData?.id_document_country || "");

  // Business
  const [companyName, setCompanyName] = React.useState(initialData?.company_name || "");
  const [jobTitle, setJobTitle] = React.useState(initialData?.job_title || "");

  // Preferences & Status
  const [marketingConsent, setMarketingConsent] = React.useState(initialData?.marketing_consent || false);
  const [notes, setNotes] = React.useState(initialData?.notes || "");
  const [status, setStatus] = React.useState<GuestStatus>(initialData?.status || "ACTIVE");

  // Submission & Duplicate Modal State
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = React.useState<DuplicateGuestCandidate[]>([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and Last name are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // If creating, check for duplicate candidates first
    if (mode === "create") {
      try {
        const candidates = await checkDuplicateGuests(supabase, propertyId, {
          email,
          phone,
          firstName,
          lastName,
        });

        if (candidates.length > 0) {
          setDuplicateCandidates(candidates);
          setDuplicateModalOpen(true);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Duplicate check error:", err);
      }
    }

    await executeSave();
  };

  const executeSave = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "create") {
        const input: CreateGuestInput = {
          propertyId,
          title: title || undefined,
          firstName,
          middleName: middleName || undefined,
          lastName,
          preferredName: preferredName || undefined,
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationality || undefined,
          preferredLanguage,
          email: email || undefined,
          phone: phone || undefined,
          alternatePhone: alternatePhone || undefined,
          addressLine1: addressLine1 || undefined,
          addressLine2: addressLine2 || undefined,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
          country: country || undefined,
          idDocumentType: (idDocumentType as IDDocumentType) || undefined,
          idDocumentNumber: idDocumentNumber || undefined,
          idDocumentCountry: idDocumentCountry || undefined,
          companyName: companyName || undefined,
          jobTitle: jobTitle || undefined,
          marketingConsent,
          notes: notes || undefined,
          status,
        };

        const res = await createGuestAction(input);
        if (!res.success) {
          setError(res.error || "Failed to create guest profile.");
          setSubmitting(false);
          return;
        }

        if (onSuccess) {
          onSuccess(res.data!.guestId);
        } else {
          router.push(`/guests/${res.data!.guestId}`);
        }
      } else {
        const input = {
          id: initialData!.id,
          propertyId,
          title: title || undefined,
          firstName,
          middleName: middleName || undefined,
          lastName,
          preferredName: preferredName || undefined,
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationality || undefined,
          preferredLanguage,
          email: email || undefined,
          phone: phone || undefined,
          alternatePhone: alternatePhone || undefined,
          addressLine1: addressLine1 || undefined,
          addressLine2: addressLine2 || undefined,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
          country: country || undefined,
          idDocumentType: (idDocumentType as IDDocumentType) || undefined,
          idDocumentNumber: idDocumentNumber || undefined,
          idDocumentCountry: idDocumentCountry || undefined,
          companyName: companyName || undefined,
          jobTitle: jobTitle || undefined,
          marketingConsent,
          notes: notes || undefined,
          status,
        };

        const res = await updateGuestAction(input);
        if (!res.success) {
          setError(res.error || "Failed to update guest profile.");
          setSubmitting(false);
          return;
        }

        if (onSuccess) {
          onSuccess(initialData!.id);
        } else {
          router.push(`/guests/${initialData!.id}`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectExistingCandidate = (candidate: DuplicateGuestCandidate) => {
    setDuplicateModalOpen(false);
    if (onSuccess) {
      onSuccess(candidate.id);
    } else {
      router.push(`/guests/${candidate.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius-lg)] text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* 1. Personal Information */}
      <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <User className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Title</label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 bg-white"
            >
              <option value="">None</option>
              <option value="Mr.">Mr.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Ms.">Ms.</option>
              <option value="Dr.">Dr.</option>
              <option value="Prof.">Prof.</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              First Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Aarav"
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Middle Name</label>
            <Input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Optional"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Sharma"
              required
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Preferred Name</label>
            <Input
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Nickname"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full text-xs h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 bg-white"
            >
              <option value="">Not Specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="NON_BINARY">Non-Binary</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Date of Birth</label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Nationality</label>
            <Input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="e.g. Indian, American"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Preferred Language</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full text-xs h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 bg-white"
            >
              <option value="en">English (en)</option>
              <option value="hi">Hindi (hi)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="ar">Arabic (ar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Contact Information */}
      <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <Phone className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Contact Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Phone Number</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Alternate Phone</label>
            <Input
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              placeholder="Emergency or Secondary"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Address Information */}
      <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <MapPin className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Residential / Billing Address</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Address Line 1</label>
            <Input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street name & number"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Address Line 2</label>
            <Input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apt, suite, or building"
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">City</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">State / Province</label>
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Postal Code</label>
            <Input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="e.g. 400001"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Country</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* 4. Identity Document & KYC */}
      <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <FileCheck className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Identity Documentation</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Document Type</label>
            <select
              value={idDocumentType}
              onChange={(e) => setIdDocumentType(e.target.value as IDDocumentType)}
              className="w-full text-xs h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 bg-white"
            >
              <option value="">None / Not Provided</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
              <option value="NATIONAL_ID">National ID / Aadhaar</option>
              <option value="OTHER">Other Official ID</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Document Number</label>
            <Input
              value={idDocumentNumber}
              onChange={(e) => setIdDocumentNumber(e.target.value)}
              placeholder="e.g. Z1234567"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Issuing Country</label>
            <Input
              value={idDocumentCountry}
              onChange={(e) => setIdDocumentCountry(e.target.value)}
              placeholder="e.g. India"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* 5. Business & Status */}
      <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <Building className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Corporate Details & Status</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Company Name</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google, Reliance"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Job Title</label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Director of Operations"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Guest Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GuestStatus)}
              className="w-full text-xs h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 bg-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">General Notes / Remarks</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational remarks or guest profile notes..."
              rows={2}
              className="text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span>Guest provided marketing communications consent (promotions & newsletters)</span>
          </label>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel || (() => router.back())}
          className="text-xs gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cancel</span>
        </Button>

        <Button
          type="submit"
          disabled={submitting}
          className="text-xs gap-1.5 bg-[var(--primary)] text-white px-5"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>{mode === "create" ? "Create Guest Profile" : "Save Changes"}</span>
            </>
          )}
        </Button>
      </div>

      {/* Duplicate Candidate Modal */}
      <DuplicateWarningModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        candidates={duplicateCandidates}
        onSelectExisting={handleSelectExistingCandidate}
        onProceedNew={async () => {
          setDuplicateModalOpen(false);
          await executeSave();
        }}
        isSubmitting={submitting}
      />
    </form>
  );
}
