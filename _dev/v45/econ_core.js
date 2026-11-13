// ================== 仙武經濟：核心（旗標／總庫／四品靈石／帳本／修煉介面）==================
// 旗關時公開函式為 no-op（不改 S）；僅 econInitState／econMigrateSave 在被顯式呼叫時寫入預設欄位。
var ECON_VER=1;
// 單一宗門倉庫轉接（2026-11-13）：XW_STORE 開著、已綁定且不是客機時回傳 XW_STORE；否則 null → 走舊寫法（?singlestore=0 退回、客機照舊本機寫）
function econXws(){try{if(typeof XW_STORE==='undefined'||!XW_STORE||!XW_STORE.enabled||!XW_STORE.enabled())return null;if(typeof NET!=='undefined'&&NET&&NET.role==='client')return null;
  if(XW_STORE.isBound&&!XW_STORE.isBound()&&XW_STORE.rebind)XW_STORE.rebind('econ');return (!XW_STORE.isBound||XW_STORE.isBound())?XW_STORE:null;}catch(e){return null;}}
var ECON_PAY_PERIOD_SEC=300; // 俸祿一期＝一個遊戲年（300 秒＝現實 5 分鐘）
var ECON_UPKEEP_PERIOD_SEC=300; // 建築保養每遊戲年一次（300 秒）；金額為舊月額／30，總支出不變
var ECON_STIPEND_SCALE=30; // 俸祿每期＝舊月額／30，使總支出不變
var ECON_UPKEEP_SCALE=30; // 保養每期＝舊月額／30，使總支出不變（舊週期 9000 秒）
var ECON_STIPEND_BASE={zhangmen:0,zhanglao:20,zhifa:15,waishi:12,neimen:8,waimen:4,zayi:2};
var ECON_GRADES=['xia','zhong','shang','ji'];
var ECON_GRADE_NAME={xia:'下品靈石',zhong:'中品靈石',shang:'上品靈石',ji:'極品靈石'};
var ECON_RATE=100;
var ECON_FLAGS_DEFAULT={
  treasury:false,  // 四品靈石、總庫、俸祿、稅率、帳本
  shop:false,      // 弟子小店舖、委託製作、倉庫購買
  mine:false,      // 礦場＋靈脈採集加成
  store:false,     // 背包擴充、納海戒
  build:false,     // 全建築 6 級、費用 ×3、大殿上限
  cult:false,      // 修煉消耗、廢丹率 API（給仙武修煉呼叫）
  market:false,    // 城市／他宗供需、商隊
  newBuildings:false, // §7 新建築目錄（僅清單；需顯式 register）
  bldDescLv:true     // 建築介紹顯示目前／下一級實際加成（顯示專用，預設開；使用者點名要隨等級變）
};
var ECON_FARMYEAR_DEFAULT=true; // 不放進 ECON_FLAGS_DEFAULT：g23 ?dev=1 會把該表所有鍵設為 true。缺值／未寫入＝開；顯式 flags.farmYear===false 或 ?farmyear=0 可關
var ECON_OFFICE_NAME={
  zhangmen:'掌門',zhanglao:'長老',zhifa:'執法',
  waishi:'外事',neimen:'內門',waimen:'外門',zayi:'雜役'
};
var ECON_TUNE={
  rate:100,
  taxMin:0.10,taxMax:0.20,taxDef:0.15,
  stipend:{zhangmen:0,zhanglao:20/30,zhifa:15/30,waishi:12/30,neimen:8/30,waimen:4/30,zayi:2/30},
  monthDays:30,                 // 一個月＝1/12 遊戲年＝25 秒（遊戲年 300 秒）
  upkeepXia:8,                  // 待確認：每座已落成建築舊月額維修（下品）；實際每年扣 1/30
  cultBaseXia:2,                // 一整個小階總消耗（下品）；realm 0–3 免費，煉氣起扣
  cultRealmMul:3,               // 待確認：每大境界 ×3
  cultGradeFrom:[0,0,0,0,1,1,2,2,3,3,3,3], // realm→偏好品階
  wasteNovice:0.60,wasteMaster:0.10,wasteMaxLv:10, // 待確認
  incomeRealmScale:1.15,        // 待確認：掉落／任務收入隨境界縮放
  laborBase:5,                  // 待確認：委託／店舖手工費（下品）
  ledgerMax:400,
  eventMax:200
};
function econFlag(k){
  try{
    if(typeof S==='undefined'||!S||!S.econ||!S.econ.flags)return false;
    return !!S.econ.flags[k];
  }catch(e){return false;}
}
function econAnyFlag(){
  try{
    if(typeof S==='undefined'||!S||!S.econ||!S.econ.flags)return false;
    const F=S.econ.flags;for(const k in ECON_FLAGS_DEFAULT)if(F[k])return true;
    return false;
  }catch(e){return false;}
}
function econDayLen(){
  try{if(typeof TUNE!=='undefined'&&TUNE&&TUNE.dayLen)return TUNE.dayLen;}catch(e){}
  return 300;
}
function econYearSec(){
  try{if(typeof CULT_LIFE_CFG!=='undefined'&&CULT_LIFE_CFG&&CULT_LIFE_CFG.YEAR_SEC>0)return +CULT_LIFE_CFG.YEAR_SEC;}catch(e){}
  return 300;
}
function econPrettyAmt(n){
  n=+n||0;
  if(!isFinite(n))return '0';
  const lo=Math.floor(n+1e-9),hi=Math.ceil(n-1e-9);
  if(lo===hi)return String(lo);
  return lo+'～'+hi;
}
function econPrettySpan(sec){
  sec=Math.max(0,+sec||0);
  const ys=econYearSec();
  const years=sec/Math.max(1e-6,ys);
  if(years>=1){
    const lo=Math.floor(years+1e-9),hi=Math.ceil(years-1e-9);
    if(lo===hi)return lo+' 年';
    return lo+'～'+hi+' 年';
  }
  const months=years*12;
  if(months>=1){
    const lo=Math.floor(months+1e-9),hi=Math.ceil(months-1e-9);
    if(lo===hi)return lo+' 個月';
    return lo+'～'+hi+' 個月';
  }
  return '不到一個月';
}
function econPrettyMulDelta(mul){
  mul=+mul;
  if(!isFinite(mul))return '不變';
  const pct=Math.round((mul-1)*100);
  if(!pct)return '不變';
  return (pct>0?'提高 ':'降低 ')+Math.abs(pct)+'％';
}
function econClamp(v,a,b){v=+v||0;if(v<a)return a;if(v>b)return b;return v;}
function econNow(){try{return (typeof S!=='undefined'&&S&&S.time!=null)?S.time:0;}catch(e){return 0;}}
function econGradeIdx(g){const i=ECON_GRADES.indexOf(g);return i<0?0:i;}
function econToXia(g,n){n=+n||0;const i=econGradeIdx(g);let x=n;for(let k=0;k<i;k++)x*=ECON_RATE;return x;}
function econFromXia(xia){
  xia=Math.max(0,Math.floor(+xia||0));
  const out={xia:0,zhong:0,shang:0,ji:0};
  out.ji=Math.floor(xia/1000000);xia-=out.ji*1000000;
  out.shang=Math.floor(xia/10000);xia-=out.shang*10000;
  out.zhong=Math.floor(xia/100);xia-=out.zhong*100;
  out.xia=xia;return out;
}
function econBagXia(bag){
  if(!bag)return 0;
  if(typeof bag==='number')return Math.max(0,+bag||0);
  let t=0;for(const g of ECON_GRADES)t+=econToXia(g,bag[g]||0);return t;
}
function econFmtXiaGrade(xia){
  xia=Math.max(0,Math.round(+xia||0));
  const b=econFromXia(xia);
  const order=['ji','shang','zhong','xia'];
  const short={ji:'極品',shang:'上品',zhong:'中品',xia:'下品'};
  const parts=[];
  for(const g of order){if(b[g])parts.push(b[g]+' '+short[g]);}
  if(!parts.length)parts.push('0 下品');
  return parts.join(' ');
}
function econEmptyBag(){return {xia:0,zhong:0,shang:0,ji:0};}
function econCopyBag(b){const o=econEmptyBag();if(!b)return o;for(const g of ECON_GRADES)o[g]=Math.max(0,Math.floor(+b[g]||0));return o;}

function econDefaultState(){
  return {
    v:ECON_VER,
    flags:Object.assign({},ECON_FLAGS_DEFAULT),
    vault:econEmptyBag(),
    taxRate:ECON_TUNE.taxDef,
    stipend:Object.assign({},ECON_TUNE.stipend),
    payMode:'lsThenCb',payOrder:null,owed:[],owedNext:1,stipendScaleV:1,
    monthT:0,lastMonth:-1,payNextT:null,upkeepNextT:null,upkeepPaid:0,upkeepCarry:0,upkeepYearV:1,
    ledgers:[],
    wallets:{},
    market:{prices:{},drift:{},caravans:[],tick:0},
    shops:{listings:[],orders:[],nextId:1},
    commissions:[],
    rings:{},
    bagBuy:{},
    rng:{seed:0,a:0},
    prod:{herb:0,food:0},
    cultCarry:0,
    feeCfg:{},
    trades:{nextId:1,missions:[],log:[]},
    aucAuto:{on:true,budgetPct:0.20,cats:{},consign:{},log:[]}
  };
}
function econInitState(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  T.econ=econDefaultState();
  try{if(T.res&&T.res.lingshi)T.econ.vault.xia=Math.max(0,Math.floor(T.res.lingshi));}catch(e){}
  return T.econ;
}
function econMigrateSave(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.econ||typeof T.econ!=='object'){
    T.econ=econDefaultState();
    try{if(T.res&&T.res.lingshi)T.econ.vault.xia=Math.max(0,Math.floor(T.res.lingshi));}catch(e){}
  }else{
    const D=econDefaultState();
    if(T.econ.v==null)T.econ.v=D.v;
    if(!T.econ.flags||typeof T.econ.flags!=='object')T.econ.flags=Object.assign({},ECON_FLAGS_DEFAULT);
    else{for(const k in ECON_FLAGS_DEFAULT)if(T.econ.flags[k]==null)T.econ.flags[k]=ECON_FLAGS_DEFAULT[k];}
    if(!T.econ.vault||typeof T.econ.vault!=='object')T.econ.vault=econEmptyBag();
    else{for(const g of ECON_GRADES)if(T.econ.vault[g]==null)T.econ.vault[g]=0;}
    if(T.econ.taxRate==null)T.econ.taxRate=D.taxRate;
    T.econ.taxRate=econClamp(T.econ.taxRate,ECON_TUNE.taxMin,ECON_TUNE.taxMax);
    if(!T.econ.stipend||typeof T.econ.stipend!=='object')T.econ.stipend=Object.assign({},ECON_TUNE.stipend);
    else{for(const k in ECON_TUNE.stipend)if(T.econ.stipend[k]==null)T.econ.stipend[k]=ECON_TUNE.stipend[k];}
    if(!T.econ.payMode)T.econ.payMode='lsThenCb';
    if(!Array.isArray(T.econ.payOrder))T.econ.payOrder=null;
    if(!Array.isArray(T.econ.owed))T.econ.owed=[];
    if(T.econ.owedNext==null)T.econ.owedNext=1;
    if(T.econ.monthT==null)T.econ.monthT=0;
    if(T.econ.lastMonth==null)T.econ.lastMonth=-1;
    if(T.econ.payNextT!=null&&!isFinite(+T.econ.payNextT))T.econ.payNextT=null;
    if(T.econ.upkeepNextT!=null&&!isFinite(+T.econ.upkeepNextT))T.econ.upkeepNextT=null;
    if(T.econ.upkeepCarry==null||!isFinite(+T.econ.upkeepCarry))T.econ.upkeepCarry=0;
    if(T.econ.stipendScaleV!==1){
      const B=ECON_STIPEND_BASE;
      if(!T.econ.stipend||typeof T.econ.stipend!=='object')T.econ.stipend={};
      for(const k in B)if(T.econ.stipend[k]==null)T.econ.stipend[k]=B[k];
    }
    if(!Array.isArray(T.econ.ledgers))T.econ.ledgers=[];
    if(!T.econ.wallets||typeof T.econ.wallets!=='object')T.econ.wallets={};
    if(!T.econ.market||typeof T.econ.market!=='object')T.econ.market=D.market;
    else{
      if(!T.econ.market.prices)T.econ.market.prices={};
      if(!T.econ.market.drift)T.econ.market.drift={};
      if(!Array.isArray(T.econ.market.caravans))T.econ.market.caravans=[];
    }
    if(!T.econ.shops||typeof T.econ.shops!=='object')T.econ.shops=D.shops;
    else{
      if(!Array.isArray(T.econ.shops.listings))T.econ.shops.listings=[];
      if(!Array.isArray(T.econ.shops.orders))T.econ.shops.orders=[];
      if(!T.econ.shops.nextId)T.econ.shops.nextId=1;
    }
    if(!Array.isArray(T.econ.commissions))T.econ.commissions=[];
    if(!T.econ.rings||typeof T.econ.rings!=='object')T.econ.rings={};
    if(!T.econ.bagBuy||typeof T.econ.bagBuy!=='object')T.econ.bagBuy={};
    if(!T.econ.rng||typeof T.econ.rng!=='object')T.econ.rng={seed:0,a:0};
    if(!T.econ.prod||typeof T.econ.prod!=='object')T.econ.prod={herb:0,food:0};
    if(T.econ.cultCarry==null||!isFinite(+T.econ.cultCarry))T.econ.cultCarry=0;
    else T.econ.cultCarry=Math.max(0,+T.econ.cultCarry||0);
    if(!T.econ.feeCfg||typeof T.econ.feeCfg!=='object')T.econ.feeCfg={};
    if(!T.econ.trades||typeof T.econ.trades!=='object')T.econ.trades={nextId:1,missions:[],log:[]};
    else{
      if(!Array.isArray(T.econ.trades.missions))T.econ.trades.missions=[];
      if(!Array.isArray(T.econ.trades.log))T.econ.trades.log=[];
      if(!T.econ.trades.nextId)T.econ.trades.nextId=1;
    }
    if(!T.econ.aucAuto||typeof T.econ.aucAuto!=='object')T.econ.aucAuto={on:true,budgetPct:0.20,cats:{},consign:{},log:[]};
    else{
      if(T.econ.aucAuto.on==null)T.econ.aucAuto.on=true;
      if(T.econ.aucAuto.budgetPct==null||!isFinite(+T.econ.aucAuto.budgetPct))T.econ.aucAuto.budgetPct=0.20;
      if(!T.econ.aucAuto.cats||typeof T.econ.aucAuto.cats!=='object')T.econ.aucAuto.cats={};
      if(!T.econ.aucAuto.consign||typeof T.econ.aucAuto.consign!=='object')T.econ.aucAuto.consign={};
      if(!Array.isArray(T.econ.aucAuto.log))T.econ.aucAuto.log=[];
    }
  }
  try{if(typeof econFeeHydrate==='function')econFeeHydrate(T);}catch(e){}
  try{if(typeof econBuildingsMigrate==='function')econBuildingsMigrate(T);}catch(e){}
  try{econStipendScaleMigrate(T);}catch(e){}
  try{econPayScheduleMigrate(T);}catch(e){}
  try{econUpkeepScheduleMigrate(T);}catch(e){}
  return T.econ;
}

