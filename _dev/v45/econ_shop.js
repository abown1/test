// ================== 仙武經濟：店舖／委託／市場／新建築目錄 ===================
var ECON_SHOP_TUNE={
  laborBase:5,
  laborDiff:3,
  listingMax:40,
  cityDrift:0.04,            // 待確認：每 tick 供需最大偏移
  caravanEvery:900           // 待確認：商隊間隔（秒）
};
function econLaborFee(diff,realm){
  const base=(typeof ECON_TUNE!=='undefined'&&ECON_TUNE.laborBase)||ECON_SHOP_TUNE.laborBase;
  return Math.max(1,Math.round(base+(+diff||0)*ECON_SHOP_TUNE.laborDiff+(+realm||0)));
}
function econMatCostXia(cost){
  if(!cost)return 0;
  let x=0;
  if(cost.lingshi)x+=+cost.lingshi||0;
  for(const g of (typeof ECON_GRADES!=='undefined'?ECON_GRADES:[]))if(cost[g])x+=econToXia(g,cost[g]);
  // 其他材料暫以「非靈石項各 +1 下品估」——售價公式待確認；靈石部分精確
  return x;
}
function econShopPrice(cost,opt){
  opt=opt||{};
  const mat=opt.matXia!=null?opt.matXia:econMatCostXia(cost);
  const labor=opt.labor!=null?opt.labor:econLaborFee(opt.diff||0,opt.realm||0);
  return {mat:mat,labor:labor,total:mat+labor};
}

function econCommission(fromU,toU,kind,key,payXia){
  if(!econFlag('shop'))return {ok:false,reason:'flag-off'};
  const T=S;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  if(!fromU||!toU)return {ok:false,reason:'need-both'};
  const price=econShopPrice(null,{matXia:0,labor:payXia||econLaborFee(0,toU.realm)});
  const pay=econCharge(fromU,price.total,'commission-pay');
  if(!pay.ok)return pay;
  econGrant(toU,price.total,'commission-fee','xia');
  const job={
    id:(T.econ.shops.nextId++),
    kind:kind||'alchemy',key:key,from:fromU.id,to:toU.id,
    dest:'commissioner',pay:price.total,t:econNow(),state:'open'
  };
  T.econ.commissions.push(job);
  econEmit('econ:commission',{id:job.id,from:fromU.id,to:toU.id,key:key});
  return {ok:true,job:job};
}
function econPlayerOrder(crafter,kind,key,cost){
  if(!econFlag('shop'))return {ok:false,reason:'flag-off'};
  const T=S;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  const price=econShopPrice(cost,{realm:crafter&&crafter.realm});
  const job={
    id:(T.econ.shops.nextId++),
    kind:kind||'alchemy',key:key,from:'player',to:crafter&&crafter.id,
    dest:'warehouse',pay:0,price:price,t:econNow(),state:'open'
  };
  T.econ.shops.orders.push(job);
  econEmit('econ:order',{id:job.id,key:key,dest:'warehouse'});
  return {ok:true,job:job};
}
function econOnCraftFinished(crafter,product,ctx){
  if(!econFlag('shop'))return {ok:false,reason:'flag-off',handoff:'default'};
  const T=S;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  ctx=ctx||{};
  const jobs=T.econ.commissions.filter(j=>j.state==='open'&&(!crafter||j.to===crafter.id));
  const job=ctx.jobId?T.econ.commissions.find(j=>j.id===ctx.jobId)||T.econ.shops.orders.find(j=>j.id===ctx.jobId):jobs[0];
  if(job&&job.dest==='commissioner'){
    job.state='done';job.product=product;
    econEmit('econ:craft:deliver',{id:job.id,to:job.from,product:product});
    return {ok:true,handoff:'commissioner',to:job.from,job:job};
  }
  const order=T.econ.shops.orders.find(j=>j.state==='open'&&(!crafter||j.to===crafter.id));
  if(order||(ctx.dest==='warehouse')){
    if(order){order.state='done';order.product=product;}
    const listing={
      id:(T.econ.shops.nextId++),
      product:product,price:((order&&order.price)||econShopPrice(null)).total,
      t:econNow()
    };
    T.econ.shops.listings.push(listing);
    if(T.econ.shops.listings.length>ECON_SHOP_TUNE.listingMax)T.econ.shops.listings.shift();
    econEmit('econ:craft:warehouse',{id:listing.id,product:product});
    return {ok:true,handoff:'warehouse',listing:listing};
  }
  return {ok:true,handoff:'default'};
}
function econShopBuy(buyer,listingId){
  if(!econFlag('shop'))return {ok:false,reason:'flag-off'};
  const T=S;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  const i=T.econ.shops.listings.findIndex(l=>l.id===listingId);
  if(i<0)return {ok:false,reason:'gone'};
  const L=T.econ.shops.listings[i];
  const pay=econCharge(buyer,L.price,'shop-buy');
  if(!pay.ok)return pay;
  econGrant('vault',L.price,'shop-income','xia');
  T.econ.shops.listings.splice(i,1);
  econEmit('econ:shop:buy',{buyer:buyer&&buyer.id,id:listingId,price:L.price});
  return {ok:true,product:L.product,price:L.price};
}

function econMarketPrice(key,base){
  base=base==null?1:base;
  if(!econFlag('market'))return base;
  const T=S;if(!T||!T.econ||!T.econ.market)return base;
  const m=T.econ.market.prices[key];
  return +(base*(m!=null?m:1)).toFixed(3);
}
function econMarketTick(dt){
  if(!econFlag('market'))return;
  const T=S;if(!T||!T.econ)return;
  const M=T.econ.market;M.tick=(M.tick||0)+dt;
  const keys=(typeof RES_KEYS!=='undefined'?RES_KEYS:['wood','stone','fiber','food','iron','herb','lingshi']);
  for(const k of keys){
    let p=M.prices[k];if(p==null)p=1;
    const drift=(Math.random()*2-1)*ECON_SHOP_TUNE.cityDrift;
    p=econClamp(p+drift,0.5,2.2);M.prices[k]=+p.toFixed(3);
    M.drift[k]=drift;
  }
  if(M.tick>=ECON_SHOP_TUNE.caravanEvery){
    M.tick=0;
    const car={id:(M.caravans.length+1),t:econNow(),city:null,stock:{}};
    M.caravans.push(car);if(M.caravans.length>8)M.caravans.shift();
    econEmit('econ:caravan',{id:car.id});
  }
}
function econShopTick(dt){ /* 預留：過期上架、AI 進城買賣由整合者接弟子 AI */ }

function econGoodsEnsureNames(){
  try{
    if(typeof RES_NAMES==='object'&&RES_NAMES&&!RES_NAMES.xiacao)RES_NAMES.xiacao='仙草';
    if(typeof RES_COL==='object'&&RES_COL&&!RES_COL.xiacao)RES_COL.xiacao='#9ef0c8';
    if(typeof RES_KEYS!=='undefined'&&Array.isArray(RES_KEYS)&&RES_KEYS.indexOf('xiacao')<0)RES_KEYS.push('xiacao');
  }catch(e){}
}
var ECON_GOODS={
  xiacao:{id:'xiacao',name:'仙草',buyXia:8,sellXia:5,wanbaoSellXia:6,aucN:3,aucBase:18,note:'靈田所產。貴於尋常藥草，遜於拍賣會的千年靈芝'}
};
function econGoodsOf(key){return ECON_GOODS[key]||null;}
function econGoodsPrice(key,side,place){
  const g=ECON_GOODS[key];if(!g)return 1;
  let base=side==='buy'?g.buyXia:(place==='wanbao'?(g.wanbaoSellXia||g.sellXia):g.sellXia);
  return Math.max(1,Math.round(base*econMarketPrice(key,1)));
}
function econGoodsStock(key,T){
  T=T||(typeof S!=='undefined'?S:null);
  return (T&&T.res&&T.res[key])||0;
}
function econGoodsGain(key,amt,T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.res)return 0;
  amt=Math.floor(+amt||0);if(amt<=0)return 0;
  T.res[key]=(T.res[key]||0)+amt;return amt;
}
function econFangshiCan(){return !!(econFlag('shop')||econFlag('market')||econFlag('newBuildings'));}
function econAucHasXiacao(){
  try{return typeof AUC_LOTS!=='undefined'&&Array.isArray(AUC_LOTS)&&AUC_LOTS.some(function(x){return x&&x.k==='xiacao';});}catch(e){return false;}
}

