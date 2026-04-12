// ─────────────────────────────────────────────────────────────────────────────
//  Imperium of Sands — Shared Constants  (Chapter 2, 5, 10)
// ─────────────────────────────────────────────────────────────────────────────

// ── Action types — Chapter 5.1 ────────────────────────────────────────────────
const ACTION_TYPES = {
  MARCH:         'march',
  QUICK_ATTACK:  'quick_attack',
  NORMAL_ATTACK: 'normal_attack',
  POWER_ATTACK:  'power_attack',
  CHARGE:        'charge',
  TAUNT:         'taunt',
  DEFEND:        'defend',
  SPECIAL:       'special',
};

// Energy cost per action — Chapter 5.1
const ACTION_STAMINA_COST = {
  march:         0,
  quick_attack:  1,
  normal_attack: 2,
  power_attack:  4,
  charge:        3,
  taunt:         2,
  defend:        0,
  special:       5,
};

// Damage multipliers per attack action
const ACTION_DMG_MULT = {
  quick_attack:  0.70,
  normal_attack: 1.00,
  power_attack:  1.75,
  charge:        0.00,   // no direct damage — boosts next hit
  special:       2.00,
};

// Base hit chance per action
const ACTION_HIT_CHANCE = {
  quick_attack:  0.95,
  normal_attack: 0.80,
  power_attack:  0.55,
  charge:        1.00,
  taunt:         1.00,
  defend:        1.00,
  special:       0.85,
  march:         1.00,
};

// ── Races — Chapter 2.2 ───────────────────────────────────────────────────────
const RACES = {
  human:    { label: 'Human',    perk: '+5% to all XP',          statBonus: {},                           xpBonus: 0.05 },
  elf:      { label: 'Elf',      perk: '+3 Agility, +10% dodge', statBonus: { agility: 3 },               dodgeBonus: 0.10 },
  dwarf:    { label: 'Dwarf',    perk: '+4 Defense, +10% HP',    statBonus: { defense: 4 },               hpBonus: 0.10 },
  orc:      { label: 'Orc',      perk: '+4 Strength, –1 Agility',statBonus: { strength: 4, agility: -1 } },
  halfelf:  { label: 'Half-Elf', perk: '+2 Agility, +2 Charisma',statBonus: { agility: 2, charisma: 2 } },
  tiefling: { label: 'Tiefling', perk: '+3 Magic, +15% spells',  statBonus: { magic: 3 },                 spellBonus: 0.15 },
};

// ── Classes — Chapter 2.3 ─────────────────────────────────────────────────────
const CHARACTER_CLASSES = {
  WARRIOR:  'warrior',
  ARCHER:   'archer',
  MAGE:     'mage',
  PALADIN:  'paladin',
  ASSASSIN: 'assassin',
};

// Base stats (8 stats per Chapter 2.4)
const CLASS_BASE_STATS = {
  warrior:  { strength: 8, agility: 4, attack: 5, defense: 6, vitality: 7, charisma: 3, endurance: 6, magic: 0 },
  archer:   { strength: 4, agility: 9, attack: 8, defense: 3, vitality: 5, charisma: 3, endurance: 5, magic: 0 },
  mage:     { strength: 2, agility: 4, attack: 3, defense: 2, vitality: 4, charisma: 5, endurance: 7, magic: 10 },
  paladin:  { strength: 6, agility: 3, attack: 4, defense: 7, vitality: 9, charisma: 6, endurance: 6, magic: 2 },
  assassin: { strength: 5, agility: 9, attack: 9, defense: 2, vitality: 4, charisma: 4, endurance: 5, magic: 0 },
};

const STARTING_STAT_POINTS = 10;

// ── XP formula — Chapter 10.2:  floor(1000 * level^1.4) ─────────────────────
const MAX_LEVEL = 50;

function xpToNextLevel(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(1000 * Math.pow(level, 1.4));
}

// Precomputed table (index = level-1, value = XP to reach next level)
const XP_TABLE = Array.from({ length: MAX_LEVEL - 1 }, (_, i) => xpToNextLevel(i + 1));

// Per-level gains — Chapter 10.2
const STAT_POINTS_PER_LEVEL = 3;
const HP_PER_LEVEL          = 10;
const ENERGY_PER_LEVEL      = 5;
const TALENT_POINT_EVERY    = 5;   // 1 talent point every 5 levels

// ── Combat constants — Chapter 5.1 ───────────────────────────────────────────
const STAMINA_REGEN_PER_TURN = 10;
const ARENA_GRID_SIZE        = 10;   // positions 1–10 (player starts at 1, enemy at 10)
const ARENA_MELEE_RANGE      = 1;    // must be adjacent to melee attack
const DEFENSE_BONUS          = 0.30; // +30% DEF when Defend action used

// ── World zones — Chapter 3 ───────────────────────────────────────────────────
const ZONES = {
  STARTER:     'starter',
  WORLD_MAP:   'world',
  ARENA:       'arena',
  TAVERN:      'tavern',
  ARMORY:      'armory',
  FORGE:       'forge',
  QUEST_BOARD: 'quest_board',
  FARM:        'farm',
  GUILD:       'guild',
};

const STARTER_ZONE_MAX_LEVEL = 14;  // level 15 unlocks world map

// ── Economy ───────────────────────────────────────────────────────────────────
const STARTING_GOLD = 100;

