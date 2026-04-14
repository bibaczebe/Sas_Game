extends Node2D

# ── World constants ───────────────────────────────────────────────────────────
const TILE_SIZE     := 48
const MAP_W         := 80
const MAP_H         := 80
const WORLD_W       := MAP_W * TILE_SIZE
const WORLD_H       := MAP_H * TILE_SIZE
const PLAYER_SPEED  := 200.0
const INTERACT_DIST := 80.0

# ── Biome IDs ─────────────────────────────────────────────────────────────────
const BIOME_PLAINS   := 0
const BIOME_FOREST   := 1
const BIOME_DESERT   := 2
const BIOME_COAST    := 3
const BIOME_MOUNTAIN := 4
const BIOME_TUNDRA   := 5
const BIOME_SNOW     := 6
const BIOME_VOLCANIC := 7

const BIOME_NAMES: Array = [
	"Plains", "Dark Forest", "Desert",
	"Coastline", "Mountains", "Tundra",
	"Snow Peaks", "Volcanic Wastes",
]

const BIOME_COLORS: Array = [
	Color(0.35, 0.62, 0.22),   # Plains    — mid green
	Color(0.10, 0.28, 0.11),   # Forest    — dark green
	Color(0.82, 0.74, 0.40),   # Desert    — sandy
	Color(0.22, 0.52, 0.72),   # Coast     — blue-teal
	Color(0.50, 0.48, 0.44),   # Mountains — gray
	Color(0.65, 0.80, 0.90),   # Tundra    — ice blue
	Color(0.90, 0.94, 0.98),   # Snow      — near white
	Color(0.72, 0.16, 0.06),   # Volcanic  — deep red
]

# Minimap-only colours (kept for the 160×120 minimap draw)
const FOG_COLOR   := Color(0.06, 0.06, 0.10)
const ROAD_COLOR  := Color(0.58, 0.44, 0.22)
const STONE_COLOR := Color(0.48, 0.46, 0.42)
const WATER_COLOR := Color(0.08, 0.20, 0.48)

# ── Atlas coordinates in world_a2_atlas.png (col, row) ───────────────────────
# Rows 0-3: A2 kinds 0-31.  Row 4: special tiles.
const ATLAS_FOG   := Vector2i(1, 4)   # locked biome (dark solid)
const ATLAS_WATER := Vector2i(0, 4)   # Sea (A1)
const ATLAS_ROAD  := Vector2i(5, 1)   # Road Dirt  (A2 kind 13)
const ATLAS_STONE := Vector2i(5, 2)   # Road Paved (A2 kind 21)

# Biome 0-7 → atlas tile (interior tile for that biome's ground type)
const BIOME_ATLAS: Array = [
	Vector2i(0, 0),  # 0 Plains    → Grassland A
	Vector2i(4, 0),  # 1 Forest    → Forest
	Vector2i(0, 2),  # 2 Desert    → Desert A
	Vector2i(2, 2),  # 3 Coast     → Rocky Land A
	Vector2i(6, 0),  # 4 Mountains → Mountain Grass
	Vector2i(2, 1),  # 5 Tundra    → Dirt Field A
	Vector2i(0, 3),  # 6 Snow      → Snowfield
	Vector2i(7, 2),  # 7 Volcanic  → Mountain Lava
]

# Biome centers in tile-space (80×80 grid).
# Layout: Plains center, Forest NW, Desert SW, Coast E, Mountains NE,
#         Tundra N, Snow far-NW corner, Volcanic S.
const BIOME_CENTERS: Array = [
	Vector2i(40, 38),   # Plains
	Vector2i(14, 32),   # Forest
	Vector2i(14, 62),   # Desert
	Vector2i(66, 42),   # Coast
	Vector2i(64, 17),   # Mountains
	Vector2i(38, 10),   # Tundra
	Vector2i( 7,  7),   # Snow Peaks
	Vector2i(40, 71),   # Volcanic
]

