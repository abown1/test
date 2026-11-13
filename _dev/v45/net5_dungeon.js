// ================== v0.5 聯機：區域與組隊副本（net5_dungeon.js，v0.5.1 改寫）==================
// 每個玩家角色各自在一個「區域」：宗門（ow）或副本（dg）。房主權威：兩個區域都在房主端模擬。
// 房主所在的區域是「現場」（S 本身，沿用 g13 的整體切換）；另一個區域存在 S.dg.W（房主在副本）或 NET.dgPark（房主在宗門、副本由成員進行）。
// netInR(區域, fn)：暫時把另一個區域換成現場執行 fn（模擬、同步、意圖都經由它），結束後換回。
// 進入副本只帶「發起人（與他選的弟子）」；其他在線玩家收到「X 進入了秘境，要一起進去嗎？」可加入或留在外面（net v0.5 的全員傳送已移除）。
// 任何人離開副本（傳送陣、入口、撤離、倒下、斷線過期）只有他自己回到宗門；最後一位玩家角色離開才結束副本（戰利品入宗門）。
// 房主也一樣：房主先離開而成員還在裡面 → 副本轉到背景繼續（房主回宗門照常遊玩）。
// 同步：st／ps 依區域分開送（各自的差異快取 NET.rc），換區域的人收到該區域的完整畫面（dg 開場或 full 快照）。
// 世界存檔（自動存檔、世界副本）＝宗門＋副本中玩家在進場位置（不再用進場前的舊快照）。
// netPlayersInRegion(區域)：'ow'｜'dg'（或副本種類）｜'b:建築id'，回傳該區域內的玩家角色（g20 首領房使用）。
NET.dgCoop=true;NET.dgPark=null;NET.rc=null;NET.dgInv=null;NET._post=[];
function netB64(u8){let s='';for(let k=0;k<u8.length;k+=8192)s+=String.fromCharCode.apply(null,u8.subarray(k,k+8192));return btoa(s);}
function netUnB64(b){const s=atob(b),u=new Uint8Array(s.length);for(let k=0;k<s.length;k++)u[k]=s.charCodeAt(k);return u;}
function netIsPC(u){return !!u&&(u.kind==='player'||!!u.np);}
// ---- 288 世界（g24）：區域換格。世界格 N=288、副本格 DG_N=128；兩區域格大小不同時，載入另一區域前先換模擬用的格網全域。----
// 暫時切換（netInR）只換模擬格網，不動現場的迷霧畫布／地形快取；現場永久換區域（netDgPark／netDgHostJoin）才用 xwGridAlloc 重設畫面。
// 副本格不在現場時暫存在 D._g；世界格不在現場時照 g24 規則放在 XWW.worldBank（g13 dgExit 的 xwGridToWorld 仍能接手）。128 世界兩邊同大小＝完全不動。
function netXwN(){try{return XWW.n;}catch(e){return 128;}}
function netGridUse(B){N=B.n;NCH=N/CS;terrain=B.terrain;biome=B.biome;depthMap=B.depthMap;roadMask=B.roadMask;block=B.block;comp=B.comp;occ=B.occ;nodeGrid=B.nodeGrid;explored=B.explored;
  chunkNodes=B.chunkNodes||[];xroadMask=B.xroadMask||null;if(B.startComp!=null)startComp=B.startComp;
  const A=xwAstarBufs(N);AG=A.AG;AC=A.AC;AS=A.AS;ACL=A.ACL;HI=A.HI;HF=A.HF;ASTAMP=0;HN=0;A.AS.fill(0);A.ACL.fill(0);fogDistDirty=true;fogDirty=true;}
function netGridFit(R,D){const want=R&&R.block&&R.block.length;if(!want||want===block.length)return false;
  let WB=null;try{WB=XWW.worldBank;}catch(e){throw new Error('[net] 區域格網大小不符 '+want+' vs '+block.length+'（沒有 g24）');}
  if(want===DG_N*DG_N&&N!==DG_N){const B=D&&D._g;  // 世界格 → 副本格
    if(B&&B.n===DG_N){XWW.worldBank=xwBankCapture();netGridUse(B);D._g=null;}else xwGridToDungeon();return true;}
  if(WB&&want===WB.n*WB.n){if(D)D._g=xwBankCapture();netGridUse(WB);XWW.worldBank=null;return true;} // 副本格 → 世界格
  throw new Error('[net] 區域格網大小不符 '+want+' vs '+block.length);}
function netGridLive(){try{xwGridAlloc(N,xwBankCapture());}catch(e){netRegionErr(e);}} // 現場換區域：迷霧畫布、地形快取、小地圖跟著新格網
// ---- 區域狀態 ----
const NET_RK=[['units','units'],['enemies','enemies'],['npcs','npcs'],['wand','wand'],['cands','cands'],['buildings','buildings'],['vstructs','vstructs'],['raidsActive','raids']];
function netCpArr(R,k,src){const a=R[k];if(a&&a.length===src.length){if(a.set&&src.BYTES_PER_ELEMENT)a.set(src);else for(let q=0;q<src.length;q++)a[q]=src[q];}else R[k]=src.slice();}
function netCapR(R){for(const [s,r] of NET_RK)R[r]=S[s];R.proj=projectiles;R.eff=effects;R.time=S.time;R.startComp=startComp;
  netCpArr(R,'block',block);netCpArr(R,'comp',comp);netCpArr(R,'exp',explored);netCpArr(R,'occ',occ);netCpArr(R,'ng',nodeGrid);return R;}
function netLoadR(R,D){const sw=netGridFit(R,D);for(const [s,r] of NET_RK)S[s]=R[r]||[];projectiles=R.proj||[];effects=R.eff||[];S.time=R.time;startComp=R.startComp;
  block.set(R.block);comp.set(R.comp);explored.set(R.exp);for(let k=0;k<N*N;k++){occ[k]=R.occ[k];nodeGrid[k]=R.ng[k];}return sw;}
