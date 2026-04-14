extends Node2D

# ── Action system (mirrors shared/constants.js) ───────────────────────────────
const ACTIONS := {
	"march":         { "label": "March",        "energy": 0, "key": "march" },
	"quick_attack":  { "label": "Quick Atk",    "energy": 1, "key": "quick_attack" },
	"normal_attack": { "label": "Attack",        "energy": 2, "key": "normal_attack" },
	"power_attack":  { "label": "Power Atk",     "energy": 4, "key": "power_attack" },
	"charge":        { "label": "Charge",        "energy": 3, "key": "charge" },
	"taunt":         { "label": "Taunt",         "energy": 2, "key": "taunt" },
	"defend":        { "label": "Defend",        "energy": 0, "key": "defend" },
	"special":       { "label": "Special",       "energy": 5, "key": "special" },
}

# Action → animation mapping
const ACTION_ANIM := {
	"march":         "fight_idle",
	"quick_attack":  "lead_jab",
	"normal_attack": "cross_punch",
	"power_attack":  "uppercut",
	"charge":        "cross_punch",
	"taunt":         "fight_idle",
	"defend":        "fight_idle",
	"special":       "uppercut",
}

const ENEMY_LIST := [
	{ "name": "Goblin Scout",    "id": "goblin_scout",    "color": Color(0.3, 0.55, 0.2) },
	{ "name": "Orc Brute",       "id": "orc_brute",       "color": Color(0.45, 0.3, 0.1) },
	{ "name": "Skeleton Warrior","id": "skeleton_warrior","color": Color(0.8, 0.8, 0.75) },
	{ "name": "Arena Champion",  "id": "arena_champion",  "color": Color(0.8, 0.2, 0.1) },
]

# ── State ─────────────────────────────────────────────────────────────────────
var _session_id    := ""
var _player_pos    := 1
var _enemy_pos     := 10
var _player_hp     := 0
var _player_max_hp := 0
var _player_energy := 0
var _player_max_en := 0
var _enemy_hp      := 100
var _enemy_max_hp  := 100
var _my_turn       := true
var _combat_over   := false
var _selected_enemy: Dictionary
var _prev_enemy_hp := 100
var _prev_player_hp := 0

# Sprite references (set in _ready)
var _player_anim: AnimatedSprite2D
var _enemy_anim: AnimatedSprite2D

@onready var log_box        := $UI/LogScroll/LogBox
@onready var player_hp_bar  := $UI/PlayerPanel/HPBar
@onready var player_en_bar  := $UI/PlayerPanel/EnergyBar
@onready var enemy_hp_bar   := $UI/EnemyPanel/HPBar
@onready var pos_row        := $UI/PosRow
@onready var action_grid    := $UI/ActionGrid
@onready var turn_label     := $UI/TurnLabel
@onready var enemy_select   := $UI/EnemySelect


func _ready() -> void:
	_player_hp      = GameState.current_hp
	_player_max_hp  = GameState.max_hp
	_player_energy  = GameState.current_energy
	_player_max_en  = GameState.max_energy
	_prev_player_hp = _player_hp

	_setup_sprites()
	_build_enemy_select()
	_build_action_buttons()
	_build_position_bar()
	_refresh_bars()
	_add_log("⚔ Choose an enemy to fight!")

	WsManager.message_received.connect(_on_ws_message)


# ── Sprite setup ──────────────────────────────────────────────────────────────
func _setup_sprites() -> void:
	# Player sprite — left side, facing east
	var p_node := $PlayerSprite
	var p_pos: Vector2 = p_node.position
	p_node.queue_free()

	_player_anim = SpriteBuilder.build_arena(GameState.char_class)
	_player_anim.position = p_pos
	_player_anim.scale = Vector2(2.2, 2.2)
	_player_anim.animation_finished.connect(_on_player_anim_done)
	add_child(_player_anim)

	# Enemy sprite — right side, facing west (flipped)
	var e_node := $EnemySprite
	var e_pos: Vector2 = e_node.position
	e_node.queue_free()

	_enemy_anim = SpriteBuilder.build_arena_enemy()
	_enemy_anim.position = e_pos
	_enemy_anim.scale = Vector2(2.2, 2.2)
	_enemy_anim.animation_finished.connect(_on_enemy_anim_done)
	add_child(_enemy_anim)


