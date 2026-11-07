// ================== v0.4.x map PHASE4：強化敵／精英／至寶載體表 ==================
// GEAR 只讀：若主程式已載入 GEAR 則沿用；否則用同源結構回退表（不改 g12.js）
var MAP_GEAR_FALLBACK={
  sword:{n:'長劍',slot:'w',atk:4},saber:{n:'環首刀',slot:'w',atk:5,hp:5},spear:{n:'長槍',slot:'w',atk:4.5,spd:0.05},
  fist:{n:'拳套',slot:'w',atk:3,spd:0.15},robe:{n:'青布道袍',slot:'a',hp:20,def:2},leather:{n:'獸皮甲',slot:'a',hp:30,def:4},
  talisman:{n:'護身符',slot:'c',hp:10,def:1},jade:{n:'玉佩',slot:'c',atk:1.5,spd:0.05},faqi:{n:'飛梭法器',slot:'f',atk:6,hp:15,realm:4}
};
var MAP_GEAR_ORDER_FALLBACK=['sword','saber','spear','fist','robe','leather','talisman','jade','faqi'];
function mapGearTable(){return (typeof GEAR!=='undefined'&&GEAR)?GEAR:MAP_GEAR_FALLBACK;}
function mapGearOrder(){return (typeof GEAR_ORDER!=='undefined'&&GEAR_ORDER)?GEAR_ORDER:MAP_GEAR_ORDER_FALLBACK;}
var MAP_QMUL_FALLBACK=[1,1.15,1.35,1.6,2.0]; // 凡良上極／對齊品階
// 同境基礎 ≈ 玩家 ±10%（對標 MAP_TUNE.npcBaseStatSlack）
var MAP_ENEMY_TIERS={
  mob:{n:'散修妖物',mul:0.95,gearChance:0.15,slots:['w'],qMax:1},
  elite:{n:'精英',mul:1.05,gearChance:0.55,slots:['w','a'],qMax:2},
  chief:{n:'頭目',mul:1.08,gearChance:0.75,slots:['w','a','c'],qMax:3},
  boss:{n:'首領',mul:1.10,gearChance:0.95,slots:['w','a','c','f'],qMax:4},
  carrier:{n:'至寶載體',mul:1.05,gearChance:0.35,slots:['w','a','c'],qMax:3}
};
// 類型 → 預設層級（可被 decorate opts.tier 覆寫）
var MAP_ENEMY_TYPE_TIER={
  wolf:'mob',boar:'mob',tiger:'elite',bandit:'mob',militia:'mob',
  chief:'chief',king:'boss',warden:'boss',golem:'elite',wisp:'mob',
  xfguard:'elite',xfboss:'boss'
};
var MAP_ENEMY_GEAR_TEMPLATES={
  mob:[['sword',0],['robe',0]],
  elite:[['saber',1],['leather',1],['talisman',0]],
  chief:[['spear',2],['leather',2],['jade',1]],
  boss:[['saber',3],['leather',3],['jade',2],['faqi',2]],
  carrier:[['sword',2],['robe',2],['talisman',1]]
};
// 山賊境界：散兵≤大武師(2)、頭目≤宗師(3)；罕見具名寨主≤煉氣初期(4,0)
var MAP_BANDIT_REALM_CAP=2;
var MAP_BANDIT_CAPS={
  cap:2,bandit:2,chiefCap:3,chief:3,rareCap:4,rareBoss:4,rareSub:0,rareBossSub:0,rareChance:0.03,maxSubLead:3,
  realmByTier:{
    newbie:{min:0,max:1,chiefMax:1},
    mid:{min:1,max:2,chiefMax:2},
    high:{min:2,max:2,chiefMax:3}
  },
  newbieCampIds:[3],newbieCampNames:['黑風寨'],
  midCampIds:[4],midCampNames:['赤狼寨'],
  tierMidDist:70,tierHighDist:110
};
function mapBanditTune(){
  try{if(MAP_TUNE&&MAP_TUNE.bandit)return MAP_TUNE.bandit;}catch(e){}
  return MAP_BANDIT_CAPS;
}
function mapBanditIdxByName(n){
  try{
    if(typeof REALMS!=='undefined'&&Array.isArray(REALMS)){
      for(let i=0;i<REALMS.length;i++)if(REALMS[i]&&REALMS[i].n===n)return i;
    }
  }catch(e){}
  const fallback={'大武師':2,'宗師':3,'煉氣':4};return fallback[n]!=null?fallback[n]:2;
}
function mapBanditKind(e,opts){
  opts=opts||{};
  if(e&&typeof e==='object'&&e._mapRareBoss)return 'rare';
  const t=(typeof e==='string')?e:(opts.type||opts.role||(e&&e.type)||'');
  if(t==='chief')return 'chief';
  return 'bandit';
}
function mapBanditRealmCap(e,opts){
  const T=mapBanditTune();
  const kind=(arguments.length===0)?'bandit':mapBanditKind(e,opts);
  if(kind==='rare')return T.rareCap!=null?T.rareCap|0:mapBanditIdxByName('煉氣');
  if(kind==='chief')return T.chiefCap!=null?T.chiefCap|0:mapBanditIdxByName('宗師');
  if(T.cap!=null)return T.cap|0;
  if(T.bandit!=null)return T.bandit|0;
  return MAP_BANDIT_REALM_CAP;
}
function mapIsBanditEnemy(e,opts){
  opts=opts||{};
  if(opts.isBandit||opts.type==='bandit'||opts.type==='chief'||opts.role==='chief')return true;
  if(e&&(e.type==='bandit'||e.type==='chief'||e._mapBandit||e.exd===1))return true;
  return false;
}

