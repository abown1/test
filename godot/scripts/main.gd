extends Node2D

const TILE := 28.0
const SAVE_KEY := "xianwu_godot_save_v1"

var sim := XWSim.new()
var font: Font
var mode := "title"
var ui: CanvasLayer
var root_ui: Control
var log_label: Label
var res_label: Label
var realm_label: Label
var hp_label: Label
var panels := {}
var selected_kind := ""
var selected_id := -1
var cam := Vector2.ZERO
var running := true
var keys := {}
var import_box: TextEdit
var status_label: Label
var char_lines: Array = []

func _ready() -> void:
	font = load("res://fonts/DroidSubset.ttf")
	ui = CanvasLayer.new()
	add_child(ui)
	root_ui = Control.new()
	root_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_ui.theme = _make_theme(font)
	ui.add_child(root_ui)
	_show_title()

func _process(dt: float) -> void:
	if mode != "play":
		return
	var p := sim.player()
	if running and not p.is_empty():
		var dir := Vector2.ZERO
		if not _typing():
			if _down(KEY_A) or _down(KEY_LEFT):
				dir.x -= 1
			if _down(KEY_D) or _down(KEY_RIGHT):
				dir.x += 1
			if _down(KEY_W) or _down(KEY_UP):
				dir.y -= 1
			if _down(KEY_S) or _down(KEY_DOWN):
				dir.y += 1
		if dir != Vector2.ZERO and not bool(p.get("medit")):
			p["moving"] = true
			p["task"] = {}
			var step := dir.normalized() * float(p.get("speed", 3.0)) * XWData.MOVE_MUL * dt
			p["x"] = clampf(float(p["x"]) + step.x, 1, XWData.MAP_W - 2)
			p["y"] = clampf(float(p["y"]) + step.y, 1, XWData.MAP_H - 2)
		if running:
			sim.tick(dt)
	_refresh_hud()
	queue_redraw()

func _unhandled_input(ev: InputEvent) -> void:
	if mode != "play":
		return
	if ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode == KEY_Z:
			_toast(str(sim.try_meditate(not bool(sim.player().get("medit"))).msg))
		elif ev.keycode == KEY_ESCAPE:
			_close_all_panels()
		elif ev.keycode == KEY_1:
			sim.cast_skill("charge")
		elif ev.keycode == KEY_2:
			sim.cast_skill("sweep")
		elif ev.keycode == KEY_3:
			sim.cast_skill("guard")
		elif ev.keycode == KEY_4:
			sim.cast_skill("fireball")
	if ev is InputEventMouseButton and ev.pressed:
		var world := _screen_to_world(ev.position)
		if ev.button_index == MOUSE_BUTTON_LEFT:
			_select_at(world)
		elif ev.button_index == MOUSE_BUTTON_RIGHT:
			_command_at(world)

func _draw() -> void:
	if mode != "play":
		return
	var view := get_viewport_rect().size
	var p := sim.player()
	if p.is_empty():
		return
	cam = Vector2(float(p.x), float(p.y)) * TILE - view * 0.5 + Vector2(0, 40)
	draw_rect(Rect2(Vector2.ZERO, view), Color("1c2416"))
	for y in XWData.MAP_H:
		for x in XWData.MAP_W:
			var c := Color("3f6a3a")
			if x >= 64:
				c = Color("5a4632")
			elif (x + y) % 2 == 0:
				c = Color("46743f")
			if x < 8 or y < 6 or x > 72 or y > 46:
				c = c.darkened(0.25)
			var rp := Vector2(x, y) * TILE - cam
			if rp.x < -TILE or rp.y < -TILE or rp.x > view.x or rp.y > view.y:
				continue
			draw_rect(Rect2(rp, Vector2(TILE - 1, TILE - 1)), c)
	_mark(Vector2(48, 18), "遺跡", Color("c8b080"))
	_mark(Vector2(22, 30), "石碑", Color("d8d0c0"))
	_mark(Vector2(60, 26), "石碑", Color("d8d0c0"))
	_mark(Vector2(62, 26), "仙凡之門", Color("e0c080"))
	if sim.in_trial:
		_mark(Vector2(74, 30), "撤離陣", Color("9fd0ff"))
	for n in sim.nodes:
		if int(n.amount) <= 0:
			continue
		var col := Color("2d6a32")
		match str(n.type):
			"rock":
				col = Color("9aa4ad")
			"iron":
				col = Color("c4845a")
			"herb":
				col = Color("7dcea0")
			"berry":
				col = Color("d46a6a")
			"vein":
				col = Color("7fd4e8")
			"fiber":
				col = Color("d5e28a")
		_dot(Vector2(float(n.x), float(n.y)), 7, col)
	for b in sim.buildings:
		var col2 := Color("8a6230") if bool(b.built) else Color("5c4630")
		_box(Vector2(float(b.x), float(b.y)), col2)
		var nm := str(XWData.BUILD.get(str(b.type), {}).get("name", "建築"))
		draw_string(font, _world(Vector2(float(b.x), float(b.y))) + Vector2(-20, -16), nm, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("ffe6b0"))
	for e in sim.enemies:
		if float(e.hp) <= 0:
			continue
		_dot(Vector2(float(e.x), float(e.y)), 8, Color("c4453a"))
		draw_string(font, _world(Vector2(float(e.x), float(e.y))) + Vector2(-18, -14), str(XWData.ENEMY[str(e.type)].n), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("ffd0c8"))
	for u in sim.units:
		if bool(u.get("dead")):
			continue
		var colu := Color("f0d090") if str(u.kind) == "player" else Color("d0e4ff")
		_dot(Vector2(float(u.x), float(u.y)), 9, colu)
		var tag := str(u.name)
		if str(u.kind) != "player":
			tag += " " + XWData.order_name(str(u.get("order", "dai")))
		draw_string(font, _world(Vector2(float(u.x), float(u.y))) + Vector2(-24, -16), tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("fff8e8"))

