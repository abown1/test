// ================== 特殊副本邏輯（config-driven；不改 g*）==================
// 仙凡之門：整本小怪夾在大武師–宗師（含少數宗師後期），只有首領是煉氣二層（realm 4／sub 1）。
// 撤離陣／出口傳送陣沿用 g* 的 D.ent／D.exitP 與 x47DgExitAsk；僅在缺損時補上。
function mapSpecialXfTune(){return mapSpecialTune('xf');}
function mapXfBossDisplayName(){
  const T=mapSpecialTune('xf');
  const lb=mapSpecialRealmLabel(T.bossRealm|0,T.bossSub|0);
  return (T.bossN||'試煉王')+(lb?('・'+lb):'');
}
var MAP_XF_BOSS_N='試煉王';
var MAP_XF_BOSS_REALM=4;
var MAP_XF_BOSS_SUB=1;
var MAP_XF_MINION_REALM=2;
var MAP_XF_DOOR_INSET=2.2;
var MAP_XF_BOSS_SAFE=8;
function mapSpecialSyncXfAliases(){
  try{
    const T=mapSpecialTune('xf');
    MAP_XF_BOSS_N=T.bossN;MAP_XF_BOSS_REALM=T.bossRealm;MAP_XF_BOSS_SUB=T.bossSub;
    MAP_XF_MINION_REALM=T.minionMin;MAP_XF_DOOR_INSET=T.doorInset;MAP_XF_BOSS_SAFE=T.bossSafe;
  }catch(e){}
}
try{mapSpecialSyncXfAliases();}catch(e){}

function mapSpecialRng(){
  try{if(typeof rnd==='function')return rnd();}catch(e){}
  return Math.random();
}
function mapSpecialSubN(realm){
  try{if(typeof v52N==='function')return Math.max(1,v52N(realm|0)|0);}catch(e){}
  return 4;
}
function mapSpecialSubBonus(realm){
  try{
    const lay=(typeof v52Lay==='function')?v52Lay(realm):false;
    if(lay&&typeof TUNE!=='undefined'&&TUNE&&TUNE.v52&&TUNE.v52.layerBonus)return 1+TUNE.v52.layerBonus;
    if(typeof TUNE!=='undefined'&&TUNE&&TUNE.subBonus)return 1+TUNE.subBonus;
  }catch(e){}
  return 1.04;
}
function mapSpecialLiveKind(){
  try{const k=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);if(k)return k;}catch(e){}
  return 'xf';
}
/** Prefer the live dungeon kind; otherwise match e.type against MAP_SPECIAL.boss.type
 *  so 青巖 (king) is not mistaken for the xf default. */
