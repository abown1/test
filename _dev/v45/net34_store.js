// ================== 聯機：宗門倉庫唯一存放（singlestore）房主權威同步（net34_store.js，仙武聯機 2026-11-13）==================
// 契約：/workspace/econ_single_store_1113/API.md §4；協定：NET_XWS_PROTOCOL.md。只用包裝覆寫，不改 g*/econ*/map*/cult*。
// 開關：NET_FLAGS.storeSync 預設 true；?netexp=-storeSync 或 NET34.set(false) 回舊行為。另外 XW_STORE 不存在或 ?singlestore=0（XW_STORE.enabled()===false）時本檔整個不作用。
// 1) 房主每個 st 附 m.store=XW_STORE.snap()，seq 覆寫為 NET.tick（econ 的 net.diff 也做同一件事；有就不重複）。
// 2) 客機：有 m.store 時，先從 m.res 拿掉倉庫管的鍵（六資源＋lingshi），免得過期封包經 setter 寫進倉庫造成閃爍；套完 net20 經濟快照後才 applyHost（舊 seq 丟棄）。
//    seq 倒退超過 NET34_RESET（房主轉移／重開房）視為新房主，重設 hostSeq。
// 3) 客機純扣款請求：NET34.req({op:'pay'|'take'|'transfer',...}) → 意圖 {a:'xwsReq',rid,...}；房主驗證後執行，回 {t:'xwsAck',rid,ok,reason,seq,store}。
//    房主不接受 add（客機不能憑空加資源）；transfer 只接受 from=該成員自己（化身或其弟子 np===pk）的 wallet。rid 去重（重送只回上次結果，不再扣）。
// 4) 房主端直接寫 S.res 的 net 寫入點改走 XW_STORE：net4 netApplySell、net15 vote.ask、net18 netGatherFree（API 失敗時退回原寫法）。
const NET34_RESET=600;
const NET34={on:true,stats:{sent:0,applied:0,stale:0,reset:0,stripped:0,req:0,ack:0,rej:0,dup:0},pend:new Map(),done:new Map(),rate:new Map(),last:null,
  set(v){NET34.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.storeSync=NET34.on;}catch(e){}return NET34.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('storeSync' in NET_FLAGS))NET_FLAGS.storeSync=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='storeSync')NET_FLAGS.storeSync=!t.startsWith('-');
  NET34.on=!!NET_FLAGS.storeSync;}}catch(e){}
const NET34_KEYS=['wood','stone','fiber','food','iron','herb','lingshi'];
function net34On(){try{return NET34.on&&typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.enabled==='function'&&XW_STORE.enabled()&&typeof XW_STORE.snap==='function';}catch(e){return false;}}
function net34Snap(){try{const s=XW_STORE.snap();if(!s)return null;s.seq=NET.tick;return s;}catch(e){return null;}}
// ---- 1) 房主送出 ----
{const _c=netCast;netCast=function(m){try{if(m&&m.t==='st'&&NET.role==='host'&&net34On()&&!m.store){const s=net34Snap();if(s){m.store=s;NET34.stats.sent++;}}}catch(e){}return _c.apply(this,arguments);};}
// ---- 2) 客機套用 ----
function net34ApplyHost(ms){if(!ms||!net34On()||!S||!S.store)return false;const st=S.store;
  if(st.hostSeq!=null&&ms.seq!=null&&ms.seq+NET34_RESET<st.hostSeq){st.hostSeq=null;NET34.stats.reset++;}
  try{if(typeof XW_STORE.rebind==='function')XW_STORE.rebind('netApplySt');}catch(e){}
  const ok=XW_STORE.applyHost(ms);if(ok)NET34.stats.applied++;else NET34.stats.stale++;return ok;}
{const _st=netApplySt;netApplySt=function(m){
  let ms=null;
  try{if(m&&m.store&&NET.role==='client'&&net34On()){ms=m.store;
    if(m.res){const r={};for(const k in m.res)if(NET34_KEYS.indexOf(k)<0)r[k]=m.res[k];m=Object.assign({},m,{res:r});NET34.stats.stripped++;}}}catch(e){ms=null;}
  const r=_st.call(this,m);
  if(ms)try{net34ApplyHost(ms);}catch(e){console.warn('[net34] applyHost',e);}
  return r;};}
