/**
 * Surfaces every set_number that appears more than once within the same
 * collection, with field-level differences so we can tell legit
 * "user owns two copies" from accidental duplicates.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const { data: sets, error } = await supabase.from('sets').select('*');
if (error) {
  console.error(error.message);
  process.exit(1);
}

const groups = new Map();
for (const s of sets) {
  const key = `${s.collection_id}|${s.set_number}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s);
}

const dupes = [...groups.entries()]
  .filter(([, rows]) => rows.length > 1)
  .sort(([, a], [, b]) => b.length - a.length);

console.log(`Total sets: ${sets.length}`);
console.log(`Unique (collection, set_number) pairs with multiple rows: ${dupes.length}\n`);

const byCount = new Map();
for (const [, rows] of dupes) {
  byCount.set(rows.length, (byCount.get(rows.length) ?? 0) + 1);
}
console.log('Duplication counts (groupSize → numGroups):', Object.fromEntries(byCount));
console.log('');

for (const [key, rows] of dupes) {
  const [, setNumber] = key.split('|');
  console.log(`${setNumber} (${rows[0].name}) — ${rows.length} copies:`);
  rows.forEach((r, i) => {
    const imageState = r.custom_image_url
      ? r.custom_image_url.startsWith('data:')
        ? 'data-url'
        : r.custom_image_url.includes('storage.googleapis.com')
          ? 'broken-firebase-storage'
          : 'other-customImage'
      : r.image_url
        ? 'imageUrl-only'
        : 'no-image';
    console.log(
      `  [${i}] status=${r.status}  owners=${JSON.stringify(r.owners)}  ` +
        `dateReceived=${r.date_received ?? 'null'}  occasion=${(r.occasion || '').slice(0, 40) || 'null'}  ` +
        `notes_len=${(r.notes || '').length}  image=${imageState}  ` +
        `created=${r.created_at.slice(0, 10)}`
    );
  });
  console.log('');
}
