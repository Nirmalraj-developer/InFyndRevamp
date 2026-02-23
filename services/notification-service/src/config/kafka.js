const { Kafka, CompressionTypes, CompressionCodecs } = require('kafkajs');
const SnappyCodec = require('kafkajs-snappy');
const config = require('../config');

// Register Snappy compression codec
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

let kafka;
let consumer;
let consumerHandlers;

function setConsumerHandlers(handlers) {
  consumerHandlers = handlers;
}

async function initKafka() {
  kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers
  });
  
  consumer = kafka.consumer({
    groupId: config.kafka.groupId,
    retry: {
      retries: 10,
      initialRetryTime: 300,
      multiplier: 2
    }
  });
  
  await consumer.connect();
  
  console.log('[NOTIFICATION] Kafka consumer connected');
}

async function startConsumers() {
  if (!consumerHandlers) {
    throw new Error('Consumer handlers not set. Call setConsumerHandlers first.');
  }
  if (!consumerHandlers.emailNotification) {
    throw new Error('Consumer handlers incomplete.');
  }

  await consumer.subscribe({
    topics: [
      'email.notification'
    ]
  });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      
      try {
        if (topic === 'email.notification') {
          await consumerHandlers.emailNotification.handle(event);
        }
      } catch (error) {
        console.error('[NOTIFICATION] Message processing failed', { 
          topic, 
          error: error.message,
          stack: error.stack
        });
      }
    }
  });
  
  console.log('[NOTIFICATION] Kafka consumers started');
}

async function disconnectKafka() {
  if (consumer) {
    await consumer.disconnect();
    console.log('[NOTIFICATION] Kafka disconnected');
  }
}

module.exports = { initKafka, startConsumers, disconnectKafka, setConsumerHandlers };
