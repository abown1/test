// ================== cult.js：修煉／突破／死亡（多數旗標預設關閉；yujianFly 預設開）==================
(globalThis.__cultQS)||(globalThis.__cultQS=(function(){/* P0 2026-11-13：網址參數只在第一次用到時解析一次並快取（遊戲執行中只有 g23 改 big/classic，不動 cult 參數）；?caiqs=0 回到每次重新解析 */let p=null,off=false;const rd=function(){try{return (typeof location!=='undefined'&&location.search)||'';}catch(e){return '';}};off=/(?:^|[?&])caiqs=(0|off|false)(?:&|$)/.test(rd());const g=function(){if(off)return new URLSearchParams(rd());if(p===null)p=new URLSearchParams(rd());return p;};g.off=off;g.gen=0;g.reset=function(){p=null;g.gen++;};/* 測試或換網址後呼叫 reset() */return g;})());
// 由 integrator 插入 build.py：放在 net19_map.js 之後、g7.js 之前（仍在 g1 IIFE 內）。
const CULT_FLAGS={
  dualExp:false,        // 築基起雙經驗條（修為＋戰鬥經驗）
  breakthrough:false,   // 達標晉升、取消成功率；取代突破優化器
  breakDuration:false,  // 金丹起現實時長突破
  tribulation:false,    // 金丹起渡天劫
  dandu:false,          // 層級丹毒／走火入魔
  lingqi:false,         // 調低靈氣回復＋分境界容量
  cultLingshi:false,    // 修煉耗靈石：有 XW_ECON 且 flags.cult 才扣費，否則維持原遊戲（修煉不另扣石）
  death:false,          // 元嬰前重傷、元嬰後元神
  yujianFly:true        // 築基起御劍飛行（cult_fly.js；預設開）
};
window.CULT_FLAGS=CULT_FLAGS;

// 所有「待確認」與規格預設值集中於此，改這裡即可調平衡
const CULT_CFG={
  saveVer:1,
  maxRealm:11,                         // 旗標開啟時允許地仙→天仙（不改 g1 的 MAX_REALM）
  // --- 雙經驗（待確認：戰鬥條佔比階梯）---
  dualFromRealm:5,                     // 築基
  combatShare:[0,0,0,0,0,0.30,0.35,0.40,0.45,0.50,0.55],
  // --- 底蘊（待確認：門檻與成長）---
  diyunNeed:[0,0,0,8,16,28,48,72,110,160,220],
  diyunFromWu:0.4, diyunFromLuck:1, diyunFromXy:0.15, diyunXw:20,
  diyunOverflow:0.02,                  // 圓滿後每點溢出修為換底蘊
  // --- 突破時長（已確認秒數換算）---
  breakSec:{6:2*3600,7:4*3600,8:6*3600,9:9*3600,10:12*3600},
  breakStages:4,
  offlineRate:0.5,                     // 已確認
  offlineWallCap:8*3600,               // 已確認：離線最多計 8 小時牆上時間
  // --- 天劫（待確認：道數、每道氣血比、間隔）---
  tribFromRealm:6,
  tribStrikes:[0,0,0,0,0,0,3,5,6,8,9],
  tribHpFrac:[0,0,0,0,0,0,0.22,0.20,0.18,0.16,0.15],
  tribGap:2,
  diyunDmgReduce:0.005, diyunDmgCap:0.65,
  tianjieTaiReduce:0.20,               // 天劫台減傷（待確認）；hook 可覆寫
  fabaoReduce:0.15,                    // 法寶減傷（待確認）
  pillReduce:0.05,                     // 渡劫丹減傷（只算 u.cultTribPill；突破丹 tpB 不計入）
  failXiuLoss:0.35,                    // 渡劫／突破失敗修為倒退比例（待確認）
  woundHp:0.20, woundDur:180,          // 重傷：氣血上限暫降、持續秒（待確認）
  // --- 丹毒（已確認 -15%／-5%；時長＝該境突破時間）---
  danduMax:3, danduCult:0.15, danduHp:0.05,
  danduClearFallback:30*60,            // 金丹以下無突破時長時的消退時間（待確認）
  zouhuoXiuLoss:0.40,                  // 走火入魔暫時倒退（待確認）
  zouhuoComa:60,                       // 同時昏迷秒數（待確認）
  danduPills:{jq:1,tp:1,xs:1,jqz:1,jqj:1,jqy:1},         // 服用這些丹 +1 層
  // --- 靈氣（待確認：容量與每秒回復佔最大靈氣比；境界越高越慢）---
  qiMaxMul:[0,0,0,0,1,1.3,1.7,2.2,2.8,3.5,4.4],
  qiRegen:[0,0,0,0,0.0020,0.0017,0.0014,0.0011,0.00085,0.00065,0.0005],
  qiMedMul:2.5,
  qiMountain:1.20,                     // 已確認：高山 +20%
  qiGlobalCut:1,                       // 相對原 1%/s 已大幅調低；保留倍率位
  // --- 修煉靈石：不再自備價表。有 XW_ECON 且 S.econ.flags.cult 時
  // realm≤3 免費；其餘每約 1 點非戰鬥修為扣 cultivationCostPerPoint(realm,need)
  // （無此 API 則用 cultivationCost(realm)/need 上取整至少 1 下品）。付不出 ×lsShortMul。
  // 下列僅作文件對照，正式數字以 econ_core.js ECON_TUNE 為準。
  lsPayer:'vault',                     // charge 對象：宗門總庫
  lsShortMul:0.5,                      // 總庫付不出時該次修為 ×0.5，不停修
  // --- 死亡／元神：逃脫後必重塑（無復活骰）；下列 revive* 僅保留相容，不參與逃脫結算 ---
  yuanShenLife:6,
  yuanShenHpFrac:0.35,
  yuanShenSpd:3.2,
  reviveBase:1, reviveDiyun:0, revivePill:0, reviveTreasure:0, reviveCap:1,
  weakDur:240, weakAtk:0.25, weakCult:0.30,
  deathXiuLoss:0.25,
  enemyReturn:180,                     // 重傷逃走後可再出現（待確認秒）
  enemyFleeHp:0.15,
  enemyFleeChance:0.25                 // 致死時重傷逃走基礎機率（非 100%；首領／頭目不逃）
};
window.CULT_CFG=CULT_CFG;

