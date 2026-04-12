import Phaser from 'phaser';
import { MapGenerator, TILE } from '../utils/MapGenerator.js';
import GameStateManager from '../managers/GameStateManager.js';
import SocketManager    from '../managers/SocketManager.js';

const TILE_SIZE   = 32;
const PLAYER_SPD  = 200;
const INTERACT_R  = 72;  // px — interaction radius

// Tile colours
const TILE_COLORS = {
  [TILE.GRASS]: 0x3a7a20,
  [TILE.DIRT]:  0x8B6914,
  [TILE.STONE]: 0x888880,
  [TILE.WATER]: 0x1a3a6a,
  [TILE.TREE]:  0x1e5010,
};

// Building colours map matches BUILDING_TYPES
const BUILDING_COLOR = {
  TOWN_HALL:   0xCD853F,
  ARENA:       0xCC2222,
  SHOP:        0x228B22,
  INN:         0x8B4513,
  BLACKSMITH:  0x555555,
  GUILD:       0x4169E1,
  QUEST_BOARD: 0x8B6914,
  RUINS:       0x666655,
  WATCHTOWER:  0x8B7355,
};

const NPC_TYPES = ['archer', 'mage', 'merchant', 'guard', 'blacksmith', 'innkeeper', 'assassin'];
const NPC_NAMES  = ['Krato', 'Aria', 'Zeno', 'Lyra', 'Brutus', 'Selene', 'Orion', 'Phaedra'];

export default class WorldMapScene extends Phaser.Scene {
  constructor() { super('WorldMapScene'); }

  preload() {
    // Gladiator frames are loaded by PreloadScene (global load).
    // Only load NPC sprites here since they may not have been loaded yet.
    const base = 'assets/sprites';
    const dirs = ['south', 'north', 'east', 'west'];
    NPC_TYPES.forEach(npc => {
      dirs.forEach(d => this.load.image(`${npc}_${d}`, `${base}/npcs/${npc}/${d}.png`));
    });
  }

