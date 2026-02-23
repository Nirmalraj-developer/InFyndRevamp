'use strict';

const logger = require('../utils/logger');

class TenantService {
  constructor(dependencies) {
    this.tenantRepository = dependencies.tenantRepository;
    this.tenantCache = dependencies.tenantCache;
  }

  async getTenantById(tenantId) {
    return this.tenantRepository.findByTenantId(tenantId);
  }

  async getTenantConfigByHostName(hostName) {
    const cached = await this.tenantCache.getTenantConfig(hostName);
    if (cached) return cached;

    const tenant = await this.tenantRepository.findByDomain(hostName);
    if (tenant) {
      await this.tenantCache.setTenantConfig(hostName, tenant);
    }
    return tenant;
  }
}

module.exports = TenantService;