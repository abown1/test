// 共用製作訂單 econCraftQ：鍛造相容舊佇列、假 alchemy 流程、旗標關時鍛造走舊程式。Playwright＋headless Chrome。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/econ_craftq_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const URL=process.env.XW_URL||'http://127.0.0.1:8988/index.html?dev=1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1400));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,600)};}},c);
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
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);
    Object.assign(S.res,{wood:2000,iron:2000,fiber:500,stone:500,herb:200});
    let b=S.buildings.find(x=>x.type==='forge'&&x.built);
    if(!b){try{XW.tjt.place('forge');}catch(e){}b=S.buildings.find(x=>x.type==='forge'&&x.built);}
    return {bid:b&&b.id,on:typeof econCraftQOn==='function'&&econCraftQOn(),hasAdd:typeof econCraftQAdd==='function',hasReg:!!(XW_ECON&&XW_ECON.craftQRegister),type:b&&b.type};
  })()`);
  rec('0 fixture：旗標預設開、共用 API 存在、有鍛造坊',!!(fx.bid&&fx.on&&fx.hasAdd&&fx.type==='forge'),fx);

  const Q=()=>ev(p,`(function(){
    const b=bById(${fx.bid});
    return {q:(b.econForgeQ||[]).map(x=>({id:x.id,k:x.k,n:x.n,inf:!!x.inf})),fqn:b._fqn||0,craft:b.craft?{k:b.craft.k,n:b.craft.n||1}:null,cq:b.econCraftQ||null};
  })()`);

  // ── 1. 加／合併／改數量／刪 ──
  const a1=await ev(p,`(function(){
    const b=bById(${fx.bid});
    const r1=XW_ECON.forgeQueueAdd(b,'sword',2,false);
    const r2=XW_ECON.forgeQueueAdd(b,'sword',3,false); // 同 k＋inf 應合併成 5
    const r3=XW_ECON.forgeQueueAdd(b,'fist',1,false);
    const q=b.econForgeQ||[];
    const idFist=q.find(x=>x.k==='fist');
    XW_ECON.forgeQueueSetN(b,idFist.id,4);
    return {r1,r2,r3,q:(b.econForgeQ||[]).map(x=>({id:x.id,k:x.k,n:x.n}))};
  })()`);
  rec('1 鍛造加單：同品合併（2+3=5）、異品另列、SetN 改成 4',
    a1.q&&a1.q.length===2&&a1.q[0].k==='sword'&&a1.q[0].n===5&&a1.q[1].k==='fist'&&a1.q[1].n===4,a1);
  const fistId=a1.q&&a1.q[1]&&a1.q[1].id;
  const a1d=await ev(p,`(function(){const b=bById(${fx.bid});XW_ECON.forgeQueueDel(b,${fistId});return (b.econForgeQ||[]).map(x=>x.k);})()`);
  rec('1b 刪除拳套後只剩長劍',Array.isArray(a1d)&&a1d.length===1&&a1d[0]==='sword',a1d);
  await snap('1_forge_add_del');

  // ── 2. 開爐：材料夠會 start，佇列移出該筆 ──
  const a2=await ev(p,`(function(){
    const b=bById(${fx.bid});
    b.craft=null;
    const before=(b.econForgeQ||[]).slice();
    const r=XW_ECON.forgeQueueKick(b);
    return {r,before:before.map(x=>({k:x.k,n:x.n})),q:(b.econForgeQ||[]).map(x=>({k:x.k,n:x.n})),craft:b.craft&&{k:b.craft.k,n:b.craft.n||1,t:b.craft.t}};
  })()`);
  rec('2 材料足夠：Kick 開爐（長劍×5），佇列清空且 b.craft 有長劍',
    a2.r&&a2.r.ok&&a2.r.started&&a2.r.started.k==='sword'&&a2.craft&&a2.craft.k==='sword'&&(!a2.q||a2.q.length===0),a2);
  await snap('2_forge_kick_start');

  // ── 3. 材料不足：跳過並提示，不開爐 ──
  const a3=await ev(p,`(function(){
    const b=bById(${fx.bid});
    b.craft=null;
    const keep={wood:S.res.wood,iron:S.res.iron};
    S.res.wood=0;S.res.iron=0;
    XW_ECON.forgeQueueAdd(b,'sword',1,false);
    const n0=__toasts.length;
    const r=XW_ECON.forgeQueueKick(b);
    S.res.wood=keep.wood;S.res.iron=keep.iron;
    return {r,q:(b.econForgeQ||[]).length,craft:!!b.craft,toasts:__toasts.slice(n0)};
  })()`);
  rec('3 材料不足：跳過長劍、佇列清空、不開爐、有「材料不足，跳過」提示',
    a3.r&&a3.r.ok===false&&a3.r.reason==='empty'&&a3.q===0&&a3.craft===false&&(a3.toasts||[]).some(t=>/材料不足，跳過/.test(t)),a3);
  await snap('3_forge_skip_short');

  // ── 4. 存讀檔：econForgeQ 與 _fqn 保留 ──
  const a4=await ev(p,`(function(){
    const b=bById(${fx.bid});
    b.craft=null;
    XW_ECON.forgeQueueAdd(b,'saber',2,false);
    XW_ECON.forgeQueueAdd(b,'fist',1,true);
    const before={id:b.id,q:(b.econForgeQ||[]).map(x=>({id:x.id,k:x.k,n:x.n,inf:!!x.inf})),fqn:b._fqn};
    const d=snapshot();
    localStorage.setItem(SAVE_KEY,JSON.stringify(d));
    loadGame(true);
    const b2=S.buildings.find(x=>x.id===before.id)||S.buildings.find(x=>x.type==='forge'&&x.built);
    return {before,after:{id:b2&&b2.id,q:((b2&&b2.econForgeQ)||[]).map(x=>({id:x.id,k:x.k,n:x.n,inf:!!x.inf})),fqn:b2&&b2._fqn},same:JSON.stringify(before.q)===JSON.stringify(((b2&&b2.econForgeQ)||[]).map(x=>({id:x.id,k:x.k,n:x.n,inf:!!x.inf})))};
  })()`);
  rec('4 存讀檔來回：econForgeQ 與編號都保留（不相容搬移、不丟資料）',
    a4.same===true&&a4.after&&a4.after.q&&a4.after.q.length===2&&a4.after.fqn===a4.before.fqn,a4);
  await snap('4_saveload');

  // ── 5. 假 type alchemy 註冊後整個流程可跑 ──
  const a5=await ev(p,`(function(){
    const calls=[];
    const fake={type:'alchemy',id:-99,craft:null,econCraftQ:null,_cqn:0};
    econCraftQRegister('alchemy',{
      qKey:'econCraftQ',idKey:'_cqn',maxN:20,
      start:function(b,k,n,inf){calls.push(['start',k,n,!!inf]);b.craft={k:k,n:n,t:0,T:1};return true;},
      cost:function(k,n){n=Math.max(1,n|0);return {herb:2*n,wood:1*n};},
      label:function(k){return '假丹-'+k;},
      canPay:function(c){for(const k in c){if((S.res[k]||0)<c[k])return false;}return true;}
    });
    const r1=econCraftQAdd(fake,'heal',2,false);
    const r2=econCraftQAdd(fake,'heal',1,false);
    const r3=econCraftQAdd(fake,'qi',1,false);
    const tot2=econCraftQTotal(fake); // heal×3 + qi×1
    const q1=(fake.econCraftQ||[]).map(x=>({id:x.id,k:x.k,n:x.n}));
    const idQi=q1.find(x=>x.k==='qi').id;
    econCraftQSetN(fake,idQi,3);
    const totSet=econCraftQTotal(fake); // qi 改成 3
    econCraftQDel(fake,idQi);
    const tot=econCraftQTotal(fake); // 刪 qi 後只剩 heal×3
    const panel=econCraftQPanel(fake);
    const kick=econCraftQKick(fake);
    return {r1,r2,r3,tot2,totSet,tot,q1,qAfter:fake.econCraftQ,kick,calls,craft:fake.craft,panel:panel.slice(0,400),cqn:fake._cqn,hasHeal:q1[0]&&q1[0].k==='heal'&&q1[0].n===3};
  })()`);
  rec('5 假 alchemy：合併加單、合計材料、改數量、刪除、面板 HTML、Kick 開爐',
    a5.hasHeal&&a5.tot&&a5.tot.herb===6&&a5.tot.wood===3
    &&a5.kick&&a5.kick.ok&&a5.craft&&a5.craft.k==='heal'
    &&/製作訂單/.test(a5.panel||'')&&a5.cqn>=1
    &&(!a5.qAfter||a5.qAfter.length===0),a5);
  await snap('5_fake_alchemy');

  // ── 6. 旗標關：鍛造走原本程式，仍可加單到 econForgeQ ──
  const a6=await ev(p,`(function(){
    const b=S.buildings.find(x=>x.type==='forge'&&x.built);
    b.econForgeQ=[];b.craft=null;
    window.ECON_CRAFTQ_FORCE=false;
    const on=econCraftQOn();
    const r=XW_ECON.forgeQueueAdd(b,'spear',2,false);
    const q=b.econForgeQ||[];
    window.ECON_CRAFTQ_FORCE=null;
    return {on,r,q:q.map(x=>({k:x.k,n:x.n,id:x.id})),keyIsForgeQ:Array.isArray(b.econForgeQ)};
  })()`);
  rec('6 旗標關（ECON_CRAFTQ_FORCE=false）：鍛造加單仍寫入 econForgeQ 且成功',
    a6.on===false&&a6.r&&a6.r.ok&&a6.q&&a6.q.length===1&&a6.q[0].k==='spear'&&a6.q[0].n===2&&a6.keyIsForgeQ===true,a6);
  await snap('6_flag_off');

  rec('console errors 0',errs.length===0,errs.slice(0,12));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs,fx,a1,a2,a3,a4,a5,a6},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f,'CONSOLE',errs.length);
  await br.close();process.exit(f?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
