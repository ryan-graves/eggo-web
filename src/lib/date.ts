/**
 * Format a YYYY-MM-DD date string for display (e.g., "January 15, 2024").
 * Parses the string as local date components to avoid timezone shifts.
 */
export function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return 'Not set';

  // Parse YYYY-MM-DD as local date by splitting the string
  // This avoids Date parsing which can cause timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
