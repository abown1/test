// ================== net19：新地圖聯機契約（MAP_SCHEMA §11）==================
// wrap-only：經 netCast 為既有 st 附 map 慢狀態（不重建 netHostSend，保留 net11/18 等擴充）。
// 聯機時 gate 不支援的 travel／多分區入口與 tick；不改使用者存檔 flags。單機（無 NET.role）不受影響。
const NETMAP={fogSent:Object.create(null),mapSig:'',fogPend:Object.create(null),fogFlushT:0,fogPendR:null,block:{travelSim:true,dgRunsSim:true},st:0,rx:0,fogRx:0,lastStKeys:null,lastSlowStKeys:null,sectsTickN:0,travelTickN:0};
const NETMAP_UNIT=['zbId','zbTid'],NETMAP_EN=['eq','zbId','zbTid','sectId','_mapBandit'];
const NETMAP_FOG_R=9,NETMAP_FOG_RMAX=12,NETMAP_FOG_BATCH=200;
function netMapKeepPush(arr,ks){if(!arr||!Array.isArray(arr))return;for(const k of ks)if(!arr.includes(k))arr.push(k);}
try{netMapKeepPush(typeof UNIT_KEEP!=='undefined'?UNIT_KEEP:null,NETMAP_UNIT);netMapKeepPush(typeof EN_KEEP!=='undefined'?EN_KEEP:null,NETMAP_EN);}catch(e){}
for(const k of NETMAP_UNIT)if(typeof NET_LIVE_U!=='undefined'&&Array.isArray(NET_LIVE_U)&&!NET_LIVE_U.includes(k))NET_LIVE_U.push(k);
for(const k of ['eq','zbId','zbTid','sectId'])if(typeof NET_LIVE_E!=='undefined'&&Array.isArray(NET_LIVE_E)&&!NET_LIVE_E.includes(k))NET_LIVE_E.push(k);

