// ================== cult_enemy.js：宗師以上敵人護盾／回血（旗標預設 ON）==================
// 插入：cult_life.js 之後。不改 build.py／net*／service-worker。
// 公式沿用玩家 gqMaxFor／gqType／v49 回充與 (3+realm*1.5) 回血，全部 × CULT_ENEMY_CFG.frac（預設 0.8）。
(function(){
'use strict';
if(typeof CULT_FLAGS==='undefined')window.CULT_FLAGS={};
if(CULT_FLAGS.enemyShield==null)CULT_FLAGS.enemyShield=true;

const CULT_ENEMY_CFG={
  frac:0.8,                 // 護盾上限、護盾回充、回血速度＝同境玩家公式 × 此值
  outHitSec:5,              // 與玩家相同：脫戰此秒數後用自然回血
  saveVer:1
};
window.CULT_ENEMY_CFG=CULT_ENEMY_CFG;

function on(){return !!(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.enemyShield);}
function hostAuth(){
  try{if(typeof v49Client==='function'&&v49Client())return false;}catch(e){}
  try{
    const n=(typeof XW!=='undefined'&&XW&&XW.net)||(window.XW&&XW.net)||null;
    if(n&&n.role==='client')return false;
  }catch(e2){}
  return true;
}
function zongshiIdx(){
  try{
    const R=(typeof REALMS!=='undefined'&&REALMS)||(window.XW&&XW.REALMS)||null;
    if(R){const i=R.findIndex(r=>r&&r.n==='宗師');if(i>=0)return i;}
  }catch(e){}
  return 3;
}
function isEnemy(e){return !!(e&&e.type&&!e.kind);}
function eligible(e){return !!(on()&&isEnemy(e)&&!e.dead&&(e.realm|0)>=zongshiIdx());}

function playerGqMax(u){
  try{if(typeof gqMaxFor==='function')return gqMaxFor(u)|0;}catch(e){}
  return 0;
}
function typeOf(u){
  try{if(typeof gqType==='function')return gqType(u);}catch(e){}
  if(!u)return null;
  return (u.realm|0)>=4?'ling':(u.realm|0)===zongshiIdx()?'gang':null;
}

function sync(e){
  if(!eligible(e)){
    if(e&&(e.gqMax||e.gqT==='gang'||e.gqT==='ling')&&!e.dead&&isEnemy(e)&&(e.realm|0)<zongshiIdx()){
      e.gqMax=0;e.gq=0;e.gqT=null;
    }
    return;
  }
  const gm=Math.round(playerGqMax(e)*CULT_ENEMY_CFG.frac);
  if(e.gqMax!==gm){
    const f=e.gqMax>0&&e.gq!=null?e.gq/e.gqMax:1;
    e.gqMax=gm;
    e.gq=gm?Math.round(gm*Math.max(0,Math.min(1,f))):0;
  }
  if(e.gq==null)e.gq=e.gqMax||0;
  e.gqT=typeOf(e);
}

function hpRegenPerSec(realm){return (3+(realm||0)*1.5)*CULT_ENEMY_CFG.frac;}
function shRechargePerSec(e){
  const refill=(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.gqRefill)||2;
  return (e&&e.gqMax>0)?(e.gqMax/refill):0;
}

function inCombat(e){
  if(!e)return false;
  if(e.flee)return true;             // 逃走視為戰鬥中，不啟動脫戰回血／回盾
  const now=(typeof S!=='undefined'&&S&&S.time)||0;
  const last=e.lastHit==null?-99:e.lastHit;
  return now-last<=CULT_ENEMY_CFG.outHitSec;
}
function tick(e,dt){
  if(!e||e.dead||!dt)return;
  if(!eligible(e))return;
  sync(e);
  if(!hostAuth())return;
  if((e.gqCd||0)>0)e.gqCd=Math.max(0,e.gqCd-dt);
  if(inCombat(e))return;             // 受擊中或逃走：不回血、不回盾
  // t1422u: gate boss keeps existing 80%-of-player shield recovery, never passive HP healing.
  if(e.type!=='xfboss'&&e.hp<e.maxhp){
    const base=(3+(e.realm||0)*1.5)*dt*CULT_ENEMY_CFG.frac;
    e.hp=Math.min(e.maxhp,e.hp+base);
  }
  if(!(e.gqMax>0))return;
  const refill=(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.gqRefill)||2;
  if(e.gq<e.gqMax)e.gq=Math.min(e.gqMax,e.gq+e.gqMax/refill*dt);
}

function absorb(src,e,amt){
  if(!eligible(e)||!(amt>0))return amt;
  sync(e);
  if(!(e.gqMax>0))return amt;
  const sr=(src&&src.realm)||0;
  let f=1,skip=false;
  if(e.gqT==='gang'){if(sr>=5)skip=true;else if(sr===4)f=1.2;}
  if(skip)return amt;
  const cd=(typeof TUNE!=='undefined'&&TUNE.v49&&TUNE.v49.gqCd)||8;
  e.gqCd=cd;
  if(typeof S!=='undefined'&&S)e.lastHit=S.time;
  if(e.gq>0){
    const need=amt*f,a=Math.min(e.gq,need);
    e.gq-=a;amt-=a/f;
    try{e._gqHit=performance.now();}catch(er){}
    if(!e._gqF||(typeof S!=='undefined'&&S&&S.time-e._gqF>1.2)){
      e._gqF=S&&S.time||0;
      try{floater(e.x,e.y-0.3,e.gqT==='gang'?'罡氣':'靈氣護體',e.gqT==='gang'?'#ffd98a':'#9fe8ff');}catch(er){}
    }
    if(e.gq<=0){e.gq=0;try{fx('ring',e.x,e.y,'#ffffff');}catch(er){}}
  }
  return amt;
}

try{
  if(typeof dmgEnemy==='function'){
    const _de=dmgEnemy;
    dmgEnemy=function(src,e,amt,col){
      try{
        if(e&&!e.dead&&amt>0){
          if(typeof S!=='undefined'&&S)e.lastHit=S.time;
          if(eligible(e)){
            amt=absorb(src,e,amt);
            if(amt<=0.01)return;
          }
        }
      }catch(err){}
      return _de.call(this,src,e,amt,col);
    };
  }
}catch(e){console.warn('cult_enemy dmg',e);}

try{
  if(typeof updateEnemy==='function'){
    const _ue=updateEnemy;
    updateEnemy=function(e,dt,ct){
      // Soul-form owners remain in S.enemies for revival; a dead body must not run lower combat AI.
      if(!e||e.dead)return;
      try{tick(e,dt);}catch(err){}
      return _ue.apply(this,arguments);
    };
  }
}catch(e){console.warn('cult_enemy tick',e);}

try{
  if(typeof bar==='function'){
    const _bar=bar;
    bar=function(x,y,w,frac,col){
      const r=_bar.apply(this,arguments);
      try{
        const e=typeof V51!=='undefined'&&V51.cur;
        if(e&&eligible(e)&&e.gqMax>0&&!e._ceSh){
          e._ceSh=1;
          if(typeof v49ShBar==='function')v49ShBar(e,x,y-5,w);
        }
      }catch(err){}
      return r;
    };
  }
  if(typeof drawBeast==='function'){
    const _db=drawBeast;
    drawBeast=function(e){
      if(e)e._ceSh=0;
      return _db.apply(this,arguments);
    };
  }
}catch(e){console.warn('cult_enemy bar',e);}

try{
  if(typeof EN_KEEP!=='undefined'&&Array.isArray(EN_KEEP)){
    for(const k of ['gq','gqMax','gqT','gqCd','lastHit'])if(EN_KEEP.indexOf(k)<0)EN_KEEP.push(k);
  }
}catch(e){}

const API={
  cfg:CULT_ENEMY_CFG,
  on:on,
  zongshiIdx:zongshiIdx,
  eligible:eligible,
  sync:sync,
  tick:tick,
  playerGqMax:playerGqMax,
  hpRegenPerSec:hpRegenPerSec,
  shRechargePerSec:shRechargePerSec,
  hostAuth:hostAuth
};
window.CultEnemy=API;
window.XW_ENEMY=API;
try{if(window.Cult)Cult.enemy=API;}catch(e){}
})();
