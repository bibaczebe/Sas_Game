extends Node

# Boot scene — runs once at startup.
# Reads the stored refresh token from disk (if any).
# If valid → fetch character → Town (or CharacterCreate if no character).
# If absent/expired → Login screen.

const SAVE_PATH := "user://session.cfg"


func _ready() -> void:
	# Short delay so the screen isn't pitch black
	await get_tree().create_timer(0.1).timeout
	_try_restore_session()


func _try_restore_session() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		_go_login()
		return

	var refresh_token: String = cfg.get_value("auth", "refresh_token", "")
	if refresh_token == "":
		_go_login()
		return

	# Attempt silent token refresh
	AuthManager.set_tokens("", refresh_token)
	var result: Dictionary = await ApiManager.refresh_token()

	if result.has("accessToken"):
		AuthManager.set_tokens(result["accessToken"], result.get("refreshToken", refresh_token))
		_save_refresh_token(result.get("refreshToken", refresh_token))
		_fetch_character()
	else:
		_clear_saved_session()
		_go_login()


func _fetch_character() -> void:
	var result: Dictionary = await ApiManager.get_character()
	var char_data: Dictionary = result.get("character", {})
	if not char_data.is_empty():
		GameState.load_snapshot(char_data)
		WsManager.connect_ws()
		get_tree().change_scene_to_file("res://scenes/plains_biome/PlainsBiome.tscn")
	elif result.has("hasCharacter") and result["hasCharacter"] == false:
		get_tree().change_scene_to_file("res://scenes/character_create/CharacterCreate.tscn")
	else:
		_go_login()


func _go_login() -> void:
	get_tree().change_scene_to_file("res://scenes/login/Login.tscn")


func _save_refresh_token(token: String) -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("auth", "refresh_token", token)
	cfg.save(SAVE_PATH)


func _clear_saved_session() -> void:
	var dir := DirAccess.open("user://")
	if dir:
		dir.remove("session.cfg")
