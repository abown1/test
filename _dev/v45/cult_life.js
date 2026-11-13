// ================== cult_life.js：壽元（境界壽命；旗標 life 預設 ON）==================
// 插入：cult_xtl_fx.js 之後、g7 之前。不改 g*/build.py。
// 聯機：房主推進 S.worldYear 與玩家 lifeAgedSec；客機永不推進。
(function(){
'use strict';
if(typeof CULT_FLAGS==='undefined')window.CULT_FLAGS={};
if(CULT_FLAGS.life==null)CULT_FLAGS.life=true;

const CULT_LIFE_CFG={
  saveVer:3,                   // 3：YEAR_SEC 60→300；讀 saveVer<3 的檔時把玩家／np 已累計秒數折成 lifeStartAge（只跑一次）
  YEAR_SEC:300,                // 已定（創意家 11-10）：1 遊戲年＝300 現實秒（5 分鐘；受遊戲速度；世界暫停則停）。壽元表年數不變
  OLD_YEAR_SEC:60,             // 舊版（saveVer≤2）每年秒數，僅供遷移；heroWeakDur／heroSecludeSec 仍是真實秒數，不隨此改
  hooksOn:false,               // 壽終／壽元將盡 hook（cultHooks.onLifeEnd／onLifeLow）總開關；false＝完全不呼叫
  lowFrac:0.10,                // onLifeLow：壽元剩餘比例第一次 <此值時呼叫一次
  maxYears:[80,80,90,100,120,200,500,1000,2000,5000,10000,10000], // 待確認：REALMS 0…11
  heroMul:1.5,                 // 待確認：仙武之體／主角倍率
  heroMulFor:'player',         // 'player'＝僅 kind==='player'；'heroBody'＝isXW／仙武之體；'playerChar'＝player+np
  startAgeMin:14,              // 待確認：新弟子起始年齡
  startAgeMax:30,              // 待確認
  heroStartAge:16,             // 待確認：玩家角色起始年齡
  warnFrac:0.10,               // 待確認：剩餘 ≤10% 警告
  // 主角／玩家角色壽元將盡：強制閉關＋暫時虛弱＋延長壽元（永不永久改數值、不掉境、不 Game Over）
  heroExtendYears:20,          // 待確認
  heroWeakDur:180,             // 待確認
  heroWeakAtk:0.25,            // 待確認
  heroWeakCult:0.30,           // 待確認
  heroSecludeSec:30,           // 待確認
  tickInterval:1.0,            // 待確認：世界年推進／結算間隔（遊戲秒）
  hooks:{ reincarnation:null, deathFeedback:null, worldLingqi:null }
};
window.CULT_LIFE_CFG=CULT_LIFE_CFG;

const ST={_in:0,_acc:0,_lastCost:0};
const _lifeReentry=!!(window._XW_LIFE_WRAP||(window.XW_LIFE&&typeof window.XW_LIFE.ageOf==='function'));

function on(){return !!(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.life);}
function getS(){try{return (typeof S!=='undefined'&&S)||(window.XW&&XW.S)||null;}catch(e){return null;}}
function emit(t,d){try{if(window.Cult&&typeof Cult.emit==='function')return Cult.emit(t,d);}catch(e){}return d;}
function coop(){try{return !!(window.Cult&&Cult.coopActive&&Cult.coopActive());}catch(e){return false;}}
function isClient(){
  try{
    const n=(typeof XW!=='undefined'&&XW&&XW.net)||(window.XW&&XW.net)||null;
    return !!(n&&n.role==='client');
  }catch(e){return false;}
}
function hostAuth(){return !coop()||!isClient();}
// ── 壽元 hook（與仙武經濟定案的名稱）：window.cultHooks.onLifeEnd／onLifeLow（陣列，逐一 try/catch）
//    onLifeEnd(u)：角色因壽終被移除（弟子坐化）或輪迴（主角坐化）「之前」呼叫，u 仍在 S.units。
//    onLifeLow(u,frac)：壽元剩餘比例第一次 <lowFrac 時呼叫一次（u._cultLowFired 防重複；比例回到 ≥lowFrac 時解除）。
//    CULT_LIFE_CFG.hooksOn＝false 時完全不呼叫；聯機只在房主端觸發（客機不呼叫）。弟子與玩家都觸發，職位過濾由 econ 端處理。
window.cultHooks=window.cultHooks||{};
cultHooks.onLifeEnd=cultHooks.onLifeEnd||[];
cultHooks.onLifeLow=cultHooks.onLifeLow||[];
function hookClient(){
  try{if(typeof netAuthSilentNoop==='function'&&netAuthSilentNoop())return true;}catch(e){}
  return isClient();
}
function fireHook(name,args){
  if(!CULT_LIFE_CFG.hooksOn)return 0;
  if(hookClient())return 0;
  const L=window.cultHooks&&window.cultHooks[name];
  if(!Array.isArray(L)||!L.length)return 0;
  let n=0;
  for(const h of L.slice()){
    if(typeof h!=='function')continue;
    try{h.apply(null,args);n++;}catch(e){try{console.warn('cultHooks.'+name,e);}catch(e2){}}
  }
  return n;
}
function checkLow(u){
  if(!u||u.lifeMax==null||!isFinite(+u.lifeMax)||!(+u.lifeMax>0))return;
  const frac=remaining(u)/(+u.lifeMax);
  const lf=(typeof CULT_LIFE_CFG.lowFrac==='number')?CULT_LIFE_CFG.lowFrac:0.10;
  if(frac>=lf){if(u._cultLowFired)u._cultLowFired=0;return;}
  if(u._cultLowFired)return;
  if(!CULT_LIFE_CFG.hooksOn||hookClient())return;
  u._cultLowFired=1;
  fireHook('onLifeLow',[u,frac]);
}
function worldPaused(){
  try{if(typeof paused!=='undefined'&&paused)return true;}catch(e){}
  try{if(window.XW&&XW.paused)return true;}catch(e2){}
  return false;
}
function wan(n){
  try{if(typeof xwN==='function')return xwN(n);}catch(e){}
  n=+n;if(!isFinite(n))return '—';
  const neg=n<0;n=Math.abs(n);
  let s;if(n<1e4)s=String(Math.round(n));
  else if(n<1e8){const v=n/1e4;s=(v>=100?String(Math.round(v)):v.toFixed(1).replace(/\.0$/,''))+'萬';}
  else{const v=n/1e8;s=v.toFixed(v>=10?1:2).replace(/\.00$/,'').replace(/\.0$/,'')+'億';}
  return (neg?'-':'')+s;
}
function isHeroBody(u){
  if(!u)return false;
  if(u.kind==='player')return true;
  try{if(typeof isXW==='function')return !!isXW(u);}catch(e){}
  try{if(typeof BODIES!=='undefined'&&BODIES[u.body]&&BODIES[u.body].n==='仙武之體')return true;}catch(e2){}
  return false;
}
function isPlayerChar(u){
  if(!u)return false;
  if(u.kind==='player'||u.np)return true;
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar!==isPlayerChar)return !!Cult.isPlayerChar(u);}catch(e){}
  return false;
}
function isDisciple(u){return !!(u&&u.kind==='disciple'&&!u.np);}
function relevant(u){return isPlayerChar(u)||isDisciple(u);}
function appliesHeroMul(u){
  if(!u)return false;
  const mode=CULT_LIFE_CFG.heroMulFor||'player';
  if(mode==='playerChar')return isPlayerChar(u);
  if(mode==='heroBody')return isHeroBody(u);
  return u.kind==='player';
}

