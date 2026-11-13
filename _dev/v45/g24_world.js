
// ======================= g24：世界尺寸 128→288（煉氣後外層大地圖）=======================
// 擁有者：Grok Bot（整合）。規則：
//  · 煉氣前 N=128，所有行為與舊版完全相同（本檔不動任何 128 世界的生成與數值）。
//  · 主角／宗主（kind==='player' 或 np）當前或曾達煉氣（MAP_TUNE.unlockRealm）→ 世界改為 N=288，舊 128 核心整體偏移 80，
//    外圈依種子決定性生成；城市／宗門／山脈／官方副本門都在 MAP_* 表的 288 座標上。
//  · 副本格固定 DG_N=128：進副本時暫切 N=128，出副本換回 288 世界格（xwGridToDungeon／xwGridToWorld）。
//  · 存檔座標轉換只有一個入口：xwConvertSave（讀檔）與 xwWorldExpandTo288（突破當下，不重載）。
//    判斷依存檔標記 d.xw288，不看 map.size（舊煉氣存檔 size=288 但座標仍是 128）。轉換前先另存備份（不覆蓋原槽）。
//  · 其他模組自己的座標用 xwWorldHookRegister(id,fn) 掛轉換；詳見 /workspace/xianwu_work_20261110/HOOKS_FOR_OWNERS.md
const XWW={small:128,big:288,off:80,ver:1,n:128,pendingBig:false,busy:false,worldBank:null,astar:{},hooks:[],after:[],fallback:{},
  log:[],lastConvert:null,lastBackup:null,forceSmall:false,readyT:0,fail:0,bakSeen:{}};
function xwWorldOff(){return XWW.n===XWW.big?XWW.off:0;}
function xwSaveWorldN(d){return (d&&d.xw288&&d.xw288.n===XWW.big)?XWW.big:XWW.small;}
function xwNetClient(){try{return typeof NET!=='undefined'&&NET&&NET.role==='client';}catch(e){return false;}}
function xwNeedRealm(){try{if(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE.unlockRealm!=null)return MAP_TUNE.unlockRealm|0;}catch(e){}return 4;}
function xwIsMasterObj(u){return !!u&&u.kind!=='disciple'&&u.kind!=='enemy'&&u.kind!=='beast'&&(u.kind==='player'||!!u.np);}
function xwLiveMasterReached(){
  try{if(typeof mapXianUnlockMasterReached==='function')return !!mapXianUnlockMasterReached();}catch(e){}
  const need=xwNeedRealm();try{for(const u of (S&&S.units)||[])if(xwIsMasterObj(u)&&!u.dead&&((u.realm|0)>=need||(u.peakRealm|0)>=need))return true;}catch(e){}return false;}
function xwSaveMasterReached(d){const need=xwNeedRealm();
  for(const u of (d&&d.units)||[])if(xwIsMasterObj(u)&&((u.realm|0)>=need||(u.peakRealm|0)>=need))return true;return false;}

// ---------------- hook 註冊（給 map*/net*/cult*/econ*）----------------
// fn(save, ctx)：在「序列化存檔物件」上就地平移自己的欄位（只會在 128→288 轉換時呼叫一次）。
// ctx={off:80,from:128,to:288,sx(v),pt(o),ent(o),ij(o),bits(str)}。同 id 重複註冊會取代（含 g 端暫代的 fallback）。
function xwWorldHookRegister(id,fn,opt){if(typeof fn!=='function'||!id)return false;opt=opt||{};
  const rec={id:String(id),fn,owner:opt.owner||String(id).split('.')[0],fallback:!!opt.fallback,order:opt.order||0};
  const i=XWW.hooks.findIndex(h=>h.id===rec.id);
  if(i>=0){if(rec.fallback&&!XWW.hooks[i].fallback)return false;XWW.hooks[i]=rec;}else XWW.hooks.push(rec);return true;}
// fn(info)：世界已是 288、S 已就緒後呼叫（突破當下或讀檔轉換後）。聯機房主可在這裡 netShareWorld。
function xwWorldAfterRegister(id,fn){if(typeof fn!=='function'||!id)return false;const i=XWW.after.findIndex(h=>h.id===id);const rec={id:String(id),fn};if(i>=0)XWW.after[i]=rec;else XWW.after.push(rec);return true;}

// ---------------- 平移工具 ----------------
const XW_ENT_DENY={eq:1,lg:1,hab:1,acd:1,person:1,xs:1,el2:1,gb:1,path:1,queue:1,target:1,interior:1,vel:1};
function xwCtx(){const o=XWW.off;
  const isPt=v=>v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.x==='number'&&typeof v.y==='number';
  const ctx={off:o,from:XWW.small,to:XWW.big,
    sx:v=>(typeof v==='number'&&isFinite(v))?v+o:v,
    pt:p=>{if(isPt(p)){p.x+=o;p.y+=o;}return p;},
    ij:p=>{if(p&&typeof p.i==='number'&&typeof p.j==='number'){p.i+=o;p.j+=o;}return p;},
    ent:e=>{if(!e||typeof e!=='object')return e;if(e._mapShifted288)return e;
      if(typeof e.x==='number'&&typeof e.y==='number'){e.x+=o;e.y+=o;}
      for(const k in e){if(XW_ENT_DENY[k])continue;const v=e[k];
        if(isPt(v))ctx.pt(v);
        else if(Array.isArray(v)&&v.length&&v.every(isPt)&&(k==='patrol'||k==='route'||k==='wps'))v.forEach(ctx.pt);}
      return e;},
    bits:str=>{const a=new Uint8Array(XWW.small*XWW.small);decodeBits(str||'',a);const b=new Uint8Array(XWW.big*XWW.big);
      for(let j=0;j<XWW.small;j++)b.set(a.subarray(j*XWW.small,(j+1)*XWW.small),(j+o)*XWW.big+o);return encodeBits(b);},
    isPt};
  return ctx;}
