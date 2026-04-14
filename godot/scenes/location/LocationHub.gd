extends Control

# ── LocationHub — generic skeleton for any location not yet fully implemented.
#
# Vertical slice:  PlainsBiome → [E] near location → LocationHub → [Leave] → PlainsBiome
#
# Shows:  location name, available actions (most stubbed), player stats bar.
# Expand each action button to a real scene later.
# ─────────────────────────────────────────────────────────────────────────────

# Actions each location can offer — which ones appear depends on location type.
# All stubbed with "Coming soon" except the ones that have a real scene.
const ACTION_DEFS: Dictionary = {
	"Quest Board": { "icon": "📜", "scene": null,  "desc": "Pick up local quests" },
	"Shop":        { "icon": "🛒", "scene": null,  "desc": "Buy and sell items" },
	"Inn":         { "icon": "🍺", "scene": null,  "desc": "Rest and recover HP" },
	"Arena":       { "icon": "⚔", "scene": "res://scenes/arena/Arena.tscn",  "desc": "Fight in the arena" },
	"Expedition":  { "icon": "🗺", "scene": null,  "desc": "Send on an expedition" },
	"Forge":       { "icon": "🔨", "scene": null,  "desc": "Upgrade equipment" },
}

# Which actions appear at each location type
const LOCATION_ACTIONS: Dictionary = {
	"Ironhaven":       ["Quest Board","Shop","Inn","Arena","Expedition","Forge"],
	"Millhaven":       ["Quest Board","Shop","Inn"],
	"Stonegate":       ["Quest Board","Shop","Inn","Forge"],
	"Dusthaven":       ["Quest Board","Shop","Inn"],
	"Westbrook":       ["Quest Board","Inn"],
	"Ancient Ruins":   ["Quest Board","Expedition"],
	"Ranger's Lodge":  ["Quest Board","Inn"],
	"Bandit Camp":     ["Arena"],
	"Fishing Village": ["Shop","Inn"],
	"Dwarven Mine":    ["Shop","Forge","Expedition"],
	"Lake Ashvale":    ["Inn"],
}


func _ready() -> void:
	var loc: String = GameState.entered_location
	if loc == "":
		loc = "Unknown Location"

	# Background
	var bg := ColorRect.new()
	bg.color = Color(0.07, 0.06, 0.10)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Title
	var title := Label.new()
	title.text = loc
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	title.offset_top = 40.0
	title.offset_bottom = 90.0
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", Color(1.0, 0.88, 0.40))
	add_child(title)

	# Subtitle
	var sub := Label.new()
	sub.text = "Plains Biome  •  Level 1+ area"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	sub.offset_top = 90.0
	sub.offset_bottom = 115.0
	sub.add_theme_font_size_override("font_size", 14)
	sub.add_theme_color_override("font_color", Color(0.55, 0.55, 0.65))
	add_child(sub)

	# Player stat strip
	var stat_bar := Label.new()
	stat_bar.text = "%s  Lv.%d     HP %d/%d     Gold %d" % [
		GameState.char_name, GameState.level,
		GameState.current_hp, GameState.max_hp, GameState.gold
	]
	stat_bar.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stat_bar.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	stat_bar.offset_top = 120.0
	stat_bar.offset_bottom = 148.0
	stat_bar.add_theme_font_size_override("font_size", 15)
	stat_bar.add_theme_color_override("font_color", Color(0.75, 0.95, 0.75))
	add_child(stat_bar)

	# Divider
	var div := ColorRect.new()
	div.color = Color(0.25, 0.22, 0.35)
	div.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	div.offset_top = 155.0
	div.offset_bottom = 157.0
	div.offset_left = 120.0
	div.offset_right = -120.0
	add_child(div)

	# Action buttons
	var actions: Array = LOCATION_ACTIONS.get(loc, ["Quest Board"])
	var btn_y := 175.0
	var btn_w := 260.0
	var btn_h := 54.0
	var spacing := 12.0
	var start_x := 640.0 - btn_w / 2.0  # centered

	for action_name in actions:
		var def: Dictionary = ACTION_DEFS.get(action_name, {})
		if def.is_empty():
			continue
		var icon: String = def.get("icon", "•")
		var desc: String = def.get("desc", "")
		var target_scene: Variant = def.get("scene", null)

		var btn := Button.new()
		btn.text = icon + "  " + action_name
		btn.tooltip_text = desc
		btn.custom_minimum_size = Vector2(btn_w, btn_h)
		btn.position = Vector2(start_x, btn_y)
		btn.add_theme_font_size_override("font_size", 18)

		if target_scene != null:
			btn.pressed.connect(_go_to.bind(target_scene as String))
		else:
			btn.modulate = Color(0.6, 0.6, 0.6, 0.9)
			btn.pressed.connect(_show_stub.bind(action_name))

		add_child(btn)
		btn_y += btn_h + spacing

	# Leave button (always at bottom)
	var leave := Button.new()
	leave.text = "← Leave " + loc
	leave.custom_minimum_size = Vector2(btn_w, btn_h)
	leave.position = Vector2(start_x, btn_y + 16.0)
	leave.add_theme_font_size_override("font_size", 16)
	leave.add_theme_color_override("font_color", Color(0.80, 0.65, 0.45))
	leave.pressed.connect(_leave)
	add_child(leave)

	# Stub feedback label (hidden)
	var stub_lbl := Label.new()
	stub_lbl.name = "StubLabel"
	stub_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stub_lbl.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	stub_lbl.offset_bottom = -20.0
	stub_lbl.offset_top = -54.0
	stub_lbl.add_theme_font_size_override("font_size", 14)
	stub_lbl.add_theme_color_override("font_color", Color(0.80, 0.70, 0.40))
	stub_lbl.hide()
	add_child(stub_lbl)


func _go_to(scene_path: String) -> void:
	get_tree().change_scene_to_file(scene_path)


func _show_stub(action_name: String) -> void:
	var lbl: Label = get_node_or_null("StubLabel")
	if lbl:
		lbl.text = "🔒 " + action_name + " — coming soon"
		lbl.show()
		get_tree().create_timer(2.0).timeout.connect(func(): lbl.hide())


func _leave() -> void:
	get_tree().change_scene_to_file("res://scenes/plains_biome/PlainsBiome.tscn")
