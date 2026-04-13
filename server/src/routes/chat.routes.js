'use strict';

const express      = require('express');
const router       = express.Router();
const ChatMessage  = require('../models/ChatMessage.model');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/chat/history?room=town
// Returns last 50 messages for a room — used by Godot WS clients on reconnect.
router.get('/history', authenticate, async (req, res) => {
  const room = req.query.room;
  if (!room) return res.status(400).json({ message: 'room query param required' });

  try {
    const messages = await ChatMessage
      .find({ room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      messages: messages.reverse().map(m => ({
        id:        m._id,
        username:  m.username,
        text:      m.text,
        room:      m.room,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