function randAge(){
  const a=CULT_LIFE_CFG.startAgeMin|0,b=CULT_LIFE_CFG.startAgeMax|0;
  try{if(typeof ri==='function')return ri(a,b);}catch(e){}
  try{if(typeof rnd==='function')return a+Math.floor(rnd()*(b-a+1));}catch(e2){}
  return a+Math.floor(Math.random()*(b-a+1));
}
function baseMax(realm){
  const t=CULT_LIFE_CFG.maxYears;
  const r=Math.max(0,Math.min((realm|0),(t.length-1)));
  return t[r]|0;
}
function ensureWorld(){
  const s=getS();if(!s)return 0;
  if(s.worldYear==null||!isFinite(+s.worldYear))s.worldYear=0;
  return +s.worldYear;
}
function worldYear(){return ensureWorld();}

// 預設：單機一律視為連線；聯機層可覆寫 XW_LIFE.isConnected
function defaultConnected(u){
  if(!u)return false;
  if(!coop())return true;
  if(u.lifeConnected===false)return false;
  if(u.lifeConnected===true)return true;
  return true;
}
function isConnected(u){
  try{
    if(CultLife._isConnected&&CultLife._isConnected!==defaultConnected)
      return !!CultLife._isConnected(u);
  }catch(e){}
  return defaultConnected(u);
}

function lifeMaxOf(u){
  if(!u)return 0;
  if(isPlayerChar(u)){
    if(u.ascended)return Infinity;
    if(u.kind==='player'){const s=getS();if(s&&s.ascended)return Infinity;}
  }
  let m=baseMax(u.realm|0);
  if(appliesHeroMul(u))m=Math.round(m*CULT_LIFE_CFG.heroMul);
  return m;
}
function syncMax(u){
  if(!u||!relevant(u))return;
  const mx=lifeMaxOf(u);
  if(mx===Infinity){u.lifeMax=null;return;}
  const cur=+u.lifeMax;
  if(!isFinite(cur)||mx>cur)u.lifeMax=mx;
  else if(u.lifeMax==null)u.lifeMax=mx;
}

