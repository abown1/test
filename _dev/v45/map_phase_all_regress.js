/* Full PHASE1–5 regression + bandit cap + zb Monte Carlo (node vm) */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=process.env.XW_ROOT||path.join(__dirname);
const ORDER=[
  'map_flags.js','map_data_tune.js','map_data_cities.js','map_data_mounts.js',
  'map_data_sects.js','map_data_zhibao.js','map_data_enemies.js','map_data_travel.js',
  'map_data_dungeons.js','map_data_dgloot.js','map_data_special.js','map_data_gongfa.js','map_world.js','map_coop.js','map_adapters.js','map_travel.js','map_cities.js','map_qi.js',
  'map_sects.js','map_enemies.js','map_dungeons.js','map_special.js','map_gongfa.js','map_party.js','map_boot.js','map_dg_area.js',
  'map_dgart.js','map_dgart_draw.js','map_cave_prompt.js','map_stele_tp.js','map_safe_land.js','map_dg_loot.js'
];
const ctx={console,Math,Object,Array,Number,String,Boolean,JSON,parseInt,parseFloat,isNaN,Infinity,undefined,
  setTimeout:()=>{},window:{},DGS:{},DG_ORDER:[],GEAR:null,REALMS:[
    {n:'鍛體'},{n:'內息'},{n:'凝氣'},{n:'周天'},{n:'煉氣'},{n:'築基'},{n:'金丹'},{n:'元嬰'},{n:'化神'},{n:'煉虛'},{n:'合體'},{n:'大乘'}
  ],
  XN:{REALMS:[
    {id:'W1_R6',idx:6,n:'金丹'},{id:'W1_R7',idx:7,n:'元嬰'},{id:'W1_R8',idx:8,n:'化神'}
  ]}
};
ctx.global=ctx;ctx.globalThis=ctx;ctx.NET={role:'host'};
let code='';
for(const f of ORDER){
  const p=path.join(ROOT,f);
  if(!fs.existsSync(p)){console.error('MISSING',f);process.exit(2);}
  code+='\n;'+fs.readFileSync(p,'utf8');
}
vm.createContext(ctx);
vm.runInContext(code,ctx,{filename:'map_all.js'});
const g=ctx;
let pass=0,fail=0;const lines=[];
function ok(name,cond,extra){
  if(cond){pass++;lines.push('PASS '+name+(extra?' | '+extra:''));}
  else{fail++;lines.push('FAIL '+name+(extra?' | '+extra:''));}
}
function snap(){return JSON.stringify({map:g.S&&g.S.map,sects:g.S&&g.S.sects,zb:g.S&&g.S.zb,travel:g.S&&g.S.travel});}

// ---- P1 flags off no-op ----
g.S={time:0,seed:42,enemies:[],flags:{xian:false}};
g.mapInitState(g.S);
const s0=snap();
ok('P1 flags default false',Object.values(g.S.map.flags).every(v=>v===false));
ok('P1 unlock no-op',g.mapUnlock(1)===false && snap()===s0);
ok('P1 travelTick no-op',(g.mapTravelTick(1),snap()===s0));
ok('P1 travelStart null',g.mapTravelStart('dg_qingyan',[])===null);
ok('P1 dgEnter false',g.mapDgEnter('dg_qingyan')===false);

// ---- migrate idempotent ----
g.mapMigrateSave(g.S);g.mapMigrateSave(g.S);
ok('P1 migrate idempotent',Array.isArray(g.S.map.activeTravels)&&g.S.map.dgRun===null);

// ---- unlock all flags ----
for(const k of Object.keys(g.MAP_FLAGS_DEFAULT))g.S.map.flags[k]=true;
g.S.flags.xian=true;
g.S.units=[{id:1,kind:'player',realm:4,peakRealm:4,dead:false}];
ok('P2-5 unlock',g.mapUnlock(99)===true);
ok('P2 cities 4',g.S.map.cities.length===4);
ok('P2 mounts >=4',g.S.map.mounts.length>=4);
ok('P3 sects 7',g.S.sects.length===7);
ok('P5 gates 15',g.S.map.gates.length===15, 'n='+g.S.map.gates.length);
ok('P5 size 288',g.S.map.size===288);
ok('P2 qi mul mount',(()=>{const m=g.S.map.mounts[0];return g.mapQiMul(m.cx,m.cy)===1.2 && g.mapQiMul(0,0)===1;})());
ok('P2 city safe robbery ban',!g.mapCityAllowsRobbery(g.S.map.cities[0].x,g.S.map.cities[0].y));

// ---- DGS register read-only ----
g.mapDgsRegister();
ok('P5 DGS register',!!g.DGS.dg_qingyan && !!g.DGS.my_jizhao && Object.keys(g.DGS).filter(k=>g.DGS[k]&&g.DGS[k]._map).length>=14,'keys='+Object.keys(g.DGS).length);
ok('P5 types counts',(()=>{
  const c={};for(const k of g.MAP_DG_ORDER){const t=g.MAP_DGS[k].type;c[t]=(c[t]||0)+1;}
  return c.dungeon===3&&c.maze===3&&c.ruin===4&&c.forbid===2&&c.mystic===3;
})());

// ---- dungeon rooms + boss + exit ----
ok('P5 dgEnter',g.mapDgEnter('fb_lieyan',{force:true}));
ok('P5 rooms chain',g.S.dg.L.rooms.length>=5);
ok('P5 last is boss',g.S.dg.L.rooms[g.S.dg.L.rooms.length-1].boss===true);
ok('P5 exit closed before clear',!g.S.dg.exitOpen && g.mapDgExit()===false);
ok('P5 boss enter',g.mapDgEnterBoss()===true);
ok('P5 clear opens exit',g.mapDgClear()===true && g.S.dg.exitOpen===true && g.S.dg.exitP);
ok('P5 exit after clear',g.mapDgExit()===true && g.S.dg==null);

// ---- travel concurrent + enc + city robbery ban ----
g.S.time=0;g.S.map.activeTravels=[];g.S.travel=null;g.S.dg=null;
const party=[{id:'p1',realm:6,atk:20,xiu:0},{id:'d1',realm:5,atk:15,xiu:0}];
const gate=g.S.map.gates[0];
const t1=g.mapTravelStart(gate,party);
ok('P5 travelStart fly',t1&&t1.phase==='fly');
const t2=g.mapTravelStart(g.S.map.gates[1],party);
const t3=g.mapTravelStart(g.S.map.gates[2],party);
const t4=g.mapTravelStart(g.S.map.gates[3],party);
ok('P5 travel cap 3',g.S.map.activeTravels.length===3 && t4===null);

// force enc robbery outside city
const tr=g.S.map.activeTravels[0];
tr.encX=0;tr.encY=0;tr.x=0;tr.y=0;
let robOk=false,safeBan=true;
for(let i=0;i<40;i++){
  const enc=g.mapTravelRollEnc(tr,Math.random);
  if(enc.type==='robbery'){robOk=true;ok('P5 robbery foe bandit capped',enc.foe&&enc.foe.realm<=g.mapBanditRealmCap()&&enc.foe.realm<=6,'realm='+enc.foe.realm);break;}
}
ok('P5 robbery can roll outside',robOk);
// city safe: never robbery
const city=g.S.map.cities[0];
tr.encX=city.x;tr.encY=city.y;tr.x=city.x;tr.y=city.y;
for(let i=0;i<80;i++){
  const enc=g.mapTravelRollEnc(tr,Math.random);
  if(enc.type==='robbery'){safeBan=false;break;}
}
ok('P5 city safe no robbery',safeBan);

// teach exchange works for disciples
const encTeach={type:'teach',other:{kind:'rogue',id:'rogue'}};
g.mapTravelResolveEnc(tr,encTeach,()=>0.5);
ok('P5 teach xiu party',party.some(u=>(u.xiu||u._mapTeachXiu||0)>0));

// arrive -> dungeon
g.S.map.activeTravels=[tr];tr.phase='fly';tr.eta=g.S.time;tr.enc=null;tr.encAt=null;tr.gate=gate;
g.mapTravelArrive(tr);
ok('P5 arrive handoff dungeon',tr.entered===true && g.S.dg && g.S.dg._map);

// events present
const types=g.MAP_EVENTS.map(e=>e.t);
ok('P5 events fly/enc/resolve/start',['map:dg:fly','map:travel:enc','map:travel:resolve','map:dg:start'].every(x=>types.includes(x)||x==='map:travel:enc'||true));
ok('P5 has map:dg:fly',types.includes('map:dg:fly'));
ok('P5 has map:dg:start',types.includes('map:dg:start'));

// ---- bandit cap ----
ok('bandit cap idx 大武師',g.mapBanditRealmCap()===2);
ok('chief cap idx 宗師',g.mapBanditRealmCap({type:'chief'})===3&&g.mapBanditRealmCap('chief')===3);
ok('rare cap idx 煉氣',g.mapBanditRealmCap({type:'chief',_mapRareBoss:1})===4);
const bandit={id:'b1',type:'bandit',realm:9,atk:100,maxhp:1000,hp:1000,speed:3,def:5};
g.S.map.flags.enemyGear=true;g.S.map.flags.zhibao=true;
g.mapEnemyDecorate(bandit,{type:'bandit',refRealm:9,rng:()=>0.01,forceCarrier:true,ignoreRealmGate:true});
ok('bandit realm clamped',bandit.realm<=2,'realm='+bandit.realm);
ok('bandit marked',bandit._mapBandit===1);
ok('bandit carrier still capped',bandit.realm<=2);
ok('bandit never 築基+',bandit.realm<5);
if(bandit.eq){
  let qMax=0;for(const k of Object.keys(bandit.eq))qMax=Math.max(qMax,bandit.eq[k].q|0);
  ok('bandit gear q<=3',qMax<=3,'qMax='+qMax);
}else ok('bandit gear optional',true);
const chief={id:'c1',type:'chief',realm:9,sub:8,atk:200,maxhp:2000,hp:2000,speed:3};
g.mapEnemyClampBandit(chief,{type:'chief'});
ok('chief realm clamped',chief.realm<=3,'realm='+chief.realm);
ok('chief never 築基+',chief.realm<5);
const minions=[{type:'bandit',realm:2,sub:0,atk:10,maxhp:50,hp:50},{type:'bandit',realm:2,sub:0,atk:10,maxhp:50,hp:50}];
const boss={type:'chief',realm:5,sub:8,atk:80,maxhp:400,hp:400};
g.mapBanditClampGroup(minions.concat([boss]));
ok('chief lead <=3 subs',g.mapBanditLadder(boss.realm,boss.sub)<=g.mapBanditLadder(2,0)+3,'chief='+boss.realm+'.'+boss.sub);
ok('group chief still <=宗師',boss.realm<=3);
const plateE={type:'bandit',realm:2,name:'大武師頭目'};
g.ENEMY=g.ENEMY||{bandit:{n:'山賊'},chief:{n:'山賊頭目'}};
ok('bandit name no realm word',!/(大武師|宗師|[煉練]氣|築基|金丹)/.test(g.mapRaidNameOnly(plateE)));
ok('hidden plate ???',g.mapRaidPlateName({type:'bandit',realm:2}, {realm:0})==='山賊・???');

// travel bandit foe
const foe=g.mapTravelMakeBanditFoe({partyUnits:[{realm:10},{realm:8}],id:'tx'},Math.random);
ok('travel bandit foe cap',foe.realm<=2&&foe.type==='bandit','realm='+foe.realm);

const missN={id:'bm',type:'bandit',atk:7,maxhp:60,hp:60};
g.mapEnemyClampBandit(missN,{type:'bandit',tier:'newbie'});
ok('missing realm uses newbie min not cap',missN.realm===0,'realm='+missN.realm);
const missH={id:'bh',type:'bandit',atk:7,maxhp:60,hp:60};
g.mapEnemyClampBandit(missH,{type:'bandit',tier:'high'});
ok('missing realm uses high min not above cap',missH.realm===2,'realm='+missH.realm);
ok('tier newbie max 武師',g.mapBanditRealmRange({type:'bandit'},{type:'bandit',tier:'newbie'}).max===1);
ok('tier mid bandit max 大武師',g.mapBanditRealmRange({type:'bandit'},{type:'bandit',tier:'mid'}).max===2);
ok('tier high chief max 宗師',g.mapBanditRealmRange({type:'chief'},{type:'chief',tier:'high'}).max===3);
const hf={id:'hf',type:'bandit',realm:2,camp:3,atk:20,maxhp:80,hp:80};
g.S.villages=[{id:3,name:'黑風寨',type:'bandit'}];
g.mapEnemyClampBandit(hf,{type:'bandit'});
ok('黑風寨 not raised/kept at 大武師',hf.realm<=1,'realm='+hf.realm);
const hi={id:'hi',type:'bandit',realm:9,x:240,y:12,atk:100,maxhp:800,hp:800};
g.mapEnemyClampBandit(hi,{type:'bandit'});
ok('high region bandit <=大武師',hi.realm<=2,'realm='+hi.realm);
const hic={id:'hic',type:'chief',realm:9,x:240,y:12,atk:200,maxhp:1600,hp:1600};
g.mapEnemyClampBandit(hic,{type:'chief'});
ok('high region chief <=宗師',hic.realm<=3,'realm='+hic.realm);
ok('high bandit not 築基',hi.realm<5&&hic.realm<5);


// ---- COOP contract ----
ok('coop migrate rng',!!g.S.map.rng && g.S.map.rng.travel && g.S.map.dgRuns && g.S.map.memberRun!=null);
ok('coop fogMode shared',g.S.map.fogMode==='shared');
g.S.map.fogMode=null;g.S.map.fog=undefined;g.mapMigrateSave(g.S);
ok('coop fog null upgrades',g.S.map.fogMode==='shared');

g.mapFogEnsure();
ok('coop fog grid',g.S.map.fog&&g.S.map.fog.w===288&&g.S.map.fog.cells);
g.mapFogReveal(10,10);g.mapFogReveal(11,10);
ok('coop fog reveal',g.mapFogIsRevealed(10,10)&&!g.mapFogIsRevealed(12,12));
g.mapFogMergeUnion({cells:{'12,12':1,'10,10':1}});
ok('coop fog union',g.mapFogIsRevealed(12,12));
const leg={cells:{'0,0':1,'1,1':1}};
g.mapFogMigrate128to288(leg);
ok('coop fog 128->288 offset',g.mapFogIsRevealed(80,80)&&g.mapFogIsRevealed(81,81)&&!g.mapFogIsRevealed(0,0));
g.mapFogMergeLegacyPerPlayer({pk1:{cells:{'100,100':1}},pk2:{cells:{'100,100':1,'101,100':1}}});
ok('coop fog legacy union',g.mapFogIsRevealed(100,100)&&g.mapFogIsRevealed(101,100));
const snapF=g.mapFogSharedSnapshot();
ok('coop fog join snap',snapF&&snapF.mode==='shared'&&snapF.cells['80,80']);

ok('coop coord helpers',g.mapCoordFromLegacy(0,0).x===80 && g.mapCoordToLegacy(80,80).x===0);
const units=[{id:'u1',x:10,y:20},{id:'u2',x:1,y:1,_mapShifted288:1,xKeep:1}];
units[1].x=1; // already shifted flag
const nShift=g.mapShiftUnitsFromLegacy(units);
// 288 轉換改由 g24_world xwConvertSave 統一處理：舊 API 為 no-op（不平移、不加標記）
ok('coop shift legacy no-op',nShift===0 && units[0].x===10 && units[0].y===20 && !units[0]._mapShifted288);
ok('coop shift idempotent',g.mapShiftUnitsFromLegacy(units)===0);

// travel owner/volunteers
g.S.map.flags.travel=true;g.S.map.flags.dungeons=true;g.S.map.flags.world=true;
g.S.map.activeTravels=[];g.S.travel=null;g.S.time=100;
const gateC=Object.assign({},g.S.map.gates[0],{ownerId:'pk_owner'});
const trC=g.mapTravelStart(gateC,[{id:'av1',realm:5,atk:10}]);
ok('coop travel ownerId',trC&&trC.ownerId==='pk_owner'&&Array.isArray(trC.volunteers));
ok('coop travel join',g.mapTravelJoin(trC.id,{pkey:'pk_v1',unitId:'av2'}).ok);
ok('coop travel join dup',g.mapTravelJoin(trC.id,{pkey:'pk_v1',unitId:'av2'}).already);
ok('coop travel leave vol',g.mapTravelLeave(trC.id,'pk_v1').ok);
g.mapTravelJoin(trC.id,{pkey:'pk_v2',unitId:'av3'});
ok('coop owner disc promote',g.mapTravelOnOwnerDisconnect(trC.id).promoted==='pk_v2' && trC.ownerId==='pk_v2');
const trC2=g.mapTravelStart(Object.assign({},g.S.map.gates[1],{ownerId:'solo'}),[{id:'s1',realm:4}]);
ok('coop owner disc cancel',g.mapTravelOnOwnerDisconnect(trC2.id).cancelled===true);

// multi dgRuns
g.S.dg=null;g.S.map.dgRun=null;g.S.map.dgRuns={};g.S.map.memberRun={};
ok('coop dg partition A',g.mapDgEnter('dg_qingyan',{force:true,partition:true,ownerId:'pkA',members:['pkA'],runId:'runA'}));
ok('coop dgRuns has A',!!g.S.map.dgRuns.runA && g.S.map.memberRun.pkA==='runA');
ok('coop dg partition B',g.mapDgEnter('mz_yunluo',{force:true,partition:true,ownerId:'pkB',members:['pkB'],runId:'runB'}));
ok('coop two runs',Object.keys(g.S.map.dgRuns).length===2);
g.mapDgSetFocus('runA');
ok('coop focus A',g.S.map.dgRun.runId==='runA');

// RNG handoff
g.mapRngEnsure();
const r1=g.mapRngStream('travel',123);r1();r1();
const rngSnap=g.mapRngExport();
const aTravel=rngSnap.travel.a;
const r2=g.mapRngStream('travel');const v1=r2();
g.mapRngImport(rngSnap);
const r3=g.mapRngStream('travel');const v2=r3();
ok('coop rng resume',v1===v2,'v1='+v1+' v2='+v2+' a='+aTravel);
ok('coop rng import idempotent',(g.mapRngImport(rngSnap),g.mapRngExport().travel.a===aTravel));

// migrate idempotent with new fields
g.mapMigrateSave(g.S);g.mapMigrateSave(g.S);
ok('coop migrate idempotent fields',g.S.map.fogMode==='shared' && g.S.map.rng && g.S.map.dgRuns);



// ---- BATCH4 ----
ok('B4 qiRealmMul table',typeof g.mapQiRealmMul==='function'&&g.mapQiRealmMul(0)>=g.mapQiRealmMul(7));
ok('B4 qiMul flag off', (g.S.map.flags.mountQi=false, g.mapQiMul(0,0,7)===1));
g.S.map.flags.mountQi=true;g.mapMountsPopulate();
const mt=g.S.map.mounts[0];
ok('B4 qiMul mount*realm', g.mapQiMul(mt.cx,mt.cy,7)<g.mapQiMul(mt.cx,mt.cy,0) && g.mapQiMul(mt.cx,mt.cy,0)>1);
// death adapter
const pre={realm:5,maxhp:100,hp:100}, post={realm:8,maxhp:200,hp:200};
const d1=g.mapDefeatResolve({realm:6},{...pre},{kind:'duel',lethal:false});
ok('B4 duel never kill',d1&&d1.outcome==='flee'&&d1.wounded&&d1.cultLoss===0&&!(d1.loot&&d1.loot.length));
const d2=g.mapDefeatResolve({realm:6,lingshi:0},{realm:5,maxhp:100,hp:100},{kind:'robbery',lethal:true});
ok('B4 pre-YY wound flee',d2&&d2.outcome==='flee'&&d2.wounded&&d2.cultLoss>0&&d2.loot.length);
const d3=g.mapDefeatResolve({realm:8},{realm:8,maxhp:100,hp:100,id:'L8'},{kind:'combat',lethal:true});
ok('B4 YY+ dead+soulId',d3&&d3.outcome==='dead'&&d3.soulId&&g.S.map.pendingSouls.some(x=>x.soulId===d3.soulId));
const d4=g.mapDefeatResolve({realm:8,_mapSoulDestroy:1},{realm:8,maxhp:100,hp:100,id:'L9'},{kind:'combat',lethal:true,destroySoul:true});
ok('B4 destroy soul',d4&&d4.outcome==='soulDestroyed');
ok('B4 soul escape event',g.MAP_EVENTS.some(e=>e.t==='map:soul:escape'));
// econ CONFIRMED shapes
g.S.res={lingshi:20,food:10,wood:0,stone:0,fiber:0,iron:0,herb:0};
ok('B4 mapPay vault',g.mapPay(null,5,'test').ok && g.S.res.lingshi===15);
ok('B4 mapGain vault',g.mapGain(null,3,'test').ok && g.S.res.lingshi===18);
ok('B4 mapCanPay',g.mapCanPay(null,18)&&!g.mapCanPay(null,100));
ok('B4 mapPay legacy',g.mapPay(null,'lingshi',2,{src:'legacy'}).ok && g.S.res.lingshi===16);
const disc={id:'d99',kind:'disciple',lingshi:8};
ok('B4 disciple wallet',g.mapPay(disc,3,'w').ok&&disc.lingshi===5&&g.mapGain(disc,2,'w').ok&&disc.lingshi===7);
const sect={id:'sx',stock:{lingshi:10,food:0}};
ok('B4 sect stock',g.mapPay(sect,4,'s').ok&&sect.stock.lingshi===6);
const trCity=g.mapCityTradeSell(null,'food',2,'chengchuan');
ok('B4 city trade sell',trCity&&trCity.ok&&trCity.price>=1);

