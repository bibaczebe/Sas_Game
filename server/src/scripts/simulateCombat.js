/**
 * simulateCombat.js
 * Run with: node src/scripts/simulateCombat.js
 *
 * Demonstrates the combat engine formulas with example fights.
 */

const { simulateFight, ACTION_DEFS, ENEMY_TEMPLATES } = require('../services/CombatEngine.service');

console.log('\n═══════════════════════════════════════════════════════');
console.log('  SWORD AND SANDALS — Combat Engine Simulation');
console.log('═══════════════════════════════════════════════════════\n');

// ── Print formula reference ──────────────────────────────────────────────────
console.log('FORMULAS:');
console.log('  Attack Power  = STR×2 + weaponDamage + level');
console.log('  Hit Chance    = clamp(actionBase + (atkAGI − defAGI)×0.02, 0.15, 0.99)');
console.log('  Crit Chance   = clamp(attackerAGI × 0.005, 0, 0.50)  [0.5% per AGI]');
console.log('  Raw Damage    = attackPower × actionMult × uniform(0.85, 1.15)');
console.log('                  × (1.75 if crit) × (1.50 if charged)');
console.log('  Final Damage  = max(1, floor(rawDmg − defense × 0.40))');
console.log('  Defense       = AGI×0.5 + armorRating');
console.log('  Stamina Regen = +10 per turn (before cost)');
console.log('\nACTIONS:');
Object.entries(ACTION_DEFS).forEach(([key, def]) => {
  console.log(`  ${key.padEnd(15)} hit=${Math.round(def.baseHit * 100)}%  dmgMult=${def.damageMult}x  ${def.description}`);
});
console.log();

// ── Example Fight 1: Warrior vs Goblin ──────────────────────────────────────
console.log('───────────────────────────────────────────────────────');
console.log('FIGHT 1: Level-1 Warrior vs Goblin Scout');
console.log('  Warrior: STR=8 AGI=4 END=8 → HP=138 ATK=17 DEF=2');
console.log('  Goblin:  HP=60  ATK=8  DEF=2  AGI=6');
console.log('───────────────────────────────────────────────────────');

const fight1 = simulateFight({ name: 'Warrior', level: 1, strength: 8, agility: 4, endurance: 8 }, 'goblin_scout');
fight1.forEach(line => {
  if (line.result) {
    console.log(`\n  ★ RESULT: ${line.result.toUpperCase()} | Reward: ${JSON.stringify(line.reward)}`);
  } else if (line.error) {
    console.log(`  ⚠ ERROR: ${line.error}`);
  } else {
    console.log(`  T${String(line.turn).padStart(2)}  [Player] ${line.player}`);
    console.log(`       [Enemy]  ${line.enemy}`);
    console.log(`       HP: ${line.hpAfter}`);
  }
});

// ── Example Fight 2: Mage vs Orc ────────────────────────────────────────────
console.log('\n───────────────────────────────────────────────────────');
console.log('FIGHT 2: Level-3 Mage vs Orc Warrior');
console.log('  Mage:  STR=2 AGI=4 END=4 → HP=94 ATK=9 DEF=2');
console.log('  Orc:   HP=130 ATK=20 DEF=8 AGI=3');
console.log('───────────────────────────────────────────────────────');

const fight2 = simulateFight({ name: 'Mage', level: 3, strength: 2, agility: 4, endurance: 4 }, 'orc_warrior');
fight2.forEach(line => {
  if (line.result) {
    console.log(`\n  ★ RESULT: ${line.result.toUpperCase()} | Reward: ${JSON.stringify(line.reward)}`);
  } else if (line.error) {
    console.log(`  ⚠ ERROR: ${line.error}`);
  } else {
    console.log(`  T${String(line.turn).padStart(2)}  [Mage]  ${line.player}`);
    console.log(`       [Orc]   ${line.enemy}`);
    console.log(`       HP: ${line.hpAfter}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════\n');
