-- ============================================================================
-- 0006 — drop the ui_theme column + enum
--
-- The dual-theme (Mono / Baseplate) architecture is being collapsed to a
-- single canonical UI (Mono). The `data-ui-theme` attribute and the user
-- preference that fed it are both gone in the application layer; this
-- migration drops the now-orphan column from `user_preferences` and the
-- enum that backed it.
--
-- Data loss is intentional. The only values the column ever held were
-- 'baseplate' and 'mono', and neither has a meaning in the new world.
-- ============================================================================

alter table public.user_preferences
  drop column if exists ui_theme;

drop type if exists public.ui_theme;