var ECON_EVENTS=[];
function econEmit(type,payload){
  const ev={t:type,at:econNow(),p:payload||{}};
  ECON_EVENTS.push(ev);if(ECON_EVENTS.length>ECON_TUNE.eventMax)ECON_EVENTS.shift();
  try{if(typeof window!=='undefined'&&window.XW&&typeof window.XW.onEconEvent==='function')window.XW.onEconEvent(ev);}catch(e){}
  return ev;
}
function econLog(kind,entry){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  const row=Object.assign({t:econNow(),kind:kind},entry||{});
  T.econ.ledgers.push(row);if(T.econ.ledgers.length>ECON_TUNE.ledgerMax)T.econ.ledgers.shift();
  const wid=row.actorId;if(wid!=null&&T.econ.wallets[wid]){
    const w=T.econ.wallets[wid];w.ledger=w.ledger||[];w.ledger.push(row);if(w.ledger.length>80)w.ledger.shift();
  }
  return row;
}

function econSyncVaultFromRes(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.econ||!T.res)return;
  if(!econFlag('treasury'))return;
  if(T===(typeof S!=='undefined'?S:null)&&econXws())return; // 單一倉庫：S.res.lingshi 就是 S.store.cur.xia，不必互抄
  T.econ.vault.xia=Math.max(0,Math.floor(+T.res.lingshi||0));
}
function econSyncResFromVault(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.econ||!T.res)return;
  if(!econFlag('treasury'))return;
  if(T===(typeof S!=='undefined'?S:null)&&econXws())return; // 同上
  T.res.lingshi=Math.max(0,Math.floor(+T.econ.vault.xia||0));
}
function econWallet(id,create){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(id==null)return null;id=String(id);
  if(!T.econ.wallets[id]&&create)T.econ.wallets[id]={xia:0,zhong:0,shang:0,ji:0,ledger:[]};
  return T.econ.wallets[id]||null;
}
function econBagOf(who){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(who==='vault'||who==='sect'||who==null)return T.econ.vault;
  if(typeof who==='object'&&who){
    if(who===T.econ.vault)return T.econ.vault;
    if(who.id!=null)return econWallet(who.id,true);
  }
  return econWallet(who,true);
}
function econDeductXia(bag,needXia){
  needXia=Math.ceil(+needXia||0);if(needXia<=0)return true;
  if(econBagXia(bag)<needXia)return false;
  let left=needXia;
  for(const g of ECON_GRADES){
    const avail=econToXia(g,bag[g]||0);
    if(avail<=0)continue;
    if(avail<=left){left-=avail;bag[g]=0;}
    else{
      const unit=econToXia(g,1);
      const use=Math.ceil(left/unit);
      bag[g]=(bag[g]||0)-use;
      const back=use*unit-left;
      if(back>0){
        const fb=econFromXia(back);
        for(const h of ECON_GRADES)bag[h]=(bag[h]||0)+fb[h];
      }
      left=0;break;
    }
  }
  return left<=0;
}
function econAddXia(bag,xia,prefer){
  xia=Math.floor(+xia||0);if(xia<=0||!bag)return bag;
  if(prefer&&ECON_GRADES.indexOf(prefer)>=0){
    const unit=econToXia(prefer,1);
    const n=Math.floor(xia/unit);if(n>0){bag[prefer]=(bag[prefer]||0)+n;xia-=n*unit;}
  }
  const fb=econFromXia(xia);for(const g of ECON_GRADES)bag[g]=(bag[g]||0)+fb[g];
  return bag;
}

function econSetTaxRate(r){
  if(!econFlag('treasury'))return false;
  const T=S;if(!T||!T.econ)return false;
  T.econ.taxRate=econClamp(r,ECON_TUNE.taxMin,ECON_TUNE.taxMax);
  try{
    const cfg=econFeeEnsure(T);
    if(cfg){if(!cfg.questTax)cfg.questTax={cur:'lingshi',amt:T.econ.taxRate};else cfg.questTax.amt=T.econ.taxRate;}
  }catch(e){}
  econEmit('econ:tax',{rate:T.econ.taxRate});return T.econ.taxRate;
}
function econSetStipend(office,xia){
  if(!econFlag('treasury'))return false;
  const T=S;if(!T||!T.econ)return false;
  if(!(office in ECON_OFFICE_NAME))return false;
  T.econ.stipend[office]=Math.max(0,+xia||0);
  try{
    const cfg=econFeeEnsure(T);const key='stipend:'+office;
    if(cfg){if(!cfg[key])cfg[key]={cur:'lingshi',amt:T.econ.stipend[office]};else cfg[key].amt=T.econ.stipend[office];}
  }catch(e){}
  econEmit('econ:stipend',{office,xia:T.econ.stipend[office]});return true;
}

