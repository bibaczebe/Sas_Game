extends Node

# Wraps Godot's WebSocketPeer.
# The Node.js server must expose a plain WebSocket endpoint (not Socket.io)
# at ws://localhost:3001/ws — we add that in the server alongside Socket.io.
#
# Usage:
#   WsManager.connect_ws()          — call once after login
#   WsManager.emit("chat:join", {"room":"town"})
#   WsManager.message_received.connect(my_handler)

const WS_URL := "ws://localhost:3001/ws"
const RECONNECT_DELAY := 3.0

var _peer := WebSocketPeer.new()
var _connected := false
var _reconnect_timer := 0.0
var _want_connect := false
var _current_rooms: Array[String] = []

signal message_received(event: String, data: Dictionary)
signal connected_to_server
signal disconnected_from_server


func _ready() -> void:
	set_process(true)


func connect_ws() -> void:
	_want_connect = true
	_do_connect()


func disconnect_ws() -> void:
	_want_connect = false
	_connected = false
	_peer.close()
	_current_rooms.clear()
	disconnected_from_server.emit()


func emit(event: String, data: Dictionary = {}) -> void:
	if not _connected:
		return
	var payload := JSON.stringify({"event": event, "data": data})
	_peer.send_text(payload)


func join_room(room: String) -> void:
	if room not in _current_rooms:
		_current_rooms.append(room)
	emit("chat:join", {"room": room})


func leave_room(room: String) -> void:
	_current_rooms.erase(room)
	emit("chat:leave", {"room": room})


# ── Internal ─────────────────────────────────────────────────────────────────

func _do_connect() -> void:
	var token := AuthManager.get_access_token()
	var url := WS_URL + "?token=" + token
	_peer = WebSocketPeer.new()
	var err := _peer.connect_to_url(url)
	if err != OK:
		push_warning("WsManager: connect_to_url failed (%d)" % err)


func _process(delta: float) -> void:
	if not _want_connect:
		return

	_peer.poll()
	var state := _peer.get_ready_state()

	match state:
		WebSocketPeer.STATE_OPEN:
			if not _connected:
				_connected = true
				_reconnect_timer = 0.0
				connected_to_server.emit()
				# Re-join rooms after reconnect
				for room in _current_rooms:
					emit("chat:join", {"room": room})
			# Drain all incoming packets
			while _peer.get_available_packet_count() > 0:
				var raw := _peer.get_packet().get_string_from_utf8()
				var parsed = JSON.parse_string(raw)
				if parsed is Dictionary and parsed.has("event"):
					message_received.emit(parsed["event"], parsed.get("data", {}))

		WebSocketPeer.STATE_CLOSING:
			pass  # Wait for CLOSED

		WebSocketPeer.STATE_CLOSED:
			if _connected:
				_connected = false
				disconnected_from_server.emit()
			# Auto-reconnect
			_reconnect_timer += delta
			if _reconnect_timer >= RECONNECT_DELAY:
				_reconnect_timer = 0.0
				_do_connect()