  create() {
    this._mapData = MapGenerator.generate(1337);
    const { mapW, mapH, tileSize, spawnPoint } = this._mapData;

    // Create placeholder texture for any missing sprites
    this._ensureFallbackTexture();
    const worldW = mapW * tileSize;
    const worldH = mapH * tileSize;

    // World bounds for camera + player clamping
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // Draw terrain (static — drawn once into graphics object)
    this._drawTerrain(worldW, worldH);

    // Place building sprites
    this._buildings = [];
    this._placeBuildingsAndDecorations();

    // Player
    this._createPlayer(spawnPoint.x * tileSize, spawnPoint.y * tileSize);

    // Camera follows player
    this.cameras.main.startFollow(this._player, true, 0.08, 0.08);

    // Input
    this._keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up2:   Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2:Phaser.Input.Keyboard.KeyCodes.RIGHT,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
    });

    // Interaction prompt (fixed to camera)
    this._promptText = this.add.text(0, 0, '', {
      fontSize: '13px', color: '#FFD700',
      fontFamily: 'Georgia, serif',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: 'rgba(0,0,0,0.65)',
      padding: { x: 8, y: 5 },
    }).setScrollFactor(0).setDepth(100).setVisible(false);

    // Zone label (fixed top-center)
    this._zoneLabel = this.add.text(
      this.scale.width / 2, 54, 'WORLD MAP', {
        fontSize: '16px', color: '#FFD700',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }
    ).setScrollFactor(0).setDepth(100).setOrigin(0.5);

    // Minimap container (fixed bottom-right)
    this._minimapTimer = 0;
    this._buildMinimap();

    // Wandering NPCs
    this._npcs = [];
    this._spawnNPCs();

    // UIScene overlay
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.bringToTop('UIScene');

    // Socket — join world room
    SocketManager.emit('chat:join', { room: 'world' });

    // E key — trigger interaction
    this._keys.interact.on('down', () => this._tryInteract());
  }

  // ── Fallback placeholder texture ────────────────────────────────────────────
  _ensureFallbackTexture() {
    if (this.textures.exists('npc_placeholder')) return;
    // Draw a simple humanoid silhouette into a RenderTexture
    const rt = this.add.renderTexture(0, 0, 48, 64).setVisible(false);
    const g   = this.make.graphics({ x: 0, y: 0, add: false });
    // Body
    g.fillStyle(0x888888, 1);
    g.fillCircle(24, 10, 9);   // head
    g.fillRect(16, 20, 16, 22); // torso
    g.fillRect(10, 22, 8, 18);  // left arm
    g.fillRect(30, 22, 8, 18);  // right arm
    g.fillRect(15, 42, 8, 18);  // left leg
    g.fillRect(25, 42, 8, 18);  // right leg
    rt.draw(g, 0, 0);
    rt.saveTexture('npc_placeholder');
    g.destroy();
    rt.destroy();
  }

  // ── Terrain rendering ───────────────────────────────────────────────────────
  _drawTerrain(worldW, worldH) {
    const { tiles, mapW, mapH, tileSize } = this._mapData;

    const gfx = this.add.graphics();
    gfx.setDepth(0);

    // Group tiles by color for fewer fillStyle calls
    const groups = {};
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const t = tiles[y * mapW + x];
        const c = TILE_COLORS[t] ?? TILE_COLORS[TILE.GRASS];
        if (!groups[c]) groups[c] = [];
        groups[c].push({ x, y });
      }
    }

    Object.entries(groups).forEach(([color, cells]) => {
      gfx.fillStyle(parseInt(color), 1);
      cells.forEach(({ x, y }) => {
        gfx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      });
    });

    // Grid lines (subtle, only on non-water)
    gfx.lineStyle(1, 0x000000, 0.08);
    for (let x = 0; x <= mapW; x++) gfx.lineBetween(x * tileSize, 0, x * tileSize, worldH);
    for (let y = 0; y <= mapH; y++) gfx.lineBetween(0, y * tileSize, worldW, y * tileSize);
  }

  // ── Buildings & decorations ─────────────────────────────────────────────────
  _placeBuildingsAndDecorations() {
    const { buildings, decorations, tileSize } = this._mapData;

    // Decorations first (depth 1)
    decorations.forEach(dec => {
      const wx = dec.x * tileSize + tileSize / 2;
      const wy = dec.y * tileSize + tileSize / 2;
      const gfx = this.add.graphics().setDepth(1);
      if (dec.type === 'tree') {
        gfx.fillStyle(0x1a4a0a, 0.9);
        gfx.fillCircle(wx, wy - 6, 10);
        gfx.fillStyle(0x3a2010, 1);
        gfx.fillRect(wx - 2, wy + 2, 4, 8);
      } else {
        gfx.fillStyle(0x888888, 0.8);
        gfx.fillEllipse(wx, wy, 12, 8);
      }
    });

    // Buildings (depth 2)
    buildings.forEach(b => {
      const wx = b.tileX * tileSize;
      const wy = b.tileY * tileSize;
      const bw = 64, bh = 56;

      const gfx = this.add.graphics().setDepth(2);
      const col = BUILDING_COLOR[b.type] ?? 0x888888;

      // Shadow
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillRect(wx - bw / 2 + 4, wy - bh / 2 + 4, bw, bh);

      // Main body
      gfx.fillStyle(col, 1);
      gfx.fillRect(wx - bw / 2, wy - bh / 2, bw, bh);

      // Roof
      gfx.fillStyle(Phaser.Display.Color.IntegerToColor(col).darken(30).color, 1);
      gfx.fillTriangle(wx - bw / 2 - 4, wy - bh / 2, wx + bw / 2 + 4, wy - bh / 2, wx, wy - bh / 2 - 22);

      // Door
      gfx.fillStyle(0x1a0a00, 1);
      gfx.fillRect(wx - 7, wy + bh / 2 - 18, 14, 18);

      // Window
      gfx.fillStyle(0xFFDD88, 0.8);
      gfx.fillRect(wx - bw / 2 + 8, wy - 8, 12, 10);
      gfx.fillRect(wx + bw / 2 - 20, wy - 8, 12, 10);

      // Gold border for interactable buildings
      gfx.lineStyle(2, 0xFFD700, 0.5);
      gfx.strokeRect(wx - bw / 2, wy - bh / 2, bw, bh);

      // Label
      this.add.text(wx, wy + bh / 2 + 8, b.label, {
        fontSize: '10px', color: '#FFD700',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(3);

      // Store reference for interaction
      this._buildings.push({
        ...b,
        wx, wy,
        gfx,
        hitW: bw + 20, hitH: bh + 20,
      });
    });
  }

  // ── Player ──────────────────────────────────────────────────────────────────
  _createPlayer(worldX, worldY) {
    const cls     = GameStateManager.getClass?.() ?? 'warrior';
    const startTex = cls === 'warrior' && this.textures.exists('gladiator_rot_south')
      ? 'gladiator_rot_south'
      : (this.textures.exists('npc_placeholder') ? 'npc_placeholder' : 'hero_warrior');

    this._player = this.physics.add.sprite(worldX, worldY, startTex)
      .setDepth(5)
      .setCollideWorldBounds(true)
      .setScale(1.1);

    this._playerDir     = 'south';
    this._playerMoving  = false;
    this._playerClass   = cls;

    // Start breathing idle if gladiator
    if (cls === 'warrior' && this.anims.exists('gladiator_idle')) {
      this._player.play('gladiator_idle');
    }

    // Name tag above player
    const name = GameStateManager.getName?.() ?? 'Hero';
    const lvl  = GameStateManager.getLevel?.() ?? 1;
    this._nameTag = this.add.text(0, 0, `${name}  Lv.${lvl}`, {
      fontSize: '11px', color: '#FFD700',
      fontFamily: 'Georgia, serif',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(6);

    // Highlight ring (shown when near building)
    this._highlight = this.add.graphics().setDepth(4);
  }

  _updatePlayerSprite(dx, dy, delta) {
    // 8-directional detection
    let dir = this._playerDir;
    const L = dx < 0, R = dx > 0, U = dy < 0, D = dy > 0;
    if      (L && U) dir = 'north-west';
    else if (R && U) dir = 'north-east';
    else if (L && D) dir = 'south-west';
    else if (R && D) dir = 'south-east';
    else if (L)      dir = 'west';
    else if (R)      dir = 'east';
    else if (U)      dir = 'north';
    else if (D)      dir = 'south';

    const moving = dx !== 0 || dy !== 0;
    const cls    = this._playerClass;

    if (cls === 'warrior') {
      if (moving) {
        if (!this._playerMoving || dir !== this._playerDir) {
          const animKey = `gladiator_run_${dir}`;
          if (this.anims.exists(animKey)) {
            this._player.play(animKey, true);
          }
        }
      } else {
        if (this._playerMoving) {
          // Transitioned to stopped — play idle with direction rotation sprite
          const rotKey = `gladiator_rot_${this._playerDir}`;
          if (this.textures.exists(rotKey)) this._player.setTexture(rotKey);
          if (this.anims.exists('gladiator_idle')) this._player.play('gladiator_idle', true);
        }
      }
    } else {
      // Placeholder sprites — simple directional swap
      const simpleDir = dir.includes('-') ? dir.split('-')[0] : dir; // reduce to 4-dir
      const tex = `${cls}_${simpleDir}`;
      if (this.textures.exists(tex)) this._player.setTexture(tex);
    }

    this._playerDir    = dir;
    this._playerMoving = moving;
  }

  // ── Wandering NPCs ──────────────────────────────────────────────────────────
  _spawnNPCs() {
    const { tileSize, mapW, mapH } = this._mapData;

    NPC_TYPES.slice(0, 8).forEach((npcType, i) => {
      // Spawn near town center with scatter
      const cx = this._mapData.spawnPoint.x;
      const cy = this._mapData.spawnPoint.y;
      const x  = (cx + (-5 + Math.floor(Math.random() * 30))) * tileSize;
      const y  = (cy + (-5 + Math.floor(Math.random() * 30))) * tileSize;

      const startTex = this.textures.exists(`${npcType}_south`) ? `${npcType}_south` : 'npc_placeholder';

      const npc = this.physics.add.sprite(x, y, startTex)
        .setDepth(5)
        .setCollideWorldBounds(true)
        .setScale(1.1);

      const tag = this.add.text(0, 0, NPC_NAMES[i], {
        fontSize: '10px', color: '#CCCCCC',
        fontFamily: 'Georgia, serif',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setDepth(6);

      npc._wanderDx = (Math.random() * 2 - 1) * 45;
      npc._wanderDy = (Math.random() * 2 - 1) * 45;
      npc._npcType  = npcType;
      npc._npcDir   = 'south';

      this._npcs.push({ sprite: npc, tag });

      // Direction change timer
      this.time.addEvent({
        delay:    2000 + Math.random() * 2500,
        loop:     true,
        callback: () => {
          // Occasionally stop
          const stop = Math.random() < 0.25;
          npc._wanderDx = stop ? 0 : (Math.random() * 2 - 1) * 45;
          npc._wanderDy = stop ? 0 : (Math.random() * 2 - 1) * 45;
        },
      });
    });
  }

  _updateNPCSprite(npc) {
    const { sprite } = npc;
    const dx = sprite._wanderDx ?? 0;
    const dy = sprite._wanderDy ?? 0;
    if (dx === 0 && dy === 0) return;

    let dir = sprite._npcDir;
    if      (Math.abs(dx) > Math.abs(dy)) dir = dx < 0 ? 'west' : 'east';
    else                                  dir = dy < 0 ? 'north' : 'south';

    if (dir !== sprite._npcDir) {
      sprite._npcDir = dir;
      const tex = `${sprite._npcType}_${dir}`;
      if (this.textures.exists(tex)) sprite.setTexture(tex);
    }
  }

  // ── Minimap ─────────────────────────────────────────────────────────────────
  _buildMinimap() {
    const mmW = 160, mmH = 120;
    const sw  = this.scale.width;
    const sh  = this.scale.height;
    const mmX = sw - mmW - 12;
    const mmY = sh - mmH - 12;

    // Background
    const bg = this.add.graphics().setScrollFactor(0).setDepth(90);
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
    bg.lineStyle(1, 0x8B6914, 0.8);
    bg.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);

    // Terrain thumbnail
    const { tiles, mapW, mapH } = this._mapData;
    const tgfx = this.add.graphics().setScrollFactor(0).setDepth(91);
    const scaleX = mmW / mapW;
    const scaleY = mmH / mapH;

    // Draw terrain at minimap scale (group by color)
    const groups = {};
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const t = tiles[y * mapW + x];
        const c = TILE_COLORS[t] ?? TILE_COLORS[TILE.GRASS];
        if (!groups[c]) groups[c] = [];
        groups[c].push({ x, y });
      }
    }
    Object.entries(groups).forEach(([color, cells]) => {
      tgfx.fillStyle(parseInt(color), 1);
      cells.forEach(({ x, y }) => {
        tgfx.fillRect(mmX + x * scaleX, mmY + y * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
      });
    });

    // Building dots on minimap
    this._mapData.buildings.forEach(b => {
      const col = BUILDING_COLOR[b.type] ?? 0xFFFFFF;
      tgfx.fillStyle(col, 1);
      tgfx.fillRect(
        mmX + b.tileX * scaleX - 2,
        mmY + b.tileY * scaleY - 2,
        5, 5
      );
    });

    // Player dot (updated in update())
    this._minimapDot = this.add.graphics().setScrollFactor(0).setDepth(93);
    this._mmX = mmX;
    this._mmY = mmY;
    this._mmScaleX = scaleX;
    this._mmScaleY = scaleY;

    // Label
    this.add.text(mmX + mmW / 2, mmY - 12, 'MAP', {
      fontSize: '9px', color: '#8B6914',
      fontFamily: 'Georgia, serif', letterSpacing: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(92);
  }

  _updateMinimap() {
    const { tileSize } = this._mapData;
    const px = this._player.x / tileSize;
    const py = this._player.y / tileSize;

    this._minimapDot.clear();
    this._minimapDot.fillStyle(0xFFFFFF, 1);
    this._minimapDot.fillCircle(
      this._mmX + px * this._mmScaleX,
      this._mmY + py * this._mmScaleY,
      3
    );
  }

  // ── Interaction ─────────────────────────────────────────────────────────────
  _tryInteract() {
    const nearest = this._getNearestBuilding();
    if (nearest && nearest.dist <= INTERACT_R) {
      this._enterBuilding(nearest);
    }
  }

  _getNearestBuilding() {
    let best = null, bestDist = Infinity;
    this._buildings.forEach(b => {
      const dx = this._player.x - b.wx;
      const dy = this._player.y - b.wy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; best = { ...b, dist }; }
    });
    return best;
  }

  _enterBuilding(building) {
    if (building.scene) {
      SocketManager.emit('chat:leave', { room: 'world' });
      this.scene.start(building.scene);
    } else {
      // Show "coming soon" tooltip briefly
      this._showPrompt(`${building.label} — Coming soon!`, 2000);
    }
  }

  _showPrompt(text, duration) {
    const sw = this.scale.width;
    const sh = this.scale.height;
    this._promptText
      .setText(text)
      .setPosition(sw / 2, sh - 80)
      .setOrigin(0.5)
      .setVisible(true);

    if (this._promptHideTimer) this._promptHideTimer.remove();
    if (duration) {
      this._promptHideTimer = this.time.delayedCall(duration, () => {
        this._promptText.setVisible(false);
      });
    }
  }

  // ── Update loop ─────────────────────────────────────────────────────────────
  update(time, delta) {
    const keys = this._keys;
    const dt   = delta / 1000;

    // ── Player movement ──
    let dx = 0, dy = 0;
    if (keys.left.isDown  || keys.left2.isDown)  dx -= 1;
    if (keys.right.isDown || keys.right2.isDown) dx += 1;
    if (keys.up.isDown    || keys.up2.isDown)    dy -= 1;
    if (keys.down.isDown  || keys.down2.isDown)  dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      this._player.setVelocity((dx / len) * PLAYER_SPD, (dy / len) * PLAYER_SPD);
    } else {
      this._player.setVelocity(0, 0);
    }

    // Directional sprite swap + walk animation
    this._updatePlayerSprite(dx, dy, delta);

    // Name tag follows player
    this._nameTag.setPosition(this._player.x, this._player.y - 40);

    // ── NPC wandering ──
    this._npcs.forEach(npc => {
      npc.sprite.setVelocity(npc.sprite._wanderDx ?? 0, npc.sprite._wanderDy ?? 0);
      npc.tag.setPosition(npc.sprite.x, npc.sprite.y - 38);
      this._updateNPCSprite(npc);
    });

    // ── Interaction proximity ──
    this._highlight.clear();
    const nearest = this._getNearestBuilding();
    if (nearest && nearest.dist <= INTERACT_R) {
      // Draw glow ring around building
      this._highlight.lineStyle(3, 0xFFD700, 0.8 + 0.2 * Math.sin(time * 0.004));
      this._highlight.strokeRect(
        nearest.wx - nearest.hitW / 2,
        nearest.wy - nearest.hitH / 2,
        nearest.hitW,
        nearest.hitH
      );
      this._showPrompt(`[E]  Enter ${nearest.label}`);
    } else {
      this._promptText.setVisible(false);
    }

    // ── Minimap (every 100ms) ──
    this._minimapTimer += delta;
    if (this._minimapTimer > 100) {
      this._minimapTimer = 0;
      this._updateMinimap();
    }
  }

  shutdown() {
    SocketManager.emit('chat:leave', { room: 'world' });
    this._npcs = [];
  }
}
