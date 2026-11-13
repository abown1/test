// ===== net17：秘境「首領傳送點」（#187）＋ #186 不強制傳送（仙凡之門大殿封鎖）＋ #185 耦合稽核修正與測試掛鉤 =====
// #187 規則：
//  - 每個秘境的入口房（rooms[0]）有一個「首領傳送點」（入口右側）。解鎖條件沿用副本原有進度：首領房已有人抵達（房間不再是 idle／已封鎖／已通關）
//    或通往首領房的房間全部清除（所有非首領房 state==='clear'）。
//  - 副本中的任何玩家走到傳送點旁 → 自己畫面出現按鈕 → 自己確認 → 只有他和「他帶進副本的弟子」（進場時標記 u._dgBy）傳到首領房。
//  - 沒確認的人（和他們的弟子）完全不動。房主端驗證（在副本內、距離、解鎖），成員送意圖 {a:'bossgate'}。
// #186（取代 g20 v156Lock 的整隊強制傳送）：聯機中仙凡之門大殿封鎖時，只有「已在大殿內（含門框）」的玩家角色與其弟子留在／收進大殿，
//  其他人不被傳送；大殿外的人之後可用首領傳送點自行加入（封鎖牆不擋傳送）。單機不變（仍是原本整隊集合）。
// 旗標：NET_FLAGS.bossgate（?netexp=-bossgate 關閉 → 回到原本行為、沒有傳送點）。
const NET17={r:2.2,lastGo:null,n:0};
function netBgOn(){return typeof NET_FLAGS==='undefined'||NET_FLAGS.bossgate!==false;}
function netPkOfU(u){if(!u)return null;if(u.np)return u.np;if(u.kind==='player')return NET.pkey||'host';return null;}
function netBossRoom(D){D=D||S.dg;return D&&D.L&&D.L.rooms.find(r=>r.boss)||null;}
function netGatePt(D){D=D||S.dg;const r=D&&D.L&&D.L.rooms[0];if(!r)return null;return {x:Math.floor(r.cx)+3.5,y:Math.floor(r.cy)+0.5};}
function netGateOpen(D){D=D||S.dg;if(!D||!D.L)return false;const B=netBossRoom(D);if(!B)return false;
  if(D.cleared||D.lock||B.state!=='idle')return true;return D.L.rooms.every(r=>r.boss||r.state==='clear');}
function netInRect(u,r,pad){return u.x>=r.x0-pad&&u.x<r.x0+r.w+pad&&u.y>=r.y0-pad&&u.y<r.y0+r.h+pad;}
function netBossSpot(r,k,n){const a=k/Math.max(1,n)*Math.PI*2,rr=2+0.35*Math.floor(k/12);let f=nearestFree(r.cx+Math.cos(a)*rr,r.y0+r.h*0.8+Math.sin(a)*rr*0.5,-1);
  if(!f||f.i<r.x0||f.i>=r.x0+r.w||f.j<r.y0||f.j>=r.y0+r.h)f=nearestFree(r.cx,r.y0+r.h-3,-1);return f;}
function netMoveTo(u,f){if(f){u.x=f.i+0.5;u.y=f.j+0.5;}u.path=[];u.vx=u.vy=0;u.dash=null;if(u.task&&(u.task.type==='move'||u.task.type==='enter'))u.task=null;try{fx('ring',u.x,u.y,'#ffd34d');}catch(e){}}
function netOwnParty(pc){const pk=netPkOfU(pc);return S.units.filter(u=>u!==pc&&!u.dead&&!netIsPC(u)&&pk!=null&&u._dgBy===pk);}
// 進場時標記弟子屬於誰（dgEnter 由房主或 netAsMember 下的成員執行；player() 即發起人）
{const _x=dgEnter;dgEnter=function(){const had=!!S.dg;const r=_x.apply(this,arguments);try{if(r!==false&&!had&&S.dg){const p=player(),pk=netPkOfU(p);for(const u of S.units)if(u!==p&&!netIsPC(u))u._dgBy=pk;}}catch(e){}return r;};}
// 房主：執行傳送（在副本區域內呼叫）
function netBossGo(pc,why){const D=S.dg;if(!netBgOn()){toast('首領傳送點未開啟');return false;}
  if(!D||!pc||pc.dead||!S.units.includes(pc)){toast('不在秘境中');return false;}
  if(!netGateOpen(D)){toast('🔒 首領傳送點尚未開啟：先抵達首領房，或清除通往首領房的所有房間');return false;}
  const G=netGatePt(D);if(dist(pc.x,pc.y,G.x,G.y)>NET17.r+0.6){toast('先走到入口房的首領傳送點旁');return false;}
  const B=netBossRoom(D),grp=[pc,...netOwnParty(pc)];const n0=S.units.filter(u=>!u.dead&&!grp.includes(u)&&netInRect(u,B,0)).length; // 已在房內的人：排在他們之後，不疊在同一格
  grp.forEach((u,k)=>netMoveTo(u,netBossSpot(B,n0+k,Math.max(8,n0+grp.length))));
  NET17.n++;NET17.lastGo={id:pc.id,ids:grp.map(u=>u.id),t:S.time,why:why||''};toast(`⛩ ${pc.name} 傳送到了首領房${grp.length>1?`（帶著 ${grp.length-1} 名弟子）`:''}`);return true;}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='bossgate'){const a=netAvatarOf(pk);const r=netBossGo(a,'member');if(r)NET.stats.applied++;return r;}return _x.apply(this,arguments);};}
