const mongoose = require('mongoose');
const CreditWallet = require('../models/workspace/CreditWallet.model');
const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');
const User = require('../models/User.model');

class MemberRemovalService {
  async removeMember(params) {
    const { userId, workspaceId } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find all delegated wallets for this member in this workspace
      const delegatedWallets = await CreditWallet.find({
        userId,
        workspaceId,
        sourceType: 'DELEGATED'
      }).session(session);

      // Calculate total remaining delegated credits
      const totalDelegatedCredits = delegatedWallets.reduce(
        (sum, wallet) => sum + wallet.availableCredits,
        0
      );

      // Delete delegated wallets
      await CreditWallet.deleteMany({
        userId,
        workspaceId,
        sourceType: 'DELEGATED'
      }, { session });

      // Sync runtime credit state
      if (totalDelegatedCredits > 0) {
        await User.updateOne(
          { _id: userId },
          {
            $inc: {
              'creditState.totalAvailableCredits': -totalDelegatedCredits,
              'creditState.delegatedCredits': -totalDelegatedCredits
            },
            $set: { 'creditState.lastCreditSyncAt': new Date() }
          },
          { session }
        );
      }

      // Remove WorkspaceAccess
      await WorkspaceAccess.deleteOne({
        userId,
        workspaceId
      }, { session });

      await session.commitTransaction();

      return {
        success: true,
        removedDelegatedCredits: totalDelegatedCredits,
        message: 'Member removed, SELF credits retained'
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new MemberRemovalService();
