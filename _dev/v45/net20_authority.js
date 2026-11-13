// ================== net20：聯機權威保底（flags 同步＋未接入口拒絕＋慢包只讀投影）==================
// build.py 建議（本檔不改 build.py；不可放在 cult 之前）：
//   必須在「所有 map*／econ*／cult*／g* wrapper 都已執行之後」、'net19_map.js' 之後、g7.js 之前插入 'net20_authority.js'。
//   原因：IIFE 名稱綁定與最後一次 method 封裝（Cult.tick 外層 AI/Bibi/FX、XW_ECON 各模組 attach）有時序；
//   不可依賴 setTimeout 聲稱「放 cult 前也可以」。net_build 依編號把本檔接在 net19 後；請讓 cult* 出現在本檔之前。
// 單機：不 gate、不改存檔 flags。聯機：host flags 整份覆寫同步；effective gate 不把 flags 寫成 false。
// 模擬 tick／離線 listener：客機 silent no-op。真正使用者操作才 toast。
// 不重建 netHostSend；只 wrap netCast(st)。不接 xlodPack。
const NETA={v:1,sig:'',saveKeep:null,host:null,last:null,sent:0,rx:0,econSent:0,toastN:0,wrapped:[],missing:[],liveU:[],liveE:[]};
const NET_AUTH_LIVE_U=['combatExp','diyun','dandu','danduClear','_cultDanduRef','cultBrk','cultWound','cultWeak','cultZouhuo','cultComa','cultYS','cultRevivePill','cultTreasure','cultFabao','cultTribPill','cultRole','cultSquad','cultCap','cultTactic','cultSpar','office','econOffice','gf'];
const NET_AUTH_LIVE_E=['combatExp','diyun','dandu','cultWound','cultFled','cultLooted','cultYS','cultReturnAt','ownerId','life','ownerKind'];
function netAuthOn(){return typeof NET!=='undefined'&&!!NET.role;}
function netAuthHost(){return netAuthOn()&&NET.role==='host';}
function netAuthClient(){return netAuthOn()&&NET.role==='client';}
function netAuthClone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return x;}}
function netAuthToast(s){NETA.toastN=(NETA.toastN||0)+1;try{toast(s);}catch(e){}}
function netAuthEconOn(){try{if(typeof econAnyFlag==='function')return !!econAnyFlag();const F=S&&S.econ&&S.econ.flags;if(!F)return false;for(const k in F)if(F[k])return true;}catch(e){}return false;}
function netAuthCultOn(){try{const F=(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS)||(window.Cult&&Cult.flags);if(!F)return false;for(const k in F)if(F[k])return true;}catch(e){}return false;}
function netAuthMark(name,ok){const L=ok?NETA.wrapped:NETA.missing;if(L.indexOf(name)<0)L.push(name);}
function netAuthReplaceFlags(dst,src){
  if(!dst||!src||typeof dst!=='object'||typeof src!=='object')return;
  for(const k of Object.keys(dst))if(!Object.prototype.hasOwnProperty.call(src,k))delete dst[k];
  for(const k of Object.keys(src))dst[k]=src[k];}
function netAuthWriteFlagSet(fl){
  if(!fl)return;
  try{if(S&&S.map){if(!S.map.flags)S.map.flags={};if(fl.map)netAuthReplaceFlags(S.map.flags,fl.map);}}catch(e){}
  try{if(S&&S.econ){if(!S.econ.flags)S.econ.flags={};if(fl.econ)netAuthReplaceFlags(S.econ.flags,fl.econ);}}catch(e){}
  try{const C=(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS)||(window.Cult&&Cult.flags);if(C&&fl.cult)netAuthReplaceFlags(C,fl.cult);}catch(e){}
  try{if(S&&Object.prototype.hasOwnProperty.call(fl,'cultSave')){S.flags=S.flags||{};S.flags.cult=fl.cultSave==null?null:netAuthClone(fl.cultSave);}}catch(e){}}
function netAuthKeepCapture(){
  if(NETA.saveKeep)return NETA.saveKeep;
  try{NETA.saveKeep={map:netAuthClone((S&&S.map&&S.map.flags)||{}),econ:netAuthClone((S&&S.econ&&S.econ.flags)||{}),cult:netAuthClone((typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS)||{})};}catch(e){NETA.saveKeep={};}
  return NETA.saveKeep;}
function netAuthFlagsPack(){
  const cult=(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS)||(window.Cult&&Cult.flags)||{};
  return {map:netAuthClone((S&&S.map&&S.map.flags)||{}),econ:netAuthClone((S&&S.econ&&S.econ.flags)||{}),cult:netAuthClone(cult),cultSave:netAuthClone((S&&S.flags&&S.flags.cult)||null)};}
function netAuthApplyHostFlags(fl,fromHost){if(!fl)return;if(fromHost)NETA.host=netAuthClone(fl);netAuthWriteFlagSet(fl);}
function netAuthProtectFlags(){if(netAuthClient()&&NETA.host)netAuthWriteFlagSet(NETA.host);}
function netAuthSessionEnd(restore){
  try{if(restore&&NETA.saveKeep)netAuthWriteFlagSet(NETA.saveKeep);}catch(e){}
  NETA.host=null;NETA.saveKeep=null;NETA.sig='';NETA.last=null;}
function netAuthBlock(name){
  if(!netAuthClient())return false;
  netAuthToast('聯機中「'+name+'」由房主權威結算，客機不可私改（未接操作意圖）');
  return true;}
