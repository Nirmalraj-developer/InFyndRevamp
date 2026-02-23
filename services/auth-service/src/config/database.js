const { MongoClient } = require('mongodb');
const config = require('./index');
const logger = require('../utils/logger');

let client;
let db;

async function connect() {
  client = new MongoClient(process.env.MONGO_URI || config.mongodb.uri, {
    authSource: 'infynd',
    retryWrites: true,
    useUnifiedTopology: true
  });
  await client.connect();
  db = client.db('infynd');

  await createIndexes(db);

  logger.info('MongoDB connected: infynd');
  return db;
}

async function createIndexes(database) {
  const collection = database.collection('users');

  // Create correct index
  await collection.createIndex(
    { emailAddress: 1, hostName: 1 },
    { unique: true, name: 'emailAddress_hostName_unique' }
  );

  // Drop old index if it exists to prevent null collisions
  try {
    await collection.dropIndex('email_tenantId_unique');
    logger.info('Dropped old index: email_tenantId_unique');
  } catch (err) {
    // If index doesn't exist, ignore
    logger.debug('Old index email_tenantId_unique not found or already dropped');
  }

  logger.info('Database indexes synchronized');
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

async function disconnect() {
  if (client) {
    await client.close();
    logger.info('MongoDB disconnected');
  }
}

module.exports = { connect, getDb, disconnect };
