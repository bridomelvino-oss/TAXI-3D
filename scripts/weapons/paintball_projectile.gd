extends RigidBody3D
class_name PaintballProjectile
## Light projectile: spawns a paint decal on impact then frees itself.

@export var lifetime := 3.0
@export var initial_speed := 45.0
@export var decal_min_size := 0.35
@export var decal_max_size := 0.7

var paint_color: Color = Color.WHITE
var _spawned_at := 0.0

@onready var _mesh: MeshInstance3D = $Mesh


func _ready() -> void:
	_spawned_at = Time.get_ticks_msec() / 1000.0
	contact_monitor = true
	max_contacts_reported = 2
	collision_layer = 4   # projectile
	collision_mask = 1 | 2  # world + players
	body_entered.connect(_on_body_entered)
	gravity_scale = 0.45  # paintball arc

	var mat: StandardMaterial3D = _mesh.material_override
	if mat == null:
		mat = StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_mesh.material_override = mat
	mat.albedo_color = paint_color


func launch(direction: Vector3) -> void:
	linear_velocity = direction.normalized() * initial_speed


func _physics_process(_delta: float) -> void:
	if Time.get_ticks_msec() / 1000.0 - _spawned_at > lifetime:
		queue_free()


var shooter_id: int = 0

func _on_body_entered(body: Node) -> void:
	if body is PlayerController:
		var p := body as PlayerController
		# Don't tag yourself.
		if p.get_multiplayer_authority() != shooter_id:
			_spawn_player_splat(p)
			p.register_tag(paint_color)
	else:
		_spawn_paint_splat()
	queue_free()


func _spawn_player_splat(p: PlayerController) -> void:
	var decal := Decal.new()
	decal.add_to_group("paint_decal")
	p.add_child(decal)
	decal.position = (global_position - p.global_position) + Vector3(0, 0.9, 0)
	decal.size = Vector3(0.8, 1.6, 0.8)
	decal.texture_albedo = _make_splat_texture()
	decal.modulate = paint_color
	decal.albedo_mix = 1.0


func _spawn_paint_splat() -> void:
	# Cast a tiny ray opposite the velocity to find the surface normal robustly.
	var space := get_world_3d().direct_space_state
	var from := global_position - linear_velocity.normalized() * 0.2
	var to := global_position + linear_velocity.normalized() * 0.6
	var params := PhysicsRayQueryParameters3D.create(from, to)
	params.collision_mask = 1
	var hit := space.intersect_ray(params)

	var decal := Decal.new()
	decal.add_to_group("paint_decal")
	get_tree().current_scene.add_child(decal)

	var normal := Vector3.UP
	var pos := global_position
	if not hit.is_empty():
		normal = hit.normal
		pos = hit.position
	decal.global_position = pos + normal * 0.02
	# Orient the decal so its -Y axis aligns with the surface normal.
	decal.look_at(decal.global_position - normal, _safe_up(normal))

	var s := randf_range(decal_min_size, decal_max_size)
	decal.size = Vector3(s, 0.5, s)
	decal.texture_albedo = _make_splat_texture()
	decal.modulate = paint_color
	decal.albedo_mix = 1.0
	decal.cull_mask = 1048575

	# Cleanup oldest decals if too many (cheap perf safeguard).
	_cull_old_decals()


func _safe_up(n: Vector3) -> Vector3:
	return Vector3.RIGHT if absf(n.dot(Vector3.UP)) > 0.95 else Vector3.UP


static var _decal_pool: Array[Decal] = []
const MAX_DECALS := 200

func _cull_old_decals() -> void:
	var splats := get_tree().get_nodes_in_group("paint_decal")
	if splats.size() > MAX_DECALS:
		for i in splats.size() - MAX_DECALS:
			(splats[i] as Node).queue_free()


# Procedural splat texture (single radial gradient) cached on the script.
static var _splat_cache: Texture2D = null

func _make_splat_texture() -> Texture2D:
	if _splat_cache != null:
		return _splat_cache
	var size := 64
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var cx := size / 2.0
	for y in size:
		for x in size:
			var d := Vector2(x - cx, y - cx).length() / cx
			# Irregular edge for a more organic splat.
			var jitter := (sin(x * 1.3) + cos(y * 1.7)) * 0.07
			var a := clampf(1.0 - (d + jitter) * 1.15, 0.0, 1.0)
			a = pow(a, 1.5)
			img.set_pixel(x, y, Color(1, 1, 1, a))
	_splat_cache = ImageTexture.create_from_image(img)
	return _splat_cache
