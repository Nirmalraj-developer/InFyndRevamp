const { sendSuccess } = require('../utils/response.util');
const AppError = require('../utils/app-error');

class SubscriptionController {
  constructor(dependencies) {
    this.subscriptionService = dependencies.subscriptionService;
    this.createSubscription = this.createSubscription.bind(this);
    this.cancelSubscription = this.cancelSubscription.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  async createSubscription(req, res, next) {
    try {
      const { planId, paymentMethodId } = req.body;
      const { user, tenant } = req;

      if (!planId || !paymentMethodId) {
        throw new AppError('Plan ID and payment method are required', 'VALIDATION_001', 400);
      }

      const result = await this.subscriptionService.createSubscription({
        userId: user.id,
        planId,
        tenantId: tenant.tenantId,
        paymentMethodId
      });

      return sendSuccess(res, {
        data: result,
        message: 'Subscription created successfully',
        statusCode: 201,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelSubscription(req, res, next) {
    try {
      const { subscriptionId } = req.params;
      const { user } = req;

      const result = await this.subscriptionService.cancelSubscription({
        subscriptionId,
        userId: user.id
      });

      return sendSuccess(res, {
        data: result,
        message: 'Subscription cancelled successfully',
        statusCode: 200,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const { user } = req;

      const result = await this.subscriptionService.getSubscriptionStatus({
        userId: user.id
      });

      return sendSuccess(res, {
        data: result,
        message: 'Subscription status retrieved',
        statusCode: 200,
        correlationId: req.correlationId
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubscriptionController;