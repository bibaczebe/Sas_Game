/**
 * Sand & Steel — Sprite Generator v3
 * Uses Pixellab v2 API: Character Creator + Wang tilesets + Buildings
 *
 * Usage:
 *   node generate-sprites-v3.js characters     — all characters (walk + breathe + attack anims)
 *   node generate-sprites-v3.js tilesets       — terrain tilesets (32px Wang tiles)
 *   node generate-sprites-v3.js buildings      — building sprites
 *   node generate-sprites-v3.js all            — everything
 *   node generate-sprites-v3.js check          — just check balance
 *
 * Budget estimate (2000 gen pool):
 *   Characters (8 chars × 4 dirs):   ~8 calls   ≈  32 images
 *   Animations (walk×4, breathe×4, attack×1 per char):  ~72 calls ≈ 288 images
 *   Splash arts (8 chars):            ~8 calls   ≈   8 images
 *   Tilesets (4 biomes):             ~4 calls   ≈  64 tiles
 *   Buildings (7 buildings):         ~7 calls   ≈   7 images
 *   TOTAL: ~100 calls ≈ ~400 images — well within 2000 budget
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const API_KEY  = 'f7408ff5-eb30-44c6-8c7a-53fa08699090';
const API_HOST = 'api.pixellab.ai';
const V2       = '/v2';
const V1       = '/v1';
const OUT      = path.join(__dirname, 'client/public/assets/sprites');

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: API_HOST,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          if (res.statusCode >= 400) {
            const err = new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`);
            err.status = res.statusCode;
            reject(err);
          } else {
            resolve({ status: res.statusCode, data: json });
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function get(apiPath)          { return request('GET',    apiPath, null); }
async function post(apiPath, body)   { return request('POST',   apiPath, body); }

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const fetch = (u) => {
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return fetch(res.headers.location);
        const c = [];
        res.on('data', x => c.push(x));
        res.on('end', () => resolve(Buffer.concat(c)));
      }).on('error', reject);
    };
    fetch(url);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function save(b64OrBuf, filepath) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  const buf = typeof b64OrBuf === 'string' ? Buffer.from(b64OrBuf, 'base64') : b64OrBuf;
  fs.writeFileSync(filepath, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`    ✓ ${path.relative(__dirname, filepath)} (${kb}kb)`);
}

async function saveUrl(url, filepath) {
  const buf = await fetchBuf(url);
  save(buf, filepath);
}

async function extractImages(data) {
  // data can be { image: { base64, url } } or { frames: [...] } or { images: [...] }
  if (data?.image?.base64)  return [data.image.base64];
  if (data?.image?.url)     return [await fetchBuf(data.image.url).then(b => b.toString('base64'))];
  if (Array.isArray(data?.frames)) {
    const out = [];
    for (const f of data.frames) {
      if (f?.base64) out.push(f.base64);
      else if (f?.url) out.push(await fetchBuf(f.url).then(b => b.toString('base64')));
    }
    return out;
  }
  return [];
}

// Poll background job until complete
async function pollJob(jobId, label, maxWait = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await sleep(3000);
    const { data } = await get(`${V2}/background-jobs/${jobId}`);
    if (data.status === 'completed' || data.status === 'done' || data.result) {
      console.log(`    ✓ ${label} done`);
      return data.result ?? data;
    }
    if (data.status === 'failed') throw new Error(`Job ${jobId} failed: ${JSON.stringify(data)}`);
    process.stdout.write('.');
  }
  throw new Error(`Job ${jobId} timed out`);
}

// ─── Character Creator v2 ─────────────────────────────────────────────────────

/**
 * Create character with 4 directions using Character Creator API.
 * Size: 48×64 (max 2 tiles: 2×32=64px tall)
 * view: "side" for RPG Maker / Tibia style
 */
async function createCharacter(description, opts = {}) {
  const { data } = await post(`${V2}/create-character-with-4-directions`, {
    description,
    image_size:          { width: 48, height: 64 },
    view:                'side',          // side-view for RPG Maker style
    outline:             'medium',
    shading:             'hard',
    detail:              'high',
    text_guidance_scale: 10,
    ...opts,
  });
  return data;
}

/**
 * Animate an existing character.
 * template_animation_id options: breathing-idle, walk-cycle (or use action_description)
 */
async function animateCharacter(characterId, animationName, templateId, directions = ['south','north','east','west']) {
  const { data } = await post(`${V2}/characters/animations`, {
    character_id:          characterId,
    animation_name:        animationName,
    template_animation_id: templateId,
    directions,
    frame_count:           8,
    outline:               'medium',
    shading:               'hard',
    detail:                'high',
  });
  return data;
}

