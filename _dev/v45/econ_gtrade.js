// ================== 弟子裝備交易（t1180–t1182；使用者 11/7 10:54／10:56 定案）==================
// 規則：弟子買下的裝備歸弟子（it.own＝弟子 id）；玩家不能免費拿走，只能「買回」（或弟子自願贈回，本版未實作）。
// 成交價＝econGearValue 統一估價原值（不加價差）。玩家賣出的收入進宗門公庫；弟子用自己的錢包付款。
// 弟子只買「能穿、且比該欄目前裝備估價高」的裝備；弟子之間依需求自動交易（房主／單機權威）。
// 錢包：treasury 開時用 econ 錢包，關時用 u.lingshi（不連帶開啟俸祿、稅率等其他 treasury 規則）。
// 待使用者確認的數字：
const GT_AUTO_EVERY=60;      // 弟子間自動交易多久檢查一次（遊戲秒）
const GT_AUTO_MAX=1;         // 每次檢查最多成交幾筆
var GT={sold:0,bought:0,auto:0,last:null};
for(const L of [typeof UNIT_KEEP!=='undefined'?UNIT_KEEP:null,typeof DISC_COPY!=='undefined'?DISC_COPY:null,typeof WAND_KEEP!=='undefined'?WAND_KEEP:null])if(L&&!L.includes('gbag'))L.push('gbag');
// 自己身上／背包裡的私物一律屬於自己（逐出後再入門換了 id 時校正）
function gtFixOwn(u){if(!u||gtHeldAccounts([u]))return;for(const it of (u.gbag||[]))if(it&&it.own!=null)it.own=u.id;for(const s in (u.eq||{})){const it=u.eq[s];if(it&&it.own!=null&&it.own!==u.id)it.own=u.id;}}
function gtOn(){return !(typeof NET!=='undefined'&&NET&&NET.role==='client');}
function gtAmount(n){return typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;}
function gtPrice(it){try{const n=(econGearValue(it)||{}).xia;return gtAmount(n)&&n>0?n:0;}catch(e){return 0;}}
function gtTreas(){return typeof econFlag==='function'&&econFlag('treasury')&&S.econ;}
// 貨幣契約 2026-11-07：只走公開付款／收入 API；不手扣錢包、不 sync／鏡像回灌。
function gtMoney(){const E=window.XW_ECON;return E&&typeof E.pay==='function'&&typeof E.gain==='function'&&typeof E.canPay==='function'?E:null;}
function gtBal(u){if(!u)return 0;if(gtTreas()){const E=gtMoney(),w=E&&E.wallet(u.id,false);return w?E.bagXia(w):0;}return Math.floor(u.lingshi||0);}
function gtSectBal(){return gtTreas()?XW_ECON.bagXia(S.econ.vault):Math.floor(S.res.lingshi||0);}
// Raw domain routines may only reserve their exact transfer during synchronous preparation.
// Actual currency operations belong exclusively to the public transfer token below.
var GT_PREPARE_TRANSFER=null;
function gtTransfer(from,to,n,note){const t=GT_PREPARE_TRANSFER;if(!t||t.seen||from!==t.from||to!==t.to||n!==t.n||note!==t.note||!gtAmount(n)||n<=0)return false;t.seen=true;return true;}
function gtTrader(u){return !!(u&&u.kind==='disciple'&&!u.dead&&!u.np&&S.units.includes(u));}
function gtBuyReason(u,it){const why=gtWants(u,it);if(why)return why;const p=gtPrice(it);if(!p)return '裝備估價無效，不能成交';const b=gtBal(u);return b<p?'個人靈石不足（持有 '+b+'／需要 '+p+' 下品；貢獻度不能購裝）':'';}
function gtPayrollNote(u){const off=u&&(u.office||u.econOffice);if(!off)return '目前無職位，不在既有俸祿名單；正式招募預設為雜役。';
  try{const key='stipend:'+off,r=econFeeResolvedAmt(key,1,u),cur=econFeeWantCur(key),name=ECON_OFFICE_NAME[off]||off;
    return name+'俸祿：'+econPrettyPayNum(r.amt)+' '+(cur==='contrib'?'貢獻度':'下品靈石')+'；每期 '+econPayPeriodLen()+' 遊戲秒。小數累積至整數才發；公庫不足依既有設定可能改發貢獻度或欠薪，並非保證定時可購裝。';
  }catch(e){return '俸祿依既有職位與公庫設定發放；不新增購裝補貼。';}}
function gtBag(u){if(!Array.isArray(u.gbag))u.gbag=[];return u.gbag;}
function gtSlotVal(u,s){const it=(u.eq||{})[s];return it?gtPrice(it):0;}
// 弟子是否想要：能穿、且比該欄目前裝備估價高
function gtWants(u,it){if(!u||u.dead||u.kind!=='disciple'||u.np)return '不是弟子';const s=slotFor(u,it),why=canWear(u,it,s);if(why)return why;if(gtPrice(it)<=gtSlotVal(u,s))return `${nm(u)}身上的${SLOT_NAMES[s]}不比這件差，不需要`;return '';}
// 弟子穿上自己的裝備（換下的若是自己的放回個人背包；宗門配發的回行囊）
function gtWear(u,it){const s=slotFor(u,it);u.eq=u.eq||{};const old=u.eq[s];stripGear(u);u.eq[s]=it;if(old){if(old.own===u.id)gtBag(u).push(old);else{const X=typeof econXws==='function'?econXws():null; if(!(X&&X.invAdd(old,'gtWear').ok))S.inv.push(old);}}gearApply(u);}
// 玩家（宗門）把行囊裝備賣給弟子
function gtSellToDisciple(u,itId){if(!gtOn())return {ok:false,why:'聯機成員不能進行裝備買賣，請房主操作'};
  if(!gtTrader(u))return {ok:false,why:'不是在冊可交易弟子'};const it=S.inv.find(x=>x.id===itId);if(!it)return {ok:false,why:'行囊裡沒有這件裝備'};if(it.own!=null)return {ok:false,why:'這件裝備已有主人'};
  const w=gtBuyReason(u,it);if(w)return {ok:false,why:w};const p=gtPrice(it);
  if(!gtTransfer(u,'vault',p,'gear-sell'))return {ok:false,why:'付款失敗'};S.inv=S.inv.filter(x=>x!==it);delete it.shelf;it.own=u.id;gtWear(u,it);gtTradeBump(it);GT.sold++;GT.last={k:'sell',u:u.id,it:it.id,p};
  return {ok:true,p};}
