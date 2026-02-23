const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const bootstrap = require('./bootstrap');
const { container } = require('./container/di-container');
const { disconnectKafka } = require('./config/kafka');
const { disconnect: disconnectDb } = require('./config/database');
const { disconnectRedis } = require('./config/redis');
const correlationMiddleware = require('./middleware/correlation.middleware');
const enforceHttps = require('./middleware/https.middleware');
const authRoutes = require('./routes/auth.routes');
const errorMiddleware = require('./middleware/error.middleware');
const config = require('./config');
const { HELMET_CONFIG, SANITIZE_CONFIG } = require('./constants/security.constants');

const startServer = async () => {
  await bootstrap();
  
  const app = express();
  
  // Trust proxy for rate limiting behind load balancer
  app.set('trust proxy', 1);
  
  // Security middleware (global)
  app.use(helmet({
    contentSecurityPolicy: HELMET_CONFIG.CONTENT_SECURITY_POLICY,
    hsts: {
      maxAge: HELMET_CONFIG.HSTS_MAX_AGE,
      includeSubDomains: HELMET_CONFIG.HSTS_INCLUDE_SUBDOMAINS,
      preload: HELMET_CONFIG.HSTS_PRELOAD
    }
  }));
  
  app.use(mongoSanitize({
    replaceWith: SANITIZE_CONFIG.REPLACE_WITH,
    allowDots: SANITIZE_CONFIG.ALLOW_DOTS
  }));
  
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use(enforceHttps);
  
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', correlationId: req.correlationId });
  });
  
  app.use('/auth', authRoutes);
  
  app.use(errorMiddleware);
  
  app.listen(config.service.port, () => {
    console.log(`[AUTH] Service running on port ${config.service.port}`);
  });
};

async function shutdown() {
  console.log('[AUTH] Shutting down...');
  
  await disconnectKafka();
  await disconnectDb();
  await disconnectRedis();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer().catch((error) => {
  console.error('[AUTH] Failed to start server:', error);
  process.exit(1);
});


