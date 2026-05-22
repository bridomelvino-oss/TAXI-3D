extends StaticBody3D
class_name VoxelChunk
## A 16x16x16 cube of voxels. Owns its mesh and collision.
## Block coordinates here are LOCAL (0..15).

const SIZE := 16

# Face neighbor offsets, vertex layout, normals (top, bottom, north, south, east, west)
const FACES := [
	{ "dir": Vector3i(0, 1, 0), "n": Vector3(0, 1, 0),
	  "v": [Vector3(0, 1, 0), Vector3(1, 1, 0), Vector3(1, 1, 1), Vector3(0, 1, 1)] },
	{ "dir": Vector3i(0, -1, 0), "n": Vector3(0, -1, 0),
	  "v": [Vector3(0, 0, 1), Vector3(1, 0, 1), Vector3(1, 0, 0), Vector3(0, 0, 0)] },
	{ "dir": Vector3i(0, 0, -1), "n": Vector3(0, 0, -1),
	  "v": [Vector3(1, 0, 0), Vector3(1, 1, 0), Vector3(0, 1, 0), Vector3(0, 0, 0)] },
	{ "dir": Vector3i(0, 0, 1), "n": Vector3(0, 0, 1),
	  "v": [Vector3(0, 0, 1), Vector3(0, 1, 1), Vector3(1, 1, 1), Vector3(1, 0, 1)] },
	{ "dir": Vector3i(1, 0, 0), "n": Vector3(1, 0, 0),
	  "v": [Vector3(1, 0, 1), Vector3(1, 1, 1), Vector3(1, 1, 0), Vector3(1, 0, 0)] },
	{ "dir": Vector3i(-1, 0, 0), "n": Vector3(-1, 0, 0),
	  "v": [Vector3(0, 0, 0), Vector3(0, 1, 0), Vector3(0, 1, 1), Vector3(0, 0, 1)] },
]

var blocks: PackedByteArray = PackedByteArray()
var coord: Vector3i = Vector3i.ZERO
var world: VoxelWorld

var _mesh_instance: MeshInstance3D
var _collision_shape: CollisionShape3D
var _material: StandardMaterial3D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	if blocks.size() != SIZE * SIZE * SIZE:
		blocks.resize(SIZE * SIZE * SIZE)
	_mesh_instance = MeshInstance3D.new()
	add_child(_mesh_instance)
	_collision_shape = CollisionShape3D.new()
	add_child(_collision_shape)
	_material = StandardMaterial3D.new()
	_material.vertex_color_use_as_albedo = true
	_material.roughness = 0.85
	_material.metallic = 0.0


func set_block_local(x: int, y: int, z: int, id: int) -> void:
	blocks[_index(x, y, z)] = id


func get_block_local(x: int, y: int, z: int) -> int:
	if x < 0 or y < 0 or z < 0 or x >= SIZE or y >= SIZE or z >= SIZE:
		return BlockDB.AIR
	return blocks[_index(x, y, z)]


func _index(x: int, y: int, z: int) -> int:
	return x + SIZE * (y + SIZE * z)


## Rebuilds mesh + collision. Cheap enough for 16³ on edit.
func rebuild() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(_material)

	for x in SIZE:
		for y in SIZE:
			for z in SIZE:
				var id := get_block_local(x, y, z)
				if id == BlockDB.AIR:
					continue
				_emit_visible_faces(st, x, y, z, id)

	var mesh := st.commit()
	if mesh.get_surface_count() == 0:
		_mesh_instance.mesh = null
		_collision_shape.shape = null
		return

	_mesh_instance.mesh = mesh
	var tri := mesh.create_trimesh_shape()
	_collision_shape.shape = tri


func _emit_visible_faces(st: SurfaceTool, x: int, y: int, z: int, id: int) -> void:
	var color := BlockDB.color_of(id)
	for face in FACES:
		var nx: int = x + face.dir.x
		var ny: int = y + face.dir.y
		var nz: int = z + face.dir.z
		var neighbor: int
		if nx < 0 or ny < 0 or nz < 0 or nx >= SIZE or ny >= SIZE or nz >= SIZE:
			neighbor = world.get_block_world(coord * SIZE + Vector3i(nx, ny, nz))
		else:
			neighbor = get_block_local(nx, ny, nz)
		if BlockDB.is_solid(neighbor):
			continue
		_emit_face(st, Vector3(x, y, z), face, color)


func _emit_face(st: SurfaceTool, base: Vector3, face: Dictionary, color: Color) -> void:
	var v: Array = face.v
	var n: Vector3 = face.n
	# Tiny per-face shade to make the low-poly look pop without textures.
	var shade := 1.0
	if n.y > 0.5:   shade = 1.0
	elif n.y < -0.5: shade = 0.75
	elif absf(n.x) > 0.5: shade = 0.87
	else: shade = 0.92
	var c := Color(color.r * shade, color.g * shade, color.b * shade, 1.0)

	st.set_color(c); st.set_normal(n); st.add_vertex(base + v[0])
	st.set_color(c); st.set_normal(n); st.add_vertex(base + v[1])
	st.set_color(c); st.set_normal(n); st.add_vertex(base + v[2])

	st.set_color(c); st.set_normal(n); st.add_vertex(base + v[0])
	st.set_color(c); st.set_normal(n); st.add_vertex(base + v[2])
	st.set_color(c); st.set_normal(n); st.add_vertex(base + v[3])
