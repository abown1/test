// 遊戲年 300 秒：俸祿一年一次、保養總額不變、手令文字、靈田 farmYear 旗標（預設開＝一年一收；顯式關或 ?farmyear=0＝舊行為）。
// Node 單元測試，不開瀏覽器。實際遊玩截圖另跑 play 段（見檔尾註）。
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const rows=[];
const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+(d==null?'':JSON.stringify(d)).slice(0,500));};

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

// ── 1 俸祿每 300 秒一次 ──
{
  const ctx=load();
  const S=fresh(ctx);
  rec('1a econYearSec 後備為 300（無 CULT_LIFE_CFG）',ctx.econYearSec()===300,ctx.econYearSec());
  rec('1b ECON_PAY_PERIOD_SEC 仍為 300',ctx.ECON_PAY_PERIOD_SEC===300&&ctx.econPayPeriodLen()===300,{sec:ctx.ECON_PAY_PERIOD_SEC});
  rec('1c 俸祿說明為「每 1年發一次（每 5 分鐘）」',ctx.econMonthNote()==='俸祿每 1年發一次（每 5 分鐘）。',ctx.econMonthNote());
  rec('1d payPeriodText.slash 為 1年',ctx.econPayPeriodText().slash==='1年',ctx.econPayPeriodText());
  S.econ.payNextT=300;S.econ.lastMonth=-1;
  const led0=(S.econ.ledgers||[]).length;
  S.time=299;ctx.econTick(1);
  const once299=S.econ.payNextT===300;
  S.time=300;ctx.econTick(1);
  const first=S.econ.payNextT===600;
  S.time=599;ctx.econTick(1);
  const hold=S.econ.payNextT===600;
  S.time=600;ctx.econTick(1);
  const second=S.econ.payNextT===900;
  rec('1e 俸祿排程：299 不發、300 發一次、599 不發、600 再發',once299&&first&&hold&&second,{payNextT:S.econ.payNextT,led:(S.econ.ledgers||[]).length-led0});
}

// ── 2 保養：9000 秒總額與舊制相同 ──
{
  const ctx=load();
  const S=fresh(ctx);
  rec('2a 保養週期改為 300',ctx.ECON_UPKEEP_PERIOD_SEC===300&&ctx.econUpkeepPeriodLen()===300&&ctx.ECON_UPKEEP_SCALE===30,ctx.ECON_UPKEEP_PERIOD_SEC);
  // 一座無目錄建築 → ECON_TUNE.upkeepXia=8；舊制每 9000 秒扣 8，新制每年扣 8/30，30 年合計 8
  S.buildings=[{id:1,type:'hall',built:true,broken:false,lv:1}];
  S.econ.upkeepNextT=300;S.econ.upkeepYearV=1;S.econ.upkeepCarry=0;S.econ.upkeepPaid=0;
  const v0=bag(ctx);
  for(let t=300;t<=9000;t+=300){S.time=t;ctx.econTick(1);}
  rec('2b 一座 upkeepXia=8 的建築，9000 秒共扣 8（與舊月額相同）',S.econ.upkeepPaid===8&&v0-bag(ctx)===8,{paid:S.econ.upkeepPaid,dv:v0-bag(ctx),carry:S.econ.upkeepCarry});
}

// ── 3 手令剩餘時間用 econPrettySpan，LOCK_SEC=300＝1 年 ──
{
  const ctx=load();
  const S=fresh(ctx);
  const u={kind:'disciple',id:11,name:'甲',dead:false};
  S.units=[u];S.time=0;
  rec('3a XW_ECON.manualSec 仍為 300',ctx.XW_ECON&&ctx.XW_ECON.manualSec===300,ctx.XW_ECON&&ctx.XW_ECON.manualSec);
  ctx.XW_ECON.manualLock(u,'stand',null);
  rec('3b 剛下手令：剩 1 年',ctx.XW_ECON.manualLabel(u)==='奉命待命：剩 1 年',ctx.XW_ECON.manualLabel(u));
  S.time=150;
  rec('3c 過 150 秒：剩 6 個月',ctx.XW_ECON.manualLabel(u)==='奉命待命：剩 6 個月',ctx.XW_ECON.manualLabel(u));
  S.time=299;
  rec('3d 剩不到一個月',ctx.XW_ECON.manualLabel(u)==='奉命待命：剩 不到一個月',ctx.XW_ECON.manualLabel(u));
}

