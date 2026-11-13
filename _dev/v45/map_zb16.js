// ================== 仙武新地圖：至寶接 16 格（z1～z5）＋舊至寶搬移（t1190 配合經濟 econ_slot16.js）==================
// 只在經濟旗標 econSlot16On() 開時生效（?slot16=1 或 S.econ.flags.slot16）；關時完全走舊流程（S.zb.inv）。
// 1) 每個 MAP_ZHIBAO 註冊進 GEAR：鍵 'mzb_'+tid，slot:'z'，desc 給 g14 tipText 讀；不進鍛造（dgOnly／noForge）。
// 2) 掉落：wrap mapZbLootToInv → 開旗時至寶直接變成行囊物品（slot:'z'，不吃行囊上限、不化靈石），詞條用經濟 XW_ECON.rollAffixes。
// 3) 舊檔搬移（冪等，只跑一次）：搬移前把整份存檔 JSON 備份到 localStorage 'xw_zb16_bak_<時間>'（失敗則存精簡版），
//    並在 S.zb.bak16／u.zbBak16 各留一份。舊六種部位鍵（MAP_ZB_SLOTS：經脈／丹田／識海／骨骼／法寶／至寶槽）上的至寶
//    → 換成新物品依序放 z1～z5，放不下的退回行囊；S.zb.inv 舊至寶 → 行囊（原筆記錄搬到 S.zb.inv16，不刪）；
//    行囊裡舊格式至寶（有 tid、沒有 GEAR）→ 原地轉成新物品。數值換算見 MAP_ZB16_TUNE（待使用者確認）。
// 掛鉤（都在本檔 wrap，不改 g*／econ*）：mapZbLootToInv、econSlot16Migrate、econSlot16MigrateAll、itemName（至寶顯示「至寶・名」）。
var MAP_ZB16_TUNE={
  k:3,             // 至寶固定值＝倍率欄位 × 同境界參考裝備（劍攻擊／甲氣血／甲防禦）× k ×（1＋powerMul）— 待使用者確認
  q:4,             // 物品品級（QN[4]＝法寶）：給詞條強度與顏色用；名稱另顯示「至寶」
  ref:{7:{atk:29.2,hp:191,def:11},8:{atk:37.1,hp:242,def:12}}, // 元嬰／化神參考（MAP_DG_LOOT_NEW_GEAR mdg7/8 劍、甲）；9 以上每境 ×1.27
  bakPrefix:'xw_zb16_bak_'
};
var MAP_ZB16_GEAR_PREFIX='mzb_';
function mapZb16On(){try{return typeof econSlot16On==='function'&&!!econSlot16On();}catch(e){return false;}}
function mapZb16LegacyKeys(){try{return Object.keys(MAP_ZB_SLOTS);}catch(e){return ['jingmai','dantian','shihai','guge','fabao','zb'];}}
function mapZb16Ref(r){
  r=Math.max(7,r|0);const T=MAP_ZB16_TUNE.ref;if(T[r])return T[r];
  const b=T[8],m=Math.pow(1.27,r-8);return {atk:+(b.atk*m).toFixed(1),hp:Math.round(b.hp*m),def:+(b.def*m).toFixed(1)};
}
function mapZb16GearId(tid){return MAP_ZB16_GEAR_PREFIX+tid;}
function mapZb16Base(z){
  const R=mapZb16Ref(z.minRealm),k=MAP_ZB16_TUNE.k;
  return {atk:+((z.atk||0)*R.atk*k).toFixed(1),hp:Math.round((z.hp||0)*R.hp*k),def:+((z.def||0)*R.def*k).toFixed(1),spd:+((z.spd||0)).toFixed(2)};
}
function mapZb16InstallGear(){
  let G=null;try{G=GEAR;}catch(e){return false;}if(!G||typeof MAP_ZHIBAO==='undefined')return false;
  for(const z of MAP_ZHIBAO){const id=mapZb16GearId(z.tid);if(G[id])continue;const b=mapZb16Base(z);
    const part=(typeof MAP_ZB_SLOTS!=='undefined'&&MAP_ZB_SLOTS[z.body])||'至寶';
    G[id]={n:z.n,slot:'z',atk:b.atk,hp:b.hp,def:b.def,spd:b.spd,cost:{},realm:z.minRealm|0,dgOnly:1,noForge:1,zhibao:1,zbTid:z.tid,grade:z.grade,
      desc:'至寶（'+z.grade+'・'+part+'）：'+z.desc+'。可裝至寶一～五任一格'};}
  return true;
}
function mapZb16IsLegacy(it){return !!(it&&typeof it==='object'&&it.tid&&typeof mapZbByTid==='function'&&mapZbByTid(it.tid)&&!(it.t&&typeof GEAR!=='undefined'&&GEAR[it.t]));}
// S.nextItem 若被舊格式字串 id 弄成 NaN（g14 applyV045 用 Math.max(i.id+1)），這裡用所有數字 id 重算
function mapZb16FixNextItem(){
  try{if(typeof S==='undefined'||!S)return;if(typeof S.nextItem==='number'&&isFinite(S.nextItem))return;
    let m=0;const see=it=>{if(it&&typeof it.id==='number'&&isFinite(it.id)&&it.id>m)m=it.id;};
    (S.inv||[]).forEach(see);for(const u of (S.units||[]))if(u&&u.eq)for(const k in u.eq)see(u.eq[k]);
    try{if(S.dg&&S.dg.loot&&Array.isArray(S.dg.loot.items))S.dg.loot.items.forEach(see);}catch(e){}
    S.nextItem=m+1;}catch(e){}
}
function mapZb16NextId(){mapZb16FixNextItem();try{if(S&&S.nextItem!=null)return S.nextItem++;}catch(e){}return Date.now();}
function mapZb16Affix(it){try{if(window.XW_ECON&&typeof XW_ECON.rollAffixes==='function')XW_ECON.rollAffixes(it);}catch(e){}try{if(typeof mapDgLootClampTrib==='function')mapDgLootClampTrib(it);}catch(e){}return it;}
// 由舊實例（mapZbInst 產物或 S.zb.inv 筆記錄 {id,tid,powerMul}）做出 16 格物品；powerMul、舊 id 保留
function mapZb16MakeItem(src){
  mapZb16InstallGear();
  const z=(src&&mapZbByTid(src.tid))||null;if(!z)return null;
  const pm=src.powerMul!=null&&isFinite(+src.powerMul)?+src.powerMul:(typeof mapZbPowerMul==='function'?mapZbPowerMul(Math.random()):0.3);
  const b=mapZb16Base(z),m=1+pm;
  const it={id:mapZb16NextId(),t:mapZb16GearId(z.tid),slot:'z',q:MAP_ZB16_TUNE.q,el:-1,
    atk:+(b.atk*m).toFixed(1),hp:Math.round(b.hp*m),def:+(b.def*m).toFixed(1),spd:+(b.spd*m).toFixed(2),
    zhibao:1,zbTid:z.tid,zbOld:src.id!=null?String(src.id):null,powerMul:pm,minRealm:z.minRealm|0,qiPct:z.qi||0}; // qiPct：舊表靈氣倍率，先存著，經濟／修煉要用再讀
  if(Array.isArray(src.affixes)&&src.affixes.length)it.affixes=JSON.parse(JSON.stringify(src.affixes));
  return mapZb16Affix(it);
}
function mapZb16ToBag(it){try{const api=typeof mapStoreApi==='function'?mapStoreApi():null;if(api&&typeof api.invAdd==='function'){const r=api.invAdd(it,'zb16');return !!(r&&r.ok);}if(S&&Array.isArray(S.inv)){S.inv.push(it);return true;}}catch(e){}return false;}
// ---- 備份 ----
function mapZb16Backup(reason){
  const out={key:null,full:false};
  let snap=null;
  try{if(typeof snapshot==='function')snap=snapshot();}catch(e){}
  const lite={t:(S&&S.time)||0,reason:reason||'',zb:S&&S.zb?JSON.parse(JSON.stringify(S.zb)):null,
    inv:(S&&S.inv||[]).filter(mapZb16IsLegacy),units:(S&&S.units||[]).map(u=>({id:u.id,eq:u.eq?JSON.parse(JSON.stringify(u.eq)):null}))};
  const key=MAP_ZB16_TUNE.bakPrefix+Date.now();
  try{if(typeof localStorage!=='undefined'){
    try{localStorage.setItem(key,JSON.stringify({v:1,at:Date.now(),reason,save:snap||null,lite}));out.full=!!snap;}
    catch(e){localStorage.setItem(key,JSON.stringify({v:1,at:Date.now(),reason,save:null,lite}));}
    out.key=key;}}catch(e){}
  try{if(S&&S.zb&&S.zb.bak16==null)S.zb.bak16={at:Date.now(),key:out.key,lite};}catch(e){}
  return out;
}
// ---- 單一角色搬移：舊部位鍵／舊格式至寶 → z1～z5，多的回行囊 ----
function mapZb16NeedsUnit(u){
  if(!u||!u.eq||u.zb16V===1)return false;
  const L=mapZb16LegacyKeys();
  for(const k in u.eq){const it=u.eq[k];if(!it)continue;if(L.indexOf(k)>=0)return true;if(mapZb16IsLegacy(it))return true;if(it.slot==='zb')return true;}
  return false;
}
function mapZb16MigrateUnit(u,rep){
  rep=rep||{moved:[],toBag:[],conv:0};
  if(!u||typeof u!=='object')return rep;
  if(u.zb16V===1)return rep;
  if(!mapZb16NeedsUnit(u)){u.zb16V=1;return rep;}
  const eq=u.eq;
  if(u.zbBak16==null){try{u.zbBak16={t:(S&&S.time)||0,eq:JSON.parse(JSON.stringify(eq))};}catch(e){}}
  const L=mapZb16LegacyKeys();const loose=[];
  for(const k of Object.keys(eq)){const it=eq[k];if(!it)continue;
    const legacyKey=L.indexOf(k)>=0;
    if(legacyKey||mapZb16IsLegacy(it)||it.slot==='zb'){
      let ni=mapZb16IsLegacy(it)||(it&&it.tid&&!it.zhibao)?mapZb16MakeItem(it):it;
      if(ni&&ni!==it)rep.conv++;
      if(!ni){ni=it;} // 認不得的舊物件：原樣退回行囊，不丟
      loose.push([k,ni]);delete eq[k];
    }
  }
  const Z=['z1','z2','z3','z4','z5'];
  for(const p of loose){const it=p[1];
    if(it&&it.slot==='z'){const s=Z.find(z=>!eq[z]);if(s){eq[s]=it;rep.moved.push({u:u.id,id:it.id,from:p[0],to:s});continue;}}
    mapZb16ToBag(it);rep.toBag.push({u:u.id,id:it&&it.id,from:p[0]});
  }
  try{if(typeof gearApply==='function')gearApply(u);}catch(e){}
  u.zb16V=1;
  return rep;
}
function mapZb16MigrateAll(opt){
  const rep={ran:false,moved:[],toBag:[],conv:0,zbInv:0,bagConv:0,backup:null};
  if(!(opt&&opt.force)&&!mapZb16On())return rep;
  if(typeof S==='undefined'||!S)return rep;
  try{if(typeof mapDgLootIsClient==='function'&&mapDgLootIsClient())return rep;}catch(e){} // 聯機客人不搬（以房主存檔為準，避免重複產物）
  mapZb16InstallGear();
  const zb=S.zb&&typeof S.zb==='object'?S.zb:null;
  const needZb=!!(zb&&Array.isArray(zb.inv)&&zb.inv.length);
  const needBag=Array.isArray(S.inv)&&S.inv.some(mapZb16IsLegacy);
  const needU=Array.isArray(S.units)&&S.units.some(mapZb16NeedsUnit);
  if(!needZb&&!needBag&&!needU){for(const u of (S.units||[]))if(u&&u.zb16V!==1)u.zb16V=1;return rep;}
  rep.ran=true;rep.backup=mapZb16Backup('slot16');
  for(const u of (S.units||[]))mapZb16MigrateUnit(u,rep);
  if(needBag){for(let i=0;i<S.inv.length;i++){const it=S.inv[i];if(mapZb16IsLegacy(it)){const ni=mapZb16MakeItem(it);if(ni){S.inv[i]=ni;rep.bagConv++;}}}}
  if(needZb){zb.inv16=Array.isArray(zb.inv16)?zb.inv16:[];
    const keep=[];
    for(const e of zb.inv){const ni=mapZb16MakeItem(e);if(ni){mapZb16ToBag(ni);zb.inv16.push(Object.assign({},e,{to:ni.id,at:(S.time||0)}));rep.zbInv++;}else keep.push(e);}
    zb.inv=keep; // 認不得的留在原處
  }
  mapZb16FixNextItem();
  try{S.flags=S.flags||{};S.flags.mapZb16Mig=S.flags.mapZb16Mig||[];S.flags.mapZb16Mig.push({t:S.time||0,key:rep.backup&&rep.backup.key,moved:rep.moved.length,toBag:rep.toBag.length,zbInv:rep.zbInv,bagConv:rep.bagConv});if(S.flags.mapZb16Mig.length>20)S.flags.mapZb16Mig.shift();}catch(e){}
  try{bagKey=null;panelKeyCache=null;}catch(e){}
  try{if(typeof mapEmit==='function')mapEmit('map:zb16:migrate',{moved:rep.moved.length,toBag:rep.toBag.length,zbInv:rep.zbInv});}catch(e){}
  return rep;
}
// ---- 掛鉤 ----
function mapZb16Install(){
  let n=0;
  mapZb16InstallGear();
  try{for(const K of [typeof UNIT_KEEP!=='undefined'?UNIT_KEEP:null,(window.XW&&Array.isArray(XW.UNIT_KEEP))?XW.UNIT_KEEP:null])if(K)for(const k of ['zb16V','zbBak16'])if(K.indexOf(k)<0)K.push(k);}catch(e){}
  try{if(typeof mapZbLootToInv==='function'&&!mapZbLootToInv._zb16){const _f=mapZbLootToInv;
    mapZbLootToInv=function(inst,src){
      if(!mapZb16On()||!inst)return _f.apply(this,arguments);
      const it=mapZb16MakeItem(inst);if(!it)return _f.apply(this,arguments);
      mapZb16ToBag(it);
      try{if(typeof mapEnsureZbState==='function'){const zb=mapEnsureZbState();zb.log16=zb.log16||[];zb.log16.push({tid:inst.tid,id:it.id,src:src||'unknown',t:(S&&S.time)||0});if(zb.log16.length>50)zb.log16.shift();}}catch(e){}
      try{mapEmit('map:zb:loot',{tid:inst.tid,id:it.id,src:src||'unknown',slot16:1});}catch(e){}
      try{if(typeof toast==='function')toast('獲得至寶 '+(typeof itemName==='function'?itemName(it):it.t));}catch(e){}
      return true;};
    mapZbLootToInv._zb16=1;n++;}}catch(e){}
  try{if(typeof econSlot16Migrate==='function'&&!econSlot16Migrate._zb16){const _m=econSlot16Migrate;
    econSlot16Migrate=function(u,opt){try{if((opt&&opt.force)||mapZb16On()){if(mapZb16NeedsUnit(u)){const r=mapZb16MigrateAll(opt);void r;}}}catch(e){}return _m.apply(this,arguments);};
    econSlot16Migrate._zb16=1;n++;}}catch(e){}
  try{if(typeof econSlot16MigrateAll==='function'&&!econSlot16MigrateAll._zb16){const _a=econSlot16MigrateAll;
    econSlot16MigrateAll=function(opt){try{mapZb16MigrateAll(opt);}catch(e){}return _a.apply(this,arguments);};
    econSlot16MigrateAll._zb16=1;n++;}}catch(e){}
  try{if(typeof itemName==='function'&&!itemName._zb16){const _n=itemName;
    itemName=function(it){try{if(it&&it.zhibao&&typeof GEAR!=='undefined'&&GEAR[it.t]&&GEAR[it.t].zhibao)return '至寶・'+GEAR[it.t].n;}catch(e){}return _n.apply(this,arguments);};
    itemName._zb16=1;n++;}}catch(e){}
  try{window.XWMAP=window.XWMAP||{};XWMAP.zb16={on:mapZb16On,migrateAll:mapZb16MigrateAll,makeItem:mapZb16MakeItem,installGear:mapZb16InstallGear,gearId:mapZb16GearId,tune:MAP_ZB16_TUNE};}catch(e){}
  mapZb16Install._ok=!!(typeof mapZbLootToInv==='function'&&mapZbLootToInv._zb16&&typeof econSlot16MigrateAll==='function'&&econSlot16MigrateAll._zb16&&typeof itemName==='function'&&itemName._zb16);
  return n;
}
if(typeof setTimeout==='function'){
  setTimeout(function mapZb16Retry(){try{mapZb16Install();}catch(e){}if(!mapZb16Install._ok&&(mapZb16Retry._n=(mapZb16Retry._n|0)+1)<40)setTimeout(mapZb16Retry,500);},0);
  // 旗標中途打開或經濟已轉過（econEqV=16）的檔：慢速補搬（冪等）
  if(typeof setInterval==='function')setInterval(function(){try{if(mapZb16On()&&typeof S!=='undefined'&&S&&((S.zb&&Array.isArray(S.zb.inv)&&S.zb.inv.length)||(S.inv||[]).some(mapZb16IsLegacy)||(S.units||[]).some(mapZb16NeedsUnit)))mapZb16MigrateAll();}catch(e){}},2000);
}
