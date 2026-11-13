// farmYear 預設開：舊存檔遷移、備份不覆寫、重跑／開關不重複入庫與幫忙費。
// Node 單元測試，不開瀏覽器。實際遊玩截圖另跑 play 段。
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const rows=[];
const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+(d==null?'':JSON.stringify(d)).slice(0,700));};

function load(){
  const ctx={
    console,
    S:null,
    TUNE:{dayLen:300},
    ECON_LV_MAX:6,
    __toasts:[],
    location:{search:''},
    document:undefined,
    setTimeout:undefined,
    UNIT_KEEP:[],
    toast:function(m){ctx.__toasts.push(String(m));}
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  for(const f of ['econ_core.js','econ_buildings.js','econ_manual.js','econ_craftq.js']){
    vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  }
  return ctx;
}

function fresh(ctx,opt){
  opt=opt||{};
  ctx.__toasts.length=0;
  ctx.location.search=opt.search||'';
  ctx.ECON_FARMYEAR_FORCE=opt.force==null?null:opt.force;
  const S={
    time:0,
    units:[],
    buildings:[],
    res:{herb:0,food:0,xiacao:0,lingshi:0,wood:0,stone:0},
    flags:{},
    econ:null
  };
  ctx.S=S;
  ctx.econInitState(S);
  S.econ.flags.treasury=true;
  S.econ.flags.newBuildings=!!opt.newBuildings;
  if(opt.farmYear!=null)S.econ.flags.farmYear=!!opt.farmYear;
  ctx.econGrant('vault',opt.vault!=null?opt.vault:10000,'test-fill','xia');
  return S;
}

function bag(ctx){return ctx.econBagXia(ctx.S.econ.vault);}
function field(id,lv){return {id:id||31,type:'lingtian',built:true,broken:false,lv:lv||1};}
function farmer(id,bid){return {id:id,kind:'disciple',name:'農'+id,dead:false,job:'farm',jobB:bid};}

// ── 1 預設開、不進 FLAGS 表、舊存檔缺旗標＝開、?farmyear=0 可關 ──
{
  const ctx=load();
  rec('1a ECON_FARMYEAR_DEFAULT 為 true',ctx.ECON_FARMYEAR_DEFAULT===true,ctx.ECON_FARMYEAR_DEFAULT);
  rec('1b farmYear 不在 ECON_FLAGS_DEFAULT',!Object.prototype.hasOwnProperty.call(ctx.ECON_FLAGS_DEFAULT,'farmYear'),Object.keys(ctx.ECON_FLAGS_DEFAULT));
  const S=fresh(ctx,{newBuildings:true}); // 不寫 flags.farmYear，模擬舊存檔
  rec('1c 舊存檔沒有 farmYear 旗標時 econFarmYearOn 為開',S.econ.flags.farmYear==null&&ctx.econFarmYearOn(S)===true,{flag:S.econ.flags.farmYear,on:ctx.econFarmYearOn(S)});
  ctx.econMigrateSave(S);
  rec('1d econMigrateSave 不會把 farmYear 寫進 flags',S.econ.flags.farmYear==null&&ctx.econFarmYearOn(S)===true,{flag:S.econ.flags.farmYear,flags:S.econ.flags});
  const S0=fresh(ctx,{newBuildings:true,search:'?farmyear=0'});
  rec('1e ?farmyear=0 關閉（缺旗標仍關）',S0.econ.flags.farmYear==null&&ctx.econFarmYearOn(S0)===false,{search:ctx.location.search,on:ctx.econFarmYearOn(S0)});
  const S1=fresh(ctx,{newBuildings:true,farmYear:true,search:'?farmyear=0'});
  rec('1f ?farmyear=0 蓋過 flags.farmYear=true',ctx.econFarmYearOn(S1)===false,{flag:S1.econ.flags.farmYear,on:ctx.econFarmYearOn(S1)});
  const S2=fresh(ctx,{newBuildings:true,farmYear:false,search:'?farmyear=1'});
  rec('1g ?farmyear=1 蓋過 flags.farmYear=false',ctx.econFarmYearOn(S2)===true,{flag:S2.econ.flags.farmYear,on:ctx.econFarmYearOn(S2)});
  const S3=fresh(ctx,{newBuildings:true,farmYear:false});
  rec('1h 顯式 flags.farmYear=false 時關閉（無網址參數）',ctx.econFarmYearOn(S3)===false,{flag:S3.econ.flags.farmYear});
}

// ── 2 已成熟／已累積的整數產量只入庫一次 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true}); // 缺旗標＝開
  const b=field(41);
  S.buildings=[b];
  S.econ.prod.xiacao=5.2;
  S.res.xiacao=0;
  delete S.econ.farmV;delete S.econ.farmBak;
  ctx.econBuildingsMigrate(S);
  rec('2a 成熟累積 5.2：入庫 5、bak=5.2、farmV=2、prod 清零、未瞬間收成、無提示',
    S.econ.farmV===2&&S.econ.farmBak&&S.econ.farmBak.xiacao===5.2&&S.res.xiacao===5
    &&(+S.econ.prod.xiacao||0)===0&&Math.abs((b.econFarmT||0)-30)<1e-6&&ctx.__toasts.length===0,
    {farmV:S.econ.farmV,bak:S.econ.farmBak,res:S.res.xiacao,prod:S.econ.prod.xiacao,t:b.econFarmT,toasts:ctx.__toasts.slice()});
  const bak1=JSON.parse(JSON.stringify(S.econ.farmBak));
  ctx.econBuildingsMigrate(S);
  ctx.econBuildingsTick(0);
  ctx.econFarmYearMigrate(S);
  rec('2b 重跑遷移／tick(0) 不重複入庫、bak 不變、仍無收成提示',
    S.res.xiacao===5&&S.econ.farmBak.xiacao===bak1.xiacao&&S.econ.farmBak.t===bak1.t
    &&(+S.econ.prod.xiacao||0)===0&&ctx.__toasts.length===0,
    {res:S.res.xiacao,bak:S.econ.farmBak,toasts:ctx.__toasts.slice()});
}

