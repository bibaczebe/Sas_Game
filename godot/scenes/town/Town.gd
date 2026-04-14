extends Node2D

# Town hub — 6 buildings, drawn with CanvasItem draw calls.
# Buildings with a target scene navigate on click; locked ones show a tooltip.

const BUILDINGS := [
	{ "label": "Arena",       "x": 940,  "y": 370, "scene": "res://scenes/arena/Arena.tscn",     "desc": "Turn-based combat for glory and gold",       "color": Color(0.8, 0.13, 0.13), "icon": "⚔" },
	{ "label": "Tavern",      "x": 340,  "y": 400, "scene": "res://scenes/tavern/Tavern.tscn",   "desc": "Send on expeditions — collect rewards later", "color": Color(0.55, 0.27, 0.07), "icon": "🍺" },
	{ "label": "Plains Map",  "x": 640,  "y": 550, "scene": "res://scenes/plains_biome/PlainsBiome.tscn", "desc": "Back to the open plains",              "color": Color(0.13, 0.55, 0.35), "icon": "🌿" },
	{ "label": "Armory",      "x": 580,  "y": 360, "scene": null,                                "desc": "Buy and sell weapons & armor",                "color": Color(0.27, 0.27, 0.33), "icon": "🛡" },
	{ "label": "Forge",       "x": 740,  "y": 410, "scene": null,                                "desc": "Upgrade your equipment (+1 to +5)",           "color": Color(0.53, 0.33, 0.0),  "icon": "🔨" },
	{ "label": "Quest Board", "x": 1100, "y": 390, "scene": null,                                "desc": "Story quests from local NPCs",               "color": Color(0.13, 0.55, 0.13), "icon": "📜" },
	{ "label": "Guild Hall",  "x": 180,  "y": 370, "scene": null,                                "desc": "Join a guild — wars, territory, power",      "color": Color(0.25, 0.41, 0.88), "icon": "🏰" },
]

@onready var tooltip_label := $HUD/TooltipLabel
@onready var gold_label    := $HUD/GoldLabel
@onready var name_label    := $HUD/NameLabel


func _ready() -> void:
	WsManager.join_room("town")
	_update_hud()
	GameState.snapshot_updated.connect(_update_hud)

	# Launch persistent UI overlay (chat + global HUD)
	if not get_tree().root.has_node("UIScene"):
		get_tree().root.add_child(load("res://scenes/ui/UI.tscn").instantiate())

	tooltip_label.hide()
	queue_redraw()
	_build_building_buttons()


func _build_building_buttons() -> void:
	var hud: CanvasLayer = $HUD
	for b in BUILDINGS:
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(110, 70)
		btn.position = Vector2(b["x"] - 55, b["y"] - 35)
		btn.tooltip_text = b["desc"]
		btn.text = b["icon"] + "  " + b["label"]
		if b["scene"] != null:
			btn.pressed.connect(_go_to.bind(b["scene"]))
		else:
			btn.modulate = Color(0.5, 0.5, 0.5, 0.8)
			btn.pressed.connect(_show_locked_tooltip.bind(b["desc"]))
		hud.add_child(btn)


func _go_to(scene_path: String) -> void:
	WsManager.leave_room("town")
	get_tree().change_scene_to_file(scene_path)


func _show_locked_tooltip(desc: String) -> void:
	tooltip_label.text = "🔒 Coming soon: " + desc
	tooltip_label.show()
	get_tree().create_timer(2.5).timeout.connect(func(): tooltip_label.hide())


func _update_hud() -> void:
	gold_label.text = "⚜ %d gold" % GameState.gold
	name_label.text = "%s  Lv.%d" % [GameState.char_name, GameState.level]


func _draw() -> void:
	var w := 1280.0
	var h := 720.0

	# Sky
	draw_rect(Rect2(0, 0, w, h * 0.56), Color(0.039, 0.122, 0.29))
	draw_rect(Rect2(0, h * 0.52, w, h * 0.16), Color(0.098, 0.165, 0.353))

	# Ground
	draw_rect(Rect2(0, h * 0.58, w, h * 0.42), Color(0.165, 0.098, 0.031))
	draw_rect(Rect2(0, h * 0.575, w, 14), Color(0.239, 0.165, 0.063))

	# Moon
	draw_circle(Vector2(160, 80), 36, Color(1.0, 0.973, 0.863, 0.9))
	draw_circle(Vector2(174, 72), 30, Color(0.039, 0.122, 0.29, 0.85))

	# Town sign background
	draw_rect(Rect2(w / 2.0 - 120, 34, 240, 50), Color(0.36, 0.18, 0.039))


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		WsManager.leave_room("town")