const BUILDING_COLORS := {
	"arena":   Color(0.85, 0.15, 0.15),
	"town":    Color(0.60, 0.30, 0.10),
	"shop":    Color(0.15, 0.50, 0.60),
	"inn":     Color(0.50, 0.32, 0.60),
	"guild":   Color(0.28, 0.44, 0.90),
	"lodge":   Color(0.40, 0.55, 0.28),
	"ruins":   Color(0.38, 0.32, 0.28),
	"mine":    Color(0.55, 0.50, 0.35),
	"temple":  Color(0.70, 0.65, 0.55),
	"harbor":  Color(0.20, 0.45, 0.65),
	"dungeon": Color(0.30, 0.18, 0.22),
	"keep":    Color(0.60, 0.60, 0.65),
	"oasis":   Color(0.25, 0.60, 0.40),
	"forge":   Color(0.80, 0.30, 0.10),
	"portal":  Color(0.55, 0.10, 0.55),
}

# ── State ─────────────────────────────────────────────────────────────────────
var _biome_map: PackedByteArray
var _road_map:  PackedByteArray
var _buildings: Array = []
var _player: CharacterBody2D
var _npcs: Array[Node2D] = []
var _near_building: Dictionary = {}
var _minimap_timer    := 0.0
var _biome_label_timer := 0.0
var _current_biome    := -1
var _npc_rng          := RandomNumberGenerator.new()
var _tile_map_layer: TileMapLayer   # created in _ready()

@onready var minimap_rect  := $HUD/Minimap
@onready var interact_hint := $HUD/InteractHint
@onready var location_label := $HUD/LocationLabel

var biome_label: Label   # created dynamically in _ready


func _ready() -> void:
	_npc_rng.seed = 999
	WsManager.join_room("world_map")

	_generate_biome_map()
	_generate_roads()
	_generate_buildings()
	_create_tile_map()
	_draw_terrain()
	_place_buildings()
	_spawn_npcs()
	_create_player()
	_setup_camera()

	interact_hint.hide()
	location_label.text = "World Map  •  WASD to move  •  E to enter"

	# Biome entry label (created in code so no .tscn change needed)
	biome_label = Label.new()
	biome_label.custom_minimum_size = Vector2(320, 40)
	biome_label.position = Vector2(480, 290)
	biome_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	biome_label.add_theme_font_size_override("font_size", 22)
	biome_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.50))
	biome_label.hide()
	$HUD.add_child(biome_label)

	# Back to town button
	var back_btn := Button.new()
	back_btn.text = "← Town"
	back_btn.custom_minimum_size = Vector2(90, 30)
	back_btn.position = Vector2(8, 36)
	back_btn.pressed.connect(_go_town)
	$HUD.add_child(back_btn)

	if not get_tree().root.has_node("UIScene"):
		get_tree().root.add_child(load("res://scenes/ui/UI.tscn").instantiate())

	GameState.snapshot_updated.connect(_on_state_updated)


func _process(delta: float) -> void:
	_move_player(delta)
	_move_npcs(delta)
	_check_nearby_buildings()
	_handle_interact()
	_check_biome_entry()
	_minimap_timer += delta
	if _minimap_timer >= 0.5:
		_minimap_timer = 0.0
		_update_minimap()
	if _biome_label_timer > 0.0:
		_biome_label_timer -= delta
		if _biome_label_timer <= 0.0:
			biome_label.hide()


# ── Biome map generation (Voronoi + noise warp) ───────────────────────────────
func _generate_biome_map() -> void:
	var noise := FastNoiseLite.new()
	noise.seed = 1337
	noise.frequency = 0.15

	_biome_map = PackedByteArray()
	_biome_map.resize(MAP_W * MAP_H)

	for ty in range(MAP_H):
		for tx in range(MAP_W):
			_biome_map[ty * MAP_W + tx] = _get_biome(tx, ty, noise)


