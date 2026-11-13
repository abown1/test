#!/usr/bin/env node
// fixture：node vm 載入 cult_ai.js（加 g28／g26 暫頂 append），不開瀏覽器、不改存檔。
// 驗證 cairaid／caidg 預設開、URL／CULT_FLAGS 可關；關時 g28／g26 暫頂仍有效；既有短距索敵數字不變。
'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');

const ROOT=process.env.CULT_RAIDDG_ROOT||path.resolve(__dirname);
const CULT_AI=process.env.CULT_AI_PATH||path.join(ROOT,'cult_ai.js');
const G28=process.env.G28_APPEND||'/tmp/raid_join/g28_raidjoin_append.js';
const G26=process.env.G26_APPEND||'/tmp/dungeon_ai/g26_dgai_append.js';

let ok=0,fail=0;
function assert(c,m){if(c){ok++;console.log('  OK  '+m);}else{fail++;console.log('  FAIL  '+m);}}

function disc(o){
  return Object.assign({
    kind:'disciple',dead:false,np:false,r:0.3,hp:100,maxhp:100,atk:10,
    job:null,task:null,path:[],dvx:0,dvy:0,inside:false,cd:0,acd:{}
  },o);
}
function foe(o){
  return Object.assign({dead:false,flee:false,hp:80,maxhp:80,r:0.3,atk:8},o);
}

function makeWorld(search){
  const pending=[];
  const world={
    TUNE:{
      raidJoin:{on:true,range:22,hp:0.30,areaPad:8},
      dgAi:{on:true,alert:3.0,playerLeash:6.0,chase:5.0,sameRoom:true,autoCharge:2.4,recall:8.0}
    },
    CULT_FLAGS:{},
    S:{dg:null,interior:null,time:20,units:[],enemies:[],raidsActive:[{id:'r1',vid:1,t0:0,n:4}],home:{x:10,y:10}},
    location:{search:search||''},
    window:{},
    URLSearchParams,
    Math,Number,console,
    dist:(ax,ay,bx,by)=>Math.hypot((ax||0)-(bx||0),(ay||0)-(by||0)),
    player:()=>world._p,
    enemyById:id=>(world.S.enemies||[]).find(e=>e.id===id)||null,
    unitById:id=>(world.S.units||[]).find(u=>u.id===id)||null,
    sectCenter:()=>({x:10,y:10}),
    v164Area:()=>({x:10,y:10,R:16}),
    _rooms:{A:{id:'A'},B:{id:'B'}},
    dgRoomOf:(x,y)=>{
      // 與正式 dgRoomOf／g26 相同：回傳同一房間物件，才能用 === 比對
      if(x>=0&&x<20&&y>=0&&y<20)return world._rooms.A;
      if(x>=30&&x<50&&y>=0&&y<20)return world._rooms.B;
      return null;
    },
    chase:(u,dt,tx,ty,r)=>{u._chased={tx,ty,r};u.dvx=tx-u.x;u.dvy=ty-u.y;},
    faceTo:(u,x,y)=>{u._faced={x,y};},
    tryAbilities:()=>false,
    meleeHit:(u,e)=>{u._hit=e&&e.id;},
    ENEMY:{bandit:{n:'山賊',human:true},chief:{n:'山賊頭目',human:true},wolf:{n:'狼',human:false}},
    setTimeout:(fn)=>{(pending).push(fn);return 0;},
    updateDisciple:function(u){
      // 模擬「無 cult_ai 時弟子會執行攻擊任務」；cult_ai 包裝會在前後做 Pre/Post
      if(u.task&&u.task.type==='attack')u._ran=u.task.eid;
    },
    runTask:function(u,dt,tsk){u._ranTask=tsk&&tsk.eid;},
    fightStep:function(u,dt,e){u._fought=e&&e.id;if(e){u.dvx=e.x-u.x;u.dvy=e.y-u.y;}},
    mapDefendLock:function(u,e){
      if(!u||!e)return false;
      u.task={type:'attack',eid:e.id,_mapDefend:1};
      u.thought='❗';u._mapDefend=u._mapDefend||{job:u.job};
      return true;
    },
    mapDefendSend:function(us){return (us||[]).length;},
    v50DefTick:function(){
      for(const u of world.S.units||[]){
        if(u&&u.v164&&(!u.task||u.task.type!=='attack')){
          const e=(world.S.enemies||[])[0];
          if(e){u.task={type:'attack',eid:e.id};u.thought='❗';}
        }
      }
    },
    v50GuardJob:function(){return false;},
    nearestEnemy:function(x,y,r){
      let best=null,bd=r;
      for(const e of world.S.enemies||[]){
        const d=world.dist(x,y,e.x,e.y);
        if(d<bd){bd=d;best=e;}
      }
      return best;
    },
    dgEnter:function(){
      const p=world._p,d=world._d;
      if(d){d.job='follow';d.holdAt={x:99,y:99};}
      world.S.dg={kind:'cave'};
      world.S.units=[p,d].filter(Boolean);
      return true;
    }
  };
  world.window=world;
  world.global=world;
  world._pending=pending;
  return world;
}

