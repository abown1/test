// ================== cult_ai.js：框選弟子戰術 AI（鋒矢／方圓／散兵）==================
// 只作用於弟子（kind==='disciple' 且非成員化身 np），不套用在玩家身上。
(function(){
if(typeof CULT_FLAGS!=='undefined'){
  if(CULT_FLAGS.tacticAI==null)CULT_FLAGS.tacticAI=false;
  if(CULT_FLAGS.combatJudge==null)CULT_FLAGS.combatJudge=false;
  if(CULT_FLAGS.sparring==null)CULT_FLAGS.sparring=false;
  if(CULT_FLAGS.bibi==null)CULT_FLAGS.bibi=false;
}
const CFG={
  surroundR:1.05,         // 近戰貼身包圍（原 2.2 大於 melee reach，會前後振盪／一直後退）
  flankAng:1.15,          // 待確認：側翼夾角（弧度）
  kiteHp:0.22,            // 僅重傷／低血才風箏（對齊戰鬥判斷撤退血量）
  kiteR:3.6,              // 待確認：風箏保持距離
  rotateHp:0.22,          // 僅重傷／低血才輪替後撤
  spacing:1.15,           // 待確認：同袍最小間距
  comboMul:1.18,          // 待確認：同屬性合擊傷害
  comboR:3.5,             // 待確認：合擊距離
  healFrac:0.04,          // 待確認：輔助每次治療最大氣血比
  healCd:4,               // 待確認：治療冷卻秒
  shieldAmt:0.12,         // 待確認：互護盾＝氣血上限比
  shieldCd:8,
  aoeDodge:2.4,           // 待確認：避開敵方投射物距離
  formFeng:1.15,          // 待確認：鋒矢縱深
  formYuan:1.7,           // 待確認：方圓半徑
  formSan:2.8             // 待確認：散兵半徑
};
window.CULT_AI_CFG=CFG;

// BACKLOG #12: automatic disciple targeting only; all tuning values provisional.
const AGGRO={
  alertGuard:3.2, alertFollow:2.4, alertFollowDg:3.2, alertIdle:1.2,
  engageMelee:0.55, chaseGuard:5, chaseFollow:4.5, chaseFollowDg:5.5,
  chaseIdle:3.5, loseTarget:6.5, targetPad:0.4, contactHitPad:0.15, guardReturnRadius:0.9,
  stuckSec:3, progressMin:0.25, retrySec:4,
  helpRelaySec:5
};
window.CULT_AGGRO_CFG=AGGRO;
// Runtime-only: no save/network schema changes; never let an enemy become the guard anchor.
const aggroState=new WeakMap();
let aggroContext=null,aggroInstalled=false,aggroNearestInstalled=false,aggroFightInstalled=false;

function caiIsPlayerChar(u){
  if(!u)return false;
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u))return true;}catch(ex){}
  if(u.kind==='player'||u.np)return true;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return true;}catch(ex){}
  return false;
}
function caiDisc(u){return !!(u&&u.kind==='disciple'&&!caiIsPlayerChar(u)&&!u.dead);}
function caiFlag(){return typeof CULT_FLAGS!=='undefined'&&!!CULT_FLAGS.tacticAI;}
function caiMoveOrder(u){
  if(!u||u.dead)return false;
  try{if(u.manual)return true;}catch(ex){}
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(ex){}
  try{if(u.xcmd&&typeof S!=='undefined'&&S.time<u.xcmd.until&&u.xcmd.kind==='move')return true;}catch(ex){}
  try{if(u.task&&u.task.type==='move')return true;}catch(ex){}
  return false;
}
function caiHasOrder(u){
  // 玩家直接下令＝服從該命令（移動就離開、攻擊就打），不是停在原地吸附
  if(!u||u.dead)return false;
  if(caiMoveOrder(u))return true;
  try{if(typeof xPlayerOrder==='function'&&xPlayerOrder(u))return true;}catch(ex){}
  try{if(u.xcmd&&typeof S!=='undefined'&&S.time<u.xcmd.until)return true;}catch(ex){}
  try{if(u.task&&u.task.man)return true;}catch(ex){}
  return false;
}
function caiBadlyHurt(u){
  if(!u)return false;
  const hp=u.hp/(u.maxhp||1);
  if(hp<CFG.kiteHp)return true;
  if(u.cultWound)return true;
  try{
    if(u.inj){
      const k=u.inj.k||u.inj.kind||u.inj.type||'';
      if(k==='heavy'||k==='meridian'||k==='重傷'||k==='zhongshang')return true;
    }
  }catch(ex){}
  return false;
}
function caiIsRanged(u){return !!(u&&(u.cultRole==='ranged'||(typeof u.r==='number'&&u.r>=4)));}
function caiMeleeReach(u,e){return ((u&&u.r)||0.3)+((e&&e.r)||0.3)+0.5;}
function caiEmit(type,data){try{if(window.Cult&&Cult.emit)Cult.emit(type,data);}catch(e){}}
function caiSquads(){if(!S)return [];if(!S.cultSquads)S.cultSquads=[];return S.cultSquads;}
function caiCap(us){let best=null;for(const u of us){if(!caiDisc(u))continue;if(!best||(u.realm||0)>(best.realm||0)||((u.realm||0)===(best.realm||0)&&(u.atk||0)>(best.atk||0)))best=u;}return best;}
function caiRoleOf(u,cap){
  if(cap&&u===cap){/* 隊長仍有職分 */}
  const r=u.realm||0;
  if(r>=6||(typeof hasAb==='function'&&hasAb(u,'jindan')))return 'control';
  if((u.wu||0)>=70||u.job==='alchemy')return 'support';
  if(r>=4&&(typeof hasAb!=='function'||hasAb(u,'fireball')||hasAb(u,'flysword')))return 'ranged';
  return 'front';
}
function caiAssign(us){
  const list=(us||[]).filter(caiDisc);
  const cap=caiCap(list);
  const roles={};const out=[];
  for(const u of list){
    const role=caiRoleOf(u,cap);
    u.cultRole=role;u.cultCap=!!(cap&&u.id===cap.id);
    roles[u.id]=role;out.push({id:u.id,role:role,cap:u.cultCap,realm:u.realm||0});
  }
  return {captain:cap&&cap.id,roles:out};
}
function caiFormSlots(cx,cy,us,form,facing){
  const n=us.length,slots=new Array(n);
  const ang=facing!=null?facing:0;
  const fx=Math.cos(ang),fy=Math.sin(ang),px=-fy,py=fx;
  if(form==='fengshi'){
    slots[0]={x:cx+fx*CFG.formFeng*0.2,y:cy+fy*CFG.formFeng*0.2};
    for(let i=1;i<n;i++){const row=1+Math.floor((i-1)/2),side=(i%2)?1:-1,k=row*CFG.formFeng;
      slots[i]={x:cx-fx*k+px*side*0.85*row,y:cy-fy*k+py*side*0.85*row};}
  }else{
    const R=form==='sanbing'?CFG.formSan:CFG.formYuan;
    for(let i=0;i<n;i++){const a=ang+i/Math.max(1,n)*Math.PI*2+(form==='sanbing'?i*0.17:0);
      slots[i]={x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R};}
  }
  return slots;
}
function caiEnsureSquad(us,opt){
  opt=opt||{};
  const list=(us||[]).filter(caiDisc);
  if(!list.length)return null;
  const ids=list.map(u=>u.id).sort((a,b)=>a-b);
  const key=ids.join(',');
  let sq=caiSquads().find(s=>s.key===key);
  if(!sq){sq={id:(S.cultSqN=(S.cultSqN||1)+1),key:key,ids:ids.slice(),form:opt.form||null,tactic:opt.tactic||'auto',forced:!!opt.forced,focusId:opt.focusId||null,captain:null};
    caiSquads().push(sq);caiEmit('cult:squad',{id:sq.id,ids:sq.ids});}
  const asg=caiAssign(list);
  sq.captain=asg.captain;
  if(opt.form!=null){sq.form=opt.form;sq.forced=true;}
  if(opt.tactic!=null){sq.tactic=opt.tactic;if(opt.tactic!=='auto')sq.forced=true;}
  if(opt.focusId!=null)sq.focusId=opt.focusId;
  for(const u of list)u.cultSquad=sq.id;
  return sq;
}
function caiSquadOf(u){if(!u||u.cultSquad==null)return null;return caiSquads().find(s=>s.id===u.cultSquad)||null;}
function caiAutoTactic(sq,list,e){
  if(sq.forced&&sq.tactic&&sq.tactic!=='auto')return sq.tactic;
  const low=list.filter(caiBadlyHurt).length;
  if(low)return 'rotate';
  const ranged=list.filter(caiIsRanged).length;
  if(ranged>=list.length*0.5&&ranged>0)return 'kite';
  if(list.length>=4)return 'surround';
  if(list.length>=2)return 'flank';
  return 'focus';
}
function caiSlotAround(u,e,sq,list){
  const i=Math.max(0,list.findIndex(x=>x.id===u.id));
  const n=Math.max(1,list.length);
  const tactic=caiAutoTactic(sq,list,e);
  const cx=e.x,cy=e.y;
  if(caiHasOrder(u)||caiMoveOrder(u))return {x:u.x,y:u.y,tactic:'hold'};
  if(tactic==='surround'){
    const a=(i/n)*Math.PI*2,R=caiMeleeReach(u,e);
    return {x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R,tactic:tactic};
  }
  if(tactic==='flank'){const cap=list.find(x=>x.id===sq.captain)||list[0];
    const dx=cx-(cap.x||cx),dy=cy-(cap.y||cy),L=Math.hypot(dx,dy)||1;
    const s=i%2?1:-1;return {x:cx-(dx/L)*0.6+(-dy/L)*s*CFG.flankAng*1.6,y:cy-(dy/L)*0.6+(dx/L)*s*CFG.flankAng*1.6,tactic:tactic};}
  if(!caiHasOrder(u)&&(caiIsRanged(u)||caiBadlyHurt(u)||(tactic==='kite'&&caiIsRanged(u)))){
    const dx=u.x-cx,dy=u.y-cy,L=Math.hypot(dx,dy)||1;return {x:cx+(dx/L)*CFG.kiteR,y:cy+(dy/L)*CFG.kiteR,tactic:'kite'};}
  if(tactic==='rotate'&&caiBadlyHurt(u)){
    const cap=list.find(x=>x.id===sq.captain)||list[0];return {x:cap.x-(cx-cap.x)*0.3,y:cap.y-(cy-cap.y)*0.3,tactic:'rotate'};}
  const Rf=caiMeleeReach(u,e),af=Math.atan2((u.y||0)-cy,(u.x||0)-cx);
  return {x:cx+Math.cos(af)*Rf,y:cy+Math.sin(af)*Rf,tactic:'focus'};
}
function caiSpacing(u,list){
  for(const o of list){if(o===u)continue;const d=dist(u.x,u.y,o.x,o.y);if(d<CFG.spacing&&d>1e-3){const k=(CFG.spacing-d)/d*0.35;u.x-= (o.x-u.x)*k;u.y-=(o.y-u.y)*k;}}
}
function caiDodge(u){
  if(typeof projectiles==='undefined'||!projectiles||!projectiles.length)return;
  for(const p of projectiles){if(p.src===u.id)continue;const d=dist(u.x,u.y,p.x,p.y);if(d<CFG.aoeDodge&&d>0.1){u.x+=(u.x-p.x)/d*0.25;u.y+=(u.y-p.y)/d*0.25;return;}}
}
function caiSupport(list,dt){
  const now=S&&S.time||0;
  for(const u of list){if(u.cultRole!=='support')continue;
    if((u._caiHealT||0)>now)continue;
    const need=list.filter(o=>o!==u&&o.hp<o.maxhp*0.7).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];
    if(need){need.hp=Math.min(need.maxhp,need.hp+need.maxhp*CFG.healFrac);need.shield=Math.max(need.shield||0,need.maxhp*CFG.shieldAmt);u._caiHealT=now+CFG.healCd;if(typeof floater==='function')floater(need.x,need.y,'護持','#9fe8b0');caiEmit('cult:support',{from:u.id,to:need.id});}
  }
}
function caiSteer(u,dt,e){
  if(!caiFlag()||!caiDisc(u)||!e)return false;
  if(caiIsPlayerChar(u)||caiMoveOrder(u)||caiHasOrder(u))return false;
  const sq=caiSquadOf(u);if(!sq)return false;
  const list=(sq.ids||[]).map(id=>typeof unitById==='function'?unitById(id):null).filter(caiDisc);
  if(!list.length)return false;
  if(sq.focusId&&typeof enemyById==='function'){const f=enemyById(sq.focusId);if(f&&!f.dead)e=f;}
  const slot=caiSlotAround(u,e,sq,list);
  u.cultTactic=slot.tactic;
  const d=dist(u.x,u.y,slot.x,slot.y);
  if(d>0.45&&typeof chase==='function')chase(u,dt,slot.x,slot.y,0.4);
  caiSpacing(u,list);caiDodge(u);
  return slot.tactic==='kite'||slot.tactic==='rotate';
}
function caiOnAttack(u,t){
  if(!caiFlag()||!caiDisc(u)||caiIsPlayerChar(u)||!t||t.type!=='attack')return;
  if(caiMoveOrder(u))return;
  let sel=[];
  try{sel=(selUnits||[]).map(id=>unitById(id)).filter(caiDisc);}catch(e){}
  if(!sel.includes(u))sel=[u];
  if(sel.length<1)return;
  caiEnsureSquad(sel,{focusId:t.eid,tactic:sel.length>=2?'auto': 'focus'});
}
function caiApplyMoveForm(us,tx,ty){
  if(!caiFlag())return false;
  const ds=(us||[]).filter(caiDisc);
  if(ds.length<2)return false;
  const sq=caiEnsureSquad(ds);
  if(!sq||!sq.form)return false;
  const cap=ds.find(u=>u.id===sq.captain)||ds[0];
  const facing=Math.atan2(ty-cap.y,tx-cap.x);
  const slots=caiFormSlots(tx,ty,ds,sq.form,facing);
  // 隊長優先佔 slots[0]
  const order=ds.slice().sort((a,b)=> (b.id===sq.captain)-(a.id===sq.captain));
  order.forEach((u,i)=>{const s=slots[i]||{x:tx,y:ty};u.holdAt={x:s.x,y:s.y};
    if(typeof setTask==='function')setTask(u,{type:'move',x:s.x,y:s.y});
    if(typeof pathTo==='function')pathTo(u,s.x,s.y);
  });
  caiEmit('cult:formMove',{id:sq.id,form:sq.form,n:ds.length});
  return true;
}

