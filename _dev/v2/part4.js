// ================== 建造 ==================
function buildLock(type){
  if(type==='hall'&&S.buildings.some(b=>b.type==='hall'))return '宗門大殿只能建一座';
  if(type!=='hall'&&!hasBuilt('hall'))return '需先建成宗門大殿';
  return null;
}
function enterBuild(type){
  const lock=buildLock(type);
  if(lock){toast(lock);return;}
  if(!canAfford(BUILD[type].cost)){toast(`資源不足：${BUILD[type].name} 需要 ${costStr(BUILD[type].cost)}`);return;}
  buildMode=type;selBuilding=null;
  if(isTouchUI){ghostAt={x:W/2,y:H*0.45};closeBuildMenu();toast('拖曳畫面調整位置，點地面移動虛影，按「✔ 在此建造」確認');}
}
function ghostOrigin(){
  const w=screenToWorld(ghostAt.x,ghostAt.y),t=unIso(w.x,w.y),s=BUILD[buildMode].size;
  return {i:Math.round(t.x-s/2),j:Math.round(t.y-s/2)};
}
function placementValid(type,i0,j0){
  const s=BUILD[type].size;
  if(i0<1||j0<1||i0+s>N-1||j0+s>N-1)return false;
  for(let j=j0;j<j0+s;j++)for(let i=i0;i<i0+s;i++)if(block[j*N+i])return false;
  if(S.enemies.some(e=>e.x>=i0&&e.x<i0+s&&e.y>=j0&&e.y<j0+s))return false;
  return !buildLock(type)&&canAfford(BUILD[type].cost);
}
function tryPlace(shift){
  const g=ghostOrigin();
  if(!placementValid(buildMode,g.i,g.j)){toast('這裡不能建造（被樹木、石頭、水或建築擋住）');return;}
  const type=buildMode,D=BUILD[type],s=D.size;
  for(const k in D.cost)S.res[k]-=D.cost[k];
  const b={id:nid(),type,i:g.i,j:g.j,progress:0,built:false,queue:0,qt:0};
  S.buildings.push(b);rebuildBlock();
  // 把站在地基上的單位推開
  for(const u of S.units){if(u.x>=g.i&&u.x<g.i+s&&u.y>=g.j&&u.y<g.j+s){const p=nearestFree(Math.floor(u.x),Math.floor(u.y));u.x=p.i+0.5;u.y=p.j+0.5;u.path=[];}}
  let builders=selUnits.map(unitById).filter(u=>u&&!u.dead);
  if(!builders.length){const p=player();if(p&&!p.dead)builders=[p];}
  for(const u of builders){u.task={type:'build',bid:b.id};u.prevTask=null;u.path=[];u.manual=false;}
  toast(`開始建造「${D.name}」：需要有人站在工地旁施工`);
  if(!(shift&&canAfford(D.cost)))buildMode=null;
}
function recruit(b){
  if(!b||!b.built||b.type!=='altar')return;
  if(popUsed()>=popCap()){toast('弟子已達上限，請建造住房（弟子上限 +3）');return;}
  if(S.res.food<RECRUIT_COST){toast(`食物不足：招募需要食物 ${RECRUIT_COST}（採集漿果叢或擊殺妖獸）`);return;}
  S.res.food-=RECRUIT_COST;b.queue=(b.queue||0)+1;toast('求武台開始感應有緣人……');
}
function spawnDisciple(b){
  const s=BUILD[b.type].size,c=[];
  for(let j=b.j-1;j<=b.j+s;j++)for(let i=b.i-1;i<=b.i+s;i++){if(i>=b.i&&i<b.i+s&&j>=b.j&&j<b.j+s)continue;if(!blockedT(i,j))c.push({i,j});}
  c.sort((p,q)=>(q.i+q.j)-(p.i+p.j));
  const p=c[0]||nearestFree(b.i+s,b.j+s);
  const bi=rollBody(),d=makeDisciple(p.i+0.5,p.j+0.5,bi);
  S.units.push(d);S.stats.recruited++;
  const B=BODIES[bi];
  if(B.n==='仙武之體')toast(`天降異象！「${d.name}」竟也身負仙武之體！`);
  toast(`新弟子「${d.name}」加入宗門　體質：${B.n}（${B.rar}）`);
  floater(d.x,d.y,'新弟子！','#ffe27a');
}

