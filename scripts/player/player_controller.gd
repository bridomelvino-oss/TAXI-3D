extends CharacterBody3D
class_name PlayerController
## Movement: walk / sprint / slide / wall-jump / bunny-hop / air control.
## Gravity is handled here so the character ignores the project's default.

signal landed(impact_speed: float)
signal jumped
signal slide_started
signal slide_ended
signal wall_jumped(normal: Vector3)
signal speed_changed(speed: float)

@export_group("Walk")
@export var walk_speed := 6.0
@export var sprint_speed := 9.5
@export var ground_acceleration := 14.0
@export var ground_friction := 11.0

@export_group("Air")
@export var air_acceleration := 4.0
@export var air_max_speed := 9.5
@export var gravity := 24.0
@export var max_fall_speed := 55.0

@export_group("Jump")
@export var jump_velocity := 8.0
@export var coyote_time := 0.12
@export var jump_buffer_time := 0.10

@export_group("Slide")
@export var slide_boost := 4.0          # extra speed injected on slide start
@export var slide_min_duration := 0.25
@export var slide_max_duration := 1.10
@export var slide_friction := 2.2
@export var slide_min_speed := 4.5
@export var standing_height := 1.8
@export var sliding_height := 0.9

@export_group("Wall jump")
@export var wall_check_distance := 0.45
@export var wall_jump_velocity := 8.5
@export var wall_push_velocity := 7.0
@export var wall_jump_cooldown := 0.20

@export_group("Bunny hop")
@export var bhop_window := 0.10         # seconds after landing
@export var bhop_gain := 0.6
@export var bhop_max_speed := 14.0

# -------- runtime state --------
var _was_on_floor := false
var _last_grounded_time := -10.0
var _last_jump_pressed := -10.0
var _last_wall_jump := -10.0
var _is_sprinting := false
var _is_sliding := false
var _slide_timer := 0.0
var _slide_dir := Vector3.ZERO

@onready var _camera_pivot: Node3D = $CameraPivot
@onready var _standing_shape: CollisionShape3D = $StandingShape
@onready var _sliding_shape: CollisionShape3D = $SlidingShape
@onready var _ceiling_check: RayCast3D = $CeilingCheck
@onready var _wall_left: RayCast3D = $CameraPivot/WallLeft
@onready var _wall_right: RayCast3D = $CameraPivot/WallRight


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	floor_max_angle = deg_to_rad(50)
	floor_snap_length = 0.35
	_set_sliding_collision(false)