function netMapIsHost(){return typeof NET!=='undefined'&&NET.role==='host';}
function netMapIsClient(){return typeof NET!=='undefined'&&NET.role==='client';}
function netMapOnline(){return typeof NET!=='undefined'&&!!NET.role;} // host|client；單機未聯機為 falsy
function netMapMigrate(){try{if(typeof mapMigrateSave==='function')mapMigrateSave(S);if(typeof mapRngEnsure==='function')mapRngEnsure(S);if(typeof mapFogEnsure==='function')mapFogEnsure(S);if(typeof mapDgRunsEnsure==='function')mapDgRunsEnsure(S);if(S&&S.map){S.map.fogMode=S.map.fogMode||'shared';}}catch(e){}}
function netMapFogToExplored(){try{if(!S||!S.map||!S.map.fog||!S.map.fog.cells||typeof explored==='undefined')return 0;
  const cells=S.map.fog.cells,n=typeof N==='number'?N:128;let c=0;
  for(const k of Object.keys(cells)){if(!cells[k])continue;const p=k.split(','),x=+p[0]|0,y=+p[1]|0;
    if(x>=0&&y>=0&&x<n&&y<n){const i=y*n+x;if(!explored[i]){explored[i]=1;c++;}}}
  if(c){if(typeof resetFog==='function')resetFog();if(typeof mmDirty!=='undefined')mmDirty=true;}return c;
}catch(e){return 0;}}
function netMapApplyFogSnap(fog){if(!fog)return;try{netMapMigrate();
  if(fog.cells){if(typeof mapFogMergeUnion==='function')mapFogMergeUnion(fog,S);else Object.assign((S.map.fog.cells||(S.map.fog.cells={})),fog.cells);}
  if(fog.w)S.map.fog.w=fog.w;if(fog.h)S.map.fog.h=fog.h;S.map.fogMode='shared';netMapFogToExplored();
}catch(e){}}
function netMapApplyMapPack(p){if(!p||!S)return;if(netMapXwGate(p))return;try{netMapMigrate();
  if(p.map&&typeof p.map==='object'&&p.map.flags){S.map=p.map;netMapMigrate();}
  const has=k=>Object.prototype.hasOwnProperty.call(p,k);
  if(has('unlocked'))S.map.unlocked=!!p.unlocked;
  if(has('flags')&&p.flags)S.map.flags=Object.assign({},S.map.flags||{},p.flags);
  if(has('size'))S.map.size=p.size;
  if(has('seedExtra'))S.map.seedExtra=p.seedExtra;
  if(has('coordSpace'))S.map.coordSpace=p.coordSpace; // 不 +80
  if(has('fogMode'))S.map.fogMode=p.fogMode||'shared';
  if(has('cities'))S.map.cities=Array.isArray(p.cities)?p.cities:[];
  if(has('mounts'))S.map.mounts=Array.isArray(p.mounts)?p.mounts:[];
  if(has('gates'))S.map.gates=Array.isArray(p.gates)?p.gates:[];
  if(has('activeTravels'))S.map.activeTravels=Array.isArray(p.activeTravels)?p.activeTravels:[];
  if(has('dgRuns'))S.map.dgRuns=p.dgRuns&&typeof p.dgRuns==='object'?p.dgRuns:{};
  if(has('memberRun'))S.map.memberRun=p.memberRun&&typeof p.memberRun==='object'?p.memberRun:{};
  if(has('dgRun'))S.map.dgRun=p.dgRun==null?null:p.dgRun;
  if(has('spawn'))S.map.spawn=p.spawn;
  if(has('rng')){if(typeof mapRngImport==='function')mapRngImport(p.rng,S);else if(p.rng)S.map.rng=p.rng;}
  if(has('sects'))S.sects=Array.isArray(p.sects)?p.sects:[];
  if(has('diplo'))S.diplo=p.diplo&&typeof p.diplo==='object'?p.diplo:{};
  if(has('zb'))S.zb=p.zb;
  if(has('travel'))S.travel=p.travel;
  if(p.fog)netMapApplyFogSnap(p.fog);
  if(p.fogAdd){if(typeof mapFogMergeUnion==='function')mapFogMergeUnion({cells:p.fogAdd},S);else Object.assign(S.map.fog.cells,p.fogAdd);netMapFogToExplored();}
  netMapXwLocal();
}catch(e){try{netLog('netMap apply',String(e&&e.message||e));}catch(_){}}}
// 完整內容簽名（含同長度但值變、清空）；霧格數另以 delta，不進簽名以免每格都全量
function netMapSlowSig(){if(!S||!S.map)return '';
  try{return JSON.stringify({
    u:!!S.map.unlocked,xw:netXwN(),f:S.map.flags,sz:S.map.size,se:S.map.seedExtra,cs:S.map.coordSpace,fm:S.map.fogMode||'shared',
    sp:S.map.spawn,ci:S.map.cities,mo:S.map.mounts,ga:S.map.gates,
    at:S.map.activeTravels,dr:S.map.dgRun,DRS:S.map.dgRuns,mr:S.map.memberRun,rng:S.map.rng,
    sects:S.sects,diplo:S.diplo,zb:S.zb,tr:S.travel
  });}catch(e){return String(Date.now());}}
function netMapFogDelta(full){try{netMapMigrate();const fog=S.map&&S.map.fog;if(!fog)return null;
  if(full){NETMAP.fogSent=Object.create(null);for(const k of Object.keys(fog.cells||{}))NETMAP.fogSent[k]=1;return {mode:'shared',w:fog.w,h:fog.h,cells:Object.assign({},fog.cells)};}
  const add={};let n=0;for(const k of Object.keys(fog.cells||{})){if(NETMAP.fogSent[k])continue;add[k]=1;NETMAP.fogSent[k]=1;if(++n>=800)break;}
  return n?add:null;}catch(e){return null;}}
