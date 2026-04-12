import Phaser from 'phaser';
import GameStateManager from '../managers/GameStateManager.js';
import StatBar          from '../ui/StatBar.js';
import Button           from '../ui/Button.js';
import Panel            from '../ui/Panel.js';
import { ACTION_TYPES, ACTION_ENERGY_COST, ACTION_LABELS, COLORS } from '../config/Constants.js';

// Actions shown in the arena bar (SPECIAL hidden until unlocked)
const ARENA_ACTIONS = [
  ACTION_TYPES.MARCH,
  ACTION_TYPES.QUICK_ATTACK,
  ACTION_TYPES.NORMAL_ATTACK,
  ACTION_TYPES.POWER_ATTACK,
  ACTION_TYPES.CHARGE,
  ACTION_TYPES.TAUNT,
  ACTION_TYPES.DEFEND,
];

const ENEMY_DEFS = [
  { name: 'Goblin Scout',   sprite: 'enemy_goblin',   level: 1, hp: 60,  atk: 8,  def: 2  },
  { name: 'Skeleton Guard', sprite: 'enemy_skeleton',  level: 2, hp: 90,  atk: 12, def: 4  },
  { name: 'Orc Warrior',    sprite: 'enemy_orc',       level: 3, hp: 130, atk: 16, def: 6  },
  { name: 'Dark Knight',    sprite: 'enemy_knight',    level: 5, hp: 200, atk: 22, def: 10 },
];

export default class ArenaScene extends Phaser.Scene {
  constructor() { super('ArenaScene'); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._combatActive = false;
    this._playerTurn   = true;
    this._enemy        = { ...ENEMY_DEFS[0] };
    this._enemy.currentHP = this._enemy.hp;
    this._playerPos    = 1;
    this._enemyPos     = 10;

    this._drawEnvironment(w, h);
    this._drawPositionBar(w, h);
    this._drawPlayerPanel(w, h);
    this._drawEnemyPanel(w, h);
    this._drawCombatLog(w, h);
    this._drawActionBar(w, h);
    this._drawBackButton(w, h);
    this._drawEnemySelect(w, h);

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.scene.bringToTop('UIScene');

    this._addLog('⚔ Welcome to the Arena! Select an opponent to begin.', '#FFD700');
  }

