// ================== net26：弟子晉升聯機（客機只送 intent，host 權威）==================
// 不改 econ_promote／net20／cult／g／build.py。
// 白名單：econ:promoteApprove {id,s}、econ:promoteRecommend {s}、
//         econ:promoteRunTrial {s}、econ:promoteUnit {id,s}、econ:promoteSignTrial {id,s}。
// promoteSweep＝全宗批次引擎（econRankTick／setRealm／elderAssign 內部呼叫，無面板按鈕），
// 客機 gate 且不對網路開放；單人晉升請走 promoteUnit。
// 來歷：cid→pkey 在線且有化身；目標＝無 np 的存活弟子（非主角、非成員化身）。
// 境界／職位／試煉條件交 host 當下 API；不信 force／price／cap／authority／winner／result。
(function(){
if(typeof NET==='undefined')return;

const NET26={seen:new Map(),cool:new Map(),seq:0,orig:{}};
const MSG={
  'econ:promoteApprove':'晉升核准',
  'econ:promoteRecommend':'長老提拔',
  'econ:promoteRunTrial':'內門試煉',
  'econ:promoteUnit':'外門晉升',
  'econ:promoteSignTrial':'報名試煉'
};
const SCHEMA={
  'econ:promoteApprove':{keys:['a','id','s'],needId:true},
  'econ:promoteRecommend':{keys:['a','s'],needId:false},
  'econ:promoteRunTrial':{keys:['a','s'],needId:false},
  'econ:promoteUnit':{keys:['a','id','s'],needId:true},
  'econ:promoteSignTrial':{keys:['a','id','s'],needId:true}
};

function net26Clone(v){
  if(v==null||typeof v!=='object')return v;
  try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}
}
function net26Toast(msg){
  try{if(typeof toast==='function')toast(String(msg));}catch(e){}
}
function net26Int(v){return typeof v==='number'&&isFinite(v)&&(v|0)===v;}

function net26KeysOk(i,allow){
  if(!i||typeof i!=='object')return false;
  const keys=Object.keys(i);
  for(let k=0;k<keys.length;k++){
    if(allow.indexOf(keys[k])<0)return false;
  }
  if(i.a==null||allow.indexOf('a')<0)return false;
  return true;
}

function net26Origin(pk){
  if(!pk||typeof NET==='undefined'||NET.role!=='host')return false;
  const p=NET.players.get(pk);
  if(!p||p.host||!p.online||!p.cid)return false;
  if(NET.cid2pk.get(p.cid)!==pk)return false;
  const av=typeof netAvatarOf==='function'?netAvatarOf(pk):null;
  if(!av)return false;
  return true;
}

function net26LegalDisciple(u){
  if(!u||u.dead)return false;
  if(u.kind==='player')return false;
  if(u.np)return false;
  if(u.kind!=='disciple')return false;
  return true;
}

function net26Unit(id){
  const n=+id;
  if(!net26Int(n))return null;
  try{
    if(typeof unitById==='function'){const u=unitById(n);if(u)return u;}
  }catch(e){}
  try{
    const T=typeof S!=='undefined'?S:null;
    if(T&&T.units)return T.units.find(function(x){return x&&x.id===n;})||null;
  }catch(e2){}
  return null;
}

function net26Replay(pk,i){
  const key=String(pk)+'|'+i.a+'|'+i.s;
  if(NET26.seen.has(key))return true;
  NET26.seen.set(key,Date.now());
  if(NET26.seen.size>400){
    const cut=Date.now()-120000;
    for(const [k,t] of [...NET26.seen])if(t<cut)NET26.seen.delete(k);
  }
  return false;
}

function net26Cool(pk,a,id){
  const key=String(pk)+'|'+a+'|'+(id||0);
  const now=Date.now();
  const prev=NET26.cool.get(key)||0;
  if(now-prev<700)return true;
  NET26.cool.set(key,now);
  return false;
}

function net26Fail(label,reason){
  net26Toast(label+'失敗：'+(reason||'rejected'));
  return false;
}

function net26Apply(pk,i){
  if(!i||typeof i.a!=='string')return false;
  if(i.a==='econ:promoteSweep')return net26Fail('晉升清掃','bulk-no-intent');
  const sch=SCHEMA[i.a];
  if(!sch)return false;
  if(!net26KeysOk(i,sch.keys))return net26Fail(MSG[i.a]||'晉升','schema');
  if(Object.prototype.hasOwnProperty.call(i,'force')||Object.prototype.hasOwnProperty.call(i,'price')||
     Object.prototype.hasOwnProperty.call(i,'cap')||Object.prototype.hasOwnProperty.call(i,'authority')||
     Object.prototype.hasOwnProperty.call(i,'result')||Object.prototype.hasOwnProperty.call(i,'winner')){
    return net26Fail(MSG[i.a],'untrusted');
  }
  if(!net26Int(i.s)||i.s<1)return net26Fail(MSG[i.a],'seq');
  if(sch.needId){
    if(!net26Int(i.id)||i.id<1)return net26Fail(MSG[i.a],'id');
  }else if(Object.prototype.hasOwnProperty.call(i,'id')){
    return net26Fail(MSG[i.a],'schema');
  }
  if(!net26Origin(pk))return net26Fail(MSG[i.a],'origin');
  if(net26Replay(pk,i))return net26Fail(MSG[i.a],'replay');
  if(net26Cool(pk,i.a,sch.needId?i.id:0))return net26Fail(MSG[i.a],'dup');

  const A=window.XW_ECON||{};
  let r=null;
  try{
    if(i.a==='econ:promoteApprove'){
      const u=net26Unit(i.id);
      if(!net26LegalDisciple(u))return net26Fail(MSG[i.a],'target');
      const st=S&&S.econ&&S.econ.promote;
      const recs=st&&Array.isArray(st.recos)?st.recos:[];
      if(!recs.some(function(x){return x&&x.id===u.id;}))return net26Fail(MSG[i.a],'no-reco');
      const fn=NET26.orig.approve||A.promoteApprove;
      r=fn.call(A,u.id);
    }else if(i.a==='econ:promoteRecommend'){
      const fn=NET26.orig.recommend||A.promoteRecommend;
      r=fn.call(A);
      if(!r)return net26Fail(MSG[i.a],'none');
      net26Toast('長老提名 '+(r.name||('弟子'+r.id))+' 晉升內門');
    }else if(i.a==='econ:promoteRunTrial'){
      const fn=NET26.orig.runTrial||A.promoteRunTrial;
      r=fn.call(A);
    }else if(i.a==='econ:promoteUnit'){
      const u=net26Unit(i.id);
      if(!net26LegalDisciple(u))return net26Fail(MSG[i.a],'target');
      const fn=NET26.orig.unit||A.promoteUnit;
      r=fn.call(A,u);
      if(!r)return net26Fail(MSG[i.a],'ineligible');
    }else if(i.a==='econ:promoteSignTrial'){
      const u=net26Unit(i.id);
      if(!net26LegalDisciple(u))return net26Fail(MSG[i.a],'target');
      const fn=NET26.orig.signTrial||A.promoteSignTrial;
      r=fn.call(A,u);
    }else return false;
  }catch(e){
    return net26Fail(MSG[i.a],'error');
  }
  if(r&&r.ok===false)return net26Fail(MSG[i.a],r.reason||'rejected');
  try{NET.stats.applied++;}catch(e){}
  return true;
}

if(typeof netApplyIntent0==='function'){
  const _ai=netApplyIntent0;
  netApplyIntent0=function(pk,i){
    if(i&&typeof i.a==='string'&&i.a.indexOf('econ:promote')===0)return net26Apply(pk,i);
    return _ai.apply(this,arguments);
  };
}

function net26NextSeq(){NET26.seq=(NET26.seq||0)+1;return NET26.seq;}
function net26Send(payload){
  if(typeof netIntent!=='function')return {ok:false,reason:'no-intent'};
  payload.s=net26NextSeq();
  netIntent(payload);
  return {ok:true,pending:true,s:payload.s};
}

function net26ClientPending(){return {ok:true,pending:true,reason:'net-pending'};}

function net26WrapApis(){
  const A=window.XW_ECON;
  if(!A)return false;
  function wrap(key,kind){
    const fn=A[key];
    if(typeof fn!=='function'||fn._net26)return;
    if(!NET26.orig[kind])NET26.orig[kind]=fn;
    const orig=fn;
    A[key]=function(){
      if(typeof NET!=='undefined'&&NET.role==='client'){
        if(kind==='sweep'){
          net26Toast('晉升清掃由主機自動執行（不開放遠端整批）');
          return 0;
        }
        if(kind==='recommend')return net26Send({a:'econ:promoteRecommend'});
        if(kind==='runTrial')return net26Send({a:'econ:promoteRunTrial'});
        if(kind==='approve'){
          const id=arguments[0];
          if(!net26Int(id))return {ok:false,reason:'id'};
          return net26Send({a:'econ:promoteApprove',id:id});
        }
        if(kind==='unit'){
          const u=arguments[0];
          if(!u||!net26Int(u.id))return {ok:false,reason:'id'};
          return net26Send({a:'econ:promoteUnit',id:u.id});
        }
        if(kind==='signTrial'){
          const u=arguments[0];
          if(!u||!net26Int(u.id))return {ok:false,reason:'id'};
          return net26Send({a:'econ:promoteSignTrial',id:u.id});
        }
        return net26ClientPending();
      }
      return orig.apply(this,arguments);
    };
    A[key]._net26=1;
    if(window.XW)window.XW.econ=A;
  }
  wrap('promoteApprove','approve');
  wrap('promoteRecommend','recommend');
  wrap('promoteRunTrial','runTrial');
  wrap('promoteSweep','sweep');
  wrap('promoteUnit','unit');
  wrap('promoteSignTrial','signTrial');
  return true;
}

function net26HookUi(){
  if(typeof window==='undefined'||window._net26PromoteUi)return;
  window._net26PromoteUi=1;
  window.addEventListener('click',function(ev){
    try{
      if(typeof NET==='undefined'||NET.role!=='client')return;
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-pr]');
      if(!t)return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const act=t.getAttribute('data-econ-pr');
      const id=+t.getAttribute('data-u');
      const A=window.XW_ECON||{};
      if(act==='ok'){
        if(typeof A.promoteApprove==='function')A.promoteApprove(id);
      }else if(act==='trial'){
        const u=net26Unit(id);
        if(typeof A.promoteSignTrial==='function')A.promoteSignTrial(u);
      }else if(act==='run-trial'){
        if(typeof A.promoteRunTrial==='function')A.promoteRunTrial();
      }
    }catch(e){}
  },true);
}

