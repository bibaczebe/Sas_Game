import Phaser from 'phaser';
import GameStateManager from '../managers/GameStateManager.js';
import SocketManager    from '../managers/SocketManager.js';
import StatBar          from '../ui/StatBar.js';
import { COLORS, xpToNextLevel } from '../config/Constants.js';


/**
 * UIScene — runs in parallel with all gameplay scenes.
 * Contains: top HUD bar, chat box.
 * Never stopped until logout.
 */
export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    const w = this.scale.width;

    this._drawTopHUD(w);
    this._drawChatPanel();
    this._bindSocketEvents();
    this._bindLogoutEvent();
  }

  // ── Top HUD bar ─────────────────────────────────────────────────────────────
  _drawTopHUD(w) {
    const h = 44;
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0500, 0.88);
    bg.fillRect(0, 0, w, h);
    bg.lineStyle(1, COLORS.BORDER_GOLD, 0.6);
    bg.lineBetween(0, h, w, h);

    // Character name + level
    this._hudName = this.add.text(14, 10, '', {
      fontSize: '15px', color: COLORS.TEXT_PRIMARY,
      fontFamily: 'Georgia, serif', fontStyle: 'bold',
    });

    // HP bar
    this.add.text(180, 10, 'HP', {
      fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif',
    });
    this._hudHP = new StatBar(this, 200, 22, {
      width: 160, height: 14, color: COLORS.HEALTH_RED, showNumbers: true,
    });

    // Energy bar
    this.add.text(380, 10, 'EN', {
      fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif',
    });
    this._hudStam = new StatBar(this, 400, 22, {
      width: 120, height: 14, color: COLORS.ENERGY_BLUE, showNumbers: false,
    });

    // XP bar
    this.add.text(540, 10, 'XP', {
      fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif',
    });
    this._hudXP = new StatBar(this, 560, 22, {
      width: 120, height: 10, color: COLORS.XP_GREEN, showNumbers: false,
    });

    // Gold
    this._hudGold = this.add.text(w - 14, 14, '', {
      fontSize: '15px', color: '#FFD700', fontFamily: 'Georgia, serif',
    }).setOrigin(1, 0);

    this._refreshHUD();

    // Refresh HUD periodically in case other scenes update GameStateManager
    this.time.addEvent({ delay: 1000, loop: true, callback: this._refreshHUD, callbackScope: this });
  }

  _refreshHUD() {
    const char = GameStateManager.character;
    if (!char) return;

    this._hudName.setText(`${char.name}  Lv.${char.level}`);
    this._hudGold.setText(`⚜ ${char.gold} gold`);

    const hp = GameStateManager.getHP();
    this._hudHP.setValue(hp.current, hp.max);

    const en = GameStateManager.getEnergy();
    this._hudStam.setValue(en.current, en.max);

    const xpNow  = char.currentXP ?? 0;
    const xpNext = xpToNextLevel(char.level ?? 1);
    this._hudXP.setValue(xpNow, xpNext);
  }

  // ── Chat panel (full DOM — avoids Phaser Scale.FIT positioning bugs) ─────────
  _drawChatPanel() {
    this._chatMessages = [];   // { username, text, color }
    this._chatMinimized = false;

    const panel = document.createElement('div');
    panel.id = 'sas-chat';
    panel.innerHTML = `
      <div id="sas-chat-header">
        <span id="sas-chat-title">Town Chat</span>
        <button id="sas-chat-toggle">−</button>
      </div>
      <div id="sas-chat-body">
        <div id="sas-chat-messages"></div>
        <div id="sas-chat-input-row">
          <input id="sas-chat-input" type="text" placeholder="Say something..." maxlength="200" autocomplete="off"/>
          <button id="sas-chat-send">SEND</button>
        </div>
      </div>
    `;
    panel.style.cssText = `
      position: fixed;
      bottom: 12px;
      left: 12px;
      width: 360px;
      background: rgba(13,5,0,0.92);
      border: 1px solid #5a3a0a;
      font-family: Georgia, serif;
      z-index: 9999;
      user-select: none;
      box-shadow: 0 2px 12px rgba(0,0,0,0.7);
    `;

    // Inject scoped styles once
    if (!document.getElementById('sas-chat-styles')) {
      const s = document.createElement('style');
      s.id = 'sas-chat-styles';
      s.textContent = `
        #sas-chat-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 5px 10px;
          border-bottom: 1px solid #3a2a00;
          cursor: pointer;
        }
        #sas-chat-title {
          font-size: 11px; color: #9B7A30; letter-spacing: 1px; text-transform: uppercase;
        }
        #sas-chat-toggle {
          background: none; border: none; color: #9B7A30;
          font-size: 18px; line-height: 1; cursor: pointer; padding: 0 2px;
        }
        #sas-chat-toggle:hover { color: #FFD700; }
        #sas-chat-body { display: flex; flex-direction: column; }
        #sas-chat-messages {
          height: 148px; overflow-y: auto; overflow-x: hidden;
          padding: 6px 10px; display: flex; flex-direction: column; justify-content: flex-end;
          gap: 2px;
        }
        #sas-chat-messages::-webkit-scrollbar { width: 4px; }
        #sas-chat-messages::-webkit-scrollbar-thumb { background: #3a2a00; border-radius: 2px; }
        .sas-msg { font-size: 12px; color: #CCCCCC; line-height: 1.4; word-break: break-word; }
        .sas-msg .sas-msg-name { color: #FFD700; font-weight: bold; }
        .sas-msg.sas-msg-self .sas-msg-name { color: #90EE90; }
        .sas-msg.sas-msg-system { color: #888; font-style: italic; }
        #sas-chat-input-row {
          display: flex; gap: 6px; padding: 6px 10px;
          border-top: 1px solid #2a1a00;
        }
        #sas-chat-input {
          flex: 1; background: #1a0d00; border: 1px solid #3a2a00;
          color: #FFD700; font-family: Georgia, serif; font-size: 13px;
          padding: 5px 8px; outline: none;
        }
        #sas-chat-input:focus { border-color: #8B6914; }
        #sas-chat-send {
          background: #5a2a00; border: 1px solid #8B4513; color: #FFD700;
          font-family: Georgia, serif; font-size: 12px; font-weight: bold;
          padding: 5px 12px; cursor: pointer; letter-spacing: 1px;
        }
        #sas-chat-send:hover { background: #7a3a00; }
        #sas-chat.minimized #sas-chat-body { display: none; }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(panel);
    this._chatPanel = panel;

    // Toggle minimize
    panel.querySelector('#sas-chat-toggle').addEventListener('click', () => {
      this._chatMinimized = !this._chatMinimized;
      panel.classList.toggle('minimized', this._chatMinimized);
      panel.querySelector('#sas-chat-toggle').textContent = this._chatMinimized ? '+' : '−';
    });
    panel.querySelector('#sas-chat-header').addEventListener('click', (e) => {
      if (e.target.id !== 'sas-chat-toggle') {
        panel.querySelector('#sas-chat-toggle').click();
      }
    });

    // Send on button click or Enter
    const sendFn = () => this._sendChatMessage();
    panel.querySelector('#sas-chat-send').addEventListener('click', sendFn);
    panel.querySelector('#sas-chat-input').addEventListener('keydown', (e) => {
      e.stopPropagation();     // prevent Phaser eating keystrokes
      if (e.key === 'Enter') sendFn();
    });
    panel.querySelector('#sas-chat-input').addEventListener('keyup', e => e.stopPropagation());
    panel.querySelector('#sas-chat-input').addEventListener('keypress', e => e.stopPropagation());
  }

  _addChatLine(username, message, isSelf = false) {
    const container = document.getElementById('sas-chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'sas-msg' + (isSelf ? ' sas-msg-self' : '');
    div.innerHTML = `<span class="sas-msg-name">${username}</span>: ${this._escapeHtml(message)}`;
    container.appendChild(div);

    // Keep max 40 messages
    while (container.children.length > 40) container.removeChild(container.firstChild);
    container.scrollTop = container.scrollHeight;
  }

  _addSystemLine(message) {
    const container = document.getElementById('sas-chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'sas-msg sas-msg-system';
    div.textContent = message;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  _escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async _sendChatMessage() {
    const input = document.getElementById('sas-chat-input');
    const text  = input?.value?.trim();
    if (!text) return;

    const username = GameStateManager.getName();
    SocketManager.emit('chat:send', { room: 'world', text });
    this._addChatLine(username, text, true);
    if (input) input.value = '';
  }

  // ── Socket events ────────────────────────────────────────────────────────────
  _bindSocketEvents() {
    this._onChatMessage = SocketManager.on('chat:message', (data) => {
      const isSelf = data.username === GameStateManager.getName();
      this._addChatLine(data.username, data.text, isSelf);
    }, this);

    this._onPlayerJoin = SocketManager.on('player:joined', (data) => {
      this._addSystemLine(`${data.username} entered the world.`);
    }, this);

    this._onPlayerLeave = SocketManager.on('player:left', (data) => {
      this._addSystemLine(`${data.username} left.`);
    }, this);
  }

  shutdown() {
    SocketManager.off('chat:message', this._onChatMessage);
    SocketManager.off('player:joined', this._onPlayerJoin);
    SocketManager.off('player:left', this._onPlayerLeave);
    // Remove chat panel DOM element
    const panel = document.getElementById('sas-chat');
    if (panel) panel.remove();
  }

  // ── Logout listener ──────────────────────────────────────────────────────────
  _bindLogoutEvent() {
    window.addEventListener('sas:logout', () => {
      SocketManager.disconnect();
      GameStateManager.clear();
      this.scene.stop('UIScene');
      this.scene.start('LoginScene');
    });
  }
}
