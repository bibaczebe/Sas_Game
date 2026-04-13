/**
 * Pixellab Sprite Generator — Sand & Steel
 * Generates all character sprites + NPC sprites via Pixellab REST API
 * Run: node generate-sprites.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'f7408ff5-eb30-44c6-8c7a-53fa08699090';
const BASE_URL = 'api.pixellab.ai';
const OUT_DIR = path.join(__dirname, 'client/public/assets/sprites');

// ─── helpers ─────────────────────────────────────────────────────────────────

function apiCall(endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: BASE_URL,
      path: `/v1${endpoint}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`API ${res.statusCode}: ${JSON.stringify(json)}`));
          else resolve(json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function saveBase64(b64, filepath) {
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(filepath, buf);
  console.log(`  ✓ saved ${path.relative(__dirname, filepath)} (${(buf.length/1024).toFixed(1)}kb)`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateImage(description, size, noBackground = true, view = 'side', direction = 'south') {
  const res = await apiCall('/generate-image-pixflux', {
    description,
    image_size: { width: size, height: size },
    no_background: noBackground,
    view,
    direction,
    text_guidance_scale: 9,
  });
  return res.image?.url ? await fetchImage(res.image.url) : res.image?.base64;
}

async function rotateImage(base64Image, fromDirection, toDirection, size) {
  const res = await apiCall('/rotate', {
    from_image: { base64: base64Image },
    image_size: { width: size, height: size },
    from_view: 'side',
    to_view: 'side',
    from_direction: fromDirection,
    to_direction: toDirection,
    image_guidance_scale: 4.0,
  });
  return res.image?.url ? await fetchImage(res.image.url) : res.image?.base64;
}

async function animateWalk(base64Image, direction, size) {
  const res = await apiCall('/animate-with-text', {
    description: 'walking animation',
    action: 'walk',
    view: 'side',
    direction,
    n_frames: 4,
    reference_image: { base64: base64Image },
    image_size: { width: 64, height: 64 },
    text_guidance_scale: 4,
    image_guidance_scale: 8,
  });
  // returns array of frames
  return res.frames?.map(f => f.base64 || f.url);
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── character definitions ────────────────────────────────────────────────────

const CHARACTERS = [
  {
    id: 'warrior',
    folder: 'characters',
    desc: 'armored medieval warrior knight, full plate armor, sword and shield, heroic stance, RPG hero, dark fantasy, Darkest Dungeon style, high detail pixel art, 64x64',
    size: 64,
  },
  {
    id: 'archer',
    folder: 'npcs',
    desc: 'hooded elven archer ranger with longbow, leather armor, dark green cloak, Darkest Dungeon style pixel art, high detail, 64x64',
    size: 64,
  },
  {
    id: 'mage',
    folder: 'npcs',
    desc: 'dark sorcerer wizard with staff and robes, glowing purple magical runes, sinister expression, Darkest Dungeon style pixel art, high detail, 64x64',
    size: 64,
  },
  {
    id: 'merchant',
    folder: 'npcs',
    desc: 'fat jolly merchant trader with coin purse and sack, colourful vest, big hat, fantasy RPG, Darkest Dungeon style pixel art, 64x64',
    size: 64,
  },
  {
    id: 'guard',
    folder: 'npcs',
    desc: 'town guard soldier in chainmail and helmet, spear and round shield, serious face, dark fantasy pixel art, Darkest Dungeon style, 64x64',
    size: 64,
  },
  {
    id: 'blacksmith',
    folder: 'npcs',
    desc: 'muscular blacksmith with leather apron and hammer, fire-lit forge background glow, dark fantasy pixel art, Darkest Dungeon style, 64x64',
    size: 64,
  },
  {
    id: 'innkeeper',
    folder: 'npcs',
    desc: 'cheerful plump innkeeper with apron and mug of ale, warm cozy expression, dark fantasy pixel art, Darkest Dungeon style, 64x64',
    size: 64,
  },
  {
    id: 'assassin',
    folder: 'npcs',
    desc: 'hooded rogue assassin in black leather armor, two daggers, shadowy sinister look, dark fantasy pixel art, Darkest Dungeon style, 64x64',
    size: 64,
  },
];

const DIRECTIONS = ['south', 'north', 'east', 'west'];

// ─── main ─────────────────────────────────────────────────────────────────────

async function generateCharacter(char) {
  console.log(`\n── Generating ${char.id} ──`);
  const dir = path.join(OUT_DIR, char.folder, char.id);
  fs.mkdirSync(dir, { recursive: true });

  // 1. Generate south-facing base image
  console.log(`  Generating base sprite (south)...`);
  let southB64;
  try {
    southB64 = await generateImage(char.desc, char.size, true, 'side', 'south');
    saveBase64(southB64, path.join(dir, 'south.png'));
  } catch(e) {
    console.error(`  ✗ Failed to generate ${char.id}: ${e.message}`);
    return;
  }

  await sleep(1000);

  // 2. Rotate to get other directions
  for (const d of ['north', 'east', 'west']) {
    console.log(`  Rotating to ${d}...`);
    try {
      const rotB64 = await rotateImage(southB64, 'south', d, char.size);
      saveBase64(rotB64, path.join(dir, `${d}.png`));
      await sleep(800);
    } catch(e) {
      console.warn(`  ✗ Rotate ${d} failed: ${e.message}`);
      // fallback: copy south
      fs.copyFileSync(path.join(dir, 'south.png'), path.join(dir, `${d}.png`));
    }
  }

  // 3. Walk animation for south direction (player character only gets full anim)
  if (char.id === 'warrior') {
    console.log(`  Generating walk animation...`);
    try {
      const frames = await animateWalk(southB64, 'south', char.size);
      if (frames) {
        const walkDir = path.join(dir, 'walk_south');
        fs.mkdirSync(walkDir, { recursive: true });
        frames.forEach((f, i) => {
          const b64 = typeof f === 'string' ? f : null;
          if (b64) saveBase64(b64, path.join(walkDir, `frame_${i}.png`));
        });
      }
    } catch(e) {
      console.warn(`  ✗ Walk anim failed: ${e.message}`);
    }
  }

  console.log(`  ✓ ${char.id} complete`);
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log(' Sand & Steel — Sprite Generator');
  console.log('═══════════════════════════════════════');
  console.log(`Output: ${OUT_DIR}`);

  fs.mkdirSync(path.join(OUT_DIR, 'characters'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'npcs'), { recursive: true });

  for (const char of CHARACTERS) {
    await generateCharacter(char);
    await sleep(1500); // rate limit buffer
  }

  console.log('\n═══════════════════════════════════════');
  console.log(' All sprites generated!');
  console.log('═══════════════════════════════════════');
  console.log('\nNext: run node generate-sprites.js --buildings to generate building assets');
}

main().catch(console.error);