function econFangshiBuy(key,amt,who){
  if(!econFangshiCan())return {ok:false,reason:'flag-off'};
  const g=ECON_GOODS[key];if(!g)return {ok:false,reason:'unknown'};
  amt=Math.floor(+amt||1);if(amt<=0)return {ok:false,reason:'amt'};
  const unit=econGoodsPrice(key,'buy','fangshi');
  const price=unit*amt;
  const pay=typeof econCharge==='function'?econCharge(who||'vault',price,'fangshi-buy:'+key):{ok:false,reason:'no-charge'};
  if(!pay.ok)return pay;
  econGoodsEnsureNames();
  econGoodsGain(key,amt);
  try{if(typeof econEmit==='function')econEmit('econ:fangshi:buy',{key:key,amt:amt,price:price});}catch(e){}
  return {ok:true,key:key,amt:amt,price:price,place:'fangshi'};
}
function econFangshiSell(key,amt,who){
  if(!econFangshiCan())return {ok:false,reason:'flag-off'};
  const g=ECON_GOODS[key];if(!g)return {ok:false,reason:'unknown'};
  amt=Math.floor(+amt||1);if(amt<=0)return {ok:false,reason:'amt'};
  const T=typeof S!=='undefined'?S:null;
  if(!T||!T.res||(T.res[key]||0)<amt)return {ok:false,reason:'no-res'};
  T.res[key]-=amt;
  const unit=econGoodsPrice(key,'sell','fangshi');
  const price=unit*amt;
  if(typeof econGrant==='function')econGrant(who||'vault',price,'fangshi-sell:'+key,'xia');
  try{if(typeof econEmit==='function')econEmit('econ:fangshi:sell',{key:key,amt:amt,price:price});}catch(e){}
  return {ok:true,key:key,amt:amt,price:price,place:'fangshi'};
}
function econWanbaoSell(key,amt,who){
  if(!econFangshiCan())return {ok:false,reason:'flag-off'};
  const g=ECON_GOODS[key];if(!g)return {ok:false,reason:'unknown'};
  amt=Math.floor(+amt||1);if(amt<=0)return {ok:false,reason:'amt'};
  const T=typeof S!=='undefined'?S:null;
  if(!T||!T.res||(T.res[key]||0)<amt)return {ok:false,reason:'no-res'};
  T.res[key]-=amt;
  const unit=econGoodsPrice(key,'sell','wanbao');
  const price=unit*amt;
  if(typeof econGrant==='function')econGrant(who||'vault',price,'wanbao-sell:'+key,'xia');
  try{if(typeof econEmit==='function')econEmit('econ:wanbao:sell',{key:key,amt:amt,price:price});}catch(e){}
  return {ok:true,key:key,amt:amt,price:price,place:'wanbao'};
}
function econFangshiHtml(){
  econGoodsEnsureNames();
  const g=ECON_GOODS.xiacao,stock=Math.floor(econGoodsStock('xiacao'));
  const buy=econGoodsPrice('xiacao','buy','fangshi'),sell=econGoodsPrice('xiacao','sell','fangshi');
  let h='<div class="econ-fangshi" id="econ-fangshi"><b>坊市・仙草</b>';
  h+='<div class="sm">庫存 '+stock+' 株｜買入 '+buy+' 下品／株｜賣出 '+sell+' 下品／株</div>';
  h+='<div class="sm dim">'+g.note+'。前期食物仍靠漿果叢、狩獵與村莊交易。</div>';
  h+='<div class="jobs">';
  h+='<button class="btn pri" data-econ-fs="buy" data-k="xiacao">買入 1 株仙草（'+buy+' 石）</button>';
  h+='<button class="btn" data-econ-fs="sell" data-k="xiacao">賣出 1 株仙草（'+sell+' 石）</button>';
  h+='</div></div>';
  return h;
}
function econWanbaoHtml(){
  econGoodsEnsureNames();
  const g=ECON_GOODS.xiacao,stock=Math.floor(econGoodsStock('xiacao'));
  const sell=econGoodsPrice('xiacao','sell','wanbao');
  let h='<div class="econ-wanbao" id="econ-wanbao"><b>萬寶樓・仙草寄賣</b>';
  h+='<div class="sm">庫存 '+stock+' 株｜寄賣 '+sell+' 下品／株（略優於坊市）</div>';
  h+='<div class="sm dim">拍賣會亦可能上架「仙草 ×'+g.aucN+'」（底價約 '+g.aucBase+' 下品）。</div>';
  h+='<div class="jobs"><button class="btn" data-econ-wb="sell" data-k="xiacao">寄賣 1 株仙草（'+sell+' 石）</button></div></div>';
  return h;
}

function econSellToCity(who,res,amt,cityId){
  if(!econFlag('market')&&!econFlag('treasury')&&!econFlag('shop')&&!econFlag('newBuildings'))return {ok:false,reason:'flag-off'};
  amt=Math.floor(+amt||0);if(amt<=0)return {ok:false,reason:'amt'};
  const price=ECON_GOODS[res]?(econGoodsPrice(res,'sell','fangshi')*amt):Math.max(1,Math.round(amt*econMarketPrice(res,1)));
  if(who==='vault'||who==='sect'){
    if(S.res&&(S.res[res]||0)<amt)return {ok:false,reason:'no-res'};
    S.res[res]-=amt;
  }
  econGrant(who==='vault'||who==='sect'?'vault':who,price,'sell:'+(cityId||'city')+':'+res,'xia');
  econEmit('econ:sell',{res:res,amt:amt,price:price,cityId:cityId});
  return {ok:true,price:price};
}

// §7 目錄與 register 已移至 econ_buildings.js（載入較後會覆寫 API）
function econRegisterBuildings(){
  if(typeof econRegisterNewBuildings==='function')return econRegisterNewBuildings();
  return {ok:false,reason:'no-catalog',added:[]};
}


