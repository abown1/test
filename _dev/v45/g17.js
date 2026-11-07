// ================== v0.4.6a：玩家回饋修正（feedback_80 第一批）==================
// 規則：頂層不碰 g7 的 const（$、JOB_NAME…），DOM 相關放進 XW045 包裝內。
TUNE.xwChance=0.005;            // #4 仙武之體：1.5% → 0.5%（求武台等級加成也減半）
TUNE.talkDist=4.5;              // #60 與流浪者交談／贈禮距離放寬
TUNE.brkLockN=10;TUNE.brkLockCh=0.15; // #82 失敗 10 次起，每次失敗 15% 道基受損
TUNE.retreatHp=0.3;TUNE.retreatBack=0.7;TUNE.retreatHeal=0.06; // #3/#9
TUNE.combatRegen=0.3;           // #8 戰鬥中回血 30%，脫戰 5 秒恢復
TUNE.ripHeal=0.03;              // #85 原地休整每秒回復 3% 氣血
TUNE.massBack=20;               // #10 集合類指令 20 秒後回崗
TUNE.panHold=220;TUNE.camShift=2.5; // #14/#13
TUNE.bldGap=1;                  // #16 建築間保留 1 格走道
const V46={t:0,t2:0,selT:0};
function v46Combat(u){return S.time-(u.lastHit==null?-99:u.lastHit)<=5||S.time-(u.lastAtk==null?-99:u.lastAtk)<=5;}

// ---- #4 仙武之體更稀有 ----
{const _rb=rollBody4;rollBody4=function(force,mul){return _rb(force,mul?1+(mul-1)*0.5:mul);};}

// ---- #28 混沌靈根突破修正、#82 多次失敗道基受損 ----
let _hdSkip=false;
{const _bc=breakConds;breakConds=function(u){const c=_bc(u);if(!c||!c.list)return c;
  if(_hdSkip){c.list=c.list.filter(x=>!/^混沌靈根：額外靈石/.test(x.t));c.ok=c.list.every(x=>x.ok);}
  if(u&&u.brkLock){c.list.push({t:'道基受損：終生無法再突破大境界',ok:false});c.ok=false;c.auto=false;}
  return c;};}
{const _tb=tryBreak;tryBreak=function(u,auto){if(!u||u.dead)return _tb(u,auto);
  const major=(u.sub||0)>=SUB_N-1&&u.realm<MAX_REALM;let pre=false;if(major){const c=breakConds(u);pre=!!(c&&c.ok);}
  const r0=u.realm;let res;
  // g16 先扣混沌額外靈石，再跑內層檢查 → 內層會再要求一次額外靈石而失敗。這裡讓內層略過那一條。
  if(pre&&rootKey(u)==='hundun'&&u.realm>=3&&u.realm<=5){_hdSkip=true;try{res=_tb(u,auto);}finally{_hdSkip=false;}}
  else res=_tb(u,auto);
  if(pre&&!res&&u.realm===r0){u.brkFails=(u.brkFails||0)+1;
    if(u.kind!=='player'&&u.brkFails>=TUNE.brkLockN&&!u.brkLock&&rnd()<TUNE.brkLockCh){u.brkLock=true;floater(u.x,u.y,'道基受損','#ff6060');toast(`${nm(u)}屢次衝關失敗，道基受損，終生無法再突破！`);}
    panelKeyCache=null;}
  if(res&&u.realm>r0)u.brkFails=0;
  return res;};}
{const _gl=gearLine;gearLine=function(u){let s='';
  if(u&&u.brkLock)s=`<div style="color:#ff7a6a"><b>⚠ 道基受損：終生無法突破</b>（累計失敗 ${u.brkFails||0} 次）</div>`;
  else if(u&&u.brkFails)s=`<div class="dim">突破失敗 ${u.brkFails} 次${u.kind!=='player'&&u.brkFails>=TUNE.brkLockN-2?`<span style="color:#ffb070">（失敗 ${TUNE.brkLockN} 次起可能道基受損）</span>`:''}</div>`;
  return s+_gl(u);};}

// ---- #17 主角不需要忠誠度（面板已隱藏；數值固定）----

