const { sendSuccess } = require('../utils/response.util');
const AppError = require('../utils/app-error');

class TeamController {
  constructor(dependencies) {
    this.teamService = dependencies.teamService;
    this.createTeam = this.createTeam.bind(this);
    this.inviteUser = this.inviteUser.bind(this);
    this.allocateCredits = this.allocateCredits.bind(this);
  }

  async createTeam(req, res, next) {
    try {
      const { name } = req.body;
      const { user, tenant } = req;

      if (!name) {
        throw new AppError('Team name is required', 'VALIDATION_001', 400);
      }

      const result = await this.teamService.createTeam({
        name,
        ownerId: user.id,
        tenantId: tenant.tenantId
      });

      return sendSuccess(res, {
        data: result,
        message: 'Team created successfully',
        statusCode: 201,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async inviteUser(req, res, next) {
    try {
      const { teamId, email } = req.body;
      const { user, tenant } = req;

      if (!teamId || !email) {
        throw new AppError('Team ID and email are required', 'VALIDATION_001', 400);
      }

      const result = await this.teamService.inviteUser({
        teamId,
        email,
        invitedBy: user.id,
        tenantId: tenant.tenantId
      });

      return sendSuccess(res, {
        data: result,
        message: 'User invited successfully',
        statusCode: 200,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async allocateCredits(req, res, next) {
    try {
      const { teamId, credits } = req.body;
      const { user } = req;

      if (!teamId || !credits) {
        throw new AppError('Team ID and credits are required', 'VALIDATION_001', 400);
      }

      const result = await this.teamService.allocateCredits({
        teamId,
        credits,
        allocatedBy: user.id
      });

      return sendSuccess(res, {
        data: result,
        message: 'Credits allocated successfully',
        statusCode: 200,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TeamController;