const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  emailAddress: {
    type: String,
    required: true,
    index: true
  },
  userName: String,
  companyName: String,
  hostName: {
    type: String,
    required: true,
    index: true
  },
  cognitoUserId: String,
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
  }
}, {
  timestamps: true
});

userSchema.index({ emailAddress: 1, hostName: 1 }, { unique: true });
userSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
