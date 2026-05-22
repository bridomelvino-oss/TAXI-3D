extends Control
## Tiny lobby: Solo / Host / Join.
## On success, loads scenes/main.tscn (which reads NetworkManager.mode).

@onready var _ip_input: LineEdit = $Center/Panel/Margin/V/HBoxJoin/IP
@onready var _port_input: LineEdit = $Center/Panel/Margin/V/HBoxJoin/Port
@onready var _status: Label = $Center/Panel/Margin/V/Status


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	$Center/Panel/Margin/V/SoloButton.pressed.connect(_on_solo)
	$Center/Panel/Margin/V/HostButton.pressed.connect(_on_host)
	$Center/Panel/Margin/V/HBoxJoin/JoinButton.pressed.connect(_on_join)
	NetworkManager.joined.connect(_on_joined)
	NetworkManager.join_failed.connect(_on_join_failed)


func _on_solo() -> void:
	NetworkManager.start_solo()
	_goto_main()


func _on_host() -> void:
	var port := int(_port_input.text) if _port_input.text != "" else NetworkManager.DEFAULT_PORT
	var err := NetworkManager.host(port)
	if err == OK:
		_status.text = "Hosting on port %d" % port
		_goto_main()
	else:
		_status.text = "Host failed (err %d)" % err


func _on_join() -> void:
	var ip := _ip_input.text if _ip_input.text != "" else "127.0.0.1"
	var port := int(_port_input.text) if _port_input.text != "" else NetworkManager.DEFAULT_PORT
	_status.text = "Connecting to %s:%d ..." % [ip, port]
	NetworkManager.join(ip, port)


func _on_joined() -> void:
	_status.text = "Connected!"
	_goto_main()


func _on_join_failed() -> void:
	_status.text = "Connection failed."


func _goto_main() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")
