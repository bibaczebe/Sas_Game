/**
 * Expedition routes — Chapter 5.2 (Tavern / Shakes & Fidget style)
 *
 * GET  /api/expeditions          — list all available expeditions
 * GET  /api/expeditions/status   — current character expedition status
 * POST /api/expeditions/start    — send character on expedition  { expeditionId }
 * POST /api/expeditions/collect  — collect rewards from finished expedition
 */

const express  = require('express');
const router   = express.Router();
const { authenticate: auth } = require('../middleware/auth.middleware');
const Character= require('../models/Character.model');
const { grantXP } = require('../services/LevelingService');
const { simulateExpedition, ARENA_ENEMIES } = require('../services/CombatEngine.service');
const { EXPEDITION_DEFS } = require('../config/constants');

// ── List available expeditions ────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'Character not found' });

    const available = EXPEDITION_DEFS.filter(e => char.level >= e.minLevel).map(e => ({
      ...e,
      durationFormatted: formatDuration(e.durationSec),
      canStart: !char.isOnExpedition(),
    }));

    res.json({ expeditions: available, onExpedition: char.isOnExpedition(), expeditionReady: char.expeditionReady() });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Current expedition status ─────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
  try {
    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'Character not found' });

    const exp = char.activeExpedition;
    if (!exp?.expeditionId) return res.json({ status: 'idle' });

    const def      = EXPEDITION_DEFS.find(e => e.id === exp.expeditionId);
    const now      = new Date();
    const endsAt   = exp.endsAt;
    const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

    res.json({
      status:      remaining > 0 ? 'active' : (exp.collected ? 'collected' : 'ready'),
      expedition:  def,
      startedAt:   exp.startedAt,
      endsAt:      endsAt,
      remainingSec: remaining,
      collected:   exp.collected,
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start expedition ──────────────────────────────────────────────────────────
router.post('/start', auth, async (req, res) => {
  try {
    const { expeditionId } = req.body;
    if (!expeditionId) return res.status(400).json({ error: 'expeditionId required' });

    const def = EXPEDITION_DEFS.find(e => e.id === expeditionId);
    if (!def) return res.status(404).json({ error: 'Expedition not found' });

    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'Character not found' });
    if (char.level < def.minLevel) return res.status(400).json({ error: `Requires level ${def.minLevel}` });
    if (char.isOnExpedition()) return res.status(400).json({ error: 'Already on expedition' });

    const now    = new Date();
    const endsAt = new Date(now.getTime() + def.durationSec * 1000);

    char.activeExpedition = {
      expeditionId: def.id,
      startedAt:   now,
      endsAt,
      collected:   false,
    };
    char.currentZone = 'tavern';
    await char.save();

    res.json({
      message:   `${char.name} departed for "${def.name}"`,
      endsAt,
      durationSec: def.durationSec,
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Collect rewards ───────────────────────────────────────────────────────────
router.post('/collect', auth, async (req, res) => {
  try {
    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'Character not found' });

    const exp = char.activeExpedition;
    if (!exp?.expeditionId) return res.status(400).json({ error: 'No active expedition' });
    if (exp.collected)       return res.status(400).json({ error: 'Rewards already collected' });
    if (exp.endsAt > new Date()) return res.status(400).json({ error: `Expedition still in progress. Returns in ${Math.ceil((exp.endsAt - new Date())/60000)} min.` });

    const def = EXPEDITION_DEFS.find(e => e.id === exp.expeditionId);
    if (!def) return res.status(404).json({ error: 'Expedition definition not found' });

    // Simulate the battle and generate log
    const derived  = char.getDerivedStats();
    const enemies  = buildExpeditionEnemies(def);
    const simResult = simulateExpedition({
      maxHP:      derived.maxHP,
      strength:   char.baseStats.strength,
      defense:    derived.defense,
      level:      char.level,
    }, enemies);

    // Compute rewards
    const xpGain   = simResult.won
      ? Math.floor(def.xpMin + Math.random() * (def.xpMax - def.xpMin))
      : Math.floor(def.xpMin * 0.3);  // consolation XP on loss
    const goldGain = simResult.won
      ? Math.floor(def.goldMin + Math.random() * (def.goldMax - def.goldMin))
      : 0;

    // Apply XP (handles level-up)
    const lvlResult = await grantXP(char, xpGain);

    // Apply gold + HP loss
    char.gold = Math.max(0, char.gold + goldGain);
    if (simResult.hpLost > 0) {
      char.currentHP = Math.max(1, char.currentHP - simResult.hpLost);
    }

    // Mark collected
    char.activeExpedition.collected = true;
    char.combatStats.expeditions    = (char.combatStats.expeditions || 0) + 1;
    await char.save();

    res.json({
      won:       simResult.won,
      log:       simResult.log,
      rewards: {
        xp:        xpGain,
        gold:      goldGain,
        hpLost:    simResult.hpLost,
        leveledUp: lvlResult.leveled,
        newLevel:  lvlResult.newLevel,
      },
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(sec) {
  if (sec < 3600) return `${sec / 60} min`;
  return `${sec / 3600}h`;
}

function buildExpeditionEnemies(def) {
  // Scale enemy count and strength to expedition difficulty
  const count = def.difficulty + 1;
  const pool  = ARENA_ENEMIES.filter(e => e.level <= def.minLevel + 3);
  if (!pool.length) return [ARENA_ENEMIES[0]];
  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
}

module.exports = router;
