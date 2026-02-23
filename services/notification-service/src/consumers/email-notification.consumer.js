class EmailNotificationConsumer {
  constructor(dependencies) {
    this.emailService = dependencies.emailService;
  }

  async handle(event) {
    try {
      const payload = event.payload || event;
      
      console.log('[NOTIFICATION] Processing email', { to: payload.to, subject: payload.subject });
      
      if (!payload.to) throw new Error('Missing required field: to');
      if (!payload.subject) throw new Error('Missing required field: subject');
      if (!payload.html) throw new Error('Missing required field: html');

      const sesInput = {
        Destination: { ToAddresses: [payload.to] },
        Message: {
          Subject: { Data: payload.subject },
          Body: { Html: { Data: payload.html } }
        },
        Source: payload.fromAddress || process.env.SES_FROM_EMAIL || 'noreply@infynd.com'
      };

      if (payload.configurationSet) {
        sesInput.ConfigurationSetName = payload.configurationSet;
      }

      await this.emailService.sendEmail(sesInput);
      console.log('[NOTIFICATION] Email sent', { to: payload.to });
    } catch (error) {
      console.error('[NOTIFICATION] Email failed', { 
        error: error.message, 
        code: error.code,
        name: error.name
      });
      // Don't throw to prevent Kafka consumer crash on network errors
    }
  }
}

module.exports = EmailNotificationConsumer;