func _get_biome(tx: int, ty: int, noise: FastNoiseLite) -> int:
	var warp: float = noise.get_noise_2d(float(tx), float(ty)) * 5.0
	var best := 0
	var best_dist := 99999.0
	for i in BIOME_CENTERS.size():
		var center: Vector2i = BIOME_CENTERS[i]
		var cx: float = float(center.x) + warp
		var cy: float = float(center.y) + warp
		var dist: float = Vector2(float(tx) - cx, float(ty) - cy).length()
		if dist < best_dist:
			best_dist = dist
			best = i
	return best


# ── Road & water map ──────────────────────────────────────────────────────────
# Values: 0=none  1=dirt road  2=stone plaza  3=water
func _generate_roads() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42

	_road_map = PackedByteArray()
	_road_map.resize(MAP_W * MAP_H)
	_road_map.fill(0)

	var cx := MAP_W / 2
	var cy := MAP_H / 2

	# Stone plaza (16×16) at center
	for ty in range(cy - 8, cy + 8):
		for tx in range(cx - 8, cx + 8):
			_road_map[ty * MAP_W + tx] = 2

	# 4 roads fanning outward
	_carve_road(cx, cy,  0, -1, 28, rng)
	_carve_road(cx, cy,  0,  1, 28, rng)
	_carve_road(cx, cy, -1,  0, 28, rng)
	_carve_road(cx, cy,  1,  0, 28, rng)

	# Water border (outer 3 tiles)
	for ty in range(MAP_H):
		for tx in range(MAP_W):
			if tx < 3 or tx >= MAP_W - 3 or ty < 3 or ty >= MAP_H - 3:
				_road_map[ty * MAP_W + tx] = 3


func _carve_road(sx: int, sy: int, dx: int, dy: int, length: int, rng: RandomNumberGenerator) -> void:
	var x := sx
	var y := sy
	for _i in range(length):
		for ox in range(-2, 3):
			for oy in range(-2, 3):
				var nx := x + ox
				var ny := y + oy
				if nx >= 0 and nx < MAP_W and ny >= 0 and ny < MAP_H:
					if _road_map[ny * MAP_W + nx] != 2:
						_road_map[ny * MAP_W + nx] = 1
		x = clamp(x + dx + rng.randi_range(-1, 1), 4, MAP_W - 5)
		y = clamp(y + dy + rng.randi_range(-1, 1), 4, MAP_H - 5)


# ── Building definitions ──────────────────────────────────────────────────────
func _generate_buildings() -> void:
	var cx := MAP_W / 2
	var cy := MAP_H / 2

	# Plains (always unlocked)
	_add_building(cx,      cy - 20, BIOME_PLAINS,   "arena",  "⚔ Arena",          "res://scenes/arena/Arena.tscn")
	_add_building(cx,      cy + 20, BIOME_PLAINS,   "town",   "🏠 Town Hub",       "res://scenes/town/Town.tscn")
	_add_building(cx - 18, cy,      BIOME_PLAINS,   "shop",   "🛒 Shop",           null)
	_add_building(cx + 18, cy,      BIOME_PLAINS,   "inn",    "🍺 Inn",            null)
	# Plains Biome — large explorable map (enter from world overview)
	_add_building(cx,      cy,      BIOME_PLAINS,   "lodge",  "🌿 Explore Plains", "res://scenes/plains_biome/PlainsBiome.tscn")

	# Forest — lv 8
	_add_building(14, 28, BIOME_FOREST,   "lodge",  "🌲 Ranger's Lodge", null)
	_add_building(18, 38, BIOME_FOREST,   "ruins",  "🗿 Forest Ruins",   null)

	# Desert — lv 10
	_add_building(12, 58, BIOME_DESERT,   "oasis",  "🌴 Oasis",          null)
	_add_building(18, 65, BIOME_DESERT,   "shop",   "🐪 Desert Market",  null)

	# Coast — lv 5
	_add_building(64, 38, BIOME_COAST,    "harbor", "⚓ Harbor",          null)
	_add_building(68, 48, BIOME_COAST,    "temple", "🏛 Sea Ruins",       null)

	# Mountains — lv 12
	_add_building(62, 14, BIOME_MOUNTAIN, "mine",   "⛏ Dwarf Mine",      null)
	_add_building(66, 22, BIOME_MOUNTAIN, "keep",   "🏰 Mountain Keep",  null)

	# Tundra — lv 15
	_add_building(34,  8, BIOME_TUNDRA,   "temple", "❄ Ice Temple",      null)
	_add_building(42, 12, BIOME_TUNDRA,   "lodge",  "🧊 Frost Lodge",    null)

	# Snow Peaks — lv 18
	_add_building( 6, 12, BIOME_SNOW,     "dungeon","🐉 Dragon Lair",    null)

	# Volcanic — lv 20
	_add_building(38, 68, BIOME_VOLCANIC, "forge",  "🔥 Hellforge",      null)
	_add_building(44, 72, BIOME_VOLCANIC, "portal", "💀 Demon Portal",   null)


