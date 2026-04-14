extends Node

const BASE_URL := "http://localhost:3001/api"

signal request_failed(endpoint: String, code: int)


# ── Public API ────────────────────────────────────────────────────────────────

func login(username: String, password: String) -> Dictionary:
	return await http_post("/auth/login", {"username": username, "password": password}, false)


func register(username: String, email: String, password: String) -> Dictionary:
	return await http_post("/auth/register",
		{"username": username, "email": email, "password": password}, false)


func refresh_token() -> Dictionary:
	return await http_post("/auth/refresh",
		{"refreshToken": AuthManager.get_refresh_token()}, false)


func get_character() -> Dictionary:
	return await http_get("/character")


func create_character(char_name: String, char_class: String, race: String,
		appearance: Dictionary = {}) -> Dictionary:
	return await http_post("/character",
		{"name": char_name, "class": char_class, "race": race, "appearance": appearance})


func start_combat(enemy_id: String) -> Dictionary:
	return await http_post("/combat/start", {"enemyId": enemy_id})


func submit_action(session_id: String, action: String) -> Dictionary:
	return await http_post("/combat/action", {"sessionId": session_id, "action": action})


func get_expeditions() -> Dictionary:
	return await http_get("/expedition")


func start_expedition(expedition_id: String) -> Dictionary:
	return await http_post("/expedition/start", {"expeditionId": expedition_id})


func collect_expedition(slot: int) -> Dictionary:
	return await http_post("/expedition/collect", {"slot": slot})


func get_leaderboard(type: String = "level") -> Dictionary:
	return await http_get("/leaderboard/" + type)


func api_get(endpoint: String) -> Dictionary:
	return await http_get(endpoint)


func api_post(endpoint: String, body: Dictionary) -> Dictionary:
	return await http_post(endpoint, body)


# ── Internal ──────────────────────────────────────────────────────────────────

func http_get(endpoint: String) -> Dictionary:
	return await _request(endpoint, HTTPClient.METHOD_GET, {})


func http_post(endpoint: String, body: Dictionary, auth: bool = true) -> Dictionary:
	return await _request(endpoint, HTTPClient.METHOD_POST, body, auth)


func _request(endpoint: String, method: int, body: Dictionary, auth: bool = true) -> Dictionary:
	# Create a fresh HTTPRequest node for every call — simplest reliable approach
	var http := HTTPRequest.new()
	http.timeout = 15.0
	add_child(http)

	var headers := PackedStringArray(["Content-Type: application/json"])
	if auth and AuthManager.is_logged_in():
		headers.append("Authorization: Bearer " + AuthManager.get_access_token())

	var body_str := ""
	if body.size() > 0:
		body_str = JSON.stringify(body)

	print("[API] %s %s  body=%s" % [
		"GET" if method == HTTPClient.METHOD_GET else "POST",
		BASE_URL + endpoint, body_str])

	var err: int = http.request(BASE_URL + endpoint, headers, method, body_str)
	if err != OK:
		http.queue_free()
		push_error("[API] http.request() failed with code %d" % err)
		return {"error": "HTTPRequest failed to start", "code": err}

	# Wait for response — signal args come back as an Array
	var resp = await http.request_completed
	http.queue_free()

	var response_code: int = resp[1]
	var body_bytes: PackedByteArray = resp[3]
	var json_text: String = body_bytes.get_string_from_utf8()

	print("[API] response %d: %s" % [response_code, json_text.left(200)])

	# Auto-refresh on 401 (only when auth was required)
	if response_code == 401 and auth:
		var refreshed: Dictionary = await refresh_token()
		if refreshed.has("accessToken"):
			AuthManager.set_tokens(
				refreshed["accessToken"],
				refreshed.get("refreshToken", AuthManager.get_refresh_token()))
			return await _request(endpoint, method, body, auth)
		else:
			AuthManager.clear()
			return {"error": "Session expired", "code": 401}

	if response_code < 200 or response_code >= 300:
		request_failed.emit(endpoint, response_code)

	var parsed = JSON.parse_string(json_text)
	if parsed == null:
		push_error("[API] Invalid JSON: " + json_text)
		return {"error": "Invalid JSON", "raw": json_text, "code": response_code}

	if parsed is Dictionary:
		return parsed
	return {"data": parsed, "code": response_code}