function mapBanditRegionTier(e,opts){
  opts=opts||{};
  if(opts.tier==='newbie'||opts.tier==='mid'||opts.tier==='high')return opts.tier;
  const T=mapBanditTune();
  const ids=T.newbieCampIds||[3], names=T.newbieCampNames||['黑風寨'];
  const midIds=T.midCampIds||[4], midNames=T.midCampNames||['赤狼寨'];
  let v=null;
  const camp=(e&&e.camp!=null)?e.camp:opts.camp;
  try{
    if(camp!=null&&typeof vById==='function')v=vById(camp);
    if(!v&&typeof S!=='undefined'&&S&&Array.isArray(S.villages))v=S.villages.find(x=>x&&x.id===camp)||null;
  }catch(er){}
  const vn=v&&v.name;
  if((v&&ids.indexOf(v.id)>=0)||(camp!=null&&ids.indexOf(camp)>=0)||(vn&&names.indexOf(vn)>=0)||opts.newbie)return 'newbie';
  if((v&&midIds.indexOf(v.id)>=0)||(camp!=null&&midIds.indexOf(camp)>=0)||(vn&&midNames.indexOf(vn)>=0))return 'mid';
  if(v&&(v.raids===0||opts.early))return 'newbie';
  const x=(e&&e.x!=null)?+e.x:(opts.x!=null?+opts.x:NaN);
  const y=(e&&e.y!=null)?+e.y:(opts.y!=null?+opts.y:NaN);
  if(Number.isFinite(x)&&Number.isFinite(y)){
    let sx=34,sy=68;
    try{if(typeof ANCH!=='undefined'&&ANCH&&ANCH.start){sx=+ANCH.start.x;sy=+ANCH.start.y;}}catch(er){}
    const dx=x-sx,dy=y-sy,d2=dx*dx+dy*dy;
    const midR=T.tierMidDist!=null?+T.tierMidDist:70;
    const highR=T.tierHighDist!=null?+T.tierHighDist:110;
    if(d2>=highR*highR)return 'high';
    if(d2>=midR*midR)return 'mid';
    return 'newbie';
  }
  return 'newbie';
}
function mapBanditRealmRange(e,opts){
  opts=opts||{};
  const T=mapBanditTune();
  const kind=mapBanditKind(e,opts);
  const cap=mapBanditRealmCap(e,opts);
  if(kind==='rare'){
    const r=T.rareCap!=null?T.rareCap|0:cap;
    return {min:r,max:cap,tier:'rare'};
  }
  const tier=mapBanditRegionTier(e,opts);
  const row=(T.realmByTier&&T.realmByTier[tier])||{min:0,max:cap};
  let mn=row.min!=null?row.min|0:0;
  let mx=row.max!=null?row.max|0:cap;
  if(kind==='chief'&&row.chiefMax!=null)mx=row.chiefMax|0;
  mx=Math.min(mx,cap);
  if(mn>mx)mn=mx;
  return {min:mn,max:mx,tier:tier};
}
function mapBanditGearQMax(realm){
  const r=realm==null?mapBanditRealmCap():(realm|0);
  if(r<=2)return 1;if(r<=4)return 2;return 3;
}
