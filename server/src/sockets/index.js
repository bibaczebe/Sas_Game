const { Server }   = require('socket.io');
const jwt           = require('jsonwebtoken');
const { JWT_SECRET, CLIENT_URL } = require('../config/env');
const registerChat     = require('./chat.socket');
const registerCombat   = require('./combat.socket');
const registerPresence = require('./presence.socket');

let io = null;

/**
 * Attach Socket.io to the given HTTP server and register all handlers.
 * Call once from server.js after creating the HTTP server.
 */
function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      CLIENT_URL,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout:  20000,
  });

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload    = jwt.verify(token, JWT_SECRET);
      socket.userId    = payload.userId;
      socket.userRole  = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ───────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}  user=${socket.userId}`);

    registerPresence(io, socket);
    registerChat(io, socket);
    registerCombat(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id}  reason=${reason}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSockets, getIO };
