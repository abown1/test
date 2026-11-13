// 剛入手裝備保留 60 遊戲秒（econ_gtrade.js gtShelfTick）：真實 headless Chrome、真函式。
// 有 g12 暫用包裝（目前 gtShelfTick）與沒有包裝（XW_ECON.gtShelfTickRaw）都要成立；gtAutoTick 不受影響。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/econ_gearhold_20261111';
fs.mkdirSync(OUT,{recursive:true});
const URL=process.env.XW_URL||'http://127.0.0.1:8991/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,700));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,600)};}},c);
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(77);if(XW.tutEnd)XW.tutEnd(true);});await sleep(2500);
  const fx=await ev(p,`(function(){
    window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);
    const h=S.buildings.find(b=>b.type==='hall')||S.buildings[0];
    for(let k=0;k<3;k++)spawnDisciple(h);
    const ds=disciples().filter(u=>!u.dead);
    for(const u of ds){try{econGrant(u,5000,'test-fixture','xia');}catch(e){}u.lingshi=5000;}
    // 測試隔離：每個情境換一名新弟子當買家（其他弟子標記離場），其他裝備下架
    window.__fresh=function(){for(const u of disciples())if(!u._ghKeep)u.dead=true;const u=spawnDisciple(h);u.dead=false;try{econGrant(u,5000,'test-fixture','xia');}catch(e){}u.lingshi=5000;return u;};
    window.__mk=function(){for(const x of S.inv)if(x&&x.shelf)delete x.shelf;__fresh();const it=makeItem('sword',2);it._gotT=undefined;delete it._gotT;addItem(it);const r=gtShelfToggle(it.id);return it;};
    window.__st=function(it){const x=S.inv.find(y=>y===it);return {inInv:!!x,shelf:x?x.shelf:null,own:it.own==null?null:it.own,xh:!!it._xhShelf,gotT:it._gotT};};
    const it=__mk();
    return {nd:ds.length,bal:gtBal(ds[0]),price:gtPrice(it),why:gtBuyReason(disciples().find(u=>!u.dead),it),wrapped:!!gtShelfTick._gearHold,raw:typeof XW_ECON.gtShelfTickRaw==='function',raweq:XW_ECON.gtShelfTickRaw===gtShelfTick,tune:TUNE.gearHold,st:__st(it),t:S.time};
  })()`);
  rec('0 fixture：弟子付得起、可買（gtBuyReason 空）、g12 包裝在、raw 可取、addItem 已打 _gotT',fx.nd>=1&&fx.why===''&&fx.wrapped&&fx.raw&&!fx.raweq&&fx.st.gotT!=null&&fx.st.shelf,fx);
  // 每個情境在單一 evaluate 內同步完成，遊戲迴圈不會插隊
  const run=(useRaw,label)=>ev(p,`(function(){
    const T=${useRaw}?XW_ECON.gtShelfTickRaw:gtShelfTick;
    const it=__mk();const t0=S.time;
    const n1=T();const s1=__st(it);
    S.time=t0+59.5;const n2=T();const s2=__st(it);
    S.time=t0+(${useRaw}?60:60.01);const n3=T();const s3=__st(it);
    return {n1,s1,n2,s2,n3,s3,held:XW_ECON.gtGearHeld(it)};
  })()`);
  for(const [raw,lab] of [[false,'有 g12 包裝'],[true,'沒有 g12 包裝（raw）']]){
    const r=await run(raw,lab);
    rec('1 '+lab+'：剛入手 0 秒、59.5 秒不被買走，shelf 仍在、無殘留暫存欄位',r.n1===0&&r.s1.inInv&&r.s1.shelf&&!r.s1.xh&&r.n2===0&&r.s2.inInv&&r.s2.shelf&&!r.s2.xh,r);
    rec('2 '+lab+'：滿 60 秒（raw 恰 60.00；包裝版 60.01，g12 判斷無浮點容差）可被弟子買走',r.n3>=1&&!r.s3.inInv&&r.s3.own!=null,r);
  }
  const c=await ev(p,`(function(){const it=__mk();delete it._gotT;const n=XW_ECON.gtShelfTickRaw();const s=__st(it);
    const it2=__mk();delete it2._gotT;const n2=gtShelfTick();return {n,s,n2,s2:__st(it2)};})()`);
  rec('3 沒有 _gotT 的舊物品視為已過保留期：raw 與包裝版都立刻可買',c.n>=1&&!c.s.inInv&&c.n2>=1&&!c.s2.inInv,c);
  const d=await ev(p,`(function(){const keep=TUNE.gearHold;TUNE.gearHold={on:false,sec:60};
    const it=__mk();const n=XW_ECON.gtShelfTickRaw();const s=__st(it);const it2=__mk();const n2=gtShelfTick();const s2=__st(it2);
    TUNE.gearHold=keep;return {n,s,n2,s2,restored:TUNE.gearHold};})()`);
  rec('4 TUNE.gearHold.on=false：剛入手也立刻可買（raw＋包裝版）',d.n>=1&&!d.s.inInv&&d.n2>=1&&!d.s2.inInv,d);
  const e=await ev(p,`(function(){const it=__mk();const t0=S.time;TUNE.gearHold.sec=10;S.time=t0+10;const n=XW_ECON.gtShelfTickRaw();const s=__st(it);TUNE.gearHold.sec=60;return {n,s};})()`);
  rec('5 TUNE.gearHold.sec=10：10 秒即可買（秒數可調）',e.n>=1&&!e.s.inInv,e);
  const f=await ev(p,`(function(){
    for(const x of S.inv)if(x&&x.shelf)delete x.shelf;
    const a=__fresh();a._ghKeep=1;const b=__fresh();delete a._ghKeep;const ds=[a,b];
    const it=makeItem('sword',2);it.own=a.id;it._gotT=S.time;a.gbag=gtBag(a);a.gbag.push(it);
    for(const u of ds){if(u!==a&&u!==b){u.lingshi=0;try{const E=gtMoney();const w=E&&E.wallet(u.id,false);}catch(e){}}}
    const wants=gtWants(b,it);const held=XW_ECON.gtGearHeld(it);
    const n=gtAutoTick();
    return {wants,held,n,own:it.own,a:a.id,b:b.id,inA:gtBag(a).includes(it)};
  })()`);
  rec('6 gtAutoTick（弟子間私人裝備）不套用保留期：剛入手（_gotT=現在）仍可成交',f.held===true&&f.n>=1&&f.own!==f.a&&!f.inA,f);
  const g=await ev(p,`(function(){const it=makeItem('sword',2);addItem(it);const d=__fresh();
    const held=XW_ECON.gtGearHeld(it);const r=gtSellToDisciple(d,it.id);return {held,r:{ok:r.ok,why:r.why},inInv:S.inv.includes(it)};})()`);
  rec('7 玩家手動「賣給弟子」在 60 秒內仍可成功',g.held===true&&g.r.ok&&!g.inInv,g);
  // 8 真時間：讓遊戲迴圈自己跑（GT_SHELF_EVERY 週期自動選購）幾秒，剛入手的不被買
  const h0=await ev(p,`(function(){window.__hi=__mk();return {t:S.time,st:__st(__hi)};})()`);
  await sleep(8000);
  const h1=await ev(p,`({t:S.time,st:__st(__hi),every:typeof GT_SHELF_EVERY!=='undefined'?GT_SHELF_EVERY:null})`);
  rec('8 遊戲迴圈真時間跑 '+Math.round(h1.t-h0.t)+' 遊戲秒（< 60）：自動店面選購沒有買走剛入手的裝備',h1.t>h0.t&&h1.t-h0.t<60&&h1.st.inInv&&h1.st.shelf,{h0,h1});
  rec('9 console／pageerror 0 筆',errs.length===0,errs.slice(0,8));
  fs.writeFileSync(OUT+'/result.json',JSON.stringify({rows,errs},null,1));
  const pass=rows.filter(r=>r.ok).length;console.log('SUMMARY '+pass+'/'+rows.length+' console='+errs.length);
  await br.close();process.exit(pass===rows.length?0:1);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
