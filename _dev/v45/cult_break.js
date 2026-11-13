// ================== cult_break.js：達標突破、時長、天劫 ===================
(globalThis.__cultQS)||(globalThis.__cultQS=(function(){/* P0 2026-11-13：網址參數只在第一次用到時解析一次並快取（遊戲執行中只有 g23 改 big/classic，不動 cult 參數）；?caiqs=0 回到每次重新解析 */let p=null,off=false;const rd=function(){try{return (typeof location!=='undefined'&&location.search)||'';}catch(e){return '';}};off=/(?:^|[?&])caiqs=(0|off|false)(?:&|$)/.test(rd());const g=function(){if(off)return new URLSearchParams(rd());if(p===null)p=new URLSearchParams(rd());return p;};g.off=off;g.gen=0;g.reset=function(){p=null;g.gen++;};/* 測試或換網址後呼叫 reset() */return g;})());
(globalThis.__cultStore)||(globalThis.__cultStore=(function(){/* singlestore 2026-11-13：宗門倉庫唯一存放。XW_STORE 存在且 enabled() 才走它；?cultstore=0 或 ?singlestore=0 回舊寫法。add/take 失敗（客機唯讀、未綁定等）一律回 false，呼叫端照舊寫法處理 */const X=function(){try{const q=globalThis.__cultQS&&globalThis.__cultQS();if(q&&/^(0|off|false)$/.test(q.get('cultstore')||''))return null;const s=(typeof XW_STORE!=='undefined')?XW_STORE:null;return s&&typeof s.enabled==='function'&&s.enabled()?s:null;}catch(e){return null;}};X.add=function(k,n,why,opt){const s=X();if(!s||!(n>0))return false;try{const r=s.add(k,n,why,opt);return !!(r&&r.ok);}catch(e){return false;}};X.take=function(k,n,why){const s=X();if(!s||!(n>0))return false;try{const r=s.take(k,n,why);return !!(r&&r.ok);}catch(e){return false;}};X.get=function(k){const s=X();try{return s?s.get(k):undefined;}catch(e){return undefined;}};return X;})());
function cultNeedDiyun(u){return CULT_CFG.diyunNeed[Math.min(u&&u.realm||0,CULT_CFG.diyunNeed.length-1)]||0;}
function cultCombatReady(u){
  if(!CULT_FLAGS.dualExp||(u.realm||0)<CULT_CFG.dualFromRealm)return true;
  return (u.combatExp||0)>=cultCombatNeed(u)-1e-6;
}
function cultXiuReady(u){
  const need=typeof needXiu==='function'?needXiu(u):0;
  const subOk=(u.sub||0)>=cultSubTop(u); // v52Top(realm)：十層境界須到第十層
  return subOk&&(u.xiu||0)>=need;
}
function cultRealmOpen(u){return u&&u.realm<CULT_CFG.maxRealm&&REALMS[u.realm+1];}

cultCanBreak=function(u){
  if(!u||u.dead||u.cultBrk||u.cultComa>0||u.y47dn)return false;
  if(!cultRealmOpen(u))return false;
  if(!cultXiuReady(u))return false;
  if(!cultCombatReady(u))return false;
  if(cultDiyunOf(u)<cultNeedDiyun(u))return false;
  if(typeof breakConds==='function'){
    const c=breakConds(u);if(!c)return false;
    // breakConds 在 MAX_REALM 會直接失敗；旗標開啟時只看「非修為／我們已另驗」的材料條件
    const miss=(c.list||[]).filter(x=>!x.ok&&!/^修為圓滿/.test(x.t)&&!/^戰鬥經驗/.test(x.t)&&!/^底蘊/.test(x.t)&&!/最高境界/.test(x.t));
    if(miss.length)return false;
    if(c.ok)return true;
    if((u.realm||0)>=(typeof MAX_REALM==='number'?MAX_REALM:6))return miss.length===0;
    return false;
  }
  return true;
};

