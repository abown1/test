// ================== 仙武經濟：§7 新建築目錄（解鎖／費用／效果／維修）==================
// 旗 newBuildings 預設關。解鎖境界皆為提案。不覆寫已有 BUILD。不寫入角色永久攻／血／速。
// 升級走共用 6 級、費用 ×3、受大殿等級上限（econ_build.js）。
var ECON_REALM_KEY={wutu:0,wushi:1,dawushi:2,zongshi:3,lianqi:4,zhuji:5,jindan:6,yuanying:7,huashen:8};
// 前三境建造解鎖（單一可調表：改數字即可；0 武徒／1 武師／2 大武師）。
// 未列出的建築維持 catalog／XWBB_FIXED。鍛造坊列於本表為宗師（3），與 econApplyForgeRealm／catalog 對齊。
var ECON_BUILD_UNLOCK_REALM={
  hall:0, altar:0, house:0,
  shitang:1, lianwu:1, renwutang:1,
  wudao:2, biwutai:2,
  forge:3
};
var ECON_BUILD_UNLOCK_REALM_KEY=['wutu','wushi','dawushi','zongshi','lianqi','zhuji','jindan','yuanying','huashen'];
var ECON_NEW_BUILDS=[
  {type:'house',name:'洞府',realm:'wutu',realmIdx:0,unlockProposed:true,merge:'house',upkeepXia:6,
   effect:{kind:'merge',mood:true,privateQi:true},note:'武徒即可建造；心境、私人小聚靈；與既有住房／洞府合併'},
  {type:'lingtian',name:'靈田',realm:'zhuji',realmIdx:5,unlockProposed:true,size:2,cost:{wood:40,fiber:20},time:10,hp:320,upkeepXia:6,
   effect:{kind:'farm',crop:'xiacao',cropName:'仙草',yieldPerHarvest:2,growYears:1,yieldPerLv:0.15,workerBonus:0.20,slots:2,slotsPerLv:1,foodPerDay:0},note:'築基解鎖；種植仙草'},
  {type:'renwutang',name:'任務堂',realm:'wushi',realmIdx:1,unlockProposed:true,size:2,cost:{wood:50,stone:20},time:12,hp:400,upkeepXia:8,
   effect:{kind:'contrib',perLv:0.08},note:'貢獻度'},
  {type:'wudao',name:'演武場',realm:'dawushi',realmIdx:2,unlockProposed:true,merge:'wudao',upkeepXia:8,
   effect:{kind:'merge'},note:'大武師解鎖；與既有武道館合併'},
  {type:'biwutai',name:'比武台',realm:'dawushi',realmIdx:2,unlockProposed:true,size:3,cost:{wood:50,stone:40},time:14,hp:420,upkeepXia:8,
   effect:{kind:'arena'},note:'大武師解鎖；弟子切磋、宗門大比與比武大會皆在此'},
  {type:'alchemy',name:'煉丹房',realm:'lianqi',realmIdx:4,unlockProposed:true,merge:'alchemy',upkeepXia:10,
   effect:{kind:'merge'},note:'煉氣解鎖；與既有煉丹房合併'},
  {type:'cangku',name:'藏寶閣',realm:'zongshi',realmIdx:3,unlockProposed:true,merge:'cangku',upkeepXia:8,
   effect:{kind:'merge'},note:'與既有倉庫合併'},
  {type:'zhifatang',name:'執法堂',realm:'zongshi',realmIdx:3,unlockProposed:true,size:2,cost:{wood:60,stone:40},time:14,hp:480,upkeepXia:10,
   effect:{kind:'loyalty',decayReducePerLv:0.08},note:'降低忠誠衰退（加成，非永久減益）'},
  {type:'waishitang',name:'外事堂',realm:'zongshi',realmIdx:3,unlockProposed:true,size:2,cost:{wood:60,stone:30,fiber:15},time:14,hp:420,upkeepXia:10,
   effect:{kind:'trade',buySavePerLv:0.03,sellBonusPerLv:0.03},note:'外交／交易'},
  {type:'kuangchang',name:'礦場',realm:'zongshi',realmIdx:3,unlockProposed:true,size:2,cost:{wood:80,stone:60,iron:15},time:16,hp:520,upkeepXia:10,
   effect:{kind:'mine',gatherPerLv:0.10,range:12},note:'範圍內採集 +10%/級；滿 6 級 +60%'},
  {type:'juling',name:'聚靈陣',realm:'lianqi',realmIdx:4,unlockProposed:true,merge:'juling',upkeepXia:12,
   effect:{kind:'merge'},note:'與既有聚靈陣合併'},
  {type:'library',name:'藏經閣',realm:'lianqi',realmIdx:4,unlockProposed:true,merge:'library',upkeepXia:10,
   effect:{kind:'artsCap',perLv:1},note:'功法品階上限；與既有長書閣合併'},
  {type:'fuluge',name:'符籙閣',realm:'lianqi',realmIdx:4,unlockProposed:true,size:2,cost:{wood:55,fiber:25,herb:8},time:14,hp:400,upkeepXia:9,
   effect:{kind:'talisman',slots:1,slotsPerLv:1,craftPerLv:0.12},note:'符籙／布陣台'},
  {type:'lingshou',name:'靈獸欄',realm:'lianqi',realmIdx:4,unlockProposed:true,size:2,cost:{wood:50,food:20,fiber:15},time:12,hp:360,upkeepXia:10,
   effect:{kind:'beasts',slots:2,slotsPerLv:1},note:'靈獸欄位'},
  {type:'qingxinge',name:'清心閣',realm:'zhuji',realmIdx:5,unlockProposed:true,size:2,cost:{wood:70,stone:40,lingshi:15},time:16,hp:450,upkeepXia:12,
   effect:{kind:'calm',deviationReducePerLv:0.08,toxClearPerLv:0.15},note:'降走火入魔機率、加速清丹毒；結束後恢復，不改永久數值'},
  {type:'chuangong',name:'傳功殿',realm:'zhuji',realmIdx:5,unlockProposed:true,size:3,cost:{wood:80,stone:50},time:18,hp:520,upkeepXia:12,
   effect:{kind:'teach',juniorMulPerLv:0.12,insightPerLv:0.02,juniorMaxDelta:1},note:'加速低階修煉、頓悟機率'},
  {type:'forge',name:'煉器房',realm:'zongshi',realmIdx:3,unlockProposed:true,merge:'forge',upkeepXia:10,
   effect:{kind:'merge'},note:'宗師解鎖；與既有鍛造坊合併'},
  {type:'tianjietai',name:'天劫台',realm:'jindan',realmIdx:6,unlockProposed:true,size:3,cost:{stone:100,iron:20,lingshi:40},time:22,hp:700,upkeepXia:16,
   effect:{kind:'tribulation',survivePerLv:0.06,dmgReducePerLv:0.05},note:'提高渡劫存活、減傷'},
  {type:'huanjingta',name:'幻境試煉塔',realm:'jindan',realmIdx:6,unlockProposed:true,size:3,cost:{wood:90,stone:70,lingshi:30},time:22,hp:650,upkeepXia:16,
   effect:{kind:'trial',combatXpPerLv:0.15,noDeath:true},note:'無死亡練戰鬥經驗'},
  {type:'huzhen',name:'護山大陣核心',realm:'yuanying',realmIdx:7,unlockProposed:true,merge:'huzhen',upkeepXia:14,
   effect:{kind:'merge'},note:'併入既有護宗陣陣眼'},
  {type:'yinglieci',name:'英烈祠',realm:'yuanying',realmIdx:7,unlockProposed:true,size:2,cost:{stone:80,wood:40},time:16,hp:500,upkeepXia:12,
   effect:{kind:'fortune',cohesionPerLv:0.08,fortunePerLv:0.05},note:'氣運／凝聚力'},
  {type:'laozu',name:'老祖隱居地',realm:'huashen',realmIdx:8,unlockProposed:true,size:3,cost:{stone:120,lingshi:80},time:24,hp:800,upkeepXia:20,
   effect:{kind:'seclude',cultMulPerLv:0.20,range:8},note:'閉關修煉加成'},
  {type:'lingmai',name:'靈脈源頭',realm:'huashen',realmIdx:8,unlockProposed:true,size:3,cost:{stone:140,lingshi:100,herb:30},time:26,hp:860,upkeepXia:22,
   effect:{kind:'vein',qiMulPerLv:0.15,aptitudeAuraPerLv:0.03,range:6},note:'化神池；資質為範圍光環，不寫入永久屬性'}
];

