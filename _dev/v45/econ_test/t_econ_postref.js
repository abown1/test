// 職位變更即時刷新 實測（t1193/t1195/t1196）。Playwright＋headless Chrome；真點擊為主，fixture 會標明。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_postref_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';
const URL=process.env.XW_URL||'http://127.0.0.1:8931/index.html?dev=1';
fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1200));};
const ev=(p,code)=>p.evaluate(s=>window.__ev(s),code);
async function step(name,fn){try{await fn();}catch(e){rec(name,false,'exception: '+String(e&&e.stack||e).slice(0,500));}}
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(6000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,400)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,400));});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});
  await sleep(800);
  await p.evaluate(()=>{XW.newGame(93);if(XW.tutEnd)XW.tutEnd(true);try{XW.setHelp&&XW.setHelp(false);}catch(e){}});
  await sleep(1800);
  for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:600});await sleep(150);}catch(e){break;}}
  // fixture：主角境界 4（讓「外門門檻」= 2，雜役不會立刻被自動晉升）、三名弟子、清敵、名牌職位前綴旗標開（測試用）
  const fx=await ev(p,`(function(){try{openPause(false);}catch(e){}
    window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;}catch(e){}},400);
    const pl=player();pl.realm=4;
    S.econ.flags.postPlate=true;
    const h=S.buildings.find(b=>b.built)||null;const ds=[];for(let i=0;i<3;i++){const d=XW.spawnDisciple(h);d.realm=0;d.x=pl.x+2+i*2;d.y=pl.y+2;ds.push(d);}
    window.__d=ds[0].id;return {ids:ds.map(d=>d.id),names:ds.map(d=>d.name),posts:ds.map(d=>econPostOf(d))};})()`);
  rec('fixture',fx.ids.length===3,fx);
  const uid=fx.ids[0],uname=fx.names[0];
  const clk=async(sel)=>{const r=await p.evaluate(q=>{const e=document.querySelector(q);if(!e)return null;e.scrollIntoView({block:'nearest'});const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,w:b.width};},sel);
    if(!r||!r.w)throw new Error('no element '+sel);
    const hit=await p.evaluate(([x,y,q])=>{const t=document.elementFromPoint(x,y);const e=document.querySelector(q);return !!(t&&e&&(t===e||e.contains(t)));},[r.x,r.y,sel]);
    if(!hit)throw new Error('covered '+sel);
    await p.mouse.click(r.x,r.y);};
  let window_tgt='zhifa';
  const PN={zhanglao:'長老',zhifa:'執法',waishi:'外事',neimen:'內門',waimen:'外門',zayi:'雜役'};
  // 讀四個面板目前顯示的職位（不重載、不重畫，只讀 DOM 與本幀名牌）
  const surf=async()=>ev(p,`(function(){const u=unitById(${uid});
    const srow=[...document.querySelectorAll('#econ-sect .econ-rank-row')].find(r=>r.textContent.includes(u.name));
    const sect=srow?srow.textContent.split(' · ')[1]:null;
    const off=document.querySelector('#panel #xw_off .econ-post');
    const rr=[...document.querySelectorAll('#roster .rrow')].find(r=>{const b=r.querySelector('[data-u]');return b&&+b.getAttribute('data-u')===u.id;});
    const lb=(XW.xn&&XW.xn.lb&&XW.xn.lb.last())||[];const pl=lb.filter(x=>x[0]===u.id).map(x=>x[1]);
    const st=econRankState(false)||{};
    return {post:econPostOf(u),sect:sect,panel:off?off.textContent:null,rosterShown:rr?rr.style.display!=='none':null,flt:st.filter,plate:pl,refN:XW_ECON.postRef.n};})()`);
  const checkLeave=async(tag,post,oldPost)=>{
    await sleep(350);const s=await surf();const nm=PN[post];
    rec(tag+' 宗門事務名冊（舊職位篩選，人要移出）',s.sect===null,s);
    rec(tag+' 總表（舊職位篩選，列要隱藏）',s.rosterShown===false,{flt:s.flt,shown:s.rosterShown});
    rec(tag+' 個人面板',s.panel===nm,s.panel);rec(tag+' 頭頂名牌',s.plate.some(t=>t.indexOf(nm+'・')===0),s.plate);
    await clk('#econ-sect .econ-rank-flt [data-econ-rank="all"]');await sleep(250);
    const s2=await surf();rec(tag+' 宗門事務名冊（全部）顯示新職位',s2.sect===nm,s2.sect);return s;};
  const check=async(tag,post)=>{
    await sleep(350);// 不重載；等一幀繪製讓名牌畫出
    const s=await surf();const nm=PN[post];
    const ok={sect:s.sect===nm,panel:s.panel===nm,roster:s.rosterShown===true,plate:s.plate.some(t=>t.indexOf(nm+'・')===0)};
    rec(tag+' sect 職位分頁',ok.sect,s);rec(tag+' 個人面板',ok.panel,s.panel);rec(tag+' 總表篩選',ok.roster,{flt:s.flt,shown:s.rosterShown});rec(tag+' 頭頂名牌',ok.plate,s.plate);
    return s;};
  const setFilter=async(post)=>{// 真點：總表的職位篩選鈕（宗門事務名冊共用同一個篩選）
    await clk(`#econ-sect .econ-rank-flt [data-econ-rank="${post}"]`);await sleep(200);};
  // 打開：總表、宗門事務→職位分頁（真點）、定位選取弟子（真點總表「定位」）
  await step('open UI',async()=>{
    await p.click('#b_econsect');await sleep(400);
    await p.click('#econ-sect [data-xwsect="rank"]');await sleep(300);
    await p.locator('#b_roster:visible, #b_rosterpc:visible').first().click();await sleep(400);
    await p.click(`#roster [data-r="loc"][data-u="${uid}"]`);await sleep(400);
    // 版面 fixture：三個視窗預設會互相疊住，把總表挪到左下（等同玩家拖曳），面板與宗門事務都點得到
    await ev(p,`(function(){const r=document.getElementById('roster');r.style.left='4px';r.style.right='auto';r.style.top='500px';r.style.width='600px';r.style.maxHeight='290px';r.style.height='290px';return 1;})()`);await sleep(200);
    const s=await surf();rec('open UI',s.sect&&s.panel&&s.rosterShown!==null,s);
    await p.screenshot({path:SH+'/00_open.png'});
  });
  // A. 手動任命（宗門事務面板 → 內門）
  await step('A appoint',async()=>{
    await setFilter('zayi');await p.screenshot({path:SH+'/A1_before.png'});
    await clk(`#econ-sect [data-econ-appoint="neimen"][data-u="${uid}"]`);
    await checkLeave('A 手動任命內門','neimen','zayi');await p.screenshot({path:SH+'/A2_after.png'});
  });
  // B. 晉升（個人面板 → 執法／外事／長老 中第一個可用）
  await step('B promote',async()=>{
    const tgt=await ev(p,`(function(){for(const k of ['zhifa','waishi','zhanglao']){const b=document.querySelector('#panel #xw_off [data-econ-appoint="'+k+'"][data-u="${uid}"]');if(b&&!b.disabled)return k;}return null;})()`);
    if(!tgt){rec('B promote',false,'no enabled high post button');return;}window_tgt=tgt;
    await setFilter('neimen');await p.screenshot({path:SH+'/B1_before.png'});
    await clk(`#panel #xw_off [data-econ-appoint="${tgt}"][data-u="${uid}"]`);
    await checkLeave('B 晉升'+PN[tgt],tgt,'neimen');await p.screenshot({path:SH+'/B2_after.png'});
  });
  // C. 降職（個人面板 → 雜役）
  await step('C demote',async()=>{
    await setFilter(window_tgt);await p.screenshot({path:SH+'/C1_before.png'});
    await clk(`#panel #xw_off [data-econ-appoint="zayi"][data-u="${uid}"]`);
    await checkLeave('C 降職雜役','zayi',window_tgt);await p.screenshot({path:SH+'/C2_after.png'});
  });
  // D. 自動變更：econ_promote 的 sweep（遊戲迴圈 econRankTick）把達門檻的雜役升外門；不呼叫任何任命函式。
  //    fixture：只把弟子境界設到門檻（2）；之後完全等遊戲自己跑。
  await step('D auto',async()=>{
    await setFilter('waimen');
    const need=await ev(p,`(function(){const u=unitById(${uid});u.realm=2;u.sub=0;return {realm:u.realm,post:econPostOf(u)};})()`);
    await p.screenshot({path:SH+'/D1_before.png'});
    let s=null;const t0=Date.now();
    while(Date.now()-t0<20000){s=await surf();if(s.post==='waimen')break;await sleep(150);}
    rec('D 遊戲自動晉升發生',s&&s.post==='waimen',{fixture:need,ms:Date.now()-t0});
    await check('D 自動晉升外門','waimen');await p.screenshot({path:SH+'/D2_after.png'});
  });
  // E. 聯機客端模擬：office 欄位被同步覆寫（不經 econAppoint），econPostWatch 偵測後刷新。fixture＝直接寫欄位。
  await step('E sync',async()=>{
    await setFilter('neimen');
    await ev(p,`(function(){const u=unitById(${uid});u.office='neimen';u.econOffice='neimen';return 1;})()`);
    await sleep(300);
    await check('E 同步欄位變更（客端路徑）','neimen');await p.screenshot({path:SH+'/E_after.png'});
  });
  // F. 舊行為對照：關掉刷新包裝看 auto 路徑是否會過期（只讀）
  await step('F before-fix control',async()=>{
    const r=await ev(p,`(function(){return {wrapped:!!econAppoint._econPostRef,watch:!!XW_ECON.postRef.timer,plateFlag:XW_ECON.postPlateOn()};})()`);
    rec('F 包裝已安裝',r.wrapped&&r.watch,r);
  });
  rec('console errors 0',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f);
  await br.close();process.exit(f?1:0);
})();