function econIsPlayerUnit(u){
  if(!u||typeof u!=='object')return false;
  if(u.kind==='player')return true;
  try{if(typeof xnIsPC==='function'&&xnIsPC(u))return true;}catch(e){}
  return false;
}
var ECON_FEE_REG={};
function econFeeEnsure(target){
  const T=target||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ)return null;
  if(!T.econ.feeCfg||typeof T.econ.feeCfg!=='object')T.econ.feeCfg={};
  return T.econ.feeCfg;
}
function econFeeRegister(key,opt){
  if(!key)return false;
  opt=opt||{};
  const defCur=(opt.defCur==='contrib')?'contrib':'lingshi';
  const defAmt=isFinite(+opt.defAmt)?+opt.defAmt:0;
  const kind=opt.kind||'fee';
  const label=opt.label||key;
  const perRealm=Array.isArray(opt.perRealm)?opt.perRealm.map(x=>Math.max(0,+x||0)):null;
  ECON_FEE_REG[key]={label:label,defCur:defCur,defAmt:defAmt,kind:kind,perRealm:perRealm};
  const cfg=econFeeEnsure();
  if(cfg&&cfg[key]==null)cfg[key]={cur:defCur,amt:defAmt};
  else if(cfg&&cfg[key]){
    if(cfg[key].cur!=='contrib'&&cfg[key].cur!=='lingshi')cfg[key].cur=defCur;
    if(cfg[key].amt==null||!isFinite(+cfg[key].amt))cfg[key].amt=defAmt;
  }
  return true;
}
function econFeeRegisterDefaults(){
  const taxDef=(typeof ECON_TUNE!=='undefined'&&ECON_TUNE.taxDef!=null)?ECON_TUNE.taxDef:0.15;
  econFeeRegister('questTax',{label:'任務稅率',defCur:'lingshi',defAmt:taxDef,kind:'rate'});
  const names=(typeof ECON_OFFICE_NAME!=='undefined')?ECON_OFFICE_NAME:{zhangmen:'掌門',zhanglao:'長老',zhifa:'執法',waishi:'外事',neimen:'內門',waimen:'外門',zayi:'雜役'};
  const stip=(typeof ECON_TUNE!=='undefined'&&ECON_TUNE.stipend)?ECON_TUNE.stipend:{};
  let zayiDef=2;
  try{if(typeof ECON_RANK_TUNE!=='undefined'&&ECON_RANK_TUNE.stipendZayi!=null)zayiDef=ECON_RANK_TUNE.stipendZayi;}catch(e){}
  for(const k in names){
    const def=(stip[k]!=null)?stip[k]:(k==='zayi'?zayiDef:0);
    econFeeRegister('stipend:'+k,{label:names[k]+'俸祿',defCur:'lingshi',defAmt:def,kind:'payout'});
  }
  let gfBase=8;
  try{if(typeof ECON_GF_TUNE!=='undefined'&&ECON_GF_TUNE.borrowBaseXia!=null)gfBase=ECON_GF_TUNE.borrowBaseXia;}catch(e){}
  econFeeRegister('gfBorrow',{label:'功法閣借閱費（弟子自付，宗主免）',defCur:'lingshi',defAmt:gfBase,kind:'fee'});
  econFeeRegister('tingdao',{label:'宗主講道・聽道費',defCur:'contrib',defAmt:0,kind:'fee',perRealm:[0,0,0,0,8,14,24,36,54,80,110,150]});// 使用者 2026-11-06 確認
  econFeeRegister('tradeFee',{label:'外事交易費',defCur:'lingshi',defAmt:2,kind:'fee'});
  econFeeRegister('tradeLeadCut',{label:'外事帶隊分紅',defCur:'lingshi',defAmt:1,kind:'payout'});
}
function econFeeHydrate(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  const cfg=econFeeEnsure(T);
  try{econFeeRegisterDefaults();}catch(e){}
  if(cfg.questTax==null)cfg.questTax={cur:'lingshi',amt:(T.econ.taxRate!=null?+T.econ.taxRate:((typeof ECON_TUNE!=='undefined'&&ECON_TUNE.taxDef)||0.15))};
  if(T.econ.stipend&&typeof T.econ.stipend==='object'){
    for(const k in T.econ.stipend){
      const key='stipend:'+k;
      if(cfg[key]==null)cfg[key]={cur:'lingshi',amt:+T.econ.stipend[k]||0};
    }
  }
  return cfg;
}
function econFeeGet(key){
  const reg=ECON_FEE_REG[key]||{label:key,defCur:'lingshi',defAmt:0,kind:'fee'};
  const T=(typeof S!=='undefined'?S:null);
  const raw=(T&&T.econ&&T.econ.feeCfg&&T.econ.feeCfg[key])||{};
  let cur=(raw.cur==='contrib'||raw.cur==='lingshi')?raw.cur:reg.defCur;
  let amt=(raw.amt!=null&&isFinite(+raw.amt))?+raw.amt:reg.defAmt;
  if(key==='questTax'&&T&&T.econ&&T.econ.taxRate!=null)amt=+T.econ.taxRate;
  if(key.indexOf('stipend:')===0&&T&&T.econ&&T.econ.stipend){
    const off=key.slice(8);
    if(T.econ.stipend[off]!=null)amt=+T.econ.stipend[off]||0;
  }
  const perRealm=Array.isArray(raw.perRealm)?raw.perRealm:(raw.perRealm===false?null:(reg.perRealm||null));
  return {key:key,label:reg.label,cur:cur,amt:amt,kind:reg.kind,defCur:reg.defCur,defAmt:reg.defAmt,perRealm:perRealm};
}
function econFeeSet(key,patch){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  const cfg=econFeeEnsure(T);if(!cfg)return null;
  if(!ECON_FEE_REG[key])econFeeRegister(key,{});
  const cur=econFeeGet(key);
  const next={cur:cur.cur,amt:cur.amt};
  patch=patch||{};
  if(Array.isArray(patch.perRealm))next.perRealm=patch.perRealm.map(x=>Math.max(0,+x||0));
  else if(patch.amt!=null&&isFinite(+patch.amt)&&cur.perRealm)next.perRealm=false;
  else if(cfg[key]&&(Array.isArray(cfg[key].perRealm)||cfg[key].perRealm===false))next.perRealm=cfg[key].perRealm;
  if(patch.cur==='auto'){next.cur='auto';next.curExplicit=false;}
  else if(patch.cur==='contrib'||patch.cur==='lingshi'){next.cur=patch.cur;next.curExplicit=true;}
  if(patch.curExplicit===false)next.curExplicit=false;
  if(cfg[key]&&cfg[key].curExplicit!=null&&next.curExplicit==null)next.curExplicit=cfg[key].curExplicit;
  if(patch.amt!=null&&isFinite(+patch.amt)){
    let a=+patch.amt;
    if(cur.kind==='rate'){
      if(a>1)a=a/100;
      a=econClamp(a,ECON_TUNE.taxMin,ECON_TUNE.taxMax);
    }else if(String(key).indexOf('stipend:')===0){
      a=Math.max(0,+a||0);
    }else{
      a=Math.max(0,Math.floor(+a||0));
    }
    next.amt=a;
  }
  cfg[key]=next;
  if(key==='questTax'){
    T.econ.taxRate=next.amt;
    try{econEmit('econ:tax',{rate:T.econ.taxRate,cur:next.cur});}catch(e){}
  }
  if(key.indexOf('stipend:')===0){
    const off=key.slice(8);
    if(!T.econ.stipend||typeof T.econ.stipend!=='object')T.econ.stipend={};
    T.econ.stipend[off]=next.amt;
    try{econEmit('econ:stipend',{office:off,xia:next.amt,cur:next.cur});}catch(e){}
  }
  try{econEmit('econ:fee',{key:key,cur:next.cur,amt:next.amt});}catch(e){}
  return next;
}
function econFeeResolvedAmt(key,mult,unit){
  const f=econFeeGet(key);
  let base=+f.amt||0,m=1;
  if(mult&&typeof mult==='object'){
    if(mult.amt!=null&&isFinite(+mult.amt))base=+mult.amt;
    if(mult.mult!=null&&isFinite(+mult.mult))m=+mult.mult;
  }else{m=(mult==null)?1:+mult;if(!isFinite(m))m=1;}
  if(!(mult&&typeof mult==='object'&&mult.amt!=null)&&Array.isArray(f.perRealm)&&unit&&unit.realm!=null){
    const ri=Math.max(0,Math.min(f.perRealm.length-1,Math.floor(+unit.realm||0)));
    if(f.perRealm[ri]!=null&&isFinite(+f.perRealm[ri]))base=+f.perRealm[ri];
  }
  let amt=base*m;
  if(String(key||'').indexOf('stipend:')===0){
    amt=Math.max(0,+amt||0);
  }else{
    const want=(typeof econFeeWantCur==='function')?econFeeWantCur(key):f.cur;
    if(want==='contrib'||f.cur==='contrib')amt=Math.max(0,Math.floor(amt+1e-9));
    else amt=Math.max(0,Math.round(amt));
  }
  return {f:f,amt:amt};
}
function econStipendScaleMigrate(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ)return null;
  if(T.econ.stipendScaleV===1)return T.econ.stipend;
  const sc=(typeof ECON_STIPEND_SCALE==='number'&&ECON_STIPEND_SCALE>0)?ECON_STIPEND_SCALE:30;
  if(T.econ.stipend&&typeof T.econ.stipend==='object'){
    for(const k of Object.keys(T.econ.stipend))T.econ.stipend[k]=(+T.econ.stipend[k]||0)/sc;
  }
  if(T.econ.feeCfg&&typeof T.econ.feeCfg==='object'){
    for(const k of Object.keys(T.econ.feeCfg)){
      if(String(k).indexOf('stipend:')!==0||!T.econ.feeCfg[k]||T.econ.feeCfg[k].amt==null)continue;
      const off=String(k).slice(8);
      if(T.econ.stipend&&T.econ.stipend[off]!=null)T.econ.feeCfg[k].amt=+T.econ.stipend[off]||0;
      else T.econ.feeCfg[k].amt=(+T.econ.feeCfg[k].amt||0)/sc;
    }
  }
  T.econ.stipendScaleV=1;
  return T.econ.stipend;
}
function econPrettyPayNum(n){
  n=+n||0;
  if(!(n>0))return '0';
  if(n>=1){
    const r=Math.round(n);
    return (Math.abs(n-r)>1e-9?'約 ':'')+r;
  }
  const years=(typeof econPayPeriodLen==='function'?econPayPeriodLen():300)/((typeof econYearSec==='function'?econYearSec():300));
  const y=years/n;
  const lo=Math.floor(y+1e-9),hi=Math.ceil(y-1e-9);
  const t=(lo===hi)?String(lo):(lo+'～'+hi);
  return '約每 '+t+' 年 1';
}
function econStipendCarryTake(unit,key,amt){
  amt=Math.max(0,+amt||0);
  if(!(amt>0)||!unit)return 0;
  if(!unit.econStipendCarry||typeof unit.econStipendCarry!=='object')unit.econStipendCarry={};
  const next=(+unit.econStipendCarry[key]||0)+amt;
  const whole=Math.floor(next+1e-12);
  unit.econStipendCarry[key]=next-whole;
  return whole;
}
function econUpkeepPeriodLen(){
  return (typeof ECON_UPKEEP_PERIOD_SEC==='number'&&ECON_UPKEEP_PERIOD_SEC>0)?ECON_UPKEEP_PERIOD_SEC:300;
}
function econUpkeepScheduleMigrate(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ)return null;
  const period=Math.max(1,econUpkeepPeriodLen());
  const now=+(T.time||0);
  if(T.econ.upkeepYearV!==1){
    if(T.econ.upkeepNextT!=null&&isFinite(+T.econ.upkeepNextT)){
      const left=Math.max(0,+T.econ.upkeepNextT-now);
      T.econ.upkeepNextT=now+Math.min(period,left*(period/9000));
    }
    T.econ.upkeepYearV=1;
  }
  if(T.econ.upkeepNextT==null||!isFinite(+T.econ.upkeepNextT))T.econ.upkeepNextT=now+period;
  return T.econ.upkeepNextT;
}
function econPayUpkeep(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ||!econFlag('treasury'))return 0;
  let upkeep=0;
  if(Array.isArray(T.buildings)){
    for(const b of T.buildings){
      if(!b||!b.built||b.broken)continue;
      upkeep+=(typeof econBuildingUpkeep==='function'?econBuildingUpkeep(b):ECON_TUNE.upkeepXia);
    }
  }
  const sc=(typeof ECON_UPKEEP_SCALE==='number'&&ECON_UPKEEP_SCALE>0)?ECON_UPKEEP_SCALE:30;
  const raw=upkeep/sc+(+T.econ.upkeepCarry||0);
  const whole=Math.floor(raw+1e-12);
  T.econ.upkeepCarry=raw-whole;
  if(whole>0){
    const r=econCharge('vault',whole,'monthly-upkeep');
    T.econ.upkeepPaid=(T.econ.upkeepPaid||0)+(r&&r.ok?whole:0);
  }
  return whole;
}
function econPayPeriodLen(){
  return (typeof ECON_PAY_PERIOD_SEC==='number'&&ECON_PAY_PERIOD_SEC>0)?ECON_PAY_PERIOD_SEC:300;
}
function econPayPeriodText(){
  const sec=econPayPeriodLen();
  const ys=(typeof econYearSec==='function'?econYearSec():300);
  const n=(typeof econPrettyAmt==='function'?econPrettyAmt(sec/Math.max(1e-6,ys)):String(Math.round(sec/ys)));
  return {sec:sec, slash:n+'年', per:'每 '+n+' 年'};
}
function econMonthLen(){
  return econPayPeriodLen();
}
function econMonthNote(){
  return '俸祿每 '+econPayPeriodText().slash+'發一次（每 5 分鐘）。';
}
function econPayScheduleMigrate(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ)return null;
  const period=Math.max(1,econPayPeriodLen());
  const now=+(T.time||0);
  const m=Math.floor(now/period);
  let last=T.econ.lastMonth;
  if(last==null||!isFinite(+last))last=-1;
  last=+last;
  const next=T.econ.payNextT;
  if(next!=null&&isFinite(+next))return +next;
  if(last<0){
    T.econ.payNextT=now+period;
    T.econ.lastMonth=m;
    return T.econ.payNextT;
  }
  if(m-last>1){
    T.econ.payNextT=now+period;
    T.econ.lastMonth=m;
    return T.econ.payNextT;
  }
  if(m>last){
    T.econ.payNextT=now;
    return T.econ.payNextT;
  }
  T.econ.payNextT=(last+1)*period;
  return T.econ.payNextT;
}
function econHasBranch(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T)return false;
  try{
    if(typeof window!=='undefined'&&typeof window.econHasBranchHook==='function'){
      const h=window.econHasBranchHook(T);
      if(h===true||h===false)return h;
    }
  }catch(e){}
  try{
    if(T.econ&&Array.isArray(T.econ.branches)&&T.econ.branches.length)return true;
    if(Array.isArray(T.branches)&&T.branches.length)return true;
    if(T.fenzong)return true;
    const fl=T.flags||{};
    if(fl.fenzong||fl.hasBranch||fl['分宗'])return true;
    const efl=T.econ&&T.econ.flags;
    if(efl&&(efl.fenzong||efl.hasBranch||efl['分宗']))return true;
    const units=T.units||[];
    for(let i=0;i<units.length;i++){
      const u=units[i];
      if(!u||u.dead)continue;
      if(u.branch||u.branchId||u.fenzong||u.isBranch||u.isBranchZhangmen||u.branchOffice)return true;
    }
  }catch(e){}
  return false;
}
function econIsPlayerLike(u){
  if(!u)return false;
  try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return true;}catch(e){}
  if(u.kind==='player'||u.isPlayer||u.pc)return true;
  return false;
}
function econIsBranchZhangmenUnit(u,T){
  if(!u||u.dead)return false;
  if(econIsPlayerLike(u))return false;
  const off=u.office||u.econOffice;
  if(off!=='zhangmen')return false;
  return econHasBranch(T);
}
function econOfficeUnits(off,T){
  T=T||(typeof S!=='undefined'?S:null);
  const out=[];
  if(!T||!off)return out;
  const units=T.units||[];
  for(let i=0;i<units.length;i++){
    const u=units[i];
    if(!u||u.dead)continue;
    if((u.office||u.econOffice)!==off)continue;
    if(econIsPlayerLike(u))continue;
    if(off==='zhangmen'&&!econIsBranchZhangmenUnit(u,T))continue;
    out.push(u);
  }
  return out;
}
function econPayMode(T){
  T=T||(typeof S!=='undefined'?S:null);
  const m=T&&T.econ&&T.econ.payMode;
  if(m==='cbFirst'||m==='lsOnly'||m==='cbOnly'||m==='lsThenCb')return m;
  return 'lsThenCb';
}
function econPayModeLabel(m){
  m=m||econPayMode();
  if(m==='cbFirst')return '貢獻優先';
  if(m==='lsOnly')return '只用靈石';
  if(m==='cbOnly')return '只用貢獻';
  return '靈石優先，不足改發貢獻';
}
var ECON_PAY_ORDER_DEF=['zhanglao','zhifa','waishi','neimen','waimen','zayi','reward'];
var ECON_PAY_ORDER_NAME={zhangmen:'分宗掌門',zhanglao:'長老',zhifa:'執法',waishi:'外事',neimen:'內門',waimen:'外門',zayi:'雜役',reward:'獎勵'};
function econPayOrder(T){
  T=T||(typeof S!=='undefined'?S:null);
  const has=econHasBranch(T);
  const def=ECON_PAY_ORDER_DEF.slice();
  const raw=T&&T.econ&&Array.isArray(T.econ.payOrder)?T.econ.payOrder:[];
  const out=[],seen={};
  for(let i=0;i<raw.length;i++){
    const k=raw[i];
    if(!k||seen[k])continue;
    if(k==='zhangmen'){
      if(!has)continue;
      out.push(k);seen[k]=1;continue;
    }
    if(def.indexOf(k)<0)continue;
    out.push(k);seen[k]=1;
  }
  if(has&&!seen.zhangmen)out.unshift('zhangmen');
  for(let i=0;i<def.length;i++)if(!seen[def[i]])out.push(def[i]);
  return out;
}
function econPayOrderMove(idx,dir){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return econPayOrder();
  const ord=econPayOrder(T);
  idx=+idx;const j=idx+(dir<0?-1:1);
  if(idx<0||idx>=ord.length||j<0||j>=ord.length)return ord;
  const t=ord[idx];ord[idx]=ord[j];ord[j]=t;
  T.econ.payOrder=ord.slice();
  return ord;
}
function econPayModeSet(m){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(m!=='cbFirst'&&m!=='lsOnly'&&m!=='cbOnly'&&m!=='lsThenCb')m='lsThenCb';
  T.econ.payMode=m;
  return m;
}
function econFeeIsPayout(key){
  if(!key)return false;
  if(String(key).indexOf('stipend:')===0)return true;
  try{
    const r=ECON_FEE_REG[key];
    if(r&&r.kind==='payout')return true;
  }catch(e){}
  return false;
}
function econFeeIsZhangmen(key){return key==='stipend:zhangmen';}
function econFeeCurChoice(key){
  const T=(typeof S!=='undefined'?S:null);
  const raw=(T&&T.econ&&T.econ.feeCfg&&T.econ.feeCfg[key])||{};
  if(raw.cur==='auto'||raw.curExplicit===false)return 'auto';
  if(raw.curExplicit===true){
    if(raw.cur==='contrib')return 'contrib';
    if(raw.cur==='lingshi')return 'lingshi';
  }
  let defCur='lingshi';
  try{if(ECON_FEE_REG[key]&&ECON_FEE_REG[key].defCur)defCur=ECON_FEE_REG[key].defCur;}catch(e){}
  if(econFeeIsPayout(key)){
    if(raw.cur==='contrib'&&defCur!=='contrib')return 'contrib';
    return 'auto';
  }
  if(raw.cur==='contrib')return 'contrib';
  return 'lingshi';
}
function econFeeWantCur(key){
  const ch=econFeeCurChoice(key);
  if(ch==='contrib')return 'contrib';
  if(ch==='lingshi')return 'lingshi';
  const mode=econPayMode();
  if(mode==='cbFirst'||mode==='cbOnly')return 'contrib';
  return 'lingshi';
}
function econOfficeCount(off,T){return econOfficeUnits(off,T).length;}
function econOwePush(entry){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(!Array.isArray(T.econ.owed))T.econ.owed=[];
  const row=Object.assign({t:econNow(),id:(T.econ.owedNext||1)},entry||{});
  T.econ.owedNext=(T.econ.owedNext||1)+1;
  T.econ.owed.push(row);
  if(T.econ.owed.length>200)T.econ.owed.shift();
  return row;
}
function econPayoutDecide(key,amt,vaultLeft){
  amt=Math.max(0,+amt||0);
  const ch=econFeeCurChoice(key);
  const mode=econPayMode();
  if(ch==='contrib'||((ch==='auto')&&(mode==='cbFirst'||mode==='cbOnly'))){
    return {pay:'contrib',amt:amt,fallback:false,unpaid:0};
  }
  const wantLs=true;
  if(vaultLeft>=amt)return {pay:'lingshi',amt:amt,fallback:false,unpaid:0,vaultAfter:vaultLeft-amt};
  if(ch==='auto'&&mode==='lsThenCb')return {pay:'contrib',amt:amt,fallback:true,unpaid:0,vaultAfter:vaultLeft};
  return {pay:'unpaid',amt:amt,fallback:false,unpaid:amt,vaultAfter:vaultLeft};
}
function econMonthPlan(T){
  T=T||(typeof S!=='undefined'?S:null);
  const empty={ls:0,cb:0,fallback:0,unpaid:0,upkeep:0,vault:0,rows:[],incomeLs:0,incomeCb:0};
  if(!T||!T.econ)return empty;
  let vault=econBagXia(T.econ.vault);
  const startVault=vault;
  let needLs=0;
  const ord=econPayOrder(T);
  let ls=0,cb=0,fb=0,unpaid=0;
  const rows=[];
  for(let i=0;i<ord.length;i++){
    const off=ord[i];
    if(off==='reward')continue;
    if(off==='zhangmen'&&!econHasBranch(T))continue;
    const key='stipend:'+off;
    const us=econOfficeUnits(off,T);
    const n=us.length;
    let fee=null;try{fee=econFeeGet(key);}catch(e){}
    const unitAmt=fee?Math.max(0,+fee.amt||0):0;
    let rowLs=0,rowCb=0,rowFb=0,rowUn=0;
    if(unitAmt>0){
      for(let k=0;k<n;k++){
        const d=econPayoutDecide(key,unitAmt,vault);
        const ch=econFeeCurChoice(key);
        const mode=econPayMode(T);
        const wantLs=ch==='lingshi'||(ch==='auto'&&mode!=='cbFirst'&&mode!=='cbOnly');
        if(wantLs)needLs+=unitAmt;
        if(d.pay==='lingshi'){rowLs+=unitAmt;vault=d.vaultAfter;ls+=unitAmt;}
        else if(d.pay==='contrib'){rowCb+=unitAmt;cb+=unitAmt;if(d.fallback){rowFb+=unitAmt;fb+=unitAmt;}}
        else{rowUn+=unitAmt;unpaid+=unitAmt;}
      }
    }
    rows.push({off:off,key:key,n:n,unitAmt:unitAmt,ls:rowLs,cb:rowCb,fallback:rowFb,unpaid:rowUn,choice:econFeeCurChoice(key)});
  }
  const inc=econMonthIncomeEst(T);
  return {ls:ls,cb:cb,fallback:fb,unpaid:unpaid,upkeep:0,vault:startVault,needLs:needLs,short:needLs>startVault,rows:rows,incomeLs:inc.lingshi,incomeCb:inc.contrib};
}
function econMonthIncomeEst(T){
  T=T||(typeof S!=='undefined'?S:null);
  const out={lingshi:0,contrib:0,ok:false};
  if(!T||!T.econ||!Array.isArray(T.econ.ledgers))return out;
  const monthLen=econMonthLen();
  const now=T.time||0,from=now-monthLen;
  let ls=0,cb=0,n=0;
  for(const row of T.econ.ledgers){
    if(!row)continue;
    if((row.t||0)<from)continue;
    const note=String(row.note||row.kind||'');
    if(!/quest-tax|gf-borrow|gfBorrow|tingdao|fee:tingdao|fee:gfBorrow|fee:questTax/.test(note))continue;
    n++;
    const amt=+(row.xia!=null?row.xia:row.amt)||0;
    if(row.cur==='contrib')cb+=amt;else ls+=amt;
  }
  out.lingshi=ls;out.contrib=cb;out.ok=n>0;
  return out;
}

