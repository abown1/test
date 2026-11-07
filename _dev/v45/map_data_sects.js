// ================== v0.4.x map PHASE3：七大宗（原創名）＋外交初值／AI 權重 ==================
// 正：青衡門／白渚觀／玄衡院；邪：赤燼谷／幽羅殿；仙：星渚宮／霜潮閣
// 大殿錨在中央 128（off=80 → [80,208)）之外
var MAP_SECT_TUNE={
  tickAcc:5,              // 累積秒數後做一次決策
  dailyRefresh:40,        // 日常訂單刷新間隔（模擬秒）
  outingDur:[25,45],      // 遠征持續
  relDrift:0.15,          // 每 tick 關係自然回中性的力
  raidRel:-12,
  claimRel:-6,            // 搶山對原主
  escortRel:+2,
  diploCd:90,             // 外交狀態變更冷卻
  npcsPerSect:[8,10],     // 每宗 NPC 數（受全域 cap 裁切）
  realmElder:[5,7],       // 長老境界 idx
  realmDisc:[3,5],
  weights:{               // 需求權重基底
    farm:1.2,mine:0.9,refine:0.85,patrol:1.0,guard:1.1,
    claim_mount:1.4,escort:0.7,raid:1.0,contest:0.8
  }
};
var MAP_SECTS=[
  {id:'qingheng',n:'青衡門',align:'zheng',hall:{x:55,y:100},territory:[{cx:55,cy:100,r:24}],power0:48,temper:0.35},
  {id:'baizhu',n:'白渚觀',align:'zheng',hall:{x:110,y:55},territory:[{cx:110,cy:55,r:22}],power0:44,temper:0.25},
  {id:'xuanheng',n:'玄衡院',align:'zheng',hall:{x:175,y:55},territory:[{cx:175,cy:55,r:22}],power0:46,temper:0.30},
  {id:'chijin',n:'赤燼谷',align:'xie',hall:{x:55,y:220},territory:[{cx:55,cy:220,r:24}],power0:50,temper:0.70},
  {id:'youluo',n:'幽羅殿',align:'xie',hall:{x:230,y:100},territory:[{cx:230,cy:100,r:22}],power0:47,temper:0.65},
  {id:'xingzhu',n:'星渚宮',align:'xian',hall:{x:230,y:220},territory:[{cx:230,cy:220,r:24}],power0:52,temper:0.40},
  {id:'shuangchao',n:'霜潮閣',align:'xian',hall:{x:175,y:235},territory:[{cx:175,cy:235,r:22}],power0:45,temper:0.45}
];
// 可選覆寫對；未列出者由 align 推導
var MAP_DIPLO_INIT=[
  {a:'qingheng',b:'baizhu',rel:35,state:'peace'},
  {a:'qingheng',b:'xuanheng',rel:30,state:'peace'},
  {a:'baizhu',b:'xuanheng',rel:28,state:'peace'},
  {a:'chijin',b:'youluo',rel:-15,state:'rival'},
  {a:'xingzhu',b:'shuangchao',rel:32,state:'peace'},
  {a:'qingheng',b:'chijin',rel:-45,state:'rival'},
  {a:'xuanheng',b:'youluo',rel:-40,state:'rival'},
  {a:'xingzhu',b:'chijin',rel:-25,state:'rival'}
];
function mapDiploKey(a,b){return a<b?a+'|'+b:b+'|'+a;}
function mapDiploDefault(aAlign,bAlign){
  if(aAlign===bAlign){
    if(aAlign==='zheng')return {rel:28,state:'peace'};
    if(aAlign==='xian')return {rel:26,state:'peace'};
    return {rel:-12,state:'rival'};
  }
  if((aAlign==='zheng'&&bAlign==='xie')||(aAlign==='xie'&&bAlign==='zheng'))return {rel:-42,state:'rival'};
  if((aAlign==='xian'&&bAlign==='xie')||(aAlign==='xie'&&bAlign==='xian'))return {rel:-22,state:'rival'};
  return {rel:6,state:'neutral'};
}
