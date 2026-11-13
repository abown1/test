// cult_grade.js — 品級晉升（先天體質：凡→中→上→天→仙）。規格 FUTURE_UPDATES F-081～083、F-090、F-115、F-125、F-129、F-131、F-133、F-135、F-138；NEXT_UPDATE_TARGETS §F。
(globalThis.__cultQS)||(globalThis.__cultQS=(function(){/* P0 2026-11-13：網址參數只在第一次用到時解析一次並快取（遊戲執行中只有 g23 改 big/classic，不動 cult 參數）；?caiqs=0 回到每次重新解析 */let p=null,off=false;const rd=function(){try{return (typeof location!=='undefined'&&location.search)||'';}catch(e){return '';}};off=/(?:^|[?&])caiqs=(0|off|false)(?:&|$)/.test(rd());const g=function(){if(off)return new URLSearchParams(rd());if(p===null)p=new URLSearchParams(rd());return p;};g.off=off;g.gen=0;g.reset=function(){p=null;g.gen++;};/* 測試或換網址後呼叫 reset() */return g;})());
// 旗標預設開（2026-11-11 正式版）：?caigrade=0 或 CULT_FLAGS.caigrade===false 強制關。關閉時不掛任何東西、不寫任何欄位（存檔與現在相同）。
// 觸發：只在雷劫 v2（築基起）撐過最後一道雷後的存活掛點 CULT_TRIB2.onSurvive；當前底蘊達門檻 1000／5000／25000／100000 才擲；每次最多升一品。
// 選擇：30 秒（遊戲時間）；主角跳選擇框，逾時＝不嘗試（不懲罰）；弟子由 AI 依性格自選。
// 成功率（F-133）：min((min(40%, 基礎＋min(1,底蘊/需求)×40%) ＋ 護法 ＋ QTE)×α, 95%)。基礎 60／40／20／天→仙 5%（F-082）；
//   護法、QTE 目前遊戲沒有，預設 0，可由 CULT_GRADE.extra(u) 回傳 {guard,qte} 接上；α＝1＋資質（g23 xnGradeAlpha）＋環境（未定，0）。
//   非仙武之體衝仙品：成功率 −40%，需輸入「逆天改命」才可嘗試（F-125、F-135⑥）。
// 效果：每品基礎模板 ×1.15 複利（只乘裸數值氣血／攻擊，不乘裝備加成；之後境界換算按比例保留）。
// 失敗：退一品（凡品維持凡品）、不扣資材（F-131②、F-138）。仙武之體衝仙品失敗：扣 50% 累積底蘊＋經脈受損（修煉速度 −30%，300 秒），可無限重試（F-083）。
//   非仙武之體衝仙品失敗：經脈盡斷，72 小時（遊戲時間）氣血／攻擊 −40%，到期自動恢復（F-125、F-135⑤）。
// 存檔：只在開啟後實際晉升／受傷的單位寫一個欄位 u.cgr={g, jm, ss}（加進 UNIT_KEEP）。聯機同步待仙武聯機（房主權威，客機不擲）。
(function(){
'use strict';
const G=window.CULT_GRADE=window.CULT_GRADE||{};
const NAMES=['凡品','中品','上品','天品','仙品'];
const CFG=G.cfg=Object.assign({need:[1000,5000,25000,100000],base:[0.60,0.40,0.20,0.05],dyK:0.40,lockCap:0.40,cap:0.95,mul:1.15,
  choiceSec:30,forcePen:0.40,forceWord:'逆天改命',xwDyLoss:0.5,ssSec:300,ssMul:0.70,jmSec:72*3600,jmMul:0.60},G.cfg||{});
function qp(k){try{return globalThis.__cultQS().get(k);}catch(e){return null;}}
function on(){
  const q=qp('caigrade');if(q==='0'||q==='off'||q==='false')return false;if(q==='1'||q==='on'||q==='true')return true;
  try{if(window.CULT_FLAGS&&CULT_FLAGS.caigrade===false)return false;}catch(e){}
  return true;
}
G.on=on;G.NAMES=NAMES;
function gS(){try{return (typeof S!=='undefined'&&S)||(window.XW&&XW.S)||null;}catch(e){return null;}}
function now(){const s=gS();return s?(+s.time||0):0;}
function client(){try{return typeof v49Client==='function'&&v49Client();}catch(e){return false;}}
function xw(u){try{return typeof isXW==='function'?!!isXW(u):false;}catch(e){return false;}}
function gradeOf(u){return (u&&u.cgr&&u.cgr.g|0)||0;}
function rec(u){if(!u.cgr)u.cgr={g:0};return u.cgr;}
function diyun(u){try{return +(typeof cultDiyunOf==='function'?cultDiyunOf(u):u.diyun)||0;}catch(e){return +(u&&u.diyun)||0;}}
function alpha(u){
  let a=0;try{if(window.Cult&&Cult.alpha&&typeof Cult.alpha.of==='function')a=+Cult.alpha.of(u)||0;else if(typeof xnGradeAlpha==='function')a=+xnGradeAlpha(u)||0;}catch(e){}
  let env=0;try{if(typeof G.env==='function')env=Math.max(0,Math.min(0.05,+G.env(u)||0));}catch(e){}
  return 1+a+env;
}
function extra(u){try{if(typeof G.extra==='function'){const x=G.extra(u)||{};return {guard:+x.guard||0,qte:+x.qte||0};}}catch(e){}return {guard:0,qte:0};}
function canTry(u){const g=gradeOf(u);if(g>=4)return {ok:false,why:'max'};const need=CFG.need[g];if(diyun(u)<need)return {ok:false,why:'diyun',need};return {ok:true,g,need,force:g===3&&!xw(u)};}
function rateOf(u){
  const c=canTry(u);if(!c.ok)return 0;const g=c.g;
  const lock=Math.min(CFG.lockCap,CFG.base[g]+Math.min(1,diyun(u)/CFG.need[g])*CFG.dyK);
  const x=extra(u);let r=(lock+x.guard+x.qte)*alpha(u);
  if(c.force)r-=CFG.forcePen;
  return Math.max(0,Math.min(CFG.cap,r));
}
G.rateOf=rateOf;G.canTry=canTry;G.gradeOf=gradeOf;
// 只乘裸數值（扣掉 gb／econGb 裝備加成），氣血比例保留；g27 之後的境界換算以「現值／上次值」比例延續，所以倍率會一路保留
function scale(u,k){
  if(!(k>0)||Math.abs(k-1)<1e-9)return;
  const gh=((u.gb&&u.gb.hp)||0)+((u.econGb&&u.econGb.hp)||0),ga=((u.gb&&u.gb.atk)||0)+((u.econGb&&u.econGb.atk)||0);
  const fr=u.maxhp>0?Math.max(0,Math.min(1,u.hp/u.maxhp)):1,dead=!(u.hp>0);
  u.maxhp=Math.max(1,Math.round((u.maxhp-gh)*k+gh));u.atk=+Math.max(0.1,(u.atk-ga)*k+ga).toFixed(1);
  if(u._cultDanduRef!=null&&isFinite(u._cultDanduRef))u._cultDanduRef=Math.max(1,Math.round(u._cultDanduRef*k));
  if(!dead)u.hp=Math.max(1,Math.min(u.maxhp,Math.round(u.maxhp*fr)));
  u.v51k=null;u._bcK=null;
}
G.log=[];
function say(u,t,col){try{if(typeof floater==='function')floater(u.x,u.y-1.2,t,col||'#f6d36b');}catch(e){}try{if(u.kind==='player'&&typeof toast==='function')toast(t);}catch(e){}}
function attempt(u){
  const c=canTry(u);if(!c.ok)return {ok:false,why:c.why};
  const r=rateOf(u),roll=Math.random(),g=c.g,R=rec(u),t=now();
  const res={id:u.id,from:g,rate:r,roll:+roll.toFixed(4),force:!!c.force,xw:xw(u),t};
  if(roll<r){R.g=g+1;scale(u,CFG.mul);res.ok=true;res.to=g+1;say(u,'品級晉升：'+NAMES[g+1]);}
  else{
    res.ok=false;
    if(g===3&&res.xw){const lost=Math.floor(diyun(u)*CFG.xwDyLoss);u.diyun=Math.max(0,diyun(u)-lost);R.ss={until:t+CFG.ssSec};res.to=g;res.dyLost=lost;say(u,'衝擊仙品失敗：底蘊流失、經脈受損','#ff9b6b');}
    else if(g===3){R.jm={until:t+CFG.jmSec,k:CFG.jmMul};scale(u,CFG.jmMul);res.to=g;say(u,'逆天失敗：經脈盡斷','#ff5555');}
    else if(g>0){R.g=g-1;scale(u,1/CFG.mul);res.to=g-1;say(u,'品級晉升失敗：退為'+NAMES[g-1],'#ff9b6b');}
    else{res.to=0;say(u,'品級晉升失敗：維持凡品','#ccc');}
  }
  G.log.push(Object.assign({ev:'attempt'},res));
  try{if(typeof cultEmit==='function')cultEmit('cult:grade',res);}catch(e){}
  return res;
}
G.attempt=attempt;
// 到期恢復（遊戲時間）：經脈盡斷還原 1/k；經脈受損移除
function sweep(){
  if(!on()||client())return;const s=gS();if(!s||!Array.isArray(s.units))return;const t=now();
  for(const u of s.units){const R=u&&u.cgr;if(!R)continue;
    if(R.jm&&t>=R.jm.until){scale(u,1/(R.jm.k||CFG.jmMul));delete R.jm;G.log.push({ev:'jmEnd',id:u.id,t});}
    if(R.ss&&t>=R.ss.until){delete R.ss;G.log.push({ev:'ssEnd',id:u.id,t});}}
}
G.sweep=sweep;
// 經脈受損：修煉速度 ×0.7（掛在 Cult.cultMul 外層）
function cultMulK(u){const R=u&&u.cgr;return (on()&&R&&R.ss&&now()<R.ss.until)?CFG.ssMul:1;}
G.cultMulK=cultMulK;
// 弟子 AI：依性格；非仙武之體衝仙品只有「狂」系性格會試
function aiPick(u,c,r){
  const p=String(u.person||'');
  if(c.force)return /狂|傲|莽/.test(p)&&r>0;
  const th=/穩|謹|慎|怯/.test(p)?0.30:/狂|傲|莽|急/.test(p)?0.0:0.15;
  return r>th;
}
G.aiPick=aiPick;
// 選擇框（主角）
let box=null;
function closeBox(){if(box){box.remove();box=null;}}
function showBox(u,c,r,finish){
  closeBox();box=document.createElement('div');box.id='cultGradeDlg';
  box.style.cssText='position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:120;min-width:340px;padding:14px 18px;background:#1b1410ee;color:#f0e2c0;font-size:15px;border:2px solid '+(c.force?'#d33':'#b8954a')+';border-radius:8px;box-shadow:0 0 18px '+(c.force?'#f005':'#0008');
  const pct=Math.round(r*1000)/10;
  let h='<b>品級晉升：'+NAMES[c.g]+' → '+NAMES[c.g+1]+'</b><div style="margin:6px 0">成功率 '+pct+'%　底蘊 '+Math.floor(diyun(u))+'／'+c.need+'</div>';
  h+='<div class="mini">失敗：'+(c.g===3?(c.force?'經脈盡斷（72 小時氣血、攻擊 −40%）':'扣一半底蘊、經脈受損 300 秒，可再試'):(c.g>0?'退一品':'維持凡品'))+'。不選＝不嘗試。</div>';
  if(c.force)h+='<div style="color:#ff6b6b;margin:6px 0">缺乏仙化血脈，強衝仙品成功率 −40%。輸入「'+CFG.forceWord+'」才可嘗試。</div><input id="cultGradeWord" style="width:100%" placeholder="'+CFG.forceWord+'">';
  h+='<div style="margin-top:8px;display:flex;gap:8px"><button class="btn" data-cg="go"'+(c.force?' disabled':'')+'>嘗試晉升</button><button class="btn" data-cg="no">不嘗試</button><span data-cg="left" class="mini"></span></div>';
  box.innerHTML=h;document.body.appendChild(box);
  const go=box.querySelector('[data-cg="go"]'),inp=box.querySelector('#cultGradeWord');
  if(inp)inp.addEventListener('input',()=>{go.disabled=inp.value.trim()!==CFG.forceWord;});
  go.addEventListener('click',ev=>{ev.stopPropagation();finish(true);});
  box.querySelector('[data-cg="no"]').addEventListener('click',ev=>{ev.stopPropagation();finish(false);});
}
const pend={};
G.pending=pend;
G.choose=function(id,yes){const p=pend[id];if(!p)return false;p.finish(!!yes);return true;};
function hook(u,done,info){
  if(!on()||client()||!u){done();return;}
  const c=canTry(u);if(!c.ok){done();return;}
  const r=rateOf(u);
  if(u.kind!=='player'){const yes=aiPick(u,c,r);G.log.push({ev:'ai',id:u.id,yes,rate:r});if(yes)attempt(u);done();return;}
  if(pend[u.id]&&info&&info.resumed){/* 重入：沿用 */return;}
  let fin=false;
  const finish=function(yes){if(fin)return;fin=true;delete pend[u.id];closeBox();G.log.push({ev:'choice',id:u.id,yes:!!yes});if(yes)attempt(u);done();};
  pend[u.id]={finish,t0:now(),until:now()+CFG.choiceSec};
  try{showBox(u,c,r,finish);}catch(e){}
}
function tickChoice(){
  const t=now();for(const id in pend){const p=pend[id];
    if(t>=p.until){G.log.push({ev:'timeout',id:+id});p.finish(false);continue;}
    try{const el=box&&box.querySelector('[data-cg="left"]');if(el)el.textContent='剩 '+Math.ceil(p.until-t)+' 秒';}catch(e){}}
}
function install(){
  if(G._inst)return;const T2=window.CULT_TRIB2;if(!T2)return;G._inst=1;
  const prev=T2.onSurvive;
  T2.onSurvive=function(u,done,info){
    if(!on()){if(typeof prev==='function')return prev(u,done,info);return done();}
    if(typeof prev==='function'){return prev(u,function(){hook(u,done,info);},info);}
    hook(u,done,info);
  };
  try{if(typeof UNIT_KEEP!=='undefined'&&UNIT_KEEP.indexOf('cgr')<0)UNIT_KEEP.push('cgr');}catch(e){}
  try{if(typeof cultMul==='function'&&!cultMul._cg){const _m=cultMul;cultMul=function(u){return _m.apply(this,arguments)*cultMulK(u);};cultMul._cg=1;}}catch(e){}
  setInterval(function(){try{if(!on())return;sweep();tickChoice();}catch(e){}},500);
}
G.install=install;
install();
})();
