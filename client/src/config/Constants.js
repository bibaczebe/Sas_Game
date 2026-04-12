// Mirror of server/src/config/constants.js — ES module version for the client

export const ACTION_TYPES = {
  MARCH:         'march',
  QUICK_ATTACK:  'quick_attack',
  NORMAL_ATTACK: 'normal_attack',
  POWER_ATTACK:  'power_attack',
  CHARGE:        'charge',
  TAUNT:         'taunt',
  DEFEND:        'defend',
  SPECIAL:       'special',
};

export const ACTION_ENERGY_COST = {
  march:         0,
  quick_attack:  1,
  normal_attack: 2,
  power_attack:  4,
  charge:        3,
  taunt:         2,
  defend:        0,
  special:       5,
};

export const ACTION_LABELS = {
  march:         '👣 March',
  quick_attack:  '🗡 Quick Attack',
  normal_attack: '⚔ Attack',
  power_attack:  '💥 Power Strike',
  charge:        '⚡ Charge',
  taunt:         '📣 Taunt',
  defend:        '🛡 Defend',
  special:       '✨ Special',
};

// ------------------------------------------------------------------
// Races  (Chapter 2.2)
// ------------------------------------------------------------------
export const RACES = {
  HUMAN:    'human',
  ELF:      'elf',
  DWARF:    'dwarf',
  ORC:      'orc',
  HALFELF:  'halfelf',
  TIEFLING: 'tiefling',
};

export const RACE_LABELS = {
  human:    'Human',
  elf:      'Elf',
  dwarf:    'Dwarf',
  orc:      'Orc',
  halfelf:  'Half-Elf',
  tiefling: 'Tiefling',
};

export const RACE_DESCRIPTIONS = {
  human:    'Balanced and adaptable. +5% bonus XP.',
  elf:      'Swift and perceptive. +2 Agility, +20% dodge chance.',
  dwarf:    'Tough and resilient. +2 Endurance, +20 max HP.',
  orc:      'Raw power. +3 Strength, but -1 Agility.',
  halfelf:  '+1 Agility, +1 Charisma. Extra talent point at creation.',
  tiefling: '+2 Magic, +1 Charisma. Stronger special abilities.',
};

// ------------------------------------------------------------------
// Classes  (Chapter 2.1)
// ------------------------------------------------------------------
export const CHARACTER_CLASSES = {
  WARRIOR:  'warrior',
  ARCHER:   'archer',
  MAGE:     'mage',
  PALADIN:  'paladin',
  ASSASSIN: 'assassin',
};

export const CLASS_BASE_STATS = {
  warrior:  { strength: 8, agility: 4, attack: 6, defense: 5, vitality: 7, charisma: 2, endurance: 6, magic: 1 },
  archer:   { strength: 5, agility: 8, attack: 7, defense: 3, vitality: 5, charisma: 3, endurance: 5, magic: 2 },
  mage:     { strength: 2, agility: 4, attack: 4, defense: 2, vitality: 3, charisma: 4, endurance: 3, magic: 9 },
  paladin:  { strength: 6, agility: 3, attack: 5, defense: 7, vitality: 6, charisma: 5, endurance: 6, magic: 3 },
  assassin: { strength: 5, agility: 9, attack: 8, defense: 2, vitality: 4, charisma: 3, endurance: 4, magic: 1 },
};

export const CLASS_DESCRIPTIONS = {
  warrior:  'Masters of raw strength. High HP and damage, low speed.',
  archer:   'Swift and precise. High agility, balanced stats.',
  mage:     'Powerful spellcasters. High magic, low endurance.',
  paladin:  'Holy warriors. High defense and charisma, versatile.',
  assassin: 'Shadow strikers. Highest agility and attack, fragile.',
};

// ------------------------------------------------------------------
// Leveling  (Chapter 10)
// ------------------------------------------------------------------
export function xpToNextLevel(level) {
  return Math.floor(1000 * Math.pow(level, 1.4));
}

export const MAX_LEVEL              = 50;
export const STARTER_ZONE_MAX_LEVEL = 14;
export const STAT_POINTS_PER_LEVEL  = 3;
export const TALENT_POINT_EVERY     = 5;

// ------------------------------------------------------------------
// Rarity / zones / UI palette
// ------------------------------------------------------------------
export const RARITY_COLORS = {
  common:    0xffffff,
  uncommon:  0x1eff00,
  rare:      0x0070dd,
  epic:      0xa335ee,
  legendary: 0xff8000,
};

export const ZONES = {
  TOWN:         'town',
  ARENA:        'arena',
  ARENA_LOBBY:  'arena_lobby',
  WORLD_MAP:    'world_map',
  QUEST_FOREST: 'quest_forest',
};

export const COLORS = {
  BG_DARK:      0x0d0500,
  BG_PANEL:     0x1a0a00,
  BORDER_GOLD:  0x8B6914,
  GOLD:         0xFFD700,
  HEALTH_RED:   0xcc2222,
  ENERGY_BLUE:  0x2266cc,
  XP_GREEN:     0x22aa44,
  TEXT_PRIMARY: '#FFD700',
  TEXT_MUTED:   '#9B7A30',
  TEXT_WHITE:   '#FFFFFF',
};

export const API_URL = import.meta.env.VITE_API_URL || '/api';