const Cult={
  flags:CULT_FLAGS, cfg:CULT_CFG, version:1,
  _combatGain:0, _installed:0, _hiddenAt:0, _qZone:new WeakMap(),
  listeners:[],
  init:function(){if(this._installed)return this;this._installed=1;cultInstall();cultMigrateState();return this;},
  tick:function(dt){if(!S)return;if(this._tickKey===S.time&&this._tickDt===dt)return;this._tickKey=S.time;this._tickDt=dt;if(this.anyFlag()){cultTickCore(dt);if(CULT_FLAGS.breakDuration||CULT_FLAGS.tribulation)CultTickBreak(dt);if(CULT_FLAGS.death)CultTickDeath(dt);}},
  anyFlag:function(){for(const k in CULT_FLAGS)if(CULT_FLAGS[k])return true;return false;},
  setFlags:function(o){if(o===false){for(const k in CULT_FLAGS)CULT_FLAGS[k]=false;return this;}if(!o)return this;for(const k in CULT_FLAGS){if(k in o)CULT_FLAGS[k]=!!o[k];}return this;},
  resetFlags:function(){return this.setFlags(false);},
  on:function(fn){this.listeners.push(fn);return this;},
  emit:function(type,data){const ev=Object.assign({type:type,t:S?S.time:0},data||{});(S.cultEv=S.cultEv||[]).push(ev);if(S.cultEv.length>64)S.cultEv.shift();for(const fn of this.listeners)try{fn(ev);}catch(e){console.warn('Cult.emit',e);}return ev;},
  // ---- 公開操作 ----
  canBreakthrough:function(u){return cultCanBreak(u);},
  startBreakthrough:function(u,auto){return cultStartBreak(u,!!auto);},
  breakProgress:function(u){const B=u&&u.cultBrk;if(!B)return 0;return Math.min(1,(B.prog||0)/Math.max(1,B.dur));},
  onDamageLethal:function(unit,src,ctx){return cultOnLethal(unit,src,ctx||{});},
  addCombatExp:function(u,amt){return cultAddCombat(u,amt);},
  addDiyun:function(u,amt){if(!u||!amt)return 0;u.diyun=(u.diyun||cultDiyunBase(u))+amt;return u.diyun;},
  diyunOf:function(u){return cultDiyunOf(u);},
  addDandu:function(u,n){return cultAddDandu(u,n==null?1:n);},
  danduLayers:function(u){return (u&&u.dandu)|0;},
  setLingqiZone:function(u,zone){if(!u)return;if(zone)this._qZone.set(u,zone);else this._qZone.delete(u);},
  lingqiTerrainMul:function(u){const z=u&&this._qZone.get(u);if(z==='high_mountain'||z==='mountain')return CULT_CFG.qiMountain;if(typeof this.terrainQiHook==='function'){try{const m=this.terrainQiHook(u);if(m>0)return m;}catch(e){}}return 1;},
  terrainQiHook:null,                 // 新地圖可設：(unit)=> number
  tribDmgHook:null,                   // (u, rawDmg, strikeI) => dmg；天劫台／法寶／丹藥
  hasTianjieTai:function(u){try{return typeof hasBuilt==='function'&&(hasBuilt('tianjie')||hasBuilt('tianjietai'));}catch(e){return false;}},
  hasFabaoGuard:function(u){return !!(u&&((u.eq&&u.eq.f&&u.eq.f.q>=3)||u.cultFabao));},
  hasTribPill:function(u){return !!(u&&u.cultTribPill);},
  hasRevivePill:function(u){if(!u)return false;if(u.cultRevivePill)return true;try{return typeof pillN==='function'&&pillN('fh')>0;}catch(e){return false;}},
  hasProtectTreasure:function(u){if(!u)return false;if(u.cultTreasure)return true;const e=u.eq;if(!e)return false;for(const k of ['c1','c2','c3','c4'])if(e[k]&&e[k].q>=4)return true;return false;},
  useMiehun:function(ys,src){return cultDestroyYuanShen(ys,src,'miehun');},
  attackYuanShen:function(ys,src,dmg){return cultHitYuanShen(ys,src,dmg);},
  applyOffline:function(wallSec){return cultApplyOffline(wallSec);},
  ensureUnit:function(u){return cultEnsure(u);},
  migrateSave:function(d){return cultMigrateSave(d);},
  qiRegenOf:function(u){return cultQiRegen(u);},
  lsCostFor:function(u,xiuAmt){return cultLsCost(u,xiuAmt);},
  lsSpend:function(who,cost,note){return cultLsSpend(who,cost,note);},
  econ:function(){return cultEcon();},
  coopActive:function(){return cultCoopActive();},coopIsClient:function(){return cultCoopIsClient();},
  applyDownPenalty:function(u,ctx){return cultApplyDownPenalty(u,ctx||{});},
  isPlayerChar:function(u){if(!u)return false;if(u.kind==='player'||u.np)return true;try{if(typeof xnIsPC==='function'&&xnIsPC(u))return true;}catch(e){}return false;},
  isAutoWorkExempt:function(u){try{if(window.CultWork&&typeof CultWork.exempt==='function')return !!CultWork.exempt(u);}catch(e){}if(!u||u.dead)return false;if(this.isPlayerChar(u))return true;try{if(typeof S!=='undefined'&&S&&S.dg)return true;}catch(e2){}if(u.job==='follow'||u.job==='guard'||u.v164||u.flyOn)return true;try{if(u.task&&(u.task.type==='attack'||u.task.type==='move'))return true;}catch(e3){}return false;}
};
window.Cult=Cult;
Cult.econBld={dev:function(){return cultQxDev();},tox:function(){return cultQxTox();},junior:function(u){return cultCgJunior(u);},cultMul:function(u){return typeof cultMul==='function'?cultMul(u):1;}};