function ageOf(u){
  ensure(u);
  // 主角與 np 成員一律走 lifeStartAge＋lifeAgedSec，絕不跟隨 worldYear
  if(isPlayerChar(u)||(u&&(u.kind==='player'||u.np))){
    const start=u.lifeStartAge!=null?+u.lifeStartAge:CULT_LIFE_CFG.heroStartAge;
    const sec=+u.lifeAgedSec||0;
    return start+sec/Math.max(1e-6,CULT_LIFE_CFG.YEAR_SEC);
  }
  // 真弟子：age = S.worldYear - birthWorldYear
  return ensureWorld()-(+u.birthWorldYear||0);
}
function remaining(u){
  ensure(u);
  if(u.lifeMax==null||!isFinite(+u.lifeMax))return Infinity;
  return Math.max(0,(+u.lifeMax)-ageOf(u));
}
function lifeLabel(u){
  ensure(u);
  const a=ageOf(u);
  if(u.lifeMax==null||!isFinite(+u.lifeMax))return '壽元 '+wan(Math.floor(a))+'/∞';
  return '壽元 '+wan(Math.floor(a))+'/'+wan(Math.floor(u.lifeMax));
}

function ensure(u){
  if(!u||!relevant(u))return u;
  ensureWorld();
  if(isPlayerChar(u)||(u&&(u.kind==='player'||u.np))){
    if(u.np&&u.birthWorldYear!=null&&isFinite(+u.birthWorldYear)&&(u.lifeStartAge==null||!isFinite(+u.lifeStartAge))){
      u.lifeStartAge=ensureWorld()-(+u.birthWorldYear);
      if(u.lifeAgedSec==null||!isFinite(+u.lifeAgedSec))u.lifeAgedSec=0;
    }
    if(u.lifeStartAge==null||!isFinite(+u.lifeStartAge))u.lifeStartAge=CULT_LIFE_CFG.heroStartAge|0;
    if(u.lifeAgedSec==null||!isFinite(+u.lifeAgedSec))u.lifeAgedSec=0;
  }else{
    if(u.birthWorldYear==null||!isFinite(+u.birthWorldYear)){
      const a=(u.age!=null&&isFinite(+u.age))?+u.age:randAge();
      u.birthWorldYear=ensureWorld()-a;
    }
  }
  syncMax(u);
  if(u.lifeWarn==null)u.lifeWarn=0;
  return u;
}

function logMsg(msg){
  try{if(typeof y47EvLog==='function'){y47EvLog(msg);return;}}catch(e){}
  try{if(typeof toast==='function')toast(msg);}catch(e2){}
}

function applyHeroExpire(u){
  const s=getS();
  const now=(s&&s.time)||0;
  const ext=CULT_LIFE_CFG.heroExtendYears|0;
  ensure(u);
  const mx=lifeMaxOf(u);
  if(mx===Infinity){u.lifeMax=null;u.lifeWarn=0;return {ok:true,kind:'unlimited'};}
  const age=ageOf(u);
  u.lifeMax=Math.max(+u.lifeMax||0, Math.floor(age)+ext);
  u.lifeWarn=0;
  const atk0=u.atk;
  u.cultLifeWeak={
    until:now+CULT_LIFE_CFG.heroWeakDur,atk0:atk0,why:'oldAge',
    atkMul:CULT_LIFE_CFG.heroWeakAtk,cultMul:CULT_LIFE_CFG.heroWeakCult
  };
  if(u.atk!=null)u.atk=+(atk0*(1-CULT_LIFE_CFG.heroWeakAtk)).toFixed(2);
  u.cultLifeSeclude={until:now+CULT_LIFE_CFG.heroSecludeSec,why:'oldAge'};
  try{if(typeof assignJob==='function'&&typeof hasBuilt==='function'&&hasBuilt('lianwu'))assignJob(u,'seclude');}catch(e){}
  if(typeof floater==='function')floater(u.x,u.y,'壽元延續','#ffe27a');
  if(typeof toast==='function')toast('你壽元將盡，閉關養息，暫時虛弱，壽元得以延續（境界與永久數值不變）');
  emit('cult:lifeHeroExpire',{id:u.id,extend:ext,age:age,lifeMax:u.lifeMax,weak:true,seclude:true});
  return {ok:true,kind:'extend',extend:ext,lifeMax:u.lifeMax};
}

function revertWeak(u){
  if(!u||!u.cultLifeWeak)return;
  if(u.cultLifeWeak.atk0!=null&&u.atk!=null)u.atk=u.cultLifeWeak.atk0;
  u.cultLifeWeak=null;
}

