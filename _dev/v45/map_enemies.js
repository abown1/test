// ================== v0.4.x map PHASE4：敵裝飾／至寶掉落／擊殺結算 ==================
function mapEnsureZbState(){
  if(typeof S==='undefined'||!S)return null;
  if(!S.zb)S.zb={inv:[],carriers:{},pity:{dungeon:0,cross:0}};
  if(!S.zb.pity)S.zb.pity={dungeon:0,cross:0};
  if(S.zb.pity.dungeon==null)S.zb.pity.dungeon=0;
  if(S.zb.pity.cross==null)S.zb.pity.cross=0;
  if(!Array.isArray(S.zb.inv))S.zb.inv=[];
  if(!S.zb.carriers)S.zb.carriers={};
  return S.zb;
}
function mapEnemyCap(){return (MAP_TUNE&&MAP_TUNE.spawn&&MAP_TUNE.spawn.enemies)||220;}
function mapEnemyCount(){try{return (S&&S.enemies&&S.enemies.length)||0;}catch(e){return 0;}}
function mapEnemyCapEnforce(){
  if(typeof S==='undefined'||!S||!Array.isArray(S.enemies))return 0;
  const cap=mapEnemyCap();let n=0;
  while(S.enemies.length>cap){
    // 優先移除非載體、非 boss 標記
    let idx=-1;
    for(let i=S.enemies.length-1;i>=0;i--){
      const e=S.enemies[i];if(!e)continue;
      if(e.zbId||e._mapBoss)continue;idx=i;break;
    }
    if(idx<0)idx=S.enemies.length-1;
    const dead=S.enemies.splice(idx,1)[0];
    if(dead&&dead.zbId&&S.zb&&S.zb.carriers)delete S.zb.carriers[dead.id];
    n++;
  }
  if(S.map&&S.map.spawn)S.map.spawn.enemies=S.enemies.length;
  return n;
}

