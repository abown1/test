// ================== net31_commission.js：弟子委託製作（econ_shop.js econCommission*）聯機同步 ==================
// 生命週期（econ_shop.js）：econCommissionTick（房主每幀）→ 每 30 遊戲秒由弟子 AI 呼叫 econCommissionPlace 下委託（扣靈石／貢獻、
//   state:'making'，prog/dur）→ prog 累加到 dur → econCmFinish（成品進委託人 gbag／pk，state:'done'）；另有 econCmTrimDone 刪最舊已完成。
//   沒有取消函式；UI（econCmPanelInject／econCmOnDom）只顯示列表與點擊說明框，玩家沒有建立／取消／接受的操作 → 不需要意圖。
// 客機：econ 本身已用 econTradeIsClient() 擋掉 Tick／Place；這裡再包一層（防重複結算）。
// 同步：net20 只在任一 econ 旗標開時才在 slow 包送整份 S.econ（委託旗標 commission 不在其中，預設 S.econ.flags 不一定有）→
//   房主每個 st 包另帶 m.n31：結構簽名（不含 prog）變了送整份 commissions，否則只送進行中的 [id,prog,to,bid]。
//   晚進房：歡迎包／世界副本是 snapshot（含 S.econ.commissions），客機一開始就有。存檔結構不變。
// 開關：NET_FLAGS.commSync 預設 true；?netexp=-commSync 或 NET31.set(false) 關閉（回到只靠 net20 的舊行為）。
const NET31={on:true,sig:'',tx:0,txFull:0,rx:0,rxFull:0,blocked:0,
  set(v){NET31.on=!!v;try{if(typeof NET_FLAGS!=='undefined')NET_FLAGS.commSync=NET31.on;}catch(e){}return NET31.on;}};
try{if(typeof NET_FLAGS!=='undefined'){if(!('commSync' in NET_FLAGS))NET_FLAGS.commSync=true;
  const q=/[?&]netexp=([^&]*)/.exec(location.search);if(q)for(const t of decodeURIComponent(q[1]).split(','))if(t.replace(/^[-+]/,'')==='commSync')NET_FLAGS.commSync=!t.startsWith('-');
  NET31.on=!!NET_FLAGS.commSync;}}catch(e){}
function n31List(){try{return (S&&S.econ&&Array.isArray(S.econ.commissions))?S.econ.commissions:null;}catch(e){return null;}}
function n31Sig(L){try{return JSON.stringify(L.map(j=>j?[j.id,j.state,j.from,j.to,j.key,j.payXia,j.matXia,j.laborXia,j.contrib,j.dur,j.tDone||0,j.product?1:0]:null));}catch(e){return '';}}
function n31Clone(x){return x==null?x:JSON.parse(JSON.stringify(x));}
{
  // 客機不跑委託結算（econ 已擋；再擋一次，計數）
  const n31Cli=()=>{try{return NET31.on&&typeof NET!=='undefined'&&NET.role==='client';}catch(e){return false;}};
  if(typeof econCommissionTick==='function'){const _x=econCommissionTick;econCommissionTick=function(){if(n31Cli()){NET31.blocked++;return;}return _x.apply(this,arguments);};
    try{if(window.XW_ECON)XW_ECON.commissionTick=econCommissionTick;}catch(e){}}
  if(typeof econCommissionPlace==='function'){const _x=econCommissionPlace;econCommissionPlace=function(){if(n31Cli()){NET31.blocked++;return {ok:false,reason:'client'};}return _x.apply(this,arguments);};
    try{if(window.XW_ECON)XW_ECON.commissionPlace=econCommissionPlace;}catch(e){}}
  if(typeof netCast==='function'){const _x=netCast;netCast=function(m){
    try{if(NET31.on&&m&&m.t==='st'&&NET.role==='host'){const L=n31List();if(L){const sig=n31Sig(L);
      if(sig!==NET31.sig||m.all||m.b!=null){m.n31={full:n31Clone(L)};if(sig!==NET31.sig){NET31.sig=sig;NET31.txFull++;}}
      else{const P=[];for(const j of L)if(j&&j.state==='making')P.push([j.id,+(+j.prog||0).toFixed(2),j.to,j.bid]);if(P.length)m.n31={p:P};}
      if(m.n31)NET31.tx++;}}}catch(e){}
    return _x.apply(this,arguments);};}
  if(typeof netApplySt==='function'){const _x=netApplySt;netApplySt=function(m){const r=_x.apply(this,arguments);
    try{if(NET31.on&&m&&m.n31&&NET.role==='client'&&S){if(!S.econ)S.econ={};NET31.rx++;
      if(Array.isArray(m.n31.full)){S.econ.commissions=n31Clone(m.n31.full);NET31.rxFull++;}
      else if(Array.isArray(m.n31.p)){const L=n31List()||(S.econ.commissions=[]);const by=new Map(L.map(j=>[j&&j.id,j]));
        for(const [id,prog,to,bid] of m.n31.p){const j=by.get(id);if(j&&j.state==='making'){j.prog=prog;j.to=to;j.bid=bid;}}}
      try{const pn=document.getElementById('econ-cm-list');if(pn&&typeof panelKeyCache!=='undefined')panelKeyCache=null;}catch(e){}}}catch(e){console.warn('[net31] apply',e);}
    return r;};}
  // 換世界／重新歡迎：結構簽名歸零（房主端下次一定送整份）
  if(typeof netLoadSnap==='function'){const _x=netLoadSnap;netLoadSnap=function(){NET31.sig='';return _x.apply(this,arguments);};}
  if(typeof netHostRx==='function'){const _x=netHostRx;netHostRx=function(cid,m){if(m&&m.t==='hello')NET31.sig='';return _x.apply(this,arguments);};}
}
