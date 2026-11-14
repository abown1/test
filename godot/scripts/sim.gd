class_name XWSim
## 單人宗門。地圖尺寸是常數，以後可以加大，這次不是 1000×1000。

var time := 0.0
var seed := 1
var rng := RandomNumberGenerator.new()
var res := {}
var items := {"miji": 0, "gongfa": 0, "xfl": 0}
var mats := {"hide": 0, "bone": 0, "core": 0, "lingzhi": 0, "xuantie": 0}
var pills := {}
var inv: Array = []
var ware: Array = []
var consign: Array = []
var units: Array = []
var enemies: Array = []
var buildings: Array = []
var nodes: Array = []
var logs: Array = []
var next_id := 1
var interior := -1
var in_trial := false
var spar: Dictionary = {}
var recruit: Dictionary = {}
var craft_queue: Array = []
var pill_job: Dictionary = {}
var research := {"miji": 0.0, "gf": 0.0}
var force_roll := -1.0
var rev := 0
var imported := false
var stipend_acc := 0.0
var year_paid := 0
var ruin_done := false

func new_game(s: int) -> void:
	seed = s
	rng.seed = s
	time = 0.0
	imported = false
	res = {"wood": 0, "stone": 0, "fiber": 0, "food": 0, "iron": 0, "herb": 0, "lingshi": 0}
	items = {"miji": 0, "gongfa": 0, "xfl": 0}
	mats = {"hide": 0, "bone": 0, "core": 0, "lingzhi": 0, "xuantie": 0}
	pills = {}
	inv = []
	ware = []
	consign = []
	units = []
	enemies = []
	buildings = []
	nodes = []
	logs = []
	next_id = 1
	interior = -1
	in_trial = false
	spar = {}
	recruit = {}
	craft_queue = []
	pill_job = {}
	research = {"miji": 0.0, "gf": 0.0}
	stipend_acc = 0.0
	year_paid = 0
	ruin_done = false
	var p := _blank_unit("player", 22.0, 26.0, 6)
	p["name"] = "你"
	p["wu"] = 80
	p["luck"] = 70
	p["xy"] = 15
	p["loyal"] = 100
	p["person"] = "堅毅"
	p["gat"] = 1.6
	p["speed"] = XWData.PLAYER_SPEED
	p["bp"] = 30
	p["float_k"] = 1.0
	p["age"] = 16.0
	p["order"] = "dai"
	p["gf"] = {}
	_apply_template(p, false)
	units.append(p)
	_scatter_nodes()
	_spawn_wild()
	say("新的宗門還是一片空地。先砍樹、搬石，把大殿蓋起來。")
	rev += 1

func apply_converted(pack: Dictionary) -> Dictionary:
	if not pack.get("ok", false):
		return pack
	var save: Dictionary = pack["save"]
	new_game(int(save.get("seed", 1)))
	imported = true
	time = float(save.get("time", 0))
	for k in res.keys():
		if save["res"].has(k):
			res[k] = int(save["res"][k])
	items = (save["items"] as Dictionary).duplicate(true)
	for k in ["miji", "gongfa", "xfl"]:
		if not items.has(k):
			items[k] = 0
	if typeof(save.get("mats")) == TYPE_DICTIONARY:
		for k in mats.keys():
			if save["mats"].has(k):
				mats[k] = int(save["mats"][k])
	pills = (save["pills"] as Dictionary).duplicate(true) if typeof(save.get("pills")) == TYPE_DICTIONARY else {}
	inv = (save["inv"] as Array).duplicate(true)
	units.clear()
	var n := 0
	for raw in save["units"]:
		if typeof(raw) != TYPE_DICTIONARY:
			continue
		var u := (raw as Dictionary).duplicate(true)
		u["id"] = int(u.get("id", next_id))
		next_id = maxi(next_id, int(u["id"]) + 1)
		u["order"] = str(u.get("job", u.get("order", "dai")))
		if u["order"] == "null" or u["order"] == "":
			u["order"] = "dai"
		u["doing"] = ""
		u["med_cd"] = 0.0
		u["medit"] = false
		u["last_combat"] = -99.0
		u["carry"] = int(u.get("carry_n", 0))
		u["carry_res"] = str(u.get("carry_res", ""))
		u["duty"] = str(u.get("duty", ""))
		u["post"] = str(u.get("post", "雜役" if str(u.get("kind")) == "disciple" else ""))
		u["gf"] = u.get("gf", {}) if typeof(u.get("gf")) == TYPE_DICTIONARY else {}
		u["eq"] = u.get("eq", {})
		u["shield"] = float(u.get("shield", 0))
		u["guard_pool"] = float(u.get("guard_pool", 0))
		u["cd"] = {}
		u["stun"] = 0.0
		u["dead"] = bool(u.get("dead", false))
		if not u.has("hp"):
			u["hp"] = int(u.get("maxhp", 1))
		u["stat_lock"] = true
		u["float_k"] = float(u.get("float_k", 1.0))
		u["bp"] = int(u.get("bp", 30))
		u["speed"] = float(u.get("speed", XWData.PLAYER_SPEED if str(u.get("kind")) == "player" else XWData.DISC_SPEED))
		u["sub"] = int(u.get("sub", 0))
		u["realm"] = int(u.get("realm", 0))
		u["xiu"] = float(u.get("xiu", 0))
		u["x"] = float(u.get("x", 22))
		u["y"] = float(u.get("y", 26))
		if u["x"] < 1 or u["x"] >= XWData.MAP_W - 1 or u["y"] < 1 or u["y"] >= XWData.MAP_H - 1:
			u["ox"] = u["x"]
			u["oy"] = u["y"]
			u["x"] = 22.0 + float(n % 4)
			u["y"] = 27.0 + float(n / 4)
		if not u.has("lg"):
			u["lg"] = null
		units.append(u)
		n += 1
	buildings.clear()
	var bi := 0
	for rawb in save["buildings"]:
		if typeof(rawb) != TYPE_DICTIONARY:
			continue
		var b := (rawb as Dictionary).duplicate(true)
		var ty := str(b.get("type", ""))
		if ty == "" and typeof(b.get("t")) == TYPE_STRING:
			ty = str(b["t"])
		b["type"] = ty
		b["id"] = int(b.get("id", next_id))
		next_id = maxi(next_id, int(b["id"]) + 1)
		b["lv"] = int(b.get("lv", b.get("level", 1)))
		b["ox"] = float(b.get("x", 0))
		b["oy"] = float(b.get("y", 0))
		var built := true
		if b.has("built"):
			built = bool(b["built"])
		b["built"] = built
		b["progress"] = 1.0 if built else float(b.get("progress", 0))
		if b["ox"] < 1 or b["ox"] >= XWData.MAP_W - 2 or b["oy"] < 1 or b["oy"] >= XWData.MAP_H - 2:
			var plot := _plot_for(ty, bi)
			b["x"] = plot.x
			b["y"] = plot.y
		bi += 1
		if not b.has("hp"):
			b["hp"] = int(XWData.BUILD.get(ty, {}).get("hp", 100))
		b["maxhp"] = int(b.get("maxhp", b["hp"]))
		buildings.append(b)
	say("舊檔已轉入。靈石 %d，弟子 %d 人，建築 %d 棟。原檔沒有被改寫。" % [int(res.lingshi), disciple_count(), buildings.size()])
	rev += 1
	return {"ok": true, "msg": logs[logs.size() - 1]}

func player() -> Dictionary:
	for u in units:
		if str(u.get("kind")) == "player":
			return u
	return {}

func disciples() -> Array:
	var a := []
	for u in units:
		if str(u.get("kind")) == "disciple" and not bool(u.get("dead", false)):
			a.append(u)
	return a

func disciple_count() -> int:
	return disciples().size()

func say(t: String) -> void:
	logs.append(t)
	if logs.size() > 12:
		logs.pop_front()

func tick(dt: float) -> void:
	dt = clampf(dt, 0.0, 0.1)
	time += dt
	_pay_stipend(dt)
	_elder_dispatch()
	for u in units:
		if bool(u.get("dead", false)):
			continue
		u["age"] = float(u.get("age", 16)) + dt / XWData.YEAR_SEC
		if float(u.get("stun", 0)) > 0:
			u["stun"] = maxf(0.0, float(u["stun"]) - dt)
		if float(u.get("med_cd", 0)) > 0:
			u["med_cd"] = maxf(0.0, float(u["med_cd"]) - dt)
		_regen(u, dt)
		if str(u.get("kind")) == "player":
			_player_task(u, dt)
		else:
			_disciple_ai(u, dt)
		if time - float(u.get("last_combat", -99)) < 5.0:
			gongfa_tick(u, dt, 3.0)
	for e in enemies:
		_enemy_ai(e, dt)
	_build_progress(dt)
	_craft_progress(dt)
	_pill_progress(dt)
	_research_progress(dt)
	_spar_progress(dt)
	_consign_progress(dt)
	_recruit_progress(dt)
	rev += 1

func set_order(uid: int, order: String) -> Dictionary:
	var u := unit_by_id(uid)
	if u.is_empty():
		return {"ok": false, "msg": "找不到這個人。", "order": ""}
	if str(u.get("kind")) == "player":
		return {"ok": false, "msg": "這是給弟子的指令。", "order": str(u.get("order", "dai"))}
	if order in ["hunt", "forge", "pill"] and not _can_take_item():
		return {"ok": false, "msg": "行囊和倉庫都滿了，工作沒有改，仍是「%s」。" % XWData.order_name(str(u.get("order", "dai"))), "order": str(u.get("order", "dai"))}
	u["order"] = order
	u["doing"] = ""
	if order in ["fight", "hunt", "guard"]:
		u["anchor_x"] = float(u["x"])
		u["anchor_y"] = float(u["y"])
	say("%s 的指令改為「%s」。" % [str(u.get("name")), XWData.order_name(order)])
	return {"ok": true, "msg": logs[logs.size() - 1], "order": order}

func set_duty(uid: int, on: bool) -> Dictionary:
	var u := unit_by_id(uid)
	if u.is_empty():
		return {"ok": false, "msg": "找不到這個人。"}
	u["duty"] = "guard" if on else ""
	return {"ok": true, "msg": ("已兼任守衛。" if on else "已卸下守衛。") + "原來的工作「%s」還在。" % XWData.order_name(str(u.get("order", "dai")))}

