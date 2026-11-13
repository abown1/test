// cult_trib2.js — 雷劫 v2（突破天雷）。開關：window.CULT_TRIB2.on（預設 true，?trib2=0 關；不放進 CULT_FLAGS，避免 xmod 全開）。
(globalThis.__cultQS)||(globalThis.__cultQS=(function(){/* P0 2026-11-13：網址參數只在第一次用到時解析一次並快取（遊戲執行中只有 g23 改 big/classic，不動 cult 參數）；?caiqs=0 回到每次重新解析 */let p=null,off=false;const rd=function(){try{return (typeof location!=='undefined'&&location.search)||'';}catch(e){return '';}};off=/(?:^|[?&])caiqs=(0|off|false)(?:&|$)/.test(rd());const g=function(){if(off)return new URLSearchParams(rd());if(p===null)p=new URLSearchParams(rd());return p;};g.off=off;g.gen=0;g.reset=function(){p=null;g.gen++;};/* 測試或換網址後呼叫 reset() */return g;})());
// 一行開啟：CULT_TRIB2.on=true;（或 Cult.trib2(true)）
// 掛勾：包住 doBreak（含載入後再包一層到最外）、cultBeginTrib（開啟時取代舊雷劫）、tryBreak（開啟時略過 Y47 渡劫等待）、
//       tickV045／dgUpdate（自己的計時，不經 Cult.tick）、updateUnit（鎖定）、drawHuman（上浮）、snapshot／applySave（存讀續劫）。
(function(){
'use strict';
const T2=window.CULT_TRIB2=window.CULT_TRIB2||{};
// 2026-11-11 使用者定：預設開啟。關閉：網址 ?trib2=0（或 off／false）或 CULT_FLAGS.trib2=false，這兩者優先於任何 on=true（含 g25 強開）
function t2ForcedOff(){
  try{if(window.CULT_FLAGS&&CULT_FLAGS.trib2===false)return true;}catch(e){}
  try{const q=globalThis.__cultQS().get('trib2');if(q==='0'||q==='off'||q==='false')return true;}catch(e){}
  return false;
}
{let _on=('on' in T2)?!!T2.on:true;try{delete T2.on;}catch(e){}
 Object.defineProperty(T2,'on',{configurable:true,enumerable:true,get:function(){return _on&&!t2ForcedOff();},set:function(v){_on=!!v;}});}
const CFG=T2.cfg={gap:5,first:1,lift:56,liftSpd:56,post:1.2,failFxMs:1100,camK:6};
// first:1＝引劫後先升空 1 秒（lift 56 世界像素、每秒升 56）才劈第 1 道，之後每 5 秒一道；
// post＝最後一道雷劈下、傷害結算完後，雷光留在畫面 1.2 秒才進入「存活掛點」→落地→判定突破；failFxMs＝死於天雷時雷光保留毫秒數。
T2._pass=0;T2._key=null;T2.log=[];
function on(){return !!T2.on;}
function gS(){try{return (typeof S!=='undefined'&&S)?S:null;}catch(e){return null;}}
function name(u){try{return typeof nm==='function'?nm(u):(u&&u.name)||'';}catch(e){return '';}}
function isClient(){
  try{if(typeof netAuthSilentNoop==='function'&&netAuthSilentNoop())return true;}catch(e){}
  try{const n=window.XW&&XW.net;if(n&&n.role==='client')return true;}catch(e){}
  return false;
}
function isPC(u){try{if(window.Cult&&typeof Cult.isPlayerChar==='function')return !!Cult.isPlayerChar(u);}catch(e){}return !!(u&&(u.kind==='player'||u.np));}
// 渡劫打坐回血（主角與弟子同一個數）：CULT_TRIB2.medHpPerSec＝每秒回最大氣血的比例（定案 0.02＝每秒 2%）；
// CULT_TRIB2.medNatural＝打坐時是否再加原本的自然回血。只在 u.trib2 期間生效，踏仙梯不建 u.trib2，故不受影響。
if(!('medHpPerSec' in T2))T2.medHpPerSec=0.02;   // 每秒回最大氣血 2%（創意家暫定；可外部一行改）
if(!('discMinHp' in T2))T2.discMinHp=0.9;        // 弟子：血量低於此比例先打坐回到此比例才開劈（主角不受此限）
if(!('redCap' in T2))T2.redCap=0.25;             // 所有減傷合計上限 25%（每道至少吃 75%）
// minDmgMul＝每道至少吃的倍率＝1−redCap（0.75）；兩者互為別名，改一個另一個跟著變
try{if(!Object.getOwnPropertyDescriptor(T2,'minDmgMul'))Object.defineProperty(T2,'minDmgMul',{configurable:true,enumerable:true,get(){return 1-(+T2.redCap||0);},set(v){T2.redCap=Math.max(0,Math.min(1,1-(+v)));}});}catch(e){}
if(!('redNeedMed' in T2))T2.redNeedMed=true;    // 主角：所有雷劫減傷（天劫台、法寶、渡劫丹、底蘊、tribDmgHook…）只在「這一道劈下的當下正在渡劫打坐」才生效；不打坐 mul=1。false＝舊行為。弟子不受影響
if(!('medNatural' in T2))T2.medNatural=false;   // 打坐時是否再加原本的自然回血（預設不加；不打坐時渡劫中一律不回血）
if(!('diyunRedPer' in T2))T2.diyunRedPer=0.001; // 底蘊減傷：只算超過天生值的部分，每點 0.1%
if(!('diyunRedCap' in T2))T2.diyunRedCap=0.10;  // 底蘊自己這項最多 10%
if(!('lethalFrom' in T2))T2.lethalFrom=4;       // 煉氣→築基起（from>=4）雷劫掉到 0 為真死
function medRate(){const r=+T2.medHpPerSec;return r>0?r:0;}
function strikesFor(r){return r<=4?3:r===5?5:r===6?6:7;}
// F-113 雷劫絕對傷害表（目標境界 → 每道傷害）。旗標預設開：CULT_TRIB2.abs=true（2026-11-11 正式版）；?caitrib2abs=0 或 CULT_FLAGS.caitrib2abs===false 或 CULT_TRIB2.abs=false 關。
// 開啟時：道數＝表長，每道＝表值×(1±absJit)，再照原本 reduce() 減傷與封頂；表外境界（含踏仙梯）照舊比例式。
if(!('abs' in T2))T2.abs=true;
if(!('absJit' in T2))T2.absJit=0.1;
if(!T2.absTable)T2.absTable={5:[1500,3000,5000],6:[1200,2400,4000,6000],7:[1200,2400,3700,5400,7300],8:[1600,3100,5100,7100,9800,12300],9:[4100,6800,10300,13700,17100,20500,27400],10:[15100,22700,30300,37800,45400,53000,60500,68100]};
function absOn(){
  try{if(window.CULT_FLAGS&&CULT_FLAGS.caitrib2abs===false)return false;}catch(e){}
  try{const q=globalThis.__cultQS().get('caitrib2abs');if(q==='0'||q==='off'||q==='false')return false;if(q==='1'||q==='on'||q==='true')return true;}catch(e){}
  return T2.abs===true;
}
function absFor(r){if(!absOn())return null;const t=T2.absTable&&T2.absTable[(r|0)+1];return Array.isArray(t)&&t.length?t.slice():null;}
T2.absOn=absOn;T2.absFor=absFor;
// 總傷害（以突破前基礎氣血為準，平均分到每道）：主角＝playerBase＋playerPerGap×(道數−1)；弟子＝discipleTotal
if(!('playerBase' in T2))T2.playerBase=0.9;
if(!('playerPerGap' in T2))T2.playerPerGap=0.1;
if(!('discipleTotal' in T2))T2.discipleTotal=0.9;
function totalFrac(u,n){if(isPC(u)&&T2.dmgMode!=='even'){let t=0;for(let i=1;i<=n;i++)t+=boltFrac(u,i,n);return +t.toFixed(4);}return isPC(u)?(+T2.playerBase)+(+T2.playerPerGap)*(n-1):(+T2.discipleTotal);}
// 主角傷害曲線（dmgMode='ramp'，預設）：前 n−1 道是「引雷」，由 earlyLo 線性升到 earlyHi（都不超過打坐 5 秒回的 10%）；
// 第 n 道「劫雷」＝finalFrac。皆以突破前基礎氣血為準，再套減傷（封頂 25%）。
// 目標：不打坐必死；滿血全程打坐、無減傷剩約 10%（1−0.9）；滿血打坐、減傷 25% 剩約 32.5%（1−0.9×0.75）。
// 舊的平均分配（playerBase＋playerPerGap×(n−1)，再平分）設 CULT_TRIB2.dmgMode='even' 可回復。
if(!('dmgMode' in T2))T2.dmgMode='ramp';
if(!('earlyLo' in T2))T2.earlyLo=0.06;
if(!('earlyHi' in T2))T2.earlyHi=0.09;
if(!('finalFrac' in T2))T2.finalFrac=0.9;
function boltFrac(u,i,n){
  if(!isPC(u)||T2.dmgMode==='even')return totalFrac(u,n)/n;
  if(i>=n)return +T2.finalFrac;
  const lo=+T2.earlyLo,hi=+T2.earlyHi;
  return n<=2?lo:lo+(hi-lo)*(i-1)/(n-2);
}
T2.boltFrac=boltFrac;
// 基礎氣血：maxhp 扣掉裝備（gb.hp、econGb.hp）；丹毒（dandu）壓低的部分用 _cultDanduRef 還原；功法不改 maxhp。
function baseHp(u){
  let m=(u._cultDanduRef!=null&&(u.dandu|0)>0)?u._cultDanduRef:u.maxhp;
  m-=(u.gb&&+u.gb.hp)||0;m-=(u.econGb&&+u.econGb.hp)||0;
  return Math.max(1,Math.round(m||1));
}
// 天生底蘊：遊戲沒有另存起始值，用 cultDiyunBase(u)（(悟性×0.4＋氣運×1＋仙緣×0.15)×rbAXk(u)＋仙武之體+20，見 cult.js；g27 ax 開且已換算時 k＝0.1）。
// u.diyun 在 cultEnsure 時寫入該值，之後才被溢出修為／addDiyun 往上加。減傷只算 max(0, 當前−天生)，每點 0.1%，本項封頂 10%。
function innateDiyun(u){
  if(!u)return 0;
  try{if(typeof cultDiyunBase==='function')return Math.max(0,+cultDiyunBase(u)||0);}catch(e){}
  try{
    const C=typeof CULT_CFG!=='undefined'?CULT_CFG:{};
    let k=1;try{if(typeof rbAXk==='function'){const x=+rbAXk(u);if(x>0&&isFinite(x))k=x;}}catch(eK){}
    let v=((u.wu||0)*(C.diyunFromWu||0.4)+(u.luck||0)*(C.diyunFromLuck||1)+(u.xy||0)*(C.diyunFromXy||0.15))*k;
    try{if(typeof isXW==='function'&&u.body!=null&&isXW(u))v+=(C.diyunXw||20);}catch(e2){}
    return Math.max(0,v);
  }catch(e3){return 0;}
}
function earnedDiyun(u){
  let cur=0;
  try{cur=(typeof cultDiyunOf==='function'?cultDiyunOf(u):(u&&u.diyun))||0;}catch(e){cur=(u&&u.diyun)||0;}
  return Math.max(0,cur-innateDiyun(u));
}
function diyunPart(u){
  const per=T2.diyunRedPer!=null?+T2.diyunRedPer:0.001;
  const cap=T2.diyunRedCap!=null?+T2.diyunRedCap:0.10;
  const red=Math.min(Math.max(0,cap),earnedDiyun(u)*Math.max(0,per));
  return +red.toFixed(3);
}
// 減傷：沿用舊雷劫的 cultTribReduce（法寶、渡劫丹）；底蘊改用「只算超過天生」的新規則，呼叫時暫時把 u.diyun 設 0 以免舊公式把天生底蘊算進去。
// 固定 20% 的天劫台改由 econ 等級表（dmgMulNow）取代，不重複；再套 Cult.tribDmgHook；最後合計減傷封頂 redCap。
function reduce(u,raw,i){
  // 判定時點：strike() 扣血那一刻讀 u.trib2.med（每道各自判定）
  if(T2.redNeedMed&&isPC(u)&&!(u.trib2&&u.trib2.med))return {dmg:Math.max(1,Math.round(raw)),mul:1,parts:{noMed:1}};
  const parts={};let d=raw;
  try{
    if(typeof cultTribReduce==='function'){
      const C=window.Cult,h=C&&C.hasTianjieTai,hk=C&&C.tribDmgHook;
      const dyKeep=u&&('diyun' in u)?u.diyun:undefined;
      if(C){C.hasTianjieTai=function(){return false;};C.tribDmgHook=null;}
      if(u)u.diyun=0;
      try{d=cultTribReduce(u,raw);}finally{if(C){C.hasTianjieTai=h;C.tribDmgHook=hk;}if(u){if(dyKeep===undefined)delete u.diyun;else u.diyun=dyKeep;}}
      const dy=diyunPart(u);if(dy>0){d*=(1-dy);parts.diyun=dy;}
      try{if(C&&C.hasFabaoGuard(u))parts.fabao=CULT_CFG.fabaoReduce;}catch(e){}
      try{if(C&&C.hasTribPill(u))parts.pill=CULT_CFG.pillReduce;}catch(e){}
    }
  }catch(e){d=raw;}
  const tj=dmgMulNow();if(tj<1){d*=tj;parts.tianjietai=+(1-tj).toFixed(3);}
  try{if(window.Cult&&typeof Cult.tribDmgHook==='function'){const x=Cult.tribDmgHook(u,d,i);if(x>=0){if(x!==d)parts.hook=1;d=x;}}}catch(e){}
  // 套裝加成 tribRed：受 redNeedMed 約束（主角要打坐；弟子豁免），與其他來源一併封頂 redCap
  try{
    const s=typeof cultEconSetBonus==='function'?cultEconSetBonus(u):null;
    const v=s&&s.tribRed;
    if(typeof v==='number'&&isFinite(v)&&v){d*=(1-v);parts.setbonus=v;}
  }catch(e){}
  const floor=raw*(1-Math.max(0,Math.min(1,+T2.redCap||0)));
  if(d<floor){d=floor;parts.capped=1;}
  return {dmg:Math.max(1,Math.round(d)),mul:+(d/raw).toFixed(3),parts};
}
function dmgMulNow(){
  let e=null;
  try{if(typeof econTribulationBonus==='function')e=econTribulationBonus();}catch(x){}
  try{if(!e&&typeof econBuildingEffectNow==='function')e=econBuildingEffectNow('tianjietai');}catch(x){}
  const m=e&&+e.dmgMul;return (m>0&&m<=1)?m:1;
}
T2.strikesFor=strikesFor;T2.baseHp=baseHp;T2.dmgMulNow=dmgMulNow;T2.innateDiyun=innateDiyun;T2.earnedDiyun=earnedDiyun;T2.diyunPart=diyunPart;
function fxBolt(u,i){
  const F=window.CultXTLFx;if(!F)return;
  try{
    const noDark=!isPC(u);
    if(!F.state.on){F.begin({lite:true,seed:(u.id|0)+i,noDark:noDark,owner:u&&u.id});F.state.caption='';F.state.capT=0;T2._fxOwn=1;}
    if(!T2._fxOwn)return; // 真正的踏仙梯正在播，不搶
    // 雷落在「空中的人」身上：螢幕往上 h 像素＝等角座標 x、y 各減 h/(2×HH)（HH=16）；舊式 y−lift/40 會斜向偏右下。瞄準身體中段（+12）。
    const h=liftOf(u),d=h>0?(h+12)/32:0;
    const X=window.XW_XTL,a=X&&X.anchor,tgt={id:u.id,x:u.x-d,y:u.y-d,name:u.name};
    const nSc=F.state.scorch?F.state.scorch.length:0;
    if(X)X.anchor=function(){return tgt;};
    try{F.strike(null,{i:Math.min(9,i)});}finally{if(X)X.anchor=a;}
    try{const sc=F.state.scorch;if(sc&&sc.length>=nSc&&sc.length){const z=sc[sc.length-1];z.x=u.x;z.y=u.y;}}catch(e2){} // 焦痕留在地面，不浮在半空
    T2._lastBolt={id:u.id,i:i,tx:tgt.x,ty:tgt.y,lift:h,t:gS()&&gS().time};
    // 弟子 noDark：絕不可改壓暗狀態（單機時弟子雷會把主角渡劫壓暗清掉）
    if(!noDark){
      try{if(typeof F.holdDim==='function')F.holdDim(u.id);else{F.state.noDark=0;if(!(F.state.dark>0))F.state.dark=0.38;}}catch(e1){}
      F.state.flash=0.5;
    }
  }catch(e){}
}
function fxEnd(u){
  try{
    const F=window.CultXTLFx;
    if(u&&isPC(u)&&F&&typeof F.releaseDim==='function')F.releaseDim(u.id);
    if(T2._fxOwn&&F&&!anyActive())F.end();
  }catch(e){}
  if(!anyActive())T2._fxOwn=0;
}
function liftOf(u){const B=u&&u.trib2;return B?Math.max(0,+B.lift||0):0;}
T2.liftOf=liftOf;
function anyActive(){const s=gS();return !!(s&&s.units&&s.units.some(u=>u&&u.trib2));}
function begin(u){
  const r=u.realm|0,ab=absFor(r),n=ab?ab.length:strikesFor(r),b=baseHp(u);
  const auto=!isPC(u);
  const wait=auto&&u.hp<u.maxhp*(+T2.discMinHp||0);
  const fr=[];for(let i=1;i<=n;i++)fr.push(+boltFrac(u,i,n).toFixed(4));
  try{if(u.flyOn&&window.CultFly&&typeof CultFly.land==='function')CultFly.land(u,'trib2');}catch(e){} // 御空中引劫：先落地再由雷劫升空，避免兩層高度疊加
  // 室內引劫（主角）：天劫需在露天迎接 → 先走出建築（exitInterior(true)＝放在門口），鏡頭與雷才會對到大地圖上的人
  try{const s=gS();if(isPC(u)&&!auto&&s&&s.interior&&typeof player==='function'&&player()===u&&typeof exitInterior==='function'){exitInterior(true);T2.log.push({ev:'exitInterior',id:u.id});}}catch(e){}
  u.trib2={from:r,n:n,i:0,next:CFG.first,base:b,per:b*totalFrac(u,n)/n,fr:fr,total:totalFrac(u,n),lift:0,med:auto,wait:wait,w0:wait?(gS()&&gS().time):null};
  if(ab){u.trib2.abs=ab;u.trib2.fr=null;u.trib2.per=ab.reduce((x,y)=>x+y,0)/ab.length;u.trib2.total=null;}
  u.dvx=u.dvy=0;u.path=[];u.medit=auto;
  try{toast(wait?`⚡ ${name(u)}引動天劫，先盤膝調息，氣血回到 ${Math.round(T2.discMinHp*100)}％ 再迎 ${n} 道天雷`:`⚡ ${name(u)}引動天劫，${n} 道天雷將至！${(!auto&&T2.redNeedMed)?'按 Z 打坐：回血，雷劫減傷需打坐才生效':''}`);}catch(e){}
  try{if(typeof fx==='function')fx('ring',u.x,u.y,'#c8d8ff');}catch(e){}
  T2.log.push({ev:'start',id:u.id,from:r,n:n,base:b,t:gS()&&gS().time});
}
function finish(u){
  try{u.cultTribPill=0;}catch(e){}
  u.trib2=null;u.medit=false;
  T2._pass++;
  try{doBreak(u);}finally{T2._pass--;}
  try{toast(`⚡ ${name(u)}渡劫成功！`);floater(u.x,u.y,'渡劫成功','#ffe27a');}catch(e){}
  T2.log.push({ev:'ok',id:u.id,realm:u.realm,hp:u.hp,maxhp:u.maxhp,t:gS()&&gS().time});
  fxEnd(u);
}
function vanillaTribDeath(u,dmg){
  u.hp=0;u.y47dn=null;
  if(isPC(u)){
    try{
      if(typeof onPlayerDeath0==='function'){onPlayerDeath0(u);return;}
    }catch(e){}
    let had=false;
    try{if(typeof CULT_FLAGS!=='undefined'){had=!!CULT_FLAGS.death;CULT_FLAGS.death=false;}}catch(e){}
    try{if(typeof onPlayerDeath==='function')onPlayerDeath(u);}catch(e){console.warn('trib2 player death',e);}
    try{if(typeof CULT_FLAGS!=='undefined')CULT_FLAGS.death=had;}catch(e){}
    return;
  }
  try{
    const s=gS();
    if(s&&s.units)s.units=s.units.filter(x=>x!==u);
    try{if(typeof selUnits!=='undefined')selUnits=selUnits.filter(id=>id!==u.id);}catch(e0){}
    u.dead=true;u.hp=0;
    try{if(typeof corpse==='function')corpse(u);}catch(e1){}
    try{toast(`弟子${name(u)}不幸隕落……`);}catch(e2){}
  }catch(e){console.warn('trib2 disciple death',e);}
}
function fail(u,dmg){
  const from=(u.trib2&&u.trib2.from!=null)?(u.trib2.from|0):(u.realm|0);
  try{u.cultTribPill=0;}catch(e){}
  u.trib2=null;u.medit=false;
  T2.log.push({ev:'fail',id:u.id,realm:u.realm,from:from,t:gS()&&gS().time});
  try{toast(`⚡ ${name(u)}渡劫失敗，天雷貫體！`);floater(u.x,u.y,'渡劫失敗','#ff8080');}catch(e){}
  const lethal=from>=(+T2.lethalFrom||4);
  let done=false;
  if(lethal){
    // 煉氣→築基起：氣血歸 0 即真死。元嬰＋且 death 開：維持既有元神路徑，不另做脫體。
    if(from>=7){
      try{if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.death&&typeof cultOnLethal==='function'){u.hp=0;done=!!cultOnLethal(u,null,{why:'tribulation'});if(!done)u.hp=0;}}catch(e){}
    }
    if(!done)vanillaTribDeath(u,dmg);
  }else{
    // 僅在外部把 lethalFrom 調高時走舊鏈（death 開＝元嬰前重傷；關則 dmgUnit，弟子可能 y47dn）
    try{if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.death&&typeof cultOnLethal==='function'){const h0=u.hp;u.hp=0;done=!!cultOnLethal(u,null,{why:'tribulation'});if(!done)u.hp=h0;}}catch(e){}
    if(!done){try{dmgUnit(null,u,Math.max(dmg,u.hp+1));}catch(e){console.warn('trib2 death',e);}}
  }
  try{
    const last=T2.log[T2.log.length-1];
    if(last&&last.ev==='fail'){last.ys=!!(done&&u.cultYS)?1:0;if(u.cultYS)last.ysId=u.cultYS.id;}
  }catch(e){}
  // 死於天雷：讓這一道雷光先播完再收（真實時間，死亡畫面暫停遊戲時也會收）
  T2._fxLinger=(T2._fxLinger|0)+1;
  try{setTimeout(function(){T2._fxLinger=Math.max(0,(T2._fxLinger|0)-1);fxEnd(u);},CFG.failFxMs);}catch(e){T2._fxLinger=0;fxEnd(u);}
}
function strike(u){
  const B=u.trib2;B.i++;
  // 每道以「劈下當下」的基礎氣血計（不是引劫當時）：境界數值表更換／讀檔換算（g27 rbSweep）改了 maxhp，比例仍成立
  if(Array.isArray(B.fr)){const b=baseHp(u);if(b>0)B.base=b;}
  let raw=(Array.isArray(B.fr)&&B.fr[B.i-1]!=null)?B.base*B.fr[B.i-1]:B.per; // 舊存檔沒有 fr → 平均
  if(Array.isArray(B.abs)&&B.abs[B.i-1]!=null){const j=Math.max(0,+T2.absJit||0);raw=B.abs[B.i-1]*(1+j*(2*Math.random()-1));}
  const R=reduce(u,raw,B.i),dmg=R.dmg;
  try{floater(u.x,u.y,`天雷第 ${B.i}/${B.n} 道 -${dmg}${R.parts.noMed?'（未打坐，減傷無效）':''}`,'#c8d8ff');}catch(e){}
  fxBolt(u,B.i);
  T2.log.push({ev:'strike',id:u.id,i:B.i,n:B.n,dmg:dmg,raw:+raw.toFixed(1),mul:R.mul,parts:R.parts,hp0:u.hp,t:gS()&&gS().time,lift:+(B.lift||0).toFixed(1)});
  try{if(window.Cult&&Cult.emit)Cult.emit('cult:trib2Strike',{id:u.id,i:B.i,n:B.n,dmg:dmg});}catch(e){}
  if(u.hp-dmg<=0){fail(u,dmg);return;}
  u.hp-=dmg;B.lastHp=u.hp; // 不寫 lastHit：天雷不打斷打坐、不觸發被攻擊判定
  T2.log[T2.log.length-1].hp1=u.hp;
  // 最後一道：雷光已出、傷害已結算、人還活著 → 不立刻判定；先留在空中 post 秒讓雷光播完，再走存活掛點、落地、才判定突破
  if(B.i>=B.n){B.post={ph:'show',t:CFG.post};T2.log.push({ev:'survive',id:u.id,hp:u.hp,maxhp:u.maxhp,t:gS()&&gS().time});}
}
// ── 存活掛點（給之後的「品級晉升」用）：CULT_TRIB2.onSurvive=function(u,done,info){…; done();}
//    info={from,to,resumed}；不掛＝立刻 done。掛了就停在空中（不回血、不落地）直到 done()；
//    等待狀態記在 u.trib2.post.ph==='hook'，存讀後會用 info.resumed=true 再呼叫一次（hook 自己要可重入）。
//    也可用 CULT_TRIB2.surviveDone(unitId) 從外部結束等待。
function callSurvive(u){
  const B=u.trib2;if(!B||!B.post)return;
  B.post.ph='hook';const tok=B.post.tok=(B.post.tok|0)+1;const resumed=!!B.post.called;B.post.called=1;
  const h=T2.onSurvive;
  const done=function(){const b=u.trib2;if(!b||!b.post||b.post.ph!=='hook'||b.post.tok!==tok)return false;b.post.ph='land';T2.log.push({ev:'surviveDone',id:u.id,t:gS()&&gS().time});return true;};
  if(typeof h!=='function'){done();return;}
  try{h(u,done,{from:B.from,to:(B.from|0)+1,resumed:resumed});}catch(e){console.warn('trib2.onSurvive',e);done();}
}
T2.surviveDone=function(id){const s=gS();const u=s&&s.units&&s.units.find(x=>x&&x.id===id);const B=u&&u.trib2;if(!B||!B.post||B.post.ph!=='hook')return false;B.post.ph='land';T2.log.push({ev:'surviveDone',id:u.id,t:s.time,ext:1});return true;};
function postTick(u,B,dt){
  const P=B.post;
  if(P.ph==='show'){P.t-=dt;if(P.t<=0)callSurvive(u);return;}
  if(P.ph==='hook')return;
  if(P.ph==='land'){B.lift=Math.max(0,(B.lift||0)-CFG.liftSpd*1.5*dt);if(B.lift<=0){T2.log.push({ev:'landed',id:u.id,t:gS()&&gS().time});finish(u);}}
}
// integ_1113 保險：S.dg 進行中暫停天雷。旗標 CULT_TRIB2.dgHold（預設開；?caitrib2dg=0 關）
function dgHold(s){try{if(T2.dgHold===false)return false;const q=globalThis.__cultQS().get('caitrib2dg');if(q==='0'||q==='off'||q==='false')return false;return !!(s&&s.dg);}catch(e){return false;}}
function tick(dt){
  const s=gS();if(!s||!s.units||!(dt>0))return;
  if(T2._key===s.time)return;T2._key=s.time;
  if(isClient())return;
  let any=false;
  for(const u of s.units.slice()){
    const B=u&&u.trib2;if(!B)continue;any=true;
    if(u.dead){u.trib2=null;continue;}
    if(B.post){postTick(u,B,dt);continue;} // 最後一道已劈完：不再回血，等掛點、落地
    B.lift=Math.min(CFG.lift,(B.lift||0)+CFG.liftSpd*dt);
    if(B.med&&u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*medRate()*dt);
    if(B.wait){
      B.wt=(B.wt||0)+dt;
      if(u.hp>=u.maxhp*(+T2.discMinHp||0)){B.wait=false;B.next=CFG.first;const w=+(B.wt||0).toFixed(2);B.waited=w;T2.log.push({ev:'waitEnd',id:u.id,waited:w,hp:u.hp,maxhp:u.maxhp,t:s.time});try{floater(u.x,u.y,'調息完畢，天雷將至','#c8d8ff');}catch(e){}}
      continue;
    }
    if(dgHold(s)){if(!B.dgHold){B.dgHold=1;T2.log.push({ev:'dgHold',id:u.id,t:s.time});}continue;} // integ_1113：副本進行中天雷暫停（不倒數、不劈），出副本接著劈
    if(B.dgHold){B.dgHold=0;T2.log.push({ev:'dgResume',id:u.id,t:s.time});}
    B.next-=dt;
    if(B.next<=0){B.next+=CFG.gap;strike(u);}
  }
  if(!any&&T2._fxOwn&&!T2._fxLinger)fxEnd();
}
T2.tick=function(dt){T2._key=null;tick(dt);};
T2.active=anyActive;
function wrapDB(_db){
  const w=function(u){
    if(T2._pass>0||!on()||!u)return _db.apply(this,arguments);
    if(u.trib2)return; // 已在渡劫中，不重複突破
    if((u.realm|0)<4||(typeof MAX_REALM==='number'&&u.realm>=MAX_REALM)||isClient())return _db.apply(this,arguments);
    begin(u);
  };
  w._trib2=1;return w;
}
if(typeof doBreak==='function')doBreak=wrapDB(doBreak);
// 之後載入的檔案（功法、壽元、聯機權限）還會再包 doBreak；載入完後再包一層到最外，避免它們在延後時提早跑收尾
try{setTimeout(function(){try{if(typeof doBreak==='function'&&!doBreak._trib2)doBreak=wrapDB(doBreak);}catch(e){}try{installRate();}catch(e2){}},0);}catch(e){}
// 開啟時取代舊雷劫：閉關計時照走，到雷劫那步直接進 doBreak（由本檔劈雷）
if(typeof cultBeginTrib==='function'){const _bt=cultBeginTrib;cultBeginTrib=function(u){
  if(!on()||!u)return _bt.apply(this,arguments);
  T2.log.push({ev:'oldTribSkipped',id:u.id});
  u.cultBrk=null;return (typeof cultFinishBreak==='function')?cultFinishBreak(u):doBreak(u);
};}
function rateOf(u){
  try{if(typeof breakFail==='function')return Math.max(0,Math.min(0.9,+breakFail(u)||0));}catch(e){}
  try{if(typeof breakConds==='function'){const c=breakConds(u);if(c&&c.fail>0)return Math.max(0,Math.min(0.9,+c.fail));}}catch(e2){}
  return 0;
}
function applyRateFail(u,f){
  try{if(typeof cultPayBreak==='function')cultPayBreak(u);}catch(e){}
  const loss=(typeof TUNE!=='undefined'&&TUNE.breakFailLoss!=null)?+TUNE.breakFailLoss:0.30;
  const r=u.realm|0;
  u.xiu=Math.floor((u.xiu||0)*(1-loss));
  u.hp=Math.max(1,Math.floor((u.hp||1)/2));
  try{if(typeof fx==='function')fx('ring',u.x,u.y,'#ff6060');}catch(e){}
  try{if(typeof floater==='function')floater(u.x,u.y,'突破失敗','#ff8080');}catch(e){}
  let nxt='';try{nxt=(typeof REALMS!=='undefined'&&REALMS[r+1]&&REALMS[r+1].n)||'';}catch(e){}
  try{toast(`${name(u)}衝擊「${nxt}」失敗，氣血翻湧、修為倒退（失敗率 ${Math.round(f*100)}%）`);}catch(e){}
  T2.log.push({ev:'rateFail',id:u.id,from:r,fail:+f.toFixed(4),t:gS()&&gS().time});
}
// 開啟時：先擲面板上的成功率，失敗只套既有突破失敗懲罰（扣修為、氣血減半、耗材料），不進雷劫、不致死。成功才開始閉關／雷劫。
// 延後包到最外（g25 會再包 cultStartBreak 做靈石檢查），避免被蓋掉。
function wrapStart(_cs){
  const w=function(u,auto,_tb){
    if(!on()||!u||u.dead||u.cultBrk||u.trib2)return _cs.apply(this,arguments);
    if((u.realm|0)<4)return _cs.apply(this,arguments);
    let can=true;
    try{if(typeof cultCanBreak==='function')can=!!cultCanBreak(u);}catch(e){}
    if(!can)return _cs.apply(this,arguments);
    const f=rateOf(u);
    const roll=(T2._roll!=null)?+T2._roll:((typeof rnd==='function')?rnd():Math.random());
    if(f>0&&roll<f){applyRateFail(u,f);return false;}
    return _cs.apply(this,arguments);
  };
  w._trib2rate=1;return w;
}
function installRate(){try{if(typeof cultStartBreak==='function'&&!cultStartBreak._trib2rate)cultStartBreak=wrapStart(cultStartBreak);}catch(e){}}
// 只在載入結束後包一次（到 g25 外面），避免連擲兩次
try{setTimeout(installRate,0);}catch(e){}
if(typeof tryBreak==='function'){const _tb=tryBreak;tryBreak=function(u){
  if(!on()||typeof Y47==='undefined'||Y47.djSkip)return _tb.apply(this,arguments);
  if(u&&u.trib2)return false;
  Y47.djSkip=true;try{return _tb.apply(this,arguments);}finally{Y47.djSkip=false;}
};}
function installWoundSkip(){
  try{if(typeof cultApplyWound==='function'&&!cultApplyWound._trib2skip){
    const _w=cultApplyWound;
    cultApplyWound=function(u,why){if(u&&u.trib2)return 0;return _w.apply(this,arguments);};
    cultApplyWound._trib2skip=1;
  }}catch(e){}
  try{if(typeof cultResolveDefeat==='function'&&!cultResolveDefeat._trib2skip){
    const _d=cultResolveDefeat;
    cultResolveDefeat=function(winner,loser,ctx){
      if(loser&&loser.trib2)return {ok:true,outcome:'trib2',loot:[],wounded:false,cultLoss:0,skipped:1,via:'trib2'};
      return _d.apply(this,arguments);
    };
    cultResolveDefeat._trib2skip=1;
  }}catch(e){}
  try{if(typeof cultApplyDownPenalty==='function'&&!cultApplyDownPenalty._trib2skip){
    const _p=cultApplyDownPenalty;
    cultApplyDownPenalty=function(u,ctx){
      if(u&&u.trib2)return {ok:true,applied:false,reason:'trib2',downId:ctx&&ctx.downId};
      return _p.apply(this,arguments);
    };
    cultApplyDownPenalty._trib2skip=1;
  }}catch(e){}
  try{if(window.Cult&&typeof cultResolveDefeat==='function')Cult.resolveDefeat=cultResolveDefeat;}catch(e){}
  try{if(window.XW&&XW.death&&typeof cultResolveDefeat==='function')XW.death.resolve=cultResolveDefeat;}catch(e){}
  try{if(window.XW_CULT&&typeof cultResolveDefeat==='function')XW_CULT.resolveDefeat=cultResolveDefeat;}catch(e){}
}
installWoundSkip();
try{setTimeout(installWoundSkip,0);}catch(e){}
if(typeof tickV045==='function'){const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{tick(dt);}catch(e){console.warn('trib2.tick',e);}return r;};}
if(typeof dgUpdate==='function'){const _dg=dgUpdate;dgUpdate=function(dt){const r=_dg.apply(this,arguments);try{tick(dt);}catch(e){console.warn('trib2.tick',e);}return r;};}
if(typeof updateUnit==='function'){const _uu=updateUnit;updateUnit=function(u){
  if(!u||!u.trib2)return _uu.apply(this,arguments);
  const x=u.x,y=u.y,h=u.hp;u.dvx=u.dvy=0;u.path=[];
  const r=_uu.apply(this,arguments);
  if(u.trib2&&u.hp>h&&!(u.trib2.med&&T2.medNatural))u.hp=h; // 渡劫中：不打坐不回血；打坐只回 medHpPerSec（除非 medNatural）
  u.x=x;u.y=y;u.dvx=u.dvy=0;u.path=[];if(u.trib2&&u.trib2.med)u.medit=true;return r;
};}
// 打坐（Z）：渡劫中按下改成「渡劫打坐」，不設 meditate 任務（避免被雷／敵人打斷），劫終自動結束
if(typeof toggleMeditate==='function'){const _tm=toggleMeditate;toggleMeditate=function(){
  let p=null;try{p=player();}catch(e){}
  if(!p||!p.trib2)return _tm.apply(this,arguments);
  if(!p.trib2.med){p.trib2.med=true;p.medit=true;try{toast('渡劫中盤膝打坐，運功抵禦天雷（劫終才會收功）');}catch(e){}}
  else{try{toast('渡劫中無法收功，撐到天劫結束');}catch(e){}}
};}
// 升空繪製：地面留影子（越高越淡越小），人往上 h 像素並微微上下浮動；室內（u.inside）不畫在大地圖上就不處理
if(typeof drawHuman==='function'){const _dh=drawHuman;drawHuman=function(u){
  let h=liftOf(u);
  if(!h||typeof ctx==='undefined'||!ctx)return _dh.apply(this,arguments);
  if(h>=CFG.lift-0.5)h+=Math.sin((typeof performance!=='undefined'?performance.now():0)/380)*2.2;
  try{const b=P(u.x,u.y),k=Math.max(0.35,1-h/(CFG.lift*1.8));ctx.save();ctx.globalAlpha=0.42*k;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(b.x,b.y+3,17*k,7.5*k,0,0,Math.PI*2);ctx.fill();ctx.restore();}catch(e){}
  ctx.save();ctx.translate(0,-h);try{return _dh.apply(this,arguments);}finally{ctx.restore();}
};}
// 鏡頭：主角渡劫中鎖定在「空中的主角」（地面點往上 20＋h），可縮放；劫終（落地）恢復跟隨主角。弟子渡劫不動鏡頭。
if(typeof updateCamera==='function'){const _uc=updateCamera;updateCamera=function(dt){
  let p=null;try{p=player();}catch(e){}
  const B=p&&!p.dead&&p.trib2;
  if(!B||(typeof S!=='undefined'&&S&&S.interior)){
    const r=_uc.apply(this,arguments);
    if(T2._cam&&!(p&&p.trib2)){try{cam.follow=true;cam.pan=0;}catch(e){}T2._cam=null;}
    return r;
  }
  if(!T2._cam)T2._cam={follow:cam.follow,t:gS()&&gS().time};
  cam.follow=false;
  const r=_uc.apply(this,arguments);
  try{const q=iso(p.x,p.y),k=1-Math.exp(-CFG.camK*(dt>0?dt:0.016));cam.x+=(q.x-cam.x)*k;cam.y+=(q.y-20-liftOf(p)-cam.y)*k;cam.follow=false;cam.pan=0;}catch(e){}
  return r;
};}
// 存讀：u.trib2 不在 UNIT_KEEP，另存 d.cultTrib2；讀檔後續劫（已劈的道數、剩餘秒數保留）。關閉時讀到就取消（境界不變、修為不扣）。
if(typeof snapshot==='function'){const _sn=snapshot;snapshot=function(){
  const d=_sn.apply(this,arguments);
  try{const s=gS();if(d&&s&&s.units){const L=s.units.filter(u=>u&&u.trib2).map(u=>({id:u.id,b:Object.assign({},u.trib2)}));if(L.length)d.cultTrib2=L;}}catch(e){}
  return d;
};}
if(typeof applySave==='function'){const _as=applySave;applySave=function(d){
  const r=_as.apply(this,arguments);
  try{const s=gS();if(s&&s.units){for(const u of s.units)if(u&&u.trib2)u.trib2=null;
    if(on()&&d&&Array.isArray(d.cultTrib2))for(const e of d.cultTrib2){const u=s.units.find(x=>x&&x.id===e.id);if(u&&!u.dead&&e.b&&e.b.n>0){u.trib2=Object.assign({},e.b,{next:Math.max(1,Math.min(CFG.gap,+e.b.next||CFG.gap))});
      const P=u.trib2.post;if(P){u.trib2.post=Object.assign({},P);if(P.ph==='hook'){u.trib2.post.ph='show';u.trib2.post.t=0;}}}} // 掛點等待中存檔：讀檔後重新呼叫 onSurvive（resumed=true）
    T2._key=null;if(!anyActive())fxEnd();}}catch(e){}
  return r;
};}
// 測試用（不影響遊戲）：遊戲在閉包裡，外部拿不到 doBreak 等函式
T2.t={doBreak:u=>doBreak(u),cultFinishBreak:u=>cultFinishBreak(u),CultTickBreak:dt=>CultTickBreak(dt),gearApply:u=>gearApply(u),
  setOldStrike:f=>{const o=cultTribStrike;cultTribStrike=f;return o;},getOldStrike:()=>cultTribStrike,medRate:medRate,
  flags:()=>(typeof CULT_FLAGS!=='undefined'?CULT_FLAGS:null),isPC:isPC,
  cultStartBreak:(u,auto)=>cultStartBreak(u,!!auto),tryBreak:(u,auto)=>tryBreak(u,auto),
  breakFail:u=>rateOf(u),innateDiyun:innateDiyun,earnedDiyun:earnedDiyun,
  applyWound:(u,why)=>cultApplyWound(u,why),
  resolveDefeat:(w,l,c)=>cultResolveDefeat(w,l,c),
  applyDownPenalty:(u,c)=>cultApplyDownPenalty(u,c),
  cam:()=>({x:cam.x,y:cam.y,zoom:cam.zoom,follow:cam.follow,W:(typeof W==='number'?W:0),H:(typeof H==='number'?H:0)}),iso:(x,y)=>iso(x,y),
  enterInterior:b=>enterInterior(b),exitInterior:()=>exitInterior(true)};
try{if(window.Cult)Cult.trib2=function(v){if(v!==undefined)T2.on=!!v;return T2.on;};}catch(e){}
})();