// ── Items — Chapter 9 ────────────────────────────────────────────────────────
const ITEM_SLOTS    = ['head', 'chest', 'legs', 'weapon', 'offhand', 'ring1', 'ring2', 'amulet'];
const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_DROP_CHANCE = { common: 0.60, uncommon: 0.25, rare: 0.10, epic: 0.04, legendary: 0.01 };
const RARITY_COLORS      = { common: '#AAAAAA', uncommon: '#55DD55', rare: '#5599FF', epic: '#CC44FF', legendary: '#FFD700' };

// ── Expedition definitions — Chapter 5.2 (Tavern) ───────────────────────────
const EXPEDITION_DEFS = [
  {
    id: 'forest_patrol',   name: 'Forest Patrol',
    description: 'Scout the dark forest roads for bandit activity.',
    durationSec: 30 * 60,  minLevel: 1,  difficulty: 1,
    xpMin: 80,   xpMax: 160,  goldMin: 20,  goldMax: 60,   itemChance: 0.10,
  },
  {
    id: 'old_fort_ruins',  name: 'Ruins of the Old Fort',
    description: 'Explore the crumbling fort beyond the hills.',
    durationSec: 2 * 3600, minLevel: 3,  difficulty: 2,
    xpMin: 200,  xpMax: 400,  goldMin: 50,  goldMax: 120,  itemChance: 0.15,
  },
  {
    id: 'mine_depths',     name: 'The Mine Depths',
    description: 'Descend into the abandoned mine to clear it of creatures.',
    durationSec: 4 * 3600, minLevel: 6,  difficulty: 3,
    xpMin: 400,  xpMax: 700,  goldMin: 100, goldMax: 220,  itemChance: 0.20,
  },
  {
    id: 'bandit_camp',     name: 'Bandit Camp Raid',
    description: 'Lead a raid against a large bandit encampment.',
    durationSec: 6 * 3600, minLevel: 9,  difficulty: 4,
    xpMin: 600,  xpMax: 1000, goldMin: 180, goldMax: 350,  itemChance: 0.25,
  },
  {
    id: 'dragon_lair',     name: "Dragon's Lair",
    description: 'A young dragon has made its lair in the mountains. Extremely dangerous.',
    durationSec: 12 * 3600,minLevel: 12, difficulty: 5,
    xpMin: 1200, xpMax: 2000, goldMin: 400, goldMax: 800,  itemChance: 0.35,
  },
];

// ── Arena enemy ladder — Chapter 5.1 ─────────────────────────────────────────
const ARENA_ENEMIES = [
  { id: 'peasant_brawler', name: 'Peasant Brawler',  level: 1,  hp: 55,  str: 4,  agi: 3,  atk: 3,  def: 1,  xp: 50,  gold: 15 },
  { id: 'goblin_scout',    name: 'Goblin Scout',      level: 2,  hp: 65,  str: 5,  agi: 7,  atk: 5,  def: 2,  xp: 80,  gold: 22 },
  { id: 'skeleton_guard',  name: 'Skeleton Guard',    level: 3,  hp: 90,  str: 7,  agi: 4,  atk: 6,  def: 5,  xp: 120, gold: 35 },
  { id: 'arena_veteran',   name: 'Arena Veteran',     level: 4,  hp: 110, str: 9,  agi: 6,  atk: 8,  def: 6,  xp: 160, gold: 50 },
  { id: 'orc_warrior',     name: 'Orc Warrior',       level: 5,  hp: 140, str: 12, agi: 4,  atk: 9,  def: 8,  xp: 220, gold: 70 },
  { id: 'dark_archer',     name: 'Dark Archer',       level: 6,  hp: 100, str: 7,  agi: 12, atk: 12, def: 4,  xp: 270, gold: 85 },
  { id: 'blood_mage',      name: 'Blood Mage',        level: 7,  hp: 110, str: 5,  agi: 8,  atk: 14, def: 3,  xp: 330, gold: 100 },
  { id: 'iron_champion',   name: 'Iron Champion',     level: 8,  hp: 180, str: 14, agi: 5,  atk: 12, def: 12, xp: 400, gold: 130 },
  { id: 'shadow_assassin', name: 'Shadow Assassin',   level: 9,  hp: 130, str: 10, agi: 15, atk: 16, def: 5,  xp: 480, gold: 160 },
  { id: 'dragon_hatchling',name: 'Dragon Hatchling',  level: 10, hp: 220, str: 18, agi: 8,  atk: 15, def: 14, xp: 600, gold: 220 },
];

module.exports = {
  ACTION_TYPES,
  ACTION_STAMINA_COST,
  ACTION_DMG_MULT,
  ACTION_HIT_CHANCE,
  RACES,
  CHARACTER_CLASSES,
  CLASS_BASE_STATS,
  STARTING_STAT_POINTS,
  xpToNextLevel,
  XP_TABLE,
  MAX_LEVEL,
  STAT_POINTS_PER_LEVEL,
  HP_PER_LEVEL,
  ENERGY_PER_LEVEL,
  TALENT_POINT_EVERY,
  STAMINA_REGEN_PER_TURN,
  ARENA_GRID_SIZE,
  ARENA_MELEE_RANGE,
  DEFENSE_BONUS,
  ZONES,
  STARTER_ZONE_MAX_LEVEL,
  STARTING_GOLD,
  ITEM_SLOTS,
  ITEM_RARITIES,
  RARITY_DROP_CHANCE,
  RARITY_COLORS,
  EXPEDITION_DEFS,
  ARENA_ENEMIES,
};
