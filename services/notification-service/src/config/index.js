module.exports = {
  service: {
    name: 'notification-service',
    port: process.env.PORT || 3003,
    env: process.env.NODE_ENV || 'development'
  },
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://admin:admin123@localhost:27017',
    dbName: process.env.MONGO_DB_NAME || 'infynd'
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'notification-service',
    groupId: 'notification-service-workers'
  },
  aws: {
    sesRegion: process.env.AWS_REGION || 'ap-south-1'
  },
  internalEmails: {
    infynd: (process.env.INTERNAL_USERS_INFYND || '').split(',').filter(Boolean),
    acme: (process.env.INTERNAL_USERS_ACME || '').split(',').filter(Boolean)
  }
};
