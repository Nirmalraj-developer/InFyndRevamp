'use strict';

const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

class UserRepository {
  constructor() {
    this.collectionName = 'users';
  }

  generateUserId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async findByEmailAndHostName({ emailAddress, hostName }, { projection } = {}) {
    const db = getDb();
    const opts = {};
    if (projection) opts.projection = projection;
    return db.collection(this.collectionName).findOne({ emailAddress, hostName }, opts);
  }

  async findByUserId(userId, { projection, session } = {}) {
    const db = getDb();
    const opts = {};
    if (projection) opts.projection = projection;
    if (session) opts.session = session;
    return db.collection(this.collectionName).findOne({ userId }, opts);
  }

  async findById(id, { projection, session } = {}) {
    const db = getDb();
    const opts = {};
    if (projection) opts.projection = projection;
    if (session) opts.session = session;
    return db.collection(this.collectionName).findOne(
      { _id: new ObjectId(id) },
      opts
    );
  }

  async createRegistrationCandidate({ emailAddress, userName, companyName, hostName }, { session } = {}) {
    const db = getDb();
    const userId = this.generateUserId();
    const userData = {
      userId,
      emailAddress,
      userName,
      companyName: companyName || null,
      hostName,
      emailConfirmed: false,
      status: 'pending',
      role: 'user',
      isVerified: false,
      createdAt: new Date()
    };
    const result = await db.collection(this.collectionName).insertOne(userData, { session });
    return { ...userData, _id: result.insertedId };
  }

  async create({ emailAddress, cognitoUserId, hostName }, { session } = {}) {
    const db = getDb();
    const userId = this.generateUserId();
    const userData = {
      userId,
      emailAddress,
      cognitoUserId,
      hostName,
      role: 'user',
      status: 'active',
      emailConfirmed: true,
      isVerified: true,
      createdAt: new Date()
    };
    const result = await db.collection(this.collectionName).insertOne(userData, { session });
    return { ...userData, _id: result.insertedId };
  }

  async markRegistrationVerified(id, { session } = {}) {
    const db = getDb();
    await db.collection(this.collectionName).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          emailConfirmed: true,
          isVerified: true,
          status: 'active',
          updatedAt: new Date()
        }
      },
      { session }
    );
    return db.collection(this.collectionName).findOne(
      { _id: new ObjectId(id) },
      { session }
    );
  }

  async updateCognitoSubId(id, cognitoUserId, { session } = {}) {
    const db = getDb();
    return db.collection(this.collectionName).updateOne(
      { _id: new ObjectId(id) },
      { $set: { cognitoUserId, updatedAt: new Date() } },
      { session }
    );
  }
}

module.exports = UserRepository;