// ---- #8 戰鬥中回血變慢；#3/#9 撤退快速回血；#85 原地休整 ----
{const _uu=updateUnit;updateUnit=function(u,dt){const hp0=u.hp,full=u.hp>=u.maxhp;_uu(u,dt);if(u.dead||full)return;
  const base=(3+u.realm*1.5)*dt;
  if(S.time-(u.lastHit==null?-99:u.lastHit)<=5)u.hp=Math.min(u.maxhp,u.hp+base*TUNE.combatRegen);
  else if(S.time-(u.lastAtk==null?-99:u.lastAtk)<=5&&u.hp>hp0)u.hp=Math.max(hp0,u.hp-base*(1-TUNE.combatRegen));
  if((u.retreat&&!u.task)||u.rip){const e=nearestEnemy(u.x,u.y,4.5);if(!e)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*(u.retreat?TUNE.retreatHeal:TUNE.ripHeal)*dt);}};}
{const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){if(src&&src.kind)src.lastAtk=S.time;_de(src,e,amt,col);
  // #83 仇恨：弟子出手也會吸引怪物
  if(e&&!e.dead&&src&&src.kind==='disciple'&&!e.flee&&e.target&&e.target.k==='u'&&e.target.id!==src.id&&rnd()<0.3)e.target={k:'u',id:src.id};};}
{const _du=dmgUnit;dmgUnit=function(src,u,d){const r=_du(src,u,d);if(u&&u.retreat&&u.task&&u.task.type==='attack'){u.task=null;u.path=[];}return r;};}

function v46SafeSpot(u){const c=[];const D=S.dg;
  if(D){for(const r of D.L.rooms)if(r.state==='clear')c.push({x:r.cx,y:r.cy});c.push({x:D.ent.x,y:D.ent.y});}
  else{const sc=sectCenter();c.push({x:sc.x+2,y:sc.y+3});for(const b of S.buildings)if(b.built&&!b.broken&&(b.type==='house'||b.type==='hall')){const d=doorPt(b);c.push({x:d.x,y:d.y+0.6});}}
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2;c.push({x:u.x+Math.cos(a)*9,y:u.y+Math.sin(a)*9});}
  const uc=unitComp(u);let best=null,bs=-1e9;
  for(const p of c){let md=40;for(const e of S.enemies){const d=dist(p.x,p.y,e.x,e.y);if(d<md)md=d;}const s=md-0.12*dist(u.x,u.y,p.x,p.y);if(s>bs){const f=nearestFree(p.x,p.y,uc);if(!f)continue;bs=s;best={x:f.i+0.5,y:f.j+0.5};}}
  return best;}
function v46Retreat(u){const p=v46SafeSpot(u);if(!p)return false;if(u.inside)exitBuilding(u);setTask(u,{type:'move',x:p.x,y:p.y});if(!pathTo(u,p.x,p.y)){u.task=null;return false;}u.retreat=u.retreat||{t0:S.time,dec:false};u.retreat.t=S.time;u.thought='💦';u.thT=S.time;return true;}
function v46Rip(u,on,why){if(!u||u.kind!=='disciple')return;
  if(on){if(u.inside)exitBuilding(u);if(why==='auto')u.ripSave={job:u.job,jobB:u.jobB,jobRes:u.jobRes,smart:u.smart};else u.ripSave=null;
    u.job=null;u.jobB=null;u.aiJob=null;u.task=null;u.path=[];u.dvx=u.dvy=0;u.rip=why||'cmd';u.ripT=S.time;u.holdT=S.time;u.holdAt={x:u.x,y:u.y};}
  else{u.rip=null;u.medit=false;u.ripSave=null;}}
{const _ud=updateDisciple;updateDisciple=function(u,dt){
  if(u.rip&&!u.inside){const e=nearestEnemy(u.x,u.y,3.2);if(!e&&(!u.task||u.task.type!=='attack')){u.task=null;u.dvx=u.dvy=0;u.path=[];u.medit=true;u.mood=Math.min(100,(u.mood||60)+dt*0.3);return;}u.medit=false;}
  if(u.retreat&&!u.task&&!u.inside){u.dvx=u.dvy=0;u.path=[];u.medit=true;return;}
  return _ud(u,dt);};}
{const _ae=aiEligible;aiEligible=function(u){if(u&&(u.rip||u.retreat))return false;return _ae(u);};}
{const _tn=taskName;taskName=function(u){if(u&&u.rip)return u.rip==='auto'?'休整（狀態不佳）':'原地休整';if(u&&u.retreat)return u.task?'撤退療傷':'療傷中';return _tn(u);};}
function v46Neg(u){if(u.hp<u.maxhp*0.35&&!nearestEnemy(u.x,u.y,9))return '重傷';if((u.mood!=null&&u.mood<15))return '心情低落';if((u.tox||0)>=0.35)return '丹毒';return null;}

