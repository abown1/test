// ================== 宗門工具 ==================
function popCap(){let c=0;for(const b of S.buildings){if(!b||!b.built)continue;const D=BUILD[b.type];if(!D)continue;c+=(D.pop||0)+(typeof lvPop==='function'?lvPop(b):0);}return c;}
function popUsed(){let q=0;for(const b of S.buildings)q+=(b.queue||0);return disciples().length+q;}
function hasBuilt(type){return S.buildings.some(b=>b.type===type&&b.built&&!b.broken);}
function hasAny(type){return S.buildings.some(b=>b.type===type);}
function nearestHall(u){let best=null,bd=1e9;for(const b of S.buildings){if(b.type!=='hall'||!b.built||b.broken)continue;const d=distRect(u.x,u.y,b.i,b.j,3);if(d<bd){bd=d;best=b;}}return best;}
function hallB(){return S.buildings.find(b=>b.type==='hall'&&b.built)||null;}
function sectCenter(){const h=hallB();return h?{x:h.i+1.5,y:h.j+1.5}:{x:ANCH.start.x+0.5,y:ANCH.start.y+0.5};}
function caveCount(){return S.flags.xian?S.buildings.filter(b=>b.type==='house'&&b.built&&!b.broken).length:0;}
function nodeMinable(n){return n.type!=='vein'||S.flags.xian;}
function findNearestNode(resType,x,y,maxD,u){
  let best=null,bd=maxD;const c=u?unitComp(u):-1;
  const ci0=Math.max(0,((x-maxD)/CS)|0),ci1=Math.min(NCH-1,((x+maxD)/CS)|0),cj0=Math.max(0,((y-maxD)/CS)|0),cj1=Math.min(NCH-1,((y+maxD)/CS)|0);
  for(let cj=cj0;cj<=cj1;cj++)for(let ci=ci0;ci<=ci1;ci++)for(const n of chunkNodes[cj*NCH+ci]){
    if(n.gone||NODE_RES[n.type]!==resType||!nodeMinable(n))continue;if(u&&u.bad&&u.bad[n.id]>S.time)continue;
    const d=dist(x,y,n.i+0.5,n.j+0.5);if(d>=bd)continue;
    if(c>=0){let ok=false;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const i=n.i+a,j=n.j+b;if(inMap(i,j)&&!block[j*N+i]&&comp[j*N+i]===c){ok=true;break;}}if(!ok)continue;}
    bd=d;best=n;}
  return best;
}
function removeNode(n){scheduleRegrow(n);n.gone=true;n.amount=0;S.nodeMods[n.id]=0;const k=n.j*N+n.i;block[k]=0;nodeGrid[k]=null;computeComp();chunkDirtyAt(n.i,n.j);}

