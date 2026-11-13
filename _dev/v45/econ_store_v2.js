// ================== 宗門倉庫唯一存放（singlestore）— P1：靈石四品＋六資源 ==================
// 依據：使用者 11/13 12:31「倉庫唯一存放功能這次正式版就一起做，可以改存檔結構」；12:37 選定範圍：P1+P2、新舊雙寫、SAVE_VER 不升（7）。
// ④靈石不計總倉上限 ⑥弟子錢包維持私人 ⑦?singlestore=0 期間的變動，重開時以 S.store 為準（不取 max）。
// 預設 ON；?singlestore=0 關閉：不綁定、不遷移，舊欄位照舊；若存檔已有 S.store，讀檔時以它回填舊欄位一次，存檔時由舊欄位回寫 S.store（store 永遠是最後狀態）。
// 唯一來源：S.store.cur 就是 S.econ.vault 那個物件（同一個參照，不是複本），S.res.lingshi 仍由 econ_grade grBindLive 綁到 vault.xia；
//           S.res.wood…herb 改成 enumerable getter/setter，讀寫 S.store.res。舊寫法 S.res.x+=n 照樣生效；JSON 仍是數字（＝雙寫）。
// 不用 Proxy 的理由：econ_grade 的 grTransferLiveVault／GR_LIVE_LINK 以 S.res 物件身分與 lingshi descriptor 驗證，Proxy 會換掉身分讓轉帳全部被拒。
var XWS_RES=['wood','stone','fiber','food','iron','herb'],XWS_CUR=['xia','zhong','shang','ji'],XWS_UNIT={xia:1,zhong:100,shang:10000,ji:1000000};
var XWS={
  on:(function(){try{return new URLSearchParams((typeof location!=='undefined'&&location&&location.search)||'').get('singlestore')!=='0';}catch(e){return true;}})(),
  // 仙凡之門靈石結算（使用者 13:15／13:16 定）：URL ?xfsettle=0 關（＝現狀：失敗也保留靈石、副本靈石照舊由 g13／地圖入帳）；預設開
  xfsettle:(function(){try{const q=new URLSearchParams((typeof location!=='undefined'&&location&&location.search)||'').get('xfsettle');if(q!=null&&/^(0|off|false)$/i.test(q))return false;}catch(e){}return true;})(),
  exitD:null,
  bound:new WeakMap(),raw:new WeakMap(),ls:[],
  stats:{bind:0,adoptRes:0,adoptLs:0,adoptVault:0,why:{},short:0,conflict:0,mig:0,migBad:0,host:0}
};
var XWS_TUNE={xfBackMin:0.1,xfBackMax:1,rand:null}; // 破關退還比例：均勻 [10%,100%]（使用者 13:16 確認）；rand 只給測試注入
var XWS_P2=['mats','pills','items'];
function xwsSafe(n){return Number.isSafeInteger(n)&&n>=0;}
function xwsCurOf(v){const o={};for(const g of XWS_CUR)o[g]=v&&xwsSafe(v[g])?v[g]:0;return o;}
function xwsResOf(r){const o={};for(const k of XWS_RES){const n=r?r[k]:0;o[k]=(typeof n==='number'&&Number.isFinite(n))?n:0;}return o;}
function xwsCurXia(c){let t=0;for(const g of XWS_CUR)t+=(+c[g]||0)*XWS_UNIT[g];return t;}
function xwsClone(o){return o==null?o:JSON.parse(JSON.stringify(o));}
function xwsHasStore(T){return !!(T&&T.store&&typeof T.store==='object'&&T.store.v===1);}
// ---- 遷移（冪等：S.store.mig 存在就跳過；mig.raw 只寫一次）----
// 下品 = max(res.lingshi, vault.xia)（兩者本為同一份下品鏡像，加總會翻倍）；中上極取 vault；六資源取 res；超上限不裁。
function xwsMigrate(T,raw,origin){
  if(!T||!T.res||!T.econ||!T.econ.vault||typeof T.econ.vault!=='object')return null;
  if(xwsHasStore(T)&&T.store.mig)return T.store;
  const v=T.econ.vault,curRes=T.res;
  const r=raw||{res:{lingshi:curRes.lingshi},vault:xwsCurOf(v)};
  const lsCand=[v.xia,curRes.lingshi,r.res&&r.res.lingshi,r.vault&&r.vault.xia].filter(xwsSafe);
  const xia=lsCand.length?Math.max.apply(null,lsCand):0;
  const before={xia,zhong:v.zhong,shang:v.shang,ji:v.ji};
  for(const g of XWS_CUR)if(!xwsSafe(v[g]))v[g]=0;
  v.xia=xia;
  const st=xwsHasStore(T)?T.store:{v:1};
  st.v=1;st.cur=v;st.res=xwsResOf(curRes);st.seq=st.seq||0;
  const bk=T.flags&&Array.isArray(T.flags.grCurrencyBackups)?T.flags.grCurrencyBackups.length:0;
  st.mig={from:'res+vault',ver:1,at:Date.now(),origin:origin||'load',raw:{res:xwsClone(r.res||{}),vault:xwsClone(r.vault||{}),resAll:xwsResOf(curRes),grBackups:bk}};
  T.store=st;
  try{if(T.res.lingshi!==xia)T.res.lingshi=xia;}catch(e){}
  // 守恆自檢（下品等值＋各資源）：不得少、不得翻倍
  const after=xwsCurXia(st.cur),want=xwsCurXia(xwsCurOf(before));
  if(after!==want){XWS.stats.migBad++;try{console.warn('singlestore migrate mismatch',want,after);}catch(e){}}
  XWS.stats.mig++;return st;
}
// ---- 綁定／重新綁定（applySave、xfBagRestore、netApplySt、host 經濟快照、每幀安全網）----
// 規則：S.econ.vault 換了物件（讀檔或房主權威快照）→ 新 vault 即權威，store.cur 改指向它。
//       S.res 換成新的純物件（例如 xfBagRestore 整份覆寫）→ 新物件上的數值是「指派意圖」，先收進 store 再綁 getter。
function xwsBind(why){
  if(!XWS.on||typeof S==='undefined'||!S||!S.res||!S.econ||!S.econ.vault||typeof S.econ.vault!=='object')return false;
  if(!xwsHasStore(S)||!S.store.mig)xwsMigrate(S,null,why==='newGame'?'new-game':'runtime');
  const st=S.store;let ch=false;
  if(st.cur!==S.econ.vault){st.cur=S.econ.vault;XWS.stats.adoptVault++;ch=true;}
  // lingshi：grBindLive 尚未綁上這個 res（純數值）→ 收進 vault.xia 再交給 grSync
  try{const live=typeof GR_LIVE_LINK!=='undefined'&&GR_LIVE_LINK.get(S.res)===S.econ.vault;
    if(!live){const d=Object.getOwnPropertyDescriptor(S.res,'lingshi');if(d&&('value' in d)&&xwsSafe(d.value)&&d.value!==S.econ.vault.xia){S.econ.vault.xia=d.value;XWS.stats.adoptLs++;}
      if(typeof grSync==='function')grSync();ch=true;}}catch(e){try{console.warn('singlestore ls bind',e);}catch(e2){}}
  if(XWS.bound.get(S.res)!==st){
    const res=S.res;
    for(const k of XWS_RES){
      const d=Object.getOwnPropertyDescriptor(res,k);
      if(d&&('value' in d)&&typeof d.value==='number'&&d.value!==st.res[k]){st.res[k]=d.value;XWS.stats.adoptRes++;}
      if(st.res[k]==null)st.res[k]=0;
      Object.defineProperty(res,k,{enumerable:true,configurable:true,get:function(){return st.res[k];},set:function(n){if(typeof n==='number'&&!Number.isFinite(n))return;st.res[k]=n;st.seq++;}});
    }
    XWS.bound.set(res,st);ch=true;
  }
  // P2：S.store.mats/pills/items 就是 S.mats/S.pills/S.items 那個物件（同一參照）；換了物件就改指向（新物件即權威）
  for(const k of XWS_P2){if(!S[k]||typeof S[k]!=='object')S[k]={};if(st[k]!==S[k]){st[k]=S[k];ch=true;}}
  if(!Array.isArray(st.gear)){st.gear=[];ch=true;}
  if(ch){XWS.stats.bind++;XWS.stats.why[why||'?']=(XWS.stats.why[why||'?']||0)+1;}
  return true;
}
function xwsIsBound(){return !!(XWS.on&&typeof S!=='undefined'&&S&&xwsHasStore(S)&&S.store.cur===S.econ.vault&&XWS.bound.get(S.res)===S.store&&(typeof GR_LIVE_LINK==='undefined'||GR_LIVE_LINK.get(S.res)===S.econ.vault)&&XWS_P2.every(k=>S.store[k]===S[k])&&Array.isArray(S.store.gear));}
// =0：S.store 由舊欄位回寫（store 保持最後狀態，重開時以它為準不會丟）
function xwsSyncFromLegacy(T){T=T||S;if(!xwsHasStore(T)||!T.res||!T.econ||!T.econ.vault)return;const st=T.store;st.cur=xwsCurOf(T.econ.vault);st.cur.xia=xwsSafe(T.res.lingshi)?Math.max(T.res.lingshi,st.cur.xia):st.cur.xia;st.res=xwsResOf(T.res);for(const k of XWS_P2)if(T[k]&&typeof T[k]==='object')st[k]=xwsClone(T[k]);st.seq=(st.seq||0)+1;st.off={at:Date.now()};}
function xwsStoreOut(st){const o={v:1,cur:xwsCurOf(st.cur),res:xwsResOf(st.res),seq:st.seq||0,mig:xwsClone(st.mig)||null};if(st.conf)o.conf=xwsClone(st.conf);if(st.off)o.off=xwsClone(st.off);
  // P2 欄位（mats/pills/items/gear）由後續階段加入；未知欄位原樣保留，不丟
  for(const k in st)if(!(k in o)&&k!=='cur'&&k!=='res')o[k]=xwsClone(st[k]);return o;}