// ── 4 靈田：旗關＝舊連續累積，不寫 farmV／econFarmT 收成 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,farmYear:false});
  rec('4a 顯式 flags.farmYear=false 時關閉',ctx.econFarmYearOn(S)===false,{flag:S.econ.flags.farmYear,on:ctx.econFarmYearOn(S)});
  const b={id:21,type:'lingtian',built:true,broken:false,lv:1};
  S.buildings=[b];S.res.xiacao=0;S.econ.prod.xiacao=0;
  const e=ctx.econBuildingEffect('lingtian',1);
  rec('4b 旗關時 growSec 用 dayLen（300），不是年秒另行改週期',e&&e.growSec===300&&e.yieldPerHarvest===2,e);
  ctx.econBuildingsTick(150);
  rec('4c 旗關 150 秒收 1 株（2/300×150），走 prod.xiacao，無收成提示',S.res.xiacao===1&&(+S.econ.prod.xiacao||0)<1e-9&&!b.econFarmT&&S.econ.farmV!==2&&ctx.__toasts.length===0,{res:S.res.xiacao,prod:S.econ.prod.xiacao,t:b.econFarmT,farmV:S.econ.farmV,toasts:ctx.__toasts.slice()});
  ctx.econBuildingsTick(150);
  rec('4d 再 150 秒再收 1 株，共 2（與舊制相同）',S.res.xiacao===2,{res:S.res.xiacao,prod:S.econ.prod.xiacao});
}

// ── 5 旗開：一年一收、小數結轉、提示 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,farmYear:true});
  rec('5a flags.farmYear=true 時 econFarmYearOn 為真',ctx.econFarmYearOn(S)===true,true);
  const b={id:22,type:'lingtian',built:true,broken:false,lv:2}; // yield 2*1.15=2.3
  S.buildings=[b];S.res.xiacao=0;S.econ.prod.xiacao=0;S.econ.farmV=2; // 新田，跳過遷移
  const e=ctx.econBuildingEffect('lingtian',2);
  rec('5b 旗開時 growSec＝econYearSec()＝300，產量 2.3',e&&e.growSec===300&&e.yieldPerHarvest===2.3,{growSec:e&&e.growSec,yld:e&&e.yieldPerHarvest});
  ctx.econBuildingsTick(299);
  rec('5c 299 秒尚未收成，計時前進',S.res.xiacao===0&&Math.abs((b.econFarmT||0)-299)<1e-9&&ctx.__toasts.length===0,{t:b.econFarmT,res:S.res.xiacao});
  ctx.econBuildingsTick(1);
  rec('5d 滿一年收成 2 株（2.3 的整數），提示「收成 仙草 +2」，小數 0.3 結轉',S.res.xiacao===2&&Math.abs((b.econFarmCarry||0)-0.3)<1e-9&&Math.abs(b.econFarmT)<1e-6&&ctx.__toasts.indexOf('收成 仙草 +2')>=0,{res:S.res.xiacao,carry:b.econFarmCarry,t:b.econFarmT,toasts:ctx.__toasts.slice()});
  ctx.__toasts.length=0;
  ctx.econBuildingsTick(300);
  rec('5e 第二年：2.3+0.3＝2.6 → 再收 2，結轉 0.6',S.res.xiacao===4&&Math.abs((b.econFarmCarry||0)-0.6)<1e-9&&ctx.__toasts.indexOf('收成 仙草 +2')>=0,{res:S.res.xiacao,carry:b.econFarmCarry,toasts:ctx.__toasts.slice()});
  // 一次跨兩年
  ctx.__toasts.length=0;
  ctx.econBuildingsTick(600);
  rec('5f 一次 tick 600 秒收兩次（2.3+0.6=2.9→2 結 0.9；再 2.3+0.9=3.2→3 結 0.2），總 9',S.res.xiacao===9&&Math.abs((b.econFarmCarry||0)-0.2)<1e-9&&ctx.__toasts.filter(t=>t.indexOf('收成 仙草')===0).length===2,{res:S.res.xiacao,carry:b.econFarmCarry,toasts:ctx.__toasts.slice()});
}

