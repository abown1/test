// ===== net16：房主切到背景（#184） =====
// 1) 電腦：房主分頁隱藏時 requestAnimationFrame 停止 → 有成員在線就改由 Worker 計時器以固定步長（0.05 秒）推進模擬，
//    每次最多補跑 NET16.maxCatch 秒；畫面回來（frame 又開始跑）就自動停手，兩者不會同時推進。
//    g7 的 visibilitychange 會設 paused=document.hidden：這裡在 g7 之後再登記一個監聽器，聯機有成員時把 paused 改回 false（wrap-override，不改 g7）。
// 2) 手機（JS 被系統凍結）：主機轉移。成員超過 NET16.migMs 收不到房主任何訊息 →
//    先試著重連原房間（只有自己斷線就回原房）；不行就依「連線最久的在線成員」決定新房主（所有成員算出同一個順序），
//    新房主用「最新世界副本＋自己畫面上的即時狀態」開房，房間碼由舊碼決定性推出（netMigCode），其他人直接加入新碼。
//    同一個碼只能有一個房主（傳輸層 unavailable-id）＋依名次錯開等待 → 兩人不會同時自立為房主。
//    原房主回來：發現成員都走了 → 依序試加入推出的新碼，以成員身分接回（自己的角色由 netReclaim 保留成化身）。
//    副本進行中轉移：副本進度不保留，所有人回到宗門（世界副本）。
const NET16={migMs:5000,reconnMs:5000,probeMs:3000,rankMs:4000,giveUpMs:30000,step:0.05,maxCatch:0.25,bgMs:50,backMs:1500,
  bg:{steps:0,last:0,on:false},frozen:false,hiddenAt:0,hadMem:false,mig:null,lastMig:null,shareT:0};
function netBgWant(){return !!(NET_FLAGS.hostbg&&NET.role==='host'&&NET.tr&&netMembersOnline()>0);}
// 房間碼推導（傳輸無關：只是字串 → 字串）。與 netRandCode 同字母表、5 碼
function netMigCode(code){let h=2166136261;const s=String(code)+'/mig';for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let r='';for(let i=0;i<5;i++){r+=A[h%32];h=Math.floor(h/32)^Math.imul(h,2654435761)>>>0;h>>>=0;}return r;}
// ---------- 1) 背景模擬 ----------
{const _f=frame;frame=function(now){if(NET16.frozen){requestAnimationFrame(frame);return;}if(NET16.sim&&NET16.sim.noRaf){requestAnimationFrame(frame);return;}NET._frameAt=performance.now();return _f.apply(this,arguments);};}
function netBgPulse(){const B=NET16.bg,now=performance.now();const dtR=B.last?(now-B.last)/1000:0;B.last=now;
  if(NET16.frozen||!netBgWant()||titleOpen||(NET.hp&&NET.hp.on)){B.on=false;B.acc=0;return;}
  if(!document.hidden||now-(NET._frameAt||0)<150){B.on=false;B.acc=0;return;} // 分頁可見或畫面還在跑：交給 frame（避免雙倍速度）
  if(document.hidden&&paused)paused=false;
  B.on=true;B.acc=Math.min(NET16.maxCatch,(B.acc||0)+dtR);
  try{while(B.acc>=NET16.step){B.acc-=NET16.step;update(NET16.step);try{frameV045(NET16.step);}catch(e){}B.steps++;}}catch(e){console.error('[net] bg sim',e);}}
{let w=null;try{const b=new Blob(['setInterval(()=>postMessage(1),'+NET16.bgMs+');'],{type:'text/javascript'});w=new Worker(URL.createObjectURL(b));w.onmessage=netBgPulse;}catch(e){setInterval(netBgPulse,NET16.bgMs);}}
// g7 的監聽器之後才登記（g7 在 IIFE 最後）→ 我們的後執行，覆寫 paused
setTimeout(()=>document.addEventListener('visibilitychange',()=>{
  if(document.hidden){NET16.hiddenAt=Date.now();NET16.hadMem=NET.role==='host'&&netMembersOnline()>0;
    if(netBgWant())paused=false;
    // 手機切走時 JS 可能馬上被凍結：趁還能跑先把完整世界送給所有人（主機轉移用），10 秒內最多一次
    if(NET.role==='host'&&NET_FLAGS.hostmig&&NET16.hadMem&&Date.now()-NET16.shareT>10000){NET16.shareT=Date.now();try{netShareWorld();}catch(e){}}}
  else{const d=NET16.hiddenAt?Date.now()-NET16.hiddenAt:0;NET16.hiddenAt=0;netResumeCheck(d);}}),0);