function econFeeCharge(unit,key,mult){
  const r=econFeeResolvedAmt(key,mult,unit);
  const cur=r.f.cur,amt=r.amt;
  if(!(amt>0))return {ok:true,cur:cur,amt:0};
  if(econIsPlayerUnit(unit))return {ok:true,cur:cur,amt:0,skipped:'pc',reason:'pc'};
  if(!unit)return {ok:false,cur:cur,amt:amt,reason:'no-unit'};
  if(cur==='contrib'){
    let p=null;
    try{p=econContribPay(unit,amt,'fee:'+key);}catch(e){}
    if(!p||!p.ok)return {ok:false,cur:cur,amt:amt,reason:(p&&p.reason)||'insufficient'};
    return {ok:true,cur:cur,amt:amt};
  }
  const note='fee:'+key;
  let pay=null;
  try{if(typeof econPay==='function')pay=econPay(unit,amt,note);}catch(e){}
  if(!pay&&typeof econCharge==='function')try{pay=econCharge(unit,amt,note);}catch(e){}
  if(!pay||!pay.ok)return {ok:false,cur:cur,amt:amt,reason:(pay&&pay.reason)||'insufficient'};
  try{if(typeof econGain==='function')econGain('vault',amt,note);}catch(e){try{if(typeof econGrant==='function')econGrant('vault',amt,note,'xia');}catch(e2){}}
  return {ok:true,cur:cur,amt:amt};
}
function econFeePay(unit,key,mult){
  const r=econFeeResolvedAmt(key,mult,unit);
  let amt=r.amt;
  if(String(key||'').indexOf('stipend:')===0){
    if(econIsPlayerLike(unit))return {ok:true,cur:econFeeWantCur(key),amt:0,skipped:'pc'};
    if(econFeeIsZhangmen(key)&&!econIsBranchZhangmenUnit(unit))return {ok:true,cur:econFeeWantCur(key),amt:0,skipped:'zhangmen'};
    amt=econStipendCarryTake(unit,key,amt);
  }
  if(!(amt>0))return {ok:true,cur:econFeeWantCur(key),amt:0};
  if(!unit)return {ok:false,cur:econFeeWantCur(key),amt:amt,reason:'no-unit'};
  if(String(key||'').indexOf('stipend:')===0&&econIsPlayerLike(unit))return {ok:true,cur:econFeeWantCur(key),amt:0,skipped:'pc'};
  if(econFeeIsZhangmen(key)&&!econIsBranchZhangmenUnit(unit))return {ok:true,cur:econFeeWantCur(key),amt:0,skipped:'zhangmen'};
  const T=(typeof S!=='undefined'?S:null);
  const vault=(T&&T.econ&&typeof econBagXia==='function')?econBagXia(T.econ.vault):0;
  const dec=econPayoutDecide(key,amt,vault);
  if(dec.pay==='contrib'){
    let a=null;
    try{a=econContribAdd(unit,amt,'payout:'+key+(dec.fallback?':fallback':''));}catch(e){}
    return {ok:!!(a&&a.ok),cur:'contrib',amt:amt,fallback:!!dec.fallback,reason:a&&a.reason};
  }
  if(dec.pay==='unpaid'){
    try{econOwePush({unitId:unit&&unit.id,key:key,amt:amt,note:'insufficient'});}catch(e){}
    return {ok:false,cur:'lingshi',amt:amt,reason:'insufficient',owed:true};
  }
  const note='payout:'+key;
  if(T&&T.econ&&vault<amt){
    try{econOwePush({unitId:unit&&unit.id,key:key,amt:amt,note:'insufficient'});}catch(e){}
    return {ok:false,cur:'lingshi',amt:amt,reason:'insufficient',owed:true};
  }
  const ch=(typeof econCharge==='function')?econCharge('vault',amt,note):{ok:false,reason:'no-charge'};
  if(!ch.ok){
    try{econOwePush({unitId:unit&&unit.id,key:key,amt:amt,note:ch.reason||'insufficient'});}catch(e){}
    return {ok:false,cur:'lingshi',amt:amt,reason:ch.reason||'insufficient',owed:true};
  }
  try{if(typeof econGrant==='function')econGrant(unit,amt,note,'xia');}catch(e){}
  try{if(typeof econMirrorUnitWallet==='function')econMirrorUnitWallet(unit);}catch(e){}
  return {ok:true,cur:'lingshi',amt:amt};
}
function econFeeUnitText(f,key){
  if(!f)return '';
  if(f.kind==='rate')return '％';
  const ch=key?econFeeCurChoice(key):(f.cur||'lingshi');
  if(ch==='auto')return '依全域';
  if(ch==='contrib')return '貢獻度';
  return '下品靈石';
}
function econFeeRealmName(i){
  try{if(typeof REALMS!=='undefined'&&REALMS[i]&&REALMS[i].n)return REALMS[i].n;}catch(e){}
  return '境界'+i;
}
function econFeeDefPerRealm(key){
  const reg=ECON_FEE_REG[key];
  return (reg&&Array.isArray(reg.perRealm))?reg.perRealm:null;
}
function econFeePerRealmActive(f){return !!(f&&Array.isArray(f.perRealm));}
function econFeePerRealmLine(arr){
  if(!Array.isArray(arr))return '';
  const parts=[];
  for(let i=0;i<arr.length;i++){
    const n=+arr[i]||0;if(!(n>0))continue;
    parts.push(econFeeRealmName(i)+' '+n);
  }
  return parts.length?('依境界：'+parts.join('・')):'';
}
function econFeeSyncRow(row,key){
  if(!row)return;
  const block=row.closest?row.closest('.econ-fee-block'):null;
  const f=econFeeGet(key);
  const ch=econFeeCurChoice(key);
  row.querySelectorAll('.econ-fee-cur-btn').forEach(function(btn){
    const on=btn.getAttribute('data-econ-fee-curval')===ch;
    if(on)btn.classList.add('on');else btn.classList.remove('on');
  });
  const unit=row.querySelector('.econ-fee-unit');
  if(unit)unit.textContent=econFeeUnitText(f,key);
  const inp=row.querySelector('.econ-fee-amt');
  if(inp){
    if(econFeePerRealmActive(f)&&f.kind!=='rate'){inp.value='';inp.setAttribute('placeholder','依境界');}
    else if(String(key).indexOf('stipend:')===0){
      const raw=+f.amt||0;
      if(Math.abs(raw-Math.round(raw))>1e-9){inp.value='';inp.setAttribute('placeholder',econPrettyPayNum(raw));}
      else{inp.removeAttribute('placeholder');}
    }else inp.removeAttribute('placeholder');
  }
}
// Preserve only this synchronous replacement's view; never carry fields/focus across tabs or panels.
function econFeeReplaceView(old,next,committedKey){
  const attrs=['data-econ-feecfg-amt','data-econ-feecfg-cur','data-econ-fee-curval','data-econ-feecfg-restore','data-econ-feecfg-to-contrib','data-econ-paymode','data-econ-payord','data-i'];
  const key=e=>{const v=attrs.map(a=>e&&e.getAttribute?e.getAttribute(a):null);return v.some(x=>x!=null)?JSON.stringify(v):null;};
  const controls=e=>Array.from(e.querySelectorAll('input,button,select,textarea'));
  const before=controls(old),active=before.includes(document.activeElement)?document.activeElement:null;
  const activeKey=active?key(active):null;
  let selection=null;try{if(active&&active.selectionStart!=null)selection=[active.selectionStart,active.selectionEnd,active.selectionDirection];}catch(e){}
  const drafts=before.filter(e=>e.hasAttribute('data-econ-feecfg-amt')&&e.getAttribute('data-econ-feecfg-amt')!==committedKey&&e.value!==e.defaultValue).map(e=>[key(e),e.value]);
  const parents=[];for(let p=old.parentElement;p;p=p.parentElement)parents.push([p,p.scrollTop,p.scrollLeft]);
  const sel='.econ-fin-body,.econ-fee-set';
  const scrolls=[old,...old.querySelectorAll(sel)].map(e=>[e.scrollTop,e.scrollLeft]);
  old.replaceWith(next);
  const after=controls(next);
  for(const [k,value] of drafts){const e=after.find(e=>key(e)===k);if(e)e.value=value;}
  const pane=next.closest&&next.closest('.xwsect-pane');
  if(activeKey&&(!pane||pane.classList.contains('on'))){const e=after.find(e=>key(e)===activeKey);
    if(e&&!e.disabled){try{e.focus({preventScroll:true});}catch(ex){try{e.focus();}catch(ex2){}}
      if(selection)try{e.setSelectionRange(...selection);}catch(ex){}
    }
  }
  [next,...next.querySelectorAll(sel)].forEach((e,i)=>{if(scrolls[i]){e.scrollTop=scrolls[i][0];e.scrollLeft=scrolls[i][1];}});
  for(const [e,top,left] of parents){e.scrollTop=top;e.scrollLeft=left;}
}
function econFeeRefreshBlock(node,key){
  const block=node&&node.closest?node.closest('.econ-fee-block'):null;
  if(!block){econFeeSyncRow(node,key);return;}
  const lab=block.querySelector('.econ-fee-lab');
  const wrap=document.createElement('div');
  wrap.innerHTML=econFeeRowHtml(key,lab?lab.textContent:null);
  const next=wrap.firstElementChild;
  if(next)econFeeReplaceView(block,next,key);
}
function econFeeRowHtml(key,lab){
  const f=econFeeGet(key);
  const scheduled=econFeePerRealmActive(f)&&f.kind!=='rate';
  const canRestore=!scheduled&&!!econFeeDefPerRealm(key)&&f.kind!=='rate';
  const rawAmt=+f.amt||0;
  const amtWhole=Math.abs(rawAmt-Math.round(rawAmt))<1e-9;
  const amtShow=scheduled?'':((f.kind==='rate')?Math.round((+f.amt||0)*100):(amtWhole?String(Math.round(rawAmt)):''));
  const label=lab||f.label;
  const payout=econFeeIsPayout(key);
  const ch=econFeeCurChoice(key);
  let h='<div class="econ-fee-block" data-econ-feeblock="'+key+'">';
  h+='<div class="econ-fee-row" data-econ-feekey="'+key+'">';
  h+='<span class="econ-fee-lab" title="'+label+'">'+label+'</span>';
  h+='<span class="econ-fee-cur" role="group">';
  if(payout)h+='<button type="button" class="econ-fee-cur-btn'+(ch==='auto'?' on':'')+'" data-econ-feecfg-cur="'+key+'" data-econ-fee-curval="auto">依全域</button>';
  h+='<button type="button" class="econ-fee-cur-btn'+(ch==='lingshi'?' on':'')+'" data-econ-feecfg-cur="'+key+'" data-econ-fee-curval="lingshi">靈石</button>';
  h+='<button type="button" class="econ-fee-cur-btn'+(ch==='contrib'?' on':'')+'" data-econ-feecfg-cur="'+key+'" data-econ-fee-curval="contrib">貢獻</button>';
  h+='</span>';
  h+='<input class="econ-fee-amt" type="number" min="0" step="1" value="'+amtShow+'" data-econ-feecfg-amt="'+key+'"'+(scheduled?' placeholder="依境界"':((!amtWhole&&String(key).indexOf('stipend:')===0)?' placeholder="'+econPrettyPayNum(rawAmt)+'"':''))+'>';
  h+='<span class="econ-fee-unit">'+econFeeUnitText(f,key)+'</span>';
  h+='</div>';
  if(payout&&String(key).indexOf('stipend:')===0){
    const off=key.slice(8);
    const n=econOfficeUnits(off).length;
    const unitAmt=Math.max(0,+f.amt||0);
    const sub=n*unitAmt;
    let row=null,plan=null;
    try{plan=econMonthPlan();if(plan&&plan.rows){for(let i=0;i<plan.rows.length;i++)if(plan.rows[i].key===key){row=plan.rows[i];break;}}}catch(e){}
    const slash=econPayPeriodText().slash;
    const pretty=econPrettyPayNum(sub);
    h+='<div class="econ-fee-meta">×'+n+'人 '+(sub>=1||!(sub>0)?('= '+pretty+'/'+slash):pretty);
    if(ch==='auto')h+=' <span class="dim">（'+econPayModeLabel()+'）</span>';
    if(row&&row.fallback>0)h+=' <span class="econ-fin-warn">改發貢獻 '+econPrettyPayNum(row.fallback)+'</span>';
    if(row&&row.unpaid>0)h+=' <span class="econ-fin-warn">未發放 '+econPrettyPayNum(row.unpaid)+'</span>';
    if(ch!=='contrib'&&((row&&(row.fallback>0||row.unpaid>0))||(plan&&plan.short&&row&&(row.ls||row.fallback||row.unpaid)))){
      h+=' <button type="button" class="econ-to-cb" data-econ-feecfg-to-contrib="'+key+'">改發貢獻</button>';
    }
    h+='</div>';
  }
  if(scheduled){
    const line=econFeePerRealmLine(f.perRealm);
    if(line)h+='<div class="econ-fee-pr">'+line+'</div>';
  }else if(canRestore){
    h+='<button type="button" class="econ-fee-restore" data-econ-feecfg-restore="'+key+'">恢復依境界</button>';
  }
  h+='</div>';
  return h;
}
function econFeeSecHtml(title,keys,labs){
  if(!keys||!keys.length)return '';
  let h='<div class="econ-fee-sec"><div class="econ-fee-sec-h">'+title+'</div>';
  for(let i=0;i<keys.length;i++)h+=econFeeRowHtml(keys[i],labs&&labs[i]);
  h+='</div>';
  return h;
}
function econFeeSettingsHtml(){
  try{econFeeRegisterDefaults();}catch(e){}
  try{econFeeInjectCss();}catch(e){}
  const feeOpen=(typeof window!=='undefined'&&!!window.__econFeeOpen);
  let h='<button type="button" class="econ-fee-tog" data-econ-feecfg="tog">'+(feeOpen?'▾ 收支設定':'▸ 收支設定')+'</button>';
  h+='<div class="econ-fee-set"'+(feeOpen?'':' hidden')+'>';
  h+=econPayPriHtml();
  h+=econFeeSecHtml('稅收',['questTax']);
  const offices=[],olabs=[];
  if(typeof ECON_OFFICE_NAME!=='undefined'){
    for(const k in ECON_OFFICE_NAME){
      if(k==='zhangmen'&&!econHasBranch())continue;
      offices.push('stipend:'+k);
      olabs.push(k==='zhangmen'?'分宗掌門':ECON_OFFICE_NAME[k]);
    }
  }
  h+=econFeeSecHtml('職位俸祿',offices,olabs);
  const extra=['gfBorrow','tingdao'];
  for(const key in ECON_FEE_REG){
    if(key==='questTax'||key.indexOf('stipend:')===0)continue;
    if(extra.indexOf(key)<0)extra.push(key);
  }
  h+=econFeeSecHtml('其他收費',extra);
  h+='</div>';
  return h;
}
function econPayPriHtml(){
  const mode=econPayMode();
  const modes=[['lsThenCb','靈石優先，不足改發貢獻'],['cbFirst','貢獻優先'],['lsOnly','只用靈石'],['cbOnly','只用貢獻']];
  let h='<div class="econ-pay-pri"><div class="econ-fee-sec-h">發放優先</div><div class="econ-pay-modes">';
  for(let i=0;i<modes.length;i++){
    const k=modes[i][0],lab=modes[i][1];
    h+='<button type="button" class="econ-pay-mode-btn'+(mode===k?' on':'')+'" data-econ-paymode="'+k+'">'+lab+'</button>';
  }
  h+='</div><div class="econ-fee-sec-h">發放順序</div>';
  const ord=econPayOrder();
  for(let i=0;i<ord.length;i++){
    const k=ord[i];
    h+='<div class="econ-pay-ord"><span>'+(i+1)+'. '+(ECON_PAY_ORDER_NAME[k]||k)+'</span>';
    h+='<button type="button" class="econ-ord-btn" data-econ-payord="up" data-i="'+i+'">↑</button>';
    h+='<button type="button" class="econ-ord-btn" data-econ-payord="down" data-i="'+i+'">↓</button></div>';
  }
  h+='<div class="econ-fee-hint">靈石不足時依此順序發放。</div></div>';
  return h;
}
function econMonthSummaryHtml(){
  let plan;try{plan=econMonthPlan();}catch(e){plan=null;}
  if(!plan)return '';
  let h='<div class="econ-fin-month">';
  const per=econPayPeriodText().per;
  h+='<div>'+per+'支出：靈石 '+econPrettyPayNum(plan.ls)+' 下品、貢獻 '+econPrettyPayNum(plan.cb);
  if(plan.upkeep)h+='（含建築保養 '+econPrettyPayNum(plan.upkeep)+'）';
  h+='</div>';
  if(plan.fallback>0)h+='<div>其中改發貢獻：'+econPrettyPayNum(plan.fallback)+'</div>';
  if(plan.unpaid>0)h+='<div class="econ-fin-warn">未發放：'+econPrettyPayNum(plan.unpaid)+'</div>';
  const hasInc=!!(plan.incomeLs||plan.incomeCb);
  h+='<div>'+per+'收入'+(hasInc?'（估算）':'（估算，尚無近一期紀錄）')+'：靈石 '+econPrettyPayNum(plan.incomeLs)+' 下品、貢獻 '+econPrettyPayNum(plan.incomeCb)+'</div>';
  const netLs=plan.incomeLs-plan.ls, netCb=plan.incomeCb-plan.cb;
  h+='<div>'+per+'淨額（估算）：靈石 '+(netLs>=0?('+'+econPrettyPayNum(netLs)):'-'+econPrettyPayNum(-netLs))+'、貢獻 '+(netCb>=0?('+'+econPrettyPayNum(netCb)):'-'+econPrettyPayNum(-netCb))+'</div>';
  if(plan.short||plan.fallback>0||plan.unpaid>0){
    h+='<div class="econ-fin-warn">靈石不足（總庫 '+Math.round(plan.vault)+'，擬發靈石 '+econPrettyPayNum(plan.needLs||plan.ls)+'）</div>';
  }
  try{
    const T=(typeof S!=='undefined'?S:null);
    const owed=(T&&T.econ&&T.econ.owed)||[];
    if(owed.length)h+='<div class="econ-fin-warn">待補發 '+owed.length+' 筆</div>';
  }catch(e){}
  h+='<div class="econ-fee-hint">'+econMonthNote()+'</div>';
  h+='</div>';
  return h;
}
function econFinanceRemount(){
  try{
    if(typeof document==='undefined')return;
    document.querySelectorAll('#econ-fin-box').forEach(function(n){
      const wrap=document.createElement('div');
      wrap.innerHTML=econFinanceHtml({open:1,noToggle:1,sect:1,force:1});
      const nxt=wrap.firstElementChild;
      if(nxt)econFeeReplaceView(n,nxt);
    });
  }catch(e){}
}
function econFeeOnDom(ev){
  try{
    const t=ev&&ev.target;if(!t||!t.closest)return;
    const tog=t.closest('[data-econ-feecfg]');
    if(tog&&tog.getAttribute('data-econ-feecfg')==='tog'){
      if(ev.preventDefault)ev.preventDefault();
      if(ev.stopPropagation)ev.stopPropagation();
      if(typeof window!=='undefined')window.__econFeeOpen=!window.__econFeeOpen;
      const open=!!(typeof window!=='undefined'&&window.__econFeeOpen);
      try{
        document.querySelectorAll('.econ-fee-set').forEach(function(n){n.hidden=!open;});
        document.querySelectorAll('.econ-fee-tog').forEach(function(n){n.textContent=open?'▾ 收支設定':'▸ 收支設定';});
      }catch(e){}
      try{if(typeof renderPanel==='function')renderPanel();}catch(e){}
      return;
    }
    const rst=t.closest('[data-econ-feecfg-restore]');
    if(rst&&ev.type==='click'){
      if(ev.preventDefault)ev.preventDefault();
      if(ev.stopPropagation)ev.stopPropagation();
      const key=rst.getAttribute('data-econ-feecfg-restore');
      const def=econFeeDefPerRealm(key);
      if(key&&def){econFeeSet(key,{perRealm:def.slice()});econFeeRefreshBlock(rst,key);}
      return;
    }
    const curBtn=t.closest('.econ-fee-cur-btn');
    if(curBtn&&(ev.type==='click'||ev.type==='change')){
      if(ev.preventDefault)ev.preventDefault();
      if(ev.stopPropagation)ev.stopPropagation();
      const key=curBtn.getAttribute('data-econ-feecfg-cur');
      const val=curBtn.getAttribute('data-econ-fee-curval');
      if(key&&(val==='lingshi'||val==='contrib'||val==='auto')){
        econFeeSet(key,{cur:val});
        try{econFinanceRemount();}catch(e){econFeeSyncRow(curBtn.closest('.econ-fee-row'),key);}
      }
      return;
    }
    const toCb=t.closest('[data-econ-feecfg-to-contrib]');
    if(toCb&&ev.type==='click'){
      if(ev.preventDefault)ev.preventDefault();
      if(ev.stopPropagation)ev.stopPropagation();
      const key=toCb.getAttribute('data-econ-feecfg-to-contrib');
      if(key){econFeeSet(key,{cur:'contrib'});try{econFinanceRemount();}catch(e){}}
      return;
    }
    const pm=t.closest('[data-econ-paymode]');
    if(pm&&ev.type==='click'){
      if(ev.preventDefault)ev.preventDefault();
      if(ev.stopPropagation)ev.stopPropagation();
      econPayModeSet(pm.getAttribute('data-econ-paymode'));
      try{econFinanceRemount();}catch(e){}
      return;
    }
    const po=t.closest('[data-econ-payord]');
    if(po&&ev.type==='click'){
      if(ev.preventDefault)ev.preventDefault();
      if(ev.stopPropagation)ev.stopPropagation();
      econPayOrderMove(+po.getAttribute('data-i'), po.getAttribute('data-econ-payord')==='up'?-1:1);
      try{econFinanceRemount();}catch(e){}
      return;
    }
    if(ev.type!=='change')return;
    const amtEl=t.closest('[data-econ-feecfg-amt]');
    if(amtEl){
      const key=amtEl.getAttribute('data-econ-feecfg-amt');
      if(amtEl.value===''||amtEl.value==null)return;
      econFeeSet(key,{amt:amtEl.value});
      econFeeRefreshBlock(amtEl,key);
    }
  }catch(e){}
}
function econFeeInjectCss(){
  try{
    if(typeof document==='undefined'||!document.head)return;
    if(document.getElementById('econ-fee-css'))return;
    const s=document.createElement('style');
    s.id='econ-fee-css';
    s.textContent=
      '.econ-fin{max-width:100%;box-sizing:border-box;overflow-x:hidden;overflow-y:auto;max-height:min(72vh,calc(100vh - 96px));overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'+
      '.econ-fin-body{overflow-x:hidden;overflow-y:auto;max-height:min(62vh,calc(100vh - 140px));overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'+
      '.econ-fin *,.econ-fee-set *,.econ-fee-row *,.econ-fee-block *{box-sizing:border-box}'+
      '.econ-fee-block{min-width:0;max-width:100%}'+
      '.econ-fee-pr{color:#d8c9a6;font-size:11px;line-height:1.35;margin:1px 0 4px;overflow-wrap:anywhere;word-break:break-word}'+
      '.econ-fee-restore{display:inline-block;margin:2px 0 4px;padding:2px 8px;background:#2a1c10;border:1px solid #8a6a3a;border-radius:4px;color:#f3d48a;font:inherit;font-size:11px;cursor:pointer}'+
      '.econ-fee-restore:hover{background:#3a2a14}'+
      '.econ-fin-vault{color:#f0e2c0;font-size:12px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 6px}'+
      '.econ-fin-vault b{color:#f3d48a;font-weight:normal;margin:0 2px 0 0}'+
      '.econ-fin-vault .econ-fin-sep{color:#8a6a3a;margin:0 4px}'+
      '.econ-fee-tog{display:block;width:100%;max-width:100%;text-align:left;margin:0;padding:5px 8px;background:linear-gradient(#2a1d12,#1a120b);border:1px solid #8a6a3a;border-radius:4px;color:#f3d48a;letter-spacing:2px;font:inherit;font-size:13px;cursor:pointer}'+
      '.econ-fee-tog:hover{background:linear-gradient(#3a2a14,#1a120b)}'+
      '.econ-fee-set{margin-top:6px;padding:6px 8px;background:#241810;border:1px solid #5a4428;border-radius:8px;overflow-x:hidden;overflow-y:auto;max-height:min(52vh,calc(100vh - 220px));overscroll-behavior:contain;-webkit-overflow-scrolling:touch;max-width:100%}'+
      '.econ-fin-month{margin:0 0 8px;padding:6px 8px;background:#1c140c;border:1px solid #5a4428;border-radius:8px;color:#f0e2c0;font-size:12px;line-height:1.5}'+
      '.econ-fin-warn{color:#ff9a7a}'+
      '.econ-fee-meta{color:#d8c9a6;font-size:11px;line-height:1.4;margin:0 0 4px}'+
      '.econ-fee-hint{color:#b8a47a;font-size:11px;line-height:1.35;margin:4px 0 0}'+
      '.econ-pay-modes{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px}'+
      '.econ-pay-mode-btn,.econ-ord-btn,.econ-to-cb{appearance:none;margin:0;padding:3px 7px;background:#2a1c10;border:1px solid #8a6a3a;border-radius:4px;color:#f3d48a;font:inherit;font-size:11px;cursor:pointer}'+
      '.econ-pay-mode-btn.on{background:#6b4a22;color:#ffe9a8}'+
      '.econ-pay-ord{display:flex;align-items:center;gap:6px;padding:2px 0;color:#f3d48a;font-size:12px}'+
      '.econ-fee-sec+.econ-fee-sec{margin-top:6px;padding-top:6px;border-top:1px dashed #8a6a3a66}'+
      '.econ-fee-sec-h{color:#d7b56a;font-size:11px;letter-spacing:2px;margin:0 0 5px}'+
      '.econ-fee-row{display:grid;grid-template-columns:minmax(64px,1fr) auto 70px 5em;align-items:center;gap:4px 6px;min-width:0;padding:3px 0}'+
      '.econ-fee-lab{color:#f3d48a;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}'+
      '.econ-fee-cur{display:inline-flex;flex:none;border:1px solid #8a6a3a;border-radius:4px;overflow:hidden;background:#2a1c10}'+
      '.econ-fee-cur-btn{appearance:none;-webkit-appearance:none;margin:0;background:#2a1c10;color:#cdbb92;border:0;border-right:1px solid #8a6a3a;padding:3px 7px;font:inherit;font-size:12px;cursor:pointer;line-height:1.3}'+
      '.econ-fee-cur-btn:last-child{border-right:0}'+
      '.econ-fee-cur-btn.on{background:#6b4a22;color:#ffe9a8;box-shadow:0 0 0 2px #f3d48a inset}'+
      '.econ-fee-amt{width:70px;max-width:70px;min-width:0;background:#120c06;color:#f6e7c4;border:1px solid #8a6a3a;border-radius:4px;padding:3px 5px;font:inherit;font-size:13px;text-align:right;-moz-appearance:textfield}'+
      '.econ-fee-amt::-webkit-outer-spin-button,.econ-fee-amt::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}'+
      '.econ-fee-unit{color:#d8c9a6;font-size:12px;white-space:nowrap}'+
      '@media (max-width:420px){.econ-fee-row{grid-template-columns:minmax(48px,1fr) auto 56px 4.2em;gap:3px 4px}.econ-fee-cur-btn{padding:3px 5px;font-size:11px}.econ-fee-amt{width:56px;max-width:56px;font-size:12px}.econ-fee-unit,.econ-fee-lab{font-size:11px}.econ-fee-set{padding:5px 6px}.econ-fin,.econ-fin-body,.econ-fee-set{max-height:min(54vh,calc(100dvh - 110px))}}'+
      '#v47pause .pbody .econ-fin,#v47pause .pbody .econ-fin-body,#v47pause .pbody .econ-fee-set{overflow-y:auto}'+
      'body.pc #xwbb .xwbb-rows,body.pc #xwbb .pc.xwbb-rows{overflow:auto!important;max-height:min(56vh,calc(100vh - 160px));-webkit-overflow-scrolling:touch}';
    document.head.appendChild(s);
  }catch(e){}
}
function econFeeBindUi(){
  try{
    econFeeInjectCss();
    if(typeof document==='undefined'||!document.addEventListener)return;
    if(typeof window!=='undefined'&&window.__econFeeBound)return;
    if(typeof window!=='undefined')window.__econFeeBound=1;
    document.addEventListener('click',econFeeOnDom,true);
    document.addEventListener('change',econFeeOnDom,true);
    document.addEventListener('wheel',econWheelGuard,{capture:true,passive:false});
  }catch(e){}
}
function econWheelGuard(ev){
  try{
    const t=ev&&ev.target;if(!t||!t.closest)return;
    const box=t.closest('.econ-fin,.econ-fin-body,.econ-fee-set,#v50_grid,#xwbb,.xwbb-rows,#v47pause .pbody');
    if(!box)return;
    if(ev.stopPropagation)ev.stopPropagation();
    const inp=t.closest&&t.closest('input[type=number],input[type="number"]');
    if(!inp)return;
    if(ev.preventDefault)ev.preventDefault();
    let p=inp.parentElement;
    while(p&&p!==document.body){
      const st=(typeof window!=='undefined'&&window.getComputedStyle)?window.getComputedStyle(p):null;
      const oy=st&&st.overflowY;
      if(oy&&/(auto|scroll)/.test(oy)&&p.scrollHeight>p.clientHeight+1){
        p.scrollTop+=(ev.deltaY||0);
        break;
      }
      p=p.parentElement;
    }
  }catch(e){}
}