func _add_building(tx: int, ty: int, biome: int, btype: String, label: String, scene: Variant) -> void:
	_buildings.append({
		"px":    tx * TILE_SIZE,
		"py":    ty * TILE_SIZE,
		"biome": biome,
		"type":  btype,
		"label": label,
		"scene": scene,
	})


# ── TileSet / TileMapLayer setup ─────────────────────────────────────────────
func _create_tile_map() -> void:
	# Build the TileSet from the exported RPG Maker atlas PNG at runtime.
	# Atlas:  world_a2_atlas.png  (384×240 px = 8 cols × 5 rows of 48×48 tiles)
	var atlas := TileSetAtlasSource.new()
	atlas.texture = load("res://assets/tilesets/world_a2_atlas.png")
	atlas.texture_region_size = Vector2i(TILE_SIZE, TILE_SIZE)
	for row in range(5):
		for col in range(8):
			atlas.create_tile(Vector2i(col, row))

	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE_SIZE, TILE_SIZE)
	ts.add_source(atlas, 0)

	_tile_map_layer = TileMapLayer.new()
	_tile_map_layer.z_index = -10
	_tile_map_layer.tile_set = ts
	add_child(_tile_map_layer)


# ── Terrain rendering ─────────────────────────────────────────────────────────
# Called once at startup and again whenever GameState changes (biome unlock).
func _draw_terrain() -> void:
	_tile_map_layer.clear()
	for ty in range(MAP_H):
		for tx in range(MAP_W):
			var road: int = _road_map[ty * MAP_W + tx]
			var atlas_coord: Vector2i
			if road == 3:
				atlas_coord = ATLAS_WATER
			elif road == 2:
				atlas_coord = ATLAS_STONE
			elif road == 1:
				atlas_coord = ATLAS_ROAD
			else:
				var biome_id: int = _biome_map[ty * MAP_W + tx]
				if GameState.is_biome_unlocked(biome_id):
					atlas_coord = BIOME_ATLAS[biome_id]
				else:
					atlas_coord = ATLAS_FOG
			# TileMapLayer.set_cell() has no layer argument (unlike TileMap)
			_tile_map_layer.set_cell(Vector2i(tx, ty), 0, atlas_coord)


func _on_state_updated() -> void:
	_draw_terrain()


