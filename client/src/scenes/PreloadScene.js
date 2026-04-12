import Phaser from 'phaser';
import ApiManager        from '../managers/ApiManager.js';
import GameStateManager  from '../managers/GameStateManager.js';
import SocketManager     from '../managers/SocketManager.js';

// ── Gladiator sprite manifest ────────────────────────────────────────────────
const G_BASE  = '/assets/sprites/gladiator';
const G_DIRS8 = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

// Animation definitions parsed from metadata.json folder names
const G_ANIMS = [
  { id: 'Running-323d1e8f',         key: 'run',       dirs: G_DIRS8, frames: 6 },
  { id: 'Breathing_Idle-f9cdeec9',  key: 'idle',      dirs: ['south'],   frames: 4 },
  { id: 'Fight_Stance_Idle-6680bb6d', key: 'fight_idle', dirs: ['south'], frames: 8 },
  { id: 'Lead_Jab-7e2f10a5',        key: 'jab',       dirs: ['east'],    frames: 3 },
  { id: 'Cross_Punch-f0f0a256',     key: 'punch',     dirs: ['east'],    frames: 6 },
  { id: 'Surprise_Uppercut-48bac3a5', key: 'uppercut', dirs: ['east'],   frames: 7 },
  { id: 'Taking_Punch-c61b4a70',    key: 'hurt',      dirs: ['east'],    frames: 6 },
  { id: 'Falling_Back_Death-cedf9743', key: 'death',  dirs: ['east'],    frames: 7 },
  { id: 'Picking_Up-92bb4f43',      key: 'pickup',    dirs: G_DIRS8,     frames: 5 },
];

// Frame-rate per animation
const G_FPS = {
  run:        10,
  idle:       4,
  fight_idle: 6,
  jab:        14,
  punch:      12,
  uppercut:   12,
  hurt:       14,
  death:      8,
  pickup:     8,
};

