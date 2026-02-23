const mongoose = require('mongoose');
const CreditWallet = require('../models/workspace/CreditWallet.model');
const WorkspaceAccess = require('../models/workspace/WorkspaceAccess.model');

class CreditDelegationService {
  async delegateCredits(params) {
    const { ownerId, memberId, workspaceId, tenantId, credits, validUntil } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find owner's SELF wallet
      const ownerWallet = await CreditWallet.findOne({
        userId: ownerId,
        tenantId,
        sourceType: 'SELF'
      }).session(session);

      if (!ownerWallet) {
        throw new Error('Owner wallet not found');
      }

      if (ownerWallet.availableCredits < credits) {
        throw new Error('Insufficient credits');
      }

      // Deduct from owner wallet
      ownerWallet.availableCredits -= credits;
      await ownerWallet.save({ session });

      // Create delegated wallet for member
      await CreditWallet.create([{
        userId: memberId,
        tenantId,
        sourceType: 'DELEGATED',
        sourceOwnerId: ownerId,
        workspaceId,
        availableCredits: credits,
        validUntil
      }], { session });

      // Update WorkspaceAccess
      await WorkspaceAccess.findOneAndUpdate(
        { workspaceId, userId: memberId },
        {
          delegatedCredits: credits,
          delegatedValidUntil: validUntil
        },
        { session }
      );

      // Update owner runtime quota
      const User = require('../models/User.model');
      await User.updateOne(
        { _id: ownerId },
        {
          $inc: {
            'creditState.totalAvailableCredits': -credits,
            'creditState.selfCredits': -credits
          },
          $set: { 'creditState.lastCreditSyncAt': new Date() }
        },
        { session }
      );

      // Update member runtime quota
      await User.updateOne(
        { _id: memberId },
        {
          $inc: {
            'creditState.totalAvailableCredits': credits,
            'creditState.delegatedCredits': credits
          },
          $set: { 'creditState.lastCreditSyncAt': new Date() }
        },
        { session }
      );

      await session.commitTransaction();

      return {
        success: true,
        ownerRemainingCredits: ownerWallet.availableCredits,
        memberDelegatedCredits: credits
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async consumeCredits(params) {
    const { userId, workspaceId, credits, actionType, sourceOwnerId } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find member's delegated wallet
      const memberWallet = await CreditWallet.findOne({
        userId,
        sourceType: 'DELEGATED',
        sourceOwnerId,
        workspaceId,
        availableCredits: { $gte: credits }
      }).session(session);

      if (!memberWallet) {
        throw new Error('Insufficient delegated credits');
      }

      // Check validity
      if (new Date() > memberWallet.validUntil) {
        throw new Error('Delegated credits expired');
      }

      // Deduct from member wallet
      memberWallet.availableCredits -= credits;
      await memberWallet.save({ session });

      // Create usage ledger
      const CreditUsage = require('../models/workspace/CreditUsage.model');
      await CreditUsage.create([{
        workspaceId,
        usedByUserId: userId,
        sourceOwnerId,
        creditsUsed: credits,
        actionType,
        usedAt: new Date()
      }], { session });

      // Update member runtime quota
      const User = require('../models/User.model');
      await User.updateOne(
        { _id: userId },
        {
          $inc: {
            'creditState.totalAvailableCredits': -credits,
            'creditState.delegatedCredits': -credits
          },
          $set: { 'creditState.lastCreditSyncAt': new Date() }
        },
        { session }
      );

      await session.commitTransaction();

      return {
        success: true,
        remainingCredits: memberWallet.availableCredits
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new CreditDelegationService();
