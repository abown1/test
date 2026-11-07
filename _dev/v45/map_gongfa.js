// ================== v0.4.x map：功法掉落（lean；僅經 CultGF／XW_GF，見 MAP_SCHEMA §15）==================
function mapGfTune(){
  try{if(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.gf)return Object.assign({},MAP_GF_DROP,MAP_TUNE.gf);}catch(e){}
  return MAP_GF_DROP;
}
function mapGfSchoolMap(){
  let m=MAP_GF_FACTION_TO_SCHOOL;
  try{if(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.gf&&MAP_TUNE.gf.schoolMap)m=Object.assign({},m,MAP_TUNE.gf.schoolMap);}catch(e){}
  return m;
}
function mapGfSchoolW(){
  let w=MAP_GF_FACTION_SCHOOL_W;
  try{if(typeof MAP_TUNE!=='undefined'&&MAP_TUNE.gf&&MAP_TUNE.gf.schoolW)w=Object.assign({},w,MAP_TUNE.gf.schoolW);}catch(e){}
  return w;
}
function mapGfPendingEnsure(){
  if(typeof S==='undefined'||!S)return null;
  if(!S.map)try{mapMigrateSave(S);}catch(e){}
  if(!S.map)return null;
  if(!Array.isArray(S.map.pendingGfLoot))S.map.pendingGfLoot=[];
  return S.map.pendingGfLoot;
}
/** 房主權威：client 不擲不發 */
function mapGfIsHost(){
  try{
    if(typeof CultGF!=='undefined'&&CultGF&&typeof CultGF.isClient==='function'&&CultGF.isClient())return false;
  }catch(e){}
  try{
    const n=(typeof XW!=='undefined'&&XW&&XW.net)||(typeof window!=='undefined'&&window.XW&&window.XW.net)||(typeof NET!=='undefined'?NET:null);
    if(n&&n.role==='client')return false;
  }catch(e){}
  return true;
}
/** 優先 XW_GF；別名 XW_CULT／Cult.grantGongfa；CultGF */
function mapGfApi(){
  try{
    if(typeof window!=='undefined'){
      if(window.XW_GF)return window.XW_GF;
      if(window.CultGF)return window.CultGF;
      if(window.XW_CULT&&typeof window.XW_CULT.grantGongfa==='function'){
        const C=window.CultGF||{};
        return {grant:window.XW_CULT.grantGongfa.bind(window.XW_CULT),grantGongfa:window.XW_CULT.grantGongfa.bind(window.XW_CULT),rollDrop:C.rollDrop,grantManual:C.grantManual,list:C.list||C.catalog,bagCount:C.bagCount};
      }
      if(window.Cult&&typeof window.Cult.grantGongfa==='function'){
        const C=window.CultGF||{};
        return {grant:window.Cult.grantGongfa.bind(window.Cult),grantGongfa:window.Cult.grantGongfa.bind(window.Cult),rollDrop:C.rollDrop,grantManual:C.grantManual,list:C.list||C.catalog,bagCount:C.bagCount};
      }
    }
  }catch(e){}
  try{if(typeof CultGF!=='undefined'&&CultGF)return CultGF;}catch(e){}
  return null;
}
function mapGfHasGrant(){
  const A=mapGfApi();
  return !!(A&&(typeof A.grant==='function'||typeof A.grantGongfa==='function'||typeof A.grantManual==='function'));
}
function mapGfBagCount(id){
  try{
    const A=mapGfApi();
    if(A&&typeof A.bagCount==='function')return A.bagCount(id)|0;
    if(typeof S!=='undefined'&&S&&S.gfBag)return (S.gfBag[id]|0);
  }catch(e){}
  return 0;
}
function mapGfSchoolFromFaction(faction,rng){
  rng=rng||Math.random;
  const direct=mapGfSchoolMap()[faction];
  if(direct)return direct;
  const W=mapGfSchoolW();
  const w=W[faction]||W.san||{zheng:0.6,xian:0.4};
  let sum=0;const keys=[];
  for(const k in w){
    if((k==='zheng'||k==='xie'||k==='xian')&&(+w[k]>0)){keys.push(k);sum+=(+w[k]||0);}
  }
  if(!sum||!keys.length)return 'zheng';
  let r=rng()*sum;
  for(const k of keys){r-=(+w[k]||0);if(r<=0)return k;}
  return keys[0]||'zheng';
}
function mapGfRng(){
  try{
    if(typeof mapRngStream==='function')return mapRngStream('gf',((S&&S.map&&S.map.seedExtra)||1)^0x4746);
  }catch(e){}
  return Math.random;
}
function mapGfInvCount(unit){
  let n=0;
  try{
    if(typeof S!=='undefined'&&S){
      if(S.gfBag){for(const k in S.gfBag)n+=S.gfBag[k]|0;}
      if(Array.isArray(S.inv)){
        const uid=unit&&unit.id;
        for(const it of S.inv){
          if(!it)continue;
          const isGf=it.gfId||it.type==='gongfa'||it.t==='gongfa'||(typeof it.itemId==='string'&&it.itemId.indexOf('gfman:')===0)||(typeof it.id==='string'&&it.id.indexOf('gfman:')===0);
          if(!isGf)continue;
          if(uid==null||it.boundTo==null||it.boundTo===uid)n++;
        }
      }
    }
  }catch(e){}
  return n;
}
function mapGfPending(rec){
  const P=mapGfPendingEnsure();
  if(P)P.push(Object.assign({t:(typeof S!=='undefined'&&S&&S.time)||0},rec));
  try{console.warn('[mapGf] pending',rec&&rec.reason,rec&&rec.gfId);}catch(e){}
}
/** 僅經 XW_GF.grant／grantGongfa／grantManual；無 API → pending（不寫 inv、不呼叫 addItem） */
function mapGfGrant(unit,gfId,src){
  if(!gfId)return {ok:false,reason:'no_id'};
  const A=mapGfApi();
  if(!A||!(typeof A.grant==='function'||typeof A.grantGongfa==='function'||typeof A.grantManual==='function')){
    mapGfPending({gfId:gfId,unitId:unit&&unit.id,src:src||'map',reason:'no_xw_gf'});
    return {ok:false,reason:'no_xw_gf',gfId:gfId};
  }
  const before=mapGfBagCount(gfId);
  const invBefore=(typeof S!=='undefined'&&S&&Array.isArray(S.inv))?S.inv.length:0;
  // 有拾取單位：XW_GF.grant（實體秘本進共用 S.inv，boundTo=unit.id）
  if(unit&&(typeof A.grant==='function'||typeof A.grantGongfa==='function')){
    const fn=A.grant||A.grantGongfa;
    let r=null;
    try{r=fn.call(A,unit,gfId,src||'map');}catch(e){
      mapGfPending({gfId:gfId,unitId:unit.id,src:src||'map',reason:'grant_throw',err:String(e)});
      return {ok:false,reason:'grant_throw',err:String(e),gfId:gfId};
    }
    if(r&&r.ok){
      try{mapEmit('map:gf:loot',{gfId:gfId,unitId:unit.id,src:src||'map',via:r.via||'XW_GF.grant',itemRef:r.itemRef||null});}catch(e){}
      return {ok:true,gfId:gfId,via:r.via||'grant',itemRef:r.itemRef||null};
    }
    mapGfPending({gfId:gfId,unitId:unit.id,src:src||'map',reason:(r&&r.reason)||'grant_false'});
    return {ok:false,reason:(r&&r.reason)||'grant_false',gfId:gfId};
  }
  // 無單位：宗門庫 grantManual
  if(typeof A.grantManual==='function'){
    let n=0;
    try{n=A.grantManual(gfId,1);}catch(e){
      mapGfPending({gfId:gfId,src:src||'map',reason:'manual_throw',err:String(e)});
      return {ok:false,reason:'manual_throw',err:String(e),gfId:gfId};
    }
    const after=mapGfBagCount(gfId);
    if(after>before||(n|0)>before){
      try{mapEmit('map:gf:loot',{gfId:gfId,src:src||'map',via:'grantManual',bag:after});}catch(e){}
      return {ok:true,gfId:gfId,via:'grantManual',bag:after};
    }
    mapGfPending({gfId:gfId,src:src||'map',reason:'bag_unchanged'});
    return {ok:false,reason:'bag_unchanged',gfId:gfId};
  }
  mapGfPending({gfId:gfId,unitId:unit&&unit.id,src:src||'map',reason:'no_grant_fn'});
  return {ok:false,reason:'no_grant_fn',gfId:gfId};
}
/** 僅自 CultGF.rollDrop 或 XW_GF.list()／catalog()；永不自造 id */
function mapGfRollId(school,realm,rng){
  rng=rng||Math.random;
  const A=mapGfApi();
  if(!A)return null;
  if(typeof A.rollDrop==='function'){
    try{
      const id=A.rollDrop({realm:realm,school:school,rng:rng});
      if(id)return id;
    }catch(e){}
  }
  try{
    const fn=A.list||A.catalog;
    if(typeof fn==='function'){
      const list=fn.call(A)||[];
      const arr=Array.isArray(list)?list:[];
      const pool=arr.filter(r=>r&&r.id&&(r.minRealm|0)<=realm&&(!school||r.school===school));
      if(pool.length)return pool[Math.floor(rng()*pool.length)%pool.length].id;
    }
  }catch(e){}
  return null;
}
/**
 * 擲是否掉落＋抽 id＋授予。
 * id 僅來自 CultGF.rollDrop／XW_GF.list；授予僅 XW_GF.grant／grantManual。
 * 無 XW_GF → 只佇列 pendingGfLoot（不寫 S.inv、不呼叫 addItem）。
 */
