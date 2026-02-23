const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');
const RedisService = require('./redis.service');

class WorkspaceAccessService {
  static async updateDeniedPermissions(workspaceId, userId, deniedPermissions) {
    const updated = await WorkspaceAccess.findOneAndUpdate(
      { workspaceId, userId },
      { deniedPermissions },
      { new: true }
    );
    
    if (updated) {
      await RedisService.invalidateUserPermission(workspaceId, userId);
    }
    
    return updated;
  }

  static async reassignRole(workspaceId, userId, roleId) {
    const updated = await WorkspaceAccess.findOneAndUpdate(
      { workspaceId, userId },
      { roleId },
      { new: true }
    );
    
    if (updated) {
      await RedisService.invalidateUserPermission(workspaceId, userId);
    }
    
    return updated;
  }

  static async invalidateWorkspaceCache(workspaceId) {
    await RedisService.invalidateWorkspacePermissions(workspaceId);
  }
}

module.exports = WorkspaceAccessService;
