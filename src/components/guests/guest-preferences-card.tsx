"use client";

import * as React from "react";
import { GuestPreference, PreferenceType } from "@/lib/guests/types";
import { addGuestPreferenceAction, deleteGuestPreferenceAction } from "@/lib/guests/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Trash2, HeartHandshake, Bed, DoorOpen, Coffee } from "lucide-react";

interface GuestPreferencesCardProps {
  propertyId: string;
  guestId: string;
  preferences: GuestPreference[];
  onPreferenceChanged: () => void;
  canManage?: boolean;
}

const PREFERENCE_TYPES: { type: PreferenceType; label: string; icon: React.ReactNode }[] = [
  { type: "ROOM", label: "Room / View", icon: <DoorOpen className="h-3.5 w-3.5" /> },
  { type: "BED", label: "Bed Type", icon: <Bed className="h-3.5 w-3.5" /> },
  { type: "FLOOR", label: "Floor Level", icon: <DoorOpen className="h-3.5 w-3.5" /> },
  { type: "DIETARY", label: "Dietary", icon: <Coffee className="h-3.5 w-3.5" /> },
  { type: "PILLOW", label: "Pillow Type", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { type: "COMMUNICATION", label: "Communication", icon: <HeartHandshake className="h-3.5 w-3.5" /> },
  { type: "GENERAL", label: "General", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export function GuestPreferencesCard({
  propertyId,
  guestId,
  preferences,
  onPreferenceChanged,
  canManage = true,
}: GuestPreferencesCardProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [type, setType] = React.useState<PreferenceType>("ROOM");
  const [value, setValue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await addGuestPreferenceAction(propertyId, guestId, type, value, notes);
      if (!res.success) {
        setError(res.error || "Failed to add preference.");
        return;
      }
      setModalOpen(false);
      setValue("");
      setNotes("");
      onPreferenceChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add preference.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (preferenceId: string) => {
    try {
      await deleteGuestPreferenceAction(propertyId, guestId, preferenceId);
      onPreferenceChanged();
    } catch (err) {
      console.error("Delete preference error:", err);
    }
  };

  return (
    <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Stay Preferences</h3>
        </div>

        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Preference</span>
          </Button>
        )}
      </div>

      {preferences.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {preferences.map((pref) => {
            const typeConfig = PREFERENCE_TYPES.find((t) => t.type === pref.preference_type);

            return (
              <div
                key={pref.id}
                className="p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-slate-50/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    {typeConfig?.icon}
                    <span className="uppercase text-[10px] tracking-wider text-slate-500">
                      {typeConfig?.label || pref.preference_type}
                    </span>
                  </div>
                  <div className="font-medium text-slate-900 text-sm">{pref.preference_value}</div>
                  {pref.notes && <p className="text-[11px] text-slate-500">{pref.notes}</p>}
                </div>

                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pref.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                    title="Remove preference"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-[var(--radius-lg)] border border-dashed border-slate-200">
          No stay preferences recorded for this guest.
        </div>
      )}

      {/* Add Preference Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Guest Preference"
        description="Record a guest requirement or room preference."
      >
        <form onSubmit={handleAddPreference} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PreferenceType)}
              className="w-full text-xs h-9 rounded-[var(--radius-md)] border border-[var(--border)] px-3 bg-white"
            >
              {PREFERENCE_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Preference Details</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. High floor, Away from elevator, Feather pillows"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Additional Notes (Optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational details for front desk / housekeeping"
              className="text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs bg-[var(--primary)] text-white"
            >
              {submitting ? "Saving..." : "Save Preference"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
