// #114 host-authoritative adapter. Load AFTER cult_family.js and every existing net*.js.
// Wire: existing {t:'in', i:{a:'cult:family',op,target?,invite?}}.
// Identity is authenticated pk from netHostRx/cid2pk, NEVER a supplied actor/id/pkey.
// State: st.cultFamily={v:1,pairs,pending,sitting,sessions,cooldowns}; v45.cultFamily in save.
(function(){
'use strict';
if(window.CultFamilyNet&&window.CultFamilyNet.installed===1)return;
if(typeof NET==='undefined'||!window.CultFamily)return;
const C=window.CultFamily;
function valid(i){return !!(i&&i.a==='cult:family'&&typeof i.op==='string'&&
 Object.keys(i).every(k=>['a','op','target','invite'].includes(k))&&
 (i.target===undefined||Number.isSafeInteger(i.target))&&
 (i.invite===undefined||typeof i.invite==='string'&&i.invite.length<=64&&/^f[a-f0-9]{32}_[1-9][0-9]*$/.test(i.invite)));}
function apply(pk,i){if(NET.role!=='host'||!valid(i))return {ok:false,code:'wire'};return C.perform(pk,i);}
function request(i){
 const wire={a:'cult:family',...i};if(!valid(wire))return {ok:false,code:'wire'};
 if(NET.role==='client'){
  if(!NET.tr||!NET.welcomed)return {ok:false,code:'disconnected'};
  netIntent(wire);return {ok:true,pending:true};
 }
 return C.perform(NET.role==='host'?NET.pkey:'local',wire);
}
const _intent=netApplyIntent0;netApplyIntent0=function(pk,i){
 if(!i||i.a!=='cult:family')return _intent.apply(this,arguments);
 const r=apply(pk,i);const p=NET.players.get(pk);
 if(p&&p.cid&&NET.tr)NET.tr.send(p.cid,{t:'cult:family:result',v:1,ok:r.ok,code:r.code});
 if(r.ok)NET.stats.applied++;return r.ok;
};
const _cast=netCast;netCast=function(m){if(m&&m.t==='st'&&NET.role==='host')m.cultFamily=C.live();return _cast.apply(this,arguments);};
const _st=netApplySt;netApplySt=function(m){const r=_st.apply(this,arguments);if(m&&m.cultFamily&&NET.role==='client')C.applyLive(m.cultFamily);return r;};
const _rx=typeof netClientRxExtra==='function'?netClientRxExtra:null;
netClientRxExtra=function(m){if(m&&m.t==='cult:family:result'){if(!m.ok&&typeof toast==='function')toast('同心緣：'+m.code);return;}if(_rx)return _rx.apply(this,arguments);};
// net16's generic live/base merge intentionally omits v45. Overlay ONLY when it
// selected live state. Never defeat net_trade_actions' checkpoint refusal/fallback.
if(typeof netMigState==='function'){
 const _mig=netMigState;netMigState=function(){const r=_mig.apply(this,arguments);if(!r||r.live!==true||!r.d)return r;
  const d=JSON.parse(JSON.stringify(r.d)),f=C.live();d.v45=d.v45||{};
  d.v45.daolv=f.pairs;d.v45.dualCd=f.cooldowns;
  d.v45.cultFamily=Object.assign({},d.v45.cultFamily||{v:1,children:[]},{handoff:{v:1,wid:NET.wid,pending:f.pending}});
  return Object.assign({},r,{d});
 };
}
window.CultFamilyNet={installed:1,request,apply,valid,protocol:1,migrationState:()=>typeof netMigState==='function'?netMigState():null};
})();
