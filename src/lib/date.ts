import type { Timestamp } from 'firebase/firestore';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a YYYY-MM-DD date string for display (e.g., "January 15, 2024").
 * Parses the string as local date components to avoid timezone shifts.
 */
export function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return 'Not set';

  // Validate format
  if (!DATE_REGEX.test(dateString)) {
    return 'Invalid date';
  }

  // Parse YYYY-MM-DD as local date by splitting the string
  // This avoids Date parsing which can cause timezone issues
  const [year, month, day] = dateString.split('-').map(Number);

  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return 'Invalid date';
  }

  const date = new Date(year, month - 1, day);

  // Check if date is valid (handles cases like Feb 30)
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Safely convert a dateReceived value to a sortable YYYY-MM-DD string.
 * Handles both string and legacy Firestore Timestamp formats.
 */
export function getDateSortString(dateReceived: string | Timestamp | null | undefined): string {
  if (!dateReceived) return '';
  if (typeof dateReceived === 'string') return dateReceived;
  if (typeof dateReceived === 'object' && 'toDate' in dateReceived) {
    const date = dateReceived.toDate();
    return date.toISOString().split('T')[0];
  }
  return '';
}
