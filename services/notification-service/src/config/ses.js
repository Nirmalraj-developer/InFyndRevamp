const { SESClient } = require('@aws-sdk/client-ses');
const config = require('./index');

let sesClient;

function initSES() {
  sesClient = new SESClient({
    region: config.aws.sesRegion,
    maxAttempts: 3,
    requestTimeout: 30000,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  console.log('[NOTIFICATION] SES client initialized', { 
    region: config.aws.sesRegion,
    hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  });
}

function getSESClient() {
  if (!sesClient) throw new Error('SES client not initialized');
  return sesClient;
}

module.exports = { initSES, getSESClient };
