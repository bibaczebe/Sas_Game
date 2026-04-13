/**
 * Sand & Steel — Sprite Generator v2
 * RPG Maker / Tibia style: top-down chibi, 4-direction walk animations, splash arts
 *
 * Run: node generate-sprites-v2.js
 * Requires Pixellab credits at https://pixellab.ai
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'f7408ff5-eb30-44c6-8c7a-53fa08699090';
const BASE_URL = 'api.pixellab.ai';
const OUT  = path.join(__dirname, 'client/public/assets/sprites');

// ─── http helper ─────────────────────────────────────────────────────────────

function post(endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: BASE_URL,
      path: `/v1${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${JSON.stringify(json)}`));
          else resolve(json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function save(b64, filepath) {
  const buf = Buffer.from(b64, 'base64');
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buf);
  console.log(`  ✓ ${path.relative(__dirname, filepath)} (${(buf.length/1024).toFixed(1)}kb)`);
  return b64;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchB64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const c = [];
      res.on('data', x => c.push(x));
      res.on('end', () => resolve(Buffer.concat(c).toString('base64')));
    }).on('error', reject);
  });
}

async function getB64(res) {
  if (res.image?.base64) return res.image.base64;
  if (res.image?.url)    return fetchB64(res.image.url);
  throw new Error('No image in response: ' + JSON.stringify(res));
}

// ─── generators ──────────────────────────────────────────────────────────────

/**
 * Generate top-down RPG Maker / Tibia style sprite (base facing south)
 * Size 48x48, chibi proportions, top-down orthographic view
 */
async function genBase(description, size = 48) {
  const res = await post('/generate-image-pixflux', {
    description: `top-down view RPG character sprite, ${description}, chibi proportions, orthographic top-down perspective like RPG Maker or Tibia game, pixel art, no background, centered`,
    image_size: { width: size, height: size },
    no_background: true,
    view: 'top',
    direction: 'south',
    text_guidance_scale: 10,
  });
  return getB64(res);
}

/**
 * Rotate to get all 4 directions
 */
async function genDir(b64, fromDir, toDir, size = 48) {
  const res = await post('/rotate', {
    from_image: { base64: b64 },
    image_size: { width: size, height: size },
    from_view: 'top',
    to_view: 'top',
    from_direction: fromDir,
    to_direction: toDir,
    image_guidance_scale: 5.0,
  });
  return getB64(res);
}

/**
 * Generate 4-frame walk animation for a direction
 */
async function genWalkAnim(b64, direction, size = 48) {
  const res = await post('/animate-with-text', {
    description: `walking forward, RPG top-down style`,
    action: 'walk',
    view: 'top',
    direction,
    n_frames: 4,
    reference_image: { base64: b64 },
    image_size: { width: 64, height: 64 },  // animate-with-text fixed to 64
    text_guidance_scale: 3,
    image_guidance_scale: 9,
  });
  if (!res.frames) throw new Error('No frames: ' + JSON.stringify(res));
  return res.frames.map(f => f.base64 ?? null).filter(Boolean);
}

/**
 * Generate large portrait / splash art for NPC conversations (128x192 or 96x128)
 */
async function genSplash(description, id) {
  const res = await post('/generate-image-pixflux', {
    description: `detailed fantasy character portrait bust, ${description}, facing viewer slightly, dark fantasy illustration pixel art style, dramatic lighting, no background, high detail`,
    image_size: { width: 96, height: 128 },
    no_background: true,
    view: 'side',
    direction: 'south',
    text_guidance_scale: 9,
  });
  return getB64(res);
}

// ─── character definitions ────────────────────────────────────────────────────

