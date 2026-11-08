/**
 * Re-crops every existing background-removed image in Supabase Storage to
 * its opaque content, the way /api/remove-background now does for new ones.
 * Downloads each processed-images object referenced by a set's
 * custom_image_url, trims the transparent margins
 * (scripts/lib/trim-transparent.mjs), uploads it back in place, and points
 * every row that uses it at a fresh `?v=` so browsers don't keep showing the
 * old crop. No rembg calls, so no credits are spent.
 *
 * Modes:
 *   default          re-crop every set that has a processed image
 *   --dry-run        download + measure only; print what would change
 *   --one            process only the first eligible set (smoke check)
 *   --skip <num>     skip the first N eligible sets (for resuming)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (read from .env.local
 * by `set -a; source .env.local; set +a` before running).
 */

import { createClient } from '@supabase/supabase-js';
import { cutoutExtension, trimTransparentMargins } from './lib/trim-transparent.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const ONE = process.argv.includes('--one');
const SKIP = (() => {
  const i = process.argv.indexOf('--skip');
  return i >= 0 ? parseInt(process.argv[i + 1] ?? '0', 10) : 0;
})();

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
const BUCKET = 'processed-images';

const { data: sets, error } = await supabase
  .from('sets')
  .select('id, set_number, name, custom_image_url')
  .not('custom_image_url', 'is', null)
  .order('created_at', { ascending: true });
if (error) {
  console.error('Could not list sets:', error.message);
  process.exit(1);
}

// The Storage object lives at the path inside the URL, not necessarily at
// `{set.id}.png`: cloned rows (the dev test account) share the original
// set's object. Group rows by object so each image is processed once and
// every row that points at it gets the new version stamp.
function storagePathOf(url) {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

const byPath = new Map();
for (const set of sets) {
  const path = storagePathOf(set.custom_image_url);
  if (!path) continue;
  if (!byPath.has(path)) byPath.set(path, { path, rows: [] });
  byPath.get(path).rows.push(set);
}
let eligible = [...byPath.values()].slice(SKIP);
if (ONE) eligible = eligible.slice(0, 1);
const rowCount = eligible.reduce((n, e) => n + e.rows.length, 0);
console.log(
  `${eligible.length} image(s) across ${rowCount} set row(s) to ${DRY_RUN ? 'measure' : 're-crop'}${SKIP ? ` (skipped ${SKIP})` : ''}.`
);

let changed = 0;
let unchanged = 0;
let failed = 0;
for (const [index, { path, rows }] of eligible.entries()) {
  const set = rows[0];
  const label = `[${index + 1}/${eligible.length}] #${set.set_number} ${set.name}`;
  try {
    const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError) throw new Error(`download: ${downloadError.message}`);
    const original = Buffer.from(await file.arrayBuffer());
    const { buffer, format, contentType, trimmed, removedRatio } =
      await trimTransparentMargins(original);
    if (!trimmed) {
      unchanged++;
      console.log(`${label}: already tight`);
      continue;
    }
    const pct = `${Math.round(removedRatio * 100)}% empty space removed`;
    // Older uploads stored WebP bytes under a .png name; the re-upload goes
    // under the extension that matches the bytes, and the old object is
    // removed once every row points at the new one.
    const newPath = `${path.replace(/\.[a-z0-9]+$/i, '')}.${cutoutExtension(format)}`;
    const renamed = newPath !== path;
    if (DRY_RUN) {
      changed++;
      console.log(`${label}: would re-crop (${pct}${renamed ? `, ${format} → ${newPath}` : ''})`);
      continue;
    }
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, buffer, { contentType, cacheControl: '2592000', upsert: true });
    if (uploadError) throw new Error(`upload: ${uploadError.message}`);
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
    const { error: updateError } = await supabase
      .from('sets')
      .update({ custom_image_url: `${urlData.publicUrl}?v=${Date.now()}` })
      .in(
        'id',
        rows.map((r) => r.id)
      );
    if (updateError) throw new Error(`update: ${updateError.message}`);
    if (renamed) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
      if (removeError)
        console.warn(
          `${label}: new object in place but old ${path} not removed: ${removeError.message}`
        );
    }
    changed++;
    console.log(`${label}: re-cropped (${pct}${renamed ? `, now ${newPath}` : ''})`);
  } catch (err) {
    failed++;
    console.error(`${label}: FAILED ${err.message}`);
  }
}
console.log(
  `Done. ${changed} ${DRY_RUN ? 'would change' : 'changed'}, ${unchanged} already tight, ${failed} failed.`
);
