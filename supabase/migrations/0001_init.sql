-- ============================================================================
-- Eggo — Initial Supabase Schema (0001_init)
--
-- Replaces the Firestore data model and undocumented security rules with
-- typed Postgres tables, indexes that mirror the audited Firestore queries,
-- and explicit RLS policies. Includes a temporary firebase_uid claim flow
-- (_firebase_uid_map + auth.users INSERT trigger) that transparently
-- re-binds existing users' data on first Supabase sign-in.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste this file → Run.
-- After all existing users have signed in once, run 0003_drop_claim_flow.sql
-- to remove the temp claim infrastructure.
-- ============================================================================


-- ============================================================================
-- Enums
-- ============================================================================

create type set_status as enum (
  'unopened',
  'in_progress',
  'rebuild_in_progress',
  'assembled',
  'disassembled'
);

create type data_source as enum (
  'rebrickable',
  'brickset',
  'bricklink',
  'manual'
);

create type theme_preference as enum ('system', 'light', 'dark');
create type ui_theme as enum ('baseplate', 'mono');


-- ============================================================================
-- Shared updated_at trigger function
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- collections
-- ============================================================================

create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  owners text[] not null default '{}',
  is_public boolean not null default false,
  public_share_token text unique
    check (
      public_share_token is null
      or public_share_token ~ '^[A-Za-z0-9]{12}$'
    ),
  public_view_settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a public collection must have a token
  check (is_public = false or public_share_token is not null)
);

create trigger collections_updated_at
  before update on collections
  for each row execute function public.set_updated_at();

-- Public-share lookup: small partial index, only public+tokenized rows
create index collections_public_share_token_idx
  on collections (public_share_token)
  where is_public = true;


-- ============================================================================
-- collection_members
--
-- N:M between collections and auth.users. Replaces Firestore's
-- collections.memberUserIds[] with a relational join table.
--
-- During the migration window each row holds *either* a Supabase user_id
-- (claimed) or a firebase_uid (pending first Supabase sign-in), enforced
-- by a XOR check constraint. Both partial unique indexes ensure no
-- duplicate memberships within a single (collection, identity) pair.
-- ============================================================================

create table collection_members (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  firebase_uid text,
  added_at timestamptz not null default now(),
  check (
    (user_id is not null and firebase_uid is null)
    or (user_id is null and firebase_uid is not null)
  )
);

create unique index collection_members_user_idx
  on collection_members (collection_id, user_id)
  where user_id is not null;

create unique index collection_members_firebase_idx
  on collection_members (collection_id, firebase_uid)
  where firebase_uid is not null;

create index collection_members_user_id_idx
  on collection_members (user_id)
  where user_id is not null;


-- ============================================================================
-- sets
-- ============================================================================

create table sets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  set_number text not null,
  name text not null,
  piece_count integer,
  year integer,
  theme text,
  subtheme text,
  image_url text,
  custom_image_url text,
  status set_status not null,
  has_been_assembled boolean not null default false,
  occasion text,
  date_received date,
  owners text[] not null default '{}',
  notes text,
  data_source data_source not null,
  data_source_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sets_updated_at
  before update on sets
  for each row execute function public.set_updated_at();

-- Indexes mirror the audited Firestore queries from src/lib/firebase/sets.ts
create index sets_collection_created_idx
  on sets (collection_id, created_at desc);

create index sets_collection_status_idx
  on sets (collection_id, status, created_at desc);

create index sets_collection_theme_idx
  on sets (collection_id, theme, created_at desc)
  where theme is not null;

create index sets_collection_set_number_idx
  on sets (collection_id, set_number);

-- For owners array-contains queries (replaces Firestore array-contains)
create index sets_owners_gin_idx on sets using gin (owners);


-- ============================================================================
-- user_preferences
--
-- Originally Firestore /users/{firebaseUid}. Now keyed by auth.users.id,
-- with the same firebase_uid claim window pattern as collection_members.
-- ============================================================================