function cultCoopActive(){
  try{
    const n=(typeof XW!=='undefined'&&XW&&XW.net)||(typeof window!=='undefined'&&window.XW&&window.XW.net)||(typeof NET!=='undefined'&&NET)||null;
    return !!(n&&(n.role==='host'||n.role==='client'));
  }catch(e){return false;}
}
function cultCoopIsClient(){
  try{if(typeof netAuthSilentNoop==='function'&&netAuthSilentNoop())return true;}catch(e){}
  try{
    const n=(typeof XW!=='undefined'&&XW&&XW.net)||(typeof window!=='undefined'&&window.XW&&window.XW.net)||(typeof NET!=='undefined'&&NET)||null;
    return !!(n&&n.role==='client');
  }catch(e){return false;}
}
function cultCoopAvatar(u){return !!(u&&(u.kind==='player'||u.np));}
function cultApplyDownPenalty(u,ctx){return {ok:false,reason:'no-death-mod'};}

function cultEnsure(u){
  if(!u)return u;
  if(u.combatExp==null)u.combatExp=0;
  if(u.diyun==null)u.diyun=cultDiyunBase(u);
  if(u.dandu==null)u.dandu=0;
  if(u.danduClear==null)u.danduClear=0;
  if(u._cultDanduRef==null&&(u.dandu|0)===0)u._cultDanduRef=null;
  return u;
}
// 悟性／氣運／仙緣 10～1000 尺度（g27 TUNE.rb.ax）：三項乘 cultAXk(u)（已換算＝0.1，否則＝1）；ax 關時與舊式完全相同。
// 換算時存值 ×10、係數 ×0.1，先天底蘊數值不變，故 u.diyun 內的先天快照不需遷移；先天部分一律以本函式動態計算（trib2 innateDiyun、cultTribReduce）。
// 仙武之體 +diyunXw 是固定加值，不隨悟性尺度縮放。
function cultAXk(u){try{if(typeof rbAXk==='function'){const k=+rbAXk(u);if(k>0&&isFinite(k))return k;}}catch(e){}return 1;}
// 套裝加成：window.econSetBonus(u) → {cultSpd,breakAdd,tribRed}（小數）。函式不存在、丟例外或欄位不是有限數字時當 0。
function cultEconSetBonus(u){
  const z={cultSpd:0,breakAdd:0,tribRed:0};
  try{
    if(typeof window==='undefined'||typeof window.econSetBonus!=='function')return z;
    const o=window.econSetBonus(u);
    if(!o)return z;
    if(typeof o.cultSpd==='number'&&isFinite(o.cultSpd))z.cultSpd=o.cultSpd;
    if(typeof o.breakAdd==='number'&&isFinite(o.breakAdd))z.breakAdd=o.breakAdd;
    if(typeof o.tribRed==='number'&&isFinite(o.tribRed))z.tribRed=o.tribRed;
  }catch(e){}
  return z;
}
try{window.cultEconSetBonus=cultEconSetBonus;if(window.Cult)Cult.econSetBonus=cultEconSetBonus;}catch(e){}

// 小境界頂層：g20 v52Top(realm)（地仙等十層境界＝9）；沒有時退回舊式 SUB_N-1。
function cultSubTop(u){try{if(typeof v52Top==='function'){const t=v52Top(u&&u.realm||0);if(typeof t==='number'&&isFinite(t))return t;}}catch(e){}return typeof SUB_N==='number'?SUB_N-1:3;}
function cultDiyunBase(u){
  if(!u)return 0;
  const k=cultAXk(u);
  let v=((u.wu||0)*CULT_CFG.diyunFromWu+(u.luck||0)*CULT_CFG.diyunFromLuck+(u.xy||0)*CULT_CFG.diyunFromXy)*k;
  try{if(typeof isXW==='function'&&u.body!=null&&isXW(u))v+=CULT_CFG.diyunXw;}catch(e){}
  return Math.max(0,v);
}
function cultDiyunOf(u){if(!u)return 0;if(u.diyun==null)u.diyun=cultDiyunBase(u);return u.diyun;}
function cultCombatShare(u){return CULT_CFG.combatShare[Math.min(u&&u.realm||0,CULT_CFG.combatShare.length-1)]||0;}
function cultCombatNeed(u){const sh=cultCombatShare(u);if(sh<=0)return 0;const need=typeof needXiu==='function'?needXiu(u):1;return Math.max(1,Math.round(need*sh/(1-sh)));}

