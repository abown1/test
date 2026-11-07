// ================== v0.5 聯機：房主權威同步（net2_sync.js）==================
// 房主跑完整模擬；成員只顯示房主的狀態（插值），操作以「意圖」送給房主執行。
// 只用包裝覆寫（wrap-override），不改 g*.js。頂層不可碰 g7 的 const（$、HINTS…）。
const NET_MAX=16,NET_HZ=5,NET_KEY_EVERY=150,NET_SLOW_EVERY=5,NET_WORLD_SEC=60,NET_PROTO=2;
// 斷線重連：房主保留斷線者的名額 NET_GRACE 秒（角色本身永遠留在世界裡）；成員以指數退避重試 NET_RECONN_MAX 次
const NET_Q=(()=>{try{return new URLSearchParams(location.search);}catch(e){return new URLSearchParams('');}})();
let NET_GRACE=Math.max(2,+NET_Q.get('netgrace')||60),NET_SILENT_HOST=Math.max(2000,+NET_Q.get('netsilent')||9000);const NET_SILENT_CLIENT=6000,NET_HB=2000,NET_RECONN_MAX=6;
const NET_LS_PKEY='xianwu_net_pkey',NET_LS_NAME='xianwu_net_name',NET_LS_WORLD='xianwu_net_world_';
const NET={role:null,tr:null,code:null,pkey:null,name:'',players:new Map(),cid2pk:new Map(),last:{u:new Map(),e:new Map()},tick:0,timer:null,worldT:0,
  log:[],stats:{rx:0,tx:0,intents:0,applied:0,st:0,reconn:0,drops:0},hostName:'',wid:null,wv:0,capture:null,onChange:null,needT:0};