func set_post(uid: int, post: String) -> Dictionary:
	var u := unit_by_id(uid)
	if u.is_empty():
		return {"ok": false, "msg": "找不到這個人。"}
	if post == "執法" and not has_built("zhifatang"):
		return {"ok": false, "msg": "要先蓋好執法堂，才能任命執法。"}
	if post == "外事" and not has_built("waishitang"):
		return {"ok": false, "msg": "要先蓋好外事堂，才能任命外事。"}
	if post == "長老":
		var n := 0
		for d in disciples():
			if str(d.get("post")) == "長老" and int(d["id"]) != uid:
				n += 1
		if n >= 3:
			return {"ok": false, "msg": "長老最多 3 人。"}
	u["post"] = post
	return {"ok": true, "msg": "%s 現在是%s。" % [str(u.get("name")), post]}

func unlocked(ty: String) -> Dictionary:
	var r := int(player().get("realm", 0))
	match ty:
		"library", "forge":
			if not has_built("wudao"):
				return {"ok": false, "msg": "要先蓋好武道館。"}
		"alchemy":
			if not has_built("library"):
				return {"ok": false, "msg": "要先蓋好長書閣。"}
		"gongfage":
			if r < 2:
				return {"ok": false, "msg": "功法閣：大武師解鎖。"}
		"renwutang":
			if r < 1:
				return {"ok": false, "msg": "任務堂：武師解鎖。"}
		"biwutai":
			if r < 2:
				return {"ok": false, "msg": "比武台：大武師解鎖。"}
		"cangku", "kuangchang", "zhifatang", "waishitang":
			if r < 3:
				return {"ok": false, "msg": "%s：宗師解鎖。" % str(XWData.BUILD[ty]["name"])}
		"xianyuan":
			if not anyone_realm_at_least(4):
				return {"ok": false, "msg": "仙緣閣要等有人到煉氣。"}
	if not XWData.BUILD.has(ty):
		return {"ok": false, "msg": "沒有這棟建築。"}
	return {"ok": true, "msg": ""}

func place_building(ty: String) -> Dictionary:
	var un := unlocked(ty)
	if not un.ok:
		return un
	if ty != "house" and _built_or_wip(ty) >= 1:
		return {"ok": false, "msg": "這一種已經有了。"}
	if ty == "house" and _built_or_wip("house") >= XWData.PLOTS["house"].size():
		return {"ok": false, "msg": "住房的預留地滿了。"}
	var plot := _free_plot(ty)
	if plot == Vector2(-1, -1):
		return {"ok": false, "msg": "沒有空地。"}
	var cost: Dictionary = XWData.BUILD[ty]["cost"]
	if not _afford(cost):
		return {"ok": false, "msg": "材料不夠。需要%s。" % _cost_text(cost)}
	_pay(cost)
	var b := {
		"id": _nid(), "type": ty, "x": plot.x, "y": plot.y, "ox": plot.x, "oy": plot.y,
		"lv": 1, "hp": int(XWData.BUILD[ty]["hp"]), "maxhp": int(XWData.BUILD[ty]["hp"]),
		"progress": 0.0, "built": false, "paid": cost.duplicate(true),
	}
	buildings.append(b)
	say("開始蓋%s。" % str(XWData.BUILD[ty]["name"]))
	return {"ok": true, "msg": logs[logs.size() - 1], "id": b["id"]}

func upgrade_building(bid: int) -> Dictionary:
	var b := building_by_id(bid)
	if b.is_empty() or not bool(b.get("built")):
		return {"ok": false, "msg": "還沒蓋好，不能升級。"}
	var lv := int(b.get("lv", 1))
	if str(b.get("type")) == "hall":
		if lv >= 3:
			return {"ok": false, "msg": "大殿 4 到 10 級的材料還沒定，這版先升到 3 級。功法加速仍是每一級 3%。"}
	elif lv >= 3:
		return {"ok": false, "msg": "這版建築先升到 3 級。"}
	var base: Dictionary = XWData.BUILD[str(b["type"])]["cost"]
	var mul := 1.2 if lv == 1 else 2.0
	var cost := {}
	for k in base.keys():
		cost[k] = int(ceil(float(base[k]) * mul))
	if lv == 2:
		cost["iron"] = int(cost.get("iron", 0)) + 10
	if not _afford(cost):
		return {"ok": false, "msg": "升級材料不夠。需要%s。" % _cost_text(cost)}
	_pay(cost)
	b["lv"] = lv + 1
	b["maxhp"] = int(round(float(b["maxhp"]) * 1.4))
	b["hp"] = b["maxhp"]
	say("%s 升到 %d 級。" % [str(XWData.BUILD[str(b["type"])]["name"]), int(b["lv"])])
	return {"ok": true, "msg": logs[logs.size() - 1]}

func repair_building(bid: int) -> Dictionary:
	var b := building_by_id(bid)
	if b.is_empty() or not bool(b.get("built")):
		return {"ok": false, "msg": "還沒蓋好。"}
	var maxhp := float(b.get("maxhp", 1))
	var miss := 1.0 - float(b.get("hp", 0)) / maxhp
	if miss <= 0.001:
		return {"ok": false, "msg": "沒有損壞。"}
	var wood_cost := int(XWData.BUILD[str(b["type"])]["cost"].get("wood", 10))
	var need := maxi(1, int(ceil(miss * float(wood_cost))))
	if int(res.wood) < need:
		return {"ok": false, "msg": "修理要木材 %d。官方沒另訂公式，這版按損壞比例照建造的木材來算。" % need}
	res.wood -= need
	b["hp"] = int(maxhp)
	return {"ok": true, "msg": "修好了，用了木材 %d。" % need}

func demolish_building(bid: int) -> Dictionary:
	var b := building_by_id(bid)
	if b.is_empty():
		return {"ok": false, "msg": "沒有這棟。"}
	var cost: Dictionary = b.get("paid", XWData.BUILD[str(b["type"])]["cost"])
	var ratio := 1.0
	if bool(b.get("built")):
		var hp := float(b.get("hp", 1))
		var mx := maxf(1.0, float(b.get("maxhp", 1)))
		ratio = lerpf(0.5, 0.75, clampf(hp / mx, 0.0, 1.0))
	for k in cost.keys():
		res[k] = int(res.get(k, 0)) + int(floor(float(cost[k]) * ratio))
	buildings.erase(b)
	if interior == bid:
		interior = -1
	say("已拆除，退回一部分材料。")
	return {"ok": true, "msg": logs[logs.size() - 1]}

func pop_cap() -> int:
	var n := 0
	for b in buildings:
		if not bool(b.get("built")):
			continue
		n += int(XWData.BUILD.get(str(b.get("type")), {}).get("pop", 0))
	return n

func start_recruit() -> Dictionary:
	if interior_type() != "altar":
		return {"ok": false, "msg": "要進求武台室內才能招募。"}
	if not bool(building_by_id(interior).get("built", false)):
		return {"ok": false, "msg": "求武台還沒蓋好。"}
	if disciple_count() >= pop_cap():
		return {"ok": false, "msg": "弟子滿了。蓋大殿或住房才能再收人。"}
	if int(res.food) < XWData.RECRUIT_COST:
		return {"ok": false, "msg": "招募要食物 %d。" % XWData.RECRUIT_COST}
	if not recruit.is_empty():
		return {"ok": false, "msg": "已經在感應了。"}
	res.food -= XWData.RECRUIT_COST
	recruit = {"t": 0.0, "ready": false, "cands": []}
	return {"ok": true, "msg": "開始感應，大約 4 秒。"}

func take_recruit(idx: int) -> Dictionary:
	if recruit.is_empty() or not bool(recruit.get("ready")):
		return {"ok": false, "msg": "還沒有候選人。"}
	var cands: Array = recruit["cands"]
	if idx < 0 or idx >= cands.size():
		return {"ok": false, "msg": "沒有這一位。"}
	if disciple_count() >= pop_cap():
		return {"ok": false, "msg": "弟子滿了，人還留在名單上。"}
	var c: Dictionary = cands[idx]
	var u := _blank_unit("disciple", 23.0 + float(disciple_count() % 3), 27.0, int(c["body"]))
	u["name"] = str(c["name"])
	u["realm"] = int(c["realm"])
	u["post"] = "雜役"
	u["order"] = "dai"
	u["wu"] = int(c["wu"])
	u["luck"] = int(c["luck"])
	u["xy"] = int(c["xy"])
	u["loyal"] = int(c["loyal"])
	u["person"] = str(c["person"])
	u["bp"] = int(c["bp"])
	u["float_k"] = float(c["float_k"])
	u["age"] = float(c["age"])
	_apply_template(u, false)
	units.append(u)
	cands.remove_at(idx)
	if cands.is_empty():
		recruit = {}
	say("收下了%s。" % str(u["name"]))
	return {"ok": true, "msg": logs[logs.size() - 1], "id": u["id"]}

func move_player_toward(tx: float, ty: float, dt: float) -> void:
	var p := player()
	if p.is_empty() or bool(p.get("dead")):
		return
	if bool(p.get("medit")):
		return
	p["goal_x"] = tx
	p["goal_y"] = ty
	p["moving"] = true
	_step_toward(p, tx, ty, dt)

func player_gather(node_id: int) -> Dictionary:
	var n := node_by_id(node_id)
	if n.is_empty():
		return {"ok": false, "msg": "那裡沒有東西可採。"}
	player()["task"] = {"type": "gather", "id": node_id}
	player()["medit"] = false
	return {"ok": true, "msg": "過去採%s。" % str(XWData.NODE_NAME[str(n["type"])])}

func player_attack(eid: int) -> Dictionary:
	var e := enemy_by_id(eid)
	if e.is_empty() or float(e.get("hp", 0)) <= 0:
		return {"ok": false, "msg": "沒有這個目標。"}
	player()["task"] = {"type": "attack", "id": eid}
	player()["medit"] = false
	return {"ok": true, "msg": "鎖定%s。" % str(XWData.ENEMY[str(e["type"])]["n"])}

func try_meditate(on: bool) -> Dictionary:
	var p := player()
	if not on:
		p["medit"] = false
		p["task"] = {}
		return {"ok": true, "msg": "停止打坐。"}
	if float(p.get("med_cd", 0)) > 0:
		return {"ok": false, "msg": "剛被打到，還要 %.1f 秒才能打坐。" % float(p["med_cd"])}
	if _enemy_near(float(p["x"]), float(p["y"]), 6.0):
		return {"ok": false, "msg": "旁邊有敵人，不能打坐。"}
	p["medit"] = true
	p["task"] = {}
	p["moving"] = false
	return {"ok": true, "msg": "開始打坐。被打到會中斷，三秒內不能立刻再坐。"}

