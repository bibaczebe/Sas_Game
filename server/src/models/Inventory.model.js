const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    characterId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Character',
      required: true,
    },
    itemId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Item',
      required: true,
    },
    quantity: {
      type:    Number,
      default: 1,
      min:     [1, 'Quantity cannot be less than 1'],
    },
    acquiredAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index — one row per (character, item) pair; use quantity for stacking
inventorySchema.index({ characterId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