function netViewSave(){return {cx:cam.x,cy:cam.y,cz:cam.zoom,cf:cam.follow,sel:selUnits,sb:selBuilding,so:selOther,bm:buildMode,fl:floaters,mk:markers,pg:pings,all:ALL,it:S.interior,pkc:panelKeyCache,cls:document.body.classList.contains('indg')};}
function netViewBlank(){floaters=[];markers=[];pings=[];selUnits=[];selBuilding=null;selOther=null;buildMode=null;S.interior=null;}
function netViewRestore(V){cam.x=V.cx;cam.y=V.cy;cam.zoom=V.cz;cam.follow=V.cf;selUnits=V.sel;selBuilding=V.sb;selOther=V.so;buildMode=V.bm;floaters=V.fl;markers=V.mk;pings=V.pg;ALL=V.all;S.interior=V.it;panelKeyCache=V.pkc;document.body.classList.toggle('indg',!!V.cls);}
function netDgRun(){return S.dg||(NET._inR==='ow'&&NET._owD)||(NET.dgPark&&NET.dgPark.D)||null;}   // 進行中的副本（不論在不在現場）
function netDgUnits(){if(S.dg)return S.units;if(NET._inR==='ow')return (NET._tmpR&&NET._tmpR.units)||[];if(NET.dgPark)return NET.dgPark.R.units||[];return [];}
function netOwUnits(){if(!S.dg)return S.units;const W=S.dg.W;return W&&W.units?W.units.filter(u=>!S.units.includes(u)):[];}
function netParkUnits(){if(NET._inR==='ow')return (NET._tmpR&&NET._tmpR.units)||[];if(NET.dgPark&&NET._inR!=='dg')return NET.dgPark.R.units||[];return [];}
function netRegionOf(pk){if(!netDgRun())return 'ow';const p=NET.players.get(pk);if(p&&p.spec)return 'dg';const a=p&&p.host?netHostPlayerU():netAvatarOf(pk);return a&&netDgUnits().includes(a)?'dg':'ow';}
function netAfterR(fn){if(NET._inR||NET._inDgUpd)NET._post.push(fn);else fn();}
function netFlushR(){if(NET._inR||NET._inDgUpd||!NET._post.length)return;const q=NET._post;NET._post=[];for(const f of q)try{f();}catch(e){console.error('[net] region post',e);}}
function netRegionErr(e){NET.regionErr=String(e&&e.stack||e).slice(0,400);if(!NET._regErrT||performance.now()-NET._regErrT>5000){NET._regErrT=performance.now();console.error('[net] region',e);}}
function netOwLead(){for(const u of S.units)if(u.np&&!u.dead){const p=NET.players.get(u.np);if(p&&p.online)return u;}return null;}
function netDgLead(){let f=null;for(const u of S.units)if(u.np&&!u.dead){const p=NET.players.get(u.np);if(p&&p.online)return u;f=f||u;}return f;}
// 在指定區域執行 fn（同一時間只換一層；巢狀要求另一區域時回傳 undefined）
function netInR(r,fn){const cur=S.dg?'dg':'ow';if(r===cur)return fn();if(NET._inR){netRegionErr(new Error('nested region '+NET._inR+'→'+r));return undefined;}
  if(r==='ow'){const D=S.dg,V=netViewSave(),T=NET._tmpR||(NET._tmpR={});netCapR(T);netLoadR(D.W,D);S.dg=null;NET._inR='ow';NET._owD=D;netViewBlank();
    const sa=NET.actAs;NET.actAs=netOwLead();
    try{return fn();}finally{NET.actAs=sa;NET._inR=null;NET._owD=null;netCapR(D.W);netLoadR(T,D);S.dg=D;netViewRestore(V);netFlushR();}}
  const P=NET.dgPark;if(!P)return undefined;const D=P.D,V=netViewSave();netCapR(D.W);netLoadR(P.R,D);S.dg=D;NET._inR='dg';netViewBlank();
  const sa=NET.actAs;NET.actAs=netDgLead();
  try{return fn();}finally{NET.actAs=sa;NET._inR=null;
    if(S.dg===D){netCapR(P.R);netLoadR(D.W,D);S.dg=null;}else NET.dgPark=null; // 副本在 fn 裡結束：dgExit 已經把宗門換回現場
    netViewRestore(V);document.body.classList.remove('indg');netFlushR();}}
// 房主不在副本裡、副本還有人：副本轉到背景（房主回到宗門）
function netDgPark(){const D=S.dg;if(!D||NET.dgPark||NET._inR)return;const P={D,R:{}};netCapR(P.R);if(netLoadR(D.W,D))netGridLive();S.dg=null;NET.dgPark=P;
  document.body.classList.remove('indg');const hp=netHostPlayerU();selUnits=hp?[hp.id]:[];selOther=null;selBuilding=null;panelKeyCache=null;buildMode=D.W.buildMode||null;
  if(hp){const q=iso(hp.x,hp.y);cam.x=q.x;cam.y=q.y;}else if(D.W.cam){cam.x=D.W.cam.x;cam.y=D.W.cam.y;}if(D.W.cam)cam.zoom=D.W.cam.zoom;cam.follow=true;netLog('dungeon parked (host outside)',D.kind);}
// ---- 同步：依區域分開送 ----
function netRcNew(){return {last:{u:new Map(),e:new Map()},ps:{u:new Map(),e:new Map(),w:new Map()},cd:new Map()};}
function netRcStart(){NET.rc={ow:{last:NET.last,ps:NET._psLast||{u:new Map(),e:new Map(),w:new Map()},cd:NET._psCd||new Map()},dg:netRcNew()};}
function netUseRC(r){if(!NET.rc)return;const c=NET.rc[r]||(NET.rc[r]=netRcNew());NET.last=c.last;NET._psLast=c.ps;NET._psCd=c.cd;}
function netRcEnd(){if(!NET.rc)return;netUseRC('ow');NET.rc=null;}
function netPerRegion(fn){if(!netDgRun()||NET._inR)return fn();if(!NET.rc)netRcStart();
  const to={ow:[],dg:[]};for(const p of NET.players.values()){if(p.host||!p.online||p.cid==null)continue;to[netRegionOf(p.pkey)].push(p.cid);}
  for(const r of ['dg','ow']){if(!to[r].length)continue;netUseRC(r);NET._to=to[r];try{netInR(r,fn);}catch(e){netRegionErr(e);}finally{NET._to=null;}}
  netUseRC('ow');}
{const _s=netHostSend;netHostSend=function(){const a=arguments;return netPerRegion(()=>_s.apply(this,a));};}
// 背景區域也要模擬：房主在副本而有成員在宗門 → 宗門照常運轉；房主在宗門而副本有人 → 副本照常進行
function netOwNeeded(){for(const p of NET.players.values())if(!p.host&&p.online&&netRegionOf(p.pkey)==='ow')return true;return false;}
{const _u=update;update=function(dt){if(NET.role!=='host'||NET._inR||!NET.tr)return _u.apply(this,arguments);
  const r=_u.apply(this,arguments);
  try{if(S.dg?netOwNeeded():NET.dgPark)netInR(S.dg?'ow':'dg',()=>_u.call(this,dt));}catch(e){netRegionErr(e);}
  netFlushR();return r;};}
