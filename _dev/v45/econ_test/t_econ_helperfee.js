// 弟子幫忙費（helperFee）：宗主親手免費、弟子幫忙每件／每爐／每次收成一次，金庫付給弟子；金庫不足不開工並提示；
// 面板文字；客機化身（kind:'disciple'＋np）算宗主；旗標關（ECON_HELPERFEE_FORCE=false、?helperfee=0）回到舊行為。
// Playwright＋headless Chrome，面板按鈕用真滑鼠點擊。客機化身為同頁模擬單位，未做雙機連線。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/econ_helperfee_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const BASE=process.env.XW_URL||'http://127.0.0.1:8989/index.html?dev=1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,900));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,600)};}},c);
async function boot(br,url,errs){
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(81);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}});await sleep(2500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});await sleep(150);}catch(e){break;}}
  return p;
}
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const errs=[];
  const p=await boot(br,BASE,errs);
  const snap=n=>p.screenshot({path:SH+'/'+n+'.png'});
  await snap('00_cold_start_newgame');

  const fx=await ev(p,`(function(){
    try{openPause(false);}catch(e){}
    window.__toasts=[];const _t=toast;toast=function(m){try{__toasts.push(String(m));}catch(e){}return _t.apply(this,arguments);};
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;if(S&&S.raidsActive)S.raidsActive.length=0;}catch(e){}},400);
    S.econ=S.econ||{};S.econ.flags=S.econ.flags||{};
    S.econ.flags.treasury=true;S.econ.flags.cult=true;S.econ.flags.newBuildings=true;
    try{if(typeof econSyncVaultFromRes==='function')econSyncVaultFromRes(S);}catch(e){}
    econGrant('vault',5000,'test-fixture','xia');
    Object.assign(S.res,{wood:3000,iron:3000,fiber:800,stone:800,herb:800,hide:200,bone:200,core:50});
    S.recipes=S.recipes||{};S.recipes.hx=true;
    const place=t=>{let b=S.buildings.find(x=>x.type===t&&x.built);if(!b){try{XW.tjt.place(t);}catch(e){}b=S.buildings.find(x=>x.type===t&&x.built);}return b;};
    const fb=place('forge'),ab=place('alchemy'),lt=place('lingtian');
    const home=S.buildings.find(x=>x.built&&x.type==='hall')||null;
    const mk=(name,cpf)=>{const u=XW.spawnDisciple(home);u.name=name;u.cpf=cpf;u.hp=u.maxhp;u.realm=0;return u;};
    const smith=mk('鐵匠甲',{forge:16,alch:0});   // 鍛造熟練 Lv4
    const alc=mk('丹童乙',{forge:0,alch:0});      // 煉丹熟練 Lv0
    const f1=mk('農夫丙',{forge:0,alch:0}),f2=mk('農夫丁',{forge:0,alch:0});
    const av=mk('客機化身',{forge:400,alch:400});av.np='guest-pk-test';
    window.__T={fb:fb&&fb.id,ab:ab&&ab.id,lt:lt&&lt.id,smith:smith.id,alc:alc.id,f1:f1.id,f2:f2.id,av:av.id};
    // 工具：放進建築內工作／移出；宗主遠離或站在旁邊
    window.__put=function(uid,bid){const u=unitById(uid),b=bById(bid);u.job=JOB_OF[b.type];u.jobB=b.id;u.inside=true;u.inB=b.id;u.x=b.i+0.8;u.y=b.j+0.8;u.dead=false;u.path=[];u.task=null;};
    window.__out=function(uid){const u=unitById(uid);u.job=null;u.jobB=null;u.inside=false;u.inB=null;u.x=5;u.y=5;};
    window.__far=function(){const pl=player();pl.inside=false;pl.inB=null;pl.x=3;pl.y=3;};
    window.__near=function(bid){const b=bById(bid),pl=player();pl.inside=false;pl.inB=null;pl.x=b.i+1;pl.y=b.j+2.6;};
    window.__bal=function(){const w=id=>{const x=econWallet(id,false);return x?econBagXia(x):0;};return {vault:econBagXia(S.econ.vault),smith:w(__T.smith),alc:w(__T.alc),f1:w(__T.f1),f2:w(__T.f2),av:w(__T.av),pl:w(player().id)};};
    window.__setVault=function(x){const cur=econBagXia(S.econ.vault);if(cur>x)econCharge('vault',cur-x,'test-drain');else if(cur<x)econGrant('vault',x-cur,'test-fill','xia');S.econ.cultCarry=0;return econBagXia(S.econ.vault);};
    [smith,alc,f1,f2,av].forEach(u=>__out(u.id));
    return {T:__T,on:econHelperFeeOn(),rate:XW_ECON.HELPERFEE_RATE,feeSmith:XW_ECON.helperFeeOf('forge',smith,1),feeAlc:XW_ECON.helperFeeOf('alchemy',alc,1),
      isAv:econIsPlayerUnit(av),isSmith:econIsPlayerUnit(smith),vault:econBagXia(S.econ.vault)};
  })()`);
  const fxOk=fx&&!fx.EXC&&fx.T&&fx.T.fb&&fx.T.ab&&fx.T.lt&&fx.on===true&&fx.feeSmith.per===3&&fx.feeAlc.per===2&&fx.isAv===true&&fx.isSmith===false;
  rec('0 fixture：旗標預設開、鍛造坊／煉丹房／靈田、鐵匠 Lv4 每件 3、丹童每爐 2、客機化身算宗主',fxOk,fx);
  if(!fxOk){fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));await br.close();process.exit(1);}
  const T=fx.T;

  // 1 宗主親手（站在爐邊、沒有弟子）：免費
  const r1=await ev(p,`(function(){const b=bById(${T.fb});b.craft=null;__near(b.id);const b0=__bal();const ok=startCraft(b,'sword',false);const b1=__bal();const hf=b.craft&&b.craft.hf;const best=bestCrafter(b);b.craft=null;__far();return {ok,b0,b1,hf,best:best&&best.kind};})()`);
  rec('1 宗主親手鍛造：免費，金庫不變，hf=free',r1.ok===true&&r1.hf&&r1.hf.st==='free'&&r1.b1.vault===r1.b0.vault&&r1.best==='player',r1);

  // 2 弟子幫忙單件：金庫 -3、鐵匠 +3
  const r2=await ev(p,`(function(){const b=bById(${T.fb});b.craft=null;__far();__put(${T.smith},b.id);const b0=__bal();const ok=startCraft(b,'sword',false);const b1=__bal();const hf=b.craft&&b.craft.hf;b.craft=null;return {ok,b0,b1,hf,dv:b0.vault-b1.vault,ds:b1.smith-b0.smith};})()`);
  rec('2 鐵匠幫忙鍛造 1 件：金庫扣 3、鐵匠本人收 3',r2.ok===true&&r2.dv===3&&r2.ds===3&&r2.hf&&r2.hf.st==='paid'&&r2.hf.xia===3,r2);

  // 3 鍛造佇列：真滑鼠點「＋ 長劍」×5 與「開始佇列」，每件收一次＝15
  const pre3=await ev(p,`(function(){const b=bById(${T.fb});b.craft=null;b.econForgeQ=[];__far();__put(${T.smith},b.id);__toasts.length=0;window.__b3=__bal();openCraft(b);renderCraft();return {open:!!document.getElementById('econ-gear-ui')};})()`);
  await sleep(300);
  let click3='';
  try{
    await p.click('[data-eg-qn="5"]');await sleep(200);
    await p.click('[data-eg-add="sword"]');await sleep(200);
    await snap('03a_forge_panel_queue_x5');
    const panel=await ev(p,`(document.getElementById('econ-gear-ui')||{}).innerText||''`);
    globalThis.__forgePanel=panel;
    await p.click('[data-eg-start]');await sleep(300);
    click3='ok';
  }catch(e){click3=String(e).slice(0,200);}
  const r3=await ev(p,`(function(){const b=bById(${T.fb});const b1=__bal();const c=b.craft;const out={c:c&&{k:c.k,n:c.n,hf:c.hf},b0:__b3,b1,dv:__b3.vault-b1.vault,ds:b1.smith-__b3.smith,q:(b.econForgeQ||[]).length,toasts:__toasts.slice(-4)};return out;})()`);
  rec('3 鍛造佇列（真點擊 ×5＋開始佇列）：每件一次，金庫扣 15、鐵匠收 15',click3==='ok'&&r3.c&&r3.c.n===5&&r3.dv===15&&r3.ds===15&&r3.c.hf&&r3.c.hf.st==='paid'&&r3.q===0,{click3,r3,pre3});
  await snap('03b_forge_queue_started');
  rec('4 鍛造面板顯示「弟子幫忙費：每次 3」',/弟子幫忙費：每次 3 下品/.test(globalThis.__forgePanel||''),{txt:(globalThis.__forgePanel||'').slice(0,500)});

  // 5 煉丹房：單爐＋佇列（每一爐一次）
  const r5=await ev(p,`(function(){const b=bById(${T.ab});b.craft=null;b.econCraftQ=[];__far();__put(${T.alc},b.id);const b0=__bal();const ok=startCraft(b,'hx',false);const b1=__bal();const hf1=b.craft&&b.craft.hf;b.craft=null;
    econCraftQAdd(b,'hx',3,false);const k=econCraftQKick(b);const b2=__bal();const c=b.craft;const r={ok,hf1,d1v:b0.vault-b1.vault,d1a:b1.alc-b0.alc,kick:k&&{ok:k.ok,reason:k.reason},c:c&&{k:c.k,n:c.n,hf:c.hf},d2v:b1.vault-b2.vault,d2a:b2.alc-b1.alc};return r;})()`);
  rec('5a 丹童幫忙煉丹 1 爐：金庫扣 2、丹童收 2',r5.ok===true&&r5.d1v===2&&r5.d1a===2&&r5.hf1&&r5.hf1.st==='paid',r5);
  rec('5b 煉丹佇列 3 爐（econCraftQKick→alchCqStart）：每爐一次，金庫扣 6、丹童收 6',r5.kick&&r5.kick.ok&&r5.c&&r5.c.n===3&&r5.d2v===6&&r5.d2a===6,r5);
  const pre6=await ev(p,`(function(){const b=bById(${T.ab});openCraft(b);renderCraft();return 1;})()`);
  await sleep(400);
  const alchTxt=await ev(p,`(document.getElementById('craft')||{}).innerText||''`);
  await snap('05_alchemy_panel');
  rec('6 煉丹面板顯示 g17「宗主親手開爐免費；弟子幫忙每爐另收費」與「弟子幫忙費：每次 2」，且無舊句「目前煉丹不另收工錢」',/宗主親手開爐免費；弟子幫忙每爐另收費（從宗門金庫扣）。/.test(alchTxt)&&/弟子幫忙費：每次 2 下品/.test(alchTxt)&&!/目前煉丹不另收工錢/.test(alchTxt),{txt:alchTxt.slice(0,800)});
  await ev(p,`(function(){try{closeCraft&&closeCraft();}catch(e){}try{toggleCraft&&toggleCraft(false);}catch(e){}const b=bById(${T.ab});b.craft=null;return 1;})()`);

  // 7 金庫不足：佇列不開工、保留該筆、提示；直接開爐也拒絕
  const r7=await ev(p,`(function(){const b=bById(${T.fb});b.craft=null;b.econForgeQ=[];__far();__put(${T.smith},b.id);__setVault(2);__toasts.length=0;const iron0=S.res.iron;
    econCraftQAdd(b,'sword',1,false);const k=econCraftQKick(b);const q=(b.econForgeQ||[]).length;const c1=!!b.craft;const ok2=startCraft(b,'sword',false);const c2=!!b.craft;const v=econBagXia(S.econ.vault);
    return {k,q,c1,ok2,c2,v,iron:iron0-S.res.iron,toasts:__toasts.slice(-4)};})()`);
  rec('7 金庫只剩 2（需 3）：佇列停在該筆不丟、不開爐、不扣材料，提示「宗門金庫不足，弟子幫忙費每次 3 下品」',
    r7.k&&r7.k.reason==='helper-fee'&&r7.q===1&&!r7.c1&&r7.ok2===false&&!r7.c2&&r7.v===2&&r7.iron===0&&r7.toasts.some(t=>/宗門金庫不足，弟子幫忙費每次 3 下品/.test(t)),r7);
  await snap('07_treasury_short_hint');

  // 8 客機化身（kind:disciple＋np）在爐邊當主事：算宗主，免費
  const r8=await ev(p,`(function(){__setVault(3000);const b=bById(${T.fb});b.craft=null;b.econForgeQ=[];__far();__out(${T.smith});__put(${T.av},b.id);const best=bestCrafter(b);const b0=__bal();const ok=startCraft(b,'sword',false);const b1=__bal();const hf=b.craft&&b.craft.hf;b.craft=null;__out(${T.av});
    return {ok,best:best&&{id:best.id,kind:best.kind,np:best.np},hf,dv:b0.vault-b1.vault,da:b1.av-b0.av};})()`);
  rec('8 客機化身主事（kind:disciple＋np）：econIsPlayerUnit 為真，免費、金庫不變',r8.ok===true&&r8.best&&r8.best.np==='guest-pk-test'&&r8.hf&&r8.hf.st==='free'&&r8.dv===0&&r8.da===0,r8);

  // 9 開爐時弟子還在路上：先標 due；弟子到爐邊第一次 tick 收費；金庫不足則暫停進度
  const r9=await ev(p,`(function(){const b=bById(${T.fb});b.craft=null;__far();__out(${T.smith});
    const u=unitById(${T.smith});u.job='forge';u.jobB=b.id;u.inside=false;u.inB=null;u.x=3;u.y=3; // 已派駐但人不在爐邊
    // 先把已派駐也移掉，模擬「完全沒人」→ due
    u.job=null;u.jobB=null;
    const ok=startCraft(b,'sword',false);const st0=b.craft&&b.craft.hf&&b.craft.hf.st;
    __setVault(1);__put(${T.smith},b.id);const t0=b.craft.t;__toasts.length=0;tickCraft(0.5);tickCraft(0.5);const t1=b.craft&&b.craft.t;const st1=b.craft&&b.craft.hf&&b.craft.hf.st;const tz=__toasts.slice(-2);
    __setVault(100);const v0=__bal();tickCraft(0.5);const v1=__bal();const st2=b.craft&&b.craft.hf&&b.craft.hf.st;const t2=b.craft&&b.craft.t;b.craft=null;
    return {ok,st0,t0,t1,st1,tz,st2,t2,dv:v0.vault-v1.vault,ds:v1.smith-v0.smith};})()`);
  rec('9 無人時開爐→due；弟子到爐邊但金庫不足→進度暫停並提示；補錢後收 3 並繼續',
    r9.ok===true&&r9.st0==='due'&&r9.t1===r9.t0&&r9.st1==='due'&&r9.tz.some(t=>/宗門金庫不足/.test(t))&&r9.st2==='paid'&&r9.dv===3&&r9.ds===3&&r9.t2>r9.t0,r9);

  // 10 靈田（farmYear 預設關＝既有收成週期）：每名務農弟子每次收成 1 下品，同一週期不重收，換週期再收；金庫不足的弟子本次不算加成
  const r10=await ev(p,`(function(){S.econ.flags.farmYear=false;try{window.ECON_FARMYEAR_FORCE=null;}catch(e){}const b=bById(${T.lt});if(!b)return {EXC:'no lingtian'};delete b._hfFarm;
    const u1=unitById(${T.f1}),u2=unitById(${T.f2});[u1,u2].forEach(u=>{const r=econFarmAssign(u,b);});
    const grow=econBuildingEffect('lingtian',econBuildingLvOf(b)).growSec||300;
    const a=__bal();econBuildingsTick(1);const b1=__bal();econBuildingsTick(1);const b2=__bal();
    econBuildingsTick(grow);const b3=__bal();
    const yPaid=econFarmYieldOf(b).workers;
    __setVault(1);econBuildingsTick(grow);const yShort=econFarmYieldOf(b).workers;const H=JSON.parse(JSON.stringify(b._hfFarm));
    const rows=econBuildingDescRows(b).map(r=>r.join('：')).join('｜');__setVault(3000);
    return {grow,assign:[u1.job,u2.job],d1:a.vault-b1.vault,f1:b1.f1-a.f1,f2:b1.f2-a.f2,d2:b1.vault-b2.vault,d3:b2.vault-b3.vault,yPaid,yShort,H,rows};})()`);
  rec('10 靈田 2 名務農：首個週期金庫扣 2、各收 1；同週期不重收；換週期再扣 2；金庫只剩 1 時只算 1 人加成；說明列有「弟子幫忙費：每次 1」',
    r10&&!r10.EXC&&r10.d1===2&&r10.f1===1&&r10.f2===1&&r10.d2===0&&r10.d3===2&&r10.yPaid===2&&r10.yShort===1&&/弟子幫忙費：每次 1 下品/.test(r10.rows),r10);

  // 11 旗標關（window.ECON_HELPERFEE_FORCE=false）：鐵匠幫忙不收幫忙費（回到舊規：宗主下單免）、面板回舊字
  const r11=await ev(p,`(function(){window.ECON_HELPERFEE_FORCE=false;const b=bById(${T.fb});b.craft=null;b.econForgeQ=[];__far();__put(${T.smith},b.id);const b0=__bal();const ok=startCraft(b,'sword',false);const b1=__bal();const hf=b.craft&&b.craft.hf;b.craft=null;
    const lt=bById(${T.lt});const v0=__bal();econBuildingsTick(400);const v1=__bal();
    openCraft(b);renderCraft();const txt=(document.getElementById('econ-gear-ui')||{}).innerText||'';
    return {on:econHelperFeeOn(),ok,hf:hf||null,dv:b0.vault-b1.vault,ds:b1.smith-b0.smith,farmDv:v0.vault-v1.vault,txt:txt.slice(0,400)};})()`);
  await snap('11_flag_off_forge_panel');
  rec('11 旗標關：不收幫忙費（金庫、鐵匠都不變）、靈田不收、面板回到「弟子自付，宗主免費」',
    r11.on===false&&r11.ok===true&&!r11.hf&&r11.dv===0&&r11.ds===0&&r11.farmDv===0&&/宗主免費/.test(r11.txt)&&!/弟子幫忙費/.test(r11.txt),r11);
  await ev(p,`(function(){window.ECON_HELPERFEE_FORCE=null;try{toggleCraft&&toggleCraft(false);}catch(e){}return 1;})()`);

  // 12 網址 ?helperfee=0 也能關
  const p2=await boot(br,BASE+(BASE.indexOf('?')>=0?'&':'?')+'helperfee=0',errs);
  const r12=await ev(p2,`(function(){return {on:econHelperFeeOn(),search:location.search};})()`);
  rec('12 網址 ?helperfee=0：econHelperFeeOn() 為假',r12.on===false,r12);
  await p2.close();

  rec('console errors 0',errs.length===0,errs.slice(0,12));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f,'CONSOLE',errs.length);
  await br.close();process.exit(f?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
