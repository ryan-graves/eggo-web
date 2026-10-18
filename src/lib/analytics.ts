import posthog from 'posthog-js';

// PostHog's managed reverse proxy is org-wide (it was set up for the
// portfolio site); the project token alone decides where events land.
// Routing through it keeps ad blockers from dropping events.
const POSTHOG_API_HOST = 'https://a.ryangrav.es';
// Needed when api_host is a proxy so toolbar/app links resolve to PostHog.
const POSTHOG_UI_HOST = 'https://us.posthog.com';

/**
 * Add to an element to keep it out of PostHog entirely: session replay draws a
 * blank placeholder in its place and autocapture ignores it. Replay masks form
 * inputs by default but records visible text, so use this for personal details.
 */
export const ANALYTICS_EXCLUDE_CLASS = 'ph-no-capture';

/**
 * Starts PostHog when a project token was baked into the build.
 * next.config.ts only exposes the token to Netlify's production deploy, so
 * local dev, deploy previews, and tests ship no analytics at all — that keeps
 * owner/preview traffic out of the real data and off the replay quota.
 */
export function initAnalytics(): void {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return;

  posthog.init(token, {
    api_host: POSTHOG_API_HOST,
    ui_host: POSTHOG_UI_HOST,
    defaults: '2026-08-30',
  });
}

/** Ties this browser's events to the signed-in user by Supabase ID only — no email or name. */
export function identifyUser(userId: string): void {
  if (!posthog.__loaded) return;
  posthog.identify(userId);
}

/** Unlinks the browser from the signed-out user so the next person on it isn't merged into them. */
export function resetAnalyticsUser(): void {
  if (!posthog.__loaded) return;
  posthog.reset();
}