// 玩家（宗門）向弟子買回（裝備中或個人背包）
function gtBuyBack(u,itId){if(!gtOn())return {ok:false,why:'聯機成員不能進行裝備買賣，請房主操作'};
  if(!gtTrader(u))return {ok:false,why:'不是在冊可交易弟子'};let it=gtBag(u).find(x=>x.id===itId),slot=null;if(!it){for(const s in (u.eq||{}))if(u.eq[s]&&u.eq[s].id===itId){it=u.eq[s];slot=s;}}
  if(!it||it.own!==u.id)return {ok:false,why:'這不是該弟子的私人裝備'};const p=gtPrice(it);if(!p)return {ok:false,why:'裝備估價無效，不能成交'};
  const cap=typeof econInvCap==='function'?econInvCap(player()):TUNE.invCap;if(S.inv.length>=cap)return {ok:false,why:'行囊已滿'};
  if(!gtTransfer('vault',u,p,'gear-buyback'))return {ok:false,why:`宗門公庫靈石不夠（需要 ${p} 下品）`};
  if(slot){stripGear(u);delete u.eq[slot];gearApply(u);}else u.gbag=gtBag(u).filter(x=>x!==it);
  delete it.own;try{if(it._gotT==null)it._gotT=S.time;}catch(e){}{const X=typeof econXws==='function'?econXws():null; if(!(X&&X.invAdd(it,'gtBuy').ok))S.inv.push(it);}gtTradeBump(it);GT.bought++;GT.last={k:'buy',u:u.id,it:it.id,p};return {ok:true,p};}
// 弟子之間：賣方個人背包裡的裝備，買方需要且付得起就成交
function gtAutoTick(){if(!gtOn()||S.dg||GT_ATOMIC_BUSY)return 0;let n=0;const ds=S.units.filter(u=>u.kind==='disciple'&&!u.dead&&!u.np);
  for(const a of ds){for(const it of gtBag(a).slice()){if(n>=GT_AUTO_MAX)return n;if(!it||it.own!==a.id||!gtPrice(it))continue;
      let best=null;for(const b of ds){if(b===a||gtWants(b,it))continue;if(gtBal(b)<gtPrice(it))continue;const gain=gtPrice(it)-gtSlotVal(b,slotFor(b,it));if(!best||gain>best.g)best={b,g:gain};}
      if(!best)continue;const p=gtPrice(it),b=best.b;if(gtHeldAccounts([a,b])||gtItemHeld(it))continue;
      const r=gtRunTransaction({action:'auto',u:b,it,units:[a,b],from:b,to:a,p,note:'gear-auto',apply:function(){if(!gtTransfer(b,a,p,'gear-auto'))return {ok:false};a.gbag=gtBag(a).filter(x=>x!==it);it.own=b.id;gtWear(b,it);gtTradeBump(it);GT.auto++;GT.last={k:'auto',from:a.id,to:b.id,it:it.id,p};return {ok:true};}},{});
      if(r.ok){n++;try{floater(b.x,b.y-0.6,`🤝 向${nm(a)}買下${itemName(it)}`,'#ffe27a');}catch(e){}}}}
  return n;}
{let acc=0;const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{acc+=dt||0;if(acc>=GT_AUTO_EVERY){acc=0;gtAutoTick();}}catch(e){console.warn('gt',e);}return r;};}
// 私有權保護：卸下弟子自己的裝備 → 回弟子個人背包，不進宗門行囊
{const _un=unequip;unequip=function(u,slot){const it=u&&u.eq&&u.eq[slot];if(GT_ATOMIC_BUSY||gtItemHeld(it)||gtHeldAccounts([u])){toast('交易提交中或未決，私人裝備暫時隔離');return false;}if(it&&it.own!=null&&it.own===u.id){stripGear(u);delete u.eq[slot];gearApply(u);gtBag(u).push(it);toast(`${itemName(it)}是${nm(u)}的私人裝備，已收回其個人背包（宗門要用請「買回」）`);return true;}
  if(it&&it.own!=null&&it.own!==u.id){toast('這件裝備屬於別人');return false;}return _un.apply(this,arguments);};}
// 宗門配發裝備替換弟子私有裝備：換下的私有裝備回弟子背包
{const _eq=equip;equip=function(u,itId,slot){const it0=S.inv.find(x=>x.id===itId);if(GT_ATOMIC_BUSY||gtHeldAccounts([u])||it0&&(it0.own!=null||gtItemHeld(it0)))return false;const before=new Set(S.inv);const r=_eq.apply(this,arguments);
  if(r&&u){for(const it of S.inv.slice())if(!before.has(it)&&it.own!=null){S.inv=S.inv.filter(x=>x!==it);if(it.own===u.id)gtBag(u).push(it);}}return r;};}
// 行囊介面：選弟子＋選行囊裝備 → 「賣給弟子」；弟子私人裝備 → 「買回」
{const _rb=renderBag;renderBag=function(){const r=_rb.apply(this,arguments);try{if(!bagOpen||bagTab!=='gear')return r;const el=$$('bag'),u=unitById(bagUnit);if(el){const o=el.querySelector('#gt_sec');if(o)o.remove();}if(!el||!u||u.kind!=='disciple'||u.np)return r;
    let h=`<div class="sec" id="gt_sec"><b>💰 ${esc(nm(u))}的靈石：${gtBal(u)} 下品　宗門公庫：${gtSectBal()}</b>`;
    h+=`<div class="dim">${esc(gtPayrollNote(u))}</div>`;const it=S.inv.find(x=>x.id===bagPick);if(it){const w=gtBuyReason(u,it),p=gtPrice(it);h+=`<div class="jobs">${w?`<span class="no">${esc(w)}</span>`:`<button class="btn" data-gtsell="${it.id}">賣給${esc(nm(u))}（估價 ${p} 下品）</button>`}</div>`;}
    const own=[];for(const s in (u.eq||{}))if(u.eq[s]&&u.eq[s].own===u.id)own.push([u.eq[s],'裝備中']);for(const x of gtBag(u))own.push([x,'個人背包']);
    if(own.length){h+='<div class="dim">私人裝備（宗門只能買回）：</div>';for(const [x,where] of own)h+=`<div class="jobs"><span>${itemName(x)}（${where}）</span><button class="btn" data-gtbuy="${x.id}">買回（估價 ${gtPrice(x)} 下品）</button></div>`;}
    h+='</div>';el.insertAdjacentHTML('beforeend',h);}catch(e){console.warn('gt ui',e);}return r;};}
