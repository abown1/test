// ===== net11：遠端玩家角色的離線狀態（#167）＋寶座佔用同步（#169） =====
// 規則（#167）：角色的主人不在線（斷線中、名額已釋出、或房主單機重開世界）→ 角色留在世界、標記離線：
//  - 修為（所有走 gainXiu 的來源：打坐、閉關、醍醐灌頂…）以 NET_TUNE.offlineRate 計；
//  - 每次離線最多前進一個小階段（從斷線當下的 境界／小階段 起算）；狀態存在角色上（u.netOff），存檔／重開房都不重置；
//  - 不得佔用寶座、不享大殿閉關倍率；主人重新連線 → 立刻恢復全速、清掉離線狀態。
const NET_TUNE={offlineRate:0.3,offlineSubCap:1};
// 離線狀態要進存檔（重開房不重置上限）
if(typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)&&!UNIT_KEEP.includes('netOff'))UNIT_KEEP.push('netOff');
if(typeof NET_LIVE_U!=='undefined'&&!NET_LIVE_U.includes('netOff'))NET_LIVE_U.push('netOff'); // v0.4.7：成員畫面上的「離線修煉中」即時更新（g20 drawHuman 讀 u.netOff）
function netLv(u){return (u.realm|0)*100+(u.sub|0);}
// 主人不在線？（成員端不模擬，一律 false）
function netIsOff(u){if(!u||!u.np||NET.role==='client')return false;if(u.np===NET.pkey)return false;
  const p=NET.role==='host'?NET.players.get(u.np):null;return !(p&&p.online);}
function netOffMark(u){const off=netIsOff(u);
  if(off&&!u.netOff){u.netOff={t:S.time,lv:netLv(u),at:Date.now()};}
  else if(!off&&u.netOff&&NET.role==='host'){u.netOff=null;}
  return off;}
function netOffScan(){const L=S.units.concat(typeof netParkUnits==='function'?netParkUnits():[],S.dg&&S.dg.W&&S.dg.W.units||[]);
  for(const u of L)if(u&&u.np){const was=!!u.netOff;const off=netOffMark(u);if(off&&!was)netOffRelease(u);}}
{const _x=gainXiu;gainXiu=function(u,amt){if(u&&u.np&&amt>0&&netOffMark(u)){
    if(netLv(u)>=u.netOff.lv+NET_TUNE.offlineSubCap)return;amt*=NET_TUNE.offlineRate;}
  return _x.call(this,u,amt);};}
// 每秒掃一次（房主或單機）：斷線的角色標上離線、放開寶座
{let acc=0;const _x=update;update=function(dt){const r=_x.apply(this,arguments);if(NET.role!=='client'&&S){acc+=dt||0;if(acc>=1){acc=0;try{netOffScan();}catch(e){}}}return r;};}
// ---- 寶座：離線角色不能坐、坐著的人離線 → 起身 ----
function netOffRelease(u){try{if(typeof v165StandHost==='function'&&u.v165!=null)v165StandHost(u);}catch(e){}
  try{if(typeof throneRelease==='function')throneRelease(u);}catch(e){}}
