extends Node

# ── Character folder per class ────────────────────────────────────────────────
const CLASS_FOLDERS := {
	"warrior":  "Male_human_barbarian_gladiator_very_pale_white_ski",
	"paladin":  "Male_human_barbarian_gladiator_very_pale_white_ski",
	"archer":   "Male_human_gladiator_mediterranean_tan_skin_short",
	"mage":     "Male_human_gladiator_mediterranean_tan_skin_short",
	"assassin": "Male_human_gladiator_mediterranean_tan_skin_short",
}

const BARBARIAN  := "Male_human_barbarian_gladiator_very_pale_white_ski"
const MEDITERRAN := "Male_human_gladiator_mediterranean_tan_skin_short"

const IDLE_DIRS := ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]

# ── Public: build an AnimatedSprite2D for the world map (idle + run) ──────────
func build_world(char_class: String) -> AnimatedSprite2D:
	var folder: String = CLASS_FOLDERS.get(char_class, BARBARIAN)
	return _build_sprite(folder, false)


# ── Public: build an AnimatedSprite2D for the arena (combat animations) ───────
func build_arena(char_class: String) -> AnimatedSprite2D:
	var folder: String = CLASS_FOLDERS.get(char_class, BARBARIAN)
	return _build_sprite(folder, true)


func build_arena_enemy() -> AnimatedSprite2D:
	# Enemy always uses the second skin, flipped to face left
	var sprite := _build_sprite(MEDITERRAN, true)
	sprite.flip_h = true
	return sprite


# ── Internal ──────────────────────────────────────────────────────────────────
func _build_sprite(folder: String, combat_only: bool) -> AnimatedSprite2D:
	# Resolve animation subfolder names (they end with -hash)
	var anims: Dictionary = _find_anims(folder)

	var frames := SpriteFrames.new()
	frames.remove_animation("default")

	if not combat_only:
		_add_idle_dirs(frames, anims)
		_add_run(frames, anims)
	else:
		_add_combat(frames, anims)

	var sprite := AnimatedSprite2D.new()
	sprite.sprite_frames = frames

	# Play first available animation
	var first_anim: String = ""
	if not combat_only and frames.has_animation("idle_south"):
		first_anim = "idle_south"
	elif combat_only and frames.has_animation("fight_idle"):
		first_anim = "fight_idle"

	if first_anim != "":
		sprite.play(first_anim)
	return sprite


func _find_anims(folder: String) -> Dictionary:
	var result: Dictionary = {}
	var anim_base := "res://" + folder + "/animations/"
	var dir := DirAccess.open(anim_base)
	if not dir:
		push_error("[SpriteBuilder] Cannot open: " + anim_base)
		return result
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if dir.current_is_dir():
			var key: String = entry.split("-")[0]  # e.g. "Running"
			result[key] = anim_base + entry        # full path
		entry = dir.get_next()
	dir.list_dir_end()
	return result


func _add_idle_dirs(frames: SpriteFrames, anims: Dictionary) -> void:
	if not anims.has("Breathing_Idle"):
		return
	var base_path: String = anims["Breathing_Idle"]
	for dir_name in IDLE_DIRS:
		var dir_str: String = dir_name
		var key: String = "idle_" + dir_str
		frames.add_animation(key)
		frames.set_animation_speed(key, 5.0)
		frames.set_animation_loop(key, true)
		for i in range(4):
			var path: String = base_path + "/" + dir_str + "/frame_%03d.png" % i
			if ResourceLoader.exists(path):
				frames.add_frame(key, load(path))


func _add_run(frames: SpriteFrames, anims: Dictionary) -> void:
	if not anims.has("Running"):
		return
	var base_path: String = anims["Running"]
	frames.add_animation("run")
	frames.set_animation_speed("run", 8.0)
	frames.set_animation_loop("run", true)
	for i in range(6):
		var path: String = base_path + "/south/frame_%03d.png" % i
		if ResourceLoader.exists(path):
			frames.add_frame("run", load(path))


func _add_combat(frames: SpriteFrames, anims: Dictionary) -> void:
	# fight_idle — Fight_Stance_Idle/east, 8 frames, looping
	_add_anim(frames, anims, "fight_idle",   "Fight_Stance_Idle", "east", 8,  6.0,  true)
	# Attacks — not looping
	_add_anim(frames, anims, "cross_punch",  "Cross_Punch",       "east", 6,  10.0, false)
	_add_anim(frames, anims, "lead_jab",     "Lead_Jab",          "east", 3,  12.0, false)
	_add_anim(frames, anims, "uppercut",     "Surprise_Uppercut", "east", 7,  10.0, false)
	_add_anim(frames, anims, "take_hit",     "Taking_Punch",      "east", 6,  10.0, false)
	_add_anim(frames, anims, "death",        "Falling_Back_Death","east", 7,  8.0,  false)


func _add_anim(frames: SpriteFrames, anims: Dictionary,
		key: String, src: String, dir_name: String,
		frame_count: int, fps: float, loop: bool) -> void:
	if not anims.has(src):
		return
	var base_path: String = anims[src]
	frames.add_animation(key)
	frames.set_animation_speed(key, fps)
	frames.set_animation_loop(key, loop)
	for i in range(frame_count):
		var path: String = base_path + "/" + dir_name + "/frame_%03d.png" % i
		if ResourceLoader.exists(path):
			frames.add_frame(key, load(path))
