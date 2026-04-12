/**
 * TavernScene — Chapter 5.2 (Shakes & Fidget style expeditions)
 *
 * Shows list of available expeditions.
 * Player sends character → timer runs → collect rewards + battle log.
 */
import Phaser from 'phaser';
import ApiManager   from '../managers/ApiManager.js';
import GameStateManager from '../managers/GameStateManager.js';
import { COLORS }   from '../config/Constants.js';

const DIFF_STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

export default class TavernScene extends Phaser.Scene {
  constructor() { super('TavernScene'); }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._drawBackground(w, h);
    this._drawTitle(w);
    this._buildUI(w, h);
    this._drawBackButton(w, h);

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.scene.bringToTop('UIScene');

    this._loadExpeditions();

    // Poll status every 5s when on expedition
    this._pollTimer = this.time.addEvent({ delay: 5000, loop: true, callback: this._pollStatus, callbackScope: this });
  }

  shutdown() {
    this._pollTimer?.remove();
    const panel = document.getElementById('sas-tavern');
    if (panel) panel.remove();
    const style = document.getElementById('sas-tavern-styles');
    if (style) style.remove();
  }

  // ── Background ────────────────────────────────────────────────────────────
  _drawBackground(w, h) {
    this.add.rectangle(w/2, h/2, w, h, 0x1a0d00);

    // Wood floor planks
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x3a1a00, 0.4);
    for (let y = h*0.6; y < h; y += 28) gfx.lineBetween(0, y, w, y);
    for (let x = 0; x < w; x += 80) gfx.lineBetween(x, h*0.6, x, h);

    // Fireplace glow
    this.add.circle(w/2, h - 60, 80, 0xFF6600, 0.08);
    this.add.circle(w/2, h - 60, 40, 0xFF8800, 0.15);

    // Candles
    [w*0.25, w*0.75].forEach(cx => {
      this.add.circle(cx, h*0.22, 4, 0xFFDD44, 0.9);
      this.tweens.add({
        targets: this.add.circle(cx, h*0.22-6, 3, 0xFFBB00, 0.8),
        scaleX: 1.3, scaleY: 0.7, duration: 100+Math.random()*80,
        yoyo: true, repeat: -1,
      });
    });
  }

  _drawTitle(w) {
    this.add.text(w/2, 36, 'THE TAVERN', {
      fontSize: '28px', color: '#FFD700',
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(w/2, 68, '"Send your character on timed expeditions. Return for gold and glory."', {
      fontSize: '13px', color: '#9B7A30',
      fontFamily: 'Georgia, serif', fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  // ── Main DOM UI ───────────────────────────────────────────────────────────
  _buildUI(w, h) {
    if (!document.getElementById('sas-tavern-styles')) {
      const s = document.createElement('style');
      s.id = 'sas-tavern-styles';
      s.textContent = `
        #sas-tavern {
          position: fixed; top: 90px; left: 50%;
          transform: translateX(-50%);
          width: 720px; max-height: calc(100vh - 130px);
          overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
          font-family: Georgia, serif;
          scrollbar-width: thin;
        }
        #sas-tavern::-webkit-scrollbar { width: 5px; }
        #sas-tavern::-webkit-scrollbar-thumb { background: #3a2a00; }

        /* Active expedition banner */
        #sas-active-exp {
          background: rgba(0,20,0,0.85); border: 1px solid #3a7a30;
          padding: 16px 20px; display: none; flex-direction: column; gap: 8px;
        }
        #sas-active-exp.visible { display: flex; }
        #sas-active-title { font-size: 15px; color: #66DD66; font-weight: bold; }
        #sas-active-timer { font-size: 22px; color: #FFD700; font-weight: bold; letter-spacing: 2px; }
        #sas-active-bar-wrap { height: 8px; background: #1a1a00; border-radius: 4px; }
        #sas-active-bar { height: 100%; background: #3a7a30; border-radius: 4px; transition: width 1s linear; }
        #sas-collect-btn {
          margin-top: 4px; padding: 10px 24px; background: #2a5a1a; border: 1px solid #55aa33;
          color: #AAffAA; font-family: Georgia, serif; font-size: 14px; cursor: pointer;
          align-self: flex-start;
        }
        #sas-collect-btn:hover { background: #3a7a28; }

        /* Expedition cards */
        .sas-exp-card {
          background: rgba(13,5,0,0.85); border: 1px solid #3a2a00;
          padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;
        }
        .sas-exp-card:hover { border-color: #8B6914; }
        .sas-exp-name { font-size: 16px; color: #FFD700; font-weight: bold; }
        .sas-exp-desc { font-size: 12px; color: #888; margin-top: 3px; }
        .sas-exp-meta { font-size: 12px; color: #9B7A30; margin-top: 6px; display: flex; gap: 16px; }
        .sas-exp-rewards { font-size: 13px; color: #CCCCCC; text-align: right; line-height: 1.6; }
        .sas-exp-rewards .reward-stars { color: #CC8800; }
        .sas-send-btn {
          margin-top: 10px; padding: 8px 18px;
          background: #5a2a00; border: 1px solid #8B4513; color: #FFD700;
          font-family: Georgia, serif; font-size: 13px; cursor: pointer;
        }
        .sas-send-btn:hover { background: #7a3a00; }
        .sas-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .sas-send-btn.locked { background: #2a1a00; border-color: #3a2a00; color: #555; cursor: not-allowed; }

        /* Battle log modal */
        #sas-log-modal {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: none; align-items: center; justify-content: center; z-index: 99999;
        }
        #sas-log-modal.visible { display: flex; }
        #sas-log-box {
          background: #0d0500; border: 2px solid #8B6914;
          padding: 28px 32px; max-width: 560px; width: 90%; max-height: 80vh; overflow-y: auto;
          font-family: Georgia, serif;
        }
        #sas-log-box h2 { color: #FFD700; font-size: 20px; margin: 0 0 12px; }
        #sas-log-box .log-line { color: #CCCCCC; font-size: 13px; line-height: 1.8; border-left: 2px solid #3a2a00; padding-left: 10px; margin: 4px 0; }
        #sas-log-box .reward-line { color: #FFD700; font-size: 14px; margin-top: 14px; font-weight: bold; }
        #sas-log-box .levelup { color: #55FF55; font-weight: bold; font-size: 15px; }
        #sas-log-close { margin-top: 18px; padding: 9px 22px; background: #5a2a00; border: 1px solid #8B4513; color: #FFD700; font-family: Georgia, serif; cursor: pointer; }
      `;
      document.head.appendChild(s);
    }

    const panel = document.createElement('div');
    panel.id = 'sas-tavern';
    panel.innerHTML = `
      <div id="sas-active-exp">
        <div id="sas-active-title">On Expedition...</div>
        <div id="sas-active-timer">--:--:--</div>
        <div id="sas-active-bar-wrap"><div id="sas-active-bar" style="width:0%"></div></div>
        <button id="sas-collect-btn" style="display:none" onclick="window._sasCollect()">⚔ Collect Rewards</button>
      </div>
      <div id="sas-exp-list"></div>
    `;
    document.body.appendChild(panel);

    const modal = document.createElement('div');
    modal.id = 'sas-log-modal';
    modal.innerHTML = `
      <div id="sas-log-box">
        <h2 id="sas-log-title">Expedition Report</h2>
        <div id="sas-log-lines"></div>
        <button id="sas-log-close" onclick="document.getElementById('sas-log-modal').classList.remove('visible')">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    window._sasSendExpedition = (id) => this._sendExpedition(id);
    window._sasCollect        = ()  => this._collectRewards();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  async _loadExpeditions() {
    try {
      const data = await ApiManager.get('/api/expeditions');
      this._expeditionData = data;
      this._renderExpeditions(data);
      if (data.onExpedition || data.expeditionReady) this._pollStatus();
    } catch(e) {
      console.warn('Failed to load expeditions:', e.message);
    }
  }

  _renderExpeditions(data) {
    const list   = document.getElementById('sas-exp-list');
    if (!list) return;
    const blocked = data.onExpedition;

    list.innerHTML = (data.expeditions || []).map(exp => `
      <div class="sas-exp-card">
        <div>
          <div class="sas-exp-name">${exp.name}</div>
          <div class="sas-exp-desc">${exp.description}</div>
          <div class="sas-exp-meta">
            <span>⏱ ${exp.durationFormatted}</span>
            <span>⚔ Req. Lv.${exp.minLevel}</span>
          </div>
          <button
            class="sas-send-btn${blocked ? ' locked' : ''}"
            ${blocked ? 'disabled' : ''}
            onclick="window._sasSendExpedition('${exp.id}')">
            ${blocked ? '🚫 Character Away' : '⚔ Send on Expedition'}
          </button>
        </div>
        <div class="sas-exp-rewards">
          <span class="reward-stars">${DIFF_STARS[exp.difficulty] || ''}</span><br>
          📜 ${exp.xpMin}–${exp.xpMax} XP<br>
          💰 ${exp.goldMin}–${exp.goldMax} gold<br>
          🎁 ${Math.round(exp.itemChance * 100)}% item
        </div>
      </div>
    `).join('');
  }

  async _pollStatus() {
    try {
      const data  = await ApiManager.get('/api/expeditions/status');
      const active = document.getElementById('sas-active-exp');
      const timer  = document.getElementById('sas-active-timer');
      const bar    = document.getElementById('sas-active-bar');
      const btn    = document.getElementById('sas-collect-btn');
      if (!active) return;

      if (data.status === 'idle') {
        active.classList.remove('visible');
        return;
      }

      active.classList.add('visible');
      document.getElementById('sas-active-title').textContent =
        `On Expedition: ${data.expedition?.name || '...'}`;

      if (data.status === 'active') {
        timer.textContent = formatSec(data.remainingSec);
        const total = data.expedition?.durationSec || 1;
        const elapsed = total - data.remainingSec;
        bar.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
        btn.style.display = 'none';
      } else if (data.status === 'ready') {
        timer.textContent = '✓ READY';
        bar.style.width = '100%';
        btn.style.display = 'block';
      } else if (data.status === 'collected') {
        active.classList.remove('visible');
      }
    } catch(e) {
      // silently ignore poll errors
    }
  }

  async _sendExpedition(id) {
    try {
      const res = await ApiManager.post('/api/expeditions/start', { expeditionId: id });
      GameStateManager.addNotification?.(`⚔ ${res.message}`);
      // Reload
      await this._loadExpeditions();
      await this._pollStatus();
    } catch(e) {
      GameStateManager.addNotification?.(`✗ ${e.message}`);
    }
  }

  async _collectRewards() {
    try {
      const res  = await ApiManager.post('/api/expeditions/collect', {});
      const btn  = document.getElementById('sas-collect-btn');
      if (btn) btn.style.display = 'none';

      // Show log modal
      const modal = document.getElementById('sas-log-modal');
      const title = document.getElementById('sas-log-title');
      const lines = document.getElementById('sas-log-lines');
      if (modal && lines) {
        title.textContent = res.won ? '⚔ Expedition Complete!' : '💀 Expedition Failed';
        lines.innerHTML   = [
          ...res.log.map(l => `<div class="log-line">${l}</div>`),
          `<div class="reward-line">📜 +${res.rewards.xp} XP  💰 +${res.rewards.gold} gold  ❤ –${res.rewards.hpLost} HP</div>`,
          res.rewards.leveledUp ? `<div class="levelup">🌟 LEVEL UP! Now Level ${res.rewards.newLevel}</div>` : '',
        ].join('');
        modal.classList.add('visible');
      }

      // Update GameStateManager
      if (res.rewards.gold)     GameStateManager.addGold?.(res.rewards.gold);
      if (res.rewards.leveledUp) GameStateManager.setLevel?.(res.rewards.newLevel);

      await this._loadExpeditions();
    } catch(e) {
      console.error('Collect error:', e);
      GameStateManager.addNotification?.(`✗ ${e.message}`);
    }
  }

  // ── Back button ───────────────────────────────────────────────────────────
  _drawBackButton(w, h) {
    const btn = this.add.text(16, h - 40, '← Back to Town', {
      fontSize: '14px', color: '#FFD700',
      fontFamily: 'Georgia, serif',
      stroke: '#000', strokeThickness: 2,
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#FFF'));
    btn.on('pointerout',  () => btn.setColor('#FFD700'));
    btn.on('pointerup',   () => this.scene.start('TownScene'));
  }
}

function formatSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}
