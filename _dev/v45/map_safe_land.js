// ================== B-38：通用安全落點（石碑面板傳送／框選快速移動）==================
// 不動仙凡之門門口落點（map_special／mapXfPlaceAtDoor）。
// B-38 階段修正：全員預排成功才進原傳送／扣款流程；容量不足不降為重疊。
var MAP_SAFE_POLICY={maxWallNeighbors:8,wallWeight:0.3,repeatMs:750,bootMs:50,bootTries:200,apiMs:500};
function mapSafeLandCfg(){const T=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.safeLand)||{};
  return {r:T.r||8,maxR:T.maxR||14,minSep:T.minSep!=null?T.minSep:0.9,wallNbStrict:T.wallNbStrict!=null?T.wallNbStrict:0,wallNbLoose:T.wallNbLoose!=null?T.wallNbLoose:3};}
// 純函式：env={n, walk(i,j)->bool, comp(i,j)->id}；taken=[{x,y}]；回傳 {i,j,x,y,tier} 或 null
function mapSafeLandPick(env,x,y,taken,o){o=o||{};const C=Object.assign(mapSafeLandCfg(),o.cfg||{});taken=taken||[];
  const ok=(i,j)=>i>=0&&j>=0&&i<env.n&&j<env.n&&env.walk(i,j);
  const wallNb=(i,j)=>{let k=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;if(!ok(i+a,j+b))k++;}return k;};
  let comp0=o.comp;if(comp0==null&&env.comp){const i0=Math.floor(x),j0=Math.floor(y);if(ok(i0,j0))comp0=env.comp(i0,j0);}
  const tiers=[[C.r,C.wallNbStrict,C.minSep],[C.maxR,C.wallNbStrict,C.minSep],[C.maxR,C.wallNbLoose,C.minSep],[C.maxR,MAP_SAFE_POLICY.maxWallNeighbors,C.minSep]];
  for(let t=0;t<tiers.length;t++){const [R,wl,sep]=tiers[t];let best=null,bs=1e9;const i0=Math.floor(x),j0=Math.floor(y);
    for(let j=j0-R;j<=j0+R;j++)for(let i=i0-R;i<=i0+R;i++){if(!ok(i,j))continue;if(comp0!=null&&comp0>=0&&env.comp&&env.comp(i,j)!==comp0)continue;
      const cx=i+0.5,cy=j+0.5,d=Math.hypot(cx-x,cy-y);if(d>R)continue;const w=wallNb(i,j);if(w>wl)continue;
      if(sep>0&&taken.some(q=>Math.hypot(q.x-cx,q.y-cy)<sep))continue;const sc=d+MAP_SAFE_POLICY.wallWeight*w;if(sc<bs){bs=sc;best={i,j,x:cx,y:cy,tier:t};}}
    if(best)return best;}
  return null;}
function mapSafeLandEnv(){const dg=(typeof S!=='undefined'&&S&&S.dg&&S.dg.L&&S.dg.L.fl)?S.dg.L.fl:null;
  return {n:N,walk:(i,j)=>{const k=j*N+i;return !block[k]&&(!dg||dg[k]===1);},comp:(i,j)=>comp[j*N+i]};}
