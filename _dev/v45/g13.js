
// ================== v0.4.5：可重複挑戰的副本（獨立小地圖、波次、首領） ==================
VS.dgate={s:2,name:'副本入口'};
const DGS={
  cave:{n:'妖獸洞窟',mobs:['wolf','wolf','boar','tiger'],boss:'king',bossN:'洞窟妖王',col:'#c07a3a',fl:['#4a3e32','#41372b'],wl:['#2a2018','#3a2e22','#5a4838'],desc:'妖獸盤踞的山洞，常有獸皮、獸骨、妖丹與靈芝'},
  jail:{n:'山賊地牢',mobs:['bandit','bandit','bandit','chief'],boss:'warden',bossN:'地牢牢頭',col:'#c04a3a',fl:['#4a4440','#423c38'],wl:['#2a2624','#3a3430','#585048'],desc:'山賊關押肉票的地牢，鐵礦、靈石與兵器不少'},
  ruin:{n:'上古遺跡秘境',mobs:['golem','wisp','wisp'],boss:'king',bossN:'守陵石將',col:'#8a6aff',fl:['#3e4048','#383a42'],wl:['#22242c','#30323c','#4a4c5a'],desc:'上古修士的遺跡，可能藏有玄鐵、丹方、甚至功法'},
  xf:{n:'仙凡之門',mobs:['xfguard','wisp','golem','xfguard'],boss:'xfboss',bossN:'守門天將',col:'#ffd34d',fl:['#4a4030','#40382a'],wl:['#2a2418','#3a3222','#6a5a38'],desc:'凡人修士叩問仙途的試煉之門，九死一生。闖過可得「仙凡令」——突破煉氣的必需品',xf:true}
};
const DG_ORDER=['cave','jail','ruin','xf'];
const DG_CELL=30,DGN=4*DG_CELL+2,DGO=2; // 副本地圖大小與偏移（v0.4.7 #18/#41/#84：格子 24→30，房間放大約 2.5 倍面積）
function dgRoomWH(boss){return boss?[22,22]:[ri(14,20),ri(14,20)];}
function dgAreaK(r){return clamp(Math.sqrt((r.w*r.h)/121),1,1.6);}
{const _gw=genWorld;genWorld=function(seed){_gw(seed);placeGates(seed);};}
function placeGates(seed){const r=mulberry32(seed^0x77d9);const A=ANCH;
  const spots={cave:{x:(A.start.x+A.chilang.x)/2+4,y:(A.start.y+A.chilang.y)/2},jail:{x:(A.start.x+A.heifeng.x)/2,y:(A.start.y+A.heifeng.y)/2+6},ruin:{x:A.ruin.x-9,y:A.ruin.y-7},xf:{x:A.lake.x+8,y:A.lake.y+9}};
  const free=(i,j)=>{for(let y=j-1;y<j+3;y++)for(let x=i-1;x<i+3;x++){if(!inMap(x,y))return false;const k=y*N+x;if(block[k]||roadMask[k])return false;const t=terrain[k];if(t===T.WATER||t===T.SHALLOW||t===T.CLIFF||t===T.RUIN)return false;}return comp[j*N+i]===startComp;};
  for(const k of DG_ORDER){const s=spots[k];let done=false;
    for(let rad=0;rad<26&&!done;rad++)for(let t=0;t<16&&!done;t++){const a=r()*Math.PI*2;const i=Math.round(s.x+Math.cos(a)*rad),j=Math.round(s.y+Math.sin(a)*rad);if(free(i,j)){S.vstructs.push({id:9000+DG_ORDER.indexOf(k),vid:0,type:'dgate',kind:k,i,j,s:2});done=true;}}
    if(!done){const s2={x:A.start.x-14,y:A.start.y+12};for(let rad=0;rad<45&&!done;rad++)for(let t=0;t<24&&!done;t++){const a2=r()*Math.PI*2;const i=Math.round(s2.x+Math.cos(a2)*rad),j=Math.round(s2.y+Math.sin(a2)*rad);if(free(i,j)&&!S.vstructs.some(v=>v.type==='dgate'&&Math.abs(v.i-i)+Math.abs(v.j-j)<10)){S.vstructs.push({id:9000+DG_ORDER.indexOf(k),vid:0,type:'dgate',kind:k,i,j,s:2});done=true;}}}}
  rebuildBlock();const st=nearestFree(A.start.x,A.start.y,-1);if(st)startComp=comp[st.j*N+st.i];}
function gates(){return S.vstructs.filter(s=>s.type==='dgate');}
{const _ds=drawStruct;drawStruct=function(o){if(o.type!=='dgate')return _ds(o);const G=DGS[o.kind],i=o.i,j=o.j,t=performance.now()/600;
  prism(i+0.1,j+0.1,i+1.9,j+1.9,0,4,'#5a5450','#6e6864','#8a847a');
  prism(i+0.2,j+0.8,i+0.5,j+1.2,4,34,'#4a4440','#5e5854',null);prism(i+1.5,j+0.8,i+1.8,j+1.2,4,34,'#4a4440','#5e5854',null);
  const a=P(i+0.35,j+1,38),b=P(i+1.65,j+1,38);ctx.strokeStyle='#3a3430';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-14,b.x,b.y);ctx.stroke();ctx.lineWidth=1;
  const c=P(i+1,j+1,18);const cd=(S.dgCd[o.kind]||0)>S.time;const g=ctx.createRadialGradient(c.x,c.y,2,c.x,c.y,16);g.addColorStop(0,cd?'rgba(120,120,120,0.6)':'rgba(255,255,255,0.95)');g.addColorStop(1,cd?'rgba(60,60,60,0)':G.col+'00');
  ctx.fillStyle=cd?'rgba(80,80,80,0.5)':G.col;ctx.globalAlpha=0.55+0.2*Math.sin(t);ctx.beginPath();ctx.ellipse(c.x,c.y,9,15,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(c.x,c.y,8,14,0,0,Math.PI*2);ctx.fill();
  label(G.n+(cd?`（${Math.ceil(S.dgCd[o.kind]-S.time)}秒）`:''),c.x,c.y-30,G.xf?'#ffe27a':'#f0e0ff',G.xf?'bold 11px sans-serif':'bold 10px sans-serif');
  if(selOther&&selOther.k==='s'&&selOther.id===o.id)diamond(i,j,2,null,'#ffe27a');};}