// 新房主（welcome）／整份重載（full）：S 已換成快照，hostSeq 自然清空；保險再清一次
{const _x=netClientRx;netClientRx=function(m){const r=_x.apply(this,arguments);try{if(m&&(m.t==='welcome'||m.t==='full')&&S&&S.store)S.store.hostSeq=null;}catch(e){}return r;};}
// ---- 3) 客機請求／房主回覆 ----
function net34Rid(){return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function net34Req(o){o=o||{};if(NET.role!=='client')return {ok:false,reason:'not-client'};if(!net34On())return {ok:false,reason:'off'};
  const op=o.op;if(op!=='pay'&&op!=='take'&&op!=='transfer')return {ok:false,reason:'bad-op'};
  if(op==='pay'&&!XW_STORE.canPay(o.cost))return {ok:false,reason:'insufficient'}; // 本機先擋明顯不夠（房主仍會再驗）
  if(op==='take'&&!(XW_STORE.get(o.key)>=+o.n))return {ok:false,reason:'insufficient'};
  const rid=o.rid||net34Rid(),i={a:'xwsReq',rid,op,reason:String(o.reason||'').slice(0,40)};
  if(op==='pay')i.cost=JSON.stringify(o.cost||{});else{i.key=String(o.key);i.n=+o.n;}
  if(op==='transfer'){i.from=String(o.from);i.to=String(o.to);}
  NET34.pend.set(rid,{t:performance.now(),i,cb:o.cb||null});NET34.stats.req++;netIntent(i);
  return {ok:true,pending:true,rid};}
function net34Valid(pk,i){
  if(typeof i.rid!=='string'||i.rid.length>40)return 'bad-rid';
  const a=netAvatarOf(pk);if(!a)return 'no-avatar';
  if(i.op==='pay'){let c;try{c=JSON.parse(String(i.cost||'{}'));}catch(e){return 'bad-cost';}if(!c||typeof c!=='object'||Array.isArray(c))return 'bad-cost';
    const ks=Object.keys(c);if(!ks.length||ks.length>8)return 'bad-cost';for(const k of ks){const n=+c[k];if(!(n>0)||!Number.isFinite(n)||n>1e12)return 'bad-amount';if(k!=='lingshi'&&XW_STORE.get(k)===undefined)return 'unsupported-key';}
    i._cost=c;return null;}
  const n=+i.n;if(!(n>0)||!Number.isFinite(n)||n>1e12)return 'bad-amount';
  if(XW_STORE.get(i.key)===undefined&&i.op==='take')return 'unsupported-key';
  if(i.op==='take')return null;
  if(i.op==='transfer'){const m=/^wallet:(\d+)$/.exec(String(i.from||''));if(!m)return 'bad-endpoint';const u=unitById(+m[1]);if(!u||!(u===a||u.np===pk))return 'not-own-wallet';
    if(!(i.to==='sect'||/^wallet:\d+$/.test(String(i.to||''))))return 'bad-endpoint';return null;}
  return 'bad-op';}
function net34Host(pk,i){
  const now=performance.now(),R=NET34.rate.get(pk)||{t:now,n:0};if(now-R.t>1000){R.t=now;R.n=0;}R.n++;NET34.rate.set(pk,R);
  const D=NET34.done.get(pk)||new Map();NET34.done.set(pk,D);
  let res;
  if(D.has(i.rid)){res=D.get(i.rid);NET34.stats.dup++;}
  else{
    let why=R.n>20?'rate':(!net34On()?'off':net34Valid(pk,i));
    if(why)res={ok:false,reason:why};
    else{try{const rs=i.op==='pay'?XW_STORE.pay(i._cost,'net:'+(i.reason||'req')):i.op==='take'?XW_STORE.take(i.key,+i.n,'net:'+(i.reason||'req')):XW_STORE.transfer(i.from,i.to,i.key,+i.n,'net:'+(i.reason||'req'));
        res={ok:!!(rs&&rs.ok),reason:rs&&rs.reason||null};}catch(e){res={ok:false,reason:'error'};}}
    D.set(i.rid,res);if(D.size>200)D.delete(D.keys().next().value);
    if(res.ok)NET34.stats.ack++;else NET34.stats.rej++;}
  try{const p=NET.players.get(pk);if(p&&p.cid!=null&&NET.tr)NET.tr.send(p.cid,{t:'xwsAck',rid:i.rid,ok:res.ok,reason:res.reason,seq:NET.tick,store:net34On()?net34Snap():null});}catch(e){}
  return res.ok;}
{const _x=netApplyIntent0;netApplyIntent0=function(pk,i){if(i&&i.a==='xwsReq'){if(NET.role!=='host')return false;return net34Host(pk,i);}return _x.apply(this,arguments);};}
{const _x=netClientRxExtra;netClientRxExtra=function(m){if(m&&m.t==='xwsAck'){NET34.last=m;const P=NET34.pend.get(m.rid);NET34.pend.delete(m.rid);
    if(m.store)try{net34ApplyHost(m.store);}catch(e){}
    if(!m.ok&&P)toast('房主拒絕：'+({insufficient:'靈石或資源不足',rate:'操作太頻繁','not-own-wallet':'只能動用自己的錢包',off:'倉庫同步未開'}[m.reason]||m.reason||'未知原因'));
    if(P&&P.cb)try{P.cb(m);}catch(e){}return;}return _x.apply(this,arguments);};}
// 逾時 8 秒未回覆：清掉並提示（房主不會重複扣：重送同 rid 只回上次結果）
setInterval(()=>{try{const now=performance.now();for(const [rid,P] of NET34.pend)if(now-P.t>8000){NET34.pend.delete(rid);toast('扣款請求逾時（房主未回應）');}}catch(e){}},2000);
// ---- 4) 房主端直接寫入點改走 XW_STORE ----
function net34Add(key,n,why,opt){try{if(net34On()&&NET.role!=='client'){const r=XW_STORE.add(key,n,why,opt);if(r&&r.ok)return true;}}catch(e){}return false;}
// net4_actions.js:42 分解
{const _o=netApplySell;netApplySell=function(pk,i){if(!net34On())return _o.apply(this,arguments);
  const id=+i.id,it=S.inv.find(x=>x.id===id);if(!it)return false;const n=1+it.q;
  if(typeof XW_STORE.invTake==='function'){const t=XW_STORE.invTake(id,'net:sell');if(!t||!t.ok)S.inv=S.inv.filter(x=>x!==it);}else S.inv=S.inv.filter(x=>x!==it);
  if(!net34Add('lingshi',n,'net:sell'))S.res.lingshi+=n;
  toast(`分解 ${itemName(it)}，得靈石 ${n}`);NET.stats.applied++;return true;};}
// net18_y47.js:78 化身採集放下手上的貨
if(typeof netGatherFree==='function'){const _o=netGatherFree;netGatherFree=function(u){if(!net34On()||!u||!u.carry||!(u.carry.amt>0)||NET34_KEYS.indexOf(u.carry.type)<0)return _o.apply(this,arguments);
  if(!net34Add(u.carry.type,u.carry.amt,'net:gather',{nocap:true}))return _o.apply(this,arguments);
  u.carry=null;u.job=null;u.jobRes=null;u.jnode=null;u.aiJob=null;};}
// net15_vote.js:63 測試鉤子 vote.ask ＋ 對外介面
{const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{if(o&&o.net){
    if(o.net.vote&&typeof showChoice==='function')o.net.vote.ask=(t,txt,labels)=>showChoice(t,txt,labels.map((l,k)=>({l,f:()=>{if(!net34Add('lingshi',k+1,'net:vote'))S.res.lingshi+=k+1;return `靈石 +${k+1}`;}})),'宗門');
    o.net.store={on:net34On,set:NET34.set,req:net34Req,stats:()=>Object.assign({},NET34.stats),pend:()=>NET34.pend.size,last:()=>NET34.last,hostSeq:()=>S&&S.store?S.store.hostSeq:null};}}catch(e){}return o;};}
