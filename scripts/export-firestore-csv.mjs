import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), storageBucket });

const OUT = join(process.cwd(), 'firebase-export');
mkdirSync(OUT, { recursive: true });

function normalize(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = normalize(v[k]);
    return out;
  }
  return v;
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  let s = (typeof v === 'object') ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

function unionColumns(rows, leadingKeys = ['id']) {
  const keys = new Set(leadingKeys);
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return [...keys];
}

const db = getFirestore();
const result = {};

console.log('Reading Firestore...\n');

const collectionsSnap = await db.collection('collections').get();
const collections = collectionsSnap.docs.map((d) => ({ id: d.id, ...normalize(d.data()) }));
result.collections = collections;
console.log(`  collections: ${collections.length}`);

const setsSnap = await db.collection('sets').get();
const sets = setsSnap.docs.map((d) => ({ id: d.id, ...normalize(d.data()) }));
result.sets = sets;
console.log(`  sets: ${sets.length}`);

const usersSnap = await db.collection('users').get();
const userPrefs = usersSnap.docs.map((d) => ({ id: d.id, ...normalize(d.data()) }));
result.user_preferences = userPrefs;
console.log(`  user_preferences: ${userPrefs.length}`);

console.log('\nReading Auth...\n');
const authUsers = [];
let pageToken;
do {
  const res = await getAuth().listUsers(1000, pageToken);
  for (const u of res.users) {
    authUsers.push({
      uid: u.uid,
      email: u.email ?? null,
      emailVerified: u.emailVerified,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
      disabled: u.disabled,
      createdAt: u.metadata.creationTime,
      lastSignedInAt: u.metadata.lastSignInTime,
      providers: u.providerData.map((p) => p.providerId),
    });
  }
  pageToken = res.pageToken;
} while (pageToken);
result.auth_users = authUsers;
console.log(`  auth_users: ${authUsers.length}`);

console.log('\nWriting files...\n');

writeFileSync(join(OUT, 'collections.csv'),
  toCsv(collections, unionColumns(collections)));
writeFileSync(join(OUT, 'sets.csv'),
  toCsv(sets, unionColumns(sets)));
writeFileSync(join(OUT, 'user_preferences.csv'),
  toCsv(userPrefs, unionColumns(userPrefs)));
writeFileSync(join(OUT, 'auth_users.csv'),
  toCsv(authUsers, unionColumns(authUsers, ['uid'])));

writeFileSync(join(OUT, 'export.json'), JSON.stringify(result, null, 2));

console.log(`Wrote to ${OUT}/`);
console.log(`  collections.csv       (${collections.length} rows)`);
console.log(`  sets.csv              (${sets.length} rows)`);
console.log(`  user_preferences.csv  (${userPrefs.length} rows)`);
console.log(`  auth_users.csv        (${authUsers.length} rows)`);
console.log(`  export.json           (full faithful copy, source of truth for migration)`);

const setsWithImageUrl = sets.filter((s) => s.imageUrl).length;
const setsWithCustomImageUrl = sets.filter((s) => s.customImageUrl).length;
const setsWithBrokenStorage = sets.filter(
  (s) => typeof s.customImageUrl === 'string' && s.customImageUrl.includes('storage.googleapis.com')
).length;
const setsWithDataUrl = sets.filter(
  (s) => typeof s.customImageUrl === 'string' && s.customImageUrl.startsWith('data:')
).length;
const setsWithNoImage = sets.filter((s) => !s.imageUrl && !s.customImageUrl).length;

console.log('\nImage-availability breakdown (for cross-check):');
console.log(`  total sets:                       ${sets.length}`);
console.log(`  with imageUrl:                    ${setsWithImageUrl}`);
console.log(`  with customImageUrl:              ${setsWithCustomImageUrl}`);
console.log(`    - broken (Firebase Storage):    ${setsWithBrokenStorage}`);
console.log(`    - inline base64 data URL:       ${setsWithDataUrl}`);
console.log(`  with no image at all:             ${setsWithNoImage}`);
