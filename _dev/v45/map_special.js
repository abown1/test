// ================== 特殊副本邏輯（config-driven；不改 g*）==================
// 仙凡之門：整本小怪夾在大武師–宗師（含少數宗師後期），只有首領是煉氣中期。
// 撤離陣／出口傳送陣沿用 g* 的 D.ent／D.exitP 與 x47DgExitAsk；僅在缺損時補上。
function mapSpecialXfTune(){return mapSpecialTune('xf');}
function mapXfBossDisplayName(){
  const T=mapSpecialTune('xf');
  if(T.bossDisplay)return T.bossDisplay;
  return T.bossN+'・煉氣中期';
}
var MAP_XF_BOSS_N='試煉王';
var MAP_XF_BOSS_REALM=4;
var MAP_XF_BOSS_SUB=1;
var MAP_XF_MINION_REALM=2;
var MAP_XF_DOOR_INSET=2.2;
var MAP_XF_BOSS_SAFE=8;
function mapSpecialSyncXfAliases(){
  try{
    const T=mapSpecialTune('xf');
    MAP_XF_BOSS_N=T.bossN;MAP_XF_BOSS_REALM=T.bossRealm;MAP_XF_BOSS_SUB=T.bossSub;
    MAP_XF_MINION_REALM=T.minionMin;MAP_XF_DOOR_INSET=T.doorInset;MAP_XF_BOSS_SAFE=T.bossSafe;
  }catch(e){}
}
try{mapSpecialSyncXfAliases();}catch(e){}

function mapSpecialRng(){
  try{if(typeof rnd==='function')return rnd();}catch(e){}
  return Math.random();
}
function mapSpecialSubN(realm){
  try{if(typeof v52N==='function')return Math.max(1,v52N(realm|0)|0);}catch(e){}
  return 4;
}
function mapSpecialSubBonus(realm){
  try{
    const lay=(typeof v52Lay==='function')?v52Lay(realm):false;
    if(lay&&typeof TUNE!=='undefined'&&TUNE&&TUNE.v52&&TUNE.v52.layerBonus)return 1+TUNE.v52.layerBonus;
    if(typeof TUNE!=='undefined'&&TUNE&&TUNE.subBonus)return 1+TUNE.subBonus;
  }catch(e){}
  return 1.04;
}
function mapSpecialLiveKind(){
  try{const k=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);if(k)return k;}catch(e){}
  return 'xf';
}
/** Prefer the live dungeon kind; otherwise match e.type against MAP_SPECIAL.boss.type
 *  so 青巖 (king) is not mistaken for the xf default. */
