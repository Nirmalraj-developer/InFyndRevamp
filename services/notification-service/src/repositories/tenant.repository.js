const { getDB } = require('../config/database');

class TenantRepository {
  async findByTenantId(tenantId) {
    const db = getDB();
    return await db.collection('tenants').findOne({ tenantId });
  }
}

module.exports = TenantRepository;
