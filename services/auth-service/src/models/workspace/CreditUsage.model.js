const mongoose = require('mongoose');

const creditUsageSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  usedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sourceOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creditsUsed: {
    type: Number,
    required: true,
    min: 1
  },
  actionType: {
    type: String,
    enum: ['EXPORT', 'SEARCH', 'ENRICH', 'VERIFY'],
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

creditUsageSchema.index({ workspaceId: 1, usedByUserId: 1 });
creditUsageSchema.index({ sourceOwnerId: 1, usedAt: -1 });

module.exports = mongoose.model('CreditUsage', creditUsageSchema);