function cultAddCombat(u,amt){
  if(!u||!amt||!CULT_FLAGS.dualExp||(u.realm||0)<CULT_CFG.dualFromRealm)return 0;
  cultEnsure(u);
  const need=cultCombatNeed(u);
  const was=u.combatExp;
  u.combatExp=Math.min(need,u.combatExp+amt);
  if(u.combatExp!==was)Cult.emit('cult:combatExp',{id:u.id,v:u.combatExp,need:need,d:u.combatExp-was});
  return u.combatExp-was;
}
function cultGainXiuWrap(u,amt,_gx){
  if(!u||!amt)return _gx(u,amt);
  cultEnsure(u);
  let a=amt;
  if(CULT_FLAGS.dandu){const L=u.dandu|0;if(L)a*=Math.max(0,1-CULT_CFG.danduCult*L);if(u.cultZouhuo&&u.cultZouhuo.coma>0)a=0;}
  if(CULT_FLAGS.death&&u.cultWeak){if(S.time>=u.cultWeak.t)u.cultWeak=null;else a*=Math.max(0,1-CULT_CFG.weakCult);}
  if(CULT_FLAGS.dualExp&&Cult._combatGain&&(u.realm||0)>=CULT_CFG.dualFromRealm){
    const sh=cultCombatShare(u);const mul=(typeof TUNE!=='undefined'&&TUNE.xiuMul)||1;
    const c=a*sh*mul;a=a*(1-sh);cultAddCombat(u,c);
  }
  if(CULT_FLAGS.cultLingshi&&!Cult._combatGain&&a>0){
    const k=cultTryChargeLingshi(u,a);
    if(typeof k==='number'&&k<1)a*=k; // 總庫不足：該次修為 ×lsShortMul，不停修
    else if(k===false)a=0;
  }
  if((u.sub||0)>=cultSubTop(u)&&u.xiu>=(typeof needXiu==='function'?needXiu(u):0)){
    if(CULT_FLAGS.breakthrough&&a>0){u.diyun=(u.diyun||cultDiyunBase(u))+a*CULT_CFG.diyunOverflow;}
  }
  return _gx(u,a);
}
function cultEcon(){
  try{
    const E=(typeof window!=='undefined'&&window.XW_ECON)||(typeof XW!=='undefined'&&XW&&XW.econ)||null;
    if(!E||typeof E.charge!=='function')return null;
    if(typeof E.cultivationCostPerPoint!=='function'&&typeof E.cultivationCost!=='function')return null;
    if(!(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.cult))return null;
    return E;
  }catch(e){return null;}
}
function cultLsNeed(u){
  try{
    const n=typeof needXiu==='function'?+needXiu(u):0;
    return Math.max(1, n>0?n:1);
  }catch(e){return 1;}
}
function cultLsHasXia(cost){
  if(!cost)return false;
  if(typeof cost==='number')return cost>0;
  return !!(cost.xia>0||(cost.amt>0&&cost.grade));
}
function cultLsCostPerPoint(u){
  const E=cultEcon();if(!E)return null;
  const realm=(u&&u.realm)|0;
  if(realm<=3)return null;
  const need=cultLsNeed(u);
  try{
    if(typeof E.cultivationCostPerPoint==='function'){
      const c=E.cultivationCostPerPoint(realm,need);
      if(!c||c===0)return null;
      return c;
    }
    if(typeof E.cultivationCost!=='function')return null;
    const tot=E.cultivationCost(realm);
    if(!tot||!(tot.xia>0))return null;
    const xia=Math.max(1,Math.ceil((+tot.xia||0)/need));
    return {xia:xia};
  }catch(e){return null;}
}
function cultLsCost(u){
  return cultLsCostPerPoint(u);
}
function cultLsSpend(who,cost,note){
  const E=cultEcon();if(!E||!cost)return {ok:true,via:'no-econ'};
  try{return E.charge(who,cost,note||'cultivation')||{ok:false,reason:'no-return'};}catch(e){return {ok:false,reason:'error'};}
}
// 境 0–3 免費。其餘每約 1 點非戰鬥修為扣一次 per-point 價；不足則該次 ×lsShortMul，不停修
function cultTryChargeLingshi(u,amt){
  const E=cultEcon();
  if(!E)return 1; // 無經濟模組或 cult 旗關：維持原遊戲（修煉不另扣石）
  if(((u&&u.realm)|0)<=3)return 1;
  const cost=cultLsCostPerPoint(u);if(!cultLsHasXia(cost))return 1;
  u._cultLsAcc=(u._cultLsAcc||0)+amt;
  const who=(CULT_CFG.lsPayer)||'vault';
  const short=(CULT_CFG.lsShortMul!=null)?+CULT_CFG.lsShortMul:0.5;
  while(u._cultLsAcc>=1){
    const r=cultLsSpend(who,cost,'cultivation:r'+(u.realm|0));
    if(!r||!r.ok){
      if(r&&(r.reason==='flag-off'||r.reason==='no-state'||r.reason==='no-bag'))return 1;
      return short;
    }
    u._cultLsAcc-=1;
  }
  return 1;
}

// 清心閣／傳功殿接經濟倍率（econ_buildings.js 匯出）。旗標 caiqx／caicg 預設開；?caiqx=0、?caicg=0 或 CULT_FLAGS.*=false 可關。
// 只改當下機率／速度，不寫入存檔、不改永久數值；沒有建築時倍率為 1＝原行為。
function cultEbOff(k){
  try{if(CULT_FLAGS[k]===false)return true;}catch(e){}
  try{const v=globalThis.__cultQS().get(k);return v==='0'||v==='off'||v==='false';}catch(e){return false;}
}
function cultEbNum(f,lo,hi){try{if(typeof f!=='function')return 1;const v=+f(S);return isFinite(v)?Math.max(lo,Math.min(hi,v)):1;}catch(e){return 1;}}
// 走火機率倍率：基礎＝丹毒滿層必定走火（機率 1），乘上 econDeviationMul（下限 0.2，由經濟夾）。
function cultQxDev(){if(cultEbOff('caiqx'))return 1;return cultEbNum(typeof econDeviationMul==='function'?econDeviationMul:null,0,1);}
// 清丹毒速度倍率：丹毒消退計時 ×econToxClearMul。
function cultQxTox(){if(cultEbOff('caiqx'))return 1;return cultEbNum(typeof econToxClearMul==='function'?econToxClearMul:null,1,10);}
// 傳功殿：弟子（非玩家）境界低於掌門至少 juniorMaxDelta 個大境界時，修煉 ×econJuniorCultMul。
function cultCgJunior(u){
  if(!u||u.kind==='player'||cultEbOff('caicg'))return 1;
  let d=1;
  try{if(typeof econBuildingEffectNow==='function'){const e=econBuildingEffectNow('chuangong',S);if(!e)return 1;if(e.juniorMaxDelta!=null)d=+e.juniorMaxDelta||1;}}catch(e){}
  const p=typeof player==='function'?player():null;
  if(!p||(u.realm|0)>(p.realm|0)-d)return 1;
  return cultEbNum(typeof econJuniorCultMul==='function'?econJuniorCultMul:null,1,10);
}