func _physics_process(delta: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0

	# --- buffer jump input ---
	if Input.is_action_just_pressed("jump"):
		_last_jump_pressed = now

	# --- ground tracking + landing ---
	var on_floor := is_on_floor()
	if on_floor:
		_last_grounded_time = now
		if not _was_on_floor:
			landed.emit(absf(velocity.y))
	_was_on_floor = on_floor

	_update_sprint()
	_update_slide(delta, on_floor)

	# --- horizontal movement vector from input, projected on camera yaw ---
	var input_dir := Vector2(
		Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
		Input.get_action_strength("move_back") - Input.get_action_strength("move_forward")
	)
	var yaw := _camera_pivot.rotation.y
	var wish_dir := (Vector3(input_dir.x, 0, input_dir.y).rotated(Vector3.UP, yaw)).normalized()

	if on_floor and not _is_sliding:
		_ground_move(wish_dir, delta)
	elif _is_sliding:
		_slide_move(delta)
	else:
		_air_move(wish_dir, delta)

	# --- gravity ---
	if not on_floor:
		velocity.y = maxf(velocity.y - gravity * delta, -max_fall_speed)

	# --- jump (with coyote + buffer) ---
	var can_coyote := (now - _last_grounded_time) <= coyote_time
	var jump_buffered := (now - _last_jump_pressed) <= jump_buffer_time
	if jump_buffered and (on_floor or can_coyote):
		_do_jump(on_floor)
		_last_jump_pressed = -10.0
	elif jump_buffered and not on_floor and (now - _last_wall_jump) > wall_jump_cooldown:
		_try_wall_jump(now)

	move_and_slide()
	speed_changed.emit(Vector2(velocity.x, velocity.z).length())


# --------------------------------------------------------------------------- #
#  Ground / air movement (source-style accel + friction)
# --------------------------------------------------------------------------- #
func _ground_move(wish_dir: Vector3, delta: float) -> void:
	var target_speed := sprint_speed if _is_sprinting else walk_speed
	var horizontal := Vector3(velocity.x, 0, velocity.z)

	# friction first, only if no input or above target
	if wish_dir == Vector3.ZERO or horizontal.length() > target_speed:
		var speed := horizontal.length()
		if speed > 0.01:
			var drop := speed * ground_friction * delta
			horizontal *= maxf(speed - drop, 0.0) / speed

	# accelerate toward wish
	var current_in_wish := horizontal.dot(wish_dir)
	var add_speed := target_speed - current_in_wish
	if add_speed > 0.0:
		var accel := ground_acceleration * target_speed * delta
		accel = minf(accel, add_speed)
		horizontal += wish_dir * accel

	velocity.x = horizontal.x
	velocity.z = horizontal.z


func _air_move(wish_dir: Vector3, delta: float) -> void:
	if wish_dir == Vector3.ZERO:
		return
	var horizontal := Vector3(velocity.x, 0, velocity.z)
	var current_in_wish := horizontal.dot(wish_dir)
	var add_speed := air_max_speed - current_in_wish
	if add_speed <= 0.0:
		return
	var accel := air_acceleration * air_max_speed * delta
	accel = minf(accel, add_speed)
	horizontal += wish_dir * accel
	velocity.x = horizontal.x
	velocity.z = horizontal.z


# --------------------------------------------------------------------------- #
#  Slide
# --------------------------------------------------------------------------- #
func _update_slide(delta: float, on_floor: bool) -> void:
	if _is_sliding:
		_slide_timer += delta
		var horizontal := Vector2(velocity.x, velocity.z).length()
		var ceiling_blocked := _ceiling_check.is_colliding()
		var expired := _slide_timer >= slide_max_duration
		var too_slow := horizontal < slide_min_speed and _slide_timer > slide_min_duration
		if (not Input.is_action_pressed("slide") and not ceiling_blocked and _slide_timer > slide_min_duration) \
				or expired or too_slow or not on_floor:
			if not ceiling_blocked:
				_end_slide()
		return

	if on_floor and Input.is_action_just_pressed("slide") and _is_sprinting:
		_begin_slide()


func _begin_slide() -> void:
	_is_sliding = true
	_slide_timer = 0.0
	_slide_dir = Vector3(velocity.x, 0, velocity.z).normalized()
	if _slide_dir == Vector3.ZERO:
		_slide_dir = -global_transform.basis.z
	var boost = _slide_dir * (sprint_speed + slide_boost)
	velocity.x = boost.x
	velocity.z = boost.z
	_set_sliding_collision(true)
	slide_started.emit()


func _end_slide() -> void:
	_is_sliding = false
	_set_sliding_collision(false)
	slide_ended.emit()


func _slide_move(delta: float) -> void:
	var horizontal := Vector3(velocity.x, 0, velocity.z)
	var speed := horizontal.length()
	if speed > 0.01:
		var drop := slide_friction * delta
		var new_speed := maxf(speed - drop, 0.0)
		horizontal *= new_speed / speed
	velocity.x = horizontal.x
	velocity.z = horizontal.z


func _set_sliding_collision(sliding: bool) -> void:
	_standing_shape.disabled = sliding
	_sliding_shape.disabled = not sliding
	# Lower the camera pivot during slide for that cinematic dip.
	var target_y := sliding_height * 0.85 if sliding else standing_height * 0.85
	create_tween().tween_property(_camera_pivot, "position:y", target_y, 0.12)


# --------------------------------------------------------------------------- #
#  Jump / wall jump / bunny hop
# --------------------------------------------------------------------------- #
func _do_jump(on_floor: bool) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	velocity.y = jump_velocity

	if _is_sliding:
		_end_slide()

	# bunny-hop boost: jump again within the window keeps + amplifies speed
	if on_floor and (now - _last_grounded_time) < bhop_window + 0.05:
		var horizontal := Vector3(velocity.x, 0, velocity.z)
		var speed := horizontal.length()
		if speed > walk_speed:
			var new_speed := minf(speed + bhop_gain, bhop_max_speed)
			horizontal = horizontal.normalized() * new_speed
			velocity.x = horizontal.x
			velocity.z = horizontal.z

	jumped.emit()


func _try_wall_jump(now: float) -> void:
	var normal := Vector3.ZERO
	if _wall_left.is_colliding():
		normal = _wall_left.get_collision_normal()
	elif _wall_right.is_colliding():
		normal = _wall_right.get_collision_normal()
	else:
		return

	velocity.y = wall_jump_velocity
	var push := normal * wall_push_velocity
	velocity.x = push.x
	velocity.z = push.z
	_last_wall_jump = now
	_last_jump_pressed = -10.0
	wall_jumped.emit(normal)


# --------------------------------------------------------------------------- #
#  Sprint
# --------------------------------------------------------------------------- #
func _update_sprint() -> void:
	if _is_sliding:
		_is_sprinting = false
		return
	# Toggle-style: hold to sprint, drops when going backward
	var pressing := Input.is_action_pressed("sprint")
	var moving_forward := Input.get_action_strength("move_forward") > 0.1
	_is_sprinting = pressing and moving_forward


# --------------------------------------------------------------------------- #
#  Helpers exposed to other systems
# --------------------------------------------------------------------------- #
func is_sprinting() -> bool: return _is_sprinting
func is_sliding() -> bool:   return _is_sliding
func horizontal_speed() -> float:
	return Vector2(velocity.x, velocity.z).length()
