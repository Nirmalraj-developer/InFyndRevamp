const { getProducer } = require('../config/kafka');
const crypto = require('crypto');

async function publishUserRegistered(params) {
  const { user, tenant } = params;
  const producer = getProducer();
  const { tenantId, hostname, cognitoUserPoolId } = tenant;
  
  const event = {
    eventId: crypto.randomUUID(),
    eventType: 'user.registered',
    timestamp: new Date().toISOString(),
    userId: user._id.toString(),
    payload: {
      userId: user._id.toString(),
      cognitoUserId: user.cognitoUserId,
      tenantId: tenantId,
      email: user.email,
      hostname: hostname
    },
    metadata: {
      source: 'auth-service',
      version: '1.0'
    }
  };
  
  await producer.send({
    topic: 'user.registered',
    messages: [{
      key: user.cognitoUserId,
      value: JSON.stringify(event),
      headers: {
        tenantId: tenantId,
        hostname: hostname,
        cognitoPoolId: cognitoUserPoolId
      }
    }],
    acks: -1
  });
  
  console.log('[AUTH] Published user.registered event', { 
    userId: user._id.toString(),
    cognitoUserId: user.cognitoUserId,
    cognitoPoolId: cognitoUserPoolId
  });
}

async function publishLoginOtpRequested(params) {
  const { email, otp, tenant } = params;
  const producer = getProducer();
  const { tenantId, hostname, cognitoUserPoolId, config } = tenant;
  
  const event = {
    eventId: crypto.randomUUID(),
    eventType: 'user.login.otp.requested',
    timestamp: new Date().toISOString(),
    payload: {
      email,
      otp,
      tenantId,
      hostname,
      branding: config.branding,
      emailFromName: config.emailFromName,
      emailFromAddress: config.emailFromAddress,
      sesConfigurationSet: config.sesConfigurationSet
    },
    metadata: {
      source: 'auth-service',
      version: '1.0'
    }
  };
  
  await producer.send({
    topic: 'user.login.otp.requested',
    messages: [{
      key: email,
      value: JSON.stringify(event),
      headers: {
        tenantId: tenantId,
        hostname: hostname,
        cognitoPoolId: cognitoUserPoolId
      }
    }],
    acks: -1
  });
  
  console.log('[AUTH] Published user.login.otp.requested event', { email });
}

module.exports = { publishUserRegistered, publishLoginOtpRequested };
