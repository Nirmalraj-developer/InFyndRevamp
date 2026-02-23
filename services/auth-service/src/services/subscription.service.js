const mongoose = require('mongoose');
const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');
const { getSystemWorkspace } = require('../scripts/bootstrap-system-workspace');
const workspaceInitService = require('./workspaceInit.service');
const RedisService = require('./redis.service');

class SubscriptionService {
  async handlePaymentSuccess(params) {
    const { userId, tenantId, planName = 'PRO', memberLimit = 5 } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const systemWorkspace = await getSystemWorkspace();

      // Remove user from SYSTEM_WORKSPACE
      await WorkspaceAccess.deleteOne(
        { userId, workspaceId: systemWorkspace._id },
        { session }
      );

      // Find team members invited by this user in SYSTEM_WORKSPACE
      const invitedMembers = await WorkspaceAccess.find({
        workspaceId: systemWorkspace._id,
        invitedBy: userId
      }).session(session);

      // Create new workspace for paid user
      const { workspace } = await workspaceInitService.createWorkspaceWithRoles({
        ownerId: userId,
        tenantId,
        planName,
        memberLimit,
        startTrial: false,
        session
      });

      // Migrate invited team members to new workspace (as MEMBER role)
      if (invitedMembers.length > 0) {
        const memberRoleId = workspace.memberRoleId; // Assuming workspace has memberRoleId

        for (const member of invitedMembers) {
          // Remove from SYSTEM_WORKSPACE
          await WorkspaceAccess.deleteOne(
            { _id: member._id },
            { session }
          );

          // Add to new workspace with MEMBER role (no billing/subscription permissions)
          await WorkspaceAccess.create([{
            workspaceId: workspace._id,
            userId: member.userId,
            roleId: memberRoleId,
            deniedPermissions: [],
            invitedBy: userId
          }], { session });
        }
      }

      // Invalidate cache for all migrated users
      await RedisService.invalidateWorkspacePermissions(systemWorkspace._id);
      await RedisService.invalidateWorkspacePermissions(workspace._id);

      await session.commitTransaction();

      return {
        success: true,
        workspace: {
          id: workspace._id,
          planName: workspace.planName,
          memberLimit: workspace.memberLimit
        },
        migratedMembers: invitedMembers.length
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handlePaymentFailed(params) {
    const { userId, workspaceId } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const systemWorkspace = await getSystemWorkspace();

      // Remove user from their paid workspace
      await WorkspaceAccess.deleteOne(
        { userId, workspaceId },
        { session }
      );

      // Add user back to SYSTEM_WORKSPACE with FREE_USER role
      await WorkspaceAccess.create([{
        workspaceId: systemWorkspace._id,
        userId,
        roleId: systemWorkspace.freeRoleId,
        deniedPermissions: []
      }], { session });

      // Invalidate cache
      await RedisService.invalidateUserPermission(workspaceId, userId);
      await RedisService.invalidateUserPermission(systemWorkspace._id, userId);

      await session.commitTransaction();

      return {
        success: true,
        message: 'User downgraded to FREE_USER in SYSTEM_WORKSPACE'
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new SubscriptionService();