function dgTier(kind,hard){const p=player();if(kind==='xf')return 3+(hard?1:0);return clamp((p?p.realm:0)+(hard?1:0),0,6);}
function dgatePanel(o){const G=DGS[o.kind],p=player(),cd=(S.dgCd[o.kind]||0)-S.time;const ds=disciples().filter(u=>!u.dead);const sel=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple');const fol=ds.filter(u=>u.job==='follow');
  const lock=G.xf&&p&&p.realm<3;
  return `<h4>${G.n}<span class="tag" style="background:${G.col}">副本</span>${G.xf?'<span class="tag" style="background:#ff6a5a">九死一生</span>':''}</h4><div class="mini">${G.desc}</div>
  <div class="pdesc">難度依你的境界：${REALMS[dgTier(o.kind,false)].n}級（困難：${REALMS[Math.min(7,dgTier(o.kind,true))].n}級）。可帶任意人數的弟子；人越多敵人越多。中途撤離可保住戰利品，你倒下則全隊被傳出、戰利品全失。${G.xf?'<b style="color:#ff9a7a">仙凡之門是為宗師準備的生死試煉：精英守衛＋試煉王（天雷範圍攻擊、召喚援兵），弟子倒下有可能真的隕落。</b>':''}</div>
  ${lock?'<div class="no">✖ 你需達到「宗師」才能叩問仙凡之門</div>':cd>0?`<div class="no">冷卻中：${Math.ceil(cd)} 秒</div>`:`<div class="jobs"><button class="btn pri" data-act="dgo" data-k="${o.kind}" data-p="all">帶全部弟子（${ds.length}）</button><button class="btn" data-act="dgo" data-k="${o.kind}" data-p="sel">帶選取／跟隨的（${new Set(sel.concat(fol)).size}）</button><button class="btn" data-act="dgo" data-k="${o.kind}" data-p="solo">獨自進入</button><button class="btn warn" data-act="dgo" data-k="${o.kind}" data-p="all" data-h="1">困難＋全員</button></div>`}
  <div class="phint">通關次數 ${S.dgClears||0}　你須走到入口旁（3 格內）才能進入</div>`;}
// ---- 進入／離開 ----
function xfBagSnap(){
  const ids={};
  const mark=it=>{if(it&&it.id!=null)ids[it.id]=1;};
  try{(S.inv||[]).forEach(mark);}catch(e){}
  try{(S.units||[]).forEach(u=>{if(!u||!u.eq)return;for(const k in u.eq)mark(u.eq[k]);});}catch(e2){}
  return {res:dgClone(S.res),mats:dgClone(S.mats),items:dgClone(S.items),inv:dgClone(S.inv||[]),pills:S.pills?dgClone(S.pills):null,ids:ids};
}
function xfBagRestore(bag){
  if(!bag||!bag.res||!bag.items)return false;
  S.res=dgClone(bag.res);S.mats=dgClone(bag.mats||{});S.items=dgClone(bag.items);S.inv=dgClone(bag.inv||[]);
  if(bag.pills)S.pills=dgClone(bag.pills);
  const ids=bag.ids||{};
  for(const u of (S.units||[])){
    if(!u||!u.eq)continue;
    for(const k in u.eq){const it=u.eq[k];if(it&&it.id!=null&&!ids[it.id])u.eq[k]=null;}
  }
  return true;
}
function dgEnter(kind,mode,hard){const p=player();if(!p||p.dead||S.dg||S.interior)return false;const G=DGS[kind];
  if(G.xf&&p.realm<3){toast('你需達到「宗師」才能叩問仙凡之門');return false;}
  if((S.dgCd[kind]||0)>S.time){toast('入口的靈氣尚未平復（冷卻中）');return false;}
  const g=gates().find(s=>s.kind===kind);if(g&&distRect(p.x,p.y,g.i,g.j,2)>3){setTask(p,{type:'move',x:g.i+1,y:g.j+2.6});pathTo(p,g.i+1,g.j+2.6);toast('先走到副本入口旁，再按一次進入');return false;}
  let party=[];const ds=disciples().filter(u=>!u.dead);
  if(mode==='all')party=ds;else if(mode==='sel'){const s=new Set(selUnits);party=ds.filter(u=>s.has(u.id)||u.job==='follow');}
  const pre=snapshot();
  const W={units:S.units,enemies:S.enemies,npcs:S.npcs,wand:S.wand,cands:S.cands,buildings:S.buildings,vstructs:S.vstructs,raids:S.raidsActive,proj:projectiles,eff:effects,
    block:block.slice(),comp:comp.slice(),occ:occ.slice(),ng:nodeGrid.slice(),exp:explored.slice(),startComp,cam:{x:cam.x,y:cam.y,zoom:cam.zoom},time:S.time,buildMode};
  for(const u of [p,...party]){if(u.inside)exitBuilding(u);u.dgSave={x:u.x,y:u.y,job:u.job,jobB:u.jobB,jobRes:u.jobRes,guardAt:u.guardAt,holdAt:u.holdAt,aiJob:u.aiJob};u.task=null;u.path=[];u.carry=null;u.medit=false;if(u!==p){u.job='follow';u.jobB=null;u.aiJob=null;}}
  const L=genDungeon(kind);
  block.set(L.block);occ.fill(null);nodeGrid.fill(null);explored.fill(1);computeComp();
  S.units=[p,...party];S.enemies=[];S.npcs=[];S.wand=[];S.cands=[];S.buildings=[];S.vstructs=[];S.raidsActive=[];projectiles=[];effects=[];buildMode=null;
  const st=L.rooms[0];startComp=comp[Math.floor(st.cy)*N+Math.floor(st.cx)];
  S.units.forEach((u,k)=>{const f=nearestFree(st.cx+(k%5-2)*0.7,st.cy+Math.floor(k/5)*0.7-1,-1)||{i:Math.floor(st.cx),j:Math.floor(st.cy)};u.x=f.i+0.5;u.y=f.j+0.5;u.vx=u.vy=0;});
  S.dg={kind,hard:!!hard,tier:dgTier(kind,hard),L,W,pre,loot:{res:{},mats:{},items:[],misc:{}},t:0,room:0,cleared:false,end:null,ent:{x:st.cx,y:st.cy-1.4},armed:false,party:S.units.length,boss:null,mech:{t:5,marks:[]},summon:[0.7,0.4],queue:[],down:0,lost:0};
  if(kind==='xf')S.dg.bag0=xfBagSnap();
  const q=iso(p.x,p.y);cam.x=q.x;cam.y=q.y;cam.follow=true;selUnits=[p.id];selBuilding=null;selOther=null;panelKeyCache=null;
  toast(`進入「${G.n}」${hard?'（困難）':''}！帶了 ${party.length} 名弟子。走進每個房間會引出敵人，打倒最深處的首領即可通關`);
  document.body.classList.add('indg');return true;}
