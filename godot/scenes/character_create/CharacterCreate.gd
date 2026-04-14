extends Control

# ── Constants mirroring shared/constants.js ──────────────────────────────────
const CLASSES := {
	"warrior":  { "label": "Warrior",  "icon": "⚔",  "color": Color(0.8, 0.2, 0.2), "desc": "Melee powerhouse. High STR & VIT.",
	               "stats": {"strength":5,"agility":2,"attack":4,"defense":3,"vitality":4,"charisma":1,"endurance":3,"magic":0} },
	"archer":   { "label": "Archer",   "icon": "🏹", "color": Color(0.13, 0.55, 0.13), "desc": "Ranged precision. High AGI & ATK.",
	               "stats": {"strength":2,"agility":5,"attack":4,"defense":2,"vitality":2,"charisma":2,"endurance":3,"magic":2} },
	"mage":     { "label": "Mage",     "icon": "🔮", "color": Color(0.29, 0.0, 0.51), "desc": "Spellcaster. High MAG & INT.",
	               "stats": {"strength":1,"agility":2,"attack":2,"defense":2,"vitality":2,"charisma":3,"endurance":2,"magic":8} },
	"paladin":  { "label": "Paladin",  "icon": "🛡",  "color": Color(0.85, 0.65, 0.13), "desc": "Holy warrior. Balanced DEF & STR.",
	               "stats": {"strength":4,"agility":1,"attack":3,"defense":5,"vitality":4,"charisma":2,"endurance":3,"magic":2} },
	"assassin": { "label": "Assassin", "icon": "🗡",  "color": Color(0.25, 0.25, 0.35), "desc": "Shadow striker. High AGI & ATK.",
	               "stats": {"strength":3,"agility":5,"attack":5,"defense":1,"vitality":2,"charisma":1,"endurance":3,"magic":2} },
}

const RACES := {
	"human":   { "label": "Human",    "color": Color(0.8, 0.7, 0.5),  "bonus": "Bonus stat point at creation" },
	"elf":     { "label": "Elf",      "color": Color(0.4, 0.8, 0.4),  "bonus": "+2 AGI, +2 MAG" },
	"dwarf":   { "label": "Dwarf",    "color": Color(0.7, 0.45, 0.2), "bonus": "+2 STR, +2 END" },
	"orc":     { "label": "Orc",      "color": Color(0.3, 0.55, 0.2), "bonus": "+4 STR, -1 CHA" },
	"halfelf": { "label": "Half-Elf", "color": Color(0.5, 0.75, 0.55),"bonus": "+1 AGI, +1 MAG, bonus talent" },
	"tiefling":{ "label": "Tiefling", "color": Color(0.7, 0.2, 0.5),  "bonus": "+3 MAG, +1 CHA" },
}

const STAT_ORDER := ["strength","agility","attack","defense","vitality","charisma","endurance","magic"]
const STAT_LABELS := {"strength":"STR","agility":"AGI","attack":"ATK","defense":"DEF","vitality":"VIT","charisma":"CHA","endurance":"END","magic":"MAG"}

var _selected_class := "warrior"
var _selected_race  := "human"
var _class_buttons  := {}
var _race_buttons   := {}
var _stat_bars      := {}

@onready var name_input   := $Root/RightCol/NameRow/NameInput
@onready var confirm_btn  := $Root/RightCol/ConfirmBtn
@onready var error_label  := $Root/RightCol/ErrorLabel
@onready var stat_grid    := $Root/RightCol/StatGrid
@onready var class_row    := $Root/LeftCol/ClassRow
@onready var race_row     := $Root/LeftCol/RaceRow
@onready var class_desc   := $Root/LeftCol/ClassDesc
@onready var race_desc    := $Root/LeftCol/RaceDesc


func _ready() -> void:
	_build_class_buttons()
	_build_race_buttons()
	_build_stat_bars()
	_select_class("warrior")
	_select_race("human")
	confirm_btn.pressed.connect(_on_confirm)


# ── Class buttons ─────────────────────────────────────────────────────────────
func _build_class_buttons() -> void:
	for cls_key in CLASSES:
		var data: Dictionary = CLASSES[cls_key]
		var btn := Button.new()
		btn.text = data["icon"] + "\n" + data["label"]
		btn.custom_minimum_size = Vector2(110, 90)
		btn.pressed.connect(_select_class.bind(cls_key))
		class_row.add_child(btn)
		_class_buttons[cls_key] = btn


# ── Race buttons ──────────────────────────────────────────────────────────────
func _build_race_buttons() -> void:
	for race_key in RACES:
		var data: Dictionary = RACES[race_key]
		var btn := Button.new()
		btn.text = data["label"]
		btn.custom_minimum_size = Vector2(96, 34)
		btn.pressed.connect(_select_race.bind(race_key))
		race_row.add_child(btn)
		_race_buttons[race_key] = btn


# ── Stat bars ─────────────────────────────────────────────────────────────────
func _build_stat_bars() -> void:
	for stat in STAT_ORDER:
		var hbox := HBoxContainer.new()
		var lbl := Label.new()
		lbl.text = STAT_LABELS[stat]
		lbl.custom_minimum_size = Vector2(36, 0)
		lbl.add_theme_font_size_override("font_size", 13)
		var bar := ProgressBar.new()
		bar.min_value = 0
		bar.max_value = 12
		bar.custom_minimum_size = Vector2(200, 18)
		bar.show_percentage = false
		hbox.add_child(lbl)
		hbox.add_child(bar)
		stat_grid.add_child(hbox)
		_stat_bars[stat] = bar


func _select_class(cls_key: String) -> void:
	_selected_class = cls_key
	for k in _class_buttons:
		var btn: Button = _class_buttons[k]
		btn.modulate = Color.WHITE if k == cls_key else Color(0.6, 0.6, 0.6)
	class_desc.text = CLASSES[cls_key]["desc"]
	_refresh_stat_bars()


func _select_race(race_key: String) -> void:
	_selected_race = race_key
	for k in _race_buttons:
		var btn: Button = _race_buttons[k]
		btn.modulate = Color.WHITE if k == race_key else Color(0.6, 0.6, 0.6)
	race_desc.text = RACES[race_key]["bonus"]
	_refresh_stat_bars()


func _refresh_stat_bars() -> void:
	var base: Dictionary = CLASSES[_selected_class]["stats"]
	for stat in STAT_ORDER:
		_stat_bars[stat].value = base.get(stat, 0)


func _on_confirm() -> void:
	var char_name: String = name_input.text.strip_edges()
	if char_name.length() < 2 or char_name.length() > 20:
		error_label.text = "Name must be 2–20 characters."
		return
	error_label.text = ""
	confirm_btn.disabled = true

	# Tryb offline — zapis lokalny, bez serwera
	GameState.create_character(char_name, _selected_class, _selected_race)
	get_tree().change_scene_to_file("res://scenes/plains_biome/PlainsBiome.tscn")
