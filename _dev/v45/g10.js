
// ================== v0.4.0：逐出弟子／流浪者／求武台候選人／世界刷新 ==================
function wandById(id){for(const w of S.wand)if(w.id===id)return w;for(const c of S.cands)if(c.id===id)return c;return null;}
const DISC_COPY=['name','body','hp','maxhp','atk','speed','gat','realm','xiu','wu','xy','luck','loyal','person','lg'];
const WAND_KEEP=DISC_COPY.concat(['id','x','y','fav','joinAt','dest','stayT','ex','fails','born']);
const CAND_KEEP=DISC_COPY.concat(['id','x','y','bid','until']);
function rr(a){return a[0]+rnd()*(a[1]-a[0]);}
function inView(x,y,m){const p=iso(x,y),z=cam.zoom||1;return Math.abs(p.x-cam.x)<W/2/z+(m||80)&&Math.abs(p.y-cam.y)<H/2/z+(m||80)+60;}
// ---- 流浪者 ----
function makeWanderer(src,x,y,o){const w=Object.assign(baseMob(x,y),{id:nid(),kind:'wanderer'});for(const k of DISC_COPY)if(src[k]!==undefined)w[k]=src[k];
  w.lg=src.lg?Object.assign({},src.lg):null;Object.assign(w,{fav:10,joinAt:S.time+rr(TUNE.wanderJoin),dest:null,stayT:0,ex:false,fails:0,born:S.time,acd:{},task:null,r:0.27,wt:0},o||{});w.hp=Math.min(w.hp,w.maxhp);return w;}
function wanderCanJoin(v){return !!(v&&!v.destroyed&&(v.type!=='bandit'||typeof y47CampCanReceive!=='function'||y47CampCanReceive(v)));}
function wanderDests(){const r=[];for(const v of S.villages){if(!wanderCanJoin(v))continue;r.push(v);}return r;}
function pickDest(w){const vs=wanderDests();if(!vs.length)return null;
  const wt=v=>(v.type==='bandit'?(w.fav<0?0.55:0.35):(vStatus(v)==='hostile'?0.3:0.65))/(1+dist(w.x,w.y,v.x,v.y)/60)*(w.dest===v.id?0.2:1);
  let tot=0;for(const v of vs)tot+=wt(v);let r=rnd()*tot;for(const v of vs){r-=wt(v);if(r<=0)return v.id;}return vs[0].id;}
function addWanderer(w){if(S.wand.length>=TUNE.wanderCap){// 超過上限：最早出現、離鏡頭最遠的自然流浪者直接投靠
    let old=null;for(const o of S.wand){if(o.ex||inView(o.x,o.y,200))continue;if(!old||o.born<old.born)old=o;}if(old)joinFaction(old,vById(old.dest)||nearestVillage(old));}
  S.wand.push(w);return w;}
function nearestVillage(w){let b=null,bd=1e9;for(const v of S.villages){if(!wanderCanJoin(v))continue;const d=dist(w.x,w.y,v.x,v.y);if(d<bd){bd=d;b=v;}}return b;}
function removeWand(w){const i=S.wand.indexOf(w);if(i>=0)S.wand.splice(i,1);if(selOther&&selOther.k==='w'&&selOther.id===w.id)selOther=null;}
function joinFaction(w,v){if(!v)return false;
  // 滿寨在移除流浪者前拒收，沿原選點／無目的地等待分支；不重設到期、身份或資產。
  if(v.type==='bandit'&&!wanderCanJoin(v)){w.dest=pickDest(w);w.path=[];w.repath=0;return false;}
  removeWand(w);
  if(v.type==='bandit'){const f=nearestFree(v.x+(rnd()-0.5)*6,v.y+(rnd()-0.5)*6,-1)||{i:Math.floor(w.x),j:Math.floor(w.y)};
    const e=makeEnemy(w.realm>=3?'chief':'bandit',f.i+0.5,f.j+0.5,{camp:v.id,realm:w.realm});
    e.name=w.name;e.exd=w.ex?1:2;e.maxhp=Math.max(e.maxhp,Math.round(w.maxhp*1.1));e.hp=e.maxhp;e.atk=Math.max(e.atk,+(w.atk*1.05).toFixed(1));e.body=w.body;e.home={x:e.x,y:e.y};S.enemies.push(e);
    if(w.ex||w.realm>=2)toast(`${w.ex?'被逐出的':'流浪的'}「${w.name}」（${REALMS[w.realm].n}）投靠了${v.name}，成了山賊！`);}
  else{v.guards=v.guards||[];if(v.guards.length>=TUNE.guardsPer){/* 名額滿：就當成普通村民落腳 */}else v.guards.push(pickKeys(w,['name','body','realm','maxhp','atk']));
    const g=makeGuard(v,w,w.x,w.y);S.npcs.push(g);if(w.ex)toast(`「${w.name}」在${v.name}落腳，當上了村衛`);}}
function makeGuard(v,src,x,y){const n=makeVillager(v,x,y);Object.assign(n,{guard:true,name:src.name,body:src.body,realm:src.realm||0,robe:BODIES[src.body||0].col,hat:false});return n;}
function updateWanderer(w,dt,ct){
  if(Math.abs(w.x-ct.x)+Math.abs(w.y-ct.y)>48){w.lod=(w.lod||0)+dt;if(w.lod<TUNE.farLod)return;dt=w.lod;w.lod=0;}
  w.repath-=dt;
  let v=w.dest!=null?vById(w.dest):null;if(!v||v.destroyed){w.dest=pickDest(w);v=vById(w.dest);w.path=[];}
  if(!v){w.dvx=w.dvy=0;moveEntity(w,dt);return;}
  const d=dist(w.x,w.y,v.x,v.y);
  if(d<6){if(S.time>=w.joinAt){joinFaction(w,v);return;}
    w.stayT+=dt;if(w.stayT>rr(TUNE.wanderStay)){w.stayT=0;w.dest=pickDest(w);w.path=[];}
    w.wt-=dt;if(w.wt<=0&&!w.path.length){w.wt=3+rnd()*4;const a=rnd()*6.28,r=2+rnd()*3;const tx=v.x+Math.cos(a)*r,ty=v.y+Math.sin(a)*r;if(!blockedP(tx,ty)&&compAt(tx,ty)===unitComp(w))pathTo(w,tx,ty);}
    if(w.path.length)followPath(w,dt,0.5);else w.dvx=w.dvy=0;moveEntity(w,dt);return;}
  if(!w.path.length||w.needRepath||w.repath<=0){w.repath=8;const f=nearestFree(v.x,v.y+3,unitComp(w));if(!f||!pathTo(w,f.i+0.5,f.j+0.5)){w.fails++;w.dest=pickDest(w);if(w.fails>4&&S.time>=w.joinAt){joinFaction(w,nearestVillage(w));return;}}}
  followPath(w,dt,0.75);moveEntity(w,dt);}
