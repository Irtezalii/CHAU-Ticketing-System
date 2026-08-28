// SQLite's CURRENT_TIMESTAMP produces UTC values like "2026-08-27 10:00:00"
// (a space instead of "T", no "Z"/offset). JS's Date parser treats that shape
// as local time, not UTC, so comparisons against a real ISO string (e.g. from
// toISOString()) drift by the browser's UTC offset. Normalize before parsing.
export function parseServerTimestamp(value: string): Date {
  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;
  return new Date(normalized);
}
