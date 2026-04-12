/**
 * GameStateManager — in-memory cache of the last-known server state.
 * Scenes read from here for instant display, then update after API calls confirm.
 */
const GameStateManager = {
  character:    null,
  inventory:    [],
  derivedStats: null,

  setSnapshot(data) {
    this.character    = data.character    || null;
    this.inventory    = data.inventory    || [];
    this.derivedStats = data.derivedStats || null;
  },

  updateCharacter(character) {
    this.character = character;
  },

  updateInventory(inventory) {
    this.inventory = inventory;
  },

  hasCharacter() {
    return !!this.character;
  },

  getGold() {
    return this.character?.gold ?? 0;
  },

  getLevel() {
    return this.character?.level ?? 1;
  },

  getName() {
    return this.character?.name ?? 'Hero';
  },

  getClass() {
    return this.character?.class ?? 'warrior';
  },

  getHP() {
    return {
      current: this.character?.currentHP ?? 0,
      max:     this.character?.maxHP ?? 100,
    };
  },

  getEnergy() {
    return {
      current: this.character?.currentEnergy ?? 30,
      max:     this.character?.maxEnergy     ?? 30,
    };
  },

  getRace() {
    return this.character?.race ?? 'human';
  },

  addGold(amount) {
    if (this.character) this.character.gold = (this.character.gold || 0) + amount;
  },

  setLevel(level) {
    if (this.character) this.character.level = level;
  },

  clear() {
    this.character    = null;
    this.inventory    = [];
    this.derivedStats = null;
  },
};

export default GameStateManager;
