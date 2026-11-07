// ================== v0.4.x map：獨立副本地 dgArea（P1–P4）==================
// 旗 S.map.flags.dgArea 預設 false：所有 wrap 原樣轉呼叫，overlay 行為不變。
//
// 聯機契約（仙武聯機 / net5）：
// 1) S.owArea 必須與 S.dg.W 是同一物件（===），含 netDgAfterEnter 過濾後的 units。
//    不可另複製一份 roster（netInR / netDgLeaveNow 只讀 D.W）。
// 2) S.dgArea 獨立於 S.dg。netInR('ow')／netWorldSnap 會暫時把 S.dg 設成 null，
//    snapshot 不可只靠 if(S.dg) 才寫 dgArea。第一期只做單機存讀；
//    聯機進行中副本的存檔維持現況（不寫、不套用 dgArea）。
// 3) 保留 S.dg 外殼（net10 室內互斥看 S.dg）。
// 4) 格子固定 N×N，不新增 dgN（net5 假設 N×N）。
// 5) 不呼叫 netInR；離場一律 call-through 既有 dgExit，不旁路。
//
// special／xf 掛點：優先 mapSpecialHook／mapSpecialOnEnter／XWMAP_SPECIAL；
// 尚未就緒則走現有 xf 路徑（mapXfInstall）並留下 hook。

function mapDgAreaOn(){
  try{return typeof mapFlag==='function'&&!!mapFlag('dgArea');}catch(e){return false;}
}
function mapDgAreaCoopLive(){
  try{
    if(typeof NET!=='undefined'&&NET){
      if(NET.role==='host'||NET.role==='client')return true;
      // Live room / socket — not a leftover wid (wid can linger after leaving).
      if(NET.tr||NET.socket||NET.sock||NET.room||NET.peer)return true;
      if(NET._owD||NET._inR||(NET.dgPark&&NET.dgPark.D))return true;
      if(NET.hostGone||NET._hostLost||NET.mig)return true;
    }
  }catch(e){}
  try{if(typeof NET16!=='undefined'&&NET16&&NET16.mig)return true;}catch(e){}
  try{
    if(typeof netDgRun==='function'&&typeof NET!=='undefined'&&NET){
      const R=netDgRun();
      if(R&&(R===NET._owD||(NET.dgPark&&R===NET.dgPark.D)))return true;
    }
  }catch(e){}
  return false;
}
/** Co-op snapshot / world-rec markers (netHostLost and netMigHost call applySave with these). */
function mapDgAreaCoopPayload(d){
  if(!d)return false;
  try{
    // net05/netMap appear on every snapshot, including solo — do not treat mere presence as co-op.
    if(d.coop||d.netCoop||d._net||d.netWid)return true;
    const n=d.net05;
    if(n&&(n.owner||(n.av&&n.av.length)))return true;
    const f=d.flags||{};
    if(f.netWid||f.netOwner||f.net)return true;
    if(d.map&&(d.map.net||(d.map.flags&&(d.map.flags.netWid||d.map.flags.netOwner))))return true;
    if(d.dgArea&&(d.dgArea.net||d.dgArea.coop||d.dgArea._net))return true;
  }catch(e){}
  return false;
}
function mapDgAreaCoopContext(d){
  return mapDgAreaCoopLive()||mapDgAreaCoopPayload(d);
}
function mapDgAreaIsXf(kind){
  return kind==='xf';
}

/** 旗開時走獨立副本地的副本：經典 cave/jail/ruin/xf + 全體 MAP_DGS */
function mapDgAreaApplies(kind){
  if(!kind){
    try{if(typeof S!=='undefined'&&S&&S.dg&&S.dg.kind)kind=S.dg.kind;}catch(e){}
  }
  if(!kind)return false;
  if(kind==='xf'||kind==='cave'||kind==='jail'||kind==='ruin')return true;
  try{if(typeof MAP_DGS!=='undefined'&&MAP_DGS&&MAP_DGS[kind])return true;}catch(e){}
  try{if(typeof DGS!=='undefined'&&DGS&&DGS[kind]&&(DGS[kind]._map||DGS[kind].type))return true;}catch(e){}
  return false;
}

/**
 * special 掛點。進殿傳送（placeDoor／bossRoom／teleport）只轉呼叫
 * mapSpecialPlaceAtDoor／mapXfPlaceAtDoor，dgArea 不自行擺單位。
 */