function zuohua(u){
  if(!u||!isDisciple(u))return {ok:false,reason:'not-disciple'};
  if(!hostAuth())return {ok:false,reason:'client'};
  const s=getS();
  const id=u.id,name=u.name,realm=u.realm|0,age=ageOf(u),lifeMax=u.lifeMax;
  fireHook('onLifeEnd',[u]); // 移除前：u 仍在 S.units
  try{
    if(window.Cult&&typeof Cult.applyDownPenalty==='function'){
      Cult.applyDownPenalty(u,{why:'oldAge',src:'life',downId:'life:'+id+':'+Math.floor((s&&s.time)||0),lethal:true});
    }
  }catch(e){}
  try{
    if(s&&s.units&&s.units.includes(u))s.units=s.units.filter(x=>x!==u);
    try{if(typeof selUnits!=='undefined'&&selUnits)selUnits=selUnits.filter(x=>x!==id);}catch(e2){}
    try{if(typeof corpse==='function')corpse(u);}catch(e3){}
  }catch(e4){}
  if(typeof floater==='function')floater(u.x,u.y,'坐化','#d8c8ff');
  if(typeof toast==='function')toast(`弟子「${name||''}」壽元已盡，坐化歸真`);
  logMsg(`「${name||''}」坐化（壽元已盡）`);
  emit('cult:lifeEnd',{id:id,why:'oldAge',name:name,realm:realm,age:age,lifeMax:lifeMax,zuohua:true});
  emit('cult:zuohua',{id:id,why:'oldAge',name:name,realm:realm,age:age});
  try{if(typeof CULT_LIFE_CFG.hooks.deathFeedback==='function')CULT_LIFE_CFG.hooks.deathFeedback({id:id,why:'oldAge'});}catch(e5){}
  try{if(typeof CULT_LIFE_CFG.hooks.reincarnation==='function')CULT_LIFE_CFG.hooks.reincarnation({id:id,why:'oldAge'});}catch(e6){}
  return {ok:true,id:id};
}

function maybeWarn(u){
  ensure(u);
  if(u.lifeMax==null||!isFinite(+u.lifeMax))return false;
  const rem=remaining(u);
  const thr=(+u.lifeMax)*CULT_LIFE_CFG.warnFrac;
  if(rem>thr){u.lifeWarn=0;return false;}
  if(u.lifeWarn)return false;
  u.lifeWarn=1;
  const msg=isPlayerChar(u)?('你壽元將盡（'+lifeLabel(u)+'）'):((u.name||'弟子')+'壽元將盡（'+lifeLabel(u)+'）');
  logMsg(msg);
  if(typeof toast==='function')toast('⚠ '+msg);
  emit('cult:lifeWarn',{id:u.id,age:ageOf(u),lifeMax:u.lifeMax,rem:rem});
  return true;
}

function heroRebirth(u){
  // 主角壽盡：坐化後把年齡收回起始歲，呼叫既有輪迴鉤子。不刪資產、不改境界、不走戰死介面。
  if(!u||u.kind!=='player'||u.np)return {ok:false,reason:'not-hero'};
  if(u.dead||(u.respawn||0)>1e8)return {ok:false,reason:'combat-death'};
  const s=getS();
  const stamp=Math.floor(((s&&s.time)||0)*10);
  if(u.lifeSatStamp===stamp)return {ok:false,dup:true};
  u.lifeSatStamp=stamp;
  const age=ageOf(u),lifeMax=u.lifeMax;
  fireHook('onLifeEnd',[u]); // 坐化輪迴前（年齡尚未重置）
  if(typeof floater==='function')floater(u.x,u.y,'坐化','#d8c8ff');
  if(typeof toast==='function')toast('你壽元已盡，坐化輪迴');
  logMsg('你坐化輪迴（壽元已盡）');
  emit('cult:lifeEnd',{id:u.id,why:'oldAge',name:u.name,realm:u.realm|0,age:age,lifeMax:lifeMax,zuohua:true,hero:true});
  emit('cult:zuohua',{id:u.id,why:'oldAge',name:u.name,realm:u.realm|0,age:age,hero:true});
  try{if(typeof CULT_LIFE_CFG.hooks.reincarnation==='function')CULT_LIFE_CFG.hooks.reincarnation({id:u.id,why:'oldAge',hero:true});}catch(e){}
  u.lifeStartAge=CULT_LIFE_CFG.heroStartAge|0;
  u.lifeAgedSec=0;
  u.lifeWarn=0;
  if(ageOf(u)>=(+u.lifeMax||0)-1e-9){
    const start=Math.max(1,(+u.lifeMax||2)-1);
    u.lifeStartAge=start;u.lifeAgedSec=0;
  }
  u.hp=Math.max(1,u.maxhp||u.hp||1);
  u.task=null;u.path=[];u.dvx=u.dvy=0;u.vx=u.vy=0;u.medit=false;
  if(!(s&&s.dg)){
    try{
      const c=typeof sectCenter==='function'?sectCenter():null;
      if(c){
        const f=typeof nearestFree==='function'?nearestFree(c.x,c.y,typeof unitComp==='function'?unitComp(u):-1):null;
        u.x=f?f.i+0.5:c.x;u.y=f?f.j+0.5:c.y;
        if(u.inside){u.inside=false;u.inB=null;}
      }
    }catch(e2){}
  }
  return {ok:true,kind:'zuohua',age:ageOf(u)};
}

function resolveLife(u){
  ensure(u);
  maybeWarn(u);
  try{checkLow(u);}catch(e){}
  if(u.lifeMax==null||!isFinite(+u.lifeMax))return;
  if(ageOf(u)>=(+u.lifeMax)-1e-9){
    if(u.kind==='player'&&!u.np)heroRebirth(u);
    else if(isPlayerChar(u)||u.np)applyHeroExpire(u);
    else if(isDisciple(u))zuohua(u);
  }
}

