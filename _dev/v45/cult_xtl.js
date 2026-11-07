// ================== cult_xtl.js：踏仙梯（飛升動畫，旗標 xtl 預設開）==================
(function(){
if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.xtl==null)CULT_FLAGS.xtl=true;
const CFG={
  strikes:10,
  statKeys:['atk','def','wu','luck','xy'], // 飛升檢定：不含採集；仙緣門檻見 statNeed
  statCap:10000,            // 攻擊／防禦／悟性／氣運門檻（與 g23 硬上限對齊）
  statNeed:{xy:1000},       // 仙緣達 1000 即可（不必 10000）；採集不列入檢定
  statEps:0.5,              // 視為達標的容差
  reducePerfect:0.99,       // 完美情況的天雷減傷
  reduceCap:0.99,
  leftoverFrac:0.01,        // 完美通過後剩餘氣血＝maxhp×此值（「幾乎見底」）
  missAmp:2.4,              // 任一屬性未滿時的傷害倍率（必導致中途殞落）
  weights:[0.04,0.05,0.06,0.07,0.08,0.10,0.12,0.14,0.16,0.18],
  gatherSec:2.4,
  strikeSec:1.35,
  ascendSec:8.4,            // 末段（雲海→開門→走入）約為舊版 2 倍；總長仍合理
  fallSec:3.2,              // 失敗化灰演出時長

  cardAutoSec:2.8,          // 飛升成功卡自動「繼續遊玩」，無需 Esc
  weakDur:180,              // 失敗後暫時虛弱（秒）；到期與讀檔皆還原
  weakAtk:0.25,             // 暫時降低攻擊的比例（不永久改數值）
  weakCult:0.30,            // 暫時降低修煉倍率
  cooldown:60,              // 失敗後再次踏梯的冷卻（秒）
  timeScale:1,
  realmNeed:10,             // 地仙（須大圓滿／第十層）
  sceneArt:{
    src:'assets/xtl/final.jpg',
    start:0.52,
    trans:0.14,
    doorRect:{x:0.330,y:0.205,w:0.112,h:0.275},
    gateRect:{x:0.168,y:0.012,w:0.428,h:0.528},
    stairPath:[
      {x:0.78,y:0.90},{x:0.66,y:0.76},{x:0.52,y:0.58},{x:0.430,y:0.510},{x:0.386,y:0.478}
    ],
    focusPath:[
      {x:0.56,y:0.62},{x:0.48,y:0.52},{x:0.400,y:0.38},{x:0.386,y:0.30}
    ],
    sword:{x:0.602,y:0.655},
    zoom0:1.02,
    zoom1:1.82
  }
};
window.CULT_XTL_CFG=CFG;

const ST={
  on:false,phase:'idle',t:0,i:0,seed:1,plan:null,outcome:null,
  hp:0,hp0:0,unitId:null,locked:false,accel:1,blocked:0,
  cam0:null,hud:false,confirm:false
};

function on(){return typeof CULT_FLAGS!=='undefined'&&!!CULT_FLAGS.xtl;}
function tip(msg){
  msg=String(msg==null?'':msg);
  try{if(typeof toast==='function'){toast(msg);return;}}catch(e){}
  try{
    const el=document.getElementById('toasts');
    if(!el)return;
    const d=document.createElement('div');d.textContent=msg;el.appendChild(d);
    setTimeout(function(){try{d.remove();}catch(eR){}},6000);
    while(el.children.length>4)el.firstChild.remove();
  }catch(e2){}
}
function emit(t,d){try{if(window.Cult&&Cult.emit)return Cult.emit(t,d);}catch(e){}return d;}
function coop(){try{return !!(window.Cult&&Cult.coopActive&&Cult.coopActive());}catch(e){return false;}}
function netRole(){
  try{
    const n=(typeof XW!=='undefined'&&XW&&XW.net)||(window.XW&&XW.net)||null;
    return n&&n.role||'solo';
  }catch(e){return 'solo';}
}
function hero(){
  let a=null,b=null;
  try{if(typeof player==='function')a=player();}catch(e){}
  try{if(window.XW&&typeof XW.player==='function')b=XW.player();}catch(e2){}
  const s=getS();
  const live=s&&s.units&&s.units.find(x=>x&&x.kind==='player');
  if(live){
    if(b&&b.id===live.id)return b;
    if(a&&a.id===live.id)return a;
    return live;
  }
  return b||a||null;
}
function isPlayerChar(u){
  if(!u)return false;
  if(u.kind==='player'||u.np)return true;
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar!==isPlayerChar)return !!Cult.isPlayerChar(u);}catch(e){}
  return false;
}
function isHero(u){
  if(!u)return false;
  if(isPlayerChar(u)||u.np||u.kind==='player')return true;
  const p=hero();return !!(p&&p.id===u.id);
}
function isSoloProtagonist(u){return !!(u&&u.kind==='player');}
function isDiscipleUnit(u){return !!(u&&u.kind==='disciple'&&!u.np);}
function isXtlCand(u){return !!(u&&(isPlayerChar(u)||isDiscipleUnit(u)));}
function selectedXtlUnit(){
  try{
    if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length){
      const id=selUnits[0];
      let u=null;
      try{if(typeof unitById==='function')u=unitById(id);}catch(e){}
      if(!u){const s=getS();u=(s&&s.units||[]).find(x=>x&&x.id===id);}
      if(isXtlCand(u))return u;
    }
  }catch(e2){}
  return hero();
}
function unitAscended(u){
  if(!u)return false;
  if(u.ascended)return true;
  if(isSoloProtagonist(u)){const s=getS();return !!(s&&s.ascended);}
  return false;
}
function getS(){try{if(window.XW&&XW.S)return XW.S;}catch(e){}try{if(typeof S!=='undefined'&&S)return S;}catch(e2){}return null;}
function nowT(){const s=getS();return s&&s.time||0;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function fin(n){return typeof n==='number'&&isFinite(n);}

function wan(n){
  try{if(typeof xwN==='function')return xwN(n);}catch(e){}
  n=+n;if(!isFinite(n))return '—';
  const neg=n<0;n=Math.abs(n);
  let s;if(n<1e4)s=String(Math.round(n));
  else if(n<1e8){const v=n/1e4;s=(v>=100?String(Math.round(v)):v.toFixed(1).replace(/\.0$/,''))+'萬';}
  else{const v=n/1e8;s=v.toFixed(v>=10?1:2).replace(/\.00$/,'').replace(/\.0$/,'')+'億';}
  return (neg?'-':'')+s;
}
function fmtPlay(t){
  try{if(typeof fmtDur==='function')return fmtDur(t);}catch(e){}
  t=Math.max(0,Math.floor(t||0));
  const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;
  return (h?h+' 小時 ':'')+m+' 分 '+(h?'':s+' 秒');
}

function reduceOf(u){
  if(!u)return 0;
  let r=0;
  if(u.tianleiReduce!=null)r=+u.tianleiReduce;
  else if(u.xtlRed!=null)r=+u.xtlRed;
  else if(u.cultXtlRed!=null)r=+u.cultXtlRed;
  if(!isFinite(r))r=0;
  return clamp(r,0,CFG.reduceCap);
}
function statVal(u,k){const v=u&&u[k];return typeof v==='number'&&isFinite(v)?v:0;}
function needOf(k){
  if(CFG.statNeed&&CFG.statNeed[k]!=null)return +CFG.statNeed[k];
  return CFG.statCap;
}
function allAtCap(u){
  if(!u)return false;
  return CFG.statKeys.every(k=>statVal(u,k)>=needOf(k)-CFG.statEps);
}
function shortStats(u){
  return CFG.statKeys.filter(k=>statVal(u,k)<needOf(k)-CFG.statEps);
}
function dmgMul(u){
  const red=reduceOf(u);
  const redTerm=(1-red)/Math.max(1e-9,1-CFG.reducePerfect);
  const miss=allAtCap(u)?1:CFG.missAmp;
  return redTerm*miss;
}

// 公式：
//   dmg_i = maxhp × weights[i] × (1-leftoverFrac) × (1-減傷)/(1-0.99) × (檢定屬性皆達標 ? 1 : missAmp)
// 權重之和為 1。達標＝攻擊／防禦／悟性／氣運 ≥10000、仙緣 ≥1000（採集不檢定）；且天雷減傷 0.99 時
// 十道合計扣氣血 maxhp×(1-leftoverFrac)，最後剩餘 maxhp×leftoverFrac。缺任一則乘 missAmp，中途殞落。
function computePlan(u){
  const hp0=Math.max(1,+(u&&u.maxhp)||1);
  const mul=dmgMul(u);
  const spend=1-CFG.leftoverFrac;
  const strikes=[];
  let hp=hp0,failAt=0;
  const n=CFG.strikes;
  for(let i=0;i<n;i++){
    const w=CFG.weights[i]||(1/n);
    const dmg=hp0*w*spend*mul;
    const next=hp-dmg;
    const fatal=next<=0;
    strikes.push({i:i+1,dmg:dmg,hpAfter:Math.max(0,next),fatal:fatal});
    hp=Math.max(0,next);
    if(fatal&&!failAt)failAt=i+1;
  }
  const capOk=allAtCap(u);
  const outcome=(hp>0&&capOk)?'success':'fail';
  return {
    hp0:hp0,mul:mul,strikes:strikes,leftover:hp,outcome:outcome,failAt:failAt,
    allAtCap:capOk,reduce:reduceOf(u),short:shortStats(u),n:n
  };
}

function mkSeed(){return ((Date.now()&0xffff)^(Math.floor(Math.random()*0xffff)))||1;}
function mkRunId(){return 'xtl-'+(Date.now().toString(36))+'-'+((Math.random()*1e9)|0).toString(36);}
function runIdOf(d){if(!d)return null;return d.runId!=null?d.runId:d.id;}
function unitIdOf(d){if(!d)return null;return d.unitId!=null?d.unitId:null;}
function isAuth(){return !!ST.auth;}
function sameId(a,b){return a!=null&&b!=null&&(a===b||String(a)===String(b));}
function localAvatarIds(){
  const ids=[];
  const add=u=>{if(u&&u.id!=null)ids.push(u.id);};
  try{add(hero());}catch(e){}
  try{if(window.XW&&typeof XW.player==='function')add(XW.player());}catch(e2){}
  if(!ids.length){
    try{
      const sets=[window.XW&&XW.S,getS()];
      for(const s of sets){
        if(!s||!s.units)continue;
        const ps=s.units.filter(x=>x&&x.kind==='player');
        if(ps.length===1)add(ps[0]);
      }
    }catch(e3){}
  }
  ST._localIds=ids;
  return ids;
}
function isLocalTarget(){
  if(ST.unitId==null)return false;
  return localAvatarIds().some(id=>sameId(id,ST.unitId));
}
function shouldLock(){return !!(ST.on&&!ST.observer&&!ST.lite&&(isLocalTarget()||!ST.fromNet));}
function readPos(d){
  if(!d)return null;
  if(d.pos&&d.pos.x!=null&&d.pos.y!=null)return {x:+d.pos.x,y:+d.pos.y};
  if(d.x!=null&&d.y!=null)return {x:+d.x,y:+d.y};
  return null;
}
function dgRunIdOf(s){
  s=s||getS();
  if(!s)return null;
  if(s.dg&&s.dg.runId!=null&&s.dg.runId!=='')return s.dg.runId;
  if(s.map&&s.map.dgRun&&s.map.dgRun.runId!=null)return s.map.dgRun.runId;
  return null;
}
function localMapKey(){
  const rid=dgRunIdOf();
  if(rid!=null)return 'dg:'+rid;
  return 'world';
}
function readMap(d){
  if(!d)return null;
  if(d.mapKey!=null&&typeof d.mapKey!=='object')return d.mapKey;
  if(d.region!=null&&typeof d.region!=='object')return d.region;
  if(d.map!=null&&typeof d.map!=='object')return d.map;
  if(d.dgRunId!=null&&d.dgRunId!=='')return 'dg:'+d.dgRunId;
  return null;
}
function captureWhere(u){
  const live=u&&u.x!=null?{x:u.x,y:u.y}:null;
  const pos=live||ST.pos||{x:0,y:0};
  const map=localMapKey();
  const s=getS();
  return {
    x:pos.x,y:pos.y,pos:{x:pos.x,y:pos.y},
    map:map,mapKey:map,region:map,
    dgRunId:dgRunIdOf(s),
    coordSpace:(s&&s.map&&s.map.coordSpace)||null,
    name:(u&&(u.name||u.n))||ST.who||null
  };
}
function applyWhere(d,u){
  const fromPay=readPos(d);
  if(u&&u.x!=null&&u.y!=null)ST.pos={x:u.x,y:u.y};
  else if(fromPay)ST.pos=fromPay;
  const mk=readMap(d);
  if(mk!=null)ST.mapKey=mk;
  if(d&&d.name)ST.who=d.name;
  else if(d&&typeof d.n==='string')ST.who=d.n;
  else if(u&&(u.name||typeof u.n==='string'&&u.n))ST.who=u.name||u.n;
}
function refreshMap(){
  if(!ST.on){ST.sameMap=true;return true;}
  const pay=ST.mapKey;
  const local=localMapKey();
  const ok=(pay==null||pay==='')?true:String(pay)===String(local);
  const was=ST.sameMap;
  ST.sameMap=ok;
  if(ok&&was===false){
    try{
      if(window.CultXTLFx){
        if(ST.phase==='strike'&&CultXTLFx.strike){
          const row=ST.plan&&ST.plan.strikes&&ST.plan.strikes[(ST.i||1)-1];
          CultXTLFx.strike(ST,row||{i:ST.i||1});
        }
        if(CultXTLFx.sync)CultXTLFx.sync(ST);
      }
    }catch(e){}
  }
  return ok;
}
function worldOk(){if(!ST.on)return true;refreshMap();return ST.sameMap!==false;}
function applyObserver(opt,data){
  opt=opt||{};
  if(opt.observer===true||(data&&data.observer===true)){ST.observer=true;return;}
  if(opt.observer===false||(data&&data.observer===false)){ST.observer=false;return;}
  if(!ST.fromNet){ST.observer=false;return;}
  ST.observer=!isLocalTarget();
}
function netBase(){
  const where=captureWhere(unitOf());
  return Object.assign({runId:ST.runId,id:ST.runId,unitId:ST.unitId,worldT0:ST.worldT0},where);
}
function startPayload(){
  const plan=ST.plan||{};
  return Object.assign(netBase(),{
    seed:ST.seed,outcome:ST.outcome,hp0:ST.hp0,
    plan:plan.strikes||plan,reduce:plan.reduce,n:plan.n||CFG.strikes,
    allAtCap:plan.allAtCap,short:plan.short||[],leftover:plan.leftover,
    failAt:plan.failAt,mul:plan.mul,stats:ST.statsSnap||null
  });
}
function failStrikeOf(plan){
  if(!plan)return 0;
  if(plan.failAt)return plan.failAt;
  const rows=plan.strikes||plan;
  if(Array.isArray(rows)){const f=rows.find(x=>x&&(x.fatal||x.hpAfter<=0));if(f)return f.i;}
  return 0;
}

function atDixianPeak(u){
  if(!u||(u.realm||0)!==CFG.realmNeed)return false;
  try{if(typeof v52AtTop==='function')return !!v52AtTop(u);}catch(e){}
  try{if(typeof v52Top==='function')return (u.sub||0)>=v52Top(u.realm);}catch(e2){}
  // 後備：十層制頂層 sub=9；舊四階制頂層 sub=3
  const top=(typeof TUNE!=='undefined'&&TUNE.v52&&TUNE.v52.layers)?TUNE.v52.layers-1:9;
  return (u.sub||0)>=top;
}
function canStart(u){
  if(!on())return {ok:false,reason:'flag-off'};
  u=u||hero();
  if(!isXtlCand(u))return {ok:false,reason:'not-cand'};
  if(!isPlayerChar(u))return {ok:false,reason:'not-player'};
  if((u.realm||0)!==CFG.realmNeed)return {ok:false,reason:'realm'};
  if(!atDixianPeak(u))return {ok:false,reason:'sub'};
  if(ST.on)return {ok:false,reason:'busy'};
  const s=getS();
  if(unitAscended(u))return {ok:false,reason:'ascended'};
  const cd=u.cultXtlCd||(isSoloProtagonist(u)&&s&&s.cultXtlCd);
  if(cd&&s&&s.time<cd)return {ok:false,reason:'cooldown',left:cd-s.time};
  if(netRole()==='client')return {ok:false,reason:'client'};
  if(u.dead||u.cultComa>0)return {ok:false,reason:'busy'};
  return {ok:true};
}

function revertWeak(u){
  if(!u||!u.cultXtlWeak)return;
  const w=u.cultXtlWeak;
  if(w.atk0!=null&&isFinite(w.atk0))u.atk=w.atk0;
  u.cultXtlWeak=null;
}
function applyWeak(u){
  if(!u)return;
  revertWeak(u);
  const atk0=u.atk;
  u.cultXtlWeak={until:nowT()+CFG.weakDur,atk0:atk0,why:'xtl',atkMul:CFG.weakAtk,cultMul:CFG.weakCult};
  if(typeof atk0==='number'&&isFinite(atk0))u.atk=Math.max(1,atk0*(1-CFG.weakAtk));
}
function tickWeak(s){
  const list=[];
  if(s&&s.units)for(const u of s.units)list.push(u);
  if(ST._unit&&list.indexOf(ST._unit)<0)list.push(ST._unit);
  for(const u of list){
    if(u&&u.cultXtlWeak&&((s&&s.time)||0)>=(u.cultXtlWeak.until||0))revertWeak(u);
  }
}

function ensureHudCss(){
  let st=document.getElementById('xtlHudCss');
  if(!st){st=document.createElement('style');st.id='xtlHudCss';(document.head||document.documentElement).appendChild(st);}
  st.textContent=`body.cult-xtl .ui:not(#xtlCard):not(#xtlConfirm),
body.cult-xtl #pbar,body.cult-xtl #tutbub,body.cult-xtl #tutring,
body.cult-xtl #v158bar,body.cult-xtl #v48cb,body.cult-xtl #v47ban,body.cult-xtl #v47pause,body.cult-xtl #v58q,
body.cult-xtl #pb_menu,body.cult-xtl #x47rchip,body.cult-xtl #x47dbgbtn,body.cult-xtl #x47fan,
body.cult-xtl #actions,body.cult-xtl #joy,body.cult-xtl #objectives,body.cult-xtl #hint,
body.cult-xtl #minimap,body.cult-xtl #topbar,body.cult-xtl #panel,body.cult-xtl #buildbar,
body.cult-xtl #cult,body.cult-xtl #trade,body.cult-xtl #help,body.cult-xtl #toasts,
body.cult-xtl #menuPop,body.cult-xtl #roster,body.cult-xtl #dbg,body.cult-xtl #menuBar
{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important}
body.cult-xtl #xtlCard,body.cult-xtl #xtlConfirm{display:flex!important;visibility:visible!important;pointer-events:auto!important;opacity:1!important;background:radial-gradient(ellipse at 50% 22%,#241c3a 0%,#07060c 58%)!important;z-index:40000!important}
body.cult-xtl #xtlLayer{display:block!important;visibility:visible!important;pointer-events:none!important}`;
}
function hideHud(hide){
  ST.hud=!!hide;
  try{
    ensureHudCss();
    document.body.classList.toggle('cult-xtl',!!hide);
  }catch(e){}
}
function hudHidden(){
  if(!document.body.classList.contains('cult-xtl'))return false;
  const ids=['pbar','tutbub','v158bar','topbar','actions'];
  return ids.every(id=>{
    const el=document.getElementById(id);
    if(!el)return true;
    const s=getComputedStyle(el);
    return s.display==='none'||s.visibility==='hidden';
  });
}
function isXtlUi(ev){
  const t=ev&&ev.target;
  if(!t||!t.closest)return false;
  return !!(t.closest('#xtlCard')||t.closest('#xtlConfirm')||t.closest('[data-xtl-cont]')||t.closest('[data-xtl-go]')||t.closest('[data-xtl-cancel]'));
}
function onLockEv(ev){
  if(!ST.locked)return;
  if(ST.phase==='card'&&isXtlUi(ev))return;
  if(ST.confirm&&isXtlUi(ev))return;
  // Esc：過場中跳過；成功卡則直接繼續遊玩（不再卡死等按鍵）
  if(ev.type==='keydown'&&ev.code==='Escape'){
    ST.blocked++;
    try{ev.preventDefault();}catch(e){}
    try{ev.stopImmediatePropagation();}catch(e2){}
    try{ev.stopPropagation();}catch(e3){}
    try{if(typeof keys!=='undefined'&&keys)keys.Escape=false;}catch(e4){}
    try{skipPlay();}catch(e5){}
    return false;
  }
  ST.blocked++;
  try{ev.preventDefault();}catch(e){}
  try{ev.stopImmediatePropagation();}catch(e2){}
  try{ev.stopPropagation();}catch(e3){}
  if(ev.type==='keydown'||ev.type==='keyup'||ev.type==='keypress'){
    try{if(typeof keys!=='undefined'&&keys)keys[ev.code]=false;}catch(e4){}
  }
  return false;
}
const LOCK_EV=['keydown','keyup','keypress','pointerdown','pointerup','pointermove','mousedown','mouseup','click','contextmenu','touchstart','touchend','touchmove','wheel'];
function setLock(v){
  ST.locked=!!v;
  if(v){
    if(ST._lockOn)return;
    ST._lockOn=1;
    LOCK_EV.forEach(t=>{
      try{document.addEventListener(t,onLockEv,true);}catch(e){}
      try{window.addEventListener(t,onLockEv,true);}catch(e2){}
    });
  }else if(ST._lockOn){
    ST._lockOn=0;
    LOCK_EV.forEach(t=>{
      try{document.removeEventListener(t,onLockEv,true);}catch(e){}
      try{window.removeEventListener(t,onLockEv,true);}catch(e2){}
    });
    try{if(typeof keys!=='undefined'&&keys)for(const k in keys)keys[k]=false;}catch(e3){}
  }
}

function captureCam(){
  try{if(typeof cam!=='undefined'&&cam)ST.cam0={x:cam.x,y:cam.y,follow:cam.follow};}catch(e){}
}
function restoreCam(){
  try{
    if(ST.cam0&&typeof cam!=='undefined'&&cam){cam.x=ST.cam0.x;cam.y=ST.cam0.y;cam.follow=ST.cam0.follow!==false;}
  }catch(e){}
  ST.cam0=null;
}
function steerCam(){
  if(!ST.on)return;
  ST.camDriven=true;
  const u=unitOf();if(!u)return;
  try{
    if(typeof cam==='undefined'||!cam)return;
    cam.follow=false;
    let tx=u.x,ty=u.y;
    if(ST.phase==='ascend')ty=u.y-(ST.t/Math.max(0.01,CFG.ascendSec))*14;
    else if(ST.phase==='strike'||ST.phase==='gather')ty=u.y-2-ST.i*0.35;
    else if(ST.phase==='fall')ty=u.y+(ST.t/Math.max(0.01,CFG.fallSec))*3;
    const lerp=0.16;
    cam.x+=(tx-8-cam.x)*lerp;
    cam.y+=(ty-6-cam.y)*lerp;
  }catch(e){}
}

function unitOf(){
  if(ST.unitId!=null){
    try{if(typeof unitById==='function'){const u=unitById(ST.unitId);if(u)return u;}}catch(e){}
    const s=getS();
    if(s&&s.units){const u=s.units.find(x=>x&&x.id===ST.unitId);if(u)return u;}
    const h=hero();if(h&&h.id===ST.unitId)return h;
  }
  if(ST._unit&&(ST.unitId==null||ST._unit.id===ST.unitId))return ST._unit;
  if(ST.pos)return {id:ST.unitId,x:ST.pos.x,y:ST.pos.y,name:ST.who};
  return null;
}

function beginPlay(opt){
  opt=opt||{};
  const u=opt.u||hero();
  const plan=opt.plan||computePlan(u);
  const s=getS();
  ST.on=true;ST.phase='gather';ST.t=0;ST.i=0;ST.elapsed=0;
  ST.seed=opt.seed||mkSeed();ST.plan=plan;ST.outcome=plan.outcome;
  ST.hp0=plan.hp0;ST.hp=plan.hp0;
  ST.unitId=opt.unitId!=null?opt.unitId:(opt.fromNet?null:(u&&u.id));
  ST._unit=u||null;
  ST.runId=opt.runId||mkRunId();
  ST.worldT0=opt.worldT0!=null?opt.worldT0:nowT();
  ST.auth=!opt.fromNet;
  ST.fromNet=!!opt.fromNet;
  ST.lite=!!(opt.lite||(u&&isDiscipleUnit(u)));
  ST.blocked=0;ST.confirm=false;ST.camDriven=false;
  ST.statsSnap=u?pickStats(u):null;
  ST.startPayload=null;
  applyWhere(opt,u);
  if(ST.pos==null&&u&&u.x!=null)ST.pos={x:u.x,y:u.y};
  if(ST.mapKey==null)ST.mapKey=opt.mapKey||opt.map||opt.region||(opt.fromNet?readMap(opt):localMapKey());
  applyObserver(opt,opt);
  if(ST.auth&&u){u.hp=plan.hp0;ST._pos0={x:u.x,y:u.y};}
  else if(u&&u.x!=null){ST._pos0={x:u.x,y:u.y};}
  else if(ST.pos){ST._pos0={x:ST.pos.x,y:ST.pos.y};}
  refreshMap();
  if(s){s.cultXtl={on:true,phase:'gather',seed:ST.seed,outcome:ST.outcome,runId:ST.runId,id:ST.runId,unitId:ST.unitId,worldT0:ST.worldT0,map:ST.mapKey};}
  captureCam();
  try{if(typeof openPause==='function')openPause(false);}catch(eP){}
  if(shouldLock()){hideHud(true);setLock(true);}
  else{hideHud(false);setLock(false);}
  if(!ST.observer&&!ST.lite)closePanels();
  if(!ST.observer&&!ST.lite)maybePreloadScene();
  if(window.CultXTLFx&&CultXTLFx.begin)CultXTLFx.begin(ST);
  if(ST.observer){
    try{
      const nm=ST.who||(ST.startPayload&&(ST.startPayload.name||ST.startPayload.n))||'有人';
      tip(nm+'正在飛升');
    }catch(eT){}
  }else if(ST.lite&&ST.auth){
    try{
      const nm=(u&&(u.name||u.n))||'弟子';
      tip(nm+'引動天劫，踏上仙梯');
    }catch(eL){}
    // 弟子飛升：地圖簡短演出（加速），不鎖玩家
    ST.accel=Math.max(ST.accel||1,2.4);
  }
  ST.startPayload=startPayload();
  if(ST.auth)emit('cult:xtlStart',ST.startPayload);
  return ST;
}
function pickStats(u){
  const o={reduce:reduceOf(u)};
  CFG.statKeys.forEach(k=>o[k]=statVal(u,k));
  o.maxhp=u.maxhp;o.hp=u.hp;o.realm=u.realm;
  return o;
}
function closePanels(){
  try{if(typeof closeCult==='function')closeCult();}catch(e){}
  try{if(typeof closeOverlays==='function')closeOverlays();}catch(e2){}
  try{if(typeof x47DbgClose==='function')x47DbgClose();}catch(e3){}
  const c=document.getElementById('xtlConfirm');if(c)c.remove();
}

function start(u,opt){
  opt=opt||{};
  u=u||hero();
  const inNet=coop();
  if(inNet){
    // 聯機忽略作弊屬性／成敗覆寫，由單位真實數值計算
  }
  const allowForce=!!opt.force&&!inNet;
  const gate=allowForce?{ok:true}:canStart(u);
  if(!gate.ok)return gate;
  if(opt.forceStats&&!inNet)applyForce(u,opt.success!==false);
  const plan=computePlan(u);
  return {ok:true,state:beginPlay({u:u,plan:plan,seed:opt.seed,netAuthorized:!!opt.netAuthorized})};
}
function applyForce(u,success){
  if(!u)return;
  u.realm=CFG.realmNeed;
  try{
    if(typeof v52Top==='function')u.sub=v52Top(u.realm);
    else if(typeof TUNE!=='undefined'&&TUNE.v52&&TUNE.v52.layers)u.sub=TUNE.v52.layers-1;
    else u.sub=9;
  }catch(e){u.sub=9;}
  CFG.statKeys.forEach(k=>u[k]=needOf(k));
  if(!success)u.def=Math.max(0,needOf('def')*0.45);
  u.tianleiReduce=CFG.reducePerfect;
  if(!(u.maxhp>10))u.maxhp=8000;
  u.hp=u.maxhp;
  u.dead=false;
}
function resolveUnit(uid){
  if(uid==null)return hero();
  try{if(typeof unitById==='function'){const u=unitById(uid);if(u)return u;}}catch(e){}
  const lists=[];
  try{if(window.XW&&XW.S&&XW.S.units)lists.push(XW.S.units);}catch(e1){}
  try{const s=getS();if(s&&s.units&&lists.indexOf(s.units)<0)lists.push(s.units);}catch(e2){}
  for(const list of lists){const u=list.find(x=>x&&sameId(x.id,uid));if(u)return u;}
  const p=hero();
  if(p&&sameId(p.id,uid))return p;
  return null;
}
function playFromNet(data,opt){
  if(!data)return {ok:false,reason:'no-data'};
  opt=opt||{};
  const rid=runIdOf(data);
  const uid=unitIdOf(data);
  if(ST.on&&ST.runId&&rid!=null&&String(ST.runId)===String(rid)){
    if(uid!=null)ST.unitId=uid;
    applyWhere(data,resolveUnit(ST.unitId));
    applyObserver(opt,data);
    refreshMap();
    if(opt.elapsed!=null){seekToElapsed(+opt.elapsed);return {ok:true,resync:true,runId:ST.runId,sameMap:ST.sameMap!==false};}
    return {ok:true,dedup:true,runId:ST.runId,sameMap:ST.sameMap!==false};
  }
  const u=resolveUnit(uid);
  applyObserver(opt,data);
  const plan={
    hp0:data.hp0||(u&&u.maxhp)||1,
    strikes:data.plan||[],
    leftover:data.leftover,
    outcome:data.outcome||'fail',
    n:data.n||(data.plan&&data.plan.length)||CFG.strikes,
    reduce:data.reduce,allAtCap:data.allAtCap,short:data.short||[],mul:data.mul||1,
    failAt:data.failAt
  };
  if(plan.leftover==null&&plan.strikes.length)plan.leftover=plan.strikes[plan.strikes.length-1].hpAfter;
  if(!plan.failAt)plan.failAt=failStrikeOf(plan);
  beginPlay({
    u:u,plan:plan,seed:data.seed,fromNet:true,runId:rid||mkRunId(),unitId:uid,worldT0:data.worldT0,
    x:data.x,y:data.y,pos:data.pos,map:data.map,mapKey:data.mapKey,region:data.region,
    dgRunId:data.dgRunId,name:data.name||(typeof data.n==='string'?data.n:null),observer:opt.observer!=null?opt.observer:data.observer
  });
  if(opt.elapsed!=null)seekToElapsed(+opt.elapsed);
  return {ok:true,runId:ST.runId,visualOnly:true,observer:!!ST.observer,sameMap:ST.sameMap!==false};
}
function snapshotRun(){
  if(!ST.on)return null;
  return {
    payload:ST.startPayload||startPayload(),
    elapsed:ST.elapsed||0,
    phase:ST.phase,i:ST.i,t:ST.t,
    played:ST.i||0,strikesPlayed:ST.i||0,
    hp:ST.hp,outcome:ST.outcome,
    runId:ST.runId,id:ST.runId,unitId:ST.unitId,worldT0:ST.worldT0,seed:ST.seed,
    observer:!!ST.observer,sameMap:ST.sameMap!==false
  };
}
function seekToElapsed(elapsed){
  elapsed=Math.max(0,+elapsed||0);
  ST.elapsed=elapsed;
  const plan=ST.plan||{};
  const rows=plan.strikes||[];
  const n=plan.n||rows.length||CFG.strikes;
  const failAt=plan.outcome==='fail'?(plan.failAt||failStrikeOf(plan)||n):0;
  const nPlay=failAt>0?failAt:n;
  hideCard();
  if(elapsed<CFG.gatherSec){ST.phase='gather';ST.t=elapsed;ST.i=0;ST.hp=ST.hp0;if(window.CultXTLFx&&CultXTLFx.sync)CultXTLFx.sync(ST);return;}
  let e=elapsed-CFG.gatherSec;
  for(let k=0;k<nPlay;k++){
    if(e<CFG.strikeSec){
      const row=rows[k]||{i:k+1,hpAfter:ST.hp0,dmg:0};
      ST.phase='strike';ST.t=e;ST.i=row.i|| (k+1);ST.hp=row.hpAfter;
      if(window.CultXTLFx&&CultXTLFx.strike)CultXTLFx.strike(ST,row);
      if(window.CultXTLFx&&CultXTLFx.sync)CultXTLFx.sync(ST);
      return;
    }
    e-=CFG.strikeSec;
    const row=rows[k];if(row){ST.i=row.i;ST.hp=row.hpAfter;}
  }
  if(plan.outcome==='success'){
    if(e<CFG.ascendSec){ST.hp=plan.leftover!=null?plan.leftover:ST.hp;enterAscend();ST.t=e;ST.auth=ST.auth;if(window.CultXTLFx&&CultXTLFx.sync)CultXTLFx.sync(ST);return;}
    ST.hp=plan.leftover!=null?plan.leftover:ST.hp;
    enterCard();
    return;
  }
  if(e<CFG.fallSec){enterFall();ST.t=e;if(window.CultXTLFx&&CultXTLFx.sync)CultXTLFx.sync(ST);return;}
  finishFail();
}
function netStrike(data,opt){
  if(!data)return {ok:false,reason:'no-data'};
  opt=opt||{};
  const rid=runIdOf(data);
  if(ST.on&&ST.runId&&rid!=null&&String(ST.runId)!==String(rid))return {ok:false,reason:'run'};
  if(!ST.on){
    if(!data.plan&&!(ST.startPayload&&ST.startPayload.plan))return {ok:false,reason:'no-run'};
    playFromNet(Object.assign({},ST.startPayload||data,data),Object.assign({elapsed:0},opt));
  }
  if(data.unitId!=null)ST.unitId=data.unitId;
  applyWhere(data,resolveUnit(ST.unitId));
  applyObserver(opt,data);
  refreshMap();
  const i=Math.max(1,+(data.i||1));
  hideCard();
  ST.phase='strike';ST.i=i;
  const row=(ST.plan&&ST.plan.strikes&&ST.plan.strikes[i-1])||{i:i,dmg:data.dmg,hpAfter:data.hp,fatal:!!data.fatal};
  ST.hp=row.hpAfter!=null?row.hpAfter:data.hp;
  ST.t=data.t!=null?data.t:CFG.strikeSec*0.35;
  ST.elapsed=CFG.gatherSec+(i-1)*CFG.strikeSec+ST.t;
  if(window.CultXTLFx&&CultXTLFx.strike)CultXTLFx.strike(ST,row);
  if(window.CultXTLFx&&CultXTLFx.sync)CultXTLFx.sync(ST);
  return {ok:true,i:ST.i,visualOnly:true};
}
function netEnd(data,opt){
  if(!data)return {ok:false,reason:'no-data'};
  opt=opt||{};
  const rid=runIdOf(data);
  if(ST.on&&ST.runId&&rid!=null&&String(ST.runId)!==String(rid))return {ok:false,reason:'run'};
  if(!ST.on&&data)playFromNet(Object.assign({},data,{plan:data.plan||(ST.startPayload&&ST.startPayload.plan)||[]}),Object.assign({elapsed:0},opt));
  if(data.unitId!=null)ST.unitId=data.unitId;
  applyWhere(data,resolveUnit(ST.unitId));
  applyObserver(opt,data);
  refreshMap();
  const ok=data.ok!==false&&(data.outcome?data.outcome==='success':(data.ascended||data.ok));
  ST.auth=false;
  if(ok){
    ST.hp=data.leftover!=null?data.leftover:ST.hp;
    enterCard();
  }else{
    enterFall();
    finishFail();
  }
  return {ok:true,visualOnly:true};
}

function hitStrike(idx){
  const plan=ST.plan;if(!plan||!plan.strikes)return;
  const row=plan.strikes[idx];if(!row)return;
  ST.i=row.i;ST.hp=row.hpAfter;
  if(ST.auth){const u=unitOf();if(u)u.hp=Math.max(0,row.hpAfter);}
  if(window.CultXTLFx&&CultXTLFx.strike)CultXTLFx.strike(ST,row);
  if(ST.auth)emit('cult:xtlStrike',Object.assign(netBase(),{i:row.i,n:plan.n||CFG.strikes,dmg:row.dmg,hp:row.hpAfter,fatal:!!row.fatal}));
  if(row.fatal||(ST.outcome==='fail'&&row.i===(plan.failAt||row.i)&&row.hpAfter<=0)){
    // 轉殞落於本段結束後（由 tick 判斷）
  }
}

function enterAscend(){
  ST.phase='ascend';ST.t=0;
  if(ST.auth){const u=unitOf();if(u)u.hp=Math.max(1,ST.hp);}
  if(window.CultXTLFx&&CultXTLFx.ascend)CultXTLFx.ascend(ST);
}
function enterCard(){
  ST.phase='card';ST.t=0;
  if(ST.auth){
    const u=unitOf();
    if(u)u.ascended=true;
    const s=getS();
    if(s&&isSoloProtagonist(u))s.ascended=true;
  }
  if(ST.auth)emit('cult:xtlEnd',Object.assign(netBase(),{ok:true,leftover:ST.hp,ascended:true}));
  // 弟子：無全螢幕成功卡，toast 後自動結束
  if(ST.lite){
    try{
      const u=unitOf();
      const nm=(u&&(u.name||u.n))||'弟子';
      tip(nm+'飛升成功，身化仙光而去');
    }catch(e){}
    endPlay(true);
    return;
  }
  if(window.CultXTLFx&&CultXTLFx.card)CultXTLFx.card(ST);
  showCard();
}
function enterFall(){
  // 失敗分支：天梯／天門不動，人物在當階化灰（phase 仍用 fall 以相容舊測試／聯機）
  ST.phase='fall';ST.t=0;
  if(ST.auth){const u=unitOf();if(u){/* 化灰期間先鎖血，結束後再進死亡重生 */u.hp=Math.max(1,u.hp||1);u.dead=false;}}
  if(window.CultXTLFx&&CultXTLFx.fall)CultXTLFx.fall(ST);
}
function finishFail(){
  const u=unitOf();
  const auth=ST.auth;
  const lite=!!ST.lite;
  const pos0=ST._pos0?{x:ST._pos0.x,y:ST._pos0.y}:(u&&u.x!=null?{x:u.x,y:u.y}:null);
  if(auth){
    if(u)u.cultXtlCd=nowT()+CFG.cooldown;
    const s=getS();
    if(s&&isSoloProtagonist(u))s.cultXtlCd=s.time+CFG.cooldown;
    // 主角失敗：暫虛弱、不掉境界、不走身隕；弟子維持倒數復活
    emit('cult:xtlEnd',Object.assign(netBase(),{ok:false,leftover:Math.max(1,ST.hp||1),ascended:false,dead:false,weak:true}));
  }
  endPlay(false);
  if(auth&&u){
    try{
      if(pos0){u.x=pos0.x;u.y=pos0.y;}
      u.task=null;u.path=[];u.vx=u.vy=u.dvx=u.dvy=0;
      if(lite||(isDiscipleUnit(u)&&!isPlayerChar(u))){
        u.hp=0;u.dead=true;u.respawn=48;
        try{tip((u.name||'弟子')+'天劫未渡，身殞仙梯');}catch(e0){}
      }else{
        u.dead=false;u.respawn=0;
        u.hp=Math.max(1,u.hp||1);
        try{applyWeak(u);}catch(eW){}
        try{tip((u.name||'修士')+'天劫未渡，修為暫損');}catch(e1){}
      }
    }catch(e){}
  }
}
const REALM_FALL=['武徒','武師','大武師','宗師','煉氣','築基','金丹','元嬰','化神','合體','地仙','天仙'];
function cardStats(){
  const s=getS();const u=unitOf()||hero();
  let discs=0,built=0,journey='';
  try{
    const list=(typeof disciples==='function'?disciples():(window.XW&&typeof XW.disciples==='function'?XW.disciples():null));
    discs=list?list.filter(x=>x&&!x.dead).length:(s&&s.units||[]).filter(x=>x&&x.kind==='disciple'&&!x.np&&!x.dead).length;
  }catch(e){}
  try{built=(s&&s.buildings||[]).filter(b=>b&&b.built&&!b.broken).length;}catch(e2){}
  try{
    const r=(u&&u.realm)|0;
    const R=(typeof REALMS!=='undefined'&&REALMS)||(window.XW&&XW.REALMS)||null;
    if(R&&R.length)journey=R.slice(0,r+1).map(X=>X.n||X.full||X).join(' → ');
    if(!journey)journey=REALM_FALL.slice(0,r+1).join(' → ');
  }catch(e3){journey=REALM_FALL.slice(0,((u&&u.realm)|0)+1).join(' → ');}
  return {
    play:fmtPlay(s&&s.time||0),
    time:s&&s.time||0,
    sect:built,
    disciples:discs,
    journey:journey,
    realm:u&&((typeof realmName==='function'?realmName(u):null)||u.realm)
  };
}
function showCard(){
  let el=document.getElementById('xtlCard');
  if(!el){el=document.createElement('div');el.id='xtlCard';document.body.appendChild(el);}
  const st=cardStats();
  el.className='ui';
  try{document.body.appendChild(el);}catch(e){}
  el.style.cssText='position:fixed;inset:0;z-index:40000;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 22%,#241c3a 0%,#07060c 58%);color:#f3e6c4;pointer-events:auto';
  const parts=(st.journey||'—').split(/\s*→\s*/).filter(Boolean);
  const mid=parts.length>6?6:parts.length;
  const j1=parts.slice(0,mid).join(' → ');
  const j2=parts.slice(mid).join(' → ');
  el.innerHTML=`<style>@keyframes xtlFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
#xtlCard .xtl-line{animation:xtlFade .7s ease both}#xtlCard .xtl-line:nth-child(1){animation-delay:.05s}#xtlCard .xtl-line:nth-child(2){animation-delay:.18s}#xtlCard .xtl-line:nth-child(3){animation-delay:.3s}#xtlCard .xtl-line:nth-child(4){animation-delay:.42s}#xtlCard .xtl-line:nth-child(5){animation-delay:.54s}
#xtlCard .xtl-frame{border:2px solid #c9a35a;box-shadow:0 0 40px #c9a35a55,inset 0 0 50px #241c3a88;padding:34px 36px 28px;position:relative;background:linear-gradient(180deg,#1a1630ee,#0c0a16f2)}
#xtlCard .xtl-frame:before,#xtlCard .xtl-frame:after{content:'';position:absolute;width:18px;height:18px;border-color:#ffe27a;border-style:solid}
#xtlCard .xtl-frame:before{left:8px;top:8px;border-width:2px 0 0 2px}#xtlCard .xtl-frame:after{right:8px;top:8px;border-width:2px 2px 0 0}
#xtlCard .xtl-title{font-size:42px;letter-spacing:8px;color:#ffe27a;text-shadow:0 0 18px #ffe27a,0 0 42px #c9a0ff;animation:xtlFade .8s ease both}
@keyframes xtlMote{0%{transform:translateY(18px);opacity:0}40%{opacity:.7}100%{transform:translateY(-64px);opacity:0}}
#xtlCard .xtl-mote{position:absolute;width:3px;height:3px;border-radius:50%;background:#ffe27a;box-shadow:0 0 8px #ffe27a;animation:xtlMote 3.6s linear infinite;pointer-events:none}
#xtlCard .xtl-frame:nth-of-type(1){}</style>
    <div class="xtl-mote" style="left:18%;bottom:22%;animation-delay:.2s"></div>
    <div class="xtl-mote" style="left:28%;bottom:18%;animation-delay:1.1s"></div>
    <div class="xtl-mote" style="left:48%;bottom:14%;animation-delay:.6s"></div>
    <div class="xtl-mote" style="left:62%;bottom:20%;animation-delay:1.8s"></div>
    <div class="xtl-mote" style="left:74%;bottom:16%;animation-delay:.9s"></div>
    <div class="xtl-frame" style="text-align:center;max-width:min(560px,90vw)">
    <div class="xtl-title">飛升成功</div>
    <div style="margin:18px 0 8px;line-height:1.9;font-size:15px">
      <div class="xtl-line">遊玩時長　${st.play}</div>
      <div class="xtl-line">宗門規模　${st.sect} 座建築</div>
      <div class="xtl-line">門下弟子　${st.disciples} 人</div>
      <div class="xtl-line">境界歷程　${j1}${j2?'<br>　　　　　'+j2:''}</div>
    </div>
    <button type="button" class="btn pri xtl-line" data-xtl-cont style="margin-top:18px;min-height:44px;padding:10px 28px;font-size:16px">繼續遊玩</button>
  </div>`;
}
function hideCard(){const el=document.getElementById('xtlCard');if(el)el.remove();}

function endPlay(ok){
  const u=unitOf();
  if(u&&ST._pos0){u.x=ST._pos0.x;u.y=ST._pos0.y;}
  ST.on=false;ST.phase='idle';ST.t=0;ST.locked=false;ST.auth=false;ST.observer=false;ST.lite=false;
  const s=getS();if(s)s.cultXtl=null;
  hideCard();
  hideHud(false);
  setLock(false);
  restoreCam();
  if(window.CultXTLFx&&CultXTLFx.end)CultXTLFx.end();
}
function continuePlay(){
  if(!ST.on&&!document.getElementById('xtlCard'))return {ok:true,already:true};
  endPlay(true);
  return {ok:true,ascended:!!(getS()&&getS().ascended)};
}

function phaseDur(ph){
  if(ph==='gather')return CFG.gatherSec;
  if(ph==='strike')return CFG.strikeSec;
  if(ph==='ascend')return CFG.ascendSec;
  if(ph==='fall')return CFG.fallSec;
  return 0;
}

function maybePreloadScene(){
  try{
    if(ST.on&&ST.observer)return;
    if(!(window.CultXTLScene&&typeof CultXTLScene.preload==='function'))return;
    if(ST.on&&!ST.observer){CultXTLScene.preload();return;}
    const p=hero();
    if(p&&(p.realm||0)>=CFG.realmNeed)CultXTLScene.preload();
  }catch(e){}
}
function skipPlay(){
  if(!ST.on&&!document.getElementById('xtlCard'))return {ok:true,already:true};
  if(ST.phase==='card'||document.getElementById('xtlCard'))return continuePlay();
  if(ST.outcome==='success'){
    ST.hp=(ST.plan&&ST.plan.leftover!=null)?ST.plan.leftover:Math.max(1,ST.hp);
    enterCard();
    return {ok:true,skipped:'card'};
  }
  try{finishFail();}catch(e){endPlay(false);}
  return {ok:true,skipped:'fail'};
}
function aiDiscipleXtl(dt){
  if(!on())return;
  if(ST.on)return;
  if(netRole()==='client')return;
  ST._aiT=(ST._aiT||0)+(dt||0);
  if(ST._aiT<2.8)return;
  ST._aiT=0;
  const s=getS();if(!s||!s.units)return;
  const now=s.time||0;
  for(const u of s.units){
    if(!isDiscipleUnit(u)||u.dead)continue;
    if(unitAscended(u))continue;
    if(u.cultXtlCd&&now<u.cultXtlCd)continue;
    if((u.hp||0)<Math.max(1,(u.maxhp||1)*0.6))continue;
    if(u.cultComa>0)continue;
    if(u.task&&(u.task.type==='attack'||u.task.type==='raid'||u.task.type==='combat'))continue;
    if(now-(u.lastHit||0)<6)continue; // 戰鬥中
    const g=canStart(u);if(!g.ok)continue;
    start(u,{});
    break;
  }
}
function tick(dt){
  const s=getS();
  if(s)tickWeak(s);
  maybePreloadScene();
  if(!ST.on)return;
  const sc=Math.max(0.001,(CFG.timeScale||1)*(ST.accel||1));
  dt=(dt||0)*sc;
  if(ST.phase==='card'){
    ST.t+=(dt||0);
    if(ST.t>=(CFG.cardAutoSec||2.8))continuePlay();
    return;
  }
  refreshMap();
  ST.elapsed=(ST.elapsed||0)+(dt||0);
  ST.t+=(dt||0);
  if(ST.phase==='gather'){
    if(ST.t>=CFG.gatherSec){ST.phase='strike';ST.t=0;ST.i=0;ST._hit=0;hitStrike(0);}
  }else if(ST.phase==='strike'){
    const n=(ST.plan&&ST.plan.n)||CFG.strikes;
    if(ST.t>=CFG.strikeSec){
      const cur=ST.i||1;
      const row=ST.plan&&ST.plan.strikes[cur-1];
      if(row&&(row.fatal||row.hpAfter<=0||(ST.outcome==='fail'&&ST.plan.failAt===cur))){
        enterFall();return;
      }
      if(cur>=n){
        if(ST.outcome==='success')enterAscend();
        else enterFall();
        return;
      }
      ST.t=0;hitStrike(cur);
    }
  }else if(ST.phase==='ascend'){
    if(ST.t>=CFG.ascendSec)enterCard();
  }else if(ST.phase==='fall'){
    if(ST.t>=CFG.fallSec)finishFail();
  }
}

function seek(spec){
  spec=spec||{};
  if(!ST.on){
    const r=start(hero(),{force:!!spec.force,forceStats:!!spec.forceStats,success:spec.success!==false});
    if(!r||!r.ok)return r;
  }
  const ph=spec.phase||'strike';
  if(ph==='gather'){ST.phase='gather';ST.t=spec.t||0;ST.i=0;ST.hp=ST.hp0;hideCard();}
  else if(ph==='strike'){
    const i=Math.max(1,Math.min(CFG.strikes,spec.i||1));
    ST.phase='strike';ST.t=spec.t!=null?spec.t:CFG.strikeSec*0.35;
    hideCard();
    // 重放至該道
    ST.hp=ST.hp0;
    for(let k=0;k<i;k++){
      const row=ST.plan.strikes[k];
      ST.i=row.i;ST.hp=row.hpAfter;
    }
    if(ST.auth){const u=unitOf();if(u)u.hp=ST.hp;}
    if(window.CultXTLFx&&CultXTLFx.strike)CultXTLFx.strike(ST,ST.plan.strikes[i-1]);
  }else if(ph==='ascend'){
    ST.hp=(ST.plan&&ST.plan.leftover)||ST.hp;
    enterAscend();ST.t=spec.t!=null?spec.t:CFG.ascendSec*0.45;
  }else if(ph==='card'){
    ST.hp=(ST.plan&&ST.plan.leftover)||ST.hp;
    enterCard();
  }else if(ph==='fall'){
    enterFall();ST.t=spec.t!=null?spec.t:CFG.fallSec*0.4;
  }
  if(window.CultXTLFx&&CultXTLFx.sync)CultXTLFx.sync(ST);
  return {ok:true,phase:ST.phase,i:ST.i,hp:ST.hp};
}

function askStart(u){
  u=u||selectedXtlUnit()||hero();
  if(isDiscipleUnit(u)){
    // 弟子改由 AI 自行飛升，不由面板發起
    try{tip('弟子達標後會自行踏仙梯');}catch(e){}
    return {ok:false,reason:'disciple-ai'};
  }
  ST._askU=u;
  const g=canStart(u);
  if(!g.ok){
    try{tip(askMsg(g));}catch(e){}
    return g;
  }
  ST.confirm=true;
  let el=document.getElementById('xtlConfirm');
  if(!el){el=document.createElement('div');el.id='xtlConfirm';document.body.appendChild(el);}
  el.className='ui';
  el.style.cssText='position:fixed;inset:0;z-index:11000;display:flex;align-items:center;justify-content:center;background:#0008;color:#f3e6c4';
  el.innerHTML=`<div style="background:#16110cf2;border:1px solid #c9a35a;padding:22px 20px;max-width:min(420px,92vw);text-align:center;border-radius:8px">
    <div style="font-size:20px;color:#ffe27a;letter-spacing:4px;margin-bottom:10px">踏仙梯</div>
    <div style="line-height:1.7;font-size:14px">須地仙大圓滿方可踏梯。將引來十道天雷；需攻擊／防禦／悟性／氣運達 10000、仙緣達 1000（採集不計）。確定要開始嗎？</div>
    <div style="margin-top:16px;display:flex;gap:10px;justify-content:center">
      <button type="button" class="btn pri" data-xtl-go>確定</button>
      <button type="button" class="btn" data-xtl-cancel>取消</button>
    </div>
  </div>`;
  return {ok:true,confirm:true};
}
function askMsg(g){
  if(!g)return '現在不能踏仙梯';
  if(g.reason==='flag-off')return '踏仙梯尚未開啟';
  if(g.reason==='not-cand')return '此角色無法踏仙梯';
  if(g.reason==='not-player')return '此角色無法踏仙梯';
  if(g.reason==='realm')return '需達地仙境界才能踏仙梯';
  if(g.reason==='sub')return '需達地仙大圓滿才能踏仙梯';
  if(g.reason==='ascended')return '已飛升成功，可繼續遊玩此檔';
  if(g.reason==='cooldown')return '天雷餘威未散，稍後再試';
  if(g.reason==='client')return '聯機由房主開啟踏仙梯';
  if(g.reason==='busy')return '此刻無法踏仙梯';
  return '現在不能踏仙梯';
}

function paintCultBtn(){
  if(!on())return;
  const p=hero();
  maybePreloadScene();
  const el=document.getElementById('cult');
  if(el&&el.classList.contains('open')&&p&&atDixianPeak(p)&&!el.querySelector('[data-xtl-ask]')){
    const box=document.createElement('div');
    box.className='sec';
    box.innerHTML='<button type="button" class="btn on" data-xtl-ask>踏仙梯（飛升）</button>';
    const jobs=el.querySelector('.jobs');
    if(jobs&&jobs.parentNode)jobs.parentNode.appendChild(box);
    else el.appendChild(box);
  }
  const pan=document.getElementById('panel');
  if(pan&&p&&atDixianPeak(p)){
    let sel=false;
    try{sel=typeof selUnits!=='undefined'&&selUnits&&selUnits[0]===p.id;}catch(e){}
    if(sel&&!pan.querySelector('[data-xtl-ask]')){
      const b=document.createElement('button');
      b.type='button';b.className='btn on';b.setAttribute('data-xtl-ask','1');b.textContent='踏仙梯（飛升）';
      pan.appendChild(b);
    }
  }
}

function hookCheat(){
  try{
    if(typeof XMOD_SPEC!=='undefined'&&Array.isArray(XMOD_SPEC)&&!XMOD_SPEC.some(x=>x&&x.k==='xtl')){
      const i=XMOD_SPEC.findIndex(x=>x&&x.k==='gongfa');
      const row={g:'cult',set:'cult',k:'xtl',n:'踏仙梯（飛升）'};
      if(i>=0)XMOD_SPEC.splice(i+1,0,row);else XMOD_SPEC.push(row);
    }
  }catch(e){}
  try{
    if(typeof X47_DBG!=='undefined'&&Array.isArray(X47_DBG)){
      if(!X47_DBG.some(d=>d&&d[0]==='xtl_ok')){
        X47_DBG.push(['xtl_ok','測試踏仙梯（成功）',function(){devStart(true);}]);
        X47_DBG.push(['xtl_no','測試踏仙梯（失敗）',function(){devStart(false);}]);
      }
    }
    if(typeof XMOD_BTNS!=='undefined'&&XMOD_BTNS){
      const arr=XMOD_BTNS.realm||(XMOD_BTNS.realm=[]);
      if(arr.indexOf('xtl_ok')<0)arr.push('xtl_ok','xtl_no');
    }
  }catch(e2){}
}
function devStart(success){
  if(coop())return {ok:false,reason:'coop'};
  const u=hero();
  if(!u){try{tip('沒有主角');}catch(e){}return {ok:false,reason:'no-hero'};}
  try{if(typeof x47DbgClose==='function')x47DbgClose();}catch(e){}
  const s=getS();if(s){s.ascended=false;s.cultXtlCd=0;}
  if(u){u.ascended=false;u.cultXtlCd=0;}
  CULT_FLAGS.xtl=true;
  return start(u,{force:true,forceStats:true,success:!!success});
}

function patchFn(name,factory){
  function apply(obj,key){
    if(!obj||typeof obj[key]!=='function'||obj[key]._xtlW)return;
    const w=factory(obj[key]);w._xtlW=1;obj[key]=w;
  }
  try{if(typeof window!=='undefined')apply(window,name);}catch(e){}
  try{if(window.XW)apply(XW,name);}catch(e2){}
}
function wrapSnapshot(_sn){
  return function(){
    const d=_sn.apply(this,arguments);
    try{
      const s=getS();
      if(d&&s){
        d.ascended=!!s.ascended;d.cultXtlCd=s.cultXtlCd||0;
        if(d.units&&s.units){
          for(let i=0;i<d.units.length&&i<s.units.length;i++){
            const u=s.units[i];if(!u||!d.units[i])continue;
            if(u.ascended)d.units[i].ascended=true;
            if(u.cultXtlCd)d.units[i].cultXtlCd=u.cultXtlCd;
            if(u.cultXtlWeak)d.units[i].cultXtlWeak=JSON.parse(JSON.stringify(u.cultXtlWeak));
          }
        }
      }
    }catch(e){}
    return d;
  };
}
function wrapApply(_as){
  return function(d){
    const r=_as.apply(this,arguments);
    try{
      const s=getS();
      if(s){
        if(d&&d.ascended!=null)s.ascended=!!d.ascended;
        if(d&&d.cultXtlCd!=null)s.cultXtlCd=d.cultXtlCd;
        if(s.units){
          for(const u of s.units)if(u&&u.cultXtlWeak)revertWeak(u);
          if(s.ascended){
            const heroU=s.units.find(x=>x&&x.kind==='player');
            if(heroU&&!heroU.ascended)heroU.ascended=true;
          }
        }
      }
    }catch(e){}
    return r;
  };
}
function wrapCultMul(_cm){
  return function(u){
    let m=_cm(u);
    if(u&&u.cultXtlWeak){
      const s=getS();
      if(s&&s.time>=(u.cultXtlWeak.until||0))revertWeak(u);
      else m*=Math.max(0,1-(u.cultXtlWeak.cultMul!=null?u.cultXtlWeak.cultMul:CFG.weakCult));
    }
    return m;
  };
}
function patchOpenPause(){
  try{
    if(typeof openPause==='function'&&!openPause._xtlW){
      const _op=openPause;
      openPause=function(on){
        if(on&&shouldLock())return; // 過場中禁止開暫停（HUD 已藏，會變成「卡死要按 Esc」）
        return _op.apply(this,arguments);
      };
      openPause._xtlW=1;
      try{if(window.XW&&XW.v47)XW.v47.openPause=openPause;}catch(e0){}
    }
  }catch(e){}
}
function patchHideUnit(){
  try{
    if(typeof drawHuman==='function'&&!drawHuman._xtlW){
      const _dh=drawHuman;
      drawHuman=function(u){
        if(ST.on&&!ST.observer&&u&&ST.unitId!=null&&u.id===ST.unitId&&(shouldLock()||ST.lite))return; // 由 FX 層繪製
        return _dh.apply(this,arguments);
      };
      drawHuman._xtlW=1;
    }
  }catch(e){}
}
function install(){
  if(ST._in)return;ST._in=1;
  hookCheat();
  patchOpenPause();
  patchHideUnit();
  try{if(typeof UNIT_KEEP!=='undefined'){['cultXtlWeak','ascended','cultXtlCd'].forEach(f=>{if(UNIT_KEEP.indexOf(f)<0)UNIT_KEEP.push(f);});}}catch(e){}
  try{if(window.XW&&Array.isArray(XW.UNIT_KEEP)){['cultXtlWeak','ascended','cultXtlCd'].forEach(f=>{if(XW.UNIT_KEEP.indexOf(f)<0)XW.UNIT_KEEP.push(f);});}}catch(e){}
  if(window.Cult&&typeof Cult.tick==='function'){
    const _tk=Cult.tick.bind(Cult);
    Cult.tick=function(dt){let r;try{r=_tk(dt);}catch(e){}try{tick(dt);}catch(e2){}try{aiDiscipleXtl(dt);}catch(e3){}return r;};
  }
  if(typeof cultMul==='function')cultMul=wrapCultMul(cultMul);
  patchFn('cultMul',wrapCultMul);
  if(typeof snapshot==='function')snapshot=wrapSnapshot(snapshot);
  patchFn('snapshot',wrapSnapshot);
  if(typeof applySave==='function')applySave=wrapApply(applySave);
  patchFn('applySave',wrapApply);
  if(typeof updateCamera==='function'){
    const _uc=updateCamera;
    updateCamera=function(){
      if(ST.on&&shouldLock()){try{steerCam();}catch(e){}return;}
      return _uc.apply(this,arguments);
    };
  }
  if(typeof updateUnit==='function'){
    const _uu=updateUnit;
    updateUnit=function(u,dt){
      if(ST.on&&!ST.observer&&u&&ST.unitId!=null&&u.id===ST.unitId){u.dvx=u.dvy=0;u.path=[];u.task=null;if(ST._pos0){u.x=ST._pos0.x;u.y=ST._pos0.y;}return;}
      return _uu.apply(this,arguments);
    };
  }
  if(typeof renderCult==='function'){
    const _rc=renderCult;
    renderCult=function(){const r=_rc.apply(this,arguments);try{paintCultBtn();}catch(e){}return r;};
  }
  if(typeof renderPanel==='function'){
    const _rp=renderPanel;
    renderPanel=function(){const r=_rp.apply(this,arguments);try{paintCultBtn();}catch(e){}return r;};
  }
  if(typeof document!=='undefined'){
    document.addEventListener('click',function(ev){
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xtl-ask],[data-xtl-go],[data-xtl-cancel],[data-xtl-cont]');
      if(!t)return;
      ev.preventDefault();
      if(t.hasAttribute('data-xtl-ask'))askStart();
      else if(t.hasAttribute('data-xtl-go')){ST.confirm=false;const box=document.getElementById('xtlConfirm');if(box)box.remove();start(ST._askU||selectedXtlUnit()||hero());ST._askU=null;}
      else if(t.hasAttribute('data-xtl-cancel')){ST.confirm=false;const box=document.getElementById('xtlConfirm');if(box)box.remove();}
      else if(t.hasAttribute('data-xtl-cont'))continuePlay();
    },true);
  }
}