function econBuildingDef(type){
  for(let i=0;i<ECON_NEW_BUILDS.length;i++)if(ECON_NEW_BUILDS[i].type===type)return ECON_NEW_BUILDS[i];
  return null;
}
function econBuildingLvOf(b){
  if(!b)return 1;
  try{if(typeof blv==='function')return blv(b)||1;}catch(e){}
  return b.lv||1;
}
function econSectMaxRealm(T){
  T=T||(typeof S!=='undefined'?S:null);let best=0;
  try{if(typeof xwPeakRealm==='function')best=Math.max(best,xwPeakRealm()|0);}catch(e){}
  try{if(T&&T.flags&&T.flags.peakRealm!=null)best=Math.max(best,T.flags.peakRealm|0);}catch(e){}
  try{if(T&&T.flags&&T.flags.xian)best=Math.max(best,4);}catch(e){}
  if(T&&T.units){for(const u of T.units){if(!u||u.dead)continue;best=Math.max(best,u.realm|0,u.peakRealm|0);}}
  return best;
}
function econBuildingUnlocked(type,T){
  if(!econFlag('newBuildings')&&!(type==='kuangchang'&&econFlag('mine')))return false;
  const d=econBuildingDef(type);if(!d)return false;
  // merge 只表示併入既有建築系統，境界門檻仍要過
  return econSectMaxRealm(T)>=(d.realmIdx||0);
}
function econBuildingLockReason(type,T){
  if(!econFlag('newBuildings')&&!(type==='kuangchang'&&econFlag('mine')))return 'flag-off';
  const d=econBuildingDef(type);if(!d)return 'unknown';
  const need=d.realmIdx||0,have=econSectMaxRealm(T);
  if(have<need)return 'realm:'+need;
  return '';
}
function econBuildingBaseCost(type){
  const d=econBuildingDef(type);
  if(d&&d.cost)return d.cost;
  if(type==='kuangchang'&&typeof ECON_MINE_BUILD!=='undefined'&&ECON_MINE_BUILD.cost)return ECON_MINE_BUILD.cost;
  try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].cost)return BUILD[type].cost;}catch(e){}
  return {};
}
function econBuildingUpgradeCost(typeOrB,nextLv){
  const type=typeof typeOrB==='string'?typeOrB:(typeOrB&&typeOrB.type);
  const b=typeof typeOrB==='object'?typeOrB:{type:type,lv:(nextLv||2)-1,built:true};
  if(typeof econUpgradeCost==='function'&&econFlag('build'))return econUpgradeCost(b,nextLv);
  const base=econBuildingBaseCost(type),c={},lv=nextLv||2;
  const mul=Math.pow(3,lv-1);
  for(const k in base)c[k]=Math.ceil((+base[k]||0)*mul);
  return c;
}
function econBuildingEffectCalc(type,lv){
  const d=econBuildingDef(type);if(!d||!d.effect)return null;
  lv=Math.max(1,Math.min((typeof ECON_LV_MAX==='number'?ECON_LV_MAX:6),lv|0||1));
  const e=d.effect,out={kind:e.kind,type:type,name:d.name,lv:lv,unlockProposed:!!d.unlockProposed};
  const n=lv-1;
  if(e.kind==='farm'){
    const base=+(e.yieldPerHarvest!=null?e.yieldPerHarvest:(e.herbPerDay||2));
    const yld=+(base*(1+(e.yieldPerLv||0)*n)).toFixed(3);
    out.crop=e.crop||'xiacao';
    out.cropName=e.cropName||'仙草';
    out.growYears=e.growYears||e.growDays||1;
    out.growDays=e.growDays||1;
    if(typeof econFarmYearOn==='function'&&econFarmYearOn()){
      out.growSec=(e.growSec!=null?e.growSec:(typeof econYearSec==='function'?econYearSec():300)*out.growYears);
    }else{
      out.growSec=(e.growSec!=null?e.growSec:(typeof econDayLen==='function'?econDayLen():300)*out.growDays);
    }
    out.yieldPerHarvest=yld;
    out.xiacaoPerDay=yld;
    out.herbPerDay=0;
    out.foodPerDay=+(e.foodPerDay||0);
    out.workerBonus=e.workerBonus||0.20;
    out.slots=(e.slots||2)+(e.slotsPerLv||1)*n;
    out.unlockRealm='zhuji';
    out.unlockRealmIdx=5;
    out.unlockName='築基';
  }else if(e.kind==='contrib'){out.contribMul=+(1+e.perLv*lv).toFixed(3);}
  else if(e.kind==='loyalty'){out.loyaltyDecayMul=+Math.max(0.2,1-e.decayReducePerLv*lv).toFixed(3);}
  else if(e.kind==='trade'){out.buyMul=+Math.max(0.5,1-e.buySavePerLv*lv).toFixed(3);out.sellMul=+(1+e.sellBonusPerLv*lv).toFixed(3);}
  else if(e.kind==='mine'){out.gatherMul=+(1+e.gatherPerLv*lv).toFixed(3);out.range=e.range;}
  else if(e.kind==='artsCap'){out.artsCapAdd=e.perLv*lv;}
  else if(e.kind==='study'){out.studyMul=+(1+Math.min(e.cap||0.10,(e.perLv||0.02)*Math.min(5,lv))).toFixed(3);}
  else if(e.kind==='later'){out.later=true;}
  else if(e.kind==='talisman'){out.slots=(e.slots||0)+e.slotsPerLv*n;out.craftMul=+(1+e.craftPerLv*lv).toFixed(3);}
  else if(e.kind==='beasts'){out.slots=(e.slots||0)+e.slotsPerLv*n;}
  else if(e.kind==='calm'){
    out.deviationMul=+Math.max(0.2,1-e.deviationReducePerLv*lv).toFixed(3);
    out.toxClearMul=+(1+e.toxClearPerLv*lv).toFixed(3);
    out.permanentStats=false;
  }else if(e.kind==='teach'){out.juniorMul=+(1+e.juniorMulPerLv*lv).toFixed(3);out.insight=+(e.insightPerLv*lv).toFixed(3);out.juniorMaxDelta=e.juniorMaxDelta;}
  else if(e.kind==='tribulation'){out.surviveBonus=+(e.survivePerLv*lv).toFixed(3);out.dmgMul=+Math.max(0.4,1-e.dmgReducePerLv*lv).toFixed(3);}
  else if(e.kind==='trial'){out.combatXpMul=+(1+e.combatXpPerLv*lv).toFixed(3);out.noDeath=!!e.noDeath;}
  else if(e.kind==='fortune'){out.cohesionMul=+(1+e.cohesionPerLv*lv).toFixed(3);out.fortuneMul=+(1+e.fortunePerLv*lv).toFixed(3);}
  else if(e.kind==='seclude'){out.cultMul=+(1+e.cultMulPerLv*lv).toFixed(3);out.range=e.range;}
  else if(e.kind==='vein'){out.qiMul=+(1+e.qiMulPerLv*lv).toFixed(3);out.aptitudeAura=+(e.aptitudeAuraPerLv*lv).toFixed(3);out.range=e.range;out.writesPermanent=false;}
  else if(e.kind==='gfStudy'){out.speedMul=+(1+(e.speedPerLv||0)*n).toFixed(3);out.slots=(e.slots||0)+(e.slotsPerLv||0)*n;}
  else if(e.kind==='merge'){out.merge=d.merge||type;}
  out.upkeepXia=(d.upkeepXia||0)+(d.upkeepPerLv||0)*n;
  return out;
}
function econBuildingEffect(type,lv){
  if(!econFlag('newBuildings')&&!(type==='kuangchang'&&econFlag('mine')))return null;
  return econBuildingEffectCalc(type,lv);
}
// ── 第③輪：未生效建築數值（旗標 ECON_BLD5，預設開；?bld5=0 關回舊表）──
var ECON_BLD5=(function(){try{return !/[?&]bld5=0\b/.test(location.search);}catch(e){return true;}})();
(function(){
  if(!ECON_BLD5||typeof ECON_NEW_BUILDS==='undefined')return;
  for(const d of ECON_NEW_BUILDS){
    if(!d||!d.effect)continue;
    if(d.type==='zhifatang'){d.effect.decayReducePerLv=0.02;}
    else if(d.type==='waishitang'){d.effect.buySavePerLv=0.02;d.effect.sellBonusPerLv=0.02;}
    else if(d.type==='library'){d.effect={kind:'study',perLv:0.02,cap:0.10};d.note='研讀速度 +2%/級（滿級 +10%）；與既有長書閣合併';}
    else if(d.type==='fuluge'){d.effect={kind:'later'};d.note='符籙系統後續開放';}
    else if(d.type==='lingshou'){d.effect={kind:'later'};d.note='靈獸系統後續開放';}
  }
})();
// 長書閣研讀倍率：全宗取最高等、完工且未損毀的 library；拆掉或損毀即失效
function econLibStudyMul(T){
  if(!ECON_BLD5)return 1;
  const lv=econBuildingBestLv('library',T);if(!lv)return 1;
  return +(1+Math.min(0.10,0.02*Math.min(5,lv))).toFixed(3);
}
// 外事堂買賣倍率（防套利由 econ_shop 處理）
function econTradeBldMul(side,T){
  if(!ECON_BLD5)return 1;
  const e=econBuildingEffectNow('waishitang',T);if(!e)return 1;
  const m=side==='buy'?e.buyMul:e.sellMul;return (m>0&&isFinite(m))?m:1;
}
function econBuildingBestLv(type,T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return 0;
  let best=0;
  for(const b of T.buildings){
    if(!b||b.type!==type||!b.built||b.broken)continue;
    const lv=econBuildingLvOf(b);if(lv>best)best=lv;
  }
  return best;
}
function econBuildingEffectNow(type,T){
  const lv=econBuildingBestLv(type,T);if(!lv)return null;
  return econBuildingEffect(type,lv);
}
function econBuildingUpkeep(b){
  if(!b)return 0;
  const d=econBuildingDef(b.type);
  const lv=econBuildingLvOf(b);
  if(d)return (d.upkeepXia||0)+(d.upkeepPerLv||0)*Math.max(0,lv-1);
  try{if(typeof ECON_TUNE!=='undefined')return ECON_TUNE.upkeepXia||0;}catch(e){}
  return 8;
}
function econSectUpkeep(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return 0;
  let n=0;for(const b of T.buildings){if(!b||!b.built||b.broken)continue;n+=econBuildingUpkeep(b);}
  return n;
}
function econToBuildDef(d){
  if(!d||d.merge)return null;
  let cost=d.cost,size=d.size,time=d.time,hp=d.hp,name=d.name;
  if(d.type==='kuangchang'&&typeof ECON_MINE_BUILD!=='undefined'){
    const M=ECON_MINE_BUILD;cost=cost||M.cost;size=size||M.size;time=time||M.time;hp=hp||M.hp;name=name||M.name;
  }
  return {name:name,size:size||2,cost:cost||{wood:40,stone:20},time:time||12,pop:0,hp:hp||400,desc:d.note||d.name,reqRealm:d.realmIdx};
}
function econRegisterNewBuildings(){
  if(!econFlag('newBuildings')&&!econFlag('mine'))return {ok:false,reason:'flag-off',added:[]};
  const added=[];
  try{
    if(typeof BUILD==='undefined')return {ok:false,reason:'no-BUILD',added:[]};
    for(const d of ECON_NEW_BUILDS){
      if(d.merge)continue;
      if(d.type==='kuangchang'&&!econFlag('mine')&&!econFlag('newBuildings'))continue;
      if(!econFlag('newBuildings')&&d.type!=='kuangchang')continue;
      if(BUILD[d.type])continue;
      const def=econToBuildDef(d);if(!def)continue;
      BUILD[d.type]=def;added.push(d.type);
    }
  }catch(e){return {ok:false,reason:String(e),added:added};}
  return {ok:true,added:added};
}
function econRegisterBuildings(){return econRegisterNewBuildings();}