func cast_skill(key: String) -> Dictionary:
	var p := player()
	var sk: Dictionary = XWData.SKILLS.get(key, {})
	if sk.is_empty():
		return {"ok": false, "msg": "沒有這個武技。"}
	if int(p.get("realm", 0)) < int(sk["realm"]):
		return {"ok": false, "msg": "%s 要到%s。" % [str(sk["n"]), XWData.realm_name(int(sk["realm"]))]}
	var cds: Dictionary = p.get("cd", {})
	if float(cds.get(key, 0)) > time:
		return {"ok": false, "msg": "還沒冷卻。"}
	if key == "guard":
		if float(p["hp"]) / maxf(1.0, float(p["maxhp"])) >= 0.65:
			return {"ok": false, "msg": "氣血還高於 65%，氣勁護體開不起來。"}
		p["guard_pool"] = float(p["maxhp"]) * 0.4
		cds[key] = time + float(sk["cd"])
		p["cd"] = cds
		return {"ok": true, "msg": "氣勁護體張開。吸收量只在這條武技上計算，跟靈氣護盾不是同一個數字。"}
	var target := _nearest_enemy(float(p["x"]), float(p["y"]), 8.0)
	if target.is_empty():
		return {"ok": false, "msg": "附近沒有敵人。"}
	if key == "sweep":
		for e in enemies:
			if float(e.get("hp", 0)) <= 0:
				continue
			if _dist(p, e) <= 2.2:
				_strike(p, e, float(sk["mul"]))
	else:
		_strike(p, target, float(sk["mul"]))
		if key == "charge":
			target["stun"] = 1.0
	cds[key] = time + float(sk["cd"])
	p["cd"] = cds
	return {"ok": true, "msg": "使出%s。" % str(sk["n"])}

func gain_xiu(u: Dictionary, amt: float) -> void:
	if u.is_empty() or bool(u.get("dead")):
		return
	if int(u.get("realm", 0)) >= 4:
		return
	amt *= XWRules.XIU_MUL
	var guard := 0
	while amt > 0.0001 and guard < 30:
		guard += 1
		var need := float(XWRules.need_at(int(u["realm"]), int(u["sub"])))
		var room := need - float(u["xiu"])
		if amt < room:
			u["xiu"] = float(u["xiu"]) + amt
			return
		u["xiu"] = need
		amt -= room
		var top := XWRules.layer_count(int(u["realm"])) - 1
		if int(u["sub"]) < top:
			u["sub"] = int(u["sub"]) + 1
			u["xiu"] = 0.0
			u["stat_lock"] = false
			_apply_template(u, true)
			continue
		if int(u["realm"]) <= 1:
			var br := try_break(int(u["id"]), true)
			if not br.get("ok", false):
				return
			continue
		return

func break_lines(u: Dictionary) -> Array:
	var lines: Array = []
	var r := int(u.get("realm", 0))
	if r >= 4:
		lines.append({"t": "這次先做到煉氣。再往上先不做。", "ok": false})
		return lines
	var top := XWRules.layer_count(r) - 1
	var need := XWRules.need_at(r, int(u.get("sub", 0)))
	var full := int(u.get("sub", 0)) >= top and float(u.get("xiu", 0)) + 0.001 >= float(need)
	lines.append({"t": "修為要到%s圓滿（%d／%d）" % [XWRules.sub_name(r, int(u.get("sub", 0))), int(u.get("xiu", 0)), need], "ok": full})
	if r == 1:
		lines.append({"t": "宗門要有練武閣", "ok": has_built("lianwu")})
	if r == 2:
		lines.append({"t": "要有武學秘籍（現在 %d）" % int(items.get("miji", 0)), "ok": int(items.get("miji", 0)) > 0})
	if r == 3:
		lines.append({"t": "要持有功法（現在 %d）" % int(items.get("gongfa", 0)), "ok": int(items.get("gongfa", 0)) > 0})
		lines.append({"t": "要有仙凡令（現在 %d）" % int(items.get("xfl", 0)), "ok": int(items.get("xfl", 0)) > 0})
		lines.append({"t": "靈石 20（現在 %d）" % int(res.lingshi), "ok": int(res.lingshi) >= 20})
		if str(u.get("kind")) != "player":
			var has_lg := typeof(u.get("lg")) == TYPE_DICTIONARY
			lines.append({"t": "弟子沒有靈根就不能突破煉氣", "ok": has_lg})
	return lines

func try_break(uid: int, auto: bool) -> Dictionary:
	var u := unit_by_id(uid)
	if u.is_empty():
		return {"ok": false, "msg": "找不到人。"}
	var lines := break_lines(u)
	for ln in lines:
		if not ln["ok"]:
			if not auto:
				say(str(u.get("name")) + "還不能突破：" + str(ln["t"]))
			return {"ok": false, "msg": str(ln["t"]), "lines": lines}
	var r := int(u["realm"])
	if r == 3:
		res.lingshi = int(res.lingshi) - 20
	var roll := _roll()
	var fail := XWRules.fail_chance(u)
	if roll < fail:
		u["xiu"] = floor(float(u["xiu"]) * 0.7)
		u["hp"] = maxf(1.0, floor(float(u["hp"]) * 0.5))
		var msg := "%s 衝擊%s失敗，修為掉三成，氣血剩一半。這次失敗率 %d%%。" % [str(u.get("name")), XWData.realm_name(r + 1), int(round(fail * 100.0))]
		say(msg)
		return {"ok": false, "msg": msg, "failed": true, "lines": lines}
	if r == 3:
		items["xfl"] = maxi(0, int(items.get("xfl", 0)) - 1)
	u["realm"] = r + 1
	u["sub"] = 0
	u["xiu"] = 0.0
	u["tp_b"] = 0.0
	u["stat_lock"] = false
	_apply_template(u, true)
	u["hp"] = float(u["maxhp"])
	var okmsg := "%s 突破到%s。" % [str(u.get("name")), XWData.realm_name(int(u["realm"]))]
	say(okmsg)
	return {"ok": true, "msg": okmsg, "lines": lines}

func teach_options() -> Array:
	var out: Array = []
	var gf: Dictionary = player().get("gf", {})
	for g in XWData.GONGFA:
		var st := int(gf.get(g["id"], -1))
		if st >= 0:
			out.append({"id": g["id"], "n": g["n"], "stage": XWData.GF_STAGES[clampi(st, 0, 8)], "desc": g["desc"]})
	return out

func teach(uid: int, gf_id: String) -> Dictionary:
	var opts := teach_options()
	if opts.is_empty():
		return {"ok": false, "msg": "你還沒有可以傳的功法。先去遺跡，或在長書閣研究。名單不是空白，只是還沒學會。", "options": []}
	var u := unit_by_id(uid)
	if u.is_empty() or str(u.get("kind")) != "disciple":
		return {"ok": false, "msg": "要選一名弟子。", "options": opts}
	var known := false
	for o in opts:
		if o["id"] == gf_id:
			known = true
	if not known:
		return {"ok": false, "msg": "這門功法不在可傳的名單裡。", "options": opts}
	var pay := 0
	if has_built("gongfage"):
		pay = 1
	if int(res.lingshi) < pay:
		return {"ok": false, "msg": "弟子這次傳授要 1 靈石當俸祿，庫房不夠。宗主自己學不用付。", "options": opts}
	res.lingshi = int(res.lingshi) - pay
	var dg: Dictionary = u.get("gf", {})
	if typeof(dg) != TYPE_DICTIONARY:
		dg = {}
	if not dg.has(gf_id):
		dg[gf_id] = 0
	u["gf"] = dg
	var fee := "扣了 1 靈石。" if pay > 0 else "功法閣還沒蓋，這次不扣俸祿。"
	return {"ok": true, "msg": "已把功法傳給%s。%s" % [str(u.get("name")), fee], "options": opts}

func meditate_disciple_hit(uid: int, dmg: float) -> void:
	var u := unit_by_id(uid)
	if u.is_empty():
		return
	_hurt(u, dmg, {"realm": 0, "atk": dmg, "id": -1})

func spar_state() -> Dictionary:
	return spar.duplicate(true)

func start_spar(a: int, b: int) -> Dictionary:
	if not has_built("biwutai"):
		return {"ok": false, "msg": "要先蓋好比武台。比武台在大武師解鎖。", "options": _spar_names()}
	if not spar.is_empty():
		var ua := unit_by_id(int(spar.get("a", -1)))
		var ub := unit_by_id(int(spar.get("b", -1)))
		return {"ok": false, "msg": "現在是%s和%s在切磋。可以停止，不必再找兩個人。" % [str(ua.get("name", "?")), str(ub.get("name", "?"))], "options": _spar_names(), "busy": true}
	if a == b or unit_by_id(a).is_empty() or unit_by_id(b).is_empty():
		return {"ok": false, "msg": "要選兩名不同的弟子。", "options": _spar_names()}
	spar = {"a": a, "b": b, "t": 0.0}
	return {"ok": true, "msg": "兩人上台切磋。", "options": _spar_names()}

func stop_spar() -> Dictionary:
	spar = {}
	return {"ok": true, "msg": "切磋結束。"}

func ware_put(idx: int) -> Dictionary:
	if not has_built("cangku"):
		return {"ok": false, "msg": "還沒有倉庫，東西留在行囊。"}
	if idx < 0 or idx >= inv.size():
		return {"ok": false, "msg": "行囊裡沒有這一件。"}
	if ware.size() >= XWData.WARE_CAP:
		return {"ok": false, "msg": "倉庫滿了，沒有入庫。行囊也沒有變。"}
	ware.append(inv[idx])
	inv.remove_at(idx)
	return {"ok": true, "msg": "已入庫。"}

func ware_take(idx: int) -> Dictionary:
	if idx < 0 or idx >= ware.size():
		return {"ok": false, "msg": "倉庫裡沒有這一件。"}
	if inv.size() >= XWData.INV_CAP:
		return {"ok": false, "msg": "行囊滿了，沒有領出。"}
	inv.append(ware[idx])
	ware.remove_at(idx)
	return {"ok": true, "msg": "已領到行囊。"}

func consign_put(from_ware: bool, idx: int, price: int) -> Dictionary:
	if not has_built("waishitang"):
		return {"ok": false, "msg": "寄賣在外事堂。外事堂要宗師才解鎖。"}
	if price < 1:
		return {"ok": false, "msg": "價錢至少 1 靈石。"}
	var src: Array = ware if from_ware else inv
	if idx < 0 or idx >= src.size():
		return {"ok": false, "msg": "沒有這一件。"}
	var it = src[idx]
	src.remove_at(idx)
	consign.append({"item": it, "price": price, "t": 0.0, "name": _item_name(it)})
	return {"ok": true, "msg": "已上架「%s」，標價 %d。" % [_item_name(it), price]}

