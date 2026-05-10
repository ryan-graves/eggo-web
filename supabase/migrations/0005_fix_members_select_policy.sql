-- ============================================================================
-- Eggo — Fix collection_members SELECT policy (0005)
--
-- The 0001 policy "users read their own memberships" was too restrictive:
-- it let a member see only their own row, which broke the
-- collection_members(user_id) embed used by getCollectionsForUser et al
-- (src/lib/supabase/collections.ts). Under the old policy
-- Collection.memberUserIds always contained exactly one id (the caller's),
-- so any code path that read it and then wrote it back would silently
-- delete every other member.
--
-- The intended (and documented in CLAUDE.md) behavior is: members of a
-- collection can read the full membership list for that collection. The
-- is_collection_member helper is SECURITY DEFINER so referencing it from
-- the policy is recursion-safe.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste this file → Run.
-- ============================================================================

drop policy "users read their own memberships" on collection_members;

create policy "members read memberships in their collections"
  on collection_members for select
  using (public.is_collection_member(collection_id, auth.uid()));
