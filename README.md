# Sword and Sandals Online

Browser-based turn-based RPG. Inspired by Sword and Sandals (combat) and Shakes & Fidget (online persistence).

---

## HOW TO RUN

Node.js must be installed. Open **two PowerShell / Windows Terminal tabs**.

### Tab 1 — Server
```powershell
cd "C:\Users\bibac\OneDrive\Desktop\SaS game\server"
npm install
npm run dev
```
Server starts at **http://localhost:3001**

### Tab 2 — Client
```powershell
cd "C:\Users\bibac\OneDrive\Desktop\SaS game\client"
npm install
npm run dev
```
Client starts at **http://localhost:5173** — open this in the browser.

### Test combat simulation (no DB needed)
```powershell
cd "C:\Users\bibac\OneDrive\Desktop\SaS game\server"
node src/scripts/simulateCombat.js
```

---

## Project Structure

```
SaS game/
├── server/
│   ├── server.js                        ← entry point
│   └── src/
│       ├── app.js                       ← Express factory
│       ├── config/         db, env, constants
│       ├── models/         User, Character, Item, Inventory, ChatMessage,
│       │                   CharacterQuest
│       ├── middleware/     auth (JWT), errorHandler, rateLimiter
│       ├── services/
│       │   ├── CombatEngine.service.js  ← authoritative turn-based engine
│       │   ├── QuestEngine.service.js   ← quest state machine
│       │   └── LevelingService.js       ← XP / level-up
│       ├── sockets/
│       │   ├── index.js                 ← Socket.io init + JWT auth
│       │   ├── chat.socket.js           ← real-time chat, anti-spam
│       │   ├── combat.socket.js         ← combat events
│       │   └── presence.socket.js      ← online/offline tracking
│       ├── data/
│       │   └── quests.data.js           ← 12 hand-crafted quests
│       ├── controllers/    auth, character, inventory, quest
│       └── routes/         auth, character, inventory, quest
└── client/
    └── src/
        ├── scenes/         Boot, Preload, Login, CharacterCreate,
        │                   Town, Arena, UIScene
        └── managers/       Api, Auth, GameState, Socket
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/refresh` | cookie | Refresh token |
| POST | `/api/auth/logout` | JWT | Logout |
| GET  | `/api/auth/me` | JWT | Current user |
| POST | `/api/character` | JWT | Create character |
| GET  | `/api/character` | JWT | Get character |
| GET  | `/api/character/snapshot` | JWT | Full state snapshot |
| POST | `/api/character/allocate-stats` | JWT | Spend stat points |
| GET  | `/api/inventory` | JWT | List inventory |
| POST | `/api/inventory/equip` | JWT | Equip item |
| POST | `/api/inventory/unequip` | JWT | Unequip slot |
| GET  | `/api/quests` | JWT | List available quests |
| POST | `/api/quests/:id/start` | JWT | Start quest |
| POST | `/api/quests/:id/choice` | JWT | Make a choice |
| GET  | `/api/quests/:id/current` | JWT | Get current stage |

---

## Socket.io Events

### Chat
| Direction | Event | Payload |
|-----------|-------|---------|
| Client→Server | `chat:join` | `{ room }` |
| Client→Server | `chat:send` | `{ room, text }` |
| Server→Client | `chat:message` | `{ username, text, timestamp }` |
| Server→Client | `chat:history` | `[Message]` |
| Server→Client | `chat:system` | `{ text }` |
| Server→Client | `chat:error` | `{ message }` |

### Combat
| Direction | Event | Payload |
|-----------|-------|---------|
| Client→Server | `combat:start` | `{ enemyKey }` |
| Client→Server | `combat:action` | `{ sessionId, action }` |
| Client→Server | `combat:flee` | `{ sessionId }` |
| Server→Client | `combat:session_created` | `{ sessionId, playerHP, enemyName, ... }` |
| Server→Client | `combat:round_result` | full round data |
| Server→Client | `combat:level_up` | `{ newLevel, statPointsGained }` |

---

## Combat Engine Formulas

```
Attack Power  = STR×2 + weaponDamage + level
Hit Chance    = clamp(actionBase + (atkAGI − defAGI)×0.02, 0.15, 0.99)
Crit Chance   = clamp(attackerAGI × 0.005, 0, 0.50)
Raw Damage    = attackPower × actionMult × uniform(0.85, 1.15)
              × (1.75 if crit) × (1.50 if charged) × (0.65 if vs Taunt)
Final Damage  = max(1, floor(rawDamage − defense × 0.40))
Defense       = AGI×0.5 + armorRating
Stamina Regen = +10/turn (before action cost)
```

| Action | Base Hit | Dmg Mult | Stamina | Special |
|--------|----------|----------|---------|---------|
| Charge | 100% | 0× | 20 | Sets `charged` (+50% next hit) |
| Quick Attack | 95% | 0.70× | Free | Reliable, light |
| Normal Attack | 80% | 1.00× | 5 | Balanced |
| Power Attack | 55% | 1.75× | 25 | High risk/reward |
| Taunt | 100% | 0× | 10 | 35% dmg reduction + enemy forced to Normal |

---

## Quest System

12 quests across 5 level tiers. Each has 2–4 stages with branching choices.

| Quest | Level | Reward XP | Reward Gold |
|-------|-------|-----------|-------------|
| Goblin's Den | 1 | 80 | 40 |
| Wandering Merchant | 1 | 60 | 30 |
| Bard's Challenge | 1 | 50 | 35 |
| Haunted Crossroads | 2 | 120 | 55 |
| Bandit's Ambush | 2 | 100 | 60 |
| Sea Wreck Salvage | 2 | 110 | 65 |
| Oasis Spring | 3 | 150 | 50 |
| Ruins of the Old King | 3 | 180 | 100 |
| Arena Champion | 4 | 300 | 200 |
| Plague in Eastbrook | 4 | 250 | 80 |
| Dragon's Cave | 5 | 500 | 350 |
| The Dark Cult | 5 | 450 | 280 |

---

## Next Steps

- [ ] Wire `ArenaScene` to use `combat:start` / `combat:action` sockets
- [ ] Build `QuestMapScene` UI (list quests, show stage text, choices as buttons)
- [ ] `CharacterSheetScene` (stat allocation, equipment)
- [ ] `ShopScene` (buy/sell items, seed item catalog)
- [ ] Add Redis for Socket.io multi-instance support
- [ ] PvP matchmaking queue