function onBreak(u){
  if(!on()||!u)return;
  ensure(u);syncMax(u);
  emit('cult:lifeMax',{id:u.id,realm:u.realm|0,lifeMax:u.lifeMax,age:ageOf(u)});
}

function tickWeak(u,s){
  if(u.cultLifeWeak&&s&&s.time>=(u.cultLifeWeak.until||0))revertWeak(u);
  if(u.cultLifeSeclude&&s&&s.time>=(u.cultLifeSeclude.until||0))u.cultLifeSeclude=null;
}

// 房主／單機：推進世界年；玩家角色僅在連線時累加 lifeAgedSec
function lifeTick(dt){
  if(!on()||!dt||dt<=0)return;
  if(worldPaused())return;
  if(!hostAuth())return; // 客機永不推進
  const s=getS();if(!s||!s.units)return;
  const t0=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();

  for(const u of s.units){
    if(!u||u.dead||!relevant(u))continue;
    ensure(u);tickWeak(u,s);
    if(u.cultLifeSeclude){u.dvx=u.dvy=0;u.path=[];u.medit=true;}
  }

  ST._acc=(ST._acc||0)+dt;
  if(ST._acc<CULT_LIFE_CFG.tickInterval){
    ST._lastCost=((typeof performance!=='undefined'&&performance.now)?performance.now():Date.now())-t0;
    return;
  }
  const step=ST._acc;ST._acc=0;
  const years=step/Math.max(1e-6,CULT_LIFE_CFG.YEAR_SEC);

  // 世界年：弟子共用時鐘
  s.worldYear=ensureWorld()+years;
  emit('cult:worldYear',{worldYear:s.worldYear,dt:step,years:years});

  // 玩家角色：僅連線者累計 aged 秒
  for(const u of s.units){
    if(!u||u.dead)continue;
    if(isPlayerChar(u)||u.np||u.kind==='player'){
      ensure(u);
      if(isConnected(u))u.lifeAgedSec=(+u.lifeAgedSec||0)+step;
      resolveLife(u);
    }else if(isDisciple(u)){
      ensure(u);
      resolveLife(u);
    }
  }
  try{if(typeof CULT_LIFE_CFG.hooks.worldLingqi==='function')CULT_LIFE_CFG.hooks.worldLingqi(step,{years:years,worldYear:s.worldYear});}catch(e){}
  ST._lastCost=((typeof performance!=='undefined'&&performance.now)?performance.now():Date.now())-t0;
}

function onDisconnect(u){
  if(!u)return {ok:false};
  u.lifeConnected=false;
  emit('cult:lifeDisconnect',{id:u.id});
  return {ok:true};
}
function onRejoin(u){
  if(!u)return {ok:false};
  u.lifeConnected=true;
  ensure(u);
  // 離線期間玩家未累計；重連後由後續 tick 恢復。此處刷新警告／若已逾壽則套用主角規則
  resolveLife(u);
  emit('cult:lifeRejoin',{id:u.id,age:ageOf(u),lifeMax:u.lifeMax,worldYear:worldYear()});
  return {ok:true,age:ageOf(u),lifeMax:u.lifeMax};
}

function migrateUnit(u){
  if(!u||!relevant(u))return u;
  ensureWorld();
  if(isPlayerChar(u)||(u&&(u.kind==='player'||u.np))){
    if(u.np&&u.birthWorldYear!=null&&isFinite(+u.birthWorldYear)&&u.lifeStartAge==null){
      u.lifeStartAge=ensureWorld()-(+u.birthWorldYear);
      u.lifeAgedSec=0;
    }
    if(u.lifeStartAge==null){
      if(u.age!=null&&isFinite(+u.age)&&u.lifeAgedSec==null){
        u.lifeStartAge=+u.age;u.lifeAgedSec=0;
      }else u.lifeStartAge=CULT_LIFE_CFG.heroStartAge|0;
    }
    if(u.lifeAgedSec==null||!isFinite(+u.lifeAgedSec)){
      if(u.age!=null&&isFinite(+u.age)){
        const start=+u.lifeStartAge;
        u.lifeAgedSec=Math.max(0,(+u.age-start)*CULT_LIFE_CFG.YEAR_SEC);
      }else u.lifeAgedSec=0;
    }
  }else{
    if(u.birthWorldYear==null||!isFinite(+u.birthWorldYear)){
      const a=(u.age!=null&&isFinite(+u.age))?+u.age:randAge();
      u.birthWorldYear=ensureWorld()-a;
    }
  }
  syncMax(u);
  if(u.lifeWarn==null)u.lifeWarn=0;
  return u;
}
function migrate(d){
  if(!d)return d;
  d.flags=d.flags||{};
  // saveVer<3：舊檔玩家／np 的 lifeAgedSec 是以 60 秒＝1 年累計；折算成年數加進 lifeStartAge 後歸 0，年齡不跳。只跑一次（之後 v＝3）。
  // 弟子用 worldYear（年數），不需遷移。
  const v0=(d.flags.life&&+d.flags.life.v)||0;
  if(v0<3&&Array.isArray(d.units)){
    const oy=Math.max(1e-6,+CULT_LIFE_CFG.OLD_YEAR_SEC||60);
    for(const u of d.units){
      if(!u||!(u.kind==='player'||u.np))continue;
      if(u.lifeAgedSec==null||!isFinite(+u.lifeAgedSec))continue;
      const st=(u.lifeStartAge!=null&&isFinite(+u.lifeStartAge))?+u.lifeStartAge:CULT_LIFE_CFG.heroStartAge;
      u.lifeStartAge=st+(+u.lifeAgedSec)/oy;u.lifeAgedSec=0;
    }
  }
  d.flags.life=d.flags.life||{v:CULT_LIFE_CFG.saveVer};
  d.flags.life.v=CULT_LIFE_CFG.saveVer;
  if(d.worldYear==null||!isFinite(+d.worldYear))d.worldYear=0;
  if(d.units)for(const u of d.units)migrateUnit(u);
  return d;
}

