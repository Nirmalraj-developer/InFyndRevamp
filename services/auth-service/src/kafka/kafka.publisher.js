'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');
const { TOPICS, EVENT_TYPES } = require('./topics');

class KafkaPublisher {
  constructor(producer) {
    this.producer = producer;
  }

  async publish(topic, key, event, headers = {}) {
    await this.producer.send({
      topic,
      messages: [{
        key,
        value: JSON.stringify(event),
        headers
      }],
      acks: -1
    });
  }

  async publishUserRegistrationOtpSend(params) {
    const { userId, email, userName, companyName, otp, tenant, hostName, correlationId } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.USER_REGISTRATION_OTP_SEND,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        email,
        userName,
        companyName,
        hostName,
        otp,
        expiresInSec: 300,
        correlationId,
        tenant
      },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.USER_REGISTRATION_OTP_SEND, userId, event, {
      tenantId: tenant.tenantId,
      hostname: hostName
    });
    logger.info('Published USER_REGISTRATION_OTP_SEND', { email, hostName });
  }

  async publishLoginOtpRequested(params) {
    const { email, otp, tenant } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.USER_LOGIN_OTP_REQUESTED,
      timestamp: new Date().toISOString(),
      payload: {
        email,
        otp,
        tenant
      },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.USER_LOGIN_OTP_REQUESTED, email, event, {
      tenantId: tenant.tenantId
    });
    logger.info('Published USER_LOGIN_OTP_REQUESTED', { email });
  }

  async publishUserRegistrationWelcomeEmail(params) {
    const { userId, email, userName, companyName, hostName, tenant, correlationId } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.USER_REGISTRATION_WELCOME_EMAIL,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        email,
        userName,
        companyName,
        hostName,
        correlationId,
        tenant
      },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.USER_REGISTRATION_WELCOME_EMAIL, userId, event, {
      tenantId: tenant.tenantId,
      hostname: hostName
    });
    logger.info('Published USER_REGISTRATION_WELCOME_EMAIL', { email, hostName });
  }

  async publishEmailNotification(params) {
    const { to, subject, html, fromName, fromAddress, configurationSet, tenantId, hostName } = params;
    const event = {
      eventId: crypto.randomUUID(),
      eventType: EVENT_TYPES.EMAIL_NOTIFICATION_REQUESTED,
      timestamp: new Date().toISOString(),
      payload: { to, subject, html, fromName, fromAddress, configurationSet, tenantId, hostName },
      metadata: { source: 'auth-service', version: '1.0' }
    };

    await this.publish(TOPICS.EMAIL_NOTIFICATION, `${tenantId}:${to}`, event, {
      tenantId,
      hostname: hostName
    });
    logger.info('Published EMAIL_NOTIFICATION_REQUESTED', { to, subject, hostName });
  }
}

module.exports = KafkaPublisher;
