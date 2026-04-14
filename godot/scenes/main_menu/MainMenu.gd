extends Control

# MainMenu — ekran główny trybu offline.
# Przyciski: NEW GAME / CONTINUE / OPTIONS / CREDITS / EXIT

@onready var _continue_btn: Button = $Root/ContinueBtn
@onready var _version_label: Label = $Root/VersionLabel


func _ready() -> void:
	# Pokaż CONTINUE tylko jeśli istnieje lokalny zapis
	_continue_btn.visible = GameState.has_save()

	$Root/NewGameBtn.pressed.connect(_on_new_game)
	_continue_btn.pressed.connect(_on_continue)
	$Root/OptionsBtn.pressed.connect(_on_options)
	$Root/CreditsBtn.pressed.connect(_on_credits)
	$Root/ExitBtn.pressed.connect(_on_exit)

	_version_label.text = "v0.1 BETA"


func _on_new_game() -> void:
	# Jeśli już jest zapis — zapytaj (prosta wersja: po prostu go nadpisz)
	get_tree().change_scene_to_file("res://scenes/character_create/CharacterCreate.tscn")


func _on_continue() -> void:
	if GameState.load_local():
		get_tree().change_scene_to_file("res://scenes/plains_biome/PlainsBiome.tscn")
	else:
		# Zapis uszkodzony — wróć do nowej gry
		_continue_btn.visible = false


func _on_options() -> void:
	# TODO: Panel opcji (muzyka, efekty, rozdzielczość)
	pass


func _on_credits() -> void:
	# TODO: Ekran kredytów
	pass


func _on_exit() -> void:
	get_tree().quit()