// ---- #6/#10 全員指令保留原工作 ----
function v46MassRestore(u){const s=u.massSave;u.massSave=null;u.massT=null;if(!s||u.dead)return;
  if(u.task&&u.task.type==='move')u.task=null;
  if(!s.job){u.job=null;u.jobB=null;u.holdAt=s.holdAt||null;return;}
  if(INJOB[s.job]&&s.jobB!=null)assignJob(u,s.job,{bid:s.jobB});else assignJob(u,s.job,s.jobRes);
  if(u.job!==s.job&&!INJOB[s.job])u.job=s.job;
  u.jobRes=s.jobRes;u.smart=s.smart;if(s.job==='guard'&&s.guardAt)u.guardAt=s.guardAt;}
{const _go=globalOrder;globalOrder=function(k){const ds=disciples().filter(u=>!u.dead);
  if(k==='follow'&&S.folAll){S.folAll=false;let n=0;for(const u of ds)if(u.job==='follow'&&u.massSave){v46MassRestore(u);n++;}else if(u.massSave&&u.massT==null)v46MassRestore(u);
    toast(`取消全員跟隨：${n} 名弟子回到原本的工作`);pbarKey=null;panelKeyCache=null;return n;}
  const mass=k==='follow'||k==='home'||k==='rally';
  const snap=mass?ds.map(u=>[u,u.massSave||{job:u.job,jobB:u.jobB,jobRes:u.jobRes,smart:u.smart,guardAt:u.guardAt,holdAt:u.holdAt}]):null;
  const n=_go(k);
  if(snap){for(const [u,s] of snap){if(u.job===s.job&&s.job&&s.job!=='follow')continue;if(s.job==='follow'&&k==='follow')continue;
      u.massSave=s;u.massT=k==='follow'?null:S.time+TUNE.massBack;}
    S.folAll=k==='follow';if(k!=='follow')toast(`${TUNE.massBack} 秒後弟子會自動回到原本的崗位`);}
  return n;};}
{const _aj=assignJob;assignJob=function(u,job,arg){const r=_aj(u,job,arg);if(r&&u){if(!v46Mass)u.massSave=null,u.massT=null;if(u.rip)v46Rip(u,false);if(u.retreat&&!v46Mass){}}return r;};}
let v46Mass=false;
{const _r=v46MassRestore;v46MassRestore=function(u){v46Mass=true;try{_r(u);}finally{v46Mass=false;}};}
{const _cm=commandMove;commandMove=function(us,tx,ty,sh){for(const u of us||[])if(u&&u.kind==='disciple'){u.massSave=null;u.massT=null;if(u.rip)v46Rip(u,false);u.retreat=null;}return _cm(us,tx,ty,sh);};}

// ---- #1/#64 採集：找不到就擴大範圍或換資源；同資源點分散 ----
function v46FindNode(u,res){const h=nearestHall(u);const claim=[];u.bad=u.bad||{};
  for(const d of S.units)if(d!==u&&(d.kind==='disciple'&&!d.np)&&!d.dead&&d.jnode!=null&&d.job==='gather'){claim.push([d.jnode,u.bad[d.jnode]]);u.bad[d.jnode]=Infinity;}
  const look=()=>(h?findNearestNode(res,h.i+1.5,h.j+1.5,45,u):null)||findNearestNode(res,u.x,u.y,30,u)||findNearestNode(res,h?h.i+1.5:u.x,h?h.j+1.5:u.y,140,u);
  let n=look();for(const [id,v] of claim){if(v===undefined)delete u.bad[id];else u.bad[id]=v;}
  if(!n)n=look();return n;}
{const _dj=doJob;doJob=function(u,dt){
  if(u.kind==='disciple'&&u.job==='gather'){const res=u.jobRes||'wood';
    const ret=u.carry&&u.carry.amt>0&&(u.carry.amt>=CARRY_CAP||u.carry.type!==res||u.jst==='ret');
    if(!ret){let n=u.jnode!=null?nodeById(u.jnode):null;
      if(!n||n.amount<=0||!nodeMinable(n)){n=v46FindNode(u,res);
        if(n){u.jnode=n.id;u.path=[];}
        else{let alt=null;const w=allocWant();const rs=ALLOC_RES.filter(r=>r!==res&&(w[r]||0)>0).sort((a,b)=>(w[b]||0)-(w[a]||0));
          if(u.smart){for(const r of rs){const m=v46FindNode(u,r);if(m){alt=[r,m];break;}}}
          if(alt){u.jobRes=alt[0];u.jnode=alt[1].id;u.path=[];if(!u.altWarn||S.time-u.altWarn>30){u.altWarn=S.time;floater(u.x,u.y,'改採'+RES_NAMES[alt[0]],'#ffe9a8');}}
          else if(!(u.carry&&u.carry.amt>0)){if(!u.nodeWarn||S.time-u.nodeWarn>25){u.nodeWarn=S.time;toast(`${nm(u)}：找不到${RES_NAMES[res]}，先改為自主行動`);}
            u.job=null;u.jobB=null;u.smart=false;u.holdT=0;u.holdAt=null;u.aiT=0;return;}}}}}
  return _dj(u,dt);};}

