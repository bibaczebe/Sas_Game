import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig.js';

// Boot the game
const game = new Phaser.Game(GameConfig);

// Make it accessible for debugging
if (import.meta.env.DEV) {
  window.__game = game;
}