function econFarmYearOn(T){
  try{if(typeof window!=='undefined'&&window.ECON_FARMYEAR_FORCE!=null)return !!window.ECON_FARMYEAR_FORCE;}catch(e){}
  try{if(typeof location!=='undefined'){const m=/[?&]farmyear=([01])\b/.exec(location.search);if(m)return m[1]==='1';}}catch(e){}
  try{
    const F=(T&&T.econ&&T.econ.flags)||(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags);
    if(F&&F.farmYear!=null)return !!F.farmYear;
  }catch(e){}
  try{if(typeof ECON_FARMYEAR_DEFAULT==='boolean')return !!ECON_FARMYEAR_DEFAULT;}catch(e){}
  return false;
}
function econFarmGrowSecOf(b,e){
  e=e||(b?econBuildingEffect('lingtian',econBuildingLvOf(b)):null);
  if(e&&e.growSec>0)return +e.growSec;
  if(econFarmYearOn())return (typeof econYearSec==='function'?econYearSec():300)*((e&&e.growYears)||1);
  return (typeof econDayLen==='function'?econDayLen():300)*((e&&e.growDays)||1);
}
function econFarmYearMigrate(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ)return null;
  if(!econFarmYearOn(T))return T.econ;
  if(T.econ.farmV===2)return T.econ;
  const raw=+(T.econ.prod&&T.econ.prod.xiacao)||0;
  const whole=Math.floor(raw+1e-12);
  const fracPart=Math.max(0,raw-whole);
  if(T.econ.farmBak==null)T.econ.farmBak={v:1,xiacao:raw,t:+(T.time||0)};
  // 整數先入庫並從 prod 扣掉，即使還沒有靈田、farmV 尚未標記，重跑遷移也不會再發一次
  if(whole>0){
    if(T.res)T.res.xiacao=(T.res.xiacao||0)+whole;
    if(T.econ.prod)T.econ.prod.xiacao=fracPart;
  }
  const fields=[];
  let totalY=0;
  const day=(typeof econDayLen==='function'?econDayLen():300);
  if(Array.isArray(T.buildings)){
    for(const b of T.buildings){
      if(!b||b.type!=='lingtian'||!b.built||b.broken)continue;
      const y=econFarmYieldOf(b,T);
      const growSec=econFarmGrowSecOf(b);
      const harvest=((y.xiacaoPerHarvest||0)/Math.max(1e-6,day))*growSec;
      fields.push({b:b,growSec:growSec,harvest:harvest});
      totalY+=harvest;
    }
  }
  if(!fields.length)return T.econ; // 還沒有靈田時先不標記，等有田再轉
  let frac=totalY>1e-12?fracPart/totalY:0;
  if(frac>0.999)frac=0.999;
  if(frac<0)frac=0;
  for(const f of fields){
    f.b.econFarmT=frac*f.growSec;
    f.b.econFarmCarry=0;
  }
  if(T.econ.prod)T.econ.prod.xiacao=0;
  T.econ.farmV=2;
  return T.econ;
}
function econBuildingsMigrate(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(!T.econ.prod||typeof T.econ.prod!=='object')T.econ.prod={herb:0,food:0,xiacao:0};
  if(T.econ.prod.herb==null)T.econ.prod.herb=0;
  if(T.econ.prod.food==null)T.econ.prod.food=0;
  if(T.econ.prod.xiacao==null)T.econ.prod.xiacao=0;
  try{
    if(typeof RES_NAMES==='object'&&RES_NAMES&&!RES_NAMES.xiacao)RES_NAMES.xiacao='仙草';
    if(typeof RES_COL==='object'&&RES_COL&&!RES_COL.xiacao)RES_COL.xiacao='#9ef0c8';
    if(typeof RES_KEYS!=='undefined'&&Array.isArray(RES_KEYS)&&RES_KEYS.indexOf('xiacao')<0)RES_KEYS.push('xiacao');
  }catch(e){}
  try{if(typeof econFinalizeBuilt==='function')econFinalizeBuilt(T);}catch(e){}
  try{econFarmYearMigrate(T);}catch(e){}
  return T.econ.prod;
}
function econFarmWorkers(b,T){
  T=T||(typeof S!=='undefined'?S:null);if(!b||!T||!T.units)return 0;
  let n=0;
  for(const u of T.units){
    if(!u||u.dead)continue;
    if(u.jobB===b.id&&(u.job==='farm'||u.econFarm))n++;
  }
  return n;
}
function econFarmSlots(b){
  const e=econBuildingEffect('lingtian',econBuildingLvOf(b));
  return (e&&e.slots)||2;
}
// 單次產率計算共用計數；不跨 tick 快取，指派／死亡即時生效。
function econFarmWorkerCounts(T){
  const counts=new Map();
  for(const u of (T&&T.units)||[]){
    if(!u||u.dead||!(u.job==='farm'||u.econFarm)||u.jobB!==u.jobB)continue;
    counts.set(u.jobB,(counts.get(u.jobB)||0)+1);
  }
  return counts;
}
function econFarmYieldOf(b,T,workerCounts){
  T=T||(typeof S!=='undefined'?S:null);
  const e=econBuildingEffect('lingtian',econBuildingLvOf(b));
  if(!e)return {xiacaoPerHarvest:0,xiacaoPerDay:0,workers:0,slots:0,mul:1,growSec:(typeof econYearSec==='function'?econYearSec():300)};
  const slots=e.slots||2;
  const w=Math.min(workerCounts?(workerCounts.get(b.id)||0):econFarmWorkers(b,T),slots);
  const mul=+(1+(e.workerBonus||0.20)*w).toFixed(3);
  const yld=+(e.yieldPerHarvest*mul).toFixed(3);
  return {xiacaoPerHarvest:yld,xiacaoPerDay:yld,workers:w,slots:slots,mul:mul,growSec:e.growSec||(typeof econYearSec==='function'?econYearSec():300),cropName:e.cropName||'仙草'};
}
function econFarmAssign(u,b){
  if(!u||u.kind!=='disciple'||!b||b.type!=='lingtian'||!b.built||b.broken)return {ok:false,reason:'bad-args'};
  if(u.dead)return {ok:false,reason:'dead'};
  const slots=econFarmSlots(b);
  if(!(u.job==='farm'&&u.jobB===b.id)&&econFarmWorkers(b)>=slots)return {ok:false,reason:'full',slots:slots};
  if(typeof assignJob!=='function'||!assignJob(u,'farm',{bid:b.id}))return {ok:false,reason:'assignment-rejected',slots:slots};
  return {ok:true,workers:econFarmWorkers(b),slots:slots};
}
function econFarmRate(T){
  if(!econFlag('newBuildings'))return {herbPerDay:0,foodPerDay:0,xiacaoPerDay:0};
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return {herbPerDay:0,foodPerDay:0,xiacaoPerDay:0};
  let herb=0,food=0,xiacao=0,workerCounts=null;
  for(const b of T.buildings){
    if(!b||b.type!=='lingtian'||!b.built||b.broken)continue;
    if(!workerCounts)workerCounts=econFarmWorkerCounts(T);
    const y=econFarmYieldOf(b,T,workerCounts);
    xiacao+=y.xiacaoPerDay||0;
    const e=econBuildingEffect('lingtian',econBuildingLvOf(b));
    if(e){herb+=e.herbPerDay||0;food+=e.foodPerDay||0;}
  }
  return {herbPerDay:herb,foodPerDay:food,xiacaoPerDay:xiacao};
}
function econFarmHarvestOne(b,T,workerCounts){
  try{if(typeof econHelperFarmOnHarvest==='function')econHelperFarmOnHarvest(b);}catch(e){}
  const y=econFarmYieldOf(b,T,workerCounts);
  const day=(typeof econDayLen==='function'?econDayLen():300);
  const growSec=econFarmGrowSecOf(b);
  const raw=((y.xiacaoPerHarvest||0)/Math.max(1e-6,day))*growSec+(+b.econFarmCarry||0);
  const n=Math.floor(raw+1e-12);
  b.econFarmCarry=raw-n;
  if(n>0){
    if(T.res)T.res.xiacao=(T.res.xiacao||0)+n;
    try{if(typeof toast==='function')toast('收成 仙草 +'+n);}catch(e){}
  }
  return n;
}
function econBuildingsTick(dt){
  if(!econFlag('newBuildings'))return;
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return;
  econBuildingsMigrate(T);
  dt=+dt||0;
  if(!econFarmYearOn(T)){
    const rate=econFarmRate(T);if(!rate.herbPerDay&&!rate.foodPerDay&&!rate.xiacaoPerDay)return;
    const day= (typeof econDayLen==='function'?econDayLen():300);
    T.econ.prod.herb+= (rate.herbPerDay/day)*dt;
    T.econ.prod.food+= (rate.foodPerDay/day)*dt;
    T.econ.prod.xiacao+= (rate.xiacaoPerDay/day)*dt;
    const gh=Math.floor(T.econ.prod.herb),gf=Math.floor(T.econ.prod.food),gx=Math.floor(T.econ.prod.xiacao);
    if(T.res){
      if(gh>0){T.res.herb=(T.res.herb||0)+gh;T.econ.prod.herb-=gh;}
      if(gf>0){T.res.food=(T.res.food||0)+gf;T.econ.prod.food-=gf;}
      if(gx>0){T.res.xiacao=(T.res.xiacao||0)+gx;T.econ.prod.xiacao-=gx;}
    }
    return;
  }
  if(!T.econ.prod||typeof T.econ.prod!=='object')T.econ.prod={herb:0,food:0,xiacao:0};
  // herb／food 仍走舊連續累積（靈田這兩項目前為 0）
  const rate=econFarmRate(T);
  const day=(typeof econDayLen==='function'?econDayLen():300);
  if(rate.herbPerDay||rate.foodPerDay){
    T.econ.prod.herb+= (rate.herbPerDay/day)*dt;
    T.econ.prod.food+= (rate.foodPerDay/day)*dt;
    const gh=Math.floor(T.econ.prod.herb),gf=Math.floor(T.econ.prod.food);
    if(T.res){
      if(gh>0){T.res.herb=(T.res.herb||0)+gh;T.econ.prod.herb-=gh;}
      if(gf>0){T.res.food=(T.res.food||0)+gf;T.econ.prod.food-=gf;}
    }
  }
  if(!Array.isArray(T.buildings)||!(dt>0))return;
  let workerCounts=null;
  for(const b of T.buildings){
    if(!b||b.type!=='lingtian'||!b.built||b.broken)continue;
    if(!workerCounts)workerCounts=econFarmWorkerCounts(T);
    const growSec=Math.max(1e-6,econFarmGrowSecOf(b));
    b.econFarmT=(+b.econFarmT||0)+dt;
    let guard=0;
    while(b.econFarmT+1e-12>=growSec&&guard++<100){
      b.econFarmT-=growSec;
      econFarmHarvestOne(b,T,workerCounts);
    }
  }
}
function econDeviationMul(T){
  const e=econBuildingEffectNow('qingxinge',T);return e&&e.deviationMul!=null?e.deviationMul:1;
}
function econToxClearMul(T){
  const e=econBuildingEffectNow('qingxinge',T);return e&&e.toxClearMul!=null?e.toxClearMul:1;
}
function econJuniorCultMul(T){
  const e=econBuildingEffectNow('chuangong',T);return e&&e.juniorMul!=null?e.juniorMul:1;
}
function econTribulationBonus(T){
  return econBuildingEffectNow('tianjietai',T);
}
function econContribMul(T){
  const e=econBuildingEffectNow('renwutang',T);return e&&e.contribMul!=null?e.contribMul:1;
}
function econLoyaltyDecayMul(T){
  const e=econBuildingEffectNow('zhifatang',T);return e&&e.loyaltyDecayMul!=null?e.loyaltyDecayMul:1;
}


