// ================== v0.4.x map PHASE1／5：尺度／刷怪上限／至寶機率 ==================
var MAP_TUNE={
  N_MAP:288,                 // 約 5× 面積（128²→288²）；未解鎖仍用主程式 N=128
  // 通用安全落點（B-38）：石碑／快速移動傳送；仙凡之門門口另有專用落點不套用
  safeLand:{
    r:8,            // 先在此半徑內找 待確認
    maxR:14,        // 找不到時最遠放寬到 待確認
    minSep:0.9,     // 與其他單位最小間距（格）待確認
    wallNbStrict:0, // 第一輪：八鄰格不可有牆
    wallNbLoose:3   // 第二輪：最多幾面牆 待確認
  },
  // 框選快速移動至石碑（BACKLOG #15）：走到最近已發現石碑後整批傳送；煉氣後每人耗靈石
  steleTp:{
    costRealm:4,     // 此境界（煉氣）以上才收費；玩家與弟子同規則
    costPerUnit:5,   // 每位收費者靈石 待確認
    arriveR:2.2,     // 抵達石碑判定（對齊 nearShrine）
    timeoutSec:90,   // 逾時自動取消 待確認
    tickMs:300
  },
  // 妖獸洞窟：靠近只提示，走到洞口格才問；取消後須離開 leaveR 再回來才再問（BACKLOG #14）
  cavePrompt:{
    kinds:['cave'],
    hintR:4,        // 洞口外此距離內顯示提示 待確認
    askR:0.9,       // 貼到洞口格（入口格本身不可走，站在邊上 ≤0.9）才跳確認 待確認
    leaveR:5        // 離開超過此距離才重置 待確認
  },
  unlockRealm:4,             // 煉氣（REALMS idx 4）後才可開圖
  worldUnlock:{
    flags:['world','cities','mountQi','sects','dungeons','travel'], // 開外層時逐存檔開啟；不含 dgArea
    pollMs:1200,             // 突破輪詢間隔（毫秒）待確認
    neverFlags:['dgArea']    // 解鎖時絕不可誤開
  },
  spawn:{
    enemies:220,             // 全域敵人／野獸上限（鏡頭外優先 cull）
    sectNpcs:80,
    cityNpcs:60,
    wand:14,                 // 對齊既有 wanderCap
    sectExpeditions:1,       // 每宗同時遠征隊
    travelEnc:3              // 同時進行的途中遭遇
  },
  mountQiMul:1.2,            // 高山固有靈氣回復 ×1.2
  // ---- 至寶（元嬰及以上；玩家／NPC／載體敵同一套）----
  // 全部可調：base／per-realm decay／pity／carrier＝dungeon／crossRealm
  zb:{
    minRealm:7,              // 元嬰 REALMS idx（gN: W1_R7）
    dungeonBase:0.03,        // 週五規格：元嬰以上副本至寶 3% 起
    realmDecay:0.85,         // 佔位（規格只寫「遞減」、未寫係數）：每高一境 ×realmDecay
    dungeonDecay:1,          // 關閉 miss 衰減（規格未寫）
    dungeonFloor:0.002,      // 佔位（規格未寫地板）：最低 0.2%
    pityEvery:80,            // 佔位（規格只寫「有保底」、未寫次數）：連續未掉達標強制命中
    carrierSameAsDungeon:true, // 週五規格：帶至寶敵人同機率
    crossRealmKill:0.005,    // 週五規格：跨境擊殺 0.5%（元嬰以下仍全擋，依現做法／本次指示）
    powerBonus:[0.20,0.40],  // 至寶拉開差距 +20～40%（NPC 同理）
    namesOriginalOnly:true
  },
  npcBaseStatSlack:0.10,     // 同境基礎數值差 ≤10%
  deathMinRealm:7,           // 元嬰起可真死／滅神魂（對齊 zb.minRealm）
  // 境界越高靈氣回復倍率越低（可調；idx 對齊 REALMS）
  qiRealmMul:[1.00,0.95,0.90,0.85,0.75,0.65,0.55,0.45,0.38,0.32,0.28,0.25],
  sectProd:{                 // 他宗日常產出／秒（進 sect.stock）
    farmFood:0.08, mineIron:0.04, mineLs:0.02, refineHerb:0.05, refineLs:0.01
  },
  // 弟子自動組隊打突破副本（plans §B；flags.autoParty）
  party:{
    minSize:2, maxSize:6,
    minSuccess:0.15,         // <15% 不出發
    retreatHp:0.40,          // 隊伍血量 <40% 撤退（只受傷）
    keepGuards:1,            // 宗門至少留 N 名護衛級
    baseSuccess:0.20,        // 同境基準成功率（真概率）
    perExtraMember:0.04,     // 每多一人
    powerScale:0.0005,       // 戰力貢獻
    leadPlus1:0.15,          // 隊長高一境 +15%
    leadPlus2:0.25,          // 隊長高兩境 +25%（不再必成）
    successCap:0.75,         // 成功率上限 75%
    runSec:[12,20],          // 抽象遠征時長（秒）
    maxConcurrent:2,         // 同時組隊遠征上限
    tickAcc:8                // 嘗試組隊間隔累積
  },
  // 山賊境界：散兵≤大武師、頭目≤宗師；罕見具名寨主可到煉氣一層；頭目最多高小兵 3 小層
  bandit:{
    cap:2,          // 散兵硬頂：大武師（REALMS idx）待確認
    chiefCap:3,     // 頭目硬頂：宗師 待確認
    rareCap:4,      // 罕見具名寨主硬頂：煉氣 待確認
    rareSub:0,      // 煉氣一層（十層制 sub 0）待確認
    rareChance:0.03,
    maxSubLead:3,   // 頭目最多高小兵幾個小層 待確認
    // 依地區／地圖層級的合理範圍（硬頂不變；缺境用 min 不抬到 cap）待確認
    realmByTier:{
      newbie:{min:0,max:1,chiefMax:1}, // 武徒–武師（黑風寨／主圖前期）待確認
      mid:{min:1,max:2,chiefMax:2},    // 武師–大武師 待確認
      high:{min:2,max:2,chiefMax:3}    // 散兵大武師、頭目≤宗師 待確認
    },
    newbieCampIds:[3],
    newbieCampNames:['黑風寨'],
    midCampIds:[4],
    midCampNames:['赤狼寨'],
    tierMidDist:70,   // 距起點達此視為中層地區 待確認
    tierHighDist:110  // 距起點達此視為高層地區 待確認
  },
  // 大世界妖獸境界（2026-11-11）：spawnInZone 依既有 newbie/mid/high 區域帶帶入境界。
  // 沿用 bandit.realmByTier 與距離門檻，缺境用該帶 min，不抬到 cap，不把深處赤紋虎抬到金丹。
  zoneRealm:{
    on:true            // 預設開；設 false 恢復舊行為（生成不帶境界＝武徒）
  },
  // 副本門口不補／不站門（2026-11-11，隊長核准 c／d；a／b 由隊長改 g5，此處不碰 g*）
  // nearDist=14 沿用 updateSpawns 玩家附近不補，不另訂秒數。
  gateGuard:{
    on:true,           // 預設開；false 恢復舊行為
    nearDist:14,       // 區心距任一 dgate（門中心或門前站位）小於此值則不補
    tries:8            // spawnInZone 避開門佔格／站位的有限重試，失敗則略過本次
  },
  // 288 外圈野怪區（2026-11-11）：xwEmbed288 只平移核心 ZONES，此處為外圈補區。
  // 生成規則／境界沿用 genZones＋zoneRealm，排除半徑沿用既有數字，不另訂數值。
  // capFill（2026-11-13）：補怪看 mapEnemyCap()（預設 220），分批補；已超上限的舊檔不刪怪。
  outerZones:{
    on:true,           // 預設開；false 不補外圈區（核心區不變）
    capFill:true,      // 預設開；false 或 ?outercap=0 回到一次補滿、不看全域上限的舊行為
    batch:8            // 每批補幾隻（讀檔後用 rAF／setTimeout 分批，不在 applySave 當下一次補完）
  },
  // 新裝備表 v2（經濟 P2，2026-11-11）。總開關另受 ?gearv2=0／econGearV2On 約束。
  // 「至寶」物品／攜帶者 與 「仙品」裝備品級是兩件事，分開處理。
  // 至寶物品：門檻＝MAP_TUNE.zb.minRealm（7＝元嬰；不含元嬰以下）。跨境擊殺同樣擋。
  // 裝備品級：權重走經濟 GRADE_TUNE.weight，不寫死。gradeCapBelowRealm 預設元嬰以下最高 4（極品）；設 null 即不擋。
  //   元嬰以下能否抽到仙品（gr=5）待使用者決定；若要擋，設 {below:7, cap:4}。
  gearV2:{
    on:true,
    enemyQMax:0.9,            // SPEC：敵人只穿 q≤0.9
    carrierMinRealm:null,     // null＝用 zb.minRealm（7＝元嬰）
    gradeCapBelowRealm:{below:7,cap:4}  // 使用者已定：元嬰以下最高極品（4），不出仙品；設 null 關閉
  },
  // 山賊來襲：同時一波、結束後冷卻（秒）；與 TUNE.raidCool 對齊，map 層守衛避免重覆註冊
  raid:{
    oneWave:true,
    cool:420,                // 擊退後全域冷卻（約 7 遊戲分）
    stagger:60               // 其他山寨至少再推遲秒數
  },
  // 敵名牌：每人一張；無法觀察顯示 ???；名稱不含境界；近距上下錯開
  nameplate:{
    stackDy:11,
    clusterPx:48
  },
  // 小怪靠近宗門時自動派弟子（戰力 1.2–1.5 倍威脅；太弱不派；輸了才加派；打完回原職）
  defend:{
    approachR:22,            // 大殿／宗門中心半徑
    nearBuild:8,             // 任一建築外緣 N 格內視同入侵
    areaPad:6,               // 建築凸包／最遠建築再外推，形成宗門周界
    powerMul:[1.2,1.5],
    minUnitRatio:0.40,
    healthyHp:0.50,
    losingHp:0.45,
    tickAcc:0.8
  },
  // 特殊副本：只認 S.dg.boss 那一隻套首領身分（2026-11-13）。預設開；?bossonly=0 或 bossOnlyDg=false 回舊行為（同種類都當首領）。
  special:{
    bossOnlyDg:true
  },
  // 宗門單一倉庫（2026-11-13）。預設開；?singlestore=0 或 store.single=false 回舊行為（地圖端自行 vault↔res 同步、直寫 S.res）。
  store:{
    single:true,
    // 仙凡之門靈石由經濟入倉與結算（API.md §7 定版）。
    // 'auto'（預設）＝?xfsettle=1/0（預設開）再查 XW_STORE.xfSettleOn()／全域 xfSettleOn()；
    // 函式不存在＝地圖自己入靈石。true＝一律交給經濟；false＝地圖照舊入靈石。
    xfSettleByEcon:'auto'
  },
  // 破關人頭／弟子份額（2026-11-13）。預設關（未完成實際瀏覽器測試前不預設開）。?dgparty=1 開、=0 關。
  // 人頭獎（目前僅仙凡令）每位參與玩家一份；弟子每場抽 30–100%，份額＝round(比率×弟子數) 各一份。
  // 靈石不在此地圖入帳。聯機介面見 DGPARTY_NET.md。
  dgParty:{
    on:false,
    perHead:['xfl'],
    discRatioMin:0.30,
    discRatioMax:1.00,
    discDest:'sect'          // 無弟子私囊入帳路徑：入宗門倉，待隊長確認
  },
  // 首領房小怪層數 ≤ 該房首領（2026-11-13，落霞 P2）。預設開；?minionleqboss=0 關。不調首領、不加新數值表。
  minionLeqBoss:{
    on:true
  },
  // 劇情本首領境界／層／增援（2026-11-13，使用者已定：入場境一層 s:0，對齊 g33_rfix）。
  // 本表尚未被 mapSpecialBossRS 讀取（仍由 g33 包裝覆寫）。g33 改法見 MAP_SCHEMA.md。
  // entry＝MAP_TUNE[kind].minRealm，缺則用 minionCap。layer 一層＝s:0。reinforce 對齊目前 bossAdds（g33 未改劇情本增援）。
  // 困難：g33 現行為 min(bossRealm, entry+1) 且 sub=0（一層）；目前三章 bossRealm===entry+1，故困難仍停在原設計境一層。
  storyBoss:{
    realmFrom:'entry',
    layer:'一層',
    sub:0,
    reinforce:3,
    hard:{realmFrom:'entry+1',capAt:'bossRealm',layer:'一層',sub:0},
    kinds:{
      st_luoxia:{entry:5,layer:'一層',sub:0,reinforce:3,hard:{realm:6,sub:0}},
      st_zangxian:{entry:7,layer:'一層',sub:0,reinforce:3,hard:{realm:8,sub:0}},
      st_wuxing:{entry:9,layer:'一層',sub:0,reinforce:3,hard:{realm:10,sub:0}}
    }
  },
  // 特殊副本數值：走 g27 rbStd 模板（2026-11-11）。名牌一律動態層名，不受此旗影響。
  specialTpl:{
    on:true,          // 預設開；false 則數值回退舊 ENEMY×xnScaleStat
    bossAtk:1.1,      // 僅仙凡之門首領攻擊倍率（對齊 TUNE.xfGate）
    mob:1.2           // 僅仙凡之門小怪氣血／攻擊倍率
  },
  // 特殊副本：仙凡之門（僅首領＝煉氣；小怪≤宗師）。細節見 map_data_special.js
  xf:{
    bossN:'試煉王',
    bossRealm:4,             // 煉氣
    bossSub:1,               // 煉氣二層（十層制 sub 1；名牌動態產生，勿寫死中期）
    minionMin:2,             // 大武師
    minionCap:3,             // 宗師（小怪上限）
    eliteRealm:3,
    eliteSub:2,              // 宗師後期
    eliteChance:0.15,
    doorInset:2.2,
    bossSafe:8,
    rooms:5,
    packMin:3,
    packMax:5,
    bossAdds:4,
    partyFair:8,             // 人數加成計算上限（剛進煉氣的小隊）
    partyHpPer:0.08
  },
  // 特殊副本：青巖秘窟（僅首領＝煉氣一層；小怪≤宗師）
  dg_qingyan:{
    bossN:'青巖妖王',
    bossRealm:4,
    bossSub:0,
    minionMin:2,
    minionCap:3,
    eliteRealm:3,
    eliteSub:2,
    eliteChance:0.12,
    doorInset:2.2,
    bossSafe:8,
    rooms:4,
    packMin:3,
    packMax:5,
    bossAdds:3,
    partyFair:8,
    partyHpPer:0.08,
    gateN:'首領殿門',
    gateOpen:'首領殿門',
    gateShut:'首領殿門（已封）'
  },
  // 副本劇情三章（F-028／F-020）：第一章預設開，第二、三章隱藏。總開關 storyDg.on=false 時第一章也不註冊。
  // 戰力不寫死，走 rbStd／rbEnFull。座標／火柱數量等未寫明項見 MAP_SCHEMA，一律可調、不進存檔。
  storyDg:{
    on:true,
    ch1:true,            // 落霞仙尊之墓
    ch2:false,           // 葬仙萬骨荒塚（隱藏）
    ch3:false            // 五行通天靈脈（隱藏）
  },
  st_luoxia:{
    bossN:'守護傀儡·天罡',
    bossRealm:6,         // 金丹
    bossSub:0,           // 初期（兩套小層制都是 0）
    minionMin:5,         // 築基
    minionCap:5,
    eliteRealm:5,
    eliteSub:6,          // 待釐清：規格「築基後期」在十層制尚未對應；預設 6＝七層，只作可調項，不寫死戰力
    eliteChance:0.10,
    trashSubMax:8,
    doorInset:2.2,
    bossSafe:8,
    rooms:5,             // 待釐清：規格未寫房數；g13 非 xf 為 4–6，此值供特殊門／測試對照
    packMin:3,
    packMax:5,
    bossAdds:3,
    partyFair:8,
    partyHpPer:0.08,
    gateN:'墓門',
    gateOpen:'墓門',
    gateShut:'墓門（已封）',
    // 九宮天火陣（規格已定 interval／dps；其餘可調且標待釐清）
    fireInterval:5,
    fireDps:120,
    fireGrid:9,
    fireActive:1,        // 待釐清：規格只寫「隨機火柱」，先一次 1 根，可調
    fireDur:5,           // 待釐清：未寫持續；先與間隔相同
    fireR:1,             // 待釐清：未寫半徑；先 1 格
    insightNeed:0.02,    // 謹慎／沉穩且 insightRate>2% 繞行
    ambushHp:0.20,
    ambushN:3,
    ambushRealm:5,
    ambushSub:6,         // 同 eliteSub，待釐清
    ambushLootHp:0.30,
    crushAtk:0.70,       // 膽小「崩潰」攻速 -30%
    beishuiSee:0.10,     // 剛烈「背水一戰」看破 +10%
    // 入口暫定座標（規格未給）；外層、避開既有 MAP_DG_GATES
    gateX:120,
    gateY:220
  },
  // 第二章葬仙萬骨荒塚（預設隱藏）。戰力不寫死，走境界模板。未寫明項標待釐清、可調。
  st_zangxian:{
    bossN:'萬骨冥王',
    bossRealm:8,         // 化神
    bossSub:0,           // 待釐清：規格「化神初期」
    minionMin:7,
    minionCap:7,
    minRealm:7,          // 元嬰
    shaInterval:60,      // 規格：每 60 秒
    shaPct:0.02,         // 規格：maxHp-2%
    xtlMinHp:10000,      // 規格：<10000 無法踏仙梯
    trapDmg:2500,        // 規格：暗弩物理
    trapBleed:5,         // 規格：5 秒流血
    trapBleedDps:50,     // 待釐清：規格未寫每秒傷
    trapN:3,             // 待釐清：暗弩數量
    trapArmorSec:5,      // 待釐清：結陣加甲時長
    trapArmorRed:0.30,   // 待釐清：減傷比例
    crowdMul:1.9,        // 規格：人海懲罰 1.9 倍
    crowdNeed:4,         // 待釐清：幾人起算
    addInterval:180,     // 規格：每 3 分鐘
    addN:3,
    addRealm:6,          // 金丹
    addSub:9,            // 待釐清：巔峰＝十層制大圓滿
    addType:'golem',
    roomMobCap:5,        // 規格
    elderShout:'小心腳下！結防禦陣法！',
    rooms:5,             // 待釐清
    gateX:210,           // 暫定，規格未給
    gateY:175
  },
  // 第三章五行通天靈脈（預設隱藏）。數值 1600… 不寫死，只用規格已寫的倍率／間隔。
  st_wuxing:{
    minRealm:9,          // 合體
    rooms:5,             // 五關，待釐清是否另加入口房
    jadeBonus:1500,      // 規格：每關 +1500 bodyIntensity
    jadeN:5,
    clearTalk:'五行圓滿，金身初具！天仙之路，就在腳下！',
    defMul:2.0,          // 待釐清：金「高甲」倍率
    woodRegen:0.05,      // 規格：每秒回 5%
    waterInterval:10,    // 規格
    waterSlow:0.50,      // 規格：全屏減速 50%
    waterSlowDur:3,      // 待釐清：減速持續
    fireSee:1.5,         // 規格：看破 1.5 倍
    earthThorns:0.10,    // 規格：10% 真實反傷；致死走既有死亡規則
    eliteSub:9,          // 待釐清：合體圓滿
    bossRealm:10,        // 待釐清：地仙
    bossSub:0,
    gateX:75,            // 暫定
    gateY:200
  }
};