function netMapSlowPack(fullFog){if(!S)return null;netMapMigrate();if(!S.map)return null;
  const pack={
    unlocked:!!S.map.unlocked,xw:netXwN(),flags:S.map.flags,size:S.map.size,seedExtra:S.map.seedExtra,
    coordSpace:S.map.coordSpace,fogMode:S.map.fogMode||'shared',spawn:S.map.spawn,
    cities:S.map.cities,mounts:S.map.mounts,gates:S.map.gates,
    activeTravels:S.map.activeTravels||[],dgRuns:S.map.dgRuns||{},memberRun:S.map.memberRun||{},dgRun:S.map.dgRun==null?null:S.map.dgRun,
    rng:typeof mapRngExport==='function'?mapRngExport(S):S.map.rng,
    sects:S.sects,diplo:S.diplo,zb:S.zb,travel:S.travel==null?null:S.travel,
    block:Object.assign({},NETMAP.block)
  };
  if(fullFog)pack.fog=netMapFogDelta(true);else{const add=netMapFogDelta(false);if(add)pack.fogAdd=add;}
  return pack;}
function netMapEnrichSt(m){if(!m||m.t!=='st'||!netMapIsHost()||!S)return;
  try{const slow=!!(m.all||m.pl!=null||m.v45!=null||m.b!=null);
    if(slow){const sig=netMapSlowSig();if(m.all||sig!==NETMAP.mapSig){NETMAP.mapSig=sig;m.map=netMapSlowPack(!!m.all);NETMAP.st++;}
      else{const add=netMapFogDelta(false);if(add){m.map={fogAdd:add};NETMAP.st++;}}
      NETMAP.lastSlowStKeys=Object.keys(m).filter(k=>k!=='map').sort().join(',');}
    else{const add=netMapFogDelta(false);if(add){m.map={fogAdd:add};NETMAP.st++;}}
    NETMAP.lastStKeys=Object.keys(m).filter(k=>k!=='map').sort().join(',');
  }catch(e){}}

// ---- 權威 tick／入口 gate（聯機拒絕不支援路徑；不改 flags）----
{if(typeof mapSectsTick==='function'){const _x=mapSectsTick;mapSectsTick=function(dt){NETMAP.sectsTickN++;if(netMapIsClient())return;return _x.apply(this,arguments);};}}
{if(typeof mapTravelTick==='function'){const _x=mapTravelTick;mapTravelTick=function(dt){NETMAP.travelTickN++;if(netMapOnline())return;return _x.apply(this,arguments);};}} // 聯機整段不跑 travel 模擬
{if(typeof mapTravelStart==='function'){const _x=mapTravelStart;mapTravelStart=function(){if(netMapOnline()){try{toast('聯機暫不支援地圖飛行／途中遭遇');}catch(e){}return null;}return _x.apply(this,arguments);};}}
{if(typeof mapDgEnter==='function'){const _x=mapDgEnter;mapDgEnter=function(kind,opts){if(netMapOnline()){try{toast('聯機暫不支援新地圖多分區副本');}catch(e){}return false;}return _x.apply(this,arguments);};}}
{if(typeof mapUnlock==='function'){const _x=mapUnlock;mapUnlock=function(){if(netMapIsClient())return false;return _x.apply(this,arguments);};}}
{if(typeof mapOnXianUnlock==='function'){const _x=mapOnXianUnlock;mapOnXianUnlock=function(){if(netMapIsClient())return false;return _x.apply(this,arguments);};}}

// ---- snapshot／applySave：net 層自己寫入／讀出（不依賴 g23 是否存在）----
{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{if(d&&S){netMapMigrate();
  d.map=S.map?JSON.parse(JSON.stringify(S.map)):d.map;
  d.sects=S.sects?JSON.parse(JSON.stringify(S.sects)):d.sects;
  d.diplo=S.diplo?JSON.parse(JSON.stringify(S.diplo)):d.diplo;
  d.zb=S.zb?JSON.parse(JSON.stringify(S.zb)):d.zb;
  d.travel=S.travel==null?null:JSON.parse(JSON.stringify(S.travel));
  d.netMap={block:Object.assign({},NETMAP.block)};
}}catch(e){}return d;};}
{const _as=applySave;applySave=function(d){const r=_as.apply(this,arguments);try{if(r&&S&&d){
  if(d.map!=null)S.map=d.map;
  if(d.sects!=null)S.sects=d.sects;
  if(d.diplo!=null)S.diplo=d.diplo;
  if(d.zb!=null)S.zb=d.zb;
  if(Object.prototype.hasOwnProperty.call(d,'travel'))S.travel=d.travel;
  netMapMigrate();
  if(S.map&&S.map.fog)netMapApplyFogSnap(S.map.fog);else netMapFogToExplored();
  if(S.map&&S.map.rng&&typeof mapRngImport==='function')mapRngImport(S.map.rng,S);
}}catch(e){}return r;};}