// 讀檔前：存檔裡的單位座標已超出 128（例如曾被 mapShiftUnitsFromLegacy 平移）→ 視為已在 288 空間，不再平移
function xwSaveLooksShifted(d){let big=0,n=0;
  for(const u of [...((d&&d.units)||[]),...((d&&d.enemies)||[])]){if(!u||typeof u.x!=='number')continue;n++;if(u.x>=XWW.small+0.5||u.y>=XWW.small+0.5)big++;}
  return n>0&&big>0&&big>=Math.ceil(n*0.5);}

// 單一轉換入口（序列化存檔）：回傳新的存檔物件，原物件不動
function xwConvertSave(d0,plan){
  const d=JSON.parse(JSON.stringify(d0));const ctx=xwCtx(),o=ctx.off;plan=plan||{};
  const shifted=!!plan.already;
  if(!shifted){
    for(const k of ['units','enemies','wand','cands','npcs'])if(Array.isArray(d[k]))d[k].forEach(ctx.ent);
    if(Array.isArray(d.buildings))for(const b of d.buildings){ctx.ij(b);for(const k in b){const v=b[k];if(ctx.isPt(v))ctx.pt(v);}}
    if(d.nodeMoves&&typeof d.nodeMoves==='object')for(const id in d.nodeMoves){const m=d.nodeMoves[id];if(Array.isArray(m)&&typeof m[0]==='number'){m[0]+=o;m[1]+=o;}}
    if(Array.isArray(d.vg47))for(const e of d.vg47){const g=e&&e[1];if(g&&Array.isArray(g.h))for(const h of g.h)if(Array.isArray(h)&&typeof h[0]==='number'){h[0]+=o;h[1]+=o;}}
    const F=d.flags||{};
    if(F.y47c){for(const c of F.y47c.camps||[]){ctx.pt(c);for(const st of c.st||[])if(Array.isArray(st)&&typeof st[1]==='number'){st[1]+=o;st[2]+=o;}}for(const c of F.y47c.chests||[])ctx.pt(c);}
    if(Array.isArray(d.vr045))for(const e of d.vr045){const v=e&&e[1];if(v&&typeof v==='object')for(const k in v){if(ctx.isPt(v[k]))ctx.pt(v[k]);else ctx.ij(v[k]);}}
    if(d.cam&&typeof d.cam.y==='number')d.cam.y+=2*o*HH;
    if(typeof d.explored==='string')d.explored=ctx.bits(d.explored);
    // 存在副本裡的檔：副本內座標（DG_N 空間）不動，只平移「回世界的落點」
    if(d.dg&&d.dg.live&&Array.isArray(d.dg.live.units))for(const u of d.dg.live.units)if(u&&u.dgSave)ctx.pt(u.dgSave);
    // 其他模組（含 g 端暫代 fallback）
    const hs=XWW.hooks.slice().sort((a,b)=>a.order-b.order);
    for(const h of hs){try{h.fn(d,ctx);}catch(e){XWW.log.push('hook '+h.id+' 失敗：'+e.message);}}
  }else{
    if(typeof d.explored==='string'){try{const raw=atob(d.explored);if(raw.length*8<XWW.big*XWW.big)d.explored=ctx.bits(d.explored);}catch(e){}}
  }
  d.map=d.map||{};d.map.size=XWW.big;d.map.coordSpace='N288';
  d.xw288={n:XWW.big,off:o,v:XWW.ver,from:'N128',at:Date.now(),already:shifted?1:0};
  return d;}

// ---- g 端暫代的轉換（擁有者用同 id 註冊即取代）----
// 經濟：商隊任務 tx/ty/hx/hy（econ_shop.js:533）
xwWorldHookRegister('econ.caravans',function(d,ctx){const seen=new Set();const walk=(o,dep)=>{if(!o||typeof o!=='object'||dep>6||seen.has(o))return;seen.add(o);
  if(typeof o.tx==='number'&&typeof o.ty==='number'&&typeof o.hx==='number'&&typeof o.hy==='number'){o.tx+=ctx.off;o.ty+=ctx.off;o.hx+=ctx.off;o.hy+=ctx.off;}
  for(const k in o)if(o[k]&&typeof o[k]==='object')walk(o[k],dep+1);};walk(d.econ,0);},{fallback:true});