// 讀檔：存檔有 S.store → 以它為準（⑦），舊欄位不同時記入 conf（不自動加）；沒有 → 遷移
function xwsAfterLoad(d,raw){
  if(typeof S==='undefined'||!S||!S.res||!S.econ||!S.econ.vault)return;
  const ds=d&&d.store;
  if(ds&&typeof ds==='object'&&ds.v===1&&ds.mig&&ds.cur&&ds.res){
    const st=xwsClone(ds);st.cur=xwsCurOf(ds.cur);st.res=xwsResOf(ds.res);
    const oldV=xwsCurOf(S.econ.vault),oldR=xwsResOf(S.res);oldV.xia=xwsSafe(S.res.lingshi)?Math.max(S.res.lingshi,oldV.xia):oldV.xia;
    const diff=XWS_CUR.some(g=>oldV[g]!==st.cur[g])||XWS_RES.some(k=>oldR[k]!==st.res[k]);
    if(diff){st.conf=(Array.isArray(st.conf)?st.conf:[]).concat([{at:Date.now(),on:XWS.on,legacy:{cur:oldV,res:oldR},store:{cur:xwsCurOf(st.cur),res:xwsResOf(st.res)}}]).slice(-20);XWS.stats.conflict++;}
    // P2：存檔的 store.mats/pills/items 為準（⑦），就地覆寫舊欄位內容；不同時記入 conf
    for(const k of XWS_P2){if(!ds[k]||typeof ds[k]!=='object')continue;if(!S[k]||typeof S[k]!=='object')S[k]={};
      if(JSON.stringify(S[k])!==JSON.stringify(ds[k])){st.conf=(Array.isArray(st.conf)?st.conf:[]).concat([{at:Date.now(),on:XWS.on,p2:k,legacy:xwsClone(S[k])}]).slice(-20);XWS.stats.conflict++;}
      for(const x of Object.keys(S[k]))delete S[k][x];Object.assign(S[k],xwsClone(ds[k]));if(XWS.on)st[k]=S[k];}
    Object.assign(S.econ.vault,st.cur);
    for(const k of XWS_RES){const dsc=Object.getOwnPropertyDescriptor(S.res,k);if(!dsc||('value' in dsc))S.res[k]=st.res[k];}
    try{S.res.lingshi=st.cur.xia;}catch(e){}
    if(XWS.on){st.cur=S.econ.vault;}
    S.store=st;
  }else if(XWS.on){
    // 沒有 mig 的 store（例如 =0 期間 g12 後備建立的 {v:1,gear}）：裝備庫與副本留存池不能丟
    const keep={};if(ds&&typeof ds==='object'){if(Array.isArray(ds.gear))keep.gear=xwsClone(ds.gear);if(ds.xfLeft)keep.xfLeft=xwsCurOf(ds.xfLeft);}
    if(S.store)S.store=null;const st=xwsMigrate(S,raw,'load');if(st)Object.assign(st,keep);}
  if(XWS.on)xwsBind('applySave');
}
// ---- 事件 ----
function xwsEmit(key,delta,reason){if(!xwsHasStore(S))return;const ev={key,delta,reason:reason||'',seq:++S.store.seq};for(const f of XWS.ls.slice())try{f(ev);}catch(e){}return ev;}
// ---- API ----
function xwsKey(key){if(key==='lingshi')return {t:'ls'};if(XWS_CUR.indexOf(key)>=0)return {t:'cur',g:key};if(XWS_RES.indexOf(key)>=0)return {t:'res',k:key};
  key=String(key);let m=/^mat:(.+)$/.exec(key);if(m)return {t:'mat',c:'mats',id:m[1]};m=/^pill:([^:]+):([0-2])$/.exec(key);if(m)return {t:'pill',c:'pills',id:m[1],q:+m[2]};m=/^item:(.+)$/.exec(key);if(m)return {t:'item',c:'items',id:m[1]};
  if(/^(mat|pill|item):/.test(key))return {t:'p2bad'};return {t:'other',k:key};}
function xwsP2Get(K){const o=S&&S[K.c];if(!o)return 0;if(K.t==='pill'){const a=o[K.id];return Array.isArray(a)?(+a[K.q]||0):0;}return +o[K.id]||0;}
function xwsP2Put(K,d){if(!S[K.c]||typeof S[K.c]!=='object')S[K.c]={};const o=S[K.c];if(K.t==='pill'){if(!Array.isArray(o[K.id]))o[K.id]=[0,0,0];o[K.id][K.q]=(+o[K.id][K.q]||0)+d;}else o[K.id]=(+o[K.id]||0)+d;}
function xwsIsP2(K){return K.t==='mat'||K.t==='pill'||K.t==='item';}
function xwsReady(){if(!XWS.on)return false;if(!xwsIsBound())xwsBind('api');return xwsIsBound();}
function xwsGet(key){const K=xwsKey(key);
  if(!XWS.on||!xwsReady()){if(K.t==='ls')return (typeof econBagXia==='function'&&S&&S.econ&&S.econ.vault)?econBagXia(S.econ.vault):(S&&S.res?S.res.lingshi||0:0);if(K.t==='cur')return S&&S.econ&&S.econ.vault?S.econ.vault[K.g]||0:0;if(K.t==='res')return S&&S.res?S.res[K.k]||0:0;if(xwsIsP2(K))return xwsP2Get(K);return undefined;}
  const st=S.store;if(xwsIsP2(K))return xwsP2Get(K);if(K.t==='ls')return xwsCurXia(st.cur);if(K.t==='cur')return st.cur[K.g]||0;if(K.t==='res')return st.res[K.k]||0;return undefined;}
function xwsCap(k){try{if(typeof v53Cap==='function')return v53Cap(k);}catch(e){}return Infinity;}
function xwsAdd(key,n,reason,opt){opt=opt||{};const K=xwsKey(key);n=+n;
  if(!(n>0)||!Number.isFinite(n))return {ok:false,reason:'bad-amount'};
  if(K.t==='p2bad'||K.t==='other')return {ok:false,reason:'unsupported-key'};
  if(!xwsReady())return {ok:false,reason:'off'};
  const st=S.store;
  if(xwsIsP2(K)){if(!Number.isSafeInteger(n))return {ok:false,reason:'bad-amount'};xwsP2Put(K,n);st.seq++;xwsEmit(key,n,reason);return {ok:true,added:n,overflow:0};} // 材料／丹藥／物品無上限
  if(K.t==='ls'||K.t==='cur'){if(!Number.isSafeInteger(n))return {ok:false,reason:'bad-amount'};const g=K.t==='ls'?'xia':K.g;st.cur[g]=(st.cur[g]||0)+n;xwsEmit(g,n,reason);return {ok:true,added:n,overflow:0};} // ④靈石不計上限
  const cap=opt.nocap?Infinity:xwsCap(K.k),have=st.res[K.k]||0,room=Math.max(0,cap-have),add=Math.min(n,room);
  if(add>0){st.res[K.k]=have+add;xwsEmit(K.k,add,reason);}
  return {ok:add>0||n===0,added:add,overflow:n-add};}
