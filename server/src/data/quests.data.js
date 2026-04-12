/**
 * quests.data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Static quest catalog. 12 quests across 5 level tiers.
 *
 * Effect fields:
 *   hp       — HP delta (negative = damage)
 *   gold     — gold delta
 *   xp       — XP granted at the END of the quest (stages add bonus XP)
 *   statBuff — { stat: string, value: number } — permanent base stat increase
 *   item     — item name to grant from catalog (future — null for now)
 *   end      — if true, ends the quest immediately on this choice
 *   flee     — quest failed (no reward)
 *
 * Stage types:
 *   'choice'  — player picks from 2–3 options, each leading to nextStage
 *   'outcome' — narrative result, leads to a final stage or ends
 *   'end'     — terminal stage; triggers reward
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = [

  // ═══════════════════════════════════════════════════════ TIER 1 (Level 1+) ═══

  {
    id: 'goblin_den',
    name: "Goblin's Den",
    description: "A pack of goblins has been raiding supply caravans. Track them to their den and deal with the threat.",
    levelRequirement: 1,
    type: 'side',
    baseReward: { xp: 80, gold: 40 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "You find the goblin den hidden beneath a mossy boulder. Sounds of cackling echo inside. How do you proceed?",
        choices: [
          {
            text: '⚔ Charge straight in, weapons drawn',
            effects: { hp: -15, xp: 10 },
            nextStage: 'fought_way_in',
          },
          {
            text: '🕵 Scout the perimeter first',
            effects: { xp: 5 },
            nextStage: 'scouted',
          },
          {
            text: '💨 Toss a smoke bomb and slip away',
            effects: { xp: 0, end: true, flee: true },
            nextStage: null,
          },
        ],
      },
      {
        id: 'fought_way_in',
        type: 'choice',
        text: "You burst inside and scatter the goblins! A larger goblin chieftain steps forward, snarling. Beside him is a locked chest.",
        choices: [
          {
            text: '⚔ Duel the chieftain',
            effects: { hp: -20, gold: 30, xp: 20 },
            nextStage: 'victory',
          },
          {
            text: '🏃 Grab the chest and run',
            effects: { hp: -10, gold: 50, xp: 5 },
            nextStage: 'victory',
          },
        ],
      },
      {
        id: 'scouted',
        type: 'choice',
        text: "You spot a weak point in the den — a side tunnel. You also notice a goblin carrying a key ring.",
        choices: [
          {
            text: '🗝 Steal the key ring silently (AGI check)',
            effects: { gold: 60, xp: 25 },
            nextStage: 'victory',
          },
          {
            text: '⚔ Enter through the side tunnel',
            effects: { hp: -8, xp: 15 },
            nextStage: 'victory',
          },
        ],
      },
      {
        id: 'victory',
        type: 'end',
        text: "The goblin threat is eliminated. You secure the den's loot and leave victorious.",
        effects: {},
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'wandering_merchant',
    name: "The Wandering Merchant",
    description: "A merchant's cart has overturned on the road. He begs for your help, but the goods look valuable.",
    levelRequirement: 1,
    type: 'side',
    baseReward: { xp: 60, gold: 30 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "Old Marten is pinned under his cart, crying out. Several crates of exotic goods have spilled onto the road.",
        choices: [
          {
            text: '🤝 Help him up freely',
            effects: { xp: 15, statBuff: { stat: 'charisma', value: 1 } },
            nextStage: 'helped',
          },
          {
            text: '💰 Demand payment before helping',
            effects: { gold: 25, xp: 5 },
            nextStage: 'helped',
          },
          {
            text: '😈 Pocket some goods while he\'s trapped',
            effects: { gold: 60, hp: 0, xp: 0 },
            nextStage: 'robbed',
          },
        ],
      },
      {
        id: 'helped',
        type: 'choice',
        text: "Marten is grateful. He opens a hidden compartment and offers you a reward — plus warns you about bandits ahead.",
        choices: [
          {
            text: '📦 Accept the extra supply crate',
            effects: { gold: 20, xp: 10 },
            nextStage: 'end_good',
          },
          {
            text: '🗺 Take the bandit intel instead',
            effects: { xp: 30 },
            nextStage: 'end_good',
          },
        ],
      },
      {
        id: 'robbed',
        type: 'end',
        text: "You escape with the goods, but you feel uneasy. Word of this may spread.",
        effects: { hp: 0 },
      },
      {
        id: 'end_good',
        type: 'end',
        text: "Marten thanks you warmly. 'Safe travels, hero.'",
        effects: {},
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'bard_challenge',
    name: "The Bard's Challenge",
    description: "A witty bard at the tavern challenges all comers to a battle of wits. The prize is a purse of gold.",
    levelRequirement: 1,
    type: 'side',
    baseReward: { xp: 50, gold: 35 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "Finn the Bard stands on the bar, lyre in hand. 'Answer my riddle correctly and win my gold. Fail, and you buy me a drink!'",
        choices: [
          {
            text: '🎶 Accept the challenge confidently (CHA check)',
            effects: { gold: 50, xp: 20 },
            nextStage: 'won',
          },
          {
            text: '🤔 Think carefully before answering',
            effects: { gold: 25, xp: 15 },
            nextStage: 'won',
          },
          {
            text: '🍺 Buy him a drink without playing',
            effects: { gold: -8, xp: 10, statBuff: { stat: 'charisma', value: 1 } },
            nextStage: 'bought_drink',
          },
        ],
      },
      {
        id: 'won',
        type: 'end',
        text: "You answer correctly! The crowd cheers. Finn laughs and hands over the gold.",
        effects: {},
      },
      {
        id: 'bought_drink',
        type: 'end',
        text: "Finn raises his mug. 'A man who knows how to make friends — worth more than gold.'",
        effects: {},
      },
    ],
  },

  // ═══════════════════════════════════════════════════════ TIER 2 (Level 2+) ═══

  {
    id: 'haunted_crossroads',
    name: "Haunted Crossroads",
    description: "Travellers report a ghost blocking the crossroads at night. Investigate and put it to rest.",
    levelRequirement: 2,
    type: 'side',
    baseReward: { xp: 120, gold: 55 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "At midnight, a translucent figure floats in the road. It was once a soldier, still clutching a shattered sword. It turns to face you with hollow eyes.",
        choices: [
          {
            text: '🕯 Speak to it calmly',
            effects: { xp: 10 },
            nextStage: 'dialogue',
          },
          {
            text: '⚔ Attack immediately',
            effects: { hp: -25, xp: 5 },
            nextStage: 'fought',
          },
          {
            text: '🏃 Run — this is not your problem',
            effects: { end: true, flee: true },
            nextStage: null,
          },
        ],
      },
      {
        id: 'dialogue',
        type: 'choice',
        text: "The ghost was betrayed by its captain, buried without honour. It needs its sword piece returned to the barracks. You spot the broken hilt in the mud nearby.",
        choices: [
          {
            text: '🗡 Return the hilt to the barracks yourself',
            effects: { xp: 40, statBuff: { stat: 'charisma', value: 1 } },
            nextStage: 'resolved',
          },
          {
            text: '💰 Demand the ghost\'s hidden loot first',
            effects: { gold: 70, xp: 10, hp: -10 },
            nextStage: 'resolved',
          },
        ],
      },
      {
        id: 'fought',
        type: 'end',
        text: "After a desperate fight the ghost dissipates. Cold and exhausted, you limp back to town.",
        effects: { hp: -15 },
      },
      {
        id: 'resolved',
        type: 'end',
        text: "The ghost sighs with relief and fades into golden light. The crossroads are clear.",
        effects: {},
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'bandit_ambush',
    name: "Bandit's Ambush",
    description: "You're ambushed on the forest road by a band of brigands.",
    levelRequirement: 2,
    type: 'side',
    baseReward: { xp: 100, gold: 60 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "Six bandits drop from the trees. Their leader grins. 'Your gold or your life, hero.'",
        choices: [
          {
            text: '⚔ Fight your way through',
            effects: { hp: -30, xp: 20 },
            nextStage: 'fought',
          },
          {
            text: '🎭 Bluff — claim to be a royal tax collector',
            effects: { xp: 15 },
            nextStage: 'bluffed',
          },
          {
            text: '💰 Pay them off',
            effects: { gold: -40, xp: 5 },
            nextStage: 'paid',
          },
        ],
      },
      {
        id: 'fought',
        type: 'end',
        text: "You scatter the bandits and claim their camp stash.",
        effects: { gold: 80 },
      },
      {
        id: 'bluffed',
        type: 'choice',
        text: "The leader hesitates. 'Prove it.' He demands to see your writ of authority.",
        choices: [
          {
            text: '📜 Improvise a convincing document (CHA)',
            effects: { gold: 30, xp: 20 },
            nextStage: 'paid',
          },
          {
            text: '⚔ Drop the act and fight',
            effects: { hp: -20 },
            nextStage: 'fought',
          },
        ],
      },
      {
        id: 'paid',
        type: 'end',
        text: "You slip away. Not heroic, but alive.",
        effects: {},
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'sea_wreck',
    name: "Sea Wreck Salvage",
    description: "A ship ran aground in the cove. Survivors beg for help — but the wreck contains dangerous cargo.",
    levelRequirement: 2,
    type: 'side',
    baseReward: { xp: 110, gold: 65 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "The merchant ship 'Golden Albatross' is half-submerged. Three sailors wave desperately. Below deck you can see a locked strongbox glinting through the water.",
        choices: [
          {
            text: '🏊 Dive for the strongbox first',
            effects: { hp: -12, gold: 90, xp: 10 },
            nextStage: 'end_loot',
          },
          {
            text: '🤝 Rescue the sailors first',
            effects: { xp: 30, statBuff: { stat: 'charisma', value: 1 } },
            nextStage: 'rescued',
          },
        ],
      },
      {
        id: 'rescued',
        type: 'choice',
        text: "The grateful sailors reveal the cargo is cursed — a smuggler's idol. One sailor offers to guide you to a fence who'll pay well.",
        choices: [
          {
            text: '💰 Sell the idol to the fence',
            effects: { gold: 100, hp: -5 },
            nextStage: 'end_loot',
          },
          {
            text: '🌊 Throw the idol into the sea',
            effects: { xp: 40, statBuff: { stat: 'endurance', value: 1 } },
            nextStage: 'end_pure',
          },
        ],
      },
      {
        id: 'end_loot',
        type: 'end',
        text: "Gold in hand, you leave the wreck behind. Practical.",
        effects: {},
      },
      {
        id: 'end_pure',
        type: 'end',
        text: "The idol sinks. Something feels lighter in your chest.",
        effects: {},
      },
    ],
  },

  // ═══════════════════════════════════════════════════════ TIER 3 (Level 3+) ═══

  {
    id: 'oasis_spring',
    name: "The Oasis Spring",
    description: "Locals speak of a magical spring deep in the desert that heals all wounds. Find it.",
    levelRequirement: 3,
    type: 'side',
    baseReward: { xp: 150, gold: 50 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "After two days in the desert you find it — a shimmering pool beneath a lone palm tree. A dying traveller is already there, barely conscious.",
        choices: [
          {
            text: '💧 Drink from the spring yourself first',
            effects: { hp: 999, xp: 10 },    // 999 = full heal (capped to maxHP in engine)
            nextStage: 'drank',
          },
          {
            text: '🤲 Give the spring water to the traveller first',
            effects: { xp: 30, statBuff: { stat: 'endurance', value: 1 } },
            nextStage: 'gave',
          },
        ],
      },
      {
        id: 'drank',
        type: 'end',
        text: "The magical water fills you with energy. Your wounds close. The traveller also sips and recovers.",
        effects: {},
      },
      {
        id: 'gave',
        type: 'choice',
        text: "The traveller recovers and introduces himself as a retired alchemist. He offers you a formula for a healing potion.",
        choices: [
          {
            text: '📜 Take the formula',
            effects: { xp: 20, hp: 50 },
            nextStage: 'end_formula',
          },
          {
            text: '💧 Drink the spring yourself too',
            effects: { hp: 999 },
            nextStage: 'end_formula',
          },
        ],
      },
      {
        id: 'end_formula',
        type: 'end',
        text: "You leave the oasis restored. The desert winds feel almost gentle.",
        effects: {},
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'old_king_ruins',
    name: "Ruins of the Old King",
    description: "Ancient ruins hide the treasury of a forgotten king. Traps abound, but so do riches.",
    levelRequirement: 3,
    type: 'side',
    baseReward: { xp: 180, gold: 100 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "The entrance hall is lined with trigger plates. A skeleton clutches a map of the interior.",
        choices: [
          {
            text: "🗺 Study the skeleton's map carefully",
            effects: { xp: 15 },
            nextStage: 'mapped',
          },
          {
            text: '💨 Sprint through ignoring traps (END check)',
            effects: { hp: -35, xp: 5 },
            nextStage: 'inner_chamber',
          },
        ],
      },
      {
        id: 'mapped',
        type: 'choice',
        text: "The map reveals three paths: treasury (dangerous), throne room (cursed), crypt (sealed).",
        choices: [
          {
            text: '💰 Take the treasury path',
            effects: { gold: 150, hp: -20 },
            nextStage: 'inner_chamber',
          },
          {
            text: '👑 Explore the throne room',
            effects: { xp: 40, statBuff: { stat: 'intelligence', value: 1 } },
            nextStage: 'inner_chamber',
          },
          {
            text: '🔒 Unseal the crypt (very dangerous)',
            effects: { hp: -40, gold: 200 },
            nextStage: 'inner_chamber',
          },
        ],
      },
      {
        id: 'inner_chamber',
        type: 'end',
        text: "You emerge from the ruins battered but wealthy. Not all who entered were so lucky.",
        effects: {},
      },
    ],
  },

  // ═══════════════════════════════════════════════════════ TIER 4 (Level 4+) ═══

  {
    id: 'arena_champion',
    name: "The Arena Champion",
    description: "Brutus the Undefeated has held the arena championship for seven years. Could you be the one?",
    levelRequirement: 4,
    type: 'main',
    baseReward: { xp: 300, gold: 200 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "You enter the arena to thunderous booing. Brutus is enormous — twice your size, scarred from a hundred fights. The crowd chants his name.",
        choices: [
          {
            text: '⚔ Engage immediately — show no fear',
            effects: { hp: -40, xp: 20 },
            nextStage: 'mid_fight',
          },
          {
            text: '🛡 Defensive stance — wait for an opening',
            effects: { hp: -20, xp: 15 },
            nextStage: 'mid_fight',
          },
        ],
      },
      {
        id: 'mid_fight',
        type: 'choice',
        text: "You're both bloodied. The crowd has gone silent. Brutus stumbles — an opening!",
        choices: [
          {
            text: '💥 Power Strike — everything on this blow',
            effects: { hp: -15, xp: 30 },
            nextStage: 'victory',
          },
          {
            text: '🗡 Quick combination — precise strikes',
            effects: { hp: -20, xp: 25 },
            nextStage: 'victory',
          },
        ],
      },
      {
        id: 'victory',
        type: 'end',
        text: "Brutus falls. The crowd erupts. You are the new Arena Champion.",
        effects: { statBuff: { stat: 'strength', value: 2 } },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'plague_village',
    name: "Plague in Eastbrook",
    description: "The village of Eastbrook is quarantined. A herbalist inside claims to have a cure, but needs rare ingredients.",
    levelRequirement: 4,
    type: 'side',
    baseReward: { xp: 250, gold: 80 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "Guards block the road. 'None may enter.' Behind them, a boy is pressed against the fence, crying. Inside you see smoke from what must be the herbalist's cottage.",
        choices: [
          {
            text: '⚔ Force your way past the guards',
            effects: { hp: -20, xp: 10 },
            nextStage: 'inside',
          },
          {
            text: '🗣 Negotiate — explain you can help',
            effects: { xp: 20 },
            nextStage: 'inside',
          },
          {
            text: '🏃 Turn away — the risk is too high',
            effects: { end: true, flee: true },
            nextStage: null,
          },
        ],
      },
      {
        id: 'inside',
        type: 'choice',
        text: "Herbalist Sera needs three ingredients: iron moss (nearby swamp), sun lotus (dangerous cliff), nightshade root (graveyard at midnight). You can only fetch one before dark.",
        choices: [
          {
            text: '🌿 Iron moss — safest but weakest cure',
            effects: { hp: -5, xp: 20, statBuff: { stat: 'endurance', value: 1 } },
            nextStage: 'cure',
          },
          {
            text: '🌸 Sun lotus — risky climb',
            effects: { hp: -25, xp: 40 },
            nextStage: 'cure',
          },
          {
            text: '💀 Nightshade root — terrifying graveyard',
            effects: { hp: -35, xp: 50, gold: 40 },
            nextStage: 'cure',
          },
        ],
      },
      {
        id: 'cure',
        type: 'end',
        text: "Sera brews the cure. It saves most of the villagers. The boy from the gate runs up and embraces you.",
        effects: { statBuff: { stat: 'charisma', value: 1 } },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════ TIER 5 (Level 5+) ═══

  {
    id: 'dragon_cave',
    name: "Dragon's Cave",
    description: "A young dragon terrorises the mountain pass. Slay it, tame it, or negotiate.",
    levelRequirement: 5,
    type: 'main',
    baseReward: { xp: 500, gold: 350 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "The cave mouth reeks of sulphur. A half-eaten cart blocks the entrance. Inside, golden eyes blink at you.",
        choices: [
          {
            text: '⚔ Draw your weapon — kill the beast',
            effects: { hp: -50, xp: 30 },
            nextStage: 'combat',
          },
          {
            text: '🐉 Speak — not all dragons are mindless',
            effects: { xp: 20 },
            nextStage: 'negotiation',
          },
          {
            text: '🍖 Offer the cart\'s food as tribute',
            effects: { xp: 15, gold: -20 },
            nextStage: 'negotiation',
          },
        ],
      },
      {
        id: 'combat',
        type: 'choice',
        text: "The dragon fights ferociously! One eye is now scarred. It pauses, perhaps considering surrender.",
        choices: [
          {
            text: '💀 Finish it — no mercy',
            effects: { hp: -40, gold: 250, xp: 40 },
            nextStage: 'slain',
          },
          {
            text: '🕊 Offer mercy — lower your weapon',
            effects: { xp: 60, statBuff: { stat: 'charisma', value: 2 } },
            nextStage: 'negotiation',
          },
        ],
      },
      {
        id: 'negotiation',
        type: 'choice',
        text: "The dragon speaks! 'My hoard is cursed. Break the curse and I'll abandon this pass.' It shows you a black gem at the cave's heart.",
        choices: [
          {
            text: '💎 Smash the cursed gem',
            effects: { hp: -20, xp: 60, statBuff: { stat: 'intelligence', value: 2 } },
            nextStage: 'pact',
          },
          {
            text: '💰 Steal the whole hoard and run',
            effects: { hp: -60, gold: 400 },
            nextStage: 'slain',
          },
        ],
      },
      {
        id: 'slain',
        type: 'end',
        text: "The dragon is dead. You claim the hoard. The mountain pass is clear. A legendary deed.",
        effects: {},
      },
      {
        id: 'pact',
        type: 'end',
        text: "The curse breaks. The dragon bows its great head and flies south. You made an unlikely ally today.",
        effects: { statBuff: { stat: 'charisma', value: 1 } },
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'dark_cult',
    name: "The Dark Cult",
    description: "People vanish near the old temple. A masked cult performs dangerous rituals inside.",
    levelRequirement: 5,
    type: 'main',
    baseReward: { xp: 450, gold: 280 },
    stages: [
      {
        id: 'start',
        type: 'choice',
        text: "The temple throbs with dark energy. Robed figures chant around a pit. Three captives are bound at the edge. You have the element of surprise.",
        choices: [
          {
            text: '⚔ Charge in — free the captives first',
            effects: { hp: -35, xp: 20 },
            nextStage: 'fight',
          },
          {
            text: '🕵 Sneak in and steal the ritual tome',
            effects: { xp: 25 },
            nextStage: 'infiltrated',
          },
          {
            text: '🔥 Collapse the entrance trapping them inside',
            effects: { hp: -10, xp: 10 },
            nextStage: 'collapsed',
          },
        ],
      },
      {
        id: 'fight',
        type: 'choice',
        text: "The cult leader raises a dark staff. 'Kill the intruder!' Cultists swarm you but the captives are free.",
        choices: [
          {
            text: '💥 Destroy the ritual altar',
            effects: { hp: -40, xp: 50, statBuff: { stat: 'strength', value: 1 } },
            nextStage: 'end_cleansed',
          },
          {
            text: '🏃 Get the captives and run',
            effects: { hp: -20, xp: 30 },
            nextStage: 'end_fled',
          },
        ],
      },
      {
        id: 'infiltrated',
        type: 'end',
        text: "You steal the tome, ending the ritual. The cult scatters without their dark guide.",
        effects: { gold: 120, statBuff: { stat: 'intelligence', value: 2 } },
      },
      {
        id: 'collapsed',
        type: 'end',
        text: "The entrance crumbles. The ritual is ended. The cultists are sealed inside — temporarily.",
        effects: { xp: 20 },
      },
      {
        id: 'end_cleansed',
        type: 'end',
        text: "The altar shatters. A wave of light expels the darkness. The temple is cleansed.",
        effects: {},
      },
      {
        id: 'end_fled',
        type: 'end',
        text: "You escape with the captives. Not a clean victory, but lives were saved.",
        effects: {},
      },
    ],
  },

];
