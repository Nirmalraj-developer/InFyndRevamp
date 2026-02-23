'use strict';

const logger = require('../utils/logger');

class TenantService {
  constructor(dependencies) {
    this.tenantRepository = dependencies.tenantRepository;
  }

  async getTenantById(tenantId) {
    return this.tenantRepository.findByTenantId(tenantId);
  }
}

module.exports = TenantService;