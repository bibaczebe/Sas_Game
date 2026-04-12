import { io } from 'socket.io-client';
import AuthManager from './AuthManager.js';

/**
 * SocketManager — single persistent Socket.io connection.
 * Scenes register listeners in create() and MUST remove them in shutdown()
 * to prevent ghost listeners firing in the wrong scene.
 */
const SocketManager = {
  _socket: null,

  connect() {
    if (this._socket?.connected) return;

    this._socket = io('/', {
      auth:          { token: AuthManager.getToken() },
      autoConnect:   true,
      reconnection:  true,
      reconnectionDelay: 1000,
    });

    this._socket.on('connect', () => {
      console.log('[Socket] Connected:', this._socket.id);
    });
    this._socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });
    this._socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
  },

  disconnect() {
    this._socket?.disconnect();
    this._socket = null;
  },

  emit(event, data) {
    if (!this._socket?.connected) {
      console.warn('[Socket] emit skipped — not connected:', event);
      return;
    }
    this._socket.emit(event, data);
  },

  on(event, handler, context) {
    const bound = context ? handler.bind(context) : handler;
    this._socket?.on(event, bound);
    // Return the bound handler so the caller can pass it to off()
    return bound;
  },

  off(event, handler) {
    this._socket?.off(event, handler);
  },

  isConnected() {
    return this._socket?.connected ?? false;
  },
};

export default SocketManager;