function netAuthSilentNoop(){return netAuthClient();}
function netAuthSlowPack(){
  const p={v:NETA.v,flags:netAuthFlagsPack()};
  if(netAuthEconOn()&&S&&S.econ)p.econ=netAuthClone(S.econ);
  if(netAuthCultOn()){
    p.cultFled=netAuthClone(S&&S.cultFled||[]);
    p.cultYuanShen=netAuthClone(S&&S.cultYuanShen||[]);
    p.cultSquads=netAuthClone(S&&S.cultSquads||[]);
    p.cultBibi=netAuthClone(S&&S.cultBibi||null);
  }
  return p;}
function netAuthSlowSig(){
  try{const p=netAuthSlowPack();
    // 完整 schema 簽名（含 market/rings/bagBuy 同長度值變）；只在 slow st 上比對，不每 frame 送。
    return JSON.stringify({f:p.flags,e:p.econ||null,cf:p.cultFled||null,cy:p.cultYuanShen||null,cs:p.cultSquads||null,cb:p.cultBibi||null});
  }catch(e){return String(Date.now());}}
function netAuthEnrichSt(m){
  if(!m||m.t!=='st'||!netAuthHost()||!S)return;
  const slow=!!(m.all||m.pl!=null||m.v45!=null||m.b!=null);
  if(!slow&&!m.all)return;
  const sig=netAuthSlowSig();
  if(m.all||sig!==NETA.sig){NETA.sig=sig;const p=netAuthSlowPack();m.auth=p;NETA.sent++;if(p.econ)NETA.econSent++;NETA.last=p;}}
function netAuthApplyPack(p){
  if(!p||!S)return;NETA.rx++;NETA.last=p;
  if(!NETA.saveKeep)netAuthKeepCapture();
  if(p.flags)netAuthApplyHostFlags(p.flags,true);
  if(p.econ){const next=netAuthClone(p.econ);if(typeof grApplyAuthoritativeEcon==='function')grApplyAuthoritativeEcon(next);else S.econ=next;}
  if(Object.prototype.hasOwnProperty.call(p,'cultFled'))S.cultFled=Array.isArray(p.cultFled)?netAuthClone(p.cultFled):[];
  if(Object.prototype.hasOwnProperty.call(p,'cultYuanShen'))S.cultYuanShen=Array.isArray(p.cultYuanShen)?netAuthClone(p.cultYuanShen):[];
  if(Object.prototype.hasOwnProperty.call(p,'cultSquads'))S.cultSquads=Array.isArray(p.cultSquads)?netAuthClone(p.cultSquads):[];
  if(Object.prototype.hasOwnProperty.call(p,'cultBibi'))S.cultBibi=p.cultBibi==null?null:netAuthClone(p.cultBibi);}
function netAuthWrapUser(name,fn,ret){
  if(typeof fn!=='function'){netAuthMark(name,false);return fn;}
  if(fn._netaUser)return fn;
  const w=function(){if(netAuthBlock(name))return ret;return fn.apply(this,arguments);};
  w._netaUser=1;w._neta=1;netAuthMark(name,true);return w;}
function netAuthWrapSilent(name,fn,ret){
  if(typeof fn!=='function'){netAuthMark(name,false);return fn;}
  if(fn._netaSilent)return fn;
  const w=function(){if(netAuthSilentNoop())return ret;return fn.apply(this,arguments);};
  w._netaSilent=1;w._neta=1;netAuthMark(name+' (silent)',true);return w;}
function netAuthWrapObj(obj,key,name,ret,silent){
  try{
    if(!obj||typeof obj[key]!=='function'){netAuthMark(name,false);return;}
    obj[key]=silent?netAuthWrapSilent(name,obj[key],ret):netAuthWrapUser(name,obj[key],ret);
  }catch(e){netAuthMark(name,false);}}
function netAuthInstallLive(){
  const push=(arr,extra,into)=>{if(!arr||!Array.isArray(arr))return;for(const k of extra)if(arr.indexOf(k)<0)arr.push(k);into.length=0;for(const k of extra)if(arr.indexOf(k)>=0)into.push(k);};
  try{if(typeof NET_LIVE_U!=='undefined')push(NET_LIVE_U,NET_AUTH_LIVE_U,NETA.liveU);}catch(e){}
  try{if(typeof NET_LIVE_E!=='undefined')push(NET_LIVE_E,NET_AUTH_LIVE_E,NETA.liveE);}catch(e){}
  try{if(typeof EN_KEEP!=='undefined'){for(const k of ['ownerId','life','ownerKind','cultYS'])if(EN_KEEP.indexOf(k)<0)EN_KEEP.push(k);}}catch(e){}}
