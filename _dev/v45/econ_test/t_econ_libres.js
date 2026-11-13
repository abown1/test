// 長書閣駐閣研究（econ_libres.js）實測：Playwright＋headless Chrome，全新設定檔，真右鍵進閣、真點面板「駐閣」、真點「研究武學秘籍」、F5／F9 真存讀。
// fixture（明列）：dev 放長書閣並設 Lv3、資源與庫房給足、生 3 名弟子（1 名高悟性、1 名帶傷、1 名一般）、清敵；
//   第 9 次完成後把庫房抽到 10 下品靈石，製造「庫房不足」；之後再補 500。最後把駐閣弟子設成帶傷，驗自動撤駐。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_demo/bug_shots/econ_libres_20261110';
const SH=OUT+'/shots',LOG=OUT+'/logs';fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const BASE=process.env.XW_BASE||'http://127.0.0.1:8931/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,1000));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,500)};}},c);
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  const snap=n=>p.screenshot({path:SH+'/'+n+'.png'});
  const boot=async(q)=>{await p.goto(BASE+q,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.XW&&XW.newGame&&window.__ev,null,{timeout:40000});await sleep(1200);};
  const okAll=async()=>{for(let i=0;i<4;i++){try{await p.getByText('知道了').first().click({timeout:500});await sleep(150);}catch(e){break;}}};
  const hookToasts=`(function(){if(!window.__toasts){window.__toasts=[];const _t=toast;toast=function(m){try{__toasts.push([+S.time.toFixed(1),String(m)]);}catch(e){}return _t.apply(this,arguments);};}
    if(!window.__ecl)window.__ecl=setInterval(function(){try{if(S&&S.enemies)S.enemies.length=0;if(S&&S.raidsActive)S.raidsActive.length=0;}catch(e){}},400);return 1;})()`;
  const st=()=>ev(p,`(function(){const s=XW_ECON.libresStatus();const b=bById(s.bid);const u=s.uid!=null?unitById(s.uid):null;const w=u?econWallet(u.id,false):null;
    return Object.assign(s,{t:+S.time.toFixed(1),miji:S.items.miji,rec:Object.keys(S.recipes||{}).length,uJob:u&&u.job,uIn:!!(u&&u.inside&&u.inB===s.bid),wallet:w?econBagXia(w):0,
      last:S.econ.libres&&S.econ.libres.last,fl:(S.econ.ledgers||[]).filter(r=>/libres-fee/.test(r.note||'')).map(r=>[r.kind,r.actorId,r.xia])});})()`);
  const waitN=async(target,maxS,tag)=>{let s;const t0=Date.now();while(Date.now()-t0<maxS*1000){s=await st();if(s.n>=target)return s;await sleep(1000);}return s;};
  // ── 1. 開局（網址無 libres 參數 → 預設開）──
  await boot('?dev=1');await p.evaluate(()=>{XW.newGame(81);if(XW.tutEnd)XW.tutEnd(true);});await sleep(2500);await okAll();
  await ev(p,hookToasts);
  const fx=await ev(p,`(function(){try{openPause(false);}catch(e){}
    XW.tjt.place('library');const b=S.buildings.find(x=>x.type==='library'&&x.built);b.lv=3;
    Object.assign(S.res,{wood:3000,fiber:2000,herb:800,stone:500});econGrant('vault',5000,'test-fixture','xia');
    const h=S.buildings.find(x=>x.built&&x.type!=='library')||null;
    const a=XW.spawnDisciple(h),c=XW.spawnDisciple(h),d=XW.spawnDisciple(h);
    for(const u of [a,c,d]){u.hp=u.maxhp;}
    a.wu=100;a.realm=3;a.name='駐閣甲';c.inj={k:'arm',t:999};c.name='帶傷乙';d.wu=40;d.realm=2;d.name='一般丙';
    return {bid:b.id,lv:b.lv,a:a.id,c:c.id,d:d.id,mulA:econLibresMul(a),mulD:econLibresMul(d),on:econLibresOn(),vault:econLibresVaultXia(),door:doorPt(b)};})()`);
  rec('1 旗標 libRes 預設開（網址無參數）',fx.on===true,{on:fx.on});
  rec('fixture：長書閣 Lv3＋3 弟子＋資源／庫房',!!(fx.bid&&fx.a&&fx.c&&fx.d)&&fx.vault>=5000,fx);
  rec('能力倍率公式：悟性100/境界3 → 1.32；悟性40/境界2 → 1.04',fx.mulA===1.32&&fx.mulD===1.04,{a:fx.mulA,d:fx.mulD});
  await sleep(2500);await okAll();
  // ── 2. 真右鍵門口進長書閣 ──
  const enter=async()=>{for(let tr=0;tr<3;tr++){
    const d=await ev(p,`(function(){const b=bById(${fx.bid});const D=doorPt(b);const q=P(D.x,D.y,0);cam.follow=false;cam.x=q.x+200/cam.zoom;cam.y=q.y;selUnits=[player().id];selBuilding=null;
      const q2=P(D.x,D.y-0.3,0);return {sx:(q2.x-cam.x)*cam.zoom+W/2,sy:(q2.y-cam.y)*cam.zoom+H/2};})()`);
    await sleep(300);await p.mouse.click(d.sx,d.sy,{button:'right'});
    for(let k=0;k<40;k++){await sleep(300);if(await ev(p,'!!S.interior'))return true;}}return false;};
  const inOk=await enter();await sleep(1500);
  const box=await ev(p,`(function(){const el=document.getElementById('econLibresBox');return el?{txt:el.innerText.slice(0,600),btns:[...el.querySelectorAll('[data-libres="station"]')].map(x=>+x.dataset.u)}:null;})()`);
  rec('2 右鍵門口進長書閣，室內面板出現「駐閣研究」區塊',inOk&&!!box&&/駐閣研究/.test(box.txt),{inOk,txt:box&&box.txt.slice(0,200)});
  rec('2b 帶傷弟子不在可駐閣名單；高悟性與一般弟子在',!!box&&box.btns.indexOf(fx.c)<0&&box.btns.indexOf(fx.a)>=0&&box.btns.indexOf(fx.d)>=0,{btns:box&&box.btns});
  await snap('2_panel_before_station');
  // ── 3. 真點「駐閣」──
  const bb=await p.locator(`#econLibresBox [data-libres="station"][data-u="${fx.a}"]`).boundingBox();
  if(bb)await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await sleep(800);
  let s=await st();
  rec('3 點「駐閣」：駐閣甲駐守（job=study）',s.uid===fx.a&&s.uJob==='study',{uid:s.uid,job:s.uJob});
  for(let k=0;k<40&&!(s.research&&s.research.lr===fx.a);k++){await sleep(500);s=await st();}
  rec('3b 弟子走進閣內後自動開始研究（自動模式先研丹方）',!!(s.research&&s.research.lr===fx.a)&&s.uIn,{research:s.research,uIn:s.uIn,t:s.t});
  await snap('3_stationed_researching');
  // 速度量測：2 秒遊戲時間的進度
  const sp=await ev(p,`(async function(){const b=bById(${fx.bid});const r=b.research;const t0=S.time,p0=r.t;await new Promise(z=>setTimeout(z,2500));return {dt:S.time-t0,dp:b.research===r?r.t-p0:null,lv:blv(b)};})()`);
  const ratio=sp.dp/sp.dt;
  rec('3c 速度＝玩家速度（Lv3＝1.5）× 倍率 1.32 ≈ 1.98/秒',sp.dp!=null&&Math.abs(ratio-1.98)<0.1,{ratio:+ratio.toFixed(3),sp});
  // ── 4. 等第 5 次完成 → 庫房付一次酬勞 ──
  s=await waitN(4,200);const fee4=s.fees,w4=s.wallet;
  rec('4a 第 1–4 次免費（fees=0）',s.n===4&&s.fees===0,{n:s.n,fees:s.fees,fl:s.fl});
  s=await waitN(5,60);
  const lastFee=s.fl.filter(r=>r[0]==='grant');
  rec('4b 第 5 次完成：庫房付駐閣甲一次酬勞（= 目前單次研究成本）',s.n>=5&&s.fees===1&&s.fl.length===2&&s.fl[0][1]==null&&s.fl[1][1]===fx.a&&s.fl[0][2]===s.fl[1][2]&&(s.fl[0][2]===48||s.fl[0][2]===63),{n:s.n,fees:s.fees,feeXia:s.feeXia,fl:s.fl,walletDelta:s.wallet-w4});
  await snap('4_fee_at_5');
  // ── 5. 第 9 次後抽乾庫房 → 第 10 次付不起 → 暫停 ──
  s=await waitN(9,260);
  const drain=await ev(p,`(function(){const have=econLibresVaultXia();if(have>10)econCharge('vault',{xia:have-10},'test-drain');return econLibresVaultXia();})()`);
  rec('5a fixture：第 9 次後庫房抽到 10',s.n===9&&drain===10,{n:s.n,vault:drain});
  s=await waitN(10,60);await sleep(1500);s=await st();
  const t10=await ev(p,`__toasts.filter(x=>/庫房不足，研究暫停/.test(x[1]))`);
  rec('5b 第 10 次完成：庫房不足 → 研究暫停＋提示「庫房不足，研究暫停」，庫房未變負數',s.n===10&&s.fees===1&&s.paused==='vault'&&s.owe>0&&s.vault>=0&&s.vault===10&&t10.length>=1&&!s.research,{n:s.n,fees:s.fees,owe:s.owe,paused:s.paused,vault:s.vault,toast:t10.slice(-1)});
  await snap('5_vault_short_paused');
  await sleep(6000);const s5=await st();
  rec('5c 暫停中不再開新研究（6 秒）、庫房仍 ≥0',s5.n===10&&!s5.research&&s5.vault>=0,{n:s5.n,research:s5.research,vault:s5.vault});
  // ── 6. 玩家親自研究仍可用：室內右鍵走到「研讀案」→ 按 F → 點「研究武學秘籍」──
  const lws=await ev(p,`xwWsOf(bById(${fx.bid}))`);const lec={ws:lws};
  let atLec=false;
  for(const pt of [[1.7,3.7],[3.3,3.7],[2.5,4.1],[1.6,3.0]]){
    await ev(p,`(function(){selUnits=[player().id];selOther=null;panelKeyCache=null;return 1;})()`);
    const q=await ev(p,`(function(){const q=P(${pt[0]},${pt[1]},0);return {sx:IT.ox+q.x*IT.s,sy:IT.oy+q.y*IT.s};})()`);
    await p.mouse.click(q.sx,q.sy,{button:'right'});
    for(let k=0;k<16;k++){await sleep(250);atLec=await ev(p,`(function(){const I=S.interior;const e=document.getElementById('xwUseHint');return !!(I&&Math.hypot(I.x-${lws.x},I.y-${lws.y})<=${lws.r}&&e&&e.style.display==='block');})()`);if(atLec)break;}
    if(atLec){lec.pt=pt;break;}
  }
  const wsOpen=()=>ev(p,`!!(document.getElementById('xwWsPanel')&&!document.getElementById('xwWsPanel').hidden)`);
  if(!(await wsOpen())){await p.keyboard.press('KeyF');await sleep(700);}
  const m0=(await st()).miji;
  const wsBtns=await ev(p,`[...document.querySelectorAll('#xwWsPanel [data-use]')].map(b=>b.getAttribute('data-use')+':'+b.textContent)`);
  const rbb=await p.locator('#xwWsPanel [data-use="research"]').first().boundingBox().catch(()=>null);
  if(rbb)await p.mouse.click(rbb.x+rbb.width/2,rbb.y+rbb.height/2);await sleep(800);
  let s6=await st();
  rec('6a 玩家走到研讀案按 F、點「研究武學秘籍」：開始一般研究（非駐閣）',!!rbb&&!!s6.research&&s6.research.lr==null&&s6.research.k==='miji',{lectern:lec,atLec,wsBtns,research:s6.research});
  await snap('6_player_research');
  const t6=Date.now();while(Date.now()-t6<120000){s6=await st();if(!s6.research)break;await sleep(1000);}
  // 遊玩時間偶發 < 1×，T=45 的研究在 45 秒牆鐘內可能還沒跑完，故等到 120 秒
  rec('6b 玩家研究完成：秘籍 +1、駐閣計數不變',!s6.research&&s6.miji===m0+1&&s6.n===10,{miji:[m0,s6.miji],n:s6.n});
  // ── 7. 補庫房 → 補付酬勞、繼續研究 ──
  await ev(p,`econGrant('vault',500,'test-refill','xia')`);
  let s7=await st();for(let k=0;k<20&&!(s7.research&&s7.research.lr===fx.a);k++){await sleep(500);s7=await st();}
  rec('7 補庫房後：補付第 10 次酬勞（fees=2）、駐閣研究繼續',s7.fees===2&&s7.owe===0&&s7.paused==null&&!!(s7.research&&s7.research.lr===fx.a),{fees:s7.fees,owe:s7.owe,feeXia:s7.feeXia,research:s7.research,fl:s7.fl});
  // ── 8. F5 存 → 重新載入頁面 → F9 讀 ──
  // 註：在室內存檔再讀會失敗（上游 g9 restoreInterior：enterInterior 後 S.interior 仍為 null →「讀檔失敗：Cannot set properties of null (setting 'x')」，
  //     libres 關也一樣，已另報）。所以先真點「離開」出閣再存。
  {const xb=await p.locator('#inpanel [data-in="exit"]').first().boundingBox().catch(()=>null);if(xb)await p.mouse.click(xb.x+xb.width/2,xb.y+xb.height/2);await sleep(1200);}
  rec('8- 真點「離開」出閣（存檔前）',!(await ev(p,'!!S.interior')),null);
  await sleep(2000);const pre=await st();
  await p.keyboard.press('F5');await sleep(1500);
  const has=await ev(p,`(async function(){slotCache=null;const a=await listSlots();return !!(a.quick&&!a.quick.bad);})()`);
  rec('8a F5 快速存檔寫入',has===true,has);
  await boot('?dev=1');await p.keyboard.press('F9');await sleep(700);
  try{await p.getByText('讀取',{exact:true}).last().click();}catch(e){}
  await sleep(2500);await okAll();await ev(p,hookToasts);
  const post=await st();
  rec('8b 重載後：駐閣弟子 id、完成次數、已付次數、研究項目都還在',post.uid===fx.a&&post.n===pre.n&&post.fees===pre.fees&&post.feeXia===pre.feeXia&&!!(post.research&&post.research.lr===fx.a)&&post.uJob==='study',{pre:{uid:pre.uid,n:pre.n,fees:pre.fees,r:pre.research},post:{uid:post.uid,n:post.n,fees:post.fees,r:post.research,job:post.uJob,last:post.last}});
  const s8=await waitN(post.n+1,90);
  rec('8c 重載後繼續研究並完成下一次',s8.n===post.n+1,{n:[post.n,s8.n]});
  await snap('8_after_reload');
  // ── 9. 駐閣弟子帶傷 → 自動撤駐 ──
  await ev(p,`(function(){const u=unitById(${fx.a});u.inj={k:'leg',t:999};return 1;})()`);await sleep(1500);
  const s9=await st();const t9=await ev(p,`__toasts.filter(x=>/撤離長書閣/.test(x[1]))`);
  rec('9 駐閣弟子帶傷：自動撤駐並提示；研究改回一般研究',s9.uid==null&&t9.length>=1&&(!s9.research||s9.research.lr==null),{uid:s9.uid,toast:t9,research:s9.research});
  rec('console errors 0',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/result.json',JSON.stringify({rows,errs,toasts:await ev(p,'__toasts').catch(()=>null)},null,1));
  const f=rows.filter(r=>!r.ok).length;console.log('TOTAL',rows.length,'FAIL',f);await br.close();process.exit(f?1:0);
})();
