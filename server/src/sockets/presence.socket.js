/**
 * presence.socket.js
 *
 * Tracks which users are online and in which zone.
 * Fires events when users connect / disconnect / change zone.
 *
 * Events (server → client):
 *   presence:online   { count }                     — current online count
 *   presence:join     { username, zone }             — user entered zone
 *   presence:leave    { username, zone }             — user left zone
 *   presence:list     [{ username, zone }]           — snapshot of online users
 */

const User = require('../models/User.model');

// userId → { socketId, username, zone }
const onlineUsers = new Map();

function getCount() { return onlineUsers.size; }

module.exports = function registerPresence(io, socket) {
  // Resolve username and attach to socket on first connect
  User.findById(socket.userId).select('username').lean()
    .then(user => {
      if (!user) return;

      socket.username = user.username;

      const entry = { socketId: socket.id, username: user.username, zone: 'town' };
      onlineUsers.set(socket.userId.toString(), entry);

      // Announce to town room
      socket.join('town');
      socket.to('town').emit('presence:join', { username: user.username, zone: 'town' });

      // Send current online count to everyone
      io.emit('presence:online', { count: getCount() });
    })
    .catch(err => console.error('[Presence] resolve user error:', err.message));

  // ── Zone change ──────────────────────────────────────────────────────────────
  socket.on('zone:enter', ({ zone } = {}) => {
    if (!zone || !socket.username) return;
    const entry = onlineUsers.get(socket.userId?.toString());
    if (entry) entry.zone = zone;
    socket.join(zone);
  });

  socket.on('zone:leave', ({ zone } = {}) => {
    if (!zone) return;
    socket.leave(zone);
  });

  // ── Request online list ──────────────────────────────────────────────────────
  socket.on('presence:get', () => {
    const list = Array.from(onlineUsers.values()).map(({ username, zone }) => ({ username, zone }));
    socket.emit('presence:list', list);
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const entry = onlineUsers.get(socket.userId?.toString());
    if (entry) {
      socket.to('town').emit('presence:leave', { username: entry.username, zone: entry.zone });
      onlineUsers.delete(socket.userId.toString());
      io.emit('presence:online', { count: getCount() });
    }
  });
};
