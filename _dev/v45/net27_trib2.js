// ================== net27：雷劫 v2（cult_trib2.js）聯機殼 ==================
// 只用包裝覆寫，不改 cult*／g*／build.py。房主權威：擲骰、扣靈石、劈雷傷害、生死都只在房主算（cult_trib2 在客機本來就不跑 tick）。
// 房主：讀 CULT_TRIB2.log 的新事件 → 廣播 {t:'t2',ev,p}；每份 st 夾帶目前渡劫中的單位清單 m.t2（客機據此校正／補畫）。
// 客機：只做視覺（雷電、上浮、飄字、結果提示）；自己渡劫才變暗；按 Z 走既有 net4 toggleMeditate 轉送（房主以化身為 player() 執行 → trib2.med）。
// 房主畫面：成員化身渡劫時不變暗（只劈雷）。成員化身渡劫身死：與單機同規則（身隕面板在成員自己的畫面，復甦由房主以 revive() 結算）。
// 成員斷線中渡劫：房主自動替他打坐（同弟子）。
// 元嬰＋（realm≥7）成員化身渡劫身死：房主由 cult_death 走單機元神出竅（不呼叫 onPlayerDeath0）→ 廣播 ys／ysEscape／ysRevive；
//  只有滅魂（cult:yuanShenGone → onPlayerDeath）才走身隕面板（只在成員畫面）。元嬰以下照舊身隕。
// 客機防呆：cultStartBreak 改送 break 意圖、cultPayBreak 不在客機扣款（雙保險；正常點擊已由 net2 tryBreak 攔成意圖）。
const NET27={v:1,sent:0,rx:0,stRx:0,fwd:0,blk:0,dark:0,undark:0,die:0,idx:0,ref:null,fxOwn:0,last:null,evc:{},rev:0,pick:0,autoMed:0,panel:0,silentMs:3500,ysEv:{}};
function n27T2(){return (typeof window!=='undefined'&&window.CULT_TRIB2)||null;}
function n27On(){const T=n27T2();return !!(T&&T.on);}
function n27Role(){return (typeof NET!=='undefined'&&NET.role)||null;}
function n27HostPU(){try{return typeof netHostPlayerU==='function'?netHostPlayerU():null;}catch(e){return null;}}
function n27Me(){try{if(n27Role()==='client')return netAvatarOf(NET.pkey);}catch(e){}try{return n27HostPU()||player();}catch(e2){return null;}}
function n27U(id){try{return typeof unitById==='function'?unitById(+id):null;}catch(e){return null;}}
function n27Nm(u){try{return typeof nm==='function'?nm(u):(u&&u.name)||'';}catch(e){return (u&&u.name)||'';}}
function n27Fx(){return (typeof window!=='undefined'&&window.CultXTLFx)||null;}
function n27KillDark(F){const s=F.state;s.noDark=1;s.dark=0;s.flash=0;s.sky=0;s.white=0;if(s.clouds)s.clouds.length=0;}
// ---------- 房主：事件廣播 ----------
function n27List(){const L=[];try{if(S&&S.units)for(const u of S.units)if(u&&u.trib2){const B=u.trib2;L.push([u.id,B.i|0,B.n|0,B.med?1:0,B.wait?1:0,B.from|0,B.post?{ph:B.post.ph||null,t:+(+B.post.t||0).toFixed(2)}:null,+(+B.lift||0).toFixed(1)]);}}catch(e){}return L;}
function n27Flush(){
  if(n27Role()!=='host'||!NET.tr)return;const T=n27T2();if(!T||!Array.isArray(T.log))return;
  if(T.log!==NET27.ref){NET27.ref=T.log;NET27.idx=T.log.length;return;} // 換了陣列（測試清空）→ 從現在起算
  if(NET27.idx>T.log.length)NET27.idx=T.log.length;
  while(NET27.idx<T.log.length){const e=T.log[NET27.idx++];if(!e||e.id==null)continue;
    if(!/^(start|strike|waitEnd|ok|fail|rateFail)$/.test(e.ev))continue;
    const u=n27U(e.id);const p={id:e.id,ev:e.ev,n:e.n,i:e.i,dmg:e.dmg,from:e.from,realm:e.realm,np:u&&u.np||null,pc:!!(u&&(u.kind==='player'||u.np)),name:u?n27Nm(u):'',wait:!!(u&&u.trib2&&u.trib2.wait),med:!!(u&&u.trib2&&u.trib2.med),host:!!(u&&u.kind==='player'&&!u.np),noMed:!!(e.parts&&e.parts.noMed),mul:e.mul!=null?+e.mul:null};
    if(e.ev==='fail'){const ysId=e.ysId!=null?e.ysId:(u&&u.cultYS&&u.cultYS.id);if(e.ys||ysId!=null){const ys=n27YsEnt(ysId);p.ys=1;p.ysId=ysId;if(ys){p.life=ys.life;p.hp=ys.hp;p.maxhp=ys.maxhp;p.x=ys.x;p.y=ys.y;}}}
    try{NET.tr.broadcast({t:'t2',ev:e.ev,p,s:n27List()});NET27.sent++;}catch(x){}}
}
function n27HostInstall(){
  if(typeof tickV045==='function'){const _x=tickV045;tickV045=function(){try{if(n27Role()==='host'){n27AutoMed();n27DropTick();}}catch(e){}const r=_x.apply(this,arguments);try{n27Flush();}catch(e){}return r;};}
  if(typeof dgUpdate==='function'){const _x=dgUpdate;dgUpdate=function(){const r=_x.apply(this,arguments);try{n27Flush();}catch(e){}return r;};}
  if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='n27rev'){try{return n27Revive(pk);}catch(e){console.warn('[net27] revive',e);return false;}}const r=_x.apply(this,arguments);try{n27Flush();}catch(e){}return r;};}
  if(typeof netHostDrop==='function'){const _x=netHostDrop;netHostDrop=function(){const r=_x.apply(this,arguments);try{n27AutoMed();}catch(e){}return r;};}
  try{for(const L of [typeof NET_LIVE_U!=='undefined'?NET_LIVE_U:null,typeof UNIT_KEEP!=='undefined'?UNIT_KEEP:null])if(Array.isArray(L))for(const k of ['n27dead','n27drop'])if(L.indexOf(k)<0)L.push(k);}catch(e){}
  try{if(typeof NET_LIVE_U!=='undefined'&&Array.isArray(NET_LIVE_U))for(const k of ['respawn','cultYSGone','cultYS','cultWeak','cultTribPill'])if(NET_LIVE_U.indexOf(k)<0)NET_LIVE_U.push(k);}catch(e){}
  try{if(typeof NET_LIVE_E!=='undefined'&&Array.isArray(NET_LIVE_E))for(const k of ['cultYS','ownerId','ownerKind','life'])if(NET_LIVE_E.indexOf(k)<0)NET_LIVE_E.push(k);}catch(e){}
  if(typeof netCast==='function'){const _x=netCast;netCast=function(m){
    try{if(m&&m.t==='st'&&n27Role()==='host'&&n27On()){n27Flush();m.t2=n27List();}}catch(e){}
    return _x.apply(this,arguments);};}
  // 房主畫面：別人的化身渡劫只劈雷不變暗（cult_trib2 的 fxBolt 以 isPC 判斷，成員化身也算 PC → 會讓房主變暗）
  try{if(window.Cult&&typeof Cult.on==='function')Cult.on(function(ev){
    if(!ev||ev.type!=='cult:trib2Strike'||n27Role()!=='host')return;
    const u=n27U(ev.id),F=n27Fx();if(!u||!F)return;
    const hp=n27HostPU();
    if(hp&&hp.trib2){if(F.state.noDark){F.state.noDark=false;F.state.dark=Math.max(F.state.dark||0,0.38);}return;} // 房主自己在渡劫：維持（或補回）自己的變暗
    if(u.np){n27KillDark(F);NET27.undark++;}
  });}catch(e){}
  // 成員化身渡劫身死：不要觸發房主的死亡面板
  // （化身一般是 kind:'disciple'＋np；房主轉移後的舊主角也可能是 kind:'player'＋np，一律以 np≠房主 判斷）
  try{if(typeof onPlayerDeath0==='function'){const _x=onPlayerDeath0;onPlayerDeath0=function(u){
    if(n27IsMember(u)){return n27MemberDeath(u,n27WhyOf(u));}
    return _x.apply(this,arguments);};}}catch(e){console.warn('[net27] pd0',e);}
  // 野外戰鬥：化身（kind:'disciple'）倒地傷重不治 → g22 y47DnDie 會把它當弟子刪掉；改走主角規則（元嬰＋元神／元嬰以下身隕）
  try{if(typeof y47DnDie==='function'){const _x=y47DnDie;y47DnDie=function(u){
    if(n27IsMember(u)&&u.kind!=='player'){u.y47dn=null;u.hp=0;return n27MemberDeath(u,'combat');}
    return _x.apply(this,arguments);};}}catch(e){console.warn('[net27] dndie',e);}
  // 野外（非副本）倒地系統沒接住而被 g3 dmgUnit 當弟子移出 S.units：放回並走主角規則
  try{if(typeof dmgUnit==='function'){const _x=dmgUnit;dmgUnit=function(src,u){
    const m=n27IsMember(u)&&u.kind!=='player'&&!(S&&S.dg)&&!u.dead;const in0=m&&S.units.includes(u);
    const r=_x.apply(this,arguments);
    if(in0&&!S.units.includes(u)&&!u.cultYS){S.units.push(u);n27MemberDeath(u,'combat');}
    return r;};}}catch(e){console.warn('[net27] du',e);}
  // 滅魂：cultDestroyYuanShen 對 np 化身呼叫 onPlayerDeath（整條鏈；g8 會在房主畫面開身隕面板）→ 改走成員自己的身隕
  try{if(typeof onPlayerDeath==='function'){const _x=onPlayerDeath;onPlayerDeath=function(u){
    if(n27IsMember(u)){return n27MemberDeath(u,u.cultYSGone?'gone':n27WhyOf(u));}
    return _x.apply(this,arguments);};}}catch(e){console.warn('[net27] pd',e);}
  // 元神事件 → 成員端
  try{if(window.Cult&&typeof Cult.on==='function')Cult.on(function(ev){
    if(!ev||n27Role()!=='host'||!NET.tr)return;
    const send=(evn,p)=>{try{n27Flush();}catch(e){}try{NET.tr.broadcast({t:'t2',ev:evn,p,s:n27List()});NET27.sent++;NET27.ysEv[evn]=(NET27.ysEv[evn]||0)+1;}catch(e){}};
    if(ev.type==='cult:yuanShen'){const o=n27U(ev.ownerId);if(!o||!o.np)return;const ys=n27YsEnt(ev.id);
      send('ys',{id:o.id,np:o.np,name:n27Nm(o),trib:n27WhyOf(o)==='trib'?1:0,ysId:ev.id,life:ev.life,hp:ev.hp,maxhp:ys&&ys.maxhp,x:ys&&ys.x,y:ys&&ys.y});}
    else if(ev.type==='cult:yuanShenEscape'){const o=n27U(ev.ownerId);if(!o||!o.np)return;send('ysEscape',{id:o.id,np:o.np,name:n27Nm(o),ysId:ev.id});}
    else if(ev.type==='cult:revive'){const o=n27U(ev.id);if(!o||!o.np)return;send('ysRevive',{id:o.id,np:o.np,name:n27Nm(o),xiuLost:ev.xiuLost,hp:o.hp,maxhp:o.maxhp});}
    else if(ev.type==='cult:yuanShenGone'){const o=n27U(ev.ownerId);if(!o||!o.np)return;send('ysGone',{id:o.id,np:o.np,name:n27Nm(o),ysId:ev.id});}
  });}catch(e){}
}
function n27IsMember(u){return n27Role()==='host'&&!!u&&!!u.np&&u.np!==NET.pkey;}
// 房主：成員化身倒下的唯一入口。元嬰＋（或已有元神）交給 cult 的 cultHandlePlayerDeath（元神出竅，不送 die）；
//  接不住（元嬰以下／元神已滅）才走 n27AvatarDie（身隕，面板只在成員畫面）。不走 g8 onPlayerDeath，免得房主畫面跳身隕。
function n27MemberDeath(u,why){
  if(!u||u.n27dead)return;
  // 飛行中身死：先照 cult_fly 的死亡降落（g8 onPlayerDeath 整鏈不走，所以這裡補），元神才會出在地上
  try{if(window.CultFly&&CultFly.land(u,'death'))NET27.flyLand=(NET27.flyLand||0)+1;}catch(e){}
  if(why!=='gone'&&!u.cultYSGone){
    const yy=!!u.cultYS||(typeof cultIsYuanYing==='function'&&cultIsYuanYing(u));
    if(yy&&typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.death&&window.Cult&&typeof Cult.handlePlayerDeath==='function'){
      let ok=false;try{ok=!!Cult.handlePlayerDeath(u,null);}catch(e){console.warn('[net27] ys',e);}
      if(ok){if(S.units&&!S.units.includes(u))S.units.push(u);NET27.ysCatch=(NET27.ysCatch||0)+1;return;}
    }
  }
  if(u.cultYSGone)why='gone';
  try{if(typeof econOnUnitDown==='function')econOnUnitDown(u);}catch(e){}
  if(S.units&&!S.units.includes(u))S.units.push(u);
  return n27AvatarDie(u,why);
}
function n27WhyOf(u){try{const L=n27T2()&&n27T2().log;if(u&&(u.trib2||(L&&L.length>NET27.idx&&L.slice(NET27.idx).some(e=>e.id===u.id&&e.ev==='fail'))))return 'trib';}catch(e){}return 'combat';}
const N27_DIE_TXT={trib:'渡劫失敗，身隕',combat:'戰死，身隕',gone:'元神被滅，身隕'};
function n27YsEnt(id){if(id==null||!S)return null;return (S.cultYuanShen||[]).find(x=>x&&x.id===id)||(S.enemies||[]).find(x=>x&&x.id===id&&x.cultYS)||null;}
// 成員化身渡劫身死（元嬰以下）／元神被滅（元嬰＋）＝與單機主角同一套規則（g8 onPlayerDeath＋身隕面板＋石碑復甦 revive）：
//  倒下（dead、respawn=1e9、deaths+1）→ 成員自己的畫面跳「身隕」→ 成員按「在石碑復甦」→ 房主以該化身為 player() 執行原本的 revive()：
//  規則全照 g8 revive()：修為 −30% 成遺落之物留在倒下處（化身自己的 n27drop；房主的 S.flags.drop 不被覆蓋），走回去可撿回；
//  材料、靈石不遺落；裝備 DEATH_GEAR_LOSS_CHANCE（15%）機率失去一件（至寶 z／功法／綁定除外），不能撿回；回到石碑、氣血全滿。
//  revive 在成員的 n27rev 意圖裡執行 → 它的 toast（含「遺落的〇〇被路過的修仙者拿走了」）由 net2 NET.capture 只送給該成員；化身 u.eq 走 NET_LIVE_U 同步。
//  房主畫面的鏡頭／選取／身隕面板不受影響。元嬰＋：渡劫死走元神（cult_death，房主算），元神逃脫→重塑肉身；元神被滅才到這裡（force）。
function n27AvatarDie(u,why){
  why=N27_DIE_TXT[why]?why:'trib';
  if(!u||u.n27dead||(why!=='gone'&&u.cultYS))return;try{n27Flush();}catch(e){} // 先送出 fail 事件，再送 die
  u.dead=true;u.hp=0;u.respawn=1e9;u.task=null;u.path=[];u.vx=u.vy=u.dvx=u.dvy=0;u.medit=false;u.trib2=null;u.deathAt={x:u.x,y:u.y};u.n27dead=1;u.y47dn=null;u.cultYS=null;
  try{S.stats.deaths=(S.stats.deaths||0)+1;}catch(e){}
  NET27.die++;
  try{NET.tr.broadcast({t:'t2',ev:'die',p:{id:u.id,np:u.np,name:n27Nm(u),why},s:n27List()});NET27.sent++;}catch(e){}
  NET27.lastDie={id:u.id,why};
  try{toast(`${n27Nm(u)}${N27_DIE_TXT[why]}`);}catch(e){}
}
function n27Revive(pk){
  const a=netAvatarOf(pk);if(!a||!a.dead||!a.n27dead||typeof revive!=='function')return false;
  const sv={cx:cam.x,cy:cam.y,cf:cam.follow,sel:selUnits.slice(),open:typeof deathOpen!=='undefined'&&deathOpen,drop:S.flags.drop,mm:mmDirty};
  let ok=false;
  try{
    if(!S.flags.shr)S.flags.shr={};
    S.flags.drop=null; // 單機 revive 只有一格遺落之物；成員的放在自己化身上
    netAsMember(a,()=>revive());ok=!a.dead;
    a.n27drop=S.flags.drop||null;
  }finally{
    S.flags.drop=sv.drop;cam.x=sv.cx;cam.y=sv.cy;cam.follow=sv.cf;selUnits=sv.sel;
    try{if(sv.open)deathShow(true);}catch(e){}
  }
  if(ok){a.n27dead=0;a.respawn=0;a.cultYSGone=0;a.cultYS=null;NET27.rev++;}
  return ok;
}
// 成員撿回自己的遺落之物（單機 g8 只檢查房主主角）
function n27DropTick(){
  if(!S||!S.units)return;
  for(const u of S.units){const d=u&&u.np&&u.n27drop;if(!d||u.dead)continue;
    if(Math.hypot(u.x-d.x,u.y-d.y)<1.4){u.xiu=(u.xiu||0)+(d.xiu||0);const res=d.res||{};for(const k in res)S.res[k]=(S.res[k]||0)+res[k];u.n27drop=null;NET27.pick++;
      try{fx('ring',u.x,u.y,'#d8a0ff');}catch(e){}
      // 提示只給當事成員（與單機 g8 取回訊息同句）
      try{const P=NET.players&&NET.players.get(u.np);const msg='取回了遺落之物：修為 +'+(d.xiu||0)+(Object.keys(res).length?'、資源已歸還':'');if(P&&P.cid&&NET.tr){NET.tr.send(P.cid,{t:'toast',msgs:[msg]});NET27.pickMsg=msg;}}catch(e){}}}
}
// 成員斷線中渡劫：房主自動替他打坐（與弟子相同）。斷線＝名額離線，或超過 NET27.silentMs 沒收到他的任何封包（心跳每 2 秒；
// 傳輸層沒有 drop 事件時，net2 要 9 秒才判離線，這段期間也要先替他打坐）
function n27Offline(u){
  if(!u||!u.np||n27Role()!=='host'||u.np===NET.pkey)return false;
  try{if(typeof netIsOff==='function'&&netIsOff(u))return true;}catch(e){}
  const p=NET.players&&NET.players.get(u.np);if(!p||!p.online)return true;
  return p.lastRx!=null&&Date.now()-p.lastRx>NET27.silentMs;
}
function n27AutoMed(){
  if(!S||!S.units)return;
  for(const u of S.units){const B=u&&u.trib2;if(!B||!u.np||B.med)continue;
    let off=false;try{off=n27Offline(u);}catch(e){}
    if(off){B.med=true;B.autoMed=1;u.medit=true;NET27.autoMed++;}}
}
// ---------- 客機：視覺 ----------
function n27Bolt(u,i,mine){
  const F=n27Fx();if(!F||!u)return;
  try{
    if(!F.state.on){F.begin({lite:true,seed:(u.id|0)+i,noDark:!mine});F.state.caption='';F.state.capT=0;NET27.fxOwn=1;}
    if(!NET27.fxOwn)return;
    const X=window.XW_XTL,a=X&&X.anchor,h=(u.trib2&&u.trib2.lift)||0,d=h>0?(h+12)/32:0,tgt={id:u.id,x:u.x-d,y:u.y-d,name:u.name};NET27.lastTgt={id:u.id,x:tgt.x,y:tgt.y,ux:u.x,uy:u.y,h};
    if(X)X.anchor=function(){return tgt;};
    try{F.strike(null,{i:Math.min(9,i|0)});}finally{if(X)X.anchor=a;}
    const me=n27Me(),selfOn=!!(me&&me.trib2);
    if(mine||selfOn){F.state.noDark=false;if(mine)F.state.flash=0.5;F.state.dark=Math.max(F.state.dark||0,0.38);NET27.dark++;}else n27KillDark(F);
  }catch(e){}
}
function n27AnyView(){try{return !!(S&&S.units&&S.units.some(u=>u&&u.trib2));}catch(e){return false;}}
function n27FxEnd(){try{const F=n27Fx();if(NET27.fxOwn&&F&&!n27AnyView())F.end();}catch(e){}if(!n27AnyView())NET27.fxOwn=0;}
function n27View(u,row){ // row=[id,i,n,med,wait,from,post,lift]（lift＝房主高度，客機收到就對齊、兩包之間本地照 cfg 推）
  if(!u)return;const B=u.trib2||(u.trib2={lift:0,_net:1});
  B.i=row[1]|0;B.n=row[2]|0;B.med=!!row[3];B.wait=!!row[4];B.from=row[5]|0;if(B.lift==null)B.lift=0;
  B.post=row[6]&&typeof row[6]==='object'?{ph:row[6].ph,t:row[6].t}:(B._okLand?B.post:null);
  if(row[7]!=null&&isFinite(+row[7])&&!B._okLand)B.lift=Math.max(0,+row[7]);
}
// 客機升空／落地參數：讀 CULT_TRIB2.cfg（缺值退回舊值 26／40）
function n27Lift(){const c=n27T2()&&n27T2().cfg;const L=c&&+c.lift>0?+c.lift:26,V=c&&+c.liftSpd>0?+c.liftSpd:40;return {L,V};}
// 收到 ok 後仍在落地中（本機還沒落到地面，最多等 4 秒）
function n27Landing(u){const B=u&&u.trib2;return !!(B&&B._okLand&&(B.lift||0)>0&&performance.now()-B._okLand<4000);}
function n27Clr(u,why){try{NET27.clr={id:u.id,lift:+(+(u.trib2&&u.trib2.lift)||0).toFixed(1),why,ok:!!(u.trib2&&u.trib2._okLand)};}catch(e){}} // 診斷：客機最後一次清 trib2 時的高度與原因
function n27Sync(list){
  if(!Array.isArray(list)||!S||!S.units)return;const seen=new Set();
  for(const row of list){if(!Array.isArray(row))continue;const u=n27U(row[0]);if(!u)continue;seen.add(u.id);n27View(u,row);}
  for(const u of S.units)if(u&&u.trib2&&!seen.has(u.id)&&!n27Landing(u)){n27Clr(u,'sync');u.trib2=null;}
  if(!list.length)n27FxEnd();
}
function n27ClientRx(m){
  NET27.rx++;NET27.evc[m.ev]=(NET27.evc[m.ev]||0)+1;const p=m.p||{};const u=n27U(p.id);const me=n27Me();const mine=!!(u&&me&&u.id===me.id);NET27.last={ev:m.ev,id:p.id,mine};
  const fl=(t,c)=>{try{if(u)floater(u.x,u.y,t,c);}catch(e){}};const tt=s=>{try{toast(s);}catch(e){}};
  if(m.ev==='start'){
    if(u){u.trib2={from:p.from|0,n:p.n|0,i:0,lift:0,med:!!p.med,wait:!!p.wait,_net:1};try{fx('ring',u.x,u.y,'#c8d8ff');}catch(e){}}
    if(mine)tt(`⚡ 你引動天劫，${p.n} 道天雷將至！按 Z 盤膝打坐抵禦（減傷需打坐才生效）`);else tt(`⚡ ${p.name||'有人'}引動天劫，${p.n} 道天雷將至`);
  }else if(m.ev==='strike'){
    if(u&&u.trib2)u.trib2.i=p.i|0;{const txt=`天雷第 ${p.i}/${p.n} 道 -${p.dmg}${p.noMed?'（未打坐，減傷無效）':''}`;NET27.lastStrike={i:p.i|0,dmg:p.dmg,noMed:!!p.noMed,mul:p.mul,txt};fl(txt,'#c8d8ff');}n27Bolt(u,p.i|0,mine);
  }else if(m.ev==='waitEnd'){fl('調息完畢，天雷將至','#c8d8ff');}
  else if(m.ev==='ok'){if(u&&u.trib2){const B=u.trib2;B._okLand=performance.now();B.post={ph:'land',t:0};if(!((B.lift||0)>0)){n27Clr(u,'ok');u.trib2=null;}}else if(u)u.trib2=null;fl('渡劫成功','#ffe27a');try{if(u)fx('break',u.x,u.y,'#ffe27a');}catch(e){}tt(mine?'⚡ 你渡劫成功！':`⚡ ${p.name}渡劫成功！`);}
  else if(m.ev==='fail'){if(u)u.trib2=null;fl('渡劫失敗','#ff8080');
    if(p.ys){fl('元神出竅','#d8c8ff');tt(mine?'⚡ 你渡劫失敗，肉身崩毀，元神出竅！撐過數秒即可重塑肉身':`⚡ ${p.name}渡劫失敗，元神出竅`);}
    else tt(mine?'⚡ 你渡劫失敗，天雷貫體！':`⚡ ${p.name}渡劫失敗，天雷貫體！`);}
  else if(m.ev==='ys'){if(u){u.trib2=null;}if(mine&&!p.trib)tt('你肉身被毀，元神出竅！撐過數秒即可重塑肉身');NET27.ysView=Object.assign({},p);try{if(u)fx('ring',u.x,u.y,'#d8c8ff');}catch(e){}}
  else if(m.ev==='ysEscape'){if(mine)tt('元神歸位中……');}
  else if(m.ev==='ysRevive'){NET27.ysView=null;fl('重塑肉身','#d8c8ff');tt(mine?'元神歸位，重塑肉身（虛弱＋修為倒退）':`${p.name}元神歸位，重塑肉身`);}
  else if(m.ev==='ysGone'){NET27.ysView=null;if(mine)tt('你的元神被滅！');}
  else if(m.ev==='rateFail'){fl('突破失敗','#ff8080');}
  else if(m.ev==='die'){if(u){u.trib2=null;u.dead=true;u.n27dead=1;}const w=N27_DIE_TXT[p.why]||N27_DIE_TXT.trib;NET27.lastDieTxt=(mine?'你':(p.name||''))+w;if(p.why!=='trib'||!mine)tt(mine?`你${w}`:`${p.name||'道友'}${w}`);if(mine)n27ClientDeath();}
  if(Array.isArray(m.s))n27Sync(m.s);
  if(m.ev==='ok'||m.ev==='fail'||m.ev==='die'||m.ev==='ys')n27FxEnd();
}
function n27ClientDeath(){ // 成員自己的身隕面板（與單機同一個 #death；「讀取存檔」在聯機成員端拿掉）
  if(n27Role()!=='client'||(typeof deathOpen!=='undefined'&&deathOpen))return;
  try{closeOverlays();}catch(e){}try{closeShrine();}catch(e){}
  try{deathShow(true);NET27.panel=1;const b=document.querySelector('#death [data-x="load"]');if(b)b.remove();}catch(e){console.warn('[net27] death panel',e);}
}
function n27ClientPanelTick(){
  const me=n27Me();if(!me)return;
  if(me.dead&&me.n27dead){if(!(typeof deathOpen!=='undefined'&&deathOpen))n27ClientDeath();}
  else if(NET27.panel){NET27.panel=0;try{if(deathOpen)deathShow(false);}catch(e){}}
  try{S.flags.drop=me.n27drop||null;}catch(e){} // 成員只看得到自己的遺落之物
}
function n27ClientInstall(){
  if(typeof revive==='function'){const _x=revive;revive=function(){if(n27Role()==='client'){try{netIntent({a:'n27rev'});}catch(e){}return;}return _x.apply(this,arguments);};}
  if(typeof netClientRxExtra==='function'){const _x=netClientRxExtra;netClientRxExtra=function(m){
    if(m&&m.t==='t2'){if(n27Role()==='client'){try{n27ClientRx(m);}catch(e){console.warn('[net27] rx',e);}}return;}
    return _x.apply(this,arguments);};}
  if(typeof netApplySt==='function'){const _x=netApplySt;netApplySt=function(m){const r=_x.apply(this,arguments);
    try{if(m&&Array.isArray(m.t2)&&n27Role()==='client'){NET27.stRx++;n27Sync(m.t2);}}catch(e){}return r;};}
  if(typeof netClientUpdate==='function'){const _x=netClientUpdate;netClientUpdate=function(dt){const r=_x.apply(this,arguments);
    try{if(S&&S.units&&dt>0){let any=false;for(const u of S.units){const B=u&&u.trib2;if(!B)continue;any=true;const Q=n27Lift();if(B.post&&B.post.ph==='land'){B.lift=Math.max(0,(B.lift||0)-Q.V*1.5*dt);if(B.lift<=0&&B._okLand){n27Clr(u,'land');u.trib2=null;NET27.landClr=(NET27.landClr||0)+1;continue;}}else B.lift=Math.min(Q.L,(B.lift||0)+Q.V*dt);if(B.med)u.medit=true;}
      const F=n27Fx();if(NET27.fxOwn&&F&&F.state.on&&typeof F.tick==='function')F.tick(dt); // 客機的 Cult.tick 被 net20 靜音，特效衰減在這裡推
      if(!any&&NET27.fxOwn)n27FxEnd();}}catch(e){}try{n27ClientPanelTick();}catch(e){}return r;};}
  // g23 XFX 會把房主的飄字截成 16 字重播到客機：雷擊飄字 net27 已自己顯示完整版（含「未打坐，減傷無效」），重播的截斷副本略過，免得重複又被切掉提示
  // 雷擊飄字前綴：要跟 cult_trib2.js 的 floater 文案（`天雷第 ${i}/${n} 道…`）與 g23 XFX 重播一起改
  const NET_TRIB_XFX_PREFIX='天雷第 ';
  if(typeof xfxPlay==='function'){const _x=xfxPlay;xfxPlay=function(e){try{if(Array.isArray(e)&&e[0]==='t'&&String(e[3]||'').startsWith(NET_TRIB_XFX_PREFIX)&&n27Role()==='client'){NET27.xfxSkip=(NET27.xfxSkip||0)+1;return;}}catch(x){}return _x.apply(this,arguments);};}
  // 房主的 netHostRx 不接受偽造的 t2
  if(typeof netHostRx==='function'){const _x=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='t2')return;return _x.apply(this,arguments);};}
}
// 載入完才包到最外層（cult_trib2／g25 會在 setTimeout 0 再包 cultStartBreak）
function n27LateGuards(){
  if(typeof cultStartBreak==='function'&&!cultStartBreak._n27){const _x=cultStartBreak;cultStartBreak=function(u,auto){
    if(n27Role()==='client'){if(u&&!auto){try{netIntent({a:'break',id:u.id});NET27.fwd++;}catch(e){}}else NET27.blk++;return false;}
    return _x.apply(this,arguments);};cultStartBreak._n27=1;}
  if(typeof cultPayBreak==='function'&&!cultPayBreak._n27){const _x=cultPayBreak;cultPayBreak=function(){if(n27Role()==='client'){NET27.blk++;return;}return _x.apply(this,arguments);};cultPayBreak._n27=1;}
}
try{n27HostInstall();n27ClientInstall();}catch(e){console.warn('[net27] install',e);}
try{setTimeout(function(){setTimeout(function(){try{n27LateGuards();}catch(e){}},0);},0);}catch(e){}
try{if(typeof XW045==='function'){const _xw=XW045;XW045=function(){const o=_xw.apply(this,arguments);try{if(o&&o.net&&!o.net.trib2)Object.defineProperty(o.net,'trib2',{configurable:true,get:function(){return NET27;}});}catch(e){}return o;};}}catch(e){}