// 每位玩家自己的確認（本機 UI；不影響其他人）
function netBossAsk(){const D=S.dg,p=player();if(!D||!p)return false;if(!netGateOpen(D)){toast('🔒 首領傳送點尚未開啟：先抵達首領房，或清除通往首領房的所有房間');return false;}
  const n=NET.role==='client'?0:netOwnParty(p).length;
  showConfirm(`<h3>⛩ 首領傳送點</h3><div>傳送到「${DGS[D.kind]?DGS[D.kind].bossN:'首領'}」的首領房？<br>你${NET.role==='client'?'和你帶進來的弟子':n?`和你帶進來的 ${n} 名弟子`:''}會一起傳送；其他玩家不受影響。</div>`,'傳送',()=>netBossConfirm());return true;}
function netBossConfirm(){if(NET.role==='client'){netIntent({a:'bossgate'});return true;}return netBossGo(player(),'host');}
function netGateUI(){let el=document.getElementById('netbgate');const D=S&&S.dg,p=player(),G=D&&netGatePt(D);
  const near=netBgOn()&&D&&p&&!p.dead&&G&&dist(p.x,p.y,G.x,G.y)<=NET17.r&&!titleOpen;
  if(!near){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='netbgate';el.className='ui';el.style.cssText='position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:60;';
    el.innerHTML='<button class="btn p" data-nbg="1"></button>';el.addEventListener('click',ev=>{if(ev.target.closest('[data-nbg]')){ev.stopPropagation();netBossAsk();}});el.addEventListener('pointerdown',ev=>ev.stopPropagation());document.body.appendChild(el);}
  const open=netGateOpen(D),t=open?'⛩ 首領傳送點：傳送到首領房':'🔒 首領傳送點（抵達首領房或清完通往首領房的房間後開啟）';const b=el.firstChild;if(b.textContent!==t)b.textContent=t;b.disabled=!open;el.style.display='';}
// v0.4.7：首領傳送點的圖樣改由 g13 dgDrawBossGate 繪製（讀 netGatePt／netGateOpen），這裡只留按鈕與邏輯
{const _d=draw;draw=function(){const r=_d.apply(this,arguments);try{netGateUI();}catch(e){console.error('[net] gate',e);}return r;};}
// #186：聯機時大殿封鎖不再把整隊拉進去
{const _x=v156Lock;v156Lock=function(r){const D=S.dg;if(!(NET.role==='host'&&netBgOn()&&D&&!D.lock&&r))return _x.apply(this,arguments);
  const pcIn=S.units.filter(u=>!u.dead&&netIsPC(u)&&netInRect(u,r,1));const keep=new Set(pcIn);for(const pc of pcIn)for(const u of netOwnParty(pc))keep.add(u);
  for(const u of S.units)if(!u.dead&&!netIsPC(u)&&netInRect(u,r,1))keep.add(u);
  const sv=S.units.filter(u=>!keep.has(u)).map(u=>[u,u.x,u.y,u.path,u.task,u.vx,u.vy]);
  const res=_x.apply(this,arguments);
  for(const [u,x,y,pa,tk,vx,vy] of sv){u.x=x;u.y=y;u.path=pa;u.task=tk;u.vx=vx;u.vy=vy;}
  NET17.lock={kept:[...keep].map(u=>u.id),stay:sv.map(s=>s[0].id)};return res;};}
