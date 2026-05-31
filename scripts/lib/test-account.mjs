/**
 * Shared helpers for the local test-account scripts (seed + teardown).
 *
 * The test account is disposable, localhost-only data used to verify UI without
 * Google OAuth. Two flags keep it from ever touching real data:
 *   - collections.is_seed_data = true on cloned collections (migration 0008)
 *   - auth.users.app_metadata.seed = true on the test user
 * Both scripts refuse to operate on anything not carrying these flags.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load .env.local into process.env so the scripts work regardless of how Node
 * is invoked (no dependency on `--env-file` or dotenv). Existing process.env
 * values win.
 */
export function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/**
 * Resolve and validate config from env. Pass `requireSource: true` for the seed
 * script (which also needs the source account + a password to set).
 */
export function getConfig({ requireSource = false } = {}) {
  loadEnvLocal();
  const cfg = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.SUPABASE_SECRET_KEY,
    sourceEmail: process.env.DEV_LOGIN_SOURCE_EMAIL,
    testEmail: process.env.DEV_LOGIN_EMAIL,
    testPassword: process.env.DEV_LOGIN_PASSWORD,
  };
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: cfg.url,
    SUPABASE_SECRET_KEY: cfg.secret,
    DEV_LOGIN_EMAIL: cfg.testEmail,
  };
  if (requireSource) {
    required.DEV_LOGIN_SOURCE_EMAIL = cfg.sourceEmail;
    required.DEV_LOGIN_PASSWORD = cfg.testPassword;
  }
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing required env in .env.local: ${missing.join(', ')}`);
  }
  return cfg;
}

export function makeAdmin(cfg) {
  return createClient(cfg.url, cfg.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function findUserByEmail(admin, email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
}

export function isSeedUser(user) {
  return user?.app_metadata?.seed === true;
}

async function collectionIdsForUser(admin, userId) {
  const { data, error } = await admin
    .from('collection_members')
    .select('collection_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data.map((m) => m.collection_id);
}

/**
 * Collection ids the user is a member of AND that are flagged is_seed_data.
 * This is the only set the scripts are ever allowed to delete — a real
 * collection (default is_seed_data = false) can never be returned here.
 */
export async function seedCollectionIdsForUser(admin, userId) {
  const ids = await collectionIdsForUser(admin, userId);
  if (!ids.length) return [];
  const { data, error } = await admin
    .from('collections')
    .select('id')
    .eq('is_seed_data', true)
    .in('id', ids);
  if (error) {
    if (error.code === '42703') {
      throw new Error(
        'collections.is_seed_data does not exist — apply migration 0008_add_seed_flag_to_collections.sql first.'
      );
    }
    throw new Error(error.message);
  }
  return data.map((r) => r.id);
}

export async function wipeCollection(admin, collectionId) {
  for (const table of ['sets', 'collection_members']) {
    const { error } = await admin.from(table).delete().eq('collection_id', collectionId);
    if (error) throw new Error(`wipe ${table}: ${error.message}`);
  }
  const { error } = await admin.from('collections').delete().eq('id', collectionId);
  if (error) throw new Error(`wipe collections: ${error.message}`);
}
