class EmailService {
  constructor(dependencies) {
    this.sesService = dependencies.sesService;
    this.templateService = dependencies.templateService;
    this.tenantResolver = dependencies.tenantResolver;
  }

  async sendWelcomeEmail(params) {
    const { email, userName, tenant } = params;
    
    const template = await this.templateService.getWelcomeTemplate(tenant.tenantId);
    const emailConfig = this.tenantResolver.getSESConfig(tenant);
    
    return await this.sesService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.render({ userName }),
      from: emailConfig.fromAddress,
      configurationSet: emailConfig.configurationSet
    });
  }

  async sendTeamInvite(params) {
    const { email, teamName, inviteToken, tenant } = params;
    
    const template = await this.templateService.getTeamInviteTemplate(tenant.tenantId);
    const emailConfig = this.tenantResolver.getSESConfig(tenant);
    
    return await this.sesService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.render({ teamName, inviteToken }),
      from: emailConfig.fromAddress,
      configurationSet: emailConfig.configurationSet
    });
  }

  async sendOtpEmail(params) {
    const { email, otp, tenant } = params;
    
    const template = await this.templateService.getOtpTemplate(tenant.tenantId);
    const emailConfig = this.tenantResolver.getSESConfig(tenant);
    
    return await this.sesService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.render({ otp }),
      from: emailConfig.fromAddress,
      configurationSet: emailConfig.configurationSet
    });
  }
}

module.exports = EmailService;