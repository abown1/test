// ================== 實體 ==================
const CARRY_CAP=10;
function baseMob(x,y){return {x,y,vx:0,vy:0,dvx:0,dvy:0,path:[],face:1,faceT:1,walk:0,anim:0,cd:0,slowT:0,stun:0,repath:0,r:0.26,stuck:0,stk:0,stx:x,sty:y};}
function unitById(id){for(const u of S.units)if(u.id===id)return u;return null;}
function enemyById(id){for(const e of S.enemies)if(e.id===id)return e;return null;}
function bById(id){for(const b of S.buildings)if(b.id===id)return b;return null;}
function sById(id){for(const s of S.vstructs)if(s.id===id)return s;return null;}
function vById(id){for(const v of S.villages)if(v.id===id)return v;return null;}
function nodeById(id){const n=NODES[id];return n&&!n.gone?n:null;}
function player(){for(const u of S.units)if(u.kind==='player')return u;return null;}
function disciples(){return S.units.filter(u=>u.kind==='disciple');}
function nm(u){return u.kind==='player'?'你':`「${u.name}」`;}
function isXW(u){return BODIES[u.body].n==='仙武之體';}
function lgName(lg){return lg?`${LG_EL[lg.e]}・${LG_Q[lg.q]}`:'無靈根';}
// v0.4.8：玩家角色名（存在 player.name；舊存檔＝「你」→ 讀檔時請玩家取名）
function pnm(u){if(!u)return '';if(u.kind==='player'){const n=u.name;return n&&n!=='你'?n:'你';}return u.name;}
function makePlayer(x,y){return Object.assign(baseMob(x,y),{id:nid(),kind:'player',name:'你',body:6,hp:120,maxhp:120,atk:12,speed:3.5,gat:1.6,realm:0,xiu:0,
  wu:80,xy:15,luck:70,loyal:100,person:'堅毅',lg:null,job:null,task:null,acd:{},shield:0,shieldT:0,dead:false,respawn:0,carry:null,medit:false,lastHit:-99,r:0.27});}
function rollBody(){return rollBody4();}
function rollBodyOld(){let tot=0;for(const b of BODIES)tot+=b.w;let r=rnd()*tot;for(let k=0;k<BODIES.length;k++){r-=BODIES[k].w;if(r<=0)return k;}return 0;}
function randName(){let n=pick(SURN)+pick(GIVEN);if(rnd()<0.6)n+=pick(GIVEN);return n;}
function makeDisciple(x,y,bi,opt){const B=BODIES[bi],hp=Math.round(60*B.hp);
  return Object.assign(baseMob(x,y),{id:nid(),kind:'disciple',name:randName(),body:bi,hp,maxhp:hp,atk:+(6*B.atk).toFixed(1),speed:+(3.0*B.spd).toFixed(2),gat:+(1.0*B.gat).toFixed(2),
    realm:0,xiu:0,wu:ri(20,95),xy:ri(0,40),luck:ri(10,95),loyal:ri(60,90),person:pick(PERSON),lg:null,job:null,jobRes:'wood',task:null,acd:{},shield:0,shieldT:0,dead:false,carry:null,lastHit:-99},opt||{});}
function xnScaleStat(base,rl,mode){let v=base,n=rl|0;const st=(typeof XN!=='undefined'&&XN.STAT)?XN.STAT[mode==='hp'?'hp':'atk']:1.1;
  for(let i=0;i<n;i++){if(mode==='hp')v=Math.max(1,Math.floor(v*st+1e-9));else v=Math.floor(v*st*10+1e-9)/10;}return v;}
function makeEnemy(type,x,y,o){const D=ENEMY[type],rl=(o&&o.realm)||0;
  const hp=xnScaleStat(D.hp,rl,'hp'),atk=xnScaleStat(D.atk,rl,'atk');
  return Object.assign(baseMob(x,y),{id:nid(),type,hp,maxhp:hp,atk:+(+atk).toFixed(1),speed:D.spd,r:D.r,realm:rl,
    home:{x,y},target:null,wt:rnd()*3,camp:null,raid:null,zone:null,patrol:null,pidx:0,scan:rnd()*0.4,lod:0},o||{});}
