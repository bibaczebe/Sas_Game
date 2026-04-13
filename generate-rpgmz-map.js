/**
 * generate-rpgmz-map.js
 * Generates a complete RPG Maker MZ project with the SaS world map sketch.
 * Run: node generate-rpgmz-map.js
 * Then open the output folder as a project in RPG Maker MZ.
 */

'use strict';
const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const NEWDATA_SRC = 'C:/Program Files/KADOKAWA/RPGMZ/newdata';
const OUT_DIR     = path.join(
  process.env.USERPROFILE || 'C:/Users/bibac',
  'Documents/RPGMaker Projects/SaS_WorldMap'
);

// ── Tile ID builder ───────────────────────────────────────────────────────────
// For Overworld tileset (tilesetId=1):  A2 starts at 2816  (kind 0–31)
// shape 47 = interior (all 8 neighbours connected) — looks clean for sketch fills
const A2 = (kind, shape = 47) => 2816 + kind * 48 + shape;
// A1 animated tiles (water etc.)
const A1 = (kind, shape = 0)  => 2048 + kind * 48 + shape;

// World_A2 tile kinds (from Outside_A2.txt / World_A2.txt)
const T = {
  GRASS        : A2(0),   // Grassland A          — main plains
  GRASS_DARK   : A2(1),   // Grassland A Dark     — transition to forest
  GRASS_B      : A2(2),   // Grassland B          — slightly varied
  GRASS_B_DARK : A2(3),   // Grassland B Dark     — near cold/forest edge
  FOREST       : A2(4),   // Forest               — forest biome border
  FOREST_FIR   : A2(5),   // Forest Conifer       — dense forest (impassable wall)
  MTN_GRASS    : A2(6),   // Mountain (Grass)     — mountain biome border
  MTN_DIRT     : A2(7),   // Mountain (Dirt)
  WASTELAND_A  : A2(8),   // Wasteland A          — volcanic/south transition
  WASTELAND_B  : A2(9),   // Wasteland B
  DIRT_FIELD   : A2(10),  // Dirt Field A         — cold/tundra transition
  FOREST_DEAD  : A2(12),  // Forest Dead Trees    — deep west border
  ROAD_DIRT    : A2(13),  // Road (Dirt)          — main paths
  MTN_SANDST   : A2(15),  // Mountain (Sandstone) — desert/rock border
  DESERT_A     : A2(16),  // Desert A             — SE desert border
  DESERT_B     : A2(17),  // Desert B             — deeper desert
  ROCKY_A      : A2(18),  // Rocky Land A         — E coast/mountain
  LAVA_ROCK    : A2(19),  // Rocky Land B (Lava)  — south volcanic
  ROAD_PAVED   : A2(21),  // Road (Paved)         — town plaza / stone paths
  MTN_ROCK     : A2(22),  // Mountain (Rock)      — NE hard mountain
  MTN_LAVA     : A2(23),  // Mountain (Lava)      — south volcanic hard
  SNOW         : A2(24),  // Snowfield            — north tundra border
  MTN_SNOW     : A2(25),  // Mountain (Snow)      — NE corner mountain+snow
  FOREST_SNOW  : A2(28),  // Forest (Snow)        — NW snow-forest mix
};

// ── Map dimensions ────────────────────────────────────────────────────────────
const W = 200;
const H = 200;
const LAYERS = 6;
const data = new Array(W * H * LAYERS).fill(0);

// Helper: write to layer 0 (ground)
function set(x, y, tileId) {
  if (x >= 0 && x < W && y >= 0 && y < H)
    data[y * W + x] = tileId;
}

