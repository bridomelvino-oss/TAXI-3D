extends CanvasLayer
## Minimal HUD: crosshair + state readouts.

@onready var _speed_label: Label = $Margin/VBox/Speed
@onready var _state_label: Label = $Margin/VBox/State
@onready var _paint_chip: ColorRect = $Margin/VBox/HBox/PaintChip
@onready var _block_label: Label = $Margin/VBox/HBox/Block

var _player: PlayerController


func bind_player(p: PlayerController) -> void:
	_player = p
	p.speed_changed.connect(_on_speed_changed)
	GameSettings.paint_color_changed.connect(_on_paint_changed)
	GameSettings.block_changed.connect(_on_block_changed)
	_on_paint_changed(GameSettings.current_paint_color())
	_on_block_changed(GameSettings.current_block_id)


func _process(_d: float) -> void:
	if _player == null: return
	var st := "AIR"
	if _player.is_sliding(): st = "SLIDE"
	elif _player.is_sprinting(): st = "SPRINT"
	elif _player.is_on_floor(): st = "GROUND"
	_state_label.text = st


func _on_speed_changed(s: float) -> void:
	_speed_label.text = "%.1f m/s" % s


func _on_paint_changed(c: Color) -> void:
	_paint_chip.color = c


func _on_block_changed(id: int) -> void:
	_block_label.text = "BLOCK: " + BlockDB.name_of(id).to_upper()
