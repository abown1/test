// ================== g33_rfix.js：境界固定數值修正（2026-11-13，使用者 09:53 核准稽核全部建議；09:54 試煉王改煉氣一層）==================
// 旗標（網址 ?xxx=0 關閉＝回到舊行為；預設全開）：
//   xfbal    仙凡之門：首領攻擊 1.0、護盾 0.2×模板氣血、小怪 1.1 且 ≤ 宗師初期×1.2、首領房增援 2、召喚每次 1（狂暴 2）總數 ≤3
//   （xfbal 另含：血量 70%／40% 援兵每波 4→round(1+人數/3)）
//   xfr1     仙凡之門首領＝煉氣一層（關＝煉氣二層）
//   spskill  特殊試煉（仙凡／青巖／劇情本）首領與菁英招式倍率收到 1.0～1.1；舊 25% 血攻擊 ×1.3 抵銷（移速狂暴 ×1.2 保留）
//   spfear   特殊試煉不套境界威壓
//   storyboss 劇情本首領改用入場境界一層（困難模式仍 +1 境）
//   enspd    敵人移速改境固：ENEMY.spd ＋ 0.08×大境界×(ENEMY.spd/2.4)
//   enlod    遠距 LOD 到期分步（≤0.05 秒）更新、進入近距丟棄累積時間、敵人加速度與幀率無關
//   spname   特殊試煉首領名牌一律顯示真實境界層數（不因境界看不透顯示「???」），例：試煉王・煉氣一層
//   dgtrib   （integ_1113）渡劫中（player().trib2）不能進副本，避免天雷跟進副本把人劈到戰敗離場（落霞 seed11 P1）
//   rgspd    首領半血狂暴不再 ×1.2 移速（移速只依境界；狂暴仍加快招式）（11/13 使用者：攻擊狂暴可留、速度固定）
(function(){
'use strict';
const QS=(function(){try{return new URLSearchParams((typeof location!=='undefined'&&location.search)||'');}catch(e){return new URLSearchParams('');}})();
function qOff(k){const v=QS.get(k);return v==='0'||v==='off'||v==='false';}
const F={xfbal:!qOff('xfbal'),xfr1:!qOff('xfr1'),spskill:!qOff('spskill'),spfear:!qOff('spfear'),storyboss:!qOff('storyboss'),enspd:!qOff('enspd'),enlod:!qOff('enlod'),rgspd:!qOff('rgspd'),spname:!qOff('spname'),dgtrib:!qOff('dgtrib')};
const C={
  xfBossAtk:1.0, xfBossShield:0.2, xfMob:1.1, xfMobCapRealm:3, xfMobCapSub:0, xfMobCapMul:1.2,
  xfBossAdds:2, xfSummonN:1, xfSummonRage:2, xfSummonMax:3, xfWaveBase:1, xfWavePartyDiv:3,
  skillMul:{charge:1.05,slam:1.1,fan:1.0,cleave:1.05,ring:1.1,rain:1.1},
  spdBase:2.4, spdPerRealm:0.08, lodStep:0.05
};
const OLD={};
const RF={drop:0,dropT:0,flush:0,wave:0};
try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.xfGate)OLD.xfGate=Object.assign({},TUNE.xfGate);}catch(e){}
function xfLive(){try{return !!(S&&S.dg&&S.dg.kind==='xf');}catch(e){return false;}}
function spKind(){try{if(!S||!S.dg)return null;if(S.dg.kind==='xf')return 'xf';if(typeof mapSpecialKindOf==='function')return mapSpecialKindOf(S.dg)||null;}catch(e){}return null;}
function std(r,s){try{if(typeof rbStd==='function')return rbStd(r|0,s|0,1,null);}catch(e){}return null;}
function subMax(r){try{if(typeof v52N==='function')return Math.max(0,(v52N(r|0)|0)-1);}catch(e){}return 3;}