function mapDgAreaCallSpecial(phase, payload){
  payload=payload||{};
  try{
    if(phase==='placeDoor'||phase==='bossRoom'||phase==='teleport'){
      const r=payload.room||payload.r||null;
      if(typeof mapSpecialPlaceAtDoor==='function')return mapSpecialPlaceAtDoor(r);
      if(typeof mapXfPlaceAtDoor==='function')return mapXfPlaceAtDoor(r);
      return null;
    }
    if(typeof mapSpecialHook==='function')return mapSpecialHook(phase,payload);
    if(phase==='enter'&&typeof mapSpecialOnEnter==='function')return mapSpecialOnEnter(payload);
    if(phase==='prepare'&&typeof mapSpecialPrepare==='function')return mapSpecialPrepare(payload);
    if(phase==='enter'&&typeof mapSpecialEnsureEvac==='function'&&payload.D)return mapSpecialEnsureEvac(payload.D);
    const root=(typeof window!=='undefined')?window:(typeof globalThis!=='undefined'?globalThis:null);
    const api=root&&(root.XWMAP_SPECIAL||(root.XWMAP&&root.XWMAP.special));
    if(api){
      if(typeof api.hook==='function')return api.hook(phase,payload);
      if(typeof api[phase]==='function')return api[phase](payload);
      if((phase==='placeDoor'||phase==='bossRoom'||phase==='teleport')&&typeof api.place==='function')return api.place(payload.room||payload.r);
    }
  }catch(e){}
  try{if((payload.kind==='xf'||mapDgAreaIsXf(payload.kind))&&typeof mapXfInstall==='function')mapXfInstall();}catch(e){}
  return null;
}

function mapDgAreaActiveRun(){
  try{if(typeof S!=='undefined'&&S&&S.dg)return S.dg;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET._owD)return NET._owD;}catch(e){}
  try{if(typeof netDgRun==='function')return netDgRun();}catch(e){}
  return null;
}

function mapDgAreaHashU8(a){
  if(!a||a.length==null)return '0';
  let h=2166136261;
  for(let i=0;i<a.length;i++){h^=a[i]&255;h=Math.imul(h,16777619);}
  return (h>>>0).toString(16);
}
function mapDgAreaHashWorld(){
  const units=(typeof S!=='undefined'&&S&&S.units)?S.units:[];
  const blds=(S&&S.buildings)?S.buildings:[];
  const raids=(S&&S.raidsActive)?S.raidsActive:[];
  let blk='na';
  try{if(typeof block!=='undefined'&&block)blk=mapDgAreaHashU8(block);}catch(e){}
  return {
    block:blk,
    units:JSON.stringify(units.map(u=>[u.id,+(+u.x).toFixed(3),+(+u.y).toFixed(3),u.kind||''])),
    buildings:JSON.stringify(blds.map(b=>[b.id,b.type,b.i,b.j,b.hp|0])),
    raids:JSON.stringify(raids.map(r=>r&&[r.id,r.type,r.wave||r.n||0]))
  };
}

function mapDgAreaPick(u, keys){
  if(typeof pickKeys==='function'&&keys)return pickKeys(u,keys);
  const o={};if(!u)return o;
  for(const k of (keys||[]))if(u[k]!==undefined)o[k]=u[k];
  return o;
}

