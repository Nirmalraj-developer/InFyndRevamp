const WorkspaceRole = require('../models/workspace/WorkspaceRole.model');
const RedisService = require('./redis.service');

class WorkspaceRoleService {
  static async updateRolePermissions(roleId, workspaceId, permissions) {
    const updated = await WorkspaceRole.findOneAndUpdate(
      { _id: roleId, workspaceId },
      { permissions },
      { new: true }
    );
    
    if (updated) {
      // Invalidate all users in this workspace
      await RedisService.invalidateWorkspacePermissions(workspaceId);
    }
    
    return updated;
  }

  static async addPermissionToRole(roleId, workspaceId, permission) {
    const updated = await WorkspaceRole.findOneAndUpdate(
      { _id: roleId, workspaceId },
      { $addToSet: { permissions: permission } },
      { new: true }
    );
    
    if (updated) {
      await RedisService.invalidateWorkspacePermissions(workspaceId);
    }
    
    return updated;
  }

  static async removePermissionFromRole(roleId, workspaceId, permission) {
    const updated = await WorkspaceRole.findOneAndUpdate(
      { _id: roleId, workspaceId },
      { $pull: { permissions: permission } },
      { new: true }
    );
    
    if (updated) {
      await RedisService.invalidateWorkspacePermissions(workspaceId);
    }
    
    return updated;
  }
}

module.exports = WorkspaceRoleService;
