const mongoose = require('mongoose');

const workspaceRoleSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  roleName: {
    type: String,
    required: true,
    enum: ['FREE_USER', 'OWNER', 'ADMIN', 'MEMBER']
  },
  permissions: [{
    type: String
  }],
  isSystemRole: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

workspaceRoleSchema.index({ workspaceId: 1, roleName: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceRole', workspaceRoleSchema);