// ---- 迷霧：房主以化身位置權威揭露；成員只報半徑，不信座標清單 ----
function netMapFogRegionOw(pk){
  // 秘境（dg）座標空間≠外世界 fog 格網；室內化身 x/y 為大門世界座標（見 g9 enterInterior／enterBuildingUnit），可揭 fog。
  try{if(typeof netRegionOf==='function'){if(pk!=null)return netRegionOf(pk)==='ow';}
    // 無 pk：房主本機 reveal——現場在秘境（S.dg）或暫時切入 dg 區時不寫外世界 fog
    if(S&&S.dg)return false;if(typeof NET!=='undefined'&&NET&&NET._inR==='dg')return false;
    return true;
  }catch(e){return !(S&&S.dg);}}
function netMapFogAllowWrite(pk){return netMapFogRegionOw(pk);}
function netMapHasFogApi(){return typeof mapFogReveal==='function'||typeof mapFogEnsure==='function';}
function netMapFogFlushClient(){if(!netMapIsClient()||!NET.tr||!NET.welcomed)return;
  if(S&&S.dg)return; // 秘境內不送；fogPendR 保留，出秘境後 pulse 再 flush
  // 缺 map 模組或尚未初始化：不送探索 intent（避免無意義負載；房主端也不該 throw）
  if(!netMapHasFogApi()&&!(S&&S.map&&S.map.fog))return;
  const now=performance.now();if(NETMAP.fogFlushT&&now-NETMAP.fogFlushT<350)return;
  NETMAP.fogFlushT=now;const r=NETMAP.fogPendR!=null?NETMAP.fogPendR:NETMAP_FOG_R;NETMAP.fogPendR=null;
  netIntent({a:'mapfog',r:Math.max(1,Math.min(NETMAP_FOG_RMAX,r|0))});}
{if(typeof reveal==='function'){const _rv=reveal;reveal=function(x,y,rad){
  if(netMapIsClient()&&NET.tr&&NET.welcomed&&(netMapHasFogApi()||(S&&S.map&&S.map.fog))){try{const R=Math.max(1,Math.min(NETMAP_FOG_RMAX,rad|0));NETMAP.fogPendR=Math.max(NETMAP.fogPendR||0,R);netMapFogFlushClient();}catch(e){}
    return _rv.apply(this,arguments);}
  const ch=_rv.apply(this,arguments);try{if(netMapIsHost()&&netMapFogAllowWrite(null)&&typeof mapFogReveal==='function'&&S&&S.map){const R=Math.max(0,Math.min(NETMAP_FOG_RMAX,rad|0));
    for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++)if(i*i+j*j<=R*R)mapFogReveal((+x)+i,(+y)+j);}}catch(e){}return ch;};}}

// ---- 真正 wrap：只在 netCast(st) 上附加 map，呼叫原 netHostSend／既有擴充 ----
{const _cast=netCast;netCast=function(m){try{if(m&&m.t==='st')netMapEnrichSt(m);}catch(e){}return _cast.apply(this,arguments);};}
{const _st=netApplySt;netApplySt=function(m){const r=_st.apply(this,arguments);try{if(m&&m.map){NETMAP.rx++;netMapApplyMapPack(m.map);}}catch(e){}return r;};}