function mapSpecialKindForEnemy(e){
  try{
    const live=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);
    if(live){
      const T=mapSpecialTune(live);
      if(!e||e.type===T.bossType||e.type==='xfboss'||e._mapSpecialBoss||e._mapSpecialDisplay)return live;
    }
  }catch(err){}
  try{
    if(e&&typeof MAP_SPECIAL!=='undefined'&&MAP_SPECIAL){
      for(const k of Object.keys(MAP_SPECIAL)){
        const B=MAP_SPECIAL[k]&&MAP_SPECIAL[k].boss;
        if(B&&B.type&&e.type===B.type)return k;
      }
    }
  }catch(err){}
  if(e&&e.type==='xfboss')return 'xf';
  return null;
}
// 2026-11-10 首領上限：只認「真的特殊首領」——已被 mapSpecialApplyBoss 標記（_mapSpecialBoss），
// 或目前就在該特殊副本且 type 是該副本首領；不再只靠 type 比對（避免一般副本洞窟妖王 king 被標成青巖秘窟首領）
// 2026-11-13：MAP_TUNE.special.bossOnlyDg（預設開；?bossonly=0 回舊行為）只認 S.dg.boss 那一隻。
// S.dg.boss 存的是 id（g13 dgSpawnRoom：D.boss=e.id），不是物件。生成當下 dgMob(...,true) 先打執行期 _mapBoss，
// 因為此時 D.boss 還沒寫入。讀檔後若參照還在，用 id 對回並補標記；參照不見則只靠 _mapBoss／既有 _mapSpecialBoss，不退回同種類。
function mapSpecialBossOnlyOn(){
  try{
    if(mapSpecialBossOnlyOn._q==null){
      mapSpecialBossOnlyOn._q=undefined;
      try{
        if(typeof location!=='undefined'&&location.search){
          const m=/[?&]bossonly=([01]|off|false|on|true)(?:&|$)/i.exec(location.search);
          if(m){
            const v=String(m[1]).toLowerCase();
            mapSpecialBossOnlyOn._q=!(v==='0'||v==='off'||v==='false');
          }
        }
      }catch(e){}
    }
    if(mapSpecialBossOnlyOn._q===true)return true;
    if(mapSpecialBossOnlyOn._q===false)return false;
  }catch(e){}
  try{if(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE.special&&MAP_TUNE.special.bossOnlyDg===false)return false;}catch(e){}
  return true;
}
function mapSpecialBossIdOf(D){
  try{
    if(!D||D.boss==null)return null;
    const b=D.boss;
    if(typeof b==='object')return (b.id!=null)?b.id:b;
    return b;
  }catch(e){return null;}
}
function mapSpecialMatchesDgBoss(e,D){
  try{
    if(!e||!D||D.boss==null)return false;
    if(D.boss===e)return true;
    const id=mapSpecialBossIdOf(D);
    return id!=null&&e.id!=null&&id===e.id;
  }catch(e){return false;}
}
function mapSpecialMarkLiveBoss(e){
  try{if(e)e._mapBoss=1;}catch(err){}
  return e;
}
function mapSpecialRematchDgBoss(D){
  try{
    D=D||((typeof S!=='undefined')?S.dg:null);
    if(!D)return null;
    const ens=(typeof S!=='undefined'&&S&&S.enemies)||[];
    if(D.boss!=null){
      let hit=null;
      for(const e of ens){
        if(!e||e.dead)continue;
        if(mapSpecialMatchesDgBoss(e,D)){
          if(!hit){hit=e;mapSpecialMarkLiveBoss(e);}
        }
      }
      return hit;
    }
    // 讀檔後 S.dg.boss 不見：只認已標記的那一隻，絕不改回「同種類都算首領」
    const marked=ens.filter(e=>e&&!e.dead&&(e._mapBoss||e._mapSpecialBoss));
    if(marked.length===1){mapSpecialMarkLiveBoss(marked[0]);return marked[0];}
    const runtime=ens.filter(e=>e&&!e.dead&&e._mapBoss);
    if(runtime.length===1)return runtime[0];
    return null;
  }catch(e){return null;}
}
function mapSpecialIsDesignatedBoss(e){
  try{
    if(!e||typeof e!=='object')return false;
    if(!mapSpecialBossOnlyOn()){
      const live=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);
      if(!live)return !!(e._mapSpecialBoss||e.type==='xfboss');
      const T=mapSpecialTune(live);
      return !!(e._mapSpecialBoss||e.type===T.bossType||(live==='xf'&&e.type==='xfboss'));
    }
    if(e._mapBoss)return true;
    const D=(typeof S!=='undefined')?S.dg:null;
    if(D&&mapSpecialMatchesDgBoss(e,D)){mapSpecialMarkLiveBoss(e);return true;}
    if(e._mapSpecialBoss){
      // 只有在找不到 S.dg.boss、且現場沒有其他已標記首領時，才用既有標記當退路
      if(D&&D.boss!=null)return false;
      const ens=(typeof S!=='undefined'&&S&&S.enemies)||[];
      const n=ens.filter(x=>x&&!x.dead&&(x._mapBoss||x._mapSpecialBoss)).length;
      return n<=1;
    }
    return false;
  }catch(e){return false;}
}
function mapSpecialBossKind(e){
  try{
    if(!e||typeof e!=='object')return null;
    let live=null;
    try{live=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);}catch(err){}
    if(!mapSpecialBossOnlyOn()){
      if(e._mapSpecialBoss)return e._mapSpecialKind||live||(e.type==='xfboss'?'xf':null);
      if(!live)return null;
      const T=mapSpecialTune(live);
      if(e.type===T.bossType||(live==='xf'&&e.type==='xfboss'))return live;
      return null;
    }
    if(!mapSpecialIsDesignatedBoss(e))return null;
    return e._mapSpecialKind||live||(e.type==='xfboss'?'xf':null);
  }catch(err){return null;}
}
// 首領境界：困難模式比照一般副本（g13 dgTier：困難 +1 境），只用於非仙凡之門（仙凡之門＝特殊試煉，保留原難度）
function mapSpecialBossRS(kind){
  const T=mapSpecialTune(kind);
  let r=T.bossRealm|0;const s=T.bossSub|0;
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(kind!=='xf'&&D&&D.hard&&mapSpecialKindOf(D)===kind){
      const mx=(typeof MAX_REALM==='number')?MAX_REALM:10;
      r=Math.min(mx,r+1);
    }
  }catch(err){}
  return {r,s};
}
function mapSpecialRealmLabel(r,s){
  try{
    if(typeof REALMS!=='undefined'&&REALMS&&REALMS[r]){
      const sn=(typeof v52SubName==='function')?v52SubName(r,s):(r>=4?(s>=9?'大圓滿':(['一','二','三','四','五','六','七','八','九'][s|0]||'一')+'層'):((typeof SUB!=='undefined'&&SUB)?(SUB[s]||''):''));
      return REALMS[r].n+sn;
    }
  }catch(err){}
  return null;
}
function mapSpecialBossDisplayOf(e,kind){
  const k=kind||mapSpecialBossKind(e)||mapSpecialKindForEnemy(e)||'xf';
  const T=mapSpecialTune(k);
  let r=T.bossRealm|0,s=T.bossSub|0;
  try{
    if(e){
      if(e._mapSpecialRS){r=e._mapSpecialRS.r|0;s=e._mapSpecialRS.s|0;}
      else if(e.realm!=null){r=e.realm|0;s=e.sub|0;}
    }
  }catch(err){}
  const lb=mapSpecialRealmLabel(r,s);
  return (T.bossN||'')+(lb?('・'+lb):'');
}
function mapSpecialBindEnemyName(){
  try{
    if(typeof window!=='undefined'&&window.XW)
      window.XW.enemyName=function(e){return enemyName(e);};
  }catch(err){}
}
function mapSpecialPickMinionRS(rng){
  const T=mapSpecialTune(mapSpecialLiveKind());
  const roll=typeof rng==='function'?rng():mapSpecialRng();
  if(roll<T.eliteChance)return {realm:T.eliteRealm|0,sub:T.eliteSub|0,elite:1};
  const rest=1-T.eliteChance;
  const r2=typeof rng==='function'?rng():mapSpecialRng();
  if(r2<0.6){
    const subMax=Math.max(0,Math.min(T.trashSubMax|0,mapSpecialSubN(T.minionMin)-1));
    const sub=Math.floor((typeof rng==='function'?rng():mapSpecialRng())*(subMax+1));
    return {realm:T.minionMin|0,sub:sub,elite:0};
  }
  const subMax=Math.max(0,Math.min(1,mapSpecialSubN(T.minionCap)-1));
  const sub=Math.floor((typeof rng==='function'?rng():mapSpecialRng())*(subMax+1));
  return {realm:T.minionCap|0,sub:sub,elite:0};
}
function mapSpecialTplOn(){
  try{if(MAP_TUNE&&MAP_TUNE.specialTpl&&MAP_TUNE.specialTpl.on===false)return false;}catch(e){}
  return true;
}
function mapSpecialTplCfg(){
  const d={on:true,bossAtk:1.1,mob:1.2};
  try{if(MAP_TUNE&&MAP_TUNE.specialTpl)Object.assign(d,MAP_TUNE.specialTpl);}catch(e){}
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.xfGate){
    const C=TUNE.xfGate;
    if(C.bossAtk!=null)d.bossAtk=+C.bossAtk;
    if(C.mob!=null)d.mob=+C.mob;
  }}catch(e){}
  return d;
}
function mapSpecialLiveKindSafe(){
  try{const k=mapSpecialKindOf(typeof S!=='undefined'?S.dg:null);if(k)return k;}catch(e){}
  return null;
}
function mapSpecialCommitTpl(e,realm,sub,hp,atk,role){
  const fr=(e.maxhp>0&&e.hp!=null)?Math.max(0,Math.min(1,e.hp/e.maxhp)):1;
  e.realm=realm;e.sub=sub;
  e.maxhp=hp;
  e.hp=(e.hp==null||fr>=0.999)?hp:Math.max(1,Math.min(hp,Math.round(hp*fr)));
  e.atk=atk;
  e._mapSpTpl={r:realm,s:sub,role:role||'mob',hp:hp,atk:atk};
  try{
    if(typeof TUNE!=='undefined'&&TUNE&&TUNE.rb){
      e._rb=Object.assign(e._rb||{},{v:TUNE.rb.V,r:realm,s:sub,f:1,full:1,tier:1,hn:hp,an:atk,hv:hp,av:atk});
    }
  }catch(err){}
  e.v51k=null;
  try{e.v51r={r:realm,s:sub};e.v51k='R|'+realm+'|'+sub+'|'+(e.v49lq?1:0)+'|mapsp';}catch(err){}
  return e;
}
function mapSpecialOldScaleStats(e,realm,sub){
  const type=e.type;
  let baseHp=40,baseAtk=4;
  try{
    const D=(typeof ENEMY!=='undefined'&&ENEMY&&ENEMY[type])||null;
    if(D){if(D.hp!=null)baseHp=D.hp;if(D.atk!=null)baseAtk=D.atk;}
  }catch(err){}
  let hp=baseHp,atk=baseAtk;
  try{
    if(typeof xnScaleStat==='function'){
      hp=xnScaleStat(baseHp,realm,'hp');
      atk=xnScaleStat(baseAtk,realm,'atk');
    }
  }catch(err){}
  const sb=mapSpecialSubBonus(realm);
  const mul=Math.pow(sb,Math.max(0,sub));
  hp=Math.max(1,Math.round(hp*mul));
  atk=+(Math.max(0.1,atk*mul)).toFixed(1);
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    const T=mapSpecialTune((D&&D.kind)||'xf');
    const n=Math.min(Math.max(1,(D&&D.party)|0),T.partyFair||8);
    if(n>1&&T.partyHpPer){
      const k=1+T.partyHpPer*(n-1);
      hp=Math.max(1,Math.round(hp*k));
      atk=+(atk*k).toFixed(1);
    }
  }catch(err){}
  return {hp:hp,atk:atk};
}
function mapSpecialTplStats(e,realm,sub,role){
  if(!mapSpecialTplOn()||typeof rbStd!=='function')return mapSpecialOldScaleStats(e,realm,sub);
  const Tpl=rbStd(realm,sub,1,null);
  if(!(Tpl&&Tpl.hp>0&&Tpl.atk>0))return mapSpecialOldScaleStats(e,realm,sub);
  const kind=mapSpecialLiveKindSafe();
  const isXf=kind==='xf';
  const C=mapSpecialTplCfg();
  let hpMul=1,atkMul=1,pf=1;
  if(isXf){
    if(role==='boss'){atkMul=C.bossAtk!=null?+C.bossAtk:1.1;hpMul=1;}
    else{hpMul=atkMul=C.mob!=null?+C.mob:1.2;}
    try{
      const n=Math.max(1,(typeof S!=='undefined'&&S&&S.dg&&S.dg.party)|0);
      pf=role==='boss'?(1+0.4*(n-1)):(1+0.2*(n-1));
    }catch(err){}
  }else{
    try{
      const D=typeof S!=='undefined'?S.dg:null;
      const Tn=mapSpecialTune((D&&D.kind)||kind||'xf');
      const n=Math.min(Math.max(1,(D&&D.party)|0),Tn.partyFair||8);
      if(n>1&&Tn.partyHpPer)pf=1+Tn.partyHpPer*(n-1);
    }catch(err){}
  }
  const hp=Math.max(1,Math.round(Tpl.hp*hpMul*pf));
  const atk=+Math.max(0.1,Math.round(Tpl.atk*atkMul*10)/10).toFixed(1);
  return {hp:hp,atk:atk};
}
function mapSpecialApplyRealmStats(e,realm,sub){
  if(!e)return e;
  realm=realm|0;sub=sub|0;
  if(e._mapSpTpl&&e._mapSpTpl.role==='mob'&&e._mapSpTpl.r===realm&&e._mapSpTpl.s===sub){
    e.realm=realm;e.sub=sub;
    return e;
  }
  const st=mapSpecialTplStats(e,realm,sub,'mob');
  try{delete e.v49lq;}catch(err){e.v49lq=0;}
  mapSpecialCommitTpl(e,realm,sub,st.hp,st.atk,'mob');
  return e;
}
function mapSpecialApplyBoss(e){
  try{
    if(!e)return e;
    const kind=mapSpecialBossKind(e);
    if(!kind)return e;
    const T=mapSpecialTune(kind);
    if(!mapSpecialBossOnlyOn()){
      if(!e._mapSpecialBoss&&e.type!==T.bossType&&!(kind==='xf'&&e.type==='xfboss'))return e;
    }else{
      if(!mapSpecialIsDesignatedBoss(e))return e;
      mapSpecialMarkLiveBoss(e);
    }
    const rs=e._mapSpecialRS||mapSpecialBossRS(kind);
    e.realm=rs.r;
    e.sub=rs.s;
    e._mapSpecialRS={r:rs.r,s:rs.s};e._mapSpecialKind=kind;
    e.v49lq=1;
    try{e.dgName=null;}catch(err){}
    try{e._mapSpecialDisplay=mapSpecialBossDisplayOf(e,kind);}catch(err){e._mapSpecialDisplay=(T.bossN||'')+'・'+(mapSpecialRealmLabel(rs.r,rs.s)||'');}
    e._mapXfBoss=1;e._mapSpecialBoss=1;
    if(!(e._mapSpTpl&&e._mapSpTpl.role==='boss'&&e._mapSpTpl.r===rs.r&&e._mapSpTpl.s===rs.s)){
      const st=mapSpecialTplStats(e,rs.r,rs.s,'boss');
      mapSpecialCommitTpl(e,rs.r,rs.s,st.hp,st.atk,'boss');
    }else{
      try{e.v51r={r:rs.r,s:rs.s};e.v51k='R|'+rs.r+'|'+rs.s+'|1|mapsp';}catch(err){}
    }
    // 單人首領上限（同境標準×1.2，相對首領自己的境界）；仙凡之門由 g25 bossCapExempt 跳過
    try{if(typeof mapBossCapClamp==='function')mapBossCapClamp(e);}catch(err){}
    return e;
  }catch(err){return e;}
}
function mapSpecialMinionLeqBossOn(){
  try{if(typeof mapSpecialMinionLeqBossOn._q==='boolean')return mapSpecialMinionLeqBossOn._q;}catch(e){}
  try{
    const loc=(typeof location!=='undefined'&&location)||(typeof window!=='undefined'&&window.location)||null;
    const q=loc&&loc.search;
    if(q){
      const m=/[?&]minionleqboss=([01]|off|false|on|true)(?:&|$)/i.exec(String(q));
      if(m){
        const v=String(m[1]).toLowerCase();
        if(v==='0'||v==='off'||v==='false')return false;
        if(v==='1'||v==='on'||v==='true')return true;
      }
    }
  }catch(e){}
  try{if(MAP_TUNE&&MAP_TUNE.minionLeqBoss&&MAP_TUNE.minionLeqBoss.on===false)return false;}catch(e){}
  return true;
}
function mapSpecialInBossRoom(x,y,D){
  try{
    D=D||((typeof S!=='undefined')?S.dg:null);
    if(!D||!D.L||!D.L.rooms||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const rooms=D.L.rooms;
    const br=rooms.find(function(r){return r&&r.boss;})||rooms[rooms.length-1];
    if(!br)return false;
    const x0=br.x0,y0=br.y0,w=br.w,h=br.h;
    if(Number.isFinite(x0)&&Number.isFinite(y0)&&Number.isFinite(w)&&Number.isFinite(h))
      return x>=x0-0.2&&x<=x0+w+0.2&&y>=y0-0.2&&y<=y0+h+0.2;
    if(br.cx!=null&&br.cy!=null){
      const hw=Math.max(4,(br.w||16)/2),hh=Math.max(4,(br.h||16)/2);
      return Math.abs(x-br.cx)<=hw+0.2&&Math.abs(y-br.cy)<=hh+0.2;
    }
  }catch(e){}
  return false;
}
function mapSpecialLiveBossRS(D){
  try{
    D=D||((typeof S!=='undefined')?S.dg:null);
    if(!D)return null;
    let e=null;
    try{if(D.boss!=null&&typeof enemyById==='function')e=enemyById(D.boss);}catch(err){}
    if(!e){
      try{
        const ens=(typeof S!=='undefined'&&S&&S.enemies)||[];
        for(let i=0;i<ens.length;i++){
          const x=ens[i];
          if(!x||x.dead)continue;
          if(D.boss!=null&&x.id===D.boss){e=x;break;}
        }
        if(!e){
          for(let i=0;i<ens.length;i++){
            const x=ens[i];
            if(!x||x.dead)continue;
            if(x._mapSpecialBoss||x._mapBoss){e=x;break;}
          }
        }
      }catch(err){}
    }
    if(e&&e.realm!=null)return {r:e.realm|0,s:(e.sub|0)};
  }catch(e){}
  return null;
}
function mapSpecialClampRsToBoss(realm,sub,boss){
  realm=realm|0;sub=sub|0;
  if(!boss||boss.r==null)return {realm:realm,sub:sub};
  const br=boss.r|0,bs=boss.s|0;
  if(realm<br)return {realm:realm,sub:sub};
  if(realm>br)return {realm:br,sub:bs};
  return {realm:br,sub:Math.min(sub,bs)};
}
function mapSpecialClampMinion(e,x,y){
  if(!e)return e;
  const D=(typeof S!=='undefined')?S.dg:null;
  const kind=mapSpecialKindOf(D);
  if(!kind)return e;
  const T=mapSpecialTune(kind);
  try{
    if(mapSpecialBossOnlyOn()){
      if(mapSpecialIsDesignatedBoss(e))return mapSpecialApplyBoss(e);
    }else if(e.type===T.bossType||e.type==='xfboss'||e._mapSpecialBoss)return mapSpecialApplyBoss(e);
  }catch(err){}
  const pick=mapSpecialPickMinionRS();
  let realm=pick.realm|0, sub=pick.sub|0;
  if(realm>T.minionCap){realm=T.minionCap;sub=Math.min(sub,T.eliteSub|0);}
  if(realm<T.minionMin)realm=T.minionMin;
  if((e.realm|0)>T.minionCap||(e.realm|0)>=T.bossRealm){realm=pick.realm;sub=pick.sub;}
  try{
    if(mapSpecialMinionLeqBossOn()){
      const px=Number.isFinite(x)?x:(e.x);
      const py=Number.isFinite(y)?y:(e.y);
      if(mapSpecialInBossRoom(px,py,D)){
        let boss=mapSpecialLiveBossRS(D);
        if(!boss){
          try{boss=mapSpecialBossRS(kind);}catch(err){boss=null;}
        }
        const c=mapSpecialClampRsToBoss(realm,sub,boss);
        realm=c.realm;sub=c.sub;
      }
    }
  }catch(err){}
  mapSpecialApplyRealmStats(e,realm,sub);
  e._mapXfMinion=1;e._mapSpecialMinion=1;
  return e;
}
function mapXfClampMinion(e,x,y){return mapSpecialClampMinion(e,x,y);}
function mapXfApplyBossIdentity(e){return mapSpecialApplyBoss(e);}

function mapSpecialNN(){try{if(typeof N==='number'&&N>0)return N;}catch(e){}return 128;}
function mapSpecialFlAt(i,j,D){
  const NN=mapSpecialNN(),k=j*NN+i;
  try{
    if(D&&D.lock&&D.lock.sv){
      for(const rec of D.lock.sv){if(rec&&rec[0]===k)return rec[1];}
    }
  }catch(e){}
  try{if(D&&D.L&&D.L.fl)return D.L.fl[k];}catch(e){}
  try{if(typeof block!=='undefined'&&block)return block[k]?0:1;}catch(e){}
  return 0;
}
function mapSpecialTileWalkNow(x,y){
  try{if(typeof blockedP==='function')return !blockedP(x,y);}catch(e){}
  try{
    const NN=mapSpecialNN(),i=x|0,j=y|0;
    if(typeof block!=='undefined'&&block)return !block[j*NN+i];
  }catch(e){}
  return true;
}
function mapSpecialDoorwayFromPrev(r,D){
  const rooms=D&&D.L&&D.L.rooms;
  if(!rooms||!rooms.length)return null;
  let prev=null;
  if(r.k!=null)prev=rooms.find(o=>o&&o.k===(r.k-1));
  if(!prev)prev=rooms.filter(o=>o&&o!==r)[rooms.filter(o=>o&&o!==r).length-1];
  if(!prev)return null;
  const tx=Math.floor(r.cx),ty=Math.floor(r.cy);
  const px=Math.floor(prev.cx),py=Math.floor(prev.cy);
  let i,j,ni,nj,dx,dy;
  if(px<r.x0){i=r.x0;j=Math.max(r.y0,Math.min(r.y0+r.h-1,ty));dx=-1;dy=0;ni=i-1;nj=j;}
  else if(px>=r.x0+r.w){i=r.x0+r.w-1;j=Math.max(r.y0,Math.min(r.y0+r.h-1,ty));dx=1;dy=0;ni=i+1;nj=j;}
  else if(py<r.y0){j=r.y0;i=Math.max(r.x0,Math.min(r.x0+r.w-1,tx));dx=0;dy=-1;ni=i;nj=j-1;}
  else if(py>=r.y0+r.h){j=r.y0+r.h-1;i=Math.max(r.x0,Math.min(r.x0+r.w-1,tx));dx=0;dy=1;ni=i;nj=j+1;}
  else {j=r.y0;i=Math.max(r.x0,Math.min(r.x0+r.w-1,tx));dx=0;dy=-1;ni=i;nj=j-1;}
  return {i,j,ni,nj,dx,dy};
}
function mapSpecialDoorway(r,D){
  if(!r)return null;
  D=D||((typeof S!=='undefined')?S.dg:null);
  const opens=[];
  const dirs=[[0,-1],[0,1],[-1,0],[1,0]];
  try{
    for(let j=r.y0;j<r.y0+r.h;j++){
      for(let i=r.x0;i<r.x0+r.w;i++){
        const onRing=(i===r.x0||i===r.x0+r.w-1||j===r.y0||j===r.y0+r.h-1);
        if(!onRing)continue;
        const inside=mapSpecialFlAt(i,j,D);
        if(inside!==1&&inside!==0)continue;
        if(D&&D.L&&D.L.fl&&inside!==1)continue;
        for(const [dx,dy] of dirs){
          const ni=i+dx,nj=j+dy;
          if(ni>=r.x0&&ni<r.x0+r.w&&nj>=r.y0&&nj<r.y0+r.h)continue;
          if(mapSpecialFlAt(ni,nj,D)===1)opens.push({i,j,ni,nj,dx,dy});
        }
      }
    }
  }catch(e){}
  if(!opens.length){
    const fb=mapSpecialDoorwayFromPrev(r,D);
    if(fb){
      const w=3;
      for(let s=-1;s<=1;s++){
        const i=fb.i+(fb.dy?s:0),j=fb.j+(fb.dx?s:0);
        if(i<r.x0||i>=r.x0+r.w||j<r.y0||j>=r.y0+r.h)continue;
        opens.push({i,j,ni:fb.ni+(fb.dy?s:0),nj:fb.nj+(fb.dx?s:0),dx:fb.dx,dy:fb.dy});
      }
    }
  }
  if(!opens.length){
    const T=mapSpecialTune((D&&D.kind)||'xf');
    const x=(r.cx!=null)?r.cx:(r.x0+(r.w||0)/2);
    const y=(r.y0!=null)?(r.y0+(T.doorInset!=null?T.doorInset:0.5)):r.cy;
    return {x,y,opens:[],side:'fallback'};
  }
  let sx=0,sy=0;
  for(const o of opens){sx+=o.i+0.5;sy+=o.j+0.5;}
  return {x:sx/opens.length,y:sy/opens.length,opens,side:'gap'};
}
function mapXfBossDoorPos(r){
  const d=mapSpecialDoorway(r);
  return d?{x:d.x,y:d.y}:null;
}
function mapSpecialNearestWalkable(x,y,r){
  if(mapSpecialTileWalkNow(x,y))return {x:x,y:y};
  let f=null;
  try{if(typeof nearestFree==='function')f=nearestFree(x,y,-1);}catch(e){}
  if(f&&Number.isFinite(f.i)&&Number.isFinite(f.j)){
    if(!r||(f.i>=r.x0-1&&f.i<=r.x0+r.w&&f.j>=r.y0-1&&f.j<=r.y0+r.h))return {x:f.i+0.5,y:f.j+0.5};
  }
  for(let rad=1;rad<=6;rad++){
    for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){
      const tx=x+dx,ty=y+dy;
      if(r&&(tx<r.x0-0.5||tx>r.x0+r.w+0.5||ty<r.y0-0.5||ty>r.y0+r.h+0.5))continue;
      if(mapSpecialTileWalkNow(tx,ty))return {x:tx,y:ty};
    }
  }
  return {x:x,y:y};
}
function mapXfNearestWalkable(x,y,r){return mapSpecialNearestWalkable(x,y,r);}
function mapXfPlaceAtDoor(r){
  if(!r)return null;
  const T=mapSpecialTune((typeof S!=='undefined'&&S&&S.dg&&S.dg.kind)||'xf');
  const info=mapSpecialDoorway(r);
  if(!info)return null;
  const door={x:info.x,y:info.y};
  const D=(typeof S!=='undefined')?S.dg:null;
  if(D){D.bossDoor={x:door.x,y:door.y};D._mapXfDoor=1;D._mapSpecialDoor=1;}
  const spots=[];
  const seen={};
  const addSpot=(x,y)=>{
    const k=(x|0)+','+(y|0);if(seen[k])return;seen[k]=1;spots.push({x,y});
  };
  for(const o of (info.opens||[])){
    addSpot(o.i+0.5,o.j+0.5);
    const cx=o.ni+0.5,cy=o.nj+0.5;
    if(mapSpecialTileWalkNow(cx,cy))addSpot(cx,cy);
  }
  if(!spots.length)addSpot(door.x,door.y);
  const us=(typeof S!=='undefined'&&S.units)?S.units.filter(u=>u&&!u.dead):[];
  const boss={x:r.cx,y:r.cy};
  us.forEach((u,k)=>{
    const s=spots[k%spots.length];
    const extra=(k/spots.length)|0;
    const ox=((k%2)?0.35:-0.35)*extra;
    const oy=((k%3)?0.2:-0.2)*extra;
    let tx=s.x+ox,ty=s.y+oy;
    const d=Math.hypot(tx-boss.x,ty-boss.y);
    if(d<T.bossSafe){
      const ux=(door.x-boss.x)||0,uy=(door.y-boss.y)||-1;
      const ul=Math.hypot(ux,uy)||1;
      tx=door.x+ux/ul*0.15;ty=door.y+uy/ul*0.15;
    }
    const w=mapSpecialNearestWalkable(tx,ty,r);
    u.x=w.x;u.y=w.y;u.path=[];u.vx=u.vy=0;
    u.face=(boss.x>=u.x)?1:-1;u.faceT=u.face;
    if(u.task&&u.task.type==='move')u.task=null;
    try{if(typeof fx==='function')fx('ring',u.x,u.y,'#ffd34d');}catch(e){}
    try{
      if(typeof player==='function'&&u===player()&&typeof iso==='function'&&typeof cam!=='undefined'&&cam){
        const q=iso(u.x,u.y);cam.x=q.x;cam.y=q.y;cam.follow=true;
      }
    }catch(e){}
  });
  return door;
}
function mapSpecialPlaceAtDoor(r){return mapXfPlaceAtDoor(r);}
function mapSpecialGateLabel(open,kind){
  const T=mapSpecialTune(kind||'xf');
  if(open)return T.gateOpen||T.gateN||'試煉門';
  return T.gateShut||((T.gateN||'試煉門')+'（未開）');
}
function mapSpecialEnemyInRoom(e,rr){
  if(!e||!rr)return false;
  const hx=(e.home&&Number.isFinite(e.home.x))?e.home.x:e.x;
  const hy=(e.home&&Number.isFinite(e.home.y))?e.home.y:e.y;
  const xs=[e.x,hx],ys=[e.y,hy];
  for(let i=0;i<xs.length;i++){
    const x=xs[i],y=ys[i];
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    if(x>=rr.x0-0.2&&x<=rr.x0+rr.w+0.2&&y>=rr.y0-0.2&&y<=rr.y0+rr.h+0.2)return true;
    try{if(typeof dgRoomOf==='function'&&dgRoomOf(x,y)===rr)return true;}catch(err){}
  }
  return false;
}
function mapSpecialEnemyStuck(e){
  if(!e)return true;
  if(!Number.isFinite(e.x)||!Number.isFinite(e.y))return true;
  try{if(typeof blockedP==='function'&&blockedP(e.x,e.y))return true;}catch(err){}
  try{
    const NN=mapSpecialNN(),i=e.x|0,j=e.y|0;
    if(typeof block!=='undefined'&&block&&block[j*NN+i])return true;
  }catch(err){}
  return false;
}
function mapSpecialEnemyLive(e){
  if(!e||e.dead||!(e.hp>0))return false;
  if(mapSpecialEnemyStuck(e))return false;
  return true;
}
function mapSpecialRoomProgress(timeout){
  try{
    const D=(typeof S!=='undefined')?S.dg:null;
    if(!D||!mapSpecialDef(D.kind)||!D.L||!D.L.rooms)return 0;
    const wait=(timeout!=null)?timeout:2.4;
    const now=(D.t!=null)?D.t:((S&&S.time)||0);
    let n=0;
    for(const rr of D.L.rooms){
      if(!rr||rr.state==='clear'||rr.boss)continue;
      if(rr.state!=='fight')continue;
      const queued=(D.queue||[]).some(q=>q&&q.r===rr);
      const mine=(S.enemies||[]).filter(e=>mapSpecialEnemyInRoom(e,rr)&&e&&!e.dead&&(e.hp>0));
      const live=mine.filter(mapSpecialEnemyLive);
      if(!queued&&live.length===0){
        if(!mine.length){
          rr.state='clear';n++;
          try{if(!rr.boss&&typeof floater==='function')floater(rr.cx,rr.cy,'清除！','#9fe8b0');}catch(e){}
          continue;
        }
        if(rr._mapStuckT==null)rr._mapStuckT=now;
        if(now-rr._mapStuckT>=wait){
          rr.state='clear';n++;
          try{if(!rr.boss&&typeof floater==='function')floater(rr.cx,rr.cy,'清除！','#9fe8b0');}catch(e){}
        }
      }else{
        rr._mapStuckT=null;
      }
    }
    return n;
  }catch(e){return 0;}
}
function mapSpecialHook(phase,payload){
  payload=payload||{};
  try{mapSpecialInstall();}catch(e){}
  try{
    if(phase==='enter'){
      const D=payload.D||((typeof S!=='undefined')?S.dg:null);
      if(D)mapSpecialEnsureEvac(D);
    }
    if(phase==='place'||phase==='lock'||phase==='bossDoor'){
      const r=payload.r||payload.room;
      if(r)mapXfPlaceAtDoor(r);
    }
  }catch(e){}
  return true;
}
function mapSpecialOnEnter(payload){return mapSpecialHook('enter',payload);}
function mapSpecialPrepare(payload){try{mapSpecialInstall();}catch(e){}return true;}

