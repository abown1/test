// ================== v0.4.x map PHASE5：途中遭遇權重／文案（原創）==================
var MAP_TRAVEL_TUNE={
  flySec:[8,14],          // 飛行時長
  encChance:0.20,         // 途中觸發遭遇機率（真概率）
  encResolveSec:[3,6],    // 遭遇結算耗時
  maxConcurrent:3,        // 同時進行 ≤3（對齊 MAP_TUNE.spawn.travelEnc）
  teachXiu:[8,20],        // 互傳修煉經驗（抽象點）
  tradeRel:+3,
  tradeLs:null,           // null＝隨機 2–5 靈石

  duelWinRel:-4,
  robRel:-10,
  banterRel:+1
};
var MAP_TRAVEL_ENC=[
  {k:'ignore',n:'無視',w:1.2,desc:'雙方目光一錯即過，各自趕路'},
  {k:'trade',n:'交易',w:1.0,desc:'以靈石／材料小額互通有無'},
  {k:'teach',n:'互傳經驗',w:0.9,desc:'道上論法，互贈修煉心得'},
  {k:'duel',n:'比武',w:1.0,desc:'點到為止，分出高下'},
  {k:'robbery',n:'劫殺',w:0.8,desc:'起了貪念，拔刀相向'},
  {k:'banter',n:'嘴炮',w:1.1,desc:'言語交鋒，無傷大雅'}
];