func _make_theme(f: Font) -> Theme:
	var th := Theme.new()
	th.default_font = f
	th.default_font_size = 16
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("2a2118")
	normal.border_color = Color("c8a15a")
	normal.set_border_width_all(1)
	normal.set_content_margin_all(6)
	var hover := normal.duplicate()
	hover.bg_color = Color("4a3820")
	th.set_stylebox("normal", "Button", normal)
	th.set_stylebox("hover", "Button", hover)
	th.set_stylebox("pressed", "Button", hover)
	th.set_stylebox("focus", "Button", hover)
	th.set_color("font_color", "Button", Color("fff6dd"))
	th.set_color("font_hover_color", "Button", Color("fff6dd"))
	th.set_color("font_color", "Label", Color("fff6dd"))
	var panel := StyleBoxFlat.new()
	panel.bg_color = Color("1a140ef2")
	panel.set_content_margin_all(8)
	th.set_stylebox("panel", "PanelContainer", panel)
	return th

func _show_title() -> void:
	mode = "title"
	_clear_ui()
	var box := VBoxContainer.new()
	box.position = Vector2(360, 80)
	box.custom_minimum_size = Vector2(560, 520)
	root_ui.add_child(box)
	var h := Label.new()
	h.text = "仙武之體"
	h.add_theme_font_size_override("font_size", 42)
	box.add_child(h)
	var sub := Label.new()
	sub.text = "單人版　武徒到煉氣\n左鍵查看，右鍵移動。WASD 走路，Z 打坐。"
	box.add_child(sub)
	var name_row := HBoxContainer.new()
	box.add_child(name_row)
	name_row.add_child(_lab("宗主名字"))
	var name_edit := LineEdit.new()
	name_edit.name = "NameEdit"
	name_edit.placeholder_text = "不填就叫「你」"
	name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_row.add_child(name_edit)
	_add_btn(box, "新開局", func() -> void:
		var nm := ""
		var ed := box.get_node_or_null("NameEdit")
		if ed:
			nm = ed.text.strip_edges()
		sim.new_game(randi())
		if nm != "":
			sim.player()["name"] = nm
		_enter_play()
	)
	_add_btn(box, "繼續上次的新版存檔", func() -> void:
		var raw := _read_new_save()
		if raw == "":
			_toast("這個瀏覽器裡還沒有新版存檔。")
			return
		var data = JSON.parse_string(raw)
		if typeof(data) != TYPE_DICTIONARY:
			_toast("新版存檔讀不出來。舊檔沒有被動到。")
			return
		sim.new_game(int(data.get("seed", 1)))
		_restore_new(data)
		_enter_play()
	)
	box.add_child(_lab("轉入舊版存檔（不會改原檔）"))
	import_box = TextEdit.new()
	import_box.custom_minimum_size = Vector2(520, 120)
	import_box.placeholder_text = "把舊版匯出的文字貼在這裡"
	box.add_child(import_box)
	_add_btn(box, "轉入貼上的舊檔", func() -> void:
		var pack := XWSave.convert_text(import_box.text)
		if not pack.get("ok", false):
			_toast(str(pack.get("msg", "沒有轉入")))
			return
		sim.apply_converted(pack)
		_write_new_save()
		_enter_play()
		_toast(str(pack.get("msg")))
	)
	_add_btn(box, "演練一份範例舊檔", func() -> void:
		var sample := FileAccess.get_file_as_string("res://tests/fixture_v7.json")
		var pack := XWSave.convert_text(sample)
		sim.apply_converted(pack)
		_enter_play()
		_open_panel("導入結果", func(body: VBoxContainer) -> void:
			var sm: Dictionary = pack["summary"]
			body.add_child(_lab("轉入後：靈石 %d，木材 %d，弟子 %d，建築 %d，境界 %s，仙凡令 %d，行囊 %d 件。" % [sm.lingshi, sm.wood, sm.disciples, sm.buildings, sm.player_realm_name, sm.xfl, sm.inv]))
			body.add_child(_lab("這些數字應和舊檔一樣。原檔沒有被覆蓋。這次演練用的是內建範例，不是你的正式存檔。"))
		)
	)
	_add_btn(box, "讀瀏覽器裡的舊檔", _scan_old)
	status_label = _lab("")
	box.add_child(status_label)
	_add_btn(box, "規則說明", func() -> void: _open_help())

