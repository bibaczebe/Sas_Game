extends Node2D

# ── Constants ─────────────────────────────────────────────────────────────────
const TILE_SIZE     := 48
const MAP_JSON      := "res://assets/maps/plains_biome.json"
const OUTSIDE_A2    := "res://assets/tilesets/outside_a2.png"
const PLAYER_SPEED  := 220.0
const INTERACT_DIST := 80.0

# Packed-tile sentinels (match convert-rpgmz-map.js)
const PACKED_EMPTY := 65535
const PACKED_WATER := 65534

# ── FLOOR_AUTOTILE_TABLE ──────────────────────────────────────────────────────
# Direct port of Tilemap.FLOOR_AUTOTILE_TABLE from RPG Maker MZ rmmz_core.js.
# Each entry: 4 quadrants [qsx, qsy] giving 24×24 mini-tile offsets inside
# the tile-type's 96×144 block in Outside_A2.png.
# Quadrant order: TL=0, TR=1, BL=2, BR=3.
# Pixel formula per quadrant i:
#   src_x = (kind%8)*96  + qsx*24
#   src_y = (kind/8)*144 + qsy*24
#   dst_x = (i%2)*24
#   dst_y = (i/2)*24
const AUTOTILE_TABLE: Array = [
	[[2,4],[1,4],[2,3],[1,3]], # 0
	[[2,0],[1,4],[2,3],[1,3]], # 1
	[[2,4],[3,0],[2,3],[1,3]], # 2
	[[2,0],[3,0],[2,3],[1,3]], # 3
	[[2,4],[1,4],[2,3],[3,1]], # 4
	[[2,0],[1,4],[2,3],[3,1]], # 5
	[[2,4],[3,0],[2,3],[3,1]], # 6
	[[2,0],[3,0],[2,3],[3,1]], # 7
	[[2,4],[1,4],[2,1],[1,3]], # 8
	[[2,0],[1,4],[2,1],[1,3]], # 9
	[[2,4],[3,0],[2,1],[1,3]], # 10
	[[2,0],[3,0],[2,1],[1,3]], # 11
	[[2,4],[1,4],[2,1],[3,1]], # 12
	[[2,0],[1,4],[2,1],[3,1]], # 13
	[[2,4],[3,0],[2,1],[3,1]], # 14
	[[2,0],[3,0],[2,1],[3,1]], # 15
	[[0,4],[1,4],[0,3],[1,3]], # 16
	[[0,4],[3,0],[0,3],[1,3]], # 17
	[[0,4],[1,4],[0,3],[3,1]], # 18
	[[0,4],[3,0],[0,3],[3,1]], # 19
	[[2,2],[1,2],[2,3],[1,3]], # 20
	[[2,2],[1,2],[2,3],[3,1]], # 21
	[[2,2],[1,2],[2,1],[1,3]], # 22
	[[2,2],[1,2],[2,1],[3,1]], # 23
	[[2,4],[3,4],[2,3],[3,3]], # 24
	[[2,4],[3,4],[2,1],[3,3]], # 25
	[[2,0],[3,4],[2,3],[3,3]], # 26
	[[2,0],[3,4],[2,1],[3,3]], # 27
	[[2,4],[1,4],[2,5],[1,5]], # 28
	[[2,0],[1,4],[2,5],[1,5]], # 29
	[[2,4],[3,0],[2,5],[1,5]], # 30
	[[2,0],[3,0],[2,5],[1,5]], # 31
	[[0,4],[3,4],[0,3],[3,3]], # 32
	[[2,2],[1,2],[2,5],[1,5]], # 33
	[[0,2],[1,2],[0,3],[1,3]], # 34
	[[0,2],[1,2],[0,3],[3,1]], # 35
	[[2,2],[3,2],[2,3],[3,3]], # 36
	[[2,2],[3,2],[2,1],[3,3]], # 37
	[[2,4],[3,4],[2,5],[3,5]], # 38
	[[2,0],[3,4],[2,5],[3,5]], # 39
	[[0,4],[1,4],[0,5],[1,5]], # 40
	[[0,4],[3,0],[0,5],[1,5]], # 41
	[[0,2],[3,2],[0,3],[3,3]], # 42
	[[0,2],[1,2],[0,5],[1,5]], # 43
	[[0,4],[3,4],[0,5],[3,5]], # 44
	[[2,2],[3,2],[2,5],[3,5]], # 45
	[[0,2],[3,2],[0,5],[3,5]], # 46
	[[0,0],[1,0],[0,1],[1,1]], # 47 (fully surrounded — solid fill)
]

