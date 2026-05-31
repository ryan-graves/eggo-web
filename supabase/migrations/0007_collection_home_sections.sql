-- ============================================================================
-- 0007 — move the home section layout from per-user to per-collection
--
-- Home view customizations (which carousels appear, their order, and their
-- display style) were stored per-user in user_preferences.home_sections. They
-- are now a property of the collection: any member can edit the layout, the
-- change applies to every member, and the public share link inherits the same
-- layout.
--
-- The per-user column is dropped. Existing per-user layouts are intentionally
-- not migrated — a user can belong to multiple collections, so there is no
-- unambiguous target collection to copy a layout onto. Collections with no
-- saved layout fall back to the application default (DEFAULT_HOME_SECTIONS).
--
-- No new RLS policies are needed:
--   * "members update own collections" already lets a member write the column
--   * "anyone reads public collections" already exposes it to share viewers
-- ============================================================================

alter table public.collections
  add column if not exists home_sections jsonb;

alter table public.user_preferences
  drop column if exists home_sections;
