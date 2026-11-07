// ================== cult_death.js：重傷逃走、元神、復活 ===================
function cultIsYuanYing(u){return u&&(u.realm||0)>=7;}

function cultGrantKillXiu(src,e){
  if(typeof cultCoopActive==='function'?cultCoopActive():(typeof Cult!=='undefined'&&Cult.coopActive&&Cult.coopActive()))return;
  try{
    const D=typeof ENEMY!=='undefined'&&e&&ENEMY[e.type];
    const xv=Math.round(((D&&D.xiu)||10)*(1+(e.realm||0)*0.5));
    Cult._combatGain=1;
    if(src&&src.kind&&typeof gainXiu==='function')gainXiu(src,xv);
    if(S&&S.units)for(const u of S.units)if(u!==src&&!u.dead&&typeof dist==='function'&&dist(u.x,u.y,e.x,e.y)<6)gainXiu(u,Math.round(xv*0.3));
  }catch(e){}finally{Cult._combatGain=0;}
}
function cultDropLoot(src,e){
  if(!e||e.cultLooted)return;
  e.cultLooted=1;
  try{
    if(typeof rollDrops==='function')rollDrops(e,function(k,a,b){
      if(k==='m'&&typeof addMat==='function')addMat(a,b,e.x,e.y);
      else if(k==='g'&&typeof addItem==='function'&&typeof makeItem==='function')addItem(makeItem(a,b,typeof rnd==='function'&&rnd()<0.3?(typeof ri==='function'?ri(0,4):0):-1),e.x,e.y);
    });
    const D=typeof ENEMY!=='undefined'&&ENEMY[e.type];
    if(D&&D.food&&S&&S.res){S.res.food=(S.res.food||0)+D.food;if(typeof floater==='function')floater(e.x,e.y,'+'+D.food+' 食物','#ff8a8a');}
  }catch(err){}
}

// 首領／頭目／元神：致死不逃，正常擊殺掉落
function cultFleeImmune(e){
  if(!e||e.cultYS||e.type==='yuanshen')return true;
  const D=typeof ENEMY!=='undefined'&&ENEMY[e.type];
  if(D&&D.boss)return true;
  if(e.type==='king'||e.type==='chief')return true;
  if(e.boss||e.exd==='boss'||e.tier==='boss')return true;
  return false;
}
// 正氣血低血量逃跑沿用既有機率與限幅；不視為本次新增或使用者指定的數字。
function cultFleeChance(e){
  let p=(CULT_CFG&&CULT_CFG.enemyFleeChance!=null)?+CULT_CFG.enemyFleeChance:0.25;
  const r=e.realm||0;
  p+=Math.max(0,(2-r)*0.02);
  if(e.type==='bandit'||e.type==='militia')p+=0.03;
  if(typeof clamp==='function')return clamp(p,0.20,0.30);
  return Math.max(0.20,Math.min(0.30,p));
}
cultShouldWoundEnemy=function(e){
  if(!e||cultIsYuanYing(e)||e.cultYS)return false;
  if(e.flee)return false;              // 已在逃走 → 追擊可擊殺
  if(cultFleeImmune(e))return false;
  const roll=typeof rnd==='function'?rnd():Math.random();
  return roll<cultFleeChance(e);
};

cultWoundEnemy=function(src,e,amt){
  if(!e||e.dead)return;
  if((e.hp||0)<=0)return;            // 氣血歸零＝死亡，不再改血／吃掉傷害
  e.flee=true;e.target=null;e.path=[];
  // 不改 hp、不呼叫 cultApplyWound（該函式會把氣血重設成上限 20%）
  e.cultHome={x:e.home&&e.home.x!=null?e.home.x:e.x,y:e.home&&e.home.y!=null?e.home.y:e.y};
  if(typeof floater==='function')floater(e.x,e.y,'重傷逃走','#ffb0a0');
  try{Cult.emit('cult:enemyFlee',{id:e.id,type:e.type,chase:1});}catch(err){}
  return;
};

cultMaybeFleeAfterHit=function(src,e){
  if(!e||e.dead||e.flee||(e.hp||0)<=0)return;
  const th=(CULT_CFG&&CULT_CFG.enemyFleeHp!=null)?+CULT_CFG.enemyFleeHp:0.15;
  if(e.hp>=(e.maxhp||1)*th)return;
  if(!cultShouldWoundEnemy(e))return;
  cultWoundEnemy(src,e,0);
};