func _enter_play() -> void:
	mode = "play"
	running = true
	_clear_ui()
	_build_hud()
	queue_redraw()

func _build_hud() -> void:
	var top_bg := PanelContainer.new()
	top_bg.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top_bg.offset_left = 8
	top_bg.offset_top = 6
	top_bg.offset_right = -8
	top_bg.offset_bottom = 48
	root_ui.add_child(top_bg)
	var top := HBoxContainer.new()
	top_bg.add_child(top)
	realm_label = _lab("境界")
	top.add_child(realm_label)
	res_label = _lab("資源")
	res_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(res_label)
	var bottom_bg := PanelContainer.new()
	bottom_bg.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	bottom_bg.offset_left = 8
	bottom_bg.offset_right = -8
	bottom_bg.offset_bottom = -8
	bottom_bg.offset_top = -168
	root_ui.add_child(bottom_bg)
	var bottom := VBoxContainer.new()
	bottom_bg.add_child(bottom)
	log_label = _lab("")
	log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	bottom.add_child(log_label)
	var row := HBoxContainer.new()
	bottom.add_child(row)
	for pair in [["人物", _open_char], ["弟子", _open_disciples], ["建造", _open_build], ["行囊", _open_bag], ["突破", _open_break], ["說明", _open_help]]:
		var b := Button.new()
		b.text = pair[0]
		var cb: Callable = pair[1]
		b.pressed.connect(cb)
		row.add_child(b)
	var row2 := HBoxContainer.new()
	bottom.add_child(row2)
	_add_btn(row2, "打坐", func() -> void: _toast(str(sim.try_meditate(true).msg)))
	_add_btn(row2, "停止打坐", func() -> void: _toast(str(sim.try_meditate(false).msg)))
	_add_btn(row2, "衝鋒", func() -> void: _toast(str(sim.cast_skill("charge").msg)))
	_add_btn(row2, "橫掃", func() -> void: _toast(str(sim.cast_skill("sweep").msg)))
	_add_btn(row2, "氣勁護體", func() -> void: _toast(str(sim.cast_skill("guard").msg)))
	_add_btn(row2, "火球", func() -> void: _toast(str(sim.cast_skill("fireball").msg)))
	_add_btn(row2, "探遺跡", func() -> void:
		var p := sim.player()
		if sim._dist_xy(float(p.x), float(p.y), 48, 18) > 3:
			_toast("走到地圖上寫著「遺跡」的地方再按。")
			return
		_toast(str(sim.explore_ruin().msg))
	)
	_add_btn(row2, "進仙凡之門", func() -> void: _toast(str(sim.enter_trial().msg)))
	_add_btn(row2, "撤離", func() -> void:
		var ask := sim.evacuate(false)
		if ask.get("need_confirm", false):
			_open_panel("撤離確認", func(body: VBoxContainer) -> void:
				body.add_child(_lab("確定從撤離陣離開？身上的東西會帶著走。"))
				_add_btn(body, "確定離開", func() -> void:
					_toast(str(sim.evacuate(true).msg))
					_close_panel("撤離確認")
				)
			)
		else:
			_toast(str(ask.msg))
	)
	_add_btn(row2, "傳回宗門", func() -> void: _toast(str(sim.teleport("sect").msg)))
	_add_btn(row2, "傳到門口", func() -> void: _toast(str(sim.teleport("gate").msg)))
	_add_btn(row2, "存檔", func() -> void:
		_write_new_save()
		_toast("已存成新版。舊版那份沒有被改。")
	)
	_add_btn(row2, "暫停", func() -> void:
		running = not running
		_toast("已暫停。" if not running else "繼續。")
	)
	_add_btn(row2, "回標題", func() -> void:
		_write_new_save()
		_show_title()
	)

func _refresh_hud() -> void:
	if realm_label == null or not is_instance_valid(realm_label):
		return
	var p := sim.player()
	if p.is_empty():
		return
	realm_label.text = "%s　%s・%s" % [str(p.name), XWData.realm_name(int(p.realm)), XWRules.sub_name(int(p.realm), int(p.sub))]
	res_label.text = "木%d 石%d 纖%d 食%d 鐵%d 藥%d 靈石%d" % [res_of("wood"), res_of("stone"), res_of("fiber"), res_of("food"), res_of("iron"), res_of("herb"), res_of("lingshi")]
	log_label.text = "　".join(sim.logs.slice(-3))
	for i in char_lines.size():
		var lb = char_lines[i]
		if lb != null and is_instance_valid(lb):
			lb.text = _char_line(i)