// ---- 1. 仙凡之門首領／小怪數值（g13 applyStats、map_special、cult_enemy 都讀 TUNE.xfGate）----
function applyXfGate(){
  try{
    if(typeof TUNE==='undefined'||!TUNE)return;
    if(!TUNE.xfGate)TUNE.xfGate={on:true,bossAtk:0.77,bossShield:0.5,mob:1.2};
    if(F.xfbal){TUNE.xfGate.bossAtk=C.xfBossAtk;TUNE.xfGate.bossShield=C.xfBossShield;TUNE.xfGate.mob=C.xfMob;}
    else if(OLD.xfGate)Object.assign(TUNE.xfGate,OLD.xfGate);
  }catch(e){}
}
applyXfGate();

// ---- mapSpecialTune：首領層數、增援數 ----
if(typeof mapSpecialTune==='function'&&!mapSpecialTune._g33){
  const _t=mapSpecialTune;
  mapSpecialTune=function(kind){
    const T=_t.apply(this,arguments);
    try{
      if(T&&(T.kind==='xf'||(kind||'xf')==='xf')){
        if(F.xfr1)T.bossSub=0;
        if(F.xfbal)T.bossAdds=Math.min(T.bossAdds,C.xfBossAdds);
      }
    }catch(e){}
    return T;
  };
  mapSpecialTune._g33=1;
  try{if(typeof mapSpecialSyncXfAliases==='function')mapSpecialSyncXfAliases();}catch(e){}
}

// ---- 4. 劇情本首領：入場境界一層（使用者11/13 10:58定） ----
function storyEntry(kind){
  try{const M=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE[kind])||{};
    if(M.minRealm!=null)return M.minRealm|0;if(M.minionCap!=null)return M.minionCap|0;}catch(e){}
  return null;
}
if(typeof mapSpecialBossRS==='function'&&!mapSpecialBossRS._g33){
  const _rs=mapSpecialBossRS;
  mapSpecialBossRS=function(kind){
    const o=_rs.apply(this,arguments);
    try{
      if(F.storyboss&&o&&typeof kind==='string'&&kind.indexOf('st_')===0){
        const T=mapSpecialTune(kind),ent=storyEntry(kind);
        if(ent!=null&&(T.bossRealm|0)>ent){
          const hard=(o.r|0)>(T.bossRealm|0);   // 原函式困難模式 +1
          if(hard)return {r:Math.min(T.bossRealm|0,ent+1),s:0};
          return {r:ent,s:0};   // 使用者11/13 10:58：入場境界一層
        }
      }
    }catch(e){}
    return o;
  };
  mapSpecialBossRS._g33=1;
}

// ---- 2. 召喚數量（只仙凡之門）----
if(typeof v49BResolve==='function'&&!v49BResolve._g33){
  const _r=v49BResolve;
  v49BResolve=function(e,k){
    if(!(F.xfbal&&k==='summon'&&xfLive()))return _r.apply(this,arguments);
    const D=S.dg,q0=D&&D.queue?D.queue.length:0,B=e&&e.v49b,sm0=B?(B.sm||0):0;
    const r=_r.apply(this,arguments);
    try{
      if(D&&D.queue&&B){
        const want=Math.max(0,Math.min(B.rage?C.xfSummonRage:C.xfSummonN,C.xfSummonMax-sm0));
        while(D.queue.length>q0+want)D.queue.pop();
        B.sm=sm0+want;
        if(B.sm>=C.xfSummonMax)B.sm=8;   // 讓 v49BossAI 不再挑召喚
      }
    }catch(er){}
    return r;
  };
  v49BResolve._g33=1;
}

