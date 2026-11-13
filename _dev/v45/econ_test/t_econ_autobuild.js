// econ_autobuild：弟子主動新建＋升級（長老決定、無長老暫停、不通知宗主、同時 1 件、冷卻 1 年、需求 60 秒、
// 金庫保底 max(20,20%)、單件 ≤30%、木石各留 20、B 類最多 1 座且只升最高、優先最缺）。
// Node vm 單元測試：載入真的 econ_core／econ_rank／econ_rank_ai／econ_build／econ_autobuild，遊戲 g* 函式用最小替身。
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+(d==null?'':JSON.stringify(d)).slice(0,600));};

function load(search){
  const ctx={console,Math,JSON,Object,Array,Set,Map,isFinite,Infinity,S:null,TUNE:{dayLen:300,lvCost:[2,3,4,5,6],lv3Iron:5},ECON_LV_MAX:6,LV_MAX:3,
    __toasts:[],location:{search:search||''},document:undefined,setTimeout:undefined,UNIT_KEEP:[],selUnits:[],buildMode:null,
    RES_KEYS:['wood','stone','fiber','food','iron','herb','lingshi']};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(`
    var BUILD={
      hall:{name:'宗門大殿',size:3,cost:{wood:30,stone:20,fiber:10},time:12,pop:2,hp:800},
      house:{name:'住房',size:2,cost:{wood:25,fiber:15},time:7,pop:3,hp:300},
      wudao:{name:'武道館',size:3,cost:{wood:60,stone:40},time:14,pop:0,hp:600,slots:6},
      cangku:{name:'倉庫',size:2,cost:{wood:60,stone:40,fiber:10},time:12,pop:0,hp:500},
      juling:{name:'聚靈陣',size:2,cost:{wood:40,stone:40,lingshi:20},time:12,pop:0,hp:400},
      zongcang:{name:'總倉',size:3,cost:{wood:80,stone:80},time:12,pop:0,hp:500}
    };
    var __nid=1000;
    function toast(m){__toasts.push(String(m));}
    function blv(b){return b&&b.lv||1;}
    function canAfford(c){for(const k in c)if((S.res[k]||0)<c[k])return false;return true;}
    function pay(c){for(const k in c)S.res[k]-=c[k];}
    function upCost(b,lv){lv=lv||blv(b)+1;const base=BUILD[b.type].cost,c={};for(const k in base)c[k]=Math.ceil(base[k]*(lv));return c;}
    function popCap(){let c=0;for(const b of S.buildings)if(b.built)c+=(BUILD[b.type].pop||0)+(b.type==='house'||b.type==='hall'?2*(blv(b)-1):0);return c;}
    function popUsed(){return S.units.filter(u=>u.kind==='disciple'&&!u.dead).length;}
    function hasBuilt(t){return S.buildings.some(b=>b.type===t&&b.built&&!b.broken);}
    function buildLock(t){if(t==='hall'&&S.buildings.some(b=>b.type==='hall'))return '宗門大殿只能建一座';if(__lock[t])return __lock[t];return null;}
    var __lock={};
    function jobSlots(b){return (BUILD[b.type].slots||0)+(blv(b)-1);}
    function v53Cap(k){return __cap;}
    var __cap=10000;
    function sectCenter(){return {x:50,y:50};}
    function placementValid(t,i,j){if(i<40||j<40)return false;for(const b of S.buildings){const s=BUILD[b.type].size,s2=BUILD[t].size;if(i<b.i+s&&i+s2>b.i&&j<b.j+s&&j+s2>b.j)return false;}return canAfford(BUILD[t].cost);}
    function ghostOrigin(){return {i:0,j:0};}
    function setTask(u,t){u.task=t;}
    function unitById(id){return S.units.find(u=>u.id===id)||null;}
    function player(){return S.units.find(u=>u.kind==='player');}
    function disciples(){return S.units.filter(u=>u.kind==='disciple');}
    function tryPlace(shift){const g=ghostOrigin(),type=buildMode,D=BUILD[type];if(!placementValid(type,g.i,g.j)){toast('這裡不能建造');return;}
      pay(D.cost);const b={id:__nid++,type,i:g.i,j:g.j,progress:0,built:false,hp:D.hp,maxhp:D.hp,broken:false,lv:1};S.buildings.push(b);
      let bs=selUnits.map(unitById).filter(u=>u&&!u.dead);if(!bs.length)bs=[player()];for(const u of bs)setTask(u,{type:'build',bid:b.id});
      toast('開始建造「'+D.name+'」');if(!shift)buildMode=null;}
    function startUpgrade(b){if(!b.built||b.broken||b.upg)return false;if(blv(b)>=econUpgradeMax(b)){toast('上限');return false;}const c=upCost(b);if(!canAfford(c)){toast('升級需要');return false;}
      pay(c);b.upg={p:0,cost:c};let us=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple');if(!us.length)us=[player()];us.forEach(u=>setTask(u,{type:'build',bid:b.id}));toast('開始升級「'+BUILD[b.type].name+'」');return true;}
    function update(dt){S.time+=dt;}
  `,ctx);
  for(const f of ['econ_core.js','econ_build.js','econ_rank.js','econ_rank_ai.js','econ_autobuild.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  return ctx;
}
function fresh(ctx,o){
  o=o||{};ctx.__toasts.length=0;ctx.__lock={};ctx.__cap=10000;ctx.ECON_AUTOBUILD_FORCE=null;ctx.selUnits.length=0;ctx.buildMode=null;
  const S={time:0,units:[],buildings:[],res:{wood:500,stone:500,fiber:200,food:100,iron:0,herb:0,lingshi:0},flags:{peakRealm:1},econ:null,nextId:1};
  ctx.S=S;ctx.econInitState(S);S.econ.flags.ranks=true;S.econ.flags.build=true;
  S.econ.flags.treasury=false; // 金庫＝S.res.lingshi（treasury 關時的舊單一數值）
  S.res.lingshi=o.ls!=null?o.ls:1000;
  S.buildings.push({id:1,type:'hall',i:48,j:48,built:true,broken:false,lv:o.hallLv||2,hp:800,maxhp:800});
  S.buildings.push({id:2,type:'house',i:44,j:44,built:true,broken:false,lv:1,hp:300,maxhp:300});
  S.units.push({id:100,kind:'player',name:'宗主',x:50,y:50});
  const n=o.n!=null?o.n:7; // 上限＝大殿 2(+2)＋住房 3＝7（hallLv2）
  for(let k=0;k<n;k++)S.units.push({id:200+k,kind:'disciple',name:'弟'+k,x:50+k,y:50,realm:1,loyal:80});
  if(o.elder!==false)ctx.econAppoint(S.units[1],'zhanglao');
  return S;
}
function run(ctx,sec,step){step=step||0.5;for(let t=0;t<sec;t+=step){ctx.update(step);ctx.econAutobuildTick(step);}}
const st=ctx=>ctx.S.econ.autobuild;
const starts=ctx=>(st(ctx)&&st(ctx).log||[]).filter(e=>e.ev==='start');
function finishCur(ctx){const c=st(ctx).cur;const b=ctx.S.buildings.find(x=>x.id===c.bid);if(c.kind==='build')b.built=true;else{b.lv=c.toLv;b.upg=null;}for(const u of ctx.S.units)if(u.task&&u.task.bid===b.id)u.task=null;}

// 1 旗標
{
  const c=load();
  rec('1a ECON_AUTOBUILD_DEFAULT===true',c.ECON_AUTOBUILD_DEFAULT===true);
  rec('1b 不在 ECON_FLAGS_DEFAULT（?dev=1 不會動它）',!Object.prototype.hasOwnProperty.call(c.ECON_FLAGS_DEFAULT,'autobuild'));
  fresh(c);rec('1c 缺旗標＝開',c.econAutobuildOn()===true&&c.S.econ.flags.autobuild===undefined);
  c.S.econ.flags.autobuild=false;rec('1d flags.autobuild=false＝關',c.econAutobuildOn()===false);
  c.ECON_AUTOBUILD_FORCE=true;rec('1e FORCE 優先',c.econAutobuildOn()===true);
  const c2=load('?autobuild=0');fresh(c2);rec('1f ?autobuild=0＝關',c2.econAutobuildOn()===false);
  const c3=load('?dev=1&autobuild=1');fresh(c3);c3.S.econ.flags.autobuild=false;rec('1g ?autobuild=1 蓋過存檔旗標',c3.econAutobuildOn()===true);
}
// 2 旗標關：不動作
{
  const c=load('?autobuild=0');fresh(c,{n:8});run(c,200);
  rec('2 旗標關：200 秒內不建不升、不寫狀態',starts(c).length===0&&c.S.buildings.length===2&&!c.S.econ.autobuild,{b:c.S.buildings.length});
}
// 3 需求 60 秒
{
  const c=load();fresh(c,{n:8});
  run(c,59);const a=starts(c).length;
  run(c,2);const b=starts(c);
  rec('3a 需求未滿 60 秒不動手',a===0,{a});
  rec('3b 持續 60 秒後動手（弟子滿→新建住房或升級）',b.length===1&&b[0].need==='pop',b[0]);
}
// 3c 需求中斷就重算
{
  const c=load();const S=fresh(c,{n:8});
  run(c,40);const ex=S.units.splice(-2,2);run(c,5);S.units.push(...ex);run(c,40);
  const a=starts(c).length;run(c,21);
  rec('3c 需求中斷後重新計 60 秒',a===0&&starts(c).length===1,{a,after:starts(c).length});
}
// 4 長老：無長老暫停；長老決定（紀錄長老 id）
{
  const c=load();const S=fresh(c,{n:8,elder:false});
  run(c,200);
  rec('4a 無長老：200 秒不動作、時鐘不走、標記暫停',starts(c).length===0&&st(c).clock===0&&st(c).paused===1,{clock:st(c).clock});
  c.econAppoint(S.units[2],'zhanglao');run(c,59);const a=starts(c).length;run(c,2);
  const s=starts(c);
  rec('4b 有長老後需重新累積 60 秒才動手',a===0&&s.length===1,{a,s:s.length});
  rec('4c 由長老決定（紀錄長老 id）',s[0]&&s[0].elder===S.units[2].id,s[0]&&s[0].elder);
  // 進行中長老離任 → 暫停；長老回來後冷卻／需求時鐘才繼續
  c.econAppoint(S.units[2],'neimen');const ck=st(c).clock;run(c,30);
  rec('4d 長老離任：時鐘停止',st(c).clock===ck,{ck,now:st(c).clock});
}
// 5 不通知宗主
{
  const c=load();fresh(c,{n:8});c.__toasts.length=0;run(c,62);
  rec('5 動手時沒有任何提示（toast）給宗主',starts(c).length===1&&c.__toasts.length===0,c.__toasts);
}
// 6 同時 1 件＋冷卻 1 年（完工起算 300 秒）
{
  const c=load();const S=fresh(c,{n:8});c.__cap=520; // 同時倉儲也滿（wood 500/520≥90%）
  run(c,62);const n1=starts(c).length;
  run(c,120);const n2=starts(c).length;
  rec('6a 進行中不開第二件（另一需求也成熟）',n1===1&&n2===1,{n1,n2,need:st(c).need});
  finishCur(c);run(c,1);const ck=st(c).clock;
  const doneAt=(st(c).log.find(e=>e.ev==='done')||{}).clock;
  rec('6b 完工後清除進行中，冷卻到期＝完工時鐘＋300',!st(c).cur&&doneAt!=null&&Math.abs(st(c).cdUntil-doneAt-300)<0.01,{cd:st(c).cdUntil,doneAt,ck});
  run(c,290);const n3=starts(c).length;
  run(c,12);const n4=starts(c).length;
  rec('6c 冷卻 1 年內不動手、過後才動手',n3===1&&n4===2,{n3,n4});
  rec('6d econYearSec()＝300',c.econYearSec()===300);
}
// 7 金庫規則
{
  const c=load();fresh(c);
  const m=(ls,cost)=>{c.S.res.lingshi=ls;return c.econABMoneyCheck(cost);};
  rec('7a 30%：100 金庫、靈石 30 → 可',m(100,{lingshi:30}).ok===true);
  rec('7b 30%：100 金庫、靈石 31 → 擋',m(100,{lingshi:31}).reason==='over30');
  rec('7c 保底 20：金庫 19、無靈石費 → 擋',m(19,{wood:1}).reason==='floor');
  rec('7d 保底 20：金庫 25、靈石 7（≤30%）→ 剩 18 <20 擋',m(25,{lingshi:7}).reason==='floor');
  rec('7e 保底 20%：金庫 1000、靈石 300 → 剩 700 ≥200 可',m(1000,{lingshi:300}).ok===true);
  c.TUNE&&0;
  // 20% 比 20 大的情形：把 30% 上限暫時放寬，單測保底比例
  const keep=c.ECON_AUTOBUILD_TUNE.maxFrac;c.ECON_AUTOBUILD_TUNE.maxFrac=1;
  rec('7f 保底 20%：金庫 1000、靈石 801 → 剩 199 <200 擋',m(1000,{lingshi:801}).reason==='floor');
  rec('7g 保底 20%：金庫 1000、靈石 800 → 剩 200 可',m(1000,{lingshi:800}).ok===true);
  c.ECON_AUTOBUILD_TUNE.maxFrac=keep;
  c.S.res.lingshi=1000;
  c.S.res.wood=44;rec('7h 木材 44－25＝19 <20 擋',c.econABMoneyCheck({wood:25}).reason==='wood');
  c.S.res.wood=45;rec('7i 木材 45－25＝20 可',c.econABMoneyCheck({wood:25}).ok===true);
  c.S.res.stone=59;rec('7j 石材 59－40＝19 擋',c.econABMoneyCheck({stone:40}).reason==='stone');
  c.S.res.stone=60;rec('7k 石材 60－40＝20 可',c.econABMoneyCheck({stone:40}).ok===true);
}
// 7l 實跑：金庫不足保底時整件不動、資源不變
{
  const c=load();const S=fresh(c,{n:8,ls:19});const r0=JSON.stringify(S.res);run(c,120);
  rec('7l 金庫 19（<20 保底）：120 秒不動作、資源不變',starts(c).length===0&&JSON.stringify(S.res)===r0,st(c)&&c.ECON_AB_RT.last);
  const c2=load();const S2=fresh(c2,{n:8});S2.res.wood=44;const r2=JSON.stringify(S2.res);run(c2,120);
  rec('7m 木材 44：住房（木 25）會讓木材 <20 → 不動作',starts(c2).length===0&&JSON.stringify(S2.res)===r2,c2.ECON_AB_RT.last);
}
// 8 B 類：最多 1 座、只升最高；A 類先升最低
{
  const c=load();const S=fresh(c);
  rec('8a 分類：hall/juling/zongcang＝B，house/cangku＝A',c.econABClass('hall')==='B'&&c.econABClass('juling')==='B'&&c.econABClass('zongcang')==='B'&&c.econABClass('house')==='A'&&c.econABClass('cangku')==='A');
  let p=c.econABPlanType('juling');
  rec('8b B 類沒有就新建',p.ok&&p.kind==='build',p.reason);
  S.buildings.find(b=>b.id===1).lv=3;S.buildings.push({id:11,type:'juling',i:60,j:60,built:true,lv:1,hp:1,maxhp:1},{id:12,type:'juling',i:64,j:60,built:true,lv:2,hp:1,maxhp:1});
  p=c.econABPlanType('juling');
  rec('8c B 類已有兩座（玩家蓋的）：只升最高那座 Lv2',p.ok&&p.kind==='upgrade'&&p.b.id===12,p.b&&p.b.id);
  S.flags.peakRealm=0;S.units.forEach(u=>u.realm=0); // 境界上限 Lv2：最高那座 Lv2 已滿，低的 Lv1 還能升
  p=c.econABPlanType('juling');
  rec('8d B 類最高那座已達上限：不升低的、也不再新建',!p.ok&&p.reason==='b-one',p);
  S.flags.peakRealm=1;S.units.forEach(u=>u.realm=1);S.buildings.find(b=>b.id===1).lv=2;
  S.buildings.push({id:13,type:'house',i:70,j:70,built:true,lv:2,hp:1,maxhp:1});
  p=c.econABPlanType('house');
  rec('8e A 類：先升等級最低那座（最缺）',p.ok&&p.kind==='upgrade'&&p.b.id===2,p.b&&p.b.id);
  S.buildings.find(b=>b.id===2).lv=3;S.buildings.find(b=>b.id===13).lv=3;S.buildings.find(b=>b.id===1).lv=3;
  p=c.econABPlanType('house');
  rec('8f A 類都到上限：新建',p.ok&&p.kind==='build',p);
  S.buildings.push({id:14,type:'house',i:74,j:74,built:false,lv:1,hp:1,maxhp:1});
  p=c.econABPlanType('house');
  rec('8g 同型有工地在蓋：不再加',!p.ok&&p.reason==='in-progress',p.reason);
}
// 9 優先最缺：弟子超額 > 倉儲 90%
{
  const c=load();const S=fresh(c,{n:9});c.__cap=520;run(c,62);
  const s=starts(c);
  rec('9 兩個需求同時成熟：先處理最缺（弟子超額）',s.length===1&&s[0].need==='pop',s[0]);
}
// 10 讀檔不重複
{
  const c=load();const S=fresh(c,{n:8});run(c,62);
  const s1=starts(c).length,res1=JSON.stringify(S.res),nb=S.buildings.length;
  // 模擬存讀檔：S 整份 JSON 來回（S.econ 由 g23 snapshot 以 JSON 整包保存）
  const S2=JSON.parse(JSON.stringify(S));c.S=S2;c.ECON_AB_RT.lastT=null;
  run(c,120);
  rec('10a 讀檔後進行中工程保留、不再開第二件、資源只扣一次',starts(c).length===s1&&s1===1&&JSON.stringify(S2.res)===res1&&S2.buildings.length===nb,{s1,n:starts(c).length});
  finishCur(c);run(c,1);const cd=st(c).cdUntil;
  const S3=JSON.parse(JSON.stringify(c.S));c.S=S3;c.ECON_AB_RT.lastT=null;run(c,100);
  rec('10b 冷卻中讀檔：冷卻保留，不提前動手',starts(c).length===1&&st(c).cdUntil===cd,{cd,now:st(c).clock});
  rec('10c 只寫 S.econ.autobuild（不加建築／單位欄位、不動 UNIT_KEEP）',c.UNIT_KEEP.indexOf('econAB')<0&&!S3.buildings.some(b=>Object.keys(b).some(k=>/econAB|autob/i.test(k))),Object.keys(st(c)));
}
// 11 升級路徑：派弟子、宗主不被抓去施工
{
  const c=load();const S=fresh(c,{n:10});c.__lock.house='測試鎖'; // 住房不能新建 → 改升大殿（B 類，最高那座）
  S.buildings.find(b=>b.id===2).lv=2; // 住房 Lv2＝大殿上限 → 住房不能升
  run(c,62);const s=starts(c);
  const hall=S.buildings.find(b=>b.id===1),pl=S.units.find(u=>u.kind==='player');
  rec('11a 住房不能升也不能建 → 升大殿',s.length===1&&s[0].kind==='upgrade'&&s[0].type==='hall'&&!!hall.upg,s[0]);
  rec('11b 施工派的是閒置弟子，不是宗主',s[0]&&s[0].workers.length>=1&&!pl.task&&s[0].workers.every(id=>S.units.find(u=>u.id===id).kind==='disciple'),s[0]&&s[0].workers);
  hall.lv=3;hall.upg=null;run(c,1);
  rec('11c 升級完成 → 清除進行中並開始冷卻',!st(c).cur&&st(c).cdUntil>st(c).clock+298&&st(c).log.some(e=>e.ev==='done'),st(c).log.slice(-1)[0]);
  rec('11d 玩家原選取還原',c.selUnits.length===0);
}
// 12 客機不跑
{
  const c=load();fresh(c,{n:8});c.NET={role:'client'};run(c,120);
  rec('12 聯機客機：不動作',starts(c).length===0&&!c.S.econ.autobuild);
}
// 13 玩家正在放置建築：不打斷
{
  // 住房、大殿都到境界上限 Lv2 → 只能新建住房（走 tryPlace）
  const c=load();const S=fresh(c,{n:10});S.flags.peakRealm=0;S.units.forEach(u=>u.realm=0);S.buildings.find(b=>b.id===2).lv=2;
  run(c,59);c.buildMode='wudao';run(c,10);
  const a=starts(c).length,bm=c.buildMode;c.buildMode=null;run(c,2);const s=starts(c);
  rec('13 宗主在放置模式時不搶 buildMode；離開後才新建',a===0&&bm==='wudao'&&s.length===1&&s[0].kind==='build'&&c.buildMode===null,{a,bm,s:s[0]});
  const nb=S.buildings.find(b=>s[0]&&b.id===s[0].bid);
  rec('13b 新建工地：未落成、位置合法、派閒置弟子施工、宗主沒被派',nb&&!nb.built&&S.units.filter(u=>u.task&&u.task.bid===nb.id).every(u=>u.kind==='disciple')&&!S.units.find(u=>u.kind==='player').task,nb);
}
const pass=rows.filter(r=>r.ok).length,fail=rows.length-pass;
console.log(`\nt_econ_autobuild: ${pass}/${rows.length} PASS, ${fail} FAIL`);
process.exitCode=fail?1:0;