// ---- 逐出 ----
function kickDisciple(u,quiet){if(!u||u.kind!=='disciple')return null;if(u.inside)exitBuilding(u);
  const i=S.units.indexOf(u);if(i>=0)S.units.splice(i,1);selUnits=selUnits.filter(id=>id!==u.id);panelKeyCache=null;rosterKey=null;
  for(const o of S.units)if(o.task&&o.task.followId===u.id)o.task=null;
  const w=makeWanderer(u,u.x,u.y,{ex:true,fav:TUNE.kickFav,joinAt:S.time+rr(TUNE.wanderJoin)});w.hp=Math.max(1,u.hp);addWanderer(w);
  S.stats.kicked=(S.stats.kicked||0)+1;
  for(const v of S.villages)if(v.type!=='bandit')v.rel=clamp(v.rel-TUNE.kickRep,-100,100);
  if(!quiet){toast(`「${w.name}」被逐出師門，成了流浪者（各村關係 -${TUNE.kickRep}）`);floater(w.x,w.y,'逐出師門','#ff9a7a');}
  return w;}
let kickPending=null;
function kickDlg(){let el=document.getElementById('kickdlg');if(!el){el=document.createElement('div');el.id='kickdlg';el.className='ui';document.getElementById('root').appendChild(el);
  el.addEventListener('click',ev=>{const t=ev.target.closest('[data-k]');if(!t)return;if(t.dataset.k==='yes'){if(confirmCb){const cb=confirmCb;confirmCb=null;closeKick();cb();return;}const u=unitById(kickPending);if(u)kickDisciple(u);}closeKick();});}return el;}
function askKick(u){if(!u||u.kind!=='disciple')return;confirmCb=null;kickPending=u.id;const el=kickDlg(),B=BODIES[u.body];
  el.innerHTML=`<div class="kbox"><h4>逐出師門？</h4><div>確定要把 <b style="color:${B.col}">${esc(u.name)}</b>（${B.n}・${REALMS[u.realm].n}）逐出宗門嗎？</div>
    <div class="dim sm" style="margin:6px 0">他不會消失，會成為地圖上的<b>流浪者</b>，一段時間後可能投靠村莊當村衛，或加入山寨成為山賊（保留境界，強者可能回來找麻煩）。之後也可以找他談，重新招攬。各村關係 -${TUNE.kickRep}。</div>
    <div class="ibtns"><button class="btn" data-k="no">取消</button><button class="btn warn" data-k="yes">逐出</button></div></div>`;el.classList.add('open');}
function closeKick(){kickPending=null;confirmCb=null;const el=document.getElementById('kickdlg');if(el)el.classList.remove('open');}
// ---- 重新招攬流浪者 ----
function wooCost(w){return {food:20+w.realm*15,lingshi:w.realm>=2?w.realm*3:0};}
function cleanCost(c){const o={};for(const k in c)if(c[k]>0)o[k]=c[k];return o;}
function nearPlayer(w,r){const p=player();return p&&!p.dead&&dist(p.x,p.y,w.x,w.y)<=r;}
function wooWanderer(w){if(!w||!S.wand.includes(w))return false;
  if(!nearPlayer(w,TUNE.talkDist)){const p=player();if(p&&!p.dead){setTask(p,{type:'move'});pathTo(p,w.x,w.y);toast(`走向「${w.name}」（靠近才能交談）`);}return false;}
  if(w.fav<0){toast(`「${w.name}」對宗門心存芥蒂（好感 ${w.fav}），先送點禮吧`);return false;}
  if(popUsed()>=popCap()){toast('弟子已達上限，請先建造住房');return false;}
  const c=cleanCost(wooCost(w));if(!canAfford(c)){toast('招攬需要 '+costStr(c));return false;}
  pay(c);removeWand(w);const d=makeDisciple(w.x,w.y,w.body);for(const k of DISC_COPY)if(w[k]!==undefined)d[k]=w[k];d.loyal=Math.max(30,(d.loyal||60)-(w.ex?20:0));S.units.push(d);S.stats.recruited++;
  toast(`「${d.name}」${w.ex?'回到了':'加入了'}宗門！`);floater(d.x,d.y,'入門！','#ffe27a');selOther=null;selUnits=[d.id];panelKeyCache=null;return true;}
function giftWanderer(w){if(!w||!S.wand.includes(w))return false;if(!nearPlayer(w,TUNE.talkDist)){toast('要先走到他身邊');return false;}
  const c={food:15};if(!canAfford(c)){toast('贈禮需要食物 15');return false;}pay(c);w.fav=Math.min(50,w.fav+TUNE.giftFav);w.joinAt=Math.max(w.joinAt,S.time+60);toast(`「${w.name}」收下了禮物（好感 ${w.fav}）`);panelKeyCache=null;return true;}
function wandPanel(o){const B=BODIES[o.body],R=REALMS[o.realm];
  if(o.kind==='cand')return `<h4>求武台候選人・${esc(o.name)}<span class="tag" style="background:${B.col}">${B.n}</span></h4><div class="mini">${R.n}｜悟性 ${o.wu}｜仙緣 ${o.xy}</div><div class="jobs"><button class="btn pri" data-act="cands">開啟招募選單</button></div>`;
  const c=cleanCost(wooCost(o));
  return `<h4>${o.ex?'被逐弟子':'流浪者'}・${esc(o.name)}<span class="tag" style="background:${B.col}">${B.n}</span>${xnGradeTag(o)}<span class="dim sm">境界</span><span class="tag" style="background:#9fe8ff">${R.n}</span></h4>
    <div class="mini">好感 <b>${o.fav}</b>｜氣血 ${Math.ceil(o.hp)}/${o.maxhp}｜攻擊 ${o.atk}｜悟性 ${o.wu}｜${o.dest!=null&&vById(o.dest)?'正前往'+vById(o.dest).name:'四處遊蕩'}</div>
    <div class="pdesc" style="color:#d8c9a6">${o.ex?'曾是宗門弟子。':''}居無定所，過一陣子可能投靠村莊或山寨。走到他身邊可以交談。</div>
    <div class="jobs"><button class="btn pri" data-act="woo">招攬入門（${costStr(c)}）</button><button class="btn" data-act="gift">贈禮（食物 15，好感 +${TUNE.giftFav}）</button></div>`;}
// ---- 求武台候選人 ----
function rollBody4(force,mul){if(force!=null)return force;if(rnd()<TUNE.xwChance*(mul||1))return BODIES.length-1;let tot=0;for(let k=0;k<BODIES.length-1;k++)tot+=BODIES[k].w;let r=rnd()*tot;for(let k=0;k<BODIES.length-1;k++){r-=BODIES[k].w;if(r<=0)return k;}return 0;}
function makeCandidate(b,x,y,force){const bi=rollBody4(force,1+0.5*(blv(b)-1)),d=makeDisciple(x,y,bi);d.kind='cand';d.bid=b.id;d.until=S.time+TUNE.candWait;
  if(rnd()<TUNE.candRealm1)applyRealmStats(d,1);
  if(b.up){d.xy+=15;const ch=0.35+(hasBuilt('xianyuan')?0.25:0);if(rnd()<ch){const r=rnd();d.lg={e:ri(0,4),q:r<0.6?0:r<0.92?1:2};}}
  if(isXW(d)){d.wu=Math.max(d.wu,ri(70,98));}return d;}