// ---- #61 主角穿過自己的弟子（只推弟子）----
separate=function(list){
  // t1409u: do not restore passive character separation over the base implementation.
};

// ---- #83 副本：弟子也會觸發房間、怪物會轉移仇恨 ----
{const _ue=updateEnemy;updateEnemy=function(e,dt,ct){_ue(e,dt,ct);if(e.dead)return;e._rt=(e._rt||0)-dt;if(e._rt>0)return;e._rt=1;
  if(e.flee||!e.target||e.target.k!=='u')return;const cur=unitById(e.target.id);const R=e.aggro||8;let best=null,bd=R;
  for(const u of S.units){if(u.dead||u.inside)continue;const d=dist(e.x,e.y,u.x,u.y);if(d<bd){bd=d;best=u;}}
  if(best&&best!==cur&&(!cur||cur.dead||bd<dist(e.x,e.y,cur.x,cur.y)*0.6))e.target={k:'u',id:best.id};};}
{const _dg=dgUpdate;dgUpdate=function(dt){const D=S.dg;
  if(D&&!D.end)for(const u of S.units){if(u.dead||(u.kind!=='disciple'||u.np))continue;const r=dgRoomOf(u.x,u.y);if(r&&r.state==='idle')dgSpawnRoom(r);}
  _dg(dt);if(S.dg)v46Tick(dt);};}

// ---- #57 被包圍的建築也能施工／升級／修繕：走不到旁邊就就近施工 ----
let v46Loose=false;
{const _ar=approachRect;approachRect=function(o,dt,i0,j0,s,reach){const r=_ar(o,dt,i0,j0,s,reach);if(!v46Loose||r===true)return r;
  const d=distRect(o.x,o.y,i0,j0,s);
  if(d<=3.6&&(r===null||!o.path.length||o.stuck>=2)){o.dvx=o.dvy=0;o.path=[];o.stuck=0;return true;}
  if(r===null){const g=nearestFree(i0+s/2,j0+s/2,unitComp(o));if(g&&distRect(g.i+0.5,g.j+0.5,i0,j0,s)<=3.6&&pathTo(o,g.i+0.5,g.j+0.5)){o.stuck=0;o.repath=4;return false;}}
  return r;};}
{const _bs=buildStep;buildStep=function(u,dt,b){v46Loose=true;try{return _bs(u,dt,b);}finally{v46Loose=false;}};}
{const _rs=repairStep;repairStep=function(u,dt,b){v46Loose=true;try{return _rs(u,dt,b);}finally{v46Loose=false;}};}
// #16 新建築與既有建築之間保留 1 格走道
function v46GapOk(type,i0,j0){if(S.dg)return true;const s=BUILD[type].size,g=TUNE.bldGap||0;if(!g)return true;
  for(const b of S.buildings){const t=BUILD[b.type].size;if(i0<b.i+t+g&&i0+s+g>b.i&&j0<b.j+t+g&&j0+s+g>b.j)return false;}return true;}
{const _pv=placementValid;placementValid=function(type,i0,j0){return _pv(type,i0,j0)&&v46GapOk(type,i0,j0);};}
{const _tp=tryPlace;tryPlace=function(shift){if(buildMode){const g=ghostOrigin();if(g&&!v46GapOk(buildMode,g.i,g.j)){toast(`建築之間要留 ${TUNE.bldGap} 格走道，方便弟子進出施工`);return;}}return _tp(shift);};}