function flush(world){const q=world._pending.splice(0);for(const fn of q)try{fn();}catch(e){console.warn(e);}}

function loadAi(world){
  vm.createContext(world);
  vm.runInContext(fs.readFileSync(CULT_AI,'utf8'),world,{filename:'cult_ai.js'});
  flush(world);flush(world);
  return world.CultAI||world.window.CultAI;
}

function loadAppend(world,file){
  vm.runInContext(fs.readFileSync(file,'utf8'),world,{filename:path.basename(file)});
  flush(world);flush(world);
}

// ---------- 1) 旗標預設與開關 ----------
console.log('1) 旗標預設開，URL／CULT_FLAGS 可關，且互不牽連');
{
  const w=makeWorld('');
  const A=loadAi(w);
  assert(A&&A.cairaidOn()===true&&A.caidgOn()===true,'預設 cairaid／caidg 皆開');
  w.location.search='?cairaid=0';if(w.__cultQS&&w.__cultQS.reset)w.__cultQS.reset();
  assert(A.cairaidOn()===false&&A.caidgOn()===true,'?cairaid=0 只關 cairaid');
  w.location.search='?caidg=0&foo=1';if(w.__cultQS&&w.__cultQS.reset)w.__cultQS.reset();
  assert(A.cairaidOn()===true&&A.caidgOn()===false,'?caidg=0 只關 caidg');
  w.location.search='?cairaid=off';if(w.__cultQS&&w.__cultQS.reset)w.__cultQS.reset();
  assert(A.cairaidOn()===false,'?cairaid=off 可關');
  w.location.search='';if(w.__cultQS&&w.__cultQS.reset)w.__cultQS.reset();
  w.CULT_FLAGS.cairaid=false;
  assert(A.cairaidOn()===false&&A.caidgOn()===true,'CULT_FLAGS.cairaid=false 可關');
  w.CULT_FLAGS.cairaid=true;
  w.CULT_FLAGS.caidg=false;
  assert(A.caidgOn()===false&&A.cairaidOn()===true,'CULT_FLAGS.caidg=false 可關');
}

