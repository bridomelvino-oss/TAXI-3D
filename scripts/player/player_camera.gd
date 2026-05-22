extends Node3D
class_name PlayerCamera
## FPS/TPS camera with mouse look, FOV punch, strafe tilt and landing shake.
## The pivot (this node) handles YAW; the inner Camera3D handles PITCH.

@export var min_pitch_deg := -85.0
@export var max_pitch_deg := 85.0
@export var tilt_strength := 2.2
@export var tilt_speed := 8.0
@export var fov_lerp_speed := 6.0
@export var tps_arm_length := 3.2

@onready var _camera: Camera3D = $Camera3D

var _pitch := 0.0
var _tps_mode := false
var _tilt := 0.0
var _shake_decay := 0.0
var _shake_amount := 0.0
var _cam_offset := Vector3.ZERO

@onready var _player: PlayerController = get_parent() as PlayerController


func _ready() -> void:
	_camera.fov = GameSettings.fov_base
	if _player:
		_player.landed.connect(_on_landed)
		_player.jumped.connect(_on_jumped)
		_player.wall_jumped.connect(_on_wall_jumped)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var mm := event as InputEventMouseMotion
		rotation.y -= mm.relative.x * GameSettings.mouse_sensitivity
		var dy := mm.relative.y * GameSettings.mouse_sensitivity
		if GameSettings.invert_y: dy = -dy
		_pitch = clampf(_pitch - dy, deg_to_rad(min_pitch_deg), deg_to_rad(max_pitch_deg))

	if event.is_action_pressed("toggle_view"):
		_tps_mode = not _tps_mode
		_apply_view_visibility()


func _apply_view_visibility() -> void:
	if _player == null: return
	var body := _player.get_node_or_null("StickmanBody")
	var head := _player.get_node_or_null("StickmanHead")
	if body: body.visible = _tps_mode
	if head: head.visible = _tps_mode


func _process(delta: float) -> void:
	# Pitch is applied on the camera itself so the yaw pivot stays clean for the body.
	_camera.rotation.x = _pitch

	# FOV punch: target FOV depends on movement state
	var target_fov := GameSettings.fov_base
	if _player:
		if _player.is_sliding():
			target_fov += GameSettings.fov_sprint_bonus * 1.4
		elif _player.is_sprinting():
			target_fov += GameSettings.fov_sprint_bonus
	_camera.fov = lerpf(_camera.fov, target_fov, delta * fov_lerp_speed)

	# Strafe tilt (lean into turns)
	var strafe := Input.get_action_strength("move_left") - Input.get_action_strength("move_right")
	_tilt = lerpf(_tilt, strafe * tilt_strength, delta * tilt_speed)
	_camera.rotation.z = deg_to_rad(_tilt)

	# TPS camera pull-back (no spring; we don't want collision to break gun visuals)
	var target_z := tps_arm_length if _tps_mode else 0.0
	var target_y := 0.4 if _tps_mode else 0.0
	_cam_offset.z = lerpf(_cam_offset.z, target_z, delta * 8.0)
	_cam_offset.y = lerpf(_cam_offset.y, target_y, delta * 8.0)
	_camera.position = _cam_offset

	# Shake decay
	if _shake_amount > 0.0:
		var off := Vector3(randf_range(-1, 1), randf_range(-1, 1), 0.0) * _shake_amount * 0.04
		_camera.position = _cam_offset + off
		_shake_amount = maxf(_shake_amount - _shake_decay * delta, 0.0)


# ---- reactions to controller signals ----
func _on_landed(impact: float) -> void:
	_kick_shake(clampf(impact / 14.0, 0.0, 1.6), 6.0)

func _on_jumped() -> void:
	_kick_shake(0.25, 8.0)

func _on_wall_jumped(_n: Vector3) -> void:
	_kick_shake(0.45, 7.0)

func _kick_shake(amount: float, decay: float) -> void:
	_shake_amount = maxf(_shake_amount, amount)
	_shake_decay = decay


# ---- exposed for the gun ----
func get_camera() -> Camera3D:
	return _camera

func aim_origin() -> Vector3:
	return _camera.global_position

func aim_direction() -> Vector3:
	return -_camera.global_transform.basis.z
