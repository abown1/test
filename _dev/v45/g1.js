<script>
'use strict';
(function(){
// ================== 常數 ==================
const TW=64,TH=32,HW=32,HH=16,CS=16,PADT=30;
// g24 世界尺寸：煉氣前 N=128（與舊版完全相同）；煉氣後世界 N=288（舊 128 置中偏移 80）。副本格固定 DG_N=128（進副本時暫切 N=128）。
let N=128,NCH=N/CS;const DG_N=128;
const SAVE_KEY='xianwu_demo_save_v3',OLD_SAVE_KEY='xianwu_demo_save_v1',SAVE_VER=7;
// ================== v0.3.3 平衡調整（集中在這裡，方便之後再調）==================
const TUNE={
  moveMul:0.72,          // 全體移動速度倍率：主角、弟子、敵人、村民一起放慢約 28%（相對速度不變，戰鬥一樣公平）
  medHpPlayer:0.05,     // 主角「打坐」每秒額外回復最大氣血 5%（加上原本的自然回血，實際約 7～8%／秒；受到攻擊就中斷）
  medHpDisciple:0.04,   // 弟子打坐／在練武閣閉關：每秒額外回復最大氣血 4%（加上自然回血實際約 6～9%／秒）
  restHp:0.06,           // 弟子在住房（洞府）休息：每秒回復最大氣血 6%
  trainHp:0.01,          // 在武道館練武：每秒 1%
  firstRaid:[900,1200],  // 第一次山賊襲擊：最近的山寨約 15 分鐘後、其他山寨約 20 分鐘後（原本 7／10 分鐘）
  raidEvery:[660,960],   // 之後每次襲擊間隔 11～16 分鐘隨機（原本 5～7 分鐘，約 2 倍以上）
  raidCool:420,          // BATCH2100：擊退後全域冷卻約 7 遊戲分，避免連發
  raidWarn:20,           // 襲擊前的警報秒數（原本 12 秒）
  // ---- v0.4.0 逐出／流浪者 ----
  kickRep:2,             // 逐出一名弟子：所有村莊關係 -2
  kickFav:-40,           // 被逐弟子對宗門的好感（<0 要先贈禮才肯回來）
  candFav:5,             // 落選候選人／自然流浪者的好感
  giftFav:15,            // 贈禮一次好感 +15
  talkDist:3,            // 主角要走到多近才能交談（格）
  wanderJoin:[240,480],  // 流浪者 4～8 分鐘後投靠目前所在的村莊（當村衛）或山寨（當山賊）
  wanderStay:[20,45],    // 在一個聚落逗留的秒數
  wanderCap:14,          // 地圖上流浪者總數上限
  wanderNatural:4,       // 自然出現的流浪者最多幾位
  wanderSpawn:[120,240], // 自然流浪者出現間隔（秒）
  guardsPer:4,           // 每個村莊最多幾名村衛
  // ---- v0.4.0 求武台候選人 ----
  candBatch:[3,5],       // 每次感應來幾位候選人
  candWait:300,          // 候選人等幾秒，沒被選就變成流浪者
  candRefreshCd:30,      // 「再感應一批」冷卻秒數（費用同招募）
  candRealm1:0.05,       // 候選人一開始就是「武師」的機率（真概率）
  xwChance:0.015,        // 候選人／流浪者身負「仙武之體」的機率（1.5%）
  // ---- v0.4.0 世界刷新（效能優先）----
  nodeRegrow:{tree:[240,420],rock:[360,600],fiber:[120,240],berry:[150,270],iron:[480,780],herb:[200,360],vein:[720,1080]}, // 採光後幾秒在同一區塊隨機位置長回
  nodeAmt:[0.6,1.4],     // 資源量隨機倍率（相對原本的上限）
  nodeTick:2,            // 每 2 秒檢查一次重生
  nodePerTick:3,         // 每次最多長回 3 個（分散到很多幀，不會卡）
  nodeVisWait:90,        // 一直找不到鏡頭外的位置時，最多再等 90 秒就在畫面內「長出來」（有生長動畫）
  nodeTrickle:0.05,      // 被採過但沒採光的資源點：每輪回復 5%
  nodeTrickleScan:120,   // 每 120 秒把所有資源點輪過一遍（每幀只處理一小段）
  villagersPer:5,        // 每村至少幾位村民（少了就在鏡頭外補回）
  maxEnemies:190,        // 敵人／野獸總數上限（超過就移除離鏡頭最遠的野獸）
  farLod:0.5,            // 遠離鏡頭的流浪者每 0.5 秒才更新一次
  // ---- v0.4.0 建築升級／拆除 ----
  lvCost:[1.2,2.0],      // 升 Lv2／Lv3 的費用＝原本建造費 ×1.2／×2.0（Lv3 另需鐵礦 lv3Iron）
  lv3Iron:10,
  lvTime:[1.5,2.2,2.8,3.4,4.0], // 升級工時（Lv2～Lv6）
  lvHp:0.4,              // 每升一級耐久 +40%
  lvXiu:0.15,            // 館內修為每級 +15%
  demoUnbuilt:1.0,       // 還沒蓋好就拆：全額退回
  demoRefund:[0.5,0.75],  // 已落成：退回總投入（含升級）的 50%～75%，依剩餘耐久比例
  // ---- 野怪區生成／重生（數值可調；zone.legacy 退回舊行為。已生成的 ZONES 不重算，不改存檔結構）----
  zone:{
    avoidGate:true,  // 生成野怪區時避開副本門（dgate）
    gateR:16,        // 排除半徑＝最大 leash（ENEMY tiger／bandit 16）
    respawn:60,      // 野怪重生門檻（秒）；舊值 35，比照山寨 60
    legacy:false     // true：不避開副本門、重生門檻 35
  }
};
const XW_VER='0.4.6';   // v0.4.9 起：只當「存檔格式／app 標記」（寫進存檔 app 與欄位 ver），凍結不改；畫面顯示的版本用 xwDispVer()
function xwDispVer(){try{return (typeof CHANGELOG!=='undefined'&&CHANGELOG[0]&&CHANGELOG[0].v)||XW_VER;}catch(e){return XW_VER;}}   // 顯示版本＝CHANGELOG 第一筆（＝發行版本）
const RES_KEYS=['wood','stone','fiber','food','iron','herb','lingshi'];
const RES_NAMES={wood:'木材',stone:'石材',fiber:'纖維',food:'食物',iron:'鐵礦',herb:'藥草',lingshi:'靈石'};
const RES_COL={wood:'#e0a86a',stone:'#d6dde4',fiber:'#cfe98a',food:'#ff8a8a',iron:'#e8a27a',herb:'#7fe0b0',lingshi:'#8fe8ff'};
const NODE_RES={tree:'wood',rock:'stone',fiber:'fiber',berry:'food',iron:'iron',herb:'herb',vein:'lingshi'};
const NODE_NAME={tree:'樹木',rock:'石堆',fiber:'纖維草',berry:'漿果叢',iron:'鐵礦脈',herb:'藥草',vein:'靈石脈'};
const NODE_MAX={tree:50,rock:70,fiber:35,berry:45,iron:60,herb:16,vein:40};
const NODE_MM={tree:[24,62,30],rock:[196,200,206],fiber:[205,235,130],berry:[255,90,106],iron:[226,140,96],herb:[120,240,180],vein:[120,235,255]};
// 果樹：type tree、v===3、非暗色（g6 畫粉紅果實）產出食物；漿果叢仍是 berry→food。
function nodeResOf(n){if(!n)return null;if(n.type==='tree'&&n.v===3&&!n.d)return 'food';return NODE_RES[n.type]||null;}
function nodeNameOf(n){if(!n)return '';if(n.type==='tree'&&n.v===3&&!n.d)return '果樹';return NODE_NAME[n.type]||n.type;}
function nodeApproachOk(n,c){if(c<0)return true;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const i=n.i+a,j=n.j+b;if(typeof inMap==='function'&&inMap(i,j)&&!block[j*N+i]&&comp[j*N+i]===c)return true;}return false;}
const T={GRASS:0,DEEP:1,DIRT:2,WATER:3,SHALLOW:4,CLIFF:5,MOUNT:6,DARK:7,RUIN:8,ROAD:9,PLAIN:10};
const BI={WOOD:0,PLAIN:1,MOUNT:2,BEAST:3};
const BIOME_NAME=['林地','平原','山嶺','妖獸森林'];
const BUILD={
  hall:{name:'宗門大殿',size:3,cost:{wood:30,stone:20,fiber:10},time:12,pop:2,hp:800,desc:'宗門核心。弟子把採集的資源搬回這裡。弟子上限 +2。'},
  altar:{name:'求武台',size:2,cost:{wood:40,stone:30},time:9,pop:0,hp:400,desc:'消耗食物招募弟子，體質隨機。宗門有人突破煉氣後，可升級為「求仙台」，招到身具靈根的弟子。'},
  house:{name:'住房',size:2,cost:{wood:25,fiber:15},time:7,pop:3,hp:300,desc:'弟子上限 +3。凡人階段只是住所，沒有修煉加成；宗門踏入修仙階段後化為「洞府」，每座讓全宗修煉速度 +10%（最多 +50%）。'},
  wudao:{name:'武道館',size:3,cost:{wood:60,stone:40},time:14,pop:0,hp:600,slots:6,desc:'指派弟子「練武」累積修為，多人一起練有加成（最多 6 人）。'},
  lianwu:{name:'練武閣',size:2,cost:{wood:50,stone:60,iron:10},time:14,pop:0,hp:500,slots:2,desc:'指派弟子「閉關」，單人修煉較快（最多 2 人）。突破「大武師」的必要條件。'},
  library:{name:'長書閣',size:2,cost:{wood:70,stone:30,fiber:30},time:16,pop:0,hp:450,req:'wudao',desc:'研究「武學秘籍」並收藏功法。突破「宗師」需要宗門持有武學秘籍。'},
  alchemy:{name:'煉丹房',size:2,cost:{wood:50,stone:40,herb:5},time:14,pop:0,hp:450,req:'library',slots:2,desc:'指派弟子「煉丹」，用藥草、靈石與妖獸材料煉製丹藥。悟性高、身具火靈根的弟子煉得更好。'},
  forge:{name:'鍛造坊',size:2,cost:{wood:50,stone:50,iron:10},time:14,pop:0,hp:550,req:'wudao',slots:2,desc:'指派弟子「鍛造」，打造刀劍槍拳、道袍與護符。悟性高、身具金靈根或力大的弟子打得更好。'},
  xianyuan:{name:'仙緣閣',size:2,cost:{wood:60,stone:40,lingshi:20},time:18,pop:0,hp:500,reqXian:true,desc:'宗門有人達到煉氣後解鎖。定期觸發仙緣事件提升弟子仙緣，並讓求仙台招到資質更好的人。'}
};
const BUILD_ORDER=['hall','altar','house','wudao','lianwu','library','alchemy','forge','xianyuan'];
const RECRUIT_COST=20,RECRUIT_TIME=4;
const BODIES=[
  {n:'凡體',w:46,rar:'凡品',col:'#c9b38a',hp:1,atk:1,spd:1,gat:1,desc:'平凡之軀，勤能補拙'},
  {n:'金剛體',w:12,rar:'良品',col:'#d8a93a',hp:1.5,atk:1.1,spd:0.9,gat:1,desc:'皮糙肉厚，氣血旺盛'},
  {n:'風靈體',w:12,rar:'良品',col:'#6fd3a0',hp:0.9,atk:1,spd:1.35,gat:1.15,desc:'身輕如燕，行動迅速'},
  {n:'火靈體',w:11,rar:'上品',col:'#e85d3a',hp:1,atk:1.45,spd:1,gat:0.9,desc:'出手剛猛，攻擊力高'},
  {n:'寒冰體',w:9,rar:'上品',col:'#8cc8f2',hp:1.15,atk:1.2,spd:1,gat:1,desc:'攻擊帶寒氣，可減緩敵人'},
  {n:'厚土體',w:8,rar:'上品',col:'#a87b45',hp:1.25,atk:0.9,spd:0.95,gat:1.45,desc:'力大耐勞，採集效率高'},
  {n:'仙武之體',w:2,rar:'極品',col:'#f6e27a',hp:1.6,atk:1.6,spd:1.2,gat:1.3,desc:'萬中無一，武仙同修之資：修煉更快、衝擊煉氣的門檻更低'}
];
const RAR_COL={'凡品':'#bdb3a0','良品':'#7fd38a','上品':'#7fb6ff','極品':'#ffd34d'};
// 境界：need＝在此境界要累積的修為，圓滿後才能突破到下一境界
const REALMS=[
  {n:'武徒',need:50,stage:'凡人'},
  {n:'武師',need:120,stage:'凡人',ab:'charge'},
  {n:'大武師',need:250,stage:'凡人',ab:'sweep'},
  {n:'宗師',need:450,stage:'凡人',ab:'guard'},
  {n:'煉氣',need:800,stage:'修仙',ab:'fireball'},
  {n:'築基',need:0,stage:'修仙',ab:'flysword'},
  {n:'金丹',need:0,stage:'修仙',ab:'jindan'},
  {n:'元嬰',need:0,stage:'修仙'},{n:'化神',need:0,stage:'修仙'},{n:'合體',need:0,stage:'修仙'},{n:'地仙',need:0,stage:'修仙頂端'},{n:'天仙',need:0,stage:'仙界',full:'飛升至天仙'}
];
const MAX_REALM=10;  // 2026-11-10：開放至地仙；地仙→天仙只走踏仙梯
// 下一境名稱。天仙（陣列最後一格）或壞掉的境界索引沒有下一項，讀 .n 會丟例外。
function realmNextName(r){const R=REALMS[((r|0)+1)];return (R&&R.n)||'下一境';}
const SUB=['初期','中期','後期','圓滿'];
const ABIL={
  charge:{n:'衝鋒',cd:8,desc:'衝向 5 格內的敵人（貼身時直接撞擊），造成 1.6 倍傷害並擊暈'},
  sweep:{n:'橫掃',cd:10,desc:'掃擊身邊所有敵人（1.2 倍傷害）'},
  guard:{n:'氣勁護體',cd:25,desc:'氣血低於 65% 時張開護盾，吸收 40% 氣血上限的傷害'},
  fireball:{n:'御氣・火球',cd:4,desc:'對 6 格內的敵人射出火球（2.2 倍傷害，小範圍波及）'},
  flysword:{n:'御劍術',cd:5,desc:'祭出飛劍刺向 8 格內的敵人（3 倍傷害）'},
  jindan:{n:'金丹威壓',cd:12,desc:'震懾身邊 2.5 格內所有敵人（金丹 2.5 倍，此後隨境界提升並擊暈）'}
};
// 威壓：技能鍵固定 jindan（存檔／聯機／快捷鍵不變）；顯示名與傷害倍率隨施放者境界（弟子同規則）
const JINDAN_MUL_BY_REALM={6:2.5,7:3.0,8:3.5,9:4.0,10:4.5,11:5.0};
function abilName(u,key){
  if(key==='jindan'){
    const r=(u&&u.realm)|0;
    if(r>=6&&REALMS[r]&&REALMS[r].n)return REALMS[r].n+'威壓';
    return (ABIL.jindan&&ABIL.jindan.n)||'金丹威壓';
  }
  return (ABIL[key]&&ABIL[key].n)||key;
}
function abilMul(u,key){
  if(key==='jindan'){
    const r=(u&&u.realm)|0;
    if(JINDAN_MUL_BY_REALM[r]!=null)return JINDAN_MUL_BY_REALM[r];
    return JINDAN_MUL_BY_REALM[6];
  }
  const A=ABIL[key];if(!A)return 1;
  if(A.mul!=null&&isFinite(+A.mul))return +A.mul;
  const m=String(A.desc||'').match(/([0-9]+(?:\.[0-9]+)?)\s*倍/);
  return m?+m[1]:1;
}
function abilDesc(u,key){
  if(key==='jindan'){
    const m=abilMul(u,key),n=abilName(u,key);
    return '震懾身邊 2.5 格內所有敵人（'+n+'，'+m+' 倍傷害並擊暈）';
  }
  return (ABIL[key]&&ABIL[key].desc)||'';
}

// F-141 技能固有倍率表＋統一取值。預設傷害與改前等值：武技＝攻擊×固有倍率，法術＝spellPow×固有（＝攻擊×靈根 spM×固有）。
// 草案完整公式（再乘功法／裝備技能增傷、境界壓制、暴擊、1−目標減傷）預設關閉：後三段已在 dmgEnemy 後續包裝裡套用，再開會疊乘。
TUNE.f141={on:true};
const SKILL_MUL={
  charge:1.6,sweep:1.2,fireball:2.2,flysword:3,
  0:2.4,1:1.6,2:1.2,3:2.2,4:1.2,
  lei:3.2,bing:1.6,feng:1.4,du:0.5,xue:2.6,guang:1.8,an:2.2,shikong:2.8
};
const SKILL_MUL_EXTRA={fireballSplash:0.6,shikongSplash:1.4,duPsn:0.5,duAuto:0.25};
(function(){for(const k of ['charge','sweep','fireball','flysword'])if(ABIL[k])ABIL[k].mul=SKILL_MUL[k];})();
function skillMul(u,key,sub){
  if(sub&&typeof SKILL_MUL_EXTRA!=='undefined'&&SKILL_MUL_EXTRA[sub]!=null)return +SKILL_MUL_EXTRA[sub];
  if(key==='jindan')return typeof abilMul==='function'?abilMul(u,'jindan'):(JINDAN_MUL_BY_REALM[((u&&u.realm)|0)]||JINDAN_MUL_BY_REALM[6]);
  if(key!=null&&SKILL_MUL[key]!=null&&isFinite(+SKILL_MUL[key]))return +SKILL_MUL[key];
  if(typeof key==='string'&&typeof abilMul==='function')return abilMul(u,key);
  try{if(typeof SPELL!=='undefined'&&SPELL[key]){const A=SPELL[key];if(A.mul!=null&&isFinite(+A.mul))return +A.mul;if(A.pow!=null&&isFinite(+A.pow))return +A.pow;}}catch(e){}
  return 1;
}
function skillIsSpell(key){if(key==='sp'||typeof key==='number')return true;try{return !!(typeof SPELL!=='undefined'&&SPELL[key]&&!(typeof ABIL!=='undefined'&&ABIL[key]));}catch(e){return false;}}
function skillRootMul(u){
  try{const k=typeof rootKey==='function'?rootKey(u):null;if(!k||typeof RT==='undefined'||!RT[k])return 1;
    let m=RT[k].spM||1;if(k==='hundun')m=1+0.15*Math.max(0,((u&&u.realm)|0)-4);return m;}catch(e){return 1;}
}
function skillBonusMul(u){
  let p=0;
  try{if(u&&u.qiSkillAtk!=null)p+=(+u.qiSkillAtk)||0;if(u&&u._econ&&u._econ.qiSkillAtk!=null)p+=(+u._econ.qiSkillAtk)||0;}catch(e){}
  return 1+p/100;
}
function skillDmg(u,key,opt){
  opt=opt||{};
  const atk=(u&&u.atk)||0;
  if(opt.sub){
    if(opt.sub==='fireballSplash'){const main=opt.base!=null?+opt.base:skillDmg(u,'fireball');return main*skillMul(u,null,'fireballSplash');}
    if(opt.sub==='shikongSplash')return skillDmg(u,'shikong',{spell:1,mul:skillMul(u,null,'shikongSplash')});
    if(opt.sub==='duPsn')return atk*skillMul(u,null,'duPsn');
    if(opt.sub==='duAuto')return atk*skillMul(u,null,'duAuto');
  }
  const inher=opt.mul!=null?+opt.mul:skillMul(u,key);
  const isSpell=opt.spell||skillIsSpell(key);
  let amt;
  if(isSpell){
    if(typeof spellPow==='function')amt=spellPow(u)*inher;
    else amt=atk*skillRootMul(u)*inher;
  }else amt=atk*inher;
  if(typeof TUNE!=='undefined'&&TUNE.f141&&TUNE.f141.on)amt*=skillBonusMul(u);
  return amt;
}

const LG_EL=['金','木','水','火','土'],LG_Q=['雜靈根','真靈根','天靈根'];
const ENEMY={
  wolf:{n:'妖狼',hp:45,atk:6,spd:2.3,r:0.3,xiu:12,food:8,aggro:5,leash:14},
  boar:{n:'鐵背野豬',hp:85,atk:9,spd:2.2,r:0.34,xiu:20,food:14,aggro:4,leash:12},
  tiger:{n:'赤紋虎',hp:150,atk:15,spd:2.8,r:0.36,xiu:40,food:18,aggro:6,leash:16},
  king:{n:'石甲妖王',hp:700,atk:24,spd:2.0,r:0.5,xiu:200,food:40,aggro:7,leash:9,boss:true},
  bandit:{n:'山賊',hp:60,atk:7,spd:2.6,r:0.27,xiu:18,aggro:6,leash:16,human:true},
  chief:{n:'山賊頭目',hp:200,atk:15,spd:2.5,r:0.3,xiu:80,aggro:7,leash:12,human:true},
  militia:{n:'村勇',hp:55,atk:6,spd:2.5,r:0.27,xiu:10,aggro:5,leash:10,human:true}
};
const VS={
  vhouse:{s:2,name:'民居'},trade:{s:2,name:'交易所'},well:{s:1,name:'水井'},
  tent:{s:2,name:'山賊營帳',hp:300},chief:{s:3,name:'山寨大帳',hp:900},stake:{s:1,name:'木柵'},
  pillar:{s:1,name:'殘柱'},ruinAltar:{s:2,name:'遺跡石台'}
};
const TRADES=[
  {give:{food:12},get:{iron:4}},
  {give:{stone:15},get:{iron:4}},
  {give:{wood:15},get:{herb:3}},
  {give:{fiber:10},get:{food:12}},
  {give:{herb:4},get:{food:20}},
  {give:{iron:10,food:20},get:{lingshi:3},rel:50}
];
const SURN='林陳李張王趙周吳鄭孫蕭沈韓楊柳葉顧蘇白秦謝唐許韋宋江陸方'.split('');
const GIVEN='一清風雲遠明若寒青嵐霄墨辰舟星川羽衡瑤竹安嶽澄逸霜離晴松鶴凌雪玄塵'.split('');
const PERSON=['沉穩','好動','謹慎','豪爽','孤僻','熱心','倔強','溫和'];
const OBJ=['採集資源（木材 30、石材 20、纖維 10）','建造「宗門大殿」','建造「求武台」','招募第一名弟子','指派弟子採集並搬回大殿',
  '建造「練武閣」助弟子突破「大武師」後，建造「武道館」','讓弟子修煉並突破「武師」','與友好村莊交易','擊退山賊襲擊','探索遺跡，取得功法','你突破「煉氣」','將求武台升級為「求仙台」'];
const NOBJ=OBJ.length;

// ================== 工具 ==================
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rnd=Math.random;
function ri(a,b){return a+Math.floor(rnd()*(b-a+1));}
function pick(arr){return arr[Math.floor(rnd()*arr.length)];}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by);}
function hash2(i,j){let h=i*374761393+j*668265263;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967296;}
function iso(x,y){return {x:(x-y)*HW,y:(x+y)*HH};}
function unIso(sx,sy){const a=sx/HW,b=sy/HH;return {x:(a+b)/2,y:(b-a)/2};}
function distRect(x,y,i0,j0,s){const dx=Math.max(i0-x,0,x-(i0+s)),dy=Math.max(j0-y,0,y-(j0+s));return Math.hypot(dx,dy);}
function canAfford(cost){for(const k in cost) if((S.res[k]||0)<cost[k]) return false;return true;}
function pay(cost){for(const k in cost)S.res[k]-=cost[k];}
function costStr(cost){return Object.keys(cost).map(k=>RES_NAMES[k]+' '+cost[k]).join('、');}
function inMap(i,j){return i>=0&&j>=0&&i<N&&j<N;}