function cultAddDandu(u,n){
  if(!u||!CULT_FLAGS.dandu||!n)return u&&u.dandu||0;
  cultEnsure(u);
  const prev=u.dandu|0;
  if(prev===0){u._cultDanduRef=u.maxhp;u._cultDanduHv=cultDanduHv(u);u._cultDanduWant=null;}
  u.dandu=Math.min(CULT_CFG.danduMax,prev+n);
  u.danduClear=cultDanduClearTime(u);
  cultApplyDanduHp(u);
  Cult.emit('cult:dandu',{id:u.id,n:u.dandu});
  if(prev<CULT_CFG.danduMax&&u.dandu>=CULT_CFG.danduMax){
    const dm=cultQxDev();
    if(dm>=1||Math.random()<dm)cultZouhuo(u);
    else{try{if(typeof floater==='function')floater(u.x,u.y,'清心閣護持，免於走火','#9fe8ff');}catch(e){}Cult.emit('cult:zouhuoAvoid',{id:u.id,mul:dm});}
  }
  return u.dandu;
}
function cultDanduHv(u){return (u&&u._rb&&u._rb.hv!=null)?u._rb.hv:null;}
// 每境界固定數值換算（g27 改了 _rb）後，舊的絕對氣血參考值要跟著等比縮放，否則會把氣血壓回舊尺度
function cultDanduRefNow(u){
  if(!u||u._cultDanduRef==null)return u?u._cultDanduRef:null;
  const hv=cultDanduHv(u);
  if(hv!==(u._cultDanduHv==null?null:u._cultDanduHv)){
    const last=u._cultDanduWant>0?u._cultDanduWant:(u._preRB&&u._preRB.maxhp>0&&u._cultDanduHv==null?u._preRB.maxhp:0);
    if(last>0&&u.maxhp>0&&u.maxhp!==last)u._cultDanduRef=Math.max(1,Math.round(u._cultDanduRef*u.maxhp/last));
    u._cultDanduHv=hv;
  }
  return u._cultDanduRef;
}
function cultDanduClearTime(u){
  const sec=CULT_CFG.breakSec[u.realm];
  return sec||CULT_CFG.danduClearFallback;
}
function cultApplyDanduHp(u){
  const L=u.dandu|0;
  let ref=u._cultDanduRef;
  if(ref==null){if(!L)return;u._cultDanduRef=u.maxhp;u._cultDanduHv=cultDanduHv(u);u._cultDanduWant=null;return cultApplyDanduHp(u);}
  ref=cultDanduRefNow(u);
  const want=Math.max(1,Math.round(ref*(1-CULT_CFG.danduHp*L)));
  u._cultDanduWant=want;
  if(u.maxhp!==want){u.maxhp=want;if(u.hp>u.maxhp)u.hp=u.maxhp;}
}
function cultClearDanduFull(u){
  if(!u)return;
  const z=u.cultZouhuo;
  u.dandu=0;u.danduClear=0;
  if(u._cultDanduRef!=null){u.maxhp=cultDanduRefNow(u);u._cultDanduRef=null;u._cultDanduHv=null;u._cultDanduWant=null;if(u.hp>u.maxhp)u.hp=u.maxhp;}
  if(z){
    if(z.xiuLost)u.xiu=(u.xiu||0)+z.xiuLost;
    if(z.maxhp0!=null&&u.dandu===0){/* hp already restored via ref */}
    u.cultZouhuo=null;u.cultComa=0;
    Cult.emit('cult:zouhuoClear',{id:u.id,xiu:u.xiu,maxhp:u.maxhp});
  }
  Cult.emit('cult:dandu',{id:u.id,n:0});
}
function cultZouhuo(u){
  const need=typeof needXiu==='function'?needXiu(u):u.xiu||0;
  const lost=Math.floor((u.xiu||0)*CULT_CFG.zouhuoXiuLoss);
  u.xiu=Math.max(0,(u.xiu||0)-lost);
  u.cultZouhuo={xiuLost:lost,need:need,t0:S?S.time:0,coma:CULT_CFG.zouhuoComa};
  u.cultComa=CULT_CFG.zouhuoComa;
  if(typeof floater==='function')floater(u.x,u.y,'走火入魔','#ff6a6a');
  if(typeof toast==='function')toast((typeof nm==='function'?nm(u):'修士')+'丹毒攻心，走火入魔！修為暫退、陷入昏迷（消退後會恢復，不掉境界）');
  Cult.emit('cult:zouhuo',{id:u.id,xiuLost:lost,realm:u.realm,sub:u.sub||0});
}

function cultQiRegen(u){
  if(!u||!(u.qiMax>0))return 0;
  let r=CULT_CFG.qiRegen[Math.min(u.realm||0,CULT_CFG.qiRegen.length-1)]||0;
  r*=CULT_CFG.qiGlobalCut;
  if(u.medit||(u.task&&u.task.type==='meditate'))r*=CULT_CFG.qiMedMul;
  r*=Cult.lingqiTerrainMul(u);
  return r;
}

