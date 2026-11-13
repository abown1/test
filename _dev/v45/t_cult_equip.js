// t_cult_equip：g12 裝備穿脫與功法主修／輔修（CultGF.gfEquip）互不干擾；卸下裝備不清 u.gf.aux。
// fixture（非真人遊玩）：XW.newGame；XW.setRealm 主角 4；S.inv 直接塞一把劍；CultGF.learn(dev) 學兩部功法；
// 行囊用 DOM click（[data-it]→[data-eq]、[data-uneq]）；功法面板點 [data-gf="eq"/"aux"]。不改 g*／存檔結構。
// 用法：XW_URL=http://127.0.0.1:PORT/ node t_cult_equip.js
const {chromium}=require('/workspace/xianwu_demo/node_modules/playwright-core');
const URL=process.env.XW_URL||'http://127.0.0.1:8434/';
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d));};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  try{
    await p.goto(URL);await p.waitForFunction(()=>window.XW&&XW.newGame&&window.CultGF);
    await p.evaluate(()=>{XW.newGame(7351,true);XW.showTitle(false);XW.tutEnd&&XW.tutEnd(true);XW.setHelp&&XW.setHelp(false);if(window.UI_NOTICE)UI_NOTICE.close();document.body.classList.add('ingame');});
    await p.waitForTimeout(1600); // 等 g30 install(1400ms) 跑完
    const prep=await p.evaluate(()=>{const S=XW.S,u=XW.player();XW.setRealm(u,4,0);u.hp=u.maxhp;u.eq=u.eq||{};for(const k in u.eq)u.eq[k]=null;
      const it={id:S.nextItem++,t:'sword',slot:'w',q:1,el:-1,atk:8,hp:0,def:0,spd:0,realm:1};S.inv.push(it);window.__sw=it.id;
      const a=CultGF.learn(u,'zheng_low_02','dev'),c=CultGF.learn(u,'xian_low_02','dev');
      const m=CultGF.gfEquip(u,'zheng_low_02','main'),x=CultGF.gfEquip(u,'xian_low_02','aux');
      return {a:a.ok,c:c.ok,m,x,main:u.gf.main,aux:u.gf.aux.slice(),same:typeof CultGF.gfEquip==='function'&&typeof CultGF.gfUnequip==='function',neta:!!(CultGF.equip._neta&&CultGF.unequip._neta)};});
    rec('1 功法 gfEquip 主修／輔修可用，別名 gfEquip 可用、CultGF.equip 仍有 net20 客機唯讀包裝',prep.m.ok&&prep.x.ok&&prep.main==='zheng_low_02'&&prep.aux[0]==='xian_low_02'&&prep.same&&prep.neta,prep);
    // 開行囊
    await p.evaluate(()=>{const bt=document.getElementById('b_bag')||[...document.querySelectorAll('button')].find(x=>/行囊/.test(x.textContent||''));if(bt)bt.click();});
    await p.waitForFunction(()=>{const el=document.getElementById('bag');return el&&el.classList.contains('open');},{timeout:8000}).catch(()=>{});
    await p.evaluate(()=>{const t=document.querySelector('#bag [data-btab="gear"]');if(t)t.click();});await p.waitForTimeout(200);
    const wear=await p.evaluate(()=>{const id=window.__sw;const c=document.querySelector('#bag [data-it="'+id+'"]');if(c)c.click();
      const e=document.querySelector('#bag [data-eq]');const eqv=e&&e.dataset.eq;if(e)e.click();const u=XW.player();
      const slot=Object.keys(u.eq||{}).find(k=>u.eq[k]&&u.eq[k].id===id);return {card:!!c,btn:!!e,eqv,slot,inInv:XW.S.inv.some(x=>x&&x.id===id),aux:u.gf.aux.slice(),main:u.gf.main};});
    rec('2 g12 裝備穿上（行囊點擊）：劍進裝備欄、離開行囊，功法主輔修不變',wear.slot&&!wear.inInv&&wear.aux[0]==='xian_low_02'&&wear.main==='zheng_low_02',wear);
    await p.waitForTimeout(150);
    const off=await p.evaluate(s=>{const b=document.querySelector('#bag [data-uneq="'+s+'"]');if(b)b.click();const u=XW.player();
      return {btn:!!b,still:!!(u.eq&&u.eq[s]),inInv:XW.S.inv.some(x=>x&&x.id===window.__sw),aux:u.gf.aux.slice(),main:u.gf.main};},wear.slot||'w');
    rec('3 g12 卸下：劍回行囊，u.gf.aux 不被清、主修不變',off.btn&&!off.still&&off.inInv&&off.aux[0]==='xian_low_02'&&off.main==='zheng_low_02',off);
    // 功法面板點擊主修／輔修
    await p.evaluate(()=>{const el=document.getElementById('bag');if(el&&el.classList.contains('open')){const x=el.querySelector('[data-bag]');if(x)x.click();}
      const u=XW.player();CultGF.gfUnequip(u,'aux');CultGF.gfUnequip(u,'main');try{selUnits=[u.id];}catch(e){}CultGF.openPanel(true);});
    await p.waitForTimeout(200);
    await p.locator('#cultGFPanel [data-gf="eq"][data-id="xian_low_02"]').first().click({force:true});await p.waitForTimeout(100);
    await p.locator('#cultGFPanel [data-gf="aux"][data-id="zheng_low_02"]').first().click({force:true});await p.waitForTimeout(100);
    const pan=await p.evaluate(()=>{const u=XW.player();const r=CultGF.unequip(u,'aux','zheng_low_02');return {main:u.gf.main,auxAfterUn:u.gf.aux.slice(),r,eqW:!!(u.eq&&u.eq.w)};});
    rec('4 功法面板點主修／輔修→gfEquip 生效；CultGF.unequip(aux,id) 只拿掉該輔修',pan.main==='xian_low_02'&&pan.r.ok&&pan.auxAfterUn.length===0,pan);
    rec('5 主控台無錯',errs.length===0,errs.slice(0,5));
  }catch(e){rec('EXC',false,String(e&&e.stack||e));}
  await b.close();const f=rows.filter(r=>!r.ok).length;console.log(`RESULT ${rows.length-f}/${rows.length}`);process.exit(f?1:0);
})();
