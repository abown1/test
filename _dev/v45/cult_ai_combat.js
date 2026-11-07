// ================== cult_ai_combat.js：戰鬥判斷／求援／切磋 ==================
(function(){
const CFG={
  helpR:8,                 // 待確認：附近求援半徑
  sectHelpR:22,            // 待確認：舊宗門求援半徑（已不再直接使用，改 helpChainR）
  helpChainR:6,            // 待確認：求援單跳半徑，避免 22 格無限串遠方弟子
  helpChainMax:2,          // 待確認：單次求援人數上限
  retreatOdds:0.42,        // 待確認：判定不利則撤退門檻（勝率低於此）
  threatMul:1.35,          // 待確認：高境威脅係數／境差
  threatRange:7,           // 待確認：對高境單位威脅感知距離
  judgeCd:2.5,             // 待確認：再判定間隔秒
  retreatHp:0.22,          // 待確認：強制撤退血量
  sparR:2.8,               // 待確認：試煉場切磋距離
  sparCd:36,               // 待確認：原 12 遊戲秒。沒有玩家指定的目標頻率，先保守降為 3 倍，仍走 S.time（已含遊戲速度）
  sparScan:4,              // 待確認：整場掃描間隔（遊戲秒）。原為每個 Cult.tick 都掃
  sparExp:8,               // 待確認：切磋戰鬥經驗（dualExp 開啟才入帳）
  sparDmg:0.08             // 待確認：既有非致命扣血，本次不提高、不另加
};
window.CULT_JUDGE_CFG=CFG;
function cjDisc(u){if(!u||u.dead)return false;try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u))return false;}catch(ex){}if(u.kind==='player'||u.np)return false;return u.kind==='disciple';}
function cjOn(k){return typeof CULT_FLAGS!=='undefined'&&!!CULT_FLAGS[k];}
function cjEmit(t,d){try{if(window.Cult&&Cult.emit)Cult.emit(t,d);}catch(e){}}
function cjPower(u){
  if(!u)return 0;
  const r=(u.realm||0)+1;
  return (u.atk||1)*1.2+(u.maxhp||10)*0.08+r*r*4+(u.def||0)*0.5+(typeof cultMul==='function'?cultMul(u):1)*2;
}
function cjJudge(u,e){
  if(!u||!e)return {odds:0.5,help:false,retreat:false};
  const p=cjPower(u),q=cjPower(e);
  let odds=p/(p+q+1e-6);
  const mates=(S.units||[]).filter(o=>cjDisc(o)&&o!==u&&dist(o.x,o.y,u.x,u.y)<CFG.helpR);
  const extra=mates.reduce((s,o)=>s+cjPower(o)*0.55,0);
  const oddsWith= (p+extra)/(p+extra+q+1e-6);
  // 近戰弟子不可因勝算偏低（例如對上更強的遺跡石傀）就往後撤；只在重傷／低血時撤退
  let badly=false;
  try{
    const hpR=u.hp/(u.maxhp||1);
    badly=hpR<CFG.retreatHp||!!u.cultWound;
    if(!badly&&u.inj){
      const k=u.inj.k||u.inj.kind||u.inj.type||'';
      if(k==='heavy'||k==='meridian'||k==='重傷'||k==='zhongshang')badly=true;
    }
  }catch(ex){badly=(u.hp/(u.maxhp||1))<CFG.retreatHp;}
  const retreat=badly;
  return {odds:odds,oddsWith:oddsWith,help:retreat&&mates.length===0,retreat:retreat,mates:mates.map(m=>m.id)};
}
function cjCallHelp(u,e,j){
  if(!cjOn('combatJudge')||!cjDisc(u))return [];
  if(window.CultAI&&CultAI.aggroCanRelay&&!CultAI.aggroCanRelay(u))return [];
  const now=S.time||0;if((u._cjHelpT||0)>now)return [];
  u._cjHelpT=now+CFG.judgeCd;
  const hop=CFG.helpChainR!=null?CFG.helpChainR:6;
  const cap=CFG.helpChainMax!=null?CFG.helpChainMax:2;
  const near=(S.units||[]).filter(o=>cjDisc(o)&&o!==u&&!o.inside&&dist(o.x,o.y,u.x,u.y)<hop)
    .sort((a,b)=>dist(a.x,a.y,u.x,u.y)-dist(b.x,b.y,u.x,u.y));
  const called=[];
  for(const o of near){
    if(called.length>=cap)break;
    if(o.task&&o.task.type==='attack')continue;
    try{if(cjHasOrder(o))continue;}catch(ex){}
    if(window.CultAI&&CultAI.aggroHelpAllowed&&!CultAI.aggroHelpAllowed(o,e))continue;
    if(typeof setTask==='function'&&e)setTask(o,{type:'attack',eid:e.id,x:e.x,y:e.y});
    if(window.CultAI&&CultAI.aggroMarkHelp)CultAI.aggroMarkHelp(o);
    called.push(o.id);
  }
  if(called.length){if(typeof floater==='function')floater(u.x,u.y,'求援！','#ffd27a');cjEmit('cult:help',{id:u.id,called:called,eid:e&&e.id});}
  return called;
}
function cjHasOrder(u){
  if(!u||u.dead)return false;
  try{if(u.task&&u.task.type==='move')return true;}catch(ex){}
  try{if(typeof xPlayerOrder==='function'&&xPlayerOrder(u))return true;}catch(ex){}
  try{if(u.xcmd&&typeof S!=='undefined'&&S.time<u.xcmd.until)return true;}catch(ex){}
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(ex){}
  try{if(u.task&&u.task.man)return true;}catch(ex){}
  return false;
}
function cjRetreat(u,e){
  if(!cjOn('combatJudge')||!cjDisc(u))return false;
  try{if(cjHasOrder(u))return false;}catch(ex){try{if(u.task&&u.task.man)return false;}catch(ex2){return false;}}
  const c=typeof sectCenter==='function'?sectCenter():(S.home||{x:u.x-3,y:u.y-3});
  const hx=c.x+1,hy=c.y+1;
  u.cultRetreat=true;
  if(typeof setTask==='function')setTask(u,{type:'move',x:hx,y:hy});
  if(typeof pathTo==='function')pathTo(u,hx,hy);
  if(typeof floater==='function')floater(u.x,u.y,'撤退','#c8d4e8');
  cjEmit('cult:retreat',{id:u.id,eid:e&&e.id});
  return true;
}
function cjThreat(u,e){
  if(!cjOn('combatJudge')||!cjDisc(u)||!e)return 1;
  const dr=(e.realm||0)-(u.realm||0);
  if(dr<=0)return 1;
  const t=1+dr*CFG.threatMul*0.25;
  u.cultThreat=t;
  return t;
}
function cjPickTarget(u,x,y,r){
  if(!cjOn('combatJudge')||!u||!cjDisc(u))return null;
  let best=null,bestS=-1;
  const ox=x!=null?x:u.x,oy=y!=null?y:u.y;
  const R=r!=null?r:CFG.threatRange*1.6;
  const list=(S&&S.enemies)||[];
  for(const e of list){
    if(!e||e.dead||e.hp<=0)continue;
    if(window.CultAI&&CultAI.aggroContext&&CultAI.aggroContext()===u&&!CultAI.aggroCandidate(u,e))continue;
    const d=dist(ox,oy,e.x,e.y);if(d>=R)continue;
    const dr=Math.max(0,(e.realm||0)-(u.realm||0));
    const score=(1+dr*CFG.threatMul)/Math.max(0.6,d);
    if(score>bestS){bestS=score;best=e;}
  }
  return best;
}
function cjIsYard(u){
  if(!S||!S.buildings)return false;
  return S.buildings.some(b=>b&&!b.broken&&(b.type==='training'||b.type==='yard'||b.type==='lianwu')&&Math.abs((u.x)-(b.i+ (b.w||BUILD&&BUILD[b.type]&&BUILD[b.type].size||2)/2))<CFG.sparR+1.5&&Math.abs((u.y)-(b.j+(BUILD&&BUILD[b.type]&&BUILD[b.type].size||2)/2))<CFG.sparR+1.5);
}
function cjNearYard(u){
  if(!S||!S.buildings)return null;
  let best=null,bd=1e9;
  for(const b of S.buildings){
    if(!b||b.broken)continue;
    if(b.type!=='training'&&b.type!=='yard'&&b.type!=='lianwu'&&!(BUILD&&BUILD[b.type]&&/練|試煉|演武/.test(BUILD[b.type].name||'')))continue;
    const cx=b.i+(BUILD[b.type].size||2)/2,cy=b.j+(BUILD[b.type].size||2)/2;
    const d=dist(u.x,u.y,cx,cy);if(d<bd){bd=d;best={b:b,x:cx,y:cy,d:d};}
  }
  if(best&&best.d<=CFG.sparR+1.2)return best;
  return null;
}
function cjManual(u){return !!(u&&u.manualUntil!=null&&isFinite(+u.manualUntil)&&(S.time||0)<+u.manualUntil);}
function cjSparPair(a,b){
  if(!cjOn('sparring')||!cjDisc(a)||!cjDisc(b))return false;
  if(a===b||a.hp<=1||b.hp<=1)return false;
  if(cjManual(a)||cjManual(b))return false;
  const now=S.time||0;
  if((a._sparT||0)>now||(b._sparT||0)>now)return false;
  if(!cjNearYard(a)||!cjNearYard(b))return false;
  if(dist(a.x,a.y,b.x,b.y)>CFG.sparR)return false;
  const dmgA=Math.max(1,Math.floor(b.maxhp*CFG.sparDmg));
  const dmgB=Math.max(1,Math.floor(a.maxhp*CFG.sparDmg));
  a.hp=Math.max(1,a.hp-dmgA);b.hp=Math.max(1,b.hp-dmgB);
  a._sparT=now+CFG.sparCd;b._sparT=now+CFG.sparCd;
  a.cultSpar=b.id;b.cultSpar=a.id;
  if(window.Cult&&typeof Cult.addCombatExp==='function'&&typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.dualExp){
    Cult.addCombatExp(a,CFG.sparExp);Cult.addCombatExp(b,CFG.sparExp);
  }
  if(typeof floater==='function'){floater(a.x,a.y,'切磋','#c9e4ff');floater(b.x,b.y,'切磋','#c9e4ff');}
  cjEmit('cult:spar',{a:a.id,b:b.id,exp:CFG.sparExp});
  return true;
}
function cjTick(dt){
  if(!S||!S.units)return;
  if(!cjOn('sparring'))return;
  const now=S.time||0;
  if(now<(cjTick._next||0))return;
  cjTick._next=now+(CFG.sparScan||4);
  const yards=[];
  for(const b of (S.buildings||[])){
    if(!b||b.broken)continue;
    if(b.type!=='lianwu'&&b.type!=='training'&&b.type!=='yard')continue;
    const sz=(typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size)||2;
    yards.push({x:b.i+sz/2,y:b.j+sz/2});
  }
  if(!yards.length)return;
  const near=[];
  for(const u of S.units){
    if(!cjDisc(u))continue;
    for(const y of yards){if(dist(u.x,u.y,y.x,y.y)<=CFG.sparR+1.2){near.push(u);break;}}
  }
  for(let i=0;i<near.length;i++){
    for(let j=i+1;j<near.length;j++){if(cjSparPair(near[i],near[j]))break;}
  }
}
const CultAICombat={
  cfg:CFG,
  judge:cjJudge,
  callHelp:cjCallHelp,
  retreat:cjRetreat,
  threat:cjThreat,
  pickTarget:cjPickTarget,
  spar:cjSparPair,
  nearYard:cjNearYard,
  power:cjPower,
  tick:cjTick
};
CultAICombat.probeNearest=function(u,r){return typeof nearestEnemy==='function'?nearestEnemy(u.x,u.y,r!=null?r:CFG.threatRange):null;};
window.CultAICombat=CultAICombat;

