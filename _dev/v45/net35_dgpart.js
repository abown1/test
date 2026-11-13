// ================== 聯機：副本參與者名單＋個人份入帳（net35_dgpart.js，仙武聯機 2026-11-13）==================
// 介面（隊長 13:33 定案，給 仙武新地圖 mapDgPartyPlayers 用）：
//   XW.net.dgParticipants()  房主限定 → [{pid,uid,isHost,unit,name,dead,online}]；不在聯機（單機）或在客機 → null（地圖當 1 人）
//   XW.net.dgCredit(pid,{key,n,reason,rid?})  房主寫入；玩家的份走 XW_STORE.add(key,n,{owner,reason})（行囊有空進該成員 u.bagN／u.gbag，滿則進宗門倉）。以 rid 冪等（預設 rid＝本場 run|pid|key|reason）
//   客機顯示用：XW.net.dgParticipantsView() → 房主同步來的 {run,kind,final,players:[{pid,uid,isHost,name,dead,online}],disciples:[uid]}
// 參與者定義：本場副本（netDgRun()）的單位裡、由玩家操控的角色（房主主角 kind:'player'，成員化身 u.np）。
//   ・首領倒下（dgBossDown，或 D.cleared 由 false 變 true）那一刻凍結名單；之後結算都用凍結名單（離場、斷線都不影響）。
//   ・斷線：化身仍留在副本（net 規則：角色永遠留在世界）→ 照算；中途加入（dgjoin）只要首領倒下時在場內就算；倒下（dead）仍算。
//   ・凍結前就離開副本（撤退、回宗門）不算。觀戰（spec）沒有化身在場內，不算。
// 開關：NET_FLAGS.dgPart 預設 true；?netexp=-dgPart 或 NET35.set(false) → 兩個函式回 null／{ok:false,reason:'off'}（地圖走舊的本機入帳）。不改存檔結構（名單與冪等紀錄只在執行時）。
const NET35={on:true,runs:new Map(),view:null,viewSeq:-1,cred:new Map(),credLog:[],sig:'',stats:{freeze:0,credit:0,dup:0,sent:0,rx:0,gap:0,legacy:0},
  set(v){NET35.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.dgPart=NET35.on;}catch(e){}return NET35.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('dgPart' in NET_FLAGS))NET_FLAGS.dgPart=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='dgPart')NET_FLAGS.dgPart=!t.startsWith('-');
  NET35.on=!!NET_FLAGS.dgPart;}}catch(e){}
function net35D(){try{return typeof netDgRun==='function'?netDgRun():(S&&S.dg)||null;}catch(e){return null;}}
function net35Run(D){if(!D)return null;if(!D._netRun)D._netRun=String(D.runId||((D.kind||'dg')+'-'+Date.now().toString(36)+'-'+(NET.tick||0)));return D._netRun;}
function net35Rec(D){const id=net35Run(D);if(!id)return null;let r=NET35.runs.get(id);
  if(!r){r={id,kind:D.kind,final:null,seen:{}};NET35.runs.set(id,r);if(NET35.runs.size>8)NET35.runs.delete(NET35.runs.keys().next().value);}return r;}
function net35Online(pk){if(pk==='host')return true;const p=NET.players&&NET.players.get(pk);return !!(p&&(p.host||p.online));}
function net35Live(D){let U=[];try{U=typeof netDgUnits==='function'?netDgUnits():(S.dg?S.units:[]);}catch(e){U=[];}
  const players=[],dis=[];
  for(const u of U||[]){if(!u)continue;
    if(u.kind==='player'){players.push({pid:'host',uid:u.id,isHost:true,unit:u,name:u.name,dead:!!u.dead,online:true});}
    else if(u.np){players.push({pid:u.np,uid:u.id,isHost:false,unit:u,name:u.name,dead:!!u.dead,online:net35Online(u.np)});}
    else if(u.kind==='disciple')dis.push(u.id);}
  return {players,disciples:dis};}
function net35Freeze(D,why){if(!D||NET.role==='client')return null;const r=net35Rec(D);if(!r||r.final)return r;const L=net35Live(D);
  r.final={players:L.players.map(p=>({pid:p.pid,uid:p.uid,isHost:p.isHost,name:p.name})),disciples:L.disciples.slice(),at:Date.now(),why};NET35.last=r;NET35.stats.freeze++;return r;}
function net35Track(){if(!NET35.on||NET.role==='client')return;const D=net35D();if(!D)return;const r=net35Rec(D);
  if(!r.final){for(const p of net35Live(D).players)r.seen[p.pid]=p.uid;if(D.cleared)net35Freeze(D,'cleared');}}
