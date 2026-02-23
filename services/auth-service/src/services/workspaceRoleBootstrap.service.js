const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const { WORKSPACE_ROLES_CONFIG } = require('../config/workspaceRoles.config');

class WorkspaceRoleBootstrapService {
  async ensureWorkspaceRoles(workspaceId) {
    const db = getDb();
    
    // Check workspace status
    const workspace = await db.collection('workspaces').findOne({ 
      _id: new ObjectId(workspaceId) 
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.status !== 'ACTIVE') {
      const error = new Error('Workspace is not active');
      error.code = 'WORKSPACE_SUSPENDED';
      throw error;
    }

    // Get existing roles for this workspace
    const existingRoles = await db.collection('workspaceroles').find({
      workspaceId: new ObjectId(workspaceId)
    }).toArray();

    const existingRoleNames = new Set(existingRoles.map(r => r.roleName));
    
    // Find missing roles
    const missingRoles = WORKSPACE_ROLES_CONFIG.filter(
      config => !existingRoleNames.has(config.roleName)
    );

    if (missingRoles.length === 0) {
      // All roles exist, ensure workspace has role IDs
      if (!workspace.ownerRoleId || !workspace.freeRoleId) {
        await this.updateWorkspaceRoleIds(workspaceId, existingRoles);
      }
      return;
    }

    // Insert missing roles using bulkWrite with upsert
    const bulkOps = missingRoles.map(roleConfig => ({
      updateOne: {
        filter: {
          workspaceId: new ObjectId(workspaceId),
          roleName: roleConfig.roleName
        },
        update: {
          $setOnInsert: {
            workspaceId: new ObjectId(workspaceId),
            roleName: roleConfig.roleName,
            permissions: roleConfig.permissions,
            isSystemRole: roleConfig.isSystemRole,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    await db.collection('workspaceroles').bulkWrite(bulkOps, { ordered: false });

    // Fetch all roles after insert
    const allRoles = await db.collection('workspaceroles').find({
      workspaceId: new ObjectId(workspaceId)
    }).toArray();

    // Update workspace with role IDs
    await this.updateWorkspaceRoleIds(workspaceId, allRoles);
  }

  async updateWorkspaceRoleIds(workspaceId, roles) {
    const db = getDb();
    
    const ownerRole = roles.find(r => r.roleName === 'OWNER');
    const freeUserRole = roles.find(r => r.roleName === 'FREE_USER');

    if (ownerRole && freeUserRole) {
      await db.collection('workspaces').updateOne(
        { _id: new ObjectId(workspaceId) },
        {
          $set: {
            ownerRoleId: ownerRole._id,
            freeRoleId: freeUserRole._id,
            updatedAt: new Date()
          }
        }
      );
    }
  }
}

module.exports = new WorkspaceRoleBootstrapService();