function econCultivationCost(realm){
  realm=Math.max(0,realm|0);
  const gi=ECON_TUNE.cultGradeFrom[realm];const grade=ECON_GRADES[gi!=null?gi:0];
  const unit=econToXia(grade,1)||1;
  if(realm<4)return {xia:0,grade:grade,amt:0,label:ECON_GRADE_NAME[grade]+' 0'};
  const xia=Math.round(ECON_TUNE.cultBaseXia*Math.pow(ECON_TUNE.cultRealmMul,realm));
  const amt=+(xia/unit).toFixed(4);
  return {xia:xia,grade:grade,amt:amt,label:ECON_GRADE_NAME[grade]+' '+amt};
}
function econCultNeed(need){need=+need;return (need>0)?need:1;}
function econCultivationCostPerPoint(realm,need){
  const tot=econCultivationCost(realm);
  need=econCultNeed(need);
  const xia=(+tot.xia||0)/need;
  const unit=econToXia(tot.grade,1)||1;
  const amt=xia/unit;
  return {xia:xia,grade:tot.grade,amt:amt,label:ECON_GRADE_NAME[tot.grade]+' '+amt};
}
function econWasteRate(prof){
  let p=0;
  if(typeof prof==='number'){
    if(prof>1)p=prof/(ECON_TUNE.wasteMaxLv||10);
    else p=prof;
  }else if(prof&&typeof prof==='object'){
    if(prof.rate!=null)return econClamp(+prof.rate,0,1);
    const max=prof.maxLv||ECON_TUNE.wasteMaxLv||10;
    p=(+prof.lv||0)/max;
  }
  p=econClamp(p,0,1);
  return +(ECON_TUNE.wasteNovice-(ECON_TUNE.wasteNovice-ECON_TUNE.wasteMaster)*p).toFixed(4);
}
function econParseChargeXia(cost){
  let xia=0,grade=null;
  if(typeof cost==='number')xia=cost;
  else if(cost&&typeof cost==='object'){
    if(typeof cost.xia==='number'&&isFinite(cost.xia)){
      xia=+cost.xia;if(cost.grade)grade=cost.grade;
    }else if(cost.grade&&cost.amt!=null){
      grade=cost.grade;xia=econToXia(cost.grade,cost.amt);
    }else if(cost.xia!=null)xia=+cost.xia;
  }
  return {xia:+xia||0,grade:grade};
}
function econCharge(who,cost,note){
  const parsed=econParseChargeXia(cost);
  let xia=parsed.xia;const grade=parsed.grade;
  if(!(xia>0))return {ok:true,paid:0};
  if(!econFlag('treasury')&&!econFlag('cult'))return {ok:false,reason:'flag-off'};
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return {ok:false,reason:'no-state'};
  const bag=econBagOf(who);if(!bag)return {ok:false,reason:'no-bag'};
  const isVault=bag===T.econ.vault;
  let whole,nextCarry=0;
  if(isVault){
    if(T.econ.cultCarry==null||!isFinite(+T.econ.cultCarry))T.econ.cultCarry=0;
    const due=(+T.econ.cultCarry||0)+xia;
    whole=Math.floor(due+1e-9);
    nextCarry=due-whole;if(nextCarry<0)nextCarry=0;
    if(whole<=0){
      T.econ.cultCarry=due>0?due:0;
      return {ok:true,paid:0,remain:econBagXia(bag),carry:T.econ.cultCarry};
    }
  }else{
    whole=Math.ceil(xia);
  }
  if(econBagXia(bag)<whole)return {ok:false,reason:'insufficient',need:whole,have:econBagXia(bag)};
  {const X=isVault&&T===S?econXws():null;if(X){const r=X.take('lingshi',whole,note||'charge');if(!r||!r.ok)return {ok:false,reason:'insufficient',need:whole,have:econBagXia(bag)};}else econDeductXia(bag,whole);}
  if(isVault){T.econ.cultCarry=nextCarry;econSyncResFromVault(T);}
  const actorId=(who&&who.id!=null)?who.id:(who==='vault'?null:who);
  econLog('charge',{actorId:actorId,xia:whole,grade:grade,note:note||'charge'});
  econEmit('econ:charge',{actorId,xia:whole,note:note||'charge'});
  const out={ok:true,paid:whole,remain:econBagXia(bag)};
  if(isVault)out.carry=T.econ.cultCarry;
  return out;
}
function econCultCharge(unit,need,points){
  if(points==null)points=1;
  points=+points||0;
  const realm=(unit&&unit.realm)|0;
  if(realm<4||!(points>0))return {ok:true,speedMul:1};
  const cost=econCultivationCostPerPoint(realm,need);
  const scaled={xia:cost.xia*points,grade:cost.grade,amt:cost.amt*points,label:cost.label};
  const r=econCharge('vault',scaled,'cultivation:r'+realm);
  if(r&&r.ok)return {ok:true,speedMul:1,paid:r.paid};
  if(r&&r.reason==='insufficient')return {ok:false,speedMul:0.5};
  if(r&&(r.reason==='flag-off'||r.reason==='no-state'||r.reason==='no-bag'))return {ok:true,speedMul:1};
  return {ok:false,speedMul:0.5};
}
function econGrant(who,xia,note,prefer){
  if(!econFlag('treasury')&&!econFlag('shop')&&!econFlag('cult'))return {ok:false,reason:'flag-off'};
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return {ok:false,reason:'no-state'};
  xia=Math.floor(+xia||0);if(xia<=0)return {ok:true,got:0};
  const bag=econBagOf(who);if(!bag)return {ok:false,reason:'no-bag'};
  {const X=bag===T.econ.vault&&T===S?econXws():null;
    if(X){const d=econEmptyBag();econAddXia(d,xia,prefer);for(const g of ECON_GRADES)if(d[g]>0)X.add(g,d[g],note||'grant');}else econAddXia(bag,xia,prefer);}
  if(bag===T.econ.vault)econSyncResFromVault(T);
  const actorId=(who&&who.id!=null)?who.id:(who==='vault'?null:who);
  econLog('grant',{actorId:actorId,xia:xia,note:note||'grant'});
  econEmit('econ:grant',{actorId,xia,note:note||'grant'});
  return {ok:true,got:xia,remain:econBagXia(bag)};
}
function econIncomeScale(realm){
  realm=Math.max(0,realm|0);
  return Math.pow(ECON_TUNE.incomeRealmScale,realm);
}
function econOnQuestReward(unit,reward,src){
  if(!econFlag('treasury'))return null;
  const T=S;if(!T||!T.econ)return null;
  let raw=0;
  if(typeof reward==='number')raw=reward;
  else if(reward&&typeof reward==='object'){
    raw=+(reward.lingshi||0);
    for(const g of ECON_GRADES)if(reward[g])raw+=econToXia(g,reward[g]);
  }
  if(raw<=0)return {taxed:0,kept:0,raw:0};
  const realm=unit&&unit.realm||0;
  raw=Math.round(raw*econIncomeScale(realm));
  let cur='lingshi';
  try{const f=econFeeGet('questTax');if(f&&f.cur)cur=f.cur;}catch(e){}
  const rate=econClamp(T.econ.taxRate,ECON_TUNE.taxMin,ECON_TUNE.taxMax);
  const tax=Math.floor(raw*rate),kept=raw-tax;
  if(cur==='contrib'){
    if(raw>0&&unit)econGrant(unit,raw,'quest-pay:'+(src||'quest'),'xia');
    else if(raw>0)econGrant('vault',raw,'quest-pay-vault','xia');
    if(tax>0&&unit&&!econIsPlayerUnit(unit)){
      try{econContribPay(unit,tax,'quest-tax:'+(src||'quest'));}catch(e){}
    }
    econEmit('econ:quest',{unitId:unit&&unit.id,raw,tax,kept:raw,src:src||'quest',cur:'contrib'});
    return {raw,tax,kept:raw,rate,cur:'contrib'};
  }
  if(tax>0)econGrant('vault',tax,'quest-tax:'+(src||'quest'),'xia');
  if(kept>0&&unit)econGrant(unit,kept,'quest-pay:'+(src||'quest'),'xia');
  else if(kept>0)econGrant('vault',kept,'quest-pay-vault','xia');
  econEmit('econ:quest',{unitId:unit&&unit.id,raw,tax,kept,src:src||'quest',cur:'lingshi'});
  return {raw,tax,kept,rate,cur:'lingshi'};
}

