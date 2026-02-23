#!/usr/bin/env node
'use strict';

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infynd';
const DRY_RUN = process.env.DRY_RUN === 'true';

async function migrate() {
  console.log('🚀 Starting database migration...\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`MongoDB URI: ${MONGODB_URI}\n`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const usersCollection = db.collection('users');

    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 Total users: ${totalUsers}\n`);

    // Step 1: Add userId
    console.log('Step 1: Adding userId field...');
    const usersWithoutUserId = await usersCollection.countDocuments({ userId: { $exists: false } });
    console.log(`  Found ${usersWithoutUserId} users without userId`);

    if (usersWithoutUserId > 0 && !DRY_RUN) {
      const cursor = usersCollection.find({ userId: { $exists: false } });
      let updated = 0;

      while (await cursor.hasNext()) {
        const user = await cursor.next();
        const userId = crypto.randomBytes(16).toString('hex');
        await usersCollection.updateOne({ _id: user._id }, { $set: { userId } });
        updated++;
        if (updated % 100 === 0) console.log(`  Progress: ${updated}/${usersWithoutUserId}`);
      }
      console.log(`  ✅ Added userId to ${updated} users\n`);
    } else if (DRY_RUN) {
      console.log(`  [DRY RUN] Would add userId to ${usersWithoutUserId} users\n`);
    } else {
      console.log(`  ✅ All users have userId\n`);
    }

    // Step 2: Rename email → emailAddress
    console.log('Step 2: Renaming email → emailAddress...');
    const usersWithEmail = await usersCollection.countDocuments({ email: { $exists: true } });
    if (usersWithEmail > 0 && !DRY_RUN) {
      const result = await usersCollection.updateMany({}, { $rename: { email: 'emailAddress' } });
      console.log(`  ✅ Renamed ${result.modifiedCount} users\n`);
    } else if (DRY_RUN) {
      console.log(`  [DRY RUN] Would rename ${usersWithEmail} users\n`);
    } else {
      console.log(`  ✅ Already migrated\n`);
    }

    // Step 3: Remove tenantId
    console.log('Step 3: Removing tenantId...');
    const usersWithTenantId = await usersCollection.countDocuments({ tenantId: { $exists: true } });
    if (usersWithTenantId > 0 && !DRY_RUN) {
      const result = await usersCollection.updateMany({}, { $unset: { tenantId: '' } });
      console.log(`  ✅ Removed from ${result.modifiedCount} users\n`);
    } else if (DRY_RUN) {
      console.log(`  [DRY RUN] Would remove from ${usersWithTenantId} users\n`);
    } else {
      console.log(`  ✅ Already removed\n`);
    }

    // Step 4: Remove creditState
    console.log('Step 4: Removing creditState...');
    const usersWithCreditState = await usersCollection.countDocuments({ creditState: { $exists: true } });
    if (usersWithCreditState > 0 && !DRY_RUN) {
      const result = await usersCollection.updateMany({}, { $unset: { creditState: '' } });
      console.log(`  ✅ Removed from ${result.modifiedCount} users\n`);
    } else if (DRY_RUN) {
      console.log(`  [DRY RUN] Would remove from ${usersWithCreditState} users\n`);
    } else {
      console.log(`  ✅ Already removed\n`);
    }

    // Step 5: Update indexes
    console.log('Step 5: Updating indexes...');
    if (!DRY_RUN) {
      try {
        await usersCollection.dropIndex('email_1_tenantId_1');
        console.log('  ✅ Dropped: email_1_tenantId_1');
      } catch (err) {
        console.log('  ℹ️  Index email_1_tenantId_1 not found');
      }

      await usersCollection.createIndex({ userId: 1 }, { unique: true });
      console.log('  ✅ Created: userId_1 (unique)');

      await usersCollection.createIndex({ emailAddress: 1, hostName: 1 }, { unique: true });
      console.log('  ✅ Created: emailAddress_1_hostName_1 (unique)\n');
    } else {
      console.log('  [DRY RUN] Would update indexes\n');
    }

    console.log('✅ Migration completed!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