// ================== 座標轉換 ==================
let W=innerWidth,H=innerHeight,dpr=1;
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
// 畫布大小一律量「根容器」本身（CSS 決定），不再用 window／visualViewport 的數字去設版面
const rootEl=document.getElementById('root');
function rootSize(){let w=rootEl.clientWidth,h=rootEl.clientHeight;if(!(w>0&&h>0)){const r=rootEl.getBoundingClientRect();w=r.width;h=r.height;}if(!(w>0&&h>0)){w=document.documentElement.clientWidth||innerWidth;h=document.documentElement.clientHeight||innerHeight;}return {w:Math.max(1,Math.round(w)),h:Math.max(1,Math.round(h))};}
// WebKit（含 iOS 內嵌瀏覽器）已知問題：視窗在載入後變大／變小時，既有的 position:fixed 元素
// 不一定會重新排版（新建的元素卻是對的）。所以每次量測都用一個「新建的」inset:0 探針比對，
// 不一致就強制根容器重新排版（只是重排，不做任何位移或用 JS 設高度）。
let lastProbe=null;
function probeViewport(){const d=document.createElement('div');d.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;visibility:hidden;pointer-events:none';document.body.appendChild(d);const r=d.getBoundingClientRect();d.remove();return lastProbe={x:r.left,y:r.top,w:r.width,h:r.height};}
function relayoutRootIfStale(){
  const p=probeViewport();if(!(p.w>0&&p.h>0))return;
  const r=rootEl.getBoundingClientRect();
  if(Math.abs(r.width-p.w)>1||Math.abs(r.height-p.h)>1||Math.abs(r.top-p.y)>1||Math.abs(r.left-p.x)>1){
    const b=document.body;rootEl.style.display='none';b.style.display='none';void b.offsetHeight;b.style.display='';rootEl.style.display='';void rootEl.offsetHeight;
    relayoutCount++;
  }
}
let relayoutCount=0,inResize=false;
function resize(){
  if(inResize)return;inResize=true;
  try{relayoutRootIfStale();}catch(e){}
  inResize=false;
  const vs=rootSize();
  if(window.scrollX||window.scrollY)window.scrollTo(0,0);
  W=vs.w;H=vs.h;
  // 效能：限制裝置像素比（手機 1.5、電腦 2），且畫布像素總量不超過約 250 萬
  dpr=Math.min(isTouchUI?1.5:2,devicePixelRatio||1);
  if(W*H*dpr*dpr>2.5e6)dpr=Math.max(1,Math.sqrt(2.5e6/(W*H)));
  const cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(cv.width!==cw)cv.width=cw;if(cv.height!==ch)cv.height=ch;
  const tb=document.getElementById('topbar');if(tb)document.documentElement.style.setProperty('--tb',tb.offsetHeight+'px');
  document.body.classList.toggle('land',W>H);
}
function resizeSoon(){resize();[100,300,1000].forEach(t=>setTimeout(resize,t));}
if(window.ResizeObserver){try{new ResizeObserver(()=>resize()).observe(rootEl);}catch(e){}}
['resize','orientationchange','pageshow','focus','load'].forEach(t=>addEventListener(t,resizeSoon));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resizeSoon();});
if(window.visualViewport)visualViewport.addEventListener('resize',resizeSoon);
if(screen.orientation&&screen.orientation.addEventListener)screen.orientation.addEventListener('change',resizeSoon);
// 頁面本身不該捲動；萬一被捲動就拉回 0（不做任何 offsetTop 位移）
addEventListener('scroll',()=>{if(window.scrollY||window.scrollX)window.scrollTo(0,0);},{passive:true});
resizeSoon();
function screenToWorld(mx,my){return {x:(mx-W/2)/cam.zoom+cam.x,y:(my-H/2)/cam.zoom+cam.y};}
function worldToScreen(wx,wy){return {x:(wx-cam.x)*cam.zoom+W/2,y:(wy-cam.y)*cam.zoom+H/2};}
function tileAtWorld(w){const t=unIso(w.x,w.y);return {i:Math.floor(t.x),j:Math.floor(t.y),x:t.x,y:t.y};}
function unitAt(w,list,off,rad){let best=null,bd=rad||(isTouchUI?24/Math.min(1,cam.zoom):15);for(const u of list){if(u.dead)continue;const p=iso(u.x,u.y);const d=dist(w.x,w.y,p.x,p.y-off);if(d<bd){bd=d;best=u;}}return best;}
function buildingAt(w){
  for(const dy of [0,16,32,48]){const t=tileAtWorld({x:w.x,y:w.y+dy});
    for(const b of S.buildings){const s=BUILD[b.type].size;if(t.i>=b.i&&t.i<b.i+s&&t.j>=b.j&&t.j<b.j+s)return b;}}
  return null;
}
function nodeAt(w){
  for(const dy of [0,14,28]){const t=tileAtWorld({x:w.x,y:w.y+dy});const n=S.nodes.find(n=>n.i===t.i&&n.j===t.j);if(n)return n;}
  return null;
}