// ── 6 遷移一次、不瞬間成熟、備份不覆寫 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,farmYear:true});
  const b={id:23,type:'lingtian',built:true,broken:false,lv:1};
  S.buildings=[b];
  S.econ.prod.xiacao=1.8; // 整數 1 入庫，小數 0.8／每收 2 ＝ 0.4 週期
  S.res.xiacao=0;
  delete S.econ.farmV;delete S.econ.farmBak;
  ctx.econBuildingsMigrate(S);
  const t1=b.econFarmT;
  rec('6a 遷移：farmV=2、bak.xiacao=1.8、整數入庫 1、進度 0.4 年（120 秒）、prod 清零、未瞬間收成',S.econ.farmV===2&&S.econ.farmBak&&S.econ.farmBak.xiacao===1.8&&S.res.xiacao===1&&Math.abs(t1-120)<1e-6&&(+S.econ.prod.xiacao||0)===0&&ctx.__toasts.length===0,{farmV:S.econ.farmV,bak:S.econ.farmBak,res:S.res.xiacao,t:t1,prod:S.econ.prod.xiacao});
  // 不會一載入就熟：還要 180 秒
  ctx.econBuildingsTick(179);
  rec('6b 再走 179 秒仍未收成',S.res.xiacao===1&&ctx.__toasts.length===0,{t:b.econFarmT,res:S.res.xiacao});
  ctx.econBuildingsTick(1);
  rec('6c 補滿一年才收成',S.res.xiacao===3&&ctx.__toasts.indexOf('收成 仙草 +2')>=0,{res:S.res.xiacao,toasts:ctx.__toasts.slice(),t:b.econFarmT});
  // 上限 0.999：大量小數不會讓田立刻熟
  const S2=fresh(ctx,{newBuildings:true,farmYear:true,vault:10000});
  ctx.__toasts.length=0;
  const b2={id:24,type:'lingtian',built:true,broken:false,lv:1};
  S2.buildings=[b2];
  S2.econ.prod.xiacao=0.999; // <1，全是小數
  // 但比例 0.999/2=0.4995 < 0.999 cap；用超大「未入庫」小數：先塞 0 + 我們用 harvest 很小？改用 prod=10.5 測整數入庫，再用另一田 prod 只留很大分數。
  // 直接測 cap：yield=2，若 fracPart 很大… fracPart <1 after floor. 要觸發 0.999 cap，需要 fracPart/totalY > 0.999，即 fracPart > 0.999*totalY。
  // 若有兩田 totalY=4，fracPart 最大 0.999… 不夠。若產量極低？
  // 改為：沒有產量（沒田）不標記；有田但 harvest 極小。或手動把 prod 的小數對很小的 harvest。
  // 規格：max 0.999 of a cycle。用 harvest=2, fracPart=0.8 → 0.4 已測。另測「即使把進度算成 ≥1 也會卡住 0.999」。
  // 做一個 yield 很小的情況不容易。直接在 migrate 前把 prod.xiacao 設成 0.999 且想像 totalY 很小。
  // 若 totalY=2, 0.999/2=0.4995。無法超過 cap。cap 是防「轉換後進度 ≥ 1」。當 leftover ≥ 一整收時，先把整數入庫，剩下 <1。若單田收成 <1（例如沒人、小數產量），才會碰 cap。
  // Lv1 無弟子收成=(2/300)*300=2。永遠 fracPart<1 → frac<0.5。
  // 若有很多田？分數攤得更薄。若零產量田 harvest=0 不進 totalY。
  // cap 在「單田收成 < 1」時才有意義，例如我們暫時把 dayLen 拉大？或手動呼叫時總收成 0.5、prod 小數 0.5 → frac=1 → cap 0.999。
  // 測法：放一座田但讓 yield 變成很小。最簡單是 stub econFarmYieldOf? 或設一支沒內建效果的？
  // 用 window / 暫時包 econFarmYieldOf 不行，已經在 ctx。
  // 改：建一座 lingtian 後暫時把 catalog yield 弄小？不要改 catalog。
  // 直接測 cap 路徑：把 TUNE.dayLen 設很大，讓 harvest = 2/10000*300=0.06，fracPart=0.8 → 0.8/0.06>1 → cap 0.999。
  ctx.TUNE.dayLen=10000;
  const S3=fresh(ctx,{newBuildings:true,farmYear:true,vault:10000});
  ctx.__toasts.length=0;
  const b3={id:25,type:'lingtian',built:true,broken:false,lv:1};
  S3.buildings=[b3];S3.res.xiacao=0;S3.econ.prod.xiacao=0.8;delete S3.econ.farmV;delete S3.econ.farmBak;
  ctx.econBuildingsMigrate(S3);
  const grow=ctx.econFarmGrowSecOf(b3);
  const frac=b3.econFarmT/grow;
  rec('6d 進度上限 0.999 週期（產率低、剩餘分數會超過一輪時不瞬間成熟）',S3.econ.farmV===2&&Math.abs(frac-0.999)<1e-9&&ctx.__toasts.length===0&&S3.res.xiacao===0,{frac:frac,t:b3.econFarmT,grow:grow,res:S3.res.xiacao,bak:S3.econ.farmBak});
  ctx.TUNE.dayLen=300;
  // 遷移只跑一次、備份不覆寫
  const bak1=JSON.parse(JSON.stringify(S.econ.farmBak));
  const tKeep=t1;
  S.econ.prod.xiacao=0.5;
  b.econFarmT=120;
  ctx.econBuildingsMigrate(S);
  rec('6e 第二次遷移不重跑、bak 不覆寫、計時不變',S.econ.farmV===2&&S.econ.farmBak.xiacao===bak1.xiacao&&S.econ.prod.xiacao===0.5&&Math.abs(b.econFarmT-120)<1e-9,{bak:S.econ.farmBak,prod:S.econ.prod.xiacao,t:b.econFarmT});
}