function cultApplyOffline(wallSec){
  const cap=Math.min(Math.max(0,wallSec||0),CULT_CFG.offlineWallCap);
  const dt=cap*CULT_CFG.offlineRate;
  if(dt<=0)return 0;
  if(typeof CultTickBreak==='function')CultTickBreak(dt,true);
  if(CULT_FLAGS.dandu&&S&&S.units)for(const u of S.units)cultTickDandu(u,dt);
  Cult.emit('cult:offline',{wall:cap,dt:dt});
  return dt;
}
function cultTickDandu(u,dt){
  if(!u||!(u.dandu>0))return;
  if(u.danduClear==null)u.danduClear=cultDanduClearTime(u);
  u.danduClear-=dt*cultQxTox();
  if(u.cultComa>0)u.cultComa=Math.max(0,u.cultComa-dt);
  if(u.cultZouhuo&&u.cultZouhuo.coma>0)u.cultZouhuo.coma=u.cultComa;
  if(u.danduClear<=0)cultClearDanduFull(u);
}
function cultTickCore(dt){
  if(!S||!S.units)return;
  for(const u of S.units){
    if(CULT_FLAGS.dandu)cultTickDandu(u,dt);
    if(CULT_FLAGS.death&&u.cultWeak&&S.time>=u.cultWeak.t)u.cultWeak=null;
    if(CULT_FLAGS.death&&u.cultWound&&S.time>=u.cultWound.t){cultEndWound(u);}
  }
}

function cultMigrateSave(d){
  if(!d)return d;
  const v=(d.flags&&d.flags.cult&&d.flags.cult.v)|0;
  if(!d.flags)d.flags={};
  if(!d.flags.cult)d.flags.cult={v:CULT_CFG.saveVer};
  d.flags.cult.v=CULT_CFG.saveVer;
  const list=[].concat(d.units||[],d.enemies||[]);
  for(const u of list)cultMigrateUnit(u);
  if(!d.cultFled)d.cultFled=[];
  if(!d.cultYuanShen)d.cultYuanShen=[];
  d._cultMig=v;
  return d;
}
function cultMigrateUnit(u){
  if(!u)return;
  if(u.combatExp==null)u.combatExp=0;
  if(u.diyun==null)u.diyun=cultDiyunBase(u);
  if(u.dandu==null)u.dandu=0;
  if(u.danduClear==null)u.danduClear=0;
  if(u.cultBrk&&u.cultBrk.wall==null)u.cultBrk.wall=Date.now();
}
function cultMigrateState(){
  if(!S)return;
  S.flags=S.flags||{};
  if(!S.flags.cult)S.flags.cult={v:CULT_CFG.saveVer};
  if(!S.cultFled)S.cultFled=[];
  if(!S.cultYuanShen)S.cultYuanShen=[];
  if(S.units)for(const u of S.units)cultEnsure(u);
}

const CULT_UNIT_FIELDS=['combatExp','diyun','dandu','danduClear','_cultDanduRef','_cultDanduHv','_cultDanduWant','cultBrk','cultWound','cultWeak','cultZouhuo','cultComa','cultYS','cultRevivePill','cultTreasure','cultFabao','cultTribPill'];
const CULT_EN_FIELDS=['combatExp','diyun','dandu','cultWound','cultFled','cultLooted','cultYS','cultReturnAt'];