// 修煉：逃走敵人 S.cultFled（x/y/home/cultHome）
xwWorldHookRegister('cult.fled',function(d,ctx){for(const e of d.cultFled||[]){if(!e)continue;ctx.ent(e);if(e.cultHome)ctx.pt(e.cultHome);}},{fallback:true});
// 修煉：元神 S.cultYuanShen（x/y/home/stx/sty/snap.x/y）。存檔裡 cultYuanShen 與 enemies 是兩份獨立序列化資料，各平移一次不會重複
xwWorldHookRegister('cult.yuanshen',function(d,ctx){for(const e of d.cultYuanShen||[]){if(!e)continue;ctx.ent(e);if(typeof e.stx==='number'){e.stx+=ctx.off;e.sty+=ctx.off;}}
  for(const e of d.enemies||[])if(e&&typeof e.stx==='number'&&e.cultYS){e.stx+=ctx.off;e.sty+=ctx.off;}},{fallback:true});
// 新地圖：仙凡之門清單項（map_dungeons mapXfEnsureWorldGate 以 128 座標寫入 S.map.gates，_mapXf=1）
xwWorldHookRegister('map.xfgate',function(d,ctx){for(const g of (d.map&&d.map.gates)||[])if(g&&g._mapXf&&typeof g.x==='number'){g.x+=ctx.off;g.y+=ctx.off;}},{fallback:true});

// ---------------- 備份（不覆蓋原槽）----------------
function xwBackupSave(raw,why){
  try{if(typeof raw!=='string')raw=JSON.stringify(raw);}catch(e){return null;}
  let key='';try{const d=JSON.parse(raw);key=(d.seed|0)+'_'+Math.round(d.time||0);}catch(e){key=String(raw.length);}
  if(XWW.bakSeen[key])return XWW.bakSeen[key];
  const id='xw288bak_'+Date.now().toString(36)+'_'+key;
  const meta={id,name:'288 轉換前備份',custom:true,savedAt:Date.now(),ver:(typeof XW_VER!=='undefined'?XW_VER:''),reason:why||'',xw288bak:1};
  const rec={fmt:(typeof SAVE_FMT!=='undefined'?SAVE_FMT:1),meta,data:raw,thumb:null,sum:hashStr(raw)};
  XWW.bakSeen[key]=id;XWW.lastBackup={id,why,at:Date.now(),bytes:raw.length,ok:null};
  const done=ok=>{XWW.lastBackup.ok=ok;try{const L=JSON.parse(localStorage.getItem('xianwu_xw288_backups')||'[]');L.push({id,why,at:meta.savedAt,ok});localStorage.setItem('xianwu_xw288_backups',JSON.stringify(L.slice(-40)));}catch(e){}};
  try{XWW.lastBackup.p=storePut(id,JSON.stringify(rec)).then(()=>done(true),e=>{done(false);XWW.log.push('備份失敗：'+(e&&e.message));});}catch(e){done(false);}
  return id;}
// 讀回備份（只讀；不刪不覆蓋）
async function xwBackupList(){try{return JSON.parse(localStorage.getItem('xianwu_xw288_backups')||'[]');}catch(e){return [];}}
async function xwBackupRead(id){const s=await storeGet(id);if(!s)return null;const r=parseRec(s);return r&&!r.bad?r:null;}

// ---------------- 格網（N 相關的所有陣列／快取）----------------
function xwAstarBufs(n){let A=XWW.astar[n];if(!A){const NN=n*n;A=XWW.astar[n]={AG:new Float32Array(NN),AC:new Int32Array(NN),AS:new Uint32Array(NN),ACL:new Uint32Array(NN),HI:new Int32Array(NN*8),HF:new Float32Array(NN*8)};}
  if(n===XWW.small&&!XWW.astar._own128){XWW.astar._own128=1;}return A;}
function xwBankCapture(){return {n:N,terrain,biome,depthMap,roadMask,block,comp,occ,nodeGrid,explored,chunkNodes,xroadMask,startComp};}
// 切換目前格網為 n×n；src 給定時沿用其陣列（換回世界），否則新配置
function xwGridAlloc(n,src){
  N=n;NCH=n/CS;const NN=n*n;
  if(src){terrain=src.terrain;biome=src.biome;depthMap=src.depthMap;roadMask=src.roadMask;block=src.block;comp=src.comp;occ=src.occ;nodeGrid=src.nodeGrid;explored=src.explored;chunkNodes=src.chunkNodes||[];xroadMask=src.xroadMask||null;if(src.startComp!=null)startComp=src.startComp;}
  else{if(!terrain||terrain.length!==NN){terrain=new Uint8Array(NN);biome=new Uint8Array(NN);depthMap=new Float32Array(NN);roadMask=new Uint8Array(NN);}
    block=new Uint8Array(NN);comp=new Int32Array(NN);occ=new Array(NN).fill(null);nodeGrid=new Array(NN).fill(null);explored=new Uint8Array(NN);
    chunkNodes=[];for(let c=0;c<NCH*NCH;c++)chunkNodes.push([]);xroadMask=null;}
  const A=xwAstarBufs(n);AG=A.AG;AC=A.AC;AS=A.AS;ACL=A.ACL;HI=A.HI;HF=A.HF;ASTAMP=0;HN=0;A.AS.fill(0);A.ACL.fill(0);
  FN=n+2*FM;fogCan.width=FN;fogCan.height=FN;fogImg=fogCtx.createImageData(FN,FN);fogA=new Float32Array(FN*FN);fogD=new Float32Array(FN*FN);resetFog();
  RX0=-n*HW;RCOLS=Math.ceil(2*n*HW/RW);RROWS=Math.ceil((2*n*HH+PADT+32)/RH);
  tcan.width=n;tcan.height=n;try{xroadSig='';}catch(e){}
  try{chunkReset();}catch(e){}
  mmDirty=true;}
