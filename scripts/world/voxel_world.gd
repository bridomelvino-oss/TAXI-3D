extends Node3D
class_name VoxelWorld
## Streams 16^3 voxel chunks around the tracked player.
## Generation runs in WorkerThreadPool tasks; mesh upload happens on the
## main thread (Godot mesh APIs are not thread-safe).

signal block_changed(world_pos: Vector3i, id: int)

@export var view_radius_chunks := 4
@export var vertical_chunks := 3
@export var world_seed := 1337
@export var max_loads_per_frame := 2

var _player: Node3D
var _generator: ChunkGenerator
var _chunks: Dictionary = {}              # Vector3i -> VoxelChunk
var _pending_data: Dictionary = {}        # Vector3i -> PackedByteArray (ready to mesh)
var _in_flight: Dictionary = {}           # Vector3i -> true (generation queued)
var _player_chunk := Vector3i(99999, 99999, 99999)


func _ready() -> void:
	_generator = ChunkGenerator.new(world_seed)
	# Player may be assigned later via track_player()
	set_physics_process(true)


func track_player(p: Node3D) -> void:
	_player = p


## Eagerly start streaming chunks around `pos` before any player is tracked.
## Call this once at scene start so the world isn't empty when the player spawns.
func prime_streaming_at(pos: Vector3) -> void:
	_player_chunk = _world_to_chunk(pos)
	_refresh_streaming()


# --------------------------------------------------------------------------- #
#  Main streaming loop
# --------------------------------------------------------------------------- #
func _physics_process(_delta: float) -> void:
	if _player == null:
		return
	var pc := _world_to_chunk(_player.global_position)
	if pc != _player_chunk:
		_player_chunk = pc
		_refresh_streaming()

	_drain_pending()


func _refresh_streaming() -> void:
	var wanted: Dictionary = {}
	for dx in range(-view_radius_chunks, view_radius_chunks + 1):
		for dz in range(-view_radius_chunks, view_radius_chunks + 1):
			for cy in vertical_chunks:
				wanted[Vector3i(_player_chunk.x + dx, cy, _player_chunk.z + dz)] = true

	# Queue generation for missing chunks
	for c in wanted.keys():
		if _chunks.has(c) or _in_flight.has(c) or _pending_data.has(c):
			continue
		_queue_generation(c)

	# Unload far chunks
	for c in _chunks.keys():
		if not wanted.has(c):
			(_chunks[c] as VoxelChunk).queue_free()
			_chunks.erase(c)


func _queue_generation(coord: Vector3i) -> void:
	_in_flight[coord] = true
	# WorkerThreadPool lets us schedule a Callable; we capture coord by binding.
	WorkerThreadPool.add_task(Callable(self, "_generate_task").bind(coord), true)


# Runs on a worker thread. Must NOT touch the scene tree.
func _generate_task(coord: Vector3i) -> void:
	var data := _generator.generate(coord)
	call_deferred("_on_generation_done", coord, data)


func _on_generation_done(coord: Vector3i, data: PackedByteArray) -> void:
	_in_flight.erase(coord)
	# Player might have moved far away while we were generating.
	if not _is_in_view(coord):
		return
	_pending_data[coord] = data


func _drain_pending() -> void:
	var processed := 0
	var ready_keys: Array = _pending_data.keys()
	for coord in ready_keys:
		if processed >= max_loads_per_frame:
			break
		var data: PackedByteArray = _pending_data[coord]
		_pending_data.erase(coord)
		_spawn_chunk(coord, data)
		processed += 1


func _spawn_chunk(coord: Vector3i, data: PackedByteArray) -> void:
	if _chunks.has(coord):
		return
	var chunk := VoxelChunk.new()
	chunk.world = self
	chunk.coord = coord
	chunk.position = Vector3(coord) * float(VoxelChunk.SIZE)
	chunk.blocks = data
	add_child(chunk)
	_chunks[coord] = chunk
	chunk.rebuild()
	# Rebuild edge neighbors so the seam disappears immediately.
	for off in [Vector3i(-1,0,0), Vector3i(1,0,0), Vector3i(0,0,-1), Vector3i(0,0,1)]:
		if _chunks.has(coord + off):
			(_chunks[coord + off] as VoxelChunk).rebuild()


func _is_in_view(c: Vector3i) -> bool:
	var d := c - _player_chunk
	return absi(d.x) <= view_radius_chunks and absi(d.z) <= view_radius_chunks


# --------------------------------------------------------------------------- #
#  Public block API (used by the gun + multiplayer RPCs)
# --------------------------------------------------------------------------- #
func get_block_world(pos: Vector3i) -> int:
	var c := _world_to_chunk(Vector3(pos))
	if not _chunks.has(c):
		return BlockDB.AIR
	var lp := pos - c * VoxelChunk.SIZE
	return (_chunks[c] as VoxelChunk).get_block_local(lp.x, lp.y, lp.z)


func set_block_world(pos: Vector3i, id: int) -> bool:
	var c := _world_to_chunk(Vector3(pos))
	if not _chunks.has(c):
		return false
	var lp := pos - c * VoxelChunk.SIZE
	var chunk: VoxelChunk = _chunks[c]
	if chunk.get_block_local(lp.x, lp.y, lp.z) == id:
		return false
	chunk.set_block_local(lp.x, lp.y, lp.z, id)
	chunk.rebuild()
	for axis in 3:
		var off_neg := Vector3i.ZERO
		var off_pos := Vector3i.ZERO
		off_neg[axis] = -1
		off_pos[axis] = 1
		if lp[axis] == 0:
			_rebuild_if_exists(c + off_neg)
		if lp[axis] == VoxelChunk.SIZE - 1:
			_rebuild_if_exists(c + off_pos)
	block_changed.emit(pos, id)
	return true


func _rebuild_if_exists(c: Vector3i) -> void:
	if _chunks.has(c):
		(_chunks[c] as VoxelChunk).rebuild()


# --------------------------------------------------------------------------- #
#  Multiplayer-safe block edits.
#  Clients ask the server; the server validates and broadcasts to everyone.
# --------------------------------------------------------------------------- #
func request_set_block(pos: Vector3i, id: int) -> void:
	if not multiplayer.has_multiplayer_peer():
		set_block_world(pos, id)
		return
	if multiplayer.is_server():
		if set_block_world(pos, id):
			_rpc_apply_block.rpc(pos, id)
	else:
		_rpc_request_block.rpc_id(1, pos, id)


@rpc("any_peer", "call_remote", "reliable")
func _rpc_request_block(pos: Vector3i, id: int) -> void:
	if not multiplayer.is_server():
		return
	if set_block_world(pos, id):
		_rpc_apply_block.rpc(pos, id)


@rpc("authority", "call_remote", "reliable")
func _rpc_apply_block(pos: Vector3i, id: int) -> void:
	set_block_world(pos, id)


func _world_to_chunk(p: Vector3) -> Vector3i:
	return Vector3i(
		floori(p.x / VoxelChunk.SIZE),
		floori(p.y / VoxelChunk.SIZE),
		floori(p.z / VoxelChunk.SIZE),
	)


func surface_height_at(x: int, z: int) -> int:
	# Probe the generator directly so we can spawn the player above terrain
	# even before the chunk is meshed.
	if _generator == null:
		_generator = ChunkGenerator.new(world_seed)
	return _generator._surface_height(x, z) + 2