function mapSpecialKindForEnemy(e){
  try{
    const live=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);
    if(live){
      const T=mapSpecialTune(live);
      if(!e||e.type===T.bossType||e.type==='xfboss'||e._mapSpecialBoss||e._mapSpecialDisplay)return live;
    }
  }catch(err){}
  try{
    if(e&&typeof MAP_SPECIAL!=='undefined'&&MAP_SPECIAL){
      for(const k of Object.keys(MAP_SPECIAL)){
        const B=MAP_SPECIAL[k]&&MAP_SPECIAL[k].boss;
        if(B&&B.type&&e.type===B.type)return k;
      }
    }
  }catch(err){}
  if(e&&e.type==='xfboss')return 'xf';
  return null;
}
function mapSpecialBossDisplayOf(e,kind){
  const T=mapSpecialTune(kind||mapSpecialKindForEnemy(e)||'xf');
  if(T.bossDisplay)return T.bossDisplay;
  if((kind||T.kind)==='xf')return mapXfBossDisplayName();
  return T.bossN||null;
}
function mapSpecialBindEnemyName(){
  try{
    if(typeof window!=='undefined'&&window.XW)
      window.XW.enemyName=function(e){return enemyName(e);};
  }catch(err){}
}
function mapSpecialPickMinionRS(rng){
  const T=mapSpecialTune(mapSpecialLiveKind());
  const roll=typeof rng==='function'?rng():mapSpecialRng();
  if(roll<T.eliteChance)return {realm:T.eliteRealm|0,sub:T.eliteSub|0,elite:1};
  const rest=1-T.eliteChance;
  const r2=typeof rng==='function'?rng():mapSpecialRng();
  if(r2<0.6){
    const subMax=Math.max(0,Math.min(T.trashSubMax|0,mapSpecialSubN(T.minionMin)-1));
    const sub=Math.floor((typeof rng==='function'?rng():mapSpecialRng())*(subMax+1));
    return {realm:T.minionMin|0,sub:sub,elite:0};
  }
  const subMax=Math.max(0,Math.min(1,mapSpecialSubN(T.minionCap)-1));
  const sub=Math.floor((typeof rng==='function'?rng():mapSpecialRng())*(subMax+1));
  return {realm:T.minionCap|0,sub:sub,elite:0};
}
function mapSpecialApplyRealmStats(e,realm,sub){
  if(!e)return e;
  realm=realm|0;sub=sub|0;
  const type=e.type;
  let baseHp=40,baseAtk=4;
  try{
    const D=(typeof ENEMY!=='undefined'&&ENEMY&&ENEMY[type])||null;
    if(D){if(D.hp!=null)baseHp=D.hp;if(D.atk!=null)baseAtk=D.atk;}
  }catch(err){}
  let hp=baseHp,atk=baseAtk;
  try{
    if(typeof xnScaleStat==='function'){
      hp=xnScaleStat(baseHp,realm,'hp');
      atk=xnScaleStat(baseAtk,realm,'atk');
    }
  }catch(err){}
  const sb=mapSpecialSubBonus(realm);
  const mul=Math.pow(sb,Math.max(0,sub));
  hp=Math.max(1,Math.round(hp*mul));
  atk=+(Math.max(0.1,atk*mul)).toFixed(1);
  // 小隊人數只做輕微加成，不用副本 tier（避免再抬到煉氣數值）
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    const T=mapSpecialTune(D&&D.kind||'xf');
    const n=Math.min(Math.max(1,(D&&D.party)|0),T.partyFair||8);
    if(n>1&&T.partyHpPer){
      const k=1+T.partyHpPer*(n-1);
      hp=Math.max(1,Math.round(hp*k));
      atk=+(atk*k).toFixed(1);
    }
  }catch(err){}
  e.realm=realm;
  e.sub=sub;
  e.maxhp=hp;e.hp=hp;e.atk=atk;
  try{delete e.v49lq;}catch(err){e.v49lq=0;}
  e.v51k=null;
  try{e.v51r={r:realm,s:sub};e.v51k=e.maxhp+'|'+e.atk+'|'+e.realm+'|0';}catch(err){}
  return e;
}
function mapSpecialApplyBoss(e){
  if(!e)return e;
  const kind=mapSpecialKindForEnemy(e);
  if(!kind)return e;
  const T=mapSpecialTune(kind);
  if(e.type!==T.bossType&&e.type!=='xfboss')return e;
  e.realm=T.bossRealm;
  e.sub=T.bossSub;
  e.v49lq=1;
  try{e.dgName=null;}catch(err){}
  try{e._mapSpecialDisplay=mapSpecialBossDisplayOf(e,kind);}catch(err){e._mapSpecialDisplay=T.bossDisplay||T.bossN||null;}
  e._mapXfBoss=1;e._mapSpecialBoss=1;
  try{e.v51r={r:T.bossRealm,s:T.bossSub};e.v51k=e.maxhp+'|'+e.atk+'|'+e.realm+'|1';}catch(err){}
  return e;
}
function mapSpecialClampMinion(e,x,y){
  if(!e)return e;
  const D=(typeof S!=='undefined')?S.dg:null;
  const kind=mapSpecialKindOf(D);
  if(!kind)return e;
  const T=mapSpecialTune(kind);
  if(e.type===T.bossType||e.type==='xfboss'||e._mapSpecialBoss)return mapSpecialApplyBoss(e);
  const pick=mapSpecialPickMinionRS();
  let realm=pick.realm|0, sub=pick.sub|0;
  if(realm>T.minionCap){realm=T.minionCap;sub=Math.min(sub,T.eliteSub|0);}
  if(realm<T.minionMin)realm=T.minionMin;
  if((e.realm|0)>T.minionCap||(e.realm|0)>=T.bossRealm){realm=pick.realm;sub=pick.sub;}
  mapSpecialApplyRealmStats(e,realm,sub);
  e._mapXfMinion=1;e._mapSpecialMinion=1;
  return e;
}
function mapXfClampMinion(e,x,y){return mapSpecialClampMinion(e,x,y);}
function mapXfApplyBossIdentity(e){return mapSpecialApplyBoss(e);}