// 每次 newGame／applySave 都從舊版 128 格網起步（genWorld 只會生成 128）
function xwGridReset128(){XWW.worldBank=null;XWW.n=XWW.small;if(N===XWW.small&&terrain&&terrain.length===N*N&&block.length===N*N)return;xwGridAlloc(XWW.small,null);}
// 進副本：288 世界時暫切 128 副本格（地形取核心 128，與舊版副本內讀到的地形一致）
function xwGridToDungeon(){
  if(XWW.n!==XWW.big||N!==XWW.big)return false;
  XWW.worldBank=xwBankCapture();
  const n=DG_N,o=XWW.off,B=XWW.big,NN=n*n;
  const t=new Uint8Array(NN),b=new Uint8Array(NN),dm=new Float32Array(NN),rm=new Uint8Array(NN);
  for(let j=0;j<n;j++){const s=(j+o)*B+o;t.set(terrain.subarray(s,s+n),j*n);b.set(biome.subarray(s,s+n),j*n);dm.set(depthMap.subarray(s,s+n),j*n);rm.set(roadMask.subarray(s,s+n),j*n);}
  const ch=[];for(let c=0;c<(n/CS)*(n/CS);c++)ch.push([]);
  xwGridAlloc(n,{terrain:t,biome:b,depthMap:dm,roadMask:rm,block:new Uint8Array(NN),comp:new Int32Array(NN),occ:new Array(NN).fill(null),nodeGrid:new Array(NN).fill(null),explored:new Uint8Array(NN),chunkNodes:ch,xroadMask:null});
  return true;}
// 出副本：換回 288 世界格（W.block 等由 dgExit 寫回）
function xwGridToWorld(W){
  if(!XWW.worldBank)return false;const B=XWW.worldBank;XWW.worldBank=null;
  xwGridAlloc(B.n,B);return true;}

// ---------------- 公開換格 API（net5 等之後一律呼叫這裡，不要自己改格網全域）----------------
// 所有「和格子大小 N 有關」的全域集中在這份清單；換格時 xwGridAlloc（live）／xwGridUse（只換模擬）會同時改掉它們。
// 新增任何與 N 相關的全域時，只要加進這份清單並在 xwGridUse／xwGridAlloc 同步處理。
const XW_GRID_GLOBALS=Object.freeze({
  bank:Object.freeze(['N','terrain','biome','depthMap','roadMask','block','comp','occ','nodeGrid','explored','chunkNodes','xroadMask','startComp']), // xwBankCapture 的欄位
  derived:Object.freeze(['NCH']),
  astar:Object.freeze(['AG','AC','AS','ACL','HI','HF','ASTAMP','HN']),           // 依 N 配置的 A* 暫存（xwAstarBufs(n) 快取）
  live:Object.freeze(['FN','fogCan','fogImg','fogA','fogD','RX0','RCOLS','RROWS','tcan','xroadSig','mmDirty','fogDistDirty','fogDirty','chunkReset()'])}); // 只有現場換區域（live）才重設
// 只換模擬用的格網（不動迷霧畫布／地形快取），等同 net5 的 netGridUse
function xwGridUse(B){N=B.n;NCH=N/CS;terrain=B.terrain;biome=B.biome;depthMap=B.depthMap;roadMask=B.roadMask;block=B.block;comp=B.comp;occ=B.occ;nodeGrid=B.nodeGrid;explored=B.explored;
  chunkNodes=B.chunkNodes||[];xroadMask=B.xroadMask||null;if(B.startComp!=null)startComp=B.startComp;
  const A=xwAstarBufs(N);AG=A.AG;AC=A.AC;AS=A.AS;ACL=A.ACL;HI=A.HI;HF=A.HF;ASTAMP=0;HN=0;A.AS.fill(0);A.ACL.fill(0);fogDistDirty=true;fogDirty=true;}
