// ================== cult_gf.js：功法學習／參悟／裝備／熟練（旗標預設 ON）==================
(function(){
if(typeof CULT_FLAGS==='undefined')window.CULT_FLAGS={};
if(CULT_FLAGS.gongfa==null)CULT_FLAGS.gongfa=true;

const GF_CFG={
  auxSlots:[0,0,0,0,1,1,2,2,2,3,3],
  sameSchool:0.08,
  auxCult:0.35,
  counterMul:1.06,
  switchPenMul:0.75,
  switchPenSec:90,
  caps:{cultMul:1.50,dmgRed:0.35},
  cultCap:1.50,
  drCap:0.35,
  priceLow:50,priceMid:200,priceHigh:800,
  saveVer:1,
  studyBase:{low:30,mid:90,high:240},
  studyWu:0.008,
  studyMinMul:0.35,
  profNeed:[0,25,55,90],
  profNames:['入門','小成','大成','圓滿'],
  profCult:[0,0.04,0.08,0.14],
  profPerSec:0.35,
  profOnHit:0.8,
  barSlots:5,
  cond:{
    hpLt:0.20,          // 待確認：低血觸發門檻
    hpLtAtk:0.20,       // 待確認：低血時攻擊加成
    qiFull:1,           // 待確認：滿靈力判定（比例，1＝全滿）
    qiFullSpd:0.15,     // 待確認：滿靈力時移動速度加成
    hpGt:0.80,          // 待確認：高血觸發門檻
    hpGtDr:0.08,        // 待確認：高血時減傷
    atkAlways:0.08,     // 待確認：常時攻擊加成
    spdAlways:0.10,     // 待確認：常時移動速度加成
    drAlways:0.06,      // 待確認：常時減傷
    qiLt:0.30,          // 待確認：低靈力觸發門檻
    qiLtAtk:0.12        // 待確認：低靈力時攻擊加成
  }
};
window.GF_CFG=GF_CFG;
window.CULT_GF_CFG=GF_CFG;
function capOf(key){
  const caps=GF_CFG.caps||{};
  if(key==='cultMul')return caps.cultMul!=null?+caps.cultMul:(GF_CFG.cultCap!=null?+GF_CFG.cultCap:1.50);
  if(key==='dmgRed')return caps.dmgRed!=null?+caps.dmgRed:(GF_CFG.drCap!=null?+GF_CFG.drCap:0.35);
  return caps[key];
}

const CATALOG=(typeof GF_CATALOG!=='undefined'&&GF_CATALOG)||window.GF_CATALOG||[];
const BY={};for(const r of CATALOG)BY[r.id]=r;
const COUNTER={zheng:'xie',xie:'xian',xian:'zheng'};
const ITEM_PF='gfman:';

function on(){return !!(typeof CULT_FLAGS!=='undefined'&&CULT_FLAGS.gongfa);}
function getS(){if(typeof S!=='undefined'&&S)return S;if(window.XW&&XW.S)return XW.S;return window.S||null;}
function now(){const s=getS();return (s&&s.time)||0;}
function isClient(){try{const n=(typeof XW!=='undefined'&&XW.net)||(window.XW&&XW.net);return !!(n&&n.role==='client');}catch(e){return false;}}
function emit(n,d){try{if(window.Cult&&typeof Cult.emit==='function')Cult.emit(n,d);}catch(e){}try{window.dispatchEvent(new CustomEvent(n,{detail:d}));}catch(e){}}
function bag(){const s=getS();if(!s)return {};if(!s.gfBag)s.gfBag={};return s.gfBag;}
function get(id){return BY[id]||null;}
function parseItemId(s){if(!s)return null;if(typeof s!=='string')return s;return s.indexOf(ITEM_PF)===0?s.slice(ITEM_PF.length):s;}
function itemId(id){return ITEM_PF+id;}
function migrateUnit(u){
  if(!u)return u;
  if(!u.gf)u.gf={v:1,learned:{},main:null,aux:[],pen:null,study:null,holding:[],entry:0};
  const g=u.gf;
  if(!g.learned||typeof g.learned!=='object')g.learned={};
  if(!Array.isArray(g.aux))g.aux=[];
  if(!Array.isArray(g.holding))g.holding=[];
  if(!Array.isArray(g.bar))g.bar=[];
  while(g.bar.length<(GF_CFG.barSlots||5))g.bar.push(null);
  if(g.bar.length>(GF_CFG.barSlots||5))g.bar.length=GF_CFG.barSlots||5;
  if(Array.isArray(u.econGf)){
    for(const eid of u.econGf){
      if(eid&&get(eid)&&!g.learned[eid])g.learned[eid]={prof:0,tier:0};
    }
  }
  for(const id in g.learned){
    let rec=g.learned[id];
    if(!rec||typeof rec!=='object')rec=g.learned[id]={prof:0,tier:0};
    rec.prof=+rec.prof||0;rec.tier=profTier(rec.prof);
  }
  return u;
}
function pack(u){migrateUnit(u);return u&&u.gf?JSON.parse(JSON.stringify(u.gf)):null;}
function unpack(u,data){if(!u)return u;u.gf=data?JSON.parse(JSON.stringify(data)):null;return migrateUnit(u);}
function catalog(){return CATALOG.map(r=>Object.assign({},r));}
function priceHint(id){
  const r=get(id);if(!r)return null;
  const xia=r.price!=null?r.price:(r.tier==='high'?GF_CFG.priceHigh:r.tier==='mid'?GF_CFG.priceMid:GF_CFG.priceLow);
  return {id:r.id,itemId:itemId(r.id),tier:r.tier,school:r.school,minRealm:r.minRealm,xia:xia,label:r.name};
}
function bagCount(id){return (bag()[id]|0);}
function grantManual(id,n){if(!get(id))return 0;const b=bag();b[id]=(b[id]|0)+Math.max(0,n|0);return b[id];}
function consumeManual(id,n){n=Math.max(1,n|0);const b=bag();if((b[id]|0)<n)return false;b[id]-=n;if(!b[id])delete b[id];return true;}
function owned(u,id){migrateUnit(u);return !!(u&&u.gf&&u.gf.learned&&u.gf.learned[id]);}
function profTier(p){const need=GF_CFG.profNeed;let t=0;for(let i=0;i<need.length;i++)if((p||0)>=need[i])t=i;return t;}
function profName(t){return GF_CFG.profNames[t]||GF_CFG.profNames[0];}
function recOf(u,id){migrateUnit(u);return u&&u.gf&&u.gf.learned?u.gf.learned[id]:null;}
function addProf(u,id,amt){
  const rec=recOf(u,id);if(!rec)return 0;
  rec.prof=Math.min(100,rec.prof+(+amt||0));
  rec.tier=profTier(rec.prof);
  return rec.prof;
}
function studyDur(u,id){
  const r=get(id);if(!r)return 0;
  const base=GF_CFG.studyBase[r.tier]||GF_CFG.studyBase.low;
  const wu=(u&&u.wu)||0;
  return Math.max(base*GF_CFG.studyMinMul,base/(1+wu*GF_CFG.studyWu));
}
function slots(u){const r=Math.max(0,(u&&u.realm)|0);const a=GF_CFG.auxSlots;return {main:1,aux:a[Math.min(r,a.length-1)]|0};}
function fail(reason,extra){const o={ok:false,reason:reason};if(extra)Object.assign(o,extra);return o;}

function learn(u,id,src){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient()&&src!=='sync')return fail('client');
  const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(u.gf.learned[id])return fail('already',{id:id});
  if((u.realm|0)<(row.minRealm|0))return fail('realm',{id:id});
  src=src||'bag';
  if(src==='bag'||src==='manual'){
    if(!consumeManual(id,1))return fail('no-manual',{id:id});
    if(u.gf.holding.indexOf(id)<0)u.gf.holding.push(id);
    u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'warehouse'};
  }
  u.gf.learned[id]={prof:0,tier:0};
  if(row.entry)u.gf.entry=1;
  try{
    const pc=window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u);
    if(u.kind==='disciple'&&!pc&&!u.np&&src!=='dev')autoPickBar(u);
  }catch(e){}
  emit('cult:gfLearn',{id:id,unitId:u.id,src:src});
  return {ok:true,id:id};
}

function econApi(){try{return (typeof XW_ECON!=='undefined'&&XW_ECON)||window.XW_ECON||null;}catch(e){return null;}}
function isGongfaGeSrc(src){return src==='gongfaGe'||src==='gongfa_ge'||src==='gfge';}
function studySpeedMul(u){
  const wu=(u&&u.wu)||0;
  const raw=1+wu*GF_CFG.studyWu;
  const cap=1/(GF_CFG.studyMinMul||0.35);
  return Math.min(cap,Math.max(1,raw));
}
function gradeOf(row){
  if(!row)return 'xia';
  if(row.grade==='xia'||row.grade==='zhong'||row.grade==='shang'||row.grade==='ji')return row.grade;
  if(row.tier==='high')return ((row.minRealm|0)>=8)?'ji':'shang';
  if(row.tier==='mid')return 'zhong';
  return 'xia';
}
function toEconRow(row){
  if(!row)return null;
  return Object.assign({},row,{
    id:row.id,name:row.name,realm:row.minRealm|0,grade:gradeOf(row),
    kind:isPassiveRow(row)?'passive':'active',hasActive:!isPassiveRow(row)&&!!(row.ab||(row.unlocks&&row.unlocks.some(function(un){return !!(un&&un.ab);}))),hasPassive:true,school:row.school,tier:row.tier,
    price:row.price,minRealm:row.minRealm,blurb:describe(row),how:howOf(row)
  });
}
function list(){return CATALOG.map(toEconRow);}
function getEcon(id){const r=get(parseItemId(id));return r?toEconRow(r):null;}
// Canonical scroll ownership is boundTo (grant/map_gongfa); never expose another player's copy.
function manualUsable(u,it){return !!(u&&it&&(it.boundTo==null||String(it.boundTo)===String(u.id)));}
function manualCounts(u){const out={};for(const id in bag())if(get(id)&&bag()[id]>0)out[id]=bag()[id];
 const s=getS();for(const it of s&&s.inv||[]){if(!manualUsable(u,it)||!(it.t==='gongfa'||it.type==='gongfa'))continue;const id=parseItemId(it.gfId||it.itemId);if(get(id))out[id]=(out[id]||0)+Math.max(1,it.n|0||1);}return out;}