function mapSpecialEnsureEvac(D){
  if(!D||!mapSpecialDef(D.kind))return D;
  try{
    if(!D.ent||D.ent.x==null||D.ent.y==null){
      const st=D.L&&D.L.rooms&&D.L.rooms[0];
      if(st){
        const x=st.cx,y=(st.cy!=null?st.cy-1.4:st.y0+1);
        D.ent={x:x,y:y};
      }
    }
    if(D.ent&&typeof nearestFree==='function'){
      const f=nearestFree(D.ent.x,D.ent.y,-1);
      if(f){
        const r0=D.L&&D.L.rooms&&D.L.rooms[0];
        if(!r0||(f.i>=r0.x0&&f.i<r0.x0+r0.w&&f.j>=r0.y0&&f.j<r0.y0+r0.h))
          D.ent={x:f.i+0.5,y:f.j+0.5};
      }
    }
  }catch(e){}
  return D;
}
function mapSpecialEnsureExit(D){
  if(!D||!mapSpecialDef(D.kind))return D;
  try{
    if(D.cleared&&!D.exitP){
      const rooms=D.L&&D.L.rooms;const br=rooms&&rooms[rooms.length-1];
      if(br){
        let x=br.cx,y=br.cy;
        try{
          const f=typeof nearestFree==='function'?nearestFree(br.cx,br.cy,-1):null;
          if(f&&f.i>=br.x0&&f.i<br.x0+br.w&&f.j>=br.y0&&f.j<br.y0+br.h){x=f.i+0.5;y=f.j+0.5;}
        }catch(err){}
        D.exitP={x:x,y:y};D.xpAsk=0;D.exitOpen=true;
      }
    }
  }catch(e){}
  return D;
}
function mapSpecialDrawDoors(){
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(!D||!mapSpecialDef(D.kind))return;
    const T=mapSpecialTune(D.kind);
    if(!T.visibleDoor)return;
    if(!D.bossDoor){
      const rooms=D.L&&D.L.rooms;const br=rooms&&rooms[rooms.length-1];
      if(br&&br.boss)D.bossDoor=mapXfBossDoorPos(br);
    }
    if(D.bossDoor&&typeof xgateDrawPortal==='function'){
      const locked=!!D.lock;
      xgateDrawPortal(D.bossDoor.x,D.bossDoor.y,locked?'boss':'ent',locked?'首領殿門（已封）':'首領殿門');
    }
  }catch(e){}
}
function mapSpecialTrimQueue(r){
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(!D||!mapSpecialDef(D.kind)||!D.queue)return;
    const T=mapSpecialTune(D.kind);
    const n=Math.min(Math.max(1,D.party|0),T.partyFair||8);
    let cap=r&&r.boss?T.bossAdds:T.packMax;
    cap=Math.max(T.packMin,Math.min(cap,T.packMax+(n>1?Math.min(2,n-1):0)));
    if(r&&r.boss)cap=Math.min(T.bossAdds+(n>1?1:0),8);
    while(D.queue.length>cap)D.queue.pop();
  }catch(e){}
}
function mapSpecialDemoteFalseBoss(e){
  try{
    if(!e)return e;
    e._mapSpecialBoss=0;e._mapXfBoss=0;e._mapBoss=0;
    e._mapSpecialDisplay=null;e._mapSpecialRS=null;e._mapSpecialKind=null;
    try{if(e._mapSpTpl&&e._mapSpTpl.role==='boss')e._mapSpTpl=null;}catch(err){}
  }catch(err){}
  return e;
}
function mapSpecialEnforceLive(){
  try{
    const D=typeof S!=='undefined'?S.dg:null;
    if(!D||!mapSpecialDef(D.kind)||!S.enemies)return;
    const T=mapSpecialTune(D.kind);
    const only=mapSpecialBossOnlyOn();
    if(only)try{mapSpecialRematchDgBoss(D);}catch(err){}
    for(const e of S.enemies){
      if(!e||e.dead)continue;
      if(only){
        if(mapSpecialIsDesignatedBoss(e)){
          mapSpecialApplyBoss(e);
          continue;
        }
        if(e._mapSpecialBoss||e._mapXfBoss||e._mapBoss){
          mapSpecialDemoteFalseBoss(e);
          mapSpecialClampMinion(e);
          continue;
        }
        if(e.type===T.bossType||e.type==='xfboss'){
          mapSpecialClampMinion(e);
          continue;
        }
      }else if(e.type===T.bossType||e.type==='xfboss'){
        mapSpecialApplyBoss(e);
        continue;
      }
      if((e.realm|0)>T.minionCap||e.v49lq)mapSpecialClampMinion(e);
      else if(e._mapSpecialMinion&&mapSpecialTplOn()&&!(e._mapSpTpl&&e._mapSpTpl.r===(e.realm|0)&&e._mapSpTpl.s===(e.sub|0)))mapSpecialApplyRealmStats(e,e.realm,e.sub);
    }
    mapSpecialEnsureExit(D);
  }catch(e){}
}