// 目前格網屬於哪一區：'world'｜'dungeon'｜'same'（128 世界：兩區同大小，不需換格）
function xwGridRegion(){if(XWW.n!==XWW.big)return 'same';if(N===XWW.big)return 'world';if(N===DG_N&&XWW.worldBank)return 'dungeon';return N===DG_N?'dungeon':'?';}
// xwGridSwap('dungeon'|'world', opt)：冪等。已在目標區（或 128 世界兩邊同大小）→ 回傳 false，不會重複換。
//  opt.live（預設 true）：現場換區域，重設迷霧畫布／地形快取／小地圖（等同 xwGridAlloc）；false＝只換模擬格網（等同 netGridUse）。
//  opt.bank：'dungeon' 時可帶入先前保存的副本格（n===DG_N）；沒帶則從世界核心 128 切出新的副本格。
//  回傳：換格成功時回傳「換出去的那一份格網」（xwBankCapture 格式；換到世界時可存成 D._g 留給下次），否則 false。
//  呼叫時機：必須在 block.set(...)／genDungeon 之前。
function xwGridSwap(to,opt){opt=opt||{};const live=opt.live!==false;
  if(to==='dungeon'){
    if(XWW.n!==XWW.big||N!==XWW.big)return false;
    const prev=xwBankCapture();
    if(opt.bank&&opt.bank.n===DG_N){XWW.worldBank=prev;if(live)xwGridAlloc(DG_N,opt.bank);else xwGridUse(opt.bank);return prev;}
    xwGridToDungeon();return prev;}   // 新切副本格一定要配置新陣列（xwGridAlloc），live=false 也一樣
  if(to==='world'){
    const WB=XWW.worldBank;if(!WB||N===WB.n)return false;
    const prev=xwBankCapture();XWW.worldBank=null;
    if(live)xwGridAlloc(WB.n,WB);else xwGridUse(WB);return prev;}
  throw new Error('xwGridSwap: 未知區域 '+to);}

// ---------------- 外圈地形（依種子決定性；不新增資源點／怪物區，數值與掉落不變）----------------
function xwGenOuter(seed,t,b,dm,rm){
  const n=XWW.big,o=XWW.off,c1=o+XWW.small;
  const nA=makeNoise((seed|0)+1101),nB=makeNoise((seed|0)+1102),nC=makeNoise((seed|0)+1103);
  const mounts=(typeof MAP_MOUNTS!=='undefined'&&MAP_MOUNTS)||[];
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const k=j*n+i;if(i>=o&&i<c1&&j>=o&&j<c1)continue;
    const f=nA(i/11,j/11),p=nB(i/16+50,j/16+50),w=nC(i/13+9,j/13+9);
    let tt=T.GRASS,bb=BI.WOOD,dep=0;
    if(p>0.6){bb=BI.PLAIN;tt=T.PLAIN;}else if(f>0.6)tt=T.DEEP;
    if(hash2(i,j)<0.035)tt=T.DIRT;
    for(const m of mounts){const d=dist(i+0.5,j+0.5,m.cx,m.cy);if(d<m.r){bb=BI.MOUNT;tt=T.MOUNT;dep=Math.max(dep,(1-d/m.r)*2.2+(f-0.5));if(dep>1.5&&nA(i/5+3,j/5+3)>0.66)tt=T.CLIFF;}}
    const edge=Math.max(o-1-i,i-c1,o-1-j,j-c1); // 與核心邊界的距離（格）
    if(bb!==BI.MOUNT&&edge>6){if(w>0.74)tt=T.WATER;else if(w>0.715)tt=T.SHALLOW;}
    if(edge<=6&&(tt===T.CLIFF||tt===T.WATER))tt=bb===BI.MOUNT?T.MOUNT:T.GRASS;
    if(i===0||j===0||i===n-1||j===n-1){if(tt===T.WATER)tt=T.SHALLOW;}
    t[k]=tt;b[k]=bb;dm[k]=dep;rm[k]=0;}
  const clear=(cx,cy,r,inner,innerT,outerT)=>{for(let j=Math.floor(cy-r);j<=cy+r;j++)for(let i=Math.floor(cx-r);i<=cx+r;i++){if(i<0||j<0||i>=n||j>=n)continue;if(i>=o&&i<c1&&j>=o&&j<c1)continue;
    const d=dist(i+0.5,j+0.5,cx,cy);if(d>r)continue;const k=j*n+i;if(d<=inner&&innerT!=null){t[k]=innerT;if(innerT===T.ROAD)rm[k]=1;}else if(t[k]===T.WATER||t[k]===T.CLIFF||t[k]===T.SHALLOW)t[k]=outerT!=null?outerT:(b[k]===BI.MOUNT?T.MOUNT:T.GRASS);}};
  const road=(x0,y0,x1,y1)=>{const L=dist(x0,y0,x1,y1),st=Math.ceil(L*2);for(let s=0;s<=st;s++){const q=s/st,x=x0+(x1-x0)*q,y=y0+(y1-y0)*q;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=Math.floor(x)+dx,j=Math.floor(y)+dy;if(i<0||j<0||i>=n||j>=n)continue;if(i>=o&&i<c1&&j>=o&&j<c1)continue;const k=j*n+i;
      if(t[k]===T.WATER)t[k]=T.SHALLOW;else if(t[k]===T.CLIFF)t[k]=T.MOUNT;else if(t[k]!==T.SHALLOW)t[k]=T.ROAD;rm[k]=1;}}};
  const cities=(typeof MAP_CITIES!=='undefined'&&MAP_CITIES)||[];
  const cm=o+XWW.small/2;
  for(const c of cities){clear(c.x,c.y,c.rSafe||12,3.5,T.ROAD,T.PLAIN);
    // 城市接到核心最近邊的中點
    const ex=c.x<o?o-1:c.x>=c1?c1:c.x,ey=c.y<o?o-1:c.y>=c1?c1:c.y;road(c.x,c.y,c.x<o||c.x>=c1?ex:clamp(c.x,o,c1-1),c.y<o||c.y>=c1?ey:clamp(c.y,o,c1-1));}
  for(const s of ((typeof MAP_SECTS!=='undefined'&&MAP_SECTS)||[]))if(s.hall)clear(s.hall.x,s.hall.y,7,3,T.DIRT,null);
  for(const g of ((typeof MAP_DG_GATES!=='undefined'&&MAP_DG_GATES)||[]))clear(g.x,g.y,4.5,2.5,T.DIRT,null);
  void cm;}
