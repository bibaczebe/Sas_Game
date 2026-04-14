extends Control

# Expedition timer system.
# Up to 3 expedition slots. Each slot shows:
#   - expedition name + description
#   - timer counting down to ready
#   - "Send" / "Collect" button

const REFRESH_INTERVAL := 5.0  # seconds between server polls

var _timer := 0.0
var _slots: Array = []   # Array of slot data Dictionaries from server

@onready var slots_container := $Root/SlotsCol
@onready var back_btn        := $Root/BackBtn
@onready var title_lbl       := $Root/TitleLabel


func _ready() -> void:
	back_btn.pressed.connect(func():
		get_tree().change_scene_to_file("res://scenes/town/Town.tscn")
	)
	_fetch_expeditions()


func _process(delta: float) -> void:
	_timer += delta
	if _timer >= REFRESH_INTERVAL:
		_timer = 0.0
		_fetch_expeditions()
	# Tick local timers for smooth countdown
	_tick_countdowns(delta)


func _fetch_expeditions() -> void:
	var result: Dictionary = await ApiManager.get_expeditions()
	if result.has("slots"):
		_slots = result["slots"]
		_rebuild_ui()


func _rebuild_ui() -> void:
	for child in slots_container.get_children():
		child.queue_free()
	await get_tree().process_frame

	for i in range(_slots.size()):
		var slot: Dictionary = _slots[i]
		var panel := _make_slot_panel(i, slot)
		slots_container.add_child(panel)

	# Fill empty slots up to 3
	for i in range(_slots.size(), 3):
		var empty := await _make_empty_slot(i)
		slots_container.add_child(empty)


func _make_slot_panel(slot_index: int, slot: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(560, 120)

	var vbox := VBoxContainer.new()
	panel.add_child(vbox)

	var name_lbl := Label.new()
	name_lbl.text = slot.get("expeditionName", "Unknown Expedition")
	name_lbl.add_theme_font_size_override("font_size", 16)
	name_lbl.add_theme_color_override("font_color", Color(1, 0.843, 0))
	vbox.add_child(name_lbl)

	var desc_lbl := Label.new()
	desc_lbl.text = slot.get("description", "")
	desc_lbl.add_theme_font_size_override("font_size", 12)
	desc_lbl.add_theme_color_override("font_color", Color(0.75, 0.7, 0.6))
	vbox.add_child(desc_lbl)

	var hbox := HBoxContainer.new()
	vbox.add_child(hbox)

	var timer_lbl := Label.new()
	timer_lbl.name = "TimerLbl_%d" % slot_index
	timer_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	timer_lbl.add_theme_font_size_override("font_size", 14)

	var ready_at: float = float(slot.get("readyAt", 0)) / 1000.0
	var now: float = Time.get_unix_time_from_system()
	var remaining: float = ready_at - now

	if remaining <= 0:
		timer_lbl.text = "✅ Ready!"
		timer_lbl.add_theme_color_override("font_color", Color(0.2, 0.9, 0.2))
	else:
		timer_lbl.text = _format_time(remaining)
		timer_lbl.add_theme_color_override("font_color", Color(0.85, 0.75, 0.4))
	hbox.add_child(timer_lbl)

	var action_btn := Button.new()
	action_btn.custom_minimum_size = Vector2(120, 32)
	if remaining <= 0:
		action_btn.text = "Collect 🎁"
		action_btn.pressed.connect(_collect.bind(slot_index))
	else:
		action_btn.text = "Running..."
		action_btn.disabled = true
	hbox.add_child(action_btn)

	# Rewards preview
	var reward_lbl := Label.new()
	var xp: int   = slot.get("rewardXP", 0)
	var gold: int = slot.get("rewardGold", 0)
	reward_lbl.text = "Reward: %d XP  %d Gold" % [xp, gold]
	reward_lbl.add_theme_font_size_override("font_size", 12)
	reward_lbl.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	vbox.add_child(reward_lbl)

	return panel


func _make_empty_slot(slot_index: int) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(560, 120)

	var vbox := VBoxContainer.new()
	panel.add_child(vbox)

	var lbl := Label.new()
	lbl.text = "— Empty slot —"
	lbl.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(lbl)

	# Available expeditions to choose
	var result: Dictionary = await ApiManager.api_get("/expedition/available")
	if result.has("expeditions"):
		for exp in result["expeditions"]:
			var btn := Button.new()
			btn.text = "Send: %s  (%s)" % [exp.get("name","?"), _format_duration(exp.get("durationMinutes", 0))]
			btn.custom_minimum_size = Vector2(520, 34)
			btn.pressed.connect(_send.bind(exp["_id"], slot_index))
			vbox.add_child(btn)

	return panel


func _send(expedition_id: String, _slot_index: int) -> void:
	var result: Dictionary = await ApiManager.start_expedition(expedition_id)
	if result.has("slot"):
		_fetch_expeditions()
	else:
		push_warning("Tavern: start_expedition failed: " + str(result))


func _collect(slot_index: int) -> void:
	var result: Dictionary = await ApiManager.collect_expedition(slot_index)
	if result.has("rewards"):
		var r: Dictionary = result["rewards"]
		GameState.add_gold(r.get("gold", 0))
		_show_toast("🎁 Collected! +%d XP  +%d Gold" % [r.get("xp", 0), r.get("gold", 0)])
		_fetch_expeditions()
	else:
		push_warning("Tavern: collect failed: " + str(result))


func _tick_countdowns(delta: float) -> void:
	for i in range(_slots.size()):
		var lbl_name := "TimerLbl_%d" % i
		# The label lives inside dynamic children — search by name
		var lbl := _find_node_by_name(slots_container, lbl_name)
		if lbl == null:
			continue
		var slot: Dictionary = _slots[i]
		var ready_at: float = float(slot.get("readyAt", 0)) / 1000.0
		var remaining: float = ready_at - Time.get_unix_time_from_system()
		if remaining > 0:
			lbl.text = _format_time(remaining)


func _find_node_by_name(parent: Node, node_name: String) -> Node:
	for child in parent.get_children():
		if child.name == node_name:
			return child
		var found := _find_node_by_name(child, node_name)
		if found:
			return found
	return null


func _show_toast(msg: String) -> void:
	var lbl := Label.new()
	lbl.text = msg
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.add_theme_color_override("font_color", Color(0.2, 1.0, 0.4))
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	$Root.add_child(lbl)
	get_tree().create_timer(3.0).timeout.connect(func(): lbl.queue_free())


static func _format_time(seconds: float) -> String:
	var s := int(seconds)
	var h := s / 3600
	var m := (s % 3600) / 60
	var sec := s % 60
	if h > 0:
		return "%dh %02dm" % [h, m]
	return "%dm %02ds" % [m, sec]


static func _format_duration(minutes: int) -> String:
	if minutes < 60:
		return "%d min" % minutes
	return "%dh %dm" % [minutes / 60, minutes % 60]