// 背景區域執行中不寫自動存檔（現場換回來後再存）
{const _a=autoSave;autoSave=function(){if(NET._inR){const a=arguments;setTimeout(()=>autoSave.apply(null,a),500);return;}return _a.apply(this,arguments);};}
// ---- 快照 ----
// 世界存檔：宗門＋副本中玩家角色放回進場位置（成員的修為、裝備…都是最新的；副本戰利品尚未入帳）
function netWorldSnap(_sn){return netInR('ow',()=>{const ms=netDgUnits().filter(u=>u.dgSave);const F=['x','y','job','jobB','jobRes','guardAt','holdAt','aiJob'];
  const sv=ms.map(u=>{const o={dgSave:u.dgSave,dgHurt:u.dgHurt};for(const k of F)o[k]=u[k];return o;});const U=S.units;
  ms.forEach(u=>{const s=u.dgSave;for(const k of F)u[k]=s[k];u.dgSave=null;u.dgHurt=false;});S.units=U.concat(ms.filter(u=>!U.includes(u)));
  try{return _sn();}finally{S.units=U;ms.forEach((u,k)=>Object.assign(u,sv[k]));}});}
{const _sn=snapshot;snapshot=function(){if(NET.role!=='host'||NET._inR||NET._viewSnap||!netDgRun())return _sn.apply(this,arguments);return netWorldSnap(_sn);};}
// 畫面快照：只有宗門區域（給在宗門的成員）
function netViewSnap(pk){if(!netDgRun())return null;return netInR('ow',()=>{NET._viewSnap=true;try{return snapshot();}finally{NET._viewSnap=false;}})||null;}
function netDgSendOut(p,why){if(!NET.tr||p.cid==null)return;const cid=p.cid,kind=(netDgRun()||{}).kind;
  netAfterR(()=>{try{NET.tr.send(cid,{t:'dgout',why,kind});NET.tr.send(cid,{t:'full',snap:(typeof netSnapEnsureAv==='function'?netSnapEnsureAv(p.pkey,netViewSnap(p.pkey)||snapshot()):(netViewSnap(p.pkey)||snapshot()))});}catch(e){console.error(e);}});}
// ---- 進入 ----
function netDgCoop(orig,args){const kind=args[0],mode=args[1],hard=!!args[2];
  if(NET.role==='client'){if(S.dg){toast('已在副本中');return false;}netIntent({a:'dg',k:String(kind),m:mode==='all'?'all':mode==='sel'?'sel':'solo',h:hard});return true;}
  if(NET.dgPark&&!NET._inR){netDgHostJoin();return true;} // 已有道友在秘境裡：加入他們
  if(S.dg||S.interior||NET._inR)return orig.apply(this,args);
  const r=orig.apply(this,args);if(r&&S.dg)netDgAfterEnter(player());return r;}
function netDgAfterEnter(init){const D=S.dg;const ins=new Set(S.units);
  D.W.units=D.W.units.filter(u=>!ins.has(u)); // 進場的人不再留在宗門名單（g13 原本靠 dgSave 留著）
  for(const e of D.W.enemies||[])if(e.target&&ins.has(e.target))e.target=null;
  for(const u of S.units)if(u.np){u.job=null;u.jobB=null;u.aiJob=null;}
  D.party=S.units.length;D.net=1;const ipk=init&&init.np?init.np:NET.pkey;const ip=NET.players.get(ipk);D.by=(ip&&ip.name)||(init&&init.name)||'';D.byPk=ipk;
  netRcStart();netLog('dungeon start',D.kind,'by',ipk,'party',D.party);
  const cap=NET.capture;NET.capture=null;try{toast(`${D.by} 進入「${DGS[D.kind].n}」：隊伍 ${D.party} 人`);}finally{NET.capture=cap;}
  if(ip&&!ip.host&&ip.cid!=null)netDgSendStart(ip.cid,ipk);
  netDgInvite(D,ipk);
  const hp=netHostPlayerU();if(!hp||!S.units.includes(hp))netDgPark();}
function netDgStartMsg(){const D=S.dg;return {t:'dg',kind:D.kind,hard:D.hard,tier:D.tier,ent:D.ent,party:D.party,rooms:D.L.rooms,block:netB64(D.L.block),fl:netB64(D.L.fl),ids:S.units.map(u=>u.id),
  us:S.units.map(u=>{const o=pickKeys(u,UNIT_KEEP);if(u.np)o.np=u.np;return o;}),en:S.enemies.map(e=>pickKeys(e,EN_KEEP))};}
