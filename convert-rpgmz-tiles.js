/**
 * convert-rpgmz-tiles.js
 * Extracts the "interior" (fully-connected) 48×48 tile for every A2 autotile
 * from RPG Maker MZ World_A2.png + a sea tile from World_A1.png.
 * Output: assets/tilesets/world_a2_atlas.png  (8×5 tiles = 384×240 px)
 *
 * Atlas layout:
 *   Row 0:  A2 kinds  0- 7  (Grassland A, Grass Dark, Grass B, Grass B Dark, Forest, Fir, Mtn Grass, Mtn Dirt)
 *   Row 1:  A2 kinds  8-15  (Wasteland A, Wasteland B, Dirt Field, Dirt B, Forest Dead, Road Dirt, Hill Dirt, Mtn Stone)
 *   Row 2:  A2 kinds 16-23  (Desert A, Desert B, Rocky A, Lava Rock, Palm Forest, Road Paved, Mtn Rock, Mtn Lava)
 *   Row 3:  A2 kinds 24-31  (Snowfield, Mtn Snow, Clouds, Large Clouds, Forest Snow, Pit, Hill Stone, Hill Snow)
 *   Row 4:  col 0 = Sea (A1), col 1 = Fog (dark solid), rest = unused
 *
 * Run: node convert-rpgmz-tiles.js
 */

'use strict';
const { Jimp } = require('jimp');
const fs   = require('fs');
const path = require('path');

const TS = 48; // tile size in pixels

// RPG Maker A2 autotile source layout:
//   Each autotile type occupies 96×144 px in the sheet (2 tile cols × 3 tile rows).
//   The "interior" tile (shape 47 = all neighbours same) = top-left TS×TS px.
//   Sheet has 8 autotile types per row, 4 rows → 32 types total.
const A2_SRC_W = 96;     // source area width per autotile type
const A2_SRC_H = 144;    // source area height per autotile type
const A2_COLS  = 8;      // autotile types per sheet row

// Atlas dimensions
const ATLAS_COLS = 8;
const ATLAS_ROWS = 5;

const RPGMZ_TILESETS = 'C:/Program Files/KADOKAWA/RPGMZ/newdata/img/tilesets/';
const GODOT_ASSETS   = 'C:/Users/bibac/OneDrive/Dokumenty/Gra SAS godot/sas/assets/tilesets/';

// Copy a TS×TS region from (sx, sy) in srcImg to (dx, dy) in dstImg
function blitTile(dstImg, srcImg, dx, dy, sx, sy) {
  for (let py = 0; py < TS; py++) {
    for (let px = 0; px < TS; px++) {
      const color = srcImg.getPixelColor(sx + px, sy + py);
      dstImg.setPixelColor(color, dx + px, dy + py);
    }
  }
}

// Fill a TS×TS rectangle with a solid RGBA colour
function fillTile(dstImg, dx, dy, rgba) {
  for (let py = 0; py < TS; py++)
    for (let px = 0; px < TS; px++)
      dstImg.setPixelColor(rgba, dx + px, dy + py);
}

