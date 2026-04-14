extends Node

# AuthManager — STUB (tryb offline)
# Gra jest single-player. Zawsze "zalogowany" lokalnie.

signal logged_in
signal logged_out

func set_tokens(_access: String, _refresh: String) -> void: pass
func get_access_token()  -> String:  return "offline"
func get_refresh_token() -> String:  return "offline"
func is_logged_in()      -> bool:    return true
func clear()             -> void:    logged_out.emit()