function genDungeon(kind){const bl=new Uint8Array(N*N).fill(1),fl=new Uint8Array(N*N);const G=DGS[kind];
  const nR=kind==='xf'?5:ri(4,6),cell=DG_CELL;let cx=0,cy=ri(0,3);const vis={};const rooms=[];
  for(let k=0;k<=nR;k++){vis[cx+','+cy]=1;const boss=k===nR;const [w,h]=dgRoomWH(boss);const x0=DGO+cx*cell+Math.floor((cell-w)/2),y0=DGO+cy*cell+Math.floor((cell-h)/2);
    rooms.push({x0,y0,w,h,cx:x0+w/2,cy:y0+h/2,boss,k,state:k===0?'clear':'idle'});
    const nb=[[1,0],[0,1],[0,-1],[-1,0]].filter(([a,b])=>{const x=cx+a,y=cy+b;return x>=0&&y>=0&&x<4&&y<4&&!vis[x+','+y]&&[[1,0],[0,1],[0,-1],[-1,0]].some(([c,d])=>!vis[(x+c)+','+(y+d)]&&x+c>=0&&y+d>=0&&x+c<4&&y+d<4||k===nR-1);});
    if(k<nR){const c=nb.length?pick(nb.slice(0,Math.max(1,nb.length))):[[1,0],[0,1],[0,-1],[-1,0]].find(([a,b])=>{const x=cx+a,y=cy+b;return x>=0&&y>=0&&x<4&&y<4&&!vis[x+','+y];})||[1,0];cx=clamp(cx+c[0],0,3);cy=clamp(cy+c[1],0,3);if(vis[cx+','+cy]){for(let t=0;t<16;t++){const x=t%4,y=t>>2;if(!vis[x+','+y]){cx=x;cy=y;break;}}}}}
  const carve=(i,j)=>{if(i<1||j<1||i>=N-1||j>=N-1)return;bl[j*N+i]=0;fl[j*N+i]=1;};
  for(const r of rooms)for(let j=r.y0;j<r.y0+r.h;j++)for(let i=r.x0;i<r.x0+r.w;i++)carve(i,j);
  for(let k=1;k<rooms.length;k++){const a=rooms[k-1],b=rooms[k];let x=Math.floor(a.cx),y=Math.floor(a.cy);const tx=Math.floor(b.cx),ty=Math.floor(b.cy);
    const _digOk=Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(tx)&&Number.isFinite(ty);
    const _digCap=(typeof N==='number'?N:64)*2+16; let _digN=0;
    while(_digOk&&x!==tx&&_digN++<_digCap){const dx=Math.sign(tx-x);if(!dx)break;carve(x,y-1);carve(x,y);carve(x,y+1);x+=dx;}
    while(_digOk&&y!==ty&&_digN++<_digCap){const dy=Math.sign(ty-y);if(!dy)break;carve(x-1,y);carve(x,y);carve(x+1,y);y+=dy;}
    carve(x-1,y);carve(x,y);carve(x+1,y);}
  // 房間裡的石柱（隨機）
  for(const r of rooms)if(!r.boss&&r.k>0)for(let t=0,nt=Math.round(3*dgAreaK(r)*dgAreaK(r));t<nt;t++)if(rnd()<0.6){const i=r.x0+ri(2,r.w-3),j=r.y0+ri(2,r.h-3);if(Math.abs(i-r.cx)>1.5||Math.abs(j-r.cy)>1.5){bl[j*N+i]=1;fl[j*N+i]=2;}}
  return {block:bl,fl,rooms,kind};}
function dgPartyScale(){const n=S.dg.party;return S.dg.kind==='xf'?1+0.45*(n-1):1+0.3*(n-1);}
function dgSpawnRoom(r){const D=S.dg,G=DGS[D.kind];r.state='fight';
  if(r.boss){const bt=G.boss,bx=r.cx,by=r.cy;const e=dgMob(bt,bx,by,true);e.dgName=G.bossN;D.boss=e.id;
    const ad=Math.round((D.kind==='xf'?4:2)*Math.sqrt(dgPartyScale()));for(let k=0;k<ad;k++)D.queue.push({t:pick(G.mobs),r});
    toast(`首領「${G.bossN}」現身！`);}
  else{const n=Math.round((2+r.k*0.6+D.tier*0.2)*1.25*dgPartyScale()*(D.hard?1.3:1)*Math.min(1.12,dgAreaK(r)));for(let k=0;k<n;k++)D.queue.push({t:pick(G.mobs),r});}
  dgFlush();}
function dgMob(t,x,y,boss){const D=S.dg;const f=nearestFree(x,y,-1);const e=makeEnemy(t,f?f.i+0.5:x,f?f.j+0.5:y,{realm:Math.min(6,D.tier)});e.leash=60;e.aggro=boss?14:9;e.home={x:e.x,y:e.y};
  const n=D.party;if(D.kind==='xf'){const m=boss?1+0.4*(n-1):1+0.2*(n-1);e.maxhp=e.hp=Math.round(e.hp*m);}else if(boss){e.maxhp=e.hp=Math.round(e.hp*(1+0.25*(n-1)));}
  if(D.hard){e.maxhp=e.hp=Math.round(e.hp*1.3);e.atk=+(e.atk*1.15).toFixed(1);}
  S.enemies.push(e);return e;}
const DG_ALIVE_CAP=26;
function dgFlush(){const D=S.dg;while(D.queue.length&&S.enemies.length<DG_ALIVE_CAP){const q=D.queue.shift(),r=q.r;const e=dgMob(q.t,r.x0+0.5+rnd()*(r.w-1),r.y0+0.5+rnd()*(r.h-1),false);}}
function dgRoomOf(x,y){for(const r of S.dg.L.rooms)if(x>=r.x0-0.2&&x<=r.x0+r.w+0.2&&y>=r.y0-0.2&&y<=r.y0+r.h+0.2)return r;return null;}
function dgKill(src,e){const D=S.dg;e.dead=true;const idx=S.enemies.indexOf(e);if(idx>=0)S.enemies.splice(idx,1);S.stats.kills++;const ED=ENEMY[e.type];
  const xv=Math.round(ED.xiu*(1+e.realm*0.5));if(src&&src.kind)gainXiu(src,xv);for(const u of S.units)if(u!==src&&!u.dead&&dist(u.x,u.y,e.x,e.y)<6)gainXiu(u,Math.round(xv*0.3));
  if(ED.food)dgAdd('res','food',Math.ceil(ED.food/2),e);if(ED.human)dgAdd('res','iron',2+e.realm,e);if(rnd()<0.35)dgAdd('res','lingshi',1+Math.floor(e.realm/2),e);
  rollDrops(e,(k,a,b)=>{if(k==='m')dgAdd('mats',a,b,e);else{const it=makeItem(a,b,rnd()<0.35?ri(0,4):-1);D.loot.items.push(it);floater(e.x,e.y,'獲得 '+itemName(it),QC[it.q]);}});
  if(D.boss===e.id)dgBossDown(e);}
