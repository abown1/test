// ================== 仙武經濟：功法閣（借閱／參悟／歸還；熟練度不在本檔）==================
// 旗 gf 預設 ON。功法內容與熟練度歸仙武修煉（XW_GF）；本檔只管卷軸庫存、權限、借閱費、研習席位與速度。
var ECON_GF_FLAGS={gf:true};
var ECON_GF_POSTS=[
  {id:'zhangmen',name:'掌門'},{id:'zhanglao',name:'長老'},{id:'zhifa',name:'執法'},
  {id:'waishi',name:'外事'},{id:'neimen',name:'內門'},{id:'waimen',name:'外門'},{id:'zayi',name:'雜役'}
];
var ECON_GF_TUNE={
  borrowBaseXia:8,                 // 待確認：借閱費基價（下品）
  stockBuyBaseXia:20,              // 待確認：進貨一冊基價（下品）
  stockSellMul:0.60,               // 待確認：出售折價
  gradeMul:{xia:1,zhong:3,shang:10,ji:40},
  realmMul:1.35,                   // 待確認：每境倍率
  borrowSec:1800,                  // 待確認：借閱時限（秒）；逾期自動歸還、無永久懲罰
  studySec:120,                    // 待確認：參悟讀完需時（秒，再除研習速度）
  speedPerLv:0.15,                 // 待確認：功法閣每級研習速度 +15%（Lv1＝1）
  slotsBase:2,                     // 待確認：Lv1 研習席
  slotsPerLv:1,                    // 待確認：之後每級 +1 席
  unlockRealm:4,                   // 待確認：煉氣解鎖
  upkeepXia:10,
  cost:{wood:70,stone:40,fiber:20},
  time:16,hp:480,size:2,
  accessByGrade:{
    xia:{minPost:null,minContrib:0},
    zhong:{minPost:'waimen',minContrib:10},
    shang:{minPost:'neimen',minContrib:40},
    ji:{minPost:'zhanglao',minContrib:100}
  },
  seedByTier:{low:3,mid:2,high:1,xia:3,zhong:2,shang:1,ji:1}
};
var ECON_GF_BUILD={
  type:'gongfage',name:'功法閣',realm:'lianqi',realmIdx:4,unlockProposed:true,size:2,
  cost:{wood:70,stone:40,fiber:20},time:16,hp:480,upkeepXia:10,
  effect:{kind:'gfStudy',speedPerLv:0.15,slots:2,slotsPerLv:1},
  note:'藏卷借閱／參悟；等級提升研習速度與席位。讀完即記、卷軸歸還'
};
var ECON_GF_FALLBACK=[
  {id:'qingxin',name:'清心明鏡訣',realm:4,grade:'xia',kind:'passive'},
  {id:'taiyi',name:'太乙鎮妖印',realm:4,grade:'zhong',kind:'active'},
  {id:'qiankun',name:'乾坤伏魔劍陣',realm:5,grade:'zhong',kind:'active'},
  {id:'ziwei',name:'紫微天火印',realm:6,grade:'shang',kind:'active'},
  {id:'puti',name:'菩提心經',realm:6,grade:'shang',kind:'passive'}
];
function econGfFlag(){
  try{return !!(typeof S!=='undefined'&&S&&S.econ&&S.econ.flags&&S.econ.flags.gf);}catch(e){return false;}
}
function econGfMergeFlags(F){
  if(!F||typeof F!=='object')return F;
  if(F.gf==null)F.gf=true;
  return F;
}
function econGfNow(){try{return (typeof econNow==='function')?econNow():((typeof S!=='undefined'&&S&&S.time)||0);}catch(e){return 0;}}
function econGfState(create){
  const T=(typeof S!=='undefined'?S:null);if(!T||!T.econ)return null;
  if(!T.econ.gf&&create)T.econ.gf=econGfDefault();
  const G=T.econ.gf;if(!G)return null;
  if(!Array.isArray(G.scrolls))G.scrolls=[];
  if(!Array.isArray(G.loans))G.loans=[];
  if(!Array.isArray(G.studies))G.studies=[];
  if(!G.owned||typeof G.owned!=='object')G.owned={};
  if(!G.reading||typeof G.reading!=='object')G.reading={};
  if(!G.rules||typeof G.rules!=='object')G.rules={};
  if(G.nextId==null)G.nextId=1;
  if(G.seeded==null)G.seeded=false;
  return G;
}
function econGfDefault(){
  return {scrolls:[],loans:[],studies:[],owned:{},reading:{},rules:{},nextId:1,seeded:false};
}
function econGfMigrate(target){
  const T=target||(typeof S!=='undefined'?S:null);if(!T)return null;
  if(!T.econ)return null;
  if(!T.econ.flags)T.econ.flags={};
  econGfMergeFlags(T.econ.flags);
  try{if(typeof ECON_FLAGS_DEFAULT!=='undefined')econGfMergeFlags(ECON_FLAGS_DEFAULT);}catch(e){}
  if(!T.econ.gf||typeof T.econ.gf!=='object')T.econ.gf=econGfDefault();
  econGfState(true);
  // Preserve all legacy balances; catalogue-seeded and genuinely acquired copies cannot be distinguished retrospectively.
  for(const row of (Array.isArray(T.econ.gf.scrolls)?T.econ.gf.scrolls:[]))if(row&&!row.stockSource)row.stockSource='legacy-unverified';
  econGfRegisterCatalog();
  try{if(econGfHook())econGfSeedStock();}catch(e){}
  return T.econ.gf;
}
function econGfRegisterCatalog(){
  try{
    if(typeof ECON_NEW_BUILDS!=='undefined'&&Array.isArray(ECON_NEW_BUILDS)){
      if(!ECON_NEW_BUILDS.some(function(d){return d&&d.type==='gongfage';}))ECON_NEW_BUILDS.push(ECON_GF_BUILD);
    }
  }catch(e){}
}
function econGfHook(){
  try{
    if(typeof window!=='undefined'&&window.XW_GF)return window.XW_GF;
    if(typeof XW!=='undefined'&&XW&&XW.gf)return XW.gf;
  }catch(e){}
  return null;
}
function econGfNormTech(t){
  if(!t||typeof t!=='object')return t;
  const o={};
  for(const k in t){if(Object.prototype.hasOwnProperty.call(t,k))o[k]=t[k];}
  if(o.id==null&&o.gfId!=null)o.id=o.gfId;
  if(o.realm==null&&o.minRealm!=null)o.realm=o.minRealm|0;
  if(!o.grade){
    if(o.tier==='low')o.grade='xia';
    else if(o.tier==='mid')o.grade='zhong';
    else if(o.tier==='high')o.grade=((o.realm|0)>=8?'ji':'shang');
  }
  return o;
}
function econGfList(){
  const H=econGfHook();
  if(H&&typeof H.list==='function'){
    try{const L=H.list();if(Array.isArray(L)&&L.length)return L.map(econGfNormTech);}catch(e){}
  }
  return ECON_GF_FALLBACK.slice();
}
function econGfGet(id){
  if(!id)return null;
  const H=econGfHook();
  if(H&&typeof H.get==='function'){
    try{const t=H.get(id);if(t)return econGfNormTech(t);}catch(e){}
  }
  const L=econGfList();
  for(let i=0;i<L.length;i++)if(L[i]&&(L[i].id===id||L[i].gfId===id))return L[i];
  return null;
}
function econGfHasLive(){
  const H=econGfHook();
  return !!(H&&(typeof H.list==='function'||typeof H.get==='function'||typeof H.owns==='function'));
}
function econGfCultOwns(unit,id){
  const H=econGfHook();
  if(H&&typeof H.owns==='function'){
    try{return !!H.owns(unit,id);}catch(e){}
  }
  try{if(unit&&unit.gf&&unit.gf.learned&&unit.gf.learned[id])return true;}catch(e){}
  if(H)return false;
  try{
    const G=econGfState(false);const uid=unit&&unit.id;
    if(G&&uid!=null&&G.owned[uid]&&G.owned[uid][id])return true;
  }catch(e){}
  return !!(unit&&unit.econGf&&unit.econGf.indexOf&&unit.econGf.indexOf(id)>=0);
}
function econGfCultLearn(unit,id){
  const H=econGfHook();
  if(H&&typeof H.learn==='function'){
    try{
      const r=H.learn(unit,id,'gongfage');
      if(r&&r.ok===false)return {ok:false,reason:r.reason||'learn-failed'};
      if(r&&r.ok)return r;
      return {ok:true,via:'XW_GF'};
    }catch(e){return {ok:false,reason:'learn-error'};}
  }
  if(!unit)return {ok:false,reason:'no-unit'};
  unit.econGf=unit.econGf||[];
  if(unit.econGf.indexOf(id)<0)unit.econGf.push(id);
  const G=econGfState(true);if(G){const uid=unit.id;G.owned[uid]=G.owned[uid]||{};G.owned[uid][id]=true;}
  return {ok:true,via:'fallback'};
}
function econGfUnitSpeedMul(unit){
  try{
    const fn=(typeof window!=='undefined'&&window.CultGF&&typeof window.CultGF.studySpeedMul==='function')?window.CultGF.studySpeedMul:null;
    if(!fn)return 1;
    const m=+fn(unit);
    if(!isFinite(m)||!(m>0))return 1;
    return m;
  }catch(e){return 1;}
}
function econGfPosts(){
  try{if(typeof ECON_POSTS!=='undefined'&&ECON_POSTS&&ECON_POSTS.length)return ECON_POSTS;}catch(e){}
  return ECON_GF_POSTS;
}
function econGfPostRank(postId){
  if(!postId)return 99;
  const P=econGfPosts();
  for(let i=0;i<P.length;i++)if(P[i].id===postId)return i;
  return 99;
}
function econGfUnitPost(u){
  try{if(typeof econPostOf==='function')return econPostOf(u);}catch(e){}
  return u&&(u.office||u.econOffice)||null;
}
function econGfIsPlayer(u){
  try{if(typeof econIsPlayerUnit==='function'&&econIsPlayerUnit(u))return true;}catch(e){}
  return !!(u&&u.kind==='player');
}
function econGfContrib(u){
  if(!u)return 0;
  return +(u.contrib||u.contribution||u.gongxian||u.gongxianVal||0);
}
function econGfGradeOf(tech){
  if(!tech)return 'xia';
  if(tech.grade&&(typeof ECON_GRADES==='undefined'||ECON_GRADES.indexOf(tech.grade)>=0))return tech.grade;
  if(tech.tier==='low')return 'xia';
  if(tech.tier==='mid')return 'zhong';
  if(tech.tier==='high'){
    const rh=(tech.realm!=null?tech.realm:tech.minRealm)|0;
    return rh>=8?'ji':'shang';
  }
  const r=(tech.realm!=null?tech.realm:tech.minRealm)|0;
  if(r>=8)return 'ji';if(r>=6)return 'shang';if(r>=4)return 'zhong';return 'xia';
}
function econGfAccessOf(tech){
  const id=tech&&(tech.id||tech.gfId);
  const grade=econGfGradeOf(tech);
  const def=(ECON_GF_TUNE.accessByGrade&&ECON_GF_TUNE.accessByGrade[grade])||{minPost:null,minContrib:0};
  let acc={minPost:def.minPost,minContrib:def.minContrib||0};
  if(tech&&tech.access){if(tech.access.minPost!==undefined)acc.minPost=tech.access.minPost;if(tech.access.minContrib!=null)acc.minContrib=+tech.access.minContrib;}
  try{
    const G=econGfState(false);
    if(G&&id&&G.rules[id]){
      const r=G.rules[id];
      if(r.minPost!==undefined)acc.minPost=r.minPost;
      if(r.minContrib!=null)acc.minContrib=+r.minContrib;
    }
  }catch(e){}
  return acc;
}
function econGfCanAccess(unit,techOrId){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  const tech=typeof techOrId==='object'&&techOrId?techOrId:econGfGet(techOrId);
  if(!tech)return {ok:false,reason:'no-tech'};
  if(econGfIsPlayer(unit))return {ok:true,via:'player'};
  const acc=econGfAccessOf(tech);
  if(acc.minPost){
    const have=econGfUnitPost(unit);
    if(econGfPostRank(have)>econGfPostRank(acc.minPost))return {ok:false,reason:'post',need:acc.minPost,have:have||null};
  }
  const c=econGfContrib(unit);
  if((acc.minContrib||0)>c)return {ok:false,reason:'contrib',need:acc.minContrib,have:c};
  return {ok:true,access:acc};
}
function econGfBestBuilding(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return null;
  let best=null,lv=0;
  for(const b of T.buildings){
    if(!b||b.type!=='gongfage'||!b.built||b.broken)continue;
    const n=(typeof econBuildingLvOf==='function'?econBuildingLvOf(b):(b.lv||1))||1;
    if(n>lv){lv=n;best=b;}
  }
  return best;
}
function econGfLvOf(bldg){
  if(bldg&&typeof bldg==='object'&&(bldg.type==='gongfage'||bldg.lv!=null)){
    try{if(typeof econBuildingLvOf==='function')return econBuildingLvOf(bldg)||1;}catch(e){}
    return bldg.lv||1;
  }
  const b=econGfBestBuilding();
  return b?((b.lv||1)):0;
}
function econGfStudySpeedMul(sectOrB,unit){
  if(!econGfFlag())return 1;
  let lv=0;
  if(sectOrB&&typeof sectOrB==='object'&&sectOrB.type==='gongfage')lv=econGfLvOf(sectOrB);
  else if(sectOrB&&typeof sectOrB==='object'&&Array.isArray(sectOrB.buildings)){
    let best=0;for(const b of sectOrB.buildings){if(b&&b.type==='gongfage'&&b.built&&!b.broken)best=Math.max(best,b.lv||1);}lv=best;
  }else lv=econGfLvOf();
  const base=lv>0?(1+ECON_GF_TUNE.speedPerLv*Math.max(0,lv-1)):1;
  const extra=econGfUnitSpeedMul(unit||sectOrB);
  const mul=base*extra;
  return +(isFinite(mul)&&mul>0?mul:1).toFixed(4);
}
function econGfSlots(sectOrB){
  if(!econGfFlag())return 0;
  let lv=0;
  if(sectOrB&&typeof sectOrB==='object'&&sectOrB.type==='gongfage')lv=econGfLvOf(sectOrB);
  else lv=econGfLvOf();
  if(!(lv>0))return 0;
  return (ECON_GF_TUNE.slotsBase||0)+ (ECON_GF_TUNE.slotsPerLv||0)*Math.max(0,lv-1);
}
function econGfSlotsUsed(T){
  const G=econGfState(false);if(!G)return 0;
  let n=0;for(const s of G.studies){if(s&&!s.done&&!s.paused)n++;}return n;
}
function econGfHintXia(tech){
  if(!tech)return 0;
  const p=tech.price;
  if(typeof p==='number'&&isFinite(p)&&p>0)return +p;
  if(p&&typeof p==='object'){
    if(+p.xia>0)return +p.xia;
    if(+p.hint>0)return +p.hint;
  }
  try{
    const id=tech.id||tech.gfId;
    if(id&&typeof window!=='undefined'&&window.CultGF&&typeof window.CultGF.priceHint==='function'){
      const h=window.CultGF.priceHint(id);
      if(h&&+h.xia>0)return +h.xia;
    }
  }catch(e){}
  return 0;
}
function econGfFormulaPrice(tech,kind){
  const grade=econGfGradeOf(tech);
  const gm=(ECON_GF_TUNE.gradeMul&&ECON_GF_TUNE.gradeMul[grade])||1;
  const rm=Math.pow(ECON_GF_TUNE.realmMul||1,Math.max(0,(tech.realm!=null?tech.realm:tech.minRealm)|0));
  const base=kind==='buy'||kind==='stock'?ECON_GF_TUNE.stockBuyBaseXia:ECON_GF_TUNE.borrowBaseXia;
  return Math.max(1,Math.round(base*gm*rm));
}
function econGfPrice(tech,kind){
  tech=typeof tech==='object'&&tech?tech:econGfGet(tech);
  if(!tech)return 0;
  const hint=econGfHintXia(tech);
  if(hint>0){
    if(kind==='buy'||kind==='stock')return Math.max(1,Math.round(hint));
    const ratio=(ECON_GF_TUNE.borrowBaseXia||8)/(ECON_GF_TUNE.stockBuyBaseXia||20);
    return Math.max(1,Math.round(hint*ratio));
  }
  return econGfFormulaPrice(tech,kind);
}
function econGfSeedN(tech){
  const tier=tech&&(tech.tier||econGfGradeOf(tech))||'low';
  const M=ECON_GF_TUNE.seedByTier||{};
  if(M[tier]!=null)return M[tier]|0;
  return 1;
}
function econGfSeedStock(force){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  if(!econGfHook())return {ok:false,reason:'no-live',via:'fallback'};
  const G=econGfState(true);if(!G)return {ok:false,reason:'no-state'};
  // A complete technique catalogue is not acquired stock. Keep this public compatibility entry fail-closed,
  // including force=true; do not erase any previously seeded or legitimately acquired copies.
  return {ok:false,reason:'catalog-not-stock',added:0,n:G.scrolls.length};
}
function econGfSellPrice(tech){
  return Math.max(1,Math.round(econGfPrice(tech,'stock')*(ECON_GF_TUNE.stockSellMul||0.6)));
}
function econGfScroll(gfId,create,tech){
  const G=econGfState(create);if(!G)return null;
  for(let i=0;i<G.scrolls.length;i++)if(G.scrolls[i]&&G.scrolls[i].gfId===gfId)return G.scrolls[i];
  if(!create)return null;
  tech=tech||econGfGet(gfId)||{id:gfId,name:gfId,realm:0,grade:'xia'};
  const row={gfId:gfId,name:tech.name||gfId,grade:econGfGradeOf(tech),realm:tech.realm|0,n:0};
  G.scrolls.push(row);return row;
}
function econGfStore(sectOrB,scroll,n){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  const id=(typeof scroll==='string')?scroll:(scroll&&(scroll.gfId||scroll.id));
  if(!id)return {ok:false,reason:'no-id'};
  n=Math.max(1,n|0||1);
  const prior=econGfScroll(id,false);
  const row=prior||econGfScroll(id,true,typeof scroll==='object'?scroll:null);
  if(!row.stockSource)row.stockSource=prior?'legacy-unverified':'recorded-deposit';
  row.n=(row.n||0)+n;
  try{if(typeof econEmit==='function')econEmit('econ:gf:store',{gfId:id,n:n,have:row.n});}catch(e){}
  return {ok:true,gfId:id,n:row.n};
}
function econGfWithdraw(dest,gfId,n){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  n=Math.max(1,n|0||1);
  const row=econGfScroll(gfId,false);
  if(!row||(row.n||0)<n)return {ok:false,reason:'no-stock',have:row?row.n:0};
  row.n-=n;
  try{if(typeof econEmit==='function')econEmit('econ:gf:withdraw',{gfId:gfId,n:n,have:row.n,dest:dest&&dest.id});}catch(e){}
  return {ok:true,gfId:gfId,n:row.n,scroll:{gfId:gfId,name:row.name,grade:row.grade,realm:row.realm,n:n}};
}
function econGfLoanOf(unit,gfId){
  const G=econGfState(false);if(!G||!unit)return null;
  const uid=unit.id;
  for(const L of G.loans){if(L&&!L.returned&&L.unitId===uid&&L.gfId===gfId)return L;}
  return null;
}
function econGfPayFrom(unit,xia,note){
  xia=Math.max(0,Math.round(+xia||0));
  if(!(xia>0))return {ok:true,paid:0};
  try{
    if(typeof econPay==='function'){const r=econPay(unit,xia,note);if(r)return r;}
  }catch(e){}
  try{
    if(typeof econCharge==='function'){const r=econCharge(unit,xia,note);if(r)return r;}
  }catch(e){}
  return {ok:false,reason:'no-pay'};
}
function econGfTakeRevenue(price,note){
  price=Math.max(0,Math.round(+price||0));
  if(!(price>0))return {tax:0,kept:0,total:0};
  const T=(typeof S!=='undefined'?S:null);
  const rate=(T&&T.econ&&T.econ.taxRate!=null)?T.econ.taxRate:((typeof ECON_TUNE!=='undefined'&&ECON_TUNE.taxDef)||0.15);
  const tax=Math.floor(price*rate),kept=price-tax;
  const gain=(amt,tag)=>{
    if(!(amt>0))return;
    try{if(typeof econGain==='function'){econGain('vault',amt,tag);return;}}catch(e){}
    try{if(typeof econGrant==='function')econGrant('vault',amt,tag,'xia');}catch(e){}
  };
  if(tax>0)gain(tax,(note||'gf')+':tax');
  if(kept>0)gain(kept,(note||'gf')+':income');
  return {tax:tax,kept:kept,total:price,rate:rate};
}
function econGfBorrow(unit,gfId){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  if(!unit)return {ok:false,reason:'no-unit'};
  const tech=econGfGet(gfId);if(!tech)return {ok:false,reason:'no-tech'};
  const acc=econGfCanAccess(unit,tech);if(!acc.ok)return acc;
  if(econGfLoanOf(unit,gfId))return {ok:false,reason:'already'};
  const row=econGfScroll(gfId,false);
  if(!row||!(row.n>0))return {ok:false,reason:'no-stock'};
  const formula=econGfPrice(tech,'borrow');
  let fee=formula,pay=null,rev={tax:0,kept:fee,total:fee};
  try{
    if(typeof econFeeCharge==='function'&&typeof econFeeGet==='function'){
      try{if(typeof econFeeRegisterDefaults==='function')econFeeRegisterDefaults();}catch(e0){}
      const rec=econFeeGet('gfBorrow');
      const base=(rec&&rec.defAmt>0)?rec.defAmt:((ECON_GF_TUNE.borrowBaseXia)||8);
      const mult=base>0?(formula/base):1;
      pay=econFeeCharge(unit,'gfBorrow',mult);
      if(pay&&pay.skipped==='pc'){fee=0;pay={ok:true,paid:0,skipped:'pc'};rev={tax:0,kept:0,total:0,cur:rec&&rec.cur};}
      else if(pay){
        fee=(pay.amt!=null)?pay.amt:Math.max(0,Math.round(formula*((rec&&rec.amt!=null?rec.amt:base)/base)));
        rev={tax:0,kept:(pay.cur==='lingshi'?fee:0),total:fee,cur:pay.cur};
      }
    }
  }catch(e){pay=null;}
  if(!pay){
    pay=econGfPayFrom(unit,fee,'gf-borrow:'+gfId);
    if(!pay||!pay.ok)return pay||{ok:false,reason:'insufficient'};
    rev=econGfTakeRevenue(fee,'gf-borrow:'+gfId);
  }else if(!pay.ok)return pay;
  row.n-=1;
  const G=econGfState(true);
  const loan={
    id:G.nextId++,unitId:unit.id,gfId:gfId,name:tech.name||gfId,
    t0:econGfNow(),until:econGfNow()+(ECON_GF_TUNE.borrowSec||1800),
    studyT:0,studyNeed:ECON_GF_TUNE.studySec||120,returned:false
  };
  const uid=String(unit.id);
  if(G.reading[uid]&&G.reading[uid][gfId])loan.studyT=G.reading[uid][gfId];
  G.loans.push(loan);
  try{if(typeof econEmit==='function')econEmit('econ:gf:borrow',{unitId:unit.id,gfId:gfId,fee:fee,until:loan.until});}catch(e){}
  return {ok:true,loan:loan,fee:fee,tax:rev.tax,have:row.n};
}
function econGfReturn(unit,gfId,why){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  const G=econGfState(true);if(!G)return {ok:false,reason:'no-state'};
  const uid=unit&&unit.id;
  let loan=null;
  if(unit&&gfId)loan=econGfLoanOf(unit,gfId);
  else if(unit){for(const L of G.loans){if(L&&!L.returned&&L.unitId===uid){loan=L;break;}}}
  if(!loan)return {ok:false,reason:'no-loan'};
  loan.returned=true;loan.returnWhy=why||'manual';loan.returnAt=econGfNow();
  const row=econGfScroll(loan.gfId,true,{id:loan.gfId,name:loan.name});
  row.n=(row.n||0)+1;
  for(const st of G.studies){
    if(st&&!st.done&&st.unitId===loan.unitId&&st.gfId===loan.gfId){st.paused=true;st.done=st.done||false;}
  }
  if(!(loan.learned)&&loan.studyT>0){
    const k=String(loan.unitId);G.reading[k]=G.reading[k]||{};G.reading[k][loan.gfId]=loan.studyT;
  }else if(loan.learned){
    const k=String(loan.unitId);if(G.reading[k])delete G.reading[k][loan.gfId];
  }
  try{if(typeof econEmit==='function')econEmit('econ:gf:return',{unitId:loan.unitId,gfId:loan.gfId,why:loan.returnWhy,learned:!!loan.learned});}catch(e){}
  return {ok:true,loan:loan,have:row.n,why:loan.returnWhy};
}
function econGfBeginStudy(unit,gfId){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  const loan=econGfLoanOf(unit,gfId);
  if(!loan)return {ok:false,reason:'not-borrowed'};
  const G=econGfState(true);
  const used=econGfSlotsUsed();
  const cap=econGfSlots();
  if(cap<=0)return {ok:false,reason:'no-hall'};
  if(used>=cap)return {ok:false,reason:'no-slot',used:used,cap:cap};
  for(const st of G.studies){
    if(st&&!st.done&&!st.paused&&st.unitId===unit.id&&st.gfId===gfId)return {ok:true,study:st,kept:true};
  }
  const st={unitId:unit.id,gfId:gfId,t0:econGfNow(),prog:loan.studyT||0,need:loan.studyNeed||ECON_GF_TUNE.studySec,paused:false,done:false};
  G.studies.push(st);
  return {ok:true,study:st};
}
function econGfLookupUnit(id){
  try{
    const T=(typeof S!=='undefined'?S:null);
    if(T&&T.units){const f=T.units.find(function(x){return x&&x.id===id;});if(f)return f;}
  }catch(e){}
  return {id:id};
}
function econGfFinishStudy(loan,unit){
  if(!loan||loan.learned)return {ok:true,already:true};
  const u=unit||econGfLookupUnit(loan.unitId);
  const lr=econGfCultLearn(u,loan.gfId);
  const G=econGfState(true);
  if(lr&&lr.ok){
    loan.learned=true;
    if(G){G.owned[u.id]=G.owned[u.id]||{};G.owned[u.id][loan.gfId]=true;}
    if(u&&Array.isArray(u.econGf)&&u.econGf.indexOf(loan.gfId)<0)u.econGf.push(loan.gfId);
    else if(u&&!u.econGf){u.econGf=[loan.gfId];}
    for(const st of (G&&G.studies)||[]){
      if(st&&st.unitId===loan.unitId&&st.gfId===loan.gfId){st.done=true;st.paused=false;}
    }
    const ret=econGfReturn(u,loan.gfId,'studied');
    return {ok:true,learn:lr,returned:ret};
  }
  const reason=(lr&&lr.reason)||'learn-failed';
  for(const st of (G&&G.studies)||[]){
    if(st&&st.unitId===loan.unitId&&st.gfId===loan.gfId){st.paused=true;st.done=false;}
  }
  const ret=econGfReturn(u,loan.gfId,'learn-failed:'+reason);
  return {ok:false,reason:reason,learn:lr,returned:ret};
}
function econGfTick(dt){
  if(!econGfFlag())return;
  const G=econGfState(true);if(!G)return;
  const now=econGfNow();
  dt=+dt||0;
  for(const st of G.studies){
    if(!st||st.done||st.paused)continue;
    const loan=G.loans.find(function(L){return L&&!L.returned&&L.unitId===st.unitId&&L.gfId===st.gfId;});
    if(!loan){st.paused=true;continue;}
    const u=econGfLookupUnit(st.unitId);
    const speed=econGfStudySpeedMul(null,u);
    st.prog=(st.prog||0)+dt*speed;
    loan.studyT=st.prog;
    if(st.prog>=(st.need||loan.studyNeed||ECON_GF_TUNE.studySec)){
      econGfFinishStudy(loan,u);
    }
  }
  const due=[];
  for(const L of G.loans){
    if(!L||L.returned)continue;
    if(L.until!=null&&now>=L.until)due.push(L);
  }
  for(const L of due){
    let u={id:L.unitId};
    try{if(typeof S!=='undefined'&&S&&S.units){const f=S.units.find(function(x){return x&&x.id===L.unitId;});if(f)u=f;}}catch(e){}
    econGfReturn(u,L.gfId,'timeout');
  }
}
function econGfOwns(unit,id){
  return econGfCultOwns(unit,id);
}
function econGfShopList(){
  const L=econGfList();
  return L.map(function(t){
    return {
      kind:'gongfa',gfId:t.id||t.gfId,name:t.name,grade:econGfGradeOf(t),realm:t.realm|0,
      borrowPrice:econGfPrice(t,'borrow'),buyPrice:econGfPrice(t,'stock'),sellPrice:econGfSellPrice(t)
    };
  });
}
function econGfStockBuy(payer,gfId,n){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  const tech=econGfGet(gfId);if(!tech)return {ok:false,reason:'no-tech'};
  n=Math.max(1,n|0||1);
  const unitPrice=econGfPrice(tech,'stock'),price=unitPrice*n;
  const who=payer==null||payer==='vault'||payer==='sect'?'vault':payer;
  const pay=econGfPayFrom(who==='vault'?((typeof S!=='undefined'?S:null))||'vault':who,price,'gf-stock-buy:'+gfId);
  if(!pay||!pay.ok)return pay||{ok:false,reason:'insufficient'};
  const st=econGfStore(null,tech,n);
  return {ok:true,gfId:gfId,n:st.n,price:price};
}
function econGfStockSell(gfId,n){
  if(!econGfFlag())return {ok:false,reason:'flag-off'};
  const tech=econGfGet(gfId);if(!tech)return {ok:false,reason:'no-tech'};
  n=Math.max(1,n|0||1);
  const w=econGfWithdraw(null,gfId,n);if(!w.ok)return w;
  const price=econGfSellPrice(tech)*n;
  econGfTakeRevenue(price,'gf-stock-sell:'+gfId);
  return {ok:true,gfId:gfId,n:w.n,price:price};
}
function econGfSetRule(gfId,rule){
  const G=econGfState(true);if(!G||!gfId)return null;
  G.rules[gfId]=Object.assign({},G.rules[gfId]||{},rule||{});
  return G.rules[gfId];
}
function econGfIconDraw(c,x,y,opt){
  opt=opt||{};
  if(typeof econArtDraw!=='function'||!c)return false;
  const oldCtx=(typeof ctx!=='undefined')?ctx:null;
  const oldOrg=(typeof eaOrigin!=='undefined')?eaOrigin:null;
  const oldUse=(typeof eaUseGameP!=='undefined')?eaUseGameP:null;
  const oldFr=(typeof eaArtFrozen!=='undefined')?eaArtFrozen:null;
  try{
    ctx=c;eaUseGameP=false;eaOrigin={x:x,y:y};eaArtFrozen=0;
    return !!econArtDraw('gongfage',0,0,1,1,{type:'gongfage',lv:opt.lv||3});
  }catch(e){return false;}
  finally{
    if(oldOrg!==null)eaOrigin=oldOrg;else eaOrigin=null;
    if(oldUse!==null)eaUseGameP=oldUse;
    if(oldFr!==null)eaArtFrozen=oldFr;
    if(oldCtx)ctx=oldCtx;
  }
}
function econGfPanelEntry(){
  const d=ECON_GF_BUILD;
  return {
    type:d.type,name:d.name,realm:d.realm,realmIdx:d.realmIdx,unlockProposed:d.unlockProposed,
    size:d.size,cost:d.cost,time:d.time,hp:d.hp,upkeepXia:d.upkeepXia,effect:d.effect,note:d.note,
    iconDraw:econGfIconDraw,
    unlocked:function(T){try{if(typeof econBuildingUnlocked==='function')return econBuildingUnlocked('gongfage',T);}catch(e){}
      return econGfFlag()&&((typeof econSectMaxRealm==='function'?econSectMaxRealm(T):0)>=(d.realmIdx||4));},
    lockReason:function(T){try{if(typeof econBuildingLockReason==='function')return econBuildingLockReason('gongfage',T);}catch(e){}return '';}
  };
}
function econGfEnsureBuild(){
  const added=[];
  econGfRegisterCatalog();
  try{
    if(typeof BUILD!=='undefined'&&BUILD&&!BUILD.gongfage){
      const def=(typeof econToBuildDef==='function')?econToBuildDef(ECON_GF_BUILD):null;
      BUILD.gongfage=def||{name:'功法閣',size:2,cost:ECON_GF_TUNE.cost,time:16,pop:0,hp:480,desc:ECON_GF_BUILD.note,reqRealm:4};
      added.push('gongfage');
    }
  }catch(e){}
  return {ok:true,added:added};
}
function econGfInstall(){
  try{
    if(typeof ECON_FLAGS_DEFAULT!=='undefined')econGfMergeFlags(ECON_FLAGS_DEFAULT);
    if(typeof econMigrateSave==='function'&&!econMigrateSave._econGf){
      const _m=econMigrateSave;
      econMigrateSave=function(t){const r=_m.apply(this,arguments);try{econGfMigrate(t||(typeof S!=='undefined'?S:null));}catch(e){}return r;};
      econMigrateSave._econGf=1;
    }
    if(typeof econTick==='function'&&!econTick._econGf){
      const _t=econTick;
      econTick=function(dt){const r=_t.apply(this,arguments);try{econGfTick(dt);}catch(e){}return r;};
      econTick._econGf=1;
    }
    if(typeof econBuildingUnlocked==='function'&&!econBuildingUnlocked._econGf){
      const _u=econBuildingUnlocked;
      econBuildingUnlocked=function(type,T){
        if(type==='gongfage'&&econGfFlag()){
          const need=ECON_GF_BUILD.realmIdx||4;
          const have=(typeof econSectMaxRealm==='function')?econSectMaxRealm(T):0;
          return have>=need;
        }
        return _u.apply(this,arguments);
      };
      econBuildingUnlocked._econGf=1;
    }
    if(typeof econBuildingLockReason==='function'&&!econBuildingLockReason._econGf){
      const _l=econBuildingLockReason;
      econBuildingLockReason=function(type,T){
        if(type==='gongfage'){
          if(!econGfFlag())return 'flag-off';
          const need=ECON_GF_BUILD.realmIdx||4;
          const have=(typeof econSectMaxRealm==='function')?econSectMaxRealm(T):0;
          return have<need?('realm:'+need):'';
        }
        return _l.apply(this,arguments);
      };
      econBuildingLockReason._econGf=1;
    }
    if(typeof econBuildingEffect==='function'&&!econBuildingEffect._econGf){
      const _e=econBuildingEffect;
      econBuildingEffect=function(type,lv){
        const r=_e.apply(this,arguments);
        if(type==='gongfage'){
          lv=Math.max(1,lv|0||1);const n=lv-1;
          const out=r||{kind:'gfStudy',type:type,name:'功法閣',lv:lv};
          out.kind='gfStudy';
          out.speedMul=+(1+ECON_GF_TUNE.speedPerLv*n).toFixed(3);
          out.slots=(ECON_GF_TUNE.slotsBase||0)+(ECON_GF_TUNE.slotsPerLv||0)*n;
          return out;
        }
        return r;
      };
      econBuildingEffect._econGf=1;
    }
    if(typeof econRegisterNewBuildings==='function'&&!econRegisterNewBuildings._econGf){
      const _r=econRegisterNewBuildings;
      econRegisterNewBuildings=function(){
        const res=_r.apply(this,arguments)||{ok:false,added:[]};
        if(econGfFlag()){
          const extra=econGfEnsureBuild();
          if(extra.added&&extra.added.length){res.added=(res.added||[]).concat(extra.added);res.ok=true;}
        }
        return res;
      };
      econRegisterNewBuildings._econGf=1;
    }
    econGfRegisterCatalog();
  }catch(e){}
}
function econAttachGf(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    if(A.FLAGS)econGfMergeFlags(A.FLAGS);
    A.GF_TUNE=ECON_GF_TUNE;A.GF_BUILD=ECON_GF_BUILD;A.GF_FALLBACK=ECON_GF_FALLBACK;
    A.gfFlag=econGfFlag;A.gfMigrate=econGfMigrate;
    A.gfList=econGfList;A.gfGet=econGfGet;A.gfOwns=econGfOwns;A.gfLearn=econGfCultLearn;
    A.gfCanAccess=econGfCanAccess;A.gfAccessOf=econGfAccessOf;A.gfSetRule=econGfSetRule;
    A.gfStudySpeedMul=econGfStudySpeedMul;A.gfSlots=econGfSlots;
    A.gfStore=econGfStore;A.gfWithdraw=econGfWithdraw;
    A.gfBorrow=econGfBorrow;A.gfReturn=econGfReturn;A.gfBeginStudy=econGfBeginStudy;
    A.gfTick=econGfTick;A.gfPrice=econGfPrice;A.gfHintXia=econGfHintXia;A.gfSeedStock=econGfSeedStock;A.gfShopList=econGfShopList;
    A.gfStockBuy=econGfStockBuy;A.gfStockSell=econGfStockSell;
    A.gfPanel=econGfPanelEntry;A.gfIconDraw=econGfIconDraw;A.gfEnsureBuild=econGfEnsureBuild;
    A.gfLoanOf=econGfLoanOf;
    if(typeof econMigrateSave==='function')A.migrate=econMigrateSave;
    if(typeof econTick==='function')A.tick=econTick;
    if(typeof econRegisterNewBuildings==='function'){A.registerNewBuildings=econRegisterNewBuildings;A.registerBuildings=econRegisterNewBuildings;}
    if(typeof econBuildingUnlocked==='function')A.buildingUnlocked=econBuildingUnlocked;
    if(typeof econBuildingLockReason==='function')A.buildingLockReason=econBuildingLockReason;
    if(typeof econBuildingEffect==='function')A.buildingEffect=econBuildingEffect;
    if(typeof window!=='undefined'){
      window.XW_ECON_GF={list:econGfList,get:econGfGet,learn:function(u,id){return econGfCultLearn(u,id);},owns:econGfOwns};
    }
  }catch(e){}
}
econGfInstall();
econAttachGf();
try{if(typeof setTimeout==='function')setTimeout(function(){econGfInstall();econAttachGf();},0);}catch(e){}