// Fill rectangle on layer 0
function fill(x1, y1, x2, y2, tileId) {
  for (let y = Math.max(0, y1); y <= Math.min(H - 1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(W - 1, x2); x++)
      set(x, y, tileId);
}

// Fill a straight H or V road (5 tiles wide)
function road(x1, y1, x2, y2, tileId = T.ROAD_DIRT) {
  fill(x1, y1, x2, y2, tileId);
}

// ── STEP 1: Base layer — grassland everywhere ─────────────────────────────────
fill(0, 0, W - 1, H - 1, T.GRASS);

// ── STEP 2: NORTH border (Tundra) ────────────────────────────────────────────
// Hard border at very top 5 tiles
fill(0,   0, W - 1,  4, T.SNOW);
// Snowfield fading into cold dirt
fill(0,   5, W - 1,  9, T.GRASS_B_DARK);
fill(0,  10, W - 1, 15, T.DIRT_FIELD);
// Gentle transition grass
fill(0,  16, W - 1, 22, T.GRASS_B);

// ── STEP 3: WEST border (Dark Forest) ─────────────────────────────────────────
fill(0,  0, 6,  H - 1, T.FOREST_FIR);   // impassable dense fir
fill(7,  0, 14, H - 1, T.FOREST);       // lighter forest
fill(15, 0, 22, H - 1, T.GRASS_DARK);  // tree-shadow transition

// ── STEP 4: NW corner (forest + snow overlap) ─────────────────────────────────
fill(0, 0, 22, 22, T.FOREST_FIR);  // NW corner is very dense forest

// ── STEP 5: NE corner (Mountains + Snow) ──────────────────────────────────────
fill(170, 0,  W - 1,  4, T.MTN_SNOW);
fill(165, 0,  W - 1, 20, T.MTN_ROCK);
fill(155, 0,  W - 1, 35, T.MTN_GRASS);
fill(145, 0,  W - 1, 45, T.GRASS_B_DARK);  // foothills transition

// ── STEP 6: EAST border (Coastline / Mountains) ───────────────────────────────
fill(186, 40, W - 1, H - 1, T.ROCKY_A);    // rocky coast
fill(175, 40, 185,   H - 1, T.MTN_GRASS);  // mountain grass foothills
fill(163, 40, 174,   H - 1, T.GRASS_B);    // grassland thinning

// ── STEP 7: SE corner (Desert) ───────────────────────────────────────────────
// Desert grows from the SE corner inward
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = (W - 1 - x) + (H - 1 - y);
    if      (d < 30)  set(x, y, T.DESERT_B);
    else if (d < 55)  set(x, y, T.DESERT_A);
    else if (d < 75)  set(x, y, T.MTN_SANDST);
    else if (d < 95)  set(x, y, T.WASTELAND_A);
  }
}

// ── STEP 8: SOUTH border (Volcanic) ──────────────────────────────────────────
fill(0, 190, W - 1, H - 1, T.MTN_LAVA);    // hard volcanic edge
fill(0, 180, W - 1, 189,   T.LAVA_ROCK);
fill(0, 170, W - 1, 179,   T.WASTELAND_A);
fill(0, 161, W - 1, 169,   T.WASTELAND_B);

// ── STEP 9: SW corner (Wasteland / Desert merge) ─────────────────────────────
fill(0, 145, 22, H - 1, T.WASTELAND_A);  // SW corner wasteland

// ── STEP 10: Interior grass re-assertion (clean up leftover gradients) ────────
// The central plains should be clear grassland
fill(30, 30, W - 50, H - 50, T.GRASS);   // interior "clean" zone re-grass

// ── STEP 11: ROADS ───────────────────────────────────────────────────────────
// Roads run through the clean interior (avoid extreme borders)

// Main N–S road: cols 97–103, y 23 to 158  (stops before Tundra/Volcanic)
road(97, 23, 103, 158);

// Main E–W road: rows 97–103, x 23 to 158  (stops before Forest/Coast)
road(23, 97, 158, 103);

// NE branch road: from center NE toward mountain border (diagonal via steps)
for (let i = 0; i < 45; i++) {
  const bx = 103 + i;
  const by = 97 - i;
  fill(bx, by, Math.min(bx + 5, W - 50), Math.max(by - 5, 30), T.ROAD_DIRT);
}

// SW branch road: from center SW toward forest/wasteland
for (let i = 0; i < 40; i++) {
  const bx = 97 - i;
  const by = 103 + i;
  fill(Math.max(bx - 5, 30), by, bx, Math.min(by + 5, 160), T.ROAD_DIRT);
}

// Northern branch (secondary road toward Tundra gate)
road(97, 23, 103, 70);   // reinforces N portion

// Eastern branch (toward Coast gate)
road(115, 97, 160, 103); // branch road goes east

// Southern connection road (toward Volcanic border)
road(97, 130, 103, 158);

// Western road (toward Forest border)
road(23, 97, 70, 103);

// ── STEP 12: TOWN PLAZA (center) ─────────────────────────────────────────────
// Large stone plaza around town center
fill(78, 78, 122, 122, T.ROAD_PAVED);

// Inner plaza courtyard (darker stone)
fill(88, 88, 112, 112, T.ROAD_PAVED);   // same, user can differentiate in editor

// Re-draw roads through plaza
road(97, 78, 103, 122);         // N–S road through plaza
road(78, 97, 122, 103);         // E–W road through plaza

// ── STEP 13: BORDER SEPARATOR LINES ──────────────────────────────────────────
// Visual "edge of biome" markers — thin strips at the transition point
// These are cosmetic: they show the player "you're at the edge of Plains"

// Northern gate markers (where N-S road meets forest border)
// (border line visual already done by the snow/dirt tiles at y=0-22)

// Western forest wall (already done by Forest tiles at x=0-22)

// Eastern mountain wall starts at x=155
fill(155, 40, 158, H - 45, T.MTN_GRASS);

// Southern lava wall starts at y=161
fill(28, 161, W - 48, 164, T.LAVA_ROCK);