// 給某位成員：在副本區域（隊伍中或觀戰）→ 副本開場；在宗門 → 邀請
function netDgSendStart(cid,pk){if(NET.role!=='host'||!NET.tr)return false;const D=netDgRun();if(!D)return false;
  if(cid==null){for(const p of NET.players.values())if(!p.host&&p.online&&p.cid!=null)netDgSendStart(p.cid,p.pkey);return true;}
  if(!pk||netRegionOf(pk)==='dg'){
    const go=()=>{
      let m=null;try{if(netDgRun())m=netInR('dg',netDgStartMsg);}catch(e){m=null;}
      if(m&&pk&&Array.isArray(m.us)&&!m.us.some(u=>u&&u.np===pk)){
        const a=typeof netAvatarAnywhere==='function'?netAvatarAnywhere(pk):null;
        if(a){const o=(typeof pickKeys==='function'&&typeof UNIT_KEEP!=='undefined')?pickKeys(a,UNIT_KEEP):{id:a.id,x:a.x,y:a.y,kind:a.kind,name:a.name};o.np=pk;m.us.push(o);if(Array.isArray(m.ids)&&!m.ids.includes(a.id))m.ids.push(a.id);}
      }
      if(m){NET.tr.send(cid,m);return 'sent';}
      // 區域切換結束後秘境已不在（例如 need 排隊時房主正在 dgRetreat）：改送帶化身的宗門 full，避免靜默丟包
      try{const snap=typeof netSnapEnsureAv==='function'?netSnapEnsureAv(pk,(typeof netViewSnap==='function'&&netViewSnap(pk))||snapshot()):null;
        if(snap){NET.tr.send(cid,{t:'full',snap});return 'full';}}catch(e){}
      return false;
    };
    if(NET._inR&&NET._inR!=='dg'){netAfterR(go);return 'queued';}
    const r=go();return r||false;}
  else if(!D.end&&netPartyOk(pk,D.byPk)){NET.tr.send(cid,netDgInvMsg(D));return 'inv';}return false;}
// 隊伍規則（#6 組隊會改寫）：預設所有人都收到邀請
function netPartyOk(pk,byPk){return true;}
function netDgInvMsg(D){return {t:'dginv',kind:D.kind,by:D.by||'',n:netDgUnits().filter(netIsPC).length};}
function netDgInvite(D,ipk){const m=netDgInvMsg(D);
  for(const p of NET.players.values()){if(p.pkey===ipk)continue;if(netRegionOf(p.pkey)!=='ow'||!netPartyOk(p.pkey,ipk))continue;
    if(p.host)netDgInvShow(m);else if(p.online&&p.cid!=null)try{NET.tr.send(p.cid,m);}catch(e){}}}
// 把角色放進副本入口（在副本區域內呼叫）
function netDgPlaceIn(u){const D=S.dg,st=D.L.rooms[0];
  u.dgSave={x:u.x,y:u.y,job:u.job,jobB:u.jobB,jobRes:u.jobRes,guardAt:u.guardAt,holdAt:u.holdAt,aiJob:u.aiJob};
  u.inside=false;u.inB=null;u.task=null;u.path=[];u.carry=null;u.medit=false;u.vx=u.vy=0;u._dgArm=false;if(u.np){u.job=null;u.jobB=null;u.aiJob=null;}
  D.W.units=D.W.units.filter(x=>x!==u);for(const e of D.W.enemies||[])if(e.target&&e.target.id===u.id)e.target=null;
  const k=S.units.length;const f=nearestFree(st.cx+(k%5-2)*0.7,st.cy+Math.floor(k/5)*0.7-1,-1)||{i:Math.floor(st.cx),j:Math.floor(st.cy)};u.x=f.i+0.5;u.y=f.j+0.5;
  if(!S.units.includes(u))S.units.push(u);D.party=(D.party||0)+1;}
function netDgJoin(pk){const D=netDgRun();if(!D||D.end)return false;const a=netAvatarOf(pk);if(!a||a.dead)return false;const p=NET.players.get(pk);
  if(netDgUnits().includes(a))return true;if(p)p.spec=false;
  netInR('ow',()=>{if(a.inside)try{exitBuilding(a);}catch(e){}});
  netInR('dg',()=>netDgPlaceIn(a));
  netLog('dungeon join',pk,D.kind);toast(`${a.name} 進入了秘境「${DGS[D.kind].n}」`);
  if(p&&p.cid!=null)netDgSendStart(p.cid,pk);return true;}
// 房主接受邀請：副本換回現場，主角走進入口
function netDgHostJoin(){const P=NET.dgPark;if(!P||NET._inR)return false;const hp=netHostPlayerU();if(!hp||hp.dead)return false;const D=P.D;
  if(S.interior)try{exitInterior(true);}catch(e){}if(hp.inside)try{exitBuilding(hp);}catch(e){}
  D.W.cam={x:cam.x,y:cam.y,zoom:cam.zoom};D.W.buildMode=buildMode;
  netCapR(D.W);if(netLoadR(P.R,D))netGridLive();S.dg=D;NET.dgPark=null;buildMode=null;netDgPlaceIn(hp);
  selUnits=[hp.id];selOther=null;selBuilding=null;panelKeyCache=null;const q=iso(hp.x,hp.y);cam.x=q.x;cam.y=q.y;cam.follow=true;document.body.classList.add('indg');
  NET.dgInv=null;netDgInvRender();netLog('host joined dungeon',D.kind);toast(`進入秘境「${DGS[D.kind].n}」`);return true;}
// 成員的副本相關意圖
function netApplyDg(pk,i){const a=netAvatarOf(pk),p=NET.players.get(pk),D=netDgRun();let r=false;
  if(i.a==='dgleave'){if(!a)return false;
    const inDg=!!(D&&typeof netDgUnits==='function'&&netDgUnits().includes(a));
    // 已在宗門（例如倒下改觀戰：角色已送回、畫面還在秘境）→ 不再切場失敗，補送宗門權威快照
    if(!inDg){if(p)p.spec=false;if(p&&p.online&&p.cid!=null)netDgSendOut(p,'retreat');r=true;}
    else r=!!netInR('dg',()=>{if(!S.units.includes(a))return false;netDgLeave(a,'retreat');return true;});}
  else if(i.a==='dgjoin')r=netDgJoin(pk);
  else if(i.a==='dgspec'){if(!D||!p||(a&&netDgUnits().includes(a)))return false;p.spec=true;if(p.cid!=null)netDgSendStart(p.cid,pk);r=true;}
  else if(i.a==='dgspecx'){if(!p||!p.spec)return false;p.spec=false;netDgSendOut(p,'spec');r=true;}
  else if(i.a==='dg'){if(D)r=netDgJoin(pk);
    else{if(!a||a.dead||!DGS[i.k]||!S.units.includes(a))return false;
      const sv=selUnits,si=S.interior;S.interior=null; // 房主自己在室內不影響成員開副本
      try{selUnits=[];r=netAsMember(a,()=>dgEnter(i.k,i.m==='all'?'all':'solo',!!i.h));}finally{if(!S.dg){selUnits=sv;if(si&&!S.interior)S.interior=si;}}}}
  if(r)NET.stats.applied++;return !!r;}