function xwsTake(key,n,reason){const K=xwsKey(key);n=+n;
  if(!(n>0)||!Number.isFinite(n))return {ok:false,reason:'bad-amount'};
  if(K.t==='p2bad'||K.t==='other')return {ok:false,reason:'unsupported-key'};
  if(!xwsReady())return {ok:false,reason:'off'};
  const st=S.store;
  if(xwsIsP2(K)){if(!Number.isSafeInteger(n))return {ok:false,reason:'bad-amount'};if(xwsP2Get(K)<n)return {ok:false,reason:'insufficient'};xwsP2Put(K,-n);xwsEmit(key,-n,reason);return {ok:true,took:n};}
  if(K.t==='ls'){if(!Number.isSafeInteger(n))return {ok:false,reason:'bad-amount'};const t=xwsCurOf(st.cur);if(xwsCurXia(t)<n||!econDeductXia(t,n))return {ok:false,reason:'insufficient'};Object.assign(st.cur,t);xwsEmit('lingshi',-n,reason);return {ok:true,took:n,cur:xwsCurOf(st.cur)};}
  if(K.t==='cur'){if(!Number.isSafeInteger(n))return {ok:false,reason:'bad-amount'};if((st.cur[K.g]||0)<n)return {ok:false,reason:'insufficient'};st.cur[K.g]-=n;xwsEmit(K.g,-n,reason);return {ok:true,took:n};}
  if((st.res[K.k]||0)<n)return {ok:false,reason:'insufficient'};st.res[K.k]-=n;xwsEmit(K.k,-n,reason);return {ok:true,took:n};}
// cost：{lingshi:下品等值, xia/zhong/shang/ji:指定品級顆數, wood…herb}；其他鍵（P2 前）沿用舊 canAfford 語意讀 S.res[k]
function xwsCanPay(cost){if(!cost||typeof cost!=='object')return true;
  if(!xwsReady()){for(const k in cost)if((S.res[k]||0)<cost[k])return false;return true;}
  const st=S.store,t=xwsCurOf(st.cur);
  for(const k in cost){const n=+cost[k];if(!(n>0))continue;const K=xwsKey(k);
    if(K.t==='cur'){if(t[K.g]<n)return false;t[K.g]-=n;}}
  for(const k in cost){const n=+cost[k];if(!(n>0))continue;const K=xwsKey(k);
    if(K.t==='ls'){if(xwsCurXia(t)<n)return false;}
    else if(K.t==='res'){if((st.res[K.k]||0)<n)return false;}
    else if(xwsIsP2(K)){if(xwsP2Get(K)<n)return false;}
    else if(K.t==='p2bad')return false;
    else if(K.t!=='cur'){if((S.res[k]||0)<n)return false;}}
  return true;}
function xwsPay(cost,reason){if(!cost||typeof cost!=='object')return {ok:true};
  if(!xwsReady())return {ok:false,reason:'off'};
  if(!xwsCanPay(cost))return {ok:false,reason:'insufficient'};
  const st=S.store,t=xwsCurOf(st.cur);
  for(const k in cost){const n=+cost[k];if(!(n>0))continue;const K=xwsKey(k);if(K.t==='cur')t[K.g]-=n;}
  const ls=+cost.lingshi>0?Math.ceil(+cost.lingshi):0;if(ls>0&&!econDeductXia(t,ls))return {ok:false,reason:'insufficient'};
  Object.assign(st.cur,t);
  for(const k in cost){const n=+cost[k];if(!(n>0))continue;const K=xwsKey(k);
    if(K.t==='res')st.res[K.k]-=n;else if(xwsIsP2(K))xwsP2Put(K,-n);else if(K.t==='other')S.res[k]-=n;}
  xwsEmit('pay',cost,reason);return {ok:true,cur:xwsCurOf(st.cur)};}
// transfer：P1 只支援靈石 sect ↔ wallet:<id>（⑥弟子錢包私人，只能經由 transfer 進出）；其他端點在 P2
function xwsBagFor(end){if(end==='sect'||end==='vault')return {bag:S.econ.vault,unit:null};const m=/^wallet:(.+)$/.exec(String(end||''));if(!m)return null;
  const w=S.econ.wallets&&S.econ.wallets[m[1]];if(!w)return null;const u=(S.units||[]).find(x=>x&&String(x.id)===m[1])||null;return {bag:w,unit:u};}
function xwsTransfer(from,to,key,n,reason){n=+n;if(!xwsReady())return {ok:false,reason:'off'};
  if(key!=='lingshi'&&XWS_CUR.indexOf(key)<0)return {ok:false,reason:'unsupported-key'};
  if(!Number.isSafeInteger(n)||n<=0)return {ok:false,reason:'bad-amount'};
  const A=xwsBagFor(from),B=xwsBagFor(to);if(!A||!B||A.bag===B.bag)return {ok:false,reason:'bad-endpoint'};
  const ta=xwsCurOf(A.bag);
  if(key==='lingshi'){if(xwsCurXia(ta)<n||!econDeductXia(ta,n))return {ok:false,reason:'insufficient'};}
  else{if(ta[key]<n)return {ok:false,reason:'insufficient'};ta[key]-=n;}
  Object.assign(A.bag,ta);
  if(key==='lingshi')B.bag.xia=(B.bag.xia||0)+n;else B.bag[key]=(B.bag[key]||0)+n; // 入帳以下品（或指定品級）記，不向上合成
  for(const E of [A,B])if(E.unit){const d=Object.getOwnPropertyDescriptor(E.unit,'lingshi');if(!d||('value' in d))E.unit.lingshi=econBagXia(E.bag);}
  try{if(typeof econLog==='function')econLog('transfer',{actorId:(A.unit||B.unit||{}).id,xia:key==='lingshi'?n:n*XWS_UNIT[key],note:reason||'store-transfer',from,to});}catch(e){}
  xwsEmit('transfer',{from,to,key,n},reason);return {ok:true};}
function xwsSnap(){if(!xwsHasStore(S)||!S.store.cur||!S.store.res)return null;const o={v:1,cur:xwsCurOf(S.store.cur),res:xwsResOf(S.store.res),seq:S.store.seq||0};o.xfLeft=xwsCurOf(S.store.xfLeft);return o;}
function xwsRestore(s,why){if(!s||!s.cur||!s.res||!xwsReady())return false;const st=S.store;if(why!=='xfBagRestore')Object.assign(st.cur,xwsCurOf(s.cur)); /* 仙凡之門失敗不整倉還原四品（隊長 13:21 定案）；場內靈石由 xfFail 扣出 */for(const k of XWS_RES)st.res[k]=xwsResOf(s.res)[k];xwsEmit('restore',null,why||'restore');return true;}
// 聯機：客機套用房主 store（只有房主寫入；見 diffs/net.diff）
function xwsApplyHost(ms){if(!ms||!ms.cur||!ms.res||!xwsReady())return false;const st=S.store;if(ms.seq!=null&&st.hostSeq!=null&&ms.seq<st.hostSeq)return false;
  Object.assign(st.cur,xwsCurOf(ms.cur));for(const k of XWS_RES)st.res[k]=xwsResOf(ms.res)[k];if(ms.xfLeft&&typeof ms.xfLeft==='object'){const x=xwsCurOf(ms.xfLeft);if(xwsCurXia(x)>0)st.xfLeft=x;else delete st.xfLeft;}if(ms.seq!=null)st.hostSeq=ms.seq;XWS.stats.host++;return true;}
