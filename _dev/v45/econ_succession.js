// ================== 仙武經濟：高職自動交接（econ_succession.js，2026-11-11）==================
// 定案（創意家 11-10，隊長轉達）：長老／執法／外事等高職，任職者壽終或壽元剩餘 <10% 時自動交接。
//  接任人：境界高者優先 → 貢獻高者 → 忠誠高者（再同分取 id 小者）。舊任降為內門。宗主（掌門／玩家角色）永不交接。
// 觸發：
//  ① 修煉模組 hook：window.cultHooks.onLifeEnd(u)／onLifeLow(u,frac)（cult_life.js；只從 econ 側 push，不改 cult）。
//     注意：cult_life.js CULT_LIFE_CFG.hooksOn 目前為 false（修煉側總開關），此時 hook 不會被呼叫。
//  ② 經濟側保險輪詢：每 1 秒用 XW_LIFE.remaining()/lifeMax 檢查在職高職，<10% 即交接（hooksOn 關也有效）。
//  交接後舊任已不是高職，重跑／讀檔不會再次交接（職位存在 u.office／u.econOffice，本來就隨存檔）。
// 旗標：ECON_SUCCESSION_DEFAULT=true（不放進 ECON_FLAGS_DEFAULT）。優先序：window.ECON_SUCCESSION_FORCE → ?succession=1/0 → S.econ.flags.succession（非 null）→ 預設開。
// 狀態：交接紀錄 S.econ.succLog（最多 20 筆，S.econ 隨存檔整包保存）；其餘不存檔。聯機：只在房主／單機執行。
var ECON_SUCCESSION_DEFAULT=true;
var ECON_SUCC_TUNE={lowFrac:0.10,pollSec:1,posts:['zhanglao','zhifa','waishi'],demoteTo:'neimen',logMax:20};
function econSuccessionOn(T){
  try{if(typeof window!=='undefined'&&window.ECON_SUCCESSION_FORCE!=null)return !!window.ECON_SUCCESSION_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'&&location&&location.search){const m=/[?&]succession=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{
    const F=(T&&T.econ&&T.econ.flags)||(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags);
    if(F&&F.succession!=null)return !!F.succession;
  }catch(e){}
  return !!ECON_SUCCESSION_DEFAULT;
}
function econSuccClient(){
  try{if(typeof netAuthSilentNoop==='function'&&netAuthSilentNoop())return true;}catch(e){}
  try{if(typeof NET!=='undefined'&&NET&&NET.role==='client')return true;}catch(e){}
  try{const n=(typeof window!=='undefined'&&window.XW&&window.XW.net)||null;if(n&&n.role==='client')return true;}catch(e){}
  return false;
}
function econSuccLife(){try{return (typeof window!=='undefined'&&(window.XW_LIFE||window.CultLife))||null;}catch(e){return null;}}
function econSuccLifeFrac(u){
  const L=econSuccLife();
  try{
    if(!L||typeof L.remaining!=='function')return Infinity;
    const rem=L.remaining(u);
    if(u.lifeMax==null||!isFinite(+u.lifeMax)||!(+u.lifeMax>0)||!isFinite(rem))return Infinity;
    return rem/(+u.lifeMax);
  }catch(e){return Infinity;}
}
function econSuccIsLeader(u){
  if(!u)return true;
  try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return true;}catch(e){}
  if(u.kind==='player'||u.np)return true;
  try{if(typeof econPostOf==='function'&&econPostOf(u)==='zhangmen')return true;}catch(e){}
  return false;
}
function econSuccPostOf(u){try{return typeof econPostOf==='function'?econPostOf(u):(u&&(u.office||u.econOffice))||null;}catch(e){return null;}}
function econSuccIsHigh(post){return ECON_SUCC_TUNE.posts.indexOf(post)>=0;}
function econSuccContrib(u){try{if(typeof econContribGet==='function')return +econContribGet(u)||0;}catch(e){}return +(u&&u.contrib)||0;}
function econSuccCandidates(old){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return [];
  return T.units.filter(u=>u&&u!==old&&!u.dead&&u.kind==='disciple'&&!econSuccIsLeader(u)&&!econSuccIsHigh(econSuccPostOf(u))
    &&econSuccLifeFrac(u)>=ECON_SUCC_TUNE.lowFrac);
}
function econSuccPick(old){
  const c=econSuccCandidates(old);
  c.sort((a,b)=>((b.realm|0)-(a.realm|0))||(econSuccContrib(b)-econSuccContrib(a))||((+b.loyal||0)-(+a.loyal||0))||((a.id|0)-(b.id|0)));
  return c[0]||null;
}
function econSuccLog(o){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return;
  if(!Array.isArray(T.econ.succLog))T.econ.succLog=[];
  o.t=T.time!=null?Math.round(T.time*10)/10:0;T.econ.succLog.push(o);
  while(T.econ.succLog.length>ECON_SUCC_TUNE.logMax)T.econ.succLog.shift();
  try{if(typeof econEmit==='function')econEmit('econ:succession',o);}catch(e){}
  try{if(typeof y47EvLog==='function')y47EvLog(o.text);}catch(e){}
}
function econNm(u){try{if(typeof pnm==='function')return pnm(u);}catch(e){}return (u&&u.name)||('弟子'+(u&&u.id));}
// why: 'end'（壽終）｜'low'（壽元 <10%）
function econSuccessionHandOver(u,why){
  if(!econSuccessionOn())return {ok:false,reason:'flag-off'};
  if(econSuccClient())return {ok:false,reason:'client'};
  if(!u)return {ok:false,reason:'no-unit'};
  if(econSuccIsLeader(u))return {ok:false,reason:'leader'};
  const post=econSuccPostOf(u);
  if(!econSuccIsHigh(post))return {ok:false,reason:'not-high',post:post};
  if(typeof econAppoint!=='function')return {ok:false,reason:'no-appoint'};
  const succ=econSuccPick(u);
  if(!succ&&why!=='end')return {ok:false,reason:'no-successor',post:post}; // 壽元將盡但無人可接：暫留原任，下次輪詢再試
  const pn=((typeof econPostById==='function'&&econPostById(post))||{}).name||post;
  const r0=econAppoint(u,ECON_SUCC_TUNE.demoteTo);
  if(!r0||!r0.ok)return {ok:false,reason:'demote-fail:'+(r0&&r0.reason)};
  let r1=null;
  if(succ){r1=econAppoint(succ,post);
    if(!r1||!r1.ok){try{econAppoint(u,post);}catch(e){}return {ok:false,reason:'appoint-fail:'+(r1&&r1.reason)};}}
  const o={why:why,post:post,from:u.id,to:succ?succ.id:null,
    text:succ?`${pn}「${econNm(u)}」${why==='end'?'壽終':'壽元將盡'}，由「${econNm(succ)}」接任；原任降為內門`:`${pn}「${econNm(u)}」壽終，暫無合適接任者，職位懸缺`};
  econSuccLog(o);
  return {ok:true,post:post,from:u.id,to:succ?succ.id:null,succ:succ};
}
function econSuccOnLifeEnd(u){try{return econSuccessionHandOver(u,'end');}catch(e){try{console.warn('econSucc end',e);}catch(e2){}}}
function econSuccOnLifeLow(u,frac){try{if(frac!=null&&!(+frac<ECON_SUCC_TUNE.lowFrac))return;return econSuccessionHandOver(u,'low');}catch(e){try{console.warn('econSucc low',e);}catch(e2){}}}
function econSuccessionPoll(){
  if(!econSuccessionOn()||econSuccClient())return 0;
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.units)return 0;
  let n=0;
  for(const u of T.units.slice()){
    if(!u||u.dead||econSuccIsLeader(u)||!econSuccIsHigh(econSuccPostOf(u)))continue;
    if(econSuccLifeFrac(u)<ECON_SUCC_TUNE.lowFrac){const r=econSuccessionHandOver(u,'low');if(r&&r.ok)n++;}
  }
  return n;
}
var ECON_SUCC_RT={acc:0,hooked:0,wrapped:0};
function econSuccTick(dt){
  ECON_SUCC_RT.acc+=(+dt||0);if(ECON_SUCC_RT.acc<ECON_SUCC_TUNE.pollSec)return;ECON_SUCC_RT.acc=0;
  try{econSuccessionPoll();}catch(e){}
}
function econSuccessionInstall(){
  try{
    if(typeof window!=='undefined'){
      window.cultHooks=window.cultHooks||{};
      const H=window.cultHooks;
      H.onLifeEnd=H.onLifeEnd||[];H.onLifeLow=H.onLifeLow||[];
      if(H.onLifeEnd.indexOf(econSuccOnLifeEnd)<0)H.onLifeEnd.push(econSuccOnLifeEnd);
      if(H.onLifeLow.indexOf(econSuccOnLifeLow)<0)H.onLifeLow.push(econSuccOnLifeLow);
      ECON_SUCC_RT.hooked=1;
    }
  }catch(e){}
  try{
    if(typeof update==='function'&&!ECON_SUCC_RT.wrapped){
      const _u=update;
      update=function(dt){const r=_u.apply(this,arguments);try{econSuccTick(dt);}catch(e){}return r;};
      update._econSucc=1;ECON_SUCC_RT.wrapped=1;
    }
  }catch(e){}
  try{
    if(typeof window!=='undefined'&&window.XW_ECON){
      window.XW_ECON.succession={on:econSuccessionOn,handOver:econSuccessionHandOver,pick:econSuccPick,poll:econSuccessionPoll,
        onLifeEnd:econSuccOnLifeEnd,onLifeLow:econSuccOnLifeLow,TUNE:ECON_SUCC_TUNE,rt:ECON_SUCC_RT,DEFAULT:ECON_SUCCESSION_DEFAULT};
    }
  }catch(e){}
}
econSuccessionInstall();
try{if(typeof setTimeout==='function'){setTimeout(econSuccessionInstall,0);setTimeout(econSuccessionInstall,300);}}catch(e){}
