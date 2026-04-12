/**
 * chat.socket.js
 * Real-time chat handler.
 *
 * Events (client → server):
 *   chat:join   { room }               — subscribe to a room
 *   chat:leave  { room }               — unsubscribe from a room
 *   chat:send   { room, text }         — broadcast a message
 *
 * Events (server → client):
 *   chat:history  [Message]            — last 50 messages on join
 *   chat:message  { username, text, timestamp, room }  — new message
 *   chat:system   { text, timestamp }  — server announcement
 *   chat:error    { message }          — rejection (spam, etc.)
 *
 * Anti-spam rules:
 *   • Max 3 messages per 5 seconds per socket
 *   • Max 300 characters per message
 *   • Simple profanity stub (extend BLOCKED_WORDS as needed)
 */

const ChatMessage  = require('../models/ChatMessage.model');
const User         = require('../models/User.model');

const BLOCKED_WORDS   = ['spam', 'hack', 'cheat'];     // extend as needed
const MAX_MSG_LEN     = 300;
const RATE_WINDOW_MS  = 5000;
const RATE_MAX_MSGS   = 3;
const HISTORY_LIMIT   = 50;

// socketId → [timestamp, ...] — persists for the lifetime of the connection
const rateLimits = new Map();

function isSpam(socketId) {
  const now  = Date.now();
  const prev = (rateLimits.get(socketId) || []).filter(t => now - t < RATE_WINDOW_MS);
  rateLimits.set(socketId, prev);
  return prev.length >= RATE_MAX_MSGS;
}

function recordMessage(socketId) {
  const prev = rateLimits.get(socketId) || [];
  prev.push(Date.now());
  rateLimits.set(socketId, prev);
}

function sanitize(text) {
  let out = text.trim().substring(0, MAX_MSG_LEN);
  BLOCKED_WORDS.forEach(w => {
    const re = new RegExp(`\\b${w}\\b`, 'gi');
    out = out.replace(re, '***');
  });
  return out;
}

function formatMessage(doc) {
  return {
    id:        doc._id,
    username:  doc.username,
    text:      doc.text,
    room:      doc.room,
    timestamp: doc.createdAt,
  };
}

module.exports = function registerChat(io, socket) {
  // ── Join room ────────────────────────────────────────────────────────────────
  socket.on('chat:join', async ({ room } = {}) => {
    if (!room) return;

    socket.join(room);

    // Deliver history
    try {
      const history = await ChatMessage
        .find({ room })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean();
      socket.emit('chat:history', history.reverse().map(formatMessage));
    } catch (err) {
      console.error('[Chat] history error:', err.message);
    }

    // System announce (to everyone else in the room)
    socket.to(room).emit('chat:system', {
      text:      `${socket.username || 'Someone'} entered ${room}`,
      timestamp: new Date(),
    });
  });

  // ── Leave room ───────────────────────────────────────────────────────────────
  socket.on('chat:leave', ({ room } = {}) => {
    if (!room) return;
    socket.leave(room);
  });

  // ── Send message ─────────────────────────────────────────────────────────────
  socket.on('chat:send', async ({ room, text } = {}) => {
    if (!room || !text) return;

    // Rate-limit check
    if (isSpam(socket.id)) {
      socket.emit('chat:error', { message: 'Slow down! Too many messages.' });
      return;
    }

    const cleaned = sanitize(text);
    if (!cleaned) return;

    recordMessage(socket.id);

    // Look up username (socket.username is set by presence.socket on connect)
    const username = socket.username || `User#${socket.userId?.toString().slice(-4)}`;

    // Persist
    let saved;
    try {
      saved = await ChatMessage.create({
        room,
        userId:   socket.userId,
        username,
        text:     cleaned,
      });
    } catch (err) {
      console.error('[Chat] save error:', err.message);
      return;
    }

    // Broadcast to everyone in the room (including sender)
    io.to(room).emit('chat:message', formatMessage(saved));
  });

  // ── Cleanup on disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    rateLimits.delete(socket.id);
  });
};