// Northern snow wall at y=16
fill(28, 16, W - 28, 19, T.SNOW);

// ── STEP 14: RE-APPLY HARD FOREST WALLS (roads must not poke into forest) ────
fill(0,  0, 6,  H - 1, T.FOREST_FIR);
fill(7,  0, 14, H - 1, T.FOREST);
fill(0,  0, 22, 22,    T.FOREST_FIR);

// ── STEP 15: GRASS TRANSITION BUFFER STRIPS ──────────────────────────────────
// Soft strips between each border zone and the main grass interior
// (these smooth the hard edges the user will see when opening RPG Maker)
fill(23, 23, W - 23, 23, T.GRASS_B);  // southern edge of N transition
fill(23, 23, 23, H - 23, T.GRASS_B);  // eastern edge of W transition

// ── Build Map JSON ────────────────────────────────────────────────────────────
const mapJson = {
  autoplayBgm: false,
  autoplayBgs: false,
  battleback1Name: "",
  battleback2Name: "",
  bgm:  { name: "", pan: 0, pitch: 100, volume: 90 },
  bgs:  { name: "", pan: 0, pitch: 100, volume: 90 },
  disableDashing: false,
  displayName: "Plains — SaS Biome 1 (Sketch)",
  encounterList: [],
  encounterStep: 30,
  height: H,
  note: [
    "SaS World Map — Plains Biome Sketch",
    "Tile shape IDs all use shape=47 (interior fill).",
    "Open in RPG Maker MZ editor and re-paint border tiles",
    "with the correct autotile brush to fix edge transitions.",
    "",
    "Border zones:",
    "  N  (y 0-22)  = Tundra approach",
    "  W  (x 0-22)  = Dark Forest wall",
    "  NE (x>155,y<45) = Mountains",
    "  E  (x>163)   = Coastline",
    "  SE corner    = Desert A",
    "  S  (y>161)   = Volcanic wastes",
    "  SW corner    = Wasteland",
    "",
    "Center plaza: (78,78)-(122,122)",
    "Main roads: cols 97-103 (N-S), rows 97-103 (E-W)",
  ].join("\n"),
  parallaxLoopX: false,
  parallaxLoopY: false,
  parallaxName: "",
  parallaxShow: true,
  parallaxSx: 0,
  parallaxSy: 0,
  scrollType: 0,
  specifyBattleback: false,
  tilesetId: 1,
  width: W,
  data: data,
  events: [null],
};

// MapInfos.json
const mapInfos = [
  null,
  {
    id: 1,
    expanded: false,
    name: "Plains (Biome 1 - SaS)",
    order: 0,
    parentId: 0,
    scrollX: 0,
    scrollY: 0,
  },
];

// ── Copy project template & write files ───────────────────────────────────────
function copyDir(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      // Don't overwrite files we're generating
      const skip = ['Map001.json', 'MapInfos.json'];
      if (!skip.includes(entry.name)) {
        fs.copyFileSync(s, d);
      }
    }
  }
}

console.log('Creating RPG Maker MZ project at:', OUT_DIR);
copyDir(NEWDATA_SRC, OUT_DIR);

const dataDir = path.join(OUT_DIR, 'data');
fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(
  path.join(dataDir, 'Map001.json'),
  JSON.stringify(mapJson),
  'utf8'
);
fs.writeFileSync(
  path.join(dataDir, 'MapInfos.json'),
  JSON.stringify(mapInfos),
  'utf8'
);

console.log(`\nDone! Map001.json written: ${W}×${H} tiles (${W * H * LAYERS} data entries)`);
console.log('\nTile summary:');
const freq = {};
data.slice(0, W * H).forEach(t => { if (t > 0) freq[t] = (freq[t] || 0) + 1; });
Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([tid, cnt]) => {
    const kind = Math.floor((+tid - 2816) / 48);
    const shape = (+tid - 2816) % 48;
    const names = ['Grass','Grass Dark','Grass B','Grass B Dark','Forest','Forest Fir',
                   'Mtn Grass','Mtn Dirt','Wasteland A','Wasteland B','Dirt Field','Dirt Field B',
                   'Forest Dead','Road Dirt','Hill Dirt','Mtn Stone','Desert A','Desert B',
                   'Rocky A','Lava Rock','Palm Forest','Road Paved','Mtn Rock','Mtn Lava',
                   'Snow','Mtn Snow','Clouds','Large Clouds','Forest Snow','Pit','Hill Stone','Hill Snow'];
    const name = kind >= 0 && kind < names.length ? names[kind] : 'unknown';
    console.log(`  TileID ${tid} (kind=${kind} "${name}", shape=${shape}): ${cnt} tiles`);
  });
console.log(`\nTo open: Launch RPG Maker MZ → Open Project → browse to "${OUT_DIR}"`);
