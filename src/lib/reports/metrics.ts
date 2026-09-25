// ============================================================
// STAYHUB REPORTING METRIC CALCULATIONS & FORMULAS (Phase 19)
// ============================================================

import type { ComparisonMetric, DateRangePreset } from "./types";

/**
 * Calculate Hotel Room Occupancy Percentage.
 * Formula: (Occupied Room Nights / Sellable Room Nights) * 100
 * Out of Order (OOO) and Out of Service (OOS) rooms are excluded from sellable rooms.
 */
export function calculateOccupancyRate(
  occupiedRoomNights: number,
  sellableRoomNights: number
): number {
  if (sellableRoomNights <= 0) return 0;
  const rate = (occupiedRoomNights / sellableRoomNights) * 100;
  return Number(Math.min(100, Math.max(0, rate)).toFixed(2));
}

/**
 * Calculate Average Daily Rate (ADR).
 * Formula: Room Revenue / Room Sold Nights
 * Strictly includes only authoritative room charges (excludes F&B, taxes, other fees).
 */
export function calculateADR(
  roomRevenue: number,
  roomsSoldNights: number
): number {
  if (roomsSoldNights <= 0) return 0;
  return Number((roomRevenue / roomsSoldNights).toFixed(2));
}

/**
 * Calculate Revenue Per Available Room (RevPAR).
 * Formula: Room Revenue / Available (Sellable) Room Nights
 * Or: ADR * (Occupancy Rate / 100)
 */
export function calculateRevPAR(
  roomRevenue: number,
  availableRoomNights: number
): number {
  if (availableRoomNights <= 0) return 0;
  return Number((roomRevenue / availableRoomNights).toFixed(2));
}

/**
 * Calculate Average Length of Stay (ALOS) in nights.
 * Formula: Total Room Nights / Total Completed Stays or Bookings
 */
export function calculateALOS(
  totalNights: number,
  totalBookings: number
): number {
  if (totalBookings <= 0) return 0;
  return Number((totalNights / totalBookings).toFixed(1));
}

/**
 * Calculate Booking Lead Time in days.
 * Formula: Sum of (CheckInDate - BookingCreationDate in days) / Total Bookings
 */
export function calculateLeadTime(
  totalLeadDays: number,
  totalBookings: number
): number {
  if (totalBookings <= 0) return 0;
  return Number((totalLeadDays / totalBookings).toFixed(1));
}

/**
 * Calculate Net Revenue.
 * Formula: Gross Charges - Discounts
 * Note: Taxes are liabilities/pass-through and payments are cash settlements, not revenue.
 */
export function calculateNetRevenue(
  grossCharges: number,
  discounts: number
): number {
  return Number(Math.max(0, grossCharges - discounts).toFixed(2));
}

/**
 * Calculate Staff Attendance Rate.
 * Formula: (Present Staff Shifts / Total Scheduled Shifts) * 100
 */
export function calculateAttendanceRate(
  presentCount: number,
  scheduledCount: number
): number {
  if (scheduledCount <= 0) return 0;
  return Number(((presentCount / scheduledCount) * 100).toFixed(2));
}

/**
 * Calculate Housekeeping Inspection Pass Rate.
 * Formula: (Passed Inspections / Total Inspections) * 100
 */
export function calculateInspectionPassRate(
  passedCount: number,
  totalInspections: number
): number {
  if (totalInspections <= 0) return 0;
  return Number(((passedCount / totalInspections) * 100).toFixed(2));
}

/**
 * Calculate Period Comparison Metrics safely.
 * Handles zero previous base gracefully with "N/A" instead of Infinity or misleading percentages.
 */
