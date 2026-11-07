// ===== net10：成員的室內（#12）與化身不受弟子 AI 擺布（#13） =====
// 規則：
//  - 化身進／出建築一律由房主執行（成員送 enter／exitb 意圖），房主用 enterBuildingUnit／exitBuilding 改化身的 inside／inB。
//  - 成員畫面的「室內」只由自己化身的 inside／inB 推導（每頁各自），不再套用房主存檔裡的 S.interior。
//  - 化身（u.np）不跑弟子的自動打坐（g18 v47Idle）、自動修繕、回原位等 AI；只執行成員自己下的指令。
// 全部以包裝實作，不改 g*.js。
const NET10={grace:1500};
// ---------- 房主：意圖 ----------
function netEnterAv(a,b){if(!a||a.dead||!canEnter(b))return false;if(a.inside&&a.inB===b.id)return true;
  if(a.inside)exitBuilding(a);const D=doorPt(b);
  if(dist(a.x,a.y,D.x,D.y)<1.2){a.task=null;enterBuildingUnit(a,b);}else{setTask(a,{type:'enter',bid:b.id});a._netEnter=1;}
  a._idle=0;a._m47=0;a.medit=false;return true;}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){
  if(i&&i.a==='enter'){const a=netAvatarOf(pk),b=bById(+i.bid);const r=netEnterAv(a,b);if(r)NET.stats.applied++;return r;}
  if(i&&i.a==='exitb'){const a=netAvatarOf(pk);if(!a)return false;if(a.inside)exitBuilding(a);if(a.task&&a.task.type==='enter')a.task=null;NET.stats.applied++;return true;}
  return _x.apply(this,arguments);};}
// enterStep 只在 kind==='player' 時真的進門；化身（kind 'disciple'）走到門口也要進去
{const _x=enterStep;enterStep=function(u,dt,t){const r=_x.apply(this,arguments);
  // #192：原本 enterStep 對主角在「走到大門附近（≤3.6 格）／貼到建築外框」就直接進門（enterInterior 會把人放到門口）；
  // 化身原本只認門口 2.7 格內 → 大殿等大型建築門前被擋（g21/g22 擺設、王座）時停在門外進不去。改成跟主角同一套判定。
  if(u&&u.np&&!u.task&&!u.inside&&t&&t.type==='enter'){const b=bById(t.bid);if(canEnter(b)){const D=doorPt(b),sz=(BUILD[b.type]||{}).size||2;
    if(dist(u.x,u.y,D.x,D.y)<4.0||distRect(u.x,u.y,b.i,b.j,sz)<=1.6){u.x=D.x;u.y=D.y;u.path=[];u.vx=u.vy=0;enterBuildingUnit(u,b);}}}
  return r;};}
// ---------- 化身排除弟子 AI ----------
{const _x=v47Idle;v47Idle=function(u,dt){if(u&&u.np){if(u._m47){u._m47=0;u.medit=false;}u._idle=0;return;}return _x.apply(this,arguments);};}
{const _x=doJob;doJob=function(u,dt){if(u&&u.np&&!u.job&&!u.aiJob){u.dvx=u.dvy=0;return;}return _x.apply(this,arguments);};}
// 弟子的「自衛」會自己派追擊任務；化身改成跟主角一樣：不追，只打貼身的敵人
{const _x=updateDisciple;updateDisciple=function(u,dt){if(!u||!u.np)return _x.apply(this,arguments);if(u.holdAt)u.holdAt=null;const t0=u.task;const r=_x.apply(this,arguments);
  if(u.task&&u.task!==t0&&u.task.type==='attack'&&!u.dead){u.task=u.prevTask||null;u.prevTask=null;u.path=[];u.dvx=u.dvy=0;}
  if(!u.dead&&!u.task&&!u.medit&&!u.inside&&u.cd<=0){const e=nearestEnemy(u.x,u.y,u.r+0.95);if(e){faceTo(u,e.x,e.y);if(!tryAbilities(u,e))meleeHit(u,e);}}
  return r;};}
