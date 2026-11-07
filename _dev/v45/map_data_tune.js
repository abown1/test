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
    dungeonBase:0.01,        // 真概率：元嬰副本獨立 1.0%（無保底／無累積）
    realmDecay:0.85,         // 每高一境（相對 minRealm）基礎率 ×realmDecay（寫入實際擲骰率）
    dungeonDecay:1,          // 關閉 miss 衰減（真概率）
    dungeonFloor:0.002,      // 地板 0.2%
    pityEvery:0,             // 關閉保底（真概率）
    carrierSameAsDungeon:true, // 至寶載體敵掉落＝副本同率
    crossRealmKill:0.002,    // 跨境擊殺 0.2%
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
  // 山賊境界：散兵≤大武師、頭目≤宗師；罕見具名寨主可到煉氣初期；頭目最多高小兵 3 小層
  bandit:{
    cap:2,          // 散兵硬頂：大武師（REALMS idx）待確認
    chiefCap:3,     // 頭目硬頂：宗師 待確認
    rareCap:4,      // 罕見具名寨主硬頂：煉氣 待確認
    rareSub:0,      // 煉氣初期 待確認
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
  // 特殊副本：仙凡之門（僅首領＝煉氣；小怪≤宗師）。細節見 map_data_special.js
  xf:{
    bossN:'試煉王',
    bossRealm:4,             // 煉氣
    bossSub:1,               // 中期 → 「試煉王・煉氣中期」
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
  // 特殊副本：青巖秘窟（僅首領＝煉氣初期；小怪≤宗師）
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
  }
};
function mapQiRealmMul(realm){
  const T=MAP_TUNE.qiRealmMul;if(!T||!T.length)return 1;
  const r=Math.max(0,realm|0);
  return T[Math.min(r,T.length-1)];
}

// 真概率：每次獨立＝dungeonBase×realmDecay^steps（無 pity／無 miss 衰減／無 hard 隱藏倍率）
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