  // ── Arena environment ────────────────────────────────────────────────────────
  _drawEnvironment(w, h) {
    this.add.rectangle(w / 2, h / 2, w, h, 0x3d2800);
    this.add.ellipse(w / 2, h * 0.58, 900, 120, 0x5C3A10, 0.6);

    const gfx = this.add.graphics();
    gfx.fillStyle(0x1a1200, 1);
    gfx.fillRect(0, 0, w, h * 0.22);
    gfx.lineStyle(1, 0x0d0900, 0.7);
    for (let bx = 0; bx < w; bx += 60) {
      for (let by = 0; by < h * 0.22; by += 30) {
        gfx.strokeRect(bx + (by % 60 < 30 ? 0 : 30), by, 60, 30);
      }
    }

    [220, w - 220].forEach(tx => {
      this.add.circle(tx, h * 0.1, 14, 0xFF6600, 0.7);
      this.add.circle(tx, h * 0.1,  8, 0xFFCC00, 0.9);
      this.tweens.add({
        targets: this.add.circle(tx, h * 0.1 - 6, 5, 0xFFFFAA, 0.8),
        scaleX: 1.4, scaleY: 0.6,
        duration: 120 + Math.random() * 80,
        yoyo: true, repeat: -1,
      });
    });

    for (let i = 0; i < 40; i++) {
      this.add.circle(
        Phaser.Math.Between(20, w - 20),
        Phaser.Math.Between(14, h * 0.18),
        Phaser.Math.Between(5, 9), 0x080500, 0.8
      );
    }

    this.add.text(w / 2, h * 0.04, 'THE ARENA', {
      fontSize: '28px', color: '#FFD700',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ── Position bar (1–10 grid) ────────────────────────────────────────────────
  _drawPositionBar(w, h) {
    const barY = h * 0.28;
    const barW = 600;
    const startX = (w - barW) / 2;
    const cellW  = barW / 10;

    const gfx = this.add.graphics().setDepth(5);
    gfx.lineStyle(1, 0x3a2a00, 0.6);
    for (let i = 0; i <= 10; i++) {
      gfx.lineBetween(startX + i * cellW, barY - 10, startX + i * cellW, barY + 10);
    }
    gfx.lineBetween(startX, barY, startX + barW, barY);

    this._posBarX    = startX;
    this._posBarCellW = cellW;
    this._posBarY    = barY;

    this._posPlayerDot = this.add.circle(0, 0, 8, 0x00FF88).setDepth(6);
    this._posEnemyDot  = this.add.circle(0, 0, 8, 0xFF4444).setDepth(6);
    this._posLabel     = this.add.text(w / 2, barY + 18, '', {
      fontSize: '11px', color: '#9B7A30', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setDepth(6);
    this._updatePositionBar();
  }

  _updatePositionBar() {
    const x = (pos) => this._posBarX + (pos - 0.5) * this._posBarCellW;
    this._posPlayerDot.setPosition(x(this._playerPos), this._posBarY);
    this._posEnemyDot .setPosition(x(this._enemyPos),  this._posBarY);
    const dist = Math.abs(this._playerPos - this._enemyPos);
    this._posLabel.setText(`Distance: ${dist}  |  Player: ${this._playerPos}  •  Enemy: ${this._enemyPos}`);
  }

  // ── Player panel ─────────────────────────────────────────────────────────────
  _drawPlayerPanel(w, h) {
    const px = 210, py = h * 0.50;
    new Panel(this, px, py, 360, 240, {});

    const cls = GameStateManager.getClass();
    const isGladiator = cls === 'warrior' && this.textures.exists('gladiator_fight_idle_0');
    const startTex = isGladiator ? 'gladiator_fight_idle_0' : `hero_${cls}`;

    this._playerSprite = this.add.sprite(px, py - 36, startTex)
      .setScale(isGladiator ? 1.4 : 1.6)
      .setDepth(5);

    if (isGladiator && this.anims.exists('gladiator_fight_idle')) {
      this._playerSprite.play('gladiator_fight_idle');
    }

    // Return to fight idle after any non-looping combat animation
    this._playerSprite.on('animationcomplete', (anim) => {
      if (anim.key !== 'gladiator_fight_idle' && anim.key !== 'gladiator_death') {
        if (this.anims.exists('gladiator_fight_idle')) {
          this._playerSprite.play('gladiator_fight_idle');
        }
      }
    });

    this.add.text(px, py + 40, GameStateManager.getName(), {
      fontSize: '18px', color: '#FFD700', fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(px, py + 60, `Level ${GameStateManager.getLevel()}  •  ${cls.toUpperCase()}`, {
      fontSize: '13px', color: '#9B7A30', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(px - 155, py + 76, 'HP', { fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif' });
    this._playerHPBar = new StatBar(this, px - 140, py + 82, { width: 280, height: 16, color: COLORS.HEALTH_RED });
    const hp = GameStateManager.getHP();
    this._playerHPBar.setValue(hp.current, hp.max);

    this.add.text(px - 155, py + 98, 'EN', { fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif' });
    this._playerEnBar = new StatBar(this, px - 140, py + 104, { width: 280, height: 10, color: COLORS.ENERGY_BLUE });
    const en = GameStateManager.getEnergy();
    this._playerEnBar.setValue(en.current, en.max);

    this._playerTurnIndicator = this.add.text(px, py - 108, '▼ YOUR TURN ▼', {
      fontSize: '14px', color: '#00FF88', fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);
  }

  // ── Enemy panel ──────────────────────────────────────────────────────────────
  _drawEnemyPanel(w, h) {
    const ex = w - 210, ey = h * 0.50;
    new Panel(this, ex, ey, 360, 240, {});

    this._enemySprite = this.add.image(ex, ey - 44, this._enemy.sprite).setScale(1.6);

    this._enemyNameText = this.add.text(ex, ey + 40, this._enemy.name, {
      fontSize: '18px', color: '#FF4444', fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._enemyLevelText = this.add.text(ex, ey + 60, `Level ${this._enemy.level}  •  ENEMY`, {
      fontSize: '13px', color: '#9B7A30', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(ex - 155, ey + 76, 'HP', { fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif' });
    this._enemyHPBar = new StatBar(this, ex - 140, ey + 82, { width: 280, height: 16, color: 0xAA2222 });
    this._enemyHPBar.setValue(this._enemy.currentHP, this._enemy.hp);
  }

  // ── Combat log ───────────────────────────────────────────────────────────────
  _drawCombatLog(w, h) {
    const logX = w / 2, logY = h * 0.855;
    new Panel(this, logX, logY, 660, 100, { alpha: 0.85 });

    this.add.text(logX - 326, logY - 46, 'Combat Log', {
      fontSize: '12px', color: '#9B7A30', fontFamily: 'Georgia, serif',
    });

    this._logLines = [];
    for (let i = 0; i < 3; i++) {
      this._logLines.push(
        this.add.text(logX - 320, logY - 30 + i * 24, '', {
          fontSize: '13px', color: '#CCCCCC', fontFamily: 'Georgia, serif',
        })
      );
    }
  }

  _addLog(msg, color = '#CCCCCC') {
    for (let i = 0; i < this._logLines.length - 1; i++) {
      this._logLines[i].setText(this._logLines[i + 1].text);
      this._logLines[i].setColor(this._logLines[i + 1].style.color);
    }
    const last = this._logLines[this._logLines.length - 1];
    last.setText(msg);
    last.setColor(color);
  }

  // ── Action bar ───────────────────────────────────────────────────────────────
  _drawActionBar(w, h) {
    this._actionButtons = {};
    const barY    = h * 0.955;
    const totalW  = ARENA_ACTIONS.length * 170 - 10;
    const startX  = (w - totalW) / 2 + 80;

    ARENA_ACTIONS.forEach((action, i) => {
      const x    = startX + i * 170;
      const cost = ACTION_ENERGY_COST[action];
      const lbl  = `${ACTION_LABELS[action]}\n${cost > 0 ? `[${cost} EN]` : '[Free]'}`;

      const btn = new Button(this, x, barY, lbl, () => {
        this._onActionClick(action);
      }, { width: 158, height: 48, fontSize: '13px' });

      btn.setVisible(false);
      this._actionButtons[action] = btn;
    });
  }

  // ── Enemy select ─────────────────────────────────────────────────────────────
  _drawEnemySelect(w, h) {
    this._selectPanel = new Panel(this, w / 2, h * 0.87, 800, 80, {});
    this.add.text(w / 2, h * 0.85 - 16, 'Select opponent:', {
      fontSize: '14px', color: '#9B7A30', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    const spacing = 190;
    const startX  = w / 2 - spacing * (ENEMY_DEFS.length - 1) / 2;
    this._selectBtns = ENEMY_DEFS.map((def, i) =>
      new Button(this, startX + i * spacing, h * 0.89, `${def.name}\nLv.${def.level}`, () => {
        this._startCombat(def);
      }, { width: 175, height: 42, fontSize: '12px' })
    );
  }

  _drawBackButton(w, h) {
    new Button(this, 70, 30, '← Town', () => {
      this.scene.start('TownScene');
    }, { width: 120, height: 36, fontSize: '14px', bgColor: 0x2a1a00 });
  }

  // ── Combat logic ─────────────────────────────────────────────────────────────
  _startCombat(enemyDef) {
    this._enemy = { ...enemyDef, currentHP: enemyDef.hp };
    this._playerPos    = 1;
    this._enemyPos     = 10;
    this._combatActive = true;
    this._playerTurn   = true;
    this._playerCharged = false;

    const hp = GameStateManager.getHP();
    const en = GameStateManager.getEnergy();
    this._currentHP = hp.current;
    this._currentEn = en.current;

    this._playerHPBar.setValue(this._currentHP, hp.max);
    this._playerEnBar.setValue(this._currentEn, en.max);
    this._enemyHPBar .setValue(this._enemy.currentHP, this._enemy.hp);
    this._enemyNameText .setText(this._enemy.name);
    this._enemyLevelText.setText(`Level ${this._enemy.level}  •  ENEMY`);

    this._selectPanel.setVisible(false);
    this._selectBtns.forEach(b => b.setVisible(false));
    Object.values(this._actionButtons).forEach(b => b.setVisible(true));
    this._playerTurnIndicator.setVisible(true);
    this._updatePositionBar();

    this._addLog(`⚔ Battle begins against ${this._enemy.name}!`, '#FFD700');
    this._setButtonsEnabled(true);
  }

  _onActionClick(action) {
    if (!this._combatActive || !this._playerTurn) return;

    const cost = ACTION_ENERGY_COST[action];
    if (this._currentEn < cost) {
      this._addLog('❌ Not enough energy!', '#FF4444');
      return;
    }

    this._setButtonsEnabled(false);
    this._playerTurn = false;
    this._currentEn  = Math.max(0, this._currentEn - cost);

    const hp = GameStateManager.getHP();
    this._playerEnBar.setValue(this._currentEn, hp.max);

    // NOTE: Full implementation routes through Socket.io to server CombatEngine.
    // This is a client-side placeholder that approximates the real formulas.
    this._resolveRound(action);
  }

  _resolveRound(playerAction) {
    const character = GameStateManager.character;
    const str  = character?.baseStats?.strength  ?? 5;
    const agi  = character?.baseStats?.agility   ?? 4;
    const atk  = character?.baseStats?.attack    ?? 4;
    const def  = character?.baseStats?.defense   ?? 3;

    const dist = Math.abs(this._playerPos - this._enemyPos);

    // --- Player attack animation ---
    this._playAttackAnim(playerAction);

    // --- Player action ---
    let playerLog = '';
    let playerDmg = 0;

    if (playerAction === ACTION_TYPES.MARCH || playerAction === ACTION_TYPES.CHARGE) {
      const steps = playerAction === ACTION_TYPES.CHARGE ? 2 : 1;
      this._playerPos = Math.min(10, this._playerPos + steps);
      this._updatePositionBar();
      playerLog = playerAction === ACTION_TYPES.CHARGE
        ? `You charge forward! (pos ${this._playerPos})`
        : `You march forward. (pos ${this._playerPos})`;

      if (playerAction === ACTION_TYPES.CHARGE) this._playerCharged = true;
    } else if (playerAction === ACTION_TYPES.DEFEND) {
      this._playerDefending = true;
      playerLog = 'You take a defensive stance.';
    } else {
      const newDist = Math.abs(this._playerPos - this._enemyPos);
      if (newDist > 2) {
        this._addLog('Too far to attack — march closer!', '#FF8888');
        this._playerTurn = true;
        this._setButtonsEnabled(true);
        return;
      }
      const { POWER_ATTACK, QUICK_ATTACK, TAUNT } = ACTION_TYPES;
      const mult = playerAction === POWER_ATTACK ? 1.75 : playerAction === QUICK_ATTACK ? 0.70 : 1.0;
      const charged = this._playerCharged ? 1.5 : 1.0;
      this._playerCharged = false;

      const hitBase = atk / (atk + this._enemy.def + 1);
      const hitChance = playerAction === POWER_ATTACK ? 0.55 : playerAction === QUICK_ATTACK ? 0.95 : 0.80;
      const hit = Math.random() < Math.min(0.98, Math.max(0.08, hitBase * 0.6 + hitChance * 0.4));

      if (!hit) {
        playerLog = `You miss with ${ACTION_LABELS[playerAction]}!`;
      } else if (playerAction === TAUNT) {
        playerLog = `You taunt the enemy! They hesitate.`;
        this._enemyTaunted = true;
      } else {
        playerDmg = Math.max(1, Math.floor(
          str * mult * charged * (0.85 + Math.random() * 0.30) - this._enemy.def * 0.40
        ));
        const crit = Math.random() < (agi * 0.4) / 100;
        if (crit) { playerDmg = Math.floor(playerDmg * 1.75); }
        this._enemy.currentHP = Math.max(0, this._enemy.currentHP - playerDmg);
        playerLog = `${ACTION_LABELS[playerAction]} — ${playerDmg} dmg${crit ? ' CRIT!' : ''}`;
      }
    }

    // --- Enemy counter ---
    let enemyDmg = 0;
    let enemyLog = '';

    if (this._enemy.currentHP > 0) {
      const eDist = Math.abs(this._playerPos - this._enemyPos);
      const taunted = this._enemyTaunted;
      this._enemyTaunted = false;

      if (eDist > 2) {
        this._enemyPos = Math.max(1, this._enemyPos - 1);
        this._updatePositionBar();
        enemyLog = `Enemy marches closer. (pos ${this._enemyPos})`;
      } else if (taunted) {
        enemyDmg = Math.max(1, Math.floor(this._enemy.atk * 0.4));
        enemyLog = `Enemy is taunted — basic hit for ${enemyDmg}.`;
      } else {
        const defending = this._playerDefending;
        this._playerDefending = false;
        enemyDmg = Math.max(0, Math.floor(
          this._enemy.atk * (0.85 + Math.random() * 0.30) - def * (defending ? 1.5 : 0.40)
        ));
        enemyLog = `Enemy attacks for ${enemyDmg}${defending ? ' (blocked!)' : ''}.`;
      }
    }

    this._currentHP = Math.max(0, this._currentHP - enemyDmg);

    // Update bars
    const hp = GameStateManager.getHP();
    this._playerHPBar.setValue(this._currentHP, hp.max);
    this._enemyHPBar .setValue(this._enemy.currentHP, this._enemy.hp);

    this._addLog(playerLog, playerDmg > 0 ? '#88FF88' : '#CCCCCC');
    if (enemyLog) this._addLog(enemyLog, enemyDmg > 0 ? '#FF8888' : '#CCCCCC');

    // Hurt animation when player takes damage
    if (enemyDmg > 0) this._playHurtAnim();

    // Shake enemy sprite on hit
    if (playerDmg > 0) {
      this.tweens.add({
        targets: this._enemySprite,
        x: this._enemySprite.x + 10, duration: 40,
        yoyo: true, repeat: 3,
      });
    }

    this.time.delayedCall(300, () => {
      if (this._enemy.currentHP <= 0) {
        this._endCombat(true);
      } else if (this._currentHP <= 0) {
        this._endCombat(false);
      } else {
        this._playerTurn = true;
        this._setButtonsEnabled(true);
      }
    });
  }

  // ── Gladiator animation helpers ──────────────────────────────────────────────
  _playAttackAnim(action) {
    if (!this._playerSprite) return;
    const { QUICK_ATTACK, NORMAL_ATTACK, POWER_ATTACK, CHARGE, SPECIAL } = ACTION_TYPES;
    const map = {
      [QUICK_ATTACK]:  'gladiator_jab',
      [NORMAL_ATTACK]: 'gladiator_punch',
      [POWER_ATTACK]:  'gladiator_uppercut',
      [CHARGE]:        'gladiator_uppercut',
      [SPECIAL]:       'gladiator_uppercut',
    };
    const key = map[action];
    if (key && this.anims.exists(key)) this._playerSprite.play(key, true);
  }

  _playHurtAnim() {
    if (!this._playerSprite) return;
    if (this.anims.exists('gladiator_hurt')) {
      this._playerSprite.play('gladiator_hurt', true);
    }
  }

  _endCombat(playerWon) {
    this._combatActive = false;
    Object.values(this._actionButtons).forEach(b => b.setVisible(false));
    this._playerTurnIndicator.setVisible(false);

    if (playerWon) {
      this._addLog('🏆 VICTORY! The enemy has been defeated!', '#FFD700');
      // Return to breathing idle on victory
      if (this._playerSprite && this.anims.exists('gladiator_idle')) {
        this._playerSprite.play('gladiator_idle');
      }
      this._showResultBanner('VICTORY', '#FFD700');
    } else {
      this._addLog('💀 DEFEAT. You have been slain...', '#FF4444');
      // Play death animation
      if (this._playerSprite && this.anims.exists('gladiator_death')) {
        this._playerSprite.play('gladiator_death');
      }
      this._showResultBanner('DEFEAT', '#FF4444');
    }

    this.time.delayedCall(2800, () => {
      this._selectPanel.setVisible(true);
      this._selectBtns.forEach(b => b.setVisible(true));
    });
  }

  _showResultBanner(text, color) {
    const w = this.scale.width, h = this.scale.height;
    const banner = this.add.text(w / 2, h / 2, text, {
      fontSize: '72px', color,
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: banner, alpha: 0, delay: 1800, duration: 700,
      onComplete: () => banner.destroy(),
    });
  }

  _setButtonsEnabled(enabled) {
    Object.entries(this._actionButtons).forEach(([action, btn]) => {
      const cost = ACTION_ENERGY_COST[action];
      btn.setDisabled(!enabled || this._currentEn < cost);
    });
  }
}