# ── Named locations (tile coordinates) ───────────────────────────────────────
# scene: null → uses generic LocationHub skeleton
const LOCATIONS: Array = [
	{ "name": "Ironhaven",       "tx": 149, "ty": 149, "color": Color(0.95, 0.85, 0.20), "scene": "res://scenes/town/Town.tscn" },
	{ "name": "Millhaven",       "tx": 106, "ty":  69, "color": Color(0.75, 0.95, 0.30), "scene": null },
	{ "name": "Stonegate",       "tx": 228, "ty": 149, "color": Color(0.75, 0.95, 0.30), "scene": null },
	{ "name": "Dusthaven",       "tx": 149, "ty": 237, "color": Color(0.75, 0.95, 0.30), "scene": null },
	{ "name": "Westbrook",       "tx":  68, "ty": 149, "color": Color(0.75, 0.95, 0.30), "scene": null },
	{ "name": "Ancient Ruins",   "tx": 190, "ty":  48, "color": Color(0.80, 0.65, 0.35), "scene": null },
	{ "name": "Ranger's Lodge",  "tx":  52, "ty": 122, "color": Color(0.35, 0.70, 0.30), "scene": null },
	{ "name": "Bandit Camp",     "tx":  93, "ty": 213, "color": Color(0.85, 0.20, 0.20), "scene": null },
	{ "name": "Fishing Village", "tx": 268, "ty": 175, "color": Color(0.25, 0.55, 0.85), "scene": null },
	{ "name": "Dwarven Mine",    "tx": 245, "ty":  88, "color": Color(0.65, 0.60, 0.40), "scene": null },
	{ "name": "Lake Ashvale",    "tx": 148, "ty": 216, "color": Color(0.20, 0.45, 0.80), "scene": null },
]

# ── State ─────────────────────────────────────────────────────────────────────
var _map_w: int = 0
var _map_h: int = 0
var _tile_layer: TileMapLayer
var _player: CharacterBody2D
var _minimap_timer := 0.0
var _location_label_timer := 0.0
var _current_loc := ""
var _near_location: Dictionary = {}
# Maps packed_int → atlas Vector2i for minimap color lookup
var _packed_to_atlas: Dictionary = {}

@onready var _hud:        CanvasLayer = $HUD
@onready var _minimap:    TextureRect = $HUD/Minimap
@onready var _hint_label: Label       = $HUD/HintLabel
@onready var _loc_label:  Label       = $HUD/LocationLabel

var _loc_popup: Label


func _ready() -> void:
	WsManager.join_room("plains_biome")

	_load_map()
	_create_player()
	_setup_camera()

	_hint_label.hide()
	_loc_label.text = "Plains — Ironhaven Region"

	# Floating location popup
	_loc_popup = Label.new()
	_loc_popup.custom_minimum_size = Vector2(320, 36)
	_loc_popup.position = Vector2(480, 290)
	_loc_popup.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_loc_popup.add_theme_font_size_override("font_size", 20)
	_loc_popup.add_theme_color_override("font_color", Color(1.0, 0.92, 0.50))
	_loc_popup.hide()
	_hud.add_child(_loc_popup)

	var back := Button.new()
	back.text = "← World Map"
	back.custom_minimum_size = Vector2(110, 30)
	back.position = Vector2(8, 36)
	back.pressed.connect(_go_world_map)
	_hud.add_child(back)

	if not get_tree().root.has_node("UIScene"):
		get_tree().root.add_child(load("res://scenes/ui/UI.tscn").instantiate())


func _process(delta: float) -> void:
	_move_player(delta)
	_check_location()
	_handle_interact()
	_minimap_timer += delta
	if _minimap_timer >= 0.5:
		_minimap_timer = 0.0
		_update_minimap()
	if _location_label_timer > 0.0:
		_location_label_timer -= delta
		if _location_label_timer <= 0.0:
			_loc_popup.hide()


