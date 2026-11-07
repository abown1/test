// ================== v0.4.x map PHASE1：預設狀態／遷移／XW.map 註冊 ==================
function mapDefaultState(){
  return {
    v:1,
    unlocked:false,
    flags:Object.assign({},MAP_FLAGS_DEFAULT),
    size:MAP_TUNE.N_MAP,
    seedExtra:0,
    cities:[],
    mounts:[],
    gates:[],
    activeTravels:[],
    dgRun:null,
    dgRuns:{},
    memberRun:{},
    rng:{sects:{seed:0,a:0},travel:{seed:0,a:0},zb:{seed:0,a:0},dungeons:{seed:0,a:0},gf:{seed:0,a:0}},
    coordSpace:null,   // null|'N128'|'N288'；聯機升級見 MAP_SCHEMA §11
    fogMode:'shared',
    pendingGfLoot:[],
    fog:null,         // {w,h,cells:{'x,y':1}} 共用揭露格
    spawn:{enemies:0,sectNpcs:0,cityNpcs:0,caps:Object.assign({},MAP_TUNE.spawn)}
  };
}
function mapDefaultSects(){return [];}
function mapDefaultDiplo(){return {};}
function mapDefaultZb(){return {inv:[],carriers:{},pity:{dungeon:0,cross:0}};}
// 顯式初始化：寫入 S.map（及空的 sects／diplo／zb／travel）。僅在被呼叫時改 S。
function mapInitState(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  T.map=mapDefaultState();
  if(T.sects==null)T.sects=mapDefaultSects();
  if(T.diplo==null)T.diplo=mapDefaultDiplo();
  if(T.zb==null)T.zb=mapDefaultZb();
  if(T.travel==null)T.travel=null;
  return T.map;
}
// 遷移：缺欄才補；已有欄位不覆寫 flags／unlocked。可重入（冪等）。
function mapMigrateSave(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.map||typeof T.map!=='object')T.map=mapDefaultState();
  else{
    const D=mapDefaultState();
    if(T.map.v==null)T.map.v=D.v;
    if(typeof T.map.unlocked!=='boolean')T.map.unlocked=!!T.map.unlocked;
    if(!T.map.flags||typeof T.map.flags!=='object')T.map.flags=Object.assign({},MAP_FLAGS_DEFAULT);
    else{for(const k in MAP_FLAGS_DEFAULT)if(T.map.flags[k]==null)T.map.flags[k]=MAP_FLAGS_DEFAULT[k];}
    if(!(T.map.size>0))T.map.size=D.size;
    if(T.map.seedExtra==null)T.map.seedExtra=0;
    if(!Array.isArray(T.map.cities))T.map.cities=[];
    if(!Array.isArray(T.map.mounts))T.map.mounts=[];
    if(!Array.isArray(T.map.gates))T.map.gates=[];
    if(!Array.isArray(T.map.activeTravels))T.map.activeTravels=[];
    if(T.map.dgRun===undefined)T.map.dgRun=null;
    if(!T.map.dgRuns||typeof T.map.dgRuns!=='object')T.map.dgRuns={};
    if(!T.map.memberRun||typeof T.map.memberRun!=='object')T.map.memberRun={};
    if(!T.map.rng||typeof T.map.rng!=='object')T.map.rng={sects:{seed:0,a:0},travel:{seed:0,a:0},zb:{seed:0,a:0},dungeons:{seed:0,a:0}};
    else{const keys=['sects','travel','zb','dungeons','gf'];for(const k of keys){if(!T.map.rng[k])T.map.rng[k]={seed:0,a:0};if(T.map.rng[k].a==null)T.map.rng[k].a=T.map.rng[k].seed||0;}}
    if(T.map.coordSpace===undefined)T.map.coordSpace=null;
    // 定案 shared：舊 null／缺欄／perPlayer 標記升為 shared（實際格合併見 mapFogMigrate）
    if(T.map.fogMode==null||T.map.fogMode==='perPlayer')T.map.fogMode='shared';
    if(!Array.isArray(T.map.pendingSouls))T.map.pendingSouls=[];
    if(!Array.isArray(T.map.autoParties))T.map.autoParties=[];
    if(!Array.isArray(T.map.pendingGfLoot))T.map.pendingGfLoot=[];
    if(T.map.partyAcc==null)T.map.partyAcc=0;
    if(T.map.fog===undefined)T.map.fog=null;
    try{if(typeof mapFogEnsure==='function')mapFogEnsure(T);}catch(e){}
    // 舊單 dgRun 升成 dgRuns（冪等）
    if(T.map.dgRun&&T.map.dgRun.runId&&!T.map.dgRuns[T.map.dgRun.runId])T.map.dgRuns[T.map.dgRun.runId]=T.map.dgRun;
    if(!T.map.spawn||typeof T.map.spawn!=='object')T.map.spawn={enemies:0,sectNpcs:0,cityNpcs:0,caps:Object.assign({},MAP_TUNE.spawn)};
    else if(!T.map.spawn.caps)T.map.spawn.caps=Object.assign({},MAP_TUNE.spawn);
  }
  if(!Array.isArray(T.sects))T.sects=mapDefaultSects();
  if(!T.diplo||typeof T.diplo!=='object')T.diplo=mapDefaultDiplo();
  if(!T.zb||typeof T.zb!=='object')T.zb=mapDefaultZb();
  else{
    if(!Array.isArray(T.zb.inv))T.zb.inv=[];
    if(!T.zb.carriers||typeof T.zb.carriers!=='object')T.zb.carriers={};
    if(!T.zb.pity||typeof T.zb.pity!=='object')T.zb.pity={dungeon:0,cross:0};
  }
  if(T.travel===undefined)T.travel=null;
  return T.map;
}
// 輕量事件匯出（整合者可改接 UI／聯機）；PHASE1 只留陣列緩衝
var MAP_EVENTS=[];
function mapEmit(type,payload){
  const ev={t:type,at:(typeof S!=='undefined'&&S&&S.time!=null)?S.time:0,p:payload||{}};
  MAP_EVENTS.push(ev);if(MAP_EVENTS.length>200)MAP_EVENTS.shift();
  try{if(typeof window!=='undefined'&&window.XW&&typeof window.XW.onMapEvent==='function')window.XW.onMapEvent(ev);}catch(e){}
  return ev;
}
function mapBootAttach(){
  try{
    if(typeof window==='undefined')return;
    const api={
      flags:MAP_FLAGS_DEFAULT,tune:MAP_TUNE,flag:mapFlag,
      init:mapInitState,migrate:mapMigrateSave,defaultState:mapDefaultState,
      unlock:mapUnlock,onXian:mapOnXianUnlock,isUnlocked:mapIsUnlocked,
      xianUnlockNeed:typeof mapXianUnlockNeed==='function'?mapXianUnlockNeed:null,
      xianUnlockMaster:typeof mapXianUnlockMasterReached==='function'?mapXianUnlockMasterReached:null,
      xianUnlockShould:typeof mapXianUnlockShouldOpen==='function'?mapXianUnlockShouldOpen:null,
      xianUnlockSync:typeof mapXianUnlockSync==='function'?mapXianUnlockSync:null,
      sectsTick:mapSectsTick,travelTick:mapTravelTick,qiMul:mapQiMul,
      citiesPopulate:typeof mapCitiesPopulate==='function'?mapCitiesPopulate:null,
      cityAt:typeof mapCityAt==='function'?mapCityAt:null,
      cityInSafe:typeof mapCityInSafe==='function'?mapCityInSafe:null,
      cityAllowsPvp:typeof mapCityAllowsPvp==='function'?mapCityAllowsPvp:null,
      cityAllowsRobbery:typeof mapCityAllowsRobbery==='function'?mapCityAllowsRobbery:null,
      cityServices:typeof mapCityServices==='function'?mapCityServices:null,
      cityServiceDo:typeof mapCityServiceDo==='function'?mapCityServiceDo:null,
      mountsPopulate:typeof mapMountsPopulate==='function'?mapMountsPopulate:null,
      mountAt:typeof mapMountAt==='function'?mapMountAt:null,
      sectsPopulate:typeof mapSectsPopulate==='function'?mapSectsPopulate:null,
      diploGet:typeof mapDiploGet==='function'?mapDiploGet:null,
      diploAdjust:typeof mapDiploAdjust==='function'?mapDiploAdjust:null,
      sectById:typeof mapSectById==='function'?mapSectById:null,
      SECTS:typeof MAP_SECTS!=='undefined'?MAP_SECTS:null,
      enemyDecorate:typeof mapEnemyDecorate==='function'?mapEnemyDecorate:null,
      onEnemyKilled:typeof mapOnEnemyKilled==='function'?mapOnEnemyKilled:null,
      zbRoll:typeof mapZbRoll==='function'?mapZbRoll:null,
      unitEquipZb:typeof mapUnitEquipZb==='function'?mapUnitEquipZb:null,
      enemyCapEnforce:typeof mapEnemyCapEnforce==='function'?mapEnemyCapEnforce:null,
      ZHIBAO:typeof MAP_ZHIBAO!=='undefined'?MAP_ZHIBAO:null,
      zbRate:mapZbRollRate,zbPower:mapZbPowerMul,emit:mapEmit,events:MAP_EVENTS,
      CITIES:typeof MAP_CITIES!=='undefined'?MAP_CITIES:null,
      MOUNTS:typeof MAP_MOUNTS!=='undefined'?MAP_MOUNTS:null,
      travelStart:typeof mapTravelStart==='function'?mapTravelStart:null,
      travelCap:typeof mapTravelCap==='function'?mapTravelCap:null,
      gatesPopulate:typeof mapGatesPopulate==='function'?mapGatesPopulate:null,
      dgsRegister:typeof mapDgsRegister==='function'?mapDgsRegister:null,
      dgEnter:typeof mapDgEnter==='function'?mapDgEnter:null,
      dgEnterBoss:typeof mapDgEnterBoss==='function'?mapDgEnterBoss:null,
      dgClear:typeof mapDgClear==='function'?mapDgClear:null,
      dgExit:typeof mapDgExit==='function'?mapDgExit:null,
      DGS_MAP:typeof MAP_DGS!=='undefined'?MAP_DGS:null,
      TRAVEL_ENC:typeof MAP_TRAVEL_ENC!=='undefined'?MAP_TRAVEL_ENC:null,
      partyTick:typeof mapPartyTick==='function'?mapPartyTick:null,
      partyForm:typeof mapPartyForm==='function'?mapPartyForm:null,
      partyDepart:typeof mapPartyDepart==='function'?mapPartyDepart:null,
      partyResolve:typeof mapPartyResolve==='function'?mapPartyResolve:null,
      mapPay:typeof mapPay==='function'?mapPay:null,
      mapGain:typeof mapGain==='function'?mapGain:null,
      mapCanPay:typeof mapCanPay==='function'?mapCanPay:null,
      pay:typeof mapPay==='function'?mapPay:null,
      gain:typeof mapGain==='function'?mapGain:null,
      canPay:typeof mapCanPay==='function'?mapCanPay:null,
      mapDefeatResolve:typeof mapDefeatResolve==='function'?mapDefeatResolve:null,
      defeatResolve:typeof mapDefeatResolve==='function'?mapDefeatResolve:null,
      mapRecordSoul:typeof mapRecordSoul==='function'?mapRecordSoul:null,
      recordSoul:typeof mapRecordSoul==='function'?mapRecordSoul:null,
      mapOnDeathResolved:typeof mapOnDeathResolved==='function'?mapOnDeathResolved:null,
      onDeathResolved:typeof mapOnDeathResolved==='function'?mapOnDeathResolved:null,
      soulTryDestroy:typeof mapSoulTryDestroy==='function'?mapSoulTryDestroy:null,
      sanitizeEntities:typeof mapSanitizeSharedEntities==='function'?mapSanitizeSharedEntities:null,
      ensureEntityXY:typeof mapEnsureEntityXY==='function'?mapEnsureEntityXY:null,
      cityTradeSell:typeof mapCityTradeSell==='function'?mapCityTradeSell:null,
      travelJoin:typeof mapTravelJoin==='function'?mapTravelJoin:null,
      travelLeave:typeof mapTravelLeave==='function'?mapTravelLeave:null,
      travelOwnerDisc:typeof mapTravelOnOwnerDisconnect==='function'?mapTravelOnOwnerDisconnect:null,
      rngExport:typeof mapRngExport==='function'?mapRngExport:null,
      rngImport:typeof mapRngImport==='function'?mapRngImport:null,
      coordFromLegacy:typeof mapCoordFromLegacy==='function'?mapCoordFromLegacy:null,
      dgRuns:typeof mapDgRunsEnsure==='function'?mapDgRunsEnsure:null,
      dgBind:typeof mapDgBindMember==='function'?mapDgBindMember:null,
      gfGrant:typeof mapGfGrant==='function'?mapGfGrant:null,
      gfInvCount:typeof mapGfInvCount==='function'?mapGfInvCount:null,
      gfTryDrop:typeof mapGfTryDrop==='function'?mapGfTryDrop:null,
      gfCatalog:typeof MAP_GF_CATALOG!=='undefined'?MAP_GF_CATALOG:null
    };
    window.XWMAP=api;
    if(window.XW)window.XW.map=api;
    try{if(typeof mapInstallDeathHook==='function')mapInstallDeathHook();}catch(e){}
  }catch(e){}
}
mapBootAttach();
if(typeof setTimeout==='function'){
  setTimeout(function mapBootRetry(){
    try{if(typeof window!=='undefined'&&window.XW&&!window.XW.map)mapBootAttach();}catch(e){}
  },0);
}
