// ================== v0.4.x map：副本室內美術覆寫（flags.dgArt；預設 OFF）==================
// 僅 wrap drawDungeon／dgEnter；旗關 → 原函式像素級相同。?big=1 亦可開。
// 載入：g13 drawDungeon 之後（見 MAP_SCHEMA §14）；本檔可延遲安裝。
var MAP_DGART={
  quality:'auto', // auto|high|medium|low
  qResolved:'medium',
  installed:false,
  enter:null,     // {t0,dur,realm,title}
  parts:[],       // particles
  cache:Object.create(null), // key -> canvas
  cacheMax:12,
  fps:{n:0,sum:0,last:0},
  _origDraw:null,
  _origEnter:null
};
function mapDgArtUrlBig(){
  try{if(typeof location!=='undefined'&&location.search&&/[?&]big=1(?:&|$)/.test(location.search))return true;}catch(e){}
  return false;
}
function mapDgArtOn(){
  if(mapDgArtUrlBig()){
    try{if(typeof S!=='undefined'&&S){if(!S.map){try{mapMigrateSave(S);}catch(e){}}if(S.map){if(!S.map.flags)S.map.flags={};S.map.flags.dgArt=true;}}}catch(e){}
    return true;
  }
  try{return typeof mapFlag==='function'?!!mapFlag('dgArt'):false;}catch(e){return false;}
}
function mapDgArtDetectMobile(){
  try{
    if(typeof navigator!=='undefined'){
      if(navigator.maxTouchPoints>1)return true;
      if(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent||''))return true;
    }
    if(typeof W==='number'&&W<900)return true;
  }catch(e){}
  return false;
}
function mapDgArtSetQuality(q){
  if(q==='auto'||q==='high'||q==='medium'||q==='low')MAP_DGART.quality=q;
  mapDgArtResolveQuality();
  mapDgArtCacheClear();
  return MAP_DGART.qResolved;
}
function mapDgArtResolveQuality(){
  let q=MAP_DGART.quality;
  if(q==='auto')q=mapDgArtDetectMobile()?'low':'high';
  MAP_DGART.qResolved=q;
  return q;
}
function mapDgArtCacheClear(){
  MAP_DGART.cache=Object.create(null);
}
function mapDgArtRealmOf(kind){
  // 對齊 MAP_DGS.type；舊 DGS 別名；玄境＝mystic
  try{
    if(typeof MAP_DGS!=='undefined'&&MAP_DGS[kind]&&MAP_DGS[kind].type)return MAP_DGS[kind].type;
    if(typeof DGS!=='undefined'&&DGS[kind]&&DGS[kind].type)return DGS[kind].type;
  }catch(e){}
  if(kind==='cave'||kind==='jail')return 'dungeon';
  if(kind==='ruin')return 'ruin';
  if(kind==='xf')return 'mystic';
  if(/^dg_/.test(kind))return 'dungeon';
  if(/^mz_/.test(kind))return 'maze';
  if(/^rn_/.test(kind))return 'ruin';
  if(/^fb_/.test(kind))return 'forbid';
  if(/^my_/.test(kind))return 'mystic';
  return 'dungeon';
}
function mapDgArtTitle(realm){
  return ({dungeon:'副本',maze:'迷宮',ruin:'遺跡',forbid:'禁地',mystic:'玄境'})[realm]||'秘境';
}
function mapDgArtBeginEnter(kind){
  if(!mapDgArtOn())return;
  const realm=mapDgArtRealmOf(kind);
  let n='';
  try{n=(typeof DGS!=='undefined'&&DGS[kind]&&DGS[kind].n)||(typeof MAP_DGS!=='undefined'&&MAP_DGS[kind]&&MAP_DGS[kind].n)||'';}catch(e){}
  MAP_DGART.enter={t0:performance.now(),dur:1600,realm:realm,title:n||mapDgArtTitle(realm),sub:mapDgArtTitle(realm)};
  MAP_DGART.parts=[];
  mapDgArtCacheClear();
}
function mapDgArtPartCap(){
  const q=MAP_DGART.qResolved;
  return q==='high'?140:(q==='medium'?80:32);
}
function mapDgArtPartKind(realm){
  if(realm==='forbid')return Math.random()<0.75?'ember':'mote';
  if(realm==='ruin')return Math.random()<0.7?'dust':'mote';
  if(realm==='mystic')return Math.random()<0.55?'petal':(Math.random()<0.5?'mist':'mote');
  if(realm==='maze')return Math.random()<0.4?'mist':'mote';
  return 'mote';
}
function mapDgArtEnsureParts(realm,nWant){
  const cap=Math.min(nWant,mapDgArtPartCap());
  const L=MAP_DGART.parts;
  while(L.length<cap){
    L.push({
      x:Math.random(),y:0.2+Math.random()*0.8,
      vx:(Math.random()-0.5)*0.0004,vy:-0.00025-Math.random()*0.00055,
      r:1.2+Math.random()*2.4,a:0.35+Math.random()*0.55,
      kind:mapDgArtPartKind(realm),
      ph:Math.random()*6.28
    });
  }
  if(L.length>cap)L.length=cap;
}
function mapDgArtSkipEnter(){if(MAP_DGART.enter)MAP_DGART.enter=null;}
function mapDgArtTickParts(dt){
  const L=MAP_DGART.parts;if(!L.length)return;
  for(const p of L){
    p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.ph+=dt*1.2;
    if(p.y<-0.05){p.y=1.05;p.x=Math.random();}
    if(p.x<-0.05)p.x=1.05;if(p.x>1.05)p.x=-0.05;
  }
}
function mapDgArtInstall(){
  if(MAP_DGART.installed)return true;
  if(typeof drawDungeon!=='function')return false;
  if(drawDungeon._mapDgArt){MAP_DGART.installed=true;return true;}
  mapDgArtResolveQuality();
  // ?big=1 early seed into flags when S exists
  try{if(mapDgArtUrlBig()&&typeof S!=='undefined'&&S){if(!S.map&&typeof mapMigrateSave==='function')mapMigrateSave(S);if(S.map){S.map.flags=S.map.flags||{};S.map.flags.dgArt=true;}}}catch(e){}
  const _dd=drawDungeon;
  MAP_DGART._origDraw=_dd;
  drawDungeon=function(base){
    if(!mapDgArtOn())return _dd.apply(this,arguments);
    const t0=performance.now();
    try{
      if(typeof mapDgArtDrawDungeon==='function')mapDgArtDrawDungeon(base,_dd);
      else _dd.apply(this,arguments);
    }finally{
      const dt=performance.now()-t0;
      MAP_DGART.fps.n++;MAP_DGART.fps.sum+=dt;MAP_DGART.fps.last=dt;
    }
  };
  drawDungeon._mapDgArt=1;
  if(typeof dgEnter==='function'&&!dgEnter._mapDgArt){
    const _en=dgEnter;
    MAP_DGART._origEnter=_en;
    dgEnter=function(kind,mode,hard){
      const r=_en.apply(this,arguments);
      if(r!==false)try{mapDgArtBeginEnter(kind);}catch(e){}
      return r;
    };
    dgEnter._mapDgArt=1;
  }
  if(typeof mapDgEnter==='function'&&!mapDgEnter._mapDgArt){
    const _me=mapDgEnter;
    mapDgEnter=function(kind,opts){
      const r=_me.apply(this,arguments);
      if(r&&!(opts&&opts.partition))try{mapDgArtBeginEnter(kind);}catch(e){}   // 弟子分區不播玩家進場畫面
      return r;
    };
    mapDgEnter._mapDgArt=1;
  }
  // 覆寫後回寫 XW 匯出（先前 XW.dgEnter 可能鎖住舊函式）
  try{
    if(typeof window!=='undefined'&&window.XW){
      if(typeof dgEnter==='function')window.XW.dgEnter=dgEnter;
      if(window.XW.map&&typeof mapDgEnter==='function')window.XW.map.dgEnter=mapDgEnter;
    }
  }catch(e){}
  MAP_DGART.installed=true;
  try{
    if(typeof window!=='undefined'&&!MAP_DGART._skipBound){
      MAP_DGART._skipBound=1;
      const skip=function(){if(mapDgArtOn()&&MAP_DGART.enter)mapDgArtSkipEnter();};
      window.addEventListener('keydown',skip,true);
      window.addEventListener('pointerdown',skip,true);
    }
  }catch(e){}
  try{
    if(typeof window!=='undefined'){
      window.XWMAP_DGART={
        on:mapDgArtOn,setQuality:mapDgArtSetQuality,quality:()=>MAP_DGART.qResolved,
        realmOf:mapDgArtRealmOf,clearCache:mapDgArtCacheClear,fps:()=>MAP_DGART.fps,
        beginEnter:mapDgArtBeginEnter,skipEnter:mapDgArtSkipEnter,
        clearEnter:function(){MAP_DGART.enter=null;},
        state:MAP_DGART,
        installed:()=>!!MAP_DGART.installed
      };
      try{window.MAP_DGART=MAP_DGART;}catch(e){}
      if(window.XWMAP){
        window.XWMAP.dgArtOn=mapDgArtOn;
        window.XWMAP.dgArtSetQuality=mapDgArtSetQuality;
        window.XWMAP.dgArtQuality=()=>MAP_DGART.qResolved;
      }
    }
  }catch(e){}
  return true;
}
function mapDgArtBoot(){
  if(mapDgArtInstall())return;
  if(typeof setTimeout==='function')setTimeout(mapDgArtBoot,30);
}
mapDgArtBoot();