// ---------- 測試／凍結模擬：凍結＝房主 JS 不跑（不送、不收、不模擬） ----------
{const _x=netHostTick;netHostTick=function(){if(NET16.frozen)return;return _x.apply(this,arguments);};}
{const _x=netPsSend;netPsSend=function(){if(NET16.frozen)return;return _x.apply(this,arguments);};}
{const _x=netHostRx;netHostRx=function(){if(NET16.frozen)return;return _x.apply(this,arguments);};}
{const _x=netClientRx;netClientRx=function(){if(NET16.frozen)return;return _x.apply(this,arguments);};}
// 名單帶「連線起始時間」（房主時鐘；選舉只比較同一份名單裡的值）
{const _x=netPlayerList;netPlayerList=function(){const L=_x.apply(this,arguments);for(const o of L){const p=NET.players.get(o.pk);if(p&&p.since)o.since=p.since;}return L;};}
// ---------- 2) 主機轉移（成員端） ----------
function netMigOrder(){const L=[...NET.players.values()].filter(p=>!p.host&&p.on);L.sort((a,b)=>((a.since||9e15)-(b.since||9e15))||(a.pk<b.pk?-1:a.pk>b.pk?1:0));return L.map(p=>p.pk);}
{const _x=netClientPulse;netClientPulse=function(){try{if(netMigShould()){netMigStart();return;}}catch(e){console.error('[net] mig',e);}if(NET16.mig)return;return _x.apply(this,arguments);};}
function netMigShould(){if(!NET_FLAGS.hostmig||NET16.mig||NET16.frozen||NET.role!=='client'||!NET._everIn||!NET.wid||!NET.code)return false;
  const sil=Date.now()-(NET.lastRx||0);if(sil<=NET16.migMs)return false;
  // 先走一般的重新連線（保留「回到副本」等既有流程）；重連 reconnMs 仍連不上房主 → 才開始轉移（轉移前還會再探一次舊房號）
  if(NET.welcomed&&!NET.reconn){netConnLost('silent '+sil+'ms');return false;}
  return !!NET.reconn&&Date.now()-NET.reconn.t0>NET16.reconnMs;}
// 新房主的起始狀態：最新世界副本為底，疊上自己畫面上（房主幾秒前送來）的即時欄位
function netMigState(){const rec=NET.wid&&netLoadWorldRec(NET.wid);let base=rec&&rec.data;if(typeof base==='string')try{base=JSON.parse(base);}catch(e){base=null;}
  // Trade checkpoint policy is supplied by the optional trade module; no live/base mixing when it refuses.
  if(typeof netTradeMigrationState==='function'){
    try{const tx=netTradeMigrationState(base,rec&&rec.wv,NET.wid);if(tx!==undefined)return tx;}catch(e){return {tradeRefused:true,reason:'trade_checkpoint_unverified'};}}
  if(!S||S.dg||NET.load&&!NET.load.done)return base?{d:base,wv:rec.wv,live:false}:null;
  let L;try{L=snapshot();}catch(e){L=null;}if(!L)return base?{d:base,wv:rec.wv,live:false}:null;if(!base)return {d:L,wv:NET.wv||0,live:true};
  const d=Object.assign({},base);for(const k of ['time','res','items','nodeMods','buildings','enemies','mats','pills','inv','map','sects','diplo','zb','travel'])if(L[k]!==undefined)d[k]=L[k];
  const keys=NET_LIVE_U.filter(k=>UNIT_KEEP.includes(k)||k==='np');const bu=new Map((base.units||[]).map(u=>[u.id,u]));
  d.units=(L.units||[]).map(u=>{const b=bu.get(u.id);if(!b)return u;const o=Object.assign({},b);for(const k of keys)if(u[k]!==undefined)o[k]=u[k];return o;});
  if(L.net05)d.net05=L.net05;d.nextId=Math.max(base.nextId||0,L.nextId||0);return {d,wv:rec.wv,live:true};}