// ---- #52 鍛造坊／煉丹房可以進入 ----
ROOM.forge={R:5,fl:['#5e4a3a','#564234'],wl:['#4a3a2e','#5a4636'],trim:'#2a1a10',st:[[1.5,2.6,1.5,1.6],[3.5,2.6,3.5,1.6]]};
ROOM.alchemy={R:5,fl:['#6a5c48','#625442'],wl:['#3a5a48','#466a56'],trim:'#1e3226',st:[[1.5,2.7,2.5,1.7],[3.5,2.7,2.5,1.7]]};
DOOR_I.forge=1;DOOR_I.alchemy=1;
ROOM_SOLID.forge=[[2.5,0.8,0.45],[1.5,1.6,0.3],[3.5,1.6,0.3]];ROOM_SOLID.alchemy=[[2.5,1.7,0.5],[1.2,0.3,0.3],[3.8,0.3,0.3]];
{const _rf=roomFurniture;roomFurniture=function(b){if(b.type==='forge'){const f=[['burner',2.5,0.8],['table',1.5,1.6],['table',3.5,1.6],['rackL',0.35,3.2],['lamp',4.4,0.5]];addLvFurniture(b,f);return f;}
  if(b.type==='alchemy'){const f=[['burner',2.5,1.7],['shelf',1.2,0.3],['shelf',3.8,0.3],['lamp',0.5,4.4]];addLvFurniture(b,f);return f;}return _rf(b);};}
{const _cr=crafters;crafters=function(b){const r=_cr(b);const p=player(),I=S.interior;if(p&&!p.dead&&I&&I.bid===b.id&&!r.includes(p))r.push(p);return r;};}
{const _rp=renderInPanel;renderInPanel=function(force){_rp(force);const I=S.interior;if(!I)return;const b=bById(I.bid);if(!b||(b.type!=='forge'&&b.type!=='alchemy'))return;
  const el=inPanelEl();if(!el||el.querySelector('[data-in="v46craft"]'))return;const bt=el.querySelector('.ibtns');if(bt)bt.insertAdjacentHTML('beforeend',`<button class="btn pri" data-in="v46craft">${b.type==='alchemy'?'⚗ 開爐煉丹':'⚒ 鍛造台'}</button>`);
  if(!el._v46){el._v46=1;el.addEventListener('click',ev=>{const t=ev.target.closest('[data-in="v46craft"]');if(!t)return;const I2=S.interior;if(I2)openCraft(bById(I2.bid));});}};}

// ---- #60 流浪者：被選取或主角靠近時停下；贈禮／招攬會自動走過去再執行 ----
{const _uw=updateWanderer;updateWanderer=function(w,dt,ct){const p=player();
  const sel=selOther&&selOther.k==='w'&&selOther.id===w.id;
  if(w.kind!=='cand'&&p&&!p.dead&&(sel||(p.pend&&p.pend.id===w.id))&&dist(p.x,p.y,w.x,w.y)<12){w.dvx=w.dvy=0;w.path=[];moveEntity(w,dt);return;}
  return _uw(w,dt,ct);};}
{const _gw=giftWanderer;giftWanderer=function(w){if(w&&S.wand.includes(w)&&!nearPlayer(w,TUNE.talkDist)){const p=player();if(p&&!p.dead){setTask(p,{type:'move'});pathTo(p,w.x,w.y);p.pend={k:'gift',id:w.id,t:S.time};toast(`走向「${w.name}」，到了就送禮`);}return false;}return _gw(w);};}
{const _ww=wooWanderer;wooWanderer=function(w){const r=_ww(w);if(!r&&w&&S.wand.includes(w)&&!nearPlayer(w,TUNE.talkDist)){const p=player();if(p)p.pend={k:'woo',id:w.id,t:S.time};}return r;};}
function v46Pend(){const p=player();if(!p||!p.pend)return;const P=p.pend,w=S.wand.find(x=>x.id===P.id);if(!w||S.time-P.t>40||p.dead){p.pend=null;return;}
  if(nearPlayer(w,TUNE.talkDist)){p.pend=null;if(p.task&&p.task.type==='move')setTask(p,null);if(P.k==='gift')giftWanderer(w);else wooWanderer(w);}
  else if(!p.path.length&&p.task&&p.task.type==='move')pathTo(p,w.x,w.y);}