if(typeof v165Holder==='function'){const _x=v165Holder;v165Holder=function(b){const h=_x.apply(this,arguments);if(h&&h.np&&netIsOff(h)){netOffRelease(h);return null;}return h;};}
if(typeof v165SitHost==='function'){const _x=v165SitHost;v165SitHost=function(u,b){if(u&&netIsOff(u))return 'no';return _x.apply(this,arguments);};}
if(typeof throneOccupant==='function'){const _x=throneOccupant;throneOccupant=function(){const h=_x.apply(this,arguments);const u=h&&unitById(h.id);if(u&&u.np&&netIsOff(u)){netOffRelease(u);return null;}return h;};}
// 大殿閉關倍率（v62Loc 的 hall）：離線角色不享
if(typeof v62Loc==='function'){const _x=v62Loc;v62Loc=function(u){const o=_x.apply(this,arguments);if(o&&u&&u.np&&netIsOff(u))o.hall=1;return o;};}
// ---- #169 寶座／蒲團：房主權威的座位預約（只在聯機時；owner g20 的 v169Seats／throneOccupant 不在就整段不動）----
const NET169=typeof v169Seats==='function'&&typeof v165SitHost==='function'&&typeof roomSt==='function';
if(NET169){
  if(!NET_LIVE_U.includes('v165'))NET_LIVE_U.push('v165');
  // 誰算「玩家角色」：房主主角＋成員化身
  const isPC=u=>u&&(u.kind==='player'||u.np);
  // 房主：每 0.5 秒為每棟有玩家打坐的建築重算預約（保留舊的；新來的拿最小的空位）。b.netSeats 隨建築慢同步給成員
  function netSeatTick(){for(const b of S.buildings){if(!b.built||!ROOM[b.type])continue;
    const ps=S.units.filter(u=>isPC(u)&&!u.dead&&u.inside&&u.inB===b.id&&(u.medit||u.v165===b.id)).sort((a,c)=>a.id-c.id);
    if(!ps.length){if(b.netSeats)b.netSeats=null;continue;}
    const old=b.netSeats||{},R={},taken=[];const h=b.type==='hall'?v165Holder(b):null;
    for(const u of ps)if(h&&h===u)R[u.id]='T';
    for(const u of ps){if(R[u.id])continue;const k=old[u.id];if(typeof k==='number'&&roomSt(b,k)&&!taken[k]){taken[k]=1;R[u.id]=k;}}
    for(const u of ps){if(R[u.id]!=null)continue;let k=0;while(roomSt(b,k)&&taken[k])k++;if(roomSt(b,k)){taken[k]=1;R[u.id]=k;}else R[u.id]='F';}
    b.netSeats=R;}}
  {let acc=0;const _x=update;update=function(dt){const r=_x.apply(this,arguments);if(NET.role==='host'&&S&&!S.dg){acc+=dt||0;if(acc>=0.5){acc=0;try{netSeatTick();}catch(e){}}}return r;};}
  // 兩頁同一套座位：先放寶座、再放房主預約的玩家座位，其餘（弟子、本機玩家）照 owner 規則找空位
  const _vs=v169Seats;v169Seats=function(b){const RS=b&&b.netSeats;if(!RS||!(NET.role==='host'||NET.role==='client'))return _vs.apply(this,arguments);
    const map=new Map(),used=[],slots=[];for(let k=0;k<TUNE.v169.maxSlot;k++){const s=roomSt(b,k);if(!s)break;slots.push(s);}const taken=new Array(slots.length).fill(false);
    const h=v169Holder(b);if(h){const r=TUNE.v165.seat.slice();r.kind='throne';map.set(h.id,r);}
    const put=(id,k)=>{taken[k]=true;const r=slots[k].slice();r.kind='slot';r.slot=k;used.push([r[0],r[1]]);map.set(id,r);return r;};
    for(const id of Object.keys(RS).map(Number).sort((a,c)=>a-c)){const k=RS[id];if(typeof k==='number'&&k<slots.length&&!taken[k]&&!map.has(id))put(id,k);}
    const take=(u,nx,ny)=>{let k=-1,bd=1e9;for(let i=0;i<slots.length;i++){if(taken[i]||!v169Free(b,slots[i][0],slots[i][1],used))continue;const d=nx==null?i:Math.hypot(slots[i][0]-nx,slots[i][1]-ny);if(d<bd){bd=d;k=i;}}
      if(k>=0)return put(u.id,k);const f=v169Floor(b,used,nx==null?ROOM[b.type].R/2:nx,ny==null?ROOM[b.type].R-1.5:ny);if(!f)return null;f.kind='floor';used.push([f[0],f[1]]);map.set(u.id,f);return f;};
    const p=player(),I=S.interior;if(p&&I&&I.bid===b.id&&p.medit&&!map.has(p.id))take(p,I.x,I.y);
    occupants(b).forEach(u=>{if(!map.has(u.id))take(u,null,null);});
    return map;};
  // 成員畫面：屋內也要看到房主主角（owner 的 occupants 只算弟子）
  {const _x=occupants;occupants=function(b){const r=_x.apply(this,arguments);if(NET.role!=='client'||!b)return r;const me=netMyAv();
    for(const u of S.units)if(u.kind==='player'&&u.inside&&u.inB===b.id&&!u.dead&&u!==me&&!r.includes(u))r.push(u);r.sort((a,c)=>a.id-c.id);return r;};}
  // 化身在屋內打坐：不要被 setTask 踢出門（g4 setTask 對非 player 會 exitBuilding）
  {const _x=setTask;setTask=function(u,t){if(u&&u.np&&u.inside&&t&&t.type==='meditate'){u.task=t;u.prevTask=null;u.path=[];u.repath=0;u.needRepath=false;u.medit=false;return;}return _x.apply(this,arguments);};}
  // 成員：坐寶座／起身改送意圖；房主判定先到先得，晚到的改坐蒲團
  V165.send=m=>netIntent({a:'throne',sit:m.sit?1:0,bid:m.bid});
  function netThroneLose(u,b){u.task={type:'meditate'};u.medit=true;u.path=[];u.dvx=u.dvy=0;toast('寶座上已有人，改坐蒲團');try{netSeatTick();}catch(e){}}
  {const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(!i||i.a!=='throne')return _x.apply(this,arguments);
    const a=netAvatarOf(pk);if(!a||a.dead)return false;
    if(!i.sit){v165StandHost(a);NET.stats.applied++;return true;}
    const b=bById(+i.bid);if(!b||b.type!=='hall'||!a.inside||a.inB!==b.id)return false;
    const r=v165SitHost(a,b);if(r==='taken')netThroneLose(a,b);else if(r==='enemy')toast('附近有敵人，無法靜心講道');
    try{netSeatTick();}catch(e){}NET.stats.applied++;return r==='ok'||r==='taken';};}
  // 房主自己晚到 → 也改坐蒲團
  {const _x=v165Sit;v165Sit=function(){const r=_x.apply(this,arguments);try{if(!r&&NET.role==='host'){const p=player(),I=S.interior,b=I&&bById(I.bid);const h=b&&b.type==='hall'?v165Holder(b):null;if(h&&h!==p){p.task={type:'meditate'};p.medit=true;netSeatTick();}}}catch(e){}return r;};}
  // 成員本機：坐在寶座上時 owner 的「沒在打坐就起身」用的是本機 task（不同步）→ 以房主的 v165 為準
  {const _x=updateInteriorPlayer;updateInteriorPlayer=function(p,dt){if(NET.role!=='client'||!p||!S.interior)return _x.apply(this,arguments);
    const I=S.interior,on=p.v165===I.bid;const t0=p.task;if(on||p.medit)p.task={type:'meditate',throne:on?I.bid:undefined};try{return _x.apply(this,arguments);}finally{p.task=t0;}};}
}
// 測試掛鉤
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.tune=NET_TUNE;o.net.test=Object.defineProperties(o.net.test||{},{
  gain:{value:(id,amt)=>{const u=unitById(+id)||netAvatarOf(String(id));if(!u)return null;const x0=u.xiu,l0=netLv(u);gainXiu(u,amt);return {d:u.xiu-x0+(netLv(u)!==l0?1e9:0),lv:netLv(u),xiu:u.xiu,need:needXiu(u),off:u.netOff||null};},configurable:true},
  offScan:{value:()=>netOffScan(),configurable:true},
  seats:{value:bid=>{const b=bById(+bid);if(!b||typeof v169Seats!=='function')return null;return {res:b.netSeats||null,v165:b.v165==null?null:b.v165,m:[...v169Seats(b)].map(([id,r])=>[id,r.kind,+r[0].toFixed(2),+r[1].toFixed(2)])};},configurable:true},
  snapHas:{value:k=>JSON.stringify(snapshot()).includes(k),configurable:true}});}return o;};}