function mapSpecialInstall(){
  if(mapSpecialInstall._ok){mapSpecialBindEnemyName();return true;}
  try{mapSpecialSyncXfAliases();}catch(e){}
  let n=0;
  try{
    if(typeof DGS!=='undefined'&&DGS&&DGS.xf){
      const T=mapSpecialTune('xf');
      DGS.xf.bossN=T.bossN;n++;
    }
    if(typeof DGS!=='undefined'&&DGS&&DGS.dg_qingyan){
      const Tq=mapSpecialTune('dg_qingyan');
      DGS.dg_qingyan.bossN=Tq.bossN;n++;
    }
  }catch(e){}
  try{
    if(typeof enemyName==='function'&&!enemyName._mapSpecial){
      const _en=enemyName;
      enemyName=function(e){
        try{
          const kind=mapSpecialBossKind(e);
          if(kind){
            if(e._mapSpecialDisplay)return e._mapSpecialDisplay;
            const T=mapSpecialTune(kind);
            const dn=mapSpecialBossDisplayOf(e,kind);
            if(dn)return dn;
            if(kind==='xf')return mapXfBossDisplayName();
            return T.bossN||_en.apply(this,arguments);
          }
        }catch(err){}
        return _en.apply(this,arguments);
      };
      enemyName._mapSpecial=1;n++;
      mapSpecialBindEnemyName();
    }
  }catch(e){}
  try{
    if(typeof v51Realm==='function'&&!v51Realm._mapSpecial){
      const _vr=v51Realm;
      v51Realm=function(e){
        try{
          const bk=mapSpecialBossKind(e);
          if(bk){
            const rs=e._mapSpecialRS||mapSpecialBossRS(bk);
            const o={r:rs.r,s:rs.s};
            e.v51r=o;e.v51k=(e.maxhp+'|'+e.atk+'|'+e.realm+'|1|mapsp');
            return o;
          }
          if(e&&e._mapSpecialMinion){
            const o={r:e.realm|0,s:e.sub|0};
            e.v51r=o;e.v51k=(e.maxhp+'|'+e.atk+'|'+e.realm+'|0|mapsp');
            return o;
          }
        }catch(err){}
        return _vr.apply(this,arguments);
      };
      v51Realm._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof v51RName==='function'&&!v51RName._mapSpecial){
      const _rn=v51RName;
      v51RName=function(e){
        try{
          const kind=mapSpecialBossKind(e);
          if(kind){
            const dn=e._mapSpecialDisplay||mapSpecialBossDisplayOf(e,kind);
            if(dn){
              const i=String(dn).indexOf('・');
              if(i>=0)return String(dn).slice(i+1);
            }
            const rs2=(e&&e._mapSpecialRS)||mapSpecialBossRS(kind);
            const lb=mapSpecialRealmLabel(rs2.r,rs2.s);
            if(lb)return lb;

          }
        }catch(err){}
        return _rn.apply(this,arguments);
      };
      v51RName._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgMob==='function'&&!dgMob._mapSpecial){
      const _m=dgMob;
      dgMob=function(t,x,y,boss){
        const e=_m.apply(this,arguments);
        try{
          const D=typeof S!=='undefined'?S.dg:null;
          if(e&&D&&mapSpecialDef(D.kind)){
            if(boss){try{e._mapBoss=1;}catch(err){}mapSpecialApplyBoss(e);}
            else if(!mapSpecialBossOnlyOn()&&e.type==='xfboss')mapSpecialApplyBoss(e);
            else mapSpecialClampMinion(e,x,y);
          }
        }catch(err){}
        return e;
      };
      dgMob._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof v156Lock==='function'&&!v156Lock._mapSpecial){
      const _lk=v156Lock;
      v156Lock=function(r){
        const ret=_lk.apply(this,arguments);
        try{if(r&&r.boss)mapXfPlaceAtDoor(r);}catch(err){}
        return ret;
      };
      v156Lock._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof label==='function'&&!label._mapSpecialGate){
      const _lb=label;
      label=function(txt,x,y,c,f){
        try{
          if(typeof txt==='string'&&/首領傳送門/.test(txt)){
            const D=(typeof S!=='undefined')?S.dg:null;
            if(D&&mapSpecialDef(D.kind)){
              txt=mapSpecialGateLabel(!/未開/.test(txt),D.kind);
              arguments[0]=txt;
            }
          }
        }catch(err){}
        return _lb.call(this,txt,x,y,c,f);
      };
      label._mapSpecialGate=1;n++;
    }
  }catch(e){}
  try{
    if(typeof xgateDrawBossGate==='function'&&!xgateDrawBossGate._mapSpecial){
      const _bg=xgateDrawBossGate;
      xgateDrawBossGate=function(D){
        const r=_bg.apply(this,arguments);
        try{
          if(D&&mapSpecialDef(D.kind)&&typeof netGatePt==='function'){
            const G=netGatePt(D);if(G&&typeof P==='function'&&typeof label==='function'){
              const open=typeof netGateOpen==='function'&&netGateOpen(D);
              const c=P(G.x,G.y);
              label(mapSpecialGateLabel(open,D.kind),c.x,c.y-48,open?'#ffe27a':'#c0c0d0','bold 10px sans-serif');
            }
          }
        }catch(err){}
        return r;
      };
      xgateDrawBossGate._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof netGateUI==='function'&&!netGateUI._mapSpecial){
      const _ui=netGateUI;
      netGateUI=function(){
        const r=_ui.apply(this,arguments);
        try{
          const D=(typeof S!=='undefined')?S.dg:null;
          const el=typeof document!=='undefined'&&document.getElementById('netbgate');
          const b=el&&el.firstChild;
          if(b&&D&&mapSpecialDef(D.kind)){
            const open=typeof netGateOpen==='function'&&netGateOpen(D);
            const t=open?('⛩ '+mapSpecialGateLabel(true,D.kind)+'：傳送到首領房'):('🔒 '+mapSpecialGateLabel(false,D.kind));
            if(b.textContent!==t)b.textContent=t;
          }
        }catch(err){}
        return r;
      };
      netGateUI._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgSpawnRoom==='function'&&!dgSpawnRoom._mapSpecial){
      const _sp=dgSpawnRoom;
      dgSpawnRoom=function(r){
        const ret=_sp.apply(this,arguments);
        try{mapSpecialTrimQueue(r);}catch(err){}
        return ret;
      };
      dgSpawnRoom._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgEnter==='function'&&!dgEnter._mapSpecial){
      const _de=dgEnter;
      dgEnter=function(){
        const r=_de.apply(this,arguments);
        try{if(r&&S&&S.dg)mapSpecialEnsureEvac(S.dg);}catch(err){}
        return r;
      };
      dgEnter._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgBossDown==='function'&&!dgBossDown._mapSpecial){
      const _bd=dgBossDown;
      dgBossDown=function(){
        const r=_bd.apply(this,arguments);
        try{if(S&&S.dg)mapSpecialEnsureExit(S.dg);}catch(err){}
        return r;
      };
      dgBossDown._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof drawDungeon==='function'&&!drawDungeon._mapSpecial){
      const _dd=drawDungeon;
      drawDungeon=function(){
        const r=_dd.apply(this,arguments);
        try{mapSpecialDrawDoors();}catch(err){}
        return r;
      };
      drawDungeon._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof update==='function'&&!update._mapSpecial){
      const _u=update;
      update=function(){
        const r=_u.apply(this,arguments);
        try{mapSpecialEnforceLive();}catch(err){}
        try{mapSpecialRoomProgress();}catch(err){}
        return r;
      };
      update._mapSpecial=1;n++;
    }
  }catch(e){}
  try{
    if(typeof rbEnFull==='function'&&!rbEnFull._mapSpecialTpl){
      const _rf=rbEnFull;
      rbEnFull=function(o){
        try{
          if(o&&o._mapSpTpl&&mapSpecialTplOn()&&o._mapSpTpl.r===(o.realm|0)&&o._mapSpTpl.s===(o.sub|0))return false;
        }catch(err){}
        return _rf.apply(this,arguments);
      };
      rbEnFull._mapSpecialTpl=1;n++;
    }
  }catch(e){}
  const ready=(typeof dgMob==='function'&&!!dgMob._mapSpecial&&(typeof label!=='function'||!!label._mapSpecialGate)&&(typeof xgateDrawBossGate!=='function'||!!xgateDrawBossGate._mapSpecial));
  if(ready){
    mapSpecialInstall._ok=true;
    mapSpecialBindEnemyName();
    try{
      if(typeof window!=='undefined'){
        window.XWMAP_XF={
          install:mapSpecialInstall,doorPos:mapXfBossDoorPos,place:mapXfPlaceAtDoor,
          name:mapXfBossDisplayName,bossN:MAP_XF_BOSS_N,
          realm:MAP_XF_BOSS_REALM,sub:MAP_XF_BOSS_SUB,minionRealm:MAP_XF_MINION_REALM,
          hook:mapSpecialHook,gateLabel:mapSpecialGateLabel,progress:mapSpecialRoomProgress
        };
        window.XWMAP_SPECIAL={
          hook:mapSpecialHook,onEnter:mapSpecialOnEnter,prepare:mapSpecialPrepare,
          place:mapXfPlaceAtDoor,doorPos:mapXfBossDoorPos,gateLabel:mapSpecialGateLabel,
          progress:mapSpecialRoomProgress,def:mapSpecialDef,
          defendTick:typeof mapDefendTick==='function'?mapDefendTick:null,
          defendThreats:typeof mapDefendThreats==='function'?mapDefendThreats:null,
          defendCandidates:typeof mapDefendCandidates==='function'?mapDefendCandidates:null,
          defendPick:typeof mapDefendPick==='function'?mapDefendPick:null,
          defendSend:typeof mapDefendSend==='function'?mapDefendSend:null,
          defendRecall:typeof mapDefendRecall==='function'?mapDefendRecall:null,
          defendArea:typeof mapDefendArea==='function'?mapDefendArea:null
        };
        if(window.XWMAP){
          window.XWMAP.xfBossName=mapXfBossDisplayName;
          window.XWMAP.xfBossDoorPos=mapXfBossDoorPos;
          window.XWMAP.special=mapSpecialDef;
          window.XWMAP.specialApi=window.XWMAP_SPECIAL;
        }
      }
    }catch(e){}
  }
  return !!mapSpecialInstall._ok;
}
mapSpecialInstall._ok=false;
function mapXfInstall(){return mapSpecialInstall();}

