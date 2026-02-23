const mongoose = require('mongoose');

const creditWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  sourceType: {
    type: String,
    enum: ['SELF', 'DELEGATED'],
    required: true
  },
  sourceOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null
  },
  availableCredits: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  validUntil: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

creditWalletSchema.index({ userId: 1, sourceType: 1, sourceOwnerId: 1 });
creditWalletSchema.index({ userId: 1, tenantId: 1 });

module.exports = mongoose.model('CreditWallet', creditWalletSchema);
