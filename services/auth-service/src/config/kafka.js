'use strict';

const { Kafka, CompressionTypes, CompressionCodecs } = require('kafkajs');
const SnappyCodec = require('kafkajs-snappy');
const config = require('./index');
const logger = require('../utils/logger');
const { TOPICS } = require('../kafka/topics');

// Register Snappy compression codec
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

let kafka;
let producer;
let consumer;
let consumerHandlers;

const connectKafkaProducer = async () => {
  kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers
  });

  producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 5
  });

  await producer.connect();

  logger.info('Kafka producer connected');
};

function setConsumerHandlers(handlers) {
  consumerHandlers = handlers;
}

async function initKafkaConsumer() {
  if (!kafka) {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers
    });
  }

  consumer = kafka.consumer({
    groupId: config.kafka.groupId,
    retry: {
      retries: 10,
      initialRetryTime: 300,
      multiplier: 2
    }
  });

  await consumer.connect();
  logger.info('Kafka consumer connected');
}

async function startKafkaConsumers() {
  if (!consumerHandlers?.userRegistration) {
    throw new Error('Kafka consumer handlers not initialized for userRegistration');
  }

  await consumer.subscribe({
    topics: [
      TOPICS.USER_REGISTRATION_OTP_SEND,
      TOPICS.USER_REGISTRATION_WELCOME_EMAIL,
      TOPICS.USER_LOGIN_OTP_REQUESTED
    ]
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value.toString());

      try {
        if (topic === TOPICS.USER_REGISTRATION_OTP_SEND) {
          await consumerHandlers.userRegistration.handleRegistrationOtpSend(event);
        } else if (topic === TOPICS.USER_REGISTRATION_WELCOME_EMAIL) {
          await consumerHandlers.userRegistration.handleRegistrationWelcomeEmail(event);
        } else if (topic === TOPICS.USER_LOGIN_OTP_REQUESTED) {
          await consumerHandlers.userRegistration.handleLoginOtpRequested(event);
        }
      } catch (error) {
        logger.error('Consumer message processing failed', {
          topic,
          eventType: event.eventType,
          eventId: event.eventId,
          error: error.message
        });
      }
    }
  });

  logger.info('Kafka registration consumers started');
}

function getProducer() {
  if (!producer) {
    throw new Error('Kafka producer not initialized');
  }
  return producer;
}

async function disconnectKafka() {
  if (consumer) {
    await consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  }
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka producer disconnected');
  }
}

module.exports = {
  connectKafkaProducer,
  getProducer,
  disconnectKafka,
  setConsumerHandlers,
  initKafkaConsumer,
  startKafkaConsumers
};
