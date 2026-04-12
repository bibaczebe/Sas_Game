import Phaser from 'phaser';

/**
 * Horizontal stat bar (HP / Stamina / XP).
 * Usage: new StatBar(scene, x, y, { width:200, height:16, color:0xcc2222, label:'HP' })
 */
export default class StatBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);

    this._width  = opts.width  ?? 200;
    this._height = opts.height ?? 14;
    const color  = opts.color  ?? 0xcc2222;
    const label  = opts.label  ?? '';
    const showNumbers = opts.showNumbers ?? true;

    // Track bar
    const track = scene.add.rectangle(0, 0, this._width, this._height, 0x111111);
    track.setOrigin(0, 0.5);

    // Fill bar
    this._fill = scene.add.rectangle(0, 0, this._width, this._height, color);
    this._fill.setOrigin(0, 0.5);

    // Border
    const border = scene.add.graphics();
    border.lineStyle(1, 0x555555, 0.8);
    border.strokeRect(0, -this._height / 2, this._width, this._height);

    this.add([track, this._fill, border]);

    // Optional label
    if (label) {
      const lbl = scene.add.text(-2, 0, label, {
        fontSize:   '11px',
        color:      '#aaaaaa',
        fontFamily: 'Georgia, serif',
      }).setOrigin(1, 0.5);
      this.add(lbl);
    }

    // Value text (e.g. "85 / 100")
    if (showNumbers) {
      this._valueText = scene.add.text(this._width / 2, 0, '', {
        fontSize:   '11px',
        color:      '#ffffff',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);
      this.add(this._valueText);
    }

    scene.add.existing(this);
  }

  /**
   * @param {number} current
   * @param {number} max
   */
  setValue(current, max) {
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    this._fill.setScale(ratio, 1);
    if (this._valueText) {
      this._valueText.setText(`${Math.floor(current)} / ${Math.floor(max)}`);
    }
    return this;
  }
}