if(typeof setTimeout==='function'){
  setTimeout(function mapSpecialBoot(){
    try{mapSpecialInstall();}catch(e){}
    try{if(typeof mapStoryInstall==='function')mapStoryInstall();}catch(e){}
    if(mapSpecialInstall._ok)return;
    setTimeout(mapSpecialBoot,40);
  },0);
}else{
  try{mapSpecialInstall();}catch(e){}
}

// ================== 副本劇情第一章：落霞仙尊之墓（F-020／F-021／F-028）==================
// 只改 map*：機制掛在既有 update／dgEnter／dgRetreat／dgAdd／meleeHit／xevaTry。
// 第二、三章只留目錄，旗預設關。戰力走特殊副本模板，不寫死數字。
function mapStoryKinds(){return ['st_luoxia','st_zangxian','st_wuxing'];}
function mapStoryLive(){
  try{
    const D=(typeof S!=='undefined')?S.dg:null;
    if(!D||!D.kind)return null;
    if(mapStoryKinds().indexOf(D.kind)<0)return null;
    if(typeof mapStoryChOn==='function'&&!mapStoryChOn(D.kind))return null;
    return D;
  }catch(e){return null;}
}
function mapStoryCfg(kind){
  try{if(!kind&&typeof S!=='undefined'&&S&&S.dg&&S.dg.kind)kind=S.dg.kind;}catch(e){}
  kind=kind||'st_luoxia';
  const T=(typeof mapSpecialTune==='function')?mapSpecialTune(kind):{};
  const U=(typeof MAP_TUNE!=='undefined'&&MAP_TUNE&&MAP_TUNE[kind])||{};
  if(kind==='st_zangxian'){
    return {
      shaInterval:U.shaInterval!=null?+U.shaInterval:60,
      shaPct:U.shaPct!=null?+U.shaPct:0.02,
      xtlMinHp:U.xtlMinHp!=null?+U.xtlMinHp:10000,
      trapDmg:U.trapDmg!=null?+U.trapDmg:2500,
      trapBleed:U.trapBleed!=null?+U.trapBleed:5,
      trapBleedDps:U.trapBleedDps!=null?+U.trapBleedDps:50,
      trapN:U.trapN!=null?U.trapN|0:3,
      trapArmorSec:U.trapArmorSec!=null?+U.trapArmorSec:5,
      trapArmorRed:U.trapArmorRed!=null?+U.trapArmorRed:0.30,
      crowdMul:U.crowdMul!=null?+U.crowdMul:1.9,
      crowdNeed:U.crowdNeed!=null?U.crowdNeed|0:4,
      addInterval:U.addInterval!=null?+U.addInterval:180,
      addN:U.addN!=null?U.addN|0:3,
      addRealm:U.addRealm!=null?U.addRealm|0:6,
      addSub:U.addSub!=null?U.addSub|0:9,
      addType:U.addType||'golem',
      roomMobCap:U.roomMobCap!=null?U.roomMobCap|0:5,
      elderShout:U.elderShout||'小心腳下！結防禦陣法！',
      bossN:T.bossN||U.bossN||'萬骨冥王',
      rooms:T.rooms||U.rooms||5
    };
  }
  if(kind==='st_wuxing'){
    return {
      jadeBonus:U.jadeBonus!=null?+U.jadeBonus:1500,
      jadeN:U.jadeN!=null?U.jadeN|0:5,
      clearTalk:U.clearTalk||'五行圓滿，金身初具！天仙之路，就在腳下！',
      defMul:U.defMul!=null?+U.defMul:2.0,
      woodRegen:U.woodRegen!=null?+U.woodRegen:0.05,
      waterInterval:U.waterInterval!=null?+U.waterInterval:10,
      waterSlow:U.waterSlow!=null?+U.waterSlow:0.50,
      waterSlowDur:U.waterSlowDur!=null?+U.waterSlowDur:3,
      fireSee:U.fireSee!=null?+U.fireSee:1.5,
      earthThorns:U.earthThorns!=null?+U.earthThorns:0.10,
      bossN:T.bossN||U.bossN||'通天靈脈守使',
      rooms:T.rooms||U.rooms||5
    };
  }
  return {
    fireInterval:U.fireInterval!=null?+U.fireInterval:5,
    fireDps:U.fireDps!=null?+U.fireDps:120,
    fireGrid:U.fireGrid!=null?U.fireGrid|0:9,
    fireActive:U.fireActive!=null?U.fireActive|0:1,
    fireDur:U.fireDur!=null?+U.fireDur:5,
    fireR:U.fireR!=null?+U.fireR:1,
    insightNeed:U.insightNeed!=null?+U.insightNeed:0.02,
    ambushHp:U.ambushHp!=null?+U.ambushHp:0.20,
    ambushN:U.ambushN!=null?U.ambushN|0:3,
    ambushRealm:U.ambushRealm!=null?U.ambushRealm|0:5,
    ambushSub:U.ambushSub!=null?U.ambushSub|0:6,
    ambushLootHp:U.ambushLootHp!=null?+U.ambushLootHp:0.30,
    crushAtk:U.crushAtk!=null?+U.crushAtk:0.70,
    beishuiSee:U.beishuiSee!=null?+U.beishuiSee:0.10,
    bossN:T.bossN||U.bossN||'守護傀儡·天罡',
    rooms:T.rooms||U.rooms||5
  };
}
function mapStoryInsight(u){
  if(!u)return 0;
  let v=0;
  if(u.insightRate!=null&&Number.isFinite(+u.insightRate))v=+u.insightRate;
  else if(u.insight!=null&&Number.isFinite(+u.insight))v=+u.insight;
  if(v>1)v=v/100; // 允許寫 2 或 0.02
  return v;
}
function mapStoryCanReroute(u){
  if(!u||u.dead)return false;
  const p=u.person||'';
  if(p!=='謹慎'&&p!=='沉穩')return false;
  const C=mapStoryCfg();
  return mapStoryInsight(u)>(C.insightNeed||0.02);
}
function mapStoryState(D){
  D=D||mapStoryLive();if(!D)return null;
  if(!D._mapStory)D._mapStory={fireT:0,pillars:[],ambush:false,locked:false,bubbled:{},loot:{}};
  return D._mapStory;
}
function mapStoryRoomList(D){
  try{return (D&&D.L&&D.L.rooms)||[];}catch(e){return [];}
}
function mapStoryNineCells(r){
  if(!r)return [];
  const cx=r.cx,cy=r.cy,step=Math.max(2,Math.min((r.w||14)/4,(r.h||14)/4));
  const out=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)out.push({x:cx+dx*step,y:cy+dy*step});
  return out;
}
function mapStoryInPillar(x,y,st,pad){
  if(!st||!st.pillars)return null;
  const extra=pad||0;
  for(const p of st.pillars){
    if(p.t<=0)continue;
    const rr=(p.r||1)+extra;
    if(Math.hypot(x-p.x,y-p.y)<=rr)return p;
  }
  return null;
}
function mapStoryRefreshFire(D,st,C){
  const rooms=mapStoryRoomList(D).filter(r=>r&&r.k>0&&!r.boss);
  const cells=[];
  for(const r of rooms)cells.push.apply(cells,mapStoryNineCells(r));
  if(!cells.length){
    const all=mapStoryRoomList(D);
    for(const r of all)cells.push.apply(cells,mapStoryNineCells(r));
  }
  const n=Math.max(1,Math.min(C.fireActive||1,cells.length,C.fireGrid||9));
  const pick=[];
  const bag=cells.slice();
  for(let i=0;i<n&&bag.length;i++){
    const k=Math.floor((typeof mapSpecialRng==='function'?mapSpecialRng():Math.random())*bag.length);
    pick.push(bag.splice(k,1)[0]);
  }
  st.pillars=pick.map(c=>({x:c.x,y:c.y,r:C.fireR||1,t:C.fireDur||5,dps:C.fireDps||120}));
}
function mapStoryApplyFireDmg(D,st,C,dt){
  if(!st.pillars||!st.pillars.length)return;
  const units=(typeof S!=='undefined'&&S&&S.units)||[];
  for(const u of units){
    if(!u||u.dead||!(u.hp>0))continue;
    // 繞行者不該站在柱上；若仍重疊仍會受傷（不是免疫）
    const hit=mapStoryInPillar(u.x,u.y,st,0);
    if(!hit)continue;
    const dmg=(hit.dps||C.fireDps||120)*dt;
    u.hp=Math.max(0,u.hp-dmg);
    u._mapStoryFireAcc=(u._mapStoryFireAcc||0)+dmg;
    if(u._mapStoryFireAcc>=40){
      u._mapStoryFireAcc=0;
      try{if(typeof floater==='function')floater(u.x,u.y-0.2,'天火 120','#ff8040');}catch(e){}
    }
    if(u.hp<=0){
      u.hp=0;
      try{if(D&&!D.end&&typeof dgDown==='function')dgDown(u);}catch(e){}
    }
  }
}
function mapStoryAvoidFire(D,st){
  const units=(typeof S!=='undefined'&&S&&S.units)||[];
  for(const u of units){
    if(!mapStoryCanReroute(u))continue;
    if(mapStoryInPillar(u.x,u.y,st,0.15)){
      // 已踩到：側移到最近非火格
      let best=null,bd=1e9;
      for(let a=0;a<8;a++){
        const ang=a*Math.PI/4,tx=u.x+Math.cos(ang)*1.2,ty=u.y+Math.sin(ang)*1.2;
        if(mapStoryInPillar(tx,ty,st,0.05))continue;
        let blocked=false;
        try{if(typeof blockedP==='function')blocked=!!blockedP(tx,ty);}catch(e){}
        if(blocked)continue;
        const d=Math.hypot(tx-u.x,ty-u.y);
        if(d<bd){bd=d;best={x:tx,y:ty};}
      }
      if(best){
        try{if(typeof pathTo==='function')pathTo(u,best.x,best.y);}catch(e){u.x=best.x;u.y=best.y;}
      }
      continue;
    }
    const path=u.path;
    if(!path||!path.length)continue;
    // 下一步若進火柱，重尋
    let nx,ny;
    const p0=path[0];
    if(p0&&typeof p0==='object'){nx=p0.x;ny=p0.y;}
    else if(typeof p0==='number'&&typeof N==='number'){nx=(p0%N)+0.5;ny=((p0/N)|0)+0.5;}
    if(nx==null)continue;
    if(mapStoryInPillar(nx,ny,st,0.2)){
      let best=null,bd=1e9;
      for(let a=0;a<12;a++){
        const ang=a*Math.PI/6,tx=u.x+Math.cos(ang)*2.2,ty=u.y+Math.sin(ang)*2.2;
        if(mapStoryInPillar(tx,ty,st,0.2))continue;
        let blocked=false;
        try{if(typeof blockedP==='function')blocked=!!blockedP(tx,ty);}catch(e){}
        if(blocked)continue;
        const d=Math.hypot(tx-nx,ty-ny);
        if(d<bd){bd=d;best={x:tx,y:ty};}
      }
      if(best){
        try{if(typeof pathTo==='function')pathTo(u,best.x,best.y);}catch(e){}
      }
    }
  }
}
function mapStorySpawnAmbush(D,st,C){
  if(st.ambush)return;
  st.ambush=true;
  const rooms=mapStoryRoomList(D);
  const br=rooms.find(r=>r&&r.boss)||rooms[rooms.length-1];
  const bx=br?(br.cx||10):10,by=br?(br.cy||10):10;
  const n=C.ambushN||3;
  for(let i=0;i<n;i++){
    const ang=i*Math.PI*2/n,x=bx+Math.cos(ang)*3.2,y=by+Math.sin(ang)*3.2;
    let e=null;
    try{
      if(typeof dgMob==='function')e=dgMob('xfguard',x,y,false);
    }catch(err){}
    if(!e)continue;
    e._mapStoryAmbush=1;
    e._mapSpecialDisplay='炎凰谷修士・'+(typeof mapSpecialRealmLabel==='function'?mapSpecialRealmLabel(C.ambushRealm,C.ambushSub):'築基');
    try{
      if(typeof mapSpecialApplyRealmStats==='function')mapSpecialApplyRealmStats(e,C.ambushRealm,C.ambushSub);
      else {e.realm=C.ambushRealm;e.sub=C.ambushSub;}
    }catch(err){e.realm=C.ambushRealm;e.sub=C.ambushSub;}
  }
  try{if(typeof toast==='function')toast('炎凰谷修士截胡！三人現身');}catch(e){}
  try{if(typeof floater==='function'&&br)floater(bx,by,'截胡！','#ff9060');}catch(e){}
  mapStoryLockDoor(D,st);
}
function mapStoryLockDoor(D,st){
  if(st.locked)return;
  st.locked=true;
  D._mapStoryExitLocked=1;
  try{if(typeof toast==='function')toast('落閘鎖門！退路已封');}catch(e){}
  const units=(typeof S!=='undefined'&&S&&S.units)||[];
  for(const u of units){
    if(!u||u.dead)continue;
    const p=u.person||'';
    if(p==='膽小'&&!st.bubbled.crush){
      u._mapStoryCrush=1;
      try{if(typeof floater==='function')floater(u.x,u.y-0.6,'退路沒了！師尊救我！','#ffb0b0');}catch(e){}
      st.bubbled.crush=1;
    }
    if(p==='剛烈'&&!st.bubbled.beishui){
      u._mapStoryBeishui=1;
      try{if(typeof floater==='function')floater(u.x,u.y-0.6,'有死無生，殺！','#ffe27a');}catch(e){}
      st.bubbled.beishui=1;
    }
  }
}
function mapStoryUnlockIfCleared(D,st){
  if(D&&D.cleared&&st){st.locked=false;D._mapStoryExitLocked=0;}
}
function mapStoryAmbushAI(D,st,C){
  const ens=(typeof S!=='undefined'&&S&&S.enemies)||[];
  const units=((typeof S!=='undefined'&&S&&S.units)||[]).filter(u=>u&&!u.dead&&u.kind==='disciple'&&u.maxhp>0);
  const low=units.filter(u=>(u.hp/u.maxhp)<(C.ambushLootHp||0.30)).sort((a,b)=>(a.hp/a.maxhp)-(b.hp/b.maxhp));
  for(const e of ens){
    if(!e||!e._mapStoryAmbush||e.dead)continue;
    const tgt=low[0]||null;
    if(tgt){
      e.target={k:'u',id:tgt.id};
      e._mapStoryPrey=tgt.id;
    }
  }
}
function mapStoryCheckAmbush(D,st,C){
  if(st.ambush)return;
  let boss=null;
  try{if(D.boss!=null&&typeof enemyById==='function')boss=enemyById(D.boss);}catch(e){}
  if(!boss){
    const ens=(typeof S!=='undefined'&&S&&S.enemies)||[];
    boss=ens.find(e=>e&&(e._mapSpecialBoss||e._mapSpecialKind==='st_luoxia'))||null;
  }
  if(!boss||!(boss.maxhp>0))return;
  if((boss.hp/boss.maxhp)<=(C.ambushHp||0.20))mapStorySpawnAmbush(D,st,C);
}
function mapStoryCreditDuring(){
  try{
    const D=mapStoryLive();if(!D)return null;
    const st=mapStoryState(D);
    return st;
  }catch(e){return null;}
}
function mapStoryNoteKiller(src){
  const st=mapStoryCreditDuring();
  if(!st)return;
  st.curSrc=src&&src.kind?src:null;
}
function mapStoryCredit(cat,k,n,item){
  const st=mapStoryCreditDuring();
  if(!st||!st.curSrc||st.curSrc.kind!=='disciple')return;
  const id=st.curSrc.id;
  st.loot=st.loot||{};
  const bag=st.loot[id]=st.loot[id]||{res:{},mats:{},items:[]};
  if(item)bag.items.push(item);
  else if(cat&&k&&n)bag[cat][k]=(bag[cat][k]||0)+n;
}
function mapStoryPlunder(u){
  const D=mapStoryLive();if(!D||!u)return;
  const st=mapStoryState(D);if(!st||!st.loot||!st.loot[u.id])return;
  const bag=st.loot[u.id];
  const L=D.loot;if(!L)return;
  let took=false;
  if(bag.res)for(const k in bag.res){const n=Math.min(bag.res[k]|0,L.res&&L.res[k]||0);if(n>0){L.res[k]-=n;took=true;}}
  if(bag.mats)for(const k in bag.mats){const n=Math.min(bag.mats[k]|0,L.mats&&L.mats[k]||0);if(n>0){L.mats[k]-=n;took=true;}}
  if(bag.items&&L.items){
    for(const it of bag.items){
      const i=L.items.indexOf(it);
      if(i>=0){L.items.splice(i,1);took=true;}
    }
  }
  delete st.loot[u.id];
  if(took){
    try{if(typeof floater==='function')floater(u.x,u.y,'遺物被奪','#ff8060');}catch(e){}
  }
}
function mapStoryOnDiscipleDown(u){
  const D=mapStoryLive();if(!D||!u||u.kind!=='player'&&u.kind!=='disciple')return;
  if(u.kind!=='disciple')return;
  const st=mapStoryState(D);if(!st||!st.ambush)return;
  const C=mapStoryCfg();
  const low=u.maxhp>0&&(u.hp/u.maxhp)<=(C.ambushLootHp||0.30)+0.001;
  // hp may already be 0 when called; also plunder if marked as prey
  const prey=((typeof S!=='undefined'&&S&&S.enemies)||[]).some(e=>e&&e._mapStoryAmbush&&e._mapStoryPrey===u.id);
  if(low||prey||(u.hp<=0))mapStoryPlunder(u);
}

