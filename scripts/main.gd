extends Node3D
## Game scene: handles player spawning (solo + multiplayer) and wires
## the local player's gun to the voxel world and HUD.

const PLAYER_SCENE := preload("res://scenes/player/player.tscn")

@onready var _world: VoxelWorld = $VoxelWorld
@onready var _players: Node3D = $Players
@onready var _spawner: MultiplayerSpawner = $PlayerSpawner
@onready var _hud = $HUD


func _ready() -> void:
	_spawner.spawn_function = Callable(self, "_spawn_player_instance")
	# Kick off chunk generation around the spawn area immediately.
	_world.prime_streaming_at(Vector3(8, 12, 8))

	if NetworkManager.is_networked():
		if multiplayer.is_server():
			NetworkManager.peer_left.connect(_on_peer_left)
			# Host spawns its own player right away. Clients ask via RPC once
			# their scene is ready (see `_rpc_client_scene_ready` below).
			_spawner.spawn(multiplayer.get_unique_id())
		else:
			# Tell the server we're ready to receive our player.
			_rpc_client_scene_ready.rpc_id(1)
	else:
		# Solo: instantiate directly without going through the spawner.
		var p: Node = _spawn_player_instance(1)
		_players.add_child(p)


@rpc("any_peer", "call_remote", "reliable")
func _rpc_client_scene_ready() -> void:
	if not multiplayer.is_server():
		return
	var caller_id := multiplayer.get_remote_sender_id()
	if _players.has_node(str(caller_id)):
		return
	_spawner.spawn(caller_id)


# Runs on every peer (server + clients) thanks to MultiplayerSpawner.
func _spawn_player_instance(peer_id: int) -> Node:
	var p: PlayerController = PLAYER_SCENE.instantiate()
	p.name = str(peer_id)
	p.set_multiplayer_authority(peer_id)

	var spawn_pos := _pick_spawn_position()
	p.position = spawn_pos

	# Defer wiring until the node is in the tree so $CameraPivot etc. resolve.
	p.ready.connect(func(): _wire_local_player(p), CONNECT_ONE_SHOT)
	return p


func _wire_local_player(p: PlayerController) -> void:
	if not p.is_local():
		return
	var gun: PaintballGun = p.get_node("CameraPivot/Camera3D/PaintballGun")
	var cam_pivot: PlayerCamera = p.get_node("CameraPivot")
	gun.setup(cam_pivot.get_camera(), _world)
	_world.track_player(p)
	_hud.bind_player(p)


func _on_peer_left(id: int) -> void:
	var node := _players.get_node_or_null(str(id))
	if node:
		node.queue_free()


func _pick_spawn_position() -> Vector3:
	# Random spot around the origin. Spawned high so the chunk streamer has
	# time to generate the ground beneath the player.
	var rx := randi_range(2, 12)
	var rz := randi_range(2, 12)
	var y := _world.surface_height_at(rx, rz)
	return Vector3(rx + 0.5, y + 12.0, rz + 0.5)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = (
			Input.MOUSE_MODE_VISIBLE
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
			else Input.MOUSE_MODE_CAPTURED
		)