document.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('[data-gtsell],[data-gtbuy]');if(!b)return;ev.stopPropagation();ev.preventDefault();const u=unitById(bagUnit);if(!u)return;
  const r=b.dataset.gtsell?gtSellToDisciple(u,+b.dataset.gtsell):gtBuyBack(u,+b.dataset.gtbuy);
  toast(r.ok?(b.dataset.gtsell?`${nm(u)}以 ${r.p} 下品買下，收入進宗門公庫`:`宗門以 ${r.p} 下品向${nm(u)}買回`):r.why);bagPick=null;bagKey=null;renderBag();},true);
try{setTimeout(function gtReg(){if(!window.XW){setTimeout(gtReg,300);return;}XW.gt={st:GT,sell:gtSellToDisciple,buy:gtBuyBack,auto:gtAutoTick,price:gtPrice,bal:gtBal,wants:gtWants};},0);}catch(e){}

// 逐出：私人裝備跟著弟子走（收進其個人背包，隨流浪者保存；再入門時帶回），不充公
{const _k=kickDisciple;kickDisciple=function(u,q){if(gtHeldAccounts([u])){toast('交易未決，弟子私人裝備需先核對');return false;}try{if(u&&u.kind==='disciple'&&u.eq){let mv=false;for(const s in u.eq){const it=u.eq[s];if(it&&it.own===u.id){if(!mv){stripGear(u);mv=true;}delete u.eq[s];gtBag(u).push(it);}}if(mv)gearApply(u);}}catch(e){console.warn('gt kick',e);}
  return _k.apply(this,arguments);};}
{const _w=wooWanderer;wooWanderer=function(w){const r=_w.apply(this,arguments);try{for(const u of S.units)if(u.kind==='disciple')gtFixOwn(u);}catch(e){}return r;};}
// 死亡（隕落移出名冊）：沒有既定遺物規格 → 只留「私人遺物紀錄」，不充公、不給別人、不刪物件
{let acc=0,own=new Map();const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{acc+=dt||0;if(acc<1)return r;acc=0;
    for(const u of S.units)if(u.kind==='disciple'&&!u.np&&((u.gbag&&u.gbag.length)||Object.values(u.eq||{}).some(it=>it&&it.own===u.id)))own.set(u.id,u);
    for(const [id,u] of own){if(S.units.includes(u))continue;own.delete(id);if(!u.dead)continue;const R=S.flags.gtRelic=S.flags.gtRelic||[];if(R.some(x=>x.id===id))continue;
      const items=[];for(const s in (u.eq||{}))if(u.eq[s]&&u.eq[s].own===id)items.push(u.eq[s]);for(const it of (u.gbag||[]))items.push(it);
      R.push({id,name:u.name||'',t:S.time,items:items.map(it=>JSON.parse(JSON.stringify(it)))});}}catch(e){}return r;};}

// ===== 店面上架（11:10；參考獵魔村物語「打造→陳列→獵人自掏腰包買」）=====
// 只有玩家勾選「上架」的宗門行囊裝備才會被弟子自行選購；未上架一律不賣。可隨時撤下。成交走 gtSellToDisciple（統一估價、收入進公庫、歸弟子私有）。
const GT_SHELF_EVERY=30; // 待使用者確認：弟子多久逛一次店面（遊戲秒）
const GT_SHELF_MAX=1;    // 待使用者確認：每次最多成交幾件
function gtShelfToggle(itId){if(GT_ATOMIC_BUSY&&!GT_PREPARE_TRANSFER)return Object.assign(gtTradeFailure('busy'),{why:'交易提交中'});const held=(S.inv||[]).find(x=>x&&x.id===itId);if(gtItemHeld(held))return Object.assign(gtHeldFailure({itemId:itId,rev:gtTradeRevision(held)},[]),{why:'交易未決，裝備暫停上架'});if(!gtOn())return {ok:false,why:'聯機成員不能上架，請房主操作'};const it=S.inv.find(x=>x.id===itId);if(!it||it.own!=null)return {ok:false,why:'行囊裡沒有這件宗門裝備'};
  if(it.shelf)delete it.shelf;else it.shelf=1;gtTradeBump(it);return {ok:true,on:!!it.shelf};}
// 剛入手裝備保留給玩家（使用者 11-11 01:23）：入手後 TUNE.gearHold.sec（預設 60）遊戲秒內弟子不能從店面自動買走。
// 用遊戲時間 S.time 與物品臨時欄位 it._gotT（g12 addItem 打戳，不進存檔結構）；沒有 _gotT 的舊物品視為已過保留期。
// TUNE.gearHold.on===false 關閉。只擋店面自動購買（gtShelfTick）；玩家手動「賣給弟子」、gtAutoTick（弟子間私人裝備）不受限。
// 與 g12 暫用包裝並存：兩邊判斷相同，g12 先暫拿掉 shelf、這裡再跳過，結果一樣、不重複扣也不改任何欄位。
function gtGearHoldCfg(){try{return (typeof TUNE!=='undefined'&&TUNE&&TUNE.gearHold)||{on:true,sec:60};}catch(e){return {on:true,sec:60};}}
function gtGearHeld(it){
  const c=gtGearHoldCfg();if(!c||c.on===false||!it||it._gotT==null)return false;
  const t=+it._gotT;if(!(t>=0))return false;
  const sec=(+c.sec>0)?+c.sec:60;
  const now=(typeof S!=='undefined'&&S&&typeof S.time==='number')?S.time:0;
  return (now-t)<sec-1e-6; // 1e-6：S.time 浮點累加，滿 sec 秒那一刻算已到期
}
function gtShelfTick(){return gtShelfTickCore.apply(this,arguments);}
function gtShelfTickCore(){if(!gtOn()||S.dg)return 0;let n=0;const ds=S.units.filter(u=>u.kind==='disciple'&&!u.dead&&!u.np);
  for(const it of S.inv.filter(x=>x&&x.shelf&&x.own==null)){if(n>=GT_SHELF_MAX)break;if(gtGearHeld(it))continue;let best=null;
    for(const b of ds){if(gtBuyReason(b,it))continue;const g=gtPrice(it)-gtSlotVal(b,slotFor(b,it));if(!best||g>best.g)best={b,g};}
    if(best){const r=gtSellToDisciple(best.b,it.id);if(r.ok){n++;GT.shelf=(GT.shelf||0)+1;try{floater(best.b.x,best.b.y-0.6,`🛒 從店面買下${itemName(it)}`,'#ffe27a');}catch(e){}}}}
  return n;}
