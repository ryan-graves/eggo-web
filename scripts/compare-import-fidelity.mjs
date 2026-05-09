/**
 * Verifies field-level fidelity between firebase-export/export.json and the
 * imported Supabase rows. Matches by (set_number, name, created_at) since
 * the destination uses freshly generated UUIDs.
 *
 * Reports mismatches and aggregate fingerprints (status / theme / owner
 * distributions, total piece counts) so we can confirm the import preserved
 * not just counts but also the per-row content.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error('Missing env vars; run with --env-file=.env.local');
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

const exportData = JSON.parse(readFileSync(join(process.cwd(), 'firebase-export/export.json'), 'utf-8'));

// ---- Pull all imported data ----
const { data: dbSets } = await supabase.from('sets').select('*');
const { data: dbCollections } = await supabase.from('collections').select('*');
const { data: dbPrefs } = await supabase.from('user_preferences').select('*');
const { data: dbMembers } = await supabase.from('collection_members').select('*');
const { data: dbMap } = await supabase.from('_firebase_uid_map').select('*');

console.log(`Source: ${exportData.sets.length} sets, ${exportData.collections.length} collections, ` +
  `${exportData.user_preferences.length} prefs, ${exportData.auth_users.length} auth users`);
console.log(`Destination: ${dbSets.length} sets, ${dbCollections.length} collections, ` +
  `${dbPrefs.length} prefs, ${dbMap.length} map rows, ${dbMembers.length} members\n`);

// ---- Aggregate fingerprints: distributions should be identical ----
function distribution(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const v = r[key] ?? 'null';
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Object.fromEntries([...m.entries()].sort());
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const srcStatus = distribution(exportData.sets, 'status');
const dstStatus = distribution(dbSets, 'status');
console.log(`status distribution match: ${deepEqual(srcStatus, dstStatus)}`);
if (!deepEqual(srcStatus, dstStatus)) {
  console.log('  src:', srcStatus);
  console.log('  dst:', dstStatus);
}

// theme distribution
function themeDist(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const v = r[key] ?? 'null';
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Object.fromEntries([...m.entries()].sort());
}
const srcTheme = themeDist(exportData.sets, 'theme');
const dstTheme = themeDist(dbSets, 'theme');
console.log(`theme distribution match: ${deepEqual(srcTheme, dstTheme)}`);
if (!deepEqual(srcTheme, dstTheme)) {
  console.log('  src:', srcTheme);
  console.log('  dst:', dstTheme);
}

// piece count totals
function sumPieces(rows, key) {
  return rows.reduce((acc, r) => acc + (typeof r[key] === 'number' ? r[key] : 0), 0);
}
const srcPieces = sumPieces(exportData.sets, 'pieceCount');
const dstPieces = sumPieces(dbSets, 'piece_count');
console.log(`total piece_count: src=${srcPieces}  dst=${dstPieces}  match=${srcPieces === dstPieces}`);

// data_source distribution
const srcSource = distribution(exportData.sets, 'dataSource');
const dstSource = distribution(dbSets, 'data_source');
console.log(`data_source distribution match: ${deepEqual(srcSource, dstSource)}`);

// owner-array fingerprint: count rows per (sorted-owners-string)
function ownersDist(rows, normalizer) {
  const m = new Map();
  for (const r of rows) {
    const owners = normalizer(r);
    const key = JSON.stringify([...owners].sort());
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...m.entries()].sort());
}
const srcOwners = ownersDist(exportData.sets, (s) => {
  if (Array.isArray(s.owners)) return s.owners;
  if (typeof s.owner === 'string' && s.owner) return [s.owner];
  return [];
});
const dstOwners = ownersDist(dbSets, (s) => s.owners ?? []);
console.log(`owners distribution match: ${deepEqual(srcOwners, dstOwners)}`);
if (!deepEqual(srcOwners, dstOwners)) {
  console.log('  src:', srcOwners);
  console.log('  dst:', dstOwners);
}

// imageUrl / customImageUrl presence
const srcImage = exportData.sets.filter((s) => s.imageUrl).length;
const dstImage = dbSets.filter((s) => s.image_url).length;
console.log(`with imageUrl: src=${srcImage}  dst=${dstImage}  match=${srcImage === dstImage}`);
const srcCustom = exportData.sets.filter((s) => s.customImageUrl).length;
const dstCustom = dbSets.filter((s) => s.custom_image_url).length;
console.log(`with customImageUrl: src=${srcCustom}  dst=${dstCustom}  match=${srcCustom === dstCustom}`);

// ---- Per-row matching by (set_number, name, created_at) ----
console.log('\nPer-row matching by (set_number, name, created_at):');

function rowKey(s) {
  // Normalize timestamps to epoch ms so Postgres's microsecond+offset format
  // and Firestore's millisecond+Z format compare equal.
  const ts = s.created_at ?? s.createdAt;
  const ms = ts ? Date.parse(ts) : 0;
  return `${s.set_number ?? s.setNumber}|${s.name}|${ms}`;
}

const dstByKey = new Map();
for (const s of dbSets) {
  const k = rowKey(s);
  if (!dstByKey.has(k)) dstByKey.set(k, []);
  dstByKey.get(k).push(s);
}

let matched = 0;
let missing = 0;
let mismatched = 0;
const mismatches = [];

for (const src of exportData.sets) {
  const k = rowKey(src);
  const candidates = dstByKey.get(k) ?? [];
  if (candidates.length === 0) {
    missing++;
    continue;
  }
  // pop one candidate (handles dupes — multiple copies of same set)
  const dst = candidates.shift();

  // Compare critical fields
  const fields = [
    ['status', src.status, dst.status],
    ['year', src.year ?? null, dst.year],
    ['piece_count', src.pieceCount ?? null, dst.piece_count],
    ['theme', src.theme ?? null, dst.theme],
    ['subtheme', src.subtheme ?? null, dst.subtheme],
    ['data_source', src.dataSource, dst.data_source],
    ['has_been_assembled', src.hasBeenAssembled ?? false, dst.has_been_assembled],
    ['date_received', src.dateReceived ?? null, dst.date_received],
    ['notes', src.notes ?? null, dst.notes],
    ['occasion', src.occasion ?? null, dst.occasion],
  ];

  const rowMismatches = fields.filter(([, a, b]) => !deepEqual(a, b));
  if (rowMismatches.length > 0) {
    mismatched++;
    mismatches.push({ setNumber: src.setNumber, name: src.name, fields: rowMismatches });
  } else {
    matched++;
  }
}

console.log(`  matched: ${matched}`);
console.log(`  missing in dst: ${missing}`);
console.log(`  mismatched fields: ${mismatched}`);

if (mismatches.length > 0) {
  console.log('\nFirst 5 mismatches:');
  for (const m of mismatches.slice(0, 5)) {
    console.log(`  ${m.setNumber} ${m.name}:`);
    for (const [field, src, dst] of m.fields) {
      console.log(`    ${field}: src=${JSON.stringify(src)} dst=${JSON.stringify(dst)}`);
    }
  }
}

// Any extra rows in dst not consumed?
let extra = 0;
for (const candidates of dstByKey.values()) extra += candidates.length;
console.log(`\nExtra (unmatched-from-source) rows in dst: ${extra}`);

// ---- collections / prefs / map sanity ----
console.log('\nCollections in dst:');
for (const c of dbCollections) {
  console.log(`  ${c.name}: is_public=${c.is_public}, owners=${JSON.stringify(c.owners)}`);
}
console.log('\nUser preferences in dst:');
for (const p of dbPrefs) {
  console.log(`  firebase_uid=${p.firebase_uid}, theme=${p.theme}, ui_theme=${p.ui_theme}, has_home_sections=${!!p.home_sections}`);
}
console.log('\n_firebase_uid_map rows:');
for (const m of dbMap) {
  console.log(`  ${m.firebase_uid} → ${m.email}`);
}

const ok = matched === exportData.sets.length && missing === 0 && mismatched === 0 && extra === 0;
console.log(`\n${ok ? 'ALL FIDELITY CHECKS PASSED' : 'FIDELITY ISSUES DETECTED'}`);
process.exit(ok ? 0 : 1);