// ================== 指令 ==================
function commandUnits(){
  let us=selUnits.map(unitById).filter(u=>u&&!u.dead);
  if(!us.length){const p=player();if(p&&!p.dead)us=[p];}
  return us;
}
function rightClick(mx,my){
  if(buildMode){buildMode=null;return;}
  const w=screenToWorld(mx,my),t=tileAtWorld(w),us=commandUnits();
  if(!us.length)return;
  us.forEach(u=>{u.manual=false;u.prevTask=null;u.path=[];u.repath=0;});
  const e=unitAt(w,S.enemies,8);
  if(e){us.forEach(u=>u.task={type:'attack',eid:e.id});markers.push({x:e.x,y:e.y,t:0,col:'#ff5050'});return;}
  const n=nodeAt(w);
  if(n){us.forEach(u=>u.task={type:'gather',nodeId:n.id,resType:NODE_RES[n.type]});markers.push({x:n.i+0.5,y:n.j+0.5,t:0,col:'#ffe27a'});return;}
  const b=buildingAt(w);
  if(b&&!b.built){us.forEach(u=>u.task={type:'build',bid:b.id});markers.push({x:b.i+1,y:b.j+1,t:0,col:'#7fd0ff'});return;}
  if(b&&b.type==='hall'){us.forEach(u=>{if(u.carry&&u.carry.amt>0)u.task={type:'return',back:null,resType:u.carry.type};else{u.task={type:'move'};setPathPoint(u,b.i+3.5,b.j+3.5);}});return;}
  // 移動（多人時排成小方陣）
  const cols=Math.ceil(Math.sqrt(us.length));
  us.forEach((u,k)=>{const ox=(k%cols-(cols-1)/2)*0.7,oy=(Math.floor(k/cols)-(cols-1)/2)*0.7;
    u.task={type:'move'};if(!setPathPoint(u,clamp(t.x+ox,0.3,N-0.3),clamp(t.y+oy,0.3,N-0.3)))u.task=null;});
  markers.push({x:t.x,y:t.y,t:0,col:'#7dff7d'});
}
function leftClick(mx,my,shift){
  const w=screenToWorld(mx,my);
  const u=unitAt(w,S.units,14);
  if(u&&!shift&&selUnits.length===1&&selUnits[0]===u.id){const bb=buildingAt(w);if(bb){selBuilding=bb.id;selUnits=[];return;}}  // 再點一次已選單位＝改選腳下的建築
  if(u){selBuilding=null;if(shift){selUnits=selUnits.includes(u.id)?selUnits.filter(i=>i!==u.id):selUnits.concat(u.id);}else selUnits=[u.id];return;}
  const b=buildingAt(w);
  if(b){selBuilding=b.id;selUnits=[];return;}
  const n=nodeAt(w),p=player();
  if(n&&p&&!p.dead&&distRect(p.x,p.y,n.i,n.j,1)<2.2){p.task={type:'gather',nodeId:n.id,resType:NODE_RES[n.type]};p.path=[];p.manual=false;markers.push({x:n.i+0.5,y:n.j+0.5,t:0,col:'#ffe27a'});return;}
  if(!shift){selUnits=[];selBuilding=null;}
}
function boxSelect(x0,y0,x1,y1,shift){
  const ax=Math.min(x0,x1),bx=Math.max(x0,x1),ay=Math.min(y0,y1),by=Math.max(y0,y1);
  const ids=[];
  for(const u of S.units){if(u.dead)continue;const p=iso(u.x,u.y),s=worldToScreen(p.x,p.y-12);if(s.x>=ax&&s.x<=bx&&s.y>=ay&&s.y<=by)ids.push(u.id);}
  // 框到弟子時不含主角（類似 RTS 常見習慣），只框到主角則選主角
  const ds=ids.filter(id=>unitById(id).kind==='disciple');
  const pick=ds.length?ds:ids;
  selUnits=shift?Array.from(new Set(selUnits.concat(pick))):pick;selBuilding=null;
}
function playerInteract(){
  const p=player();if(!p||p.dead)return;
  let bb=null,bd=1.6;for(const b of S.buildings){if(b.built)continue;const d=distRect(p.x,p.y,b.i,b.j,BUILD[b.type].size);if(d<bd){bd=d;bb=b;}}
  if(bb){p.task={type:'build',bid:bb.id};p.path=[];p.manual=false;return;}
  let nn=null,nd=1.8;for(const n of S.nodes){const d=distRect(p.x,p.y,n.i,n.j,1);if(d<nd){nd=d;nn=n;}}
  if(nn){p.task={type:'gather',nodeId:nn.id,resType:NODE_RES[nn.type]};p.path=[];p.manual=false;return;}
  toast('附近沒有可採集的資源（走到樹木、石堆、纖維草或漿果叢旁再按 E）');
}

