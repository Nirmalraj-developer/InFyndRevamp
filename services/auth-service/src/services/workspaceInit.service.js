const mongoose = require('mongoose');
const Workspace = require('../models/workspace/Workspace.model');
const WorkspaceRole = require('../models/workspace/WorkspaceRole.model');
const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');
const { seedWorkspaceRoles } = require('../scripts/seed-workspace-roles');

class WorkspaceInitService {
  async createWorkspaceWithRoles(params) {
    const { ownerId, tenantId, planName, memberLimit, startTrial = false, trialDays = 14, session: externalSession } = params;

    const useExternalSession = !!externalSession;
    const session = externalSession || await mongoose.startSession();
    
    if (!useExternalSession) {
      session.startTransaction();
    }

    try {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));

      // Create workspace
      const [workspace] = await Workspace.create([{
        ownerId,
        tenantId,
        planName,
        memberLimit,
        status: 'ACTIVE',
        trialStartedAt: startTrial ? now : null,
        trialEndsAt: startTrial ? trialEnd : null,
        isTrialActive: startTrial
      }], { session });

      // Seed all system roles (OWNER and MEMBER only for personal workspaces)
      const { freeUserRole, ownerRole, adminRole, memberRole } = await seedWorkspaceRoles(workspace._id, session, false);

      // Update workspace with role IDs
      workspace.freeRoleId = freeUserRole._id;
      workspace.ownerRoleId = ownerRole._id;
      workspace.adminRoleId = adminRole._id;
      workspace.memberRoleId = memberRole._id;
      await workspace.save({ session });

      // Create WorkspaceAccess for owner (assign OWNER for paid, FREE_USER for trial)
      const roleId = startTrial ? freeUserRole._id : ownerRole._id;
      
      await WorkspaceAccess.create([{
        workspaceId: workspace._id,
        userId: ownerId,
        roleId,
        deniedPermissions: []
      }], { session });

      if (!useExternalSession) {
        await session.commitTransaction();
      }

      return {
        workspace,
        freeUserRole,
        ownerRole,
        adminRole,
        memberRole
      };

    } catch (error) {
      if (!useExternalSession) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (!useExternalSession) {
        session.endSession();
      }
    }
  }
}

module.exports = new WorkspaceInitService();