// 288 世界：在 MAP_DG_GATES 正式位置放副本門（vstruct dgate；存檔不存 dgate，每次讀檔決定性重建）
function xwPlaceOfficialGates(){
  if(XWW.n!==XWW.big||N!==XWW.big||!S||!Array.isArray(S.vstructs))return 0;
  try{if(typeof mapDgsRegister==='function')mapDgsRegister();}catch(e){}
  const L=(typeof MAP_DG_GATES!=='undefined'&&MAP_DG_GATES)||[];let n=0;
  for(const g of L){if(!g||!DGS[g.kind])continue;if(S.vstructs.some(v=>v&&v.type==='dgate'&&v.kind===g.kind))continue;
    const idx=(typeof MAP_DG_ORDER!=='undefined'&&MAP_DG_ORDER)?MAP_DG_ORDER.indexOf(g.kind):n;
    S.vstructs.push({id:9200+(idx>=0?idx:n),vid:0,type:'dgate',kind:g.kind,i:Math.floor(g.x)-1,j:Math.floor(g.y)-1,s:2,_xwGate:1});n++;}
  return n;}
// 確保重要地點與宗門同一連通區（沿直線往核心挖：水→淺灘、崖→山地，與 genWorld 的開路規則相同）
function xwEnsureReach(){
  const n=N;const tg=[];
  for(const c of ((typeof MAP_CITIES!=='undefined'&&MAP_CITIES)||[]))tg.push([c.x,c.y]);
  for(const s of ((typeof MAP_SECTS!=='undefined'&&MAP_SECTS)||[]))if(s.hall)tg.push([s.hall.x,s.hall.y]);
  for(const m of ((typeof MAP_MOUNTS!=='undefined'&&MAP_MOUNTS)||[]))tg.push([m.cx,m.cy]);
  for(const g of ((typeof MAP_DG_GATES!=='undefined'&&MAP_DG_GATES)||[]))tg.push([g.x+0.5,g.y+1.8]);
  const cm=XWW.off+XWW.small/2;let carved=0;
  for(const [x,y] of tg){
    const f=nearestFree(Math.floor(x),Math.floor(y),-1);if(f&&comp[f.j*n+f.i]===startComp)continue;
    const sx=f?f.i:Math.floor(x),sy=f?f.j:Math.floor(y);const L=dist(sx,sy,cm,cm),st=Math.ceil(L*2);
    for(let s=0;s<=st;s++){const q=s/st,px=Math.floor(sx+(cm-sx)*q),py=Math.floor(sy+(cm-sy)*q);let hit=false;
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=px+dx,j=py+dy;if(!inMap(i,j))continue;const k=j*n+i;
        if(occ[k])continue;if(nodeGrid[k]&&!nodeGrid[k].gone){nodeGrid[k].gone=true;}
        if(terrain[k]===T.WATER)terrain[k]=T.SHALLOW;else if(terrain[k]===T.CLIFF)terrain[k]=T.MOUNT;
        if(comp[k]===startComp&&!block[k])hit=true;}
      if(hit&&s>4)break;}
    carved++;rebuildBlock();const st0=nearestFree(ANCH.start.x,ANCH.start.y,-1);if(st0)startComp=comp[st0.j*n+st0.i];}
  return carved;}
// 把剛生成好的 128 世界嵌進 288（只在 applySave 內、genZones 之後呼叫一次）
function xwEmbed288(seed){
  const n0=XWW.small,n1=XWW.big,o=XWW.off,NN=n1*n1;
  const T0=terrain,B0=biome,D0=depthMap,R0=roadMask;
  const t1=new Uint8Array(NN),b1=new Uint8Array(NN),d1=new Float32Array(NN),r1=new Uint8Array(NN);
  xwGenOuter(seed,t1,b1,d1,r1);
  for(let j=0;j<n0;j++){const s=j*n0,dd=(j+o)*n1+o;t1.set(T0.subarray(s,s+n0),dd);b1.set(B0.subarray(s,s+n0),dd);d1.set(D0.subarray(s,s+n0),dd);r1.set(R0.subarray(s,s+n0),dd);}
  if(ANCH)for(const k in ANCH){const a=ANCH[k];if(a&&typeof a.x==='number'){a.x+=o;a.y+=o;}}
  for(const nd of NODES){nd.i+=o;nd.j+=o;}
  for(const v of (S.villages||[])){v.x+=o;v.y+=o;}
  for(const s of (S.vstructs||[])){s.i+=o;s.j+=o;}
  for(const z of ZONES){z.x+=o;z.y+=o;}
  const live=[...(S.units||[]),...(S.enemies||[]),...(S.npcs||[]),...(S.wand||[]),...(S.cands||[])];const C=xwCtx();for(const e of live)C.ent(e);
  for(const b of (S.buildings||[]))C.ij(b);
  terrain=t1;biome=b1;depthMap=d1;roadMask=r1;
  xwGridAlloc(n1,null);XWW.n=n1;
  xwPlaceOfficialGates();
  rebuildBlock();
  {const st=nearestFree(ANCH.start.x,ANCH.start.y,-1);if(st)startComp=comp[st.j*n1+st.i];}
  xwEnsureReach();
  chunkNodes=[];for(let c=0;c<NCH*NCH;c++)chunkNodes.push([]);
  for(const nd of NODES)if(!nd.gone)chunkNodes[((nd.j/CS)|0)*NCH+((nd.i/CS)|0)].push(nd);
  S._shr=null;try{chunkReset();}catch(e){}
  XWW.log.push('embed288 seed='+seed);}