// ---------- #185：耦合修正 ----------
// 新手教學存在 S.tut（世界存檔），成員畫面會跟著房主的教學進度跳出提示、按「結束」又被房主覆蓋 → 成員端不顯示房主的教學。
{const _x=tutActive;tutActive=function(){if(NET.role==='client'&&NET.welcomed)return false;return _x.apply(this,arguments);};}
// 房主可以框選／點選其他玩家的化身並下「移動」「派工（聽道、閉關…）」→ 等於替別人操作角色（成員的 'job'/'move' 意圖本來就擋了）。
// 聯機時房主的指令略過其他玩家的化身（成員自己的指令經 netAsMember／意圖，不受影響）。
function netForeignAv(u){return !!(u&&u.np&&NET.role==='host'&&!NET.actAs&&!NET17.noCmdGuard&&netCoopOn());}
{const _x=commandMove;commandMove=function(us){if(Array.isArray(us)&&us.some(netForeignAv)){const f=us.filter(u=>!netForeignAv(u));if(!f.length){toast('那是其他玩家的角色，只有他自己能指揮');return;}arguments[0]=f;}return _x.apply(this,arguments);};}
{const _x=assignJob;assignJob=function(u){if(netForeignAv(u)){toast('那是其他玩家的角色，只有他自己能指揮');return false;}return _x.apply(this,arguments);};}
// 讀檔：聯機中成員讀自己的存檔 → 本機世界被換掉、跟房主的世界錯開（之後的同步差異套在錯的世界上）；
// 房主在有成員在線時讀檔 → 所有人的世界被無預警換掉。→ 聯機中擋下（建房前讀檔、用存檔開房不受影響）。
function netLoadBlocked(){if(!netCoopOn())return null;if(NET.role==='client')return '聯機中不能讀檔（會和房主的世界錯開）：先離開房間再讀檔';
  if(NET.role==='host'&&netMembersOnline()>0)return '有成員在線時讀檔會替換所有人的世界：先關閉房間再讀檔（或用「用現有存檔開房」）';return null;}
{const _x=loadSlot;loadSlot=async function(){const b=netLoadBlocked();if(b){NET17.loadBlk=(NET17.loadBlk||0)+1;throw new Error(b);}return _x.apply(this,arguments);};}
// ---------- v0.4.7 #122／#123（聯機版）：成員的出口傳送陣／入口撤離也先確認 ----------
// 房主偵測到成員化身走上傳送陣或回到入口 → 只送給那位成員 {t:'dgask'}；成員畫面跳確認卡（g21 x47Dlg，不暫停；走開就收起），
// 按「離開秘境」才送 {a:'dgexit'}；房主再驗證一次距離後 netDgLeave。其他人完全不受影響。單機的 X47.dgAsk 關閉時沿用舊行為（直接離開）。
const NET_DGASK={r:2.6};
function netDgAskOut(u,src){const D=S.dg;if(!D||!u)return;if(typeof X47!=='undefined'&&X47.dgAsk===false){netDgLeave(u,'portal');return;}
  const p=NET.players.get(u.np);if(!p||!p.online||p.cid==null||!NET.tr){return;} // 離線化身不會自己走；不替他決定
  NET17.ask=(NET17.ask||0)+1;try{NET.tr.send(p.cid,{t:'dgask',src});}catch(e){}}
function netDgAskPt(src){const D=S.dg;return D&&(src==='portal'?D.exitP:D.ent)||null;}
function netDgAskShow(src){const D=S.dg;if(!D)return;NET17.pend={src,t:Date.now()};const pt=netDgAskPt(src),G=DGS[D.kind]||{};
  const go=()=>{NET17.pend=null;netIntent({a:'dgexit',src});};
  const h=`要離開「${G.n||'秘境'}」回到宗門嗎？${D.cleared||src==='portal'?'':'<br><span class="dim">秘境尚未清空，離開後這次的進度不保留。</span>'}<br><span class="dim">只有你（和你帶來的弟子）會離開，其他玩家不受影響。</span>`;
  if(typeof x47Dlg==='function')x47Dlg({id:'dgexit',t:src==='portal'?'🌀 出口傳送陣':'🚪 撤離陣',h,btn:[{l:'留下',cls:'',f:()=>{NET17.pend=null;}},{l:'離開秘境',cls:'pri',f:go}],
    keep:()=>{
      const p=(typeof NET!=='undefined'&&NET.role==='client'&&typeof netAvatarOf==='function'&&NET.pkey&&netAvatarOf(NET.pkey))||player();
      const age=NET17.pend?Date.now()-(NET17.pend.t||0):9e9;
      const near=!!(p&&pt&&dist(p.x,p.y,pt.x,pt.y)<NET_DGASK.r);
      // 房主落地後立刻 dgask 時，客機座標可能還停在上一格（st/ps 未到）。寬限內不因過期距離關卡。
      const ok=!!(S.dg&&p&&!p.dead&&pt&&(near||age<2000));
      if(!ok)NET17.pend=null;return ok;}});
  else showConfirm(`<h3>${src==='portal'?'🌀 出口傳送陣':'🚪 撤離陣'}</h3><div>${h}</div>`,'離開秘境',go);}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='dgask'){netDgAskShow(m.src==='portal'?'portal':'ent');return;}return _x.apply(this,arguments);};}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='dgexit'){const a=netAvatarOf(pk),D=S.dg;if(!D||!a||a.dead||!S.units.includes(a))return false;
  const pt=netDgAskPt(i.src==='portal'?'portal':'ent');if(!pt||dist(a.x,a.y,pt.x,pt.y)>NET_DGASK.r+0.4){toast('已經離開傳送陣，沒有離開秘境');return false;}
  netDgLeave(a,'portal');NET.stats.applied++;return true;}return _x.apply(this,arguments);};}