function mapSpecialNN(){try{if(typeof N==='number'&&N>0)return N;}catch(e){}return 128;}
function mapSpecialFlAt(i,j,D){
  const NN=mapSpecialNN(),k=j*NN+i;
  try{
    if(D&&D.lock&&D.lock.sv){
      for(const rec of D.lock.sv){if(rec&&rec[0]===k)return rec[1];}
    }
  }catch(e){}
  try{if(D&&D.L&&D.L.fl)return D.L.fl[k];}catch(e){}
  try{if(typeof block!=='undefined'&&block)return block[k]?0:1;}catch(e){}
  return 0;
}
function mapSpecialTileWalkNow(x,y){
  try{if(typeof blockedP==='function')return !blockedP(x,y);}catch(e){}
  try{
    const NN=mapSpecialNN(),i=x|0,j=y|0;
    if(typeof block!=='undefined'&&block)return !block[j*NN+i];
  }catch(e){}
  return true;
}
function mapSpecialDoorwayFromPrev(r,D){
  const rooms=D&&D.L&&D.L.rooms;
  if(!rooms||!rooms.length)return null;
  let prev=null;
  if(r.k!=null)prev=rooms.find(o=>o&&o.k===(r.k-1));
  if(!prev)prev=rooms.filter(o=>o&&o!==r)[rooms.filter(o=>o&&o!==r).length-1];
  if(!prev)return null;
  const tx=Math.floor(r.cx),ty=Math.floor(r.cy);
  const px=Math.floor(prev.cx),py=Math.floor(prev.cy);
  let i,j,ni,nj,dx,dy;
  if(px<r.x0){i=r.x0;j=Math.max(r.y0,Math.min(r.y0+r.h-1,ty));dx=-1;dy=0;ni=i-1;nj=j;}
  else if(px>=r.x0+r.w){i=r.x0+r.w-1;j=Math.max(r.y0,Math.min(r.y0+r.h-1,ty));dx=1;dy=0;ni=i+1;nj=j;}
  else if(py<r.y0){j=r.y0;i=Math.max(r.x0,Math.min(r.x0+r.w-1,tx));dx=0;dy=-1;ni=i;nj=j-1;}
  else if(py>=r.y0+r.h){j=r.y0+r.h-1;i=Math.max(r.x0,Math.min(r.x0+r.w-1,tx));dx=0;dy=1;ni=i;nj=j+1;}
  else {j=r.y0;i=Math.max(r.x0,Math.min(r.x0+r.w-1,tx));dx=0;dy=-1;ni=i;nj=j-1;}
  return {i,j,ni,nj,dx,dy};
}
function mapSpecialDoorway(r,D){
  if(!r)return null;
  D=D||((typeof S!=='undefined')?S.dg:null);
  const opens=[];
  const dirs=[[0,-1],[0,1],[-1,0],[1,0]];
  try{
    for(let j=r.y0;j<r.y0+r.h;j++){
      for(let i=r.x0;i<r.x0+r.w;i++){
        const onRing=(i===r.x0||i===r.x0+r.w-1||j===r.y0||j===r.y0+r.h-1);
        if(!onRing)continue;
        const inside=mapSpecialFlAt(i,j,D);
        if(inside!==1&&inside!==0)continue;
        if(D&&D.L&&D.L.fl&&inside!==1)continue;
        for(const [dx,dy] of dirs){
          const ni=i+dx,nj=j+dy;
          if(ni>=r.x0&&ni<r.x0+r.w&&nj>=r.y0&&nj<r.y0+r.h)continue;
          if(mapSpecialFlAt(ni,nj,D)===1)opens.push({i,j,ni,nj,dx,dy});
        }
      }
    }
  }catch(e){}
  if(!opens.length){
    const fb=mapSpecialDoorwayFromPrev(r,D);
    if(fb){
      const w=3;
      for(let s=-1;s<=1;s++){
        const i=fb.i+(fb.dy?s:0),j=fb.j+(fb.dx?s:0);
        if(i<r.x0||i>=r.x0+r.w||j<r.y0||j>=r.y0+r.h)continue;
        opens.push({i,j,ni:fb.ni+(fb.dy?s:0),nj:fb.nj+(fb.dx?s:0),dx:fb.dx,dy:fb.dy});
      }
    }
  }
  if(!opens.length){
    const T=mapSpecialTune((D&&D.kind)||'xf');
    const x=(r.cx!=null)?r.cx:(r.x0+(r.w||0)/2);
    const y=(r.y0!=null)?(r.y0+(T.doorInset!=null?T.doorInset:0.5)):r.cy;
    return {x,y,opens:[],side:'fallback'};
  }
  let sx=0,sy=0;
  for(const o of opens){sx+=o.i+0.5;sy+=o.j+0.5;}
  return {x:sx/opens.length,y:sy/opens.length,opens,side:'gap'};
}
function mapXfBossDoorPos(r){
  const d=mapSpecialDoorway(r);
  return d?{x:d.x,y:d.y}:null;
}
function mapSpecialNearestWalkable(x,y,r){
  if(mapSpecialTileWalkNow(x,y))return {x:x,y:y};
  let f=null;
  try{if(typeof nearestFree==='function')f=nearestFree(x,y,-1);}catch(e){}
  if(f&&Number.isFinite(f.i)&&Number.isFinite(f.j)){
    if(!r||(f.i>=r.x0-1&&f.i<=r.x0+r.w&&f.j>=r.y0-1&&f.j<=r.y0+r.h))return {x:f.i+0.5,y:f.j+0.5};
  }
  for(let rad=1;rad<=6;rad++){
    for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){
      const tx=x+dx,ty=y+dy;
      if(r&&(tx<r.x0-0.5||tx>r.x0+r.w+0.5||ty<r.y0-0.5||ty>r.y0+r.h+0.5))continue;
      if(mapSpecialTileWalkNow(tx,ty))return {x:tx,y:ty};
    }
  }
  return {x:x,y:y};
}
function mapXfNearestWalkable(x,y,r){return mapSpecialNearestWalkable(x,y,r);}
function mapXfPlaceAtDoor(r){
  if(!r)return null;
  const T=mapSpecialTune((typeof S!=='undefined'&&S&&S.dg&&S.dg.kind)||'xf');
  const info=mapSpecialDoorway(r);
  if(!info)return null;
  const door={x:info.x,y:info.y};
  const D=(typeof S!=='undefined')?S.dg:null;
  if(D){D.bossDoor={x:door.x,y:door.y};D._mapXfDoor=1;D._mapSpecialDoor=1;}
  const spots=[];
  const seen={};
  const addSpot=(x,y)=>{
    const k=(x|0)+','+(y|0);if(seen[k])return;seen[k]=1;spots.push({x,y});
  };
  for(const o of (info.opens||[])){
    addSpot(o.i+0.5,o.j+0.5);
    const cx=o.ni+0.5,cy=o.nj+0.5;
    if(mapSpecialTileWalkNow(cx,cy))addSpot(cx,cy);
  }
  if(!spots.length)addSpot(door.x,door.y);
  const us=(typeof S!=='undefined'&&S.units)?S.units.filter(u=>u&&!u.dead):[];
  const boss={x:r.cx,y:r.cy};
  us.forEach((u,k)=>{
    const s=spots[k%spots.length];
    const extra=(k/spots.length)|0;
    const ox=((k%2)?0.35:-0.35)*extra;
    const oy=((k%3)?0.2:-0.2)*extra;
    let tx=s.x+ox,ty=s.y+oy;
    const d=Math.hypot(tx-boss.x,ty-boss.y);
    if(d<T.bossSafe){
      const ux=(door.x-boss.x)||0,uy=(door.y-boss.y)||-1;
      const ul=Math.hypot(ux,uy)||1;
      tx=door.x+ux/ul*0.15;ty=door.y+uy/ul*0.15;
    }
    const w=mapSpecialNearestWalkable(tx,ty,r);
    u.x=w.x;u.y=w.y;u.path=[];u.vx=u.vy=0;
    u.face=(boss.x>=u.x)?1:-1;u.faceT=u.face;
    if(u.task&&u.task.type==='move')u.task=null;
    try{if(typeof fx==='function')fx('ring',u.x,u.y,'#ffd34d');}catch(e){}
    try{
      if(typeof player==='function'&&u===player()&&typeof iso==='function'&&typeof cam!=='undefined'&&cam){
        const q=iso(u.x,u.y);cam.x=q.x;cam.y=q.y;cam.follow=true;
      }
    }catch(e){}
  });
  return door;
}
function mapSpecialPlaceAtDoor(r){return mapXfPlaceAtDoor(r);}
function mapSpecialGateLabel(open,kind){
  const T=mapSpecialTune(kind||'xf');
  if(open)return T.gateOpen||T.gateN||'試煉門';
  return T.gateShut||((T.gateN||'試煉門')+'（未開）');
}
function mapSpecialEnemyInRoom(e,rr){
  if(!e||!rr)return false;
  const hx=(e.home&&Number.isFinite(e.home.x))?e.home.x:e.x;
  const hy=(e.home&&Number.isFinite(e.home.y))?e.home.y:e.y;
  const xs=[e.x,hx],ys=[e.y,hy];
  for(let i=0;i<xs.length;i++){
    const x=xs[i],y=ys[i];
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    if(x>=rr.x0-0.2&&x<=rr.x0+rr.w+0.2&&y>=rr.y0-0.2&&y<=rr.y0+rr.h+0.2)return true;
    try{if(typeof dgRoomOf==='function'&&dgRoomOf(x,y)===rr)return true;}catch(err){}
  }
  return false;
}
function mapSpecialEnemyStuck(e){
  if(!e)return true;
  if(!Number.isFinite(e.x)||!Number.isFinite(e.y))return true;
  try{if(typeof blockedP==='function'&&blockedP(e.x,e.y))return true;}catch(err){}
  try{
    const NN=mapSpecialNN(),i=e.x|0,j=e.y|0;
    if(typeof block!=='undefined'&&block&&block[j*NN+i])return true;
  }catch(err){}
  return false;
}
function mapSpecialEnemyLive(e){
  if(!e||e.dead||!(e.hp>0))return false;
  if(mapSpecialEnemyStuck(e))return false;
  return true;
}
function mapSpecialRoomProgress(timeout){
  try{
    const D=(typeof S!=='undefined')?S.dg:null;
    if(!D||!mapSpecialDef(D.kind)||!D.L||!D.L.rooms)return 0;
    const wait=(timeout!=null)?timeout:2.4;
    const now=(D.t!=null)?D.t:((S&&S.time)||0);
    let n=0;
    for(const rr of D.L.rooms){
      if(!rr||rr.state==='clear'||rr.boss)continue;
      if(rr.state!=='fight')continue;
      const queued=(D.queue||[]).some(q=>q&&q.r===rr);
      const mine=(S.enemies||[]).filter(e=>mapSpecialEnemyInRoom(e,rr)&&e&&!e.dead&&(e.hp>0));
      const live=mine.filter(mapSpecialEnemyLive);
      if(!queued&&live.length===0){
        if(!mine.length){
          rr.state='clear';n++;
          try{if(!rr.boss&&typeof floater==='function')floater(rr.cx,rr.cy,'清除！','#9fe8b0');}catch(e){}
          continue;
        }
        if(rr._mapStuckT==null)rr._mapStuckT=now;
        if(now-rr._mapStuckT>=wait){
          rr.state='clear';n++;
          try{if(!rr.boss&&typeof floater==='function')floater(rr.cx,rr.cy,'清除！','#9fe8b0');}catch(e){}
        }
      }else{
        rr._mapStuckT=null;
      }
    }
    return n;
  }catch(e){return 0;}
}
function mapSpecialHook(phase,payload){
  payload=payload||{};
  try{mapSpecialInstall();}catch(e){}
  try{
    if(phase==='enter'){
      const D=payload.D||((typeof S!=='undefined')?S.dg:null);
      if(D)mapSpecialEnsureEvac(D);
    }
    if(phase==='place'||phase==='lock'||phase==='bossDoor'){
      const r=payload.r||payload.room;
      if(r)mapXfPlaceAtDoor(r);
    }
  }catch(e){}
  return true;
}
function mapSpecialOnEnter(payload){return mapSpecialHook('enter',payload);}
function mapSpecialPrepare(payload){try{mapSpecialInstall();}catch(e){}return true;}

