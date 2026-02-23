const mongoose = require('mongoose');
const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');
const Workspace = require('../models/workspace/Workspace.model');
const RedisService = require('./redis.service');

class BillingWebhookService {
  async handlePaymentSuccess(params) {
    const { userId, workspaceId } = params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Upgrade owner to OWNER role
    await WorkspaceAccess.updateOne(
      { userId, workspaceId },
      { roleId: workspace.ownerRoleId }
    );

    // Invalidate permission cache
    await RedisService.invalidateUserPermission(workspaceId, userId);

    return { success: true, message: 'User upgraded to OWNER role' };
  }

  async handlePaymentFailed(params) {
    const { userId, workspaceId } = params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Downgrade owner to FREE_USER role
    await WorkspaceAccess.updateOne(
      { userId, workspaceId },
      { roleId: workspace.freeRoleId }
    );

    // Invalidate permission cache
    await RedisService.invalidateUserPermission(workspaceId, userId);

    return { success: true, message: 'User downgraded to FREE_USER role' };
  }

  async handleTrialExpiry(params) {
    const { userId, workspaceId } = params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Downgrade to FREE_USER role
    await WorkspaceAccess.updateOne(
      { userId, workspaceId },
      { roleId: workspace.freeRoleId }
    );

    // Invalidate permission cache
    await RedisService.invalidateUserPermission(workspaceId, userId);

    return { success: true, message: 'Trial expired, downgraded to FREE_USER role' };
  }
}

module.exports = new BillingWebhookService();
