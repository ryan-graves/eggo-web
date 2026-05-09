import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), storageBucket });

const db = getFirestore();
const bucket = getStorage().bucket();

console.log('=== Sample 5 sets and their image fields ===\n');
const setsSnap = await db.collection('sets').limit(5).get();
const samples = [];
setsSnap.forEach((doc) => {
  const d = doc.data();
  samples.push({
    id: doc.id,
    setNumber: d.setNumber,
    imageUrl: d.imageUrl ?? null,
    customImageUrl: d.customImageUrl ?? null,
  });
});
console.log(JSON.stringify(samples, null, 2));

console.log('\n=== Counts: how many sets have each kind of image? ===\n');
const allSnap = await db.collection('sets').get();
let withImageUrl = 0;
let withCustomImageUrl = 0;
let customIsFirebaseStorage = 0;
let customIsDataUrl = 0;
let customIsOther = 0;
let imageUrlIsFirebaseStorage = 0;
const distinctCustomHosts = new Map();
allSnap.forEach((doc) => {
  const d = doc.data();
  if (d.imageUrl) {
    withImageUrl++;
    if (typeof d.imageUrl === 'string' && d.imageUrl.includes('storage.googleapis.com')) {
      imageUrlIsFirebaseStorage++;
    }
  }
  if (d.customImageUrl) {
    withCustomImageUrl++;
    const u = String(d.customImageUrl);
    if (u.startsWith('data:')) customIsDataUrl++;
    else if (u.includes('storage.googleapis.com') || u.includes('firebasestorage')) {
      customIsFirebaseStorage++;
      try {
        const host = new URL(u).host;
        distinctCustomHosts.set(host, (distinctCustomHosts.get(host) ?? 0) + 1);
      } catch {}
    } else customIsOther++;
  }
});
console.log(`Total sets: ${allSnap.size}`);
console.log(`  With imageUrl: ${withImageUrl} (${imageUrlIsFirebaseStorage} are Firebase Storage URLs)`);
console.log(`  With customImageUrl: ${withCustomImageUrl}`);
console.log(`    - data: URL (base64): ${customIsDataUrl}`);
console.log(`    - Firebase Storage URL: ${customIsFirebaseStorage}`);
console.log(`    - Other: ${customIsOther}`);
console.log(`  Distinct customImageUrl hosts:`);
for (const [host, n] of distinctCustomHosts) console.log(`    ${host}: ${n}`);

console.log('\n=== Public-URL fetch test (3 representative URLs) ===\n');
const urlsToTest = [];
let firstFirebase = null;
let firstExternal = null;
allSnap.forEach((doc) => {
  const d = doc.data();
  const u = d.customImageUrl || d.imageUrl;
  if (!u || typeof u !== 'string' || u.startsWith('data:')) return;
  if (!firstFirebase && u.includes('storage.googleapis.com')) firstFirebase = u;
  if (!firstExternal && !u.includes('storage.googleapis.com') && !u.includes('firebasestorage')) firstExternal = u;
});
if (firstFirebase) urlsToTest.push({ label: 'Firebase Storage URL', url: firstFirebase });
if (firstExternal) urlsToTest.push({ label: 'External (Brickset/etc)', url: firstExternal });

const [firstStorageFile] = await bucket.getFiles({ prefix: 'processed-images/', maxResults: 1 });
if (firstStorageFile.length) {
  const direct = `https://storage.googleapis.com/${bucket.name}/${firstStorageFile[0].name}`;
  urlsToTest.push({ label: 'Direct GCS URL (from listing)', url: direct });
}

for (const { label, url } of urlsToTest) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`${label}: ${res.status} ${res.statusText}`);
    console.log(`  ${url}`);
  } catch (err) {
    console.log(`${label}: FETCH ERROR — ${err.message}`);
    console.log(`  ${url}`);
  }
}
