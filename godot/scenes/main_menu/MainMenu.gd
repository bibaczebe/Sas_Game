extends Control

# ── Animation constants ───────────────────────────────────────────────────────
const HOVER_SCALE    := Vector2(1.07, 1.07)
const NORMAL_SCALE   := Vector2(1.0,  1.0)
const PRESS_SCALE    := Vector2(0.94, 0.94)
# Warm golden tint on hover (matches fantasy RPG aesthetic)
const HOVER_MOD      := Color(1.30, 1.22, 0.80, 1.0)
const NORMAL_MOD     := Color.WHITE

# ── Node refs ─────────────────────────────────────────────────────────────────
@onready var _btn_new_game: TextureButton = $Center/ButtonContainer/NewGameBtn
@onready var _btn_continue: TextureButton = $Center/ButtonContainer/ContinueBtn
@onready var _btn_options:  TextureButton = $Center/ButtonContainer/OptionsBtn
@onready var _btn_credits:  TextureButton = $Center/ButtonContainer/CreditsBtn
@onready var _btn_exit:     TextureButton = $Center/ButtonContainer/ExitBtn

var _tweens: Dictionary = {}


func _ready() -> void:
	_btn_continue.visible = GameState.has_save()

	_btn_new_game.pressed.connect(_on_new_game)
	_btn_continue.pressed.connect(_on_continue)
	_btn_options.pressed.connect(_on_options)
	_btn_credits.pressed.connect(_on_credits)
	_btn_exit.pressed.connect(_on_exit)

	var all_btns := [_btn_new_game, _btn_continue, _btn_options, _btn_credits, _btn_exit]
	for btn: TextureButton in all_btns:
		btn.mouse_entered.connect(_hover_on.bind(btn))
		btn.mouse_exited.connect(_hover_off.bind(btn))

	_play_intro()


# ── Intro pop-in ──────────────────────────────────────────────────────────────
func _play_intro() -> void:
	var all_btns := [_btn_new_game, _btn_continue, _btn_options, _btn_credits, _btn_exit]
	var delay := 0.0
	for btn: TextureButton in all_btns:
		btn.scale    = Vector2(0.80, 0.80)
		btn.modulate = Color(1.0, 1.0, 1.0, 0.0)
		# set_delay() is on PropertyTweener, not on Tween — set per-tweener
		var tw := create_tween().set_parallel(true)
		tw.tween_property(btn, "scale",      NORMAL_SCALE, 0.42) \
			.set_delay(delay).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
		tw.tween_property(btn, "modulate:a", 1.0,          0.30) \
			.set_delay(delay).set_ease(Tween.EASE_OUT)
		delay += 0.10


# ── Hover effects ─────────────────────────────────────────────────────────────
func _hover_on(btn: TextureButton) -> void:
	_kill_tween(btn)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(btn, "scale",    HOVER_SCALE, 0.14) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(btn, "modulate", HOVER_MOD,   0.14)
	_tweens[btn] = tw


func _hover_off(btn: TextureButton) -> void:
	_kill_tween(btn)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(btn, "scale",    NORMAL_SCALE, 0.20) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(btn, "modulate", NORMAL_MOD,   0.20)
	_tweens[btn] = tw


func _kill_tween(btn: TextureButton) -> void:
	if _tweens.has(btn) and _tweens[btn] is Tween:
		(_tweens[btn] as Tween).kill()


# ── Press flash then navigate ─────────────────────────────────────────────────
func _flash_then(btn: TextureButton, action: Callable) -> void:
	_kill_tween(btn)
	var tw := create_tween()
	tw.tween_property(btn, "scale", PRESS_SCALE,         0.07)
	tw.tween_property(btn, "scale", Vector2(1.10, 1.10), 0.14) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tw.tween_callback(action)


# ── Button actions ────────────────────────────────────────────────────────────
func _on_new_game() -> void:
	_flash_then(_btn_new_game, func():
		get_tree().change_scene_to_file("res://scenes/character_create/CharacterCreate.tscn"))


func _on_continue() -> void:
	if GameState.load_local():
		_flash_then(_btn_continue, func():
			get_tree().change_scene_to_file("res://scenes/plains_biome/PlainsBiome.tscn"))
	else:
		_btn_continue.visible = false


func _on_options() -> void:
	pass  # TODO: panel opcji


func _on_credits() -> void:
	pass  # TODO: ekran kredytów


func _on_exit() -> void:
	_flash_then(_btn_exit, func(): get_tree().quit())
