-- ============================================================================
-- 0008 — flag non-production seed/test collections
--
-- Adds a boolean marker so local dev tooling can identify the disposable test
-- data it creates (see scripts/seed-test-account.mjs). The seed/teardown
-- scripts set this to true on the collections they clone, and only ever
-- delete collections where it is true — so a real collection (even one a user
-- happens to name "Test") can never be wiped by a reseed.
--
-- Defaults to false, so every existing and future real collection is correctly
-- unflagged with no backfill. Paired with an `app_metadata.seed` marker on the
-- test auth user, which the scripts and /api/dev/login require before touching
-- or impersonating an account.
--
-- No new RLS policies are needed: the column is row-level data on `collections`
-- and the existing member/public read+write policies already cover it. It is
-- not exposed in the app UI.
-- ============================================================================

alter table public.collections
  add column if not exists is_seed_data boolean not null default false;