// ---------- 測試掛鉤 ----------
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.bossgate={pt:()=>netGatePt(),open:()=>netGateOpen(),ask:()=>netBossAsk(),confirm:()=>netBossConfirm(),
   st:()=>({n:NET17.n,last:NET17.lastGo,lock:NET17.lock||null}),room:()=>{const B=netBossRoom();return B&&{x0:B.x0,y0:B.y0,w:B.w,h:B.h,state:B.state};},
   go:id=>netBossGo(unitById(id),'test'),lockNow:()=>{const B=netBossRoom();if(B)v156Lock(B);return !!(S.dg&&S.dg.lock);}};
  o.net.t185={dgAsk:()=>({pend:NET17.pend||null,sent:NET17.ask||0,dlg:!!document.querySelector('#x47dlg')&&getComputedStyle(document.getElementById('x47dlg')).display!=='none'&&(document.getElementById('x47dlg').textContent||'').includes('離開秘境')}),fwd:()=>Object.keys(NET_FWD),load:async id=>{try{await loadSlot(id||'quick');return 'loaded';}catch(e){return e.message;}},cmd:(id,x,y,j,off)=>{NET17.noCmdGuard=!!off;try{const u=unitById(id);commandMove([u],x,y,false);if(j)assignJob(u,j);}finally{NET17.noCmdGuard=false;}const u=unitById(id);return {task:u.task&&u.task.type,job:u.job};},addDisc:()=>{const p=player();const d=makeDisciple(p.x+1,p.y+1,0);S.units.push(d);return d.id;},openPause:()=>openPause(true),closePause:()=>openPause(false),openSettings:()=>openSettings(),openSaves:()=>openSaves(),closeSaves:()=>closeSaves(),
   openTrade:()=>openTrade(),openBuildMenu:()=>openBuildMenu(),openCult:()=>openCult(),openBag:()=>openBag(),openCraft:()=>openCraft(),
   choice:()=>showChoice('測試抉擇','測試',[{l:'好',f:()=>{}}],'測試'),evTrigger:()=>evTrigger(),v48Open:t=>v48Open(t),tutStart:()=>tutStart(),tutActive:()=>tutActive(),
   enterBuild:t=>enterBuild(t),closeAll:()=>{try{closeSaves();}catch(e){}try{openPause(false);}catch(e){}try{$('settings').classList.remove('open');}catch(e){}try{dlgClose();}catch(e){}try{if(typeof closeCult==='function')closeCult();else{const c=$('cult');if(c)c.classList.remove('open');}}catch(e){}try{if(typeof evChoose==='function'&&evOpen)evChoose('x');else{const e=$('evdlg');if(e)e.classList.remove('open');evOpen=false;evCur=null;}}catch(e){}try{if(typeof closeBag==='function')closeBag();}catch(e){}try{if(typeof closeOverlays==='function')closeOverlays();}catch(e){}},
   flags:()=>({paused,ub:!!uiBlock(),ev:!!evOpen,dlg:!!dlgOpen,saves:!!savesOpen,set:$('settings').classList.contains('open'),pause:!!(typeof V47!=='undefined'&&V47.pause),bm:buildMode?String(buildMode.type||buildMode):null,
     it:S.interior?S.interior.bid:null,dg:!!S.dg,cls:document.body.className,cam:[Math.round(cam.x),Math.round(cam.y),+cam.zoom.toFixed(2)],t:+S.time.toFixed(2),tut:!!(S.tut&&!S.tut.done),hp:!!(NET.hp&&NET.hp.on)})};}return o;};}