function panelHtml(u){
  ensure(u);
  let h='<div class="sec" id="life_sec" data-life="1">';
  h+='<div class="mini" id="life_line" style="color:#ffe27a"><b>'+lifeLabel(u)+'</b>';
  if(u.lifeWarn)h+=' <span style="color:#ffb070">壽元將盡</span>';
  if(u.cultLifeSeclude)h+=' <span class="dim">閉關養息中</span>';
  if(u.cultLifeWeak)h+=' <span class="dim">暫時虛弱</span>';
  if(u.lifeMax==null||!isFinite(+u.lifeMax))h+=' <span class="dim">（飛升無限）</span>';
  h+='</div></div>';
  return h;
}
function selUnit(){
  try{
    const ids=(typeof selUnits!=='undefined')?selUnits:((window.XW&&XW.sel)||window.selUnits);
    if(!ids||!ids.length)return null;
    const s=getS();if(!s||!s.units)return null;
    return s.units.find(x=>x.id===ids[0])||null;
  }catch(e){return null;}
}
function paintPanel(){
  if(!on()){const old=document.getElementById('life_sec');if(old)old.remove();return;}
  const el=document.getElementById('panel');if(!el||el.style.display==='none')return;
  const u=selUnit();
  const prev=document.getElementById('life_sec');
  if(!u||!relevant(u)){if(prev)prev.remove();return;}
  const html=panelHtml(u);
  if(prev){const wrap=document.createElement('div');wrap.innerHTML=html;const nxt=wrap.firstChild;if(nxt)prev.replaceWith(nxt);}
  else{
    const gf=document.getElementById('gf_sec');
    if(gf&&gf.parentNode)gf.insertAdjacentHTML('beforebegin',html);
    else el.insertAdjacentHTML('beforeend',html);
  }
}

function hookCheat(){
  try{
    if(typeof XMOD_SPEC!=='undefined'&&Array.isArray(XMOD_SPEC)&&!XMOD_SPEC.some(x=>x&&x.k==='life')){
      const i=XMOD_SPEC.findIndex(x=>x&&(x.k==='xtl'||x.k==='gongfa'));
      const row={g:'cult',set:'cult',k:'life',n:'壽元／坐化'};
      if(i>=0)XMOD_SPEC.splice(i+1,0,row);else XMOD_SPEC.push(row);
    }
  }catch(e){}
}

