"use client";

// ============================================================
// STAYHUB ONLINE BOOKING MANAGEMENT (Phase 21)
// Authenticated configuration view for online booking
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { savePropertyOnlineBookingSettingsAction } from "@/lib/booking/actions";
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  DoorOpen,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function OnlineBookingSettingsPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand Hotel";
  const propertySlug = currentProperty?.property_slug || "stayhub-grand";

  const [isEnabled, setIsEnabled] = React.useState(true);
  const [description, setDescription] = React.useState(
    "Experience luxury hospitality, curated dining, and world-class suites at StayHub Grand."
  );
  const [phone, setPhone] = React.useState("+1 (555) 234-5678");
  const [email, setEmail] = React.useState("reservations@stayhubgrand.com");
  const [cancellationPolicy, setCancellationPolicy] = React.useState(
    "Free cancellation up to 48 hours prior to check-in. Cancellations within 48 hours are subject to a 1-night charge."
  );
  const [bookingTerms, setBookingTerms] = React.useState(
    "Guests must be at least 18 years old to check in. Valid photo identification and credit card are required upon arrival."
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const publicUrl = `/book/${propertySlug}`;

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await savePropertyOnlineBookingSettingsAction(propertyId, {
        isEnabled,
        publicDescription: description,
        publicPhone: phone,
        publicEmail: email,
        cancellationPolicy,
        bookingTerms,
      });
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Online Booking Engine
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Direct Booking
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure your direct public booking portal, availability rules, and guest policies for{" "}
            <span className="font-medium text-slate-800">{propertyName}</span>
          </p>
        </div>

        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <span>Preview Booking Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Live Direct Booking URL Banner */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Globe className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
              Public Customer URL
            </span>
            <p className="text-sm font-mono text-white font-medium mt-0.5">
              https://stayhub.app{publicUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30 text-xs">
            Live & Active
          </Badge>
        </div>
      </div>

      {/* Key Architectural Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
            <span>Unified Reservation Ledger</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Online bookings automatically create reservations in StayHub with <code>source = &apos;ONLINE_BOOKING&apos;</code>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <DoorOpen className="w-4 h-4 text-emerald-600" />
            <span>Room Type Allocation</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Guests book room types. Physical room numbers are allocated upon check-in at the front desk.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Anti-Double Booking</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Server-side overlap calculations prevent simultaneous overbooking across all channels.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Direct Booking Configuration</h2>
            <p className="text-xs text-slate-500">Manage public property description, policies, and contact information.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Online Booking Active</span>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Public Contact Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 000-0000"
              className="text-xs bg-slate-50 rounded-xl h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Public Reservations Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. reservations@hotel.com"
              className="text-xs bg-slate-50 rounded-xl h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Public Property Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Write a welcoming description of your hotel..."
            className="text-xs bg-slate-50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Cancellation Policy</label>
          <Textarea
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            rows={2}
            placeholder="Specify refund and cancellation timeframes..."
            className="text-xs bg-slate-50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Terms & Conditions</label>
          <Textarea
            value={bookingTerms}
            onChange={(e) => setBookingTerms(e.target.value)}
            rows={2}
            placeholder="Hotel check-in requirements and policies..."
            className="text-xs bg-slate-50 rounded-xl"
          />
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Online booking settings saved successfully.</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 gap-1.5 shadow-xs"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