function cultArchiveFled(src,e){
  if(!e)return;
  try{cultDropLoot(src,e);}catch(err){}
  const frac=(CULT_CFG&&CULT_CFG.enemyFleeHp!=null)?+CULT_CFG.enemyFleeHp:0.15;
  e.hp=Math.max(1,Math.floor((e.maxhp||1)*frac));
  e.dead=false;e.flee=true;e.target=null;e.path=[];
  e.cultHome={x:e.home&&e.home.x!=null?e.home.x:e.x,y:e.home&&e.home.y!=null?e.home.y:e.y};
  e.cultReturnAt=((typeof S!=='undefined'&&S&&S.time)||0)+((CULT_CFG&&CULT_CFG.enemyReturn)||180);
  try{
    if(S&&S.enemies){const i=S.enemies.indexOf(e);if(i>=0)S.enemies.splice(i,1);}
    if(typeof S!=='undefined'&&S){S.cultFled=S.cultFled||[];if(!S.cultFled.some(x=>x&&x.id===e.id))S.cultFled.push(e);}
  }catch(err2){}
  if(typeof floater==='function')floater(e.x,e.y,'重傷逃走','#ffb0a0');
  try{Cult.emit('cult:enemyFlee',{id:e.id,type:e.type,returnAt:e.cultReturnAt});}catch(err3){}
}

cultEnemyLethal=function(_ke,src,e){
  if(!e||e.cultYS)return false;
  if(cultIsYuanYing(e)){cultSpawnYuanShen(e,src,'enemy');return true;}
  if(typeof cultFleeImmune==='function'&&cultFleeImmune(e))return false;
  // 普通敵人致死走既有擊殺；完整結算傷害，不補血轉入逃走歸檔。
  // 正氣血的重傷逃跑仍由 cultMaybeFleeAfterHit 判定，已逃敵人可追擊擊殺。
  return false;
};

function cultReturnFled(){
  if(!S||!S.cultFled||!S.cultFled.length)return;
  const keep=[];
  for(const e of S.cultFled){
    if((e.cultReturnAt||0)>S.time){keep.push(e);continue;}
    e.dead=false;e.flee=false;e.hp=e.maxhp;e.cultWound=null;e.cultLooted=0;
    if(typeof enemyItemDropReset==='function')enemyItemDropReset(e);
    const h=e.cultHome||e.home||{x:e.x,y:e.y};e.x=h.x;e.y=h.y;
    S.enemies.push(e);
    Cult.emit('cult:enemyReturn',{id:e.id,type:e.type});
  }
  S.cultFled=keep;
}

function cultSnapshotUnit(u){
  return {id:u.id,kind:u.kind,name:u.name,body:u.body,realm:u.realm,sub:u.sub||0,xiu:u.xiu,maxhp:u.maxhp,atk:u.atk,speed:u.speed,x:u.x,y:u.y,diyun:cultDiyunOf(u)};
}

function cultSpawnYuanShen(u,src,why,opt){
  if(!u)return null;
  opt=opt||{};
  const preserve=!!opt.preserveBody;
  const snap={dead:u.dead,hp:u.hp,x:u.x,y:u.y,respawn:u.respawn,y47dn:u.y47dn,inUnits:!!(S&&S.units&&S.units.includes(u))};
  u.dead=true;u.hp=0;
  const hp=Math.max(8,Math.round((u.maxhp||50)*CULT_CFG.yuanShenHpFrac));
  const x=u.x,y=u.y;
  if(typeof ENEMY!=='undefined'&&!ENEMY.yuanshen)ENEMY.yuanshen={n:'元神',hp:40,atk:0,spd:3,r:0.28,xiu:0,aggro:0,leash:99};
  const ys={
    id:typeof nid==='function'?nid():(Date.now()&0xffff),
    type:'yuanshen',cultYS:1,ownerId:u.id,ownerKind:u.kind,why:why||'death',
    name:(u.name||'修士')+'的元神',hp:hp,maxhp:hp,atk:0,speed:CULT_CFG.yuanShenSpd,r:0.28,
    realm:u.realm,x:x,y:y,home:{x:x,y:y},
    t0:S.time,life:CULT_CFG.yuanShenLife,
    vx:0,vy:0,dvx:0,dvy:0,path:[],target:null,face:1,faceT:1,walk:0,anim:0,
    cd:0,slowT:0,stun:0,repath:0,needRepath:false,wt:0,scan:0,lod:0,
    stuck:0,stk:0,stx:x,sty:y,camp:null,raid:null,zone:null,patrol:null,pidx:0,
    leash:99,aggro:0,dead:false,flee:false,
    snap:cultSnapshotUnit(u)
  };
  u.cultYS={id:ys.id,t0:S.time};
  if(u.kind==='player'){u.respawn=1e9;u.dead=true;}
  S.cultYuanShen=S.cultYuanShen||[];S.cultYuanShen.push(ys);
  if(S.enemies)S.enemies.push(ys);
  if(typeof floater==='function')floater(u.x,u.y,'元神出竅','#d8c8ff');
  if(typeof toast==='function')toast(`${ys.name}逸出！數秒內滅其神魂可阻止復活`);
  Cult.emit('cult:yuanShen',{id:ys.id,ownerId:u.id,life:ys.life,hp:ys.hp});
  if(preserve){
    u.dead=snap.dead;u.hp=snap.hp;u.x=snap.x;u.y=snap.y;u.respawn=snap.respawn;u.y47dn=snap.y47dn;
    if(S&&S.units){
      const now=S.units.includes(u);
      if(snap.inUnits&&!now)S.units.push(u);
      if(!snap.inUnits&&now){const i=S.units.indexOf(u);if(i>=0)S.units.splice(i,1);}
    }
  }
  return ys;
}