function wrapCultMul(_cm){
  return function(u){
    let m=_cm(u);
    if(on()&&u&&u.cultLifeWeak){
      const s=getS();
      if(s&&s.time>=(u.cultLifeWeak.until||0))revertWeak(u);
      else m*=Math.max(0,1-(u.cultLifeWeak.cultMul!=null?u.cultLifeWeak.cultMul:CULT_LIFE_CFG.heroWeakCult));
    }
    return m;
  };
}
function wrapSnapshot(_sn){
  return function(){
    const d=_sn.apply(this,arguments);
    try{
      const s=getS();
      if(d&&s){
        d.worldYear=s.worldYear||0;
        d.flags=d.flags||{};
        d.flags.life=(s.flags&&s.flags.life)||{v:CULT_LIFE_CFG.saveVer};
        if(d.units&&s.units){
          for(let i=0;i<d.units.length&&i<s.units.length;i++){
            const u=s.units[i];if(!u)continue;
            if(u.birthWorldYear!=null)d.units[i].birthWorldYear=u.birthWorldYear;
            if(u.lifeAgedSec!=null)d.units[i].lifeAgedSec=u.lifeAgedSec;
            if(u.lifeStartAge!=null)d.units[i].lifeStartAge=u.lifeStartAge;
            if(u.lifeMax!=null)d.units[i].lifeMax=u.lifeMax;
            else if(u.lifeMax===null)d.units[i].lifeMax=null;
            if(u.lifeWarn!=null)d.units[i].lifeWarn=u.lifeWarn;
            if(u.lifeConnected!=null)d.units[i].lifeConnected=u.lifeConnected;
            if(u.cultLifeWeak)d.units[i].cultLifeWeak=JSON.parse(JSON.stringify(u.cultLifeWeak));
            if(u.cultLifeSeclude)d.units[i].cultLifeSeclude=JSON.parse(JSON.stringify(u.cultLifeSeclude));
            // 相容：寫入推算 age 供舊讀取
            try{d.units[i].age=ageOf(u);}catch(e0){}
            if(u.ascended)d.units[i].ascended=true;
          }
        }
      }
    }catch(e){}
    return d;
  };
}
function wrapApply(_as){
  return function(d){
    try{if(d)migrate(d);}catch(e){}
    const r=_as.apply(this,arguments);
    try{
      const s=getS();
      if(r&&s){
        if(d&&d.worldYear!=null)s.worldYear=+d.worldYear;
        else if(s.worldYear==null)s.worldYear=0;
        s.flags=s.flags||{};
        s.flags.life=(d&&d.flags&&d.flags.life)||s.flags.life||{v:CULT_LIFE_CFG.saveVer};
        if(s.units)for(const u of s.units){
          migrateUnit(u);
          if(u&&u.cultLifeWeak)revertWeak(u);
        }
        if(s.ascended){
          const heroU=(s.units||[]).find(x=>x&&x.kind==='player');
          if(heroU&&!heroU.ascended)heroU.ascended=true;
        }
      }
    }catch(e2){}
    return r;
  };
}
function wrapMakeDisciple(_md){
  return function(){
    const d=_md.apply(this,arguments);
    try{
      if(on()&&d){
        if(isPlayerChar(d))ensure(d);
        else{
          const a=randAge();
          d.birthWorldYear=ensureWorld()-a;
          syncMax(d);
          emit('cult:lifeBorn',{id:d.id,age:a,birthWorldYear:d.birthWorldYear,lifeMax:d.lifeMax});
        }
      }
    }catch(e){}
    return d;
  };
}
function wrapSpawnDisciple(_sd){
  return function(){
    const d=_sd.apply(this,arguments);
    try{if(on()&&d){ensure(d);syncMax(d);}}catch(e){}
    return d;
  };
}
function wrapDoBreak(_db){
  return function(u){
    const r=_db.apply(this,arguments);
    try{if(on()&&u)onBreak(u);}catch(e){}
    return r;
  };
}
function wrapUpdateUnit(_uu){
  return function(u,dt){
    if(on()&&u&&u.cultLifeSeclude){
      const s=getS();
      if(s&&s.time<(u.cultLifeSeclude.until||0)){u.dvx=u.dvy=0;u.path=[];}
      else u.cultLifeSeclude=null;
    }
    return _uu.apply(this,arguments);
  };
}