// ================== 狀態 ==================
let S=null;                 // 遊戲狀態（可存檔）
let terrain=null,biome=null,depthMap=null,roadMask=null,ANCH=null;
let NODES=[],chunkNodes=[];
let block=new Uint8Array(N*N),comp=new Int32Array(N*N),occ=new Array(N*N),nodeGrid=new Array(N*N);
let explored=new Uint8Array(N*N);
let startComp=1;
const cam={x:0,y:0,zoom:1.1,follow:true};
const keys={};
let mouse={x:-999,y:-999,down:false,sx:0,sy:0,box:false,inside:false};
let ghostAt={x:200,y:300};
const joy={x:0,y:0,active:false};
let boxToggle=false;
let isTouchUI=(matchMedia('(pointer:coarse)').matches)||(navigator.maxTouchPoints>0&&!matchMedia('(pointer:fine)').matches);
let paused=false,buildMode=null,selUnits=[],selBuilding=null,selOther=null;
let floaters=[],markers=[],effects=[],projectiles=[],pings=[];
let helpShown=true,uiTimer=0,aggroTimer=0,spawnTimer=0,visionTimer=0,secTimer=0,villageTimer=0;
let fpsAvg=60;

function newState(seed){
  return {v:SAVE_VER,seed,time:0,interior:null,res:{wood:0,stone:0,fiber:0,food:0,iron:0,herb:0,lingshi:0},items:{miji:0,gongfa:0},nodeMods:{},
    buildings:[],units:[],enemies:[],npcs:[],wand:[],cands:[],nodeMoves:{},nodeRegrow:{},wandT:null,tut:{step:0,done:false,base:{}},villages:[],vstructs:[],raidsActive:[],nextId:1,flags:{},
    stats:{gathered:0,discDeposit:0,recruited:0,kills:0,trades:0,raids:0,raidsRepelled:0,breaks:0,camps:0,quests:0},
    objDone:new Array(NOBJ).fill(false)};
}
function nid(){return S.nextId++;}
// v0.4.8 取名視窗打字時：先在最外層攔下按鍵，不讓 WASD／快捷鍵觸發遊戲操作（Enter＝確定、Esc＝取消回上一頁）
addEventListener('keydown',ev=>{
  const naming=document.body.classList.contains('y48naming')||(document.getElementById('y48name')&&document.getElementById('y48name').style.display!=='none');
  const t=ev.target;
  if(naming&&(ev.key==='Escape'||ev.code==='Escape')){ev.preventDefault();ev.stopImmediatePropagation();try{y48NameCancel();}catch(e){}return;}
  if(!t||t.id!=='y48nmi')return;
  if(ev.key==='Enter'&&!ev.isComposing){ev.preventDefault();try{y48NameSubmit();}catch(e){}}
  ev.stopImmediatePropagation();
},true);
addEventListener('keyup',ev=>{const t=ev.target;if(t&&t.id==='y48nmi')ev.stopImmediatePropagation();},true);
