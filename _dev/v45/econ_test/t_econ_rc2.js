// rc2（室內比武台版，2026-11-10 隊長要求重寫）：右鍵比武台門口進室內 → 右鍵走到「比武司儀桌」旁 → 按 F 互動 → 點「弟子切磋」。
// 驗：切磋真的開始、連點顯示「切磋進行中」、切磋中點大比被擋、切磋打完、冷卻中點切磋顯示秒數。真點擊／真按鍵；fixture 會標明。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_rc2_indoor_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const URL=process.env.XW_URL||'http://127.0.0.1:8931/index.html?dev=1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1200));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
const snap=(p,n)=>p.screenshot({path:SH+'/'+n+'.png'});
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,null,{timeout:40000});await sleep(1200);
  await p.evaluate(()=>{XW.newGame(81);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}});await sleep(2500);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:700});await sleep(200);}catch(e){break;}}
  // fixture：吐司紀錄、清敵、主角境界 6、dev 放比武台、3 名弟子
  const setup=await ev(p,`(function(){try{openPause(false);}catch(e){}
    window.__toasts=[];const _t=toast;toast=function(m){try{__toasts.push(String(m));}catch(e){}return _t.apply(this,arguments);};
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);
    try{XW.setRealm(player(),6,0);}catch(e){}
    let b=S.buildings.find(x=>x.type==='biwutai'&&x.built);if(!b){XW.tjt.ensure('biwutai');XW.tjt.place('biwutai');b=S.buildings.find(x=>x.type==='biwutai'&&x.built);}
    const h=S.buildings.find(x=>x.built&&x.type!=='biwutai')||null;const ds=[];for(let i=0;i<3;i++){const d=XW.spawnDisciple(h);if(d){d.hp=d.maxhp;ds.push(d.id);}}
    return {bid:b&&b.id,ds,ws:xwWsOf(b)};})()`);
  rec('fixture：比武台＋3 名弟子',!!(setup.bid&&setup.ds.length===3&&setup.ws),setup);
  await sleep(3000);for(let i=0;i<3;i++){try{await p.getByText('知道了').first().click({timeout:400});}catch(e){break;}}
  const st=()=>ev(p,`(function(){const s=econBiwuState();const sp=s&&s.spar||{},bb=s&&s.bibi||{};const I=S.interior;
    const pairs=(typeof tjtBiwuPairs==='function')?tjtBiwuPairs():[];const ids=[];pairs.forEach(q=>{if(q.a!=null)ids.push(q.a);if(q.b!=null)ids.push(q.b);});
    return {t:+S.time.toFixed(2),inside:!!I,ix:I?+I.x.toFixed(2):null,iy:I?+I.y.toFixed(2):null,phase:sp.phase||null,a:sp.a,b:sp.b,winner:sp.winner,cdUntil:sp.cdUntil||0,bibiOn:!!bb.on,pairs,dup:ids.filter((id,i)=>ids.indexOf(id)!==i),
      hint:(document.getElementById('xwUseHint')||{}).style?document.getElementById('xwUseHint').style.display:null,ws:!!(document.getElementById('xwWsPanel')&&!document.getElementById('xwWsPanel').hidden)};})()`);
  const tn=()=>ev(p,'__toasts.length');const ts=n=>ev(p,`__toasts.slice(${n})`);
  const clickSel=async(sel)=>{for(let k=0;k<12;k++){const loc=p.locator(sel);if(await loc.count()){const bb=await loc.first().boundingBox().catch(()=>null);if(bb){await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);return true;}}await sleep(250);}return false;};
  const inScr=(x,y,z)=>ev(p,`(function(){const q=P(${x},${y},${z||0});return {sx:IT.ox+q.x*IT.s,sy:IT.oy+q.y*IT.s};})()`);
  // 1) 右鍵比武台門口進入
  const enter=async()=>{for(let tr=0;tr<3;tr++){
      await ev(p,`(function(){const b=bById(${setup.bid});const s=BUILD[b.type].size||3;const q=P(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x+220/cam.zoom;cam.y=q.y;selUnits=[player().id];selBuilding=null;return 1;})()`);await sleep(400);
      const d=await ev(p,`(function(){const b=bById(${setup.bid});const s=BUILD[b.type].size||3;const q=P(b.i+s/2,b.j+s,0);const c=P(b.i+s/2,b.j+s/2);return {door:{sx:(q.x-cam.x)*cam.zoom+W/2,sy:(q.y-cam.y)*cam.zoom+H/2-6},mid:{sx:(c.x-cam.x)*cam.zoom+W/2,sy:(c.y-cam.y)*cam.zoom+H/2}};})()`);
      await p.mouse.click(d.door.sx,d.door.sy,{button:'right'});
      for(let k=0;k<40;k++){await sleep(300);if(await ev(p,'!!S.interior'))return 'door';}
      await p.mouse.click(d.mid.sx,d.mid.sy,{button:'right'});
      for(let k=0;k<40;k++){await sleep(300);if(await ev(p,'!!S.interior'))return 'body';}}
    return null;};
  const how=await enter();await sleep(1200);
  rec('1 右鍵比武台（門口）進入室內',!!how,{how});await snap(p,'1_inside');
  // 2) 右鍵地板走到司儀桌旁（桌子在 (2.0,4.5)，站在桌子東側 0.9 格）
  const ws=setup.ws;const tgt={x:ws.x+0.9,y:ws.y};const fl=await inScr(tgt.x,tgt.y,0);
  await p.mouse.click(fl.sx,fl.sy,{button:'right'});
  let s=null;for(let k=0;k<30;k++){await sleep(250);s=await st();if(s.ix!=null&&Math.hypot(s.ix-ws.x,s.iy-ws.y)<=ws.r&&!s.ws)break;}
  rec('2 右鍵走到司儀桌旁（距離 ≤'+ws.r+'），出現「F 互動」',s&&Math.hypot(s.ix-ws.x,s.iy-ws.y)<=ws.r&&s.hint==='block',{pos:[s.ix,s.iy],ws:[ws.x,ws.y],hint:s.hint,wsPanel:s.ws});
  await snap(p,'2_at_workbench');
  // 3) 按 F
  if(!s.ws){await p.keyboard.press('KeyF');await sleep(700);}
  s=await st();const btns=await ev(p,`[...document.querySelectorAll('#xwWsPanel [data-use]')].map(b=>b.getAttribute('data-use')+':'+b.textContent)`);
  rec('3 按 F 開「比武司儀桌」面板（弟子切磋／宗門大比／比武介面）',s.ws&&btns.some(x=>/^econ-spar/.test(x)),{btns});
  await snap(p,'3_F_panel');
  // 4) 點「弟子切磋」
  let n0=await tn();await clickSel('#xwWsPanel [data-use="econ-spar"]');await sleep(800);
  const t4=await ts(n0);let s4=await st();
  for(let k=0;k<10&&!(s4.phase==='walk'||s4.phase==='fight');k++){await sleep(500);s4=await st();}
  rec('4 點「弟子切磋」後切磋開始（phase walk/fight）',s4.phase==='walk'||s4.phase==='fight',{phase:s4.phase,a:s4.a,b:s4.b,toasts:t4,inside:s4.inside});
  await snap(p,'4_after_spar_click');
  const started=s4.phase==='walk'||s4.phase==='fight';
  if(started){
    // 5) 再點一次切磋 → 「切磋進行中」
    if(!(await st()).ws){await p.keyboard.press('KeyF');await sleep(600);}
    n0=await tn();await clickSel('#xwWsPanel [data-use="econ-spar"]');await sleep(600);const t5=await ts(n0);
    rec('5 切磋中再點切磋：提示「切磋進行中」、沒有英文 busy',t5.some(t=>/切磋進行中/.test(t))&&!t5.some(t=>/busy/i.test(t)),{toasts:t5});
    // 6) 切磋中點大比 → 被擋
    if(!(await st()).ws){await p.keyboard.press('KeyF');await sleep(600);}
    n0=await tn();await clickSel('#xwWsPanel [data-use="econ-bibi"]');await sleep(800);const t6=await ts(n0);const s6=await st();
    rec('6 切磋中點大比：被擋並提示，無人同時兩場',!s6.bibiOn&&s6.dup.length===0&&t6.some(t=>/切磋進行中/.test(t)),{toasts:t6,bibiOn:s6.bibiOn,dup:s6.dup,phase:s6.phase});
    await snap(p,'6_bibi_blocked');
    try{await clickSel('#xwWsPanel [data-xwws="close"]');}catch(e){}
    // 7) 打完
    const tl=[];for(let k=0;k<120;k++){await sleep(500);const x=await st();tl.push(x);if(x.phase==='done'||x.phase==='cd'||(x.phase==null&&k>4))break;}
    const last=tl.at(-1);
    rec('7 室內切磋打完、有勝者',(last.phase==='done'||last.phase==='cd')&&last.winner!=null,{last:{t:last.t,phase:last.phase,winner:last.winner,cdUntil:last.cdUntil},n:tl.length});
    await snap(p,'7_spar_done');
    // 8) 冷卻中點切磋 → 「切磋冷卻中，還要 N 秒」
    if(!(await st()).ws){await p.keyboard.press('KeyF');await sleep(600);}
    const c0=await st();n0=await tn();await clickSel('#xwWsPanel [data-use="econ-spar"]');await sleep(600);const t8=await ts(n0);
    const m=t8.map(t=>/切磋冷卻中，還要 (\d+) 秒/.exec(t)).find(Boolean);
    rec('8 冷卻中點切磋：「切磋冷卻中，還要 N 秒」（N 合理），不是「至少需要兩名弟子」',c0.cdUntil>c0.t&&!!m&&Math.abs(+m[1]-Math.ceil(c0.cdUntil-c0.t))<=2&&!t8.some(t=>t==='至少需要兩名弟子'),{toasts:t8,left:+(c0.cdUntil-c0.t).toFixed(1)});
    await snap(p,'8_cooldown');
  }else{
    // 開不起來：記錄重現細節（不修，回報給隊長）
    const diag=await ev(p,`(function(){const b=bById(${setup.bid});const ds=S.units.filter(u=>u.kind==='disciple'&&!u.dead).map(u=>({id:u.id,n:u.name,hp:Math.round(u.hp),mhp:u.maxhp,inside:u.inside||null,inB:u.inB||null,job:u.job||null,task:u.task&&u.task.type,sparT:u._sparT||0,y47e:!!u.y47e,x:+u.x.toFixed(1),y:+u.y.toFixed(1)}));
      return {b:{id:b.id,type:b.type,built:b.built,broken:!!b.broken,i:b.i,j:b.j},spar:econBiwuState().spar||null,ds,toasts:__toasts.slice(-15),fnUse:typeof xwDoBldUse,econSpar:typeof econBiwuSpar};})()`);
    fs.writeFileSync(LOG+'/spar_not_started_diag.json',JSON.stringify(diag,null,1));
    rec('（診斷）切磋未開始：已寫 logs/spar_not_started_diag.json',false,diag);
  }
  rec('console errors 0',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f);await br.close();process.exit(f?1:0);
})();