create table user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  firebase_uid text unique,
  theme theme_preference not null default 'system',
  ui_theme ui_theme not null default 'mono',
  home_sections jsonb,
  updated_at timestamptz not null default now(),
  check (
    (user_id is not null and firebase_uid is null)
    or (user_id is null and firebase_uid is not null)
  )
);

create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function public.set_updated_at();


-- ============================================================================
-- _firebase_uid_map — TEMPORARY, dropped post-cutover
--
-- Populated by scripts/import-to-supabase.mjs from
-- admin.auth().listUsers(). Used by the on_auth_user_created trigger to
-- silently re-bind a returning user's data on first Supabase sign-in.
-- Revoked from anon/authenticated so it's never exposed via PostgREST.
-- ============================================================================

create table _firebase_uid_map (
  firebase_uid text primary key,
  email text not null
);

create index _firebase_uid_map_email_idx
  on _firebase_uid_map (lower(email));

revoke all on _firebase_uid_map from anon, authenticated;


-- ============================================================================
-- Helper: is_collection_member
--
-- security definer + bypassed RLS lets policies reference membership
-- without recursing on collection_members's own SELECT policy.
-- ============================================================================

create or replace function public.is_collection_member(coll_id uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from collection_members
    where collection_id = coll_id and user_id = uid
  );
$$;


-- ============================================================================
-- claim_firebase_data — fires on auth.users INSERT
--
-- On first Supabase sign-in for a returning Firebase user, look up the
-- firebase_uid by email and re-bind their collection_members and
-- user_preferences rows from firebase_uid → user_id, then drop the map row.
-- New users (no email match) fall through with no effect.
-- ============================================================================

create or replace function public.claim_firebase_data()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matched_uid text;
begin
  select firebase_uid into matched_uid
  from _firebase_uid_map
  where lower(email) = lower(new.email)
  limit 1;

  if matched_uid is null then
    return new;
  end if;

  update collection_members
  set user_id = new.id, firebase_uid = null
  where firebase_uid = matched_uid;

  update user_preferences
  set user_id = new.id, firebase_uid = null
  where firebase_uid = matched_uid;

  delete from _firebase_uid_map where firebase_uid = matched_uid;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.claim_firebase_data();


-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table collections          enable row level security;
alter table collection_members   enable row level security;
alter table sets                 enable row level security;
alter table user_preferences     enable row level security;


-- ---- collections -----------------------------------------------------------

create policy "members read own collections"
  on collections for select
  using (public.is_collection_member(id, auth.uid()));

create policy "anyone reads public collections"
  on collections for select
  using (is_public = true);

create policy "members update own collections"
  on collections for update
  using (public.is_collection_member(id, auth.uid()))
  with check (public.is_collection_member(id, auth.uid()));

create policy "members delete own collections"
  on collections for delete
  using (public.is_collection_member(id, auth.uid()));

-- INSERT on collections is performed server-side via /api/collections
-- using the service_role key (bypasses RLS), matching the original
-- Firebase admin-SDK pattern in src/app/api/collections/route.ts.


-- ---- collection_members ----------------------------------------------------

create policy "users read their own memberships"
  on collection_members for select
  using (user_id = auth.uid());

create policy "members add to their collections"
  on collection_members for insert
  with check (public.is_collection_member(collection_id, auth.uid()));

create policy "members remove from their collections"
  on collection_members for delete
  using (public.is_collection_member(collection_id, auth.uid()));


-- ---- sets ------------------------------------------------------------------

create policy "members read sets in their collections"
  on sets for select
  using (public.is_collection_member(collection_id, auth.uid()));

create policy "anyone reads sets in public collections"
  on sets for select
  using (
    exists (
      select 1 from collections c
      where c.id = sets.collection_id and c.is_public = true
    )
  );

create policy "members write sets in their collections"
  on sets for all
  using (public.is_collection_member(collection_id, auth.uid()))
  with check (public.is_collection_member(collection_id, auth.uid()));


-- ---- user_preferences ------------------------------------------------------

create policy "self read prefs"
  on user_preferences for select
  using (user_id = auth.uid());

create policy "self upsert prefs"
  on user_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
