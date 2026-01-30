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