func _on_player_anim_done() -> void:
	# Return to idle after any one-shot animation
	if _player_anim.sprite_frames.has_animation("fight_idle"):
		_player_anim.play("fight_idle")


func _on_enemy_anim_done() -> void:
	if not _combat_over and _enemy_anim.sprite_frames.has_animation("fight_idle"):
		_enemy_anim.play("fight_idle")


# ── Enemy selection ───────────────────────────────────────────────────────────
func _build_enemy_select() -> void:
	for enemy in ENEMY_LIST:
		var btn := Button.new()
		btn.text = enemy["name"]
		btn.custom_minimum_size = Vector2(160, 36)
		btn.pressed.connect(_start_combat.bind(enemy))
		enemy_select.add_child(btn)


func _start_combat(enemy: Dictionary) -> void:
	_selected_enemy = enemy
	enemy_select.hide()
	_prev_enemy_hp = 100
	_add_log("Starting combat against %s..." % enemy["name"])
	$UI/EnemyPanel/EnemyName.text = enemy["name"]

	var result: Dictionary = await ApiManager.start_combat(enemy["id"])
	if result.has("sessionId"):
		_session_id    = result["sessionId"]
		_enemy_hp      = result.get("enemyHP", 100)
		_enemy_max_hp  = result.get("enemyMaxHP", _enemy_hp)
		_prev_enemy_hp = _enemy_hp
		_my_turn       = result.get("yourTurn", true)
		_player_hp     = result.get("playerHP", _player_hp)
		_player_max_hp = result.get("playerMaxHP", _player_max_hp)
		_player_energy = result.get("playerEnergy", _player_energy)
		_player_max_en = result.get("playerMaxEnergy", _player_max_en)
		_refresh_bars()
		_update_turn_label()
		_add_log("⚔ Combat started! " + ("Your turn." if _my_turn else "Enemy's turn."))
		_set_actions_enabled(_my_turn)
	else:
		_add_log("❌ " + result.get("message", "Failed to start combat."))
		enemy_select.show()


# ── Action buttons ────────────────────────────────────────────────────────────
func _build_action_buttons() -> void:
	for action_key in ACTIONS:
		var data: Dictionary = ACTIONS[action_key]
		var btn := Button.new()
		btn.text = "%s\n[%d EN]" % [data["label"], data["energy"]]
		btn.custom_minimum_size = Vector2(110, 52)
		btn.name = "Btn_" + action_key
		btn.pressed.connect(_submit_action.bind(action_key))
		action_grid.add_child(btn)


func _build_position_bar() -> void:
	for i in range(1, 11):
		var lbl := Label.new()
		lbl.text = str(i)
		lbl.custom_minimum_size = Vector2(50, 30)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.name = "Pos" + str(i)
		pos_row.add_child(lbl)
	_update_position_bar()


func _update_position_bar() -> void:
	for i in range(1, 11):
		var lbl: Label = pos_row.get_node("Pos" + str(i))
		if i == _player_pos:
			lbl.modulate = Color(0.2, 0.8, 0.2)
			lbl.text = "P"
		elif i == _enemy_pos:
			lbl.modulate = Color(0.9, 0.2, 0.2)
			lbl.text = "E"
		else:
			lbl.modulate = Color(0.6, 0.6, 0.6)
			lbl.text = str(i)


func _submit_action(action_key: String) -> void:
	if not _my_turn or _combat_over or _session_id == "":
		return
	var cost: int = ACTIONS[action_key]["energy"]
	if _player_energy < cost:
		_add_log("⚡ Not enough energy for %s (need %d)." % [ACTIONS[action_key]["label"], cost])
		return

	_set_actions_enabled(false)

	# Play player attack animation immediately (feels responsive)
	var p_anim: String = ACTION_ANIM.get(action_key, "fight_idle")
	if _player_anim.sprite_frames.has_animation(p_anim):
		_player_anim.play(p_anim)

	var result: Dictionary = await ApiManager.submit_action(_session_id, action_key)
	if result.has("error"):
		_add_log("❌ " + result.get("error", "Server error"))
		_set_actions_enabled(true)
		return
	_apply_round_result(result)


func _on_ws_message(event: String, data: Dictionary) -> void:
	if event == "combat:round_result" and data.get("sessionId", "") == _session_id:
		_apply_round_result(data)


