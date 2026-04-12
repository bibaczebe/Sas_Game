import Phaser from 'phaser';
import GameStateManager from '../managers/GameStateManager.js';
import SocketManager    from '../managers/SocketManager.js';
import { COLORS }       from '../config/Constants.js';

// Chapter 11.1 — Hub buildings
const BUILDINGS = [
  { label: 'Arena',       x: 940,  y: 370, scene: 'ArenaScene',   desc: 'Turn-based combat for glory and gold',      color: 0xCC2222, icon: '⚔' },
  { label: 'Tavern',      x: 340,  y: 400, scene: 'TavernScene',  desc: 'Send on expeditions — collect rewards later',color: 0x8B4513, icon: '🍺' },
  { label: 'Armory',      x: 580,  y: 360, scene: null,           desc: 'Buy and sell weapons & armor',              color: 0x444455, icon: '🛡' },
  { label: 'Forge',       x: 740,  y: 410, scene: null,           desc: 'Upgrade your equipment (+1 to +5)',         color: 0x885500, icon: '🔨' },
  { label: 'Quest Board', x: 1100, y: 390, scene: null,           desc: 'Story quests from local NPCs',              color: 0x228B22, icon: '📜' },
  { label: 'Guild Hall',  x: 180,  y: 370, scene: null,           desc: 'Join a guild — wars, territory, power',     color: 0x4169E1, icon: '🏰' },
];

export default class TownScene extends Phaser.Scene {
  constructor() { super('TownScene'); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._drawEnvironment(w, h);
    this._drawNPCs(w, h);
    this._drawPlayerCharacter(w, h);
    this._drawHUD(w, h);
    this._drawExitBtn(w, h);

    // Join town chat room
    SocketManager.emit('chat:join', { room: 'town' });

    // Start persistent UI overlay (chat + global HUD)
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // Bring UI on top
    this.scene.bringToTop('UIScene');
  }

