extends PanelContainer
class_name XWPanel
## 可拖移、改大小、調字級、關閉。捲動只停在內容底，不回彈。

signal closed

var body: VBoxContainer
var scroll: ScrollContainer
var title_label: Label
var _drag := false
var _resize := false
var _drag_off := Vector2.ZERO
var _font: Font

func setup(font: Font, title: String) -> void:
	_font = font
	custom_minimum_size = Vector2(380, 300)
	size = Vector2(460, 520)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var th := Theme.new()
	th.default_font = font
	th.default_font_size = 16
	var panel := StyleBoxFlat.new()
	panel.bg_color = Color("1a140ef8")
	panel.border_color = Color("c8a15a")
	panel.set_border_width_all(1)
	th.set_stylebox("panel", "PanelContainer", panel)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("2a2118")
	normal.set_content_margin_all(4)
	th.set_stylebox("normal", "Button", normal)
	th.set_color("font_color", "Button", Color("fff6dd"))
	th.set_color("font_color", "Label", Color("fff6dd"))
	theme = th
	var root := MarginContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("margin_left", 10)
	root.add_theme_constant_override("margin_right", 10)
	root.add_theme_constant_override("margin_top", 8)
	root.add_theme_constant_override("margin_bottom", 8)
	add_child(root)
	var col := VBoxContainer.new()
	root.add_child(col)
	var bar := HBoxContainer.new()
	col.add_child(bar)
	title_label = Label.new()
	title_label.text = title
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_label.mouse_filter = Control.MOUSE_FILTER_STOP
	title_label.gui_input.connect(_on_title)
	bar.add_child(title_label)
	var close_b := Button.new()
	close_b.text = "關閉"
	close_b.pressed.connect(_close)
	bar.add_child(close_b)
	var scale_row := HBoxContainer.new()
	col.add_child(scale_row)
	var hint := Label.new()
	hint.text = "字級"
	scale_row.add_child(hint)
	var slider := HSlider.new()
	slider.min_value = 14
	slider.max_value = 24
	slider.step = 1
	slider.value = 16
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.value_changed.connect(func(v: float) -> void:
		theme.default_font_size = int(v)
	)
	scale_row.add_child(slider)
	scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.mouse_filter = Control.MOUSE_FILTER_STOP
	col.add_child(scroll)
	body = VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(body)
	var grip := Button.new()
	grip.text = "拖這裡改大小"
	grip.gui_input.connect(_on_grip)
	col.add_child(grip)

func set_title(t: String) -> void:
	if title_label:
		title_label.text = t

func clear_body() -> void:
	if body == null:
		return
	for c in body.get_children():
		c.queue_free()

func _close() -> void:
	closed.emit()
	queue_free()

func _on_title(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		_drag = ev.pressed
		if ev.pressed:
			_drag_off = get_global_mouse_position() - global_position
	elif ev is InputEventMouseMotion and _drag:
		var p := get_global_mouse_position() - _drag_off
		global_position = Vector2(clampf(p.x, 0, 1100), clampf(p.y, 0, 640))

func _on_grip(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		_resize = ev.pressed
	elif ev is InputEventMouseMotion and _resize:
		size = Vector2(maxf(360, size.x + ev.relative.x), maxf(260, size.y + ev.relative.y))