function cultAggroState(u){
  let q=aggroState.get(u);
  if(!q){q={job:u.job,anchor:null,enemy:null,stall:0,retryId:null,retryAt:0,helpUntil:0};aggroState.set(u,q);}
  if(q.job!==u.job){q.job=u.job;q.anchor=null;q.enemy=null;q.stall=0;}
  return q;
}
function cultAggroAuthority(){
  try{if(typeof NET!=='undefined'&&NET.role==='client')return false;}catch(ex){}
  try{if(window.XW&&XW.net&&XW.net.role==='client')return false;}catch(ex2){}
  return true;
}
function cultAggroEligible(u){
  return caiDisc(u)&&cultAggroAuthority()&&!u.inside&&!u.retreat&&!u.cultRetreat&&
    !u.y47dn&&!u.y47dj&&!u.y47e&&!u.y47rs&&!u.v170&&!u.v171&&!u.flyOn&&
    !u.cultComa&&!u.cultBrk&&!u.cultXtl&&!(typeof S!=='undefined'&&S&&S.cultXtl);
}
function cultAggroAnchor(u){
  if(!u)return {x:0,y:0};
  const q=cultAggroState(u);
  if(u.job==='follow'){
    try{const p=typeof player==='function'?player():window.XW&&XW.player();if(p&&!p.dead)return p;}catch(ex){}
    return {x:u.x,y:u.y};
  }
  if(q.anchor)return q.anchor;
  if(u.job==='guard'){
    const p=u.gPost||u.v164g||u.guardAt||u.holdAt;
    if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))return p;
    try{if(S&&S.home)return S.home;}catch(ex){}
  }
  return {x:u.x,y:u.y};
}
function cultAggroAlert(u){
  return u.job==='guard'?AGGRO.alertGuard:u.job==='follow'?(S&&S.dg?AGGRO.alertFollowDg:AGGRO.alertFollow):AGGRO.alertIdle;
}
function cultAggroChase(u){
  return u.job==='guard'?AGGRO.chaseGuard:u.job==='follow'?(S&&S.dg?AGGRO.chaseFollowDg:AGGRO.chaseFollow):AGGRO.chaseIdle;
}
function cultAggroMelee(u,e){
  return !!(u&&e&&dist(u.x,u.y,e.x,e.y)<=(u.r||0.3)+(e.r||0.3)+AGGRO.engageMelee);
}
function cultAggroSameField(u,e){
  if(!u||!e||e.dead||!(e.hp>0)||e.inside||e.cultYS||e.type==='yuanshen')return false;
  for(const k of ['mapKey','map','dgId','region']){
    if(u[k]!=null&&e[k]!=null&&String(u[k])!==String(e[k]))return false;
  }
  // Use actual walkable connected components; don't snap an enemy across a sealed wall.
  try{
    if(typeof unitComp==='function'&&typeof compAt==='function'){
      const uc=unitComp(u),ec=compAt(e.x,e.y);
      if(uc>0&&ec>0&&uc!==ec)return false;
      if(ec===0)return false;
    }
  }catch(ex){}
  return true;
}
function cultAggroStance(u,e){
  if(!u.xco||u.xco.st==='agg')return true;
  if(u.xco.st==='avoid')return false;
  return !!(e.target&&e.target.k==='u'&&e.target.id===u.id);
}
function cultAggroKeep(u,e){
  if(!cultAggroSameField(u,e)||!cultAggroStance(u,e))return false;
  const q=cultAggroState(u),now=(S&&S.time)||0;
  if(q.retryId===e.id&&now<q.retryAt)return false;
  if(cultAggroMelee(u,e))return true; // local self-defence only; no distant chain pursuit
  if(dist(u.x,u.y,e.x,e.y)>AGGRO.loseTarget)return false;
  const a=cultAggroAnchor(u),lim=cultAggroChase(u);
  return dist(u.x,u.y,a.x,a.y)<=lim&&dist(e.x,e.y,a.x,a.y)<=lim+AGGRO.targetPad;
}
function cultAggroCandidate(u,e){
  if(!cultAggroKeep(u,e))return false;
  if(cultAggroMelee(u,e))return true;
  const a=cultAggroAnchor(u);
  return dist(a.x,a.y,e.x,e.y)<=cultAggroAlert(u);
}
function cultAggroPick(u){
  if(!u||!S||!S.enemies)return null;
  let best=null,bd=Infinity;
  for(const e of S.enemies){
    if(!cultAggroCandidate(u,e))continue;
    const d=dist(u.x,u.y,e.x,e.y);
    if(d<bd){bd=d;best=e;}
  }
  return best;
}
function cultAggroBusyOrder(u){
  if(caiMoveOrder(u)||caiHasOrder(u))return true;
  try{if(window.CultUnclump&&CultUnclump.moveOrder(u))return true;}catch(ex){}
  return false;
}
function cultAggroDrop(u,blocked){
  const q=cultAggroState(u);
  if(blocked&&u.task){q.retryId=u.task.eid;q.retryAt=((S&&S.time)||0)+AGGRO.retrySec;}
  const prev=u.prevTask;
  u.task=prev&&prev.type!=='attack'&&prev.type!=='move'?prev:null;
  u.prevTask=null;u.path=[];u.dvx=u.dvy=0;q.enemy=null;q.stall=0;
}
function cultAggroPre(u,dt){
  if(!cultAggroEligible(u)||cultAggroBusyOrder(u))return;
  const q=cultAggroState(u);
  // guardAt may legitimately advance on patrol, but is frozen while fighting.
  if(!q.anchor||!u.task||u.task.type!=='attack'){
    const a=u.job==='guard'?(u.gPost||u.v164g||u.guardAt||u.holdAt||u):u;
    q.anchor={x:a.x,y:a.y};
  }
  if(u.job==='guard'&&u.task&&u.task.type==='attack'&&q.anchor)u.guardAt={x:q.anchor.x,y:q.anchor.y};
  if(u.task&&u.task.type==='attack'&&!u.task.man){
    const e=typeof enemyById==='function'?enemyById(u.task.eid):null;
    if(!e||!cultAggroKeep(u,e)){cultAggroDrop(u);return;}
    const d=dist(u.x,u.y,e.x,e.y);
    if(q.enemy!==e.id){q.enemy=e.id;q.best=d;q.stall=0;}
    else if(d<q.best-AGGRO.progressMin){q.best=d;q.stall=0;}
    else if(!cultAggroMelee(u,e)){q.stall+=Math.max(0,dt||0);}
    else q.stall=0;
    if(q.stall>=AGGRO.stuckSec)cultAggroDrop(u,true);
  }
}
function cultAggroPost(u){
  if(!cultAggroEligible(u)||cultAggroBusyOrder(u))return;
  const q=cultAggroState(u);
  if(u.task&&u.task.type==='attack'){
    if(!u.task.man){
      if(u.job==='guard'&&q.anchor)u.guardAt={x:q.anchor.x,y:q.anchor.y};
      const e=typeof enemyById==='function'?enemyById(u.task.eid):null;
      if(!e||!cultAggroKeep(u,e))cultAggroDrop(u);
    }
    return;
  }
  const e=cultAggroPick(u);
  if(e){u.prevTask=u.task||null;u.task={type:'attack',eid:e.id};u.path=[];u.medit=false;}
}
function cultAggroHelpAllowed(u,e){
  if(!cultAggroEligible(u)||cultAggroBusyOrder(u)||!cultAggroCandidate(u,e))return false;
  return true;
}
function cultAggroMarkHelp(u){cultAggroState(u).helpUntil=((S&&S.time)||0)+AGGRO.helpRelaySec;}
function cultAggroCanRelay(u){return cultAggroState(u).helpUntil<=((S&&S.time)||0);}