func _char_line(i: int) -> String:
	var p := sim.player()
	var lines := [
		"境界寫在上方。這裡只放會變的數字。",
		"氣血　%d／%d" % [int(p.hp), int(p.maxhp)],
		"攻擊　%s" % str(p.atk),
		"靈力　%d" % int(p.get("qi", 0)),
		"護盾　%s　（靈力的一半。只有這裡寫這個數字。）" % str(snappedf(float(p.get("shield", 0)), 0.1)),
		"修為　%d／%d" % [int(p.xiu), XWRules.need_at(int(p.realm), int(p.sub))],
		"仙緣　%d　（已經不是突破條件）" % int(p.get("xy", 0)),
	]
	var act := "sit" if bool(p.get("medit")) else "natural"
	var inc := sim.time - float(p.get("last_combat", -99)) < 5.0
	var regen := XWRules.regen_per_sec(float(p.maxhp), int(p.realm), act, inc)
	lines.append("現在每秒約回 %.1f 氣血。%s" % [regen, "交戰中只剩兩成。" if inc else "沒在交戰。"])
	return lines[i] if i < lines.size() else ""

func _open_char() -> void:
	char_lines.clear()
	_open_panel("人物", func(body: VBoxContainer) -> void:
		for i in 8:
			var lb := _lab(_char_line(i))
			char_lines.append(lb)
			body.add_child(lb)
		body.add_child(_lab("靈氣護體：打人或被打之後的五秒，自然回血和裝備回血只按兩成算。被打會打斷打坐，三秒內不能再坐。護盾數字不在這段重複。宗師和以下打在護盾上，是攻擊的百分之一，不到 0.1 不算，超過 4 只算 4。宗師以上不設 4 的上限。"))
	)

func _open_disciples() -> void:
	_open_panel("弟子", func(body: VBoxContainer) -> void:
		if sim.disciples().is_empty():
			body.add_child(_lab("還沒有弟子。蓋好大殿和求武台，進求武台招募。"))
		for d in sim.disciples():
			body.add_child(_lab("%s　%s　%s　現在：%s" % [str(d.name), XWData.realm_name(int(d.realm)), XWData.BODIES[int(d.body)].n, str(d.get("doing", ""))]))
			var row := HBoxContainer.new()
			body.add_child(row)
			for pair in XWData.ORDERS:
				var b := Button.new()
				b.text = pair[1]
				if str(d.order) == pair[0]:
					b.modulate = Color("ffd27a")
				var uid := int(d.id)
				var oid := str(pair[0])
				b.pressed.connect(func() -> void:
					var r := sim.set_order(uid, oid)
					_toast(str(r.msg))
					_reopen("弟子")
				)
				row.add_child(b)
			var uid2 := int(d.id)
			_add_btn(body, "兼任守衛（不取消上面的工作）", func() -> void:
				_toast(str(sim.set_duty(uid2, str(sim.unit_by_id(uid2).get("duty")) != "guard").msg))
				_reopen("弟子")
			)
			_add_btn(body, "傳授", func() -> void: _open_teach(uid2))
			_add_btn(body, "任命", func() -> void: _open_post(uid2))
		if sim.disciples().size() >= 2:
			_add_btn(body, "切磋", _open_spar)
		_add_btn(body, "打開求武台招募", func() -> void:
			var altar := _find_type("altar")
			if altar < 0:
				_toast("要先蓋好求武台。")
				return
			var ent := sim.enter_building(altar)
			_toast(str(ent.msg))
			if ent.ok:
				_open_recruit()
		)
	)

func _open_teach(uid: int) -> void:
	_open_panel("傳授", func(body: VBoxContainer) -> void:
		var opts: Array = sim.teach_options()
		if opts.is_empty():
			body.add_child(_lab("還沒有可以傳的功法。走到遺跡拿走秘籍，或派弟子在長書閣研究。這裡不是空白選單，只是你還沒學會。"))
			return
		for o in opts:
			var gid := str(o.id)
			_add_btn(body, "%s（%s）" % [str(o.n), str(o.stage)], func() -> void:
				_toast(str(sim.teach(uid, gid).msg))
			)
			body.add_child(_lab(str(o.desc)))
	)

func _open_post(uid: int) -> void:
	_open_panel("任命", func(body: VBoxContainer) -> void:
		body.add_child(_lab("執法要有執法堂，外事要有外事堂，長老最多三人。"))
		for post in ["雜役", "外門", "內門", "外事", "執法", "長老"]:
			var post_name: String = str(post)
			_add_btn(body, post_name, func() -> void:
				_toast(str(sim.set_post(uid, post_name).msg))
			)
	)

func _open_spar() -> void:
	_open_panel("切磋", func(body: VBoxContainer) -> void:
		var st := sim.spar_state()
		if not st.is_empty():
			body.add_child(_lab("已經有人在切磋。"))
			_add_btn(body, "停止這場", func() -> void:
				_toast(str(sim.stop_spar().msg))
				_reopen("切磋")
			)
			return
		body.add_child(_lab("選兩名弟子。比武台要先蓋好，大武師才解鎖。"))
		var ids: Array = []
		for d in sim.disciples():
			var id := int(d.id)
			var b := CheckBox.new()
			b.text = str(d.name)
			b.pressed.connect(func() -> void:
				if b.button_pressed:
					ids.append(id)
				else:
					ids.erase(id)
			)
			body.add_child(b)
		_add_btn(body, "開始", func() -> void:
			if ids.size() < 2:
				_toast("要勾兩個人。")
				return
			_toast(str(sim.start_spar(int(ids[0]), int(ids[1])).msg))
			_reopen("切磋")
		)
	)