function cultInstall(){
  if(Cult._hooks)return;
  Cult._hooks=1;
  try{if(typeof UNIT_KEEP!=='undefined')UNIT_KEEP.push.apply(UNIT_KEEP,CULT_UNIT_FIELDS);}catch(e){}
  try{if(typeof EN_KEEP!=='undefined')EN_KEEP.push.apply(EN_KEEP,CULT_EN_FIELDS);}catch(e){}

  if(typeof gainXiu==='function'){const _gx=gainXiu;gainXiu=function(u,amt){return cultGainXiuWrap(u,amt,_gx);};}
  if(typeof killEnemy==='function'){const _ke=killEnemy;killEnemy=function(src,e){
    if(CULT_FLAGS.death&&!cultCoopActive()&&e&&cultEnemyLethal(_ke,src,e))return;
    Cult._combatGain=1;try{return _ke(src,e);}finally{Cult._combatGain=0;}
  };}
  if(typeof dmgEnemy==='function'){const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){
    if(CULT_FLAGS.death&&e&&e.cultYS)return cultHitYuanShen(e,src,amt);
    Cult._combatGain=1;try{
      const r=_de(src,e,amt,col);
      try{if(CULT_FLAGS.death&&!cultCoopActive()&&e&&!e.dead&&(e.hp||0)>0)cultMaybeFleeAfterHit(src,e);}catch(err){}
      return r;
    }finally{Cult._combatGain=0;}
  };}
  if(typeof dmgUnit==='function'){const _du=dmgUnit;dmgUnit=function(src,u,amt){
    if(!CULT_FLAGS.death)return _du.apply(this,arguments);
    // 聯機化身：客機與元嬰前不改結算；房主元嬰＋走 cultAfterDmgUnit（元神出竅）
    if(cultCoopActive()&&cultCoopAvatar(u)){
      const client=typeof cultCoopIsClient==='function'&&cultCoopIsClient();
      const yy=u&&((typeof cultIsYuanYing==='function'&&cultIsYuanYing(u))||u.cultYS);
      if(client||!yy)return _du.apply(this,arguments);
    }
    if(u&&u.cultYS)return;
    const hp0=u&&u.hp,in0=S&&S.units&&S.units.includes(u),dead0=u&&u.dead,dn0=u&&u.y47dn;
    const r=_du.apply(this,arguments);
    if(u)cultAfterDmgUnit(src,u,{hp0:hp0,in0:in0,dead0:dead0,dn0:dn0});
    return r;
  };}
  if(typeof onPlayerDeath==='function'){const _pd=onPlayerDeath;onPlayerDeath=function(u){
    if(CULT_FLAGS.death&&cultCoopActive()&&cultCoopAvatar(u)){
      const client=typeof cultCoopIsClient==='function'&&cultCoopIsClient();
      const yy=u&&((typeof cultIsYuanYing==='function'&&cultIsYuanYing(u))||u.cultYS);
      if(client||!yy)return _pd.apply(this,arguments);
    }
    if(CULT_FLAGS.death&&u&&cultHandlePlayerDeath(u,_pd))return;
    return _pd.apply(this,arguments);
  };}
  if(typeof tryBreak==='function'){const _tb=tryBreak;tryBreak=function(u,auto){
    if(!CULT_FLAGS.breakthrough)return _tb.apply(this,arguments);
    return cultStartBreak(u,!!auto,_tb);
  };}
  if(typeof breakConds==='function'){const _bc=breakConds;breakConds=function(u){
    const c=_bc(u);
    if(!CULT_FLAGS.breakthrough||!u||!c||!c.list)return c;
    return cultAugmentConds(u,c);
  };}
  if(typeof capped==='function'){const _cp=capped;capped=function(u){
    if(CULT_FLAGS.breakthrough&&u)return u.realm>=CULT_CFG.maxRealm&&(u.sub||0)>=cultSubTop(u)&&u.xiu>=needXiu(u);
    return _cp(u);
  };}
  if(typeof doBreak==='function'){const _db=doBreak;doBreak=function(u){
    const L=u&&(u.dandu|0),ref=u&&cultDanduRefNow(u);
    if(CULT_FLAGS.dandu&&u&&L){u.maxhp=ref!=null?ref:u.maxhp;}
    const r0=u&&u.realm,r=_db.apply(this,arguments);
    if(u){u.combatExp=0;u.cultBrk=null;if(CULT_FLAGS.dandu&&L){u._cultDanduRef=u.maxhp;u._cultDanduHv=cultDanduHv(u);u._cultDanduWant=null;u.dandu=L;cultApplyDanduHp(u);}Cult.emit('cult:breakDone',{id:u.id,from:r0,to:u.realm});}
    return r;
  };}
  if(typeof cultMul==='function'){const _cm=cultMul;cultMul=function(u){
    let m=_cm(u);
    if(CULT_FLAGS.dandu&&u)m*=Math.max(0,1-CULT_CFG.danduCult*(u.dandu|0));
    try{m*=cultCgJunior(u);}catch(e){}
    if(CULT_FLAGS.death&&u&&u.cultWeak&&S&&S.time<u.cultWeak.t)m*=Math.max(0,1-CULT_CFG.weakCult);
    try{
      const s=typeof cultEconSetBonus==='function'?cultEconSetBonus(u):null;
      const v=s&&s.cultSpd;
      if(typeof v==='number'&&isFinite(v)&&v)m*=(1+v);
    }catch(e){}
    return m;
  };}
  if(typeof usePill==='function'){const _up=usePill;usePill=function(u,k){
    const ok=_up.apply(this,arguments);
    if(ok&&CULT_FLAGS.dandu&&u&&CULT_CFG.danduPills[k])cultAddDandu(u,CULT_CFG.danduPills[k]);
    return ok;
  };}
  if(typeof v49PoolTick==='function'){const _pt=v49PoolTick;v49PoolTick=function(u,dt){
    if(!CULT_FLAGS.lingqi||!u)return _pt.apply(this,arguments);
    const q0=u.qi;_pt(u,dt);
    if(u.qiMax>0){const our=u.qiMax*cultQiRegen(u)*dt;const q1=Math.min(u.qiMax,(q0==null?0:q0)+our);u.qi=q1;}
  };}
  if(typeof qiMaxFor==='function'){const _qm=qiMaxFor;qiMaxFor=function(u){
    const base=_qm(u);if(!CULT_FLAGS.lingqi||!u||!base)return base;
    if(typeof TUNE!=='undefined'&&TUNE.rb&&TUNE.rb.on)return base; // 每境界固定數值（g27）開啟時，靈力上限以新表為準，不再套 qiMaxMul
    const mul=CULT_CFG.qiMaxMul[Math.min(u.realm,CULT_CFG.qiMaxMul.length-1)]||1;
    return Math.max(1,Math.round(TUNE.v49.qiBase*mul*(1+TUNE.v49.qiSub*(u.sub||0))));
  };}
  if(typeof tickV045==='function'){const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{Cult.tick(dt);}catch(e){console.warn('Cult.tick',e);}return r;};}
  if(typeof applySave==='function'){const _as=applySave;applySave=function(d){
    try{if(d)cultMigrateSave(d);}catch(e){}
    const r=_as.apply(this,arguments);
    try{if(r&&S){cultMigrateState();if(d&&d.cultFled)S.cultFled=d.cultFled;if(d&&d.cultYuanShen)S.cultYuanShen=d.cultYuanShen;if(d&&d.cultSquads)S.cultSquads=d.cultSquads;if(d&&d.cultBibi)S.cultBibi=d.cultBibi;}}catch(e){}
    return r;
  };}
  if(typeof snapshot==='function'){const _sn=snapshot;snapshot=function(){
    const d=_sn.apply(this,arguments);
    try{if(d){d.flags=d.flags||{};d.flags.cult=S&&S.flags&&S.flags.cult||{v:CULT_CFG.saveVer};d.cultFled=S&&S.cultFled||[];d.cultYuanShen=S&&S.cultYuanShen||[];d.cultSquads=S&&S.cultSquads||[];d.cultBibi=S&&S.cultBibi||null;}}catch(e){}
    return d;
  };}
  if(typeof dgUpdate==='function'&&!Cult._dgTick){Cult._dgTick=1;const _dg=dgUpdate;dgUpdate=function(dt){
    const r=_dg.apply(this,arguments);
    try{Cult.tick(dt);}catch(e){console.warn('Cult.tick',e);}
    return r;
  };}
  if(typeof updateUnit==='function'){const _uu=updateUnit;updateUnit=function(u,dt){
    if(CULT_FLAGS.dandu&&u&&u.cultComa>0){u.dvx=u.dvy=0;u.path=[];return;}
    if((CULT_FLAGS.breakDuration||CULT_FLAGS.tribulation)&&u&&u.cultBrk&&u.cultBrk.lock){u.dvx=u.dvy=0;u.path=[];}
    return _uu.apply(this,arguments);
  };}
  if(typeof document!=='undefined'&&document.addEventListener){
    document.addEventListener('visibilitychange',function(){
      if(!Cult.anyFlag())return;
      if(document.hidden){Cult._hiddenAt=Date.now();return;}
      if(Cult._hiddenAt){const w=(Date.now()-Cult._hiddenAt)/1000;Cult._hiddenAt=0;try{cultApplyOffline(w);}catch(e){}}
    });
  }
}

