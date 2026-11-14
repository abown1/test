extends SceneTree

var failed := 0

func _init() -> void:
	_run()
	quit(failed)

func _run() -> void:
	check("雜湊", XWSave.hash_str('{"v":7}') == "79a7652a")
	check("雜湊中文", XWSave.hash_str("仙武") == "dd824d76")
	check("武徒初期修為", XWRules.need_at(0, 0) == 46)
	check("武徒中期修為", XWRules.need_at(0, 1) == 77)
	check("武徒後期修為", XWRules.need_at(0, 2) == 93)
	check("煉氣一層修為", XWRules.need_at(4, 0) == 348)
	check("煉氣大圓滿修為", XWRules.need_at(4, 9) == 2088)
	check("金丹一層修為", XWRules.need_at(6, 0) == 2166)
	var st := XWRules.stats_for(0, 0, 1.0, 30)
	check("武徒中值氣血", int(st.hp) == 3600)
	check("武徒中值攻擊", is_equal_approx(float(st.atk), 30.0))
	var regen_out := XWRules.regen_per_sec(3600, 0, "natural", false)
	var regen_in := XWRules.regen_per_sec(3600, 0, "natural", true)
	check("脫戰回血", is_equal_approx(regen_out, 90.0))
	check("交戰回血兩成", is_equal_approx(regen_in, 18.0))
	check("護盾等於靈力一半", is_equal_approx(XWRules.shield_max(300), 150.0))
	check("護盾傷害下限", is_equal_approx(XWRules.shield_hit(9, 0), 0.0))
	check("護盾傷害原值", is_equal_approx(XWRules.shield_hit(270, 3), 2.7))
	check("宗師以下護盾上限", is_equal_approx(XWRules.shield_hit(500, 3), 4.0))
	check("宗師以上不封頂", is_equal_approx(XWRules.shield_hit(500, 4), 5.0))
	check("壓制上限", is_equal_approx(XWRules.dmg_mul(5, 0), 1.1))
	check("壓制下限", is_equal_approx(XWRules.dmg_mul(0, 5), 0.9))
	check("功法第一階", XWRules.gongfa_need(0) == 100)
	check("功法高出兩境", is_equal_approx(XWRules.gongfa_mul(2, 0, 0), 25.0))
	check("大殿十級再乘", is_equal_approx(XWRules.gongfa_mul(2, 0, 10), 25.0 * 1.3))
	check("熟練第一級", XWRules.prof_need(0) == 100)
	check("熟練第二級", XWRules.prof_need(1) == 300)
	check("熟練封頂", XWRules.prof_need(100) == 0)
	_test_save()
	_test_orders()
	_test_combat_sit()
	_test_campaign()
	print("失敗 %d" % failed)

func check(name: String, ok: bool) -> void:
	if ok:
		print("通過 " + name)
	else:
		failed += 1
		print("失敗 " + name)