cultAugmentConds=function(u,c){
  const list=c.list?c.list.slice():[];
  if(CULT_FLAGS.dualExp&&(u.realm||0)>=CULT_CFG.dualFromRealm){
    const need=cultCombatNeed(u);
    list.push({t:`戰鬥經驗圓滿（${Math.floor(u.combatExp||0)}/${need}）`,ok:cultCombatReady(u),cult:'ce'});
  }
  list.push({t:`底蘊 ${Math.floor(cultDiyunOf(u))}/${cultNeedDiyun(u)}`,ok:cultDiyunOf(u)>=cultNeedDiyun(u),cult:'dy'});
  const cap=list.find(x=>/最高境界/.test(x.t));
  if(cap&&cultRealmOpen(u)){cap.ok=true;cap.t=`可衝擊「${REALMS[u.realm+1].n}」（新突破）`;}
  const xiu=list.find(x=>/^修為圓滿/.test(x.t));
  const others=list.filter(x=>x!==cap);
  const ok=(!xiu||xiu.ok)&&cultCombatReady(u)&&cultDiyunOf(u)>=cultNeedDiyun(u)&&others.filter(x=>!x.ok&&x!==xiu).every(x=>x.ok||x.cult);
  // 材料條件仍要成立（扣除「已達最高」）
  const matOk=others.every(x=>x.ok||x.cult||/^修為圓滿/.test(x.t)?(x.ok||/^修為圓滿/.test(x.t)&&cultXiuReady(u)):x.ok);
  c.list=list;c.ok=cultXiuReady(u)&&cultCombatReady(u)&&cultDiyunOf(u)>=cultNeedDiyun(u)&&others.filter(x=>!x.cult&&!/^修為圓滿/.test(x.t)&&!/最高境界/.test(x.t)).every(x=>x.ok);
  c.fail=0;c.cult=1;c.auto=c.auto&&(u.realm||0)<=1;
  return c;
};

// singlestore v2（經濟 API §2.5）：仙凡令先扣該成員行囊再扣宗門倉（owner＝u.np 或 u.id，原子）；沒有 count／take(owner) 或失敗回 false，走舊寫法
function cultTakeXfl(u,CS){try{const st=CS&&CS();if(!st||typeof st.count!=='function')return false;const own=(u&&u.np!=null)?u.np:(u&&u.id);if((+st.count('item:xfl',{owner:own})||0)<1)return false;const r=st.take('item:xfl',1,{owner:own,reason:'lianqiBreak'});return !!(r&&r.ok);}catch(e){return false;}}
function cultPayBreak(u){
  const r=u.realm;
  try{
    const CS=globalThis.__cultStore;
    // 倉庫開時用 take('lingshi') 拆高品找零；不足／唯讀時照舊直接減（倉庫 setter 會接住），行為不變
    const payLs=function(n){if(!(n>0))return;if(!CS.take('lingshi',n,'cultBreak'))S.res.lingshi-=n;};
    if(r===3&&typeof TUNE!=='undefined'){payLs(TUNE.lianqiLs);if(!cultTakeXfl(u,CS)){if((CS.get('item:xfl')||0)>0&&CS.take('item:xfl',1,'cultBreak')){}else if(S.items)S.items.xfl=Math.max(0,(S.items.xfl||0)-1);}}
    if(r===4){payLs(TUNE.zhujiLs);if(typeof takePill==='function')takePill('zj');}
    if(r===5){payLs(TUNE.jindanLs);if(typeof takePill==='function')takePill('ny');}
  }catch(e){}
  u.tpB=0;
}

cultStartBreak=function(u,auto,_tb){
  if(!u||u.dead)return false;
  if(u.cultBrk){if(!auto&&typeof toast==='function')toast((typeof nm==='function'?nm(u):'')+'正在突破中');return false;}
  if(!cultCanBreak(u)){
    if(!auto&&typeof toast==='function'&&typeof breakConds==='function'){
      const c=breakConds(u);const miss=(c.list||[]).filter(x=>!x.ok).map(x=>x.t);
      toast((typeof nm==='function'?nm(u):'')+'尚未滿足突破條件：'+(miss.join('；')||'修為／戰鬥經驗／底蘊未達標'));
    }
    return false;
  }
  const r=u.realm,needDur=CULT_FLAGS.breakDuration&&CULT_CFG.breakSec[r],needTrib=CULT_FLAGS.tribulation&&r>=CULT_CFG.tribFromRealm;
  cultPayBreak(u);
  if(needDur){
    const dur=CULT_CFG.breakSec[r];
    u.cultBrk={to:r+1,from:r,t0:S.time,wall:Date.now(),dur:dur,prog:0,stage:0,lock:1,paid:1,trib:needTrib?0: -1};
    if(typeof toast==='function')toast(`✦ ${(typeof nm==='function'?nm(u):'')}開始閉關衝擊「${REALMS[r+1].n}」（約 ${Math.round(dur/3600)} 小時，分 ${CULT_CFG.breakStages} 個小階段）`);
    if(typeof floater==='function')floater(u.x,u.y,'閉關突破','#ffe27a');
    Cult.emit('cult:breakStart',{id:u.id,from:r,to:r+1,dur:dur});
    return true;
  }
  if(needTrib){cultBeginTrib(u);return true;}
  cultFinishBreak(u);return true;
};

function cultFinishBreak(u){
  if(!u)return false;
  u.cultBrk=null;
  if(typeof Y47!=='undefined')Y47.djSkip=true;
  try{if(typeof doBreak==='function')doBreak(u);}finally{if(typeof Y47!=='undefined')Y47.djSkip=false;}
  return true;
}

