// ================== cult_unclump.js：戰鬥解黏／分離／圍攻槽位（P0，非新玩法，預設生效）==================
(function(){
const CFG={
  allySep:0.85,          // 待確認：同袍額外間距（疊加在半徑和之上）
  moverEnemySep:1.05,    // 待確認：移動中單位與敵的最小間距
  surroundPad:0.55,      // 待確認：圍攻槽位比近戰距離略寬，避免重疊
  slotJitter:0.17,       // 待確認：槽位角度微擾，減少同槽互撞
  escapeBoost:1.12,      // 待確認：移動令脫離時的速度加成
  maxUnits:256
};
window.CULT_UNCLUMP_CFG=CFG;

function cuPlayer(u){
  if(!u)return false;
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u))return true;}catch(ex){}
  if(u.kind==='player'||u.np)return true;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return true;}catch(ex){}
  return false;
}
function cuMoveOrder(u){
  if(!u||u.dead)return false;
  try{if(u.manual)return true;}catch(ex){}
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(ex){}
  try{if(u.xcmd&&typeof S!=='undefined'&&S.time<u.xcmd.until&&(!u.xcmd.kind||u.xcmd.kind==='move'))return true;}catch(ex){}
  try{if(u.task&&u.task.type==='move')return true;}catch(ex){}
  try{if(u._cuEsc&&typeof S!=='undefined'&&S.time<u._cuEsc)return true;}catch(ex){}
  return false;
}
function cuReach(u,e){return ((u&&u.r)||0.3)+((e&&e.r)||0.3)+0.5;}
function cuHash(id){const n=(+id||0)*0.6180339887;return n-Math.floor(n);}
function cuMates(u,e){
  const out=[];
  const list=(typeof S!=='undefined'&&S&&S.units)||[];
  const n=Math.min(list.length,CFG.maxUnits);
  for(let i=0;i<n;i++){
    const o=list[i];
    if(!o||o.dead)continue;
    if(o.kind!=='disciple'&&o.kind!=='player')continue;
    if(cuPlayer(o)&&o!==u)continue;
    if(o!==u){
      const atk=o.task&&o.task.type==='attack'&&e&&o.task.eid===e.id;
      const near=e&&typeof dist==='function'?dist(o.x,o.y,e.x,e.y)<cuReach(o,e)+2.4:false;
      if(!atk&&!near)continue;
    }
    out.push(o);
  }
  if(out.indexOf(u)<0)out.push(u);
  out.sort(function(a,b){return (a.id||0)-(b.id||0);});
  return out;
}
function cuSlot(u,e){
  if(!u||!e)return null;
  const mates=cuMates(u,e);
  const i=Math.max(0,mates.findIndex(function(x){return x===u||x.id===u.id;}));
  const n=Math.max(1,mates.length);
  const a=(i/n)*Math.PI*2+cuHash(u.id)*CFG.slotJitter;
  const R=cuReach(u,e)+CFG.surroundPad;
  return {x:e.x+Math.cos(a)*R,y:e.y+Math.sin(a)*R,i:i,n:n,R:R};
}
function cuExempt(u){
  if(!u)return false;
  if(u.flyOn||u.cultFly||u.flyMode)return true;
  if(u.flee||u.cultFled)return true;
  if(u.cultXtl||u.xtlOn||(u.task&&u.task.type==='xtl'))return true;
  try{
    if(window.XW_XTL){
      const on=typeof XW_XTL.active==='function'?!!XW_XTL.active():!!(XW_XTL.state&&XW_XTL.state()&&XW_XTL.state().on);
      if(on){
        const st=typeof XW_XTL.state==='function'?XW_XTL.state():null;
        if(!st||st.unitId==null||st.unitId===u.id)return true;
      }
    }
  }catch(ex){}
  return false;
}
function cuMarkEscape(u,sec){
  if(!u)return;
  try{u._cuEsc=((typeof S!=='undefined'&&S&&S.time)||0)+(sec||1.6);}catch(ex){}
  try{u.stuck=0;u.needRepath=true;}catch(ex2){}
}
function cuNudge(u,dx,dy){
  if(!u||cuExempt(u))return;
  const L=Math.hypot(dx,dy)||1;
  u.x+=(dx/L)*0.18;u.y+=(dy/L)*0.18;
  try{if(typeof collideTiles==='function')collideTiles(u);}catch(ex){}
}