function netAuthInstallWrites(){
  netAuthInstallLive();
  const fail=(n)=>{if(NETA.missing.indexOf(n)<0&&NETA.wrapped.indexOf(n)<0)NETA.missing.push(n);};
  // ---- silent simulation ----
  try{if(typeof econTick==='function')econTick=netAuthWrapSilent('econTick',econTick);}catch(e){fail('econTick');}
  try{if(typeof econMarketTick==='function')econMarketTick=netAuthWrapSilent('econMarketTick',econMarketTick);}catch(e){fail('econMarketTick');}
  try{if(typeof econShopTick==='function')econShopTick=netAuthWrapSilent('econShopTick',econShopTick);}catch(e){fail('econShopTick');}
  try{if(typeof econRankTick==='function')econRankTick=netAuthWrapSilent('econRankTick',econRankTick);}catch(e){fail('econRankTick');}
  try{if(typeof econBuildingsTick==='function')econBuildingsTick=netAuthWrapSilent('econBuildingsTick',econBuildingsTick);}catch(e){fail('econBuildingsTick');}
  try{if(typeof CultTickBreak==='function')CultTickBreak=netAuthWrapSilent('CultTickBreak',CultTickBreak);}catch(e){fail('CultTickBreak');}
  try{if(typeof CultTickDeath==='function')CultTickDeath=netAuthWrapSilent('CultTickDeath',CultTickDeath);}catch(e){fail('CultTickDeath');}
  try{if(typeof cultTickCore==='function')cultTickCore=netAuthWrapSilent('cultTickCore',cultTickCore);}catch(e){fail('cultTickCore');}
  try{if(typeof cultApplyOffline==='function')cultApplyOffline=netAuthWrapSilent('cultApplyOffline',cultApplyOffline,0);}catch(e){fail('cultApplyOffline');}
  try{if(window.Cult)netAuthWrapObj(Cult,'tick','Cult.tick',undefined,true);}catch(e){fail('Cult.tick');}
  try{if(window.Cult)netAuthWrapObj(Cult,'applyOffline','Cult.applyOffline',0,true);}catch(e){fail('Cult.applyOffline');}
  try{if(window.CultAI)netAuthWrapObj(CultAI,'tick','CultAI.tick',undefined,true);}catch(e){fail('CultAI.tick');}
  try{if(window.CultAICombat)netAuthWrapObj(CultAICombat,'tick','CultAICombat.tick',undefined,true);}catch(e){fail('CultAICombat.tick');}
  try{if(window.CultBibi)netAuthWrapObj(CultBibi,'tick','CultBibi.tick',undefined,true);}catch(e){fail('CultBibi.tick');}
  try{if(typeof mapPartyTick==='function')mapPartyTick=netAuthWrapSilent('mapPartyTick',mapPartyTick);}catch(e){fail('mapPartyTick');}
  try{if(typeof xhzPayXia==='function')xhzPayXia=netAuthWrapSilent('xhzPayXia',xhzPayXia,false);}catch(e){fail('xhzPayXia');}

  // ---- user writes (toast)；tryBreak 已有 net2 intent，不在此拒 ----
  const RF={ok:false,reason:'net-auth'};
  try{if(typeof econPay==='function')econPay=netAuthWrapUser('econPay',econPay,RF);}catch(e){fail('econPay');}
  try{if(typeof econGain==='function')econGain=netAuthWrapUser('econGain',econGain,RF);}catch(e){fail('econGain');}
  try{if(typeof econCharge==='function')econCharge=netAuthWrapUser('econCharge',econCharge,RF);}catch(e){fail('econCharge');}
  try{if(typeof econGrant==='function')econGrant=netAuthWrapUser('econGrant',econGrant,RF);}catch(e){fail('econGrant');}
  try{if(typeof econPayMonth==='function')econPayMonth=netAuthWrapUser('econPayMonth',econPayMonth);}catch(e){fail('econPayMonth');}
  try{if(typeof econSetTaxRate==='function')econSetTaxRate=netAuthWrapUser('econSetTaxRate',econSetTaxRate,false);}catch(e){fail('econSetTaxRate');}
  try{if(typeof econSetStipend==='function')econSetStipend=netAuthWrapUser('econSetStipend',econSetStipend,false);}catch(e){fail('econSetStipend');}
  try{if(typeof econAppoint==='function')econAppoint=netAuthWrapUser('econAppoint',econAppoint,RF);}catch(e){fail('econAppoint');}
  try{if(typeof econBuyBagSlots==='function')econBuyBagSlots=netAuthWrapUser('econBuyBagSlots',econBuyBagSlots,RF);else fail('econBuyBagSlots');}catch(e){fail('econBuyBagSlots');}
  try{if(typeof econGiveRing==='function')econGiveRing=netAuthWrapUser('econGiveRing',econGiveRing,RF);else fail('econGiveRing');}catch(e){fail('econGiveRing');}
  try{if(typeof econRingPut==='function')econRingPut=netAuthWrapUser('econRingPut',econRingPut,RF);else fail('econRingPut');}catch(e){fail('econRingPut');}
  try{if(typeof econRingTakeAll==='function')econRingTakeAll=netAuthWrapUser('econRingTakeAll',econRingTakeAll,RF);else fail('econRingTakeAll');}catch(e){fail('econRingTakeAll');}
  try{if(typeof econCommission==='function')econCommission=netAuthWrapUser('econCommission',econCommission,RF);else fail('econCommission');}catch(e){fail('econCommission');}
  try{if(typeof econPlayerOrder==='function')econPlayerOrder=netAuthWrapUser('econPlayerOrder',econPlayerOrder,RF);else fail('econPlayerOrder');}catch(e){fail('econPlayerOrder');}
  try{if(typeof econShopBuy==='function')econShopBuy=netAuthWrapUser('econShopBuy',econShopBuy,RF);else fail('econShopBuy');}catch(e){fail('econShopBuy');}
  try{if(typeof econSellToCity==='function')econSellToCity=netAuthWrapUser('econSellToCity',econSellToCity,RF);else fail('econSellToCity');}catch(e){fail('econSellToCity');}
  try{if(typeof econRankSetFilter==='function')econRankSetFilter=netAuthWrapUser('econRankSetFilter',econRankSetFilter);else fail('econRankSetFilter');}catch(e){fail('econRankSetFilter');}
  try{if(typeof econElderAssign==='function')econElderAssign=netAuthWrapUser('econElderAssign',econElderAssign,RF);else fail('econElderAssign');}catch(e){fail('econElderAssign');}
  try{if(typeof doBreak==='function')doBreak=netAuthWrapUser('doBreak',doBreak,false);}catch(e){fail('doBreak');}
  try{if(typeof cultDestroyYuanShen==='function')cultDestroyYuanShen=netAuthWrapUser('cultDestroyYuanShen',cultDestroyYuanShen,false);else fail('cultDestroyYuanShen');}catch(e){fail('cultDestroyYuanShen');}
  try{if(typeof cultHitYuanShen==='function')cultHitYuanShen=netAuthWrapUser('cultHitYuanShen',cultHitYuanShen,false);else fail('cultHitYuanShen');}catch(e){fail('cultHitYuanShen');}
  try{if(typeof mapDefeatResolve==='function')mapDefeatResolve=netAuthWrapUser('mapDefeatResolve',mapDefeatResolve,null);else fail('mapDefeatResolve');}catch(e){fail('mapDefeatResolve');}
  try{if(typeof mapRecordSoul==='function')mapRecordSoul=netAuthWrapUser('mapRecordSoul',mapRecordSoul,null);else fail('mapRecordSoul');}catch(e){fail('mapRecordSoul');}
  try{if(typeof mapSoulTryDestroy==='function')mapSoulTryDestroy=netAuthWrapUser('mapSoulTryDestroy',mapSoulTryDestroy,false);else fail('mapSoulTryDestroy');}catch(e){fail('mapSoulTryDestroy');}
  try{if(typeof mapSoulRecordPending==='function')mapSoulRecordPending=netAuthWrapUser('mapSoulRecordPending',mapSoulRecordPending,null);else fail('mapSoulRecordPending');}catch(e){fail('mapSoulRecordPending');}
  try{if(typeof mapPartyForm==='function')mapPartyForm=netAuthWrapUser('mapPartyForm',mapPartyForm,null);else fail('mapPartyForm');}catch(e){fail('mapPartyForm');}
  try{if(typeof mapPartyDepart==='function')mapPartyDepart=netAuthWrapUser('mapPartyDepart',mapPartyDepart,null);else fail('mapPartyDepart');}catch(e){fail('mapPartyDepart');}
  try{if(typeof mapPartyResolve==='function')mapPartyResolve=netAuthWrapUser('mapPartyResolve',mapPartyResolve,null);else fail('mapPartyResolve');}catch(e){fail('mapPartyResolve');}
  try{if(typeof mapPay==='function')mapPay=netAuthWrapUser('mapPay',mapPay,RF);else fail('mapPay');}catch(e){fail('mapPay');}
  try{if(typeof mapGain==='function')mapGain=netAuthWrapUser('mapGain',mapGain,RF);else fail('mapGain');}catch(e){fail('mapGain');}

  try{if(window.Cult){
    netAuthWrapObj(Cult,'startBreakthrough','Cult.startBreakthrough',false,false);
    netAuthWrapObj(Cult,'addDandu','Cult.addDandu',0,false);
    netAuthWrapObj(Cult,'setFlags','Cult.setFlags',Cult,false);
    netAuthWrapObj(Cult,'useMiehun','Cult.useMiehun',false,false);
    netAuthWrapObj(Cult,'attackYuanShen','Cult.attackYuanShen',false,false);
    netAuthWrapObj(Cult,'resolveDefeat','Cult.resolveDefeat',null,false);
    netAuthWrapObj(Cult,'lsSpend','Cult.lsSpend',null,false);
    // 客機绝不本地重扣倒下懲罰（silent no-op）；房主走原函式
    netAuthWrapObj(Cult,'applyDownPenalty','Cult.applyDownPenalty',{ok:false,reason:'client'},true);
    if(typeof Cult.setFlags==='function'){const _sf=Cult.setFlags;if(!_sf._netaProt){Cult.setFlags=function(){const r=_sf.apply(this,arguments);try{if(netAuthClient())netAuthProtectFlags();}catch(e){}return r;};Cult.setFlags._netaProt=1;}}
  }else{['Cult.startBreakthrough','Cult.addDandu','Cult.setFlags','Cult.useMiehun','Cult.attackYuanShen','Cult.resolveDefeat','Cult.lsSpend'].forEach(fail);}}catch(e){}
  try{if(window.CultAI){
    netAuthWrapObj(CultAI,'setFormation','CultAI.setFormation',null,false);
    netAuthWrapObj(CultAI,'setTactic','CultAI.setTactic',null,false);
    netAuthWrapObj(CultAI,'setAuto','CultAI.setAuto',null,false);
  }else{['CultAI.setFormation','CultAI.setTactic','CultAI.setAuto'].forEach(fail);}}catch(e){}
  try{if(window.CultBibi){
    netAuthWrapObj(CultBibi,'start','CultBibi.start',false,false);
    netAuthWrapObj(CultBibi,'playNext','CultBibi.playNext',false,false);
    netAuthWrapObj(CultBibi,'instantAll','CultBibi.instantAll',false,false);
    netAuthWrapObj(CultBibi,'resolveBout','CultBibi.resolveBout',false,false);
  }else{['CultBibi.start','CultBibi.playNext','CultBibi.instantAll','CultBibi.resolveBout'].forEach(fail);}}catch(e){}

  // 剩餘公開寫入口：內部結算 silent、可點操作 user；全域與 XW_ECON 對齊
  try{if(typeof econCultCharge==='function')econCultCharge=netAuthWrapUser('econCultCharge',econCultCharge,{ok:false,reason:'net-auth',speedMul:1});else fail('econCultCharge');}catch(e){fail('econCultCharge');}
  try{if(typeof econClaimDroppedRing==='function')econClaimDroppedRing=netAuthWrapUser('econClaimDroppedRing',econClaimDroppedRing,{ok:false,reason:'net-auth'});else fail('econClaimDroppedRing');}catch(e){fail('econClaimDroppedRing');}
  try{if(typeof econClearImprint==='function')econClearImprint=netAuthWrapUser('econClearImprint',econClearImprint,{ok:false,reason:'net-auth'});else fail('econClearImprint');}catch(e){fail('econClearImprint');}
  try{if(typeof econOnQuestReward==='function')econOnQuestReward=netAuthWrapSilent('econOnQuestReward',econOnQuestReward,null);else fail('econOnQuestReward');}catch(e){fail('econOnQuestReward');}
  try{if(typeof econOnUnitDown==='function')econOnUnitDown=netAuthWrapSilent('econOnUnitDown',econOnUnitDown,null);else fail('econOnUnitDown');}catch(e){fail('econOnUnitDown');}
  try{if(typeof econGatherPut==='function')econGatherPut=netAuthWrapSilent('econGatherPut',econGatherPut,{ok:false,reason:'net-auth',added:0,left:0});else fail('econGatherPut');}catch(e){fail('econGatherPut');}
  try{if(typeof econGatherDeposit==='function')econGatherDeposit=netAuthWrapSilent('econGatherDeposit',econGatherDeposit,{ok:false,reason:'net-auth'});else fail('econGatherDeposit');}catch(e){fail('econGatherDeposit');}
  try{if(typeof econGatherOnStart==='function')econGatherOnStart=netAuthWrapSilent('econGatherOnStart',econGatherOnStart);else fail('econGatherOnStart');}catch(e){fail('econGatherOnStart');}
  try{if(typeof econElderAdjustFinance==='function')econElderAdjustFinance=netAuthWrapSilent('econElderAdjustFinance',econElderAdjustFinance);else fail('econElderAdjustFinance');}catch(e){fail('econElderAdjustFinance');}
  try{if(typeof econAutoRecruitOnce==='function')econAutoRecruitOnce=netAuthWrapSilent('econAutoRecruitOnce',econAutoRecruitOnce,{ok:false,reason:'net-auth'});else fail('econAutoRecruitOnce');}catch(e){fail('econAutoRecruitOnce');}
  try{if(typeof econOnCraftFinished==='function')econOnCraftFinished=netAuthWrapSilent('econOnCraftFinished',econOnCraftFinished,{ok:false,reason:'net-auth'});else fail('econOnCraftFinished');}catch(e){fail('econOnCraftFinished');}

  try{if(window.CultAICombat){
    netAuthWrapObj(CultAICombat,'callHelp','CultAICombat.callHelp',[],true);
    netAuthWrapObj(CultAICombat,'retreat','CultAICombat.retreat',false,true);
    netAuthWrapObj(CultAICombat,'spar','CultAICombat.spar',false,true);
    netAuthWrapObj(CultAICombat,'threat','CultAICombat.threat',1,true);
  }else{['CultAICombat.callHelp','CultAICombat.retreat','CultAICombat.spar','CultAICombat.threat'].forEach(fail);}}catch(e){}

  const econUser=['pay','gain','charge','grant','payMonth','setTax','setStipend','appoint','buyBagSlots','giveRing','ringPut','ringTakeAll','commission','playerOrder','shopBuy','sellToCity','rankSetFilter','elderAssign','cultCharge','claimRing','clearImprint'];
  const econSilent=['tick','marketTick','shopTick','rankTick','buildingsTick','onQuestReward','onUnitDown','gatherPut','gatherDeposit','gatherOnStart','elderAdjustFinance','autoRecruitOnce','onCraftFinished'];
  try{if(window.XW_ECON){const A=window.XW_ECON;
    econUser.forEach(k=>netAuthWrapObj(A,k,'XW_ECON.'+k,(k==='pay'||k==='gain'||k==='charge'||k==='grant'||k==='cultCharge'||k==='claimRing'||k==='clearImprint')?RF:undefined,false));
    econSilent.forEach(k=>netAuthWrapObj(A,k,'XW_ECON.'+k,undefined,true));
    if(window.XW)window.XW.econ=A;
    const gfUser=['gfBorrow','gfReturn','gfBeginStudy','gfStore','gfWithdraw','gfStockBuy','gfStockSell','gfLearn','gfSetRule','gfCultLearn'];
    gfUser.forEach(k=>netAuthWrapObj(A,k,'XW_ECON.'+k,RF,false));
    if(typeof A.gfTick==='function')netAuthWrapObj(A,'gfTick','XW_ECON.gfTick',undefined,true);
  }}catch(e){}

  // 功法公開寫：主機可算；客機只讀，不得買/借/存取/學習/裝備/發放/掉落本地重結算。旗保持 ON。
  const GF_RF={ok:false,reason:'net-auth'};
  try{if(window.CultGF){
    [['learn',GF_RF],['xwLearn',GF_RF],['grant',null],['grantManual',0],['consumeManual',false],['startStudy',GF_RF],['returnManual',GF_RF],['returnAll',[]],['equip',GF_RF],['unequip',GF_RF],['rollDrop',null]].forEach(([k,ret])=>netAuthWrapObj(CultGF,k,'CultGF.'+k,ret,false));
    netAuthWrapObj(CultGF,'tick','CultGF.tick',undefined,true);
  }}catch(e){}
  try{if(window.XW_GF){
    [['learn',GF_RF],['grant',null],['rollDrop',null]].forEach(([k,ret])=>netAuthWrapObj(XW_GF,k,'XW_GF.'+k,ret,false));
  }}catch(e){}
  try{if(window.XW_ECON_GF)netAuthWrapObj(XW_ECON_GF,'learn','XW_ECON_GF.learn',GF_RF,false);}catch(e){}
  try{if(window.Cult&&typeof Cult.grantGongfa==='function')netAuthWrapObj(Cult,'grantGongfa','Cult.grantGongfa',null,false);}catch(e){}
  try{if(typeof econGfBorrow==='function')econGfBorrow=netAuthWrapUser('econGfBorrow',econGfBorrow,GF_RF);}catch(e){}
  try{if(typeof econGfReturn==='function')econGfReturn=netAuthWrapUser('econGfReturn',econGfReturn,GF_RF);}catch(e){}
  try{if(typeof econGfBeginStudy==='function')econGfBeginStudy=netAuthWrapUser('econGfBeginStudy',econGfBeginStudy,GF_RF);}catch(e){}
  try{if(typeof econGfStore==='function')econGfStore=netAuthWrapUser('econGfStore',econGfStore,null);}catch(e){}
  try{if(typeof econGfWithdraw==='function')econGfWithdraw=netAuthWrapUser('econGfWithdraw',econGfWithdraw,null);}catch(e){}
  try{if(typeof econGfStockBuy==='function')econGfStockBuy=netAuthWrapUser('econGfStockBuy',econGfStockBuy,GF_RF);}catch(e){}
  try{if(typeof econGfStockSell==='function')econGfStockSell=netAuthWrapUser('econGfStockSell',econGfStockSell,GF_RF);}catch(e){}
  try{if(typeof econGfCultLearn==='function')econGfCultLearn=netAuthWrapUser('econGfCultLearn',econGfCultLearn,GF_RF);}catch(e){}
  try{if(typeof econGfSetRule==='function')econGfSetRule=netAuthWrapUser('econGfSetRule',econGfSetRule,false);}catch(e){}
  try{if(typeof econGfTick==='function')econGfTick=netAuthWrapSilent('econGfTick',econGfTick);}catch(e){}
  try{if(typeof mapGfGrant==='function')mapGfGrant=netAuthWrapUser('mapGfGrant',mapGfGrant,null);}catch(e){}
  try{if(typeof mapGfTryDrop==='function')mapGfTryDrop=netAuthWrapSilent('mapGfTryDrop',mapGfTryDrop,null);}catch(e){}
}

