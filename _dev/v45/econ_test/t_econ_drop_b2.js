// B2：econ_drop 右鍵拾取 — 室內不攔截；戶外 1.5 格內直接撿、遠的先走再撿（另下指令就取消）。真右鍵，headless Chrome。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_drop_b2_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const URL=process.env.XW_URL||'http://127.0.0.1:8931/index.html?dev=1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,900));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
const snap=(p,n)=>p.screenshot({path:SH+'/'+n+'.png'});
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(2406);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}});await sleep(2500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:700});await sleep(200);}catch(e){break;}}
  await ev(p,`(function(){try{openPause(false);}catch(e){}window.__toasts=[];const _t=toast;toast=function(m){try{__toasts.push(String(m));}catch(e){}return _t.apply(this,arguments);};
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);return 1;})()`);
  // fixture：在指定格放一件真實地面裝備（econRollEnemyGear 產生）；t 往前推，避免「剛落地延遲」干擾
  const putDrop=(x,y)=>ev(p,`(function(){const f=(XW.econ&&XW.econ.econRollEnemyGear)||XW_ECON.econRollEnemyGear||window.econRollEnemyGear;let it=null;for(let k=0;k<20&&!it;k++){const a=f(3)||[];it=a[0]||null;}if(!it)return {err:'no item'};
    const rec={id:'b2'+Math.random().toString(36).slice(2,7),x:${x},y:${y},item:it,t:S.time-5,dg:false};S.econ.groundGear.push(rec);return {id:rec.id,name:itemName(it)};})()`);
  const gs=()=>ev(p,`({ground:(S.econ.groundGear||[]).map(d=>d.id),inv:S.inv.length,pend:XW_ECON.econDropPending(),px:+player().x.toFixed(2),py:+player().y.toFixed(2),task:player().task&&player().task.type})`);
  const scrTile=(x,y)=>ev(p,`(function(){const q=iso(${x},${y});const sx=(q.x-cam.x)*cam.zoom+W/2,sy=(q.y-cam.y)*cam.zoom+H/2;return {sx,sy,el:(document.elementFromPoint(sx,sy)||{}).id};})()`);
  const center=()=>ev(p,`(function(){const u=player();const q=iso(u.x,u.y);cam.follow=false;cam.x=q.x+120/cam.zoom;cam.y=q.y;selUnits=[u.id];selBuilding=null;return 1;})()`);
  // 找主角附近、與建築不重疊、可走的格子（給定距離）
  const freeAt=(r)=>ev(p,`(function(){const u=player();const occ=(x,y)=>S.buildings.some(b=>{const s=(BUILD[b.type]&&BUILD[b.type].size)||2;return x>b.i-1.2&&x<b.i+s+1.2&&y>b.j-1.2&&y<b.j+s+1.2;});
    for(let a=0;a<24;a++){const x=u.x+Math.cos(a/24*6.283)*${r},y=u.y+Math.sin(a/24*6.283)*${r};if(occ(x,y))continue;try{if(!walkable(Math.floor(x),Math.floor(y)))continue;}catch(e){}const q=iso(x,y);const sx=(q.x-cam.x)*cam.zoom+W/2,sy=(q.y-cam.y)*cam.zoom+H/2;const el=document.elementFromPoint(sx,sy);if(!el||el.id!=='game')continue;if((S.econ.groundGear||[]).some(d=>Math.hypot(d.x-x,d.y-y)<2.5))continue;return {x:+x.toFixed(3),y:+y.toFixed(3)};}return null;})()`);

  // ── (b) 戶外近（1.45 格：在自動拾取半徑 1.35 外、右鍵直接撿範圍 1.5 內）──
  await center();await sleep(300);
  let pt=await freeAt(1.45);const dB=await putDrop(pt.x,pt.y);
  let g0=await gs();let s=await scrTile(pt.x,pt.y);await snap(p,'b_outdoor_near_before');
  let n0=await ev(p,'__toasts.length');
  await p.mouse.click(s.sx,s.sy,{button:'right'});await sleep(150);
  let g1=await gs();
  rec('(b) 戶外 1.45 格右鍵：立即拾取（不用走）',!g1.ground.includes(dB.id)&&g1.inv===g0.inv+1&&Math.hypot(g1.px-g0.px,g1.py-g0.py)<0.3,{dB,el:s.el,g0,g1,toasts:await ev(p,`__toasts.slice(${n0})`)});
  await snap(p,'b_outdoor_near_after');
  // ── (c) 戶外遠（6 格）：先走過去、抵達再撿 ──
  await center();await sleep(300);
  pt=await freeAt(6);const dC=await putDrop(pt.x,pt.y);g0=await gs();s=await scrTile(pt.x,pt.y);await snap(p,'c_outdoor_far_before');
  n0=await ev(p,'__toasts.length');
  await p.mouse.click(s.sx,s.sy,{button:'right'});await sleep(200);
  g1=await gs();
  rec('(c) 戶外 6 格右鍵：不會隔空撿，開始走（pending＝該掉落）',g1.ground.includes(dC.id)&&g1.inv===g0.inv&&g1.pend&&g1.pend.id===dC.id&&g1.task==='move',{dC,el:s.el,g1});
  await sleep(1200);await snap(p,'c_outdoor_far_walking');
  let picked=null;const t0=Date.now();
  while(Date.now()-t0<20000){const g=await gs();if(!g.ground.includes(dC.id)){picked=g;break;}await sleep(100);}
  const dAt=picked?Math.hypot(picked.px-pt.x,picked.py-pt.y):null;
  rec('(c) 走到後拾取（拾取時距離 ≤1.5 格）',picked&&picked.inv===g0.inv+1&&dAt<=1.6,{dAt:dAt&&+dAt.toFixed(2),picked,toasts:await ev(p,`__toasts.slice(${n0})`)});
  await snap(p,'c_outdoor_far_after');
  // ── (c2) 取消：遠的右鍵後，馬上右鍵別處 → 不撿 ──
  await center();await sleep(300);
  pt=await freeAt(6);const dX=await putDrop(pt.x,pt.y);g0=await gs();s=await scrTile(pt.x,pt.y);
  await p.mouse.click(s.sx,s.sy,{button:'right'});await sleep(120);
  const p1=await gs();p1.dX=dX;p1.pt=pt;p1.ptask=await ev(p,`JSON.stringify(player().task)`);
  const opp=await ev(p,`(function(){const u=player();return {x:+(2*u.x-${pt.x}).toFixed(2),y:+(2*u.y-${pt.y}).toFixed(2)};})()`);
  const s2=await scrTile(opp.x,opp.y);await p.mouse.click(s2.sx,s2.sy,{button:'right'});await sleep(300);
  const p2=await gs();await sleep(5000);const p3=await gs();
  rec('(c2) 走去撿途中另下移動指令：取消，不撿',p1.pend&&p1.pend.id===dX.id&&!p2.pend&&p3.ground.includes(dX.id)&&p3.inv===g0.inv,{p1:p1.pend,p1full:p1,p2:p2.pend,still:p3.ground.includes(dX.id),inv:[g0.inv,p3.inv],el:s2.el});
  await snap(p,'c2_cancel');
  // ── (a) 室內：比武台（dev 金手指放置），右鍵門口進入 ──
  const b=await ev(p,`(function(){let b=S.buildings.find(x=>x.type==='biwutai'&&x.built);if(!b){XW.tjt.ensure('biwutai');XW.tjt.place('biwutai');b=S.buildings.find(x=>x.type==='biwutai'&&x.built);}return {id:b.id};})()`);
  let inside=false;
  for(let tr=0;tr<3&&!inside;tr++){
    await ev(p,`(function(){const b=bById(${b.id});const s=BUILD[b.type].size||3;const q=P(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x+220/cam.zoom;cam.y=q.y;selUnits=[player().id];selBuilding=null;return 1;})()`);await sleep(400);
    const bs=await ev(p,`(function(){const b=bById(${b.id});const s=BUILD[b.type].size||3;const q=P(b.i+s/2,b.j+s/2);return {sx:(q.x-cam.x)*cam.zoom+W/2,sy:(q.y-cam.y)*cam.zoom+H/2};})()`);
    await p.mouse.click(bs.sx,bs.sy,{button:'right'});
    for(let k=0;k<50;k++){await sleep(300);if(await ev(p,'!!S.interior')){inside=true;break;}}
  }
  rec('(a) 右鍵比武台進入室內',inside,null);await sleep(1200);
  const ist=()=>ev(p,`(function(){const I=S.interior;if(!I)return {inside:false};return {inside:true,x:+I.x.toFixed(2),y:+I.y.toFixed(2),tx:I.tx==null?null:+I.tx.toFixed(2),moving:!!I.moving,sitId:I.sitId||null,medit:!!player().medit};})()`);
  const inScr=(x,y,z)=>ev(p,`(function(){const q=P(${x},${y},${z||0});return {sx:IT.ox+q.x*IT.s,sy:IT.oy+q.y*IT.s};})()`);
  const seats=await ev(p,`XW.roomSitPts(bById(S.interior.bid))`);const seat=seats.find(q=>q.id==='st1')||seats[0];
  const ss=await inScr(seat.x,seat.y,seat.kind==='throne'?18:6);
  // 戶外掉落放在「這個螢幕點用戶外鏡頭換算的世界格」上（重現 t6）
  const wt=await ev(p,`(function(){const w=screenToWorld(${ss.sx},${ss.sy});const t=unIso(w.x,w.y);return {tx:+t.x.toFixed(3),ty:+t.y.toFixed(3)};})()`);
  const dS=await putDrop(wt.tx,wt.ty);
  // 主角戶外座標也挪到這件掉落上（最壞情況：pickupNear 也會想撿）
  await ev(p,`(function(){const u=player();u.__ox=u.x;u.__oy=u.y;return 1;})()`);
  g0=await gs();n0=await ev(p,'__toasts.length');
  await p.mouse.click(ss.sx,ss.sy,{button:'right'});
  let si=null;for(let k=0;k<32;k++){await sleep(250);si=await ist();if(si.sitId===seat.id&&si.medit)break;}
  g1=await gs();
  rec('(a) 室內右鍵座位：入座，不撿重疊的戶外掉落',si.sitId===seat.id&&si.medit&&g1.ground.includes(dS.id)&&g1.inv===g0.inv,{seat:seat.id,si,wt,still:g1.ground.includes(dS.id),inv:[g0.inv,g1.inv],toasts:await ev(p,`__toasts.slice(${n0})`)});
  await snap(p,'a_indoor_seat_with_drop');
  if(si.sitId){await p.keyboard.down('KeyV');await sleep(80);await p.keyboard.up('KeyV');await sleep(600);}
  const fl=await inScr(4.5,6.5,0);
  const wt2=await ev(p,`(function(){const w=screenToWorld(${fl.sx},${fl.sy});const t=unIso(w.x,w.y);return {tx:+t.x.toFixed(3),ty:+t.y.toFixed(3)};})()`);
  const dF=await putDrop(wt2.tx,wt2.ty);g0=await gs();n0=await ev(p,'__toasts.length');
  const s0=await ist();await p.mouse.click(fl.sx,fl.sy,{button:'right'});await sleep(300);const sm=await ist();await sleep(2500);const sf=await ist();g1=await gs();
  rec('(a) 室內右鍵地板：移動到點，不撿重疊的戶外掉落',(sm.moving||sm.tx!=null)&&Math.hypot(sf.x-4.5,sf.y-6.5)<0.6&&g1.ground.includes(dF.id)&&g1.inv===g0.inv,{s0,sm,sf,still:g1.ground.includes(dF.id),inv:[g0.inv,g1.inv],toasts:await ev(p,`__toasts.slice(${n0})`)});
  await snap(p,'a_indoor_floor_with_drop');
  // 室內時主角戶外座標剛好站在掉落上：等 2 秒也不自動撿、室內也不畫戶外掉落
  const dP=await ev(p,`(function(){const u=player();const f=(XW.econ&&XW.econ.econRollEnemyGear)||window.econRollEnemyGear;let it=null;for(let k=0;k<20&&!it;k++){const a=f(3)||[];it=a[0]||null;}const rec={id:'b2p',x:u.x,y:u.y,item:it,t:S.time-5,dg:false};S.econ.groundGear.push(rec);return {id:rec.id,x:u.x,y:u.y};})()`);
  g0=await gs();await sleep(2000);g1=await gs();
  rec('(a) 室內時腳下有戶外掉落：不自動拾取',g1.ground.includes('b2p')&&g1.inv===g0.inv,{dP,inv:[g0.inv,g1.inv]});
  // 離開後（戶外）同一件會被自動撿（確認只是暫停、不是壞掉）
  try{await p.keyboard.press('Escape');}catch(e){}await sleep(1500);
  let out=await ev(p,'!S.interior');if(!out){const loc=p.locator('#inpanel [data-in="exit"]');if(await loc.count()){const bb=await loc.first().boundingBox();if(bb)await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);}await sleep(1200);out=await ev(p,'!S.interior');}
  const g2=await gs();
  rec('（附）離開室內後回到戶外，系統照常（主角位置 '+g2.px+','+g2.py+'）',out,{out,ground:g2.ground.length});
  await snap(p,'a_after_exit');
  rec('console errors 0',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f);await br.close();process.exit(f?1:0);
})();