function dgAdd(cat,k,n,e){const L=S.dg.loot[cat];L[k]=(L[k]||0)+n;if(e)floater(e.x,e.y-0.2,`+${n} ${cname(k)}`,'#e8d0ff');}
function dgBossDown(e){const D=S.dg,h=D.hard?1.5:1,K=D.kind;D.cleared=true;D.boss=null;D.queue=[];
  const add=(c,k,n)=>dgAdd(c,k,Math.max(1,Math.round(n*h)));
  if(K==='cave'){add('res','herb',ri(10,20));add('mats','hide',ri(3,6));add('mats','core',2);if(rnd()<0.5)add('mats','lingzhi',1);if(rnd()<0.25)D.loot.misc.rec=(D.loot.misc.rec||0)+1;}
  if(K==='jail'){add('res','iron',ri(15,30));add('res','lingshi',ri(5,10));D.loot.items.push(makeItem(pick(GEAR_ORDER.slice(0,8)),Math.min(4,1+(rnd()<0.4?1:0)+(D.hard?1:0)),rnd()<0.5?ri(0,4):-1));if(rnd()<0.2)D.loot.misc.miji=1;}
  if(K==='ruin'){add('mats','xuantie',1);add('res','lingshi',ri(10,20));if(rnd()<0.25)D.loot.misc.gongfa=1;if(rnd()<0.4)D.loot.misc.rec=(D.loot.misc.rec||0)+1;add('mats','lingzhi',1);}
  if(K==='xf'){D.loot.misc.xfl=1;D.loot.misc.gongfa=1;add('res','lingshi',30);add('mats','xuantie',2);add('mats','lingzhi',2);}
  const br=D.L.rooms[D.L.rooms.length-1];D.exitP={x:br.cx,y:br.cy};D.xpAsk=0;
  try{const f=(typeof nearestFree==='function')?nearestFree(br.cx,br.cy,-1):null;if(f){const ii=f.i,jj=f.j;if(ii>=br.x0&&ii<br.x0+br.w&&jj>=br.y0&&jj<br.y0+br.h)D.exitP={x:ii+0.5,y:jj+0.5};}}catch(e){}
  toast(`擊敗「${DGS[K].bossN}」！${K==='xf'?'仙凡之門開啟，取得「仙凡令」！':''}走進中央的傳送陣即可帶著戰利品離開`);fx('break',e.x,e.y,'#ffe27a');}
function dgDown(u){const D=S.dg;if(!D||D.end)return;
  if(u.kind==='player'){u.hp=1;D.end='fail';return;}
  S.units=S.units.filter(x=>x!==u);selUnits=selUnits.filter(id=>id!==u.id);for(const w of S.enemies)if(w.target&&w.target.id===u.id)w.target=null;D.down++;
  if(D.kind==='xf'&&rnd()<0.4){D.W.units=D.W.units.filter(x=>x!==u);D.lost++;toast(`弟子「${u.name}」在仙凡之門中隕落……`);}
  else{u.hp=1;u.dgHurt=true;toast(`弟子「${u.name}」重傷，被傳送出副本`);}}
function dgExit(keep){const D=S.dg;if(!D)return;const W=D.W,p=player();
  for(const u of W.units){const s=u.dgSave;if(!s)continue;Object.assign(u,{x:s.x,y:s.y,job:s.job,jobB:s.jobB,jobRes:s.jobRes,guardAt:s.guardAt,holdAt:s.holdAt,aiJob:s.aiJob});u.dgSave=null;u.dgHurt=false;u.task=null;u.path=[];u.vx=u.vy=0;u.dash=null;u.hp=Math.max(1,u.hp);u.lastHit=W.time;}
  Object.assign(S,{units:W.units,enemies:W.enemies,npcs:W.npcs,wand:W.wand,cands:W.cands,buildings:W.buildings,vstructs:W.vstructs,raidsActive:W.raids,time:W.time});
  projectiles=W.proj;effects=W.eff;block.set(W.block);comp.set(W.comp);for(let k=0;k<N*N;k++){occ[k]=W.occ[k];nodeGrid[k]=W.ng[k];}explored.set(W.exp);startComp=W.startComp;
  cam.x=W.cam.x;cam.y=W.cam.y;cam.zoom=W.cam.zoom;cam.follow=true;S.dg=null;document.body.classList.remove('indg');
  S.dgCd[D.kind]=S.time+TUNE.dgCooldown;selUnits=p?[p.id]:[];selOther=null;panelKeyCache=null;
  const xfFail=D.kind==='xf'&&!D.cleared;
  if(xfFail){
    if(D.bag0)xfBagRestore(D.bag0);
    else try{toast('仙凡之門這次沒有入場物品快照，已拒絕結算本次戰利品；入場前已在身上的東西不會整包清掉');}catch(e){}
  }
  let got=[];if(keep&&!xfFail){const L=D.loot;for(const k in L.res){S.res[k]+=L.res[k];got.push(cname(k)+' '+L.res[k]);}for(const k in L.mats){S.mats[k]+=L.mats[k];got.push(cname(k)+' '+L.mats[k]);}
    for(const it of L.items){addItem(it);got.push(itemName(it));}
    if(L.misc.miji){S.items.miji+=L.misc.miji;got.push('武學秘籍');}if(L.misc.gongfa){S.items.gongfa+=L.misc.gongfa;got.push('功法');}if(L.misc.xfl){S.items.xfl=(S.items.xfl||0)+1;got.push('仙凡令');}
    for(let k=0;k<(L.misc.rec||0);k++)if(learnRecipe(null,'副本殘頁'))got.push('丹方');
    if(D.cleared)S.dgClears=(S.dgClears||0)+1;
    toast(`離開「${DGS[D.kind].n}」${D.cleared?'（通關）':'（撤離）'}：${got.length?got.slice(0,8).join('、')+(got.length>8?'…':''):'沒有戰利品'}`);}
  else toast(`全隊被傳送出「${DGS[D.kind].n}」……戰利品全部失去${D.lost?`，${D.lost} 名弟子隕落`:''}`);
  S.dgLast={kind:D.kind,cleared:D.cleared,keep,got:got.length,down:D.down,lost:D.lost,t:D.t};
  if(p)p.hp=Math.max(p.hp,keep?p.hp:Math.ceil(p.maxhp*0.2));autoSaveSoon('副本');}
