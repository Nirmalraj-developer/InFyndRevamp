const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  ownerId: {
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
  planName: {
    type: String,
    enum: ['FREE', 'PRO', 'PREMIUM', 'ENTERPRISE'],
    required: true
  },
  memberLimit: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
    default: 'ACTIVE'
  },
  freeRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkspaceRole'
  },
  ownerRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkspaceRole'
  },
  adminRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkspaceRole'
  },
  memberRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkspaceRole'
  },
  trialStartedAt: {
    type: Date,
    default: null
  },
  trialEndsAt: {
    type: Date,
    default: null
  },
  isTrialActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

workspaceSchema.index({ ownerId: 1, tenantId: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