function makeVillager(v,x,y){return Object.assign(baseMob(x,y),{id:nid(),vid:v.id,name:randName(),robe:pick(['#6d8bb0','#8a6d4a','#7a9a6a','#a07a9a','#b08a5a']),hat:rnd()<0.5,speed:1.3,wt:rnd()*4,r:0.25});}
function enemyName(e){const D=ENEMY[e.type];return e.name?`${e.exd===1?'叛門山賊':D.n}「${e.name}」・${REALMS[e.realm].n}`:D.human?`${D.n}・${REALMS[e.realm].n}`:D.n;}

// ================== 訊息 ==================
function toast(msg){const el=document.getElementById('toasts');const d=document.createElement('div');d.textContent=msg;el.appendChild(d);setTimeout(()=>d.remove(),isTouchUI?4500:6000);while(el.children.length>(isTouchUI?2:4))el.firstChild.remove();}
function floater(x,y,text,col){if(floaters.length>60)floaters.shift();floaters.push({x,y,text,col:col||'#fff',t:0});}
function fx(type,x,y,col,extra){
  // 同一扇門短時間內只留一個光圈。進門仍會亮一次，人數徽章與窗光不在這裡。
  if(type==='ring'){for(const e of effects){if(e.type==='ring'&&Math.abs(e.x-x)<0.4&&Math.abs(e.y-y)<0.4)return;}}
  effects.push(Object.assign({type,x,y,col,t:0,dur:type==='break'?1.4:0.5},extra||{}));
}
function ping(x,y,danger){pings.push({x,y,t:0,dur:danger?8:4,danger:!!danger});}