async function getCharacter(characterId) {
  const { data } = await get(`${V2}/characters/${characterId}`);
  return data;
}

/**
 * Wait for a character and all its animations to finish processing.
 */
async function waitForCharacter(characterId, maxWait = 180000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await sleep(4000);
    const char = await getCharacter(characterId);

    const allDone = (char.rotations || []).every(r => r.status === 'completed' || r.url) &&
                    (char.animations || []).every(a => a.status === 'completed' || a.frames?.length);

    if (allDone || char.status === 'completed') return char;
    process.stdout.write('.');
  }
  throw new Error(`Character ${characterId} timed out`);
}

/**
 * Download all rotations and animation frames for a character.
 */
async function downloadCharacter(char, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  // Directional standing sprites
  const dirMap = { 0: 'south', 1: 'west', 2: 'east', 3: 'north' };
  for (const [i, rotation] of (char.rotations || []).entries()) {
    const dirName = rotation.direction ?? dirMap[i] ?? `dir${i}`;
    const url = rotation.url ?? rotation.image?.url;
    if (url) await saveUrl(url, path.join(outDir, `${dirName}.png`));
    else if (rotation.image?.base64) save(rotation.image.base64, path.join(outDir, `${dirName}.png`));
  }

  // Animations: each animation has frames
  for (const anim of (char.animations || [])) {
    const animDir = path.join(outDir, anim.name ?? anim.animation_name ?? 'anim');
    fs.mkdirSync(animDir, { recursive: true });

    const frames = anim.frames ?? [];
    for (const [fi, frame] of frames.entries()) {
      const dir  = frame.direction ?? 'south';
      const idx  = frame.frame_index ?? fi;
      const url  = frame.url ?? frame.image?.url;
      const b64  = frame.image?.base64;
      const fout = path.join(animDir, `${dir}_${idx}.png`);
      if (url)      await saveUrl(url, fout);
      else if (b64) save(b64, fout);
    }
  }
}

// ─── Splash art ──────────────────────────────────────────────────────────────

async function createSplash(description, outPath) {
  const { data } = await post(`${V1}/generate-image-pixflux`, {
    description: `detailed fantasy character portrait bust, ${description}, facing slightly toward viewer, dramatic dark fantasy lighting, painted pixel art style, dark background, high detail`,
    image_size:          { width: 96, height: 128 },
    no_background:       false,
    view:                'side',
    direction:           'south',
    text_guidance_scale: 9,
  });
  const [b64] = await extractImages(data);
  if (b64) save(b64, outPath);
}

// ─── Tilesets ─────────────────────────────────────────────────────────────────

async function createTileset(lower, upper, id) {
  console.log(`\n  Tileset: ${id} (${lower} → ${upper})`);
  const { status, data } = await post(`${V2}/tilesets`, {
    lower_description: lower,
    upper_description: upper,
    tile_size:         { width: 32, height: 32 },
    view:              'high top-down',
    outline:           'none',
    shading:           'hard',
    detail:            'high',
    text_guidance_scale: 8,
  });

  let result = data;
  if (status === 202 && data.job_id) {
    result = await pollJob(data.job_id, `tileset:${id}`);
  }

  // Save tileset image (single combined sheet or individual tiles)
  const tileDir = path.join(OUT, 'tilesets', id);
  fs.mkdirSync(tileDir, { recursive: true });

  if (result?.image?.url)    await saveUrl(result.image.url, path.join(tileDir, 'sheet.png'));
  if (result?.image?.base64) save(result.image.base64,       path.join(tileDir, 'sheet.png'));

  // Individual tiles if provided
  if (result?.tiles) {
    for (const [i, tile] of result.tiles.entries()) {
      const tpath = path.join(tileDir, `tile_${i}.png`);
      if (tile.url) await saveUrl(tile.url, tpath);
      else if (tile.base64) save(tile.base64, tpath);
    }
  }

  return result;
}

// ─── Buildings ────────────────────────────────────────────────────────────────

