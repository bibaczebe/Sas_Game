const Character       = require('../models/Character.model');
const Inventory       = require('../models/Inventory.model');
const Item            = require('../models/Item.model');
const LevelingService = require('../services/LevelingService');
const { CLASS_BASE_STATS, RACES, STARTING_GOLD } = require('../config/constants');

const VALID_CLASSES = Object.keys(CLASS_BASE_STATS);
const VALID_RACES   = Object.keys(RACES);
const VALID_STATS   = ['strength', 'agility', 'attack', 'defense', 'vitality', 'charisma', 'endurance', 'magic'];

// POST /api/character
async function create(req, res, next) {
  try {
    const { name, class: charClass, race = 'human', appearance } = req.body;

    if (!name || !charClass) {
      return res.status(400).json({ error: 'name and class are required' });
    }
    if (!VALID_CLASSES.includes(charClass)) {
      return res.status(400).json({ error: `Invalid class. Choose: ${VALID_CLASSES.join(', ')}` });
    }
    if (!VALID_RACES.includes(race)) {
      return res.status(400).json({ error: `Invalid race. Choose: ${VALID_RACES.join(', ')}` });
    }

    const existing = await Character.findOne({ userId: req.userId });
    if (existing) {
      return res.status(409).json({ error: 'You already have a character', character: existing });
    }

    // Build base stats from class template + race bonuses
    const baseStats = { ...CLASS_BASE_STATS[charClass] };
    const raceDef   = RACES[race];
    if (raceDef.statBonus) {
      Object.entries(raceDef.statBonus).forEach(([stat, val]) => {
        baseStats[stat] = (baseStats[stat] || 0) + val;
      });
    }

    // Level-1 derived values (match Character.model getDerivedStats)
    const vitality  = baseStats.vitality  ?? 5;
    const endurance = baseStats.endurance ?? 4;
    const baseVitHP = vitality * 10;
    const hpRaceBonus = raceDef.hpBonus ? Math.floor(baseVitHP * raceDef.hpBonus) : 0;
    const maxHP     = baseVitHP + hpRaceBonus + 50;      // +50 base at lv1
    const maxEnergy = endurance * 5 + 30;

    // Half-elf bonus talent point
    const talentPoints = race === 'halfelf' ? 1 : 0;

    const character = await Character.create({
      userId:     req.userId,
      name:       name.trim(),
      class:      charClass,
      race,
      baseStats,
      level:         1,
      currentXP:     0,
      currentHP:     maxHP,
      maxHP,
      currentEnergy: maxEnergy,
      maxEnergy,
      talentPoints,
      gold:          STARTING_GOLD,
      appearance:    appearance || {},
    });

    res.status(201).json({ character });
  } catch (err) {
    next(err);
  }
}

// GET /api/character
async function getMyCharacter(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) {
      return res.status(404).json({ error: 'No character found', hasCharacter: false });
    }
    res.json({ character, hasCharacter: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/character/snapshot  — full state needed at session start
async function getSnapshot(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) {
      return res.status(404).json({ error: 'No character found', hasCharacter: false });
    }

    const inventory = await Inventory.find({ characterId: character._id })
      .populate('itemId')
      .sort({ acquiredAt: -1 });

    const equippedIds   = Object.values(character.equippedItems.toObject()).filter(Boolean);
    const equippedItems = await Item.find({ _id: { $in: equippedIds } });

    const derivedStats = character.getDerivedStats(equippedItems);

    res.json({ character, inventory, derivedStats, hasCharacter: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/character/allocate-stats
async function allocateStats(req, res, next) {
  try {
    const { stat, amount = 1 } = req.body;

    if (!VALID_STATS.includes(stat)) {
      return res.status(400).json({ error: `Invalid stat. Choose: ${VALID_STATS.join(', ')}` });
    }
    const pts = parseInt(amount, 10);
    if (isNaN(pts) || pts < 1 || pts > 10) {
      return res.status(400).json({ error: 'Amount must be 1–10' });
    }

    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (character.unspentStatPoints < pts) {
      return res.status(400).json({ error: 'Not enough stat points' });
    }

    character.baseStats[stat]   += pts;
    character.unspentStatPoints -= pts;

    // Recalculate derived maxHP / maxEnergy when relevant stats change
    if (['vitality', 'endurance'].includes(stat)) {
      const derived         = character.getDerivedStats();
      character.maxHP       = derived.maxHP;
      character.maxEnergy   = derived.maxEnergy;
      character.currentHP   = Math.min(character.currentHP,   derived.maxHP);
      character.currentEnergy = Math.min(character.currentEnergy, derived.maxEnergy);
    }

    await character.save();
    res.json({ character });
  } catch (err) {
    next(err);
  }
}

// Internal helper — used by combat/quest systems
async function grantXP(characterId, amount) {
  const character = await Character.findById(characterId);
  if (!character) return null;
  return LevelingService.grantXP(character, amount);
}

module.exports = { create, getMyCharacter, getSnapshot, allocateStats, grantXP };
