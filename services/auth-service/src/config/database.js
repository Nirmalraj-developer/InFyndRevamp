const { MongoClient } = require('mongodb');
const config = require('./index');

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

  console.log('[AUTH] MongoDB connected: infynd');
  return db;
}

async function createIndexes(database) {
  await database.collection('users').createIndex(
    { email: 1, tenantId: 1 },
    { unique: true, name: 'email_tenantId_unique' }
  );
  console.log('[AUTH] Database indexes created');
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

async function disconnect() {
  if (client) {
    await client.close();
    console.log('[AUTH] MongoDB disconnected');
  }
}

module.exports = { connect, getDb, disconnect };
