extends Node
## Global tunables shared by every system.
## Autoloaded as `GameSettings`.

signal paint_color_changed(color: Color)
signal block_changed(block_id: int)

const PAINT_PALETTE: Array[Color] = [
	Color(1.0, 0.15, 0.35),  # red
	Color(0.15, 0.65, 1.0),  # blue
	Color(1.0, 0.85, 0.15),  # yellow
	Color(0.25, 1.0, 0.45),  # green
	Color(0.95, 0.2, 0.95),  # magenta
	Color(1.0, 0.55, 0.1),   # orange
]

var mouse_sensitivity: float = 0.0022
var invert_y: bool = false
var fov_base: float = 80.0
var fov_sprint_bonus: float = 8.0

var current_paint_index: int = 0
var current_block_id: int = 1

func current_paint_color() -> Color:
	return PAINT_PALETTE[current_paint_index]

func cycle_paint() -> void:
	current_paint_index = (current_paint_index + 1) % PAINT_PALETTE.size()
	paint_color_changed.emit(current_paint_color())

func cycle_block() -> void:
	current_block_id = wrapi(current_block_id + 1, 1, BlockDB.block_count() + 1)
	block_changed.emit(current_block_id)

func set_paint(idx: int) -> void:
	if idx < 0 or idx >= PAINT_PALETTE.size(): return
	current_paint_index = idx
	paint_color_changed.emit(current_paint_color())

func set_block(id: int) -> void:
	if id < 1 or id > BlockDB.block_count(): return
	current_block_id = id
	block_changed.emit(current_block_id)