// 未經任何包裝的店面選購（測試／隊長移除 g12 暫用包裝前後比對用）
try{if(typeof window!=='undefined'){window.XW_ECON=window.XW_ECON||{};window.XW_ECON.gtShelfTickRaw=gtShelfTickCore;window.XW_ECON.gtGearHeld=gtGearHeld;}}catch(e){}
{let acc=0;const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{acc+=dt||0;if(acc>=GT_SHELF_EVERY){acc=0;gtShelfTick();}}catch(e){console.warn('gt shelf',e);}return r;};}
// 不在行囊（被配發／分解等）就不算上架
{const _eq=equip;equip=function(u,itId){const it=S.inv.find(x=>x.id===itId);const r=_eq.apply(this,arguments);if(r&&it&&!S.inv.includes(it))delete it.shelf;return r;};}
// 介面：行囊裝備頁加「上架／撤下」與店面清單；隕落弟子私人遺物唯讀查看
{const _rb=renderBag;renderBag=function(){const r=_rb.apply(this,arguments);try{if(!bagOpen||bagTab!=='gear')return r;const el=$$('bag');if(!el)return r;const o=el.querySelector('#gt_shop');if(o)o.remove();
    let h='<div class="sec" id="gt_shop"><b>🛒 宗門店面（弟子會用自己的靈石選購）</b>';for(const hold of Object.values(gtPendingTrades()))h+='<div class="no">交易未決 #'+esc(String(hold.itemId))+'：'+esc(hold.cause.stage+' / '+hold.cause.reason)+'；裝備與相關交易帳戶隔離，請房主核對，不會自動再扣或退款。</div>';const it=S.inv.find(x=>x.id===bagPick);
    if(it&&it.own==null)h+=`<div class="jobs"><button class="btn" data-gtshelf="${it.id}">${it.shelf?'撤下':'上架'}：${itemName(it)}（估價 ${gtPrice(it)} 下品）</button></div>`;
    const sh=S.inv.filter(x=>x.shelf);h+=sh.length?sh.map(x=>`<div class="jobs"><span>${itemName(x)}　${gtPrice(x)} 下品</span><button class="btn" data-gtshelf="${x.id}">撤下</button></div>`).join(''):'<div class="dim">目前沒有上架的裝備（選一件行囊裝備按「上架」）</div>';
    const R=S.flags.gtRelic||[];if(R.length)h+=`<details><summary>📜 隕落弟子的私人遺物（${R.length}）</summary>`+R.map(x=>`<div class="dim">${esc(x.name||'無名')}：${x.items.map(i=>itemName(i)).join('、')||'無'}</div>`).join('')+'</details>';
    h+='</div>';el.insertAdjacentHTML('beforeend',h);}catch(e){console.warn('gt shop ui',e);}return r;};}
document.addEventListener('click',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('[data-gtshelf]');if(!b)return;ev.stopPropagation();ev.preventDefault();
  const r=gtShelfToggle(+b.dataset.gtshelf);toast(r.ok?(r.on?'已上架，弟子會自行來買':'已撤下'):r.why);bagKey=null;renderBag();},true);
try{setTimeout(function gtReg2(){if(!window.XW||!XW.gt){setTimeout(gtReg2,300);return;}XW.gt.shelf=gtShelfToggle;XW.gt.shelfTick=gtShelfTick;},0);}catch(e){}
// ===== 俸祿接到弟子正式錢包（11:15；使用者 10:56 定錢包為正式玩法）=====
// 沿用既有 econPayMonth（職位、俸祿額、發放順序、公庫不足→既有欠薪紀錄/貢獻度後備），不新增金額或倍率。
// treasury 關時只對已一致的正式帳發薪，絕不替換 live vault/wallets 或猜舊帳。
var GT_STIPEND_BUSY=false;
function gtStipendBridge(){const T=S;
  const blocked=reason=>({ok:false,blocked:true,reason});
  if(!T||!T.econ||!gtOn()||econFlag('treasury')||typeof econPayMonth!=='function')return blocked('mode');
  if(GT_STIPEND_BUSY)return blocked('busy');
  if(T.flags.gtStipendError)return blocked('previous-payroll-error');
  if(T.econ.payNextT!=null&&T.flags.gtPayNextT>0&&T.econ.payNextT!==T.flags.gtPayNextT)return blocked('payroll-schedule-conflict');
  if(!(T.flags.gtPayNextT>0)||T.time<T.flags.gtPayNextT)return blocked('not-due');
  const F=T.econ.flags,V=T.econ.vault,W=T.econ.wallets;
  if(typeof grCurrencySafeTotal!=='function'||typeof GR_LIVE_LINK==='undefined'||GR_LIVE_LINK.get(T.res)!==V||grCurrencySafeTotal(V)==null||!W||!Array.isArray(T.econ.ledgers))return blocked('currency-account-unavailable');
  const ds=[];for(const off of econPayOrder(T)){
    if(off==='reward'||off==='zhangmen'&&!econHasBranch(T))continue;
    for(const u of econOfficeUnits(off,T))if(!econIsPlayerLike(u)&&!ds.includes(u))ds.push(u);
  }
  for(const u of ds){const w=W[String(u.id)],n=grCurrencySafeTotal(w);
    if(n==null||!Array.isArray(w.ledger)||!Object.prototype.hasOwnProperty.call(u,'lingshi')||u.lingshi!==n)return blocked('missing-or-conflicting-wallet');
  }
  if(typeof gtHeldAccounts==='function'&&gtHeldAccounts(['vault',...ds]))return blocked('transfer-pending');
  // 先整批驗帳，才進原薪資公式；延後通知以免外部回呼在暫時模式中重入。
  const emit=econEmit,events=[],res0=econBagXia(V);let completed=false;
  GT_STIPEND_BUSY=true;
  try{F.treasury=true;econEmit=function(t,p){events.push([t,p]);};econPayMonth(T);completed=true;}
  catch(e){T.flags.gtStipendError={at:T.time,reason:'payroll-threw'};console.warn('gt stipend',e);}
  finally{F.treasury=false;econEmit=emit;}
  // 例外可能已部分發放：不回滾、不重試，不捏造退款／補發。
  try{for(const ev of events)emit.apply(null,ev);}finally{GT_STIPEND_BUSY=false;}
  if(!completed)return blocked('payroll-threw');
  GT.stipend=(GT.stipend||0)+1;return {ok:true,completed:true,paid:res0-econBagXia(V)};
}
{const _u=update;update=function(dt){const r=_u.apply(this,arguments);try{if(S&&S.econ&&gtOn()&&!S.dg){
  const now=+(S.time||0),P=Math.max(1,econPayPeriodLen());
  if(econFlag('treasury')){if(Number.isFinite(S.econ.payNextT))S.flags.gtPayNextT=S.econ.payNextT;}
  else{
    if(!(S.flags.gtPayNextT>0))S.flags.gtPayNextT=Number.isFinite(S.econ.payNextT)?S.econ.payNextT:now+P;
    // 舊兩套排程若矛盾，不自行選一套吃掉或重發某一期。
    if(S.econ.payNextT!=null&&S.econ.payNextT!==S.flags.gtPayNextT)return r;
    if(now>=S.flags.gtPayNextT){const pay=gtStipendBridge();if(pay&&pay.completed){S.flags.gtPayNextT=now+P;S.econ.payNextT=now+P;}}
  }
}}catch(e){console.warn('gt pay',e);}return r;};}
try{setTimeout(function gtReg3(){if(!window.XW||!XW.gt){setTimeout(gtReg3,300);return;}XW.gt.stipend=gtStipendBridge;XW.gt.buyReason=gtBuyReason;XW.gt.payrollNote=gtPayrollNote;},0);}catch(e){}

