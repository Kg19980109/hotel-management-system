// ============================================================
// STAYHUB AI NATURAL LANGUAGE DATE PARSERS & FORMATTERS (Phase 20)
// ============================================================

import type { DateRangePreset } from "../reports/types";
import { getDateRangeBoundaries } from "../reports/metrics";

export function parseNaturalLanguageDateRange(
  query: string,
  timezone = "Asia/Kolkata"
): {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
} {
  const lower = query.toLowerCase();

  let preset: DateRangePreset = "LAST_30_DAYS";

  if (/\b(today|tonight|current day)\b/.test(lower)) {
    preset = "TODAY";
  } else if (/\b(yesterday)\b/.test(lower)) {
    preset = "YESTERDAY";
  } else if (/\b(last 7 days|past 7 days|past week|last 7d)\b/.test(lower)) {
    preset = "LAST_7_DAYS";
  } else if (/\b(this week|current week)\b/.test(lower)) {
    preset = "THIS_WEEK";
  } else if (/\b(last month|previous month|past month)\b/.test(lower)) {
    preset = "LAST_MONTH";
  } else if (/\b(this month|current month)\b/.test(lower)) {
    preset = "THIS_MONTH";
  } else if (/\b(this quarter|current quarter)\b/.test(lower)) {
    preset = "THIS_QUARTER";
  } else if (/\b(this year|ytd|current year)\b/.test(lower)) {
    preset = "THIS_YEAR";
  } else if (/\b(last 30 days|past 30 days|past month|last 30d)\b/.test(lower)) {
    preset = "LAST_30_DAYS";
  }

  const boundaries = getDateRangeBoundaries(preset, timezone);
  return {
    preset,
    ...boundaries,
  };
}

/**
 * Format executive tool output into crisp markdown
 */
export function formatMetricSummary(title: string, value: string | number, subtext?: string): string {
  return `**${title}**: ${value}${subtext ? ` *(${subtext})*` : ""}`;
}

export function formatToolResultAsMarkdown(toolDisplayName: string, output: unknown): string {
  if (!output || typeof output !== "object") {
    return `### ${toolDisplayName}\nNo data recorded for this period.`;
  }

  const obj = output as Record<string, unknown>;
  const lines: string[] = [`### 📊 ${toolDisplayName}`];

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === "object" && !Array.isArray(val)) {
      lines.push(`\n**${key.replace(/([A-Z])/g, " $1").toUpperCase()}**`);
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        lines.push(`- **${subKey.replace(/([A-Z])/g, " $1")}**: ${String(subVal)}`);
      }
    } else if (Array.isArray(val)) {
      lines.push(`\n**${key.replace(/([A-Z])/g, " $1").toUpperCase()} (${val.length} items)**`);
      val.slice(0, 5).forEach((item, idx) => {
        if (typeof item === "object" && item !== null) {
          const itemDesc = Object.entries(item)
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          lines.push(`  ${idx + 1}. ${itemDesc}`);
        } else {
          lines.push(`  ${idx + 1}. ${String(item)}`);
        }
      });
      if (val.length > 5) {
        lines.push(`  *...and ${val.length - 5} more items*`);
      }
    } else {
      const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
      lines.push(`- **${formattedKey}**: ${String(val)}`);
    }
  }

  return lines.join("\n");
}