// ---- 1/4. 招式倍率（特殊試煉）----
if(typeof v49BCast==='function'&&!v49BCast._g33&&typeof V49MV!=='undefined'){
  const _c=v49BCast;
  v49BCast=function(e,k,tg){
    const M=V49MV[k];
    if(!(F.spskill&&M&&M.dmg!=null&&C.skillMul[k]!=null&&spKind()))return _c.apply(this,arguments);
    const d0=M.dmg;M.dmg=C.skillMul[k];
    try{return _c.apply(this,arguments);}finally{M.dmg=d0;}
  };
  v49BCast._g33=1;
}

// ---- 3. 特殊試煉不套威壓 ----
if(typeof xnFearTick==='function'&&!xnFearTick._g33){
  const _f=xnFearTick;
  xnFearTick=function(){
    const r=_f.apply(this,arguments);
    try{if(F.spfear&&spKind()){for(const u of S.units)if(u)u.xnFear=0;for(const e of S.enemies)if(e)e.xnFear=0;}}catch(er){}
    return r;
  };
  xnFearTick._g33=1;
}

// ---- 2. 仙凡小怪上限：≤ 入場境界（宗師初期）×1.2（人數加成另乘）----
function xfMobCap(){
  if(!F.xfbal||!xfLive()||!S.enemies)return;
  const T=std(C.xfMobCapRealm,C.xfMobCapSub);if(!T||!(T.hp>0))return;
  let pf=1;try{pf=1+0.2*(Math.max(1,(S.dg.party)|0)-1);}catch(e){}
  const hc=Math.round(T.hp*C.xfMobCapMul*pf),ac=+(T.atk*C.xfMobCapMul).toFixed(1);
  for(const e of S.enemies){
    if(!e||e.dead||e.kind)continue;
    if(e.type==='xfboss'||e._mapXfBoss||e._mapSpecialBoss||(S.dg.boss!=null&&S.dg.boss===e.id))continue;
    if(e.maxhp>hc){const fr=e.hp/e.maxhp;e.maxhp=hc;e.hp=Math.max(1,Math.min(hc,Math.round(hc*fr)));}
    if(e.atk>ac)e.atk=ac;
  }
}
if(typeof dgUpdate==='function'&&!dgUpdate._g33){
  const _u=dgUpdate;
  dgUpdate=function(){const r=_u.apply(this,arguments);try{xfMobCap();}catch(e){}return r;};
  for(const k of Object.keys(_u))if(!(k in dgUpdate))dgUpdate[k]=_u[k];
  dgUpdate._g33=1;
}

// ---- 2/1. 舊 dgBoss：血量 70%／40% 援兵（仙凡每波 4 隻→每波 round(1+人數/3)），以及 25% 血「狂暴」攻擊 ×1.3（特殊試煉抵銷，攻擊維持 1.0～1.1）----
if(typeof dgBoss==='function'&&!dgBoss._g33){
  const _b=dgBoss;
  dgBoss=function(dt){
    const D=S&&S.dg;
    if(!D)return _b.apply(this,arguments);
    const s0=Array.isArray(D.summon)?D.summon.length:0,q0=Array.isArray(D.queue)?D.queue.length:0;
    const r=_b.apply(this,arguments);
    try{
      if(F.xfbal&&D.kind==='xf'&&Array.isArray(D.summon)&&D.summon.length<s0&&Array.isArray(D.queue)){
        const waves=s0-D.summon.length,per=Math.max(0,Math.round(C.xfWaveBase+Math.max(1,D.party|0)/C.xfWavePartyDiv));
        const keep=q0+waves*per;while(D.queue.length>keep)D.queue.pop();RF.wave+=waves;
      }
      if(F.spskill&&spKind()){
        const b=D.boss!=null&&typeof enemyById==='function'?enemyById(D.boss):null;
        if(b&&b.enr&&!b._g33enr){b._g33enr=1;b.atk=+(b.atk/1.3).toFixed(1);}
      }
    }catch(er){}
    return r;
  };
  for(const k of Object.keys(_b))if(!(k in dgBoss))dgBoss[k]=_b[k];
  dgBoss._g33=1;
}