func _test_save() -> void:
	var raw := {
		"v": 7, "seed": 99, "time": 4000,
		"res": {"wood": 12, "stone": 7, "fiber": 3, "food": 9, "iron": 4, "herb": 2, "lingshi": 88},
		"items": {"miji": 1, "gongfa": 2, "xfl": 1},
		"mats": {"hide": 5, "bone": 1, "core": 0, "lingzhi": 1, "xuantie": 0},
		"buildings": [
			{"id": 10, "type": "hall", "x": 18, "y": 22, "lv": 2, "hp": 900, "maxhp": 1120, "built": true},
			{"id": 11, "type": "altar", "x": 24, "y": 22, "lv": 1, "hp": 400, "maxhp": 400, "built": true},
		],
		"units": [
			{"id": 1, "kind": "player", "name": "你", "realm": 3, "sub": 3, "xiu": 835, "hp": 8400, "maxhp": 8400, "atk": 270, "body": 6},
			{"id": 2, "kind": "disciple", "name": "林清風", "realm": 1, "sub": 2, "xiu": 10, "hp": 5000, "maxhp": 5500, "atk": 100, "body": 1, "job": "chop"},
		],
		"inv": [{"id": 3, "t": "sword", "n": "長劍", "q": 2}],
	}
	var before := JSON.stringify(raw)
	var pack := XWSave.convert_any(raw)
	var after := JSON.stringify(raw)
	check("原檔沒被改", before == after)
	check("轉入成功", bool(pack.get("ok")))
	var sm: Dictionary = pack["summary"]
	check("靈石一致", int(sm.lingshi) == 88)
	check("弟子一致", int(sm.disciples) == 1)
	check("建築一致", int(sm.buildings) == 2)
	check("境界一致", str(sm.player_realm_name) == "宗師")
	check("仙凡令一致", int(sm.xfl) == 1)
	check("行囊一致", int(sm.inv) == 1)
	var bad := XWSave.convert_any({"fmt": 1, "meta": {"name": "壞"}, "data": "{\"v\":7}", "sum": "000"})
	check("壞檢查碼不轉入", not bool(bad.get("ok")))
	var sim := XWSim.new()
	var applied := sim.apply_converted(pack)
	check("轉入後能進遊戲", bool(applied.get("ok")))
	check("轉入後靈石還在", int(sim.res.lingshi) == 88)
	check("轉入後氣血沿用舊檔", int(sim.player().maxhp) == 8400)
	var dname := ""
	for u in sim.units:
		if str(u.kind) == "disciple":
			dname = str(u.name)
	check("弟子名字還在", dname == "林清風")

func _test_orders() -> void:
	var sim := XWSim.new()
	sim.new_game(3)
	var a := sim.debug_add_disciple(18.2, 22.4)
	var b := sim.debug_add_disciple(18.2, 22.4)
	var r := sim.set_order(a, "chop")
	check("指派有回覆", bool(r.ok))
	for _i in 40:
		sim.tick(0.1)
	check("指令不會自己跳回待命", str(sim.unit_by_id(a).order) == "chop")
	var dx: float = float(sim.unit_by_id(a).x) - float(sim.unit_by_id(b).x)
	var dy: float = float(sim.unit_by_id(a).y) - float(sim.unit_by_id(b).y)
	check("兩人不疊在同一點", dx * dx + dy * dy > 0.05)
	sim.res.wood = 80
	sim.res.stone = 80
	sim.res.fiber = 40
	sim.res.food = 40
	sim.res.iron = 40
	sim.set_order(a, "auto")
	for _j in 30:
		sim.tick(0.2)
	var started := false
	for bd in sim.buildings:
		if str(bd.type) == "hall":
			started = true
	check("交由弟子指派會開始蓋大殿", started)
	sim.set_duty(a, true)
	sim.set_order(a, "chop")
	for e in sim.enemies:
		e.x = 22.5
		e.y = 26.5
		e.hp = 30
		break
	sim.tick(0.5)
	check("守衛迎敵時原工作還在", str(sim.unit_by_id(a).order) == "chop")
	check("守衛時狀態寫迎敵", str(sim.unit_by_id(a).doing).find("迎敵") >= 0 or str(sim.unit_by_id(a).doing).find("戰鬥") >= 0)
	sim.debug_fill_bags()
	var before_order := str(sim.unit_by_id(b).order)
	var denied := sim.set_order(b, "hunt")
	check("倉庫滿了不假裝換工作", not bool(denied.ok) and str(sim.unit_by_id(b).order) == before_order)
	var opts := sim.teach_options()
	sim.explore_ruin()
	opts = sim.teach_options()
	check("傳授有功法可選", opts.size() > 0)
	var taught := sim.teach(b, "lieshi")
	check("傳授點了會生效", bool(taught.ok))
	sim.buildings.append({
		"id": 900, "type": "biwutai", "x": 36, "y": 30, "lv": 1, "hp": 500, "maxhp": 500,
		"built": true, "progress": 1.0,
	})
	sim.player().realm = 2
	var sp := sim.start_spar(a, b)
	check("切磋可以開始", bool(sp.ok))
	var again := sim.start_spar(a, b)
	check("已經在切磋時說出是誰", not bool(again.ok) and str(again.msg).find("停止") >= 0)
	sim.stop_spar()
	sim.buildings.append({
		"id": 901, "type": "cangku", "x": 32, "y": 34, "built": true, "progress": 1.0, "lv": 1, "hp": 1, "maxhp": 1,
	})
	sim.ware.clear()
	sim.inv = [{"n": "長劍", "t": "sword"}]
	var put := sim.ware_put(0)
	check("入庫有作用", bool(put.ok) and sim.inv.is_empty() and sim.ware.size() == 1)
	var take := sim.ware_take(0)
	check("可領有作用", bool(take.ok) and sim.inv.size() == 1)
	sim.buildings.append({
		"id": 902, "type": "waishitang", "x": 14, "y": 34, "built": true, "progress": 1.0, "lv": 1, "hp": 1, "maxhp": 1,
	})
	sim.player().realm = 3
	sim.res.lingshi = 20
	var shop := sim.shop_herb(true, 1)
	check("藥草買賣有作用", bool(shop.ok) and int(sim.res.herb) == 1)
	sim.inv = [{"n": "長劍", "t": "sword"}]
	var cs := sim.consign_put(false, 0, 12)
	check("寄賣上架有作用", bool(cs.ok) and sim.consign.size() == 1)

