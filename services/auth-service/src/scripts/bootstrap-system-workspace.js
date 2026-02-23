const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const { seedWorkspaceRoles } = require('./seed-workspace-roles');

const SYSTEM_WORKSPACE_CONFIG = {
  tenantId: 'SYSTEM',
  planName: 'FREE',
  memberLimit: 999999,
  status: 'ACTIVE'
};

async function bootstrapSystemWorkspace() {
  try {
    const db = getDb();
    const workspacesCollection = db.collection('workspaces');

    // Check if SYSTEM_WORKSPACE exists
    let systemWorkspace = await workspacesCollection.findOne({ tenantId: SYSTEM_WORKSPACE_CONFIG.tenantId });

    if (systemWorkspace) {
      console.log('[BOOTSTRAP] SYSTEM_WORKSPACE already exists:', systemWorkspace._id);
      return systemWorkspace;
    }

    // Create SuperAdmin user ID (placeholder)
    const superAdminId = new ObjectId();

    // Create SYSTEM_WORKSPACE
    const workspaceData = {
      ownerId: superAdminId,
      tenantId: SYSTEM_WORKSPACE_CONFIG.tenantId,
      planName: SYSTEM_WORKSPACE_CONFIG.planName,
      memberLimit: SYSTEM_WORKSPACE_CONFIG.memberLimit,
      status: SYSTEM_WORKSPACE_CONFIG.status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await workspacesCollection.insertOne(workspaceData);
    systemWorkspace = { ...workspaceData, _id: result.insertedId };

    console.log('[BOOTSTRAP] Created SYSTEM_WORKSPACE:', systemWorkspace._id);

    // Seed 4 system roles
    const { freeUserRole, ownerRole, adminRole, memberRole } = await seedWorkspaceRoles(systemWorkspace._id, null, true);

    // Update workspace with role IDs
    await workspacesCollection.updateOne(
      { _id: systemWorkspace._id },
      {
        $set: {
          freeRoleId: freeUserRole._id,
          ownerRoleId: ownerRole._id,
          adminRoleId: adminRole._id,
          memberRoleId: memberRole._id,
          updatedAt: new Date()
        }
      }
    );

    console.log('[BOOTSTRAP] SYSTEM_WORKSPACE roles created:', {
      freeRoleId: freeUserRole._id,
      ownerRoleId: ownerRole._id,
      adminRoleId: adminRole._id,
      memberRoleId: memberRole._id
    });

    return systemWorkspace;

  } catch (error) {
    console.error('[BOOTSTRAP] Failed to create SYSTEM_WORKSPACE:', error);
    throw error;
  }
}

async function getSystemWorkspace() {
  const db = getDb();
  const systemWorkspace = await db.collection('workspaces').findOne({ tenantId: SYSTEM_WORKSPACE_CONFIG.tenantId });
  if (!systemWorkspace) {
    throw new Error('SYSTEM_WORKSPACE not found. Run bootstrap first.');
  }
  return systemWorkspace;
}

module.exports = { bootstrapSystemWorkspace, getSystemWorkspace, SYSTEM_WORKSPACE_CONFIG };
