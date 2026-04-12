import Phaser from 'phaser';
import BootScene            from '../scenes/BootScene.js';
import PreloadScene         from '../scenes/PreloadScene.js';
import LoginScene           from '../scenes/LoginScene.js';
import CharacterCreateScene from '../scenes/CharacterCreateScene.js';
import WorldMapScene        from '../scenes/WorldMapScene.js';
import TownScene            from '../scenes/TownScene.js';
import ArenaScene           from '../scenes/ArenaScene.js';
import TavernScene          from '../scenes/TavernScene.js';
import UIScene              from '../scenes/UIScene.js';

export const GameConfig = {
  type:            Phaser.AUTO,
  width:           1280,
  height:          720,
  parent:          'game-container',
  backgroundColor: '#0d0500',
  dom: {
    createContainer: true,
  },
  physics: {
    default: 'arcade',
    arcade:  { gravity: { y: 0 }, debug: false },
  },
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    PreloadScene,
    LoginScene,
    CharacterCreateScene,
    WorldMapScene,
    TownScene,
    ArenaScene,
    TavernScene,
    UIScene,
  ],
};