// 凍結時機：首領倒下（在原函式之前，地圖若在 dgBossDown 內就結算也拿得到凍結名單）
if(typeof dgBossDown==='function'){const _x=dgBossDown;dgBossDown=function(){try{if(NET35.on&&NET.role!=='client'&&S.dg&&!S.dg.cleared)net35Freeze(S.dg,'bossDown');}catch(e){}return _x.apply(this,arguments);};}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{net35Track();}catch(e){}return r;};}
// ---- 房主介面 ----
function net35LastRec(){const r=NET35.last;return r&&r.final&&Date.now()-r.final.at<600000?r:null;}
function netDgParticipants(){if(!NET35.on||NET.role!=='host')return null;const D=net35D();const r=D?net35Rec(D):net35LastRec();if(!r)return [];
  const live=D?net35Live(D).players:[],byUid=new Map(live.map(p=>[p.uid,p]));
  if(r&&r.final)return r.final.players.map(p=>{const l=byUid.get(p.uid);const unit=l?l.unit:(typeof unitById==='function'?unitById(p.uid):null)||(p.isHost?netHostPlayerU():netAvatarOf(p.pid));
    return {pid:p.pid,uid:p.uid,isHost:p.isHost,unit:unit||null,name:p.name,dead:!!(unit&&unit.dead),online:net35Online(p.pid)};});
  return D?live:[];}
function netDgDisciples(){if(!NET35.on)return null;const D=net35D();const r=D?net35Rec(D):net35LastRec();if(!r)return [];return r.final?r.final.disciples.slice():net35Live(D).disciples;}
function net35Legacy(key,n){const k=String(key);let m;
  if(k==='lingshi'||k==='xia'){S.res.lingshi=(S.res.lingshi||0)+n;return true;}
  if(S.res&&k in S.res){S.res[k]=(S.res[k]||0)+n;return true;}
  if((m=/^item:(.+)$/.exec(k))){S.items[m[1]]=(S.items[m[1]]||0)+n;return true;}
  if((m=/^mat:(.+)$/.exec(k))){S.mats[m[1]]=(S.mats[m[1]]||0)+n;return true;}
  return false;}
// owner 支援偵測：v2 提供 XW_STORE.bag(pid)。沒有的話退回宗門倉並標 gap:'no-per-player-bag'。
function net35OwnerApi(){try{return typeof XW_STORE!=='undefined'&&XW_STORE.enabled&&XW_STORE.enabled()&&typeof XW_STORE.bag==='function';}catch(e){return false;}}
// 把聯機 pid 對成 API 認得出的 owner：房主 → 主角單位 id（API 不認字串 'host'）；成員 → 其化身 u.np===pid。
// 正式 econ_store_v2（c245c44c5aea）：xwsOwnerUnit 認 u.np 為玩家（即使 kind:'disciple'），並掃 S.units→S.dg.W.units→S.owArea.units→netParkUnits()。不再暫標 u.avatar。
function net35FindOwnerU(pid){pid=String(pid==null?'host':pid);
  try{if(pid==='host')return (typeof netHostPlayerU==='function'?netHostPlayerU():null)||(typeof player==='function'?player():null)||(S.units||[]).find(x=>x&&x.kind==='player')||null;
    if(typeof netAvatarAnywhere==='function'){const a=netAvatarAnywhere(pid);if(a)return a;}
    const lists=[S&&S.units,S&&S.dg&&S.dg.W&&S.dg.W.units,typeof netDgUnits==='function'?netDgUnits():null,typeof netParkUnits==='function'?netParkUnits():null];
    for(const L of lists){if(!L)continue;for(const x of L)if(x&&(String(x.id)===pid||x.np===pid))return x;}
  }catch(e){}return null;}
function net35OwnerId(pid){pid=String(pid==null?'host':pid);const u=net35FindOwnerU(pid);
  if(pid==='host')return (u&&u.id!=null)?u.id:pid;if(u&&u.np)return u.np;if(u&&u.id!=null)return u.id;return pid;}
