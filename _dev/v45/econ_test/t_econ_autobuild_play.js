// econ_autobuild＋econ_succession：真實 headless Chrome 遊玩測試（/tmp build）。
// 冷啟動標題 → 點「新遊戲」→ 遊戲迴圈實際跑（真時間）→ 長老在場、弟子滿額 60 秒後弟子自行動工（不跳提示）→
// 滑鼠點工地開面板 → 完工後冷卻 → 存檔、重新整理、點「繼續遊戲」讀檔 → 不重複動工 → 長老離任暫停 →
// 長老壽元 <10% 自動交接（輪詢）＋修煉 zuohua 走 cultHooks.onLifeEnd → ?autobuild=0&succession=0 另一分頁不動作。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/econ_autobuild_20261111';
const SH=OUT+'/shots',LOG=OUT+'/logs';fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const BASE=process.env.XW_URL||'http://127.0.0.1:8997/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,700));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,600)};}},c);
const errs=[];
async function page(br,url,tag){
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const p=await ctx.newPage();p.setDefaultTimeout(10000);
  p.on('pageerror',e=>errs.push(tag+' pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push(tag+' console: '+m.text().slice(0,300));});
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(1500);
  return p;
}
async function nameOk(p){try{await p.getByRole('button',{name:'確定'}).first().click({timeout:3000});await sleep(500);}catch(e){}}
async function dismiss(p){for(let i=0;i<5;i++){try{await p.getByText('知道了').first().click({timeout:500});await sleep(150);}catch(e){break;}}}
const FIXTURE=`(function(){
  try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}
  window.__toastSeen=[];
  const box=document.getElementById('toasts');
  if(box&&!window.__mo){window.__mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)__toastSeen.push({t:Math.round(S.time),m:String(n.textContent||'')});});window.__mo.observe(box,{childList:true});}
  window.__ecl=setInterval(function(){try{S.enemies.length=0;if(S.raidsActive)S.raidsActive.length=0;}catch(e){}},300);
  XW.tjt.place('hall');XW.tjt.place('house');
  const h=S.buildings.find(b=>b.type==='hall');
  for(let k=0;k<8;k++)spawnDisciple(h);
  Object.assign(S.res,{wood:400,stone:400,fiber:200,food:300});
  econGrant('vault',300,'test-fixture','xia');
  const ds=disciples();const el=ds[0];el.realm=2;
  const r=econAppoint(el,'zhanglao');
  return {elder:el.id,appoint:r,pop:[popUsed(),popCap()],tre:XW_ECON.autobuild.treasury(),abOn:econAutobuildOn(),sOn:econSuccessionOn(),
    inFlags:Object.prototype.hasOwnProperty.call(S.econ.flags,'autobuild')||Object.prototype.hasOwnProperty.call(S.econ.flags,'succession'),
    paused:typeof paused!=='undefined'?paused:null,
    inDef:('autobuild' in ECON_FLAGS_DEFAULT)||('succession' in ECON_FLAGS_DEFAULT),hooks:cultHooks.onLifeEnd.indexOf(econSuccOnLifeEnd)>=0&&cultHooks.onLifeLow.indexOf(econSuccOnLifeLow)>=0};
})()`;
const STATE=`(function(){const st=S.econ.autobuild||null;return {time:Math.round(S.time),st:st?JSON.parse(JSON.stringify({clock:st.clock,cur:st.cur,cdUntil:st.cdUntil,paused:st.paused,need:st.need,log:st.log})):null,
  b:S.buildings.map(b=>({id:b.id,type:b.type,built:b.built,lv:b.lv||1,upg:!!b.upg})),res:{wood:S.res.wood,stone:S.res.stone,fiber:S.res.fiber},tre:XW_ECON.autobuild.treasury(),pop:[popUsed(),popCap()],
  toasts:(window.__toastSeen||[]).slice(-40)};})()`;
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  // 旗標關分頁（同時跑）
  const offFlow=(async()=>{
    const q=await page(br,BASE+'?autobuild=0&succession=0','OFF');
    await q.click('#t_new');await sleep(1200);await nameOk(q);await dismiss(q);
    const f=await ev(q,FIXTURE);await sleep(800);try{await q.getByRole('button',{name:'稍後再做'}).first().click({timeout:3000});}catch(e){}
    await ev(q,`(function(){const el=disciples().find(u=>econPostOf(u)==='zhanglao');XW_LIFE.ensure(el);el.birthWorldYear=XW_LIFE.worldYear()-Math.floor(el.lifeMax*0.95);return XW_LIFE.remaining(el)/el.lifeMax;})()`);
    await sleep(70000);
    const s=await ev(q,STATE);
    const post=await ev(q,`disciples().filter(u=>econPostOf(u)==='zhanglao').map(u=>u.id)`);
    rec('OFF ?autobuild=0&succession=0：70 秒後沒有自動動工、長老壽元將盡也不交接',f.abOn===false&&f.sOn===false&&s.b.length===2&&!s.st&&post.length===1&&post[0]===f.elder,{f,b:s.b,post});
    await q.screenshot({path:SH+'/09_flags_off_no_action.png'});
    await q.context().close();
  })();
  const p=await page(br,BASE,'ON');
  await p.screenshot({path:SH+'/00_title_cold_start.png'});
  await p.click('#t_new');await sleep(1200);
  await p.screenshot({path:SH+'/00b_name_dialog.png'});await nameOk(p);await dismiss(p);
  await p.screenshot({path:SH+'/01_new_game.png'});
  const f=await ev(p,FIXTURE);await sleep(800);
  try{await p.getByRole('button',{name:'稍後再做'}).first().click({timeout:3000});await sleep(300);}catch(e){} // 大殿落成後的「開立宗門」對話框
  await p.screenshot({path:SH+'/01b_fixture_sect.png'});await ev(p,`(window.__toastSeen=[],1)`);
  rec('P1 預設開（autobuild／succession），不寫進 flags 表、不在 ECON_FLAGS_DEFAULT，hook 已掛上',f&&f.abOn===true&&f.sOn===true&&f.inFlags===false&&f.inDef===false&&f.hooks===true,f);
  await sleep(30000);
  let s=await ev(p,STATE);
  rec('P2 弟子滿額、長老在場，30 秒時尚未動工（需求要持續 60 秒）',s.st&&!s.st.cur&&s.b.length===2&&s.st.need&&s.st.need.pop!=null,{t:s.time,need:s.st&&s.st.need,b:s.b});
  let t0=Date.now();let started=null;
  while(Date.now()-t0<45000){await sleep(1000);s=await ev(p,STATE);if(s.st&&s.st.cur){started=s;break;}}
  const startLog=started&&started.st.log.filter(e=>e.ev==='start');
  rec('P3 需求滿 60 秒後長老派弟子動工（只 1 件）',!!started&&startLog.length===1&&startLog[0].clock>=60&&startLog[0].elder===f.elder,started&&{log:startLog,b:started.b});
  const leak=(s.toasts||[]).filter(x=>/住房|大殿|升級|建造|施工|動工|落成/.test(x.m)&&!/目標/.test(x.m));
  rec('P4 不通知宗主：畫面提示列沒有出現建造／升級訊息',leak.length===0,{leak,all:(s.toasts||[]).map(x=>x.m).slice(-12)});
  await p.screenshot({path:SH+'/02_autobuild_started.png'});
  // 滑鼠點工地開面板
  const cur=started&&started.st.cur;
  if(cur){
    const cm=await ev(p,`(function(){const b=S.buildings.find(x=>x.id===${cur?cur.bid:0});const s=BUILD[b.type].size;const q=iso(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x;cam.y=q.y;selUnits.length=0;const r=cv.getBoundingClientRect();return {x:r.left+W/2,y:r.top+H/2};})()`);
    await sleep(400);
    let hit=null;
    const offs=[];for(let dy=-40;dy<=30;dy+=10)for(let dx=-30;dx<=30;dx+=10)offs.push([dx,dy]);
    offs.sort((a,b)=>Math.hypot(a[0],a[1])-Math.hypot(b[0],b[1]));
    for(const [dx,dy] of offs){
      await p.mouse.click(cm.x+dx,cm.y+dy);await sleep(150);
      hit=await ev(p,`(typeof selBuilding!=='undefined'?selBuilding:null)`);
      if(hit===cur.bid)break;
    }
    const pan=await ev(p,`(document.getElementById('panel')||{}).innerText||''`);
    rec('P5 滑鼠點工地：面板開啟且是自動工程那座',hit===cur.bid&&pan.length>0,{hit,bid:cur.bid,pan:String(pan).slice(0,240)});
    await p.screenshot({path:SH+'/03_site_panel_by_click.png'});
    await ev(p,`(function(){selBuilding=null;panelKeyCache=null;cam.follow=true;return 1;})()`); // 關面板（不按 Esc：Esc 會開暫停選單）
    const pz=await ev(p,`(typeof paused!=='undefined'?paused:null)`);if(pz){await p.keyboard.press('Escape');await sleep(300);}
  }
  // 等完工
  t0=Date.now();let done=null;
  while(Date.now()-t0<150000){await sleep(1500);s=await ev(p,STATE);if(s.st&&!s.st.cur&&s.st.log.some(e=>e.ev==='done')){done=s;break;}}
  if(!done)console.log('P6 diag',JSON.stringify(await ev(p,`(function(){const c=S.econ.autobuild.cur;const b=c&&S.buildings.find(x=>x.id===c.bid);return {c,b:b&&{built:b.built,progress:b.progress,upg:b.upg,i:b.i,j:b.j},reach:b&&econABReach(b.type,b.i,b.j),ws:S.units.filter(u=>u.kind!=='x').map(u=>u.id+':'+u.kind+':'+(u.task?u.task.type+u.task.bid:'-')+':'+(u.job||'')+':'+Math.round(u.x)+','+Math.round(u.y)+':p'+(u.path?u.path.length:'-')+(u.dead?':dead':''))};})()`)));
  rec('P6 弟子施工完成 → 清除進行中、冷卻＝完工＋300 秒',!!done&&Math.abs(done.st.cdUntil-done.st.log.find(e=>e.ev==='done').clock-300)<=0.051,done&&{cd:done.st.cdUntil,clock:done.st.clock,b:done.b,log:done.st.log.slice(-2)});
  await p.screenshot({path:SH+'/04_autobuild_done.png'});
  // 存檔 → 重新整理 → 點繼續遊戲
  const before=await ev(p,STATE);
  await p.keyboard.press('F5');await sleep(2000); // 快速存檔（真按鍵）
  const meta=await p.evaluate(async()=>{const t=document.getElementById('toasts');return t?t.innerText.slice(-80):'';});
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(2000);
  await p.screenshot({path:SH+'/05_title_after_reload.png'});
  await p.click('#t_cont');await sleep(2500);await dismiss(p);
  const pz0=await ev(p,`({paused:typeof paused!=='undefined'?paused:null,t:S.time})`);console.log('after load',JSON.stringify(pz0));
  await ev(p,`(function(){window.__toastSeen=[];window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);return 1;})()`);
  const after=await ev(p,STATE);
  rec('P7 讀檔後自動建造狀態保留（冷卻、紀錄），建築數一致',after.st&&after.st.cdUntil===before.st.cdUntil&&after.st.log.length===before.st.log.length&&after.b.length===before.b.length,{meta,before:{cd:before.st.cdUntil,n:before.b.length,clock:before.st.clock},after:{cd:after.st&&after.st.cdUntil,n:after.b.length,clock:after.st&&after.st.clock}});
  await sleep(15000);
  const after2=await ev(p,STATE);
  rec('P8 讀檔後 15 秒：冷卻中不再動工、不重複扣資源',after2.st.log.filter(e=>e.ev==='start').length===1&&!after2.st.cur&&after2.b.length===before.b.length,{starts:after2.st.log.filter(e=>e.ev==='start').length,clock:after2.st.clock});
  await p.screenshot({path:SH+'/06_after_reload_cooldown.png'});
  // 長老離任 → 暫停
  const pz=await ev(p,`(function(){const el=disciples().find(u=>econPostOf(u)==='zhanglao');econAppoint(el,'neimen');return {id:el.id};})()`);
  await sleep(1500);const s1=await ev(p,STATE),c1=s1.st;await sleep(5000);const s2=await ev(p,STATE),c2=s2.st;
  rec('P9 沒有長老：暫停（遊戲時間照走，自動建造時鐘不走）',c1.paused===1&&c2.paused===1&&c1.clock===c2.clock&&s2.time>s1.time+3,{c1:c1.clock,c2:c2.clock,paused:c2.paused,gameT:[s1.time,s2.time]});
  // 交接：壽元 <10%（輪詢，修煉 hooksOn 目前為 false）
  const sc=await ev(p,`(function(){
    const ds=disciples();const old=ds.find(u=>u.id===${pz.id})||ds[0];econAppoint(old,'zhanglao');
    const others=ds.filter(u=>u!==old);others.forEach((u,i)=>{u.realm=1;});const best=others[3];best.realm=3;
    XW_LIFE.ensure(old);old.birthWorldYear=XW_LIFE.worldYear()-Math.ceil(old.lifeMax*0.95);
    return {old:old.id,best:best.id,frac:XW_LIFE.remaining(old)/old.lifeMax,hooksOn:CULT_LIFE_CFG.hooksOn};})()`);
  await sleep(2500);
  const sr=await ev(p,`(function(){return {oldPost:econPostOf(S.units.find(u=>u.id===${sc.old})),newElder:disciples().filter(u=>econPostOf(u)==='zhanglao').map(u=>u.id),log:S.econ.succLog};})()`);
  rec('P10 長老壽元 <10%：境界最高者接任長老、原任降內門（輪詢）',sr.oldPost==='neimen'&&sr.newElder.length===1&&sr.newElder[0]===sc.best,{sc,sr});
  await p.keyboard.press('o');await sleep(900);
  await p.screenshot({path:SH+'/07_succession_sect_panel.png'});
  const pnl=await ev(p,`(function(){const e=document.getElementById('econ-sect');return e?e.innerText.slice(0,500):'';})()`);
  await p.keyboard.press('Escape');await sleep(300);
  // 修煉真的 zuohua：hooksOn 暫時打開，走 cultHooks.onLifeEnd
  const zz=await ev(p,`(function(){
    const cur=disciples().find(u=>econPostOf(u)==='zhanglao');
    const pool=disciples().filter(u=>u!==cur&&econPostOf(u)!=='zhanglao'&&(XW_LIFE.remaining(u)/u.lifeMax)>=0.1);
    pool.forEach(u=>u.realm=1);const nx=pool[0];nx.realm=4;
    const keep=CULT_LIFE_CFG.hooksOn;CULT_LIFE_CFG.hooksOn=true;
    let r;try{r=XW_LIFE.zuohua(cur);}finally{CULT_LIFE_CFG.hooksOn=keep;}
    return {dead:cur.id,next:nx.id,r,elders:disciples().filter(u=>econPostOf(u)==='zhanglao').map(u=>u.id),gone:!S.units.includes(cur),last:S.econ.succLog.slice(-1)[0]};})()`);
  rec('P11 修煉 zuohua（壽終）→ cultHooks.onLifeEnd → 自動交接',zz.gone&&zz.elders.length===1&&zz.elders[0]===zz.next&&zz.last&&zz.last.why==='end',zz);
  rec('P12 宗門事務面板開啟（O 鍵）',pnl.length>0,{pnl:pnl.slice(0,200)});
  await p.screenshot({path:SH+'/08_after_zuohua.png'});
  await offFlow;
  rec('P13 console／pageerror 數量',errs.length===0,errs);
  fs.writeFileSync(LOG+'/play_result.json',JSON.stringify({rows,errs},null,1));
  const pass=rows.filter(r=>r.ok).length;console.log(`TOTAL ${pass}/${rows.length} CONSOLE ${errs.length}`);
  await br.close();process.exitCode=pass===rows.length?0:1;
})().catch(e=>{console.error('FATAL',e);process.exitCode=2;});