async function createBuilding(desc, id, size = 96) {
  console.log(`\n  Building: ${id}`);
  const { data } = await post(`${V2}/create-tiles-pro`, {
    description: desc,
    tile_type:   'square_topdown',
    tile_size:   size,
    n_tiles:     1,
    tile_view:   'high top-down',
    outline_mode:'medium',
  });

  let result = data;
  if (data.job_id) result = await pollJob(data.job_id, `building:${id}`);

  const outDir = path.join(OUT, 'buildings');
  fs.mkdirSync(outDir, { recursive: true });

  if (result?.image?.url)    await saveUrl(result.image.url,    path.join(outDir, `${id}.png`));
  if (result?.image?.base64) save(result.image.base64,          path.join(outDir, `${id}.png`));
  if (result?.tiles?.[0]?.url)    await saveUrl(result.tiles[0].url,    path.join(outDir, `${id}.png`));
  if (result?.tiles?.[0]?.base64) save(result.tiles[0].base64,          path.join(outDir, `${id}.png`));
}

// ─── Character definitions ────────────────────────────────────────────────────

const CHARACTERS = [
  {
    id: 'warrior', folder: 'characters',
    desc: 'armored medieval knight warrior, full dark plate armor, sword and shield, heroic, dark fantasy RPG Maker style sprite',
    splash: 'battle-scarred armored knight in full dark plate armor with glowing red visor, menacing and heroic, Darkest Dungeon art style portrait',
    anims: ['breathing-idle', 'walk-cycle'],
    walkDirs: ['south', 'north', 'east', 'west'],
  },
  {
    id: 'archer', folder: 'npcs',
    desc: 'elven hooded ranger archer, dark green cloak, longbow, leather armor, dark fantasy RPG Maker sprite',
    splash: 'hooded elven ranger archer, glowing eyes, dark green cloak, longbow, dark fantasy portrait',
    anims: ['breathing-idle', 'walk-cycle'],
    walkDirs: ['south'],
  },
  {
    id: 'mage', folder: 'npcs',
    desc: 'dark sorcerer wizard, black purple robes, glowing skull staff, arcane runes, dark fantasy RPG Maker sprite',
    splash: 'sinister dark sorcerer with purple robes and skull staff, arcane energy, dark fantasy portrait',
    anims: ['breathing-idle', 'walk-cycle'],
    walkDirs: ['south'],
  },
  {
    id: 'merchant', folder: 'npcs',
    desc: 'fat jolly merchant trader, colorful vest and big hat, coin purse, fantasy RPG Maker style sprite',
    splash: 'jolly fat merchant trader, colorful vest, big hat, wide grin, gold coins, dark fantasy portrait',
    anims: ['breathing-idle', 'walk-cycle'],
    walkDirs: ['south'],
  },
  {
    id: 'guard', folder: 'npcs',
    desc: 'town guard soldier, chainmail armor, spear and round shield, stern face, dark fantasy RPG Maker sprite',
    splash: 'stern town guard soldier in chainmail armor, spear and torch, night city gate, dark fantasy portrait',
    anims: ['breathing-idle', 'walk-cycle'],
    walkDirs: ['south'],
  },
  {
    id: 'blacksmith', folder: 'npcs',
    desc: 'muscular blacksmith, leather apron, big hammer, forge fire glow, dark fantasy RPG Maker sprite',
    splash: 'muscular blacksmith with hammer and leather apron, forge flames, determined expression, dark fantasy portrait',
    anims: ['breathing-idle'],
    walkDirs: ['south'],
  },
  {
    id: 'innkeeper', folder: 'npcs',
    desc: 'plump innkeeper, apron, holding ale mug, warm smile, tavern, RPG Maker fantasy sprite',
    splash: 'cheerful plump innkeeper with ale mug, warm tavern light, dark fantasy portrait',
    anims: ['breathing-idle'],
    walkDirs: ['south'],
  },
  {
    id: 'assassin', folder: 'npcs',
    desc: 'hooded rogue assassin, black leather armor, twin daggers, shadowy, dark fantasy RPG Maker sprite',
    splash: 'hooded assassin with twin daggers, black armor, shadowy alley, dark fantasy sinister portrait',
    anims: ['breathing-idle', 'walk-cycle'],
    walkDirs: ['south'],
  },
];

const TILESETS = [
  { id: 'grass_dirt',   lower: 'lush green grass field',         upper: 'brown muddy dirt path' },
  { id: 'stone_plaza',  lower: 'grey cobblestone square',        upper: 'cracked stone ruins, darker' },
  { id: 'water_shore',  lower: 'deep blue ocean water, ripples', upper: 'sandy golden beach shore' },
  { id: 'forest_floor', lower: 'dark forest ground, fallen leaves', upper: 'mossy stone path' },
];