// ---------------- 生命週期掛點 ----------------
{const _gz=genZones;genZones=function(seed){const r=_gz.apply(this,arguments);if(XWW.pendingBig&&N===XWW.small&&XWW.n===XWW.small){XWW.pendingBig=false;xwEmbed288(seed);}return r;};}
{const _ng=newGame;newGame=function(){XWW.pendingBig=false;xwGridReset128();return _ng.apply(this,arguments);};}
function xwPlan(d){
  if(!d||typeof d!=='object'||XWW.forceSmall)return {big:false};
  if(d.xw288&&d.xw288.n===XWW.big)return {big:true,convert:false};
  if(xwNetClient())return {big:false};           // 客人不自轉；房主分享的世界存檔帶 xw288 標記
  if(!xwSaveMasterReached(d))return {big:false};
  return {big:true,convert:true,already:xwSaveLooksShifted(d)};}
{const _as=applySave;applySave=function(d){
  let plan={big:false};try{plan=xwPlan(d);}catch(e){plan={big:false};}
  const prevS=S,prevN=N,prevXW=XWW.n,prevBank=xwBankCapture(),prevWB=XWW.worldBank;
  let dd=d;
  if(plan.convert){try{xwBackupSave(d,XWW.busy?'突破當下轉換':'讀檔轉換');}catch(e){}try{dd=xwConvertSave(d,plan);}catch(e){XWW.log.push('轉換失敗：'+e.message);toast('外層大地圖轉換失敗：'+e.message+'（原存檔未更動）');return false;}}
  xwGridReset128();XWW.pendingBig=!!plan.big;
  let r=false;
  try{r=_as.call(this,dd);}catch(e){r=false;XWW.log.push('applySave 例外：'+e.message);}
  finally{XWW.pendingBig=false;}
  if(!r&&S===prevS){try{xwGridAlloc(prevN,prevBank);XWW.n=prevXW;XWW.worldBank=prevWB;}catch(e){}}
  if(r&&S){
    try{if(XWW.n===XWW.big){S.map=S.map||{};S.map.size=XWW.big;S.map.coordSpace='N288';xmapPlaceEntryGates();}
      else if(S.map&&S.map.coordSpace==='N288')S.map.coordSpace=null;}catch(e){}
    if(plan.convert){XWW.lastConvert={at:Date.now(),already:!!plan.already,backup:XWW.lastBackup&&XWW.lastBackup.id,live:!!XWW.busy};
      if(!XWW.busy)setTimeout(()=>{try{xwRunAfter('load');}catch(e){}},0);}
  }
  return r;};}
{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{if(d&&XWW.n===XWW.big){d.xw288={n:XWW.big,off:XWW.off,v:XWW.ver};d.map=d.map||{};d.map.size=XWW.big;d.map.coordSpace='N288';}
  else if(d&&d.map&&d.map.coordSpace==='N288'&&!d.xw288)d.map.coordSpace=null;}catch(e){}return d;};}
function xwRunAfter(why){const info={why,n:XWW.n,off:XWW.off,backup:XWW.lastBackup&&XWW.lastBackup.id};
  for(const h of XWW.after){try{h.fn(info);}catch(e){XWW.log.push('after '+h.id+'：'+e.message);}}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='host'&&typeof netShareWorld==='function')netShareWorld();}catch(e){}}

// ---------------- 突破當下（不重載）：snapshot → 備份 → 轉換 → applySave ----------------
function xwWorldExpandTo288(why){
  if(XWW.n===XWW.big||XWW.busy||!S)return false;
  if(xwNetClient())return false;
  if(S.dg||S.interior)return false;
  XWW.busy=true;let ok=false,raw=null;
  try{
    raw=JSON.stringify(snapshot());
    xwBackupSave(raw,why||'突破當下轉換');
    ok=!!applySave(JSON.parse(raw));
    if(ok){try{afterLoad();}catch(e){}
      try{toast('🌐 外層大地圖已開啟：原本的地圖邊界外可以直接走出去（城市、群山、各大宗門與官方秘境）。轉換前存檔已另存備份。');}catch(e){}
      try{xwRunAfter(why||'break');}catch(e){}
      try{autoSaveSoon('外層大地圖');}catch(e){}}
    else{XWW.fail++;XWW.forceSmall=true;try{if(raw&&applySave(JSON.parse(raw)))afterLoad();}catch(e){}finally{XWW.forceSmall=false;}}
  }catch(e){XWW.fail++;XWW.log.push('expand 失敗：'+e.message);}
  finally{XWW.busy=false;}
  return ok;}
