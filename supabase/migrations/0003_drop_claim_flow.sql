-- ============================================================================
-- Eggo — Drop Firebase claim flow + atomic membership replace (0003)
--
-- The Firestore → Supabase migration is complete and verified, so the
-- temporary infrastructure that re-bound returning users' data on first
-- sign-in is no longer needed:
--
--   - on_auth_user_created trigger
--   - claim_firebase_data() function
--   - _firebase_uid_map table
--   - firebase_uid column on collection_members
--   - firebase_uid column on user_preferences
--
-- Also adds replace_collection_members(coll_id, target_user_ids) so the
-- collection-settings membership edit can run delete + insert atomically
-- (the previous client-side sequence had a window where a failed insert
-- left members locked out by RLS).
--
-- Apply via: Supabase Dashboard → SQL Editor → paste this file → Run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Drop the auth trigger + claim function
-- ----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.claim_firebase_data();


-- ----------------------------------------------------------------------------
-- 2. Drop the firebase_uid map table
-- ----------------------------------------------------------------------------

drop table if exists public._firebase_uid_map;


-- ----------------------------------------------------------------------------
-- 3. collection_members: drop firebase_uid + dependent constraints/indexes,
--    enforce user_id NOT NULL, recreate the unique constraint as full-table
-- ----------------------------------------------------------------------------

-- CASCADE removes the XOR check constraint and the partial unique
-- collection_members_firebase_idx in one shot.
alter table collection_members drop column if exists firebase_uid cascade;

alter table collection_members
  alter column user_id set not null;

drop index if exists collection_members_user_idx;
alter table collection_members
  add constraint collection_members_collection_user_unique
  unique (collection_id, user_id);

drop index if exists collection_members_user_id_idx;
create index collection_members_user_id_idx
  on collection_members (user_id);


-- ----------------------------------------------------------------------------
-- 4. user_preferences: drop firebase_uid + XOR check, enforce user_id NOT NULL
-- ----------------------------------------------------------------------------

alter table user_preferences drop column if exists firebase_uid cascade;

alter table user_preferences
  alter column user_id set not null;


-- ----------------------------------------------------------------------------
-- 5. replace_collection_members — atomic membership replace
--
-- Caller must already be a member of coll_id. Wholesale replaces the
-- collection's member set with target_user_ids in a single transaction so
-- a failed insert can't leave the table empty.
-- ----------------------------------------------------------------------------

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

  delete from collection_members
  where collection_id = coll_id
    and not (user_id = any(target_user_ids));

  insert into collection_members (collection_id, user_id)
  select coll_id, unnest(target_user_ids)
  on conflict (collection_id, user_id) do nothing;
end;
$$;
