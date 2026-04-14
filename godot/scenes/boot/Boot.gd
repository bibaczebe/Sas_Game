extends Node

# Boot — tryb offline. Sprawdza lokalny zapis i kieruje do MainMenu.

func _ready() -> void:
	await get_tree().create_timer(0.05).timeout
	get_tree().change_scene_to_file("res://scenes/main_menu/MainMenu.tscn")
