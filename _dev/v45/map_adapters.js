// ================== v0.4.x map：死亡／靈石適配（CONFIRMED ↔ 仙武修煉／仙武經濟）==================
// 修煉：window.XW_DEATH.resolve(w,l,ctx)｜alias XW_CULT.resolveDefeat；見 CULT_SCHEMA.md（待補）
// 經濟：XW_ECON.pay/gain/canPay(unitOrSect,amount[,reason])；amount＝下品靈石；見 ECON_SCHEMA.md（待補）
var MAP_DEATH_MIN_REALM=7;
var MAP_SOUL_WINDOW_SEC=8; // 元神可滅秒數（後備／記錄用）
function mapDeathMinRealm(){
  try{if(MAP_TUNE&&MAP_TUNE.deathMinRealm!=null)return MAP_TUNE.deathMinRealm|0;}catch(e){}
  try{if(MAP_TUNE&&MAP_TUNE.zb&&MAP_TUNE.zb.minRealm!=null)return MAP_TUNE.zb.minRealm|0;}catch(e){}
  return MAP_DEATH_MIN_REALM;
}
function mapDeathHook(){
  try{if(typeof window!=='undefined'){
    if(window.XW_DEATH&&typeof window.XW_DEATH.resolve==='function')return window.XW_DEATH.resolve.bind(window.XW_DEATH);
    if(window.XW_CULT&&typeof window.XW_CULT.resolveDefeat==='function')return window.XW_CULT.resolveDefeat.bind(window.XW_CULT);
    if(window.XW&&window.XW.death&&typeof window.XW.death.resolve==='function')return window.XW.death.resolve.bind(window.XW.death);
  }}catch(e){}
  return null;
}
function mapDefeatNormalizeCtx(ctx){
  ctx=ctx||{};
  // 相容舊 mode／destroySoul → 定案 kind／lethal
  const kind=ctx.kind||ctx.mode||'combat';
  let lethal=ctx.lethal;
  if(lethal==null)lethal=!(kind==='duel');
  if(kind==='duel')lethal=false;
  return {
    kind,lethal:!!lethal,src:ctx.src||'map',
    destroySoul:!!(ctx.destroySoul||ctx.soulDestroy||(ctx.winnerHasSoulDestroy)),
    winnerHasSoulDestroy:!!(ctx.winnerHasSoulDestroy||ctx.destroySoul||ctx.soulDestroy)
  };
}
function mapLootArr(r){
  // 下品靈石為主的精簡掉落陣列
  const n=2+Math.floor(Math.max(0,r)*1.5);
  const L=[{k:'lingshi',n:n,grade:'下品'}];
  if(r<4)L.push({k:'food',n:4});
  return L;
}
function mapDefeatFallback(winner,loser,ctx){
  const C=mapDefeatNormalizeCtx(ctx);
  const r=(loser&&loser.realm!=null)?(loser.realm|0):0;
  const canDie=r>=mapDeathMinRealm();
  // 定案回傳形狀
  const out={outcome:'flee',loot:[],wounded:false,cultLoss:0,via:'fallback'};
  if(!C.lethal){
    // 比武等非致命
    out.outcome='flee';out.wounded=true;out.cultLoss=0;out.loot=[];
    if(loser){loser.hp=Math.max(1,Math.floor((loser.maxhp||loser.hp||10)*0.35));loser._mapWound=1;}
    return out;
  }
  if(!canDie){
    // 元嬰前致命 → 重傷逃走＋底蘊損失＋掉落
    out.outcome='flee';out.wounded=true;out.cultLoss=5+Math.min(20,r*2);out.loot=mapLootArr(r);
    if(loser){
      loser.hp=Math.max(1,Math.floor((loser.maxhp||10)*0.2));
      loser._mapWound=1;loser._mapFlee=1;
      if(loser.cult!=null)loser.cult=Math.max(0,(loser.cult||0)-out.cultLoss);
      else loser._mapCultLoss=(loser._mapCultLoss||0)+out.cultLoss;
    }
    mapApplyLootToWinner(winner,out.loot);
    return out;
  }
  // 元嬰+ 致命
  if(C.winnerHasSoulDestroy||C.destroySoul){
    out.outcome='soulDestroyed';out.wounded=false;out.cultLoss=0;out.loot=mapLootArr(r);
    if(loser){loser.dead=true;loser.hp=0;loser._mapSoulGone=1;}
    mapApplyLootToWinner(winner,out.loot);
    return out;
  }
  out.outcome='dead';out.wounded=false;out.cultLoss=0;out.loot=mapLootArr(r);
  out.soulId='soul_'+(loser&&loser.id!=null?loser.id:'x')+'_'+((typeof S!=='undefined'&&S&&S.time|0)||0)+'_'+Math.floor(Math.random()*1e5).toString(36);
  if(loser){loser.dead=true;loser.hp=0;loser._mapSoulFlee=1;loser._mapSoulId=out.soulId;loser._mapSoulT=(typeof S!=='undefined'&&S&&S.time)||0;}
  mapApplyLootToWinner(winner,out.loot);
  return out;
}
function mapApplyLootToWinner(winner,loot){
  if(!winner||!loot||!loot.length)return;
  for(const it of loot){
    if(it.k==='lingshi'&&typeof mapGain==='function')mapGain(winner,it.n,'defeat_loot');
  }
}
function mapDefeatResolve(winner,loser,ctx){
  const C=mapDefeatNormalizeCtx(ctx);
  // 若勝者有滅魂手段，帶入 ctx
  if(winner&&(winner._mapSoulDestroy||winner.soulDestroy||(winner.zbTid&&String(winner.zbTid).indexOf('mie')>=0)))C.winnerHasSoulDestroy=true;
  const hook=mapDeathHook();
  let out=null;
  if(hook){
    try{
      out=hook(winner,loser,{kind:C.kind,lethal:C.lethal,src:C.src,destroySoul:C.winnerHasSoulDestroy});
      if(out)out.via=out.via||'XW_DEATH';
    }catch(e){out=null;}
  }
  if(!out||out.outcome==null)out=mapDefeatFallback(winner,loser,C);
  // 相容舊欄位（測試／呼叫端）
  out.killed=out.outcome==='dead'||out.outcome==='soulDestroyed';
  out.fled=out.outcome==='flee';
  out.soulFlee=out.outcome==='dead'&&!!out.soulId;
  out.soulDestroyed=out.outcome==='soulDestroyed';
  if(!Array.isArray(out.loot))out.loot=out.loot?[].concat(out.loot):[];
  if(out.wounded==null)out.wounded=!!out.fled;
  if(out.cultLoss==null)out.cultLoss=0;
  // 元神逃出：地圖側擁有 pendingSouls（見 MAP_SCHEMA §12）
  if(out.soulId)mapRecordSoul(out,{winner:winner,loser:loser,src:C.src,kind:C.kind});
  if(out.soulId&&out.outcome==='dead'&&(C.winnerHasSoulDestroy||(winner&&winner._mapSoulDestroy))){
    const d=mapSoulTryDestroy(winner,out.soulId);
    if(d&&d.ok){out.outcome='soulDestroyed';out.soulDestroyed=true;out.soulFlee=false;delete out.soulId;}
  }
  return out;
}
// ---- 元神待滅登記 ----
function mapSoulPendingEnsure(){
  if(typeof S==='undefined'||!S)return null;
  if(!S.map)try{mapMigrateSave(S);}catch(e){return null;}
  if(!Array.isArray(S.map.pendingSouls))S.map.pendingSouls=[];
  return S.map.pendingSouls;
}
function mapSoulRecordPending(soulId,loser,winner,src){
  const L=mapSoulPendingEnsure();if(!L||!soulId)return null;
  const rec={
    soulId,loserId:loser&&loser.id||null,realm:loser&&loser.realm||0,
    winnerId:winner&&winner.id||null,src:src||'map',
    t0:(S.time||0),until:(S.time||0)+MAP_SOUL_WINDOW_SEC,alive:true
  };
  L.push(rec);
  if(L.length>40)L.shift();
  try{mapEmit('map:soul:escape',{soulId,loserId:rec.loserId,until:rec.until,src:rec.src});}catch(e){}
  return rec;
}
// ---- 地圖側擁有 pendingSouls：對外 helper／死亡 hook ----
// mapRecordSoul(result,ctx)：凡 result.soulId 即寫入 S.map.pendingSouls（冪等同 id）
function mapRecordSoul(result,ctx){
  if(!result||!result.soulId)return null;
  ctx=ctx||{};
  const L=mapSoulPendingEnsure();if(!L)return null;
  if(L.some(x=>x&&x.soulId===result.soulId&&x.alive!==false))return L.find(x=>x.soulId===result.soulId);
  const loser=ctx.loser||null,winner=ctx.winner||null;
  return mapSoulRecordPending(result.soulId,loser,winner,ctx.src||ctx.kind||'external');
}
// 他模組直接呼叫 XW_DEATH.resolve 後應再呼叫此 hook（或依賴 mapInstallDeathHook 自動包一層）
function mapOnDeathResolved(result,ctx){
  ctx=ctx||{};
  const rec=mapRecordSoul(result,ctx);
  try{if(typeof mapSanitizeSharedEntities==='function')mapSanitizeSharedEntities();}catch(e){}
  return rec;
}
function mapInstallDeathHook(){
  try{
    if(typeof window==='undefined')return false;
    const D=window.XW_DEATH||(window.XW&&window.XW.death)||null;
    if(!D||typeof D.resolve!=='function'||D._mapHooked)return !!D&&!!D._mapHooked;
    const _r=D.resolve.bind(D);
    D.resolve=function(w,l,c){
      const out=_r(w,l,c);
      try{mapOnDeathResolved(out,{winner:w,loser:l,src:(c&&(c.src||c.kind))||'XW_DEATH',kind:c&&c.kind});}catch(e){}
      return out;
    };
    D._mapHooked=1;
    return true;
  }catch(e){return false;}
}
if(typeof setTimeout==='function'){
  setTimeout(function mapDeathHookRetry(){try{if(!mapInstallDeathHook())setTimeout(mapDeathHookRetry,50);}catch(e){}},0);
}
function mapSoulTryDestroy(winner,soulId){
  const L=mapSoulPendingEnsure();if(!L)return {ok:false};
  const can=winner&&(winner._mapSoulDestroy||winner.soulDestroy||(typeof winner.hasSoulDestroy==='function'&&winner.hasSoulDestroy()));
  if(!can)return {ok:false,reason:'no_means'};
  const rec=L.find(x=>x.soulId===soulId&&x.alive);
  if(!rec)return {ok:false,reason:'gone'};
  if((S.time||0)>rec.until)return {ok:false,reason:'escaped'};
  rec.alive=false;rec.destroyed=true;rec.by=winner&&winner.id||null;
  try{mapEmit('map:soul:destroy',{soulId,by:rec.by});}catch(e){}
  return {ok:true,soulId};
}
// ---- 經濟 CONFIRMED（ECON_SCHEMA.md §1.1）----
// XW_ECON.pay/gain(unitOrSect,amount,reason)／canPay(unitOrSect,amount)；amount＝下品
// 亦相容 legacy (who,currency,amt,ctx)
function mapEconHook(name){
  try{if(typeof window!=='undefined'){
    const E=window.XW_ECON||(window.XW&&window.XW.econ)||null;
    if(E&&typeof E[name]==='function')return E[name].bind(E);
  }}catch(e){}
  return null;
}
function mapEconTreasuryOn(){
  try{return !!(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.treasury);}catch(e){return false;}
}
function mapEconClassify(who){
  // unit | sect | vault
  if(who==null||who==='vault'||who==='sect')return 'vault';
  if(typeof who==='string')return 'vault';
  if(who.kind==='disciple'||who.kind==='player')return 'unit';
  if(who.stock&&who.kind!=='disciple'&&who.kind!=='player')return 'sect';
  // 啟發式：有 id 且像單位
  if(who.id!=null&&(who.hp!=null||who.realm!=null||who.job!=null||who.x!=null)&&!who.stock)return 'unit';
  if(who.stock)return 'sect';
  return 'vault';
}
function mapEconParseArgs(who,a1,a2,a3){
  // 新： (who, amount, reason) ｜ 舊： (who, 'lingshi', amt, ctx)
  if(typeof a1==='string'&&(a1==='lingshi'||a1==='xia')){
    const amt=+(a2||0);const reason=(a3&&(a3.src||a3.reason))||(typeof a3==='string'?a3:'map');
    return {who,amount:amt,reason};
  }
  return {who,amount:+(a1||0),reason:a2||'map'};
}
function mapEconWalletGet(unit){
  if(!unit||unit.id==null)return null;
  if(!S.econ)return null;
  if(!S.econ.wallets)S.econ.wallets={};
  const id=String(unit.id);
  if(!S.econ.wallets[id]){
    const seed=(unit.lingshi!=null)?(unit.lingshi|0):0;
    S.econ.wallets[id]={xia:seed,zhong:0,shang:0,ji:0,ledger:[]};
  }
  return S.econ.wallets[id];
}
function mapEconVaultGet(){
  if(!S.econ)return null;
  if(!S.econ.vault)S.econ.vault={xia:0,zhong:0,shang:0,ji:0};
  return S.econ.vault;
}
function mapPay(who,a1,a2,a3){
  const A=mapEconParseArgs(who,a1,a2,a3);
  const amount=A.amount;if(!(amount>0))return {ok:true,paid:0,via:'noop'};
  const hook=mapEconHook('pay');
  if(hook){try{const r=hook(A.who,amount,A.reason);if(r!=null)return r.ok!=null?r:{ok:!!r,paid:amount,via:'XW_ECON'};}catch(e){}}
  const cls=mapEconClassify(A.who);
  if(cls==='sect'){
    const st=A.who.stock;if(!st)return {ok:false,reason:'no_stock',via:'sect.stock.lingshi'};
    if((st.lingshi||0)<amount)return {ok:false,reason:'insufficient',via:'sect.stock.lingshi'};
    st.lingshi-=amount;return {ok:true,paid:amount,via:'sect.stock.lingshi'};
  }
  if(cls==='unit'){
    if(mapEconTreasuryOn()){
      const w=mapEconWalletGet(A.who);if(!w)return {ok:false,reason:'no_wallet',via:'S.econ.wallets'};
      if((w.xia||0)<amount)return {ok:false,reason:'insufficient',via:'S.econ.wallets'};
      w.xia-=amount;A.who.lingshi=w.xia;return {ok:true,paid:amount,via:'S.econ.wallets'};
    }
    if((A.who.lingshi||0)<amount)return {ok:false,reason:'insufficient',via:'unit.lingshi'};
    A.who.lingshi=(A.who.lingshi||0)-amount;return {ok:true,paid:amount,via:'unit.lingshi'};
  }
  // vault
  if(mapEconTreasuryOn()){
    const v=mapEconVaultGet();
    if((v.xia||0)<amount && (typeof S==='undefined'||!S.res||(S.res.lingshi||0)<amount))
      return {ok:false,reason:'insufficient',via:'S.econ.vault'};
    // 優先 vault.xia，不足則從 S.res 同步
    if((v.xia||0)<amount&&S.res)v.xia=S.res.lingshi|0;
    if((v.xia||0)<amount)return {ok:false,reason:'insufficient',via:'S.econ.vault'};
    v.xia-=amount;if(S.res)S.res.lingshi=v.xia;return {ok:true,paid:amount,via:'S.econ.vault'};
  }
  if(typeof S!=='undefined'&&S&&S.res){
    if(typeof canAfford==='function'&&typeof pay==='function'){
      const cost={lingshi:amount};if(!canAfford(cost))return {ok:false,reason:'insufficient',via:'S.res.lingshi'};
      pay(cost);return {ok:true,paid:amount,via:'S.res.lingshi'};
    }
    if((S.res.lingshi||0)<amount)return {ok:false,reason:'insufficient',via:'S.res.lingshi'};
    S.res.lingshi-=amount;return {ok:true,paid:amount,via:'S.res.lingshi'};
  }
  return {ok:false,reason:'no_wallet',via:'fallback'};
}
function mapGain(who,a1,a2,a3){
  const A=mapEconParseArgs(who,a1,a2,a3);
  const amount=A.amount;if(!(amount>0))return {ok:true,gained:0,via:'noop'};
  const hook=mapEconHook('gain');
  if(hook){try{const r=hook(A.who,amount,A.reason);if(r!=null)return r.ok!=null?r:{ok:!!r,gained:amount,via:'XW_ECON'};}catch(e){}}
  const cls=mapEconClassify(A.who);
  if(cls==='sect'){
    if(!A.who.stock)A.who.stock={food:0,iron:0,herb:0,lingshi:0};
    A.who.stock.lingshi=(A.who.stock.lingshi||0)+amount;return {ok:true,gained:amount,via:'sect.stock.lingshi'};
  }
  if(cls==='unit'){
    if(mapEconTreasuryOn()){
      const w=mapEconWalletGet(A.who);
      w.xia=(w.xia||0)+amount;A.who.lingshi=w.xia;return {ok:true,gained:amount,via:'S.econ.wallets'};
    }
    A.who.lingshi=(A.who.lingshi||0)+amount;return {ok:true,gained:amount,via:'unit.lingshi'};
  }
  if(mapEconTreasuryOn()){
    const v=mapEconVaultGet();v.xia=(v.xia||0)+amount;if(S.res)S.res.lingshi=v.xia;
    return {ok:true,gained:amount,via:'S.econ.vault'};
  }
  if(typeof S!=='undefined'&&S&&S.res){S.res.lingshi=(S.res.lingshi||0)+amount;return {ok:true,gained:amount,via:'S.res.lingshi'};}
  return {ok:false,reason:'no_wallet',via:'fallback'};
}
function mapCanPay(who,a1,a2){
  const A=mapEconParseArgs(who,a1,a2);
  const amount=A.amount;if(!(amount>0))return true;
  const hook=mapEconHook('canPay');
  if(hook){try{return !!hook(A.who,amount);}catch(e){}}
  const cls=mapEconClassify(A.who);
  if(cls==='sect')return !!A.who.stock&&(A.who.stock.lingshi||0)>=amount;
  if(cls==='unit'){
    if(mapEconTreasuryOn()){const w=mapEconWalletGet(A.who);return !!w&&(w.xia||0)>=amount;}
    return (A.who.lingshi||0)>=amount;
  }
  if(mapEconTreasuryOn()){const v=mapEconVaultGet();const x=Math.max(v.xia||0,(S.res&&S.res.lingshi)||0);return x>=amount;}
  if(typeof S!=='undefined'&&S&&S.res){
    if(typeof canAfford==='function')return canAfford({lingshi:amount});
    return (S.res.lingshi||0)>=amount;
  }
  return false;
}
// 城交易：優先 XW_ECON.sellToCity（市價 0.5–2.2 stub）；否則簡易 mapGain
function mapCityTradeSell(who,res,amt,cityId){
  try{
    const E=typeof window!=='undefined'&&(window.XW_ECON||(window.XW&&window.XW.econ));
    if(E&&typeof E.sellToCity==='function')return E.sellToCity(who,res,amt,cityId);
  }catch(e){}
  amt=Math.floor(+amt||0);if(amt<=0)return {ok:false,reason:'amt'};
  const mul=0.5+Math.random()*1.7; // 0.5–2.2 後備
  const price=Math.max(1,Math.round(amt*mul));
  const g=mapGain(who,price,'city_sell:'+(cityId||'')+':'+(res||''));
  return {ok:!!g.ok,price,via:g.via||'fallback_mul'};
}
