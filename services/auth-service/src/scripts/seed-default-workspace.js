const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');

async function seedDefaultWorkspace() {
  try {
    const db = getDb();
    
    // Check if any workspace exists
    const existingWorkspace = await db.collection('workspaces').findOne({});
    
    if (existingWorkspace) {
      console.log('[SEED] Workspace already exists, skipping default workspace creation');
      return existingWorkspace;
    }

    // Create default workspace
    const defaultWorkspace = {
      ownerId: new ObjectId(),
      tenantId: 'default_tenant',
      planName: 'FREE',
      memberLimit: 0,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('workspaces').insertOne(defaultWorkspace);
    
    console.log('[SEED] Created default workspace:', {
      _id: result.insertedId,
      tenantId: defaultWorkspace.tenantId,
      planName: defaultWorkspace.planName
    });

    return { ...defaultWorkspace, _id: result.insertedId };

  } catch (error) {
    console.error('[SEED] Failed to create default workspace:', error);
    throw error;
  }
}

module.exports = { seedDefaultWorkspace };
