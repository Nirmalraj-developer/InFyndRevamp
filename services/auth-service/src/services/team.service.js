const AppError = require('../utils/app-error');

class TeamService {
  constructor(dependencies) {
    this.teamRepository = dependencies.teamRepository;
    this.userRepository = dependencies.userRepository;
    this.emailService = dependencies.emailService;
    this.cacheService = dependencies.cacheService;
  }

  async createTeam(params) {
    const { name, ownerId, tenantId } = params;
    
    const team = await this.teamRepository.create({
      name,
      ownerId,
      tenantId,
      members: [ownerId]
    });

    await this.cacheService.invalidateUserTeams(ownerId);
    
    return team;
  }

  async inviteUser(params) {
    const { teamId, email, invitedBy, tenantId } = params;
    
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 'TEAM_001', 404);
    }

    const invite = await this.teamRepository.createInvite({
      teamId,
      email,
      invitedBy,
      tenantId
    });

    await this.emailService.sendTeamInvite({
      email,
      teamName: team.name,
      inviteToken: invite.token
    });

    return invite;
  }

  async allocateCredits(params) {
    const { teamId, credits, allocatedBy } = params;
    
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 'TEAM_001', 404);
    }

    await this.teamRepository.updateCredits(teamId, credits);
    await this.cacheService.invalidateTeamCredits(teamId);

    return { teamId, credits, allocatedBy };
  }
}

module.exports = TeamService;