  _drawExitBtn(w, h) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0d0500, 0.85);
    gfx.fillRect(w - 160, h - 46, 148, 34);
    gfx.lineStyle(1, 0x8B6914, 0.8);
    gfx.strokeRect(w - 160, h - 46, 148, 34);

    const btn = this.add.text(w - 86, h - 29, '🗺  World Map', {
      fontSize: '14px', color: '#FFD700',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#FFF0A0'));
    btn.on('pointerout',  () => btn.setColor('#FFD700'));
    btn.on('pointerup', () => {
      const lvl = GameStateManager.getLevel?.() ?? 1;
      if (lvl < 15) {
        this._showTooltip(w - 86, h - 60, `🔒 World Map unlocks at Level 15 (you are ${lvl})`);
        this.time.delayedCall(2500, () => this._hideTooltip());
      } else {
        this.scene.start('WorldMapScene');
      }
    });
  }

  shutdown() {
    SocketManager.emit('chat:leave', { room: 'town' });
  }

  // ── Environment ─────────────────────────────────────────────────────────────
  _drawEnvironment(w, h) {
    // Sky layers
    this.add.rectangle(w / 2, h * 0.28, w, h * 0.56, 0x0a1f4a);
    this.add.rectangle(w / 2, h * 0.58, w, h * 0.16, 0x1a2a5a);

    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h * 0.44);
      const br = Phaser.Math.FloatBetween(0.3, 1);
      this.add.rectangle(sx, sy, 1.5, 1.5, 0xffffff, br);
    }

    // Moon
    this.add.circle(160, 80, 36, 0xFFF8DC, 0.9);
    this.add.circle(174, 72, 30, 0x0a1f4a, 0.85); // crescent mask

    // Ground
    this.add.rectangle(w / 2, h * 0.78, w, h * 0.44, 0x2a1a08);
    this.add.rectangle(w / 2, h * 0.58, w, 14, 0x3d2a10); // ground edge

    // Cobblestone pattern on path
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a0d00, 0.4);
    for (let xi = 0; xi < w; xi += 40) {
      for (let yi = Math.floor(h * 0.58); yi < h; yi += 20) {
        gfx.strokeRect(xi + ((yi % 40 === 0) ? 20 : 0), yi, 40, 20);
      }
    }

    // Background buildings
    this._drawBuilding(gfx, 60,  h * 0.32, 140, 220, 0x1a1200);
    this._drawBuilding(gfx, 220, h * 0.38, 110, 180, 0x160f00);
    this._drawBuilding(gfx, 980, h * 0.30, 180, 240, 0x1a1200);
    this._drawBuilding(gfx, 1140,h * 0.36, 120, 180, 0x160f00);

    // Foreground torch lights
    this._drawTorch(gfx, 380, h * 0.58);
    this._drawTorch(gfx, 760, h * 0.58);
    this._drawTorch(gfx, 1060,h * 0.58);

    // Town sign
    const signGfx = this.add.graphics();
    signGfx.fillStyle(0x5C2E0A, 1);
    signGfx.fillRect(w / 2 - 120, 34, 240, 50);
    signGfx.lineStyle(2, 0x8B6914, 1);
    signGfx.strokeRect(w / 2 - 120, 34, 240, 50);
    this.add.text(w / 2, 59, 'ARENA TOWN', {
      fontSize: '22px', color: '#FFD700',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  _drawBuilding(gfx, x, y, w, h) {
    gfx.fillStyle(0x1a1200, 1);
    gfx.fillRect(x, y, w, h);
    // Roof
    gfx.fillStyle(0x0d0900, 1);
    gfx.fillTriangle(x - 10, y, x + w / 2, y - 40, x + w + 10, y);
    // Windows
    gfx.fillStyle(0xCC8800, 0.4);
    for (let wi = 0; wi < 2; wi++) {
      for (let hi = 0; hi < 3; hi++) {
        gfx.fillRect(x + 16 + wi * 50, y + 20 + hi * 50, 22, 28);
      }
    }
  }

  _drawTorch(gfx, x, y) {
    gfx.fillStyle(0x4a3000, 1);
    gfx.fillRect(x - 2, y - 30, 4, 30);
    // Flame glow
    this.add.circle(x, y - 36, 10, 0xFF6600, 0.6);
    this.add.circle(x, y - 38,  6, 0xFFCC00, 0.8);
  }

  // ── Buildings hub — Chapter 11.1 ────────────────────────────────────────────
  _drawNPCs(w, h) {
    BUILDINGS.forEach(b => {
      const bw = 90, bh = 80;
      const gfx = this.add.graphics().setDepth(5);

      // Shadow
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillRect(b.x - bw/2 + 4, b.y - bh/2 + 4, bw, bh);

      // Building body
      gfx.fillStyle(b.color, 1);
      gfx.fillRect(b.x - bw/2, b.y - bh/2, bw, bh);

      // Roof
      const roofColor = Phaser.Display.Color.IntegerToColor(b.color).darken(20).color;
      gfx.fillStyle(roofColor, 1);
      gfx.fillTriangle(b.x - bw/2 - 6, b.y - bh/2, b.x, b.y - bh/2 - 28, b.x + bw/2 + 6, b.y - bh/2);

      // Door
      gfx.fillStyle(0x0d0500, 1);
      gfx.fillRect(b.x - 9, b.y + bh/2 - 22, 18, 22);

      // Active: gold border
      if (b.scene) {
        gfx.lineStyle(2, 0xFFD700, 0.7);
        gfx.strokeRect(b.x - bw/2, b.y - bh/2, bw, bh);
      } else {
        gfx.lineStyle(1, 0x3a2a00, 0.5);
        gfx.strokeRect(b.x - bw/2, b.y - bh/2, bw, bh);
      }

      // Icon emoji
      const iconTxt = this.add.text(b.x, b.y - 6, b.icon, { fontSize: '26px' })
        .setOrigin(0.5).setDepth(6);

      // Label
      this.add.text(b.x, b.y + bh/2 + 10, b.label, {
        fontSize: '12px', color: b.scene ? '#FFD700' : '#666',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(6);

      // Hitbox
      const hitbox = this.add.rectangle(b.x, b.y, bw + 20, bh + 20, 0x000000, 0)
        .setDepth(7)
        .setInteractive({ useHandCursor: !!b.scene });

      if (b.scene) {
        hitbox.on('pointerover', () => {
          gfx.clear();
          gfx.fillStyle(0x000000, 0.3); gfx.fillRect(b.x - bw/2 + 4, b.y - bh/2 + 4, bw, bh);
          gfx.fillStyle(b.color, 1);    gfx.fillRect(b.x - bw/2, b.y - bh/2, bw, bh);
          gfx.fillStyle(roofColor, 1);  gfx.fillTriangle(b.x - bw/2 - 6, b.y - bh/2, b.x, b.y - bh/2 - 28, b.x + bw/2 + 6, b.y - bh/2);
          gfx.fillStyle(0x0d0500, 1);   gfx.fillRect(b.x - 9, b.y + bh/2 - 22, 18, 22);
          gfx.lineStyle(3, 0xFFFFAA, 1); gfx.strokeRect(b.x - bw/2, b.y - bh/2, bw, bh);
          this._showTooltip(b.x, b.y - bh/2 - 40, b.desc);
        });
        hitbox.on('pointerout', () => {
          gfx.clear();
          gfx.fillStyle(0x000000, 0.3); gfx.fillRect(b.x - bw/2 + 4, b.y - bh/2 + 4, bw, bh);
          gfx.fillStyle(b.color, 1);    gfx.fillRect(b.x - bw/2, b.y - bh/2, bw, bh);
          gfx.fillStyle(roofColor, 1);  gfx.fillTriangle(b.x - bw/2 - 6, b.y - bh/2, b.x, b.y - bh/2 - 28, b.x + bw/2 + 6, b.y - bh/2);
          gfx.fillStyle(0x0d0500, 1);   gfx.fillRect(b.x - 9, b.y + bh/2 - 22, 18, 22);
          gfx.lineStyle(2, 0xFFD700, 0.7); gfx.strokeRect(b.x - bw/2, b.y - bh/2, bw, bh);
          this._hideTooltip();
        });
        hitbox.on('pointerup', () => {
          this._hideTooltip();
          this.scene.start(b.scene);
        });
        // Subtle float
        this.tweens.add({ targets: iconTxt, y: iconTxt.y - 5, duration: 1800 + Math.random()*600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        iconTxt.setAlpha(0.4);
        hitbox.on('pointerover', () => this._showTooltip(b.x, b.y - bh/2 - 40, '🔒 ' + b.desc));
        hitbox.on('pointerout',  () => this._hideTooltip());
      }
    });
  }

  _showTooltip(x, y, text) {
    this._hideTooltip();
    this._tooltip = this.add.text(x, y, text, {
      fontSize: '13px', color: '#FFD700', fontFamily: 'Georgia, serif',
      backgroundColor: '#0d0500', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(100);
  }

  _hideTooltip() {
    this._tooltip?.destroy();
    this._tooltip = null;
  }

  // ── Player character ────────────────────────────────────────────────────────
  _drawPlayerCharacter(w, h) {
    const cls = GameStateManager.getClass();
    const isGladiator = cls === 'warrior' && this.textures.exists('gladiator_rot_south');
    const spriteKey   = isGladiator ? 'gladiator_idle_0' : `hero_${cls}`;

    this._playerSprite = isGladiator
      ? this.add.sprite(w / 2, h * 0.62, spriteKey).setScale(1.6).setDepth(10)
      : this.add.image(w / 2, h * 0.62, spriteKey).setScale(1.4).setDepth(10);

    if (isGladiator && this.anims.exists('gladiator_idle')) {
      this._playerSprite.play('gladiator_idle');
    }

    // Name tag above character
    const name = GameStateManager.getName();
    const lvl  = GameStateManager.getLevel();
    this.add.text(w / 2, h * 0.62 - 80, `${name}  Lv.${lvl}`, {
      fontSize: '16px', color: '#FFD700', fontFamily: 'Georgia, serif',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Subtle idle bob
    this.tweens.add({
      targets:  this._playerSprite,
      y:        h * 0.62 - 5,
      duration: 2000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────
  _drawHUD(w, h) {
    // Gold display (top-right corner)
    this._goldText = this.add.text(w - 20, 16, `⚜ ${GameStateManager.getGold()} gold`, {
      fontSize: '16px', color: '#FFD700', fontFamily: 'Georgia, serif',
    }).setOrigin(1, 0).setDepth(20);
  }
}