const CultAI={
  cfg:CFG,
  assignRoles:caiAssign,
  formSlots:function(cx,cy,us,form,facing){return caiFormSlots(cx,cy,us||[],form,facing);},
  ensureSquad:caiEnsureSquad,
  setFormation:function(us,form){return caiEnsureSquad(us,{form:form,forced:true});},
  setTactic:function(us,tactic){return caiEnsureSquad(us,{tactic:tactic,forced:tactic!=='auto'});},
  setAuto:function(us){const sq=caiEnsureSquad(us,{tactic:'auto'});if(sq)sq.forced=false;return sq;},
  squadOf:caiSquadOf,
  steer:caiSteer,
  isDisciple:caiDisc,
  aggro:AGGRO,
  aggroAnchor:cultAggroAnchor,
  aggroAlert:cultAggroAlert,
  aggroChase:cultAggroChase,
  aggroKeep:cultAggroKeep,
  aggroPick:cultAggroPick,
  aggroCandidate:cultAggroCandidate,
  aggroHelpAllowed:cultAggroHelpAllowed,
  aggroMarkHelp:cultAggroMarkHelp,
  aggroCanRelay:cultAggroCanRelay,
  aggroContext:function(){return aggroContext;},
  tick:function(dt){
    if(!caiFlag()||!S||!S.units)return;
    const seen={};
    for(const sq of caiSquads()){
      const list=(sq.ids||[]).map(id=>typeof unitById==='function'?unitById(id):null).filter(caiDisc);
      if(list.length)caiSupport(list,dt);
    }
  }
};
CultAI.probeMelee=function(u,e){if(typeof meleeHit==='function')return meleeHit(u,e);};
CultAI.probeSetTask=function(u,task){if(typeof setTask==='function')return setTask(u,task);};
window.CultAI=CultAI;