function econBuildingDescRows(b){
  if(!b)return null;
  const d=econBuildingDef(b.type);if(!d||!d.effect)return null;
  const lv=econBuildingLvOf(b);
  const e=econBuildingEffect(b.type,lv);if(!e)return null;
  const L=[];
  L.push(['建築等級','Lv '+lv+(typeof ECON_LV_MAX==='number'?'／'+ECON_LV_MAX:'')]);
  if(e.kind==='farm'){
    const y=econFarmYieldOf(b);
    const yld=y.xiacaoPerHarvest||e.yieldPerHarvest||0;
    const ys=(typeof econYearSec==='function'?econYearSec():300);
    const growSec=(e.growSec!=null?e.growSec:(y.growSec||ys));
    const growTxt=(typeof econPrettySpan==='function'?econPrettySpan(growSec):((Math.round(growSec/ys))+' 年'));
    const crop=e.cropName||y.cropName||'仙草';
    const rng=(typeof econPrettyAmt==='function'?econPrettyAmt(yld):String(Math.round(+yld||0)));
    const bits=[];
    if(lv>1&&d.effect&&d.effect.yieldPerLv)bits.push('等級');
    if(y.workers>0)bits.push('派駐弟子');
    const extra=bits.length?('（含'+bits.join('、')+'加成）'):'';
    L.push(['種植',crop]);
    L.push(['解鎖條件','宗門曾達「築基」（已建成者保留）']);
    L.push(['生長時間',growTxt]);
    L.push(['產量','每 '+growTxt+(String(rng).indexOf('～')>=0?'約 ':' ')+rng+' 株'+crop+extra]);
    L.push(['等級影響',`每升 1 級產量 +${Math.round(((d.effect&&d.effect.yieldPerLv)||0)*100)}％（目前 Lv${lv}）`]);
    L.push(['弟子影響',`務農弟子每名 +${Math.round((e.workerBonus||0.20)*100)}％（${y.workers||0}/${y.slots||0} 人）`]);
    L.push(['前期食物','漿果叢採集、狩獵與村莊交易仍供應食物，不依賴靈田']);
  }else if(e.kind==='mine'){
    L.push(['效果','範圍內採集速度 '+(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.gatherMul):('×'+e.gatherMul))]);
    L.push(['範圍',`${e.range||12} 格`]);
    L.push(['升級','每升 1 級採集 +10％']);
  }else if(e.kind==='contrib'){
    L.push(['效果','任務貢獻 '+(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.contribMul):('×'+e.contribMul))]);
  }else if(e.kind==='loyalty'){
    L.push(['效果','忠誠衰退 '+(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.loyaltyDecayMul):('×'+e.loyaltyDecayMul))+'（越低越好）']);
    if(ECON_BLD5)L.push(['備註','目前弟子忠誠不會自然下降，此效果待衰退機制開放後生效']);
  }else if(e.kind==='trade'){
    L.push(['買入','價格 '+(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.buyMul):('×'+e.buyMul))]);
    L.push(['賣出','收益 '+(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.sellMul):('×'+e.sellMul))]);
  }else if(e.kind==='talisman'){
    L.push(['符籙欄位',String(e.slots)]);
    L.push(['製作速度',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.craftMul):('×'+e.craftMul))]);
  }else if(e.kind==='beasts'){
    L.push(['靈獸欄位',String(e.slots)]);
  }else if(e.kind==='calm'){
    L.push(['走火機率',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.deviationMul):('×'+e.deviationMul))]);
    L.push(['清丹毒',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.toxClearMul):('×'+e.toxClearMul))]);
  }else if(e.kind==='teach'){
    L.push(['低階修煉',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.juniorMul):('×'+e.juniorMul))]);
    L.push(['頓悟機率','+'+Math.round((e.insight||0)*100)+'％']);
  }else if(e.kind==='tribulation'){
    L.push(['渡劫存活','+'+Math.round((e.surviveBonus||0)*100)+'％']);
    L.push(['天劫傷害',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.dmgMul):('×'+e.dmgMul))]);
  }else if(e.kind==='trial'){
    L.push(['戰鬥經驗',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.combatXpMul):('×'+e.combatXpMul))]);
    L.push(['死亡',e.noDeath?'幻境中不會真正身隕':'—']);
  }else if(e.kind==='fortune'){
    L.push(['凝聚力',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.cohesionMul):('×'+e.cohesionMul))]);
    L.push(['氣運',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.fortuneMul):('×'+e.fortuneMul))]);
  }else if(e.kind==='seclude'){
    L.push(['修煉加成',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.cultMul):('×'+e.cultMul))+'（範圍 '+e.range+' 格）']);
  }else if(e.kind==='vein'){
    L.push(['靈氣',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.qiMul):('×'+e.qiMul))]);
    L.push(['資質光環','+'+Math.round((e.aptitudeAura||0)*100)+'％（範圍 '+e.range+' 格，不寫入永久）']);
  }else if(e.kind==='study'){
    L.push(['研讀速度',(typeof econPrettyMulDelta==='function'?econPrettyMulDelta(e.studyMul):('×'+e.studyMul))+'（每級 +2%，滿級 +10%）']);
  }else if(e.kind==='later'){
    L.push(['效果',d.note||'後續開放']);
  }else if(e.kind==='artsCap'){
    L.push(['功法品階上限','+'+e.artsCapAdd]);
  }else if(d.note){
    L.push(['效果',d.note]);
  }
  if(e.upkeepXia!=null){
    const sc=(typeof ECON_UPKEEP_SCALE==='number'&&ECON_UPKEEP_SCALE>0)?ECON_UPKEEP_SCALE:30;
    const amt=e.upkeepXia/sc;
    const txt=(typeof econPrettyAmt==='function'?econPrettyAmt(amt):String(amt));
    L.push(['每年維修',txt+' 下品靈石']);
  }
  return L;
}


