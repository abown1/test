// Gongfa player actions. Same game IIFE, AFTER existing net/trade/family modules, BEFORE g7.
// No peer-supplied actor. unitId is only a cross-check against authenticated pk.
(function(){'use strict';
if(window.CultGFNet&&CultGFNet.installed===1)return;
if(typeof NET==='undefined'||!window.CultGF)return;
const C=CultGF,clone=x=>JSON.parse(JSON.stringify(x)),epoch=[...crypto.getRandomValues(new Uint32Array(4))].map(x=>x.toString(16).padStart(8,'0')).join('');let seq=0;
const GF_IDS=new Set(C.catalog().map(x=>x.id));
const MAX_SESSIONS=1024; // technical replay-journal capacity, not a gameplay quota; reject new sessions rather than forget replay protection.
function state(){if(!S.cultGFNet||S.cultGFNet.v!==1)S.cultGFNet={v:1,journal:{}};return S.cultGFNet;}
function valid(i){if(!i||i.a!=='cult:gf'||typeof i.epoch!=='string'||typeof i.op!=='string'||!/^g[0-9a-f]{32}$/.test(i.epoch)||!Number.isSafeInteger(i.seq)||i.seq<1||!Number.isSafeInteger(i.unitId))return false;
 const ops={bar:['slot','ab'],study:['gfId','confirm'],borrow:['gfId','confirm','fee','seconds'],libraryStudy:['gfId','source'],return:['gfId','source'],learn:['gfId','src'],give:['gfId','to'],sell:['gfId'],learnCancel:[]};const fields=Object.prototype.hasOwnProperty.call(ops,i.op)?ops[i.op]:null;if(!fields)return false;
 if(!Object.keys(i).every(k=>['a','epoch','seq','unitId','op',...fields].includes(k)))return false;
 if(i.op==='bar')return Number.isInteger(i.slot)&&i.slot>=0&&i.slot<5&&(i.ab===null||typeof i.ab==='string'&&i.ab.length<=64);
 if(i.op==='learnCancel')return true;
 if(typeof i.gfId!=='string'||!GF_IDS.has(i.gfId))return false;
 if(['study','borrow'].includes(i.op)&&i.confirm!==true)return false;
 if(i.op==='borrow'&&(!Number.isFinite(i.fee)||!Number.isFinite(i.seconds)))return false;
 if(i.op==='return'&&!['manual','library'].includes(i.source))return false;
 if(i.op==='learn'&&i.src!=null&&typeof i.src!=='string')return false;
 if(i.op==='give'&&i.to!=null&&!(Number.isSafeInteger(+i.to)||typeof i.to==='string'))return false;
 return true;
}
function actor(pk){if(!NET.role)return pk==='local'?player():null;if(NET.role!=='host')return null;const p=NET.players.get(pk);if(!p||!(p.host||p.online))return null;return p.host?netHostPlayerU():netAvatarOf(pk);}
function syncBar(){const u=player();if(u&&u.gf&&u.gf.barConfigured){S.flags.v158=u.gf.bar.slice(0,5);S.flags.v158m=1;}}
function apply(pk,i){if(NET.role==='client'||!valid(i))return {ok:false,reason:'wire'};
 const u=actor(pk);if(!u||u.dead||u.id!==i.unitId||!(u.kind==='player'||u.np))return {ok:false,reason:'actor'};
 const st=state(),key=JSON.stringify([pk,i.epoch]),prior=st.journal[key],sig=JSON.stringify([i.op,i.unitId,i.slot,i.ab,i.gfId,i.source,i.confirm,i.fee,i.seconds]);
 if(prior&&i.seq<=prior.seq)return i.seq===prior.seq&&sig===prior.sig?clone(prior.result):{ok:false,reason:i.seq===prior.seq?'request-conflict':'already-processed'};
 if(!prior&&Object.keys(st.journal).length>=MAX_SESSIONS)return {ok:false,reason:'journal-capacity'};
 const r=C.performAction(u,i);st.journal[key]={seq:i.seq,sig,result:clone(r||{ok:false,reason:'no-result'})};if(r&&r.ok){NET.stats.applied++;syncBar();}return r;
}
function submit(i){if(!valid(i))return {ok:false,reason:'wire'};
 if(NET.role==='client'){if(!NET.tr||!NET.welcomed)return {ok:false,reason:'disconnected'};netIntent(i);return {ok:true,pending:true};}
 return apply(NET.role==='host'?NET.pkey:'local',i);
}
function request(u,i){return submit({a:'cult:gf',epoch:'g'+epoch,seq:++seq,unitId:u&&u.id,...i});}
const oldIntent=netApplyIntent0;netApplyIntent0=function(pk,i){if(!i||i.a!=='cult:gf')return oldIntent.apply(this,arguments);const r=apply(pk,i),p=NET.players.get(pk);
 if(p&&p.cid&&NET.tr)NET.tr.send(p.cid,{t:'cult:gf:result',epoch:i.epoch,seq:i.seq,r});return !!(r&&r.ok);};
const oldCast=netCast;netCast=function(m){if(m&&m.t==='st'&&NET.role==='host')m.cultGFOps=clone(state());return oldCast.apply(this,arguments);};
const oldSt=netApplySt;netApplySt=function(m){const r=oldSt.apply(this,arguments);if(NET.role==='client'&&m&&m.cultGFOps&&m.cultGFOps.v===1)S.cultGFNet=clone(m.cultGFOps);syncBar();return r;};
const oldRx=typeof netClientRxExtra==='function'?netClientRxExtra:null;netClientRxExtra=function(m){if(m&&m.t==='cult:gf:result'){C._actionResult=m.r&&m.r.ok?'房主已確認':'未完成：'+(m.r&&m.r.reason||'unknown');return;}if(oldRx)return oldRx.apply(this,arguments);};
const oldSnap=snapV045;snapV045=function(o){const r=oldSnap.apply(this,arguments);o.v45=o.v45||{};o.v45.cultGFNet=clone(state());return r||o;};
const oldApply=applyV045;applyV045=function(d){const r=oldApply.apply(this,arguments),v=d&&d.v45&&d.v45.cultGFNet;S.cultGFNet=v&&v.v===1&&v.journal&&typeof v.journal==='object'&&!Array.isArray(v.journal)?clone(v):{v:1,journal:{}};return r;};
const oldNew=newState;newState=function(){const s=oldNew.apply(this,arguments);s.cultGFNet={v:1,journal:{}};return s;};
if(typeof netMigState==='function'){const oldMig=netMigState;netMigState=function(){const r=oldMig.apply(this,arguments);if(!r||!r.d)return r;
 if(r.live===false){const projection=us=>(us||[]).map(u=>({id:u.id,gf:u.gf}));const saved=r.d.v45&&r.d.v45.cultGFNet||{v:1,journal:{}};if(JSON.stringify(projection(S.units))!==JSON.stringify(projection(r.d.units))||JSON.stringify(state())!==JSON.stringify(saved))return {tradeRefused:true,reason:'trade_checkpoint_unverified'};return r;}
 if(r.live!==true)return r;const d=clone(r.d);d.v45=d.v45||{};d.v45.cultGFNet=clone(state());
 const us=new Map(S.units.map(u=>[u.id,u]));d.units=(d.units||[]).map(u=>{const live=us.get(u.id);return live&&live.gf?Object.assign({},u,{gf:clone(live.gf)}):u;});return Object.assign({},r,{d});};}
// Bridge the original PC/mobile hotbar picker/drag path to the SAME authoritative unit.gf.bar.
if(typeof v158Set==='function'){const oldSet=v158Set;v158Set=function(slot,ab){const u=player();if(!u)return oldSet.apply(this,arguments);const r=request(u,{op:'bar',slot,ab:ab||null});v158ClosePick();return r;};}
if(typeof v158Drop==='function'){const oldDrop=v158Drop;v158Drop=function(slot,d){const u=player();if(!u||typeof d!=='string')return oldDrop.apply(this,arguments);const [k,v]=d.split(':');return request(u,{op:'bar',slot,ab:k==='s'?C.barOf(u)[+v]||null:v||null});};}
// Public selection API must expose the actual selected player's learn controls synchronously.
const oldBoot=XW045;XW045=function(){const o=oldBoot.apply(this,arguments);Object.defineProperty(o,'sel',{configurable:true,enumerable:true,get:()=>selUnits,set:v=>{selUnits=v;panelKeyCache=null;renderPanel();}});return o;};
const oldUI=updateUI;updateUI=function(){syncBar();return oldUI.apply(this,arguments);};
window.CultGFNet={installed:1,protocol:1,request,submit,apply,valid,state:()=>clone(state()),migrationState:()=>typeof netMigState==='function'?netMigState():null,syncBar};
})();