function caiInstallG7(){
  if(CultAI._g7)return;
  if(typeof commandMove!=='function'&&typeof commandUnits!=='function')return;
  CultAI._g7=1;
  if(typeof commandUnits==='function'){const _cu=commandUnits;commandUnits=function(){
    const us=_cu.apply(this,arguments);
    try{if(caiFlag()){const ds=(us||[]).filter(caiDisc);if(ds.length>=2)caiEnsureSquad(ds);}}catch(e){}
    return us;
  };}
  if(typeof commandMove==='function'){const _cm=commandMove;commandMove=function(us,tx,ty,shift){
    // 移動指令必須先下達（含玩家本人）；不可因陣型／戰術而吞掉右鍵移動
    const r=_cm.apply(this,arguments);
    return r;
  };}
}
function caiInstall(){
  if(!CultAI._in){
  CultAI._in=1;
  try{if(typeof UNIT_KEEP!=='undefined')UNIT_KEEP.push('cultRole','cultSquad','cultCap','cultTactic','cultSpar');}catch(e){}

  if(typeof setTask==='function'){const _st=setTask;setTask=function(u,t){const r=_st.apply(this,arguments);try{caiOnAttack(u,t);}catch(e){}return r;};}
  if(typeof fightStep==='function'){const _fs=fightStep;fightStep=function(u,dt,e){
    if(caiIsPlayerChar(u)){
      if(caiMoveOrder(u))return;
      return _fs.apply(this,arguments);
    }
    if(caiMoveOrder(u))return;
    if(caiFlag()&&caiDisc(u)&&e&&!caiHasOrder(u)){try{
      if(!caiSquadOf(u)){
        const mates=(S.units||[]).filter(o=>caiDisc(o)&&!caiMoveOrder(o)&&o.task&&o.task.type==='attack'&&e&&o.task.eid===e.id);
        if(mates.length)caiEnsureSquad(mates,{focusId:e.id,tactic:'auto'});
      }
      const hold=caiSteer(u,dt,e);
      if(u.cultRole==='control'&&(e.slowT>0||e.cultCtrl)){
        e.cultCtrl=1;
        const sq=caiSquadOf(u);
        if(sq){const list=(sq.ids||[]).map(id=>typeof unitById==='function'?unitById(id):null).filter(caiDisc);
          for(const o of list){if(o!==u&&o.cultRole==='control'&&typeof tryAbilities==='function')tryAbilities(o,e);}
        }
      }
      if(hold&&!caiHasOrder(u)&&(caiIsRanged(u)||caiBadlyHurt(u)||u.cultTactic==='rotate')){
        if(u.cd<=0&&dist(u.x,u.y,e.x,e.y)<caiMeleeReach(u,e)+0.3&&typeof meleeHit==='function')meleeHit(u,e);
        return;
      }
    }catch(err){}}
    return _fs.apply(this,arguments);
  };}
  if(typeof meleeHit==='function'){const _mh=meleeHit;meleeHit=function(u,e){
    if(caiFlag()&&caiDisc(u)&&e&&u.lg&&u.lg.e!=null){
      try{const mates=(S.units||[]).filter(o=>caiDisc(o)&&o!==u&&o.lg&&o.lg.e===u.lg.e&&o.task&&o.task.type==='attack'&&o.task.eid===e.id&&dist(o.x,o.y,e.x,e.y)<CFG.comboR);
        if(mates.length){const dmg=u.atk*(0.85+(typeof rnd==='function'?rnd():0.15)*0.3)*CFG.comboMul;
          if(typeof dmgEnemy==='function'){dmgEnemy(u,e,dmg);u.cd=1;u.anim=0.25;if(typeof floater==='function')floater(e.x,e.y,'合擊','#ffe27a');caiEmit('cult:combo',{id:u.id,eid:e.id,n:mates.length+1});return;}}}catch(err){}}
    return _mh.apply(this,arguments);
  };}
  if(window.Cult&&typeof Cult.tick==='function'&&!CultAI._tk){CultAI._tk=1;const _tk=Cult.tick;Cult.tick=function(dt){const r=_tk.apply(this,arguments);try{if(window.CultAI)CultAI.tick(dt);if(window.CultAICombat)CultAICombat.tick(dt);if(window.CultBibi)CultBibi.tick(dt);}catch(e){}return r;};}
  }
  if(!aggroInstalled&&typeof updateDisciple==='function'&&typeof runTask==='function'){
    aggroInstalled=true;
    const _ud=updateDisciple;
    updateDisciple=function(u,dt){
      if(!cultAggroEligible(u))return _ud.apply(this,arguments);
      cultAggroPre(u,dt);
      const old=aggroContext;aggroContext=u;
      try{const r=_ud.apply(this,arguments);cultAggroPost(u);return r;}
      finally{aggroContext=old;}
    };
    const _rt=runTask;
    runTask=function(u,dt,tsk){
      if(cultAggroEligible(u)&&tsk&&tsk.type==='attack'&&!tsk.man&&!cultAggroBusyOrder(u)){
        const e=typeof enemyById==='function'?enemyById(tsk.eid):null;
        if(!e||!cultAggroKeep(u,e)){cultAggroDrop(u);return;}
      }
      return _rt.apply(this,arguments);
    };
  }
  // Explicit commanded guard posts must not be replaced by the sect-wide patrol route.
  if(typeof v50GuardJob==='function'&&!v50GuardJob._cultAggro){
    const _guard=v50GuardJob;
    v50GuardJob=function(u,dt){
      if(cultAggroEligible(u)&&u.job==='guard'&&u.gPost&&!cultAggroBusyOrder(u)){
        const a=u.gPost;u.guardAt={x:a.x,y:a.y};
        if(dist(u.x,u.y,a.x,a.y)>AGGRO.guardReturnRadius){
          if(typeof chase==='function')chase(u,dt,a.x,a.y,AGGRO.guardReturnRadius);
        }else{u.path=[];u.dvx=u.dvy=0;}
        return true;
      }
      return _guard.apply(this,arguments);
    };v50GuardJob._cultAggro=1;
  }
  // Map integration also dispatches directly (map_enemies.js:790-840), outside unit scans.
  if(typeof mapDefendLock==='function'&&!mapDefendLock._cultAggro){
    const _lock=mapDefendLock;
    mapDefendLock=function(u,e){
      if(caiDisc(u)){
        if(!cultAggroEligible(u)||cultAggroBusyOrder(u))return false;
        const current=u.task&&u.task.type==='attack'&&e&&u.task.eid===e.id;
        if(!(current?cultAggroKeep(u,e):cultAggroCandidate(u,e)))return false;
      }
      return _lock.apply(this,arguments);
    };mapDefendLock._cultAggro=1;
  }
  if(typeof mapDefendSend==='function'&&!mapDefendSend._cultAggro){
    const _send=mapDefendSend;
    mapDefendSend=function(us,threats){
      const e=(threats||[]).slice().sort((a,b)=>(b.hp||0)-(a.hp||0))[0];
      return _send.call(this,(us||[]).filter(u=>!caiDisc(u)||cultAggroHelpAllowed(u,e)),threats);
    };mapDefendSend._cultAggro=1;
  }
  if(typeof v50DefTick==='function'&&!v50DefTick._cultAggro){
    const _def=v50DefTick;
    v50DefTick=function(dt){
      if(!cultAggroAuthority())return _def.apply(this,arguments);
      const before=new Map();
      for(const u of S.units||[]){if(!cultAggroEligible(u)||cultAggroBusyOrder(u))continue;
        const a=cultAggroAnchor(u);before.set(u,{eid:u.task&&u.task.type==='attack'?u.task.eid:null,a:{x:a.x,y:a.y},guard:u.guardAt&&{...u.guardAt}});
      }
      const r=_def.apply(this,arguments);
      for(const [u,v] of before){
        if(!u.task||u.task.type!=='attack'||u.task.man)continue;
        const q=cultAggroState(u);if(!q.anchor)q.anchor=v.a;
        if(u.job==='guard')u.guardAt=v.guard||{...v.a};
        const e=typeof enemyById==='function'?enemyById(u.task.eid):null;
        if(!e||!(v.eid===u.task.eid?cultAggroKeep(u,e):cultAggroCandidate(u,e)))cultAggroDrop(u);
      }
      return r;
    };v50DefTick._cultAggro=1;
  }
  // Deferred: wrap the final nearestEnemy chain, not just g4's early definition.
  setTimeout(function(){
    // g23's explicit 駐守此地 writes guardAt, but g20 would otherwise resume sect patrol.
    if(typeof xcoSet==='function'&&!xcoSet._cultAggro){
      const _pos=xcoSet;
      xcoSet=function(ids,k,v){
        const r=_pos.apply(this,arguments);
        if(k==='pos'&&v==='hold'&&cultAggroAuthority())for(const id of ids||[]){
          const u=typeof unitById==='function'?unitById(id):null;
          if(!cultAggroEligible(u)||u.job!=='guard')continue;
          const a={x:u.x,y:u.y};u.gPost={...a};u.guardAt={...a};
          const q=cultAggroState(u);q.anchor=a;q.enemy=null;q.stall=0;
        }
        return r;
      };xcoSet._cultAggro=1;
    }
    if(!aggroFightInstalled&&typeof fightStep==='function'){
      aggroFightInstalled=true;
      const _contact=fightStep;
      fightStep=function(u,dt,e){
        if(cultAggroEligible(u)&&e&&!cultAggroBusyOrder(u)&&!(u.task&&u.task.man)){
          const a=cultAggroAnchor(u);
          if(dist(u.x,u.y,a.x,a.y)>cultAggroChase(u)){
            // Already outside the leash: defend in place, never chase an enemy outward.
            u.dvx=u.dvy=0;u.path=[];
            if(cultAggroKeep(u,e)&&dist(u.x,u.y,e.x,e.y)<=caiMeleeReach(u,e)+AGGRO.contactHitPad){
              if(typeof faceTo==='function')faceTo(u,e.x,e.y);
              if(u.cd<=0&&typeof meleeHit==='function')meleeHit(u,e);
            }
            return;
          }
        }
        return _contact.apply(this,arguments);
      };
    }
    if(aggroNearestInstalled||typeof nearestEnemy!=='function')return;
    aggroNearestInstalled=true;
    const _ne=nearestEnemy;
    nearestEnemy=function(x,y,r){
      const u=aggroContext;
      if(!u||!cultAggroEligible(u))return _ne.apply(this,arguments);
      if(cultAggroBusyOrder(u))return null;
      const first=_ne.apply(this,arguments);
      if(first&&cultAggroCandidate(u,first))return first;
      let best=null,bd=r;
      for(const e of S.enemies||[]){
        if(!cultAggroCandidate(u,e))continue;
        const d=dist(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}
      }
      return best;
    };
  },0);
  caiInstallG7();
}
if(typeof Cult!=='undefined')caiInstall();else setTimeout(caiInstall,0);
setTimeout(caiInstall,0);
})();
