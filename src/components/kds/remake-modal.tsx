"use client";

// ============================================================
// STAYHUB KDS REMAKE MODAL COMPONENT (Phase 13)
// ============================================================

import * as React from "react";
import { useState } from "react";
import { Flame, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KitchenTicketItem } from "@/lib/kds/types";

interface RemakeModalProps {
  open: boolean;
  onClose: () => void;
  item: KitchenTicketItem | null;
  onConfirmRemake: (itemId: string, reason: string) => Promise<void>;
}

export function RemakeModal({
  open,
  onClose,
  item,
  onConfirmRemake,
}: RemakeModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setSubmitting(true);
      await onConfirmRemake(item.id, reason.trim());
      setReason("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Item Re-Fire / Remake"
      description={`Send ${item.quantity}× "${item.item_name}" back to the kitchen queue for remaking.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
            Re-firing this item preserves the customer&apos;s historical order and receipt pricing while creating a fresh kitchen production event and incrementing the remake count.
          </p>
        </div>

        <div>
          <label className="block font-semibold text-foreground mb-1">
            Remake Reason <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="e.g. Cold food, incorrect spice level, allergen modification, dropped item..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs h-9"
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !reason.trim()}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
          >
            <Flame className="h-3.5 w-3.5 mr-1.5" />
            {submitting ? "Sending to Kitchen..." : "Confirm Re-Fire"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
