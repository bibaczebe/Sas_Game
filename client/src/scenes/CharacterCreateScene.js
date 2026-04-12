/**
 * CharacterCreateScene — Chapter 2.1 + 2.2
 * 5 classes, 6 races, 8-stat preview, name input
 */
import Phaser from 'phaser';
import ApiManager       from '../managers/ApiManager.js';
import GameStateManager from '../managers/GameStateManager.js';
import Button           from '../ui/Button.js';
import Panel            from '../ui/Panel.js';
import {
  CLASS_BASE_STATS, CLASS_DESCRIPTIONS,
  RACES, RACE_LABELS, RACE_DESCRIPTIONS,
  COLORS,
} from '../config/Constants.js';

const CLASSES = ['warrior', 'archer', 'mage', 'paladin', 'assassin'];
const CLASS_COLORS = {
  warrior:  0xCC4400,
  archer:   0x228B22,
  mage:     0x4169E1,
  paladin:  0xCC8800,
  assassin: 0x6A0DAD,
};
const CLASS_EMOJIS = {
  warrior:  '⚔',
  archer:   '🏹',
  mage:     '🔮',
  paladin:  '⚜',
  assassin: '🗡',
};

const RACE_LIST = [
  RACES.HUMAN, RACES.ELF, RACES.DWARF,
  RACES.ORC, RACES.HALFELF, RACES.TIEFLING,
];
const RACE_COLORS = {
  human:    0x8B6914,
  elf:      0x228B22,
  dwarf:    0x8B4513,
  orc:      0x556B2F,
  halfelf:  0x2F6B8B,
  tiefling: 0x6A0DAD,
};

// Stats shown in class cards (4 most representative per class)
const CLASS_PREVIEW_STATS = {
  warrior:  ['strength', 'vitality', 'defense', 'endurance'],
  archer:   ['agility',  'attack',   'strength', 'endurance'],
  mage:     ['magic',    'charisma', 'agility',  'vitality'],
  paladin:  ['defense',  'charisma', 'vitality', 'strength'],
  assassin: ['agility',  'attack',   'strength', 'magic'],
};

export default class CharacterCreateScene extends Phaser.Scene {
  constructor() { super('CharacterCreateScene'); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._selectedClass = 'warrior';
    this._selectedRace  = 'human';

    this._drawBackground(w, h);
    this._drawTitle(w, h);
    this._drawClassCards(w, h);
    this._drawRaceRow(w, h);
    this._drawStatPreview(w, h);
    this._drawNameInput(w, h);
    this._drawCreateButton(w, h);
    this._drawBackButton(w, h);
  }

