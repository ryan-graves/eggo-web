import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const required = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  console.error('Run with: node --env-file=.env.local scripts/verify-firebase-creds.mjs');
  process.exit(1);
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

console.log(`Project:        ${projectId}`);
console.log(`Service account: ${clientEmail}`);
console.log(`Storage bucket: ${storageBucket}`);
console.log('');

try {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), storageBucket });
} catch (err) {
  console.error('FAIL: initializeApp threw:', err.message);
  process.exit(1);
}

let pass = 0;
let fail = 0;
const step = async (label, fn) => {
  try {
    const result = await fn();
    console.log(`PASS  ${label}${result ? ` — ${result}` : ''}`);
    pass++;
  } catch (err) {
    console.log(`FAIL  ${label}`);
    console.log(`      ${err.message}`);
    fail++;
  }
};

await step('Auth: listUsers (1)', async () => {
  const res = await getAuth().listUsers(1);
  return `${res.users.length} user(s) returned`;
});

await step('Auth: total user count', async () => {
  let count = 0;
  let token;
  do {
    const res = await getAuth().listUsers(1000, token);
    count += res.users.length;
    token = res.pageToken;
  } while (token);
  return `${count} total user(s)`;
});

await step('Firestore: read collections', async () => {
  const snap = await getFirestore().collection('collections').limit(5).get();
  return `${snap.size} collection doc(s)`;
});

await step('Firestore: read sets', async () => {
  const snap = await getFirestore().collection('sets').limit(5).get();
  return `${snap.size} set doc(s) (sample)`;
});

await step('Firestore: count sets', async () => {
  const snap = await getFirestore().collection('sets').count().get();
  return `${snap.data().count} total set(s)`;
});

await step('Firestore: read users (preferences)', async () => {
  const snap = await getFirestore().collection('users').limit(5).get();
  return `${snap.size} user-preference doc(s)`;
});

await step('Storage: bucket access + list processed-images/', async () => {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'processed-images/', maxResults: 5 });
  return `${files.length} file(s) in processed-images/ (sample)`;
});

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
