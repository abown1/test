// ================== v0.5 聯機：緊急修正（net9_coopfix.js，串在 net8_g19.js 之後、g7.js 之前）==================
// 1) 彈窗不暫停共用世界：遊戲原本在 frame() 裡「uiBlock()／helpShown 為真就不跑 update()」，聯機時任何人開視窗（仙緣、選擇、確認、設定、存檔、
//    說明、暫停選單、死亡畫面…）會讓房主的模擬停住（大家一起卡），或讓成員端停止插值（自己的畫面卡住）。聯機中這些都只是本機 UI：模擬照跑。
//    只有房主明確按「全體暫停」才會暫停，所有人看到「房主XX 暫停了遊戲」。
// 2) 名字標籤：每位玩家角色頭上顯示名號（自己＝「你」金色），資料來自每秒同步的玩家清單（含晚加入／重連）。
// 3) 成員端平滑：房主每 100ms 送一次位置（只送有變的，附房主時鐘），成員端以約 130ms 前的時間點在兩筆位置間插值（不再每 200ms 追一次 → 一頓一頓）；
//    完整單位關鍵幀從每 5 秒改成每 30 秒（或要求時）；成員端 HUD 更新降為約 3 次/秒。
// 8) 幽靈成員：斷線者在名單顯示「斷線中… (N 秒)」、不算人數；9 秒沒心跳就判斷線；關頁面送 leave 立即移除；保留名額縮短為 60 秒；
//    名號：沒設定過就讓欄位空白提示輸入；改名號會即時同步到房主與所有人。
// 依賴：net2（NET、netHostTick、netPatch、netClientUpdate、netPlayerList、netHostDrop、netApplyIntent）、net3（netRender、netUiAct）、net5（netClientRxExtra）。
const NET9={interp:110,psMs:55,uiMs:330,get grace(){return NET_GRACE;},set grace(v){NET_GRACE=Math.max(2,+v||60);},get silent(){return NET_SILENT_HOST;},set silent(v){NET_SILENT_HOST=Math.max(2000,+v||9000);}};
if(NET_Q.get('netinterp')!=null)NET9.interp=+NET_Q.get('netinterp');
function netCoopOn(){return !!(NET.role&&NET.tr&&(NET.role==='host'||NET.welcomed));}
// 成員端 S.time：房主權威。只採用「不早於已認證」的 st.time／ps.time；不在本機用牆鐘外推（否則新包回跳、全體暫停時仍前進）。
// net2 的 netClientUpdate 仍會 S.time+=dt，外層立刻拉回 NET._ht。全體暫停（NET.hp.on）時凍結在最後認證時間。
// ps 附帶房主 S.time（非外推）：st 延後時仍能跟上；新鐘只靠 netHtApply 時間單調不倒退（不另造 seq）。0-frame 主機本來就不推進 S.time，ps 不會假裝治好排程。
function netHtApply(t){t=+t;if(!isFinite(t))return;if(NET.role==='host')return;if(NET._ht==null||t>=NET._ht-1e-9){NET._ht=t;NET._htAt=performance.now();}
  // 即使 net2 已用較舊 m.time 覆寫，也拉回已認證時間（延遲/亂序包不倒退）
  if(NET.role==='client'&&NET._ht!=null)S.time=NET._ht;}
