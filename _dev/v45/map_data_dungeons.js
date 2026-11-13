// ================== v0.4.x map PHASE5：新副本表（DGS 相容形狀，原創名）==================
// type: dungeon|maze|ruin|forbid|mystic ；各 2–3；不改 g13，由 map_dungeons 掛到 DGS 物件屬性
var MAP_BOSS_VARIANTS=[
  {k:'ancient_soul',n:'上古魂魄',boss:'king',bossN:'上古殘魂',alias:'上古修士魂魄'},
  {k:'relic',n:'遺物',boss:'golem',bossN:'遺物守靈'},
  {k:'gatekeeper',n:'守關',boss:'warden',bossN:'關隘守吏'},
  {k:'harsh',n:'殘酷篩選',boss:'xfboss',bossN:'試煉幻影'}
];
var MAP_DGS={
  // ---- dungeon 秘境副本 ----
  dg_qingyan:{type:'dungeon',n:'青巖秘窟',mobs:['wolf','boar','tiger'],boss:'king',bossN:'青巖妖王',col:'#7aab6a',fl:['#3a4a32','#324028'],wl:['#1e2818','#2a3822','#4a5a38'],desc:'青衡餘脈下的妖窟',minRealm:4,rooms:[4,5]},
  dg_shuangxi:{type:'dungeon',n:'霜溪洞府',mobs:['wolf','wisp','boar'],boss:'king',bossN:'霜溪妖君',col:'#9ec8e8',fl:['#3a4450','#323c48'],wl:['#1e2830','#2a343c','#4a5860'],desc:'霜津北境冰蝕洞窟',minRealm:5,rooms:[4,6]},
  dg_chisha_ku:{type:'dungeon',n:'赤砂地宮',mobs:['bandit','boar','tiger'],boss:'warden',bossN:'赤砂獄吏',col:'#d08050',fl:['#4a3828','#403020'],wl:['#2a1e14','#3a2a1c','#5a4030'],desc:'赤砂港地下舊獄',minRealm:5,rooms:[5,6]},
  // ---- maze 迷宮 ----
  mz_yunluo:{type:'maze',n:'雲絡迷宮',mobs:['wisp','golem','wolf'],boss:'golem',bossN:'雲絡石傀',col:'#a090d0',fl:['#3e3a48','#383440'],wl:['#24202c','#302c38','#4a4658'],desc:'雲渚錯綜石廊',minRealm:5,rooms:[5,7]},
  mz_hengxu:{type:'maze',n:'衡虛迷陣',mobs:['wisp','wisp','golem'],boss:'golem',bossN:'衡虛陣靈',col:'#80c0c8',fl:['#3a4848','#344040'],wl:['#1e2828','#2a3434','#4a5858'],desc:'玄衡推演遺陣',minRealm:6,rooms:[6,7]},
  mz_youluo:{type:'maze',n:'幽羅絲徑',mobs:['wisp','bandit','tiger'],boss:'warden',bossN:'幽羅織主',col:'#8050a0',fl:['#3a3040','#342838'],wl:['#221828','#2e2434','#4a3850'],desc:'幽羅殿外絲網迷宮',minRealm:6,rooms:[5,7]},
  // ---- ruin 遺跡 ----
  rn_xingchen:{type:'ruin',n:'星渚廢墟',mobs:['golem','wisp','xfguard'],boss:'king',bossN:'星渚殘將',col:'#d0c070',fl:['#484438','#403c30'],wl:['#2c281c','#383428','#585040'],desc:'星渚宮舊墟',minRealm:6,rooms:[5,6]},
  rn_gujing:{type:'ruin',n:'古鏡殘垣',mobs:['golem','golem','wisp'],boss:'golem',bossN:'鏡冢石衛',col:'#c0b8d0',fl:['#404048','#383840'],wl:['#24242c','#303038','#4a4a58'],desc:'玄衡鏡台遺址',minRealm:5,rooms:[4,6]},
  rn_chaosheng:{type:'ruin',n:'潮生遺殿',mobs:['wisp','boar','golem'],boss:'king',bossN:'潮生殿主殘念',col:'#70b0c8',fl:['#384850','#304048'],wl:['#1c2830','#283440','#485868'],desc:'霜潮閣水下遺殿',minRealm:7,rooms:[5,6]},
  // ---- forbid 禁區 ----
  fb_lieyan:{type:'forbid',n:'烈焰禁谷',mobs:['tiger','boar','xfguard'],boss:'xfboss',bossN:'焰禁守使',col:'#e07040',fl:['#4a3020','#402818'],wl:['#2a1810','#3a2418','#5a3828'],desc:'赤燼谷焰息禁地',minRealm:7,rooms:[5,7],forbid:true},
  fb_hanming:{type:'forbid',n:'寒溟禁淵',mobs:['wisp','tiger','xfguard'],boss:'xfboss',bossN:'寒溟監守',col:'#6090c8',fl:['#304050','#283848'],wl:['#182030','#243040','#405068'],desc:'霜脊下的寒淵',minRealm:7,rooms:[6,7],forbid:true},
  // ---- mystic 秘境（高階）----
  my_xuanyuan:{type:'mystic',n:'玄淵秘境',mobs:['xfguard','golem','wisp'],boss:'xfboss',bossN:'玄淵天衛',col:'#90e0ff',fl:['#3a5058','#324850'],wl:['#1e3038','#2a3c48','#4a6070'],desc:'超越凡塵的玄淵裂口',minRealm:7,rooms:[6,8],mystic:true},
  my_xinghai:{type:'mystic',n:'星海秘境',mobs:['xfguard','wisp','xfguard'],boss:'xfboss',bossN:'星海巡衛',col:'#ffe08a',fl:['#504830','#484028'],wl:['#302818','#3c3420','#5a5040'],desc:'星渚之上的星海裂隙',minRealm:8,rooms:[6,8],mystic:true},
  my_jizhao:{type:'mystic',n:'寂照秘境',mobs:['golem','xfguard','wisp'],boss:'xfboss',bossN:'寂照判官',col:'#d0d0e8',fl:['#484858','#404050'],wl:['#282838','#343444','#505068'],desc:'破幻寂照的試煉界',minRealm:8,rooms:[7,8],mystic:true},
  // 副本劇情第一章（F-020／F-028）。第二、三章見 MAP_STORY_CHAPS，不列入 ORDER／GATES。
  st_luoxia:{type:'ruin',n:'落霞仙尊之墓',mobs:['golem','wisp','xfguard'],boss:'golem',bossN:'守護傀儡·天罡',col:'#e08050',fl:['#4a3020','#403018'],wl:['#2a1810','#3a2418','#5a3828'],desc:'上古遺跡。築基圓滿至金丹初期可探（入口門檻待釐清，先按築基）',minRealm:5,rooms:[4,6]},
  st_zangxian:{type:'forbid',n:'葬仙萬骨荒塚',mobs:['golem','wisp','xfguard'],boss:'golem',bossN:'萬骨冥王',col:'#a0a8b8',fl:['#30343a','#2a2e34'],wl:['#1a1c20','#26282c','#3a3e44'],desc:'生命禁區。元嬰圓滿至化神初期可探（門檻待釐清，先按元嬰）',minRealm:7,rooms:[4,6],storyHide:true},
  st_wuxing:{type:'mystic',n:'五行通天靈脈',mobs:['xfguard','wisp','golem'],boss:'xfboss',bossN:'通天靈脈守使',col:'#70d0a0',fl:['#304840','#284038'],wl:['#1a2c24','#243830','#3a5048'],desc:'天驕秘境。合體圓滿至地仙可探（門檻待釐清，先按合體）',minRealm:9,rooms:[5,6],mystic:true,storyHide:true}
};
var MAP_DG_ORDER=Object.keys(MAP_DGS).filter(function(k){return !MAP_DGS[k].storyHide;});
// 入口錨（N_MAP 288，中央 128 外）
var MAP_DG_GATES=[
  {id:'gate_qingyan',kind:'dg_qingyan',x:70,y:40},
  {id:'gate_shuangxi',kind:'dg_shuangxi',x:130,y:28},
  {id:'gate_chisha',kind:'dg_chisha_ku',x:160,y:260},
  {id:'gate_yunluo',kind:'mz_yunluo',x:260,y:130},
  {id:'gate_hengxu',kind:'mz_hengxu',x:40,y:160},
  {id:'gate_youluo',kind:'mz_youluo',x:255,y:80},
  {id:'gate_xingchen',kind:'rn_xingchen',x:250,y:250},
  {id:'gate_gujing',kind:'rn_gujing',x:90,y:40},
  {id:'gate_chaosheng',kind:'rn_chaosheng',x:190,y:265},
  {id:'gate_lieyan',kind:'fb_lieyan',x:40,y:240},
  {id:'gate_hanming',kind:'fb_hanming',x:250,y:50},
  {id:'gate_xuanyuan',kind:'my_xuanyuan',x:30,y:120},
  {id:'gate_xinghai',kind:'my_xinghai',x:270,y:200},
  {id:'gate_jizhao',kind:'my_jizhao',x:200,y:30},
  {id:'gate_luoxia',kind:'st_luoxia',x:120,y:220}, // 暫定座標，規格未給
  {id:'gate_zangxian',kind:'st_zangxian',x:210,y:175}, // 暫定，規格未給；旗關時不進可見清單
  {id:'gate_wuxing',kind:'st_wuxing',x:75,y:200}
];
