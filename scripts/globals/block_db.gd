extends Node
## Block type registry. Block 0 is always "air".
## Autoloaded as `BlockDB`.

const AIR := 0

const BLOCKS := [
	{ "name": "air",      "color": Color(0, 0, 0, 0), "solid": false },
	{ "name": "grass",    "color": Color(0.35, 0.78, 0.32), "solid": true },
	{ "name": "dirt",     "color": Color(0.45, 0.30, 0.18), "solid": true },
	{ "name": "stone",    "color": Color(0.55, 0.55, 0.58), "solid": true },
	{ "name": "sand",     "color": Color(0.94, 0.85, 0.55), "solid": true },
	{ "name": "wood",     "color": Color(0.62, 0.40, 0.22), "solid": true },
	{ "name": "neon_red", "color": Color(1.0, 0.18, 0.32), "solid": true },
	{ "name": "neon_blue","color": Color(0.18, 0.55, 1.0), "solid": true },
]

func block_count() -> int:
	return BLOCKS.size() - 1  # exclude air

func is_solid(id: int) -> bool:
	if id < 0 or id >= BLOCKS.size(): return false
	return BLOCKS[id].solid

func color_of(id: int) -> Color:
	if id < 0 or id >= BLOCKS.size(): return Color.WHITE
	return BLOCKS[id].color

func name_of(id: int) -> String:
	if id < 0 or id >= BLOCKS.size(): return "unknown"
	return BLOCKS[id].name