function dgRetreat(){const D=S.dg;if(!D)return;const p=player();if(p&&nearestEnemy(p.x,p.y,5)&&!D.cleared){toast('敵人就在身邊，無法撤離（先拉開距離）');return;}dgExit(true);}
function dgClone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
const DG_SNAP_KEYS=['cultBrk','cultYS','cultWound','cultWeak','cultZouhuo','cultComa','cultYSGone','xiu','realm','sub','hp','maxhp','dead','respawn','eq','combatExp','diyun','dandu','danduClear','_cultDanduRef','cultRevivePill','cultTreasure','cultFabao','cultTribPill','qi','qiMax'];
function dgMergeSnapProgress(pre,includeLoot=true){
  if(!pre||typeof S==='undefined'||!S||!S.dg)return pre;
  try{
    const cur={};if(S.units)for(const u of S.units)if(u&&u.id!=null)cur[u.id]=u;
    if(pre.units)for(const o of pre.units){const u=cur[o.id];if(!u)continue;for(const k of DG_SNAP_KEYS){if(u[k]===undefined)continue;o[k]=(u[k]&&typeof u[k]==='object')?dgClone(u[k]):u[k];}}
    if(S.items)pre.items=dgClone(S.items);
    pre.v45=pre.v45||{};
    if(S.inv)pre.v45.inv=dgClone(S.inv);
    // Pending dungeon/ground equipment also consumed IDs since entry.
    pre.v45.nextItem=Math.max(pre.v45.nextItem||1,S.nextItem||1);
    if(S.mats)pre.v45.mats=dgClone(S.mats);
    if(S.pills)pre.v45.pills=dgClone(S.pills);
    const L=includeLoot?S.dg.loot:null;
    if(L){
      pre.res=pre.res||{};
      for(const k in (L.res||{}))pre.res[k]=(pre.res[k]||0)+(L.res[k]||0);
      pre.v45.mats=pre.v45.mats||{};
      for(const k in (L.mats||{}))pre.v45.mats[k]=(pre.v45.mats[k]||0)+(L.mats[k]||0);
      if(L.items&&L.items.length)pre.v45.inv=(pre.v45.inv||[]).concat(dgClone(L.items));
      if(L.misc){pre.items=pre.items||{};if(L.misc.miji)pre.items.miji=(pre.items.miji||0)+L.misc.miji;if(L.misc.gongfa)pre.items.gongfa=(pre.items.gongfa||0)+L.misc.gongfa;if(L.misc.xfl)pre.items.xfl=(pre.items.xfl||0)+L.misc.xfl;}
    }
    pre.dgProgress={kind:S.dg.kind,cleared:!!S.dg.cleared,t:S.dg.t,down:S.dg.down||0,lost:S.dg.lost||0,loot:L?dgClone(L):null};
  }catch(e){}
  return pre;
}
// Full solo runtime capsule. Never serialize W (contains circular live references).
function dgPersist(v){
  if(typeof xmapSafeClone==='function')return xmapSafeClone(v);
  const seen=new WeakSet();return JSON.parse(JSON.stringify(v,(k,o)=>{if(k==='target')return null;if(o&&typeof o==='object'){if(seen.has(o))return;seen.add(o);}return o;}));
}
function dgValidateLive(d){
  const o=d&&d.dg,live=o&&o.live;if(!live)return true;
  if(live.fmt!==1||!Array.isArray(live.units)||!live.units.some(u=>u&&u.kind==='player')||!Array.isArray(live.enemies)||!o.L||!Array.isArray(o.L.rooms)||!o.L.block||o.L.block.length!==N*N||!o.L.fl||o.L.fl.length!==N*N)throw Error('副本存檔不完整');
  for(const u of [...live.units,...live.enemies])if(!u||!Number.isFinite(u.x)||!Number.isFinite(u.y)||u.x<0||u.y<0||u.x>=N||u.y>=N)throw Error('副本座標不符');
  for(const u of live.units)if(u.dgSave&&(!Number.isFinite(u.dgSave.x)||!Number.isFinite(u.dgSave.y)||u.dgSave.x<0||u.dgSave.y<0||u.dgSave.x>=N||u.dgSave.y>=N))throw Error('副本返回座標不符');
  if(live.time!=null&&!Number.isFinite(live.time))throw Error('副本時間不符');
  for(const q of (o.queue||[]))if(!Number.isInteger(q.room)||q.room<0||q.room>=o.L.rooms.length)throw Error('副本隊列不符');
  for(const e of live.enemies)if(!e.type||!ENEMY[e.type])throw Error('副本敵人資料不符');
  return true;
}
function dgRestoreLive(D,d){
  const live=D&&D.live;if(!live||live.fmt!==1||!Array.isArray(live.units)||!D.L||!D.L.block||D.L.block.length!==N*N)throw Error('副本存檔不完整');
  const W={units:S.units,enemies:S.enemies,npcs:S.npcs,wand:S.wand,cands:S.cands,buildings:S.buildings,vstructs:S.vstructs,raids:S.raidsActive,proj:projectiles,eff:effects,
    block:block.slice(),comp:comp.slice(),occ:occ.slice(),ng:nodeGrid.slice(),exp:explored.slice(),startComp,cam:{x:cam.x,y:cam.y,zoom:cam.zoom},time:S.time,buildMode};
  const by=new Map(W.units.map(u=>[u.id,u]));
  const party=live.units.map(o=>{let u=by.get(o.id);if(!u){u=o.kind==='player'?makePlayer(o.x,o.y):makeDisciple(o.x,o.y,o.body);W.units.push(u);}return Object.assign(u,o,{path:[],target:null,vx:0,vy:0,dvx:0,dvy:0});});
  if(!party.some(u=>u.kind==='player'))throw Error('副本缺少角色');
  // Repair counters in older capsules without modifying their original record.
  const pending=D.loot&&D.loot.items,ground=d&&d.econ&&d.econ.groundGear;
  const reserve=it=>{if(it&&Number.isSafeInteger(it.id)&&it.id>=0)S.nextItem=Math.max(S.nextItem||1,it.id+1);};
  if(Array.isArray(pending))for(const it of pending)reserve(it);
  if(Array.isArray(ground))for(const drop of ground)reserve(drop&&drop.item);
  D.W=W;D.pre=dgClone(d);delete D.pre.dg;delete D.pre.dgArea;
  S.units=party;S.enemies=(live.enemies||[]).map(o=>Object.assign(makeEnemy(o.type,o.x,o.y),o,{path:[],target:null}));
  S.npcs=[];S.wand=[];S.cands=[];S.buildings=[];S.vstructs=[];S.raidsActive=[];projectiles=[];effects=[];buildMode=null;
  block.set(D.L.block);occ.fill(null);nodeGrid.fill(null);explored.fill(1);computeComp();
  if(Number.isFinite(live.time))S.time=live.time;
  const p=player();startComp=comp[Math.floor(p.y)*N+Math.floor(p.x)];
  D.queue=(D.queue||[]).map(q=>({...q,r:D.L.rooms[q.room]})).filter(q=>q.r);delete D.live;
  if(live.cam){cam.x=live.cam.x;cam.y=live.cam.y;cam.zoom=live.cam.zoom;}cam.follow=true;
}
function dgToSave(D){
  if(!D)return null;
  const o={kind:D.kind,hard:!!D.hard,tier:D.tier,t:D.t,cleared:!!D.cleared,loot:dgClone(D.loot),party:D.party,runId:D.runId,_map:!!D._map,
    mapType:D.mapType,end:D.end,armed:!!D.armed,down:D.down,lost:D.lost,ent:dgClone(D.ent),exitP:dgClone(D.exitP),exitOpen:!!D.exitOpen,forceBoss:!!D.forceBoss,bag0:D.bag0?dgClone(D.bag0):null};
  if(!(typeof mapDgAreaCoopLive==='function'&&mapDgAreaCoopLive())){o.live={fmt:1,units:dgPersist(S.units),enemies:dgPersist(S.enemies),time:S.time,cam:{x:cam.x,y:cam.y,zoom:cam.zoom}};o.room=D.room;o.boss=D.boss;o.mech=dgPersist(D.mech);o.summon=dgPersist(D.summon);o.queue=(D.queue||[]).map(q=>({t:q.t,room:D.L.rooms.indexOf(q.r)}));}
  if(D.L){o.L={rooms:dgClone(D.L.rooms||[]),kind:D.L.kind,fl:D.L.fl?Array.from(D.L.fl):null,block:D.L.block?Array.from(D.L.block):null};}
  return o;
}
function dgFromSave(o){
  if(!o)return null;
  const D=dgClone(o);
  if(D.L){if(D.L.fl&&!(D.L.fl instanceof Uint8Array))D.L.fl=Uint8Array.from(D.L.fl);if(D.L.block&&!(D.L.block instanceof Uint8Array))D.L.block=Uint8Array.from(D.L.block);}
  D.mech=D.mech||{marks:[],t:9};D.queue=(D.queue||[]).map(q=>({...q,r:D.L&&D.L.rooms&&D.L.rooms[Number.isInteger(q.room)?q.room:(q.r&&q.r.k)]})).filter(q=>q.r);D.loot=D.loot||{res:{},mats:{},items:[],misc:{}};
  return D;
}
{const _sn=snapshot;snapshot=function(){
  if(S&&S.dg){
    let pre;
    const foldLoot=typeof mapDgAreaCoopLive==='function'&&mapDgAreaCoopLive()&&!(S.dg&&S.dg.kind==='xf');
    if(S.dg.pre)pre=dgMergeSnapProgress(dgClone(S.dg.pre),foldLoot);
    else{
      const hold=S.dg;S.dg=null;
      try{pre=_sn();}finally{S.dg=hold;}
      try{dgMergeSnapProgress(pre,foldLoot);}catch(e){}
    }
    try{if(pre)pre.dg=dgToSave(S.dg);}catch(e){}
    return pre;
  }
  return _sn();
};}
{const _as=applySave;applySave=function(d){
  try{dgValidateLive(d);}catch(e){toast('讀檔失敗：'+e.message+'；目前進度與原存檔未更動。');return false;}
  const r=_as.apply(this,arguments);
  try{
    if(r&&d&&d.dg){
      S.dg=dgFromSave(d.dg);
      if(!d.dgArea&&!(typeof mapDgAreaCoopContext==='function'&&mapDgAreaCoopContext(d))){
        if(d.dg.live)dgRestoreLive(S.dg,d);
        else{S.dg=null;toast('這份舊存檔未保留完整副本現場，已回到副本前的宗門進度；原存檔仍保留，請勿覆蓋備份。');}
      }
      try{if(S.dg&&document.body)document.body.classList.add('indg');else document.body.classList.remove('indg');}catch(e){}
    }
    else if(r){try{if(document.body)document.body.classList.remove('indg');}catch(e){}}
  }catch(e){toast('副本讀檔失敗：'+e.message+'；原存檔仍保留。');return false;}
  return r;
};}
// ---- 每幀更新（世界暫停） ----
function dgUpdate(dt){const D=S.dg;S.time+=dt;D.t+=dt;
  ALL=[];for(const u of S.units)if(!u.dead)ALL.push(u);for(const e of S.enemies)ALL.push(e);nbBuild(ALL);
  const ct={x:-999,y:-999};
  for(const u of S.units.slice())updateUnit(u,dt);
  for(const e of S.enemies.slice())updateEnemy(e,dt,{x:e.x,y:e.y});
  nbBuild(ALL);separate(ALL);updateProjectiles(dt);
  for(const f of effects)f.t+=dt;effects=effects.filter(f=>f.t<f.dur);
  for(const f of floaters)f.t+=dt;floaters=floaters.filter(f=>f.t<1.4);for(const m of markers)m.t+=dt;markers=markers.filter(m=>m.t<0.9);
  const p=player();if(!p||p.dead){D.end='fail';}
  if(!D.end&&p){const r=dgRoomOf(p.x,p.y);if(r&&r.state==='idle')dgSpawnRoom(r);
    for(const rr of D.L.rooms)if(rr.state==='fight'&&!S.enemies.some(e=>dgRoomOf(e.home.x,e.home.y)===rr)&&!D.queue.some(q=>q.r===rr)){rr.state='clear';if(!rr.boss)floater(rr.cx,rr.cy,'清除！','#9fe8b0');}
    dgFlush();dgBoss(dt);
    if(dist(p.x,p.y,D.ent.x,D.ent.y)>3)D.armed=true;else if(D.armed&&dist(p.x,p.y,D.ent.x,D.ent.y)<1.1){D.armed=false;if(typeof x47DgExitAsk==='function')x47DgExitAsk('ent');else{dgExit(true);return;}}
    // v0.4.7 #122：走上撤離陣／出口傳送陣先跳確認（離開 2.5 格後可再次觸發）
    if(D.exitP){const de=dist(p.x,p.y,D.exitP.x,D.exitP.y);if(de<1.2&&!D.xpAsk){D.xpAsk=1;if(typeof x47DgExitAsk==='function')x47DgExitAsk('portal');else{dgExit(true);return;}}else if(de>2.5)D.xpAsk=0;}}
  if(D.end==='fail'){dgExit(false);}}