cultHitYuanShen=function(ys,src,dmg){
  if(!ys||!ys.cultYS)return;
  ys.hp-=(dmg||0);
  if(typeof floater==='function')floater(ys.x,ys.y,'-' +Math.round(dmg||0),'#e0d0ff');
  if(ys.hp<=0)cultDestroyYuanShen(ys,src,'attack');
};

cultDestroyYuanShen=function(ys,src,how){
  if(!ys)return false;
  ys.hp=0;ys.dead=true;
  if(S&&S.enemies){const i=S.enemies.indexOf(ys);if(i>=0)S.enemies.splice(i,1);}
  if(S&&S.cultYuanShen)S.cultYuanShen=S.cultYuanShen.filter(x=>x!==ys&&x.id!==ys.id);
  const owner=cultOwnerOf(ys);
  if(owner){owner.cultYS=null;owner.cultYSGone=1;
    if(owner.kind==='player'){if(typeof onPlayerDeath==='function'){const f=CULT_FLAGS.death;CULT_FLAGS.death=false;try{onPlayerDeath(owner);}finally{CULT_FLAGS.death=f;}}}
    else if(owner.kind==='disciple'&&S&&S.units&&S.units.includes(owner)){S.units=S.units.filter(x=>x!==owner);if(typeof selUnits!=='undefined')selUnits=selUnits.filter(id=>id!==owner.id);}
  }
  if(typeof toast==='function')toast((ys.name||'元神')+'被滅！無法再重塑肉身');
  Cult.emit('cult:yuanShenGone',{id:ys.id,ownerId:ys.ownerId,how:how||'destroy'});
  return true;
};

function cultOwnerOf(ys){
  if(!ys||!S)return null;
  if(S.units){const u=S.units.find(x=>x.id===ys.ownerId);if(u)return u;}
  if(S.enemies){const e=S.enemies.find(x=>x.id===ys.ownerId);if(e)return e;}
  return null;
}

function cultReviveChance(u){
  let p=CULT_CFG.reviveBase+cultDiyunOf(u)*CULT_CFG.reviveDiyun;
  if(Cult.hasRevivePill(u))p+=CULT_CFG.revivePill;
  if(Cult.hasProtectTreasure(u))p+=CULT_CFG.reviveTreasure;
  return Math.max(0,Math.min(CULT_CFG.reviveCap,p));
}

function cultEscapeYuanShen(ys){
  const owner=cultOwnerOf(ys)||(ys.snap&&{id:ys.ownerId,kind:ys.ownerKind});
  if(S&&S.enemies){const i=S.enemies.indexOf(ys);if(i>=0)S.enemies.splice(i,1);}
  if(S&&S.cultYuanShen)S.cultYuanShen=S.cultYuanShen.filter(x=>x!==ys);
  const u=cultOwnerOf(ys);
  // 規格：元神逃脫後必定重塑肉身（除非已被滅魂）；不再擲「復活機率」
  Cult.emit('cult:yuanShenEscape',{id:ys.id,ownerId:ys.ownerId,always:1});
  if(u)cultReviveBody(u,'escape');
}

