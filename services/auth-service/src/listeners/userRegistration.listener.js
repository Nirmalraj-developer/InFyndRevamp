'use strict';

const logger = require('../utils/logger');
const { renderRegistrationOtpTemplate, renderLoginOtpTemplate } = require('../emailTemplates/otp.template');
const { renderWelcomeTemplate } = require('../emailTemplates/welcome.template');

class UserRegistrationListener {
  constructor(dependencies) {
    this.kafkaPublisher = dependencies.kafkaPublisher;
    this.tenantService = dependencies.tenantService;
    this.config = dependencies.config;
  }

  async handleRegistrationOtpSend(event) {
    console.log('📨 [LISTENER] Received USER_REGISTRATION_OTP_SEND event');
    const {
      emailAddress,
      userName,
      companyName,
      hostName,
      otp
    } = event.payload;

    console.log('📝 [LISTENER] Event payload:', { emailAddress, userName, companyName, hostName, otp });

    const tenantConfig = await this.tenantService.getTenantConfigByHostName(hostName);
    const resolvedCompany = companyName || hostName;
    const logoUrl = tenantConfig?.logoDataUri || `https://${hostName}/assets/logo.png`;
    const fromAddress = tenantConfig?.emailSender || `noreply@${hostName}`;
    const fromName = resolvedCompany;

    console.log('🎨 [LISTENER] Rendering email template');
    const html = renderRegistrationOtpTemplate({
      companyName: resolvedCompany,
      logoUrl,
      otp,
      userName
    });
    console.log('✅ [LISTENER] Email template rendered');

    console.log('📧 [LISTENER] Publishing email notification');
    await this.kafkaPublisher.publishEmailNotification({
      to: emailAddress,
      subject: `Verify Your Email - ${resolvedCompany}`,
      html,
      fromName,
      fromAddress,
      hostName
    });

    console.log('✅ [LISTENER] USER_REGISTRATION_OTP_SEND handled successfully');
    logger.info('LISTENER: USER_REGISTRATION_OTP_SEND handled', { emailAddress, hostName });
  }

  async handleRegistrationWelcomeEmail(event) {
    const {
      emailAddress,
      userName,
      companyName,
      hostName
    } = event.payload;

    const tenantConfig = await this.tenantService.getTenantConfigByHostName(hostName);
    const resolvedCompany = companyName || hostName;
    const logoUrl = tenantConfig?.logoDataUri || `https://${hostName}/assets/logo.png`;
    const fromAddress = tenantConfig?.emailSender || `noreply@${hostName}`;
    const fromName = resolvedCompany;
    const supportEmail = `support@${hostName}`;

    const html = renderWelcomeTemplate({
      companyName: resolvedCompany,
      logoUrl,
      userName,
      hostName,
      supportEmail
    });

    await this.kafkaPublisher.publishEmailNotification({
      to: emailAddress,
      subject: `Welcome to ${resolvedCompany}`,
      html,
      fromName,
      fromAddress,
      hostName
    });

    logger.info('LISTENER: USER_REGISTRATION_WELCOME_EMAIL handled', { emailAddress, hostName });
  }

  async handleLoginOtpRequested(event) {
    console.log('📨 [LISTENER] Received USER_LOGIN_OTP_REQUESTED event');
    const { emailAddress, otp, hostName } = event.payload;

    console.log('📝 [LISTENER] Event payload:', { emailAddress, otp, hostName });

    const tenantConfig = await this.tenantService.getTenantConfigByHostName(hostName);
    const companyName = hostName;
    const logoUrl = tenantConfig?.logoDataUri || `https://${hostName}/assets/logo.png`;
    const fromAddress = tenantConfig?.emailSender || `noreply@${hostName}`;
    const fromName = companyName;

    console.log('🎨 [LISTENER] Rendering login OTP template');
    const html = renderLoginOtpTemplate({
      companyName,
      logoUrl,
      otp
    });
    console.log('✅ [LISTENER] Login OTP template rendered');

    console.log('📧 [LISTENER] Publishing email notification');
    await this.kafkaPublisher.publishEmailNotification({
      to: emailAddress,
      subject: `Login OTP - ${companyName}`,
      html,
      fromName,
      fromAddress,
      hostName
    });

    console.log('✅ [LISTENER] USER_LOGIN_OTP_REQUESTED handled successfully');
    logger.info('LISTENER: USER_LOGIN_OTP_REQUESTED handled', { emailAddress, hostName });
  }
}

module.exports = UserRegistrationListener;
