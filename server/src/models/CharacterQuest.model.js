const mongoose = require('mongoose');

/**
 * Tracks per-character quest progress.
 * One document per (character, quest) pair.
 */
const characterQuestSchema = new mongoose.Schema(
  {
    characterId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Character',
      required: true,
      index:    true,
    },
    questId: {
      type:     String,   // matches quests.data.js id field
      required: true,
    },
    status: {
      type:    String,
      enum:    ['active', 'completed', 'failed'],
      default: 'active',
    },
    currentStageId: {
      type:    String,
      default: 'start',
    },
    // Accumulated effects applied so far (for safe replay / debugging)
    appliedEffects: {
      type:    Object,
      default: {},
    },
    completedAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

// A character can only have one active attempt per quest at a time
characterQuestSchema.index({ characterId: 1, questId: 1 }, { unique: true });

module.exports = mongoose.model('CharacterQuest', characterQuestSchema);