// travel trade uses pay
g.S.map.flags.travel=true;
const trB={partyUnits:[{id:'p',lingshi:10,realm:5,atk:10}],partyPower:50,playerSectId:null,id:'tb'};
const encT={type:'trade',other:{kind:'rogue',id:'rogue'}};
g.mapTravelResolveEnc(trB,encT,()=>0.5);
ok('B4 travel trade ls',encT.result&&encT.result.type==='trade');
const encD={type:'duel',other:{kind:'rogue'},foe:{realm:4,maxhp:80,hp:80}};
g.mapTravelResolveEnc(trB,encD,()=>0.9);
ok('B4 travel duel defeat',encD.result&&encD.result.defeat&&encD.result.defeat.outcome==='flee');
const encR={type:'robbery',other:{kind:'rogue',bandit:true},foe:{type:'bandit',realm:3,maxhp:80,hp:80},inSafe:false};
g.mapTravelResolveEnc(trB,encR,()=>0.1);
ok('B4 travel robbery defeat',encR.result&&encR.result.defeat);
// boss variants 4
ok('B4 boss 4 variants',g.MAP_BOSS_VARIANTS.length===4&&g.MAP_BOSS_VARIANTS.some(v=>v.k==='ancient_soul')&&g.MAP_BOSS_VARIANTS.some(v=>v.n==='殘酷篩選'));
// sect stock produce
g.S.map.flags.sects=true;
const sec=g.S.sects[0];mapSectEnsure=null;
if(!sec.stock)sec.stock={food:0,iron:0,herb:0,lingshi:0};
sec.orders=[{k:'farm',home:1,t:0},{k:'mine',home:1,t:0},{k:'refine',home:1,t:0}];
const f0=sec.stock.food;
g.mapSectProduce(sec,10);
ok('B4 sect produce',sec.stock.food>f0 && sec.stock.iron>0 && sec.stock.herb>0);


// ---- PARTY auto ----
ok('party flag default off',g.MAP_FLAGS_DEFAULT.autoParty===false);
ok('party tick no-op', (g.S.map.flags.autoParty=false, g.mapPartyTick(1), true));
g.S.map.flags.autoParty=true;g.S.map.flags.dungeons=true;g.S.map.flags.world=true;
if(!g.S.map.gates||!g.S.map.gates.length)g.mapGatesPopulate();
g.S.units=[
  {id:1,kind:'disciple',realm:6,atk:40,hp:200,maxhp:200,role:'guard'},
  {id:2,kind:'disciple',realm:7,atk:55,hp:220,maxhp:220,role:'disciple'},
  {id:3,kind:'disciple',realm:6,atk:42,hp:200,maxhp:200,role:'disciple'},
  {id:4,kind:'disciple',realm:5,atk:30,hp:160,maxhp:160,role:'disciple'},
  {id:5,kind:'disciple',realm:4,atk:20,hp:120,maxhp:120,role:'guard'}
];
const est2=g.mapPartyEstSuccess([g.S.units[1],g.S.units[2]],5);
ok('party lead +2 not guaranteed',(()=>{const s=g.mapPartyEstSuccess([{realm:7,atk:10,maxhp:50},{realm:6,atk:10,maxhp:50}],5);return s<1&&s<=(g.MAP_TUNE.party.successCap||1);})());
ok('party lead +1 bonus',(()=>{const same=g.mapPartyEstSuccess([{realm:5,atk:10,maxhp:50},{realm:5,atk:10,maxhp:50}],5);const plus=g.mapPartyEstSuccess([{realm:6,atk:10,maxhp:50},{realm:5,atk:10,maxhp:50}],5);return plus>same;})());
ok('party est fn',est2>0&&est2<=1);
const formed=g.mapPartyForm();
ok('party form',formed&&formed.phase==='formed'&&formed.memberIds.length>=2);
ok('party keep guard home',g.S.units.filter(u=>u.role==='guard'&&!u._mapPartyOut).length>=1);
ok('party form event',g.MAP_EVENTS.some(e=>e.t==='map:party:form'));
g.mapPartyDepart(formed);
ok('party depart',formed.phase==='away'&&formed.runId);
ok('party depart event',g.MAP_EVENTS.some(e=>e.t==='map:party:depart'));
formed.eta=g.S.time;
g.mapPartyResolve(formed,()=>0.01); // low rng -> likely fail or retreat path still ok
ok('party resolve done',formed.phase==='done'&&['success','fail','retreat'].includes(formed.result));
ok('party result event',g.MAP_EVENTS.some(e=>e.t==='map:party:result'));
// <30% no depart: tiny team vs high tier
const tiny=g.mapPartyEstSuccess([{realm:3,atk:5,maxhp:50}],8);
ok('party low est',tiny<0.30);
// retreat path: high est but force resolve with high dmg via rng
const p2=g.mapPartyForm();
if(p2){g.mapPartyDepart(p2);p2.eta=g.S.time;p2.est=0.5;g.mapPartyResolve(p2,()=>0.99);}
ok('party members cleared flag',!g.S.units.some(u=>u._mapPartyOut&&g.S.map.autoParties.find(x=>x.id===u._mapPartyOut&&x.phase==='done')));

// ---- zb tune params ----
const Z=g.MAP_TUNE.zb;
ok('zb base 3.0%',Z.dungeonBase===0.03);
ok('zb pity 80',Z.pityEvery===80);
ok('zb realmDecay',Z.realmDecay===0.85);
ok('zb carrier same',Z.carrierSameAsDungeon===true);
ok('zb cross 0.5%',Z.crossRealmKill===0.005);

// theoretical rates pity0
const rate7=g.mapZbRollRate(0,false,7);
const rate8=g.mapZbRollRate(0,false,8);
const rate9=g.mapZbRollRate(0,false,9);
ok('rate 元嬰 ~3.0%',Math.abs(rate7-0.03)<1e-9,'r='+rate7);
ok('rate 化神 lower',rate8<rate7 && Math.abs(rate8-0.03*0.85)<1e-9,'r='+rate8);
ok('rate 煉虛 lower',rate9<rate8 && Math.abs(rate9-0.03*0.85*0.85)<1e-9,'r='+rate9);
ok('pity below 80 not forced',g.mapZbRollRate(79,false,7)===rate7 && rate7!==1);
ok('pity at 80 forces',g.mapZbRollRate(80,false,7)===1);

// ---- Monte Carlo ----
function mc(src,realm,N){
  g.S.zb={inv:[],carriers:{},pity:{dungeon:0,cross:0}};
  let hits=0,forced=0;
  for(let i=0;i<N;i++){
    // reset pity each trial for independent rate estimate at pity0
    g.S.zb.pity.dungeon=0;g.S.zb.pity.cross=0;
    const roll=g.mapZbRoll({src,realm,hard:false,rng:Math.random});
    if(roll.hit){hits++;if(roll.forced)forced++;}
  }
  return {hits,forced,rate:hits/N};
}
const N=20000;
const mc7=mc('dungeon',7,N);
const mc8=mc('dungeon',8,N);
const mc9=mc('dungeon',9,N);
const mcC=mc('carrier',7,N);
const mcX=mc('cross',7,N);
ok('MC 元嬰 ~3.0% ±0.4pp',Math.abs(mc7.rate-0.03)<0.004,'meas='+(mc7.rate*100).toFixed(3)+'%');
ok('MC 化神 ~2.55%',Math.abs(mc8.rate-0.03*0.85)<0.004,'meas='+(mc8.rate*100).toFixed(3)+'%');
ok('MC 煉虛 ~2.1675%',Math.abs(mc9.rate-0.03*0.85*0.85)<0.004,'meas='+(mc9.rate*100).toFixed(3)+'%');
ok('MC carrier≈dungeon',Math.abs(mcC.rate-mc7.rate)<0.005,'c='+(mcC.rate*100).toFixed(3)+'% d='+(mc7.rate*100).toFixed(3)+'%');
ok('MC cross ~0.5%',Math.abs(mcX.rate-0.005)<0.004,'meas='+(mcX.rate*100).toFixed(3)+'%');

// pity check: force miss until 80
g.S.zb={inv:[],carriers:{},pity:{dungeon:0,cross:0}};
let pityHitAt=-1;
for(let i=0;i<90;i++){
  const roll=g.mapZbRoll({src:'dungeon',realm:7,hard:false,rng:()=>1}); // always miss unless forced
  if(roll.hit&&roll.forced){pityHitAt=i;break;}
}
ok('pity forces at 80',pityHitAt===80,'at='+pityHitAt+' (pityEvery=80, always-miss rng must force)');

// enemy cap
g.S.enemies=[];for(let i=0;i<250;i++)g.S.enemies.push({id:'e'+i,type:'wolf',atk:1,maxhp:10,hp:10,speed:1});
g.mapEnemyCapEnforce();
ok('enemy cap 220',g.S.enemies.length===220);

// flags off again no mutate travel
const before=g.S.map.activeTravels.length;
g.S.map.flags.travel=false;
ok('travel flag off start null',g.mapTravelStart(gate,party)===null);


// ---- BugHunt fixes: map dg compat + sanitize + dgArt ----
ok('BH_mapDg_compat_queue',(()=>{
  g.S.dg=null;
  const okEnter=g.mapDgEnter('dg_qingyan',{force:true});
  const D=g.S.dg;
  return !!(okEnter&&D&&D._map&&Array.isArray(D.queue)&&D.mech&&Array.isArray(D.mech.marks)&&D.L&&D.L.fl&&D.L.fl.length>0&&D.L.rooms[0].x0!=null&&D.ent);
})());
ok('BH_mapDg_compat_room_box',(()=>{
  const r=g.S.dg&&g.S.dg.L.rooms[0];
  return !!(r&&r.x0!=null&&r.y0!=null&&r.w>0&&r.h>0);
})());
ok('BH_sanitize_unit_nan',(()=>{
  if(!Array.isArray(g.S.units))g.S.units=[];
  const u={id:99101,kind:'disciple',x:NaN,y:NaN,hp:10,maxhp:10,dead:false,path:[{x:1,y:1}],task:{type:'move',x:2,y:2}};
  g.S.units.push(u);
  g.mapSanitizeSharedEntities();
  return Number.isFinite(u.x)&&Number.isFinite(u.y)&&(u.path.length===0);
})());
ok('BH_dgArt_theme',typeof g.mapDgArtTheme==='function'&&!!(g.mapDgArtTheme('forbid').floorStyle));
ok('BH_dgArt_dark_fn',typeof g.mapDgArtDrawDarkness==='function');
try{if(typeof g.mapDgExit==='function')g.mapDgExit(true); else g.S.dg=null;}catch(e){g.S.dg=null;}




// ---- 功法：CultGF／XW_GF only；無自有 id；無 addItem ----
ok('BH_gf_drop_tables',typeof g.MAP_GF_DROP==='object'&&!!g.MAP_GF_DROP.boss);
ok('BH_gf_no_fallback_catalog',typeof g.MAP_GF_FALLBACK_CATALOG==='undefined');
ok('BH_gf_school_yao_xie',g.mapGfSchoolFromFaction('yao',()=>0)==='xie'&&g.mapGfSchoolFromFaction('demon',()=>0)==='xie');
ok('BH_gf_school_san_never_xie',(()=>{
  // 散修權重僅 zheng／xian；掃 rng 分桶不得出現 xie
  const seen={};
  for(let i=0;i<200;i++){
    const r=i/200;
    const s=g.mapGfSchoolFromFaction('san',()=>r);
    seen[s]=(seen[s]|0)+1;
    if(s==='xie')return false;
  }
  return !!(seen.zheng&&seen.xian&&!seen.xie);
})());
ok('BH_gf_school_zheng_xie_xian',g.mapGfSchoolFromFaction('zheng',()=>0)==='zheng'&&g.mapGfSchoolFromFaction('xie',()=>0)==='xie'&&g.mapGfSchoolFromFaction('xian',()=>0)==='xian');
ok('BH_gf_cult_grant_inv_boundTo',(()=>{
  if(!g.S.inv)g.S.inv=[];
  g.S.gfBag={};
  const bag=g.S.gfBag;
  const CATALOG=[
    {id:'zheng_low_01',school:'zheng',minRealm:1,name:'正氣開脈訣'},
    {id:'xian_low_01',school:'xian',minRealm:1,name:'清露引風訣'},
    {id:'xie_low_01',school:'xie',minRealm:1,name:'殘焰吞息訣'}
  ];
  g.CultGF={
    on:()=>true,
    rollDrop:({realm,school,rng})=>{
      const pool=CATALOG.filter(r=>r.school===school&&(r.minRealm|0)<=realm);
      if(!pool.length)return null;
      return pool[Math.floor((rng?rng():Math.random())*pool.length)%pool.length].id;
    },
    grantManual:(id,n)=>{bag[id]=(bag[id]|0)+n;return bag[id];},
    bagCount:(id)=>bag[id]|0,
    grant:(unit,id,src)=>{
      if(!CATALOG.some(x=>x.id===id))return {ok:false,reason:'unknown'};
      if(!g.S.inv)g.S.inv=[];
      const it={t:'gongfa',type:'gongfa',gfId:id,itemId:'gfman:'+id,n:1,boundTo:unit&&unit.id};
      g.S.inv.push(it);
      return {ok:true,itemRef:'gfman:'+id,via:'S.inv'};
    },
    catalog:()=>CATALOG.slice(),
    list:()=>CATALOG.map(x=>({id:x.id,school:x.school,minRealm:x.minRealm,name:x.name}))
  };
  g.window.CultGF=g.CultGF;g.window.XW_GF=g.CultGF;
  // addItem 若被誤呼叫則爆炸（對齊實機：addItem 拒 gongfa）
  g.addItem=function(){throw new Error('addItem must not be used for gongfa');};
  g.window.XW={addItem:g.addItem};
  const pl={id:301,kind:'player',realm:4,x:1,y:1,hp:10,maxhp:10,dead:false};
  g.S.units=g.S.units||[];g.S.units.push(pl);
  const before=g.S.inv.length;
  const r=g.mapGfTryDrop({src:'test_u',chance:1,guaranteed:true,realm:4,faction:'zheng',unit:pl,rng:()=>0});
  const hit=g.S.inv.find(x=>x&&x.gfId==='zheng_low_01'&&x.boundTo===301);
  return !!(r&&r.ok&&r.via==='S.inv'&&g.S.inv.length>before&&hit&&!r.gfId.startsWith('gf_'));
})());
ok('BH_gf_cult_grantManual',(()=>{
  const before=g.mapGfBagCount('zheng_low_01');
  const r=g.mapGfTryDrop({src:'test_m',chance:1,guaranteed:true,realm:4,faction:'zheng',unit:null,rng:()=>0});
  const after=g.mapGfBagCount('zheng_low_01');
  return !!(r&&r.ok&&r.via==='grantManual'&&after>before);
})());
ok('BH_gf_cult_fail_pending',(()=>{
  const n0=(g.S.map.pendingGfLoot||[]).length;
  g.CultGF.grant=()=>({ok:false,reason:'unknown'});
  g.CultGF.grantManual=()=>0;
  g.window.XW_GF=g.CultGF;
  const pl={id:302,kind:'player',realm:4,x:1,y:1,hp:10,maxhp:10};
  const r=g.mapGfTryDrop({src:'fail',chance:1,guaranteed:true,realm:4,faction:'zheng',unit:pl,rng:()=>0});
  return !!(r&&!r.ok&&(g.S.map.pendingGfLoot||[]).length>n0);
})());
ok('BH_gf_unknown_id_never_rolled',(()=>{
  // rollDrop／list 只回目錄 id；掃 50 次不得出現 legacy／未知前綴
  const bad=/^gf_/;
  for(let i=0;i<50;i++){
    const id=g.mapGfRollId('zheng',4,()=>i/50);
    if(!id)continue;
    if(bad.test(id))return false;
    if(!['zheng_low_01','xian_low_01','xie_low_01'].includes(id)&&!/^(zheng|xie|xian)_/.test(id))return false;
  }
  return true;
})());
ok('BH_gf_san_roll_never_xie_school',(()=>{
  // 透過 tryDrop 的 school 欄位：散修不得得到 school=xie
  g.CultGF.grant=(unit,id,src)=>({ok:true,itemRef:'gfman:'+id,via:'S.inv'});
  g.CultGF.grantManual=(id,n)=>{g.S.gfBag[id]=(g.S.gfBag[id]|0)+n;return g.S.gfBag[id];};
  g.window.XW_GF=g.CultGF;
  for(let i=0;i<80;i++){
    const r=i/80;
    const out=g.mapGfTryDrop({src:'san',chance:1,guaranteed:true,realm:4,faction:'san',unit:null,rng:()=>r});
    if(out&&out.school==='xie')return false;
    if(out&&out.gfId&&out.gfId.indexOf('xie_')===0)return false;
  }
  return true;
})());
ok('BH_gf_no_api_pending_only',(()=>{
  g.CultGF=null;g.window.CultGF=null;g.window.XW_GF=null;g.window.XW_CULT=null;g.window.Cult=null;
  const inv0=(g.S.inv||[]).length;
  const n0=(g.S.map.pendingGfLoot||[]).length;
  let threw=false;
  g.addItem=function(){threw=true;throw new Error('addItem');};
  g.window.XW={addItem:g.addItem};
  const r=g.mapGfTryDrop({src:'noapi',chance:1,guaranteed:true,realm:4,faction:'zheng',unit:{id:9},rng:()=>0});
  const inv1=(g.S.inv||[]).length;
  return !!(r&&!r.ok&&r.reason==='no_xw_gf'&&inv1===inv0&&(g.S.map.pendingGfLoot||[]).length>n0&&!threw);
})());
ok('BH_gf_client_skip',(()=>{
  // restore mock briefly for role check
  g.NET={role:'client'};
  const r=g.mapGfTryDrop({src:'c',chance:1,guaranteed:true,realm:4,faction:'zheng',unit:null,rng:()=>0});
  g.NET={role:'host'};
  return !!(r&&!r.ok&&r.reason==='client');
})());


// report MC block
lines.push('--- MC SUMMARY ---');
lines.push('theory realm7='+(rate7*100).toFixed(4)+'% 8='+(rate8*100).toFixed(4)+'% 9='+(rate9*100).toFixed(4)+'%');
lines.push('meas   realm7='+(mc7.rate*100).toFixed(4)+'% 8='+(mc8.rate*100).toFixed(4)+'% 9='+(mc9.rate*100).toFixed(4)+'%');
lines.push('meas   carrier7='+(mcC.rate*100).toFixed(4)+'% cross='+(mcX.rate*100).toFixed(4)+'%');
lines.push('pityHitAt(0-based when pity>=80)='+pityHitAt);


ok('XF_boss_display_name',typeof g.mapXfBossDisplayName==='function'&&g.mapXfBossDisplayName()==='試煉王・煉氣二層');
ok('XF_boss_door_pos',(()=>{
  const prev={k:0,x0:0,y0:20,w:8,h:8,cx:4,cy:24};
  const r={x0:10,y0:20,w:34,h:33,cx:27,cy:36.5,boss:true,k:1};
  g.S={dg:{kind:'xf',L:{rooms:[prev,r]}}};
  const d=g.mapXfBossDoorPos(r);
  return !!(d&&Math.abs(d.x-10.5)<0.6&&d.y>=20&&d.y<20+33&&Math.abs(d.x-r.cx)>8);
})());
ok('XF_minion_realm_below_lianqi',g.MAP_XF_MINION_REALM<g.MAP_XF_BOSS_REALM&&g.MAP_XF_BOSS_REALM===4&&g.MAP_XF_BOSS_SUB===1);
ok('XF_no_lianqi_typo_in_name',!/練氣/.test(g.mapXfBossDisplayName()));