// ================== 移動：速度、加速度、平滑轉向、碰撞 ==================
function collideTiles(o){
  const r=o.r,i0=Math.floor(o.x-r),i1=Math.floor(o.x+r),j0=Math.floor(o.y-r),j1=Math.floor(o.y+r);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(!blockedT(i,j))continue;
    const cx=clamp(o.x,i,i+1),cy=clamp(o.y,j,j+1),dx=o.x-cx,dy=o.y-cy,d2=dx*dx+dy*dy;
    if(d2>=r*r)continue;
    if(d2>1e-9){const d=Math.sqrt(d2),p=r-d;o.x+=dx/d*p;o.y+=dy/d*p;}
    else{const l=o.x-i,rr=i+1-o.x,t=o.y-j,b=j+1-o.y,m=Math.min(l,rr,t,b);if(m===l)o.x=i-r;else if(m===rr)o.x=i+1+r;else if(m===t)o.y=j-r;else o.y=j+1+r;}}
}
function moveEntity(o,dt){
  const acc=o.kind==='player'?16:10,k=Math.min(1,acc*dt);
  o.vx+=(o.dvx-o.vx)*k;o.vy+=(o.dvy-o.vy)*k;
  let mx=o.vx*dt,my=o.vy*dt;const steps=Math.max(1,Math.ceil(Math.hypot(mx,my)/0.2));mx/=steps;my/=steps;
  for(let s=0;s<steps;s++){o.x+=mx;o.y+=my;collideTiles(o);}
  o.x=clamp(o.x,0.3,N-0.3);o.y=clamp(o.y,0.3,N-0.3);
  const sp=Math.hypot(o.vx,o.vy);o.moving=sp>0.25;
  if(sp>0.15){o.walk+=dt*Math.max(0.6,sp/3);const sdx=o.vx-o.vy;if(Math.abs(sdx)>0.05)o.faceT=sdx>0?1:-1;}
  o.face+=(o.faceT-o.face)*Math.min(1,dt*9);
}
function faceTo(o,x,y){const sdx=(x-o.x)-(y-o.y);if(Math.abs(sdx)>0.01)o.faceT=sdx>0?1:-1;}
let NB=null;   // 空間雜湊（上一幀），用來避讓
function followPath(o,dt,spMul){
  while(o.path.length){const wp=o.path[0],d=Math.hypot(wp.x-o.x,wp.y-o.y);if(d<(o.path.length>1?0.45:0.12))o.path.shift();else break;}
  if(!o.path.length){o.dvx=o.dvy=0;return false;}
  const wp=o.path[0],dx=wp.x-o.x,dy=wp.y-o.y,d=Math.hypot(dx,dy)||1;
  // 終點附近被隊友擠著時，待一下就算抵達（避免原地推擠）
  if(o.path.length===1&&d<0.6){o.nearT=(o.nearT||0)+dt;if(o.nearT>0.8||o.stuck>0){o.path.length=0;o.nearT=0;o.dvx=o.dvy=0;return false;}}else o.nearT=0;
  const ti=Math.floor(o.x),tj=Math.floor(o.y);
  let sp=o.speed*TUNE.moveMul*(spMul||1)*(o.slowT>0?0.5:1)*(inMap(ti,tj)&&terrain[tj*N+ti]===T.SHALLOW?0.6:1)*(typeof xroadHas==='function'&&xroadHas(o.x,o.y)?1.1:1);
  if(o.path.length===1&&d<0.9)sp*=Math.max(0.3,d/0.9);
  let ux=dx/d,uy=dy/d;
  // 避讓：前方有其他單位時往側邊偏
  if(NB){const near=nbQuery(o.x,o.y);let ax=0,ay=0;for(const q of near){if(q===o)continue;const qx=q.x-o.x,qy=q.y-o.y,qd=Math.hypot(qx,qy);if(qd>1.1||qd<0.001)continue;const fw=(qx*ux+qy*uy)/qd;if(fw<0.3)continue;
      const side=(qx*uy-qy*ux)>0?1:-1;const w=(1.1-qd)*fw*(q.moving?0.5:1);ax+=-uy*side*w;ay+=ux*side*w;}
    if(ax||ay){ux+=ax*0.9;uy+=ay*0.9;const l=Math.hypot(ux,uy)||1;ux/=l;uy/=l;}}
  o.dvx=ux*sp;o.dvy=uy*sp;
  o.stk+=dt;if(o.stk>0.7){const moved=dist(o.x,o.y,o.stx,o.sty);if(moved<0.12*o.stk*o.speed*TUNE.moveMul/3){o.stuck++;o.needRepath=true;}else o.stuck=0;o.stk=0;o.stx=o.x;o.sty=o.y;}
  return true;
}
// 直接靠近一個移動目標：看得到就直走，看不到才用 A*
function chase(o,dt,tx,ty,range,spMul){
  const d=dist(o.x,o.y,tx,ty);
  if(d<=range){o.dvx=o.dvy=0;o.path=[];return true;}
  if(o.repath<=0||!o.path.length||o.needRepath){o.repath=0.5+rnd()*0.3;
    if(d<12&&los(o.x,o.y,tx,ty,Math.max(0.3,(o.r||0.3)+0.02))){o.path=[{x:tx,y:ty}];o.needRepath=false;}else pathTo(o,tx,ty);}
  else if(o.path.length===1){
    const g=o.path[0];
    if(Math.hypot((g.x||0)-tx,(g.y||0)-ty)>0.35&&typeof los==='function'&&!los(o.x,o.y,tx,ty,Math.max(0.3,(o.r||0.3)+0.02))){o.path=[];o.repath=0;}
    else o.path[0]={x:tx,y:ty};
  }
  followPath(o,dt,spMul);return false;
}
function approachRect(o,dt,i0,j0,s,reach){
  if(distRect(o.x,o.y,i0,j0,s)<=reach){o.dvx=o.dvy=0;o.path=[];return true;}
  if(!o.path.length||o.needRepath||o.repath<=0){o.repath=4;if(!pathToRect(o,i0,j0,s))return null;}
  followPath(o,dt);if(o.stuck>=6)return null;return false;
}
// 空間雜湊：分離與避讓
const NBC=2;let NBmap=new Map();
function nbBuild(list){NBmap=new Map();for(const o of list){const k=((o.x/NBC)|0)*1000+((o.y/NBC)|0);let a=NBmap.get(k);if(!a){a=[];NBmap.set(k,a);}a.push(o);}NB=NBmap;}
function nbQuery(x,y){const out=[],cx=(x/NBC)|0,cy=(y/NBC)|0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=NBmap.get((cx+a)*1000+cy+b);if(l)for(const o of l)out.push(o);}return out;}
function separate(list){
  // t1409u: no passive unit-contact pushing; terrain collision and skill knockback remain separate.
}