# ── Map loading ───────────────────────────────────────────────────────────────
func _load_map() -> void:
	if not FileAccess.file_exists(MAP_JSON):
		push_error("[PlainsBiome] Map data not found: " + MAP_JSON)
		push_error("  Run: node convert-rpgmz-map.js  from the SaS game folder.")
		return

	print("[PlainsBiome] Loading map from: " + MAP_JSON)
	var f := FileAccess.open(MAP_JSON, FileAccess.READ)
	var raw: Variant = JSON.parse_string(f.get_as_text())
	f.close()

	if not raw is Dictionary:
		push_error("[PlainsBiome] JSON parse failed — run: node convert-rpgmz-map.js")
		return
	var parsed: Dictionary = raw

	_map_w = int(parsed["width"])
	_map_h = int(parsed["height"])
	var tiles: Array = parsed["tiles"]

	# ── Step 1: collect unique packed values (skip empty/water for atlas) ─────
	var unique_packed: Array = []
	for v_raw in tiles:
		var v: int = int(v_raw)
		if v != PACKED_EMPTY and v != PACKED_WATER:
			if not (v in unique_packed):
				unique_packed.append(v)

	print("[PlainsBiome] Unique autotile variants: %d" % unique_packed.size())

	# ── Step 2: composite atlas from Outside_A2.png ───────────────────────────
	var a2_img: Image = load(OUTSIDE_A2).get_image()
	# Atlas layout: up to 32 tiles per row
	const COLS_PER_ROW := 32
	var tile_count: int = unique_packed.size() + 1  # +1 for water tile
	var atlas_cols: int = min(tile_count, COLS_PER_ROW)
	var atlas_rows: int = int(ceil(float(tile_count) / COLS_PER_ROW))
	var atlas_img := Image.create(
		atlas_cols * TILE_SIZE,
		atlas_rows * TILE_SIZE,
		false,
		Image.FORMAT_RGBA8
	)

	# Build packed_int → atlas_index mapping
	var packed_to_idx: Dictionary = {}
	var idx: int = 0
	for packed in unique_packed:
		packed_to_idx[packed] = idx
		_composite_tile(a2_img, atlas_img, packed, idx)
		idx += 1

	# Water tile (solid blue-ish) at idx = unique_packed.size()
	var water_idx: int = idx
	var water_col: int = water_idx % COLS_PER_ROW
	var water_row: int = water_idx / COLS_PER_ROW
	var water_rect := Rect2i(water_col * TILE_SIZE, water_row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
	atlas_img.fill_rect(water_rect, Color(0.15, 0.30, 0.65, 1.0))

	# ── Step 3: build TileSet from composited atlas ────────────────────────────
	var atlas_tex := ImageTexture.create_from_image(atlas_img)
	var atlas_src := TileSetAtlasSource.new()
	atlas_src.texture = atlas_tex
	atlas_src.texture_region_size = Vector2i(TILE_SIZE, TILE_SIZE)
	for r in range(atlas_rows):
		for c in range(atlas_cols):
			if r * COLS_PER_ROW + c < tile_count:
				atlas_src.create_tile(Vector2i(c, r))

	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE_SIZE, TILE_SIZE)
	ts.add_source(atlas_src, 0)

	_tile_layer = TileMapLayer.new()
	_tile_layer.z_index = -10
	_tile_layer.tile_set = ts
	add_child(_tile_layer)

	# ── Step 4: populate cells ────────────────────────────────────────────────
	var placed := 0
	for ty in range(_map_h):
		for tx in range(_map_w):
			var v: int = int(tiles[ty * _map_w + tx])
			if v == PACKED_EMPTY:
				continue
			var tile_idx: int
			if v == PACKED_WATER:
				tile_idx = water_idx
			elif packed_to_idx.has(v):
				tile_idx = packed_to_idx[v]
			else:
				continue
			var ac := Vector2i(tile_idx % COLS_PER_ROW, tile_idx / COLS_PER_ROW)
			_tile_layer.set_cell(Vector2i(tx, ty), 0, ac)
			_packed_to_atlas[v] = ac
			placed += 1

	print("[PlainsBiome] Map loaded: %d×%d, %d tiles placed." % [_map_w, _map_h, placed])