function mapStoryChOn(kind){
  try{
    const T=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE.storyDg)||{};
    if(T.on===false)return false;
    if(kind==='st_luoxia')return T.ch1!==false;
    if(kind==='st_zangxian')return !!T.ch2;
    if(kind==='st_wuxing')return !!T.ch3;
  }catch(e){}
  return true;
}
function mapStoryVisibleGateList(){
  const L=(typeof MAP_DG_GATES!=='undefined'&&MAP_DG_GATES)||[];
  try{return L.filter(g=>g&&mapStoryChOn(g.kind));}catch(e){return L.slice();}
}
function mapQiRealmMul(realm){
  const T=MAP_TUNE.qiRealmMul;if(!T||!T.length)return 1;
  const r=Math.max(0,realm|0);
  return T[Math.min(r,T.length-1)];
}

// 每次獨立＝dungeonBase×realmDecay^steps（有保底：pityEvery>0 時連續未掉達標強制命中；無 miss 衰減）
function mapZbPityOn(){
  const n=MAP_TUNE&&MAP_TUNE.zb&&MAP_TUNE.zb.pityEvery;
  return n!=null&&n>0;
}
function mapZbRollRate(pityCount,hard,realm){
  const Z=MAP_TUNE.zb;
  let p=Z.dungeonBase;
  const r=(realm!=null?realm:Z.minRealm)|0;
  const steps=Math.max(0,r-(Z.minRealm|0));
  const rd=(Z.realmDecay!=null)?Z.realmDecay:1;
  for(let i=0;i<steps;i++)p*=rd;
  const floor=(Z.dungeonFloor!=null)?Z.dungeonFloor:0;
  p=Math.max(floor,p);
  // pityEvery<=0：不保底、不把連續 miss 改成 100%；>0 時才在達標強制命中
  if(mapZbPityOn()&&(pityCount|0)>=(Z.pityEvery|0))return 1;
  return p;
}
function mapZbPowerMul(r){
  const B=MAP_TUNE.zb.powerBonus;const t=r==null?Math.random():+r;
  return B[0]+(B[1]-B[0])*Math.max(0,Math.min(1,t));
}
