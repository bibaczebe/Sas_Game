require('dotenv').config();
const http = require('http');
const { createApp } = require('./src/app');
const { connectDB } = require('./src/config/db');
const { PORT } = require('./src/config/env');

async function start() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Attach Socket.io
  const { initSockets, getIO } = require('./src/sockets');
  initSockets(httpServer);

  // Plain WebSocket bridge for Godot clients (ws://localhost:PORT/ws)
  const { initWsBridge } = require('./src/sockets/ws_bridge');
  initWsBridge(httpServer, getIO);

  httpServer.listen(PORT, () => {
    console.log(`\n⚔️  SaS Game Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