// ---- 5. 敵人境固移速：ENEMY.spd ＋ 0.08×大境界×(ENEMY.spd/2.4)（保留類型相對差；攻速維持與主角相同 1.0 秒）----
function enSpdSync(e){
  if(!e||e.kind||!e.type||typeof ENEMY==='undefined'||!ENEMY[e.type])return;
  const D=ENEMY[e.type],R=Math.max(0,e.realm|0);
  const want=F.enspd?+(C.spdPerRealm*R*((+D.spd||C.spdBase)/C.spdBase)).toFixed(3):0;
  const cur=e._esD||0;
  if(Math.abs(want-cur)<1e-9)return;
  const rage=(e.v49b&&e.v49b.rage&&!e._rgFix)?1.2:1;   // 舊行為（rgspd 關）已狂暴者差值也乘 1.2
  if(typeof e.speed==='number')e.speed=+(e.speed+(want-cur)*rage).toFixed(3);
  e._esD=want;
}
// _esD 與 speed 一起存檔，讀檔不重複加（不改存檔結構版本、不清存檔）
try{if(typeof EN_KEEP!=='undefined'&&EN_KEEP.indexOf('_esD')<0)EN_KEEP.push('_esD');}catch(e){}

// 加速度與幀率無關：原式 v+=(dv-v)·min(1,10·dt) 再用「幀末速度」位移，低 FPS 時起步較快。
// 改為解析解：幀末速度 v1=dv+(v0-dv)·e^(-10dt)，位移用該幀平均速度 dv+(v0-dv)(1-e^(-10dt))/(10dt)；穩態最高速不變。
if(typeof moveEntity==='function'&&!moveEntity._g33){
  const _m=moveEntity;
  moveEntity=function(o,dt){
    if(!F.enlod||!o||o.kind||!o.type||!(dt>0))return _m.apply(this,arguments);
    const k=Math.min(1,10*dt);if(!(k>0))return _m.apply(this,arguments);
    const dx=o.dvx||0,dy=o.dvy||0,vx=o.vx||0,vy=o.vy||0,ex=Math.exp(-10*dt),g=(1-ex)/(10*dt);
    const ax=dx+(vx-dx)*g,ay=dy+(vy-dy)*g;           // 平均速度
    o.dvx=vx+(ax-vx)/k;o.dvy=vy+(ay-vy)/k;           // 讓原式算出的速度＝平均速度
    let r;
    try{r=_m.apply(this,arguments);}
    finally{
      o.dvx=dx;o.dvy=dy;
      if(Math.abs((o.vx||0)-ax)<1e-6&&Math.abs((o.vy||0)-ay)<1e-6){o.vx=dx+(vx-dx)*ex;o.vy=dy+(vy-dy)*ex;}   // 其他包裝改過速度（擊退等）就不覆寫
    }
    return r;
  };
  for(const kk of Object.keys(_m))if(!(kk in moveEntity))moveEntity[kk]=_m[kk];
  moveEntity._g33=1;
}
// 遠距 LOD：仍每 0.5 秒才更新（省效能），但到期時核心改用 ≤0.05 秒分步補完；進入近距／取得目標時丟棄累積時間（原本一次補走最多 0.5 秒）
if(typeof updateEnemy==='function'&&!updateEnemy._g33){
  const _ue=updateEnemy;
  updateEnemy=function(e,dt,ct){
    try{if(e&&!e.dead)enSpdSync(e);}catch(er){}
    if(!F.enlod||!e||!ct||typeof XW_UE_CORE!=='function')return _ue.apply(this,arguments);
    let far=false;
    try{far=!e.target&&!e.raid&&Math.abs(e.x-ct.x)+Math.abs(e.y-ct.y)>48;}catch(er){}
    if(!far){if(e.lod>0){RF.drop++;RF.dropT+=e.lod;e.lod=0;}return _ue.apply(this,arguments);}
    const pend=(e.lod||0)+dt;
    if(pend<0.5)return _ue.apply(this,arguments);
    let t=e.lod||0;e.lod=0;RF.flush++;
    try{const near={x:e.x,y:e.y};while(t>1e-6&&!e.dead){const s=Math.min(C.lodStep,t);t-=s;e.lod=0;XW_UE_CORE(e,s,near);if(e.target||e.raid)break;}}catch(er){}
    e.lod=0;
    return _ue.apply(this,arguments);   // 本幀 dt 照舊交給外層包裝；核心看到 lod<0.5 會累積
  };
  for(const k of Object.keys(_ue))if(!(k in updateEnemy))updateEnemy[k]=_ue[k];
  updateEnemy._g33=1;
}

