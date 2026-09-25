import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import type { RoomDisplay, TrendDirection } from "@/types";

// ============================================================
// KPI WIDGET
// ============================================================

interface KPIWidgetProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: number;
  trendDirection?: TrendDirection;
  trendLabel?: string;
  color?: "primary" | "success" | "warning" | "danger" | "info" | "accent";
  className?: string;
  loading?: boolean;
}

const colorMap = {
  primary: { icon: "bg-[var(--primary-light)] text-[var(--primary)]" },
  success: { icon: "bg-[var(--success-light)] text-[var(--success)]" },
  warning: { icon: "bg-[var(--warning-light)] text-[var(--warning)]" },
  danger: { icon: "bg-[var(--danger-light)] text-[var(--danger)]" },
  info: { icon: "bg-[var(--info-light)] text-[var(--info)]" },
  accent: { icon: "bg-[var(--accent-light)] text-[var(--accent)]" },
};

const KPIWidget = ({
  title,
  value,
  icon,
  trend,
  trendDirection = "neutral",
  trendLabel,
  color = "primary",
  className,
  loading,
}: KPIWidgetProps) => {
  if (loading) {
    return (
      <div className={cn("stayhub-card p-5", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-8 w-20 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const isPositive = trendDirection === "up";
  const isNegative = trendDirection === "down";
  const colors = colorMap[color];

  return (
    <div className={cn("stayhub-card p-5 group", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-[var(--foreground-muted)]">{title}</p>
          <p className="text-kpi mt-1.5 text-[var(--foreground)]">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className={cn(
                  "flex items-center gap-0.5 text-[12px] font-semibold",
                  isPositive ? "text-[var(--success)]" : isNegative ? "text-[var(--danger)]" : "text-[var(--foreground-muted)]"
                )}
              >
                {isPositive && (
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                )}
                {isNegative && (
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    <polyline points="17 18 23 18 23 12" />
                  </svg>
                )}
                {Math.abs(trend)}%
              </div>
              {trendLabel && (
                <span className="text-[11px] text-[var(--foreground-subtle)]">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0", colors.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ROOM CARD
// ============================================================

interface RoomCardProps extends RoomDisplay {
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

const RoomCard = ({
  number,
  type,
  floor,
  status,
  rate,
  imageUrl,
  guestName,
  checkoutDate,
  onClick,
  className,
  compact = false,
}: RoomCardProps) => {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "stayhub-card p-3 w-full text-left flex items-center gap-3",
          onClick && "cursor-pointer hover:shadow-[var(--shadow)]",
          "transition-all duration-200",
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[var(--foreground)]">{number}</span>
            <StatusBadge status={status} size="sm" />
          </div>
          <p className="text-[12px] text-[var(--foreground-muted)] mt-0.5 truncate">{type}</p>
          {guestName && (
            <p className="text-[12px] text-[var(--foreground)] font-medium mt-1 truncate">{guestName}</p>
          )}
        </div>
        {rate && (
          <p className="text-[13px] font-semibold text-[var(--foreground)] shrink-0">
            ₹{rate.toLocaleString()}
          </p>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "stayhub-card overflow-hidden text-left w-full",
        onClick && "cursor-pointer hover:shadow-[var(--shadow-md)]",
        "transition-all duration-200 group",
        className
      )}
    >
      {/* Room image */}
      <div className="relative h-40 bg-slate-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Room ${number}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <StatusBadge status={status} />
        </div>
        {floor !== undefined && (
          <div className="absolute top-2.5 left-2.5 bg-black/40 text-white text-[11px] font-medium rounded px-1.5 py-0.5">
            Floor {floor}
          </div>
        )}
      </div>

      {/* Room info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-semibold text-[var(--foreground)]">Room {number}</p>
            <p className="text-[12px] text-[var(--foreground-muted)] mt-0.5">{type}</p>
          </div>
          {rate && (
            <p className="text-[13px] font-semibold text-[var(--foreground)]">
              ₹{rate.toLocaleString()}
              <span className="text-[11px] font-normal text-[var(--foreground-muted)]">/night</span>
            </p>
          )}
        </div>

        {(guestName || checkoutDate) && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            {guestName && (
              <div className="flex items-center gap-2">
                <Avatar name={guestName} size="xs" />
                <span className="text-[13px] text-[var(--foreground)] font-medium truncate">{guestName}</span>
              </div>
            )}
            {checkoutDate && (
              <p className="text-[12px] text-[var(--foreground-muted)] mt-1.5">
                Checkout: {checkoutDate}
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// ============================================================
// GUEST CARD
// ============================================================

interface GuestCardProps {
  name: string;
  email?: string;
  phone?: string;
  roomNumber?: string;
  isVip?: boolean;
  avatarUrl?: string;
  bookingStatus?: "confirmed" | "checked_in" | "checked_out" | "pending" | "cancelled";
  nationality?: string;
  onClick?: () => void;
  className?: string;
}

const GuestCard = ({
  name,
  email,
  phone,
  roomNumber,
  isVip,
  avatarUrl,
  bookingStatus,
  onClick,
  className,
}: GuestCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "stayhub-card p-4 text-left w-full flex items-start gap-3",
      onClick && "cursor-pointer hover:shadow-[var(--shadow)]",
      "transition-all duration-200",
      className
    )}
  >
    <div className="relative">
      <Avatar name={name} src={avatarUrl} size="md" />
      {isVip && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--accent)] flex items-center justify-center">
          <svg width="8" height="8" fill="white" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-semibold text-[var(--foreground)] truncate">{name}</p>
        {isVip && (
          <span className="text-[10px] font-bold text-[var(--accent-foreground)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded-[var(--radius-xs)] shrink-0">
            VIP
          </span>
        )}
      </div>
      {email && (
        <p className="text-[12px] text-[var(--foreground-muted)] mt-0.5 truncate">{email}</p>
      )}
      {phone && (
        <p className="text-[12px] text-[var(--foreground-muted)] mt-0.5">{phone}</p>
      )}
      {(roomNumber || bookingStatus) && (
        <div className="flex items-center gap-2 mt-2">
          {roomNumber && (
            <span className="text-[11px] font-medium text-[var(--primary)] bg-[var(--primary-subtle)] px-2 py-0.5 rounded-[var(--radius-xs)]">
              Room {roomNumber}
            </span>
          )}
          {bookingStatus && <StatusBadge status={bookingStatus} size="sm" />}
        </div>
      )}
    </div>
  </button>
);

// ============================================================
// BOOKING CARD
// ============================================================

interface BookingCardProps {
  bookingNumber: string;
  guestName: string;
  guestAvatarUrl?: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  childrenCount?: number;
  status: "confirmed" | "pending" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  paymentStatus: "paid" | "pending" | "partial" | "refunded";
  totalAmount?: number;
  onClick?: () => void;
  className?: string;
}

const BookingCard = ({
  bookingNumber,
  guestName,
  guestAvatarUrl,
  roomNumber,
  roomType,
  checkIn,
  checkOut,
  nights,
  adults,
  childrenCount,
  status,
  paymentStatus,
  totalAmount,
  onClick,
  className,
}: BookingCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "stayhub-card p-4 text-left w-full",
      onClick && "cursor-pointer hover:shadow-[var(--shadow)]",
      "transition-all duration-200",
      className
    )}
  >
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={guestName} src={guestAvatarUrl} size="sm" />
        <div>
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{guestName}</p>
          <p className="text-[11px] text-[var(--foreground-muted)]">#{bookingNumber}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusBadge status={paymentStatus} size="sm" />
        <StatusBadge status={status} size="sm" />
      </div>
    </div>

    {/* Details */}
    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
      <div>
        <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-wide">Room</p>
        <p className="text-[13px] font-semibold text-[var(--foreground)] mt-0.5">{roomNumber}</p>
        <p className="text-[11px] text-[var(--foreground-muted)]">{roomType}</p>
      </div>
      <div>
        <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-wide">Check-in</p>
        <p className="text-[13px] font-semibold text-[var(--foreground)] mt-0.5">{checkIn}</p>
        <p className="text-[11px] text-[var(--foreground-muted)]">{nights} nights</p>
      </div>
      <div>
        <p className="text-[11px] text-[var(--foreground-muted)] uppercase tracking-wide">Check-out</p>
        <p className="text-[13px] font-semibold text-[var(--foreground)] mt-0.5">{checkOut}</p>
        <p className="text-[11px] text-[var(--foreground-muted)]">
          {adults} adult{adults > 1 ? "s" : ""}
          {childrenCount ? `, ${childrenCount} child` : ""}
        </p>
      </div>
    </div>

    {totalAmount !== undefined && (
      <div className="mt-3 flex justify-end">
        <p className="text-[14px] font-bold text-[var(--foreground)]">
          ₹{totalAmount.toLocaleString()}
        </p>
      </div>
    )}
  </button>
);

export { KPIWidget, RoomCard, GuestCard, BookingCard };