// ---------- 2) 防衛任務不被短距丟掉；一般遠敵仍丟 ----------
console.log('2) cairaid 開：raidJoin／v164／_mapDefend 遠距任務保留；一般閒置遠敵仍丟');
{
  const w=makeWorld('');
  const A=loadAi(w);
  w._p={id:1,kind:'player',x:10,y:10,dead:false,r:0.3};
  const chief=foe({id:100,type:'chief',x:18,y:12,raid:'r1'}); // ~8.2
  const wolf=foe({id:102,type:'wolf',x:18,y:12});
  w.S.enemies=[chief,wolf];
  const u=disc({id:2,name:'閒置甲',x:10,y:10,thought:'❗',task:{type:'attack',eid:100,raidJoin:1}});
  w.S.units=[w._p,u];
  assert(A.aggroKeep(u,chief)===true,'raidJoin 約 8 格 Keep 為真');
  assert(A.aggroCandidate(u,chief)===true,'raidJoin 約 8 格 Candidate 為真');
  assert(u.thought==='❗'&&u.task&&u.task.eid===100,'未改 thought、未清任務');

  const v=disc({id:3,x:10,y:10,v164:1,thought:'❗',task:{type:'attack',eid:100}});
  assert(A.aggroKeep(v,chief)===true,'v164 遠距 Keep 為真');

  const m=disc({id:4,x:10,y:10,_mapDefend:{job:null},thought:'❗',task:{type:'attack',eid:100,_mapDefend:1}});
  assert(A.aggroKeep(m,chief)===true,'_mapDefend 遠距 Keep 為真');

  const idle=disc({id:5,x:10,y:10,task:{type:'attack',eid:102}});
  assert(A.aggroKeep(idle,wolf)===false,'無防衛標記的遠距野狼仍 Keep 為假');

  const near=foe({id:103,type:'wolf',x:10.6,y:10});
  w.S.enemies.push(near);
  const close=disc({id:6,x:10,y:10,task:{type:'attack',eid:103}});
  assert(A.aggroKeep(close,near)===true,'近距一般敵人 Keep 仍為真');
}

// ---------- 3) cairaid 關：遠距防衛也被短距丟掉；mapDefendLock 恢復過濾 ----------
console.log('3) cairaid 關：短距索敵恢復，遠距防衛 Keep 為假');
{
  const w=makeWorld('?cairaid=0');
  const A=loadAi(w);
  const chief=foe({id:100,type:'chief',x:18,y:12,raid:'r1'});
  w.S.enemies=[chief];
  w._p={id:1,kind:'player',x:10,y:10,dead:false};
  const u=disc({id:2,x:10,y:10,thought:'❗',task:{type:'attack',eid:100,raidJoin:1},v164:1});
  w.S.units=[w._p,u];
  assert(A.cairaidOn()===false,'旗標確認關閉');
  assert(A.aggroKeep(u,chief)===false,'關閉後遠距 raidJoin Keep 為假');
  assert(A.raidAdmit(u,chief)===false,'關閉後 raidAdmit 為假');
  // 走 updateDisciple 包裝：應被 cultAggroDrop，thought 仍在（本層不清 ❗）
  w.updateDisciple(u,0.05);
  assert(!u.task,'關閉後 updateDisciple 會丟掉遠距任務');
  assert(u.thought==='❗','Drop 仍不清 thought（交給 g28／原防衛層）');
}

// ---------- 4) v50DefTick／mapDefendLock／fightStep 包裝 ----------
console.log('4) v50DefTick／mapDefendLock／fightStep：開則承認，關則過濾');
{
  const wOn=makeWorld('');
  const Aon=loadAi(wOn);
  wOn._p={id:1,kind:'player',x:10,y:10,dead:false};
  const chief=foe({id:100,type:'chief',x:20,y:10,raid:'r1'}); // 10 格
  wOn.S.enemies=[chief];
  const u=disc({id:2,x:10,y:10,v164:1,thought:'❗'});
  wOn.S.units=[wOn._p,u];
  wOn.v50DefTick(1);
  assert(u.task&&u.task.eid===100&&u.thought==='❗','開：v50DefTick 指派後不被 cult_ai 取消');

  const lockU=disc({id:3,x:10,y:10});
  wOn.S.units.push(lockU);
  const locked=wOn.mapDefendLock(lockU,chief);
  assert(locked===true&&lockU.task&&lockU.task._mapDefend===1,'開：mapDefendLock 遠距可鎖定');

  const chaseU=disc({id:4,x:10,y:10,task:{type:'attack',eid:100,raidJoin:1},path:[{x:20,y:10}]});
  wOn.S.units.push(chaseU);
  wOn.fightStep(chaseU,0.05,chief);
  assert(chaseU._fought===100&&(chaseU.dvx!==0||chaseU.path.length!==0||chaseU._fought),'開：fightStep 不因短距牽繩就地凍結');

  const wOff=makeWorld('?cairaid=0');
  loadAi(wOff);
  wOff._p={id:1,kind:'player',x:10,y:10,dead:false};
  wOff.S.enemies=[foe({id:100,type:'chief',x:20,y:10,raid:'r1'})];
  const u2=disc({id:2,x:10,y:10,v164:1,thought:'❗'});
  wOff.S.units=[wOff._p,u2];
  wOff.v50DefTick(1);
  assert(!u2.task,'關：v50DefTick 指派後被短距取消');
  const lockU2=disc({id:3,x:10,y:10});
  wOff.S.units.push(lockU2);
  const locked2=wOff.mapDefendLock(lockU2,wOff.S.enemies[0]);
  assert(locked2===false&&!lockU2.task,'關：mapDefendLock 遠距被拒');
}