// ---- 第二章：葬仙萬骨荒塚 ----
function mapStoryZxUnits(){
  try{return ((typeof S!=='undefined'&&S&&S.units)||[]).filter(u=>u&&!u.dead);}catch(e){return [];}
}
function mapStoryZxEnter(D,st){
  st=st||mapStoryState(D);
  st.shaT=0;st.shaN=0;st.addT=0;st.traps=st.traps||[];st.hpSnap=st.hpSnap||{};
  const us=mapStoryZxUnits();
  for(const u of us){
    if(!st.hpSnap[u.id])st.hpSnap[u.id]={maxhp:u.maxhp,hp:u.hp};
    u._mapShaOrigMax=u.maxhp;
  }
  mapStoryZxPlaceTraps(D,st);
}
function mapStoryZxRestore(D,keepMarks){
  const st=D&&D._mapStory;if(!st||!st.hpSnap)return;
  try{
    const us=((typeof S!=='undefined'&&S&&S.units)||[]);
    for(const u of us){
      const s=st.hpSnap[u.id];
      if(!s)continue;
      const ratio=(u.maxhp>0&&u.hp!=null)?(u.hp/u.maxhp):1;
      u.maxhp=s.maxhp;
      if(u.hp!=null)u.hp=Math.max(1,Math.min(u.maxhp,Math.round(s.maxhp*ratio)));
      if(!keepMarks){delete u._mapShaOrigMax;delete u._mapBleedT;delete u._mapArmorT;}
    }
  }catch(e){}
}
function mapStoryZxReapply(D){
  const st=D&&D._mapStory;if(!st)return;
  const n=st.shaN||0;if(n<=0)return;
  const C=mapStoryCfg('st_zangxian');
  const pct=C.shaPct||0.02;
  try{
    const us=((typeof S!=='undefined'&&S&&S.units)||[]);
    for(const u of us){
      const snap=st.hpSnap&&st.hpSnap[u.id];
      if(!snap)continue;
      let max=snap.maxhp;
      for(let i=0;i<n;i++)max=Math.max(1,Math.floor(max*(1-pct)));
      const ratio=(u.maxhp>0&&u.hp!=null)?u.hp/u.maxhp:1;
      u.maxhp=max;
      if(u.hp!=null)u.hp=Math.max(1,Math.min(u.maxhp,Math.round(max*ratio)));
      u._mapShaOrigMax=snap.maxhp;
    }
  }catch(e){}
}
function mapStoryZxPlaceTraps(D,st){
  const C=mapStoryCfg('st_zangxian');
  const rooms=mapStoryRoomList(D).filter(r=>r&&!r.boss&&r.k>0);
  const n=Math.max(1,C.trapN||3);
  st.traps=[];
  for(let i=0;i<n;i++){
    const r=rooms[i%Math.max(1,rooms.length)]||{cx:12,cy:12,w:14,h:14};
    const x=(r.cx||12)+(i%3-1)*Math.max(2,(r.w||14)/4);
    const y=(r.cy||12)+(Math.floor(i/3)%2?1:-1)*Math.max(2,(r.h||14)/4);
    st.traps.push({x,y,r:0.7,armed:true});
  }
}
function mapStoryZxTick(D,dt,dmgDt){
  const st=mapStoryState(D),C=mapStoryCfg('st_zangxian');
  st.shaT=(st.shaT||0)+dt;
  if(st.shaT>=(C.shaInterval||60)){
    st.shaT=0;st.shaN=(st.shaN||0)+1;
    for(const u of mapStoryZxUnits()){
      if(!st.hpSnap[u.id])st.hpSnap[u.id]={maxhp:u.maxhp,hp:u.hp};
      const orig=st.hpSnap[u.id].maxhp;
      const next=Math.max(1,Math.floor(u.maxhp*(1-(C.shaPct||0.02))));
      const ratio=u.maxhp>0?u.hp/u.maxhp:1;
      u.maxhp=next;
      u.hp=Math.max(1,Math.min(u.maxhp,Math.round(next*ratio)));
      u._mapShaOrigMax=orig;
    }
  }
  // 暗弩
  for(const u of mapStoryZxUnits()){
    if(u._mapBleedT>0){
      u._mapBleedT-=dt;
      const bd=(C.trapBleedDps||50)*Math.min(dt,0.25);
      u.hp=Math.max(0,u.hp-bd);
      if(u.hp<=0&&!u.dead&&typeof dgDown==='function')try{if(!D.end)dgDown(u);}catch(e){}
    }
    if(u._mapArmorT>0)u._mapArmorT-=dt;
    for(const tr of (st.traps||[])){
      if(!tr.armed)continue;
      if(Math.hypot((u.x||0)-tr.x,(u.y||0)-tr.y)<=(tr.r||0.7)+0.2){
        tr.armed=false;
        u.hp=Math.max(0,(u.hp||0)-(C.trapDmg||2500));
        u._mapBleedT=C.trapBleed||5;
        try{if(typeof toast==='function')toast(C.elderShout||'小心腳下！結防禦陣法！');}catch(e){}
        for(const v of mapStoryZxUnits())v._mapArmorT=C.trapArmorSec||5;
        if(u.hp<=0&&!u.dead&&typeof dgDown==='function')try{if(!D.end)dgDown(u);}catch(e){}
        break;
      }
    }
  }
  // 骨妖增援
  st.addT=(st.addT||0)+dt;
  if(st.addT>=(C.addInterval||180)){
    st.addT=0;
    mapStoryZxSpawnAdds(D,st,C);
  }
  if(D.cleared){mapStoryUnlockIfCleared(D,st);mapStoryZxRestore(D);}
  else if(st.locked){}
  else {
    // 鎖門：進入或首領還在就鎖（規格「鎖門」與冥王並列；待釐清時機，先與進場同時）
    mapStoryLockDoor(D,st);
  }
}
function mapStoryZxSpawnAdds(D,st,C){
  if(typeof makeEnemy!=='function'||typeof S==='undefined'||!S||!Array.isArray(S.enemies))return;
  const cap=C.roomMobCap||5;
  const live=S.enemies.filter(e=>e&&!e.dead&&!e._mapSpecialBoss).length;
  const need=Math.min(C.addN||3,Math.max(0,cap-live));
  if(need<=0)return;
  const rooms=mapStoryRoomList(D).filter(r=>r&&!r.boss);
  const r=rooms[rooms.length-1]||{cx:16,cy:16};
  for(let i=0;i<need;i++){
    let e=null;
    try{e=makeEnemy(C.addType||'golem',(r.cx||16)+i*0.8,(r.cy||16),{realm:C.addRealm||6});}catch(err){}
    if(!e)continue;
    e.realm=C.addRealm||6;e.sub=C.addSub||9;e._mapStoryAdd=1;
    try{if(typeof rbEnFull==='function'){if(e._rb)e._rb.full=0;rbEnFull(e);}}catch(err){}
    S.enemies.push(e);
  }
}
function mapStoryZxCrowdMul(){
  const D=mapStoryLive();if(!D||D.kind!=='st_zangxian')return 1;
  const C=mapStoryCfg('st_zangxian');
  const n=mapStoryZxUnits().length;
  if(n>=(C.crowdNeed||4))return C.crowdMul||1.9;
  return 1;
}
function mapStoryZxDmgTaken(amt,u){
  if(u&&u._mapArmorT>0){
    const C=mapStoryCfg('st_zangxian');
    amt=amt*(1-(C.trapArmorRed||0.30));
  }
  return amt;
}