export default class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x060308);

    this.load.on('loaderror', () => {});
    this.load.image('baner',    '/assets/bg/baner.png');
    this.load.image('login_bg', '/assets/bg/login_bg.jpg');

    // Progress bar
    const barBg = this.add.rectangle(w / 2, h / 2 + 80, 420, 8, 0x1a0d00);
    barBg.setStrokeStyle(1, 0x3d2510);
    const bar = this.add.rectangle(w / 2 - 210, h / 2 + 80, 0, 8, 0xFFD700).setOrigin(0, 0.5);

    const loadingText = this.add.text(w / 2, h / 2 + 100, 'Loading...', {
      fontSize: '12px', color: '#5C3A1A',
      fontFamily: 'Georgia, serif', letterSpacing: 2,
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      bar.setSize(420 * v, 8);
      loadingText.setText(v < 1 ? 'Loading...' : 'Ready');
    });

    // Load gladiator sprite frames
    this._loadGladiatorFrames();

    // Generate placeholder textures for other classes + enemies
    this._generateTextures();
  }

  // ── Gladiator frame loading ─────────────────────────────────────────────────
  _loadGladiatorFrames() {
    // Static rotations (8 directions)
    G_DIRS8.forEach(d =>
      this.load.image(`gladiator_rot_${d}`, `${G_BASE}/rotations/${d}.png`)
    );

    // Animation frames
    G_ANIMS.forEach(({ id, key, dirs, frames }) => {
      dirs.forEach(d => {
        for (let i = 0; i < frames; i++) {
          const pad = String(i).padStart(3, '0');
          this.load.image(
            `gladiator_${key}_${d}_${i}`,
            `${G_BASE}/animations/${id}/${d}/frame_${pad}.png`
          );
        }
      });
    });
  }

  // ── Placeholder textures for missing sprites ────────────────────────────────
  _generateTextures() {
    // Other classes (no real sprites yet)
    const classColors = { archer: 0x228B22, mage: 0x4169E1, paladin: 0xCC8800, assassin: 0x6A0DAD };
    Object.entries(classColors).forEach(([cls, color]) => {
      this._makeCharSprite(`hero_${cls}`, color);
    });

    // Enemies
    this._makeCharSprite('enemy_goblin',   0x556B2F);
    this._makeCharSprite('enemy_skeleton', 0xBBBBBB);
    this._makeCharSprite('enemy_orc',      0x8B4513);
    this._makeCharSprite('enemy_knight',   0x444466);

    // NPC placeholder
    this._makeCharSprite('npc_placeholder', 0x4a3a2a);

    this._makeIcon('icon_arena',  0xCC2222, '⚔');
    this._makeIcon('icon_quests', 0x8B6914, '📜');
    this._makeIcon('icon_shop',   0x228B22, '🛒');
    this._makeIcon('icon_inn',    0x8B4513, '🏠');
  }

  _makeCharSprite(key, bodyColor) {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(bodyColor, 1);
    gfx.fillRect(20, 30, 24, 40);
    gfx.fillCircle(32, 22, 14);
    gfx.fillRect(6, 32, 14, 8);
    gfx.fillRect(44, 32, 14, 8);
    gfx.fillRect(20, 68, 10, 28);
    gfx.fillRect(34, 68, 10, 28);
    gfx.generateTexture(key, 64, 96);
    gfx.destroy();
  }

  _makeIcon(key, color) {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(color, 1);
    gfx.fillRect(0, 0, 72, 72);
    gfx.lineStyle(2, 0xFFD700, 1);
    gfx.strokeRect(0, 0, 72, 72);
    gfx.generateTexture(key, 72, 72);
    gfx.destroy();
  }

  // ── Scene create: register animations + continue ────────────────────────────
  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.textures.exists('baner')) {
      const img   = this.add.image(w / 2, h / 2 - 20, 'baner');
      const scale = Math.min(w * 0.65 / img.width, h * 0.35 / img.height);
      img.setScale(scale);
    } else {
      this.add.text(w / 2, h / 2 - 20, 'SWORD AND SANDALS', {
        fontSize: '48px', color: '#FFD700',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
        stroke: '#3a1a00', strokeThickness: 4,
      }).setOrigin(0.5);
      this.add.text(w / 2, h / 2 + 35, 'O  N  L  I  N  E', {
        fontSize: '18px', color: '#9B7A30', fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);
    }

    // Register Phaser animations for gladiator
    this._createGladiatorAnims();

    this._done = false;

    this.time.delayedCall(8000, () => {
      if (!this._done) {
        console.warn('[PreloadScene] Failsafe timeout — forcing scene transition');
        this._goNext();
      }
    });

    this._loadAndContinue();
  }

  // ── Register Phaser animation definitions ───────────────────────────────────
  _createGladiatorAnims() {
    G_ANIMS.forEach(({ key, dirs, frames }) => {
      const fps    = G_FPS[key] ?? 10;
      const repeat = ['run', 'idle', 'fight_idle'].includes(key) ? -1 : 0;

      dirs.forEach(d => {
        const animKey = dirs.length === 1 ? `gladiator_${key}` : `gladiator_${key}_${d}`;

        // Skip if already registered (hot-reload safety)
        if (this.anims.exists(animKey)) return;

        this.anims.create({
          key:       animKey,
          frames:    Array.from({ length: frames }, (_, i) => ({
            key: `gladiator_${key}_${d}_${i}`,
          })),
          frameRate: fps,
          repeat,
        });
      });
    });

    console.log('[PreloadScene] Gladiator animations registered:', this.anims.anims.size);
  }

  async _loadAndContinue() {
    try {
      const snapshot = await Promise.race([
        ApiManager.getSnapshot(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
      ]);
      GameStateManager.setSnapshot(snapshot);
    } catch {
      // 404 = no character yet, timeout = server slow — both fine
    }

    this._goNext();
  }

  _goNext() {
    if (this._done) return;
    this._done = true;

    try {
      SocketManager.connect();
    } catch (e) {
      console.warn('[PreloadScene] Socket connect failed:', e);
    }

    const next = GameStateManager.hasCharacter() ? 'WorldMapScene' : 'CharacterCreateScene';
    console.log('[PreloadScene] → starting', next);
    this.scene.start(next);
  }
}