function econRealmNameOf(idx){
  try{if(typeof REALMS!=='undefined'&&REALMS[idx]&&REALMS[idx].n)return REALMS[idx].n;}catch(e){}
  return '境界'+(idx|0);
}
function econUnlockRealmOf(type){
  if(type&&ECON_BUILD_UNLOCK_REALM&&ECON_BUILD_UNLOCK_REALM[type]!=null)return ECON_BUILD_UNLOCK_REALM[type]|0;
  try{const d=econBuildingDef(type);if(d&&d.realmIdx!=null)return d.realmIdx|0;}catch(e){}
  try{if(typeof xwBbRealmOf==='function'&&!xwBbRealmOf._econEarly)return xwBbRealmOf(type)|0;}catch(e){}
  try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].reqRealm!=null)return BUILD[type].reqRealm|0;}catch(e){}
  try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].reqXian)return 4;}catch(e){}
  return 0;
}
function econNeedRealmOf(type){return econUnlockRealmOf(type);}
function econAnnotateUnlockDesc(type,idx){
  if(idx==null||idx<=0)return;
  let name='';
  try{name=econRealmNameOf(idx);}catch(e){}
  if(!name)return;
  const tag='需宗門'+name+'解鎖';
  try{
    if(typeof BUILD!=='undefined'&&BUILD[type]&&!BUILD[type]._econUnlockAnno){
      const d=BUILD[type].desc||'';
      if(d&&d.indexOf('需宗門')<0)BUILD[type].desc=tag+'。'+d;
      BUILD[type]._econUnlockAnno=1;
    }
  }catch(e){}
  try{
    if(typeof BDESC!=='undefined'&&BDESC[type]&&!BDESC[type]._econUnlockAnno){
      const s=BDESC[type].s||'';
      if(s&&s.indexOf('需宗門')<0)BDESC[type].s=tag+'。'+s;
      BDESC[type]._econUnlockAnno=1;
    }
  }catch(e){}
  try{
    const d=econBuildingDef(type);
    if(d&&d.note&&d.note.indexOf('需宗門')<0&&d.note.indexOf(name+'解鎖')<0){
      d.note=tag+'；'+d.note;
    }
  }catch(e){}
}
function econApplyEarlyBuildRealms(){
  const map=ECON_BUILD_UNLOCK_REALM||{};
  for(const type in map){
    if(!Object.prototype.hasOwnProperty.call(map,type))continue;
    const idx=map[type]|0;
    const key=(ECON_BUILD_UNLOCK_REALM_KEY&&ECON_BUILD_UNLOCK_REALM_KEY[idx])||('realm'+idx);
    try{
      const d=econBuildingDef(type);
      if(d){d.realmIdx=idx;d.realm=key;}
    }catch(e){}
    try{if(typeof BUILD!=='undefined'&&BUILD[type])BUILD[type].reqRealm=idx;}catch(e){}
    try{if(typeof XWBB_FIXED!=='undefined')XWBB_FIXED[type]=idx;}catch(e){}
    econAnnotateUnlockDesc(type,idx);
  }
  return map;
}
function econHasWudaoBuilt(){
  try{return typeof hasBuilt==='function'&&!!hasBuilt('wudao');}catch(e){return false;}
}
function econInstallTrainFallback(){
  // 練武失敗不得改派採集：保留原工作及手令，使用既有武道館前提。
  // 執行中館舍失效由 doInJob 原有等待／提示處理，不偷換職務。
  try{
    if(typeof assignJob==='function'&&!assignJob._econTrainFb){
      const _aj=assignJob;
      assignJob=function(u,job,arg){
        if(job==='train'&&!econHasWudaoBuilt()){
          try{if(typeof toast==='function')toast('需要先建成「武道館」才能練武');}catch(e){}
          return false;
        }
        return _aj.apply(this,arguments);
      };
      assignJob._econTrainFb=1;
      try{if(typeof XW==='object'&&XW)XW.assignJob=assignJob;}catch(e){}
    }
  }catch(e){}
}
function econPrettyUnlockWhy(type,raw){
  const s=raw==null?'':String(raw);
  if(/只能建一座|已建/.test(s))return s;
  const hall=s.match(/需大殿\s*Lv\s*(\d+)/)||s.match(/主城未升級（需大殿 Lv(\d+)）/);
  if(hall)return '需大殿 Lv'+hall[1];
  if(/主城未升級/.test(s))return s;
  const peak=(typeof econPeakForCap==='function'?econPeakForCap():(typeof econSectMaxRealm==='function'?econSectMaxRealm():0))|0;
  const need=econNeedRealmOf(type);
  if(need>0&&peak<need)return '需宗門'+econRealmNameOf(need);
  if(/需達|突破|修仙階段|需有弟子達到|尚未開啟|境界/.test(s)){
    const m=s.match(/[「『]([^」』]+)[」』]/);
    if(m)return '需宗門'+m[1];
    if(need>0)return '需宗門'+econRealmNameOf(need);
  }
  if(/需先建成/.test(s))return s;
  return s;
}
function econUnlockInfo(type,raw){
  const why=econPrettyUnlockWhy(type,raw);
  if(!why)return {kind:'',why:'',badge:''};
  if(/只能建一座|已建/.test(why))return {kind:'built',why:why,badge:'已建'};
  if(/^需大殿/.test(why)||/主城未升級/.test(why))return {kind:'hall',why:why,badge:why};
  if(/^需宗門/.test(why)||/需達|突破|修仙|尚未開啟|境界/.test(why))return {kind:'realm',why:why,badge:why};
  if(/需先建成/.test(why))return {kind:'prereq',why:why,badge:why};
  return {kind:'prereq',why:why,badge:why};
}
function econApplyAlchemyRealm(){
  try{
    const d=econBuildingDef('alchemy');
    if(d){d.realm='lianqi';d.realmIdx=4;}
  }catch(e){}
  try{if(typeof BUILD!=='undefined'&&BUILD.alchemy)BUILD.alchemy.reqRealm=4;}catch(e){}
}
function econApplyForgeRealm(){
  try{
    const d=econBuildingDef('forge');
    if(d){d.realm='zongshi';d.realmIdx=3;}
  }catch(e){}
  try{if(typeof BUILD!=='undefined'&&BUILD.forge)BUILD.forge.reqRealm=3;}catch(e){}
}