function mapSpecialEnsureEvac(D){
  if(!D||!mapSpecialDef(D.kind))return D;
  try{
    if(!D.ent||D.ent.x==null||D.ent.y==null){
      const st=D.L&&D.L.rooms&&D.L.rooms[0];
      if(st){
        const x=st.cx,y=(st.cy!=null?st.cy-1.4:st.y0+1);
        D.ent={x:x,y:y};
      }
    }
    if(D.ent&&typeof nearestFree==='function'){
      const f=nearestFree(D.ent.x,D.ent.y,-1);
      if(f){
        const r0=D.L&&D.L.rooms&&D.L.rooms[0];
        if(!r0||(f.i>=r0.x0&&f.i<r0.x0+r0.w&&f.j>=r0.y0&&f.j<r0.y0+r0.h))
          D.ent={x:f.i+0.5,y:f.j+0.5};
      }
    }
  }catch(e){}
  return D;
}
function mapSpecialEnsureExit(D){
  if(!D||!mapSpecialDef(D.kind))return D;
  try{
    if(D.cleared&&!D.exitP){
      const rooms=D.L&&D.L.rooms;const br=rooms&&rooms[rooms.length-1];
      if(br){
        let x=br.cx,y=br.cy;
        try{
          const f=typeof nearestFree==='function'?nearestFree(br.cx,br.cy,-1):null;
          if(f&&f.i>=br.x0&&f.i<br.x0+br.w&&f.j>=br.y0&&f.j<br.y0+br.h){x=f.i+0.5;y=f.j+0.5;}
        }catch(err){}
        D.exitP={x:x,y:y};D.xpAsk=0;D.exitOpen=true;
      }
    }
  }catch(e){}
  return D;
}
function mapSpecialDrawDoors(){
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(!D||!mapSpecialDef(D.kind))return;
    const T=mapSpecialTune(D.kind);
    if(!T.visibleDoor)return;
    if(!D.bossDoor){
      const rooms=D.L&&D.L.rooms;const br=rooms&&rooms[rooms.length-1];
      if(br&&br.boss)D.bossDoor=mapXfBossDoorPos(br);
    }
    if(D.bossDoor&&typeof xgateDrawPortal==='function'){
      const locked=!!D.lock;
      xgateDrawPortal(D.bossDoor.x,D.bossDoor.y,locked?'boss':'ent',locked?'首領殿門（已封）':'首領殿門');
    }
  }catch(e){}
}
function mapSpecialTrimQueue(r){
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(!D||!mapSpecialDef(D.kind)||!D.queue)return;
    const T=mapSpecialTune(D.kind);
    const n=Math.min(Math.max(1,D.party|0),T.partyFair||8);
    let cap=r&&r.boss?T.bossAdds:T.packMax;
    cap=Math.max(T.packMin,Math.min(cap,T.packMax+(n>1?Math.min(2,n-1):0)));
    if(r&&r.boss)cap=Math.min(T.bossAdds+(n>1?1:0),8);
    while(D.queue.length>cap)D.queue.pop();
  }catch(e){}
}
function mapSpecialEnforceLive(){
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(!D||!mapSpecialDef(D.kind)||!S.enemies)return;
    const T=mapSpecialTune(D.kind);
    for(const e of S.enemies){
      if(!e||e.dead)continue;
      if(e.type===T.bossType||e.type==='xfboss'){
        if(!e._mapSpecialBoss)mapSpecialApplyBoss(e);
        continue;
      }
      if((e.realm|0)>T.minionCap||e.v49lq)mapSpecialClampMinion(e);
    }
    mapSpecialEnsureExit(D);
  }catch(e){}
}