// 聯機客機：公開寫入 API 不在本機記帳（房主權威）；玩家動作照舊由 net4 netFwd 以「動作」層級轉送房主，不轉送原始 add/take（避免客機憑空加資源）
function xwsClient(){try{return typeof NET!=='undefined'&&NET&&NET.role==='client';}catch(e){return false;}}
function xwsGuard(f){return function(){if(xwsClient())return {ok:false,reason:'client-readonly'};return f.apply(this,arguments);};}
var XW_STORE={get:xwsGet,add:xwsGuard(xwsAdd),take:xwsGuard(xwsTake),canPay:xwsCanPay,pay:xwsGuard(xwsPay),transfer:xwsGuard(xwsTransfer),
  on:function(ev,fn){if(typeof ev==='function'){fn=ev;}if(typeof fn==='function')XWS.ls.push(fn);return function(){const i=XWS.ls.indexOf(fn);if(i>=0)XWS.ls.splice(i,1);};},
  rebind:xwsBind,isBound:xwsIsBound,enabled:function(){return XWS.on;},
  inv:function(){return xwsInv();},invCap:function(){return xwsInvCap();},invAdd:xwsGuard(function(it,r){return xwsInvAdd(it,r);}),invTake:xwsGuard(function(id,r){return xwsInvTake(id,r);}),
  gear:function(){return xwsGear();},gearTake:xwsGuard(function(id,r){return xwsGearTake(id,r);}),
  xfSettleOn:function(){return xwsXfSettleOn();},equipSwap:xwsGuard(function(u,id,slot){return xwsEquipSwap(u,id,slot);}),autoGear:function(u,o){return xwsAutoGear(u,o);},autoGearOn:function(){return xwsAgOn();},autoGearPlan:function(u){return xwsAgPlan(u);},xfFail:xwsGuard(function(g,D){return xwsXfFail(g,D);}),xfWin:xwsGuard(function(D){return xwsXfWin(D);}),xfLeft:function(){return xwsXfLeft();},snap:xwsSnap,restore:xwsRestore,applyHost:xwsApplyHost,migrate:xwsMigrate,
  stats:function(){return xwsClone(XWS.stats);},_:XWS};
// ---- 掛點 ----
// 讀檔原值：grCurrencyLoadPlan 會先把下品取 max 寫回兩邊；這裡在它之前留下原值給 mig.raw（只寫一次）
if(typeof grCurrencyLoadPlan==='function'){const _pl=grCurrencyLoadPlan;grCurrencyLoadPlan=function(d){const r=_pl.apply(this,arguments);
  try{if(r&&r.ok&&r.data&&d&&typeof d==='object'){const prev=XWS.raw.get(d);XWS.raw.set(r.data,prev||{res:xwsClone(d.res||{}),vault:d.econ&&d.econ.vault?xwsClone(d.econ.vault):null});}}catch(e){}return r;};}
{const _as=applySave;applySave=function(d){const raw=d&&typeof d==='object'?XWS.raw.get(d)||{res:xwsClone(d.res||{}),vault:d.econ&&d.econ.vault?xwsClone(d.econ.vault):null}:null;
  const r=_as.apply(this,arguments);try{if(r&&typeof S!=='undefined'&&S)xwsAfterLoad(d,raw);}catch(e){try{console.warn('singlestore load',e);}catch(e2){}}return r;};}
{const _ng=newGame;newGame=function(){const r=_ng.apply(this,arguments);try{if(XWS.on&&S){S.store=null;xwsMigrate(S,null,'new-game');xwsBind('newGame');}}catch(e){try{console.warn('singlestore newGame',e);}catch(e2){}}return r;};}
// B1（11-13 發布前 P1）：?singlestore=0 期間存檔不再由舊欄位回寫 S.store（原 xwsSyncFromLegacy 會把關旗期間的花費寫進 store，重開就不是「以 S.store 為準」）。
// 關旗期間 S.store 原樣保存（凍結），舊欄位照舊雙寫；重開時依⑦以 S.store 為準（舊欄位不同只記 conf）。
{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{if(d&&typeof S!=='undefined'&&S&&xwsHasStore(S)){if(XWS.on)xwsBind('snapshot');d.store=xwsStoreOut(S.store);}}catch(e){try{console.warn('singlestore snapshot',e);}catch(e2){}}return d;};}
{const _al=afterLoad;afterLoad=function(){const r=_al.apply(this,arguments);try{xwsBind('afterLoad');}catch(e){}return r;};}
{const _u=updateUI;updateUI=function(){try{if(XWS.on&&S&&!xwsIsBound())xwsBind('ui');}catch(e){}const r=_u.apply(this,arguments);
  try{if(XWS.on&&typeof document!=='undefined'){const b=document.getElementById('r_lsbox');if(b&&S&&S.econ&&S.econ.vault){const t='靈石（宗門倉庫）：下品等值 '+econBagXia(S.econ.vault)+'，不計倉庫上限';if(b.title!==t)b.title=t;b.classList.remove('v53w','v53f');}}}catch(e){}return r;};}
// 仙凡之門入場快照：多存一份 store（四品＋六資源）；還原後重新綁定，並以快照的 store 為準（修 g13:57 整份覆寫拆掉 getter 的分叉）
if(typeof xfBagSnap==='function'){const _s=xfBagSnap;xfBagSnap=function(){const b=_s.apply(this,arguments);try{if(b&&XWS.on&&xwsReady())b.store=xwsSnap();}catch(e){}return b;};}
if(typeof xfBagRestore==='function'){const _r=xfBagRestore;xfBagRestore=function(bag){
  // 仙凡之門失敗不整倉還原四品：四品維持離場當下的值（同時段宗門其他收支都保留），場內靈石另由 xfFail 扣出（隊長 13:21）
  const keep=typeof S!=='undefined'&&S&&S.econ&&S.econ.vault?xwsCurOf(S.econ.vault):null;
  const ok=_r.apply(this,arguments);
  try{if(ok){if(XWS.on){xwsBind('xfBagRestore');if(bag&&bag.store)xwsRestore(bag.store,'xfBagRestore');}
    if(keep){Object.assign(S.econ.vault,keep);try{if(typeof grSync==='function')grSync();}catch(e){}const d=Object.getOwnPropertyDescriptor(S.res,'lingshi');if(d&&('value' in d))S.res.lingshi=keep.xia;}}}catch(e){try{console.warn('singlestore xfBagRestore',e);}catch(e2){}}return ok;};}
// 房主權威經濟快照會換掉 S.econ（新 vault）→ 立即改指向
if(typeof grApplyAuthoritativeEcon==='function'){const _ga=grApplyAuthoritativeEcon;grApplyAuthoritativeEcon=function(){const r=_ga.apply(this,arguments);try{xwsBind('netEcon');}catch(e){}return r;};}
// 建築等 canAfford/pay：ON 時走 XW_STORE（原子、多品找零）；不夠時保留舊行為（舊 pay 不檢查），記 stats.short
{const _c=canAfford;canAfford=function(cost){if(!XWS.on||!xwsReady())return _c.apply(this,arguments);return xwsCanPay(cost);};}
{const _p=pay;pay=function(cost){if(!XWS.on||!xwsReady())return _p.apply(this,arguments);const r=xwsPay(cost,'pay');if(!r.ok){XWS.stats.short++;const x=_p.apply(this,arguments);try{xwsBind('pay-short');}catch(e){}return x;}try{if(typeof grSync==='function')grSync();}catch(e){}};}
// ④靈石不計總倉上限：ON 時 v53 的裁切／滿倉判斷跳過 lingshi（v53Cap 本身不改，金手指與其他資源照舊）
if(typeof v53Clamp==='function'){const _vc=v53Clamp;v53Clamp=function(){if(!XWS.on)return _vc.apply(this,arguments);const cap0=v53Cap;v53Cap=function(k){return k==='lingshi'?Infinity:cap0.apply(this,arguments);};try{return _vc.apply(this,arguments);}finally{v53Cap=cap0;}};}
if(typeof v53Full==='function'){const _vf=v53Full;v53Full=function(k){if(XWS.on&&k==='lingshi')return false;return _vf.apply(this,arguments);};}
if(typeof v53Col==='function'){const _vl=v53Col;v53Col=function(k){if(XWS.on&&k==='lingshi')return '';return _vl.apply(this,arguments);};}
// 聯機客機收到房主 st 後重新綁定（Object.assign 走 setter 已寫進 store；這裡只是保險）；m.store 由 net.diff 送出
function xwsNetHook(){if(typeof netApplySt!=='function'||netApplySt._xws)return false;const _na=netApplySt;netApplySt=function(m){const r=_na.apply(this,arguments);try{if(XWS.on){xwsBind('netApplySt');if(m&&m.store)xwsApplyHost(m.store);}}catch(e){}return r;};netApplySt._xws=1;return true;}
try{setTimeout(xwsNetHook,0);}catch(e){}