// ================== 修煉 ==================
function cultMul(u){let m=(0.6+u.wu/100)*(isXW(u)?1.2:1);m*=1+Math.min(0.5,0.1*caveCount());return m;}
function needXiu(u){return REALMS[u.realm].need;}
function gainXiu(u,amt){
  if(u.realm>=MAX_REALM){return;}
  const need=needXiu(u),was=u.xiu>=need;u.xiu=Math.min(need,u.xiu+amt);
  if(u.xiu>=need&&!was){const c=breakConds(u);
    if(c.auto&&c.ok)doBreak(u);
    else if(u.kind==='player'||selUnits.includes(u.id))toast(`${nm(u)}修為圓滿，可以嘗試突破「${REALMS[u.realm+1].n}」${c.ok?'（按「突破」）':'（條件未滿，見修煉面板）'}`);}
}
function lianqiNeedXY(u){return isXW(u)?25:50;}
function lianqiFail(u){let f=0.55-u.wu*0.004-u.luck*0.001-(isXW(u)?0.25:0)-(u.lg?[0.05,0.15,0.3][u.lg.q]:0);return clamp(f,0.05,0.9);}
// 突破條件：回傳每一項是否達成
function breakConds(u){
  const r=u.realm,list=[];if(r>=MAX_REALM)return {ok:false,list:[{t:'已達目前版本的最高境界（築基尚未開放）',ok:false}],auto:false};
  list.push({t:`修為圓滿（${Math.floor(u.xiu)}/${needXiu(u)}）`,ok:u.xiu>=needXiu(u)});
  if(r===1)list.push({t:'宗門建有「練武閣」',ok:hasBuilt('lianwu')});
  if(r===2)list.push({t:`宗門持有「武學秘籍」（長書閣研究／村莊任務／遺跡）目前 ${S.items.miji}`,ok:S.items.miji>0});
  if(r===3){list.push({t:`持有「功法」（遺跡可得）目前 ${S.items.gongfa}`,ok:S.items.gongfa>0});
    list.push({t:u.lg?`身具靈根（${lgName(u.lg)}）`:`仙緣 ≥ ${lianqiNeedXY(u)}（目前 ${u.xy}${isXW(u)?'，仙武之體門檻減半':''}）`,ok:!!u.lg||u.xy>=lianqiNeedXY(u)});
    list.push({t:`靈石 20（突破時消耗，目前 ${Math.floor(S.res.lingshi)}）`,ok:S.res.lingshi>=20});}
  return {ok:list.every(c=>c.ok),list,auto:r<=1,fail:r===3?lianqiFail(u):0};
}
function tryBreak(u){
  if(!u||u.dead)return false;const c=breakConds(u);
  if(!c.ok){toast(`${nm(u)}尚未滿足突破條件：`+c.list.filter(x=>!x.ok).map(x=>x.t).join('；'));return false;}
  if(u.realm===3){S.res.lingshi-=20;
    if(rnd()<c.fail){u.xiu=Math.floor(u.xiu*0.6);u.hp=Math.max(1,Math.floor(u.hp/2));fx('ring',u.x,u.y,'#ff6060');toast(`${nm(u)}衝擊煉氣失敗，氣血翻湧、修為倒退（失敗率 ${Math.round(c.fail*100)}%）`);floater(u.x,u.y,'突破失敗','#ff8080');return false;}}
  doBreak(u);return true;
}
function doBreak(u){
  const m=u.realm===3?1.5:1.3;u.realm++;u.xiu=0;u.maxhp=Math.round(u.maxhp*m);u.hp=u.maxhp;u.atk=+(u.atk*m).toFixed(1);u.speed=+(u.speed+0.08).toFixed(2);
  S.stats.breaks++;fx('break',u.x,u.y,'#ffe27a');autoSaveSoon('突破');floater(u.x,u.y,'突破！','#ffe27a');
  const R=REALMS[u.realm];toast(`突破！${nm(u)}晉升「${R.n}」${R.ab?'，領悟「'+ABIL[R.ab].n+'」':''}`);
  if(u.realm===MAX_REALM&&!S.flags.xian){S.flags.xian=true;setTimeout(()=>toast('宗門踏入修仙階段：住房化為洞府（修煉加成）、可建仙緣閣、求武台可升級為求仙台、山中靈石脈可開採'),600);chunkDirtyAll();}
}