function cuApplySeparate(list,passes){
  // t1409u: retain the public return contract without passive unit-to-unit displacement.
  return list||[];
}
function cuInstall(){
  if(window.CultUnclump&&CultUnclump._v>=3)return;
  const API={cfg:CFG,moveOrder:cuMoveOrder,slotAround:cuSlot,mates:cuMates,markEscape:cuMarkEscape,applySeparate:cuApplySeparate,exempt:cuExempt,_v:3};
  // _v=3: skip fly / 踏仙梯 / flee
  window.CultUnclump=API;

  if(typeof chase==='function'&&!chase._cultUnclump){
    const _ch=chase;
    chase=function(o,dt,tx,ty,range,spMul){
      if(o&&cuExempt(o))return _ch.apply(this,arguments);
      if(o&&cuMoveOrder(o)){
        const d=(typeof dist==='function')?dist(o.x,o.y,tx,ty):Math.hypot((o.x||0)-tx,(o.y||0)-ty);
        return d<=((range!=null)?range:0);
      }
      return _ch.apply(this,arguments);
    };
    chase._cultUnclump=1;
  }

  if(typeof fightStep==='function'&&!fightStep._cultUnclump){
    const _fs=fightStep;
    fightStep=function(u,dt,e){
      if(!u)return _fs.apply(this,arguments);
      if(cuExempt(u))return _fs.apply(this,arguments);
      if(cuMoveOrder(u))return;
      if(e&&!e.dead&&u.kind==='disciple'&&!cuPlayer(u)&&!cuMoveOrder(u)){
        try{
          const slot=cuSlot(u,e);
          if(slot&&typeof chase==='function'){
            const ds=(typeof dist==='function')?dist(u.x,u.y,slot.x,slot.y):1;
            if(ds>0.38)chase(u,dt,slot.x,slot.y,0.32);
            const reach=cuReach(u,e);
            const de=(typeof dist==='function')?dist(u.x,u.y,e.x,e.y):99;
            if(typeof faceTo==='function')faceTo(u,e.x,e.y);
            if(de<=reach+0.15&&u.cd<=0&&typeof meleeHit==='function')meleeHit(u,e);
            if(ds>0.38||de<=reach+0.35)return;
          }
        }catch(ex){}
      }
      return _fs.apply(this,arguments);
    };
    fightStep._cultUnclump=1;
  }

  if(typeof commandMove==='function'&&!commandMove._cultUnclump){
    const _cm=commandMove;
    commandMove=function(us,tx,ty,shift){
      const r=_cm.apply(this,arguments);
      try{
        for(const u of (us||[])){
          if(!u||cuExempt(u))continue;
          cuMarkEscape(u,2.2);
          if(u.task&&u.task.type==='attack'){try{if(typeof setTask==='function')setTask(u,{type:'move',x:tx,y:ty});}catch(ex){u.task={type:'move',x:tx,y:ty};}}
        }
      }catch(ex){}
      return r;
    };
    commandMove._cultUnclump=1;
  }

  if(typeof setTask==='function'&&!setTask._cultUnclump){
    const _st=setTask;
    setTask=function(u,t){
      const r=_st.apply(this,arguments);
      try{
        if(u&&!cuExempt(u)&&t&&t.type==='move')cuMarkEscape(u,2);
        // A successful new manual attack replaces the old move's escape grace immediately.
        if(u&&!cuExempt(u)&&t&&t.type==='attack'&&t.man&&u.task===t){u._cuEsc=null;u.dvx=u.dvy=0;}
      }catch(ex){}
      return r;
    };
    setTask._cultUnclump=1;
  }

  if(typeof separate==='function'&&!separate._cultUnclump){
    const _sep=separate;
    separate=function(list){
      const r=_sep.apply(this,arguments);
      try{
        cuApplySeparate(list);
      }catch(ex){}
      return r;
    };
    separate._cultUnclump=1;
  }

  function wrapUpdate(name){
    try{
      const fn=typeof window!=='undefined'?null:null;
    }catch(ex){}
  }
  if(typeof updateDisciple==='function'&&!updateDisciple._cultUnclump){
    const _ud=updateDisciple;
    updateDisciple=function(u,dt){
      try{
        if(u&&cuExempt(u))return _ud.apply(this,arguments);
        if(u&&cuMoveOrder(u)){
          if((u.stuck||0)>=4){u.stuck=0;u.needRepath=true;cuNudge(u,(Math.random()-0.5),(Math.random()-0.5));}
          if(u.task&&u.task.type==='move'&&typeof chase==='function'){/* keep move */}
        }
      }catch(ex){}
      return _ud.apply(this,arguments);
    };
    updateDisciple._cultUnclump=1;
  }
  if(typeof runTask==='function'&&!runTask._cultUnclump){
    const _rt=runTask;
    runTask=function(u,dt,t){
      try{
        if(u&&cuExempt(u))return _rt.apply(this,arguments);
        if(u&&t&&t.type==='move'&&(u.stuck||0)>=5){
          u.stuck=0;u.needRepath=true;
          cuNudge(u,(t.x||u.x)-u.x+0.3,(t.y||u.y)-u.y);
          if(u.dvx||u.dvy){u.dvx*=CFG.escapeBoost;u.dvy*=CFG.escapeBoost;}
        }
      }catch(ex){}
      return _rt.apply(this,arguments);
    };
    runTask._cultUnclump=1;
  }

  API.wrapped={
    chase:typeof chase==='function'&&!!chase._cultUnclump,
    fightStep:typeof fightStep==='function'&&!!fightStep._cultUnclump,
    separate:typeof separate==='function'&&!!separate._cultUnclump,
    commandMove:typeof commandMove==='function'&&!!commandMove._cultUnclump
  };
  API._in=1;
}
if(typeof Cult!=='undefined')cuInstall();else setTimeout(cuInstall,0);
setTimeout(cuInstall,0);
})();