# ── Building placement ────────────────────────────────────────────────────────
func _place_buildings() -> void:
	for b in _buildings:
		var biome_id: int = b["biome"]
		var unlocked: bool = GameState.is_biome_unlocked(biome_id)

		var node := Node2D.new()
		node.position = Vector2(b["px"], b["py"])
		node.set_meta("building", b)

		# Colored block (dark if locked)
		var img := Image.create(72, 72, false, Image.FORMAT_RGB8)
		if unlocked:
			img.fill(BUILDING_COLORS.get(b["type"], Color.GRAY))
			img.fill_rect(Rect2i(0, 0, 72, 6), Color(1, 1, 1, 0.3))
		else:
			img.fill(Color(0.12, 0.12, 0.16))
		var tex := ImageTexture.create_from_image(img)
		var spr := Sprite2D.new()
		spr.texture = tex
		node.add_child(spr)

		# Name label
		var lbl := Label.new()
		lbl.text = b["label"] if unlocked else "🔒 " + b["label"]
		lbl.position = Vector2(-50, -58)
		lbl.custom_minimum_size = Vector2(100, 0)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 12)
		var active: bool = unlocked and b["scene"] != null
		lbl.add_theme_color_override("font_color",
			Color(1.0, 0.9, 0.3) if active else Color(0.4, 0.4, 0.4))
		node.add_child(lbl)

		# [E] hint (hidden by default)
		var hint := Label.new()
		hint.name = "EnterHint"
		hint.text = "[E]"
		hint.position = Vector2(-14, -76)
		hint.add_theme_font_size_override("font_size", 11)
		hint.add_theme_color_override("font_color", Color(0.4, 1.0, 0.5))
		hint.visible = false
		node.add_child(hint)

		add_child(node)


# ── NPC spawning ──────────────────────────────────────────────────────────────
func _spawn_npcs() -> void:
	var cx_px := (MAP_W / 2) * TILE_SIZE
	var cy_px := (MAP_H / 2) * TILE_SIZE
	var names_arr := ["Villager", "Merchant", "Guard", "Traveler", "Farmer",
	                  "Hunter", "Priest", "Blacksmith", "Scout", "Elder"]
	var classes := ["warrior", "archer", "warrior", "mage", "archer",
	                "warrior", "mage", "archer", "warrior", "archer"]

	for i in range(10):
		var npc := Node2D.new()
		npc.position = Vector2(
			cx_px + _npc_rng.randi_range(-340, 340),
			cy_px + _npc_rng.randi_range(-340, 340)
		)

		var sprite := SpriteBuilder.build_world(classes[i])
		sprite.name = "Sprite"
		sprite.scale = Vector2(0.75, 0.75)
		npc.add_child(sprite)

		var name_lbl := Label.new()
		name_lbl.text = names_arr[i % names_arr.size()]
		name_lbl.position = Vector2(-30, -58)
		name_lbl.custom_minimum_size = Vector2(60, 0)
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.add_theme_font_size_override("font_size", 10)
		name_lbl.add_theme_color_override("font_color", Color(0.7, 0.9, 1.0))
		npc.add_child(name_lbl)

		var speed: float = _npc_rng.randf_range(20.0, 45.0)
		var angle: float = _npc_rng.randf() * TAU
		npc.set_meta("vel",      Vector2(cos(angle), sin(angle)) * speed)
		npc.set_meta("change_t", _npc_rng.randf_range(2.5, 6.0))
		npc.set_meta("timer",    0.0)

		add_child(npc)
		_npcs.append(npc)


func _move_npcs(delta: float) -> void:
	for npc in _npcs:
		var t: float    = npc.get_meta("timer") + delta
		var vel: Vector2 = npc.get_meta("vel")

		if t >= float(npc.get_meta("change_t")):
			t = 0.0
			var angle: float = _npc_rng.randf() * TAU
			var speed: float = _npc_rng.randf_range(20.0, 45.0)
			vel = Vector2(cos(angle), sin(angle)) * speed
			npc.set_meta("vel",      vel)
			npc.set_meta("change_t", _npc_rng.randf_range(2.5, 6.0))
		npc.set_meta("timer", t)

		var new_pos: Vector2 = npc.position + vel * delta
		new_pos = new_pos.clamp(
			Vector2(TILE_SIZE * 6, TILE_SIZE * 6),
			Vector2(WORLD_W - TILE_SIZE * 6, WORLD_H - TILE_SIZE * 6)
		)
		npc.position = new_pos

		var sprite: AnimatedSprite2D = npc.get_node_or_null("Sprite")
		if sprite:
			var dir_str: String = _vec_to_dir(vel)
			var idle_anim: String = "idle_" + dir_str
			if sprite.sprite_frames.has_animation(idle_anim):
				if sprite.animation != idle_anim:
					sprite.play(idle_anim)
			sprite.flip_h = vel.x < 0


