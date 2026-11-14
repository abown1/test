class_name XWData
## 數值只抄現行總表與現行程式，不另造一套境界。

const REALM_NAMES := ["武徒", "武師", "大武師", "宗師", "煉氣", "築基", "金丹", "元嬰", "化神", "合體", "地仙"]
const NEED := [50, 120, 250, 450, 1125, 2800, 7000, 17500, 43750, 109375, 273430]
const SUCC := [0.70, 0.55, 0.40, 0.25, 0.08, 0.12, 0.08, 0.05, 0.02, 0.01, 0.005]
const LINGSHI_BREAK := {3: 20, 4: 50, 5: 120, 6: 300, 7: 700, 8: 1500, 9: 3000}
const SUB4 := ["初期", "中期", "後期", "圓滿"]
const LAYER_CN := ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]

## 初期／最高小層：氣血、攻擊、靈力。武徒另按戰力 10～50 抽，這裡是中值 30 的模板。
const STATS := {
	0: {"hp0": 3600.0, "hp1": 3690.0, "atk0": 30.0, "atk1": 34.5, "qi0": 0.0, "qi1": 0.0, "bp": 30},
	1: {"hp0": 5500.0, "hp1": 5875.0, "atk0": 125.0, "atk1": 143.8, "qi0": 0.0, "qi1": 0.0, "bp": 125},
	2: {"hp0": 6700.0, "hp1": 7255.0, "atk0": 185.0, "atk1": 212.7, "qi0": 0.0, "qi1": 0.0, "bp": 185},
	3: {"hp0": 8400.0, "hp1": 9210.0, "atk0": 270.0, "atk1": 310.5, "qi0": 0.0, "qi1": 0.0, "bp": 270},
	4: {"hp0": 10700.0, "hp1": 11855.0, "atk0": 385.0, "atk1": 442.7, "qi0": 300.0, "qi1": 345.0, "bp": 385},
	5: {"hp0": 13500.0, "hp1": 15075.0, "atk0": 525.0, "atk1": 603.8, "qi0": 500.0, "qi1": 575.0, "bp": 525},
	6: {"hp0": 17000.0, "hp1": 19100.0, "atk0": 700.0, "atk1": 805.0, "qi0": 1000.0, "qi1": 1150.0, "bp": 700},
	7: {"hp0": 22000.0, "hp1": 24850.0, "atk0": 950.0, "atk1": 1092.5, "qi0": 1500.0, "qi1": 1725.0, "bp": 950},
	8: {"hp0": 29000.0, "hp1": 32900.0, "atk0": 1300.0, "atk1": 1495.0, "qi0": 3000.0, "qi1": 3450.0, "bp": 1300},
	9: {"hp0": 38000.0, "hp1": 39975.0, "atk0": 1750.0, "atk1": 2012.5, "qi0": 7000.0, "qi1": 8050.0, "bp": 1750},
	10: {"hp0": 41000.0, "hp1": 46700.0, "atk0": 2300.0, "atk1": 2645.0, "qi0": 10000.0, "qi1": 10000.0, "bp": 2300},
}

const LIFE := [80, 80, 90, 100, 120, 200, 500, 1000, 2000, 5000, 10000]
const YEAR_SEC := 300.0