function dgBoss(dt){const D=S.dg;const b=D.boss!=null?enemyById(D.boss):null;const M=D.mech;
  for(const m of M.marks){m.t-=dt;if(m.t<=0&&!m.done){m.done=true;fx('boom',m.x,m.y,'#ffe27a');for(const u of S.units.slice())if(!u.dead&&dist(u.x,u.y,m.x,m.y)<m.r)dmgUnit(b||{type:'xfboss'},u,m.dmg);}}
  M.marks=M.marks.filter(m=>m.t>-0.4);
  if(!b)return;M.t-=dt;const xf=D.kind==='xf';
  if(M.t<=0){M.t=xf?6:9;const tg=S.units.filter(u=>!u.dead).sort(()=>rnd()-0.5).slice(0,xf?Math.min(6,2+Math.floor(D.party/4)):1);
    for(const u of tg)M.marks.push({x:u.x,y:u.y,r:xf?1.7:1.3,t:1.4,dmg:b.atk*(xf?2.2:1.5)});floater(b.x,b.y,xf?'天雷引！':'重擊！','#ffe27a');}
  const f=b.hp/b.maxhp;while(D.summon.length&&f<D.summon[0]){D.summon.shift();const G=DGS[D.kind],n=Math.round((xf?4:2)+D.party/(xf?3:6));const r=D.L.rooms[D.L.rooms.length-1];for(let k=0;k<n;k++)D.queue.push({t:pick(G.mobs),r});toast(`「${G.bossN}」召來援兵！`);}
  if(f<0.25&&!b.enr){b.enr=true;b.atk=+(b.atk*1.3).toFixed(1);floater(b.x,b.y,'狂暴！','#ff6a5a');}}