// Real inventory objects need numeric ids: core applyV045 reserves id+1 for every entry.
// Only repair known gongfa records; never rewrite another module's items or hide a bad JSON save.
function manualItem(it){return !!(it&&(it.t==='gongfa'||it.type==='gongfa'||it.gfId)&&get(parseItemId(it.gfId||it.itemId||it.id)));}
function validInventoryId(id){return Number.isSafeInteger(id)&&id>=0&&id<Number.MAX_SAFE_INTEGER;}
function allocateManualId(s,root){
  if(!s)throw new Error('manual-id-state');
  let next=Number.isSafeInteger(s.nextItem)&&s.nextItem>0?s.nextItem:1;
  const seen=new WeakSet(),ids=new Set();
  function reserve(o){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
    if(Number.isSafeInteger(o.id)&&o.id>=0){ids.add(o.id);next=Math.max(next,o.id+1);}
    for(const k of Object.keys(o))reserve(o[k]);
  }
  reserve(root||s);
  while(ids.has(next))next++;
  if(!validInventoryId(next))throw new Error('manual-id-exhausted');
  s.nextItem=next+1;return next;
}
function reserveManualIds(s,root){
  if(!s||!Array.isArray(s.inv))return;
  const books=s.inv.filter(manualItem);if(!books.length)return;
  for(const it of books){
    if(!validInventoryId(it.id)||s.inv.some(x=>x&&x!==it&&x.id===it.id))it.id=allocateManualId(s,root||s);
    else if(!Number.isSafeInteger(s.nextItem)||s.nextItem<=it.id)s.nextItem=it.id+1;
  }
}
function restoreManual(u,id){const g=u.gf,origin=g.manualOrigins&&g.manualOrigins[id];
 if(origin&&origin.source==='inventory'&&origin.item){const s=getS();s.inv=s.inv||[];const it=JSON.parse(JSON.stringify(origin.item));if(!validInventoryId(it.id)||s.inv.some(x=>x&&x.id===it.id))it.id=allocateManualId(s);else if(!Number.isSafeInteger(s.nextItem)||s.nextItem<=it.id)s.nextItem=it.id+1;s.inv.push(it);}
 else grantManual(id,1);if(g.manualOrigins)delete g.manualOrigins[id];}
function consumeInvManual(u,id,n){
  const s=getS();if(!s||!Array.isArray(s.inv))return false;
  n=Math.max(1,n|0);
  let left=n;
  for(let i=s.inv.length-1;i>=0&&left>0;i--){
    const it=s.inv[i];if(!it)continue;
    const gid=it.gfId||parseItemId(it.itemId||'');
    if(!(it.t==='gongfa'||it.type==='gongfa'||gid))continue;
    if(gid!==id)continue;
    if(!manualUsable(u,it))continue;
    migrateUnit(u);u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'inventory',item:JSON.parse(JSON.stringify(Object.assign({},it,{n:1})))};
    const amt=Math.max(1,it.n|0||1);
    if(amt>left){u.gf.manualOrigins[id].item.id=allocateManualId(s);it.n=amt-left;left=0;}
    else{left-=amt;s.inv.splice(i,1);}
  }
  return left===0;
}
function migrateInv(s,root){
  if(!s||!Array.isArray(s.inv))return s;
  for(const it of s.inv){
    if(!it)continue;
    if(!(it.t==='gongfa'||it.type==='gongfa'||it.gfId))continue;
    const id=parseItemId(it.gfId||it.itemId||it.id);
    if(!id||!get(id))continue;
    it.t='gongfa';it.type='gongfa';it.gfId=id;it.itemId=itemId(id);
    it.n=Math.max(1,it.n|0||1);
  }
  reserveManualIds(s,root||s);
  return s;
}
function grant(unit,gfId,src){
  if(!on())return {ok:false,reason:'flag-off'};
  const id=parseItemId(gfId);const row=get(id);
  if(!row)return {ok:false,reason:'unknown'};
  const ref=itemId(id);
  const s=getS();
  const it={t:'gongfa',type:'gongfa',gfId:id,itemId:ref,n:1,q:row.tier==='high'?3:row.tier==='mid'?2:1};
  if(unit&&unit.id!=null)it.boundTo=unit.id;
  if(s&&Array.isArray(s.inv)){
    try{it.id=allocateManualId(s);}catch(e){return {ok:false,reason:'inventory-id-exhausted'};}
    const adder=(typeof addItem==='function')?addItem:(window.XW&&typeof XW.addItem==='function'?XW.addItem:null);
    if(adder){
      try{
        const ok=adder(it,unit&&unit.x,unit&&unit.y);
        if(s.inv.indexOf(it)>=0||s.inv.some(function(x){return x&&x!==it&&x.gfId===id&&x.itemId===ref;}))
          return {ok:true,itemRef:ref,via:'S.inv'};
        if(ok!==false&&s.inv.indexOf(it)>=0)return {ok:true,itemRef:ref,via:'S.inv'};
      }catch(e){}
    }
    if(s.inv.indexOf(it)<0)s.inv.push(it);
    return {ok:true,itemRef:ref,via:'S.inv'};
  }
  grantManual(id,1);
  return {ok:true,itemRef:ref,via:'S.gfBag'};
}
function xwLearn(u,id,src){return learn(u,id,src==null?'trade':src);}

function startStudy(u,ref,src){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient()&&src!=='sync')return fail('client');
  const id=parseItemId(ref);const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(u.gf.learned[id])return fail('already',{id:id});
  if(u.gf.study)return fail('busy');
  if((u.realm|0)<(row.minRealm|0))return fail('realm',{id:id});
  src=src||'warehouse';
  if(isGongfaGeSrc(src)){
    const E=econApi();
    if(E&&typeof E.gfBeginStudy==='function'){
      const er=E.gfBeginStudy(u,id);
      if(!er||!er.ok)return fail((er&&er.reason)||'econ',{econ:er});
      emit('cult:gfStudyStart',{id:id,unitId:u.id,dur:0,via:'econ'});
      return {ok:true,dur:0,id:id,via:'econ',study:er.study};
    }
  }
  if(consumeManual(id,1)){u.gf.manualOrigins=u.gf.manualOrigins||{};u.gf.manualOrigins[id]={source:'warehouse'};}
  else if(!consumeInvManual(u,id,1))return fail('no-manual',{id:id});
  const dur=studyDur(u,id);
  u.gf.study={id:id,t0:now(),dur:dur,held:true,from:src};
  emit('cult:gfStudyStart',{id:id,unitId:u.id,dur:dur});
  return {ok:true,dur:dur,id:id,via:'self'};
}

function studyProgress(u){
  migrateUnit(u);
  const st=u&&u.gf&&u.gf.study;if(!st)return null;
  const left=Math.max(0,st.dur-(now()-st.t0));
  return {id:st.id,t0:st.t0,dur:st.dur,left:left,p:st.dur?Math.min(1,1-left/st.dur):1};
}

function finishStudy(u){
  const st=u.gf.study;if(!st)return;
  const id=st.id;
  if(!u.gf.learned[id])u.gf.learned[id]={prof:0,tier:0};
  if(u.gf.holding.indexOf(id)<0)u.gf.holding.push(id);
  u.gf.study=null;
  const row=get(id);if(row&&row.entry)u.gf.entry=1;
  emit('cult:gfStudyDone',{id:id,unitId:u.id});
}

function holdingIdx(u,id){const h=u.gf.holding||[];return h.indexOf(id);}
function returnManual(u,ref,dest){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient())return fail('client');
  const id=parseItemId(ref);if(!get(id)&&id){/* still allow return of unknown held? */ }
  if(!get(id))return fail('unknown');
  migrateUnit(u);
  dest=dest==='gongfaGe'?'gongfaGe':'warehouse';
  if(dest==='warehouse'&&!(u.gf.manualOrigins&&u.gf.manualOrigins[id]))return fail('origin-unrecorded',{id:id});
  let reason='return';
  if(u.gf.study&&u.gf.study.id===id){
    u.gf.study=null;reason='interrupt';
  }else{
    const i=holdingIdx(u,id);
    if(i<0&&dest!=='gongfaGe')return fail('not-held',{id:id});
    if(i>=0)u.gf.holding.splice(i,1);
  }
  if(dest==='gongfaGe'){
    const E=econApi();
    if(E&&typeof E.gfReturn==='function'){
      const er=E.gfReturn(u,id,'manual');
      emit('cult:gfStudyReturn',{id:id,unitId:u.id,dest:dest,reason:reason,via:'econ'});
      if(er&&er.ok)return {ok:true,id:id,dest:dest,reason:reason,via:'econ'};
      if(E.gfStore){const st=E.gfStore(null,id,1);if(st&&st.ok!==false)return {ok:true,id:id,dest:dest,reason:reason,via:'econ-store'};}
    }
  }
  restoreManual(u,id);
  emit('cult:gfStudyReturn',{id:id,unitId:u.id,dest:dest,reason:reason});
  return {ok:true,id:id,dest:dest,reason:reason};
}