function mapGfTryDrop(ctx){
  if(!mapGfIsHost())return {ok:false,reason:'client'};
  const rng=ctx.rng||mapGfRng();
  const chance=ctx.guaranteed?1:(ctx.chance!=null?ctx.chance:0);
  if(!ctx.guaranteed&&rng()>=chance)return {ok:false,rolled:false};
  const school=ctx.school||mapGfSchoolFromFaction(ctx.faction||'san',rng);
  const realm=(ctx.realm!=null?ctx.realm:ctx.tier)|0;
  if(!mapGfHasGrant()&&!mapGfApi()){
    mapGfPending({src:ctx.src||'map',reason:'no_xw_gf',school:school,realm:realm,faction:ctx.faction||null});
    return {ok:false,rolled:true,reason:'no_xw_gf',school:school,realm:realm};
  }
  const gfId=mapGfRollId(school,realm,rng);
  if(!gfId){
    mapGfPending({src:ctx.src||'map',reason:'no_id',school:school,realm:realm});
    return {ok:false,rolled:true,reason:'no_id',school:school,realm:realm};
  }
  try{mapEmit('map:gf:drop',{gfId:gfId,src:ctx.src||'map',school:school,realm:realm,unitId:ctx.unit&&ctx.unit.id,chance:chance});}catch(e){}
  const gr=mapGfGrant(ctx.unit||null,gfId,ctx.src||'map');
  return Object.assign({rolled:true,school:school,realm:realm},gr);
}
function mapGfFactionFromAlign(a){
  if(a==='zheng'||a==='xie'||a==='xian')return a;
  if(a==='yao'||a==='demon')return 'yao';
  return 'san';
}
function mapGfOnDgClear(){
  if(!mapFlag('dungeons')||!S||!S.dg||!S.dg._map)return null;
  if(!mapGfIsHost())return {ok:false,reason:'client'};
  const kind=S.dg.kind;const def=typeof MAP_DGS!=='undefined'?MAP_DGS[kind]:null;
  const type=(def&&def.type)||S.dg.mapType||'dungeon';
  const T=mapGfTune();
  const row=(T.dungeon&&T.dungeon[type])||{chance:0.05};
  const boss=T.boss||{chance:0.20};
  const pl=typeof player==='function'?player():(S.units&&S.units.find(u=>u&&u.kind==='player'));
  const realm=Math.max((def&&def.minRealm)|0,(pl&&pl.realm)|0);
  const fac=type==='forbid'?'xie':(type==='mystic'?'xian':'san');
  const g1=mapGfTryDrop({src:'boss',chance:boss.chance,realm:realm,faction:fac,unit:pl});
  const g2=mapGfTryDrop({src:'dungeon:'+type,chance:row.chance,realm:realm,faction:fac,unit:pl});
  return {boss:g1,room:g2};
}
function mapGfOnTravelResolve(tr,enc,result){
  if(!result||!result.ok)return null;
  if(!mapGfIsHost())return {ok:false,reason:'client'};
  const T=mapGfTune().travel||{};
  const type=result.type||(enc&&enc.type);
  const row=T[type];if(!row)return null;
  if((type==='duel'||type==='robbery')&&!result.win)return null;
  const party=tr&&tr.partyUnits||[];
  const unit=party[0]||(typeof player==='function'?player():null);
  const other=enc&&enc.other;
  const fac=mapGfFactionFromAlign((other&&(other.align||other.faction))||(type==='robbery'?'bandit':'san'));
  const realm=Math.max((unit&&unit.realm)|0,(enc&&enc.foe&&enc.foe.realm)|0,3);
  return mapGfTryDrop({src:'travel:'+type,chance:row.chance,realm:realm,faction:fac,unit:unit});
}
function mapGfOnEnemyKilled(enemy,killer){
  if(!enemy)return null;
  if(!mapGfIsHost())return {ok:false,reason:'client'};
  const isSect=!!(enemy._mapSect||enemy.sectId||enemy.kind==='sect_npc');
  const isRaid=!!(enemy._mapRaid||(typeof S!=='undefined'&&S&&S.raidsActive&&S.raidsActive.length));
  if(!isSect&&!isRaid)return null;
  if(typeof enemyItemDropPermit!=='function'||!enemyItemDropPermit(enemy,'map-gf'))return {ok:false,rolled:false,reason:'item-event-gate'};
  const T=mapGfTune();
  const row=isRaid?(T.raid||{chance:0.06}):(T.sectKill||{chance:0.05});
  const fac=mapGfFactionFromAlign(enemy.align||enemy.faction||'san');
  const unit=killer||(typeof player==='function'?player():null);
  const realm=Math.max((enemy.realm)|0,(unit&&unit.realm)|0,3);
  return mapGfTryDrop({src:isRaid?'raid':'sectKill',chance:row.chance,realm:realm,faction:fac,unit:unit});
}
