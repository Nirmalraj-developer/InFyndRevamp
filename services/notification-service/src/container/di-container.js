const TenantRepository = require('../repositories/tenant.repository');
const EmailService = require('../services/email.service');
const UserRegisteredConsumer = require('../consumers/user-registered.consumer');
const LoginOtpConsumer = require('../consumers/login-otp.consumer');
const EmailNotificationConsumer = require('../consumers/email-notification.consumer');
const { getSESClient } = require('../config/ses');
const config = require('../config');

class DIContainer {
  constructor() {
    this.instances = {};
  }

  setupDependencies() {
    // Instantiate all dependencies
    this.tenantRepository = new TenantRepository();
    this.emailService = new EmailService({ sesClient: getSESClient() });
    
    // Consumer dependencies
    this.userRegisteredConsumer = new UserRegisteredConsumer({
      tenantRepository: this.tenantRepository,
      emailService: this.emailService,
      config
    });
    
    this.loginOtpConsumer = new LoginOtpConsumer({
      emailService: this.emailService
    });

    this.emailNotificationConsumer = new EmailNotificationConsumer({
      emailService: this.emailService
    });
  }

  getUserRegisteredConsumer() {
    return this.userRegisteredConsumer;
  }

  getLoginOtpConsumer() {
    return this.loginOtpConsumer;
  }

  getEmailNotificationConsumer() {
    return this.emailNotificationConsumer;
  }
}

const container = new DIContainer();

const initContainer = () => {
  container.setupDependencies();
};

module.exports = { container, initContainer };
