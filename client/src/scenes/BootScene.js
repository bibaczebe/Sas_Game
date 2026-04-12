import Phaser from 'phaser';
import AuthManager from '../managers/AuthManager.js';
import ApiManager  from '../managers/ApiManager.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    AuthManager.init();

    const w = this.scale.width;
    const h = this.scale.height;

    // Dark background
    this.add.rectangle(w / 2, h / 2, w, h, 0x060308);

    // Subtle ember particles in background
    for (let i = 0; i < 30; i++) {
      const x  = Phaser.Math.Between(0, w);
      const y  = Phaser.Math.Between(0, h);
      const sz = Phaser.Math.FloatBetween(0.5, 1.5);
      this.add.rectangle(x, y, sz, sz, 0xFFAA33, Phaser.Math.FloatBetween(0.1, 0.4));
    }

    this.add.text(w / 2 + 2, h / 2 - 22, 'SWORD AND SANDALS', {
      fontSize: '46px', color: '#000000',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);

    this.add.text(w / 2, h / 2 - 24, 'SWORD AND SANDALS', {
      fontSize: '46px', color: '#FFD700',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
      stroke: '#3a1a00', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(w / 2, h / 2 + 24, 'O  N  L  I  N  E', {
      fontSize: '17px', color: '#8B6030',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // Loading dots animation
    this._dotText = this.add.text(w / 2, h / 2 + 58, '...', {
      fontSize: '13px', color: '#5C3A1A', fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    let dots = 0;
    this._dotTimer = this.time.addEvent({
      delay: 400,
      loop:  true,
      callback: () => {
        dots = (dots + 1) % 4;
        this._dotText.setText('.'.repeat(dots + 1));
      },
    });

    this._tryRestoreSession();
  }

  async _tryRestoreSession() {
    try {
      const ok = await ApiManager._tryRefresh();
      if (ok && AuthManager.getToken()) {
        const { user } = await ApiManager.getMe();
        AuthManager.setUser(user);
        this.scene.start('PreloadScene');
        return;
      }
    } catch {
      // Silent fail
    }
    this.scene.start('LoginScene');
  }
}
