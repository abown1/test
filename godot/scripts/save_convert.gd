class_name XWSave
## 讀舊版網頁存檔，轉成新版。只讀，不改傳進來的那一份。

const KEEP_RES := ["wood", "stone", "fiber", "food", "iron", "herb", "lingshi"]

static func hash_str(s: String) -> String:
	var h := 0x811c9dc5
	for i in s.length():
		var c := s.unicode_at(i) & 0xFFFF
		h = (h ^ c) & 0xFFFFFFFF
		h = (h * 0x01000193) & 0xFFFFFFFF
	return "%x" % h

static func convert_text(text: String) -> Dictionary:
	var data = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY:
		return {"ok": false, "msg": "這份文字不是存檔，沒有轉入。"}
	return convert_any(data)

static func convert_any(data: Dictionary) -> Dictionary:
	if data.has("rec") and typeof(data["rec"]) == TYPE_DICTIONARY:
		return convert_any(data["rec"])
	if data.has("data") and typeof(data["data"]) == TYPE_STRING and data.has("meta"):
		var body: String = data["data"]
		if data.has("sum") and str(data["sum"]) != "" and hash_str(body) != str(data["sum"]):
			return {"ok": false, "msg": "檢查碼不符，這份沒有轉入，原檔也不會改。"}
		var inner = JSON.parse_string(body)
		if typeof(inner) != TYPE_DICTIONARY:
			return {"ok": false, "msg": "存檔內容壞了，沒有轉入。"}
		var pack := convert_snapshot(inner)
		if pack.get("ok", false) and typeof(data["meta"]) == TYPE_DICTIONARY:
			pack["save"]["slot_meta"] = (data["meta"] as Dictionary).duplicate(true)
		return pack
	return convert_snapshot(data)

static func convert_snapshot(d: Dictionary) -> Dictionary:
	if typeof(d.get("units", null)) != TYPE_ARRAY:
		return {"ok": false, "msg": "這份存檔沒有人物，沒有轉入。"}
	var src: Dictionary = d.duplicate(true)
	var res := {}
	var raw_res: Dictionary = src.get("res", {}) if typeof(src.get("res")) == TYPE_DICTIONARY else {}
	for k in KEEP_RES:
		res[k] = int(raw_res.get(k, 0))
	var vault := {}
	var econ = src.get("econ", null)
	if typeof(econ) == TYPE_DICTIONARY and typeof(econ.get("vault", null)) == TYPE_DICTIONARY:
		vault = (econ["vault"] as Dictionary).duplicate(true)
	var items := {}
	if typeof(src.get("items")) == TYPE_DICTIONARY:
		items = (src["items"] as Dictionary).duplicate(true)
	var mats := {}
	if typeof(src.get("mats")) == TYPE_DICTIONARY:
		mats = (src["mats"] as Dictionary).duplicate(true)
	var pills := {}
	if typeof(src.get("pills")) == TYPE_DICTIONARY:
		pills = (src["pills"] as Dictionary).duplicate(true)
	var inv: Array = (src["inv"] as Array).duplicate(true) if typeof(src.get("inv")) == TYPE_ARRAY else []
	var units: Array = []
	var disciples := 0
	var player_realm := 0
	var player_name := ""
	for u in src["units"]:
		if typeof(u) != TYPE_DICTIONARY:
			continue
		var uu: Dictionary = (u as Dictionary).duplicate(true)
		units.append(uu)
		if str(uu.get("kind", "")) == "player":
			player_realm = int(uu.get("realm", 0))
			player_name = str(uu.get("name", "你"))
		elif str(uu.get("kind", "")) == "disciple":
			disciples += 1
	var buildings: Array = []
	if typeof(src.get("buildings")) == TYPE_ARRAY:
		for b in src["buildings"]:
			if typeof(b) == TYPE_DICTIONARY:
				buildings.append((b as Dictionary).duplicate(true))
	_rename_zhibao(inv)
	_rename_zhibao(units)
	_rename_zhibao(buildings)
	_rename_zhibao(items)
	var save := {
		"fmt": "xianwu_godot_1",
		"from": "js",
		"kept_original": true,
		"v_old": src.get("v", null),
		"seed": int(src.get("seed", 1)),
		"time": float(src.get("time", 0)),
		"res": res,
		"vault": vault,
		"items": items,
		"mats": mats,
		"pills": pills,
		"inv": inv,
		"units": units,
		"buildings": buildings,
		"flags": (src["flags"] as Dictionary).duplicate(true) if typeof(src.get("flags")) == TYPE_DICTIONARY else {},
		"legacy": src,
	}
	var summary := {
		"lingshi": int(res["lingshi"]),
		"vault_xia": int(vault.get("xia", res["lingshi"])) if not vault.is_empty() else int(res["lingshi"]),
		"wood": int(res["wood"]),
		"stone": int(res["stone"]),
		"fiber": int(res["fiber"]),
		"food": int(res["food"]),
		"iron": int(res["iron"]),
		"herb": int(res["herb"]),
		"disciples": disciples,
		"buildings": buildings.size(),
		"inv": inv.size(),
		"player_realm": player_realm,
		"player_realm_name": XWData.realm_name(clampi(player_realm, 0, 10)),
		"player_name": player_name,
		"xfl": int(items.get("xfl", 0)),
		"miji": int(items.get("miji", 0)),
		"gongfa": int(items.get("gongfa", 0)),
	}
	return {"ok": true, "msg": "已轉成新版。舊檔留在原地，沒有覆蓋。", "save": save, "summary": summary}

static func _rename_zhibao(node) -> void:
	if typeof(node) == TYPE_DICTIONARY:
		var tid := str(node.get("tid", ""))
		var prev := str(node.get("n", node.get("name", "")))
		if prev == XWData.ZHIBAO_OLD or tid == XWData.ZHIBAO_TID:
			if prev != "" and prev != XWData.ZHIBAO_NEW:
				node["old_n"] = prev
			node["n"] = XWData.ZHIBAO_NEW
			if str(node.get("name", "")) == XWData.ZHIBAO_OLD:
				node["name"] = XWData.ZHIBAO_NEW
		for k in node.keys():
			_rename_zhibao(node[k])
	elif typeof(node) == TYPE_ARRAY:
		for child in node:
			_rename_zhibao(child)

static func same_assets(summary: Dictionary, expect: Dictionary) -> bool:
	for k in expect.keys():
		if str(summary.get(k)) != str(expect[k]):
			return false
	return true