# ── Autotile compositor ───────────────────────────────────────────────────────
# Composites one 48×48 tile into atlas_img at slot `idx` using AUTOTILE_TABLE.
# Source: Outside_A2.png (768×576), 96×144 px per kind, 24×24 mini-tiles.
func _composite_tile(a2: Image, atlas: Image, packed: int, idx: int) -> void:
	var kind: int  = packed / 48   # 0–31
	var shape: int = packed % 48   # 0–47
	var entry: Array = AUTOTILE_TABLE[shape]

	var bx: int = (kind % 8) * 96   # x pixel of kind's block in Outside_A2.png
	var by: int = (kind / 8) * 144  # y pixel of kind's block

	var dst_col: int = idx % 32
	var dst_row: int = idx / 32
	var dst_x0: int  = dst_col * TILE_SIZE
	var dst_y0: int  = dst_row * TILE_SIZE

	for i in 4:
		var qsx: int = entry[i][0]
		var qsy: int = entry[i][1]
		var src_x: int = bx + qsx * 24
		var src_y: int = by + qsy * 24
		var dst_x: int = dst_x0 + (i % 2) * 24
		var dst_y: int = dst_y0 + (i / 2) * 24
		atlas.blit_rect(a2, Rect2i(src_x, src_y, 24, 24), Vector2i(dst_x, dst_y))


# ── Player ────────────────────────────────────────────────────────────────────
func _create_player() -> void:
	_player = CharacterBody2D.new()
	# Spawn at Ironhaven (149,149) in tile coords
	_player.position = Vector2(149 * TILE_SIZE, 149 * TILE_SIZE)

	var col := CollisionShape2D.new()
	var shape := CapsuleShape2D.new()
	shape.radius = 14.0
	shape.height = 30.0
	col.shape = shape
	_player.add_child(col)

	var sprite := SpriteBuilder.build_world(GameState.char_class)
	sprite.name = "Sprite"
	sprite.scale = Vector2(0.9, 0.9)
	_player.add_child(sprite)

	var name_lbl := Label.new()
	name_lbl.text = GameState.char_name if GameState.char_name != "" else "Hero"
	name_lbl.position = Vector2(-42, -60)
	name_lbl.custom_minimum_size = Vector2(84, 0)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.add_theme_font_size_override("font_size", 11)
	name_lbl.add_theme_color_override("font_color", Color(1.0, 0.9, 0.3))
	_player.add_child(name_lbl)

	add_child(_player)


func _setup_camera() -> void:
	var cam := Camera2D.new()
	cam.zoom = Vector2(1.5, 1.5)
	if _map_w > 0 and _map_h > 0:
		cam.limit_right  = _map_w * TILE_SIZE
		cam.limit_bottom = _map_h * TILE_SIZE
	else:
		cam.limit_right  = 14400
		cam.limit_bottom = 14400
	cam.limit_left = 0
	cam.limit_top  = 0
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
		if sprite:
			if dir.x < 0:   sprite.flip_h = true
			elif dir.x > 0: sprite.flip_h = false
	else:
		if sprite and sprite.sprite_frames.has_animation("idle_south"):
			if sprite.animation != "idle_south":
				sprite.play("idle_south")

	_player.velocity = dir * PLAYER_SPEED
	_player.move_and_slide()


# ── Location detection + interact ────────────────────────────────────────────
func _check_location() -> void:
	var px: float = _player.position.x
	var py: float = _player.position.y
	var closest: Dictionary = {}
	var min_dist := float(TILE_SIZE) * 5.5

	for loc in LOCATIONS:
		var lx := float(int(loc["tx"]) * TILE_SIZE)
		var ly := float(int(loc["ty"]) * TILE_SIZE)
		var dist := Vector2(px - lx, py - ly).length()
		if dist < min_dist:
			min_dist = dist
			closest = loc

	_near_location = closest
	if closest.is_empty():
		_hint_label.hide()
		_current_loc = ""
	else:
		var lname: String = closest["name"]
		_hint_label.text = "[E]  Enter " + lname
		_hint_label.show()
		if _current_loc != lname:
			_current_loc = lname
			_loc_popup.text = lname
			_loc_popup.show()
			_location_label_timer = 3.0


