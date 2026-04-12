const Inventory = require('../models/Inventory.model');
const Item      = require('../models/Item.model');
const Character = require('../models/Character.model');

// GET /api/inventory
async function getInventory(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const inventory = await Inventory.find({ characterId: character._id })
      .populate('itemId')
      .sort({ acquiredAt: -1 });

    res.json({ inventory });
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/equip  { inventoryEntryId }
async function equip(req, res, next) {
  try {
    const { inventoryEntryId } = req.body;
    if (!inventoryEntryId) {
      return res.status(400).json({ error: 'inventoryEntryId is required' });
    }

    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const entry = await Inventory.findById(inventoryEntryId).populate('itemId');
    if (!entry || !entry.characterId.equals(character._id)) {
      return res.status(404).json({ error: 'Item not found in your inventory' });
    }

    const item = entry.itemId;

    if (item.levelRequirement > character.level) {
      return res.status(400).json({ error: `Requires level ${item.levelRequirement}` });
    }
    if (item.classRestriction.length > 0 && !item.classRestriction.includes(character.class)) {
      return res.status(400).json({ error: `Your class cannot equip this item` });
    }

    const slot = item.slot;
    if (!['head', 'chest', 'legs', 'weapon', 'offhand'].includes(slot)) {
      return res.status(400).json({ error: 'This item cannot be equipped' });
    }

    character.equippedItems[slot] = item._id;
    await character.save();

    res.json({ character, message: `Equipped: ${item.name}` });
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/unequip  { slot }
async function unequip(req, res, next) {
  try {
    const { slot } = req.body;
    const VALID_SLOTS = ['head', 'chest', 'legs', 'weapon', 'offhand'];

    if (!VALID_SLOTS.includes(slot)) {
      return res.status(400).json({ error: `Invalid slot. Choose: ${VALID_SLOTS.join(', ')}` });
    }

    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'Character not found' });

    if (!character.equippedItems[slot]) {
      return res.status(400).json({ error: `Nothing equipped in ${slot}` });
    }

    character.equippedItems[slot] = null;
    await character.save();

    res.json({ character, message: `Unequipped ${slot} slot` });
  } catch (err) {
    next(err);
  }
}

// ── Internal helpers (used by other controllers) ──────────────────────────────

/**
 * Add item to a character's inventory (stacks if already owned).
 */
async function addItem(characterId, itemId, quantity = 1) {
  return Inventory.findOneAndUpdate(
    { characterId, itemId },
    { $inc: { quantity }, $setOnInsert: { acquiredAt: new Date() } },
    { upsert: true, new: true }
  );
}

/**
 * Remove item quantity from inventory. Deletes the row when quantity hits 0.
 */
async function removeItem(characterId, itemId, quantity = 1) {
  const entry = await Inventory.findOne({ characterId, itemId });
  if (!entry) throw new Error('Item not in inventory');

  if (entry.quantity <= quantity) {
    await entry.deleteOne();
  } else {
    entry.quantity -= quantity;
    await entry.save();
  }
}

module.exports = { getInventory, equip, unequip, addItem, removeItem };
