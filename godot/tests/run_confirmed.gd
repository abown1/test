extends SceneTree

var failed := 0

func _init() -> void:
	_gongfa()
	_break_loss()
	_unlocks()
	_ware()
	_elder()
	_rename()
	print("定向失敗 %d" % failed)
	quit(failed)

func check(name: String, ok: bool) -> void:
	if ok:
		print("通過 " + name)
	else:
		failed += 1
		print("失敗 " + name)

func _gongfa() -> void:
	var sim := XWSim.new()
	sim.new_game(1)
	var p := sim.player()
	p["gf"] = {"lieshi": 0}
	p["gf_xp"] = {}
	p["last_combat"] = sim.time
	for _i in 10:
		sim.tick(0.1)
	var xp := float(p["gf_xp"].get("lieshi", 0))
	check("戰鬥每秒約加 3 點", xp > 2.9 and xp < 3.1)
	p["realm"] = 2
	p["gf_xp"] = {}
	p["last_combat"] = sim.time
	for _j in 10:
		sim.tick(0.1)
	var xp2 := float(p["gf_xp"].get("lieshi", 0))
	check("高出兩境再乘 25", xp2 > 74.0 and xp2 < 76.0)

func _break_loss() -> void:
	var sim := XWSim.new()
	sim.new_game(2)
	var p := sim.player()
	p["sub"] = 3
	p["xiu"] = float(XWRules.need_at(0, 3))
	var before := float(p["xiu"])
	sim.force_roll = 0.0
	var r := sim.try_break(int(p["id"]), false)
	check("突破失敗", not bool(r.ok))
	check("修為剩七成", absf(float(p["xiu"]) - floor(before * 0.7)) < 0.01)

func _unlocks() -> void:
	var sim := XWSim.new()
	sim.new_game(3)
	sim.res = {"wood": 500, "stone": 500, "fiber": 200, "food": 200, "iron": 80, "herb": 20, "lingshi": 50}
	check("武徒能蓋食堂", bool(sim.place_building("shitang").ok))
	check("武徒不能蓋功法閣", not bool(sim.place_building("gongfage").ok))
	sim.player()["realm"] = 2
	check("大武師能蓋功法閣", bool(sim.place_building("gongfage").ok))

func _ware() -> void:
	check("倉庫 100 格", XWData.WARE_CAP == 100)
	var sim := XWSim.new()
	sim.new_game(4)
	sim.buildings.append({"id": 1, "type": "cangku", "x": 1, "y": 1, "built": true, "progress": 1, "lv": 1, "hp": 1, "maxhp": 1})
	for i in 100:
		sim.ware.append({"n": "占位", "t": "fill"})
	sim.inv = [{"n": "長劍", "t": "sword"}]
	var put := sim.ware_put(0)
	check("滿 100 不能再入庫", not bool(put.ok) and sim.ware.size() == 100 and sim.inv.size() == 1)

func _elder() -> void:
	var sim := XWSim.new()
	sim.new_game(5)
	sim.res = {"wood": 80, "stone": 40, "fiber": 20, "food": 10, "iron": 10, "herb": 0, "lingshi": 0}
	var elder := sim.debug_add_disciple(18, 22)
	var idle := sim.debug_add_disciple(19, 22)
	var ordered := sim.debug_add_disciple(20, 22)
	var own := sim.debug_add_disciple(21, 22)
	sim.set_post(elder, "長老")
	sim.set_order(ordered, "chop")
	sim.set_order(own, "auto")
	sim.tick(0.2)
	check("長老派了待命的人", str(sim.unit_by_id(idle).order) != "dai")
	check("指定的砍伐沒被改掉", str(sim.unit_by_id(ordered).order) == "chop")
	check("交由弟子指派還在", str(sim.unit_by_id(own).order) == "auto")
	var started := false
	for b in sim.buildings:
		if str(b.type) == "hall":
			started = true
	check("有人開始蓋大殿", started)

func _rename() -> void:
	var raw := {
		"v": 7, "seed": 1, "time": 1,
		"res": {"wood": 1, "stone": 0, "fiber": 0, "food": 0, "iron": 0, "herb": 0, "lingshi": 3},
		"items": {},
		"units": [{"id": 1, "kind": "player", "name": "你", "realm": 0, "eq": {"z": {"tid": "zbt09", "n": "赤霄四劍圖"}}}],
		"buildings": [],
		"inv": [{"tid": "zbt09", "n": "赤霄四劍圖"}, {"n": "長劍", "t": "sword"}],
	}
	var before := JSON.stringify(raw)
	var pack := XWSave.convert_any(raw)
	check("原檔沒被改名", JSON.stringify(raw) == before)
	check("轉入成功", bool(pack.ok))
	var inv: Array = pack.save.inv
	check("舊名換成四鋒束域圖", str(inv[0].n) == "四鋒束域圖" and str(inv[0].old_n) == "赤霄四劍圖")
	check("別的東西還在", str(inv[1].n) == "長劍" and inv.size() == 2)
	check("身上的也改名", str(pack.save.units[0].eq.z.n) == "四鋒束域圖")
	check("原檔備份仍是舊名", str(pack.save.legacy.inv[0].n) == "赤霄四劍圖")
