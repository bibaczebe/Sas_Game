/**
 * CombatEngine.service.js — Imperium of Sands
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-authoritative turn-based combat. Chapter 5.1 exact formulas.
 *
 * ARENA GRID: 1D positions 1–10. Player starts 1, enemy starts 10.
 * Melee range: distance ≤ 1. March moves 1 step toward enemy.
 *
 * FORMULAS:
 *   DMG = (Strength * dmg_mult * rand[0.85-1.15]) + weapon_dmg − enemy_Defense * 0.40
 *   Hit = (Attack_attacker / (Attack_attacker + Defense_enemy)) * base_action_hit
 *   Crit = Agility * 0.5% (max 50%)
 *   Taunt = Charisma * 0.4% confusion chance
 *   HP_max = Vitality * 10 + race_bonus + (level−1)*10
 *   Energy_max = Endurance * 5 + (level−1)*5
 *
 * INITIATIVE: higher (Attack + Agility*0.5) acts first; alternates each round.
 */

const { v4: uuidv4 } = require('uuid');
const {
  ACTION_TYPES, ACTION_STAMINA_COST, ACTION_DMG_MULT, ACTION_HIT_CHANCE,
  ARENA_GRID_SIZE, ARENA_MELEE_RANGE, STAMINA_REGEN_PER_TURN, DEFENSE_BONUS,
  ARENA_ENEMIES,
} = require('../config/constants');

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand      = ()       => Math.random();
const randRange = (lo, hi) => lo + rand() * (hi - lo);
const clamp     = (v,lo,hi)=> Math.max(lo, Math.min(hi, v));
const absDist   = (a, b)   => Math.abs(a - b);

const sessions = new Map();

// ── Build combatants ──────────────────────────────────────────────────────────
function buildCombatant(charDoc, startPos) {
  const derived = charDoc.getDerivedStats ? charDoc.getDerivedStats() : {};
  return {
    id:          charDoc._id?.toString() || 'player',
    name:        charDoc.name,
    isPlayer:    true,
    class:       charDoc.class  || 'warrior',
    race:        charDoc.race   || 'human',
    position:    startPos,
    currentHP:   charDoc.currentHP  || derived.maxHP  || 100,
    maxHP:       derived.maxHP      || charDoc.maxHP   || 100,
    energy:      charDoc.currentEnergy || derived.maxEnergy || 50,
    maxEnergy:   derived.maxEnergy  || charDoc.maxEnergy   || 50,
    strength:    charDoc.baseStats?.strength  || 5,
    agility:     charDoc.baseStats?.agility   || 5,
    attack:      charDoc.baseStats?.attack    || 5,
    defense:     derived.defense || charDoc.baseStats?.defense || 3,
    attackPower: derived.attackPower || 10,
    critChance:  derived.critChance  || 0,
    dodgeChance: derived.dodgeChance || 0,
    tauntChance: derived.tauntChance || 0,
    weaponDmg:   0,
    isDefending: false,
    isCharged:   false,
    isTaunted:   false,
    xpReward:    0,
    goldReward:  0,
  };
}

function buildEnemy(tmpl, startPos) {
  return {
    id:          `enemy_${tmpl.id}`,
    name:        tmpl.name,
    isPlayer:    false,
    class:       'warrior',
    race:        'human',
    position:    startPos,
    currentHP:   tmpl.hp,
    maxHP:       tmpl.hp,
    energy:      50, maxEnergy: 50,
    strength:    tmpl.str  || 6,
    agility:     tmpl.agi  || 4,
    attack:      tmpl.atk  || 5,
    defense:     tmpl.def  || 3,
    attackPower: Math.floor((tmpl.str || 6) * 2 + (tmpl.level || 1)),
    critChance:  Math.floor((tmpl.agi || 4) * 0.5),
    dodgeChance: Math.floor((tmpl.agi || 4) * 0.4),
    tauntChance: 0,
    weaponDmg:   0,
    isDefending: false,
    isCharged:   false,
    isTaunted:   false,
    xpReward:    tmpl.xp   || 50,
    goldReward:  tmpl.gold || 15,
  };
}

