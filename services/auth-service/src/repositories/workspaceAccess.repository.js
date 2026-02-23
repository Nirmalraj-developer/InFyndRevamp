const { getDb } = require('../config/mongodb.config');
const { ObjectId } = require('mongodb');

async function assignSystemWorkspaceRole(userId) {
  const { getSystemWorkspace } = require('../scripts/bootstrap-system-workspace');
  const systemWorkspace = await getSystemWorkspace();
  const db = getDb();

  const existing = await db.collection('workspaceaccesses').findOne({
    userId: new ObjectId(userId),
    workspaceId: new ObjectId(systemWorkspace._id)
  });

  if (existing) {
    return existing;
  }

  const result = await db.collection('workspaceaccesses').insertOne({
    userId: new ObjectId(userId),
    workspaceId: new ObjectId(systemWorkspace._id),
    roleId: new ObjectId(systemWorkspace.freeUserRoleId),
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return { _id: result.insertedId, ...result };
}

async function findByUserAndWorkspace(userId, workspaceId) {
  const db = getDb();
  return await db.collection('workspaceaccesses').findOne({
    userId: new ObjectId(userId),
    workspaceId: new ObjectId(workspaceId)
  });
}

async function removeFromSystemWorkspace(userId) {
  const { getSystemWorkspace } = require('../scripts/bootstrap-system-workspace');
  const systemWorkspace = await getSystemWorkspace();
  const db = getDb();

  return await db.collection('workspaceaccesses').deleteOne({
    userId: new ObjectId(userId),
    workspaceId: new ObjectId(systemWorkspace._id)
  });
}

async function findInvitedMembers(userId) {
  const db = getDb();
  return await db.collection('workspaceaccesses').find({
    invitedBy: new ObjectId(userId)
  }).toArray();
}

module.exports = {
  assignSystemWorkspaceRole,
  findByUserAndWorkspace,
  removeFromSystemWorkspace,
  findInvitedMembers
};
