// t1192 弟子主動到任務堂接宗門事務：真機遊玩數分鐘，不呼叫任何接取函式，只觀察。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_taskhall_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
const URL=process.env.XW_URL||'http://127.0.0.1:8931/index.html?dev=1&taskhall=1';
const PLAY_MS=+(process.env.PLAY_MS||300000);
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1500));};
const ev=(p,code)=>p.evaluate(s=>window.__ev(s),code);
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,400)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,400));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(800);
  await p.evaluate(()=>{XW.newGame(95);if(XW.tutEnd)XW.tutEnd(true);});await sleep(1800);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});}catch(e){break;}}
  // fixture（不觸發接取）：dev 金手指放一座完工任務堂；6 名弟子（境界 5，夠接各階事務）；
  //   排除組：A 指派職務（修煉）、B 帶傷、C 突破中；其餘 3 名空閒。清敵避免山賊打斷。
  const fx=await ev(p,`(function(){try{openPause(false);}catch(e){}
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},500);
    const b=xwGfPlaceBuilt('renwutang');const pl=player();
    const h=S.buildings.find(x=>x.built&&x.type!=='renwutang')||null;const ds=[];
    for(let i=0;i<6;i++){const d=XW.spawnDisciple(h);d.realm=5;d.sub=0;d.hp=d.maxhp=Math.max(d.maxhp,300);d.job=null;d.task=null;ds.push(d);}
    const ex={job:ds[0].id,inj:ds[1].id,brk:ds[2].id};
    try{assignJob(ds[0],'guard');}catch(e){}if(!ds[0].job)ds[0].job='guard';
    // 空閒弟子放離任務堂門口 10～14 格，好觀察真的走過去
    const s0=(BUILD.renwutang.size||3);ds.slice(3).forEach((d,i)=>{const f=nearestFree(b.i+s0/2+10+i*2,b.j+s0+6,unitComp(d));if(f){d.x=f.i+0.5;d.y=f.j+0.5;d.path=[];}});
    ds[1].inj={k:'light',t:9999};
    ds[2].cultBrk={to:6,from:5,t0:S.time,wall:Date.now(),dur:9999,prog:0,stage:0,lock:1,paid:1};
    return {bid:b.id,door:XW_ECON.taskHallAiOn(),gate:XW_ECON.taskGateOpen(),ex,ids:ds.map(d=>d.id),names:ds.map(d=>d.name),job0:ds[0].job,dist0:ds.slice(3).map(d=>Math.round(dist(d.x,d.y,b.i+s0/2,b.j+s0+0.9))),t:S.time,first:S.flags.y47ev&&S.flags.y47ev.next};})()`);
  rec('fixture：完工任務堂＋6 弟子（3 空閒、3 排除）',fx.gate===true&&fx.door===true,fx);
  const nameOf=id=>fx.names[fx.ids.indexOf(id)];
  // 真點任務堂，面板保持開著觀察
  const clickBuilding=async(bid)=>{
    await ev(p,`(function(){const b=bById(${bid});const s=(BUILD[b.type]&&BUILD[b.type].size)||3;const q=P(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x;cam.y=q.y;selBuilding=null;selUnits=[];return 1;})()`);
    await sleep(400);
    const s=await ev(p,`(function(){const b=bById(${bid});const s=(BUILD[b.type]&&BUILD[b.type].size)||3;const q=P(b.i+s/2,b.j+s/2);return {sx:(q.x-cam.x)*cam.zoom+W/2,sy:(q.y-cam.y)*cam.zoom+H/2};})()`);
    for(const dy of [0,-12,12,-24,24]){await p.mouse.click(s.sx,s.sy+dy);await sleep(350);if(await ev(p,`selBuilding===${bid}`))return true;}
    return false;};
  rec('真點任務堂開面板',await clickBuilding(fx.bid),null);
  await p.screenshot({path:SH+'/00_start.png'});
  const t0=Date.now();const samples=[];let shotN=0;const seenNear={};const shotTake={};
  while(Date.now()-t0<PLAY_MS){
    await sleep(3000);
    const s=await ev(p,`(function(){const b=bById(${fx.bid});const s=(BUILD.renwutang.size||3);const dx=b.i+s/2,dy=b.j+s+0.9;
      const E=S.flags.y47ev||{act:[]};
      const us=${JSON.stringify(fx.ids)}.map(id=>unitById(id)).filter(Boolean).map(u=>({id:u.id,n:u.name,k:u.y47e?u.y47e.k:null,hall:u.y47e?u.y47e.hall:null,d:Math.round(dist(u.x,u.y,dx,dy)*10)/10,job:u.job||null}));
      const pn=document.querySelector('#panel #y47evp');
      return {t:Math.round(S.time),takes:(S.flags.econTaskTakes||[]).slice(),act:E.act.map(a=>({k:a.k,eid:a.eid,st:a.st,mem:a.mem.slice()})),us,panel:pn?pn.innerText.slice(0,800):null,sel:selBuilding};})()`);
    samples.push(s);
    for(const u of s.us)if(u.k!=null&&u.hall!=null&&u.d<2.5&&!seenNear[u.id]){seenNear[u.id]={t:s.t,d:u.d};}
    // 每件新接取截一張（走到任務堂附近時）
    for(const tk of s.takes){const key=tk.k+':'+tk.uid;if(shotTake[key])continue;const u=s.us.find(x=>x.id===tk.uid);if(u&&u.d<3){shotTake[key]=1;
        await ev(p,`(function(){const b=bById(${fx.bid});const q=P(b.i+1.5,b.j+3);cam.follow=false;cam.x=q.x;cam.y=q.y;return 1;})()`);
        if(s.sel!==fx.bid)await clickBuilding(fx.bid);
        await sleep(300);await p.screenshot({path:SH+'/take_'+(++shotN)+'_'+tk.uid+'_t'+s.t+'.png'});}}
    if(s.sel!==fx.bid&&samples.length%5===0)await clickBuilding(fx.bid);
  }
  const last=samples[samples.length-1];
  await clickBuilding(fx.bid);await sleep(400);await p.screenshot({path:SH+'/99_end_panel.png'});
  const panelTxt=await ev(p,`(function(){const pn=document.querySelector('#panel #y47evp');return pn?pn.innerText:'';})()`);
  const takes=last.takes;
  const exIds=[fx.ex.job,fx.ex.inj,fx.ex.brk];
  rec(`遊玩 ${Math.round(PLAY_MS/1000)} 秒（遊戲時間 ${last.t}s）期間弟子自己接了事務`,takes.length>0,takes.map(t=>({t:t.t,who:t.name,ev:t.ev})));
  rec('排除組（指派職務／帶傷／突破中）從未接取',takes.every(t=>exIds.indexOf(t.uid)<0),{ex:exIds.map(nameOf),takers:[...new Set(takes.map(t=>t.name))]});
  rec('接取者真的走到任務堂門口（<2.5 格）',takes.length>0&&takes.every(t=>seenNear[t.uid]),seenNear);
  const names=[...new Set(takes.map(t=>t.name))];
  const shownNames=names.filter(n=>samples.some(s=>s.panel&&s.panel.indexOf(n)>=0));
  rec('任務堂面板列出誰接了哪件（成員名或紀錄）',names.length>0&&shownNames.length===names.length,{names,shownNames});
  rec('console errors 0',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/samples.json',JSON.stringify({fx,samples},null,1));
  fs.writeFileSync(LOG+'/end_panel.txt',panelTxt);
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f);
  await br.close();process.exit(f?1:0);
})();