function candSpots(b,n){const s=BUILD[b.type].size,out=[];const cx=b.i+s/2,cy=b.j+s/2;
  for(let k=0;k<n*4&&out.length<n;k++){const a=(k/n)*Math.PI*2*0.5+Math.PI*0.25+(k%2)*0.3,r=s/2+1.2+(k>=n?1:0);const f=nearestFree(cx+Math.cos(a)*r,cy+Math.sin(a)*r+0.6,startComp);if(f&&!out.some(o=>o.i===f.i&&o.j===f.j))out.push(f);}
  while(out.length<n){const f=nearestFree(cx,cy+s,startComp);out.push(f||{i:b.i,j:b.j+s});}return out;}
function spawnBatch(b,opt){opt=opt||{};const n=opt.n||ri(TUNE.candBatch[0],TUNE.candBatch[1])+blv(b)-1;
  for(const c of S.cands.filter(c=>c.bid===b.id))candToWanderer(c,true);
  const sp=candSpots(b,n);let xw=0;
  for(let k=0;k<n;k++){const c=makeCandidate(b,sp[k].i+0.5,sp[k].j+0.5,opt.force&&k===0?opt.force:null);if(isXW(c))xw++;S.cands.push(c);}
  b.candAt=S.time;
  toast(xw?`天降異象！候選人之中竟有身負「仙武之體」者！`:`${n} 位有緣人來到${bName(b)}前，點求武台選擇要收的弟子`);
  if(xw)fx('break',b.i+1,b.j+1,'#ffe27a');recKey=null;if(recOpen)renderRec(true);return n;}
function candToWanderer(c,quiet){const i=S.cands.indexOf(c);if(i>=0)S.cands.splice(i,1);const w=makeWanderer(c,c.x,c.y,{fav:TUNE.candFav});addWanderer(w);
  const a=rnd()*6.28;w.dest=pickDest(w);if(!quiet)floater(c.x,c.y,'離去','#cdbb92');return w;}
function acceptCand(c){if(!c||!S.cands.includes(c))return false;if(popUsed()>=popCap()){toast('弟子已達上限：請建造住房（上限 +3）');return false;}
  S.cands.splice(S.cands.indexOf(c),1);const d=makeDisciple(c.x,c.y,c.body);for(const k of DISC_COPY)if(c[k]!==undefined)d[k]=c[k];S.units.push(d);S.stats.recruited++;
  const B=BODIES[d.body];toast(isXW(d)?`天降異象！「${d.name}」身負仙武之體，拜入門下！`:`「${d.name}」拜入門下　體質：${B.n}　資質：${xnGradeName(d)}${d.lg?'　'+lgName(d.lg):''}`);floater(d.x,d.y,'新弟子！','#ffe27a');recKey=null;return d;}
function dismissCands(bid){const cs=S.cands.filter(c=>bid==null||c.bid===bid);for(const c of cs)candToWanderer(c);if(cs.length)toast(`${cs.length} 位候選人離開，成了流浪者`);recKey=null;return cs.length;}
function refreshCands(b){if(!b)return false;const cd=(b.candAt||-1e9)+TUNE.candRefreshCd-S.time;if(cd>0){toast(`有緣人還沒到齊，${Math.ceil(cd)} 秒後才能再感應`);return false;}
  if(b.queue>0){toast('正在感應中');return false;}const c=recruitCost(b);if(!canAfford(c)){toast('再感應一批需要 '+costStr(c));return false;}
  pay(c);dismissCands(b.id);b.queue=1;b.qt=0;toast('求武台再次感應有緣人……');recKey=null;return true;}
let recOpen=false,recBid=null,recKey=null,recFold=false,recT=0;
// B-23 根因：候選人到齊、長老自動收徒等非同步事件會以 force 重繪整個選單（innerHTML），若剛好發生在玩家按下與放開之間，按鈕被換掉，click 落空＝「點了沒反應」。
// 修正：手指／滑鼠按住選單時（uiHold）一律延後重繪，放開後由 tickV040 的定時重繪補上；玩家自己的點擊處理（recInClick）照常立即重繪。
// 待使用者確認的數字：放開後多久解除「延後重繪」（毫秒），與 g9 uiHold 的 60ms 一致
const REC_HOLD_RELEASE_MS=60;
let recInClick=false,recHeld=false;// recHeld＝按下點在招募選單內（放開後 60ms 解除，與 uiHold 同步）
function recEl(){let el=document.getElementById('recmenu');if(!el){el=document.createElement('div');el.id='recmenu';el.className='ui scroll';document.getElementById('root').appendChild(el);
  el.addEventListener('pointerdown',()=>{uiHold=true;recHeld=true;},true);
  ['pointerup','pointercancel'].forEach(k=>addEventListener(k,()=>{setTimeout(()=>{recHeld=false;},REC_HOLD_RELEASE_MS);},true));
  el.addEventListener('click',ev=>{const t=ev.target.closest('[data-c]');if(!t)return;recInClick=true;try{recClick(t,el);}finally{recInClick=false;}});}return el;}
// B-23：招募選單點擊處理（獨立出來，以便點擊中允許重繪）
function recClick(t,el){const a=t.dataset.c,b=bById(recBid);
    if(a==='close'){toggleRec(false);return;}if(a==='fold'){recFold=!recFold;el.classList.toggle('folded',recFold);return;}
    if(a==='ref'){refreshCands(b);renderRec(true);return;}if(a==='dis'){dismissCands(recBid);renderRec(true);return;}
    if(a==='new'){recruit(b);renderRec(true);return;}
    const c=S.cands.find(o=>o.id===+t.dataset.u);if(!c)return;
    if(a==='take'){acceptCand(c);renderRec(true);}else if(a==='rej'){candToWanderer(c);renderRec(true);}}