function netIntentRegion(pk,i){if(!netDgRun()||!i)return null;if(i.a==='dg'||i.a==='dgjoin'||i.a==='dgspec'||i.a==='dgspecx'||i.a==='dgleave'||i.a==='name')return null;
  const a=netAvatarOf(pk);return a&&netDgUnits().includes(a)?'dg':'ow';}
// ---- 副本中 ----
// 離開副本：只有這個角色回到宗門（在副本區域內呼叫；模擬迴圈中則排到迴圈結束後）
function netDgLeave(u,why){const D=S.dg;if(!D||!S.units.includes(u))return;if(NET._inDgUpd){(D._outQ||(D._outQ=[])).push([u,why]);return;}netDgLeaveNow(u,why);}
function netDgRestore(u){const s=u.dgSave;if(s){Object.assign(u,{x:s.x,y:s.y,job:s.job,jobB:s.jobB,jobRes:s.jobRes,guardAt:s.guardAt,holdAt:s.holdAt,aiJob:s.aiJob});}
  u.dgSave=null;u.task=null;u.path=[];u.vx=u.vy=0;u.dash=null;u.medit=false;u.hp=Math.max(1,u.hp);u._dgArm=false;if(u.np){u.job=null;u.aiJob=null;}}
function netDgLeaveNow(u,why){const D=S.dg;if(!D||!S.units.includes(u))return;
  S.units=S.units.filter(x=>x!==u);selUnits=selUnits.filter(id=>id!==u.id);for(const w of S.enemies)if(w.target&&w.target.id===u.id)w.target=null;
  netDgRestore(u);u.lastHit=D.W.time;if(!D.W.units.includes(u))D.W.units.push(u);
  if(why==='down'){u.hp=1;u.dgHurt=true;D.down++;}
  netLog('dungeon leave',u.np||'host',why);
  if(why!=='gone'){const cap=NET.capture;NET.capture=null;try{toast(`${u.name} ${why==='portal'?'帶著戰果走出秘境':why==='down'?'重傷，被傳送出秘境':'撤出秘境'}，回到宗門`);}finally{NET.capture=cap;}}
  if(u.np){const p=NET.players.get(u.np);if(p&&p.online&&!p.spec)netDgSendOut(p,why);}
  if(!S.units.some(netIsPC)){dgExit(why!=='down'||!!D.cleared);return;} // 最後一位玩家角色離開：副本結束
  if(u.kind==='player'&&S.dg===D&&!NET._inR)netDgPark();}
function netDgMemberGone(pk){const a=netAvatarOf(pk);if(!a||!netDgUnits().includes(a))return;netInR('dg',()=>netDgLeave(a,'gone'));}
// 倒下：玩家角色重傷送出（不永久隕落，含仙凡之門）；房主倒下而隊友還在 → 只有房主送出
{const _x=dgDown;dgDown=function(u){const D=S.dg;if(D&&!D.end&&u&&NET.role==='host'){
    if(u.np){netDgLeave(u,'down');return;}
    if(u.kind==='player'&&S.units.some(x=>x.np&&!x.dead)){u.hp=1;D._hostOut='down';return;}
    if(!u.np&&u.kind!=='player'){const l=D.lost;const r=_x.apply(this,arguments);if(D.lost===l&&!S.units.includes(u)&&!D.W.units.includes(u)){netDgRestore(u);u.hp=1;u.dgHurt=true;D.W.units.push(u);}return r;}}
  return _x.apply(this,arguments);};}
// 玩家角色也能觸發房間、走傳送陣或回入口離開；模擬迴圈結束後處理排隊的離開
{const _x=dgUpdate;dgUpdate=function(dt){if(NET.role!=='host')return _x.apply(this,arguments);const D=S.dg;NET._inDgUpd=true;let r;try{r=_x.apply(this,arguments);}finally{NET._inDgUpd=false;}
  if(S.dg===D&&!D.end){for(const u of S.units.slice()){if(!u.np||u.dead)continue;const rm=dgRoomOf(u.x,u.y);if(rm&&rm.state==='idle')dgSpawnRoom(rm);
      // v0.4.7（#122／#123／#186）：成員走上出口傳送陣／回到入口 → 先在「他自己的畫面」跳確認卡（netDgAskOut，net17），確認才離開；不暫停
      const ask=typeof netDgAskOut==='function'?netDgAskOut:(v=>netDgLeave(v,'portal'));
      if(D.exitP){const dx=dist(u.x,u.y,D.exitP.x,D.exitP.y);if(dx<1.2&&!u._xpAsk){u._xpAsk=1;ask(u,'portal');continue;}else if(dx>2.5)u._xpAsk=0;}
      const de=D.ent?dist(u.x,u.y,D.ent.x,D.ent.y):99;if(de>3)u._dgArm=true;else if(u._dgArm&&de<1.1){u._dgArm=false;ask(u,'ent');}}
    const q=D._outQ||[];D._outQ=[];for(const [u,w] of q){if(S.dg!==D)break;netDgLeaveNow(u,w);}
    if(S.dg===D&&D._hostOut){const w=D._hostOut;D._hostOut=null;const hp=netHostPlayerU();if(hp&&S.units.includes(hp))netDgLeaveNow(hp,w);}}
  netFlushR();return r;};}
{const _x=dgExit;dgExit=function(keep){if(NET.role==='client')return;const D=S.dg;if(!D||NET.role!=='host')return _x.apply(this,arguments);
  // 一個人離開（傳送陣、入口、撤離鈕）而還有其他玩家角色在裡面 → 只有他離開
  if(keep&&!D._ending){const me=player();if(me&&S.units.includes(me)&&S.units.some(u=>netIsPC(u)&&u!==me&&!u.dead)){
      if(me.kind==='player'){if(NET._inDgUpd)D._hostOut='portal';else netDgLeaveNow(me,'portal');}else netDgLeave(me,'portal');return;}}
  D._ending=true;for(const u of S.units)if(u.dgSave&&!D.W.units.includes(u))D.W.units.push(u); // 隊伍裡的弟子照 g13 回到進場位置
  const inside=[];for(const p of NET.players.values()){if(p.host||!p.online||p.cid==null)continue;if(netRegionOf(p.pkey)==='dg')inside.push(p.cid);}
  const r=_x.apply(this,arguments);
  if(!S.dg){netRcEnd();for(const p of NET.players.values())p.spec=false;NET.dgInv=null;netDgInvRender();
    if(NET.tr){NET.tr.broadcast({t:'dgend',kind:D.kind,keep:!!keep,cleared:!!D.cleared});netAfterR(()=>{let snap=snapshot();if(typeof netSnapEnsureAv==='function'){for(const p of NET.players.values())if(p&&inside.includes(p.cid))snap=netSnapEnsureAv(p.pkey,snap);}for(const c of inside)try{NET.tr.send(c,{t:'full',snap});}catch(e){}});}
    netLog('dungeon end',D.kind,keep?'keep':'fail',D.cleared?'cleared':'');}
  return r;};}
{const _x=dgRetreat;dgRetreat=function(){if(NET.role==='client'){if(S.dg)netIntent({a:'dgleave'});return;}return _x.apply(this,arguments);};}
function netDgState(){const D=S.dg;return {t:netR2(D.t),rs:D.L.rooms.map(r=>r.state),loot:D.loot,cl:D.cleared,ex:D.exitP||null,boss:D.boss,mk:D.mech.marks,party:D.party,down:D.down,lost:D.lost,qn:D.queue.length,end:D.end||null};}
// 區域內的玩家角色（房主主角＋成員化身，未倒下）。'ow'／'world'／'sect'；'dg'／'dungeon'／副本種類；'b:建築id'
function netPlayersInRegion(rid){const D=netDgRun();rid=rid==null?(S.dg?'dg':'ow'):String(rid);let L;
  if(rid==='ow'||rid==='world'||rid==='sect')L=netOwUnits();
  else if(rid.startsWith('b:')){const bid=+rid.slice(2);L=netOwUnits().filter(u=>u.inside&&u.inB===bid);}
  else{if(!D||(rid!=='dg'&&rid!=='dungeon'&&rid!==D.kind))return [];L=netDgUnits();}
  return L.filter(u=>netIsPC(u)&&!u.dead);}
