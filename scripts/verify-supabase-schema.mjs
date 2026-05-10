import { createClient } from '@supabase/supabase-js';

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  console.error('Run with: node --env-file=.env.local scripts/verify-supabase-schema.mjs');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

console.log(`Project: ${url}`);
console.log('');

const admin = createClient(url, secretKey, { auth: { persistSession: false } });
const anon = createClient(url, publishableKey, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const step = async (label, fn) => {
  try {
    const result = await fn();
    console.log(`PASS  ${label}${result ? ` — ${result}` : ''}`);
    pass++;
  } catch (err) {
    console.log(`FAIL  ${label}`);
    console.log(`      ${err.message}`);
    fail++;
  }
};

// ---- Tables exist + are readable with the secret key ----
const expectedTables = ['collections', 'collection_members', 'sets', 'user_preferences'];
for (const table of expectedTables) {
  await step(`secret can read ${table}`, async () => {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return `${count ?? 0} rows`;
  });
}

// ---- RLS sanity: anon can only see public rows ----
// With no auth context, anon reads should return only collections where
// is_public = true (and their sets via the parent-collection policy).
// Private rows must not leak.
await step('anon only sees public collections', async () => {
  const { data, error } = await anon.from('collections').select('id, is_public');
  if (error) throw new Error(`unexpected error: ${error.message}`);
  const leak = (data ?? []).filter((c) => c.is_public !== true);
  if (leak.length > 0) {
    throw new Error(`SECURITY ISSUE: anon sees ${leak.length} non-public collection(s)`);
  }
  return `${data?.length ?? 0} public row(s) visible, no leaks`;
});

await step('anon only sees sets from public collections', async () => {
  const { data: pubCols } = await anon.from('collections').select('id').eq('is_public', true);
  const publicIds = new Set((pubCols ?? []).map((c) => c.id));
  const { data, error } = await anon.from('sets').select('id, collection_id');
  if (error) throw new Error(`unexpected error: ${error.message}`);
  const leak = (data ?? []).filter((s) => !publicIds.has(s.collection_id));
  if (leak.length > 0) {
    throw new Error(`SECURITY ISSUE: anon sees ${leak.length} set(s) from non-public collections`);
  }
  return `${data?.length ?? 0} set(s) visible, all from public collections`;
});

// ---- Cleanup migration applied: _firebase_uid_map should be gone ----
await step('_firebase_uid_map has been dropped', async () => {
  const { error } = await admin.from('_firebase_uid_map').select('*', { count: 'exact', head: true });
  if (!error) throw new Error('table still exists — apply 0003_drop_claim_flow.sql');
  return `correctly missing: ${error.message}`;
});

// ---- Helper function exists ----
// is_collection_member(uuid, uuid) — call with a fake uuid pair, expect false.
await step('is_collection_member helper exists', async () => {
  const fake = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await admin.rpc('is_collection_member', { coll_id: fake, uid: fake });
  if (error) throw error;
  if (data !== false) throw new Error(`expected false, got ${data}`);
  return 'returns false for fake ids';
});

// ---- replace_collection_members RPC exists ----
// Calling without auth context fails the membership check and raises.
// Either an error or a 'not authorized' response confirms the function is wired.
await step('replace_collection_members RPC exists', async () => {
  const fake = '00000000-0000-0000-0000-000000000000';
  const { error } = await anon.rpc('replace_collection_members', {
    coll_id: fake,
    target_user_ids: [fake],
  });
  if (!error) throw new Error('expected unauthorized error from anon caller');
  return `correctly rejected: ${error.message}`;
});

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
