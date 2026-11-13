// ================== 仙武經濟：倉儲／背包／納海戒 ===================
// 納海戒：原創名。獨立隨身空間，不做遠端存取；認主；元嬰後死亡可掉落。
var ECON_RING_NAME='納海戒';
var ECON_RING_CAP={xia:20,zhong:50,shang:120,ji:300};
var ECON_STORE_TUNE={
  pouchSlots:4,          // 待確認：儲物袋一次 +4 格
  shopSlots:2,           // 待確認：店舖／倉庫購買一次 +2 格
  shopCostXia:30,        // 待確認
  realmSlots:2,          // 待確認：每大境界自動 +2 格
  ringReturnPct:0.80,    // 待確認：戒指容量 ≥80% 回倉
  ringHalfDay:0.5,       // 待確認：超過遊戲內半天必回倉
  imprintGap:2,          // 待確認：奪戒時境界差超過此值無法抹印
  pouchItem:'nahai_dai'  // 儲物袋道具鍵
};
function econCarryBase(){
  try{if(typeof CARRY_CAP==='number')return CARRY_CAP;}catch(e){}
  return 10;
}
function econInvBase(){
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.invCap)return TUNE.invCap;}catch(e){}
  return 60;
}
function econBagBonus(u){
  if(!econFlag('store'))return 0;
  const T=S;if(!T||!T.econ||!u)return 0;
  let n=0;
  const realm=u.realm||0;n+=ECON_STORE_TUNE.realmSlots*realm;
  const bought=T.econ.bagBuy[u.id]||0;n+=bought;
  if(u.econPouch)n+=ECON_STORE_TUNE.pouchSlots*u.econPouch;
  return n;
}
function econInvCap(u){
  const base=econInvBase();
  if(!econFlag('store'))return base;
  return base+econBagBonus(u||((typeof player==='function')?player():null));
}
function econCarryCap(u){
  const base=econCarryBase();
  if(!econFlag('store'))return base;
  const ring=econRingOf(u);
  if(ring)return ring.cap;
  return base+Math.min(10,econBagBonus(u));
}
// 容量方案B：只說明各操作既有權威，不改容量、物品或安全驗證。
function econInvUsedX(){try{if(typeof XW_STORE!=='undefined'&&XW_STORE&&XW_STORE.enabled&&XW_STORE.enabled()&&XW_STORE.invUsed)return XW_STORE.invUsed();}catch(e){}return (typeof S!=='undefined'&&S&&S.inv)?S.inv.length:0;}
function econInventoryCapacityHint(u){
  const p=typeof player==='function'?player():null;u=u||p;
  const used=econInvUsedX();
  const name=x=>x&&x.name?String(x.name):'未選角色';
  return '拾取／買回（主角「'+name(p)+'」）：'+used+'/'+econInvCap(p)+'\n'+
    '共有裝備卸下（行囊角色「'+name(u)+'」）：'+used+'/'+econInvCap(u);
}
function econInventoryUnequipHint(u,it){
  if(it&&u&&it.own!=null&&it.own===u.id)return '私人裝備：卸下回本人私人背包，不占宗門行囊；交易未決時仍暫停操作';
  const used=econInvUsedX();
  // 單一倉庫開：滿包卸下改送宗門裝備庫（g12／g30）。?singlestore=0 仍是舊的拒絕，提示跟著旗標走。
  let full='；已滿時不可卸下';
  try{if(typeof XW_STORE!=='undefined'&&XW_STORE&&typeof XW_STORE.enabled==='function'&&XW_STORE.enabled())full='；行囊已滿時，脫下的裝備會送進宗門裝備庫';}catch(e){}
  return '共有裝備：卸下放回宗門行囊，依當前角色「'+(u&&u.name||'未選角色')+'」容量 '+used+'/'+econInvCap(u)+full;
}
function econBuyBagSlots(u){
  if(!econFlag('store')||!econFlag('treasury'))return {ok:false,reason:'flag-off'};
  if(!u)return {ok:false,reason:'no-unit'};
  const pay=econCharge(u,ECON_STORE_TUNE.shopCostXia,'bag-expand');
  if(!pay.ok){
    const vault=econCharge('vault',ECON_STORE_TUNE.shopCostXia,'bag-expand-vault');
    if(!vault.ok)return pay;
  }
  S.econ.bagBuy[u.id]=(S.econ.bagBuy[u.id]||0)+ECON_STORE_TUNE.shopSlots;
  econEmit('econ:bag',{unitId:u.id,bonus:econBagBonus(u)});
  return {ok:true,cap:econInvCap(u)};
}

