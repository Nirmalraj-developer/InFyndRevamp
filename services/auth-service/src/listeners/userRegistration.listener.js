const AppError = require('../utils/app-error');
const { renderRegistrationOtpTemplate } = require('../emailTemplates/otp.template');
const { renderWelcomeTemplate } = require('../emailTemplates/welcome.template');

class UserRegistrationListener {
  constructor(dependencies) {
    this.kafkaPublisher = dependencies.kafkaPublisher;
    this.config = dependencies.config;
  }

  async handleRegistrationOtpSend(event) {
    const {
      email,
      userName,
      companyName,
      hostName,
      otp,
      expiresInSec,
      tenant
    } = event.payload;

    const tenantConfig = tenant.config || {};
    const branding = tenantConfig.branding || {};
    const resolvedCompany = companyName || branding.companyName || tenant.tenantId;
    const supportEmail = branding.supportEmail || tenantConfig.emailSender || `support@${hostName}`;
    const logoUrl = branding.logoUrl || `https://${hostName}/assets/logo.png`;
    const fromAddress = tenantConfig.emailSender || `noreply@${hostName}`;
    const fromName = tenantConfig.emailFromName || resolvedCompany;
    const configurationSet = tenantConfig.sesConfigurationSet;

    const html = renderRegistrationOtpTemplate({
      companyName: resolvedCompany,
      logoUrl,
      otp,
      expiryMinutes: Math.max(1, Math.floor(expiresInSec / 60)),
      supportEmail
    });

    await this.kafkaPublisher.publishEmailNotification({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      fromName,
      fromAddress,
      configurationSet,
      tenantId: tenant.tenantId,
      hostName
    });

    console.log('[AUTH][LISTENER] USER_REGISTRATION_OTP_SEND handled', { email, hostName });
  }

  async handleRegistrationWelcomeEmail(event) {
    const {
      email,
      userName,
      companyName,
      hostName,
      tenant
    } = event.payload;

    const tenantConfig = tenant.config || {};
    const branding = tenantConfig.branding || {};
    const resolvedCompany = companyName || branding.companyName || tenant.tenantId;
    const supportEmail = branding.supportEmail || tenantConfig.emailSender || `support@${hostName}`;
    const logoUrl = branding.logoUrl || `https://${hostName}/assets/logo.png`;
    const fromAddress = tenantConfig.emailSender || `noreply@${hostName}`;
    const fromName = tenantConfig.emailFromName || resolvedCompany;
    const configurationSet = tenantConfig.sesConfigurationSet;

    const html = renderWelcomeTemplate({
      companyName: resolvedCompany,
      logoUrl,
      userName,
      hostName,
      supportEmail
    });

    await this.kafkaPublisher.publishEmailNotification({
      to: email,
      subject: `Welcome to ${resolvedCompany}`,
      html,
      fromName,
      fromAddress,
      configurationSet,
      tenantId: tenant.tenantId,
      hostName
    });

    console.log('[AUTH][LISTENER] USER_REGISTRATION_WELCOME_EMAIL handled', { email, hostName });
  }

  async handleLoginOtpRequested(event) {
    const { email, otp, tenant } = event.payload;

    const tenantConfig = tenant.config || {};
    const branding = tenantConfig.branding || {};
    const companyName = branding.companyName || tenant.tenantId;
    const fromAddress = tenantConfig.emailSender || `noreply@datavester.com`;
    const fromName = tenantConfig.emailFromName || 'Datavester';
    const configurationSet = tenantConfig.sesConfigurationSet;

    const html = `<h2>Your Datavester Login OTP is ${otp}</h2>`;

    await this.kafkaPublisher.publishEmailNotification({
      to: email,
      subject: 'Datavester Login OTP',
      html,
      fromName,
      fromAddress,
      configurationSet,
      tenantId: tenant.tenantId,
      hostName: 'datavester.com'
    });

    console.log('[AUTH][LISTENER] USER_LOGIN_OTP_REQUESTED handled', { email });
  }
}

module.exports = UserRegistrationListener;