function cjInstall(){
  if(CultAICombat._in)return;CultAICombat._in=1;
  if(typeof updateDisciple==='function'){const _ud=updateDisciple;updateDisciple=function(u,dt){
    if(cjOn('combatJudge')&&cjDisc(u)&&u.task&&u.task.type==='attack'&&typeof enemyById==='function'){
      const e=enemyById(u.task.eid);
      if(e&&!e.dead){
        const now=S.time||0;
        if((u._cjJudgeT||0)<=now){
          u._cjJudgeT=now+CFG.judgeCd;
          const j=cjJudge(u,e);u.cultOdds=j.odds;
          if(j.retreat){let hold=false;try{hold=((u.task&&u.task.man)||(u.xcmd&&S.time<u.xcmd.until)||(typeof xPlayerOrder==='function'&&xPlayerOrder(u)));}catch(ex){try{hold=!!(u.task&&u.task.man);}catch(ex2){hold=true;}}if(!hold){if(j.help||!j.mates.length)cjCallHelp(u,e,j);cjRetreat(u,e);}}
        }
      }
    }
    return _ud.apply(this,arguments);
  };}
  if(typeof nearestEnemy==='function'){const _ne=nearestEnemy;nearestEnemy=function(x,y,r){
    if(cjOn('combatJudge')&&typeof x==='number'&&S&&S.units){
      if(!CultAICombat._neMap||CultAICombat._neAt!==S.time){
        const m=new Map();
        for(const u of S.units){if(!cjDisc(u))continue;m.set((u.x||0).toFixed(3)+','+(u.y||0).toFixed(3),u);}
        CultAICombat._neMap=m;CultAICombat._neAt=S.time;
      }
      const owner=CultAICombat._neMap.get((+x).toFixed(3)+','+(+y).toFixed(3));
      if(owner){const t=cjPickTarget(owner,x,y,r);if(t)return t;}
    }
    return _ne.apply(this,arguments);
  };}
  if(typeof meleeHit==='function'){const _mh=meleeHit;meleeHit=function(u,e){
    if(cjOn('combatJudge')&&cjDisc(u)&&e){try{const t=cjThreat(u,e);if(t>1.2&&typeof floater==='function'&&Math.random()<0.08)floater(u.x,u.y,'忌憚','#e8c07a');}catch(err){}}
    return _mh.apply(this,arguments);
  };}
}
if(typeof Cult!=='undefined')cjInstall();else setTimeout(cjInstall,0);
})();