function econPayMonth(T){
  if(!econFlag('treasury'))return;
  T=T||S;if(!T||!T.econ)return;
  if(T.flags&&T.flags.gtStipendError)return; // 未核對的部分發薪不可切模式重發。
  const units=T.units||[];
  let paid=0,upkeep=0;
  const ord=econPayOrder(T);
  for(let i=0;i<ord.length;i++){
    const off=ord[i];
    if(off==='reward')continue;
    if(off==='zhangmen'&&!econHasBranch(T))continue;
    const us=econOfficeUnits(off,T);
    const sKey='stipend:'+off;
    for(const u of us){
      const r=econFeePay(u,sKey);
      if(r&&r.ok&&r.cur==='lingshi'&&!r.fallback)paid+=r.amt||0;
    }
  }
  econEmit('econ:month',{paid,upkeep:0});
}
function econTick(dt){
  if(!econAnyFlag())return;
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return;
  if(econFlag('treasury')){
    T.econ.monthT=(T.econ.monthT||0)+dt;
    const now=+(T.time||0);
    const period=Math.max(1,econPayPeriodLen());
    if(T.econ.payNextT==null||!isFinite(+T.econ.payNextT))try{econPayScheduleMigrate(T);}catch(e){}
    if(T.econ.payNextT==null||!isFinite(+T.econ.payNextT))T.econ.payNextT=now+period;
    if(now>=T.econ.payNextT&&!(T.flags&&T.flags.gtStipendError)){
      econPayMonth(T);
      T.econ.payNextT=now+period;
      T.econ.lastMonth=Math.floor(now/period);
    }
    const upKeepP=Math.max(1,econUpkeepPeriodLen());
    if(T.econ.upkeepNextT==null||!isFinite(+T.econ.upkeepNextT))try{econUpkeepScheduleMigrate(T);}catch(e){}
    if(T.econ.upkeepNextT==null||!isFinite(+T.econ.upkeepNextT))T.econ.upkeepNextT=now+upKeepP;
    if(now>=T.econ.upkeepNextT){
      econPayUpkeep(T);
      T.econ.upkeepNextT=now+upKeepP;
    }
  }
  try{if(typeof econMarketTick==='function')econMarketTick(dt);}catch(e){}
  try{if(typeof econShopTick==='function')econShopTick(dt);}catch(e){}
  try{if(typeof econBuildingsTick==='function')econBuildingsTick(dt);}catch(e){}
  try{if(typeof econTradeTick==='function')econTradeTick(dt);}catch(e){}
}

function econFmtShortXia(n){
  n=Math.max(0,Math.floor(+n||0));
  function f(v){if(v>=100)return String(Math.round(v));const s=(v>=10?v.toFixed(1):v.toFixed(2)).replace(/\.0+$/,'').replace(/(\.[1-9])0$/,'$1');return s;}
  if(n>=1e8)return f(n/1e8)+'億';
  if(n>=1e4)return f(n/1e4)+'萬';
  return String(n);
}
function econFinanceInBuildingPanel(){
  try{if(typeof selBuilding!=='undefined'&&selBuilding!=null)return true;}catch(e){}
  return false;
}
function econFinanceInUnitPanel(){
  try{
    if(econFinanceInBuildingPanel())return false;
    const hasOther=!!(typeof selOther!=='undefined'&&selOther);
    const one=typeof selUnits!=='undefined'&&selUnits&&selUnits.length===1;
    if(!one||hasOther)return false;
    let u=null;try{u=typeof unitById==='function'?unitById(selUnits[0]):null;}catch(e){}
    return !!(u&&(u.kind==='disciple'||u.kind==='player'));
  }catch(e){return false;}
}
function econStripFinanceFromSidePanel(){
  try{
    const el=typeof document!=='undefined'?document.getElementById('panel'):null;if(!el)return;
    el.querySelectorAll('#econ-fin-box,#econ_fin,.econ-fin').forEach(function(n){try{n.remove();}catch(e2){}});
  }catch(e){}
}
function econFinanceScopeInstall(){
  try{
    if(typeof renderPanel==='function'&&!renderPanel._econFinScope){
      const _rp=renderPanel;
      renderPanel=function(){
        const r=_rp.apply(this,arguments);
        try{econStripFinanceFromSidePanel();}catch(e){}
        return r;
      };
      renderPanel._econFinScope=1;
    }
  }catch(e){}
}
function econFinanceHtml(opt){
  opt=opt||{};
  /* compact＝弟子／主角側欄注入（g23 renderPanel）；全宗收支只出現在宗門事務財務分頁（noToggle／sect） */
  if(opt.compact&&!opt.noToggle&&!opt.force&&!opt.sect)return '';
  if(!opt.force&&!opt.noToggle&&!opt.sect&&(econFinanceInBuildingPanel()||econFinanceInUnitPanel()))return '';
  if(!econFlag('treasury'))return '';
  const T=S,E=T&&T.econ;if(!E)return '';
  const forceOpen=!!opt.open, noToggle=!!opt.noToggle, compact=!!opt.compact;
  const open=forceOpen||(!noToggle&&typeof window!=='undefined'&&!!window.__econFinOpen);
  const showBody=open||noToggle;
  const v=E.vault;
  const xia=econBagXia(v);
  try{econFeeHydrate(T);}catch(e){}
  let h='<div class="econ-fin'+(open?' open':'')+(compact?' compact':'')+'" id="econ-fin-box">';
  if(!noToggle){
    h+='<button type="button" class="btn econ-fin-tog" data-econ-fin="tog">'+(open?'▾ 財務':'▸ 財務')+' <span class="dim sm">約'+econFmtShortXia(xia)+'</span></button>';
  }else{
    h+='<h3>財務</h3>';
  }
  try{econFeeInjectCss();}catch(e){}
  h+='<div class="econ-fin-body"'+(showBody?'':' hidden')+'>';
  const shortG={xia:'下',zhong:'中',shang:'上',ji:'極'};
  h+='<div class="econ-fin-vault" title="總庫約'+econFmtShortXia(xia)+' 下品">總庫';
  for(const g of ECON_GRADES){
    h+=' <b>'+(shortG[g]||g)+'</b>'+(v[g]||0);
  }
  h+='</div>';
  h+=econMonthSummaryHtml();
  h+=econFeeSettingsHtml();
  h+='</div></div>';
  return h;
}
function econWalletHtml(unit){
  if(!econFlag('treasury'))return '';
  const id=unit&&unit.id!=null?unit.id:unit;
  const w=econWallet(id,false);if(!w)return '<div class="econ-wal">尚無錢包</div>';
  let h='<div class="econ-wal">錢包：';
  for(const g of ECON_GRADES)h+=ECON_GRADE_NAME[g]+' '+(w[g]||0)+'　';
  h+='</div>';
  if(w.ledger&&w.ledger.length){
    h+='<div class="econ-led">最近交易：';
    for(const row of w.ledger.slice(-8).reverse()){const x=+row.xia||0;h+='<div>'+econLedgerLabel(row)+'　'+(x<0?'−':'+')+econFmtXiaPlain(Math.abs(x))+'</div>';}
    h+='</div>';
  }
  return h;
}