function netHtSessionReset(){NET._ht=null;NET._htAt=null;NET._psTimeSent=null;}
function netPsClockApply(m){if(!m||NET.role!=='client')return false;
  if(NET.hp&&NET.hp.on)return false; // pauseAll：連發 ps 也不走鐘
  if(m.time==null||!isFinite(+m.time))return false;
  const myR=S.dg?'dg':'ow';if(m.r!=null&&m.r!==myR)return false; // 舊區域（現場 S.dg）
  if(m.wv!=null&&NET.wv!=null&&m.wv!==NET.wv)return false; // 既有世界版本 NET.wv（welcome／netShareWorld），非新握手
  const prev=NET._ht,t=+m.time;netHtApply(t);
  return !(NET._ht==null||t<((prev==null)?t:prev)-1e-9);} // 只報告鐘是否被採納；不倒退。不宣稱整包 ps 防亂序
{const _lv=netLeave;netLeave=function(){netHtSessionReset();return _lv.apply(this,arguments);};}
{const _ls=netLoadSnap;netLoadSnap=function(){const r=_ls.apply(this,arguments);if(r&&NET.role==='client'){netHtSessionReset();try{if(S&&isFinite(+S.time))netHtApply(S.time);}catch(e){}}return r;};}
{const _st=netApplySt;netApplySt=function(m){if(NET._holdStClock&&m&&m.time!=null){m=Object.assign({},m);m.time=NET._ht!=null?NET._ht:m.time;}const r=_st.apply(this,arguments);try{if(m&&m.time!=null)netHtApply(m.time);}catch(e){}return r;};}
// ---------------- 1) 彈窗不暫停 ----------------
NET.hp={on:false,by:''};NET.coop={ran:0,blocked:0};
{const _ub=uiBlock;uiBlock=function(){if(NET._inFrame&&NET.hp.on&&netCoopOn())return true;return _ub.apply(this,arguments);};}
{const _f=frame;frame=function(now){if(!netCoopOn()||paused)return _f.apply(this,arguments);
  const dt=Math.min(0.05,(now-last)/1000);let blocked=false;try{NET._inFrame=false;blocked=!!(helpShown||uiBlock());}catch(e){}
  NET._inFrame=true;try{_f.apply(this,arguments);}finally{NET._inFrame=false;}
  if(blocked&&!NET.hp.on&&!titleOpen&&dt>0){NET.coop.blocked++;try{update(dt);NET.coop.ran++;}catch(e){console.error(e);}}
  netPauseBanner();};}
// 房主「全體暫停」
function netPauseAll(on){if(NET.role!=='host')return false;NET.hp={on:!!on,by:on?netName():''};netLog(on?'host pause':'host resume');netPsSend(true);netPauseBanner();return true;}
function netPauseBanner(){let el=document.getElementById('netpz');const on=netCoopOn()&&NET.hp.on;
  if(!on){if(el&&el.style.display!=='none')el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='netpz';el.style.cssText='position:fixed;z-index:60;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);max-width:90vw;background:#1d140af0;border:1px solid #f3c94a;color:#ffe9a8;padding:12px 18px;border-radius:10px;font-size:16px;text-align:center';
    el.addEventListener('click',ev=>{if(ev.target.dataset.np==='resume')netPauseAll(false);});document.body.appendChild(el);}
  const t=NET.role==='host'?`⏸ 你暫停了全體（所有玩家都停住）<br><button class="btn" data-np="resume" style="margin-top:8px">▶ 繼續</button>`:`⏸ 房主${netEsc(NET.hp.by||'')} 暫停了遊戲`;
  if(el._t!==t){el._t=t;el.innerHTML=t;}el.style.display='';
  // 手機頂列較高、宗門目標／小地圖／弟子列也在頂端 → 放在「和橫幅同欄」的 HUD 元件下方（桌機維持 64px）
  const now=performance.now();if(!(now-(el._pt||0)<300)){el._pt=now;try{el.style.top='calc(env(safe-area-inset-top,0px) + 64px)';const z=el.getBoundingClientRect();let b=0;
    for(const id of ['topbar','objectives','minimap','pbar','x47mmt','netpt']){const x=document.getElementById(id);if(!x)continue;const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden')continue;const r=x.getBoundingClientRect();
      if(r.width>0&&r.height>0&&r.left<z.right&&r.right>z.left&&r.top<z.top+z.height+Math.max(0,b-z.top)&&r.bottom>z.top&&r.bottom>b)b=r.bottom;}
    if(b>z.top-2&&b+z.height<innerHeight*0.6)el.style.top=Math.round(b+8)+'px';}catch(e){}}}
{const _ph=pauseHtml;pauseHtml=function(){let h=_ph.apply(this,arguments);if(!netCoopOn())return h;
  h=h.replace('<h3>⏸ 暫停</h3>','<h3>☰ 選單（聯機中：世界不會暫停）</h3>');
  if(NET.role==='host')h=h.replace('<button class="btn pri" data-pz="resume">','<button class="btn" data-pz="netpause">⏸ 全體暫停</button><button class="btn pri" data-pz="resume">');return h;};}
{const _pa=pauseAct;pauseAct=function(a){if(a==='netpause'){openPause(false);netPauseAll(true);return;}return _pa.apply(this,arguments);};}
// 時鐘「暫停」字樣：聯機時說明視窗不會暫停
{const _u=updateUI;updateUI=function(){
  if(NET.role==='client'&&netCoopOn()){const t=performance.now();if(t-(NET._uiT||0)<NET9.uiMs)return;NET._uiT=t;} // 成員端 HUD 降頻
  const r=_u.apply(this,arguments);try{if(netCoopOn()&&helpShown&&!paused){const el=document.getElementById('r_time');if(el&&el.textContent.startsWith('暫停 '))el.textContent=el.textContent.slice(3);}}catch(e){}return r;};}
{const _ct=netClientUpdate;netClientUpdate=function(dt){const r=_ct.apply(this,arguments);try{if(NET.role==='client'&&NET._ht!=null&&isFinite(NET._ht))S.time=NET._ht;}catch(e){}return r;};}
// ---------------- 2) 名字標籤 ----------------
function netNameTags(){if(!NET.role)return [];const L=NET.role==='host'?netPlayerList():[...NET.players.values()];if(L.length<2)return [];
  const me=(player()||{}).id;return L.map((p,k)=>({uid:p.uid,name:(p.name&&String(p.name).trim())||('P'+(k+1)),host:!!p.host,on:p.on!==false,me:p.uid!=null&&p.uid===me}));}