// ---- 繪製 ----
function drawDungeon(base){const D=S.dg,L=D.L,G=DGS[D.kind];ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0c0a08';ctx.fillRect(0,0,W,H);ctx.setTransform(...base);
  const tl=screenToWorld(-60,-60),br=screenToWorld(W+60,H+120),tr=screenToWorld(W+60,-60),bl=screenToWorld(-60,H+120);
  const c=[tl,br,tr,bl].map(w=>unIso(w.x,w.y));let i0=Math.max(1,Math.floor(Math.min(...c.map(o=>o.x)))),i1=Math.min(N-2,Math.ceil(Math.max(...c.map(o=>o.x)))),j0=Math.max(1,Math.floor(Math.min(...c.map(o=>o.y)))),j1=Math.min(N-2,Math.ceil(Math.max(...c.map(o=>o.y))));
  i1=Math.min(i1,DGO+DGN);j1=Math.min(j1,DGO+DGN);
  for(let par=0;par<2;par++){ctx.beginPath();for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(L.fl[j*N+i]!==1&&L.fl[j*N+i]!==2)continue;if(((i+j)&1)!==par)continue;const a=P(i,j),b=P(i+1,j),cc=P(i+1,j+1),d=P(i,j+1);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(cc.x,cc.y);ctx.lineTo(d.x,d.y);ctx.closePath();}ctx.fillStyle=G.fl[par];ctx.fill();}
  // 入口與出口
  const pulse=0.5+0.5*Math.sin(performance.now()/300);
  const portal=(x,y,col,txt)=>{const q=P(x,y);ctx.globalAlpha=0.5+0.3*pulse;ellipse(q.x,q.y,22,11,col);ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(q.x,q.y,16+4*pulse,8+2*pulse,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;label(txt,q.x,q.y-16,'#fff','bold 10px sans-serif');};
  portal(D.ent.x,D.ent.y,'rgba(120,200,255,0.6)','撤離陣');if(D.exitP)portal(D.exitP.x,D.exitP.y,'rgba(255,220,120,0.75)','出口傳送陣');
  try{dgDrawBossGate(D);}catch(e){}
  for(const m of D.mech.marks){const q=P(m.x,m.y);const k=1-clamp(m.t/1.4,0,1);ctx.strokeStyle=`rgba(255,${m.done?255:120},60,0.9)`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,m.r*HW*1.4,m.r*HH*1.4,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=`rgba(255,200,80,${0.15+0.35*k})`;ctx.beginPath();ctx.ellipse(q.x,q.y,m.r*HW*1.4*k,m.r*HH*1.4*k,0,0,Math.PI*2);ctx.fill();ctx.lineWidth=1;}
  const list=[];
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;if(L.fl[k]===2){list.push([i+j+1,0,i,j,1]);continue;}if(L.fl[k])continue;if(L.fl[k+1]||L.fl[k-1]||L.fl[k+N]||L.fl[k-N]||L.fl[k+N+1]||L.fl[k-N-1]||L.fl[k+N-1]||L.fl[k-N+1])list.push([i+j+1,0,i,j,0]);}
  const many=S.units.length+S.enemies.length>60;
  for(const u of S.units)if(!u.dead)list.push([u.x+u.y,1,u]);for(const e of S.enemies)list.push([e.x+e.y,2,e]);
  list.sort((a,b)=>a[0]-b[0]);lastDrawCount=list.length;
  for(const it of list){if(it[1]===0){const i=it[2],j=it[3];if(it[4])prism(i+0.2,j+0.2,i+0.8,j+0.8,0,30,G.wl[0],G.wl[1],G.wl[2]);else prism(i,j,i+1,j+1,0,22,G.wl[0],G.wl[1],G.wl[2]);}
    else if(it[1]===1)drawHuman(it[2]);else drawBeast(it[2]);}
  drawFx();
  for(const m of markers){const p=P(m.x,m.y);const k=m.t/0.9;ctx.globalAlpha=clamp(1-k,0,1);ctx.strokeStyle=m.col;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,4+k*18,2+k*9,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=1;}
  ctx.textAlign='center';ctx.font='bold 12px sans-serif';
  for(const f of floaters){if(many&&f.text[0]==='-'&&f.col!=='#ff7070')continue;const p=P(f.x,f.y,(f.h0||34)+f.t*28);ctx.globalAlpha=clamp(1.4-f.t,0,1);ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,0.8)';ctx.strokeText(f.text,p.x,p.y);ctx.fillStyle=f.col;ctx.fillText(f.text,p.x,p.y);}
  ctx.globalAlpha=1;ctx.lineWidth=1;drawV045World();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(mouse.box){ctx.strokeStyle='#7dff7d';ctx.fillStyle='rgba(125,255,125,0.12)';const x=Math.min(mouse.sx,mouse.x),y=Math.min(mouse.sy,mouse.y),ww=Math.abs(mouse.x-mouse.sx),hh=Math.abs(mouse.y-mouse.sy);ctx.fillRect(x,y,ww,hh);ctx.strokeRect(x,y,ww,hh);}
  const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.6)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