func consign_back(idx: int) -> Dictionary:
	if idx < 0 or idx >= consign.size():
		return {"ok": false, "msg": "沒有這筆寄賣。"}
	if not _can_take_item():
		return {"ok": false, "msg": "裝不下，寄賣維持原樣。"}
	var it = consign[idx]["item"]
	consign.remove_at(idx)
	if has_built("cangku") and ware.size() < XWData.WARE_CAP:
		ware.append(it)
	else:
		inv.append(it)
	return {"ok": true, "msg": "已取回。"}

func shop_herb(buy: bool, n: int) -> Dictionary:
	if not has_built("waishitang"):
		return {"ok": false, "msg": "藥草買賣在外事堂，要進室內。"}
	n = maxi(1, n)
	if buy:
		var cost := XWData.HERB_PRICE * n
		if int(res.lingshi) < cost:
			return {"ok": false, "msg": "靈石不夠。藥草單價 5。"}
		res.lingshi = int(res.lingshi) - cost
		res.herb = int(res.herb) + n
		return {"ok": true, "msg": "買了藥草 %d，花了靈石 %d。" % [n, cost]}
	var got := int(floor(float(XWData.HERB_PRICE) * (1.0 - XWData.TAX))) * n
	if int(res.herb) < n:
		return {"ok": false, "msg": "藥草不夠。"}
	res.herb = int(res.herb) - n
	res.lingshi = int(res.lingshi) + got
	return {"ok": true, "msg": "賣了藥草 %d。單價 5，扣掉外事稅 15% 後實收 %d。稅要不要套在這筆，還沒單獨定過，這版先照外事稅。" % [n, got]}

func queue_gear(gear_id: String, item_realm: int, count: int) -> Dictionary:
	if interior_type() != "forge":
		return {"ok": false, "msg": "要進鍛造坊室內才能打造。"}
	var g: Dictionary = XWData.GEAR.get(gear_id, {})
	if g.is_empty():
		return {"ok": false, "msg": "沒有這一件。"}
	if item_realm < int(g["realm"]):
		return {"ok": false, "msg": "這一件要選到%s以上。" % XWData.realm_name(int(g["realm"]))}
	if item_realm > int(player().get("realm", 0)):
		return {"ok": false, "msg": "不能做比你境界更高的裝備。"}
	count = maxi(1, count)
	for _i in count:
		craft_queue.append({"id": gear_id, "realm": item_realm, "t": 0.0})
	return {"ok": true, "msg": "已排 %d 件%s。沒有 20 件上限。上方會跟著你選的境界變。" % [count, str(g["n"])]}

func queue_pill(pid: String) -> Dictionary:
	if interior_type() != "alchemy":
		return {"ok": false, "msg": "要進煉丹房室內。"}
	var p: Dictionary = XWData.PILLS.get(pid, {})
	if p.is_empty():
		return {"ok": false, "msg": "沒有這個丹方。"}
	if not pill_job.is_empty():
		return {"ok": false, "msg": "爐上還有一爐。"}
	if not _afford_mix(p["cost"]):
		return {"ok": false, "msg": "材料不夠。"}
	_pay_mix(p["cost"])
	pill_job = {"id": pid, "t": 0.0}
	return {"ok": true, "msg": "開始煉%s。" % str(p["n"])}

func use_pill(pid: String, uid: int) -> Dictionary:
	var arr: Array = pills.get(pid, [0, 0, 0])
	var q := -1
	for i in [2, 1, 0]:
		if int(arr[i]) > 0:
			q = i
			break
	if q < 0:
		return {"ok": false, "msg": "沒有這顆丹。"}
	var u := unit_by_id(uid)
	if u.is_empty():
		u = player()
	arr[q] = int(arr[q]) - 1
	pills[pid] = arr
	match pid:
		"hx":
			var back: float = float([0.35, 0.50, 0.70][q])
			u["hp"] = minf(float(u["maxhp"]), float(u["hp"]) + float(u["maxhp"]) * back)
			return {"ok": true, "msg": "服下回血丹。"}
		"jq":
			var tox := float(u.get("tox", 0.0))
			var need := float(XWRules.need_at(int(u["realm"]), int(u["sub"])))
			var g: float = need * float([0.12, 0.20, 0.30][q]) * (1.0 - tox)
			u["tox"] = minf(0.6, tox + 0.12)
			gain_xiu(u, g / XWRules.XIU_MUL)
			return {"ok": true, "msg": "服下聚氣丹。丹毒越高，下一顆越沒效。"}
		"tp":
			u["tp_b"] = float(u.get("tp_b", 0.0)) + [0.08, 0.12, 0.18][q]
			return {"ok": true, "msg": "下一回突破的失敗率降低了。"}
		"xs":
			if int(u.get("xs_n", 0)) >= 3:
				return {"ok": true, "msg": "這個人已經吃過 3 顆洗髓丹，沒有再變化。"}
			u["xs_n"] = int(u.get("xs_n", 0)) + 1
			u["wu"] = int(u.get("wu", 0)) + [3, 5, 8][q]
			if _roll() < [0.10, 0.20, 0.35][q] and typeof(u.get("lg")) != TYPE_DICTIONARY:
				u["lg"] = {"e": rng.randi_range(0, 4), "q": 0}
				return {"ok": true, "msg": "覺醒了靈根。"}
			return {"ok": true, "msg": "悟性提高了。"}
		_:
			return {"ok": true, "msg": "服下了。"}
	return {"ok": true, "msg": "服下了。"}

func explore_ruin() -> Dictionary:
	if ruin_done:
		return {"ok": false, "msg": "遺跡已經看過了。"}
	ruin_done = true
	items["miji"] = int(items.get("miji", 0)) + 1
	items["gongfa"] = int(items.get("gongfa", 0)) + 1
	res.lingshi = int(res.lingshi) + 30
	var p := player()
	p["xy"] = int(p.get("xy", 0)) + 20
	gain_xiu(p, 100)
	var gf: Dictionary = p.get("gf", {})
	gf["lieshi"] = int(gf.get("lieshi", 0))
	p["gf"] = gf
	say("遺跡裡找到武學秘籍、功法和 30 靈石。")
	return {"ok": true, "msg": logs[logs.size() - 1]}

func enter_building(bid: int) -> Dictionary:
	var b := building_by_id(bid)
	if b.is_empty():
		return {"ok": false, "msg": "沒有這棟。"}
	if not bool(b.get("built")):
		return {"ok": false, "msg": "還沒蓋好，不能進去。"}
	interior = bid
	return {"ok": true, "msg": "進入%s。左鍵查看，右鍵在室內移動。功能在室內用。" % str(XWData.BUILD.get(str(b["type"]), {}).get("name", "建築"))}

func leave_building() -> void:
	interior = -1

func interior_type() -> String:
	var b := building_by_id(interior)
	if b.is_empty():
		return ""
	return str(b.get("type", ""))

func teleport(which: String) -> Dictionary:
	var p := player()
	var dest := Vector2(22, 30)
	if which == "gate":
		dest = Vector2(60, 26)
	elif which == "sect":
		dest = Vector2(22, 30)
	else:
		return {"ok": false, "msg": "沒有這座石碑。"}
	var moved := 0
	p["x"] = dest.x
	p["y"] = dest.y
	p["moving"] = false
	for d in disciples():
		if str(d.get("order")) == "follow":
			d["x"] = dest.x + 0.6
			d["y"] = dest.y + 0.4 * float(moved + 1)
			d["doing"] = "跟隨傳送"
			moved += 1
	say("傳送到了。跟隨的弟子一起到，共 %d 人。沒有下跟隨的人留在原地。" % moved)
	return {"ok": true, "msg": logs[logs.size() - 1], "followers": moved}

func enter_trial() -> Dictionary:
	if int(player().get("realm", 0)) < 3:
		return {"ok": false, "msg": "仙凡之門要宗師才進得去。小兵不是煉氣，只有守門天將按煉氣算護盾。"}
	if in_trial:
		return {"ok": false, "msg": "已經在門裡。"}
	in_trial = true
	player()["x"] = 70
	player()["y"] = 26
	for d in disciples():
		if str(d.get("order")) == "follow":
			d["x"] = 70.5
			d["y"] = 27
	_clear_trial_enemies()
	_make_enemy("xfguard", 71, 24, 2, false)
	_make_enemy("xfguard", 71, 28, 3, false)
	_make_enemy("xfboss", 74, 26, 4, true)
	say("進入仙凡之門。左側有撤離陣，踩上去會先問你要不要出去。")
	return {"ok": true, "msg": logs[logs.size() - 1]}

func evacuate(confirm: bool) -> Dictionary:
	if not in_trial:
		return {"ok": false, "msg": "你不在副本裡。"}
	if not confirm:
		return {"ok": false, "msg": "要確認才撤離。東西會帶著走。", "need_confirm": true}
	in_trial = false
	player()["x"] = 60
	player()["y"] = 26
	for d in disciples():
		if str(d.get("order")) == "follow" or float(d.get("x", 0)) >= 64:
			d["x"] = 60.5
			d["y"] = 27
	_clear_trial_enemies()
	say("已從撤離陣出來，身上的東西還在。")
	return {"ok": true, "msg": logs[logs.size() - 1]}

func claim_token_if_boss_down() -> void:
	if not in_trial:
		return
	for e in enemies:
		if str(e.get("type")) == "xfboss" and float(e.get("hp", 1)) <= 0 and not bool(e.get("looted")):
			e["looted"] = true
			items["xfl"] = int(items.get("xfl", 0)) + 1
			say("守門天將倒下，得到仙凡令。")

func has_built(ty: String) -> bool:
	for b in buildings:
		if str(b.get("type")) == ty and bool(b.get("built")):
			return true
	return false

func hall_level() -> int:
	for b in buildings:
		if str(b.get("type")) == "hall" and bool(b.get("built")):
			return int(b.get("lv", 1))
	return 0

func anyone_realm_at_least(r: int) -> bool:
	for u in units:
		if int(u.get("realm", 0)) >= r and not bool(u.get("dead")):
			return true
	return false

func unit_by_id(id: int) -> Dictionary:
	for u in units:
		if int(u.get("id", -999)) == id:
			return u
	return {}