// ================== 存讀檔 ==================
// 存檔版本：v1＝v0.1～v0.2.1，v2＝v0.2.2（格式相容，只補欄位）
const SAVE_VER=2;
function migrateSave(d){
  if(!d||typeof d!=='object')throw new Error('存檔損毀');
  if(d.v==null)d.v=1;
  if(d.v>SAVE_VER)throw new Error('存檔來自較新版本');
  if(d.v===1){
    if(!Array.isArray(d.enemies))d.enemies=[];
    if(!Array.isArray(d.objDone))d.objDone=[false,false,false,false,false];
    while(d.objDone.length<5)d.objDone.push(false);
    d.stats=Object.assign({gathered:0,discDeposit:0,recruited:0,kills:0},d.stats||{});
    d.v=2;
  }
  return d;
}
function saveGame(){
  try{
    const data=JSON.parse(JSON.stringify(S));
    data.enemies.forEach(e=>{e.path=[];e.target=null;});
    data.units.forEach(u=>{u.path=[];if(u.task&&!['gather','return','build'].includes(u.task.type))u.task=null;u.prevTask=null;});
    data.v=SAVE_VER;data.app='0.2.3';
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
    toast('已存檔（瀏覽器 localStorage）');
  }catch(err){toast('存檔失敗：'+err.message);}
}
function loadGame(silent){
  let raw=null;try{raw=localStorage.getItem(SAVE_KEY);}catch(err){}
  if(!raw){if(!silent)toast('沒有找到存檔');return false;}
  try{
    const data=migrateSave(JSON.parse(raw));
    S=data;genTerrain(S.seed);rebuildBlock();renderMapCanvas();
    S.units.forEach(u=>{u.path=[];u.repath=0;u.cd=0;u.anim=0;});
    if(!Array.isArray(S.enemies)||!S.enemies.length){S.enemies=[];for(let k=0;k<4;k++)spawnWolf();}
    else S.enemies.forEach(e=>{e.path=[];e.target=null;e.cd=0;e.anim=0;e.repath=0;e.slowT=0;e.wt=1;});
    selUnits=[];selBuilding=null;buildMode=null;floaters=[];markers=[];panelKeyCache=null;
    const p=player();if(p){const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;}cam.follow=true;
    toast('已讀檔');return true;
  }catch(err){toast('讀檔失敗：'+err.message);return false;}
}
function newGame(){
  const seed=(Math.random()*1e9)|0;
  S=newState(seed);const g=genTerrain(seed);genNodes(g);rebuildBlock();renderMapCanvas();
  const p=makePlayer(N/2+0.5,N/2+0.5);S.units.push(p);
  for(let k=0;k<5;k++)spawnWolf();
  selUnits=[p.id];selBuilding=null;buildMode=null;floaters=[];markers=[];panelKeyCache=null;
  const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;
}
