// ===== net15：宗門議事投票（#4）=====
// 聯機（≥2 位在線玩家）時，來源為「宗門」的抉擇（showChoice(t,txt,opts,'宗門')）不再只由房主決定：
//   每個頁面都看到議事卡（不暫停世界），點選項投票、可以改票，票數旁顯示投票人；
//   全員投完或倒數 NET_VOTE.ms 結束 → 多數決；平手由房主的票決定（房主沒投平手選項 → 預設選項）；沒人投 → 預設「再觀察一陣子」。
//   房主執行選項的 f()（含花費檢查）→ 所有人看到結果提示。卡片可縮小成 HUD 徽章「📜 宗門議事 (n)」。同時多件 → 排隊。
//   後加入的成員會收到進行中的議事。開關：?netexp=-vote
const NET_VOTE={ms:30000,def:'再觀察一陣子'};
NET.vote=null;NET.voteQ=[];NET.voteMin=false;NET.voteLast=null;
function netVoteOn(){return NET_FLAGS.vote&&NET.role==='host'&&[...NET.players.values()].filter(p=>p.host||p.online).length>=2;}
function netVotePub(V){return V&&{id:V.id,t:V.t,txt:V.txt,o:V.o.map(o=>o.l),votes:V.votes,names:V.names,end:V.end,left:Math.max(0,V.end-Date.now()),def:V.def,q:NET.voteQ.length};}
function netVoteBcast(){if(NET.role!=='host'||!NET.tr)return;try{NET.tr.broadcast({t:'vote',v:netVotePub(NET.vote)});}catch(e){}netVoteRender();}
function netVoteStart(t,txt,opts){let o=opts.slice();let def=o.findIndex(x=>x&&String(x.l).includes(NET_VOTE.def));
  if(def<0){o.push({l:'🕰 '+NET_VOTE.def,f:()=>'眾人商議之後，決定再觀察一陣子。'});def=o.length-1;}
  const V={id:'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),t,txt,o,def,votes:{},names:{},end:0};
  if(NET.vote){NET.voteQ.push(V);netVoteBcast();return true;}
  V.end=Date.now()+NET_VOTE.ms;NET.vote=V;NET.voteMin=false;netLog('sect vote start',t);netVoteBcast();return true;}
function netVoteCast(pk,id,i){const V=NET.vote;if(!V||V.id!==id)return false;i=+i;if(!(i>=0&&i<V.o.length))return false;
  const p=NET.players.get(pk);if(!p||!(p.host||p.online))return false;V.votes[pk]=i;V.names[pk]=p.name||'道友';netVoteBcast();
  const on=[...NET.players.values()].filter(p=>p.host||p.online).map(p=>p.pkey);if(on.every(k=>k in V.votes))netVoteResolve('all');return true;}
function netVoteTally(V){const n=V.o.map(()=>0);for(const k in V.votes)n[V.votes[k]]++;const mx=Math.max(...n);if(mx<=0)return V.def;
  const top=n.map((c,i)=>c===mx?i:-1).filter(i=>i>=0);if(top.length===1)return top[0];
  const hv=V.votes[NET.pkey];return top.includes(hv)?hv:(top.includes(V.def)?V.def:top[0]);}
function netVoteResolve(why){const V=NET.vote;if(!V)return;NET.vote=null;let i=netVoteTally(V);let o=V.o[i];
  if(o&&o.c&&!canPay2(o.c)){i=V.def;o=V.o[i];}
  let res='';const run=()=>{if(o.c)pay2(o.c);res=o.f?o.f():'';S.stats.events=(S.stats.events||0)+1;};
  const cap=NET.capture;NET.capture=null;
  try{if(S.dg&&typeof netInR==='function'&&netDgRun())netInR('ow',run);else run();}catch(e){console.error('[net] vote f',e);res='';}
  const R={id:V.id,t:V.t,l:o.l,txt:res||'',n:Object.keys(V.votes).length,why};NET.voteLast=R;
  try{toast(`📜 宗門議事「${V.t}」：${o.l}${res?'──'+String(res).replace(/<[^>]+>/g,''):''}`);}finally{NET.capture=cap;}
  netLog('sect vote resolved',V.t,o.l,why);if(NET.tr)try{NET.tr.broadcast({t:'voteres',r:R});}catch(e){}
  const nx=NET.voteQ.shift();if(nx){nx.end=Date.now()+NET_VOTE.ms;NET.vote=nx;}netVoteBcast();}
// 房主：宗門抉擇改成投票
{const _x=showChoice;showChoice=function(t,txt,opts,src){if(src==='宗門'&&netVoteOn()&&Array.isArray(opts)&&opts.length)return netVoteStart(t,txt,opts);return _x.apply(this,arguments);};}
// 倒數、後加入者
NET._voteT=0;
{const _x=update;update=function(dt){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&(NET.vote||NET.voteQ.length)){const V=NET.vote;
  if(V&&Date.now()>=V.end)netVoteResolve('timeout');const t=performance.now();if(t-NET._voteT>1000){NET._voteT=t;const on=[...NET.players.values()].filter(p=>p.online).length;if(on!==NET._voteOn){NET._voteOn=on;netVoteBcast();}}}}catch(e){console.error('[net] vote tick',e);}return r;};}