// ---- intents ----
{const _ai=netApplyIntent0;netApplyIntent0=function(pk,i){
  if(i&&i.a==='mapfog'){if(!pk)return false;const a=netAvatarOf(pk);if(!a||a.dead)return false;
    // 秘境內拒絕（局部座標不可寫外世界 fog）；室內化身仍為大門世界座標 → 允許
    if(!netMapFogAllowWrite(pk))return false;
    // 缺模組：安全 no-op，不自造 S.map schema、不 throw
    if(!netMapHasFogApi()&&!(S&&S.map&&S.map.fog))return false;
    // 不信任 i.c 座標；只依已驗證化身位置＋有限半徑
    let R=i.r!=null?(+i.r|0):NETMAP_FOG_R;if(!isFinite(R))R=NETMAP_FOG_R;R=Math.max(1,Math.min(NETMAP_FOG_RMAX,R));
    netMapMigrate();if(!(S&&S.map))return false;
    const ax=a.x|0,ay=a.y|0,n=typeof N==='number'?N:(S.map&&S.map.size)||128;let hit=0,seen=0;
    for(let j=-R;j<=R;j++)for(let ii=-R;ii<=R;ii++){if(ii*ii+j*j>R*R)continue;const X=(ax+ii)|0,Y=(ay+j)|0;
      if(X<0||Y<0||X>=n||Y>=n)continue;if(++seen>NETMAP_FOG_BATCH)break;
      if(typeof mapFogReveal==='function'){if(mapFogReveal(X,Y))hit++;}
      else if(S.map&&S.map.fog&&S.map.fog.cells){const k=X+','+Y;if(!S.map.fog.cells[k]){S.map.fog.cells[k]=1;hit++;}}}
    NETMAP.fogRx++;NET.stats.applied++;return hit>=0;} // 合法意圖即使全已揭開也算接受
  if(i&&i.a==='maptj'){
    if(netMapOnline()&&NETMAP.block.travelSim)return false; // 聯機不支援
    if(typeof mapTravelJoin!=='function')return false;
    if(typeof mapFlag==='function'&&!mapFlag('travel'))return false;
    const a=netAvatarOf(pk);if(!a)return false;
    const r=mapTravelJoin(String(i.tid||i.id||''),{pkey:pk,unitId:a.id});
    NET.stats.applied++;return !!(r&&r.ok);}
  if(i&&i.a==='maptl'){
    if(netMapOnline()&&NETMAP.block.travelSim)return false;
    if(typeof mapTravelLeave!=='function')return false;
    if(typeof mapFlag==='function'&&!mapFlag('travel'))return false;
    const r=mapTravelLeave(String(i.tid||i.id||''),pk);
    NET.stats.applied++;return !!(r&&r.ok);}
  return _ai.apply(this,arguments);};}
function netMapTravelJoin(tid){if(!netMapIsClient()||!tid||NETMAP.block.travelSim)return false;netIntent({a:'maptj',tid:String(tid)});return true;}
function netMapTravelLeave(tid){if(!netMapIsClient()||!tid||NETMAP.block.travelSim)return false;netIntent({a:'maptl',tid:String(tid)});return true;}

{const _dr=netHostDrop;netHostDrop=function(cid,why){const pk=NET.cid2pk.get(cid);const r=_dr.apply(this,arguments);try{
  if(pk&&S&&S.map&&Array.isArray(S.map.activeTravels)&&typeof mapTravelOnOwnerDisconnect==='function'){
    for(const tr of S.map.activeTravels.slice())if(tr&&tr.ownerId===pk)mapTravelOnOwnerDisconnect(tr.id);}
}catch(e){}return r;};}
{if(typeof netAdoptWorld==='function'){const _aw=netAdoptWorld;netAdoptWorld=function(){const r=_aw.apply(this,arguments);try{if(r){netMapMigrate();NETMAP.fogSent=Object.create(null);NETMAP.mapSig='';}}catch(e){}return r;};}}
{const _nh=netHost;netHost=async function(){const r=await _nh.apply(this,arguments);try{netMapMigrate();NETMAP.fogSent=Object.create(null);NETMAP.mapSig='';}catch(e){}return r;};}
{const _p=netClientPulse;netClientPulse=function(){const r=_p.apply(this,arguments);try{if(netMapIsClient()&&NETMAP.fogPendR!=null)netMapFogFlushClient();}catch(e){}return r;};}
{const _ls=netLoadSnap;netLoadSnap=function(){const r=_ls.apply(this,arguments);try{netMapMigrate();netMapFogToExplored();}catch(e){}return r;};}

