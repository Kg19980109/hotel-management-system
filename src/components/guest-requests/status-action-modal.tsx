"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import {
  staffAcknowledgeGuestRequestAction,
  staffStartGuestRequestAction,
  staffCompleteGuestRequestAction,
  staffCancelGuestRequestAction,
  staffRejectGuestRequestAction,
} from "@/lib/guest-services/actions";
import { Loader2 } from "lucide-react";

export type StatusActionType =
  | "ACKNOWLEDGE"
  | "START"
  | "COMPLETE"
  | "CANCEL"
  | "REJECT";

interface StatusActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: StaffGuestServiceRequest;
  propertyId: string;
  actionType: StatusActionType;
  onSuccess: () => void;
}

export function StatusActionModal({
  isOpen,
  onClose,
  request,
  propertyId,
  actionType,
  onSuccess,
}: StatusActionModalProps) {
  const [guestNotes, setGuestNotes] = React.useState<string>("");
  const [staffNotes, setStaffNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getTitle = () => {
    switch (actionType) {
      case "ACKNOWLEDGE":
        return "Acknowledge Guest Request";
      case "START":
        return "Start Work on Request";
      case "COMPLETE":
        return "Mark Request as Completed";
      case "CANCEL":
        return "Cancel Guest Request";
      case "REJECT":
        return "Decline / Reject Request";
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    let res: { success: boolean; error?: string } = { success: false };

    switch (actionType) {
      case "ACKNOWLEDGE":
        res = await staffAcknowledgeGuestRequestAction(propertyId, request.id, staffNotes || undefined);
        break;
      case "START":
        res = await staffStartGuestRequestAction(propertyId, request.id, staffNotes || undefined);
        break;
      case "COMPLETE":
        res = await staffCompleteGuestRequestAction(
          propertyId,
          request.id,
          guestNotes || undefined,
          staffNotes || undefined
        );
        break;
      case "CANCEL":
        res = await staffCancelGuestRequestAction(propertyId, request.id, staffNotes || undefined);
        break;
      case "REJECT":
        res = await staffRejectGuestRequestAction(propertyId, request.id, staffNotes || undefined);
        break;
    }

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Action failed.");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={getTitle()}
      description={`Update request for "${request.title}" (Room ${request.room?.room_number || "N/A"}).`}
      size="md"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-lg text-sm space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{request.title}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Room {request.room?.room_number} • Current Status: {request.status}
          </p>
        </div>

        {actionType === "COMPLETE" && (
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Message to Guest (Visible in Guest Portal)
            </label>
            <textarea
              rows={2}
              value={guestNotes}
              onChange={(e) => setGuestNotes(e.target.value)}
              placeholder="E.g., Your extra towels have been placed in your room. Enjoy your stay!"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)] resize-none"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            {actionType === "CANCEL" || actionType === "REJECT"
              ? "Reason / Internal Notes"
              : "Internal Staff Notes"}
          </label>
          <textarea
            rows={2}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder="Internal operational note..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)] resize-none"
          />
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={actionType === "CANCEL" || actionType === "REJECT" ? "destructive" : "primary"}
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