  // ── Background ──────────────────────────────────────────────────────────────
  _drawBackground(w, h) {
    this.add.rectangle(w / 2, h / 2, w, h, 0x0d0500);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a0a00, 1);
    for (let x = 0; x < w; x += 60) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 60) gfx.lineBetween(0, y, w, y);
  }

  _drawTitle(w, h) {
    this.add.text(w / 2, 36, 'CREATE YOUR HERO', {
      fontSize: '32px', color: '#FFD700',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(w / 2, 70, 'Choose your class and race — your destiny begins here', {
      fontSize: '14px', color: '#9B7A30', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
  }

  // ── Class cards (5 classes) ─────────────────────────────────────────────────
  _drawClassCards(w, h) {
    this._cards = {};
    const cardW = 216, cardH = 230;
    const totalW = CLASSES.length * (cardW + 12) - 12;
    let x = (w - totalW) / 2 + cardW / 2;

    CLASSES.forEach(cls => {
      this._cards[cls] = this._buildCard(cls, x, 210, cardW, cardH);
      x += cardW + 12;
    });

    this._highlightCard(this._selectedClass);
  }

  _buildCard(cls, x, y, cw, ch) {
    const container = this.add.container(x, y);
    const color = CLASS_COLORS[cls];

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0800, 0.95);
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
    bg.lineStyle(2, 0x443300, 1);
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
    container.add(bg);

    // Banner
    const banner = this.add.graphics();
    banner.fillStyle(color, 0.75);
    banner.fillRoundedRect(-cw / 2, -ch / 2, cw, 52, { tl: 6, tr: 6, bl: 0, br: 0 });
    container.add(banner);

    container.add(this.add.text(0, -ch / 2 + 26, CLASS_EMOJIS[cls], { fontSize: '24px' }).setOrigin(0.5));
    container.add(this.add.text(0, -ch / 2 + 65, cls.toUpperCase(), {
      fontSize: '16px', color: '#FFD700', fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5));

    const descLines = CLASS_DESCRIPTIONS[cls];
    container.add(this.add.text(0, -ch / 2 + 85, descLines, {
      fontSize: '10px', color: '#AAAAAA', fontFamily: 'Georgia, serif',
      wordWrap: { width: cw - 20 }, align: 'center',
    }).setOrigin(0.5, 0));

    // Stat mini-bars
    const previewStats = CLASS_PREVIEW_STATS[cls];
    const stats = CLASS_BASE_STATS[cls];
    previewStats.forEach((stat, idx) => {
      const sy = -ch / 2 + 140 + idx * 22;
      container.add(this.add.text(-cw / 2 + 10, sy, stat.substring(0, 3).toUpperCase(), {
        fontSize: '9px', color: '#9B7A30', fontFamily: 'Georgia, serif',
      }));
      const barBg = this.add.rectangle(-cw / 2 + 58, sy + 5, 100, 9, 0x111111).setOrigin(0, 0.5);
      const fillW = Math.max(2, Math.floor((stats[stat] / 10) * 100));
      const fill  = this.add.rectangle(-cw / 2 + 58, sy + 5, fillW, 9, color).setOrigin(0, 0.5);
      container.add([barBg, fill]);
      container.add(this.add.text(cw / 2 - 8, sy, stats[stat], {
        fontSize: '9px', color: '#FFD700', fontFamily: 'Georgia, serif',
      }).setOrigin(1, 0));
    });

    const hitArea = this.add.rectangle(0, 0, cw, ch, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => this._selectClass(cls));
    container.add(hitArea);
    container._bg = bg;
    return container;
  }

  _selectClass(cls) {
    this._selectedClass = cls;
    this._highlightCard(cls);
    this._refreshStatPreview();
  }

  _highlightCard(cls) {
    const cw = 216, ch = 230;
    CLASSES.forEach(c => {
      const bg = this._cards[c]._bg;
      bg.clear();
      if (c === cls) {
        bg.fillStyle(0x2a1200, 1);
        bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
        bg.lineStyle(3, CLASS_COLORS[c], 1);
        bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
      } else {
        bg.fillStyle(0x1a0800, 0.95);
        bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
        bg.lineStyle(2, 0x443300, 1);
        bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
      }
    });
  }

  // ── Race row ─────────────────────────────────────────────────────────────────
  _drawRaceRow(w, h) {
    this.add.text(w / 2, 337, 'RACE', {
      fontSize: '11px', color: '#9B7A30', fontFamily: 'Georgia, serif', letterSpacing: 4,
    }).setOrigin(0.5);

    this._raceButtons = {};
    const btnW = 140, btnH = 34, gap = 8;
    const totalW = RACE_LIST.length * (btnW + gap) - gap;
    let rx = (w - totalW) / 2 + btnW / 2;

    RACE_LIST.forEach(race => {
      const gfx = this.add.graphics();
      this._drawRaceBtn(gfx, rx, 362, btnW, btnH, race, race === this._selectedRace);

      const hit = this.add.rectangle(rx, 362, btnW, btnH, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this._selectRace(race));
      this._raceButtons[race] = { gfx, x: rx, selected: race === this._selectedRace };
      rx += btnW + gap;
    });

    this._raceDescText = this.add.text(w / 2, 390, RACE_DESCRIPTIONS[this._selectedRace], {
      fontSize: '11px', color: '#888888', fontFamily: 'Georgia, serif', fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  _drawRaceBtn(gfx, x, y, bw, bh, race, selected) {
    const color = RACE_COLORS[race];
    gfx.clear();
    gfx.fillStyle(selected ? color : 0x1a0800, selected ? 0.6 : 0.9);
    gfx.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 4);
    gfx.lineStyle(1, selected ? color : 0x443300, 1);
    gfx.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 4);

    // Label text drawn separately so it stays on top
    if (!gfx._raceLabel) {
      gfx._raceLabel = this.add.text(x, y, RACE_LABELS[race], {
        fontSize: '12px', color: selected ? '#FFD700' : '#9B7A30',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);
    } else {
      gfx._raceLabel.setColor(selected ? '#FFD700' : '#9B7A30');
    }
  }

  _selectRace(race) {
    this._selectedRace = race;
    RACE_LIST.forEach(r => {
      const btn = this._raceButtons[r];
      this._drawRaceBtn(btn.gfx, btn.x, 362, 140, 34, r, r === race);
    });
    this._raceDescText?.setText(RACE_DESCRIPTIONS[race]);
    this._refreshStatPreview();
  }

  // ── Stat preview ─────────────────────────────────────────────────────────────
  _drawStatPreview(w, h) {
    const panelY = 455;
    new Panel(this, w / 2, panelY, 700, 50, {});

    const allStats = ['strength', 'agility', 'attack', 'defense', 'vitality', 'charisma', 'endurance', 'magic'];
    const stats = CLASS_BASE_STATS[this._selectedClass];

    this._statPreviewTexts = {};
    const colW = 680 / allStats.length;
    allStats.forEach((s, i) => {
      const tx = w / 2 - 340 + colW * i + colW / 2;
      this.add.text(tx, panelY - 14, s.substring(0, 3).toUpperCase(), {
        fontSize: '9px', color: '#666', fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);
      this._statPreviewTexts[s] = this.add.text(tx, panelY + 4, stats[s], {
        fontSize: '14px', color: '#FFD700', fontFamily: 'Georgia, serif', fontStyle: 'bold',
      }).setOrigin(0.5);
    });
  }

  _refreshStatPreview() {
    const stats = CLASS_BASE_STATS[this._selectedClass];
    Object.entries(this._statPreviewTexts).forEach(([k, t]) => {
      t.setText(stats[k] ?? 0);
    });
  }

  // ── Name input ───────────────────────────────────────────────────────────────
  _drawNameInput(w, h) {
    this.add.text(w / 2, 490, 'HERO NAME', {
      fontSize: '11px', color: '#9B7A30', fontFamily: 'Georgia, serif', letterSpacing: 3,
    }).setOrigin(0.5);

    const inputHtml = `
      <input class="sas-input" type="text" id="heroName"
        placeholder="Enter your name..."
        maxlength="24"
        style="width:260px; text-align:center; font-size:17px;"
      />
    `;
    this._nameInput = this.add.dom(w / 2, 522).createFromHTML(inputHtml);
  }

  // ── Create button ────────────────────────────────────────────────────────────
  _drawCreateButton(w, h) {
    this._errorText = this.add.text(w / 2, 556, '', {
      fontSize: '13px', color: '#FF4444', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this._createBtn = new Button(this, w / 2, 590, 'BEGIN YOUR JOURNEY', () => {
      this._handleCreate();
    }, { width: 260, height: 44, fontSize: '17px', bold: true });
  }

  _drawBackButton(w, h) {
    new Button(this, 70, 30, '← Back', () => {
      this.scene.start('LoginScene');
    }, { width: 110, height: 34, fontSize: '13px', bgColor: 0x1a0a00 });
  }

  async _handleCreate() {
    const nameEl = this._nameInput.getChildByID('heroName');
    const name   = nameEl?.value?.trim();

    if (!name || name.length < 2) {
      this._errorText.setText('Name must be at least 2 characters.');
      return;
    }

    this._createBtn.setDisabled(true);
    this._errorText.setText('');

    try {
      const { character } = await ApiManager.createCharacter(name, this._selectedClass, this._selectedRace);
      GameStateManager.updateCharacter(character);
      this.scene.start('WorldMapScene');
    } catch (err) {
      this._errorText.setText(err.message || 'Failed to create character.');
      this._createBtn.setDisabled(false);
    }
  }
}
