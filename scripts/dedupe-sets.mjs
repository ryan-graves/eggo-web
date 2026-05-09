/**
 * Cleans up the 58 duplicate (collection, set_number) groups in Supabase
 * and clears all image fields so a subsequent refresh pass can re-fetch
 * and re-process every image at the current resolution.
 *
 * Background (verified across three independent signals — see
 * scripts/audit-firestore-dupes.mjs and scripts/check-canonical-format.mjs):
 *   - All 29 singletons use short-name owners + clean collectionId.
 *   - All 6 post-Jan-27 additions (live-app writes) use the same.
 *   - The latest row in every duplicate group has the same.
 *
 * So the canonical row in each duplicate group is the one with short-name
 * owners (e.g. ["Ryan"]). The full-name owner rows (e.g. ["Ryan Graves"])
 * are abandoned earlier import attempts.
 *
 * Default mode is DRY-RUN. Pass --apply to execute the deletes + nulls.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const apply = process.argv.includes('--apply');

const { data: sets, error } = await supabase.from('sets').select('*');
if (error) {
  console.error(error.message);
  process.exit(1);
}

function isShortNameOwner(owners) {
  if (!Array.isArray(owners) || owners.length === 0) return false;
  return owners.every((o) => typeof o === 'string' && !/\s/.test(o));
}

function imageState(s) {
  if (s.custom_image_url) {
    if (s.custom_image_url.startsWith('data:')) return 'data-url';
    if (s.custom_image_url.includes('storage.googleapis.com')) return 'broken-firebase-storage';
    return 'other-customImage';
  }
  if (s.image_url) return 'imageUrl-only';
  return 'no-image';
}

function score(s) {
  // Canonical rows have short-name owners — they match what the live app
  // writes today and what every singleton uses.
  return isShortNameOwner(s.owners) ? 100 : 0;
}

const groups = new Map();
for (const s of sets) {
  const key = `${s.collection_id}|${s.set_number}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s);
}

const toDelete = [];
const groupReports = [];

for (const [key, rows] of groups) {
  if (rows.length === 1) continue;
  const ranked = [...rows]
    .map((r) => ({ row: r, score: score(r) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.row.updated_at ?? '').localeCompare(a.row.updated_at ?? '');
    });
  const winner = ranked[0].row;
  const losers = ranked.slice(1).map((r) => r.row);
  for (const l of losers) toDelete.push(l);
  groupReports.push({ key, winner, losers, ranked });
}

const survivingRows = sets.length - toDelete.length;

console.log(`Total rows: ${sets.length}`);
console.log(`Duplicate groups: ${groupReports.length}`);
console.log(`Rows to delete: ${toDelete.length}`);
console.log(`Rows after dedup: ${survivingRows}`);
console.log(`Rows that will have image fields nulled (all): ${survivingRows}`);
console.log(`Mode: ${apply ? 'APPLY (destructive)' : 'DRY RUN'}\n`);

console.log('--- First 5 group decisions ---');
for (const { key, winner, ranked } of groupReports.slice(0, 5)) {
  const [, setNumber] = key.split('|');
  console.log(`${setNumber} (${winner.name}):`);
  for (const { row, score: s } of ranked) {
    const tag = row.id === winner.id ? 'KEEP' : 'DROP';
    console.log(
      `  [${tag}] score=${s.toString().padStart(3)}  owners=${JSON.stringify(row.owners)}  ` +
        `dateRecvd=${row.date_received ?? 'null'}  image=${imageState(row)}  ` +
        `updated=${row.updated_at?.slice(0, 10)}`
    );
  }
}
console.log('');

// Sanity check: every winner should have short-name owners
const winnersByOwnerShape = new Map();
for (const { winner } of groupReports) {
  const shape = isShortNameOwner(winner.owners) ? 'short-name' : 'full-name';
  winnersByOwnerShape.set(shape, (winnersByOwnerShape.get(shape) ?? 0) + 1);
}
console.log('Winner owner-shape (should all be short-name):', Object.fromEntries(winnersByOwnerShape));
console.log('');

if (!apply) {
  console.log('Run with --apply to perform the deletes and image-field nulls.');
  process.exit(0);
}

// Phase 1: delete losers
console.log(`Deleting ${toDelete.length} rows...`);
const ids = toDelete.map((r) => r.id);
const BATCH = 100;
for (let i = 0; i < ids.length; i += BATCH) {
  const slice = ids.slice(i, i + BATCH);
  const { error: delErr } = await supabase.from('sets').delete().in('id', slice);
  if (delErr) {
    console.error(`Delete batch ${i / BATCH + 1} failed: ${delErr.message}`);
    process.exit(1);
  }
}

// Phase 2: null out image fields on all remaining rows
console.log('Nulling image_url and custom_image_url on all remaining rows...');
const { error: updErr } = await supabase
  .from('sets')
  .update({ image_url: null, custom_image_url: null })
  .not('id', 'is', null);
if (updErr) {
  console.error(`Image clear failed: ${updErr.message}`);
  process.exit(1);
}

// Final report
const { count } = await supabase.from('sets').select('*', { count: 'exact', head: true });
const { count: imageCount } = await supabase
  .from('sets')
  .select('*', { count: 'exact', head: true })
  .or('image_url.not.is.null,custom_image_url.not.is.null');
console.log(`\nDone. Rows: ${count}, rows with any image: ${imageCount} (should be 0).`);
