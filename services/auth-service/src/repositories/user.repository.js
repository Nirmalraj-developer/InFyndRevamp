const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

class UserRepository {
  constructor() {
    this.collectionName = 'users';
  }

  async existsByEmailAndHostName(params) {
    const { email, hostName } = params;
    const db = getDb();
    const count = await db.collection(this.collectionName).countDocuments({
      email,
      hostName
    });
    return count > 0;
  }

  async findByEmailAndHostName(params) {
    const { email, hostName } = params;
    const db = getDb();
    const userData = await db.collection(this.collectionName).findOne({
      email,
      hostName
    });
    if (!userData) return null;
    return userData;
  }

  async findByEmailAndTenant(params) {
    const { email, tenantId } = params;
    const db = getDb();
    const userData = await db.collection(this.collectionName).findOne({
      email,
      tenantId
    });
    if (!userData) return null;
    return userData;
  }

  async findById(params) {
    const { userId } = params;
    const db = getDb();
    const userData = await db.collection(this.collectionName).findOne({
      _id: new ObjectId(userId)
    });
    if (!userData) return null;
    return userData;
  }

  async createRegistrationCandidate(params) {
    const { email, userName, companyName, hostName, tenantId } = params;
    const db = getDb();
    const userData = {
      email,
      userName,
      companyName: companyName || null,
      hostName,
      tenantId,
      emailConfirmed: false,
      status: 'pending',
      role: 'user',
      createdAt: new Date()
    };
    const result = await db.collection(this.collectionName).insertOne(userData);
    return { ...userData, _id: result.insertedId };
  }

  async create(params) {
    const { email, cognitoUserId, tenantId } = params;
    const db = getDb();
    const userData = {
      email,
      cognitoUserId,
      tenantId,
      role: 'user',
      status: 'active',
      emailConfirmed: true,
      createdAt: new Date()
    };
    const result = await db.collection(this.collectionName).insertOne(userData);
    return { ...userData, _id: result.insertedId };
  }

  async markRegistrationVerified(params) {
    const { userId } = params;
    const db = getDb();
    await db.collection(this.collectionName).updateOne(
      { _id: userId },
      {
        $set: {
          emailConfirmed: true,
          status: 'active',
          updatedAt: new Date()
        }
      }
    );
    const userData = await db.collection(this.collectionName).findOne({ _id: userId });
    return userData;
  }
}

module.exports = UserRepository;