var ECON_TRADE_TUNE={
  travelSec:24,   // 待確認：單程出行秒數
  tradeSec:4,     // 待確認：現場成交秒數
  feeXia:2,       // 待確認：外事交易費（下品）
  leadCutXia:1,   // 待確認：帶隊弟子分紅（下品）
  budgetPct:0.20, // 舊單一占比（僅當玩家曾明示 userSet.budgetPct 時沿用）
  autoEvery:120,  // 自動出行間隔：120 現實秒＝2 年（1 分＝1 年）
  floorPct:0.50,  // 總庫至少留 50%
  floorMinXia:50  // 總庫至少留 50 下品；與 floorPct 取高
};
// 對應裝備品階 QN（g12.js 凡品～法寶，g22.js 再加仙器）。使用者示例 普通5／稀有10／珍貴20／至寶35 映到前三階＋其餘線性插值至 35%。
var ECON_AUC_TIER_USER=[0.05,0.10,0.20,0.35];
var ECON_AUC_LOT_TIER={core:'凡品',rec:'良品',lz:'良品',xs:'良品',xiacao:'良品',tp:'精品',xt:'精品',miji:'靈器',gear:'靈器',gf:'法寶',xfl:'仙器'};
var ECON_TRADE_NEED='需指派外事或有職位弟子帶隊';
var ECON_TRADE_ST={go:'前往中',trade:'交易中',auc:'拍賣中',back:'返程',done:'完成'};
function econTradeIsClient(){
  try{if(typeof v48Client==='function'&&v48Client())return true;}catch(e){}
  try{if(typeof v49Client==='function'&&v49Client())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  return false;
}
function econHasWaishitang(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.buildings)return false;
  return T.buildings.some(function(b){return b&&b.type==='waishitang'&&b.built&&!b.broken;});
}
function econTradeRegisterFees(){
  try{
    if(typeof econFeeRegister==='function'){
      econFeeRegister('tradeFee',{label:'外事交易費',defCur:'lingshi',defAmt:ECON_TRADE_TUNE.feeXia,kind:'fee'});
      econFeeRegister('tradeLeadCut',{label:'外事帶隊分紅',defCur:'lingshi',defAmt:ECON_TRADE_TUNE.leadCutXia,kind:'payout'});
    }
  }catch(e){}
}
function econTradeEnsure(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(!T.econ.trades||typeof T.econ.trades!=='object')T.econ.trades={nextId:1,missions:[],log:[]};
  if(!Array.isArray(T.econ.trades.missions))T.econ.trades.missions=[];
  if(!Array.isArray(T.econ.trades.log))T.econ.trades.log=[];
  if(!T.econ.trades.nextId)T.econ.trades.nextId=1;
  if(T.econ.trades.autoOn==null)T.econ.trades.autoOn=true;
  if(T.econ.trades.autoT==null)T.econ.trades.autoT=0;
  if(!T.econ.trades.user||typeof T.econ.trades.user!=='object')T.econ.trades.user={};
  if(!T.econ.trades.userSet||typeof T.econ.trades.userSet!=='object')T.econ.trades.userSet={};
  return T.econ.trades;
}
function econAucTierNames(){
  try{if(typeof QN!=='undefined'&&Array.isArray(QN)&&QN.length)return QN.slice();}catch(e){}
  return ['凡品','良品','精品','靈器','法寶','仙器'];
}
function econAucTierDefaultMap(){
  const names=econAucTierNames(),out={},U=ECON_AUC_TIER_USER||[0.05,0.10,0.20,0.35];
  if(names.length<=1){if(names[0])out[names[0]]=U[0];return out;}
  if(names.length===U.length){for(let i=0;i<names.length;i++)out[names[i]]=U[i];return out;}
  if(names.length>U.length){
    const head=Math.min(3,U.length-1);
    for(let i=0;i<head;i++)out[names[i]]=U[i];
    const rest=names.length-head,lo=U[head-1],hi=U[U.length-1];
    for(let i=0;i<rest;i++)out[names[head+i]]=lo+(hi-lo)*((i+1)/rest);
    return out;
  }
  for(let i=0;i<names.length;i++){
    const t=i/(names.length-1),src=t*(U.length-1),a=Math.floor(src),b=Math.min(U.length-1,a+1),f=src-a;
    out[names[i]]=U[a]*(1-f)+U[b]*f;
  }
  return out;
}
function econAucAutoEnsure(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(!T.econ.aucAuto||typeof T.econ.aucAuto!=='object')T.econ.aucAuto={on:true,cats:{},consign:{},log:[]};
  const A=T.econ.aucAuto;
  if(A.on==null)A.on=true;
  if(!A.cats||typeof A.cats!=='object')A.cats={};
  if(!A.consign||typeof A.consign!=='object')A.consign={};
  if(!Array.isArray(A.log))A.log=[];
  if(!A.userSet||typeof A.userSet!=='object')A.userSet={};
  if(!A.budgetByTier||typeof A.budgetByTier!=='object')A.budgetByTier={};
  const defs=econAucTierDefaultMap();
  for(const n in defs){
    if(A.budgetByTier[n]==null||!isFinite(+A.budgetByTier[n]))A.budgetByTier[n]=defs[n];
  }
  // 舊存檔單一 budgetPct：僅當玩家明示 userSet.budgetPct 才保留；否則不把 0.20 寫進各品階
  if(A.budgetPct!=null&&isFinite(+A.budgetPct)&&!(A.userSet&&A.userSet.budgetPct)){
    /* keep field for compatibility but ignore for auto spend */
  }
  return A;
}
function econAucLotTierName(lot){
  const names=econAucTierNames();
  const L=lot||{};
  if(L.q!=null&&isFinite(+L.q)){
    const i=Math.max(0,Math.min(names.length-1,Math.floor(+L.q)));
    return names[i];
  }
  const label=String(L.tier||L.rar||L.rarity||'');
  if(label&&names.indexOf(label)>=0)return label;
  const text=String(L.n||L.name||'');
  for(let i=names.length-1;i>=0;i--)if(text.indexOf(names[i])>=0)return names[i];
  const key=L.k||L.key;
  if(key&&ECON_AUC_LOT_TIER[key]&&names.indexOf(ECON_AUC_LOT_TIER[key])>=0)return ECON_AUC_LOT_TIER[key];
  const p=+(L.p!=null?L.p:(L.base!=null?L.base:L.price))||0;
  if(p>0){
    let lo=16,hi=90;
    try{
      if(typeof AUC_LOTS!=='undefined'&&AUC_LOTS.length){
        const ps=AUC_LOTS.map(function(x){return +x.p||0;}).filter(function(x){return x>0;});
        if(ps.length){lo=Math.min.apply(null,ps);hi=Math.max.apply(null,ps);}
      }
    }catch(e){}
    if(hi>lo){
      const i=Math.round((p-lo)/(hi-lo)*(names.length-1));
      return names[Math.max(0,Math.min(names.length-1,i))];
    }
  }
  return names[0];
}
function econAucTierPctOf(name,A){
  A=A||econAucAutoEnsure();
  const defs=econAucTierDefaultMap();
  const n=name||econAucTierNames()[0];
  let pct=defs[n];
  if(A&&A.userSet&&A.userSet.budgetPct&&A.budgetPct!=null&&isFinite(+A.budgetPct)&&!(A.userSet&&A.userSet.budgetTiers)){
    pct=+A.budgetPct;
  }else if(A&&A.budgetByTier&&A.budgetByTier[n]!=null&&isFinite(+A.budgetByTier[n])){
    pct=+A.budgetByTier[n];
  }
  if(pct>1)pct=pct/100;
  if(!(pct>=0&&isFinite(pct)))pct=defs[n]||0.05;
  return Math.max(0,Math.min(1,pct));
}
function econTradeResKeys(){
  let keys=['wood','stone','fiber','food','iron','herb','xiacao'];
  try{if(typeof RES_KEYS!=='undefined'&&Array.isArray(RES_KEYS))keys=RES_KEYS.slice();}catch(e){}
  if(keys.indexOf('xiacao')<0)keys.push('xiacao');
  return keys.filter(function(k){return k&&k!=='lingshi';});
}
function econTradeResName(k){
  try{if(typeof RES_NAMES!=='undefined'&&RES_NAMES[k])return RES_NAMES[k];}catch(e){}
  const M={wood:'木材',stone:'石材',fiber:'纖維',food:'食物',iron:'鐵',herb:'藥草',xiacao:'仙草'};
  return M[k]||k;
}
function econTradeEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function econTradePostOf(u){
  try{if(typeof econPostOf==='function')return econPostOf(u);}catch(e){}
  return (u&&(u.office||u.econOffice))||'';
}
function econTradeCanLead(u){
  if(!u||u.dead)return false;
  try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return true;}catch(e){}
  if(u.kind==='player')return true;
  if(u.kind&&u.kind!=='disciple')return false;
  return !!econTradePostOf(u);
}
function econTradeUnitOf(id,T){
  T=T||(typeof S!=='undefined'?S:null);
  let u=null;
  try{if(typeof unitById==='function')u=unitById(+id);}catch(e){}
  if(!u&&T&&T.units)u=T.units.find(function(x){return x&&(x.id===id||String(x.id)===String(id));});
  return u||null;
}
function econTradeLeaders(){
  const T=typeof S!=='undefined'?S:null;if(!T||!T.units)return [];
  const L=[];
  for(const u of T.units){
    if(!u||u.dead)continue;
    if(u.kind!=='disciple'&&u.kind!=='player')continue;
    if(!econTradeCanLead(u))continue;
    L.push(u);
  }
  L.sort(function(a,b){
    const pa=econTradePostOf(a),pb=econTradePostOf(b);
    const wa=pa==='waishi'?0:(a.kind==='player'?2:1);
    const wb=pb==='waishi'?0:(b.kind==='player'?2:1);
    return wa-wb;
  });
  return L;
}
function econTradeIdleHelpers(exceptIds){
  const ex={};(exceptIds||[]).forEach(function(id){ex[id]=1;});
  const T=typeof S!=='undefined'?S:null;if(!T||!T.units)return [];
  return T.units.filter(function(u){
    if(!u||u.dead||u.kind!=='disciple')return false;
    if(ex[u.id])return false;
    try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return false;}catch(e){}
    if(u.econTradeMid)return false;
    const job=u.job;
    if(job&&job!=='idle'&&job!=='none'&&job!=='rest')return false;
    return true;
  });
}
function econTradeHomeXY(){
  try{
    const T=S;if(T&&T.buildings){
      const b=T.buildings.find(function(x){return x&&x.type==='waishitang'&&x.built;});
      if(b)return {x:(b.i||0)+1,y:(b.j||0)+1};
    }
  }catch(e){}
  try{if(typeof sectCenter==='function'){const c=sectCenter();return {x:c.x,y:c.y};}}catch(e){}
  return {x:8,y:8};
}
function econTradeDestXY(dest,destId){
  const home=econTradeHomeXY();
  if(dest==='village'){
    try{
      const vs=S&&S.villages;
      let v=null;
      if(destId!=null&&vs)v=vs.find(function(x){return x&&(x.id===destId||String(x.id)===String(destId));});
      if(!v&&vs)v=vs.find(function(x){return x&&x.type!=='bandit'&&!x.destroyed;});
      if(v&&v.x!=null)return {x:v.x,y:v.y,name:v.name||'村莊'};
    }catch(e){}
  }
  let Nmap=80;
  try{if(typeof N==='number')Nmap=N;}catch(e){}
  const cx=home.x,cy=home.y;
  const left=cx,right=Nmap-1-cx,top=cy,bot=Nmap-1-cy;
  const m=Math.min(left,right,top,bot);
  let x=cx,y=cy;
  if(m===left)x=1;else if(m===right)x=Nmap-2;else if(m===top)y=1;else y=Nmap-2;
  const name=dest==='wanbao'?'萬寶樓':(dest==='fangshi'?'坊市':'村莊');
  return {x:x,y:y,name:name};
}
function econTradeUnitPrice(res,side,dest){
  const place=dest==='wanbao'?'wanbao':'fangshi';
  if(typeof ECON_GOODS!=='undefined'&&ECON_GOODS[res]&&typeof econGoodsPrice==='function')return econGoodsPrice(res,side,place);
  let p=1;
  try{if(typeof econMarketPrice==='function')p=Math.max(1,Math.round(econMarketPrice(res,1)));}catch(e){}
  if(dest==='wanbao'&&side==='sell')p=Math.max(1,Math.round(p*1.15));
  if(dest==='wanbao'&&side==='buy')p=Math.max(1,Math.round(p*1.1));
  return Math.max(1,p);
}
function econTradeSendUnit(u,m,tx,ty){
  if(!u)return;
  u.econTradeMid=m.id;
  try{if(u.inside&&typeof exitBuilding==='function')exitBuilding(u);}catch(e){}
  try{if(typeof setTask==='function')setTask(u,{type:'move',x:tx,y:ty});}catch(e){}
  try{if(typeof pathTo==='function')pathTo(u,tx,ty);}catch(e){}
}
function econTradeRelease(u){
  if(!u)return;
  try{delete u.econTradeMid;}catch(e){u.econTradeMid=null;}
  try{if(typeof setTask==='function')setTask(u,null);}catch(e){}
}
function econTradeParty(m,T){
  const ids=[m.leaderId].concat(m.helperIds||[]);
  const out=[];
  for(const id of ids){const u=econTradeUnitOf(id,T);if(u)out.push(u);}
  return out;
}
function econTradeWalk(u,dt,tx,ty){
  if(!u)return;
  try{if(u.inside&&typeof exitBuilding==='function')exitBuilding(u);}catch(e){}
  try{if(typeof approachRect==='function'){approachRect(u,dt,Math.floor(tx),Math.floor(ty),1,0.8);return;}}catch(e){}
  try{if(typeof walkTo==='function'){walkTo(u,tx,ty,dt);return;}}catch(e){}
  try{if(typeof pathTo==='function')pathTo(u,tx,ty);}catch(e){}
  if(u.x!=null){
    const dx=tx-u.x,dy=ty-u.y,d=Math.hypot(dx,dy)||1;
    const sp=1.6*Math.max(+dt||0,0.05);
    if(d<=sp){u.x=tx;u.y=ty;}else{u.x+=dx/d*sp;u.y+=dy/d*sp;}
  }
}
function econTradeLog(st,text){
  if(!st)return;
  st.log.unshift({t:(typeof econNow==='function'?econNow():0),m:text});
  if(st.log.length>30)st.log.length=30;
}
function econTradeLaunch(opt){
  opt=opt||{};
  if(econTradeIsClient())return {ok:false,reason:'client'};
  const T=typeof S!=='undefined'?S:null;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  const st=econTradeEnsure(T);
  const kind=opt.kind||'trade';
  let leader=opt.leader||null;
  if(!leader&&opt.leaderId!=null)leader=econTradeUnitOf(opt.leaderId,T);
  if(!leader||!econTradeCanLead(leader))return {ok:false,reason:'no-leader',msg:ECON_TRADE_NEED};
  if(leader.econTradeMid){
    const live=(st.missions||[]).find(function(x){return x&&x.id===leader.econTradeMid&&x.state!=='done';});
    if(live)return {ok:false,reason:'busy',msg:'帶隊弟子尚在出行'};
  }
  const helpers=[];
  const hid=opt.helperIds||opt.helpers||[];
  for(const id of hid){
    const u=typeof id==='object'?id:econTradeUnitOf(id,T);
    if(u&&u.kind==='disciple'&&!u.dead&&u.id!==leader.id)helpers.push(u);
  }
  const dest=opt.dest||(kind==='auc'?'wanbao':'fangshi');
  const destXY=econTradeDestXY(dest,opt.destId);
  const home=econTradeHomeXY();
  const now=(typeof econNow==='function'?econNow():(T.time||0));
  const travel=ECON_TRADE_TUNE.travelSec;
  const m={
    id:st.nextId++,kind:kind,side:opt.side==='buy'?'buy':'sell',
    res:opt.res||'xiacao',amt:Math.max(0,Math.floor(+opt.amt||0)),
    dest:dest,destId:opt.destId||null,destName:destXY.name||dest,
    leaderId:leader.id,helperIds:helpers.map(function(u){return u.id;}),
    state:'go',t0:now,eta:now+travel,travelSec:travel,tradeSec:ECON_TRADE_TUNE.tradeSec,
    unitPrice:0,total:0,paidXia:0,fee:0,tx:destXY.x,ty:destXY.y,hx:home.x,hy:home.y,result:null
  };
  if(kind!=='auc'){
    const res=m.res,amt=m.amt,side=m.side;
    if(!(amt>0))return {ok:false,reason:'amt'};
    const keys=econTradeResKeys();
    if(keys.indexOf(res)<0)return {ok:false,reason:'bad-res'};
    const unitP=econTradeUnitPrice(res,side,dest);
    const total=unitP*amt;
    let feeAmt=ECON_TRADE_TUNE.feeXia;
    try{if(typeof econFeeGet==='function')feeAmt=+econFeeGet('tradeFee').amt||0;}catch(e){}
    if(side==='sell'){
      if(!T.res||(T.res[res]||0)<amt)return {ok:false,reason:'no-res'};
    }else{
      const have=(typeof econBagXia==='function')?econBagXia(T.econ.vault):((T.res&&T.res.lingshi)||0);
      if(have<total+feeAmt)return {ok:false,reason:'insufficient'};
    }
    if(feeAmt>0&&typeof econCharge==='function'){
      const ch=econCharge('vault',feeAmt,'tradeFee');
      if(!ch.ok&&ch.reason!=='flag-off')return {ok:false,reason:ch.reason||'fee'};
      if(!ch.ok)feeAmt=0;
    }
    if(side==='sell')T.res[res]-=amt;
    else{
      const pay=typeof econCharge==='function'?econCharge('vault',total,'trade-buy:'+res):{ok:false,reason:'no-charge'};
      if(!pay.ok){
        if(feeAmt>0&&typeof econGrant==='function')econGrant('vault',feeAmt,'tradeFee-refund','xia');
        return pay;
      }
    }
    m.unitPrice=unitP;m.total=total;m.paidXia=side==='buy'?total:0;m.fee=feeAmt;
  }
  st.missions.push(m);
  const party=[leader].concat(helpers);
  for(const u of party)econTradeSendUnit(u,m,destXY.x,destXY.y);
  try{if(typeof econEmit==='function')econEmit('econ:trade:launch',{id:m.id,kind:kind,side:m.side,res:m.res,amt:m.amt});}catch(e){}
  return {ok:true,mission:m,msg:'隊伍已出發'};
}
function econTradeSettle(m,T){
  T=T||(typeof S!=='undefined'?S:null);
  if(m.kind==='auc'){
    m.result=econAucAutoPlay(m);
    return m.result;
  }
  const unitP=econTradeUnitPrice(m.res,m.side,m.dest);
  m.unitPrice=unitP;
  const actual=unitP*m.amt;
  if(m.side==='sell'){
    if(typeof econGrant==='function')econGrant('vault',actual,'trade-sell:'+m.res,'xia');
    m.total=actual;
    m.result={ok:true,side:'sell',res:m.res,amt:m.amt,xia:actual,note:'賣出 '+econTradeResName(m.res)+' ×'+m.amt+' 予'+ (m.destName||m.dest)+'，收入 '+actual+' 下品'};
  }else{
    const paid=m.paidXia||0;
    if(actual<paid&&typeof econGrant==='function')econGrant('vault',paid-actual,'trade-buy-refund','xia');
    if(actual>paid&&typeof econCharge==='function'){
      const ch=econCharge('vault',actual-paid,'trade-buy-extra');
      if(!ch.ok){
        const give=Math.max(0,Math.floor(paid/unitP));
        if(typeof econGoodsGain==='function')econGoodsGain(m.res,give);else if(T.res)T.res[m.res]=(T.res[m.res]||0)+give;
        if(give*unitP<paid&&typeof econGrant==='function')econGrant('vault',paid-give*unitP,'trade-buy-partial','xia');
        m.result={ok:true,side:'buy',res:m.res,amt:give,xia:give*unitP,note:'購入 '+econTradeResName(m.res)+' ×'+give+'（預算不足，部分成交）'};
      }else{
        if(typeof econGoodsGain==='function')econGoodsGain(m.res,m.amt);else if(T.res)T.res[m.res]=(T.res[m.res]||0)+m.amt;
        m.result={ok:true,side:'buy',res:m.res,amt:m.amt,xia:actual,note:'購入 '+econTradeResName(m.res)+' ×'+m.amt+'，花費 '+actual+' 下品'};
      }
    }else{
      if(typeof econGoodsGain==='function')econGoodsGain(m.res,m.amt);else if(T.res)T.res[m.res]=(T.res[m.res]||0)+m.amt;
      m.result={ok:true,side:'buy',res:m.res,amt:m.amt,xia:actual,note:'購入 '+econTradeResName(m.res)+' ×'+m.amt+'，花費 '+actual+' 下品'};
    }
    m.total=actual;
  }
  const leader=econTradeUnitOf(m.leaderId,T);
  if(leader){
    try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(leader)){/* 主角不受罰、也不強制抽成限制 */}else if(typeof econFeePay==='function')econFeePay(leader,'tradeLeadCut');}catch(e){}
  }
  return m.result;
}
function econTradeFinish(m,T,st,now){
  if(m.state==='done')return;
  const party=econTradeParty(m,T);
  if(!m.result)econTradeSettle(m,T);
  m.state='done';
  m.eta=now;
  for(const u of party)econTradeRelease(u);
  const note=(m.result&&m.result.note)||'行程結束';
  econTradeLog(st,note);
  if(m.kind==='auc'){
    const A=econAucAutoEnsure(T);
    A.log.unshift({t:now,m:note,won:(m.result&&m.result.won)||[],sold:(m.result&&m.result.sold)||[]});
    if(A.log.length>20)A.log.length=20;
  }
}
function econTradeTick(dt){
  if(econTradeIsClient())return;
  const T=typeof S!=='undefined'?S:null;if(!T||!T.econ)return;
  const st=econTradeEnsure(T);
  const now=(typeof econNow==='function'?econNow():(T.time||0));
  dt=+dt||0;
  for(const m of st.missions){
    if(!m||m.state==='done')continue;
    const party=econTradeParty(m,T);
    const tr=m.travelSec||ECON_TRADE_TUNE.travelSec;
    const td=m.tradeSec||ECON_TRADE_TUNE.tradeSec;
    const t0=m.t0||0;
    const goEnd=t0+tr, tradeEnd=t0+tr+td, backEnd=t0+tr+td+tr;
    if(now>=backEnd){
      if(m.state==='go'){
        m.state=m.kind==='auc'?'auc':'trade';
        if(m.state==='auc'||m.state==='trade'){/* settle below */}
      }
      econTradeFinish(m,T,st,now);
      continue;
    }
    if(m.state==='go'){
      for(const u of party)econTradeWalk(u,dt,m.tx,m.ty);
      if(now>=goEnd){
        m.state=m.kind==='auc'?'auc':'trade';
        m.eta=tradeEnd;
        if(m.state==='auc')econTradeSettle(m,T);
      }else{m.eta=goEnd;continue;}
    }
    if(m.state==='trade'||m.state==='auc'){
      if(m.state==='auc'&&!m.result)econTradeSettle(m,T);
      if(now>=tradeEnd){
        if(!m.result)econTradeSettle(m,T);
        m.state='back';
        m.eta=backEnd;
        for(const u of party)econTradeSendUnit(u,m,m.hx,m.hy);
      }else{m.eta=tradeEnd;continue;}
    }
    if(m.state==='back'){
      for(const u of party)econTradeWalk(u,dt,m.hx,m.hy);
      if(now>=backEnd)econTradeFinish(m,T,st,now);
      else m.eta=backEnd;
    }
  }
  try{econAucWatch();}catch(e){}
  try{
    if(st.autoOn){
      st.autoT=(st.autoT||0)+dt;
      const every=ECON_TRADE_TUNE.autoEvery||120;
      if(st.autoT>=every){
        st.autoT=0;
        const r=econTradeAutoOnce();
        if(r&&r.ok)try{if(typeof toast==='function')toast('外事弟子已自動出行');}catch(e2){}
      }
    }
  }catch(e){}
}
function econAucCats(){
  const out=[];
  try{
    if(typeof AUC_LOTS!=='undefined'&&Array.isArray(AUC_LOTS)){
      for(const L of AUC_LOTS)if(L&&L.k)out.push({k:L.k,n:L.n||L.k});
    }
  }catch(e){}
  if(!out.length){
    [{k:'lz',n:'千年靈芝'},{k:'xt',n:'玄鐵'},{k:'core',n:'妖丹'},{k:'tp',n:'突破丹'},{k:'xs',n:'洗髓丹'},{k:'rec',n:'丹方'},{k:'miji',n:'秘籍'},{k:'gf',n:'功法'},{k:'gear',n:'靈器'},{k:'xfl',n:'仙凡令'},{k:'xiacao',n:'仙草'}].forEach(function(x){out.push(x);});
  }
  return out;
}
function econAucWant(k){
  const A=econAucAutoEnsure();
  if(!A||!A.cats)return true;
  if(A.cats[k]==null)return true;
  return !!A.cats[k];
}

