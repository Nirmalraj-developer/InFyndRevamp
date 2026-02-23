const express = require('express');
const { initKafka, startConsumers, disconnectKafka, setConsumerHandlers } = require('./config/kafka');
const { initSES } = require('./config/ses');
const { connectDB, closeDB } = require('./config/database');
const { container, initContainer } = require('./container/di-container');
const config = require('./config');

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

async function start() {
  try {
    console.log('[NOTIFICATION] Starting Notification Service...');
    
    // Initialize MongoDB
    await connectDB();
    
    // Initialize SES
    initSES();
    
    // Initialize DI Container
    initContainer();
    
    // Set consumer handlers from DI container
    setConsumerHandlers({
      emailNotification: container.getEmailNotificationConsumer()
    });
    
    // Initialize Kafka
    await initKafka();
    
    // Start consumers
    await startConsumers();
    
    // Start server
    app.listen(config.service.port, () => {
      console.log(`[NOTIFICATION] Service running on port ${config.service.port}`);
    });
    
  } catch (error) {
    console.error('[NOTIFICATION] Failed to start:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('[NOTIFICATION] Shutting down...');
  
  await disconnectKafka();
  await closeDB();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