const CHARACTERS = [
  {
    id: 'warrior',
    folder: 'characters',
    walkDirs: ['south', 'north', 'east', 'west'],
    sprite: 'armored knight warrior, full plate mail armor, sword and shield, heroic, dark fantasy',
    splash: 'battle-scarred armored knight warrior, full dark plate armor with glowing visor, menacing and heroic, dark fantasy Darkest Dungeon style',
  },
  {
    id: 'archer',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'hooded elven ranger archer, green cloak, longbow, leather armor, dark fantasy',
    splash: 'hooded elven ranger archer, dark green cloak, glowing eyes, longbow raised, dark fantasy illustration',
  },
  {
    id: 'mage',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'dark sorcerer wizard, black purple robes, glowing staff with skull, arcane runes, sinister',
    splash: 'sinister dark sorcerer, purple black robes, arcane energy crackling, skull staff, forbidden library background, dark fantasy',
  },
  {
    id: 'merchant',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'fat jolly merchant trader, colorful vest, coin purse, big hat, fantasy RPG',
    splash: 'jolly fat merchant trader, colorful vest and big hat, wide grin, gold coins, dark fantasy pixel art portrait',
  },
  {
    id: 'guard',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'town guard soldier, chainmail armor, spear and shield, stern face, dark fantasy',
    splash: 'stern town guard soldier, chainmail armor, torch in hand, night city gate background, dark fantasy portrait',
  },
  {
    id: 'blacksmith',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'muscular blacksmith, leather apron, hammer, forge glow, dark fantasy',
    splash: 'muscular blacksmith with leather apron and hammer, forge flames behind him, determined expression, dark fantasy portrait',
  },
  {
    id: 'innkeeper',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'plump innkeeper, apron, holding ale mug, warm smile, tavern fantasy',
    splash: 'cheerful plump innkeeper holding a large ale mug, warm tavern light, dark fantasy portrait',
  },
  {
    id: 'assassin',
    folder: 'npcs',
    walkDirs: ['south'],
    sprite: 'hooded rogue assassin, black leather armor, two daggers, shadowy dark fantasy',
    splash: 'hooded assassin rogue, black armor, twin daggers, shadowy alley background, dark fantasy sinister portrait',
  },
];

// ─── building / world map assets ─────────────────────────────────────────────

const BUILDINGS = [
  {
    id: 'colosseum',
    desc: 'ancient Roman colosseum arena, top-down view, pixel art, detailed stone architecture, sand floor with battle marks, spectator seats, RPG Maker style game map asset',
    size: 128,
  },
  {
    id: 'town_hall',
    desc: 'grand medieval town hall building, top-down view, stone and timber, flag on roof, pixel art RPG Maker style map tile',
    size: 96,
  },
  {
    id: 'inn_tavern',
    desc: 'cozy medieval inn tavern building, top-down view, warm light from windows, wooden sign, pixel art RPG Maker style',
    size: 96,
  },
  {
    id: 'blacksmith_shop',
    desc: 'blacksmith forge workshop, top-down view, anvil and furnace visible, smoke, pixel art RPG Maker style map tile',
    size: 96,
  },
  {
    id: 'guild_hall',
    desc: 'adventurers guild hall, top-down view, notice board outside, banners, stone building, pixel art RPG Maker style',
    size: 96,
  },
  {
    id: 'magic_shop',
    desc: 'mysterious magic potion shop, top-down view, glowing windows, mystical runes on walls, pixel art RPG Maker style',
    size: 96,
  },
  {
    id: 'watchtower',
    desc: 'medieval stone watchtower, top-down view, guard on top, pixel art RPG Maker style map tile',
    size: 64,
  },
];

const TILESETS = [
  {
    id: 'grass_dirt',
    lower: 'green grass field, bright, RPG top-down',
    upper: 'brown dirt path, earthen, RPG top-down',
  },
  {
    id: 'stone_plaza',
    lower: 'stone cobblestone pavement, grey, RPG top-down',
    upper: 'cracked stone ruins, darker grey, RPG top-down',
  },
  {
    id: 'water_shore',
    lower: 'deep blue ocean water with wave patterns, RPG top-down',
    upper: 'sandy beach shore, light tan, RPG top-down',
  },
];

// ─── main generation ──────────────────────────────────────────────────────────

