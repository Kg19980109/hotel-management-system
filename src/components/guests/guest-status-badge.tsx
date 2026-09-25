"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { GuestStatus } from "@/lib/guests/types";
import { CheckCircle2, AlertCircle, Ban, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestStatusBadgeProps {
  status: GuestStatus | string;
  className?: string;
  isReturning?: boolean;
}

export function GuestStatusBadge({ status, className, isReturning }: GuestStatusBadgeProps) {
  const normStatus = (status || "").toUpperCase();

  let label = normStatus;
  let customStyle = "bg-slate-100 text-slate-700 border-slate-300";
  let icon = <CheckCircle2 className="h-3 w-3 mr-1" />;

  switch (normStatus) {
    case "ACTIVE":
      label = "Active";
      customStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />;
      break;
    case "INACTIVE":
      label = "Inactive";
      customStyle = "bg-slate-100 text-slate-600 border-slate-300";
      icon = <AlertCircle className="h-3 w-3 mr-1 text-slate-500" />;
      break;
    case "BLOCKED":
      label = "Blocked";
      customStyle = "bg-rose-50 text-rose-700 border-rose-200";
      icon = <Ban className="h-3 w-3 mr-1 text-rose-600" />;
      break;
    default:
      label = status;
      break;
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge
        showDot={false}
        className={cn("px-2 py-0.5 text-[11px] font-semibold flex items-center border", customStyle, className)}
      >
        {icon}
        <span>{label}</span>
      </Badge>

      {isReturning && (
        <Badge
          showDot={false}
          className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 flex items-center"
        >
          <Sparkles className="h-2.5 w-2.5 mr-0.5 text-amber-600" />
          <span>Returning</span>
        </Badge>
      )}
    </div>
  );
}