NET.tagDraw=[];
function netDrawNames(){NET.tagDraw=[];if(!NET.role||S.interior)return;const tags=netNameTags();if(!tags.length)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textAlign='center';const z=cam.zoom;
  for(const t of tags){const u=t.uid!=null?unitById(t.uid):null;if(!u||u.dead||u.inside)continue;const p=iso(u.x,u.y);
    const sx=(p.x-cam.x)*z+W/2,sy=(p.y-54-cam.y)*z+H/2;if(sx<-60||sx>W+60||sy<-30||sy>H+30)continue;
    const txt=t.me?`你・${t.name}`:(t.host?'👑 ':'')+t.name+(t.on?'':'（斷線）');
    ctx.font='bold 13px sans-serif';ctx.lineWidth=3.5;ctx.strokeStyle='rgba(0,0,0,0.8)';ctx.strokeText(txt,sx,sy);ctx.fillStyle=t.me?'#ffd75e':t.on?'#9fe8ff':'#9a9a9a';ctx.fillText(txt,sx,sy);
    NET.tagDraw.push({uid:t.uid,name:t.name,txt,me:t.me,x:Math.round(sx),y:Math.round(sy)});}}
{const _d=draw;draw=function(){const r=_d.apply(this,arguments);try{netDrawNames();}catch(e){console.error('[net] names',e);}return r;};}
// ---------------- 3) 平滑：位置串流＋插值 ----------------
NET._psLast={u:new Map(),e:new Map(),w:new Map()};NET.ps={sent:0,bytes:0,rx:0,off:null,offs:[]};
function netPsSend(force){return netPerRegion(()=>netPsSend0(force));} // 副本進行中：兩個區域分開送
function netPsSend0(force){if(NET.role!=='host'||!NET.tr||!S||!netMembersOnline())return;const L=NET._psLast,m={t:'ps',hw:Math.round(performance.now()),u:[],e:[],w:[]};
  m.time=netR2(S.time);m.r=S.dg?'dg':'ow';if(NET.wv!=null)m.wv=NET.wv;
  const add=(arr,map,list)=>{for(const o of list){const x=netR2(o.x),y=netR2(o.y),k=x+','+y;if(map.get(o.id)!==k){map.set(o.id,k);arr.push(o.id,x,y);}}};
  add(m.u,L.u,S.units);add(m.e,L.e,S.enemies);if(!S.dg)add(m.w,L.w,S.wand||[]);
  if(NET.hp.on)m.hp=NET.hp.by||'房主';
  // 技能冷卻：每位玩家角色有變就送（不再每 5 包才檢查）。先前 %5 會錯過「清冷卻→再施放成同一四捨五入值」，成員端 acd 被空包清掉後收不到新值（#11）。
  {const cd=[];const L2=NET._psCd||(NET._psCd=new Map());for(const u of S.units){if(u.kind!=='player'&&!u.np)continue;const a={};for(const k in u.acd||{})if(u.acd[k]>0)a[k]=Math.ceil(u.acd[k]*10)/10;const j=JSON.stringify(a);if(L2.get(u.id)!==j){L2.set(u.id,j);cd.push(u.id,a);}}if(cd.length)m.cd=cd;}
  const timeCh=NET._psTimeSent==null||m.time!==NET._psTimeSent;
  if(!force&&!m.u.length&&!m.e.length&&!m.w.length&&!m.hp&&!m.cd&&!timeCh&&performance.now()-(NET._psT||0)<1000)return;NET._psT=performance.now();
  NET._psTimeSent=m.time; // 同值不重送（harmless）；leave／welcome 會清掉
  try{netCast(m);NET.ps.sent++;}catch(e){}}
