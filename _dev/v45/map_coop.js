// ================== v0.4.x map：聯機契約輔助（欄位／RNG／座標；不改 net*）==================
// 用語對齊 NET_DESIGN／net2：pkey、房主權威、snapshot／netShareWorld、S.flags.netOwner／netWv
var MAP_COOP_RNG_KEYS=['sects','travel','zb','dungeons','gf'];
function mapCoopPkeyFallback(){
  try{if(typeof NET!=='undefined'&&NET&&NET.pkey)return NET.pkey;}catch(e){}
  try{if(typeof S!=='undefined'&&S&&S.flags&&S.flags.netOwner)return S.flags.netOwner;}catch(e){}
  return 'local';
}
function mapRngEnsure(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T||!T.map)return null;
  if(!T.map.rng||typeof T.map.rng!=='object')T.map.rng={};
  for(const k of MAP_COOP_RNG_KEYS){
    if(!T.map.rng[k]||typeof T.map.rng[k]!=='object')T.map.rng[k]={seed:0,a:0};
    if(T.map.rng[k].seed==null)T.map.rng[k].seed=0;
    if(T.map.rng[k].a==null)T.map.rng[k].a=T.map.rng[k].seed||0;
  }
  return T.map.rng;
}
function mapRngStream(name,seedInit){
  const R=mapRngEnsure();if(!R){let a=((seedInit>>>0)||1);return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  const key=MAP_COOP_RNG_KEYS.indexOf(name)>=0?name:'travel';
  if(!R[key].seed){const s=((seedInit!=null?seedInit:(S.map&&S.map.seedExtra)||1)>>>0)||1;R[key].seed=s;R[key].a=s;}
  const st=R[key];
  return function(){let a=st.a|0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;st.a=a;return ((t^t>>>14)>>>0)/4294967296;};
}
function mapRngExport(target){
  const R=mapRngEnsure(target);if(!R)return null;
  const out={};for(const k of MAP_COOP_RNG_KEYS)out[k]={seed:R[k].seed|0,a:R[k].a|0};
  return out;
}
function mapRngImport(snap,target){
  if(!snap||typeof snap!=='object')return false;
  const R=mapRngEnsure(target);if(!R)return false;
  for(const k of MAP_COOP_RNG_KEYS){
    if(!snap[k])continue;
    R[k].seed=(snap[k].seed|0)>>>0;
    R[k].a=(snap[k].a!=null?snap[k].a:snap[k].seed)|0;
  }
  return true;
}
// ---- N128→288 座標（舊圖置中，offset=MAP_CORE_OFF=80）----
function mapCoordFromLegacy(x,y){
  const off=(typeof MAP_CORE_OFF==='number')?MAP_CORE_OFF:80;
  return {x:(+x||0)+off,y:(+y||0)+off};
}
function mapCoordToLegacy(x,y){
  const off=(typeof MAP_CORE_OFF==='number')?MAP_CORE_OFF:80;
  return {x:(+x||0)-off,y:(+y||0)-off};
}
function mapMigrateOnlineCoords(target){
  // 僅狀態遷移標記；地形由整合者／genWorld 處理。冪等：設 map.coordSpace
  const T=target||(typeof S!=='undefined'?S:null);if(!T||!T.map)return false;
  if(T.map.coordSpace==='N288')return true;
  if(T.map.unlocked&&(T.map.size|0)>=288){T.map.coordSpace='N288';return true;}
  if((T.map.size|0)===128||T.map.coordSpace==='N128'){
    // 標記待升；實際單位座標平移由整合者在 unlock 時呼叫 mapShiftUnitsFromLegacy
    T.map.coordSpace='N128';
  }
  return true;
}
function mapShiftUnitsFromLegacy(units){
  if(!Array.isArray(units))return 0;let n=0;
  for(const u of units){
    if(!u||u._mapShifted288)continue;
    if(u.x==null||u.y==null)continue;
    const c=mapCoordFromLegacy(u.x,u.y);u.x=c.x;u.y=c.y;u._mapShifted288=1;n++;
  }
  return n;
}
// ---- 飛行：ownerId + volunteers ----
function mapTravelJoin(travelId,mem){
  if(!mapFlag('travel')||!S||!S.map)return {ok:false,reason:'flag_off'};
  const tr=(S.map.activeTravels||[]).find(t=>t.id===travelId);if(!tr)return {ok:false,reason:'no_travel'};
  if(!Array.isArray(tr.volunteers))tr.volunteers=[];
  const pkey=(mem&&mem.pkey)||mapCoopPkeyFallback();
  if(tr.ownerId===pkey)return {ok:true,already:true};
  if(tr.volunteers.some(v=>v.pkey===pkey))return {ok:true,already:true};
  if(tr.volunteers.length>=8)return {ok:false,reason:'full'};
  if(tr.phase==='arrive')return {ok:false,reason:'arrived'};
  tr.volunteers.push({pkey,unitId:mem&&mem.unitId||null,joinedAt:S.time||0});
  if(mem&&mem.unitId&&Array.isArray(tr.party)&&tr.party.indexOf(mem.unitId)<0)tr.party.push(mem.unitId);
  return {ok:true};
}
function mapTravelLeave(travelId,pkey){
  if(!mapFlag('travel')||!S||!S.map)return {ok:false,reason:'flag_off'};
  const tr=(S.map.activeTravels||[]).find(t=>t.id===travelId);if(!tr)return {ok:false,reason:'no_travel'};
  pkey=pkey||mapCoopPkeyFallback();
  if(tr.ownerId===pkey)return mapTravelOnOwnerDisconnect(travelId);
  if(!Array.isArray(tr.volunteers))tr.volunteers=[];
  const before=tr.volunteers.length;
  tr.volunteers=tr.volunteers.filter(v=>v.pkey!==pkey);
  return {ok:true,left:before!==tr.volunteers.length};
}
function mapTravelOnOwnerDisconnect(travelId){
  if(!S||!S.map)return {ok:false,reason:'no_map'};
  const tr=(S.map.activeTravels||[]).find(t=>t.id===travelId);if(!tr)return {ok:false,reason:'no_travel'};
  if(!Array.isArray(tr.volunteers))tr.volunteers=[];
  // 升第一位志工為新 owner；無人則取消行程（對齊換房主／斷線契約）
  if(tr.volunteers.length){
    const v=tr.volunteers.shift();
    tr.ownerId=v.pkey;
    tr.ownerPromoted=true;
    return {ok:true,promoted:v.pkey};
  }
  S.map.activeTravels=S.map.activeTravels.filter(t=>t.id!==tr.id);
  if(S.travel&&S.travel.id===tr.id)S.travel=null;
  return {ok:true,cancelled:true};
}
// ---- 多副本分區 dgRuns ----
function mapDgRunsEnsure(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T||!T.map)return null;
  if(!T.map.dgRuns||typeof T.map.dgRuns!=='object')T.map.dgRuns={};
  if(!T.map.memberRun||typeof T.map.memberRun!=='object')T.map.memberRun={};
  return T.map.dgRuns;
}
function mapDgRunIdNew(){
  const s=(S.map&&S.map.seedExtra)||0,t=(S.time|0);
  return 'run_'+s+'_'+t+'_'+Math.floor(Math.random()*1e6).toString(36);
}
function mapDgBindMember(pkey,runId){
  mapDgRunsEnsure();if(!pkey)return false;S.map.memberRun[pkey]=runId||null;return true;
}
function mapDgUnbindMember(pkey){
  if(!S||!S.map||!S.map.memberRun)return false;delete S.map.memberRun[pkey];return true;
}
function mapDgGetRun(runId){
  mapDgRunsEnsure();return (S.map.dgRuns&&S.map.dgRuns[runId])||null;
}
function mapDgSetFocus(runId){
  // 單機／本地視窗焦點：S.map.dgRun 與 S.dg 指向該分區（房主權威下由 snapshot 同步）
  const run=mapDgGetRun(runId);if(!run)return false;
  S.map.dgRun=run;
  if(S.dg&&S.dg._map){S.dg.runId=runId;S.dg.kind=run.kind;}
  return true;
}
// ---- 共用迷霧（定案 fogMode='shared'；房主權威單格網）----
function mapFogSize(){
  const n=(typeof S!=='undefined'&&S&&S.map&&S.map.size)||((typeof MAP_TUNE!=='undefined'&&MAP_TUNE.N_MAP)||288);
  return n|0;
}
function mapFogEnsure(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T||!T.map)return null;
  if(T.map.fogMode==null||T.map.fogMode==='perPlayer')T.map.fogMode='shared';
  const n=mapFogSize();
  if(!T.map.fog||typeof T.map.fog!=='object')T.map.fog={w:n,h:n,cells:{}};
  else{
    if(!(T.map.fog.w>0))T.map.fog.w=n;
    if(!(T.map.fog.h>0))T.map.fog.h=n;
    if(!T.map.fog.cells||typeof T.map.fog.cells!=='object')T.map.fog.cells={};
  }
  return T.map.fog;
}
function mapFogKey(x,y){return (x|0)+','+(y|0);}
function mapFogReveal(x,y,target){
  const fog=mapFogEnsure(target);if(!fog)return false;
  const X=x|0,Y=y|0;if(X<0||Y<0||X>=fog.w||Y>=fog.h)return false;
  fog.cells[mapFogKey(X,Y)]=1;return true;
}
function mapFogIsRevealed(x,y,target){
  const fog=mapFogEnsure(target);if(!fog)return false;
  return !!fog.cells[mapFogKey(x|0,y|0)];
}
// 聯集合併：members 探索揭露寫入共用格；legacy per-player 亦走此
function mapFogMergeUnion(other,target){
  const fog=mapFogEnsure(target);if(!fog||!other)return 0;
  let n=0;
  const src=other.cells||other; // 允許 {cells} 或 平面 map
  if(src&&typeof src==='object'){
    for(const k of Object.keys(src)){
      if(!src[k])continue;
      if(!fog.cells[k]){fog.cells[k]=1;n++;}
    }
  }
  return n;
}
function mapFogMergeLegacyPerPlayer(perPlayer,target){
  // perPlayer: { [pkey]: {cells} | fogObj }
  if(!perPlayer||typeof perPlayer!=='object')return 0;
  let n=0;
  for(const pk of Object.keys(perPlayer)){
    n+=mapFogMergeUnion(perPlayer[pk],target);
  }
  const T=target||S;if(T&&T.map)T.map.fogMode='shared';
  return n;
}
// 128→288：舊霧複製到 offset 80；外圈未揭露
function mapFogMigrate128to288(legacyFog,target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T||!T.map)return false;
  const off=(typeof MAP_CORE_OFF==='number')?MAP_CORE_OFF:80;
  const n=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.N_MAP)||288;
  T.map.size=n;T.map.coordSpace='N288';T.map.fogMode='shared';
  const fog=mapFogEnsure(T);
  fog.w=n;fog.h=n;fog.cells={};
  const src=legacyFog&&(legacyFog.cells||legacyFog);
  if(src&&typeof src==='object'){
    for(const k of Object.keys(src)){
      if(!src[k])continue;
      const p=k.split(',');const x=(+p[0])|0,y=(+p[1])|0;
      const X=x+off,Y=y+off;
      if(X>=0&&Y>=0&&X<n&&Y<n)fog.cells[mapFogKey(X,Y)]=1;
    }
  }
  return true;
}
// 新成員加入：取得共用霧快照（整合者塞進 welcome／full）
function mapFogSharedSnapshot(target){
  const fog=mapFogEnsure(target);if(!fog)return null;
  return {mode:'shared',w:fog.w,h:fog.h,cells:Object.assign({},fog.cells)};
}