function econTradeFmtXia(xia){
  try{if(typeof econFmtXiaGrade==='function')return econFmtXiaGrade(xia);}catch(e){}
  try{
    if(typeof econFromXia==='function'){
      const b=econFromXia(xia),parts=[];
      if(b.ji)parts.push(b.ji+' 極品');
      if(b.shang)parts.push(b.shang+' 上品');
      if(b.zhong)parts.push(b.zhong+' 中品');
      if(b.xia||!parts.length)parts.push(b.xia+' 下品');
      return parts.join(' ');
    }
  }catch(e){}
  return Math.floor(+xia||0)+' 下品';
}
function econTradeVaultXia(T){
  T=T||(typeof S!=='undefined'?S:null);
  try{if(typeof econBagXia==='function'&&T&&T.econ)return +econBagXia(T.econ.vault)||0;}catch(e){}
  try{return +((T&&T.res&&T.res.lingshi)||0)||0;}catch(e){return 0;}
}
function econTradeFloorXia(T){
  const v=econTradeVaultXia(T);
  const pct=ECON_TRADE_TUNE.floorPct!=null?+ECON_TRADE_TUNE.floorPct:0.50;
  const mn=ECON_TRADE_TUNE.floorMinXia!=null?+ECON_TRADE_TUNE.floorMinXia:50;
  return Math.max(mn,Math.floor(v*pct));
}
function econTradeSpendable(T){
  return Math.max(0,econTradeVaultXia(T)-econTradeFloorXia(T));
}
function econTradeFreeLeaders(){
  return econTradeLeaders().filter(function(u){
    if(!u||u.dead||u.kind!=='disciple')return false;
    try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return false;}catch(e){}
    if(u.econTradeMid){
      try{
        const st=econTradeEnsure();
        const live=(st.missions||[]).find(function(x){return x&&x.id===u.econTradeMid&&x.state!=='done';});
        if(live)return false;
      }catch(e){return false;}
    }
    return true;
  });
}
function econTradeStockOf(k,T){
  T=T||(typeof S!=='undefined'?S:null);
  return Math.floor(+((T&&T.res&&T.res[k])||0)||0);
}
function econTradePlanAuto(){
  const T=typeof S!=='undefined'?S:null;if(!T)return null;
  const keys=econTradeResKeys();
  const rows=keys.map(function(k){return {k:k,n:econTradeStockOf(k,T)};});
  if(!rows.length)return null;
  const vals=rows.map(function(r){return r.n;}).slice().sort(function(a,b){return a-b;});
  const med=vals[Math.floor(vals.length/2)]||0;
  const short=rows.filter(function(r){return r.n<Math.max(8,med*0.4);}).sort(function(a,b){return a.n-b.n;});
  const surplus=rows.filter(function(r){return r.n>Math.max(20,med*1.8)&&r.n>=10;}).sort(function(a,b){return b.n-a.n;});
  const leaders=econTradeFreeLeaders();
  const leader=leaders[0];
  if(!leader)return {ok:false,reason:'no-leader'};
  const spend=econTradeSpendable(T);
  let fee=ECON_TRADE_TUNE.feeXia||0;
  try{if(typeof econFeeGet==='function')fee=+econFeeGet('tradeFee').amt||0;}catch(e){}
  if(surplus.length){
    const r=surplus[0];
    const keep=Math.max(8,Math.ceil(med*1.2));
    const amt=Math.max(1,Math.floor((r.n-keep)*0.5));
    if(amt>0){
      const dest=(r.k==='xiacao'?'wanbao':'fangshi');
      return {ok:true,side:'sell',res:r.k,amt:amt,dest:dest,leader:leader,leaderId:leader.id,why:'surplus'};
    }
  }
  if(short.length&&spend>fee+1){
    const r=short[0];
    const dest='fangshi';
    const unit=econTradeUnitPrice(r.k,'buy',dest);
    const maxN=Math.floor((spend-fee)/Math.max(1,unit));
    const want=Math.max(1,Math.min(10,Math.ceil(Math.max(8,med*0.4)-r.n)));
    const amt=Math.max(0,Math.min(want,maxN));
    if(amt>0)return {ok:true,side:'buy',res:r.k,amt:amt,dest:dest,leader:leader,leaderId:leader.id,why:'short'};
  }
  return {ok:false,reason:'nothing'};
}
function econTradeMergeUser(plan){
  const st=econTradeEnsure();if(!plan||!plan.ok)return plan;
  const u=st.user||{},set=st.userSet||{};
  const out=Object.assign({},plan);
  if(set.side&&u.side)out.side=u.side;
  if(set.res&&u.res)out.res=u.res;
  if(set.amt&&u.amt>0)out.amt=Math.floor(+u.amt);
  if(set.dest&&u.dest)out.dest=u.dest;
  if(set.leader&&u.leaderId){
    const L=econTradeUnitOf(u.leaderId);
    if(L&&econTradeCanLead(L)){out.leader=L;out.leaderId=L.id;}
  }
  if(set.helpers&&Array.isArray(u.helperIds))out.helperIds=u.helperIds;
  return out;
}
function econTradeMarkUser(field,val){
  const st=econTradeEnsure();if(!st)return;
  st.userSet[field]=1;
  if(field==='helpers')st.user.helperIds=val;
  else st.user[field]=val;
}
function econTradeResetAuto(){
  const st=econTradeEnsure();
  if(st){st.user={};st.userSet={};st.autoOn=true;}
  const A=econAucAutoEnsure();
  if(A){A.userSet={};A.on=true;A.budgetByTier=econAucTierDefaultMap();delete A.budgetPct;A.cats={};A.consign={};delete A.budgetXia;}
  return {ok:true};
}
function econTradeAutoOnce(){
  if(econTradeIsClient())return {ok:false,reason:'client'};
  const T=typeof S!=='undefined'?S:null;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  if(!econHasWaishitang(T))return {ok:false,reason:'no-building'};
  const st=econTradeEnsure(T);
  if(!st.autoOn)return {ok:false,reason:'off'};
  const plan=econTradeMergeUser(econTradePlanAuto());
  if(!plan||!plan.ok)return plan||{ok:false,reason:'no-plan'};
  return econTradeLaunch(plan);
}
function econAucDecide(){
  const T=typeof S!=='undefined'?S:null;
  const A=econAucAutoEnsure(T);if(!A)return;
  if(!(A.userSet&&A.userSet.budgetPct)&&!(A.userSet&&A.userSet.budgetTiers)&&!(A.userSet&&A.userSet.budgetXia)){
    A.budgetByTier=Object.assign({},econAucTierDefaultMap(),A.budgetByTier||{});
    const defs=econAucTierDefaultMap();
    for(const n in defs)if(!(A.userSet&&A.userSet.budgetTiers))A.budgetByTier[n]=defs[n];
    delete A.budgetXia;
  }
  if(!(A.userSet&&A.userSet.consign)){
    A.consign={};
    const xc=econTradeStockOf('xiacao',T);
    if(xc>=15)A.consign.xiacao=Math.max(1,Math.floor((xc-8)*0.4));
  }
  if(!(A.userSet&&A.userSet.cats)){
    A.cats={};
  }
}
function econAucWatch(){
  if(econTradeIsClient())return;
  const T=typeof S!=='undefined'?S:null;if(!T||!T.econ)return;
  const A=econAucAutoEnsure(T);if(!A||!A.on)return;
  if(!econHasWaishitang(T))return;
  let auc=null;
  try{auc=T.flags&&T.flags.v48&&T.flags.v48.auc;}catch(e){}
  if(!auc||auc.over){A.pending=false;return;}
  const st=econTradeEnsure(T);
  const live=(st.missions||[]).some(function(m){return m&&m.kind==='auc'&&m.state!=='done';});
  if(live){A.pending=false;A.seenT0=auc.t0;return;}
  if(A.seenT0===auc.t0&&!A.pending)return;
  const r=econAucOnStart();
  A.seenT0=auc.t0;
  if(r&&r.ok)A.pending=false;
  else if(r&&(r.reason==='busy'||r.reason==='no-leader'))A.pending=true;
  else A.pending=false;
}