function cultBeginTrib(u){
  const n=CULT_CFG.tribStrikes[u.realm]||3;
  u.cultBrk=u.cultBrk||{to:u.realm+1,from:u.realm,t0:S.time,wall:Date.now(),dur:0,prog:0,stage:CULT_CFG.breakStages,lock:1,paid:1};
  u.cultBrk.trib=1;u.cultBrk.strikes=n;u.cultBrk.hit=0;u.cultBrk.next=0;u.cultBrk.lock=1;
  if(typeof toast==='function')toast(`⚡ ${(typeof nm==='function'?nm(u):'')}引出天劫，共 ${n} 道天雷！`);
  if(typeof fx==='function')fx('ring',u.x,u.y,'#c8d8ff');
  Cult.emit('cult:tribStart',{id:u.id,n:n,realm:u.realm});
}

// 底蘊減傷只算「超過先天」的部分（與 cult_trib2 diyunPart 同一規則：每點 diyunRedPer、本項封頂 diyunRedCap）
function cultDiyunRedPart(u){
  try{const T=window.CULT_TRIB2;if(T&&typeof T.diyunPart==='function')return Math.max(0,+T.diyunPart(u)||0);}catch(e){}
  const T=window.CULT_TRIB2||{};
  const per=T.diyunRedPer!=null?+T.diyunRedPer:0.001,cap=T.diyunRedCap!=null?+T.diyunRedCap:0.10;
  const earned=Math.max(0,cultDiyunOf(u)-cultDiyunBase(u));
  return Math.min(Math.max(0,cap),earned*Math.max(0,per));
}
function cultTribReduce(u,raw){
  let m=1-cultDiyunRedPart(u);
  if(Cult.hasTianjieTai(u))m*=(1-CULT_CFG.tianjieTaiReduce);
  if(Cult.hasFabaoGuard(u))m*=(1-CULT_CFG.fabaoReduce);
  if(Cult.hasTribPill(u))m*=(1-CULT_CFG.pillReduce);
  let dmg=raw*m;
  if(typeof Cult.tribDmgHook==='function'){try{dmg=Cult.tribDmgHook(u,dmg,u.cultBrk&&u.cultBrk.hit);}catch(e){}}
  return Math.max(1,dmg);
}

function cultTribStrike(u){
  const B=u.cultBrk;if(!B||!B.trib)return;
  B.hit=(B.hit||0)+1;
  const frac=CULT_CFG.tribHpFrac[u.realm]||0.2;
  const raw=(u.maxhp||1)*frac;
  const dmg=cultTribReduce(u,raw);
  u.hp=Math.max(0,u.hp-dmg);u.lastHit=S.time;
  if(typeof floater==='function')floater(u.x,u.y,'天雷 -'+Math.round(dmg),'#c8d8ff');
  if(typeof fx==='function')fx('ring',u.x,u.y,'#e8f0ff');
  Cult.emit('cult:tribStrike',{id:u.id,i:B.hit,n:B.strikes,dmg:dmg,hp:u.hp});
  if(u.hp<=0){cultTribFail(u);return;}
  if(B.hit>=B.strikes){u.cultBrk=null;try{u.cultTribPill=0;}catch(e){}cultFinishBreak(u);Cult.emit('cult:tribSuccess',{id:u.id});}
}

function cultApplyWound(u,why){
  const lost=Math.floor((u.xiu||0)*CULT_CFG.failXiuLoss);
  u.xiu=Math.max(0,(u.xiu||0)-lost);
  u.hp=Math.max(1,Math.floor((u.maxhp||1)*CULT_CFG.woundHp));
  u.cultWound={t:S.time+CULT_CFG.woundDur,why:why||'wound',xiuLost:lost,realm:u.realm,sub:u.sub||0};
  if(u.y47dn)u.y47dn=null;
  u.dead=false;
  if(typeof floater==='function')floater(u.x,u.y,'重傷','#ff8080');
  Cult.emit('cult:wound',{id:u.id,why:why,xiuLost:lost,hp:u.hp,realm:u.realm});
  return lost;
}

function cultTribFail(u){
  const r=u.realm;
  u.hp=1;u.cultBrk=null;
  try{u.cultTribPill=0;}catch(e){}
  const lost=cultApplyWound(u,'tribulation');
  // 元嬰前絕不死；境界不掉
  if(r<7){u.dead=false;u.hp=Math.max(1,u.hp);}
  if(typeof toast==='function')toast(`⚡ ${(typeof nm==='function'?nm(u):'')}渡劫失敗，重傷、修為倒退${r<7?'（未殞命，境界仍在）':''}`);
  Cult.emit('cult:tribFail',{id:u.id,xiuLost:lost,realm:r,survived:r<7||!u.dead});
  if(r>=7&&u.hp<=1){u.hp=0;if(typeof cultOnLethal==='function')cultOnLethal(u,null,{why:'tribulation'});}
}