// 共用陣列衛生：補缺 x/y/home，清失效 target（updateEnemy 讀 e.home.x；見 MAP_SCHEMA §12）
function mapEnsureEntityXY(e,fx,fy){
  if(!e||typeof e!=='object')return e;
  const x=(e.x!=null&&Number.isFinite(+e.x))?+e.x:(fx!=null?+fx:0);
  const y=(e.y!=null&&Number.isFinite(+e.y))?+e.y:(fy!=null?+fy:0);
  if(e.x==null||!Number.isFinite(+e.x))e.x=x;
  if(e.y==null||!Number.isFinite(+e.y))e.y=y;
  if(!e.home||typeof e.home!=='object')e.home={x:e.x,y:e.y};
  else{
    if(e.home.x==null||!Number.isFinite(+e.home.x))e.home.x=e.x;
    if(e.home.y==null||!Number.isFinite(+e.home.y))e.home.y=e.y;
  }
  if(e.path==null)e.path=[];
  if(e.lod==null)e.lod=0;
  if(e.cd==null)e.cd=0;
  if(e.scan==null)e.scan=0;
  if(e.repath==null)e.repath=0;
  if(e.anim==null)e.anim=0;
  if(e.slowT==null)e.slowT=0;
  if(e.stun==null)e.stun=0;
  if(e.wt==null)e.wt=0;
  return e;
}
function mapSanitizeSharedEntities(){
  if(typeof S==='undefined'||!S)return 0;
  let n=0,unitTargets=null; // 同次衛生掃描只重用同ID查找；每個目標仍逐一驗活性/座標。
  if(Array.isArray(S.units)){
    for(const u of S.units){
      if(!u||u.dead)continue;
      const bad=!Number.isFinite(+u.x)||!Number.isFinite(+u.y);
      if(bad){
        let fx=0,fy=0;
        try{const p=typeof player==='function'?player():null;if(p&&Number.isFinite(p.x)){fx=p.x;fy=p.y;}}catch(er){}
        mapEnsureEntityXY(u,fx,fy);n++;
        if(u.path)u.path=[];
        if(u.task&&u.task.type==='move')u.task=null;
      }else mapEnsureEntityXY(u,u.x,u.y);
    }
  }
  if(Array.isArray(S.enemies)){
    for(const e of S.enemies){
      if(!e)continue;
      const before=!e.home||e.x==null||e.y==null||!Number.isFinite(+e.x)||!Number.isFinite(+e.y);
      mapEnsureEntityXY(e,e.x,e.y);
      if(before)n++;
      // 清失效／缺座標的單位目標（避免 chase 讀 undefined）
      if(e.target&&e.target.k==='u'){
        let u=null;
        if(!unitTargets)unitTargets=new Map();
        if(unitTargets.has(e.target.id))u=unitTargets.get(e.target.id);
        else{
          try{if(typeof unitById==='function')u=unitById(e.target.id);}catch(er){}
          if(!u&&S.units)u=S.units.find(x=>x&&x.id===e.target.id);
          unitTargets.set(e.target.id,u);
        }
        if(!u||u.dead||u.x==null||u.y==null){e.target=null;if(e.path)e.path=[];n++;}
      }else if(e.target&&e.target.k==='b'){
        let b=null;
        try{if(typeof bById==='function')b=bById(e.target.id);}catch(er){}
        if(!b||b.broken){e.target=null;if(e.path)e.path=[];n++;}
      }
    }
  }
  // 宗門 NPC（不進 S.enemies，但若誤入 units 需有座標）
  if(Array.isArray(S.sects)){
    for(const sect of S.sects){
      const hx=sect&&sect.hall&&sect.hall.x,hy=sect&&sect.hall&&sect.hall.y;
      for(const npc of (sect&&sect.npcs)||[]){
        if(!npc)continue;
        if(npc.x==null||npc.y==null||!npc.home){mapEnsureEntityXY(npc,hx,hy);n++;}
      }
    }
  }
  if(Array.isArray(S.units)){
    for(const u of S.units){
      if(!u||u.dead)continue;
      if(u.x==null||u.y==null){mapEnsureEntityXY(u,0,0);n++;}
    }
  }
  return n;
}
function mapMakeGearItem(t,q,el,idBase){
  const G=mapGearTable()[t];if(!G)return null;
  const qm=(typeof QMUL!=='undefined'&&QMUL)?QMUL:(MAP_QMUL_FALLBACK);
  const m=qm[Math.max(0,Math.min(qm.length-1,q|0))]||1;
  const slot=G.slot==='c'?'c1':G.slot;
  return {
    id:(idBase!=null?idBase:'mg')+'_'+t+'_'+(q|0),
    t,slot,q:q|0,el:el==null?-1:el,
    atk:+(((G.atk||0)*m).toFixed(1)),
    hp:Math.round((G.hp||0)*m),
    def:+(((G.def||0)*m).toFixed(1)),
    spd:+(((G.spd||0)*(1+(q|0)*0.2)).toFixed(2))
  };
}
function mapGearApplyToEnemy(e){
  if(!e||!e.eq)return e;
  // 先還原基底（若有）
  if(e._mapBase){e.atk=e._mapBase.atk;e.maxhp=e._mapBase.maxhp;e.hp=Math.min(e.hp,e.maxhp);e.speed=e._mapBase.speed;e.def=e._mapBase.def||0;}
  else e._mapBase={atk:e.atk,maxhp:e.maxhp,speed:e.speed,def:e.def||0};
  let atk=0,hp=0,def=0,spd=0;
  for(const k of Object.keys(e.eq)){
    const it=e.eq[k];if(!it)continue;
    atk+=it.atk||0;hp+=it.hp||0;def+=it.def||0;spd+=it.spd||0;
  }
  e.atk=+(e._mapBase.atk+atk).toFixed(1);
  e.maxhp=Math.round(e._mapBase.maxhp+hp);
  e.speed=+(e._mapBase.speed+spd).toFixed(2);
  e.def=(e._mapBase.def||0)+def;
  if(e.hp>0)e.hp=Math.min(e.maxhp,Math.max(1,e.hp));
  // 若主程式有 gearApply 且單位像弟子，不在此呼叫（敵人無 u.gb 流程）
  return e;
}
function mapEnemyScaleRealm(e,refRealm,rng){
  if(!e||refRealm==null)return e;
  const slack=MAP_TUNE.npcBaseStatSlack||0.1;
  const r=typeof rng==='function'?rng():Math.random();
  const m=1+(r*2-1)*slack; // ±10%
  if(!e._mapBase)e._mapBase={atk:e.atk,maxhp:e.maxhp,speed:e.speed,def:e.def||0};
  // 以參考境界微調：保持接近同境
  e.realm=refRealm|0;
  e.atk=+(e._mapBase.atk*m).toFixed(1);
  e.maxhp=Math.round(e._mapBase.maxhp*m);
  e.hp=e.maxhp;
  e._mapBase={atk:e.atk,maxhp:e.maxhp,speed:e.speed,def:e.def||0};
  return e;
}
function mapZbInst(tid,rng){
  const def=mapZbByTid(tid)||mapZbPick(rng);
  const mul=mapZbPowerMul(typeof rng==='function'?rng():Math.random());
  return {
    id:'zb_'+(def.tid)+'_'+Math.floor((typeof rng==='function'?rng():Math.random())*1e9).toString(36),
    tid:def.tid,n:def.n,slot:def.slot||'zb',body:def.body||'zb',
    grade:def.grade,minRealm:def.minRealm,powerMul:mul,
    atk:def.atk||0,hp:def.hp||0,def:def.def||0,spd:def.spd||0,qi:def.qi||0
  };
}
function mapApplyZbBoost(o,inst){
  if(!o||!inst)return o;
  const m=1+(inst.powerMul!=null?inst.powerMul:mapZbPowerMul());
  if(!o._mapZbApplied){
    o._mapZbApplied=true;
    if(o.atk!=null)o.atk=+(o.atk*m).toFixed(1);
    if(o.maxhp!=null){o.maxhp=Math.round(o.maxhp*m);if(o.hp!=null)o.hp=Math.min(o.maxhp,Math.round((o.hp||o.maxhp)*m));}
    o.zbPowerMul=m;
  }
  return o;
}
// ctx: {src:'dungeon'|'carrier'|'cross', hard?, realm?, rng?, pityKey?}
function mapZbRoll(ctx){
  ctx=ctx||{};
  const Z=MAP_TUNE.zb;
  const src=ctx.src||'dungeon';
  const zb=mapEnsureZbState();
  if(!mapFlag('zhibao'))return {hit:false,tid:null,rate:0,pity:0,reason:'flag_off'};
  const rng=typeof ctx.rng==='function'?ctx.rng:(typeof mapRngStream==='function'?mapRngStream('zb',(S&&S.map&&S.map.seedExtra)||1):Math.random);
  if(src==='cross'){
    const rate=Z.crossRealmKill;
    const hit=rng()<rate;
    const tid=hit?(mapZbPick(rng,ctx.realm!=null?ctx.realm:Z.minRealm).tid):null;
    return {hit:!!hit,tid,rate,pity:0,src};
  }
  // dungeon；carrier 預設同率（MAP_TUNE.zb.carrierSameAsDungeon）
  if(src==='carrier'&&Z.carrierSameAsDungeon===false){
    // 預留：若關閉同率，仍走 dungeon 公式但標記 src（目前參數預設 true）
  }
  const rl=ctx.realm!=null?ctx.realm:Z.minRealm;
  const key=(src==='cross')?'cross':'dungeon';
  const pityOn=typeof mapZbPityOn==='function'&&mapZbPityOn();
  const pityNow=(pityOn&&zb&&zb.pity)?(zb.pity[key]|0):0;
  const rate=mapZbRollRate(pityNow,!!ctx.hard,rl);
  let forced=false;
  if(pityOn&&pityNow>=(Z.pityEvery|0))forced=true;
  const hit=forced||rng()<rate;
  if(pityOn&&zb&&zb.pity){
    if(hit)zb.pity[key]=0;
    else zb.pity[key]=pityNow+1;
  }
  const tid=hit?(mapZbPick(rng,rl).tid):null;
  return {hit:!!hit,tid,rate:forced?1:rate,pity:pityOn?((zb.pity&&zb.pity[key])|0):0,src,forced:!!forced,realm:rl};
}
function mapBanditSubN(realm){
  try{if(typeof v52N==='function'){const n=v52N(realm|0)|0;if(n>0)return n;}}catch(e){}
  return 4;
}
function mapBanditLadder(realm,sub){
  const r=Math.max(0,realm|0);let L=0;
  for(let i=0;i<r;i++)L+=mapBanditSubN(i);
  const n=mapBanditSubN(r);
  return L+Math.max(0,Math.min(n-1,sub|0));
}
function mapBanditFromLadder(L){
  L=Math.max(0,L|0);let r=0;
  for(let i=0;i<24;i++){
    const n=mapBanditSubN(i);
    if(L<n)return {realm:i,sub:L};
    L-=n;r=i+1;
  }
  return {realm:r,sub:0};
}
function mapBanditRescaleToRealm(enemy,toRealm){
  if(!enemy)return enemy;
  const rl=toRealm|0;
  const type=enemy.type||'bandit';
  let D=null;try{if(typeof ENEMY!=='undefined'&&ENEMY)D=ENEMY[type];}catch(er){}
  const ratio=(enemy.maxhp>0&&enemy.hp!=null)?(enemy.hp/enemy.maxhp):1;
  if(D&&typeof xnScaleStat==='function'){
    const hp=xnScaleStat(D.hp,rl,'hp');
    const atk=xnScaleStat(D.atk,rl,'atk');
    enemy.maxhp=Math.max(1,hp|0);
    enemy.atk=+(+atk).toFixed(1);
    if(enemy.hp!=null)enemy.hp=Math.max(1,Math.min(enemy.maxhp,Math.round(enemy.maxhp*ratio)));
    if(enemy._mapBase){enemy._mapBase.atk=enemy.atk;enemy._mapBase.maxhp=enemy.maxhp;}
    return enemy;
  }
  const from=(enemy.realm!=null)?(enemy.realm|0):0;
  if(from===rl)return enemy;
  const mul=Math.pow(1.1,rl-from);
  if(enemy.atk!=null)enemy.atk=+(enemy.atk*mul).toFixed(1);
  if(enemy.maxhp!=null){
    enemy.maxhp=Math.max(1,Math.round(enemy.maxhp*mul));
    if(enemy.hp!=null)enemy.hp=Math.max(1,Math.min(enemy.maxhp,Math.round(enemy.maxhp*ratio)));
  }
  if(enemy._mapBase){
    if(enemy._mapBase.atk!=null)enemy._mapBase.atk=+(enemy._mapBase.atk*mul).toFixed(1);
    if(enemy._mapBase.maxhp!=null)enemy._mapBase.maxhp=Math.max(1,Math.round(enemy._mapBase.maxhp*mul));
  }
  return enemy;
}
function mapEnemyClampBandit(enemy,opts){
  opts=opts||{};
  if(!enemy||!mapIsBanditEnemy(enemy,opts))return enemy;
  const cap=mapBanditRealmCap(enemy,opts);
  const range=(typeof mapBanditRealmRange==='function')?mapBanditRealmRange(enemy,opts):{min:0,max:cap};
  enemy._mapBandit=1;
  if(!enemy.type)enemy.type=(opts.type||(opts.role==='chief'?'chief':'bandit'));
  // 缺境用該地區 min，不要抬到 cap（避免新手區黑風寨被抬成大武師）
  const missing=enemy.realm==null;
  const before=missing?range.min:(enemy.realm|0);
  let after=Math.min(before,range.max,cap);
  if(missing)after=Math.max(range.min,Math.min(after,range.max,cap));
  else after=Math.min(before,range.max,cap);
  if(after!==(enemy.realm|0)||missing||(before!==after)){
    if(missing||before!==after)mapBanditRescaleToRealm(enemy,after);
  }
  enemy.realm=after;
  const nSub=mapBanditSubN(enemy.realm);
  if(enemy._mapRareBoss&&enemy.realm>=((typeof mapBanditTune==='function'&&mapBanditTune().rareCap!=null)?(mapBanditTune().rareCap|0):4)){
    enemy.realm=mapBanditRealmCap(enemy,opts);
    enemy.sub=(typeof mapBanditTune==='function'&&mapBanditTune().rareSub!=null)?(mapBanditTune().rareSub|0):0;
  }else{
    enemy.sub=Math.max(0,Math.min(nSub-1,enemy.sub|0));
  }
  if(opts.refRealm!=null)opts.refRealm=Math.min(opts.refRealm|0,range.max,cap);
  return enemy;
}
function mapBanditClampGroup(es){
  const L=(es||[]).filter(e=>e&&mapIsBanditEnemy(e));
  if(!L.length)return L;
  for(const e of L)mapEnemyClampBandit(e,{type:e.type});
  const T=(typeof mapBanditTune==='function')?mapBanditTune():{maxSubLead:3};
  const lead=(T.maxSubLead!=null)?(T.maxSubLead|0):3;
  const minions=L.filter(e=>e.type!=='chief');
  let maxM=0;
  if(minions.length){for(const e of minions)maxM=Math.max(maxM,mapBanditLadder(e.realm|0,e.sub|0));}
  else maxM=mapBanditLadder(mapBanditRealmCap('bandit'),mapBanditSubN(mapBanditRealmCap('bandit'))-1);
  for(const e of L){
    if(e.type!=='chief')continue;
    if(e._mapRareBoss)continue;
    const capL=mapBanditLadder(mapBanditRealmCap(e),mapBanditSubN(mapBanditRealmCap(e))-1);
    const want=Math.min(mapBanditLadder(e.realm|0,e.sub|0),capL,maxM+lead);
    const got=mapBanditFromLadder(want);
    if((e.realm|0)>got.realm||((e.realm|0)===got.realm&&(e.sub|0)>got.sub)){
      mapEnemyClampBandit(Object.assign(e,{realm:got.realm,sub:got.sub}),{type:'chief'});
      e.realm=got.realm;e.sub=got.sub;
    }
  }
  return L;
}
function mapBanditMaybeRare(e,rng){
  if(!e||e.type!=='chief')return e;
  const T=(typeof mapBanditTune==='function')?mapBanditTune():{};
  const ch=T.rareChance!=null?+T.rareChance:0.03;
  const roll=(typeof rng==='function'?rng():Math.random);
  if(roll<ch){
    e._mapRareBoss=1;
    e.realm=T.rareCap!=null?T.rareCap|0:4;
    e.sub=T.rareSub!=null?T.rareSub|0:0;
    if(!e.name||/[煉練]氣|築基|金丹|宗師|大武師/.test(String(e.name)))e.name='寨主';
  }
  return mapEnemyClampBandit(e,{type:'chief'});
}
function mapBanditEnforceWorld(){
  if(typeof S==='undefined'||!S||!Array.isArray(S.enemies))return 0;
  const all=S.enemies.filter(e=>e&&mapIsBanditEnemy(e));
  if(!all.length)return 0;
  const by={};
  for(const e of all){
    const k=e.raid!=null?('r:'+e.raid):(e.camp!=null?('c:'+e.camp):('s:'+e.id));
    (by[k]=by[k]||[]).push(e);
  }
  let n=0;
  for(const k in by){mapBanditClampGroup(by[k]);n+=by[k].length;}
  return n;
}
function mapEnemyDecorate(enemy,opts){
  opts=opts||{};
  if(!enemy||typeof enemy!=='object')return enemy;
  // 山賊：散兵≤大武師、頭目≤宗師（旗無關；載體同樣封頂）
  const isBandit=mapIsBanditEnemy(enemy,opts);
  if(isBandit)mapEnemyClampBandit(enemy,opts);
  const gearOn=mapFlag('enemyGear'),zbOn=mapFlag('zhibao');
  if(!gearOn&&!zbOn)return enemy; // 旗關：零副作用（山賊境已夾）
  if(typeof S!=='undefined'&&S)mapEnsureZbState();
  const rng=typeof opts.rng==='function'?opts.rng:Math.random;
  const typeKey=enemy.type||opts.type||'wolf';
  let tierName=opts.tier||MAP_ENEMY_TYPE_TIER[typeKey]||'mob';
  // 至寶載體判定（與副本掉落同機率；需 zhibao 旗）
  let asCarrier=!!opts.forceCarrier; let zbTidPref=opts.zbTid||null;
  if(zbOn&&!enemy.zbId&&!asCarrier&&(opts.allowCarrier!==false)){
    const rl=enemy.realm!=null?enemy.realm:(opts.refRealm||0);
    if(rl>=MAP_TUNE.zb.minRealm||opts.ignoreRealmGate){
      const roll=mapZbRoll({src:'carrier',hard:!!opts.hard,realm:rl,rng});
      if(roll.hit){asCarrier=true;zbTidPref=roll.tid;}
    }
  }
  if(asCarrier)tierName='carrier';
  const tier=MAP_ENEMY_TIERS[tierName]||MAP_ENEMY_TIERS.mob;
  if(!enemy._mapBase)enemy._mapBase={atk:enemy.atk||10,maxhp:enemy.maxhp||enemy.hp||100,speed:enemy.speed||2,def:enemy.def||0};
  // 先層級倍率，再 ±10% slack（最終相對「層級後基準」）
  if(tier.mul&&!enemy._mapTiered){
    enemy.atk=+(enemy._mapBase.atk*tier.mul).toFixed(1);
    enemy.maxhp=Math.round(enemy._mapBase.maxhp*tier.mul);
    enemy.hp=enemy.maxhp;
    enemy._mapBase={atk:enemy.atk,maxhp:enemy.maxhp,speed:enemy._mapBase.speed,def:enemy._mapBase.def};
    enemy._mapTiered=tierName;
  }
  if(opts.refRealm!=null){let rr=opts.refRealm|0;if(isBandit){const R=(typeof mapBanditRealmRange==='function')?mapBanditRealmRange(enemy,opts):{max:mapBanditRealmCap(enemy,opts)};rr=Math.min(rr,R.max,mapBanditRealmCap(enemy,opts));}mapEnemyScaleRealm(enemy,rr,rng);if(isBandit)mapEnemyClampBandit(enemy,opts);}
  if(opts.sectId!=null)enemy.sectId=opts.sectId;
  if(gearOn&&!enemy.eq){
    const chance=opts.gearChance!=null?opts.gearChance:tier.gearChance;
    if(rng()<chance){
      enemy.eq={};
      const tmpl=MAP_ENEMY_GEAR_TEMPLATES[tierName]||MAP_ENEMY_GEAR_TEMPLATES.mob;
      const bq=isBandit?mapBanditGearQMax(enemy.realm):tier.qMax;
      for(const [t,q] of tmpl){
        const it=mapMakeGearItem(t,Math.min(tier.qMax,bq,q),rng()<0.25?Math.floor(rng()*5):-1,enemy.id||'e');
        if(!it)continue;
        let slot=it.slot;if(slot==='c')slot=enemy.eq.c1?'c2':'c1';
        enemy.eq[slot]=it;
      }
      mapGearApplyToEnemy(enemy);
      try{mapEmit('map:enemy:gear',{eid:enemy.id,eq:enemy.eq,tier:tierName});}catch(e){}
    }
  }
  if(zbOn&&asCarrier&&!enemy.zbId){
    const tid=zbTidPref||mapZbPick(rng,enemy.realm||MAP_TUNE.zb.minRealm).tid;
    const inst=mapZbInst(tid,rng);
    enemy.zbId=inst.id;enemy.zbTid=inst.tid;
    mapApplyZbBoost(enemy,inst);
    const zb=mapEnsureZbState();
    if(zb){zb.carriers[enemy.id]=inst.tid;zb._inst=zb._inst||{};zb._inst[inst.id]=inst;}
    try{mapEmit('map:enemy:gear',{eid:enemy.id,eq:enemy.eq||null,zb:inst.tid,tier:'carrier'});}catch(e){}
    if(isBandit)mapEnemyClampBandit(enemy,opts);
  }
  if(tierName==='boss')enemy._mapBoss=1;
  mapEnsureEntityXY(enemy,enemy.x,enemy.y);
  mapEnemyCapEnforce();
  return enemy;
}
function mapZbLootToInv(inst,src){
  const zb=mapEnsureZbState();if(!zb||!inst)return false;
  zb.inv.push({id:inst.id,tid:inst.tid,bound:false,powerMul:inst.powerMul,slot:inst.slot});
  try{mapEmit('map:zb:loot',{tid:inst.tid,id:inst.id,src:src||'unknown'});}catch(e){}
  return true;
}
// Runtime idempotency for an existing carrier asset transfer, independent of random-item gates.
const MAP_ENEMY_CARRIER_TRANSFERS=new WeakMap();
function mapOnEnemyKilled(enemy,killer){
  if(!enemy)return null;
  const out={dropped:false,looted:false,tid:null,gf:null};
  try{if(typeof mapGfOnEnemyKilled==="function")out.gf=mapGfOnEnemyKilled(enemy,killer);}catch(e){}
  if(!mapFlag('zhibao')&&!mapFlag('enemyGear'))return out;
  const zb=mapEnsureZbState();
  const rng=Math.random;
  // 載體掉落：擊殺即入庫
  if(mapFlag('zhibao')&&enemy.zbId&&zb){
    if(MAP_ENEMY_CARRIER_TRANSFERS.get(enemy)===enemy.zbId)return out;
    const inst=(zb._inst&&zb._inst[enemy.zbId])||mapZbInst(enemy.zbTid||'hengxu_jie',rng);
    MAP_ENEMY_CARRIER_TRANSFERS.set(enemy,enemy.zbId);
    if(!mapZbLootToInv(inst,'carrier')){MAP_ENEMY_CARRIER_TRANSFERS.delete(enemy);return out;}
    delete zb.carriers[enemy.id];
    if(zb._inst)delete zb._inst[enemy.zbId];
    out.looted=true;out.tid=inst.tid;out.dropped=true;
    try{mapEmit('map:zb:drop',{tid:inst.tid,src:'carrier',eid:enemy.id});}catch(e){}
    return out;
  }
  if(!mapFlag('zhibao'))return out;
  const er=enemy.realm|0;const kr=(killer&&killer.realm!=null)?(killer.realm|0):er;
  let ctx=null;
  if(typeof S!=='undefined'&&S&&S.dg){
    if(er>=MAP_TUNE.zb.minRealm||(killer&&kr>=MAP_TUNE.zb.minRealm))
      ctx={src:'dungeon',hard:!!(S.dg&&S.dg.hard),realm:Math.max(er,kr),rng};
  }else if(killer&&Math.abs(kr-er)>=1){
    ctx={src:'cross',realm:Math.max(er,kr),rng};
  }
  if(!ctx)return out;
  // 副本掉落需元嬰+（敵或殺手）
  if(ctx.src==='dungeon'&&Math.max(er,kr)<MAP_TUNE.zb.minRealm)return out;
  if(typeof enemyItemDropPermit!=='function'||!enemyItemDropPermit(enemy,'map-zb'))return out;
  const roll=mapZbRoll(ctx);
  if(!roll.hit)return out;
  const inst=mapZbInst(roll.tid,rng);
  try{mapEmit('map:zb:drop',{tid:inst.tid,src:ctx.src,eid:enemy.id,forced:!!roll.forced});}catch(e){}
  mapZbLootToInv(inst,ctx.src);
  out.dropped=true;out.looted=true;out.tid=inst.tid;out.forced=!!roll.forced;
  return out;
}
// 供弟子／他宗 NPC 裝備至寶時呼叫（同倍率）
function mapUnitEquipZb(unit,tid,rng){
  if(!mapFlag('zhibao')||!unit)return null;
  const inst=mapZbInst(tid||mapZbPick(rng||Math.random).tid,rng||Math.random);
  unit.zbId=inst.id;unit.zbTid=inst.tid;
  mapApplyZbBoost(unit,inst);
  const zb=mapEnsureZbState();if(zb){zb._inst=zb._inst||{};zb._inst[inst.id]=inst;}
  return inst;
}