function returnAll(u,dest,reason){
  migrateUnit(u);
  dest=dest||'warehouse';
  const ids=[];
  if(u.gf.study&&u.gf.study.id){ids.push(u.gf.study.id);u.gf.study=null;}
  for(const id of (u.gf.holding||[]).slice()){ids.push(id);}
  u.gf.holding=[];
  for(const id of ids){if(!(u.gf.manualOrigins&&u.gf.manualOrigins[id])){const s=getS();s.cultGFNet=s.cultGFNet||{v:1,journal:{}};const q=s.cultGFNet.quarantine||(s.cultGFNet.quarantine=[]);if(!q.some(x=>x.unitId===u.id&&x.gfId===id))q.push({unitId:u.id,pk:u.np||s.flags&&s.flags.netOwner||null,gfId:id,reason:'legacy-origin-unrecorded'});continue;}restoreManual(u,id);emit('cult:gfStudyReturn',{id:id,unitId:u.id,dest:dest,reason:reason||'interrupt'});}
  return ids;
}

function maybeEntry(u){
  if(!on()||!u)return {ok:false,reason:'no'};
  migrateUnit(u);
  if(u.gf.entry||owned(u,'zheng_low_01')){u.gf.entry=1;return {ok:false,reason:'already'};}
  const s=getS();
  if((u.realm|0)<3)return {ok:false,reason:'realm'};
  if(!s||!s.items||!(s.items.gongfa>0))return {ok:false,reason:'no-token'};
  const r=learn(u,'zheng_low_01','auto');
  if(r.ok)u.gf.entry=1;
  return r;
}

function equip(u,id,slot){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  if(isClient())return fail('client');
  const row=get(id);if(!row)return fail('unknown');
  migrateUnit(u);
  if(!owned(u,id))return fail('not-learned');
  slot=slot||'main';
  if(slot==='main'){
    if(u.gf.main&&u.gf.main!==id){
      u.gf.pen={t:now()+GF_CFG.switchPenSec,mul:GF_CFG.switchPenMul};
    }
    const ai=u.gf.aux.indexOf(id);if(ai>=0)u.gf.aux.splice(ai,1);
    u.gf.main=id;
    return {ok:true,id:id,slot:'main'};
  }
  if(u.gf.main===id)return fail('is-main');
  const n=slots(u).aux;
  if(u.gf.aux.indexOf(id)>=0)return {ok:true,id:id,slot:'aux'};
  if(u.gf.aux.length>=n)return fail('slots');
  u.gf.aux.push(id);
  return {ok:true,id:id,slot:'aux'};
}

function unequip(u,slot,id){
  if(!on())return fail('flag-off');
  if(!u)return fail('no-unit');
  migrateUnit(u);
  if(slot==='main'){if(id&&u.gf.main!==id)return fail('mismatch');u.gf.main=null;return {ok:true};}
  if(id){const i=u.gf.aux.indexOf(id);if(i>=0)u.gf.aux.splice(i,1);}
  else u.gf.aux=[];
  return {ok:true};
}

function pushFx(out,type,v,src,extra){
  if(!type||!(+v||v===0))return;
  const e={type:type,v:+v||0,src:src||null};
  if(extra)Object.assign(e,extra);
  out.push(e);
}
function collectEffects(u){
  const out=[];
  if(!u)return out;
  migrateUnit(u);
  if(on()){
    const g=u.gf;
    const main=g.main&&get(g.main);
    if(main){
      pushFx(out,'cultMain',main.cult||1,g.main);
      const rec=g.learned[g.main];
      const extra=GF_CFG.profCult[rec?rec.tier:0]||0;
      if(extra)pushFx(out,'profCult',extra,g.main);
    }
    for(const id of (g.aux||[])){
      const row=get(id);if(!row)continue;
      pushFx(out,'auxCult',((row.cult||1)-1)*GF_CFG.auxCult,id);
    }
    if(main){
      for(const id of (g.aux||[])){const row=get(id);if(row&&row.school===main.school){pushFx(out,'sameSchool',GF_CFG.sameSchool,id);break;}}
    }
    if(g.pen&&now()<g.pen.t)pushFx(out,'switchPen',g.pen.mul||1,'pen');
    const equipped=equippedIds(u);
    function takeSkill(s){
      if(!s)return;
      if(s.source==='learned'&&!s.equipped&&s.kind!=='passive'){/* unequipped actives: combat fx only if on bar or equipped */}
      const applyCombat=!(s.source==='learned')||s.equipped||s.kind==='passive';
      if(applyCombat&&s.dr)pushFx(out,'dmgRed',s.dr,s.id);
      if(Array.isArray(s.effects)){
        for(const fx of s.effects){
          if(!fx||!fx.type)continue;
          if(!condMet(u,fx.when))continue;
          if(fx.type==='cultMain'||fx.type==='profCult'||fx.type==='auxCult'||fx.type==='sameSchool'||fx.type==='switchPen')continue;
          if(fx.type==='dmgRed'&&!applyCombat)continue;
          pushFx(out,fx.type,fx.v,s.id,fx.when?{when:fx.when}:null);
        }
      }
    }
    for(const s of innateSkills(u))takeSkill(s);
    for(const s of learnedSkills(u))takeSkill(s);
    for(const id of equipped){
      const row=get(id);if(!row)continue;
      /* 已學會的戰鬥效果由 learnedSkills／takeSkill 套用，此處只補未列入技能模型的列上減傷（且避開重複） */
      if(row.dr&&!(g.learned&&g.learned[id]))pushFx(out,'dmgRed',row.dr,id);
    }
  }
  return out;
}
function stackEffects(effects){
  const sum={};
  for(const e of effects||[]){
    if(!e||!e.type)continue;
    sum[e.type]=(sum[e.type]||0)+(+e.v||0);
  }
  return sum;
}
function foldCult(sum){
  let m=1;
  if(sum.cultMain)m*=sum.cultMain;
  if(sum.profCult)m*=1+sum.profCult;
  if(sum.auxCult)m+=sum.auxCult;
  if(sum.sameSchool)m*=1+sum.sameSchool;
  if(sum.switchPen)m*=sum.switchPen;
  const cap=capOf('cultMul');
  if(m>cap)m=cap;
  if(m<0.01)m=0.01;
  return m;
}
function mul(u){
  if(!on()||!u)return 1;
  return foldCult(stackEffects(collectEffects(u)));
}
function dmgRedOf(u){
  if(!on()||!u)return 0;
  let dr=stackEffects(collectEffects(u)).dmgRed||0;
  const cap=capOf('dmgRed');
  if(dr>cap)dr=cap;
  if(dr<0)dr=0;
  return dr;
}
function scaleIncoming(u,amt){
  const dr=dmgRedOf(u);
  if(dr>0)amt=(+amt||0)*(1-dr);
  return amt;
}
let _origDmgUnit=null;
function gfDmgUnit(src,u,amt){
  if(on()&&u&&amt>0)amt=scaleIncoming(u,amt);
  if(_origDmgUnit)return _origDmgUnit(src,u,amt);
  if(!u||u.dead)return;
  if(u.shield>0){const a=Math.min(u.shield,amt);u.shield-=a;amt-=a;}
  if(amt<=0)return;
  u.hp-=amt;
  const s=getS();if(s)u.lastHit=s.time;
  return amt;
}
function healUnit(u,amt){
  if(!u||!(+amt>0))return 0;
  const before=+u.hp||0;
  const next=before+(+amt||0);
  u.hp=(u.maxhp!=null)?Math.min(u.maxhp,next):next;
  return u.hp-before;
}

function unlockedAbs(u,id){
  const row=get(id);if(!row)return [];
  const rec=recOf(u,id);const t=rec?rec.tier:0;
  const out=[];
  if(row.ab)out.push(row.ab);
  if(row.unlocks)for(const un of row.unlocks)if((un.at|0)<=t&&un.ab)out.push(un.ab);
  return out;
}
function grantsAb(u,ab){
  if(!on()||!u||!ab)return false;
  migrateUnit(u);
  if(u.gf.main&&unlockedAbs(u,u.gf.main).indexOf(ab)>=0)return true;
  const bar=u.gf.bar||[];
  if(bar.indexOf(ab)<0)return false;
  for(const id in (u.gf.learned||{})){if(unlockedAbs(u,id).indexOf(ab)>=0)return true;}
  return false;
}

