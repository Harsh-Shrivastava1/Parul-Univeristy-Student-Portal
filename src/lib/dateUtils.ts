/**
 * Centralized date formatting utilities for the Student Portal.
 *
 * All student-facing dates must use DD/MM/YYYY format.
 * Never call toLocaleDateString() or toLocaleString() directly in components —
 * import and use these helpers instead.
 */

/**
 * Format a date value to DD/MM/YYYY.
 * Returns '—' for null/undefined/invalid values.
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format a date-time value to DD/MM/YYYY, HH:MM.
 * Returns '—' for null/undefined/invalid values.
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}