// ================== P2：主角行囊與宗門裝備庫 ==================
// S.inv 仍是主角行囊陣列（唯一一份，不另存複本）；S.store.gear 是宗門裝備庫（唯一一份）。行囊滿的新物品送裝備庫（⑤）。
function xwsInvCap(){try{if(typeof econInvCap==='function')return econInvCap(typeof player==='function'?player():null);}catch(e){}return (typeof TUNE!=='undefined'&&TUNE&&TUNE.invCap)||20;}
function xwsInv(){if(typeof S==='undefined'||!S)return [];if(!Array.isArray(S.inv))S.inv=[];return S.inv;}
function xwsGear(){if(typeof S==='undefined'||!S)return [];if(!S.store||typeof S.store!=='object')S.store={v:1};if(!Array.isArray(S.store.gear))S.store.gear=[];return S.store.gear;}
function xwsIdEq(a,b){return a!=null&&b!=null&&String(a)===String(b);}
function xwsInvAdd(it,reason,opt){if(!it||typeof it!=='object')return {ok:false,reason:'bad-item'};if(!XWS.on)return {ok:false,reason:'off'};opt=opt||{};
  const inv=xwsInv(),cap=xwsInvCap()+(opt.extra|0)-xwsMeStacks();
  if(inv.indexOf(it)>=0)return {ok:true,to:'inv',dup:true};
  if(inv.length<cap){inv.push(it);xwsEmit('inv',{add:it.id},reason);return {ok:true,to:'inv'};}
  xwsGear().push(it);xwsEmit('gear',{add:it.id},reason);return {ok:true,to:'gear'};}
function xwsInvTake(id,reason){if(!XWS.on)return {ok:false,reason:'off'};const inv=xwsInv();const i=inv.findIndex(x=>x&&xwsIdEq(x.id,id));if(i<0)return {ok:false,reason:'not-found'};const it=inv.splice(i,1)[0];xwsEmit('inv',{take:id},reason);return {ok:true,item:it};}
function xwsGearTake(id,reason){const g=xwsGear();const i=g.findIndex(x=>x&&xwsIdEq(x.id,id));if(i<0)return {ok:false,reason:'not-found'};const it=g.splice(i,1)[0];xwsEmit('gear',{take:id},reason);return {ok:true,item:it};}
// 換裝臨時欄（使用者 13:21–13:23）：換裝當下行囊上限 +1 放脫下件；換完若仍超出上限，超出的脫下件送裝備庫。
function xwsMeStacks(){try{const p=typeof player==='function'?player():null;const b=p&&p.bagN;let n=0;if(b)for(const k in b)if(b[k]>0)n++;return n;}catch(e){return 0;}} // 主角計數物品格（owner 行囊）與 S.inv 共用容量
function xwsSwapSettle(off,reason){const inv=xwsInv(),cap=xwsInvCap()-xwsMeStacks();const out=[];
  for(const it of (off||[])){if(!it)continue;if(inv.length>cap){const i=inv.indexOf(it);if(i>=0){inv.splice(i,1);xwsGear().push(it);out.push(it);xwsEmit('gear',{add:it.id,swap:1},reason||'swap');}}}
  return out;}

// ================== 仙凡之門靈石結算（使用者 13:15 定、13:16 確認；隊長 13:21 定案）==================
// 旗標：?xfsettle=0 關（現狀）；預設開。開時：
//  · 所有副本成功帶出：D.loot.res.lingshi 由 econ 入倉（地圖 map_dg_loot 只入非靈石）。
//  · 仙凡之門失敗：不整倉還原四品。只把這次場內得到的靈石移入 S.store.xfLeft（四品分開記、多次失敗累積）：
//      vault 部分＝場內已直接入倉的擊殺靈石（econ 追蹤 cultGiveLoot／v48OnKill 的增量，存在 D.xfLsIn）→ 從倉庫扣出；
//      loot 部分＝D.loot.res.lingshi（還沒入倉）→ 直接進池子。同時段宗門其他收支不動。
//  · 仙凡之門破關：池子一次結算，均勻隨機 10%–100% 退還（每品 Math.round），其餘清除，跳提示。
//  · 聯機：只有房主結算（客機呼叫回 client-readonly）；池子隨 snap().xfLeft 同步。
function xwsXfSettleOn(){return !!(XWS.on&&XWS.xfsettle);}
function xfSettleOn(){return xwsXfSettleOn();} // 全域查詢（給地圖 map_dg_loot 偵測）
function xwsXfLeft(){return S&&S.store&&S.store.xfLeft?xwsCurOf(S.store.xfLeft):{xia:0,zhong:0,shang:0,ji:0};}
function xwsLsFmt(c){const N={xia:'下品',zhong:'中品',shang:'上品',ji:'極品'};const a=[];for(const g of XWS_CUR)if(c[g]>0)a.push(N[g]+' '+c[g]);return a.join('、')||'0';}
function xwsToast(t){try{if(typeof toast==='function')toast(t);}catch(e){}}
function xwsXfRun(D){return D||XWS.exitD||(typeof S!=='undefined'&&S?S.dg:null)||null;}
function xwsXfFail(gain,D){if(!xwsXfSettleOn())return {ok:false,reason:'off'};if(!xwsReady())return {ok:false,reason:'off'};
  D=xwsXfRun(D);if(D&&D._xwsXf)return {ok:false,reason:'done'};
  let gv,gl;
  if(gain&&typeof gain==='object'){gv=xwsCurOf(gain.vault||{});gl=xwsSafe(+gain.loot)?+gain.loot:0;}
  else{gv=xwsCurOf(D&&D.xfLsIn);gl=D&&D.loot&&D.loot.res&&xwsSafe(Math.round(+D.loot.res.lingshi||0))?Math.round(+D.loot.res.lingshi||0):0;}
  const v=S.econ.vault,took={xia:0,zhong:0,shang:0,ji:0};let short=0;
  for(const g of ['ji','shang','zhong','xia']){const n=gv[g];if(!(n>0))continue;
    if((v[g]||0)>=n){v[g]-=n;took[g]+=n;continue;}
    // 該品不夠（場內又花掉了）：以下品等值從其他品找零扣，仍不夠就扣到 0 並記 short
    const need=n*XWS_UNIT[g],t=xwsCurOf(v);
    if(xwsCurXia(t)>=need&&econDeductXia(t,need)){Object.assign(v,t);took[g]+=n;}
    else{const have=xwsCurXia(v);short+=need-have;for(const k of XWS_CUR)v[k]=0;took[g]+=Math.floor(have/XWS_UNIT[g]);took.xia+=have%XWS_UNIT[g];}}
  const pool=S.store.xfLeft=xwsCurOf(S.store.xfLeft);
  for(const g of XWS_CUR)pool[g]+=took[g];pool.xia+=gl;
  if(D){D._xwsXf='fail';if(gl&&D.loot&&D.loot.res)delete D.loot.res.lingshi;}
  try{if(typeof grSync==='function')grSync();}catch(e){}
  const moved=xwsCurOf(took);moved.xia+=gl;
  xwsEmit('xfLeft',{fail:moved},'xfFail');
  if(xwsCurXia(moved)>0)xwsToast(`仙凡之門：這次在門內得到的靈石（${xwsLsFmt(moved)}）留在門內，累計 ${xwsLsFmt(pool)}；之後破關可取回 10%～100%`);
  return {ok:true,took:xwsCurOf(took),loot:gl,moved,pool:xwsCurOf(pool),short};}
function xwsXfWin(D){if(!xwsXfSettleOn())return {ok:false,reason:'off'};if(!xwsReady())return {ok:false,reason:'off'};
  D=xwsXfRun(D);if(D&&D._xwsXf)return {ok:false,reason:'done'};if(D)D._xwsXf='win';
  const pool=xwsCurOf(S.store.xfLeft);if(xwsCurXia(pool)<=0){delete S.store.xfLeft;return {ok:true,none:true};}
  const r=typeof XWS_TUNE.rand==='function'?+XWS_TUNE.rand():Math.random();
  const lo=XWS_TUNE.xfBackMin,hi=XWS_TUNE.xfBackMax,pct=lo+(hi-lo)*Math.min(1,Math.max(0,r));
  const back={},gone={};for(const g of XWS_CUR){back[g]=Math.min(pool[g],Math.round(pool[g]*pct));gone[g]=pool[g]-back[g];S.econ.vault[g]=(S.econ.vault[g]||0)+back[g];}
  delete S.store.xfLeft;
  try{if(typeof grSync==='function')grSync();}catch(e){}
  xwsEmit('xfLeft',{win:back,gone,pct},'xfWin');
  xwsToast(`仙凡之門破關：取回留在門內的靈石 ${Math.round(pct*100)}%（${xwsLsFmt(back)}）${xwsCurXia(gone)>0?'，其餘 '+xwsLsFmt(gone)+' 散去':''}`);
  return {ok:true,pct,back,gone};}
