const { MongoClient } = require('mongodb');
const config = require('./index');

let client;
let db;

async function connectDB() {
  client = new MongoClient(config.mongodb.uri);
  await client.connect();
  db = client.db(config.mongodb.dbName);
  
  console.log('[NOTIFICATION] MongoDB connected');
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
  }
}

module.exports = { connectDB, getDB, closeDB };
