const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');
const Workspace = require('../models/workspace/Workspace.model');
const RedisService = require('../services/redis.service');
const mongoose = require('mongoose');

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user._id;

      // STEP 0: Check workspace status
      const workspace = await Workspace.findById(workspaceId);
      
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKSPACE_NOT_FOUND',
            message: 'Workspace not found'
          }
        });
      }

      if (workspace.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'WORKSPACE_INACTIVE',
            message: 'Workspace is not active'
          }
        });
      }

      // STEP 1: Try Redis cache
      const cached = await RedisService.getPermissionCache(workspaceId, userId);
      
      let permissions, restrictions;
      
      if (cached) {
        // Cache hit - use directly
        permissions = cached.permissions;
        restrictions = cached.restrictions;
      } else {
        // Cache miss - fetch from DB using aggregation
        const result = await WorkspaceAccess.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
          {
            $lookup: {
              from: 'workspaceroles',
              localField: 'roleId',
              foreignField: '_id',
              as: 'role'
            }
          },
          { $unwind: '$role' }
        ]);

        if (!result || result.length === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'No workspace access'
            }
          });
        }

        const access = result[0];

        if (!access.roleId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ROLE_NOT_ASSIGNED',
              message: 'No role assigned to user'
            }
          });
        }

        if (!access.role) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role configuration missing'
            }
          });
        }

        // Cross-tenant protection
        if (access.role.workspaceId.toString() !== workspaceId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ROLE_NOT_FOUND',
              message: 'Role belongs to different workspace'
            }
          });
        }

        // Compute effective access
        permissions = access.role.permissions || [];
        restrictions = access.deniedPermissions || [];

        // Store in Redis
        await RedisService.setPermissionCache(workspaceId, userId, permissions, restrictions);
      }

      // STEP 2: Validate permission (atomic boolean logic)
      const hasPermission = 
        permissions.includes(requiredPermission) &&
        !restrictions.includes(requiredPermission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission '${requiredPermission}' denied`,
            details: {
              roleHasPermission: permissions.includes(requiredPermission),
              isDenied: restrictions.includes(requiredPermission)
            }
          }
        });
      }

      // Attach to request for downstream use
      req.workspace = workspace;
      
      next();

    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkPermission };
