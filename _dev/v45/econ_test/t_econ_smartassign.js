// 智能派工 sa1–sa5：旗標、手令優先、滯後、提案行為。Node vm 單元測試，只載入經濟檔＋最小替身。
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+(d==null?'':JSON.stringify(d)).slice(0,500));};

function load(search){
  const ctx={console,Math,JSON,Object,Array,Set,Map,isFinite,Infinity,S:null,
    location:{search:search||''},document:undefined,setTimeout:undefined,UNIT_KEEP:[],
    selUnits:[],buildMode:null,RES_KEYS:['wood','stone','fiber','food','iron','herb','lingshi'],
    __toasts:[],__assignLog:[]};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(`
    function toast(m){__toasts.push(String(m));}
    var BUILD={hall:{name:'宗門大殿',size:3,cost:{wood:30},time:12,pop:2,hp:800},
      house:{name:'住房',size:2,cost:{wood:25},time:7,pop:3,hp:300},
      lingtian:{name:'靈田',size:2,cost:{wood:10},time:5,hp:200,slots:2},
      alchemy:{name:'煉丹房',size:3,cost:{wood:20},time:8,hp:300,slots:2},
      forge:{name:'鍛造坊',size:3,cost:{wood:20},time:8,hp:300,slots:2},
      wudao:{name:'武道館',size:3,cost:{wood:20},time:8,hp:300,slots:4},
      waishitang:{name:'外事堂',size:3,cost:{wood:20},time:8,hp:300}};
    var INJOB={train:{b:'wudao',label:'練武'},seclude:{b:'lianwu',label:'閉關'},rest:{b:'house',label:'休息'},
      study:{b:'library',label:'研讀'},lecture:{b:'hall',label:'聽道'},alchemy:{b:'alchemy',label:'煉丹'},forge:{b:'forge',label:'鍛造'}};
    var JOB_NAME={gather:'採集',farm:'務農',train:'練武',guard:'守衛',alchemy:'煉丹',forge:'鍛造',seclude:'閉關',follow:'跟隨'};
    function hasBuilt(t){return S.buildings.some(b=>b&&b.type===t&&b.built&&!b.broken);}
    function blv(b){return (b&&b.lv)||1;}
    function jobSlots(b){return (BUILD[b.type]&&BUILD[b.type].slots||0)+(blv(b)-1);}
    function trainers(b){let n=0;for(const u of S.units)if(u&&!u.dead&&u.jobB===b.id&&INJOB[u.job])n++;return n;}
    function econFarmSlots(b){return 2;}
    function econFarmWorkers(b){let n=0;for(const u of S.units)if(u&&!u.dead&&u.jobB===b.id&&(u.job==='farm'||u.econFarm))n++;return n;}
    function econCraftQOf(b){return (b&&b.econCraftQ)||[];}
    function bById(id){return S.buildings.find(b=>b.id===id)||null;}
    function unitById(id){return S.units.find(u=>u.id===id)||null;}
    function player(){return S.units.find(u=>u.kind==='player');}
    function disciples(){return S.units.filter(u=>u.kind==='disciple');}
    function setTask(u,t){u.task=t;}
    function assignJob(u,job,arg){
      if(!u||u.kind!=='disciple')return false;
      __assignLog.push({id:u.id,job:job,arg:arg});
      if(job==='farm'){
        const b=arg&&arg.bid!=null?bById(arg.bid):null;
        if(!b||b.type!=='lingtian')return false;
        if(!(u.job==='farm'&&u.jobB===b.id)&&econFarmWorkers(b)>=econFarmSlots(b))return false;
        u.job='farm';u.jobB=b.id;u.econFarm=true;u.task=null;return true;
      }
      if(INJOB[job]&&!hasBuilt(INJOB[job].b))return false;
      if(INJOB[job]&&arg&&arg.bid){
        const bb=bById(arg.bid);
        if(bb&&bb.type===INJOB[job].b&&trainers(bb)<jobSlots(bb)){u.job=job;u.jobB=bb.id;u.task=null;return true;}
        return false;
      }
      u.job=job;if(job==='gather'&&arg)u.jobRes=arg;if(job!=='gather')u.jobRes=null;
      if(job!=='farm')u.jobB=null;u.task=null;return true;
    }
    function hasProf(u,k){return !!(u&&u.prof&&u.prof.indexOf(k)>=0);}
    function profOfRes(r){return ({stone:'miner',iron:'miner',lingshi:'miner',wood:'lumber',herb:'herbal',food:'farmer',fiber:'farmer'})[r]||null;}
    function rootApt(u,r){
      const E=u&&u.lg;if(!E)return 1;
      const els=Array.isArray(E.els)?E.els:(E.e!=null?[E.e]:[]);
      const has=e=>els.indexOf(e)>=0;
      if(r==='wood'&&has(1))return 1.3;if((r==='stone'||r==='iron')&&(has(4)||has(0)))return 1.3;
      if((r==='food'||r==='herb'||r==='fiber')&&has(2))return 1.15;return 1;
    }
    function lgEff(lg){if(!lg)return null;if(lg.els)return lg;if(lg.e!=null)return {els:[lg.e]};return null;}
    function update(dt){if(S)S.time=(S.time||0)+dt;}
    function popCap(){return 20;}function popUsed(){return S.units.filter(u=>u.kind==='disciple'&&!u.dead).length;}
    function canAfford(){return true;}function pay(){}
    function placementValid(){return true;}function ghostOrigin(){return {i:52,j:52};}
    function tryPlace(){const type=buildMode,D=BUILD[type];const b={id:(S.nextId=(S.nextId||20)+1),type,i:52,j:52,progress:0,built:false,hp:100,maxhp:100,lv:1};S.buildings.push(b);
      let bs=selUnits.map(unitById).filter(u=>u&&!u.dead);for(const u of bs)setTask(u,{type:'build',bid:b.id});buildMode=null;}
    function startUpgrade(b){b.upg={p:0};let us=selUnits.map(unitById).filter(u=>u&&u.kind==='disciple');us.forEach(u=>setTask(u,{type:'build',bid:b.id}));return true;}
    function sectCenter(){return {x:50,y:50};}
  `,ctx);
  for(const f of ['econ_core.js','econ_rank.js','econ_rank_ai.js','econ_shop.js','econ_biwu.js','econ_manual.js','econ_promote.js','econ_workpri.js','econ_autobuild.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  return ctx;
}
function fresh(ctx,o){
  o=o||{};ctx.__toasts.length=0;ctx.__assignLog.length=0;
  ctx.ECON_SA1_FORCE=null;ctx.ECON_SA2_FORCE=null;ctx.ECON_SA3_FORCE=null;ctx.ECON_SA4_FORCE=null;ctx.ECON_SA5_FORCE=null;
  const S={time:0,units:[],buildings:[],res:{wood:200,stone:80,fiber:80,food:80,iron:40,herb:40,lingshi:40},
    flags:{peakRealm:1,xian:true},econ:null,nextId:10};
  ctx.S=S;ctx.econInitState(S);S.econ.flags.ranks=true;S.econ.flags.elderAI=true;
  S.buildings.push({id:1,type:'hall',i:48,j:48,built:true,broken:false,lv:2,hp:800,maxhp:800});
  S.buildings.push({id:2,type:'house',i:44,j:44,built:true,broken:false,lv:1,hp:300,maxhp:300});
  S.buildings.push({id:3,type:'wudao',i:40,j:48,built:true,broken:false,lv:1,hp:300,maxhp:300});
  S.units.push({id:100,kind:'player',name:'宗主',x:50,y:50});
  const n=o.n!=null?o.n:4;
  for(let k=0;k<n;k++)S.units.push({id:200+k,kind:'disciple',name:'弟'+k,x:50+k,y:50,realm:1,loyal:80,job:null,task:null});
  if(o.elder!==false)ctx.econAppoint(S.units[1],'zhanglao');
  if(typeof ctx.XW_ECON!=='undefined'&&ctx.XW_ECON.sa2Rt)ctx.XW_ECON.sa2Rt.acc=0,ctx.XW_ECON.sa2Rt.hold={};
  return S;
}
function d(ctx,id){return ctx.S.units.find(u=>u.id===id);}
function lock(ctx,u,sec){u.manualUntil=(ctx.S.time||0)+(sec!=null?sec:300);u.manualJob=u.job||null;u.manualKind=u.job?'job':'stand';}

// ========== 旗標 ==========
{
  const c=load();
  rec('F1 五個 DEFAULT 皆 true',c.ECON_SA1_DEFAULT&&c.ECON_SA2_DEFAULT&&c.ECON_SA3_DEFAULT&&c.ECON_SA4_DEFAULT&&c.ECON_SA5_DEFAULT);
  rec('F2 不在 ECON_FLAGS_DEFAULT',['sa1','sa2','sa3','sa4','sa5'].every(k=>!Object.prototype.hasOwnProperty.call(c.ECON_FLAGS_DEFAULT,k)));
  fresh(c);
  rec('F3 缺旗標＝五項皆開',['sa1','sa2','sa3','sa4','sa5'].every(k=>c.econSaOn(k)===true));
  c.S.econ.flags.sa3=false;
  rec('F4 flags.sa3=false＝關',c.econSaOn('sa3')===false&&c.econSaOn('sa1')===true);
  c.ECON_SA3_FORCE=true;
  rec('F5 FORCE 優先於存檔旗標',c.econSaOn('sa3')===true);
  const off=load('?sa1=0&sa2=0&sa3=0&sa4=0&sa5=0');fresh(off);
  rec('F6 網址 ?sa1=0…?sa5=0 全關',['sa1','sa2','sa3','sa4','sa5'].every(k=>off.econSaOn(k)===false));
  const on=load('?sa3=1');fresh(on);on.S.econ.flags.sa3=false;
  rec('F7 ?sa3=1 蓋過存檔 false',on.econSaOn('sa3')===true);
}

// ========== 提案 3 自動建造 ==========
{
  const c=load();const S=fresh(c,{n:4});
  const idle=d(c,201),gath=d(c,202),locked=d(c,203);
  gath.job='gather';gath.jobRes='wood';gath.x=50;gath.y=50;
  locked.job='gather';locked.jobRes='herb';locked.x=50;locked.y=50;lock(c,locked);
  idle.job=null;idle.x=80;idle.y=80; // 較遠，但應優先於近處的採集者
  const ws=c.econABIdleWorkers({x:50,y:50},4);
  rec('3a 手令鎖的採集者不進工人池',ws.every(u=>u.id!==203),ws.map(u=>u.id));
  const ids=ws.map(u=>u.id);
  rec('3b 真閒置優先於無鎖採集者（即使較遠）',ids.indexOf(201)>=0&&ids.indexOf(202)>=0&&ids.indexOf(201)<ids.indexOf(202),ids);
  rec('3c 無鎖採集者仍可備取',ws.some(u=>u.id===202),ws.map(u=>u.id));
}
{
  const c=load('?sa3=0');const S=fresh(c,{n:3});
  const locked=d(c,202);locked.job='gather';locked.jobRes='herb';lock(c,locked);
  const ws=c.econABIdleWorkers({x:50,y:50},4);
  rec('3d ?sa3=0：手令採集者仍可被抓（舊行為）',ws.some(u=>u.id===202),ws.map(u=>u.id));
}
{
  const c=load();const S=fresh(c,{n:3});
  const locked=d(c,202);locked.job='gather';locked.jobRes='wood';lock(c,locked);
  const w=d(c,201);w.job=null;
  c.econABAuto(()=>c.setTask(w,{type:'build',bid:99}));
  rec('3e 自動施工 setTask 不寫入新手令鎖',!c.econSaManualLocked(w)&&!w.manualUntil,{w:w.manualUntil,task:w.task});
  rec('3f 被鎖弟子的 manualUntil 未被改寫',d(c,202).manualUntil>=300&&c.econSaManualLocked(d(c,202)),{until:d(c,202).manualUntil});
}

// ========== 提案 5 出行／比武 ==========
{
  const c=load();const S=fresh(c,{n:5});
  const wa=d(c,201);c.econAppoint(wa,'waishi');wa.job=null;
  const secl=d(c,202);c.econAppoint(secl,'waishi');secl.job='seclude';
  const locked=d(c,203);c.econAppoint(locked,'waishi');locked.job='gather';lock(c,locked);
  const stand=d(c,204);stand.job=null;lock(c,stand); // 待命鎖
  const L=c.econTradeFreeLeaders();
  rec('5a 閒置外事可帶隊',L.some(u=>u.id===201),L.map(u=>u.id));
  rec('5b 閉關外事不可帶隊',!L.some(u=>u.id===202),L.map(u=>u.id));
  rec('5c 手令鎖外事不可帶隊',!L.some(u=>u.id===203),L.map(u=>u.id));
  const H=c.econTradeIdleHelpers([]);
  rec('5d 待命手令者不進幫手',!H.some(u=>u.id===204),H.map(u=>u.id));
  rec('5e 真閒置外事可當幫手（無職務）',H.some(u=>u.id===201),H.map(u=>u.id));
}
{
  const c=load('?sa5=0');const S=fresh(c,{n:3});
  const locked=d(c,201);c.econAppoint(locked,'waishi');locked.job='seclude';lock(c,locked);
  const L=c.econTradeFreeLeaders();
  rec('5f ?sa5=0：手令／閉關外事仍可被列為帶隊（舊行為）',L.some(u=>u.id===201),L.map(u=>u.id));
}
{
  const c=load();const S=fresh(c,{n:2});
  const u=d(c,201);lock(c,u);
  rec('5g 比武 UnitBusy：手令鎖視為忙碌',c.econBiwuUnitBusy(u)===true);
  const c2=load('?sa5=0');fresh(c2,{n:2});const u2=d(c2,201);lock(c2,u2);
  rec('5h ?sa5=0：手令鎖不單獨算比武忙碌',c2.econBiwuUnitBusy(u2)===false);
}

// ========== 提案 1 採集選資源 ==========
{
  const c=load();const S=fresh(c);
  S.res.wood=200;S.res.herb=0;S.res.stone=80;S.res.food=80;S.res.fiber=80;S.res.iron=40;S.res.lingshi=40;
  const u=d(c,202);
  rec('1a 木充足、藥見底 → 派採藥',c.econPickGatherRes(u)==='herb',c.econPickGatherRes(u));
  rec('1b econGatherResForAssign 同樣走缺口',c.econGatherResForAssign(u)==='herb');
  const lumber=d(c,203);lumber.prof=['lumber'];
  S.res.wood=0;S.res.herb=0; // 兩者都見底（門檻木 40、藥 8），木材缺口 1、藥缺口 1；職業伐木應把木推高
  const rL=c.econPickGatherRes(lumber),rN=c.econPickGatherRes(u);
  rec('1c 木藥同缺時，伐木工優先木材',rL==='wood',{rL,rN});
  const root=d(c,201);root.lg={e:1}; // 木靈根 rootApt wood=1.3
  rec('1d 木藥同缺、木靈根加分選木材',c.econPickGatherRes(root)==='wood',c.econPickGatherRes(root));
}
{
  const c=load();const S=fresh(c,{n:3});
  // 雜役chore：sa1 開時不走 id%7
  S.res.wood=200;S.res.herb=0;
  const z=d(c,202);c.econAppoint(z,'zayi');z.job=null;
  const ok=c.econZayiChore(z);
  rec('1e 雜役雜務改採最缺（藥）而不是 id%7',ok&&z.job==='gather'&&z.jobRes==='herb',{ok,job:z.job,res:z.jobRes,id:z.id});
}
{
  const c=load();const S=fresh(c,{n:2});
  const u=d(c,201);
  const st=c.XW_ECON.workPriState();
  st.rows[String(u.id)]={gather:1,train:0,seclude:0,rest:0,study:0,lecture:0,forge:0,alchemy:0,guard:0,follow:0};
  S.res.wood=200;S.res.herb=0;
  const r=c.XW_ECON.workPriTry(u);
  rec('1f 差事優先採集亦走缺口（藥）',r.ok&&u.job==='gather'&&u.jobRes==='herb',{r,res:u.jobRes});
}
{
  const c=load('?sa1=0');const S=fresh(c,{n:3});
  S.res.wood=200;S.res.herb=0;
  const z=d(c,202);c.econAppoint(z,'zayi');z.job=null;
  c.econZayiChore(z);
  const chores=(c.ECON_ELDER_TUNE.choreJobs||[])[(z.id||0)%7];
  rec('1g ?sa1=0：雜役仍用 id%7 舊規',z.job==='gather'&&z.jobRes===chores[1],{got:z.jobRes,expect:chores[1],id:z.id});
  const u=d(c,201);
  const st=c.XW_ECON.workPriState();
  st.rows[String(u.id)]={gather:1,train:0,seclude:0,rest:0,study:0,lecture:0,forge:0,alchemy:0,guard:0,follow:0};
  c.XW_ECON.workPriTry(u);
  rec('1h ?sa1=0：差事優先採集仍寫死木材',u.job==='gather'&&u.jobRes==='wood',{res:u.jobRes});
  rec('1i ?sa1=0：GatherResForAssign 走第一個告急（仍可為藥）但不影響上兩條舊規',c.econGatherResForAssign(z)==='herb'||c.econGatherResForAssign(z)==='wood');
}

// ========== 提案 2 滯後重分配 ==========
{
  const c=load();const S=fresh(c,{n:3});
  const u=d(c,202);u.job='gather';u.jobRes='wood';u.smart=false;
  c.XW_ECON.sa2Mark(u,'wood');
  S.res.wood=200;S.res.herb=0; // 木遠高於 40*1.5=60，藥見底
  S.time=10;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2a 未滿持有 45 秒：不改派',u.jobRes==='wood',{res:u.jobRes,hold:c.XW_ECON.sa2Rt.hold[u.id]});
  S.time=100;c.XW_ECON.sa2Rt.hold[u.id].t=0;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2b 滿 45 秒且木充足、藥告急：改採藥',u.job==='gather'&&u.jobRes==='herb',{res:u.jobRes,hold:c.XW_ECON.sa2Rt.hold[u.id]});
  // 立刻把藥補滿、木清掉，應因持有時間不夠而不跳回
  S.res.herb=200;S.res.wood=0;
  const tSwitch=c.XW_ECON.sa2Rt.hold[u.id].t;
  S.time=tSwitch+10;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2c 剛改藥後 10 秒：即使木變缺也不跳回（滯後）',u.jobRes==='herb',{res:u.jobRes,hold:c.XW_ECON.sa2Rt.hold[u.id],t:S.time});
  S.time=tSwitch+50;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2d 再滿 45 秒後才改回木材',u.jobRes==='wood',{res:u.jobRes});
}
{
  const c=load();const S=fresh(c,{n:4});
  const u=d(c,202);u.job='gather';u.jobRes='wood';lock(c,u);
  c.XW_ECON.sa2Mark(u,'wood');S.res.wood=200;S.res.herb=0;S.time=100;
  c.XW_ECON.sa2Rt.hold[u.id].t=0;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2e 手令鎖：不重分配',u.jobRes==='wood');
  const sm=d(c,203);sm.job='gather';sm.jobRes='wood';sm.smart=true;
  c.XW_ECON.sa2Mark(sm,'wood');c.XW_ECON.sa2Rt.hold[sm.id].t=0;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2f smart 採集者不被提案 2 改派',sm.jobRes==='wood');
}
{
  const c=load('?sa2=0');const S=fresh(c,{n:2});
  const u=d(c,201);u.job='gather';u.jobRes='wood';
  c.XW_ECON.sa2Mark(u,'wood');S.res.wood=200;S.res.herb=0;S.time=100;
  c.XW_ECON.sa2Rt.hold[u.id].t=0;c.XW_ECON.sa2Rt.acc=0;c.econSa2Tick(20);
  rec('2g ?sa2=0：即使條件滿足也不改派',u.jobRes==='wood');
}
{
  const c=load();const S=fresh(c,{n:2});
  rec('2h 滯後狀態只在執行期、不寫入 S.econ／單位',!S.econ.sa2&&!d(c,201).sa2Hold&&c.XW_ECON.sa2Rt&&typeof c.XW_ECON.sa2Rt.hold==='object');
}

// ========== 提案 4 務農／煉製 ==========
{
  const c=load();const S=fresh(c,{n:4});
  S.buildings.push({id:10,type:'lingtian',i:30,j:30,built:true,broken:false,lv:1,hp:200,maxhp:200});
  const farmer=d(c,202);farmer.prof=['farmer'];farmer.job=null;c.econAppoint(farmer,'zayi');
  const ok=c.XW_ECON.pickAutoJob(farmer);
  rec('4a 空靈田＋靈農雜役 → 務農',ok&&farmer.job==='farm'&&farmer.jobB===10,{ok,job:farmer.job,bid:farmer.jobB});
  const locked=d(c,203);locked.job=null;lock(c,locked);c.econAppoint(locked,'zayi');
  const okL=c.XW_ECON.pickAutoJob(locked);
  rec('4b 手令待命者不被派務農',locked.job==null||locked.job!=='farm',{okL,job:locked.job});
}
{
  const c=load();const S=fresh(c,{n:3});
  S.buildings.push({id:11,type:'alchemy',i:30,j:30,built:true,broken:false,lv:1,hp:300,maxhp:300,econCraftQ:[{id:1,k:'hx',n:2}]});
  const al=d(c,202);al.prof=['alch'];al.job=null;c.econAppoint(al,'waimen');
  const ok=c.XW_ECON.pickAutoJob(al);
  rec('4c 煉丹佇列有單＋煉丹師 → 煉丹',ok&&al.job==='alchemy'&&al.jobB===11,{ok,job:al.job,bid:al.jobB});
}
{
  const c=load();const S=fresh(c,{n:3});
  S.buildings.push({id:11,type:'alchemy',i:30,j:30,built:true,broken:false,lv:1,hp:300,maxhp:300,econCraftQ:[]});
  const al=d(c,202);al.prof=['alch'];al.job=null;c.econAppoint(al,'waimen');
  c.XW_ECON.pickAutoJob(al);
  rec('4d 無佇列、無爐火：不預先佔煉丹位',al.job!=='alchemy',{job:al.job,res:al.jobRes});
}
{
  const c=load('?sa4=0');const S=fresh(c,{n:3});
  S.buildings.push({id:10,type:'lingtian',i:30,j:30,built:true,broken:false,lv:1,hp:200,maxhp:200});
  S.res.wood=200;S.res.herb=0;
  const z=d(c,202);z.prof=['farmer'];z.job=null;c.econAppoint(z,'zayi');
  c.XW_ECON.pickAutoJob(z);
  rec('4e ?sa4=0：不派務農，走舊雜務／採集',z.job!=='farm',{job:z.job,res:z.jobRes});
}
{
  const c=load();
  rec('4f 差事優先本輪不加務農欄',c.XW_ECON.WPRI_JOBS.every(j=>j.id!=='farm'),c.XW_ECON.WPRI_JOBS.map(j=>j.id));
}

// ========== 手令在長老派工路徑 ==========
{
  const c=load();const S=fresh(c,{n:3});
  const u=d(c,202);u.job='train';lock(c,u);
  // assignJob 已被 econ_manual 包裝；自動路徑不得改派
  const r=c.XW_ECON.manualAuto(()=>c.assignJob(u,'gather','herb'));
  rec('M1 自動 assignJob 無法改寫手令職務',r===false&&u.job==='train',{r,job:u.job,until:u.manualUntil});
}

const pass=rows.filter(r=>r.ok).length,fail=rows.length-pass;
console.log(`\nt_econ_smartassign: ${pass}/${rows.length} PASS, ${fail} FAIL`);
if(fail)rows.filter(r=>!r.ok).forEach(r=>console.log('  FAIL',r.n,r.d==null?'':JSON.stringify(r.d).slice(0,300)));
process.exitCode=fail?1:0;
