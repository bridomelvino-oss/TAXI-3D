extends CanvasLayer
## HUD: crosshair, speed/state readouts, block hot-bar, paint palette, tag counter.

@onready var _speed_label: Label = $TopRight/V/Speed
@onready var _state_label: Label = $TopRight/V/State
@onready var _tag_label: Label = $TopRight/V/Tags
@onready var _block_label: Label = $Bottom/V/BlockLabel
@onready var _block_bar: HBoxContainer = $Bottom/V/BlockBar
@onready var _paint_bar: HBoxContainer = $Bottom/V/PaintBar
@onready var _crosshair_dot: ColorRect = $Crosshair/Dot
@onready var _crosshair_h1: ColorRect = $Crosshair/H1
@onready var _crosshair_h2: ColorRect = $Crosshair/H2
@onready var _crosshair_v1: ColorRect = $Crosshair/V1
@onready var _crosshair_v2: ColorRect = $Crosshair/V2
@onready var _hit_flash: ColorRect = $HitFlash

var _player: PlayerController
var _block_slots: Array[Control] = []
var _paint_slots: Array[ColorRect] = []
var _flash_timer := 0.0


func _ready() -> void:
	_build_block_bar()
	_build_paint_bar()
	GameSettings.paint_color_changed.connect(_on_paint_changed)
	GameSettings.block_changed.connect(_on_block_changed)
	_on_paint_changed(GameSettings.current_paint_color())
	_on_block_changed(GameSettings.current_block_id)
	_hit_flash.color = Color(1, 0, 0, 0)


func bind_player(p: PlayerController) -> void:
	_player = p
	p.speed_changed.connect(_on_speed_changed)
	p.tagged.connect(_on_self_tagged)
	p.respawned.connect(_on_respawned)


func _process(delta: float) -> void:
	if _player == null: return
	var st := "AIR"
	if _player.is_sliding(): st = "SLIDE"
	elif _player.is_sprinting(): st = "SPRINT"
	elif _player.is_on_floor(): st = "GROUND"
	_state_label.text = st
	_tag_label.text = "TAGS: %d" % _player.tag_count

	if _flash_timer > 0.0:
		_flash_timer = maxf(_flash_timer - delta, 0.0)
		_hit_flash.color.a = _flash_timer * 0.6


func _build_block_bar() -> void:
	for i in BlockDB.block_count():
		var id := i + 1
		var slot := ColorRect.new()
		slot.custom_minimum_size = Vector2(36, 36)
		slot.color = BlockDB.color_of(id)
		var label := Label.new()
		label.text = str(id)
		label.add_theme_font_size_override("font_size", 10)
		label.position = Vector2(3, 1)
		label.add_theme_color_override("font_color", Color(0, 0, 0, 0.85))
		slot.add_child(label)
		_block_bar.add_child(slot)
		_block_slots.append(slot)


func _build_paint_bar() -> void:
	for c in GameSettings.PAINT_PALETTE:
		var chip := ColorRect.new()
		chip.color = c
		chip.custom_minimum_size = Vector2(28, 18)
		_paint_bar.add_child(chip)
		_paint_slots.append(chip)


func _on_speed_changed(s: float) -> void:
	_speed_label.text = "%.1f m/s" % s


func _on_paint_changed(c: Color) -> void:
	_crosshair_dot.color = c
	_crosshair_h1.color = c
	_crosshair_h2.color = c
	_crosshair_v1.color = c
	_crosshair_v2.color = c
	for i in _paint_slots.size():
		_paint_slots[i].modulate.a = 1.0 if i == GameSettings.current_paint_index else 0.45


func _on_block_changed(id: int) -> void:
	_block_label.text = "BLOCK: %s" % BlockDB.name_of(id).to_upper()
	for i in _block_slots.size():
		_block_slots[i].modulate.a = 1.0 if (i + 1) == id else 0.45


func _on_self_tagged(color: Color) -> void:
	_hit_flash.color = Color(color.r, color.g, color.b, 0.6)
	_flash_timer = 0.8


func _on_respawned() -> void:
	_flash_timer = 0.0
	_hit_flash.color.a = 0.0