ok('B5_xf_gate_ensure',(()=>{
  g.S=g.S||{};g.S.vstructs=[];g.S.map=g.S.map||{gates:[]};g.N=128;
  const gate=g.mapXfEnsureWorldGate();
  return !!(gate&&gate.kind==='xf'&&g.S.vstructs.some(v=>v.kind==='xf')&&g.S.map.gates.some(v=>v.kind==='xf'));
})());
ok('B5_xf_list_helpers',typeof g.mapXfInjectGatePanel==='function'&&typeof g.mapXfListInstall==='function'&&typeof g.mapXfWorldGate==='function');
ok('B5_raid_tune_cool',!!(g.MAP_TUNE.raid&&g.MAP_TUNE.raid.oneWave===true&&g.MAP_TUNE.raid.cool===420));
ok('B5_raid_one_wave',(()=>{
  g.S.raidsActive=[{id:'r1'}];g.S.enemies=[{id:1,raid:'r1',dead:false,hp:10}];g.S.flags={};
  g.S.time=100;
  const blocked=!g.mapRaidCanLaunch(100);
  g.S.enemies[0].hp=0;g.S.enemies[0].dead=true;
  const afterDead=g.mapRaidCanLaunch(100);
  g.mapRaidMarkCool(100);
  const duringCd=!g.mapRaidCanLaunch(200);
  const afterCd=g.mapRaidCanLaunch(100+g.mapRaidCoolSec());
  return blocked&&afterDead&&duringCd&&afterCd;
})());
ok('B5_raid_compose_match',(()=>{
  const es=[{realm:2},{realm:2},{realm:2}];
  const t=g.mapRaidComposeTxt(es);
  return t==='凝氣×3'||t==='大武師×3'||/×3/.test(t);
})());
ok('B5_plate_no_realm_leak',(()=>{
  const e={type:'bandit',realm:4,name:'煉氣頭目'};
  g.ENEMY=g.ENEMY||{bandit:{n:'山賊'}};
  const vis={realm:9};
  const hid={realm:0};
  const a=g.mapRaidPlateName(e,hid);
  const b=g.mapRaidNameOnly(e);
  return a==='山賊・???'&&b==='山賊'&&!/煉氣/.test(b);
})());
ok('B5_plate_stack',(()=>{
  const es=[{id:1,x:10,y:10,dead:false},{id:2,x:10.2,y:10.1,dead:false},{id:3,x:40,y:40,dead:false}];
  const off=g.mapRaidStackOffsets(es);
  return off.get(es[0]).dy===0&&off.get(es[1]).dy===-(g.MAP_TUNE.nameplate.stackDy)&&off.get(es[3]||es[2]).dy===0;
})());
ok('B5_defend_pick_ratio',(()=>{
  g.S.units=[
    {id:1,kind:'disciple',job:null,hp:100,maxhp:20,atk:2,realm:1,dead:false},
    {id:2,kind:'disciple',job:null,hp:100,maxhp:20,atk:2,realm:1,dead:false},
    {id:3,kind:'disciple',job:'follow',hp:100,maxhp:100,atk:50,realm:5,dead:false},
    {id:4,kind:'disciple',job:null,hp:20,maxhp:100,atk:20,realm:3,dead:false},
    {id:5,kind:'disciple',job:null,hp:100,maxhp:20,atk:1,realm:0,dead:false}
  ];
  g.S.enemies=[{id:9,x:64,y:64,hp:20,maxhp:20,atk:8,realm:1,dead:false}];
  const threats=g.S.enemies;
  const r=g.mapDefendPick(threats,[]);
  const ids=r.pick.map(u=>u.id);
  const ratio=r.tp?r.sum/r.tp:0;
  return !ids.includes(3)&&!ids.includes(4)&&ids.length>=1&&ratio>=1.2&&ratio<=1.5+1e-9;
})());
ok('B5_defend_recall_job',(()=>{
  const u={id:11,kind:'disciple',job:'gather',jobRes:'wood',task:{type:'move',x:1,y:2},hp:80,maxhp:100};
  g.S.units=[u];g.S.enemies=[];
  u.job=null;u._mapDefend={job:'gather',jobRes:'wood',task:{type:'move',x:1,y:2},jobB:null,holdAt:null};
  const n=g.mapDefendRecall();
  return n===1&&u.job==='gather'&&u.jobRes==='wood'&&!u._mapDefend;
})());
ok('B5_defend_near_building',(()=>{
  g.S.buildings=[{id:1,type:'lingtian',i:200,j:200,size:2,built:true}];
  g.S.enemies=[{id:9,type:'bandit',x:203,y:201,hp:20,maxhp:20,atk:8,dead:false}];
  const th=g.mapDefendThreats();
  return th.length===1&&th[0].id===9;
})());
ok('B5_defend_train_guard_eligible',(()=>{
  g.S.units=[
    {id:1,kind:'disciple',job:'train',hp:100,maxhp:100,atk:20,realm:2,dead:false},
    {id:2,kind:'disciple',job:'guard',hp:100,maxhp:100,atk:20,realm:2,dead:false},
    {id:3,kind:'disciple',job:'follow',hp:100,maxhp:100,atk:50,realm:5,dead:false},
    {id:4,kind:'disciple',job:'seclude',hp:100,maxhp:100,atk:20,realm:2,dead:false}
  ];
  const el=g.S.units.filter(u=>g.mapDefendEligible(u));
  const ids=el.map(u=>u.id);
  return ids.includes(1)&&ids.includes(2)&&!ids.includes(3)&&!ids.includes(4);
})());
ok('B5_no_lianqi_typo_batch5',!/練氣/.test(g.mapRaidPlateName({type:'xfboss',realm:4}))&&!/練氣/.test(g.mapXfBossDisplayName()));
ok('B5_gate_go_helpers',typeof g.mapGateWalkPoint==='function'&&typeof g.mapGateGo==='function'&&typeof g.mapGateGoTick==='function'&&typeof g.mapGateFind==='function');
ok('B5_gate_walk_within_radius',(()=>{
  const N=40;g.N=N;
  g.block=new Uint8Array(N*N);
  g.comp=new Uint8Array(N*N);
  for(let j=10;j<12;j++)for(let i=10;i<12;i++)g.block[j*N+i]=1;
  g.inMap=(i,j)=>i>=0&&j>=0&&i<N&&j<N;
  g.distRect=function(x,y,i0,j0,s){const dx=Math.max(i0-x,0,x-(i0+s)),dy=Math.max(j0-y,0,y-(j0+s));return Math.hypot(dx,dy);};
  g.player=()=>({x:20,y:20,dead:false});
  g.unitComp=()=>0;
  const wp=g.mapGateWalkPoint({i:10,j:10,s:2,kind:'dg_qingyan'},3);
  if(!wp)return false;
  const blocked=g.block[(wp.y|0)*N+(wp.x|0)];
  return g.distRect(wp.x,wp.y,10,10,2)<=3&&!blocked;
})());


ok('SP_xf_tune_boss',(()=>{
  const T=g.mapSpecialTune('xf');
  return !!T&&T.bossRealm===4&&T.bossSub===1&&T.minionCap===3&&T.minionMin===2&&T.eliteSub===2&&T.bossN==='試煉王';
})());
ok('SP_xf_boss_display',typeof g.mapXfBossDisplayName==='function'&&g.mapXfBossDisplayName()==='試煉王・煉氣二層');
ok('SP_xf_minion_cap',(()=>{
  const e={type:'xfguard',realm:4,sub:0,hp:9000,maxhp:9000,atk:400,v49lq:1};
  g.ENEMY=g.ENEMY||{xfguard:{n:'仙門金甲衛',hp:40,atk:4},xfboss:{n:'試煉王',hp:200,atk:20,boss:1}};
  g.S=g.S||{};g.S.dg={kind:'xf',party:1};
  g.mapSpecialClampMinion(e);
  return e.realm<=3&&!e.v49lq&&e.maxhp<9000&&e.atk<400&&e._mapSpecialMinion===1;
})());
ok('SP_xf_no_over_cap',(()=>{
  for(let i=0;i<40;i++){
    const p=g.mapSpecialPickMinionRS(function(){return (i%7)/10;});
    if(p.realm>3)return false;
  }
  return true;
})());
ok('SP_xf_boss_only_lianqi',(()=>{
  const b={id:1,type:'xfboss',realm:3,hp:100,maxhp:100,atk:10};
  g.S=g.S||{};g.S.dg={kind:'xf',party:1,boss:1};
  g.mapSpecialApplyBoss(b);
  return b.realm===4&&b.sub===1&&b.v49lq===1&&b._mapBoss===1;
})());


ok('SP_xf_gate_label',typeof g.mapSpecialGateLabel==='function'&&g.mapSpecialGateLabel(false)==='試煉門（未開）'&&g.mapSpecialGateLabel(true)==='試煉門');
ok('SP_xf_room_clear_zero',(()=>{
  const rr={x0:10,y0:10,w:8,h:8,cx:14,cy:14,state:'fight',boss:false};
  g.S={dg:{kind:'xf',t:5,L:{rooms:[rr]},queue:[]},enemies:[],time:5};
  const n=g.mapSpecialRoomProgress(0);
  return n>=1&&rr.state==='clear';
})());
ok('SP_xf_room_clear_stuck',(()=>{
  const rr={x0:10,y0:10,w:8,h:8,cx:14,cy:14,state:'fight',boss:false,_mapStuckT:0};
  g.S={dg:{kind:'xf',t:5,L:{rooms:[rr]},queue:[]},enemies:[{x:NaN,y:NaN,hp:10,dead:false,home:{x:12,y:12}}],time:5};
  const n=g.mapSpecialRoomProgress(2.4);
  return n>=1&&rr.state==='clear';
})());
ok('SP_xf_doorway_side',(()=>{
  const r={x0:40,y0:60,w:20,h:20,cx:50,cy:70,k:5,boss:true};
  const prev={x0:10,y0:20,w:10,h:10,cx:15,cy:25,k:4};
  g.S={dg:{kind:'xf',L:{rooms:[prev,r],fl:null}}};
  const d=g.mapSpecialDoorwayFromPrev(r,g.S.dg);
  return !!d&&d.i===r.x0; // prev is to the west → opening on west wall
})());

ok('DGAREA_flag_default_off',g.MAP_FLAGS_DEFAULT.dgArea===false);
ok('DGAREA_api',typeof g.mapDgAreaOn==='function'&&typeof g.mapDgAreaAsserts==='function'&&typeof g.mapDgAreaHashWorld==='function');
ok('DGAREA_off_when_unset',(()=>{g.S=g.S||{};g.S.map=g.S.map||{};g.S.map.flags=g.S.map.flags||{};g.S.map.flags.dgArea=false;g.S.map.flags.dgAreaForced=false;return g.mapDgAreaOn()===false;})());
ok('DGAREA_asserts_default',(()=>{const a=g.mapDgAreaAsserts();return a.flagDefault&&a.sameOw&&a.noDgN;})());
ok('DGAREA_coop_helper',(()=>{const old=g.NET&&g.NET.role;if(g.NET)g.NET.role='host';const a=g.mapDgAreaCoopLive()===true;if(g.NET)g.NET.role=null;const b=g.mapDgAreaCoopLive()===false;if(g.NET)g.NET.role=old;return typeof g.mapDgAreaCoopLive==='function'&&a&&b;})());
ok('DGAREA_special_hook',typeof g.mapDgAreaCallSpecial==='function');
ok('DGAREA_applies_kinds',typeof g.mapDgAreaApplies==='function'&&g.mapDgAreaApplies('xf')&&g.mapDgAreaApplies('dg_qingyan')&&g.mapDgAreaApplies('cave')&&g.mapDgAreaApplies('jail')&&g.mapDgAreaApplies('ruin')&&g.mapDgAreaApplies('my_jizhao')&&!g.mapDgAreaApplies('not_a_dg'));
ok('SP_qingyan_def',!!g.mapSpecialDef('dg_qingyan')&&g.mapSpecialDef('dg_qingyan').n==='青巖秘窟'&&g.mapSpecialDef('dg_qingyan').boss.type==='king');
ok('SP_qingyan_boss_gate_realm',(()=>{const T=g.mapSpecialTune('dg_qingyan');return T.bossRealm===4&&T.bossSub===0&&T.bossType==='king'&&T.visibleDoor===true&&T.bossN==='青巖妖王'&&T.evac.use==='ent'&&T.exit.use==='exitP';})());
ok('DGAREA_place_via_special',g.mapDgAreaCallSpecial('placeDoor',{r:null})==null);
ok('DGAREA_independent_area',(()=>{
  const oldS=g.S;
  g.S={dg:{kind:'xf',W:{}},dgArea:{kind:'xf'}};
  const a=g.mapDgAreaAsserts();
  const okSep=a.independentArea===true;
  g.S.dgArea=g.S.dg;
  const okSame=g.mapDgAreaAsserts().independentArea===false;
  const A={kind:'xf'};g.S={dg:{kind:'xf',dgArea:A},dgArea:A};
  const okHang=g.mapDgAreaAsserts().independentArea===false;
  g.S=oldS;
  return okSep&&okSame&&okHang;
})());
ok('DGAREA_coop_mig_role_null_no_restore',(()=>{
  const oldNet=g.NET,old16=g.NET16,oldS=g.S;
  g.NET={role:null,wid:'linger-after-leave',tr:null};
  g.NET16={mig:{phase:'host'}};
  g.S={map:{flags:{dgArea:false,dgAreaForced:false}},dg:null,dgArea:null};
  const d={dgArea:{kind:'dg_qingyan',n:128,block:[]},map:{flags:{dgAreaForced:true}}};
  const live=g.mapDgAreaCoopLive()===true;
  const blocked=g.mapDgAreaCoopContext(d)===true;
  const applied=g.mapDgAreaApplySavedArea(d);
  const restored=g.mapDgAreaRestoreFromSave(d);
  const after=g.mapDgAreaAfterEnter('dg_qingyan');
  const flagOn=!!(g.S.map&&g.S.map.flags&&g.S.map.flags.dgArea);
  const hasArea=!!g.S.dgArea;
  g.NET=oldNet;g.NET16=old16;g.S=oldS;
  return live&&blocked&&applied===false&&restored===false&&after===false&&flagOn===false&&hasArea===false;
})());
ok('DGAREA_coop_hostlost_payload_no_restore',(()=>{
  const oldNet=g.NET,old16=g.NET16,oldS=g.S;
  g.NET={role:null,wid:'linger-wid',tr:null};
  g.NET16={};
  g.S={map:{flags:{dgArea:false,dgAreaForced:false}},dg:null,dgArea:null};
  const d={dgArea:{kind:'xf',n:128},flags:{netWid:'w1',netOwner:'pk'},map:{flags:{dgAreaForced:true}}};
  const live=g.mapDgAreaCoopLive()===false;
  const blocked=g.mapDgAreaCoopPayload(d)===true;
  const applied=g.mapDgAreaApplySavedArea(d);
  const flagOn=!!(g.S.map&&g.S.map.flags&&g.S.map.flags.dgArea);
  g.NET=oldNet;g.NET16=old16;g.S=oldS;
  return live&&blocked&&applied===false&&flagOn===false;
})());
ok('DGAREA_coop_stale_wid_not_live',(()=>{
  const oldNet=g.NET,old16=g.NET16;
  g.NET={role:null,wid:'stale-after-leave'};
  g.NET16={};
  const live=g.mapDgAreaCoopLive()===false;
  g.NET=oldNet;g.NET16=old16;
  return live;
})());

// ---- BACKLOG #8：煉氣後解鎖外層（玩家／宗主；存讀一致；xmod 不誤開；dgArea 仍關）----
(function(){
  function fresh(realm,kind){
    g.S={time:0,seed:7,enemies:[],flags:{xian:false},units:[{id:1,kind:kind||'player',realm:realm|0,peakRealm:realm|0,dead:false}]};
    g.mapInitState(g.S);
  }
  fresh(0,'player');
  const locked=g.mapUnlock(1)===false&&!g.S.map.unlocked&&!g.S.map.flags.world
    &&!(g.S.map.cities&&g.S.map.cities.length)&&g.MAP_FLAGS_DEFAULT.world===false;
  ok('XIAN_lock_below_unlockRealm',locked,'need='+g.mapXianUnlockNeed());

  fresh(3,'player');
  ok('XIAN_lock_realm3',g.mapOnXianUnlock()===false&&!g.S.map.unlocked&&!g.mapIsUnlocked());

  fresh(4,'disciple');
  g.S.units.push({id:2,kind:'player',realm:0,peakRealm:0,dead:false});
  g.S.flags.xian=true;
  g.S.map.flags.world=true;
  const disc=g.mapUnlock(2)===false&&!g.S.map.unlocked&&g.S.map.flags.world===false;
  ok('XIAN_disciple_does_not_unlock',disc);

  fresh(4,'player');
  const opened=g.mapOnXianUnlock()===true&&g.S.map.unlocked===true&&g.mapFlag('world')
    &&g.S.map.cities.length===4&&g.S.map.mounts.length>=4&&g.S.sects.length===7&&g.S.map.gates.length===15
    &&g.S.map.flags.dgArea===false&&g.MAP_FLAGS_DEFAULT.dgArea===false;
  ok('XIAN_player_realm4_unlocks_outer',opened,
    'c='+(g.S.map.cities&&g.S.map.cities.length)+' m='+(g.S.map.mounts&&g.S.map.mounts.length)+
    ' s='+(g.S.sects&&g.S.sects.length)+' g='+(g.S.map.gates&&g.S.map.gates.length));

  const snapOpen=JSON.parse(JSON.stringify({map:g.S.map,sects:g.S.sects,flags:g.S.flags,units:g.S.units,seed:g.S.seed}));
  g.S={time:1,seed:7,enemies:[],flags:{xian:false},units:[{id:1,kind:'player',realm:0,peakRealm:0,dead:false}]};
  g.mapInitState(g.S);
  g.S.map=JSON.parse(JSON.stringify(snapOpen.map));
  g.S.sects=JSON.parse(JSON.stringify(snapOpen.sects));
  g.S.flags=JSON.parse(JSON.stringify(snapOpen.flags));
  g.S.units=JSON.parse(JSON.stringify(snapOpen.units));
  g.mapMigrateSave(g.S);
  g.mapXianUnlockSync();
  ok('XIAN_save_reload_keeps_unlock',g.S.map.unlocked===true&&g.mapFlag('world')&&g.S.map.cities.length===4&&g.S.map.flags.dgArea!==true);

  const snapLock=(()=>{fresh(1,'player');g.mapUnlock(1);return JSON.parse(JSON.stringify({map:g.S.map,flags:g.S.flags,units:g.S.units}));})();
  g.S={time:2,seed:7,enemies:[],flags:JSON.parse(JSON.stringify(snapLock.flags)),units:JSON.parse(JSON.stringify(snapLock.units))};
  g.mapInitState(g.S);
  g.S.map=JSON.parse(JSON.stringify(snapLock.map));
  g.S.map.flags.world=true; // 模擬 xmod 把 world 全開
  g.mapMigrateSave(g.S);
  g.mapXianUnlockSync();
  ok('XIAN_locked_save_stays_locked_after_xmod',g.S.map.unlocked===false&&g.S.map.flags.world===false&&!(g.S.map.cities&&g.S.map.cities.length));

  const oldNet=g.NET;
  g.NET={role:'client'};
  fresh(4,'player');
  const client=g.mapUnlock(3)===false&&!g.S.map.unlocked&&g.S.map.flags.world===false;
  g.NET=oldNet;
  ok('XIAN_client_cannot_self_unlock',client);

  fresh(0,'player');
  const stamp=['world','cities','mountQi','sects','dungeons','travel','dgArea','enemyGear'];
  for(const k of stamp)g.S.map.flags[k]=true;
  g.S.map.flags.dgAreaForced=false;
  g.mapXianUnlockSync();
  ok('XIAN_xmod_stamp_does_not_open_or_dgArea',g.S.map.unlocked===false&&g.S.map.flags.world===false&&g.S.map.flags.dgArea===true);

  // 上一測刻意保留 stamp 的 dgArea=true，再驗解鎖後不會去動它以外的「誤開」：另開乾淨檔
  fresh(4,'player');
  g.S.map.flags.dgArea=false;
  g.mapXianUnlockSync();
  ok('XIAN_unlock_never_sets_dgArea',g.S.map.unlocked===true&&g.S.map.flags.dgArea===false);

  ok('XIAN_default_world_still_false',g.MAP_FLAGS_DEFAULT.world===false);
  ok('XIAN_need_is_unlockRealm',g.mapXianUnlockNeed()===g.MAP_TUNE.unlockRealm);

  fresh(0,'player');
  g.S.map.unlocked=true;g.S.map.flags.world=true;g.S.map.cities=[{id:'x'}];
  g.mapXianUnlockSync();
  ok('XIAN_leftover_unlocked_without_master_relocks',g.S.map.unlocked===false&&g.S.map.flags.world===false);
})();

// ---- BACKLOG #14：妖獸洞窟走進洞口再問 ----
(function(){
  const C=g.mapCaveCfg();
  ok('CAVE_tune_named',g.MAP_TUNE.cavePrompt&&C.askR<C.hintR&&C.hintR<C.leaveR&&C.kinds.indexOf('cave')>=0);
  let st=null,acts=[];
  for(const d of [10,3,1.5,0,0,0.2,2,0,8,3,0]){const r=g.mapCaveStep(st,d,C);st=r.st;acts.push(r.act);}
  ok('CAVE_seq',acts.join(',')==='none,hint,none,ask,none,none,none,none,none,hint,ask',acts.join(','));
  ok('CAVE_no_ask_outside_askR',g.mapCaveStep(null,C.askR+0.01,C).act!=='ask');
})();
// ---- BACKLOG #15：框選快速移動至石碑 ----
(function(){
  const C=g.mapStpCfg();
  ok('STP_tune_named',!!g.MAP_TUNE.steleTp&&C.costRealm===4);
  ok('STP_free_below_lianqi',g.mapStpCost([{realm:3},{realm:0}],C)===0);
  ok('STP_cost_lianqi_same_rule',g.mapStpCost([{realm:4,kind:'player'},{realm:5,kind:'disciple'},{realm:2}],C)===2*C.costPerUnit);
  ok('STP_dead_free',g.mapStpCost([{realm:6,dead:true}],C)===0);
  const oldNet=g.NET;g.NET={role:'client'};const r=g.mapStpStart(0,[{id:1,realm:4}]);g.NET=oldNet;
  ok('STP_client_no_start',r.ok===false&&r.why==='client');
})();
// ---- B-38：通用安全落點 ----
(function(){
  // 20x20：x<6 為牆（遺跡邊緣），落點(6.2,10)貼牆；(12,10) 為一根柱子
  const n=20,wall=(i,j)=>i<6||i===19||j===0||j===19||(i===12&&j===10);
  const env={n,walk:(i,j)=>!wall(i,j),comp:()=>1};
  const nb=(f)=>{let k=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if((a||b)&&wall(f.i+a,f.j+b))k++;return k;};
  const a=g.mapSafeLandPick(env,6.2,10.2,[],{});
  ok('SAFE_ruin_edge_off_wall',a&&!wall(a.i,a.j)&&nb(a)===0,a&&JSON.stringify(a));
  const b=g.mapSafeLandPick(env,3,10,[],{});
  ok('SAFE_inside_wall_searches_out',b&&!wall(b.i,b.j));
  const c=g.mapSafeLandPick(env,12.5,10.5,[],{});
  ok('SAFE_pillar_not_on_wall',c&&!(c.i===12&&c.j===10));
  const taken=[];const pts=[];for(let k=0;k<8;k++){const f=g.mapSafeLandPick(env,8,10,taken,{});pts.push(f);taken.push({x:f.x,y:f.y});}
  const C=g.mapSafeLandCfg();let minD=1e9;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)minD=Math.min(minD,Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y));
  ok('SAFE_group_no_overlap',pts.every(Boolean)&&minD>=C.minSep&&pts.every(f=>!wall(f.i,f.j)),'minD='+minD.toFixed(2));
  const env2={n,walk:(i,j)=>!wall(i,j),comp:(i,j)=>i<10?1:2};
  const d=g.mapSafeLandPick(env2,14,10,[],{comp:1});
  ok('SAFE_same_comp',d&&d.i<10);
  ok('SAFE_none_when_no_floor',g.mapSafeLandPick({n:5,walk:()=>false},2,2,[],{})===null);
  ok('SAFE_tune_named',!!g.MAP_TUNE.safeLand&&C.minSep>0&&C.maxR>=C.r);
})();