function cultReviveBody(u,why){
  if(!u)return;
  u.dead=false;u.cultYS=null;u.respawn=0;
  if(typeof enemyItemDropReset==='function')enemyItemDropReset(u);
  const lost=Math.floor((u.xiu||0)*CULT_CFG.deathXiuLoss);
  u.xiu=Math.max(0,(u.xiu||0)-lost);
  u.hp=Math.max(1,Math.round((u.maxhp||1)*0.35));
  u.cultWeak={t:(S&&S.time||0)+CULT_CFG.weakDur,why:why||'revive',atk:CULT_CFG.weakAtk};
  if(S&&S.units&&!S.units.includes(u)&&u.kind!=='bandit'&&u.type==null)S.units.push(u);
  if(u.kind==='player'&&typeof deathShow==='function')try{deathShow(false);}catch(e){}
  if(typeof fx==='function')fx('ring',u.x,u.y,'#d8c8ff');
  if(typeof floater==='function')floater(u.x,u.y,'重塑肉身','#d8c8ff');
  if(typeof toast==='function')toast((typeof nm==='function'?nm(u):'修士')+'元神歸位，重塑肉身（虛弱＋修為倒退）');
  Cult.emit('cult:revive',{id:u.id,why:why,xiuLost:lost,always:1});
}

cultOnLethal=function(u,src,ctx){
  if(!CULT_FLAGS.death||!u)return false;
  if(typeof cultCoopActive==='function'&&cultCoopActive()&&cultCoopAvatar(u))return false;
  if(u.cultYS)return true;
  if(!cultIsYuanYing(u)){
    cultApplyWound(u,(ctx&&ctx.why)||'lethal');
    u.dead=false;u.hp=Math.max(1,u.hp);
    if(u.kind==='player'&&typeof deathShow==='function')try{deathShow(false);}catch(e){}
    if(typeof toast==='function')toast((typeof nm==='function'?nm(u):'修士')+'氣血潰散，重傷倒地、修為倒退（元嬰前不死）');
    return true;
  }
  cultSpawnYuanShen(u,src,(ctx&&ctx.why)||'lethal');
  return true;
};

cultAfterDmgUnit=function(src,u,st){
  if(!CULT_FLAGS.death||!u)return;
  if(typeof cultCoopActive==='function'&&cultCoopActive()&&cultCoopAvatar(u))return;
  if(u.cultYS)return;
  // 已由倒地救援接手：只補修為倒退，不清 y47dn、不再另 toast「倒地」
  if(!st.dn0&&u.y47dn){
    try{if(!u._cultWoundFromDn){u._cultWoundFromDn=1;cultApplyWound(u,'down');}}catch(e){}
    return;
  }
  const gone=st.in0&&S&&S.units&&!S.units.includes(u);
  const died=(!st.dead0&&u.dead)||(u.hp<=0)||gone;
  if(!died)return;
  if(gone)S.units.push(u);
  u.dead=false;
  if(!cultIsYuanYing(u)){
    // 若同幀會進 y47Down，留給倒地系統 toast，這裡只做傷口、不重複喊「重傷未死」
    if(typeof y47DnOk==='function'&&y47DnOk(u)&&!u.y47dn){
      try{cultApplyWound(u,'combat');}catch(e){}
      return;
    }
    cultApplyWound(u,'combat');
    u.hp=Math.max(1,Math.floor((u.maxhp||1)*CULT_CFG.woundHp));
    if(u.kind==='player'&&typeof deathShow==='function')try{deathShow(false);}catch(e){}
    if(typeof toast==='function'){
      const key='wound:'+(u.id||'')+':'+(Math.floor((S&&S.time)||0));
      if(!Cult._toastOnce)Cult._toastOnce={};
      if(!Cult._toastOnce[key]){Cult._toastOnce[key]=1;toast((typeof nm==='function'?nm(u):'')+'重傷未死，修為倒退');}
    }
    Cult.emit('cult:wound',{id:u.id,why:'combat',realm:u.realm});
    return;
  }
  u.hp=0;u.dead=true;
  cultSpawnYuanShen(u,src,'combat');
};

