class_name XWRules
## 純規則。畫面和存檔都呼叫這裡，避免同一個數字兩套算法。

const NEED_K := 4.76
const NEED_MUL := 1.3
const XIU_MUL := 0.45

const OUT_NAT := [0.025, 0.022, 0.020, 0.018, 0.016, 0.014, 0.012, 0.010, 0.0085, 0.007, 0.006]
const SIT := [0.050, 0.045, 0.042, 0.040, 0.036, 0.033, 0.030, 0.028, 0.025, 0.022, 0.020]
const RETREAT := [0.040, 0.038, 0.035, 0.032, 0.030, 0.028, 0.025, 0.022, 0.020, 0.018, 0.015]
const HOUSE := [0.060, 0.055, 0.050, 0.048, 0.045, 0.042, 0.038, 0.035, 0.032, 0.028, 0.025]
const TRAIN := [0.0080, 0.0075, 0.0070, 0.0065, 0.0060, 0.0055, 0.0050, 0.0045, 0.0040, 0.0035, 0.0030]

static func layer_count(realm: int) -> int:
	return 4 if realm < 4 else 10

static func sub_name(realm: int, sub: int) -> String:
	if realm < 4:
		return XWData.SUB4[clampi(sub, 0, 3)]
	if sub >= 9:
		return "大圓滿"
	return XWData.LAYER_CN[clampi(sub, 0, 8)] + "層"

static func layer_weight(realm: int, sub: int) -> float:
	if realm < 4:
		var w := [0.15, 0.25, 0.30, 0.30]
		return w[clampi(sub, 0, 3)]
	if sub >= 9:
		return 0.30
	if sub >= 6:
		return 0.30 / 3.0
	if sub >= 3:
		return 0.25 / 3.0
	return 0.15 / 3.0

static func need_at(realm: int, sub: int) -> int:
	realm = clampi(realm, 0, 10)
	var base: float = float(XWData.NEED[realm])
	var v: float = round(base * NEED_K * NEED_MUL * layer_weight(realm, sub))
	return maxi(1, int(v))

static func stats_for(realm: int, sub: int, float_k: float, bp_roll: int) -> Dictionary:
	realm = clampi(realm, 0, 10)
	var t: Dictionary = XWData.STATS[realm]
	var n := layer_count(realm) - 1
	var g := 0.0 if n <= 0 else float(clampi(sub, 0, n)) / float(n)
	var hp: float
	var atk: float
	var qi: float
	if realm == 0:
		var hp_base := (3000.0 + float(bp_roll) * 20.0) * float_k
		var atk_base := float(bp_roll) * float_k
		hp = lerpf(hp_base, hp_base * (3690.0 / 3600.0), g)
		atk = lerpf(atk_base, atk_base * (34.5 / 30.0), g)
		qi = 0.0
	else:
		hp = lerpf(float(t.hp0), float(t.hp1), g) * float_k
		atk = lerpf(float(t.atk0), float(t.atk1), g) * float_k
		qi = lerpf(float(t.qi0), float(t.qi1), g) * float_k
	return {"hp": maxi(1, int(round(hp))), "atk": snappedf(atk, 0.1), "qi": maxi(0, int(round(qi)))}

static func regen_per_sec(max_hp: float, realm: int, activity: String, in_combat: bool, equip_pct: float = 0.0, equip_flat: float = 0.0, heal_eff: float = 0.0) -> float:
	realm = clampi(realm, 0, 10)
	var base: float = float(OUT_NAT[realm])
	match activity:
		"sit":
			base = SIT[realm]
		"retreat":
			base = RETREAT[realm]
		"house":
			base = HOUSE[realm]
		"train":
			base = TRAIN[realm]
		_:
			base = OUT_NAT[realm]
	var state := 0.20 if in_combat else 1.0
	var cap_pct := 0.035 if in_combat else 0.120
	var raw: float = (max_hp * (base + equip_pct) + equip_flat) * state
	return maxf(0.0, minf(max_hp * cap_pct, raw * (1.0 + heal_eff)))

static func shield_max(lingli: float) -> float:
	return maxf(0.0, lingli * 0.5)

static func shield_hit(total_atk: float, attacker_realm: int) -> float:
	var d := total_atk * 0.01
	if d < 0.1:
		return 0.0
	if attacker_realm <= 3 and d > 4.0:
		return 4.0
	return d

static func dmg_mul(atk_realm: int, def_realm: int) -> float:
	var gap := atk_realm - def_realm
	return clampf(1.0 + float(gap) * 0.05, 0.9, 1.1)

static func fail_chance(u: Dictionary) -> float:
	var r := int(u.get("realm", 0))
	var wu := float(u.get("wu", 0))
	var luck := float(u.get("luck", 0))
	var xw := XWData.is_xw(u)
	if r == 3:
		var lg_pen := 0.0
		var lg = u.get("lg", null)
		if typeof(lg) == TYPE_DICTIONARY:
			lg_pen = [0.05, 0.15, 0.30][clampi(int(lg.get("q", 0)), 0, 2)]
		var inner := 0.55 - wu * 0.004 - luck * 0.001 - (0.25 if xw else 0.0) - lg_pen
		inner = clampf(inner, 0.05, 0.9)
		return clampf(inner + 0.20, 0.05, 0.92)
	var f: float = (1.0 - float(XWData.SUCC[clampi(r, 0, 10)])) - wu * 0.002 - luck * 0.0008
	if xw:
		f -= 0.08
	f -= float(u.get("tp_b", 0.0))
	var lo := 0.02 if r <= 1 else 0.04
	return clampf(f, lo, 0.9)

static func gongfa_need(stage: int) -> int:
	if stage < 0:
		return 100
	if stage >= 8:
		return 0
	var v := 100
	for _i in stage:
		v *= 3
	return v

static func gongfa_mul(user_realm: int, gf_realm: int, hall_lv: int) -> float:
	var gap := maxi(0, user_realm - gf_realm)
	var m := pow(5.0, gap)
	var hall := 1.0 + 0.03 * float(clampi(hall_lv, 0, 10))
	return m * hall

static func prof_need(level: int) -> int:
	if level >= 100:
		return 0
	var v := 100
	for _i in maxi(0, level):
		v *= 3
	return v

static func grade_weights(item_realm: int) -> Array:
	if item_realm <= 3:
		return [0.555, 0.28, 0.12, 0.045, 0.0]
	return [0.55, 0.28, 0.12, 0.045, 0.005]
