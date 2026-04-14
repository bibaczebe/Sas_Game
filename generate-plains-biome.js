/**
 * generate-plains-biome.js
 * Generates a large, content-rich 300×300 Plains biome map for RPG Maker MZ.
 *
 * Layout:
 *   IRONHAVEN (Central Town)  — (149, 149)
 *   Millhaven Village (N)     — (105,  68)
 *   Stonegate Village (E)     — (228, 149)
 *   Dusthaven Village (S)     — (149, 237)
 *   Westbrook Village (W)     — ( 68, 149)
 *   Ancient Ruins (NE)        — (190,  48)
 *   Ranger's Lodge (W forest) — ( 50, 120)
 *   Bandit Camp (SW)          — ( 92, 212)
 *   Fishing Village (E coast) — (268, 175)
 *   Dwarven Mine (NE hills)   — (245,  88)
 *   Farm District (NE center) — (170–200, 82–102)
 *   Lake Ashvale (S-center)   — (148, 216)
 *   Graveyard                 — (166, 114)
 *
 * Run: node generate-plains-biome.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const NEWDATA_SRC = 'C:/Program Files/KADOKAWA/RPGMZ/newdata';
const OUT_DIR = path.join(
  process.env.USERPROFILE || 'C:/Users/bibac',
  'Documents/RPGMaker Projects/SaS_Plains'
);

// ── Tile ID helpers ───────────────────────────────────────────────────────────
// shape is computed by computeShapes() post-pass; default 0 = solid fill
const A2 = (kind, shape = 0) => 2816 + kind * 48 + shape;
const A1 = (kind, shape = 0) => 2048 + kind * 48 + shape;

// Cardinal autotile shape lookup — derived from real RPG Maker MZ sample maps.
// Key = bits: N=1, E=2, S=4, W=8 (1 if neighbor is same kind, 0 otherwise).
// 16 cardinal configurations → correct shape index for each border/edge/fill.
const CARDINAL_SHAPE = [
  46, // 0000 = isolated
  44, // 0001 = N only
  43, // 0010 = E only
  40, // 0011 = N+E corner
  42, // 0100 = S only
  32, // 0101 = N+S tunnel
  34, // 0110 = E+S corner
  16, // 0111 = N+E+S (open W)
  45, // 1000 = W only
  38, // 1001 = N+W corner
  33, // 1010 = E+W tunnel
  28, // 1011 = N+E+W (open S)
  36, // 1100 = S+W corner
  26, // 1101 = N+S+W (open E)
  20, // 1110 = E+S+W (open N)
   0, // 1111 = all connected → solid fill
];

// Post-process layer 0: rewrite each A2 tile's shape based on its 4 cardinal
// neighbors. A1 water tiles are skipped (shape doesn't apply to water).
function computeShapes() {
  const layer0start = 0;
  const A2_BASE = 2816, A2_END = 4352;
  // snapshot kind for each cell (0 if not A2)
  const kinds = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const id = data[i];
    if (id >= A2_BASE && id < A2_END) kinds[i] = Math.floor((id - A2_BASE) / 48);
    else                               kinds[i] = -1;  // water / empty
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (kinds[idx] < 0) continue;
      const k = kinds[idx];
      const n = (y > 0   && kinds[(y-1)*W+x] === k) ? 1 : 0;
      const e = (x < W-1 && kinds[y*W+(x+1)] === k) ? 2 : 0;
      const s = (y < H-1 && kinds[(y+1)*W+x] === k) ? 4 : 0;
      const w = (x > 0   && kinds[y*W+(x-1)] === k) ? 8 : 0;
      const bits = n | e | s | w;
      data[idx] = A2_BASE + k * 48 + CARDINAL_SHAPE[bits];
    }
  }
}

const T = {
  GRASS:        A2(0),   // Grassland A         — main plains
  GRASS_DARK:   A2(1),   // Grassland A Dark    — near forest/settlements
  GRASS_B:      A2(2),   // Grassland B         — subtle variation
  GRASS_B_DARK: A2(3),   // Grassland B Dark    — cold/border zones
  FOREST:       A2(4),   // Forest              — tree border
  FOREST_FIR:   A2(5),   // Forest Fir          — dense impassable
  MTN_GRASS:    A2(6),   // Mountain Grass      — foothills
  MTN_DIRT:     A2(7),   // Mountain Dirt       — rocky interior
  WASTELAND_A:  A2(8),   // Wasteland A         — barren south/SW
  WASTELAND_B:  A2(9),   // Wasteland B
  DIRT_FIELD:   A2(10),  // Dirt Field          — tundra/farm soil
  FOREST_DEAD:  A2(12),  // Dead Forest         — SW dark area
  ROAD_DIRT:    A2(13),  // Dirt Road           — main paths
  MTN_SANDST:   A2(15),  // Sandstone           — SE desert edge
  ROCKY_A:      A2(18),  // Rocky Land          — east coast
  ROAD_PAVED:   A2(21),  // Paved Stone         — town plaza / stone roads
  MTN_ROCK:     A2(22),  // Mountain Rock       — NE hard mountain
  SNOW:         A2(24),  // Snowfield           — north border
  MTN_SNOW:     A2(25),  // Mountain Snow       — NE peak
  WATER:        A1(0),   // Water               — rivers / lake
};

// ── Map setup ─────────────────────────────────────────────────────────────────
const W = 300, H = 300, LAYERS = 6;
const data = new Array(W * H * LAYERS).fill(0);

function inBounds(x, y) { return x >= 0 && x < W && y >= 0 && y < H; }
function set(x, y, t, L = 0) { if (inBounds(x, y)) data[L * W * H + y * W + x] = t; }
function fill(x1, y1, x2, y2, t, L = 0) {
  for (let y = Math.max(0, y1); y <= Math.min(H-1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(W-1, x2); x++)
      set(x, y, t, L);
}
function circle(cx, cy, r, t, L = 0) {
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx*dx + dy*dy <= r2) set(cx+dx, cy+dy, t, L);
}
function ellipse(cx, cy, rx, ry, t, L = 0) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx/rx)*(dx/rx) + (dy/ry)*(dy/ry) <= 1.0) set(cx+dx, cy+dy, t, L);
}
// Straight line / road segment (w = half-width)
function seg(x1, y1, x2, y2, t, w = 2) {
  const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
  if (steps === 0) { fill(x1-w, y1-w, x1+w, y1+w, t); return; }
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const x = Math.round(x1 + (x2-x1)*f);
    const y = Math.round(y1 + (y2-y1)*f);
    fill(x-w, y-w, x+w, y+w, t);
  }
}
// Simple deterministic hash [0,1) for terrain variation
function hash(x, y, s = 0) {
  let h = (x * 1619 + y * 31337 + s * 7919) | 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF;
}

// ══════════════════════════════════════════════════════════════════════════════
// TERRAIN GENERATION — order matters (later overwrites earlier)
// ══════════════════════════════════════════════════════════════════════════════

// 1. BASE GRASS — full map
fill(0, 0, W-1, H-1, T.GRASS);
// Subtle variation noise
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const h = hash(x, y, 3);
    if      (h < 0.07) set(x, y, T.GRASS_B);
    else if (h < 0.02) set(x, y, T.GRASS_B_DARK);
  }

// 2. NORTH BORDER — Tundra / Snow
fill(0,  0, W-1,  4, T.MTN_SNOW);
fill(0,  5, W-1, 11, T.SNOW);
fill(0, 12, W-1, 19, T.DIRT_FIELD);
fill(0, 20, W-1, 26, T.GRASS_B_DARK);

// 3. WEST BORDER — Dense Forest Wall
fill(0,  0, 11, H-1, T.FOREST_FIR);
fill(12, 0, 21, H-1, T.FOREST);
fill(22, 0, 30, H-1, T.GRASS_DARK);

// 4. NW CORNER — Forest + Snow overlap
fill(0, 0, 30, 30, T.FOREST_FIR);

// 5. NE CORNER — Mountains
fill(250,  0, W-1,  8, T.MTN_SNOW);
fill(238,  0, W-1, 35, T.MTN_ROCK);
fill(225,  0, W-1, 58, T.MTN_GRASS);
fill(212, 40, W-1, 78, T.GRASS_DARK);

// 6. EAST BORDER — Rocky Coast
fill(272, 55, W-1, H-1, T.ROCKY_A);
fill(258, 75, 271, H-1, T.MTN_GRASS);
fill(244, 95, 257, H-1, T.GRASS_DARK);

// 7. SE CORNER — Desert creep
for (let y = 140; y < H; y++)
  for (let x = 160; x < W; x++) {
    const d = (x - 160) + (y - 140);
    if      (d > 280) set(x, y, T.MTN_SANDST);
    else if (d > 245) set(x, y, T.WASTELAND_A);
    else if (d > 210) set(x, y, T.GRASS_B_DARK);
  }

// 8. SOUTH BORDER — Wasteland / Volcanic edge
fill(0, 278, W-1, H-1, T.WASTELAND_B);
fill(0, 268, W-1, 277, T.WASTELAND_A);
fill(0, 255, W-1, 267, T.GRASS_B_DARK);

// 9. SW CORNER — Wasteland + Dead Forest
fill(0, 250, 28, H-1, T.WASTELAND_A);
ellipse(25, 235, 16, 12, T.FOREST_DEAD);

// 10. INTERIOR RE-ASSERTION — restore central plains after borders
fill(33, 28, 240, 252, T.GRASS);
for (let y = 28; y < 252; y++)
  for (let x = 33; x < 240; x++) {
    const h = hash(x, y, 13);
    if      (h < 0.07) set(x, y, T.GRASS_B);
    else if (h < 0.025) set(x, y, T.GRASS_B_DARK);
  }

// 11. FOREST PATCHES (organic blobs inside plains)
// West forest (beside the wall)
ellipse(48, 115, 14, 52, T.FOREST);
ellipse(46, 112, 10, 46, T.FOREST_FIR);
// North-center forest
ellipse(118, 50, 22, 13, T.FOREST);
ellipse(113, 47, 15, 9,  T.FOREST_FIR);
// Center-east forest
ellipse(220, 188, 17, 13, T.FOREST);
ellipse(217, 185, 11, 8,  T.FOREST_FIR);
// South-west dead forest extension
ellipse(55, 228, 13, 9, T.FOREST_DEAD);

// 12. NE HILLS / ROCKY OUTCROPPINGS
ellipse(208, 78, 18, 12, T.MTN_GRASS);
ellipse(207, 75, 10, 7,  T.MTN_ROCK);
ellipse(224, 65, 14, 10, T.MTN_GRASS);
ellipse(178, 108, 12, 8, T.MTN_GRASS);
ellipse(180, 105, 6,  4, T.MTN_DIRT);
ellipse(248, 143, 8,  6, T.ROCKY_A);

// 13. RIVER SYSTEM
// Main river: NW → SE, winding across the plains
const riverMain = [
  [46, 98], [62, 94], [82, 99], [102, 95],
  [120, 101], [137, 104], [150, 107], [163, 103],
  [182, 101], [200, 106], [218, 113], [238, 122],
  [253, 133], [264, 150], [269, 170], [271, 188],
];
for (let i = 0; i < riverMain.length - 1; i++) {
  const [x1,y1] = riverMain[i], [x2,y2] = riverMain[i+1];
  seg(x1, y1, x2, y2, T.WATER, 3);
}
// Northern tributary (flows from N border down to main river)
const riverNorth = [[80, 15], [78, 35], [76, 55], [75, 75], [77, 95]];
for (let i = 0; i < riverNorth.length - 1; i++) {
  const [x1,y1] = riverNorth[i], [x2,y2] = riverNorth[i+1];
  seg(x1, y1, x2, y2, T.WATER, 2);
}
// Lake Ashvale (south-center)
ellipse(148, 216, 16, 11, T.WATER);

// 14. MAIN ROAD NETWORK
// N-S spine
seg(149,  27, 149, 262, T.ROAD_DIRT, 2);
// E-W spine
seg(35,  149, 263, 149, T.ROAD_DIRT, 2);
// Paved upgrades near Ironhaven
seg(149,  90, 149, 205, T.ROAD_PAVED, 2);
seg( 75, 149, 220, 149, T.ROAD_PAVED, 2);

// Road to Millhaven (north village)
seg(149, 100, 120, 70, T.ROAD_DIRT, 2);
seg(120,  70, 107, 70, T.ROAD_DIRT, 2);
// Road to Ancient Ruins
seg(149,  80, 188, 50, T.ROAD_DIRT, 1);
// Road to Mine
seg(205, 149, 244, 92, T.ROAD_DIRT, 1);
// Road to Ranger Lodge
seg(110, 149,  54, 122, T.ROAD_DIRT, 1);
// Road to Fishing Village
seg(258, 149, 268, 173, T.ROAD_DIRT, 1);
// Road to Bandit Camp
seg(100, 149,  94, 210, T.ROAD_DIRT, 1);
// Road to Farm District
seg(149, 102, 180, 90, T.ROAD_DIRT, 1);
seg(180,  90, 198, 90, T.ROAD_DIRT, 1);
// Road south to Dusthaven
seg(149, 205, 149, 236, T.ROAD_DIRT, 2);
// Road east to Stonegate
seg(220, 149, 228, 149, T.ROAD_PAVED, 2);

// 15. SETTLEMENTS

// ── IRONHAVEN — Central Town ──────────────────────────────────────────────────
circle(149, 149, 20, T.GRASS_DARK);
circle(149, 149, 15, T.ROAD_PAVED);
// Inner courtyard accent (darker stone feel — same tile, editor can differentiate)
seg(149, 134, 149, 164, T.ROAD_PAVED, 1);
seg(134, 149, 164, 149, T.ROAD_PAVED, 1);

// ── MILLHAVEN — North Village ─────────────────────────────────────────────────
circle(106, 69, 14, T.GRASS_DARK);
circle(106, 69, 10, T.ROAD_PAVED);
seg(106, 62, 106, 76, T.ROAD_PAVED, 1);
seg( 99, 69, 113, 69, T.ROAD_PAVED, 1);

// ── STONEGATE — East Village ──────────────────────────────────────────────────
circle(228, 149, 12, T.GRASS_DARK);
circle(228, 149,  8, T.ROAD_PAVED);

// ── DUSTHAVEN — South Village ─────────────────────────────────────────────────
circle(149, 237, 13, T.GRASS_DARK);
circle(149, 237,  9, T.ROAD_PAVED);

// ── WESTBROOK — West Village ──────────────────────────────────────────────────
circle( 68, 149, 11, T.GRASS_DARK);
circle( 68, 149,  8, T.ROAD_PAVED);

// ── ANCIENT RUINS (NE) ────────────────────────────────────────────────────────
fill(183, 43, 197, 55, T.ROAD_PAVED);
fill(185, 45, 195, 53, T.MTN_DIRT);      // crumbled interior
fill(187, 47, 193, 51, T.ROAD_PAVED);    // inner ring still standing
fill(189, 48, 191, 50, T.MTN_ROCK);      // rubble center

// ── RANGER'S LODGE (W Forest) ─────────────────────────────────────────────────
circle(52, 122, 10, T.GRASS_DARK);
fill(47, 117, 57, 128, T.ROAD_PAVED);

// ── BANDIT CAMP (SW) ─────────────────────────────────────────────────────────
ellipse(93, 213, 13, 10, T.WASTELAND_A);
ellipse(93, 213,  9,  7, T.WASTELAND_B);
fill(89, 209, 97, 217, T.DIRT_FIELD);

// ── FISHING VILLAGE (E Coast) ────────────────────────────────────────────────
circle(268, 175, 10, T.GRASS_DARK);
fill(263, 170, 273, 181, T.ROAD_PAVED);

// ── DWARVEN MINE (NE Hills) ──────────────────────────────────────────────────
fill(241, 85, 250, 93, T.MTN_ROCK);
fill(243, 87, 248, 91, T.MTN_DIRT);
fill(245, 88, 246, 90, T.ROAD_PAVED);    // mine entrance floor

// ── GRAVEYARD (N of Ironhaven) ───────────────────────────────────────────────
fill(161, 110, 172, 120, T.GRASS_B_DARK);
fill(163, 112, 170, 118, T.DIRT_FIELD);

// ── FARM DISTRICT (NE of center) ─────────────────────────────────────────────
fill(160, 80, 202, 102, T.GRASS_B);      // meadow base
for (let fy = 81; fy < 101; fy += 9)
  for (let fx = 162; fx < 200; fx += 11)
    fill(fx, fy, fx+8, fy+6, T.DIRT_FIELD);  // tilled field strips

// ── EASTERN FARM (E of Ironhaven) ────────────────────────────────────────────
fill(185, 162, 215, 188, T.GRASS_B);
for (let fy = 163; fy < 187; fy += 9)
  for (let fx = 187; fx < 213; fx += 11)
    fill(fx, fy, fx+8, fy+6, T.DIRT_FIELD);

// 16. BRIDGE MARKERS (paved stone at road × river crossings)
// N-S road crosses main river around y=104
fill(147, 102, 151, 108, T.ROAD_PAVED);
// NE branch crosses around (200, 106)
fill(198, 103, 202, 107, T.ROAD_PAVED);

// 17. RE-APPLY RIVER ON TOP (rivers overwrite roads)
for (let i = 0; i < riverMain.length - 1; i++) {
  const [x1,y1] = riverMain[i], [x2,y2] = riverMain[i+1];
  seg(x1, y1, x2, y2, T.WATER, 3);
}
for (let i = 0; i < riverNorth.length - 1; i++) {
  const [x1,y1] = riverNorth[i], [x2,y2] = riverNorth[i+1];
  seg(x1, y1, x2, y2, T.WATER, 2);
}
ellipse(148, 216, 16, 11, T.WATER);

// 18. RE-APPLY HARD WALLS (always last — these never get overwritten)
fill(0,  0, 11, H-1, T.FOREST_FIR);
fill(12, 0, 21, H-1, T.FOREST);
fill(250, 0, W-1, 8, T.MTN_SNOW);
fill(238, 0, W-1, 35, T.MTN_ROCK);

// ── Build & write RPG Maker project ──────────────────────────────────────────
const mapJson = {
  autoplayBgm: false, autoplayBgs: false,
  battleback1Name: '', battleback2Name: '',
  bgm: { name: '', pan: 0, pitch: 100, volume: 90 },
  bgs: { name: '', pan: 0, pitch: 100, volume: 90 },
  disableDashing: false,
  displayName: 'Plains — Ironhaven Region (SaS Biome 1)',
  encounterList: [], encounterStep: 30,
  height: H,
  note: [
    'SaS World Map — Plains Biome (Ironhaven Region)',
    '300×300 tiles @ 48px = 14400×14400 world pixels',
    '',
    'Key Locations:',
    '  IRONHAVEN Central Town : (149,149)',
    '  Millhaven Village (N)  : (106, 69)',
    '  Stonegate Village (E)  : (228,149)',
    '  Dusthaven Village (S)  : (149,237)',
    '  Westbrook Village (W)  : ( 68,149)',
    '  Ancient Ruins (NE)     : (190, 48)',
    "  Ranger's Lodge (W)     : ( 52,122)",
    '  Bandit Camp (SW)       : ( 93,213)',
    '  Fishing Village (E)    : (268,175)',
    '  Dwarven Mine (NE)      : (245, 88)',
    '  Farm District          : (170-200, 82-102)',
    '  Lake Ashvale           : (148,216)',
    '  Graveyard              : (166,115)',
    '',
    'Borders:',
    '  N (y 0-26)   = Tundra/Snow approach',
    '  W (x 0-30)   = Dark Forest Wall (impassable)',
    '  NE (x>225)   = Mountain range',
    '  E (x>258)    = Rocky coastline',
    '  SE           = Desert / Sandstone creep',
    '  S (y>255)    = Wasteland approach',
    '  SW           = Dead Forest / Wasteland',
    '',
    'River flows NW→SE, crosses N-S road at y≈104.',
    'Lake Ashvale at (148,216).',
  ].join('\n'),
  parallaxLoopX: false, parallaxLoopY: false,
  parallaxName: '', parallaxShow: true, parallaxSx: 0, parallaxSy: 0,
  scrollType: 0, specifyBattleback: false,
  tilesetId: 1, width: W, data, events: [null],
};

const mapInfos = [null, {
  id: 1, expanded: false,
  name: 'Plains — Ironhaven Region (SaS)',
  order: 0, parentId: 0, scrollX: 0, scrollY: 0,
}];

function copyDir(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (!['Map001.json', 'MapInfos.json'].includes(e.name))
      fs.copyFileSync(s, d);
  }
}

// ── Post-process: compute proper autotile shapes ──────────────────────────────
computeShapes();

console.log('Creating project at:', OUT_DIR);
copyDir(NEWDATA_SRC, OUT_DIR);
const dataDir = path.join(OUT_DIR, 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'Map001.json'), JSON.stringify(mapJson), 'utf8');
fs.writeFileSync(path.join(dataDir, 'MapInfos.json'), JSON.stringify(mapInfos), 'utf8');

// ── Fix tileset: use Outside_A2 (outdoor terrain), mode 1 = Area ─────────────
const tilesetsPath = path.join(dataDir, 'Tilesets.json');
const tilesets = JSON.parse(fs.readFileSync(tilesetsPath, 'utf8'));
if (tilesets[1]) {
  tilesets[1].name         = 'SaS Plains — Outside';
  tilesets[1].mode         = 1;  // 0=World, 1=Area
  tilesets[1].tilesetNames = ['Outside_A1','Outside_A2','Outside_A3','Outside_A4','Outside_A5','Outside_B','Outside_C','',''];
  fs.writeFileSync(tilesetsPath, JSON.stringify(tilesets), 'utf8');
  console.log('Tileset set to: Outside_A2, mode=1 (Area)');
}

// Game.rmmzproject — the real RPG Maker MZ project marker (version string)
const rmmzprojPath = path.join(OUT_DIR, 'Game.rmmzproject');
if (!fs.existsSync(rmmzprojPath)) {
  fs.writeFileSync(rmmzprojPath, 'RPGMZ 1.9.0', 'utf8');
  console.log('Created Game.rmmzproject');
}

const tileCount = data.slice(0, W * H).filter(t => t > 0).length;
console.log(`\nDone! Map: ${W}×${H}  (${tileCount.toLocaleString()} tiles placed)`);
console.log('\nKey locations:');
const locs = [
  ['IRONHAVEN Town',    149, 149],
  ['Millhaven',        106,  69],
  ['Stonegate',        228, 149],
  ['Dusthaven',        149, 237],
  ['Westbrook',         68, 149],
  ['Ancient Ruins',    190,  48],
  ["Ranger's Lodge",    52, 122],
  ['Bandit Camp',       93, 213],
  ['Fishing Village',  268, 175],
  ['Dwarven Mine',     245,  88],
  ['Lake Ashvale',     148, 216],
];
locs.forEach(([n, x, y]) => console.log(`  ${n.padEnd(18)} (${x}, ${y})`));
console.log('\nNext: node convert-rpgmz-map.js');