// ================== 戰鬥 ==================
function hasAb(u,ab){for(let r=1;r<=u.realm;r++)if(REALMS[r].ab===ab)return true;return false;}
function meleeHit(u,e){let dmg=u.atk*(0.85+rnd()*0.3);if(BODIES[u.body].n==='寒冰體'||isXW(u))e.slowT=2;dmgEnemy(u,e,dmg);u.cd=1.0;u.anim=0.25;}
function dmgEnemy(src,e,amt,col){
  if(e.dead)return;e.hp-=amt;floater(e.x,e.y,'-'+Math.round(amt),col||'#ffd0a0');
  if(e.hp<=0){killEnemy(src,e);return;}
  if(src&&src.kind&&(!e.target||e.target.k!=='u')&&!e.flee)e.target={k:'u',id:src.id};
  if(e.raid&&e.hp<e.maxhp*0.2&&!e.flee&&ENEMY[e.type].human){e.flee=true;e.target=null;e.path=[];floater(e.x,e.y,'逃跑！','#ffb0a0');}
}
function killEnemy(src,e){
  e.dead=true;const idx=S.enemies.indexOf(e);if(idx>=0)S.enemies.splice(idx,1);S.stats.kills++;const D=ENEMY[e.type];
  if(D.food){S.res.food+=D.food;floater(e.x,e.y,`+${D.food} 食物`,RES_COL.food);}
  if(D.human&&e.type!=='militia'){const iron=2+e.realm*2;S.res.iron+=iron;floater(e.x,e.y-0.3,`+${iron} 鐵礦`,RES_COL.iron);}
  const xv=Math.round(D.xiu*(1+e.realm*0.5));
  if(src&&src.kind)gainXiu(src,xv);
  for(const u of S.units)if(u!==src&&!u.dead&&dist(u.x,u.y,e.x,e.y)<6)gainXiu(u,Math.round(xv*0.3));
  if(!D.human)questHuntKill(e);
  if(e.type==='king'){S.flags.kingDead=true;toast('石甲妖王倒下了！遺跡的封印鬆動了');}
  if(e.raid)checkRaids();
}
function dmgUnit(src,u,amt){
  if(u.dead)return;
  if(u.shield>0){const a=Math.min(u.shield,amt);u.shield-=a;amt-=a;if(a>0)floater(u.x,u.y,'護體','#9fe0ff');}
  if(amt<=0)return;
  u.hp-=amt;u.lastHit=S.time;if(u.medit){u.medit=false;}
  floater(u.x,u.y,'-'+Math.round(amt),'#ff7070');
  if(u.kind==='disciple'&&src&&!(typeof xmvOn==='function'&&xmvOn(u))&&!(u.xcmd&&S.time<u.xcmd.until)&&(!u.task||!['attack','move'].includes(u.task.type))&&!u.dash){u.prevTask=u.task&&u.task.type!=='attack'?u.task:null;u.task={type:'attack',eid:src.id};u.path=[];}
  if(u.hp<=0){
    if(u.kind==='player'){onPlayerDeath(u);}
    else{S.units=S.units.filter(x=>x!==u);selUnits=selUnits.filter(id=>id!==u.id);toast(`弟子「${u.name}」不幸隕落……`);}
    for(const w of S.enemies)if(w.target&&w.target.k==='u'&&w.target.id===u.id)w.target=null;
  }
}
function bName(b){if(b.type==='altar'&&b.up)return '求仙台';if(b.type==='house'&&S.flags.xian)return '洞府';return BUILD[b.type].name;}
function dmgBuilding(src,b,amt){
  if(b.broken)return;b.hp-=amt;floater(b.i+BUILD[b.type].size/2,b.j+BUILD[b.type].size/2,'-'+Math.round(amt),'#ffb070');b.hitT=S.time;
  if(b.hp<=0){b.hp=0;b.broken=true;toast(`「${bName(b)}」被打壞了！派人修繕才能恢復功能`);
    for(const u of S.units)if(u.jobB===b.id)u.jobB=null;}
}
function dmgStruct(src,s,amt){
  if(s.dead||!s.maxhp)return;s.hp-=amt;floater(s.i+s.s/2,s.j+s.s/2,'-'+Math.round(amt),'#ffd0a0');
  const v=vById(s.vid);
  if(v&&v.type==='bandit'){for(const e of S.enemies)if(e.camp===v.id&&!e.raid&&!e.target&&dist(e.x,e.y,s.i,s.j)<12&&src)e.target={k:'u',id:src.id};}
  if(s.hp<=0){s.hp=0;s.dead=true;rebuildBlock();chunkDirtyAt(s.i,s.j);
    if(s.type==='chief'&&v)campDestroyed(v);else toast(`摧毀了${VS[s.type].name}`);}
}
function tryAbilities(u,e,manual){
  if(!e||u.dash)return false;const d=dist(u.x,u.y,e.x,e.y);
  if(hasAb(u,'guard')&&!(u.acd.guard>0)&&(u.hp<u.maxhp*0.65||manual)){u.shield=Math.round(u.maxhp*0.4);u.shieldT=8;u.acd.guard=ABIL.guard.cd;fx('ring',u.x,u.y,'#9fe0ff');floater(u.x,u.y,'氣勁護體','#9fe0ff');if(!manual)return true;}
  if(hasAb(u,'fireball')&&!(u.acd.fireball>0)&&d<=6&&los(u.x,u.y,e.x,e.y,0.05)){projectiles.push({x:u.x,y:u.y,tid:e.id,src:u.id,dmg:u.atk*2.2,t:0});u.acd.fireball=ABIL.fireball.cd;u.anim=0.3;faceTo(u,e.x,e.y);floater(u.x,u.y,'火球','#ffb060');return true;}
  if(hasAb(u,'sweep')&&!(u.acd.sweep>0)){const near=S.enemies.filter(x=>dist(u.x,u.y,x.x,x.y)<1.9);if(near.length>=2||(manual&&near.length)){u.acd.sweep=ABIL.sweep.cd;fx('sweep',u.x,u.y,'#ffe27a');floater(u.x,u.y,'橫掃','#ffe27a');near.forEach(x=>dmgEnemy(u,x,u.atk*1.2));return true;}}
  if(hasAb(u,'charge')&&!(u.acd.charge>0)&&d>=2&&d<=5.5&&los(u.x,u.y,e.x,e.y,0.2)){u.dash={tid:e.id,t:0.6};u.acd.charge=ABIL.charge.cd;floater(u.x,u.y,'衝鋒','#ffd080');return true;}
  return false;
}
function updateDash(u,dt){
  const e=enemyById(u.dash.tid);u.dash.t-=dt;
  if(!e||u.dash.t<=0){u.dash=null;return;}
  const d=dist(u.x,u.y,e.x,e.y);
  if(d<=u.r+e.r+0.35){dmgEnemy(u,e,u.atk*1.6,'#ffe080');if(!e.dead){if(typeof xnStun==='function')xnStun(e,0.9,u);else e.stun=0.9;}fx('ring',e.x,e.y,'#ffd080');u.dash=null;u.cd=0.6;u.dvx=u.dvy=0;return;}
  u.dvx=(e.x-u.x)/d*11;u.dvy=(e.y-u.y)/d*11;u.vx=u.dvx;u.vy=u.dvy;faceTo(u,e.x,e.y);
}
function updateProjectiles(dt){
  for(const p of projectiles){p.t+=dt;const e=enemyById(p.tid);if(!e){p.dead=true;continue;}
    const d=dist(p.x,p.y,e.x,e.y),mv=10*dt;
    if(d<=mv+0.3){const src=unitById(p.src);dmgEnemy(src,e,p.dmg,'#ffb060');for(const o of S.enemies.slice())if(o!==e&&dist(o.x,o.y,e.x,e.y)<1.1)dmgEnemy(src,o,p.dmg*0.6,'#ffb060');fx('boom',e.x,e.y,'#ff9040');p.dead=true;}
    else{p.x+=(e.x-p.x)/d*mv;p.y+=(e.y-p.y)/d*mv;}
    if(p.t>3)p.dead=true;}
  projectiles=projectiles.filter(p=>!p.dead);
}
// #206：委託「討伐妖獸」——已接下、未逾期的委託，任何人（主角、弟子、技能／範圍傷害、聯機成員）在任何地方（含秘境）擊殺妖獸都算
function questHuntKill(e){if(!e||(ENEMY[e.type]&&ENEMY[e.type].human))return;for(const v of S.villages){const q=v.quest;if(!q||q.type!=='hunt'||q.done||!q.accepted)continue;if(q.deadline&&S.time>q.deadline)continue;
  if(q.got<q.count){q.got=Math.min(q.count,q.got+1);try{floater(e.x,e.y-0.6,`委託 ${q.got}/${q.count}`,'#ffd34d');if(q.got>=q.count)toast(`${v.name}的委託「討伐妖獸」已達成，回村莊回報完成`);if(typeof renderTradeSoon==='function')renderTradeSoon();}catch(err){}}}}