function netAuthModList(){
  const online=netAuthOn(),host=netAuthHost();
  const role=host?'host':(online?'client':'solo');
  const pick=(s,h,c)=>!online?s:(host?h:c);
  const row=(id,n,cap,note)=>({id,n,cap,note,role});
  const L=[];
  L.push(row('core','核心聯機（房間／快照／組隊／舊秘境／採集／技能）','可用','既有 net1–19；tryBreak 走既有 break intent'));
  L.push(row('map.fog','地圖迷霧（共用）','可用',pick('單機可用','房主揭露、成員 intent mapfog','intent mapfog；房主揭露')));
  L.push(row('map.world','大地圖／城／至寶／外交狀態',pick('可用','房主可用','成員只讀'),pick('單機可操作','房主結算並投影','慢包／full 投影；客機拒 mapPay/mapGain 等')));
  L.push(row('map.sects','他宗 AI',pick('可用','房主可用','成員只讀'),pick('單機可操作','房主 mapSectsTick＋sects/diplo 包','成員只讀投影')));
  L.push(row('map.travel','飛行／途中遭遇',pick('可用','暫停','暫停'),pick('單機可飛行／遇敵','聯機雙邊不跑 tick／Start（net19）','聯機暫停（net19）')));
  L.push(row('map.dungeons','新地圖多分區副本',pick('可用','暫停','暫停'),pick('單機可進新副本','聯機拒絕 mapDgEnter；舊 S.dg 仍可用','聯機暫停；舊 S.dg 仍可用')));
  L.push(row('map.soul','defeat／soul／autoParty 入口',pick('可用','暫停','暫停'),pick('單機可操作','聯機不跑客機私改；房主亦不開新 intent','客機拒 mapDefeatResolve/mapRecordSoul/mapSoulTryDestroy/mapPartyForm 等')));
  L.push(row('econ','經濟結算（月結／市場／俸祿／扣款）',!online?'可用':(netAuthEconOn()?(host?'房主可用':'成員只讀'):'旗關'),pick('單機全功能','房主結算並投影；旗關當次不送 p.econ','客機 silent tick；旗關當次不送 p.econ')));
  L.push(row('econ.ranks','職位／ranks／prod／shop／rings',!online?'可用':(host?'房主可用':'成員只讀'),pick('單機可任命／買賣','房主可操作；S.econ 完整簽名','客機拒 appoint/commission/shopBuy/rings/bag 及對齊之公開寫入口')));
  L.push(row('build','建築類型／等級','可用','沿現有 st.b＝S.buildings'));
  L.push(row('cult','修煉／突破／天劫／死亡結算',!online?'可用':(netAuthCultOn()?(host?'房主可用':'成員只讀'):'旗關'),pick('單機全功能','房主結算並投影','客機 silent Cult.tick；拒 startBreakthrough/useMiehun/attackYuanShen。Cult.devFillBreak/devStrike 為開發金手指，標明不支援、不攔截')));
  L.push(row('cult.ai','戰術 AI／陣型',pick('可用','房主可用','成員只讀'),pick('單機可操作','房主可 setFormation/setTactic/setAuto','客機 silent CultAI.tick；拒陣型／戰術／自動。CultAICombat.judge/pickTarget/power/nearYard/probeNearest 純讀不攔；callHelp/retreat/spar/threat 為寫入口 silent gate')));
  L.push(row('cult.bibi','宗門大比',pick('可用','房主可用','成員只讀／觀戰暫停'),pick('單機可開大比','房主可操作','客機 silent tick；拒 start/playNext/instantAll/resolveBout')));
  L.push(row('cult.soul','元神／逃敵／pendingSouls',pick('可用','房主可用','成員只讀'),pick('單機可操作','房主投影 cultYS／pendingSouls','慢包＋單位 live：cultYS 等')));
  L.push(row('cult.gongfa','功法學習／閣／掉落',pick('可用','房主可用','成員只讀'),pick('單機可寫','房主結算 borrow/learn/grant/drop','客機拒公開寫；gfBag／unit.gf／econ.gf 投影')));
  L.push(row('xlod','大量弟子網路投影','未接','XLOD_SCHEMA 已定；省略≠刪除。本輪不接'));
  return L;}