// ===== 山賊一波／冷卻、名牌、靠近宗門派弟子（不改 g*；延遲 wrap＋安裝守衛）=====
function mapRaidCoolSec(){
  const T=(MAP_TUNE&&MAP_TUNE.raid)||{};
  if(T.cool!=null)return T.cool|0;
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.raidCool!=null)return TUNE.raidCool|0;}catch(e){}
  return 420;
}
function mapRaidAlive(){
  try{if(typeof raidAlive==='function')return !!raidAlive();}catch(e){}
  try{const L=(S&&S.raidsActive)||[];const es=(S&&S.enemies)||[];return L.some(r=>es.some(e=>e&&e.raid===r.id&&!e.dead&&e.hp>0));}catch(e){return false;}
}
function mapRaidCanLaunch(now){
  const T=(MAP_TUNE&&MAP_TUNE.raid)||{};
  if(T.oneWave!==false&&mapRaidAlive())return false;
  try{
    const t=(now!=null)?now:(typeof S!=='undefined'&&S?S.time:0);
    if(S&&S.flags&&S.flags.raidCdUntil&&t<S.flags.raidCdUntil)return false;
  }catch(e){}
  return true;
}
function mapRaidMarkCool(now){
  const cool=mapRaidCoolSec();
  try{
    if(typeof S!=='undefined'&&S){
      S.flags=S.flags||{};
      S.flags.raidCdUntil=((now!=null)?now:(S.time||0))+cool;
    }
  }catch(e){}
  return cool;
}
function mapRaidComposeTxt(es){
  try{if(typeof raidComposeTxt==='function')return raidComposeTxt(es);}catch(e){}
  const cnt={};
  for(const e of (es||[])){
    const r=Math.max(0,e.realm|0);
    const n=(typeof REALMS!=='undefined'&&REALMS[r]&&REALMS[r].n)||('境'+r);
    cnt[n]=(cnt[n]||0)+1;
  }
  const parts=[];
  if(typeof REALMS!=='undefined'&&Array.isArray(REALMS)){
    for(const R of REALMS)if(R&&cnt[R.n])parts.push(R.n+'×'+cnt[R.n]);
  }
  for(const n in cnt)if(!parts.some(p=>p.indexOf(n+'×')===0))parts.push(n+'×'+cnt[n]);
  return parts.join('、')||(((es&&es.length)||0)+' 名');
}
function mapRaidInstall(){
  if(mapRaidInstall._ok)return true;
  try{
    if(typeof TUNE!=='undefined'&&TUNE&&MAP_TUNE&&MAP_TUNE.raid&&MAP_TUNE.raid.cool!=null){
      TUNE.raidCool=MAP_TUNE.raid.cool;
    }
  }catch(e){}
  try{
    if(typeof launchRaid==='function'&&!launchRaid._mapRaid){
      const _lr=launchRaid;
      launchRaid=function(v){
        try{
          if(arguments[1]!=='force'&&!mapRaidCanLaunch()){
            if(v){v.raidT=(S.time||0)+45;v.warned=false;}
            return;
          }
        }catch(e){}
        return _lr.apply(this,arguments);
      };
      launchRaid._mapRaid=1;
    }
  }catch(e){}
  try{
    if(typeof checkRaids==='function'&&!checkRaids._mapRaid){
      const _cr=checkRaids;
      checkRaids=function(){
        const n0=(typeof S!=='undefined'&&S&&S.stats&&S.stats.raidsRepelled)||0;
        const r=_cr.apply(this,arguments);
        try{if((((S.stats&&S.stats.raidsRepelled)||0)>n0))mapRaidMarkCool();}catch(e){}
        return r;
      };
      checkRaids._mapRaid=1;
    }
  }catch(e){}
  try{
    if(typeof updateRaids==='function'&&!updateRaids._mapRaid){
      const _ur=updateRaids;
      updateRaids=function(dt){
        const r=_ur.apply(this,arguments);
        try{if(typeof checkRaids==='function')checkRaids();}catch(e){}
        return r;
      };
      updateRaids._mapRaid=1;
    }
  }catch(e){}
  if(typeof launchRaid==='function'&&launchRaid._mapRaid)mapRaidInstall._ok=true;
  return !!mapRaidInstall._ok;
}
mapRaidInstall._ok=false;

