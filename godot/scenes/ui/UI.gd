extends CanvasLayer

# Persistent UI overlay — chat panel + global HUD strip.
# Launched once after login, never removed until logout.
# Scenes can toggle chat visibility via UI.show_chat() / UI.hide_chat().

const MAX_MESSAGES := 80
const RATE_LIMIT_MS := 1666  # ~3 messages per 5 s (in milliseconds)

var _current_room := "global"
var _last_send_time := 0

@onready var chat_panel    := $ChatPanel
@onready var messages_box  := $ChatPanel/PanelVBox/Scroll/Messages
@onready var scroll        := $ChatPanel/PanelVBox/Scroll
@onready var input_field   := $ChatPanel/PanelVBox/InputRow/InputField
@onready var send_btn      := $ChatPanel/PanelVBox/InputRow/SendBtn
@onready var room_tabs     := $ChatPanel/PanelVBox/RoomTabs
@onready var toggle_btn    := $ToggleBtn
@onready var hud_strip     := $HUDStrip
@onready var hp_bar        := $HUDStrip/HPBar
@onready var xp_bar        := $HUDStrip/XPBar
@onready var gold_lbl      := $HUDStrip/GoldLabel
@onready var level_lbl     := $HUDStrip/LevelLabel


func _ready() -> void:
	layer = 100  # Always on top

	toggle_btn.pressed.connect(_toggle_chat)
	send_btn.pressed.connect(_send_message)
	input_field.text_submitted.connect(func(_t): _send_message())

	WsManager.message_received.connect(_on_ws_message)
	GameState.snapshot_updated.connect(_refresh_hud)

	# Room tab buttons
	for tab_btn in room_tabs.get_children():
		if tab_btn is Button:
			tab_btn.pressed.connect(_switch_room.bind(tab_btn.name.to_lower()))

	_refresh_hud()
	_join_room("town")

	# Load last 50 messages
	_fetch_history("town")


func _refresh_hud() -> void:
	gold_lbl.text = "⚜ %d" % GameState.gold
	level_lbl.text = "Lv.%d" % GameState.level
	if GameState.max_hp > 0:
		hp_bar.value = float(GameState.current_hp) / float(GameState.max_hp) * 100.0
	if GameState.level > 0:
		var xp_need: int = GameState.xp_to_next_level()
		xp_bar.value = float(GameState.current_xp) / float(xp_need) * 100.0 if xp_need > 0 else 0


func show_chat() -> void:
	chat_panel.show()


func hide_chat() -> void:
	chat_panel.hide()


func join_room(room: String) -> void:
	_join_room(room)


# ── Rooms ─────────────────────────────────────────────────────────────────────
func _join_room(room: String) -> void:
	if _current_room == room:
		return
	WsManager.leave_room(_current_room)
	_current_room = room
	WsManager.join_room(room)
	_clear_messages()
	_fetch_history(room)


func _switch_room(room: String) -> void:
	_join_room(room)


# ── Messaging ─────────────────────────────────────────────────────────────────
func _send_message() -> void:
	var text: String = input_field.text.strip_edges()
	if text == "":
		return
	var now := Time.get_ticks_msec()
	if now - _last_send_time < RATE_LIMIT_MS:
		return
	if text.length() > 300:
		text = text.substr(0, 300)
	_last_send_time = now
	input_field.clear()
	WsManager.emit("chat:send", {"room": _current_room, "text": text})


func _on_ws_message(event: String, data: Dictionary) -> void:
	match event:
		"chat:message":
			if data.get("room", "") == _current_room:
				_append_message(data.get("username", "?"), data.get("text", ""), false)
		"chat:history":
			for msg in data.get("messages", []):
				_append_message(msg.get("username", "?"), msg.get("text", ""), true)
		"presence:join":
			_append_system("%s joined." % data.get("username", "?"))
		"presence:leave":
			_append_system("%s left." % data.get("username", "?"))


func _fetch_history(room: String) -> void:
	# Ask server for last 50 messages via REST
	var result: Dictionary = await ApiManager.api_get("/chat/history?room=" + room)
	if result.has("messages"):
		for msg in result["messages"]:
			_append_message(msg.get("username", "?"), msg.get("text", ""), true)


func _append_message(username: String, text: String, _historical: bool) -> void:
	var lbl := RichTextLabel.new()
	lbl.bbcode_enabled = true
	lbl.fit_content = true
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl.text = "[color=#FFD700]%s[/color]: %s" % [username, text]
	lbl.add_theme_font_size_override("normal_font_size", 13)
	messages_box.add_child(lbl)
	_trim_messages()
	_scroll_to_bottom()


func _append_system(text: String) -> void:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
	lbl.add_theme_font_size_override("font_size", 11)
	messages_box.add_child(lbl)
	_trim_messages()
	_scroll_to_bottom()


func _trim_messages() -> void:
	while messages_box.get_child_count() > MAX_MESSAGES:
		messages_box.get_child(0).queue_free()


func _clear_messages() -> void:
	for child in messages_box.get_children():
		child.queue_free()


func _scroll_to_bottom() -> void:
	await get_tree().process_frame
	scroll.scroll_vertical = 999999


func _toggle_chat() -> void:
	chat_panel.visible = not chat_panel.visible
	toggle_btn.text = "💬 Chat ▾" if chat_panel.visible else "💬 Chat ▸"