// ---- 邀請卡（房主與成員共用）----
function netDgInvShow(m){NET.dgInv={kind:m.kind,by:m.by||'',open:true};netDgInvRender();}
function netDgInvRender(){let el=document.getElementById('netdginv');const I=NET.dgInv;if(!I){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='netdginv';el.style.cssText='position:fixed;z-index:58;left:50%;transform:translateX(-50%);background:#1d140af2;border:1px solid #c9a24a;color:#ffe9a8;border-radius:10px;font-size:14px;text-align:center';
    el.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-di]');if(b)netDgInvAct(b.dataset.di);});document.body.appendChild(el);}
  const nm=(DGS[I.kind]||{}).n||'秘境';
  const h=I.open?`<div style="padding:12px 16px">⚔ ${netEsc(I.by)} 進入了秘境「${netEsc(nm)}」，要一起進去嗎？<div style="margin-top:8px"><button class="btn pri" data-di="join">加入</button> <button class="btn" data-di="stay">留在外面</button></div></div>`
    :`<div data-di="open" style="padding:5px 12px;cursor:pointer">⚔ 秘境邀請（${netEsc(nm)}）</div>`;
  if(el._h!==h){el._h=h;el.innerHTML=h;}el.style.top=I.open?'22%':'52px';el.style.display='';}