// ── 3 還沒有靈田時先入庫並扣 prod，有田再轉進度；bak 不覆寫 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true});
  S.buildings=[];
  S.econ.prod.xiacao=3.7;
  S.res.xiacao=0;
  S.time=10;
  delete S.econ.farmV;delete S.econ.farmBak;
  ctx.econFarmYearMigrate(S);
  rec('3a 無田：整數 3 入庫、prod 留 0.7、寫 bak、尚未標記 farmV',
    S.econ.farmV!==2&&S.econ.farmBak&&S.econ.farmBak.xiacao===3.7&&S.econ.farmBak.t===10
    &&S.res.xiacao===3&&Math.abs((+S.econ.prod.xiacao||0)-0.7)<1e-12,
    {farmV:S.econ.farmV,bak:S.econ.farmBak,res:S.res.xiacao,prod:S.econ.prod.xiacao});
  const bak1=JSON.parse(JSON.stringify(S.econ.farmBak));
  S.time=99;
  S.econ.prod.xiacao=0.7;
  ctx.econFarmYearMigrate(S);
  rec('3b 仍無田再遷移：不重複入庫、bak 不覆寫（t 仍為 10）',
    S.res.xiacao===3&&S.econ.farmV!==2&&S.econ.farmBak.xiacao===bak1.xiacao&&S.econ.farmBak.t===10
    &&Math.abs((+S.econ.prod.xiacao||0)-0.7)<1e-12,
    {res:S.res.xiacao,bak:S.econ.farmBak,prod:S.econ.prod.xiacao});
  const b=field(42);
  S.buildings=[b];
  ctx.econFarmYearMigrate(S);
  rec('3c 之後有田才標記 farmV=2，分數轉進度 0.35 年（105 秒），不再入庫，bak 仍為 3.7',
    S.econ.farmV===2&&S.res.xiacao===3&&(+S.econ.prod.xiacao||0)===0
    &&Math.abs((b.econFarmT||0)-105)<1e-6&&S.econ.farmBak.xiacao===3.7&&S.econ.farmBak.t===10,
    {farmV:S.econ.farmV,res:S.res.xiacao,t:b.econFarmT,bak:S.econ.farmBak,prod:S.econ.prod.xiacao});
  S.econ.prod.xiacao=99;
  S.time=500;
  ctx.econFarmYearMigrate(S);
  rec('3d farmV=2 後再遷移為 no-op，bak 不覆寫、prod 不動',
    S.econ.farmV===2&&S.econ.farmBak.xiacao===3.7&&S.econ.farmBak.t===10
    &&S.econ.prod.xiacao===99&&S.res.xiacao===3,
    {bak:S.econ.farmBak,prod:S.econ.prod.xiacao,res:S.res.xiacao});
}