const AB_KIND={charge:'active',sweep:'active',fireball:'active',flysword:'active',jindan:'active',guard:'passive'};
const AB_META={
  charge:{n:'衝鋒',cd:8,desc:'衝向 5 格內的敵人（貼身時直接撞擊），造成 1.6 倍傷害並擊暈'},
  sweep:{n:'橫掃',cd:10,desc:'掃擊身邊所有敵人（1.2 倍傷害）'},
  guard:{n:'氣勁護體',cd:25,desc:'氣血低於 65% 時張開護盾，吸收 40% 氣血上限的傷害'},
  fireball:{n:'御氣・火球',cd:4,desc:'對 6 格內的敵人射出火球（2.2 倍傷害，小範圍波及）'},
  flysword:{n:'御劍術',cd:5,desc:'祭出飛劍刺向 8 格內的敵人（3 倍傷害）'},
  jindan:{n:'金丹威壓',cd:12,desc:'震懾身邊 2.5 格內所有敵人（2.5 倍傷害並擊暈）'}
};
const REALM_ABS_FALLBACK=[
  {n:'武徒'},{n:'武師',ab:'charge'},{n:'大武師',ab:'sweep'},{n:'宗師',ab:'guard'},
  {n:'煉氣',ab:'fireball'},{n:'築基',ab:'flysword'},{n:'金丹',ab:'jindan'}
];
const innateSources=[];
function realmTable(){
  const RS=(typeof REALMS!=='undefined'&&REALMS)||(window.XW&&XW.REALMS)||window.REALMS;
  return (RS&&RS.length)?RS:REALM_ABS_FALLBACK;
}
function abilOf(ab){
  const A=(typeof ABIL!=='undefined'&&ABIL&&ABIL[ab])||(window.XW&&XW.ABIL&&XW.ABIL[ab])||(window.ABIL&&window.ABIL[ab])||AB_META[ab]||null;
  return A;
}
function abInfo(ab){
  const A=abilOf(ab);
  const kind=AB_KIND[ab]||((A&&A.cd!=null)?'active':'passive');
  return {ab:ab,name:(A&&(A.n||A.name))||ab,cd:A?A.cd:undefined,desc:A?A.desc:undefined,kind:kind};
}
function skillKind(ab){return abInfo(ab).kind;}
function makeInnateAbSkill(ab,realm){
  const info=abInfo(ab);
  return {id:ab,name:info.name,source:'innate',kind:info.kind,ab:ab,cd:info.kind==='active'?info.cd:undefined,unlocked:true,tier:null,realm:realm,desc:info.desc};
}
function normalizeInnate(s){
  if(!s||typeof s!=='object')return null;
  const info=s.ab?abInfo(s.ab):{};
  const kind=(s.kind||info.kind||'passive')==='active'?'active':'passive';
  const o={id:s.id||s.ab||s.name,name:s.name||info.name||s.id,source:'innate',kind:kind,ab:s.ab,gfId:s.gfId,cd:kind==='active'?(s.cd!=null?s.cd:info.cd):undefined,unlocked:s.unlocked!==false,tier:s.tier==null?null:s.tier,desc:s.desc||info.desc};
  if(s.dr)o.dr=s.dr;
  if(Array.isArray(s.effects))o.effects=s.effects;
  return o;
}
function innateSkills(u){
  const out=[];
  if(u){
    const RS=realmTable();
    const realm=u.realm|0;
    for(let r=1;r<=realm;r++){
      const R=RS[r];
      if(R&&R.ab)out.push(makeInnateAbSkill(R.ab,r));
    }
  }
  for(const src of innateSources){
    try{
      const extra=typeof src==='function'?src(u):src;
      if(Array.isArray(extra))for(const s of extra){const n=normalizeInnate(s);if(n)out.push(n);}
    }catch(e){}
  }
  return out;
}
function equippedIds(u){
  migrateUnit(u);
  const ids=[];
  if(u&&u.gf){
    if(u.gf.main)ids.push(u.gf.main);
    if(u.gf.aux)for(const id of u.gf.aux)if(id&&ids.indexOf(id)<0)ids.push(id);
  }
  return ids;
}
function makeLearnedActive(row,rec,ab,needTier,eq){
  const info=abInfo(ab);
  const tier=rec?rec.tier:0;
  return {id:'gf:'+row.id+':'+ab,name:(row.name||row.id)+'・'+(info.name||ab),source:'learned',kind:'active',gfId:row.id,ab:ab,cd:info.cd,unlocked:(tier|0)>=(needTier|0),equipped:!!eq,tier:tier,needTier:needTier|0,desc:info.desc};
}
function learnedSkills(u){
  migrateUnit(u);
  if(!u||!u.gf||!u.gf.learned)return [];
  const out=[];
  const eqSet={};for(const id of equippedIds(u))eqSet[id]=1;
  for(const id in u.gf.learned){
    const row=get(id)||{id:id,name:id,cult:1};
    const rec=u.gf.learned[id]||{prof:0,tier:0};
    const eq=!!eqSet[id];
    const pass={id:'gf:'+id+':cult',name:(row.name||id)+'・修煉',source:'learned',kind:'passive',gfId:id,unlocked:true,equipped:eq,tier:rec.tier,cult:row.cult,profBonus:GF_CFG.profCult[rec.tier]||0,desc:row.desc};
    const cfx=rowCombatEffects(row);
    if(cfx.length)pass.effects=cfx;
    if(row.dr)pass.dr=row.dr;
    out.push(pass);
    if(!isPassiveRow(row)){
      if(row.ab)out.push(makeLearnedActive(row,rec,row.ab,0,eq));
      if(row.unlocks)for(const un of row.unlocks)if(un&&un.ab)out.push(makeLearnedActive(row,rec,un.ab,un.at|0,eq));
    }
  }
  return out;
}
function skillsByGroup(u){
  const g={innate:{active:[],passive:[]},learned:{active:[],passive:[]}};
  for(const s of innateSkills(u))(s.kind==='active'?g.innate.active:g.innate.passive).push(s);
  for(const s of learnedSkills(u))(s.kind==='active'?g.learned.active:g.learned.passive).push(s);
  return g;
}
function allAbilities(u){
  const out=[];
  function add(ab){if(ab&&out.indexOf(ab)<0)out.push(ab);}
  for(const s of innateSkills(u))add(s.ab||(s.kind==='active'?s.id:null));
  migrateUnit(u);
  if(on()&&u&&u.gf&&u.gf.main)for(const ab of unlockedAbs(u,u.gf.main))add(ab);
  return out;
}
let _origHasAb=null;
function realmHasAb(u,ab){
  if(!u||!ab)return false;
  const RS=realmTable();
  for(let r=1;r<=(u.realm|0);r++)if(RS[r]&&RS[r].ab===ab)return true;
  return false;
}
function queryHasAb(u,ab){
  if(!ab)return false;
  if(_origHasAb){try{if(_origHasAb(u,ab))return true;}catch(e){}}
  else if(realmHasAb(u,ab))return true;
  return grantsAb(u,ab);
}

function rollDrop(opt){
  opt=opt||{};
  const rng=opt.rng||Math.random;
  const realm=opt.realm==null?99:opt.realm;
  const list=CATALOG.filter(r=>(r.minRealm|0)<=realm&&(!opt.school||r.school===opt.school));
  if(!list.length)return null;
  return list[Math.floor(rng()*list.length)%list.length].id;
}

function schoolOf(u){migrateUnit(u);const r=u&&u.gf&&u.gf.main&&get(u.gf.main);return r?r.school:null;}
function counters(a,b){const sa=schoolOf(a),sb=schoolOf(b);return !!(sa&&sb&&COUNTER[sa]===sb);}

function gfTick(dt){
  if(!on())return;
  const s=getS();if(!s||!s.units)return;
  if(s.flags)s.flags.gf=s.flags.gf||{v:GF_CFG.saveVer};
  for(const u of s.units){
    if(!u)continue;
    migrateUnit(u);
    if(u.dead){if(u.gf.study||(u.gf.holding&&u.gf.holding.length))returnAll(u,'warehouse','death');continue;}
    if(u.gf.pen&&now()>=u.gf.pen.t)u.gf.pen=null;
    if(u.gf.study){
      const p=studyProgress(u);
      if(p&&p.left<=0)finishStudy(u);
    }
    if(u.gf.main&&u.gf.learned[u.gf.main])addProf(u,u.gf.main,GF_CFG.profPerSec*(dt||0));
    try{
      const pc=window.Cult&&typeof Cult.isPlayerChar==='function'&&Cult.isPlayerChar(u);
      if(u.kind==='disciple'&&!pc&&!u.np){
        const filled=(u.gf.bar||[]).some(Boolean);
        if(!filled)autoPickBar(u);
      }
    }catch(e2){}
    maybeEntry(u);
  }
}