function mapDgAreaCaptureLive(D){
  D=D||mapDgAreaActiveRun();
  const prev=(typeof S!=='undefined'&&S)?S.dgArea:null;
  if(!D||!D.L)return prev||null;
  const NN=(typeof N==='number'&&N>0)?N:128;
  const fl=D.L.fl||null;
  const bl=D.L.block||((typeof block!=='undefined')?block:null);
  const keysU=(typeof UNIT_KEEP!=='undefined')?UNIT_KEEP:['id','kind','name','body','hp','maxhp','atk','speed','realm','x','y','job','dead','sub'];
  const keysE=(typeof EN_KEEP!=='undefined')?EN_KEEP:['id','type','hp','maxhp','atk','speed','realm','x','y','home','name'];
  let rooms=[];
  try{
    rooms=(D.L.rooms||[]).map(r=>{
      const o={};
      for(const k of ['k','boss','state','w','h','cx','cy','x0','y0','bossVariant','bossType','bossN'])if(r[k]!==undefined)o[k]=r[k];
      return o;
    });
  }catch(e){rooms=[];}
  let camO=null;
  try{if(typeof cam!=='undefined')camO={x:cam.x,y:cam.y,zoom:cam.zoom};}catch(e){}
  const liveUnits=(typeof S!=='undefined'&&S&&S.units&&S.dg===D)?S.units:(null);
  const liveEn=(typeof S!=='undefined'&&S&&S.enemies&&S.dg===D)?S.enemies:(null);
  return {
    kind:D.kind,hard:!!D.hard,tier:D.tier,t:D.t||0,cleared:!!D.cleared,
    loot:D.loot?JSON.parse(JSON.stringify(D.loot)):{res:{},mats:{},items:[],misc:{}},
    party:D.party,ent:D.ent?{x:D.ent.x,y:D.ent.y}:null,
    exitP:D.exitP?{x:D.exitP.x,y:D.exitP.y}:null,
    exitOpen:!!D.exitOpen,armed:!!D.armed,down:D.down||0,lost:D.lost||0,
    boss:D.boss,end:D.end||null,
    rooms:rooms,
    fl:fl?Array.from(fl):null,
    block:bl?Array.from(bl):null,
    n:NN,
    units:liveUnits?liveUnits.map(u=>mapDgAreaPick(u,keysU)):(prev&&prev.units)||[],
    enemies:liveEn?liveEn.map(e=>mapDgAreaPick(e,keysE)):(prev&&prev.enemies)||[],
    cam:camO
  };
}

function mapDgAreaBindOw(D){
  if(!D||!D.W)return null;
  S.owArea=D.W;
  return S.owArea;
}

function mapDgAreaAsserts(){
  const D=typeof S!=='undefined'&&S?S.dg:null;
  const out={
    flagDefault:(typeof MAP_FLAGS_DEFAULT!=='undefined')&&MAP_FLAGS_DEFAULT.dgArea===false,
    sameOw:!D||!S.owArea||S.owArea===D.W,
    sameOwUnits:!D||!S.owArea||!D.W||S.owArea.units===D.W.units,
    noDgN:!(S&&S.dgArea&&S.dgArea.dgN),
    nSquare:!S||!S.dgArea||!S.dgArea.block||(typeof N!=='number')||S.dgArea.block.length===N*N,
    hasShell:!D||!!S.dg,
    independentArea:(!S||!S.dgArea)||(S.dgArea!==S.dg&&!(S.dg&&S.dg.dgArea===S.dgArea))
  };
  return out;
}

function mapDgAreaAfterEnter(kind){
  if(mapDgAreaCoopLive())return false;
  const D=S&&S.dg;
  if(!D)return false;
  mapDgAreaCallSpecial('enter',{kind:kind||D.kind,D:D});
  S.scene='dg';
  mapDgAreaBindOw(D);
  S.dgArea=mapDgAreaCaptureLive(D);
  D._dgArea=1;
  try{
    const a=mapDgAreaAsserts();
    if(!a.sameOw||!a.sameOwUnits)console.warn('[dgArea] contract: owArea!==S.dg.W');
    if(!a.nSquare)console.warn('[dgArea] contract: block not N×N');
  }catch(e){}
  return true;
}