// ── 4 重跑遷移／模擬重載：不重複收成、不重複幫忙費 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,vault:100});
  const b=field(43);
  const u1=farmer(201,43),u2=farmer(202,43);
  S.buildings=[b];S.units=[u1,u2];
  S.econ.prod.xiacao=1.8;S.res.xiacao=0;
  delete S.econ.farmV;delete S.econ.farmBak;
  const v0=bag(ctx);
  ctx.econBuildingsMigrate(S);
  const w0=(id=>{const w=ctx.econWallet(id,false);return w?ctx.econBagXia(w):0;});
  rec('4a 遷移入庫 1 株、不收幫忙費（金庫與弟子錢包不變）、無收成提示',
    S.res.xiacao===1&&S.econ.farmV===2&&bag(ctx)===v0&&w0(201)===0&&w0(202)===0
    &&ctx.__toasts.length===0&&!(b._hfFarm&&b._hfFarm.paid&&b._hfFarm.paid.length),
    {res:S.res.xiacao,dv:v0-bag(ctx),w1:w0(201),w2:w0(202),toasts:ctx.__toasts.slice(),hf:b._hfFarm});
  ctx.econBuildingsMigrate(S);
  ctx.econBuildingsTick(0);
  rec('4b 立刻再遷移／tick(0)（模擬重載）：仙草仍為 1、不扣幫忙費',
    S.res.xiacao===1&&bag(ctx)===v0&&w0(201)===0&&w0(202)===0&&ctx.__toasts.length===0,
    {res:S.res.xiacao,dv:v0-bag(ctx),toasts:ctx.__toasts.slice()});
  // 有 2 名務農時單次產量 2.8，遷移分數 0.8/2.8，剩餘時間依實際計時計算
  const grow=ctx.econFarmGrowSecOf(b);
  const left=grow-(+b.econFarmT||0);
  ctx.econBuildingsTick(left-1);
  rec('4c 差 1 秒滿一年仍未收成、不收費',S.res.xiacao===1&&bag(ctx)===v0&&ctx.__toasts.length===0,{t:b.econFarmT,grow,left,res:S.res.xiacao});
  ctx.econBuildingsTick(1);
  rec('4d 補滿一年才收成一次並收幫忙費 2 下品（各 1），提示一次',
    S.res.xiacao===3&&v0-bag(ctx)===2&&w0(201)===1&&w0(202)===1
    &&ctx.__toasts.filter(t=>t.indexOf('收成 仙草')===0).length===1,
    {res:S.res.xiacao,dv:v0-bag(ctx),w1:w0(201),w2:w0(202),toasts:ctx.__toasts.slice(),hf:b._hfFarm});
  const res1=S.res.xiacao,v1=bag(ctx),a1=w0(201),a2=w0(202),t1=ctx.__toasts.length;
  ctx.econBuildingsMigrate(S);
  ctx.econBuildingsTick(0);
  ctx.econFarmYearMigrate(S);
  ctx.econBuildingsTick(0);
  rec('4e 收成後再遷移／重載兩次：不重複收成、不重複幫忙費',
    S.res.xiacao===res1&&bag(ctx)===v1&&w0(201)===a1&&w0(202)===a2&&ctx.__toasts.length===t1,
    {res:S.res.xiacao,dv:v1-bag(ctx),w1:w0(201),w2:w0(202),toasts:ctx.__toasts.slice()});
}