function econAucBudget(lot){
  const A=econAucAutoEnsure();
  const T=typeof S!=='undefined'?S:null;
  const vault=econTradeVaultXia(T);
  const spend=econTradeSpendable(T);
  const tier=econAucLotTierName(lot);
  let pct=econAucTierPctOf(tier,A);
  let cap=Math.max(0,Math.floor(vault*pct));
  if(A&&A.userSet&&A.userSet.budgetXia&&A.budgetXia!=null&&isFinite(+A.budgetXia)&&+A.budgetXia>0){
    cap=Math.min(cap,Math.floor(+A.budgetXia));
  }
  if(cap>spend)cap=spend;
  return Math.min(cap,Math.max(0,Math.floor(vault)),Math.max(0,spend));
}
function econAucAutoPlay(mission){
  const T=typeof S!=='undefined'?S:null;
  const A=econAucAutoEnsure(T);
  const sold=[];
  if(A&&A.consign){
    for(const k in A.consign){
      const q=Math.floor(+A.consign[k]||0);if(q<=0)continue;
      const have=(T.res&&T.res[k])||0;
      const n=Math.min(q,have);if(n<=0)continue;
      let r=null;
      try{
        if(typeof ECON_GOODS!=='undefined'&&ECON_GOODS[k]&&typeof econWanbaoSell==='function')r=econWanbaoSell(k,n,'vault');
        else if(typeof econSellToCity==='function')r=econSellToCity('vault',k,n,'wanbao');
      }catch(e){}
      if(r&&r.ok)sold.push({k:k,n:n,price:r.price});
    }
  }
  const G=(T&&T.flags&&T.flags.v48)||{};
  const auc=G.auc;
  try{if(auc&&!Array.isArray(auc.log))auc.log=[];}catch(e){}
  const won=[];
  let spent=0;
  const budget=econAucBudget();
  if(!auc||auc.over){
    const note=sold.length?('未遇開槌；寄賣 '+sold.length+' 項'):'未遇開槌的拍賣會';
    return {ok:true,note:note,won:won,sold:sold,spent:0};
  }
  let guard=0;
  while(auc&&!auc.over&&guard++<80){
    let L=null;
    try{L=typeof aucLot==='function'?aucLot():(auc.lots&&auc.lots[auc.cur]);}catch(e){L=auc.lots&&auc.lots[auc.cur];}
    if(!L||L.done)break;
    const nextSmall=Math.ceil((+L.price||0)*1.1)+1;
    const haveLs=(T.res&&T.res.lingshi)||0;
    const want=econAucWant(L.k);
    const lotBudget=econAucBudget(L);
    if(L.lead===-1){
      // 已是本宗最高價（玩家手動出價中）——不棄標、也不另加隱藏優勢
      break;
    }
    if(!want||nextSmall>lotBudget||haveLs<nextSmall||nextSmall>econTradeSpendable(T)){
      try{if(typeof aucAct==='function')aucAct('pass');
      else{L.done='npc';if(typeof aucNext==='function')aucNext();else auc.cur=(auc.cur||0)+1;}}catch(e){L.done='npc';auc.cur=(auc.cur||0)+1;}
      continue;
    }
    if(typeof aucAct!=='function')break;
    let ok=false;
    try{ok=aucAct('small');}catch(e){ok=false;}
    if(!ok){try{aucAct('pass');}catch(e){L.done='npc';auc.cur=(auc.cur||0)+1;}continue;}
    if(L.done==='p'){won.push({k:L.k,n:L.n,price:L.price});spent+=L.price;}
  }
  const noteParts=[];
  if(won.length)noteParts.push('拍得 '+won.map(function(x){return x.n+'（'+x.price+' 下品）';}).join('、'));
  else noteParts.push('本場未拍得物品');
  if(sold.length){
    const inc=sold.reduce(function(s,x){return s+(+x.price||0);},0);
    noteParts.push('寄賣 '+sold.map(function(x){return econTradeResName(x.k)+'×'+x.n;}).join('、')+'，收入 '+inc+' 下品');
  }
  return {ok:true,note:noteParts.join('；'),won:won,sold:sold,spent:spent};
}
function econAucOnStart(){
  const T=typeof S!=='undefined'?S:null;if(!T||!T.econ)return {ok:false,reason:'no-state'};
  const A=econAucAutoEnsure(T);
  if(!A.on)return {ok:false,reason:'off'};
  if(!econHasWaishitang(T))return {ok:false,reason:'no-building'};
  econAucDecide();
  const leaders=econTradeFreeLeaders();
  const leader=leaders[0];
  if(!leader){
    const busy=econTradeLeaders().some(function(u){return u&&u.kind==='disciple'&&u.econTradeMid;});
    econTradeLog(econTradeEnsure(T),busy?'拍賣會開槌，待出行弟子返回後自動前往':('拍賣會開槌，但'+ECON_TRADE_NEED));
    return {ok:false,reason:busy?'busy':'no-leader',msg:busy?'帶隊弟子尚在出行':ECON_TRADE_NEED};
  }
  const helpers=econTradeIdleHelpers([leader.id]).slice(0,2);
  return econTradeLaunch({kind:'auc',dest:'wanbao',leader:leader,helperIds:helpers.map(function(u){return u.id;}),amt:0});
}
function econAucSet(patch){
  const A=econAucAutoEnsure();if(!A)return null;
  patch=patch||{};
  if(patch.on!=null)A.on=!!patch.on;
  if(patch.budgetPct!=null&&isFinite(+patch.budgetPct)){
    let p=+patch.budgetPct;if(p>1)p=p/100;A.budgetPct=Math.max(0,Math.min(1,p));
  }
  if(patch.budgetXia!=null)A.budgetXia=Math.max(0,Math.floor(+patch.budgetXia||0));
  if(patch.budgetTier!=null&&patch.budgetTierPct!=null){
    const names=econAucTierNames();
    const tn=String(patch.budgetTier);
    if(names.indexOf(tn)>=0){
      let p=+patch.budgetTierPct;if(p>1)p=p/100;
      A.budgetByTier=A.budgetByTier||{};
      A.budgetByTier[tn]=Math.max(0,Math.min(1,p));
    }
  }
  if(patch.cat!=null&&patch.k)A.cats[patch.k]=!!patch.cat;
  if(patch.cats&&typeof patch.cats==='object'){for(const k in patch.cats)A.cats[k]=!!patch.cats[k];}
  if(patch.consignKey!=null)A.consign[patch.consignKey]=Math.max(0,Math.floor(+patch.consignAmt||0));
  if(patch.consign&&typeof patch.consign==='object'){for(const k in patch.consign)A.consign[k]=Math.max(0,Math.floor(+patch.consign[k]||0));}
  return A;
}
function econTradeEtaTxt(m){
  const now=(typeof econNow==='function'?econNow():((typeof S!=='undefined'&&S&&S.time)||0));
  const left=Math.max(0,Math.ceil((m.eta||0)-now));
  return (typeof econPrettySpan==='function'?econPrettySpan(left):(left+' 秒'));
}
function econTradePanelHtml(){
  econTradeRegisterFees();
  const T=typeof S!=='undefined'?S:null;
  const st=econTradeEnsure(T);
  const A=econAucAutoEnsure(T);
  const keys=econTradeResKeys();
  const leaders=econTradeLeaders();
  const every=ECON_TRADE_TUNE.autoEvery||120;
  const left=Math.max(0,(every-(st.autoT||0)));
  const nextTxt=typeof econPrettySpan==='function'?econPrettySpan(left):(Math.ceil(left)+' 秒');
  let h='<div class="econ-trade" id="econ-trade">';
  h+='<div class="econ-task-h">外事堂</div>';
  if(st.autoOn)h+='<div class="sm">下次自動出行：'+econTradeEsc(nextTxt)+'</div>';
  else h+='<div class="sm">自動出行已關閉（可於進階設定恢復）</div>';
  const live=st.missions.filter(function(x){return x&&x.state!=='done';});
  if(live.length){
    h+='<div class="econ-task-h">進行中</div>';
    for(const m of live){
      const lead=econTradeUnitOf(m.leaderId);
      h+='<div class="econ-task-row sm">#'+m.id+' '+(m.kind==='auc'?'拍賣會':((m.side==='buy'?'購入':'賣出')+' '+econTradeEsc(econTradeResName(m.res))+' ×'+m.amt))+' → '+econTradeEsc(m.destName||m.dest);
      h+='　狀態：'+(ECON_TRADE_ST[m.state]||m.state)+'　剩餘 '+econTradeEtaTxt(m);
      h+='　帶隊：'+econTradeEsc((lead&&lead.name)||m.leaderId);
      if(m.result&&m.result.note)h+='<div>'+econTradeEsc(m.result.note)+'</div>';
      h+='</div>';
    }
  }else h+='<div class="sm dim">目前沒有出行隊伍</div>';
  const lastTrade=(st.log&&st.log[0])||null;
  h+='<div class="sm">最近交易：'+(lastTrade?econTradeEsc(lastTrade.m||''):'尚無紀錄')+'</div>';
  const lastAuc=(A.log&&A.log[0])||null;
  h+='<div class="sm">最近拍賣：'+(lastAuc?econTradeEsc(lastAuc.m||''):'尚無紀錄')+'</div>';
  const floorXia0=econTradeFloorXia(T),spendXia0=econTradeSpendable(T);
  h+='<div class="sm">總庫安全額：'+econTradeEsc(econTradeFmtXia(floorXia0))+'（至少一半，且不少於 50 下品）；可動用 '+econTradeEsc(econTradeFmtXia(spendXia0))+'</div>';
  h+='<details class="dt econ-tr-adv"><summary>自訂（進階）</summary>';
  h+='<div class="econ-task-h">外事出行</div>';
  h+='<div class="sm dim" id="econ-tr-need">'+econTradeEsc(ECON_TRADE_NEED)+'</div>';
  h+='<div class="econ-tr-form">';
  const us=st.user||{};
  h+='<label>方向 <select id="econ-tr-side" data-econ-trade="user-side"><option value="sell"'+(us.side==='sell'?' selected':'')+'>賣出</option><option value="buy"'+(us.side==='buy'?' selected':'')+'>購入</option></select></label> ';
  h+='<label>貨物 <select id="econ-tr-res" data-econ-trade="user-res">';
  for(const k of keys)h+='<option value="'+k+'"'+((us.res?us.res===k:k==='xiacao')?' selected':'')+'>'+econTradeEsc(econTradeResName(k))+'</option>';
  h+='</select></label> ';
  h+='<label>數量 <input id="econ-tr-amt" data-econ-trade="user-amt" type="number" min="1" step="1" value="'+(us.amt||1)+'" style="width:64px"></label> ';
  h+='<label>目的地 <select id="econ-tr-dest" data-econ-trade="user-dest"><option value="fangshi"'+(us.dest==='fangshi'?' selected':'')+'>坊市</option><option value="wanbao"'+(us.dest==='wanbao'?' selected':'')+'>萬寶樓</option><option value="village"'+(us.dest==='village'?' selected':'')+'>村莊</option></select></label>';
  h+='<div><label>帶隊 <select id="econ-tr-leader" data-econ-trade="user-leader"><option value="">（未指派）</option>';
  for(const u of leaders){
    const post=econTradePostOf(u);
    const lab=(u.name||('弟子'+u.id))+(post?('・'+(typeof ECON_OFFICE_NAME!=='undefined'&&ECON_OFFICE_NAME[post]||post)):'')+(u.kind==='player'?'（主角）':'');
    h+='<option value="'+u.id+'"'+(String(us.leaderId)===String(u.id)?' selected':'')+'>'+econTradeEsc(lab)+'</option>';
  }
  h+='</select></label></div>';
  const helps=econTradeIdleHelpers(leaders.map(function(u){return u.id;}));
  if(helps.length){
    h+='<div class="sm">隨行（閒置弟子，可選）';
    const picked=us.helperIds||[];
    for(const u of helps.slice(0,8))h+=' <label><input type="checkbox" class="econ-tr-help" data-econ-trade="user-help" value="'+u.id+'"'+(picked.indexOf(u.id)>=0||picked.indexOf(String(u.id))>=0?' checked':'')+'> '+econTradeEsc(u.name||('弟子'+u.id))+'</label>';
    h+='</div>';
  }
  h+='<div class="jobs"><button type="button" class="btn pri" id="econ-tr-go" data-econ-trade="go">出發</button> <button type="button" class="btn" data-econ-trade="reset-auto">恢復自動</button></div>';
  h+='<div class="sm" id="econ-tr-msg"></div>';
  h+='</div>';
  const floorXia=econTradeFloorXia(T),spendXia=econTradeSpendable(T);
  h+='<div class="sm">總庫安全額：'+econTradeEsc(econTradeFmtXia(floorXia))+'（至少一半，且不少於 50 下品）；可動用 '+econTradeEsc(econTradeFmtXia(spendXia))+'</div>';
  h+='<div class="econ-task-h">自動參加拍賣會</div>';
  h+='<div class="sm">有外事堂時，外事或有職位弟子會帶隊前往萬寶樓，依手動出價規則（小加價 +10%）競標。出價上限依拍品品階（凡品～仙器）佔總庫比例，且不會低於安全額。</div>';
  h+='<label><input type="checkbox" id="econ-auc-on" data-econ-trade="auc-on"'+(A.on?' checked':'')+'> 自動參加（預設開）</label>';
  h+='<div class="sm">各品階預算（佔總庫 %）';
  const tierNames=econAucTierNames();
  for(let i=0;i<tierNames.length;i++){
    const tn=tierNames[i],tp=econAucTierPctOf(tn,A),capT=econAucBudget({q:i,n:tn});
    h+=' <label>'+econTradeEsc(tn)+' <input data-econ-trade="budget-tier" data-tier="'+econTradeEsc(tn)+'" type="number" min="0" max="100" step="1" value="'+Math.round(tp*100)+'" style="width:48px">％（約 '+econTradeEsc(econTradeFmtXia(capT))+'）</label>';
  }
  h+='</div>';
  h+='<div class="sm">競標分類';
  for(const c of econAucCats()){
    const on=econAucWant(c.k);
    h+=' <label><input type="checkbox" data-econ-trade="cat" data-k="'+econTradeEsc(c.k)+'"'+(on?' checked':'')+'> '+econTradeEsc(c.n)+'</label>';
  }
  h+='</div>';
  h+='<div class="sm">自動寄賣';
  for(const k of econTradeResKeys()){
    const q=A.consign[k]||0;
    h+=' <label>'+econTradeEsc(econTradeResName(k))+' <input data-econ-trade="consign" data-k="'+k+'" type="number" min="0" step="1" value="'+q+'" style="width:48px"></label>';
  }
  h+='</div>';
  if(A.log&&A.log.length){
    h+='<details class="dt" open><summary>拍賣結果</summary>';
    for(const l of A.log.slice(0,8)){
      h+='<div class="sm">'+econTradeEsc(l.m||'');
      if(l.won&&l.won.length)h+='　得標：'+econTradeEsc(l.won.map(function(x){return x.n+' '+econTradeFmtXia(x.price);}).join('、'));
      if(l.sold&&l.sold.length)h+='　寄賣：'+econTradeEsc(l.sold.map(function(x){return (x.k||'')+'×'+x.n;}).join('、'));
      h+='</div>';
    }
    h+='</details>';
  }
  h+='</details>';
  return h+'</div>';
}
function econTradeMount(){
  try{
    const pn=document.getElementById('panel');if(!pn)return;
    const b=(typeof selBuilding!=='undefined'&&selBuilding!=null&&typeof bById==='function')?bById(selBuilding):null;
    let el=pn.querySelector('#econ-trade-wrap');
    if(!b||!b.built||b.type!=='waishitang'){if(el)el.remove();return;}
    try{if(typeof econStripFinanceFromBuildingPanel==='function')econStripFinanceFromBuildingPanel();}catch(e){}
    const h=econTradePanelHtml();
    if(!el){
      el=document.createElement('div');el.id='econ-trade-wrap';
      el.style.cssText='margin-top:8px;border-top:1px solid rgba(255,220,150,.25);padding-top:6px';
      const lv=pn.querySelector('.lvbox');if(lv)pn.insertBefore(el,lv);else pn.appendChild(el);
    }
    if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;}
    if(econFangshiUiOpen)econOpenFangshiUi();
  }catch(e){}
}
function econTradeDoLaunchFromForm(){
  const side=(document.getElementById('econ-tr-side')||{}).value||'sell';
  const res=(document.getElementById('econ-tr-res')||{}).value||'xiacao';
  const amt=(document.getElementById('econ-tr-amt')||{}).value||1;
  const dest=(document.getElementById('econ-tr-dest')||{}).value||'fangshi';
  const leaderId=(document.getElementById('econ-tr-leader')||{}).value;
  const helperIds=[];
  document.querySelectorAll('.econ-tr-help:checked').forEach(function(n){helperIds.push(+n.value);});
  const r=econTradeLaunch({side:side,res:res,amt:amt,dest:dest,leaderId:leaderId,helperIds:helperIds});
  const msg=document.getElementById('econ-tr-msg');
  const text=r.ok?(r.msg||'已出發'):(r.msg||(r.reason==='no-leader'?ECON_TRADE_NEED:(r.reason==='no-res'?'貨物不足':(r.reason==='insufficient'?'靈石不足':'無法出發：'+(r.reason||'')))));
  if(msg)msg.textContent=text;
  try{if(typeof toast==='function')toast(text);}catch(e){}
  try{if(typeof renderPanel==='function')renderPanel();}catch(e){econTradeMount();}
  return r;
}
function econTradeOnDom(ev){
  try{
    const t=ev&&ev.target;if(!t||!t.closest)return;
    const actEl=t.closest('[data-econ-trade]');if(!actEl)return;
    const act=actEl.getAttribute('data-econ-trade');
    if(act==='go'){
      if(ev.preventDefault)ev.preventDefault();
      econTradeDoLaunchFromForm();
      return;
    }
    if(act==='auc-on'){econAucSet({on:!!actEl.checked});const A=econAucAutoEnsure();if(A&&A.userSet)A.userSet.on=1;return;}
    if(act==='budget-pct'&&ev.type==='change'){econAucSet({budgetPct:actEl.value});const A=econAucAutoEnsure();if(A&&A.userSet)A.userSet.budgetPct=1;econTradeMount();return;}
    if(act==='budget-tier'&&ev.type==='change'){
      const tn=actEl.getAttribute('data-tier');
      econAucSet({budgetTier:tn,budgetTierPct:actEl.value});
      const A=econAucAutoEnsure();
      if(A&&A.userSet){A.userSet.budgetTiers=1;delete A.userSet.budgetPct;}
      econTradeMount();return;
    }
    if(act==='cat'){econAucSet({k:actEl.getAttribute('data-k'),cat:!!actEl.checked});const A=econAucAutoEnsure();if(A&&A.userSet)A.userSet.cats=1;return;}
    if(act==='consign'&&ev.type==='change'){econAucSet({consignKey:actEl.getAttribute('data-k'),consignAmt:actEl.value});const A=econAucAutoEnsure();if(A&&A.userSet)A.userSet.consign=1;return;}
    if(act==='reset-auto'){econTradeResetAuto();try{if(typeof toast==='function')toast('已恢復自動調度');}catch(e){}try{if(typeof renderPanel==='function')renderPanel();}catch(e){econTradeMount();}return;}
    if(act==='user-side'&&ev.type==='change'){econTradeMarkUser('side',actEl.value);return;}
    if(act==='user-res'&&ev.type==='change'){econTradeMarkUser('res',actEl.value);return;}
    if(act==='user-amt'&&ev.type==='change'){econTradeMarkUser('amt',+actEl.value||1);return;}
    if(act==='user-dest'&&ev.type==='change'){econTradeMarkUser('dest',actEl.value);return;}
    if(act==='user-leader'&&ev.type==='change'){econTradeMarkUser('leader',actEl.value);const st=econTradeEnsure();if(st)st.user.leaderId=actEl.value;return;}
    if(act==='user-help'){
      const ids=[];document.querySelectorAll('.econ-tr-help:checked').forEach(function(n){ids.push(+n.value);});
      econTradeMarkUser('helpers',ids);return;
    }
  }catch(e){}
}