// ---- #81 裝備：一鍵最佳、再點一次物品直接穿上 ----
function itemScore(it){return (it.atk||0)*2+(it.hp||0)*0.25+(it.def||0)*1.5+(it.spd||0)*15;}
function equipBest(u,quiet){if(!u)return 0;let n=0;u.eq=u.eq||{};
  for(const s of ['w','a','c1','c2','f']){const t=s[0]==='c'?'c':s;const cur=u.eq[s];let best=null,bs=cur?itemScore(cur):-1;
    for(const it of S.inv){if(it.slot!==t||canWear(u,it,s))continue;const sc=itemScore(it);if(sc>bs+1e-6){bs=sc;best=it;}}
    if(best){const ot=toast;toast=()=>{};try{if(equip(u,best.id,s))n++;}finally{toast=ot;}}}
  if(!quiet)toast(n?`${nm(u)}換上了 ${n} 件更好的裝備`:`${nm(u)}身上已是最好的裝備`);bagKey=null;panelKeyCache=null;return n;}
{const _rb=renderBag;renderBag=function(){_rb();if(!bagOpen||bagTab!=='gear')return;const el=$$('bag');if(!el||el.querySelector('[data-v46="best"]'))return;const sl=el.querySelector('.slots');
  const h=`<div class="jobs"><button class="btn pri" data-v46="best">⚡ 一鍵穿上最佳</button><button class="btn" data-v46="all">⚡ 全員最佳</button><span class="dim sm">點物品看對比，再點一次＝直接穿上</span></div>`;
  if(sl)sl.insertAdjacentHTML('beforebegin',h);};}
function v46BagClick(ev){const el=$$('bag');const b=ev.target.closest('[data-v46]');
  if(b){ev.stopPropagation();const u=unitById(bagUnit)||player();if(b.dataset.v46==='best')equipBest(u);else{let n=0;const us=bagUnits().slice().sort((a,c)=>(c.kind==='player')-(a.kind==='player')||c.realm-a.realm);for(const v of us)n+=equipBest(v,true);toast(n?`全員換上 ${n} 件更好的裝備`:'大家身上已是最好的裝備');}bagKey=null;renderBag();return;}
  const it=ev.target.closest('[data-it]');if(it&&bagTab==='gear'&&String(bagPick)===it.dataset.it){ev.stopPropagation();const u=unitById(bagUnit)||player();const id=isNaN(+it.dataset.it)?it.dataset.it:+it.dataset.it;const x=S.inv.find(q=>String(q.id)===String(id));if(x&&equip(u,x.id)){bagPick=null;}bagKey=null;renderBag();}}

// ---- #29 開局自動選取主角；#20 框選含主角 ----
boxSelect=function(x0,y0,x1,y1,shift){
  const ax=Math.min(x0,x1),bx=Math.max(x0,x1),ay=Math.min(y0,y1),by=Math.max(y0,y1);const ids=[];
  for(const u of S.units){if(u.dead||u.inside)continue;const p=iso(u.x,u.y),s=worldToScreen(p.x,p.y-12);if(s.x>=ax&&s.x<=bx&&s.y>=ay&&s.y<=by)ids.push(u.id);}
  selUnits=shift?Array.from(new Set(selUnits.concat(ids))):ids;selBuilding=null;selOther=null;panelKeyCache=null;};
function v46AutoSel(){if(V46.noAuto)return;const p=player();if(p&&!p.dead&&!S.interior&&!selUnits.length&&selBuilding==null&&!selOther){selUnits=[p.id];panelKeyCache=null;}}
// 20261106e：進遊戲不再自動選取主角（避免右側面板疊開、✕ 要關多次）；副本離開仍可自動選回
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);V46.selT=-1;V46.noAuto=1;selUnits=[];selBuilding=null;selOther=null;panelKeyCache=null;return r;};}
{const _as=applySave;applySave=function(){const r=_as.apply(this,arguments);V46.selT=-1;V46.noAuto=1;selUnits=[];selBuilding=null;selOther=null;panelKeyCache=null;return r;};}
{const _dx=dgExit;dgExit=function(k){const r=_dx(k);V46.noAuto=0;V46.selT=S.time+2;v46AutoSel();return r;};}

