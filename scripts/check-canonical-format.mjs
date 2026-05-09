import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('firebase-export/export.json', 'utf-8'));

function classifyOwner(s) {
  const owners = Array.isArray(s.owners) ? s.owners : (typeof s.owner === 'string' ? [s.owner] : []);
  if (owners.length === 0) return 'empty';
  return owners.every((o) => /\s/.test(o)) ? 'full-name' : 'short-name';
}

const groups = new Map();
for (const s of data.sets) {
  const key = `${(s.collectionId ?? '').trim()}|${s.setNumber}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s);
}

// 1. Singletons: sets that appear exactly once
const singletonRows = [...groups.values()].filter((rows) => rows.length === 1).flat();

const singletonByDay = new Map();
const singletonByOwnerFormat = new Map();
for (const r of singletonRows) {
  const day = (r.createdAt ?? '').slice(0, 10);
  const fmt = classifyOwner(r);
  singletonByDay.set(day, (singletonByDay.get(day) ?? 0) + 1);
  singletonByOwnerFormat.set(fmt, (singletonByOwnerFormat.get(fmt) ?? 0) + 1);
}

console.log(`Singletons: ${singletonRows.length} rows`);
console.log('  By createdAt day:');
for (const [d, n] of [...singletonByDay.entries()].sort()) console.log(`    ${d}: ${n}`);
console.log('  By owner-format:');
for (const [f, n] of singletonByOwnerFormat) console.log(`    ${f}: ${n}`);
console.log('');

// 2. Post-Jan-27 sets specifically (the "late additions" that should reflect
//    current normal-use behavior, not bulk-import behavior)
const lateAdds = data.sets.filter((s) => s.createdAt && s.createdAt > '2026-01-28');
console.log(`Late additions (created after 2026-01-28): ${lateAdds.length} rows`);
for (const r of lateAdds) {
  const day = (r.createdAt ?? '').slice(0, 10);
  const owners = Array.isArray(r.owners) ? r.owners : r.owner;
  const collIdHasSpace = r.collectionId !== r.collectionId.trim();
  console.log(
    `  ${day}  ${r.setNumber}  owners=${JSON.stringify(owners)}  leadingSpace=${collIdHasSpace}  ` +
      `image=${r.customImageUrl ? (r.customImageUrl.startsWith('data:') ? 'data-url' : r.customImageUrl.includes('storage.googleapis.com') ? 'storage' : 'other') : (r.imageUrl ? 'imageUrl' : 'none')}`
  );
}
console.log('');

// 3. For each duplicate group, which row was created LAST?
const dupes = [...groups.entries()].filter(([, rows]) => rows.length > 1);
const lastInGroup = new Map();
for (const [, rows] of dupes) {
  const sorted = [...rows].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const last = sorted[0];
  const fmt = classifyOwner(last);
  const collIdHasSpace = last.collectionId !== last.collectionId.trim();
  const img = last.customImageUrl
    ? (last.customImageUrl.startsWith('data:') ? 'data-url' : last.customImageUrl.includes('storage.googleapis.com') ? 'storage' : 'other')
    : (last.imageUrl ? 'imageUrl' : 'none');
  const sig = `owners=${fmt} | leadingSpace=${collIdHasSpace} | image=${img}`;
  lastInGroup.set(sig, (lastInGroup.get(sig) ?? 0) + 1);
}
console.log('Latest row per duplicate group (signature):');
for (const [sig, n] of [...lastInGroup.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n}  ${sig}`);
}