// ===== 同步 host 原子交易；opId／world 去重與持久結果屬 net，不另造 journal =====
var GT_ATOMIC_BUSY=false;
var GT_COMMITTED_RESULTS=new WeakMap();
function gtIsCommittedResult(r){return !!(r&&GT_COMMITTED_RESULTS.has(r)&&GT_COMMITTED_RESULTS.get(r).state===S&&GT_COMMITTED_RESULTS.get(r).econ===S.econ&&GT_COMMITTED_RESULTS.get(r).wid===(typeof NET!=='undefined'&&NET?NET.wid:null)&&r.phase==='committed'&&r.ok===true&&r.applied===true&&!r.pending&&(r.action==='shelf'?r.currency==='none':r.currency==='committed'&&r.group&&r.group.committed===true));}
function gtTradeRevision(it){return it&&Number.isSafeInteger(it.id)?'gt1:'+it.id+':'+(Number.isSafeInteger(it._gtRev)&&it._gtRev>=0?it._gtRev:0):null;}
function gtTradeBump(it){const n=Number.isSafeInteger(it._gtRev)&&it._gtRev>=0?it._gtRev:0;if(n>=Number.MAX_SAFE_INTEGER)throw new Error('revision_capacity');it._gtRev=n+1;}
// Domain-only snapshots: never capture/restore money, mirrors, wallets, carry or ledgers.
function gtTradeUndo(units,it){const jobs=[],seen=new Set();
  function obj(o,keys){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);const d=Object.getOwnPropertyDescriptors(o),ks=keys||Reflect.ownKeys(d);jobs.push(function(){if(!keys)for(const k of Reflect.ownKeys(o))if(!Object.prototype.hasOwnProperty.call(d,k))delete o[k];for(const k of ks){if(Object.prototype.hasOwnProperty.call(d,k))Object.defineProperty(o,k,d[k]);else delete o[k];}});}
  function arr(a){if(!Array.isArray(a)||seen.has(a))return;seen.add(a);const old=a.slice();jobs.push(function(){Array.prototype.splice.call(a,0,a.length,...old);});}
  const state=S,inv=state.inv;arr(inv);jobs.push(function(){state.inv=inv;});
  for(const u of units){obj(u,['eq','gbag','gb','atk','maxhp','hp','speed','def']);obj(u.eq);arr(u.gbag);obj(u.gb);for(const x of Object.values(u.eq||{}))obj(x);for(const x of (u.gbag||[]))obj(x);}
  obj(it);obj(GT);return function(){for(const f of jobs)f();};
}
function gtAccountKey(who){return who==='vault'||who==='sect'?'vault':who&&who.id!=null?'unit:'+who.id:null;}
function gtHolds(){return S&&S.flags&&S.flags.gtTradeHolds||null;}
function gtItemHeld(it){const h=gtHolds();return !!(it&&h&&h[String(it.id)]);}
function gtHeldAccounts(accounts){const keys=accounts.map(gtAccountKey),h=gtHolds();return !!(h&&Object.values(h).some(x=>x&&x.accounts&&x.accounts.some(k=>keys.includes(k))));}
function gtHeldFailure(ids,accounts){const keys=accounts.map(gtAccountKey),h=gtHolds(),blocker=h&&Object.values(h).find(x=>x.itemId===ids.itemId||x.accounts&&x.accounts.some(k=>keys.includes(k)));return gtTradeFailure('transfer_pending',Object.assign({},ids,{phase:'blocked',pending:true,domain:'unchanged',blocker:blocker?JSON.parse(JSON.stringify(blocker)):null}));}
function gtPendingTrades(){const h=gtHolds();return h?JSON.parse(JSON.stringify(h)):{};}
function gtTradeFailure(code,extra){return Object.assign({ok:false,code,phase:'rejected',pending:false,applied:false,currency:'none',currencyPhase:'none',domain:'unchanged',durable:false,rev:null},extra||{});}
function gtCaptureCode(r){return ({'missing-or-conflicting-account':'currency_account_unavailable','unsupported-state':'currency_mode_unsupported',busy:'currency_busy',insufficient:'insufficient'})[r&&r.code]||'currency_capture_failed';}
// Restore the event audit ring only after the currency owner has certified rollback.
// Foreign-account rows/notifications remain; matching amounts/notes are never treated as receipts.
function gtRestoreEvents(before,events,accounts){if(typeof ECON_EVENTS==='undefined')return [];const actors=accounts.map(w=>w==='vault'||w==='sect'?null:w.id),own=events.filter(ev=>ev&&['econ:charge','econ:grant'].includes(ev.t)&&actors.includes(ev.p&&ev.p.actorId));
  const foreign=events.filter(ev=>!own.includes(ev));const next=before.concat(ECON_EVENTS.filter(ev=>!before.includes(ev)&&!own.includes(ev))).slice(-ECON_TUNE.eventMax);Array.prototype.splice.call(ECON_EVENTS,0,ECON_EVENTS.length,...next);return foreign;}