function netMigStart(){const order=netMigOrder(),rank=order.indexOf(NET.pkey);const old=NET.code;
  const M={t0:Date.now(),old,code:netMigCode(old),order,rank,kind:NET.trKind,wid:NET.wid,st:null,phase:'probe',res:null};NET16.mig=M;
  netLog('host silent '+(Date.now()-NET.lastRx)+'ms → migration',JSON.stringify({code:M.code,order,rank}));toast('房主失去回應，正在轉移主機…');
  M.st=netMigState(); // 先抓狀態（之後會被重連／加入覆蓋）
  if(M.st&&M.st.tradeRefused===true&&M.st.reason==='trade_checkpoint_unverified'){
    M.tradeReason='trade_checkpoint_unverified';M.tradeRecoveryKind='unverified-live';M.phase='trade-wait';M.res='trade-refused';
    // Recovery copy only: not a coherent checkpoint, never auto-applied or committed.
    try{M.tradeRecovery=JSON.parse(JSON.stringify(snapshot()));}catch(e){M.tradeRecovery=null;}
    if(NET.reconn&&NET.reconn.timer)clearTimeout(NET.reconn.timer);
    NET16.lastMig=M;
    try{if(window.XW&&XW.netTrade&&XW.netTrade.migrationWait)XW.netTrade.migrationWait();}catch(e){}
    toast('交易未決：保留目前角色與資料，等待一致快照；不接手、不載入舊副本');netChanged();return false;}
  if(NET.reconn&&NET.reconn.timer)clearTimeout(NET.reconn.timer);NET.reconn=null;
  if(S&&S.dg&&typeof netDgClientEnd==='function')try{netDgClientEnd(true);}catch(e){}
  const tr=NET.tr;NET.tr=null;NET.welcomed=false;if(tr)try{tr.close();}catch(e){}
  netTickerStop();NET.role=null;netChanged();netMigRun(M).catch(e=>{netLog('migration error',String(e&&e.message||e));netMigFail(M);});}
async function netMigTryJoin(M,code,ms){try{await netJoin(code,{transport:M.kind});return NET.role==='client'&&NET.welcomed;}catch(e){if(NET.role&&!NET.welcomed)try{netLeave(true);}catch(_){}return false;}}
async function netMigRun(M){const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  // a) 只有我斷線？先回原房試一次
  if(await netMigProbe(M)){M.phase='back';M.res='reconnected';NET16.lastMig=M;NET16.mig=null;netLog('migration: old host answered → normal reconnect');toast('已重新連上房主');return;}
  if(M.rank<0){netLog('migration: not in roster');return netMigFail(M);}
  M.phase='elect';
  while(Date.now()-M.t0<NET16.giveUpMs){if(NET16.mig!==M)return;
    if(M.rank===0||Date.now()-M.t0>=NET16.migMs+M.rank*NET16.rankMs){if(await netMigHost(M))return;}
    if(await netMigTryJoin(M,M.code)){M.phase='member';M.res='joined';NET16.lastMig=M;NET16.mig=null;netLog('migration: joined new host',M.code);toast(`主機已轉移：已加入新房主（房間碼 ${M.code}）`);netChanged();return;}
    await sleep(800);}
  netMigFail(M);}
async function netMigProbe(M){const tr=netMakeTransport(M.kind);let ok=false;
  try{await Promise.race([tr.join(M.old),new Promise((_,no)=>setTimeout(()=>no(new Error('probe timeout')),NET16.probeMs))]);
    ok=await new Promise(r=>{const t=setTimeout(()=>r(false),NET16.probeMs);tr.on('msg',(id,m)=>{if(m&&(m.t==='st'||m.t==='ps'||m.t==='lobby'||m.t==='welcome'||m.t==='xc')){clearTimeout(t);r(true);}});try{tr.send('host',netHelloMsg());}catch(e){}});}
  catch(e){ok=false;}
  if(!ok){try{tr.close();}catch(e){}return false;}
  NET.role='client';NET.code=M.old;NET.welcomed=false;NET.trKind=M.kind;netTickerStart();try{await netClientHello(tr,8000);return true;}catch(e){return false;}}
async function netMigHost(M){const st=M.st;if(!st)return false;
  if(!applySave(st.d))return false;afterLoad();try{if(typeof netMapMigrate==='function')netMapMigrate();else if(typeof mapMigrateSave==='function')mapMigrateSave(S);}catch(e){}try{resetTransient();}catch(e){}S.flags.netWid=M.wid;netReclaim();S.flags.netWv=Math.max(S.flags.netWv||0,st.wv||0)+1;
  try{await netHost({code:M.code,transport:M.kind});}catch(e){netLog('migration host failed',String(e&&(e.netType||e.type)||e));if(e&&e.type==='unavailable-id'||e&&e.netType==='unavailable-id')return false;return false;}
  NET.mgFrom=M.old;M.phase='host';M.res='hosted';NET16.lastMig=M;NET16.mig=null;const pl=player();if(pl){selUnits=[pl.id];const q=iso(pl.x,pl.y);cam.x=q.x;cam.y=q.y;}
  netLog('migration: I am the new host',M.code,'live',st.live);toast(`你成為新房主（房間碼 ${M.code}），世界繼續進行`);netChanged();return true;}
