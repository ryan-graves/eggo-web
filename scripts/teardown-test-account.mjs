/**
 * Fully delete the disposable local test account and its seed data.
 *
 * Deletes the is_seed_data collections (sets → members → collection) the test
 * user owns, then deletes the auth user itself. Use when you're done testing
 * and want a clean slate (the seed script is idempotent for reseeding, so this
 * is only needed for full removal).
 *
 * Safety: operates ONLY on the DEV_LOGIN_EMAIL user when it is flagged
 * app_metadata.seed = true, and only deletes is_seed_data collections. Refuses
 * to touch a non-seed account. Idempotent: a no-op if the account is gone.
 *
 * Run: node scripts/teardown-test-account.mjs
 */

import {
  getConfig,
  makeAdmin,
  findUserByEmail,
  isSeedUser,
  seedCollectionIdsForUser,
  wipeCollection,
} from './lib/test-account.mjs';

async function main() {
  const cfg = getConfig();
  const admin = makeAdmin(cfg);

  const test = await findUserByEmail(admin, cfg.testEmail);
  if (!test) {
    console.log(`No user found for ${cfg.testEmail}. Nothing to tear down.`);
    return;
  }
  if (!isSeedUser(test)) {
    throw new Error(
      `Refusing to delete ${cfg.testEmail}: it is NOT flagged app_metadata.seed = true. ` +
      `This script only removes disposable seed accounts.`
    );
  }

  const seedCollections = await seedCollectionIdsForUser(admin, test.id);
  for (const cid of seedCollections) await wipeCollection(admin, cid);
  console.log(`Deleted ${seedCollections.length} seed collection(s) and their sets.`);

  const { error } = await admin.auth.admin.deleteUser(test.id);
  if (error) throw new Error(`deleteUser: ${error.message}`);
  console.log(`Deleted seed test user ${cfg.testEmail} (${test.id}).`);
  console.log('Teardown complete.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