function econSnapBuildGhost(type){
  try{
    if(!type)return false;
    const D=(typeof BUILD!=='undefined')?BUILD[type]:null;if(!D||D.size==null)return false;
    const p=(typeof player==='function'?player():null);
    const ox=Math.floor((p&&p.x)||0),oy=Math.floor((p&&p.y)||0);
    let sp=null;
    try{if(typeof XW!=='undefined'&&XW&&typeof XW.freeSpot==='function')sp=XW.freeSpot(type,ox,oy);}catch(e){}
    if(!sp){try{if(typeof freeSpot==='function')sp=freeSpot(type,ox,oy);}catch(e2){}}
    if(!sp)return false;
    const wx=sp.i+D.size/2,wy=sp.j+D.size/2;
    let scr=null;
    try{
      const q=(typeof iso==='function')?iso(wx,wy):{x:wx,y:wy};
      if(typeof worldToScreen==='function')scr=worldToScreen(q.x,q.y);
    }catch(e){}
    if(!scr||scr.x==null||scr.y==null)return false;
    try{ghostAt={x:scr.x,y:scr.y};}catch(e){return false;}
    return true;
  }catch(e){return false;}
}
function econInstallBuildGhostSnap(){
  try{
    if(typeof enterBuild==='function'&&!enterBuild._econGhostSnap){
      const _eb=enterBuild;
      enterBuild=function(type){
        const r=_eb.apply(this,arguments);
        try{
          if(typeof buildMode!=='undefined'&&buildMode===type)econSnapBuildGhost(type);
        }catch(e){}
        return r;
      };
      enterBuild._econGhostSnap=1;
    }
  }catch(e){}
  try{
    if(typeof tryPlace==='function'&&!tryPlace._econGhostSnap){
      const _tp=tryPlace;
      tryPlace=function(shift){
        try{
          if(typeof buildMode!=='undefined'&&buildMode){
            let g=null;
            try{g=ghostOrigin();}catch(e0){}
            const ok=g&&typeof placementValid==='function'?placementValid(buildMode,g.i,g.j):false;
            if(g&&!ok){
              let sp=null;
              try{if(typeof XW!=='undefined'&&XW&&typeof XW.freeSpot==='function')sp=XW.freeSpot(buildMode,g.i,g.j);}catch(e1){}
              if(!sp){try{if(typeof freeSpot==='function')sp=freeSpot(buildMode,g.i,g.j);}catch(e2){}}
              if(!sp){
                const p=(typeof player==='function'?player():null);
                try{if(typeof XW!=='undefined'&&XW&&typeof XW.freeSpot==='function')sp=XW.freeSpot(buildMode,Math.floor((p&&p.x)||0),Math.floor((p&&p.y)||0));}catch(e3){}
              }
              if(sp&&typeof BUILD!=='undefined'&&BUILD[buildMode]){
                const D=BUILD[buildMode];
                const wx=sp.i+D.size/2,wy=sp.j+D.size/2;
                try{
                  const q=(typeof iso==='function')?iso(wx,wy):{x:wx,y:wy};
                  const scr=(typeof worldToScreen==='function')?worldToScreen(q.x,q.y):q;
                  if(scr&&scr.x!=null)ghostAt={x:scr.x,y:scr.y};
                }catch(e4){}
              }
            }
          }
        }catch(e){}
        return _tp.apply(this,arguments);
      };
      tryPlace._econGhostSnap=1;
    }
  }catch(e){}
}
function econInstallUnlockCss(){
  if(typeof document==='undefined')return;
  if(document.getElementById('econ-unlock-css'))return;
  const st=document.createElement('style');st.id='econ-unlock-css';
  st.textContent='#xwbb .xwbb-badge,.xwbb-badge{font-size:10px;line-height:1.2;white-space:nowrap;max-width:calc(100% - 18px);overflow:hidden;text-overflow:ellipsis;letter-spacing:0;left:auto;right:3px;top:3px;bottom:auto;text-align:right}';
  (document.head||document.documentElement).appendChild(st);
}
function econInstallUnlockUi(){
  econApplyEarlyBuildRealms();
  econApplyAlchemyRealm();
  econApplyForgeRealm();
  econInstallUnlockCss();
  try{econInstallBuildGhostSnap();}catch(e){}
  try{
    if(typeof xwBbRealmOf==='function'&&!xwBbRealmOf._econEarly){
      const _of=xwBbRealmOf;
      xwBbRealmOf=function(type){
        if(type&&ECON_BUILD_UNLOCK_REALM&&ECON_BUILD_UNLOCK_REALM[type]!=null)return ECON_BUILD_UNLOCK_REALM[type]|0;
        try{if(typeof econUnlockRealmOf==='function'){const n=econUnlockRealmOf(type);if(n!=null&&isFinite(n))return n|0;}}catch(e){}
        return _of.apply(this,arguments);
      };
      xwBbRealmOf._econEarly=1;
    }
  }catch(e){}
  try{econInstallTrainFallback();}catch(e){}
  try{
    if(typeof buildLock==='function'&&!buildLock._econUnlockTxt){
      const _bl=buildLock;
      buildLock=function(type){
        const r=_bl.apply(this,arguments);
        if(/只能建一座|已建/.test(r||''))return r;
        const peak=(typeof econPeakForCap==='function'?econPeakForCap():0)|0;
        const need=econNeedRealmOf(type);
        if((type==='alchemy'||type==='forge')&&need>0&&peak<need)return '需宗門'+econRealmNameOf(need);
        if(!r)return r;
        if(need>0&&peak<need)return '需宗門'+econRealmNameOf(need);
        return econPrettyUnlockWhy(type,r)||r;
      };
      buildLock._econUnlockTxt=1;
    }
    if(typeof xwBbLocked==='function'&&!xwBbLocked._econUnlockTxt){
      const _lk=xwBbLocked;
      xwBbLocked=function(type){
        const r=_lk.apply(this,arguments);
        return econPrettyUnlockWhy(type,r)||r;
      };
      xwBbLocked._econUnlockTxt=1;
    }
    if(typeof xwBbLockInfo==='function'&&!xwBbLockInfo._econUnlockTxt){
      const _inf=xwBbLockInfo;
      xwBbLockInfo=function(type){
        let raw='';
        try{const old=_inf.apply(this,arguments);raw=(old&&old.why)||'';}catch(e){}
        try{if(!raw&&typeof xwBbLocked==='function')raw=xwBbLocked(type)||'';}catch(e){}
        try{if(!raw&&typeof buildLock==='function')raw=buildLock(type)||'';}catch(e){}
        return econUnlockInfo(type,raw);
      };
      xwBbLockInfo._econUnlockTxt=1;
    }
  }catch(e){}
}