function gtRunTransaction(spec,ctx){ctx=ctx||{};if(GT_ATOMIC_BUSY)return gtTradeFailure('busy');
  if(ctx.commit&&(ctx.protocol!=='gt-staged-v1'||typeof ctx.commit!=='function'))return gtTradeFailure('unsupported_commit_protocol');
  const state=S,flags=state.flags;const {u,it,p,from,to}=spec,units=spec.units||[u],beforeRev=gtTradeRevision(it),ids={action:spec.action,unitId:u.id,itemId:it.id,p,rev:beforeRev};
  if(gtItemHeld(it)||p&&gtHeldAccounts([from,to]))return gtHeldFailure(ids,[from,to]);
  const E=gtMoney();let token=null,stage='capture',phase='none',lastConfirmedPhase='none',applied=false,undo=null,redo=null,emitAfter=[];
  if(p){if(!E||typeof E.captureTransferSnapshot!=='function'||typeof E.restoreTransferSnapshot!=='function'||typeof E.commitTransferSnapshot!=='function')return gtTradeFailure('currency_unavailable',ids);
    let cap;try{cap=E.captureTransferSnapshot(from,to,{amount:p,debitNote:spec.note,creditNote:spec.note});}catch(e){return gtTradeFailure('currency_capture_failed',Object.assign({},ids,{reason:'capture-threw'}));}
    if(!cap||!cap.ok)return gtTradeFailure(gtCaptureCode(cap),Object.assign({},ids,{reason:cap&&cap.reason}));token=cap.token;
  }
  const oldHook=window.XW&&XW.onEconEvent,events=[],eventsBefore=typeof ECON_EVENTS!=='undefined'?ECON_EVENTS.slice():[];let failCode='internal_error';
  GT_ATOMIC_BUSY=true;
  try{
    if(window.XW)XW.onEconEvent=function(ev){events.push(ev);};
    stage='prepare';undo=gtTradeUndo(units,it);const reservation={from,to,n:p,note:spec.note,seen:false};GT_PREPARE_TRANSFER=reservation;
    let raw;try{raw=spec.apply();}finally{GT_PREPARE_TRANSFER=null;}
    if(!raw||!raw.ok||p&&!reservation.seen){failCode='payment_failed';throw Error(failCode);}
    redo=gtTradeUndo(units,it);undo();
    if(p){stage='debit';const d=token.debit();if(!d||!d.ok){failCode='payment_failed';phase='unverified';throw Error(failCode);}phase='debit';lastConfirmedPhase='debit';
      stage='credit';const c=token.credit();if(!c||!c.ok){failCode='payment_failed';phase='unverified';throw Error(failCode);}phase='complete';lastConfirmedPhase='complete';}
    stage='domain';redo();applied=true;
    const result=Object.assign({ok:true,code:'ok',phase:'committed',pending:false,applied:true,currency:p?'committed':'none',currencyPhase:phase,domain:'applied',group:p?{schema:'xw-transfer-v1',committed:false}:null,durable:false},ids,{rev:gtTradeRevision(it)});if(spec.action==='shelf')result.on=!!it.shelf;
    if(ctx.commit){stage='stage';failCode='persist_failed';const staged=Object.assign({},result,{phase:'staged',pending:true,currency:p?'complete-uncommitted':'none',group:p?{schema:'xw-transfer-v1',committed:false}:null,durable:false});if(ctx.commit(staged)!==true)throw Error(failCode);}
    if(token){stage='group_commit';failCode='transfer_conflict';const committed=E.commitTransferSnapshot(token);if(!committed||!committed.ok)throw Error(failCode);result.group=Object.freeze({schema:'xw-transfer-v1',committed:true,phase:committed.phase});}
    GT_COMMITTED_RESULTS.set(result,{state:S,econ:S.econ,wid:typeof NET!=='undefined'&&NET?NET.wid:null});Object.freeze(result);emitAfter=events.slice();return result;
  }catch(e){
    GT_PREPARE_TRANSFER=null;let restored={ok:true,phase:'none'};if(token){try{restored=E.restoreTransferSnapshot(token);}catch(err){restored={ok:false,code:'conflict',reason:'restore-threw'};}}
    if(restored&&restored.ok){if(undo)undo();emitAfter=gtRestoreEvents(eventsBefore,events,p?[from,to]:[]);return gtTradeFailure(failCode,Object.assign({},ids,{phase:'rolled_back',currency:token?'restored':'none',currencyPhase:'none',restoredFrom:restored.phase,rev:beforeRev}));}
    // Never overwrite finances after a conflict. Prepared-but-unapplied gear remains escrowed
    // at its original location; fully applied gear stays with its paid owner/new revision.
    if(!applied&&undo)undo();
    const held=Object.assign({},ids,{rev:gtTradeRevision(it),beforeRev,phase:'unresolved',pending:true,applied,currency:'conflict',currencyPhase:phase,lastConfirmedPhase,domain:applied?'applied':'escrow',accounts:[from,to].filter(Boolean).map(gtAccountKey),cause:{stage,code:restored&&restored.code||'conflict',reason:restored&&restored.reason||String(e.message||e)},beforeLocation:spec.action==='buy'?'private':'inventory'});
    held.worldChanged=S!==state||state.flags!==flags;const H=flags.gtTradeHolds||(flags.gtTradeHolds={});H[String(it.id)]=JSON.parse(JSON.stringify(held));emitAfter=S===state?events.slice():[];return gtTradeFailure('transfer_conflict',held);
  }finally{GT_PREPARE_TRANSFER=null;GT_ATOMIC_BUSY=false;if(window.XW){if(oldHook===undefined)delete XW.onEconEvent;else XW.onEconEvent=oldHook;}if(typeof oldHook==='function')for(const ev of emitAfter)try{oldHook(ev);}catch(e){console.warn('gt notification',e);}}
}
function gtAtomicTrade(req,ctx){const fail=code=>gtTradeFailure(code);
  const online=typeof NET!=='undefined'&&NET&&NET.role;if(online&&NET.role!=='host')return fail('not_host');ctx=ctx||{};
  if(GT_ATOMIC_BUSY)return fail('busy');
  if(!req||typeof req!=='object'||Array.isArray(req)||Object.keys(req).some(k=>!['action','unitId','itemId','rev'].includes(k))||!['sell','buy','shelf'].includes(req.action)||!Number.isSafeInteger(req.unitId)||req.unitId<=0||!Number.isSafeInteger(req.itemId)||req.itemId<=0||typeof req.rev!=='string')return fail('bad_schema');
  const pk=ctx.pkey;let host=!online;
  if(online){if(ctx.wid!==NET.wid)return fail('wrong_world');const p=pk&&NET.players&&NET.players.get(pk);if(!p||!p.online||(p.pkey&&p.pkey!==pk))return fail('origin');
    if(p.host){host=pk===NET.pkey&&!ctx.cid;if(!host)return fail('origin');}
    else if(!ctx.cid||p.cid!==ctx.cid||!NET.cid2pk||NET.cid2pk.get(ctx.cid)!==pk||typeof netAvatarAnywhere!=='function'||!netAvatarAnywhere(pk))return fail('origin');
  }else if(ctx.cid||ctx.pkey)return fail('origin');
  const u=S.units.find(x=>x&&x.id===req.unitId);if(!gtTrader(u))return fail('forbidden');
  // 整合方 12:06 轉述使用者定案：已驗證成員可售／上架共用裝備、以公庫買回；不授其他支出或私人財產交易。
  let it;if(req.action==='buy')it=[...(u.gbag||[]),...Object.values(u.eq||{})].find(x=>x&&x.id===req.itemId&&x.own===u.id);
  else it=S.inv.find(x=>x&&x.id===req.itemId&&x.own==null);
  if(!it)return fail('forbidden');if(it._gtRev!=null&&(!Number.isSafeInteger(it._gtRev)||it._gtRev<0))return fail('invalid_revision');if(gtTradeRevision(it)!==req.rev)return fail('stale_revision');
  if((it._gtRev||0)>=Number.MAX_SAFE_INTEGER)return fail('revision_capacity');
  if(ctx.commit&&(ctx.protocol!=='gt-staged-v1'||typeof ctx.commit!=='function'))return fail('unsupported_commit_protocol');
  if(gtItemHeld(it)||req.action!=='shelf'&&gtHeldAccounts([u,'vault']))return gtHeldFailure({action:req.action,unitId:u.id,itemId:it.id,rev:gtTradeRevision(it)},[u,'vault']);
  let price=0;if(req.action!=='shelf'){
    price=gtPrice(it);if(!price)return fail('invalid_price');
    if(req.action==='sell'){
      if(gtWants(u,it))return fail('not_needed');const old=(u.eq||{})[slotFor(u,it)],after=S.inv.length-1+(old&&old.own==null?1:0),cap=typeof econInvCap==='function'?econInvCap(player()):TUNE.invCap;if(after>cap)return fail('inventory_full');
    }else if(S.inv.length>=(typeof econInvCap==='function'?econInvCap(player()):TUNE.invCap))return fail('inventory_full');
  }
  const spec={action:req.action,u,it,p:price,from:req.action==='buy'?'vault':u,to:req.action==='buy'?u:'vault',note:req.action==='buy'?'gear-buyback':'gear-sell',apply:function(){return req.action==='sell'?GT_ATOMIC_RAW.sell(u,it.id):req.action==='buy'?GT_ATOMIC_RAW.buy(u,it.id):GT_ATOMIC_RAW.shelf(it.id);}};
  return gtRunTransaction(spec,ctx);
}
try{setTimeout(function gtAtomicReg(){if(!window.XW||!XW.gt){setTimeout(gtAtomicReg,300);return;}XW.gt.atomic=gtAtomicTrade;XW.gt.revision=gtTradeRevision;XW.gt.pending=gtPendingTrades;XW.gt.protocol='gt-staged-v1';XW.gt.atomicProtocol='gt-staged-v1';XW.gt.capabilities=Object.freeze({atomicProtocol:'gt-staged-v1',transferGroup:'xw-transfer-v1',stagedCommit:true,domainPreparation:true,committedProof:'isCommittedResult',journal:'net-only',durableAck:'net-only'});XW.gt.isCommittedResult=gtIsCommittedResult;},0);}catch(e){}