const BODIES := [
	{"n": "凡體", "w": 46, "rar": "凡品", "hp": 1.0, "atk": 1.0, "spd": 1.0, "gat": 1.0, "desc": "平凡之軀，勤能補拙"},
	{"n": "金剛體", "w": 12, "rar": "良品", "hp": 1.5, "atk": 1.1, "spd": 0.9, "gat": 1.0, "desc": "皮糙肉厚，氣血旺盛"},
	{"n": "風靈體", "w": 12, "rar": "良品", "hp": 0.9, "atk": 1.0, "spd": 1.35, "gat": 1.15, "desc": "身輕如燕，行動迅速"},
	{"n": "火靈體", "w": 11, "rar": "上品", "hp": 1.0, "atk": 1.45, "spd": 1.0, "gat": 0.9, "desc": "出手剛猛，攻擊力高"},
	{"n": "寒冰體", "w": 9, "rar": "上品", "hp": 1.15, "atk": 1.2, "spd": 1.0, "gat": 1.0, "desc": "攻擊帶寒氣，可減緩敵人"},
	{"n": "厚土體", "w": 8, "rar": "上品", "hp": 1.25, "atk": 0.9, "spd": 0.95, "gat": 1.45, "desc": "力大耐勞，採集效率高"},
	{"n": "仙武之體", "w": 2, "rar": "極品", "hp": 1.6, "atk": 1.6, "spd": 1.2, "gat": 1.3, "desc": "萬中無一。修煉門檻按現行規則計算，氣血攻擊這版跟境界模板走，不另外再乘 1.6"},
]

const SURN := "林陳李張王趙周吳鄭孫蕭沈韓楊柳葉顧蘇白秦謝唐許韋宋江陸方"
const GIVEN := "一清風雲遠明若寒青嵐霄墨辰舟星川羽衡瑤竹安嶽澄逸霜離晴松鶴凌雪玄塵"
const PERSONS := ["沉穩", "好動", "謹慎", "豪爽", "孤僻", "熱心", "倔強", "溫和"]

const RES_NAME := {
	"wood": "木材", "stone": "石材", "fiber": "纖維", "food": "食物",
	"iron": "鐵礦", "herb": "藥草", "lingshi": "靈石",
}
const NODE_RES := {
	"tree": "wood", "rock": "stone", "fiber": "fiber", "berry": "food",
	"iron": "iron", "herb": "herb", "vein": "lingshi",
}
const NODE_NAME := {
	"tree": "樹木", "rock": "石堆", "fiber": "纖維草", "berry": "漿果叢",
	"iron": "鐵礦脈", "herb": "藥草", "vein": "靈石脈",
}
const NODE_MAX := {"tree": 50, "rock": 70, "fiber": 35, "berry": 45, "iron": 60, "herb": 16, "vein": 40}