const API={
  CFG:CFG,canStart:canStart,atDixianPeak:atDixianPeak,isDiscipleUnit:isDiscipleUnit,isXtlCand:isXtlCand,start:start,playFromNet:playFromNet,continuePlay:continuePlay,skipPlay:skipPlay,
  snapshotRun:snapshotRun,netStrike:netStrike,netEnd:netEnd,seekToElapsed:seekToElapsed,
  computePlan:computePlan,reduceOf:reduceOf,allAtCap:allAtCap,needOf:needOf,wan:wan,cardStats:cardStats,
  tick:tick,seek:seek,state:function(){return ST;},setAccel:function(n){ST.accel=Math.max(0.01,+n||1);return ST.accel;},
  blocked:function(){return ST.blocked;},hudHidden:hudHidden,devStart:devStart,askStart:askStart,
  revertWeak:revertWeak,applyWeak:applyWeak,active:function(){return !!ST.on;},locked:function(){return !!ST.locked;},
  isPlayerChar:isPlayerChar,isLocalTarget:isLocalTarget,isObserver:function(){return !!ST.observer;},
  worldOk:worldOk,sameMap:function(){return refreshMap();},mapKey:localMapKey,
  anchor:function(){return unitOf();}
};
window.XW_XTL=API;
window.CultXTL=API;
try{if(window.Cult){Cult.xtl=API;Cult.canXtl=canStart;Cult.startXtl=start;if(typeof Cult.isPlayerChar!=='function')Cult.isPlayerChar=isPlayerChar;}}catch(e){}
try{install();}catch(e){console.warn('CultXTL.install',e);}
})();