export function calculateComparison(
  current: number,
  previous?: number
): ComparisonMetric<number> {
  const curr = Number(current || 0);

  if (previous === undefined || previous === null) {
    return {
      current: curr,
      absDiff: 0,
      pctDiff: null,
      displayPctDiff: "N/A",
      trend: "neutral",
    };
  }

  const prev = Number(previous);
  const absDiff = Number((curr - prev).toFixed(2));

  if (prev === 0) {
    return {
      current: curr,
      previous: prev,
      absDiff,
      pctDiff: null,
      displayPctDiff: curr === 0 ? "0.0%" : "N/A",
      trend: curr > 0 ? "up" : curr < 0 ? "down" : "neutral",
    };
  }

  const pctDiff = Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
  const prefix = pctDiff > 0 ? "+" : "";
  const displayPctDiff = `${prefix}${pctDiff.toFixed(1)}%`;
  const trend = pctDiff > 0 ? "up" : pctDiff < 0 ? "down" : "neutral";

  return {
    current: curr,
    previous: prev,
    absDiff,
    pctDiff,
    displayPctDiff,
    trend,
  };
}

/**
 * Get date range start/end and prior comparison boundaries respecting hotel timezone.
 */
export function getDateRangeBoundaries(
  preset: DateRangePreset = "LAST_30_DAYS",
  timezone = "Asia/Kolkata",
  customStart?: string,
  customEnd?: string
): {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
} {
  // Use property timezone to determine "today"
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = formatter.format(now); // "YYYY-MM-DD"
  const todayDate = new Date(`${todayStr}T00:00:00Z`);

  function formatDate(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  function addDays(d: Date, days: number): Date {
    const res = new Date(d);
    res.setUTCDate(res.getUTCDate() + days);
    return res;
  }

  let start: Date;
  let end: Date;

  switch (preset) {
    case "TODAY":
      start = todayDate;
      end = todayDate;
      break;

    case "YESTERDAY":
      start = addDays(todayDate, -1);
      end = addDays(todayDate, -1);
      break;

    case "LAST_7_DAYS":
      start = addDays(todayDate, -6);
      end = todayDate;
      break;

    case "THIS_WEEK": {
      const day = todayDate.getUTCDay(); // 0 is Sun, 1 is Mon
      const diffToMon = day === 0 ? -6 : 1 - day;
      start = addDays(todayDate, diffToMon);
      end = todayDate;
      break;
    }

    case "THIS_MONTH": {
      const parts = todayStr.split("-");
      start = new Date(`${parts[0]}-${parts[1]}-01T00:00:00Z`);
      end = todayDate;
      break;
    }

    case "LAST_MONTH": {
      const year = todayDate.getUTCFullYear();
      const month = todayDate.getUTCMonth(); // 0-indexed
      const lastMonthYear = month === 0 ? year - 1 : year;
      const lastMonth = month === 0 ? 12 : month;
      const lmStr = lastMonth < 10 ? `0${lastMonth}` : `${lastMonth}`;
      start = new Date(`${lastMonthYear}-${lmStr}-01T00:00:00Z`);
      const lastDay = new Date(Date.UTC(lastMonthYear, lastMonth, 0)).getUTCDate();
      end = new Date(`${lastMonthYear}-${lmStr}-${lastDay}T00:00:00Z`);
      break;
    }

    case "THIS_QUARTER": {
      const month = todayDate.getUTCMonth();
      const qStartMonth = Math.floor(month / 3) * 3 + 1;
      const qStr = qStartMonth < 10 ? `0${qStartMonth}` : `${qStartMonth}`;
      start = new Date(`${todayDate.getUTCFullYear()}-${qStr}-01T00:00:00Z`);
      end = todayDate;
      break;
    }

    case "THIS_YEAR": {
      start = new Date(`${todayDate.getUTCFullYear()}-01-01T00:00:00Z`);
      end = todayDate;
      break;
    }

    case "CUSTOM": {
      if (customStart && customEnd) {
        start = new Date(`${customStart}T00:00:00Z`);
        end = new Date(`${customEnd}T00:00:00Z`);
      } else {
        start = addDays(todayDate, -29);
        end = todayDate;
      }
      break;
    }

    case "LAST_30_DAYS":
    default:
      start = addDays(todayDate, -29);
      end = todayDate;
      break;
  }

  const startDate = formatDate(start);
  const endDate = formatDate(end);

  // Compute duration in days
  const durationDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(durationDays - 1));

  return {
    startDate,
    endDate,
    previousStartDate: formatDate(prevStart),
    previousEndDate: formatDate(prevEnd),
  };
}