// 新怪物外觀
{const _db=drawBeast;drawBeast=function(e){const D=ENEMY[e.type];if(D.look!=='golem'&&D.look!=='wisp')return _db(e);
  const b=P(e.x,e.y),big=D.boss?1.7:e.type==='xfguard'?1.15:1,t=performance.now()/400;
  if(selOther&&selOther.k==='e'&&selOther.id===e.id){ctx.strokeStyle='#ff6a6a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y,13*big,6.5*big,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}
  if(D.look==='wisp'){const y=b.y-14+3*Math.sin(t*2+e.id);ellipse(b.x,b.y+1,6,3,'rgba(0,0,0,0.3)');const g=ctx.createRadialGradient(b.x,y,1,b.x,y,11);g.addColorStop(0,'rgba(255,240,200,1)');g.addColorStop(0.5,'rgba(120,220,255,0.8)');g.addColorStop(1,'rgba(80,120,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,y,11,0,Math.PI*2);ctx.fill();
    bar(b.x,b.y-32,24,e.hp/e.maxhp,'#ff4a4a');label(e.dgName||D.n,b.x,b.y-35,'#bfe8ff','9px sans-serif');return;}
  const gold=e.type==='xfguard'||e.type==='xfboss',c1=gold?'#8a7030':'#6a6458',c2=gold?'#c9a040':'#8a8476',lg=e.moving?Math.sin((e.walk||0)*12)*2:0;
  if(D.boss)ellipse(b.x,b.y-20*big,20*big,26*big,`rgba(255,220,120,${0.12+0.08*Math.sin(t)})`);
  ellipse(b.x,b.y+1,10*big,4.5*big,'rgba(0,0,0,0.35)');
  ctx.fillStyle=c1;ctx.fillRect(b.x-5*big+lg,b.y-8*big,4*big,8*big);ctx.fillRect(b.x+1*big-lg,b.y-8*big,4*big,8*big);
  poly([{x:b.x-9*big,y:b.y-8*big},{x:b.x+9*big,y:b.y-8*big},{x:b.x+11*big,y:b.y-24*big},{x:b.x-11*big,y:b.y-24*big}],c2,'rgba(0,0,0,0.5)');
  ctx.fillStyle=c1;ctx.fillRect(b.x-5*big,b.y-32*big,10*big,8*big);ctx.fillStyle=gold?'#fff2a0':'#9fe8ff';ctx.fillRect(b.x+e.face*2*big-3*big,b.y-29*big,2*big,2*big);ctx.fillRect(b.x+e.face*2*big+1*big,b.y-29*big,2*big,2*big);
  const sw=e.anim>0?6:0;ctx.strokeStyle=c1;ctx.lineWidth=4*big;ctx.beginPath();ctx.moveTo(b.x-10*big,b.y-22*big);ctx.lineTo(b.x-13*big-sw,b.y-10*big);ctx.moveTo(b.x+10*big,b.y-22*big);ctx.lineTo(b.x+13*big+sw,b.y-10*big);ctx.stroke();ctx.lineWidth=1;
  if(gold){ctx.strokeStyle='#ffe9a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+13*big,b.y-10*big);ctx.lineTo(b.x+15*big,b.y-40*big);ctx.stroke();ctx.lineWidth=1;}
  bar(b.x,b.y-38*big,D.boss?50:28,e.hp/e.maxhp,D.boss?'#ffcc40':'#ff4a4a');label(enemyName(e),b.x,b.y-41*big,D.boss?'#ffe9a0':'#ffd0a0',D.boss?'bold 11px sans-serif':'9px sans-serif');};}
{const _en=enemyName;enemyName=function(e){if(e&&e.dgName){e._hadDgName=1;}return _en(e);};}
// 副本內的點擊：點敵人＝攻擊，點地面＝移動，點自己人＝選取
function dgTap(x,y){const w=screenToWorld(x,y);const u=unitAt(w,S.units,14);if(u){selUnits=[u.id];panelKeyCache=null;return;}
  const e=enemyAt(w),us=commandUnits();if(e){us.forEach(v=>setTask(v,{type:'attack',eid:e.id,man:1,pack:xwAttackPack(e,v),ax:e.x,ay:e.y}));markers.push({x:e.x,y:e.y,t:0,col:'#ff5050'});return;}
  const t=tileAtWorld(w);commandMove(us,clamp(t.x,0.3,N-0.3),clamp(t.y,0.3,N-0.3),false);}
{const _t=tapAt;tapAt=function(x,y){if(S.dg){dgTap(x,y);return;}if(tapV045(x,y))return;_t(x,y);};}
{const _r=rightClick;rightClick=function(x,y,sh){if(S.dg){dgTap(x,y);return;}if(rightV045(x,y,sh))return;_r(x,y,sh);};}
{const _l=leftClick;leftClick=function(x,y,sh){if(S.dg){const w=screenToWorld(x,y);const u=unitAt(w,S.units,14);if(u){selUnits=sh?selUnits.concat(u.id):[u.id];}else if(!sh)selUnits=[];panelKeyCache=null;return;}_l(x,y,sh);};}
{const _pi=playerInteract;playerInteract=function(){const p=player();if(S.dg){if(p&&S.dg.exitP&&dist(p.x,p.y,S.dg.exitP.x,S.dg.exitP.y)<3)dgExit(true);else toast('副本中：點敵人攻擊；走回「撤離陣」或按「撤離」離開');return;}
  if(p&&!p.dead){for(const g of gates())if(distRect(p.x,p.y,g.i,g.j,2)<2.5){selOther={k:'s',id:g.id};selUnits=[];selBuilding=null;panelKeyCache=null;return;}}
  if(evNearTrigger(true))return;_pi();};}
{const _eb=enterBuild;enterBuild=function(t){if(S.dg){toast('副本中無法建造');return;}return _eb(t);};}

// v0.4.7：首領傳送陣（聯機 net17 的傳送點位置：入口房 floor(cx)+3.5, floor(cy)+0.5）— 地面陣紋＋石門
function dgDrawBossGate(D){if(typeof netGatePt!=='function'||(typeof netBgOn==='function'&&!netBgOn()))return;const G=netGatePt(D);if(!G)return;
  const open=typeof netGateOpen==='function'&&netGateOpen(D),t=performance.now()/1000,c=P(G.x,G.y);ctx.save();
  ctx.globalAlpha=open?0.85:0.5;ctx.strokeStyle=open?'#ffd34d':'#7a7a8c';ctx.lineWidth=2;for(const k of [1,0.68]){ctx.beginPath();ctx.ellipse(c.x,c.y,26*k,13*k,0,0,6.283);ctx.stroke();}
  for(let n=0;n<8;n++){const a=n/8*6.283+(open?t*0.6:0);ctx.fillStyle=open?'#ffe9a0':'#9a9aac';ctx.fillRect(c.x+Math.cos(a)*21-1.5,c.y+Math.sin(a)*10.5-1.5,3,3);}
  if(open){ctx.globalAlpha=0.18+0.1*Math.sin(t*3);ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.ellipse(c.x,c.y,26,13,0,0,6.283);ctx.fill();}
  ctx.globalAlpha=1;const L=P(G.x-0.75,G.y+0.75),R=P(G.x+0.75,G.y-0.75),col=open?['#6a5a48','#857258']:['#4a4a52','#5c5c66'];
  for(const q of [L,R]){ctx.fillStyle=col[0];ctx.fillRect(q.x-3.5,q.y-34,7,34);ctx.fillStyle=col[1];ctx.fillRect(q.x-3.5,q.y-34,3,34);}
  ctx.strokeStyle=open?'#b0402a':'#5a3a3a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(L.x-7,L.y-36);ctx.lineTo(R.x+7,R.y-36);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(L.x-2,L.y-28);ctx.lineTo(R.x+2,R.y-28);ctx.stroke();
  if(open){ctx.globalAlpha=0.35+0.2*Math.sin(t*4);ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.moveTo(L.x+3,L.y-27);ctx.lineTo(R.x-3,R.y-27);ctx.lineTo(R.x-3,R.y);ctx.lineTo(L.x+3,L.y);ctx.closePath();ctx.fill();}
  ctx.restore();}
