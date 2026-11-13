// ================== g31_swordfly.js：御劍穿越後的飛行速度（不改 cult_fly.js）==================
// 插在 g30_bldtable.js 之後（cult_fly／net25 已載入）。
// cult_fly 的速度常數原本是 1.10／1.18，走路幾乎感覺不出差別。這裡改成約 2.5 倍（隨境界略增，上限 3.5）。
// 搖桿／尋路在淺水的 0.6 倍減速、道路 1.1 倍，飛行時取消，避免飛過水面反而變慢。
// 碰撞穿越見 g23.js 的 v161FlyPass（v161Out／v161Wd 在飛行時不推出）。
(function(){
  const CFG=window.CULT_FLY_CFG||(window.CULT_FLY_CFG={});
  CFG.speedMul=2.5;
  CFG.selfSpeedMul=2.6;
  if(CFG.speedMulPerRealm==null)CFG.speedMulPerRealm=0.2;
  if(CFG.speedMulCap==null)CFG.speedMulCap=3.5;
  if(CFG.selfSpeedBonus==null)CFG.selfSpeedBonus=0.1;
  function swordFlyMul(u){
    if(!u||!u.flyOn)return 1;
    const base=CFG.speedMul||2.5;
    const step=CFG.speedMulPerRealm||0;
    const cap=CFG.speedMulCap||3.5;
    const need=CFG.realmNeed||5;
    const r=Math.max(0,((u.realm)|0)-need);
    const bonus=(u.flyMode==='self')?(CFG.selfSpeedBonus||0):0;
    return Math.min(cap, base+r*step+bonus);
  }
  function flyOn(o){
    if(!o||!o.flyOn)return false;
    try{if(typeof S!=='undefined'&&S&&S.dg)return false;}catch(e){}
    return true;
  }
  function haveMul(o){
    return o&&o.flyMode==='self'?(CFG.selfSpeedMul||CFG.speedMul||2.5):(CFG.speedMul||2.5);
  }
  if(typeof moveEntity==='function'&&!moveEntity._swordFlySpd){
    const _me=moveEntity;
    moveEntity=function(o,dt){
      if(flyOn(o)){
        const want=swordFlyMul(o),have=haveMul(o)||1,adj=want/have;
        const odx=o.dvx,ody=o.dvy;
        o.dvx=(o.dvx||0)*adj;o.dvy=(o.dvy||0)*adj;
        try{return _me.apply(this,arguments);}
        finally{o.dvx=odx;o.dvy=ody;}
      }
      return _me.apply(this,arguments);
    };
    moveEntity._swordFlySpd=1;
  }
  function stripTerrain(o,dvx,dvy){
    let t=1;
    try{
      const ti=Math.floor(o.x),tj=Math.floor(o.y);
      if(typeof inMap==='function'&&inMap(ti,tj)&&typeof T!=='undefined'&&terrain[tj*N+ti]===T.SHALLOW)t/=0.6;
    }catch(e){}
    try{if(typeof xroadHas==='function'&&xroadHas(o.x,o.y))t/=1.1;}catch(e2){}
    return {x:dvx*t,y:dvy*t};
  }
  if(typeof updatePlayer==='function'&&!updatePlayer._swordFlySpd){
    const _up=updatePlayer;
    updatePlayer=function(u,dt){
      const r=_up.apply(this,arguments);
      try{
        if(flyOn(u)&&u.manual&&(u.dvx||u.dvy)){
          const v=stripTerrain(u,u.dvx,u.dvy);u.dvx=v.x;u.dvy=v.y;
        }
      }catch(e){}
      return r;
    };
    updatePlayer._swordFlySpd=1;
  }
  if(typeof followPath==='function'&&!followPath._swordFlySpd){
    const _fp=followPath;
    followPath=function(o,dt,spMul){
      const r=_fp.apply(this,arguments);
      try{
        if(flyOn(o)&&(o.dvx||o.dvy)){
          const v=stripTerrain(o,o.dvx,o.dvy);o.dvx=v.x;o.dvy=v.y;
        }
      }catch(e){}
      return r;
    };
    followPath._swordFlySpd=1;
  }
  if(window.CultFly){
    CultFly.speedMulOf=swordFlyMul;
    CultFly.swordFlyMul=swordFlyMul;
  }
  try{
    if(window.XW)XW.swordFly={mul:swordFlyMul,cfg:CFG};
  }catch(e){}
})();
