import Phaser from 'phaser';
import AuthManager from '../managers/AuthManager.js';
import ApiManager  from '../managers/ApiManager.js';

export default class LoginScene extends Phaser.Scene {
  constructor() { super('LoginScene'); }

  preload() {
    this.load.on('loaderror', () => {});
    this.load.image('login_bg',     '/assets/bg/login_bg.jpg');
    this.load.image('login_bg_png', '/assets/bg/login_bg.png');
    this.load.image('baner',        '/assets/bg/baner.png');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._drawBackground(w, h);
    this._drawOverlay(w, h);
    this._drawTitle(w, h);
    this._drawForm(w, h);
  }

  // ── Background ─────────────────────────────────────────────────────────────
  _drawBackground(w, h) {
    // Use loaded image if available, otherwise draw programmatic bg
    const key = this.textures.exists('login_bg') ? 'login_bg'
              : this.textures.exists('login_bg_png') ? 'login_bg_png'
              : null;

    if (key) {
      const img = this.add.image(w / 2, h / 2, key);
      // Scale to fill entire canvas
      const scaleX = w / img.width;
      const scaleY = h / img.height;
      img.setScale(Math.max(scaleX, scaleY));
    } else {
      this._drawProceduralBg(w, h);
    }
  }

  _drawProceduralBg(w, h) {
    // Night sky — matches pixel art palette
    this.add.rectangle(w / 2, h * 0.30, w, h * 0.60, 0x0d0820);
    this.add.rectangle(w / 2, h * 0.62, w, h * 0.24, 0x1a0f0a);
    this.add.rectangle(w / 2, h * 0.85, w, h * 0.30, 0x100800);

    // Purple horizon gradient
    for (let i = 0; i < 6; i++) {
      const alpha = 0.06 * (6 - i);
      this.add.rectangle(w / 2, h * 0.52 + i * 8, w, 14, 0x6B2FA0, alpha);
    }
    // Amber horizon glow (torch light from arena)
    for (let i = 0; i < 5; i++) {
      this.add.rectangle(w / 2, h * 0.56 + i * 6, w, 10, 0xCC5500, 0.05 * (5 - i));
    }

    // Stars
    for (let i = 0; i < 120; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h * 0.46);
      const sz = Phaser.Math.FloatBetween(0.5, 2);
      const br = Phaser.Math.FloatBetween(0.3, 1);
      this.add.rectangle(sx, sy, sz, sz, 0xffffff, br);
    }

    // Colosseum silhouette walls
    this._drawColosseumWall(0, w * 0.28, h);
    this._drawColosseumWall(w * 0.72, w, h);

    // Arena floor
    const gfx = this.add.graphics();
    gfx.fillStyle(0x1a0d05, 1);
    gfx.fillRect(0, h * 0.72, w, h * 0.28);
    // Stone tile lines
    gfx.lineStyle(1, 0x2a1a0a, 0.6);
    for (let x = 0; x < w; x += 64) gfx.lineBetween(x, h * 0.72, x, h);
    for (let y = h * 0.72; y < h; y += 32) gfx.lineBetween(0, y, w, y);

    // Ground mist
    for (let i = 0; i < 5; i++) {
      this.add.rectangle(w / 2, h * 0.74 + i * 10, w, 18, 0x8899BB, 0.04 * (5 - i));
    }

    // Central stone arch gate
    this._drawArch(w / 2, h);

    // Left torch
    this._drawTorch(w / 2 - 210, h * 0.60, 0xFFAA22);
    // Right torch
    this._drawTorch(w / 2 + 210, h * 0.60, 0xFFAA22);