function plainCult(mul){
  const m=+mul||1;
  const pct=Math.round((m-1)*100);
  if(!pct)return '修煉速度不變';
  return '修煉速度 '+(pct>0?'+':'')+pct+'%';
}
function qiCostOf(ab){
  try{
    const T=(typeof TUNE!=='undefined'&&TUNE&&TUNE.v49)||(window.TUNE&&window.TUNE.v49)||{};
    if(ab==='sp')return T.spellCost||80;
    if(T.abCost&&T.abCost[ab]!=null)return T.abCost[ab];
  }catch(e){}
  const fb={charge:30,sweep:30,fireball:60,flysword:80,jindan:150};
  return fb[ab]||0;
}
function cdOf(ab){const info=abInfo(ab);return info&&info.cd!=null?info.cd:undefined;}
function howOf(row){
  if(!row)return '可在坊市、功法閣借閱，或於秘境與出行機緣中求得秘本。';
  if(row.how)return row.how;
  if(row.entry)return '宗門持有功法卷、且已達宗師時，可自動領悟這門入門功法。';
  return '可在坊市求購、功法閣借閱，或於秘境、出行機緣中求得秘本。';
}
function isPassiveRow(row){
  if(!row)return false;
  if(row.kind==='passive')return true;
  if(row.kind==='active')return false;
  const hasAb=!!(row.ab||(row.unlocks&&row.unlocks.some(function(un){return !!(un&&un.ab);})));
  return !hasAb;
}
function hpRatio(u){
  const mx=+(u&&u.maxhp||0);
  if(!(mx>0))return 1;
  return Math.max(0,(+u.hp||0)/mx);
}
function qiRatio(u){
  const mx=+(u&&((u.qiMax!=null?u.qiMax:u.maxqi)||0));
  if(!(mx>0))return 0;
  return Math.max(0,Math.min(1,(+u.qi||0)/mx));
}
function condMet(u,when){
  if(!when)return true;
  if(!u)return false;
  const hr=hpRatio(u),qr=qiRatio(u);
  if(when.hpLt!=null&&!(hr<+when.hpLt))return false;
  if(when.hpLte!=null&&!(hr<=+when.hpLte))return false;
  if(when.hpGt!=null&&!(hr>+when.hpGt))return false;
  if(when.hpGte!=null&&!(hr>=+when.hpGte))return false;
  if(when.qiFull||when.qiGte===1||when.qiGte===1.0){
    const need=(when.qiGte!=null&&when.qiGte!==1&&when.qiGte!==1.0)?+when.qiGte:0.999;
    if(qiRatio(u)<=0&&!(u&&(u.qiMax>0||u.maxqi>0)))return false;
    if(!(qr>=need))return false;
  }else if(when.qiGte!=null&&!(qr>=+when.qiGte))return false;
  if(when.qiLt!=null){
    if(!(u&&(u.qiMax>0||u.maxqi>0)))return false;
    if(!(qr<+when.qiLt))return false;
  }
  if(when.qiLte!=null){
    if(!(u&&(u.qiMax>0||u.maxqi>0)))return false;
    if(!(qr<=+when.qiLte))return false;
  }
  return true;
}
function rowCombatEffects(row){
  const out=[];
  if(!row)return out;
  if(Array.isArray(row.effects)){
    for(let i=0;i<row.effects.length;i++){
      const e=row.effects[i];
      if(e&&e.type)out.push(e);
    }
  }
  if(row.cond){
    const c=row.cond,when={};
    if(c.hpLt!=null)when.hpLt=+c.hpLt;
    if(c.hpLte!=null)when.hpLte=+c.hpLte;
    if(c.hpGt!=null)when.hpGt=+c.hpGt;
    if(c.hpGte!=null)when.hpGte=+c.hpGte;
    if(c.qiLt!=null)when.qiLt=+c.qiLt;
    if(c.qiLte!=null)when.qiLte=+c.qiLte;
    if(c.qiGte!=null)when.qiGte=+c.qiGte;
    if(c.qiFull)when.qiFull=true;
    if(c.atk)out.push({type:'atkMul',v:+c.atk,when:when});
    if(c.spd)out.push({type:'spdMul',v:+c.spd,when:when});
    if(c.dmgRed!=null||c.dr!=null)out.push({type:'dmgRed',v:+(c.dmgRed!=null?c.dmgRed:c.dr),when:when});
  }
  return out;
}
function plainPct(v){
  const p=Math.round((+v||0)*100);
  return (p>0?'+':'')+p+'%';
}
function effectPhrase(fx){
  if(!fx||!fx.type)return '';
  if(fx.type==='atkMul')return '攻擊 '+plainPct(fx.v);
  if(fx.type==='spdMul')return '移動速度 '+plainPct(fx.v);
  if(fx.type==='dmgRed')return '受到傷害減少 '+Math.round((+fx.v||0)*100)+'%';
  return '';
}
function whenPhrase(when){
  if(!when)return '';
  if(when.hpLt!=null)return '血量低於 '+Math.round(+when.hpLt*100)+'% 時';
  if(when.hpLte!=null)return '血量不高於 '+Math.round(+when.hpLte*100)+'% 時';
  if(when.hpGt!=null)return '血量高於 '+Math.round(+when.hpGt*100)+'% 時';
  if(when.hpGte!=null)return '血量不少於 '+Math.round(+when.hpGte*100)+'% 時';
  if(when.qiFull||when.qiGte===1||when.qiGte===1.0)return '靈力全滿時';
  if(when.qiGte!=null)return '靈力不少於 '+Math.round(+when.qiGte*100)+'% 時';
  if(when.qiLt!=null)return '靈力低於 '+Math.round(+when.qiLt*100)+'% 時';
  if(when.qiLte!=null)return '靈力不高於 '+Math.round(+when.qiLte*100)+'% 時';
  return '';
}
function condLine(fx){
  const ef=effectPhrase(fx);if(!ef)return '';
  const wh=whenPhrase(fx.when);
  return wh?wh+'，'+ef:('學會後，'+ef);
}
function describe(ref,u){
  const id=(ref&&typeof ref==='object')?ref.id:ref;
  const row=(ref&&typeof ref==='object'&&ref.name)?ref:get(id);
  if(!row)return '';
  const sc=schoolName(row.school);
  const tier=((typeof GF_TIERS!=='undefined'?GF_TIERS:window.GF_TIERS)||{})[row.tier];
  const tierN=tier&&tier.n?tier.n:(row.tier==='high'?'高階神通':row.tier==='mid'?'中階功法':'低階功法');
  const lines=[];
  lines.push((row.name||id)+'（'+sc+'派・'+tierN+'）');
  if(row.desc)lines.push(row.desc);
  lines.push('效果：'+plainCult(row.cult||1)+'（主修享全部；輔修大約三成五）。');
  const fx=rowCombatEffects(row);
  for(let i=0;i<fx.length;i++){
    const line=condLine(fx[i]);
    if(line)lines.push(line+'。');
  }
  if(isPassiveRow(row)){
    lines.push('主修：完整享受修煉加成；輔修：不佔技能欄，只得部分修煉加成。');
    lines.push('被動：學會後即永久生效，沒有可施放招式，不必放進技能欄。');
  }else{
    lines.push('主修：完整享受修煉加成，並把這門招式視為已備；輔修：不佔技能欄，只得部分修煉加成。');
    lines.push('被動：學會後即永久生效，不必放進技能欄。');
    const abs=[];
    if(row.ab)abs.push(row.ab);
    if(row.unlocks)for(const un of row.unlocks)if(un&&un.ab)abs.push(un.ab);
    if(abs.length){
      const bits=abs.map(function(ab){
        const info=abInfo(ab);
        const qi=qiCostOf(ab),cd=info.cd;
        let t=info.name||ab;
        if(info.kind==='active'){
          if(qi)t+='，靈力 '+qi;
          if(cd!=null)t+='，冷卻 '+cd+' 秒';
        }else t+='（被動）';
        if(info.desc)t+='。'+info.desc;
        return t;
      });
      lines.push('招式：'+bits.join('；'));
    }
  }
  lines.push('取得：'+howOf(row));
  return lines.join('\n');
}
function combatAtkMul(u){
  if(!on()||!u)return 1;
  let m=1;
  const fx=collectEffects(u);
  for(let i=0;i<fx.length;i++)if(fx[i]&&fx[i].type==='atkMul')m*=(1+(+fx[i].v||0));
  if(m<0.01)m=0.01;
  return m;
}
function combatSpdMul(u){
  if(!on()||!u)return 1;
  let m=1;
  const fx=collectEffects(u);
  for(let i=0;i<fx.length;i++)if(fx[i]&&fx[i].type==='spdMul')m*=(1+(+fx[i].v||0));
  if(m<0.01)m=0.01;
  return m;
}
function tipHtml(ref,u){
  return htmlEsc(describe(ref,u)).replace(/\n/g,'<br>');
}
function barOf(u){
  migrateUnit(u);
  return (u&&u.gf&&u.gf.bar)||[];
}
function equipBar(u,ab,slot){
  if(isClient())return fail('client');
  if(!on())return fail('flag-off');
  if(!u||!ab)return fail('no');
  const asRow=get(ab);
  if(asRow&&isPassiveRow(asRow))return fail('passive-no-bar');
  if(!activeIds(u).includes(ab))return fail('not-learned-active');
  migrateUnit(u);
  const n=GF_CFG.barSlots||5;
  let i=slot;
  if(i==null||i<0||i>=n){
    i=u.gf.bar.indexOf(null);
    if(i<0)i=0;
  }
  const prev=u.gf.bar.indexOf(ab);
  if(prev>=0&&prev!==i){u.gf.bar[prev]=u.gf.bar[i];}
  u.gf.bar[i]=ab;
  return {ok:true,ab:ab,slot:i,bar:u.gf.bar.slice()};
}
function unequipBar(u,slot){
  if(isClient())return fail('client');
  if(!u)return fail('no-unit');
  migrateUnit(u);
  if(slot==null){u.gf.bar=u.gf.bar.map(function(){return null;});return {ok:true};}
  if(slot>=0&&slot<u.gf.bar.length)u.gf.bar[slot]=null;
  return {ok:true,bar:u.gf.bar.slice()};
}
function knownActives(u){
  const out=[],seen={};
  for(const s of learnedSkills(u)){
    if(s.kind!=='active'||!s.ab||!s.unlocked)continue;
    if(seen[s.ab])continue;seen[s.ab]=1;
    out.push(s);
  }
  for(const s of innateSkills(u)){
    if(s.kind!=='active'||!s.ab)continue;
    if(seen[s.ab])continue;seen[s.ab]=1;
    out.push(s);
  }
  return out;
}
function activeIds(u){const ids=knownActives(u).map(s=>s.ab);if(u&&(u.realm|0)>=4&&u.lg)ids.push('sp');return [...new Set(ids)];}
function libraryQuote(u,id){const E=econApi(),tech=E&&E.gfGet&&E.gfGet(id);
 if(!E||!tech||typeof E.gfCanAccess!=='function'||typeof econIsPlayerUnit!=='function'||typeof ECON_GF_TUNE==='undefined')return fail('policy-unavailable');
 const access=E.gfCanAccess(u,tech);if(!access.ok)return access;
 // PC exemption and duration are existing econ rules, not new fees or eligibility.
 if(!econIsPlayerUnit(u))return fail('player-only-ui');
 if(!(ECON_GF_TUNE.borrowSec>0))return fail('policy-unavailable');
 return {ok:true,fee:0,cur:'lingshi',seconds:ECON_GF_TUNE.borrowSec};
}
function performAction(u,i){if(isClient())return fail('client');if(!u||!i)return fail('no-unit');
 if(i.op==='bar'){
  if(!Number.isInteger(i.slot)||i.slot<0||i.slot>=5)return fail('slot');
  const r=i.ab==null?unequipBar(u,i.slot):equipBar(u,i.ab,i.slot);if(r.ok){const seen=new Set(),allowed=new Set(activeIds(u)),order=[i.slot,...[0,1,2,3,4].filter(x=>x!==i.slot)];for(const j of order){const ab=u.gf.bar[j];if(!ab||!allowed.has(ab)||seen.has(ab))u.gf.bar[j]=null;else seen.add(ab);}u.gf.barConfigured=true;r.bar=u.gf.bar.slice();}return r;
 }
 if(i.op==='study'){if(i.confirm!==true)return fail('confirmation-required');return startStudy(u,i.gfId,'warehouse');}
 const E=econApi();if(!E)return fail('no-econ');
 if(i.op==='borrow'){if(i.confirm!==true)return fail('confirmation-required');const q=libraryQuote(u,i.gfId);if(!q.ok)return q;
  if(i.seconds!==q.seconds||i.fee!==q.fee)return fail('quote-changed');return E.gfBorrow(u,i.gfId);}
 if(i.op==='libraryStudy')return E.gfBeginStudy(u,i.gfId);
 if(i.op==='return')return i.source==='library'?E.gfReturn(u,i.gfId,'manual'):returnManual(u,i.gfId,'warehouse');
 return fail('operation');
}
function sendAction(u,i){const r=window.CultGFNet&&(u.kind==='player'||u.np||isClient())?CultGFNet.request(u,i):performAction(u,i);
 CultGF._actionResult=r&&r.pending?'等待房主確認':r&&r.ok?'操作完成':('未完成：'+(r&&r.reason||r&&r.code||'unknown'));return r;}
