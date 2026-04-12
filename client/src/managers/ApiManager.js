import { API_URL } from '../config/Constants.js';
import AuthManager from './AuthManager.js';

/**
 * ApiManager — all HTTP calls go through here.
 * Automatically injects the Authorization header and handles
 * 401 / token-expired responses by attempting a refresh.
 */
const ApiManager = {
  _refreshPromise: null, // prevent parallel refresh attempts

  async _fetch(endpoint, options = {}, retry = true) {
    const url     = `${API_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    const token = AuthManager.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers, credentials: 'include' });

    // Token expired — try to refresh once
    if (res.status === 401 && retry) {
      const refreshed = await this._tryRefresh();
      if (refreshed) return this._fetch(endpoint, options, false);
      AuthManager.clear();
      window.dispatchEvent(new Event('sas:logout'));
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  async _tryRefresh() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method:      'POST',
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (data.accessToken) {
          AuthManager.setToken(data.accessToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => { this._refreshPromise = null; });

    return this._refreshPromise;
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  register(username, email, password) {
    return this._fetch('/auth/register', {
      method: 'POST',
      body:   JSON.stringify({ username, email, password }),
    });
  },

  login(username, password) {
    return this._fetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ username, password }),
    });
  },

  logout() {
    return this._fetch('/auth/logout', { method: 'POST' });
  },

  getMe() {
    return this._fetch('/auth/me');
  },

  // ── Character ─────────────────────────────────────────────────────────────
  createCharacter(name, charClass, race = 'human', appearance = {}) {
    return this._fetch('/character', {
      method: 'POST',
      body:   JSON.stringify({ name, class: charClass, race, appearance }),
    });
  },

  // ── Expeditions ───────────────────────────────────────────────────────────
  get(endpoint) {
    return this._fetch(endpoint);
  },

  post(endpoint, body) {
    return this._fetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  getCharacter() {
    return this._fetch('/character');
  },

  getSnapshot() {
    return this._fetch('/character/snapshot');
  },

  allocateStats(stat, amount = 1) {
    return this._fetch('/character/allocate-stats', {
      method: 'POST',
      body:   JSON.stringify({ stat, amount }),
    });
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  getInventory() {
    return this._fetch('/inventory');
  },

  equipItem(inventoryEntryId) {
    return this._fetch('/inventory/equip', {
      method: 'POST',
      body:   JSON.stringify({ inventoryEntryId }),
    });
  },

  unequipSlot(slot) {
    return this._fetch('/inventory/unequip', {
      method: 'POST',
      body:   JSON.stringify({ slot }),
    });
  },
};

export default ApiManager;