// 場內直接入倉的靈石（擊殺）：記在 D.xfLsIn（四品），失敗時只扣這些
function xwsXfWrapGain(f){if(!f||f._xwsGain)return f;const w=function(){const D=typeof S!=='undefined'&&S?S.dg:null;const on=!!(D&&D.kind==='xf'&&S.econ&&S.econ.vault);const x0=on?xwsCurOf(S.econ.vault):null;
  const r=f.apply(this,arguments);if(on)try{const x1=xwsCurOf(S.econ.vault);const g=D.xfLsIn||(D.xfLsIn={xia:0,zhong:0,shang:0,ji:0});for(const k of XWS_CUR){const d=x1[k]-x0[k];if(d>0)g[k]+=d;}}catch(e){}return r;};w._xwsGain=1;return w;}
function xwsXfHook(){let n=0;
  if(typeof cultGiveLoot==='function'&&!cultGiveLoot._xwsGain){cultGiveLoot=xwsXfWrapGain(cultGiveLoot);n++;}
  if(typeof v48OnKill==='function'&&!v48OnKill._xwsGain){v48OnKill=xwsXfWrapGain(v48OnKill);n++;}
  if(typeof dgExit==='function'&&!dgExit._xwsXf){const _dx=dgExit;dgExit=function(keep){
    const D=typeof S!=='undefined'&&S?S.dg:null;const on=!!(D&&xwsXfSettleOn()&&!xwsClient());const fail=!!(D&&D.kind==='xf'&&!D.cleared);let ls=0;
    if(on&&keep&&!fail&&D.loot&&D.loot.res){ls=Math.round(+D.loot.res.lingshi||0);if(ls>0)delete D.loot.res.lingshi;else ls=0;} // 先拿走，g13 原本的迴圈就不會再加（不翻倍）
    const prev=XWS.exitD;XWS.exitD=D;let r;try{r=_dx.apply(this,arguments);}finally{XWS.exitD=prev;}
    try{if(on){if(ls>0){const a=xwsAdd('lingshi',ls,'dgLoot');if(a&&a.ok)xwsToast(`靈石 +${ls}（入宗門倉庫）`);}
      if(fail)xwsXfFail(null,D);else if(D.kind==='xf'&&D.cleared)xwsXfWin(D);}}catch(e){try{console.warn('singlestore xf',e);}catch(e2){}}
    return r;};dgExit._xwsXf=1;n++;}
  return n;}
xwsXfHook();try{setTimeout(xwsXfHook,0);}catch(e){}

// ================== 換裝臨時欄（使用者 13:21–13:23）==================
// equipSwap(u, itemId|null, slot)：主角與弟子共用行囊 S.inv（與 g12 equip 相同）。換裝當下行囊上限 +1 放脫下件；
// 換完若仍超出上限，脫下件送 S.store.gear。itemId=null＝只卸下（同規則：滿了就進裝備庫，不再拒絕）。
function xwsEquipSwap(u,id,slot){if(!XWS.on)return {ok:false,reason:'off'};if(!u||!slot)return {ok:false,reason:'bad-arg'};
  u.eq=u.eq||{};let it=null,from=null;
  if(id!=null){let r=xwsInvTake(id,'swap');if(r.ok){it=r.item;from='inv';}else{r=xwsGearTake(id,'swap');if(r.ok){it=r.item;from='gear';}}
    if(!it)return {ok:false,reason:'not-found'};
    let why='';try{if(typeof canWear==='function')why=canWear(u,it,slot)||'';}catch(e){why='error';}
    if(why){if(from==='inv')xwsInv().push(it);else xwsGear().push(it);return {ok:false,reason:'cannot-wear',why};}}
  const old=u.eq[slot]||null;if(!it&&!old)return {ok:false,reason:'empty'};
  u.eq[slot]=it;let to=null;
  if(old){xwsInv().push(old);to='inv';if(xwsSwapSettle([old],'swap').length)to='gear';} // 臨時欄：先放進行囊（可到上限+1），換完超出就送裝備庫
  try{if(typeof gearApply==='function')gearApply(u);}catch(e){}
  xwsEmit('swap',{u:u.id,slot,on:it&&it.id,off:old&&old.id,to},'equipSwap');
  return {ok:true,on:it,off:old,to,from};}

// ================== 弟子自動換裝（使用者 13:21–13:23）==================
// 旗標 ?autogear=0 關（預設開；須 singlestore 開）。來源只有宗門裝備庫 S.store.gear，換下件回裝備庫。
// 評分＝整套實算，不只比單件：每件主屬取 econGearV2.gradeDetail(it).fin（含 1113 品級倍率與仙器 xianSubMul），
//   加總後乘上 econGearV2.extra({realm,eq}) 的 atkPct/hpPct/defPct（固定次要＋套裝 2/5 件加成，含既有上限 caps），再用 g17 itemScore 權重換成分數。
//   極強單件（econRealmMat.isStrong）最多 ECON_RM_STRONG_MAX_EQUIP 件、且本來就不計套裝件數（setId=0）。
//   候選動作：單欄替換＋「湊套」（同一套在各部位挑最好的一件一起換），每輪取整套分數最高者，直到沒有提升。
// 鎖定：it.lock===true（穿著的那件不會被換掉；放在裝備庫的也不會被拿）、u.gearLock===true（整個人不自動換）或 u.gearLock={slot:true}。
var XWS_AG={on:(function(){try{const q=new URLSearchParams((typeof location!=='undefined'&&location&&location.search)||'').get('autogear');if(q!=null&&/^(0|off|false)$/i.test(q))return false;}catch(e){}return true;})(),t:0,n:0};
function xwsAgOn(){return !!(XWS.on&&XWS_AG.on);}
function xwsAgG(){try{if(typeof econGearV2!=='undefined'&&econGearV2)return econGearV2;}catch(e){}try{if(typeof window!=='undefined'&&window.econGearV2)return window.econGearV2;}catch(e){}return null;}
function xwsAgR(){try{if(typeof econRealmMat!=='undefined'&&econRealmMat)return econRealmMat;}catch(e){}try{if(typeof window!=='undefined'&&window.econRealmMat)return window.econRealmMat;}catch(e){}return null;}
var XWS_AG_FIN=null; // 只在單次 autoGearPlan 內快取；gradeDetail 對同一件不改數值
function xwsAgFin(it){
  if(XWS_AG_FIN&&XWS_AG_FIN.has(it))return XWS_AG_FIN.get(it);
  const G=xwsAgG();
  try{if(G&&G.gradeOn&&G.gradeOn()){const d=G.gradeDetail(it);if(d&&d.fin){if(XWS_AG_FIN)XWS_AG_FIN.set(it,d.fin);return d.fin;}}}catch(e){}
  const f={atk:+it.atk||0,hp:+it.hp||0,def:+it.def||0,spd:+it.spd||0};
  if(XWS_AG_FIN)XWS_AG_FIN.set(it,f);return f;}
function xwsAgSc(o){if(typeof itemScore==='function')return itemScore(o);return (o.atk||0)*2+(o.hp||0)*0.25+(o.def||0)*1.5+(o.spd||0)*15;} // 後備＝g17.js:335 同權重
function xwsAgStrong(it){const R=xwsAgR();try{return !!(R&&R.isStrong&&R.isStrong(it));}catch(e){return false;}}
function xwsAgStrongMax(){try{if(typeof econStrongCapOn==='function'&&!econStrongCapOn())return Infinity;}catch(e){}return typeof ECON_RM_STRONG_MAX_EQUIP==='number'?ECON_RM_STRONG_MAX_EQUIP:Infinity;}
function xwsAgBase(u){const g=u.gb||{};return {atk:Math.max(0,(+u.atk||0)-(+g.atk||0)),hp:Math.max(0,(+u.maxhp||0)-(+g.hp||0)),def:0,spd:Math.max(0,(+u.speed||0)-(+g.spd||0))};}
function xwsAgScore(u,eq,base){const s={atk:base.atk,hp:base.hp,def:base.def,spd:base.spd};let strong=0;
  for(const k in eq){const it=eq[k];if(!it)continue;const f=xwsAgFin(it);s.atk+=+f.atk||0;s.hp+=+f.hp||0;s.def+=+f.def||0;s.spd+=+f.spd||0;if(xwsAgStrong(it))strong++;}
  let p={};const G=xwsAgG();try{if(G&&G.on&&G.on()&&G.extra)p=G.extra({realm:u.realm,eq:eq})||{};}catch(e){}
  return {sc:xwsAgSc({atk:s.atk*(1+(+p.atkPct||0)/100),hp:s.hp*(1+(+p.hpPct||0)/100),def:s.def*(1+(+p.defPct||0)/100),spd:s.spd}),strong};}