    // Puddle reflections
    this._drawPuddle(w / 2 - 80, h * 0.78, 80, 14);
    this._drawPuddle(w / 2 + 100, h * 0.82, 60, 10);
  }

  _drawColosseumWall(x1, x2, h) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x120c07, 1);
    gfx.fillRect(x1, h * 0.22, x2 - x1, h * 0.5);
    // Arch windows
    gfx.fillStyle(0x08050a, 0.9);
    const ww = (x2 - x1);
    const count = Math.max(1, Math.floor(ww / 80));
    for (let i = 0; i < count; i++) {
      const ax = x1 + (i + 0.5) * (ww / count);
      gfx.fillRect(ax - 14, h * 0.28, 28, 42);
    }
  }

  _drawArch(cx, h) {
    const gfx = this.add.graphics();
    const archW = 200, archH = 280, archY = h * 0.44;

    // Arch body
    gfx.fillStyle(0x1e1308, 1);
    gfx.fillRect(cx - archW / 2, archY, archW, archH);

    // Arch opening (darker)
    gfx.fillStyle(0x060408, 1);
    gfx.fillRect(cx - 54, archY + 40, 108, 180);
    // Rounded top of arch
    gfx.fillCircle(cx, archY + 40, 54);
    gfx.fillStyle(0x060408, 1);
    gfx.fillCircle(cx, archY + 40, 48);

    // Stone edge detail
    gfx.lineStyle(2, 0x3a2810, 1);
    gfx.strokeRect(cx - archW / 2, archY, archW, archH);

    // Two columns flanking
    const colH = archH + 40;
    const colY  = archY - 40;
    gfx.fillStyle(0x1e1308, 1);
    gfx.fillRect(cx - archW / 2 - 28, colY, 26, colH);
    gfx.fillRect(cx + archW / 2 + 2,  colY, 26, colH);
    // Column caps
    gfx.fillStyle(0x2a1c0c, 1);
    gfx.fillRect(cx - archW / 2 - 34, colY - 10, 38, 12);
    gfx.fillRect(cx + archW / 2 - 4,  colY - 10, 38, 12);
  }

  _drawTorch(x, y, color) {
    const gfx = this.add.graphics();
    // Pole
    gfx.fillStyle(0x3a2010, 1);
    gfx.fillRect(x - 4, y, 8, 80);
    // Base bracket
    gfx.fillStyle(0x5a3820, 1);
    gfx.fillRect(x - 12, y - 2, 24, 10);
    // Flame glow (stacked circles, large to small)
    const glows = [
      { r: 34, a: 0.06 }, { r: 24, a: 0.10 }, { r: 16, a: 0.16 },
    ];
    glows.forEach(g => {
      gfx.fillStyle(color, g.a);
      gfx.fillCircle(x, y - 20, g.r);
    });
    // Flame core
    gfx.fillStyle(0xFFEE44, 0.9);
    gfx.fillTriangle(x - 10, y, x + 10, y, x, y - 38);
    gfx.fillStyle(color, 0.85);
    gfx.fillTriangle(x - 7, y, x + 7, y, x, y - 28);
    gfx.fillStyle(0xFFFFAA, 0.7);
    gfx.fillTriangle(x - 4, y - 4, x + 4, y - 4, x, y - 20);
  }

  _drawPuddle(x, y, w, h) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x334466, 0.18);
    gfx.fillEllipse(x, y, w, h);
    gfx.lineStyle(1, 0x445577, 0.12);
    gfx.strokeEllipse(x, y, w, h);
  }

  // ── Dark vignette + panel overlay ──────────────────────────────────────────
  _drawOverlay(w, h) {
    // Full-screen dark vignette so the form is readable over any background
    const gfx = this.add.graphics();

    // Radial vignette (black edges)
    const center = { x: w / 2, y: h / 2 };
    const steps = 8;
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      const alpha = 0.55 * (1 - ratio);
      const rw = w * (0.5 + ratio * 0.6);
      const rh = h * (0.5 + ratio * 0.6);
      gfx.fillStyle(0x000000, alpha);
      gfx.fillEllipse(center.x, center.y, rw, rh);
    }

    // Subtle bottom darkness so floor doesn't distract
    gfx.fillStyle(0x000000, 0.35);
    gfx.fillRect(0, h * 0.75, w, h * 0.25);
  }

  // ── Title ───────────────────────────────────────────────────────────────────
  _drawTitle(w, h) {
    if (this.textures.exists('baner')) {
      const img = this.add.image(w / 2, 105, 'baner');
      const scale = Math.min(w * 0.55 / img.width, 160 / img.height);
      img.setScale(scale);
    } else {
      this.add.text(w / 2 + 3, 76, 'SWORD AND SANDALS', {
        fontSize: '54px', color: '#000000',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.7);
      this.add.text(w / 2, 74, 'SWORD AND SANDALS', {
        fontSize: '54px', color: '#FFD700',
        fontFamily: 'Georgia, serif', fontStyle: 'bold',
        stroke: '#4A2800', strokeThickness: 4,
      }).setOrigin(0.5);
      this.add.text(w / 2, 130, 'O  N  L  I  N  E', {
        fontSize: '18px', color: '#CD853F',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5);
    }

    // Decorative divider
    const d = this.add.graphics();
    d.lineStyle(1, 0x8B6914, 0.5);
    d.lineBetween(w / 2 - 200, 170, w / 2 + 200, 170);
    d.fillStyle(0x8B6914, 0.8);
    d.fillTriangle(w / 2 - 5, 170, w / 2, 164, w / 2 + 5, 170);
    d.fillTriangle(w / 2 - 5, 170, w / 2, 176, w / 2 + 5, 170);
  }

  // ── Form panel ──────────────────────────────────────────────────────────────
  _drawForm(w, h) {
    this._mode = 'login';

    // The entire panel + form lives inside one DOM element — avoids Phaser
    // scale/position issues with separately placed DOM objects.
    const formEl = this.add.dom(w / 2, h / 2 + 30).createFromHTML(this._buildPanelHtml());
    this._formEl = formEl;

    // Wire submit
    formEl.addListener('click');
    formEl.on('click', (e) => {
      if (e.target.id === 'tab-login')    this._switchMode('login');
      if (e.target.id === 'tab-register') this._switchMode('register');
      if (e.target.id === 'submit-btn')   { e.preventDefault(); this._handleSubmit(); }
    });
    formEl.addListener('keydown');
    formEl.on('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._handleSubmit(); }
    });
  }

  _buildPanelHtml() {
    return `
      <div id="login-panel" style="
        width: 400px;
        background: rgba(4,2,10,0.92);
        border: 3px solid #5C3A1A;
        outline: 1px solid rgba(255,215,0,0.2);
        outline-offset: -6px;
        transform: translate(-50%, -50%);
        font-family: Georgia, serif;
        padding: 0 0 24px 0;
        position: relative;
      ">
        <!-- Corner accents -->
        <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-top:2px solid rgba(255,215,0,0.5);border-left:2px solid rgba(255,215,0,0.5);"></div>
        <div style="position:absolute;top:4px;right:4px;width:16px;height:16px;border-top:2px solid rgba(255,215,0,0.5);border-right:2px solid rgba(255,215,0,0.5);"></div>
        <div style="position:absolute;bottom:4px;left:4px;width:16px;height:16px;border-bottom:2px solid rgba(255,215,0,0.5);border-left:2px solid rgba(255,215,0,0.5);"></div>
        <div style="position:absolute;bottom:4px;right:4px;width:16px;height:16px;border-bottom:2px solid rgba(255,215,0,0.5);border-right:2px solid rgba(255,215,0,0.5);"></div>

        <!-- Tabs -->
        <div style="display:flex; border-bottom:1px solid #3d2510; margin-bottom:24px;">
          <button id="tab-login" style="
            flex:1; padding:16px 0; background:none; border:none; border-bottom:2px solid #FFD700;
            color:#FFD700; font-size:16px; font-family:Georgia,serif; font-weight:bold;
            cursor:pointer; letter-spacing:1px;
          ">Login</button>
          <button id="tab-register" style="
            flex:1; padding:16px 0; background:none; border:none; border-bottom:2px solid transparent;
            color:#5C4020; font-size:16px; font-family:Georgia,serif;
            cursor:pointer; letter-spacing:1px;
          ">Register</button>
        </div>

        <!-- Fields -->
        <div style="display:flex; flex-direction:column; gap:14px; padding:0 40px;">
          <div id="email-group" style="display:none; flex-direction:column; gap:4px;">
            <label class="sas-label">Email</label>
            <input class="sas-input" type="email" id="email" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label class="sas-label">Username</label>
            <input class="sas-input" type="text" id="username" placeholder="Gladiator" autocomplete="username" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label class="sas-label">Password</label>
            <input class="sas-input" type="password" id="password" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div id="error-msg" style="color:#FF5555;font-size:12px;min-height:16px;text-align:center;text-shadow:0 0 6px rgba(255,0,0,0.4);"></div>
          <button class="sas-btn" id="submit-btn" type="button">ENTER THE ARENA</button>
        </div>
      </div>
    `;
  }

  _switchMode(mode) {
    this._mode = mode;
    this._setError('');
    const emailGroup = this._formEl.getChildByID('email-group');
    const submitBtn  = this._formEl.getChildByID('submit-btn');
    const tabLogin   = this._formEl.getChildByID('tab-login');
    const tabReg     = this._formEl.getChildByID('tab-register');

    if (mode === 'register') {
      emailGroup.style.display        = 'flex';
      submitBtn.textContent           = 'CREATE ACCOUNT';
      tabLogin.style.color            = '#5C4020';
      tabLogin.style.borderBottomColor= 'transparent';
      tabLogin.style.fontWeight       = 'normal';
      tabReg.style.color              = '#FFD700';
      tabReg.style.borderBottomColor  = '#FFD700';
      tabReg.style.fontWeight         = 'bold';
    } else {
      emailGroup.style.display        = 'none';
      submitBtn.textContent           = 'ENTER THE ARENA';
      tabLogin.style.color            = '#FFD700';
      tabLogin.style.borderBottomColor= '#FFD700';
      tabLogin.style.fontWeight       = 'bold';
      tabReg.style.color              = '#5C4020';
      tabReg.style.borderBottomColor  = 'transparent';
      tabReg.style.fontWeight         = 'normal';
    }
  }

  _setError(msg) {
    const el = this._formEl?.getChildByID('error-msg');
    if (el) el.textContent = msg;
  }

  async _handleSubmit() {
    this._setError('');
    const username = this._formEl.getChildByID('username').value.trim();
    const password = this._formEl.getChildByID('password').value;
    const email    = this._formEl.getChildByID('email')?.value?.trim();
    const btn      = this._formEl.getChildByID('submit-btn');

    if (!username || !password) {
      this._setError('Please fill in all fields.');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Please wait...';

    try {
      let data;
      if (this._mode === 'register') {
        if (!email) { this._setError('Email is required.'); btn.disabled = false; return; }
        data = await ApiManager.register(username, email, password);
      } else {
        data = await ApiManager.login(username, password);
      }
      AuthManager.setToken(data.accessToken);
      AuthManager.setUser(data.user);
      this.scene.start('PreloadScene');
    } catch (err) {
      this._setError(err.message || 'Something went wrong.');
    } finally {
      btn.disabled    = false;
      btn.textContent = this._mode === 'register' ? 'CREATE ACCOUNT' : 'ENTER THE ARENA';
    }
  }
}