// 既有本機 UI／自主逛店沿同一原子核心，不改付款人與價規；net wrapper 在 client 端仍只送 intent。
var GT_ATOMIC_RAW={sell:gtSellToDisciple,buy:gtBuyBack,shelf:gtShelfToggle};
function gtLocalTrade(action,u,id){const ctx=typeof NET!=='undefined'&&NET&&NET.role==='host'?{pkey:NET.pkey,wid:NET.wid}:{};
  const r=gtAtomicTrade({action:action,unitId:u&&u.id,itemId:id,rev:gtTradeRevision(action==='buy'?[(u&&u.gbag)||[],Object.values(u&&u.eq||{})].flat().find(x=>x&&x.id===id):S.inv.find(x=>x&&x.id===id))||''},ctx);
  if(!r.ok)r.why=({transfer_conflict:'交易未決：保留資金與隔離裝備，請勿重付，等待房主核對',transfer_pending:'此物品或付款帳戶有未決交易，暫停買賣',currency_account_unavailable:'正式錢包缺失或矛盾，未扣款',currency_mode_unsupported:'此貨幣模式不支援原子交易，未扣款',unsupported_commit_protocol:'聯機交易尚未接staged-v1，未扣款',insufficient:'靈石不足（付款帳依既有公庫／個人規則）',not_needed:'弟子不需要這件裝備或境界不符',inventory_full:'行囊已滿',stale_revision:'裝備狀態已變更，請重試',forbidden:'物件不屬於本次可交易範圍',not_host:'請由房主提交交易',invalid_price:'裝備估價無效',busy:'交易提交中，請稍後再試'})[r.code]||'交易未完成（'+r.code+'）';if(r.pending){const cause=r.cause||r.blocker&&r.blocker.cause;if(cause)r.why+='（'+cause.stage+' / '+cause.reason+'）';}return r;}