// ── Initiative — Chapter 5.1 step 2 ──────────────────────────────────────────
function initiative(player, enemy) {
  const ps = player.attack + player.agility * 0.5;
  const es = enemy.attack  + enemy.agility  * 0.5;
  if (ps > es) return 'player';
  if (es > ps) return 'enemy';
  return rand() < 0.5 ? 'player' : 'enemy';
}

// ── Range helpers ─────────────────────────────────────────────────────────────
const inMelee    = (a, b) => absDist(a.position, b.position) <= ARENA_MELEE_RANGE;
const inRange    = (a, b) => (a.class === 'archer' || a.class === 'mage') ? true : inMelee(a, b);

// ── Single-action resolver ────────────────────────────────────────────────────
function resolveAttack(attacker, defender, action) {
  const result = { action, hit: false, crit: false, damage: 0, effect: null };

  if (action === ACTION_TYPES.MARCH) {
    const dir = attacker.position < defender.position ? 1 : -1;
    attacker.position = clamp(attacker.position + dir, 1, ARENA_GRID_SIZE);
    result.hit = true; result.effect = `pos:${attacker.position}`;
    return result;
  }

  if (action === ACTION_TYPES.DEFEND) {
    attacker.isDefending = true;
    result.hit = true; result.effect = 'defending';
    return result;
  }

  if (action === ACTION_TYPES.TAUNT) {
    attacker.isDefending = true;
    if (rand() * 100 < attacker.tauntChance) {
      defender.isTaunted = true; result.effect = 'taunted';
    } else {
      result.effect = 'taunt_failed';
    }
    result.hit = true;
    return result;
  }

  if (action === ACTION_TYPES.CHARGE) {
    const dir = attacker.position < defender.position ? 1 : -1;
    attacker.position = clamp(attacker.position + dir * 2, 1, ARENA_GRID_SIZE);
    if (inMelee(attacker, defender)) {
      const r = resolveAttack(attacker, defender, ACTION_TYPES.NORMAL_ATTACK);
      r.action = ACTION_TYPES.CHARGE; r.effect = 'charge';
      return r;
    }
    result.hit = true; result.effect = `charged_to:${attacker.position}`;
    return result;
  }

  // Offensive: range check first
  if (!inRange(attacker, defender)) {
    result.effect = 'out_of_range';
    return result;
  }

  // Dodge
  if (rand() * 100 < defender.dodgeChance) {
    result.effect = 'dodged';
    return result;
  }

  // Hit check — Chapter 5.1
  const baseHit  = ACTION_HIT_CHANCE[action] ?? 0.80;
  const hitRatio = attacker.attack / (attacker.attack + Math.max(1, defender.defense));
  result.hit     = rand() < clamp(baseHit * hitRatio + 0.15, 0.08, 0.98);
  if (!result.hit) return result;

  // Crit
  result.crit = rand() * 100 < attacker.critChance;

  // Damage — Chapter 5.1
  const mult = ACTION_DMG_MULT[action] ?? 1.0;
  let raw    = attacker.strength * mult * randRange(0.85, 1.15) + (attacker.weaponDmg || 0);
  if (result.crit)       raw *= 1.75;
  if (attacker.isCharged){ raw *= 1.50; attacker.isCharged = false; result.effect = 'charged_strike'; }

  const effDef = defender.defense * (defender.isDefending ? (1 + DEFENSE_BONUS) : 1);
  result.damage = Math.max(1, Math.floor(raw - effDef * 0.40));
  defender.currentHP = Math.max(0, defender.currentHP - result.damage);
  return result;
}

