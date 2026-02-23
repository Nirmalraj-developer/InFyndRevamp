const mongoose = require('mongoose');

const workspaceAccessSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkspaceRole',
    required: true
  },
  deniedPermissions: [{
    type: String
  }],
  delegatedCredits: {
    type: Number,
    default: 0
  },
  delegatedValidUntil: {
    type: Date,
    default: null
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

workspaceAccessSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceAccessSchema.index({ userId: 1 });

module.exports = mongoose.model('WorkspaceAccess', workspaceAccessSchema);
