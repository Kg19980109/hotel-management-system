"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DuplicateGuestCandidate } from "@/lib/guests/types";
import { Avatar } from "@/components/ui/avatar";
import { AlertTriangle, UserCheck, ArrowRight, X } from "lucide-react";

interface DuplicateWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: DuplicateGuestCandidate[];
  onSelectExisting: (candidate: DuplicateGuestCandidate) => void;
  onProceedNew: () => void;
  isSubmitting?: boolean;
}

export function DuplicateWarningModal({
  open,
  onOpenChange,
  candidates,
  onSelectExisting,
  onProceedNew,
  isSubmitting,
}: DuplicateWarningModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Possible Duplicate Guest Found"
      description="We found existing guest profile(s) with matching contact information. Choose an existing profile or continue creating a new record."
      size="lg"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3 bg-amber-50 rounded-[var(--radius-lg)] border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Matching records in current property</p>
            <p>
              Reusing an existing profile preserves historical stays, preferences, and booking ledger accuracy.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="p-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white hover:border-[var(--primary)] hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <Avatar name={`${cand.first_name} ${cand.last_name}`} size="md" />
                <div>
                  <div className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                    <span>
                      {cand.first_name} {cand.last_name}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {cand.status}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    {cand.email && <span>{cand.email}</span>}
                    {cand.phone && <span>{cand.phone}</span>}
                    {cand.nationality && <span>{cand.nationality}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {cand.matchReasons.map((reason) => (
                      <span
                        key={reason}
                        className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded"
                      >
                        Matching {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectExisting(cand)}
                className="gap-1.5 shrink-0 text-xs text-indigo-600 hover:text-indigo-800"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Use Existing</span>
              </Button>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-[var(--border)] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs text-slate-500"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onProceedNew}
            disabled={isSubmitting}
            className="gap-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white"
          >
            <span>Proceed Creating New Profile Anyway</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
