const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { getSESClient } = require('../config/ses');

async function sendEmail(to, subject, html, fromName, fromAddress, configurationSet) {
  const sesClient = getSESClient();
  
  const command = new SendEmailCommand({
    Source: `"${fromName}" <${fromAddress}>`,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8'
        }
      }
    },
    ConfigurationSetName: configurationSet
  });
  
  await sesClient.send(command);
  console.log('[NOTIFICATION] SES email sent', { to, subject });
}

module.exports = { sendEmail };