function mapRaidNameOnly(e){
  const D=(typeof ENEMY!=='undefined'&&e&&ENEMY[e.type])||{};
  let n=e&&e.exd===1?'叛門山賊':(D.n||(e&&e.type)||'敵人');
  n=String(n).replace(/・?(武徒|武師|大武師|宗師|[煉練]氣|築基|金丹|元嬰|化神|合體|地仙|天仙)(初期|中期|後期|圓滿|大圓滿|[一二三四五六七八九]層)?/g,'');
  return n.replace(/・+$/,'').trim()||'敵人';
}
function mapRaidRealmVisible(e,viewer){
  try{
    if(typeof v162See==='function'){
      const v=v162See(e,viewer||(typeof player==='function'?player():null));
      if(v&&v.r<0)return false;
      return true;
    }
  }catch(err){}
  try{
    const p=viewer||(typeof player==='function'?player():null);
    if(p&&e&&(e.realm|0)>(p.realm|0))return false;
  }catch(err){}
  return true;
}
function mapRaidPlateName(e,viewer){
  if(e&&e.type==='xfboss'&&typeof mapXfBossDisplayName==='function')return mapXfBossDisplayName();
  const name=mapRaidNameOnly(e);
  let realm='???';
  if(mapRaidRealmVisible(e,viewer)){
    try{if(typeof v51RName==='function')realm=v51RName(e);}catch(err){}
    if(!realm||realm==='???'){
      try{realm=(typeof REALMS!=='undefined'&&REALMS[e.realm|0]&&REALMS[e.realm|0].n)||'???';}catch(err){}
    }
  }
  return name+'・'+realm;
}
function mapRaidStackOffsets(enemies,viewOf){
  const T=(MAP_TUNE&&MAP_TUNE.nameplate)||{};
  const dy=T.stackDy!=null?T.stackDy:11;
  const lim=T.clusterPx!=null?T.clusterPx:48;
  const L=(enemies||[]).filter(e=>e&&!e.dead);
  const out=new Map();
  const used=new Set();
  for(let i=0;i<L.length;i++){
    if(used.has(i))continue;
    const cluster=[i];used.add(i);
    let xi=0,yi=0;
    try{const p=viewOf?viewOf(L[i]):{x:L[i].x,y:L[i].y};xi=p.x;yi=p.y;}catch(e){xi=L[i].x;yi=L[i].y;}
    for(let j=i+1;j<L.length;j++){
      if(used.has(j))continue;
      let xj=0,yj=0;
      try{const p=viewOf?viewOf(L[j]):{x:L[j].x,y:L[j].y};xj=p.x;yj=p.y;}catch(e){xj=L[j].x;yj=L[j].y;}
      const dWorld=Math.hypot((L[j].x||0)-(L[i].x||0),(L[j].y||0)-(L[i].y||0));
      const dPx=viewOf?Math.hypot(xj-xi,yj-yi):1e9;
      if(dWorld<2.2||dPx<lim){cluster.push(j);used.add(j);}
    }
    cluster.forEach((idx,k)=>{out.set(L[idx],{dy:-k*dy,dx:((k%2)?4:-4)*Math.min(1,k)});});
  }
  return out;
}
function mapPlateInstall(){
  if(mapPlateInstall._ok)return true;
  try{
    if(typeof enemyName==='function'&&!enemyName._mapRaidPlate){
      const _en=enemyName;
      enemyName=function(e){
        try{
          if(e&&e.type==='xfboss'&&typeof mapXfBossDisplayName==='function')return mapXfBossDisplayName();
          if(e&&(e.raid||e._mapBandit||e.type==='bandit'||e.type==='chief'||(typeof ENEMY!=='undefined'&&ENEMY&&ENEMY[e.type])))return mapRaidPlateName(e);
        }catch(err){}
        return _en.apply(this,arguments);
      };
      enemyName._mapRaidPlate=1;
    }
  }catch(e){}
  try{
    if(typeof XENL!=='undefined'&&XENL){mapPlateInstall._ok=true;return true;}
    if(typeof label==='function'&&!label._mapRaidPlate){
      const _lb=label;
      label=function(t,x,y,c,f){
        try{
          const e=typeof XENL!=='undefined'&&XENL&&XENL.cur;
          if(e&&(e.raid||e._mapBandit||e.type==='bandit'||e.type==='chief')){
            const off=mapRaidStackOffsets(S&&S.enemies).get(e);
            if(off){y=y+off.dy;x=x+off.dx;}
          }
        }catch(err){}
        return _lb.call(this,t,x,y,c,f);
      };
      label._mapRaidPlate=1;
    }
  }catch(e){}
  mapPlateInstall._ok=true;
  return true;
}
mapPlateInstall._ok=false;

