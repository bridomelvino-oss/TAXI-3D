extends Node3D
## Boots the game: wires the player gun to the voxel world and the HUD.

@onready var _world: VoxelWorld = $VoxelWorld
@onready var _player: PlayerController = $Player
@onready var _camera: PlayerCamera = $Player/CameraPivot
@onready var _gun: PaintballGun = $Player/CameraPivot/Camera3D/PaintballGun
@onready var _hud = $HUD


func _ready() -> void:
	_gun.setup(_camera.get_camera(), _world)
	_hud.bind_player(_player)

	# Place the player above the demo terrain.
	var center := Vector3(_world.world_size_chunks.x * 8, 14.0, _world.world_size_chunks.z * 8)
	_player.global_position = center


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = (
			Input.MOUSE_MODE_VISIBLE
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
			else Input.MOUSE_MODE_CAPTURED
		)