// 獨立的 100ms 計時（Worker：背景分頁也不會被降頻）
function netPsTicker(){if(NET._psTk)return;NET._psTk=true;const tick=()=>{try{if(NET.role==='host')netPsSend(false);}catch(e){console.error('[net] ps',e);}};
  try{const b=new Blob(['setInterval(()=>postMessage(1),'+NET9.psMs+');'],{type:'text/javascript'});const w=new Worker(URL.createObjectURL(b));w.onmessage=tick;NET._psW=w;}catch(e){setInterval(tick,NET9.psMs);}}
{const _h=netHostTick;netHostTick=function(){if(NET.role==='host'&&S&&NET.tr)netPsTicker();return _h.apply(this,arguments);};}
// 成員端：位置樣本
function netPsClock(hw){const now=performance.now(),o=now-hw,P=NET.ps;P.offs.push(o);if(P.offs.length>40)P.offs.shift();P.off=Math.min(...P.offs);return hw+P.off;}
function netPsPush(o,t,x,y){const b=o._hb||(o._hb=[]);if(b.length&&t<=b[b.length-1].t)return;b.push({t,x,y});if(b.length>12)b.splice(0,b.length-12);o._tx=o._ty=null;}
function netPsRx(m){const P=NET.ps;P.rx++;const t=netPsClock(m.hw);
  const ap=(arr,find)=>{for(let k=0;k+2<arr.length;k+=3){const o=find(arr[k]);if(o)netPsPush(o,t,arr[k+1],arr[k+2]);}};
  ap(m.u||[],unitById);ap(m.e||[],enemyById);if(m.w&&S.wand)ap(m.w,id=>S.wand.find(w=>w.id===id));
  if(m.cd)for(let k=0;k+1<m.cd.length;k+=2){const u=unitById(m.cd[k]);if(u)u.acd=Object.assign({},m.cd[k+1]);}
  const hp=!!m.hp;if(hp!==NET.hp.on||(hp&&m.hp!==NET.hp.by)){NET.hp={on:hp,by:m.hp||''};netPauseBanner();try{if(NET.role==='client'&&NET._ht!=null)S.time=NET._ht;}catch(e){}}
  try{netPsClockApply(m);}catch(e){}}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='ps'){if(NET.welcomed)netPsRx(m);return;}return _x.apply(this,arguments);};}
// 有位置串流的物件：st 裡的 x／y 不再拿來追（避免兩個來源互搶）
{const _p=netPatch;netPatch=function(o,d){if(o&&o._hb&&o._hb.length&&('x' in d||'y' in d)){d=Object.assign({},d);delete d.x;delete d.y;}return _p.call(this,o,d);};}
function netInterp(o,rt,dt){const b=o._hb;if(!b||!b.length)return;let x,y;
  if(rt<=b[0].t){x=b[0].x;y=b[0].y;}
  else{let k=b.length-1;while(k>0&&b[k-1].t>rt)k--; // b[k-1].t<=rt<b[k].t
    if(b[k].t<=rt){const a=b[b.length-1],p=b.length>1?b[b.length-2]:a;const ex=Math.min(rt-a.t,NET9.psMs);const sp=a.t-p.t>0?ex/(a.t-p.t):0; // 樣本遲到：最多外推 100ms
      x=a.x+(a.x-p.x)*sp*(ex>0?1:0);y=a.y+(a.y-p.y)*sp*(ex>0?1:0);if(rt-a.t>NET9.psMs*3){x=a.x;y=a.y;}}
    else{const a=b[k-1],c=b[k],f=(rt-a.t)/(c.t-a.t);x=a.x+(c.x-a.x)*f;y=a.y+(c.y-a.y)*f;if(k>1)b.splice(0,k-1);}}
  const dx=x-o.x,dy=y-o.y,dd=Math.hypot(dx,dy);
  if(dd>4){o.x=x;o.y=y;o.vx=o.vy=0;return;} // 傳送／換場景：直接到位
  o.x=x;o.y=y;o.vx=dt>0?dx/dt:0;o.vy=dt>0?dy/dt:0;if(dd>0.002){o.walk=(o.walk||0)+dt*1.2;const s=dx-dy;if(Math.abs(s)>0.002)o.faceT=s>0?1:-1;}}
{const _c=netClientUpdate;netClientUpdate=function(dt){if(NET.ps.rx){const rt=performance.now()-NET9.interp;for(const u of S.units)netInterp(u,rt,dt);for(const e of S.enemies)netInterp(e,rt,dt);if(S.wand)for(const w of S.wand)netInterp(w,rt,dt);}
  return _c.apply(this,arguments);};}
