import Phaser from 'phaser';
import { COLORS } from '../config/Constants.js';

/**
 * Decorated panel — dark background + gold border.
 * Usage: new Panel(scene, x, y, 400, 300, { alpha: 0.9 })
 */
export default class Panel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, opts = {}) {
    super(scene, x, y);

    const bgColor     = opts.bgColor     ?? COLORS.BG_PANEL;
    const borderColor = opts.borderColor ?? COLORS.BORDER_GOLD;
    const alpha       = opts.alpha       ?? 0.92;
    const cornerDeco  = opts.cornerDeco  ?? true;

    // Background
    const bg = scene.add.rectangle(0, 0, width, height, bgColor, alpha);

    // Border
    const border = scene.add.graphics();
    border.lineStyle(2, borderColor, 1);
    border.strokeRect(-width / 2, -height / 2, width, height);

    this.add([bg, border]);

    // Corner diamond decorations
    if (cornerDeco) {
      const corners = [
        [-width / 2, -height / 2],
        [ width / 2, -height / 2],
        [-width / 2,  height / 2],
        [ width / 2,  height / 2],
      ];
      corners.forEach(([cx, cy]) => {
        const gem = scene.add.graphics();
        gem.fillStyle(borderColor, 1);
        gem.fillRect(cx - 4, cy - 4, 8, 8);
        this.add(gem);
      });
    }

    scene.add.existing(this);
  }
}