// 宗門防衛（g20 v50DefTick／#164）會從所有弟子裡抽人迎敵；化身不被徵召
if(typeof v164Busy==='function'){const _x=v164Busy;v164Busy=function(u){if(u&&u.np)return true;return _x.apply(this,arguments);};}
// 被打時弟子會自動反擊追擊（g3 dmgUnit）；化身不自動追，只在貼身時出手（同主角）
{const _x=dmgUnit;dmgUnit=function(src,u){if(!u||!u.np||u.kind!=='disciple')return _x.apply(this,arguments);const t0=u.task,p0=u.prevTask;const r=_x.apply(this,arguments);
  if(u.task!==t0&&u.task&&u.task.type==='attack'){u.task=t0;u.prevTask=p0;u.path=[];}return r;};}
// 房主在室內時，代成員執行的動作不受房主的 S.interior 影響（例：房主在屋裡，成員在外面施法）
{const _x=netAsMember;netAsMember=function(a,fn){const si=S&&S.interior;if(!si||(a&&a.inside&&a.inB===si.bid))return _x.apply(this,arguments);
  S.interior=null;try{return _x.apply(this,arguments);}finally{if(S.interior==null)S.interior=si;}};}
// ---------- 成員：進出改送意圖，室內畫面由自己的化身推導 ----------
function netMyAv(){return NET.role==='client'&&S?netAvatarOf(NET.pkey):null;}
{const _x=goEnter;goEnter=function(b){if(NET.role!=='client')return _x.apply(this,arguments);
  const a=netMyAv();if(!a||a.dead||!canEnter(b)||S.interior||S.dg)return;
  netIntent({a:'enter',bid:b.id});NET10.t=performance.now();const D=doorPt(b);markers.push({x:D.x,y:D.y,t:0,col:'#ffe27a'});toast(`走向${roomName(b)}的大門`);};}
{const _x=exitInterior;exitInterior=function(silent){if(NET.role==='client'&&S&&S.interior&&!NET10.sync){netIntent({a:'exitb'});NET10.t=performance.now();}return _x.apply(this,arguments);};}
// 載入房主快照時不套用房主的室內狀態；化身的 inside／inB 是房主說了算，不能被本機的 restoreInterior 清掉
{const _x=restoreInterior;restoreInterior=function(d){if(NET.role!=='client')return _x.apply(this,arguments);
  const a=netMyAv(),sv=a&&{i:a.inside,b:a.inB};NET10.sync=1;try{_x.call(this,{});}finally{NET10.sync=0;}if(a&&sv){a.inside=sv.i;a.inB=sv.b;}NET10.t=0;};}
function netInteriorSync(dt){const a=netMyAv();if(!a||S.dg)return;
  const fresh=performance.now()-(NET10.t||0)<NET10.grace;
  if(a.inside&&a.inB!=null&&!S.interior&&!fresh){const b=bById(a.inB);if(canEnter(b)){const x=a.x,y=a.y;NET10.sync=1;try{enterInterior(b);}finally{NET10.sync=0;}a.x=x;a.y=y;a.inside=true;a.inB=b.id;}}
  else if(S.interior&&(!a.inside||a.inB!==S.interior.bid||a.dead)&&!fresh){NET10.sync=1;try{exitInterior(true);}finally{NET10.sync=0;}}
  if(S.interior&&a&&!a.dead)try{updateInteriorPlayer(a,dt);}catch(e){}}
{const _x=netClientUpdate;netClientUpdate=function(dt){const r=_x.apply(this,arguments);try{if(NET.role==='client')netInteriorSync(dt);}catch(e){netLog('interior err',String(e&&e.message||e));}return r;};}
// 測試掛鉤
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.test=Object.defineProperties(o.net.test||{},{interior:{get(){const a=NET.role==='client'?netMyAv():player();return {view:S&&S.interior?S.interior.bid:null,inside:!!(a&&a.inside),inB:a?a.inB:null,task:a&&a.task?a.task.type:null,medit:!!(a&&a.medit)};},configurable:true,enumerable:true}});}return o;};}
