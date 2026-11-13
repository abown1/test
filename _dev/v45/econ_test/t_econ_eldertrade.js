// 長老派人前往交易（econ_rank_ai.js ECON_ELDER_TRADE＋econ_shop.js viaElder）實測：Playwright＋headless Chrome。
// 用法：XW_BASE=http://127.0.0.1:18899/index.html node t_econ_eldertrade.js [輸出資料夾]
// 跑兩輪：旗標開（預設）與 ?eldertrade=0。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');const fs=require('fs');
const OUT=process.argv[2]||'/tmp/econ_eldertrade/shots';fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.XW_BASE||'http://127.0.0.1:18899/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,800));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
const H=`window.__etClear=function(){
  const st=econTradeEnsure();
  (st.missions||[]).forEach(function(m){if(!m)return;m.state='done';});
  st.missions=[];st.autoT=0;st.user={};st.userSet={};
  (S.units||[]).forEach(function(u){if(!u)return;try{delete u.econTradeMid;}catch(e){u.econTradeMid=null;}
    try{if(u.task&&u.task.type==='move')setTask(u,null);}catch(e){}});
};
window.__etStock=function(){
  const keys=(typeof econTradeResKeys==='function'?econTradeResKeys():['wood','stone','fiber','food','iron','herb','xiacao']);
  keys.forEach(function(k){S.res[k]=30;});
  S.res.wood=200; // 過剩 → 自動計劃賣木材去坊市
  const cur=econBagXia(S.econ.vault);
  if(cur>2000)econCharge('vault',cur-2000,'test-drain');
  else if(cur<2000)econGrant('vault',2000-cur,'test-fill','xia');
  S.res.lingshi=Math.max(S.res.lingshi||0,2000);
};
window.__etIdle=function(u){
  if(!u)return;u.job='idle';u.task=null;u.manualUntil=null;u.manualKind=null;u.manualJob=undefined;
  try{delete u.econTradeMid;}catch(e){u.econTradeMid=null;}
};
window.__etNoPost=function(u){u.office=null;u.econOffice=null;try{delete S.econ.ranks.appoint[u.id];}catch(e){}};
window.__etLock=function(u){u.manualUntil=S.time+9999;u.manualKind='job';u.manualJob=u.job||'idle';};
1`;
async function run(br,q){
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  await p.goto(BASE+'?dev=1'+q,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(81);if(XW.tutEnd)XW.tutEnd(true);});await sleep(2500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:500});await sleep(150);}catch(e){break;}}
  await ev(p,H);
  const fx=await ev(p,`(function(){try{openPause(false);}catch(e){}
    if(!window.__ecl)window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);
    let wt=null;
    try{if(XW.tjt&&XW.tjt.ensure)XW.tjt.ensure('waishitang');XW.tjt.place('waishitang');}catch(e){}
    wt=S.buildings.find(function(x){return x&&x.type==='waishitang'&&x.built;});
    if(!wt){
      const h=S.buildings.find(function(x){return x&&x.built;})||{i:8,j:8};
      wt={id:90001,type:'waishitang',built:true,broken:false,lv:5,i:(h.i||8)+4,j:(h.j||8)+2,x:(h.i||8)+4,y:(h.j||8)+2,hp:420,maxhp:420};
      S.buildings.push(wt);
    }
    wt.lv=5;wt.broken=false;if(wt.hp!=null&&wt.maxhp!=null)wt.hp=wt.maxhp;
    const h=S.buildings.find(function(x){return x&&x.built;})||null;
    const E=XW.spawnDisciple(h),W=XW.spawnDisciple(h),A=XW.spawnDisciple(h),B=XW.spawnDisciple(h);
    E.name='長老戊';W.name='外事己';A.name='閒人庚';B.name='閒人辛';
    [E,W,A,B].forEach(__etIdle);
    // 先不任命長老，留給無長老測項；甲乙解除預設雜役，以便測 viaElder／無職位帶隊
    econAppoint(A,null);econAppoint(B,null);
    econAppoint(W,'waishi');
    __etStock();
    econTradeEnsure();
    S.econ.trades.autoOn=true;
    const flag=(typeof ECON_ELDER_TRADE!=='undefined')?ECON_ELDER_TRADE:!!(XW_ECON&&XW_ECON.ECON_ELDER_TRADE);
    return {flag:flag,api:!!(XW_ECON&&XW_ECON.elderTradeOnce&&XW_ECON.elderTradeTick),
      ranks:!!(S.econ.flags&&S.econ.flags.ranks),wt:!!wt,lv:wt.lv||0,
      E:E.id,W:W.id,A:A.id,B:B.id,postW:econPostOf(W),elders:econElderUnits().length,
      vault:econBagXia(S.econ.vault),wood:S.res.wood};
  })()`);
  return {p,ctx,errs,fx};
}
const KNOWN_M=['id','kind','side','res','amt','dest','destId','destName','leaderId','helperIds','state','t0','eta','travelSec','tradeSec','unitPrice','total','paidXia','fee','tx','ty','hx','hy','result'];
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  // ===== 旗標開 =====
  let {p,ctx,errs,fx}=await run(br,'');
  rec('ON-1 旗標預設開、API 掛上、外事堂 Lv5 就緒、外事已任命、尚無長老',fx.flag===true&&fx.api&&fx.ranks&&fx.wt&&fx.lv===5&&fx.postW==='waishi'&&fx.elders===0&&fx.vault>=2000,fx);
  const V=(s)=>ev(p,`(function(){const E=unitById(${fx.E}),W=unitById(${fx.W}),A=unitById(${fx.A}),B=unitById(${fx.B});${s}})()`);

  let r=await V(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    const x=XW_ECON.elderTradeOnce();
    return {x,n:(S.econ.trades.missions||[]).length,elders:econElderUnits().length};`);
  rec('ON-2 無長老 → once 回 no-elder，不派行程',r.x&&r.x.ok===false&&r.x.reason==='no-elder'&&r.n===0&&r.elders===0,r);

  r=await V(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    XW_ECON.elderTradeTick(200);
    return {n:(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done').length,elders:econElderUnits().length};`);
  rec('ON-3 無長老時 tick 200 秒仍不派（計時歸零）',r.n===0&&r.elders===0,r);

  r=await V(`const ap=econAppoint(E,'zhanglao');
    [E,W,A,B].forEach(__etIdle);__etClear();__etStock();
    XW_ECON.elderTradeTick(119);
    const live=(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done');
    return {ap,elders:econElderUnits().length,n:live.length,postE:econPostOf(E)};`);
  rec('ON-4 剛任命長老後 tick 119 秒尚未滿 120，不派',r.ap&&r.ap.ok&&r.elders===1&&r.n===0&&r.postE==='zhanglao',r);

  r=await V(`XW_ECON.elderTradeTick(2);
    const live=(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done');
    const m=live[0]||null;
    const party=m?([m.leaderId].concat(m.helperIds||[])):[];
    return {n:live.length,m:m&&{id:m.id,kind:m.kind,side:m.side,res:m.res,amt:m.amt,dest:m.dest,destName:m.destName,leaderId:m.leaderId,helperIds:m.helperIds,state:m.state,keys:Object.keys(m)},
      party:party,elderIn:party.indexOf(E.id)>=0,playerIn:party.indexOf(player().id)>=0,
      midE:!!E.econTradeMid,midW:!!W.econTradeMid,midA:!!A.econTradeMid,midB:!!B.econTradeMid};`);
  const mOk=r.m&&r.m.kind==='trade'&&(r.m.dest==='fangshi'||r.m.dest==='wanbao')&&(r.m.destName==='坊市'||r.m.destName==='萬寶樓')&&r.m.amt>0;
  const leadOk=r.m&&r.m.leaderId===fx.W; // 優先外事
  const helpOk=r.m&&Array.isArray(r.m.helperIds)&&r.m.helperIds.length===1&&(r.m.helperIds[0]===fx.A||r.m.helperIds[0]===fx.B);
  rec('ON-5 滿 120 秒後派出：目的地坊市或萬寶、帶隊優先外事、帶 1 名幫手、長老本人不出行、不派主角',r.n===1&&mOk&&leadOk&&helpOk&&r.elderIn===false&&r.playerIn===false&&r.midE===false&&r.midW===true,r);

  const extra=r.m&&r.m.keys?r.m.keys.filter(k=>KNOWN_M.indexOf(k)<0):['no-mission'];
  rec('ON-6 行程物件不多存欄位（無 viaElder 等新鍵）',extra.length===0,{keys:r.m&&r.m.keys,extra:extra});

  r=await V(`const x=XW_ECON.elderTradeOnce();
    const live=(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done');
    return {x,n:live.length};`);
  rec('ON-7 已有一趟非拍賣行程時不再派（busy）',r.x&&r.x.ok===false&&r.x.reason==='busy'&&r.n===1,r);

  r=await V(`const wt=S.buildings.find(function(x){return x&&x.type==='waishitang'&&x.built;});
    wt.broken=false;wt.lv=5;
    const rawB=econTradeUnitPriceRaw('xiacao','buy','fangshi'),rawS=econTradeUnitPriceRaw('xiacao','sell','fangshi');
    const pB=econTradeUnitPrice('xiacao','buy','fangshi'),pS=econTradeUnitPrice('xiacao','sell','fangshi');
    const mulB=econTradeBldMul('buy'),mulS=econTradeBldMul('sell');
    const expB=Math.max(1,Math.round(rawB*mulB));
    const buyP=Math.max(1,Math.round(rawB*mulB));
    const expS=Math.max(1,Math.min(Math.round(rawS*mulS),buyP-1));
    wt.broken=true;
    const bB=econTradeUnitPrice('xiacao','buy','fangshi'),bS=econTradeUnitPrice('xiacao','sell','fangshi');
    const bMulB=econTradeBldMul('buy'),bMulS=econTradeBldMul('sell');
    wt.broken=false;
    const aB=econTradeUnitPrice('xiacao','buy','fangshi'),aS=econTradeUnitPrice('xiacao','sell','fangshi');
    return {rawB,rawS,pB,pS,expB,expS,mulB,mulS,bB,bS,bMulB,bMulS,aB,aS};`);
  rec('ON-8 外事堂 Lv5 買價變便宜、賣價變高（以單價較高的仙草驗算，避開木材單價 1 的四捨五入）；損壞後倍率失效（＝原價），修好恢復',r.mulB===0.9&&r.mulS===1.1&&r.pB===r.expB&&r.pS===r.expS&&r.pB<r.rawB&&r.pS>r.rawS&&r.bMulB===1&&r.bMulS===1&&r.bB===r.rawB&&r.bS===r.rawS&&r.aB===r.pB&&r.aS===r.pS,r);

  r=await V(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    XW_ECON.ELDER_TRADE_TUNE.every=1e9; // 避免後續測項被 tick 搶跑
    __etLock(W);__etLock(A);__etLock(B);
    const n0=(S.econ.trades.missions||[]).length;
    const x=XW_ECON.elderTradeOnce();
    const live=(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done');
    return {x,n:live.length-n0,midW:!!W.econTradeMid,midA:!!A.econTradeMid,midB:!!B.econTradeMid,midE:!!E.econTradeMid,lockW:!!(typeof econSaManualLocked==='function'&&econSaManualLocked(W))};`);
  rec('ON-9 玩家手令鎖定的弟子不被搶；只剩長老時不派（長老本人不出行）',r.x&&r.x.ok===false&&r.x.reason==='no-free'&&r.n<=0&&!r.midW&&!r.midA&&!r.midB&&!r.midE&&r.lockW===true,r);

  r=await V(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    S.econ.trades.autoOn=false;
    const x=XW_ECON.elderTradeOnce();
    const live=(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done');
    return {x,n:live.length};`);
  rec('ON-10 玩家關掉自動出行（trades.autoOn）時不派',r.x&&r.x.ok===false&&r.x.reason==='off'&&r.n===0,r);

  r=await V(`S.econ.trades.autoOn=true;__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    const x=XW_ECON.elderTradeOnce();
    const m=(S.econ.trades.missions||[]).filter(mm=>mm&&mm.state!=='done')[0];
    return {ok:!!(x&&x.ok),reason:x&&x.reason,leaderId:m&&m.leaderId,helperIds:m&&m.helperIds,dest:m&&m.dest};`);
  rec('ON-11 重新開啟 autoOn 後可再派，仍優先外事帶隊',r.ok&&r.leaderId===fx.W&&Array.isArray(r.helperIds)&&r.helperIds.length===1,r);

  r=await V(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    // 無職位弟子帶隊：把外事也鎖住，只留兩名閒人
    __etLock(W);__etNoPost(A);__etNoPost(B);
    const x=XW_ECON.elderTradeOnce();
    const m=(S.econ.trades.missions||[]).filter(mm=>mm&&mm.state!=='done')[0];
    const L=m&&m.leaderId;
    const unpaid=(L===A.id||L===B.id);
    const canLead=L?econTradeCanLead(unitById(L)):null;
    return {ok:!!(x&&x.ok),reason:x&&x.reason,leaderId:L,unpaid:unpaid,canLead:canLead,postL:L?econPostOf(unitById(L)):null,midW:!!W.econTradeMid,helperIds:m&&m.helperIds};`);
  rec('ON-12 外事被手令鎖時，可派無職位弟子帶隊（viaElder；被鎖者不被搶）',r.ok&&r.unpaid&&r.canLead===false&&r.midW===false,r);

  r=await V(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    const x=XW_ECON.elderTradeOnce();
    const m=(S.econ.trades.missions||[]).filter(mm=>mm&&mm.state!=='done')[0]||{};
    const s=JSON.stringify(S.econ);
    const back=JSON.parse(s);
    const mk=Object.keys(m);
    const extra=mk.filter(k=>${JSON.stringify(KNOWN_M)}.indexOf(k)<0);
    const top0=Object.keys(S.econ).sort();
    const top1=Object.keys(back).sort();
    // 單位不新增長存欄位：對照從未出行的主角
    const uk=Object.keys(W);const pk=Object.keys(player());
    const newU=uk.filter(k=>['econTradeMid'].indexOf(k)<0&&pk.indexOf(k)<0&&k.indexOf('econ')===0&&k!=='econOffice');
    return {ok:!!(x&&x.ok),extra,topSame:JSON.stringify(top0)===JSON.stringify(top1),tradesArr:Array.isArray(back.trades.missions),newU,hasVia:('viaElder' in m)};`);
  rec('ON-13 存讀 JSON 後 trades 仍為既有形狀；行程無 viaElder；單位不多存新欄位',r.ok&&r.extra&&r.extra.length===0&&r.topSame&&r.tradesArr&&r.hasVia===false&&Array.isArray(r.newU)&&r.newU.length===0,r);

  await p.screenshot({path:OUT+'/eldertrade_on.png'});
  rec('ON-14 console／pageerror 0',errs.length===0,errs);
  await ctx.close();

  // ===== 旗標關 =====
  ({p,ctx,errs,fx}=await run(br,'&eldertrade=0'));
  const V2=(s)=>ev(p,`(function(){const E=unitById(${fx.E}),W=unitById(${fx.W}),A=unitById(${fx.A}),B=unitById(${fx.B});${s}})()`);
  rec('OFF-1 ?eldertrade=0 → 旗標關，API 仍在（回傳 flag-off）',fx.flag===false&&fx.api,fx);

  let r2=await V2(`econAppoint(E,'zhanglao');[E,W,A,B].forEach(__etIdle);__etClear();__etStock();
    S.econ.trades.autoOn=true;
    const x=XW_ECON.elderTradeOnce();
    XW_ECON.elderTradeTick(200);
    const live=(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done');
    return {x,n:live.length,elders:econElderUnits().length};`);
  rec('OFF-2 旗標關：once 回 flag-off，tick 亦不派',r2.x&&r2.x.ok===false&&r2.x.reason==='flag-off'&&r2.n===0&&r2.elders===1,r2);

  r2=await V2(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    __etNoPost(A);
    const x=econTradeLaunch({viaElder:true,leader:A,side:'sell',res:'wood',amt:10,dest:'fangshi'});
    return {ok:!!(x&&x.ok),reason:x&&x.reason,n:(S.econ.trades.missions||[]).filter(m=>m&&m.state!=='done').length,midA:!!A.econTradeMid};`);
  rec('OFF-3 旗標關時 viaElder 不能讓無職位弟子帶隊（回舊行為 no-leader）',r2.ok===false&&r2.reason==='no-leader'&&r2.n===0&&r2.midA===false,r2);

  r2=await V2(`__etClear();__etStock();[E,W,A,B].forEach(__etIdle);
    const x=econTradeLaunch({leader:W,side:'sell',res:'wood',amt:10,dest:'fangshi'});
    const m=(S.econ.trades.missions||[]).filter(mm=>mm&&mm.state!=='done')[0];
    return {ok:!!(x&&x.ok),reason:x&&x.reason,leaderId:m&&m.leaderId,dest:m&&m.dest,kind:m&&m.kind};`);
  rec('OFF-4 旗標關時既有外事帶隊出行仍可用',r2.ok&&r2.leaderId===fx.W&&r2.dest==='fangshi'&&r2.kind==='trade',r2);

  await p.screenshot({path:OUT+'/eldertrade_off.png'});
  rec('OFF-5 console／pageerror 0',errs.length===0,errs);
  await ctx.close();await br.close();
  const pass=rows.filter(x=>x.ok).length;console.log('TOTAL '+pass+'/'+rows.length);
  fs.writeFileSync(OUT+'/result.json',JSON.stringify(rows,null,1));
  process.exit(pass===rows.length?0:1);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
