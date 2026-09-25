// ============================================================
// STAYHUB REPORTING FORMATTERS & CSV EXPORTER (Phase 19)
// ============================================================

/**
 * Format numeric currency amount respecting ISO currency codes.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = "INR"
): string {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format percentage value with standard decimal precision.
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A";
  }
  return `${Number(value).toFixed(1)}%`;
}

/**
 * Format minutes into readable human duration (e.g. 45m, 1h 20m).
 */
export function formatDurationMinutes(minutes: number | null | undefined): string {
  const mins = Math.round(Number(minutes || 0));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const remM = mins % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

/**
 * Format hours into readable duration (e.g. 2.5 hrs).
 */
export function formatDurationHours(hours: number | null | undefined): string {
  const h = Number(hours || 0);
  return `${h.toFixed(1)} hrs`;
}

/**
 * Sanitize and escape CSV cell value to prevent formula injection and quoting issues.
 */
function escapeCsvValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Prevent CSV Formula Injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generate compliant CSV text with property context and execution timestamps.
 */
export function exportToCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  metadata?: {
    title: string;
    propertyName?: string;
    dateRange?: string;
    generatedAt?: string;
  }
): string {
  const lines: string[] = [];

  if (metadata) {
    lines.push(`# STAYHUB HOTEL MANAGEMENT SYSTEM`);
    lines.push(`# REPORT: ${metadata.title}`);
    if (metadata.propertyName) lines.push(`# PROPERTY: ${metadata.propertyName}`);
    if (metadata.dateRange) lines.push(`# DATE RANGE: ${metadata.dateRange}`);
    lines.push(`# GENERATED AT: ${metadata.generatedAt || new Date().toISOString()}`);
    lines.push(""); // empty separator line
  }

  // Header row
  lines.push(headers.map(escapeCsvValue).join(","));

  // Data rows
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(","));
  }

  return lines.join("\r\n");
}
