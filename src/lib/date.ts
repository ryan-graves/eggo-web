import { Timestamp } from 'firebase/firestore';

/**
 * Format a Firestore Timestamp to a date input value (YYYY-MM-DD) in local timezone.
 * Using local date components instead of toISOString() to avoid UTC conversion issues.
 */
export function formatDateForInput(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date input value (YYYY-MM-DD) to a Firestore Timestamp in local timezone.
 * Adding T00:00:00 ensures JavaScript parses as local time, not UTC.
 */
export function parseDateFromInput(dateString: string): Timestamp | null {
  if (!dateString) return null;
  // Parse as local time by adding time component without timezone
  const date = new Date(dateString + 'T00:00:00');
  return Timestamp.fromDate(date);
}
