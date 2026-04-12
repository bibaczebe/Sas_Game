const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    room: {
      type:    String,
      required: true,
      index:   true,   // fast room queries
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    username: {
      type:     String,
      required: true,
      // denormalised — avoids a join on every chat read
    },
    text: {
      type:      String,
      required:  true,
      maxlength: 300,
    },
    flagged: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt used as message timestamp
  }
);

// Expire messages after 7 days automatically
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