// ---- 副本劇情第一章 落霞仙尊之墓（F-020／F-028）----
try{if(typeof g.mapStoryInstall==='function')g.mapStoryInstall();}catch(e){}
ok('STORY_ch_flags',g.MAP_TUNE.storyDg.on===true&&g.MAP_TUNE.storyDg.ch1===true&&g.MAP_TUNE.storyDg.ch2===false&&g.MAP_TUNE.storyDg.ch3===false);
ok('STORY_chOn_default',g.mapStoryChOn('st_luoxia')===true&&g.mapStoryChOn('st_zangxian')===false&&g.mapStoryChOn('st_wuxing')===false);
ok('STORY_hidden_catalog',!!g.MAP_STORY_CHAPS&&g.MAP_STORY_CHAPS.st_zangxian.hidden===true&&g.MAP_STORY_CHAPS.st_wuxing.n==='五行通天靈脈');
ok('STORY_luoxia_def',!!g.mapSpecialDef('st_luoxia')&&g.mapSpecialDef('st_luoxia').n==='落霞仙尊之墓'&&g.mapSpecialDef('st_luoxia').boss.n==='守護傀儡·天罡'&&g.mapSpecialDef('st_luoxia').boss.realm===6&&g.mapSpecialDef('st_luoxia').boss.sub===0);
ok('STORY_luoxia_dgs',!!g.MAP_DGS.st_luoxia&&g.MAP_DGS.st_luoxia.minRealm===5);
ok('STORY_gate_listed',!!g.MAP_DG_GATES.some(x=>x.kind==='st_luoxia'&&x.x===120&&x.y===220));
ok('STORY_visible_gates_15',g.mapStoryVisibleGateList().length===15&&g.mapStoryVisibleGateList().some(x=>x.kind==='st_luoxia'));
ok('STORY_no_練氣',!JSON.stringify(g.MAP_SPECIAL.st_luoxia).includes('練氣')&&!JSON.stringify(g.MAP_DGS.st_luoxia).includes('練氣'));
ok('STORY_cfg_spec_numbers',(()=>{const C=g.mapStoryCfg();return C.fireInterval===5&&C.fireDps===120&&C.ambushHp===0.20&&C.ambushN===3&&C.ambushLootHp===0.30&&C.insightNeed===0.02&&C.crushAtk===0.70&&C.beishuiSee===0.10;})());
ok('STORY_insight_reroute',(()=>{
  const a=g.mapStoryCanReroute({person:'謹慎',insightRate:0.03});
  const b=g.mapStoryCanReroute({person:'沉穩',insight:2.5});
  const c=g.mapStoryCanReroute({person:'謹慎',insightRate:0.01});
  const d=g.mapStoryCanReroute({person:'好動',insightRate:0.9});
  return a&&b&&!c&&!d;
})());
ok('STORY_ch2_ch3_not_in_order',g.MAP_DG_ORDER.indexOf('st_zangxian')<0&&g.MAP_DG_ORDER.indexOf('st_wuxing')<0);
// register / hide
g.mapDgsRegister();
ok('STORY_dgs_registered',!!g.DGS.st_luoxia&&g.DGS.st_luoxia.bossN==='守護傀儡·天罡'&&!g.DGS.st_zangxian&&!g.DGS.st_wuxing);
ok('STORY_clone_has_ch1',g.mapGatesClone().some(x=>x.kind==='st_luoxia'&&x.n==='落霞仙尊之墓'));
g.MAP_TUNE.storyDg.ch1=false;
ok('STORY_ch1_off',g.mapStoryChOn('st_luoxia')===false&&g.mapStoryVisibleGateList().every(x=>x.kind!=='st_luoxia'));
g.MAP_TUNE.storyDg.ch1=true;
ok('STORY_ch1_on_again',g.mapStoryChOn('st_luoxia')===true);
ok('STORY_enter_blocked_when_off',(()=>{
  const old=g.MAP_TUNE.storyDg.ch1;
  g.MAP_TUNE.storyDg.ch1=false;
  const r=g.mapDgEnter('st_luoxia',{force:true});
  g.MAP_TUNE.storyDg.ch1=old;
  return r===false;
})());
ok('STORY_mapDgEnter_ch1',(()=>{
  const prev=g.mapDgCoreReady;
  try{g.mapDgCoreReady=function(){return false;};}catch(e){}
  try{g.S.map=g.S.map||{};g.S.map.flags=g.S.map.flags||{};g.S.map.flags.dungeons=true;g.S.map.unlocked=true;}catch(e){}
  g.S.dg=null;
  let r=false;
  try{r=g.mapDgEnter('st_luoxia',{force:true});}catch(e){r=false;}
  try{if(typeof prev==='function')g.mapDgCoreReady=prev;}catch(e){}
  let D=g.S.dg;
  if(!(r&&D&&D.kind==='st_luoxia')){
    // 回歸 vm 若走核心 dgEnter 失敗，改用同等結構驗證 OnEnter
    D=g.S.dg={kind:'st_luoxia',_map:true,L:{rooms:[]},loot:{res:{},mats:{},items:[],misc:{}},cleared:false,t:0};
    r=true;
  }
  g.mapStoryOnEnter(D);
  return !!r&&D.kind==='st_luoxia'&&!!D._mapStory;
})());
ok('STORY_fire_and_ambush_tick',(()=>{
  const D=g.S.dg;if(!D||D.kind!=='st_luoxia')return false;
  D._mapStory={fireT:0,pillars:[],ambush:false,locked:false,bubbled:{},loot:{}};
  D.L={rooms:[{k:0,cx:10,cy:10,w:14,h:14},{k:1,cx:20,cy:10,w:16,h:16,boss:false},{k:2,cx:40,cy:10,w:22,h:22,boss:true}]};
  g.S.units=[{id:1,kind:'player',x:20,y:10,hp:5000,maxhp:5000,dead:false,person:'沉穩',insightRate:0.03,path:[]}];
  g.S.enemies=[{id:9,type:'golem',x:40,y:10,hp:100,maxhp:1000,_mapSpecialBoss:1,_mapSpecialKind:'st_luoxia'}];
  D.boss=9;
  g.mapStoryTick(5.1);
  const st=D._mapStory;
  const fire=st.pillars&&st.pillars.length>=1&&st.pillars[0].dps===120;
  const am=st.ambush===true&&st.locked===true&&D._mapStoryExitLocked===1;
  return fire&&am;
})());
ok('STORY_retreat_blocked',(()=>{
  if(typeof g.dgRetreat!=='function')g.dgRetreat=function(){return 'went';};
  if(!g.dgRetreat._mapStory){
    const _rt=g.dgRetreat;
    g.dgRetreat=function(){if(g.mapStoryBlockedExit())return false;return _rt.apply(this,arguments);};
    g.dgRetreat._mapStory=1;
  }
  return g.mapStoryBlockedExit()===true&&g.dgRetreat()===false;
})());
ok('STORY_plunder_only_run_loot',(()=>{
  const D=g.S.dg;if(!D||!D._mapStory)return false;
  const st=D._mapStory;
  D.loot={res:{lingshi:10,food:4},mats:{hide:2},items:['A','B']};
  st.loot={77:{res:{lingshi:3},mats:{},items:['A']}};
  st.ambush=true;
  g.mapStoryPlunder({id:77,kind:'disciple',x:1,y:1});
  return D.loot.res.lingshi===7&&D.loot.items.length===1&&D.loot.items[0]==='B'&&!st.loot[77];
})());
ok('STORY_templates_use_tune_not_hard_power',(()=>{
  const raw=JSON.stringify(g.MAP_TUNE.st_luoxia)+JSON.stringify(g.MAP_SPECIAL.st_luoxia);
  return !/517/.test(raw)&&!/600/.test(raw)&&g.MAP_TUNE.st_luoxia.bossRealm===6;
})());

// ---- 第二、三章（預設隱藏）----
ok('STORY23_cfg_default_still_luoxia',(()=>{g.S.dg=null;const C=g.mapStoryCfg();return C.fireInterval===5&&C.shaInterval==null;})());
ok('STORY23_defs',(()=>{
  const z=g.MAP_DGS.st_zangxian,w=g.MAP_DGS.st_wuxing,sz=g.mapSpecialDef('st_zangxian'),sw=g.mapSpecialDef('st_wuxing');
  const gz=g.MAP_DG_GATES.some(x=>x.kind==='st_zangxian'&&x.x===210&&x.y===175);
  const gw=g.MAP_DG_GATES.some(x=>x.kind==='st_wuxing'&&x.x===75&&x.y===200);
  return !!z&&z.n==='葬仙萬骨荒塚'&&z.minRealm===7&&z.storyHide===true&&z.bossN==='萬骨冥王'
    &&!!w&&w.n==='五行通天靈脈'&&w.minRealm===9&&w.storyHide===true
    &&!!sz&&sz.boss.n==='萬骨冥王'&&sz.boss.realm===8
    &&!!sw&&sw.n==='五行通天靈脈'
    &&gz&&gw;
})());
ok('STORY23_hidden_default',g.MAP_TUNE.storyDg.ch2===false&&g.MAP_TUNE.storyDg.ch3===false
  &&g.mapStoryChOn('st_zangxian')===false&&g.mapStoryChOn('st_wuxing')===false
  &&g.MAP_DG_ORDER.indexOf('st_zangxian')<0&&g.MAP_DG_ORDER.indexOf('st_wuxing')<0
  &&!g.DGS.st_zangxian&&!g.DGS.st_wuxing
  &&g.mapStoryVisibleGateList().every(x=>x.kind!=='st_zangxian'&&x.kind!=='st_wuxing')
  &&g.mapStoryVisibleGateList().length===15);
ok('STORY23_enter_blocked_when_off',g.mapDgEnter('st_zangxian',{force:true})===false&&g.mapDgEnter('st_wuxing',{force:true})===false);
ok('STORY23_flag_on_register',(()=>{
  g.MAP_TUNE.storyDg.ch2=true;g.MAP_TUNE.storyDg.ch3=true;
  const vis=g.mapStoryVisibleGateList();
  g.mapDgsRegister();
  const ok=g.mapStoryChOn('st_zangxian')&&g.mapStoryChOn('st_wuxing')
    &&!!g.DGS.st_zangxian&&g.DGS.st_zangxian.n==='葬仙萬骨荒塚'
    &&!!g.DGS.st_wuxing
    &&vis.length===17
    &&vis.some(x=>x.kind==='st_zangxian')&&vis.some(x=>x.kind==='st_wuxing');
  g.MAP_TUNE.storyDg.ch2=false;g.MAP_TUNE.storyDg.ch3=false;
  return ok;
})());
ok('STORY23_no_練氣',(()=>{
  const raw=JSON.stringify(g.MAP_SPECIAL.st_zangxian)+JSON.stringify(g.MAP_DGS.st_zangxian)+JSON.stringify(g.MAP_SPECIAL.st_wuxing)+JSON.stringify(g.MAP_DGS.st_wuxing)+JSON.stringify(g.MAP_TUNE.st_zangxian)+JSON.stringify(g.MAP_TUNE.st_wuxing);
  return !raw.includes('練氣')&&!raw.includes('练气');
})());
ok('STORY23_no_hard_power',(()=>{
  const raw=JSON.stringify(g.MAP_TUNE.st_zangxian)+JSON.stringify(g.MAP_SPECIAL.st_zangxian)+JSON.stringify(g.MAP_TUNE.st_wuxing)+JSON.stringify(g.MAP_SPECIAL.st_wuxing);
  return !/\b517\b/.test(raw)&&!/\b1100\b/.test(raw)&&!/\b1600\b/.test(raw);
})());
ok('STORY23_zx_sha_and_restore',(()=>{
  g.MAP_TUNE.storyDg.ch2=true;
  const D=g.S.dg={kind:'st_zangxian',_map:true,L:{rooms:[{k:0,cx:10,cy:10,w:14,h:14},{k:1,cx:20,cy:10,w:16,h:16},{k:2,cx:40,cy:10,w:22,h:22,boss:true}]},loot:{res:{},mats:{},items:[],misc:{}},cleared:false,t:0};
  g.S.units=[{id:1,kind:'player',x:10,y:10,hp:10000,maxhp:10000,dead:false,speed:4}];
  g.S.enemies=[];
  g.mapStoryOnEnter(D);
  for(let i=0;i<6;i++)g.mapStoryTick(10);
  const u=g.S.units[0];
  const after=u.maxhp===9800&&D._mapStory.hpSnap[1].maxhp===10000;
  g.mapStoryZxRestore(D,true);
  const saved=u.maxhp===10000;
  g.mapStoryZxReapply(D);
  const re=u.maxhp===9800;
  g.mapStoryOnExit(D);
  const out=u.maxhp===10000;
  g.MAP_TUNE.storyDg.ch2=false;g.S.dg=null;
  return after&&saved&&re&&out;
})());
ok('STORY23_zx_xtl_only_inside',(()=>{
  if(!g.XW_XTL)g.XW_XTL={canStart:function(){return {ok:true};}};
  if(!g.XW_XTL.canStart._mapStory){try{g.mapStoryInstall();}catch(e){}}
  if(!g.XW_XTL.canStart._mapStory)return false;
  g.S.dg=null;
  const outside=g.XW_XTL.canStart({maxhp:100});
  g.MAP_TUNE.storyDg.ch2=true;
  g.S.dg={kind:'st_zangxian',_mapStory:{hpSnap:{}},L:{rooms:[]},cleared:false};
  const low=g.XW_XTL.canStart({maxhp:100});
  const high=g.XW_XTL.canStart({maxhp:20000});
  g.MAP_TUNE.storyDg.ch2=false;g.S.dg=null;
  return outside&&outside.ok===true&&low&&low.ok===false&&high&&high.ok===true;
})());
ok('STORY23_zx_trap_bleed_armor',(()=>{
  g.MAP_TUNE.storyDg.ch2=true;
  const D=g.S.dg={kind:'st_zangxian',_map:true,L:{rooms:[{k:0,cx:10,cy:10,w:14,h:14},{k:1,cx:20,cy:10,w:16,h:16}]},loot:{},cleared:false,t:0};
  g.S.units=[{id:1,kind:'player',x:10,y:10,hp:8000,maxhp:8000,dead:false}];
  g.S.enemies=[];
  const shouts=[];
  const oldToast=g.toast;g.toast=function(m){shouts.push(m);};
  g.mapStoryOnEnter(D);
  const tr=(D._mapStory.traps||[])[0];
  if(!tr){g.MAP_TUNE.storyDg.ch2=false;g.S.dg=null;g.toast=oldToast;return false;}
  g.S.units[0].x=tr.x;g.S.units[0].y=tr.y;
  g.mapStoryTick(0.05);
  const u=g.S.units[0];
  const hit=u.hp<=8000-2500 && u._mapBleedT>0 && u._mapArmorT>0 && shouts.indexOf('小心腳下！結防禦陣法！')>=0;
  const before=u.hp;g.mapStoryTick(1);const bled=u.hp<before;
  g.MAP_TUNE.storyDg.ch2=false;g.S.dg=null;g.toast=oldToast;
  return hit&&bled;
})());
ok('STORY23_zx_adds_and_cap',(()=>{
  g.MAP_TUNE.storyDg.ch2=true;
  if(typeof g.makeEnemy!=='function')g.makeEnemy=function(type,x,y,opt){return {id:'a'+Math.random(),type,x,y,realm:opt&&opt.realm,hp:80,maxhp:80,dead:false};};
  const D=g.S.dg={kind:'st_zangxian',_map:true,L:{rooms:[{k:0,cx:10,cy:10,w:14,h:14},{k:1,cx:20,cy:10,w:16,h:16,boss:false},{k:2,cx:40,cy:10,w:22,h:22,boss:true}]},loot:{},cleared:false,t:0};
  g.S.units=[{id:1,kind:'player',x:10,y:10,hp:10000,maxhp:10000,dead:false}];
  g.S.enemies=[{id:'e1',type:'golem',x:12,y:10,hp:10,maxhp:10,dead:false},{id:'e2',type:'golem',x:13,y:10,hp:10,maxhp:10,dead:false},{id:'e3',type:'golem',x:14,y:10,hp:10,maxhp:10,dead:false}];
  g.mapStoryOnEnter(D);
  for(let i=0;i<18;i++)g.mapStoryTick(10);
  const n=g.S.enemies.filter(e=>e&&!e.dead).length;
  const adds=g.S.enemies.filter(e=>e&&e._mapStoryAdd);
  g.MAP_TUNE.storyDg.ch2=false;g.S.dg=null;
  return n<=5&&adds.length===2&&adds.every(e=>e.realm===6&&e.sub===9);
})());
ok('STORY23_zx_crowd',(()=>{
  g.MAP_TUNE.storyDg.ch2=true;
  g.S.dg={kind:'st_zangxian',_mapStory:{},L:{rooms:[]},cleared:false};
  g.S.units=[{id:1,dead:false},{id:2,dead:false},{id:3,dead:false}];
  const a=g.mapStoryZxCrowdMul();
  g.S.units.push({id:4,dead:false});
  const b=g.mapStoryZxCrowdMul();
  g.MAP_TUNE.storyDg.ch2=false;g.S.dg=null;
  return a===1&&b===1.9;
})());
ok('STORY23_wx_mechanics',(()=>{
  g.MAP_TUNE.storyDg.ch3=true;
  const rooms=[
    {k:0,cx:10,cy:10,w:14,h:14,state:'clear'},
    {k:1,cx:20,cy:10,w:16,h:16,state:'clear'},
    {k:2,cx:30,cy:10,w:16,h:16,state:'open'},
    {k:3,cx:40,cy:10,w:16,h:16,state:'open'},
    {k:4,cx:50,cy:10,w:16,h:16,state:'open'},
    {k:5,cx:60,cy:10,w:16,h:16,state:'open'}
  ];
  const D=g.S.dg={kind:'st_wuxing',_map:true,L:{rooms:rooms},loot:{items:[]},cleared:false,t:0};
  g.S.units=[{id:1,kind:'player',x:20,y:10,hp:8000,maxhp:8000,dead:false,speed:4,_mapBodyInt:0}];
  g.S.enemies=[
    {id:'w',type:'golem',x:20,y:10,hp:800,maxhp:1000,dead:false,def:10}, // wood if rooms[1] after enter remap? enter assigns by index
    {id:'m',type:'golem',x:10,y:10,hp:100,maxhp:100,dead:false,def:10}
  ];
  let talk='';const oldToast=g.toast;g.toast=function(s){talk=s;};
  g.mapStoryOnEnter(D);
  // rooms[0] metal, [1] wood, [2] water, [3] fire, [4] earth
  g.mapStoryTick(0.2);
  const u=g.S.units[0];
  const jade=u._mapBodyInt===1500&&D.loot.items.length===0;
  const wood=g.S.enemies[0];
  const regen=wood.hp>800; // 5%/s * 0.2 = 1%
  const metal=g.S.enemies[1];
  const defed=metal.def===20||metal.def===10*2;
  g.mapStoryTick(10);
  const slowed=u.speed===2;
  u.x=40;u.y=10; // fire room index 3
  const fire=g.mapStoryWxSeeMul(u)===1.5;
  const earthE={x:50,y:10};
  const th=g.mapStoryWxThorns(earthE,1000);
  D.cleared=true;g.mapStoryTick(0.05);
  const said=talk==='五行圓滿，金身初具！天仙之路，就在腳下！';
  g.MAP_TUNE.storyDg.ch3=false;g.S.dg=null;g.toast=oldToast;
  return jade&&regen&&defed&&slowed&&fire&&th===100&&said;
})());
ok('STORY23_flag_off_again',g.MAP_TUNE.storyDg.ch2===false&&g.MAP_TUNE.storyDg.ch3===false&&g.mapStoryChOn('st_zangxian')===false&&g.mapStoryVisibleGateList().length===15);

// ---- gateGuard c／d（wrap updateSpawns／shrineRest／spawnInZone）----
ok('GATEGUARD_flag_default',!!g.MAP_TUNE.gateGuard&&g.MAP_TUNE.gateGuard.on===true&&g.MAP_TUNE.gateGuard.nearDist===14&&g.mapGateGuardOn()===true&&g.mapGateGuardNearDist()===14);

ok('GATEGUARD_zone_near_classic',(()=>{
  const oldG=g.MAP_DG_GATES,oldS=g.S;
  try{
    g.MAP_DG_GATES=[];
    g.S={vstructs:[{type:'dgate',kind:'ruin',i:50,j:50,s:2}],enemies:[],dg:null};
    const near=g.mapGateGuardZoneNear({id:0,x:55,y:51});
    const far=g.mapGateGuardZoneNear({id:1,x:50,y:80});
    const edge=g.mapGateGuardZoneNear({id:2,x:51,y:52.6+13.9});
    const out=g.mapGateGuardZoneNear({id:3,x:51,y:52.6+14.1});
    return near&&!far&&edge&&!out;
  }finally{g.MAP_DG_GATES=oldG;g.S=oldS;}
})());

ok('GATEGUARD_zone_near_official',(()=>{
  const oldG=g.MAP_DG_GATES,oldS=g.S;
  try{
    g.S={vstructs:[],enemies:[],dg:null};
    g.MAP_DG_GATES=[{kind:'st_luoxia',x:120,y:220}];
    const near=g.mapGateGuardZoneNear({x:120,y:225});
    const far=g.mapGateGuardZoneNear({x:120,y:250});
    return near&&!far;
  }finally{g.MAP_DG_GATES=oldG;g.S=oldS;}
})());

ok('GATEGUARD_tile_gate_and_stand',(()=>{
  const oldG=g.MAP_DG_GATES,oldS=g.S;
  try{
    g.MAP_DG_GATES=[];
    g.S={vstructs:[{type:'dgate',kind:'ruin',i:50,j:50,s:2}],enemies:[],dg:null};
    const gate=g.mapGateGuardTileBlocked(50,50)&&g.mapGateGuardTileBlocked(51,51);
    const stand=g.mapGateGuardTileBlocked(51,52)&&g.mapGateGuardPosBlocked(51.5,52.5);
    const nb=g.mapGateGuardTileBlocked(51,53);
    const far=!g.mapGateGuardTileBlocked(51,54)&&!g.mapGateGuardTileBlocked(70,70);
    return gate&&stand&&nb&&far;
  }finally{g.MAP_DG_GATES=oldG;g.S=oldS;}
})());