cultHandlePlayerDeath=function(u,_pd){
  if(!CULT_FLAGS.death||!u)return false;
  if(typeof cultCoopActive==='function'&&cultCoopActive()&&cultCoopAvatar(u))return false;
  if(u.cultYSGone){u.cultYSGone=0;return false;} // 元神已滅，走原身隕
  if(!cultIsYuanYing(u)){
    cultApplyWound(u,'combat');
    u.dead=false;u.respawn=0;u.hp=Math.max(1,Math.floor((u.maxhp||1)*CULT_CFG.woundHp));
    if(typeof deathShow==='function')try{deathShow(false);}catch(e){}
    return true;
  }
  if(!u.cultYS)cultSpawnYuanShen(u,null,'playerDeath');
  u.dead=true;u.respawn=1e9;if(typeof deathShow==='function')try{deathShow(false);}catch(e){}
  return true;
};


function cultMarkDownPen(u,downId){
  if(downId==null||downId==='')return false;
  const key=String(downId);
  u._cultDownPen=u._cultDownPen||Object.create(null);
  if(u._cultDownPen[key])return true;
  u._cultDownPen[key]=1;
  return false;
}
// ctx: {why:'battle'|'dungeon'|'map'|..., src, downId, lethal:true, revive?:boolean}
// host 每個倒下結算呼叫一次；revive:true 或同一 downId 不再罰。不改 dead/hp/x/y/y47dn、不復活、不搬人、不改 run 名單。
cultApplyDownPenalty=function(u,ctx){
  ctx=ctx||{};
  if(!u)return {ok:false,reason:'no-unit'};
  if(ctx.revive)return {ok:true,applied:false,reason:'revive',downId:ctx.downId};
  if(cultMarkDownPen(u,ctx.downId))return {ok:true,applied:false,reason:'dup',downId:ctx.downId};
  const why=ctx.why||'battle';
  const src=ctx.src||null;
  if(cultIsYuanYing(u)){
    const lost=Math.floor((u.xiu||0)*CULT_CFG.deathXiuLoss);
    u.xiu=Math.max(0,(u.xiu||0)-lost);
    if(!u.cultYS)cultSpawnYuanShen(u,src,why,{preserveBody:true});
    Cult.emit('cult:downPenalty',{id:u.id,why:why,downId:ctx.downId,yuanShen:true,xiuLost:lost});
    return {ok:true,applied:true,downId:ctx.downId,xiuLost:lost,yuanShen:true};
  }
  const lost=Math.floor((u.xiu||0)*CULT_CFG.failXiuLoss);
  u.xiu=Math.max(0,(u.xiu||0)-lost);
  u.cultWound={t:(S&&S.time||0)+CULT_CFG.woundDur,why:why||'wound',xiuLost:lost,realm:u.realm,sub:u.sub||0};
  if(typeof floater==='function')floater(u.x,u.y,'重傷','#ff8080');
  Cult.emit('cult:downPenalty',{id:u.id,why:why,downId:ctx.downId,yuanShen:false,xiuLost:lost});
  return {ok:true,applied:true,downId:ctx.downId,xiuLost:lost,yuanShen:false};
};

cultEndWound=function(u){
  if(!u)return;
  u.cultWound=null;
  if(u.hp<u.maxhp*0.5)u.hp=Math.min(u.maxhp,Math.max(u.hp,u.maxhp*0.5));
};

CultTickDeath=function(dt){
  if(!S||!CULT_FLAGS.death)return;
  cultReturnFled();
  const list=(S.cultYuanShen||[]).slice();
  for(const ys of list){
    ys.life=(ys.life==null?CULT_CFG.yuanShenLife:ys.life)-dt;
    // 緩緩飄離
    ys.x+=(ys.vx||0.35)*dt;ys.y+=(ys.vy||0.15)*dt;
    if(ys.life<=0)cultEscapeYuanShen(ys);
  }
};

if(typeof ENEMY!=='undefined'&&!ENEMY.yuanshen)ENEMY.yuanshen={n:'元神',hp:40,atk:0,spd:3,r:0.28,xiu:0,aggro:0,leash:99};