// ---- 第三章：五行通天靈脈 ----
const MAP_STORY_WX_EL=['metal','wood','water','fire','earth'];
function mapStoryWxEnter(D,st){
  st=st||mapStoryState(D);
  st.waterT=0;st.jade=0;st.jadeGot={};st.talked=false;st.els=MAP_STORY_WX_EL.slice();
  const rooms=mapStoryRoomList(D);
  rooms.forEach((r,i)=>{if(r)r._mapEl=MAP_STORY_WX_EL[Math.min(i,MAP_STORY_WX_EL.length-1)];});
}
function mapStoryWxRoomOf(x,y,D){
  const rooms=mapStoryRoomList(D);
  let best=null,bd=1e9;
  for(const r of rooms){
    if(!r)continue;
    const d=Math.hypot((x||0)-(r.cx||0),(y||0)-(r.cy||0));
    if(d<bd){bd=d;best=r;}
  }
  return best;
}
function mapStoryWxTick(D,dt,dmgDt){
  const st=mapStoryState(D),C=mapStoryCfg('st_wuxing');
  // 木：該房／該元素首領每秒回 5%
  try{
    for(const e of (S.enemies||[])){
      if(!e||e.dead)continue;
      const r=mapStoryWxRoomOf(e.x,e.y,D);
      if(r&&r._mapEl==='wood'){
        e.hp=Math.min(e.maxhp,(e.hp||0)+(e.maxhp||0)*(C.woodRegen||0.05)*Math.min(dt,0.25));
      }
      if(r&&r._mapEl==='metal'&&!e._mapWxDef){
        e._mapWxDef=1;
        if(e._mapWxDefBase==null)e._mapWxDefBase=+(e.def||0);
        e.def=(e._mapWxDefBase||0)*(C.defMul||2.0);
        if(!(e.def>0))e.def=(e.maxhp||1000)*0.02*(C.defMul||2.0);
      }
    }
  }catch(e){}
  // 水：每 10 秒全屏減速
  st.waterT=(st.waterT||0)+dt;
  if(st.waterT>=(C.waterInterval||10)){
    st.waterT=0;st.slowT=C.waterSlowDur||3;
  }
  if(st.slowT>0){
    st.slowT-=dt;
    try{
      for(const u of ((S.units)||[])){
        if(!u||u.dead)continue;
        if(!u._mapWxSpd)u._mapWxSpd=u.speed;
        u.speed=u._mapWxSpd*(1-(C.waterSlow||0.50));
      }
    }catch(e){}
  }else{
    try{for(const u of ((S.units)||[])){if(u&&u._mapWxSpd!=null){u.speed=u._mapWxSpd;delete u._mapWxSpd;}}}catch(e){}
  }
  // 每關清除刷天道玉髓（採集即生效，不進背包）
  try{
    const rooms=mapStoryRoomList(D);
    for(const r of rooms){
      if(!r||r.state!=='clear'||r.k===0)continue;
      if(st.jadeGot[r.k])continue;
      st.jadeGot[r.k]=1;
      const add=C.jadeBonus||1500;
      st.jade=(st.jade||0)+add;
      const p=(S.units||[]).find(u=>u&&u.kind==='player')||(S.units||[])[0];
      if(p){p._mapBodyInt=(p._mapBodyInt||0)+add;if(p.bodyIntensity!=null)p.bodyIntensity+=add;}
    }
  }catch(e){}
  if(D.cleared){
    mapStoryUnlockIfCleared(D,st);
    if(!st.talked){
      st.talked=true;
      try{if(typeof toast==='function')toast(C.clearTalk);}catch(e){}
    }
  }
}
function mapStoryWxSeeMul(u){
  const D=mapStoryLive();if(!D||D.kind!=='st_wuxing'||!u)return 1;
  const r=mapStoryWxRoomOf(u.x,u.y,D);
  if(r&&r._mapEl==='fire'){const C=mapStoryCfg('st_wuxing');return C.fireSee||1.5;}
  return 1;
}
function mapStoryWxThorns(src,amt){
  const D=mapStoryLive();if(!D||D.kind!=='st_wuxing'||!src)return 0;
  const r=mapStoryWxRoomOf(src.x,src.y,D);
  if(r&&r._mapEl==='earth'){const C=mapStoryCfg('st_wuxing');return (amt||0)*(C.earthThorns||0.10);}
  return 0;
}