# ── Player ────────────────────────────────────────────────────────────────────
func _create_player() -> void:
	_player = CharacterBody2D.new()
	_player.position = Vector2((MAP_W / 2) * TILE_SIZE, (MAP_H / 2) * TILE_SIZE)

	var col := CollisionShape2D.new()
	var shape := CapsuleShape2D.new()
	shape.radius = 14.0
	shape.height = 32.0
	col.shape = shape
	_player.add_child(col)

	var sprite := SpriteBuilder.build_world(GameState.char_class)
	sprite.name = "Sprite"
	sprite.scale = Vector2(0.9, 0.9)
	_player.add_child(sprite)

	var name_lbl := Label.new()
	name_lbl.text = GameState.char_name if GameState.char_name != "" else "Hero"
	name_lbl.position = Vector2(-40, -58)
	name_lbl.custom_minimum_size = Vector2(80, 0)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.add_theme_font_size_override("font_size", 11)
	name_lbl.add_theme_color_override("font_color", Color(1.0, 0.9, 0.3))
	_player.add_child(name_lbl)

	add_child(_player)


func _setup_camera() -> void:
	var cam := Camera2D.new()
	cam.limit_left   = 0
	cam.limit_top    = 0
	cam.limit_right  = WORLD_W
	cam.limit_bottom = WORLD_H
	cam.zoom = Vector2(2.0, 2.0)
	_player.add_child(cam)
	cam.make_current()


func _move_player(delta: float) -> void:
	var dir := Vector2.ZERO
	if Input.is_action_pressed("move_right"): dir.x += 1
	if Input.is_action_pressed("move_left"):  dir.x -= 1
	if Input.is_action_pressed("move_down"):  dir.y += 1
	if Input.is_action_pressed("move_up"):    dir.y -= 1

	var sprite: AnimatedSprite2D = _player.get_node_or_null("Sprite")

	if dir != Vector2.ZERO:
		dir = dir.normalized()
		if sprite and sprite.sprite_frames.has_animation("run"):
			if sprite.animation != "run":
				sprite.play("run")
	else:
		if sprite:
			var idle_anim: String = "idle_" + _vec_to_dir(_player.velocity)
			if sprite.sprite_frames.has_animation(idle_anim):
				if sprite.animation != idle_anim:
					sprite.play(idle_anim)
			elif sprite.sprite_frames.has_animation("idle_south"):
				if sprite.animation != "idle_south":
					sprite.play("idle_south")

	if sprite:
		if dir.x < 0:
			sprite.flip_h = true
		elif dir.x > 0:
			sprite.flip_h = false

	_player.velocity = dir * PLAYER_SPEED
	_player.move_and_slide()


func _vec_to_dir(vel: Vector2) -> String:
	if vel.length() < 1.0:
		return "south"
	var angle: float = vel.angle()
	var octant: int = int(round(angle / (PI / 4.0))) % 8
	match octant:
		0:        return "east"
		1:        return "south-east"
		2:        return "south"
		3:        return "south-west"
		-4, 4:    return "west"
		-3:       return "north-west"
		-2:       return "north"
		-1:       return "north-east"
		_:        return "south"


# ── Biome entry detection ─────────────────────────────────────────────────────
func _check_biome_entry() -> void:
	var tx: int = clamp(int(_player.position.x) / TILE_SIZE, 0, MAP_W - 1)
	var ty: int = clamp(int(_player.position.y) / TILE_SIZE, 0, MAP_H - 1)
	var biome_id: int = _biome_map[ty * MAP_W + tx]
	if biome_id == _current_biome:
		return
	_current_biome = biome_id
	if GameState.is_biome_unlocked(biome_id):
		biome_label.text = String(BIOME_NAMES[biome_id])
		biome_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.50))
	else:
		var unlock_lv: int = int(GameState.BIOME_UNLOCK_LEVELS[biome_id])
		biome_label.text = "🔒 " + String(BIOME_NAMES[biome_id]) + "  (Level %d)" % unlock_lv
		biome_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	biome_label.show()
	_biome_label_timer = 3.0