function autoPickBar(u){
  if(!u)return [];
  if(isClient())return barOf(u).slice();
  migrateUnit(u);
  const n=GF_CFG.barSlots||5;
  const acts=knownActives(u);
  const picked=[];
  for(const s of acts){
    if(picked.indexOf(s.ab)>=0)continue;
    picked.push(s.ab);
    if(picked.length>=n)break;
  }
  while(picked.length<n)picked.push(null);
  u.gf.bar=picked.slice(0,n);
  return u.gf.bar.slice();
}
function htmlEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function schoolName(sc){const m=(typeof GF_SCHOOLS!=='undefined'?GF_SCHOOLS:window.GF_SCHOOLS)||{};return (m[sc]&&m[sc].n)||sc;}
function selUnit(){
  try{
    const ids=(typeof selUnits!=='undefined')?selUnits:((window.XW&&XW.sel)||window.selUnits);
    if(!ids||!ids.length)return null;
    const s=getS();if(!s||!s.units)return null;
    return s.units.find(x=>x.id===ids[0])||null;
  }catch(e){return null;}
}
function fmtSkillNames(arr){
  if(!arr||!arr.length)return '（無）';
  return arr.map(s=>{
    let t=s.name;
    if(s.source==='learned'&&s.tier!=null)t+='（'+profName(s.tier)+'）';
    if(s.kind==='active'&&s.cd!=null)t+=' CD'+s.cd;
    if(s.kind==='passive'&&s.cult)t+=' '+plainCult(s.cult);
    if(s.source==='learned'&&s.equipped)t+=' ·已裝備';
    if(s.source==='learned'&&s.kind==='active'&&!s.unlocked)t+=' ·未解鎖';
    return t;
  }).join('、');
}
function panelHtml(u){
  migrateUnit(u);
  const g=u.gf,row=g.main&&get(g.main);
  const sl=slots(u);
  const grp=skillsByGroup(u);
  let h='<div class="sec" id="'+(CultGF._panelOpen?'gf_drawer_sec':'gf_sec')+'">';
  const cf=CultGF._confirmUI;if(cf&&cf.unitId===u.id){h+=`<p class="mini">確認${cf.op==='study'?'暫取1卷參悟（可歸還）':'借閱：費用 '+cf.fee+'／期限 '+cf.seconds+'秒'}「${htmlEsc(get(cf.gfId).name)}」？</p><button class="btn" data-gf="confirmStudy">確認</button><button class="btn" data-gf="cancelStudy">取消</button>`;}
  h+='<div id="gf_innate"><b>固有技能</b>';
  h+=`<div class="mini" data-gf-sub="innate-active">主動：${htmlEsc(fmtSkillNames(grp.innate.active))}</div>`;
  h+=`<div class="mini" data-gf-sub="innate-passive">被動：${htmlEsc(fmtSkillNames(grp.innate.passive))}</div></div>`;
  h+='<div id="gf_learned"><b>學習技能</b>';
  if(g.study){
    const p=studyProgress(u);const rowS=get(g.study.id);
    h+=`<div class="mini">參悟「${htmlEsc(rowS?rowS.name:g.study.id)}」 ${Math.round((p?p.p:0)*100)}%</div>`;
  }
  h+=`<div class="mini" data-gf-sub="learned-active">主動：${htmlEsc(fmtSkillNames(grp.learned.active))}</div>`;
  h+=`<div class="mini" data-gf-sub="learned-passive">被動：${htmlEsc(fmtSkillNames(grp.learned.passive))}</div>`;
  h+=`<div class="mini">主修：${row?htmlEsc(row.name)+' · '+schoolName(row.school):'無'}　輔修 ${g.aux.length}/${sl.aux}</div>`;
  if(row){
    h+=`<div class="mini gf-tip" data-gf="tip" data-id="${htmlEsc(row.id)}" title="${htmlEsc(describe(row,u))}">${htmlEsc(row.desc||'')}　${htmlEsc(plainCult(row.cult||1))}。點此看完整說明。</div>`;
  }
  if(g.holding&&g.holding.length){
    h+='<div class="jobs">';
    for(const id of g.holding){
      const rr=get(id);
      h+=`<button class="btn" data-gf="ret" data-id="${htmlEsc(id)}">歸還「${htmlEsc(rr?rr.name:id)}」</button>`;
    }
    h+='</div>';
  }
  const manuals=manualCounts(u);
  h+='<div id="gf_learning"><b>卷軸參悟</b><p class="mini">先確認才暫取一卷，學成仍持有可歸還；私有卷歸還原持有人，不變成公卷。</p>';
  for(const id in manuals){if(owned(u,id))continue;const rr=get(id);h+=`<button class="btn" data-gf="study" data-id="${htmlEsc(id)}">參悟「${htmlEsc(rr.name)}」 ×${manuals[id]}</button>`;}
  h+='<button class="btn" data-gf="library">功法閣借閱（'+(CultGF._libraryOpen?'收起':'展開館藏')+'）</button>';
  if(CultGF._libraryOpen){const E=econApi(),G=getS().econ&&getS().econ.gf;
   h+='<p class="mini">沿用功法閣原庫存、資格與期限；玩家依既有規則免借閱費。借閱與參悟分開確認。</p>';
   for(const row of G&&G.scrolls||[]){const rr=get(row.gfId);if(!rr)continue;const loan=E&&E.gfLoanOf&&E.gfLoanOf(u,rr.id);
    h+=`<div class="mini">${htmlEsc(rr.name)} · 庫存${row.n|0}${!row.stockSource||row.stockSource==='legacy-unverified'?'（舊庫存來源未核實）':''} `;
    if(loan)h+=`借卷中 <button class="btn" data-gf="libraryStudy" data-id="${htmlEsc(rr.id)}">參悟借卷</button> <button class="btn" data-gf="libReturn" data-id="${htmlEsc(rr.id)}">歸還借卷</button>`;
    else if(!owned(u,rr.id)&&row.n>0)h+=`<button class="btn" data-gf="borrow" data-id="${htmlEsc(rr.id)}">借閱</button>`;
    else if(!owned(u,rr.id))h+='無可借庫存';h+='</div>';
   }
  }
  if(CultGF._actionResult)h+='<p role="status">'+htmlEsc(CultGF._actionResult)+'</p>';h+='</div>';
  const learnedIds=Object.keys(g.learned);
  if(learnedIds.length){
    h+='<div class="jobs">';
    for(const id of learnedIds){
      const rr=get(id);const onM=g.main===id;
      h+=`<button class="btn${onM?' on':''}" data-gf="eq" data-id="${htmlEsc(id)}" data-slot="main" title="${htmlEsc(describe(rr||id,u))}">${onM?'主修中':'主修'} ${htmlEsc(rr?rr.name:id)}</button>`;
      h+=`<button class="btn" data-gf="tip" data-id="${htmlEsc(id)}">說明</button>`;
      if(sl.aux>0)h+=`<button class="btn${g.aux.indexOf(id)>=0?' on':''}" data-gf="aux" data-id="${htmlEsc(id)}">${g.aux.indexOf(id)>=0?'輔修中':'輔修'}</button>`;
    }
    h+='</div>';
  }
  const bar=barOf(u),acts=knownActives(u);
  h+='<div id="gf_bar"><b>技能欄</b><span class="mini">　主動最多 5 格（拖放或點選替換）；被動學會即生效、不佔格</span></div>';
  h+='<div class="jobs" id="gf_bar_slots">';
  for(let i=0;i<((GF_CFG.barSlots)|0||5);i++){
    const ab=bar[i];
    const info=ab?abInfo(ab):null;
    const lab=info?info.name:('空 '+ (i+1));
    const qi=ab?qiCostOf(ab):0,cd=info&&info.cd;
    const extra=ab?(' 靈力'+qi+(cd!=null?(' 冷卻'+cd+'秒'):'')):'';
    h+=`<button class="btn${ab?' on':''}" draggable="true" data-gf="bar" data-slot="${i}" data-ab="${htmlEsc(ab||'')}" title="${htmlEsc(ab?((info&&info.desc)||lab)+extra:'點選已學招式以裝上此格')}">${htmlEsc(lab)}${htmlEsc(extra)}</button>`;
  }
  h+='</div>';
  if(acts.length){
    h+='<div class="jobs" id="gf_bar_pool">';
    for(const s of acts){
      const onB=bar.indexOf(s.ab)>=0;
      const qi=qiCostOf(s.ab),cd=s.cd;
      h+=`<button class="btn${onB?' on':''}" draggable="true" data-gf="barput" data-ab="${htmlEsc(s.ab)}" title="${htmlEsc((s.desc||s.name)+' 靈力'+qi+(cd!=null?(' 冷卻'+cd+'秒'):''))}">${htmlEsc(s.name)}${onB?' ·已上欄':''}</button>`;
    }
    h+='</div>';
  }
  if(g.pen&&now()<g.pen.t)h+=`<div class="mini">換修調息 ${Math.ceil(g.pen.t-now())} 秒</div>`;
  const cm=mul(u),pct=Math.round((cm-1)*100);
  h+=`<div class="mini">功法修煉 ${pct?((pct>0?'+':'')+pct+'%'):'無額外加成'}</div></div></div>`;
  return h;
}
function paintPanel(){
  if(!on()){const old=document.getElementById('gf_sec');if(old)old.remove();return;}
  const el=CultGF._panelOpen?document.getElementById('cultGFBody'):document.getElementById('panel');if(!el||(!CultGF._panelOpen&&el.style.display==='none'))return;
  const u=selUnit();
  const prev=el.querySelector(CultGF._panelOpen?'#gf_drawer_sec':'#gf_sec');
  if(CultGF._panelOpen)for(const node of document.querySelectorAll('#gf_sec'))if(!el.contains(node))node.remove();
  if(!u){if(prev)prev.remove();return;}
  const html=panelHtml(u);
  if(prev&&CultGF._renderedPanel===html)return;CultGF._renderedPanel=html;
  if(prev){const wrap=document.createElement('div');wrap.innerHTML=html;const nxt=wrap.firstChild;if(nxt)prev.replaceWith(nxt);}
  else el.insertAdjacentHTML('beforeend',html);
}
function showTip(html){
  let box=document.getElementById('gf_tipbox');
  if(!box){
    box=document.createElement('div');box.id='gf_tipbox';
    box.style.cssText='position:fixed;z-index:40;max-width:320px;padding:10px 12px;background:#1a140cdc;color:#f3e3c0;border:1px solid #8a6a3a;border-radius:8px;font-size:13px;line-height:1.45;display:none;pointer-events:auto;';
    document.body.appendChild(box);
    box.addEventListener('click',function(ev){ev.stopPropagation();});
  }
  box.innerHTML=html+'<div class="mini" style="margin-top:6px;opacity:.75">再點一次或點空白處關閉</div>';
  box.style.display='block';
  box.style.left=Math.max(8,Math.min(window.innerWidth-340,(window._gfTipX||80)))+'px';
  box.style.top=Math.max(8,Math.min(window.innerHeight-180,(window._gfTipY||80)))+'px';
  CultGF._tipOn=true;
}
function hideTip(){const box=document.getElementById('gf_tipbox');if(box)box.style.display='none';CultGF._tipOn=false;CultGF._tipPick=null;}
function mountGFPanel(){if(document.getElementById('cultGFPanel'))return;
 const style=document.createElement('style');style.textContent='#cultGFPanel{position:fixed;z-index:11500;right:8px;top:90px;width:min(450px,calc(100vw - 16px));max-height:calc(100vh - 110px);overflow:auto;box-sizing:border-box;background:#211b13fa;border:1px solid #a9864b;border-radius:8px;color:#f3e3c0;padding:12px;font-size:14px}#cultGFPanel[hidden]{display:none}#cultGFPanel .btn{min-height:36px;white-space:normal;margin:3px}#cultGFPanel .mini{white-space:normal;overflow-wrap:anywhere}';document.head.appendChild(style);
 const panel=document.createElement('section');panel.id='cultGFPanel';panel.hidden=true;panel.setAttribute('aria-label','功法與卷軸');panel.innerHTML='<h3>功法／卷軸 <button class="btn" data-gf="closePanel">關閉</button></h3><div id="cultGFBody"></div>';document.body.appendChild(panel);
 const b=document.createElement('button');b.id='cultGFBtn';b.className='btn';b.textContent='功法／卷軸';b.onclick=()=>openGFPanel(!CultGF._panelOpen);(document.getElementById('menuBar')||document.body).appendChild(b);
}
function openGFPanel(on){mountGFPanel();const prev=document.getElementById('gf_sec');if(prev)prev.remove();CultGF._panelOpen=!!on;document.getElementById('cultGFPanel').hidden=!on;CultGF._renderedPanel=null;paintPanel();}
function bindUi(){
  if(CultGF._ui)return;CultGF._ui=1;
  document.addEventListener('click',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf]');
    if(!t){if(CultGF._tipOn&&!ev.target.closest('#gf_tipbox'))hideTip();return;}
    const act=t.getAttribute('data-gf'),id=t.getAttribute('data-id');
    if(act==='closePanel'){openGFPanel(false);ev.stopPropagation();return;}
    const u=selUnit();if(!u)return;
    window._gfTipX=(ev.clientX||80)+12;window._gfTipY=(ev.clientY||80)+12;
    if(act==='study'||act==='borrow'){
      const q=act==='borrow'?libraryQuote(u,id):{ok:true};
      if(q.ok)CultGF._confirmUI={unitId:u.id,op:act,gfId:id,...q};else CultGF._actionResult='未完成：'+q.reason;
      paintPanel();if(CultGF._panelOpen)document.getElementById('cultGFPanel').scrollTop=0;ev.stopPropagation();return;
    }
    if(act==='confirmStudy'){const q=CultGF._confirmUI;if(q&&q.unitId===u.id)sendAction(u,{op:q.op,gfId:q.gfId,confirm:true,...(q.op==='borrow'?{fee:q.fee,seconds:q.seconds}:{})});CultGF._confirmUI=null;paintPanel();ev.stopPropagation();return;}
    if(act==='cancelStudy'){CultGF._confirmUI=null;paintPanel();ev.stopPropagation();return;}
    if(act==='library'){CultGF._libraryOpen=!CultGF._libraryOpen;paintPanel();ev.stopPropagation();return;}
    if(act==='libraryStudy'||act==='libReturn'){sendAction(u,{op:act==='libraryStudy'?'libraryStudy':'return',source:'library',gfId:id});paintPanel();ev.stopPropagation();return;}
    if(act==='eq')equip(u,id,t.getAttribute('data-slot')||'main');
    if(act==='ret')sendAction(u,{op:'return',gfId:id,source:'manual'});
    if(act==='aux')equip(u,id,'aux');
    if(act==='tip'){
      const html=tipHtml(id,u);
      if(CultGF._tipOn&&CultGF._tipId===id)hideTip();
      else{CultGF._tipId=id;showTip(html);}
      ev.stopPropagation();return;
    }
    if(act==='bar'){
      const slot=+t.getAttribute('data-slot');
      if(CultGF._tipPick){sendAction(u,{op:'bar',ab:CultGF._tipPick,slot});CultGF._tipPick=null;}
      else if(t.getAttribute('data-ab'))sendAction(u,{op:'bar',ab:null,slot});
      paintPanel();ev.stopPropagation();return;
    }
    if(act==='barput'){
      const ab=t.getAttribute('data-ab');
      const empty=(u.gf.bar||[]).indexOf(null);
      if(empty>=0)sendAction(u,{op:'bar',ab,slot:empty});
      else CultGF._tipPick=ab;
      paintPanel();ev.stopPropagation();return;
    }
    paintPanel();
    ev.stopPropagation();
  });
  document.addEventListener('dragstart',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf="barput"],[data-gf="bar"]');
    if(!t||!ev.dataTransfer)return;
    const ab=t.getAttribute('data-ab')||'';
    const slot=t.getAttribute('data-slot');
    ev.dataTransfer.setData('text/plain',slot!=null?'s:'+slot:'a:'+ab);
    CultGF._drag=slot!=null?{k:'s',v:+slot}:{k:'a',v:ab};
  });
  document.addEventListener('dragover',ev=>{
    if(ev.target&&ev.target.closest&&ev.target.closest('[data-gf="bar"]'))ev.preventDefault();
  });
  document.addEventListener('drop',ev=>{
    const t=ev.target&&ev.target.closest&&ev.target.closest('[data-gf="bar"]');
    if(!t)return;
    ev.preventDefault();
    const u=selUnit();if(!u)return;
    const slot=+t.getAttribute('data-slot');
    let raw='';
    try{raw=ev.dataTransfer.getData('text/plain')||'';}catch(e){}
    const d=CultGF._drag||(raw?{k:raw.split(':')[0],v:raw.split(':').slice(1).join(':')}:null);
    if(!d)return;
    if(d.k==='s'){
      const j=+d.v,bar=barOf(u);if(bar[j])sendAction(u,{op:'bar',ab:bar[j],slot});
    }else if(d.k==='a'&&d.v)sendAction(u,{op:'bar',ab:d.v,slot});
    CultGF._drag=null;paintPanel();
  });
}