// 占位：breakthrough／death 檔案會覆寫
function cultCanBreak(u){if(!u)return false;if(typeof breakConds==='function'){const c=breakConds(u);return !!(c&&c.ok);}return false;}
function cultStartBreak(u,auto,_tb){return _tb?_tb(u,auto):false;}
function cultAugmentConds(u,c){return c;}
function CultTickBreak(dt,off){}
function cultOnLethal(u,src,ctx){return false;}
function cultAfterDmgUnit(){}
function cultHandlePlayerDeath(){return false;}
function cultEnemyLethal(){return false;}
function cultShouldWoundEnemy(){return false;}
function cultWoundEnemy(){}
function cultMaybeFleeAfterHit(){}
function cultHitYuanShen(){}
function cultDestroyYuanShen(){return false;}
function CultTickDeath(){}
function cultEndWound(u){if(u)u.cultWound=null;}

Cult.init();


// ================== 開發金手指（僅 ?dev=1 或 localhost／127.0.0.1）==================
function cultDevMode(loc){
  loc=loc||(typeof location!=='undefined'?location:{});
  try{
    const host=String(loc.hostname||loc.host||'');
    const search=String(loc.search||'');
    if(/\bdev=1\b/.test(search)||search.indexOf('dev=1')>=0)return true;
    if(host==='localhost'||host==='127.0.0.1')return true;
  }catch(e){}
  return false;
}
function cultCheatDown(){
  // 走既有 dmgUnit 倒地／身隕流程。不生成單位、不搬動弟子。
  // 主角倒地（y47dn）只在附近已有可救援同門時觸發（y47HasRescuer，rescR=18）；
  // 身邊沒有救援者時，正常流程即為身隕（onPlayerDeath），這是有意的、無副作用。
  const p=typeof player==='function'?player():null;
  if(!p){try{if(typeof toast==='function')toast('沒有主角');}catch(e){}return;}
  const gqMax0=p.gqMax,lg0=p.lg,gq0=p.gq,sh0=p.shield;
  p.shield=0;
  p.gq=0;
  p.acd=p.acd||{};p.acd.xd=999;
  const amt=(p.maxhp||100)*8+200;
  if(typeof dmgUnit!=='function'){
    p.gq=gq0;p.gqMax=gqMax0;p.lg=lg0;p.shield=sh0;
    try{if(typeof toast==='function')toast('無法自傷');}catch(e4){}
    return;
  }
  for(let i=0;i<6&&p&&!p.y47dn&&!p.dead&&(p.hp||0)>1;i++){
    p.acd.xd=999;p.gq=0;p.shield=0;
    try{dmgUnit(null,p,amt);}catch(e5){}
  }
  p.gqMax=gqMax0;p.lg=lg0;
}
function cultCheatXtlOpen(){
  const p=typeof player==='function'?player():null;
  if(!p){try{if(typeof toast==='function')toast('沒有主角');}catch(e){}return;}
  try{if(typeof CULT_FLAGS!=='undefined')CULT_FLAGS.xtl=true;}catch(e){}
  try{if(window.Cult&&typeof Cult.startXtl==='function')return Cult.startXtl(p,{force:true});}catch(e2){}
  try{if(window.XW_XTL&&typeof XW_XTL.start==='function')return XW_XTL.start(p,{force:true});}catch(e3){}
}
function cultEnsureDevCheats(){
  const show=cultDevMode();
  try{
    if(typeof X47_DBG!=='undefined'&&Array.isArray(X47_DBG)){
      const has=X47_DBG.some(d=>d&&d[0]==='cult_down');
      if(show&&!has){
        X47_DBG.push(['cult_down','自傷至倒地',cultCheatDown]);
        X47_DBG.push(['cult_xtlopen','直接開踏仙梯',cultCheatXtlOpen]);
      }else if(!show&&has){
        for(let i=X47_DBG.length-1;i>=0;i--){
          const k=X47_DBG[i]&&X47_DBG[i][0];
          if(k==='cult_down'||k==='cult_xtlopen')X47_DBG.splice(i,1);
        }
      }
    }
  }catch(e){}
  try{
    if(typeof XMOD_BTNS!=='undefined'&&XMOD_BTNS){
      const arr=XMOD_BTNS.misc||(XMOD_BTNS.misc=[]);
      if(show){
        if(arr.indexOf('cult_down')<0)arr.push('cult_down','cult_xtlopen');
      }else{
        for(let i=arr.length-1;i>=0;i--)if(arr[i]==='cult_down'||arr[i]==='cult_xtlopen')arr.splice(i,1);
      }
    }
  }catch(e2){}
}
(function cultInstallDevCheats(){
  try{
    if(typeof x47DbgOpen==='function'&&!x47DbgOpen._cultDevW){
      const _op=x47DbgOpen;
      x47DbgOpen=function(){try{cultEnsureDevCheats();}catch(e){}return _op.apply(this,arguments);};
      x47DbgOpen._cultDevW=1;
    }
  }catch(e){}
  try{cultEnsureDevCheats();}catch(e2){}
  window.CultCheats={
    visible:cultDevMode,
    ensure:cultEnsureDevCheats,
    down:cultCheatDown,
    xtlOpen:cultCheatXtlOpen
  };
})();
