const cron = require('node-cron');
const mongoose = require('mongoose');
const CreditWallet = require('../models/workspace/CreditWallet.model');
const User = require('../models/User.model');

class CreditSyncService {
  // Run every hour to expire delegated credits
  startExpirySync() {
    cron.schedule('0 * * * *', async () => {
      console.log('[CREDIT_SYNC] Starting delegated credit expiry check...');
      
      try {
        const expiredWallets = await CreditWallet.find({
          sourceType: 'DELEGATED',
          validUntil: { $lt: new Date() },
          availableCredits: { $gt: 0 }
        });

        for (const wallet of expiredWallets) {
          const session = await mongoose.startSession();
          session.startTransaction();

          try {
            // Deduct expired credits from user runtime quota
            await User.updateOne(
              { _id: wallet.userId },
              {
                $inc: {
                  'creditState.totalAvailableCredits': -wallet.availableCredits,
                  'creditState.delegatedCredits': -wallet.availableCredits
                },
                $set: { 'creditState.lastCreditSyncAt': new Date() }
              },
              { session }
            );

            // Zero out expired wallet
            wallet.availableCredits = 0;
            await wallet.save({ session });

            await session.commitTransaction();
            console.log(`[CREDIT_SYNC] Expired ${wallet.availableCredits} credits for user ${wallet.userId}`);

          } catch (error) {
            await session.abortTransaction();
            console.error('[CREDIT_SYNC] Expiry transaction failed:', error);
          } finally {
            session.endSession();
          }
        }

        console.log(`[CREDIT_SYNC] Processed ${expiredWallets.length} expired wallets`);

      } catch (error) {
        console.error('[CREDIT_SYNC] Expiry sync failed:', error);
      }
    });
  }

  // Run nightly at 2 AM to reconcile creditState with CreditWallet
  startNightlyReconciliation() {
    cron.schedule('0 2 * * *', async () => {
      console.log('[CREDIT_SYNC] Starting nightly reconciliation...');

      try {
        const users = await User.find({});

        for (const user of users) {
          // Aggregate valid wallets
          const walletAgg = await CreditWallet.aggregate([
            {
              $match: {
                userId: user._id,
                validUntil: { $gte: new Date() }
              }
            },
            {
              $group: {
                _id: '$sourceType',
                total: { $sum: '$availableCredits' }
              }
            }
          ]);

          const selfCredits = walletAgg.find(w => w._id === 'SELF')?.total || 0;
          const delegatedCredits = walletAgg.find(w => w._id === 'DELEGATED')?.total || 0;
          const totalCredits = selfCredits + delegatedCredits;

          // Check for mismatch
          const currentTotal = user.creditState?.totalAvailableCredits || 0;

          if (currentTotal !== totalCredits) {
            console.log(`[CREDIT_SYNC] Mismatch for user ${user._id}: runtime=${currentTotal}, wallet=${totalCredits}`);

            // Overwrite with wallet truth
            await User.updateOne(
              { _id: user._id },
              {
                $set: {
                  'creditState.totalAvailableCredits': totalCredits,
                  'creditState.selfCredits': selfCredits,
                  'creditState.delegatedCredits': delegatedCredits,
                  'creditState.lastCreditSyncAt': new Date()
                }
              }
            );

            console.log(`[CREDIT_SYNC] Reconciled user ${user._id}`);
          }
        }

        console.log('[CREDIT_SYNC] Nightly reconciliation completed');

      } catch (error) {
        console.error('[CREDIT_SYNC] Reconciliation failed:', error);
      }
    });
  }

  start() {
    this.startExpirySync();
    this.startNightlyReconciliation();
    console.log('[CREDIT_SYNC] Cron jobs started');
  }
}

module.exports = new CreditSyncService();