func _open_build() -> void:
	_open_panel("建造", func(body: VBoxContainer) -> void:
		body.add_child(_lab("外面只負責蓋、升級、修理、拆除。鍛造煉丹這些要進室內。"))
		for ty in XWData.BUILD_ORDER:
			var info: Dictionary = XWData.BUILD[ty]
			var un := sim.unlocked(ty)
			var text := "%s　%s" % [str(info.name), "可以蓋" if un.ok else str(un.msg)]
			body.add_child(_lab(text))
			body.add_child(_lab(str(info.desc)))
			var key: String = str(ty)
			_add_btn(body, "蓋" + str(info.name), func() -> void:
				_toast(str(sim.place_building(key).msg))
				_reopen("建造")
			)
	)

func _open_bag() -> void:
	_open_panel("行囊與倉庫", func(body: VBoxContainer) -> void:
		body.add_child(_lab("行囊 %d／%d。倉庫 %d／%d。倉庫是 100 格。" % [sim.inv.size(), XWData.INV_CAP, sim.ware.size(), XWData.WARE_CAP]))
		body.add_child(_lab(sim.prof_text("forge")))
		body.add_child(_lab(sim.prof_text("pill")))
		body.add_child(_lab(sim.prof_text("craft")))
		body.add_child(_lab(sim.prof_text("array")))
		var i := 0
		for it in sim.inv:
			var idx := i
			_add_btn(body, "入庫　" + sim._item_name(it), func() -> void:
				_toast(str(sim.ware_put(idx).msg))
				_reopen("行囊與倉庫")
			)
			i += 1
		var j := 0
		for it2 in sim.ware:
			var idx2 := j
			_add_btn(body, "領出　" + sim._item_name(it2), func() -> void:
				_toast(str(sim.ware_take(idx2).msg))
				_reopen("行囊與倉庫")
			)
			j += 1
		if sim.inv.is_empty() and sim.ware.is_empty():
			body.add_child(_lab("目前沒有裝備。"))
	)

func _open_break() -> void:
	_open_panel("突破", func(body: VBoxContainer) -> void:
		var p := sim.player()
		for ln in sim.break_lines(p):
			body.add_child(_lab(("可以。　" if ln.ok else "還不行。　") + str(ln.t)))
		body.add_child(_lab("失敗會掉三成修為，氣血剩一半。成功率照現行表，再扣悟性、氣運和仙武之體。"))
		_add_btn(body, "嘗試突破", func() -> void:
			_toast(str(sim.try_break(int(p.id), false).msg))
			_reopen("突破")
		)
	)

func _open_help() -> void:
	_open_panel("說明", func(body: VBoxContainer) -> void:
		var text := """這扇窗可以拖標題列移動，拖最下面改大小，字級拉桿會把字放大。關掉不會把別的窗一起關掉。

人物的氣血、攻擊、靈力、護盾、修為，只出現在「人物」。這裡講規則，不重複那些數字。

打人或被打後的五秒是交戰。交戰時自然回血和裝備回血只剩兩成。超過五秒沒交手就恢復。每秒回血有上限：交戰不超過氣血的 3.5%，脫戰不超過 12%。

打坐被打到會起來，三秒內不能立刻再坐。

弟子的指令選定後就保持，不會自己跳回待命。倉庫滿的時候，換集會裝東西的工作會被拒絕，畫面上仍是原來的工作。

有長老時，待命的弟子會被長老派去做事。「交由弟子指派」仍然可以自己決定，兩種一起生效。已經指定的工作不會被長老改掉。守衛可以跟別的工作一起掛著：沒有敵人就做原工作，敵人靠近才迎戰，打完回到原工作。追擊最遠 20 格。

戰鬥和狩獵是兩件事。狩獵打的是野獸，為了獸皮。

傳授會列出你已經會的功法。一門都沒有時，會告訴你去哪裡學，不是空白。切磋若已有人在打，會寫出是誰，並讓你停止。

寄賣和藥草買賣在外事堂裡面，宗師才解鎖。藥草單價 5，賣出先扣 15% 外事稅。

功法九個階段，經驗 100 起、每階乘 3。境界每高出功法一境，速度乘 5。大殿每一級再加 3%。戰鬥中每秒先加 3 點，再乘這兩個加成。沒在打架時，參悟仍先按每秒 1 點，這個 1 還沒另外定過。

鍛造、煉丹、匠人熟練也是 100 起、每級乘 3、最多 100 級。每完成一件先記 10 點，這個點數還沒定案。

舊存檔轉進來之後，靈石、物品、弟子、建築、境界會照舊檔。新版另存一把鑰匙，不覆蓋舊的。"""
		for line in text.split("\n"):
			body.add_child(_lab(line))
	)

