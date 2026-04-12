/**
 * LevelingService — Chapter 10
 *
 * XP formula: floor(1000 * level^1.4)
 * Per level:  +3 stat points, +10 max HP, +5 max energy
 * Per 5 lvls: +1 talent point
 */

const {
  xpToNextLevel, MAX_LEVEL,
  STAT_POINTS_PER_LEVEL, HP_PER_LEVEL, ENERGY_PER_LEVEL, TALENT_POINT_EVERY,
} = require('../config/constants');

function checkLevelUp(level, currentXP) {
  let newLevel = level;
  let levelsGained = 0;

  while (newLevel < MAX_LEVEL && currentXP >= xpToNextLevel(newLevel)) {
    currentXP -= xpToNextLevel(newLevel);
    newLevel++;
    levelsGained++;
  }

  const talentPointsGained = Math.floor(newLevel / TALENT_POINT_EVERY) - Math.floor(level / TALENT_POINT_EVERY);

  return {
    leveled:            levelsGained > 0,
    levelsGained,
    newLevel,
    remainingXP:        currentXP,
    statPointsGained:   levelsGained * STAT_POINTS_PER_LEVEL,
    talentPointsGained: Math.max(0, talentPointsGained),
    hpGained:           levelsGained * HP_PER_LEVEL,
    energyGained:       levelsGained * ENERGY_PER_LEVEL,
  };
}

function applyLevelUp(character, result) {
  if (!result.leveled) return;

  character.level              = result.newLevel;
  character.currentXP          = result.remainingXP;
  character.unspentStatPoints += result.statPointsGained;
  character.talentPoints       = (character.talentPoints || 0) + result.talentPointsGained;

  // Recalculate derived stats
  const derived = character.getDerivedStats?.() || {};
  const oldMaxHP  = character.maxHP   || 100;
  const oldMaxEn  = character.maxEnergy || 50;

  character.maxHP     = derived.maxHP     || (oldMaxHP  + result.hpGained);
  character.maxEnergy = derived.maxEnergy || (oldMaxEn + result.energyGained);

  // Partial heal on level-up (restore the HP/energy gained)
  character.currentHP     = Math.min(character.currentHP + result.hpGained, character.maxHP);
  character.currentEnergy = Math.min((character.currentEnergy || 0) + result.energyGained, character.maxEnergy);
}

async function grantXP(character, amount) {
  // Apply race XP bonus if set
  const xpBonus = character._xpBonus || 0;
  const finalXP = Math.floor(amount * (1 + xpBonus));

  character.currentXP += finalXP;
  const result = checkLevelUp(character.level, character.currentXP);
  applyLevelUp(character, result);
  await character.save();
  return { ...result, xpGranted: finalXP };
}

module.exports = { xpToNextLevel, checkLevelUp, applyLevelUp, grantXP };
