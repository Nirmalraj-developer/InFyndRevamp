const workspaceRoleBootstrapService = require('../services/workspaceRoleBootstrap.service');

const ensureWorkspaceRoles = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WORKSPACE_ID_REQUIRED',
          message: 'Workspace ID is required'
        }
      });
    }

    // Bootstrap workspace roles if missing
    await workspaceRoleBootstrapService.ensureWorkspaceRoles(workspaceId);

    next();

  } catch (error) {
    if (error.code === 'WORKSPACE_SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'WORKSPACE_SUSPENDED',
          message: 'Workspace is suspended or inactive'
        }
      });
    }

    console.error('[WORKSPACE_ROLE_GUARD] Failed to ensure workspace roles:', error);
    next(error);
  }
};

module.exports = { ensureWorkspaceRoles };