const BUILD := {
	"hall": {"name": "宗門大殿", "cost": {"wood": 30, "stone": 20, "fiber": 10}, "time": 12.0, "hp": 800, "pop": 2, "desc": "宗門核心。弟子把採集搬回這裡。弟子上限 +2。"},
	"altar": {"name": "求武台", "cost": {"wood": 40, "stone": 30}, "time": 9.0, "hp": 400, "pop": 0, "desc": "進室內招募。有人到煉氣後可升成求仙台。"},
	"house": {"name": "住房", "cost": {"wood": 25, "fiber": 15}, "time": 7.0, "hp": 300, "pop": 3, "desc": "弟子上限 +3。有人到煉氣後，每座讓全宗修煉 +10%，最多 +50%。"},
	"wudao": {"name": "武道館", "cost": {"wood": 60, "stone": 40}, "time": 14.0, "hp": 600, "pop": 0, "desc": "進室內練武。最多 6 人。"},
	"lianwu": {"name": "練武閣", "cost": {"wood": 50, "stone": 60, "iron": 10}, "time": 14.0, "hp": 500, "pop": 0, "desc": "進室內閉關。武師升大武師要有這棟。"},
	"library": {"name": "長書閣", "cost": {"wood": 70, "stone": 30, "fiber": 30}, "time": 16.0, "hp": 450, "pop": 0, "desc": "研究武學秘籍和功法。要先有武道館。"},
	"alchemy": {"name": "煉丹房", "cost": {"wood": 50, "stone": 40, "herb": 5}, "time": 14.0, "hp": 450, "pop": 0, "desc": "煉丹。要先有長書閣。"},
	"forge": {"name": "鍛造坊", "cost": {"wood": 50, "stone": 50, "iron": 10}, "time": 14.0, "hp": 550, "pop": 0, "desc": "打造兵器衣甲。要先有武道館。數量沒有上限。"},
	"xianyuan": {"name": "仙緣閣", "cost": {"wood": 60, "stone": 40, "lingshi": 20}, "time": 18.0, "hp": 500, "pop": 0, "desc": "有人到煉氣才解鎖。"},
	"shitang": {"name": "食堂", "cost": {"wood": 30, "stone": 10, "food": 5}, "time": 8.0, "hp": 280, "pop": 0, "desc": "武徒就能蓋。弟子吃飯要走進這裡。"},
	"cangku": {"name": "倉庫", "cost": {"wood": 40, "stone": 40}, "time": 12.0, "hp": 400, "pop": 0, "desc": "宗師解鎖。格子數官方沒有另訂，這版先跟行囊一樣 60 格。"},
	"renwutang": {"name": "任務堂", "cost": {"wood": 35, "stone": 20, "fiber": 10}, "time": 10.0, "hp": 320, "pop": 0, "desc": "武師解鎖。任務板只在這裡看。"},
	"gongfage": {"name": "功法閣", "cost": {"wood": 40, "stone": 20, "fiber": 20}, "time": 12.0, "hp": 360, "pop": 0, "desc": "大武師解鎖。傳授功法。宗主免費，弟子扣俸祿。"},
	"biwutai": {"name": "比武台", "cost": {"wood": 40, "stone": 40}, "time": 12.0, "hp": 500, "pop": 0, "desc": "大武師解鎖。切磋要進這裡選人。"},
	"kuangchang": {"name": "礦場", "cost": {"wood": 30, "stone": 20, "iron": 5}, "time": 12.0, "hp": 400, "pop": 0, "desc": "宗師解鎖。每級加幾成產鐵還沒定，這版不加隱藏倍率，弟子會到這裡挖鐵。"},
	"waishitang": {"name": "外事堂", "cost": {"wood": 40, "stone": 30, "fiber": 10}, "time": 12.0, "hp": 360, "pop": 0, "desc": "宗師解鎖。裡面可以寄賣，也可以買賣藥草。"},
	"zhifatang": {"name": "執法堂", "cost": {"wood": 40, "stone": 30}, "time": 12.0, "hp": 400, "pop": 0, "desc": "宗師解鎖。有這棟才能任命執法。"},
}

const BUILD_ORDER := ["hall", "altar", "house", "shitang", "wudao", "lianwu", "library", "forge", "alchemy", "renwutang", "gongfage", "biwutai", "cangku", "waishitang", "kuangchang", "zhifatang", "xianyuan"]

const PLOTS := {
	"hall": [Vector2(18, 22)],
	"altar": [Vector2(24, 22)],
	"house": [Vector2(18, 28), Vector2(18, 32), Vector2(30, 22), Vector2(34, 22), Vector2(34, 26)],
	"wudao": [Vector2(24, 28)],
	"lianwu": [Vector2(28, 28)],
	"library": [Vector2(24, 34)],
	"alchemy": [Vector2(28, 34)],
	"forge": [Vector2(32, 28)],
	"shitang": [Vector2(14, 26)],
	"cangku": [Vector2(32, 34)],
	"renwutang": [Vector2(14, 30)],
	"biwutai": [Vector2(36, 30)],
	"gongfage": [Vector2(36, 34)],
	"kuangchang": [Vector2(40, 28)],
	"waishitang": [Vector2(14, 34)],
	"zhifatang": [Vector2(40, 34)],
	"xianyuan": [Vector2(40, 22)],
}

const ORDERS := [
	["dai", "待命"], ["follow", "跟隨"], ["chop", "砍伐"], ["mine", "採石"],
	["fiber", "採纖維"], ["food", "採食"], ["iron", "採鐵"], ["herb", "採藥"],
	["fight", "戰鬥"], ["hunt", "狩獵"], ["guard", "守衛"], ["train", "練武"],
	["retreat", "閉關"], ["sit", "打坐"], ["eat", "吃飯"], ["forge", "鍛造"],
	["pill", "煉丹"], ["research", "研究"], ["auto", "交由弟子指派"],
]