function mapDefendPow(u){
  if(!u)return 0;
  try{if(typeof tourPow==='function')return +tourPow(u)||0;}catch(e){}
  try{if(typeof mapPartyPowerOf==='function')return +mapPartyPowerOf(u)||0;}catch(e){}
  return (u.atk||10)+(u.realm||0)*12+((u.maxhp||u.hp||50)/20);
}
function mapDefendTune(){return (MAP_TUNE&&MAP_TUNE.defend)||{};}
function mapDefendDist(ax,ay,bx,by){
  try{if(typeof dist==='function')return dist(ax,ay,bx,by);}catch(e){}
  return Math.hypot((ax||0)-(bx||0),(ay||0)-(by||0));
}
function mapDefendCenter(){
  try{if(typeof sectCenter==='function')return sectCenter();}catch(e){}
  try{if(typeof ANCH!=='undefined'&&ANCH&&ANCH.start)return ANCH.start;}catch(e){}
  try{
    if(typeof S!=='undefined'&&S&&Array.isArray(S.buildings)){
      const h=S.buildings.find(b=>b&&b.type==='hall'&&b.built!==false);
      if(h){const s=mapDefendBldSize(h);return {x:(h.i||0)+s/2,y:(h.j||0)+s/2};}
    }
  }catch(e){}
  try{const p=typeof player==='function'?player():null;if(p)return {x:p.x,y:p.y};}catch(e){}
  return {x:64,y:64};
}
function mapDefendBldSize(b){
  if(!b)return 2;
  try{if(typeof BUILD!=='undefined'&&BUILD&&BUILD[b.type]&&BUILD[b.type].size)return BUILD[b.type].size||2;}catch(e){}
  if(b.size)return b.size|0;
  return 2;
}
function mapDefendBldCenter(b){
  const s=mapDefendBldSize(b);
  const i=(b.i!=null)?+b.i:((b.x!=null)?+b.x:0);
  const j=(b.j!=null)?+b.j:((b.y!=null)?+b.y:0);
  return {x:i+s/2,y:j+s/2,s:s};
}
function mapDefendArea(){
  const T=mapDefendTune();
  const c=mapDefendCenter();
  const pad=(T.areaPad!=null)?+T.areaPad:6;
  let R=(T.approachR!=null)?+T.approachR:22;
  try{
    const bs=(typeof S!=='undefined'&&S&&S.buildings)||[];
    for(const b of bs){
      if(!b||b.broken||b.built===false)continue;
      const p=mapDefendBldCenter(b);
      R=Math.max(R,mapDefendDist(c.x,c.y,p.x,p.y)+p.s/2+pad);
    }
  }catch(e){}
  return {x:c.x,y:c.y,R:R};
}
function mapDefendThreats(){
  if(typeof S==='undefined'||!S||!Array.isArray(S.enemies))return [];
  const T=mapDefendTune();
  const A=mapDefendArea();
  const near=(T.nearBuild!=null)?+T.nearBuild:8;
  const bs=S.buildings||[];
  return S.enemies.filter(e=>{
    if(!e||e.dead||!(e.hp>0)||e.flee)return false;
    if(mapDefendDist(e.x,e.y,A.x,A.y)<=A.R)return true;
    for(const b of bs){
      if(!b||b.broken||b.built===false)continue;
      const p=mapDefendBldCenter(b);
      if(mapDefendDist(e.x,e.y,p.x,p.y)<=near+p.s/2)return true;
    }
    return false;
  });
}
function mapDefendForced(u){
  if(!u)return true;
  if(u.job==='follow')return true;
  try{if(typeof xmvOn==='function'&&xmvOn(u))return true;}catch(e){}
  try{if(u.xcmd&&S&&S.time<u.xcmd.until)return true;}catch(e){}
  if(u.task&&u.task.man===1)return true;
  if(u._playerCmd||u.cmdLock||u.forceJob)return true;
  return false;
}
function mapDefendJobRank(u){
  const j=u&&u.job;
  if(j==='guard')return 0;
  if(j==='train')return 1;
  if(!j||j==='idle'||j==='none'||j==='wait')return 2;
  if(j==='gather'||(typeof j==='string'&&j.indexOf('gather')===0))return 3;
  return -1;
}
function mapDefendIdle(u){
  if(!u||u.kind!=='disciple'||u.dead||u.inside||u.inB)return false;
  if(u._mapDefend)return false;
  if(mapDefendForced(u))return false;
  const j=u.job;
  if(j&&j!=='idle'&&j!=='none'&&j!=='wait')return false;
  try{if(u.aiJob&&(u.aiJob.k==='rest'||u.aiJob.y47sl))return false;}catch(e){}
  return true;
}
function mapDefendEligible(u){
  if(!u||u.kind!=='disciple'||u.dead||u.inside||u.inB)return false;
  if(u._mapDefend)return false;
  if(mapDefendForced(u))return false;
  if(u.job==='seclude'||u.job==='dual')return false;
  try{if(u.away||u.mission||u.expd||u.dgIn)return false;}catch(e){}
  try{if(u.xco&&u.xco.st&&u.xco.st!=='agg'&&typeof xcoOk==='function'&&xcoOk(u))return false;}catch(e){}
  try{if(u.aiJob&&(u.aiJob.k==='rest'||u.aiJob.y47sl))return false;}catch(e){}
  try{if(u.inj&&(u.inj.k==='heavy'||u.inj.k==='meridian'))return false;}catch(e){}
  return mapDefendJobRank(u)>=0;
}
function mapDefendHealthy(u){
  const need=mapDefendTune().healthyHp!=null?mapDefendTune().healthyHp:0.5;
  if(!u||u.dead||!(u.hp>0))return false;
  if((u.hp/(u.maxhp||1))<need)return false;
  try{if(typeof injOf==='function'&&injOf(u))return false;}catch(e){}
  return true;
}
function mapDefendCandidates(){
  if(typeof S==='undefined'||!S||!Array.isArray(S.units))return [];
  return S.units.filter(u=>mapDefendEligible(u)&&mapDefendHealthy(u));
}
function mapDefendPick(threats,defenders){
  const T=mapDefendTune();
  const mul0=(T.powerMul&&T.powerMul[0]!=null)?T.powerMul[0]:1.2;
  const mul1=(T.powerMul&&T.powerMul[1]!=null)?T.powerMul[1]:1.5;
  const minR=T.minUnitRatio!=null?T.minUnitRatio:0.4;
  const tp=(threats||[]).reduce((s,e)=>s+mapDefendPow(e),0);
  const wantLo=tp*mul0,wantHi=tp*mul1;
  const meanT=(threats&&threats.length)?tp/threats.length:0;
  const minP=meanT*minR;
  let sum=(defenders||[]).reduce((s,u)=>s+mapDefendPow(u),0);
  const have=new Set((defenders||[]).map(u=>u.id));
  const pool=mapDefendCandidates().filter(u=>!have.has(u.id)).sort((a,b)=>{
    const ra=mapDefendJobRank(a),rb=mapDefendJobRank(b);
    if(ra!==rb)return ra-rb;
    return mapDefendPow(b)-mapDefendPow(a);
  });
  const pick=[];
  for(const u of pool){
    const p=mapDefendPow(u);
    if(p<minP)continue;
    if(sum>=wantHi)break;
    if(sum>=wantLo&&sum+p>wantHi)break;
    pick.push(u);sum+=p;
  }
  return {pick,sum,wantLo,wantHi,tp};
}
function mapDefendIsLosing(defs,threats){
  if(!defs||!defs.length)return true;
  const T=mapDefendTune();
  const lim=T.losingHp!=null?T.losingHp:0.45;
  const hp=defs.reduce((s,u)=>s+(u.hp/(u.maxhp||1)),0)/defs.length;
  if(hp<=lim)return true;
  const dp=defs.reduce((s,u)=>s+mapDefendPow(u),0);
  const tp=(threats||[]).reduce((s,e)=>s+mapDefendPow(e),0);
  return dp<tp;
}
function mapDefendLock(u,tgt){
  if(!u||!tgt)return false;
  try{
    if(typeof setTask==='function')setTask(u,{type:'attack',eid:tgt.id,_mapDefend:1});
    else u.task={type:'attack',eid:tgt.id,_mapDefend:1};
  }catch(e){u.task={type:'attack',eid:tgt.id,_mapDefend:1};}
  try{u.path=[];u.medit=false;u.target=tgt;u.thought='❗';}catch(e){}
  return true;
}
function mapDefendSend(us,threats){
  if(!us||!us.length)return 0;
  const tgt=(threats||[]).slice().sort((a,b)=>(b.hp||0)-(a.hp||0))[0];
  let n=0;
  for(const u of us){
    u._mapDefend={job:u.job,jobB:u.jobB,jobRes:u.jobRes,task:u.task,holdAt:u.holdAt,guardAt:u.guardAt};
    if(mapDefendLock(u,tgt))n++;
  }
  return n;
}
function mapDefendRecall(){
  if(typeof S==='undefined'||!S||!Array.isArray(S.units))return 0;
  let n=0;
  for(const u of S.units){
    if(!u||!u._mapDefend)continue;
    const prev=u._mapDefend;
    u.job=prev.job;u.jobB=prev.jobB;u.jobRes=prev.jobRes;u.holdAt=prev.holdAt;
    if(prev.guardAt)u.guardAt=prev.guardAt;
    try{if(typeof setTask==='function')setTask(u,prev.task||null);else u.task=prev.task||null;}catch(e){u.task=prev.task||null;}
    delete u._mapDefend;n++;
  }
  return n;
}
function mapDefendGuardLock(threats){
  if(typeof S==='undefined'||!S||!Array.isArray(S.units))return 0;
  const T=mapDefendTune();
  let detect=14;
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.v50&&TUNE.v50.guardDetect!=null)detect=TUNE.v50.guardDetect;}catch(e){}
  if(T.guardDetect!=null)detect=T.guardDetect;
  let n=0;
  for(const u of S.units){
    if(!u||u.kind!=='disciple'||u.job!=='guard'||u.dead||u.inside||u.retreat)continue;
    if(mapDefendForced(u))continue;
    const cur=(u.task&&u.task.type==='attack')?((S.enemies||[]).find(e=>e&&e.id===u.task.eid&&!e.dead&&e.hp>0)):null;
    if(cur)continue;
    let best=null,bd=1e9;
    for(const e of (threats||[])){
      const d=mapDefendDist(u.x,u.y,e.x,e.y);
      if(d<bd){bd=d;best=e;}
    }
    if(!best)continue;
    if(mapDefendLock(u,best))n++;
  }
  return n;
}
function mapDefendIsTower(b){
  if(!b||!b.type)return false;
  if(/tower|turret|shao|watch|arrow|sentry|paotai|弩|箭|哨塔/i.test(String(b.type)))return true;
  try{
    const D=(typeof BUILD!=='undefined'&&BUILD&&BUILD[b.type])||{};
    if(D&&(D.atk||D.atkR||D.shotR||D.range))return true;
  }catch(e){}
  return !!(b.atk||b.atkR||b.shotR);
}
function mapDefendTowerLock(threats){
  if(typeof S==='undefined'||!S||!Array.isArray(S.buildings))return 0;
  if(!threats||!threats.length)return 0;
  let n=0;
  for(const b of S.buildings){
    if(!b||b.broken||b.built===false||!mapDefendIsTower(b))continue;
    const p=mapDefendBldCenter(b);
    let range=12;
    try{
      const D=(typeof BUILD!=='undefined'&&BUILD&&BUILD[b.type])||{};
      range=b.atkR||b.shotR||b.range||D.atkR||D.shotR||D.range||12;
    }catch(e){}
    let best=null,bd=range;
    for(const e of threats){
      const d=mapDefendDist(e.x,e.y,p.x,p.y);
      if(d<=bd){bd=d;best=e;}
    }
    if(!best)continue;
    b.target=best.id;b.tgt=best.id;b.eid=best.id;
    n++;
  }
  return n;
}
function mapDefendTick(dt){
  if(typeof S==='undefined'||!S||S.dg||S.interior)return 0;
  const T=mapDefendTune();
  S.map=S.map||{};
  S.map.defendAcc=(S.map.defendAcc||0)+(dt||0);
  if(S.map.defendAcc<(T.tickAcc!=null?T.tickAcc:0.8))return 0;
  S.map.defendAcc=0;
  const threats=mapDefendThreats();
  const defs=(S.units||[]).filter(u=>u&&u._mapDefend&&!u.dead);
  if(!threats.length){return mapDefendRecall();}
  let n=0;
  try{n+=mapDefendGuardLock(threats);}catch(e){}
  try{n+=mapDefendTowerLock(threats);}catch(e){}
  if(defs.length&&!mapDefendIsLosing(defs,threats))return n;
  const r=mapDefendPick(threats,defs);
  return n+mapDefendSend(r.pick,threats);
}
function mapDefendInstall(){
  if(mapDefendInstall._ok)return true;
  try{
    if(typeof update==='function'&&!update._mapDefend){
      const _u=update;
      update=function(dt){
        const r=_u.apply(this,arguments);
        try{mapDefendTick(dt);}catch(e){}
        return r;
      };
      update._mapDefend=1;
    }
  }catch(e){}
  try{
    if(typeof v50DefTick==='function'&&!v50DefTick._mapDefend){
      const _t=v50DefTick;
      v50DefTick=function(st){
        let r;
        try{r=_t.apply(this,arguments);}catch(e){}
        try{mapDefendTick(typeof st==='number'?st:1);}catch(e){}
        return r;
      };
      v50DefTick._mapDefend=1;
    }
  }catch(e){}
  try{
    if(typeof v50GuardJob==='function'&&!v50GuardJob._mapDefend){
      const _g=v50GuardJob;
      v50GuardJob=function(u,dt){
        try{
          if(u&&u.task&&u.task.type==='attack')return false;
          const threats=mapDefendThreats();
          if(threats.length&&u&&u.job==='guard'&&!mapDefendForced(u)){
            mapDefendGuardLock(threats);
            if(u.task&&u.task.type==='attack')return false;
          }
        }catch(e){}
        return _g.apply(this,arguments);
      };
      v50GuardJob._mapDefend=1;
    }
  }catch(e){}
  try{
    if(typeof v164Area==='function'&&!v164Area._mapDefend){
      const _a=v164Area;
      v164Area=function(){
        try{return _a.apply(this,arguments);}catch(e){return mapDefendArea();}
      };
      v164Area._mapDefend=1;
    }
  }catch(e){}
  mapDefendInstall._ok=!!((typeof update==='function'&&update._mapDefend)||(typeof v50DefTick==='function'&&v50DefTick._mapDefend)||mapDefendInstall._ok);
  if(typeof update!=='function'&&typeof v50DefTick!=='function')mapDefendInstall._ok=true;
  return !!mapDefendInstall._ok;
}
mapDefendInstall._ok=false;