func _test_combat_sit() -> void:
	var sim := XWSim.new()
	sim.new_game(5)
	var id := sim.debug_add_disciple(30, 30)
	sim.set_order(id, "sit")
	sim.tick(0.5)
	check("會打坐", bool(sim.unit_by_id(id).medit))
	sim.meditate_disciple_hit(id, 10)
	check("被打中斷打坐", not bool(sim.unit_by_id(id).medit))
	check("三秒內不能再坐", float(sim.unit_by_id(id).med_cd) > 0.0)
	sim.tick(0.2)
	check("冷卻中指令仍是打坐", str(sim.unit_by_id(id).order) == "sit")
	var followers_before := 0
	sim.set_order(id, "follow")
	var tp := sim.teleport("gate")
	check("跟隨的人一起傳送", bool(tp.ok) and int(tp.followers) >= 1)
	followers_before = int(tp.followers)

func _test_campaign() -> void:
	var sim := XWSim.new()
	sim.new_game(8)
	sim.res = {"wood": 500, "stone": 500, "fiber": 200, "food": 200, "iron": 200, "herb": 80, "lingshi": 100}
	for ty in ["hall", "wudao", "lianwu", "library"]:
		var placed := sim.place_building(ty)
		check("能放" + ty, bool(placed.ok))
		for b in sim.buildings:
			if str(b.type) == ty:
				b.built = true
				b.progress = 1.0
	sim.explore_ruin()
	sim.items.xfl = 1
	var p := sim.player()
	var guard := 0
	while int(p.realm) < 4 and guard < 8:
		guard += 1
		var top := XWRules.layer_count(int(p.realm)) - 1
		p.sub = top
		p.xiu = XWRules.need_at(int(p.realm), top)
		sim.force_roll = 0.99
		var br := sim.try_break(int(p.id), false)
		if not br.ok:
			print("突破停住 " + str(br.msg))
			break
	check("玩到煉氣", int(sim.player().realm) == 4)
	check("到煉氣後有靈力", int(sim.player().qi) == 300)
	check("護盾是靈力一半", is_equal_approx(float(sim.player().shield), 150.0))
	var no_root := sim.debug_add_disciple(10, 10)
	var d := sim.unit_by_id(no_root)
	d.realm = 3
	d.sub = 3
	d.xiu = XWRules.need_at(3, 3)
	d.lg = null
	sim.force_roll = 0.99
	var blocked := sim.try_break(no_root, false)
	check("沒靈根的弟子不能升煉氣", not bool(blocked.ok))