func _handle_interact() -> void:
	if not Input.is_action_just_pressed("interact"):
		return
	if _near_location.is_empty():
		return
	GameState.entered_location = _near_location["name"]
	WsManager.leave_room("plains_biome")
	var target: Variant = _near_location.get("scene", null)
	if target == null:
		get_tree().change_scene_to_file("res://scenes/location/LocationHub.tscn")
	else:
		get_tree().change_scene_to_file(target as String)


# ── Minimap ───────────────────────────────────────────────────────────────────
func _update_minimap() -> void:
	if _map_w == 0 or _tile_layer == null:
		return

	const MW := 160
	const MH := 120
	var img := Image.create(MW, MH, false, Image.FORMAT_RGB8)

	# Sample terrain colors from tile layer
	for my in range(MH):
		for mx in range(MW):
			var tx: int = int(float(mx) / MW * _map_w)
			var ty: int = int(float(my) / MH * _map_h)
			var src_id: int = _tile_layer.get_cell_source_id(Vector2i(tx, ty))
			var col: Color
			if src_id < 0:
				col = Color(0.06, 0.08, 0.04)   # empty/dark
			else:
				var ac: Vector2i = _tile_layer.get_cell_atlas_coords(Vector2i(tx, ty))
				col = _atlas_to_minimap_color(ac)
			img.set_pixel(mx, my, col)

	# Location dots
	for loc in LOCATIONS:
		var mx: int = int(float(int(loc["tx"])) / _map_w * MW)
		var my_pos: int = int(float(int(loc["ty"])) / _map_h * MH)
		var lcol: Color = loc["color"]
		for ox in range(-2, 3):
			for oy in range(-2, 3):
				img.set_pixel(clamp(mx+ox, 0, MW-1), clamp(my_pos+oy, 0, MH-1), lcol)

	# Player dot
	var ppx: int = int((_player.position.x / (_map_w * TILE_SIZE)) * MW)
	var ppy: int = int((_player.position.y / (_map_h * TILE_SIZE)) * MH)
	for ox in range(-3, 4):
		for oy in range(-3, 4):
			img.set_pixel(clamp(ppx+ox, 0, MW-1), clamp(ppy+oy, 0, MH-1), Color.WHITE)

	_minimap.texture = ImageTexture.create_from_image(img)


func _atlas_to_minimap_color(ac: Vector2i) -> Color:
	# Reverse-lookup packed value from atlas coords
	for packed in _packed_to_atlas:
		if _packed_to_atlas[packed] == ac:
			return _kind_to_minimap_color(packed / 48)
	return Color(0.10, 0.22, 0.55)  # water / unknown


func _kind_to_minimap_color(kind: int) -> Color:
	match kind:
		0:  return Color(0.35, 0.62, 0.22)  # Grassland A
		1:  return Color(0.18, 0.38, 0.14)  # Grassland Dark
		2:  return Color(0.40, 0.66, 0.26)  # Grassland B
		3:  return Color(0.26, 0.44, 0.18)  # Grassland B Dark
		4:  return Color(0.12, 0.32, 0.10)  # Forest
		5:  return Color(0.08, 0.22, 0.06)  # Forest Fir
		6:  return Color(0.48, 0.46, 0.38)  # Mountain Grass
		7:  return Color(0.44, 0.38, 0.28)  # Mountain Dirt
		8, 9:  return Color(0.55, 0.48, 0.30)   # Wasteland
		10, 11: return Color(0.60, 0.54, 0.34)  # Dirt Field
		13: return Color(0.56, 0.42, 0.20)  # Road Dirt
		16, 17: return Color(0.82, 0.74, 0.40)  # Desert
		21: return Color(0.46, 0.44, 0.40)  # Road Paved
		22: return Color(0.45, 0.44, 0.40)  # Mountain Rock
		24: return Color(0.80, 0.88, 0.95)  # Snowfield
		25: return Color(0.90, 0.94, 0.98)  # Mountain Snow
	return Color(0.38, 0.55, 0.28)   # fallback grass


# ── Navigation ────────────────────────────────────────────────────────────────
func _go_world_map() -> void:
	WsManager.leave_room("plains_biome")
	get_tree().change_scene_to_file("res://scenes/world_map/WorldMap.tscn")