function xwsAgSlots(){try{if(typeof econSlot16On==='function'&&econSlot16On()&&typeof ECON_SLOT16_KEYS!=='undefined')return ECON_SLOT16_KEYS.slice();}catch(e){}return ['w','a','c1','c2','f'];}
function xwsAgFits(it,s){if(!it||!it.slot)return false;try{if(typeof econSlot16On==='function'&&econSlot16On()&&typeof econSlot16Fits==='function')return econSlot16Fits(it,s);}catch(e){}return it.slot===(s[0]==='c'?'c':s);}
function xwsAgLocked(u,s){const L=u.gearLock;if(L===true)return true;if(L&&typeof L==='object'&&L[s])return true;const it=u.eq&&u.eq[s];return !!(it&&it.lock===true);}
function xwsAgWear(u,it,s){try{if(typeof canWear==='function'){const w=canWear(u,it,s);if(w&&!/極強/.test(String(w)))return false;}}catch(e){return false;}return true;} // 極強件數由整套計算把關
function xwsAgSetOf(it){const G=xwsAgG();try{const c=G&&G.CAT&&G.CAT[it.t];return c&&c.gv2&&c.gv2.setId?c.gv2.setId:0;}catch(e){return 0;}}
function xwsAgPlan(u){const prevFin=XWS_AG_FIN;XWS_AG_FIN=new Map();try{return xwsAgPlanNow(u);}finally{XWS_AG_FIN=prevFin;}}
function xwsAgPlanNow(u){const pool=xwsGear().filter(it=>it&&it.slot&&!it.rsv&&it.lock!==true&&(it._v171c==null||it._v171c===u.id));
  const slots=xwsAgSlots().filter(s=>!xwsAgLocked(u,s));const base=xwsAgBase(u),mx=xwsAgStrongMax();
  let eq=Object.assign({},u.eq||{});let cur=xwsAgScore(u,eq,base);const sc0=cur.sc;const used=new Set();
  for(let pass=0;pass<24;pass++){let best=null;
    const tryEq=(e2,mv)=>{const r=xwsAgScore(u,e2,base);if(r.strong>mx&&r.strong>cur.strong)return;if(r.sc>cur.sc+1e-6&&(!best||r.sc>best.r.sc+1e-9))best={e2,r,mv};};
    for(const s of slots)for(const it of pool){if(used.has(it)||!xwsAgFits(it,s)||!xwsAgWear(u,it,s))continue;const e2=Object.assign({},eq);e2[s]=it;tryEq(e2,[[s,it]]);}
    const sets={};for(const it of pool){if(used.has(it))continue;const id=xwsAgSetOf(it);if(id)(sets[id]=sets[id]||[]).push(it);}
    for(const id in sets){const e2=Object.assign({},eq),mv=[],taken=new Set();
      for(const s of slots){let b=null,bs=-1;for(const it of sets[id]){if(taken.has(it)||!xwsAgFits(it,s)||!xwsAgWear(u,it,s))continue;const v=xwsAgSc(xwsAgFin(it));if(v>bs){bs=v;b=it;}}
        if(b&&b!==eq[s]){e2[s]=b;mv.push([s,b]);taken.add(b);}}
      if(mv.length>1)tryEq(e2,mv);}
    if(!best)break;for(const m of best.mv)used.add(m[1]);eq=best.e2;cur=best.r;}
  return {eq,sc:cur.sc,sc0,strong:cur.strong};}
function xwsAutoGear(u,opt){opt=opt||{};if(!xwsAgOn())return {ok:false,reason:'off'};if(xwsClient())return {ok:false,reason:'client-readonly'};if(!xwsReady())return {ok:false,reason:'off'};
  if(!u||u.dead)return {ok:false,reason:'bad-unit'};if(u.gearLock===true)return {ok:true,n:0,locked:true};
  const P=xwsAgPlan(u),g=xwsGear(),got=[],off=[];u.eq=u.eq||{};
  for(const s in P.eq){const it=P.eq[s],old=u.eq[s]||null;if(!it||it===old)continue;const i=g.indexOf(it);if(i<0)continue;g.splice(i,1);u.eq[s]=it;if(old){g.push(old);off.push(old);}got.push([s,it]);}
  if(got.length){try{if(typeof gearApply==='function')gearApply(u);}catch(e){}XWS_AG.n++;xwsEmit('gear',{auto:u.id,n:got.length},'autogear');
    if(!opt.quiet)try{const nmF=typeof nm==='function'?nm:(x=>x.name||'弟子'),inF=typeof itemName==='function'?itemName:(x=>x.n||x.t);const msg=nmF(u)+' 從宗門裝備庫換上 '+got.map(x=>inF(x[1])).join('、');if(typeof v171Note==='function')v171Note(msg);else xwsToast(msg);}catch(e){}}
  return {ok:true,n:got.length,got:got.map(x=>({slot:x[0],id:x[1].id})),off:off.map(x=>x.id),sc0:P.sc0,sc:P.sc,strong:P.strong};}
// 節奏沿用 TUNE.v171（tick 秒、每人 cd 秒）；只有房主跑；副本中不跑；一次只處理一名弟子（同 v171Tick）
// B4（11-13 發布前 P1）：原用 g20 v171Busy（任何 task／job 都算忙，給「走去裝備庫」用）；tick 鏈中 AI 先派工，弟子幾乎永遠忙→自動換裝從不發生。
// 自動換裝是從宗門裝備庫直接換（不走路），只擋：死亡、外出（away／mission／expd）、副本中、撤退、正在走 v171 取裝（戰鬥／一般工作中照換：裝備庫即時換裝，不需移動）。
function xwsAgBusy(u){return !u||!!(u.dead||u.away||u.mission||u.expd||u.dgIn||u.retreat||u.v171);}
function xwsAgTick(dt){if(!xwsAgOn()||xwsClient()||typeof S==='undefined'||!S||S.dg)return;const T=(typeof TUNE!=='undefined'&&TUNE&&TUNE.v171)||null;if(!T)return;
  XWS_AG.t+=dt||0;if(XWS_AG.t<T.tick)return;XWS_AG.t=0;if(!xwsGear().length)return;
  for(const u of (S.units||[])){if(!u||u.kind!=='disciple'||u.np||u.dead||u.gearLock===true)continue;if((S.time||0)-(u.agT!=null?u.agT:-1e9)<T.cd)continue;
    if(xwsAgBusy(u))continue;u.agT=S.time||0;xwsAutoGear(u);break;}}
if(typeof tickV045==='function'){const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{xwsAgTick(dt);}catch(e){try{console.warn('autogear',e);}catch(e2){}}return r;};}

// ================== 成員行囊 owner（隊長 13:42 定案）==================
// 入口 XW_STORE.add(key,n,{owner:pid,reason})：owner 是「玩家」（主角或聯機成員化身）時放進該成員自己的行囊；行囊滿 → 宗門倉庫
//（計數物品進 S.store 對應欄，裝備進 S.store.gear）。owner 是弟子或找不到 → 一律宗門倉庫。靈石／六資源不進私囊（照舊宗門）。
// 成員行囊：裝備＝主角 S.inv／其他成員化身 u.gbag；計數物品＝u.bagN={<key>:n}，每種 key 佔 1 格，與裝備共用 econInvCap(u)。
/* 成員（玩家）認定：帶 u.np 的單位一律是玩家 owner（聯機化身可能是 kind:'disciple'，不看 u.avatar），或本機主角 kind==='player' */
function xwsIsMember(x){return !!(x&&((x.np!=null&&x.np!=='')||x.kind==='player'));}
/* 掃的單位列表：S.units；副本中留在宗門的 S.dg.W.units（＝S.owArea.units）；聯機停泊 netParkUnits()（NET._tmpR.units／NET.dgPark.R.units） */
function xwsOwnerLists(){const L=[],add=a=>{if(Array.isArray(a)&&L.indexOf(a)<0)L.push(a);};if(typeof S==='undefined'||!S)return L;
  try{add(S.units);}catch(e){}try{if(S.dg&&S.dg.W)add(S.dg.W.units);}catch(e){}try{if(S.owArea)add(S.owArea.units);}catch(e){}
  try{if(typeof netParkUnits==='function')add(netParkUnits());}catch(e){}return L;}
