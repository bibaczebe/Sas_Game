const mongoose = require('mongoose');
const {
  RACES, CHARACTER_CLASSES, CLASS_BASE_STATS,
  xpToNextLevel, STARTER_ZONE_MAX_LEVEL,
  HP_PER_LEVEL, ENERGY_PER_LEVEL, TALENT_POINT_EVERY,
} = require('../config/constants');

// ── 8-stat schema — Chapter 2.4 ──────────────────────────────────────────────
const baseStatsSchema = new mongoose.Schema({
  strength:  { type: Number, default: 5, min: 0 },   // physical damage, weapon req
  agility:   { type: Number, default: 5, min: 0 },   // speed, dodge, move range
  attack:    { type: Number, default: 5, min: 0 },   // hit chance
  defense:   { type: Number, default: 5, min: 0 },   // damage reduction, block
  vitality:  { type: Number, default: 5, min: 0 },   // max HP
  charisma:  { type: Number, default: 5, min: 0 },   // prices, taunt, quest rewards
  endurance: { type: Number, default: 5, min: 0 },   // max energy
  magic:     { type: Number, default: 0, min: 0 },   // spell damage (magic classes)
}, { _id: false });

const equippedItemsSchema = new mongoose.Schema({
  head:    { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  chest:   { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  legs:    { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  weapon:  { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  offhand: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  ring1:   { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  ring2:   { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  amulet:  { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
}, { _id: false });

const characterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User',
    required: true, unique: true,
  },
  name: {
    type: String, required: [true, 'Name required'],
    trim: true, minlength: 2, maxlength: 24,
  },

  // ── Identity ──────────────────────────────────────────────────────────────
  race: {
    type: String,
    enum: Object.keys(RACES),
    default: 'human',
  },
  class: {
    type: String,
    enum: Object.values(CHARACTER_CLASSES),
    required: [true, 'Class is required'],
  },

  // ── Progression — Chapter 10 ──────────────────────────────────────────────
  level:             { type: Number, default: 1,   min: 1, max: 50 },
  currentXP:         { type: Number, default: 0,   min: 0 },
  unspentStatPoints: { type: Number, default: 0,   min: 0 },
  talentPoints:      { type: Number, default: 0,   min: 0 },  // 1 per 5 levels

  // ── Stats — Chapter 2.4 ───────────────────────────────────────────────────
  baseStats: { type: baseStatsSchema, default: () => ({}) },

  // ── Resources ─────────────────────────────────────────────────────────────
  currentHP:      { type: Number, default: 100, min: 0 },
  maxHP:          { type: Number, default: 100 },
  currentEnergy:  { type: Number, default: 50,  min: 0 },   // "Stamina" in combat
  maxEnergy:      { type: Number, default: 50 },
  gold:           { type: Number, default: 100, min: 0 },

  // ── Equipment ─────────────────────────────────────────────────────────────
  equippedItems: { type: equippedItemsSchema, default: () => ({}) },

  // ── World — Chapter 3 ─────────────────────────────────────────────────────
  currentZone: { type: String, default: 'starter' },
  // Active expedition (null if idle)
  activeExpedition: {
    expeditionId: { type: String, default: null },
    startedAt:    { type: Date,   default: null },
    endsAt:       { type: Date,   default: null },
    collected:    { type: Boolean, default: false },
  },

  // ── Arena position (live combat state, not persisted between fights) ──────
  arenaPosition: { type: Number, default: 1 },  // 1–10

  // ── Appearance ────────────────────────────────────────────────────────────
  appearance: {
    skinTone:  { type: Number, default: 0 },
    hairColor: { type: Number, default: 0 },
    faceStyle: { type: Number, default: 0 },
  },

  // ── Stats tracking ────────────────────────────────────────────────────────
  combatStats: {
    wins:            { type: Number, default: 0 },
    losses:          { type: Number, default: 0 },
    expeditions:     { type: Number, default: 0 },
    questsCompleted: { type: Number, default: 0 },
  },
}, { timestamps: true });

// ── Derived stat formulas — Chapter 5.1 ──────────────────────────────────────
/**
 * Compute all derived combat stats from base stats + equipped items.
 * Formula (Chapter 5.1):
 *   HP_max      = Vitality * 10 + race_hp_bonus + level*HP_PER_LEVEL
 *   Energy_max  = Endurance * 5 + level*ENERGY_PER_LEVEL
 *   Hit chance  = Attack / (Attack + enemy_Defense) * 100
 *   DMG formula = Strength * dmg_mult * rand(0.85-1.15) + weapon_dmg - enemy_Defense
 */
characterSchema.methods.getDerivedStats = function (equippedItemDocs = []) {
  const s    = this.baseStats;
  const race = RACES[this.race] || RACES.human;

  // Equipment bonuses
  let weaponDmg = 0, armorRating = 0;
  let strBonus = 0, agiBonus = 0, defBonus = 0, vitBonus = 0;
  for (const item of equippedItemDocs) {
    if (!item?.statBonuses) continue;
    strBonus    += item.statBonuses.strength  || 0;
    agiBonus    += item.statBonuses.agility   || 0;
    defBonus    += item.statBonuses.defense   || 0;
    vitBonus    += item.statBonuses.vitality  || 0;
    armorRating += item.statBonuses.armor     || 0;
    weaponDmg   += item.statBonuses.damage    || 0;
  }

  // Race stat bonus
  const rb = race.statBonus || {};
  const totalStr = (s.strength  || 0) + strBonus + (rb.strength  || 0);
  const totalAgi = (s.agility   || 0) + agiBonus + (rb.agility   || 0);
  const totalDef = (s.defense   || 0) + defBonus + (rb.defense   || 0);
  const totalVit = (s.vitality  || 0) + vitBonus + (rb.vitality  || 0);
  const totalEnd = (s.endurance || 0) + (rb.endurance || 0);
  const totalAtk = (s.attack    || 0) + (rb.attack    || 0);
  const totalCha = (s.charisma  || 0) + (rb.charisma  || 0);
  const totalMag = (s.magic     || 0) + (rb.magic     || 0);

  // HP: Vitality*10 + raceBonus + levelBonus
  const hpRaceBonus = race.hpBonus ? Math.floor(totalVit * 10 * race.hpBonus) : 0;
  const maxHP       = Math.floor(totalVit * 10 + hpRaceBonus + (this.level - 1) * HP_PER_LEVEL + 50);

  // Energy: Endurance*5 + levelBonus
  const maxEnergy = Math.floor(totalEnd * 5 + (this.level - 1) * ENERGY_PER_LEVEL + 30);

  // Dodge: agility based + race bonus
  const dodgeChance = Math.min(
    Math.floor(totalAgi * 0.4) + Math.floor((race.dodgeBonus || 0) * 100),
    50
  );

  // Taunt effectiveness: Charisma * 0.4 — Chapter 5.1
  const tauntChance = Math.min(Math.floor(totalCha * 0.4), 60);

  return {
    maxHP,
    maxEnergy,
    attackPower:  Math.floor(totalStr * 2 + weaponDmg + this.level),
    defense:      Math.floor(totalDef * 0.6 + armorRating + totalAgi * 0.3),
    hitBonus:     totalAtk,          // used in hit formula
    critChance:   Math.min(Math.floor(totalAgi * 0.5), 50),
    dodgeChance,
    tauntChance,
    spellPower:   Math.floor(totalMag * 2 + (race.spellBonus ? totalMag * 2 * race.spellBonus : 0)),
  };
};

// ── World access check — Chapter 3 ───────────────────────────────────────────
characterSchema.methods.canAccessWorldMap = function () {
  return this.level > STARTER_ZONE_MAX_LEVEL;
};

// ── XP next level helper ──────────────────────────────────────────────────────
characterSchema.methods.xpNeeded = function () {
  return xpToNextLevel(this.level);
};

// ── Expedition helpers ────────────────────────────────────────────────────────
characterSchema.methods.isOnExpedition = function () {
  return !!(this.activeExpedition?.expeditionId && !this.activeExpedition?.collected && this.activeExpedition?.endsAt > new Date());
};

characterSchema.methods.expeditionReady = function () {
  return !!(this.activeExpedition?.expeditionId && !this.activeExpedition?.collected && this.activeExpedition?.endsAt <= new Date());
};

module.exports = mongoose.model('Character', characterSchema);