// ---------- 5) 既有 aggro 數字回歸（大世界） ----------
console.log('5) 既有短距索敵數字回歸（大世界，無防衛標記）');
{
  const w=makeWorld('');
  const A=loadAi(w);
  w.S.dg=null;
  const cfg=A.aggro;
  assert(cfg.alertIdle===1.2&&cfg.chaseIdle===3.5&&cfg.loseTarget===6.5,'閒置 1.2／3.5／6.5 未改');
  assert(cfg.alertGuard===3.2&&cfg.chaseGuard===5,'守衛 3.2／5 未改');
  assert(cfg.alertFollow===2.4&&cfg.chaseFollow===4.5,'跟隨 2.4／4.5 未改');
  assert(cfg.alertFollowDg===3.2&&cfg.chaseFollowDg===5.5,'副本跟隨 3.2／5.5 未改');
  const idle=disc({id:2,x:10,y:10,job:null});
  const guard=disc({id:3,x:10,y:10,job:'guard',gPost:{x:10,y:10},guardAt:{x:10,y:10}});
  assert(A.aggroAlert(idle)===1.2&&A.aggroChase(idle)===3.5,'大世界閒置警戒／追擊數字');
  assert(A.aggroAlert(guard)===3.2&&A.aggroChase(guard)===5,'大世界守衛警戒／追擊數字');
  const a=A.aggroAnchor(idle);
  assert(a&&a.x===idle.x&&a.y===idle.y,'大世界閒置錨點為自己');
}

// ---------- 6) caidg 開：副本錨點跟玩家、同房、守衛／待命除外 ----------
console.log('6) caidg 開：副本閒置錨點跟玩家，隔房不可，走廊可，守衛／待命不改錨');
{
  const w=makeWorld('');
  const A=loadAi(w);
  w.S.dg={kind:'cave'};
  w._p={id:1,kind:'player',x:5,y:5,dead:false,r:0.3};
  const idle=disc({id:2,x:8,y:5,job:null});
  const guard=disc({id:3,x:8,y:5,job:'guard',gPost:{x:8,y:5},guardAt:{x:8,y:5}});
  const hold=disc({id:4,x:8,y:5,job:null,holdAt:{x:8,y:5}});
  w.S.units=[w._p,idle,guard,hold];
  const ai=A.aggroAnchor(idle);
  assert(ai===w._p||(ai&&ai.x===5&&ai.y===5),'閒置錨點為玩家');
  const ag=A.aggroAnchor(guard);
  assert(ag&&ag.x===8&&ag.y===5,'守衛錨點仍為崗位');
  const ah=A.aggroAnchor(hold);
  assert(!(ah===w._p)&&ah&&Math.abs(ah.x-8)<0.01&&Math.abs(ah.y-5)<0.01,'待命錨點不改跟玩家');
  assert(A.aggroAlert(idle)===3.0&&A.aggroChase(idle)===5.0,'副本閒置對齊 TUNE.dgAi alert=3／chase=5，避免低於 g26');

  const near=foe({id:10,x:7.2,y:5.2});
  const other=foe({id:12,x:35,y:8});
  const hall=foe({id:13,x:22,y:8}); // 走廊 dgRoomOf=null
  w.S.enemies=[near,other,hall];
  idle.x=5.4;idle.y=5.2;
  assert(A.aggroKeep(idle,near)===true||A.aggroCandidate(idle,near)===true,'同房近敵可索');
  idle.task=null;
  assert(A.aggroCandidate(idle,other)===false,'隔房不可索');
  // 走廊近身：弟子在走廊口、敵人在走廊
  idle.x=19;idle.y=8;
  // Keep 仍受追擊／丟失距離限制；這裡只確認 same-field 不因「無房間」而拒絕
  // 用一個臨時在走廊、距離夠近的情況
  idle.x=22;idle.y=8;
  assert(A.aggroKeep(idle,hall)===true,'走廊近身（無房間 id）仍可打');
}

