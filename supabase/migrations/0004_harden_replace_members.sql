-- ============================================================================
-- Eggo — Harden replace_collection_members (0004)
--
-- The RPC introduced in 0003 relied on a single auth check
-- (is_collection_member) and otherwise trusted the caller's input. That
-- left two ways to lock everyone out of a collection via RLS:
--
--   1. Pass an empty target_user_ids array → all members deleted.
--   2. Pass a non-empty array that omits auth.uid() → caller deletes
--      themselves; if they were the only member, the collection becomes
--      orphaned.
--
-- Both are now rejected explicitly. Self-removal is no longer possible
-- through this RPC; if we ever need that, it gets its own intentional
-- "leave collection" function.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste this file → Run.
-- ============================================================================

create or replace function public.replace_collection_members(
  coll_id uuid,
  target_user_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_collection_member(coll_id, auth.uid()) then
    raise exception 'not authorized';
  end if;

  if target_user_ids is null or array_length(target_user_ids, 1) is null then
    raise exception 'target_user_ids cannot be empty';
  end if;

  if not (auth.uid() = any(target_user_ids)) then
    raise exception 'caller must remain a member of the collection';
  end if;

  delete from collection_members
  where collection_id = coll_id
    and not (user_id = any(target_user_ids));

  insert into collection_members (collection_id, user_id)
  select coll_id, unnest(target_user_ids)
  on conflict (collection_id, user_id) do nothing;
end;
$$;
