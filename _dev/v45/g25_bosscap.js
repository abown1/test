// ================== g25_bosscap.js：首領強度上限（創意家 2026-11-10：「BOSS最多只強1.2倍」「只有特殊試煉有特殊難度」）==================
// 規則：所有首領的「單人最終」氣血上限與攻擊 ≤ 同境界（含小階段）標準 × BOSS_REALM_CAP（1.2）。
// 同境標準＝主角本體在該境界／小階段的氣血與攻擊（g3.js makePlayer 120／12 → g5.js applyRealmStats 逐境 xnFullM → 小階段 ×(1+xnSb)），
//   與 cult_enemy.js「同境玩家公式」、map_data_enemies.js「同境基礎 ≈ 玩家」同一口徑；不含裝備。
// 例外：特殊試煉＝仙凡之門（S.dg.kind==='xf'，首領「試煉王」）保留原難度，不夾。
// 多人：副本首領人數血量加成（g13 dgMob：1+0.25×(人數−1)）與野外聯機血量（g23 xnCoK）照舊疊在上限之上。
// 只往下夾、不往上抬；防禦／護盾／狂暴速度不動。聯機客端不改（以主機數值為準）。
// 掛點：makeEnemy／dgMob／dgSpawnRoom／spawnKing／mapEnemyDecorate 的最外層＋每 0.5 秒補掃（涵蓋讀檔、後續改境界、敵人裝備／至寶）。
const BOSS_REALM_CAP=1.2;
const BOSS_STD_BASE={hp:120,atk:12};   // = g3.js makePlayer 初始 maxhp／atk
const BOSSCAP={n:0,log:[]};
function bossCapClient(){try{return typeof v49Client==='function'&&v49Client();}catch(e){return false;}}
// 2026-11-10 22:05 每境界固定數值（g27_realmbase.js）：已換算的單位（e._rb）或未指定單位時用新模板 rbStd（不含浮動）；生成當下尚未換算的敵人用舊口徑
function bossCapStd(r,s,e){
  try{if(typeof TUNE!=='undefined'&&TUNE.rb&&TUNE.rb.on&&typeof rbStd==='function'&&(!e||e._rb)){const t=rbStd(r,s,1,null);return {hp:t.hp,atk:t.atk};}}catch(er){}
  r=Math.max(0,r|0);s=Math.max(0,s|0);
  const u={maxhp:BOSS_STD_BASE.hp,atk:BOSS_STD_BASE.atk,speed:0};
  applyRealmStats(u,r);
  const m=1+(typeof xnSb==='function'?xnSb(r):(TUNE.subBonus||0.04));
  for(let i=0;i<s;i++){u.maxhp=Math.round(u.maxhp*m);u.atk=+(u.atk*m).toFixed(1);}
  return {hp:u.maxhp,atk:u.atk};
}
function bossCapIsBoss(e){
  if(!e||e.kind||!e.type)return false;
  if(e._bcBoss)return true;
  const D=ENEMY[e.type];
  if(D&&D.boss)return true;
  if(e.boss||e._mapBoss||e._mapRareBoss||e.tier==='boss'||e.exd==='boss')return true;
  try{if(S.dg&&S.dg.boss!=null&&S.dg.boss===e.id)return true;}catch(er){}
  return false;
}
// 特殊試煉（仙凡之門）：不夾
function bossCapExempt(e){try{return !!(S.dg&&S.dg.kind==='xf');}catch(er){return false;}}
// 多人／人數加成（單人＝1）：只在上限之上另乘，不移除
function bossCapParty(e){
  if(e._bcPf)return e._bcPf;
  let hp=1,atk=1;
  try{
    if(S.dg){const n=Math.max(1,S.dg.party||1);hp=1+0.25*(n-1);}   // g13.js:111 非仙凡之門首領
    else if(e.xnCoK)hp=e.xnCoK;                                    // g23.js 野外聯機血量
  }catch(er){}
  return e._bcPf={hp,atk};
}
function bossCapStats(e){
  try{
    if(!e||e.dead||bossCapClient()||!bossCapIsBoss(e)||bossCapExempt(e))return e;
    const r=e.realm|0,s=e.sub|0;
    const key=r+'|'+s+'|'+e.maxhp+'|'+e.atk+'|'+(e._rb?1:0);
    if(e._bcK===key)return e;
    const st=bossCapStd(r,s,e),pf=bossCapParty(e);
    const capHp=Math.max(1,Math.floor(BOSS_REALM_CAP*st.hp*pf.hp+1e-9));
    const capAtk=Math.max(0.1,Math.floor(BOSS_REALM_CAP*st.atk*pf.atk*10+1e-9)/10);
    const h0=e.maxhp,a0=e.atk;let ch=false;
    if(e.maxhp>capHp){const f=e.maxhp>0?(e.hp/e.maxhp):1;e.maxhp=capHp;e.hp=e.hp>0?Math.max(1,Math.min(capHp,Math.round(capHp*f))):e.hp;ch=true;}
    if(e.atk>capAtk){e.atk=capAtk;ch=true;}
    if(ch){
      if(e._mapBase){if(h0>0)e._mapBase.maxhp=Math.round(e._mapBase.maxhp*e.maxhp/h0);if(a0>0)e._mapBase.atk=+(e._mapBase.atk*e.atk/a0).toFixed(1);}
      const keepLbl=e._mapSpecialBoss&&e.v51r;
      if(keepLbl)e.v51k=e.maxhp+'|'+e.atk+'|'+e.realm+'|'+(e.v49lq?1:0);else{e.v51k=null;e.v51r=null;}
      e._bossCap={hp0:h0,atk0:a0,capHp,capAtk,pfHp:+pf.hp.toFixed(3),r,s};
      BOSSCAP.n++;BOSSCAP.log.push({id:e.id,type:e.type,r,s,hp0:h0,atk0:a0,hp:e.maxhp,atk:e.atk});if(BOSSCAP.log.length>100)BOSSCAP.log.shift();
    }
    e._bcK=r+'|'+s+'|'+e.maxhp+'|'+e.atk+'|'+(e._rb?1:0);
  }catch(er){}
  return e;
}
function bossCapSweep(){try{if(!S||!S.enemies||bossCapClient())return;for(const e of S.enemies)if(bossCapIsBoss(e))bossCapStats(e);}catch(er){}}
// 包到最外層；複製內層函式的旗標屬性（如 _mapSpecial），避免其他模組重複包裝
function bossCapWrap(name,mk){
  try{
    const cur=eval('typeof '+name+"==='function'?"+name+':null');
    if(typeof cur!=='function'||cur._bossCap)return false;
    const w=mk(cur);for(const k of Object.keys(cur))if(!(k in w))w[k]=cur[k];w._bossCap=1;
    eval(name+'=w');return true;
  }catch(er){return false;}
}
function bossCapInstall(){
  bossCapWrap('makeEnemy',_x=>function(){return bossCapStats(_x.apply(this,arguments));});
  bossCapWrap('dgMob',_x=>function(t,x,y,boss){const e=_x.apply(this,arguments);try{if(boss&&e)e._bcBoss=1;}catch(er){}return bossCapStats(e);});
  bossCapWrap('dgSpawnRoom',_x=>function(r){const ret=_x.apply(this,arguments);try{if(r&&r.boss)bossCapSweep();}catch(er){}return ret;});
  bossCapWrap('spawnKing',_x=>function(){const ret=_x.apply(this,arguments);bossCapSweep();return ret;});
  if(typeof mapEnemyDecorate==='function')bossCapWrap('mapEnemyDecorate',_x=>function(e){const ret=_x.apply(this,arguments);try{bossCapStats(ret&&typeof ret==='object'?ret:e);}catch(er){}return ret;});
}
bossCapInstall();
// map_special／map_boot 會在開機後再包 dgMob／dgSpawnRoom：之後再包一次，保持最外層
[300,1500,4000,9000].forEach(t=>setTimeout(bossCapInstall,t));
setInterval(bossCapSweep,500);
try{window.XW_BOSSCAP={cap:BOSS_REALM_CAP,std:bossCapStd,clamp:bossCapStats,sweep:bossCapSweep,isBoss:bossCapIsBoss,exempt:bossCapExempt,st:BOSSCAP,install:bossCapInstall};}catch(er){}