function install(){
  if(_lifeReentry||window._XW_LIFE_WRAP){
    window._XW_LIFE_WRAP=1;
    try{
      const s=getS();
      if(s){ensureWorld();s.flags=s.flags||{};s.flags.life=s.flags.life||{v:CULT_LIFE_CFG.saveVer};if(s.units)for(const u of s.units)migrateUnit(u);}
    }catch(e){}
    return;
  }
  window._XW_LIFE_WRAP=1;
  ST._in=1;
  hookCheat();
  const fields=['birthWorldYear','lifeAgedSec','lifeStartAge','lifeMax','lifeWarn','lifeConnected','cultLifeWeak','cultLifeSeclude','age','ascended','lifeSatStamp','_cultLowFired'];
  try{if(typeof UNIT_KEEP!=='undefined'){for(const f of fields)if(UNIT_KEEP.indexOf(f)<0)UNIT_KEEP.push(f);}}catch(e){}
  try{if(window.XW&&Array.isArray(XW.UNIT_KEEP)){for(const f of fields)if(XW.UNIT_KEEP.indexOf(f)<0)XW.UNIT_KEEP.push(f);}}catch(e2){}

  if(window.Cult&&typeof Cult.tick==='function'){
    const _tk=Cult.tick.bind(Cult);
    Cult.tick=function(dt){let r;try{r=_tk(dt);}catch(e){}try{lifeTick(dt);}catch(e2){}return r;};
  }else if(typeof tickV045==='function'){
    const _t=tickV045;tickV045=function(dt){const r=_t.apply(this,arguments);try{lifeTick(dt);}catch(e){}return r;};
  }
  function patchFn(name,factory){
    function apply(obj,key){
      if(!obj||typeof obj[key]!=='function'||obj[key]._lifeW)return;
      const w=factory(obj[key]);w._lifeW=1;obj[key]=w;
    }
    try{if(typeof window!=='undefined')apply(window,name);}catch(e){}
    try{if(window.XW)apply(XW,name);}catch(e2){}
  }
  if(typeof cultMul==='function'){cultMul=wrapCultMul(cultMul);try{cultMul._lifeW=1;}catch(e){}}
  patchFn('cultMul',wrapCultMul);
  if(typeof snapshot==='function'){snapshot=wrapSnapshot(snapshot);try{snapshot._lifeW=1;}catch(e){}}
  patchFn('snapshot',wrapSnapshot);
  if(typeof applySave==='function'){applySave=wrapApply(applySave);try{applySave._lifeW=1;}catch(e){}}
  patchFn('applySave',wrapApply);
  if(typeof makeDisciple==='function'){makeDisciple=wrapMakeDisciple(makeDisciple);try{makeDisciple._lifeW=1;}catch(e){}}
  patchFn('makeDisciple',wrapMakeDisciple);
  if(typeof spawnDisciple==='function'){spawnDisciple=wrapSpawnDisciple(spawnDisciple);try{spawnDisciple._lifeW=1;}catch(e){}}
  patchFn('spawnDisciple',wrapSpawnDisciple);
  if(typeof doBreak==='function'){doBreak=wrapDoBreak(doBreak);try{doBreak._lifeW=1;}catch(e){}}
  patchFn('doBreak',wrapDoBreak);
  if(typeof updateUnit==='function'){updateUnit=wrapUpdateUnit(updateUnit);try{updateUnit._lifeW=1;}catch(e){}}
  patchFn('updateUnit',wrapUpdateUnit);
  if(typeof renderPanel==='function'){
    const _rp=renderPanel;
    renderPanel=function(){const r=_rp.apply(this,arguments);try{paintPanel();}catch(e){}return r;};
  }
  try{
    if(window.Cult&&typeof Cult.on==='function'){
      Cult.on(function(ev){
        if(!ev||!on())return;
        if(ev.type==='cult:breakDone'){
          const s=getS();const u=s&&s.units&&s.units.find(x=>x.id===ev.id);
          if(u)onBreak(u);
        }
        if(ev.type==='cult:xtlEnd'&&ev.ok){
          const s=getS();
          const uid=ev.unitId!=null?ev.unitId:ev.id;
          const u=s&&s.units&&s.units.find(x=>x&&x.id===uid);
          if(u&&isPlayerChar(u)){u.lifeMax=null;u.lifeWarn=0;if(ev.ascended)u.ascended=true;emit('cult:lifeMax',{id:u.id,lifeMax:null,unlimited:true});}
        }
      });
    }
  }catch(e3){}
  try{
    const s=getS();
    if(s){ensureWorld();s.flags=s.flags||{};s.flags.life=s.flags.life||{v:CULT_LIFE_CFG.saveVer};if(s.units)for(const u of s.units)migrateUnit(u);}
  }catch(e4){}
}

const CultLife={
  CFG:CULT_LIFE_CFG,
  on:on,ensure:ensure,syncMax:syncMax,lifeMaxOf:lifeMaxOf,ageOf:ageOf,remaining:remaining,
  label:lifeLabel,wan:wan,tick:lifeTick,zuohua:zuohua,warn:maybeWarn,
  heroExpire:applyHeroExpire,migrate:migrate,migrateUnit:migrateUnit,fireHook:fireHook,checkLow:checkLow,
  paint:paintPanel,panelHtml:panelHtml,resolve:resolveLife,
  lastCost:function(){return ST._lastCost;},
  isHeroBody:isHeroBody,isPlayerChar:isPlayerChar,appliesHeroMul:appliesHeroMul,
  worldYear:worldYear,
  isConnected:defaultConnected,
  setConnectedPredicate:function(fn){CultLife._isConnected=typeof fn==='function'?fn:defaultConnected;CultLife.isConnected=CultLife._isConnected;},
  _isConnected:defaultConnected,
  onDisconnect:onDisconnect,
  onRejoin:onRejoin,
  // 測試
  devAdvanceWorld:function(years){
    if(!hostAuth())return {ok:false,reason:'client'};
    const s=getS();if(!s)return {ok:false};
    s.worldYear=ensureWorld()+(+years||0);
    for(const u of (s.units||[]))if(u&&isDisciple(u)){ensure(u);resolveLife(u);}
    return {ok:true,worldYear:s.worldYear};
  },
  devAgePlayer:function(u,years){
    if(!hostAuth())return {ok:false,reason:'client'};
    ensure(u);u.lifeAgedSec=(+u.lifeAgedSec||0)+(+years||0)*CULT_LIFE_CFG.YEAR_SEC;resolveLife(u);return u;
  }
};
// 允許覆寫 isConnected
Object.defineProperty(CultLife,'isConnected',{
  get:function(){return CultLife._isConnected||defaultConnected;},
  set:function(fn){CultLife._isConnected=typeof fn==='function'?fn:defaultConnected;},
  configurable:true
});

window.CultLife=CultLife;
window.XW_LIFE=CultLife;
try{if(window.Cult){Cult.life=CultLife;Cult.lifeMaxOf=lifeMaxOf;Cult.lifeLabel=lifeLabel;Cult.worldYear=worldYear;Cult.isPlayerChar=isPlayerChar;}}catch(e){}
try{install();}catch(e){console.warn('CultLife.install',e);}
})();
