// ================== 仙武經濟：礦場＋靈石脈採集 ===================
var ECON_MINE_TYPE='kuangchang';
var ECON_MINE_BUILD={
  name:'礦場',size:2,
  cost:{wood:80,stone:60,iron:15},
  time:16,pop:0,hp:520,
  desc:'在範圍內採集靈石脈與礦產。每級採集 +10%（滿 6 級 +60%）。預設宗師境解鎖，受大殿等級上限。',
  reqRealm:3                 // 待確認：宗師＝REALMS 索引 3
};
var ECON_MINE_TUNE={
  range:12,                  // 待確認：影響半徑（格）
  perLv:0.10,
  unlockRealm:3,
  returnOnFull:true,
  returnOnWant:true
};
function econMineUnlockRealm(){return ECON_MINE_TUNE.unlockRealm;}
function econMineCanUnlock(T){
  T=T||(typeof S!=='undefined'?S:null);
  let best=0;
  if(T&&T.units){for(const u of T.units){if(u&&!u.dead&&(u.realm||0)>best)best=u.realm;}}
  if(T&&T.flags&&T.flags.xian&&best<4)best=Math.max(best,4);
  return best>=econMineUnlockRealm();
}
function econMineList(T){
  T=T||(typeof S!=='undefined'?S:null);if(!T||!T.buildings)return [];
  const out=[];
  for(const b of T.buildings){
    if(!b||b.type!==ECON_MINE_TYPE||!b.built||b.broken)continue;
    out.push(b);
  }
  return out;
}
function econMineLvAt(x,y){
  if(!econFlag('mine'))return 0;
  const T=S;if(!T)return 0;
  let best=0;const R=ECON_MINE_TUNE.range;
  for(const b of econMineList(T)){
    const s=(typeof BUILD!=='undefined'&&BUILD[b.type]&&BUILD[b.type].size)||ECON_MINE_BUILD.size;
    let d;
    if(typeof distRect==='function')d=distRect(x,y,b.i,b.j,s);
    else{
      const cx=b.i+s/2,cy=b.j+s/2;
      d=Math.hypot((x||0)-cx,(y||0)-cy)-s/2;if(d<0)d=0;
    }
    if(d<=R){
      const lv=(typeof blv==='function'?blv(b):b.lv)||1;
      if(lv>best)best=lv;
    }
  }
  return best;
}
function econGatherYieldMul(u,x,y,res){
  if(!econFlag('mine'))return 1;
  const px=(x!=null)?x:(u&&u.x),py=(y!=null)?y:(u&&u.y);
  const lv=econMineLvAt(px,py);
  if(!lv)return 1;
  return 1+ECON_MINE_TUNE.perLv*Math.min(ECON_LV_MAX||6,lv);
}
function econGatherPut(u,res,amt){
  amt=Math.max(0,Math.floor(+amt||0));
  if(!amt)return {ok:true,added:0,left:0,via:'none'};
  if(econFlag('store')&&typeof econRingPut==='function'&&econRingOf(u)){
    const r=econRingPut(u,res,amt);
    if(r.left>0){
      if(!u.carry||u.carry.type!==res)u.carry={type:res,amt:0};
      u.carry.amt=(u.carry.amt||0)+r.left;
    }
    return {ok:true,added:r.added,left:0,via:'ring',overflow:r.left};
  }
  if(!u.carry||u.carry.type!==res)u.carry={type:res,amt:0};
  u.carry.amt=(u.carry.amt||0)+amt;
  return {ok:true,added:amt,left:0,via:'carry'};
}
function econGatherWant(u){
  if(typeof econCarryCap==='function')return econCarryCap(u);
  try{if(typeof CARRY_CAP==='number')return CARRY_CAP;}catch(e){}
  return 10;
}
function econGatherHeld(u){
  let n=0;
  if(u&&u.carry&&u.carry.amt)n+=u.carry.amt;
  if(econFlag('store')&&typeof econRingOf==='function'){
    const ring=econRingOf(u);if(ring)n+=econRingUsed(ring);
  }
  return n;
}
function econGatherShouldReturn(u){
  if(!econFlag('mine')&&!econFlag('store'))return null; // null＝不干預既有邏輯
  if(!u)return null;
  const want=u.xmineN||u.gatherNeed||econGatherWant(u);
  const held=econGatherHeld(u);
  if(ECON_MINE_TUNE.returnOnWant&&held>=want)return {yes:true,why:'want',held:held,want:want};
  if(typeof econRingShouldReturn==='function'){
    const rr=econRingShouldReturn(u);
    if(rr&&rr.yes)return {yes:true,why:rr.why,held:held,want:want};
  }
  if(held<=0)return {yes:false,held:held,want:want};
  // 未滿且未逾時：不要回倉（修正「只挖一個就回去」）
  return {yes:false,why:'keep-mining',held:held,want:want};
}
function econGatherOnStart(u){
  if(!u)return;
  if(u.econMineT==null)u.econMineT=econNow();
}
function econGatherDeposit(u,depot){
  if(!u)return {ok:false};
  let got=0;const types={};
  if(econFlag('store')&&typeof econRingTakeAll==='function'&&econRingOf(u)){
    const ring=econRingOf(u);
    const items=(ring.items||[]).slice();
    for(const it of items){
      const n=econRingTakeAll(u,it.type);got+=n;types[it.type]=(types[it.type]||0)+n;
    }
  }
  if(u.carry&&u.carry.amt>0){
    types[u.carry.type]=(types[u.carry.type]||0)+u.carry.amt;
    got+=u.carry.amt;u.carry=null;
  }
  const T=S;
  if(T&&T.res){
    for(const k in types){
      if(k==='lingshi'&&econFlag('treasury')&&typeof econGrant==='function'){
        econGrant('vault',types[k],'mine-deposit','xia');
      }else T.res[k]=(T.res[k]||0)+types[k];
    }
    if(econFlag('treasury'))econSyncResFromVault(T);
  }
  u.econMineT=null;u.jst=null;
  econEmit('econ:mine:deposit',{unitId:u.id,got:got,types:types,depot:depot&&depot.id});
  return {ok:true,got:got,types:types};
}

function econAttachMine(){
  try{
    if(typeof window==='undefined'||!window.XW_ECON)return;
    const A=window.XW_ECON;
    A.MINE_TYPE=ECON_MINE_TYPE;A.MINE_BUILD=ECON_MINE_BUILD;A.MINE_TUNE=ECON_MINE_TUNE;
    A.mineLvAt=econMineLvAt;A.mineList=econMineList;A.mineCanUnlock=econMineCanUnlock;
    A.gatherYieldMul=econGatherYieldMul;A.gatherPut=econGatherPut;
    A.gatherShouldReturn=econGatherShouldReturn;A.gatherOnStart=econGatherOnStart;
    A.gatherDeposit=econGatherDeposit;A.gatherWant=econGatherWant;
  }catch(e){}
}
econAttachMine();
try{if(typeof setTimeout==='function')setTimeout(econAttachMine,0);}catch(e){}