// ── Enemy AI ──────────────────────────────────────────────────────────────────
function enemyAI(enemy, player) {
  if (enemy.isTaunted) { enemy.isTaunted = false; return ACTION_TYPES.NORMAL_ATTACK; }
  if (!inRange(enemy, player) && enemy.class !== 'archer' && enemy.class !== 'mage') return ACTION_TYPES.MARCH;

  const hp    = enemy.currentHP / enemy.maxHP;
  const can   = (a) => enemy.energy >= (ACTION_STAMINA_COST[a] || 0);
  const w     = {};

  if (hp > 0.65) {
    if (can(ACTION_TYPES.CHARGE))        w[ACTION_TYPES.CHARGE]        = 20;
    if (can(ACTION_TYPES.NORMAL_ATTACK)) w[ACTION_TYPES.NORMAL_ATTACK] = 30;
    if (can(ACTION_TYPES.POWER_ATTACK))  w[ACTION_TYPES.POWER_ATTACK]  = 20;
    w[ACTION_TYPES.QUICK_ATTACK] = 25; w[ACTION_TYPES.TAUNT] = 5;
  } else if (hp > 0.30) {
    if (can(ACTION_TYPES.NORMAL_ATTACK)) w[ACTION_TYPES.NORMAL_ATTACK] = 35;
    if (can(ACTION_TYPES.POWER_ATTACK))  w[ACTION_TYPES.POWER_ATTACK]  = 15;
    w[ACTION_TYPES.QUICK_ATTACK] = 35; w[ACTION_TYPES.DEFEND] = 10; w[ACTION_TYPES.TAUNT] = 5;
  } else {
    if (can(ACTION_TYPES.POWER_ATTACK))  w[ACTION_TYPES.POWER_ATTACK]  = 30;
    w[ACTION_TYPES.QUICK_ATTACK] = 50; w[ACTION_TYPES.DEFEND] = 20;
  }

  const total = Object.values(w).reduce((a,b)=>a+b,0);
  if (!total) return ACTION_TYPES.QUICK_ATTACK;
  let r = rand() * total;
  for (const [k,v] of Object.entries(w)) { r -= v; if (r <= 0) return k; }
  return ACTION_TYPES.QUICK_ATTACK;
}

// ── Session management ────────────────────────────────────────────────────────
function createSession(charDoc, enemyIdOrObj) {
  const tmpl   = typeof enemyIdOrObj === 'string'
    ? (ARENA_ENEMIES.find(e => e.id === enemyIdOrObj) || ARENA_ENEMIES[0])
    : enemyIdOrObj;

  const player = buildCombatant(charDoc, 1);
  const enemy  = buildEnemy(tmpl, ARENA_GRID_SIZE);
  const first  = initiative(player, enemy);

  const session = {
    id: uuidv4(), player, enemy,
    turn: 1, initiative: first, status: 'active',
  };
  sessions.set(session.id, session);
  return session;
}

function getSession(id)  { return sessions.get(id) || null; }
function endSession(id)  { sessions.delete(id); }

// ── Round processor ───────────────────────────────────────────────────────────
function processRound(sessionId, playerAction) {
  const session = sessions.get(sessionId);
  if (!session)                    throw new Error('Session not found');
  if (session.status !== 'active') throw new Error('Combat already over');

  const { player, enemy } = session;
  if (!Object.values(ACTION_TYPES).includes(playerAction)) throw new Error(`Bad action: ${playerAction}`);

  // Energy regen
  player.energy = Math.min(player.maxEnergy, player.energy + STAMINA_REGEN_PER_TURN);
  enemy.energy  = Math.min(enemy.maxEnergy,  enemy.energy  + STAMINA_REGEN_PER_TURN);

  // Cost check
  const pCost = ACTION_STAMINA_COST[playerAction] || 0;
  if (player.energy < pCost) throw new Error(`Not enough energy (need ${pCost}, have ${player.energy})`);
  player.energy -= pCost;

  // Reset defending flag (applied fresh this round)
  player.isDefending = false;
  enemy.isDefending  = false;

  const eAction = enemyAI(enemy, player);
  enemy.energy  = Math.max(0, enemy.energy - (ACTION_STAMINA_COST[eAction] || 0));

  let pResult, eResult;
  if (session.initiative === 'player') {
    pResult = resolveAttack(player, enemy,  playerAction);
    eResult = enemy.currentHP > 0 ? resolveAttack(enemy, player, eAction) : { action: eAction, hit: false, damage: 0, effect: 'dead' };
  } else {
    eResult = resolveAttack(enemy, player,  eAction);
    pResult = player.currentHP > 0 ? resolveAttack(player, enemy, playerAction) : { action: playerAction, hit: false, damage: 0, effect: 'dead' };
  }

  // Alternate initiative each round
  session.initiative = session.initiative === 'player' ? 'enemy' : 'player';

  if (enemy.currentHP  <= 0) session.status = 'player_won';
  if (player.currentHP <= 0) session.status = 'enemy_won';
  session.turn++;

  const out = {
    turn: session.turn - 1,
    sessionStatus: session.status,
    playerAction: { type: playerAction, ...pResult, energyAfter: player.energy },
    enemyAction:  { type: eAction,      ...eResult, energyAfter: enemy.energy  },
    playerState:  { hp: player.currentHP, maxHP: player.maxHP, energy: player.energy, maxEnergy: player.maxEnergy, position: player.position },
    enemyState:   { hp: enemy.currentHP,  maxHP: enemy.maxHP,  energy: enemy.energy,  position: enemy.position,   name: enemy.name },
    reward: null,
  };

  if (session.status === 'player_won') { out.reward = { xp: enemy.xpReward, gold: enemy.goldReward }; endSession(sessionId); }
  else if (session.status === 'enemy_won') endSession(sessionId);

  return out;
}