function netLog(...a){const s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');NET.log.push(s);if(NET.log.length>300)NET.log.shift();console.log('[net] '+s);}
function netChanged(){if(NET.onChange)try{NET.onChange();}catch(e){console.error(e);}}
const NET_SIM={busy:{}}; // 測試用：NET_SIM.busy[房間碼]=n → 前 n 次開房模擬 unavailable-id
const NET_CODE_RETRY=[800,1600,3200];
function netCodeFor(wid,code){const k='xw_net_code_'+wid;try{if(code){localStorage.setItem(k,code);return code;}const v=localStorage.getItem(k);return v&&/^[A-HJ-NP-Z2-9]{5}$/.test(v)?v:null;}catch(e){return null;}}
// 房間碼正規化：全形→半形、去掉空白與 -、轉大寫；房間碼不會有 I O 0 1（容易看錯）→ 直接說清楚
function netNormCode(c){return String(c||'').normalize('NFKC').replace(/[\s\-_.]/g,'').toUpperCase();}
function netRandCode(n){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';const r=new Uint32Array(n);crypto.getRandomValues(r);for(let k=0;k<n;k++)s+=A[r[k]%A.length];return s;}
function netPkey(){if(NET.pkey)return NET.pkey;let k=null;try{const q=/[?&]pk=([A-Za-z0-9_-]{3,40})/.exec(location.search);k=q?q[1]:localStorage.getItem(NET_LS_PKEY);}catch(e){} // ?pk= 只供測試（同一瀏覽器開兩個身分）
  if(!k){k='p'+netRandCode(10).toLowerCase();try{localStorage.setItem(NET_LS_PKEY,k);}catch(e){}}return NET.pkey=k;}
function netName(){if(NET.name)return NET.name;let n='';try{n=localStorage.getItem(NET_LS_NAME)||'';}catch(e){}return NET.name=n||('道友'+netRandCode(3));}
function netSetName(n){NET.name=(n||'').trim().slice(0,12)||netName();try{localStorage.setItem(NET_LS_NAME,NET.name);}catch(e){}}
const netR2=v=>typeof v==='number'?Math.round(v*100)/100:v;
// 即時同步欄位（其餘欄位靠完整快照／世界副本）
const NET_LIVE_U=['x','y','hp','maxhp','dead','job','jobRes','jobB','realm','sub','xiu','inside','inB','carry','medit','faceT','anim','hunger','mood','name','thought','atk','speed','shield','np','kind','body','lg','eq','holdAt','gb','tox','gq','gqMax','gqT','gqCd'];
const NET_LIVE_E=['x','y','hp','maxhp','dead','realm','faceT','anim','name','type','dgName','enr','atk','gq','gqMax','gqT','gqCd'];
function netLive(o,keys){const r={};for(const k of keys){const v=o[k];if(v===undefined)continue;r[k]=(k==='x'||k==='y')?netR2(v):v;}return r;}
function netDiff(map,id,cur,all){const prev=map.get(id),d={id};let any=false;const ser={};
  for(const k in cur){const s=typeof cur[k]==='object'?JSON.stringify(cur[k]):cur[k];ser[k]=s;if(all||!prev||prev[k]!==s){d[k]=cur[k];any=true;}}
  if(prev)for(const k in prev)if(!(k in cur)){d[k]=null;any=true;}
  map.set(id,ser);return any?d:null;}
// ---------- 化身（每位成員自己的角色）：宗門裡的特殊單位，帶 np＝玩家金鑰 ----------
function netAvatarOf(pk){for(const u of S.units)if(u.np===pk)return u;if(S.dg&&S.dg.W&&S.dg.W.units)for(const u of S.dg.W.units)if(u.np===pk)return u;
  if(typeof netParkUnits==='function')for(const u of netParkUnits())if(u.np===pk)return u;return null;} // 副本中：留在宗門的化身在 W.units
function netAvatarAnywhere(pk){let u=netAvatarOf(pk);if(u)return u;
  const lists=[S&&S.units,S&&S.dg&&S.dg.W&&S.dg.W.units,typeof netDgUnits==='function'?netDgUnits():null,typeof netOwUnits==='function'?netOwUnits():null,NET.dgPark&&NET.dgPark.R&&NET.dgPark.R.units];
  for(const L of lists){if(!L)continue;for(const x of L)if(x&&x.np===pk)return x;}return null;}
function netSnapEnsureAv(pk,snap){if(!snap||!pk)return snap;const a=netAvatarAnywhere(pk);if(!a)return snap;
  if(!snap.units)snap.units=[];let o=snap.units.find(u=>u.id===a.id);
  if(!o){o=(typeof pickKeys==='function'&&typeof UNIT_KEEP!=='undefined')?pickKeys(a,UNIT_KEEP):{id:a.id,kind:a.kind,name:a.name,x:a.x,y:a.y,body:a.body};if(a.dgSave){o.x=a.dgSave.x;o.y=a.dgSave.y;}snap.units.push(o);}
  o.np=pk;snap.net05=snap.net05||{av:[],owner:null};snap.net05.av=snap.net05.av||[];if(!snap.net05.av.some(x=>x[0]===a.id||x[1]===pk))snap.net05.av.push([a.id,pk]);return snap;}
if(typeof UNIT_KEEP!=='undefined'&&!UNIT_KEEP.includes('np'))UNIT_KEEP.push('np');
function netEnsureAvatar(pk,name){let u=netAvatarOf(pk);
  if(!u&&S.dg&&S.dg.W){const hp=S.dg.W.units.find(x=>x.kind==='player'),s=hp&&hp.dgSave||{x:N/2,y:N/2};u=makeDisciple(s.x+1,s.y+1,6);u.np=pk;u.loyal=100;S.dg.W.units.push(u);netLog('avatar created (sect, during dungeon)',pk,u.id);}
  if(!u){const c=sectCenter();const f=nearestFree(c.x+1,c.y+2,startComp)||{i:Math.floor(c.x),j:Math.floor(c.y)};u=makeDisciple(f.i+0.5,f.j+0.5,6);u.np=pk;u.loyal=100;S.units.push(u);netLog('avatar created',pk,u.id);}
  u.name=name||u.name;u.holdT=S.time;u.aiJob=null;return u;}
function netCanCtl(u,pk){return !!u&&(u.np===pk||(u.kind==='disciple'&&!u.np));}
// ---------- 包裝覆寫：存檔帶入 化身 與 世界 ID ----------
{const _x=snapshot;snapshot=function(){const d=_x.apply(this,arguments);try{if(!(S.dg&&d.net05)){const av=S.units.filter(u=>u.np).map(u=>[u.id,u.np]);if(S.dg&&S.dg.W&&S.dg.W.units)for(const u of S.dg.W.units)if(u.np&&!av.some(x=>x[0]===u.id))av.push([u.id,u.np]);if(typeof netParkUnits==='function')for(const u of netParkUnits())if(u&&u.np&&!av.some(x=>x[0]===u.id))av.push([u.id,u.np]);d.net05={av,owner:S.flags.netOwner||null};}
  if(d&&d.units){for(const o of d.units){const u=typeof unitById==='function'?unitById(o.id):null;if(u&&u.np)o.np=u.np;}}}catch(e){}return d;};}
{const _x=applySave;applySave=function(d){const r=_x.apply(this,arguments);if(r&&d&&d.net05){for(const [id,pk] of d.net05.av||[]){const u=unitById(id);if(u)u.np=pk;}}return r;};}
// AI 不接手化身；化身不算弟子（不佔名額、不進名冊、不被自動分配）
{const _x=aiEligible;aiEligible=function(u){if(u&&u.np)return false;return _x.apply(this,arguments);};}
{const _x=disciples;disciples=function(){const r=_x.apply(this,arguments);return r.some(u=>u.np)?r.filter(u=>!u.np):r;};}
// 成員端：「主角」＝自己的化身
{const _x=player;player=function(){if(NET.actAs&&NET.role==='host')return NET.actAs;if(NET.role==='client'&&S){const a=netAvatarOf(NET.pkey);if(a)return a;}return _x.apply(this,arguments);};}
// 指令：不能指揮別人的化身；成員端改成送意圖
{const _x=commandMove;commandMove=function(us,tx,ty,sh){us=(us||[]).filter(u=>u&&!(u.np&&u.np!==NET.pkey));
  if(NET.role==='client'){if(us.length){netIntent({a:'move',ids:us.map(u=>u.id),x:tx,y:ty,sh:!!sh});markers.push({x:tx,y:ty,t:0,col:'#7dff7d'});}return;}
  return _x.call(this,us,tx,ty,sh);};NET._cm=(...a)=>_x(...a);}
{const _x=assignJob;assignJob=function(u,job,arg){if(NET.role==='client'){if(!u)return false;netIntent({a:'job',id:u.id,job,arg:arg==null?null:arg});return true;}return _x.apply(this,arguments);};NET._job=(...a)=>_x(...a);}
{const _x=recruit;recruit=function(b){if(NET.role==='client'){if(b)netIntent({a:'recruit',bid:b.id});return;}return _x.apply(this,arguments);};NET._rec=(...a)=>_x(...a);}
{const _x=acceptCand;acceptCand=function(c){if(NET.role==='client'){if(!c)return false;netIntent({a:'cand',cid:c.id});S.cands=S.cands.filter(x=>x!==c);return true;}return _x.apply(this,arguments);};NET._cand=(...a)=>_x(...a);}
{const _x=startUpgrade;startUpgrade=function(b){if(NET.role==='client'){if(b)netIntent({a:'upg',bid:b.id});return true;}return _x.apply(this,arguments);};NET._upg=(...a)=>_x(...a);}
{const _x=tryBreak;tryBreak=function(u){if(NET.role==='client'){if(u)netIntent({a:'break',id:u.id});return false;}return _x.apply(this,arguments);};NET._brk=(...a)=>_x(...a);}
{const _x=ghostOrigin;ghostOrigin=function(){if(NET._g)return NET._g;return _x.apply(this,arguments);};}
{const _x=tryPlace;tryPlace=function(sh){if(NET.role==='client'){const g=ghostOrigin(),type=buildMode;
    if(!placementValid(type,g.i,g.j)){toast('這裡不能建造（被樹木、石頭、水、建築擋住，或離村莊太近／尚未探索）');return;}
    netIntent({a:'place',type,i:g.i,j:g.j,b:selUnits.slice()});toast(`已送出建造「${BUILD[type].name}」給房主`);if(!sh)buildMode=null;return;}
  return _x.apply(this,arguments);};NET._place=(...a)=>_x(...a);}
// 房主執行成員意圖時，把提示訊息轉送給該成員
{const _x=toast;toast=function(msg){if(NET.capture){NET.capture.push(String(msg));return;}return _x.apply(this,arguments);};}
// 主迴圈：成員端不跑模擬，只插值＋特效倒數
{const _x=update;update=function(dt){if(NET.role==='client'&&S&&(!S.dg||NET.dgCoop))return netClientUpdate(dt);return _x.apply(this,arguments);};}
// 副本：有 net5_dungeon.js 時改為組隊副本（netDgCoop）；沒有時，有成員在房間就不開放副本
{const _x=dgEnter;dgEnter=function(){if(NET.role&&typeof netDgCoop==='function')return netDgCoop(_x,arguments);if(NET.role==='client'||(NET.role==='host'&&netMembersOnline()>0)){toast('聯機中暫不開放副本（之後的版本會支援組隊副本）');return false;}return _x.apply(this,arguments);};}
let netVisT=0;
function netClientUpdate(dt){S.time+=dt;const k=1-Math.exp(-12*dt);
  const mv=o=>{if(o._tx==null)return;const dx=o._tx-o.x,dy=o._ty-o.y,dd=Math.hypot(dx,dy);if(dd>4){o.x=o._tx;o.y=o._ty;o.vx=o.vy=0;return;}
    o.x+=dx*k;o.y+=dy*k;o.vx=dt>0?dx*k/dt:0;o.vy=dt>0?dy*k/dt:0;if(dd>0.03){o.walk=(o.walk||0)+dt*1.2;const s=dx-dy;if(Math.abs(s)>0.01)o.faceT=s>0?1:-1;}};
  for(const u of S.units)mv(u);for(const e of S.enemies)mv(e);for(const w of S.wand)mv(w);
  for(const f of effects)f.t+=dt;effects=effects.filter(f=>f.t<f.dur);
  for(const f of floaters)f.t+=dt;floaters=floaters.filter(f=>f.t<1.4);
  for(const m of markers)m.t+=dt;markers=markers.filter(m=>m.t<0.9);
  for(const g of pings)g.t+=dt;pings=pings.filter(g=>g.t<g.dur);
  netVisT+=dt;if(netVisT>=0.25){netVisT=0;let ch=false;for(const u of S.units)if(!u.dead)ch=reveal(u.x,u.y,u.np===NET.pkey?9:6)||ch;for(const b of S.buildings)if(b.built)ch=reveal(b.i+1,b.j+1,5)||ch;if(ch)mmDirty=true;}
}
// ---------- 房主 ----------
function netHostTick(){if(NET.role!=='host'||!S||!NET.tr)return;NET.tick++;
  const now=Date.now();for(const p of [...NET.players.values()]){if(p.host)continue;const a=netAvatarOf(p.pkey);if(a&&!a.task)a.holdT=S.time;
    if(p.online&&now-p.lastRx>NET_SILENT_HOST){const c=p.cid;try{NET.tr.kick(c);}catch(e){}netHostDrop(c,'timeout');}
    else if(!p.online&&now-p.offAt>NET_GRACE*1000){NET.players.delete(p.pkey);if(typeof netDgMemberGone==='function')netDgMemberGone(p.pkey);toast(`${p.name} 的名額已釋出（角色仍留在宗門）`);netLog('grace expired',p.pkey);netBroadcastLobby();netChanged();}}
  netHostSend();
  NET.worldT+=1/NET_HZ;if(NET.worldT>=NET_WORLD_SEC){NET.worldT=0;netShareWorld();}
}
// 送出一份 st（目前「現場」的區域：沒有副本＝宗門；副本進行中由 net5 依區域分別呼叫，收件人＝NET._to）
function netCast(m){if(NET._to){for(const c of NET._to)try{NET.tr.send(c,m);}catch(e){}}else NET.tr.broadcast(m);}
function netHostSend(){
  const all=NET.tick%NET_KEY_EVERY===1,slow=all||NET.tick%NET_SLOW_EVERY===0;
  const m={t:'st',seq:NET.tick,time:netR2(S.time),res:S.res,items:S.items,u:[],nu:[],ru:[],e:[],ne:[],re:[],all};
  const seenU=new Set();for(const u of S.units){seenU.add(u.id);if(!NET.last.u.has(u.id)){const o=pickKeys(u,UNIT_KEEP);if(u.np)o.np=u.np;m.nu.push(o);}const d=netDiff(NET.last.u,u.id,netLive(u,NET_LIVE_U),all);if(d)m.u.push(d);}
  for(const id of [...NET.last.u.keys()])if(!seenU.has(id)){NET.last.u.delete(id);m.ru.push(id);}
  const seenE=new Set();if(!S.dg||NET.dgCoop){for(const e of S.enemies){seenE.add(e.id);if(!NET.last.e.has(e.id))m.ne.push(pickKeys(e,EN_KEEP));const d=netDiff(NET.last.e,e.id,netLive(e,NET_LIVE_E),all);if(d)m.e.push(d);}}
  for(const id of [...NET.last.e.keys()])if(!seenE.has(id)){NET.last.e.delete(id);m.re.push(id);}
  if(slow){if(!S.dg){m.b=S.buildings;m.cands=S.cands.map(c=>pickKeys(c,CAND_KEEP));m.wand=S.wand.map(w=>pickKeys(w,WAND_KEEP));m.nm=S.nodeMods;}
    m.v45={mats:S.mats,pills:S.pills,inv:S.inv};m.dg=S.dg?{kind:S.dg.kind}:null;m.pl=netPlayerList();}
  if(S.dg&&NET.dgCoop)m.dgs=netDgState();
  netCast(m);NET.stats.st++;}
function netHostPlayerU(){const f=u=>u.kind==='player';return S.units.find(f)||(S.dg&&S.dg.W&&S.dg.W.units.find(f))||(typeof netParkUnits==='function'&&netParkUnits().find(f))||null;}
function netPlayerList(){const now=Date.now();return [...NET.players.values()].map(p=>{const o={pk:p.pkey,name:p.name,host:!!p.host,on:!!(p.host||p.online),uid:p.host?(netHostPlayerU()||{}).id:(netAvatarOf(p.pkey)||{}).id};
  if(!o.on&&p.offAt){o.off=Math.max(0,Math.round((now-p.offAt)/1000));o.gr=NET_GRACE;}return o;});}
function netShareWorld(to){if(NET.role!=='host')return;S.flags.netWv=(S.flags.netWv||0)+1;NET.wv=S.flags.netWv;const snap=snapshot();
  const m={t:'world',wid:NET.wid,wv:NET.wv,host:NET.name,snap};netSaveWorld(m.wid,m.wv,snap,NET.name);if(to)NET.tr.send(to,m);else NET.tr.broadcast(m);netLog('world shared v'+NET.wv,to||'all');}
async function netHost(opt){opt=opt||{};if(NET.role)netLeave();netPkey();
  // 重開房前先確實關掉舊的 peer（netLeave 會延遲 200ms 才關，讓 bye 送出去）：這裡等 bye 送出後立刻 destroy，再給配對伺服器一點時間釋放 ID
  if(NET._oldTr){const o=NET._oldTr;NET._oldTr=null;await new Promise(r=>setTimeout(r,150));try{o.close();}catch(e){}await new Promise(r=>setTimeout(r,o.closeGrace||60));}if(opt.name)netSetName(opt.name);
  // 同一個世界沿用同一個房間碼（localStorage：世界 ID → 上次的房間碼）；被占用（舊分頁／舊連線還沒被伺服器釋放）→ 退避重試，再不行才換新碼
  if(!S.flags.netWid)S.flags.netWid='w'+netRandCode(8).toLowerCase();
  const wid=S.flags.netWid,saved=netCodeFor(wid);let code=opt.code||saved||netRandCode(5),err,tr,same=0,fresh=0;
  for(let k=0;k<8;k++){tr=netMakeTransport(opt.transport);
    try{if(NET_SIM.busy[code]>0){NET_SIM.busy[code]--;throw netErr('unavailable-id','sim');}await tr.host(code);err=null;break;}
    catch(e){err=e;try{tr.close();}catch(_){}if(!e||e.type!=='unavailable-id')break;
      if(code===(opt.code||saved)&&same<NET_CODE_RETRY.length){netLog('room code busy, retry',code,same+1);netStatus&&netStatus(`房間碼 ${code} 還被舊連線占用，${NET_CODE_RETRY[same]/1000} 秒後重試…`);await new Promise(r=>setTimeout(r,NET_CODE_RETRY[same++]));continue;}
      if(opt.code&&!opt.newOk)break;if(fresh++>=3)break;const old=code;code=netRandCode(5);netLog('room code busy, new code',old,'->',code);}}
  if(err){netLog('host failed',String(err&&err.message||err));const e2=err.netType?err:netErr(err.type||'server-error',String(err.message||err));throw e2;}
  netCodeFor(wid,code);
  tr.on('status',st=>{netLog('peer status',st.type,st.retry||'');if(st.type==='online')toast('已重新連上配對伺服器，新成員可以用房間碼加入');else if(st.type==='disconnected'&&st.retry===1)toast('房主與配對伺服器斷線（已加入的成員不受影響），重新連線中…');});
  NET.tr=tr;NET.role='host';NET.code=code;NET.tick=0;NET.last={u:new Map(),e:new Map()};NET.players.clear();NET.cid2pk.clear();
  NET.wid=S.flags.netWid;NET.wv=S.flags.netWv||0;
  const pp=player();if(pp)pp.name=NET.name;S.flags.netOwner=NET.pkey;
  NET.players.set(NET.pkey,{pkey:NET.pkey,name:NET.name,host:true,cid:null,online:true});
  tr.on('msg',(cid,m)=>netHostRx(cid,m));
  tr.on('drop',cid=>netHostDrop(cid,'drop'));
  tr.on('error',e=>netLog('err',String(e&&(e.type||e.message)||e)));
  netTickerStart();
  netLog('hosting',code,tr.kind,'world',NET.wid);toast(`已建立房間：${code}（把房間碼給朋友）`);netChanged();return code;}
function netBroadcastLobby(){if(NET.role==='host')NET.tr.broadcast({t:'lobby',pl:netPlayerList(),code:NET.code});}
function netHostRx(cid,m){NET.stats.rx++;if(!m||typeof m!=='object')return;
  if(m.t==='hello'){let pk=String(m.pk||cid).slice(0,40);const name=String(m.name||'道友').slice(0,12);
    if(m.proto!==NET_PROTO||m.ver!==XW_VER||!m.bh||m.bh!==netBuildHash()){ // 舊版成員（hello 沒有 bh）一定收不到分段的世界資料 → 也算版本不同
      const hd=netBuildDesc(XW_VER,NET.swc,netBuildHash()),cd=netBuildDesc(m.ver,m.sw,m.bh);
      NET.tr.send(cid,{t:'deny',ver:1,why:`對方版本不同，請強制重新整理（房主 ${hd}；你 ${cd}）`,host:hd,you:cd});setTimeout(()=>NET.tr.kick(cid),300);
      NET.lastDeny={name,host:hd,you:cd};toast(`「${name}」對方版本不同，請強制重新整理（你 ${hd}；對方 ${cd}）`);netLog('version mismatch',name,'host',hd,'member',cd);return;}
    let ex=NET.players.get(pk);if(ex&&ex.host){pk=pk+'-'+String(m.tab||cid).replace(/[^A-Za-z0-9]/g,'').slice(-6);ex=NET.players.get(pk);} // 與房主同一瀏覽器
    const back=!!ex||!!netAvatarOf(pk); // 同一個玩家金鑰＝回來的人：接回原本的角色
    if(ex&&ex.cid&&ex.cid!==cid){NET.cid2pk.delete(ex.cid);try{NET.tr.send(ex.cid,{t:'deny',why:'同一位玩家已從別處重新連線'});NET.tr.kick(ex.cid);}catch(e){}}
    if(NET.players.size>=NET_MAX&&!NET.players.has(pk)){NET.tr.send(cid,{t:'deny',why:`房間已滿（最多 ${NET_MAX} 人）`});setTimeout(()=>NET.tr.kick(cid),300);return;}
    NET.players.set(pk,{pkey:pk,name,cid,host:false,online:true,lastRx:Date.now(),offAt:0,since:ex?ex.since:Date.now()});NET.cid2pk.set(cid,pk);
    const a=netEnsureAvatar(pk,name);
    const mine=(m.worlds||[]).find(w=>w.wid===NET.wid);if(mine&&mine.wv>NET.wv)toast(`${name} 有較新的世界存檔（v${mine.wv} > v${NET.wv}）`);
    S.flags.netWv=(S.flags.netWv||0)+1;NET.wv=S.flags.netWv;const ws=snapshot();netSaveWorld(NET.wid,NET.wv,ws,NET.name);
    const snap=(typeof netViewSnap==='function'&&netViewSnap(pk))||ws; // 副本進行中：給「這位成員所在區域」的畫面（世界存檔仍是完整的 ws）
    NET.tr.send(cid,{t:'welcome',pk,uid:a.id,code:NET.code,wid:NET.wid,wv:NET.wv,host:NET.name,snap,pl:netPlayerList()});
    if(NET.dgCoop&&typeof netDgSendStart==='function')netDgSendStart(cid,pk); // 副本進行中：在隊伍中（或觀戰）的人補送副本開場；在外面的人收到邀請
    if(back){NET.stats.reconn++;toast(`${name} 回來了（${NET.players.size}/${NET_MAX}）`);netLog('rejoined',pk,name,'avatar',a.id);}else{toast(`${name} 加入了宗門（${NET.players.size}/${NET_MAX}）`);netLog('joined',pk,name,'avatar',a.id);}netBroadcastLobby();netChanged();return;}
  const pk=NET.cid2pk.get(cid);if(!pk)return;const pp=NET.players.get(pk);if(pp)pp.lastRx=Date.now();if(m.t==='hb')return;
  if(m.t==='leave'){NET.cid2pk.delete(cid);if(pp&&pp.cid===cid){NET.players.delete(pk);if(typeof netDgMemberGone==='function')netDgMemberGone(pk);toast(`${pp.name} 離開了房間`);netLog('left',pk);netBroadcastLobby();netChanged();}return;}
  if(m.t==='in'){NET.stats.intents++;NET.capture=[];let ok=false;try{ok=netApplyIntent(pk,m.i);}catch(e){console.error(e);}const msgs=NET.capture;NET.capture=null;
    if(msgs.length)NET.tr.send(cid,{t:'toast',msgs});netLog('intent',pk,m.i&&m.i.a,ok?'ok':'rejected');return;}
  // #195 成員還在秘境時不要丟「宗門 full」：那份快照不含他的化身，客戶端會先被踢出秘境再缺化身
  if(m.t==='need'){const inDg=typeof netDgRun==='function'&&netDgRun()&&((typeof netRegionOf==='function'&&netRegionOf(pk)==='dg')||(typeof netDgUnits==='function'&&(netDgUnits()||[]).some(u=>u&&u.np===pk)));
    let st=null;if(inDg&&typeof netDgSendStart==='function')try{st=netDgSendStart(cid,pk);}catch(e){st=null;}
    try{netLog('need',pk,'inDg',!!inDg,'st',st,'region',typeof netRegionOf==='function'?netRegionOf(pk):'?');}catch(e){}
    // 人確實在秘境：只補秘境開場（不要額外丟宗門 full，以免把還在跑的人踢出去）。開場沒送出才退回帶化身的宗門快照。
    // 'inv' 不是還原：host 停在宗門時 netRegionOf 可能判成 ow，邀請卡補不回被清掉的化身（#195c）。
    if(inDg&&(st==='sent'||st==='queued'||st==='full'||st===true))return;
    const snap=netSnapEnsureAv(pk,(typeof netViewSnap==='function'&&netViewSnap(pk))||snapshot());
    NET.tr.send(cid,{t:'full',snap});return;}
  if(m.t==='chat'){NET.tr.broadcast({t:'chat',from:NET.players.get(pk).name,s:String(m.s||'').slice(0,120)});return;}
}
// 意圖在「該成員角色所在的區域」執行（副本進行中，宗門與副本是兩個區域；net5 的 netIntentRegion／netInR）
function netApplyIntent(pk,i){if(!i||!S)return false;
  if(NET.role==='host'&&typeof netIntentRegion==='function'){const r=netIntentRegion(pk,i);if(r)return netInR(r,()=>netApplyIntent0(pk,i));}
  return netApplyIntent0(pk,i);}
function netApplyIntent0(pk,i){const U=id=>unitById(+id);
  switch(i.a){
    case 'name':{const p=NET.players.get(pk);const n=String(i.n||'').trim().slice(0,12);if(!p||!n)return false;p.name=n;const a=netAvatarOf(pk);if(a)a.name=n;netLog('rename',pk,n);netBroadcastLobby();netChanged();return true;}
    case 'call':return netApplyCall(pk,i);
    case 'sell':return netApplySell(pk,i);
    case 'dg':case 'dgleave':case 'dgjoin':case 'dgspec':case 'dgspecx':return NET.dgCoop?netApplyDg(pk,i):false;
    case 'atk':return NET.dgCoop?netApplyAtk(pk,i):false;
    case 'move':{if(NET.dgCh&&NET.dgCh.has(pk)){const a=netAvatarOf(pk);if(a&&(i.ids||[]).map(Number).includes(a.id))NET.dgCh.get(pk).mv=true;} // 引導撤離中下移動指令＝打斷
      const us=(i.ids||[]).map(U).filter(u=>netCanCtl(u,pk)&&!u.dead);if(!us.length||!isFinite(i.x)||!isFinite(i.y))return false;NET._cm(us,+i.x,+i.y,!!i.sh);NET.stats.applied++;return true;}
    case 'job':{const u=U(i.id);if(!netCanCtl(u,pk)||u.np)return false;const r=NET._job(u,String(i.job||''),i.arg);NET.stats.applied++;return r;}
    case 'recruit':{const b=bById(+i.bid);if(!b)return false;NET._rec(b);NET.stats.applied++;return true;}
    case 'cand':{const c=S.cands.find(c=>c.id===+i.cid);if(!c)return false;const r=NET._cand(c);NET.stats.applied++;return r;}
    case 'upg':{const b=bById(+i.bid);if(!b)return false;const r=NET._upg(b);NET.stats.applied++;return r;}
    case 'break':{const u=U(i.id);if(!netCanCtl(u,pk))return false;const r=NET._brk(u);NET.stats.applied++;return r;}
    case 'place':{if(!BUILD[i.type])return false;const sv={bm:buildMode,sel:selUnits};
      try{buildMode=i.type;NET._g={i:+i.i,j:+i.j};selUnits=(i.b||[]).map(U).filter(u=>netCanCtl(u,pk)).map(u=>u.id);if(!selUnits.length){const a=netAvatarOf(pk);if(a)selUnits=[a.id];}
        const n=S.buildings.length;NET._place(false);NET.stats.applied++;return S.buildings.length>n;}
      finally{NET._g=null;buildMode=sv.bm;selUnits=sv.sel;}}
  }return false;}
// ---------- 成員 ----------
function netIntent(i){if(NET.role!=='client')return;if(!NET.tr||!NET.welcomed){if(performance.now()-(NET._offT||0)>3000){NET._offT=performance.now();toast('與房主連線中斷，操作未送出（重新連線中…）');}return;}NET.tr.send('host',{t:'in',i});NET.stats.tx++;}
async function netJoin(code,opt){opt=opt||{};code=netNormCode(code);if(!/^[A-Z0-9]{4,8}$/.test(code))throw netErr('invalid-id');
  if(/[IO01]/.test(code))throw Object.assign(new Error('房間碼不會有 I、O、0、1，請再確認（容易看錯的字已排除）'),{netType:'confusable'});
  if(NET.role)netLeave();netPkey();if(opt.name)netSetName(opt.name);
  const tr=netMakeTransport(opt.transport);tr.on('ice',st=>{const L=NET.load;if(L&&!L.done){L.ice=st;if(typeof netLoadUi==='function')netLoadUi();}});await tr.join(code);
  NET.trKind=opt.transport||null;NET.role='client';NET.code=code;NET.welcomed=false;NET.reconn=null;netTickerStart();
  return netClientHello(tr,15000);}
// ---------- 版本識別：XW_VER 只到 0.4.6（d／f 同號），所以另外帶「本頁遊戲程式碼雜湊」＋ Service Worker 快取名（例 xianwu-v0.4.6f） ----------
// 雜湊＝本頁最大那段內嵌 <script>（整個遊戲）FNV-1a；同一份程式碼＝同一個值，舊分頁沒重新整理就會不同。快取名只用來顯示。
function netBuildHash(){if(NET.bh)return NET.bh;const t=netQS('netbuild');if(t)return NET.bh=t; // netbuild=：測試用，假裝成別的版本
  let big='';for(const sc of document.scripts)if(!sc.src&&sc.text.length>big.length)big=sc.text;return NET.bh=big?hashStr(big):'?';}
NET.swc='';try{if(window.caches&&caches.keys)caches.keys().then(ks=>{NET.swc=ks.filter(k=>/xianwu/i.test(k)).join('+');}).catch(()=>{});}catch(e){}
function netBuildDesc(ver,swc,bh){return `v${ver||'?'}${swc?' / '+swc:''}${bh?' #'+String(bh).slice(0,6):'（舊版，無分段傳輸）'}`;}
// #193 每個分頁一個固定 id（sessionStorage：重新整理、重連都不變）。成員與房主同一瀏覽器時用它當金鑰後綴，不再用每次都不同的連線 id → 重新整理後接回原本的化身，不會留下「離線修煉中」的舊化身
function netTabId(){try{let t=sessionStorage.getItem('xw_net_tab');if(!t){t='t'+netRandCode(8).toLowerCase();sessionStorage.setItem('xw_net_tab',t);}return t;}catch(e){return NET._tab||(NET._tab='t'+netRandCode(8).toLowerCase());}}
function netHelloMsg(){return {t:'hello',proto:NET_PROTO,ver:XW_VER,bh:netBuildHash(),sw:NET.swc||'',pk:NET.pkey,tab:netTabId(),name:netName(),worlds:netListWorlds().map(w=>({wid:w.wid,wv:w.wv}))};}
function netClientHello(tr,ms){NET.tr=tr;NET.lastRx=Date.now();NET.hbT=0;
  const bump=()=>{if(NET._joinWait&&NET._joinWait.bump)NET._joinWait.bump();};
  tr.on('msg',(id,m)=>{if(NET.tr===tr){bump();netClientRx(m);}});
  // 大訊息（世界快照）分段進度 → 「正在載入世界… x%」；分段遺失 → 立即顯示「重新要求」
  tr.on('xcprog',(id,p)=>{if(NET.tr!==tr)return;NET.lastRx=Date.now();bump();netLoadProg(p);});
  tr.on('xcfail',(id,p)=>{if(NET.tr!==tr)return;netLog('chunk lost',p.tt,p.got+'/'+p.n,p.why);netLoadProg(Object.assign({fail:true},p));});
  tr.on('closed',()=>{if(NET.tr===tr)netConnLost('closed');});tr.on('error',e=>netLog('err',String(e&&(e.type||e.message)||e)));
  tr.send('host',netHelloMsg());
  netLog('joining',NET.code,tr.kind);if(!NET._everIn||(typeof titleOpen!=='undefined'&&titleOpen)){if(NET.load&&!NET.load.done){NET.load.phase='load';NET.load.last=Date.now();NET.load.fail=false;NET.load.stalled=false;NET.load.why=null;}else netLoadStart();if(typeof netLoadUi==='function')netLoadUi();}
  // 逾時只在「房主完全沒有任何訊息」時觸發（大快照分段傳輸中每收到一段就重新計時）
  // 若前一次 hello 還在等（例如載入中斷線→自動重連），新的等待接手：取消舊計時，結果一併回報給舊的 Promise
  const prev=NET._joinWait;if(prev&&prev.cancel)prev.cancel();
  return new Promise((ok,no)=>{let t=0;const arm=()=>{clearTimeout(t);t=setTimeout(()=>{if(NET._joinWait!==W)return;NET._joinWait=null;netLoadEnd(false,'房主沒有回應');const e=new Error('房主沒有回應');no(e);if(prev)prev.no(e);},ms);};
    const W={ok:v=>{clearTimeout(t);ok(v);if(prev)prev.ok(v);},no:e=>{clearTimeout(t);no(e);if(prev)prev.no(e);},bump:arm,cancel:()=>clearTimeout(t)};NET._joinWait=W;arm();});}
// ---------- 成員端載入世界：進度、自動進入、手動「進入世界」、逾時「重新要求世界資料」 ----------
const NET_LOAD_STALL=15000,NET_LOAD_AUTO=10000,NET_LOAD_AUTO_MAX=3;
function netLoadStart(ph){NET.load={phase:ph||'load',t0:Date.now(),last:Date.now(),pct:0,hist:[0],done:false,fail:false,stalled:false,retries:0};if(typeof netLoadUi==='function')netLoadUi();}
function netLoadProg(p){const L=NET.load;if(!L||L.done)return;
  if(p.fail){if(p.tt==='welcome'||p.tt==='full'){L.fail=true;L.stalled=true;if(typeof netLoadUi==='function')netLoadUi();}return;}
  if(p.tt!=='welcome'&&p.tt!=='full')return;L.last=Date.now();L.got=true;L.fail=false;L.stalled=false;L.pct=Math.min(99,Math.floor(p.got/p.n*100));if(L.hist[L.hist.length-1]!==L.pct)L.hist.push(L.pct);if(typeof netLoadUi==='function')netLoadUi();}
function netLoadCheck(){const L=NET.load;if(!L||L.done)return;
  // 10 秒沒有任何世界資料（沒有新分段）→ 自動重新要求（最多 3 次；覆蓋層保持顯示）
  if(L.phase==='load'&&!L.fail&&NET.tr&&NET.role==='client'&&Date.now()-L.last>NET_LOAD_AUTO&&(L.autoN||0)<NET_LOAD_AUTO_MAX){L.autoN=(L.autoN||0)+1;netLog('world load auto re-request',L.autoN);netLoadRetry(true);return;}
if(!L.stalled&&Date.now()-L.last>NET_LOAD_STALL){L.stalled=true;netLog('world load stalled',L.pct+'%');if(typeof netLoadUi==='function')netLoadUi();}}
function netLoadRetry(auto){const L=NET.load;if(!NET.tr||NET.role!=='client')return;if(L){if(!auto)L.retries++;L.got=false;L.last=Date.now();L.stalled=false;L.fail=false;L.pct=0;L.hist.push(0);}
  // 還沒拿到 welcome：重送 hello（房主以同一把玩家金鑰接回同一角色並重送 welcome＋快照）；已加入：送 need 要整份快照
  if(!NET.welcomed)NET.tr.send('host',netHelloMsg());else NET.tr.send('host',{t:'need'});netLog('world load retry',NET.welcomed?'need':'hello');if(typeof netLoadUi==='function')netLoadUi();}
function netEnterWorld(){ // 快照已套用：關掉標題、所有選單與連線面板，進到世界
  try{if(typeof titleOpen!=='undefined'&&titleOpen)showTitle(false);}catch(e){console.error('[net] enter title',e);}
  try{if(typeof closeSaves==='function')closeSaves();}catch(e){}
  try{if(typeof closeOverlays==='function')closeOverlays();}catch(e){}
  try{if(typeof netTogglePanel==='function')netTogglePanel(false);}catch(e){}
  try{if(typeof resize==='function')resize();}catch(e){}
  const L=NET.load;if(L){L.entered=true;}}
function netLoadEnd(okd,why){const L=NET.load;if(!L||L.done)return;if(okd){L.done=true;L.pct=100;L.hist.push(100);L.ms=Date.now()-L.t0;let fine=true;try{netEnterWorld();}catch(e){fine=false;console.error('[net] auto-enter',e);}L.auto=fine;}
  else{L.fail=true;L.stalled=true;L.why=why;}if(typeof netLoadUi==='function')netLoadUi();}
// ---------- 斷線重連（成員端）：心跳逾時或傳輸關閉 → 指數退避重試，同一房間碼＋同一玩家金鑰 → 拿回同一個角色 ----------
function netConnLost(why){if(NET.role!=='client'||NET.reconn)return;const tr=NET.tr;NET.tr=null;NET.welcomed=false;NET.stats.drops++;
  if(tr)try{tr.close();}catch(e){}
  NET.reconn={n:0,t0:Date.now(),why};netLog('connection lost',why);toast('與房主斷線，自動重新連線中…');netReconnSchedule();netChanged();}
function netReconnSchedule(){const R=NET.reconn;if(!R)return;const d=Math.min(16000,1000*Math.pow(2,R.n))*(0.75+Math.random()*0.5);R.next=Date.now()+d;R.timer=setTimeout(netReconnTry,d);}
async function netReconnTry(){const R=NET.reconn;if(!R||NET.role!=='client')return;R.n++;netLog('reconnect try',R.n);netChanged();
  try{const tr=netMakeTransport(NET.trKind);await tr.join(NET.code);if(NET.reconn!==R){tr.close();return;}
    await netClientHello(tr,8000);if(NET.reconn!==R)return;
    NET.reconn=null;NET.stats.reconn++;netLog('reconnected after',R.n,'tries',Date.now()-R.t0,'ms avatar',(netAvatarOf(NET.pkey)||{}).id);toast('已重新連上房主');netChanged();}
  catch(e){netLog('reconnect failed',String(e&&e.message||e));if(NET.reconn!==R)return;if(NET.tr){try{NET.tr.close();}catch(_){}NET.tr=null;}
    if(R.n>=NET_RECONN_MAX){NET.reconn=null;netLog('giving up reconnect');NET.role='client';netHostLost();return;}netReconnSchedule();}}
function netClientPulse(){if(!NET.tr)return;const now=Date.now();
  if(now-NET.hbT>=NET_HB){NET.hbT=now;NET.tr.send('host',{t:'hb'});} // 載入大快照期間（尚未 welcome）也送心跳，房主才不會在 10 秒後把人踢掉
  if(!NET.welcomed)return;
  if(now-NET.lastRx>NET_SILENT_CLIENT)netConnLost('silent '+(now-NET.lastRx)+'ms');}
function netHostDrop(cid,why){const pk=NET.cid2pk.get(cid);NET.cid2pk.delete(cid);const p=pk&&NET.players.get(pk);if(!p||p.cid!==cid)return;
  p.online=false;p.cid=null;p.offAt=Date.now();toast(`${p.name} 斷線了（保留名額 ${NET_GRACE} 秒，角色留在原地）`);netLog('dropped',pk,why);
  netBroadcastLobby();netChanged();}
// ---------- 房主在背景分頁（最小防護）----------
// 計時來源用 Dedicated Worker（背景分頁的主執行緒計時器會被節流到每秒～每分鐘一次），讓同步訊息與心跳持續送出，
// 成員不會誤判斷線。注意：瀏覽器在背景分頁停止 requestAnimationFrame，所以房主切走時「模擬會暫停」（與單機相同），
// 成員會收到提示。背景照常模擬（Worker 計時、固定步長）與手機主機轉移見 net16_hostbg.js（#184）。
let netWk=null;
function netTickerStart(){if(NET._tk)return;NET._tk=true;
  try{const b=new Blob(['let t=0;onmessage=e=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(1),e.data);};'],{type:'text/javascript'});
    netWk=new Worker(URL.createObjectURL(b));netWk.onmessage=netPulse;netWk.onerror=()=>{netLog('worker failed → setInterval');netWk=null;if(!NET.timer)NET.timer=setInterval(netPulse,1000/NET_HZ);};netWk.postMessage(Math.round(1000/NET_HZ));NET.tickSrc='worker';}
  catch(e){NET.timer=setInterval(netPulse,1000/NET_HZ);NET.tickSrc='interval';}}
function netTickerStop(){if(netWk){try{netWk.terminate();}catch(e){}netWk=null;}if(NET.timer)clearInterval(NET.timer);NET.timer=null;NET._tk=false;}
function netPulse(){try{if(NET.role==='host'){const now=performance.now();if(now-(NET._lt||0)>=1000/NET_HZ-25){NET._lt=now;netHostTick();}}else if(NET.role==='client')netClientPulse();}catch(e){console.error('[net] pulse',e);}}
function netMembersOnline(){let n=0;for(const p of NET.players.values())if(!p.host&&p.online)n++;return n;}
document.addEventListener('visibilitychange',()=>{if(NET.role!=='host')return;const bg=typeof netBgWant==='function'&&netBgWant(); // v0.4.7 #184：有成員時背景照常模擬（net16）
  netLog(document.hidden?(bg?'host tab hidden: background sim (worker)':'host tab hidden: sim paused, sync+heartbeat continue'):'host tab visible');
  try{NET.tr.broadcast({t:'hv',h:document.hidden,bg});}catch(e){}});
function netClientRx(m){NET.stats.rx++;NET.lastRx=Date.now();if(!m||typeof m!=='object')return;
  switch(m.t){
    case 'welcome':{NET.pkey=m.pk;NET.wid=m.wid;NET.wv=m.wv;NET.hostName=m.host;NET.players.clear();for(const p of m.pl||[])NET.players.set(p.pk,p);
      const re=NET._everIn&&NET._everIn===m.wid;if(S&&S.dg&&typeof netDgClientEnd==='function')netDgClientEnd(true);netLoadSnap(m.snap,re);netSaveWorld(m.wid,m.wv,m.snap,m.host);NET.welcomed=true;NET._everIn=m.wid;
      const a=netAvatarOf(NET.pkey);if(a&&!re){selUnits=[a.id];const q=iso(a.x,a.y);cam.x=q.x;cam.y=q.y;cam.follow=true;}
      if(NET.load&&!NET.load.done)netLoadEnd(true);toast(`已加入 ${m.host} 的宗門（房間 ${m.code}）`);netLog('welcome',m.code,'avatar',m.uid,'units',S.units.length);if(NET._joinWait){NET._joinWait.ok(m.code);NET._joinWait=null;}netChanged();break;}
    case 'deny':toast('無法加入：'+m.why);netLog('denied',m.why);NET._denied=m;if(NET._joinWait){NET._joinWait.no(new Error(m.why));NET._joinWait=null;}NET.reconn=null;netLeave(true);if(m.ver){netLoadStart('deny');NET.load.fail=true;NET.load.why=m.why;if(typeof netLoadUi==='function')netLoadUi();}break;
    case 'hv':netLog('host visibility hidden='+m.h+(m.bg?' (bg sim)':''));toast(m.h?(m.bg?'房主切到背景：世界照常進行':'房主切到其他分頁：遊戲暫停中，房主回來就會繼續'):'房主回到遊戲畫面');break;
    default:if(typeof netClientRxExtra==='function')netClientRxExtra(m);break;
    case 'st':if(NET.welcomed)netApplySt(m);break;
    case 'full':{const pend=NET._pendingOw;const keep=NET.role==='client'&&NET.pkey&&(netAvatarOf(NET.pkey)||null);if(S.dg&&typeof netDgClientEnd==='function')netDgClientEnd(true,pend&&typeof pend==='object'?pend:undefined);NET._pendingOw=null;const keep2=NET.role==='client'&&NET.pkey&&(netAvatarOf(NET.pkey)||null);netLoadSnap(m.snap);let a=NET.role==='client'&&NET.pkey&&netAvatarOf(NET.pkey);if(!a&&NET.role==='client'&&NET.pkey){const src=keep2||keep;const ex=src&&(typeof unitById==='function'?unitById(src.id):null)||(src&&S.units.find(u=>u.id===src.id));
      if(ex){ex.np=NET.pkey;a=ex;netLog('avatar retagged after full',ex.id);}
      else if(src&&!S.units.some(u=>u.id===src.id||u.np===NET.pkey)){src.np=NET.pkey;S.units.push(src);a=src;netLog('avatar kept after full',src.id);}
      else if(NET.tr){try{NET.tr.send('host',{t:'need'});}catch(e){}netLog('avatar missing after full → need');}}
      if(pend&&!S.dg){const why=pend.why;if(why)toast(why==='down'?'你重傷倒下，被傳送回宗門（可在宗門療傷）':why==='spec'?'結束觀戰，回到宗門':why==='gone'?'回到宗門':'你離開了秘境，回到宗門');}
      if(NET.load&&!NET.load.done&&NET.welcomed)netLoadEnd(true);break;}
    case 'world':netSaveWorld(m.wid,m.wv,m.snap,m.host);NET.wv=m.wv;netLog('world copy saved v'+m.wv);netChanged();break;
    case 'lobby':NET.players.clear();for(const p of m.pl||[])NET.players.set(p.pk,p);if(!NET.welcomed&&NET.load&&!NET.load.done){NET.load.acc=true;if(typeof netLoadUi==='function')netLoadUi();}netChanged();break;
    case 'toast':for(const s of m.msgs||[])toast(s);break;
    case 'chat':toast(`${m.from}：${m.s}`);break;
    case 'bye':netHostLost();break;
  }}
function netLoadSnap(snap,keepCam){const sv={x:cam.x,y:cam.y,z:cam.zoom};if(!applySave(snap))return false;afterLoad();resetTransient();if(NET.welcomed||keepCam){cam.x=sv.x;cam.y=sv.y;cam.zoom=sv.z;}return true;}
function netMkUnit(o){return Object.assign(o.kind==='player'?makePlayer(o.x,o.y):makeDisciple(o.x,o.y,o.body||0),o,{path:[],acd:{},shield:0,shieldT:0,task:null});}
function netPatch(o,d){for(const k in d){if(k==='id')continue;if(k==='x'){o._tx=d.x;if(o._ty==null)o._ty=o.y;continue;}if(k==='y'){o._ty=d.y;if(o._tx==null)o._tx=o.x;continue;}if(d[k]===null)delete o[k];else o[k]=d[k];}}
function netApplySt(m){NET.lastSt=m.seq;S.time=m.time;Object.assign(S.res,m.res);if(m.items)Object.assign(S.items,m.items);let miss=false;
  for(const o of m.nu||[]){if(!unitById(o.id))S.units.push(netMkUnit(o));}
  for(const d of m.u||[]){const u=unitById(d.id);if(u)netPatch(u,d);else miss=true;}
  if(m.ru&&m.ru.length){const r=new Set(m.ru);S.units=S.units.filter(u=>!r.has(u.id));}
  if(m.all){const s=new Set(m.u.map(d=>d.id));S.units=S.units.filter(u=>s.has(u.id));}
  for(const o of m.ne||[]){if(!enemyById(o.id))S.enemies.push(Object.assign(makeEnemy(o.type,o.x,o.y),o,{path:[],target:null}));}
  for(const d of m.e||[]){const e=enemyById(d.id);if(e)netPatch(e,d);else miss=true;}
  if(m.re&&m.re.length){const r=new Set(m.re);S.enemies=S.enemies.filter(e=>!r.has(e.id));}
  if(m.all){const s=new Set(m.e.map(d=>d.id));S.enemies=S.enemies.filter(e=>s.has(e.id));}
  if(m.b&&!S.dg){const sig=b=>b.id+':'+b.built+':'+b.broken+':'+b.lv+':'+b.i+':'+b.j;const old=new Map(S.buildings.map(b=>[b.id,sig(b)]));let ch=old.size!==m.b.length;
    for(const b of m.b)if(old.get(b.id)!==sig(b))ch=true;S.buildings=m.b;if(ch){rebuildBlock();for(const b of m.b)chunkDirtyAt(b.i,b.j);mmDirty=true;}}
  if(m.cands&&!S.dg)S.cands=m.cands.map(o=>Object.assign(makeDisciple(o.x,o.y,o.body),o,{kind:'cand',path:[]}));
  if(m.wand&&!S.dg){const old=new Map(S.wand.map(w=>[w.id,w]));S.wand=m.wand.map(o=>{const w=old.get(o.id);if(w){netPatch(w,o);return w;}return Object.assign(makeWanderer(o,o.x,o.y),o,{path:[]});});}
  if(m.nm&&!S.dg){for(const id in m.nm){const n=NODES[+id];if(!n)continue;const a=m.nm[id];if(a<=0&&!n.gone)removeNode(n);else n.amount=a;}S.nodeMods=m.nm;} // TODO：資源再生／移位只靠世界副本重載
  if(m.dgs&&S.dg&&typeof netDgApplyState==='function')netDgApplyState(m.dgs);
  if(m.v45){const v=m.v45;if(v.mats)S.mats=v.mats;if(v.pills)S.pills=v.pills;if(v.inv)S.inv=v.inv;}
  if(m.pl){NET.players.clear();for(const p of m.pl)NET.players.set(p.pk,p);}
  NET.stats.st++;
  if(miss&&performance.now()-NET.needT>3000){NET.needT=performance.now();NET.tr.send('host',{t:'need'});netLog('resync requested');}}
function netHostLost(){if(NET.role!=='client')return;const wid=NET.wid;netLog('host lost');if(NET.reconn&&NET.reconn.timer)clearTimeout(NET.reconn.timer);NET.reconn=null;netTickerStop();if(S&&S.dg&&typeof netDgClientEnd==='function')netDgClientEnd(true);NET.tr=null;NET.role=null;NET.players.clear();
  const w=wid&&netLoadWorldRec(wid);if(w){netClientRestore(w);}
  toast('房主已離線：已載入最新的世界副本（可在「聯機」面板以此世界開房）');netChanged();}
function netLeave(quiet){if(NET.load){NET.load=null;if(typeof netLoadUi==='function')netLoadUi();}const tr=NET.tr;if(NET.role==='host'&&tr){try{netShareWorld();tr.broadcast({t:'bye'});}catch(e){}}else if(NET.role==='client'&&tr){try{tr.send('host',{t:'leave'});}catch(e){}}
  netTickerStop();if(NET.reconn&&NET.reconn.timer)clearTimeout(NET.reconn.timer);NET.reconn=null;const wasClient=NET.role==='client',wid=NET.wid;if(wasClient&&S&&S.dg&&typeof netDgClientEnd==='function')netDgClientEnd(true);NET.role=null;NET.tr=null;NET.players.clear();NET.cid2pk.clear();
  if(tr){NET._oldTr=tr;setTimeout(()=>{if(NET._oldTr===tr)NET._oldTr=null;tr.close();},200);}
  if(wasClient&&!quiet){const w=wid&&netLoadWorldRec(wid);if(w){netClientRestore(w);}}
  if(!quiet)toast('已離開房間');netChanged();}
// ---------- 共享世界副本（類 Grounded：每人都存一份，版本高者為新） ----------
function netSaveWorld(wid,wv,data,host){if(!wid)return false;const rec={wid,wv,at:Date.now(),host:host||'',data};
  try{const k=NET_LS_WORLD+wid;const old=netLoadWorldRec(wid);if(old&&old.wv>wv)return false;localStorage.setItem(k,JSON.stringify(rec));
    const ws=netListWorlds();if(ws.length>3)for(const w of ws.slice(3))localStorage.removeItem(NET_LS_WORLD+w.wid);return true;}catch(e){netLog('world save failed',String(e.message||e));return false;}}
function netLoadWorldRec(wid){try{const s=localStorage.getItem(NET_LS_WORLD+wid);return s?JSON.parse(s):null;}catch(e){return null;}}
function netListWorlds(){const r=[];try{for(let k=0;k<localStorage.length;k++){const key=localStorage.key(k);if(!key||!key.startsWith(NET_LS_WORLD))continue;try{const o=JSON.parse(localStorage.getItem(key));r.push({wid:o.wid,wv:o.wv,at:o.at,host:o.host,size:localStorage.getItem(key).length});}catch(e){}}}catch(e){}return r.sort((a,b)=>b.at-a.at);}
// #14 每位玩家的角色以 pkey 綁定：開別人開過的世界時，原主角還給原主（變成他的化身），我拿回我自己的角色；
// 我在這個世界從沒有角色 → 建一個新的（主角模板），絕不把原主角直接「變成我」。
function netReclaim(){netPkey();const owner=S.flags.netOwner;
  if(owner&&owner!==NET.pkey){const p=S.units.find(u=>u.kind==='player');let me=netAvatarOf(NET.pkey);
    if(p&&p!==me){p.kind='disciple';p.np=owner;p.task=null;p.path=[];p.medit=false;}
    if(!me){const c=p||sectCenter();const f=nearestFree(Math.floor(c.x)+1,Math.floor(c.y)+1,startComp)||{i:Math.floor(c.x),j:Math.floor(c.y)};me=makePlayer(f.i+0.5,f.j+0.5);me.netPar=1;S.units.push(me);netLog('reclaim: new character for',NET.pkey,me.id);}
    me.kind='player';delete me.np;S.units.splice(S.units.indexOf(me),1);S.units.unshift(me);}
  for(const u of S.units)if(u.kind==='player')delete u.np; // 主角永遠是開房者自己
  S.flags.netOwner=NET.pkey;}
// B-74：客人離房／房主斷線後載入本機世界副本時，副本裡的「主角」是房主的角色；照 #14 規則換回自己的角色（房主角色變回他的化身），
// 避免客人拿房主進度繼續玩、存檔。世界副本本身（localStorage）不改。
function netClientRestore(w){if(!applySave(w.data))return false;afterLoad();try{netPkey();netReclaim();const pl=player();if(pl){selUnits=[pl.id];const q=iso(pl.x,pl.y);cam.x=q.x;cam.y=q.y;}}catch(e){netLog('client restore reclaim failed',String(e&&e.message||e));}return true;}
// 以本機副本開房：原房主的「主角」轉成他的化身，我的化身轉成主角
function netAdoptWorld(wid){const w=netLoadWorldRec(wid);if(!w)return false;if(!applySave(w.data))return false;afterLoad();netPkey();
  netReclaim();S.flags.netWv=w.wv;const pl=player();if(pl){selUnits=[pl.id];const q=iso(pl.x,pl.y);cam.x=q.x;cam.y=q.y;}return true;}
async function netHostWorld(wid,opt){if(!netAdoptWorld(wid))throw new Error('找不到世界副本');return netHost(opt);}
addEventListener('beforeunload',()=>{if(NET.role==='host'&&NET.tr)try{NET.tr.broadcast({t:'bye'});}catch(e){}});
// 成員關頁面／關 App：立即告訴房主（leave → 房主馬上從名單移除；當掉或斷網則靠心跳逾時 NET_SILENT_HOST 判斷線）
addEventListener('pagehide',()=>{if(NET.role==='client'&&NET.tr)try{NET.tr.send('host',{t:'leave'});}catch(e){}});