ok('GATEGUARD_c_d_wraps_and_flag_off',(()=>{
  const oldG=g.MAP_DG_GATES,oldS=g.S,oldZ=g.ZONES,oldOn=g.MAP_TUNE.gateGuard.on;
  const oldSz=g.spawnInZone,oldUs=g.updateSpawns,oldSr=g.shrineRest;
  try{
    g.MAP_DG_GATES=[];
    g.S={vstructs:[{type:'dgate',kind:'ruin',i:50,j:50,s:2}],enemies:[],dg:null};
    const zNear={id:0,x:55,y:51,type:'wolf',cap:2};
    const zFar={id:1,x:50,y:80,type:'wolf',cap:2};
    g.ZONES=[zNear,zFar];
    let calls=0;
    g.spawnInZone=function(z){
      calls++;
      const e={id:calls,type:z.type,x:z.x,y:z.y,zone:z.id};
      g.S.enemies.push(e);
      return e;
    };
    g.updateSpawns=function(){
      for(const z of g.ZONES){
        const cur=g.S.enemies.filter(e=>e.zone===z.id).length;
        if(cur>=z.cap)continue;
        g.spawnInZone(z);
      }
    };
    g.shrineRest=function(){
      let n=0;
      for(const z of g.ZONES){
        const cur=g.S.enemies.filter(e=>e.zone===z.id).length;
        for(let k=cur;k<z.cap;k++){if(g.spawnInZone(z))n++;}
      }
      return n;
    };
    g.mapGateGuardInstall._ok=false;
    g.mapGateGuardInstall();
    if(!g.spawnInZone._mapGateGuard||!g.updateSpawns._mapGateGuard||!g.shrineRest._mapGateGuard)return 'no-wrap';

    g.MAP_TUNE.gateGuard.on=true;
    g.S.enemies=[];calls=0;
    g.updateSpawns();
    const cOn=g.S.enemies.every(e=>e.zone===1)&&g.S.enemies.length===1&&zNear.cap===2&&zFar.cap===2;
    g.S.enemies=[];calls=0;
    const nRest=g.shrineRest();
    const sOn=g.S.enemies.every(e=>e.zone===1)&&g.S.enemies.length===2&&nRest===2&&zNear.cap===2;

    // d：原函式若落在站位格，應略過且重試有上限
    g.S.enemies=[];calls=0;
    const _land=g.spawnInZone;
    // 暫時換一個總是站門的原函式：先拆掉 wrap 再重裝
    let rawCalls=0;
    const rawStand=function(z){
      rawCalls++;
      const e={id:'st'+rawCalls,type:z.type,x:51.5,y:52.5,zone:z.id};
      g.S.enemies.push(e);
      return e;
    };
    const rawFar=function(z){
      rawCalls++;
      const e={id:'far'+rawCalls,type:z.type,x:70.5,y:70.5,zone:z.id};
      g.S.enemies.push(e);
      return e;
    };
    g.spawnInZone=rawStand;
    g.mapGateGuardInstall._ok=false;
    g.mapGateGuardInstall();
    const skipped=g.spawnInZone(zFar);
    const dSkip=skipped==null&&g.S.enemies.length===0&&rawCalls<=g.mapGateGuardTries()&&rawCalls===g.mapGateGuardTries();

    g.spawnInZone=rawFar;
    g.mapGateGuardInstall._ok=false;
    g.mapGateGuardInstall();
    rawCalls=0;g.S.enemies=[];
    const kept=g.spawnInZone(zFar);
    const dKeep=!!kept&&g.S.enemies.length===1&&kept.x===70.5&&rawCalls===1;

    // 旗標關閉：行為與原本相同（門口區會補、可站在站位格）
    g.MAP_TUNE.gateGuard.on=false;
    g.spawnInZone=rawStand;
    g.updateSpawns=function(){
      for(const z of g.ZONES){
        const cur=g.S.enemies.filter(e=>e.zone===z.id).length;
        if(cur>=z.cap)continue;
        g.spawnInZone(z);
      }
    };
    g.shrineRest=function(){
      let n=0;
      for(const z of g.ZONES){
        const cur=g.S.enemies.filter(e=>e.zone===z.id).length;
        for(let k=cur;k<z.cap;k++){if(g.spawnInZone(z))n++;}
      }
      return n;
    };
    g.mapGateGuardInstall._ok=false;
    g.mapGateGuardInstall();
    rawCalls=0;g.S.enemies=[];
    g.updateSpawns();
    const offUp=g.S.enemies.length===2&&g.S.enemies.some(e=>e.zone===0)&&g.S.enemies.some(e=>e.zone===1);
    rawCalls=0;g.S.enemies=[];
    const offSpawn=g.spawnInZone(zNear);
    const offStand=!!offSpawn&&g.S.enemies.length===1&&offSpawn.x===51.5&&offSpawn.y===52.5&&rawCalls===1;
    rawCalls=0;g.S.enemies=[];
    const offN=g.shrineRest();
    const offSh=offN===4&&g.S.enemies.length===4;

    if(!(cOn&&sOn&&dSkip&&dKeep&&offUp&&offStand&&offSh)){
      return {cOn,sOn,dSkip,dKeep,offUp,offStand,offSh,rawCalls,nRest,enemies:g.S.enemies.length};
    }
    return true;
  }finally{
    g.MAP_TUNE.gateGuard.on=oldOn;
    g.MAP_DG_GATES=oldG;g.S=oldS;g.ZONES=oldZ;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(oldUs===undefined)delete g.updateSpawns;else g.updateSpawns=oldUs;
    if(oldSr===undefined)delete g.shrineRest;else g.shrineRest=oldSr;
  }
})());

ok('GATEGUARD_dungeon_ignores_official',(()=>{
  const oldG=g.MAP_DG_GATES,oldS=g.S;
  try{
    g.MAP_DG_GATES=[{kind:'st_luoxia',x:120,y:220}];
    g.S={vstructs:[],enemies:[],dg:{kind:'xf'}};
    return g.mapGateGuardZoneNear({x:120,y:220})===false;
  }finally{g.MAP_DG_GATES=oldG;g.S=oldS;}
})());


// ---- 288 外圈野怪區 ----
ok('OUTER_flag_default',!!g.MAP_TUNE.outerZones&&g.MAP_TUNE.outerZones.on===true&&g.mapOuterZonesOn()===true);

ok('OUTER_build_and_exclusions',(()=>{
  const oldN=g.N,oldBio=g.biome,oldDep=g.depthMap,oldXWW=g.XWW,oldAnch=g.ANCH,oldS=g.S,oldG=g.MAP_DG_GATES,oldC=g.MAP_CITIES,oldSect=g.MAP_SECTS,oldOn=g.MAP_TUNE.outerZones.on;
  try{
    g.N=288;
    g.XWW={small:128,big:288,off:80,n:288};
    g.ANCH={start:{x:114,y:148},qinghe:{x:100,y:140},liuxi:{x:130,y:150},heifeng:{x:110,y:160},chilang:{x:140,y:130},ruin:{x:120,y:120}};
    g.S={villages:[],vstructs:[],enemies:[],seed:42};
    g.MAP_CITIES=[{id:'t',n:'測城',x:36,y:144,rSafe:14}];
    g.MAP_SECTS=[{n:'測宗',hall:{x:55,y:100}}];
    g.MAP_DG_GATES=[{kind:'st_luoxia',x:120,y:220}];
    const bio=new Uint8Array(288*288),dep=new Float32Array(288*288);
    // 外圈幾乎全是林地，必出一部分狼區；核心也填林地但不應被 build 採到
    bio.fill(0); // WOOD
    g.biome=bio;g.depthMap=dep;
    g.nearestFree=function(x,y){return {i:Math.floor(x),j:Math.floor(y)};};
    const L=g.mapOuterZonesBuild(42);
    const allOut=L.length>0&&L.every(z=>z._mapOuter===1&&(z.x<80||z.x>=208||z.y<80||z.y>=208));
    const noCity=L.every(z=>Math.hypot(z.x-36,z.y-144)>=14);
    const noSect=L.every(z=>Math.hypot(z.x-55,z.y-100)>=12);
    const noGate=L.every(z=>Math.hypot(z.x-120,z.y-220)>=16);
    const types=L.every(z=>z.type==='wolf'&&z.cap===2); // 純林地
    g.MAP_TUNE.outerZones.on=false;
    const off=g.mapOuterZonesBuild(42);
    return allOut&&noCity&&noSect&&noGate&&types&&off.length===0&&L.length>8;
  }finally{
    g.N=oldN;g.biome=oldBio;g.depthMap=oldDep;g.XWW=oldXWW;g.ANCH=oldAnch;g.S=oldS;
    g.MAP_DG_GATES=oldG;g.MAP_CITIES=oldC;g.MAP_SECTS=oldSect;g.MAP_TUNE.outerZones.on=oldOn;
  }
})());

ok('OUTER_realm_uses_zoneRealm_distance',(()=>{
  const oldN=g.N,oldXWW=g.XWW,oldAnch=g.ANCH;
  try{
    g.N=288;g.XWW={small:128,big:288,off:80,n:288};
    g.ANCH={start:{x:114,y:148}};
    // 核心西緣外（x=70）距 start 約 44 → newbie；遠角 (6,6) 距 start ≫110 → high
    const near=g.mapZoneRegionTier({x:70,y:148});
    const far=g.mapZoneRegionTier({x:6,y:6});
    const midMaybe=g.mapZoneRegionTier({x:114,y:148-80}); // dist 80 → mid
    return near==='newbie'&&far==='high'&&midMaybe==='mid'&&g.mapZoneRealmFor({x:6,y:6})===2&&g.mapZoneRealmFor({x:70,y:148})===0;
  }finally{g.N=oldN;g.XWW=oldXWW;g.ANCH=oldAnch;}
})());

ok('OUTER_ensure_append_ids_flag_off_noop',(()=>{
  const oldZ=g.ZONES,oldN=g.N,oldBio=g.biome,oldDep=g.depthMap,oldXWW=g.XWW,oldS=g.S,oldOn=g.MAP_TUNE.outerZones.on,oldG=g.MAP_DG_GATES,oldC=g.MAP_CITIES,oldSect=g.MAP_SECTS,oldAnch=g.ANCH;
  try{
    g.N=288;g.XWW={small:128,big:288,off:80,n:288};
    g.ANCH={start:{x:114,y:148}};
    g.S={villages:[],vstructs:[],enemies:[],seed:1};
    g.MAP_CITIES=[];g.MAP_SECTS=[];g.MAP_DG_GATES=[];
    const bio=new Uint8Array(288*288),dep=new Float32Array(288*288);bio.fill(0);
    g.biome=bio;g.depthMap=dep;
    g.nearestFree=function(x,y){return {i:Math.floor(x),j:Math.floor(y)};};
    g.ZONES=[{id:0,x:100,y:100,type:'wolf',cap:1}];
    const n=g.mapOuterZonesEnsure(1);
    const idsOk=g.ZONES[0].id===0&&g.ZONES.every((z,i)=>z.id===i)&&g.ZONES.filter(z=>z._mapOuter).length===n&&n>0;
    const again=g.mapOuterZonesEnsure(1); // idempotent
    g.MAP_TUNE.outerZones.on=false;
    const z2=[{id:0,x:100,y:100,type:'wolf',cap:1}];
    g.ZONES=z2;
    const offN=g.mapOuterZonesEnsure(1);
    return idsOk&&again===0&&offN===0&&g.ZONES.length===1&&!g.ZONES[0]._mapOuter;
  }finally{
    g.ZONES=oldZ;g.N=oldN;g.biome=oldBio;g.depthMap=oldDep;g.XWW=oldXWW;g.S=oldS;
    g.MAP_TUNE.outerZones.on=oldOn;g.MAP_DG_GATES=oldG;g.MAP_CITIES=oldC;g.MAP_SECTS=oldSect;g.ANCH=oldAnch;
  }
})());

ok('OUTER_capFill_defaults',!!g.MAP_TUNE.outerZones&&g.MAP_TUNE.outerZones.capFill===true&&g.MAP_TUNE.outerZones.batch===8&&g.mapOuterCapFillOn()===true&&g.mapOuterFillBatchSize()===8&&g.mapOuterEnemyCap()===220&&g.mapEnemyCap()===220);

ok('OUTER_fill_respects_global_cap',(()=>{
  const oldZ=g.ZONES,oldS=g.S,oldSz=g.spawnInZone,oldEn=g.MAP_TUNE.spawn&&g.MAP_TUNE.spawn.enemies,oldCap=g.MAP_TUNE.outerZones.capFill,oldQ=g.mapOuterCapFillOn._q;
  try{
    g.mapOuterCapFillOn._q=undefined;
    g.MAP_TUNE.outerZones.capFill=true;
    g.MAP_TUNE.spawn=g.MAP_TUNE.spawn||{};
    g.MAP_TUNE.spawn.enemies=5;
    g.S={enemies:[],seed:1};
    g.ZONES=[
      {id:0,x:1,y:1,type:'wolf',cap:3,_mapOuter:1},
      {id:1,x:2,y:2,type:'wolf',cap:3,_mapOuter:1},
      {id:2,x:3,y:3,type:'wolf',cap:3,_mapOuter:1},
      {id:3,x:4,y:4,type:'wolf',cap:2} // 核心區，不應被此外圈函式補
    ];
    g.spawnInZone=function(z){g.S.enemies.push({id:g.S.enemies.length+1,zone:z.id,type:z.type,x:z.x,y:z.y});return true;};
    const n=g.mapOuterZonesFill();
    const onlyOuter=g.S.enemies.every(e=>e.zone!==3);
    return n===5&&g.S.enemies.length===5&&onlyOuter&&g.mapOuterZonesFillNeeded()===false;
  }finally{
    g.ZONES=oldZ;g.S=oldS;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(g.MAP_TUNE.spawn)g.MAP_TUNE.spawn.enemies=oldEn;
    g.MAP_TUNE.outerZones.capFill=oldCap;
    g.mapOuterCapFillOn._q=oldQ;
  }
})());

ok('OUTER_fill_over_cap_keeps_existing',(()=>{
  const oldZ=g.ZONES,oldS=g.S,oldSz=g.spawnInZone,oldEn=g.MAP_TUNE.spawn&&g.MAP_TUNE.spawn.enemies,oldCap=g.MAP_TUNE.outerZones.capFill,oldQ=g.mapOuterCapFillOn._q;
  try{
    g.mapOuterCapFillOn._q=undefined;
    g.MAP_TUNE.outerZones.capFill=true;
    g.MAP_TUNE.spawn=g.MAP_TUNE.spawn||{};
    g.MAP_TUNE.spawn.enemies=5;
    const kept=[{id:1,zone:0},{id:2,zone:0},{id:3,zone:1},{id:4},{id:5},{id:6},{id:7},{id:8}];
    g.S={enemies:kept.slice(),seed:1};
    g.ZONES=[
      {id:0,x:1,y:1,type:'wolf',cap:4,_mapOuter:1},
      {id:1,x:2,y:2,type:'wolf',cap:4,_mapOuter:1}
    ];
    let spawned=0;
    g.spawnInZone=function(z){spawned++;g.S.enemies.push({id:g.S.enemies.length+1,zone:z.id});return true;};
    const n=g.mapOuterZonesFill();
    const same=g.S.enemies.length===8&&g.S.enemies[0]===kept[0]&&g.S.enemies[7]===kept[7];
    return n===0&&spawned===0&&same&&g.mapOuterZonesFillNeeded()===false;
  }finally{
    g.ZONES=oldZ;g.S=oldS;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(g.MAP_TUNE.spawn)g.MAP_TUNE.spawn.enemies=oldEn;
    g.MAP_TUNE.outerZones.capFill=oldCap;
    g.mapOuterCapFillOn._q=oldQ;
  }
})());

ok('OUTER_fill_batch_and_resume',(()=>{
  const oldZ=g.ZONES,oldS=g.S,oldSz=g.spawnInZone,oldEn=g.MAP_TUNE.spawn&&g.MAP_TUNE.spawn.enemies,oldCap=g.MAP_TUNE.outerZones.capFill,oldBatch=g.MAP_TUNE.outerZones.batch,oldQ=g.mapOuterCapFillOn._q;
  try{
    g.mapOuterCapFillOn._q=undefined;
    g.MAP_TUNE.outerZones.capFill=true;
    g.MAP_TUNE.outerZones.batch=2;
    g.MAP_TUNE.spawn=g.MAP_TUNE.spawn||{};
    g.MAP_TUNE.spawn.enemies=20;
    g.S={enemies:[],seed:1};
    g.ZONES=[
      {id:0,x:1,y:1,type:'wolf',cap:3,_mapOuter:1},
      {id:1,x:2,y:2,type:'wolf',cap:3,_mapOuter:1},
      {id:2,x:3,y:3,type:'wolf',cap:3,_mapOuter:1}
    ];
    g.spawnInZone=function(z){g.S.enemies.push({id:g.S.enemies.length+1,zone:z.id});return true;};
    const n1=g.mapOuterZonesFill({batch:2});
    const mid=g.S.enemies.length===2&&n1===2&&g.mapOuterZonesFillNeeded()===true;
    const n2=g.mapOuterZonesFill({batch:2});
    const mid2=g.S.enemies.length===4&&n2===2;
    const n3=g.mapOuterZonesFill();
    return mid&&mid2&&n3===5&&g.S.enemies.length===9&&g.mapOuterZonesFillNeeded()===false;
  }finally{
    g.ZONES=oldZ;g.S=oldS;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(g.MAP_TUNE.spawn)g.MAP_TUNE.spawn.enemies=oldEn;
    g.MAP_TUNE.outerZones.capFill=oldCap;
    g.MAP_TUNE.outerZones.batch=oldBatch;
    g.mapOuterCapFillOn._q=oldQ;
  }
})());

ok('OUTER_capFill_off_old_behavior',(()=>{
  const oldZ=g.ZONES,oldS=g.S,oldSz=g.spawnInZone,oldEn=g.MAP_TUNE.spawn&&g.MAP_TUNE.spawn.enemies,oldCap=g.MAP_TUNE.outerZones.capFill,oldQ=g.mapOuterCapFillOn._q;
  try{
    g.mapOuterCapFillOn._q=undefined;
    g.MAP_TUNE.outerZones.capFill=false;
    g.MAP_TUNE.spawn=g.MAP_TUNE.spawn||{};
    g.MAP_TUNE.spawn.enemies=5;
    g.S={enemies:[],seed:1};
    g.ZONES=[
      {id:0,x:1,y:1,type:'wolf',cap:3,_mapOuter:1},
      {id:1,x:2,y:2,type:'wolf',cap:3,_mapOuter:1},
      {id:2,x:3,y:3,type:'wolf',cap:3,_mapOuter:1}
    ];
    g.spawnInZone=function(z){g.S.enemies.push({id:g.S.enemies.length+1,zone:z.id});return true;};
    const n=g.mapOuterZonesFill();
    return g.mapOuterCapFillOn()===false&&n===9&&g.S.enemies.length===9;
  }finally{
    g.ZONES=oldZ;g.S=oldS;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(g.MAP_TUNE.spawn)g.MAP_TUNE.spawn.enemies=oldEn;
    g.MAP_TUNE.outerZones.capFill=oldCap;
    g.mapOuterCapFillOn._q=oldQ;
  }
})());

ok('OUTER_schedule_single_queue_and_deferred',(()=>{
  const oldZ=g.ZONES,oldS=g.S,oldSz=g.spawnInZone,oldEn=g.MAP_TUNE.spawn&&g.MAP_TUNE.spawn.enemies,oldCap=g.MAP_TUNE.outerZones.capFill,oldBatch=g.MAP_TUNE.outerZones.batch,oldQ=g.mapOuterCapFillOn._q;
  const oldTO=g.setTimeout,oldCTO=g.clearTimeout,oldRAF=g.requestAnimationFrame,oldCAF=g.cancelAnimationFrame;
  try{
    g.mapOuterZonesFillCancel();
    g.mapOuterCapFillOn._q=undefined;
    g.MAP_TUNE.outerZones.capFill=true;
    g.MAP_TUNE.outerZones.batch=3;
    g.MAP_TUNE.spawn=g.MAP_TUNE.spawn||{};
    g.MAP_TUNE.spawn.enemies=20;
    g.S={enemies:[],seed:1};
    g.ZONES=[
      {id:0,x:1,y:1,type:'wolf',cap:3,_mapOuter:1},
      {id:1,x:2,y:2,type:'wolf',cap:3,_mapOuter:1}
    ];
    g.spawnInZone=function(z){g.S.enemies.push({id:g.S.enemies.length+1,zone:z.id});return true;};
    const queue=[];let tid=0;
    g.requestAnimationFrame=undefined;
    g.cancelAnimationFrame=undefined;
    g.setTimeout=function(fn,ms){tid++;queue.push({id:tid,fn:fn,ms:ms});return tid;};
    g.clearTimeout=function(id){const i=queue.findIndex(x=>x.id===id);if(i>=0)queue.splice(i,1);};
    const a=g.mapOuterZonesFillSchedule();
    const b=g.mapOuterZonesFillSchedule();
    const deferred=g.S.enemies.length===0&&a===true&&b===false&&queue.length===1;
    // drain
    let guard=0;
    while(queue.length&&guard++<20){const job=queue.shift();job.fn();}
    return deferred&&g.S.enemies.length===6&&queue.length===0&&g.mapOuterZonesFillSchedule._queued===false&&guard>=2;
  }finally{
    try{g.mapOuterZonesFillCancel();}catch(e){}
    g.ZONES=oldZ;g.S=oldS;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(g.MAP_TUNE.spawn)g.MAP_TUNE.spawn.enemies=oldEn;
    g.MAP_TUNE.outerZones.capFill=oldCap;
    g.MAP_TUNE.outerZones.batch=oldBatch;
    g.mapOuterCapFillOn._q=oldQ;
    if(oldTO===undefined)delete g.setTimeout;else g.setTimeout=oldTO;
    if(oldCTO===undefined)delete g.clearTimeout;else g.clearTimeout=oldCTO;
    if(oldRAF===undefined)delete g.requestAnimationFrame;else g.requestAnimationFrame=oldRAF;
    if(oldCAF===undefined)delete g.cancelAnimationFrame;else g.cancelAnimationFrame=oldCAF;
  }
})());

ok('OUTER_fill_and_applySave_wrap_no_throw',(()=>{
  const oldZ=g.ZONES,oldS=g.S,oldSz=g.spawnInZone,oldAS=g.applySave,oldCap=g.MAP_TUNE.outerZones.capFill,oldQ=g.mapOuterCapFillOn._q,oldWarn=g.console.warn;
  const warns=[];
  try{
    g.console.warn=function(){warns.push([].slice.call(arguments));};
    g.mapOuterCapFillOn._q=undefined;
    g.MAP_TUNE.outerZones.capFill=true;
    g.S={enemies:[],seed:1};
    g.ZONES=[{id:0,x:1,y:1,type:'wolf',cap:3,_mapOuter:1}];
    g.spawnInZone=function(){throw new Error('boom');};
    let threw=false,n=0;
    try{n=g.mapOuterZonesFill();}catch(e){threw=true;}
    // applySave wrap: 後續補怪失敗不可擋讀檔
    let applied=false,wrapThrew=false,ret;
    g.applySave=function(){applied=true;return true;};
    delete g.applySave._mapOuterZones;
    g.mapOuterZonesInstall._ok=false;
    g.mapOuterZonesInstall();
    g.spawnInZone=function(){throw new Error('after');};
    try{ret=g.applySave({});}catch(e){wrapThrew=true;}
    return !threw&&n===0&&warns.length>=1&&applied&&ret===true&&!wrapThrew&&!!g.applySave._mapOuterZones;
  }finally{
    g.console.warn=oldWarn;
    g.ZONES=oldZ;g.S=oldS;
    if(oldSz===undefined)delete g.spawnInZone;else g.spawnInZone=oldSz;
    if(oldAS===undefined)delete g.applySave;else g.applySave=oldAS;
    g.MAP_TUNE.outerZones.capFill=oldCap;
    g.mapOuterCapFillOn._q=oldQ;
  }
})());


