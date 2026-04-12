const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'Username is required'],
      unique:    true,
      trim:      true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match:     [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type:     String,
      required: true,
    },
    refreshTokenHash: {
      type:    String,
      default: null,
    },
    role: {
      type:    String,
      enum:    ['player', 'moderator', 'admin'],
      default: 'player',
    },
    isBanned: {
      type:    Boolean,
      default: false,
    },
    lastLogin: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