CultTickBreak=function(dt,offline){
  if(!S||!S.units||!(CULT_FLAGS.breakDuration||CULT_FLAGS.tribulation))return;
  for(const u of S.units){
    const B=u.cultBrk;if(!B)continue;
    if(B.trib>0){
      B.next=(B.next||0)-dt;
      if(B.next<=0){B.next=CULT_CFG.tribGap;cultTribStrike(u);}
      continue;
    }
    if(!CULT_FLAGS.breakDuration)continue;
    B.prog=(B.prog||0)+dt;
    const p=Math.min(1,B.prog/Math.max(1,B.dur));
    const st=Math.min(CULT_CFG.breakStages-1,Math.floor(p*CULT_CFG.breakStages));
    if(st!==B.stage){B.stage=st;Cult.emit('cult:breakStage',{id:u.id,stage:st+1,n:CULT_CFG.breakStages,p:p});if(typeof floater==='function')floater(u.x,u.y,`突破 ${st+1}/${CULT_CFG.breakStages}`,'#bfe8ff');}
    if(B.prog>=B.dur){
      if(B.trib===0||(CULT_FLAGS.tribulation&&(u.realm>=CULT_CFG.tribFromRealm)))cultBeginTrib(u);
      else cultFinishBreak(u);
    }
  }
};

// 測試／除錯：立刻把突破進度拉滿或立刻打出一道雷
Cult.devFillBreak=function(u){if(u&&u.cultBrk){u.cultBrk.prog=u.cultBrk.dur;}};
Cult.devStrike=function(u){if(u&&u.cultBrk&&u.cultBrk.trib)cultTribStrike(u);else if(u){cultBeginTrib(u);cultTribStrike(u);}};

// 套裝加成 breakAdd：加進突破成功率，維持原本 TUNE.v170.cap 上限；econ 不給值時與現在完全相同
if(typeof breakFail==='function'&&!breakFail._cultSetBonus){
  const _bf=breakFail;
  breakFail=function(u){
    let f=_bf.apply(this,arguments);
    let add=0;
    try{
      const s=typeof cultEconSetBonus==='function'?cultEconSetBonus(u):null;
      if(s&&typeof s.breakAdd==='number'&&isFinite(s.breakAdd))add=s.breakAdd;
    }catch(e){}
    if(!add||!u||u._nd||f<=0)return f;
    f=f-add;
    try{if(typeof TUNE!=='undefined'&&TUNE.v170&&typeof TUNE.v170.cap==='number'&&isFinite(TUNE.v170.cap))f=Math.max(1-TUNE.v170.cap,f);}catch(e){}
    return f;
  };
  breakFail._cultSetBonus=1;
}

// 資質 α（g23 xnGradeAlpha：下品 −5%…天品 +5%，TUNE.xn.gradeAlpha 控制，?f132=0 回傳 0）加進突破成功率。
// 原本上下限保留：加成時不越過成功率上限 TUNE.v170.cap（失敗率下限 1−cap），扣減時不越過失敗率上限 0.95；
// 原值已超出界線時不再往外推。關閉：?f132=0 或 ?caialpha=0 或 CULT_FLAGS.caialpha=false，此時與改前完全相同。
function cultAlphaOff(){
  try{if(window.CULT_FLAGS&&CULT_FLAGS.caialpha===false)return true;}catch(e){}
  try{const q=globalThis.__cultQS().get('caialpha');if(q==='0'||q==='off'||q==='false')return true;}catch(e){}
  return false;
}
function cultAlphaOf(u){
  if(!u||cultAlphaOff())return 0;
  let a=0;
  try{if(typeof xnGradeAlpha==='function')a=+xnGradeAlpha(u);else if(window.XW&&typeof XW.xnGradeAlpha==='function')a=+XW.xnGradeAlpha(u);}catch(e){a=0;}
  return isFinite(a)?a:0;
}
if(typeof breakFail==='function'&&!breakFail._cultAlpha){
  const _bfa=breakFail;
  breakFail=function(u){
    const f=_bfa.apply(this,arguments);
    if(!u||u._nd||!(f>0))return f;
    const a=cultAlphaOf(u);if(!a)return f;
    let lo=0.30;try{if(typeof TUNE!=='undefined'&&TUNE.v170&&isFinite(+TUNE.v170.cap))lo=1-TUNE.v170.cap;}catch(e){}
    const hi=0.95;
    let g=f-a;
    if(a>0)g=Math.max(g,Math.min(f,lo));
    else g=Math.min(g,Math.max(f,hi));
    return g;
  };
  breakFail._cultAlpha=1;
}
try{if(typeof Cult!=='undefined'&&Cult)Cult.alpha={of:cultAlphaOf,off:cultAlphaOff};}catch(e){}
