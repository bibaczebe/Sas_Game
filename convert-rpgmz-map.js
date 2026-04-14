/**
 * convert-rpgmz-map.js
 * Converts an RPG Maker MZ Map JSON to a Godot-compatible autotile file.
 *
 * Encoding (one int per tile, flat array, row-major):
 *   0–1535  → A2 autotile: packed = (kind * 48 + shape)
 *             kind  = packed / 48   (0–31, which tile type)
 *             shape = packed % 48   (0–47, which autotile configuration)
 *   65534   → Water / A1 tile
 *   65535   → Empty (no tile placed)
 *
 * Godot renders each tile by compositing 4×24×24 quadrants from Outside_A2.png
 * using FLOOR_AUTOTILE_TABLE (ported from RPG Maker MZ rmmz_core.js).
 *
 * Input:  Documents/RPGMaker Projects/SaS_Plains/data/Map001.json
 * Output: <Godot project>/assets/maps/plains_biome.json
 *
 * Run: node convert-rpgmz-map.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const MAP_IN = path.join(
  process.env.USERPROFILE || 'C:/Users/bibac',
  'Documents/RPGMaker Projects/SaS_Plains/data/Map001.json'
);
const MAP_OUT = path.join(
  'C:/Users/bibac/OneDrive/Dokumenty/Gra SAS godot/sas',
  'assets/maps/plains_biome.json'
);

const TILE_A1_START = 2048;
const TILE_A2_START = 2816;
const TILE_A3_START = 4352;

const EMPTY = 65535;
const WATER = 65534;

// ── Tile ID → packed int ──────────────────────────────────────────────────────
function tileToPacked(id) {
  if (id === 0) return EMPTY;

  // A1 animated tiles (water) — 2048–2815
  if (id >= TILE_A1_START && id < TILE_A2_START) return WATER;

  // A2 autotiles — 2816–4351
  if (id >= TILE_A2_START && id < TILE_A3_START) {
    // kind relative to A2 base (0–31), shape (0–47)
    const offset = id - TILE_A2_START;   // 0 – 1535
    const kind   = Math.floor(offset / 48);
    const shape  = offset % 48;
    if (kind >= 0 && kind <= 31) return kind * 48 + shape;
  }

  // B/C/other decoration tiles — skip
  return EMPTY;
}

// ── Kind name lookup (for stats) ─────────────────────────────────────────────
const A2_NAMES = [
  'Grassland A','Grassland Dark','Grassland B','Grassland B Dark',
  'Forest','Forest Fir','Mountain Grass','Mountain Dirt',
  'Wasteland A','Wasteland B','Dirt Field','Dirt Field B',
  'Forest Dead','Road Dirt','Hill Dirt','Mountain Sandstone',
  'Desert A','Desert B','Rocky Land A','Rocky Land B',
  'Forest Palm','Road Paved','Mountain Rock','Mountain Lava',
  'Snowfield','Mountain Snow','Clouds','Large Clouds',
  'Forest Snow','Pit','Hill Sandstone','Hill Snow',
];

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Reading:', MAP_IN);
if (!fs.existsSync(MAP_IN)) {
  console.error('ERROR: Map file not found. Run generate-plains-biome.js first.');
  process.exit(1);
}

const mapData = JSON.parse(fs.readFileSync(MAP_IN, 'utf8'));
const W = mapData.width, H = mapData.height;
console.log(`Map dimensions: ${W}×${H} tiles`);

// Extract layer 0 (ground layer)
const layer0 = mapData.data.slice(0, W * H);
const tiles  = layer0.map(tileToPacked);

// ── Stats ─────────────────────────────────────────────────────────────────────
const kindFreq = {};
let emptyCount = 0, waterCount = 0;

for (const v of tiles) {
  if (v === EMPTY) { emptyCount++; continue; }
  if (v === WATER) { waterCount++; continue; }
  const kind = Math.floor(v / 48);
  kindFreq[kind] = (kindFreq[kind] || 0) + 1;
}

const placed = W * H - emptyCount;
console.log(`\nTile stats:`);
console.log(`  Total cells : ${(W * H).toLocaleString()}`);
console.log(`  Placed      : ${placed.toLocaleString()}`);
console.log(`  Empty       : ${emptyCount.toLocaleString()}`);
console.log(`  Water (A1)  : ${waterCount.toLocaleString()}`);
console.log(`\n  A2 tile kinds used:`);
Object.entries(kindFreq)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, cnt]) => {
    const name = A2_NAMES[+k] || 'unknown';
    console.log(`    kind ${String(k).padStart(2)} "${name.padEnd(20)}"  ${cnt.toLocaleString()} tiles`);
  });

// Unique (kind, shape) pairs
const uniquePairs = new Set();
for (const v of tiles) {
  if (v !== EMPTY && v !== WATER) uniquePairs.add(v);
}
console.log(`\n  Unique autotile variants : ${uniquePairs.size}`);

// ── Write output ──────────────────────────────────────────────────────────────
const output = { width: W, height: H, tiles };
fs.mkdirSync(path.dirname(MAP_OUT), { recursive: true });
fs.writeFileSync(MAP_OUT, JSON.stringify(output), 'utf8');

const fileSizeKB = (fs.statSync(MAP_OUT).size / 1024).toFixed(1);
console.log(`\nSaved: ${MAP_OUT}`);
console.log(`File size: ${fileSizeKB} KB`);
console.log('\nTile format:');
console.log('  65535 = empty (skip)');
console.log('  65534 = water (A1)');
console.log('  0-1535: kind = v/48, shape = v%48');
console.log('\nNext: open Godot → run the game → enter Plains biome scene.');
