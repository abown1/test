// ================== net22：壽元聯機殼（host 權威 worldYear；客機不積齡）==================
// 不改 cult_life.js／build.py／g*。成員 np 老化／到期等 owner 把 np 當 PC；此檔不另做第二套老化。
const NET22={v:1,wy:null,disc:0,rejoin:0};
const NET_LIFE_LIVE=['lifeAgedSec','lifeStartAge','lifeMax','lifeWarn','lifeConnected','cultLifeWeak','cultLifeSeclude','birthWorldYear'];
function netLifeOn(){try{if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS&&'life' in CULT_FLAGS)return !!CULT_FLAGS.life;if(window.XW_LIFE&&typeof XW_LIFE.on==='function')return !!XW_LIFE.on();}catch(e){}return !!(window.XW_LIFE);}
function netLifeYearSec(){try{if(window.CULT_LIFE_CFG&&CULT_LIFE_CFG.YEAR_SEC)return +CULT_LIFE_CFG.YEAR_SEC;}catch(e){}return 60;}
function netLifePlayerRec(pk){
  if(pk==null||typeof NET==='undefined'||!NET.players)return null;
  try{return NET.players.get(pk)||null;}catch(e){return null;}
}
function netLifeRecOnline(p){
  if(!p)return false;
  const pk=p.pkey!=null?p.pkey:p.pk;
  if(p.host){
    if(typeof NET!=='undefined'&&NET.role==='host')return pk!=null&&pk===NET.pkey;
    if(p.online===false||p.on===false)return false;
    return true;
  }
  return !!(p.online||p.on);
}
function netLifeFindAv(pk){
  if(!pk)return null;
  try{if(typeof netAvatarAnywhere==='function'){const a=netAvatarAnywhere(pk);if(a)return a;}}catch(e){}
  try{if(typeof netAvatarOf==='function'){const a=netAvatarOf(pk);if(a)return a;}}catch(e2){}
  return null;
}
function netLifeConnected(u){
  if(!u)return false;
  if(u.kind==='player'&&!u.np){
    if(typeof NET==='undefined'||!NET.role)return true;
    if(NET.role==='host')return true;
    return true;
  }
  if(!u.np)return false;
  return netLifeRecOnline(netLifePlayerRec(u.np));
}
function netLifeEachUnit(fn){
  const seen=new Set();
  const visit=L=>{if(!L)return;for(const u of L){if(!u||seen.has(u))continue;seen.add(u);try{fn(u);}catch(e){}}};
  try{if(S&&S.units)visit(S.units);}catch(e){}
  try{if(S&&S.dg&&S.dg.W&&S.dg.W.units)visit(S.dg.W.units);}catch(e2){}
  try{if(typeof netParkUnits==='function')visit(netParkUnits());}catch(e3){}
}
function netLifeResetClock(){
  try{NET22.wy=(S&&isFinite(+S.worldYear))?+S.worldYear:0;}catch(e){NET22.wy=0;}
}
function netLifeBindPredicate(){
  if(!window.XW_LIFE||typeof XW_LIFE.setConnectedPredicate!=='function')return false;
  XW_LIFE.setConnectedPredicate(netLifeConnected);
  return true;
}
function netLifePrevPlayers(){
  const m=new Map();
  try{
    if(typeof NET==='undefined'||!NET.players)return m;
    for(const p of NET.players.values()){
      const k=p&&(p.pkey!=null?p.pkey:p.pk);
      if(k==null)continue;
      m.set(k,{online:netLifeRecOnline(p),cid:p.cid,host:!!p.host});
    }
  }catch(e){}
  return m;
}
function netLifePrevAvPks(){
  const s=new Set();
  try{netLifeEachUnit(u=>{if(u&&u.np)s.add(u.np);});}catch(e){}
  return s;
}
function netLifeInstall(){
  if(NET22._in)return;NET22._in=1;
  if(typeof NET_LIVE_U!=='undefined'&&Array.isArray(NET_LIVE_U)){
    for(const k of NET_LIFE_LIVE)if(NET_LIVE_U.indexOf(k)<0)NET_LIVE_U.push(k);
  }
  netLifeBindPredicate();
  netLifeResetClock();
  if(typeof netCast==='function'){
    const _cast=netCast;netCast=function(m){
      try{if(m&&m.t==='st'&&typeof NET!=='undefined'&&NET.role==='host'&&S&&S.worldYear!=null)m.worldYear=+S.worldYear;}catch(e){}
      return _cast.apply(this,arguments);
    };
  }
  if(typeof netApplySt==='function'){
    const _st=netApplySt;netApplySt=function(m){
      const r=_st.apply(this,arguments);
      try{
        if(m&&m.worldYear!=null&&typeof NET!=='undefined'&&NET.role==='client'&&S)S.worldYear=+m.worldYear;
      }catch(e){}
      return r;
    };
  }
  if(typeof netHostDrop==='function'){
    const _dr=netHostDrop;netHostDrop=function(cid,why){
      let av=null;
      try{const pk=NET.cid2pk.get(cid);av=pk&&netLifeFindAv(pk);}catch(e){}
      const r=_dr.apply(this,arguments);
      try{if(av&&window.XW_LIFE&&typeof XW_LIFE.onDisconnect==='function'){XW_LIFE.onDisconnect(av);NET22.disc++;}}catch(e2){}
      return r;
    };
  }
  if(typeof netHostRx==='function'){
    const _rx=netHostRx;netHostRx=function(cid,m){
      if(!m||typeof m!=='object')return _rx.apply(this,arguments);
      if(m.t==='leave'){
        let av=null;
        try{const pk=NET.cid2pk.get(cid);av=pk&&netLifeFindAv(pk);}catch(e){}
        const r=_rx.apply(this,arguments);
        try{if(av&&window.XW_LIFE&&typeof XW_LIFE.onDisconnect==='function'){XW_LIFE.onDisconnect(av);NET22.disc++;}}catch(e2){}
        return r;
      }
      if(m.t!=='hello')return _rx.apply(this,arguments);
      const prevP=netLifePrevPlayers();
      const prevAv=netLifePrevAvPks();
      const r=_rx.apply(this,arguments);
      try{
        const pk=typeof NET!=='undefined'&&NET.cid2pk?NET.cid2pk.get(cid):null;
        if(!pk)return r;
        const p=netLifePlayerRec(pk);
        if(!p||p.cid!==cid)return r;
        if(p.host&&NET.pkey&&(p.pkey||p.pk)!==NET.pkey)return r;
        if(!netLifeRecOnline(p))return r;
        const prev=prevP.get(pk);
        if(prev&&prev.online&&prev.cid===cid)return r;
        if(!(prev||prevAv.has(pk)))return r;
        const av=netLifeFindAv(pk);
        if(av&&window.XW_LIFE&&typeof XW_LIFE.onRejoin==='function'){XW_LIFE.onRejoin(av);NET22.rejoin++;}
      }catch(e3){}
      return r;
    };
  }
  if(window.Cult&&typeof Cult.tick==='function'){
    const _ct=Cult.tick.bind(Cult);
    Cult.tick=function(dt){
      if(typeof NET!=='undefined'&&NET.hp&&NET.hp.on)dt=0;
      return _ct(dt);
    };
  }
  if(window.XW_LIFE&&typeof XW_LIFE.tick==='function'&&!XW_LIFE.tick._net22){
    const _lt=XW_LIFE.tick;
    XW_LIFE.tick=function(dt){
      if(typeof NET!=='undefined'&&NET.hp&&NET.hp.on)return;
      return _lt.apply(this,arguments);
    };
    XW_LIFE.tick._net22=1;
  }
  if(typeof snapshot==='function'){
    const _sn=snapshot;snapshot=function(){
      const d=_sn.apply(this,arguments);
      try{
        if(d&&S){
          if(S.worldYear!=null)d.worldYear=S.worldYear;
          const YEAR=Math.max(1e-6,netLifeYearSec());
          const byId=new Map();
          netLifeEachUnit(u=>{if(u&&u.id!=null)byId.set(u.id,u);});
          const lists=[];
          if(d.units)lists.push(d.units);
          if(d.dg&&d.dg.W&&d.dg.W.units)lists.push(d.dg.W.units);
          for(const list of lists){
            for(const o of list){
              if(!o||o.id==null)continue;
              const u=byId.get(o.id);if(!u)continue;
              if(u.birthWorldYear!=null)o.birthWorldYear=u.birthWorldYear;
              if(u.lifeStartAge!=null)o.lifeStartAge=u.lifeStartAge;
              if(u.lifeAgedSec!=null)o.lifeAgedSec=u.lifeAgedSec;
              if(u.lifeConnected!=null)o.lifeConnected=u.lifeConnected;
              if(u.lifeMax!==undefined)o.lifeMax=u.lifeMax;
              if(u.lifeWarn!=null)o.lifeWarn=u.lifeWarn;
              if(u.cultLifeWeak)o.cultLifeWeak=JSON.parse(JSON.stringify(u.cultLifeWeak));
              else if('cultLifeWeak' in o)o.cultLifeWeak=null;
              if(u.cultLifeSeclude)o.cultLifeSeclude=JSON.parse(JSON.stringify(u.cultLifeSeclude));
              else if('cultLifeSeclude' in o)o.cultLifeSeclude=null;
              if(u.ascended!=null)o.ascended=!!u.ascended;
              if(window.XW_LIFE&&typeof XW_LIFE.ageOf==='function'){
                try{o.age=XW_LIFE.ageOf(u);}catch(e0){}
              }else if(u.lifeStartAge!=null&&u.np){
                o.age=(+u.lifeStartAge||0)+(+u.lifeAgedSec||0)/YEAR;
              }
            }
          }
        }
      }catch(e){}
      return d;
    };
  }
  if(typeof newGame==='function'){
    const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{netLifeResetClock();}catch(e){}return r;};
  }
  if(typeof applySave==='function'){
    const _as=applySave;applySave=function(){const r=_as.apply(this,arguments);try{netLifeResetClock();}catch(e){}return r;};
  }
  if(typeof netHost==='function'){
    const _nh=netHost;netHost=function(){
      const ret=_nh.apply(this,arguments);
      const fin=()=>{try{netLifeResetClock();}catch(e){}};
      try{if(ret&&typeof ret.then==='function')return ret.then(v=>{fin();return v;},e=>{fin();throw e;});}catch(e2){}
      fin();return ret;
    };
  }
  try{
    if(window.XW&&XW.net&&!XW.net.life){
      Object.defineProperty(XW.net,'life',{configurable:true,get:function(){return NET22;}});
    }
  }catch(e4){}
  if(typeof XW045==='function'){
    const _xw=XW045;XW045=function(){
      const o=_xw.apply(this,arguments);
      try{if(o&&o.net&&!o.net.life)Object.defineProperty(o.net,'life',{configurable:true,get:function(){return NET22;}});}catch(e5){}
      return o;
    };
  }
}
try{netLifeInstall();}catch(e){console.warn('[net22] install',e);}