const POSTS := {
	"雜役": 2.0 / 30.0, "外門": 4.0 / 30.0, "內門": 8.0 / 30.0,
	"外事": 12.0 / 30.0, "執法": 15.0 / 30.0, "長老": 20.0 / 30.0,
}

const GEAR := {
	"sword": {"n": "長劍", "slot": "w", "atk": 4.0, "hp": 0.0, "def": 0.0, "spd": 0.0, "cost": {"iron": 6, "wood": 2}, "realm": 0},
	"saber": {"n": "環首刀", "slot": "w", "atk": 5.0, "hp": 5.0, "def": 0.0, "spd": 0.0, "cost": {"iron": 8, "wood": 2}, "realm": 0},
	"spear": {"n": "長槍", "slot": "w", "atk": 4.5, "hp": 0.0, "def": 0.0, "spd": 0.05, "cost": {"iron": 6, "wood": 4}, "realm": 0},
	"fist": {"n": "拳套", "slot": "w", "atk": 3.0, "hp": 0.0, "def": 0.0, "spd": 0.15, "cost": {"hide": 2, "fiber": 4, "iron": 2}, "realm": 0},
	"robe": {"n": "青布道袍", "slot": "a", "atk": 0.0, "hp": 20.0, "def": 2.0, "spd": 0.0, "cost": {"fiber": 10, "hide": 1}, "realm": 0},
	"leather": {"n": "獸皮甲", "slot": "a", "atk": 0.0, "hp": 30.0, "def": 4.0, "spd": 0.0, "cost": {"hide": 5, "iron": 3}, "realm": 0},
	"talisman": {"n": "護身符", "slot": "c", "atk": 0.0, "hp": 10.0, "def": 1.0, "spd": 0.0, "cost": {"fiber": 3, "lingshi": 2, "bone": 1}, "realm": 0},
	"jade": {"n": "玉佩", "slot": "c", "atk": 1.5, "hp": 0.0, "def": 0.0, "spd": 0.05, "cost": {"stone": 6, "lingshi": 3}, "realm": 0},
	"faqi": {"n": "飛梭法器", "slot": "f", "atk": 6.0, "hp": 15.0, "def": 0.0, "spd": 0.0, "cost": {"xuantie": 1, "lingshi": 10, "core": 1}, "realm": 4},
}
const QMUL := [1.0, 1.3, 1.7, 2.3, 3.2]
const QN := ["凡品", "良品", "精品", "靈器", "法寶"]
const GRN := ["下品", "中品", "上品", "極品", "仙器"]
const GRMUL := [1.0, 1.05, 1.10, 1.15, 1.5]

const PILLS := {
	"hx": {"n": "回血丹", "cost": {"herb": 3}, "desc": "立刻回氣血。下品 35%。"},
	"jq": {"n": "聚氣丹", "cost": {"herb": 5, "lingshi": 1, "bone": 1}, "desc": "增加這一小層需求的 12% 修為。連吃會累丹毒，越吃越沒效。"},
	"tp": {"n": "突破丹", "cost": {"herb": 6, "lingshi": 3, "core": 1}, "desc": "下一次大境界突破，失敗率減少 8 個百分點。"},
	"xs": {"n": "洗髓丹", "cost": {"herb": 8, "lingshi": 5, "lingzhi": 1, "bone": 2}, "desc": "悟性 +3。下品有一成機會覺醒靈根。每人最多 3 顆。"},
	"zj": {"n": "築基丹", "cost": {"herb": 10, "lingshi": 10, "core": 2, "lingzhi": 1}, "desc": "煉氣再往上才用得到。這次里程碑先能煉，不能拿來突破。"},
}