function mapDgAreaRestoreFromSave(d){
  if(mapDgAreaCoopContext(d))return false;
  const A=d&&d.dgArea;if(!A)return false;
  if(!S.dg&&d.dg&&typeof dgFromSave==='function'){
    try{S.dg=dgFromSave(d.dg);}catch(e){}
  }
  const D=S.dg;if(!D)return false;
  const W={
    units:(S.units||[]).slice(),
    enemies:(S.enemies||[]).slice(),
    npcs:(S.npcs||[]).slice(),
    wand:(S.wand||[]).slice(),
    cands:(S.cands||[]).slice(),
    buildings:(S.buildings||[]).slice(),
    vstructs:(S.vstructs||[]).slice(),
    raids:S.raidsActive||[],
    proj:(typeof projectiles!=='undefined'&&projectiles)?projectiles.slice():[],
    eff:(typeof effects!=='undefined'&&effects)?effects.slice():[],
    block:(typeof block!=='undefined'&&block&&block.slice)?block.slice():null,
    comp:(typeof comp!=='undefined'&&comp&&comp.slice)?comp.slice():null,
    occ:(typeof occ!=='undefined'&&occ&&occ.slice)?occ.slice():[],
    ng:(typeof nodeGrid!=='undefined'&&nodeGrid&&nodeGrid.slice)?nodeGrid.slice():[],
    exp:(typeof explored!=='undefined'&&explored&&explored.slice)?explored.slice():null,
    startComp:typeof startComp!=='undefined'?startComp:0,
    cam:typeof cam!=='undefined'?{x:cam.x,y:cam.y,zoom:cam.zoom}:{x:0,y:0,zoom:1},
    time:S.time,
    buildMode:typeof buildMode!=='undefined'?buildMode:null
  };
  const byId={};for(const u of W.units)if(u)byId[u.id]=u;
  const party=[];
  const live=D.live&&D.live.fmt===1?D.live:null;
  for(const su of (live?live.units:(A.units||[]))){
    let u=byId[su.id];
    if(!u){
      try{
        if(su.kind==='player'&&typeof makePlayer==='function')u=Object.assign(makePlayer(su.x,su.y),su,{path:[],acd:{}});
        else if(typeof makeDisciple==='function')u=Object.assign(makeDisciple(su.x,su.y,su.body||0),su,{path:[],acd:{}});
        else u=su;
      }catch(e){u=su;}
      if(u&&!W.units.includes(u))W.units.push(u);
    }
    if(!u)continue;
    if(!u.dgSave)u.dgSave={x:u.x,y:u.y,job:u.job,jobB:u.jobB,jobRes:u.jobRes,guardAt:u.guardAt,holdAt:u.holdAt,aiJob:u.aiJob};
    if(live)Object.assign(u,su,{path:[],target:null,vx:0,vy:0,dvx:0,dvy:0});
    if(su.x!=null)u.x=su.x;if(su.y!=null)u.y=su.y;
    if(su.hp!=null)u.hp=su.hp;if(su.maxhp!=null)u.maxhp=su.maxhp;
    party.push(u);
  }
  D.W=W;
  try{
    const OW=d.dgOw;
    if(OW&&OW.block&&W.block&&OW.block.length===W.block.length)W.block.set(OW.block);
    if(OW&&OW.comp&&W.comp&&OW.comp.length===W.comp.length)W.comp.set(OW.comp);
    if(OW&&OW.exp&&W.exp&&OW.exp.length===W.exp.length)W.exp.set(OW.exp);
  }catch(e){}
  S.owArea=D.W;
  if(A.block&&typeof block!=='undefined'&&block&&A.block.length===block.length)block.set(A.block);
  D.L=D.L||{};
  if(A.fl)D.L.fl=Uint8Array.from(A.fl);
  if(A.block)D.L.block=Uint8Array.from(A.block);
  if(A.rooms)D.L.rooms=A.rooms;
  D.queue=(D.queue||[]).map(q=>({...q,r:D.L.rooms[Number.isInteger(q.room)?q.room:(q.r&&q.r.k)]})).filter(q=>q.r);
  D.L.kind=A.kind||D.kind;
  try{if(typeof computeComp==='function')computeComp();}catch(e){}
  try{if(typeof occ!=='undefined'&&occ&&occ.fill)occ.fill(null);}catch(e){}
  try{if(typeof nodeGrid!=='undefined'&&nodeGrid&&nodeGrid.fill)nodeGrid.fill(null);}catch(e){}
  try{if(typeof explored!=='undefined'&&explored&&explored.fill)explored.fill(1);}catch(e){}
  S.units=party;
  S.enemies=(live?live.enemies:(A.enemies||[])).map(o=>{
    try{
      if(!o||!o.type)return null;
      if(typeof makeEnemy==='function')return Object.assign(makeEnemy(o.type,o.x,o.y),o,{path:[],target:null});
      return o;
    }catch(e){return null;}
  }).filter(Boolean);
  S.buildings=[];S.vstructs=[];S.npcs=[];S.wand=[];S.cands=[];S.raidsActive=[];
  if(typeof projectiles!=='undefined')projectiles=[];
  if(typeof effects!=='undefined')effects=[];
  if(live){if(Number.isFinite(live.time))S.time=live.time;D.pre=typeof dgClone==='function'?dgClone(d):JSON.parse(JSON.stringify(d));delete D.pre.dg;delete D.pre.dgArea;delete D.live;}
  D.kind=A.kind||D.kind;D.ent=A.ent||D.ent;D.exitP=A.exitP||D.exitP;
  D.cleared=!!A.cleared;if(A.loot)D.loot=A.loot;D.boss=A.boss;D.armed=!!A.armed;
  if(A.t!=null)D.t=A.t;D._dgArea=1;
  try{
    if(A.cam&&typeof cam!=='undefined'){cam.x=A.cam.x;cam.y=A.cam.y;if(A.cam.zoom)cam.zoom=A.cam.zoom;cam.follow=true;}
    else if(typeof player==='function'&&typeof iso==='function'){const p=player();if(p){const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}}
  }catch(e){}
  try{if(typeof document!=='undefined'&&document.body)document.body.classList.add('indg');}catch(e){}
  S.scene='dg';
  S.dgArea=mapDgAreaCaptureLive(D);
  return S.owArea===D.W;
}