function netDgInvAct(a){const I=NET.dgInv;if(!I)return;if(a==='join'){NET.dgInv=null;if(NET.role==='client')netIntent({a:'dgjoin'});else netDgHostJoin();}else if(a==='stay')I.open=false;else if(a==='open')I.open=true;netDgInvRender();}
// ---- 成員端 ----
function netDgClientStart(m){if(S.dg)netDgClientEnd(true);
  const L={rooms:m.rooms,kind:m.kind,block:netUnB64(m.block),fl:netUnB64(m.fl)};
  // #195 存宗門名單用 slice，避免之後 S.units 被換掉／full 重載時把 W 一併清空；進場化身仍留在 W，離開時才回得來
  const W={units:S.units.slice(),enemies:S.enemies,npcs:S.npcs,wand:S.wand,cands:S.cands,buildings:S.buildings,vstructs:S.vstructs,raids:S.raidsActive,proj:projectiles,eff:effects,
    block:block.slice(),comp:comp.slice(),occ:occ.slice(),ng:nodeGrid.slice(),exp:explored.slice(),startComp,cam:{x:cam.x,y:cam.y,zoom:cam.zoom},time:S.time};
  if(S.interior)try{restoreInterior({});}catch(e){S.interior=null;}
  if(L.block.length!==block.length)try{xwGridToDungeon();}catch(e){netRegionErr(e);} // 288 世界：先換成副本格（DG_N）
  if(L.block.length!==block.length){netRegionErr(new Error('dg grid '+L.block.length+' vs '+block.length));return;}
  block.set(L.block);occ.fill(null);nodeGrid.fill(null);explored.fill(1);computeComp();
  const ids=new Set(m.ids||[]);const have=new Map(S.units.map(u=>[u.id,u]));
  S.units=(m.us||[]).map(o=>{const u=have.get(o.id);if(u){Object.assign(u,o);u.inside=false;u.inB=null;delete u._hb;return u;}return netMkUnit(o);});
  if(!m.us)S.units=[...have.values()].filter(u=>ids.has(u.id));
  S.enemies=[];S.npcs=[];S.wand=[];S.cands=[];S.buildings=[];S.vstructs=[];S.raidsActive=[];projectiles=[];effects=[];buildMode=null;
  S.dg={kind:m.kind,hard:!!m.hard,tier:m.tier,L,W,pre:null,loot:{res:{},mats:{},items:[],misc:{}},t:0,room:0,cleared:false,end:null,ent:m.ent,armed:false,party:m.party,boss:null,mech:{t:5,marks:[]},summon:[],queue:[],down:0,lost:0,net:1};
  for(const o of m.en||[])S.enemies.push(Object.assign(makeEnemy(o.type,o.x,o.y),o,{path:[],target:null}));
  NET.last2=null;NET.dgInv=null;netDgInvRender();const a=netAvatarOf(NET.pkey);const inRun=!!(a&&ids.has(a.id));
  const f=inRun?a:S.units[0];if(f){selUnits=inRun?[a.id]:[];const q=iso(f.x,f.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}
  selBuilding=null;selOther=null;panelKeyCache=null;document.body.classList.add('indg');
  netLog('dungeon joined',m.kind,'party',m.party,inRun?'(in run)':'(spectating)');toast(`${inRun?'進入':'觀戰：隊伍正在'}「${DGS[m.kind].n}」${inRun?'！走進房間會引出敵人':''}`);}
function netDgApplyState(s){const D=S.dg;if(!D)return;D.t=s.t;s.rs.forEach((st,k)=>{if(D.L.rooms[k])D.L.rooms[k].state=st;});D.loot=s.loot;D.cleared=s.cl;D.exitP=s.ex||undefined;D.boss=s.boss;D.mech.marks=s.mk||[];D.party=s.party;D.down=s.down;D.lost=s.lost;D.queue=new Array(s.qn||0).fill(0);}
function netDgClientEnd(silent,m){const D=S.dg;if(!D)return;const W=D.W;
  // #195 離開秘境前先抓住自己的化身（可能只在副本單位列）；還原宗門名單後一定要塞回去
  const mine=NET.pkey&&(netAvatarOf(NET.pkey)||(S.units.find(u=>u.np===NET.pkey))||null);
  Object.assign(S,{units:W.units.slice(),enemies:W.enemies,npcs:W.npcs,wand:W.wand,cands:W.cands,buildings:W.buildings,vstructs:W.vstructs,raidsActive:W.raids||[]});
  projectiles=W.proj||[];effects=W.eff||[];
  if(W.block&&W.block.length!==block.length)try{xwGridToWorld(W);}catch(e){netRegionErr(e);} // 288 世界：換回世界格
  if(W.block&&W.block.length===block.length){block.set(W.block);comp.set(W.comp);for(let k=0;k<N*N;k++){occ[k]=W.occ[k];nodeGrid[k]=W.ng[k];}explored.set(W.exp);startComp=W.startComp;}
  else{netLog('dg end: world grid mismatch → need');NET._needAv=true;if(NET.tr)try{NET.tr.send('host',{t:'need'});}catch(e){}}
  S.dg=null;document.body.classList.remove('indg');
  if(mine){if(mine.np!==NET.pkey)mine.np=NET.pkey;if(!S.units.includes(mine))S.units.push(mine);if(W.units&&!W.units.includes(mine))W.units.push(mine);
    mine.inside=false;mine.inB=null;mine.task=null;mine.path=[];mine.vx=mine.vy=0;if(mine.dgSave){try{netDgRestore(mine);}catch(e){mine.dgSave=null;}}}
  const a=netAvatarOf(NET.pkey);selUnits=a?[a.id]:[];selOther=null;panelKeyCache=null;
  cam.x=W.cam.x;cam.y=W.cam.y;cam.zoom=W.cam.zoom;for(const u of S.units){delete u._tx;delete u._ty;delete u._hb;}
  NET._recam=true; // 接著收到的宗門快照：鏡頭對準自己的角色
  if(!a&&NET.tr){NET._needAv=true;try{NET.tr.send('host',{t:'need'});}catch(e){}netLog('avatar missing after dg end → need');}
  if(!silent)toast(m&&m.keep?`隊伍離開「${DGS[m.kind].n}」${m.cleared?'（通關）':'（撤離）'}，戰利品已入宗門`:`隊伍被傳送出「${DGS[(m||{}).kind]?DGS[m.kind].n:'副本'}」……`);
  netLog('dungeon view closed',m?(m.keep?'keep':'fail'):'reset');}
{const _l=netLoadSnap;netLoadSnap=function(){const r=_l.apply(this,arguments);if(NET.role==='client'&&NET._recam&&!S.dg){NET._recam=false;const a=netAvatarOf(NET.pkey);
    if(a){selUnits=[a.id];const q=iso(a.x,a.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}}return r;};}
function netClientRxExtra(m){
  if(m.t==='dg')netDgClientStart(m);
  else if(m.t==='dgend'){NET.dgInv=null;netDgInvRender();NET._pendingOw=m;NET._recam=true;} // 不自己切場：等後續 full 權威快照
  else if(m.t==='dginv'){if(!S.dg)netDgInvShow(m);}
  else if(m.t==='dgout'){NET._pendingOw={why:m.why,kind:m.kind};NET._recam=true;} // 只記意圖結果，切場由 full 套用
  }
// 成員攻擊（右鍵／dgTap → setTask attack）：送給房主；只轉送自己能控制的角色、只限 attack。
// BUG-031：舊版意圖只帶 eid，房主套用時沒有 man／pack／ax／ay → runTask 遠距牽繩是 18 而非手動鎖定的 80，離怪太遠會立刻清掉任務。
// 開關：NET_FLAGS.farAtk 預設 true（net12 登記，可用 ?netexp=-farAtk 關閉，回到只傳 eid 的舊行為）。不改存檔結構。
function netFarAtkOn(){return typeof NET_FLAGS==='undefined'||NET_FLAGS.farAtk!==false;}
{const _x=setTask;setTask=function(u,t){if(NET.role==='client'&&u&&t&&t.type==='attack'&&(u.np===NET.pkey||(u.kind==='disciple'&&!u.np))){const i={a:'atk',id:u.id,eid:+t.eid};if(netFarAtkOn()&&t.man){i.man=1;if(Array.isArray(t.pack))i.pack=t.pack.map(Number).filter(n=>n>0).slice(0,8);if(isFinite(t.ax))i.ax=+t.ax;if(isFinite(t.ay))i.ay=+t.ay;}netIntent(i);return;}return _x.apply(this,arguments);};NET._task=(...a)=>_x(...a);}
function netApplyAtk(pk,i){const u=unitById(+i.id),e=enemyById(+i.eid);if(!netCanCtl(u,pk)||u.dead||!e||e.dead)return false;const t={type:'attack',eid:e.id};if(netFarAtkOn()&&i.man){t.man=1;if(Array.isArray(i.pack))t.pack=i.pack.map(Number).filter(n=>n>0).slice(0,8);if(isFinite(i.ax))t.ax=+i.ax;if(isFinite(i.ay))t.ay=+i.ay;}NET._task(u,t);NET.stats.applied++;return true;}
// 測試掛鉤（XW.net.test）
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);if(o.net){o.net.test=Object.defineProperties(o.net.test||{},Object.getOwnPropertyDescriptors({
    dgFinish:()=>{if(!netDgRun())return false;return !!netInR('dg',()=>{const D=S.dg;S.enemies=[];D.queue=[];for(const r of D.L.rooms)r.state='clear';const br=D.L.rooms[D.L.rooms.length-1];dgBossDown({x:br.cx,y:br.cy});return true;});},
    attack:(uid,eid)=>setTask(unitById(uid),{type:'attack',eid}),
    spawnEnemy:(type,x,y,o)=>{const e=makeEnemy(type,x,y,o);S.enemies.push(e);return e.id;},
    get dg(){const D=netDgRun();if(!D)return null;const us=netDgUnits();return {kind:D.kind,party:D.party,units:us.map(u=>u.id),rooms:D.L.rooms.map(r=>r.state),cleared:D.cleared,ex:D.exitP||null,loot:D.loot,net:!!D.net,parked:!!NET.dgPark,live:!!S.dg};},
    dgClientEnd:(silent,m)=>netDgClientEnd(silent,m),
    region:pk=>netRegionOf(pk||NET.pkey),get inv(){return NET.dgInv&&Object.assign({},NET.dgInv);},invAct:netDgInvAct,get regionErr(){return NET.regionErr||null;}}));
    o.net.playersInRegion=r=>netPlayersInRegion(r).map(u=>u.id);}
  return o;};}