func building_by_id(id: int) -> Dictionary:
	for b in buildings:
		if int(b.get("id", -999)) == id:
			return b
	return {}

func enemy_by_id(id: int) -> Dictionary:
	for e in enemies:
		if int(e.get("id", -999)) == id:
			return e
	return {}

func node_by_id(id: int) -> Dictionary:
	for n in nodes:
		if int(n.get("id", -999)) == id:
			return n
	return {}

func add_prof(kind: String, exp: int) -> void:
	var box: Dictionary = items.get("_prof", {})
	if typeof(box) != TYPE_DICTIONARY:
		box = {}
	var lv := int(box.get(kind + "_lv", 0))
	var cur := int(box.get(kind + "_xp", 0)) + exp
	while lv < 100:
		var need := XWRules.prof_need(lv)
		if cur < need:
			break
		cur -= need
		lv += 1
	if lv >= 100:
		lv = 100
		cur = 0
	box[kind + "_lv"] = lv
	box[kind + "_xp"] = cur
	items["_prof"] = box

func prof_text(kind: String) -> String:
	var box: Dictionary = items.get("_prof", {})
	var lv := int(box.get(kind + "_lv", 0))
	var cur := int(box.get(kind + "_xp", 0))
	var need := XWRules.prof_need(lv)
	var name: String = str({"forge": "鍛造", "pill": "煉丹", "array": "陣法", "craft": "匠人"}.get(kind, kind))
	if need <= 0:
		return "%s熟練已到 100 級上限。" % name
	return "%s熟練 Lv%d（%d／%d）。每件先記 10 點，這個點數還沒定案。" % [name, lv, cur, need]

func gongfa_tick(u: Dictionary, dt: float, rate: float = 1.0) -> void:
	var gf: Dictionary = u.get("gf", {})
	if typeof(gf) != TYPE_DICTIONARY or gf.is_empty():
		return
	var hid := ""
	var best := 99
	for id in gf.keys():
		var g := XWData.gongfa_by_id(str(id))
		if g.is_empty():
			continue
		if int(g["realm"]) < best and int(gf[id]) < 8:
			best = int(g["realm"])
			hid = str(id)
	if hid == "":
		return
	var g2 := XWData.gongfa_by_id(hid)
	var mul := XWRules.gongfa_mul(int(u.get("realm", 0)), int(g2["realm"]), hall_level())
	var xp := rate * mul * dt
	var box: Dictionary = u.get("gf_xp", {})
	box[hid] = float(box.get(hid, 0.0)) + xp
	var stage := int(gf[hid])
	var need := XWRules.gongfa_need(stage)
	if need > 0 and float(box[hid]) >= float(need):
		box[hid] = float(box[hid]) - float(need)
		gf[hid] = stage + 1
		u["gf"] = gf
		if str(u.get("kind")) == "player":
			say("%s 進到「%s」。" % [str(g2["n"]), XWData.GF_STAGES[int(gf[hid])]])
	u["gf_xp"] = box

func snapshot() -> Dictionary:
	return {
		"fmt": "xianwu_godot_1",
		"seed": seed,
		"time": time,
		"res": res.duplicate(true),
		"items": items.duplicate(true),
		"mats": mats.duplicate(true),
		"pills": pills.duplicate(true),
		"inv": inv.duplicate(true),
		"ware": ware.duplicate(true),
		"units": units.duplicate(true),
		"buildings": buildings.duplicate(true),
	}

func _nid() -> int:
	var i := next_id
	next_id += 1
	return i

func _roll() -> float:
	if force_roll >= 0.0:
		var v := force_roll
		force_roll = -1.0
		return v
	return rng.randf()

func _blank_unit(kind: String, x: float, y: float, body: int) -> Dictionary:
	return {
		"id": _nid(), "kind": kind, "name": "", "body": body, "realm": 0, "sub": 0, "xiu": 0.0,
		"x": x, "y": y, "hp": 1, "maxhp": 1, "atk": 1.0, "qi": 0, "shield": 0.0,
		"speed": XWData.DISC_SPEED, "gat": 1.0, "wu": 40, "luck": 40, "xy": 0, "loyal": 70,
		"person": "沉穩", "lg": null, "order": "dai", "doing": "", "duty": "", "post": "",
		"dead": false, "medit": false, "med_cd": 0.0, "last_combat": -99.0, "stun": 0.0,
		"carry": 0, "carry_res": "", "task": {}, "cd": {}, "gf": {}, "gf_xp": {},
		"eq": {}, "guard_pool": 0.0, "tp_b": 0.0, "tox": 0.0, "xs_n": 0,
		"bp": 30, "float_k": 1.0, "age": 18.0, "stat_lock": false, "moving": false,
		"atk_cd": 0.0, "goal_x": x, "goal_y": y,
	}

func _apply_template(u: Dictionary, heal_full: bool) -> void:
	if bool(u.get("stat_lock")):
		u["qi"] = int(u.get("qi", 0))
		u["shield"] = float(u.get("shield", XWRules.shield_max(float(u["qi"]))))
		return
	var st := XWRules.stats_for(int(u["realm"]), int(u["sub"]), float(u.get("float_k", 1.0)), int(u.get("bp", 30)))
	var body: Dictionary = XWData.BODIES[clampi(int(u.get("body", 0)), 0, XWData.BODIES.size() - 1)]
	u["maxhp"] = int(st["hp"])
	u["atk"] = float(st["atk"])
	u["qi"] = int(st["qi"])
	u["gat"] = float(body["gat"]) * (1.6 if str(u.get("kind")) == "player" else 1.0)
	var base_spd := XWData.PLAYER_SPEED if str(u.get("kind")) == "player" else XWData.DISC_SPEED * float(body["spd"])
	u["speed"] = base_spd
	u["shield"] = XWRules.shield_max(float(u["qi"]))
	if heal_full or float(u.get("hp", 0)) > float(u["maxhp"]):
		u["hp"] = float(u["maxhp"])

func _scatter_nodes() -> void:
	var spots := [
		["tree", 10, 18], ["tree", 12, 24], ["tree", 8, 30], ["tree", 14, 16],
		["tree", 46, 14], ["tree", 50, 18], ["tree", 48, 24], ["tree", 44, 30],
		["rock", 16, 18], ["rock", 30, 16], ["rock", 42, 20], ["rock", 12, 36],
		["fiber", 20, 18], ["fiber", 26, 18], ["fiber", 15, 38],
		["berry", 11, 22], ["berry", 13, 34], ["berry", 47, 34],
		["iron", 38, 16], ["iron", 52, 22], ["iron", 41, 36],
		["herb", 9, 26], ["herb", 49, 16], ["herb", 16, 40],
		["vein", 54, 28], ["vein", 36, 40],
	]
	for s in spots:
		nodes.append({
			"id": _nid(), "type": s[0], "x": float(s[1]), "y": float(s[2]),
			"amount": int(XWData.NODE_MAX[s[0]]), "max": int(XWData.NODE_MAX[s[0]]),
		})

func _spawn_wild() -> void:
	_make_enemy("wolf", 12, 20, 0, false)
	_make_enemy("wolf", 48, 16, 0, false)
	_make_enemy("wolf", 50, 30, 0, false)
	_make_enemy("boar", 46, 36, 0, false)
	_make_enemy("bandit", 56, 20, 0, false)

func _make_enemy(ty: String, x: float, y: float, realm: int, boss_shield: bool) -> Dictionary:
	var d: Dictionary = XWData.ENEMY[ty]
	var weaken := rng.randf_range(0.001, 0.010)
	var e := {
		"id": _nid(), "type": ty, "x": x, "y": y, "home_x": x, "home_y": y,
		"hp": float(d["hp"]), "maxhp": float(d["hp"]), "atk": float(d["atk"]),
		"speed": float(d["spd"]), "realm": realm, "xiu": int(d["xiu"]),
		"food": int(d["food"]), "aggro": float(d["aggro"]), "leash": float(d["leash"]),
		"stun": 0.0, "atk_cd": 0.0, "dead_at": -1.0, "weaken": weaken,
		"boss_shield": boss_shield, "looted": false, "trial": in_trial,
	}
	if boss_shield:
		var ling := float(XWData.STATS[4]["qi0"])
		e["qi"] = ling
		e["shield"] = XWRules.shield_max(ling)
	else:
		e["qi"] = 0.0
		e["shield"] = 0.0
	enemies.append(e)
	return e

func _clear_trial_enemies() -> void:
	var keep: Array = []
	for e in enemies:
		if not bool(e.get("trial")):
			keep.append(e)
	enemies = keep

func _regen(u: Dictionary, dt: float) -> void:
	var act := "natural"
	if bool(u.get("medit")):
		act = "sit"
	elif str(u.get("doing")) == "閉關":
		act = "retreat"
	elif str(u.get("doing")) == "練武":
		act = "train"
	elif str(u.get("doing")) == "休息":
		act = "house"
	var in_c := time - float(u.get("last_combat", -99)) < 5.0
	var add := XWRules.regen_per_sec(float(u.get("maxhp", 1)), int(u.get("realm", 0)), act, in_c) * dt
	u["hp"] = minf(float(u["maxhp"]), float(u["hp"]) + add)
	if float(u.get("shield", 0)) < XWRules.shield_max(float(u.get("qi", 0))) and not in_c:
		u["shield"] = minf(XWRules.shield_max(float(u.get("qi", 0))), float(u["shield"]) + add)

