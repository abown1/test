// Host-only gear trade transport. Requires econ_gtrade atomic/revision contract.
// Mount after net26, inside the game IIFE. No wire ctx, price or function calls.
var netTradeMigrationState;
(function(){
'use strict';
if(typeof NET==='undefined')return;
const J='netTradeJournal',LIMIT=512,ACTIONS=['trade:sell','trade:buy','trade:shelf'];
const known=new Map(),outbox=new Map(),receipts=new Map();let counter=0,executing=false;
const session=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
const status={stage:'gt-staged-v1-required',releaseBlocked:true,migration:'named-refusal preserves live state; checkpoint-only takeover',last:null};
const codes=new Set(['ok','bad_schema','forbidden','origin','wrong_world','op_conflict','capacity','unsupported_atomic','disconnected','journal_invalid','indeterminate','trade_checkpoint_unverified','not_host','busy','invalid_revision','stale_revision','revision_capacity','currency_unavailable','invalid_price','not_needed','inventory_full','insufficient','payment_failed','internal_error','persist_failed','unsupported_commit_protocol','transfer_conflict','item_pending','currency_account_unavailable','currency_mode_unsupported','currency_busy','currency_capture_failed','transfer_pending']);
const copy=x=>JSON.parse(JSON.stringify(x));
const positive=x=>Number.isSafeInteger(x)&&x>0;
const inventory=T=>Array.isArray(T.inv)?T.inv:T.v45&&T.v45.inv;
function show(r){
 status.last=copy(r);
 const msg=r.pending?'交易未決：保留原編號，未再次扣款；等待核對／補存':r.ok?'交易成功：'+r.action+'，估價 '+r.p+' 下品':r.code==='trade_checkpoint_unverified'?'交易未決：保留目前角色與資料，等待一致快照；不接手、不載舊副本':'交易未完成 ['+r.code+']';
 try{toast(msg);}catch(e){}
 if(typeof document!=='undefined'){
  let el=document.getElementById('net_trade_result');
  if(!el){el=document.createElement('div');el.id='net_trade_result';el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:12px;left:12px;z-index:9500;background:#211c16;color:#ffe1a1;padding:8px;max-width:85vw';document.body.appendChild(el);}
  el.textContent=msg;
 }
}
function valid(i){
 if(!i||typeof i!=='object'||Array.isArray(i)||!ACTIONS.includes(i.a))return false;
 const keys=['a','opId','wid','unitId','itemId','rev','qty'];
 return Object.keys(i).length===keys.length&&Object.keys(i).every(k=>keys.includes(k))&&typeof i.opId==='string'&&/^[A-Za-z0-9_-]{8,96}$/.test(i.opId)&&typeof i.wid==='string'&&i.wid.length>0&&i.wid.length<=128&&positive(i.unitId)&&positive(i.itemId)&&i.qty===1&&typeof i.rev==='string'&&i.rev.length>0&&i.rev.length<=128;
}
function validResult(r){return r&&typeof r.ok==='boolean'&&codes.has(r.code)&&typeof r.opId==='string'&&(!r.ok||r.code==='ok'&&['sell','buy','shelf'].includes(r.action)&&positive(r.unitId)&&positive(r.itemId)&&Number.isSafeInteger(r.p)&&r.p>=0&&typeof r.rev==='string'&&positive(r.journalSeq)&&r.durable===true);}
function validJournal(j){
 if(!j||j.v!==2||typeof j.enabled!=='boolean'||typeof j.wid!=='string'||!Number.isSafeInteger(j.seq)||j.seq<0||!Array.isArray(j.entries)||j.entries.length>LIMIT)return false;
 const ids=new Set(),seqs=new Set();
 for(const e of j.entries){
  if(!e||typeof e.pk!=='string'||!e.pk||e.pk.length>40||typeof e.opId!=='string'||!/^[A-Za-z0-9_-]{8,96}$/.test(e.opId)||typeof e.sig!=='string'||e.sig.length>512||!['pending','done'].includes(e.state))return false;
  const k=JSON.stringify([e.pk,e.opId]);if(ids.has(k))return false;ids.add(k);
  if(e.state==='done'&&(!validResult(e.result)||e.result.opId!==e.opId))return false;
  if(e.result&&e.result.journalSeq!==undefined){const n=e.result.journalSeq;if(!positive(n)||n>j.seq||seqs.has(n))return false;seqs.add(n);}
 }
 return true;
}
function journal(){
 if(!S||!S.flags)return null;
 let j=S.flags[J];
 // One-time schema upgrade is safe ONLY for the previous stage's all-rejected journal.
 if(j&&j.v===1&&j.enabled!==true&&j.wid===NET.wid&&Array.isArray(j.entries)&&j.entries.length<=LIMIT&&j.entries.every(e=>e&&e.state==='done'&&e.result&&e.result.ok===false&&codes.has(e.result.code))){j=copy(j);j.v=2;j.seq=0;j.enabled=false;S.flags[J]=j;}
 if(j===undefined){j={v:2,wid:NET.wid,seq:0,enabled:false,entries:[]};S.flags[J]=j;}
 return validJournal(j)&&j.wid===NET.wid?j:null;
}
function remember(wid,n){if(typeof wid==='string'&&Number.isSafeInteger(n)&&n>=0)known.set(wid,Math.max(known.get(wid)||0,n));}
function tradeActive(j){if(!j)return false;if(j.v===1&&j.enabled!==true&&Array.isArray(j.entries)&&j.entries.every(e=>e&&e.state==='done'&&e.result&&e.result.ok===false))return false;return !validJournal(j)||j.enabled===true||j.entries.some(e=>e.state==='pending'||e.result&&e.result.ok);}
function refusal(){return {tradeRefused:true,reason:'trade_checkpoint_unverified'};}
// Pure checkpoint choice: never overlay live inventory onto old accounts.
netTradeMigrationState=function(base,wv,wid){
 const live=S&&S.flags&&S.flags[J],saved=base&&base.flags&&base.flags[J];
 if(!tradeActive(live)&&!tradeActive(saved)&&!(known.get(wid)>0))return undefined;
 if(!base||!validJournal(saved)||saved.wid!==wid||saved.entries.some(e=>e.state==='pending')||!saved.checkpoint||saved.checkpoint.seq!==saved.seq||saved.checkpoint.wv!==wv||base.flags.netWv!==wv)return refusal();
 if(live&&(!validJournal(live)||live.wid!==wid||live.entries.some(e=>e.state==='pending')))return refusal();
 if(saved.seq<Math.max(known.get(wid)||0,live&&live.seq||0))return refusal();
 if(!base.econ||!base.econ.vault||!base.econ.wallets||!Array.isArray(inventory(base))||!Array.isArray(base.units))return refusal();
 // A newer live time/financial/gear state has no common checkpoint proof. Do NOT
 // quietly roll it back or synthesize a partial transaction capsule.
 if(S){
  if(S.time>base.time)return refusal();
  const projection=T=>({inv:inventory(T),econ:T.econ,units:(T.units||[]).map(u=>({id:u.id,eq:u.eq,gbag:u.gbag,lingshi:u.kind==='disciple'&&!u.np?u.lingshi:undefined,gb:u.gb,atk:u.atk,maxhp:u.maxhp,hp:u.hp,speed:u.speed,def:u.def}))});
  if(JSON.stringify(projection(S))!==JSON.stringify(projection(base)))return refusal();
 }
 return {d:copy(base),wv:wv,live:false};
};
if(typeof snapshot==='function'){const orig=snapshot;snapshot=function(){const d=orig.apply(this,arguments);if(d&&d.flags&&d.flags[J]){d.flags=Object.assign({},d.flags);d.flags[J]=copy(d.flags[J]);}if(d&&Array.isArray(d.units)&&S){const us=new Map(S.units.map(u=>[u.id,u]));d.units=d.units.map(o=>{const u=us.get(o.id);return u&&u.kind==='disciple'&&!u.np&&Number.isFinite(u.lingshi)?Object.assign({},o,{lingshi:u.lingshi}):o;});}return d;};}
if(typeof applySave==='function'){const orig=applySave;applySave=function(){const r=orig.apply(this,arguments);if(r&&S&&S.flags&&S.flags[J]){try{S.flags[J]=copy(S.flags[J]);remember(S.flags[J].wid,S.flags[J].seq);}catch(e){S.flags[J]={v:0,enabled:true};}}return r;};}
function reject(i,code){return {ok:false,code:code,opId:i&&typeof i.opId==='string'?i.opId.slice(0,96):null};}
function answer(cid,r,local){if(local){show(r);return r;}try{if(NET.tr)NET.tr.send(cid,{t:'trade:result',wid:NET.wid,r:copy(r)});}catch(e){}return r;}
const STAGED_PROTOCOL='gt-staged-v1',committedProof=new Map();let activeTrade=null;
function netHoldMatches(item,accounts){const j=S&&S.flags&&S.flags[J];if(!j)return false;if(!validJournal(j)||j.wid!==NET.wid)return true;return j.entries.some(e=>{if(e.state!=='pending'||JSON.stringify([j.wid,e.pk,e.opId])===activeTrade)return false;let v;try{v=JSON.parse(e.sig)}catch(err){return true;}if(!Array.isArray(v)||v.length!==5||!ACTIONS.includes(v[0])||!positive(v[1])||!positive(v[2]))return true;if(item!=null&&v[2]===item)return true;if(!accounts||v[0]==='trade:shelf')return false;return accounts.some(a=>(a==='vault'||a==='sect')||(a&&a.id===v[1]));});}
if(typeof gtItemHeld==='function'){const orig=gtItemHeld;gtItemHeld=function(it){return orig.apply(this,arguments)||!!(it&&netHoldMatches(it.id,null));};}
if(typeof gtHeldAccounts==='function'){const orig=gtHeldAccounts;gtHeldAccounts=function(accounts){return orig.apply(this,arguments)||netHoldMatches(null,accounts);};}
function resultIdentity(r,i){return r&&r.action===i.a.slice(6)&&r.unitId===i.unitId&&r.itemId===i.itemId&&Number.isSafeInteger(r.p)&&r.p>=0&&typeof r.rev==='string'&&r.rev.length<=128;}
function groupCommitted(r,i){const A=window.XW&&XW.gt;return !!(A&&typeof A.isCommittedResult==='function'&&A.isCommittedResult(r))&&resultIdentity(r,i)&&r.ok===true&&r.code==='ok'&&r.phase==='committed'&&r.applied===true&&r.pending===false&&r.durable===false&&(r.action==='shelf'?r.currency==='none'&&r.p===0&&r.group===null&&typeof r.on==='boolean':r.currency==='committed'&&r.p>0&&r.currencyPhase==='complete'&&r.group&&r.group.schema==='xw-transfer-v1'&&r.group.committed===true&&r.group.phase==='complete');}
function stageCandidate(r,i){return resultIdentity(r,i)&&r.ok===true&&r.code==='ok'&&r.domain==='applied'&&r.phase==='staged'&&r.pending===true&&r.applied===true&&r.durable===false&&(r.action==='shelf'?r.currency==='none'&&r.currencyPhase==='none'&&r.group===null&&r.p===0&&typeof r.on==='boolean':r.p>0&&r.currency==='complete-uncommitted'&&r.currencyPhase==='complete'&&r.group&&r.group.schema==='xw-transfer-v1'&&r.group.committed===false)&&r.currency!=='committed';}
function definitelyRestored(r){return r&&r.ok===false&&r.pending===false&&r.applied===false&&codes.has(r.code)&&(r.phase==='rejected'||r.phase==='rolled_back'&&(r.currency==='restored'||r.action==='shelf'&&r.currency==='none'));}
function pendingResult(i,r){const out={ok:false,code:r&&['transfer_conflict','transfer_pending'].includes(r.code)?r.code:'trade_checkpoint_unverified',opId:i.opId,pending:true,phase:'unresolved',applied:!!(r&&r.applied),currency:r&&['committed','conflict','complete-uncommitted','none'].includes(r.currency)?r.currency:'unverified'};
 if(r&&resultIdentity(r,i))for(const k of ['action','unitId','itemId','p','rev','beforeRev','currencyPhase','lastConfirmedPhase','domain','accounts','worldChanged','group'])if(r[k]!==undefined)out[k]=r[k];
 if(r&&r.cause)out.cause={stage:String(r.cause.stage||'unknown').slice(0,80),code:String(r.cause.code||'unknown').slice(0,80),reason:String(r.cause.reason||'unverified').slice(0,240)};
 return out;
}
function persistEntry(j,e,state,r){
 const T=S,F=T.flags,E=T.econ,V=E&&E.vault,wid=NET.wid,pk=NET.pkey,before=copy(j),oldFlag=F.netWv,oldWv=NET.wv;
 try{
  if(!Number.isSafeInteger(j.seq)||j.seq>=Number.MAX_SAFE_INTEGER)throw Error('seq');
  const old=netLoadWorldRec(wid);if(old&&old.wv>Math.max(NET.wv||0,F.netWv||0))throw Error('newer checkpoint');
  const wv=Math.max(NET.wv||0,F.netWv||0)+1;if(!positive(wv))throw Error('world revision');
  j.seq++;e.state=state;e.result=Object.assign({},copy(r),{opId:e.opId,journalSeq:j.seq});j.checkpoint={seq:j.seq,wv};
  if(!validJournal(j))throw Error('journal');F.netWv=NET.wv=wv;
  const d=copy(snapshot());if(S!==T||S.flags!==F||S.econ!==E||S.econ.vault!==V||NET.wid!==wid||NET.pkey!==pk||NET.role!=='host')throw Error('identity');
  const writes=X=>{const u=X.units&&X.units.find(x=>x.id===e.itemUnitId);return {econ:X.econ,inv:inventory(X),u:u&&{id:u.id,eq:u.eq,gbag:u.gbag,lingshi:u.lingshi,gb:u.gb,atk:u.atk,hp:u.hp,maxhp:u.maxhp,def:u.def,speed:u.speed}};};
  if(!d.flags||!validJournal(d.flags[J])||d.flags[J].seq!==j.seq||JSON.stringify(writes(d))!==JSON.stringify(writes(T)))throw Error('incomplete writeset');
  const rec={wid,wv,at:Date.now(),host:NET.name||'',data:d};localStorage.setItem(NET_LS_WORLD+wid,JSON.stringify(rec));remember(wid,j.seq);return rec;
 }catch(err){for(const k of Object.keys(j))delete j[k];Object.assign(j,before);F.netWv=oldFlag;if(S===T&&NET.wid===wid)NET.wv=oldWv;return null;}
}
function currentEntry(j,pk,opId){return j.entries.find(e=>e.pk===pk&&e.opId===opId);}
function announceCheckpoint(rec){if(rec)try{if(NET.tr)NET.tr.broadcast({t:'world',wid:rec.wid,wv:rec.wv,host:rec.host,snap:rec.data});}catch(e){}}
function proofKey(wid,pk,id){return JSON.stringify([wid,pk,id]);}
function domainStillApplied(r){const u=S.units.find(x=>x.id===r.unitId),shared=(S.inv||[]).find(x=>x.id===r.itemId),owned=u&&[...(u.gbag||[]),...Object.values(u.eq||{})].find(x=>x&&x.id===r.itemId),it=r.action==='sell'?owned:shared,A=window.XW&&XW.gt;
 return !!(it&&A&&typeof A.revision==='function'&&A.revision(it)===r.rev&&(r.action==='sell'?owned.own===r.unitId&&!shared:r.action==='buy'?shared.own==null&&!owned:shared.own==null&&!!shared.shelf===r.on));}
function recoverCommitted(j,e,i,pk){const k=proofKey(NET.wid,pk,i.opId),p=committedProof.get(k);if(!p||p.state!==S||p.econ!==S.econ||p.vault!==S.econ.vault||p.wallets!==S.econ.wallets||p.wid!==NET.wid||!groupCommitted(p.result,i)||!domainStillApplied(p.result))return null;
 // Only save current authoritative state. Never replay atomic/pay/gain/token,
 // and never overwrite newer independent income with a stored old snapshot.
 const result=Object.assign({},p.result,{opId:i.opId,durable:true}),rec=persistEntry(j,e,'done',result);
 if(!rec)return null;committedProof.delete(k);announceCheckpoint(rec);return copy(currentEntry(j,pk,i.opId).result);
}
function receive(cid,i,local){
 const pk=local?NET.pkey:NET.cid2pk.get(cid),p=pk&&NET.players.get(pk),origin=NET.role==='host'&&p&&p.online&&(local?(p.host&&pk===NET.pkey):(!p.host&&p.cid===cid&&netAvatarAnywhere(pk)));
 if(!origin)return answer(cid,reject(i,'origin'),local);if(!valid(i))return answer(cid,reject(i,'bad_schema'),local);if(i.wid!==NET.wid)return answer(cid,reject(i,'wrong_world'),local);
 const j=journal();if(!j)return answer(cid,reject(i,'journal_invalid'),local);const sig=JSON.stringify([i.a,i.unitId,i.itemId,i.rev,i.qty]);let e=currentEntry(j,pk,i.opId);
 if(e){if(e.sig!==sig)return answer(cid,reject(i,'op_conflict'),local);if(e.state==='done')return answer(cid,copy(e.result),local);
  if(!executing){executing=true;try{const recovered=recoverCommitted(j,e,i,pk);if(recovered)return answer(cid,recovered,local);}finally{executing=false;}}
  e=currentEntry(j,pk,i.opId);return answer(cid,e.result&&e.result.pending?copy(e.result):Object.assign(reject(i,'indeterminate'),{pending:true}),local);
 }
 if(executing)return answer(cid,reject(i,'busy'),local);
 const locked=j.entries.some(x=>x.state==='pending'&&(x.itemId===i.itemId||(()=>{try{return JSON.parse(x.sig)[2]===i.itemId}catch(e){return true}})()));
 if(locked)return answer(cid,Object.assign(reject(i,'item_pending'),{pending:true}),local);
 if(j.entries.length>=LIMIT)return answer(cid,reject(i,'capacity'),local);
 e={pk,opId:i.opId,sig,state:'pending',itemId:i.itemId,itemUnitId:i.unitId,protocol:STAGED_PROTOCOL};j.entries.push(e);j.enabled=true;
 executing=true;try{
  const A=window.XW&&XW.gt;
  // No version probing by execution: old c80c ignores ctx.protocol. Refuse it
  // BEFORE any atomic invocation or any financial side effect.
  if(!A||typeof A.atomic!=='function'||typeof A.revision!=='function'||A.atomicProtocol!==STAGED_PROTOCOL||!A.capabilities||A.capabilities.stagedCommit!==true||A.capabilities.transferGroup!=='xw-transfer-v1'||typeof A.isCommittedResult!=='function'){const r=reject(i,'unsupported_commit_protocol'),rec=persistEntry(j,e,'done',r);if(rec)announceCheckpoint(rec);e=currentEntry(j,pk,i.opId);if(!rec){e.state='pending';e.result=Object.assign(pendingResult(i),{cause:{stage:'protocol-rejection-save',code:'persist_failed',reason:'No financial API was called'}});}return answer(cid,copy(e.result),local);}
  let staged=false;activeTrade=proofKey(NET.wid,pk,i.opId);
  const ctx={pkey:pk,wid:NET.wid,protocol:STAGED_PROTOCOL};if(!local)ctx.cid=cid;
  ctx.commit=function(candidate){if(staged||!stageCandidate(candidate,i))return false;const entry=currentEntry(j,pk,i.opId);entry.candidate=copy(candidate);const rec=persistEntry(j,entry,'pending',pendingResult(i,candidate));if(!rec)return false;staged=true;return true;};
  let r;try{r=A.atomic({action:i.a.slice(6),unitId:i.unitId,itemId:i.itemId,rev:i.rev},ctx);}catch(error){r=null;}
  e=currentEntry(j,pk,i.opId);
  if(staged&&groupCommitted(r,i)){
   committedProof.set(proofKey(NET.wid,pk,i.opId),{state:S,econ:S.econ,vault:S.econ.vault,wallets:S.econ.wallets,wid:NET.wid,result:r});
   const done=recoverCommitted(j,e,i,pk);if(done)return answer(cid,done,local);
   e=currentEntry(j,pk,i.opId);e.state='pending';e.result=pendingResult(i,r);e.committedResult=copy(r);
   // A consumed group is NEVER restored. A retry can only persist this same
   // committed result while the runtime identity/domain proof remains valid.
   return answer(cid,copy(e.result),local);
  }
  if(definitelyRestored(r)){
   const result=Object.assign({},copy(r),{opId:i.opId,durable:false}),rec=persistEntry(j,e,'done',result);e=currentEntry(j,pk,i.opId);
   if(rec){announceCheckpoint(rec);return answer(cid,copy(e.result),local);}
   e.state='pending';e.result=pendingResult(i,r);return answer(cid,copy(e.result),local);
  }
  if(r&&r.ok===true)r=Object.assign({},r,{currency:'unverified',cause:{stage:'committed-proof',code:'unverified',reason:'No runtime group commit proof'}});
  if(r)e.atomicResult=copy(r);
  const unresolved=pendingResult(i,r),rec=persistEntry(j,e,'pending',unresolved);e=currentEntry(j,pk,i.opId);
  if(!rec){e.state='pending';e.result=unresolved;}else announceCheckpoint(rec);
  return answer(cid,copy(e.result),local);
 }finally{activeTrade=null;executing=false;}
}
if(typeof netHostRx==='function'){const orig=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='in'&&m.i&&typeof m.i.a==='string'&&m.i.a.startsWith('trade:'))return receive(cid,m.i,false);return orig.apply(this,arguments);};}
if(typeof netCast==='function'){const orig=netCast;netCast=function(m){if(NET.role==='host'&&m&&m.t==='st'&&S.flags&&validJournal(S.flags[J]))m.tradeSeq={wid:NET.wid,seq:S.flags[J].seq};return orig.apply(this,arguments);};}
// An ACK can precede the live inventory packet. Keep the original operation
// until its authoritative revision/ownership is actually rendered; a fast repeat
// must not become a fresh toggle using the old UI revision after a successful ACK.
function settleReceipts(){
 for(const [id,r] of receipts){
  const i=outbox.get(id);if(!i){receipts.delete(id);continue;}if(i.wid!==NET.wid)continue;
  const u=S.units.find(x=>x.id===r.unitId),shared=(S.inv||[]).find(x=>x.id===r.itemId),owned=u&&[...(u.gbag||[]),...Object.values(u.eq||{})].find(x=>x&&x.id===r.itemId);
  const it=r.action==='sell'?owned:shared,A=window.XW&&XW.gt;if(!it||!A||typeof A.revision!=='function')continue;
  const rev=A.revision(it);let settled=false;
  if(rev===r.rev)settled=r.action==='sell'?!!(owned&&owned.own===r.unitId&&!shared):r.action==='buy'?!!(shared&&shared.own==null&&!owned):!!(shared&&shared.own==null&&!!shared.shelf===r.on);
  else{const n=String(rev).split(':'),old=String(r.rev).split(':');settled=n.length===3&&old.length===3&&n[0]==='gt1'&&old[0]==='gt1'&&n[1]===old[1]&&Number.isSafeInteger(+n[2])&&+n[2]>+old[2];}
  if(settled){outbox.delete(id);receipts.delete(id);}
 }
}
if(typeof netClientRx==='function'){const orig=netClientRx;netClientRx=function(m){
 if(m&&m.t==='trade:result'){if(NET.role==='client'&&m.wid===NET.wid&&m.r&&validResult(m.r)){remember(m.wid,m.r.journalSeq);if(m.r.ok)receipts.set(m.r.opId,copy(m.r));else{if(!m.r.pending){outbox.delete(m.r.opId);receipts.delete(m.r.opId);}}settleReceipts();show(m.r);}return;}
 if(m&&m.tradeSeq&&m.tradeSeq.wid===NET.wid)remember(m.tradeSeq.wid,m.tradeSeq.seq);
 const r=orig.apply(this,arguments);if(m&&(m.t==='welcome'||m.t==='world'||m.t==='full')&&m.snap&&m.snap.flags&&m.snap.flags[J])remember(m.wid||NET.wid,m.snap.flags[J].seq);settleReceipts();return r;
};}
function unitForShelf(u){return u&&u.kind==='disciple'&&!u.np&&!u.dead?u:(S.units||[]).find(x=>x&&x.kind==='disciple'&&!x.np&&!x.dead);}
function itemFor(a,u,id){return a==='trade:buy'?[...(u&&u.gbag||[]),...Object.values(u&&u.eq||{})].find(x=>x&&x.id===id):(S.inv||[]).find(x=>x&&x.id===id);}
function request(a,u,id){
 if(NET.role!=='client')return null;
 if(!NET.tr||!NET.welcomed){const r=reject(null,'disconnected');show(r);return r;}
 settleReceipts();
 if(a==='trade:shelf')u=unitForShelf(u);
 for(const pending of outbox.values())if(pending.wid===NET.wid&&pending.a===a&&pending.unitId===(u&&u.id)&&pending.itemId===id){netIntent(pending);return {ok:false,pending:true,opId:pending.opId};}
 const it=itemFor(a,u,id),A=window.XW&&XW.gt;
 const rev=A&&typeof A.revision==='function'?A.revision(it):null;
 const i={a,opId:session+'_'+(++counter),wid:NET.wid,unitId:u&&u.id,itemId:id,rev,qty:1};
 if(!valid(i)){const r=reject(i,'bad_schema');show(r);return r;}
 // A double click before the reply reuses the SAME operation, not a second toggle.
 outbox.set(i.opId,copy(i));netIntent(i);return {ok:false,pending:true,opId:i.opId};
}
if(typeof gtSellToDisciple==='function'){const orig=gtSellToDisciple;gtSellToDisciple=function(u,id){return NET.role==='client'?request('trade:sell',u,id):orig.apply(this,arguments);};}
if(typeof gtBuyBack==='function'){const orig=gtBuyBack;gtBuyBack=function(u,id){return NET.role==='client'?request('trade:buy',u,id):orig.apply(this,arguments);};}
if(typeof gtShelfToggle==='function'){const orig=gtShelfToggle;gtShelfToggle=function(id){return NET.role==='client'?request('trade:shelf',unitById(bagUnit),id):orig.apply(this,arguments);};}
if(typeof gtBal==='function'){const orig=gtBal;gtBal=function(u){if(NET.role!=='client')return orig.apply(this,arguments);if(!u)return 0;const E=window.XW_ECON;if(typeof gtTreas==='function'&&gtTreas()){const w=E&&typeof E.wallet==='function'?E.wallet(u.id,false):null;return w&&typeof E.bagXia==='function'?E.bagXia(w):0;}return Math.floor(u.lingshi||0);};}
if(typeof gtBag==='function'){const orig=gtBag;gtBag=function(u){return NET.role==='client'?(u&&Array.isArray(u.gbag)?u.gbag:[]):orig.apply(this,arguments);};}
if(typeof NET_LIVE_U!=='undefined')for(const k of ['gbag','lingshi'])if(!NET_LIVE_U.includes(k))NET_LIVE_U.push(k);
if(typeof netLive==='function'){const orig=netLive;netLive=function(){const r=orig.apply(this,arguments);const u=arguments[0];if(u&&u.kind==='disciple'&&!u.np){if(r.gbag)r.gbag=copy(r.gbag);}else{delete r.gbag;delete r.lingshi;}return r;};}
window.addEventListener('click',function(ev){if(NET.role!=='client')return;const b=ev.target&&ev.target.closest&&ev.target.closest('[data-gtsell],[data-gtbuy],[data-gtshelf]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();const a=b.hasAttribute('data-gtsell')?'trade:sell':b.hasAttribute('data-gtbuy')?'trade:buy':'trade:shelf';request(a,unitById(bagUnit),Number(b.getAttribute(a==='trade:sell'?'data-gtsell':a==='trade:buy'?'data-gtbuy':'data-gtshelf')));},true);
function publish(){if(!window.XW)return;XW.netTrade={status:()=>copy(status),schema:()=>({actions:ACTIONS.slice(),execution:!!(XW.gt&&XW.gt.atomic&&XW.gt.atomicProtocol===STAGED_PROTOCOL),protocol:STAGED_PROTOCOL}),migrationWait:()=>show({ok:false,code:'trade_checkpoint_unverified',opId:null}),request,
 retry:function(i){if(!valid(i))return reject(i,'bad_schema');if(NET.role==='host')return receive(null,copy(i),true);if(NET.role!=='client'||!NET.tr||!NET.welcomed)return reject(i,'disconnected');netIntent(copy(i));return {pending:true,opId:i.opId};},pending:()=>[...outbox.values()].map(copy)};
 if(XW.gt){XW.gt.sell=gtSellToDisciple;XW.gt.buy=gtBuyBack;XW.gt.shelf=gtShelfToggle;if(typeof gtBal==='function')XW.gt.bal=gtBal;}
}
const boot=XW045;XW045=function(){const r=boot.apply(this,arguments);publish();return r;};setTimeout(publish,0);setTimeout(publish,350);
})();