function openRec(b){if(!b)b=S.buildings.find(o=>o.type==='altar'&&o.built);if(!b){toast('先建造求武台');return;}recBid=b.id;toggleRec(true);}
function toggleRec(v){recOpen=v==null?!recOpen:v;const el=recEl();el.classList.toggle('open',recOpen);if(recOpen){if(rosterOpen)toggleRoster(false);recFold=false;el.classList.remove('folded');recKey=null;recInClick=true;try{renderRec(true);}finally{recInClick=false;}}}
function statPip(v){return `<span class="pip"><i style="width:${clamp(v,0,100)}%"></i></span>`;}
function renderRec(force){if(!recOpen)return;const el=recEl();if(uiHold&&recHeld&&!recInClick&&!(typeof event!=='undefined'&&event&&event.type==='click')){recKey=null;return;}const b=bById(recBid);if(!b){toggleRec(false);return;}
  const cs=S.cands.filter(c=>c.bid===b.id).sort((a,c)=>candScore(c)-candScore(a));
  const full=popUsed()>=popCap(),cd=Math.max(0,Math.ceil((b.candAt||-1e9)+TUNE.candRefreshCd-S.time)),left=cs.length?Math.max(0,Math.ceil(Math.min(...cs.map(c=>c.until))-S.time)):0;
  const key=cs.map(c=>c.id).join(',')+'|'+full+'|'+cd+'|'+(b.queue>0?Math.ceil(RECRUIT_TIME-b.qt):'')+'|'+Math.floor(left/10)+'|'+popUsed()+'/'+popCap();
  if(!force&&key===recKey)return;recKey=key;const sc=el.querySelector('.rlist');const st=sc?sc.scrollTop:0;const c0=recruitCost(b);
  let h=`<div class="rhead"><span class="grip" data-c="fold"></span><b>${bName(b)}・招募選單</b><span class="dim">弟子 ${disciples().length}/${popCap()}</span><span class="sp"></span><button class="btn" data-c="fold">${recFold?'▴':'▾'}</button><button class="btn" data-c="close">✖</button></div>`;
  h+=`<div class="rctl">`+(cs.length?`<button class="btn" data-c="ref" ${cd>0||b.queue>0?'disabled':''}>🔄 再感應一批（${costStr(c0)}${cd>0?`，${cd} 秒`:''}）</button><button class="btn" data-c="dis">全部遣散</button>`:
    (b.queue>0?`<span class="dim">感應中……${Math.ceil(RECRUIT_TIME-b.qt)} 秒</span>`:`<button class="btn pri" data-c="new">感應有緣人（${costStr(c0)}，來 ${TUNE.candBatch[0]+blv(b)-1}～${TUNE.candBatch[1]+blv(b)-1} 人）</button>`))+`</div>`;
  h+=`<div class="dim sm" style="margin:2px 0">${cs.length?`選中的人拜入門下，沒選的人約 ${Math.ceil(left/60)} 分鐘後離開成為流浪者（之後在地圖上仍可找他們談）。`:'付出食物後，有緣人會來到求武台前等你挑選。'}${full?'<span class="no">　弟子已滿：建住房才能再收</span>':''}</div>`;
  h+='<div class="rlist scroll">';
  for(const c of cs){const B=BODIES[c.body],R=REALMS[c.realm],xw=isXW(c);
    h+=`<div class="ccard ${xw?'xw':''}"><div class="ch"><b style="color:${B.col}">${esc(c.name)}</b><span class="dim sm" data-tip="body">體質</span><span class="tag" style="background:${B.col}">${B.n}</span>${xnGradeTag(c,1)}<span class="dim sm">境界</span><span class="tag" style="background:#9fe8ff">${R.n}</span>${xw?'<span class="tag gold">✦ 萬中無一</span>':''}</div>
      <div class="cg"><span data-tip="lg">靈根 <b>${c.lg?lgName(c.lg):'無'}</b></span><span data-tip="wu">悟性 ${statPip(c.wu)}<b>${c.wu}</b></span><span data-tip="xy">仙緣 ${statPip(c.xy*2)}<b>${c.xy}</b></span><span data-tip="luck">氣運 ${statPip(c.luck)}<b>${c.luck}</b></span>
      <span>氣血 <b>${c.maxhp}</b>　攻擊 <b>${c.atk}</b></span><span>速度 <b>${c.speed}</b>　採集 <b>${c.gat}</b></span><span>性格 <b>${c.person}</b>　忠誠 <b>${c.loyal}</b></span></div>
      <div class="dim sm">特質：${B.desc}</div>
      <div class="ibtns"><button class="btn" data-c="rej" data-u="${c.id}">婉拒</button><button class="btn pri" data-c="take" data-u="${c.id}" ${full?'disabled':''}>收為弟子</button></div></div>`;}
  if(!cs.length)h+=`<div class="dim" style="padding:10px">${b.queue>0?'有緣人正在趕來……':'目前沒有候選人'}</div>`;
  h+='</div>';el.innerHTML=h;el.classList.toggle('folded',recFold);const s2=el.querySelector('.rlist');if(s2)s2.scrollTop=st;}
// ---- 資源點重生（分時處理、只在鏡頭外生長，避免畫面跳出）----
let nodeTickT=0,nodeScan=0,startArea=0;
function nodeRegrowTime(n){const a=TUNE.nodeRegrow[n.type]||[240,480];return S.time+rr(a);}
function scheduleRegrow(n){S.nodeRegrow[n.id]=nodeRegrowTime(n);}
function compSize(c){let s=0;for(let k=0;k<N*N;k++)if(comp[k]===c)s++;return s;}
function goodNodeSpot(n,i,j){if(!inMap(i,j)||i<1||j<1||i>=N-1||j>=N-1)return false;const k=j*N+i;if(block[k]||occ[k]||roadMask[k])return false;
  const t=terrain[k];if(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN||t===T.ROAD)return false;
  if(((i/CS)|0)!==((n.i/CS)|0)||((j/CS)|0)!==((n.j/CS)|0))return false;
  const A=ANCH;for(const [a,r] of [[A.start,5.5],[A.qinghe,8.5],[A.liuxi,8.5],[A.heifeng,7.6],[A.chilang,7.6],[A.ruin,6]])if(dist(i+0.5,j+0.5,a.x+0.5,a.y+0.5)<r)return false;
  for(const b of S.buildings){const s=BUILD[b.type].size;if(i>=b.i-2&&i<b.i+s+2&&j>=b.j-2&&j<b.j+s+2)return false;}
  // 不要堵住通道：上下或左右同時被擋就不放
  const bl=(x,y)=>blockedT(x,y);if((bl(i-1,j)&&bl(i+1,j))||(bl(i,j-1)&&bl(i,j+1)))return false;
  let nb=0;for(let d=0;d<8;d++)if(bl(i+DX[d],j+DY[d]))nb++;if(nb>3)return false;
  for(const o of ALL)if(Math.abs(o.x-(i+0.5))<1.3&&Math.abs(o.y-(j+0.5))<1.3)return false;
  for(const w of S.cands)if(Math.abs(w.x-(i+0.5))<1.3&&Math.abs(w.y-(j+0.5))<1.3)return false;
  return true;}