// ================== 建築介紹：隨等級顯示實際加成（顯示專用，不改狀態）==================
// 旗 bldDescLv 預設開。數字只從 econBuildingEffectCalc／effect 表算出，不另外寫死。
// 無等級加成（merge／arena／沒有 effect）時介紹維持原文。滿級寫「已滿級」，不附下一級。
function econBldDescEnabled(){
  try{
    if(typeof S==='undefined'||!S||!S.econ||!S.econ.flags)return true;
    if(S.econ.flags.bldDescLv==null)return true;
    return !!S.econ.flags.bldDescLv;
  }catch(e){return true;}
}
function econBldPctStr(v){
  v=+v;
  if(!isFinite(v))return null;
  const n=Math.round(v*1000)/10;
  if(!isFinite(n))return null;
  return (Math.abs(n-Math.round(n))<1e-6)?String(Math.round(n)):String(n);
}
function econBldSignedPct(v){
  const s=econBldPctStr(v);if(s==null)return null;
  const n=+s;
  if(n>0)return '+'+s+'％';
  if(n<0)return s+'％';
  return '0％';
}
function econBldEffectBits(type,lv){
  let e=null;
  try{e=econBuildingEffectCalc(type,lv);}catch(err){return [];}
  if(!e||!e.kind)return [];
  const bits=[];
  const add=function(label,s){
    if(s==null)return;
    const t=String(s);
    if(!t||t==='NaN'||t==='undefined'||t==='null')return;
    bits.push(label+t);
  };
  const k=e.kind;
  if(k==='merge'||k==='arena')return [];
  if(k==='farm'){
    const y=e.yieldPerHarvest,cn=e.cropName||'仙草';
    if(y!=null&&isFinite(+y))add('每次產量 ',(typeof econPrettyAmt==='function'?econPrettyAmt(y):String(y))+' 株'+cn);
    if(e.slots!=null&&isFinite(+e.slots))add('欄位 ',String(e.slots|0));
  }else if(k==='contrib'){add('任務貢獻 ',econBldSignedPct(e.contribMul-1));}
  else if(k==='loyalty'){add('忠誠衰退 ',econBldSignedPct(e.loyaltyDecayMul-1));}
  else if(k==='trade'){
    add('買入 ',econBldSignedPct(e.buyMul-1));
    add('賣出 ',econBldSignedPct(e.sellMul-1));
  }else if(k==='mine'){add('採集 ',econBldSignedPct(e.gatherMul-1));}
  else if(k==='study'){add('研讀速度 ',econBldSignedPct(e.studyMul-1));}
  else if(k==='later'){add('','後續開放');}
  else if(k==='artsCap'){
    if(e.artsCapAdd!=null&&isFinite(+e.artsCapAdd))add('功法品階上限 ',(+e.artsCapAdd>0?'+':'')+String(+e.artsCapAdd));
  }else if(k==='talisman'){
    if(e.slots!=null&&isFinite(+e.slots))add('符籙欄位 ',String(e.slots|0));
    add('製作速度 ',econBldSignedPct(e.craftMul-1));
  }else if(k==='beasts'){
    if(e.slots!=null&&isFinite(+e.slots))add('靈獸欄位 ',String(e.slots|0));
  }else if(k==='calm'){
    add('走火機率 ',econBldSignedPct(e.deviationMul-1));
    add('清丹毒 ',econBldSignedPct(e.toxClearMul-1));
  }else if(k==='teach'){
    add('低階修煉 ',econBldSignedPct(e.juniorMul-1));
    add('頓悟 ',econBldSignedPct(e.insight));
  }else if(k==='tribulation'){
    add('存活 ',econBldSignedPct(e.surviveBonus));
    add('減傷（需打坐） ',econBldSignedPct(1-(+e.dmgMul||1)));
  }else if(k==='trial'){add('戰鬥經驗 ',econBldSignedPct(e.combatXpMul-1));}
  else if(k==='fortune'){
    add('凝聚力 ',econBldSignedPct(e.cohesionMul-1));
    add('氣運 ',econBldSignedPct(e.fortuneMul-1));
  }else if(k==='seclude'){add('修煉加成 ',econBldSignedPct(e.cultMul-1));}
  else if(k==='vein'){
    add('靈氣 ',econBldSignedPct(e.qiMul-1));
    add('資質光環 ',econBldSignedPct(e.aptitudeAura));
  }else if(k==='gfStudy'){
    add('研習速度 ',econBldSignedPct(e.speedMul-1));
    if(e.slots!=null&&isFinite(+e.slots))add('欄位 ',String(e.slots|0));
  }
  return bits;
}
function econBldDescLine(type,lv){
  const bits=econBldEffectBits(type,lv);if(!bits.length)return '';
  const max=(typeof ECON_LV_MAX==='number'?ECON_LV_MAX:6);
  lv=Math.max(1,Math.min(max,lv|0||1));
  let line='目前 Lv'+lv+'：'+bits.join('、');
  if(lv>=max)line+='（已滿級）';
  else{
    const next=econBldEffectBits(type,lv+1);
    if(next.length)line+='（下一級 Lv'+(lv+1)+'：'+next.join('、')+'）';
  }
  return line;
}
function econBldBaseDesc(b){
  const type=typeof b==='string'?b:(b&&b.type);
  let s='';
  try{if(typeof BUILD!=='undefined'&&BUILD[type]&&BUILD[type].desc)s=BUILD[type].desc;}catch(e){}
  if(!s){try{const d=econBuildingDef(type);if(d&&d.note)s=d.note;}catch(e){}}
  return s||'';
}
function econBldDescFor(b){
  if(!b)return null;
  if(!econBldDescEnabled())return null;
  const base=econBldBaseDesc(b);
  const lv=econBuildingLvOf(b);
  const line=econBldDescLine(b.type,lv);
  if(!line)return base||null;
  if(!base)return line;
  const cleaned=String(base).replace(/\s*目前 Lv\d+：[\s\S]*$/,'').replace(/[。．]\s*$/,'');
  return cleaned+'。'+line;
}
function econApplyBldDesc(b){
  if(typeof document==='undefined')return;
  if(!econBldDescEnabled())return;
  const el=document.getElementById('panel');if(!el)return;
  const intro=el.querySelector('h4 ~ .pdesc');if(!intro)return;
  const txt=econBldDescFor(b);if(txt==null)return;
  if(intro.textContent!==txt)intro.textContent=txt;
}
function econInstallDescHook(){
  try{
    if(typeof renderPanel==='function'&&!renderPanel._econDesc){
      const _rp=renderPanel;
      renderPanel=function(){
        const r=_rp.apply(this,arguments);
        try{
          if(typeof selBuilding!=='undefined'&&selBuilding!=null&&typeof bById==='function'){
            const b=bById(selBuilding);
            if(b)econApplyBldDesc(b);
          }
        }catch(e){}
        return r;
      };
      renderPanel._econDesc=1;
    }
  }catch(e){}
}