// ── 7 網址 ?farmyear=1 可打開；幫忙費在旗開時於收成當下才扣 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,farmYear:false,search:'?farmyear=1',vault:100});
  rec('7a ?farmyear=1 開啟旗標',ctx.econFarmYearOn(S)===true,{search:ctx.location.search,flag:S.econ.flags.farmYear});
  const b={id:26,type:'lingtian',built:true,broken:false,lv:1};
  const u1={id:101,kind:'disciple',name:'農一',dead:false,job:'farm',jobB:26};
  const u2={id:102,kind:'disciple',name:'農二',dead:false,job:'farm',jobB:26};
  S.buildings=[b];S.units=[u1,u2];S.econ.farmV=2;S.res.xiacao=0;
  const v0=bag(ctx);
  ctx.econBuildingsTick(1);
  rec('7b 旗開時 1 秒不收幫忙費、不收成',bag(ctx)===v0&&S.res.xiacao===0&&!(b._hfFarm&&b._hfFarm.paid&&b._hfFarm.paid.length),{dv:v0-bag(ctx),res:S.res.xiacao,hf:b._hfFarm});
  ctx.econBuildingsTick(299);
  const w1=ctx.econWallet(u1.id,false),w2=ctx.econWallet(u2.id,false);
  const a1=w1?ctx.econBagXia(w1):0,a2=w2?ctx.econBagXia(w2):0;
  const yld=ctx.econFarmYieldOf(b);
  rec('7c 滿一年收成並各收 1 下品幫忙費（金庫 -2），兩人加成都算',v0-bag(ctx)===2&&a1===1&&a2===1&&yld.workers===2&&Math.abs((b.econFarmCarry||0)-0.8)<1e-9&&ctx.__toasts.indexOf('收成 仙草 +2')>=0,{res:S.res.xiacao,dv:v0-bag(ctx),a1,a2,workers:yld.workers,carry:b.econFarmCarry,toasts:ctx.__toasts.slice(),wallets:S.econ.wallets});
}

// ── 8 關掉 farmYear 時遷移不跑 ──
{
  const ctx=load();
  const S=fresh(ctx,{newBuildings:true,farmYear:false});
  S.econ.prod.xiacao=1.8;delete S.econ.farmV;delete S.econ.farmBak;
  S.buildings=[{id:27,type:'lingtian',built:true,broken:false,lv:1}];
  ctx.econBuildingsMigrate(S);
  rec('8 旗關時不遷移、不寫 farmV／farmBak',S.econ.farmV!==2&&!S.econ.farmBak&&S.econ.prod.xiacao===1.8,{farmV:S.econ.farmV,bak:S.econ.farmBak,prod:S.econ.prod.xiacao});
}

console.log('TOTAL',rows.filter(r=>r.ok).length+'/'+rows.length);
process.exit(rows.every(r=>r.ok)?0:1);
