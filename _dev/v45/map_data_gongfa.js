// ================== v0.4.x map：功法掉落來源機率＋門派對照（目錄以 CultGF 為準；無自有 id）==================
// CultGF school 僅 zheng／xie／xian。faction→school 可調（MAP_TUNE.gf.schoolMap／schoolW）。
var MAP_GF_FACTION_TO_SCHOOL={
  zheng:'zheng', xie:'xie', xian:'xian',
  yao:'xie', demon:'xie',           // 妖→邪
  san:null, bandit:null             // null＝依權重抽（散修永不抽邪）
};
// 權重抽樣僅用 zheng／xie／xian；散修預設 正0.6／仙0.4，永不邪
var MAP_GF_FACTION_SCHOOL_W={
  zheng:{zheng:1},
  xie:{xie:1},
  xian:{xian:1},
  yao:{xie:1},
  demon:{xie:1},
  san:{zheng:0.6,xian:0.4},
  bandit:{zheng:0.5,xian:0.5}
};
// 來源機率（是否掉落由 map 決定；抽哪一卷交給 CultGF.rollDrop／XW_GF.list）
var MAP_GF_DROP={
  dungeon:{
    dungeon:{chance:0.05},
    maze:{chance:0.06},
    ruin:{chance:0.08},
    forbid:{chance:0.07},
    mystic:{chance:0.10}
  },
  boss:{chance:0.20}, // 真概率：無境界保證
  travel:{
    teach:{chance:0.05},
    duel:{chance:0.06},
    robbery:{chance:0.08}
  },
  sectKill:{chance:0.05},
  raid:{chance:0.06}
};