async function main() {
  fs.mkdirSync(GODOT_ASSETS, { recursive: true });

  console.log('Loading RPG Maker MZ tilesets…');
  const a2Img = await Jimp.read(RPGMZ_TILESETS + 'World_A2.png');
  const a1Img = await Jimp.read(RPGMZ_TILESETS + 'World_A1.png');
  console.log(`  World_A2: ${a2Img.width}×${a2Img.height}px  →  ${A2_COLS} types/row × 4 rows = 32 A2 types`);
  console.log(`  World_A1: ${a1Img.width}×${a1Img.height}px`);

  // Create blank atlas (transparent background)
  const atlas = new Jimp({ width: ATLAS_COLS * TS, height: ATLAS_ROWS * TS, color: 0x00000000 });

  // ── Rows 0-3: A2 kinds 0-31 ─────────────────────────────────────────────
  for (let kind = 0; kind < 32; kind++) {
    const srcCol = kind % A2_COLS;
    const srcRow = Math.floor(kind / A2_COLS);
    // Interior tile = top-left TS×TS of this autotile's 96×144 source area
    const srcX = srcCol * A2_SRC_W;
    const srcY = srcRow * A2_SRC_H;
    const dstX = (kind % ATLAS_COLS) * TS;
    const dstY = Math.floor(kind / ATLAS_COLS) * TS;
    blitTile(atlas, a2Img, dstX, dstY, srcX, srcY);
  }

  // ── Row 4, col 0: Sea tile from World_A1 ──────────────────────────────────
  // A1 animated tiles: each type = 96×96 px (2×2 tile block for 4 animation frames).
  // The non-animated centre of the "Sea" tile (kind=0) is at (48, 48) → frame 3 centre.
  // For simplicity, take (0, 0) which is the first animation frame's top-left quarter.
  blitTile(atlas, a1Img, 0 * TS, 4 * TS, 0, 0);

  // ── Row 4, col 1: Fog tile (locked biome) ──────────────────────────────────
  fillTile(atlas, 1 * TS, 4 * TS, 0x0F0F1AFF);  // very dark blue-grey

  // ── Row 4, cols 2-7: tinted grass variants for biome-adjacent borders ──────
  // (nice to have — add subtle noise to differentiate otherwise identical tiles)

  // ── Save atlas ──────────────────────────────────────────────────────────────
  const atlasPath = path.join(GODOT_ASSETS, 'world_a2_atlas.png');
  await atlas.write(atlasPath);
  console.log(`\nAtlas saved: ${atlasPath}  (${ATLAS_COLS * TS}×${ATLAS_ROWS * TS}px)`);

  // ── Also copy originals for reference ────────────────────────────────────
  const origB = RPGMZ_TILESETS + 'World_B.png';
  const origC = RPGMZ_TILESETS + 'World_C.png';
  if (fs.existsSync(origB)) {
    fs.copyFileSync(origB, path.join(GODOT_ASSETS, 'World_B.png'));
    console.log('Copied World_B.png (decoration tiles)');
  }
  if (fs.existsSync(origC)) {
    fs.copyFileSync(origC, path.join(GODOT_ASSETS, 'World_C.png'));
    console.log('Copied World_C.png (decoration tiles)');
  }

  // ── Print tile map for reference ─────────────────────────────────────────
  const A2_NAMES = [
    'Grassland A','Grassland A Dark','Grassland B','Grassland B Dark',
    'Forest','Forest Conifer','Mountain Grass','Mountain Dirt',
    'Wasteland A','Wasteland B','Dirt Field A','Dirt Field B',
    'Forest Dead','Road Dirt','Hill Dirt','Mountain Sandstone',
    'Desert A','Desert B','Rocky Land A','Rocky Land B (Lava)',
    'Forest Palm','Road Paved','Mountain Rock','Mountain Lava',
    'Snowfield','Mountain Snow','Clouds','Large Clouds',
    'Forest Snow','Pit','Hill Sandstone','Hill Snow',
  ];
  console.log('\nAtlas tile index (for WorldMap.gd):');
  console.log('  Vector2i(col, row)  ← set_cell(0, Vector2i(tx,ty), SOURCE_ID, Vector2i(col,row))');
  for (let i = 0; i < 32; i++) {
    const col = i % 8, row = Math.floor(i / 8);
    console.log(`  Vector2i(${col}, ${row})  = A2 kind ${i}: ${A2_NAMES[i]}`);
  }
  console.log('  Vector2i(0, 4)  = Sea (A1)');
  console.log('  Vector2i(1, 4)  = Fog/Locked biome (dark solid)');

  console.log('\nAll done! Next step: open Godot — the TileMap will auto-use the atlas via WorldMap.gd.');
}

main().catch(err => { console.error('FAILED:', err); process.exit(1); });