// ── Expedition simulation — Chapter 5.2 ──────────────────────────────────────
function simulateExpedition(charStats, enemies) {
  const log = []; let hpLost = 0; let hpLeft = charStats.maxHP || 100;

  for (const e of enemies) {
    let eHP = e.hp; let rounds = 0;
    while (hpLeft > 0 && eHP > 0 && rounds++ < 30) {
      const pHit = rand() < 0.75;
      const eDmg = Math.max(1, Math.floor((charStats.strength || 6) * randRange(0.85,1.15) - (e.def||2)*0.4));
      if (pHit) eHP -= eDmg;
      const eHit = rand() < 0.70;
      const pDmg = Math.max(1, Math.floor((e.str||5) * randRange(0.85,1.15) - (charStats.defense||3)*0.4));
      if (eHit) { hpLeft -= pDmg; hpLost += pDmg; }
    }
    if (hpLeft <= 0) { log.push(`Defeated by ${e.name}. The journey ends here.`); return { won: false, log, hpLost }; }
    log.push(`Defeated ${e.name} after ${rounds} rounds.`);
  }
  return { won: true, log, hpLost: Math.min(hpLost, charStats.maxHP - 1) };
}

function simulateFight(charStats, enemyId) {
  const tmpl = ARENA_ENEMIES.find(e => e.id === enemyId) || ARENA_ENEMIES[0];
  const mock = {
    _id: { toString: () => 'sim' }, name: charStats.name || 'Test',
    class: charStats.class || 'warrior', race: charStats.race || 'human',
    level: charStats.level || 1, currentHP: charStats.maxHP || 100, maxHP: charStats.maxHP || 100,
    currentEnergy: 50, maxEnergy: 50,
    baseStats: { strength: charStats.strength||6, agility: charStats.agility||5, attack: charStats.attack||5,
                 defense: charStats.defense||4, vitality: charStats.vitality||7, charisma: charStats.charisma||3,
                 endurance: charStats.endurance||6, magic: charStats.magic||0 },
    getDerivedStats() {
      const s = this.baseStats;
      return { maxHP: s.vitality*10+50, maxEnergy: s.endurance*5+30, attackPower: s.strength*2+this.level,
               defense: s.defense*0.6+s.agility*0.3, critChance: Math.min(s.agility*0.5,50),
               dodgeChance: Math.min(s.agility*0.4,50), tauntChance: Math.min(s.charisma*0.4,60) };
    },
  };
  const session = createSession(mock, tmpl);
  const results = [];
  const actions = [ACTION_TYPES.MARCH, ACTION_TYPES.MARCH, ACTION_TYPES.NORMAL_ATTACK,
                   ACTION_TYPES.POWER_ATTACK, ACTION_TYPES.QUICK_ATTACK, ACTION_TYPES.DEFEND];
  for (let i = 0; i < 40; i++) {
    const s = sessions.get(session.id);
    if (!s || s.status !== 'active') break;
    try { const r = processRound(session.id, actions[i % actions.length]); results.push(r); if (r.sessionStatus !== 'active') break; }
    catch(e) { results.push({ error: e.message }); }
  }
  endSession(session.id);
  return results;
}

module.exports = {
  createSession, getSession, endSession,
  processRound, simulateFight, simulateExpedition,
  ARENA_ENEMIES,
};