func _open_building(bid: int) -> void:
	var b := sim.building_by_id(bid)
	if b.is_empty():
		return
	var title := str(XWData.BUILD.get(str(b.type), {}).get("name", "建築"))
	_open_panel("建築", func(body: VBoxContainer) -> void:
		body.add_child(_lab(str(XWData.BUILD.get(str(b.type), {}).get("desc", ""))))
		body.add_child(_lab("等級 %d　耐久 %d／%d　%s" % [int(b.get("lv", 1)), int(b.get("hp", 0)), int(b.get("maxhp", 0)), "已落成" if bool(b.built) else "施工中"]))
		if str(b.type) == "hall":
			body.add_child(_lab("功法參悟：現在每一級加快 3%%，這棟是 %d 級，所以加快 %d%%。十級是 30%%，四級以上的材料還沒定。" % [int(b.get("lv", 1)), int(b.get("lv", 1)) * 3]))
		_add_btn(body, "進入", func() -> void:
			var r := sim.enter_building(bid)
			_toast(str(r.msg))
			if r.ok:
				_open_interior()
		)
		_add_btn(body, "修理", func() -> void: _toast(str(sim.repair_building(bid).msg)))
		_add_btn(body, "升級", func() -> void:
			_toast(str(sim.upgrade_building(bid).msg))
			_reopen("建築")
		)
		_add_btn(body, "拆除", func() -> void:
			_toast(str(sim.demolish_building(bid).msg))
			_close_panel("建築")
		)
		_add_btn(body, "設為守衛點", func() -> void:
			_toast("弟子若兼任守衛，會保護宗門這一帶。這顆按鈕只是說明守衛點在宗門中心，沒有另外藏一組數字。")
		)
	)

func _open_interior() -> void:
	var ty := sim.interior_type()
	_open_panel("室內", func(body: VBoxContainer) -> void:
		body.add_child(_lab("你在%s裡面。左鍵是查看，右鍵是移動。功能在這裡用。" % str(XWData.BUILD.get(ty, {}).get("name", ""))))
		_add_btn(body, "離開建築", func() -> void:
			sim.leave_building()
			_close_panel("室內")
		)
		if ty == "altar":
			_open_recruit_into(body)
		elif ty == "forge":
			_forge_into(body)
		elif ty == "alchemy":
			_pill_into(body)
		elif ty == "library" or ty == "gongfage":
			body.add_child(_lab("派弟子「研究」或「在功法閣傳授」。宗主自己學不扣靈石。"))
			_add_btn(body, "在這裡打坐參悟", func() -> void: _toast(str(sim.try_meditate(true).msg)))
		elif ty == "wudao" or ty == "lianwu":
			_add_btn(body, "在這裡打坐", func() -> void: _toast(str(sim.try_meditate(true).msg)))
		elif ty == "waishitang":
			_add_btn(body, "買 1 株藥草", func() -> void: _toast(str(sim.shop_herb(true, 1).msg)))
			_add_btn(body, "賣 1 株藥草", func() -> void: _toast(str(sim.shop_herb(false, 1).msg)))
			_add_btn(body, "把行囊第一件寄賣，標價 10", func() -> void:
				if sim.inv.is_empty():
					_toast("行囊是空的。")
					return
				_toast(str(sim.consign_put(false, 0, 10).msg))
			)
		elif ty == "renwutang":
			body.add_child(_lab("任務板只在任務堂。現在這塊板記錄：把大殿蓋起來、收下第一名弟子、自己突破煉氣。獎勵數字很多還沒對過，完成時只記入日誌，不另發一筆沒定過的靈石。"))
		elif ty == "biwutai":
			_add_btn(body, "打開切磋名單", _open_spar)
		elif ty == "cangku":
			_add_btn(body, "打開倉庫", _open_bag)
		else:
			body.add_child(_lab("這棟目前沒有額外操作。"))
	)

func _open_recruit() -> void:
	_open_panel("招募", func(body: VBoxContainer) -> void:
		_open_recruit_into(body)
	)

func _open_recruit_into(body: VBoxContainer) -> void:
	body.add_child(_lab("招募要食物 %d，弟子上限現在 %d，已有 %d 人。" % [XWData.RECRUIT_COST, sim.pop_cap(), sim.disciple_count()]))
	_add_btn(body, "感應有緣人", func() -> void:
		_toast(str(sim.start_recruit().msg))
	)
	if bool(sim.recruit.get("ready", false)):
		var idx := 0
		for c in sim.recruit.get("cands", []):
			var i := idx
			_add_btn(body, "收下 %s（%s・%s）" % [str(c.name), XWData.BODIES[int(c.body)].n, XWData.realm_name(int(c.realm))], func() -> void:
				_toast(str(sim.take_recruit(i).msg))
				_reopen("招募")
			)
			idx += 1