function mapBanditInstall(){
  if(mapBanditInstall._ok)return true;
  try{
    if(typeof makeEnemy==='function'&&!makeEnemy._mapBanditCap){
      const _me=makeEnemy;
      makeEnemy=function(type,x,y,o){
        const e=_me.apply(this,arguments);
        try{
          if(e&&mapIsBanditEnemy(e,{type:type})){
            if(type==='chief'&&!(o&&o._mapRareBoss)&&!e._mapRareBoss)mapBanditMaybeRare(e);
            mapEnemyClampBandit(e,{type:type||(e&&e.type)});
          }
        }catch(err){}
        return e;
      };
      makeEnemy._mapBanditCap=1;
    }
  }catch(e){}
  try{
    if(typeof spawnCampMember==='function'&&!spawnCampMember._mapBanditCap){
      const _sc=spawnCampMember;
      spawnCampMember=function(v,role){
        const e=_sc.apply(this,arguments);
        try{
          if(e)mapEnemyClampBandit(e,{type:e.type,role:role});
          if(v&&typeof S!=='undefined'&&S)mapBanditClampGroup((S.enemies||[]).filter(x=>x&&x.camp===v.id&&!x.raid));
        }catch(err){}
        return e;
      };
      spawnCampMember._mapBanditCap=1;
    }
  }catch(e){}
  try{
    if(typeof launchRaid==='function'&&!launchRaid._mapBanditCap){
      const _lr=launchRaid;
      launchRaid=function(v){
        const before=(typeof S!=='undefined'&&S&&S.enemies)?S.enemies.slice():[];
        const r=_lr.apply(this,arguments);
        try{
          const extra=(S.enemies||[]).filter(e=>e&&before.indexOf(e)<0);
          const wave=extra.filter(e=>mapIsBanditEnemy(e));
          if(wave.length)mapBanditClampGroup(wave);
          else if(v)mapBanditClampGroup((S.enemies||[]).filter(e=>e&&e.camp===v.id&&e.raid));
        }catch(err){}
        return r;
      };
      launchRaid._mapBanditCap=1;
    }
  }catch(e){}
  mapBanditInstall._ok=!!(typeof makeEnemy==='function'&&makeEnemy._mapBanditCap);
  try{mapBanditEnforceWorld();}catch(e){}
  return !!mapBanditInstall._ok;
}
mapBanditInstall._ok=false;

function mapBatch5Install(){
  let n=0;
  try{if(mapRaidInstall())n++;}catch(e){}
  try{if(mapPlateInstall())n++;}catch(e){}
  try{if(mapDefendInstall())n++;}catch(e){}
  try{if(mapBanditInstall())n++;}catch(e){}
  return n;
}
if(typeof setTimeout==='function'){
  setTimeout(function mapBatch5Boot(){
    try{mapBatch5Install();}catch(e){}
    if(mapRaidInstall._ok&&mapPlateInstall._ok&&(typeof update!=='function'||mapDefendInstall._ok)&&(typeof makeEnemy!=='function'||mapBanditInstall._ok))return;
    setTimeout(mapBatch5Boot,40);
  },0);
}else{
  try{mapBatch5Install();}catch(e){}
}
