module.exports = {
  service: {
    name: 'auth-service',
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  mongodb: {
    uri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGO_DB_NAME || 'infynd',
    options: {
      maxPoolSize: 50,
      minPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    }
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'auth-service',
    groupId: process.env.KAFKA_GROUP_ID || 'auth-service-consumer-group'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: '15m'
  },
  aws: {
    cognitoRegion: process.env.AWS_REGION || 'ap-south-1'
  },
  registration: {
    otpExpiryTimeSec: parseInt(process.env.OTP_EXPIRY_TIME || '300', 10),
    suppressedDomains: (process.env.SUPPRESSED_DOMAINS || '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  },
  redis: {
    uri: process.env.REDIS_URI || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
  }
};
