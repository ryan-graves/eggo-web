/**
 * Imports the Firestore + Auth export from `firebase-export/export.json`
 * into the new Supabase project. Generates new UUIDs for collections and
 * sets while maintaining an in-memory map so foreign keys resolve.
 *
 * Existing memberships and user_preferences are inserted with
 * `firebase_uid` set (and `user_id` null) — the on_auth_user_created
 * trigger will rebind them to a real Supabase user_id when each
 * existing user signs in for the first time.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-to-supabase.mjs           # safe; aborts if data exists
 *   node --env-file=.env.local scripts/import-to-supabase.mjs --reset   # truncates target tables first
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';

const EXPORT_PATH = join(process.cwd(), 'firebase-export/export.json');

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const reset = process.argv.includes('--reset');

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

console.log(`Project: ${url}`);
console.log(`Reset:   ${reset}`);
console.log(`Source:  ${EXPORT_PATH}\n`);

const data = JSON.parse(readFileSync(EXPORT_PATH, 'utf-8'));
console.log(`Source counts: ${data.collections.length} collections, ${data.sets.length} sets, ` +
  `${data.user_preferences.length} prefs, ${data.auth_users.length} auth users\n`);

// ============================================================================
// Pre-flight: target tables empty?
// ============================================================================

const targetTables = ['collection_members', 'sets', 'user_preferences', 'collections', '_firebase_uid_map'];
const counts = {};
for (const t of targetTables) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`Failed to read ${t}: ${error.message}`);
    process.exit(1);
  }
  counts[t] = count ?? 0;
}
console.log('Target counts:', counts);

const hasData = Object.values(counts).some((c) => c > 0);
if (hasData && !reset) {
  console.error('\nTarget tables already contain data. Re-run with --reset to truncate first.');
  process.exit(1);
}

if (hasData && reset) {
  console.log('\nResetting target tables...');
  // Delete in dependency order: leaf rows first, then parents
  const deleteOrder = ['collection_members', 'sets', 'user_preferences', 'collections', '_firebase_uid_map'];
  for (const t of deleteOrder) {
    if (t === '_firebase_uid_map') {
      const { error } = await supabase.from(t).delete().neq('firebase_uid', '');
      if (error) throw new Error(`reset ${t}: ${error.message}`);
    } else {
      const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw new Error(`reset ${t}: ${error.message}`);
    }
    console.log(`  cleared ${t}`);
  }
  console.log('');
}

// ============================================================================
// Helpers
// ============================================================================

function check(...args) {
  for (let i = 0; i < args.length; i += 2) {
    if (args[i + 1].error) throw new Error(`${args[i]}: ${args[i + 1].error.message}`);
  }
}

function nullIfUndef(v) { return v === undefined ? null : v; }

// Apply the owner → owners migration once at import time so the schema
// can drop the legacy `owner` field entirely.
function normalizeOwners(set) {
  if (Array.isArray(set.owners)) return set.owners;
  if (typeof set.owner === 'string' && set.owner) return [set.owner];
  return [];
}

// ============================================================================
// 1. Auth users → _firebase_uid_map
// ============================================================================

const authMapRows = data.auth_users
  .filter((u) => u.email)
  .map((u) => ({ firebase_uid: u.uid, email: u.email }));

console.log(`Inserting ${authMapRows.length} _firebase_uid_map rows...`);
const r1 = await supabase.from('_firebase_uid_map').insert(authMapRows);
check('_firebase_uid_map insert', r1);

// ============================================================================
// 2. Collections (with new UUIDs) + collection_members (with firebase_uid)
// ============================================================================

const collectionIdMap = new Map(); // firestore id → new uuid
const collectionRows = [];
const memberRows = [];

for (const c of data.collections) {
  const newId = randomUUID();
  // Trim Firestore id when keying the map — some legacy sets have a leading
  // space in their collectionId from a copy-paste typo, and we want to match
  // on the canonical (trimmed) value regardless of which side carries it.
  collectionIdMap.set(c.id.trim(), newId);
  collectionRows.push({
    id: newId,
    name: c.name,
    owners: c.owners ?? [],
    is_public: c.isPublic ?? false,
    public_share_token: nullIfUndef(c.publicShareToken),
    public_view_settings: nullIfUndef(c.publicViewSettings),
    created_at: c.createdAt ?? new Date().toISOString(),
    updated_at: c.updatedAt ?? new Date().toISOString(),
  });
  for (const firebaseUid of c.memberUserIds ?? []) {
    memberRows.push({
      collection_id: newId,
      firebase_uid: firebaseUid,
      user_id: null,
      added_at: c.createdAt ?? new Date().toISOString(),
    });
  }
}

console.log(`Inserting ${collectionRows.length} collections...`);
const r2 = await supabase.from('collections').insert(collectionRows);
check('collections insert', r2);

console.log(`Inserting ${memberRows.length} collection_members (firebase_uid pending claim)...`);
const r3 = await supabase.from('collection_members').insert(memberRows);
check('collection_members insert', r3);

// ============================================================================
// 3. Sets
// ============================================================================

const setRows = [];
let skipped = 0;
let trimmed = 0;
for (const s of data.sets) {
  const lookupId = (s.collectionId ?? '').trim();
  if (lookupId !== s.collectionId) trimmed++;
  const newCollectionId = collectionIdMap.get(lookupId);
  if (!newCollectionId) {
    console.warn(`  WARN: set ${s.id} references unknown collectionId ${JSON.stringify(s.collectionId)} — skipping`);
    skipped++;
    continue;
  }
  setRows.push({
    id: randomUUID(),
    collection_id: newCollectionId,
    set_number: s.setNumber,
    name: s.name,
    piece_count: nullIfUndef(s.pieceCount),
    year: nullIfUndef(s.year),
    theme: nullIfUndef(s.theme),
    subtheme: nullIfUndef(s.subtheme),
    image_url: nullIfUndef(s.imageUrl),
    custom_image_url: nullIfUndef(s.customImageUrl),
    status: s.status,
    has_been_assembled: s.hasBeenAssembled ?? false,
    occasion: nullIfUndef(s.occasion),
    date_received: nullIfUndef(s.dateReceived),
    owners: normalizeOwners(s),
    notes: nullIfUndef(s.notes),
    data_source: s.dataSource,
    data_source_id: nullIfUndef(s.dataSourceId),
    last_synced_at: nullIfUndef(s.lastSyncedAt),
    created_at: s.createdAt ?? new Date().toISOString(),
    updated_at: s.updatedAt ?? new Date().toISOString(),
  });
}

console.log(`Inserting ${setRows.length} sets (${skipped} skipped, ${trimmed} fixed via collectionId trim)...`);
// Postgrest can choke on huge payloads; batch in 100s for safety
const BATCH = 100;
for (let i = 0; i < setRows.length; i += BATCH) {
  const slice = setRows.slice(i, i + BATCH);
  const r = await supabase.from('sets').insert(slice);
  check(`sets insert batch ${i / BATCH + 1}`, r);
}

// ============================================================================
// 4. User preferences (keyed by firebase_uid until claim)
// ============================================================================

const prefRows = data.user_preferences.map((p) => ({
  firebase_uid: p.id, // Firestore doc ID was the firebase UID
  user_id: null,
  theme: p.theme ?? 'system',
  ui_theme: p.uiTheme ?? 'mono',
  home_sections: nullIfUndef(p.homeSections),
  updated_at: p.updatedAt ?? new Date().toISOString(),
}));

console.log(`Inserting ${prefRows.length} user_preferences (firebase_uid pending claim)...`);
const r4 = await supabase.from('user_preferences').insert(prefRows);
check('user_preferences insert', r4);

// ============================================================================
// Verify final counts
// ============================================================================

console.log('\nFinal counts:');
for (const t of targetTables) {
  const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
  console.log(`  ${t}: ${count}`);
}

console.log('\nImport complete.');
