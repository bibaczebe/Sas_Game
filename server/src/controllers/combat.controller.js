const Character       = require('../models/Character.model');
const LevelingService = require('../services/LevelingService');
const CombatEngine    = require('../services/CombatEngine.service');
const { ARENA_ENEMIES } = require('../config/constants');

// Enemy ID aliases — Arena.gd uses these IDs, map to server catalogue
const ENEMY_ALIAS = {
  orc_brute:        'orc_warrior',
  skeleton_warrior: 'skeleton_guard',
  arena_champion:   'iron_champion',
  // direct matches pass through
};

function resolveEnemyId(id) {
  return ENEMY_ALIAS[id] || id;
}

// POST /api/combat/start
async function startCombat(req, res, next) {
  try {
    const { enemyId } = req.body;
    if (!enemyId) return res.status(400).json({ error: 'enemyId is required' });

    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'Character not found' });

    const resolvedId = resolveEnemyId(enemyId);
    const tmpl = ARENA_ENEMIES.find(e => e.id === resolvedId) || ARENA_ENEMIES[0];

    const session = CombatEngine.createSession(char, tmpl);

    res.json({
      sessionId:       session.id,
      enemyHP:         session.enemy.currentHP,
      enemyMaxHP:      session.enemy.maxHP,
      enemyName:       session.enemy.name,
      playerHP:        session.player.currentHP,
      playerMaxHP:     session.player.maxHP,
      playerEnergy:    session.player.energy,
      playerMaxEnergy: session.player.maxEnergy,
      playerPos:       session.player.position,
      enemyPos:        session.enemy.position,
      yourTurn:        session.initiative === 'player',
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/combat/action
async function submitAction(req, res, next) {
  try {
    const { sessionId, action } = req.body;
    if (!sessionId || !action) return res.status(400).json({ error: 'sessionId and action required' });

    const session = CombatEngine.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found or expired' });

    // Validate ownership
    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'Character not found' });
    if (session.player.id !== char._id.toString()) {
      return res.status(403).json({ error: 'Not your session' });
    }

    let roundResult;
    try {
      roundResult = CombatEngine.processRound(sessionId, action);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const { playerState, enemyState, playerAction, enemyAction, sessionStatus, reward } = roundResult;

    // Build human-readable log
    const log = _buildLog(playerAction, enemyAction, session.enemy.name || enemyState.name);

    // Map to Arena.gd expected format
    const resp = {
      playerHP:       playerState.hp,
      playerMaxHP:    playerState.maxHP,
      playerEnergy:   playerState.energy,
      playerMaxEnergy:playerState.maxEnergy,
      playerPos:      playerState.position,
      enemyHP:        enemyState.hp,
      enemyMaxHP:     enemyState.maxHP,
      enemyPos:       enemyState.position,
      yourTurn:       sessionStatus === 'active',
      status:         sessionStatus === 'active' ? 'ongoing'
                    : sessionStatus === 'player_won' ? 'player_won' : 'player_lost',
      log,
      xpGained:   0,
      goldGained: 0,
    };

    // On victory: persist rewards + level-up
    if (sessionStatus === 'player_won' && reward) {
      resp.xpGained   = reward.xp   || 0;
      resp.goldGained = reward.gold || 0;

      char.gold       = Math.max(0, (char.gold || 0) + resp.goldGained);
      char.currentXP  = (char.currentXP || 0) + resp.xpGained;
      char.combatStats.wins = (char.combatStats.wins || 0) + 1;

      const lvResult = LevelingService.checkLevelUp(char.level, char.currentXP);
      if (lvResult.leveled) {
        LevelingService.applyLevelUp(char, lvResult);
        resp.leveledUp = true;
        resp.newLevel  = lvResult.newLevel;
      }

      // Restore some HP after battle
      char.currentHP = Math.min(char.maxHP, char.currentHP + Math.floor(char.maxHP * 0.2));
      await char.save();
    }

    if (sessionStatus === 'enemy_won') {
      char.currentHP = Math.max(1, Math.floor(char.maxHP * 0.3));
      char.combatStats.losses = (char.combatStats.losses || 0) + 1;
      await char.save();
    }

    res.json(resp);
  } catch (err) {
    next(err);
  }
}

// GET /api/combat/enemies  — list available enemies
function getEnemies(req, res) {
  res.json({
    enemies: ARENA_ENEMIES.map(e => ({
      id:    e.id,
      name:  e.name,
      level: e.level,
      hp:    e.hp,
    })),
  });
}

// ── Log builder ───────────────────────────────────────────────────────────────
function _buildLog(pAction, eAction, enemyName) {
  const log = [];

  const _desc = (actor, isPlayer, a) => {
    const who = isPlayer ? 'You' : enemyName;
    if (!a) return;
    if (a.effect === 'out_of_range') { log.push(`${who} are out of range!`); return; }
    if (a.effect === 'dodged')       { log.push(`${who}r attack was dodged!`); return; }
    if (a.type === 'march')          { log.push(`${who} march forward (pos ${a.effect?.split(':')[1] || '?'}).`); return; }
    if (a.type === 'defend')         { log.push(`${who} raise your guard.`); return; }
    if (a.type === 'taunt') {
      log.push(a.effect === 'taunted' ? `${who} taunt the enemy! They waver.` : `${who} try to taunt, but it fails.`);
      return;
    }
    if (a.type === 'charge') {
      if (a.effect?.startsWith('charged_to')) { log.push(`${who} charge! (pos ${a.effect.split(':')[1]})`); return; }
      if (a.effect === 'charge') { log.push(`${who} charge and strike${a.crit ? ' critically' : ''}!`); }
    }
    if (a.hit && a.damage > 0) {
      const crit = a.crit ? ' (CRIT!)' : '';
      log.push(`${who} deal${crit} ${a.damage} damage.`);
    } else if (a.hit === false && !['march','defend','taunt'].includes(a.type)) {
      log.push(`${who}r attack misses!`);
    }
  };

  _desc('player', true,  pAction);
  _desc('enemy',  false, eAction);
  return log;
}

module.exports = { startCombat, submitAction, getEnemies };