# ── Interaction ───────────────────────────────────────────────────────────────
func _check_nearby_buildings() -> void:
	var closest: Dictionary = {}
	var min_dist := INTERACT_DIST + 1.0

	for child in get_children():
		if not child.has_meta("building"):
			continue
		var b: Dictionary = child.get_meta("building")
		var dist: float = _player.position.distance_to(child.position)
		var hint: Label = child.get_node_or_null("EnterHint")
		if hint:
			hint.visible = dist < INTERACT_DIST
		if dist < min_dist:
			min_dist = dist
			closest = b

	if closest.is_empty():
		interact_hint.hide()
		_near_building = {}
	else:
		_near_building = closest
		interact_hint.text = "Press E to enter  " + closest.get("label", "")
		interact_hint.show()


func _handle_interact() -> void:
	if Input.is_action_just_pressed("interact") and not _near_building.is_empty():
		_enter_building(_near_building)


func _enter_building(b: Dictionary) -> void:
	var biome_id: int = b["biome"]
	if not GameState.is_biome_unlocked(biome_id):
		var unlock_lv: int = int(GameState.BIOME_UNLOCK_LEVELS[biome_id])
		interact_hint.text = "🔒 Reach Level %d to unlock %s" % [unlock_lv, String(BIOME_NAMES[biome_id])]
		return
	var scene = b.get("scene", null)
	if scene != null:
		WsManager.leave_room("world_map")
		get_tree().change_scene_to_file(scene)
	else:
		interact_hint.text = "🔒 " + b.get("label", "") + " — coming soon"


func _go_town() -> void:
	WsManager.leave_room("world_map")
	get_tree().change_scene_to_file("res://scenes/town/Town.tscn")


# ── Minimap ───────────────────────────────────────────────────────────────────
func _update_minimap() -> void:
	var mw := 160
	var mh := 120
	var img := Image.create(mw, mh, false, Image.FORMAT_RGB8)

	for my in range(mh):
		for mx in range(mw):
			var tx: int = int(float(mx) / mw * MAP_W)
			var ty: int = int(float(my) / mh * MAP_H)
			var road: int = _road_map[ty * MAP_W + tx]
			var col: Color
			if road == 3:
				col = WATER_COLOR * 0.8
			elif road >= 1:
				col = ROAD_COLOR * 0.9
			else:
				var biome_id: int = _biome_map[ty * MAP_W + tx]
				if GameState.is_biome_unlocked(biome_id):
					col = BIOME_COLORS[biome_id] * 0.75
				else:
					col = FOG_COLOR
			img.set_pixel(mx, my, col)

	# Buildings
	for b in _buildings:
		var mx: int = int(float(b["px"]) / WORLD_W * mw)
		var my_pos: int = int(float(b["py"]) / WORLD_H * mh)
		var bcol: Color = BUILDING_COLORS.get(b["type"], Color.GRAY)
		for ox in range(-2, 3):
			for oy in range(-2, 3):
				img.set_pixel(clamp(mx + ox, 0, mw - 1), clamp(my_pos + oy, 0, mh - 1), bcol)

	# Player dot
	var px: int = int(float(_player.position.x) / WORLD_W * mw)
	var py: int = int(float(_player.position.y) / WORLD_H * mh)
	for ox in range(-3, 4):
		for oy in range(-3, 4):
			img.set_pixel(clamp(px + ox, 0, mw - 1), clamp(py + oy, 0, mh - 1), Color.WHITE)

	minimap_rect.texture = ImageTexture.create_from_image(img)