function netMigFail(M){if(NET16.mig!==M&&NET16.mig)return;
  if(M&&M.tradeReason==='trade_checkpoint_unverified'&&M.st&&M.st.tradeRefused===true&&M.st.reason==='trade_checkpoint_unverified'){
    M.phase='trade-wait';M.res='trade-refused';NET16.mig=M;NET16.lastMig=M;
    try{if(window.XW&&XW.netTrade&&XW.netTrade.migrationWait)XW.netTrade.migrationWait();}catch(e){}
    toast('交易仍未決：目前資料與身份保留，未載入舊副本');netChanged();return;}
  NET16.mig=null;M.res='failed';NET16.lastMig=M;netLog('migration gave up');
  if(NET.role)return;const w=M.wid&&netLoadWorldRec(M.wid);if(w){netClientRestore(w);}toast('房主失去回應，主機轉移失敗：已載入最新的世界副本（可在「聯機」面板開房）');netChanged();}
// ---------- 2b) 原房主回來 ----------
function netResumeCheck(dur){if(!NET_FLAGS.hostmig||NET.role!=='host'||dur<NET16.migMs||!NET16.hadMem)return;
  setTimeout(()=>{if(NET.role!=='host'||netMembersOnline()>0)return;netRejoinAsMember().catch(e=>netLog('rejoin error',String(e&&e.message||e)));},NET16.backMs);}
async function netRejoinAsMember(){let c=NET.code;
  for(let k=0;k<3;k++){c=netMigCode(c);const tr=netMakeTransport(NET.trKind||null);
    try{await tr.join(c);}catch(e){try{tr.close();}catch(_){}continue;}
    netLog('back from background: room moved to',c,'→ rejoin as member');const old=NET.tr;netTickerStop();NET.role=null;NET.tr=null;NET.players.clear();NET.cid2pk.clear();if(old)try{old.close();}catch(e){}
    NET.role='client';NET.code=c;NET.welcomed=false;NET.reconn=null;netTickerStart();
    try{await netClientHello(tr,15000);toast(`你離開期間主機已轉移，已以成員身分接回（房間碼 ${c}）`);NET16.rejoined={code:c,at:Date.now()};netChanged();return true;}
    catch(e){netLog('rejoin hello failed',String(e&&e.message||e));return false;}}
  netLog('back from background: no migrated room found, keep hosting');return false;}
// ---------- 測試鉤子 ----------
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.hostbg={cfg:NET16,want:()=>netBgWant(),migCode:c=>netMigCode(c),order:()=>netMigOrder(),
    hide:on=>{NET16.sim=NET16.sim||{};NET16.sim.noRaf=!!on;Object.defineProperty(document,'hidden',{configurable:true,get:()=>!!on});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>on?'hidden':'visible'});document.dispatchEvent(new Event('visibilitychange'));return {paused,want:netBgWant()};},
    freeze:on=>{const tr=NET.tr;if(on){NET16.hiddenAt=Date.now();NET16.hadMem=NET.role==='host'&&netMembersOnline()>0;NET16.frozen=true;if(tr&&!tr._fz){tr._fz=[tr.send,tr.broadcast];tr.send=()=>{};tr.broadcast=()=>{};}}else{NET16.frozen=false;if(tr&&tr._fz){[tr.send,tr.broadcast]=tr._fz;tr._fz=null;}const d=NET16.hiddenAt?Date.now()-NET16.hiddenAt:0;NET16.hiddenAt=0;NET._frameAt=0;netResumeCheck(d);}return true;},
    st:()=>({role:NET.role,code:NET.code,mig:NET16.mig&&{phase:NET16.mig.phase,rank:NET16.mig.rank,code:NET16.mig.code},last:NET16.lastMig&&{res:NET16.lastMig.res,code:NET16.lastMig.code,rank:NET16.lastMig.rank,order:NET16.lastMig.order},rejoined:NET16.rejoined||null,steps:NET16.bg.steps,bgOn:NET16.bg.on,paused})};}return o;};}
