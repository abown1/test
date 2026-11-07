// ================== BACKLOG #15／回饋 #49：框選快速移動至石碑 ==================
// 選取的人（玩家／弟子同規則）走到最近已發現石碑 → 全員到齊後傳送到目的石碑；可取消。
// 煉氣（MAP_TUNE.steleTp.costRealm）以上每人耗靈石；以下免費。聯機 client 不扣費、不傳送。
// 沿用既有 shrines()／shrFound()／xnLand()／xnPut()，不改原本石碑面板的單人傳送（仍免費）。
var MAP_STP={run:null,n:0,paid:0,cancel:0,ui:null};
function mapStpCfg(){const T=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.steleTp)||{};
  return {costRealm:T.costRealm!=null?T.costRealm:4,costPerUnit:T.costPerUnit!=null?T.costPerUnit:5,arriveR:T.arriveR||2.2,timeoutSec:T.timeoutSec||90,tickMs:T.tickMs||300};}
// 純函式：費用
function mapStpCost(units,C){C=C||mapStpCfg();let n=0;for(const u of units||[])if(u&&!u.dead&&(u.realm|0)>=C.costRealm)n++;return n*C.costPerUnit;}
function mapStpClient(){try{return typeof NET!=='undefined'&&NET&&NET.role==='client';}catch(e){return false;}}
function mapStpSel(){try{return (selUnits||[]).map(unitById).filter(u=>u&&!u.dead&&!u.inside&&(u.kind==='player'||u.kind==='disciple')&&!(typeof netOtherPc==='function'&&netOtherPc(u)));}catch(e){return [];}}
function mapStpNearest(units){const L=shrines().filter(shrFound);if(!L.length||!units.length)return null;let cx=0,cy=0;for(const u of units){cx+=u.x;cy+=u.y;}cx/=units.length;cy/=units.length;
  let b=null,bd=1e9;for(const s of L){const d=dist(cx,cy,s.x,s.y);if(d<bd){bd=d;b=s;}}return b;}
function mapStpStart(toId,units){
  if(mapStpClient()){try{toast('聯機成員請走到石碑後用石碑面板傳送');}catch(e){}return {ok:false,why:'client'};}
  if(S.dg||S.interior)return {ok:false,why:'scene'};
  units=units||mapStpSel();if(!units.length)return {ok:false,why:'nosel'};
  const to=shrineById(toId);if(!to||!shrFound(to))return {ok:false,why:'dest'};
  const from=mapStpNearest(units);if(!from)return {ok:false,why:'nofrom'};
  const C=mapStpCfg(),cost=mapStpCost(units,C);
  if(cost>0&&(S.res.lingshi||0)<cost){try{toast(`靈石不足：需要 ${cost}`);}catch(e){}return {ok:false,why:'ls',cost};}
  MAP_STP.run={ids:units.map(u=>u.id),from:from.id,to:to.id,t0:S.time,cost};
  for(const u of units){const f=nearestFree(from.x+0.6,from.y+0.6,startComp)||{i:Math.floor(from.x),j:Math.floor(from.y)};try{commandMove([u],f.i+0.5,f.j+0.5,false);}catch(e){}}
  try{toast(`前往「${from.short||from.name}」石碑，到齊後傳送至「${to.short||to.name}」${cost?`（耗靈石 ${cost}）`:''}`);}catch(e){}
  mapStpUi();return {ok:true,from:from.id,to:to.id,cost};}
function mapStpCancel(msg){if(!MAP_STP.run)return false;for(const id of MAP_STP.run.ids){const u=unitById(id);if(u&&u.task&&u.task.type==='move'){u.task=null;u.path=[];}}
  MAP_STP.run=null;MAP_STP.cancel++;try{toast(msg||'已取消快速移動');}catch(e){}mapStpUi();return true;}
