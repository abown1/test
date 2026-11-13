// ================== v0.4.x map PHASE5：新副本註冊／房間鏈／最終 boss 房 ==================
// 不修改 g13.js：僅 Object.assign 到既有 DGS（const 物件可加屬性）
function mapDgsRegister(){
  if(typeof DGS==='undefined'||!DGS)return false;
  let n=0;
  const keys=MAP_DG_ORDER.slice();
  try{for(const k in MAP_DGS)if(keys.indexOf(k)<0)keys.push(k);}catch(e){}
  for(const k of keys){
    if(DGS[k])continue;
    if(typeof mapStoryChOn==='function'&&!mapStoryChOn(k))continue;
    const src=MAP_DGS[k];if(!src)continue;
    DGS[k]={
      n:src.n,mobs:src.mobs.slice(),boss:src.boss,bossN:src.bossN,
      col:src.col,fl:src.fl.slice(),wl:src.wl.slice(),desc:src.desc,
      mapType:src.type,minRealm:src.minRealm,forbid:!!src.forbid,mystic:!!src.mystic,_map:true
    };
    n++;
  }
  if(typeof DG_ORDER!=='undefined'&&Array.isArray(DG_ORDER)){
    for(const k of keys)if(DGS[k]&&DG_ORDER.indexOf(k)<0)DG_ORDER.push(k);
  }
  return n;
}
function mapGatesClone(){
  const list=(typeof mapStoryVisibleGateList==='function')?mapStoryVisibleGateList():MAP_DG_GATES;
  return list.map(g=>{
    const def=MAP_DGS[g.kind];
    return {
      id:g.id,kind:g.kind,type:def?def.type:'dungeon',
      x:g.x,y:g.y,tier:def?def.minRealm:4,
      n:def?def.n:g.kind
    };
  });
}
function mapGatesPopulate(){
  if(!mapFlag('dungeons'))return false;
  if(typeof S==='undefined'||!S||!S.map||!S.map.unlocked)return false;
  if(!Array.isArray(S.map.gates))S.map.gates=[];
  const want=(typeof mapStoryVisibleGateList==='function')?mapStoryVisibleGateList():MAP_DG_GATES;
  if(S.map.gates.length>=want.length){
    const have={};for(const g of S.map.gates)have[g.kind]=1;
    let miss=false;for(const d of want)if(!have[d.kind]){miss=true;break;}
    if(!miss){try{mapDgsRegister();}catch(e){}return true;}
  }
  S.map.gates=mapGatesClone();
  try{mapDgsRegister();}catch(e){}
  return true;
}
function mapDgMulberry(seed){
  let a=(seed>>>0)||1;
  return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
function mapDgPickBossVariant(rng){
  return MAP_BOSS_VARIANTS[Math.floor(rng()*MAP_BOSS_VARIANTS.length)%MAP_BOSS_VARIANTS.length];
}
// 產生房間鏈（資料層；最終房必為 boss）
function mapDgGenRooms(kind,rng){
  const def=MAP_DGS[kind];if(!def)return null;
  const nR=def.rooms[0]+Math.floor(rng()*(def.rooms[1]-def.rooms[0]+1));
  const variant=mapDgPickBossVariant(rng);
  const rooms=[];
  for(let k=0;k<=nR;k++){
    const boss=k===nR;
    rooms.push({
      k,boss,state:k===0?'clear':'idle',
      w:boss?22:(14+Math.floor(rng()*7)),
      h:boss?22:(14+Math.floor(rng()*7)),
      cx:10+k*28,cy:40+Math.floor(rng()*20),
      mobs:boss?[]:def.mobs.slice(),
      bossVariant:boss?variant.k:null,
      bossType:boss?(variant.boss||def.boss):null,
      bossN:boss?(variant.n+'・'+(variant.bossN||def.bossN)):null
    });
  }
  return {kind,type:def.type,n:def.n,rooms,variant:variant.k,minRealm:def.minRealm,cleared:false,exitOpen:false,bossEntered:false};
}
function mapDgRoomBox(r){
  if(r.x0==null)r.x0=Math.max(1,Math.floor((r.cx||10)-(r.w||14)/2));
  if(r.y0==null)r.y0=Math.max(1,Math.floor((r.cy||10)-(r.h||14)/2));
  if(r.cx==null)r.cx=r.x0+(r.w||14)/2;
  if(r.cy==null)r.cy=r.y0+(r.h||14)/2;
  return r;
}
/** 給經典 dgUpdate／drawDungeon 用的相容地板（N×N；1=地） */
function mapDgCompatFl(rooms){
  const NN=(typeof N==='number'&&N>0)?N:128;
  const fl=new Uint8Array(NN*NN);
  const paint=(x0,y0,w,h,v)=>{
    for(let j=y0;j<y0+h;j++)for(let i=x0;i<x0+w;i++){
      if(i>0&&j>0&&i<NN-1&&j<NN-1)fl[j*NN+i]=v;
    }
  };
  for(let k=0;k<rooms.length;k++){
    const r=mapDgRoomBox(rooms[k]);
    paint(r.x0|0,r.y0|0,r.w|0,r.h|0,1);
    if(k){
      const prev=mapDgRoomBox(rooms[k-1]);
      const x1=Math.floor(prev.cx),y1=Math.floor(prev.cy),x2=Math.floor(r.cx),y2=Math.floor(r.cy);
      const xA=Math.min(x1,x2),xB=Math.max(x1,x2),yA=Math.min(y1,y2),yB=Math.max(y1,y2);
      paint(xA,y1-1,xB-xA+1,3,1);paint(x2-1,yA,3,yB-yA+1,1);
    }
  }
  return fl;
}
function mapDgCompatAttach(D,L,def){
  if(!D||!L)return D;
  const rooms=L.rooms||[];
  for(const r of rooms)mapDgRoomBox(r);
  if(!L.fl||!L.fl.length)L.fl=mapDgCompatFl(rooms);
  D.L=L;
  if(!Array.isArray(D.queue))D.queue=[];
  if(!D.mech)D.mech={marks:[],t:9,summon:[]};
  if(!Array.isArray(D.mech.marks))D.mech.marks=[];
  if(!Array.isArray(D.summon))D.summon=[];
  if(D.party==null)D.party=1;
  if(!D.ent){
    const r0=rooms[0]||{cx:10,cy:40};
    D.ent={x:r0.cx,y:r0.cy};
  }
  if(D.t==null)D.t=0;
  if(D.down==null)D.down=0;
  if(D.lost==null)D.lost=0;
  if(D.armed==null)D.armed=false;
  if(!D.loot)D.loot={res:{},mats:{},items:[],misc:{}};
  if(!D.W){
    try{
      D.W={
        units:(typeof S!=='undefined'&&S.units)?S.units.slice():[],
        enemies:[],npcs:[],wand:[],cands:[],buildings:[],vstructs:[],raids:[],
        time:(typeof S!=='undefined'&&S.time)||0,
        proj:[],eff:[],
        block:typeof block!=='undefined'?block.slice():[],
        comp:typeof comp!=='undefined'?comp.slice():[],
        occ:typeof occ!=='undefined'?Array.from(occ):[],
        ng:typeof nodeGrid!=='undefined'?Array.from(nodeGrid):[],
        exp:typeof explored!=='undefined'?explored.slice():[],
        startComp:typeof startComp!=='undefined'?startComp:0,
        cam:typeof cam!=='undefined'?{x:cam.x,y:cam.y,zoom:cam.zoom}:{x:0,y:0,zoom:1}
      };
    }catch(e){D.W={units:[],enemies:[],npcs:[],wand:[],cands:[],buildings:[],vstructs:[],raids:[],time:0,proj:[],eff:[],block:[],comp:[],occ:[],ng:[],exp:[],startComp:0,cam:{x:0,y:0,zoom:1}};}
  }
  if(!D.pre)D.pre=null;
  return D;
}

// ---- 288 世界：玩家實際進副本一律走核心 dgEnter（g13）→ 由它呼叫 xwGridToDungeon()；出副本走核心 dgExit → xwGridToWorld(W) ----
// 不在 map 內自行 block.set／genDungeon，也不直接呼叫 xwGridTo*：
//  · 已在場景（S.dg 或 S.interior）＝已在副本格 → 核心 dgEnter 直接拒絕，不會再換格；
//  · xwGridToDungeon 只在 N===288 時換、xwGridToWorld 只在有 worldBank 時換（g24 自身判斷），與 net5 每幀換格不衝突。
const MAP_DG_GATE_STAND_DY=2.6;   // 核心 dgEnter 的入口站位（g.i+1, g.j+2.6）
function mapDgCoreReady(){
  return typeof dgEnter==='function'&&typeof gates==='function'&&typeof player==='function'&&typeof DGS!=='undefined'&&!!DGS;
}
// 旅行抵達：把玩家放到入口旁可走格（核心 dgEnter 要求站在入口旁）
function mapDgPlaceAtGate(kind){
  try{
    const g=gates().find(s=>s&&s.kind===kind);if(!g)return false;
    const p=player();if(!p||p.dead)return false;
    const f=(typeof nearestFree==='function')?nearestFree(Math.floor(g.i+1),Math.floor(g.j+MAP_DG_GATE_STAND_DY),-1):null;
    if(!f)return false;
    p.x=f.i+0.5;p.y=f.j+0.5;p.vx=p.vy=0;p.path=[];p.task=null;
    return true;
  }catch(e){return false;}
}
function mapDgEnterCore(kind,opts){
  if(S.dg||S.interior)return false;          // 已在副本格／室內：不重複進入、不換格
  try{mapDgsRegister();}catch(e){}            // 確保 DGS 有此 kind（g23 dgEnter 包裝見 classic 即不轉旅行，避免遞迴）
  if(!DGS[kind])return false;
  const p=player();if(!p||p.dead)return false;
  if(opts.atGate)mapDgPlaceAtGate(kind);
  let mode='solo';
  try{
    const ids=(opts.party||[]).map(u=>(u&&typeof u==='object')?u.id:u).filter(id=>id!=null&&id!==p.id);
    if(ids.length){selUnits=ids.slice();mode='sel';}
  }catch(e){}
  const r=dgEnter(kind,mode,!!opts.hard);
  if(r===false||!S.dg)return false;
  S.dg._mapCore=1;
  return true;
}
function mapDgEnter(kind,opts){
  opts=opts||{};
  if(!mapFlag('dungeons'))return false;
  if(typeof S==='undefined'||!S)return false;
  if(!S.map)mapMigrateSave(S);
  const def=MAP_DGS[kind];if(!def)return false;
  // 玩家實際進場（非弟子分區）：走核心 dgEnter，牆與換格由核心處理
  if(!opts.partition&&mapDgCoreReady())return mapDgEnterCore(kind,opts);
  // 單分區相容：非 partition 時，若已有非 map 舊副本則不覆寫
  if(!opts.partition&&S.dg&&S.dg.kind&&!S.dg._map&&!opts.force)return false;
  const rng=(typeof mapRngStream==='function')?mapRngStream('dungeons',(S.map.seedExtra||1)^kind.length^(S.time|0)^0x44474e54):mapDgMulberry((S.map.seedExtra||1)^kind.length^(S.time|0)^0x44474e54);
  const L=mapDgGenRooms(kind,rng);if(!L)return false;
  const runId=(opts.runId)||(typeof mapDgRunIdNew==='function'?mapDgRunIdNew():('run_'+(S.time|0)));
  const ownerId=opts.ownerId||(typeof mapCoopPkeyFallback==='function'?mapCoopPkeyFallback():'local');
  const run={
    runId,kind,type:def.type,L,t0:S.time||0,
    party:(opts.party||[]).slice(),fromTravel:opts.fromTravel||null,
    zbEligible:def.minRealm>=(MAP_TUNE.zb.minRealm||7),
    ownerId,members:(opts.members||[ownerId]).slice(),
    cleared:false,exitOpen:false,bossEntered:false
  };
  if(typeof mapDgRunsEnsure==='function'){
    mapDgRunsEnsure();
    S.map.dgRuns[runId]=run;
    for(const pk of run.members)mapDgBindMember(pk,runId);
  }
  // 分區（弟子自動組隊等）：只寫 S.map.dgRuns，不碰玩家的 S.dg／S.map.dgRun／副本畫面，也不換格
  if(opts.partition){
    run.n=def.n;   // 顯示用中文副本名
    if(!S.map.dgRuns||S.map.dgRuns[runId]!==run){S.map.dgRuns=S.map.dgRuns||{};S.map.dgRuns[runId]=run;}
    return true;
  }
  S.map.dgRun=run; // 焦點別名（單機／當前視窗）
  // 掛到 S.dg（含經典 dgUpdate／draw 相容欄位）
  const rooms=L.rooms;
  for(const r of rooms)mapDgRoomBox(r);
  const Ldg={rooms:rooms,fl:mapDgCompatFl(rooms)};
  S.dg={
    kind,_map:true,hard:!!opts.hard,tier:def.minRealm,runId,
    L:Ldg,cleared:false,exitP:null,t:0,
    loot:{res:{},mats:{},items:[],misc:{}},boss:null,mapType:def.type,
    queue:[],mech:{marks:[],t:9},summon:[],party:1,armed:false,down:0,lost:0,end:null
  };
  mapDgCompatAttach(S.dg,Ldg,def);
  try{if(typeof document!=='undefined'&&document.body)document.body.classList.add('indg');}catch(e){}
  try{mapEmit('map:dg:start',{kind,n:def.n,type:def.type,rooms:L.rooms.length,variant:L.variant,runId});}catch(e){}
  try{mapDgsRegister();}catch(e){}
  return true;
}
function mapDgEnterBoss(){
  if(!mapFlag('dungeons')||!S||!S.dg||!S.dg._map)return false;
  const rooms=S.dg.L&&S.dg.L.rooms;if(!rooms||!rooms.length)return false;
  const br=rooms[rooms.length-1];
  if(!br.boss)return false;
  for(const r of rooms)if(r!==br)r.state='clear';
  br.state='fight';
  S.dg.bossRoom=true;
  if(S.map&&S.map.dgRun){S.map.dgRun.bossEntered=true;if(S.map.dgRun.L)S.map.dgRun.L.bossEntered=true;}
  const _rid=S.dg.runId||(S.map.dgRun&&S.map.dgRun.runId);
  if(_rid&&S.map.dgRuns&&S.map.dgRuns[_rid])S.map.dgRuns[_rid].bossEntered=true;
  try{mapEmit('map:dg:boss',{kind:S.dg.kind,bossVariant:br.bossVariant,bossN:br.bossN,runId:_rid});}catch(e){}
  // 全員強制進最終房：標記；整合者負責座標傳送
  S.dg.forceBoss=true;
  return true;
}
function mapDgClear(){
  if(!mapFlag('dungeons')||!S||!S.dg||!S.dg._map)return false;
  S.dg.cleared=true;
  const rooms=S.dg.L&&S.dg.L.rooms;
  const br=rooms&&rooms[rooms.length-1];
  if(br){br.state='clear';S.dg.exitP={x:br.cx,y:br.cy};}
  S.dg.exitOpen=true;
  if(S.map&&S.map.dgRun){S.map.dgRun.cleared=true;S.map.dgRun.exitOpen=true;}
  const _ridC=S.dg.runId||(S.map.dgRun&&S.map.dgRun.runId);
  if(_ridC&&S.map.dgRuns&&S.map.dgRuns[_ridC]){S.map.dgRuns[_ridC].cleared=true;S.map.dgRuns[_ridC].exitOpen=true;}
  // 分級掉落表（map_dg_loot.js）：首領通關擲一次 bossRates；取代舊的至寶／功法擲骰（表關閉時才走舊邏輯）
  let zb=null;
  const def=MAP_DGS[S.dg.kind];
  if(typeof mapDgLootOn==='function'&&mapDgLootOn()&&typeof mapDgLootFor==='function'&&mapDgLootFor(S.dg.kind)){
    const lr=mapDgLootRoll(S.dg.kind,{boss:true});
    if(lr&&lr.type==='treasure')zb=lr.id;
    try{mapEmit('map:dg:clear',{kind:S.dg.kind,zb,runId:S.dg.runId||null,loot:lr?{tier:lr.tier,type:lr.type,id:lr.id}:null});}catch(e){}
    return true;
  }
  // 元嬰+ 副本至寶擲骰（舊）
  if(mapFlag('zhibao')&&def&&def.minRealm>=(MAP_TUNE.zb.minRealm||7)&&typeof mapZbRoll==='function'){
    const roll=mapZbRoll({src:'dungeon',hard:!!S.dg.hard,realm:def.minRealm});
    if(roll.hit&&typeof mapZbInst==='function'){
      const inst=mapZbInst(roll.tid,Math.random);
      if(typeof mapZbLootToInv==='function')mapZbLootToInv(inst,'dungeon');
      zb=roll.tid;
      try{mapEmit('map:zb:drop',{tid:roll.tid,src:'dungeon',kind:S.dg.kind,forced:!!roll.forced});}catch(e){}
    }
  }
  try{mapEmit('map:dg:clear',{kind:S.dg.kind,zb,runId:S.dg.runId||null});}catch(e){}
  try{if(typeof mapGfOnDgClear==='function')mapGfOnDgClear();}catch(e){}
  return true;
}
function mapDgExit(){
  // 核心進場的副本（_mapCore／無 _map）：交給核心 dgExit（內含 xwGridToWorld(W)），回到入口旁
  if(S&&S.dg&&(S.dg._mapCore||!S.dg._map)&&typeof dgExit==='function'){
    if(!S.dg.cleared)return false;
    dgExit(true);return !S.dg;
  }
  if(!S||!S.dg||!S.dg._map)return false;
  if(!S.dg.cleared||!S.dg.exitOpen)return false;
  const rid=S.dg.runId;
  if(rid&&S.map&&S.map.dgRuns){
    const run=S.map.dgRuns[rid];
    if(run&&run.members)for(const pk of run.members)mapDgUnbindMember(pk);
    delete S.map.dgRuns[rid];
  }
  S.dg=null;
  if(S.map){
    S.map.dgRun=null;
    // 若尚有其他分區，焦點切到其中一個
    if(S.map.dgRuns){const ks=Object.keys(S.map.dgRuns);if(ks.length)S.map.dgRun=S.map.dgRuns[ks[0]];}
  }
  return true;
}

// 仙凡之門室內（夾制／門／首領名）改由 map_special.js 依 MAP_SPECIAL.xf 驅動。
// 外層入口清單與「前往」仍由此檔負責（mapXfWorldGate／mapGateGo）。

function mapXfWorldGate(){
  try{if(typeof gates==='function'){const g=gates().find(x=>x&&x.kind==='xf');if(g)return g;}}catch(e){}
  try{if(typeof S!=='undefined'&&S&&Array.isArray(S.vstructs))return S.vstructs.find(v=>v&&v.type==='dgate'&&v.kind==='xf')||null;}catch(e){}
  return null;
}
// 仙凡之門清單項（_mapXf）與實際門 vstruct 對齊（288 轉換、重新放置後清單座標不落後）
function mapXfSyncGateEntry(g){
  try{
    if(!g||typeof g.i!=='number'||typeof g.j!=='number'||!S||!S.map||!Array.isArray(S.map.gates))return false;
    const e=S.map.gates.find(x=>x&&x._mapXf);if(!e)return false;
    if(e.x===g.i&&e.y===g.j)return false;
    e.x=g.i;e.y=g.j;return true;
  }catch(er){return false;}
}
function mapXfEnsureWorldGate(){
  const have=mapXfWorldGate();if(have){mapXfSyncGateEntry(have);return have;}
  if(typeof S==='undefined'||!S)return null;
  if(!Array.isArray(S.vstructs))S.vstructs=[];
  const start=(typeof ANCH!=='undefined'&&ANCH&&ANCH.start)?ANCH.start:{x:(typeof N==='number'?N/2:64),y:(typeof N==='number'?N/2:64)};
  const NN=(typeof N==='number'&&N>0)?N:128;
  const free=(i,j)=>{
    for(let y=j;y<j+2;y++)for(let x=i;x<i+2;x++){
      if(typeof inMap==='function'&&!inMap(x,y))return false;
      if(x<1||y<1||x>=NN-2||y>=NN-2)return false;
      const k=y*NN+x;
      try{if(typeof block!=='undefined'&&block&&block[k])return false;}catch(e){}
      try{if(typeof roadMask!=='undefined'&&roadMask&&roadMask[k])return false;}catch(e){}
      try{if(typeof occ!=='undefined'&&occ&&occ[k])return false;}catch(e){}
      try{if(typeof terrain!=='undefined'&&terrain&&typeof T!=='undefined'){const t=terrain[k];if(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN)return false;}}catch(e){}
    }
    try{if(typeof startComp==='number'&&typeof comp!=='undefined'&&comp&&comp[j*NN+i]&&comp[j*NN+i]!==startComp)return false;}catch(e){}
    return true;
  };
  let placed=null;
  for(let rad=8;rad<52&&!placed;rad+=2){
    for(let t=0;t<20&&!placed;t++){
      const a=(t/20)*Math.PI*2;
      const i=Math.round(start.x+Math.cos(a)*rad),j=Math.round(start.y+Math.sin(a)*rad);
      if(!free(i,j))continue;
      if(S.vstructs.some(v=>v&&v.type==='dgate'&&Math.abs((v.i|0)-i)+Math.abs((v.j|0)-j)<8))continue;
      placed={id:9003,vid:0,type:'dgate',kind:'xf',i:i,j:j,s:2,_mapXfGate:1};
      S.vstructs.push(placed);
    }
  }
  if(placed){
    try{if(typeof rebuildBlock==='function')rebuildBlock();}catch(e){}
    try{if(typeof mmDirty!=='undefined')mmDirty=true;}catch(e){}
  }
  try{
    if(S.map){
      if(!Array.isArray(S.map.gates))S.map.gates=[];
      if(placed&&!S.map.gates.some(g=>g&&g.kind==='xf')){
        S.map.gates.unshift({id:'gate_xf',kind:'xf',type:'mystic',x:placed.i,y:placed.j,tier:3,n:'仙凡之門',_mapXf:1});
      }
    }
  }catch(e){}
  return placed||mapXfWorldGate();
}
function mapXfInjectGatePanel(){
  if(typeof document==='undefined'||!document.getElementById)return false;
  const p=document.getElementById('xmapgatep');
  if(!p||p.style.display==='none')return false;
  if(/仙凡之門/.test(p.innerHTML||''))return true;
  let peak=0;try{peak=(typeof xwPeakRealm==='function'?xwPeakRealm():0)|0;}catch(e){}
  const locked=peak<3;
  const row='<div class="xgrow" data-map-xf="1"><b>仙凡之門'+(locked?'（需宗師）':'')+'</b>'
    +'<button type="button" class="btn" data-xmg="cam" data-k="xf">鏡頭</button>'
    +'<button type="button" class="btn pri" data-xmg="go" data-k="xf"'+(locked?' disabled':'')+'>前往</button></div>';
  const sm=p.querySelector&&p.querySelector('.sm');
  if(sm&&sm.insertAdjacentHTML){sm.insertAdjacentHTML('afterend',row);return true;}
  const h4=p.querySelector&&p.querySelector('h4');
  if(h4&&h4.insertAdjacentHTML){h4.insertAdjacentHTML('afterend',row);return true;}
  p.innerHTML=row+p.innerHTML;
  return true;
}
function mapXfListInstall(){
  if(mapXfListInstall._ok)return true;
  try{
    if(typeof xmapGatePanel==='function'&&!xmapGatePanel._mapXfList){
      const _p=xmapGatePanel;
      xmapGatePanel=function(){
        const r=_p.apply(this,arguments);
        try{mapXfEnsureWorldGate();mapXfInjectGatePanel();}catch(e){}
        return r;
      };
      xmapGatePanel._mapXfList=1;
    }
  }catch(e){}
  try{
    if(typeof xmapPlaceEntryGates==='function'&&!xmapPlaceEntryGates._mapXfList){
      const _g=xmapPlaceEntryGates;
      xmapPlaceEntryGates=function(){
        const r=_g.apply(this,arguments);
        try{mapXfEnsureWorldGate();}catch(e){}
        return r;
      };
      xmapPlaceEntryGates._mapXfList=1;
    }
  }catch(e){}
  if(typeof xmapGatePanel==='function'&&xmapGatePanel._mapXfList)mapXfListInstall._ok=true;
  return !!mapXfListInstall._ok;
}

// ---- 世間秘葬（原外層秘境）「前往」：走到入場半徑內可走格，抵達後自動進入；路徑 prematurely 結束則重尋 ----
function mapGateFind(kind){
  if(!kind)return null;
  try{
    const vs=(S&&S.vstructs||[]).find(v=>v&&v.type==='dgate'&&v.kind===kind);
    if(vs)return vs;
  }catch(e){}
  try{
    const g=(typeof gates==='function'?gates():[]).find(x=>x&&x.kind===kind);
    if(g)return g;
  }catch(e){}
  try{
    const g=(S&&S.map&&S.map.gates||[]).find(x=>x&&(x.kind===kind||x.id===kind));
    if(g){
      if(g.i!=null&&g.j!=null)return g;
      if(g.x!=null&&g.y!=null)return {i:g.x|0,j:g.y|0,s:2,kind:g.kind||kind,id:g.id};
    }
  }catch(e){}
  return null;
}
function mapGateTileOk(ii,jj,c){
  ii=ii|0;jj=jj|0;
  if(typeof inMap==='function'){if(!inMap(ii,jj))return false;}
  else if(typeof N==='number'&&(ii<0||jj<0||ii>=N||jj>=N))return false;
  try{if(typeof block!=='undefined'&&block&&block[jj*N+ii])return false;}catch(e){}
  try{if(c>=0&&typeof comp!=='undefined'&&comp&&comp[jj*N+ii]!==c)return false;}catch(e){}
  try{
    if(typeof terrain!=='undefined'&&terrain&&typeof T!=='undefined'){
      const t=terrain[jj*N+ii];
      if(t===T.WATER||t===T.CLIFF||t===T.RUIN)return false;
    }
  }catch(e){}
  return true;
}
function mapGateWalkPoint(g,r){
  if(!g)return null;
  r=r==null?3:r;
  const i0=g.i|0,j0=g.j|0,s=(g.s||2)|0;
  let p=null,c=-1;
  try{p=typeof player==='function'?player():null;}catch(e){}
  try{if(p&&typeof unitComp==='function')c=unitComp(p);}catch(e){}
  const px=p&&p.x!=null?p.x:i0+s/2,py=p&&p.y!=null?p.y:j0+s/2;
  let best=null,bd=1e9;
  const consider=(ii,jj)=>{
    if(!mapGateTileOk(ii,jj,c))return;
    const x=ii+0.5,y=jj+0.5;
    let dR=0;
    try{dR=typeof distRect==='function'?distRect(x,y,i0,j0,s):Math.hypot(Math.max(i0-x,0,x-(i0+s)),Math.max(j0-y,0,y-(j0+s)));}catch(e){dR=1e9;}
    if(dR>r)return;
    const d=Math.hypot(x-px,y-py);
    if(d<bd){bd=d;best={x,y,i:ii,j:jj};}
  };
  for(let jj=j0-1;jj<=j0+s;jj++)for(let ii=i0-1;ii<=i0+s;ii++){
    if(ii>=i0&&ii<i0+s&&jj>=j0&&jj<j0+s)continue;
    consider(ii,jj);
  }
  if(best)return best;
  const R=Math.ceil(r)+1;
  for(let jj=j0-R;jj<=j0+s+R;jj++)for(let ii=i0-R;ii<=i0+s+R;ii++)consider(ii,jj);
  return best;
}
function mapGateEnterR(){return 3;}
function mapGateIssueWalk(p,wp){
  if(!p||!wp)return false;
  try{selUnits=[p.id];}catch(e){}
  try{if(typeof setTask==='function')setTask(p,{type:'move',x:wp.x,y:wp.y});}catch(e){}
  let ok=false;
  try{if(typeof pathTo==='function')ok=!!pathTo(p,wp.x,wp.y);}catch(e){}
  if(!ok){
    try{if(typeof commandMove==='function'){commandMove([p],wp.x,wp.y,false);ok=true;}}catch(e){}
  }
  return ok&&!(!p.path||!p.path.length);
}
function mapGateGo(kind){
  if(!kind)return false;
  let p=null;try{p=typeof player==='function'?player():null;}catch(e){}
  if(!p||p.dead)return false;
  if(kind==='xf'){try{if(typeof mapXfEnsureWorldGate==='function')mapXfEnsureWorldGate();}catch(e){}}
  const g=mapGateFind(kind);
  if(!g){
    try{if(typeof dgEnter==='function')return !!dgEnter(kind,'solo');}catch(e){}
    return false;
  }
  const r=mapGateEnterR(),s=g.s||2;
  let near=false;
  try{near=typeof distRect==='function'&&distRect(p.x,p.y,g.i,g.j,s)<=r;}catch(e){}
  if(near){
    try{if(S&&S.map)S.map.gateGo=null;}catch(e){}
    try{return !!dgEnter(kind,'solo');}catch(e){return false;}
  }
  const wp=mapGateWalkPoint(g,r);
  if(!wp){
    try{toast('附近沒有可走的入口位置');}catch(e){}
    return false;
  }
  try{S.map=S.map||{};S.map.gateGo={kind,x:wp.x,y:wp.y,t:S.time||0,tries:0};}catch(e){}
  mapGateIssueWalk(p,wp);
  try{toast('前往入口中…');}catch(e){}
  return true;
}
function mapGateGoTick(){
  try{
    if(!S||!S.map||!S.map.gateGo||S.dg||S.interior)return;
    const go=S.map.gateGo;
    const p=typeof player==='function'?player():null;
    if(!p||p.dead){S.map.gateGo=null;return;}
    if((S.time||0)-((go.t)||0)>180){S.map.gateGo=null;return;}
    const g=mapGateFind(go.kind);
    if(!g){S.map.gateGo=null;return;}
    const r=mapGateEnterR(),s=g.s||2;
    if(typeof distRect==='function'&&distRect(p.x,p.y,g.i,g.j,s)<=r){
      S.map.gateGo=null;
      try{dgEnter(go.kind,'solo');}catch(e){}
      return;
    }
    const moving=p.task&&p.task.type==='move';
    const hasPath=p.path&&p.path.length;
    const stuck=(p.stuck||0)>20||!!p.needRepath;
    if(!hasPath||!moving||stuck){
      const now=S.time||0;
      if(go.lastRepath!=null&&now-go.lastRepath<0.35)return;
      if(!hasPath)go.tries=(go.tries||0)+1;
      if(go.tries>12){S.map.gateGo=null;try{toast('須 3 格內才能進入');}catch(e){}return;}
      const wp=mapGateWalkPoint(g,r);
      if(!wp){S.map.gateGo=null;return;}
      go.x=wp.x;go.y=wp.y;go.lastRepath=now;
      mapGateIssueWalk(p,wp);
    }
  }catch(e){}
}
function mapGateGoClicks(){
  if(mapGateGoClicks._on||typeof document==='undefined'||!document.addEventListener)return;
  mapGateGoClicks._on=1;
  document.addEventListener('click',function(ev){
    try{
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-xmg="go"]');
      if(!t)return;
      const kind=t.getAttribute('data-k');
      if(!kind)return;
      if(t.disabled||t.getAttribute('disabled')!=null)return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      mapGateGo(kind);
    }catch(e){}
  },true);
}
function mapGateGoInstall(){
  if(mapGateGoInstall._ok)return true;
  try{mapGateGoClicks();}catch(e){}
  try{
    if(typeof update==='function'&&!update._mapGateGo){
      const _u=update;
      update=function(){
        const r=_u.apply(this,arguments);
        try{mapGateGoTick();}catch(e){}
        return r;
      };
      update._mapGateGo=1;
    }
  }catch(e){}
  mapGateGoInstall._ok=!!(typeof update==='function'&&update._mapGateGo);
  return !!mapGateGoInstall._ok;
}
mapGateGoInstall._ok=false;

mapXfListInstall._ok=false;
if(typeof setTimeout==='function'){
  setTimeout(function mapXfBoot(){
    try{if(typeof mapSpecialInstall==='function')mapSpecialInstall();else if(typeof mapXfInstall==='function')mapXfInstall();}catch(e){}
    try{mapXfListInstall();}catch(e){}
    try{mapGateGoInstall();}catch(e){}
    if((typeof mapSpecialInstall!=='function'||mapSpecialInstall._ok)&&(typeof xmapGatePanel!=='function'||mapXfListInstall._ok)&&mapGateGoInstall._ok)return;
    setTimeout(mapXfBoot,40);
  },0);
}else{
  try{if(typeof mapSpecialInstall==='function')mapSpecialInstall();else if(typeof mapXfInstall==='function')mapXfInstall();}catch(e){}
  try{mapXfListInstall();}catch(e){}
  try{mapGateGoInstall();}catch(e){}
}