function netMapRebindXw(){try{if(typeof XW==='undefined'||!XW||!XW.map)return;
  if(typeof mapSectsTick==='function')XW.map.sectsTick=mapSectsTick;
  if(typeof mapTravelTick==='function')XW.map.travelTick=mapTravelTick;
  if(typeof mapTravelStart==='function')XW.map.travelStart=mapTravelStart;
  if(typeof mapDgEnter==='function')XW.map.dgEnter=mapDgEnter;
  if(typeof mapUnlock==='function')XW.map.unlock=mapUnlock;
  if(typeof mapOnXianUnlock==='function')XW.map.onXian=mapOnXianUnlock;
}catch(e){}}
netMapRebindXw();
try{setTimeout(netMapRebindXw,0);setTimeout(netMapRebindXw,500);}catch(e){}
try{if(typeof XW045==='function'){const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{netMapRebindXw();}catch(e){}
  if(o&&o.net){o.net.map={
  st:()=>({st:NETMAP.st,rx:NETMAP.rx,fogRx:NETMAP.fogRx,sig:NETMAP.mapSig,block:NETMAP.block,
    lastStKeys:NETMAP.lastStKeys,lastSlowStKeys:NETMAP.lastSlowStKeys,sectsTickN:NETMAP.sectsTickN,travelTickN:NETMAP.travelTickN,
    fogCells:S&&S.map&&S.map.fog&&S.map.fog.cells?Object.keys(S.map.fog.cells).length:0,
    unlocked:!!(S&&S.map&&S.map.unlocked),flags:S&&S.map&&S.map.flags,coordSpace:S&&S.map&&S.map.coordSpace,
    diplo:S&&S.diplo,zb:S&&S.zb,travels:(S&&S.map&&S.map.activeTravels)||[],spawn:S&&S.map&&S.map.spawn,dgRun:S&&S.map&&S.map.dgRun,role:NET.role}),
  migrate:()=>netMapMigrate(),pack:(full)=>netMapSlowPack(!!full),apply:p=>netMapApplyMapPack(p),
  fogApply:()=>netMapFogToExplored(),join:tid=>netMapTravelJoin(tid),leave:tid=>netMapTravelLeave(tid),
  reveal:(x,y)=>{if(netMapIsHost()&&netMapFogAllowWrite(null)&&typeof mapFogReveal==='function')return mapFogReveal(x,y);return false;},
  merge:(cells)=>{if(netMapIsHost()&&typeof mapFogMergeUnion==='function')return mapFogMergeUnion({cells},S);return 0;},
  fogIntentR:(r)=>{if(netMapIsClient()){NETMAP.fogPendR=r;netMapFogFlushClient();return true;}return false;},
  fogHostAs:(pk,r)=>netApplyIntent0(pk,{a:'mapfog',r:r}),
  // 直接以惡意 c 測：房主必須忽略座標清單
  fogHostMalicious:(pk,r,cells)=>netApplyIntent0(pk,{a:'mapfog',r:r,c:cells}),
  fogOw:(pk)=>netMapFogAllowWrite(pk==null?null:pk),
  // 測試：直接走 reveal 包裝（與視覺 tick 相同）
  hostRevealProbe:(x,y,r)=>{if(typeof reveal!=='function')return {ok:false,reason:'no-reveal'};const n0=S&&S.map&&S.map.fog?Object.keys(S.map.fog.cells).length:0;reveal(x,y,r);const n1=S&&S.map&&S.map.fog?Object.keys(S.map.fog.cells).length:0;return {ok:true,n0,n1,allow:netMapFogAllowWrite(null),dg:!!(S&&S.dg)};},

  rngDraw:(name,n)=>{if(typeof mapRngStream!=='function')return [];const s=mapRngStream(name||'sects',1);const a=[];for(let i=0;i<(n||3);i++)a.push(s());return a;},
  rngExport:()=>typeof mapRngExport==='function'?mapRngExport(S):null,
  rngImport:snap=>typeof mapRngImport==='function'?mapRngImport(snap,S):false,
  rebind:()=>netMapRebindXw()
};}return o;};}}catch(e){}

