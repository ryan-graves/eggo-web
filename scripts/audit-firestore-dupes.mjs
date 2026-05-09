/**
 * Reads firebase-export/export.json and characterizes each duplicate
 * group by Firestore-side metadata (createdAt, collectionId-with-or-
 * without leading space, owner-name shape, image state) to see if a
 * specific bulk-import event introduced the bad rows.
 */

import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('firebase-export/export.json', 'utf-8'));

function imageState(s) {
  if (s.customImageUrl) {
    if (typeof s.customImageUrl === 'string' && s.customImageUrl.startsWith('data:')) return 'data-url';
    if (typeof s.customImageUrl === 'string' && s.customImageUrl.includes('storage.googleapis.com')) return 'broken-firebase-storage';
    return 'other-customImage';
  }
  if (s.imageUrl) return 'imageUrl-only';
  return 'no-image';
}

function ownerShape(s) {
  const owners = Array.isArray(s.owners) ? s.owners : (typeof s.owner === 'string' ? [s.owner] : []);
  if (owners.length === 0) return 'empty';
  return owners.every((o) => /\s/.test(o)) ? 'full-names' : 'short-names';
}

const groups = new Map();
for (const s of data.sets) {
  const trimmedColl = (s.collectionId ?? '').trim();
  const key = `${trimmedColl}|${s.setNumber}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s);
}

const dupes = [...groups.entries()].filter(([, rows]) => rows.length > 1);

console.log(`${dupes.length} duplicate groups across ${data.sets.length} total sets\n`);

// Per-row buckets to see correlations
const buckets = new Map();
for (const [, rows] of dupes) {
  for (const r of rows) {
    const hadLeadingSpace = r.collectionId !== r.collectionId.trim();
    const owner = ownerShape(r);
    const img = imageState(r);
    const created = r.createdAt ? r.createdAt.slice(0, 10) : 'unknown';
    const key = `leadingSpace=${hadLeadingSpace} | owners=${owner} | image=${img} | createdDay=${created}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
}
console.log('Cross-tab of (leadingSpace, ownerShape, imageState, createdAt-day) over rows in duplicate groups:');
const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, n] of sorted) console.log(`  ${n.toString().padStart(4)}  ${k}`);
console.log('');

// Distribution of createdAt-day across ALL duplicate-group rows
const dayCounts = new Map();
for (const [, rows] of dupes) {
  for (const r of rows) {
    const day = r.createdAt ? r.createdAt.slice(0, 10) : 'unknown';
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
}
console.log(`Distribution of createdAt-day across ${[...dayCounts.values()].reduce((a, b) => a + b, 0)} rows in duplicate groups:`);
for (const [day, n] of [...dayCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(4)}  ${day}`);
}
console.log('');

// Same for non-duplicate (singleton) sets, for comparison
const singletons = [...groups.entries()].filter(([, rows]) => rows.length === 1).flatMap(([, rows]) => rows);
const singletonDayCounts = new Map();
for (const r of singletons) {
  const day = r.createdAt ? r.createdAt.slice(0, 10) : 'unknown';
  singletonDayCounts.set(day, (singletonDayCounts.get(day) ?? 0) + 1);
}
console.log(`Distribution of createdAt-day across ${singletons.length} singleton sets (for contrast):`);
for (const [day, n] of [...singletonDayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${n.toString().padStart(4)}  ${day}`);
}
console.log('');

// Pull out a few example groups with full timestamps
console.log('Sample 5 duplicate groups with full createdAt:');
for (const [key, rows] of dupes.slice(0, 5)) {
  const [, setNumber] = key.split('|');
  console.log(`  ${setNumber} (${rows[0].name}):`);
  for (const r of rows) {
    const hadLeadingSpace = r.collectionId !== r.collectionId.trim();
    console.log(`    createdAt=${r.createdAt}  leadingSpace=${hadLeadingSpace}  owners=${JSON.stringify(r.owners ?? r.owner ?? null)}  image=${imageState(r)}`);
  }
}