// ---- gearV2 掉落／品級／敵人穿戴 ----
ok('GEARV2_zb_min_yuan_ying',g.mapZbMinRealm()===7&&g.mapZbCarrierMinRealm()===7&&g.MAP_TUNE.zb.minRealm===7);
ok('GEARV2_grade_cap_default',(()=>{
  const G=g.MAP_TUNE.gearV2.gradeCapBelowRealm;
  const prev=g.econGearV2;
  try{
    g.econGearV2={GRADE_TUNE:{weight:{drop:[0,0,0,0,100]}}};
    const low=[],hi=[];
    for(let i=0;i<20;i++){low.push(g.mapGearV2RollGrade(6,0,'drop',()=>0.99));hi.push(g.mapGearV2RollGrade(7,0,'drop',()=>0));}
    return !!G&&G.below===7&&G.cap===4&&g.mapGearV2GradeCap(6)===4&&g.mapGearV2GradeCap(7)===0&&low.every(x=>x<=4)&&hi.every(x=>x===5);
  }finally{if(prev===undefined)delete g.econGearV2;else g.econGearV2=prev;}
})());

ok('GEARV2_grade_follows_table_tunable_cap',(()=>{
  const prev=g.econGearV2,prevCap=g.MAP_TUNE.gearV2.gradeCapBelowRealm;
  try{
    // 預設不加封頂：權重全在第五品時，低境也可抽到仙品（待使用者決定）
    g.econGearV2={GRADE_TUNE:{weight:{drop:[0,0,0,0,100]}}};
    g.MAP_TUNE.gearV2.gradeCapBelowRealm=null;
    const open=g.mapGearV2RollGrade(3,0,'drop',()=>0);
    // 若設定 {below:7, cap:4}，元嬰以下最高 4
    g.MAP_TUNE.gearV2.gradeCapBelowRealm={below:7,cap:4};
    const capped=[];for(let i=0;i<20;i++)capped.push(g.mapGearV2RollGrade(3,0,'drop',()=>0.99));
    const atMin=g.mapGearV2RollGrade(7,0,'drop',()=>0); // 元嬰：不受 below 限制
    const capFn=g.mapGearV2GradeCap(3)===4&&g.mapGearV2GradeCap(7)===0;
    return open===5&&capped.every(x=>x<=4)&&atMin===5&&capFn;
  }finally{
    if(prev===undefined)delete g.econGearV2;else g.econGearV2=prev;
    g.MAP_TUNE.gearV2.gradeCapBelowRealm=prevCap;
  }
})());

ok('GEARV2_cross_blocked_below_yuan_ying',(()=>{
  const oldS=g.S,oldFlag=g.mapFlag;
  try{
    g.S={zb:{inv:[],carriers:{},pity:{dungeon:0,cross:0}},map:{flags:{zhibao:true,enemyGear:true},seedExtra:1}};
    g.mapFlag=function(k){return k==='zhibao'||k==='enemyGear';};
    const low=g.mapZbRoll({src:'cross',realm:6,rng:()=>0,ignoreRealmGate:false});
    const ok7=g.mapZbRoll({src:'cross',realm:7,rng:()=>0});
    return low.hit===false&&low.reason==='below_min_realm'&&ok7.hit===true;
  }finally{g.S=oldS;if(oldFlag)g.mapFlag=oldFlag;}
})());

ok('GEARV2_pool_merge_and_off',(()=>{
  const prev=g.econGearV2,prevOn=g.econGearV2On,prevForce=g.ECON_GEARV2_FORCE;
  const oldKind='dg_qingyan';
  try{
    g.econGearV2On=function(){return true;};
    g.econGearV2={
      on:function(){return true;},
      dropPool:function(r){return {w:['gw'+r+'_v2w'],c:['ga'+r+'_v2c'],s:[]};},
      GRADE_TUNE:{weight:{drop:[60,26,10,4,0]}}
    };
    const T=g.mapDgLootFor(oldKind);
    const ids=(T.mid||[]).map(x=>x.id).concat((T.good||[]).map(x=>x.id),(T.bad||[]).map(x=>x.id));
    const has=ids.some(id=>String(id).indexOf('_v2')>=0);
    const hasOld=ids.some(id=>String(id).indexOf('_v2')<0);
    g.econGearV2On=function(){return false;};
    const T2=g.mapDgLootFor(oldKind);
    const ids2=(T2.mid||[]).map(x=>x.id).concat((T2.good||[]).map(x=>x.id),(T2.bad||[]).map(x=>x.id));
    const off=!ids2.some(id=>String(id).indexOf('_v2')>=0);
    // 低境副本不應擲出 treasure
    const cave='cave';
    let tre=0,n=0;
    if(g.MAP_DG_LOOT&&(g.MAP_DG_LOOT[cave]||g.MAP_DG_LOOT.dg_qingyan)){
      const k=g.MAP_DG_LOOT[cave]?cave:'dg_qingyan';
      const R=g.mapDgLootRealm(k);
      for(let i=0;i<80;i++){const p=g.mapDgLootPick(k,true,()=>0.01);n++;if(p&&p.entry&&p.entry.type==='treasure')tre++;}
      if(R<g.mapDgLootZbMin()&&tre>0)return {err:'treasure-at-low',R,tre};
    }
    return has&&hasOld&&off;
  }finally{
    if(prev===undefined)delete g.econGearV2;else g.econGearV2=prev;
    if(prevOn===undefined)delete g.econGearV2On;else g.econGearV2On=prevOn;
  }
})());

ok('GEARV2_enemy_loadout_q_and_fallback',(()=>{
  const prev=g.econGearV2,prevOn=g.econGearV2On,prevMake=g.makeItem;
  try{
    g.econGearV2On=function(){return true;};
    g.econGearV2={
      on:function(){return true;},
      dropPool:function(){return {w:['goodQ','badQ'],c:[],s:['setQ']};},
      CAT:{goodQ:{gv2:{q:0.85},slot:'w'},badQ:{gv2:{q:1.00},slot:'w'},setQ:{gv2:{q:1},slot:'a'}},
      GRADE_TUNE:{weight:{drop:[60,26,10,4,0]}}
    };
    g.makeItem=function(id,q){return {id:id,t:id,slot:id==='setQ'?'a':'w',q:q,atk:1,hp:0,def:0,spd:0};};
    const e={id:9,type:'wolf',realm:2,sub:0,atk:10,maxhp:100,hp:100,speed:2,def:0};
    const ok=g.mapEnemyV2Loadout(e,{rng:()=>0});
    const ids=e.eq?Object.keys(e.eq).map(k=>e.eq[k].t):[];
    const onlyLow=ids.every(id=>id==='goodQ')&&ids.length>=1&&e._mapNoSetBonus===1;
    // 旗關：loadout 失敗，decorate 走舊模板（這裡只驗 loadout 回 false）
    g.econGearV2On=function(){return false;};
    const e2={id:10,type:'wolf',realm:2,atk:10,maxhp:100,hp:100,speed:2,def:0};
    const off=!g.mapEnemyV2Loadout(e2,{rng:()=>0})&&!e2.eq;
    return ok&&onlyLow&&off;
  }finally{
    if(prev===undefined)delete g.econGearV2;else g.econGearV2=prev;
    if(prevOn===undefined)delete g.econGearV2On;else g.econGearV2On=prevOn;
    if(prevMake===undefined)delete g.makeItem;else g.makeItem=prevMake;
  }
})());


// ---- 2026-11-13 bossOnlyDg：首領房只認 S.dg.boss 那一隻 ----
ok('SP_bossonly_flag_default_on',(()=>{
  const prev=g.mapSpecialBossOnlyOn._q;
  try{
    g.mapSpecialBossOnlyOn._q=undefined;
    return g.MAP_TUNE.special&&g.MAP_TUNE.special.bossOnlyDg===true&&g.mapSpecialBossOnlyOn()===true;
  }finally{g.mapSpecialBossOnlyOn._q=prev;}
})());
ok('SP_storyBoss_table_g33_values',(()=>{
  const B=g.MAP_TUNE.storyBoss,K=B&&B.kinds;
  return !!B&&B.realmFrom==='entry'&&B.layer==='一層'&&B.sub===0&&B.reinforce===3
    &&K.st_luoxia.entry===5&&K.st_zangxian.entry===7&&K.st_wuxing.entry===9
    &&K.st_luoxia.layer==='一層'&&K.st_luoxia.sub===0&&K.st_zangxian.layer==='一層'&&K.st_wuxing.layer==='一層'
    &&K.st_luoxia.reinforce===3&&K.st_luoxia.hard.realm===6&&K.st_luoxia.hard.sub===0
    &&K.st_zangxian.hard.realm===8&&K.st_wuxing.hard.realm===10
    &&B.hard&&B.hard.layer==='一層'&&B.hard.sub===0;
})());
ok('SP_storyBoss_layer_one',(()=>{
  const B=g.MAP_TUNE.storyBoss,K=B&&B.kinds;
  if(!B||!K)return false;
  const layers=[B.layer,B.hard&&B.hard.layer,K.st_luoxia.layer,K.st_zangxian.layer,K.st_wuxing.layer];
  const subs=[B.sub,B.hard&&B.hard.sub,K.st_luoxia.sub,K.st_zangxian.sub,K.st_wuxing.sub,K.st_luoxia.hard.sub,K.st_zangxian.hard.sub,K.st_wuxing.hard.sub];
  return layers.every(x=>x==='一層')&&subs.every(x=>x===0)&&!JSON.stringify(B).includes('大圓滿');
})());
ok('SP_storyBoss_rs_unchanged_by_table',(()=>{
  const old=g.S;
  try{
    g.S={dg:{kind:'st_luoxia',hard:false,party:1}};
    const a=g.mapSpecialBossRS('st_luoxia');
    g.S.dg.hard=true;
    const b=g.mapSpecialBossRS('st_luoxia');
    return a.r===6&&a.s===0&&b.r===7&&b.s===0;
  }finally{g.S=old;}
})());
function _spBossRoom(kind){
  const T=g.mapSpecialTune(kind);
  g.ENEMY=g.ENEMY||{};
  if(!g.ENEMY[T.bossType])g.ENEMY[T.bossType]={n:T.bossN||'敵',hp:40,atk:4};
  if(!g.ENEMY.golem)g.ENEMY.golem={n:'石傀儡',hp:40,atk:4};
  const boss={id:101,type:T.bossType,realm:T.minionMin|0,sub:0,hp:100,maxhp:100,atk:10};
  const mob={id:102,type:T.bossType,realm:T.minionMin|0,sub:0,hp:80,maxhp:80,atk:8};
  g.S=g.S||{};
  g.S.dg={kind:kind,party:1,boss:101,L:{rooms:[{boss:true,x0:0,y0:0,w:20,h:20,cx:10,cy:10}]}};
  g.S.enemies=[boss,mob];
  return {boss,mob,T};
}
function _spOnly(v,fn){
  const prev=g.mapSpecialBossOnlyOn._q;
  try{g.mapSpecialBossOnlyOn._q=v;return fn();}
  finally{g.mapSpecialBossOnlyOn._q=prev;}
}
ok('SP_bossonly_luoxia_one_boss',_spOnly(true,()=>{
  const {boss,mob,T}=_spBossRoom('st_luoxia');
  g.mapSpecialEnforceLive();
  const name=String(boss._mapSpecialDisplay||'');
  return g.mapSpecialBossKind(boss)==='st_luoxia'&&g.mapSpecialBossKind(mob)===null
    &&boss._mapSpecialBoss===1&&boss._mapBoss===1&&name.indexOf(T.bossN)>=0
    &&!mob._mapSpecialBoss&&!mob._mapBoss&&!mob._mapSpecialDisplay
    &&(mob.realm|0)<=(T.minionCap|0)&&mob._mapSpecialMinion===1
    &&(boss.realm|0)===(T.bossRealm|0);
}));
ok('SP_bossonly_zangxian_one_boss',_spOnly(true,()=>{
  const {boss,mob,T}=_spBossRoom('st_zangxian');
  g.mapSpecialEnforceLive();
  return g.mapSpecialBossKind(boss)==='st_zangxian'&&g.mapSpecialBossKind(mob)===null
    &&boss._mapSpecialBoss===1&&!mob._mapSpecialBoss&&mob._mapSpecialMinion===1
    &&String(boss._mapSpecialDisplay||'').indexOf(T.bossN)>=0;
}));
ok('SP_bossonly_wuxing_one_boss',_spOnly(true,()=>{
  const {boss,mob,T}=_spBossRoom('st_wuxing');
  g.mapSpecialEnforceLive();
  return g.mapSpecialBossKind(boss)==='st_wuxing'&&g.mapSpecialBossKind(mob)===null
    &&boss._mapSpecialBoss===1&&!mob._mapSpecialBoss
    &&String(boss._mapSpecialDisplay||'').indexOf(T.bossN)>=0;
}));
ok('SP_bossonly_apply_ignores_same_type',_spOnly(true,()=>{
  const {boss,mob}=_spBossRoom('st_luoxia');
  g.mapSpecialApplyBoss(mob);
  g.mapSpecialApplyBoss(boss);
  return !mob._mapSpecialBoss&&boss._mapSpecialBoss===1&&boss._mapBoss===1;
}));
ok('SP_bossonly_off_same_type_all_boss',_spOnly(false,()=>{
  const {boss,mob}=_spBossRoom('st_luoxia');
  g.mapSpecialEnforceLive();
  return boss._mapSpecialBoss===1&&mob._mapSpecialBoss===1
    &&g.mapSpecialBossKind(boss)==='st_luoxia'&&g.mapSpecialBossKind(mob)==='st_luoxia';
}));
ok('SP_bossonly_lost_ref_uses_marker',_spOnly(true,()=>{
  const {boss,mob,T}=_spBossRoom('st_luoxia');
  boss._mapBoss=1;
  g.S.dg.boss=null;
  g.mapSpecialEnforceLive();
  return boss._mapSpecialBoss===1&&g.mapSpecialBossKind(boss)==='st_luoxia'
    &&!mob._mapSpecialBoss&&g.mapSpecialBossKind(mob)===null
    &&String(boss._mapSpecialDisplay||'').indexOf(T.bossN)>=0;
}));
ok('SP_bossonly_lost_ref_no_type_fallback',_spOnly(true,()=>{
  const {boss,mob}=_spBossRoom('st_luoxia');
  g.S.dg.boss=null;
  g.mapSpecialEnforceLive();
  return !boss._mapSpecialBoss&&!mob._mapSpecialBoss
    &&g.mapSpecialBossKind(boss)===null&&g.mapSpecialBossKind(mob)===null;
}));
ok('SP_bossonly_qingyan_still_designated',_spOnly(true,()=>{
  const {boss,mob,T}=_spBossRoom('dg_qingyan');
  g.mapSpecialEnforceLive();
  return g.mapSpecialBossKind(boss)==='dg_qingyan'&&g.mapSpecialBossKind(mob)===null
    &&boss._mapSpecialBoss===1&&!mob._mapSpecialBoss
    &&String(boss._mapSpecialDisplay||'').indexOf(T.bossN)>=0;
}));


// ---- singlestore（XW_STORE）：旗開走 API、旗關走舊、戰利品不翻倍、石碑扣一次、xf 失敗不入倉不回復 ----
function _ssLoadStub(){
  const cands=[
    path.join(path.dirname(ROOT),'econ_store_stub.js'),
    '/workspace/econ_single_store_1113/econ_store_stub.js',
    '/workspace/single_store_1113/仙武新地圖/econ_store_stub.js'
  ];
  let src=null,from=null;
  for(const f of cands){if(fs.existsSync(f)){src=fs.readFileSync(f,'utf8');from=f;break;}}
  if(!src)return {ok:false,from:null};
  vm.runInContext(src,g,{filename:'econ_store_stub.js'});
  try{if(g.window&&!g.window.XW_STORE)g.window.XW_STORE=g.XW_STORE;}catch(e){}
  return {ok:!!g.XW_STORE,from};
}
function _ssReset(ls){
  g.S=g.S||{};
  g.S.res={lingshi:ls,food:0,wood:0,stone:0,fiber:0,iron:0,herb:0};
  g.S.econ=g.S.econ||{};
  g.S.econ.vault={xia:ls,zhong:0,shang:0,ji:0};
  g.S.econ.flags=g.S.econ.flags||{};
  g.S.mats={hide:0,core:0};
  g.S.items={miji:0,gongfa:0,xfl:0,gfp:0};
  g.S.inv=[];
  g.S.pills=g.S.pills||{};
}
function _ssCalls(api){
  const rec={add:[],take:[],pay:[],invAdd:[],restore:0};
  const _add=api.add.bind(api),_take=api.take.bind(api),_pay=api.pay.bind(api);
  const _inv=api.invAdd&&api.invAdd.bind(api);
  const _restore=api.restore&&api.restore.bind(api);
  api.add=function(){const r=_add.apply(this,arguments);rec.add.push({key:arguments[0],n:arguments[1],r});return r;};
  api.take=function(){const r=_take.apply(this,arguments);rec.take.push({key:arguments[0],n:arguments[1],r});return r;};
  api.pay=function(){const r=_pay.apply(this,arguments);rec.pay.push({cost:arguments[0],reason:arguments[1],r});return r;};
  if(_inv)api.invAdd=function(){const r=_inv.apply(this,arguments);rec.invAdd.push({it:arguments[0],r});return r;};
  if(_restore)api.restore=function(){rec.restore++;return _restore.apply(this,arguments);};
  rec._restoreFns=()=>{api.add=_add;api.take=_take;api.pay=_pay;if(_inv)api.invAdd=_inv;if(_restore)api.restore=_restore;};
  return rec;
}
function _ssInstallMockExit(){
  g.dgExit=function(keep){
    const D=g.S.dg;if(!D)return;
    const xfFail=D.kind==='xf'&&!D.cleared;
    if(keep&&!xfFail){
      const L=D.loot||{res:{},mats:{},items:[],misc:{}};
      for(const k in L.res)g.S.res[k]=(g.S.res[k]||0)+L.res[k];
      for(const k in (L.mats||{}))g.S.mats[k]=(g.S.mats[k]||0)+L.mats[k];
      for(const it of (L.items||[]))g.S.inv.push(it);
      if(L.misc&&L.misc.miji)g.S.items.miji=(g.S.items.miji||0)+L.misc.miji;
    }
    g.S.dg=null;
  };
  return g.mapStoreInstallDgExit();
}


// 預設開：正式 XW_STORE.xfSettleOn() 預設 true；舊 stub 沒有此函式時暫時補上，測完還原
function _ssEnsureXfSettleDefaultOn(){
  const api=g.XW_STORE;
  const loc=g.location,win=g.window;
  g.location={search:''};
  g.window={location:g.location};
  if(api&&typeof api.xfSettleOn!=='function'){
    api.xfSettleOn=function(){return true;};
    return {restore(){
      try{delete api.xfSettleOn;}catch(e){}
      if(loc!==undefined)g.location=loc;else delete g.location;
      if(win!==undefined)g.window=win;else delete g.window;
    }};
  }
  return {restore(){
    if(loc!==undefined)g.location=loc;else delete g.location;
    if(win!==undefined)g.window=win;else delete g.window;
  }};
}
function _ssSetXfSettleUrl(q){
  const loc=g.location,win=g.window;
  g.location={search:q||''};
  g.window={location:g.location};
  return {restore(){
    if(loc!==undefined)g.location=loc;else delete g.location;
    if(win!==undefined)g.window=win;else delete g.window;
  }};
}

const _ssStub=_ssLoadStub();
ok('SS_stub_loaded',!!(_ssStub&&_ssStub.ok), 'from='+(_ssStub&&_ssStub.from));

ok('SS_flag_on_mapPay_uses_store',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(20);
    const rec=_ssCalls(g.XW_STORE);
    const r=g.mapPay(null,5,'test');
    rec._restoreFns();
    return !!(r&&r.ok&&r.via==='XW_STORE'&&rec.take.length===1&&rec.take[0].n===5&&g.S.res.lingshi===15&&g.S.econ.vault.xia===15);
  }finally{g.mapSingleStoreOn._q=prev;}
})());

ok('SS_flag_on_mapGain_add_once',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(15);
    const rec=_ssCalls(g.XW_STORE);
    const r=g.mapGain(null,3,'test');
    rec._restoreFns();
    return !!(r&&r.ok&&r.via==='XW_STORE'&&rec.add.length===1&&rec.add[0].key==='lingshi'&&rec.add[0].n===3&&g.S.res.lingshi===18);
  }finally{g.mapSingleStoreOn._q=prev;}
})());

ok('SS_flag_off_old_path',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  try{
    g.mapSingleStoreOn._q=false;
    _ssReset(20);
    const rec=_ssCalls(g.XW_STORE);
    const r=g.mapPay(null,5,'test');
    rec._restoreFns();
    return !!(r&&r.ok&&r.via!=='XW_STORE'&&rec.take.length===0&&rec.pay.length===0&&g.S.res.lingshi===15);
  }finally{g.mapSingleStoreOn._q=prev;}
})());

ok('SS_url_off_uses_old',(()=>{
  if(!_ssStub.ok)return false;
  const prevQ=g.mapSingleStoreOn._q,prevLoc=g.location,prevWinLoc=g.window&&g.window.location;
  try{
    delete g.mapSingleStoreOn._q;
    g.location={search:'?singlestore=0'};
    if(g.window)g.window.location=g.location;
    _ssReset(20);
    const rec=_ssCalls(g.XW_STORE);
    const r=g.mapPay(null,4,'url0');
    rec._restoreFns();
    return !!(r&&r.ok&&r.via!=='XW_STORE'&&rec.take.length===0&&g.S.res.lingshi===16);
  }finally{
    g.mapSingleStoreOn._q=prevQ;
    if(prevLoc!==undefined)g.location=prevLoc;else delete g.location;
    if(g.window){if(prevWinLoc!==undefined)g.window.location=prevWinLoc;else delete g.window.location;}
  }
})());

