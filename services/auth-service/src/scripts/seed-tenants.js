const { getDb } = require('../config/database');

const seedTenants = async () => {
  try {
    const db = getDb();
    const collection = db.collection('tenants');
    
    // Clear existing tenants
    await collection.deleteMany({});
    
    // Insert default tenant
    await collection.insertOne({
      tenantId: 'default',
      cognitoUserPoolId: 'eu-west-3_YIkTepdFY',
      cognitoClientId: '14e56u6k1j9gudvi6rddvkd172',
      awsRegion: 'eu-west-3',
      domain: 'localhost',
      emailSender: 'noreply@infynd.com',
      kafkaTopicPrefix: 'default',
      createdAt: new Date()
    });
    
    // Insert infynd tenant
    await collection.insertOne({
      tenantId: 'infynd',
      cognitoUserPoolId: 'ap-south-1_InFyndPool',
      cognitoClientId: 'abcd1234xyzInFyndClient',
      awsRegion: 'ap-south-1',
      domain: 'app.infynd.com',
      emailSender: 'noreply@infynd.com',
      kafkaTopicPrefix: 'infynd',
      createdAt: new Date()
    });
    
    console.log('[AUTH] Tenants seeded successfully');
  } catch (error) {
    console.error('[AUTH] Error seeding tenants:', error);
  }
};

module.exports = seedTenants;