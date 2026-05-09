import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), storageBucket });

const OUT_DIR = join(process.cwd(), 'firebase-storage-export');
mkdirSync(OUT_DIR, { recursive: true });

const bucket = getStorage().bucket();
console.log(`Bucket: ${bucket.name}`);
console.log(`Output: ${OUT_DIR}\n`);

const [files] = await bucket.getFiles();
console.log(`Found ${files.length} object(s) in bucket\n`);

let ok = 0;
let failed = 0;
let skipped = 0;
let totalBytes = 0;
const failures = [];

for (const file of files) {
  const localPath = join(OUT_DIR, file.name);
  mkdirSync(dirname(localPath), { recursive: true });

  if (existsSync(localPath)) {
    const sz = statSync(localPath).size;
    if (sz > 0) {
      skipped++;
      totalBytes += sz;
      continue;
    }
  }

  try {
    await file.download({ destination: localPath });
    const sz = statSync(localPath).size;
    totalBytes += sz;
    ok++;
    process.stdout.write(`  [${ok + skipped}/${files.length}] ${file.name} (${(sz/1024).toFixed(1)} KB)\n`);
  } catch (err) {
    failed++;
    failures.push({ name: file.name, error: err.message });
    process.stdout.write(`  FAIL ${file.name} — ${err.message}\n`);
  }
}

console.log('');
console.log(`Downloaded: ${ok}`);
console.log(`Already present (skipped): ${skipped}`);
console.log(`Failed: ${failed}`);
console.log(`Total bytes on disk: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
}
