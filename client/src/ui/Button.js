import Phaser from 'phaser';
import { COLORS } from '../config/Constants.js';

/**
 * Reusable Phaser button — a Container with a background rect + label text.
 * Usage: new Button(scene, x, y, 'Click Me', () => handler(), { width: 200 })
 */
export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, opts = {}) {
    super(scene, x, y);

    const w          = opts.width     ?? 220;
    const h          = opts.height    ?? 48;
    const bgColor    = opts.bgColor   ?? 0x5C2E0A;
    const hoverColor = opts.hover     ?? 0x8B4513;
    const textColor  = opts.textColor ?? COLORS.TEXT_PRIMARY;
    const fontSize   = opts.fontSize  ?? '18px';
    const disabled   = opts.disabled  ?? false;

    // Background
    this._bg = scene.add.rectangle(0, 0, w, h, bgColor);
    this._bg.setStrokeStyle(1, COLORS.BORDER_GOLD);

    // Label
    this._label = scene.add.text(0, 0, label, {
      fontSize,
      color:      textColor,
      fontFamily: 'Georgia, serif',
      fontStyle:  opts.bold ? 'bold' : 'normal',
    }).setOrigin(0.5);

    this.add([this._bg, this._label]);

    if (!disabled) {
      this._bg.setInteractive({ useHandCursor: true });
      this._bg.on('pointerover',  () => { this._bg.setFillStyle(hoverColor); });
      this._bg.on('pointerout',   () => { this._bg.setFillStyle(bgColor); });
      this._bg.on('pointerdown',  () => { this._bg.setFillStyle(0x3a1a00); });
      this._bg.on('pointerup',    () => {
        this._bg.setFillStyle(hoverColor);
        if (onClick) onClick();
      });
    } else {
      this._bg.setFillStyle(0x2a1a00);
      this._label.setColor('#555555');
    }

    scene.add.existing(this);
  }

  setLabel(text) {
    this._label.setText(text);
    return this;
  }

  setDisabled(disabled) {
    if (disabled) {
      this._bg.removeInteractive();
      this._bg.setFillStyle(0x2a1a00);
      this._label.setColor('#555555');
    } else {
      this._bg.setInteractive({ useHandCursor: true });
      this._bg.setFillStyle(0x5C2E0A);
      this._label.setColor(COLORS.TEXT_PRIMARY);
    }
    return this;
  }
}
