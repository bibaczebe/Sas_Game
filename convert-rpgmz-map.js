/**
 * convert-rpgmz-map.js
 * Converts an RPG Maker MZ Map JSON to a Godot-compatible atlas index file.
 *
 * Encoding (one byte per tile, flat array, row-major):
 *   0–31  → A2 atlas tile (kind = index, atlas_col = kind%8, atlas_row = kind/8)
 *   32    → Water / A1 tile  → atlas Vector2i(0, 4)
 *   255   → Empty (no tile placed)
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

// ── Tile ID → atlas index ─────────────────────────────────────────────────────
function tileToAtlas(id) {
  if (id === 0) return 255;                       // empty cell

  // A1 animated tiles (water) — 2048–2815
  if (id >= 2048 && id < 2816) return 32;         // → atlas(0,4)

  // A2 autotiles — 2816–4351
  if (id >= 2816 && id < 4352) {
    const kind = Math.floor((id - 2816) / 48);
    if (kind >= 0 && kind <= 31) return kind;     // 0–31 maps directly
  }

  // B/C decoration tiles (≥ 4352) — skip (layer 1+, not in our atlas)
  return 255;
}

// ── Atlas index → description (for stats) ────────────────────────────────────
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

// Extract layer 0 (ground layer — indices 0 to W*H-1)
const layer0 = mapData.data.slice(0, W * H);

// Convert to atlas indices
const tiles = layer0.map(tileToAtlas);

// ── Stats ─────────────────────────────────────────────────────────────────────
const freq = {};
for (const v of tiles) freq[v] = (freq[v] || 0) + 1;
const empty = freq[255] || 0;
const water = freq[32]  || 0;
const placed = W * H - empty;

console.log(`\nTile stats:`);
console.log(`  Total cells : ${(W * H).toLocaleString()}`);
console.log(`  Placed      : ${placed.toLocaleString()}`);
console.log(`  Empty       : ${empty.toLocaleString()}`);
console.log(`  Water (A1)  : ${water.toLocaleString()}`);
console.log(`\n  A2 tile breakdown (by kind):`);
Object.entries(freq)
  .filter(([k]) => +k < 32)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([k, cnt]) => {
    const name = A2_NAMES[+k] || 'unknown';
    console.log(`    kind ${String(k).padStart(2)} "${name.padEnd(20)}"  ${cnt.toLocaleString()} tiles`);
  });

// ── Write output ──────────────────────────────────────────────────────────────
const output = { width: W, height: H, tiles };
fs.mkdirSync(path.dirname(MAP_OUT), { recursive: true });
fs.writeFileSync(MAP_OUT, JSON.stringify(output), 'utf8');

const fileSizeKB = (fs.statSync(MAP_OUT).size / 1024).toFixed(1);
console.log(`\nSaved: ${MAP_OUT}`);
console.log(`File size: ${fileSizeKB} KB`);
console.log('\nAtlas decode reference (GDScript):');
console.log('  if v == 255: skip (empty)');
console.log('  if v == 32:  Vector2i(0, 4)  # water');
console.log('  else:        Vector2i(v % 8, v / 8)  # A2 kind');
console.log('\nNext: open Godot → run the game → enter Plains biome scene.');
