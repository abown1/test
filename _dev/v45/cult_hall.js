// ================== cult_hall.js：宗主講道時，閒置／練武弟子進殿坐蒲團聽道 ==================
(function(){
const FEE_REALM=4; // 煉氣
// 待確認：各境界聽道費用（對齊 REALMS 下標；0–3 武徒～宗師免費）。煉氣 8 約一次易階任務貢獻量級，其後每境約 ×1.4～1.5。
const FEE_DEFAULT=[0,0,0,0,8,14,24,36,54,80,110,150];
const CULT_HALL_CFG={
  saveVer:1,
  feeRealm:FEE_REALM,
  fee:{
    currency:'contrib', // contrib＝貢獻度（預設）／lingshi＝弟子自身靈石
    perRealm:FEE_DEFAULT.slice()
  },
  dutyJobs:['guard','gather','follow','builder','alchemy','forge','study','seclude','rest','dual'],
  hurtHp:0.35,
  keep:['hallListen','hallPrev','hallPaid','contrib','contribution','gongxian','gongxianVal','lingshi']
};
window.CULT_HALL_CFG=CULT_HALL_CFG;

function getS(){try{return (typeof S!=='undefined'&&S)||(window.XW&&XW.S)||null;}catch(e){return null;}}
const HALL_SAFE={off:0,logged:0,summonGame:-1e9,summonWall:-1e9};
const HALL_CAP={unit:256,build:256,slot:40,realm:16,invite:16,field:24,dom:8};
const SUMMON_GAME_GAP=1.5;
const SUMMON_WALL_GAP=1500;
function hallDisable(e,where){
  HALL_SAFE.off=1;
  if(!HALL_SAFE.logged){
    HALL_SAFE.logged=1;
    try{console.warn('CultHall disabled @'+where,e);}catch(x){}
  }
}
function hallSafe(where,fn){
  if(HALL_SAFE.off)return;
  try{return fn();}catch(e){hallDisable(e,where);}
}
function limN(n,cap){n=n|0;if(!(n>0))return 0;return n>cap?cap:n;}
function hostAuth(){
  try{if(typeof v49Client==='function'&&v49Client())return false;}catch(e){}
  try{const n=(typeof XW!=='undefined'&&XW&&XW.net)||(window.XW&&XW.net)||null;if(n&&n.role==='client')return false;}catch(e){}
  return true;
}
function isPlayerChar(u){
  if(!u)return false;
  try{if(window.Cult&&typeof Cult.isPlayerChar==='function')return !!Cult.isPlayerChar(u);}catch(e){}
  return u.kind==='player'||!!u.np;
}
function isDisciple(u){return !!(u&&u.kind==='disciple'&&!isPlayerChar(u)&&!u.np);}
function nmOf(u){try{if(typeof nm==='function')return nm(u);}catch(e){}return (u&&u.name)||'弟子';}
function realmNameOf(r){try{if(typeof REALMS!=='undefined'&&REALMS[r]&&REALMS[r].n)return REALMS[r].n;}catch(e){}return '境界'+r;}
function cloneArr(a){const o=[];const n=limN(a?a.length:0,HALL_CAP.realm);for(let i=0;i<n;i++)o[i]=Math.max(0,Math.floor(+a[i]||0));return o;}
function ensureFeeArr(src){
  const out=FEE_DEFAULT.slice();
  if(src&&src.length){for(let i=0;i<src.length&&i<out.length;i++)out[i]=Math.max(0,Math.floor(+src[i]||0));}
  for(let i=0;i<FEE_REALM&&i<out.length;i++)out[i]=0;
  return out;
}
function persistBox(){
  const s=getS();if(!s)return null;
  s.cultHall=s.cultHall||{};
  if(!s.cultHall.fee)s.cultHall.fee={currency:CULT_HALL_CFG.fee.currency,perRealm:ensureFeeArr(CULT_HALL_CFG.fee.perRealm)};
  if(!s.cultHall.fee.perRealm)s.cultHall.fee.perRealm=ensureFeeArr(CULT_HALL_CFG.fee.perRealm);
  if(s.cultHall.fee.currency!=='lingshi'&&s.cultHall.fee.currency!=='contrib')s.cultHall.fee.currency='contrib';
  return s.cultHall;
}
function readHookCurrency(){
  const keys=['tingdao','lecture','hall','daoting'];
  function pick(v){
    if(!v)return null;
    if(v==='contrib'||v==='lingshi')return v;
    if(typeof v==='object'){
      const c=v.currency||v.cur||v.pay||null;
      if(c==='contrib'||c==='lingshi')return c;
    }
    return null;
  }
  const roots=[];
  try{if(window.XW&&XW.econ)roots.push(XW.econ);}catch(e){}
  try{if(typeof econ!=='undefined'&&econ)roots.push(econ);}catch(e2){}
  try{if(window.ECON)roots.push(window.ECON);}catch(e3){}
  for(const obj of roots){
    if(!obj)continue;
    for(const fn of ['feeCurrency','listenFeeCurrency','tingdaoFeeCurrency','feeCfg','listenFee']){
      if(typeof obj[fn]!=='function')continue;
      for(const k of keys){
        try{const c=pick(obj[fn](k));if(c)return c;}catch(e){}
      }
      try{const c=pick(obj[fn]());if(c)return c;}catch(e4){}
    }
    try{const c=pick(obj.feeCurrency||obj.tingdaoFee||obj.listenFee);if(c)return c;}catch(e5){}
  }
  return null;
}
function econApi(){
  try{if(typeof XW_ECON!=='undefined'&&XW_ECON&&typeof XW_ECON.feeCharge==='function')return XW_ECON;}catch(e){}
  try{if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.feeCharge==='function')return window.XW_ECON;}catch(e2){}
  try{if(window.XW&&XW.econ&&typeof XW.econ.feeCharge==='function')return XW.econ;}catch(e3){}
  return null;
}
function econFeeInfo(){
  const api=econApi();
  if(!api||typeof api.feeGet!=='function')return null;
  try{return api.feeGet('tingdao')||null;}catch(e){return null;}
}
function getFeeCfg(){
  persistBox();
  const s=getS();
  const saved=(s&&s.cultHall&&s.cultHall.fee)||{};
  const ef=econFeeInfo();
  if(ef){
    const currency=(ef.cur==='lingshi'||ef.cur==='contrib')?ef.cur:'contrib';
    let perRealm;
    if(Array.isArray(ef.perRealm)&&ef.perRealm.length)perRealm=ensureFeeArr(ef.perRealm);
    else{
      perRealm=ensureFeeArr(CULT_HALL_CFG.fee.perRealm);
      const flat=Math.max(0,Math.floor(+ef.amt||0));
      for(let i=0;i<perRealm.length;i++)perRealm[i]=i<FEE_REALM?0:flat;
    }
    return {currency:currency,perRealm:perRealm,amt:+ef.amt||0,source:'econ',label:ef.label||'宗主講道・聽道費'};
  }
  const currencyHook=readHookCurrency();
  const currency=currencyHook||((saved.currency==='lingshi'||saved.currency==='contrib')?saved.currency:CULT_HALL_CFG.fee.currency)||'contrib';
  return {currency:currency,perRealm:ensureFeeArr(saved.perRealm||CULT_HALL_CFG.fee.perRealm),source:'fallback'};
}
function setFeeCfg(o){
  const box=persistBox()||{fee:{}};
  const cur=Object.assign({},getFeeCfg());
  if(o&&(o.currency==='contrib'||o.currency==='lingshi'))cur.currency=o.currency;
  if(o&&o.perRealm)cur.perRealm=ensureFeeArr(o.perRealm);
  box.fee={currency:cur.currency,perRealm:cur.perRealm.slice()};
  const s=getS();if(s)s.cultHall=box;
  try{
    const api=econApi();
    if(api&&typeof api.feeSet==='function'){
      const patch={};
      if(o&&(o.currency==='contrib'||o.currency==='lingshi'))patch.cur=o.currency;
      if(o&&o.amt!=null&&isFinite(+o.amt))patch.amt=+o.amt;
      if(o&&o.perRealm)patch.perRealm=ensureFeeArr(o.perRealm);
      api.feeSet('tingdao',patch);
    }
  }catch(e){}
  return getFeeCfg();
}
function currencyName(c){return c==='lingshi'?'靈石':'貢獻度';}
function feeOfRealm(realm){
  const cfg=getFeeCfg();
  const r=realm|0;
  if(r<FEE_REALM)return 0;
  return Math.max(0,Math.floor(+(cfg.perRealm[r])||0));
}
function feeOf(u){return feeOfRealm(u&&u.realm);}
function feeTableText(cfg){
  cfg=cfg||getFeeCfg();
  const parts=[];
  const n=limN((typeof REALMS!=='undefined'&&REALMS)?REALMS.length:cfg.perRealm.length,HALL_CAP.realm);
  for(let r=FEE_REALM;r<n;r++)parts.push(realmNameOf(r)+' '+(cfg.perRealm[r]||0));
  return parts.join('、');
}
function feeHint(){
  const cfg=getFeeCfg();
  const cur=currencyName(cfg.currency);
  if(cfg.source==='econ'){
    const lab=cfg.label||'宗主講道・聽道費';
    if(cfg.perRealm&&cfg.perRealm.some((v,i)=>i>=FEE_REALM&&v>0))
      return lab+'：煉氣以上需支付弟子自身'+cur+'（待確認，財務設定）：'+feeTableText(cfg)+'。付不起者不進殿。';
    const amt=+(cfg.amt||0);
    if(!(amt>0))return lab+'：煉氣以上弟子聽道（財務設定：目前 '+cur+' 0，免費）。';
    return lab+'：煉氣以上需支付弟子自身'+cur+' '+amt+'（財務設定）。付不起者不進殿。';
  }
  return '煉氣以上聽道需支付弟子自身'+cur+'（待確認）：'+feeTableText(cfg)+'。付不起者不進殿。';
}
function chargeListen(u){
  if((u.realm|0)<FEE_REALM)return {ok:true,paid:0,skipped:'below-lianqi',currency:getFeeCfg().currency};
  const api=econApi();
  if(api&&typeof api.feeCharge==='function'){
    try{
      const r=api.feeCharge(u,'tingdao');
      if(r&&r.skipped==='pc')return {ok:true,paid:0,skipped:'pc',currency:r.cur};
      if(r&&!r.ok&&r.reason==='insufficient')return {ok:false,reason:'broke',need:r.amt,currency:r.cur,have:(r.cur==='lingshi'?lingshiOf(u):contribOf(u))};
      if(r&&r.ok)return {ok:true,paid:+r.amt||0,currency:r.cur||'contrib',via:'XW_ECON.feeCharge'};
      if(r&&!r.ok)return {ok:false,reason:'broke',need:r.amt,currency:r.cur};
    }catch(e){}
  }
  const amt=feeOf(u);
  const cfg=getFeeCfg();
  if(!(amt>0))return {ok:true,paid:0,currency:cfg.currency,via:'fallback'};
  if(!canPay(u,amt,cfg.currency))return {ok:false,reason:'broke',need:amt,currency:cfg.currency,have:cfg.currency==='lingshi'?lingshiOf(u):contribOf(u)};
  const r=charge(u,amt,cfg.currency);
  if(!r.ok)return {ok:false,reason:'broke',need:amt,currency:cfg.currency,have:cfg.currency==='lingshi'?lingshiOf(u):contribOf(u)};
  return {ok:true,paid:amt,currency:cfg.currency,via:'fallback'};
}

function contribOf(u){
  if(!u)return 0;
  try{if(typeof econGfContrib==='function')return +econGfContrib(u)||0;}catch(e){}
  return +(u.contrib||u.contribution||u.gongxian||u.gongxianVal||0);
}
function ensureContrib(u){
  if(!u||!isDisciple(u))return;
  if(u.contrib==null)u.contrib=contribOf(u)||0;
}
function payContrib(u,amt){
  amt=Math.floor(+amt||0);if(!(amt>0))return {ok:true,paid:0,via:'contrib'};
  const have=contribOf(u);
  if(have<amt)return {ok:false,reason:'insufficient',have:have,need:amt,via:'contrib'};
  const left=have-amt;
  u.contrib=left;
  if(u.contribution!=null)u.contribution=left;
  if(u.gongxian!=null)u.gongxian=left;
  if(u.gongxianVal!=null)u.gongxianVal=left;
  return {ok:true,paid:amt,remain:left,via:'u.contrib'};
}
function lingshiOf(u){
  if(!u)return 0;
  try{
    if(typeof econWallet==='function'&&typeof econBagXia==='function'){
      const w=econWallet(u.id,false);
      if(w)return +econBagXia(w)||0;
    }
  }catch(e){}
  return +(u.lingshi||0);
}
function payLingshi(u,amt){
  amt=Math.floor(+amt||0);if(!(amt>0))return {ok:true,paid:0,via:'lingshi'};
  const s=getS();
  const res0=s&&s.res?+(s.res.lingshi||0):null;
  const u0=+(u.lingshi||0);
  const w0=lingshiOf(u);
  if(w0<amt&&u0<amt)return {ok:false,reason:'insufficient',have:Math.max(w0,u0),need:amt,via:'lingshi'};
  if(typeof econPay==='function'){
    try{
      const r=econPay(u,amt,'講道聽道');
      if(s&&s.res&&res0!=null&&s.res.lingshi<res0-0.5){
        const grew=lingshiOf(u)<w0-0.5||+(u.lingshi||0)<u0-0.5;
        if(!grew){s.res.lingshi=res0;return {ok:false,reason:'blocked-sect',via:'S.res.lingshi'};}
      }
      if(r&&r.ok)return {ok:true,paid:amt,via:r.via||'econPay'};
    }catch(e){}
  }
  if((u.lingshi||0)>=amt){u.lingshi-=amt;return {ok:true,paid:amt,remain:u.lingshi,via:'u.lingshi'};}
  return {ok:false,reason:'insufficient',have:lingshiOf(u),need:amt,via:'lingshi'};
}
function canPay(u,amt,currency){
  if(!(amt>0))return true;
  if(currency==='lingshi')return lingshiOf(u)>=amt||+(u.lingshi||0)>=amt;
  return contribOf(u)>=amt;
}
function charge(u,amt,currency){
  if(!(amt>0))return {ok:true,paid:0,currency:currency};
  if(currency==='lingshi')return Object.assign(payLingshi(u,amt),{currency:'lingshi'});
  return Object.assign(payContrib(u,amt),{currency:'contrib'});
}

function hallOf(){
  const s=getS();if(!s||!s.buildings)return null;
  let best=null;
  const n=limN(s.buildings.length,HALL_CAP.build);
  for(let i=0;i<n;i++){
    const b=s.buildings[i];
    if(!b||b.type!=='hall'||!b.built||b.broken)continue;
    if(!best||(b.lv||1)>(best.lv||1))best=b;
  }
  return best;
}
function throneOn(b){
  b=b||hallOf();
  if(!b)return null;
  try{if(typeof v165Holder==='function')return v165Holder(b);}catch(e){}
  if(b.v165==null)return null;
  try{const u=typeof unitById==='function'?unitById(b.v165):null;return u&&!u.dead?u:null;}catch(e2){return null;}
}
function cushionCount(b){
  b=b||hallOf();if(!b)return 0;
  try{
    if(typeof roomSt==='function'){
      const max=Math.min(HALL_CAP.slot,(typeof TUNE!=='undefined'&&TUNE.v169&&TUNE.v169.maxSlot)||40);
      let n=0;for(let k=0;k<max;k++){if(!roomSt(b,k))break;n++;}return n;
    }
  }catch(e){}
  try{if(typeof jobSlots==='function')return jobSlots(b);}catch(e2){}
  return 4;
}
function isForced(u){
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(e){}
  if(u.xcmd&&typeof S!=='undefined'&&S&&S.time<u.xcmd.until)return true;
  if(u.task&&u.task.man)return true;
  return false;
}
function inCombat(u){
  if(!u)return false;
  if(u.retreat)return true;
  if(u.task&&(u.task.type==='attack'||u.task.type==='retreat'))return true;
  return false;
}
function inRaidDef(u){
  if(!u)return false;
  if(u.v164||u.v164g)return true;
  try{if(typeof V164!=='undefined'&&V164&&Array.isArray(V164.ids)){
    const n=limN(V164.ids.length,HALL_CAP.unit);
    for(let i=0;i<n;i++)if(V164.ids[i]===u.id)return true;
  }}catch(e){}
  if(inCombat(u)){
    try{const s=getS();if(s&&s.raidsActive&&s.raidsActive.length)return true;}catch(e2){}
  }
  return false;
}
function isHurt(u){
  if(!u||u.dead)return true;
  if(u.cultWound)return true;
  if(u.dgHurt)return true;
  if(u.inj&&(u.inj.k==='heavy'||u.inj.k==='meridian'||u.inj.k==='重傷'))return true;
  if(u.maxhp>0&&u.hp<u.maxhp*CULT_HALL_CFG.hurtHp)return true;
  return false;
}
function onDuty(u){
  if(!u)return true;
  if(u.y47e||u.y47dj)return true;
  const job=u.job;
  if(!job||job==='train'||job==='lecture'||job==='idle'||job==='none')return false;
  return CULT_HALL_CFG.dutyJobs.indexOf(job)>=0||!!job;
}
function isEligible(u,b,opts){
  opts=opts||{};
  if(!isDisciple(u)||u.dead)return false;
  try{const s=getS();if(s&&s.dg&&!s.interior)return false;}catch(e){}
  if(isForced(u)||inCombat(u)||inRaidDef(u)||isHurt(u))return false;
  if(u.hallListen&&!inRaidDef(u))return true;
  if(onDuty(u))return false;
  if(u.job==='lecture')return true;
  if(!u.job||u.job==='train'||u.job==='idle'||u.job==='none')return true;
  return false;
}
function listeningCount(b){
  const s=getS();if(!s||!s.units)return 0;
  let n=0;
  const N=limN(s.units.length,HALL_CAP.unit);
  for(let i=0;i<N;i++){
    const u=s.units[i];
    if(!isDisciple(u)||u.dead)continue;
    if(u.hallListen){n++;continue;}
    if(u.job==='lecture'&&(u.jobB===b.id||(u.inside&&u.inB===b.id)))n++;
  }
  return n;
}
function savePrev(u){
  if(u.hallPrev)return;
  u.hallPrev={
    job:u.job||null,
    jobB:u.jobB!=null?u.jobB:null,
    jobRes:u.jobRes||null,
    guardAt:u.guardAt?{x:u.guardAt.x,y:u.guardAt.y}:null,
    holdAt:u.holdAt?{x:u.holdAt.x,y:u.holdAt.y}:null,
    aiJob:u.aiJob||null,
    jst:u.jst!=null?u.jst:null,
    medit:!!u.medit
  };
}
function dropListenKeepJob(u){
  if(!u)return;
  u.hallListen=0;
}
function restoreOne(u){
  if(!u)return;
  // 真正結束聽道（戰鬥／受傷／自行離職）才清 hallPaid；宗主離座不走這裡。
  if(inRaidDef(u)||inCombat(u)||isForced(u)){dropListenKeepJob(u);u.hallPaid=null;return;}
  const prev=u.hallPrev||null;
  u.hallListen=0;u.hallPrev=null;u.hallPaid=null;
  if(!prev){
    try{if(typeof assignJob==='function')assignJob(u,null);}catch(e){u.job=null;u.jobB=null;}
    return;
  }
  try{
    if(prev.job){
      const arg=prev.job==='gather'?prev.jobRes:(prev.jobB!=null?{bid:prev.jobB}:undefined);
      if(typeof assignJob==='function')assignJob(u,prev.job,arg);
      else{u.job=prev.job;u.jobB=prev.jobB;}
      if(prev.job==='gather'&&prev.jobRes)u.jobRes=prev.jobRes;
      if(prev.guardAt)u.guardAt=prev.guardAt;
      if(prev.holdAt)u.holdAt=prev.holdAt;
      if(prev.aiJob)u.aiJob=prev.aiJob;
      if(prev.jst!=null)u.jst=prev.jst;
    }else{
      if(typeof assignJob==='function')assignJob(u,null);
      else{u.job=null;u.jobB=null;if(typeof setTask==='function')setTask(u,null);}
      if(prev.holdAt)u.holdAt=prev.holdAt;
    }
  }catch(e){console.warn('CultHall.restore',e);}
}
function inviteOne(u,b){
  if(!u||!b)return {ok:false,reason:'no-unit'};
  if(inRaidDef(u)||inCombat(u)||isForced(u))return {ok:false,reason:'raid'};
  if(u.hallListen&&u.job==='lecture')return {ok:true,already:1};
  const now=(getS()&&getS().time)||0;
  if(u.hallFeeFailT!=null&&now-u.hallFeeFailT<10)return {ok:false,reason:'broke-cool'};
  let r;
  if(u.hallPaid){
    r={ok:true,paid:0,skipped:'already-paid',currency:u.hallPaid.currency||getFeeCfg().currency,via:u.hallPaid.via||null};
  }else{
    r=chargeListen(u);
    if(!r.ok){
      if(r.reason==='broke')u.hallFeeFailT=now;
      return {ok:false,reason:'broke',need:r.need,currency:r.currency,have:r.have};
    }
    if(r.paid>0)u.hallPaid={amt:r.paid,currency:r.currency,t:(getS()&&getS().time)||0,via:r.via||null};
  }
  savePrev(u);
  u.hallListen=1;
  let ok=false;
  try{if(typeof assignJob==='function')ok=!!assignJob(u,'lecture',{bid:b.id});}catch(e){}
  if(!ok){u.job='lecture';u.jobB=b.id;try{if(typeof setTask==='function')setTask(u,null);}catch(e2){}}
  return {ok:true,paid:r.paid||0,currency:r.currency,via:r.via};
}
function dismissAll(b){
  const s=getS();if(!s||!s.units)return 0;
  let n=0;
  const N=limN(s.units.length,HALL_CAP.unit);
  for(let i=0;i<N;i++){
    const u=s.units[i];
    if(!u||!u.hallListen)continue;
    restoreOne(u);n++;
  }
  return n;
}
function summon(b){
  if(!hostAuth())return {ok:false,reason:'client'};
  b=b||hallOf();
  if(!b||!throneOn(b))return {ok:false,reason:'no-throne'};
  const s=getS();if(!s||!s.units)return {ok:false,reason:'busy'};
  if(s.dg&&!s.interior)return {ok:false,reason:'busy'};
  const cap=Math.min(HALL_CAP.slot,cushionCount(b));
  let used=listeningCount(b);
  const cand=[];
  const N=limN(s.units.length,HALL_CAP.unit);
  for(let i=0;i<N;i++){
    const u=s.units[i];
    if(!isEligible(u,b))continue;
    if(u.hallListen||(u.job==='lecture'&&(u.jobB===b.id||(u.inside&&u.inB===b.id))))continue;
    if(cand.length>=HALL_CAP.unit)break;
    cand.push(u);
  }
  let door={x:b.i,y:b.j};
  try{if(typeof doorPt==='function')door=doorPt(b);}catch(e){}
  cand.sort((a,c)=>{
    const pa=a.job==='train'?0:1,pc=c.job==='train'?0:1;
    if(pa!==pc)return pa-pc;
    const da=Math.hypot((a.x||0)-door.x,(a.y||0)-door.y);
    const dc=Math.hypot((c.x||0)-door.x,(c.y||0)-door.y);
    return da-dc;
  });
  const invited=[],denied=[];
  const cn=limN(cand.length,HALL_CAP.unit);
  for(let i=0;i<cn;i++){
    if(used>=cap||invited.length>=HALL_CAP.invite)break;
    const r=inviteOne(cand[i],b);
    if(r.ok){invited.push(cand[i].id);used++;}
    else if(r.reason==='broke'||r.reason==='broke-cool')denied.push(cand[i].id);
  }
  const gone=[];
  const N2=limN(s.units.length,HALL_CAP.unit);
  for(let i=0;i<N2;i++){
    const u=s.units[i];
    if(!u||!u.hallListen)continue;
    if(isForced(u)||inCombat(u)||inRaidDef(u)||isHurt(u)){restoreOne(u);gone.push(u.id);}
  }
  return {ok:true,cap:cap,used:listeningCount(b),invited:invited,denied:denied,gone:gone};
}
function tickHall(){
  if(HALL_SAFE.off)return;
  if(!hostAuth())return;
  const b=hallOf();if(!b)return;
  const s=getS();
  const now=(s&&s.time)||0;
  let wall=0;try{wall=performance.now();}catch(e){wall=now*1000;}
  if(throneOn(b)){
    if((now-HALL_SAFE.summonGame)<SUMMON_GAME_GAP && (wall-HALL_SAFE.summonWall)<SUMMON_WALL_GAP)return;
    HALL_SAFE.summonGame=now;HALL_SAFE.summonWall=wall;
    summon(b);
  }else{
    // 寶座空：只停止新召喚，已在聽道的弟子維持；戰鬥／受傷／強制者仍結束聽道。
    const units=s&&s.units||[];
    const N=limN(units.length,HALL_CAP.unit);
    for(let i=0;i<N;i++){
      const u=units[i];
      if(!u||!u.hallListen)continue;
      if(isForced(u)||inCombat(u)||inRaidDef(u)||isHurt(u))restoreOne(u);
    }
  }
}
function sanitizeHallState(){
  const s=getS();if(!s)return;
  persistBox();
  const box=s.cultHall;
  if(box&&box.fee){
    box.fee.perRealm=ensureFeeArr(box.fee.perRealm);
    if(box.fee.currency!=='lingshi'&&box.fee.currency!=='contrib')box.fee.currency='contrib';
  }
  if(!s.units)return;
  const N=limN(s.units.length,HALL_CAP.unit);
  const ids=new Set();
  for(let i=0;i<N;i++){
    const u=s.units[i];if(!u)continue;
    ids.add(u.id);
    if(!isDisciple(u)||u.dead){u.hallListen=0;u.hallPrev=null;u.hallPaid=null;continue;}
    if(u.hallPrev&&typeof u.hallPrev!=='object')u.hallPrev=null;
    if(u.hallPrev){
      if(u.hallPrev.job==='lecture')u.hallPrev.job=null;
      if(u.hallPrev.jobB!=null){
        try{if(typeof bById==='function'&&!bById(u.hallPrev.jobB))u.hallPrev.jobB=null;}catch(e){}
      }
    }
    if(u.hallListen&&(inRaidDef(u)||inCombat(u)||isForced(u)))dropListenKeepJob(u);
  }
}

function keepFields(){
  const fields=CULT_HALL_CFG.keep;
  try{if(typeof UNIT_KEEP!=='undefined'){const n=limN(fields.length,HALL_CAP.field);for(let i=0;i<n;i++)if(UNIT_KEEP.indexOf(fields[i])<0)UNIT_KEEP.push(fields[i]);}}catch(e){}
  try{if(window.XW&&Array.isArray(XW.UNIT_KEEP)){const n=limN(fields.length,HALL_CAP.field);for(let i=0;i<n;i++)if(XW.UNIT_KEEP.indexOf(fields[i])<0)XW.UNIT_KEEP.push(fields[i]);}}catch(e2){}
  try{if(typeof DISC_COPY!=='undefined'){const n=limN(fields.length,HALL_CAP.field);for(let i=0;i<n;i++)if(DISC_COPY.indexOf(fields[i])<0)DISC_COPY.push(fields[i]);}}catch(e3){}
}
function wrapFn(name,wrapper){
  try{
    const g=Function('return typeof '+name+'==="function"? '+name+' : null')();
    if(!g||g._hallW)return;
    const w=wrapper(g);w._hallW=1;
    Function('w',name+'=w')(w);
  }catch(e){}
}

function paintFee(){
  if(HALL_SAFE.off)return;
  let txt='';
  try{txt=feeHint();}catch(e){hallDisable(e,'feeHint');return;}
  try{
    const ip=document.getElementById('inpanel');
    if(ip&&ip.style.display!=='none'){
      const s=getS();const I=s&&s.interior;const b=I&&(typeof bById==='function'?bById(I.bid):null);
      if(b&&b.type==='hall'){
        let el=ip.querySelector('#cultHallFee');
        if(!el){el=document.createElement('div');el.id='cultHallFee';el.className='dim sm pdx';el.style.cssText='color:#ffe27a;margin:4px 8px';const host=ip.querySelector('.dim.sm.pdx')||ip.querySelector('.ib');if(host&&host.parentNode)host.after(el);else ip.appendChild(el);}
        el.textContent='🎐 '+txt;
      }
    }
  }catch(e){}
  try{
    const pn=document.getElementById('panel');
    if(pn){
      let show=false;
      try{
        if(typeof selBuilding!=='undefined'&&selBuilding){
          const b=typeof selBuilding==='object'?selBuilding:(typeof bById==='function'?bById(selBuilding):null);
          if(b&&b.type==='hall')show=true;
        }
      }catch(e2){}
      let el=pn.querySelector('#cultHallFeeP');
      if(!show){if(el)el.remove();}
      else{
        if(!el){el=document.createElement('div');el.id='cultHallFeeP';el.className='sm';el.style.cssText='color:#ffe27a;margin:4px 0';pn.appendChild(el);}
        el.textContent='🎐 '+txt;
      }
      if(typeof selUnits!=='undefined'&&selUnits&&selUnits.length===1){
        const u=typeof unitById==='function'?unitById(selUnits[0]):null;
        let d=pn.querySelector('#cultHallFeeD');
        if(u&&isDisciple(u)){
          const amt=feeOf(u);
          const cfg=getFeeCfg();
          const line=amt>0?('聽道費用：'+amt+' '+currencyName(cfg.currency)+(u.hallPaid?'（已付）':(canPay(u,amt,cfg.currency)?'':'（不足，無法進殿）'))):'聽道費用：煉氣以下免費';
          if(!d){d=document.createElement('div');d.id='cultHallFeeD';d.className='sm';d.style.cssText='color:#ffe27a;margin:2px 0';const host=pn.querySelector('#v165l')||pn.querySelector('#v62cr');if(host&&host.parentNode)host.after(d);else pn.appendChild(d);}
          d.textContent='🎐 '+line;
        }else if(d)d.remove();
      }
    }
  }catch(e3){}
}

function install(){
  if(window._XW_HALL_WRAP)return;
  window._XW_HALL_WRAP=1;
  keepFields();
  persistBox();
  try{
    if(typeof v165SitHost==='function'&&!v165SitHost._hallW){
      const _s=v165SitHost;
      v165SitHost=function(u,b){const r=_s.apply(this,arguments);hallSafe('sit',function(){if(r==='ok'){HALL_SAFE.summonGame=-1e9;HALL_SAFE.summonWall=-1e9;summon(b||hallOf());}});return r;};
      v165SitHost._hallW=1;
    }
  }catch(e){}
  // 宗主離座不再 dismissAll：殿內已聽道弟子維持，聽道費也不重收。
  try{
    if(typeof v50DefTick==='function'&&!v50DefTick._hallW){
      const _t=v50DefTick;
      v50DefTick=function(st){const r=_t.apply(this,arguments);hallSafe('tick',tickHall);return r;};
      v50DefTick._hallW=1;
    }else if(window.Cult&&typeof Cult.tick==='function'&&!Cult.tick._hallW){
      const _tk=Cult.tick.bind(Cult);
      Cult.tick=function(dt){const r=_tk(dt);hallSafe('tick',tickHall);return r;};
      Cult.tick._hallW=1;
    }else if(typeof tickV045==='function'&&!tickV045._hallW){
      const _tv=tickV045;
      tickV045=function(dt){const r=_tv.apply(this,arguments);hallSafe('tick',tickHall);return r;};
      tickV045._hallW=1;
    }
  }catch(e3){}
  try{
    if(typeof snapshot==='function'&&!snapshot._hallW){
      const _sn=snapshot;
      snapshot=function(){const d=_sn.apply(this,arguments);try{const s=getS();if(d&&s){persistBox();try{const cfg=getFeeCfg();s.cultHall.fee={currency:cfg.currency,perRealm:(cfg.perRealm||[]).slice()};}catch(e0){}try{d.cultHall=JSON.parse(JSON.stringify(s.cultHall||persistBox()));}catch(e){d.cultHall=s.cultHall||persistBox();}}}catch(e){}return d;};
      snapshot._hallW=1;
    }
  }catch(e4){}
  try{
    if(typeof applySave==='function'&&!applySave._hallW){
      const _as=applySave;
      applySave=function(d){const r=_as.apply(this,arguments);hallSafe('applySave',function(){const s=getS();if(s&&d&&d.cultHall){try{s.cultHall=JSON.parse(JSON.stringify(d.cultHall));}catch(e){s.cultHall=d.cultHall;}}persistBox();sanitizeHallState();try{const fee=s&&s.cultHall&&s.cultHall.fee;const api=econApi();if(fee&&api&&typeof api.feeSet==='function')api.feeSet('tingdao',{cur:fee.currency,perRealm:fee.perRealm});}catch(e0){}if(s&&s.units){const N=limN(s.units.length,HALL_CAP.unit);for(let i=0;i<N;i++)ensureContrib(s.units[i]);}});return r;};
      applySave._hallW=1;
    }
  }catch(e5){}
  try{
    if(typeof makeDisciple==='function'&&!makeDisciple._hallW){
      const _md=makeDisciple;
      makeDisciple=function(){const u=_md.apply(this,arguments);try{ensureContrib(u);}catch(e){}return u;};
      makeDisciple._hallW=1;
    }
  }catch(e6){}
  try{
    if(typeof renderInPanel==='function'&&!renderInPanel._hallW){
      const _rp=renderInPanel;
      renderInPanel=function(){const r=_rp.apply(this,arguments);hallSafe('paint',paintFee);return r;};
      renderInPanel._hallW=1;
    }
  }catch(e7){}
  try{
    if(typeof renderPanel==='function'&&!renderPanel._hallW){
      const _p=renderPanel;
      renderPanel=function(){const r=_p.apply(this,arguments);hallSafe('paint',paintFee);return r;};
      renderPanel._hallW=1;
    }
  }catch(e8){}
  try{
    if(typeof v165Txt==='function'&&!v165Txt._hallW){
      const _vt=v165Txt;
      v165Txt=function(u){let t=_vt.apply(this,arguments)||'';hallSafe('v165Txt',function(){if(u&&isDisciple(u)){const amt=feeOf(u);const cfg=getFeeCfg();const extra=amt>0?('聽道費用 '+amt+' '+currencyName(cfg.currency)):('聽道免費（煉氣以下）');t=t?(t+'　'+extra):('🎐 '+extra);}});return t;};
      v165Txt._hallW=1;
    }
  }catch(e9){}
  try{
    if(typeof SYS_TXT!=='undefined'&&SYS_TXT&&SYS_TXT.push){
      const ent=SYS_TXT.find(x=>x&&x[0]==='寶座講道');
      if(ent&&!ent._hall){
        const old=ent[2];
        ent[2]=function(){try{if(HALL_SAFE.off)return old?old():'';return (old?old():'')+'<span class="tg">'+feeHint()+'</span>';}catch(e){hallDisable(e,'SYS_TXT');return old?old():'';}};
        ent._hall=1;
      }else if(!ent){
        SYS_TXT.push(['寶座講道・聽道費用','煉氣以上弟子進殿聽道需付費',()=>'<span class="tg">'+feeHint()+'</span>']);
      }
    }
  }catch(e10){}
  try{
    if(typeof bdescHtml==='function'&&!bdescHtml._hallW){
      const _bd=bdescHtml;
      bdescHtml=function(b){let h=_bd.apply(this,arguments);hallSafe('bdesc',function(){if(b&&b.type==='hall')h+='<div class="sm" style="color:#ffe27a">🎐 '+feeHint()+'</div>';});return h;};
      bdescHtml._hallW=1;
    }
  }catch(e11){}
}

const CultHall={
  CFG:CULT_HALL_CFG,
  getFeeCfg:getFeeCfg,
  setFeeCfg:setFeeCfg,
  feeOf:feeOf,
  feeHint:feeHint,
  currencyName:currencyName,
  contribOf:contribOf,
  lingshiOf:lingshiOf,
  canPay:canPay,
  charge:charge,chargeListen:chargeListen,econApi:econApi,econFeeInfo:econFeeInfo,
  sanitize:sanitizeHallState,disabled:function(){return !!HALL_SAFE.off;},inRaidDef:inRaidDef,
  cushionCount:cushionCount,
  listeningCount:listeningCount,
  isEligible:isEligible,
  summon:summon,
  dismiss:dismissAll,
  tick:tickHall,
  paint:paintFee,
  why:function(u){if(!u)return {no:1};return {elig:isEligible(u,hallOf()),disc:isDisciple(u),pc:isPlayerChar(u),forced:isForced(u),combat:inCombat(u),hurt:isHurt(u),duty:onDuty(u),job:u.job,task:u.task&&u.task.type,hp:u.hp,maxhp:u.maxhp,inside:!!u.inside,wound:!!u.cultWound,inj:u.inj||null,y47e:!!u.y47e,xcmd:u.xcmd||null,retreat:!!u.retreat,kind:u.kind,np:!!u.np};},
  persist:persistBox,
  throneClickPos:function(){
    try{
      if(typeof iso!=='function'||typeof IT==='undefined'||!IT)return null;
      const q=iso(3.5,0.95);
      return {x:q.x*IT.s+IT.ox,y:(q.y-18)*IT.s+IT.oy,s:IT.s,ox:IT.ox,oy:IT.oy};
    }catch(e){return null;}
  },
  doorOf:function(b){b=b||hallOf();try{if(b&&typeof doorPt==='function')return doorPt(b);}catch(e){}return b?{x:b.i+1.5,y:b.j+3.45}:null;},
  snapshot:function(){try{if(typeof snapshot==='function')return snapshot();}catch(e){}return null;},
  applySave:function(d){try{if(typeof applySave==='function')return applySave(d);}catch(e){}return false;},
  enter:function(b){b=b||hallOf();try{if(typeof enterInterior==='function')enterInterior(b);}catch(e){}},
  sit:function(){try{if(typeof v165Sit==='function')return v165Sit();if(typeof v165SitHost==='function'){const s=getS(),p=typeof player==='function'?player():null;return v165SitHost(p,hallOf());}}catch(e){}return false;},
  stand:function(){try{if(typeof v165StandHost==='function'){const p=typeof player==='function'?player():null;return v165StandHost(p);}}catch(e){}},
  tickGame:function(n,dt){n=n||20;dt=dt||0.2;for(let i=0;i<n;i++){try{if(window.XW&&XW._&&typeof XW._.upd==='function')XW._.upd(dt);else if(typeof update==='function')update(dt);}catch(e){}}},
  spawnDisciple:function(opt){
    opt=opt||{};
    const s=getS();if(!s)return null;
    const door=this.doorOf(hallOf())||{x:opt.x||0,y:opt.y||0};
    const x=door.x+(opt.ox||0),y=door.y+(opt.oy||0);
    let d=null;
    try{if(typeof makeDisciple==='function')d=makeDisciple(x,y,0);}catch(e){}
    if(!d)d={id:Date.now()%1e9,kind:'disciple',name:'弟子',body:0,hp:80,maxhp:80,atk:6,speed:3,realm:0,xiu:0,x:x,y:y,job:null,dead:false};
    if(opt.name)d.name=opt.name;
    if(opt.realm!=null)d.realm=opt.realm;
    d.hp=opt.hp!=null?opt.hp:d.maxhp;
    d.contrib=opt.contrib==null?0:opt.contrib;
    d.lingshi=opt.lingshi==null?0:opt.lingshi;
    d.job=opt.job===undefined?null:opt.job;
    if(opt.wound)d.cultWound={t:(s.time||0)+99,why:'test'};
    if(d.job==='guard')d.guardAt={x:d.x,y:d.y};
    s.units.push(d);
    ensureContrib(d);
    return d;
  },
  ensureHall:function(){
    const s=getS();if(!s)return null;
    let b=hallOf();
    if(b)return b;
    const p=typeof player==='function'?player():(s.units||[]).find(u=>u.kind==='player');
    const i=Math.max(2,Math.floor((p&&p.x||40)+2)),j=Math.max(2,Math.floor((p&&p.y||40)+2));
    b={id:(s._hid=(s._hid||9000)+1),type:'hall',i:i,j:j,progress:99,built:true,queue:0,qt:0,hp:800,maxhp:800,broken:false,lv:1};
    s.buildings.push(b);
    try{if(typeof rebuildBlock==='function')rebuildBlock();}catch(e){}
    return b;
  },
  ensureWudao:function(){
    const s=getS();if(!s)return null;
    let b=(s.buildings||[]).find(x=>x.type==='wudao'&&x.built);
    if(b)return b;
    const h=this.ensureHall();
    b={id:(s._hid=(s._hid||9000)+1),type:'wudao',i:h.i+5,j:h.j,progress:99,built:true,queue:0,qt:0,hp:500,maxhp:500,broken:false,lv:1};
    s.buildings.push(b);
    try{if(typeof rebuildBlock==='function')rebuildBlock();}catch(e){}
    return b;
  }
};
window.CultHall=CultHall;
try{if(window.Cult)Cult.hall=CultHall;}catch(e){}
try{install();hallSafe('boot',sanitizeHallState);}catch(e){hallDisable(e,'install');console.warn('CultHall.install',e);}
})();