function mapStoryTick(dt){
  const D=mapStoryLive();if(!D)return;
  if(!(dt>0)||dt>10)dt=0.05;
  const dmgDt=Math.min(dt,0.25);
  if(D.kind==='st_zangxian'){mapStoryZxTick(D,dt,dmgDt);return;}
  if(D.kind==='st_wuxing'){mapStoryWxTick(D,dt,dmgDt);return;}
  const st=mapStoryState(D),C=mapStoryCfg();
  st.fireT=(st.fireT||0)+dt;
  if(!st.pillars)st.pillars=[];
  for(const p of st.pillars)p.t-=dt;
  st.pillars=st.pillars.filter(p=>p.t>-0.05);
  if(st.fireT>=(C.fireInterval||5)){st.fireT=0;mapStoryRefreshFire(D,st,C);}
  mapStoryApplyFireDmg(D,st,C,dmgDt);
  mapStoryAvoidFire(D,st);
  mapStoryCheckAmbush(D,st,C);
  mapStoryAmbushAI(D,st,C);
  mapStoryUnlockIfCleared(D,st);
}
function mapStoryDraw(){
  const D=mapStoryLive();if(!D)return;
  const st=D._mapStory;if(!st||!st.pillars)return;
  try{
    if(typeof P!=='function'||typeof ctx==='undefined'||!ctx)return;
    for(const p of st.pillars){
      if(p.t<=0)continue;
      const q=P(p.x,p.y);
      const pulse=0.5+0.5*Math.sin((typeof performance!=='undefined'?performance.now():0)/180);
      const rr=(p.r||1);
      const hw=(typeof HW==='number')?HW:32,hh=(typeof HH==='number')?HH:16;
      ctx.globalAlpha=0.35+0.25*pulse;
      ctx.fillStyle='rgba(255,90,30,0.85)';
      ctx.beginPath();ctx.ellipse(q.x,q.y,rr*hw*1.15,rr*hh*1.15,0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=0.9;
      ctx.strokeStyle='rgba(255,200,80,0.95)';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(q.x,q.y,rr*hw*1.15,rr*hh*1.15,0,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=1;ctx.globalAlpha=1;
    }
    if(st.locked&&typeof label==='function'){
      try{
        const ent=D.ent;if(ent){const q=P(ent.x,ent.y);label('落閘鎖門',q.x,q.y-28,'#ffb0a0','bold 10px sans-serif');}
      }catch(e){}
    }
  }catch(e){}
}
function mapStoryOnEnter(D){
  D=D||((typeof S!=='undefined')?S.dg:null);
  if(!D||mapStoryKinds().indexOf(D.kind)<0)return;
  if(typeof mapStoryChOn==='function'&&!mapStoryChOn(D.kind))return;
  const st=mapStoryState(D);
  if(D.kind==='st_zangxian')mapStoryZxEnter(D,st);
  if(D.kind==='st_wuxing')mapStoryWxEnter(D,st);
}
function mapStoryOnExit(D){
  try{
    D=D||((typeof S!=='undefined')?S.dg:null);
    if(!D||!D._mapStory)return;
    if(D.kind==='st_zangxian')mapStoryZxRestore(D);
  }catch(e){}
}
function mapStoryBlockedExit(){
  const D=mapStoryLive();
  return !!(D&&D._mapStoryExitLocked&&!D.cleared);
}

function mapStoryInstall(){
  // 允許重入（各 hook 自有旗），方便踏仙梯等晚載入 API
  let n=0;
  try{
    if(typeof update==='function'&&!update._mapStory){
      const _u=update;
      update=function(dt){
        const r=_u.apply(this,arguments);
        try{mapStoryTick(typeof dt==='number'?dt:0.05);}catch(e){}
        return r;
      };
      update._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgEnter==='function'&&!dgEnter._mapStory){
      const _de=dgEnter;
      dgEnter=function(){
        const r=_de.apply(this,arguments);
        try{if(r&&typeof S!=='undefined'&&S&&S.dg)mapStoryOnEnter(S.dg);}catch(e){}
        return r;
      };
      dgEnter._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgRetreat==='function'&&!dgRetreat._mapStory){
      const _rt=dgRetreat;
      dgRetreat=function(){
        if(mapStoryBlockedExit()){
          try{if(typeof toast==='function')toast('落閘鎖門，退路已封');}catch(e){}
          return false;
        }
        return _rt.apply(this,arguments);
      };
      dgRetreat._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof x47DgExitAsk==='function'&&!x47DgExitAsk._mapStory){
      const _ask=x47DgExitAsk;
      x47DgExitAsk=function(){
        if(mapStoryBlockedExit()){
          try{if(typeof toast==='function')toast('落閘鎖門，退路已封');}catch(e){}
          return false;
        }
        return _ask.apply(this,arguments);
      };
      x47DgExitAsk._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgExit==='function'&&!dgExit._mapStory){
      const _ex=dgExit;
      dgExit=function(){
        if(mapStoryBlockedExit()&&arguments[0]){
          // keep=true 的撤離也擋住；失敗傳出（keep=false）仍允許
          try{if(typeof toast==='function')toast('落閘鎖門，退路已封');}catch(e){}
          return false;
        }
        const r=_ex.apply(this,arguments);
        try{if(r!==false)mapStoryOnExit();}catch(e){}
        return r;
      };
      dgExit._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgKill==='function'&&!dgKill._mapStory){
      const _k=dgKill;
      dgKill=function(src,e){
        try{mapStoryNoteKiller(src);}catch(err){}
        const r=_k.apply(this,arguments);
        try{mapStoryNoteKiller(null);}catch(err){}
        return r;
      };
      dgKill._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgAdd==='function'&&!dgAdd._mapStory){
      const _a=dgAdd;
      dgAdd=function(cat,k,n,e){
        const r=_a.apply(this,arguments);
        try{mapStoryCredit(cat,k,n,null);}catch(err){}
        return r;
      };
      dgAdd._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgDown==='function'&&!dgDown._mapStory){
      const _dn=dgDown;
      dgDown=function(u){
        try{mapStoryOnDiscipleDown(u);}catch(err){}
        return _dn.apply(this,arguments);
      };
      dgDown._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof meleeHit==='function'&&!meleeHit._mapStory){
      const _mh=meleeHit;
      meleeHit=function(u,e){
        const r=_mh.apply(this,arguments);
        try{
          if(u&&u._mapStoryCrush){
            const C=mapStoryCfg();
            const k=C.crushAtk>0?C.crushAtk:0.70;
            if(u.cd>0)u.cd=u.cd/k;
          }
        }catch(err){}
        return r;
      };
      meleeHit._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof xevaTry==='function'&&!xevaTry._mapStory){
      const _ev=xevaTry;
      xevaTry=function(src,dst,amt){
        try{
          if(src&&src._mapStoryBeishui&&!src.xkp){
            const C=mapStoryCfg();
            const p=C.beishuiSee!=null?C.beishuiSee:0.10;
            if((typeof rnd==='function'?rnd():Math.random())<p){
              src.xkp=1;
              try{if(typeof floater==='function')floater(src.x,src.y-0.4,'背水一戰 看破','#ffe27a');}catch(err){}
            }
          }
        }catch(err){}
        return _ev.apply(this,arguments);
      };
      xevaTry._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dgBossDown==='function'&&!dgBossDown._mapStory){
      const _bd=dgBossDown;
      dgBossDown=function(){
        const r=_bd.apply(this,arguments);
        try{
          const D=mapStoryLive();
          if(D){const st=mapStoryState(D);mapStoryUnlockIfCleared(D,st);}
        }catch(e){}
        return r;
      };
      dgBossDown._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof drawDungeon==='function'&&!drawDungeon._mapStory){
      const _dd=drawDungeon;
      drawDungeon=function(){
        const r=_dd.apply(this,arguments);
        try{mapStoryDraw();}catch(e){}
        return r;
      };
      drawDungeon._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof mapDgEnter==='function'&&!mapDgEnter._mapStory){
      const _me=mapDgEnter;
      mapDgEnter=function(kind){
        if(kind==='st_luoxia'&&typeof mapStoryChOn==='function'&&!mapStoryChOn('st_luoxia'))return false;
        if((kind==='st_zangxian'||kind==='st_wuxing')&&typeof mapStoryChOn==='function'&&!mapStoryChOn(kind))return false;
        const r=_me.apply(this,arguments);
        try{if(r&&typeof S!=='undefined'&&S&&S.dg)mapStoryOnEnter(S.dg);}catch(e){}
        return r;
      };
      mapDgEnter._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof window!=='undefined'){
      window.XWMAP_STORY={
        install:mapStoryInstall,tick:mapStoryTick,chOn:mapStoryChOn,
        cfg:mapStoryCfg,live:mapStoryLive,insight:mapStoryInsight,
        canReroute:mapStoryCanReroute
      };
    }
  }catch(e){}
  try{
    if(typeof snapshot==='function'&&!snapshot._mapStory){
      const _sn=snapshot;
      snapshot=function(){
        let D=null,needRe=false;
        try{D=(typeof S!=='undefined')?S.dg:null;if(D&&D.kind==='st_zangxian'&&D._mapStory){mapStoryZxRestore(D,true);needRe=true;}}catch(e){}
        const r=_sn.apply(this,arguments);
        try{if(needRe)mapStoryZxReapply(D);}catch(e){}
        return r;
      };
      snapshot._mapStory=1;n++;
    }
  }catch(e){}
  try{
    if(typeof dmgUnit==='function'&&!dmgUnit._mapStoryCh){
      const _du=dmgUnit;
      dmgUnit=function(src,u,amt){
        try{
          if(typeof mapStoryZxCrowdMul==='function'){
            const m=mapStoryZxCrowdMul();
            if(m>1&&src&&(src.kind==='enemy'||src._mapStoryAdd||src._mapSpecialBoss))amt=amt*m;
          }
          amt=typeof mapStoryZxDmgTaken==='function'?mapStoryZxDmgTaken(amt,u):amt;
        }catch(e){}
        const r=_du.call(this,src,u,amt);
        try{
          const th=typeof mapStoryWxThorns==='function'?mapStoryWxThorns(src,amt):0;
          if(th>0&&src&&src.hp!=null){
            src.hp=Math.max(0,src.hp-th);
            if(src.hp<=0&&!src.dead){
              try{if(typeof dgDown==='function')dgDown(src);}catch(e2){}
            }
          }
        }catch(e){}
        return r;
      };
      dmgUnit._mapStoryCh=1;n++;
    }
  }catch(e){}
  try{
    const wrapXtl=function(api){
      if(!api||typeof api.canStart!=='function'||api.canStart._mapStory)return false;
      const _cs=api.canStart;
      api.canStart=function(u){
        const r=_cs.apply(this,arguments);
        try{
          const live=typeof mapStoryLive==='function'?mapStoryLive():null;
          if(!live||live.kind!=='st_zangxian')return r;
          const C=typeof mapStoryCfg==='function'?mapStoryCfg('st_zangxian'):{};
          const need=C.xtlMinHp||10000;
          const t=u||null;
          let hp=t&&t.maxhp;
          if(hp==null&&typeof player==='function'){const p=player();hp=p&&p.maxhp;}
          if((hp||0)<need)return {ok:false,reason:'map-sha-hp',need:need};
        }catch(e){}
        return r;
      };
      api.canStart._mapStory=1;
      return true;
    };
    if(typeof XW_XTL!=='undefined')wrapXtl(XW_XTL);
    if(typeof CultXTL!=='undefined')wrapXtl(CultXTL);
    try{if(typeof Cult!=='undefined'&&Cult){if(typeof Cult.canXtl==='function'&&!Cult.canXtl._mapStory){const _c=Cult.canXtl;Cult.canXtl=function(u){const r=_c.apply(this,arguments);try{const live=mapStoryLive();if(!live||live.kind!=='st_zangxian')return r;const C=mapStoryCfg('st_zangxian');if(((u&&u.maxhp)||0)<(C.xtlMinHp||10000))return {ok:false,reason:'map-sha-hp'};}catch(e){}return r;};Cult.canXtl._mapStory=1;n++;}}}catch(e){}
  }catch(e){}
  try{
    if(typeof xevaTry==='function'&&!xevaTry._mapStoryWx){
      const _ev=xevaTry;
      xevaTry=function(src){
        try{
          const mul=typeof mapStoryWxSeeMul==='function'?mapStoryWxSeeMul(src):1;
          if(mul>1&&src)src.xkp=1;
        }catch(e){}
        return _ev.apply(this,arguments);
      };
      xevaTry._mapStoryWx=1;n++;
    }
  }catch(e){}
  mapStoryInstall._ok=n>0||mapStoryInstall._ok;
  // 無 g* 掛點時（回歸 vm）也算安裝完成，資料／函式可測
  if(typeof update!=='function'&&typeof dgEnter!=='function')mapStoryInstall._ok=true;
  return !!mapStoryInstall._ok;
}
mapStoryInstall._ok=false;
if(typeof setTimeout==='function'){
  setTimeout(function mapStoryBoot(){
    try{mapStoryInstall();}catch(e){}
    if(mapStoryInstall._ok)return;
    setTimeout(mapStoryBoot,40);
  },0);
}else{
  try{mapStoryInstall();}catch(e){}
}
