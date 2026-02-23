const AppError = require('../utils/app-error');

const checkCreditAvailability = (requiredCredits) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError('User not authenticated', 'AUTH_001', 401);
      }

      // O(1) credit check using denormalized creditState
      const availableCredits = user.creditState?.totalAvailableCredits || 0;

      if (availableCredits < requiredCredits) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'Insufficient credits to perform this action',
            required: requiredCredits,
            available: availableCredits
          }
        });
      }

      req.requiredCredits = requiredCredits;
      next();

    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkCreditAvailability };
