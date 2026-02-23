const { getDb } = require('../config/database');

class TenantService {
  async getTenantById(tenantId) {
    const db = getDb();
    return await db.collection('tenants').findOne({ tenantId });
  }
}

module.exports = new TenantService();