// ---- #13 Shift 加速鏡頭 ----
{const _uc=updateCamera;updateCamera=function(dt){if(keys.ShiftLeft||keys.ShiftRight){const sp=600*dt/cam.zoom*(TUNE.camShift-1);
    if(keys.ArrowLeft)cam.x-=sp;if(keys.ArrowRight)cam.x+=sp;if(keys.ArrowUp)cam.y-=sp;if(keys.ArrowDown)cam.y+=sp;if(keys.ArrowLeft||keys.ArrowRight||keys.ArrowUp||keys.ArrowDown){cam.follow=false;cam.pan=1;}}return _uc(dt);};}// #195：Shift＋方向鍵＝加速平移

// ---- 每 0.25 秒：撤退、休整、練武防衛、集合回崗、待辦 ----
function v46Tick(dt){V46.t+=dt;if(V46.t<0.25)return;const st=V46.t;V46.t=0;
  if(S.time<V46.selT)v46AutoSel();
  v46Pend();
  for(const u of S.units){if((u.kind!=='disciple'||u.np)||u.dead)continue;
    // 集合指令 20 秒後回崗
    if(u.massT!=null&&S.time>=u.massT&&u.massSave)v46MassRestore(u);
    // 原地休整解除：被下了其他工作／待命
    if(u.rip){if(u.job||(u.holdT&&u.holdT>u.ripT+0.01)){v46Rip(u,false);}
      else if(u.rip==='auto'&&S.time-u.ripT>30&&!v46Neg(u)&&u.hp>=u.maxhp*0.9){const s=u.ripSave;v46Rip(u,false);if(s&&s.job){v46Mass=true;try{if(INJOB[s.job]&&s.jobB!=null)assignJob(u,s.job,{bid:s.jobB});else assignJob(u,s.job,s.jobRes);u.smart=s.smart;}finally{v46Mass=false;}}floater(u.x,u.y,'休整完畢','#9fe8b0');}}
    // #2 練武弟子遇襲自動迎敵，結束後回去練武（job 不變）
    if(u.job==='train'&&u.hp>u.maxhp*0.5&&(!u.task||u.task.type!=='attack')){const b=u.jobB!=null?bById(u.jobB):null;const cx=b?b.i+BUILD[b.type].size/2:u.x,cy=b?b.j+BUILD[b.type].size/2:u.y;
      const e=nearestEnemy(cx,cy,10);if(e&&!e.flee){if(u.inside)exitBuilding(u);u.task={type:'attack',eid:e.id};u.path=[];u.medit=false;u.thought='⚔';u.thT=S.time;continue;}}
    if(u.inside)continue;
    // #3/#9 重傷撤退
    if(u.retreat){const R=u.retreat;
      if(!R.dec&&u.hp>=u.maxhp*TUNE.retreatBack){R.dec=true;if(rnd()<0.5){u.retreat=null;u.medit=false;floater(u.x,u.y,'再戰！','#ffd27a');continue;}}
      if(u.hp>=u.maxhp*0.99){u.retreat=null;u.medit=false;floater(u.x,u.y,'傷癒','#9fe8b0');continue;}
      if(!u.task&&S.time-R.t>3&&nearestEnemy(u.x,u.y,3))v46Retreat(u);
      if(S.time-R.t0>90)u.retreat=null;continue;}
    if(u.hp<u.maxhp*TUNE.retreatHp&&nearestEnemy(u.x,u.y,8)){try{if((u.task&&u.task.man)||(u.xcmd&&S.time<u.xcmd.until)||(typeof xPlayerOrder==='function'&&xPlayerOrder(u))||(typeof xmvOn==='function'&&xmvOn(u)))continue;}catch(e){} if(v46Retreat(u)){floater(u.x,u.y,'撤退療傷','#ffb0a0');continue;}}
    // #74 負面狀態：停工休息
    if(!u.rip&&!S.dg&&u.job&&u.job!=='rest'&&u.job!=='follow'&&!(u.task&&u.task.type==='attack')){const ng=v46Neg(u);if(ng&&rnd()<0.5*st){v46Rip(u,true,'auto');floater(u.x,u.y,ng+'・休整','#c0b0ff');}}
}
  for(const u of S.units)if((u.kind==='disciple'&&!u.np)&&u.inside&&u.massT!=null&&S.time>=u.massT&&u.massSave)v46MassRestore(u);
  if(S.folAll&&!disciples().some(u=>u.job==='follow'))S.folAll=false;
  const m=document.querySelector('#pb_menu [data-ord="follow"]');if(m){const t=S.folAll?'🚶 取消全員跟隨':'🚶 全員跟隨';if(m.textContent!==t)m.textContent=t;}}
{const _tk=tickV045;tickV045=function(dt){_tk(dt);v46Tick(dt);};}