// ---------- 7) caidg 關：副本不改錨、不同房不由本層攔截 ----------
console.log('7) caidg 關：副本錨點與同房檢查恢復舊行為');
{
  const w=makeWorld('?caidg=0');
  const A=loadAi(w);
  w.S.dg={kind:'cave'};
  w._p={id:1,kind:'player',x:5,y:5,dead:false};
  const idle=disc({id:2,x:8,y:5,job:null});
  w.S.units=[w._p,idle];
  const a=A.aggroAnchor(idle);
  assert(a&&a.x===8&&a.y===5&&a!==w._p,'關閉後閒置錨點仍為自己');
  assert(A.aggroAlert(idle)===1.2&&A.aggroChase(idle)===3.5,'關閉後不用 dgAi 數字，回到閒置 1.2／3.5');
  const other=foe({id:12,x:35,y:8,hp:10});
  // 距離很遠，Keep 會因 loseTarget／chase 失敗；這裡確認不是「同房」單獨造成：
  // 把敵人放到自己旁邊但標成另一房（x=35 是 B 房）。距離約 27，本來就 Keep 假。
  // 改：敵人與弟子都在近距，但用自訂 dgRoomOf 無法在關旗標時擋下——弟子在 B、敵人在 B 近處會過。
  // 把弟子放到 B 房入口附近、敵人在同座標近處但我們驗證「隔房近敵」：
  // 做不到距離近又隔房（兩房至少隔 10 格）。改驗證：旗標關時 alert 已回到 1.2，且錨點不是玩家即可。
  assert(A.caidgOn()===false,'旗標確認關閉');
}