// ================== 288 世界（g24）聯機契約 ==================
// · 世界格大小只看存檔的 d.xw288（g24 snapshot 會帶上）；成員不自轉，世界一律來自房主快照。
// · st 的 map 慢狀態帶 xw（房主目前世界格 128／288）；成員端不一致 → 整包略過並要求完整快照（need），不把 288 座標套進 128 世界。
// · size／coordSpace 不信任房主，依成員本機 XWW.n 決定（與 g24 applySave 相同規則）。
// · hello 帶 xwc（支援 288）；房主是 288 世界而成員沒有 xwc（舊版）→ 明確拒絕（zh-TW），不加入名單、不當機。
// · 成員載入完快照後世界格仍與房主不同 → 明確錯誤並離開，不卡在載入畫面。
// · 房主突破擴成 288：立刻送完整快照給所有在線成員（否則成員留在 128 世界、座標差 80）。秘境進行中不擴（等秘境結束再擴）。
// · 主機轉移：最新世界副本與即時畫面的世界格不同 → 改用整份即時快照，避免座標被 g24 再轉一次。
const NETXW={resyncT:0,bad:false,denied:0,mismatch:null,grows:0,deferT:0,lastHello:null};
function netXwSnapN(d){try{return xwSaveWorldN(d);}catch(e){return 128;}}
function netMapXwLocal(){try{if(!S||!S.map)return;if(netXwN()===288){S.map.size=288;S.map.coordSpace='N288';}else if(S.map.coordSpace==='N288')S.map.coordSpace=null;}catch(e){}}
function netMapXwResync(why){if(!netMapIsClient()||!NET.tr||!NET.welcomed||(S&&S.dg))return;const t=performance.now();if(t-NETXW.resyncT<3000)return;NETXW.resyncT=t;
  try{NET.tr.send('host',{t:'need'});}catch(e){}netLog('xw288 world mismatch → need',why,'host',NETXW.hostN,'me',netXwN());}
// true＝這包 map 不能套（成員世界格與房主不同）
function netMapXwGate(p){if(!netMapIsClient())return false;
  if(p.xw!=null){NETXW.hostN=p.xw;NETXW.bad=(p.xw!==netXwN());}
  if(NETXW.bad){if(!(S&&S.dg))netMapXwResync('st');return true;}return false;}
{const _x=netHelloMsg;netHelloMsg=function(){const m=_x.apply(this,arguments);try{m.xwc=1;m.xwn=netXwN();}catch(e){}return m;};}
function netXwHelloWhy(m){if(netXwN()===288&&!(m&&m.xwc>=1))return '房主的世界已開啟外層大地圖（288 格），你的遊戲版本不支援，無法載入。請強制重新整理（電腦 Ctrl+Shift+R；手機關掉分頁重開）後再加入。';return null;}
{const _x=netHostRx;netHostRx=function(cid,m){if(NET.role==='host'&&m&&m.t==='hello'){let why=null;try{why=netXwHelloWhy(m);}catch(e){why=null;}
    if(why){const name=String(m.name||'道友').slice(0,12);NETXW.denied++;NETXW.lastHello={name,xwc:m.xwc||0};
      try{NET.tr.send(cid,{t:'deny',ver:1,xw:1,why,host:'288',you:'舊版（不支援 288）'});}catch(e){}setTimeout(()=>{try{NET.tr&&NET.tr.kick(cid);}catch(e){}},300);
      try{toast(`「${name}」的遊戲版本不支援外層大地圖（288 格），已拒絕加入；請對方強制重新整理`);}catch(e){}netLog('xw288 deny old member',name);return;}}
  return _x.apply(this,arguments);};}