// ---- 6. 首領半血狂暴：移速不變（rgspd）。g20 v49BossAI 會在轉狂暴那一幀 speed×1.2，這裡同幀還原。----
if(typeof v49BossAI==='function'&&!v49BossAI._g33){
  const _ai=v49BossAI;
  v49BossAI=function(e,dt){
    const B=e&&e.v49b,was=!!(B&&B.rage),sp=e?e.speed:0;
    const r=_ai.apply(this,arguments);
    try{if(F.rgspd&&e&&!was&&e.v49b&&e.v49b.rage&&typeof sp==='number'&&e.speed!==sp){e.speed=sp;e._rgFix=1;RF.rg=(RF.rg||0)+1;}}catch(er){}
    return r;
  };
  for(const k of Object.keys(_ai))if(!(k in v49BossAI))v49BossAI[k]=_ai[k];
  v49BossAI._g33=1;
}

// ---- 1. 特殊試煉首領名牌：顯示真實層數（spname）。g20 v162See 對高於玩家的境界回傳 ???；特殊試煉首領境界是公開的固定值，不隱藏。----
function spBoss(e){
  try{if(!e||e.kind||!S||!S.dg)return false;
    if(e.type==='xfboss'||e._mapXfBoss||e._mapSpecialBoss)return true;
    return S.dg.boss!=null&&S.dg.boss===e.id&&!!spKind();}catch(er){return false;}
}
if(typeof v162See==='function'&&!v162See._g33){
  const _see=v162See;
  v162See=function(e,p){
    try{if(F.spname&&spKind()&&spBoss(e)){const o=(typeof v51Realm==='function')?v51Realm(e):{r:e.realm|0,s:e.sub|0};return {r:o.r,s:o.s,k:'true'};}}catch(er){}
    return _see.apply(this,arguments);
  };
  for(const k of Object.keys(_see))if(!(k in v162See))v162See[k]=_see[k];
  v162See._g33=1;
}

// integ_1113：渡劫中禁止進副本（旗標 dgtrib，?dgtrib=0 關）
try{if(typeof dgEnter==='function'&&!dgEnter._rfTrib){const _de=dgEnter;dgEnter=function(){
  try{if(F.dgtrib){const p=typeof player==='function'?player():null;if(p&&p.trib2){try{toast('⚡ 渡劫中，天雷未盡，不能進入副本');}catch(e){}RF.tribBlock=(RF.tribBlock|0)+1;return false;}}}catch(e){}
  return _de.apply(this,arguments);};dgEnter._rfTrib=1;}}catch(e){}

const API={F,C,RF,applyXfGate,enSpdSync,xfMobCap,tune:k=>mapSpecialTune(k),rs:k=>mapSpecialBossRS(k),std,
  set(k,v){if(k in F){F[k]=!!v;if(k==='xfbal')applyXfGate();try{if(typeof mapSpecialSyncXfAliases==='function')mapSpecialSyncXfAliases();}catch(e){}}return F;}};
(function reg(){try{if(typeof window==='undefined')return;if(!window.XW||typeof window.XW.newGame!=='function'){setTimeout(reg,200);return;}window.XW.rfix=API;}catch(e){}})();
})();