function migrate(d){
  if(!d)return d;
  d.gfBag=d.gfBag||{};
  d.flags=d.flags||{};
  d.flags.gf=d.flags.gf||{v:GF_CFG.saveVer};
  migrateInv(d);
  if(d.v45)migrateInv(d.v45,d);
  if(d.units)for(const u of d.units)migrateUnit(u);
  try{
    const owned=d.econ&&d.econ.gf&&d.econ.gf.owned;
    if(owned&&d.units){
      for(const u of d.units){
        const o=owned[u.id];if(!o)continue;
        migrateUnit(u);
        for(const id in o){if(o[id]&&get(id)&&!u.gf.learned[id])u.gf.learned[id]={prof:0,tier:0};}
      }
    }
  }catch(e){}
  return d;
}

const CultGF={
  CFG:GF_CFG,CATALOG:CATALOG,
  on:on,get:get,catalog:catalog,itemId:itemId,parseItemId:parseItemId,priceHint:priceHint,
  openPanel:openGFPanel,manualCounts:manualCounts,libraryQuote:libraryQuote,performAction:performAction,sendAction:sendAction,activeIds:activeIds,learn:learn,startStudy:startStudy,studyProgress:studyProgress,returnManual:returnManual,returnAll:returnAll,
  owned:owned,bagCount:bagCount,grantManual:grantManual,consumeManual:consumeManual,
  equip:equip,unequip:unequip,slots:slots,mul:mul,grantsAb:grantsAb,maybeEntry:maybeEntry,
  studyDur:studyDur,studySpeedMul:studySpeedMul,profTier:profTier,profName:profName,addProf:addProf,unlockedAbs:unlockedAbs,
  pack:pack,unpack:unpack,migrate:migrate,migrateUnit:migrateUnit,migrateInv:migrateInv,rollDrop:rollDrop,
  grant:grant,list:list,tick:gfTick,paint:paintPanel,counters:counters,schoolOf:schoolOf,
  AB_KIND:AB_KIND,innateSources:innateSources,innateSkills:innateSkills,learnedSkills:learnedSkills,
  allAbilities:allAbilities,skillsByGroup:skillsByGroup,skillKind:skillKind,abInfo:abInfo,panelHtml:panelHtml,hasAb:queryHasAb,
  caps:function(){return {cultMul:capOf('cultMul'),dmgRed:capOf('dmgRed')};},
  collectEffects:collectEffects,stackEffects:stackEffects,dmgRed:dmgRedOf,scaleIncoming:scaleIncoming,
  dmgUnit:gfDmgUnit,heal:healUnit,
  describe:describe,tipHtml:tipHtml,plainCult:plainCult,qiCostOf:qiCostOf,howOf:howOf,
  barOf:barOf,equipBar:equipBar,unequipBar:unequipBar,autoPickBar:autoPickBar,knownActives:knownActives,
  isPassiveRow:isPassiveRow,condMet:condMet,rowCombatEffects:rowCombatEffects,condLine:condLine,
  combatAtkMul:combatAtkMul,combatSpdMul:combatSpdMul,hpRatio:hpRatio,qiRatio:qiRatio,
  applyDmgEnemy:function(src,e,amt,col){
    const fn=(typeof dmgEnemy==='function')?dmgEnemy:(window._cultGfDmgEnemy||window.dmgEnemy);
    if(typeof fn==='function')return fn(src,e,amt,col);
  },
  applyMoveEntity:function(o,dt){
    const fn=(typeof moveEntity==='function')?moveEntity:(window._cultGfMoveEntity||window.moveEntity);
    if(typeof fn==='function')return fn(o,dt);
  }
};
window.CultGF=CultGF;
window.XW_GF={
  list:list,get:getEcon,learn:xwLearn,owns:owned,grant:grant,
  itemId:itemId,parseItemId:parseItemId,rollDrop:rollDrop,studySpeedMul:studySpeedMul
};
try{if(window.XW)XW.gf=window.XW_GF;}catch(e){}
try{
  if(window.Cult)Cult.grantGongfa=grant;
  window.XW_CULT=window.XW_CULT||window.Cult||{};
  window.XW_CULT.grantGongfa=grant;
}catch(e){}