function netAuthRenderUi(){
  const p=typeof netEl==='function'?netEl('netp'):document.getElementById('netp');
  if(!p||!p.classList||!p.classList.contains('open'))return;
  let box=document.getElementById('np_mods');if(!box){box=document.createElement('div');box.id='np_mods';p.appendChild(box);}
  const L=netAuthModList();const mode=netAuthOn()?(netAuthHost()?'房主設定（權威）':'成員視圖（以房主為準）'):'單機（全功能，無 gate）';
  let h='<div class="muted" style="margin-top:8px;padding-top:8px;border-top:1px solid #3a3020">模組狀態・'+netAuthEsc(mode)+'</div>';
  h+='<div class="muted" style="font-size:12px;line-height:1.45">';
  for(const m of L)h+='<div>［'+netAuthEsc(m.cap)+'］'+netAuthEsc(m.n)+' — '+netAuthEsc(m.note)+'</div>';
  h+='</div>';box.innerHTML=h;}
function netAuthEsc(s){return typeof netEsc==='function'?netEsc(s):String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

{const _cast=netCast;netCast=function(m){try{if(m&&m.t==='st')netAuthEnrichSt(m);}catch(e){}return _cast.apply(this,arguments);};}
{if(typeof netApplySt==='function'){const _st=netApplySt;netApplySt=function(m){const r=_st.apply(this,arguments);try{if(m&&m.auth)netAuthApplyPack(m.auth);}catch(e){}return r;};}}
{if(typeof netMapSlowPack==='function'){const _p=netMapSlowPack;netMapSlowPack=function(){const p=_p.apply(this,arguments);try{if(p&&S&&S.map)p.pendingSouls=Array.isArray(S.map.pendingSouls)?S.map.pendingSouls:[];}catch(e){}return p;};}}
{if(typeof netMapSlowSig==='function'){const _s=netMapSlowSig;netMapSlowSig=function(){const base=_s.apply(this,arguments);try{return base+'|ps:'+JSON.stringify((S&&S.map&&S.map.pendingSouls)||[]);}catch(e){return base;}};}}
{if(typeof netMapApplyMapPack==='function'){const _a=netMapApplyMapPack;netMapApplyMapPack=function(p){const r=_a.apply(this,arguments);try{if(p&&S&&S.map&&Object.prototype.hasOwnProperty.call(p,'pendingSouls'))S.map.pendingSouls=Array.isArray(p.pendingSouls)?p.pendingSouls:[];}catch(e){}return r;};}}

{const _sn=snapshot;snapshot=function(){const d=_sn.apply(this,arguments);try{if(d&&S){
  if(d.cultSquads==null)d.cultSquads=netAuthClone(S.cultSquads||[]);
  if(!Object.prototype.hasOwnProperty.call(d,'cultBibi'))d.cultBibi=S.cultBibi==null?null:netAuthClone(S.cultBibi);
  if(d.map&&S.map&&d.map.pendingSouls==null&&S.map.pendingSouls)d.map.pendingSouls=netAuthClone(S.map.pendingSouls);
  if(d.gfBag==null&&S.gfBag)d.gfBag=netAuthClone(S.gfBag);
  if(d.econ&&S.econ&&d.econ.gf==null&&S.econ.gf)d.econ.gf=netAuthClone(S.econ.gf);
  d.auth=d.auth||{v:NETA.v,flags:netAuthFlagsPack()};
}}catch(e){}return d;};}
{const _as=applySave;applySave=function(d){
  // 先在 currency snapshot 邊界驗 raw/clone，避免內層 cult migration 改原輸入後才驗貨幣。
  if(typeof grCurrencyLoadPlan==='function'){const plan=grCurrencyLoadPlan(d);if(!plan.ok){grCurrencySetLoadStatus(plan);return false;}d=plan.data;}
  try{if(netAuthClient()&&!NETA.saveKeep)netAuthKeepCapture();}catch(e){}
  const r=_as.apply(this,arguments);try{if(r&&S&&d){
  if(Object.prototype.hasOwnProperty.call(d,'cultSquads'))S.cultSquads=Array.isArray(d.cultSquads)?netAuthClone(d.cultSquads):[];
  if(Object.prototype.hasOwnProperty.call(d,'cultBibi'))S.cultBibi=d.cultBibi==null?null:netAuthClone(d.cultBibi);
  if(Object.prototype.hasOwnProperty.call(d,'gfBag'))S.gfBag=d.gfBag&&typeof d.gfBag==='object'?netAuthClone(d.gfBag):{};
  if(netAuthClient()){if(d.auth&&d.auth.flags)netAuthApplyHostFlags(d.auth.flags,true);
    else netAuthApplyHostFlags({map:d.map&&d.map.flags,econ:d.econ&&d.econ.flags,cult:null},true);}
}}catch(e){}return r;};}

{if(typeof xmodApply==='function'){const _x=xmodApply;xmodApply=function(){const r=_x.apply(this,arguments);try{netAuthProtectFlags();}catch(e){}return r;};}}
{if(typeof newGame==='function'){const _n=newGame;newGame=function(){const r=_n.apply(this,arguments);try{if(netAuthClient())netAuthProtectFlags();}catch(e){}return r;};}}
{if(typeof mapMigrateSave==='function'){const _m=mapMigrateSave;mapMigrateSave=function(){const r=_m.apply(this,arguments);try{netAuthProtectFlags();}catch(e){}return r;};}}
{if(typeof econMigrateSave==='function'){const _e=econMigrateSave;econMigrateSave=function(){const r=_e.apply(this,arguments);try{netAuthProtectFlags();}catch(e){}return r;};}}
{if(typeof netLeave==='function'){const _lv=netLeave;netLeave=function(quiet){const was=NET&&NET.role;const r=_lv.apply(this,arguments);try{netAuthSessionEnd(was==='client');}catch(e){}return r;};}}
{if(typeof netJoin==='function'){const _jn=netJoin;netJoin=function(){try{netAuthSessionEnd(false);}catch(e){}return _jn.apply(this,arguments);};}}
{if(typeof netHost==='function'){const _hs=netHost;netHost=function(){try{netAuthSessionEnd(false);}catch(e){}return _hs.apply(this,arguments);};}}


// ---- 主機倒下結算：每個實際 down 呼叫一次 Cult.applyDownPenalty；同一 downId 重複回調去重，復活後清 id 以免下次誤去重。客機不呼叫（且上方 silent gate）。
function netAuthIsPc(u){return !!(u&&(u.kind==='player'||u.np));}
function netAuthDownId(u,why){
  if(u&&u._netDownId)return u._netDownId;
  NETA.downN=(NETA.downN||0)+1;
  const t=(typeof S!=='undefined'&&S&&S.time!=null)?S.time:0;
  const id='nd:'+String(u&&u.id)+':'+t+':'+NETA.downN; // 不含 why：dmg/onDeath/leaveNow 不同 why 不得變成兩個鍵而重扣
  if(u)u._netDownId=id;
  return id;
}
function netAuthDownClear(u){if(u)u._netDownId=null;}
function netAuthApplyDownPenalty(u,ctx){
  ctx=ctx||{};
  if(!u||NET.role!=='host'||!netAuthIsPc(u))return;
  try{
    if(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS&&!CULT_FLAGS.death)return;
    if(!window.Cult||typeof Cult.applyDownPenalty!=='function')return;
    const why=ctx.why||'battle';
    const downId=ctx.downId||netAuthDownId(u,why);
    u._netDownId=downId;
    return Cult.applyDownPenalty(u,{why:why,src:ctx.src||null,downId:downId,lethal:ctx.lethal!==false,revive:!!ctx.revive});
  }catch(e){}}
function netAuthInstallDownHooks(){
  if(NETA.downHook)return;NETA.downHook=1;
  try{if(typeof netDgLeaveNow==='function'){const _x=netDgLeaveNow;netDgLeaveNow=function(u,why){
    const r=_x.apply(this,arguments);
    try{if(why==='down')netAuthApplyDownPenalty(u,{why:'dungeon',lethal:true});}catch(e){}
    return r;};}}catch(e){}
  try{if(typeof y47Down==='function'){const _x=y47Down;y47Down=function(u){
    const r=_x.apply(this,arguments);
    try{netAuthApplyDownPenalty(u,{why:'battle',lethal:true});}catch(e){}
    return r;};}}catch(e){}
  try{if(typeof onPlayerDeath==='function'){const _x=onPlayerDeath;onPlayerDeath=function(u){
    const r=_x.apply(this,arguments);
    try{netAuthApplyDownPenalty(u,{why:(typeof S!=='undefined'&&S&&S.dg)?'dungeon':'battle',lethal:true});}catch(e){}
    return r;};}}catch(e){}
  try{if(typeof y47Revive==='function'){const _x=y47Revive;y47Revive=function(u,by){
    const r=_x.apply(this,arguments);
    try{netAuthDownClear(u);}catch(e){}
    return r;};}}catch(e){}
  try{if(typeof netDgRevHost==='function'){const _x=netDgRevHost;netDgRevHost=function(){
    const u=typeof netHostPlayerU==='function'?netHostPlayerU():null;const r=_x.apply(this,arguments);
    try{if(r)netAuthDownClear(u);}catch(e){}
    return r;};}}catch(e){}
  try{if(typeof netApplyIntent0==='function'){const _x=netApplyIntent0;netApplyIntent0=function(pk,i){
    const r=_x.apply(this,arguments);
    try{if(r&&i&&i.a==='dgrev'){const a=typeof netAvatarOf==='function'?netAvatarOf(pk):null;netAuthDownClear(a);}}catch(e){}
    return r;};}}catch(e){}
}
netAuthInstallDownHooks();
netAuthInstallWrites();
// 只為接上各 econ* 在 IIFE 結束後才掛到 XW_ECON 的 method（它們自己 setTimeout(0) attach）；不當作「可放在 cult 前」的藉口。
try{setTimeout(function(){try{netAuthInstallWrites();}catch(e){}},0);}catch(e){}

{if(typeof netRender==='function'){const _r=netRender;netRender=function(){const r=_r.apply(this,arguments);try{netAuthRenderUi();}catch(e){}return r;};}}
{if(typeof XW045==='function'){const _x=XW045;XW045=function(){const o=_x.apply(this,arguments);try{if(o&&o.net)o.net.auth={mods:netAuthModList,flags:netAuthFlagsPack,keep:()=>NETA.saveKeep,host:()=>NETA.host,last:()=>NETA.last,stats:()=>({sent:NETA.sent,rx:NETA.rx,econSent:NETA.econSent,sig:NETA.sig,toastN:NETA.toastN||0}),econOn:netAuthEconOn,cultOn:netAuthCultOn,wrapped:()=>NETA.wrapped.slice(),missing:()=>NETA.missing.slice(),live:()=>({u:NETA.liveU.slice(),e:NETA.liveE.slice()})};}catch(e){}return o;};}}

// core/Cult 在 g7 啟動時還會安裝讀檔 wrapper；於同步 boot 完成後封住 raw currency 邊界。
try{setTimeout(function netAuthCurrencyLoadBoundary(){if(typeof grCurrencyLoadPlan!=='function'||typeof applySave!=='function')return;
  const load=applySave;applySave=function(d){const plan=grCurrencyLoadPlan(d);if(!plan.ok){grCurrencySetLoadStatus(plan);return false;}return load.call(this,plan.data);};
},0);}catch(e){}