func _player_task(u: Dictionary, dt: float) -> void:
	if bool(u.get("medit")):
		if _enemy_near(float(u["x"]), float(u["y"]), 6.0):
			u["medit"] = false
			u["med_cd"] = 3.0
			say("旁邊有敵人，打坐停下。")
		else:
			var place := 0.7
			if interior_type() == "lianwu":
				place = 2.4
			elif interior_type() == "wudao":
				place = 1.6
			gain_xiu(u, 1.2 * place * _cult_mul() * dt)
			if time - float(u.get("last_combat", -99)) >= 5.0:
				gongfa_tick(u, dt, 1.0)
		return
	var task: Dictionary = u.get("task", {})
	if typeof(task) != TYPE_DICTIONARY or task.is_empty():
		return
	if str(task.get("type")) == "gather":
		var n := node_by_id(int(task.get("id", -1)))
		if n.is_empty() or int(n.get("amount", 0)) <= 0:
			u["task"] = {}
			return
		if _dist_xy(float(u["x"]), float(u["y"]), float(n["x"]), float(n["y"])) > 1.3:
			_step_toward(u, float(n["x"]), float(n["y"]), dt)
			return
		u["gt"] = float(u.get("gt", 0.0)) + dt * float(u.get("gat", 1.0))
		if float(u["gt"]) >= 1.0:
			u["gt"] = 0.0
			n["amount"] = int(n["amount"]) - 1
			var rk := str(XWData.NODE_RES[str(n["type"])])
			res[rk] = int(res[rk]) + 1
			gain_xiu(u, 0.15)
	elif str(task.get("type")) == "attack":
		var e := enemy_by_id(int(task.get("id", -1)))
		if e.is_empty() or float(e.get("hp", 0)) <= 0:
			u["task"] = {}
			claim_token_if_boss_down()
			return
		if _dist(u, e) > 1.35:
			_step_toward(u, float(e["x"]), float(e["y"]), dt)
			return
		u["atk_cd"] = float(u.get("atk_cd", 0.0)) - dt
		if float(u["atk_cd"]) <= 0.0:
			u["atk_cd"] = 1.0
			_strike(u, e, 1.0)
			if float(e["hp"]) <= 0:
				_on_kill(u, e)
				u["task"] = {}

func _disciple_ai(u: Dictionary, dt: float) -> void:
	if str(u.get("duty")) == "guard":
		var foe := _nearest_enemy(float(u.get("anchor_x", u["x"])), float(u.get("anchor_y", u["y"])), 8.0)
		if foe.is_empty():
			foe = _nearest_enemy(_sect_x(), _sect_y(), 8.0)
		if not foe.is_empty():
			u["doing"] = "守衛迎敵"
			_fight_toward(u, foe, dt, 20.0)
			return
	var order := str(u.get("order", "dai"))
	if order == "auto":
		order = _auto_choice(u)
		u["doing"] = "自行：" + XWData.order_name(order)
	else:
		u["doing"] = XWData.order_name(order)
	match order:
		"dai":
			u["doing"] = "待命"
			_step_toward(u, 23, 27, dt)
		"follow":
			var p := player()
			_step_toward(u, float(p.get("x", u["x"])) + 0.8, float(p.get("y", u["y"])) + 0.4, dt)
		"chop", "mine", "fiber", "food", "iron", "herb":
			_gather_job(u, order, dt)
		"fight":
			var anchor := Vector2(float(u.get("anchor_x", u["x"])), float(u.get("anchor_y", u["y"])))
			var foe2 := _nearest_enemy(anchor.x, anchor.y, XWData.CHASE_MAX)
			if foe2.is_empty():
				u["doing"] = "戰鬥：附近沒有敵人"
			else:
				_fight_toward(u, foe2, dt, XWData.CHASE_MAX)
		"hunt":
			if not _can_take_item() and int(u.get("carry", 0)) == 0:
				u["doing"] = "狩獵：裝不下，指令仍是狩獵"
				return
			var beast := _nearest_beast(float(u.get("anchor_x", u["x"])), float(u.get("anchor_y", u["y"])))
			if beast.is_empty():
				u["doing"] = "狩獵：附近沒有野獸"
			else:
				_fight_toward(u, beast, dt, XWData.CHASE_MAX)
				if float(beast.get("hp", 1)) <= 0 and not bool(beast.get("skinned")):
					beast["skinned"] = true
					if _give_item({"t": "hide", "n": "獸皮", "q": 0}):
						u["doing"] = "狩獵：拿到獸皮"
					else:
						u["doing"] = "狩獵：獸皮裝不下"
		"guard":
			var g := _nearest_enemy(_sect_x(), _sect_y(), XWData.CHASE_MAX)
			if g.is_empty():
				_step_toward(u, _sect_x(), _sect_y(), dt)
				u["doing"] = "守衛"
			else:
				_fight_toward(u, g, dt, XWData.CHASE_MAX)
		"train":
			_goto_building_job(u, "wudao", dt, "練武")
		"retreat":
			_goto_building_job(u, "lianwu", dt, "閉關")
		"sit":
			_sit_job(u, dt)
		"eat":
			_eat_job(u, dt)
		"forge":
			_goto_building_job(u, "forge", dt, "鍛造")
		"pill":
			_goto_building_job(u, "alchemy", dt, "煉丹")
		"research":
			_goto_building_job(u, "library", dt, "研究")
		"build":
			_build_job(u, dt)
		_:
			u["doing"] = "待命"

func _auto_choice(u: Dictionary) -> String:
	var wip := _latest_wip()
	if wip >= 0:
		u["build_id"] = wip
		return "build"
	for ty in XWData.BUILD_ORDER:
		if ty == "house":
			if pop_cap() >= disciple_count() + 1 and has_built("hall"):
				continue
		elif _built_or_wip(ty) >= 1:
			continue
		var un := unlocked(ty)
		if not un.ok:
			continue
		if _afford(XWData.BUILD[ty]["cost"]):
			place_building(ty)
			u["build_id"] = _latest_wip()
			return "build"
		return _gather_for_cost(XWData.BUILD[ty]["cost"])
	if not has_built("hall"):
		return "chop"
	return "chop"

func _gather_for_cost(cost: Dictionary) -> String:
	var map := {"wood": "chop", "stone": "mine", "fiber": "fiber", "food": "food", "iron": "iron", "herb": "herb"}
	for k in cost.keys():
		if int(res.get(k, 0)) < int(cost[k]) and map.has(k):
			return map[k]
	return "chop"

func _gather_job(u: Dictionary, order: String, dt: float) -> void:
	var want: String = str({"chop": "tree", "mine": "rock", "fiber": "fiber", "food": "berry", "iron": "iron", "herb": "herb"}[order])
	if order == "iron" and has_built("kuangchang"):
		pass
	if int(u.get("carry", 0)) >= XWData.CARRY_CAP:
		if not has_built("hall"):
			u["doing"] = "還沒有大殿可以交貨，指令仍是" + XWData.order_name(order)
			return
		var hall := _first_built("hall")
		if _dist_xy(float(u["x"]), float(u["y"]), float(hall["x"]), float(hall["y"])) > 1.6:
			_step_toward(u, float(hall["x"]), float(hall["y"]), dt)
			return
		var rk := str(u.get("carry_res", "wood"))
		res[rk] = int(res.get(rk, 0)) + int(u["carry"])
		gain_xiu(u, 1)
		u["carry"] = 0
		return
	var n := _nearest_node(want, float(u["x"]), float(u["y"]))
	if n.is_empty():
		u["doing"] = "附近沒有可採的"
		return
	if _dist_xy(float(u["x"]), float(u["y"]), float(n["x"]), float(n["y"])) > 1.3:
		_step_toward(u, float(n["x"]) + _slot_offset(u), float(n["y"]), dt)
		return
	u["gt"] = float(u.get("gt", 0.0)) + dt * float(u.get("gat", 1.0))
	if float(u["gt"]) >= 1.0:
		u["gt"] = 0.0
		if int(n["amount"]) <= 0:
			return
		n["amount"] = int(n["amount"]) - 1
		u["carry"] = int(u.get("carry", 0)) + 1
		u["carry_res"] = str(XWData.NODE_RES[want])
		gain_xiu(u, 0.15)

func _goto_building_job(u: Dictionary, ty: String, dt: float, label: String) -> void:
	if not has_built(ty):
		u["doing"] = "還沒有%s，指令仍是%s" % [str(XWData.BUILD[ty]["name"]), label]
		return
	var b := _first_built(ty)
	if _dist_xy(float(u["x"]), float(u["y"]), float(b["x"]), float(b["y"])) > 1.5:
		_step_toward(u, float(b["x"]), float(b["y"]), dt)
		return
	u["doing"] = label
	if label == "練武":
		gain_xiu(u, 1.2 * 1.6 * _cult_mul() * dt)
	elif label == "閉關":
		gain_xiu(u, 1.2 * 2.4 * _cult_mul() * dt)
		if time - float(u.get("last_combat", -99)) >= 5.0:
			gongfa_tick(u, dt, 1.0)
	elif label == "研究":
		pass
	elif label == "鍛造" or label == "煉丹":
		pass

func _sit_job(u: Dictionary, dt: float) -> void:
	if float(u.get("med_cd", 0)) > 0:
		u["doing"] = "打坐冷卻中，指令仍是打坐"
		u["medit"] = false
		return
	if _enemy_near(float(u["x"]), float(u["y"]), 6.0):
		u["medit"] = false
		u["doing"] = "旁邊有敵人，先離開"
		var e := _nearest_enemy(float(u["x"]), float(u["y"]), 6.0)
		if not e.is_empty():
			_step_toward(u, float(u["x"]) - (float(e["x"]) - float(u["x"])), float(u["y"]) - (float(e["y"]) - float(u["y"])), dt)
		return
	u["medit"] = true
	u["doing"] = "打坐"
	gain_xiu(u, 1.2 * 0.7 * _cult_mul() * dt)

func _eat_job(u: Dictionary, dt: float) -> void:
	if not has_built("shitang"):
		u["doing"] = "還沒有食堂，指令仍是吃飯"
		return
	var b := _first_built("shitang")
	if _dist_xy(float(u["x"]), float(u["y"]), float(b["x"]), float(b["y"])) > 1.4:
		_step_toward(u, float(b["x"]), float(b["y"]), dt)
		return
	if int(res.food) < 1:
		u["doing"] = "食堂沒有食物，人在食堂裡等"
		return
	if time - float(u.get("ate_at", -999)) < 30.0:
		u["doing"] = "剛吃過，在食堂歇著"
		return
	res.food = int(res.food) - 1
	u["ate_at"] = time
	u["doing"] = "吃完了"
	say("%s 在食堂吃了一份食物。" % str(u.get("name")))

func _elder_dispatch() -> void:
	var has_elder := false
	for d in disciples():
		if str(d.get("post")) == "長老":
			has_elder = true
			break
	if not has_elder:
		return
	var sent_to_build := false
	for d in disciples():
		if str(d.get("order", "dai")) != "dai":
			continue
		if sent_to_build:
			d["order"] = _gather_for_cost(XWData.BUILD["hall"]["cost"]) if not has_built("hall") else "chop"
			continue
		var job := _auto_choice(d)
		if job == "build":
			sent_to_build = true
		d["order"] = job