function econRingCap(grade){return ECON_RING_CAP[grade]||ECON_RING_CAP.xia;}
function econMakeRing(ownerId,grade){
  grade=ECON_GRADES.indexOf(grade)>=0?grade:'xia';
  return {
    id:'ring-'+(ownerId||'x')+'-'+econNow(),
    name:ECON_RING_NAME,
    grade:grade,
    cap:econRingCap(grade),
    used:0,
    items:[],           // {type,amt} 資源；或道具快照
    boundTo:ownerId,
    imprint:ownerId,
    noRemote:true
  };
}
function econRingOf(u){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ||!u)return null;
  const id=u.id!=null?u.id:u;
  return T.econ.rings[id]||null;
}
function econGiveRing(u,grade,src){
  if(!econFlag('store'))return {ok:false,reason:'flag-off'};
  if(!u)return {ok:false,reason:'no-unit'};
  const ring=econMakeRing(u.id,grade||'xia');
  S.econ.rings[u.id]=ring;
  econEmit('econ:ring:bind',{unitId:u.id,grade:ring.grade,src:src||'give'});
  return {ok:true,ring:ring};
}
function econRingUsed(ring){
  if(!ring)return 0;
  let n=0;for(const it of (ring.items||[]))n+=(+it.amt||1);
  ring.used=n;return n;
}
function econRingPut(u,type,amt){
  if(!econFlag('store'))return {ok:false,reason:'flag-off',left:amt};
  const ring=econRingOf(u);if(!ring)return {ok:false,reason:'no-ring',left:amt};
  amt=Math.max(0,Math.floor(+amt||0));
  const used=econRingUsed(ring),room=Math.max(0,ring.cap-used);
  const add=Math.min(room,amt);
  if(add>0){
    const ex=ring.items.find(it=>it.type===type);
    if(ex)ex.amt+=add;else ring.items.push({type:type,amt:add});
    econRingUsed(ring);
  }
  return {ok:add>0,added:add,left:amt-add,used:ring.used,cap:ring.cap};
}
function econRingTakeAll(u,type){
  const ring=econRingOf(u);if(!ring)return 0;
  let got=0;const keep=[];
  for(const it of ring.items){
    if(!type||it.type===type)got+=it.amt;
    else keep.push(it);
  }
  ring.items=keep;econRingUsed(ring);return got;
}
function econRingShouldReturn(u){
  if(!econFlag('store')&&!econFlag('mine'))return null;
  const ring=econRingOf(u);
  if(ring){
    const used=econRingUsed(ring);
    if(used>=ring.cap)return {yes:true,why:'full'};
    if(used>=ring.cap*ECON_STORE_TUNE.ringReturnPct)return {yes:true,why:'pct'};
  }
  const half=econDayLen()*ECON_STORE_TUNE.ringHalfDay;
  if(u&&u.econMineT!=null&&(econNow()-u.econMineT)>=half)return {yes:true,why:'halfday'};
  return {yes:false};
}
function econOnUnitDown(u,opt){
  if(!econFlag('store'))return null;
  if(!u)return null;
  const ring=econRingOf(u);if(!ring)return {dropped:false,reason:'no-ring'};
  const realm=u.realm||0;
  // 元嬰＝ REALMS 索引 7；元嬰後死亡可掉落被奪
  if(realm<7)return {dropped:false,reason:'pre-yuanying'};
  const drop={ring:ring,from:u.id,imprint:ring.imprint,x:(opt&&opt.x)||u.x,y:(opt&&opt.y)||u.y};
  delete S.econ.rings[u.id];
  S.econ._droppedRings=S.econ._droppedRings||[];
  S.econ._droppedRings.push(drop);
  econEmit('econ:ring:drop',{unitId:u.id,grade:ring.grade});
  return drop;
}
function econClaimDroppedRing(thief,drop){
  if(!econFlag('store'))return {ok:false,reason:'flag-off'};
  if(!thief||!drop||!drop.ring)return {ok:false,reason:'bad'};
  const gap=(thief.realm||0)-0; // vs 原主烙印境界未知時只查 thief vs stored
  const ownerRealm=drop.ownerRealm||0;
  if(Math.abs((thief.realm||0)-ownerRealm)>ECON_STORE_TUNE.imprintGap && drop.imprint){
    return {ok:false,reason:'imprint-gap'};
  }
  drop.ring.boundTo=thief.id;drop.ring.imprint=null;
  S.econ.rings[thief.id]=drop.ring;
  econEmit('econ:ring:claim',{unitId:thief.id});
  return {ok:true,ring:drop.ring};
}
function econClearImprint(u,ring){
  if(!econFlag('store'))return {ok:false,reason:'flag-off'};
  ring=ring||econRingOf(u);if(!ring)return {ok:false,reason:'no-ring'};
  ring.imprint=null;ring.boundTo=u&&u.id;return {ok:true};
}

function econAttachStore(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.RING_NAME=ECON_RING_NAME;A.RING_CAP=ECON_RING_CAP;A.STORE_TUNE=ECON_STORE_TUNE;
    A.invCap=econInvCap;A.carryCap=econCarryCap;A.bagBonus=econBagBonus;A.buyBagSlots=econBuyBagSlots;
    A.ringOf=econRingOf;A.giveRing=econGiveRing;A.ringPut=econRingPut;A.ringTakeAll=econRingTakeAll;
    A.ringShouldReturn=econRingShouldReturn;A.onUnitDown=econOnUnitDown;
    A.claimRing=econClaimDroppedRing;A.clearImprint=econClearImprint;
  }catch(e){}
}
econAttachStore();
try{if(typeof setTimeout==='function')setTimeout(econAttachStore,0);}catch(e){}
