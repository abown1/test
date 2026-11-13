// ================== net28：室內座位同步（房主仲裁） ==================
// 只用包裝覆寫，不改 g*／build.py。單機（NET.role 為空）完全不動。大殿寶座（hall＋throne）沿用 V165（net11），本檔不接手。
// 佔座表 NET28.occ = {bid:{sid:unitId}}，sid＝roomSitPts 的 seat.id（'st<i>'／'throne'）。房主是唯一權威：
//  成員入座 → 送 {a:'n28sit',bid,sid} → 房主核准（設化身打坐＋寫表）或拒絕 → 廣播 {t:'n28',ev:'res',pk,ok,...}；成員核准後才在本機入座，拒絕提示「已有人坐」。
//  房主自己入座也查表。起身／移動離座：成員送 {a:'n28stand'}。離開室內、死亡、斷線（net27 的 3.5 秒無封包或席位離線）由房主巡檢清座。
//  每個 st 封包夾帶 m.n28＝整張表（新進房成員第一個 st 就拿到）；畫面位置：v169Seats 依表把人放到他選的座位，原本佔那格的人挪到別的空格。
const NET28={v:1,occ:{},tx:0,rx:0,req:0,ok:0,rej:0,clr:0,stand:0,pend:null,grant:null,mine:null,log:[],res:null};
function n28Role(){return (typeof NET!=='undefined'&&NET.role)||null;}
function n28On(){return !!n28Role()&&!(S&&S.dg);}
function n28HallThrone(b,seat){return !!(b&&seat&&b.type==='hall'&&seat.kind==='throne');}
function n28Seat(b,sid){try{return roomSitPts(b).find(s=>s.id===sid)||null;}catch(e){return null;}}
function n28Owner(bid,sid){const t=NET28.occ[bid];return t&&t[sid]!=null?t[sid]:null;}
function n28SeatOf(uid){for(const bid in NET28.occ){const t=NET28.occ[bid];for(const sid in t)if(t[sid]===uid)return {bid:+bid,sid};}return null;}
function n28Log(x){NET28.log.push(Object.assign({t:Math.round(performance.now())},x));if(NET28.log.length>60)NET28.log.shift();}
function n28Put(bid,sid,uid){n28Free(uid);(NET28.occ[bid]||(NET28.occ[bid]={}))[sid]=uid;n28Log({ev:'put',bid,sid,uid});}
function n28Free(uid,why){const s=n28SeatOf(uid);if(!s)return false;delete NET28.occ[s.bid][s.sid];if(!Object.keys(NET28.occ[s.bid]).length)delete NET28.occ[s.bid];if(why){NET28.clr++;n28Log({ev:'clr',why,uid,bid:s.bid,sid:s.sid});}return true;}
function n28Cast(m){try{NET.tr.broadcast(Object.assign({t:'n28'},m));NET28.tx++;}catch(e){}}
function n28HostP(){try{return typeof netHostPlayerU==='function'?netHostPlayerU():player();}catch(e){return null;}}
// 房主：這個佔座還成立嗎
function n28Valid(u,bid,sid){
  if(!u||u.dead)return 'dead';
  if(u===n28HostP()&&!u.np){const I=S.interior;if(!I||I.bid!==bid)return 'exit';if(!u.medit||I.sitId!==sid)return 'stand';return null;}
  if(!u.inside||u.inB!==bid)return 'exit';
  if(!(u.medit||(u.task&&u.task.type==='meditate')))return 'stand';
  try{if(typeof n27Offline==='function'&&n27Offline(u))return 'offline';}catch(e){}
  return null;
}
function n28HostTick(){
  if(n28Role()!=='host')return;let ch=0;
  for(const bid in NET28.occ){const t=NET28.occ[bid];for(const sid in t){const u=unitById(t[sid]);const w=n28Valid(u,+bid,sid);
    if(w){if(u&&u.np&&w==='offline'){u.medit=false;if(u.task&&u.task.type==='meditate'&&u.task.n28)u.task=null;}
      delete t[sid];NET28.clr++;n28Log({ev:'clr',why:w,uid:t[sid]||(u&&u.id),bid:+bid,sid});ch=1;}}
    if(!Object.keys(t).length)delete NET28.occ[bid];}
  return ch;
}
// ---------- 房主 ----------
function n28HostSitAv(pk,i){
  const a=netAvatarOf(pk),b=bById(+i.bid),sid=String(i.sid||'');let why=null;
  const seat=b&&n28Seat(b,sid);
  if(!a||a.dead)why='dead';else if(!b||!seat||n28HallThrone(b,seat))why='seat';else if(!a.inside||a.inB!==b.id)why='out';
  else{const o=n28Owner(b.id,sid);if(o!=null&&o!==a.id&&!n28Valid(unitById(o),b.id,sid))why='taken';}
  NET28.req++;
  if(why){NET28.rej++;n28Log({ev:'rej',pk,why,bid:i.bid,sid});n28Cast({ev:'res',pk,ok:0,why,bid:+i.bid,sid,occ:NET28.occ});return true;}
  n28Put(b.id,sid,a.id);
  a.task={type:'meditate',seat:sid,n28:1};a.prevTask=null;a.path=[];a.medit=true;a.dvx=a.dvy=0;if(seat.slot!=null)a.v169s=seat.slot;
  NET28.ok++;n28Cast({ev:'res',pk,ok:1,bid:b.id,sid,occ:NET28.occ});return true;
}
function n28HostStandAv(pk){
  const a=netAvatarOf(pk);if(!a)return false;const had=n28Free(a.id,'stand');
  if(had||(a.task&&a.task.n28)){if(a.task&&a.task.type==='meditate')a.task=null;a.medit=false;}
  NET28.stand++;if(had)n28Cast({ev:'occ',occ:NET28.occ});return true;
}
// ---------- 畫面：依表擺位 ----------
function n28Apply(b,map){
  const t=NET28.occ[b.id];if(!t)return map;
  const slots=[];try{for(let k=0;k<TUNE.v169.maxSlot;k++){const s=roomSt(b,k);if(!s)break;slots.push(s);}}catch(e){}
  const fixed=new Map();
  for(const sid in t){const s=n28Seat(b,sid);if(!s)continue;const r=[s.x,s.y];r.kind=s.kind==='throne'?'throne':'slot';if(s.slot!=null)r.slot=s.slot;fixed.set(t[sid],r);}
  const near=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1])<0.35;
  const out=new Map();for(const [id,r] of fixed)out.set(id,r);
  for(const [id,r] of map){if(out.has(id))continue;
    if(![...out.values()].some(q=>near(q,r))){out.set(id,r);continue;}
    const k=slots.findIndex(s=>![...out.values()].some(q=>near(q,s))&&![...map.entries()].some(([j,q])=>j!==id&&!out.has(j)&&near(q,s)));
    if(k>=0){const q=slots[k].slice();q.kind='slot';q.slot=k;out.set(id,q);}else out.set(id,r);}
  return out;
}
// ---------- 安裝 ----------
(function n28Install(){
  if(typeof interiorDoSit!=='function'||typeof roomSitPts!=='function'){console.warn('[net28] no seat api');return;}
  // 入座
  {const _x=interiorDoSit;interiorDoSit=function(seat){
    const role=n28Role();if(!role||!n28On())return _x.apply(this,arguments);
    const I=S.interior,b=I&&bById(I.bid);if(!b||!seat||n28HallThrone(b,seat)){n28Log({ev:'pass',b:!!b,seat:!!seat});return _x.apply(this,arguments);}
    if(role==='host'){const p=player();const o=n28Owner(b.id,seat.id);
      if(o!=null&&p&&o!==p.id&&!n28Valid(unitById(o),b.id,seat.id)){NET28.rej++;n28Log({ev:'rej',host:1,bid:b.id,sid:seat.id});try{toast('已有人坐');}catch(e){}if(I){I.sitGo=null;I.sitAp=null;}return false;}
      const r=_x.apply(this,arguments);if(r&&p){n28Put(b.id,seat.id,p.id);n28Cast({ev:'occ',occ:NET28.occ});}return r;}
    // 成員：已被房主核准 → 本機入座（略過本機佔用判斷，以房主為準）
    const G=NET28.grant;if(G&&G.bid===b.id&&G.sid===seat.id){NET28.grant=null;NET28.force=1;let r;try{r=_x.apply(this,arguments);}finally{NET28.force=0;}
      if(r)NET28.mine={bid:b.id,sid:seat.id,t:performance.now()};return r;}
    const P=NET28.pend;if(P&&P.bid===b.id&&P.sid===seat.id&&performance.now()-P.t<1500){n28Log({ev:'pendBlock',sid:seat.id});return false;}
    NET28.pend={bid:b.id,sid:seat.id,t:performance.now()};I.sitGo=null;I.sitAp=null;I.tx=null;
    n28Log({ev:'send',bid:b.id,sid:seat.id,w:!!NET.welcomed,tr:!!NET.tr,hg:!!NET.hostGone});netIntent({a:'n28sit',bid:b.id,sid:seat.id});return true;};}
  // 聯機：玩家角色（房主主角／成員化身）是否佔座以佔座表為準（站著的化身會被 v169 自動排進蒲團位，不能因此擋人）；弟子照舊
  {const _x=interiorSeatTaken;if(typeof _x==='function')interiorSeatTaken=function(b,seat,self){if(NET28.force)return null;const t=_x.apply(this,arguments);
    try{if(t&&n28Role()&&b&&seat&&!n28HallThrone(b,seat)&&(t.np||t.kind==='player')&&n28Owner(b.id,seat.id)!==t.id)return null;}catch(e){}return t;};}
  // 起身
  {const _x=interiorStand;interiorStand=function(){
    const role=n28Role(),p=player();
    // 成員端：g9 起身走 setTask(p,null)，g4 對非 player 會 exitBuilding → 本機化身被踢出室內（房主那邊還在屋內）。保留 inside／inB（由房主同步為準）
    const keep=role==='client'&&p&&p.np&&p.inside?{i:p.inside,b:p.inB}:null;
    let r;try{r=_x.apply(this,arguments);}finally{if(keep&&p){p.inside=keep.i;p.inB=keep.b;}}
    try{if(role==='host'&&p&&n28Free(p.id,'stand'))n28Cast({ev:'occ',occ:NET28.occ});
      else if(role==='client'&&NET28.mine){NET28.mine=null;netIntent({a:'n28stand'});}}catch(e){}
    return r;};}
  // 房主：意圖
  if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){
    if(i&&i.a==='n28sit'){if(n28Role()!=='host')return false;n28Log({ev:'in',pk,sid:i.sid});return n28HostSitAv(pk,i);}
    if(i&&i.a==='n28stand'){if(n28Role()!=='host')return false;return n28HostStandAv(pk);}
    return _x.apply(this,arguments);};}
  // 房主：每個 st 夾表＋巡檢
  if(typeof netCast==='function'){const _x=netCast;netCast=function(m){
    try{if(m&&m.t==='st'&&n28Role()==='host'){n28HostTick();m.n28=NET28.occ;}}catch(e){}
    return _x.apply(this,arguments);};}
  if(typeof netHostRx==='function'){const _x=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='n28')return;if(m&&m.t==='in'&&m.i&&(m.i.a==='n28sit'||m.i.a==='n28stand'))n28Log({ev:'raw',a:m.i.a,sid:m.i.sid,pk:NET.cid2pk.get(cid)||null});return _x.apply(this,arguments);};}
  // 位置
  if(typeof v169Seats==='function'){const _x=v169Seats;v169Seats=function(b){const m=_x.apply(this,arguments);if(!n28Role()||!b||!NET28.occ[b.id])return m;try{return n28Apply(b,m);}catch(e){return m;}};}
  // 成員：收表／收結果
  function rxOcc(o){if(o&&typeof o==='object')NET28.occ=o;}
  if(typeof netClientRxExtra==='function'){const _x=netClientRxExtra;netClientRxExtra=function(m){
    if(m&&m.t==='n28'){NET28.rx++;rxOcc(m.occ);
      if(m.ev==='res'&&m.pk===NET.pkey){const P=NET28.pend;NET28.pend=null;NET28.res={ok:m.ok,why:m.why,bid:m.bid,sid:m.sid,t:performance.now()};
        if(m.ok){const I=S.interior,b=I&&bById(I.bid);const seat=b&&b.id===m.bid&&n28Seat(b,m.sid);
          if(seat){NET28.grant={bid:m.bid,sid:m.sid};interiorDoSit(seat);}else netIntent({a:'n28stand'});}
        else{try{toast(m.why==='taken'?'已有人坐':'無法入座');}catch(e){}}}
      return;}
    return _x.apply(this,arguments);};}
  if(typeof netApplySt==='function'){const _x=netApplySt;netApplySt=function(m){const r=_x.apply(this,arguments);try{if(m&&m.n28){rxOcc(m.n28);NET28.stRx=(NET28.stRx||0)+1;}}catch(e){}return r;};}
  // 成員：本機移動離座／離開室內 → 告訴房主；房主已清掉我的座位 → 本機也起身
  if(typeof netClientUpdate==='function'){const _x=netClientUpdate;netClientUpdate=function(dt){const r=_x.apply(this,arguments);try{
    if(n28Role()==='client'&&NET28.mine){const M=NET28.mine,I=S.interior,p=player(),now=performance.now();
      const left=!I||I.bid!==M.bid||!p||p.dead||(!p.medit&&now-M.t>800)||I.sitId!==M.sid;
      const me=p&&n28Owner(M.bid,M.sid)===p.id;
      if(left){NET28.mine=null;netIntent({a:'n28stand'});}
      else if(!me&&now-M.t>2500){NET28.mine=null;NET28.lost=(NET28.lost||0)+1;try{interiorStand();}catch(e){}}}}catch(e){}return r;};}
})();
// 測試掛鉤
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o&&o.net)o.net.seat=NET28;return o;};}
