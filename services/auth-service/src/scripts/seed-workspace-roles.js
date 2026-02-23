const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const { SYSTEM_WORKSPACE_ROLES, PERSONAL_WORKSPACE_ROLES } = require('../config/workspaceRoles.config');

async function seedWorkspaceRoles(workspaceId, session = null, isSystemWorkspace = false) {
  try {
    console.log(`[SEED] Creating system roles for workspace: ${workspaceId}`);

    const db = getDb();
    const rolesCollection = db.collection('workspaceroles');

    const roleConfig = isSystemWorkspace ? SYSTEM_WORKSPACE_ROLES : PERSONAL_WORKSPACE_ROLES;
    const createdRoles = {};

    for (const  roleConfigItem of roleConfig) {
      const existing = await rolesCollection.findOne(
        {
          workspaceId: new ObjectId(workspaceId),
          roleName: roleConfigItem.roleName
        },
        { session }
      );

      if (existing) {
        console.log(`[SEED] Role ${roleConfigItem.roleName} already exists, skipping`);
        createdRoles[roleConfigItem.roleName] = existing;
      } else {
        const roleData = {
          workspaceId: new ObjectId(workspaceId),
          roleName: roleConfigItem.roleName,
          permissions: roleConfigItem.permissions,
          isSystemRole: roleConfigItem.isSystemRole,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const result = await rolesCollection.insertOne(roleData, { session });
        console.log(`[SEED] Created role: ${roleConfigItem.roleName} with ${roleConfigItem.permissions.length} permissions`);
        createdRoles[roleConfigItem.roleName] = { ...roleData, _id: result.insertedId };
      }
    }

    return {
      freeUserRole: createdRoles['FREE_USER'],
      memberRole: createdRoles['MEMBER'],
      adminRole: createdRoles['ADMIN'],
      ownerRole: createdRoles['OWNER']
    };

  } catch (error) {
    console.error('[SEED] Failed to seed workspace roles:', error);
    throw error;
  }
}

module.exports = { seedWorkspaceRoles };