// ---- #85 指令按鈕：原地休整 ----
{const _jb=jobButtons;jobButtons=function(us){let h=_jb(us);const ds=us.filter(u=>u.kind==='disciple');if(!ds.length)return h;
  const on=ds.every(u=>u.rip);h=h.replace('data-job="none">待命</button></div>',`data-job="none">待命</button><button class="btn ${on?'on':''}" data-act="rip" data-tip="rip">🧘 原地休整</button></div>`);return h;};}
{const _jr=jobRadial;jobRadial=function(us){const o=_jr(us);o.push(['原地休整','🧘',()=>{us.forEach(u=>v46Rip(u,true,'cmd'));toast(`${us.length} 名弟子原地休整`);}]);return o;};}
{const _pa=panelActV045;panelActV045=function(act,b,us,el){if(act==='rip'){const ds=(us&&us.length?us:selUnits.map(unitById)).filter(u=>u&&u.kind==='disciple');const off=ds.length&&ds.every(u=>u.rip);
    ds.forEach(u=>v46Rip(u,!off,'cmd'));if(ds.length)toast(off?`${ds.length} 名弟子結束休整（待命）`:`${ds.length} 名弟子原地休整：停下來調息回血，遇敵才會出手`);panelKeyCache=null;return true;}return _pa(act,b,us,el);};}
TIPS.rip='原地休整：弟子停在原地調息，氣血每秒回 3%、心情慢慢變好；附近有敵人才會出手。下達其他工作或移動就會解除。狀態不佳（重傷、心情低落、丹毒）時弟子也會自動停工休整，好轉後回原崗位。';

// ---- #14 左鍵拖曳平移視角（不影響框選）----
// 設計：按下左鍵後「立刻拖動」＝平移視角；「按住不動約 0.2 秒再拖」或「按著 Shift／Ctrl 拖」＝框選。中鍵拖曳也能平移。
const PAN={on:false,mode:null,t:0,lx:0,ly:0,mid:false};
function v46InitPan(){const cvs=cv;
  addEventListener('pointerdown',ev=>{if(ev.pointerType!=='mouse')return;if(ev.target!==cvs)return;
    if(ev.button===0){PAN.on=true;PAN.mode=null;PAN.t=performance.now();PAN.lx=ev.clientX;PAN.ly=ev.clientY;PAN.mid=false;}
    else if(ev.button===1){PAN.on=true;PAN.mode='pan';PAN.mid=true;PAN.lx=ev.clientX;PAN.ly=ev.clientY;ev.preventDefault();}},true);
  addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse'||!PAN.on)return;
    if(!PAN.mid&&!mouse.down){PAN.on=false;return;}
    if(!PAN.mode&&Math.hypot(ev.clientX-mouse.sx,ev.clientY-mouse.sy)>6){PAN.mode='box';}
    if(PAN.mode==='pan'){if(!PAN.mid)mouse.box=false;const dx=ev.clientX-PAN.lx,dy=ev.clientY-PAN.ly;cam.x-=dx/cam.zoom;cam.y-=dy/cam.zoom;cam.follow=false;}
    PAN.lx=ev.clientX;PAN.ly=ev.clientY;});
  addEventListener('pointerup',ev=>{if(ev.pointerType!=='mouse')return;if(PAN.on&&PAN.mode==='pan'&&!PAN.mid&&ev.button===0){mouse.down=false;mouse.box=false;}if(ev.button===0||ev.button===1)PAN.on=false;},true);
  if(cvs)cvs.addEventListener('auxclick',ev=>{if(ev.button===1)ev.preventDefault();});}

// ---- 匯出／DOM 初始化 ----
{const _x=XW045;XW045=function(){const o=_x();
  try{v46InitPan();}catch(e){}
  try{const bg=$$('bag');if(bg)bg.addEventListener('click',v46BagClick,true);}catch(e){}
  Object.assign(o,{v46:V46,taskName:u=>taskName(u),boxSelect:(a,b,c,d,s)=>boxSelect(a,b,c,d,s),worldToScreen:(x,y)=>worldToScreen(x,y),equipBest,itemScore,v46Rip,v46Retreat,v46SafeSpot,v46MassRestore,v46GapOk,v46FindNode,v46Neg,get PAN(){return PAN;}});return o;};}