func _build_job(u: Dictionary, dt: float) -> void:
	var b := building_by_id(int(u.get("build_id", -1)))
	if b.is_empty() or bool(b.get("built")):
		if str(u.get("order")) == "build":
			u["order"] = "dai"
		u["doing"] = "這棟蓋好了"
		return
	if _dist_xy(float(u["x"]), float(u["y"]), float(b["x"]), float(b["y"])) > 1.6:
		_step_toward(u, float(b["x"]) + _slot_offset(u), float(b["y"]), dt)
		return
	u["doing"] = "正在蓋" + str(XWData.BUILD.get(str(b["type"]), {}).get("name", "建築"))

func _fight_toward(u: Dictionary, e: Dictionary, dt: float, leash: float) -> void:
	var ax := float(u.get("anchor_x", u["x"]))
	var ay := float(u.get("anchor_y", u["y"]))
	if _dist_xy(ax, ay, float(e["x"]), float(e["y"])) > leash:
		u["doing"] = "追太遠，停在 20 格內" if leash >= 19.0 else u["doing"]
		return
	if _dist(u, e) > 1.25:
		_step_toward(u, float(e["x"]), float(e["y"]), dt)
		return
	u["atk_cd"] = float(u.get("atk_cd", 0.0)) - dt
	if float(u["atk_cd"]) <= 0.0:
		u["atk_cd"] = 1.0
		_strike(u, e, 1.0)
		if float(e.get("hp", 0)) <= 0:
			_on_kill(u, e)

func _enemy_ai(e: Dictionary, dt: float) -> void:
	if float(e.get("hp", 0)) <= 0:
		if float(e.get("dead_at", -1)) < 0:
			e["dead_at"] = time
		elif not bool(e.get("trial")) and time - float(e["dead_at"]) > 60.0:
			e["hp"] = float(e["maxhp"])
			e["x"] = float(e["home_x"])
			e["y"] = float(e["home_y"])
			e["dead_at"] = -1.0
			e["skinned"] = false
			e["shield"] = XWRules.shield_max(float(e.get("qi", 0))) if bool(e.get("boss_shield")) else 0.0
		return
	if float(e.get("stun", 0)) > 0:
		e["stun"] = float(e["stun"]) - dt
		return
	var target := _nearest_unit(float(e["x"]), float(e["y"]), float(e.get("aggro", 5)))
	if target.is_empty():
		if _dist_xy(float(e["x"]), float(e["y"]), float(e["home_x"]), float(e["home_y"])) > 0.4:
			_step_toward(e, float(e["home_x"]), float(e["home_y"]), dt)
		return
	if _dist(e, target) > 1.2:
		_step_toward(e, float(target["x"]), float(target["y"]), dt)
		return
	e["atk_cd"] = float(e.get("atk_cd", 0.0)) - dt
	if float(e["atk_cd"]) <= 0.0:
		e["atk_cd"] = 1.0
		_strike(e, target, 1.0)

func _strike(att: Dictionary, defn: Dictionary, mul: float) -> void:
	var atk_realm := int(att.get("realm", 0))
	var def_realm := int(defn.get("realm", 0))
	var raw := float(att.get("atk", 1)) * mul
	att["last_combat"] = time
	defn["last_combat"] = time
	if bool(defn.get("medit")):
		defn["medit"] = false
		defn["med_cd"] = 3.0
		defn["doing"] = "打坐被打斷"
	if float(defn.get("guard_pool", 0)) > 0 and str(defn.get("kind", "")) != "":
		var take := minf(float(defn["guard_pool"]), raw)
		defn["guard_pool"] = float(defn["guard_pool"]) - take
		raw -= take
		if raw <= 0:
			return
	if float(defn.get("shield", 0)) > 0 and (float(defn.get("qi", 0)) > 0 or bool(defn.get("boss_shield"))):
		var sd := XWRules.shield_hit(float(att.get("atk", 1)) * mul, atk_realm)
		defn["shield"] = maxf(0.0, float(defn["shield"]) - sd)
		return
	var amount := raw * XWRules.dmg_mul(atk_realm, def_realm)
	defn["hp"] = float(defn.get("hp", 0)) - amount
	if float(defn["hp"]) < 0:
		defn["hp"] = 0

func _hurt(u: Dictionary, dmg: float, src: Dictionary) -> void:
	_strike(src, u, 1.0 if float(src.get("atk", 0)) <= 0 else dmg / maxf(0.01, float(src.get("atk", dmg))))

func _on_kill(u: Dictionary, e: Dictionary) -> void:
	var xv := int(round(float(e.get("xiu", 0)) * (1.0 + float(e.get("realm", 0)) * 0.5)))
	gain_xiu(u, float(xv))
	if int(e.get("food", 0)) > 0:
		res.food = int(res.food) + int(e["food"])
	if str(e.get("type")) == "wolf" or str(e.get("type")) == "boar":
		mats["hide"] = int(mats.get("hide", 0)) + 1
		if rng.randf() < 0.35:
			mats["bone"] = int(mats.get("bone", 0)) + 1
	if str(e.get("type")) == "xfboss":
		claim_token_if_boss_down()
	say("打倒了%s。" % str(XWData.ENEMY[str(e["type"])]["n"]))

func _build_progress(dt: float) -> void:
	for b in buildings:
		if bool(b.get("built")):
			continue
		var workers := 0
		for u in units:
			if bool(u.get("dead")):
				continue
			if str(u.get("doing", "")).begins_with("正在蓋") and _dist_xy(float(u["x"]), float(u["y"]), float(b["x"]), float(b["y"])) <= 1.8:
				workers += 1
		if workers <= 0:
			var p := player()
			if _dist_xy(float(p.get("x", -99)), float(p.get("y", -99)), float(b["x"]), float(b["y"])) <= 1.8:
				workers = 1
		if workers > 0:
			var need := float(XWData.BUILD.get(str(b["type"]), {}).get("time", 10))
			b["progress"] = float(b.get("progress", 0)) + dt * float(workers) / need
			if float(b["progress"]) >= 1.0:
				b["progress"] = 1.0
				b["built"] = true
				say("%s蓋好了。" % str(XWData.BUILD.get(str(b["type"]), {}).get("name", "建築")))

func _craft_progress(dt: float) -> void:
	if craft_queue.is_empty():
		return
	if not has_built("forge"):
		return
	var job: Dictionary = craft_queue[0]
	var g: Dictionary = XWData.GEAR[str(job["id"])]
	if not _afford_mix(g["cost"]):
		say("材料不夠，打造停下來。已經排進去的不會假裝完成。")
		craft_queue.clear()
		return
	job["t"] = float(job.get("t", 0)) + dt
	if float(job["t"]) < 26.0:
		return
	_pay_mix(g["cost"])
	var realm := int(job["realm"])
	var weights := XWRules.grade_weights(realm)
	var roll := _roll()
	var acc := 0.0
	var gr := 0
	for i in weights.size():
		acc += float(weights[i])
		if roll <= acc:
			gr = i
			break
	var q := 2
	if realm >= 4 and gr >= 4:
		q = 4
	elif realm >= 4 and gr >= 3:
		q = 3
	var item := _make_gear(str(job["id"]), q, gr, realm)
	if not _give_item(item):
		say("裝不下，這一件沒有做成，材料已退回。")
		for k in g["cost"].keys():
			_add_mat(str(k), int(g["cost"][k]))
		craft_queue.pop_front()
		return
	add_prof("forge", 10)
	add_prof("craft", 10)
	craft_queue.pop_front()
	say("打成%s%s。" % [XWData.GRN[gr], str(g["n"])])

func _make_gear(id: String, q: int, gr: int, realm: int) -> Dictionary:
	var g: Dictionary = XWData.GEAR[id]
	var m := float(XWData.QMUL[clampi(q, 0, 4)]) * float(XWData.GRMUL[clampi(gr, 0, 4)])
	return {
		"id": _nid(), "t": id, "n": str(g["n"]), "q": q, "gr": gr, "realm": realm, "slot": g["slot"],
		"atk": snappedf(float(g["atk"]) * m, 0.1),
		"hp": int(round(float(g["hp"]) * m)),
		"def": snappedf(float(g["def"]) * m, 0.1),
		"spd": snappedf(float(g["spd"]) * (1.0 + float(q) * 0.2), 0.01),
	}

func _pill_progress(dt: float) -> void:
	if pill_job.is_empty():
		return
	pill_job["t"] = float(pill_job.get("t", 0)) + dt
	if float(pill_job["t"]) < 22.0:
		return
	var id := str(pill_job["id"])
	var arr: Array = pills.get(id, [0, 0, 0])
	arr[0] = int(arr[0]) + 1
	pills[id] = arr
	add_prof("pill", 10)
	add_prof("craft", 10)
	pill_job = {}
	say("煉成一顆下品丹藥。成色機率還沒有新的定案，這版先出下品。")

func _research_progress(dt: float) -> void:
	if not has_built("library"):
		return
	var working := false
	for u in units:
		if str(u.get("doing")) == "研究":
			working = true
	if not working:
		return
	if int(items.get("miji", 0)) <= 0 and float(research["miji"]) < 16.0:
		research["miji"] = float(research["miji"]) + dt
		if float(research["miji"]) >= 16.0:
			items["miji"] = int(items.get("miji", 0)) + 1
			say("長書閣研究出武學秘籍。要不要另外扣錢還沒定，這版不扣。")
		return
	if int(items.get("gongfa", 0)) <= 0 or player().get("gf", {}).is_empty():
		research["gf"] = float(research["gf"]) + dt
		if float(research["gf"]) >= 16.0:
			items["gongfa"] = maxi(1, int(items.get("gongfa", 0)))
			var gf: Dictionary = player().get("gf", {})
			if not gf.has("lieshi"):
				gf["lieshi"] = 0
				player()["gf"] = gf
			say("參悟到裂石拳譜。傳授名單裡可以選它。")

func _spar_progress(dt: float) -> void:
	if spar.is_empty():
		return
	spar["t"] = float(spar.get("t", 0)) + dt
	if float(spar["t"]) < 8.0:
		return
	var a := unit_by_id(int(spar["a"]))
	var b := unit_by_id(int(spar["b"]))
	if not a.is_empty():
		gain_xiu(a, 20)
	if not b.is_empty():
		gain_xiu(b, 20)
	say("切磋結束，兩人都有一點心得。")
	spar = {}

func _consign_progress(dt: float) -> void:
	var left: Array = []
	for c in consign:
		c["t"] = float(c.get("t", 0)) + dt
		if float(c["t"]) >= 30.0:
			res.lingshi = int(res.lingshi) + int(c["price"])
			say("寄賣的「%s」賣出，得到靈石 %d。" % [str(c.get("name")), int(c["price"])])
		else:
			left.append(c)
	consign = left

