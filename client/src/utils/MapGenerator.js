/**
 * MapGenerator — pure JS procedural world map generator.
 * No Phaser dependencies. Returns plain data consumed by WorldMapScene.
 *
 * Tile values:
 *   0 = grass
 *   1 = dirt (road)
 *   2 = stone (plaza / building floor)
 *   3 = water
 *   4 = tree / forest
 */

export const TILE = { GRASS: 0, DIRT: 1, STONE: 2, WATER: 3, TREE: 4 };

export const BUILDING_TYPES = {
  TOWN_HALL:   { label: 'Town Hall',    color: 0xCD853F, scene: 'TownScene',  icon: '🏛' },
  ARENA:       { label: 'Arena',        color: 0xCC2222, scene: 'ArenaScene', icon: '⚔' },
  SHOP:        { label: 'Shop',         color: 0x228B22, scene: null,         icon: '🛒' },
  INN:         { label: 'Inn',          color: 0x8B4513, scene: null,         icon: '🏠' },
  BLACKSMITH:  { label: 'Blacksmith',   color: 0x555555, scene: null,         icon: '🔨' },
  GUILD:       { label: 'Guild Hall',   color: 0x4169E1, scene: null,         icon: '⚜' },
  QUEST_BOARD: { label: 'Quest Board',  color: 0x8B6914, scene: null,         icon: '📜' },
  RUINS:       { label: 'Ancient Ruins',color: 0x666655, scene: null,         icon: '🗿' },
  WATCHTOWER:  { label: 'Watchtower',   color: 0x8B7355, scene: null,         icon: '🗼' },
};

const MAP_W = 200;
const MAP_H = 200;

