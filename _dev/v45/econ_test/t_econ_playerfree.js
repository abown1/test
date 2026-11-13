// 鍛造工錢：宗主／聯機化身免費、弟子照付；修煉消耗維持照扣。Playwright＋headless Chrome。
// 未做實際雙機測試：客機化身用模擬單位（kind:'disciple'＋u.np）在同一頁驗證。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/econ_playerfree_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const URL=process.env.XW_URL||'http://127.0.0.1:8987/index.html?dev=1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1200));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  const snap=n=>p.screenshot({path:SH+'/'+n+'.png'});
  await p.addInitScript(()=>{if(typeof window.__ev!=='function')window.__ev=function(s){return eval(s);};});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(81);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}});await sleep(2500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});await sleep(150);}catch(e){break;}}

  const fx=await ev(p,`(function(){
    try{openPause(false);}catch(e){}
    window.__toasts=[];const _t=toast;toast=function(m){try{__toasts.push(String(m));}catch(e){}return _t.apply(this,arguments);};
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;if(S&&S.raidsActive)S.raidsActive.length=0;}catch(e){}},400);
    S.econ=S.econ||{};S.econ.flags=S.econ.flags||{};
    S.econ.flags.treasury=true;S.econ.flags.cult=true;S.econ.flags.store=true;
    try{if(typeof econSyncVaultFromRes==='function')econSyncVaultFromRes(S);}catch(e){}
    econGrant('vault',8000,'test-fixture','xia');
    let b=S.buildings.find(x=>x.type==='forge'&&x.built);
    if(!b){try{XW.tjt.place('forge');}catch(e){}b=S.buildings.find(x=>x.type==='forge'&&x.built);}
    const h=S.buildings.find(x=>x.built&&x.type!=='forge')||null;
    const smith=XW.spawnDisciple(h);smith.name='鐵匠甲';smith.cpf={forge:16,alch:0};smith.hp=smith.maxhp; // Lv4（√16）
    try{assignJob(smith,'forge',{bid:b&&b.id});}catch(e){}
    if(b&&!smith.job){smith.job='forge';smith.jobB=b.id;}
    const d=XW.spawnDisciple(h);d.name='弟子乙';d.hp=d.maxhp;d.cpf={forge:0,alch:0};
    econGrant(d,500,'test-disc-wallet','xia');econMirrorUnitWallet(d);
    const p0=player();econGrant(p0,500,'test-pc-wallet','xia');econMirrorUnitWallet(p0);
    // 模擬客機玩家化身：主機上通常是 kind:'disciple'＋np＝玩家金鑰（net2_sync.js）
    const av=XW.spawnDisciple(h);av.name='客機化身';av.kind='disciple';av.np='guest-pk-test';av.hp=av.maxhp;
    econGrant(av,500,'test-av-wallet','xia');econMirrorUnitWallet(av);
    const fee=XW_ECON.smithFeeOf(smith,1);
    const snap=function(u){const w=u&&econWallet(u.id,false);return {id:u&&u.id,ls:u&&(u.lingshi||0),bag:w?econBagXia(w):0};};
    return {
      bid:b&&b.id,smith:smith.id,disc:d.id,av:av.id,
      fee,lv:v59Lv(smith,'forge'),
      isP:econIsPlayerUnit(p0),isD:econIsPlayerUnit(d),isAv:econIsPlayerUnit(av),
      xn:typeof xnIsPC==='function'?{p:xnIsPC(p0),d:xnIsPC(d),av:xnIsPC(av)}:null,
      vault:econBagXia(S.econ.vault),res:S.res.lingshi,
      pSnap:snap(p0),dSnap:snap(d),avSnap:snap(av),
      flags:{treasury:!!S.econ.flags.treasury,cult:!!S.econ.flags.cult}
    };
  })()`);
  if(fx&&fx.EXC){rec('fixture：金庫／修煉旗標開、鍛造坊＋熟練鐵匠＋弟子＋模擬客機化身',false,fx);await snap('0_fixture_fail');fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs,fx},null,1));await br.close();process.exit(1);}
  rec('fixture：金庫／修煉旗標開、鍛造坊＋熟練鐵匠＋弟子＋模擬客機化身',!!(fx.bid&&fx.smith&&fx.disc&&fx.av&&fx.fee&&fx.fee.charge&&fx.lv>=3&&fx.flags&&fx.flags.treasury&&fx.flags.cult),fx);

  const avId=fx.av,discId=fx.disc,smithId=fx.smith;
  const bal=()=>ev(p,`(function(){
    const snap=function(id){const u=unitById(id);const w=u&&econWallet(u.id,false);return {id:id,ls:u?(u.lingshi||0):null,bag:w?econBagXia(w):0,ok:!!u};};
    return {vault:econBagXia(S.econ.vault),res:S.res.lingshi,p:snap(player().id),d:snap(${discId}),av:snap(${avId}),smith:snap(${smithId})};
  })()`);

  // ── 1. 宗主下單：免費，靈石與庫房不變 ──
  const b0=await bal();
  const rP=await ev(p,`(function(){
    const smith=unitById(${fx.smith});
    const fee=XW_ECON.smithFeeOf(smith,1);
    const r=XW_ECON.smithPay(smith,fee,1,player());
    return {r,fee,isP:econIsPlayerUnit(player())};
  })()`);
  const b1=await bal();
  rec('1 宗主下單 smithPay：回傳 free:player，主角靈石與庫房都不變',
    rP.r&&rP.r.ok&&rP.r.free==='player'&&rP.r.skipped===true&&rP.isP===true
    &&b1.vault===b0.vault&&b1.res===b0.res&&b1.p.bag===b0.p.bag&&b1.p.ls===b0.p.ls&&b1.smith.bag===b0.smith.bag,
    {rP,b0,b1});
  await snap('1_player_free');

  // ── 2. 弟子下單：照扣 ──
  const rD=await ev(p,`(function(){
    const smith=unitById(${fx.smith}),d=unitById(${fx.disc});
    const fee=XW_ECON.smithFeeOf(smith,1);
    const r=XW_ECON.smithPay(smith,fee,1,d);
    econMirrorUnitWallet(d);econMirrorUnitWallet(smith);
    return {r,fee,isD:econIsPlayerUnit(d)};
  })()`);
  const b2=await bal();
  const need=fx.fee.xia;
  rec('2 弟子下單 smithPay：econIsPlayerUnit 為假，弟子錢包照扣、庫房不變、鐵匠收到工錢',
    rD.r&&rD.r.ok&&!rD.r.free&&rD.isD===false
    &&b2.d.bag===b1.d.bag-need&&b2.vault===b1.vault&&b2.res===b1.res
    &&b2.smith.bag===b1.smith.bag+need&&b2.p.bag===b1.p.bag,
    {rD,b1,b2,need});
  await snap('2_disciple_charged');

  // ── 3. 模擬客機玩家化身：econIsPlayerUnit 為真，不扣費 ──
  const rA=await ev(p,`(function(){
    const smith=unitById(${fx.smith}),av=unitById(${fx.av});
    const fee=XW_ECON.smithFeeOf(smith,1);
    const r=XW_ECON.smithPay(smith,fee,1,av);
    return {r,fee,isAv:econIsPlayerUnit(av),kind:av.kind,np:av.np,xn:typeof xnIsPC==='function'?xnIsPC(av):null};
  })()`);
  const b3=await bal();
  rec('3 模擬客機化身（kind:disciple＋np）：econIsPlayerUnit 為真，化身與庫房都不扣',
    rA.isAv===true&&rA.np==='guest-pk-test'&&rA.r&&rA.r.ok&&rA.r.free==='player'&&rA.r.skipped===true
    &&b3.av.bag===b2.av.bag&&b3.vault===b2.vault&&b3.res===b2.res&&b3.smith.bag===b2.smith.bag,
    {rA,b2,b3});
  await snap('3_guest_avatar_free');

  // ── 4. 修煉消耗維持照扣（宗主與弟子都扣庫房）──
  const rC=await ev(p,`(function(){
    const p0=player(),d=unitById(${fx.disc});
    p0.realm=6;d.realm=6;
    econGrant('vault',20000,'test-cult-topup','xia');
    const v0=econBagXia(S.econ.vault),r0=S.res.lingshi;
    const cp=econCultCharge(p0,1,1);
    const v1=econBagXia(S.econ.vault),r1=S.res.lingshi;
    const cd=econCultCharge(d,1,1);
    const v2=econBagXia(S.econ.vault),r2=S.res.lingshi;
    return {cp,cd,v0,v1,v2,r0,r1,r2,paidP:v0-v1,paidD:v1-v2};
  })()`);
  rec('4 修煉消耗照扣：宗主與弟子的 econCultCharge 都從庫房扣費（本項未改成免費）',
    rC.cp&&rC.cp.ok&&rC.cd&&rC.cd.ok&&rC.paidP>0&&rC.paidD>0&&rC.v2<rC.v0&&rC.r2<rC.r0&&!rC.cp.free&&!rC.cd.free,
    rC);
  await snap('4_cult_still_charged');

  // ── 5. 開鍛造面板，確認「宗主免費」文字 ──
  let panelTxt=null,panelOk=false;
  try{
    const pre=await ev(p,`(function(){
      const b=bById(${fx.bid}),u=unitById(${fx.smith}),pl=player();
      if(pl){pl.x=b.i+20;pl.y=b.j+20;pl.inside=false;pl.inB=null;}
      if(u&&b){u.inside=true;u.inB=b.id;u.job='forge';u.jobB=b.id;u.x=b.i+0.8;u.y=b.j+0.8;u.dead=false;u.path=[];}
      const cr=crafters(b).map(x=>({id:x.id,kind:x.kind,job:x.job,np:x.np||null}));
      const best=bestCrafter(b);
      if(typeof openCraft==='function')openCraft(b);else if(typeof toggleCraft==='function')toggleCraft(true,b);
      try{if(typeof renderCraft==='function')renderCraft();}catch(e){}
      return {best:best&&{id:best.id,kind:best.kind},cr,occ:occupants(b).map(x=>x.id),job:u&&u.job,inB:u&&u.inB,bid:b.id};
    })()`);
    await sleep(500);
    await ev(p,`(function(){try{if(typeof renderCraft==='function')renderCraft();}catch(e){}return 1;})()`);
    await sleep(400);
    // stash pre for the rec detail
    globalThis.__panelPre=pre;
    panelTxt=await ev(p,`(function(){
      const el=document.getElementById('econ-gear-ui')||document.getElementById('craft');
      return el?el.innerText.slice(0,1200):'';
    })()`);
    panelOk=/宗主免費/.test(panelTxt||'');
  }catch(e){panelTxt=String(e);}
  rec('5 鍛造面板文字含「宗主免費」',panelOk,{txt:(panelTxt||'').slice(0,400),pre:globalThis.__panelPre});
  await snap('5_forge_panel');

  rec('console errors 0',errs.length===0,errs.slice(0,12));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs,fx,rP,rD,rA,rC,panelTxt},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f,'CONSOLE',errs.length);
  await br.close();process.exit(f?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