function econAttachBuildings(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.NEW_BUILDS=ECON_NEW_BUILDS;
    A.REALM_KEY=ECON_REALM_KEY;
    A.buildingDef=econBuildingDef;
    A.buildingUnlocked=econBuildingUnlocked;
    A.buildingLockReason=econBuildingLockReason;
    A.buildingEffect=econBuildingEffect;
    A.buildingEffectCalc=econBuildingEffectCalc;
    A.buildingEffectNow=econBuildingEffectNow;
    A.bldDescFor=econBldDescFor;
    A.bldEffectBits=econBldEffectBits;
    A.bldDescLine=econBldDescLine;
    A.installDescHook=econInstallDescHook;
    A.buildingBestLv=econBuildingBestLv;
    A.buildingUpkeep=econBuildingUpkeep;
    A.sectUpkeep=econSectUpkeep;
    A.buildingUpgradeCost=econBuildingUpgradeCost;
    A.registerBuildings=econRegisterBuildings;
    A.registerNewBuildings=econRegisterNewBuildings;
    A.buildingsTick=econBuildingsTick;
    A.buildingsMigrate=econBuildingsMigrate;
    A.farmRate=econFarmRate;A.buildingDescRows=econBuildingDescRows;
    A.farmWorkers=econFarmWorkers;A.farmYieldOf=econFarmYieldOf;A.farmAssign=econFarmAssign;A.farmSlots=econFarmSlots;
    A.farmYearOn=econFarmYearOn;A.farmYearMigrate=econFarmYearMigrate;A.farmGrowSecOf=econFarmGrowSecOf;A.farmHarvestOne=econFarmHarvestOne;
    A.installProdPanels=econInstallProdPanels;
    A.deviationMul=econDeviationMul;
    A.toxClearMul=econToxClearMul;
    A.juniorCultMul=econJuniorCultMul;
    A.tribulationBonus=econTribulationBonus;
    A.contribMul=econContribMul;
    A.loyaltyDecayMul=econLoyaltyDecayMul;
    A.ECON_BLD5=ECON_BLD5;A.libStudyMul=econLibStudyMul;A.tradeBldMul=econTradeBldMul;
    A.unlockWhy=econPrettyUnlockWhy;
    A.unlockInfo=econUnlockInfo;
    A.applyForgeRealm=econApplyForgeRealm;
    A.applyEarlyBuildRealms=econApplyEarlyBuildRealms;
    A.unlockRealmOf=econUnlockRealmOf;
    A.BUILD_UNLOCK_REALM=ECON_BUILD_UNLOCK_REALM;
    A.installUnlockUi=econInstallUnlockUi;
  }catch(e){}
}
function econEscDesc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function econProdRowsHtml(b){
  const rows=econBuildingDescRows(b);if(!rows||!rows.length)return '';
  return '<div class="econ-bout" id="econ-bout">'+rows.map(function(r){return '<div class="sm"><b>'+econEscDesc(r[0])+'</b>：'+econEscDesc(r[1])+'</div>';}).join('')+'</div>';
}
function econInstallProdPanels(){
  try{
    if(typeof JOB_NAME==='object'&&JOB_NAME&&!JOB_NAME.farm)JOB_NAME.farm='務農';
  }catch(e){}
  try{
    if(typeof V50L==='object'&&V50L){
      const types=['lingtian','kuangchang','fuluge','lingshou','renwutang','zhifatang','waishitang','qingxinge','chuangong','tianjietai','huanjingta','yinglieci','laozu','lingmai','biwutai'];
      for(const t of types){
        if(V50L[t])continue;
        V50L[t]=function(b){return econBuildingDescRows(b)||[];};
      }
    }
  }catch(e){}
  try{
    if(typeof lvPanel==='function'&&!lvPanel._econProd){
      const _lp=lvPanel;
      lvPanel=function(b){
        let h=_lp.apply(this,arguments);
        try{h+=econProdRowsHtml(b);}catch(e){}
        return h;
      };
      lvPanel._econProd=1;
    }
  }catch(e){}
  try{
    if(typeof extraActs==='function'&&!extraActs._econFarm){
      const _ea=extraActs;
      extraActs=function(b){
        const a=_ea.apply(this,arguments)||[];
        try{
          if(b&&b.built&&!b.broken&&b.type==='lingtian'){
            const y=econFarmYieldOf(b);
            if(!a.some(function(x){return String(x).indexOf('data-act="econ-farm"')>=0;}))
              a.push('<button class="btn" data-act="econ-farm">指派弟子務農（'+y.workers+'/'+y.slots+'）</button>');
          }
        }catch(e){}
        return a;
      };
      extraActs._econFarm=1;
    }
  }catch(e){}
  try{
    if(typeof panelActV045==='function'&&!panelActV045._econFarm){
      const _pa=panelActV045;
      panelActV045=function(act,b,us){
        try{
          if(act==='econ-farm'&&b){
            const pool=(us&&us.length?us:(typeof disciples==='function'?disciples():[])).filter(function(u){return u&&u.kind==='disciple'&&!u.dead&&(!u.job||u.job==='gather'||u.job==='farm');});
            let n=0;
            for(const u of pool){if(econFarmAssign(u,b).ok)n++;else break;}
            try{if(typeof toast==='function')toast(n?('已指派 '+n+' 名弟子務農'):'沒有可指派的弟子或欄位已滿');}catch(e){}
            try{if(typeof panelKeyCache!=='undefined')panelKeyCache=null;}catch(e){}
            return true;
          }
        }catch(e){}
        return _pa.apply(this,arguments);
      };
      panelActV045._econFarm=1;
    }
  }catch(e){}
  try{
    if(typeof doJob==='function'&&!doJob._econFarm){
      const _dj=doJob;
      doJob=function(u,dt){
        try{
          if(u&&u.job==='farm'){
            const b=(typeof bById==='function'&&u.jobB!=null)?bById(u.jobB):null;
            if(!b||b.type!=='lingtian'||!b.built||b.broken){u.job=null;u.jobB=null;u.econFarm=false;return;}
            const tx=b.i+1,ty=b.j+1;
            if(typeof approachRect==='function'){
              const r=approachRect(u,dt,b.i,b.j,2,0.9);
              if(r===null){u.dvx=0;u.dvy=0;return;}
              if(!r)return;
            }else if(typeof dist==='function'&&dist(u.x,u.y,tx,ty)>1.6){
              if(typeof pathTo==='function')pathTo(u,tx,ty);
              if(typeof followPath==='function')followPath(u,dt);
              return;
            }
            u.dvx=0;u.dvy=0;u.working=true;u.econFarm=true;
            return;
          }
        }catch(e){}
        return _dj.apply(this,arguments);
      };
      doJob._econFarm=1;
    }
  }catch(e){}
}
try{if(typeof window!=='undefined'){window.econFarmYearOn=econFarmYearOn;window.econFarmYearMigrate=econFarmYearMigrate;}}catch(e){}
econAttachBuildings();
econInstallProdPanels();
econInstallUnlockUi();
econInstallDescHook();
try{if(typeof setTimeout==='function'){setTimeout(function(){econAttachBuildings();econInstallProdPanels();econInstallUnlockUi();econInstallDescHook();},0);setTimeout(function(){econInstallUnlockUi();econInstallDescHook();},80);setTimeout(function(){econInstallUnlockUi();econInstallDescHook();},400);setTimeout(function(){econInstallUnlockUi();econInstallDescHook();},900);}}catch(e){}

// 長書閣研讀：自學（cult_gf 自修路徑）於開始時把 dur 除以倍率；只改既有欄位值，不加欄位
(function(){
  if(typeof window==='undefined'||!ECON_BLD5)return;
  try{window.addEventListener('cult:gfStudyStart',function(ev){
    try{const d=ev&&ev.detail;if(!d||d.via==='econ'||!(d.dur>0))return;
      const T=(typeof S!=='undefined')?S:null;if(!T||!T.units)return;
      const u=T.units.find(function(x){return x&&x.id===d.unitId;});const st=u&&u.gf&&u.gf.study;
      if(!st||st.id!==d.id||st.dur!==d.dur)return;
      const m=econLibStudyMul(T);if(m>1)st.dur=st.dur/m;
    }catch(e){}
  });}catch(e){}
})();