// Simple seeded pseudo-random number generator (mulberry32)
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const MapGenerator = {
  /**
   * Generate a world map.
   * @param {number} seed — integer seed for reproducible maps
   * @returns {{ tiles, buildings, decorations, spawnPoint, mapW, mapH, tileSize }}
   */
  generate(seed = 42) {
    const rng = makeRng(seed);
    const tiles = new Uint8Array(MAP_W * MAP_H).fill(TILE.GRASS);

    const idx = (x, y) => y * MAP_W + x;
    const set = (x, y, v) => {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) tiles[idx(x, y)] = v;
    };
    const get = (x, y) => {
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return -1;
      return tiles[idx(x, y)];
    };

    const cx = Math.floor(MAP_W / 2);
    const cy = Math.floor(MAP_H / 2);

    // ── Water border (outer 4 tiles) ──────────────────────────────────────────
    for (let x = 0; x < MAP_W; x++) {
      for (let y = 0; y < MAP_H; y++) {
        if (x < 4 || x >= MAP_W - 4 || y < 4 || y >= MAP_H - 4) {
          set(x, y, TILE.WATER);
        }
      }
    }

    // ── Stone plaza at center (22×22) ─────────────────────────────────────────
    const PLAZA = 11;
    for (let dx = -PLAZA; dx <= PLAZA; dx++) {
      for (let dy = -PLAZA; dy <= PLAZA; dy++) {
        set(cx + dx, cy + dy, TILE.STONE);
      }
    }

    // ── Road network ──────────────────────────────────────────────────────────
    const ROAD_W = 3; // road half-width in tiles
    const roads = []; // store road segments for building placement

    // 4 cardinal roads from plaza edge to near-border
    const directions = [
      { dx: 0,  dy: -1, name: 'north' },
      { dx: 0,  dy:  1, name: 'south' },
      { dx: -1, dy:  0, name: 'west'  },
      { dx:  1, dy:  0, name: 'east'  },
    ];

    directions.forEach(dir => {
      const startDist = PLAZA + 1;
      const endDist   = Math.floor((MAP_W / 2) - 8);
      const roadTiles = [];

      for (let d = startDist; d < endDist; d++) {
        const rx = cx + dir.dx * d;
        const ry = cy + dir.dy * d;

        // Road width
        for (let w = -ROAD_W; w <= ROAD_W; w++) {
          const tx = rx + (dir.dy !== 0 ? w : 0);
          const ty = ry + (dir.dx !== 0 ? w : 0);
          if (get(tx, ty) !== TILE.WATER) {
            set(tx, ty, TILE.DIRT);
          }
        }
        roadTiles.push({ x: rx, y: ry });
      }

      roads.push({ dir, tiles: roadTiles });

      // Branch roads (40% chance at certain intervals)
      const branchIntervals = [20, 35, 50];
      branchIntervals.forEach(dist => {
        if (rng() < 0.55) {
          const branchStart = { x: cx + dir.dx * dist, y: cy + dir.dy * dist };
          const perpDir = dir.dx !== 0
            ? { dx: 0, dy: rng() < 0.5 ? -1 : 1 }
            : { dx: rng() < 0.5 ? -1 : 1, dy: 0 };
          const branchLen = Math.floor(rng() * 20 + 15);
          const branchTiles = [];

          for (let d = 1; d < branchLen; d++) {
            const bx = branchStart.x + perpDir.dx * d;
            const by = branchStart.y + perpDir.dy * d;
            for (let w = -2; w <= 2; w++) {
              const tx = bx + (perpDir.dy !== 0 ? w : 0);
              const ty = by + (perpDir.dx !== 0 ? w : 0);
              if (get(tx, ty) !== TILE.WATER) {
                set(tx, ty, TILE.DIRT);
              }
            }
            branchTiles.push({ x: bx, y: by });
          }
          roads.push({ dir: perpDir, tiles: branchTiles, branch: true });
        }
      });
    });

    // ── Forest clusters ───────────────────────────────────────────────────────
    for (let i = 0; i < 18; i++) {
      const fx = Math.floor(rng() * (MAP_W - 20) + 10);
      const fy = Math.floor(rng() * (MAP_H - 20) + 10);
      const fr = Math.floor(rng() * 8 + 4);
      for (let dx = -fr; dx <= fr; dx++) {
        for (let dy = -fr; dy <= fr; dy++) {
          if (dx * dx + dy * dy <= fr * fr) {
            const tx = fx + dx, ty = fy + dy;
            if (get(tx, ty) === TILE.GRASS) {
              set(tx, ty, TILE.TREE);
            }
          }
        }
      }
    }

    // ── Place buildings ───────────────────────────────────────────────────────
    const buildings = [];

    // Town Hall always at center
    buildings.push({
      x: cx, y: cy,
      tileX: cx, tileY: cy,
      type: 'TOWN_HALL',
      ...BUILDING_TYPES.TOWN_HALL,
    });

    // Arena always east of plaza
    buildings.push({
      x: cx + PLAZA + 6, y: cy,
      tileX: cx + PLAZA + 6, tileY: cy,
      type: 'ARENA',
      ...BUILDING_TYPES.ARENA,
    });

    // Scatter rest along roads
    const buildingPool = [
      'SHOP', 'INN', 'BLACKSMITH', 'GUILD',
      'QUEST_BOARD', 'RUINS', 'WATCHTOWER',
      'SHOP', 'INN', 'RUINS',
    ];

    let poolIdx = 0;
    roads.forEach(road => {
      if (poolIdx >= buildingPool.length) return;
      const candidates = road.tiles.filter((_, i) => i > 6 && i % 8 === 0);
      candidates.slice(0, road.branch ? 1 : 2).forEach(tile => {
        if (poolIdx >= buildingPool.length) return;
        const type = buildingPool[poolIdx++];
        // Offset building to the side of the road
        const perpOffset = road.dir.dx !== 0 ? { dx: 0, dy: 6 } : { dx: 6, dy: 0 };
        const side = rng() < 0.5 ? 1 : -1;
        const bx = tile.x + perpOffset.dx * side;
        const by = tile.y + perpOffset.dy * side;

        // Mark 4×4 building footprint as stone
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            if (get(bx + dx, by + dy) !== TILE.WATER) {
              set(bx + dx, by + dy, TILE.STONE);
            }
          }
        }

        buildings.push({
          x: bx, y: by,
          tileX: bx, tileY: by,
          type,
          ...BUILDING_TYPES[type],
        });
      });
    });

    // ── Decorations (rocks, bushes) ───────────────────────────────────────────
    const decorations = [];
    for (let i = 0; i < 120; i++) {
      const dx = Math.floor(rng() * (MAP_W - 10) + 5);
      const dy = Math.floor(rng() * (MAP_H - 10) + 5);
      const t = get(dx, dy);
      if (t === TILE.GRASS || t === TILE.TREE) {
        decorations.push({
          x: dx, y: dy,
          type: rng() < 0.6 ? 'tree' : 'rock',
        });
      }
    }

    return {
      tiles,
      buildings,
      decorations,
      spawnPoint: { x: cx, y: cy },
      mapW: MAP_W,
      mapH: MAP_H,
      tileSize: 32,
    };
  },
};