function xwWorldTick(){
  try{
    if(XWW.n===XWW.big||XWW.busy||XWW.fail>=3||!S){XWW.readyT=0;return;}
    if(typeof titleOpen!=='undefined'&&titleOpen){XWW.readyT=0;return;}
    if(!xwLiveMasterReached()||xwNetClient()){XWW.readyT=0;return;}
    const p=player();
    if(S.dg||S.interior||!p||p.dead||(typeof deathOpen!=='undefined'&&deathOpen)||(typeof dlgOpen!=='undefined'&&dlgOpen)||document.body.classList.contains('cult-xtl')){XWW.readyT=0;return;}
    XWW.readyT+=0.5;if(XWW.readyT<1.5)return;
    XWW.readyT=0;xwWorldExpandTo288('突破煉氣');
  }catch(e){}}
setInterval(xwWorldTick,500);

// ---------------- 外層地點標示（世界與小地圖）----------------
function xwPoiList(){const out=[];
  for(const c of ((typeof MAP_CITIES!=='undefined'&&MAP_CITIES)||[]))out.push({x:c.x,y:c.y,n:c.n,k:'city',col:'#ffe27a',mm:'城'});
  for(const s of ((typeof MAP_SECTS!=='undefined'&&MAP_SECTS)||[]))if(s.hall)out.push({x:s.hall.x,y:s.hall.y,n:s.n,k:'sect',col:'#9fd0ff',mm:'宗'});
  for(const m of ((typeof MAP_MOUNTS!=='undefined'&&MAP_MOUNTS)||[]))out.push({x:m.cx,y:m.cy,n:m.n,k:'mount',col:'#d8c8a0',mm:'山'});
  return out;}
{const _dw=drawV045World;drawV045World=function(){const r=_dw.apply(this,arguments);try{if(XWW.n===XWW.big&&N===XWW.big&&S&&!S.dg&&!S.interior){
  const tl=screenToWorld(-80,-80),br=screenToWorld(W+80,H+80);
  for(const q of xwPoiList()){if(!isExplored(q.x,q.y))continue;const p=iso(q.x+0.5,q.y+0.5);if(p.x<tl.x||p.x>br.x||p.y<tl.y||p.y>br.y)continue;
    if(q.k==='city'){prism(q.x-1.2,q.y-1.2,q.x+1.2,q.y+1.2,0,26,'#6a5a48','#7e6c58','#a08a6a');}
    else if(q.k==='sect'){prism(q.x-1,q.y-1,q.x+1,q.y+1,0,20,'#4a5a6a','#5a6c7e','#7a90a8');}
    const b=P(q.x,q.y,q.k==='mount'?8:32);label(q.n,b.x,b.y,q.col,'bold 12px sans-serif');}
  }}catch(e){}return r;};}
{const _dm=drawMinimap;drawMinimap=function(){const r=_dm.apply(this,arguments);try{if(XWW.n===XWW.big&&N===XWW.big&&S&&!S.dg){const k=mmBig?2.2:1;mctx.textAlign='center';
  for(const q of xwPoiList()){const ex=isExplored(q.x,q.y);if(!ex&&q.k!=='city')continue;const p=mmPt(q.x,q.y);mctx.fillStyle=ex?q.col:'#9a9a9a';mctx.font=`bold ${Math.round(6*k)}px sans-serif`;mctx.fillText(ex?q.mm:'?',p.x,p.y+2*k);}}}catch(e){}return r;};}

// ---------------- 除錯／驗收介面 ----------------
setTimeout(function xwWorldApi(){if(!window.XW){setTimeout(xwWorldApi,300);return;}
  XW.world={get n(){return XWW.n;},get N(){return N;},get off(){return XWW.off;},get pending(){return XWW.pendingBig;},get lastConvert(){return XWW.lastConvert;},get lastBackup(){return XWW.lastBackup&&{id:XWW.lastBackup.id,ok:XWW.lastBackup.ok,why:XWW.lastBackup.why,bytes:XWW.lastBackup.bytes};},
    get log(){return XWW.log.slice(-20);},get hooks(){return XWW.hooks.map(h=>({id:h.id,fallback:h.fallback}));},
    expand:why=>xwWorldExpandTo288(why||'手動'),backups:()=>xwBackupList(),readBackup:id=>xwBackupRead(id),
    blockedAt:(i,j)=>blockedT(i,j),comp:(x,y)=>compAt(x,y),startComp:()=>startComp,
    gates:()=>gates().map(g=>({kind:g.kind,i:g.i,j:g.j,x:!!g._xmap,official:!!g._xwGate})),
    region:()=>xwGridRegion(),grid:XW_GRID_GLOBALS,
    convert:d=>xwConvertSave(d,{}),plan:d=>xwPlan(d),dgTier:(k,h)=>dgTier(k,h),
    tilesOf:()=>({terrain:terrain.length,block:block.length,explored:explored.length,fogN:FN,tcan:tcan.width})};},0);