// ---------------- 8) 幽靈成員／名號 ----------------
function netNamed(){try{return localStorage.getItem('xianwu_net_named')==='1';}catch(e){return false;}}
function netPlayerRows(){const L=NET.role==='host'?netPlayerList():[...NET.players.values()];const on=L.filter(p=>p.on!==false),off=L.filter(p=>p.on===false);
  let h=`<div class="muted" id="np_cnt">成員 ${on.length}/${NET_MAX}${off.length?`（另有 ${off.length} 人斷線中）`:''}</div><div id="np_list">`;
  for(const pl of [...on,...off]){const pk=pl.pk||pl.pkey,dc=pl.on===false;
    h+=`<div class="pl${dc?' off':''}" data-pk="${netEsc(pk)}"${dc?' style="opacity:.55"':''}><span>${pl.host?'👑 ':''}${netEsc(pl.name)}${pk===NET.pkey?'（你）':''}${dc?`<span class="muted"> 斷線中…${pl.off!=null?` (${pl.off}s／${pl.gr||NET9.grace}s 後釋出名額)`:''}</span>`:''}</span>${NET.role==='host'&&!pl.host?`<button class="btn" data-n="kick" data-w="${netEsc(pk)}">${dc?'移除':'請離'}</button>`:''}</div>`;}
  return h+'</div>';}
{const _r=netRender;netRender=function(){const r=_r.apply(this,arguments);try{const p=netEl('netp');if(!p||!netPanelOpen)return r;
    const nm=netEl('np_name');if(nm){if(!netNamed()){nm.value='';nm.placeholder='輸入你的名號（其他玩家會看到）';}
      if(!nm._n9){nm._n9=1;nm.addEventListener('change',()=>{const v=nm.value.trim();if(!v)return;try{localStorage.setItem('xianwu_net_named','1');}catch(e){}netRename(v);});}}
    if(NET.role){const cnt=p.querySelector('.muted');const list=netEl('np_list');if(list){const prev=list.previousElementSibling;if(prev&&prev.classList.contains('muted'))prev.remove();list.outerHTML=netPlayerRows();}}}catch(e){console.error('[net] render',e);}return r;};}
setInterval(()=>{try{if(netPanelOpen&&NET.role&&[...NET.players.values()].some(p=>p.on===false||(p.online===false&&!p.host)))netRender();}catch(e){}},1000);
// 名號：加入／開房時若欄位空白就沿用（或產生）預設名；改名即時同步
{const _a=netUiAct;netUiAct=async function(a,w){const nm=netEl('np_name');if(nm&&nm.value.trim()){try{localStorage.setItem('xianwu_net_named','1');}catch(e){}}else if(nm&&(a==='join'||a==='host'||a==='hostw'))nm.value=netName();
  if(a==='kick'&&NET.role==='host'){const p=NET.players.get(w);if(p&&!p.host&&!p.online){NET.players.delete(w);if(typeof netDgMemberGone==='function')netDgMemberGone(w);toast(`已移除斷線的 ${p.name}（名額釋出，角色留在宗門）`);netLog('removed offline',w);netBroadcastLobby();netChanged();return;}}
  return _a.apply(this,arguments);};}
function netRename(n){n=String(n||'').trim().slice(0,12);if(!n)return;netSetName(n);try{localStorage.setItem('xianwu_net_named','1');}catch(e){}
  if(NET.role==='client')netIntent({a:'name',n});else if(NET.role==='host'){const me=[...NET.players.values()].find(p=>p.host);if(me)me.name=n;netBroadcastLobby();netChanged();}}
// 測試／API
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net)Object.defineProperties(o.net,Object.getOwnPropertyDescriptors({pauseAll:netPauseAll,ht:()=>({ht:NET._ht,at:NET._htAt,t:S&&S.time,hp:!!(NET.hp&&NET.hp.on)}),htApply:t=>netHtApply(t),psHt:m=>netPsClockApply(m),holdStClock:on=>{NET._holdStClock=!!on;return !!NET._holdStClock;},get hp(){return Object.assign({},NET.hp);},get coop(){return Object.assign({},NET.coop);},tags:()=>NET.tagDraw.slice(),nameTags:netNameTags,
  get ps(){return {sent:NET.ps.sent,rx:NET.ps.rx,off:NET.ps.off};},cfg:NET9,rename:netRename,rows:netPlayerRows}));return o;};}