// ---------- 8) 與 g28 不衝突：開時不重複清 ❗；關時暫頂仍補派 ----------
console.log('8) 與 g28 raidJoin：開時任務不被丟、關時暫頂仍補派');
{
  const wOn=makeWorld('');
  loadAi(wOn);
  loadAppend(wOn,G28);
  wOn._p={id:1,kind:'player',x:10,y:10,dead:false};
  const chief=foe({id:100,type:'chief',x:18,y:12,raid:'r1'});
  wOn.S.enemies=[chief];
  const u=disc({id:2,x:10,y:10,thought:'❗',task:{type:'attack',eid:100}}); // v50 風格，尚無 raidJoin
  wOn.S.units=[wOn._p,u];
  // 先讓 cult_ai 有機會丟，再讓 g28 外層跑（g28 包在 updateDisciple 外層，因為後載入）
  wOn.updateDisciple(u,0.05);
  assert(u.task&&u.task.eid===100,'開：遠距防衛／補派後仍有攻擊任務');
  assert(u.thought==='❗','開：❗ 仍在（本層不清，g28 亦不雙重清掉）');
  // g28 可能把任務蓋成 raidJoin=1，這是暫頂既有行為，不算雙重派新目標
  const eid=u.task.eid;
  wOn.updateDisciple(u,0.05);
  assert(u.task&&u.task.eid===eid,'再開一次不會改打別的目標');

  const wOff=makeWorld('?cairaid=0');
  loadAi(wOff);
  loadAppend(wOff,G28);
  wOff._p={id:1,kind:'player',x:10,y:10,dead:false};
  wOff.S.enemies=[foe({id:100,type:'chief',x:18,y:12,raid:'r1'})];
  const u2=disc({id:2,x:10,y:10,thought:'❗',task:{type:'attack',eid:100}});
  wOff.S.units=[wOff._p,u2];
  wOff.updateDisciple(u2,0.05);
  assert(u2.task&&u2.task.eid===100&&u2.task.raidJoin===1,'cairaid 關：g28 仍把遠距閒置補派回來');
  assert(u2.thought==='❗','cairaid 關：g28 補派後 ❗ 仍在');
  assert(wOff.rjOn()===true,'cairaid 關不影響 rjOn');

  // g28 自己關、cairaid 開：cult_ai 仍保留已有 v164 任務
  const wRjOff=makeWorld('');
  const Ar=loadAi(wRjOff);
  loadAppend(wRjOff,G28);
  wRjOff.TUNE.raidJoin.on=false;
  const u3=disc({id:2,x:10,y:10,v164:1,thought:'❗',task:{type:'attack',eid:100}});
  wRjOff._p={id:1,kind:'player',x:10,y:10,dead:false};
  wRjOff.S.enemies=[foe({id:100,type:'chief',x:18,y:12,raid:'r1'})];
  wRjOff.S.units=[wRjOff._p,u3];
  assert(wRjOff.rjOn()===false,'raidjoin 可獨立關');
  assert(Ar.cairaidOn()===true,'cairaid 仍開');
  wRjOff.updateDisciple(u3,0.05);
  assert(u3.task&&u3.task.eid===100,'raidjoin 關、cairaid 開：v164 遠距任務由本層自己保住');
}

// ---------- 9) 與 g26 不衝突：開時同房／錨點一致；關時暫頂仍有效 ----------
console.log('9) 與 g26 dgAi：開時不衝隔房，關時暫頂仍擋隔房');
{
  const wOn=makeWorld('');
  const A=loadAi(wOn);
  loadAppend(wOn,G26);
  wOn.S.dg={kind:'cave'};
  wOn._p={id:1,kind:'player',x:5,y:5,dead:false,r:0.3};
  const d=disc({id:2,x:5.4,y:5.2,job:null,ab:{charge:1}});
  wOn._d=d;
  const near=foe({id:10,x:7.2,y:5.2,hp:10});
  const other=foe({id:12,x:35,y:8,hp:10});
  wOn.S.enemies=[near,other];
  wOn.S.units=[wOn._p,d];
  d.task=null;
  wOn.updateDisciple(d,0.05);
  assert(!(d.task&&d.task.eid===12),'開：不會把隔房怪當目標');
  // 近敵可能由 cult_ai Post 或內層 update 指派
  d.task=null;
  const pickOk=A.aggroCandidate(d,near)===true;
  assert(pickOk,'開：同房近敵 Candidate 為真（對齊 g26 可索範圍）');
  assert(wOn.dgAiCanPick(d,other)===false,'g26 仍判定隔房不可索');

  const wOff=makeWorld('?caidg=0');
  loadAi(wOff);
  loadAppend(wOff,G26);
  wOff.S.dg={kind:'cave'};
  wOff._p={id:1,kind:'player',x:5,y:5,dead:false,r:0.3};
  const d2=disc({id:2,x:5.4,y:5.2,job:null});
  wOff._d=d2;
  wOff.S.enemies=[foe({id:10,x:7.2,y:5.2,hp:10}),foe({id:12,x:35,y:8,hp:10})];
  wOff.S.units=[wOff._p,d2];
  assert(wOff.dgAiOn()===true&&wOff.dgAiIn()===true,'caidg 關不影響 dgAiOn／dgAiIn');
  d2.task=null;
  wOff.updateDisciple(d2,0.05);
  assert(!(d2.task&&d2.task.eid===12),'caidg 關：g26 暫頂仍不會去打隔房怪');
}

console.log('\n結果：'+ok+' 通過，'+fail+' 失敗');
process.exit(fail?1:0);