async function generateCharacter(char) {
  console.log(`\n── ${char.id} ──`);
  const dir = path.join(OUT, char.folder, char.id);

  // 1. Base sprite (south)
  console.log(`  Base sprite...`);
  let southB64;
  try {
    southB64 = save(await genBase(char.sprite), path.join(dir, 'south.png'));
  } catch(e) {
    console.error(`  ✗ Base failed: ${e.message}`);
    return;
  }
  await sleep(800);

  // 2. Other directions
  for (const d of ['north', 'east', 'west']) {
    try {
      const b64 = await genDir(southB64, 'south', d);
      save(b64, path.join(dir, `${d}.png`));
      await sleep(600);
    } catch(e) {
      console.warn(`  ✗ ${d} failed: ${e.message}`);
      fs.copyFileSync(path.join(dir, 'south.png'), path.join(dir, `${d}.png`));
    }
  }

  // 3. Walk animations for specified dirs
  for (const walkDir of char.walkDirs) {
    console.log(`  Walk anim (${walkDir})...`);
    const refB64 = fs.readFileSync(path.join(dir, `${walkDir}.png`)).toString('base64');
    try {
      const frames = await genWalkAnim(refB64, walkDir);
      frames.forEach((b64, i) => save(b64, path.join(dir, `walk_${walkDir}_${i}.png`)));
      await sleep(800);
    } catch(e) {
      console.warn(`  ✗ Walk anim failed: ${e.message}`);
    }
  }

  // 4. Splash art portrait
  console.log(`  Splash art...`);
  try {
    const splashB64 = await genSplash(char.splash, char.id);
    save(splashB64, path.join(OUT, 'splash', `${char.id}.png`));
  } catch(e) {
    console.warn(`  ✗ Splash failed: ${e.message}`);
  }

  await sleep(1200);
  console.log(`  ✓ ${char.id} complete`);
}

async function generateBuilding(b) {
  console.log(`\n── building: ${b.id} ──`);
  try {
    const res = await post('/generate-image-pixflux', {
      description: b.desc,
      image_size: { width: b.size, height: b.size },
      no_background: true,
      view: 'top',
      text_guidance_scale: 9,
    });
    const b64 = await getB64(res);
    save(b64, path.join(OUT, 'buildings', `${b.id}.png`));
    await sleep(1000);
  } catch(e) {
    console.error(`  ✗ ${b.id}: ${e.message}`);
  }
}

async function generateTileset(t) {
  console.log(`\n── tileset: ${t.id} ──`);
  try {
    const res = await post('/create-topdown-tileset', {
      lower_description: t.lower,
      upper_description: t.upper,
      tile_size: 32,
      outline: 'no',
      shading: 'basic',
    });
    // MCP format returns tileset_id — poll for result
    console.log(`  Tileset queued:`, JSON.stringify(res));
  } catch(e) {
    console.error(`  ✗ ${t.id}: ${e.message}`);
  }
}

async function main() {
  const mode = process.argv[2] || 'characters';

  console.log('═══════════════════════════════════════');
  console.log(` Sand & Steel — Generator v2 [${mode}]`);
  console.log('═══════════════════════════════════════');

  // Check balance first
  const balRes = await new Promise((resolve) => {
    https.get({
      hostname: BASE_URL,
      path: '/v1/balance',
      headers: { Authorization: `Bearer ${API_KEY}` },
    }, res => {
      let d = ''; res.on('data', c => d+=c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', () => resolve({ usd: 0 }));
  });
  console.log(`\nBalance: $${balRes.usd?.toFixed(2) ?? '?'} USD`);
  if ((balRes.usd ?? 0) <= 0) {
    console.log('\n⚠  No credits — top up at: https://pixellab.ai/pricing');
    console.log('   Typical cost: ~$5 for 200+ generations');
    process.exit(1);
  }

  if (mode === 'characters' || mode === 'all') {
    for (const char of CHARACTERS) await generateCharacter(char);
  }

  if (mode === 'buildings' || mode === 'all') {
    for (const b of BUILDINGS) await generateBuilding(b);
  }

  if (mode === 'tilesets' || mode === 'all') {
    for (const t of TILESETS) await generateTileset(t);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(' Done!');
}

main().catch(console.error);