function regrowNode(n){// 回傳 true＝已長回
  const c0=Math.floor(n.i/CS)*CS,r0=Math.floor(n.j/CS)*CS;let spot=null,vis=null;
  for(let t=0;t<14&&!spot;t++){const i=t===0?n.i:c0+Math.floor(rnd()*CS),j=t===0?n.j:r0+Math.floor(rnd()*CS);if(!goodNodeSpot(n,i,j))continue;if(inView(i+0.5,j+0.5,120)){if(!vis)vis={i,j};continue;}spot={i,j};}
  if(!spot&&vis&&S.time>(S.nodeRegrow[n.id]||0)+TUNE.nodeVisWait)spot=vis;
  if(!spot)return false;
  const before=startArea||compSize(startComp);const k=spot.j*N+spot.i;block[k]=1;computeComp();
  const after=compSize(startComp);if(after<before-1-2){block[k]=0;computeComp();return false;}// 會切斷宗門所在區域：放棄這個位置
  startArea=after;
  const oi=n.i,oj=n.j;n.i=spot.i;n.j=spot.j;const amt=Math.max(4,Math.round(NODE_MAX[n.type]*rr(TUNE.nodeAmt)));n.amount=amt;n.max=amt;n.gone=false;n.v=Math.floor(rnd()*4);
  nodeGrid[k]=n;S.nodeMods[n.id]=amt;S.nodeMoves[n.id]=[n.i,n.j,amt];delete S.nodeRegrow[n.id];n.grow=performance.now();
  chunkDirtyAt(oi,oj);chunkDirtyAt(n.i,n.j);S.stats.regrown=(S.stats.regrown||0)+1;return true;}
function tickNodes(dt){nodeTickT+=dt;if(nodeTickT<TUNE.nodeTick)return;const el=nodeTickT;nodeTickT=0;startArea=0;
  let done=0;for(const id in S.nodeRegrow){if(done>=TUNE.nodePerTick)break;if(S.nodeRegrow[id]>S.time)continue;const n=NODES[+id];if(!n||!n.gone){delete S.nodeRegrow[id];continue;}
    if(regrowNode(n))done++;else S.nodeRegrow[id]=S.time+5+rnd()*10;}
  // 被採一半的資源點慢慢回復（每次只掃一小段，分散到很多幀）
  const L=NODES.length;if(!L)return;const step=Math.ceil(L*el/TUNE.nodeTrickleScan);
  for(let s=0;s<step;s++){nodeScan=(nodeScan+1)%L;const n=NODES[nodeScan];if(n.gone||n.amount>=n.max)continue;if(S.time-(n.hitT||-1e9)<60)continue;
    n.amount=Math.min(n.max,n.amount+Math.max(1,Math.round(n.max*TUNE.nodeTrickle)));S.nodeMods[n.id]=n.amount;}}
// ---- 人物刷新與上限 ----
let popTickT=0;
function tickPopulation(dt){popTickT+=dt;if(popTickT<5)return;popTickT=0;const ct=unIso(cam.x,cam.y);
  // 自然流浪者
  const nat=S.wand.filter(w=>!w.ex).length;S.wandT=(S.wandT==null?S.time+rr(TUNE.wanderSpawn):S.wandT);
  if(S.time>=S.wandT){S.wandT=S.time+rr(TUNE.wanderSpawn);if(nat<TUNE.wanderNatural&&S.wand.length<TUNE.wanderCap){const vs=S.villages.filter(v=>!v.destroyed&&!inView(v.x,v.y,200));const v=vs.length?pick(vs):null;
    if(v){const f=nearestFree(v.x+(rnd()-0.5)*8,v.y+3,-1);if(f){const src=makeDisciple(f.i+0.5,f.j+0.5,rollBody4());if(rnd()<0.25)applyRealmStats(src,1);if(rnd()<0.06)applyRealmStats(src,2);const w=makeWanderer(src,src.x,src.y,{fav:TUNE.candFav});w.dest=pickDest(w);addWanderer(w);}}}}
  // 村民補回
  for(const v of S.villages){if(v.type==='bandit'||v.destroyed)continue;const n=S.npcs.filter(o=>o.vid===v.id&&!o.guard).length;if(n<TUNE.villagersPer){const f=nearestFree(v.x+(rnd()-0.5)*6,v.y+(rnd()-0.5)*6,-1);if(f&&!inView(f.i,f.j,60))S.npcs.push(makeVillager(v,f.i+0.5,f.j+0.5));}}
  // 敵人總量上限：超過就移除離鏡頭最遠的野獸
  if(S.enemies.length>TUNE.maxEnemies){const ex=S.enemies.filter(e=>e.zone!=null&&!e.target&&!e.raid&&!inView(e.x,e.y,300)).sort((a,b)=>dist(b.x,b.y,ct.x,ct.y)-dist(a.x,a.y,ct.x,ct.y));
    let k=S.enemies.length-TUNE.maxEnemies;for(const e of ex){if(k<=0)break;S.enemies.splice(S.enemies.indexOf(e),1);k--;}}
  // 候選人逾時
  for(const c of S.cands.slice())if(S.time>=c.until){candToWanderer(c);}
}
function tickV040(dt){tickNodes(dt);tickPopulation(dt);recT-=dt;if(recT<=0){recT=0.5;renderRec(false);}}
// ---- 繪圖 ----
function drawWander(w){drawHuman(w);const b=P(w.x,w.y),bob=w.moving?Math.sin(w.walk*14)*1.5:0;
  if(w.kind==='wanderer'){poly([{x:b.x-10,y:b.y-23+bob},{x:b.x+10,y:b.y-23+bob},{x:b.x,y:b.y-31+bob}],'#c9a860','rgba(0,0,0,0.35)');ctx.fillStyle='#8a6a3a';ctx.fillRect(b.x-(w.face||1)*9-3,b.y-17+bob,6,8);}
  const sel=selOther&&selOther.k==='w'&&selOther.id===w.id;if(sel){ctx.strokeStyle='#ffe27a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,12,6,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(w.kind==='cand'){const xw=isXW(w),t=performance.now()/400;if(xw){ctx.globalAlpha=0.35+0.15*Math.sin(t);ellipse(b.x,b.y-14,14,22,'#ffd34d');ctx.globalAlpha=1;}
    label(xw?'✦ 仙武之體':'候選・'+BODIES[w.body].n,b.x,b.y-44,xw?'#ffe27a':'#f0e2c0');}
  else if(sel||cam.zoom>=0.9)label((w.ex?'被逐・':'流浪・')+w.name,b.x,b.y-44,w.ex?'#ff9a7a':'#e0d0a8');}
function drawGuardMark(n){const b=P(n.x,n.y);ctx.strokeStyle='#b8b8c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+7,b.y-2);ctx.lineTo(b.x+7,b.y-30);ctx.stroke();ctx.lineWidth=1;poly([{x:b.x+5,y:b.y-30},{x:b.x+9,y:b.y-30},{x:b.x+7,y:b.y-36}],'#d8d8e0');
  if(cam.zoom>=0.9)label('村衛・'+n.name,b.x,b.y-40,'#cfe8ff');}