if(typeof netCast==='function'){
  const _nc=netCast;
  netCast=function(m){
    try{
      if(m&&m.t==='st'&&typeof NET!=='undefined'&&NET.role==='host'&&typeof S!=='undefined'&&S&&S.econ){
        if(S.econ.promote)m.pr=net26Clone(S.econ.promote);
        if(S.econ.flags)m.prFlags=net26Clone(S.econ.flags);
      }
    }catch(e){}
    return _nc.apply(this,arguments);
  };
}
if(typeof netApplySt==='function'){
  const _as=netApplySt;
  netApplySt=function(m){
    const r=_as.apply(this,arguments);
    try{
      if(m&&typeof S!=='undefined'&&S){
        if(!S.econ)S.econ={};
        if(m.pr)S.econ.promote=net26Clone(m.pr);
      }
    }catch(e){}
    return r;
  };
}

net26WrapApis();
net26HookUi();
try{
  if(typeof setTimeout==='function'){
    [0,100,500,900].forEach(function(ms){setTimeout(function(){net26WrapApis();net26HookUi();},ms);});
  }
}catch(e){}

{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);
  try{net26WrapApis();net26HookUi();}catch(e){}
  try{
    if(o.net)o.net.promote={
      schema:function(){return JSON.parse(JSON.stringify(SCHEMA));},
      send:function(i){if(typeof netIntent==='function')return netIntent(i);},
      orig:function(){const k={};for(const n in NET26.orig)k[n]=!!NET26.orig[n];return k;}
    };
  }catch(e){}
  return o;};}
})();
