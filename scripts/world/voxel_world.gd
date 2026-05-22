extends Node3D
class_name VoxelWorld
## Voxel grid that holds chunks. Edit one block via set_block_world(),
## the corresponding chunk (and neighbors if on a border) rebuild themselves.

@export var world_size_chunks := Vector3i(4, 1, 4)
@export var generate_demo_terrain := true

var _chunks: Dictionary = {}  # Vector3i -> VoxelChunk


func _ready() -> void:
	for cx in world_size_chunks.x:
		for cy in world_size_chunks.y:
			for cz in world_size_chunks.z:
				_create_chunk(Vector3i(cx, cy, cz))

	if generate_demo_terrain:
		_generate_demo()

	for c in _chunks.values():
		c.rebuild()


func _create_chunk(coord: Vector3i) -> VoxelChunk:
	var chunk := VoxelChunk.new()
	chunk.world = self
	chunk.coord = coord
	chunk.position = Vector3(coord) * float(VoxelChunk.SIZE)
	add_child(chunk)
	_chunks[coord] = chunk
	return chunk


# --------------------------------------------------------------------------- #
#  World-space block API
# --------------------------------------------------------------------------- #
func get_block_world(pos: Vector3i) -> int:
	var c := _chunk_coord(pos)
	if not _chunks.has(c):
		return BlockDB.AIR
	var lp := pos - c * VoxelChunk.SIZE
	return _chunks[c].get_block_local(lp.x, lp.y, lp.z)


func set_block_world(pos: Vector3i, id: int) -> bool:
	var c := _chunk_coord(pos)
	if not _chunks.has(c):
		return false
	var lp := pos - c * VoxelChunk.SIZE
	var chunk: VoxelChunk = _chunks[c]
	if chunk.get_block_local(lp.x, lp.y, lp.z) == id:
		return false
	chunk.set_block_local(lp.x, lp.y, lp.z, id)
	chunk.rebuild()
	# Rebuild neighbors if we touched a border so their hidden faces appear.
	for axis in 3:
		var off_neg := Vector3i.ZERO
		var off_pos := Vector3i.ZERO
		off_neg[axis] = -1
		off_pos[axis] = 1
		if lp[axis] == 0:
			_rebuild_if_exists(c + off_neg)
		if lp[axis] == VoxelChunk.SIZE - 1:
			_rebuild_if_exists(c + off_pos)
	return true


func _rebuild_if_exists(c: Vector3i) -> void:
	if _chunks.has(c):
		(_chunks[c] as VoxelChunk).rebuild()


func _chunk_coord(pos: Vector3i) -> Vector3i:
	# Floor division for negative coordinates
	return Vector3i(
		floori(float(pos.x) / VoxelChunk.SIZE),
		floori(float(pos.y) / VoxelChunk.SIZE),
		floori(float(pos.z) / VoxelChunk.SIZE),
	)


# --------------------------------------------------------------------------- #
#  Demo terrain: simple rolling layer + a few neon pillars
# --------------------------------------------------------------------------- #
func _generate_demo() -> void:
	var sx := world_size_chunks.x * VoxelChunk.SIZE
	var sz := world_size_chunks.z * VoxelChunk.SIZE
	var max_h := world_size_chunks.y * VoxelChunk.SIZE - 1

	for x in sx:
		for z in sz:
			var h := 2 + int((sin(x * 0.18) + cos(z * 0.21)) * 1.2 + 1.0)
			h = clampi(h, 1, max_h)
			for y in h:
				var id := BlockDB.AIR
				if y == h - 1:
					id = 1  # grass
				elif y >= h - 3:
					id = 2  # dirt
				else:
					id = 3  # stone
				_force_set(Vector3i(x, y, z), id)

	# Decorative pillars
	for i in 6:
		var px := randi() % sx
		var pz := randi() % sz
		var ph := 3 + randi() % 5
		var floor_h := _surface_height(px, pz)
		var color_id := 6 + (i % 2)  # neon red / neon blue
		for k in ph:
			_force_set(Vector3i(px, floor_h + k, pz), color_id)


func _force_set(pos: Vector3i, id: int) -> void:
	var c := _chunk_coord(pos)
	if not _chunks.has(c): return
	var lp := pos - c * VoxelChunk.SIZE
	(_chunks[c] as VoxelChunk).set_block_local(lp.x, lp.y, lp.z, id)


func _surface_height(x: int, z: int) -> int:
	var max_h := world_size_chunks.y * VoxelChunk.SIZE - 1
	for y in range(max_h, -1, -1):
		if BlockDB.is_solid(get_block_world(Vector3i(x, y, z))):
			return y + 1
	return 0
