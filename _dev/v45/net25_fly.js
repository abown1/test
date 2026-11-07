// ================== net25：御劍飛行聯機（cult:flyToggle，host 權威）==================
// 不改 cult_fly／econ／g／build.py。客機 UI／CultFly API 只送 intent {id,on}；
// 主機用 cid→pkey 對自己單位呼叫本機 CultFly.setFlying，不信 wire 的 force／座標／屬性。
// 靈力扣除、自動落地、找空位只在主機 Cult.tick／flyTick；客機不跑穿越／落地／碰撞結算。
(function(){
if(typeof NET==='undefined')return;

const NET25_LIVE=['flyOn','flyMode','flyHover','qi','qiMax','manualUntil','manualJob','manualKind','manualSnap'];
function net25PushLive(){
  try{
    if(typeof NET_LIVE_U!=='undefined'){
      for(let i=0;i<NET25_LIVE.length;i++){
        if(NET_LIVE_U.indexOf(NET25_LIVE[i])<0)NET_LIVE_U.push(NET25_LIVE[i]);
      }
    }
  }catch(e){}
}
net25PushLive();

function net25Clone(v){
  if(v==null||typeof v!=='object')return v;
  try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}
}

function net25OwnUnit(pk,u){
  if(!u||!pk)return false;
  return u.np===pk;
}

function net25ApplyFly(pk,i){
  if(typeof NET==='undefined'||NET.role!=='host')return false;
  if(!i||i.a!=='cult:flyToggle')return false;
  if(i.on!==true&&i.on!==false)return false;
  if(Object.prototype.hasOwnProperty.call(i,'force'))return false;
  const id=+i.id;
  if(!isFinite(id))return false;
  const p=NET.players.get(pk);
  if(!p||p.host)return false;
  const u=typeof unitById==='function'?unitById(id):null;
  if(!u)return false;
  if(!net25OwnUnit(pk,u))return false;
  if(!window.CultFly||typeof CultFly.setFlying!=='function')return false;
  const r=CultFly.setFlying(u,i.on);
  if(r&&r.ok){try{NET.stats.applied++;}catch(e){}return true;}
  return false;
}

if(typeof netApplyIntent0==='function'){
  const _ai=netApplyIntent0;
  netApplyIntent0=function(pk,i){
    if(i&&i.a==='cult:flyToggle')return net25ApplyFly(pk,i);
    return _ai.apply(this,arguments);
  };
}

function net25Send(u,on){
  if(!u)return {ok:false,reason:'no-unit'};
  if(typeof netIntent!=='function')return {ok:false,reason:'no-intent'};
  netIntent({a:'cult:flyToggle',id:u.id,on:!!on});
  return {ok:true,pending:true};
}

function net25WrapCultFly(){
  const C=window.CultFly;
  if(!C||C._net25)return!!C;
  C._net25=1;
  const _tg=C.toggle,_sf=C.setFlying,_to=C.takeOff,_ld=C.land,_tk=C.tick,_sl=C.snapLand;
  C.toggle=function(u){
    u=u||(typeof player==='function'?player():null);
    if(typeof NET!=='undefined'&&NET.role==='client'){
      if(!u)return {ok:false,reason:'no-unit'};
      return net25Send(u,!u.flyOn);
    }
    return _tg.apply(this,arguments);
  };
  C.setFlying=function(u,on){
    if(typeof NET!=='undefined'&&NET.role==='client'){
      if(on!==true&&on!==false)return {ok:false,reason:'type'};
      return net25Send(u,on);
    }
    return _sf.apply(this,arguments);
  };
  C.takeOff=function(u){
    if(typeof NET!=='undefined'&&NET.role==='client')return net25Send(u,true);
    return _to.apply(this,arguments);
  };
  C.land=function(u){
    if(typeof NET!=='undefined'&&NET.role==='client')return net25Send(u,false);
    return _ld.apply(this,arguments);
  };
  if(typeof _tk==='function'){
    C.tick=function(){
      if(typeof NET!=='undefined'&&NET.role==='client')return;
      return _tk.apply(this,arguments);
    };
  }
  if(typeof _sl==='function'){
    C.snapLand=function(){
      if(typeof NET!=='undefined'&&NET.role==='client')return null;
      return _sl.apply(this,arguments);
    };
  }
  return true;
}

function net25HookUi(){
  if(typeof window==='undefined'||window._net25FlyUi)return;
  window._net25FlyUi=1;
  window.addEventListener('keydown',function(ev){
    try{
      if(typeof NET==='undefined'||NET.role!=='client')return;
      if(!window.CultFly||!CultFly.flagOn())return;
      const code=(window.CULT_FLY_CFG&&CULT_FLY_CFG.hotkey)||'KeyU';
      if(ev.code!==code)return;
      const t=ev.target;
      if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const u=typeof player==='function'?player():null;
      if(u)CultFly.toggle(u);
    }catch(e){}
  },true);
  window.addEventListener('click',function(ev){
    try{
      if(typeof NET==='undefined'||NET.role!=='client')return;
      const el=ev.target&&ev.target.closest&&ev.target.closest('#cultFlyBtn');
      if(!el)return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const u=typeof player==='function'?player():null;
      if(u&&window.CultFly)CultFly.toggle(u);
    }catch(e){}
  },true);
}

if(typeof netPatch==='function'){
  const _np=netPatch;
  netPatch=function(o,d){
    const r=_np.apply(this,arguments);
    try{
      if(o&&d){
        if(d.gf!==undefined)o.gf=net25Clone(d.gf);
        if(d.manualSnap!==undefined)o.manualSnap=net25Clone(d.manualSnap);
        if(d.eq!==undefined)o.eq=net25Clone(d.eq);
      }
    }catch(e){}
    return r;
  };
}
if(typeof netLive==='function'){
  const _nl=netLive;
  netLive=function(o,keys){
    const r=_nl.apply(this,arguments);
    try{
      if(r){
        if(r.gf!==undefined)r.gf=net25Clone(r.gf);
        if(r.manualSnap!==undefined)r.manualSnap=net25Clone(r.manualSnap);
        if(r.eq!==undefined)r.eq=net25Clone(r.eq);
      }
    }catch(e){}
    return r;
  };
}
if(typeof netDiff==='function'){
  const _nd=netDiff;
  const LATE=['gf','manualUntil','manualJob','manualKind','manualSnap','office','econOffice','flyOn','flyMode','flyHover','qi','qiMax'];
  netDiff=function(map,id,cur,all){
    const d=_nd.apply(this,arguments);
    try{
      if(!cur||typeof NET==='undefined')return d;
      const every=(typeof NET_SLOW_EVERY==='number'?NET_SLOW_EVERY:5);
      if(!(NET.tick%every===0||all))return d;
      let out=d?d:{id:id};
      let extra=false;
      for(let i=0;i<LATE.length;i++){
        const k=LATE[i];
        if(!(k in cur))continue;
        out[k]=net25Clone(cur[k]);
        extra=true;
      }
      return (d||extra)?out:null;
    }catch(e){return d;}
  };
}

net25WrapCultFly();
net25HookUi();
try{if(typeof setTimeout==='function'){setTimeout(net25WrapCultFly,0);setTimeout(net25HookUi,0);} }catch(e){}

{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);
  try{net25WrapCultFly();net25HookUi();net25PushLive();}catch(e){}
  try{
    if(o.net)o.net.fly={
      live:()=>typeof NET_LIVE_U!=='undefined'?NET_LIVE_U.slice():[],
      own:(pk,id)=>{const u=typeof unitById==='function'?unitById(+id):null;return net25OwnUnit(pk,u);},
      send:function(i){if(typeof netIntent==='function')return netIntent(i);}
    };
  }catch(e){}
  return o;};}
})();