func _recruit_progress(dt: float) -> void:
	if recruit.is_empty() or bool(recruit.get("ready")):
		return
	recruit["t"] = float(recruit.get("t", 0)) + dt
	if float(recruit["t"]) < XWData.RECRUIT_TIME:
		return
	var n := rng.randi_range(3, 5)
	var cands: Array = []
	for _i in n:
		var body := _roll_body()
		var realm := 1 if rng.randf() < 0.05 else 0
		var bp := rng.randi_range(10, 50) if realm == 0 else int(XWData.STATS[realm]["bp"])
		cands.append({
			"name": _rand_name(), "body": body, "realm": realm,
			"wu": rng.randi_range(20, 95), "luck": rng.randi_range(10, 95),
			"xy": rng.randi_range(0, 40), "loyal": rng.randi_range(60, 90),
			"person": XWData.PERSONS[rng.randi_range(0, XWData.PERSONS.size() - 1)],
			"bp": bp, "float_k": rng.randf_range(0.9, 1.1),
			"age": rng.randi_range(14, 30),
		})
	recruit["cands"] = cands
	recruit["ready"] = true
	say("求武台來了 %d 個人。" % n)

func _pay_stipend(dt: float) -> void:
	stipend_acc += dt
	if stipend_acc < XWData.YEAR_SEC:
		return
	stipend_acc = 0.0
	year_paid += 1
	var due := 0.0
	for d in disciples():
		due += float(XWData.POSTS.get(str(d.get("post", "雜役")), 0.0))
	var pay := int(floor(due))
	if pay <= 0:
		return
	if int(res.lingshi) < pay:
		say("俸祿不夠發，這一年先欠著，沒有改成負數。")
		return
	res.lingshi = int(res.lingshi) - pay
	say("發了今年的俸祿，靈石 %d。" % pay)

func _cult_mul() -> float:
	if not anyone_realm_at_least(4):
		return 1.0
	var n := 0
	for b in buildings:
		if str(b.get("type")) == "house" and bool(b.get("built")):
			n += 1
	return 1.0 + minf(0.5, 0.1 * float(n))

func _step_toward(u: Dictionary, tx: float, ty: float, dt: float) -> void:
	var dx := tx - float(u["x"])
	var dy := ty - float(u["y"])
	var dist := sqrt(dx * dx + dy * dy)
	if dist < 0.18:
		u["x"] = tx
		u["y"] = ty
		return
	var spd := float(u.get("speed", 3.0)) * XWData.MOVE_MUL
	var vx := dx / dist * spd
	var vy := dy / dist * spd
	if dist > 1.2:
		for o in units:
			if int(o.get("id", -1)) == int(u.get("id", -2)) or bool(o.get("dead")):
				continue
			var ox := float(u["x"]) - float(o["x"])
			var oy := float(u["y"]) - float(o["y"])
			var od := sqrt(ox * ox + oy * oy)
			if od < 0.75 and od > 0.001:
				vx += ox / od * 1.4
				vy += oy / od * 1.4
			elif od <= 0.001:
				vx += 1.0
				vy += 0.35
	u["x"] = clampf(float(u["x"]) + vx * dt, 1.0, float(XWData.MAP_W - 2))
	u["y"] = clampf(float(u["y"]) + vy * dt, 1.0, float(XWData.MAP_H - 2))
	if int(u.get("_stuck_n", 0)) > 20:
		u["x"] = float(u["x"]) + _slot_offset(u)
		u["_stuck_n"] = 0
	else:
		var moved := absf(vx) + absf(vy)
		u["_stuck_n"] = int(u.get("_stuck_n", 0)) + 1 if moved < 0.05 else 0

func _slot_offset(u: Dictionary) -> float:
	return float(int(u.get("id", 1)) % 5) * 0.35 - 0.7

func _dist(a: Dictionary, b: Dictionary) -> float:
	return _dist_xy(float(a.get("x", 0)), float(a.get("y", 0)), float(b.get("x", 0)), float(b.get("y", 0)))

func _dist_xy(x1: float, y1: float, x2: float, y2: float) -> float:
	var dx := x1 - x2
	var dy := y1 - y2
	return sqrt(dx * dx + dy * dy)

func _nearest_enemy(x: float, y: float, r: float) -> Dictionary:
	var best: Dictionary = {}
	var bd := r
	for e in enemies:
		if float(e.get("hp", 0)) <= 0:
			continue
		if bool(e.get("trial")) != in_trial:
			continue
		var d := _dist_xy(x, y, float(e["x"]), float(e["y"]))
		if d <= bd:
			bd = d
			best = e
	return best

func _nearest_beast(x: float, y: float) -> Dictionary:
	var best: Dictionary = {}
	var bd := XWData.CHASE_MAX
	for e in enemies:
		if float(e.get("hp", 0)) <= 0:
			continue
		if str(e.get("type")) != "wolf" and str(e.get("type")) != "boar":
			continue
		var d := _dist_xy(x, y, float(e["x"]), float(e["y"]))
		if d <= bd:
			bd = d
			best = e
	return best

func _nearest_unit(x: float, y: float, r: float) -> Dictionary:
	var best: Dictionary = {}
	var bd := r
	for u in units:
		if bool(u.get("dead")):
			continue
		var d := _dist_xy(x, y, float(u["x"]), float(u["y"]))
		if d <= bd:
			bd = d
			best = u
	return best

func _nearest_node(ty: String, x: float, y: float) -> Dictionary:
	var best: Dictionary = {}
	var bd := 9999.0
	for n in nodes:
		if str(n.get("type")) != ty or int(n.get("amount", 0)) <= 0:
			continue
		var d := _dist_xy(x, y, float(n["x"]), float(n["y"]))
		if d < bd:
			bd = d
			best = n
	return best

func _enemy_near(x: float, y: float, r: float) -> bool:
	return not _nearest_enemy(x, y, r).is_empty()

func _sect_x() -> float:
	return 22.0

func _sect_y() -> float:
	return 26.0

func _afford(cost: Dictionary) -> bool:
	for k in cost.keys():
		if int(res.get(k, 0)) < int(cost[k]):
			return false
	return true

func _pay(cost: Dictionary) -> void:
	for k in cost.keys():
		res[k] = int(res.get(k, 0)) - int(cost[k])

func _afford_mix(cost: Dictionary) -> bool:
	for k in cost.keys():
		if _have_mat(str(k)) < int(cost[k]):
			return false
	return true

func _pay_mix(cost: Dictionary) -> void:
	for k in cost.keys():
		_add_mat(str(k), -int(cost[k]))

func _have_mat(k: String) -> int:
	if res.has(k):
		return int(res[k])
	return int(mats.get(k, 0))

func _add_mat(k: String, n: int) -> void:
	if res.has(k):
		res[k] = int(res[k]) + n
	else:
		mats[k] = int(mats.get(k, 0)) + n

func _cost_text(cost: Dictionary) -> String:
	var parts: Array = []
	for k in cost.keys():
		parts.append("%s %d" % [str(XWData.RES_NAME.get(k, k)), int(cost[k])])
	return "、".join(parts)

func _can_take_item() -> bool:
	if inv.size() < XWData.INV_CAP:
		return true
	if has_built("cangku") and ware.size() < XWData.WARE_CAP:
		return true
	return false

func _give_item(it) -> bool:
	if inv.size() < XWData.INV_CAP:
		inv.append(it)
		return true
	if has_built("cangku") and ware.size() < XWData.WARE_CAP:
		ware.append(it)
		return true
	return false

func _item_name(it) -> String:
	if typeof(it) != TYPE_DICTIONARY:
		return "物品"
	var n := str(it.get("n", ""))
	if n == "":
		n = str(it.get("t", "物品"))
	if n == XWData.ZHIBAO_OLD or str(it.get("tid", "")) == XWData.ZHIBAO_TID:
		return XWData.ZHIBAO_NEW
	return n

func _built_or_wip(ty: String) -> int:
	var n := 0
	for b in buildings:
		if str(b.get("type")) == ty:
			n += 1
	return n

func _free_plot(ty: String) -> Vector2:
	var plots: Array = XWData.PLOTS.get(ty, [])
	for p in plots:
		var used := false
		for b in buildings:
			if absf(float(b.get("x", -99)) - p.x) < 0.5 and absf(float(b.get("y", -99)) - p.y) < 0.5:
				used = true
		if not used:
			return p
	return Vector2(-1, -1)

func _plot_for(ty: String, idx: int) -> Vector2:
	var plots: Array = XWData.PLOTS.get(ty, [Vector2(20, 20)])
	if plots.is_empty():
		return Vector2(20 + idx % 5, 20)
	return plots[idx % plots.size()]

func _first_built(ty: String) -> Dictionary:
	for b in buildings:
		if str(b.get("type")) == ty and bool(b.get("built")):
			return b
	return {}

func _latest_wip() -> int:
	for i in range(buildings.size() - 1, -1, -1):
		if not bool(buildings[i].get("built")):
			return int(buildings[i]["id"])
	return -1

func _roll_body() -> int:
	var tot := 0
	for b in XWData.BODIES:
		tot += int(b["w"])
	var r := rng.randi_range(1, tot)
	for i in XWData.BODIES.size():
		r -= int(XWData.BODIES[i]["w"])
		if r <= 0:
			return i
	return 0

func _rand_name() -> String:
	var s := XWData.SURN.substr(rng.randi_range(0, XWData.SURN.length() - 1), 1)
	var g := XWData.GIVEN.substr(rng.randi_range(0, XWData.GIVEN.length() - 1), 1)
	if rng.randf() < 0.6:
		g += XWData.GIVEN.substr(rng.randi_range(0, XWData.GIVEN.length() - 1), 1)
	return s + g

func _spar_names() -> Array:
	var a := []
	for d in disciples():
		a.append({"id": int(d["id"]), "n": str(d["name"])})
	return a

func debug_add_disciple(x: float, y: float) -> int:
	var u := _blank_unit("disciple", x, y, 0)
	u["name"] = _rand_name()
	u["post"] = "雜役"
	u["order"] = "dai"
	u["bp"] = 30
	u["float_k"] = 1.0
	_apply_template(u, false)
	units.append(u)
	return int(u["id"])

func debug_fill_bags() -> void:
	while inv.size() < XWData.INV_CAP:
		inv.append({"t": "fill", "n": "占位", "q": 0})
	while ware.size() < XWData.WARE_CAP:
		ware.append({"t": "fill", "n": "占位", "q": 0})
