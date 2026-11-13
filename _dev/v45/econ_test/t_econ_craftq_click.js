// 鍛造房佇列面板「點一下沒反應」：真實 headless Chrome、真 UI 開面板、遊戲迴圈真計時重畫（frameV045 每 0.3 秒 renderCraft）
// ＋資源持續變動（模擬採集入帳，讓 g14 整個 #craft 重建）＋在 mousedown 與 mouseup 之間強制整面板重建。
// 每種按鈕單擊一次（page.mouse.down/up）必須剛好生效一次；捲動位置、輸入中的數量、焦點要保留。
const pw=require('/workspace/xianwu_demo/node_modules/playwright-core');
const fs=require('fs');
const OUT=process.env.ECON_TEST_OUT||'/workspace/xianwu_work_20261110/debug_working/bug_shots/econ_craftq_click_20261111';
const TAG=process.env.TAG||'fix';
const SH=OUT+'/shots',LOG=OUT+'/logs';fs.mkdirSync(SH,{recursive:true});fs.mkdirSync(LOG,{recursive:true});
const URL=process.env.XW_URL||'http://127.0.0.1:8991/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];const rec=(n,ok,d)=>{rows.push({n,ok:!!ok,d});console.log((ok?'PASS ':'FAIL ')+n+' '+JSON.stringify(d===undefined?'':d).slice(0,600));};
const ev=(p,c)=>p.evaluate(s=>{try{return __ev(s);}catch(e){return {EXC:String(e&&e.stack||e).slice(0,600)};}},c);
(async()=>{
  const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const ctx=await br.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',locale:'zh-TW'});
  const errs=[];const p=await ctx.newPage();p.setDefaultTimeout(8000);
  p.on('pageerror',e=>errs.push('pageerror: '+String(e.message||e).slice(0,300)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300));});
  const snap=n=>p.screenshot({path:SH+'/'+TAG+'_'+n+'.png'});
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.XW&&XW.newGame&&typeof window.__ev==='function',null,{timeout:40000});await sleep(1200);
  await p.click('#t_new');await sleep(1200);
  try{await p.getByRole('button',{name:'確定'}).first().click({timeout:3000});await sleep(500);}catch(e){}
  for(let i=0;i<5;i++){try{await p.getByText('知道了').first().click({timeout:500});await sleep(150);}catch(e){break;}}
  const fx=await ev(p,`(function(){
    try{if(XW.tutEnd)XW.tutEnd(true);}catch(e){}
    window.__ecl=setInterval(function(){try{S.enemies.length=0;}catch(e){}},300);
    Object.assign(S.res,{wood:5000,iron:5000,fiber:2000,stone:2000,herb:500,lingshi:500});
    XW.tjt.place('forge');
    const b=S.buildings.find(x=>x.type==='forge'&&x.built);
    // 模擬採集入帳：資源每 0.1 秒變動 → g14 renderCraft 的 key 一直變 → 整個 #craft 重建
    window.__churn=setInterval(function(){try{S.res.wood+=1;}catch(e){}},100);
    return {bid:b&&b.id,cq:econCraftQOn(),paused:typeof paused!=='undefined'?paused:null};
  })()`);
  await sleep(600);
  try{await p.getByRole('button',{name:'稍後再做'}).first().click({timeout:1500});}catch(e){}
  rec('0 fixture：有鍛造坊、共用佇列旗標開',!!fx.bid&&fx.cq,fx);
  // 真 UI：滑鼠點鍛造坊 → 面板「⚒ 鍛造台」
  const cm=await ev(p,`(function(){const b=bById(${fx.bid});const s=BUILD[b.type].size;const q=iso(b.i+s/2,b.j+s/2);cam.follow=false;cam.x=q.x;cam.y=q.y;selUnits.length=0;const r=cv.getBoundingClientRect();return {x:r.left+W/2,y:r.top+H/2};})()`);
  await sleep(400);
  let hit=null;const offs=[];for(let dy=-40;dy<=30;dy+=10)for(let dx=-30;dx<=30;dx+=10)offs.push([dx,dy]);
  offs.sort((a,b)=>Math.hypot(a[0],a[1])-Math.hypot(b[0],b[1]));
  for(const [dx,dy] of offs){await p.mouse.click(cm.x+dx,cm.y+dy);await sleep(150);hit=await ev(p,`typeof selBuilding!=='undefined'?selBuilding:null`);if(hit===fx.bid)break;}
  rec('1 滑鼠點鍛造坊開建築面板',hit===fx.bid,{hit});
  await p.getByRole('button',{name:/進入鍛造坊/}).first().click();await sleep(2000);
  for(let i=0;i<3;i++){try{await p.getByText('知道了').first().click({timeout:400});}catch(e){break;}}
  await snap('00_interior');
  // 室內：站到鍛造台旁（只移位置），用真實按鍵 F 互動開鍛造台
  const wsi=await ev(p,`(function(){const I=S.interior;const b=bById(I.bid);const ws=xwWsOf(b);I.x=ws.x;I.y=ws.y+0.4;I.tx=null;return {ws:ws&&ws.label,near:xwWsNear(b,ws)};})()`);
  await sleep(300);await p.mouse.move(640,700);await p.keyboard.press('KeyF');await sleep(900);
  console.log('WS',JSON.stringify(wsi));
  const op=await ev(p,`({open:craftOpen,ui:!!document.querySelector('#craft #econ-gear-ui [data-eg-add]')})`);
  rec('2 點「⚒ 鍛造台」開出批量佇列面板',op.open&&op.ui,op);
  await snap('01_open');
  // 重畫計數：#craft 內節點被替換次數
  await ev(p,`(function(){window.__mut=0;const mo=new MutationObserver(ms=>{for(const m of ms)if(m.type==='childList'&&m.removedNodes.length)__mut++;});mo.observe(document.getElementById('craft'),{childList:true,subtree:true});window.__rc=0;const _r=renderCraft;renderCraft=function(){__rc++;return _r.apply(this,arguments);};return 1;})()`);
  await sleep(1500);
  const rr=await ev(p,`({rc:__rc,mut:__mut})`);
  rec('3 重畫持續發生（1.5 秒內 renderCraft 被呼叫 ≥3 次）',rr.rc>=3,rr);
  const FORCE=`(function(){try{craftKey=null;const e=document.getElementById('v49cf');if(e)e._k=null;const g=document.getElementById('econ-gear-ui');if(g)g._egSig=null;}catch(e){}renderCraft();return __rc;})()`;
  // 單擊：mousedown →（中間強制整面板重建＋資源變動）→ mouseup
  async function click1(sel,label){
    const loc=p.locator(sel).first();
    await loc.scrollIntoViewIfNeeded().catch(()=>{});
    const bb=await loc.boundingBox();
    if(!bb)return {err:'no box '+sel};
    const x=bb.x+bb.width/2,y=bb.y+bb.height/2;
    await p.mouse.move(x,y);await p.mouse.down();
    await sleep(60);await ev(p,`S.res.wood+=3`);await ev(p,FORCE);await sleep(140);await ev(p,FORCE);
    await p.mouse.up();await sleep(250);
    return {x,y};
  }
  const Q=`(function(){const b=bById(${fx.bid});return {q:(b.econForgeQ||[]).map(x=>({id:x.id,k:x.k,n:x.n})),craft:b.craft?{k:b.craft.k,n:b.craft.n||1}:null,pick:(document.querySelector('#econ-gear-ui [data-eg-qn].on')||{}).textContent||null};})()`;
  // 4 數量 ×3
  await click1('#econ-gear-ui [data-eg-qn="3"]');
  let s=await ev(p,Q);rec('4 單擊「×3」一次就切到 ×3',s.pick==='×3',s);
  // 5 ＋ 品名×3（只加一次）
  const firstAdd=await ev(p,`(function(){const b=[...document.querySelectorAll('#econ-gear-ui [data-eg-add]')].find(x=>!x.classList.contains('dis'));return b&&b.getAttribute('data-eg-add');})()`);
  await click1('#econ-gear-ui [data-eg-add="'+firstAdd+'"]');
  s=await ev(p,Q);rec('5 單擊「＋ 品名×3」一次：佇列剛好 1 筆、數量 3（不重複）',s.q.length===1&&s.q[0].k===firstAdd&&s.q[0].n===3,{firstAdd,s});
  await snap('02_after_add');
  // 6 ×1，再加多種品項（撐出捲軸），每次單擊各一次
  await click1('#econ-gear-ui [data-eg-qn="1"]');
  s=await ev(p,Q);rec('6 單擊「×1」一次就切到 ×1',s.pick==='×1',s);
  const keys=await ev(p,`[...document.querySelectorAll('#econ-gear-ui [data-eg-add]')].filter(x=>!/🔒/.test(x.textContent)).map(x=>x.getAttribute('data-eg-add'))`);
  let addOk=0,addN=0;
  for(const k of keys.filter(k=>k!==firstAdd).slice(0,10)){
    const before=(await ev(p,Q)).q.length;await click1('#econ-gear-ui [data-eg-add="'+k+'"]');const after=(await ev(p,Q)).q;addN++;
    if(after.length===before+1&&after[after.length-1].k===k&&after[after.length-1].n===1)addOk++;
  }
  rec('7 再單擊 '+addN+' 種「＋ 品名×1」：每次剛好多 1 筆',addN>0&&addOk===addN,{addOk,addN,q:(await ev(p,Q)).q.length});
  // 8 捲動：#econ-gear-ui 捲到底附近，持續重畫 2 秒 + 強制重建，不得跳回頂端
  const sc0=await ev(p,`(function(){const g=document.getElementById('econ-gear-ui');const c=document.getElementById('craft');g.scrollTop=Math.max(0,g.scrollHeight-g.clientHeight-10);c.scrollTop=Math.max(0,c.scrollHeight-c.clientHeight-10);return {g:g.scrollTop,gmax:g.scrollHeight-g.clientHeight,c:c.scrollTop,cmax:c.scrollHeight-c.clientHeight};})()`);
  await sleep(1200);await ev(p,FORCE);await ev(p,`S.res.wood+=5`);await sleep(800);
  const sc1=await ev(p,`(function(){const g=document.getElementById('econ-gear-ui');const c=document.getElementById('craft');return {g:g.scrollTop,c:c.scrollTop,rc:__rc};})()`);
  rec('8 捲動位置在連續重畫＋整面板重建後保留（不跳回頂端）',sc0.g>20&&Math.abs(sc1.g-sc0.g)<=2&&Math.abs(sc1.c-sc0.c)<=2,{sc0,sc1});
  await snap('03_scrolled_after_redraw');
  // 9 刪（捲動狀態下單擊最後一筆的刪）
  const lastId=(await ev(p,Q)).q.slice(-1)[0].id;const nq0=(await ev(p,Q)).q.length;
  const gs0=await ev(p,`document.getElementById('econ-gear-ui').scrollTop`);
  await click1('#econ-gear-ui [data-eg-del="'+lastId+'"]');
  s=await ev(p,Q);const gs1=await ev(p,`document.getElementById('econ-gear-ui').scrollTop`);
  rec('9 單擊「刪」一次：剛好少 1 筆且是那一筆，捲動不跳頂',s.q.length===nq0-1&&!s.q.some(x=>x.id===lastId)&&gs1>20,{nq0,n:s.q.length,gs0,gs1});
  // 10 佇列列的數量輸入：點進去、輸入 7，持續重畫中值與焦點保留，Enter/blur 後才生效
  const lid=s.q[0].id;
  await click1('#econ-gear-ui [data-eg-setn="'+lid+'"]');
  await p.keyboard.press('Control+A');await p.keyboard.type('7');
  await sleep(900);await ev(p,FORCE);await sleep(600);
  const f1=await ev(p,`(function(){const a=document.activeElement;return {foc:!!(a&&a.matches&&a.matches('[data-eg-setn="${lid}"]')),val:a&&a.value,conn:a&&a.isConnected};})()`);
  rec('10 佇列數量輸入中（7）：連續重畫後值仍是 7、焦點仍在',f1.foc&&f1.val==='7',f1);
  await p.keyboard.press('Enter');await p.keyboard.press('Tab');await sleep(400);
  s=await ev(p,Q);rec('11 確認後該筆數量變 7',s.q.find(x=>x.id===lid).n===7,s.q[0]);
  // 12 上方數量輸入框：輸入 4，重畫中保留，確認後 ＋ 按鈕變 ×4
  await click1('#econ-gear-ui [data-eg-qn-in]');
  await p.keyboard.press('Control+A');await p.keyboard.type('4');
  await sleep(900);await ev(p,FORCE);await sleep(600);
  const f2=await ev(p,`(function(){const a=document.activeElement;return {foc:!!(a&&a.matches&&a.matches('[data-eg-qn-in]')),val:a&&a.value};})()`);
  rec('12 上方數量輸入中（4）：連續重畫後值與焦點保留',f2.foc&&f2.val==='4',f2);
  await p.keyboard.press('Tab');await sleep(400);
  const add4=await ev(p,`((document.querySelector('#econ-gear-ui [data-eg-add]')||{}).textContent||'')`);
  rec('13 確認後「＋ 品名」按鈕顯示 ×4',/×4/.test(add4),add4);
  await snap('04_inputs');
  // 14 開始佇列（單擊一次：開爐、佇列少 1 筆）
  const nq1=(await ev(p,Q)).q.length;
  await click1('#econ-gear-ui [data-eg-start]');
  s=await ev(p,Q);rec('14 單擊「開始佇列」一次就開爐、佇列剛好少 1 筆',!!s.craft&&s.q.length===nq1-1,{nq1,s});
  await sleep(1500);
  // 15 打造中仍可單擊（進度每秒變）：×5
  await click1('#econ-gear-ui [data-eg-qn="5"]');
  s=await ev(p,Q);rec('15 打造中（進度在跑）單擊「×5」一次生效',s.pick==='×5'&&!!s.craft,s);
  // 16 境界分頁按鈕
  const tab0=await ev(p,`((document.querySelector('#econ-gear-ui [data-eg-tab].on')||{}).getAttribute||(()=>null)).call(document.querySelector('#econ-gear-ui [data-eg-tab].on'),'data-eg-tab')`);
  await click1('#econ-gear-ui [data-eg-tab="1"]');
  const tab1=await ev(p,`(document.querySelector('#econ-gear-ui [data-eg-tab].on')||{getAttribute:()=>null}).getAttribute('data-eg-tab')`);
  await click1('#econ-gear-ui [data-eg-tab="0"]');
  const tab2=await ev(p,`(document.querySelector('#econ-gear-ui [data-eg-tab].on')||{getAttribute:()=>null}).getAttribute('data-eg-tab')`);
  rec('16 單擊境界分頁一次就切換（0→1→0）',tab1==='1'&&tab2==='0',{tab0,tab1,tab2});
  // 17 沒有點擊時，內容沒變就不重建按鈕（簽章比對）
  const m0=await ev(p,`(function(){window.__nb=document.querySelector('#econ-gear-ui [data-eg-qn="1"]');return 1;})()`);
  await ev(p,`clearInterval(__churn)`);await sleep(1200);
  const same=await ev(p,`({same:__nb===document.querySelector('#econ-gear-ui [data-eg-qn="1"]'),conn:__nb.isConnected})`);
  rec('17 內容沒變（資源不動、進度只更新數字）時按鈕節點不被替換',same.same&&same.conn,same);
  await snap('05_final');
  rec('18 console／pageerror 0 筆',errs.length===0,errs.slice(0,10));
  fs.writeFileSync(LOG+'/'+TAG+'_result.json',JSON.stringify({rows,errs},null,1));
  const pass=rows.filter(r=>r.ok).length;console.log('SUMMARY '+pass+'/'+rows.length+' console='+errs.length);
  await br.close();process.exit(pass===rows.length?0:1);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
