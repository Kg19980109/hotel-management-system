/**
 * STAYHUB - Dashboard Formatters
 * Phase 5: Real Hotel Dashboard & Metrics Engine
 * 
 * Property-aware currency and timezone formatters.
 */

/**
 * Format currency amount based on the hotel's configured currency code.
 * Example:
 *   formatCurrency(2500, "INR") -> "₹2,500"
 *   formatCurrency(150, "USD") -> "$150"
 *   formatCurrency(500, "AED") -> "AED 500"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "INR",
  options?: { compact?: boolean }
): string {
  const safeCode = (currencyCode || "INR").trim().toUpperCase();

  try {
    const formatter = new Intl.NumberFormat(getLocaleForCurrency(safeCode), {
      style: "currency",
      currency: safeCode,
      notation: options?.compact ? "compact" : "standard",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      minimumFractionDigits: 0,
    });

    return formatter.format(amount);
  } catch {
    // Graceful fallback if currency code is unassigned or invalid
    const symbolMap: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "AED ",
      SGD: "S$",
      AUD: "A$",
      CAD: "CA$",
      JPY: "¥",
      THB: "฿",
    };
    const symbol = symbolMap[safeCode] || `${safeCode} `;
    return `${symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Get recommended locale for specific currency code
 */
function getLocaleForCurrency(currencyCode: string): string {
  switch (currencyCode) {
    case "INR":
      return "en-IN";
    case "USD":
      return "en-US";
    case "EUR":
      return "de-DE";
    case "GBP":
      return "en-GB";
    case "AED":
      return "en-AE";
    case "SGD":
      return "en-SG";
    case "AUD":
      return "en-AU";
    case "JPY":
      return "ja-JP";
    default:
      return "en-US";
  }
}

/**
 * Format percentage for occupancy and metrics.
 */
export function formatPercentage(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0%";
  return `${Number(value.toFixed(1))}%`;
}

/**
 * Format a Date object or ISO string in the property's configured timezone.
 */
export function formatPropertyDate(
  date: Date | string,
  timezone: string = "Asia/Kolkata",
  format: "full" | "short" | "dateOnly" | "timeOnly" = "full"
): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return "";

  const safeTimezone = isValidTimezone(timezone) ? timezone : "Asia/Kolkata";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: safeTimezone,
  };

  switch (format) {
    case "dateOnly":
      options.weekday = "short";
      options.month = "short";
      options.day = "numeric";
      options.year = "numeric";
      break;
    case "timeOnly":
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
      break;
    case "short":
      options.month = "short";
      options.day = "numeric";
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
      break;
    case "full":
    default:
      options.weekday = "long";
      options.month = "long";
      options.day = "numeric";
      options.year = "numeric";
      break;
  }

  try {
    return new Intl.DateTimeFormat("en-US", options).format(targetDate);
  } catch {
    return targetDate.toLocaleDateString();
  }
}

/**
 * Returns today's context in the hotel's timezone (greeting, formatted date, ISO date).
 */
export function getPropertyTodayContext(timezone: string = "Asia/Kolkata"): {
  dateString: string;
  formattedFull: string;
  greeting: string;
} {
  const now = new Date();
  const safeTimezone = isValidTimezone(timezone) ? timezone : "Asia/Kolkata";

  let hour = 12;
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      hour: "numeric",
      hour12: false,
    }).format(now);
    hour = parseInt(hourStr, 10);
  } catch {
    hour = now.getHours();
  }

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const formattedFull = formatPropertyDate(now, safeTimezone, "full");
  const dateString = formatPropertyDate(now, safeTimezone, "dateOnly");

  return {
    dateString,
    formattedFull,
    greeting,
  };
}

/**
 * Helper to validate IANA timezone strings
 */
function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
