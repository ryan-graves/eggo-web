/**
 * Utility: download Brickset box images for a list of set numbers and run
 * each through the rembg.com background-removal pipeline so they match
 * the cutout look of the rest of the marketing catalog tiles.
 *
 * Reads REMBG_API_KEY from .env.local. Writes PNGs to
 * public/marketing/sets/{setNumber}-1.png — same path the HERO_SETS
 * factory in src/app/page.tsx expects.
 *
 * Mirrors the rembg call shape in src/app/api/remove-background/route.ts
 * (multipart, return_mask=false, post_process_mask=true).
 *
 * Re-run whenever the HERO_SETS list changes: set the SETS array below to the
 * new set numbers and run `node scripts/process-marketing-sets.mjs`. Existing
 * PNGs are skipped, so it only fetches what's missing.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'marketing', 'sets');

// Cheap .env.local loader so we don't pull in dotenv just for this.
const envPath = join(ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const REMBG_API_KEY = process.env.REMBG_API_KEY;
if (!REMBG_API_KEY) {
  console.error('REMBG_API_KEY not set');
  process.exit(1);
}

const SETS = ['10318', '21333', '10300', '21322', '10497'];
const REMBG_URL = 'https://api.rembg.com/rmbg';

for (const setNumber of SETS) {
  const outPath = join(OUT_DIR, `${setNumber}-1.png`);
  if (existsSync(outPath)) {
    console.log(`↷ ${setNumber}: already exists, skipping`);
    continue;
  }

  const sourceUrl = `https://images.brickset.com/sets/large/${setNumber}-1.jpg`;
  console.log(`→ ${setNumber}: fetching ${sourceUrl}`);
  const sourceRes = await fetch(sourceUrl);
  if (!sourceRes.ok) {
    console.error(`✗ ${setNumber}: brickset fetch ${sourceRes.status}`);
    continue;
  }
  const sourceBlob = await sourceRes.blob();

  const form = new FormData();
  form.append('image', sourceBlob, 'image.jpg');
  form.append('return_mask', 'false');
  form.append('post_process_mask', 'true');

  console.log(`  rembg…`);
  const rembgRes = await fetch(REMBG_URL, {
    method: 'POST',
    headers: { 'x-api-key': REMBG_API_KEY },
    body: form,
  });
  if (!rembgRes.ok) {
    console.error(`✗ ${setNumber}: rembg ${rembgRes.status}: ${await rembgRes.text()}`);
    continue;
  }

  const buf = Buffer.from(await rembgRes.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log(`✓ ${setNumber}: ${buf.length.toLocaleString()} bytes → ${outPath}`);
}