function wandAt(w){let best=null,bd=isTouchUI?24/Math.min(1,cam.zoom):15;for(const o of S.wand.concat(S.cands)){if(!isExplored(o.x,o.y))continue;const p=iso(o.x,o.y);const d=dist(w.x,w.y,p.x,p.y-14);if(d<bd){bd=d;best=o;}}return best;}
// ---- 存檔 ----
function snapV040(o){snapV045(o);o.tut=S.tut?JSON.parse(JSON.stringify(S.tut)):null;o.wand=S.wand.map(w=>pickKeys(w,WAND_KEEP));o.cands=S.cands.map(c=>pickKeys(c,CAND_KEEP));o.nodeMoves=S.nodeMoves;o.nodeRegrow=S.nodeRegrow;o.wandT=S.wandT;return o;}
function applyNodesV040(d){S.nodeMoves=d.nodeMoves||{};S.nodeRegrow=d.nodeRegrow||{};
  for(const id in S.nodeMoves){const n=NODES[+id],m=S.nodeMoves[id];if(!n||!m)continue;n.i=m[0];n.j=m[1];n.max=m[2]||n.max;}
}
function applyV040(d){applyV045(d);S.tut=d.tut||{step:TUT.length,done:true,base:{}};S.wand=(d.wand||[]).map(o=>Object.assign(makeWanderer(o,o.x,o.y),o,{path:[]}));S.cands=(d.cands||[]).map(o=>{const c=Object.assign(makeDisciple(o.x,o.y,o.body),o,{kind:'cand',path:[]});return c;});S.wandT=d.wandT;
  for(const v of S.villages)for(const g of v.guards||[]){const f=nearestFree(v.x+(rnd()-0.5)*6,v.y+(rnd()-0.5)*6,-1);if(f)S.npcs.push(makeGuard(v,g,f.i+0.5,f.j+0.5));}}
// ================== v0.4.0：建築等級（Lv1～3）與拆除 ==================
const LV_MAX=3;
function blv(b){return b&&b.lv||1;}
const LV_SLOT_ADD={wudao:2,lianwu:1,house:2,library:1,hall:2},LV_POP_ADD={house:2,hall:2};
function lvSlots(b){return (LV_SLOT_ADD[b.type]||0)*(blv(b)-1);}
function lvPop(b){return (LV_POP_ADD[b.type]||0)*(blv(b)-1);}
function lvXiuMul(b){return 1+TUNE.lvXiu*(blv(b)-1);}
function lvMaxHp(type,lv){return Math.round(BUILD[type].hp*(1+TUNE.lvHp*(lv-1)));}
function upCost(b,lv){lv=lv||blv(b)+1;try{if(typeof econFlag==='function'&&econFlag('build')&&typeof econUpgradeCost==='function'){const ec=econUpgradeCost(b,lv);if(ec)return ec;}}catch(e){}const base=BUILD[b.type].cost,m=TUNE.lvCost[lv-2],c={};for(const k in base)c[k]=Math.ceil(base[k]*m);if(lv===3)c.iron=(c.iron||0)+TUNE.lv3Iron;return c;}
function upTime(b){const L=TUNE.lvTime||[1.5,2.2];const i=Math.min(L.length-1,Math.max(0,blv(b)-1));const mul=L[i]!=null?L[i]:L[L.length-1];return BUILD[b.type].time*mul*(econFlag&&econFlag('build')?1+0.15*Math.max(0,blv(b)-1):1);}
function addCost(a,c){for(const k in c)a[k]=(a[k]||0)+c[k];return a;}
function invested(b){if(b.inv)return b.inv;const c=addCost({},BUILD[b.type].cost);for(let l=2;l<=blv(b);l++)addCost(c,upCost(b,l));return c;}
function lvEffect(b,lv){const t=b.type,a=[];const sl=(JOB_SLOTS[t]||0)+(LV_SLOT_ADD[t]||0)*(lv-1);
  if(BUILD[t].pop||LV_POP_ADD[t])a.push(`弟子上限 +${BUILD[t].pop+(LV_POP_ADD[t]||0)*(lv-1)}`);
  if(JOB_OF[t])a.push(`${INJOB[JOB_OF[t]].label} ${sl} 人`,`修為 ×${(1+TUNE.lvXiu*(lv-1)).toFixed(2)}`);
  if(t==='library')a.push(`研究秘籍速度 ×${(1+0.25*(lv-1)).toFixed(2)}`);
  if(t==='altar')a.push(`每批候選 ${TUNE.candBatch[0]+lv-1}～${TUNE.candBatch[1]+lv-1} 人`,`仙武之體機率 ×${(1+0.5*(lv-1)).toFixed(1)}`);
  if(t==='xianyuan')a.push(`仙緣事件每 ${60-15*(lv-1)} 秒`);
  a.push(`耐久 ${lvMaxHp(t,lv)}`);return a.join('、');}
function lvPanel(b){const lv=blv(b);const _mx=(typeof econUpgradeMax==='function'?econUpgradeMax(b):LV_MAX);const peak=(typeof econPeakForCap==='function'?econPeakForCap():0);
  const absMax=(typeof ECON_LV_MAX==='number'?ECON_LV_MAX:Math.max(_mx,6));
  let h=`<div class="lvbox"><div><b class="lvt">Lv${lv}</b>${'★'.repeat(Math.min(lv,absMax))}<span class="dim">${'☆'.repeat(Math.max(0,absMax-lv))}</span>　<span class="dim sm">目前：${lvEffect(b,lv)}</span></div>`;
  h+=`<div class="sm dim">宗門境界上限：Lv${_mx}（依曾達最高境界；已超過者保留現級）</div>`;
  if(b.upg)h+=`<div class="sm">升級到 Lv${lv+1} 中 <b id="pd_upg">${Math.floor(b.upg.p*100)}%</b>（需要弟子或你在旁施工）</div>`;
  else if(lv<_mx)h+=`<div class="sm">下一級 Lv${lv+1}：<span style="color:#bfe8a0">${lvEffect(b,lv+1)}</span><br>費用 ${costStr(upCost(b))}｜工時 ${Math.round(upTime(b))} 秒</div>`;
  else{
    const need=(typeof econRealmNeedForLv==='function'?econRealmNeedForLv(lv+1):0);
    const rn=(REALMS[need]&&REALMS[need].n)||'更高境界';
    h+=`<div class="sm dim">${lv>=absMax?'已達最高等級 Lv'+absMax:'需宗門突破「'+rn+'」才能升級（目前上限 Lv'+_mx+'）'}</div>`;
  }
  h+='<div class="lvcosts">';
  for(let l=1;l<=absMax;l++){
    let c=null,ok=false;
    try{if(l===1){c=BUILD[b.type]&&BUILD[b.type].cost;ok=!!c;}else{c=upCost(b,l);ok=!!c&&Object.keys(c).some(k=>isFinite(c[k])&&c[k]>0);}}catch(e){ok=false;}
    const past=l<=lv,next=l===lv+1;
    const needR=(typeof econRealmNeedForLv==='function'?econRealmNeedForLv(l):0);
    const locked=l>_mx;
    const rn=(REALMS[needR]&&REALMS[needR].n)||'';
    let tag=past?'<span class="lvs">已達</span>':next&&!locked?'<span class="lvs">下一級</span>':locked?`<span class="lvs" style="color:#ffb070">需宗門突破「${rn}」</span>`:'';
    h+=`<div class="lvrow${past?' done':''}${next&&!locked?' next':''}${l===lv?' cur':''}${locked?' dim':''}"><span class="lvl">Lv${l}</span><span class="lvc">${ok?costStr(c):'—'}</span>${tag}</div>`;
  }
  return h+'</div></div>';}
