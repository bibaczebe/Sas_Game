extends Node

# Token storage — held in memory only (never written to disk)
var _access_token: String = ""
var _refresh_token: String = ""

signal logged_in
signal logged_out


func set_tokens(access: String, refresh: String) -> void:
	_access_token = access
	_refresh_token = refresh


func get_access_token() -> String:
	return _access_token


func get_refresh_token() -> String:
	return _refresh_token


func is_logged_in() -> bool:
	return _access_token != ""


func clear() -> void:
	_access_token = ""
	_refresh_token = ""
	logged_out.emit()
