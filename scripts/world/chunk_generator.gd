extends RefCounted
class_name ChunkGenerator
## Procedural terrain generator for one chunk.
## Pure function of (chunk_coord, seed) — safe to run on a worker thread.

const SIZE := 16  # mirrors VoxelChunk.SIZE

var seed: int = 1337
var height_amp := 12.0           # peak hill height above sea level
var sea_level := 6.0
var pillar_chance := 0.015
var _continent: FastNoiseLite
var _hills: FastNoiseLite


func _init(world_seed: int = 1337) -> void:
	seed = world_seed
	_continent = FastNoiseLite.new()
	_continent.noise_type = FastNoiseLite.TYPE_PERLIN
	_continent.seed = seed
	_continent.frequency = 0.012

	_hills = FastNoiseLite.new()
	_hills.noise_type = FastNoiseLite.TYPE_PERLIN
	_hills.seed = seed + 17
	_hills.frequency = 0.06


## Returns a flat blocks array for the given chunk coordinate.
func generate(chunk_coord: Vector3i) -> PackedByteArray:
	var blocks := PackedByteArray()
	blocks.resize(SIZE * SIZE * SIZE)
	# Skip generation entirely for chunks fully above the expected max height
	# (cheap empty-chunk optimization).
	var min_y := chunk_coord.y * SIZE
	if min_y > sea_level + height_amp + 8.0:
		return blocks

	var max_y := min_y + SIZE - 1
	for lx in SIZE:
		for lz in SIZE:
			var wx := chunk_coord.x * SIZE + lx
			var wz := chunk_coord.z * SIZE + lz
			var h := _surface_height(wx, wz)
			# Random pillar tagging (deterministic per column)
			var pillar_h := 0
			var pillar_block := 0
			var col_rand := _hash(wx, wz)
			if (col_rand & 0xFFFF) / 65535.0 < pillar_chance and h > sea_level - 2.0:
				pillar_h = 3 + (col_rand >> 16) % 6
				pillar_block = 6 if (col_rand & 1) else 7  # neon red / blue

			for ly in SIZE:
				var wy := min_y + ly
				var id := BlockDB.AIR
				if wy <= h - 4:
					id = 3  # stone
				elif wy <= h - 1:
					id = 2  # dirt
				elif wy == h:
					id = 4 if h < sea_level + 1.0 else 1  # sand near sea, grass above
				elif pillar_h > 0 and wy > h and wy <= h + pillar_h:
					id = pillar_block

				if id != BlockDB.AIR:
					blocks[lx + SIZE * (ly + SIZE * lz)] = id
	return blocks


func _surface_height(wx: int, wz: int) -> int:
	var c := _continent.get_noise_2d(wx, wz)        # -1..1
	var h := _hills.get_noise_2d(wx, wz)            # -1..1
	var n := c * 0.7 + h * 0.3
	var height := sea_level + n * height_amp
	return int(round(height))


func _hash(a: int, b: int) -> int:
	var h := (a * 374761393 + b * 668265263) ^ seed
	h = (h ^ (h >> 13)) * 1274126177
	return absi(h ^ (h >> 16))