function xwsOwnerUnit(pid){if(pid==null||typeof S==='undefined'||!S)return null;const P=String(pid),LS=xwsOwnerLists();
  /* N8：pid 先找 u.np===pid 的化身，再找 id===pid 的成員；不被 id 相同的弟子搶走 */
  for(const U of LS){const u=U.find(x=>x&&x.np!=null&&String(x.np)===P);if(u)return u;}
  for(const U of LS){const u=U.find(x=>xwsIsMember(x)&&String(x.id)===P);if(u)return u;}
  return null;}
function xwsOwnerIsMe(u){try{return typeof player==='function'&&player()===u;}catch(e){return false;}}
function xwsOwnerInv(u){if(xwsOwnerIsMe(u))return xwsInv();if(!Array.isArray(u.gbag))u.gbag=[];return u.gbag;}
function xwsOwnerCap(u){try{if(typeof econInvCap==='function')return econInvCap(u);}catch(e){}return (typeof TUNE!=='undefined'&&TUNE&&TUNE.invCap)||20;}
function xwsOwnerUsed(u){const b=u.bagN||{};let n=xwsOwnerInv(u).length;for(const k in b)if(b[k]>0)n++;return n;}
function xwsOwnerAdd(key,n,reason,opt){if(!XWS.on)return null;const u=xwsOwnerUnit(opt.owner);if(!u)return null;const K=xwsKey(key);if(!xwsIsP2(K))return null;
  n=+n;if(!Number.isSafeInteger(n)||n<=0)return {ok:false,reason:'bad-amount'};if(!xwsReady())return {ok:false,reason:'off'};
  const b=u.bagN||(u.bagN={});if(b[key]>0||xwsOwnerUsed(u)<xwsOwnerCap(u)){b[key]=(b[key]||0)+n;xwsEmit('bag',{owner:u.id,key,n},reason);return {ok:true,added:n,overflow:0,to:'bag',owner:u.id};}
  const r=xwsAdd(key,n,reason,opt);if(r&&r.ok){r.to='store';r.owner=u.id;}return r;}
function xwsArgs(a3,a4){if(a3&&typeof a3==='object')return {reason:a3.reason,opt:a3};return {reason:a3,opt:a4||{}};}
function xwsInvAddO(it,a3){const A=xwsArgs(a3);if(A.opt.owner==null)return xwsInvAdd(it,A.reason,A.opt);if(!it||typeof it!=='object')return {ok:false,reason:'bad-item'};if(!XWS.on)return {ok:false,reason:'off'};
  const u=xwsOwnerUnit(A.opt.owner);if(!u){xwsGear().push(it);xwsEmit('gear',{add:it.id},A.reason);return {ok:true,to:'gear'};} /* 弟子或找不到的 owner → 宗門裝備庫 */

  const bag=xwsOwnerInv(u);if(bag.indexOf(it)>=0)return {ok:true,to:'inv',dup:true,owner:u.id};
  if(xwsOwnerUsed(u)<xwsOwnerCap(u)){bag.push(it);xwsEmit('inv',{add:it.id,owner:u.id},A.reason);return {ok:true,to:'inv',owner:u.id};}
  xwsGear().push(it);xwsEmit('gear',{add:it.id,owner:u.id},A.reason);return {ok:true,to:'gear',owner:u.id};}
function xwsInvTakeO(id,a3){const A=xwsArgs(a3);if(A.opt.owner==null)return xwsInvTake(id,A.reason);const u=xwsOwnerUnit(A.opt.owner);if(!u)return {ok:false,reason:'bad-owner'};if(xwsOwnerIsMe(u))return xwsInvTake(id,A.reason);
  const bag=xwsOwnerInv(u);const i=bag.findIndex(x=>x&&xwsIdEq(x.id,id));if(i<0)return {ok:false,reason:'not-found'};const it=bag.splice(i,1)[0];xwsEmit('inv',{take:id,owner:u.id},A.reason);return {ok:true,item:it};}
function xwsAddO(key,n,a3,a4){const A=xwsArgs(a3,a4);if(key&&typeof key==='object')return xwsInvAddO(key,A.opt.owner!=null?A.opt:A.reason);
  if(A.opt.owner!=null){const r=xwsOwnerAdd(key,n,A.reason,A.opt);if(r)return r;}return xwsAdd(key,n,A.reason,A.opt);}
function xwsGetO(key,o){if(o&&typeof o==='object'&&o.owner!=null){const u=xwsOwnerUnit(o.owner);return u?(+(u.bagN||{})[key]||0):0;}return xwsGet(key);}
/* take(key,n,{owner})：先扣該成員行囊 u.bagN，再扣宗門倉；合計不足 → 整筆失敗，不部分扣。弟子／找不到的 owner 只扣倉。 */
function xwsTakeO(key,n,a3){const A=xwsArgs(a3);if(A.opt.owner==null)return xwsTake(key,n,A.reason);n=+n;
  if(!Number.isSafeInteger(n)||n<=0)return {ok:false,reason:'bad-amount'};
  const u=XWS.on?xwsOwnerUnit(A.opt.owner):null;if(!u||!xwsIsP2(xwsKey(key))){const r=xwsTake(key,n,A.reason);if(r&&r.ok){r.fromBag=0;r.fromStore=n;}return r;}
  const b=u.bagN||{},inB=Math.max(0,+b[key]||0),fb=Math.min(inB,n),fs=n-fb;
  if(fs>0&&!(xwsGet(key)>=fs))return {ok:false,reason:'insufficient',have:inB+(+xwsGet(key)||0)};
  if(fs>0){const r=xwsTake(key,fs,A.reason);if(!r||!r.ok)return r||{ok:false,reason:'insufficient'};}
  if(fb>0){b[key]=inB-fb;if(!b[key])delete b[key];xwsEmit('bag',{owner:u.id,key,n:-fb},A.reason);}
  return {ok:true,took:n,fromBag:fb,fromStore:fs,owner:u.id};}
/* count(key,{owner})：成員行囊 u.bagN＋宗門倉合計；無 owner＝本機玩家；弟子／找不到的 owner 只算倉 */
function xwsCount(key,o){const st=+xwsGet(key)||0;if(!XWS.on||!xwsIsP2(xwsKey(key)))return st;let u=null;
  if(o&&typeof o==='object'&&o.owner!=null)u=xwsOwnerUnit(o.owner);else{try{u=typeof player==='function'?player():null;}catch(e){u=null;}if(u&&!xwsIsMember(u))u=null;}
  return st+(u?Math.max(0,+(u.bagN||{})[key]||0):0);}
XW_STORE.add=xwsGuard(xwsAddO);XW_STORE.take=xwsGuard(xwsTakeO);XW_STORE.get=xwsGetO;XW_STORE.invAdd=xwsGuard(xwsInvAddO);XW_STORE.invTake=xwsGuard(xwsInvTakeO);
XW_STORE.inv=function(owner){if(owner!=null){const u=xwsOwnerUnit(owner);if(u)return xwsOwnerInv(u);}return xwsInv();};
XW_STORE.invCap=function(owner){if(owner!=null){const u=xwsOwnerUnit(owner);if(u)return xwsOwnerCap(u);}return xwsInvCap();};
XW_STORE.count=xwsCount;
/* 行囊占用（含主角計數物品格）；無 owner＝本機玩家 */
XW_STORE.invUsed=function(owner){let u=null;try{u=owner!=null?xwsOwnerUnit(owner):(typeof player==='function'?player():null);}catch(e){u=null;}if(u&&xwsIsMember(u))return xwsOwnerUsed(u);return xwsInv().length;};
XW_STORE.bag=function(owner){const u=xwsOwnerUnit(owner);return u?{inv:xwsOwnerInv(u),n:Object.assign({},u.bagN||{}),cap:xwsOwnerCap(u),used:xwsOwnerUsed(u)}:null;};
try{if(typeof window!=='undefined'){window.XW_STORE=XW_STORE;}}catch(e){}
try{if(typeof window!=='undefined'){window.xfSettleOn=xfSettleOn;}}catch(e){}