// ================== 指令與任務 ==================
function setTask(u,t){
  // 館內弟子若仍做著這棟建築的事，內部清任務不再先踢到門口再立刻走回去。
  // 玩家的移動、攻擊、採集、建造、修繕仍立刻離館。
  let keep=false;
  if(u&&u.inside&&u.inB!=null){
    const order=t&&(t.man||t.type==='move'||t.type==='attack'||t.type==='gather'||t.type==='build'||t.type==='repair'||t.type==='astruct'||t.type==='interact'||t.type==='enter');
    if(!order){
      const b=bById(u.inB);
      const spec=u.job&&typeof INJOB!=='undefined'&&INJOB[u.job];
      if(b&&spec&&spec.b===b.type)keep=true;
    }
  }
  if(u&&u.inside&&!keep)exitBuilding(u);
  u.task=t;u.prevTask=null;u.path=[];u.repath=0;u.medit=false;u.needRepath=false;
}
function xwFoe(e){
  if(!e||e.dead||!(e.hp>0))return false;
  if(!ENEMY[e.type])return false;
  if(e.type==='militia'){const v=vById(e.camp);if(!v||vStatus(v)!=='hostile')return false;}
  return true;
}
function xwAttackPack(e,u){
  const ids=[e.id],R=8,CAP=6,LEASH=12,list=[];
  for(const o of (S.enemies||[])){
    if(o===e||!xwFoe(o))continue;
    if(dist(o.x,o.y,e.x,e.y)>R)continue;
    if(u&&dist(o.x,o.y,u.x,u.y)>LEASH)continue;
    list.push(o);
  }
  list.sort((a,b)=>dist(a.x,a.y,e.x,e.y)-dist(b.x,b.y,e.x,e.y));
  for(const o of list){if(ids.length>=CAP)break;ids.push(o.id);}
  return ids;
}
function assignJob(u,job,arg){
  if(!u||u.kind!=='disciple')return false;
  // 務農也走共用指派管線，讓玩家手令／自動指派鎖與睡眠取消一致。
  if(job==='farm'){
    const b=arg&&arg.bid!=null?bById(arg.bid):null;
    if(!b||b.type!=='lingtian'||!b.built||b.broken||u.dead)return false;
    if(!(u.job==='farm'&&u.jobB===b.id)&&econFarmWorkers(b)>=econFarmSlots(b))return false;
    if(u.inside)exitBuilding(u);
    u.aiJob=null;u.job='farm';u.jobB=b.id;u.econFarm=true;u.jst=null;u.guardAt=null;
    setTask(u,null);return true;
  }
  if(job==='train'&&!hasBuilt('wudao')){toast('需要先建成「武道館」才能練武');return false;}
  if(job==='seclude'&&!hasBuilt('lianwu')){toast('需要先建成「練武閣」才能閉關');return false;}
  if(INJOB[job]&&!hasBuilt(INJOB[job].b)){toast(`需要先建成「${BUILD[INJOB[job].b].name}」才能${INJOB[job].label}`);return false;}
  if(INJOB[job]&&arg&&arg.bid){const bb=bById(arg.bid);if(bb&&bb.type===INJOB[job].b&&trainers(bb)<jobSlots(bb)){u.aiJob=null;u.job=job;u.jobB=bb.id;u.jst=null;u.guardAt=null;setTask(u,null);return true;}}
  u.aiJob=null;u.job=job;if(job==='gather'&&arg)u.jobRes=arg;u.jobB=null;u.jst=null;u.guardAt=null;
  if(job==='guard'){u.guardAt={x:u.x,y:u.y};}
  setTask(u,null);u.carry=u.carry&&job==='gather'?u.carry:u.carry;
  return true;
}
function trainers(b){let n=0;for(const u of S.units)if(u.jobB===b.id&&!u.dead&&INJOB[u.job])n++;return n;}
function pickJobBuilding(u,type){const sl=BUILD[type].slots;let best=null,bd=1e9;for(const b of S.buildings){if(b.type!==type||!b.built||b.broken)continue;if(u.jobB!==b.id&&trainers(b)>=jobSlots(b))continue;const d=distRect(u.x,u.y,b.i,b.j,BUILD[type].size);if(d<bd){bd=d;best=b;}}return best;}
function nearestEnemy(x,y,r){let best=null,bd=r;for(const e of S.enemies){const d=dist(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
// 共用戰鬥步驟
function fightStep(u,dt,e){
  if(tryAbilities(u,e))return;
  const reach=u.r+e.r+0.5;
  if(chase(u,dt,e.x,e.y,reach)){faceTo(u,e.x,e.y);if(u.cd<=0)meleeHit(u,e);}
}
function damagedBuilding(x,y,r){let best=null,bd=r;for(const b of S.buildings){if(!b.built||b.hp>=b.maxhp)continue;const s=BUILD[b.type].size;if(S.enemies.some(e=>distRect(e.x,e.y,b.i,b.j,s)<7))continue;const d=distRect(x,y,b.i,b.j,s);if(d<bd){bd=d;best=b;}}return best;}
function repairStep(u,dt,b){
  const s=BUILD[b.type].size,r=approachRect(u,dt,b.i,b.j,s,0.95);
  if(r===null){u.task=null;return;}if(!r)return;
  if(S.res.wood<1){if(!u.woodWarn||S.time-u.woodWarn>20){u.woodWarn=S.time;toast('修繕需要木材（每 10 點耐久 1 木材）');}u.task=null;return;}
  faceTo(u,b.i+s/2,b.j+s/2);u.working=true;const amt=Math.min(b.maxhp-b.hp,22*dt);b.hp+=amt;b.repAcc=(b.repAcc||0)+amt;
  while(b.repAcc>=10){b.repAcc-=10;S.res.wood=Math.max(0,S.res.wood-1);}
  if(b.hp>=b.maxhp){b.hp=b.maxhp;if(b.broken){b.broken=false;toast(`「${bName(b)}」修繕完成，恢復運作`);}S.flags.repaired=true;u.task=null;}
}
function buildStep(u,dt,b){
  const s=BUILD[b.type].size,r=approachRect(u,dt,b.i,b.j,s,1.0);
  if(r===null){u.task=null;return;}if(!r)return;
  faceTo(u,b.i+s/2,b.j+s/2);u.working=true;if(b.built){if(b.upg)upgradeStep(b,dt);return;}b.progress+=dt/BUILD[b.type].time;if(b.progress>=1)completeBuilding(b);
}
function completeBuilding(b){
  if(b.built)return;b.built=true;b.progress=1;b.hp=b.maxhp;b.builtAt=S.time;toast(`「${BUILD[b.type].name}」落成！`);autoSaveSoon('建築完成');
  for(const u of S.units){if(u.task&&u.task.type==='build'&&u.task.bid===b.id)u.task=null;}
  if(b.type==='hall')startRaidClock();
}

// ================== 單位更新 ==================
function updateUnit(u,dt){
  if(u.kind==='player'&&typeof v158Tick==='function')v158Tick(u,dt);// #158 技能列：走近後施放
  if(u.dead){if(u.kind==='player'&&u.respawn>1e8)return;u.respawn-=dt;if(u.respawn<=0){const c=sectCenter();const p=nearestFree(c.x+2,c.y+2,startComp)||{i:ANCH.start.x,j:ANCH.start.y};u.x=p.i+0.5;u.y=p.j+0.5;u.hp=u.maxhp;u.dead=false;u.vx=u.vy=0;toast('你重新站了起來');}return;}
  u.cd-=dt;u.repath-=dt;u.anim=Math.max(0,u.anim-dt);u.working=false;u.slowT-=dt;
  for(const k in u.acd)if(u.acd[k]>0)u.acd[k]-=dt;
  if(u.shieldT>0){u.shieldT-=dt;if(u.shieldT<=0)u.shield=0;}
  if(S.time-u.lastHit>5&&u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+(3+u.realm*1.5)*dt);
  if(u.dash){updateDash(u,dt);moveEntity(u,dt);return;}
  if(u.inside){u.dvx=u.dvy=0;u.vx=u.vy=0;}
  if(u.kind==='player'){if(u.inside&&S.interior){updateInteriorPlayer(u,dt);return;}updatePlayer(u,dt);}else updateDisciple(u,dt);
  if(!u.inside)moveEntity(u,dt);
}
function joyVec(){
  let ax=0,ay=0;
  if(keys.KeyW)ay-=1;if(keys.KeyS)ay+=1;if(keys.KeyA)ax-=1;if(keys.KeyD)ax+=1;// #195：WASD 移動主角（方向鍵改成平移鏡頭）
  let mag=ax||ay?1:0;
  if(joy.active){const m=Math.hypot(joy.x,joy.y);if(m>0.15){ax=joy.x/m;ay=joy.y/m;mag=Math.min(1,(m-0.15)/0.75);}}
  if(!mag)return null;
  // 螢幕方向 → 世界方向（斜角）
  const wx=(ax/HW+ay/HH)/2,wy=(ay/HH-ax/HW)/2,l=Math.hypot(wx,wy)||1;return {x:wx/l*mag,y:wy/l*mag,mag};
}
function updatePlayer(u,dt){
  const jv=joyVec();
  if(jv){if(u.task&&u.task.type!=='attack'||u.medit)setTask(u,null);if(u.task&&u.task.type==='attack')setTask(u,null);u.queue=[];
    u.path=[];const sp=u.speed*TUNE.moveMul*(u.slowT>0?0.5:1)*(terrain[(u.y|0)*N+(u.x|0)]===T.SHALLOW?0.6:1)*(typeof xroadHas==='function'&&xroadHas(u.x,u.y)?1.1:1);u.dvx=jv.x*sp;u.dvy=jv.y*sp;u.manual=true;}
  else if(u.manual){u.manual=false;u.dvx=u.dvy=0;}
  // 攻擊範圍內自動出手
  if(!u.medit&&u.cd<=0&&!(u.task&&u.task.type==='attack')){const e=nearestEnemy(u.x,u.y,u.r+0.95);if(e){faceTo(u,e.x,e.y);if(!tryAbilities(u,e))meleeHit(u,e);}}
  if(jv)return;
  const t=u.task;
  if(!t){u.dvx=u.dvy=0;
    if(u.queue&&u.queue.length){const q=u.queue.shift();setTask(u,{type:'move',x:q.x,y:q.y});pathTo(u,q.x,q.y);return;}
    for(const b of S.buildings){if(!b.built&&distRect(u.x,u.y,b.i,b.j,BUILD[b.type].size)<=1.0){b.progress+=dt/BUILD[b.type].time;u.working=true;faceTo(u,b.i+1,b.j+1);if(b.progress>=1)completeBuilding(b);break;}}
    return;}
  runTask(u,dt,t);
}
function runTask(u,dt,t){
  if(t.type==='move'){if(u.needRepath&&u.stuck<4){pathTo(u,t.x!=null?t.x:u.path.length?u.path[u.path.length-1].x:u.x,t.y!=null?t.y:u.path.length?u.path[u.path.length-1].y:u.y);}
    if(!followPath(u,dt)||u.stuck>=8){u.task=null;u.dvx=u.dvy=0;if(u.kind==='player'&&u.queue&&u.queue.length){const q=u.queue.shift();setTask(u,{type:'move',x:q.x,y:q.y});pathTo(u,q.x,q.y);}}return;}
  if(t.type==='attack'){let e=enemyById(t.eid);
    if(t.man&&t.pack&&(!e||e.dead||!(e.hp>0))){
      const ax=t.ax!=null?t.ax:u.x,ay=t.ay!=null?t.ay:u.y;
      for(const id of t.pack){
        const o=enemyById(id);
        if(!xwFoe(o))continue;
        if(dist(o.x,o.y,ax,ay)>10||dist(u.x,u.y,o.x,o.y)>14)continue;
        t.eid=o.id;e=o;break;
      }
    }
    // BATCH2100_FAR_ATK：手動鎖定（右鍵／明確攻擊）可遠距追擊；自動接戰仍用 18 格牽繩。周圍敵人只在點選點附近接上。
    const leash=t.man?80:18;
    if(!e||e.dead||!(e.hp>0)||dist(u.x,u.y,e.x,e.y)>leash){u.task=u.prevTask||null;u.prevTask=null;u.path=[];return;}fightStep(u,dt,e);return;}
  if(t.type==='astruct'){const s=sById(t.sid);if(!s||s.dead){u.task=null;return;}
    const r=approachRect(u,dt,s.i,s.j,s.s,0.75);if(r===null){u.task=null;return;}if(!r)return;faceTo(u,s.i+s.s/2,s.j+s.s/2);if(u.cd<=0){dmgStruct(u,s,u.atk*(0.9+rnd()*0.2));u.cd=1;u.anim=0.25;}return;}
  if(t.type==='build'){const b=bById(t.bid);if(!b||(b.built&&!b.upg)){u.task=null;return;}buildStep(u,dt,b);return;}
  if(t.type==='repair'){const b=bById(t.bid);if(!b||b.hp>=b.maxhp){u.task=null;return;}repairStep(u,dt,b);return;}
  if(t.type==='enter'){enterStep(u,dt,t);return;}
  if(t.type==='meditate'){u.dvx=u.dvy=0;u.medit=true;let m=1;for(const b of S.buildings){if(!b.built||b.broken)continue;const d=distRect(u.x,u.y,b.i,b.j,BUILD[b.type].size);if(b.type==='lianwu'&&d<3)m=Math.max(m,2.4);else if(b.type==='wudao'&&d<3)m=Math.max(m,1.6);}
    t.mul=m;gainXiu(u,1.2*(typeof cultLoc==='function'?cultLoc(u,m,null):m*cultMul(u))*dt);if(t.t0==null)t.t0=S.time;
    if(u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*(u.kind==='player'?TUNE.medHpPlayer:TUNE.medHpDisciple)*dt);
    if(u.lastHit>t.t0){u.medit=false;u.task=null;if(u.kind==='player')toast('受到攻擊，打坐中斷');return;}
    if(nearestEnemy(u.x,u.y,4)){u.medit=false;u.task=null;toast('有敵人靠近，打坐中斷');}return;}
  if(t.type==='gather'){let n=nodeById(t.nodeId);if(!n||n.amount<=0){u.task=null;return;}
    if(!nodeMinable(n)){toast('靈石脈需要煉氣以上的修為才能開採');u.task=null;return;}
    const r=approachRect(u,dt,n.i,n.j,1,0.8);if(r===null){u.task=null;return;}if(!r)return;
    faceTo(u,n.i+0.5,n.j+0.5);u.working=true;u.gt=(u.gt||0)+dt*u.gat*(n.type==='vein'||n.type==='iron'?0.6:1);
    if(u.gt>=1){u.gt-=1;n.amount--;n.hitT=S.time;S.nodeMods[n.id]=n.amount;const rt=NODE_RES[n.type];S.res[rt]++;S.stats.gathered++;floater(n.i+0.5,n.j+0.5,'+1 '+RES_NAMES[rt],RES_COL[rt]);gainXiu(u,0.15);if(n.amount<=0){removeNode(n);u.task=null;}}
    return;}
  if(t.type==='interact'){const s=sById(t.sid);if(!s){u.task=null;return;}const r=approachRect(u,dt,s.i,s.j,s.s,1.2);if(r===null){u.task=null;return;}if(!r)return;u.task=null;interactStruct(s);return;}
  u.task=null;
}
function updateDisciple(u,dt){
  // 自衛／守衛：附近有敵人就迎戰（玩家強制命令期間不接戰）
  const t=u.task;
  const forced=(typeof xmvOn==='function'&&xmvOn(u))||!!(u.xcmd&&S.time<u.xcmd.until);
  if(!forced&&(!t||t.type!=='move'&&t.type!=='attack'&&t.type!=='astruct'&&t.type!=='build'&&t.type!=='repair')){
    let rad=u.job==='guard'?3.2:u.job==='follow'?(S.dg?3.5:2.2):1.0; // 20261106n：再縮索敵，減少遠距追妖狼
    if(u.inside)rad=0;
    const ctr=u.job==='guard'&&u.guardAt?u.guardAt:u.job==='follow'?player()||u:u;
    if(u.job==='follow'&&!rad)rad=0;
    const e=rad>0?nearestEnemy(ctr.x,ctr.y,rad):null;
    if(e&&!(u.job==='gather'&&u.carry&&u.carry.amt>0&&dist(u.x,u.y,e.x,e.y)>2.4)){u.prevTask=t;u.task={type:'attack',eid:e.id};u.path=[];u.medit=false;}
  }
  // 沒有工作的弟子：戰鬥結束後回到玩家指定的位置
  if(!u.task&&!u.job&&u.holdAt&&dist(u.x,u.y,u.holdAt.x,u.holdAt.y)>1.0){setTask(u,{type:'move',x:u.holdAt.x,y:u.holdAt.y});if(!pathTo(u,u.holdAt.x,u.holdAt.y)){u.task=null;u.holdAt=null;}}
  if(u.task){
    if(u.task.type==='attack'&&u.job==='guard'&&u.guardAt&&dist(u.x,u.y,u.guardAt.x,u.guardAt.y)>12){u.task=null;u.path=[];}
    else{runTask(u,dt,u.task);return;}
  }
  doJob(u,dt);
}
function doJob(u,dt){
  const j=u.job;
  if(!j&&u.aiJob){doAiJob(u,dt);return;}
  if(!j){u.dvx=u.dvy=0;const b=damagedBuilding(u.x,u.y,14);if(b&&S.res.wood>0&&(!u.repT||S.time>u.repT)){u.repT=S.time+3;u.task={type:'repair',bid:b.id};}return;}
  if(j==='follow'){const p=player();if(!p||p.dead){u.dvx=u.dvy=0;return;}
    const fol=disciples().filter(d=>d.job==='follow');const k=fol.indexOf(u),ring=k<6?1.3:2.1,n=k<6?Math.min(6,fol.length):Math.max(1,fol.length-6),idx=k<6?k:k-6;
    const ang=Math.PI*0.75+idx/n*Math.PI*2;const tx=p.x+Math.cos(ang)*ring,ty=p.y+Math.sin(ang)*ring;
    const d=dist(u.x,u.y,tx,ty);
    if(d<0.35){u.dvx=u.dvy=0;u.path=[];return;}
    if(d>3&&(u.repath<=0||!u.path.length||u.needRepath)){u.repath=0.8;pathTo(u,tx,ty);}
    else if(d<=3&&los(u.x,u.y,tx,ty,0.2)){u.path=[{x:tx,y:ty}];}
    else if(!u.path.length){pathTo(u,tx,ty);}
    followPath(u,dt,d>4?1.15:1);return;}
  if(j==='guard'){if(!u.guardAt)u.guardAt={x:u.x,y:u.y};const b=damagedBuilding(u.guardAt.x,u.guardAt.y,10);if(b&&S.res.wood>0&&(!u.repT||S.time>u.repT)){u.repT=S.time+3;u.task={type:'repair',bid:b.id};return;}
    if(dist(u.x,u.y,u.guardAt.x,u.guardAt.y)>0.6){if(!u.path.length||u.needRepath)pathTo(u,u.guardAt.x,u.guardAt.y);followPath(u,dt);}else{u.dvx=u.dvy=0;u.path=[];}return;}
  if(INJOB[j]){doInJob(u,dt,j);return;}
  if(j==='gather'){
    const res=u.jobRes||'wood';
    try{if(typeof econGatherOnStart==='function')econGatherOnStart(u);}catch(e){}
    const _esr=typeof econGatherShouldReturn==='function'?econGatherShouldReturn(u):null;
    if(u.carry&&u.carry.amt>0&&((_esr&&_esr.yes)||(!_esr&&(u.carry.amt>=CARRY_CAP||u.carry.type!==res||u.jst==='ret')))){
      const h=nearestHall(u);if(!h){u.dvx=u.dvy=0;if(!u.hallWarn){u.hallWarn=1;toast(`${nm(u)}背滿了，但還沒有可用的宗門大殿可存放`);}return;}
      u.jst='ret';const r=approachRect(u,dt,h.i,h.j,3,0.9);if(r===null){u.dvx=u.dvy=0;return;}if(!r)return;
      if(typeof econGatherDeposit==='function'){const d=econGatherDeposit(u,h);const types=(d&&d.types)||{};for(const k in types)if(types[k])floater(u.x,u.y,'+'+types[k]+' '+RES_NAMES[k],RES_COL[k]);S.stats.discDeposit++;gainXiu(u,1);u.path=[];return;}
      S.res[u.carry.type]+=u.carry.amt;floater(u.x,u.y,'+'+u.carry.amt+' '+RES_NAMES[u.carry.type],RES_COL[u.carry.type]);S.stats.discDeposit++;gainXiu(u,1);u.carry=null;u.jst=null;u.path=[];return;}
    let n=u.jnode!=null?nodeById(u.jnode):null;
    if(!n||n.amount<=0||!nodeMinable(n)){const h=nearestHall(u);n=h?findNearestNode(res,h.i+1.5,h.j+1.5,45,u):null;
      if(!n)n=findNearestNode(res,u.x,u.y,30,u);
      if(!n){u.dvx=u.dvy=0;if(u.carry&&u.carry.amt>0){u.jst='ret';return;}if(!u.nodeWarn||S.time-u.nodeWarn>25){u.nodeWarn=S.time;toast(`${nm(u)}：附近找不到${RES_NAMES[res]}${res==='lingshi'&&!S.flags.xian?'（靈石脈需修仙階段才能開採）':''}`);}return;}
      u.jnode=n.id;u.path=[];}
    const r=approachRect(u,dt,n.i,n.j,1,0.8);
    if(r===null){u.bad=u.bad||{};u.bad[n.id]=S.time+60;u.jnode=null;return;}if(!r)return;
    faceTo(u,n.i+0.5,n.j+0.5);u.working=true;u.gt=(u.gt||0)+dt*u.gat*(n.type==='vein'||n.type==='iron'?0.6:1);
    if(u.gt>=1){u.gt-=1;n.amount--;n.hitT=S.time;S.nodeMods[n.id]=n.amount;const rt=NODE_RES[n.type];
      const ymul=typeof econGatherYieldMul==='function'?econGatherYieldMul(u,u.x,u.y,rt):1;
      u._egY=(u._egY||0)+ymul;let add=0;while(u._egY>=1-1e-9){u._egY-=1;add++;}if(add<1)add=1;
      if(typeof econGatherPut==='function')econGatherPut(u,rt,add);
      else{if(!u.carry||u.carry.type!==rt)u.carry={type:rt,amt:0};u.carry.amt+=add;}
      if(n.amount<=0){removeNode(n);u.jnode=null;}}
  }
}
function interactStruct(s){
  const v=vById(s.vid);
  if(s.type==='trade'&&v){openTrade(v.id);return;}
  if(s.type==='ruinAltar'){
    if(S.flags.ruinLoot){toast('石台上的封印已解開，只剩斑駁的古紋');return;}
    if(!S.flags.kingDead){toast('石甲妖王守護著遺跡，擊敗牠才能取得石台上的傳承');return;}
    S.flags.ruinLoot=true;S.items.gongfa++;S.items.miji++;S.res.lingshi+=30;const p=player();if(p){p.xy+=20;gainXiu(p,100);}
    fx('break',s.i+1,s.j+1,'#8fe8ff');toast('取得遺跡傳承：功法《引氣訣》、武學秘籍、靈石 30，你的仙緣 +20');return;}
  if(v&&v.type!=='bandit'){openTrade(v.id);return;}
}

// ================== 敵人 AI ==================
function camAround(){const t=unIso(cam.x,cam.y);return t;}
function updateEnemy(e,dt,ctile){
  if(!e)return;
  if(!e.home)e.home={x:e.x,y:e.y};
  // 遠離鏡頭、也沒有目標的敵人：每 0.5 秒才更新一次（省效能）
  if(!e.target&&!e.raid&&Math.abs(e.x-ctile.x)+Math.abs(e.y-ctile.y)>48){e.lod+=dt;if(e.lod<0.5)return;dt=e.lod;e.lod=0;}else{dt+=e.lod;e.lod=0;}
  e.cd-=dt;e.slowT-=dt;e.repath-=dt;e.anim=Math.max(0,e.anim-dt);e.scan-=dt;
  if(e.stun>0){e.stun-=dt;e.dvx=e.dvy=0;moveEntity(e,dt);return;}
  const D=ENEMY[e.type];
  if(e.flee){const v=vById(e.camp),tx=v?v.x:e.home.x,ty=v?v.y:e.home.y;if(dist(e.x,e.y,tx,ty)<4||!v||v.destroyed){if(e.raid){const i=S.enemies.indexOf(e);if(i>=0)S.enemies.splice(i,1);checkRaids();return;}e.flee=false;}
    if(!e.path.length||e.needRepath)pathTo(e,tx,ty);followPath(e,dt,1.1);moveEntity(e,dt);return;}
  if(e.type==='militia'){const v=vById(e.camp);if(v&&vStatus(v)!=='hostile'){e.target=null;}}
  // 目標檢查
  let tgt=null;
  if(e.target){if(e.target.k==='u'){const u=unitById(e.target.id);if(u&&!u.dead&&!u.inside&&(e.raid||dist(e.home.x,e.home.y,u.x,u.y)<(e.leash||D.leash))&&dist(e.x,e.y,u.x,u.y)<14)tgt=u;}
    else{const b=bById(e.target.id);if(b&&!b.broken)tgt=b;}
    if(!tgt){e.target=null;e.path=[];}}
  if(e.scan<=0){e.scan=0.4;
    const hostile=e.type!=='militia'||(vById(e.camp)&&vStatus(vById(e.camp))==='hostile');
    if(hostile&&(!tgt||tgt.type)){let best=null,bd=e.raid?4.5:(e.aggro||D.aggro);for(const u of S.units){if(u.dead||u.inside)continue;const d=dist(e.x,e.y,u.x,u.y);if(d<bd){bd=d;best=u;}}
      if(best){e.target={k:'u',id:best.id};tgt=best;e.path=[];}}
    if(!tgt&&e.raid){let best=null,bd=1e9;for(const b of S.buildings){if(b.broken)continue;const _bs=BUILD[b.type]&&BUILD[b.type].size;if(!_bs)continue;const d=distRect(e.x,e.y,b.i,b.j,_bs)-(b.type==='hall'?6:0);if(d<bd){bd=d;best=b;}}
      if(best){e.target={k:'b',id:best.id};tgt=best;e.path=[];}}}
  if(tgt&&tgt.kind){const reach=e.r+tgt.r+0.45;
    if(chase(e,dt,tgt.x,tgt.y,reach,1)){faceTo(e,tgt.x,tgt.y);if(e.cd<=0){dmgUnit(e,tgt,e.atk*(0.8+rnd()*0.4));e.cd=1.3;e.anim=0.25;}}
    moveEntity(e,dt);return;}
  if(tgt){const s=BUILD[tgt.type]&&BUILD[tgt.type].size;if(!s){e.target=null;moveEntity(e,dt);return;}const r=approachRect(e,dt,tgt.i,tgt.j,s,0.7);
    if(r===null){e.target=null;}else if(r){faceTo(e,tgt.i+s/2,tgt.j+s/2);if(e.cd<=0){dmgBuilding(e,tgt,e.atk*(0.8+rnd()*0.4));e.cd=1.4;e.anim=0.3;}}
    moveEntity(e,dt);return;}
  if(e.raid){const c=sectCenter();if(dist(e.x,e.y,c.x,c.y)>3){if(!e.path.length||e.needRepath||e.repath<=0){e.repath=3;pathTo(e,c.x,c.y);}followPath(e,dt);}else{e.dvx=e.dvy=0;}moveEntity(e,dt);return;}
  // 閒晃／巡邏
  if(dist(e.x,e.y,e.home.x,e.home.y)>(e.leash||D.leash)){if(!e.path.length||e.needRepath)pathTo(e,e.home.x,e.home.y);followPath(e,dt);moveEntity(e,dt);return;}
  if(e.patrol){if(!e.path.length){const p=e.patrol[e.pidx%e.patrol.length];e.pidx++;pathTo(e,p.x,p.y);}followPath(e,dt,0.55);moveEntity(e,dt);return;}
  e.wt-=dt;
  if(e.wt<=0&&!e.path.length){e.wt=3+rnd()*5;const rad=e.camp?2.5:3.5;const tx=e.home.x+(rnd()-0.5)*2*rad,ty=e.home.y+(rnd()-0.5)*2*rad;if(!blockedP(tx,ty)&&compAt(tx,ty)===unitComp(e))pathTo(e,tx,ty);}
  if(e.path.length)followPath(e,dt,0.45);else{e.dvx=e.dvy=0;}
  moveEntity(e,dt);
}
function updateVillager(n,dt,ctile){
  if(Math.abs(n.x-ctile.x)+Math.abs(n.y-ctile.y)>44){n.lod=(n.lod||0)+dt;if(n.lod<0.5)return;dt=n.lod;n.lod=0;}
  n.repath-=dt;n.wt-=dt;const v=vById(n.vid);if(!v)return;
  if(n.wt<=0&&!n.path.length){n.wt=2+rnd()*6;const ang=rnd()*Math.PI*2,r=1.5+rnd()*5;const tx=v.x+Math.cos(ang)*r,ty=v.y+Math.sin(ang)*r;if(!blockedP(tx,ty)&&compAt(tx,ty)===unitComp(n))pathTo(n,tx,ty);}
  if(n.path.length){followPath(n,dt);}else{n.dvx=n.dvy=0;}
  moveEntity(n,dt);
}
