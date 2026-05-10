-- ============================================================================
-- 0002_realtime_and_storage
--
-- Enables Supabase Realtime on the four user-facing tables (lets the React
-- hooks subscribe to row-level changes) and creates the processed-images
-- storage bucket used by /api/remove-background.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================


-- ============================================================================
-- Realtime publication
-- ============================================================================

alter publication supabase_realtime
  add table collections, collection_members, sets, user_preferences;


-- ============================================================================
-- Storage bucket: processed-images
--
-- Public-read bucket for background-removed PNGs. Same path convention as
-- the previous Firebase Storage layout (`processed-images/{setId}.png`),
-- written by /api/remove-background using the secret key.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'processed-images',
  'processed-images',
  true,
  5242880,                                                  -- 5 MB cap
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