function cultDefeatLoot(loser){
  const r=(loser&&loser.realm)||0;
  const loot=[{id:'lingshi',n:2+Math.floor(r*1.5)}];
  if(r<4)loot.push({id:'food',n:4});
  return loot;
}
function cultGiveLoot(winner,loot){
  if(!winner||!loot||!loot.length)return;
  for(const it of loot){
    if(!it||!(it.n>0))continue;
    if(it.id==='lingshi'&&S&&S.res)S.res.lingshi=(S.res.lingshi||0)+it.n;
    else if(it.id==='food'&&S&&S.res)S.res.food=(S.res.food||0)+it.n;
  }
}
function cultHasMiehun(u){return !!(u&&(u.cultMiehun||u.miehun||u.hasMiehun));}
function cultResolveKind(ctx){
  ctx=ctx||{};
  const kind=ctx.kind||ctx.mode||'battle';
  return kind==='duel'?'duel':kind;
}
function cultResolveDefeat(winner,loser,ctx){
  ctx=ctx||{};
  const kind=cultResolveKind(ctx);
  const lethal=kind!=='duel'&&ctx.lethal!==false&&(ctx.lethal===true||kind==='robbery'||kind==='battle'||kind==='combat'||kind==='raid'||kind==='map');
  const base={ok:true,outcome:'flee',loot:[],wounded:true,cultLoss:0};
  // 旗標關閉：安全預設、不改數值、不多附加 via/kind
  if(!CULT_FLAGS.death)return base;
  base.via='XW_DEATH';base.kind=kind;
  if(!loser)return base;
  // 非致死（比武永遠false）：負傷、不掉修為、預設無戰利品
  if(!lethal){
    if((loser.hp||0)<=0)loser.hp=Math.max(1,Math.floor((loser.maxhp||10)*0.35));
    else if(loser.maxhp)loser.hp=Math.max(1,Math.min(loser.hp,Math.floor(loser.maxhp*0.35))||loser.hp);
    loser.dead=false;
    return base;
  }
  const yy=cultIsYuanYing(loser);
  if(!yy){
    const x0=loser.xiu||0;
    if(S&&S.enemies&&S.enemies.indexOf(loser)>=0)cultWoundEnemy(winner,loser,0);
    else cultApplyWound(loser,'map');
    const lost=Math.max(0,x0-(loser.xiu||0));
    const loot=cultDefeatLoot(loser);
    cultGiveLoot(winner,loot);
    loser.dead=false;
    return {ok:true,outcome:'flee',loot:loot,wounded:true,cultLoss:lost,via:'XW_DEATH',kind:kind};
  }
  const destroy=!!(ctx.destroySoul||ctx.miehun||cultHasMiehun(winner));
  const ys=cultSpawnYuanShen(loser,winner,'map');
  const soulId=ys?String(ys.id):undefined;
  const loot=cultDefeatLoot(loser);
  cultGiveLoot(winner,loot);
  if(destroy&&ys){
    cultDestroyYuanShen(ys,winner,'miehun');
    return {ok:true,outcome:'soulDestroyed',loot:loot,wounded:false,cultLoss:0,soulId:soulId,via:'XW_DEATH',kind:kind};
  }
  return {ok:true,outcome:'dead',loot:loot,wounded:false,cultLoss:0,soulId:soulId,via:'XW_DEATH',kind:kind};
}
Cult.resolveDefeat=cultResolveDefeat;
Cult.hasMiehun=cultHasMiehun;
(function cultExportDeath(){
  const api={resolve:cultResolveDefeat};
  try{
    window.XW_DEATH=api;
    window.XW_CULT=window.XW_CULT||window.Cult||{};
    window.XW_CULT.resolveDefeat=cultResolveDefeat;
    if(window.Cult)window.Cult.resolveDefeat=cultResolveDefeat;
    if(window.XW){window.XW.death=window.XW.death||api;window.XW.death.resolve=cultResolveDefeat;}
  }catch(e){}
  setTimeout(function(){try{if(window.XW){window.XW.death=window.XW.death||{resolve:cultResolveDefeat};window.XW.death.resolve=cultResolveDefeat;}}catch(e){}},0);
})();

Cult.bindWorld=function(){
  Cult.W={
    gainXiu:typeof gainXiu==='function'?gainXiu:null,
    needXiu:typeof needXiu==='function'?needXiu:null,
    dmgUnit:typeof dmgUnit==='function'?dmgUnit:null,
    dmgEnemy:typeof dmgEnemy==='function'?dmgEnemy:null,
    doBreak:typeof doBreak==='function'?doBreak:null,
    tryBreak:typeof tryBreak==='function'?tryBreak:null,
    breakConds:typeof breakConds==='function'?breakConds:null,
    ensure:cultEnsure,
    TUNE:typeof TUNE!=='undefined'?TUNE:null,
    REALMS:typeof REALMS!=='undefined'?REALMS:null
  };
};
Cult.bindWorld();