// 成員端：意圖與接收
{const _x=netIntentRegion;netIntentRegion=function(pk,i){if(i&&i.a==='vote')return null;return _x.apply(this,arguments);};}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='vote'){const r=netVoteCast(pk,i.id,i.i);if(r)NET.stats.applied++;return r;}return _x.apply(this,arguments);};}
function netVoteDo(i){const V=NET.vote;if(!V)return false;if(NET.role==='host')return netVoteCast(NET.pkey,V.id,i);netIntent({a:'vote',id:V.id,i});return true;}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='vote'){const had=NET.vote&&NET.vote.id;NET.vote=m.v?Object.assign({},m.v,{end:Date.now()+m.v.left}):null;if(NET.vote&&NET.vote.id!==had)NET.voteMin=false;
    NET.voteQn=m.v?m.v.q:0;netVoteRender();return;}
  if(m&&m.t==='voteres'){NET.voteLast=m.r;toast(`📜 宗門議事「${m.r.t}」：${m.r.l}${m.r.txt?'──'+String(m.r.txt).replace(/<[^>]+>/g,''):''}`);if(NET.vote&&NET.vote.id===m.r.id)NET.vote=null;netVoteRender();return;}
  return _x.apply(this,arguments);};}
// ---- UI：議事卡＋徽章 ----
function netVoteView(){const V=NET.vote;if(!V)return null;const pub=NET.role==='host'?netVotePub(V):V;return Object.assign({},pub,{left:Math.max(0,V.end-Date.now()),q:NET.role==='host'?NET.voteQ.length:(NET.voteQn||0)});}
function netVoteRender(){let el=document.getElementById('netvote');const v=netVoteView();
  if(!v){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='netvote';el.style.cssText='position:fixed;right:10px;z-index:45;background:rgba(28,22,10,.94);border:1px solid #b8913a;border-radius:8px;color:#f3e6c4;font-size:13px;max-width:340px;box-shadow:0 2px 12px #000a';
    el.addEventListener('click',e=>{const b=e.target.closest('[data-vt]');if(!b)return;e.stopPropagation();const a=b.dataset.vt;if(a==='min'){NET.voteMin=true;netVoteRender();}else if(a==='max'){NET.voteMin=false;netVoteRender();}else netVoteDo(+a);});document.body.appendChild(el);}
  const esc=s=>typeof netEsc==='function'?netEsc(s):String(s);const n=1+(v.q||0);const s=Math.ceil(v.left/1000);const mine=v.votes[NET.pkey];
  let h;if(NET.voteMin)h=`<div data-vt="max" style="padding:5px 12px;cursor:pointer">📜 宗門議事 (${n})　${s}s</div>`;
  else{h=`<div style="padding:10px 12px"><div style="display:flex;justify-content:space-between"><b>📜 宗門議事・${esc(v.t)}</b><span data-vt="min" style="cursor:pointer">－</span></div><div style="margin:6px 0;opacity:.9">${v.txt}</div>`;
    v.o.forEach((l,i)=>{const who=Object.keys(v.votes).filter(k=>v.votes[k]===i).map(k=>v.names[k]||'道友');
      h+=`<div style="margin:3px 0"><button class="btn ${mine===i?'on':''}" data-vt="${i}">${esc(l)}</button> ${who.map(w=>`<span class="tg" style="font-size:11px">${esc(w)}</span>`).join(' ')}${i===v.def?'<span style="opacity:.6;font-size:11px">（預設）</span>':''}</div>`;});
    h+=`<div style="opacity:.7;font-size:11px;margin-top:4px">${s} 秒後依多數決定；平手由房主決定${v.q?`｜之後還有 ${v.q} 件`:''}</div></div>`;}
  if(el._h!==h){el._h=h;el.innerHTML=h;}el.style.top=NET.voteMin?'92px':'90px';el.style.display='';}
setInterval(()=>{try{if(NET.vote||document.getElementById('netvote'))netVoteRender();}catch(e){}},250);
{const _x=netLeave;netLeave=function(){NET.vote=null;NET.voteQ=[];try{netVoteRender();}catch(e){}return _x.apply(this,arguments);};}
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.vote={do:netVoteDo,cfg:NET_VOTE,get cur(){return netVoteView();},get last(){return NET.voteLast;},
  min:b=>{NET.voteMin=!!b;netVoteRender();},badge:()=>{const e=document.getElementById('netvote');return e&&e.style.display!=='none'?e.textContent:'';},
  ask:(t,txt,labels)=>showChoice(t,txt,labels.map((l,k)=>({l,f:()=>{S.res.lingshi+=k+1;return `靈石 +${k+1}`;}})),'宗門')};}return o;};}
