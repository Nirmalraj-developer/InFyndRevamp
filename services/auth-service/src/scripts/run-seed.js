const mongoose = require('mongoose');
const config = require('../config');
const seedTenants = require('./seed-tenants');

const runSeed = async () => {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');
    
    await seedTenants();
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

runSeed();