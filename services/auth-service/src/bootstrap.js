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
const { bootstrapSystemWorkspace } = require('./scripts/bootstrap-system-workspace');

const bootstrap = async () => {
  try {
    console.log('[AUTH] Starting bootstrap...');
    
    // Connect to MongoDB
    console.log('[AUTH] Connecting to MongoDB...');
    await connectDb();
    
    // Seed tenants
    console.log('[AUTH] Seeding tenants...');
    await seedTenants();
    
    // Bootstrap SYSTEM_WORKSPACE
    console.log('[AUTH] Bootstrapping SYSTEM_WORKSPACE...');
    await bootstrapSystemWorkspace();
    
    // Initialize Redis
    console.log('[AUTH] Initializing Redis...');
    await initRedis();
    
    // Initialize Cognito
    console.log('[AUTH] Initializing Cognito...');
    initCognito();
    
    // Connect Kafka Producer
    console.log('[AUTH] Connecting Kafka...');
    await connectKafkaProducer();
    
    // Initialize DI Container
    console.log('[AUTH] Initializing DI Container...');
    await initContainer();

    // Set listener handlers
    setConsumerHandlers({
      userRegistration: container.getUserRegistrationListener()
    });

    // Start Kafka listeners
    console.log('[AUTH] Starting Kafka registration listeners...');
    await initKafkaConsumer();
    await startKafkaConsumers();
    
    console.log('[AUTH] Bootstrap completed successfully');
    
  } catch (error) {
    console.error('[AUTH] Bootstrap failed:', error);
    process.exit(1);
  }
};

module.exports = bootstrap;