function mapStpArrive(){const R=MAP_STP.run;const from=shrineById(R.from),to=shrineById(R.to),C=mapStpCfg();
  const us=R.ids.map(unitById).filter(u=>u&&!u.dead&&!u.inside);if(!us.length)return mapStpCancel('隊伍已無人，取消傳送');
  const cost=mapStpCost(us,C);if(cost>0&&(S.res.lingshi||0)<cost)return mapStpCancel(`靈石不足（需要 ${cost}），取消傳送`);
  S.res.lingshi=(S.res.lingshi||0)-cost;MAP_STP.paid+=cost;
  const p=player();
  for(const u of us){try{fx('ring',u.x,u.y,'#8fe8ff');}catch(e){}}
  if(typeof mapSafeLandGroup==='function')mapSafeLandGroup(us,to.x+0.5,to.y+1.5,{comp:startComp});
  else for(const u of us){const f=xnLand(to.x+0.5,to.y+1.5,u,{comp:startComp,r:8});xnPut(u,f,u===p);}
  for(const u of us){u.task=null;u.path=[];if(u.queue)u.queue.length=0;}
  try{reveal(to.x,to.y,10);mmDirty=true;}catch(e){}
  MAP_STP.run=null;MAP_STP.n++;S.stats.travels=(S.stats.travels||0)+1;
  try{toast(`${us.length} 人傳送至「${to.name}」${cost?`，耗靈石 ${cost}`:''}`);}catch(e){}mapStpUi();return true;}
function mapStpTick(){const R=MAP_STP.run;if(!R)return;if(S.dg||S.interior)return mapStpCancel('進入場景，取消快速移動');
  if(S.time-R.t0>mapStpCfg().timeoutSec)return mapStpCancel('太久未到齊，取消快速移動');
  const from=shrineById(R.from),C=mapStpCfg();const us=R.ids.map(unitById).filter(u=>u&&!u.dead);
  if(us.every(u=>dist(u.x,u.y,from.x,from.y)<C.arriveR))mapStpArrive();}
function mapStpUi(){if(typeof document==='undefined')return;let el=document.getElementById('mapstp');
  // Destination controls belong to the expanded map, never the persistent world HUD.
  if(typeof mmBig==='undefined'||!mmBig){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='mapstp';el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:86px;z-index:40;background:#14110cee;border:1px solid #c9a35a;border-radius:8px;padding:6px 8px;color:#f3e3c0;font-size:13px;max-width:92vw;display:none';
    el.addEventListener('click',ev=>{if(typeof mmBig==='undefined'||!mmBig)return;const b=ev.target.closest('[data-stp]');if(!b)return;ev.stopPropagation();const a=b.dataset.stp;
      if(a==='cancel')mapStpCancel();else if(a==='go'){MAP_STP.pick=false;mapStpStart(+b.dataset.id);}});
    document.body.appendChild(el);}
  const sel=mapStpSel(),R=MAP_STP.run;let h='';
  if(R){const to=shrineById(R.to);h=`🪨 前往石碑後傳送至「${esc(to?to.short||to.name:'')}」 <button class="btn" data-stp="cancel">取消</button>`;}
  else if(sel.length&&!S.dg&&!S.interior&&!mapStpClient()){const cost=mapStpCost(sel);
    h=`<div class="hint">🪨 快速移動至石碑（${sel.length} 人${cost?`・耗靈石 ${cost}`:'・免費'}）</div>`;
    {const L=shrines().filter(shrFound);h+='<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">'+L.map(s=>`<button class="btn" data-stp="go" data-id="${s.id}">${esc(s.short||s.name)}</button>`).join('')+'</div>';}}
  const k=h+'|'+sel.length;if(el._k!==k){el._k=k;el.innerHTML=h;}el.style.display=h?'block':'none';}
(function mapStpBoot(n){
  if(typeof shrines!=='function'||typeof xnLand!=='function'||typeof document==='undefined'||!document.body){if((n|0)<200&&typeof setTimeout==='function')setTimeout(()=>mapStpBoot((n|0)+1),50);return;}
  const api={st:MAP_STP,start:mapStpStart,cancel:mapStpCancel,cost:mapStpCost};
  setInterval(()=>{try{if(window.XWMAP&&!window.XWMAP.stp)window.XWMAP.stp=api;if(typeof S!=='undefined'&&S){mapStpTick();mapStpUi();}}catch(e){}},mapStpCfg().tickMs);
})(0);