function mapSpecialInstall(){
  if(mapSpecialInstall._ok){mapSpecialBindEnemyName();return true;}
  try{mapSpecialSyncXfAliases();}catch(e){}
  let n=0;
  try{
    if(typeof DGS!=='undefined'&&DGS&&DGS.xf){
      const T=mapSpecialTune('xf');
      DGS.xf.bossN=T.bossN;n++;
    }
    if(typeof DGS!=='undefined'&&DGS&&DGS.dg_qingyan){
      const Tq=mapSpecialTune('dg_qingyan');
      DGS.dg_qingyan.bossN=Tq.bossN;n++;
    }
  }catch(e){}
  try{
    if(typeof enemyName==='function'&&!enemyName._mapSpecial){
      const _en=enemyName;
      enemyName=function(e){
        try{
          if(e&&e._mapSpecialDisplay)return e._mapSpecialDisplay;
          const kind=mapSpecialKindForEnemy(e);
          if(kind){
            const T=mapSpecialTune(kind);
            if(e&&(e.type===T.bossType||e.type==='xfboss')){
              if(T.bossDisplay)return T.bossDisplay;
              if(kind==='xf')return mapXfBossDisplayName();
              return T.bossN||_en.apply(this,arguments);
            }
          }
        }catch(err){}
        return _en.apply(this,arguments);
      };
      enemyName._mapSpecial=1;n++;
      mapSpecialBindEnemyName();
    }
  }catch(e){}
  try{
    if(typeof v51Realm==='function'&&!v51Realm._mapSpecial){
      const _vr=v51Realm;
      v51Realm=function(e){
        try{
          const T=mapSpecialTune(mapSpecialKindForEnemy(e)||mapSpecialLiveKind());
          if(e&&(e.type===T.bossType||e.type==='xfboss')){
            const o={r:T.bossRealm,s:T.bossSub};
            e.v51r=o;e.v51k=(e.maxhp+'|'+e.atk+'|'+e.realm+'|1|mapsp');
            return o;
          }
          if(e&&e._mapSpecialMinion){
            const o={r:e.realm|0,s:e.sub|0};
            e.v51r=o;e.v51k=(e.maxhp+'|'+e.atk+'|'+e.realm+'|0|mapsp');
            return o;
          }
        }catch(err){}
        return _vr.apply(this,arguments);
      };
      v51Realm._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof v51RName==='function'&&!v51RName._mapSpecial){
      const _rn=v51RName;
      v51RName=function(e){
        try{
          const kind=mapSpecialKindForEnemy(e)||mapSpecialLiveKind();
          const T=mapSpecialTune(kind);
          if(e&&(e.type===T.bossType||e.type==='xfboss')){
            if(T.bossDisplay){
              const i=String(T.bossDisplay).indexOf('・');
              if(i>=0)return T.bossDisplay.slice(i+1);
            }
            if(kind==='xf')return '煉氣中期';
          }
        }catch(err){}
        return _rn.apply(this,arguments);
      };
      v51RName._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgMob==='function'&&!dgMob._mapSpecial){
      const _m=dgMob;
      dgMob=function(t,x,y,boss){
        const e=_m.apply(this,arguments);
        try{
          const D=typeof S!=='undefined'?S.dg:null;
          if(e&&D&&mapSpecialDef(D.kind)){
            if(boss||e.type==='xfboss')mapSpecialApplyBoss(e);
            else mapSpecialClampMinion(e,x,y);
          }
        }catch(err){}
        return e;
      };
      dgMob._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof v156Lock==='function'&&!v156Lock._mapSpecial){
      const _lk=v156Lock;
      v156Lock=function(r){
        const ret=_lk.apply(this,arguments);
        try{if(r&&r.boss)mapXfPlaceAtDoor(r);}catch(err){}
        return ret;
      };
      v156Lock._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof label==='function'&&!label._mapSpecialGate){
      const _lb=label;
      label=function(txt,x,y,c,f){
        try{
          if(typeof txt==='string'&&/首領傳送門/.test(txt)){
            const D=(typeof S!=='undefined')?S.dg:null;
            if(D&&mapSpecialDef(D.kind)){
              txt=mapSpecialGateLabel(!/未開/.test(txt),D.kind);
              arguments[0]=txt;
            }
          }
        }catch(err){}
        return _lb.call(this,txt,x,y,c,f);
      };
      label._mapSpecialGate=1;n++;
    }
  }catch(e){}
  try{
    if(typeof xgateDrawBossGate==='function'&&!xgateDrawBossGate._mapSpecial){
      const _bg=xgateDrawBossGate;
      xgateDrawBossGate=function(D){
        const r=_bg.apply(this,arguments);
        try{
          if(D&&mapSpecialDef(D.kind)&&typeof netGatePt==='function'){
            const G=netGatePt(D);if(G&&typeof P==='function'&&typeof label==='function'){
              const open=typeof netGateOpen==='function'&&netGateOpen(D);
              const c=P(G.x,G.y);
              label(mapSpecialGateLabel(open,D.kind),c.x,c.y-48,open?'#ffe27a':'#c0c0d0','bold 10px sans-serif');
            }
          }
        }catch(err){}
        return r;
      };
      xgateDrawBossGate._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof netGateUI==='function'&&!netGateUI._mapSpecial){
      const _ui=netGateUI;
      netGateUI=function(){
        const r=_ui.apply(this,arguments);
        try{
          const D=(typeof S!=='undefined')?S.dg:null;
          const el=typeof document!=='undefined'&&document.getElementById('netbgate');
          const b=el&&el.firstChild;
          if(b&&D&&mapSpecialDef(D.kind)){
            const open=typeof netGateOpen==='function'&&netGateOpen(D);
            const t=open?('⛩ '+mapSpecialGateLabel(true,D.kind)+'：傳送到首領房'):('🔒 '+mapSpecialGateLabel(false,D.kind));
            if(b.textContent!==t)b.textContent=t;
          }
        }catch(err){}
        return r;
      };
      netGateUI._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgSpawnRoom==='function'&&!dgSpawnRoom._mapSpecial){
      const _sp=dgSpawnRoom;
      dgSpawnRoom=function(r){
        const ret=_sp.apply(this,arguments);
        try{mapSpecialTrimQueue(r);}catch(err){}
        return ret;
      };
      dgSpawnRoom._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgEnter==='function'&&!dgEnter._mapSpecial){
      const _de=dgEnter;
      dgEnter=function(){
        const r=_de.apply(this,arguments);
        try{if(r&&S&&S.dg)mapSpecialEnsureEvac(S.dg);}catch(err){}
        return r;
      };
      dgEnter._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgBossDown==='function'&&!dgBossDown._mapSpecial){
      const _bd=dgBossDown;
      dgBossDown=function(){
        const r=_bd.apply(this,arguments);
        try{if(S&&S.dg)mapSpecialEnsureExit(S.dg);}catch(err){}
        return r;
      };
      dgBossDown._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof drawDungeon==='function'&&!drawDungeon._mapSpecial){
      const _dd=drawDungeon;
      drawDungeon=function(){
        const r=_dd.apply(this,arguments);
        try{mapSpecialDrawDoors();}catch(err){}
        return r;
      };
      drawDungeon._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof update==='function'&&!update._mapSpecial){
      const _u=update;
      update=function(){
        const r=_u.apply(this,arguments);
        try{mapSpecialEnforceLive();}catch(err){}
        try{mapSpecialRoomProgress();}catch(err){}
        return r;
      };
      update._mapSpecial=1;n++;
    }
  }catch(e){}
  const ready=(typeof dgMob==='function'&&!!dgMob._mapSpecial&&(typeof label!=='function'||!!label._mapSpecialGate)&&(typeof xgateDrawBossGate!=='function'||!!xgateDrawBossGate._mapSpecial));
  if(ready){
    mapSpecialInstall._ok=true;
    mapSpecialBindEnemyName();
    try{
      if(typeof window!=='undefined'){
        window.XWMAP_XF={
          install:mapSpecialInstall,doorPos:mapXfBossDoorPos,place:mapXfPlaceAtDoor,
          name:mapXfBossDisplayName,bossN:MAP_XF_BOSS_N,
          realm:MAP_XF_BOSS_REALM,sub:MAP_XF_BOSS_SUB,minionRealm:MAP_XF_MINION_REALM,
          hook:mapSpecialHook,gateLabel:mapSpecialGateLabel,progress:mapSpecialRoomProgress
        };
        window.XWMAP_SPECIAL={
          hook:mapSpecialHook,onEnter:mapSpecialOnEnter,prepare:mapSpecialPrepare,
          place:mapXfPlaceAtDoor,doorPos:mapXfBossDoorPos,gateLabel:mapSpecialGateLabel,
          progress:mapSpecialRoomProgress,def:mapSpecialDef,
          defendTick:typeof mapDefendTick==='function'?mapDefendTick:null,
          defendThreats:typeof mapDefendThreats==='function'?mapDefendThreats:null,
          defendCandidates:typeof mapDefendCandidates==='function'?mapDefendCandidates:null,
          defendPick:typeof mapDefendPick==='function'?mapDefendPick:null,
          defendSend:typeof mapDefendSend==='function'?mapDefendSend:null,
          defendRecall:typeof mapDefendRecall==='function'?mapDefendRecall:null,
          defendArea:typeof mapDefendArea==='function'?mapDefendArea:null
        };
        if(window.XWMAP){
          window.XWMAP.xfBossName=mapXfBossDisplayName;
          window.XWMAP.xfBossDoorPos=mapXfBossDoorPos;
          window.XWMAP.special=mapSpecialDef;
          window.XWMAP.specialApi=window.XWMAP_SPECIAL;
        }
      }
    }catch(e){}
  }
  return !!mapSpecialInstall._ok;
}
mapSpecialInstall._ok=false;
function mapXfInstall(){return mapSpecialInstall();}

if(typeof setTimeout==='function'){
  setTimeout(function mapSpecialBoot(){
    try{mapSpecialInstall();}catch(e){}
    if(mapSpecialInstall._ok)return;
    setTimeout(mapSpecialBoot,40);
  },0);
}else{
  try{mapSpecialInstall();}catch(e){}
}