const BUILDINGS = [
  { id: 'colosseum',      size: 128, desc: 'ancient Roman colosseum arena, top-down view, huge stone amphitheater, sand floor with battle marks, detailed pixel art RPG building tile' },
  { id: 'town_hall',      size: 96,  desc: 'grand medieval town hall, large stone building, flags and banners, top-down pixel art RPG building' },
  { id: 'inn_tavern',     size: 96,  desc: 'cozy medieval inn tavern, timber frame, warm glowing windows, hanging sign, top-down pixel art RPG building' },
  { id: 'blacksmith',     size: 96,  desc: 'blacksmith forge workshop, anvil outside, furnace smoke, stone building, top-down pixel art RPG building' },
  { id: 'guild_hall',     size: 96,  desc: 'adventurers guild hall, notice board, stone walls, medieval banners, top-down pixel art RPG building' },
  { id: 'magic_shop',     size: 96,  desc: 'mysterious magic potion shop, glowing purple windows, arcane runes carved into walls, top-down pixel art RPG building' },
  { id: 'watchtower',     size: 64,  desc: 'medieval stone watchtower, battlements, arrow slits, dark fantasy, top-down pixel art RPG building' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateAllCharacters() {
  for (const char of CHARACTERS) {
    console.log(`\n══ ${char.id.toUpperCase()} ══`);
    const outDir = path.join(OUT, char.folder, char.id);
    fs.mkdirSync(outDir, { recursive: true });

    // 1. Create base character with 4 directions
    console.log(`  Creating character...`);
    let characterData;
    try {
      characterData = await createCharacter(char.desc);
      console.log(`  Character ID: ${characterData.id ?? characterData.character_id ?? '?'}`);
    } catch(e) {
      console.error(`  ✗ Create failed: ${e.message}`);
      continue;
    }

    const charId = characterData.id ?? characterData.character_id;

    // 2. Queue animations immediately (non-blocking per API design)
    if (charId) {
      for (const anim of char.anims) {
        console.log(`  Queuing animation: ${anim}...`);
        try {
          await animateCharacter(charId, anim, anim, char.walkDirs);
          await sleep(500);
        } catch(e) {
          console.warn(`  ✗ Anim ${anim} failed: ${e.message}`);
        }
      }
    }

    // 3. Wait for everything to process
    if (charId) {
      console.log(`  Waiting for processing`);
      try {
        const fullChar = await waitForCharacter(charId);
        console.log(`\n  Downloading...`);
        await downloadCharacter(fullChar, outDir);
      } catch(e) {
        console.warn(`  ✗ Wait/download failed: ${e.message}`);
        // Try downloading whatever is ready
        if (characterData.rotations) await downloadCharacter(characterData, outDir).catch(()=>{});
      }
    } else {
      // Synchronous response — download directly
      await downloadCharacter(characterData, outDir);
    }

    // 4. Splash art
    console.log(`  Splash art...`);
    try {
      await createSplash(char.splash, path.join(OUT, 'splash', `${char.id}.png`));
    } catch(e) {
      console.warn(`  ✗ Splash failed: ${e.message}`);
    }

    await sleep(1500);
  }
}

async function generateAllTilesets() {
  for (const t of TILESETS) {
    try {
      await createTileset(t.lower, t.upper, t.id);
      await sleep(1000);
    } catch(e) {
      console.error(`  ✗ Tileset ${t.id}: ${e.message}`);
    }
  }
}

async function generateAllBuildings() {
  for (const b of BUILDINGS) {
    try {
      await createBuilding(b.desc, b.id, b.size);
      await sleep(1000);
    } catch(e) {
      console.error(`  ✗ Building ${b.id}: ${e.message}`);
    }
  }
}

async function checkBalance() {
  const { data } = await get(`${V1}/balance`);
  console.log(`Balance: $${data.usd?.toFixed(4) ?? '?'} USD`);
  if (data.credits !== undefined) console.log(`Credits: ${data.credits}`);
  return data;
}

async function main() {
  const mode = process.argv[2] || 'all';

  console.log('═══════════════════════════════════════════');
  console.log('  Sand & Steel — Sprite Generator v3');
  console.log('═══════════════════════════════════════════');

  await checkBalance();

  if (mode === 'check') return;

  if (mode === 'characters' || mode === 'all') {
    console.log('\n── CHARACTERS ──────────────────────────────');
    await generateAllCharacters();
  }

  if (mode === 'tilesets' || mode === 'all') {
    console.log('\n── TILESETS ────────────────────────────────');
    await generateAllTilesets();
  }

  if (mode === 'buildings' || mode === 'all') {
    console.log('\n── BUILDINGS ───────────────────────────────');
    await generateAllBuildings();
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Done! Check client/public/assets/sprites/');
  console.log('═══════════════════════════════════════════');
  await checkBalance();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