function econAttachShop(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.SHOP_TUNE=ECON_SHOP_TUNE;
    A.shopPrice=econShopPrice;A.laborFee=econLaborFee;
    A.commission=econCommission;A.playerOrder=econPlayerOrder;
    A.onCraftFinished=econOnCraftFinished;A.shopBuy=econShopBuy;
    A.marketPrice=econMarketPrice;A.marketTick=econMarketTick;A.shopTick=econShopTick;
    A.sellToCity=econSellToCity;
    A.GOODS=ECON_GOODS;
    A.goodsOf=econGoodsOf;A.goodsPrice=econGoodsPrice;A.goodsStock=econGoodsStock;
    A.fangshiBuy=econFangshiBuy;A.fangshiSell=econFangshiSell;A.wanbaoSell=econWanbaoSell;
    A.fangshiHtml=econFangshiHtml;A.wanbaoHtml=econWanbaoHtml;
    A.installGoodsUi=econInstallGoodsUi;A.aucHasXiacao=econAucHasXiacao;
    A.registerBuildings=econRegisterBuildings;
    A.TRADE_TUNE=ECON_TRADE_TUNE;A.TRADE_NEED=ECON_TRADE_NEED;
    A.tradeLaunch=econTradeLaunch;A.tradeTick=econTradeTick;A.tradePanelHtml=econTradePanelHtml;
    A.tradeCanLead=econTradeCanLead;A.tradeLeaders=econTradeLeaders;A.tradeMount=econTradeMount;
    A.hasWaishitang=econHasWaishitang;A.tradeUnitPrice=econTradeUnitPrice;
    A.aucAutoEnsure=econAucAutoEnsure;A.aucAutoPlay=econAucAutoPlay;A.aucOnStart=econAucOnStart;
    A.aucSet=econAucSet;A.aucCats=econAucCats;A.aucBudget=econAucBudget;
    A.aucLotTier=econAucLotTierName;A.aucTierPct=econAucTierPctOf;A.aucTierNames=econAucTierNames;A.aucTierDefaults=econAucTierDefaultMap;
    A.tradePlanAuto=econTradePlanAuto;A.tradeAutoOnce=econTradeAutoOnce;A.tradeResetAuto=econTradeResetAuto;
    A.tradeFmtXia=econTradeFmtXia;A.tradeSpendable=econTradeSpendable;A.tradeFloorXia=econTradeFloorXia;
    A.tradeFreeLeaders=econTradeFreeLeaders;A.openFangshiUi=econOpenFangshiUi;A.aucWatch=econAucWatch;
    A.aucStart=function(){if(typeof aucStart==='function')return aucStart.apply(this,arguments);return {ok:false,reason:'no-aucStart'};};
    if(typeof ECON_NEW_BUILDS!=='undefined')A.NEW_BUILDS=ECON_NEW_BUILDS;
  }catch(e){}
}
var econFangshiUiOpen=false;
function econOpenFangshiUi(){
  try{
    econFangshiUiOpen=true;
    const panel=document.getElementById('panel');
    const host=document.getElementById('econ-trade-wrap')||panel;
    if(!host)return false;
    let slot=document.getElementById('econ-fangshi-slot');
    if(!slot||!host.contains(slot)){
      slot=document.createElement('div');slot.id='econ-fangshi-slot';
      slot.style.cssText='margin:6px 0;padding:6px;border:1px solid rgba(255,220,150,.3);border-radius:4px';
      host.insertBefore(slot,host.firstChild);
    }
    slot.innerHTML=econFangshiHtml();
    try{slot.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}
    return true;
  }catch(e){return false;}
}
function econInstallGoodsUi(){
  econGoodsEnsureNames();
  try{
    if(typeof AUC_LOTS!=='undefined'&&Array.isArray(AUC_LOTS)&&!AUC_LOTS.some(function(x){return x&&x.k==='xiacao';})){
      AUC_LOTS.push({k:'xiacao',n:'仙草 ×3',p:18,give:function(){econGoodsGain('xiacao',3);}});
    }
  }catch(e){}
  try{
    if(typeof renderTrade==='function'&&!renderTrade._econFs){
      const _rt=renderTrade;
      renderTrade=function(){
        const r=_rt.apply(this,arguments);
        try{
          if(typeof tradeOpen==='undefined'||tradeOpen==null)return r;
          const el=typeof $==='function'?$('trade'):document.getElementById('trade');
          if(!el)return r;
          if(!el.querySelector('#econ-fangshi'))el.insertAdjacentHTML('beforeend',econFangshiHtml());
        }catch(e){}
        return r;
      };
      renderTrade._econFs=1;
    }
  }catch(e){}
  try{
    if(typeof v48Html==='function'&&!v48Html._econWb){
      const _vh=v48Html;
      v48Html=function(){
        let h=_vh.apply(this,arguments);
        try{
          const on= (typeof V48!=='undefined'&&V48.tab==='auc') || (h&&h.indexOf('萬寶樓拍賣')>=0);
          if(on&&h&&h.indexOf('econ-wanbao')<0)h+=econWanbaoHtml();
        }catch(e){}
        return h;
      };
      v48Html._econWb=1;
    }
  }catch(e){}
  try{
    if(typeof extraActs==='function'&&!extraActs._econFs){
      const _ea=extraActs;
      extraActs=function(b){
        const a=_ea.apply(this,arguments)||[];
        try{
          if(b&&b.built&&(b.type==='shop'||b.type==='waishitang')){
            if(!a.some(function(x){return /data-act="econ-fangshi"|坊市・仙草買賣/.test(String(x));}))
              a.push('<button class="btn" data-act="econ-fangshi">坊市・仙草買賣</button>');
          }
        }catch(e){}
        return a;
      };
      extraActs._econFs=1;
    }
  }catch(e){}
  try{
    if(typeof renderPanel==='function'&&!renderPanel._econTradeUi){
      const _rp=renderPanel;
      renderPanel=function(){
        const r=_rp.apply(this,arguments);
        try{if(typeof econStripFinanceFromBuildingPanel==='function')econStripFinanceFromBuildingPanel();}catch(e){}
        try{econTradeMount();}catch(e){}
        return r;
      };
      renderPanel._econTradeUi=1;
    }
  }catch(e){}
  try{
    if(typeof doJob==='function'&&!doJob._econTrade){
      const _dj=doJob;
      doJob=function(u,dt){
        try{
          if(u&&u.econTradeMid){
            const st=econTradeEnsure();
            const m=st&&st.missions.find(function(x){return x&&x.id===u.econTradeMid;});
            if(m&&m.state!=='done'){
              const tx=(m.state==='back')?m.hx:m.tx,ty=(m.state==='back')?m.hy:m.ty;
              econTradeWalk(u,dt,tx,ty);
              return;
            }
          }
        }catch(e){}
        return _dj.apply(this,arguments);
      };
      doJob._econTrade=1;
    }
  }catch(e){}
  try{
    if(typeof aucStart==='function'&&!aucStart._econAuto){
      const _as=aucStart;
      aucStart=function(){
        const r=_as.apply(this,arguments);
        try{econAucOnStart(r);}catch(e){}
        return r;
      };
      aucStart._econAuto=1;
    }
  }catch(e){}
  try{
    if(typeof document!=='undefined'&&document.addEventListener&&!document._econTradeClick){
      document.addEventListener('click',econTradeOnDom);
      document.addEventListener('change',econTradeOnDom);
      document._econTradeClick=1;
    }
  }catch(e){}
  try{econTradeRegisterFees();}catch(e){}
  try{
    if(typeof panelActV045==='function'&&!panelActV045._econFs){
      const _pa=panelActV045;
      panelActV045=function(act,b,us,a){
        try{
          if(act==='econ-fangshi'){econOpenFangshiUi();return true;}
        }catch(e){}
        return _pa.apply(this,arguments);
      };
      panelActV045._econFs=1;
    }
  }catch(e){}
  try{
    if(typeof document!=='undefined'&&document.addEventListener&&!document._econFsClick){
      document.addEventListener('click',function(ev){
        const fang=ev.target&&ev.target.closest&&ev.target.closest('[data-act="econ-fangshi"]');
        if(fang){if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation();econOpenFangshiUi();return;}
        const fs=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-fs]');
        const wb=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-wb]');
        try{
          if(fs){
            const k=fs.getAttribute('data-k')||'xiacao';
            const r=fs.getAttribute('data-econ-fs')==='buy'?econFangshiBuy(k,1,'vault'):econFangshiSell(k,1,'vault');
            try{if(typeof toast==='function')toast(r.ok?(r.place==='fangshi'&&fs.getAttribute('data-econ-fs')==='buy'?'買入仙草，花費 '+r.price+' 下品':'賣出仙草，收入 '+r.price+' 下品'):(r.reason==='no-res'?'仙草不足':r.reason==='insufficient'?'靈石不足':('無法交易：'+(r.reason||''))));}catch(e){}
            try{if(typeof renderTrade==='function')renderTrade();}catch(e){}
            try{const box=document.getElementById('econ-fangshi');if(box)box.outerHTML=econFangshiHtml();}catch(e){}
          }
          if(wb){
            const k=wb.getAttribute('data-k')||'xiacao';
            const r=econWanbaoSell(k,1,'vault');
            try{if(typeof toast==='function')toast(r.ok?('萬寶樓收下仙草，收入 '+r.price+' 下品'):(r.reason==='no-res'?'仙草不足':'無法寄賣：'+(r.reason||'')));}catch(e){}
            try{const box=document.getElementById('econ-wanbao');if(box)box.outerHTML=econWanbaoHtml();}catch(e){}
            try{if(typeof v48Render==='function')v48Render(true);}catch(e){}
          }
        }catch(e){}
      });
      document._econFsClick=1;
    }
  }catch(e){}
}
econAttachShop();
econInstallGoodsUi();
try{if(typeof setTimeout==='function')setTimeout(function(){econAttachShop();econInstallGoodsUi();},0);}catch(e){}
