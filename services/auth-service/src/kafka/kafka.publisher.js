'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');
const { TOPICS, EVENT_TYPES } = require('./topics');

class KafkaPublisher {
  constructor(producer) {
    this.producer = producer;
  }

  async publish(topic, key, event, headers = {}) {
    console.log(`📤 [KAFKA] Publishing to topic: ${topic}`);
    console.log(`🔑 [KAFKA] Key: ${key}`);
    console.log(`📝 [KAFKA] Event type: ${event.eventType}`);
    
    await this.producer.send({
      topic,
      messages: [{
        key,
        value: JSON.stringify(event),
        headers
      }],
      acks: -1
    });
    
    console.log(`✅ [KAFKA] Message published successfully to ${topic}`);
  }

  async publishUserRegistrationOtpSend(params) {
    const { userId, emailAddress, userName, companyName, otp, hostName, correlationId } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.USER_REGISTRATION_OTP_SEND,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        emailAddress,
        userName,
        companyName,
        hostName,
        otp,
        expiresInSec: 600,
        correlationId
      },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.USER_REGISTRATION_OTP_SEND, userId, event, {
      hostname: hostName
    });
    logger.info('Published USER_REGISTRATION_OTP_SEND', { emailAddress, hostName });
  }

  async publishLoginOtpRequested(params) {
    const { emailAddress, otp, hostName } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.USER_LOGIN_OTP_REQUESTED,
      timestamp: new Date().toISOString(),
      payload: {
        emailAddress,
        otp,
        hostName,
        expiresInSec: 300
      },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.USER_LOGIN_OTP_REQUESTED, emailAddress, event, {
      hostname: hostName
    });
    logger.info('Published USER_LOGIN_OTP_REQUESTED', { emailAddress, hostName });
  }

  async publishUserRegistrationWelcomeEmail(params) {
    const { userId, emailAddress, userName, companyName, hostName, correlationId } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.USER_REGISTRATION_WELCOME_EMAIL,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        emailAddress,
        userName,
        companyName,
        hostName,
        correlationId
      },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.USER_REGISTRATION_WELCOME_EMAIL, userId, event, {
      hostname: hostName
    });
    logger.info('Published USER_REGISTRATION_WELCOME_EMAIL', { emailAddress, hostName });
  }

  async publishEmailNotification(params) {
    const { to, subject, html, fromName, fromAddress, configurationSet, hostName } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.EMAIL_NOTIFICATION_REQUESTED,
      timestamp: new Date().toISOString(),
      payload: { to, subject, html, fromName, fromAddress, configurationSet, hostName },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.EMAIL_NOTIFICATION, `${hostName}:${to}`, event, {
      hostname: hostName
    });
    logger.info('Published EMAIL_NOTIFICATION_REQUESTED', { to, subject, hostName });
  }
}

module.exports = KafkaPublisher;