/** Solo-only: turn the flag on and restore dgArea. No-op in any co-op/migration context. */
function mapDgAreaApplySavedArea(d){
  if(!d||!d.dgArea)return false;
  if(mapDgAreaCoopContext(d))return false;
  try{
    if(typeof S!=='undefined'&&S&&S.map){
      if(!S.map.flags)S.map.flags={};
      S.map.flags.dgArea=true;
    }
  }catch(e){}
  return mapDgAreaRestoreFromSave(d);
}

function mapDgAreaPinDefaultOff(){
  try{if(typeof MAP_FLAGS_DEFAULT!=='undefined')MAP_FLAGS_DEFAULT.dgArea=false;}catch(e){}
  try{
    if(typeof S!=='undefined'&&S&&S.map&&S.map.flags&&!S.map.flags.dgAreaForced)S.map.flags.dgArea=false;
  }catch(e){}
}
/** Wrap g13.js placeGates. That function (g13.js L15–21) only has spots for
 *  cave/jail/ruin/xf; L18 `const s=spots[k]` then L19 reads `s.x`.
 *  mapDgsRegister() mutates the const DG_ORDER array by pushing MAP_DG_ORDER
 *  (dg_qingyan etc). applySave (g5.js) → genWorld → the g13.js L14 wrap
 *  (`_gw(seed);placeGates(seed)`) then throws TypeError reading 'x'. */
function mapDgAreaProtectPlaceGates(){
  if(typeof placeGates!=='function'||placeGates._mapDgArea)return false;
  const _pg=placeGates;
  const CLASSIC={cave:1,jail:1,ruin:1,xf:1};
  placeGates=function(seed){
    let extras=null;
    try{
      if(typeof DG_ORDER!=='undefined'&&Array.isArray(DG_ORDER)){
        extras=[];
        for(let i=DG_ORDER.length-1;i>=0;i--){
          if(!CLASSIC[DG_ORDER[i]])extras.unshift(DG_ORDER.splice(i,1)[0]);
        }
      }
      return _pg.apply(this,arguments);
    }finally{
      if(extras&&typeof DG_ORDER!=='undefined'&&Array.isArray(DG_ORDER)){
        for(const k of extras)if(DG_ORDER.indexOf(k)<0)DG_ORDER.push(k);
      }
    }
  };
  placeGates._mapDgArea=1;
  return true;
}
function mapDgAreaWrapXmod(){
  try{
    if(typeof xmodSeedDefaults==='function'&&!xmodSeedDefaults._mapDgArea){
      const _s=xmodSeedDefaults;
      xmodSeedDefaults=function(){const r=_s.apply(this,arguments);mapDgAreaPinDefaultOff();return r;};
      xmodSeedDefaults._mapDgArea=1;
    }
    if(typeof xmodEnsureState==='function'&&!xmodEnsureState._mapDgArea){
      const _e=xmodEnsureState;
      xmodEnsureState=function(){const r=_e.apply(this,arguments);mapDgAreaPinDefaultOff();return r;};
      xmodEnsureState._mapDgArea=1;
    }
    if(typeof xmodApply==='function'&&!xmodApply._mapDgArea){
      const _a=xmodApply;
      xmodApply=function(){const r=_a.apply(this,arguments);mapDgAreaPinDefaultOff();return r;};
      xmodApply._mapDgArea=1;
    }
  }catch(e){}
  mapDgAreaPinDefaultOff();
}