// ── 5 關→開→關 不重複入庫、bak 不覆寫 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true});
  const b=field(44);
  S.buildings=[b];
  S.econ.prod.xiacao=2.5;S.res.xiacao=0;
  delete S.econ.farmV;delete S.econ.farmBak;
  ctx.econBuildingsMigrate(S);
  rec('5a 先開並遷移：入庫 2、bak=2.5、farmV=2',S.econ.farmV===2&&S.res.xiacao===2&&S.econ.farmBak.xiacao===2.5,{res:S.res.xiacao,bak:S.econ.farmBak});
  const bak1=JSON.parse(JSON.stringify(S.econ.farmBak));
  // 關掉走舊連續累積 150 秒＝1 株（新長出來的，不是遷移重複）
  S.econ.flags.farmYear=false;
  ctx.ECON_FARMYEAR_FORCE=null;
  ctx.location.search='';
  rec('5b 關掉後 econFarmYearOn 為假',ctx.econFarmYearOn(S)===false,true);
  ctx.econBuildingsTick(150);
  rec('5c 旗關 150 秒新長 1 株（舊制），bak 不變',S.res.xiacao===3&&S.econ.farmBak.xiacao===bak1.xiacao&&S.econ.farmBak.t===bak1.t,{res:S.res.xiacao,prod:S.econ.prod.xiacao,bak:S.econ.farmBak});
  // 再打開：farmV=2，遷移 no-op，不可把舊 2.5 再入庫一次
  delete S.econ.flags.farmYear; // 缺值＝預設開
  ctx.__toasts.length=0;
  const resOff=S.res.xiacao;
  ctx.econBuildingsMigrate(S);
  rec('5d 再打開遷移為 no-op：不把已入庫的 2 再發一次，bak 不覆寫',
    S.econ.farmV===2&&S.res.xiacao===resOff&&S.econ.farmBak.xiacao===2.5&&S.econ.farmBak.t===bak1.t&&ctx.__toasts.length===0,
    {res:S.res.xiacao,bak:S.econ.farmBak,toasts:ctx.__toasts.slice()});
  S.econ.flags.farmYear=false;
  ctx.econBuildingsMigrate(S);
  rec('5e 再關掉遷移不跑：res／bak 不變',S.res.xiacao===resOff&&S.econ.farmBak.xiacao===2.5&&S.econ.farmV===2,{res:S.res.xiacao,bak:S.econ.farmBak});
  delete S.econ.flags.farmYear;
  ctx.econBuildingsMigrate(S);
  rec('5f 第三次打開仍 no-op，沒有重複入庫',S.res.xiacao===resOff&&S.econ.farmBak.xiacao===2.5,{res:S.res.xiacao,bak:S.econ.farmBak});
}

// ── 6 關→開→關 期間不重複幫忙費 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,vault:100});
  const b=field(45);
  const u1=farmer(301,45);
  S.buildings=[b];S.units=[u1];S.econ.farmV=2;S.res.xiacao=0;
  const v0=bag(ctx);
  ctx.econBuildingsTick(300);
  rec('6a 旗開滿一年：收成一次、幫忙費 1 下品',
    v0-bag(ctx)===1&&(ctx.econWallet(301,false)?ctx.econBagXia(ctx.econWallet(301,false)):0)===1
    &&ctx.__toasts.indexOf('收成 仙草 +2')>=0,
    {dv:v0-bag(ctx),res:S.res.xiacao,toasts:ctx.__toasts.slice()});
  const v1=bag(ctx),res1=S.res.xiacao,w1=ctx.econBagXia(ctx.econWallet(301,false));
  S.econ.flags.farmYear=false;
  ctx.econBuildingsTick(1);
  rec('6b 收成後立刻關掉再 tick 1 秒：不再扣幫忙費、不再收成',
    bag(ctx)===v1&&S.res.xiacao===res1&&ctx.econBagXia(ctx.econWallet(301,false))===w1,
    {dv:v1-bag(ctx),res:S.res.xiacao,w:ctx.econBagXia(ctx.econWallet(301,false)),hf:b._hfFarm});
  delete S.econ.flags.farmYear;
  ctx.econBuildingsMigrate(S);
  ctx.econBuildingsTick(1);
  rec('6c 再打開 tick 1 秒：不重複收費、不重複收成',
    bag(ctx)===v1&&S.res.xiacao===res1&&ctx.econBagXia(ctx.econWallet(301,false))===w1,
    {dv:v1-bag(ctx),res:S.res.xiacao,t:b.econFarmT});
  S.econ.flags.farmYear=false;
  ctx.econBuildingsTick(1);
  rec('6d 再關掉 tick 1 秒：仍不重複',
    bag(ctx)===v1&&S.res.xiacao===res1&&ctx.econBagXia(ctx.econWallet(301,false))===w1,
    {dv:v1-bag(ctx),res:S.res.xiacao});
}

const pass=rows.filter(r=>r.ok).length;
console.log('TOTAL',pass+'/'+rows.length);
process.exit(rows.every(r=>r.ok)?0:1);