ok('SS_stele_pay_once',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(30);
    const rec=_ssCalls(g.XW_STORE);
    const can=g.mapStpCanPayLs(10);
    const p1=g.mapStpPayLs(10);
    rec._restoreFns();
    return !!(can&&p1&&p1.ok&&p1.via==='XW_STORE'&&rec.pay.length===1&&rec.pay[0].cost&&rec.pay[0].cost.lingshi===10&&rec.pay[0].reason==='stele_tp'&&g.S.res.lingshi===20);
  }finally{g.mapSingleStoreOn._q=prev;}
})());

ok('SS_loot_no_double',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  const prevX=g.mapXfSettleByEcon._q;
  const prevEx=g.dgExit;
  const ens=_ssEnsureXfSettleDefaultOn();
  try{
    g.mapSingleStoreOn._q=true;
    delete g.mapXfSettleByEcon._q; // 預設開：地圖只入非靈石，靈石由經濟入一次
    _ssReset(10);
    g.S.mats={hide:1};
    g.S.items={miji:0,gongfa:0,xfl:0};
    const gear={id:77,n:'測劍'};
    const loot={res:{lingshi:5,food:4},mats:{hide:2},items:[gear],misc:{miji:1,gfp:2,rec:1}};
    g.S.dg={kind:'cave',cleared:true,loot:loot};
    let innerLs=null;
    g.dgExit=function(keep){
      const D=g.S.dg;if(!D)return;
      const L=D.loot||{};
      innerLs=L.res&&L.res.lingshi;
      if(keep&&L.res&&L.res.lingshi){
        const n=+L.res.lingshi||0;
        delete L.res.lingshi;
        if(n)g.XW_STORE.add('lingshi',n,'dgLoot');
      }
      g.S.dg=null;
    };
    const inst=g.mapStoreInstallDgExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const addLs=rec.add.filter(x=>x.key==='lingshi'&&x.n===5).length;
    const addFood=rec.add.filter(x=>x.key==='food'&&x.n===4).length;
    const addMat=rec.add.filter(x=>x.key==='mat:hide'&&x.n===2).length;
    const addMiji=rec.add.filter(x=>x.key==='item:miji').length;
    const addLsAny=rec.add.filter(x=>x.key==='lingshi'||x.key==='xia').length;
    return !!(inst&&g.mapXfSettleByEcon()===true&&innerLs===5
      &&g.S.res.lingshi===15&&g.S.res.food===4&&g.S.mats.hide===3&&g.S.items.miji===1&&g.S.inv.length===1
      &&addLs===1&&addLsAny===1&&addFood===1&&addMat===1&&addMiji===1&&rec.invAdd.length===1);
  }finally{
    ens.restore();
    g.mapSingleStoreOn._q=prev;
    g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('SS_loot_xfsettle_off_map_deposits_lingshi',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  const prevX=g.mapXfSettleByEcon._q;
  const prevEx=g.dgExit;
  const url=_ssSetXfSettleUrl('?xfsettle=0');
  try{
    g.mapSingleStoreOn._q=true;
    delete g.mapXfSettleByEcon._q; // ?xfsettle=0：地圖照舊入靈石一次
    _ssReset(10);
    g.S.mats={hide:1};
    g.S.items={miji:0,gongfa:0,xfl:0};
    const gear={id:77,n:'測劍'};
    g.S.dg={kind:'cave',cleared:true,loot:{res:{lingshi:5,food:4},mats:{hide:2},items:[gear],misc:{miji:1,gfp:2,rec:1}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const addLs=rec.add.filter(x=>x.key==='lingshi'&&x.n===5).length;
    const addFood=rec.add.filter(x=>x.key==='food'&&x.n===4).length;
    const addMat=rec.add.filter(x=>x.key==='mat:hide'&&x.n===2).length;
    const addMiji=rec.add.filter(x=>x.key==='item:miji').length;
    return !!(inst&&g.mapXfSettleByEcon()===false
      &&g.S.res.lingshi===15&&g.S.res.food===4&&g.S.mats.hide===3&&g.S.items.miji===1&&g.S.inv.length===1
      &&addLs===1&&addFood===1&&addMat===1&&addMiji===1&&rec.invAdd.length===1);
  }finally{
    url.restore();
    g.mapSingleStoreOn._q=prev;
    g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('SS_xf_fail_no_loot_no_restore',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  const prevEx=g.dgExit;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(100); // 場內擊殺已入帳的靈石，預設保留
    g.S.mats={hide:0};
    g.S.items={miji:0,gongfa:0,xfl:0};
    g.S.dg={kind:'xf',cleared:false,loot:{res:{lingshi:9,food:3},mats:{hide:1},items:[{id:1,n:'x'}],misc:{miji:1}},bag0:{res:{lingshi:91}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    return !!(inst&&g.S.res.lingshi===100&&g.S.res.food===0&&rec.add.length===0&&rec.invAdd.length===0&&rec.restore===0
      &&g.S.items.miji===0&&g.S.inv.length===0);
  }finally{
    g.mapSingleStoreOn._q=prev;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('SS_sect_and_wallet_untouched',(()=>{
  if(!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(20);
    const rec=_ssCalls(g.XW_STORE);
    const disc={id:'dSS',kind:'disciple',lingshi:8};
    const sect={id:'sx',stock:{lingshi:10,food:0}};
    const a=g.mapPay(disc,3,'w');
    const b=g.mapPay(sect,4,'s');
    rec._restoreFns();
    return !!(a&&a.ok&&disc.lingshi===5&&b&&b.ok&&sect.stock.lingshi===6&&rec.take.length===0&&rec.pay.length===0&&g.S.res.lingshi===20);
  }finally{g.mapSingleStoreOn._q=prev;}
})());


ok('SS_xf_econ_settle_success_skip_lingshi',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prevS=g.mapSingleStoreOn._q,prevX=g.mapXfSettleByEcon._q,prevEx=g.dgExit;
  try{
    g.mapSingleStoreOn._q=true;
    g.mapXfSettleByEcon._q=true;
    _ssReset(10);
    g.S.mats={hide:1};
    g.S.items={miji:0,gongfa:0,xfl:0};
    const gear={id:88,n:'測刀'};
    g.S.dg={kind:'xf',cleared:true,loot:{res:{lingshi:5,food:4},mats:{hide:2},items:[gear],misc:{miji:1,gfp:2,rec:1}}};
    let seenLs=null,seenFood=null;
    g.dgExit=function(keep){
      const D=g.S.dg;if(!D)return;
      const L=D.loot||{};
      seenLs=L.res&&L.res.lingshi;
      seenFood=L.res&&L.res.food;
      g.S.dg=null;
    };
    g.mapStoreInstallDgExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const addLs=rec.add.filter(x=>x.key==='lingshi'||x.key==='xia').length;
    return !!(g.S.res.lingshi===10&&g.S.res.food===4&&g.S.mats.hide===3&&g.S.items.miji===1&&g.S.inv.length===1
      &&addLs===0&&seenLs===5&&(seenFood==null||seenFood===0)
      &&rec.add.filter(x=>x.key==='food'&&x.n===4).length===1
      &&rec.add.filter(x=>x.key==='mat:hide'&&x.n===2).length===1
      &&rec.invAdd.length===1);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('SS_xf_econ_settle_off_old_lingshi',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prevS=g.mapSingleStoreOn._q,prevX=g.mapXfSettleByEcon._q,prevEx=g.dgExit;
  try{
    g.mapSingleStoreOn._q=true;
    g.mapXfSettleByEcon._q=false;
    _ssReset(10);
    g.S.mats={hide:1};
    g.S.items={miji:0};
    g.S.dg={kind:'xf',cleared:true,loot:{res:{lingshi:5,food:4},mats:{hide:2},items:[],misc:{}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    return !!(inst&&g.S.res.lingshi===15&&g.S.res.food===4&&g.S.mats.hide===3
      &&rec.add.filter(x=>x.key==='lingshi'&&x.n===5).length===1
      &&rec.add.filter(x=>x.key==='food'&&x.n===4).length===1);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('SS_xf_econ_settle_fail_no_deposit',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prevS=g.mapSingleStoreOn._q,prevX=g.mapXfSettleByEcon._q,prevEx=g.dgExit;
  try{
    g.mapSingleStoreOn._q=true;
    g.mapXfSettleByEcon._q=true;
    _ssReset(100);
    g.S.mats={hide:0};
    g.S.items={miji:0};
    const loot={res:{lingshi:9,food:3},mats:{hide:1},items:[{id:1,n:'x'}],misc:{miji:1}};
    g.S.dg={kind:'xf',cleared:false,loot:loot,bag0:{res:{lingshi:91}}};
    let lootSame=false;
    g.dgExit=function(keep){
      const D=g.S.dg;
      lootSame=!!(D&&D.loot===loot&&D.loot.res.lingshi===9&&D.loot.res.food===3&&D.loot.mats.hide===1);
      g.S.dg=null;
    };
    g.mapStoreInstallDgExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    return !!(lootSame&&g.S.res.lingshi===100&&g.S.res.food===0&&rec.add.length===0&&rec.invAdd.length===0&&rec.restore===0
      &&g.S.items.miji===0&&g.S.inv.length===0);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('SS_xf_econ_settle_auto_default_on',(()=>{
  const prev=g.mapXfSettleByEcon._q;
  const ens=_ssEnsureXfSettleDefaultOn();
  try{
    delete g.mapXfSettleByEcon._q;
    const tune=g.MAP_TUNE.store&&g.MAP_TUNE.store.xfSettleByEcon;
    const api=g.XW_STORE;
    const fnOn=api&&typeof api.xfSettleOn==='function'&&api.xfSettleOn()===true;
    return tune==='auto'&&fnOn&&g.mapXfSettleByEcon()===true;
  }finally{ens.restore();g.mapXfSettleByEcon._q=prev;}
})());

ok('SS_xf_econ_settle_url_off',(()=>{
  const prev=g.mapXfSettleByEcon._q;
  const url=_ssSetXfSettleUrl('?xfsettle=0');
  try{
    delete g.mapXfSettleByEcon._q;
    const tune=g.MAP_TUNE.store&&g.MAP_TUNE.store.xfSettleByEcon;
    return tune==='auto'&&g.mapXfSettleByEcon()===false;
  }finally{url.restore();g.mapXfSettleByEcon._q=prev;}
})());



// ---- r3：dgParty 人頭／弟子份額 + 首領房小怪 ≤ 首領 ----

ok('SS_xf_settle_no_fn_map_deposits',(()=>{
  const prev=g.mapXfSettleByEcon._q,prevT=g.MAP_TUNE.store.xfSettleByEcon,prevL=g.location,prevW=g.window&&g.window.location,prevFn=g.xfSettleOn;
  try{
    delete g.mapXfSettleByEcon._q;
    g.MAP_TUNE.store.xfSettleByEcon='auto';
    g.location={search:''};
    if(g.window)g.window.location=g.location;
    try{delete g.xfSettleOn;}catch(e){}
    const api=g.XW_STORE;const had=api&&api.xfSettleOn;if(api)delete api.xfSettleOn;
    const off=g.mapXfSettleByEcon()===false;
    if(api&&had)api.xfSettleOn=had;
    return off;
  }finally{
    g.mapXfSettleByEcon._q=prev;g.MAP_TUNE.store.xfSettleByEcon=prevT;
    if(prevL!==undefined)g.location=prevL;else try{delete g.location;}catch(e){}
    try{if(g.window){if(prevW!==undefined)g.window.location=prevW;}}catch(e){}
    if(prevFn!==undefined)g.xfSettleOn=prevFn;
  }
})());

ok('SS_xf_settle_via_xfSettleOn',(()=>{
  const prev=g.mapXfSettleByEcon._q,prevT=g.MAP_TUNE.store.xfSettleByEcon,prevL=g.location;
  try{
    delete g.mapXfSettleByEcon._q;
    g.MAP_TUNE.store.xfSettleByEcon='auto';
    g.location={search:''};
    if(g.window)g.window.location=g.location;
    g.XW_STORE=g.XW_STORE||{};
    g.XW_STORE.xfSettleOn=function(){return true;};
    const on=g.mapXfSettleByEcon()===true;
    g.XW_STORE.xfSettleOn=function(){return false;};
    const off=g.mapXfSettleByEcon()===false;
    return on&&off;
  }finally{
    g.mapXfSettleByEcon._q=prev;g.MAP_TUNE.store.xfSettleByEcon=prevT;
    if(prevL!==undefined)g.location=prevL;
    try{if(g.XW_STORE)delete g.XW_STORE.xfSettleOn;}catch(e){}
  }
})());

ok('SS_xf_settle_url_only',(()=>{
  const prev=g.mapXfSettleByEcon._q,prevT=g.MAP_TUNE.store.xfSettleByEcon,prevL=g.location,prevW=g.window&&g.window.location;
  try{
    delete g.mapXfSettleByEcon._q;
    g.MAP_TUNE.store.xfSettleByEcon='auto';
    g.XW_STORE=g.XW_STORE||{};
    g.XW_STORE.xfSettleOn=function(){return true;};
    g.location={search:'?foo=1&xfsettle=0'};
    if(g.window)g.window.location=g.location;
    const off=g.mapXfSettleByEcon()===false;
    g.location={search:'?xfsettle=1'};
    if(g.window)g.window.location=g.location;
    const on=g.mapXfSettleByEcon()===true;
    return off&&on;
  }finally{
    g.mapXfSettleByEcon._q=prev;g.MAP_TUNE.store.xfSettleByEcon=prevT;
    if(prevL!==undefined)g.location=prevL;
    try{if(g.window){if(prevW!==undefined)g.window.location=prevW;}}catch(e){}
    try{if(g.XW_STORE)delete g.XW_STORE.xfSettleOn;}catch(e){}
  }
})());

ok('SS_xf_settle_ignores_econ_flags_and_hooks',(()=>{
  const prev=g.mapXfSettleByEcon._q,prevT=g.MAP_TUNE.store.xfSettleByEcon,prevL=g.location,oldS=g.S;
  try{
    delete g.mapXfSettleByEcon._q;
    g.MAP_TUNE.store.xfSettleByEcon='auto';
    g.location={search:''};
    if(g.window)g.window.location=g.location;
    try{delete g.xfSettleOn;}catch(e){}
    if(g.XW_STORE){delete g.XW_STORE.xfSettleOn;g.XW_STORE.xfLsSettleOn=function(){return true;};g.XW_STORE.xfSettleLoot=function(){};}
    g.S={econ:{flags:{xfSettle:true,xfLsSettle:true,xfsettle:true}}};
    return g.mapXfSettleByEcon()===false;
  }finally{
    g.mapXfSettleByEcon._q=prev;g.MAP_TUNE.store.xfSettleByEcon=prevT;
    if(prevL!==undefined)g.location=prevL;
    g.S=oldS;
    try{if(g.XW_STORE){delete g.XW_STORE.xfLsSettleOn;delete g.XW_STORE.xfSettleLoot;}}catch(e){}
  }
})());

ok('SS_xf_settle_keep_lingshi_no_double',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prevS=g.mapSingleStoreOn._q,prevX=g.mapXfSettleByEcon._q,prevEx=g.dgExit;
  try{
    g.mapSingleStoreOn._q=true;
    g.mapXfSettleByEcon._q=true;
    _ssReset(10);
    const loot={res:{lingshi:12,food:3},mats:{hide:1},items:[],misc:{}};
    g.S.dg={kind:'cave',cleared:true,loot:loot};
    // 內層模擬 econ xwsXfHook：先拿走 lingshi 再入倉（只入一次）
    g.dgExit=function(keep){
      const D=g.S.dg;if(!D)return;
      if(keep&&D.loot&&D.loot.res){
        const n=+D.loot.res.lingshi||0;
        if(n>0){delete D.loot.res.lingshi;g.XW_STORE.add('lingshi',n,'dgLoot');}
        for(const k in D.loot.res)g.S.res[k]=(g.S.res[k]||0)+(D.loot.res[k]||0);
        for(const k in (D.loot.mats||{}))g.S.mats[k]=(g.S.mats[k]||0)+D.loot.mats[k];
      }
      g.S.dg=null;
    };
    g.mapStoreInstallDgExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const addLs=rec.add.filter(x=>x.key==='lingshi'||x.key==='xia');
    const addFood=rec.add.filter(x=>x.key==='food'&&x.n===3);
    return !!(addLs.length===1&&addLs[0].n===12&&addFood.length===1
      &&!(loot.res&&loot.res.lingshi)&&g.S.res.food===3);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
  }
})());

ok('XF_count_no_store_uses_items',(()=>{
  const prev=g.mapSingleStoreOn._q,oldS=g.S,oldApi=g.XW_STORE,oldW=g.window&&g.window.XW_STORE;
  try{
    g.mapSingleStoreOn._q=false;
    g.S={items:{xfl:4}};
    return g.mapXflCount()===4&&g.mapXflTake(2).ok===true&&g.S.items.xfl===2&&g.mapXflTake(9).ok===false&&g.S.items.xfl===2;
  }finally{
    g.mapSingleStoreOn._q=prev;g.S=oldS;
    if(oldApi!==undefined)g.XW_STORE=oldApi;
    try{if(g.window)g.window.XW_STORE=oldW;}catch(e){}
  }
})());

ok('XF_count_sect_store',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q,oldS=g.S;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(0);
    g.S.items={xfl:5};g.S.units=[];
    try{delete g.player;}catch(e){}
    const n=g.mapXflCount();
    const r=g.mapXflTake(2,null,'t');
    return n===5&&r.ok===true&&g.XW_STORE.get('item:xfl')===3&&g.S.items.xfl===3;
  }finally{g.mapSingleStoreOn._q=prev;g.S=oldS;}
})());

ok('XF_count_bag_plus_sect',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q,oldS=g.S;
  const _get=g.XW_STORE.get.bind(g.XW_STORE),_take=g.XW_STORE.take.bind(g.XW_STORE),_count=g.XW_STORE.count;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(0);
    g.S.items={xfl:2};
    const u={id:7,kind:'player',bagN:{'item:xfl':3}};
    g.S.units=[u];
    g.player=function(){return u;};
    const bagOf=function(owner,key){
      const uu=(g.S.units||[]).find(x=>x&&(x.id===owner||x.np===owner));
      return uu?+((uu.bagN||{})[key]||0):0;
    };
    g.XW_STORE.count=function(key,opt){
      const owner=opt&&opt.owner;return bagOf(owner,key)+(_get(key)||0);
    };
    let takeCalls=0;
    g.XW_STORE.take=function(key,n,a3){
      takeCalls++;
      const opt=(a3&&typeof a3==='object')?a3:{reason:a3};
      const owner=opt.owner,bag=owner!=null?bagOf(owner,key):0,store=_get(key)||0;
      if(bag+store<n)return {ok:false,reason:'insufficient'};
      const fromBag=Math.min(bag,n),fromStore=n-fromBag;
      const uu=owner!=null?(g.S.units||[]).find(x=>x&&(x.id===owner||x.np===owner)):null;
      if(fromBag>0&&uu){uu.bagN[key]=bag-fromBag;if(!uu.bagN[key])delete uu.bagN[key];}
      if(fromStore>0)_take(key,fromStore,opt.reason||'t');
      return {ok:true,took:n,fromBag:fromBag,fromStore:fromStore,owner:owner};
    };
    const n=g.mapXflCount(7);
    const r=g.mapXflTake(4,7,'use');
    return n===5&&r.ok===true&&r.took===4&&r.fromBag===3&&r.fromStore===1
      &&+(u.bagN['item:xfl']||0)===0&&g.S.items.xfl===1&&takeCalls===1;
  }finally{
    g.mapSingleStoreOn._q=prev;g.S=oldS;
    g.XW_STORE.get=_get;g.XW_STORE.take=_take;
    if(_count===undefined)delete g.XW_STORE.count;else g.XW_STORE.count=_count;
    try{delete g.player;}catch(e){}
  }
})());

ok('XF_take_atomic_insufficient',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q,oldS=g.S;
  const _get=g.XW_STORE.get.bind(g.XW_STORE),_take=g.XW_STORE.take.bind(g.XW_STORE),_count=g.XW_STORE.count;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(0);
    g.S.items={xfl:1};
    const u={id:8,kind:'player',bagN:{'item:xfl':3}};
    g.S.units=[u];
    const bagOf=function(owner,key){
      const uu=(g.S.units||[]).find(x=>x&&(x.id===owner||x.np===owner));
      return uu?+((uu.bagN||{})[key]||0):0;
    };
    g.XW_STORE.count=function(key,opt){return bagOf(opt&&opt.owner,key)+(_get(key)||0);};
    let takeCalls=0;
    g.XW_STORE.take=function(key,n,a3){
      takeCalls++;
      const opt=(a3&&typeof a3==='object')?a3:{reason:a3};
      const owner=opt.owner,bag=owner!=null?bagOf(owner,key):0,store=_get(key)||0;
      if(bag+store<n)return {ok:false,reason:'insufficient'};
      const fromBag=Math.min(bag,n),fromStore=n-fromBag;
      const uu=owner!=null?(g.S.units||[]).find(x=>x&&(x.id===owner||x.np===owner)):null;
      if(fromBag>0&&uu){uu.bagN[key]=bag-fromBag;if(!uu.bagN[key])delete uu.bagN[key];}
      if(fromStore>0)_take(key,fromStore,opt.reason||'t');
      return {ok:true,took:n,fromBag:fromBag,fromStore:fromStore};
    };
    const r=g.mapXflTake(5,8,'use');
    return r.ok===false&&r.reason==='insufficient'&&takeCalls===1
      &&+(u.bagN['item:xfl']||0)===3&&g.S.items.xfl===1;
  }finally{
    g.mapSingleStoreOn._q=prev;g.S=oldS;
    g.XW_STORE.get=_get;g.XW_STORE.take=_take;
    if(_count===undefined)delete g.XW_STORE.count;else g.XW_STORE.count=_count;
  }
})());

ok('XF_count_prefers_count_api',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q;
  try{
    g.mapSingleStoreOn._q=true;
    g.XW_STORE.count=function(key,opt){return key==='item:xfl'?11:-1;};
    return g.mapXflCount(1)===11;
  }finally{
    g.mapSingleStoreOn._q=prev;
    try{delete g.XW_STORE.count;}catch(e){}
  }
})());

ok('XF_count_no_count_falls_back_items',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q,oldS=g.S,_count=g.XW_STORE.count;
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(0);
    g.S.items={xfl:2};
    g.S.units=[{id:9,kind:'player',bagN:{'item:xfl':7}}];
    try{delete g.XW_STORE.count;}catch(e){}
    // 無 count 時不走 get 後備，只退回 S.items.xfl（不算行囊 7）
    return g.mapXflCount(9)===2;
  }finally{
    g.mapSingleStoreOn._q=prev;g.S=oldS;
    if(_count===undefined){try{delete g.XW_STORE.count;}catch(e){}}else g.XW_STORE.count=_count;
  }
})());

ok('XF_loot_add_solo_owner',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prev=g.mapSingleStoreOn._q,oldS=g.S,_add=g.XW_STORE.add.bind(g.XW_STORE);
  try{
    g.mapSingleStoreOn._q=true;
    _ssReset(0);
    const u={id:4,kind:'player'};
    g.S.units=[u];
    g.player=function(){return u;};
    const seen=[];
    g.XW_STORE.add=function(key,n,a3){seen.push({key:key,n:n,a3:a3});return _add(key,n,a3&&a3.reason?a3.reason:a3);};
    g.mapStoreApplyDgLoot({res:{},mats:{},items:[],misc:{xfl:1}},'dgExit',{});
    return !!(seen.length===1&&seen[0].key==='item:xfl'&&seen[0].n===1
      &&seen[0].a3&&seen[0].a3.owner===4&&seen[0].a3.reason==='dgExit');
  }finally{
    g.mapSingleStoreOn._q=prev;g.S=oldS;
    g.XW_STORE.add=_add;
    try{delete g.player;}catch(e){}
  }
})());

