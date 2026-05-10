/**
 * Re-fetches metadata + processes images for every set in Supabase using the
 * same upstream services and image pipeline the live UI uses (Brickset → fallback
 * to Rebrickable → rembg.com → Supabase Storage). Inlines the upstream calls
 * directly so the script doesn't need a running Next.js server.
 *
 * Mirrors `refreshSetMetadata` in src/lib/supabase/sets.ts: each set gets
 * fresh name/pieceCount/year/theme/subtheme/imageUrl from the provider,
 * then a fresh background-removed PNG uploaded to the
 * `processed-images/{setId}.png` path in Supabase Storage. customImageUrl
 * ends up as the public Storage URL — same shape as what the UI's "refresh
 * metadata" button on the set detail page produces.
 *
 * Modes:
 *   default          process every set without a custom_image_url
 *   --force          re-process every set, even ones that already have one
 *   --one            process only the first eligible set (smoke check)
 *   --dry-run        skip the Storage upload and DB write, just print what
 *                    would happen
 *   --skip <num>     skip the first N eligible sets (for resuming after a crash)
 */

import { createClient } from '@supabase/supabase-js';

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const ONE = process.argv.includes('--one');
const SKIP = (() => {
  const i = process.argv.indexOf('--skip');
  return i >= 0 ? parseInt(process.argv[i + 1] ?? '0', 10) : 0;
})();

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'BRICKSET_API_KEY',
  'NEXT_PUBLIC_REBRICKABLE_API_KEY',
  'REMBG_API_KEY',
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

// ============================================================================
// Brickset lookup (matches FallbackProvider's primary path)
// ============================================================================

class NotFoundError extends Error {}

function normalizeSetNumber(n) {
  return n.includes('-') ? n : `${n}-1`;
}

function upgradeToLargeImage(url) {
  if (!url) return null;
  if (url.includes('images.brickset.com/sets/')) {
    return url.replace('/sets/small/', '/sets/large/').replace('/sets/images/', '/sets/large/');
  }
  return url;
}

async function bricksetLookup(setNumber) {
  const apiKey = process.env.BRICKSET_API_KEY;
  const url = new URL('https://brickset.com/api/v3.asmx/getSets');
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('userHash', '');
  url.searchParams.set('params', JSON.stringify({ setNumber: normalizeSetNumber(setNumber) }));

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Brickset HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'success') throw new Error(`Brickset: ${data.message ?? 'error'}`);
  if (data.matches === 0) return null;

  const set = data.sets[0];
  return {
    setNumber: set.number.replace(/-\d+$/, ''),
    name: set.name,
    year: set.year,
    pieceCount: set.pieces ?? null,
    theme: set.theme ?? null,
    subtheme: set.subtheme ?? null,
    imageUrl: upgradeToLargeImage(set.image.imageURL || set.image.thumbnailURL),
    sourceId: String(set.setID),
    dataSource: 'brickset',
  };
}

// ============================================================================
// Rebrickable lookup (matches FallbackProvider's fallback path)
// ============================================================================

const themeCache = new Map();

async function rebrickableFetch(endpoint) {
  const apiKey = process.env.NEXT_PUBLIC_REBRICKABLE_API_KEY;
  if (!apiKey) throw new Error('Rebrickable API key not configured');
  const res = await fetch(`https://rebrickable.com/api/v3${endpoint}`, {
    headers: { Authorization: `key ${apiKey}`, Accept: 'application/json' },
  });
  if (res.status === 404) throw new NotFoundError(`Not found: ${endpoint}`);
  if (!res.ok) throw new Error(`Rebrickable HTTP ${res.status}`);
  return res.json();
}

async function rebrickableTheme(id) {
  if (themeCache.has(id)) return themeCache.get(id);
  try {
    const t = await rebrickableFetch(`/lego/themes/${id}/`);
    themeCache.set(id, t);
    return t;
  } catch {
    return null;
  }
}

async function rebrickableLookup(setNumber) {
  const normalized = normalizeSetNumber(setNumber);
  let raw;
  try {
    raw = await rebrickableFetch(`/lego/sets/${normalized}/`);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }

  let theme = 'Unknown';
  let subtheme = null;
  const t = await rebrickableTheme(raw.theme_id);
  if (t) {
    if (t.parent_id) {
      const parent = await rebrickableTheme(t.parent_id);
      theme = parent?.name ?? t.name;
      subtheme = t.name;
    } else {
      theme = t.name;
    }
  }

  return {
    setNumber: raw.set_num.replace(/-\d+$/, ''),
    name: raw.name,
    year: raw.year,
    pieceCount: raw.num_parts ?? null,
    theme,
    subtheme,
    imageUrl: raw.set_img_url,
    sourceId: raw.set_num,
    dataSource: 'rebrickable',
  };
}