function mapDgAreaWorldUnitsForSnap(){
  const keys=(typeof UNIT_KEEP!=='undefined')?UNIT_KEEP:['id','kind','name','body','hp','maxhp','atk','x','y','job','dead','sub','realm'];
  const D=mapDgAreaActiveRun();
  const W=D&&D.W;
  const seen={};
  const out=[];
  const push=(u)=>{
    if(!u||seen[u.id])return;
    seen[u.id]=1;
    const o=mapDgAreaPick(u,keys);
    if(u.dgSave){o.x=u.dgSave.x;o.y=u.dgSave.y;if(u.dgSave.job!==undefined)o.job=u.dgSave.job;}
    out.push(o);
  };
  if(W&&W.units)for(const u of W.units)push(u);
  if(typeof S!=='undefined'&&S&&S.units)for(const u of S.units)push(u);
  return out;
}

function mapDgAreaEnsureGate(kind){
  if(!kind)return null;
  try{
    const list=(typeof gates==='function')?gates():((typeof S!=='undefined'&&S&&S.vstructs)||[]);
    const found=list.find(z=>z&&z.type==='dgate'&&z.kind===kind);
    if(found)return found;
  }catch(e){}
  let id=94001;
  for(let i=0;i<String(kind).length;i++)id=(id*33+(kind.charCodeAt(i)|0))|0;
  id=910000+(Math.abs(id)%80000);
  let i=64,j=64;
  try{
    const p=(typeof player==='function')?player():null;
    if(p){i=Math.max(2,Math.min(120,Math.floor(p.x)+2));j=Math.max(2,Math.min(120,Math.floor(p.y)));}
  }catch(e){}
  const g={id:id,type:'dgate',kind:kind,i:i,j:j,w:2,h:2};
  try{if(typeof S!=='undefined'&&S){if(!S.vstructs)S.vstructs=[];S.vstructs.push(g);}}catch(e){}
  return g;
}

/** 打開側欄關卡面板（給「獨自進入」真實點擊用）；不擺戰鬥單位。 */
function mapDgAreaOpenGatePanel(kind){
  try{
    const g=mapDgAreaEnsureGate(kind);if(!g)return false;
    selOther={k:'s',id:g.id};
    try{selUnits=[];}catch(e){}
    try{selBuilding=null;}catch(e){}
    try{panelKeyCache=null;}catch(e){}
    if(typeof renderPanel==='function')renderPanel();
    return true;
  }catch(e){return false;}
}

