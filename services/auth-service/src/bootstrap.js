'use strict';

const logger = require('./utils/logger');
const {
  connectKafkaProducer,
  setConsumerHandlers,
  initKafkaConsumer,
  startKafkaConsumers
} = require('./config/kafka');
const { container, initContainer } = require('./container/di-container');
const { connect: connectDb } = require('./config/database');
const { initRedis } = require('./config/redis');
const { initCognito } = require('./config/cognito');
const seedTenants = require('./scripts/seed-tenants');

const bootstrap = async () => {
  try {
    logger.info('Starting bootstrap');

    // Connect to MongoDB
    logger.info('Connecting to MongoDB');
    await connectDb();

    // Seed tenants
    logger.info('Seeding tenants');
    await seedTenants();

    // Initialize Redis
    logger.info('Initializing Redis');
    await initRedis();

    // Initialize Cognito
    logger.info('Initializing Cognito');
    initCognito();

    // Connect Kafka Producer
    logger.info('Connecting Kafka');
    await connectKafkaProducer();

    // Initialize DI Container
    logger.info('Initializing DI Container');
    await initContainer();

    // Set listener handlers
    setConsumerHandlers({
      userRegistration: container.getUserRegistrationListener()
    });

    // Start Kafka listeners
    logger.info('Starting Kafka registration listeners');
    await initKafkaConsumer();
    await startKafkaConsumers();

    logger.info('Bootstrap completed successfully');

  } catch (error) {
    logger.error('Bootstrap failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

module.exports = bootstrap;
