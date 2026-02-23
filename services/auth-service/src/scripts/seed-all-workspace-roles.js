const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const { seedWorkspaceRoles } = require('./seed-workspace-roles');
const { seedDefaultWorkspace } = require('./seed-default-workspace');

async function seedAllWorkspaceRoles() {
  try {
    console.log('[STARTUP] Seeding default roles for all workspaces...');

    const db = getDb();
    
    // Ensure workspaces collection exists
    const collections = await db.listCollections({ name: 'workspaces' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('workspaces');
      console.log('[STARTUP] Created workspaces collection');
    }
    
    // Seed default workspace if none exists
    await seedDefaultWorkspace();
    
    const workspaces = await db.collection('workspaces').find({}).toArray();
    
    if (workspaces.length === 0) {
      console.log('[STARTUP] No workspaces found after seeding, skipping role seeding');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const workspace of workspaces) {
      try {
        // Check if roles already exist
        if (workspace.freeRoleId && workspace.ownerRoleId) {
          skippedCount++;
          continue;
        }

        // Seed roles for this workspace
        const { freeUserRole, ownerRole } = await seedWorkspaceRoles(workspace._id);

        // Update workspace with role IDs
        await db.collection('workspaces').updateOne(
          { _id: workspace._id },
          {
            $set: {
              freeRoleId: freeUserRole._id,
              ownerRoleId: ownerRole._id,
              updatedAt: new Date()
            }
          }
        );
        updatedCount++;
        console.log(`[STARTUP] Updated workspace ${workspace._id} with role IDs`);

      } catch (error) {
        console.error(`[STARTUP] Failed to seed roles for workspace ${workspace._id}:`, error.message);
      }
    }

    console.log(`[STARTUP] Role seeding complete: ${updatedCount} updated, ${skippedCount} skipped`);

  } catch (error) {
    console.error('[STARTUP] Failed to seed workspace roles:', error);
  }
}

module.exports = { seedAllWorkspaceRoles };
