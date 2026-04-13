'use strict';

/**
 * Plain WebSocket bridge for Godot clients.
 *
 * Godot's WebSocketPeer cannot use the Socket.io protocol, so we expose a
 * standard ws:// endpoint at /ws.  Messages are JSON:
 *
 *   Client → Server:  { "event": "chat:send", "data": { "room": "town", "text": "hi" } }
 *   Server → Client:  { "event": "chat:message", "data": { ... } }
 *
 * Internally this piggybacks on the existing Socket.io room system — the bridge
 * socket is a thin adapter that translates between the two protocols.
 */

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const url  = require('url');
const { JWT_SECRET } = require('../config/env');

// Simple in-memory presence: userId → Set<ws>
const connections = new Map();

// Rooms: roomName → Set<ws>
const rooms = new Map();

function initWsBridge(httpServer, getIO) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Extract JWT from query string ?token=xxx
    const parsedUrl = url.parse(req.url, true);
    const token = parsedUrl.query.token;

    let userId = null;
    let username = 'Unknown';

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        userId = payload.userId;
        username = payload.username || 'Player';
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }
    } else {
      ws.close(4001, 'Authentication required');
      return;
    }

    ws._userId   = userId;
    ws._username = username;
    ws._rooms    = new Set();

    console.log(`[WS] Connected: userId=${userId} username=${username}`);

    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId).add(ws);

    // ── Incoming messages ────────────────────────────────────────────────────
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const event = msg.event;
      const data  = msg.data || {};

      switch (event) {
        case 'chat:join':
          _joinRoom(ws, data.room);
          break;

        case 'chat:leave':
          _leaveRoom(ws, data.room);
          break;

        case 'chat:send':
          _handleChatSend(ws, data, getIO);
          break;

        default:
          // Forward to Socket.io if a handler knows this event
          // (combat actions, etc. — future extension)
          break;
      }
    });

    // ── Close ────────────────────────────────────────────────────────────────
    ws.on('close', () => {
      console.log(`[WS] Disconnected: userId=${userId}`);
      for (const room of ws._rooms) {
        _leaveRoom(ws, room, true);
      }
      const userConns = connections.get(userId);
      if (userConns) {
        userConns.delete(ws);
        if (userConns.size === 0) connections.delete(userId);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
    });

    // Confirm connection
    _send(ws, 'connected', { message: 'Welcome, ' + username });
  });

  // ── Socket.io → WS broadcast ─────────────────────────────────────────────
  // When Socket.io broadcasts a chat:message to a room, we mirror it to any
  // WS clients in the same room.
  const io = getIO();
  if (io) {
    // We hook into the emit path by listening on a special internal event.
    // Socket.io fires 'chat:message' with room in data — we relay here.
    io.of('/').adapter.on('broadcast', ({ packet, opts }) => {
      if (packet.type !== 2) return;  // EVENT type
      const [event, data] = packet.data;
      const targetRooms = opts.rooms;
      if (!targetRooms || targetRooms.size === 0) return;

      for (const room of targetRooms) {
        broadcastToRoom(room, event, data);
      }
    });
  }

  console.log('[WS] Plain WebSocket bridge active at /ws');
  return wss;
}

// ── Room helpers ──────────────────────────────────────────────────────────────

function _joinRoom(ws, room) {
  if (!room) return;
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
  ws._rooms.add(room);
  _send(ws, 'chat:joined', { room });
}

function _leaveRoom(ws, room, silent = false) {
  if (!room) return;
  const set = rooms.get(room);
  if (set) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(room);
  }
  ws._rooms.delete(room);
  if (!silent) _send(ws, 'chat:left', { room });
}

function _handleChatSend(ws, data, getIO) {
  const room = data.room;
  const text = (data.text || '').substring(0, 300).trim();
  if (!room || !text) return;

  // Save to DB + broadcast via Socket.io (re-use existing chat handler)
  const io = getIO();
  if (io) {
    // Emit as if coming from a server-side source so it gets saved + broadcast
    io.to(room).emit('chat:message', {
      room,
      userId:   ws._userId,
      username: ws._username,
      text,
      createdAt: new Date().toISOString(),
    });
  }

  // Also broadcast directly to other WS clients in this room
  broadcastToRoom(room, 'chat:message', {
    room,
    username: ws._username,
    text,
    createdAt: new Date().toISOString(),
  }, ws);
}

function broadcastToRoom(room, event, data, exclude = null) {
  const set = rooms.get(room);
  if (!set) return;
  for (const client of set) {
    if (client !== exclude && client.readyState === 1 /* OPEN */) {
      _send(client, event, data);
    }
  }
}

function _send(ws, event, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ event, data }));
  }
}

module.exports = { initWsBridge };