func _forge_into(body: VBoxContainer) -> void:
	body.add_child(_lab("數量沒有上限。宗師和以下做不出靈器，也不能付靈石保底。品級看你選的裝備境界。基礎數值不乘 0.75 到 1.25。"))
	var realm := int(sim.player().realm)
	for id in XWData.GEAR.keys():
		var g: Dictionary = XWData.GEAR[id]
		if int(g.realm) > realm:
			body.add_child(_lab("%s要到%s才出現在清單上。" % [str(g.n), XWData.realm_name(int(g.realm))]))
			continue
		var gid := str(id)
		_add_btn(body, "做 1 把" + str(g.n), func() -> void:
			_toast(str(sim.queue_gear(gid, mini(realm, maxi(int(g.realm), realm)), 1).msg))
		)

func _pill_into(body: VBoxContainer) -> void:
	body.add_child(_lab("這版先出下品。連吃聚氣丹會累丹毒。"))
	for id in XWData.PILLS.keys():
		var p: Dictionary = XWData.PILLS[id]
		var pid := str(id)
		body.add_child(_lab(str(p.n) + "　" + str(p.desc)))
		_add_btn(body, "煉" + str(p.n), func() -> void: _toast(str(sim.queue_pill(pid).msg)))
		_add_btn(body, "服用" + str(p.n), func() -> void: _toast(str(sim.use_pill(pid, int(sim.player().id)).msg)))

func _select_at(world: Vector2) -> void:
	var best := 1.3
	selected_kind = ""
	for u in sim.units:
		var d := world.distance_to(Vector2(float(u.x), float(u.y)))
		if d < best:
			best = d
			selected_kind = "unit"
			selected_id = int(u.id)
	for b in sim.buildings:
		var d2 := world.distance_to(Vector2(float(b.x), float(b.y)))
		if d2 < best:
			best = d2
			selected_kind = "building"
			selected_id = int(b.id)
	for e in sim.enemies:
		if float(e.hp) <= 0:
			continue
		var d3 := world.distance_to(Vector2(float(e.x), float(e.y)))
		if d3 < best:
			best = d3
			selected_kind = "enemy"
			selected_id = int(e.id)
	if selected_kind == "building":
		_open_building(selected_id)
	elif selected_kind == "unit":
		var u := sim.unit_by_id(selected_id)
		if str(u.get("kind")) == "player":
			_open_char()
		else:
			_open_disciples()
	elif selected_kind == "enemy":
		var e := sim.enemy_by_id(selected_id)
		_open_panel("敵人", func(body: VBoxContainer) -> void:
			body.add_child(_lab("%s　氣血 %d／%d　攻擊 %s" % [str(XWData.ENEMY[str(e.type)].n), int(e.hp), int(e.maxhp), str(e.atk)]))
			if float(e.get("shield", 0)) > 0:
				body.add_child(_lab("這隻的護盾是煉氣靈力的一半，數值和人物欄的演算法相同，但是屬於這隻首領。"))
			body.add_child(_lab("個體回血會再少 %.2f%%，只減不加。" % (float(e.weaken) * 100.0)))
		)

func _command_at(world: Vector2) -> void:
	for e in sim.enemies:
		if float(e.hp) <= 0:
			continue
		if world.distance_to(Vector2(float(e.x), float(e.y))) < 1.2:
			_toast(str(sim.player_attack(int(e.id)).msg))
			return
	for n in sim.nodes:
		if int(n.amount) <= 0:
			continue
		if world.distance_to(Vector2(float(n.x), float(n.y))) < 1.2:
			_toast(str(sim.player_gather(int(n.id)).msg))
			return
	if sim.in_trial and world.distance_to(Vector2(74, 30)) < 1.6:
		_toast(str(sim.evacuate(false).msg))
		_open_panel("撤離確認", func(body: VBoxContainer) -> void:
			body.add_child(_lab("確定離開仙凡之門？"))
			_add_btn(body, "確定離開", func() -> void:
				_toast(str(sim.evacuate(true).msg))
				_close_panel("撤離確認")
			)
		)
		return
	var p := sim.player()
	p["task"] = {}
	p["medit"] = false
	p["goal_x"] = world.x
	p["goal_y"] = world.y
	sim.move_player_toward(world.x, world.y, 0.0)

func _open_panel(title: String, builder: Callable) -> void:
	_close_panel(title)
	var p := XWPanel.new()
	p.setup(font, title)
	root_ui.add_child(p)
	p.position = Vector2(160 + panels.size() * 28, 48)
	builder.call(p.body)
	panels[title] = p
	p.closed.connect(func() -> void:
		panels.erase(title)
		if title == "人物":
			char_lines.clear()
	)

func _reopen(title: String) -> void:
	if title == "弟子":
		_open_disciples()
	elif title == "建造":
		_open_build()
	elif title == "行囊與倉庫":
		_open_bag()
	elif title == "突破":
		_open_break()
	elif title == "切磋":
		_open_spar()
	elif title == "招募":
		_open_recruit()
	elif title == "建築" and selected_kind == "building":
		_open_building(selected_id)

func _close_panel(title: String) -> void:
	if panels.has(title) and is_instance_valid(panels[title]):
		panels[title].queue_free()
	panels.erase(title)