function install(){
  if(CultGF._installed)return;CultGF._installed=1;
  try{if(typeof UNIT_KEEP!=='undefined'&&UNIT_KEEP.indexOf('gf')<0)UNIT_KEEP.push('gf');}catch(e){}
  if(typeof cultMul==='function'){const _cm=cultMul;cultMul=function(u){return _cm(u)*mul(u);};}
  if(typeof hasAb==='function'&&hasAb!==queryHasAb){_origHasAb=hasAb;hasAb=queryHasAb;}
  try{window.hasAb=queryHasAb;}catch(e){}
  if(typeof dmgUnit==='function'&&dmgUnit!==gfDmgUnit){_origDmgUnit=dmgUnit;dmgUnit=gfDmgUnit;}
  try{window.dmgUnit=gfDmgUnit;}catch(e){}
  if(typeof doBreak==='function'){const _db=doBreak;doBreak=function(u){const r=_db.apply(this,arguments);try{maybeEntry(u);}catch(e){}return r;};}
  if(typeof dmgEnemy==='function'&&!dmgEnemy._cultGfAtk){const _de=dmgEnemy;dmgEnemy=function(src,e,amt,col){
    try{
      if(on()&&src&&e&&counters(src,e))amt=(amt||0)*GF_CFG.counterMul;
      if(on()&&src)amt=(amt||0)*combatAtkMul(src);
      if(on()&&src&&src.gf&&src.gf.main)addProf(src,src.gf.main,GF_CFG.profOnHit);
    }catch(e2){}
    return _de.call(this,src,e,amt,col);
  };dmgEnemy._cultGfAtk=1;}
  try{if(typeof dmgEnemy==='function')window._cultGfDmgEnemy=dmgEnemy;}catch(e3){}
  if(typeof moveEntity==='function'&&!moveEntity._cultGfSpd){const _mv=moveEntity;moveEntity=function(o,dt){
    if(o&&(o.flyOn||o.flee||o.cultXtl||o.xtlOn))return _mv.apply(this,arguments);
    let saved=null;
    try{
      const sm=combatSpdMul(o);
      if(sm!==1&&o){saved={dvx:o.dvx,dvy:o.dvy};o.dvx=(+o.dvx||0)*sm;o.dvy=(+o.dvy||0)*sm;}
    }catch(e2){}
    try{return _mv.apply(this,arguments);}
    finally{
      if(saved&&o){o.dvx=saved.dvx;o.dvy=saved.dvy;}
    }
  };moveEntity._cultGfSpd=1;}
  try{if(typeof moveEntity==='function')window._cultGfMoveEntity=moveEntity;}catch(e4){}
  if(window.Cult&&typeof Cult.tick==='function'){const _ct=Cult.tick.bind(Cult);Cult.tick=function(dt){const r=_ct(dt);try{gfTick(dt);}catch(e){}return r;};}
  else if(typeof tickV045==='function'){const _tk=tickV045;tickV045=function(dt){const r=_tk.apply(this,arguments);try{gfTick(dt);}catch(e){}return r;};}
  if(typeof renderPanel==='function'){const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);try{paintPanel();}catch(e){}return r;};}
  if(typeof snapshot==='function'){const _sn=snapshot;snapshot=function(){
    migrateInv(getS());
    const d=_sn.apply(this,arguments);
    try{
      const s=getS();
      if(d&&s){d.gfBag=JSON.parse(JSON.stringify(s.gfBag||{}));d.flags=d.flags||{};d.flags.gf=(s.flags&&s.flags.gf)||{v:GF_CFG.saveVer};
        if(d.units&&s.units)for(let i=0;i<d.units.length&&i<s.units.length;i++)if(s.units[i]&&s.units[i].gf)d.units[i].gf=JSON.parse(JSON.stringify(s.units[i].gf));
      }
    }catch(e){}
    return d;
  };}
  if(typeof applySave==='function'){const _as=applySave;applySave=function(d){
    // Validate the original raw boundary FIRST, then migrate a private clone. Never wash
    // NaN/Infinity (including a bad nextItem) or mutate the caller's legacy snapshot.
    try{if(d){const E=econApi(),plan=typeof grCurrencyLoadPlan==='function'?grCurrencyLoadPlan:(E&&E.inspectCurrencySave);
      if(typeof plan==='function'){const p=plan(d);if(!p.ok){if(typeof grCurrencySetLoadStatus==='function')grCurrencySetLoadStatus(p);return false;}d=p.data;}
      else d=JSON.parse(JSON.stringify(d,function(k,v){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError('Non-finite save number');return v;}));
      migrate(d);
    }}catch(e){return false;}
    const args=Array.from(arguments);args[0]=d;const r=_as.apply(this,args);
    try{
      const s=getS();
      if(r&&s){if(d&&d.gfBag)s.gfBag=JSON.parse(JSON.stringify(d.gfBag));migrateInv(s);if(s.units)for(const u of s.units)migrateUnit(u);}
    }catch(e){}
    return r;
  };}
  bindUi();setTimeout(mountGFPanel,0);
  try{
    if(typeof v158Learned==='function'&&!v158Learned._cultGf){
      const _vl=v158Learned;
      v158Learned=function(p){
        const o=_vl.apply(this,arguments)||[];
        try{
          if(on()&&p&&p.gf&&p.gf.bar){
            for(const ab of p.gf.bar){if(ab&&o.indexOf(ab)<0)o.push(ab);}
          }
        }catch(e){}
        return o;
      };
      v158Learned._cultGf=1;
    }
  }catch(e){}
}
try{install();}catch(e){console.warn('CultGF.install',e);}
})();