// ============================================================================
// FallbackProvider equivalent
// ============================================================================

async function lookupSet(setNumber) {
  try {
    const result = await bricksetLookup(setNumber);
    if (result) return result;
  } catch (err) {
    console.warn(`  brickset failed (${err.message}); trying rebrickable`);
  }
  return rebrickableLookup(setNumber);
}

// ============================================================================
// rembg.com background removal — same call shape as /api/remove-background
// ============================================================================

async function removeBackground(imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`fetch source image: HTTP ${imgRes.status}`);
  const imgBlob = await imgRes.blob();

  const form = new FormData();
  form.append('image', imgBlob, 'image.png');
  form.append('return_mask', 'false');
  form.append('post_process_mask', 'true');

  const res = await fetch('https://api.rembg.com/rmbg', {
    method: 'POST',
    headers: { 'x-api-key': process.env.REMBG_API_KEY },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`rembg HTTP ${res.status}: ${text}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ============================================================================
// Supabase Storage upload — same as uploadProcessedImage in lib/supabase/admin
// ============================================================================

async function uploadToStorage(buffer, setId) {
  const path = `${setId}.png`;
  const { error } = await supabase.storage
    .from('processed-images')
    .upload(path, buffer, { contentType: 'image/png', cacheControl: '2592000', upsert: true });
  if (error) throw new Error(`storage upload: ${error.message}`);
  const { data } = supabase.storage.from('processed-images').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================================
// Main loop
// ============================================================================

const { data: sets, error } = await supabase
  .from('sets')
  .select('*')
  .order('set_number');
if (error) {
  console.error('Failed to read sets:', error.message);
  process.exit(1);
}

let targets = FORCE ? sets : sets.filter((s) => !s.custom_image_url);
const totalEligible = targets.length;
if (SKIP > 0) targets = targets.slice(SKIP);
if (ONE) targets = targets.slice(0, 1);

console.log(`Sets total: ${sets.length}, eligible: ${totalEligible}, processing: ${targets.length}`);
console.log(`Mode: force=${FORCE}, dry-run=${DRY_RUN}, one=${ONE}, skip=${SKIP}`);
console.log('');

let success = 0;
let noProvider = 0;
let failed = 0;

for (let i = 0; i < targets.length; i++) {
  const s = targets[i];
  const idx = SKIP + i + 1;
  process.stdout.write(`[${idx}/${totalEligible}] ${s.set_number} ${s.name?.slice(0, 50) ?? ''} ... `);

  try {
    const lookup = await lookupSet(s.set_number);
    if (!lookup) {
      noProvider++;
      console.log('SKIP (no provider match)');
      continue;
    }

    if (!lookup.imageUrl) {
      // Provider returned metadata but no image. Update metadata fields,
      // leave images null, move on.
      if (!DRY_RUN) {
        await supabase
          .from('sets')
          .update({
            name: lookup.name,
            piece_count: lookup.pieceCount,
            year: lookup.year,
            theme: lookup.theme,
            subtheme: lookup.subtheme,
            data_source: lookup.dataSource,
            data_source_id: lookup.sourceId,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', s.id);
      }
      noProvider++;
      console.log('SKIP (no image from provider)');
      continue;
    }

    const buffer = await removeBackground(lookup.imageUrl);
    let publicUrl = null;
    if (!DRY_RUN) {
      publicUrl = await uploadToStorage(buffer, s.id);
      const { error: upErr } = await supabase
        .from('sets')
        .update({
          name: lookup.name,
          piece_count: lookup.pieceCount,
          year: lookup.year,
          theme: lookup.theme,
          subtheme: lookup.subtheme,
          image_url: lookup.imageUrl,
          custom_image_url: publicUrl,
          data_source: lookup.dataSource,
          data_source_id: lookup.sourceId,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', s.id);
      if (upErr) throw new Error(`db update: ${upErr.message}`);
    }
    success++;
    console.log(`OK (${(buffer.length / 1024).toFixed(1)} KB${publicUrl ? `, ${publicUrl.slice(-40)}` : ''})`);
  } catch (err) {
    failed++;
    console.log(`FAIL — ${err.message}`);
  }

  // Be polite to upstream APIs
  await new Promise((r) => setTimeout(r, 250));
}

console.log('');
console.log(`Success: ${success}`);
console.log(`Skipped (no provider image): ${noProvider}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('');
  console.log('Re-run with --skip <i> to resume from a specific index after fixing transient issues.');
  process.exit(1);
}
