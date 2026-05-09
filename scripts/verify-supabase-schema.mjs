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

// _firebase_uid_map: secret key should be able to read it (admin can do anything)
await step('secret can read _firebase_uid_map', async () => {
  const { count, error } = await admin.from('_firebase_uid_map').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return `${count ?? 0} rows`;
});

// ---- RLS sanity: anon (publishable) should get empty results, not errors ----
// With no auth context, every RLS policy fails closed — but the *table* should still be queryable.
await step('anon cannot read collections (RLS empty)', async () => {
  const { data, error } = await anon.from('collections').select('*');
  if (error) throw new Error(`unexpected error: ${error.message}`);
  if (data && data.length > 0) throw new Error(`expected no rows, got ${data.length}`);
  return 'returned empty (RLS blocking as expected)';
});

await step('anon cannot read sets (RLS empty)', async () => {
  const { data, error } = await anon.from('sets').select('*');
  if (error) throw new Error(`unexpected error: ${error.message}`);
  if (data && data.length > 0) throw new Error(`expected no rows, got ${data.length}`);
  return 'returned empty (RLS blocking as expected)';
});

// ---- Privacy: anon must NOT be able to read the temp claim map ----
// We revoked all grants from anon/authenticated on _firebase_uid_map,
// so this should error with permission denied (not return empty).
await step('anon CANNOT read _firebase_uid_map (revoked grants)', async () => {
  const { data, error } = await anon.from('_firebase_uid_map').select('*');
  if (error) {
    return `correctly blocked: ${error.message}`;
  }
  // PostgREST may return [] if it can't see the table at all. Either is acceptable
  // as long as no data leaks; the key check is data is empty.
  if (data && data.length > 0) {
    throw new Error(`SECURITY ISSUE: anon got ${data.length} rows from _firebase_uid_map`);
  }
  return 'returned empty (acceptable, but expected error)';
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

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
