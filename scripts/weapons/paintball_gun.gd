extends Node3D
class_name PaintballGun
## Shoots paintballs, places & breaks voxel blocks via the camera's aim ray.

signal shot_fired(color: Color)

@export var fire_rate := 7.0           # shots per second
@export var build_reach := 6.0
@export var spread := 0.012            # radians
@export var projectile_scene: PackedScene

@onready var _muzzle: Marker3D = $Muzzle

var _camera: Camera3D
var _world: VoxelWorld
var _last_shot := -10.0
var _owner_player: PlayerController


func setup(camera: Camera3D, world: VoxelWorld) -> void:
	_camera = camera
	_world = world
	_owner_player = camera.get_parent().get_parent() as PlayerController


func _process(_delta: float) -> void:
	if _camera == null: return
	# Only the locally-controlled player drives the gun.
	if _owner_player and not _owner_player.is_local():
		return
	if Input.is_action_pressed("shoot"):
		_try_shoot()
	if Input.is_action_just_pressed("place_block"):
		_place_block()
	if Input.is_action_just_pressed("break_block"):
		_break_block()
	if Input.is_action_just_pressed("cycle_block"):
		GameSettings.cycle_block()
	if Input.is_action_just_pressed("cycle_paint"):
		GameSettings.cycle_paint()
	for i in 7:
		if Input.is_action_just_pressed("hotbar_%d" % (i + 1)):
			GameSettings.set_block(i + 1)
	for i in 6:
		if Input.is_action_just_pressed("paint_%d" % (i + 1)):
			GameSettings.set_paint(i)


func _try_shoot() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_shot < 1.0 / fire_rate:
		return
	_last_shot = now

	if projectile_scene == null:
		push_warning("PaintballGun: projectile_scene not set")
		return

	var proj: PaintballProjectile = projectile_scene.instantiate()
	get_tree().current_scene.add_child(proj)
	proj.paint_color = GameSettings.current_paint_color()
	proj.shooter_id = _owner_player.get_multiplayer_authority() if _owner_player else 0
	proj.global_position = _muzzle.global_position

	var dir := -_camera.global_transform.basis.z
	dir = dir.rotated(_camera.global_transform.basis.x, randf_range(-spread, spread))
	dir = dir.rotated(_camera.global_transform.basis.y, randf_range(-spread, spread))
	proj.launch(dir)

	shot_fired.emit(GameSettings.current_paint_color())


# --------------------------------------------------------------------------- #
#  Voxel build / break (raycast from camera)
# --------------------------------------------------------------------------- #
func _aim_hit() -> Dictionary:
	var space := get_world_3d().direct_space_state
	var from := _camera.global_position
	var to := from + (-_camera.global_transform.basis.z) * build_reach
	var params := PhysicsRayQueryParameters3D.create(from, to)
	params.collision_mask = 1
	return space.intersect_ray(params)


func _place_block() -> void:
	if _world == null: return
	var hit := _aim_hit()
	if hit.is_empty(): return
	var pos := hit.position + hit.normal * 0.5
	var bp := Vector3i(floori(pos.x), floori(pos.y), floori(pos.z))
	_world.request_set_block(bp, GameSettings.current_block_id)


func _break_block() -> void:
	if _world == null: return
	var hit := _aim_hit()
	if hit.is_empty(): return
	var pos := hit.position - hit.normal * 0.5
	var bp := Vector3i(floori(pos.x), floori(pos.y), floori(pos.z))
	_world.request_set_block(bp, BlockDB.AIR)