function netXwClientFail(hostN){const why=`無法載入房主的世界：房主是 ${hostN} 格世界，你這邊載入後是 ${netXwN()} 格。請強制重新整理（電腦 Ctrl+Shift+R；手機關掉分頁重開）後再加入。`;
  NETXW.mismatch={host:hostN,me:netXwN(),at:Date.now()};netLog('xw288 client mismatch',hostN,netXwN());try{toast(why);}catch(e){}
  try{if(NET._joinWait){NET._joinWait.no(new Error(why));NET._joinWait=null;}}catch(e){}
  try{netLeave(true);}catch(e){}try{netLoadStart('deny');NET.load.fail=true;NET.load.why=why;if(typeof netLoadUi==='function')netLoadUi();}catch(e){}}
{const _x=netClientRx;netClientRx=function(m){const isSnap=m&&(m.t==='welcome'||m.t==='full')&&m.snap&&NET.role==='client';let want=0;
  if(isSnap){want=netXwSnapN(m.snap);if(want!==netXwN())NET._recam=true;} // 世界格要換：鏡頭跟著自己的角色
  const r=_x.apply(this,arguments);
  if(isSnap&&NET.role==='client'){if(netXwN()!==want)netXwClientFail(want);else{NETXW.bad=false;NETXW.hostN=want;netMapXwLocal();}}
  return r;};}
// 主機轉移的起始狀態：世界副本（base）與即時畫面（live）世界格不同 → 用整份即時快照
{if(typeof netMigState==='function'){const _x=netMigState;netMigState=function(){const r=_x.apply(this,arguments);
  try{if(r&&r.d&&!r.tradeRefused&&S&&!S.dg){const live=netXwN();if(netXwSnapN(r.d)!==live){const L=snapshot();if(L&&netXwSnapN(L)===live){netLog('migration: world copy grid ≠ live → live snapshot',live);return {d:L,wv:r.wv||NET.wv||0,live:true};}}}}catch(e){}
  return r;};}}
// 突破擴成 288：秘境進行中先不擴（g24 每 0.5 秒會再試）
{const _x=xwWorldExpandTo288;xwWorldExpandTo288=function(){try{if(NET.role==='host'&&((typeof netDgRun==='function'&&netDgRun())||NET._inR)){
    const t=performance.now();if(t-NETXW.deferT>30000){NETXW.deferT=t;try{toast('有道友還在秘境裡：外層大地圖會在秘境結束後開啟');}catch(e){}}return false;}}catch(e){}
  return _x.apply(this,arguments);};}
function netXwAfterGrow(info){if(NET.role!=='host'||!NET.tr)return;NETXW.grows++;
  try{NETMAP.fogSent=Object.create(null);NETMAP.mapSig='';}catch(e){}
  let base=null;try{base=snapshot();}catch(e){netLog('xw288 grow snapshot failed',String(e&&e.message||e));return;}
  for(const p of NET.players.values()){if(p.host||!p.online||p.cid==null)continue;
    try{const snap=typeof netSnapEnsureAv==='function'?netSnapEnsureAv(p.pkey,JSON.parse(JSON.stringify(base))):base;NET.tr.send(p.cid,{t:'full',snap,xwGrow:1});}catch(e){netLog('xw288 grow send failed',p.pkey,String(e&&e.message||e));}}
  netLog('xw288 world grown → full to members',info&&info.n);}
try{setTimeout(function netXwReg(){try{xwWorldAfterRegister('net.share',netXwAfterGrow);}catch(e){setTimeout(netXwReg,300);}},0);}catch(e){}
try{if(typeof XW045==='function'){const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{if(o&&o.net)o.net.xw={st:()=>({n:netXwN(),N,bank:(()=>{try{return !!XWW.worldBank;}catch(e){return null;}})(),bad:NETXW.bad,hostN:NETXW.hostN,denied:NETXW.denied,mismatch:NETXW.mismatch,grows:NETXW.grows,lastHello:NETXW.lastHello})};}catch(e){}return o;};}}catch(e){}