function startUpgrade(b){if(!b||!b.built){toast('建築還沒落成');return false;}if(b.broken){toast('先修繕再升級');return false;}if(b.upg){toast('正在升級中');return false;}
  const _lvMax=(typeof econUpgradeMax==='function'?econUpgradeMax(b):LV_MAX);
  if(blv(b)>=_lvMax){
    const need=(typeof econRealmNeedForLv==='function'?econRealmNeedForLv(blv(b)+1):0);
    const rn=(REALMS[need]&&REALMS[need].n)||'更高境界';
    const absMax=(typeof ECON_LV_MAX==='number'?ECON_LV_MAX:6);
    toast(blv(b)>=absMax?'已達最高等級':`需宗門突破「${rn}」（目前上限 Lv${_lvMax}）`);
    return false;
  }
  const c=upCost(b);if(!canAfford(c)){toast('升級需要 '+costStr(c));return false;}
  pay(c);b.upg={p:0,cost:c};let us=selUnits.map(unitById).filter(u=>u&&!u.dead&&!u.inside&&u.kind==='disciple');
  if(!us.length)us=disciples().filter(u=>!u.dead&&!u.inside&&(!u.job||u.job==='gather')).sort((a,c2)=>distRect(a.x,a.y,b.i,b.j,3)-distRect(c2.x,c2.y,b.i,b.j,3)).slice(0,2);
  if(!us.length){const p=player();if(p&&!p.dead&&!S.interior)us=[p];}
  us.forEach(u=>setTask(u,{type:'build',bid:b.id}));toast(`開始升級「${bName(b)}」到 Lv${blv(b)+1}：${us.length?'派 '+us.length+' 人施工':'選取弟子後點這座建築就會來施工'}`);panelKeyCache=null;return true;}
function upgradeStep(b,dt){b.upg.p+=dt/upTime(b);if(b.upg.p>=1)finishUpgrade(b);}
function finishUpgrade(b){if(!b.upg)return;b.inv=addCost(invested(b),b.upg.cost);b.lv=blv(b)+1;b.upg=null;const mh=lvMaxHp(b.type,b.lv);b.hp+=mh-b.maxhp;b.maxhp=mh;
  for(const u of S.units)if(u.task&&u.task.type==='build'&&u.task.bid===b.id)u.task=null;
  fx('break',b.i+BUILD[b.type].size/2,b.j+BUILD[b.type].size/2,'#ffe27a');toast(`「${bName(b)}」升到 Lv${b.lv}！${lvEffect(b,b.lv)}`);chunkDirtyAt(b.i,b.j);panelKeyCache=null;autoSaveSoon('建築升級');}
function demoRefund(b){const inv=invested(b),r={};let f;
  if(!b.built)f=TUNE.demoUnbuilt;else f=TUNE.demoRefund[0]+(TUNE.demoRefund[1]-TUNE.demoRefund[0])*clamp(b.hp/b.maxhp,0,1);
  for(const k in inv)r[k]=Math.floor(inv[k]*f);if(b.upg)addCost(r,b.upg.cost);for(const k in r)if(!r[k])delete r[k];return {res:r,f};}
function canDemolish(b){if(!b)return '找不到建築';if(b.type==='hall'&&b.built&&S.buildings.filter(o=>o.type==='hall'&&o.built).length<=1)return '宗門大殿是宗門根本，不能拆掉唯一的一座（先另建一座大殿）';return '';}
let confirmCb=null;
function showConfirm(html,yesLabel,cb){const el=kickDlg();confirmCb=cb;el.innerHTML=`<div class="kbox">${html}<div class="ibtns"><button class="btn" data-k="no">取消</button><button class="btn warn" data-k="yes">${yesLabel}</button></div></div>`;el.classList.add('open');}
function askDemolish(b){const why=canDemolish(b);if(why){toast(why);return;}const R=demoRefund(b),occ=S.units.filter(u=>u.jobB===b.id&&!u.dead).length;
  showConfirm(`<h4>拆除「${bName(b)}」${b.lv>1?' Lv'+b.lv:''}？</h4><div>可退回：<b style="color:#bfe8a0">${Object.keys(R.res).length?costStr(R.res):'（沒有）'}</b></div>
    <div class="dim sm" style="margin:6px 0">${b.built?`已落成的建築退回總投入的 ${Math.round(R.f*100)}%（依剩餘耐久，${Math.round(TUNE.demoRefund[0]*100)}～${Math.round(TUNE.demoRefund[1]*100)}%）`:'還沒蓋好：全額退回'}${b.upg?'；升級中的材料全額退回':''}。${occ?`館內／指派的 ${occ} 名弟子會改為「待命」。`:''}${b.type==='altar'&&S.cands.some(c=>c.bid===b.id)?'等待中的候選人會離開。':''}${b.type==='hall'?'<br><b style="color:#ff9a7a">注意：這是宗門大殿！</b>':''}</div>`,'拆除',()=>demolish(b));}
const demos=[];
function demolish(b){const why=canDemolish(b);if(why){toast(why);return false;}if(!S.buildings.includes(b))return false;
  if(S.interior&&S.interior.bid===b.id)exitInterior(true);
  for(const u of S.units){if(u.inside&&u.inB===b.id)exitBuilding(u);if(u.jobB===b.id){u.job=null;u.jobB=null;u.holdAt={x:u.x,y:u.y};u.task=null;u.path=[];}
    if(u.task&&u.task.bid===b.id)u.task=null;}
  for(const c of S.cands.filter(c=>c.bid===b.id))candToWanderer(c,true);
  const R=demoRefund(b);for(const k in R.res)S.res[k]=(S.res[k]||0)+R.res[k];
  S.buildings.splice(S.buildings.indexOf(b),1);rebuildBlock();const s=BUILD[b.type].size;for(let j=b.j;j<b.j+s;j++)for(let i=b.i;i<b.i+s;i++)chunkDirtyAt(i,j);
  demos.push({type:b.type,i:b.i,j:b.j,lv:blv(b),t0:performance.now(),b:Object.assign({},b)});if(selBuilding===b.id)selBuilding=null;panelKeyCache=null;
  if(recBid===b.id&&recOpen)toggleRec(false);
  toast(`拆除「${bName(b)}」，退回 ${Object.keys(R.res).length?costStr(R.res):'—'}`);S.stats.demolished=(S.stats.demolished||0)+1;autoSaveSoon('拆除建築');return R.res;}
