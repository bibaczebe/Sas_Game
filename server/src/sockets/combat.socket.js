/**
 * combat.socket.js
 *
 * Socket.io handler for real-time PvE combat.
 * All logic delegated to CombatEngine.service.js.
 *
 * Events (client → server):
 *   combat:start   { enemyKey }       — start a new PvE session
 *   combat:action  { sessionId, action } — submit a combat action
 *   combat:flee    { sessionId }       — forfeit the fight
 *
 * Events (server → client):
 *   combat:session_created  { session }  — initial session state
 *   combat:round_result     { ... }      — full round result
 *   combat:error            { message }  — action rejected
 *   combat:ended            { status, reward? } — fight is over
 */

const Character     = require('../models/Character.model');
const CombatEngine  = require('../services/CombatEngine.service');
const { grantXP }   = require('../services/LevelingService');
const { addItem }   = require('../controllers/inventory.controller');

// throttle: max 1 action per 500ms per socket
const lastAction = new Map(); // socketId → timestamp

module.exports = function registerCombat(io, socket) {
  // ── Start session ────────────────────────────────────────────────────────────
  socket.on('combat:start', async ({ enemyKey } = {}) => {
    try {
      const character = await Character.findOne({ userId: socket.userId });
      if (!character) {
        socket.emit('combat:error', { message: 'No character found' });
        return;
      }
      if (character.currentHP <= 0) {
        socket.emit('combat:error', { message: 'You must heal before fighting' });
        return;
      }

      const session = CombatEngine.createSession(character, enemyKey || 'goblin_scout');

      // Join combat room (useful for future PvP spectators)
      socket.join(`combat:${session.id}`);

      socket.emit('combat:session_created', {
        sessionId:   session.id,
        playerHP:    { current: session.player.currentHP, max: session.player.maxHP },
        enemyName:   session.enemy.name,
        enemyHP:     { current: session.enemy.currentHP, max: session.enemy.maxHP },
        enemyLevel:  session.enemy.level,
      });
    } catch (err) {
      socket.emit('combat:error', { message: err.message });
    }
  });

  // ── Submit action ────────────────────────────────────────────────────────────
  socket.on('combat:action', async ({ sessionId, action } = {}) => {
    // Rate limit — max 1 action per 500ms
    const now  = Date.now();
    const last = lastAction.get(socket.id) || 0;
    if (now - last < 500) {
      socket.emit('combat:error', { message: 'Too fast!' });
      return;
    }
    lastAction.set(socket.id, now);

    try {
      const result = CombatEngine.processRound(sessionId, action);

      socket.emit('combat:round_result', result);

      // Apply reward to DB on victory
      if (result.sessionStatus === 'player_won' && result.reward) {
        try {
          const character = await Character.findOne({ userId: socket.userId });
          if (character) {
            character.gold           += result.reward.gold;
            character.currentHP       = result.playerHP.current;
            character.currentStamina  = result.playerStamina;
            character.combatStats.wins++;
            await character.save();

            const levelResult = await grantXP(character, result.reward.xp);
            if (levelResult.leveled) {
              socket.emit('combat:level_up', {
                newLevel:         levelResult.newLevel,
                statPointsGained: levelResult.statPointsGained,
              });
            }
          }
        } catch (dbErr) {
          console.error('[Combat] reward save error:', dbErr.message);
        }
      }

      // On defeat — persist reduced HP
      if (result.sessionStatus === 'enemy_won') {
        try {
          await Character.findOneAndUpdate(
            { userId: socket.userId },
            { currentHP: 1, currentStamina: 10, 'combatStats.losses': { $inc: 1 } }
          );
        } catch {}
      }
    } catch (err) {
      socket.emit('combat:error', { message: err.message });
    }
  });

  // ── Flee ─────────────────────────────────────────────────────────────────────
  socket.on('combat:flee', ({ sessionId } = {}) => {
    if (!sessionId) return;
    CombatEngine.endSession(sessionId);
    socket.leave(`combat:${sessionId}`);
    socket.emit('combat:ended', { status: 'fled' });
  });

  // Cleanup
  socket.on('disconnect', () => {
    lastAction.delete(socket.id);
  });
};
