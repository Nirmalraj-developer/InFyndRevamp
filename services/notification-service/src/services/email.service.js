const { SendEmailCommand } = require('@aws-sdk/client-ses');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor(dependencies) {
    this.sesClient = dependencies.sesClient;
  }

  loadTemplate(templateName) {
    return fs.readFileSync(
      path.join(__dirname, '../templates', templateName),
      'utf8'
    );
  }

  replaceTemplateVars(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  async sendEmail(sesInput) {
    if (!sesInput.Destination || !sesInput.Destination.ToAddresses) {
      throw new Error('Invalid SES input: missing Destination.ToAddresses');
    }
    if (!sesInput.Message || !sesInput.Message.Subject || !sesInput.Message.Body) {
      throw new Error('Invalid SES input: missing Message structure');
    }
    if (!sesInput.Source) {
      throw new Error('Invalid SES input: missing Source');
    }

    try {
      const params = {
        Destination: sesInput.Destination,
        Message: {
          Subject: {
            Data: sesInput.Message.Subject.Data,
            Charset: "UTF-8"
          },
          Body: {
            Html: {
              Data: sesInput.Message.Body.Html.Data,
              Charset: "UTF-8"
            }
          }
        },
        Source: sesInput.Source
      };

      if (sesInput.ConfigurationSetName) {
        params.ConfigurationSetName = sesInput.ConfigurationSetName;
      }

      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);
      
      console.log('[NOTIFICATION] SES email sent', { 
        to: sesInput.Destination.ToAddresses[0], 
        subject: sesInput.Message.Subject.Data,
        messageId: response.MessageId
      });
      
      return { success: true, response };
    } catch (error) {
      console.error('[NOTIFICATION] SES send failed', {
        error: error.message,
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode,
        to: sesInput.Destination.ToAddresses[0]
      });
      throw error;
    }
  }
}

module.exports = EmailService;