// 最近交易：把內部代碼轉成玩家看得懂的文字（t1184）
const ECON_LEDGER_LABEL={'quest-pay':'任務報酬','quest-pay-vault':'任務報酬（入宗庫）','shop-buy':'坊市購買','shop-sell':'坊市出售','shop-income':'坊市收入','commission-pay':'委託報酬','commission-fee':'委託費用','bag-expand':'擴充行囊','bag-expand-vault':'擴充行囊（宗庫）','pay':'支出','gain':'收入','grant':'收入','salary':'俸祿','stipend':'俸祿','tax':'宗門稅','auction':'拍賣','fangshi-buy':'坊市購買','fangshi-sell':'坊市出售','wanbao-sell':'萬寶樓出售','sell':'出售','tradeFee':'交易稅','tradeFee-refund':'交易稅退還','trade-buy':'市集購入','trade-sell':'市集出售','trade-buy-refund':'市集退款','trade-buy-extra':'市集補差','trade-buy-partial':'市集部分成交','mine-deposit':'礦洞入帳','monthly-upkeep':'月度開銷','cultivation':'修煉消耗','quest-tax':'任務稅','fee':'手續費','payout':'發放','map':'地圖收支','gf-borrow':'功法借閱','gf-stock-buy':'功法入庫','gf-stock-sell':'功法出讓','charge':'扣費'};
function econLedgerLabel(row){
  const raw=String((row&&(row.note||row.kind))||'');
  if(!raw)return '收支';
  const parts=raw.split(':');
  const head=parts[0];
  if(ECON_LEDGER_LABEL[raw])return ECON_LEDGER_LABEL[raw];
  if((head==='fee'||head==='payout'||head==='stipend')&&parts[1]){
    try{const rec=ECON_FEE_REG[parts[1]];if(rec&&rec.label)return rec.label;}catch(e){}
  }
  if(ECON_LEDGER_LABEL[head])return ECON_LEDGER_LABEL[head];
  if(/^[\x00-\x7f]+$/.test(raw)){
    if(/refund/i.test(raw))return '退款';
    return /pay|fee|buy|cost|spend|charge|upkeep|tax/i.test(raw)?'支出':'收入';
  }
  return raw;
}
function econFmtXiaPlain(x){return econFmtXiaGrade(x);}

// ---- 仙武新地圖適配：pay / gain / canPay ----
// 對外簽名（定稿）：pay(unitOrSect, amount, reason)、gain 同、canPay(unitOrSect, amount)
// amount＝下品靈石基數。亦相容 map_adapters 現呼： (who, currency, amt, ctx)
function econIsSect(who){
  if(!who||typeof who!=='object')return false;
  if(who.kind==='disciple'||who.kind==='player')return false;
  if(who.stock&&typeof who.stock==='object')return true;
  if(who.kind==='sect'||who.isSect||who._mapSect)return true;
  return false;
}
function econIsUnit(who){
  if(!who||typeof who!=='object')return false;
  if(econIsSect(who))return false;
  if(who.kind==='disciple'||who.kind==='player')return true;
  if(who.id!=null&&(who.hp!=null||who.realm!=null||who.job!=null||who.x!=null))return true;
  return false;
}
function econParsePayArgs(unitOrSect,amount,reason,ctx){
  // map_adapters：hook(who,'lingshi',amt,ctx) → 第二參是字串幣別
  if(typeof amount==='string'){
    const currency=amount||'lingshi';
    let amt=+(reason||0);
    if(currency!=='lingshi'&&currency!=='xia'){
      if(typeof ECON_GRADES!=='undefined'&&ECON_GRADES.indexOf(currency)>=0)amt=econToXia(currency,amt);
      else return {who:unitOrSect,amount:amt,reason:(ctx&&(ctx.reason||ctx.src||ctx.note))||'map',currency:currency,unsupported:true};
    }
    const note=(ctx&&typeof ctx==='object')?(ctx.reason||ctx.src||ctx.note||'map'):(typeof ctx==='string'?ctx:'map');
    return {who:unitOrSect,amount:amt,reason:note,currency:'lingshi',unsupported:false};
  }
  return {who:unitOrSect,amount:+amount||0,reason:reason||'map',currency:'lingshi',unsupported:false};
}
function econLegacyPay(who,amt){
  amt=Math.ceil(+amt||0);if(!(amt>0))return {ok:true,paid:0,via:'legacy'};
  if(econIsSect(who)){
    who.stock=who.stock||{};
    if((who.stock.lingshi||0)<amt)return {ok:false,reason:'insufficient',via:'sect.stock.lingshi'};
    who.stock.lingshi-=amt;return {ok:true,paid:amt,via:'sect.stock.lingshi'};
  }
  if(econIsUnit(who)){
    if((who.lingshi||0)<amt)return {ok:false,reason:'insufficient',via:'unit.lingshi'};
    who.lingshi-=amt;return {ok:true,paid:amt,via:'unit.lingshi'};
  }
  if(typeof S!=='undefined'&&S&&S.res){
    if(typeof canAfford==='function'&&typeof pay==='function'){
      const cost={lingshi:amt};if(!canAfford(cost))return {ok:false,reason:'insufficient',via:'S.res.lingshi'};
      pay(cost);return {ok:true,paid:amt,via:'S.res.lingshi'};
    }
    if((S.res.lingshi||0)<amt)return {ok:false,reason:'insufficient',via:'S.res.lingshi'};
    {const X=typeof econXws==='function'?econXws():null; if(X){const r=X.take('lingshi',amt,'legacyPay');return r&&r.ok?{ok:true,paid:amt,via:'XW_STORE'}:{ok:false,reason:'insufficient',via:'XW_STORE'};}}
    S.res.lingshi-=amt;return {ok:true,paid:amt,via:'S.res.lingshi'};
  }
  return {ok:false,reason:'no_wallet',via:'legacy'};
}
function econLegacyGain(who,amt){
  amt=Math.floor(+amt||0);if(!(amt>0))return {ok:true,gained:0,via:'legacy'};
  if(econIsSect(who)){
    who.stock=who.stock||{};who.stock.lingshi=(who.stock.lingshi||0)+amt;
    return {ok:true,gained:amt,via:'sect.stock.lingshi'};
  }
  if(econIsUnit(who)){
    who.lingshi=(who.lingshi||0)+amt;return {ok:true,gained:amt,via:'unit.lingshi'};
  }
  if(typeof S!=='undefined'&&S&&S.res){const X=typeof econXws==='function'?econXws():null; if(X&&X.add('lingshi',amt,'legacyGain').ok)return {ok:true,gained:amt,via:'XW_STORE'};S.res.lingshi=(S.res.lingshi||0)+amt;return {ok:true,gained:amt,via:'S.res.lingshi'};}
  return {ok:false,reason:'no_wallet',via:'legacy'};
}
function econLegacyCanPay(who,amt){
  amt=+amt||0;if(!(amt>0))return true;
  if(econIsSect(who))return (who.stock&&who.stock.lingshi||0)>=amt;
  if(econIsUnit(who))return (who.lingshi||0)>=amt;
  if(typeof S!=='undefined'&&S&&S.res){
    if(typeof canAfford==='function')return canAfford({lingshi:amt});
    return (S.res.lingshi||0)>=amt;
  }
  return false;
}
function econSeedUnitWallet(u){
  if(!u||u.id==null)return econWallet(u&&u.id,true);
  const w=econWallet(u.id,true);
  if(econBagXia(w)===0&&(u.lingshi||0)>0)econAddXia(w,Math.floor(u.lingshi),'xia');
  return w;
}
function econMirrorUnitWallet(u){
  if(!u||u.id==null)return;
  const w=econWallet(u.id,false);
  u.lingshi=w?econBagXia(w):(u.lingshi||0);
}
function econPay(unitOrSect,amount,reason){
  const a=econParsePayArgs(unitOrSect,amount,reason,arguments.length>3?arguments[3]:undefined);
  if(a.unsupported)return {ok:false,reason:'unsupported_currency',currency:a.currency};
  if(!(a.amount>0))return {ok:true,paid:0};
  if(!econFlag('treasury'))return econLegacyPay(a.who,a.amount);
  if(econIsSect(a.who))return econLegacyPay(a.who,a.amount);
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return econLegacyPay(a.who,a.amount);
  if(econIsUnit(a.who))econSeedUnitWallet(a.who);
  const target=econIsUnit(a.who)?a.who:'vault';
  const r=econCharge(target,a.amount,a.reason||'pay');
  if(econIsUnit(a.who))econMirrorUnitWallet(a.who);
  if(!r.ok)return r;
  return {ok:true,paid:r.paid,remain:r.remain,via:'S.econ'};
}
function econGain(unitOrSect,amount,reason){
  const a=econParsePayArgs(unitOrSect,amount,reason,arguments.length>3?arguments[3]:undefined);
  if(a.unsupported)return {ok:false,reason:'unsupported_currency',currency:a.currency};
  if(!(a.amount>0))return {ok:true,gained:0};
  if(!econFlag('treasury'))return econLegacyGain(a.who,a.amount);
  if(econIsSect(a.who))return econLegacyGain(a.who,a.amount);
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return econLegacyGain(a.who,a.amount);
  if(econIsUnit(a.who))econSeedUnitWallet(a.who);
  const target=econIsUnit(a.who)?a.who:'vault';
  const r=econGrant(target,a.amount,a.reason||'gain','xia');
  if(econIsUnit(a.who))econMirrorUnitWallet(a.who);
  if(!r.ok)return r;
  return {ok:true,gained:r.got,remain:r.remain,via:'S.econ'};
}
function econCanPay(unitOrSect,amount){
  const a=econParsePayArgs(unitOrSect,amount,arguments.length>2?arguments[2]:0,arguments.length>3?arguments[3]:undefined);
  if(a.unsupported)return false;
  if(!(a.amount>0))return true;
  if(!econFlag('treasury'))return econLegacyCanPay(a.who,a.amount);
  if(econIsSect(a.who))return econLegacyCanPay(a.who,a.amount);
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return econLegacyCanPay(a.who,a.amount);
  if(econIsUnit(a.who)){
    const w=econSeedUnitWallet(a.who);
    const have=w?econBagXia(w):(a.who.lingshi||0);
    return have>=a.amount;
  }
  return econBagXia(T.econ.vault)>=a.amount;
}

function econContribUnit(unit){
  if(!unit)return null;
  if(typeof unit==='number'||typeof unit==='string'){
    try{if(typeof unitById==='function')return unitById(unit)||null;}catch(e){return null;}
    return null;
  }
  return unit;
}
function econContribGet(unit){
  const u=econContribUnit(unit);
  if(!u)return 0;
  const n=Math.max(0,+(u.contrib!=null?u.contrib:(u.contribution!=null?u.contribution:u.gongxian))||0);
  if(u.contrib==null)u.contrib=n;
  return n;
}
function econContribAdd(unit,n,reason){
  const u=econContribUnit(unit);
  if(!u)return {ok:false,reason:'no-unit',added:0,remain:0};
  n=+n||0;
  const have=econContribGet(u);
  if(!n)return {ok:true,added:0,remain:have,via:'unit.contrib'};
  const next=Math.max(0,have+n);
  u.contrib=next;
  u.contribution=next;
  try{if(typeof econEmit==='function')econEmit('econ:contrib',{unitId:u.id,delta:n,remain:next,reason:reason||'contrib'});}catch(e){}
  return {ok:true,added:n,remain:next,via:'unit.contrib'};
}
function econContribCanPay(unit,n){
  n=+n||0;
  if(!(n>0))return true;
  return econContribGet(unit)>=n;
}
function econContribPay(unit,n,reason){
  const u=econContribUnit(unit);
  if(!u)return {ok:false,reason:'no-unit',paid:0,remain:0};
  n=+n||0;
  if(!(n>0))return {ok:true,paid:0,remain:econContribGet(u),via:'unit.contrib'};
  const have=econContribGet(u);
  if(have<n)return {ok:false,reason:'insufficient',paid:0,have:have,need:n,remain:have};
  const r=econContribAdd(u,-n,reason||'contrib-pay');
  if(!r.ok)return r;
  return {ok:true,paid:n,remain:r.remain,via:'unit.contrib'};
}
function econContribKeep(){
  try{
    if(typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)&&UNIT_KEEP.indexOf('contrib')<0)UNIT_KEEP.push('contrib');
    if(typeof UNIT_KEEP!=='undefined'&&Array.isArray(UNIT_KEEP)&&UNIT_KEEP.indexOf('econStipendCarry')<0)UNIT_KEEP.push('econStipendCarry');
  }catch(e){}
}


// ================== 智能派工 sa1–sa5（2026-11-11）==================
// 各提案獨立旗標，預設開；不放進 ECON_FLAGS_DEFAULT（以免 g23 ?dev=1 全打開）。
// 優先序：window.ECON_SA{n}_FORCE（非 null）→ 網址 ?sa{n}=1/0 → S.econ.flags.sa{n}（僅在非 null）→ 預設開。
var ECON_SA1_DEFAULT=true; // 提案1：採集看缺口＋職業／靈根／體質
var ECON_SA2_DEFAULT=true; // 提案2：非手令、非智能採集的溫和重分配
var ECON_SA3_DEFAULT=true; // 提案3：自動建造尊重手令、優先真閒置
var ECON_SA4_DEFAULT=true; // 提案4：靈田／煉丹／鍛造有空位時長老才派人
var ECON_SA5_DEFAULT=true; // 提案5：自動出行／幫手尊重手令與現職
var ECON_SA_DEFAULT={sa1:ECON_SA1_DEFAULT,sa2:ECON_SA2_DEFAULT,sa3:ECON_SA3_DEFAULT,sa4:ECON_SA4_DEFAULT,sa5:ECON_SA5_DEFAULT};
function econSaOn(key,T){
  key=String(key||'');
  const forceName='ECON_'+key.toUpperCase()+'_FORCE';
  try{
    if(typeof window!=='undefined'&&window[forceName]!=null)return !!window[forceName];
  }catch(e){}
  try{
    if(typeof location!=='undefined'&&location&&location.search){
      const m=new RegExp('[?&]'+key+'=([01])\\b').exec(location.search);
      if(m)return m[1]==='1';
    }
  }catch(e){}
  try{
    const F=(T&&T.econ&&T.econ.flags)||(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags);
    if(F&&F[key]!=null)return !!F[key];
  }catch(e){}
  return !!(ECON_SA_DEFAULT[key]);
}
function econSaManualLocked(u){
  if(!u)return false;
  try{
    if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.manualLocked==='function')
      return !!window.XW_ECON.manualLocked(u);
  }catch(e){}
  try{
    if(u.manualUntil==null||!isFinite(+u.manualUntil))return false;
    const t=(typeof S!=='undefined'&&S&&S.time)||0;
    return t<+u.manualUntil;
  }catch(e){}
  return false;
}
function econSaManualAuto(fn){
  try{
    if(typeof window!=='undefined'&&window.XW_ECON&&typeof window.XW_ECON.manualAuto==='function')
      return window.XW_ECON.manualAuto(fn);
  }catch(e){}
  try{
    if(typeof window!=='undefined')window._econManualAuto=(window._econManualAuto||0)+1;
    return fn();
  }finally{
    try{if(typeof window!=='undefined')window._econManualAuto=Math.max(0,(window._econManualAuto||1)-1);}catch(e2){}
  }
}

