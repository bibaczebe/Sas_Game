extends Node

# WsManager — STUB (tryb offline)
# Gra jest single-player / offline. Wszystkie metody są no-ops.
# Sygnały zachowane żeby nie niszczyć kodu który je subskrybuje.

signal message_received(event: String, data: Dictionary)
signal connected_to_server
signal disconnected_from_server

func connect_ws()             -> void: pass
func disconnect_ws()          -> void: pass
func emit(_event: String, _data: Dictionary = {}) -> void: pass
func join_room(_room: String)  -> void: pass
func leave_room(_room: String) -> void: pass
