extends Node

# ApiManager — STUB (tryb offline)
# Gra jest single-player. Wszystkie wywołania API zwracają pusty słownik.

signal request_failed(endpoint: String, code: int)

func login(_u: String, _p: String)                          -> Dictionary: return {}
func register(_u: String, _e: String, _p: String)           -> Dictionary: return {}
func refresh_token()                                         -> Dictionary: return {}
func get_character()                                         -> Dictionary: return {}
func create_character(_n: String, _c: String, _r: String, _a: Dictionary = {}) -> Dictionary: return {}
func start_combat(_enemy_id: String)                        -> Dictionary: return {}
func submit_action(_session_id: String, _action: String)    -> Dictionary: return {}
func get_expeditions()                                       -> Dictionary: return {}
func start_expedition(_id: String)                          -> Dictionary: return {}
func collect_expedition(_slot: int)                         -> Dictionary: return {}
func get_leaderboard(_type: String = "level")               -> Dictionary: return {}
func api_get(_endpoint: String)                             -> Dictionary: return {}
func api_post(_endpoint: String, _body: Dictionary)         -> Dictionary: return {}
func http_get(_endpoint: String)                            -> Dictionary: return {}
func http_post(_endpoint: String, _body: Dictionary, _auth: bool = true) -> Dictionary: return {}
