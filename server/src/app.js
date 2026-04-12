const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { CLIENT_URL } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const characterRoutes = require('./routes/character.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const questRoutes      = require('./routes/quest.routes');
const expeditionRoutes = require('./routes/expedition.routes');
const errorHandler     = require('./middleware/errorHandler.middleware');

function createApp() {
  const app = express();

  app.use(cors({
    origin: CLIENT_URL,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', game: 'SaS Online' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/character', characterRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/quests',      questRoutes);
  app.use('/api/expeditions', expeditionRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