func _close_all_panels() -> void:
	for k in panels.keys():
		_close_panel(k)
	char_lines.clear()

func _clear_ui() -> void:
	char_lines.clear()
	panels.clear()
	for c in root_ui.get_children():
		c.queue_free()

func _add_btn(parent: Node, text: String, cb: Callable) -> void:
	var b := Button.new()
	b.text = text
	b.pressed.connect(cb)
	parent.add_child(b)

func _lab(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(340, 0)
	return l

func _toast(t: String) -> void:
	if t != "":
		sim.say(t)

func res_of(k: String) -> int:
	return int(sim.res.get(k, 0))

func _find_type(ty: String) -> int:
	for b in sim.buildings:
		if str(b.type) == ty and bool(b.built):
			return int(b.id)
	return -1

func _down(code: Key) -> bool:
	return Input.is_key_pressed(code)

func _typing() -> bool:
	var f := get_viewport().gui_get_focus_owner()
	return f is LineEdit or f is TextEdit

func _screen_to_world(screen: Vector2) -> Vector2:
	return (screen + cam) / TILE

func _world(cell: Vector2) -> Vector2:
	return cell * TILE - cam

func _dot(cell: Vector2, rad: float, col: Color) -> void:
	draw_circle(_world(cell) + Vector2(TILE * 0.5, TILE * 0.5), rad, col)

func _box(cell: Vector2, col: Color) -> void:
	draw_rect(Rect2(_world(cell), Vector2(TILE * 1.4, TILE * 1.2)), col)

func _mark(cell: Vector2, text: String, col: Color) -> void:
	draw_rect(Rect2(_world(cell), Vector2(TILE, TILE)), col)
	draw_string(font, _world(cell) + Vector2(0, -4), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("fff6d8"))

func _write_new_save() -> void:
	var text := JSON.stringify(sim.snapshot())
	if OS.has_feature("web"):
		JavaScriptBridge.eval("localStorage.setItem(%s, %s);" % [JSON.stringify(SAVE_KEY), JSON.stringify(text)], true)
	else:
		var path := "user://xianwu_godot_save_v1.json"
		var f := FileAccess.open(path, FileAccess.WRITE)
		if f:
			f.store_string(text)

func _read_new_save() -> String:
	if OS.has_feature("web"):
		var v = JavaScriptBridge.eval("localStorage.getItem(%s) || ''" % JSON.stringify(SAVE_KEY), true)
		return str(v)
	var path := "user://xianwu_godot_save_v1.json"
	if not FileAccess.file_exists(path):
		return ""
	return FileAccess.get_file_as_string(path)

func _restore_new(data: Dictionary) -> void:
	sim.res = data.get("res", sim.res)
	sim.items = data.get("items", sim.items)
	sim.mats = data.get("mats", sim.mats)
	sim.pills = data.get("pills", sim.pills)
	sim.inv = data.get("inv", [])
	sim.ware = data.get("ware", [])
	sim.units = data.get("units", sim.units)
	sim.buildings = data.get("buildings", sim.buildings)
	sim.time = float(data.get("time", 0))
	sim.seed = int(data.get("seed", sim.seed))

func _scan_old() -> void:
	if not OS.has_feature("web"):
		if status_label:
			status_label.text = "現在不是網頁版。請把舊檔文字貼上，或用演練按鈕看轉入結果。"
		return
	JavaScriptBridge.eval("""
		(function(){
			var out = {ls:{}};
			try {
				['xianwu_demo_save_v3','xianwu_demo_save_v1'].forEach(function(k){
					var v = localStorage.getItem(k);
					if (v) out.ls[k] = v;
				});
				for (var i=0;i<localStorage.length;i++){
					var k = localStorage.key(i);
					if (k && k.indexOf('xianwu_slot_')===0 && k.indexOf('_tmp')<0) out.ls[k] = localStorage.getItem(k);
				}
			} catch(e) {}
			window.__xwOld = JSON.stringify(out);
		})();
	""", true)
	var raw = str(JavaScriptBridge.eval("window.__xwOld || ''", true))
	var data = JSON.parse_string(raw)
	if typeof(data) != TYPE_DICTIONARY:
		_toast("沒有讀到舊檔。")
		return
	var ls: Dictionary = data.get("ls", {})
	if ls.is_empty():
		_toast("這個瀏覽器沒有舊版仙武存檔。")
		return
	var key := str(ls.keys()[0])
	var before := str(ls[key])
	var pack := XWSave.convert_text(before)
	if not pack.get("ok", false):
		_toast(str(pack.get("msg")))
		return
	var still = str(JavaScriptBridge.eval("localStorage.getItem(%s)" % JSON.stringify(key), true))
	if still != before:
		_toast("為了安全，這次沒有轉入。")
		return
	sim.apply_converted(pack)
	_write_new_save()
	_enter_play()
	_toast("已從瀏覽器舊檔轉入。原鑰匙 %s 的內容長度仍是 %d。" % [key, still.length()])
