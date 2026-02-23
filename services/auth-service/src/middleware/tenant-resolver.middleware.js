const tenantService = require('../services/tenant.service');

const resolveTenant = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const tenant = await tenantService.getTenantById(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found"
      });
    }
    
    req.tenant = {
      tenantId: tenant.tenantId,
      hostname: tenant.domain,
      cognitoUserPoolId: tenant.cognitoUserPoolId,
      cognitoClientId: tenant.cognitoClientId,
      config: tenant
    };
    
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  resolveTenant
};
