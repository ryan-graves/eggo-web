/**
 * Seed a disposable local test account that mirrors a real account.
 *
 * Creates (or reuses) a dedicated Supabase auth user — the one named in
 * DEV_LOGIN_EMAIL — and clones the collections + sets of the real account in
 * DEV_LOGIN_SOURCE_EMAIL into fresh collections owned by the test user. The
 * clone is functionally identical to production data (same set metadata,
 * statuses, owners, and image URLs — images are public Storage URLs, so no
 * file copying is needed) but completely independent: adding, editing, or
 * deleting sets on the test account never touches the real one.
 *
 * Safety: the test user is flagged with app_metadata.seed = true and the cloned
 * collections with is_seed_data = true. The script refuses to reuse an existing
 * account that is NOT flagged seed (so a misconfigured DEV_LOGIN_EMAIL can't
 * password-reset or wipe a real account), and only ever deletes is_seed_data
 * collections. Idempotent: re-running wipes the prior clone and re-clones.
 *
 * Prereq: migration 0008_add_seed_flag_to_collections.sql must be applied.
 *
 * Run: node scripts/seed-test-account.mjs
 *
 * Required env (.env.local, never production): NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SECRET_KEY, DEV_LOGIN_SOURCE_EMAIL, DEV_LOGIN_EMAIL, DEV_LOGIN_PASSWORD.
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
  const cfg = getConfig({ requireSource: true });
  if (cfg.testEmail.toLowerCase() === cfg.sourceEmail.toLowerCase()) {
    throw new Error('DEV_LOGIN_EMAIL must differ from DEV_LOGIN_SOURCE_EMAIL — refusing to clone an account onto itself.');
  }
  const admin = makeAdmin(cfg);

  console.log(`Cloning ${cfg.sourceEmail} → ${cfg.testEmail}`);

  const source = await findUserByEmail(admin, cfg.sourceEmail);
  if (!source) throw new Error(`Source user ${cfg.sourceEmail} not found.`);

  // Source collections (no seed filter — we read the real ones to clone).
  const { data: sourceMemberships, error: memErr } = await admin
    .from('collection_members')
    .select('collection_id')
    .eq('user_id', source.id);
  if (memErr) throw new Error(memErr.message);
  const sourceCollectionIds = sourceMemberships.map((m) => m.collection_id);
  if (sourceCollectionIds.length === 0) throw new Error('Source user has no collections to clone.');
  console.log(`Source has ${sourceCollectionIds.length} collection(s).`);

  // Test user: create flagged, or reuse only if already flagged seed.
  let test = await findUserByEmail(admin, cfg.testEmail);
  if (!test) {
    const { data, error } = await admin.auth.admin.createUser({
      email: cfg.testEmail,
      password: cfg.testPassword,
      email_confirm: true,
      app_metadata: { seed: true },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    test = data.user;
    console.log(`Created seed test user ${cfg.testEmail} (${test.id}).`);
  } else if (!isSeedUser(test)) {
    throw new Error(
      `Refusing to touch ${cfg.testEmail}: it exists but is NOT flagged app_metadata.seed = true. ` +
      `If this is meant to be the throwaway test account, delete it first; otherwise fix DEV_LOGIN_EMAIL.`
    );
  } else {
    const { error } = await admin.auth.admin.updateUserById(test.id, {
      password: cfg.testPassword,
      app_metadata: { seed: true },
    });
    if (error) throw new Error(`updateUserById: ${error.message}`);
    console.log(`Reusing seed test user ${cfg.testEmail} (${test.id}); password reset.`);
  }

  // Wipe only this user's prior SEED collections (never a real one).
  const priorSeed = await seedCollectionIdsForUser(admin, test.id);
  for (const cid of priorSeed) await wipeCollection(admin, cid);
  if (priorSeed.length) console.log(`Wiped ${priorSeed.length} prior seed collection(s).`);

  let totalSets = 0;
  for (const sourceId of sourceCollectionIds) {
    const { data: coll, error: collErr } = await admin
      .from('collections')
      .select('*')
      .eq('id', sourceId)
      .single();
    if (collErr) throw new Error(`read collection: ${collErr.message}`);

    const { data: newColl, error: insErr } = await admin
      .from('collections')
      .insert({
        name: `${coll.name} (Test)`,
        owners: coll.owners ?? [],
        is_public: false,
        is_seed_data: true,
        home_sections: coll.home_sections ?? null,
      })
      .select('id')
      .single();
    if (insErr) {
      if (insErr.code === '42703') {
        throw new Error('collections.is_seed_data does not exist — apply migration 0008 first.');
      }
      throw new Error(`insert collection: ${insErr.message}`);
    }

    const { error: memberErr } = await admin
      .from('collection_members')
      .insert({ collection_id: newColl.id, user_id: test.id });
    if (memberErr) throw new Error(`insert member: ${memberErr.message}`);

    const { data: sets, error: setsErr } = await admin
      .from('sets')
      .select('*')
      .eq('collection_id', sourceId);
    if (setsErr) throw new Error(`read sets: ${setsErr.message}`);

    const rows = sets.map((s) => {
      // Clone every column except the DB-managed ones; retarget the collection.
      const row = { ...s, collection_id: newColl.id };
      delete row.id;
      delete row.created_at;
      delete row.updated_at;
      return row;
    });
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from('sets').insert(rows.slice(i, i + 500));
      if (error) throw new Error(`insert sets: ${error.message}`);
    }
    totalSets += rows.length;
    console.log(`  Cloned "${coll.name}" → "${coll.name} (Test)" (${newColl.id}) with ${rows.length} sets.`);
  }

  console.log(`Done. Test account has ${sourceCollectionIds.length} collection(s) and ${totalSets} sets.`);
  console.log(`Sign in locally via /dev-login (password sign-in as ${cfg.testEmail}).`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