// ---- BUG-1（2026-11-10）：成員引導撤離改用「真實時間」收尾 ----
// 原因：成員的引導撤離（net8 NET.dgCh）只在房主的 dgUpdate 裡用遊戲 dt 累加；房主畫面 dt 每幀上限 0.05 秒、低 fps 會變慢，
//   房主開對話框／設定（uiBlock）或暫停時 dgUpdate 完全不跑 → 成員畫面用真實時間跑到 99% 後卡住，等房主模擬補完才回宗門（實測 8～33 秒）。
// 修法：開始時記真實時間 w0；房主網路節拍（netHostTick，Worker 計時、不靠畫面）檢查：真實時間滿 T 秒且沒被打斷（移動指令／掉血）就照 net8 原本的方式離隊。
//   遊戲時間先滿（net8 原路徑）照舊；兩條路徑都先 NET.dgCh.delete，不會重複離隊。
if(typeof netDgChTell==='function'){const _x=netDgChTell;netDgChTell=function(pk,o){try{if(o&&o.st==='start'&&NET.dgCh){const c=NET.dgCh.get(pk);if(c)c.w0=performance.now();}}catch(e){}return _x.apply(this,arguments);};}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&NET.dgCh&&NET.dgCh.size)netDgChWall();}catch(e){console.error('[net] dg channel wall',e);}return r;};}
function netDgChWall(){if(!netDgRun())return;const now=performance.now(),due=[];
  for(const [pk,c] of NET.dgCh){if(c.w0==null){c.w0=now-c.t*1000;continue;}if(now-c.w0>=c.T*1000)due.push(pk);}
  if(!due.length)return;
  netInR('dg',()=>{for(const pk of due){const c=NET.dgCh.get(pk),a=netAvatarOf(pk);
    if(!c||!S.dg||!a||a.dead||!S.units.includes(a)||c.mv||a.hp<c.hp-0.5)continue; // 打斷／失效交給 net8 的 dgUpdate 處理
    NET.dgCh.delete(pk);netLog('dg channel done',pk,'wall');netDgChTell(pk,{st:'done'},'撤離！');netDgLeave(a,'retreat');}});}
// ---- BUG-E（2026-11-10）：成員引導撤離被「靜默」取消（倒下／觀戰、隕落、傳送陣、斷線、副本結束）→ 通知成員；成員端保底清掉 ----
// 房主 ①：成員化身離開副本時，引導若還在 NET.dgCh → 刪掉並送取消（撤離完成路徑會先刪，不會誤送）
{const _x=netDgLeaveNow;netDgLeaveNow=function(u,why){const pk=u&&u.np;const had=!!(pk&&NET.dgCh&&NET.dgCh.has(pk));const r=_x.apply(this,arguments);
  if(had&&NET.dgCh.has(pk)){NET.dgCh.delete(pk);netLog('dg channel cancel',pk,why);if(why!=='gone')netDgChTell(pk,{st:'cancel'});}return r;};}
// 房主 ②：節拍保底（副本已結束、化身死亡或不在副本）→ 刪掉並送取消
function netDgChSweep(){const D=netDgRun(),us=D?netDgUnits():[];
  for(const [pk,c] of [...NET.dgCh]){const a=us.find(u=>u.np===pk);if(D&&a&&!a.dead)continue; // 副本停放時化身在 dgPark 的單位列，不能用 netAvatarOf
    NET.dgCh.delete(pk);netLog('dg channel cancel',pk,'gone/out');netDgChTell(pk,{st:'cancel'});}}
{const _x=netHostTick;netHostTick=function(){const r=_x.apply(this,arguments);try{if(NET.role==='host'&&NET.dgCh&&NET.dgCh.size)netDgChSweep();}catch(e){console.error('[net] dg channel sweep',e);}return r;};}
// 成員端保底：倒下面板、回到宗門、副本結束、重新進副本 → 清掉自己的撤離進度
if(typeof netDownShow==='function'){const _x=netDownShow;netDownShow=function(){if(NET.role==='client')NET.myCh=null;return _x.apply(this,arguments);};}
{const _x=netDgClientEnd;netDgClientEnd=function(){NET.myCh=null;return _x.apply(this,arguments);};}
{const _x=netDgClientStart;netDgClientStart=function(){NET.myCh=null;return _x.apply(this,arguments);};}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='dgout')NET.myCh=null;return _x.apply(this,arguments);};}