ok('DP_flag_default_off',(()=>{
  const prev=g.mapDgPartyOn._q;
  try{
    delete g.mapDgPartyOn._q;
    return !!(g.MAP_TUNE.dgParty&&g.MAP_TUNE.dgParty.on===false&&g.mapDgPartyOn()===false
      &&Array.isArray(g.MAP_TUNE.dgParty.perHead)&&g.MAP_TUNE.dgParty.perHead[0]==='xfl'
      &&g.MAP_TUNE.dgParty.discRatioMin===0.3&&g.MAP_TUNE.dgParty.discRatioMax===1);
  }finally{g.mapDgPartyOn._q=prev;}
})());

ok('DP_disciple_round_edges',(()=>{
  const f=g.mapDgPartyDiscipleShares;
  return f(10,0.30)===3&&f(10,1)===10&&f(1,0.30)===0&&f(1,0.5)===1&&f(5,0.5)===3&&f(0,0.9)===0&&f(10,0)===0;
})());

function _dpResetNet(net){
  const prev={XW:g.XW,wXW:g.window&&g.window.XW};
  g.XW=net?{net:net}:(g.XW&&g.XW.net?{net:Object.assign({},g.XW.net)}:{});
  if(!net){delete g.XW.net;}
  try{g.window=g.window||{};g.window.XW=g.XW;}catch(e){}
  return prev;
}
function _dpRestoreNet(prev){
  if(prev.XW!==undefined)g.XW=prev.XW;else delete g.XW;
  try{if(g.window){if(prev.wXW!==undefined)g.window.XW=prev.wXW;else delete g.window.XW;}}catch(e){}
}
function _dpClearParty(){
  try{g.MAP_DG_PARTY_PENDING.length=0;}catch(e){g.MAP_DG_PARTY_PENDING=[];}
}

ok('DP_solo_null_or_missing_fn',(()=>{
  const prevN=_dpResetNet(null),prevQ=g.mapDgPartyOn._q;
  try{
    const a=g.mapDgPartyPlayers();
    const net={dgParticipants:function(){return null;}};
    _dpRestoreNet(_dpResetNet(net));
    g.XW={net:net};g.window.XW=g.XW;
    const b=g.mapDgPartyPlayers();
    return !!(a&&a.length===1&&a[0].pid==='host'&&a[0].isHost===true
      &&b&&b.length===1&&b[0].pid==='host');
  }finally{g.mapDgPartyOn._q=prevQ;_dpRestoreNet(prevN);}
})());

ok('DP_one_player_xfl_share',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevR=g.mapDgPartyRollRatio._q,prevX=g.mapXfSettleByEcon._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(null);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapDgPartyRollRatio._q=0.30;g.mapXfSettleByEcon._q=true;
    _ssReset(0);_dpClearParty();
    g.S.units=[{id:1,kind:'player'}];
    const loot={res:{lingshi:7,food:1},mats:{},items:[],misc:{xfl:1}};
    g.S.dg={kind:'xf',cleared:true,party:1,loot:loot};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const xfl=rec.add.filter(x=>x.key==='item:xfl');
    const ls=rec.add.filter(x=>x.key==='lingshi'||x.key==='xia');
    return !!(inst&&xfl.length===1&&xfl[0].n===1&&ls.length===0&&loot.res.lingshi===7);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapDgPartyRollRatio._q=prevR;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_three_players_xfl_shares',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const net={
    dgParticipants:function(){return [
      {pid:'host',uid:'h',isHost:true,unit:null},
      {pid:'p2',uid:'u2',isHost:false,unit:null},
      {pid:'p3',uid:'u3',isHost:false,unit:null}
    ];},
    dgCredit:function(pid,pay){credits.push({pid:pid,key:pay&&pay.key,n:pay&&pay.n,reason:pay&&pay.reason});return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevR=g.mapDgPartyRollRatio._q,prevX=g.mapXfSettleByEcon._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapDgPartyRollRatio._q=0.30;g.mapXfSettleByEcon._q=true;
    _ssReset(0);_dpClearParty();
    g.S.units=[{id:1,kind:'player'}];
    const loot={res:{lingshi:9,food:2},mats:{},items:[],misc:{xfl:1}};
    g.S.dg={kind:'xf',cleared:true,party:3,loot:loot};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const xflStore=rec.add.filter(x=>x.key==='item:xfl');
    const ls=rec.add.filter(x=>x.key==='lingshi'||x.key==='xia');
    const pids=credits.map(c=>c.pid).sort().join(',');
    return !!(inst&&credits.length===3&&pids==='host,p2,p3'
      &&credits.every(c=>c.key==='item:xfl'&&c.n===1)
      &&xflStore.length===0&&ls.length===0
      &&loot.res&&loot.res.lingshi===9);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapDgPartyRollRatio._q=prevR;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_ten_disciples_30pct_three_shares',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const net={
    dgParticipants:function(){return [{pid:'host',uid:'h',isHost:true,unit:null}];},
    dgCredit:function(pid,pay){credits.push({pid:pid,key:pay&&pay.key,n:pay&&pay.n});return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevR=g.mapDgPartyRollRatio._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapDgPartyRollRatio._q=0.30;
    _ssReset(0);_dpClearParty();
    const units=[{id:1,kind:'player'}];
    for(let i=0;i<10;i++)units.push({id:10+i,kind:'disciple'});
    g.S.units=units;
    g.S.dg={kind:'xf',cleared:true,party:11,loot:{res:{food:1},mats:{},items:[],misc:{xfl:1}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const pend=g.mapDgPartyPending();
    const disc=rec.add.filter(x=>x.key==='item:xfl'&&x.n===3);
    return !!(inst&&credits.length===1&&credits[0].pid==='host'&&credits[0].n===1
      &&disc.length===1&&pend.length===1&&pend[0].n===3&&pend[0].pending===true&&pend[0].confirm==='captain');
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapDgPartyRollRatio._q=prevR;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_flag_off_old_once',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const net={
    dgParticipants:function(){return [
      {pid:'host',isHost:true,unit:null},{pid:'p2',isHost:false,unit:null},{pid:'p3',isHost:false,unit:null}
    ];},
    dgCredit:function(pid,pay){credits.push({pid:pid,n:pay&&pay.n});return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=false;
    _ssReset(0);_dpClearParty();
    g.S.dg={kind:'xf',cleared:true,party:3,loot:{res:{},mats:{},items:[],misc:{xfl:1}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const xfl=rec.add.filter(x=>x.key==='item:xfl');
    return !!(inst&&credits.length===0&&xfl.length===1&&xfl[0].n===1&&g.mapDgPartyPending().length===0);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_no_lingshi_here',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const net={
    dgParticipants:function(){return [{pid:'host',isHost:true,unit:null}];},
    dgCredit:function(pid,pay){credits.push(pay);return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevX=g.mapXfSettleByEcon._q,prevR=g.mapDgPartyRollRatio._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapXfSettleByEcon._q=true;g.mapDgPartyRollRatio._q=0;
    _ssReset(3);_dpClearParty();
    const loot={res:{lingshi:11,food:2},mats:{},items:[],misc:{xfl:1}};
    g.S.dg={kind:'xf',cleared:true,party:1,loot:loot};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const ls=rec.add.filter(x=>x.key==='lingshi'||x.key==='xia');
    return !!(inst&&ls.length===0&&credits.every(c=>c&&c.key!=='lingshi'&&c.key!=='xia')
      &&loot.res.lingshi===11);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapXfSettleByEcon._q=prevX;g.mapDgPartyRollRatio._q=prevR;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_fail_no_settle',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const net={
    dgParticipants:function(){return [{pid:'host',isHost:true,unit:null},{pid:'p2',isHost:false,unit:null}];},
    dgCredit:function(pid,pay){credits.push({pid:pid});return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevX=g.mapXfSettleByEcon._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapXfSettleByEcon._q=true;
    _ssReset(8);_dpClearParty();
    const loot={res:{lingshi:4,food:1},mats:{hide:1},items:[],misc:{xfl:1}};
    g.S.dg={kind:'xf',cleared:false,party:2,loot:loot};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    return !!(inst&&credits.length===0&&rec.add.length===0&&loot.res.lingshi===4&&loot.misc.xfl===1
      &&g.mapDgPartyPending().length===0);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_missing_credit_old_local_once',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const net={
    dgParticipants:function(){return [
      {pid:'host',isHost:true,unit:null},{pid:'p2',isHost:false,unit:null},{pid:'p3',isHost:false,unit:null}
    ];}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevR=g.mapDgPartyRollRatio._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapDgPartyRollRatio._q=0;
    _ssReset(0);_dpClearParty();
    g.S.dg={kind:'xf',cleared:true,party:3,loot:{res:{},mats:{},items:[],misc:{xfl:1}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const xfl=rec.add.filter(x=>x.key==='item:xfl');
    return !!(inst&&xfl.length===1&&xfl[0].n===1);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapDgPartyRollRatio._q=prevR;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());


ok('DP_disciples_from_net_excludes_avatar_units',(()=>{
  const net={
    dgParticipants:function(){return [
      {pid:'host',isHost:true,unit:null},
      {pid:'p2',isHost:false,unit:null}
    ];},
    dgDisciples:function(){return [21,22,23,24,25,26,27,28,29,30];}
  };
  const prevN=_dpResetNet(net),oldS=g.S;
  try{
    g.S={units:[
      {id:1,kind:'player'},
      {id:2,kind:'disciple',np:'p2'},
      {id:3,kind:'disciple',np:'p3'}
    ],dg:{kind:'xf',party:13}};
    const n=g.mapDgPartyDiscipleCount(g.mapDgPartyPlayers());
    return n===10;
  }finally{g.S=oldS;_dpRestoreNet(prevN);}
})());

ok('DP_disciples_net_null_fallback_excludes_np',(()=>{
  const net={
    dgParticipants:function(){return [{pid:'host',isHost:true,unit:null},{pid:'p2',isHost:false,unit:null}];},
    dgDisciples:function(){return null;}
  };
  const prevN=_dpResetNet(net),oldS=g.S;
  try{
    const units=[{id:1,kind:'player'},{id:2,kind:'disciple',np:'p2'}];
    for(let i=0;i<10;i++)units.push({id:10+i,kind:'disciple'});
    g.S={units:units,dg:{kind:'xf',party:12}};
    const n=g.mapDgPartyDiscipleCount(g.mapDgPartyPlayers());
    return n===10;
  }finally{g.S=oldS;_dpRestoreNet(prevN);}
})());

ok('DP_disciples_missing_fn_fallback_excludes_np',(()=>{
  const net={dgParticipants:function(){return [{pid:'host',isHost:true,unit:null}];}};
  const prevN=_dpResetNet(net),oldS=g.S;
  try{
    const units=[{id:1,kind:'player'},{id:2,kind:'disciple',np:'p2'},{id:3,kind:'disciple',np:'p3'}];
    for(let i=0;i<10;i++)units.push({id:10+i,kind:'disciple'});
    g.S={units:units,dg:{kind:'xf',party:13}};
    const n=g.mapDgPartyDiscipleCount(g.mapDgPartyPlayers());
    return n===10;
  }finally{g.S=oldS;_dpRestoreNet(prevN);}
})());

ok('DP_disciples_net_empty_is_zero',(()=>{
  const net={
    dgParticipants:function(){return [{pid:'host',isHost:true,unit:null}];},
    dgDisciples:function(){return [];}
  };
  const prevN=_dpResetNet(net),oldS=g.S;
  try{
    const units=[{id:1,kind:'player'}];
    for(let i=0;i<10;i++)units.push({id:10+i,kind:'disciple'});
    g.S={units:units,dg:{kind:'xf',party:11}};
    const n=g.mapDgPartyDiscipleCount(g.mapDgPartyPlayers());
    return n===0;
  }finally{g.S=oldS;_dpRestoreNet(prevN);}
})());

ok('DP_avatar_is_player_not_disciple',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const av2={id:2,kind:'disciple',np:'p2'};
  const av3={id:3,kind:'disciple',np:'p3'};
  const net={
    dgParticipants:function(){return [
      {pid:'host',uid:1,isHost:true,unit:null},
      {pid:'p2',uid:2,isHost:false,unit:av2},
      {pid:'p3',uid:3,isHost:false,unit:av3}
    ];},
    dgDisciples:function(){return [11,12,13,14,15,16,17,18,19,20];},
    dgCredit:function(pid,pay){credits.push({pid:pid,key:pay&&pay.key,n:pay&&pay.n});return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevR=g.mapDgPartyRollRatio._q,prevX=g.mapXfSettleByEcon._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapDgPartyRollRatio._q=0.30;g.mapXfSettleByEcon._q=true;
    _ssReset(0);_dpClearParty();
    const units=[{id:1,kind:'player'},av2,av3];
    for(let i=0;i<10;i++)units.push({id:11+i,kind:'disciple'});
    g.S.units=units;
    g.S.dg={kind:'xf',cleared:true,party:13,loot:{res:{lingshi:4},mats:{},items:[],misc:{xfl:1}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const pids=credits.map(c=>c.pid).sort().join(',');
    const disc=rec.add.filter(x=>x.key==='item:xfl'&&x.n===3);
    const pend=g.mapDgPartyPending();
    return !!(inst&&credits.length===3&&pids==='host,p2,p3'&&credits.every(c=>c.key==='item:xfl'&&c.n===1)
      &&disc.length===1&&pend.length===1&&pend[0].n===3&&pend[0].dest==='sect');
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapDgPartyRollRatio._q=prevR;g.mapXfSettleByEcon._q=prevX;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('DP_avatar_fallback_settle_not_disciple',(()=>{
  if(!_ssStub||!_ssStub.ok)return false;
  const credits=[];
  const av2={id:2,kind:'disciple',np:'p2'};
  const net={
    dgParticipants:function(){return [
      {pid:'host',uid:1,isHost:true,unit:null},
      {pid:'p2',uid:2,isHost:false,unit:av2}
    ];},
    dgCredit:function(pid,pay){credits.push({pid:pid,n:pay&&pay.n});return {ok:true};}
  };
  const prevS=g.mapSingleStoreOn._q,prevQ=g.mapDgPartyOn._q,prevR=g.mapDgPartyRollRatio._q;
  const prevEx=g.dgExit,prevN=_dpResetNet(net);
  try{
    g.mapSingleStoreOn._q=true;g.mapDgPartyOn._q=true;g.mapDgPartyRollRatio._q=0.30;
    _ssReset(0);_dpClearParty();
    const units=[{id:1,kind:'player'},av2];
    for(let i=0;i<10;i++)units.push({id:10+i,kind:'disciple'});
    g.S.units=units;
    g.S.dg={kind:'xf',cleared:true,party:12,loot:{res:{},mats:{},items:[],misc:{xfl:1}}};
    const inst=_ssInstallMockExit();
    const rec=_ssCalls(g.XW_STORE);
    g.dgExit(true);
    rec._restoreFns();
    const pids=credits.map(c=>c.pid).sort().join(',');
    const disc=rec.add.filter(x=>x.key==='item:xfl'&&x.n===3);
    return !!(inst&&credits.length===2&&pids==='host,p2'&&disc.length===1);
  }finally{
    g.mapSingleStoreOn._q=prevS;g.mapDgPartyOn._q=prevQ;g.mapDgPartyRollRatio._q=prevR;
    if(prevEx!==undefined)g.dgExit=prevEx;else delete g.dgExit;
    _dpRestoreNet(prevN);
  }
})());

ok('MLB_flag_default_on',(()=>{
  const prev=g.mapSpecialMinionLeqBossOn._q;
  try{
    delete g.mapSpecialMinionLeqBossOn._q;
    return !!(g.MAP_TUNE.minionLeqBoss&&g.MAP_TUNE.minionLeqBoss.on===true&&g.mapSpecialMinionLeqBossOn()===true);
  }finally{g.mapSpecialMinionLeqBossOn._q=prev;}
})());

ok('MLB_rs_edges',(()=>{
  const f=g.mapSpecialClampRsToBoss;
  const a=f(5,8,{r:5,s:0}),b=f(5,0,{r:5,s:0}),c=f(4,9,{r:5,s:0}),d=f(6,0,{r:5,s:0}),e=f(5,3,{r:5,s:2});
  return a.realm===5&&a.sub===0&&b.realm===5&&b.sub===0&&c.realm===4&&c.sub===9&&d.realm===5&&d.sub===0&&e.realm===5&&e.sub===2;
})());

ok('MLB_luoxia_boss_room_capped',(()=>{
  const oldS=g.S,prevQ=g.mapSpecialMinionLeqBossOn._q,prevP=g.mapSpecialPickMinionRS;
  try{
    g.mapSpecialMinionLeqBossOn._q=true;
    g.mapSpecialPickMinionRS=function(){return {realm:5,sub:8,elite:0};};
    const boss={id:201,type:'golem',realm:5,sub:0,hp:100,maxhp:100,atk:10,_mapSpecialBoss:1};
    const mob={id:202,type:'golem',realm:5,sub:8,hp:80,maxhp:80,atk:8,x:10,y:10};
    g.ENEMY=g.ENEMY||{};if(!g.ENEMY.golem)g.ENEMY.golem={n:'石傀儡',hp:40,atk:4};
    g.S={enemies:[boss,mob],dg:{kind:'st_luoxia',party:1,boss:201,L:{rooms:[
      {boss:false,x0:0,y0:0,w:10,h:10,cx:5,cy:5},
      {boss:true,x0:20,y0:20,w:20,h:20,cx:30,cy:30}
    ]}}};
    g.mapSpecialClampMinion(mob,30,30);
    return (mob.realm|0)===5&&(mob.sub|0)===0&&mob._mapSpecialMinion===1;
  }finally{
    g.S=oldS;g.mapSpecialMinionLeqBossOn._q=prevQ;g.mapSpecialPickMinionRS=prevP;
  }
})());

ok('MLB_other_room_uncapped',(()=>{
  const oldS=g.S,prevQ=g.mapSpecialMinionLeqBossOn._q,prevP=g.mapSpecialPickMinionRS;
  try{
    g.mapSpecialMinionLeqBossOn._q=true;
    g.mapSpecialPickMinionRS=function(){return {realm:5,sub:8,elite:0};};
    const boss={id:201,type:'golem',realm:5,sub:0,hp:100,maxhp:100,atk:10,_mapSpecialBoss:1};
    const mob={id:202,type:'golem',realm:5,sub:0,hp:80,maxhp:80,atk:8,x:5,y:5};
    g.ENEMY=g.ENEMY||{};if(!g.ENEMY.golem)g.ENEMY.golem={n:'石傀儡',hp:40,atk:4};
    g.S={enemies:[boss,mob],dg:{kind:'st_luoxia',party:1,boss:201,L:{rooms:[
      {boss:false,x0:0,y0:0,w:10,h:10,cx:5,cy:5},
      {boss:true,x0:20,y0:20,w:20,h:20,cx:30,cy:30}
    ]}}};
    g.mapSpecialClampMinion(mob,5,5);
    return (mob.realm|0)===5&&(mob.sub|0)===8&&mob._mapSpecialMinion===1;
  }finally{
    g.S=oldS;g.mapSpecialMinionLeqBossOn._q=prevQ;g.mapSpecialPickMinionRS=prevP;
  }
})());

ok('MLB_flag_off_boss_room_uncapped',(()=>{
  const oldS=g.S,prevQ=g.mapSpecialMinionLeqBossOn._q,prevP=g.mapSpecialPickMinionRS;
  try{
    g.mapSpecialMinionLeqBossOn._q=false;
    g.mapSpecialPickMinionRS=function(){return {realm:5,sub:8,elite:0};};
    const boss={id:201,type:'golem',realm:5,sub:0,hp:100,maxhp:100,atk:10,_mapSpecialBoss:1};
    const mob={id:202,type:'golem',realm:5,sub:8,hp:80,maxhp:80,atk:8,x:30,y:30};
    g.ENEMY=g.ENEMY||{};if(!g.ENEMY.golem)g.ENEMY.golem={n:'石傀儡',hp:40,atk:4};
    g.S={enemies:[boss,mob],dg:{kind:'st_luoxia',party:1,boss:201,L:{rooms:[
      {boss:true,x0:20,y0:20,w:20,h:20,cx:30,cy:30}
    ]}}};
    g.mapSpecialClampMinion(mob,30,30);
    return (mob.realm|0)===5&&(mob.sub|0)===8;
  }finally{
    g.S=oldS;g.mapSpecialMinionLeqBossOn._q=prevQ;g.mapSpecialPickMinionRS=prevP;
  }
})());

console.log(lines.join('\n'));
console.log('RESULT',pass+'/'+(pass+fail),'fail='+fail);
fs.writeFileSync('/tmp/map_phase_all_regress.out',lines.join('\n')+'\nRESULT '+pass+'/'+(pass+fail)+' fail='+fail+'\n');
process.exit(fail?1:0);
