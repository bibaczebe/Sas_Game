const mongoose = require('mongoose');

const statBonusSchema = new mongoose.Schema(
  {
    strength:     { type: Number, default: 0 },
    agility:      { type: Number, default: 0 },
    endurance:    { type: Number, default: 0 },
    intelligence: { type: Number, default: 0 },
    charisma:     { type: Number, default: 0 },
    damage:       { type: Number, default: 0 }, // weapon attack power
    armor:        { type: Number, default: 0 }, // armor defense
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type:     String,
      enum:     ['weapon', 'armor', 'consumable', 'quest_item'],
      required: true,
    },
    slot: {
      type:     String,
      enum:     ['head', 'chest', 'legs', 'weapon', 'offhand', 'consumable', 'none'],
      required: true,
    },
    rarity: {
      type:    String,
      enum:    ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    levelRequirement: { type: Number, default: 1, min: 1 },
    classRestriction: [{ type: String, enum: ['warrior', 'archer', 'mage'] }],
    statBonuses: { type: statBonusSchema, default: () => ({}) },
    consumableEffect: {
      healHP:        { type: Number, default: 0 },
      restoreStamina:{ type: Number, default: 0 },
      buffStat:      { type: String,  default: null },
      buffAmount:    { type: Number, default: 0 },
      buffDuration:  { type: Number, default: 0 }, // in turns
    },
    buyPrice:   { type: Number, default: 10, min: 0 },
    sellPrice:  { type: Number, default: 5,  min: 0 },
    spriteKey:  { type: String, default: 'item_default' },
    isShopItem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