func _apply_round_result(r: Dictionary) -> void:
	var new_player_hp: int = r.get("playerHP",     _player_hp)
	var new_enemy_hp:  int = r.get("enemyHP",      _enemy_hp)

	# Animate hit reactions
	if new_enemy_hp < _enemy_hp:
		# Enemy took damage
		if _enemy_anim.sprite_frames.has_animation("take_hit"):
			_enemy_anim.play("take_hit")

	if new_player_hp < _player_hp:
		# Player took damage
		if _player_anim.sprite_frames.has_animation("take_hit"):
			_player_anim.play("take_hit")

	_player_hp     = new_player_hp
	_player_energy = r.get("playerEnergy", _player_energy)
	_player_pos    = r.get("playerPos",    _player_pos)
	_enemy_hp      = new_enemy_hp
	_enemy_pos     = r.get("enemyPos",     _enemy_pos)
	_my_turn       = r.get("yourTurn",     true)

	_refresh_bars()
	_update_position_bar()
	_update_turn_label()

	for msg in r.get("log", []):
		_add_log(msg)

	var status: String = r.get("status", "")
	if status == "player_won":
		_combat_over = true
		_add_log("🏆 Victory! XP: %d  Gold: %d" % [r.get("xpGained", 0), r.get("goldGained", 0)])
		GameState.add_gold(r.get("goldGained", 0))
		# Enemy death animation
		if _enemy_anim.sprite_frames.has_animation("death"):
			_enemy_anim.play("death")
		_show_exit_btn("Back to Town")
	elif status == "player_lost":
		_combat_over = true
		_add_log("💀 Defeated...")
		# Player death animation
		if _player_anim.sprite_frames.has_animation("death"):
			_player_anim.play("death")
		_show_exit_btn("Retreat")
	elif _my_turn:
		_set_actions_enabled(true)
		# Return player to fight idle if not already animating
		if not _player_anim.is_playing() or _player_anim.animation == "fight_idle":
			if _player_anim.sprite_frames.has_animation("fight_idle"):
				_player_anim.play("fight_idle")


func _refresh_bars() -> void:
	player_hp_bar.value  = float(_player_hp) / float(_player_max_hp) * 100.0 if _player_max_hp > 0 else 0
	player_en_bar.value  = float(_player_energy) / float(_player_max_en) * 100.0 if _player_max_en > 0 else 0
	enemy_hp_bar.value   = float(_enemy_hp) / float(_enemy_max_hp) * 100.0 if _enemy_max_hp > 0 else 0

	$UI/PlayerPanel/HPLabel.text     = "HP %d/%d" % [_player_hp, _player_max_hp]
	$UI/PlayerPanel/EnergyLabel.text = "EN %d/%d" % [_player_energy, _player_max_en]
	$UI/EnemyPanel/HPLabel.text      = "HP %d/%d" % [_enemy_hp, _enemy_max_hp]


func _update_turn_label() -> void:
	if _combat_over:
		turn_label.text = ""
		return
	turn_label.text = "YOUR TURN" if _my_turn else "ENEMY TURN"
	turn_label.modulate = Color(0.2, 0.9, 0.2) if _my_turn else Color(0.9, 0.3, 0.3)


func _set_actions_enabled(enabled: bool) -> void:
	for child in action_grid.get_children():
		if child is Button:
			child.disabled = not enabled
			if enabled:
				var key := child.name.replace("Btn_", "")
				var cost: int = ACTIONS.get(key, {}).get("energy", 0)
				child.disabled = _player_energy < cost


func _add_log(text: String) -> void:
	var lbl := Label.new()
	lbl.text = text
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl.add_theme_font_size_override("font_size", 13)
	lbl.add_theme_color_override("font_color", Color(0.9, 0.85, 0.7))
	log_box.add_child(lbl)
	await get_tree().process_frame
	$UI/LogScroll.scroll_vertical = 999999


func _show_exit_btn(label: String) -> void:
	var btn := Button.new()
	btn.text = label
	btn.custom_minimum_size = Vector2(200, 44)
	btn.pressed.connect(func():
		WsManager.leave_room("combat:" + _session_id)
		get_tree().change_scene_to_file("res://scenes/town/Town.tscn")
	)
	$UI.add_child(btn)
