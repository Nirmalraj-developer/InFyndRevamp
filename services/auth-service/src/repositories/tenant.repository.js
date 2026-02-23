'use strict';

const { getDb } = require('../config/database');

class TenantRepository {
    constructor() {
        this.collectionName = 'tenants';
    }

    async findByTenantId(tenantId) {
        const db = getDb();
        return db.collection(this.collectionName).findOne({ tenantId });
    }

    async findByDomain(domain) {
        const db = getDb();
        return db.collection(this.collectionName).findOne({ domain });
    }

    async findAll() {
        const db = getDb();
        return db.collection(this.collectionName).find({}).toArray();
    }
}

module.exports = TenantRepository;
