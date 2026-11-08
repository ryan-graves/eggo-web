-- ============================================================================
-- 0009 — remembered Brickset accounts + Brickset request throttling
--
-- Lets a user keep their Brickset account linked after an import so "Sync
-- from Brickset" can pull new sets without re-entering a password. Brickset
-- has no OAuth: its API issues a long-lived `userHash` in exchange for a
-- username + password. Only that hash is kept, never the password, and it is
-- stored encrypted (AES-256-GCM, key in the server-only BRICKSET_HASH_KEY
-- env var — see src/lib/crypto/secretBox.ts). A leaked row is therefore
-- useless without the server key, and rotating the key simply makes every
-- user re-link.
--
-- Both tables are server-only: RLS is enabled with NO policies and all
-- privileges are revoked from the browser roles, so the publishable key can
-- neither read nor write them. The API routes use the secret-key client and
-- verify the caller's JWT themselves (same pattern as /api/remove-background).
--
-- brickset_requests is an append-only log of Brickset sign-ins and
-- collection fetches per user. /api/brickset/collection counts recent rows
-- to cap how fast one account can spend the shared Brickset API quota or
-- drive password guesses through Eggo. Rows older than a day are pruned
-- opportunistically on insert.
-- ============================================================================

create table public.brickset_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  brickset_username text not null check (length(brickset_username) between 1 and 200),
  user_hash_ciphertext text not null,
  linked_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.brickset_links enable row level security;
revoke all on table public.brickset_links from anon, authenticated;

create table public.brickset_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('login', 'fetch')),
  created_at timestamptz not null default now()
);

create index brickset_requests_user_id_created_at_idx
  on public.brickset_requests (user_id, created_at desc);

alter table public.brickset_requests enable row level security;
revoke all on table public.brickset_requests from anon, authenticated;