function drawDemos(){const now=performance.now();for(let k=demos.length-1;k>=0;k--){const d=demos[k],t=(now-d.t0)/900;if(t>=1){demos.splice(k,1);continue;}
  const s=BUILD[d.type].size;ctx.save();const c=P(d.i+s/2,d.j+s/2);ctx.translate(0,t*t*30);drawBuildingShape(d.type,d.i,d.j,Math.max(0.05,1-t),1-t,d.b);ctx.restore();
  for(let q=0;q<10;q++){const a=q*0.63+d.i,r=8+t*40;ctx.globalAlpha=0.5*(1-t);ellipse(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*0.5-8*t,6+t*10,3+t*5,'#b8a07a');}ctx.globalAlpha=1;}}
// 外觀：Lv2 燈籠柱＋金頂；Lv3 再加一層樓閣、旗幟與石基
const TOPZ={hall:68,altar:26,house:38,wudao:36,lianwu:54,library:36,xianyuan:46};
function drawLevelDeco(b){const lv=blv(b);if(lv<2&&!b.upg)return;const s=BUILD[b.type].size,i=b.i,j=b.j,x1=i+s,y1=j+s,tt=performance.now()/500;
  const spriteOn=typeof bldSpriteReady==='function'&&bldSpriteReady(b.type);
  const cx=b.type==='wudao'?i+2.5:i+s/2,cy=j+s/2,z=TOPZ[b.type]||40;
  if(!spriteOn){
  if(lv>=3){ctx.globalAlpha=0.9;diamond(i-0.18,j-0.18,s+0.36,null,'rgba(220,200,150,0.55)');ctx.globalAlpha=1;}
  if(lv>=2)for(const [x,y] of [[i+0.08,y1-0.08],[x1-0.08,y1-0.08],[x1-0.08,j+0.08]]){prism(x-0.07,y-0.07,x+0.07,y+0.07,0,26,'#5a1a12','#7a2418',null);const p=P(x,y,30);const g=0.75+0.25*Math.sin(tt*2+x);
    ctx.fillStyle=`rgba(255,${150+60*g|0},70,${g})`;ctx.beginPath();ctx.ellipse(p.x,p.y,3.6,4.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3a1a0a';ctx.fillRect(p.x-2,p.y-6,4,1.5);}
  if(lv>=3){prism(cx-0.32,cy-0.32,cx+0.32,cy+0.32,z-6,z+10,'#9c2f22','#b93a2a',null);const rp=typeof bldRoofCols==='function'?bldRoofCols(lv):{L:'#2a2e36',R:'#3f4652'};const a=pyramid(cx-0.5,cy-0.5,cx+0.5,cy+0.5,z+10,14,rp.L,rp.R);
    ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.arc(a.x,a.y-3,3,0,Math.PI*2);ctx.fill();
    for(const [x,y] of [[i+0.1,j+0.1],[x1-0.1,j+0.1]]){const f=P(x,y,0);ctx.strokeStyle='#4a3218';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x,f.y-62);ctx.stroke();ctx.lineWidth=1;const wv=Math.sin(tt*1.6+x)*3;
      poly([{x:f.x,y:f.y-62},{x:f.x+18,y:f.y-57+wv},{x:f.x+15,y:f.y-50+wv},{x:f.x,y:f.y-46}],'#d8a020','#7a5a10');}}
  else if(lv>=2){const p=P(cx,cy,z+2);ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.arc(p.x,p.y,2.6,0,Math.PI*2);ctx.fill();}
  }
  if(b.upg){ctx.strokeStyle='#c8a46a';ctx.lineWidth=1.5;for(const [x,y] of [[i,y1],[x1,y1],[x1,j]]){const a=P(x,y,0);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,a.y-z-12);ctx.stroke();}
    const a=P(i,y1,z*0.6),c=P(x1,y1,z*0.6),d=P(x1,j,z*0.6);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();ctx.lineWidth=1;
    const top=P(i+s/2,j+s/2,s*22+40);bar(top.x,top.y,50,b.upg.p,'#ffe27a');label(`升級 Lv${lv+1} ${Math.floor(b.upg.p*100)}%`,top.x,top.y-4,'#fff','11px sans-serif');}
  if(lv>=2&&(cam.zoom>=0.7||selBuilding===b.id)){const p=P(i,y1,0);label('★'.repeat(lv)+'Lv'+lv,p.x-4,p.y+4,'#ffe27a','bold 10px sans-serif');}}
// 室內：等級越高座位與擺設越多
const EXTRA_ST={wudao:[[1.2,5.9,1.2,5.05],[5.8,5.9,5.8,5.05],[2.3,6.3,2.3,5.45],[4.7,6.3,4.7,5.45]],lianwu:[[1.4,3.4],[3.6,3.4]],house:[[0.95,3.0],[4.05,3.0],[0.95,4.3],[2.5,3.0]],library:[[1.5,4.2],[3.5,4.2]],hall:[[2.0,5.7],[5.0,5.7],[3.5,5.0],[1.8,4.0]]};
function roomSt(b,k){const st=ROOM[b.type].st;if(k<st.length)return st[k];const ex=EXTRA_ST[b.type]||[];const m=k-st.length;return m<lvSlots(b)?ex[m]:null;}
function addLvFurniture(b,f){const lv=blv(b),n=lvSlots(b),ex=EXTRA_ST[b.type]||[];
  for(let m=0;m<n&&m<ex.length;m++){const s=ex[m];if(b.type==='wudao')f.push(['dummy',s[2],s[3]]);else if(b.type==='house')f.push(['bed',s[0],s[1],-0.6]);else if(b.type==='library')f.push(['desk',s[0],s[1]]);else f.push(['cushion',s[0],s[1],-0.3]);}
  if(lv>=2){const R=ROOM[b.type].R;f.push(['plaque',R/2,0.12,lv]);if(b.type!=='xianyuan')f.push(['lamp',R-0.5,R-0.6]);}
  if(lv>=3){const R=ROOM[b.type].R;f.push(['burner',R-0.8,1.0],['lamp',0.5,R-0.6]);}}
function drawPlaque(p,lv){ctx.fillStyle='#2a1408';ctx.fillRect(p.x-22,p.y-62,44,16);ctx.strokeStyle='#ffd34d';ctx.lineWidth=1.5;ctx.strokeRect(p.x-22,p.y-62,44,16);ctx.lineWidth=1;ctx.fillStyle='#ffd34d';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(lv>=3?'參品・圓滿':'貳品・精進',p.x,p.y-50);}