function mapDgAreaInstall(){
  if(mapDgAreaInstall._ok){mapDgAreaWrapXmod();mapDgAreaProtectPlaceGates();return true;}
  mapDgAreaWrapXmod();
  mapDgAreaProtectPlaceGates();
  if(typeof dgEnter!=='function'||typeof dgExit!=='function')return false;
  if(typeof snapshot!=='function'||typeof applySave!=='function')return false;
  if(!dgEnter._mapDgArea){
    const _en=dgEnter;
    dgEnter=function(kind,mode,hard){
      if(!mapDgAreaOn()||mapDgAreaCoopLive()||!mapDgAreaApplies(kind))return _en.apply(this,arguments);
      mapDgAreaCallSpecial('prepare',{kind:kind});
      const r=_en.apply(this,arguments);
      try{if(r!==false&&S&&S.dg&&!mapDgAreaCoopLive()&&mapDgAreaApplies(S.dg.kind))mapDgAreaAfterEnter(kind||S.dg.kind);}catch(e){console.warn('[dgArea] after enter',e);}
      return r;
    };
    dgEnter._mapDgArea=1;
  }
  if(!dgExit._mapDgArea){
    const _ex=dgExit;
    dgExit=function(keep){
      const tracked=mapDgAreaOn()&&S&&(S.scene==='dg'||(S.dg&&S.dg._dgArea));
      const r=_ex.apply(this,arguments);
      try{
        if(tracked&&!(S&&S.dg)){
          S.scene='ow';
          S.owArea=null;
          S.dgArea=null;
        }else if(S&&S.dg&&S.dg.W){
          S.owArea=S.dg.W;
        }
      }catch(e){}
      return r;
    };
    dgExit._mapDgArea=1;
  }
  if(!snapshot._mapDgArea){
    const _sn=snapshot;
    snapshot=function(){
      const snap=_sn.apply(this,arguments);
      try{
        if(!mapDgAreaOn()||mapDgAreaCoopLive())return snap;
        if(typeof S!=='undefined'&&S&&S.dg&&mapDgAreaApplies(S.dg.kind))S.dgArea=mapDgAreaCaptureLive(S.dg);
        if(typeof S!=='undefined'&&S&&S.dgArea&&mapDgAreaApplies(S.dgArea.kind)){
          snap.scene=S.scene||(S.dg?'dg':snap.scene);
          snap.dgArea=S.dgArea;
          try{
            const wu=mapDgAreaWorldUnitsForSnap();
            if(wu&&wu.length)snap.units=wu;
            const D=mapDgAreaActiveRun(),W=D&&D.W;
            if(W){
              if(W.buildings)snap.buildings=W.buildings.map(b=>Object.assign({},b));
              if(W.cam)snap.cam={x:W.cam.x,y:W.cam.y,zoom:W.cam.zoom};
              if(W.exp&&typeof encodeBits==='function'){try{snap.explored=encodeBits(W.exp);}catch(e){}}
              snap.dgOw={
                block:W.block?Array.from(W.block):null,
                comp:W.comp?Array.from(W.comp):null,
                exp:W.exp?Array.from(W.exp):null
              };
            }
          }catch(e){}
        }
      }catch(e){console.warn('[dgArea] snapshot',e);}
      return snap;
    };
    snapshot._mapDgArea=1;
  }
  if(!applySave._mapDgArea){
    const _as=applySave;
    applySave=function(d){
      const r=_as.apply(this,arguments);
      try{
        if(!r||!d||!d.dgArea)return r;
        mapDgAreaApplySavedArea(d);
      }catch(e){console.warn('[dgArea] applySave',e);}
      return r;
    };
    applySave._mapDgArea=1;
  }
  if(typeof rebuildBlock==='function'&&!rebuildBlock._mapDgArea){
    const _rb=rebuildBlock;
    rebuildBlock=function(){
      if(mapDgAreaOn()&&typeof S!=='undefined'&&S&&S.scene==='dg')return;
      return _rb.apply(this,arguments);
    };
    rebuildBlock._mapDgArea=1;
  }
  try{
    const root=(typeof window!=='undefined')?window:null;
    if(root&&root.XW){
      if(typeof dgEnter==='function')root.XW.dgEnter=dgEnter;
      if(typeof dgExit==='function')root.XW.dgExit=dgExit;
      if(typeof snapshot==='function')root.XW.snapshot=snapshot;
      if(typeof applySave==='function')root.XW.applySave=applySave;
    }
    if(root){
      root.XWMAP_DGAREA={
        install:mapDgAreaInstall,on:mapDgAreaOn,afterEnter:mapDgAreaAfterEnter,
        capture:mapDgAreaCaptureLive,restore:mapDgAreaRestoreFromSave,
        hashWorld:mapDgAreaHashWorld,asserts:mapDgAreaAsserts,
        callSpecial:mapDgAreaCallSpecial,activeRun:mapDgAreaActiveRun,
        coopLive:mapDgAreaCoopLive,coopContext:mapDgAreaCoopContext,coopPayload:mapDgAreaCoopPayload,
        applySavedArea:mapDgAreaApplySavedArea,
        applies:mapDgAreaApplies,isXf:mapDgAreaIsXf,
        openGatePanel:mapDgAreaOpenGatePanel,ensureGate:mapDgAreaEnsureGate,
        specialDef:(typeof mapSpecialDef==='function')?mapSpecialDef:null
      };
      if(root.XWMAP){
        root.XWMAP.dgAreaOn=mapDgAreaOn;
        root.XWMAP.dgAreaAsserts=mapDgAreaAsserts;
        root.XWMAP.dgAreaHashWorld=mapDgAreaHashWorld;
        root.XWMAP.callSpecial=mapDgAreaCallSpecial;
        root.XWMAP.dgAreaApplies=mapDgAreaApplies;
      }
    }
  }catch(e){}
  mapDgAreaInstall._ok=true;
  return true;
}
mapDgAreaInstall._ok=false;

function mapDgAreaBoot(){
  try{if(mapDgAreaInstall())return;}catch(e){}
  if(typeof setTimeout==='function')setTimeout(mapDgAreaBoot,30);
}
if(typeof setTimeout==='function')setTimeout(mapDgAreaBoot,0);
else try{mapDgAreaInstall();}catch(e){}
