// ================== 仙武經濟：弟子主動新建＋升級建築（econ_autobuild.js，2026-11-11）==================
// 定案（創意家 11-10 22:43／22:46／22:47，隊長轉達）：
//  長老決定；沒有長老就暫停（計時也停）；不通知宗主（不跳提示）。
//  新建＋升級合計同時最多 1 件；完工後冷卻 1 遊戲年（econYearSec()，目前 300 秒）。
//  同一需求要連續存在 60 秒才動手。金庫動用後須留 max(20 下品, 動用前 20%)；單件靈石費用 ≤ 動用前金庫 30%；
//  木材、石材動用後各須留 ≥20。B 類（不疊加、只算最高等，見 g30_bldtable.js BT_CLASS）最多 1 座，且只升該型最高等那座。
//  優先處理最缺的需求；能升級就先升級（A 類先升等級最低那座）。
// 旗標：ECON_AUTOBUILD_DEFAULT=true（不放進 ECON_FLAGS_DEFAULT，因 g23 ?dev=1 會把該表全設 true）。
//  優先序：window.ECON_AUTOBUILD_FORCE（非 null）→ 網址 ?autobuild=1/0 → S.econ.flags.autobuild（非 null）→ 預設開。
// 狀態：只放在 S.econ.autobuild（S.econ 由 g23 snapshot 整包 JSON 存檔，不改存檔結構、不加 UNIT_KEEP／建築欄位）。
// 聯機：只在房主／單機執行；客機不跑。
var ECON_AUTOBUILD_DEFAULT=true;
var ECON_AUTOBUILD_TUNE={
  needSec:60,          // 需求須持續秒數（長老在場時的累積時鐘）
  floorXia:20,         // 金庫保底下限（下品）
  floorFrac:0.20,      // 金庫保底比例
  maxFrac:0.30,        // 單件靈石費用上限比例
  keepWood:20,keepStone:20,
  evalEvery:1,         // 每秒評估一次
  workers:2,           // 每件派工人數上限
  redispatchSec:10,    // 工地沒人施工時每 10 秒補派
  storeFrac:0.90,      // 資源 ≥ 上限 90% 視為倉儲不足
  searchR:28,          // 尋找空地半徑（格）
  logMax:20
};
// B 類對照（與 g30_bldtable.js BT_CLASS 相同；執行時優先讀 XW.bt.status(type).cls）
var ECON_AB_CLASS_FALLBACK={
  hall:'B',altar:'A',house:'A',wudao:'A',lianwu:'A',library:'A',alchemy:'A',forge:'A',
  cangku:'A',shitang:'A',lingtian:'A',
  xianyuan:'B',juling:'B',huzhen:'B',zongcang:'B',tianjietai:'B',renwutang:'B',gongfage:'B',
  kuangchang:'B',zhifatang:'B',waishitang:'B',qingxinge:'B',chuangong:'B',huanjingta:'B',
  yinglieci:'B',laozu:'B',lingmai:'B',
  biwutai:'C',fuluge:'C',lingshou:'C'
};
function econAutobuildOn(T){
  try{if(typeof window!=='undefined'&&window.ECON_AUTOBUILD_FORCE!=null)return !!window.ECON_AUTOBUILD_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location&&location.search){const m=/[?&]autobuild=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{
    const F=(T&&T.econ&&T.econ.flags)||(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags);
    if(F&&F.autobuild!=null)return !!F.autobuild;
  }catch(e){}
  return !!ECON_AUTOBUILD_DEFAULT;
}
function econABClient(){
  try{if(typeof netAuthSilentNoop==='function'&&netAuthSilentNoop())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  try{const n=(typeof window!=='undefined'&&window.XW&&window.XW.net)||null;if(n&&n.role==='client')return true;}catch(e){}
  return false;
}
function econABState(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  let st=T.econ.autobuild;
  if(!st||typeof st!=='object')st=T.econ.autobuild={v:1,clock:0,need:{},cur:null,cdUntil:0,log:[]};
  if(!(+st.clock>=0))st.clock=0;
  if(!st.need||typeof st.need!=='object')st.need={};
  if(!Array.isArray(st.log))st.log=[];
  if(st.cdUntil==null||!isFinite(+st.cdUntil))st.cdUntil=0;
  if(st.cur===undefined)st.cur=null;
  return st;
}
function econABLog(st,o){
  try{o.clock=Math.round((+st.clock||0)*10)/10;o.t=(typeof S!=='undefined'&&S&&S.time!=null)?Math.round(S.time*10)/10:0;st.log.push(o);
    while(st.log.length>ECON_AUTOBUILD_TUNE.logMax)st.log.shift();}catch(e){}
  try{if(typeof econEmit==='function')econEmit('econ:autobuild',o);}catch(e){}
}
function econABClass(type){
  try{if(typeof window!=='undefined'&&window.XW&&window.XW.bt&&typeof window.XW.bt.status==='function'){const r=window.XW.bt.status(type);if(r&&r.cls)return r.cls;}}catch(e){}
  return ECON_AB_CLASS_FALLBACK[type]||'C';
}
function econABYear(){try{if(typeof econYearSec==='function')return +econYearSec()||300;}catch(e){}return 300;}
function econABTreasury(){
  try{const X=typeof econXws==='function'?econXws():null;if(X)return +X.get('lingshi')||0;}catch(e){}
  try{if(typeof grTotal==='function'&&typeof grFormal==='function'&&grFormal())return grTotal();}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.vault&&typeof econBagXia==='function'&&typeof econFlag==='function'&&econFlag('treasury'))return econBagXia(S.econ.vault);}catch(e){}
  try{return Math.max(0,+(S.res&&S.res.lingshi)||0);}catch(e){return 0;}
}
function econABElders(){
  try{if(typeof econElderUnits==='function')return econElderUnits();}catch(e){}
  return [];
}
function econABLv(b){try{return (typeof blv==='function'?blv(b):(b&&b.lv))||1;}catch(e){return (b&&b.lv)||1;}}
function econABCanAffordRaw(cost){
  try{if(typeof canAfford==='function')return !!canAfford(cost);}catch(e){}
  for(const k in cost)if(((S.res&&S.res[k])||0)<cost[k])return false;return true;
}
// 金錢與材料規則；回傳 {ok,reason,...}
function econABMoneyCheck(cost){
  cost=cost||{};const TU=ECON_AUTOBUILD_TUNE;
  const tre=econABTreasury(),ls=Math.max(0,+cost.lingshi||0);
  const floor=Math.max(TU.floorXia,TU.floorFrac*tre);
  const o={tre:tre,ls:ls,floor:floor,max:TU.maxFrac*tre};
  if(ls>0&&ls>TU.maxFrac*tre+1e-9)return Object.assign(o,{ok:false,reason:'over30'});
  if(tre-ls<floor-1e-9)return Object.assign(o,{ok:false,reason:'floor'});
  const res=(typeof S!=='undefined'&&S&&S.res)||{};
  if((+cost.wood||0)>0&&((+res.wood||0)-(+cost.wood))<TU.keepWood)return Object.assign(o,{ok:false,reason:'wood'});
  if((+cost.stone||0)>0&&((+res.stone||0)-(+cost.stone))<TU.keepStone)return Object.assign(o,{ok:false,reason:'stone'});
  if(!econABCanAffordRaw(cost))return Object.assign(o,{ok:false,reason:'afford'});
  return Object.assign(o,{ok:true});
}
// ---- 需求偵測 ----
function econABNeeds(){
  const T=S,out=[];if(!T||!T.buildings)return out;
  // 1 弟子上限滿
  try{
    if(typeof popCap==='function'&&typeof popUsed==='function'){
      const cap=popCap(),used=popUsed();
      if(cap>0&&used>=cap)out.push({key:'pop',score:1+(used-cap)/Math.max(1,cap)+0.5,types:['house','hall']});
    }
  }catch(e){}
  // 2 練武／閉關名額滿而仍有閒置弟子
  try{
    const idle=econABIdleWorkers(null,99).length;
    for(const t of ['wudao','lianwu']){
      const bs=T.buildings.filter(b=>b&&b.type===t&&b.built&&!b.broken);if(!bs.length)continue;
      let slots=0;for(const b of bs){try{slots+=typeof jobSlots==='function'?jobSlots(b):((typeof BUILD!=='undefined'&&BUILD[t]&&BUILD[t].slots)||0);}catch(e){}}
      const ids=new Set(bs.map(b=>b.id));
      const occ=(T.units||[]).filter(u=>u&&!u.dead&&u.jobB!=null&&ids.has(u.jobB)).length;
      if(slots>0&&occ>=slots&&idle>0)out.push({key:'slot:'+t,score:1+Math.min(1,idle/Math.max(1,slots))*0.4,types:[t]});
    }
  }catch(e){}
  // 3 倉儲將滿
  try{
    if(typeof v53Cap==='function'){
      let worst=0,wk=null;
      const keys=(typeof RES_KEYS!=='undefined'?RES_KEYS:['wood','stone','fiber','food','iron','herb']).filter(k=>k!=='lingshi');
      for(const k of keys){const cap=+v53Cap(k)||0;if(!(cap>0))continue;const r=((T.res&&T.res[k])||0)/cap;if(r>worst){worst=r;wk=k;}}
      if(worst>=ECON_AUTOBUILD_TUNE.storeFrac){
        const types=['cangku'];try{if(typeof BUILD!=='undefined'&&BUILD.zongcang)types.push('zongcang');}catch(e){}
        out.push({key:'store',score:worst,res:wk,types:types});
      }
    }
  }catch(e){}
  out.sort((a,b)=>b.score-a.score||(a.key<b.key?-1:1));
  return out;
}
function econABIdleWorkers(site,n){
  const T=S;if(!T||!T.units)return [];
  const ex=u=>{try{if(typeof econIsAutoWorkExempt==='function')return econIsAutoWorkExempt(u);}catch(e){}return false;};
  const sa3=typeof econSaOn==='function'?econSaOn('sa3',T):true;
  const locked=u=>{
    if(!sa3)return false;
    try{if(typeof econSaManualLocked==='function')return !!econSaManualLocked(u);}catch(e){}
    return false;
  };
  let us=T.units.filter(u=>u&&!u.dead&&u.kind==='disciple'&&!u.np&&!(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))&&!u.inside&&!u.task&&(!u.job||u.job==='gather')&&!u.cultBrk&&!ex(u)&&!locked(u));
  if(sa3){
    us.sort((a,b)=>{
      const ia=a.job?1:0,ib=b.job?1:0;
      if(ia!==ib)return ia-ib;
      if(site){
        const da=Math.hypot((a.x||0)-site.x,(a.y||0)-site.y),db=Math.hypot((b.x||0)-site.x,(b.y||0)-site.y);
        if(da!==db)return da-db;
      }
      return (a.id||0)-(b.id||0);
    });
  }else if(site){
    us.sort((a,b)=>Math.hypot(a.x-site.x,a.y-site.y)-Math.hypot(b.x-site.x,b.y-site.y)||a.id-b.id);
  }
  return us.slice(0,n==null?ECON_AUTOBUILD_TUNE.workers:n);
}
// 工地外圈至少一格可走且與宗門同一連通區（弟子走得到）；沒有 comp／N（單元測試）時視為可達
function econABReach(type,i0,j0){
  try{
    if(typeof comp==='undefined'||typeof block==='undefined'||typeof N==='undefined'||typeof startComp==='undefined')return true;
    const s=BUILD[type].size||2;
    for(let j=j0-1;j<=j0+s;j++)for(let i=i0-1;i<=i0+s;i++){
      if(i>=i0&&i<i0+s&&j>=j0&&j<j0+s)continue;
      if(i<0||j<0||i>=N||j>=N)continue;
      const k=j*N+i;if(!block[k]&&comp[k]===startComp)return true;
    }
    return false;
  }catch(e){return true;}
}
function econABFindSpot(type){
  if(typeof BUILD==='undefined'||!BUILD[type]||typeof placementValid!=='function')return null;
  let c={x:0,y:0};try{if(typeof sectCenter==='function')c=sectCenter();}catch(e){}
  const s=BUILD[type].size||2,ci=Math.round(c.x-s/2),cj=Math.round(c.y-s/2);
  const gap=(i,j)=>{try{return typeof v46GapOk!=='function'||v46GapOk(type,i,j);}catch(e){return true;}};
  for(let r=2;r<=ECON_AUTOBUILD_TUNE.searchR;r++){
    for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){
      if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;
      const i=ci+di,j=cj+dj;
      try{if(placementValid(type,i,j)&&gap(i,j)&&econABReach(type,i,j))return {i:i,j:j};}catch(e){}
    }
  }
  return null;
}
// ---- 規劃：一個需求 → 一個動作（先升級再新建） ----
function econABPlanType(type){
  if(typeof BUILD==='undefined'||!BUILD[type])return {ok:false,reason:'no-type'};
  const cls=econABClass(type);
  const list=(S.buildings||[]).filter(b=>b&&b.type===type);
  if(list.some(b=>!b.built||b.upg))return {ok:false,reason:'in-progress'};
  const live=list.filter(b=>b.built&&!b.broken);
  let tgt=null;
  if(cls==='B'){
    for(const b of live){if(!tgt||econABLv(b)>econABLv(tgt))tgt=b;}
  }else{
    for(const b of live){if(!tgt||econABLv(b)<econABLv(tgt))tgt=b;}
  }
  let upWhy=null;
  if(tgt){
    let can={ok:econABLv(tgt)<(typeof LV_MAX==='number'?LV_MAX:3)};
    try{if(typeof econCanUpgrade==='function')can=econCanUpgrade(tgt);}catch(e){}
    if(can&&can.ok){
      let cost=null;try{cost=typeof upCost==='function'?upCost(tgt):null;}catch(e){}
      if(cost){const m=econABMoneyCheck(cost);if(m.ok)return {ok:true,kind:'upgrade',type:type,cls:cls,b:tgt,cost:cost,toLv:econABLv(tgt)+1,money:m};upWhy='money:'+m.reason;}
      else upWhy='no-cost';
    }else upWhy='cap:'+((can&&can.reason)||'');
  }
  if(cls==='B'&&list.length>=1)return {ok:false,reason:'b-one',up:upWhy};
  let lock=null;try{if(typeof buildLock==='function')lock=buildLock(type);}catch(e){}
  if(lock)return {ok:false,reason:'lock',lock:lock,up:upWhy};
  const cost=BUILD[type].cost||{};
  const m=econABMoneyCheck(cost);if(!m.ok)return {ok:false,reason:'money:'+m.reason,up:upWhy,money:m};
  const spot=econABFindSpot(type);if(!spot)return {ok:false,reason:'no-spot',up:upWhy};
  return {ok:true,kind:'build',type:type,cls:cls,spot:spot,cost:cost,money:m};
}
// ---- 執行（不跳提示給宗主） ----
function econABQuiet(fn){
  let usedY=false,oldToast=null;
  try{if(typeof Y197!=='undefined'&&Y197){Y197.quiet=(Y197.quiet||0)+1;usedY=true;}}catch(e){}
  if(!usedY){try{if(typeof toast==='function'){oldToast=toast;toast=function(){};}}catch(e){}}
  try{return fn();}
  finally{
    if(usedY){try{Y197.quiet=Math.max(0,(Y197.quiet||1)-1);}catch(e){}}
    if(oldToast){try{toast=oldToast;}catch(e){}}
  }
}
function econABWithSel(ids,fn){
  let had=false,prev=null;
  try{if(typeof selUnits!=='undefined'){had=true;prev=selUnits.slice();selUnits.length=0;for(const id of ids)selUnits.push(id);}}catch(e){}
  try{return fn();}finally{if(had){try{selUnits.length=0;for(const id of prev)selUnits.push(id);}catch(e){}}}
}
function econABAuto(fn){
  const sa3=typeof econSaOn==='function'?econSaOn('sa3'):true;
  if(!sa3)return fn();
  try{if(typeof econSaManualAuto==='function')return econSaManualAuto(fn);}catch(e){}
  return fn();
}
function econABExec(plan){
  const T=S;
  if(plan.kind==='upgrade'){
    const b=plan.b,site={x:b.i+1,y:b.j+1};
    const ws=econABIdleWorkers(site);if(!ws.length)return {ok:false,reason:'no-worker'};
    const r=econABAuto(()=>econABWithSel(ws.map(u=>u.id),()=>econABQuiet(()=>{try{return startUpgrade(b);}catch(e){return false;}})));
    if(!r||!b.upg)return {ok:false,reason:'start-fail'};
    return {ok:true,bid:b.id,workers:ws.map(u=>u.id)};
  }
  if(plan.kind==='build'){
    if(typeof buildMode!=='undefined'&&buildMode)return {ok:false,reason:'player-build-mode'};
    const site={x:plan.spot.i+1,y:plan.spot.j+1};
    const ws=econABIdleWorkers(site);if(!ws.length)return {ok:false,reason:'no-worker'};
    const n0=T.buildings.length;
    let usedForce=false,oldGO=null;
    try{if(typeof Y197!=='undefined'&&Y197){Y197.force={i:plan.spot.i,j:plan.spot.j};usedForce=true;}}catch(e){}
    if(!usedForce){try{oldGO=ghostOrigin;ghostOrigin=function(){return {i:plan.spot.i,j:plan.spot.j};};}catch(e){}}
    try{
      buildMode=plan.type;
      econABAuto(()=>econABWithSel(ws.map(u=>u.id),()=>econABQuiet(()=>{try{tryPlace(false);}catch(e){try{console.warn('econAutobuild place',e);}catch(e2){}}})));
    }finally{
      try{buildMode=null;}catch(e){}
      if(usedForce){try{Y197.force=null;}catch(e){}}
      if(oldGO){try{ghostOrigin=oldGO;}catch(e){}}
    }
    const nb=T.buildings.length>n0?T.buildings[T.buildings.length-1]:null;
    if(!nb||nb.type!==plan.type)return {ok:false,reason:'place-fail'};
    // 保險：施工者確實派到（tryPlace 以 selUnits 派工）
    for(const u of ws){if(!u.task||u.task.bid!==nb.id){try{econABAuto(()=>setTask(u,{type:'build',bid:nb.id}));}catch(e){}}}
    return {ok:true,bid:nb.id,workers:ws.map(u=>u.id)};
  }
  return {ok:false,reason:'bad-plan'};
}
function econABCurDone(st){
  const c=st.cur;if(!c)return null;
  const b=(S.buildings||[]).find(x=>x&&x.id===c.bid);
  if(!b)return 'gone';
  if(c.kind==='build'&&b.built)return 'done';
  if(c.kind==='upgrade'&&!b.upg&&econABLv(b)>=c.toLv)return 'done';
  if(c.kind==='upgrade'&&!b.upg&&econABLv(b)<c.toLv)return 'cancel';
  return null;
}
function econABRedispatch(st){
  const c=st.cur;if(!c)return;
  if((st.clock-(+c.lastDisp||c.at||0))<ECON_AUTOBUILD_TUNE.redispatchSec)return;
  c.lastDisp=st.clock;
  const busy=(S.units||[]).some(u=>u&&!u.dead&&u.task&&u.task.type==='build'&&u.task.bid===c.bid);
  if(busy)return;
  const b=(S.buildings||[]).find(x=>x&&x.id===c.bid);if(!b)return;
  const ws=econABIdleWorkers({x:b.i+1,y:b.j+1});
  for(const u of ws){try{econABAuto(()=>setTask(u,{type:'build',bid:b.id}));}catch(e){}}
}
var ECON_AB_RT={acc:0,last:null,wrapped:0,lastT:null}; // 執行期（不存檔）
function econAutobuildTick(dt){
  dt=+dt||0;if(!(dt>0))return;
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ||!T.buildings)return;
  if(T.time!=null&&ECON_AB_RT.lastT===T.time&&ECON_AB_RT.lastS===T)return; // 同一幀只算一次
  ECON_AB_RT.lastT=T.time;ECON_AB_RT.lastS=T;
  if(!econAutobuildOn(T))return;
  if(econABClient())return;
  if(T.dg)return; // 副本內不動
  const st=econABState(T);if(!st)return;
  // 已在進行的工程照常檢查完成（不受長老在否影響）
  const d=econABCurDone(st);
  if(d){econABLog(st,{ev:d,kind:st.cur.kind,type:st.cur.type,bid:st.cur.bid});st.cur=null;st.cdUntil=(+st.clock||0)+econABYear();}
  const elders=econABElders();
  if(!elders.length){if(!st.paused){st.paused=1;st.need={};econABLog(st,{ev:'pause',why:'no-elder'});}return;}
  if(st.paused){st.paused=0;econABLog(st,{ev:'resume'});}
  st.clock=(+st.clock||0)+dt;
  ECON_AB_RT.acc+=dt;if(ECON_AB_RT.acc<ECON_AUTOBUILD_TUNE.evalEvery)return;ECON_AB_RT.acc=0;
  return econAutobuildEval(st,elders);
}
function econAutobuildEval(st,elders){
  st=st||econABState();if(!st)return null;
  const needs=econABNeeds();const seen={};
  for(const n of needs){seen[n.key]=1;if(st.need[n.key]==null)st.need[n.key]=st.clock;}
  for(const k in st.need)if(!seen[k])delete st.need[k];
  if(st.cur){econABRedispatch(st);ECON_AB_RT.last={wait:'busy'};return ECON_AB_RT.last;}
  if(st.clock<(+st.cdUntil||0)){ECON_AB_RT.last={wait:'cooldown',left:st.cdUntil-st.clock};return ECON_AB_RT.last;}
  const ripe=needs.filter(n=>st.clock-st.need[n.key]>=ECON_AUTOBUILD_TUNE.needSec-1e-9);
  if(!ripe.length){ECON_AB_RT.last={wait:'need',needs:needs.map(n=>n.key)};return ECON_AB_RT.last;}
  const tried=[];
  for(const n of ripe){
    for(const type of n.types){
      const plan=econABPlanType(type);
      tried.push({need:n.key,type:type,ok:plan.ok,reason:plan.reason,up:plan.up});
      if(!plan.ok)continue;
      const r=econABExec(plan);
      if(!r.ok){tried[tried.length-1].exec=r.reason;continue;}
      const el=elders&&elders[0];
      st.cur={kind:plan.kind,type:type,bid:r.bid,toLv:plan.kind==='upgrade'?plan.toLv:1,at:st.clock,need:n.key,elder:el?el.id:null,cost:plan.cost};
      delete st.need[n.key];
      econABLog(st,{ev:'start',kind:plan.kind,type:type,bid:r.bid,toLv:st.cur.toLv,need:n.key,elder:st.cur.elder,cost:plan.cost,workers:r.workers});
      ECON_AB_RT.last={started:st.cur,tried:tried};return ECON_AB_RT.last;
    }
  }
  ECON_AB_RT.last={wait:'blocked',tried:tried};return ECON_AB_RT.last;
}
function econAutobuildInstall(){
  try{
    // 模組層旗標：之後別的模組再包 update 會蓋掉函式屬性，不能用 update._econAB 判斷（否則 setTimeout 重跑會重複包＝一幀跑兩次）
    if(typeof update==='function'&&!ECON_AB_RT.wrapped){
      const _u=update;
      update=function(dt){const r=_u.apply(this,arguments);try{econAutobuildTick(dt);}catch(e){}return r;};
      update._econAB=1;ECON_AB_RT.wrapped=1;
    }
  }catch(e){}
  try{
    if(typeof window!=='undefined'&&window.XW_ECON){
      const A=window.XW_ECON;
      A.autobuild={on:econAutobuildOn,tick:econAutobuildTick,eval:econAutobuildEval,state:econABState,needs:econABNeeds,
        plan:econABPlanType,money:econABMoneyCheck,cls:econABClass,treasury:econABTreasury,TUNE:ECON_AUTOBUILD_TUNE,rt:ECON_AB_RT,DEFAULT:ECON_AUTOBUILD_DEFAULT,idleWorkers:econABIdleWorkers,sa3On:function(T){return typeof econSaOn==='function'?econSaOn('sa3',T):true;}};
    }
  }catch(e){}
}
econAutobuildInstall();
try{if(typeof setTimeout==='function'){setTimeout(econAutobuildInstall,0);setTimeout(econAutobuildInstall,300);}}catch(e){}
