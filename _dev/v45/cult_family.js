// #114/#115 同心緣: extend g15 relationship/save foundations; no generated birth rules.
// Integration: after all existing cult/net modules, immediately before g7 (same IIFE).
(function(){
'use strict';
if(window.CultFamily&&window.CultFamily.installed===1)return;
const PENDING=Object.freeze({birthChance:null,gestationSec:null,birthCooldownSec:null,inheritRootChance:null,inheritBodyChance:null,inheritTalentChance:null,childCapacity:null,maturitySec:null,childLifespan:null});
window.CULT_FAMILY_PENDING=PENDING;
// Technical request generation, not a gameplay probability: stale consent cannot match a later reload.
const requestEpoch=[...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16).padStart(8,'0')).join('');
let requests=[],sessions=new Map(),liveSitting=new Set(),serial=0,allowForm=false,confirmBreak=false,lastHtml='';
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const pc=u=>!!(u&&(u.kind==='player'||u.np));
const host=()=>typeof NET==='undefined'||NET.role!=='client';
const alive=u=>!!(u&&!u.dead&&u.hp>0&&!u.y47dn&&!u.cultYS);
const pairKey=(a,b)=>bk(a,b);
function playerKey(u){if(!u)return null;if(u.np)return String(u.np);if(u.kind==='player')return typeof NET!=='undefined'?(S.flags.netOwner||NET.pkey||'local'):'local';return null;}
function displayName(u){if(!u)return '道友';const pk=playerKey(u),p=typeof NET!=='undefined'&&pk?NET.players.get(pk):null;return p&&p.name||u.name||(typeof nm==='function'?nm(u):'道友');}
function store(){if(!S.cultFamily||S.cultFamily.v!==1)S.cultFamily={v:1,children:[]};return S.cultFamily;}
function online(u){if(!alive(u))return false;if(typeof NET==='undefined'||!NET.role)return !u.np;
 const pk=u.np||NET.pkey,p=NET.players.get(pk);return !!(p&&(p.host||p.online||p.on));}
function samePlace(a,b){
 if(!alive(a)||!alive(b)||S.dg)return false;
 for(const k of ['mapKey','map','dgId','region'])if(a[k]!=null&&b[k]!=null&&String(a[k])!==String(b[k]))return false;
 if(!!a.inside!==!!b.inside||a.inside&&a.inB!==b.inB)return false;
 return true;
}
function spouse(u){return typeof daolvOf==='function'?daolvOf(u):null;}
function eligible(a,b){return pc(a)&&pc(b)&&a.id!==b.id&&playerKey(a)!==playerKey(b)&&online(a)&&online(b)&&samePlace(a,b);}
function actor(pk){
 if(typeof NET==='undefined'||!NET.role){const u=player();return !pk||pk==='local'?u:null;}
 if(NET.role!=='host')return null;
 const p=NET.players.get(pk);if(!p||!(p.host||p.online))return null;
 return p.host?netHostPlayerU():netAvatarOf(pk);
}
const result=(ok,code)=>({ok,code});
function perform(pk,i){
 if(!host())return result(false,'authority');
 if(!i||!['invite','accept','decline','cancel','break','sit','stand','birth'].includes(i.op))return result(false,'operation');
 const a=actor(pk);if(!alive(a)||!pc(a))return result(false,'actor');
 if(i.op==='birth')return result(false,'policy-pending');
 if(i.op==='sit'){
  if(!spouse(a)||!pc(spouse(a))||!samePlace(a,spouse(a)))return result(false,'partner-place');
  if(a.flyOn||a.cultBrk||a.cultXtl||a.retreat||a.cultRetreat||a.inside)return result(false,'busy');
  // Only the authenticated actor opts into meditation. Never move or sit their partner.
  if(typeof setTask==='function')setTask(a,{type:'meditate',t0:S.time});else a.task={type:'meditate',t0:S.time};
  a.path=[];a.dvx=a.dvy=0;return result(true,'sitting');
 }
 if(i.op==='stand'){if(a.task&&a.task.type==='meditate'){a.task=null;a.medit=false;}stopFor(a);return result(true,'standing');}
 if(i.op==='break'){
  const b=spouse(a);if(!pc(b))return result(false,'partner');stopFor(a);
  if(typeof endDual==='function'){endDual(a);endDual(b);}
  S.daolv=S.daolv.filter(p=>!(p.includes(a.id)&&p.includes(b.id)));
  requests=requests.filter(p=>![p.from,p.to].some(id=>id===a.id||id===b.id));
  panelKeyCache=null;return result(true,'separated'); // no stat or relationship penalty added
 }
 if(i.op==='invite'){
  const b=unitById(i.target);if(!eligible(a,b))return result(false,'target-place');
  if(spouse(a)||spouse(b))return result(false,'already-partnered');
  // At most one unresolved proposal involving either player; reciprocal invite is not consent.
  if(requests.some(p=>[p.from,p.to].includes(a.id)||[p.from,p.to].includes(b.id)))return result(false,'pending');
  requests.push({id:'f'+requestEpoch+'_'+(++serial),from:a.id,to:b.id,fromPk:playerKey(a),toPk:playerKey(b)});return result(true,'invited');
 }
 const q=requests.find(p=>p.id===i.invite);if(!q)return result(false,'stale');
 if(i.op==='cancel'){if(q.from!==a.id)return result(false,'not-sender');requests=requests.filter(p=>p!==q);return result(true,'cancelled');}
 if(q.to!==a.id)return result(false,'not-recipient');
 if(q.toPk&&q.toPk!==playerKey(a)||q.fromPk&&q.fromPk!==playerKey(unitById(q.from)))return result(false,'changed');
 if(i.op==='decline'){requests=requests.filter(p=>p!==q);return result(true,'declined');}
 const b=unitById(q.from);
 if(!eligible(a,b)||spouse(a)||spouse(b)){requests=requests.filter(p=>p!==q);return result(false,'changed');}
 allowForm=true;let ok=false;try{ok=formDaolv(b,a);}finally{allowForm=false;}
 if(ok)requests=requests.filter(p=>![p.from,p.to].some(id=>id===a.id||id===b.id));
 return result(!!ok,ok?'bonded':'changed');
}
function stopFor(u){for(const [k,d] of sessions)if(d.a===u.id||d.b===u.id)sessions.delete(k);}
function sitting(u){return !!(u.task&&u.task.type==='meditate'&&!u.flyOn&&!u.cultBrk&&!u.cultXtl&&!u.retreat&&!u.cultRetreat);}
function viewSitting(u){return host()?sitting(u):liveSitting.has(u.id);}
function canPractice(a,b){return eligible(a,b)&&sitting(a)&&sitting(b)&&((a.inside&&b.inside&&a.inB===b.inB)||dist(a.x,a.y,b.x,b.y)<1.6)&&
 !(typeof nearestEnemy==='function'&&(nearestEnemy(a.x,a.y,6)||nearestEnemy(b.x,b.y,6)))&&
 !(typeof dualOf==='function'&&(dualOf(a)||dualOf(b)));}
function tick(dt){
 if(!host()||!Number.isFinite(dt)||dt<=0)return;
 store();const active=new Set();
 for(const p of S.daolv||[]){const a=unitById(p[0]),b=unitById(p[1]);if(!pc(a)||!pc(b))continue;
  const k=pairKey(a,b);if(!canPractice(a,b)||(S.dualCd[k]||0)>S.time){sessions.delete(k);continue;}
  active.add(k);let d=sessions.get(k);if(!d){d={a:a.id,b:b.id,t:0,gain:0};sessions.set(k,d);}
  d.t+=dt;
  // Identical extra cultivation formula to g15.js:58-59, not an invented multiplier.
  const rate=TUNE.dualRate*dualMul(a,b);
  for(const u of [a,b]){const before=u.xiu;gainXiu(u,1.2*rate*cultMul(u)*dt);d.gain+=Math.max(0,u.xiu-before)/2;}
  if(d.t>=TUNE.dualDur){S.dualCd[k]=S.time+TUNE.dualCd;S.stats.duals=(S.stats.duals||0)+1;sessions.delete(k);}
 }
 for(const k of sessions.keys())if(!active.has(k))sessions.delete(k);
}
function preview(a,b){return {pending:true,applied:false,missing:Object.keys(PENDING),parents:[a,b].filter(Boolean).map(u=>({id:u.id,name:displayName(u),lg:clone(u.lg||null),body:u.body,talent:clone(u.trait_id||u.talent||null)})),note:'親代候選資料，非遺傳結果；不複製後天悟性、仙緣、氣運或修煉進度。'};}
function live(){return {v:1,sitting:host()?(S.units||[]).filter(u=>pc(u)&&sitting(u)).map(u=>u.id):[...liveSitting],pairs:clone(S.daolv||[]),pending:clone(requests),sessions:[...sessions.values()].map(clone),cooldowns:clone(S.dualCd||{})};}
function applyLive(d){if(host()||!d||d.v!==1)return false;
 if(Array.isArray(d.pairs))S.daolv=clone(d.pairs).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)&&p[0]!==p[1]);
 liveSitting=new Set((d.sitting||[]).filter(Number.isSafeInteger));requests=Array.isArray(d.pending)?clone(d.pending):[];sessions=new Map((d.sessions||[]).map(x=>[bk(x.a,x.b),clone(x)]));
 if(d.cooldowns&&typeof d.cooldowns==='object')S.dualCd=clone(d.cooldowns);return true;
}
// Migration-only capsule. Pending proposals are not consent; never auto-accept them.
function restoreHandoff(h){
 if(!h||h.v!==1||typeof NET==='undefined'||typeof h.wid!=='string'||!h.wid||h.wid!==NET.wid||!Array.isArray(h.pending))return false;
 const used=new Set();requests=[];
 for(const q of h.pending){if(!q||typeof q!=='object'||Array.isArray(q)||!Number.isSafeInteger(q.from)||!Number.isSafeInteger(q.to))continue;const a=unitById(q.from),b=unitById(q.to);
  if(!/^f[a-f0-9]{32}_[1-9][0-9]*$/.test(q.id)||!pc(a)||!pc(b)||a.id===b.id||spouse(a)||spouse(b)||
    typeof q.fromPk!=='string'||typeof q.toPk!=='string'||q.fromPk===q.toPk||q.fromPk!==playerKey(a)||q.toPk!==playerKey(b)||used.has(a.id)||used.has(b.id))continue;
  used.add(a.id);used.add(b.id);requests.push(clone(q));
 }
 return true;
}
const C={installed:1,perform,tick,isPlayer:pc,preview,live,applyLive,pending:PENDING,state:()=>({v:1,children:clone(store().children),...live()}),open:on=>open(on),request:i=>send(i)};
window.CultFamily=C;
function send(i){let r;if(window.CultFamilyNet)r=CultFamilyNet.request(i);else r=perform('local',i);if(r&&!r.ok)notice(r.code);render();return r;}
const labels={'policy-pending':'生育、遺傳、成長與壽元規格待確認，尚未開放。','target-place':'對方須在線、同一區域，且雙方尚未結緣。','pending':'已有待處理邀請，請先接受、拒絕或取消。','changed':'狀態已變動，邀請失效。','stale':'邀請已處理或取消。','partner-place':'先與玩家道侶在同區會合。','busy':'請先結束目前特殊狀態；室內請使用原打坐操作。','already-partnered':'其中一人已有道侶。'};
function notice(code){if(typeof toast==='function')toast(labels[code]||'操作未完成：'+code);}
function render(){
 const el=document.getElementById('cultFamilyPanel');if(!el||el.hidden)return;
 const a=player();if(!a)return;const b=spouse(a),pending=requests.filter(q=>q.from===a.id||q.to===a.id);
 let h='<h3>同心緣 · 關係 <button class="btn" data-family="close">關閉</button></h3>';
 h+='<p class="dim">玩家結緣須雙方同意；同處各自打坐後自動雙修。移動、起身、遇敵會中止，不接管對方角色。</p>';
 if(b){const d=sessions.get(pairKey(a,b));h+='<p>道侶：<b>'+esc(displayName(b))+'</b>　'+(d?'☯ 雙修中 '+Math.floor(d.t)+' / '+TUNE.dualDur+' 秒':'尚未同處打坐')+'</p>';
  if(pc(b)){h+='<button class="btn" data-family="'+(viewSitting(a)?'stand':'sit')+'">'+(viewSitting(a)?'起身':'我先打坐')+'</button> ';
   h+=confirmBreak?'<button class="btn warn" data-family="confirm-break">確定解除</button> <button class="btn" data-family="keep">取消</button>':'<button class="btn warn" data-family="ask-break">解除道侶</button>';}
 }else{h+='<p>尚未結緣。邀請只表示你的心意，不會自動代替對方同意。</p>';
  const peers=(S.units||[]).filter(u=>pc(u)&&u.id!==a.id&&online(u));
  h+=peers.length?peers.map(u=>'<div class="cf-row">'+esc(displayName(u))+' <button class="btn" data-family="invite" data-target="'+u.id+'">邀請結緣</button></div>').join(''):'<p class="dim">目前沒有同區在線玩家。</p>';
 }
 for(const q of pending){const u=unitById(q.from===a.id?q.to:q.from);h+='<div class="cf-row">'+esc(displayName(u))+(q.to===a.id?' 向你邀請結緣 ':' 尚未回覆 ');
  h+=q.to===a.id?'<button class="btn" data-family="accept" data-invite="'+esc(q.id)+'">同意</button> <button class="btn" data-family="decline" data-invite="'+esc(q.id)+'">拒絕</button>':'<button class="btn" data-family="cancel" data-invite="'+esc(q.id)+'">取消邀請</button>';h+='</div>';}
 h+='<hr><h4>新生兒與血脈</h4><p>生育與繼承：待確認，未開放。尚未決定機率、孕育時間、人口上限、成長及新生兒壽元。</p><button class="btn" disabled title="未定規格不作用於玩家">孕育新生兒（待確認）</button>';
 if(b){const v=preview(a,b);h+='<details><summary>親代資料（不是遺傳結果）</summary>'+v.parents.map(p=>'<p>'+esc(p.name)+'：'+esc(p.lg?lgName(p.lg):'無靈根')+'／'+esc(BODIES[p.body]?BODIES[p.body].n:'體質未記錄')+'</p>').join('')+'<p class="dim">'+esc(v.note)+'</p></details>';}
 if(h!==lastHtml){el.innerHTML=h;lastHtml=h;}
}
function open(on){const el=document.getElementById('cultFamilyPanel');if(!el)return;el.hidden=on===false?true:!on&&!el.hidden;confirmBreak=false;lastHtml='';render();}
function mount(){
 if(document.getElementById('cultFamilyPanel'))return;
 const st=document.createElement('style');st.textContent='#cultFamilyPanel{position:fixed;z-index:115;right:10px;top:90px;width:min(440px,calc(100vw - 20px));max-height:calc(100vh - 110px);overflow:auto;box-sizing:border-box;background:#211b13f5;color:#e8d8b5;border:1px solid #a9864b;border-radius:9px;padding:12px;font-size:14px;box-shadow:0 6px 24px #000b}#cultFamilyPanel[hidden]{display:none}#cultFamilyPanel h3{margin:0 0 9px}#cultFamilyPanel p{line-height:1.5;margin:8px 0}.cf-row{padding:7px 0;border-bottom:1px solid #655033}#cultFamilyBtn{white-space:nowrap}';document.head.appendChild(st);
 const el=document.createElement('section');el.id='cultFamilyPanel';el.hidden=true;el.setAttribute('aria-label','同心緣關係');document.body.appendChild(el);
 const btn=document.createElement('button');btn.id='cultFamilyBtn';btn.className='btn';btn.textContent='同心緣';btn.onclick=()=>open();(document.getElementById('menuBar')||document.body).appendChild(btn);
 el.addEventListener('click',ev=>{const t=ev.target.closest('[data-family]');if(!t)return;const op=t.dataset.family;
  if(op==='close'){open(false);return;}if(op==='ask-break'){confirmBreak=true;lastHtml='';render();return;}if(op==='keep'){confirmBreak=false;lastHtml='';render();return;}
  send({op:op==='confirm-break'?'break':op,...(t.dataset.target?{target:+t.dataset.target}:{}),...(t.dataset.invite?{invite:t.dataset.invite}:{})});confirmBreak=false;
 });
}
const _form=formDaolv;formDaolv=function(a,b){if(pc(a)&&pc(b)&&!allowForm)return false;return _form.apply(this,arguments);};
const _can=canDaolv;canDaolv=function(a,b){if(allowForm&&pc(a)&&pc(b)){if(!alive(a)||!alive(b)||a===b||spouse(a)||spouse(b))return '狀態已變動';return '';}return _can.apply(this,arguments);};
const _start=startDual;startDual=function(u,mode){const a=mode==='player'||!mode?player():u,b=mode==='player'||!mode?u:spouse(u);if(pc(a)&&pc(b))return false;return _start.apply(this,arguments);};
const _tick=tickDuals;tickDuals=function(dt){const r=_tick.apply(this,arguments);tick(dt);return r;};
const _snap=snapV045;snapV045=function(o){const r=_snap.apply(this,arguments);o.v45=o.v45||{};o.v45.cultFamily=clone(store());return r||o;};
const _apply=applyV045;applyV045=function(d){requests=[];sessions.clear();liveSitting.clear();confirmBreak=false;const r=_apply.apply(this,arguments);const v=d&&d.v45&&d.v45.cultFamily;S.cultFamily=v&&v.v===1?{...clone(v),v:1,children:Array.isArray(v.children)?clone(v.children):[]}: {v:1,children:[],...(v?{unrecognized:clone(v)}:{})};if(v&&v.v===1&&v.handoff)restoreHandoff(v.handoff);delete S.cultFamily.handoff;return r;};
// Child/future payload is retained as inert data, never spawned or given invented lifespan/stats.
const _new=newState;newState=function(){requests=[];sessions.clear();liveSitting.clear();const s=_new.apply(this,arguments);s.cultFamily={v:1,children:[]};return s;};
const _ui=updateUI;updateUI=function(){const r=_ui.apply(this,arguments);mount();render();return r;};
setTimeout(mount,0);
})();