// 純規劃，不改單位／任務／資源；無法容納全員時回 null。
function mapSafeLandPlan(units,x,y,o){
  o=o||{};if(!Array.isArray(units)||!units.length||new Set(units).size!==units.length)return null;
  const env=mapSafeLandEnv(),set=new Set(units);
  const taken=(S.units||[]).filter(u=>u&&!u.dead&&!u.inside&&!set.has(u)).map(u=>({x:u.x,y:u.y}));
  const out=[];
  for(const u of units){if(!u||u.dead||u.inside)return null;
    const f=mapSafeLandPick(env,x,y,taken,{comp:o.comp});if(!f)return null;
    out.push({u,f});taken.push({x:f.x,y:f.y});}
  return out;
}
function mapSafeLandCommit(plan,o){
  if(!plan||!plan.length)return [];o=o||{};
  const out=[];
  for(const q of plan){const u=q.u,f=q.f;u.x=f.x;u.y=f.y;u.path=[];u.vx=u.vy=0;u.dvx=u.dvy=0;
    out.push({id:u.id,x:f.x,y:f.y,tier:f.tier});}
  try{const p=player();if(o.cam!==false&&plan.some(q=>q.u===p)){const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}}catch(e){}
  MAP_SAFE_LAND.last=out;MAP_SAFE_LAND.n+=out.length;return out;
}
function mapSafeLandGroup(units,x,y,o){
  const ctx=MAP_SAFE_LAND.prepared;
  // 快速移動原函式已扣款時只能提交事先保留的完整計畫，不重新搜尋。
  const same=ctx&&ctx.x===x&&ctx.y===y&&ctx.plan.length===units.length&&ctx.plan.every(q=>units.includes(q.u));
  const plan=same?ctx.plan:mapSafeLandPlan(units,x,y,o);
  if(!plan){MAP_SAFE_LAND.failed++;return [];}
  return mapSafeLandCommit(plan,o);
}
var MAP_SAFE_LAND={n:0,last:[],wrapped:0,failed:0,prepared:null};
var MAP_SAFE_RECENT=new WeakMap(),MAP_SAFE_RUNS=new WeakSet();
function mapSafeLandUnits(p){
  // 沿用原 shrineTravel 的隨行名單（原程式確實搬所有有效 follow 弟子）。
  return [p].concat(disciples().filter(d=>d!==p&&d.job==='follow'&&!d.dead&&!d.inside));
}
function mapSafeLandPreflight(us,to,cam1){
  if(!to)return null;
  const plan=mapSafeLandPlan(us,to.x+0.5,to.y+1.5,{comp:startComp});
  return plan?{plan,x:to.x+0.5,y:to.y+1.5,cam:cam1}:null;
}
function mapSafeLandRepeat(p,to){
  const q=MAP_SAFE_RECENT.get(p);
  return !!(q&&q.to===to.id&&Date.now()-q.at<MAP_SAFE_POLICY.repeatMs&&q.x===p.x&&q.y===p.y);
}
function mapSafeLandRemember(p,to){MAP_SAFE_RECENT.set(p,{to:to.id,at:Date.now(),x:p.x,y:p.y});}
function mapSafeLandRefuse(){MAP_SAFE_LAND.failed++;try{toast('附近沒有足夠安全落點，已取消傳送（未扣費）');}catch(e){}return false;}
// 僅保存本次傳送會改的欄位，不複製／回滾整個 S；例外仍向呼叫者拋出。
var MAP_SAFE_UNIT_KEYS=['x','y','vx','vy','dvx','dvy','path','task','queue','shrineGoal'];
function mapSafeLandCurrencyConflict(stage,reason,token){
  const row={stage,reason:String(reason||'unknown'),expectedDebit:token&&token.debit};
  MAP_SAFE_LAND.currencyConflict=row;MAP_SAFE_LAND.currencyConflicts=(MAP_SAFE_LAND.currencyConflicts||0)+1;
  try{console.error('safeLand currency conflict',row);}catch(e){}
  try{toast(stage==='capture'?'帳務資料無法驗證，已取消傳送；請保留存檔並回報。':'傳送未完成，帳務狀態需核對（可能已扣費）；請勿重複操作，保留存檔並回報。');}catch(e){}
}
function mapSafeLandTransaction(ctx,fn,quick){
  const E=typeof window!=='undefined'&&window.XW_ECON;
  // 任一 v2 入口存在即不可當成舊版 fallback；缺口／capture 失敗必須 fail closed。
  const currencyApi=!!(E&&(typeof E.captureCurrencySnapshot==='function'||typeof E.restoreCurrencySnapshot==='function'||typeof E.commitCurrencySnapshot==='function'));
  let currencyToken=null,currencyAttempted=false,currencyRestored=false;
  if(currencyApi){
    if(typeof E.captureCurrencySnapshot!=='function'||typeof E.restoreCurrencySnapshot!=='function'||typeof E.commitCurrencySnapshot!=='function'){
      mapSafeLandCurrencyConflict('capture','incomplete-currency-api');if(quick)MAP_STP.run=null;return false;}
    const expectedDebit=quick?mapStpCost(ctx.plan.map(q=>q.u)):0;
    try{currencyToken=E.captureCurrencySnapshot('vault',{expectedDebit});}
    catch(e){mapSafeLandCurrencyConflict('capture',e.message);if(quick)MAP_STP.run=null;throw e;}
    if(!currencyToken){mapSafeLandCurrencyConflict('capture','capture-returned-null');if(quick)MAP_STP.run=null;return false;}
  }
  const rows=ctx.plan.map(q=>{const u=q.u,fields={};for(const k of MAP_SAFE_UNIT_KEYS){
    fields[k]={has:Object.prototype.hasOwnProperty.call(u,k),value:u[k],items:Array.isArray(u[k])?u[k].slice():null};}
    return {u,fields};});
  const res=S.res,stats=S.stats,ls=res&&res.lingshi,lsHas=res&&Object.prototype.hasOwnProperty.call(res,'lingshi');
  const travel=stats&&stats.travels,travelHas=stats&&Object.prototype.hasOwnProperty.call(stats,'travels');
  const camera={x:cam.x,y:cam.y,follow:cam.follow};
  const safe={n:MAP_SAFE_LAND.n,last:MAP_SAFE_LAND.last,wrapped:MAP_SAFE_LAND.wrapped,net:MAP_SAFE_LAND.net};
  const qs=quick?{n:MAP_STP.n,paid:MAP_STP.paid}:null;
  function undo(){
    // 先交貨幣契約判斷交易／ledger／identity；拒還原時保留付款及獨立收入。
    if(currencyApi&&!currencyAttempted){currencyAttempted=true;
      if(currencyToken.used){mapSafeLandCurrencyConflict('restore','token-already-used',currencyToken);}
      else try{currencyRestored=!!E.restoreCurrencySnapshot(currencyToken);
        if(!currencyRestored)mapSafeLandCurrencyConflict('restore',currencyToken.conflict||'restore-returned-false',currencyToken);
      }catch(e){mapSafeLandCurrencyConflict('restore',e.message,currencyToken);}
    }
    for(const row of rows)for(const k of MAP_SAFE_UNIT_KEYS){const v=row.fields[k];
      if(!v.has){delete row.u[k];continue;}
      if(v.items){v.value.length=0;for(const item of v.items)v.value.push(item);}
      row.u[k]=v.value;}
    if(!currencyApi&&res){if(lsHas)res.lingshi=ls;else delete res.lingshi;}
    if(stats){if(travelHas)stats.travels=travel;else delete stats.travels;}
    cam.x=camera.x;cam.y=camera.y;cam.follow=camera.follow;
    Object.assign(MAP_SAFE_LAND,safe);
    if(qs){MAP_STP.n=qs.n;
      // restore 被拒時付款已保留，paid 計數不能假裝退款成功。
      if(!currencyApi||currencyRestored)MAP_STP.paid=qs.paid;
      MAP_STP.run=null;}
    return !currencyApi||currencyRestored;
  }
  try{const r=fn();
    if(r===false){if(!undo())throw new Error('currency rollback conflict: '+(currencyToken.conflict||'restore failed'));}
    else if(currencyApi){
      let committed=false;try{committed=!!E.commitCurrencySnapshot(currencyToken);}catch(e){mapSafeLandCurrencyConflict('commit',e.message,currencyToken);throw e;}
      if(!committed){mapSafeLandCurrencyConflict('commit','commit-returned-false',currencyToken);throw new Error('currency commit conflict');}
    }
    return r;}
  catch(e){undo();MAP_SAFE_LAND.errors=(MAP_SAFE_LAND.errors||0)+1;throw e;}
}
function mapSafeLandWrapQuick(){
  if(typeof mapStpStart==='function'&&!mapStpStart._mapSafe){const f=mapStpStart;
    mapStpStart=function(toId,units){
      if(mapStpClient())return f.apply(this,arguments);
      if(MAP_STP.run)return {ok:false,why:'pending'};
      const us=units||mapStpSel(),to=shrineById(toId);
      if(to&&us.length&&us.every(u=>mapSafeLandRepeat(u,to)))return {ok:false,why:'repeat'};
      if(to&&shrFound(to)&&us.length&&!mapSafeLandPreflight(us,to,true)){
        mapSafeLandRefuse();return {ok:false,why:'safe_land'};}
      return f.apply(this,arguments);
    };mapStpStart._mapSafe=1;
  }
  if(typeof mapStpArrive==='function'&&!mapStpArrive._mapSafe){const f=mapStpArrive;
    mapStpArrive=function(){
      const R=MAP_STP.run;if(!R)return false;
      if(MAP_SAFE_RUNS.has(R)){MAP_STP.run=null;return false;}
      if(mapStpClient())return false;
      const us=R.ids.map(unitById).filter(u=>u&&!u.dead&&!u.inside),to=shrineById(R.to);
      const ctx=mapSafeLandPreflight(us,to,true);
      MAP_SAFE_RUNS.add(R);
      if(!ctx){MAP_STP.run=null;try{mapStpUi();}catch(e){}return mapSafeLandRefuse();}
      const prev=MAP_SAFE_LAND.prepared;MAP_SAFE_LAND.prepared=ctx;
      try{return mapSafeLandTransaction(ctx,()=>{const r=f.apply(this,arguments);if(r&&MAP_STP.run===null)for(const u of us)mapSafeLandRemember(u,to);return r;},true);}finally{MAP_SAFE_LAND.prepared=prev;}
    };mapStpArrive._mapSafe=1;
  }
}
(function mapSafeLandBoot(k){
  // 必須延後到 g23／net18 同步包裝完成後才攔截。
  if(!k||typeof shrineTravel!=='function'||typeof xnLand!=='function'){
    if((k|0)<MAP_SAFE_POLICY.bootTries&&typeof setTimeout==='function')setTimeout(()=>mapSafeLandBoot((k|0)+1),MAP_SAFE_POLICY.bootMs);return;}
  if(shrineTravel._mapSafe)return;const _t=shrineTravel;
  shrineTravel=function(to){
    if((typeof NET!=='undefined'&&NET&&NET.role==='client')||S.dg||!to)return _t.apply(this,arguments);
    const p=player();if(!p||p.dead||!shrFound(to))return false;
    if(mapSafeLandRepeat(p,to))return false;
    const ctx=mapSafeLandPreflight(mapSafeLandUnits(p),to,true);if(!ctx)return mapSafeLandRefuse();
    return mapSafeLandTransaction(ctx,()=>{const r=_t.apply(this,arguments);if(!r)return r;
      mapSafeLandCommit(ctx.plan);MAP_SAFE_LAND.wrapped++;mapSafeLandRemember(p,to);return r;});
  };shrineTravel._mapSafe=1;
  // 保留 a174 的 host 成員介面，但把找點前移到原 run（驗證／搬人）之前。
  try{if(typeof NET_FWD!=='undefined'&&NET_FWD.shrineTravel&&!NET_FWD.shrineTravel.o._mapSafe){
    const E=NET_FWD.shrineTravel.o,_run=E.run;
    E.run=function(pk,a,args){
      const to=args&&shrineById(args[0]);if(!a||!to||S.dg)return false;
      if(mapSafeLandRepeat(a,to))return false;
      const ctx=mapSafeLandPreflight(mapSafeLandUnits(a),to,false);if(!ctx)return mapSafeLandRefuse();
      return mapSafeLandTransaction(ctx,()=>{const r=_run.apply(this,arguments);if(!r)return r;
        mapSafeLandCommit(ctx.plan,{cam:false});MAP_SAFE_LAND.net=(MAP_SAFE_LAND.net||0)+1;mapSafeLandRemember(a,to);return r;});
    };E._mapSafe=1;
  }}catch(e){console.warn('safeLand net install',e);}
  mapSafeLandWrapQuick();
  try{if(window.XW&&window.XW.xn&&window.XW.xn.tp)window.XW.xn.tp.go=id=>shrineTravel(shrines().find(s=>s.id===id));}catch(e){}
  const api={st:MAP_SAFE_LAND,pick:mapSafeLandPick,group:mapSafeLandGroup,plan:mapSafeLandPlan};
  setInterval(()=>{try{if(window.XWMAP){if(window.XWMAP.safeLand!==api)window.XWMAP.safeLand=api;
    if(window.XWMAP.stp)window.XWMAP.stp.start=mapStpStart;}}catch(e){}},MAP_SAFE_POLICY.apiMs);
})(0);