function econSnapFields(T){
  T=T||(typeof S!=='undefined'?S:null);
  if(!T||!T.econ)return null;
  try{return JSON.parse(JSON.stringify(T.econ));}catch(e){return T.econ;}
}
function econAttachApi(){
  const prev=(typeof window!=='undefined'&&window.XW_ECON)||{};
  const keep=function(name,fn){return (prev&&typeof prev[name]==='function'&&prev[name]!==fn)?prev[name]:fn;};
  const api={
    VER:ECON_VER,FLAGS:ECON_FLAGS_DEFAULT,TUNE:ECON_TUNE,GRADES:ECON_GRADES,GRADE_NAME:ECON_GRADE_NAME,
    flag:econFlag,any:econAnyFlag,init:econInitState,migrate:econMigrateSave,defaultState:econDefaultState,
    toXia:econToXia,fromXia:econFromXia,bagXia:econBagXia,fmtXiaGrade:econFmtXiaGrade,fmtShortXia:econFmtShortXia,syncRes:econSyncResFromVault,syncVault:econSyncVaultFromRes,
    wallet:econWallet,setTax:econSetTaxRate,setStipend:econSetStipend,
    cultivationCost:econCultivationCost,cultivationCostPerPoint:econCultivationCostPerPoint,cultCharge:econCultCharge,wasteRate:econWasteRate,charge:econCharge,grant:econGrant,
    pay:econPay,gain:econGain,canPay:econCanPay,
    contribGet:keep('contribGet',econContribGet),contribAdd:keep('contribAdd',econContribAdd),contribCanPay:keep('contribCanPay',econContribCanPay),contribPay:keep('contribPay',econContribPay),
    feeRegister:econFeeRegister,feeGet:econFeeGet,feeSet:econFeeSet,feeCharge:econFeeCharge,feePay:econFeePay,feeHydrate:econFeeHydrate,
    onQuestReward:econOnQuestReward,incomeScale:econIncomeScale,tick:econTick,payMonth:econPayMonth,
    financeHtml:econFinanceHtml,walletHtml:econWalletHtml,sectOpen:econSectOpen,sectToggle:econSectToggle,sectBoundCode:econSectBoundCode,sectBoundName:econSectBoundName,sectBtnLabel:econSectBtnLabel,ledgerLabel:econLedgerLabel,sectPanelHtml:econSectPanelHtml,installSectToolbar:econSectToolbarInstall,emit:econEmit,events:ECON_EVENTS,log:econLog,
    saOn:econSaOn,saManualLocked:econSaManualLocked,saManualAuto:econSaManualAuto,SA_DEFAULT:ECON_SA_DEFAULT,SA1_DEFAULT:ECON_SA1_DEFAULT,SA2_DEFAULT:ECON_SA2_DEFAULT,SA3_DEFAULT:ECON_SA3_DEFAULT,SA4_DEFAULT:ECON_SA4_DEFAULT,SA5_DEFAULT:ECON_SA5_DEFAULT,snap:econSnapFields,hasBranch:econHasBranch,payMode:econPayMode,payModeSet:econPayModeSet,payOrder:econPayOrder,payOrderMove:econPayOrderMove,monthPlan:econMonthPlan,monthNote:econMonthNote,payPeriodLen:econPayPeriodLen,payPeriodText:econPayPeriodText,
    onTravelTrade:function(travel,other){if(!econFlag('market')&&!econFlag('treasury'))return null;econEmit('econ:travel-trade',{travelId:travel&&travel.id,other:other});return {ok:true,stub:true};}
  };
  try{
    if(typeof window!=='undefined'){
      if(window.XW_ECON)Object.assign(window.XW_ECON,api);
      else window.XW_ECON=api;
      if(window.XW)window.XW.econ=window.XW_ECON;
      return window.XW_ECON;
    }
  }catch(e){}
  return api;
}

function econSectCss(){
  if(typeof document==='undefined')return;
  if(document.getElementById('econ-sect-css'))return;
  const st=document.createElement('style');st.id='econ-sect-css';
  st.textContent='#menuBar{flex-wrap:wrap}'+
    '#b_econsect{flex:0 0 auto;white-space:nowrap}'+
    '#econ-sect{display:none;position:fixed;z-index:88;left:50%;top:calc(var(--sat, 0px) + 46px);transform:translateX(-50%);width:min(640px,calc(100vw - 16px));max-height:calc(100dvh - var(--sat, 0px) - 54px);overflow:hidden;flex-direction:column;box-sizing:border-box;background:linear-gradient(180deg,#241c14,#16120c);border:1px solid #c9a35a;outline:1px solid #d7b56a66;border-radius:4px;box-shadow:0 12px 40px #000c,inset 0 1px 0 #f3d48a33;color:#f3e3c0}'+
    '#econ-sect.open{display:flex}'+
    '#econ-sect .econ-sect-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid #8a6a3a55;flex:0 0 auto;background:#241c14}'+
    '#econ-sect .econ-sect-hd .gt{color:#f3d48a;letter-spacing:3px;font-size:13px}'+
    '#econ-sect .xwsect>.gt{display:none}'+
    '#econ-sect .econ-sect-x{flex:0 0 auto}'+
    '#econ-sect .econ-sect-bd{overflow:auto;flex:1;min-height:0;padding:6px 10px 12px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}'+
    '#econ-sect .xwsect-tb{display:flex;flex-wrap:wrap;gap:0;margin:6px 0;border-bottom:1px solid #8a6a3a55}'+
    '#econ-sect .xwsect-tb .btn{flex:1;min-width:64px;background:none;border:0;border-bottom:2px solid transparent;border-radius:0;color:#cbb992;padding:6px 8px}'+
    '#econ-sect .xwsect-tb .btn.on{color:#f3d48a;border-bottom-color:#c9a35a;font-weight:bold}'+
    '#econ-sect .xwsect-pane{display:none;padding:6px 2px 2px}#econ-sect .xwsect-pane.on{display:block}'+
    '@media (max-width:420px){#econ-sect{width:calc(100vw - 12px);top:calc(var(--sat, 0px) + 42px);max-height:calc(100dvh - var(--sat, 0px) - 48px)}#econ-sect .xwsect-tb .btn{min-width:48px;padding:8px 4px;font-size:12px}}';
  (document.head||document.documentElement).appendChild(st);
}
function econSectPanelHtml(){
  try{if(typeof xwSectPauseHtml==='function'){const h=xwSectPauseHtml();if(h)return h;}}catch(e){}
  const panes=[];
  try{const fh=typeof econFinanceHtml==='function'?econFinanceHtml({open:1,noToggle:1}):'';if(fh)panes.push(['fin','財務',fh]);}catch(e){}
  try{const rh=typeof econRankFilterHtml==='function'?econRankFilterHtml(true):'';if(rh)panes.push(['rank','職位',rh]);}catch(e){}
  try{if(typeof econFlag==='function'&&econFlag('taskTiers')&&typeof econTaskListHtml==='function'){const th=econTaskListHtml(typeof xwTaskQuests==='function'?xwTaskQuests():[],typeof player==='function'?player():null);if(th)panes.push(['task','任務',th]);}}catch(e){}
  if(!panes.length)return '<div class="xwsect"><div class="gt">宗門事務</div><div class="dim sm">目前沒有可顯示的宗門事務。</div></div>';
  let h='<div class="x47g xwsect"><div class="gt">宗門事務</div><div class="xwsect-tb">';
  panes.forEach(function(p,i){h+='<button type="button" class="btn'+(i===0?' on':'')+'" data-xwsect="'+p[0]+'">'+p[1]+'</button>';});
  h+='</div>';
  panes.forEach(function(p,i){h+='<div class="xwsect-pane'+(i===0?' on':'')+'" data-xwsect-pane="'+p[0]+'">'+p[2]+'</div>';});
  return h+'</div>';
}
function econSectBox(){
  if(typeof document==='undefined')return null;
  let el=document.getElementById('econ-sect');
  if(!el){
    el=document.createElement('div');
    el.id='econ-sect';
    el.className='ui';
    el.innerHTML='<div class="econ-sect-hd"><div class="gt">宗門事務</div><button type="button" class="btn econ-sect-x" data-econ-sect="close">✕</button></div><div class="econ-sect-bd" id="econ-sect-bd"></div>';
    (document.body||document.documentElement).appendChild(el);
    el.addEventListener('click',function(ev){
      const t=ev.target&&ev.target.closest&&ev.target.closest('[data-econ-sect="close"]');
      if(t){ev.preventDefault();ev.stopPropagation();econSectOpen(false);}
    });
  }
  return el;
}
function econSectOpen(on){
  try{
    econSectCss();
    const el=econSectBox();if(!el)return false;
    if(on==null)on=!el.classList.contains('open');
    if(on){
      const bd=document.getElementById('econ-sect-bd');
      let tab=null,scroll=0;
      if(bd){
        scroll=bd.scrollTop||0;
        const onBtn=bd.querySelector('.xwsect-tb [data-xwsect].on');
        if(onBtn)tab=onBtn.getAttribute('data-xwsect');
      }
      if(bd)bd.innerHTML=econSectPanelHtml();
      if(tab&&bd){
        const box=bd.querySelector('.xwsect');
        if(box&&box.querySelector('.xwsect-tb [data-xwsect="'+tab+'"]')){
          box.querySelectorAll('.xwsect-tb [data-xwsect]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-xwsect')===tab);});
          box.querySelectorAll('[data-xwsect-pane]').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-xwsect-pane')===tab);});
        }
        bd.scrollTop=scroll;
      }
      el.classList.add('open');
      const btn=document.getElementById('b_econsect');if(btn)btn.classList.add('on');
      try{
        const tb=document.getElementById('topbar');
        const r=tb?tb.getBoundingClientRect():null;
        const top=Math.round((r?r.bottom:46)+6);
        el.style.top=top+'px';
        el.style.maxHeight=Math.max(140,(window.innerHeight||800)-top-10)+'px';
      }catch(e){}
    }else{
      el.classList.remove('open');
      const btn=document.getElementById('b_econsect');if(btn)btn.classList.remove('on');
    }
    return true;
  }catch(e){return false;}
}
function econSectToggle(){return econSectOpen();}
function econSectBoundCode(){
  try{if(typeof v173Key==='function'){const c=v173Key('sect');if(c)return c;}}catch(e){}
  return 'KeyO';
}
function econSectBoundName(){
  const c=econSectBoundCode();
  try{if(typeof v173KeyName==='function'){const n=v173KeyName(c);if(n)return n;}}catch(e){}
  const m=/^Key([A-Z])$/.exec(c);return m?m[1]:'O';
}
function econSectBtnLabel(){return '宗門事務 ('+econSectBoundName()+')';}
function econHideOurOldSectEntry(){
  try{
    document.querySelectorAll('[data-econ-sect-btn]').forEach(function(n){
      if(n&&n.id!=='b_econsect'){try{n.remove();}catch(e){try{n.style.display='none';}catch(e2){}}}
    });
  }catch(e){}
}
function econSectToolbarInstall(){
  if(typeof document==='undefined')return false;
  try{econSectCss();}catch(e){}
  const bar=document.getElementById('menuBar');if(!bar)return false;
  econHideOurOldSectEntry();
  let btn=document.getElementById('b_econsect');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='btn';
    btn.id='b_econsect';
    btn.dataset.econSectBtn='1';
    btn.addEventListener('click',function(ev){
      ev.preventDefault();ev.stopPropagation();
      econSectToggle();
    });
  }
  try{btn.textContent=econSectBtnLabel();btn.title=econSectBtnLabel();}catch(e){btn.textContent='宗門事務 (O)';btn.title='宗門事務 (O)';}
  const setpc=document.getElementById('b_setpc');
  const map=document.getElementById('b_bigmap');
  if(setpc&&setpc.parentElement===bar){
    if(btn.nextSibling!==setpc)bar.insertBefore(btn,setpc);
  }else if(map&&map.parentElement===bar){
    if(map.nextSibling!==btn)map.after(btn);
  }else if(btn.parentElement!==bar)bar.appendChild(btn);
  return true;
}
function econSectInstallHooks(){
  try{econSectToolbarInstall();}catch(e){}
  try{
    if(typeof uiBlock==='function'&&!uiBlock._econSect){
      const _ub=uiBlock;
      uiBlock=function(){
        return _ub.apply(this,arguments);
      };
      uiBlock._econSect=1;
    }
  }catch(e){}
  try{
    if(typeof document!=='undefined'&&!document._econSectEsc){
      document._econSectEsc=1;
      document.addEventListener('keydown',function(ev){
        if(!ev||ev.repeat)return;
        const el=document.getElementById('econ-sect');
        if(!el||!el.classList.contains('open'))return;
        if(ev.key==='Escape'){
          econSectOpen(false);
          ev.preventDefault();ev.stopPropagation();
          return;
        }
        let want='KeyO';
        try{want=econSectBoundCode();}catch(e){}
        let mapped=ev.code;
        try{if(typeof v173Map==='function')mapped=v173Map(ev.code);}catch(e2){}
        if(ev.code===want||mapped==='KeyO'||mapped===want){
          econSectOpen(false);
          ev.preventDefault();
          if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
          else ev.stopPropagation();
        }
      },true);
    }
  }catch(e){}
}
econAttachApi();
econContribKeep();
try{econFeeRegisterDefaults();econFeeBindUi();econFinanceScopeInstall();econSectInstallHooks();}catch(e){}
try{if(typeof setTimeout==='function'){setTimeout(function(){econAttachApi();econContribKeep();try{econFeeRegisterDefaults();econFeeBindUi();econFinanceScopeInstall();econSectInstallHooks();}catch(e){}},0);setTimeout(function(){try{econSectInstallHooks();}catch(e){}},80);setTimeout(function(){try{econSectInstallHooks();}catch(e){}},400);setInterval(function(){try{econSectToolbarInstall();}catch(e){}},800);}}catch(e){}
