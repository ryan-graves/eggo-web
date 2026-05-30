/**
 * Seed a disposable local test account that mirrors a real account.
 *
 * Creates (or reuses) a dedicated Supabase auth user — the one named in
 * DEV_LOGIN_EMAIL — and clones the collections + sets of the real account in
 * DEV_LOGIN_SOURCE_EMAIL into fresh collections owned by the test user. The
 * clone is functionally identical to production data (same set metadata,
 * statuses, owners, and image URLs — images are public Storage URLs, so no
 * file copying is needed) but completely independent: adding, editing, or
 * deleting sets on the test account never touches the real one.
 *
 * Idempotent: re-running wipes the test user's existing collections/sets and
 * re-clones from source, so you always get a clean mirror.
 *
 * Run (Node loads nothing automatically here, so we parse .env.local below):
 *   node scripts/seed-test-account.mjs
 *
 * Required env (set in .env.local, never in production):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *   DEV_LOGIN_SOURCE_EMAIL   account to clone FROM (your real account)
 *   DEV_LOGIN_EMAIL          test account to clone INTO
 *   DEV_LOGIN_PASSWORD       password set on the test account
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Load .env.local manually so the script is invocation/Node-version
// independent (no dependency on `node --env-file` or dotenv). ---
function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  } catch {
    return; // rely on already-present process.env
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

loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const SOURCE_EMAIL = process.env.DEV_LOGIN_SOURCE_EMAIL;
const TEST_EMAIL = process.env.DEV_LOGIN_EMAIL;
const TEST_PASSWORD = process.env.DEV_LOGIN_PASSWORD;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: URL,
  SUPABASE_SECRET_KEY: SECRET,
  DEV_LOGIN_SOURCE_EMAIL: SOURCE_EMAIL,
  DEV_LOGIN_EMAIL: TEST_EMAIL,
  DEV_LOGIN_PASSWORD: TEST_PASSWORD,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`Missing required env: ${missing.join(', ')}`);
  process.exit(1);
}

if (TEST_EMAIL.toLowerCase() === SOURCE_EMAIL.toLowerCase()) {
  console.error('DEV_LOGIN_EMAIL must differ from DEV_LOGIN_SOURCE_EMAIL — refusing to clone an account onto itself.');
  process.exit(1);
}

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
}

async function collectionIdsForUser(userId) {
  const { data, error } = await admin
    .from('collection_members')
    .select('collection_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data.map((m) => m.collection_id);
}

async function wipeCollection(collectionId) {
  // Order matters if FK cascade isn't configured: sets + members first.
  for (const table of ['sets', 'collection_members']) {
    const { error } = await admin.from(table).delete().eq('collection_id', collectionId);
    if (error) throw new Error(`wipe ${table}: ${error.message}`);
  }
  const { error } = await admin.from('collections').delete().eq('id', collectionId);
  if (error) throw new Error(`wipe collections: ${error.message}`);
}

async function main() {
  console.log(`Cloning ${SOURCE_EMAIL} → ${TEST_EMAIL}`);

  const source = await findUserByEmail(SOURCE_EMAIL);
  if (!source) {
    console.error(`Source user ${SOURCE_EMAIL} not found.`);
    process.exit(1);
  }
  const sourceCollectionIds = await collectionIdsForUser(source.id);
  if (sourceCollectionIds.length === 0) {
    console.error(`Source user has no collections to clone.`);
    process.exit(1);
  }
  console.log(`Source has ${sourceCollectionIds.length} collection(s).`);

  // Test user: create or reset password to the known value.
  let test = await findUserByEmail(TEST_EMAIL);
  if (!test) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    test = data.user;
    console.log(`Created test user ${TEST_EMAIL} (${test.id}).`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(test.id, { password: TEST_PASSWORD });
    if (error) throw new Error(`updateUserById: ${error.message}`);
    console.log(`Reusing test user ${TEST_EMAIL} (${test.id}); password reset.`);
  }

  // Wipe any prior clone so reseeding is clean.
  const existing = await collectionIdsForUser(test.id);
  for (const cid of existing) await wipeCollection(cid);
  if (existing.length) console.log(`Wiped ${existing.length} prior test collection(s).`);

  let totalSets = 0;
  for (const sourceId of sourceCollectionIds) {
    const { data: coll, error: collErr } = await admin
      .from('collections')
      .select('*')
      .eq('id', sourceId)
      .single();
    if (collErr) throw new Error(`read collection: ${collErr.message}`);

    const { data: newColl, error: insErr } = await admin
      .from('collections')
      .insert({ name: `${coll.name} (Test)`, owners: coll.owners ?? [], is_public: false })
      .select('id')
      .single();
    if (insErr) throw new Error(`insert collection: ${insErr.message}`);

    const { error: memErr } = await admin
      .from('collection_members')
      .insert({ collection_id: newColl.id, user_id: test.id });
    if (memErr) throw new Error(`insert member: ${memErr.message}`);

    const { data: sets, error: setsErr } = await admin
      .from('sets')
      .select('*')
      .eq('collection_id', sourceId);
    if (setsErr) throw new Error(`read sets: ${setsErr.message}`);

    const rows = sets.map(({ id, collection_id, created_at, updated_at, ...rest }) => ({
      ...rest,
      collection_id: newColl.id,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin.from('sets').insert(chunk);
      if (error) throw new Error(`insert sets: ${error.message}`);
    }
    totalSets += rows.length;
    console.log(`  Cloned "${coll.name}" → "${coll.name} (Test)" (${newColl.id}) with ${rows.length} sets.`);
  }

  console.log(`Done. Test account has ${sourceCollectionIds.length} collection(s) and ${totalSets} sets.`);
  console.log(`Sign in locally via /dev-login (password sign-in as ${TEST_EMAIL}).`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
