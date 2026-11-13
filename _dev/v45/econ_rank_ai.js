// ================== 仙武經濟：長老 AI＋自動招募 ===================
var ECON_ELDER_TUNE={
  period:8,
  recruitEvery:45,
  vaultLowXia:20,
  vaultHighXia:400,
  taxStep:0.01,
  stipendStep:1,
  loyaltyLow:45,
  jobs:['gather','train','guard'],
  choreJobs:[['gather','wood'],['gather','stone'],['gather','fiber'],['gather','food'],['gather','herb'],['gather','lingshi'],['gather','iron']],
  combatCats:['妖獸狩獵','山賊討伐','巡邏警戒','心魔挑戰','秘境探索','緊急救援']
};
function econIsAutoWorkExempt(u){
  try{
    if(typeof Cult!=='undefined'&&Cult&&typeof Cult.isAutoWorkExempt==='function')return !!Cult.isAutoWorkExempt(u);
  }catch(e){}
  return false;
}
function econElderUnits(){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return [];
  return T.units.filter(u=>u&&!u.dead&&u.kind==='disciple'&&!econIsPlayerUnit(u)&&econPostOf(u)==='zhanglao');
}
function econElderIdle(){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return [];
  return T.units.filter(u=>u&&!u.dead&&u.kind==='disciple'&&!econIsPlayerUnit(u)&&!u.job&&!u.task&&!econIsAutoWorkExempt(u)&&!(typeof ECON_ELDER_TRADE!=='undefined'&&ECON_ELDER_TRADE&&u.econTradeMid));
}
function econZayiIsCombatEv(ev){
  if(!ev)return false;
  let cat=ev.cat||ev.cName;
  try{if(cat==null&&typeof Y47EV_CAT!=='undefined'&&ev.c!=null)cat=Y47EV_CAT[ev.c];}catch(e){}
  const list=ECON_ELDER_TUNE.combatCats||[];
  return !!(cat&&list.indexOf(cat)>=0);
}
function econZayiChore(u){
  try{if(econIsAutoWorkExempt(u))return false;}catch(e){}
  if(typeof setTask==='function'){
    try{
      const T=S;
      if(T&&T.buildings){
        const broken=T.buildings.find(b=>b&&b.built&&(b.broken||(b.hp!=null&&b.maxhp!=null&&b.hp<b.maxhp)));
        if(broken){setTask(u,{type:'repair',bid:broken.id});u.job='repair';return true;}
      }
    }catch(e){}
  }
  if(typeof assignJob!=='function')return false;
  const chores=ECON_ELDER_TUNE.choreJobs||[['gather','wood']];
  const sa1=typeof econSaOn==='function'?econSaOn('sa1'):true;
  if(sa1&&typeof econGatherResForAssign==='function'){
    const r=econGatherResForAssign(u);
    const ok=!!assignJob(u,'gather',r);
    try{if(ok&&typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.sa2Mark==='function')window.XW_ECON.sa2Mark(u,r);}catch(e){}
    return ok;
  }
  const pick=chores[(u.id||0)%chores.length];
  return !!assignJob(u,pick[0],pick[1]);
}
function econElderAssign(){
  if(typeof assignJob!=='function')return 0;
  const idle=econElderIdle();let n=0;
  const hasRW=typeof econRankHasBuilding==='function'&&econRankHasBuilding('renwutang');
  const hasZF=typeof econRankHasBuilding==='function'&&econRankHasBuilding('zhifatang');
  const jobs=ECON_ELDER_TUNE.jobs.slice();
  if(hasRW)jobs.unshift('gather');
  for(const u of idle){
    try{if(econIsAutoWorkExempt(u))continue;}catch(e){}
    if(hasZF&&(u.loyal||100)<ECON_ELDER_TUNE.loyaltyLow){
      try{if(assignJob(u,'rest')||assignJob(u,'train'))n++;}catch(e){}
      continue;
    }
    if(econPostOf(u)==='zayi'){
      try{if(econZayiChore(u))n++;}catch(e){}
      continue;
    }
    const j=jobs[n%jobs.length];
    try{if(assignJob(u,j,j==='gather'?'wood':undefined))n++;}catch(e){}
  }
  return n;
}
function econElderAdjustFinance(){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return;
  let vault=0;
  try{const X=typeof econXws==='function'?econXws():null;if(X&&T===S)vault=+X.get('lingshi')||0;else if(typeof econBagXia==='function')vault=econBagXia(T.econ.vault);}catch(e){vault=(T.res&&T.res.lingshi)||0;}
  const lo=ECON_RANK_TUNE?ECON_RANK_TUNE.taxMin:0.10,hi=ECON_RANK_TUNE?ECON_RANK_TUNE.taxMax:0.20;
  if(T.econ.taxRate==null)return;
  if(vault<ECON_ELDER_TUNE.vaultLowXia){
    const next=Math.min(hi,(T.econ.taxRate||0.15)+ECON_ELDER_TUNE.taxStep);
    if(typeof econSetTaxRate==='function')econSetTaxRate(next);else T.econ.taxRate=next;
  }else if(vault>ECON_ELDER_TUNE.vaultHighXia){
    const next=Math.max(lo,(T.econ.taxRate||0.15)-ECON_ELDER_TUNE.taxStep);
    if(typeof econSetTaxRate==='function')econSetTaxRate(next);else T.econ.taxRate=next;
  }
  const base=(typeof ECON_TUNE!=='undefined'&&ECON_TUNE.stipend)?ECON_TUNE.stipend:{};
  if(!T.econ.stipend)return;
  for(const p of ECON_POSTS){
    if(p.id==='zhangmen')continue;
    const def=base[p.stipendKey]!=null?base[p.stipendKey]:(T.econ.stipend[p.stipendKey]||0);
    const cur=T.econ.stipend[p.stipendKey]!=null?T.econ.stipend[p.stipendKey]:def;
    const min=Math.floor(def*ECON_RANK_TUNE.stipendLo),max=Math.ceil(def*ECON_RANK_TUNE.stipendHi);
    let n=cur;
    if(vault<ECON_ELDER_TUNE.vaultLowXia)n=Math.max(min,cur-ECON_ELDER_TUNE.stipendStep);
    else if(vault>ECON_ELDER_TUNE.vaultHighXia)n=Math.min(max,cur+ECON_ELDER_TUNE.stipendStep);
    T.econ.stipend[p.stipendKey]=n;
  }
}
function econAutoRecruitOnce(){
  if(!econRankFlag('autoRecruit'))return {ok:false,reason:'flag-off'};
  // 沒有長老：不自動招募、不彈出求武台選單（由玩家手動點建築）
  if(!econElderUnits().length)return {ok:false,reason:'no-elder'};
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return {ok:false,reason:'no-S'};
  let over=false;
  try{if(typeof popUsed==='function'&&typeof popCap==='function'&&popUsed()>=popCap())over=true;}catch(e){}
  if(over)return {ok:false,reason:'cap'};
  const altar=T.buildings.find(b=>b&&b.type==='altar'&&b.built&&!b.broken);
  if(!altar)return {ok:false,reason:'no-altar'};
  // 已有候選人：只處理長老自己感應的那批；玩家手動感應的不自動揀、不遣散
  try{
    const cs=(T.cands||[]).filter(c=>c&&c.bid===altar.id);
    if(cs.length){
      if(typeof econElderHandleCands==='function'){
        const r=econElderHandleCands(altar);
        return {ok:!!(r&&r.ok),via:'elder-pick',n:(r&&r.n)|0,miss:r&&r.miss,reason:r&&r.reason};
      }
      let n=0;
      if(typeof autoPickCands==='function')n=autoPickCands(altar.id)|0;
      return {ok:n>0,via:'elder-pick',n:n};
    }
  }catch(e){}
  // 無候選人且未在感應：靜默開始感應（不呼叫會 openRec 的 recruit）
  if(altar.queue>0)return {ok:false,reason:'busy'};
  try{
    const c=typeof recruitCost==='function'?recruitCost(altar):{food:10};
    if(typeof canAfford==='function'&&!canAfford(c))return {ok:false,reason:'cost'};
    if(typeof pay==='function')pay(c);
    altar.queue=1;altar.qt=0;altar.econElderQ=1;altar.econElderBatch=0;altar.econElderTried=0;
    try{if(typeof toast==='function')toast('長老代為感應有緣人……');}catch(e){}
    return {ok:true,via:'elder-sense'};
  }catch(e){return {ok:false,reason:String(e)};}
}
function econRankTick(dt){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return;
  const st=econRankState(true);if(!st)return;
  if(econRankFlag('elderAI')&&econElderUnits().length){
    st.elderT=(st.elderT||0)+dt;
    if(st.elderT>=ECON_ELDER_TUNE.period){
      st.elderT=0;econElderAssign();econElderAdjustFinance();
      try{if(typeof econEmit==='function')econEmit('econ:elder',{n:1});}catch(e){}
    }
  }
  if(econRankFlag('autoRecruit')&&econElderUnits().length){
    st.recruitT=(st.recruitT||0)+dt;
    if(st.recruitT>=ECON_ELDER_TUNE.recruitEvery){
      st.recruitT=0;econAutoRecruitOnce();
    }
  }else if(econRankFlag('autoRecruit')){
    st.recruitT=0; // 無長老：暫停自動招募計時，避免之後突然補跑
  }
  try{econElderTradeTick(dt);}catch(e){}
}
// ── 第④輪：長老派人前往交易（使用者原話「長老派人前往交易」；旗標 ECON_ELDER_TRADE，預設開；?eldertrade=0 關回舊行為）──
// 沿用既有外事出行（econTradePlanAuto／econTradeMergeUser／econTradeLaunch）；不新增職位、不寫任何新存檔欄位。
// 規則：無長老不派（計時歸零）；玩家手令鎖定、主角、修煉豁免、出行中、忙碌現職的弟子不派；玩家關掉「自動出行」(trades.autoOn) 時也不派。
// 外事堂買賣加成由 econTradeUnitPrice→econTradeBldMul 自動套用（第③輪規則；拆除／損壞即失效）。
var ECON_ELDER_TRADE=(function(){try{return !/[?&]eldertrade=0\b/.test(location.search);}catch(e){return true;}})();
var ECON_ELDER_TRADE_TUNE={every:120,helpers:1};
var econElderTradeT=0; // 執行期計時，不入存檔
function econElderTradeLocked(u){
  try{if(typeof econSaManualLocked==='function'&&econSaManualLocked(u))return true;}catch(e){}
  try{if(u&&u.manualUntil!=null&&isFinite(+u.manualUntil)&&((typeof S!=='undefined'&&S&&S.time)||0)<+u.manualUntil)return true;}catch(e){}
  return false;
}
function econElderTradeLive(T){
  try{const st=T&&T.econ&&T.econ.trades;return !!(st&&Array.isArray(st.missions)&&st.missions.some(m=>m&&m.kind!=='auc'&&m.state!=='done'));}catch(e){return false;}
}
function econElderTradeFree(u){
  if(!u||u.dead||u.kind!=='disciple')return false;
  if(econIsPlayerUnit(u))return false;
  if(econPostOf(u)==='zhanglao')return false; // 長老坐鎮派人，不親自出行
  try{if(econIsAutoWorkExempt(u))return false;}catch(e){}
  if(econElderTradeLocked(u))return false;
  if(u.econTradeMid)return false;
  const j=u.job;
  if(j&&['idle','none','rest','gather','train'].indexOf(j)<0)return false;
  const tk=u.task&&u.task.type;
  if(tk&&tk!=='gather'&&tk!=='move')return false;
  if(tk==='move'&&!j)return false; // 手動移動中
  return true;
}
function econElderTradePick(){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return [];
  const c=T.units.filter(econElderTradeFree);
  const w=u=>{const p=econPostOf(u);return (p==='waishi'?0:(p?2:4))+((!u.job||u.job==='idle'||u.job==='none')?0:1);};
  c.sort((a,b)=>w(a)-w(b)||((a.id||0)-(b.id||0)));
  return c;
}
function econElderTradeOnce(){
  if(!ECON_ELDER_TRADE)return {ok:false,reason:'flag-off'};
  try{if(typeof econTradeIsClient==='function'&&econTradeIsClient())return {ok:false,reason:'client'};}catch(e){}
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return {ok:false,reason:'no-state'};
  if(!econElderUnits().length)return {ok:false,reason:'no-elder'};
  if(typeof econTradeEnsure!=='function'||typeof econTradePlanAuto!=='function'||typeof econTradeLaunch!=='function')return {ok:false,reason:'no-trade'};
  const st=econTradeEnsure(T);if(!st)return {ok:false,reason:'no-state'};
  if(!st.autoOn)return {ok:false,reason:'off'};
  if(econElderTradeLive(T))return {ok:false,reason:'busy'};
  const cand=econElderTradePick();
  if(!cand.length)return {ok:false,reason:'no-free'};
  let plan=econTradePlanAuto({leader:cand[0]});
  if(typeof econTradeMergeUser==='function')plan=econTradeMergeUser(plan);
  if(!plan||!plan.ok)return plan||{ok:false,reason:'no-plan'};
  const L=plan.leader||cand[0];
  if(L!==cand[0]&&!econElderTradeFree(L)&&!(L&&L.kind==='player'))return {ok:false,reason:'leader-busy'};
  if(!(plan.helperIds&&plan.helperIds.length)){
    const n=Math.max(0,ECON_ELDER_TRADE_TUNE.helpers|0);
    plan.helperIds=cand.filter(u=>u!==L).slice(0,n).map(u=>u.id);
  }else{
    plan.helperIds=plan.helperIds.filter(id=>{const u=typeof econTradeUnitOf==='function'?econTradeUnitOf(id,T):null;return u&&!econElderTradeLocked(u);});
  }
  plan.viaElder=true;
  const r=econTradeLaunch(plan);
  if(r&&r.ok){
    st.autoT=0; // 與外事堂自動出行錯開，避免連發
    try{if(typeof toast==='function')toast('長老派'+(L.name||'弟子')+'前往'+((r.mission&&r.mission.destName)||'坊市')+'交易');}catch(e){}
    try{if(typeof econEmit==='function')econEmit('econ:elder-trade',{id:r.mission&&r.mission.id,leaderId:L.id});}catch(e){}
  }
  return r;
}
function econElderTradeTick(dt){
  if(!ECON_ELDER_TRADE)return;
  if(!econElderUnits().length){econElderTradeT=0;return;} // 無長老：暫停
  econElderTradeT+=(+dt||0);
  if(econElderTradeT<ECON_ELDER_TRADE_TUNE.every)return;
  econElderTradeT=0;
  try{econElderTradeOnce();}catch(e){}
}
function econRankAiInstall(){
  try{
    if(typeof econTick==='function'&&!econTick._econRank){
      const _t=econTick;
      econTick=function(dt){const r=_t.apply(this,arguments);try{econRankTick(dt);}catch(e){}return r;};
      econTick._econRank=1;
    }
    if(typeof update==='function'&&!update._econRank){
      const _u=update;
      update=function(dt){const r=_u.apply(this,arguments);try{if(typeof econTick!=='function')econRankTick(dt);}catch(e){}return r;};
      update._econRank=1;
    }
    if(typeof window!=='undefined'&&window.XW_ECON){
      const A=window.XW_ECON;
      A.rankTick=econRankTick;A.elderAssign=econElderAssign;
      A.elderAdjustFinance=econElderAdjustFinance;A.autoRecruitOnce=econAutoRecruitOnce;
      A.ELDER_TUNE=ECON_ELDER_TUNE;A.zayiChore=econZayiChore;A.zayiIsCombatEv=econZayiIsCombatEv;
      A.ECON_ELDER_TRADE=ECON_ELDER_TRADE;A.elderTradeOnce=econElderTradeOnce;A.elderTradeTick=econElderTradeTick;A.ELDER_TRADE_TUNE=ECON_ELDER_TRADE_TUNE;
      if(typeof econTick==='function')A.tick=econTick;
    }
  }catch(e){}
}
econRankAiInstall();
try{if(typeof setTimeout==='function')setTimeout(econRankAiInstall,0);}catch(e){}
