const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  userName: String,
  companyName: String,
  hostName: String,
  cognitoUserId: String,
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    default: 'user'
  },
  emailConfirmed: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'active'
  },
  authProvider: {
    type: String,
    enum: ['COGNITO', 'LOCAL'],
    default: 'LOCAL'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  creditState: {
    totalAvailableCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    selfCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    delegatedCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    lastCreditSyncAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1, tenantId: 1 });
userSchema.index({ email: 1, hostName: 1 });

module.exports = mongoose.model('User', userSchema);