const GONGFA := [
	{"id": "lieshi", "n": "裂石拳譜", "realm": 0, "desc": "武徒拳譜。參悟滿了，普攻傷害提高一成。"},
	{"id": "songfeng", "n": "松風步法", "realm": 1, "desc": "武師身法。參悟滿了，移動稍快。"},
	{"id": "tiegu", "n": "鐵骨吐納", "realm": 2, "desc": "大武師吐納。參悟滿了，氣血上限提高一成。"},
	{"id": "changhe", "n": "長河劍意", "realm": 3, "desc": "宗師劍意。參悟滿了，攻擊提高一成。"},
	{"id": "yinquan", "n": "引泉訣", "realm": 4, "desc": "煉氣引氣。參悟滿了，靈力提高一成。"},
]
const GF_STAGES := ["參悟中", "入門", "初學", "小有所成", "熟練", "大有所成", "精熟", "出神入化", "圓滿"]

const ENEMY := {
	"wolf": {"n": "妖狼", "hp": 45, "atk": 6, "spd": 2.3, "xiu": 12, "food": 8, "aggro": 5.0, "leash": 14.0},
	"boar": {"n": "鐵背野豬", "hp": 85, "atk": 9, "spd": 2.2, "xiu": 20, "food": 14, "aggro": 4.0, "leash": 12.0},
	"bandit": {"n": "山賊", "hp": 60, "atk": 7, "spd": 2.6, "xiu": 18, "food": 0, "aggro": 6.0, "leash": 16.0},
	"xfguard": {"n": "仙門金甲衛", "hp": 260, "atk": 21, "spd": 2.4, "xiu": 60, "food": 0, "aggro": 10.0, "leash": 50.0},
	"xfboss": {"n": "守門天將", "hp": 1800, "atk": 34, "spd": 2.1, "xiu": 400, "food": 0, "aggro": 12.0, "leash": 60.0},
}

const SKILLS := {
	"charge": {"n": "衝鋒", "realm": 1, "cd": 8.0, "mul": 1.6, "desc": "衝向近處的敵人，1.6 倍傷害並擊暈 1 秒。"},
	"sweep": {"n": "橫掃", "realm": 2, "cd": 10.0, "mul": 1.2, "desc": "打身邊的敵人，1.2 倍傷害。"},
	"guard": {"n": "氣勁護體", "realm": 3, "cd": 25.0, "mul": 1.0, "desc": "氣血低於 65% 時才能開。吸收相當於 40% 氣血上限的傷害。這不是靈氣護盾。"},
	"fireball": {"n": "御氣・火球", "realm": 4, "cd": 4.0, "mul": 2.2, "desc": "打 6 格內的敵人，2.2 倍傷害。"},
}

const INV_CAP := 60
const WARE_CAP := 100
const ZHIBAO_OLD := "赤霄四劍圖"
const ZHIBAO_NEW := "四鋒束域圖"
const ZHIBAO_TID := "zbt09"
const CARRY_CAP := 10
const RECRUIT_COST := 20
const RECRUIT_TIME := 4.0
const CHASE_MAX := 20.0
const MOVE_MUL := 0.72
const PLAYER_SPEED := 3.5
const DISC_SPEED := 3.0
const HERB_PRICE := 5
const TAX := 0.15
const MAP_W := 80
const MAP_H := 52

static func realm_name(i: int) -> String:
	if i < 0 or i >= REALM_NAMES.size():
		return "未知境界"
	return REALM_NAMES[i]

static func is_xw(u: Dictionary) -> bool:
	return int(u.get("body", -1)) == 6

static func order_name(id: String) -> String:
	if id == "build":
		return "蓋房子"
	for pair in ORDERS:
		if pair[0] == id:
			return pair[1]
	return id

static func gongfa_by_id(id: String) -> Dictionary:
	for g in GONGFA:
		if g["id"] == id:
			return g
	return {}
