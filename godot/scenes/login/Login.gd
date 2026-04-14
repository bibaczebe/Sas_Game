extends Control

const SAVE_PATH := "user://session.cfg"

@onready var tab_login    := $VBox/Tabs/Login
@onready var tab_register := $VBox/Tabs/Register

# Login tab
@onready var login_username := $VBox/LoginPanel/Username
@onready var login_password := $VBox/LoginPanel/Password
@onready var login_btn      := $VBox/LoginPanel/LoginBtn
@onready var login_error    := $VBox/LoginPanel/Error

# Register tab
@onready var reg_username := $VBox/RegisterPanel/Username
@onready var reg_email    := $VBox/RegisterPanel/Email
@onready var reg_password := $VBox/RegisterPanel/Password
@onready var reg_btn      := $VBox/RegisterPanel/RegisterBtn
@onready var reg_error    := $VBox/RegisterPanel/Error

@onready var spinner := $VBox/Spinner


func _ready() -> void:
	login_btn.pressed.connect(_on_login)
	reg_btn.pressed.connect(_on_register)
	tab_login.pressed.connect(_show_login_panel)
	tab_register.pressed.connect(_show_register_panel)
	_show_login_panel()
	spinner.hide()


func _show_login_panel() -> void:
	$VBox/LoginPanel.show()
	$VBox/RegisterPanel.hide()
	login_error.text = ""


func _show_register_panel() -> void:
	$VBox/LoginPanel.hide()
	$VBox/RegisterPanel.show()
	reg_error.text = ""


func _on_login() -> void:
	var username: String = login_username.text.strip_edges()
	var password: String = login_password.text
	if username == "" or password == "":
		login_error.text = "Fill in all fields."
		return
	login_error.text = ""
	login_btn.disabled = true
	spinner.show()

	var result: Dictionary = await ApiManager.login(username, password)
	spinner.hide()
	login_btn.disabled = false

	if result.has("accessToken"):
		AuthManager.set_tokens(result["accessToken"], result.get("refreshToken", ""))
		_save_refresh_token(result.get("refreshToken", ""))
		WsManager.connect_ws()
		_route_after_login()
	else:
		login_error.text = result.get("message", result.get("error", "Login failed."))


func _on_register() -> void:
	var username: String = reg_username.text.strip_edges()
	var email: String    = reg_email.text.strip_edges()
	var password: String = reg_password.text
	if username == "" or email == "" or password == "":
		reg_error.text = "Fill in all fields."
		return
	reg_error.text = ""
	reg_btn.disabled = true
	spinner.show()

	var result: Dictionary = await ApiManager.register(username, email, password)
	spinner.hide()
	reg_btn.disabled = false

	if result.has("accessToken"):
		AuthManager.set_tokens(result["accessToken"], result.get("refreshToken", ""))
		_save_refresh_token(result.get("refreshToken", ""))
		WsManager.connect_ws()
		_route_after_login()
	else:
		reg_error.text = result.get("message", result.get("error", "Registration failed."))


func _route_after_login() -> void:
	var char_result: Dictionary = await ApiManager.get_character()
	var char_data: Dictionary = char_result.get("character", {})
	if not char_data.is_empty():
		GameState.load_snapshot(char_data)
		get_tree().change_scene_to_file("res://scenes/town/Town.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/character_create/CharacterCreate.tscn")


func _save_refresh_token(token: String) -> void:
	if token == "":
		return
	var cfg := ConfigFile.new()
	cfg.set_value("auth", "refresh_token", token)
	cfg.save(SAVE_PATH)