gtSellToDisciple=function(u,id){return gtLocalTrade('sell',u,id);};
gtBuyBack=function(u,id){return gtLocalTrade('buy',u,id);};

// ===== gearGuard：沒有總倉時，弟子不得拿走玩家／宗門裝備（2026-11-13 使用者 09:48）=====
// 原因：行囊以弟子開啟（頭像／圓盤「行囊」或選取弟子後開行囊）時，「⚡ 一鍵穿上最佳」「⚡ 全員最佳」與「同一件再點一次＝直接穿上」
//   會直接把宗門行囊裝備穿到弟子身上，不看有沒有總倉，也不看剛入手 60 秒保留（g17 equipBest／v46BagClick，econ_slot16 新格同）。
// 規則：弟子只在玩家按「裝備給」時穿宗門裝備；無總倉時一鍵／全員／再點一次都不配給弟子（主角與聯機玩家化身照舊）。
//   有總倉：總倉自領（g20 v171）照舊；一鍵／全員配給弟子時跳過剛入手未滿 TUNE.gearHold.sec 的裝備。
// 旗標：預設開；?gearguard=0、window.ECON_GEARGUARD_FORCE=false 或 S.econ.flags.gearGuard===false 關回舊行為。不改存檔結構。
var ECON_GEARGUARD_URL_OFF=(function(){try{return /[?&]gearguard=0\b/.test(location.search);}catch(e){return false;}})();
function econGearGuardOn(){
  try{if(typeof window!=='undefined'){if(window.ECON_GEARGUARD_FORCE===false)return false;if(window.ECON_GEARGUARD_FORCE===true)return true;}}catch(e){}
  if(ECON_GEARGUARD_URL_OFF)return false;
  try{if(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.gearGuard===false)return false;}catch(e){}
  return true;}
function econGGHasZc(){try{if(typeof v171B==='function')return !!v171B();}catch(e){}
  try{return (S.buildings||[]).some(function(b){return b&&b.type==='zongcang'&&b.built&&!b.broken;});}catch(e){return false;}}
function econGGIsDisc(u){if(!u||u.kind!=='disciple')return false;try{if(typeof econIsPlayerUnit==='function')return !econIsPlayerUnit(u);}catch(e){}return !u.np;}
function econGGBlocked(u){return econGearGuardOn()&&econGGIsDisc(u)&&!econGGHasZc();}
const ECON_GG_TXT='沒有總倉時，弟子不會自己拿宗門裝備；要給弟子請點選裝備後按「裝備給」';
function econGGWrapBest(fn){
  if(typeof fn!=='function'||fn._econGG)return fn;
  const w=function(u,quiet){
    if(!econGearGuardOn()||!econGGIsDisc(u))return fn.apply(this,arguments);
    if(!econGGHasZc()){if(!quiet){try{toast(ECON_GG_TXT);}catch(e){}}return 0;}
    // 有總倉：剛入手保留期內的裝備先藏起來，配完放回原位置（同步完成，不進存檔）
    const held=[];try{(S.inv||[]).forEach(function(it,i){if(it&&gtGearHeld(it))held.push([i,it]);});}catch(e){}
    if(!held.length)return fn.apply(this,arguments);
    const hs=new Set(held.map(function(x){return x[1];}));S.inv=S.inv.filter(function(x){return !hs.has(x);});
    try{return fn.apply(this,arguments);}
    finally{for(const pr of held){if(S.inv.indexOf(pr[1])>=0)continue;S.inv.splice(Math.min(pr[0],S.inv.length),0,pr[1]);}}
  };
  w._econGG=1;for(const k of ['_econ16','_lqHint'])if(fn[k])w[k]=fn[k];
  return w;}
// 內層先包（net4 的 netFwd 登記的是這一層，房主執行成員的一鍵配裝也受管）；外層等 econ_slot16／g14 包完再包一次
if(typeof equipBest==='function')equipBest=econGGWrapBest(equipBest);
function econGGOuter(){try{if(typeof equipBest==='function'&&!equipBest._econGG)equipBest=econGGWrapBest(equipBest);}catch(e){}}
try{setTimeout(econGGOuter,2600);setTimeout(econGGOuter,4000);setInterval(econGGOuter,3000);}catch(e){}
// 行囊點擊（捕獲階段，早於 g17 v46BagClick）：無總倉時「再點一次＝直接穿上」不配給弟子；「全員最佳」只配主角與玩家化身
document.addEventListener('click',function(ev){try{
  if(!econGearGuardOn()||typeof bagOpen==='undefined'||!bagOpen||bagTab!=='gear')return;
  const t=ev.target,bag=document.getElementById('bag');if(!t||!t.closest||!bag||!bag.contains(t))return;
  if(econGGHasZc())return;
  const all=t.closest('[data-v46="all"]');
  if(all){ev.stopPropagation();ev.preventDefault();let n=0,skip=0;
    const us=bagUnits().slice().sort(function(a,c){return (c.kind==='player')-(a.kind==='player')||c.realm-a.realm;});
    for(const v of us){if(econGGIsDisc(v)){skip++;continue;}n+=equipBest(v,true)||0;}
    toast((n?'全員換上 '+n+' 件更好的裝備':'大家身上已是最好的裝備')+(skip?'（沒有總倉，弟子不自動分配；給弟子請按「裝備給」）':''));
    bagKey=null;renderBag();return;}
  const x=t.closest('[data-it]');if(!x||String(bagPick)!==x.dataset.it)return;
  const u=unitById(bagUnit)||player();if(!econGGBlocked(u))return;
  ev.stopPropagation();ev.preventDefault();try{toast(ECON_GG_TXT);}catch(e){}bagKey=null;renderBag();
}catch(e){console.warn('gearGuard',e);}},true);
try{if(typeof window!=='undefined'){window.XW_ECON=window.XW_ECON||{};window.XW_ECON.gearGuard={on:econGearGuardOn,blocked:econGGBlocked,hasZongcang:econGGHasZc,isDisciple:econGGIsDisc};}}catch(e){}