function netDgCredit(pid,o){o=o||{};if(!NET35.on)return {ok:false,reason:'off'};if(NET.role==='client')return {ok:false,reason:'client-readonly'};
  const key=String(o.key||''),n=+o.n;if(!key)return {ok:false,reason:'bad-key'};if(!(n>0)||!Number.isFinite(n))return {ok:false,reason:'bad-amount'};
  pid=String(pid==null?'host':pid);const D=net35D(),LR=net35LastRec(),run=D?net35Run(D):(LR?LR.id:'nodg-'+Date.now().toString(36));
  const rid=String(o.rid||[run,pid,key,o.reason||''].join('|'));
  if(NET35.cred.has(rid)){NET35.stats.dup++;return Object.assign({},NET35.cred.get(rid),{dup:true});}
  const why=String(o.reason||'dgShare');let res=null;const owner=net35OwnerId(pid);
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE.enabled&&XW_STORE.enabled()){
    if(net35OwnerApi()){const r=XW_STORE.add(key,n,{owner,reason:why});
      if(r&&r.ok){const to=(r.to==='bag'||r.to==='inv')?'bag':(r.to==='gear'?'gear':'store');res={ok:true,to,added:r.added};if(r.owner!=null)res.owner=r.owner;else if(owner!=null)res.owner=owner;}
      else if(r&&!r.ok)res={ok:false,reason:r.reason||'add-failed'};}
    else{const r=XW_STORE.add(key,n,why);if(r&&r.ok){res={ok:true,to:'sect',added:r.added};if(pid!=='host'){res.gap='no-per-player-bag';NET35.stats.gap++;}}}}
  }catch(e){}
  if(!res){if(net35Legacy(key,n)){res={ok:true,to:'legacy'};NET35.stats.legacy++;}else res={ok:false,reason:'unsupported-key'};}
  res.rid=rid;res.pid=pid;res.key=key;res.n=n;NET35.cred.set(rid,res);if(NET35.cred.size>500)NET35.cred.delete(NET35.cred.keys().next().value);
  if(res.ok){NET35.stats.credit++;
    try{if(NET.role==='host'&&pid!=='host'&&NET.tr){const p=NET.players.get(pid);if(p&&p.cid!=null&&p.online)NET.tr.send(p.cid,{t:'dgcred',rid,key,n,reason:why,to:res.to,seq:NET.tick});}}catch(e){}}
  return res;}
// ---- 同步：st 附 m.dgp ----
function net35Pack(){const D=net35D();if(!D)return null;const r=net35Rec(D),L=r&&r.final?r.final:null;
  const ps=(L?L.players:net35Live(D).players).map(p=>({pid:p.pid,uid:p.uid,isHost:p.isHost,name:p.name,online:net35Online(p.pid)}));
  return {run:r.id,kind:D.kind,final:!!L,players:ps,disciples:L?L.disciples.slice():net35Live(D).disciples};}
// 副本進行中每個 st 都帶（≤16 人，數百 bytes；各區域分送也都拿得到）；沒有副本時在慢速 st 送 null
{const _c=netCast;netCast=function(m){try{if(NET35.on&&m&&m.t==='st'&&NET.role==='host'){const p=net35Pack();
    if(p||NET35.sig!=='null'||m.all||m.v45){m.dgp=p;const sig=p?'run:'+p.run:'null';if(sig!==NET35.sig){NET35.sig=sig;NET35.stats.sent++;}}}}catch(e){}return _c.apply(this,arguments);};}
{const _st=netApplySt;netApplySt=function(m){const r=_st.apply(this,arguments);try{if(m&&('dgp' in m)&&NET.role==='client'&&(m.seq==null||m.seq>=NET35.viewSeq||m.seq+600<NET35.viewSeq)){NET35.view=m.dgp;NET35.viewSeq=m.seq==null?NET35.viewSeq:m.seq;NET35.stats.rx++;}}catch(e){}return r;};}
{const _x=netClientRx;netClientRx=function(m){const r=_x.apply(this,arguments);try{if(m&&(m.t==='welcome'||m.t==='full'||m.t==='dgend')){NET35.view=null;if(m.t==='welcome')NET35.viewSeq=-1;}}catch(e){}return r;};}
// 客機收到「你的份」：只記錄＋提示，不自己加（數值由房主快照帶來 → 不會重複入帳）
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='dgcred'){if(!NET35.credLog.some(c=>c.rid===m.rid)){NET35.credLog.push({rid:m.rid,key:m.key,n:m.n,reason:m.reason,to:m.to});if(NET35.credLog.length>100)NET35.credLog.shift();
      try{const dest=m.to==='bag'||m.to==='inv'?'（入你的行囊）':(m.to==='sect'||m.to==='store'||m.to==='gear'?'（入宗門倉庫）':'');toast(`副本結算：你的一份 ${typeof cname==='function'?cname(String(m.key).replace(/^(item|mat):/,'')):m.key} ×${m.n}${dest}`);}catch(e){}}return;}return _x.apply(this,arguments);};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{if(o&&o.net){o.net.dgParticipants=netDgParticipants;o.net.dgCredit=netDgCredit;o.net.dgDisciples=netDgDisciples;
    o.net.dgParticipantsView=()=>NET35.view?JSON.parse(JSON.stringify(NET35.view)):null;o.net.dgCredLog=()=>NET35.credLog.slice();o.net.dgPartStats=()=>Object.assign({on:NET35.on},NET35.stats);o.net.dgPartSet=NET35.set;}}catch(e){}return o;};}
