// ================== v0.4.x map：外層世界解鎖（PHASE1–3）==================
// MAP_FLAGS_DEFAULT.world 保持 false（不改 map_flags.js）。
// 玩家／宗主達到 MAP_TUNE.unlockRealm（煉氣）後，才在「這份存檔」打開
// S.map.flags.world 及外層內容旗，再 populate 城鎮／山脈／宗門／關口。
// 煉氣以下維持鎖定；client 不自開（交給 host 的 S.map 同步）。
// g23 xmod 會把新旗全開：解鎖拒絕時把 world 釘回 false，且絕不碰 dgArea。
function mapXianUnlockNeed(){
  try{
    if(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE.unlockRealm!=null)return MAP_TUNE.unlockRealm|0;
  }catch(e){}
  return 4;
}
function mapXianUnlockFlagKeys(){
  try{
    const W=typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE.worldUnlock;
    if(W&&Array.isArray(W.flags)&&W.flags.length)return W.flags.slice();
  }catch(e){}
  return ['world','cities','mountQi','sects','dungeons','travel'];
}
function mapXianUnlockNeverFlags(){
  const out={dgArea:1};
  try{
    const W=typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE.worldUnlock;
    if(W&&Array.isArray(W.neverFlags))for(const k of W.neverFlags)if(k)out[k]=1;
  }catch(e){}
  return out;
}
function mapXianUnlockIsClient(){
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  return false;
}
function mapXianUnlockUnitIsMaster(u){
  if(!u||u.dead)return false;
  if(u.kind==='disciple'||u.kind==='enemy'||u.kind==='beast')return false;
  return u.kind==='player'||!!u.np;
}
function mapXianUnlockMasterReached(){
  const need=mapXianUnlockNeed();
  // 只看玩家／宗主在「這份存檔」的當前或曾達境界。弟子突破不開外層。
  // 不用 xwPeakRealm()／S.flags.peakRealm（會算進弟子，且上一份存檔的旗標
  // 不會殘留：applySave 會 S=newState() 換成新物件）。
  const ok=u=>{
    if(!mapXianUnlockUnitIsMaster(u))return false;
    return (u.realm|0)>=need||(u.peakRealm|0)>=need;
  };
  try{if(typeof player==='function'&&ok(player()))return true;}catch(e){}
  try{
    if(typeof S!=='undefined'&&S&&Array.isArray(S.units)){
      for(const u of S.units)if(ok(u))return true;
    }
  }catch(e){}
  return false;
}
function mapXianUnlockShouldOpen(){
  try{
    if(mapXianUnlockIsClient())return !!(typeof S!=='undefined'&&S&&S.map&&S.map.unlocked);
    return mapXianUnlockMasterReached();
  }catch(e){return false;}
}
function mapXianUnlockEnableFlags(){
  if(typeof S==='undefined'||!S)return;
  if(!S.map)mapMigrateSave(S);
  if(!S.map.flags||typeof S.map.flags!=='object')S.map.flags={};
  const never=mapXianUnlockNeverFlags();
  for(const k of mapXianUnlockFlagKeys()){
    if(!k||never[k])continue;
    S.map.flags[k]=true;
  }
}
function mapXianUnlockPinWorldOff(){
  try{
    if(mapXianUnlockIsClient())return;
    if(typeof S==='undefined'||!S||!S.map)return;
    S.map.unlocked=false;
    if(S.map.flags)S.map.flags.world=false;
  }catch(e){}
}
function mapUnlock(seed){
  if(!mapXianUnlockShouldOpen()){
    mapXianUnlockPinWorldOff();
    return false;
  }
  if(typeof S==='undefined'||!S)return false;
  if(!S.map)mapMigrateSave(S);
  mapXianUnlockEnableFlags();
  if(!mapFlag('world'))return false;
  const first=!S.map.unlocked;
  if(first){
    const sd=(seed==null?(S.seed||0):seed)|0;
    S.map.unlocked=true;
    S.map.seedExtra=(sd^0x4d4150)>>>0;
    S.map.size=MAP_TUNE.N_MAP;
    S.map.spawn=S.map.spawn||{enemies:0,sectNpcs:0,cityNpcs:0};
    if(!Array.isArray(S.map.cities))S.map.cities=[];
    if(!Array.isArray(S.map.mounts))S.map.mounts=[];
    if(!Array.isArray(S.map.gates))S.map.gates=[];
    if(!Array.isArray(S.map.activeTravels))S.map.activeTravels=[];
    if(S.map.dgRun==null)S.map.dgRun=null;
  }
  try{if(typeof mapCitiesPopulate==='function')mapCitiesPopulate();}catch(e){}
  try{if(typeof mapMountsPopulate==='function')mapMountsPopulate();}catch(e){}
  try{if(typeof mapSectsPopulate==='function')mapSectsPopulate();}catch(e){}
  try{if(typeof mapGatesPopulate==='function')mapGatesPopulate();}catch(e){}
  try{if(typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}
  if(first){
    try{if(typeof mapEmit==='function')mapEmit('map:unlock',{size:S.map.size,seedExtra:S.map.seedExtra,
      cities:(S.map.cities&&S.map.cities.length)||0,mounts:(S.map.mounts&&S.map.mounts.length)||0,
      sects:(S.sects&&S.sects.length)||0,gates:(S.map.gates&&S.map.gates.length)||0});}catch(e){}
  }
  return true;
}
function mapOnXianUnlock(){
  if(typeof S==='undefined'||!S)return false;
  if(!S.map)mapMigrateSave(S);
  return mapUnlock(S.seed);
}
function mapIsUnlocked(){
  try{return !!(typeof S!=='undefined'&&S&&S.map&&S.map.unlocked&&mapFlag('world'));}catch(e){return false;}
}
function mapXianUnlockSync(){
  try{
    if(typeof S==='undefined'||!S)return false;
    if(!S.map)mapMigrateSave(S);
    if(mapXianUnlockIsClient())return !!(S.map&&S.map.unlocked);
    if(mapXianUnlockShouldOpen())return mapUnlock(S.seed);
    mapXianUnlockPinWorldOff();
    return false;
  }catch(e){return false;}
}
function mapXianUnlockWrapXmod(){
  try{
    if(typeof xmapUnlockIf==='function'&&!xmapUnlockIf._mapXianUnlock){
      const _x=xmapUnlockIf;
      xmapUnlockIf=function(){
        if(!mapXianUnlockShouldOpen()){
          mapXianUnlockPinWorldOff();
          return false;
        }
        const r=_x.apply(this,arguments);
        try{mapXianUnlockSync();}catch(e){}
        return r;
      };
      xmapUnlockIf._mapXianUnlock=1;
    }
    if(typeof xmodSeedDefaults==='function'&&!xmodSeedDefaults._mapXianUnlock){
      const _s=xmodSeedDefaults;
      xmodSeedDefaults=function(){
        const r=_s.apply(this,arguments);
        try{if(typeof MAP_FLAGS_DEFAULT!=='undefined')MAP_FLAGS_DEFAULT.world=false;}catch(e){}
        return r;
      };
      xmodSeedDefaults._mapXianUnlock=1;
    }
    if(typeof xmodEnsureState==='function'&&!xmodEnsureState._mapXianUnlock){
      const _e=xmodEnsureState;
      xmodEnsureState=function(){
        const r=_e.apply(this,arguments);
        try{if(typeof MAP_FLAGS_DEFAULT!=='undefined')MAP_FLAGS_DEFAULT.world=false;}catch(e){}
        mapXianUnlockPinWorldOff();
        return r;
      };
      xmodEnsureState._mapXianUnlock=1;
    }
    if(typeof xmodApply==='function'&&!xmodApply._mapXianUnlock){
      const _a=xmodApply;
      xmodApply=function(){
        const r=_a.apply(this,arguments);
        try{if(typeof MAP_FLAGS_DEFAULT!=='undefined')MAP_FLAGS_DEFAULT.world=false;}catch(e){}
        mapXianUnlockSync();
        return r;
      };
      xmodApply._mapXianUnlock=1;
    }
  }catch(e){}
}
function mapXianUnlockWrapLifecycle(){
  try{
    if(typeof applySave==='function'&&!applySave._mapXianUnlock){
      const _as=applySave;
      applySave=function(){
        const r=_as.apply(this,arguments);
        try{mapXianUnlockSync();}catch(e){}
        return r;
      };
      applySave._mapXianUnlock=1;
    }
    if(typeof newGame==='function'&&!newGame._mapXianUnlock){
      const _ng=newGame;
      newGame=function(){
        const r=_ng.apply(this,arguments);
        try{mapXianUnlockSync();}catch(e){}
        return r;
      };
      newGame._mapXianUnlock=1;
    }
    if(typeof doBreak==='function'&&!doBreak._mapXianUnlock){
      const _db=doBreak;
      doBreak=function(){
        const r=_db.apply(this,arguments);
        try{mapXianUnlockSync();}catch(e){}
        return r;
      };
      doBreak._mapXianUnlock=1;
    }
    if(typeof afterLoad==='function'&&!afterLoad._mapXianUnlock){
      const _al=afterLoad;
      afterLoad=function(){
        const r=_al.apply(this,arguments);
        try{mapXianUnlockSync();}catch(e){}
        return r;
      };
      afterLoad._mapXianUnlock=1;
    }
  }catch(e){}
}
function mapXianUnlockInstall(){
  mapXianUnlockWrapXmod();
  mapXianUnlockWrapLifecycle();
  try{
    if(typeof window!=='undefined'&&window.XWMAP){
      window.XWMAP.xianUnlockNeed=mapXianUnlockNeed;
      window.XWMAP.xianUnlockMaster=mapXianUnlockMasterReached;
      window.XWMAP.xianUnlockShould=mapXianUnlockShouldOpen;
      window.XWMAP.xianUnlockSync=mapXianUnlockSync;
    }
  }catch(e){}
  const haveXmod=(typeof xmodApply==='function');
  const haveLife=(typeof applySave==='function');
  return !!(haveXmod||haveLife||(typeof mapUnlock==='function'));
}
function mapXianUnlockBoot(){
  try{mapXianUnlockInstall();}catch(e){}
  const waitingXmod=(typeof xmodApply!=='function')||!xmodApply._mapXianUnlock;
  const waitingLife=(typeof applySave!=='function')||!applySave._mapXianUnlock;
  const waitingXmap=(typeof xmapUnlockIf!=='function')||!xmapUnlockIf._mapXianUnlock;
  const wrapped=!(waitingXmod||waitingLife||waitingXmap);
  if(typeof setTimeout==='function'){
    const ms=(function(){
      try{
        const n=MAP_TUNE&&MAP_TUNE.worldUnlock&&MAP_TUNE.worldUnlock.pollMs;
        if(n>0)return n|0;
      }catch(e){}
      return 1200;
    })();
    if(!mapXianUnlockBoot._poll&&typeof setInterval==='function'){
      mapXianUnlockBoot._poll=1;
      setInterval(function(){try{mapXianUnlockSync();}catch(e){}},ms);
    }
    if(!wrapped){
      mapXianUnlockBoot._tries=(mapXianUnlockBoot._tries||0)+1;
      if(mapXianUnlockBoot._tries<80)setTimeout(mapXianUnlockBoot,30);
    }
  }
}
if(typeof setTimeout==='function')setTimeout(mapXianUnlockBoot,0);
else try{mapXianUnlockInstall();}catch(e){}
