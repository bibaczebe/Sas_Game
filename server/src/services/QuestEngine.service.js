/**
 * QuestEngine.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages quest progression, applies choice effects to characters.
 *
 * Responsibilities:
 *  • List available / active quests for a character
 *  • Start a quest (create CharacterQuest record)
 *  • Advance a quest by choosing an option
 *  • Apply effects (HP, gold, XP, stat buffs) to the character document
 *  • Grant base reward on completion
 * ─────────────────────────────────────────────────────────────────────────────
 */

const QUESTS        = require('../data/quests.data');
const CharacterQuest = require('../models/CharacterQuest.model');
const Character     = require('../models/Character.model');
const { grantXP }   = require('./LevelingService');

// Build lookup map for O(1) access
const QUEST_MAP = new Map(QUESTS.map(q => [q.id, q]));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getQuest(questId) {
  const q = QUEST_MAP.get(questId);
  if (!q) throw new Error(`Quest not found: ${questId}`);
  return q;
}

function getStage(quest, stageId) {
  const stage = quest.stages.find(s => s.id === stageId);
  if (!stage) throw new Error(`Stage not found: ${stageId} in quest ${quest.id}`);
  return stage;
}

/**
 * Apply a choice's effects to the character (mutates in place, caller saves).
 * Returns a summary of what changed.
 */
async function applyEffects(character, effects = {}) {
  const changes = {};

  if (effects.hp) {
    const delta = effects.hp >= 999
      ? character.maxHP - character.currentHP  // full heal
      : effects.hp;
    character.currentHP = Math.max(1, Math.min(character.maxHP, character.currentHP + delta));
    changes.hp = delta;
  }

  if (effects.gold) {
    character.gold = Math.max(0, character.gold + effects.gold);
    changes.gold = effects.gold;
  }

  if (effects.statBuff) {
    const { stat, value } = effects.statBuff;
    const VALID = ['strength', 'agility', 'endurance', 'intelligence', 'charisma'];
    if (VALID.includes(stat)) {
      character.baseStats[stat] = (character.baseStats[stat] || 0) + value;
      changes.statBuff = effects.statBuff;

      // Recalculate derived maxHP if endurance changed
      if (stat === 'endurance') {
        const derived = character.getDerivedStats();
        character.maxHP = derived.maxHP;
      }
    }
  }

  // XP applied via LevelingService (handles level-up)
  let levelResult = null;
  if (effects.xp && effects.xp > 0) {
    levelResult = await grantXP(character, effects.xp);
    changes.xp = effects.xp;
  } else {
    await character.save();
  }

  return { changes, levelResult };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * List all quests a character can start or has in progress.
 */
async function listAvailable(characterId, characterLevel) {
  const activeRecords = await CharacterQuest.find({ characterId, status: 'active' });
  const completedIds  = (await CharacterQuest.find({ characterId, status: 'completed' })).map(r => r.questId);
  const activeIds     = new Set(activeRecords.map(r => r.questId));

  return QUESTS.filter(q => q.levelRequirement <= characterLevel).map(q => ({
    id:               q.id,
    name:             q.name,
    description:      q.description,
    type:             q.type,
    levelRequirement: q.levelRequirement,
    baseReward:       q.baseReward,
    status: activeIds.has(q.id)  ? 'active'
          : completedIds.includes(q.id) ? 'completed'
          : 'available',
  }));
}

/**
 * Start a quest. Creates a CharacterQuest record.
 * Returns the initial stage for the client to display.
 */
async function startQuest(characterId, questId) {
  const quest = getQuest(questId);

  const existing = await CharacterQuest.findOne({ characterId, questId });
  if (existing) {
    if (existing.status === 'active') {
      // Return current stage
      return { record: existing, stage: getStage(quest, existing.currentStageId), quest };
    }
    // Re-start completed / failed quest by updating record
    existing.status         = 'active';
    existing.currentStageId = 'start';
    existing.appliedEffects = {};
    existing.completedAt    = null;
    await existing.save();
    return { record: existing, stage: getStage(quest, 'start'), quest };
  }

  const record = await CharacterQuest.create({ characterId, questId, currentStageId: 'start' });
  return { record, stage: getStage(quest, 'start'), quest };
}

/**
 * Make a choice on the current stage.
 * Returns { nextStage, effectSummary, completed, levelResult }
 */
async function makeChoice(characterId, questId, choiceIndex) {
  const quest  = getQuest(questId);
  const record = await CharacterQuest.findOne({ characterId, questId, status: 'active' });
  if (!record) throw new Error('Quest not active for this character');

  const stage  = getStage(quest, record.currentStageId);
  if (stage.type !== 'choice') throw new Error('No choices available at current stage');

  const choice = stage.choices[choiceIndex];
  if (!choice) throw new Error(`Invalid choice index: ${choiceIndex}`);

  const character = await Character.findById(characterId);
  if (!character) throw new Error('Character not found');

  // Handle flee / early exit
  if (choice.effects?.flee || choice.effects?.end) {
    record.status      = choice.effects?.flee ? 'failed' : 'completed';
    record.completedAt = new Date();
    await record.save();
    const effectSummary = await applyEffects(character, choice.effects);
    return { completed: true, fled: !!choice.effects?.flee, effectSummary };
  }

  // Apply stage effects
  const effectSummary = await applyEffects(character, choice.effects || {});

  // Advance to next stage
  const nextStageId = choice.nextStage;
  const nextStage   = quest.stages.find(s => s.id === nextStageId);

  if (!nextStage) throw new Error(`Next stage not found: ${nextStageId}`);

  record.currentStageId = nextStageId;

  if (nextStage.type === 'end') {
    // Apply terminal stage effects (e.g. statBuff on 'end' stages)
    const termEffects = await applyEffects(character, nextStage.effects || {});
    effectSummary.changes = { ...effectSummary.changes, ...termEffects.changes };

    // Grant base quest reward
    const char = await Character.findById(characterId);
    char.gold += quest.baseReward.gold;
    const lvlResult = await grantXP(char, quest.baseReward.xp);

    record.status      = 'completed';
    record.completedAt = new Date();
    await record.save();

    return {
      completed:     true,
      fled:          false,
      stage:         nextStage,
      reward:        quest.baseReward,
      effectSummary,
      levelResult:   lvlResult,
    };
  }

  await record.save();
  return {
    completed:     false,
    stage:         nextStage,
    effectSummary,
    levelResult:   effectSummary.levelResult,
  };
}

/**
 * Get the current stage for an active quest (to resume display after a page refresh).
 */
async function getCurrentStage(characterId, questId) {
  const quest  = getQuest(questId);
  const record = await CharacterQuest.findOne({ characterId, questId, status: 'active' });
  if (!record) return null;
  return { stage: getStage(quest, record.currentStageId), quest, record };
}

module.exports = {
  listAvailable,
  startQuest,
  makeChoice,
  getCurrentStage,
  QUEST_MAP,
};
