class UserRegisteredConsumer {
  constructor(dependencies) {
    this.tenantRepository = dependencies.tenantRepository;
    this.emailService = dependencies.emailService;
    this.config = dependencies.config;
  }

  async handle(event) {
    const { userId, cognitoUserId, tenantId, email, hostname } = event.payload;
    
    // Fetch tenant config from MongoDB
    const tenantConfig = await this.tenantRepository.findByTenantId(tenantId);
    
    if (!tenantConfig) {
      console.error('[NOTIFICATION] Tenant config not found', { tenantId });
      return;
    }
    
    // 1. Send welcome email to user
    const welcomeTemplate = this.emailService.loadTemplate('welcome_email.html');
    const welcomeHtml = this.emailService.replaceTemplateVars(welcomeTemplate, {
      companyName: tenantConfig.branding.companyName,
      logoUrl: tenantConfig.branding.logoUrl,
      primaryColor: tenantConfig.branding.primaryColor,
      email: email,
      hostname: hostname,
      supportEmail: tenantConfig.branding.supportEmail
    });
    
    await this.emailService.sendEmail(
      email,
      `Welcome to ${tenantConfig.branding.companyName}!`,
      welcomeHtml,
      tenantConfig.emailFromName,
      tenantConfig.emailFromAddress,
      tenantConfig.sesConfigurationSet
    );
    
    // 2. Send internal alert to admins
    const internalEmails = this.config.internalEmails[tenantId] || tenantConfig.internalEmails;
    
    if (internalEmails && internalEmails.length > 0) {
      const alertTemplate = this.emailService.loadTemplate('internal_alert.html');
      const alertHtml = this.emailService.replaceTemplateVars(alertTemplate, {
        email: email,
        tenantId: tenantId,
        hostname: hostname,
        timestamp: event.timestamp,
        userId: userId,
        cognitoUserId: cognitoUserId,
        primaryColor: tenantConfig.branding.primaryColor
      });
      
      for (const adminEmail of internalEmails) {
        await this.emailService.sendEmail(
          adminEmail,
          `New User Registration - ${tenantId}`,
          alertHtml,
          tenantConfig.emailFromName,
          tenantConfig.emailFromAddress,
          tenantConfig.sesConfigurationSet
        );
      }
    }
    
    console.log('[NOTIFICATION] User registered emails sent', { userId, email });
  }
}

module.exports = UserRegisteredConsumer;
